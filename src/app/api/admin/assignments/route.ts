import { NextRequest, NextResponse } from "next/server";
import { withAdmin, validateBody, logActivity } from "@/lib/api/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/assignments?patient_id=... — list all assignments for a patient
// GET /api/admin/assignments?caregiver_id=... — list all patients for a caregiver
export async function GET(req: NextRequest) {
  return withAdmin(req, async (req, _user, _role, orgId) => {
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patient_id");
    const caregiverId = url.searchParams.get("caregiver_id");

    const admin = createAdminClient();
    let q = admin
      .from("patient_assignments")
      .select("*, patients!inner(id, full_name, address, risk_level, organization_id), profiles(id, full_name, email, role, phone)")
      .eq("patients.organization_id", orgId);

    if (patientId) q = q.eq("patient_id", patientId);
    if (caregiverId) q = q.eq("profile_id", caregiverId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const assignments = (data || []).map((a: Record<string, unknown>) => {
      const prof = a.profiles as Record<string, unknown> | null;
      const pat = a.patients as Record<string, unknown> | null;
      return {
        id: a.id,
        patient_id: a.patient_id,
        profile_id: a.profile_id,
        relationship: a.relationship,
        is_primary: a.is_primary ?? false,
        notes: a.notes ?? null,
        caregiver_name: (prof?.full_name as string) || "Unknown",
        caregiver_email: (prof?.email as string) || "",
        caregiver_role: (prof?.role as string) || "",
        patient_name: (pat?.full_name as string) || "",
      };
    });

    return NextResponse.json({ assignments });
  });
}

// POST /api/admin/assignments — assign a profile (caregiver/family) to a patient
type AssignBody = {
  patient_id: string;
  profile_id: string;
  relationship?: "caregiver" | "family" | "primary_caregiver" | "emergency_contact";
  notes?: string;
  is_primary?: boolean;
};

export async function POST(req: NextRequest) {
  return withAdmin(req, async (req, user, _role, orgId) => {
    const v = await validateBody<AssignBody>(req, (raw) => {
      if (typeof raw !== "object" || raw === null) return { valid: false, error: "Body required" };
      const b = raw as Record<string, unknown>;
      if (!b.patient_id) return { valid: false, error: "patient_id required" };
      if (!b.profile_id) return { valid: false, error: "profile_id required" };
      return {
        valid: true,
        data: {
          patient_id: b.patient_id as string,
          profile_id: b.profile_id as string,
          relationship: (b.relationship as AssignBody["relationship"]) || "caregiver",
          notes: typeof b.notes === "string" ? b.notes : undefined,
          is_primary: b.is_primary === true,
        },
      };
    });
    if (!v.ok) return v.response;

    const admin = createAdminClient();

    // Verify both belong to this org
    const [pRes, profRes] = await Promise.all([
      admin.from("patients").select("organization_id, full_name").eq("id", v.data.patient_id).single(),
      admin.from("profiles").select("org_id, role, full_name").eq("id", v.data.profile_id).single(),
    ]);

    if (!pRes.data || pRes.data.organization_id !== orgId) {
      return NextResponse.json({ error: "Patient not found in this org" }, { status: 404 });
    }
    if (!profRes.data || profRes.data.org_id !== orgId) {
      return NextResponse.json({ error: "Profile not found in this org" }, { status: 404 });
    }

    // Upsert assignment
    const { data: assignment, error } = await admin
      .from("patient_assignments")
      .upsert(
        {
          patient_id: v.data.patient_id,
          profile_id: v.data.profile_id,
          relationship: v.data.relationship,
          notes: v.data.notes || null,
          assigned_by: user.id,
          is_primary: v.data.is_primary,
        },
        { onConflict: "patient_id,profile_id" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      orgId, userId: user.id,
      action: "assignment.create",
      entity: "patient_assignments", entityId: assignment.id,
      metadata: {
        patient_name: pRes.data.full_name,
        profile_name: profRes.data.full_name,
        relationship: v.data.relationship,
      },
    });

    return NextResponse.json({ assignment, message: "Assigned successfully" });
  });
}

// DELETE /api/admin/assignments?patient_id=...&profile_id=... — unassign
export async function DELETE(req: NextRequest) {
  return withAdmin(req, async (req, user, _role, orgId) => {
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patient_id");
    const profileId = url.searchParams.get("profile_id");

    if (!patientId || !profileId) {
      return NextResponse.json({ error: "patient_id and profile_id required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify org
    const { data: pat } = await admin.from("patients").select("organization_id").eq("id", patientId).single();
    if (!pat || pat.organization_id !== orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await admin
      .from("patient_assignments")
      .delete()
      .eq("patient_id", patientId)
      .eq("profile_id", profileId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      orgId, userId: user.id,
      action: "assignment.delete",
      entity: "patient_assignments",
      metadata: { patient_id: patientId, profile_id: profileId },
    });

    return NextResponse.json({ message: "Unassigned" });
  });
}
