import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/signup — Self-serve provider/organization signup.
 *
 * Creates:
 *   1. An organizations row
 *   2. A Supabase auth user (the admin)
 *   3. A profiles row linking that user to the org with role=provider_admin
 *
 * All atomic — if any step fails, prior writes are rolled back.
 */
type SignupBody = {
  // Organization
  org_name: string;
  org_type?: "hospital" | "home_care" | "clinic" | "nursing_home" | "provider";
  org_address?: string;
  org_phone?: string;
  org_website?: string;
  // Admin user
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
  admin_phone?: string;
};

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json({ error: "Body required" }, { status: 400 });
  }

  const b = raw as Record<string, unknown>;

  // Validate
  if (!b.org_name || typeof b.org_name !== "string" || b.org_name.length < 2) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }
  if (!b.admin_full_name || typeof b.admin_full_name !== "string") {
    return NextResponse.json({ error: "Admin full name is required" }, { status: 400 });
  }
  if (!b.admin_email || typeof b.admin_email !== "string" || !validateEmail(b.admin_email)) {
    return NextResponse.json({ error: "Valid admin email is required" }, { status: 400 });
  }
  if (!b.admin_password || typeof b.admin_password !== "string" || b.admin_password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const payload: SignupBody = {
    org_name: (b.org_name as string).trim(),
    org_type: (b.org_type as SignupBody["org_type"]) || "home_care",
    org_address: typeof b.org_address === "string" ? b.org_address : undefined,
    org_phone: typeof b.org_phone === "string" ? b.org_phone : undefined,
    org_website: typeof b.org_website === "string" ? b.org_website : undefined,
    admin_full_name: (b.admin_full_name as string).trim(),
    admin_email: (b.admin_email as string).trim().toLowerCase(),
    admin_password: b.admin_password as string,
    admin_phone: typeof b.admin_phone === "string" ? b.admin_phone : undefined,
  };

  const admin = createAdminClient();

  // 1. Create organization
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: payload.org_name,
      type: payload.org_type,
      address: payload.org_address || null,
      phone: payload.org_phone || null,
      website: payload.org_website || null,
      plan: "trial",
      metadata: { trial_started_at: new Date().toISOString(), trial_days: 14 },
    })
    .select()
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message || "Could not create organization" }, { status: 500 });
  }

  // 2. Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: payload.admin_email,
    password: payload.admin_password,
    email_confirm: true,
    user_metadata: {
      full_name: payload.admin_full_name,
      role: "provider_admin",
    },
  });

  if (authError || !authData.user) {
    // Rollback org
    await admin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({
      error: authError?.message?.includes("already been registered")
        ? "An account with that email already exists"
        : authError?.message || "Could not create admin account",
    }, { status: 400 });
  }

  // 3. Create profile
  const { error: profileError } = await admin.from("profiles").upsert({
    id: authData.user.id,
    email: payload.admin_email,
    full_name: payload.admin_full_name,
    role: "provider_admin",
    org_id: org.id,
    phone: payload.admin_phone || null,
    is_active: true,
  });

  if (profileError) {
    // Rollback user + org
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    organization: { id: org.id, name: org.name },
    admin: { id: authData.user.id, email: payload.admin_email, full_name: payload.admin_full_name },
    message: "Provider account created successfully",
  });
}
