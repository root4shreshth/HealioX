import { NextRequest, NextResponse } from "next/server";
import { aiChatComplete } from "@/lib/ai/openrouter";
import { buildCheckinSystemPrompt } from "@/lib/ai/prompts";
import { withAuth } from "@/lib/api/with-auth";

const MAX_HISTORY_MESSAGES = 20;

/** Robustly extract first complete JSON object from any AI response */
function extractJson(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const text = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  try { return JSON.parse(text); } catch { /* continue */ }

  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = firstBrace; i < text.length; i++) {
    const c = text[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.substring(firstBrace, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

/** Strip any JSON-ish fragments from plain text so user never sees raw JSON */
function stripJsonFromText(text: string): string {
  return text
    .replace(/```json[\s\S]*?```/gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\{[\s\S]*?"message"[\s\S]*?\}/g, "")
    .replace(/[{}"]/g, "") // last-resort fallback
    .trim();
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (req, _user, _role) => {
    try {
      const body = await req.json();
      const { message, conversationHistory = [], patientContext, previousSummary } = body;

      const trimmedHistory = Array.isArray(conversationHistory)
        ? conversationHistory.slice(-MAX_HISTORY_MESSAGES)
        : [];

      const systemPrompt = buildCheckinSystemPrompt(patientContext, previousSummary);

      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
      ];
      for (const msg of trimmedHistory) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: String(msg.content || ""),
        });
      }
      messages.push({
        role: "user",
        content: message || "Please start with a warm, brief greeting.",
      });

      const result = await aiChatComplete("health-checkin", messages, { temperature: 0.75 });

      // ── Robust JSON extraction ─────────────────────────────────────────
      const parsed = extractJson(result.content);

      let responseMessage = "";
      let isComplete = false;
      let currentDomain = "mood";
      let assessedDomains: string[] = [];
      let suggestCamera = false;

      if (parsed && typeof parsed === "object") {
        responseMessage = String(parsed.message || "").trim();
        isComplete = Boolean(parsed.isComplete);
        currentDomain = String(parsed.currentDomain || "mood");
        assessedDomains = Array.isArray(parsed.assessedDomains)
          ? parsed.assessedDomains.map(String)
          : [];
        suggestCamera = Boolean(parsed.suggestCamera);
      }

      // Fallback: AI returned plain text — strip JSON-ish fragments and use it
      if (!responseMessage) {
        responseMessage = stripJsonFromText(result.content);
      }

      if (!responseMessage) {
        responseMessage = "Could you tell me a bit more about how you're feeling?";
      }

      return NextResponse.json({
        message: responseMessage,
        isComplete,
        currentDomain,
        assessedDomains,
        suggestCamera,
        model: result.model,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "AI service error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }, ["patient", "caregiver", "provider_admin"]);
}
