import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedHandler } from "./with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin-only wrapper. Enforces:
 *  - User is authenticated
 *  - User has role = provider_admin or government
 *  - Resolves and passes the caller's org_id to the handler
 *
 * Handlers receive (req, user, role, orgId).
 */
export type AdminHandler = (
  req: NextRequest,
  user: Parameters<AuthedHandler>[1],
  role: string,
  orgId: string
) => Promise<NextResponse>;

export async function withAdmin(req: NextRequest, handler: AdminHandler) {
  return withAuth(req, async (req, user, role) => {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    // Default org for demo — in production, every admin must have org_id
    const orgId = profile?.org_id || "00000000-0000-0000-0000-000000000001";
    return handler(req, user, role, orgId);
  }, ["provider_admin", "government"]);
}

/**
 * Validates a request body shape. Returns parsed data or a 400 response.
 */
export async function validateBody<T>(
  req: NextRequest,
  validator: (body: unknown) => { valid: true; data: T } | { valid: false; error: string }
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    const raw = await req.json();
    const result = validator(raw);
    if (!result.valid) {
      return { ok: false, response: NextResponse.json({ error: result.error }, { status: 400 }) };
    }
    return { ok: true, data: result.data };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
}

/** Append an entry to the audit log (fire and forget) */
export async function logActivity(params: {
  orgId: string;
  userId: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("activity_log").insert({
      org_id: params.orgId,
      user_id: params.userId,
      action: params.action,
      entity: params.entity || null,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
    });
  } catch {
    // Best-effort; don't block main flow
  }
}
