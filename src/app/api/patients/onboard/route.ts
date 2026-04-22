import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai/openrouter";
import { withAuth } from "@/lib/api/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const ONBOARDING_PROMPT = `You are analyzing a patient's initial health consultation conversation for HealioX, an India-focused elder home care platform.

From the conversation, extract a structured patient profile. The patient described their health issues, conditions, and needs.

IMPORTANT: Respond with ONLY a JSON object:
{
  "full_name": "extracted or use 'New Patient' if not mentioned",
  "estimated_age": 75,
  "gender": "male/female/unknown",
  "primary_conditions": ["condition 1", "condition 2"],
  "symptoms_described": ["symptom 1", "symptom 2"],
  "care_needs": ["personal care", "medication management", "mobility support"],
  "risk_level": "low/moderate/high/emergency",
  "initial_risk_score": 65,
  "urgency": "routine/soon/urgent/emergency",
  "summary": "2-3 sentence summary of patient's situation",
  "recommended_visit_frequency": "daily/twice_weekly/weekly"
}`;

export async function POST(req: NextRequest) {
  return withAuth(req, async (req, user, role) => {
    // Only admin roles can onboard new patients
    if (!["provider_admin", "caregiver"].includes(role)) {
      return NextResponse.json({ error: "Only care providers can onboard patients" }, { status: 403 });
    }

    try {
      const {
        conversation, patientName, dateOfBirth, address, phone,
        emergencyContactName, emergencyContactPhone,
      } = await req.json();

      // Resolve the caller's organization
      const supabaseAdmin = createAdminClient();
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      const orgId = profile?.org_id || "00000000-0000-0000-0000-000000000001";

      // AI analysis
      const result = await aiComplete(
        "risk-scoring",
        ONBOARDING_PROMPT,
        `Patient conversation:\n${JSON.stringify(conversation)}\n\nAdditional info: Name: ${patientName || "Not given"}, DOB: ${dateOfBirth || "Not given"}`,
        { temperature: 0.3 }
      );

      let aiProfile;
      try {
        const cleaned = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        aiProfile = JSON.parse(cleaned);
      } catch {
        aiProfile = {
          primary_conditions: [], symptoms_described: [], care_needs: ["general care"],
          risk_level: "moderate", initial_risk_score: 60, urgency: "routine",
          summary: "New patient requiring care assessment.", recommended_visit_frequency: "weekly",
        };
      }

      // Insert patient
      const { data: patient, error } = await supabaseAdmin
        .from("patients")
        .insert({
          full_name: patientName || aiProfile.full_name || "New Patient",
          date_of_birth: dateOfBirth || "1950-01-01",
          address: address || "India",
          phone: phone || null,
          gender: aiProfile.gender || null,
          primary_conditions: aiProfile.primary_conditions || [],
          risk_level: aiProfile.risk_level || "moderate",
          risk_score: aiProfile.initial_risk_score || 60,
          emergency_contact_name: emergencyContactName || null,
          emergency_contact_phone: emergencyContactPhone || null,
          organization_id: orgId,
          metadata: {
            symptoms: aiProfile.symptoms_described,
            care_needs: aiProfile.care_needs,
            urgency: aiProfile.urgency,
            onboarding_summary: aiProfile.summary,
            visit_frequency: aiProfile.recommended_visit_frequency,
          },
        })
        .select()
        .single();

      if (error) {
        console.error("Patient creation error:", error.message);
        return NextResponse.json({ error: "Failed to create patient record" }, { status: 500 });
      }

      // Save initial check-in
      await supabaseAdmin.from("health_checkins").insert({
        patient_id: patient.id,
        conversation,
        risk_score: aiProfile.initial_risk_score || 60,
        risk_level: aiProfile.risk_level || "moderate",
        confidence: 0.7,
        ai_summary: aiProfile.summary,
        flags: aiProfile.symptoms_described || [],
        completed: true,
        completed_at: new Date().toISOString(),
      });

      // Alert if high urgency
      if (["urgent", "emergency"].includes(aiProfile.urgency) ||
          ["high", "emergency"].includes(aiProfile.risk_level)) {
        await supabaseAdmin.from("alerts").insert({
          patient_id: patient.id,
          type: "new_patient",
          severity: aiProfile.risk_level === "emergency" ? "emergency" : "urgent",
          title: `New Patient Requires Attention — ${patientName || "New Patient"}`,
          description: aiProfile.summary,
          status: "active",
        });
      }

      return NextResponse.json({
        patient,
        profile: aiProfile,
        message: "Patient onboarded successfully",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Onboarding failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
