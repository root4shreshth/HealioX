import OpenAI from "openai";

// Lazy-initialize to avoid build-time crash when env vars aren't set
let _openrouter: OpenAI | null = null;
function getClient() {
  if (!_openrouter) {
    _openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "missing",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "HealioX Care Intelligence",
      },
    });
  }
  return _openrouter;
}

// Model config per task — free models first, paid fallback
const MODEL_CONFIG = {
  "health-checkin": {
    primary: "meta-llama/llama-4-scout",
    fallback: "google/gemini-2.0-flash-exp:free",
  },
  "risk-scoring": {
    primary: "meta-llama/llama-4-scout",
    fallback: "google/gemini-2.0-flash-exp:free",
  },
  "trend-analysis": {
    primary: "google/gemini-2.0-flash-exp:free",
    fallback: "meta-llama/llama-4-scout",
  },
  summary: {
    primary: "google/gemini-2.0-flash-exp:free",
    fallback: "meta-llama/llama-4-scout",
  },
} as const;

type TaskType = keyof typeof MODEL_CONFIG;

export async function aiComplete(
  taskType: TaskType,
  systemPrompt: string,
  userMessage: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    forceModel?: string;
  }
) {
  const config = MODEL_CONFIG[taskType];
  const model = options?.forceModel || config.primary;

  try {
    const response = await getClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      model: response.model,
      usage: response.usage,
    };
  } catch (error) {
    // Fallback to secondary model
    if (model !== config.fallback) {
      console.warn(`Primary model failed for ${taskType}, falling back...`);
      return aiComplete(taskType, systemPrompt, userMessage, {
        ...options,
        forceModel: config.fallback,
      });
    }
    throw error;
  }
}

export async function aiChatComplete(
  taskType: TaskType,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { temperature?: number; maxTokens?: number }
) {
  const config = MODEL_CONFIG[taskType];

  try {
    const response = await getClient().chat.completions.create({
      model: config.primary,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 512,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      model: response.model,
    };
  } catch (error) {
    // Fallback
    const response = await getClient().chat.completions.create({
      model: config.fallback,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 512,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      model: response.model,
    };
  }
}
