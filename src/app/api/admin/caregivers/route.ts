import { NextRequest, NextResponse } from "next/server";
import { withAdmin, validateBody, logActivity } from "@/lib/api/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET /api/admin/caregivers — list all caregivers in this org ─────────────
export async function GET(req: NextRequest) {
  return withAdmin(req, async (_req, _user, _role, orgId) => {
    const admin = createAdminClient();

    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, email, full_name, role, org_id, phone, is_active, created_at, updated_at")
      .eq("role", "caregiver")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Join: get visit stats per caregiver (today)
    const today = new Date().toISOString().split("T")[0];
    const { data: visits } = await admin
      .from("visits")
      .select("caregiver_id, status, check_in_time, scheduled_start, duration_minutes")
      .gte("scheduled_start", `${today}T00:00:00`)
      .lte("scheduled_start", `${today}T23:59:59`);

    const visitsByCg: Record<string, { assigned: number; completed: number; late: number; avgMin: number }> = {};
    (visits || []).forEach((v) => {
      const cid = v.caregiver_id as string;
      if (!cid) return;
      if (!visitsByCg[cid]) visitsByCg[cid] = { assigned: 0, completed: 0, late: 0, avgMin: 0 };
      visitsByCg[cid].assigned++;
      if (v.status === "completed") visitsByCg[cid].completed++;

      const scheduled = new Date(v.scheduled_start).getTime();
      const checkedIn = v.check_in_time ? new Date(v.check_in_time).getTime() : null;
      if (checkedIn && checkedIn - scheduled > 15 * 60 * 1000) visitsByCg[cid].late++;
      if (v.duration_minutes) {
        const d = v.duration_minutes as number;
        visitsByCg[cid].avgMin = Math.round((visitsByCg[cid].avgMin + d) / 2);
      }
    });

    const caregivers = (profiles || []).map((p) => ({
      ...p,
      stats_today: visitsByCg[p.id] || { assigned: 0, completed: 0, late: 0, avgMin: 0 },
    }));

    return NextResponse.json({ caregivers });
  });
}

// ── POST /api/admin/caregivers — create a new caregiver account ─────────────
type CreateCaregiverBody = {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
};

export async function POST(req: NextRequest) {
  return withAdmin(req, async (req, user, _role, orgId) => {
    const v = await validateBody<CreateCaregiverBody>(req, (raw) => {
      if (typeof raw !== "object" || raw === null) return { valid: false, error: "Body must be an object" };
      const b = raw as Record<string, unknown>;
      if (!b.email || typeof b.email !== "string") return { valid: false, error: "Email is required" };
      if (!b.password || typeof b.password !== "string" || (b.password as string).length < 6) return { valid: false, error: "Password must be at least 6 characters" };
      if (!b.full_name || typeof b.full_name !== "string") return { valid: false, error: "Full name is required" };
      return {
        valid: true,
        data: {
          email: (b.email as string).trim().toLowerCase(),
          password: b.password as string,
          full_name: (b.full_name as string).trim(),
          phone: typeof b.phone === "string" ? b.phone : undefined,
        },
      };
    });
    if (!v.ok) return v.response;
    const { email, password, full_name, phone } = v.data;

    const admin = createAdminClient();

    // Create auth user (service role bypasses email confirmation)
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "caregiver" },
    });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || "Could not create caregiver account" },
        { status: 400 }
      );
    }

    // Create profile row
    const { error: profileError } = await admin.from("profiles").upsert({
      id: created.user.id,
      email,
      full_name,
      role: "caregiver",
      org_id: orgId,
      phone: phone || null,
      is_active: true,
    });

    if (profileError) {
      // Rollback auth user if profile creation failed
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    await logActivity({
      orgId,
      userId: user.id,
      action: "caregiver.create",
      entity: "profiles",
      entityId: created.user.id,
      metadata: { email, full_name },
    });

    return NextResponse.json({
      caregiver: { id: created.user.id, email, full_name, role: "caregiver", is_active: true },
      message: "Caregiver created successfully",
    });
  });
}
