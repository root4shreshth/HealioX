"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HeartPulse, Mail, Lock, ArrowRight, Loader2,
  Building2, User, Users, Heart, Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  {
    role: "provider_admin",
    email: "admin@healiox.demo",
    label: "Admin",
    sub: "Full admin portal · all data",
    icon: Building2,
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "hover:border-slate-400/50",
    iconBg: "bg-slate-100",
  },
  {
    role: "caregiver",
    email: "caregiver@healiox.demo",
    label: "Caregiver",
    sub: "Visit tracking & check-in",
    icon: User,
    color: "text-brand",
    bg: "bg-brand/5",
    border: "hover:border-brand/50",
    iconBg: "bg-brand/10",
  },
  {
    role: "patient",
    email: "patient@healiox.demo",
    label: "Patient",
    sub: "AI health check-in",
    icon: Heart,
    color: "text-teal",
    bg: "bg-teal/5",
    border: "hover:border-teal/50",
    iconBg: "bg-teal/10",
  },
  {
    role: "family",
    email: "family@healiox.demo",
    label: "Family",
    sub: "Dashboard & monitoring",
    icon: Users,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "hover:border-violet-500/50",
    iconBg: "bg-violet-100",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // ── Step 1: Sign in ────────────────────────────────────────────────────
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError && signInData?.user) {
        const user = signInData.user;

        // ── Fast path: role already in user_metadata (set at signup) ──────
        // Skips the DB round-trip entirely on repeat logins.
        const metaRole = (user.app_metadata?.role as string) || (user.user_metadata?.role as string);

        if (metaRole) {
          // Role known — redirect immediately, no extra DB calls
          router.push(homeForRole(metaRole));
          return;
        }

        // ── Slow path: first login after manual DB insert (no metadata) ───
        // Only hits the DB when metadata is genuinely missing.
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role || "family";

        // Write the role into metadata so future logins use the fast path
        await supabase.auth.updateUser({ data: { role } });

        router.push(homeForRole(role));
        return;
      }

      // ── Step 2: Email not confirmed ────────────────────────────────────────
      if (signInError?.message?.includes("Email not confirmed")) {
        setError("Please confirm your email address first. Check your inbox.");
        setLoading(false);
        return;
      }

      // ── Step 3: Account doesn't exist — try signup ─────────────────────────
      const demoRole = DEMO_ACCOUNTS.find((d) => d.email === email)?.role || "family";

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `Demo ${demoRole.replace("_", " ")}`,
            role: demoRole,
          },
        },
      });

      if (signUpError) {
        setError(
          signUpError.message?.includes("already registered") ||
          signUpError.message?.includes("already been registered")
            ? "Incorrect password. Please try again."
            : signUpError.message || "Sign up failed. Please try again."
        );
        setLoading(false);
        return;
      }

      // ── Step 4: Email confirmation required — retry sign in ───────────────
      if (!signUpData.session) {
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (retryError || !retryData?.user) {
          setError("Account created. Please confirm your email, then sign in.");
          setLoading(false);
          return;
        }

        // Write profile on first-ever signup
        await supabase.from("profiles").upsert({
          id: retryData.user.id,
          email,
          full_name: `Demo ${demoRole.replace("_", " ")}`,
          role: demoRole,
        });

        router.push(homeForRole(demoRole));
        return;
      }

      // ── Step 5: Session from signup (email confirm OFF) ───────────────────
      if (signUpData.user) {
        await supabase.from("profiles").upsert({
          id: signUpData.user.id,
          email,
          full_name: `Demo ${demoRole.replace("_", " ")}`,
          role: demoRole,
        });
        router.push(homeForRole(demoRole));
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
          <HeartPulse className="w-6 h-6 text-white" />
        </div>
        <span className="font-[var(--font-heading)] font-bold text-xl">HealioX</span>
      </div>

      <div>
        <h2 className="font-[var(--font-heading)] text-3xl font-black tracking-tight">Welcome back</h2>
        <p className="mt-2 text-muted-foreground">Sign in to access your care dashboard</p>
      </div>

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email" type="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11" required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <span className="text-xs text-brand cursor-pointer hover:underline">Forgot password?</span>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password" type="password" placeholder="Enter your password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11" required
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <Button
          type="submit" disabled={loading}
          className="w-full h-11 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-semibold"
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
              onClick={() => { setEmail(d.email); setPassword("demo123456"); setError(""); }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-border ${d.border} transition-colors text-left`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg ${d.iconBg} flex items-center justify-center shrink-0`}>
                  <d.icon className={`w-3.5 h-3.5 ${d.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${d.color}`}>{d.label}</span>
                    {d.role === "provider_admin" && (
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">Admin</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{d.sub}</span>
                  </div>
                  <div className="mt-0.5">
                    <code className={`text-[10px] ${d.bg} px-1.5 py-0.5 rounded ${d.color} font-mono`}>{d.email}</code>
                    <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono ml-1">demo123456</code>
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
            The <strong>Admin</strong> account has full access — caregiver management, patient oversight, revenue dashboard, and org settings.
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-brand font-semibold hover:underline">Create one</Link>
      </p>
    </div>
  );
}
