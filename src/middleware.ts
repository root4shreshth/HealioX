import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require a logged-in user
const PROTECTED = ["/dashboard", "/caregiver", "/patient", "/admin"];
// Auth routes (unauthenticated only)
const AUTH_ROUTES = ["/login", "/register"];

// Which roles can access which route prefixes
const ROLE_ROUTES: Record<string, string[]> = {
  caregiver:     ["/caregiver", "/patient/checkin"],
  patient:       ["/patient"],
  family:        ["/dashboard"],
  provider_admin:["/dashboard", "/caregiver", "/patient", "/admin"],
  government:    ["/dashboard", "/admin"],
};

function resolveRole(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }): string {
  return (
    (user.app_metadata?.role as string) ||
    (user.user_metadata?.role as string) ||
    "family"
  );
}

function roleCanAccess(role: string, pathname: string): boolean {
  const allowed = ROLE_ROUTES[role] || [];
  return allowed.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // 1. Not logged in + protected route → login
  if (!user && PROTECTED.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2. Logged in + protected route → check role has access
  if (user && PROTECTED.some((r) => pathname.startsWith(r))) {
    const role = resolveRole(user);
    if (!roleCanAccess(role, pathname)) {
      // Redirect to their correct home rather than an error
      const home = getHomeForRole(role);
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
  }

  // 3. Logged in + auth route → redirect to their home
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const role = resolveRole(user);
    const url = request.nextUrl.clone();
    url.pathname = getHomeForRole(role);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

function getHomeForRole(role: string): string {
  switch (role) {
    case "caregiver":     return "/caregiver";
    case "patient":       return "/patient";
    case "provider_admin":return "/admin";
    case "government":    return "/admin";
    default:              return "/dashboard";
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
