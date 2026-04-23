import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PATCH /api/caregivers/profile — update the LOGGED-IN caregiver's own profile.
 * (Self-service for bio, specializations, languages, etc.)
 */
export async function PATCH(req: NextRequest) {
  return withAuth(req, async (req, user, role) => {
    if (role !== "caregiver" && role !== "provider_admin") {
      return NextResponse.json({ error: "Only caregivers can update their profile" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    // Whitelist updatable fields
    const allowed: Record<string, unknown> = {};
    if (typeof body.bio === "string") allowed.bio = body.bio.slice(0, 1000);
    if (typeof body.experience_years === "number") allowed.experience_years = Math.max(0, Math.floor(body.experience_years));
    if (Array.isArray(body.specializations)) allowed.specializations = (body.specializations as unknown[]).map(String).slice(0, 10);
    if (Array.isArray(body.languages)) allowed.languages = (body.languages as unknown[]).map(String).slice(0, 10);
    if (Array.isArray(body.certifications)) allowed.certifications = (body.certifications as unknown[]).map(String).slice(0, 20);
    if (typeof body.phone === "string") allowed.phone = body.phone.slice(0, 20);
    if (typeof body.avatar_url === "string") allowed.avatar_url = body.avatar_url.slice(0, 500);
    if (typeof body.full_name === "string") allowed.full_name = body.full_name.slice(0, 100);

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update(allowed).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: "Profile updated", updated: allowed });
  });
}
