import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withAdmin } from "@/lib/api/admin-guard";

/**
 * POST /api/admin/caregivers/extract-id
 * Body: { docType: "aadhaar" | "degree", imageBase64: string }
 *
 * Sends the document image to a multimodal model and asks it to return
 * a STRICT JSON object with the extracted fields. Used by the admin
 * "Add Caregiver" wizard to auto-fill the profile from uploaded docs.
 */

function getOpenRouter() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "missing",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "AayuCare Caregiver Verification",
    },
  });
}

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
  // Strip ```json fences and stray prose
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Find the first {...} balanced block
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("no JSON object found");
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }
  throw new Error("unbalanced JSON");
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
      // Reject anything > ~7 MB base64 (≈5 MB binary)
      if (imageBase64.length > 7_000_000) {
        return NextResponse.json({ error: "Image too large. Max 5 MB." }, { status: 413 });
      }
      // Must be a data: URL or raw base64 — normalise to data: URL for the API
      const dataUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      const systemPrompt = docType === "aadhaar" ? AADHAAR_PROMPT : DEGREE_PROMPT;

      const response = await getOpenRouter().chat.completions.create({
        model: "google/gemini-2.0-flash-exp:free",
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

      const raw = response.choices[0]?.message?.content || "";

      let extracted: Record<string, unknown>;
      try {
        extracted = extractJson(raw) as Record<string, unknown>;
      } catch {
        return NextResponse.json(
          { error: "AI did not return valid JSON. Try a clearer photo.", raw },
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
      } else {
        if (extracted.yearOfPassing) {
          const y = parseInt(String(extracted.yearOfPassing), 10);
          extracted.yearOfPassing = y >= 1950 && y <= new Date().getFullYear() + 1 ? y : null;
        }
      }

      return NextResponse.json({
        docType,
        extracted,
        modelUsed: response.model,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Extraction failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
