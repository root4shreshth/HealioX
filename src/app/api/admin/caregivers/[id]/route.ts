import { NextRequest, NextResponse } from "next/server";
import { withAdmin, validateBody, logActivity } from "@/lib/api/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/admin/caregivers/[id] — update a caregiver
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, async (req, user, _role, orgId) => {
    const v = await validateBody<Record<string, unknown>>(req, (raw) => {
      if (typeof raw !== "object" || raw === null) return { valid: false, error: "Body must be an object" };
      return { valid: true, data: raw as Record<string, unknown> };
    });
    if (!v.ok) return v.response;

    // Only allow whitelisted fields
    const allowed: Record<string, unknown> = {};
    if (typeof v.data.full_name === "string") allowed.full_name = v.data.full_name;
    if (typeof v.data.phone === "string") allowed.phone = v.data.phone;
    if (typeof v.data.is_active === "boolean") allowed.is_active = v.data.is_active;

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify caregiver belongs to this org
    const { data: existing } = await admin
      .from("profiles")
      .select("org_id, role")
      .eq("id", id)
      .single();

    if (!existing || existing.org_id !== orgId || existing.role !== "caregiver") {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    const { error } = await admin.from("profiles").update(allowed).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      orgId, userId: user.id,
      action: "caregiver.update",
      entity: "profiles", entityId: id,
      metadata: allowed,
    });

    return NextResponse.json({ message: "Caregiver updated" });
  });
}

// DELETE /api/admin/caregivers/[id] — deactivate (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withAdmin(req, async (_req, user, _role, orgId) => {
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("profiles")
      .select("org_id, role, email")
      .eq("id", id)
      .single();

    if (!existing || existing.org_id !== orgId || existing.role !== "caregiver") {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    // Soft delete: mark inactive. Keeps visit history intact.
    const { error } = await admin.from("profiles").update({ is_active: false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Prevent login by revoking sessions
    try {
      await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" }); // ~100 years
    } catch {
      // Ignore — soft delete on profile is enough
    }

    await logActivity({
      orgId, userId: user.id,
      action: "caregiver.deactivate",
      entity: "profiles", entityId: id,
      metadata: { email: existing.email },
    });

    return NextResponse.json({ message: "Caregiver deactivated" });
  });
}
