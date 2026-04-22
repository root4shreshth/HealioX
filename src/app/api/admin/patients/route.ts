import { NextRequest, NextResponse } from "next/server";
import { withAdmin, validateBody, logActivity } from "@/lib/api/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/patients — list all patients in this org
export async function GET(req: NextRequest) {
  return withAdmin(req, async (_req, _user, _role, orgId) => {
    const admin = createAdminClient();

    const { data: patients, error } = await admin
      .from("patients")
      .select("*")
      .eq("organization_id", orgId)
      .order("risk_score", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ patients: patients || [] });
  });
}

// POST /api/admin/patients — onboard a new patient
type CreatePatientBody = {
  full_name: string;
  date_of_birth: string;
  gender?: string;
  address: string;
  phone?: string;
  primary_conditions?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  national_health_id?: string;
  risk_level?: "low" | "moderate" | "high" | "emergency";
  assigned_caregiver_id?: string;
  assigned_family_id?: string;
};

export async function POST(req: NextRequest) {
  return withAdmin(req, async (req, user, _role, orgId) => {
    const v = await validateBody<CreatePatientBody>(req, (raw) => {
      if (typeof raw !== "object" || raw === null) return { valid: false, error: "Body must be an object" };
      const b = raw as Record<string, unknown>;
      if (!b.full_name || typeof b.full_name !== "string") return { valid: false, error: "Full name required" };
      if (!b.date_of_birth || typeof b.date_of_birth !== "string") return { valid: false, error: "Date of birth required" };
      if (!b.address || typeof b.address !== "string") return { valid: false, error: "Address required" };
      return {
        valid: true,
        data: {
          full_name: (b.full_name as string).trim(),
          date_of_birth: b.date_of_birth as string,
          address: (b.address as string).trim(),
          gender: typeof b.gender === "string" ? b.gender : undefined,
          phone: typeof b.phone === "string" ? b.phone : undefined,
          primary_conditions: Array.isArray(b.primary_conditions) ? (b.primary_conditions as string[]) : [],
          emergency_contact_name: typeof b.emergency_contact_name === "string" ? b.emergency_contact_name : undefined,
          emergency_contact_phone: typeof b.emergency_contact_phone === "string" ? b.emergency_contact_phone : undefined,
          national_health_id: typeof b.national_health_id === "string" ? b.national_health_id : undefined,
          risk_level: (b.risk_level as CreatePatientBody["risk_level"]) || "low",
          assigned_caregiver_id: typeof b.assigned_caregiver_id === "string" ? b.assigned_caregiver_id : undefined,
          assigned_family_id: typeof b.assigned_family_id === "string" ? b.assigned_family_id : undefined,
        },
      };
    });
    if (!v.ok) return v.response;
    const b = v.data;

    const admin = createAdminClient();

    const riskScoreMap = { low: 85, moderate: 60, high: 35, emergency: 15 };
    const { data: patient, error } = await admin
      .from("patients")
      .insert({
        full_name: b.full_name,
        date_of_birth: b.date_of_birth,
        address: b.address,
        phone: b.phone || null,
        gender: b.gender || null,
        primary_conditions: b.primary_conditions,
        risk_level: b.risk_level,
        risk_score: riskScoreMap[b.risk_level || "low"],
        emergency_contact_name: b.emergency_contact_name || null,
        emergency_contact_phone: b.emergency_contact_phone || null,
        national_health_id: b.national_health_id || null,
        organization_id: orgId,
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Assign family member if provided
    if (b.assigned_family_id) {
      await admin.from("patient_assignments").insert({
        patient_id: patient.id,
        profile_id: b.assigned_family_id,
        relationship: "family",
      });
    }

    // Create one initial scheduled visit for tomorrow at 10am with the assigned caregiver
    if (b.assigned_caregiver_id) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const end = new Date(tomorrow);
      end.setHours(11, 0, 0, 0);

      await admin.from("visits").insert({
        patient_id: patient.id,
        caregiver_id: b.assigned_caregiver_id,
        scheduled_start: tomorrow.toISOString(),
        scheduled_end: end.toISOString(),
        status: "scheduled",
        gps_verified: false,
        services: [],
      });
    }

    await logActivity({
      orgId, userId: user.id,
      action: "patient.create",
      entity: "patients", entityId: patient.id,
      metadata: { full_name: b.full_name },
    });

    return NextResponse.json({ patient, message: "Patient onboarded successfully" });
  });
}
