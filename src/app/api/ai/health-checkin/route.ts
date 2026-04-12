import { NextRequest, NextResponse } from "next/server";
import { aiChatComplete } from "@/lib/ai/openrouter";
import { buildCheckinSystemPrompt, RISK_SCORING_PROMPT } from "@/lib/ai/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, conversationHistory = [], patientContext, previousSummary } = body;

    const systemPrompt = buildCheckinSystemPrompt(patientContext, previousSummary);

    // Build messages array
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }

    // Add current user message (if not first message)
    if (message) {
      messages.push({ role: "user", content: message });
    } else {
      // First message - just trigger the greeting
      messages.push({ role: "user", content: "Hello, I'm ready for my health check-in." });
    }

    const result = await aiChatComplete("health-checkin", messages);

    // Try to parse JSON from the AI response
    let parsed;
    try {
      // Clean potential markdown code fences
      const cleaned = result.content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, wrap the raw text
      parsed = {
        message: result.content,
        isComplete: false,
        currentDomain: "unknown",
        assessedDomains: [],
      };
    }

    return NextResponse.json({
      ...parsed,
      model: result.model,
    });
  } catch (error: unknown) {
    console.error("Health check-in error:", error);
    const message = error instanceof Error ? error.message : "AI service error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
