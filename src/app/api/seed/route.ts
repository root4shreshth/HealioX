import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { rejectInProduction } from "@/lib/api/with-auth";

// Seeds demo data into Supabase — development/staging only.
// Blocked in production by rejectInProduction() guard.
export async function POST(req: NextRequest) {
  // Hard-block in production
  const blocked = rejectInProduction();
  if (blocked) return blocked;

  // Require a secret token even in dev/staging so it can't be called accidentally
  const token = req.headers.get("x-seed-token");
  if (token !== (process.env.SEED_SECRET || "aayucare-dev-seed")) {
    return NextResponse.json({ error: "Forbidden: invalid seed token" }, { status: 403 });
  }

  // Resolve the caller's user ID from cookies — we'll assign visits to THEM
  // so they show up immediately on their own /caregiver, /admin, /dashboard pages.
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user: callerUser } } = await authClient.auth.getUser();
  const callerUserId = callerUser?.id || null;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role to bypass RLS
    );

    // 1. Seed organization
    const { error: orgError } = await supabase.from("organizations").upsert({
      id: "00000000-0000-0000-0000-000000000001",
      name: "SevaCare India Pvt. Ltd.",
      type: "provider",
      address: "New Delhi, India",
    });
    if (orgError) console.error("Org seed error:", orgError);

    // 2. Seed patients (Indian names, cities, conditions)
    const patients = [
      {
        id: "00000000-0000-0000-0000-000000000101",
        full_name: "Sunita Devi",
        date_of_birth: "1948-03-15",
        address: "12 Rajpur Road, Civil Lines, Delhi 110054",
        lat: 28.6862,
        lng: 77.2217,
        risk_level: "moderate",
        risk_score: 62,
        primary_conditions: ["Arthritis", "Mild Cognitive Decline", "Hypertension"],
        emergency_contact_name: "Priya Sharma",
        emergency_contact_phone: "+91 98100 12345",
        ndis_number: "AB-9923456",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000102",
        full_name: "Ramesh Gupta",
        date_of_birth: "1945-07-22",
        address: "7 Sector 22, Noida, Uttar Pradesh 201301",
        lat: 28.5706,
        lng: 77.3210,
        risk_level: "low",
        risk_score: 81,
        primary_conditions: ["Type 2 Diabetes", "Hearing Loss"],
        emergency_contact_name: "Amit Gupta",
        emergency_contact_phone: "+91 98200 23456",
        ndis_number: "UP-5561023",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000103",
        full_name: "Kamla Devi",
        date_of_birth: "1952-11-08",
        address: "34 Koramangala 5th Block, Bangalore 560095",
        lat: 12.9352,
        lng: 77.6245,
        risk_level: "high",
        risk_score: 38,
        primary_conditions: ["Parkinson's Disease", "Depression", "Fall Risk"],
        emergency_contact_name: "Suresh Rao",
        emergency_contact_phone: "+91 98300 34567",
        ndis_number: "KA-7789234",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000104",
        full_name: "Mohan Lal",
        date_of_birth: "1950-01-30",
        address: "89 Anna Nagar, Chennai 600040",
        lat: 13.0878,
        lng: 80.2140,
        risk_level: "low",
        risk_score: 88,
        primary_conditions: ["COPD", "Mild Anxiety"],
        emergency_contact_name: "Meena Lal",
        emergency_contact_phone: "+91 98400 45678",
        ndis_number: "TN-3345678",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000105",
        full_name: "Anita Verma",
        date_of_birth: "1946-06-18",
        address: "55 Hazratganj, Lucknow, UP 226001",
        lat: 26.8505,
        lng: 80.9492,
        risk_level: "moderate",
        risk_score: 55,
        primary_conditions: ["Dementia (Early Stage)", "Osteoporosis", "Vision Impairment"],
        emergency_contact_name: "Rakesh Verma",
        emergency_contact_phone: "+91 98500 56789",
        ndis_number: "UP-8812345",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000106",
        full_name: "Rajesh Kumar",
        date_of_birth: "1943-02-25",
        address: "21 C Scheme, Jaipur, Rajasthan 302001",
        lat: 26.9124,
        lng: 75.7873,
        risk_level: "high",
        risk_score: 42,
        primary_conditions: ["Stroke Recovery", "Limited Mobility", "Speech Difficulty"],
        emergency_contact_name: "Geeta Kumar",
        emergency_contact_phone: "+91 98600 67890",
        ndis_number: "RJ-9923456",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000107",
        full_name: "Savitri Yadav",
        date_of_birth: "1947-09-12",
        address: "10 Banjara Hills, Hyderabad 500034",
        lat: 17.4156,
        lng: 78.4347,
        risk_level: "low",
        risk_score: 79,
        primary_conditions: ["Type 2 Diabetes", "Mild Depression"],
        emergency_contact_name: "Vijay Yadav",
        emergency_contact_phone: "+91 98700 78901",
        ndis_number: "TS-1134567",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000108",
        full_name: "Suresh Pandey",
        date_of_birth: "1936-12-03",
        address: "3 Alipore Road, Kolkata, WB 700027",
        lat: 22.5331,
        lng: 88.3384,
        risk_level: "emergency",
        risk_score: 22,
        primary_conditions: ["Heart Failure", "Chronic Kidney Disease", "Fall Risk"],
        emergency_contact_name: "Deepa Pandey",
        emergency_contact_phone: "+91 98800 89012",
        ndis_number: "WB-2245678",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
    ];

    for (const patient of patients) {
      const { error } = await supabase.from("patients").upsert(patient);
      if (error && /column .* does not exist|schema cache|Could not find/.test(error.message)) {
        // Strip columns that may not exist in older schemas
        const { lat, lng, ndis_number, ...minimal } = patient;
        void lat; void lng; void ndis_number;
        const retry = await supabase.from("patients").upsert(minimal);
        if (retry.error) console.error("Patient seed error:", retry.error.message);
      } else if (error) {
        console.error("Patient seed error:", error.message);
      }
    }

    // 3. Seed alerts
    const alerts = [
      {
        patient_id: "00000000-0000-0000-0000-000000000103",
        type: "health_decline",
        severity: "urgent",
        title: "Rapid Health Decline — Kamla Devi",
        description: "Risk score dropped from 52 to 38 over the past week. Multiple domains showing decline including mood, mobility, and appetite.",
        status: "active",
      },
      {
        patient_id: "00000000-0000-0000-0000-000000000101",
        type: "risk_change",
        severity: "warning",
        title: "Mobility Concern — Sunita Devi",
        description: "Mobility score has declined for 3 consecutive check-ins. Knee pain reported as worsening.",
        status: "active",
      },
      {
        patient_id: "00000000-0000-0000-0000-000000000106",
        type: "health_decline",
        severity: "urgent" as const,
        title: "Stroke Recovery Concern — Rajesh Kumar",
        description: "Speech therapy progress has plateaued. Mobility declining over past 2 weeks. Care plan review recommended.",
        status: "active" as const,
      },
      {
        patient_id: "00000000-0000-0000-0000-000000000108",
        type: "health_decline",
        severity: "emergency" as const,
        title: "EMERGENCY — Suresh Pandey",
        description: "Risk score dropped to 22. Heart failure symptoms worsening. Chronic kidney disease advancing. Immediate medical review required.",
        status: "active" as const,
      },
      {
        patient_id: "00000000-0000-0000-0000-000000000105",
        type: "risk_change",
        severity: "warning" as const,
        title: "Cognitive Decline — Anita Verma",
        description: "Home attendant reports increased confusion during last 3 visits. Forgot medication twice this week. Specialist screening recommended.",
        status: "active" as const,
      },
    ];

    await supabase.from("alerts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    for (const alert of alerts) {
      await supabase.from("alerts").insert(alert);
    }

    // 4. Seed today's visits
    const today = new Date().toISOString().split("T")[0];
    const { data: existingVisits } = await supabase
      .from("visits").select("id")
      .gte("scheduled_start", `${today}T00:00:00`)
      .lte("scheduled_start", `${today}T23:59:59`)
      .limit(1);

    if (!existingVisits || existingVisits.length === 0) {
      // Assign visits to the caller if logged in, so they show up on
      // their own pages (/caregiver, /admin, /dashboard) immediately.
      // Otherwise fall back to finding a caregiver profile.
      let caregiverId = callerUserId || "";

      if (!caregiverId) {
        const { data: existingCaregiver } = await supabase.from("profiles").select("id").eq("role", "caregiver").limit(1);
        if (existingCaregiver && existingCaregiver.length > 0) {
          caregiverId = existingCaregiver[0].id;
        }
      }

      // Final fallback: any profile / any auth user
      if (!caregiverId) {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const caregiverUser = authUsers?.users?.find((u) => u.email === "caregiver@aayucare.demo");
        if (caregiverUser) {
          caregiverId = caregiverUser.id;
          await supabase.from("profiles").upsert({
            id: caregiverId, role: "caregiver",
            full_name: "Ravi Sharma (Home Attendant)", email: "caregiver@aayucare.demo",
            organization_id: "00000000-0000-0000-0000-000000000001",
          });
        } else {
          const { data: anyProfile } = await supabase.from("profiles").select("id").limit(1);
          if (anyProfile && anyProfile.length > 0) {
            caregiverId = anyProfile[0].id;
          } else {
            const anyUser = authUsers?.users?.[0];
            if (anyUser) {
              caregiverId = anyUser.id;
              await supabase.from("profiles").upsert({
                id: caregiverId, role: "caregiver",
                full_name: anyUser.user_metadata?.full_name || "Home Attendant",
                email: anyUser.email || "caregiver@aayucare.demo",
                organization_id: "00000000-0000-0000-0000-000000000001",
              });
            }
          }
        }
      }

      if (!caregiverId) {
        return NextResponse.json({ error: "No users found. Please sign up as a caregiver first, then seed again." }, { status: 400 });
      }

      const visits = [
        {
          patient_id: "00000000-0000-0000-0000-000000000101",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T09:00:00+05:30`,
          scheduled_end: `${today}T10:00:00+05:30`,
          status: "completed",
          check_in_time: `${today}T09:02:00+05:30`,
          check_out_time: `${today}T09:47:00+05:30`,
          gps_verified: true,
          duration_minutes: 45,
          services: ["Personal Care", "Medication Assistance"],
          caregiver_notes: "Sunita ji was in good spirits. Assisted with morning routine and medication. Ate breakfast fully.",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000102",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T10:30:00+05:30`,
          scheduled_end: `${today}T11:30:00+05:30`,
          status: "scheduled",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000103",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T13:00:00+05:30`,
          scheduled_end: `${today}T14:00:00+05:30`,
          status: "scheduled",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000104",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T15:00:00+05:30`,
          scheduled_end: `${today}T15:45:00+05:30`,
          status: "scheduled",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000105",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T08:00:00+05:30`,
          scheduled_end: `${today}T08:45:00+05:30`,
          status: "completed",
          check_in_time: `${today}T08:03:00+05:30`,
          check_out_time: `${today}T08:40:00+05:30`,
          gps_verified: true,
          duration_minutes: 37,
          services: ["Personal Care", "Medication Assistance", "Meal Preparation"],
          caregiver_notes: "Anita ji was slightly confused this morning but responded well to gentle reminders. All medications taken on time.",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000106",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T11:30:00+05:30`,
          scheduled_end: `${today}T12:30:00+05:30`,
          status: "scheduled",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000107",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T14:00:00+05:30`,
          scheduled_end: `${today}T14:45:00+05:30`,
          status: "scheduled",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000108",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T16:00:00+05:30`,
          scheduled_end: `${today}T17:00:00+05:30`,
          status: "scheduled",
        },
      ];

      for (const visit of visits) {
        const { error } = await supabase.from("visits").insert(visit);
        if (error && /column .* does not exist|schema cache|Could not find/.test(error.message)) {
          // Strip optional columns that may not exist yet
          const { organization_id, caregiver_id, ...minimal } = visit;
          void organization_id;
          // Keep caregiver_id if the column exists by trying one more time without organization_id first
          const retry1 = await supabase.from("visits").insert({ ...minimal, caregiver_id });
          if (retry1.error && /column .* does not exist|schema cache|Could not find/.test(retry1.error.message)) {
            const retry2 = await supabase.from("visits").insert(minimal);
            if (retry2.error) console.error("Visit seed error:", retry2.error.message);
          }
        } else if (error) {
          console.error("Visit seed error:", error.message);
        }
      }
    }

    // 5. Seed health check-in history for Sunita Devi
    const { data: existingCheckins } = await supabase.from("health_checkins").select("id").limit(1);
    if (!existingCheckins || existingCheckins.length === 0) {
      for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const baseScore = 62 + Math.floor(Math.random() * 10) - 5;
        await supabase.from("health_checkins").insert({
          patient_id: "00000000-0000-0000-0000-000000000101",
          risk_score: baseScore,
          risk_level: baseScore >= 70 ? "low" : baseScore >= 50 ? "moderate" : "high",
          confidence: 0.85,
          domains: {
            mood: { score: 65 + Math.floor(Math.random() * 15), trend: "stable" },
            pain: { score: 40 + Math.floor(Math.random() * 15), trend: "declining" },
            mobility: { score: 50 + Math.floor(Math.random() * 15), trend: "declining" },
            medication: { score: 85 + Math.floor(Math.random() * 10), trend: "stable" },
            sleep: { score: 55 + Math.floor(Math.random() * 15), trend: "stable" },
            appetite: { score: 70 + Math.floor(Math.random() * 10), trend: "stable" },
            cognition: { score: 60 + Math.floor(Math.random() * 10), trend: "declining" },
          },
          ai_summary: `Day ${8 - daysAgo} check-in: Sunita ji reports moderate pain and some mobility difficulty. Medication adherence is excellent.`,
          flags: daysAgo <= 3 ? ["Knee pain worsening", "Mobility declining"] : [],
          completed: true,
          completed_at: date.toISOString(),
          created_at: date.toISOString(),
        });
      }
    }

    // 6. Link demo users to patients
    const demoLinks = [
      {
        email: "caregiver@aayucare.demo",
        patientIds: ["00000000-0000-0000-0000-000000000101", "00000000-0000-0000-0000-000000000102", "00000000-0000-0000-0000-000000000103", "00000000-0000-0000-0000-000000000104", "00000000-0000-0000-0000-000000000105", "00000000-0000-0000-0000-000000000106", "00000000-0000-0000-0000-000000000107", "00000000-0000-0000-0000-000000000108"],
        relationship: "caregiver",
      },
      { email: "patient@aayucare.demo", patientIds: ["00000000-0000-0000-0000-000000000101"], relationship: "self" },
      { email: "family@aayucare.demo", patientIds: ["00000000-0000-0000-0000-000000000101"], relationship: "family_member" },
    ];

    for (const link of demoLinks) {
      const { data: profile } = await supabase.from("profiles").select("id").eq("email", link.email).single();
      if (profile) {
        for (const pid of link.patientIds) {
          await supabase.from("patient_assignments").upsert(
            { patient_id: pid, profile_id: profile.id, relationship: link.relationship, is_primary: true },
            { onConflict: "patient_id,profile_id" }
          );
        }
      }
    }

    // 6b. Link THE CALLER (whoever triggered seed) so they see data immediately
    // regardless of email — critical for auto-seed on first load.
    if (callerUserId) {
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("id, role, full_name, email")
        .eq("id", callerUserId)
        .single();

      if (callerProfile) {
        const role = callerProfile.role;
        if (role === "caregiver") {
          // Caregiver sees all 8 patients
          for (const pid of patients.map((p) => p.id)) {
            await supabase.from("patient_assignments").upsert(
              { patient_id: pid, profile_id: callerUserId, relationship: "caregiver", is_primary: true },
              { onConflict: "patient_id,profile_id" }
            );
          }
        } else if (role === "family") {
          // Family user → linked to Sunita Devi (patient #101) which has the rich check-in history
          await supabase.from("patient_assignments").upsert(
            { patient_id: "00000000-0000-0000-0000-000000000101", profile_id: callerUserId, relationship: "family_member", is_primary: true },
            { onConflict: "patient_id,profile_id" }
          );
        } else if (role === "patient") {
          await supabase.from("patient_assignments").upsert(
            { patient_id: "00000000-0000-0000-0000-000000000101", profile_id: callerUserId, relationship: "self", is_primary: true },
            { onConflict: "patient_id,profile_id" }
          );
        }
      }
    }

    // 7. Seed daily updates
    const { data: existingUpdates } = await supabase.from("daily_updates").select("id").limit(1);
    if (!existingUpdates || existingUpdates.length === 0) {
      const { data: cgProfile } = await supabase.from("profiles").select("id").eq("role", "caregiver").limit(1);
      const updateCaregiverId = cgProfile?.[0]?.id || "unknown";
      for (let daysAgo = 5; daysAgo >= 0; daysAgo--) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const moods = ["Cheerful", "Calm", "Calm", "Slightly Anxious", "Calm", "Cheerful"];
        await supabase.from("daily_updates").insert({
          patient_id: "00000000-0000-0000-0000-000000000101",
          caregiver_id: updateCaregiverId,
          content: daysAgo === 0
            ? "Sunita ji was in good spirits today. Completed all morning tasks. Ate a full breakfast with dal-roti. Mentioned her knee pain is slightly better than yesterday."
            : `Visit completed. Sunita ji was ${moods[daysAgo]} today. All tasks done. Medication taken on time. ${daysAgo <= 2 ? "Knee pain still present but manageable." : "No major concerns."}`,
          mood_observation: moods[daysAgo],
          medication_taken: true,
          concerns: daysAgo <= 2 ? ["Knee pain ongoing"] : [],
          created_at: date.toISOString(),
        });
      }
    }

    // 8. Seed caregiver ratings (so caregiver reports + family rating page show data).
    // We need a caregiver AND a family rater — use whoever we can find.
    try {
      const { data: cg } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "caregiver")
        .limit(1);
      const { data: fam } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "family")
        .limit(1);
      const caregiverId = cg?.[0]?.id || callerUserId;
      const familyId = fam?.[0]?.id;

      if (caregiverId && familyId && caregiverId !== familyId) {
        const { data: existing } = await supabase
          .from("caregiver_ratings")
          .select("id")
          .eq("caregiver_id", caregiverId)
          .limit(1);
        if (!existing || existing.length === 0) {
          // Single rating per unique (family_id, caregiver_id, patient_id) constraint
          await supabase.from("caregiver_ratings").insert({
            caregiver_id: caregiverId,
            family_id: familyId,
            patient_id: "00000000-0000-0000-0000-000000000101",
            org_id: "00000000-0000-0000-0000-000000000001",
            stars: 5,
            comment: "Very caring and punctual. Mummy is very comfortable with her. Highly recommended.",
          });
        }
      }
    } catch { /* caregiver_ratings table may not exist in older schemas */ }

    return NextResponse.json({
      success: true,
      message: "Demo data seeded successfully",
      seeded: {
        organization: "SevaCare India Pvt. Ltd.",
        patients: patients.length,
        alerts: alerts.length,
        visits: 8,
        health_checkins: 7,
        daily_updates: 6,
        patient_assignments: "linked",
      },
    });
  } catch (error: unknown) {
    console.error("Seed error:", error);
    const message = error instanceof Error ? error.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
