"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HeartPulse, Mail, Lock, ArrowRight, Loader2,
  Building2, User, Users, Heart, Shield, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isValidEmail } from "@/lib/validation";

function homeForRole(role: string): string {
  switch (role) {
    case "caregiver":      return "/caregiver";
    case "patient":        return "/patient";
    case "provider_admin":
    case "government":     return "/admin";
    default:               return "/dashboard";
  }
}

const DEMO_ACCOUNTS = [
  { role: "provider_admin", email: "admin@aayucare.demo",     label: "Admin",      sub: "Full admin portal · all data",   icon: Building2, color: "text-slate-700",   bg: "bg-slate-50",  border: "hover:border-slate-400/50",  iconBg: "bg-slate-100" },
  { role: "caregiver",      email: "caregiver@aayucare.demo", label: "Caregiver",  sub: "Visit tracking & check-in",      icon: User,      color: "text-brand",        bg: "bg-brand/5",   border: "hover:border-brand/50",       iconBg: "bg-brand/10" },
  { role: "patient",        email: "patient@aayucare.demo",   label: "Patient",    sub: "AI health check-in",             icon: Heart,     color: "text-teal",         bg: "bg-teal/5",    border: "hover:border-teal/50",        iconBg: "bg-teal/10" },
  { role: "family",         email: "family@aayucare.demo",    label: "Family",     sub: "Dashboard & monitoring",         icon: Users,     color: "text-violet-600",   bg: "bg-violet-50", border: "hover:border-violet-500/50",  iconBg: "bg-violet-100" },
];

