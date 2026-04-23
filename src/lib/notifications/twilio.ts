/**
 * Twilio WhatsApp helper — no SDK required. Uses Twilio REST API directly
 * so we don't bloat the bundle.
 *
 * Setup (free sandbox):
 *  1. Create a Twilio account (free trial)
 *  2. Go to Messaging → Try it out → Send a WhatsApp message
 *  3. Join the sandbox by sending "join <your-code>" to +14155238886 from WhatsApp
 *  4. Set env vars:
 *     TWILIO_ACCOUNT_SID=ACxxxx
 *     TWILIO_AUTH_TOKEN=xxxx
 *     TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
 *
 * Production: replace the sandbox number with your approved WhatsApp Business
 * number. The API call is identical.
 */

import { createAdminClient } from "@/lib/supabase/admin";

type SendOptions = {
  to: string;                   // "+919810012345" (without 'whatsapp:' prefix)
  body: string;                 // plain text message
  template?: string;            // logical template name for logging
  orgId?: string;
  patientId?: string;
  visitId?: string;
};

type SendResult = {
  ok: boolean;
  sid?: string;
  error?: string;
};

function normalizePhone(num: string): string {
  // Strip spaces, dashes, parens. Keep leading +.
  const cleaned = num.replace(/[^\d+]/g, "");
  // Default to India country code if just 10 digits
  if (/^\d{10}$/.test(cleaned)) return `+91${cleaned}`;
  if (!cleaned.startsWith("+")) return `+${cleaned}`;
  return cleaned;
}

/**
 * Send a WhatsApp message via Twilio. Logs to notifications_log table.
 * In dev without Twilio creds, logs to console and returns ok:true (so
 * checkout flows don't break in local/test).
 */
export async function sendWhatsApp(opts: SendOptions): Promise<SendResult> {
  const {
    TWILIO_ACCOUNT_SID: sid,
    TWILIO_AUTH_TOKEN: token,
    TWILIO_WHATSAPP_FROM: from,
  } = process.env;

  const to = normalizePhone(opts.to);
  const fromWa = from || "whatsapp:+14155238886"; // sandbox default

  // No creds configured — log and pretend success (dev mode)
  if (!sid || !token) {
    console.log(`[WhatsApp DEV MODE] To ${to}: ${opts.body}`);
    await logNotification({
      ...opts,
      to_address: to,
      status: "sent",
      provider_id: "dev-mode",
    });
    return { ok: true, sid: "dev-mode" };
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

    const form = new URLSearchParams();
    form.append("From", fromWa);
    form.append("To", `whatsapp:${to}`);
    form.append("Body", opts.body);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      await logNotification({
        ...opts,
        to_address: to,
        status: "failed",
        error: data.message || `HTTP ${res.status}`,
      });
      return { ok: false, error: data.message || `Twilio error ${res.status}` };
    }

    await logNotification({
      ...opts,
      to_address: to,
      status: "sent",
      provider_id: data.sid,
    });
    return { ok: true, sid: data.sid };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    await logNotification({
      ...opts,
      to_address: to,
      status: "failed",
      error: msg,
    });
    return { ok: false, error: msg };
  }
}

/** Fire-and-forget insert into notifications_log */
async function logNotification(params: {
  to_address: string;
  body?: string;
  template?: string;
  status: string;
  provider_id?: string;
  error?: string;
  orgId?: string;
  patientId?: string;
  visitId?: string;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications_log").insert({
      org_id: params.orgId || null,
      channel: "whatsapp",
      to_address: params.to_address,
      template: params.template || null,
      payload: { body: params.body?.slice(0, 500) },
      status: params.status,
      provider_id: params.provider_id || null,
      error: params.error || null,
      patient_id: params.patientId || null,
      visit_id: params.visitId || null,
    });
  } catch {
    /* best effort */
  }
}

// ── Message templates ────────────────────────────────────────────────────────

export function visitCompletedMessage(opts: {
  patientName: string;
  caregiverName: string;
  duration: number;
  servicesCount: number;
  moodObservation?: string;
  notes?: string;
  portalUrl?: string;
}): string {
  const lines = [
    `🏥 *HealioX care visit completed*`,
    ``,
    `👤 Patient: *${opts.patientName}*`,
    `👨‍⚕️ Caregiver: ${opts.caregiverName}`,
    `⏱️ Duration: ${opts.duration} min`,
    `✅ Services delivered: ${opts.servicesCount}`,
  ];
  if (opts.moodObservation) lines.push(`😊 Mood: ${opts.moodObservation}`);
  if (opts.notes) {
    const short = opts.notes.length > 200 ? opts.notes.slice(0, 197) + "..." : opts.notes;
    lines.push(``, `📝 Caregiver notes:`, short);
  }
  lines.push(``, `📊 See full details: ${opts.portalUrl || "your HealioX dashboard"}`);
  return lines.join("\n");
}

export function sosAlertMessage(opts: {
  patientName: string;
  address?: string;
  timestamp?: string;
}): string {
  return [
    `🆘 *EMERGENCY SOS*`,
    ``,
    `${opts.patientName} has pressed the emergency SOS button.`,
    opts.address ? `📍 Location: ${opts.address}` : ``,
    opts.timestamp ? `🕐 Time: ${opts.timestamp}` : ``,
    ``,
    `Please check on them immediately or call emergency services.`,
  ].filter(Boolean).join("\n");
}

export function missedVisitMessage(opts: {
  patientName: string;
  scheduledTime: string;
}): string {
  return [
    `⚠️ *Missed visit alert*`,
    ``,
    `The scheduled visit for *${opts.patientName}* at ${opts.scheduledTime} has not started yet.`,
    `The care agency has been notified.`,
  ].join("\n");
}

export function ratingRequestMessage(opts: {
  patientName: string;
  caregiverName: string;
  ratingUrl: string;
}): string {
  return [
    `⭐ *How was today's care?*`,
    ``,
    `Please rate ${opts.caregiverName}'s visit with ${opts.patientName}:`,
    opts.ratingUrl,
    ``,
    `Your feedback helps us improve care quality.`,
  ].join("\n");
}
