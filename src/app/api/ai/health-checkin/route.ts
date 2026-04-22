import { NextRequest, NextResponse } from "next/server";
import { aiChatComplete } from "@/lib/ai/openrouter";
import { buildCheckinSystemPrompt, RISK_SCORING_PROMPT } from "@/lib/ai/prompts";
import { withAuth } from "@/lib/api/with-auth";

// Maximum messages to send as history (prevents unbounded context growth)
const MAX_HISTORY_MESSAGES = 20;

export async function POST(req: NextRequest) {
  return withAuth(req, async (req, _user, _role) => {
    try {
      const body = await req.json();
      const { message, conversationHistory = [], patientContext, previousSummary } = body;

      // Trim conversation history to prevent token overflow
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
        content: message || "Hello, I'm ready for my health check-in.",
      });

      const result = await aiChatComplete("health-checkin", messages);

      let parsed;
      try {
        const cleaned = result.content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          message: result.content,
          isComplete: false,
          currentDomain: "unknown",
          assessedDomains: [],
        };
      }

      return NextResponse.json({ ...parsed, model: result.model });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "AI service error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }, ["patient", "caregiver", "provider_admin"]);
}
