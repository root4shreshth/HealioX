import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/health
 * Returns system health. Used by monitoring tools (UptimeRobot, Vercel, etc.)
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, string> = {};

  // Check DB connectivity
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.from("organizations").select("id").limit(1);
    checks.database = error ? `error: ${error.message}` : "ok";
  } catch {
    checks.database = "unreachable";
  }

  // Check AI key presence (not validity — calling the model costs money)
  checks.ai = process.env.OPENROUTER_API_KEY ? "configured" : "missing";

  const healthy = checks.database === "ok";
  const latencyMs = Date.now() - start;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      latency_ms: latencyMs,
      checks,
      version: process.env.npm_package_version || "1.0.0",
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
