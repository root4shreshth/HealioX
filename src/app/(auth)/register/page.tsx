"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeartPulse, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const roles = [
  {
    value: "caregiver",
    label: "Caregiver",
    description: "I provide care services",
    color: "border-brand bg-brand/5 text-brand",
  },
  {
    value: "patient",
    label: "Patient",
    description: "I receive care services",
    color: "border-teal bg-teal/5 text-teal",
  },
  {
    value: "family",
    label: "Family Member",
    description: "I monitor a loved one",
    color: "border-violet-500 bg-violet-50 text-violet-600",
  },
  {
    value: "provider_admin",
    label: "Provider Admin",
    description: "I manage a care organization",
    color: "border-slate-500 bg-slate-50 text-slate-600",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Sign up
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, role },
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Create profile
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          full_name: name,
          role,
        });
      }

      // Route based on role
      if (role === "caregiver") router.push("/caregiver");
      else if (role === "patient") router.push("/patient");
      else router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="lg:hidden flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
          <HeartPulse className="w-6 h-6 text-white" />
        </div>
        <span className="font-[var(--font-heading)] font-bold text-xl">AayuCare</span>
      </div>

      <div>
        <h2 className="font-[var(--font-heading)] text-3xl font-black tracking-tight">
          Create Account
        </h2>
        <p className="mt-2 text-muted-foreground">
          Join AayuCare and transform care delivery
        </p>
      </div>

      <form onSubmit={handleRegister} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">I am a...</label>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  role === r.value
                    ? r.color
                    : "border-border bg-white hover:border-muted-foreground/30"
                }`}
              >
                <div className="text-sm font-semibold">{r.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="name" placeholder="John Smith" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-11" required />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="reg-email">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="reg-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="reg-password">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="reg-password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" required minLength={6} />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading || !role}
          className="w-full h-11 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
