import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai/openrouter";
import { RISK_SCORING_PROMPT } from "@/lib/ai/prompts";
import { withAuth } from "@/lib/api/with-auth";

export async function POST(req: NextRequest) {
  return withAuth(req, async (req) => {
    try {
      const body = await req.json();
      const { conversation, patientConditions, previousScore, previousLevel } = body;

      const contextMessage = `
CONVERSATION:
${JSON.stringify(Array.isArray(conversation) ? conversation.slice(-20) : [], null, 2)}

PATIENT HISTORY:
- Conditions: ${Array.isArray(patientConditions) ? patientConditions.join(", ") : "Unknown"}
- Previous risk score: ${previousScore ?? "N/A"}
- Previous risk level: ${previousLevel ?? "N/A"}

Analyze the conversation and produce the risk assessment JSON.`;

      const result = await aiComplete("risk-scoring", RISK_SCORING_PROMPT, contextMessage, {
        temperature: 0.3,
        maxTokens: 1024,
      });

      let parsed;
      try {
        const cleaned = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          risk_score: 65, risk_level: "moderate", confidence: 0.5,
          domains: {}, flags: [],
          summary: "Unable to fully analyze. Manual review recommended.",
          recommended_actions: ["Schedule manual health assessment"],
        };
      }

      return NextResponse.json({ ...parsed, model: result.model });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "AI service error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }, ["patient", "caregiver", "provider_admin"]);
}
