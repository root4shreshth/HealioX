import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, conversationContext } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const response = await getOpenRouter().chat.completions.create({
      model: "google/gemini-2.0-flash-exp:free", // Free vision-capable model
      messages: [
        {
          role: "system",
          content: `You are a caring health assistant for HealioX, an aged care platform. A patient has shared an image during their health check-in. Describe what you observe in the image that might be relevant to their health. Be warm, simple, and non-alarming. Do NOT diagnose — only observe and suggest they discuss with their care team if needed.

Context from the conversation so far: ${conversationContext || "No prior context"}

IMPORTANT: Respond with ONLY a JSON object:
{"observation": "what you see in the image", "healthRelevance": "how it might relate to their health", "followUpQuestion": "a caring follow-up question to ask"}`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
            {
              type: "text",
              text: "I want to show you this. What do you notice?",
            },
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
    console.error("Vision error:", error);
    const message = error instanceof Error ? error.message : "Vision analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
