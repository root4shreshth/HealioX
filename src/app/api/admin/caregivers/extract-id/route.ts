import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/admin-guard";

/**
 * POST /api/admin/caregivers/extract-id
 * Body: { docType: "aadhaar" | "degree", imageBase64: string }
 *
 * Sends the document image to Anthropic Claude (vision-capable Sonnet) and
 * asks it to return a STRICT JSON object with the extracted fields. Used
 * by the admin "Add Caregiver" wizard to auto-fill the profile from
 * uploaded documents.
 *
 * Falls back to OpenRouter (Gemini Flash / Llama 4 Vision) if the Anthropic
 * key is missing — keeps the dev environment usable without secrets.
 */

const CLAUDE_MODEL = "claude-sonnet-4-5"; // multimodal, fast, accurate
const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_VERSION = "2023-06-01";

const AADHAAR_PROMPT = `You are a document understanding model. The image shows an Indian Aadhaar card (front side, back side, or combined).

Extract the following fields. If a field is not clearly visible or you are not confident, set it to null. Do NOT invent data.

Return ONLY a valid JSON object — no markdown fences, no commentary.

Schema:
{
  "fullName": string|null,            // exactly as printed
  "aadhaarNumber": string|null,       // 12 digits, no spaces
  "dateOfBirth": string|null,         // ISO YYYY-MM-DD; if only year-of-birth printed, use YYYY-01-01
  "gender": "male"|"female"|"other"|null,
  "address": string|null,             // full single-line address
  "documentType": "aadhaar",
  "confidence": number                // 0-1, how confident you are in the overall extraction
}`;

const DEGREE_PROMPT = `You are a document understanding model. The image shows an Indian academic degree certificate, diploma, or nursing/caregiver qualification certificate.

Extract the following fields. If a field is not visible or you are unsure, set it to null. Do NOT invent data.

Return ONLY a valid JSON object — no markdown fences, no commentary.

Schema:
{
  "holderName": string|null,           // name of the certificate holder
  "qualification": string|null,        // e.g. "BSc Nursing", "GNM", "ANM", "Diploma in Geriatric Care"
  "institution": string|null,          // college/university/board name
  "yearOfPassing": number|null,        // 4-digit year
  "rollOrCertificateNumber": string|null,
  "specialization": string|null,       // e.g. "Geriatric Care", "Palliative", null if general
  "documentType": "degree",
  "confidence": number                 // 0-1
}`;

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("no JSON object found");
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
    }
  }
  throw new Error("unbalanced JSON");
}

function parseDataUrl(dataUrl: string): { mediaType: string; base64: string } {
  // data:image/jpeg;base64,XXX
  const m = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (m) return { mediaType: m[1], base64: m[2] };
  // raw base64 fallback — assume jpeg
  return { mediaType: "image/jpeg", base64: dataUrl };
}

async function extractWithClaude(systemPrompt: string, dataUrl: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const { mediaType, base64 } = parseDataUrl(dataUrl);

  const res = await fetch(CLAUDE_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": CLAUDE_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: "Extract the fields per the schema. Return JSON only.",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const body = await res.json();
  // Claude returns { content: [{ type: "text", text: "..." }, ...] }
  const textBlock = (body.content || []).find((b: { type: string }) => b.type === "text");
  return {
    raw: textBlock?.text || "",
    model: body.model || CLAUDE_MODEL,
  };
}

async function extractWithOpenRouter(systemPrompt: string, dataUrl: string) {
  // Lazy import — avoid pulling the openai SDK if Claude path is taken
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "missing",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "AayuCare Caregiver Verification",
    },
  });

  // Try a list of multimodal models — first one that works wins
  const candidates = [
    "anthropic/claude-sonnet-4-5",
    "google/gemini-2.5-flash",
    "google/gemini-2.0-flash-001",
    "meta-llama/llama-4-scout",
  ];

  let lastErr: unknown = null;
  for (const model of candidates) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              { type: "text", text: "Extract the fields per the schema. Return JSON only." },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.1,
      });
      return {
        raw: response.choices[0]?.message?.content || "",
        model: response.model,
      };
    } catch (err) {
      lastErr = err;
      // Try next candidate
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("all OpenRouter models failed");
}

export async function POST(req: NextRequest) {
  return withAdmin(req, async (req) => {
    try {
      const { docType, imageBase64 } = await req.json();

      if (docType !== "aadhaar" && docType !== "degree") {
        return NextResponse.json({ error: "docType must be 'aadhaar' or 'degree'" }, { status: 400 });
      }
      if (!imageBase64 || typeof imageBase64 !== "string") {
        return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
      }
      if (imageBase64.length > 7_000_000) {
        return NextResponse.json({ error: "Image too large. Max 5 MB." }, { status: 413 });
      }

      const dataUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      const systemPrompt = docType === "aadhaar" ? AADHAAR_PROMPT : DEGREE_PROMPT;

      // Prefer Claude direct → fall back to OpenRouter → final error
      let result: { raw: string; model: string };
      try {
        result = await extractWithClaude(systemPrompt, dataUrl);
      } catch (claudeErr) {
        const claudeMsg = claudeErr instanceof Error ? claudeErr.message : "claude failed";
        console.warn("[extract-id] Claude failed, trying OpenRouter:", claudeMsg);
        try {
          result = await extractWithOpenRouter(systemPrompt, dataUrl);
        } catch (orErr) {
          const orMsg = orErr instanceof Error ? orErr.message : "openrouter failed";
          return NextResponse.json(
            { error: `All AI providers failed. Claude: ${claudeMsg}. OpenRouter: ${orMsg}` },
            { status: 502 }
          );
        }
      }

      let extracted: Record<string, unknown>;
      try {
        extracted = extractJson(result.raw) as Record<string, unknown>;
      } catch {
        return NextResponse.json(
          { error: "AI did not return valid JSON. Try a clearer photo.", raw: result.raw },
          { status: 502 }
        );
      }

      // Server-side sanitisation — never trust an LLM blindly
      if (docType === "aadhaar") {
        const aad = (extracted.aadhaarNumber as string | null) || null;
        if (aad) {
          const digits = aad.replace(/\D/g, "");
          extracted.aadhaarNumber = digits.length === 12 ? digits : null;
        }
        if (extracted.gender) {
          const g = String(extracted.gender).toLowerCase();
          extracted.gender = ["male", "female", "other"].includes(g) ? g : null;
        }
      } else if (extracted.yearOfPassing) {
        const y = parseInt(String(extracted.yearOfPassing), 10);
        extracted.yearOfPassing = y >= 1950 && y <= new Date().getFullYear() + 1 ? y : null;
      }

      return NextResponse.json({
        docType,
        extracted,
        modelUsed: result.model,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Extraction failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
