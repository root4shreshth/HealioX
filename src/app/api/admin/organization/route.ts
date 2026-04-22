import { NextRequest, NextResponse } from "next/server";
import { withAdmin, validateBody, logActivity } from "@/lib/api/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/organization — fetch this admin's org settings
export async function GET(req: NextRequest) {
  return withAdmin(req, async (_req, _user, _role, orgId) => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Count members
    const [{ count: memberCount }, { count: patientCount }, { count: caregiverCount }] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("org_id", orgId),
      admin.from("patients").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", true),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("org_id", orgId).eq("role", "caregiver"),
    ]);

    return NextResponse.json({
      organization: data,
      stats: {
        total_members: memberCount || 0,
        total_patients: patientCount || 0,
        total_caregivers: caregiverCount || 0,
      },
    });
  });
}

// PATCH /api/admin/organization — update org settings
export async function PATCH(req: NextRequest) {
  return withAdmin(req, async (req, user, _role, orgId) => {
    const v = await validateBody<Record<string, unknown>>(req, (raw) => {
      if (typeof raw !== "object" || raw === null) return { valid: false, error: "Body required" };
      return { valid: true, data: raw as Record<string, unknown> };
    });
    if (!v.ok) return v.response;

    const allowed: Record<string, unknown> = {};
    const fields = ["name", "type", "address", "phone", "email", "website", "plan", "metadata"];
    for (const f of fields) {
      if (v.data[f] !== undefined) allowed[f] = v.data[f];
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("organizations").update(allowed).eq("id", orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      orgId, userId: user.id,
      action: "organization.update",
      entity: "organizations", entityId: orgId,
      metadata: allowed,
    });

    return NextResponse.json({ message: "Organization updated" });
  });
}
