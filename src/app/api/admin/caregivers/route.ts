import { NextRequest, NextResponse } from "next/server";
import { withAdmin, validateBody, logActivity } from "@/lib/api/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidEmail, isValidPhone, isValidName, isValidPassword, isValidAadhaar, normalizePhone } from "@/lib/validation";

// ── GET /api/admin/caregivers — list all caregivers in this org ─────────────
export async function GET(req: NextRequest) {
  return withAdmin(req, async (_req, _user, _role, orgId) => {
    const admin = createAdminClient();

    let profilesQ = await admin
      .from("profiles")
      .select("id, email, full_name, role, org_id, phone, is_active, verification_status, qualification, created_at, updated_at")
      .eq("role", "caregiver")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    // Pre-migration fallback: retry without verification columns
    if (profilesQ.error && /column .* does not exist|schema cache|Could not find/.test(profilesQ.error.message)) {
      profilesQ = await admin
        .from("profiles")
        .select("id, email, full_name, role, org_id, phone, is_active, created_at, updated_at")
        .eq("role", "caregiver")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }) as typeof profilesQ;
    }
    const profiles = profilesQ.data;
    const error = profilesQ.error;

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
  // Verification fields (optional)
  aadhaar_number?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  qualification?: string;
  institution?: string;
  year_of_passing?: number;
  verification_data?: Record<string, unknown>;
  is_verified?: boolean;
};

export async function POST(req: NextRequest) {
  return withAdmin(req, async (req, user, _role, orgId) => {
    const v = await validateBody<CreateCaregiverBody>(req, (raw) => {
      if (typeof raw !== "object" || raw === null) return { valid: false, error: "Body must be an object" };
      const b = raw as Record<string, unknown>;

      // ── Strict field validation ─────────────────────────────────────────
      const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
      if (!isValidEmail(email)) return { valid: false, error: "Invalid email address" };

      const password = typeof b.password === "string" ? b.password : "";
      if (!isValidPassword(password)) {
        return { valid: false, error: "Password must be 8+ chars with letters and a digit" };
      }

      const full_name = typeof b.full_name === "string" ? b.full_name.trim() : "";
      if (!isValidName(full_name)) return { valid: false, error: "Full name must be 2-80 letters" };

      let phone: string | undefined;
      if (b.phone) {
        if (typeof b.phone !== "string") return { valid: false, error: "Phone must be a string" };
        const normalized = normalizePhone(b.phone);
        if (!isValidPhone(normalized)) {
          return { valid: false, error: "Invalid phone (use +<country><number>, e.g. +919810000000)" };
        }
        phone = normalized;
      }

      // Verification fields (all optional, but validated when present)
      const aadhaar = typeof b.aadhaar_number === "string" ? b.aadhaar_number.replace(/\D/g, "") : undefined;
      if (aadhaar && !isValidAadhaar(aadhaar)) {
        return { valid: false, error: "Aadhaar number must be 12 digits" };
      }

      const dob = typeof b.date_of_birth === "string" ? b.date_of_birth : undefined;
      if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        return { valid: false, error: "date_of_birth must be YYYY-MM-DD" };
      }

      const gender = typeof b.gender === "string" ? b.gender.toLowerCase() : undefined;
      if (gender && !["male", "female", "other"].includes(gender)) {
        return { valid: false, error: "gender must be male/female/other" };
      }

      const yop = b.year_of_passing != null ? Number(b.year_of_passing) : undefined;
      if (yop !== undefined && (!Number.isFinite(yop) || yop < 1950 || yop > new Date().getFullYear() + 1)) {
        return { valid: false, error: "Invalid year_of_passing" };
      }

      return {
        valid: true,
        data: {
          email, password, full_name, phone,
          aadhaar_number: aadhaar,
          date_of_birth: dob,
          gender,
          address: typeof b.address === "string" ? b.address.trim() : undefined,
          qualification: typeof b.qualification === "string" ? b.qualification.trim() : undefined,
          institution: typeof b.institution === "string" ? b.institution.trim() : undefined,
          year_of_passing: yop,
          verification_data: (b.verification_data && typeof b.verification_data === "object")
            ? b.verification_data as Record<string, unknown> : undefined,
          is_verified: b.is_verified === true,
        },
      };
    });
    if (!v.ok) return v.response;
    const {
      email, password, full_name, phone,
      aadhaar_number, date_of_birth, gender, address,
      qualification, institution, year_of_passing,
      verification_data, is_verified,
    } = v.data;

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

    // Create profile row. Try with all verification fields; on missing-column
    // errors, progressively strip fields so the app still works pre-migration.
    const fullProfile: Record<string, unknown> = {
      id: created.user.id,
      email,
      full_name,
      role: "caregiver",
      org_id: orgId,
      phone: phone || null,
      is_active: true,
      verification_status: is_verified ? "verified" : "unverified",
      verified_at: is_verified ? new Date().toISOString() : null,
      verified_by: is_verified ? user.id : null,
      aadhaar_number: aadhaar_number || null,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      address: address || null,
      qualification: qualification || null,
      institution: institution || null,
      year_of_passing: year_of_passing || null,
      verification_data: verification_data || null,
    };

    let profileError = (await admin.from("profiles").upsert(fullProfile)).error;

    if (profileError && /column .* does not exist|schema cache|Could not find/.test(profileError.message)) {
      // Verification columns missing — retry with core+phone+org only
      profileError = (await admin.from("profiles").upsert({
        id: created.user.id,
        email,
        full_name,
        role: "caregiver",
        org_id: orgId,
        phone: phone || null,
        is_active: true,
      })).error;
    }

    if (profileError && /column .* does not exist|schema cache|Could not find/.test(profileError.message)) {
      // Missing org/phone columns — last-ditch retry with bare minimum
      profileError = (await admin.from("profiles").upsert({
        id: created.user.id,
        email,
        full_name,
        role: "caregiver",
      })).error;
    }

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({
        error: `${profileError.message}. Run supabase/migrations/20260423_admin_portal_schema.sql in your Supabase SQL editor to add missing columns.`,
      }, { status: 500 });
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
      caregiver: {
        id: created.user.id, email, full_name, role: "caregiver", is_active: true,
        verification_status: is_verified ? "verified" : "unverified",
      },
      message: is_verified ? "Verified caregiver created" : "Caregiver created",
    });
  });
}
