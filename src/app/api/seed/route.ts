import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Seeds demo data into Supabase — called once on first setup
export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role to bypass RLS
    );

    // 1. Seed organization
    const { error: orgError } = await supabase.from("organizations").upsert({
      id: "00000000-0000-0000-0000-000000000001",
      name: "Continuity Care WA",
      type: "provider",
      address: "Perth, Western Australia",
    });
    if (orgError) console.error("Org seed error:", orgError);

    // 2. Seed patients
    const patients = [
      {
        id: "00000000-0000-0000-0000-000000000101",
        full_name: "Margaret Sullivan",
        date_of_birth: "1941-03-15",
        address: "42 Rose St, Nedlands WA 6009",
        lat: -31.9815,
        lng: 115.8025,
        risk_level: "moderate",
        risk_score: 62,
        primary_conditions: ["Arthritis", "Mild Cognitive Decline", "Hypertension"],
        emergency_contact_name: "Sarah Sullivan",
        emergency_contact_phone: "0412 345 678",
        ndis_number: "NDIS-4432891",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000102",
        full_name: "John Davis",
        date_of_birth: "1938-07-22",
        address: "18 Oak Ave, Subiaco WA 6008",
        lat: -31.949,
        lng: 115.8277,
        risk_level: "low",
        risk_score: 81,
        primary_conditions: ["Type 2 Diabetes", "Hearing Loss"],
        emergency_contact_name: "Michael Davis",
        emergency_contact_phone: "0423 456 789",
        ndis_number: "NDIS-5561023",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000103",
        full_name: "Alice Wong",
        date_of_birth: "1945-11-08",
        address: "7 Cliff Rd, Claremont WA 6010",
        lat: -31.9757,
        lng: 115.7829,
        risk_level: "high",
        risk_score: 38,
        primary_conditions: ["Parkinson's Disease", "Depression", "Fall Risk"],
        emergency_contact_name: "David Wong",
        emergency_contact_phone: "0434 567 890",
        ndis_number: "NDIS-7789234",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000104",
        full_name: "Robert Chen",
        date_of_birth: "1950-01-30",
        address: "95 Park Way, Crawley WA 6009",
        lat: -31.9818,
        lng: 115.8171,
        risk_level: "low",
        risk_score: 88,
        primary_conditions: ["COPD", "Mild Anxiety"],
        emergency_contact_name: "Linda Chen",
        emergency_contact_phone: "0445 678 901",
        ndis_number: "NDIS-3345678",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000105",
        full_name: "Dorothy Williams",
        date_of_birth: "1939-06-18",
        address: "31 Swan View Tce, Dalkeith WA 6009",
        lat: -31.9920,
        lng: 115.7960,
        risk_level: "moderate",
        risk_score: 55,
        primary_conditions: ["Dementia (Early Stage)", "Osteoporosis", "Vision Impairment"],
        emergency_contact_name: "James Williams",
        emergency_contact_phone: "0456 789 012",
        ndis_number: "NDIS-8812345",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000106",
        full_name: "Frank O'Brien",
        date_of_birth: "1943-02-25",
        address: "8 Hampden Rd, Cottesloe WA 6011",
        lat: -31.9950,
        lng: 115.7550,
        risk_level: "high",
        risk_score: 42,
        primary_conditions: ["Stroke Recovery", "Aphasia", "Limited Mobility"],
        emergency_contact_name: "Patricia O'Brien",
        emergency_contact_phone: "0467 890 123",
        ndis_number: "NDIS-9923456",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000107",
        full_name: "Edith Nakamura",
        date_of_birth: "1947-09-12",
        address: "15 Broome St, Mosman Park WA 6012",
        lat: -32.0020,
        lng: 115.7660,
        risk_level: "low",
        risk_score: 79,
        primary_conditions: ["Type 2 Diabetes", "Mild Depression"],
        emergency_contact_name: "Kenji Nakamura",
        emergency_contact_phone: "0478 901 234",
        ndis_number: "NDIS-1134567",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
      {
        id: "00000000-0000-0000-0000-000000000108",
        full_name: "George Papadopoulos",
        date_of_birth: "1936-12-03",
        address: "44 Thomas St, West Perth WA 6005",
        lat: -31.9480,
        lng: 115.8400,
        risk_level: "emergency",
        risk_score: 22,
        primary_conditions: ["Heart Failure", "Chronic Kidney Disease", "Fall Risk"],
        emergency_contact_name: "Maria Papadopoulos",
        emergency_contact_phone: "0489 012 345",
        ndis_number: "NDIS-2245678",
        organization_id: "00000000-0000-0000-0000-000000000001",
      },
    ];

    for (const patient of patients) {
      await supabase.from("patients").upsert(patient);
    }

    // 3. Seed alerts
    const alerts = [
      {
        patient_id: "00000000-0000-0000-0000-000000000103",
        type: "health_decline",
        severity: "urgent",
        title: "Rapid Health Decline - Alice Wong",
        description:
          "Risk score dropped from 52 to 38 over the past week. Multiple domains showing decline including mood, mobility, and appetite.",
        status: "active",
      },
      {
        patient_id: "00000000-0000-0000-0000-000000000101",
        type: "risk_change",
        severity: "warning",
        title: "Mobility Concern - Margaret Sullivan",
        description:
          "Mobility score has declined for 3 consecutive check-ins. Knee pain reported as worsening.",
        status: "active",
      },
    ];

    // Also add alerts for new patients
    alerts.push(
      {
        patient_id: "00000000-0000-0000-0000-000000000106",
        type: "health_decline",
        severity: "urgent" as const,
        title: "Stroke Recovery Concern — Frank O'Brien",
        description: "Speech therapy progress has plateaued. Mobility declining over past 2 weeks. Care plan review recommended.",
        status: "active" as const,
      },
      {
        patient_id: "00000000-0000-0000-0000-000000000108",
        type: "health_decline",
        severity: "emergency" as const,
        title: "EMERGENCY — George Papadopoulos",
        description: "Risk score dropped to 22. Multiple organ concerns. Heart failure symptoms worsening. Immediate medical review required.",
        status: "active" as const,
      },
      {
        patient_id: "00000000-0000-0000-0000-000000000105",
        type: "risk_change",
        severity: "warning" as const,
        title: "Cognitive Decline — Dorothy Williams",
        description: "Caregiver reports increased confusion during last 3 visits. Forgot medication twice this week. Dementia screening recommended.",
        status: "active" as const,
      }
    );

    // Clear existing alerts to avoid duplicates
    await supabase.from("alerts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    for (const alert of alerts) {
      await supabase.from("alerts").insert(alert);
    }

    // 4. Seed today's visits
    const today = new Date().toISOString().split("T")[0];

    // Check if visits already exist for today
    const { data: existingVisits } = await supabase
      .from("visits")
      .select("id")
      .gte("scheduled_start", `${today}T00:00:00`)
      .lte("scheduled_start", `${today}T23:59:59`)
      .limit(1);

    if (!existingVisits || existingVisits.length === 0) {
      // Find a real caregiver from auth.users / profiles
      let caregiverId = "";

      // First try: find existing caregiver profile
      const { data: existingCaregiver } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "caregiver")
        .limit(1);

      if (existingCaregiver && existingCaregiver.length > 0) {
        caregiverId = existingCaregiver[0].id;
      } else {
        // Second try: find the caregiver demo user in auth
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const caregiverUser = authUsers?.users?.find((u) => u.email === "caregiver@healiox.demo");

        if (caregiverUser) {
          caregiverId = caregiverUser.id;
          // Create their profile
          await supabase.from("profiles").upsert({
            id: caregiverId,
            role: "caregiver",
            full_name: "Demo Caregiver",
            email: "caregiver@healiox.demo",
            organization_id: "00000000-0000-0000-0000-000000000001",
          });
        } else {
          // Third try: use ANY user as caregiver
          const { data: anyProfile } = await supabase.from("profiles").select("id").limit(1);
          if (anyProfile && anyProfile.length > 0) {
            caregiverId = anyProfile[0].id;
          } else {
            // Last resort: find any auth user
            const anyUser = authUsers?.users?.[0];
            if (anyUser) {
              caregiverId = anyUser.id;
              await supabase.from("profiles").upsert({
                id: caregiverId,
                role: "caregiver",
                full_name: anyUser.user_metadata?.full_name || "Caregiver",
                email: anyUser.email || "caregiver@healiox.demo",
                organization_id: "00000000-0000-0000-0000-000000000001",
              });
            }
          }
        }
      }

      if (!caregiverId) {
        console.error("No caregiver user found. Create a demo account first.");
        return NextResponse.json({ error: "No users found. Please sign up as a caregiver first, then seed again." }, { status: 400 });
      }

      const visits = [
        {
          patient_id: "00000000-0000-0000-0000-000000000101",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T09:00:00+08:00`,
          scheduled_end: `${today}T10:00:00+08:00`,
          status: "completed",
          check_in_time: `${today}T09:02:00+08:00`,
          check_out_time: `${today}T09:47:00+08:00`,
          gps_verified: true,
          duration_minutes: 45,
          services: ["Personal Care", "Medication Assistance"],
          caregiver_notes: "Margaret was in good spirits. Assisted with shower and morning medication.",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000102",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T10:30:00+08:00`,
          scheduled_end: `${today}T11:30:00+08:00`,
          status: "scheduled",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000103",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T13:00:00+08:00`,
          scheduled_end: `${today}T14:00:00+08:00`,
          status: "scheduled",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000104",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T15:00:00+08:00`,
          scheduled_end: `${today}T15:45:00+08:00`,
          status: "scheduled",
        },
        // New patients
        {
          patient_id: "00000000-0000-0000-0000-000000000105",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T08:00:00+08:00`,
          scheduled_end: `${today}T08:45:00+08:00`,
          status: "completed",
          check_in_time: `${today}T08:03:00+08:00`,
          check_out_time: `${today}T08:40:00+08:00`,
          gps_verified: true,
          duration_minutes: 37,
          services: ["Personal Care", "Medication Assistance", "Meal Preparation"],
          caregiver_notes: "Dorothy was slightly confused this morning but responded well to gentle reminders. Took all medications with assistance.",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000106",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T11:30:00+08:00`,
          scheduled_end: `${today}T12:30:00+08:00`,
          status: "scheduled",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000107",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T14:00:00+08:00`,
          scheduled_end: `${today}T14:45:00+08:00`,
          status: "scheduled",
        },
        {
          patient_id: "00000000-0000-0000-0000-000000000108",
          caregiver_id: caregiverId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          scheduled_start: `${today}T16:00:00+08:00`,
          scheduled_end: `${today}T17:00:00+08:00`,
          status: "scheduled",
        },
      ];

      for (const visit of visits) {
        await supabase.from("visits").insert(visit);
      }
    }

    // 5. Seed sample health check-ins for historical data
    const { data: existingCheckins } = await supabase
      .from("health_checkins")
      .select("id")
      .limit(1);

    if (!existingCheckins || existingCheckins.length === 0) {
      // Create 7 days of check-in history for Margaret
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
          ai_summary: `Day ${8 - daysAgo} check-in: Margaret reports moderate pain and some mobility difficulty. Medication adherence is excellent.`,
          flags: daysAgo <= 3 ? ["Knee pain worsening", "Mobility declining"] : [],
          completed: true,
          completed_at: date.toISOString(),
          created_at: date.toISOString(),
        });
      }
    }

    // 6. Link demo users to patients via patient_assignments
    // Find demo users by email and create assignments
    const demoLinks = [
      { email: "caregiver@healiox.demo", patientIds: ["00000000-0000-0000-0000-000000000101", "00000000-0000-0000-0000-000000000102", "00000000-0000-0000-0000-000000000103", "00000000-0000-0000-0000-000000000104", "00000000-0000-0000-0000-000000000105", "00000000-0000-0000-0000-000000000106", "00000000-0000-0000-0000-000000000107", "00000000-0000-0000-0000-000000000108"], relationship: "caregiver" },
      { email: "patient@healiox.demo", patientIds: ["00000000-0000-0000-0000-000000000101"], relationship: "self" },
      { email: "family@healiox.demo", patientIds: ["00000000-0000-0000-0000-000000000101"], relationship: "family_member" },
    ];

    for (const link of demoLinks) {
      // Find user by email in profiles
      const { data: profile } = await supabase.from("profiles").select("id").eq("email", link.email).single();
      if (profile) {
        for (const pid of link.patientIds) {
          await supabase.from("patient_assignments").upsert({
            patient_id: pid,
            profile_id: profile.id,
            relationship: link.relationship,
            is_primary: true,
          }, { onConflict: "patient_id,profile_id" });
        }
      }
    }

    // 7. Seed sample daily updates (so family portal has data)
    const { data: existingUpdates } = await supabase.from("daily_updates").select("id").limit(1);
    if (!existingUpdates || existingUpdates.length === 0) {
      // Find the caregiver we used for visits
      const { data: cgProfile } = await supabase.from("profiles").select("id").eq("role", "caregiver").limit(1);
      const updateCaregiverId = cgProfile?.[0]?.id || "unknown";
      for (let daysAgo = 5; daysAgo >= 0; daysAgo--) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const moods = ["Happy", "Calm", "Calm", "Anxious", "Calm", "Happy"];
        await supabase.from("daily_updates").insert({
          patient_id: "00000000-0000-0000-0000-000000000101",
          caregiver_id: updateCaregiverId,
          content: daysAgo === 0
            ? "Margaret was in good spirits today. Completed all morning tasks including shower and medication. Ate a full breakfast. Mentioned her knee pain is slightly better than yesterday."
            : `Day visit completed. Margaret was ${moods[daysAgo]} today. All scheduled tasks completed. Medication taken on time. ${daysAgo <= 2 ? "Knee pain still present but manageable." : "No major concerns."}`,
          mood_observation: moods[daysAgo],
          medication_taken: true,
          concerns: daysAgo <= 2 ? ["Knee pain ongoing"] : [],
          created_at: date.toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Demo data seeded successfully",
      seeded: {
        organization: 1,
        patients: patients.length,
        alerts: alerts.length,
        visits: 4,
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
