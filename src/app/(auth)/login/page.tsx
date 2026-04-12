"use client";

import { useState, useEffect } from "react";
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

  // Sign out any existing session when landing on login page
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.signOut().then(() => setReady(true));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return; // Wait for signout to complete
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Ensure clean state
      await supabase.auth.signOut();

      // Detect role from email
      let role = "family";
      if (email.includes("caregiver")) role = "caregiver";
      else if (email.includes("patient")) role = "patient";
      else if (email.includes("family")) role = "family";
      else if (email.includes("admin")) role = "provider_admin";

      // Try sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (!signInError && signInData?.user) {
        // Sign in succeeded — ensure profile exists
        await supabase.from("profiles").upsert({
          id: signInData.user.id,
          email,
          full_name: signInData.user.user_metadata?.full_name || `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
          role: signInData.user.user_metadata?.role || role,
        });

        const userRole = signInData.user.user_metadata?.role || role;
        if (userRole === "caregiver") router.push("/caregiver");
        else if (userRole === "patient") router.push("/patient");
        else router.push("/dashboard");
        return;
      }

      // Sign in failed — create account
      console.log("Sign in failed, creating account:", signInError?.message);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`, role },
        },
      });

      if (signUpError) {
        setError(`Signup failed: ${signUpError.message}`);
        setLoading(false);
        return;
      }

      // Check if we got a session (email confirmation must be OFF)
      if (!signUpData.session) {
        // Try sign in again — works if email confirmation is disabled
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password });
        if (retryError) {
          setError("Account created but can't sign in. Please disable 'Confirm email' in Supabase → Authentication → Sign In / Providers → Email.");
          setLoading(false);
          return;
        }

        if (retryData?.user) {
          await supabase.from("profiles").upsert({
            id: retryData.user.id, email,
            full_name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`, role,
          });
        }
      } else if (signUpData.user) {
        // Session created directly
        await supabase.from("profiles").upsert({
          id: signUpData.user.id, email,
          full_name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`, role,
        });
      }

      // Small delay for session to propagate
      await new Promise((r) => setTimeout(r, 500));

      // Route
      if (role === "caregiver") router.push("/caregiver");
      else if (role === "patient") router.push("/patient");
      else router.push("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Quick demo login helper
  async function demoLogin(demoEmail: string, role: string) {
    setEmail(demoEmail);
    setPassword("demo123456");
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // First sign out any existing session
      await supabase.auth.signOut();

      // Try sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: "demo123456",
      });

      if (signInError) {
        console.log("Sign in failed, trying signup:", signInError.message);

        // Sign up new account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: demoEmail,
          password: "demo123456",
          options: {
            data: { full_name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`, role },
          },
        });

        if (signUpError) {
          setError(`Signup failed: ${signUpError.message}`);
          setLoading(false);
          return;
        }

        // Check if we got a session (means email confirm is OFF — good)
        if (signUpData.session) {
          // Create profile
          if (signUpData.user) {
            await supabase.from("profiles").upsert({
              id: signUpData.user.id,
              email: demoEmail,
              full_name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
              role,
            });
          }
        } else {
          // No session = email confirm is still ON, try sign in anyway
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: demoEmail,
            password: "demo123456",
          });

          if (retryError) {
            setError(
              "Email confirmation is still enabled. Go to Supabase → Authentication → Sign In / Providers → Email → turn OFF 'Confirm email' → Save."
            );
            setLoading(false);
            return;
          }

          // Create profile after successful retry
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("profiles").upsert({
              id: user.id,
              email: demoEmail,
              full_name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
              role,
            });
          }
        }
      }

      // Small delay for session to propagate
      await new Promise((r) => setTimeout(r, 300));

      // Route based on role
      if (role === "caregiver") router.push("/caregiver");
      else if (role === "patient") router.push("/patient");
      else router.push("/dashboard");
    } catch (err) {
      console.error("Demo login error:", err);
      setError("Demo login failed. Check browser console for details.");
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
        <span className="font-[var(--font-heading)] font-bold text-xl">
          HealioX
        </span>
      </div>

      <div>
        <h2 className="font-[var(--font-heading)] text-3xl font-black tracking-tight">
          Welcome back
        </h2>
        <p className="mt-2 text-muted-foreground">
          Sign in to access your care dashboard
        </p>
      </div>

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <span className="text-xs text-brand cursor-pointer hover:underline">
              Forgot password?
            </span>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11"
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-semibold"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      {/* Demo accounts — click to fill form, then press Sign In */}
      <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-1">
          Demo Accounts
        </p>
        <p className="text-[10px] text-muted-foreground mb-3">
          Click a role to fill the form, then press Sign In.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => { setEmail("caregiver@healiox.demo"); setPassword("demo123456"); setError(""); }}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-border hover:border-brand/50 transition-colors text-left"
          >
            <div>
              <span className="text-xs font-semibold text-brand">Caregiver</span>
              <span className="text-[10px] text-muted-foreground ml-2">Visit tracking & check-in</span>
              <div className="mt-1">
                <code className="text-[10px] bg-brand/5 px-1.5 py-0.5 rounded text-brand font-mono">caregiver@healiox.demo</code>
                <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono ml-1">demo123456</code>
              </div>
            </div>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={() => { setEmail("patient@healiox.demo"); setPassword("demo123456"); setError(""); }}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-border hover:border-teal/50 transition-colors text-left"
          >
            <div>
              <span className="text-xs font-semibold text-teal">Patient</span>
              <span className="text-[10px] text-muted-foreground ml-2">AI health check-in</span>
              <div className="mt-1">
                <code className="text-[10px] bg-teal/5 px-1.5 py-0.5 rounded text-teal font-mono">patient@healiox.demo</code>
                <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono ml-1">demo123456</code>
              </div>
            </div>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={() => { setEmail("family@healiox.demo"); setPassword("demo123456"); setError(""); }}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white border border-border hover:border-violet-500/50 transition-colors text-left"
          >
            <div>
              <span className="text-xs font-semibold text-violet-600">Family</span>
              <span className="text-[10px] text-muted-foreground ml-2">Dashboard & monitoring</span>
              <div className="mt-1">
                <code className="text-[10px] bg-violet-50 px-1.5 py-0.5 rounded text-violet-600 font-mono">family@healiox.demo</code>
                <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono ml-1">demo123456</code>
              </div>
            </div>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-brand font-semibold hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
