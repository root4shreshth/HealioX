import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export type AuthedHandler = (
  req: NextRequest,
  user: User,
  role: string
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with auth + optional role check.
 *
 * Usage:
 *   export function POST(req: NextRequest) {
 *     return withAuth(req, handler, ["caregiver", "provider_admin"]);
 *   }
 */
export async function withAuth(
  req: NextRequest,
  handler: AuthedHandler,
  allowedRoles?: string[]
): Promise<NextResponse> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* read-only in middleware */ }
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve role: JWT app_metadata (fastest) → user_metadata → DB
  const role: string =
    (user.app_metadata?.role as string) ||
    (user.user_metadata?.role as string) ||
    "family";

  if (allowedRoles && !allowedRoles.includes(role)) {
    return NextResponse.json(
      { error: `Forbidden. Required role: ${allowedRoles.join(" | ")}` },
      { status: 403 }
    );
  }

  return handler(req, user, role);
}

/**
 * Guards against calling /api/seed in production.
 */
export function rejectInProduction(): NextResponse | null {
  // Allow seed in production when DEMO_MODE is enabled (hackathon / pitch deploys).
  // Otherwise block to prevent accidental data overwrites.
  const demo = process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (process.env.NODE_ENV === "production" && !demo) {
    return NextResponse.json(
      { error: "Seed endpoint disabled in production (set DEMO_MODE=true to allow)" },
      { status: 403 }
    );
  }
  return null;
}
