import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai/openrouter";
import { createClient } from "@supabase/supabase-js";

const ONBOARDING_PROMPT = `You are analyzing a patient's initial health consultation conversation for HealioX, an Australian aged care platform.

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
  try {
    const { conversation, patientName, dateOfBirth, address, phone, emergencyContactName, emergencyContactPhone } = await req.json();

    // Analyze conversation to extract care profile
    const result = await aiComplete(
      "risk-scoring",
      ONBOARDING_PROMPT,
      `Patient conversation:\n${JSON.stringify(conversation)}\n\nAdditional info provided: Name: ${patientName || "Not given"}, DOB: ${dateOfBirth || "Not given"}`,
      { temperature: 0.3 }
    );

    let profile;
    try {
      const cleaned = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      profile = JSON.parse(cleaned);
    } catch {
      profile = {
        primary_conditions: [],
        symptoms_described: [],
        care_needs: ["general care"],
        risk_level: "moderate",
        initial_risk_score: 60,
        urgency: "routine",
        summary: "New patient requiring care assessment.",
        recommended_visit_frequency: "weekly",
      };
    }

    // Save patient to Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: patient, error } = await supabase.from("patients").insert({
      full_name: patientName || profile.full_name || "New Patient",
      date_of_birth: dateOfBirth || "1950-01-01",
      address: address || "Perth, WA",
      phone: phone || null,
      gender: profile.gender || null,
      primary_conditions: profile.primary_conditions || [],
      risk_level: profile.risk_level || "moderate",
      risk_score: profile.initial_risk_score || 60,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_phone: emergencyContactPhone || null,
      organization_id: "00000000-0000-0000-0000-000000000001",
      metadata: {
        symptoms: profile.symptoms_described,
        care_needs: profile.care_needs,
        urgency: profile.urgency,
        onboarding_summary: profile.summary,
        visit_frequency: profile.recommended_visit_frequency,
      },
    }).select().single();

    if (error) {
      console.error("Patient creation error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Save initial health check-in from onboarding conversation
    await supabase.from("health_checkins").insert({
      patient_id: patient.id,
      conversation,
      risk_score: profile.initial_risk_score || 60,
      risk_level: profile.risk_level || "moderate",
      confidence: 0.7,
      ai_summary: profile.summary,
      flags: profile.symptoms_described || [],
      completed: true,
      completed_at: new Date().toISOString(),
    });

    // Create an alert if urgency is high
    if (profile.urgency === "urgent" || profile.urgency === "emergency" || profile.risk_level === "high" || profile.risk_level === "emergency") {
      await supabase.from("alerts").insert({
        patient_id: patient.id,
        type: "new_patient",
        severity: profile.risk_level === "emergency" ? "emergency" : "urgent",
        title: `New Patient Requires Attention — ${patientName || "New Patient"}`,
        description: profile.summary,
        status: "active",
      });
    }

    return NextResponse.json({
      patient,
      profile,
      message: "Patient onboarded successfully",
    });
  } catch (error: unknown) {
    console.error("Onboarding error:", error);
    const message = error instanceof Error ? error.message : "Onboarding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
