import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED   = ["/dashboard", "/caregiver", "/patient", "/admin"];
const AUTH_ROUTES = ["/login", "/register"];

const ROLE_ROUTES: Record<string, string[]> = {
  caregiver:      ["/caregiver", "/patient/checkin"],
  patient:        ["/patient"],
  family:         ["/dashboard"],
  provider_admin: ["/dashboard", "/caregiver", "/patient", "/admin"],
  government:     ["/dashboard", "/admin"],
};

function roleCanAccess(role: string, pathname: string) {
  return (ROLE_ROUTES[role] || []).some((p) => pathname.startsWith(p));
}

function homeForRole(role: string) {
  switch (role) {
    case "caregiver":      return "/caregiver";
    case "patient":        return "/patient";
    case "provider_admin":
    case "government":     return "/admin";
    default:               return "/dashboard";
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Fast-path: if the route isn't protected or auth-only, skip all auth work
  const isProtected  = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthRoute  = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  if (!isProtected && !isAuthRoute) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()        { return request.cookies.getAll(); },
        setAll(toSet)   {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── Use getSession() not getUser() ────────────────────────────────────────
  // getSession() decodes the JWT from the cookie locally — zero network call.
  // getUser() hits the Supabase Auth server on every request, adding ~200ms.
  // JWTs are cryptographically signed so they can't be forged; local decode
  // is safe for route-guarding. Only API route handlers that perform sensitive
  // writes need the extra server validation of getUser().
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  // Role lives in user_metadata (set at signup) and/or app_metadata (custom JWT claim)
  const role: string =
    (user?.app_metadata?.role as string) ||
    (user?.user_metadata?.role as string) ||
    "family";

  // 1. Not logged in → login
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2. Logged in + wrong portal → redirect to their home
  if (user && isProtected && !roleCanAccess(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole(role);
    return NextResponse.redirect(url);
  }

  // 3. Logged in visiting /login or /register → send home
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole(role);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
