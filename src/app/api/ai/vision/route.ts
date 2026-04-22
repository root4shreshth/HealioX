import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withAuth } from "@/lib/api/with-auth";

function getOpenRouter() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "missing",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "HealioX Care Intelligence",
    },
  });
}

const SYSTEM_PROMPT = `You are a caring health assistant for HealioX, an India-focused elder home care platform. A patient has shared an image during their health check-in. Describe what you observe in the image that might be relevant to their health. Be warm, simple, and non-alarming. Do NOT diagnose — only observe and suggest they discuss with their care team if needed.

IMPORTANT: Respond with ONLY a JSON object:
{"observation": "what you see in the image", "healthRelevance": "how it might relate to their health", "followUpQuestion": "a caring follow-up question to ask"}`;

export async function POST(req: NextRequest) {
  return withAuth(req, async (req) => {
    try {
      const { imageBase64, conversationContext } = await req.json();

      if (!imageBase64 || typeof imageBase64 !== "string") {
        return NextResponse.json({ error: "No image provided" }, { status: 400 });
      }

      // Basic size guard — base64 of a 5MB image ≈ 6.67MB string
      if (imageBase64.length > 7_000_000) {
        return NextResponse.json({ error: "Image too large. Max 5MB." }, { status: 413 });
      }

      const response = await getOpenRouter().chat.completions.create({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\nContext from the conversation so far: ${conversationContext || "No prior context"}`,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageBase64 } },
              { type: "text", text: "I want to show you this. What do you notice?" },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.5,
      });

      const content = response.choices[0]?.message?.content || "";

      let parsed;
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          observation: content,
          healthRelevance: "I've noted what you've shown me.",
          followUpQuestion: "Can you tell me more about what you're experiencing?",
        };
      }

      return NextResponse.json(parsed);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Vision analysis failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }, ["patient", "caregiver", "provider_admin"]);
}
