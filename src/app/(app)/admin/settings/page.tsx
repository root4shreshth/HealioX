"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Building2, Mail, Phone, Globe, MapPin,
  Save, CheckCircle2, Users, UserCog, Heart, CreditCard,
  Shield, Zap,
} from "lucide-react";
import Link from "next/link";

type Organization = {
  id: string;
  name: string;
  type: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  plan: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Stats = { total_members: number; total_patients: number; total_caregivers: number };

const ORG_TYPES = [
  { value: "hospital", label: "Hospital" },
  { value: "home_care", label: "Home Care Agency" },
  { value: "clinic", label: "Clinic" },
  { value: "nursing_home", label: "Nursing Home" },
  { value: "provider", label: "Other Care Provider" },
];

const PLANS = {
  trial:        { label: "Trial", price: "Free", limits: "14 days, up to 5 patients" },
  fixed:        { label: "Fixed", price: "₹30,000/month", limits: "Flat fee · unlimited patients & caregivers" },
  per_caregiver:{ label: "Per Caregiver", price: "₹1,000/caregiver/month", limits: "Pay only for active caregivers · unlimited patients" },
  enterprise:   { label: "Enterprise", price: "Custom", limits: "Fully customised · SLA · dedicated success manager" },
};

export default function SettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Partial<Organization>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/organization", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setOrg(data.organization);
      setStats(data.stats);
      setForm({
        name: data.organization.name || "",
        type: data.organization.type || "home_care",
        address: data.organization.address || "",
        phone: data.organization.phone || "",
        email: data.organization.email || "",
        website: data.organization.website || "",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      load();
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  const plan = org?.plan || "trial";
  const planInfo = PLANS[plan as keyof typeof PLANS] || PLANS.trial;
  const trialStartedAt = (org?.metadata?.trial_started_at as string) || org?.created_at;
  const daysIntoTrial = trialStartedAt
    ? Math.floor((Date.now() - new Date(trialStartedAt).getTime()) / 86400000)
    : 0;
  const trialDays = (org?.metadata?.trial_days as number) || 14;
  const trialRemaining = Math.max(0, trialDays - daysIntoTrial);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="font-[var(--font-heading)] text-2xl font-black">Organization Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your organization profile, plan, and preferences</p>
      </div>

      {/* Plan card */}
      <Card className="border-brand/20 bg-brand/5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-brand" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Current Plan</span>
              </div>
              <h3 className="font-[var(--font-heading)] text-xl font-black">{planInfo.label}</h3>
              <p className="text-sm text-muted-foreground">{planInfo.limits}</p>
              {plan === "trial" && trialRemaining > 0 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" />{trialRemaining} days remaining in trial
                </p>
              )}
              {plan === "trial" && trialRemaining === 0 && (
                <p className="text-xs text-red-600 mt-2 font-semibold">Trial expired — upgrade to continue</p>
              )}
            </div>
            <div className="text-right">
              <div className="font-[var(--font-heading)] text-2xl font-black text-brand">{planInfo.price}</div>
              <Link href="/pricing">
                <Button size="sm" className="bg-brand hover:bg-brand-dark text-white rounded-full mt-2">
                  {plan === "trial" ? "Upgrade Plan" : "Change Plan"}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center">
            <Users className="w-5 h-5 text-brand mx-auto mb-1" />
            <div className="font-[var(--font-heading)] text-2xl font-black">{stats.total_patients}</div>
            <div className="text-[10px] text-muted-foreground">Active patients</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <UserCog className="w-5 h-5 text-teal mx-auto mb-1" />
            <div className="font-[var(--font-heading)] text-2xl font-black">{stats.total_caregivers}</div>
            <div className="text-[10px] text-muted-foreground">Caregivers</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Heart className="w-5 h-5 text-violet-500 mx-auto mb-1" />
            <div className="font-[var(--font-heading)] text-2xl font-black">{stats.total_members}</div>
            <div className="text-[10px] text-muted-foreground">Total members</div>
          </CardContent></Card>
        </div>
      )}

      {/* Org profile */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-[var(--font-heading)] font-bold mb-4">Organization Profile</h3>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Organization Name *</label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Type</label>
              <select value={form.type || "home_care"} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Address</label>
              <Textarea value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="resize-none" placeholder="Street address, city, state, PIN" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Phone</label>
                <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Contact Email</label>
                <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@agency.in" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 flex items-center gap-1"><Globe className="w-3.5 h-3.5" />Website</label>
              <Input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://agency.in" />
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand-dark text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
              {saved && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />Saved
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-[var(--font-heading)] font-bold mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-brand" />Security & Compliance</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-sm font-semibold">Role-based access</span></div>
              <p className="text-xs text-muted-foreground mt-1">All users have scoped permissions</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-sm font-semibold">GPS verification</span></div>
              <p className="text-xs text-muted-foreground mt-1">All caregiver visits verified</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-sm font-semibold">Activity audit log</span></div>
              <p className="text-xs text-muted-foreground mt-1">Every admin action logged</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-sm font-semibold">Encrypted at rest</span></div>
              <p className="text-xs text-muted-foreground mt-1">Database-level encryption</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardContent className="p-5">
          <h3 className="font-[var(--font-heading)] font-bold mb-3 text-red-600">Danger Zone</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Close organization account</p>
              <p className="text-xs text-muted-foreground mt-0.5">Permanently delete all data including patients, caregivers, and visit history.</p>
            </div>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">Contact Support</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
