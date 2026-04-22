"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, CalendarDays, Plus, Clock, MapPin, UserCheck,
  CheckCircle2, ChevronLeft, ChevronRight, X, Repeat,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Visit = {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_address: string;
  caregiver_id: string | null;
  caregiver_name: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  check_in_time: string | null;
  gps_verified: boolean;
  duration_minutes: number | null;
  services: string[];
};

type Patient = { id: string; full_name: string; risk_level: string };
type Caregiver = { id: string; full_name: string; email: string; is_active: boolean };

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function SchedulePage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const load = useCallback(async () => {
    const from = weekStart.toISOString().split("T")[0];
    const to = weekEnd.toISOString().split("T")[0];
    const [vRes, pRes, cRes] = await Promise.all([
      fetch(`/api/admin/visits?from=${from}&to=${to}`, { credentials: "include" }),
      fetch("/api/admin/patients", { credentials: "include" }),
      fetch("/api/admin/caregivers", { credentials: "include" }),
    ]);
    if (vRes.ok) setVisits((await vRes.json()).visits || []);
    if (pRes.ok) setPatients((await pRes.json()).patients || []);
    if (cRes.ok) setCaregivers((await cRes.json()).caregivers || []);
    setLoading(false);
  }, [weekStart, weekEnd]);

  useEffect(() => { load(); }, [load]);

  function navigateWeek(dir: "prev" | "next" | "today") {
    const d = new Date(weekStart);
    if (dir === "today") setWeekStart(getWeekStart(new Date()));
    else { d.setDate(d.getDate() + (dir === "next" ? 7 : -7)); setWeekStart(d); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  const scheduled = visits.filter((v) => v.status === "scheduled").length;
  const inProgress = visits.filter((v) => v.status === "in_progress").length;
  const completed = visits.filter((v) => v.status === "completed").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-black">Visit Schedule</h2>
          <p className="text-sm text-muted-foreground">Plan and assign visits across your team</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-brand hover:bg-brand-dark text-white rounded-full">
          <Plus className="w-4 h-4 mr-2" />Schedule Visit
        </Button>
      </div>

      {/* Week nav + summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")} className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek("today")} className="h-8 text-xs">Today</Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek("next")} className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
              <div className="ml-3">
                <div className="text-sm font-semibold">
                  {weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {weekEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <div className="text-[10px] text-muted-foreground">{visits.length} visits this week</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap text-xs">
              <Badge className="bg-amber-100 text-amber-700">{scheduled} Scheduled</Badge>
              <Badge className="bg-blue-100 text-blue-700">{inProgress} In Progress</Badge>
              <Badge className="bg-green-100 text-green-700">{completed} Completed</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week calendar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayVisits = visits.filter((v) => {
                const vd = new Date(v.scheduled_start);
                return vd.toDateString() === day.toDateString();
              }).sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={day.toISOString()} className={`rounded-xl border p-2 min-h-[180px] ${isToday ? "border-brand bg-brand/5" : "border-border bg-muted/10"}`}>
                  <div className={`text-[10px] font-semibold mb-1 ${isToday ? "text-brand" : "text-muted-foreground"}`}>
                    {day.toLocaleDateString("en-IN", { weekday: "short" })}
                  </div>
                  <div className={`text-xl font-[var(--font-heading)] font-black mb-2 ${isToday ? "text-brand" : ""}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayVisits.length === 0 ? (
                      <div className="text-[9px] text-muted-foreground/40">—</div>
                    ) : (
                      dayVisits.slice(0, 5).map((v) => (
                        <div key={v.id} className={`text-[9px] rounded px-1 py-0.5 font-medium truncate ${
                          v.status === "completed" ? "bg-green-100 text-green-700" :
                          v.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                        }`} title={`${v.patient_name} — ${v.caregiver_name}`}>
                          {new Date(v.scheduled_start).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} {v.patient_name.split(" ")[0]}
                        </div>
                      ))
                    )}
                    {dayVisits.length > 5 && (
                      <div className="text-[9px] text-muted-foreground font-medium">+{dayVisits.length - 5} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Visit list (detailed) */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-[var(--font-heading)] font-bold mb-3">All Visits This Week</h3>
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No visits scheduled for this week</p>
          ) : (
            <div className="space-y-2">
              {visits.sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()).map((v, i) => (
                <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                    v.status === "completed" ? "border-green-200 bg-green-50/30" :
                    v.status === "in_progress" ? "border-blue-200 bg-blue-50/30" :
                    "border-border"
                  }`}>
                    <div className="text-center min-w-[52px]">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">{new Date(v.scheduled_start).toLocaleDateString("en-IN", { weekday: "short" })}</div>
                      <div className="text-base font-[var(--font-heading)] font-black">{new Date(v.scheduled_start).getDate()}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(v.scheduled_start).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{v.patient_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{v.patient_address || "No address"}</span>
                        <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{v.caregiver_name}</span>
                      </div>
                    </div>
                    <Badge className={`text-[9px] ${
                      v.status === "completed" ? "bg-green-100 text-green-700" :
                      v.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {v.status === "completed" ? `✓ ${v.duration_minutes || 0}m` : v.status === "in_progress" ? "🔵 Active" : "Scheduled"}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showCreate && (
          <ScheduleVisitModal
            patients={patients}
            caregivers={caregivers.filter((c) => c.is_active)}
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Schedule visit modal ────────────────────────────────────────────────────
function ScheduleVisitModal({ patients, caregivers, onClose, onCreated }: {
  patients: Patient[]; caregivers: Caregiver[];
  onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    patient_id: "",
    caregiver_id: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "10:00",
    duration: "60",
    services: [] as string[],
    recurring: false,
    frequency: "daily" as "daily" | "weekly",
    occurrences: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const SERVICES = ["Personal Care", "Medication Assistance", "Meal Preparation", "Mobility Support", "Wound Care", "Nursing"];

  function toggleService(s: string) {
    setForm({ ...form, services: form.services.includes(s) ? form.services.filter((x) => x !== s) : [...form.services, s] });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const start = new Date(`${form.date}T${form.start_time}:00`);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + Number(form.duration));

    const payload = {
      patient_id: form.patient_id,
      caregiver_id: form.caregiver_id,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      services: form.services,
      recurring: form.recurring ? { frequency: form.frequency, occurrences: Number(form.occurrences) } : undefined,
    };

    const res = await fetch("/api/admin/visits", {
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
        className="bg-white rounded-2xl max-w-lg w-full shadow-xl my-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="font-[var(--font-heading)] font-bold text-lg">Schedule Visit</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Assign a caregiver to a patient at a specific time</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0"><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Patient *</label>
            <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
              <option value="">Select a patient</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name} — {p.risk_level}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Caregiver *</label>
            <select value={form.caregiver_id} onChange={(e) => setForm({ ...form, caregiver_id: e.target.value })} required
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
              <option value="">Select a caregiver</option>
              {caregivers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium mb-1 block">Date *</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Start Time *</label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Duration (min)</label>
              <Input type="number" min="15" max="480" step="15" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Services</label>
            <div className="flex flex-wrap gap-1.5">
              {SERVICES.map((s) => (
                <button key={s} type="button" onClick={() => toggleService(s)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    form.services.includes(s) ? "bg-brand text-white" : "bg-white border border-border text-muted-foreground hover:border-brand/50"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} />
              <Repeat className="w-4 h-4 text-brand" />
              <span className="text-sm font-medium">Repeat this visit</span>
            </label>
            {form.recurring && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="text-[10px] font-medium mb-1 block">Frequency</label>
                  <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as "daily" | "weekly" })}
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm">
                    <option value="daily">Every day</option>
                    <option value="weekly">Every week</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium mb-1 block">Occurrences (max 30)</label>
                  <Input type="number" min="1" max="30" value={form.occurrences} onChange={(e) => setForm({ ...form, occurrences: Number(e.target.value) })} />
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-brand hover:bg-brand-dark text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : form.recurring ? `Create ${form.occurrences} visits` : "Schedule Visit"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
