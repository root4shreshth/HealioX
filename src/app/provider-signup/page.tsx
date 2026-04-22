"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  HeartPulse, Building2, User, Mail, Lock, Phone, Globe,
  MapPin, ArrowRight, Loader2, CheckCircle2, Shield,
  Sparkles, Users, ClipboardCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

const ORG_TYPES = [
  { value: "home_care", label: "Home Care Agency", desc: "Visit-based elderly care" },
  { value: "hospital", label: "Hospital", desc: "Full-service medical facility" },
  { value: "clinic", label: "Clinic", desc: "Outpatient care center" },
  { value: "nursing_home", label: "Nursing Home", desc: "Residential elderly care" },
];

const BENEFITS = [
  { icon: Users, text: "Unlimited caregiver accounts" },
  { icon: Shield, text: "GPS visit verification" },
  { icon: Sparkles, text: "AI health check-ins" },
  { icon: ClipboardCheck, text: "Revenue + compliance reporting" },
];

export default function ProviderSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    // Step 1: Organization
    org_name: "",
    org_type: "home_care",
    org_address: "",
    org_phone: "",
    org_website: "",
    // Step 2: Admin
    admin_full_name: "",
    admin_email: "",
    admin_password: "",
    admin_phone: "",
    agree: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // Create the org + admin account via API (uses service role to bypass email confirmation)
      const res = await fetch("/api/admin/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create account");
        setSubmitting(false);
        return;
      }

      // Sign in the new admin
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.admin_email,
        password: form.admin_password,
      });

      if (signInError) {
        // Account exists; just tell them to log in
        router.push("/login");
        return;
      }

      // Success — redirect into the admin portal
      router.push("/admin");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  function nextStep(e: React.FormEvent) {
    e.preventDefault();
    if (!form.org_name.trim()) { setError("Organization name is required"); return; }
    setError("");
    setStep(2);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/5 via-background to-teal/5">
      {/* Nav */}
      <nav className="h-16 border-b border-border bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="font-[var(--font-heading)] font-bold text-lg">HealioX</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">Already have an account?</span>
            <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3">
            <Badge className="bg-brand/10 text-brand border-0 mb-3">
              <Sparkles className="w-3 h-3 mr-1" />14-day free trial · No credit card
            </Badge>
            <h1 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-black tracking-tight">
              Start your care agency
            </h1>
            <p className="mt-2 text-muted-foreground">Create your HealioX organization in under 2 minutes</p>

            {/* Step indicator */}
            <div className="mt-6 flex items-center gap-2">
              <div className={`flex items-center gap-2 ${step === 1 ? "text-brand" : "text-green-600"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1 ? "bg-brand text-white" : "bg-green-100 text-green-600"
                }`}>
                  {step === 1 ? "1" : <CheckCircle2 className="w-4 h-4" />}
                </div>
                <span className="text-xs font-semibold">Organization</span>
              </div>
              <div className={`flex-1 h-0.5 ${step === 2 ? "bg-brand" : "bg-muted"}`} />
              <div className={`flex items-center gap-2 ${step === 2 ? "text-brand" : "text-muted-foreground"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 2 ? "bg-brand text-white" : "bg-muted text-muted-foreground"
                }`}>2</div>
                <span className="text-xs font-semibold">Admin Account</span>
              </div>
            </div>

            <div className="mt-6 bg-white rounded-2xl p-6 border border-border shadow-sm">
              {step === 1 && (
                <form onSubmit={nextStep} className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold mb-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />Organization Name *</label>
                    <Input value={form.org_name} onChange={(e) => setForm({ ...form, org_name: e.target.value })} placeholder="e.g. SevaCare Elder Services" className="h-11" required />
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">What kind of organization? *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ORG_TYPES.map((t) => (
                        <button key={t.value} type="button"
                          onClick={() => setForm({ ...form, org_type: t.value })}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            form.org_type === t.value ? "border-brand bg-brand/5" : "border-border hover:border-muted-foreground/30"
                          }`}>
                          <div className="text-sm font-semibold">{t.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Address</label>
                    <Textarea value={form.org_address} onChange={(e) => setForm({ ...form, org_address: e.target.value })} placeholder="Street, city, state, PIN" rows={2} className="resize-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold mb-1 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Phone</label>
                      <Input value={form.org_phone} onChange={(e) => setForm({ ...form, org_phone: e.target.value })} placeholder="+91 ..." className="h-11" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Website</label>
                      <Input value={form.org_website} onChange={(e) => setForm({ ...form, org_website: e.target.value })} placeholder="https://..." className="h-11" />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

                  <Button type="submit" className="w-full h-11 bg-brand hover:bg-brand-dark text-white rounded-xl font-semibold">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="p-3 rounded-xl bg-muted/40 text-xs">
                    <span className="text-muted-foreground">Organization:</span>{" "}
                    <span className="font-semibold">{form.org_name}</span>
                    <button type="button" onClick={() => setStep(1)} className="ml-2 text-brand hover:underline">edit</button>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Your Name *</label>
                    <Input value={form.admin_full_name} onChange={(e) => setForm({ ...form, admin_full_name: e.target.value })} placeholder="e.g. Dr. Priya Sharma" className="h-11" required />
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-1 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Work Email *</label>
                    <Input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} placeholder="you@organization.in" className="h-11" required />
                    <p className="text-[10px] text-muted-foreground mt-1">Used to log into the admin portal</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold mb-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />Password *</label>
                      <Input type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} placeholder="Min 8 characters" className="h-11" required minLength={8} />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Phone</label>
                      <Input value={form.admin_phone} onChange={(e) => setForm({ ...form, admin_phone: e.target.value })} placeholder="+91 ..." className="h-11" />
                    </div>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} required className="mt-1" />
                    <span className="text-xs text-muted-foreground">
                      I agree to the <Link href="/terms" className="text-brand hover:underline">Terms of Service</Link> and{" "}
                      <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link>
                    </span>
                  </label>

                  {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-11">Back</Button>
                    <Button type="submit" disabled={submitting || !form.agree} className="flex-1 h-11 bg-brand hover:bg-brand-dark text-white rounded-xl font-semibold">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>

          {/* Right: Value prop */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl p-6 border border-border">
                <h3 className="font-[var(--font-heading)] font-bold text-lg mb-1">Everything you need</h3>
                <p className="text-sm text-muted-foreground mb-5">Start managing your care operations today</p>

                <div className="space-y-3">
                  {BENEFITS.map((b) => (
                    <div key={b.text} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                        <b.icon className="w-4 h-4 text-brand" />
                      </div>
                      <span className="text-sm">{b.text}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-100 text-green-700 text-[10px]">14-day free trial</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    No credit card required. Upgrade anytime.
                    Cancel anytime. Your trial includes up to 5 patients and unlimited caregivers.
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-brand/5 rounded-2xl p-5 border border-brand/10">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-brand" />
                  <span className="text-sm font-semibold">Enterprise-grade security</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Role-based access · Audit logs · Encrypted at rest · Ayushman Bharat ready
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
