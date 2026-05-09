"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HeartPulse, Mail, ArrowRight, ArrowLeft, Loader2,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isValidEmail } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailErr = touched && email && !isValidEmail(email) ? "Enter a valid email address" : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const clean = email.trim().toLowerCase();
    if (!isValidEmail(clean)) {
      setError("Please enter a valid email address.");
      setTouched(true);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(clean, {
        redirectTo: `${window.location.origin}/login`,
      });

      // Note: we always show success to avoid leaking which emails are registered.
      if (resetError && !resetError.message?.toLowerCase().includes("not found")) {
        console.warn("Password reset error:", resetError);
      }
      setSent(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="font-[var(--font-heading)] text-2xl font-black mb-2">Check your email</h2>
        <p className="text-sm text-muted-foreground mb-1">
          If an account exists for
        </p>
        <p className="font-mono text-sm font-semibold mb-4">{email.toLowerCase()}</p>
        <p className="text-xs text-muted-foreground mb-6">
          we&apos;ve sent a password-reset link. Click the link in the email to choose a new password.
        </p>
        <Link href="/login">
          <Button className="w-full h-11 bg-brand hover:bg-brand-dark text-white rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Sign In
          </Button>
        </Link>
        <button
          type="button"
          onClick={() => { setSent(false); setEmail(""); }}
          className="mt-3 text-xs text-muted-foreground hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

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
        <h2 className="font-[var(--font-heading)] text-3xl font-black tracking-tight">Forgot password?</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Enter the email associated with your account and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
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
              onBlur={() => setTouched(true)}
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

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />{error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading || !email || !!emailErr}
          className="w-full h-11 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send reset link <ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="text-brand font-semibold hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to Sign In
        </Link>
      </p>
    </div>
  );
}
