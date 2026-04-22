import { NextRequest, NextResponse } from "next/server";
import { withAdmin, validateBody, logActivity } from "@/lib/api/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/visits?from=2026-04-23&to=2026-04-30
export async function GET(req: NextRequest) {
  return withAdmin(req, async (req, _user, _role, orgId) => {
    const url = new URL(req.url);
    const from = url.searchParams.get("from") || new Date().toISOString().split("T")[0];
    const to = url.searchParams.get("to") || from;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("visits")
      .select("*, patients!inner(full_name, address, organization_id), caregiver:profiles!visits_caregiver_id_fkey(full_name, email)")
      .eq("patients.organization_id", orgId)
      .gte("scheduled_start", `${from}T00:00:00`)
      .lte("scheduled_start", `${to}T23:59:59`)
      .order("scheduled_start");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      visits: (data || []).map((v) => {
        const patients = v.patients as Record<string, unknown> | null;
        const caregiver = v.caregiver as Record<string, unknown> | null;
        return {
          id: v.id,
          patient_id: v.patient_id,
          patient_name: (patients?.full_name as string) || "Unknown",
          patient_address: (patients?.address as string) || "",
          caregiver_id: v.caregiver_id,
          caregiver_name: (caregiver?.full_name as string) || "Unassigned",
          scheduled_start: v.scheduled_start,
          scheduled_end: v.scheduled_end,
          status: v.status,
          check_in_time: v.check_in_time,
          check_out_time: v.check_out_time,
          gps_verified: v.gps_verified,
          duration_minutes: v.duration_minutes,
          services: v.services || [],
        };
      }),
    });
  });
}

// POST /api/admin/visits — schedule a new visit (single or recurring)
type CreateVisitBody = {
  patient_id: string;
  caregiver_id: string;
  scheduled_start: string; // ISO
  scheduled_end: string;   // ISO
  services?: string[];
  recurring?: {
    frequency: "daily" | "weekly"; // repeat every day or every week
    occurrences: number;           // how many total visits to create (max 30)
  };
};

export async function POST(req: NextRequest) {
  return withAdmin(req, async (req, user, _role, orgId) => {
    const v = await validateBody<CreateVisitBody>(req, (raw) => {
      if (typeof raw !== "object" || raw === null) return { valid: false, error: "Body required" };
      const b = raw as Record<string, unknown>;
      if (!b.patient_id || typeof b.patient_id !== "string") return { valid: false, error: "patient_id required" };
      if (!b.caregiver_id || typeof b.caregiver_id !== "string") return { valid: false, error: "caregiver_id required" };
      if (!b.scheduled_start || !b.scheduled_end) return { valid: false, error: "Start and end times required" };
      const rec = b.recurring as Record<string, unknown> | undefined;
      return {
        valid: true,
        data: {
          patient_id: b.patient_id as string,
          caregiver_id: b.caregiver_id as string,
          scheduled_start: b.scheduled_start as string,
          scheduled_end: b.scheduled_end as string,
          services: Array.isArray(b.services) ? (b.services as string[]) : [],
          recurring: rec ? {
            frequency: (rec.frequency as "daily" | "weekly") || "daily",
            occurrences: Math.min(30, Math.max(1, Number(rec.occurrences) || 1)),
          } : undefined,
        },
      };
    });
    if (!v.ok) return v.response;
    const b = v.data;

    const admin = createAdminClient();

    // Verify patient and caregiver belong to this org
    const [patientRes, caregiverRes] = await Promise.all([
      admin.from("patients").select("organization_id").eq("id", b.patient_id).single(),
      admin.from("profiles").select("org_id, role, is_active").eq("id", b.caregiver_id).single(),
    ]);

    if (!patientRes.data || patientRes.data.organization_id !== orgId) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    if (!caregiverRes.data || caregiverRes.data.org_id !== orgId || caregiverRes.data.role !== "caregiver") {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }
    if (!caregiverRes.data.is_active) {
      return NextResponse.json({ error: "Caregiver is deactivated" }, { status: 400 });
    }

    // Build list of visits
    const start = new Date(b.scheduled_start);
    const end = new Date(b.scheduled_end);
    const occurrences = b.recurring?.occurrences || 1;
    const stepDays = b.recurring?.frequency === "weekly" ? 7 : 1;

    const visits = Array.from({ length: occurrences }, (_, i) => {
      const s = new Date(start);
      const e = new Date(end);
      s.setDate(start.getDate() + i * stepDays);
      e.setDate(end.getDate() + i * stepDays);
      return {
        patient_id: b.patient_id,
        caregiver_id: b.caregiver_id,
        scheduled_start: s.toISOString(),
        scheduled_end: e.toISOString(),
        status: "scheduled",
        gps_verified: false,
        services: b.services,
      };
    });

    const { data: created, error } = await admin.from("visits").insert(visits).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      orgId, userId: user.id,
      action: "visit.create",
      entity: "visits",
      metadata: { count: visits.length, patient_id: b.patient_id, caregiver_id: b.caregiver_id },
    });

    return NextResponse.json({ visits: created, count: visits.length });
  });
}