const DEMO_EMAILS = new Set(DEMO_ACCOUNTS.map((d) => d.email));
const DEMO_PASSWORD = "demo123456";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000; // 5 attempts per minute

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const attemptsRef = useRef<number[]>([]);

  // Lockout countdown ticker
  const [, force] = useState(0);
  useEffect(() => {
    if (lockedUntil === null) return;
    const t = setInterval(() => {
      if (Date.now() > lockedUntil) { setLockedUntil(null); attemptsRef.current = []; }
      force((n) => n + 1);
    }, 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const emailErr = emailTouched && email && !isValidEmail(email)
    ? "Enter a valid email address"
    : "";
  const formInvalid = !email || !password || !isValidEmail(email) || password.length < 6;
  const remainingMs = lockedUntil ? Math.max(0, lockedUntil - Date.now()) : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);

  function recordAttempt() {
    const now = Date.now();
    attemptsRef.current = attemptsRef.current.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    attemptsRef.current.push(now);
    if (attemptsRef.current.length >= RATE_LIMIT_MAX) {
      setLockedUntil(now + RATE_LIMIT_WINDOW_MS);
    }
  }

  async function ensureDemoSeeded() {
    // Demo accounts are pre-created by /api/seed. Only fire when the user
    // is trying a known demo email and login just failed.
    try {
      await fetch("/api/seed", {
        method: "POST",
        credentials: "include",
        headers: { "x-seed-token": "aayucare-dev-seed" },
      });
    } catch {
      /* swallow — caller will surface a real error */
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (lockedUntil && Date.now() < lockedUntil) return;
    setError("");

    // ── Client-side strict validation ──────────────────────────────────────
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError("Please enter a valid email address.");
      setEmailTouched(true);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    async function attempt() {
      return supabase.auth.signInWithPassword({ email: cleanEmail, password });
    }

    let { data: signInData, error: signInError } = await attempt();

    // ── Demo recovery: if a known demo email failed, seed once and retry ─
    if (signInError && DEMO_EMAILS.has(cleanEmail) && password === DEMO_PASSWORD) {
      await ensureDemoSeeded();
      ({ data: signInData, error: signInError } = await attempt());
    }

    // ── Failure: surface a clean error and DO NOT auto-create accounts ──
    if (signInError || !signInData?.user) {
      recordAttempt();
      const msg = signInError?.message?.toLowerCase() || "";
      if (msg.includes("email not confirmed")) {
        setError("Please confirm your email first. Check your inbox.");
      } else if (msg.includes("invalid login credentials") || msg.includes("invalid grant")) {
        setError("Incorrect email or password. Please try again.");
      } else if (msg.includes("rate limit") || msg.includes("too many")) {
        setError("Too many attempts. Please wait a minute and try again.");
      } else {
        setError(signInError?.message || "Sign-in failed. Please try again.");
      }
      setLoading(false);
      return;
    }

    // ── Success: figure out the role and route ─────────────────────────────
    const user = signInData.user;
    const metaRole =
      (user.app_metadata?.role as string) ||
      (user.user_metadata?.role as string) ||
      "";

    if (metaRole) {
      router.push(homeForRole(metaRole));
      return;
    }

    // First-ever login without metadata: read from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "family";
    // Cache role into auth metadata so future logins skip the DB hop
    await supabase.auth.updateUser({ data: { role } });
    router.push(homeForRole(role));
  }

  const isLocked = lockedUntil !== null && remainingMs > 0;

  return (
    <div>
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
          <HeartPulse className="w-6 h-6 text-white" />
        </div>
        <span className="font-[var(--font-heading)] font-bold text-xl">AayuCare</span>
      </div>

      <div>
        <h2 className="font-[var(--font-heading)] text-3xl font-black tracking-tight">Welcome back</h2>
        <p className="mt-2 text-muted-foreground">Sign in to access your care dashboard</p>
      </div>

      <form onSubmit={handleLogin} className="mt-8 space-y-4" noValidate>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onBlur={() => setEmailTouched(true)}
              className={`pl-10 h-11 ${emailErr ? "border-red-300 focus-visible:ring-red-200" : ""}`}
              required
            />
          </div>
          {emailErr && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{emailErr}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="text-xs text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="pl-10 pr-10 h-11"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />{error}
          </p>
        )}

        {isLocked && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-2">
            <Shield className="w-4 h-4" />Too many attempts. Try again in {remainingSec}s.
          </p>
        )}

        <Button
          type="submit"
          disabled={loading || formInvalid || isLocked}
          className="w-full h-11 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </form>

      {/* ── Demo Accounts ── */}
      <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-1">Demo Accounts</p>
        <p className="text-[10px] text-muted-foreground mb-3">Click a role to fill the form, then press Sign In.</p>

        <div className="flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((d) => (
            <button
              key={d.role}
              type="button"
              onClick={() => { setEmail(d.email); setPassword(DEMO_PASSWORD); setError(""); setEmailTouched(false); }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-border ${d.border} transition-colors text-left`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg ${d.iconBg} flex items-center justify-center shrink-0`}>
                  <d.icon className={`w-3.5 h-3.5 ${d.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${d.color}`}>{d.label}</span>
                    <span className="text-[10px] text-muted-foreground">{d.sub}</span>
                  </div>
                  <div className="mt-0.5">
                    <code className={`text-[10px] ${d.bg} px-1.5 py-0.5 rounded ${d.color} font-mono`}>{d.email}</code>
                    <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono ml-1">{DEMO_PASSWORD}</code>
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 ml-2" />
            </button>
          ))}
        </div>

        <div className="mt-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Demo accounts are pre-seeded for evaluation. Real accounts must be created
            through <Link href="/register" className="font-semibold underline">Sign Up</Link>.
          </p>
        </div>
      </div>

      {/* Provider sign-up CTA */}
      <div className="mt-6 p-4 rounded-xl border-2 border-dashed border-brand/30 bg-brand/5 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-brand" />
          <span className="text-sm font-semibold">Running a care agency or hospital?</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Create an organization account and manage your entire operation.</p>
        <Link href="/provider-signup">
          <Button variant="outline" size="sm" className="border-brand text-brand hover:bg-brand hover:text-white rounded-full text-xs">
            Start Provider Signup <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-brand font-semibold hover:underline">Create one</Link>
      </p>
    </div>
  );
}
