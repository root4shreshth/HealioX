import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Auto-assigns a caregiver to a patient and creates a scheduled visit
export async function POST(req: NextRequest) {
  try {
    const { patientId } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get patient details
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Find available caregivers (any caregiver in the same org, or any caregiver)
    const { data: caregivers } = await supabase
      .from("profiles")
      .select("id, full_name, organization_id")
      .eq("role", "caregiver")
      .eq("is_active", true)
      .limit(5);

    let caregiverId: string;
    let caregiverName: string;

    if (caregivers && caregivers.length > 0) {
      // Pick the first available caregiver (in production: consider workload, location, skills)
      const assigned = caregivers[0];
      caregiverId = assigned.id;
      caregiverName = assigned.full_name;
    } else {
      // No caregivers registered yet — create a system placeholder
      // This ensures the workflow works even before a caregiver signs up
      const placeholderId = "00000000-0000-0000-0000-000000000099";
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: placeholderId,
        role: "caregiver",
        full_name: "Pending Assignment",
        email: "unassigned@healiox.system",
        organization_id: patient.organization_id || "00000000-0000-0000-0000-000000000001",
      });
      if (profileError) console.error("Placeholder error:", profileError);
      caregiverId = placeholderId;
      caregiverName = "Pending Assignment";
    }

    // Create patient assignment
    await supabase.from("patient_assignments").upsert({
      patient_id: patientId,
      profile_id: caregiverId,
      relationship: "caregiver",
      is_primary: true,
    });

    // Schedule a visit for tomorrow (or today if urgent)
    const visitDate = new Date();
    const metadata = patient.metadata as Record<string, unknown> | null;
    const urgency = (metadata?.urgency as string) || "routine";

    if (urgency === "urgent" || urgency === "emergency") {
      // Today — next available slot
      visitDate.setHours(visitDate.getHours() + 2);
    } else {
      // Tomorrow morning
      visitDate.setDate(visitDate.getDate() + 1);
      visitDate.setHours(9, 0, 0, 0);
    }

    const visitEnd = new Date(visitDate);
    visitEnd.setHours(visitEnd.getHours() + 1);

    const { data: visit, error: visitError } = await supabase.from("visits").insert({
      patient_id: patientId,
      caregiver_id: caregiverId,
      organization_id: patient.organization_id || "00000000-0000-0000-0000-000000000001",
      scheduled_start: visitDate.toISOString(),
      scheduled_end: visitEnd.toISOString(),
      status: "scheduled",
    }).select().single();

    if (visitError) {
      console.error("Visit creation error:", visitError);
    }

    return NextResponse.json({
      assignment: {
        caregiverId,
        caregiverName,
        patientId,
        patientName: patient.full_name,
      },
      visit,
      message: `${patient.full_name} assigned to ${caregiverName}. Visit scheduled.`,
    });
  } catch (error: unknown) {
    console.error("Assignment error:", error);
    const message = error instanceof Error ? error.message : "Assignment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
