import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp, visitCompletedMessage, ratingRequestMessage } from "@/lib/notifications/twilio";

/**
 * POST /api/caregiver/checkout
 *
 * Called when a caregiver completes a visit. Does three things atomically:
 *  1. Updates the visit row (status, duration, services, notes)
 *  2. Inserts a daily_updates row (family portal shows it via realtime)
 *  3. Fires WhatsApp notifications to linked family members (patient_assignments)
 */
type CheckoutBody = {
  visit_id: string;
  duration_minutes: number;
  services: string[];
  caregiver_notes?: string;
  handover_notes?: string;
  mood_observation?: string;
  daily_update_content?: string;
  medication_taken?: boolean;
  concerns?: string[];
};

export async function POST(req: NextRequest) {
  return withAuth(req, async (req, user, role) => {
    if (!["caregiver", "provider_admin"].includes(role)) {
      return NextResponse.json({ error: "Only caregivers/admins can check out" }, { status: 403 });
    }

    let body: CheckoutBody;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    if (!body.visit_id) {
      return NextResponse.json({ error: "visit_id required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // ── 1. Update visit ────────────────────────────────────────────────
    const combinedNotes = [body.caregiver_notes || "", body.handover_notes ? `\n\n📋 HANDOVER: ${body.handover_notes}` : ""].join("").trim();

    const { data: visit, error: visitError } = await admin
      .from("visits")
      .update({
        status: "completed",
        check_out_time: new Date().toISOString(),
        duration_minutes: body.duration_minutes || 1,
        services: body.services || [],
        caregiver_notes: combinedNotes,
      })
      .eq("id", body.visit_id)
      .select("id, patient_id, caregiver_id, patients(full_name, address, emergency_contact_phone)")
      .single();

    if (visitError || !visit) {
      return NextResponse.json({ error: visitError?.message || "Visit not found" }, { status: 500 });
    }

    const patient = visit.patients as unknown;
    const patientRow = (Array.isArray(patient) ? patient[0] : patient) as { full_name?: string; address?: string; emergency_contact_phone?: string } | null;
    const patientName = patientRow?.full_name || "Patient";

    // ── 2. Insert daily_update (family dashboard picks this up via realtime) ──
    const updateContent = body.daily_update_content
      || `Visit completed. ${body.services.length} service${body.services.length === 1 ? "" : "s"} delivered over ${body.duration_minutes} minutes.`;

    await admin.from("daily_updates").insert({
      patient_id: visit.patient_id,
      caregiver_id: user.id,
      visit_id: visit.id,
      content: updateContent,
      mood_observation: body.mood_observation || null,
      medication_taken: Boolean(body.medication_taken),
      concerns: body.concerns || [],
    });

    // ── 3. Fetch caregiver profile (for name + org) ────────────────────
    const { data: caregiverProfile } = await admin
      .from("profiles")
      .select("full_name, org_id")
      .eq("id", user.id)
      .single();

    const caregiverName = caregiverProfile?.full_name || "Your caregiver";
    const orgId = caregiverProfile?.org_id;

    // ── 4. Find linked family members and WhatsApp them ────────────────
    const { data: assignments } = await admin
      .from("patient_assignments")
      .select("profile_id, profiles(phone, full_name)")
      .eq("patient_id", visit.patient_id)
      .neq("profile_id", user.id); // don't notify the caregiver themselves

    const origin = req.nextUrl.origin;
    const notificationResults: { to: string; ok: boolean }[] = [];

    for (const a of assignments || []) {
      const profile = a.profiles as unknown;
      const prof = (Array.isArray(profile) ? profile[0] : profile) as { phone?: string; full_name?: string } | null;
      const phone = prof?.phone;
      if (!phone) continue;

      const msg = visitCompletedMessage({
        patientName,
        caregiverName,
        duration: body.duration_minutes,
        servicesCount: body.services.length,
        moodObservation: body.mood_observation,
        notes: body.caregiver_notes,
        portalUrl: `${origin}/dashboard`,
      });

      const result = await sendWhatsApp({
        to: phone,
        body: msg,
        template: "visit_completed",
        orgId: orgId || undefined,
        patientId: visit.patient_id,
        visitId: visit.id,
      });

      notificationResults.push({ to: phone, ok: result.ok });

      // Also send a rating request (separate message)
      await sendWhatsApp({
        to: phone,
        body: ratingRequestMessage({
          patientName,
          caregiverName,
          ratingUrl: `${origin}/dashboard/rate?caregiver=${user.id}&visit=${visit.id}`,
        }),
        template: "rating_request",
        orgId: orgId || undefined,
        patientId: visit.patient_id,
        visitId: visit.id,
      });
    }

    // ── 5. Also WhatsApp the emergency contact if no family profile exists ──
    if ((assignments?.length || 0) === 0 && patientRow?.emergency_contact_phone) {
      await sendWhatsApp({
        to: patientRow.emergency_contact_phone,
        body: visitCompletedMessage({
          patientName,
          caregiverName,
          duration: body.duration_minutes,
          servicesCount: body.services.length,
          moodObservation: body.mood_observation,
          notes: body.caregiver_notes,
          portalUrl: `${origin}/dashboard`,
        }),
        template: "visit_completed",
        orgId: orgId || undefined,
        patientId: visit.patient_id,
        visitId: visit.id,
      });
    }

    return NextResponse.json({
      visit_id: visit.id,
      notifications_sent: notificationResults.length,
      message: "Checkout complete",
    });
  });
}
