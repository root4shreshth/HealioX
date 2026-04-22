import { NextRequest, NextResponse } from "next/server";
import { withAdmin, validateBody, logActivity } from "@/lib/api/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/alerts?status=active|resolved|all
export async function GET(req: NextRequest) {
  return withAdmin(req, async (req, _user, _role, orgId) => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "active";

    const admin = createAdminClient();

    let query = admin
      .from("alerts")
      .select("*, patients!inner(full_name, organization_id, risk_level)")
      .eq("patients.organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      alerts: (data || []).map((a) => {
        const p = a.patients as Record<string, unknown> | null;
        return {
          id: a.id,
          patient_id: a.patient_id,
          patient_name: (p?.full_name as string) || "Unknown",
          patient_risk_level: (p?.risk_level as string) || "low",
          type: a.type,
          severity: a.severity,
          title: a.title,
          description: a.description,
          status: a.status,
          created_at: a.created_at,
          resolved_at: a.resolved_at,
        };
      }),
    });
  });
}

// PATCH /api/admin/alerts — resolve/acknowledge (batch)
type PatchBody = { ids: string[]; action: "resolve" | "acknowledge" };

export async function PATCH(req: NextRequest) {
  return withAdmin(req, async (req, user, _role, orgId) => {
    const v = await validateBody<PatchBody>(req, (raw) => {
      if (typeof raw !== "object" || raw === null) return { valid: false, error: "Body required" };
      const b = raw as Record<string, unknown>;
      if (!Array.isArray(b.ids) || b.ids.length === 0) return { valid: false, error: "ids required" };
      if (!["resolve", "acknowledge"].includes(b.action as string)) return { valid: false, error: "invalid action" };
      return { valid: true, data: { ids: b.ids as string[], action: b.action as PatchBody["action"] } };
    });
    if (!v.ok) return v.response;

    const admin = createAdminClient();
    const update = v.data.action === "resolve"
      ? { status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user.id }
      : { status: "acknowledged", acknowledged_by: user.id };

    const { error } = await admin.from("alerts").update(update).in("id", v.data.ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      orgId, userId: user.id,
      action: `alert.${v.data.action}`,
      entity: "alerts",
      metadata: { count: v.data.ids.length },
    });

    return NextResponse.json({ message: "Alerts updated", count: v.data.ids.length });
  });
}
