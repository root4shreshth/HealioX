"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Search, UserPlus, X, MapPin, Phone, Heart,
  Shield, Activity, AlertCircle, ChevronDown, Download,
  CheckCircle2, User, Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Patient = {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: string | null;
  address: string;
  phone: string | null;
  primary_conditions: string[] | null;
  risk_level: string;
  risk_score: number;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  national_health_id: string | null;
  is_active: boolean;
  created_at: string;
};

type Caregiver = { id: string; full_name: string; email: string };

const RISK_BADGE: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  moderate: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  emergency: "bg-red-600 text-white",
};

export default function PatientsManagePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([
      fetch("/api/admin/patients", { credentials: "include" }),
      fetch("/api/admin/caregivers", { credentials: "include" }),
    ]);
    if (pRes.ok) setPatients((await pRes.json()).patients || []);
    if (cRes.ok) setCaregivers((await cRes.json()).caregivers || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = patients.filter((p) => {
    if (riskFilter !== "all" && p.risk_level !== riskFilter) return false;
    if (search && !p.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function exportCSV() {
    const headers = ["Name", "DOB", "Gender", "Risk Level", "Risk Score", "Conditions", "Address", "Phone", "Emergency Contact"];
    const rows = filtered.map((p) => [
      p.full_name, p.date_of_birth, p.gender || "", p.risk_level, p.risk_score,
      (p.primary_conditions || []).join("; "), p.address, p.phone || "",
      p.emergency_contact_name || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `patients-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-black">Patients</h2>
          <p className="text-sm text-muted-foreground">Onboard, monitor, and manage all patients under care</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} size="sm" className="rounded-full text-xs"><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
          <Button onClick={() => setShowCreate(true)} className="bg-brand hover:bg-brand-dark text-white rounded-full">
            <UserPlus className="w-4 h-4 mr-2" />Onboard Patient
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Patients", value: patients.length, icon: User, color: "text-brand", bg: "bg-brand/10" },
          { label: "High Risk", value: patients.filter((p) => ["high", "emergency"].includes(p.risk_level)).length, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Moderate", value: patients.filter((p) => p.risk_level === "moderate").length, icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Low Risk", value: patients.filter((p) => p.risk_level === "low").length, icon: Shield, color: "text-green-600", bg: "bg-green-50" },
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

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", "emergency", "high", "moderate", "low"].map((level) => (
            <button key={level} onClick={() => setRiskFilter(level)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                riskFilter === level ? "bg-brand text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}>
              {level} ({level === "all" ? patients.length : patients.filter((p) => p.risk_level === level).length})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <User className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{search || riskFilter !== "all" ? "No matches" : "No patients onboarded yet"}</p>
            {!search && riskFilter === "all" && (
              <Button onClick={() => setShowCreate(true)} className="mt-4 bg-brand text-white rounded-full">
                <UserPlus className="w-4 h-4 mr-2" />Onboard Your First Patient
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p, i) => {
            const age = Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / 31557600000);
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="hover:shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          ["high", "emergency"].includes(p.risk_level) ? "bg-red-100 text-red-700" :
                          p.risk_level === "moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                        }`}>
                          {p.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm truncate">{p.full_name}</p>
                            <span className="text-[10px] text-muted-foreground">{age}y · {p.gender || "—"}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{p.address}</span>
                            {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
                          </div>
                          {p.primary_conditions && p.primary_conditions.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {p.primary_conditions.slice(0, 3).map((c) => (
                                <Badge key={c} variant="secondary" className="text-[9px] px-1.5 py-0">{c}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-[var(--font-heading)] font-black text-2xl">{p.risk_score}</div>
                        <Badge className={`text-[9px] ${RISK_BADGE[p.risk_level]}`}>{p.risk_level}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreatePatientModal
            caregivers={caregivers}
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Patient onboarding modal ────────────────────────────────────────────────
function CreatePatientModal({ caregivers, onClose, onCreated }: { caregivers: Caregiver[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "",
    address: "",
    phone: "",
    primary_conditions: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    national_health_id: "",
    risk_level: "low" as "low" | "moderate" | "high" | "emergency",
    assigned_caregiver_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      ...form,
      primary_conditions: form.primary_conditions.split(",").map((s) => s.trim()).filter(Boolean),
      assigned_caregiver_id: form.assigned_caregiver_id || undefined,
    };

    const res = await fetch("/api/admin/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "Failed to create"); return; }
    onCreated();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-xl my-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="font-[var(--font-heading)] font-bold text-lg">Onboard New Patient</h3>
            <p className="text-xs text-muted-foreground mt-0.5">This creates the patient record and optionally schedules their first visit</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0"><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Full Name *</label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Sunita Devi" required />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Date of Birth *</label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Gender</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">Not specified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98100 00000" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Address *</label>
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="12 Rajpur Road, Civil Lines, Delhi 110054" required rows={2} className="resize-none" />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Primary Conditions</label>
            <Input value={form.primary_conditions} onChange={(e) => setForm({ ...form, primary_conditions: e.target.value })} placeholder="Arthritis, Hypertension, Diabetes (comma separated)" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Emergency Contact Name</label>
              <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} placeholder="Son/Daughter name" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Emergency Phone</label>
              <Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} placeholder="+91 98200 00000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Initial Risk Level</label>
              <select value={form.risk_level} onChange={(e) => setForm({ ...form, risk_level: e.target.value as typeof form.risk_level })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="low">Low — stable</option>
                <option value="moderate">Moderate — monitor</option>
                <option value="high">High — needs attention</option>
                <option value="emergency">Emergency — critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">National Health ID / Aadhaar</label>
              <Input value={form.national_health_id} onChange={(e) => setForm({ ...form, national_health_id: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Assign Caregiver</label>
            <select value={form.assigned_caregiver_id} onChange={(e) => setForm({ ...form, assigned_caregiver_id: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
              <option value="">No assignment yet</option>
              {caregivers.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">A visit will be auto-scheduled for tomorrow 10 AM if assigned</p>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-brand hover:bg-brand-dark text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Onboard Patient"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
