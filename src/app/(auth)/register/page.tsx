"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HeartPulse, Mail, Lock, User, ArrowRight, Loader2,
  Eye, EyeOff, AlertCircle, CheckCircle2, Phone, Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isValidEmail, isValidName, isValidPassword, isValidPhone, normalizePhone } from "@/lib/validation";

const ROLES = [
  { value: "family",    label: "Family Member", description: "I monitor a loved one",         color: "border-violet-500 bg-violet-50 text-violet-600" },
  { value: "patient",   label: "Patient",       description: "I receive care services",       color: "border-teal bg-teal/5 text-teal" },
  { value: "caregiver", label: "Caregiver",     description: "I provide care services",       color: "border-brand bg-brand/5 text-brand" },
];

const EMAIL_DOMAINS = [
  "@gmail.com", "@yahoo.com", "@yahoo.co.in", "@outlook.com",
  "@hotmail.com", "@icloud.com", "@proton.me",
];

const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const map = [
    { label: "Too short",   color: "bg-red-400" },
    { label: "Weak",        color: "bg-orange-400" },
    { label: "Fair",        color: "bg-amber-400" },
    { label: "Good",        color: "bg-lime-500" },
    { label: "Strong",      color: "bg-emerald-500" },
  ];
  return { score: s as 0 | 1 | 2 | 3 | 4, ...map[s] };
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [emailUser, setEmailUser] = useState("");
  const [emailDomain, setEmailDomain] = useState("@gmail.com");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);

  const composedEmail = `${emailUser}${emailDomain}`.toLowerCase();

  // ── Inline validation ─────────────────────────────────────────────────
  const nameErr = touched.name && name && !isValidName(name) ? "Use letters only (2-80 chars)" : "";
  const usernameErr = touched.email && emailUser && !USERNAME_RE.test(emailUser)
    ? "Only letters, digits, dot, dash, underscore"
    : "";
  const emailErr = touched.email && emailUser && !usernameErr && !isValidEmail(composedEmail)
    ? "Resulting email is invalid"
    : "";
  const phoneErr = touched.phone && phone && !isValidPhone(normalizePhone(phone))
    ? "Use +<country><number>, e.g. +919810000000"
    : "";
  const pwErr = touched.password && password && !isValidPassword(password)
    ? "Min 8 chars, must include letters and a digit"
    : "";
  const confirmErr = touched.confirm && confirmPw && password !== confirmPw
    ? "Passwords do not match"
    : "";

  const formValid =
    isValidName(name) &&
    USERNAME_RE.test(emailUser) &&
    isValidEmail(composedEmail) &&
    (!phone || isValidPhone(normalizePhone(phone))) &&
    isValidPassword(password) &&
    password === confirmPw &&
    role &&
    acceptTerms;

  const strength = passwordStrength(password);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setTouched({ name: true, email: true, phone: true, password: true, confirm: true });

    if (!formValid) {
      setError("Please fix the highlighted fields before continuing.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error: authError } = await supabase.auth.signUp({
        email: composedEmail,
        password,
        options: {
          data: {
            full_name: name.trim(),
            role,
            phone: phone ? normalizePhone(phone) : null,
          },
        },
      });

      if (authError) {
        const msg = authError.message?.toLowerCase() || "";
        if (msg.includes("already registered") || msg.includes("already been registered")) {
          setError("An account with this email already exists. Please sign in instead.");
        } else if (msg.includes("password")) {
          setError(authError.message);
        } else {
          setError(authError.message || "Sign-up failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Email-confirmation enabled: no session is returned
      if (!data.session) {
        setConfirmEmailSent(true);
        setLoading(false);
        return;
      }

      // Auto-confirm flow: persist the profile and route based on role
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: composedEmail,
          full_name: name.trim(),
          role,
          phone: phone ? normalizePhone(phone) : null,
        });
      }

      if (role === "caregiver")      router.push("/caregiver");
      else if (role === "patient")   router.push("/patient");
      else                            router.push("/dashboard");
    } catch (err) {
      console.error("Signup error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Email-sent success screen ────────────────────────────────────────
  if (confirmEmailSent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="font-[var(--font-heading)] text-2xl font-black mb-2">Check your email</h2>
        <p className="text-sm text-muted-foreground mb-1">
          We sent a confirmation link to:
        </p>
        <p className="font-mono text-sm font-semibold mb-6">{composedEmail}</p>
        <p className="text-xs text-muted-foreground mb-6">
          Click the link in the email to verify your account, then sign in.
        </p>
        <Link href="/login">
          <Button className="w-full h-11 bg-brand hover:bg-brand-dark text-white rounded-xl">
            Go to Sign In
          </Button>
        </Link>
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
        <h2 className="font-[var(--font-heading)] text-3xl font-black tracking-tight">Create Account</h2>
        <p className="mt-2 text-muted-foreground">Join AayuCare and transform care delivery</p>
      </div>

      <form onSubmit={handleRegister} className="mt-6 space-y-4" noValidate>
        {/* Role */}
        <div className="space-y-2">
          <label className="text-sm font-medium">I am a...</label>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  role === r.value ? r.color : "border-border bg-white hover:border-muted-foreground/30"
                }`}
              >
                <div className="text-xs font-semibold">{r.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{r.description}</div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Running a care agency? Use{" "}
            <Link href="/provider-signup" className="text-brand underline font-semibold">Provider Signup</Link>{" "}
            instead.
          </p>
        </div>

        {/* Full name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="name">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="name"
              placeholder="Sunita Devi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              className={`pl-10 h-11 ${nameErr ? "border-red-300 focus-visible:ring-red-200" : ""}`}
              required
              autoComplete="name"
            />
          </div>
          {nameErr && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{nameErr}</p>}
        </div>

        {/* Email split */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="username"
                value={emailUser}
                onChange={(e) => setEmailUser(e.target.value.replace(/[@\s]/g, "").toLowerCase())}
                onPaste={(e) => {
                  const txt = e.clipboardData.getData("text").trim();
                  if (txt.includes("@")) {
                    e.preventDefault();
                    const [u, d] = txt.split("@");
                    setEmailUser(u.replace(/[@\s]/g, "").toLowerCase());
                    if (d && EMAIL_DOMAINS.includes("@" + d.toLowerCase())) {
                      setEmailDomain("@" + d.toLowerCase());
                    }
                  }
                }}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                autoComplete="email"
                inputMode="email"
                className={`pl-10 h-11 ${(usernameErr || emailErr) ? "border-red-300 focus-visible:ring-red-200" : ""}`}
                required
              />
            </div>
            <select
              value={emailDomain}
              onChange={(e) => setEmailDomain(e.target.value)}
              className="h-11 px-3 rounded-md border border-input bg-background text-sm shrink-0 min-w-[140px]"
            >
              {EMAIL_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {emailUser && !usernameErr && !emailErr && (
            <p className="text-[10px] text-muted-foreground">
              Login email: <span className="font-mono">{composedEmail}</span>
            </p>
          )}
          {(usernameErr || emailErr) && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{usernameErr || emailErr}</p>
          )}
        </div>

        {/* Phone (optional) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="phone">Phone <span className="text-muted-foreground font-normal">(optional, with country code)</span></label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="+919810000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, ""))}
              onBlur={() => { setTouched((t) => ({ ...t, phone: true })); if (phone) setPhone(normalizePhone(phone)); }}
              className={`pl-10 h-11 ${phoneErr ? "border-red-300 focus-visible:ring-red-200" : ""}`}
              autoComplete="tel"
            />
          </div>
          {phoneErr && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{phoneErr}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="password">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              placeholder="Min 8 chars · letters + digit"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              className={`pl-10 pr-10 h-11 ${pwErr ? "border-red-300 focus-visible:ring-red-200" : ""}`}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Strength meter */}
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i < strength.score ? strength.color : "bg-muted"}`} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">{strength.label}</p>
            </div>
          )}
          {pwErr && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{pwErr}</p>}
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="confirm">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              className={`pl-10 pr-10 h-11 ${confirmErr ? "border-red-300 focus-visible:ring-red-200" : ""}`}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmErr && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{confirmErr}</p>}
          {!confirmErr && confirmPw && password === confirmPw && (
            <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Passwords match</p>
          )}
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2 text-xs cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-muted-foreground leading-relaxed">
            I agree to AayuCare&apos;s{" "}
            <Link href="/terms" className="text-brand underline">Terms of Service</Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-brand underline">Privacy Policy</Link>.
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />{error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading || !formValid}
          className="w-full h-11 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </form>

      {/* Provider sign-up CTA */}
      <div className="mt-6 p-3 rounded-xl border border-dashed border-brand/30 bg-brand/5 flex items-center gap-3">
        <Building2 className="w-4 h-4 text-brand shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold">Care agency or hospital?</p>
          <p className="text-[10px] text-muted-foreground">Provider Signup creates an organisation, not an individual account.</p>
        </div>
        <Link href="/provider-signup" className="text-xs text-brand font-semibold hover:underline shrink-0">
          Open <ArrowRight className="w-3 h-3 inline ml-0.5" />
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
