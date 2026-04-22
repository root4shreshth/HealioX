"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeartPulse, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

      // Step 1: Try sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (!signInError && signInData?.user) {
        // Sign in succeeded — ensure profile has role set
        const role = detectRole(email, signInData.user.user_metadata?.role);
        await supabase.from("profiles").upsert({
          id: signInData.user.id,
          email,
          full_name: signInData.user.user_metadata?.full_name || `Demo ${capitalize(role)}`,
          role: signInData.user.user_metadata?.role || role,
        });
        routeByRole(signInData.user.user_metadata?.role || role);
        return;
      }

      // Step 2: Handle specific sign-in errors
      if (signInError?.message?.includes("Email not confirmed")) {
        setError("Please confirm your email address first. Check your inbox.");
        setLoading(false);
        return;
      }

      // Step 3: Try sign up (user may not exist yet)
      const role = detectRole(email);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: `Demo ${capitalize(role)}`, role } },
      });

      if (signUpError) {
        // User already exists but wrong password
        if (signUpError.message?.includes("already registered") || signUpError.message?.includes("already been registered")) {
          setError("Incorrect password. Please try again.");
        } else {
          setError(signUpError.message || "Sign up failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Step 4: If no session after signup, email confirm is ON — try signing in again
      if (!signUpData.session) {
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password });
        if (retryError) {
          setError("Account created. Please confirm your email, then sign in.");
          setLoading(false);
          return;
        }
        if (retryData?.user) {
          await supabase.from("profiles").upsert({
            id: retryData.user.id, email,
            full_name: `Demo ${capitalize(role)}`, role,
          });
          routeByRole(role);
          return;
        }
      }

      // Step 5: Session created directly via signup
      if (signUpData?.user) {
        await supabase.from("profiles").upsert({
          id: signUpData.user.id, email,
          full_name: `Demo ${capitalize(role)}`, role,
        });
        routeByRole(role);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function detectRole(emailAddr: string, metaRole?: string): string {
    if (metaRole) return metaRole;
    if (emailAddr.includes("caregiver")) return "caregiver";
    if (emailAddr.includes("patient")) return "patient";
    if (emailAddr.includes("admin")) return "provider_admin";
    return "family";
  }

  function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ");
  }

  function routeByRole(role: string) {
    if (role === "caregiver") router.push("/caregiver");
    else if (role === "patient") router.push("/patient");
    else router.push("/dashboard");
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
            <Input id="email" type="email" placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <span className="text-xs text-brand cursor-pointer hover:underline">Forgot password?</span>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="password" type="password" placeholder="Enter your password" value={password}
              onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" required />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <Button type="submit" disabled={loading}
          className="w-full h-11 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-semibold">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>)}
        </Button>
      </form>

      {/* Demo accounts */}
      <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-1">Demo Accounts</p>
        <p className="text-[10px] text-muted-foreground mb-3">Click a role to fill the form, then press Sign In.</p>
        <div className="flex flex-col gap-2">
          {[
            { role: "caregiver", email: "caregiver@healiox.demo", label: "Caregiver", sub: "Visit tracking & check-in", color: "text-brand", bg: "bg-brand/5", border: "hover:border-brand/50" },
            { role: "patient", email: "patient@healiox.demo", label: "Patient", sub: "AI health check-in", color: "text-teal", bg: "bg-teal/5", border: "hover:border-teal/50" },
            { role: "family", email: "family@healiox.demo", label: "Family", sub: "Dashboard & monitoring", color: "text-violet-600", bg: "bg-violet-50", border: "hover:border-violet-500/50" },
          ].map((d) => (
            <button key={d.role}
              onClick={() => { setEmail(d.email); setPassword("demo123456"); setError(""); }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-border ${d.border} transition-colors text-left`}>
              <div>
                <span className={`text-xs font-semibold ${d.color}`}>{d.label}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{d.sub}</span>
                <div className="mt-1">
                  <code className={`text-[10px] ${d.bg} px-1.5 py-0.5 rounded ${d.color} font-mono`}>{d.email}</code>
                  <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono ml-1">demo123456</code>
                </div>
              </div>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-brand font-semibold hover:underline">Create one</Link>
      </p>
    </div>
  );
}
