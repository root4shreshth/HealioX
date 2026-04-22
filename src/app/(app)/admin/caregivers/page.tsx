"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserPlus, Loader2, Search, Mail, Phone, Shield, Clock,
  CheckCircle2, XCircle, Copy, Check, UserCog, Star, AlertCircle,
  Trash2, Power, PowerOff, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Caregiver = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stats_today: { assigned: number; completed: number; late: number; avgMin: number };
};

export default function CaregiversPage() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createdCred, setCreatedCred] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/caregivers", { credentials: "include" });
    if (res.ok) {
      const { caregivers } = await res.json();
      setCaregivers(caregivers || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleActive(cg: Caregiver) {
    await fetch(`/api/admin/caregivers/${cg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: !cg.is_active }),
    });
    load();
  }

  async function handleDeactivate(cg: Caregiver) {
    if (!confirm(`Deactivate ${cg.full_name}? They won't be able to log in. Visit history is preserved.`)) return;
    await fetch(`/api/admin/caregivers/${cg.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    load();
  }

  const filtered = caregivers.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const active = caregivers.filter((c) => c.is_active).length;
  const inactive = caregivers.length - active;
  const lateToday = caregivers.reduce((s, c) => s + c.stats_today.late, 0);
  const completedToday = caregivers.reduce((s, c) => s + c.stats_today.completed, 0);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-black">Caregivers</h2>
          <p className="text-sm text-muted-foreground">Create, manage, and monitor your care team</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-brand hover:bg-brand-dark text-white rounded-full">
          <UserPlus className="w-4 h-4 mr-2" />Add Caregiver
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Caregivers", value: caregivers.length, icon: UserCog, color: "text-brand", bg: "bg-brand/10" },
          { label: "Active", value: active, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Deactivated", value: inactive, icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
          { label: "Late Today", value: lateToday, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
              <div className="font-[var(--font-heading)] text-xl font-black">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <UserCog className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{search ? "No matches" : "No caregivers yet. Add your first one."}</p>
            {!search && (
              <Button onClick={() => setShowCreate(true)} className="mt-4 bg-brand text-white rounded-full">
                <UserPlus className="w-4 h-4 mr-2" />Add Caregiver
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((cg, i) => (
            <motion.div key={cg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={`hover:shadow-md transition-all ${!cg.is_active ? "opacity-60" : ""} ${cg.stats_today.late > 0 ? "border-amber-200" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-full bg-brand/10 flex items-center justify-center text-sm font-bold text-brand shrink-0">
                        {cg.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate">{cg.full_name}</p>
                          {!cg.is_active && <Badge className="bg-gray-100 text-gray-500 text-[9px]">Deactivated</Badge>}
                          {cg.stats_today.late > 0 && <Badge className="bg-amber-100 text-amber-700 text-[9px]"><Clock className="w-2.5 h-2.5 mr-0.5" />{cg.stats_today.late} late</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{cg.email}</span>
                          {cg.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cg.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => handleToggleActive(cg)} title={cg.is_active ? "Pause access" : "Restore access"} className="h-8 w-8 p-0">
                        {cg.is_active ? <Power className="w-4 h-4 text-green-600" /> : <PowerOff className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeactivate(cg)} title="Deactivate" className="h-8 w-8 p-0 hover:bg-red-50">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Today's stats */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[
                      { label: "Assigned", value: cg.stats_today.assigned },
                      { label: "Completed", value: cg.stats_today.completed },
                      { label: "Late", value: cg.stats_today.late, warn: cg.stats_today.late > 0 },
                      { label: "Avg mins", value: cg.stats_today.avgMin || "—" },
                    ].map((stat) => (
                      <div key={stat.label} className={`text-center rounded-lg p-2 ${stat.warn ? "bg-amber-50 border border-amber-200" : "bg-muted/30"}`}>
                        <div className={`font-[var(--font-heading)] font-black text-base ${stat.warn ? "text-amber-600" : ""}`}>{stat.value}</div>
                        <div className="text-[9px] text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Completion rate */}
                  {cg.stats_today.assigned > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Today's completion</span>
                        <span>{Math.round((cg.stats_today.completed / cg.stats_today.assigned) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${(cg.stats_today.completed / cg.stats_today.assigned) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateCaregiverModal
            onClose={() => setShowCreate(false)}
            onCreated={(cred) => { setCreatedCred(cred); setShowCreate(false); load(); }}
          />
        )}
        {createdCred && (
          <CredentialsModal credentials={createdCred} onClose={() => setCreatedCred(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Create caregiver modal ───────────────────────────────────────────────────
function CreateCaregiverModal({ onClose, onCreated }: { onClose: () => void; onCreated: (cred: { email: string; password: string }) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/admin/caregivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ full_name: name, email, phone: phone || undefined, password }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "Failed to create"); return; }
    onCreated({ email, password });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="font-[var(--font-heading)] font-bold text-lg">Add Caregiver</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Creates a login account and generates credentials</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0"><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Full Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Sharma" required />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Email *</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ravi@sevacare.in" required />
            <p className="text-[10px] text-muted-foreground mt-1">Used for login</p>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98100 00000" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Temporary Password *</label>
            <div className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="font-mono text-sm" />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())} size="sm">Regen</Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">They can change this on first login</p>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-brand hover:bg-brand-dark text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Credentials modal (shown after create) ──────────────────────────────────
function CredentialsModal({ credentials, onClose }: { credentials: { email: string; password: string }; onClose: () => void }) {
  const [copied, setCopied] = useState<"email" | "password" | "both" | null>(null);

  function copy(text: string, kind: "email" | "password" | "both") {
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 text-center border-b">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-[var(--font-heading)] font-bold text-lg">Caregiver Created</h3>
          <p className="text-xs text-muted-foreground mt-1">Share these credentials securely. This is the only time the password is shown.</p>
        </div>

        <div className="p-5 space-y-3">
          <div className="bg-muted/30 rounded-xl p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Email</div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm font-mono truncate">{credentials.email}</code>
              <Button size="sm" variant="ghost" onClick={() => copy(credentials.email, "email")} className="h-7 w-7 p-0 shrink-0">
                {copied === "email" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Temporary Password</div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm font-mono truncate">{credentials.password}</code>
              <Button size="sm" variant="ghost" onClick={() => copy(credentials.password, "password")} className="h-7 w-7 p-0 shrink-0">
                {copied === "password" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <Button
            className="w-full bg-brand hover:bg-brand-dark text-white"
            onClick={() => copy(`Login: ${credentials.email}\nPassword: ${credentials.password}\nSign in at: ${window.location.origin}/login`, "both")}
          >
            {copied === "both" ? <><Check className="w-4 h-4 mr-2" />Copied!</> : <><Copy className="w-4 h-4 mr-2" />Copy Login Details</>}
          </Button>

          <Button variant="outline" onClick={onClose} className="w-full">Done</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Generate a memorable 8-char password with mixed case + digit
function generatePassword(): string {
  const words = ["care", "seva", "heal", "help", "safe", "kind"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  const cap = word.charAt(0).toUpperCase() + word.slice(1);
  return `${cap}${num}!`;
}
