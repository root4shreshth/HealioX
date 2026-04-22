"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin, Play, Square, Loader2, Camera, MessageCircle,
  MapPinCheck, CheckCircle2, Clock, Navigation, Shield, Database,
  ClipboardList, ChevronDown, ChevronUp, FileText,
  Activity, AlertTriangle, Brain, TrendingDown, TrendingUp,
  ArrowRight, Info,
} from "lucide-react";
import { useVisits, useRealtimeRefresh } from "@/hooks/use-supabase-data";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const SERVICE_TYPES = [
  { label: "Personal Care", icon: "🧼" }, { label: "Medication Assistance", icon: "💊" },
  { label: "Meal Preparation", icon: "🍽️" }, { label: "Mobility Support", icon: "🚶" },
  { label: "Wound Care", icon: "🩹" }, { label: "Social Support", icon: "💬" },
  { label: "Domestic Assistance", icon: "🏠" }, { label: "Nursing", icon: "🏥" },
];

const DEFAULT_TASKS = [
  { title: "Check vital signs", category: "nursing", desc: "Blood pressure, temperature, pulse" },
  { title: "Administer medication", category: "medication", desc: "Ensure all prescribed meds taken" },
  { title: "Personal hygiene assistance", category: "personal_care", desc: "Bathing, grooming, dressing" },
  { title: "Prepare meal/snack", category: "meal", desc: "Nutritious meal as per diet plan" },
  { title: "Mobility exercises", category: "mobility", desc: "Guided stretches, walking assistance" },
  { title: "Emotional check-in", category: "social", desc: "Conversation, companionship, mood observation" },
];

type LastCheckin = {
  risk_score: number | null;
  risk_level: string | null;
  ai_summary: string | null;
  flags: string[];
  domains: Record<string, { score: number; trend: string; notes?: string }>;
  created_at: string;
};

const riskColor: Record<string, string> = {
  low: "text-green-600 bg-green-50 border-green-200",
  moderate: "text-amber-600 bg-amber-50 border-amber-200",
  high: "text-red-600 bg-red-50 border-red-200",
  emergency: "text-white bg-red-600 border-red-600",
};

export default function CaregiverPortal() {
  const router = useRouter();
  const { visits, setVisits, loading, refetch } = useVisits();
  const [activeVisit, setActiveVisit] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPatient, setLastPatient] = useState({ id: "", name: "" });

  // Task management
  const [tasks, setTasks] = useState(DEFAULT_TASKS.map((t, i) => ({ ...t, id: `task-${i}`, done: false })));
  const [showTasks, setShowTasks] = useState(true);

  // Daily update
  const [dailyUpdate, setDailyUpdate] = useState("");
  const [moodObs, setMoodObs] = useState("");

  // Patient history (last AI check-in per patient)
  const [patientHistory, setPatientHistory] = useState<Record<string, LastCheckin | null>>({});
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const active = visits.find((v) => v.id === activeVisit);

  // Load last check-in for each patient in the visit list
  useEffect(() => {
    if (visits.length === 0) return;
    async function loadHistory() {
      const supabase = createClient();
      const patientIds = [...new Set(visits.map((v) => v.patient_id))];
      const results: Record<string, LastCheckin | null> = {};
      await Promise.all(
        patientIds.map(async (pid) => {
          const { data } = await supabase
            .from("health_checkins")
            .select("risk_score, risk_level, ai_summary, flags, domains, created_at")
            .eq("patient_id", pid)
            .eq("completed", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          results[pid] = data as LastCheckin | null;
        })
      );
      setPatientHistory(results);
    }
    loadHistory();
  }, [visits]);

  useEffect(() => {
    if (!activeVisit) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [activeVisit]);

  const handleRefresh = useCallback(() => { refetch(); }, [refetch]);
  useRealtimeRefresh(["visits"], handleRefresh);

  async function handleCheckIn(visitId: string) {
    setCheckingIn(true);
    let lat = 28.6139, lng = 77.2090; // Default: New Delhi
    try {
      const pos = await new Promise<GeolocationPosition>((r, e) => navigator.geolocation.getCurrentPosition(r, e, { timeout: 5000 }));
      lat = pos.coords.latitude; lng = pos.coords.longitude;
    } catch { /* use defaults */ }

    try {
      const supabase = createClient();
      await supabase.from("visits").update({
        status: "in_progress", check_in_time: new Date().toISOString(),
        check_in_lat: lat, check_in_lng: lng, gps_verified: true,
      }).eq("id", visitId);
    } catch { /* continue */ }

    setVisits((prev) => prev.map((v) =>
      v.id === visitId ? { ...v, status: "in_progress", check_in_time: new Date().toISOString(), gps_verified: true } : v
    ));
    setActiveVisit(visitId);
    setCheckingIn(false);
    setElapsed(0);
    setTasks(DEFAULT_TASKS.map((t, i) => ({ ...t, id: `task-${i}`, done: false })));
    setExpandedHistory(null);
  }

  async function handleCheckOut() {
    if (!activeVisit || !active) return;
    const duration = Math.round(elapsed / 60) || 1;
    setLastPatient({ id: active.patient_id, name: active.patient_name });

    try {
      const supabase = createClient();
      const notesField = [notes, handoverNotes ? `\n\n📋 HANDOVER: ${handoverNotes}` : ""].join("").trim();
      await supabase.from("visits").update({
        status: "completed", check_out_time: new Date().toISOString(),
        duration_minutes: duration, services: selectedServices,
        caregiver_notes: notesField,
      }).eq("id", activeVisit);

      if (dailyUpdate || moodObs) {
        await supabase.from("daily_updates").insert({
          patient_id: active.patient_id,
          caregiver_id: (await supabase.auth.getUser()).data.user?.id || "unknown",
          visit_id: activeVisit,
          content: dailyUpdate || `Visit completed. ${tasks.filter((t) => t.done).length}/${tasks.length} tasks done.`,
          mood_observation: moodObs || null,
          medication_taken: tasks.find((t) => t.category === "medication")?.done || false,
          concerns: [],
        });
      }
    } catch { /* continue */ }

    setVisits((prev) => prev.map((v) =>
      v.id === activeVisit
        ? { ...v, status: "completed", check_out_time: new Date().toISOString(), duration_minutes: duration, services: selectedServices, caregiver_notes: notes }
        : v
    ));
    setActiveVisit(null);
    setSelectedServices([]);
    setNotes("");
    setHandoverNotes("");
    setDailyUpdate("");
    setMoodObs("");
    setElapsed(0);
    setShowSuccess(true);
  }

  async function seedData() { await fetch("/api/seed", { method: "POST" }); refetch(); }

  function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  }
  function formatScheduledTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  function formatRelativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  if (visits.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-[var(--font-heading)] text-xl font-bold">No Visits Assigned</h3>
        <p className="text-sm text-muted-foreground mt-2">You have no visits scheduled today.</p>
        <Button onClick={seedData} className="mt-6 bg-brand hover:bg-brand-dark text-white rounded-full px-6">
          <Database className="w-4 h-4 mr-2" />Seed Demo Data
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-black">My Assigned Visits</h2>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <Badge variant="secondary" className="text-xs"><Shield className="w-3 h-3 mr-1" />GPS Active</Badge>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><div className="text-xl font-[var(--font-heading)] font-black">{visits.length}</div><div className="text-[10px] text-muted-foreground">Assigned</div></CardContent></Card>
        <Card className="border-green-200 bg-green-50/50"><CardContent className="p-3 text-center"><div className="text-xl font-[var(--font-heading)] font-black text-green-600">{visits.filter((v) => v.status === "completed").length}</div><div className="text-[10px] text-muted-foreground">Completed</div></CardContent></Card>
        <Card className="border-blue-200 bg-blue-50/50"><CardContent className="p-3 text-center"><div className="text-xl font-[var(--font-heading)] font-black text-blue-600">{visits.filter((v) => v.status === "scheduled").length}</div><div className="text-[10px] text-muted-foreground">Remaining</div></CardContent></Card>
      </div>

      {/* Post-checkout success */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-teal bg-teal/5 shadow-lg">
              <CardContent className="p-5 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                <h3 className="font-[var(--font-heading)] font-bold text-lg">Visit Completed & Verified!</h3>
                <p className="text-sm text-muted-foreground">Run an AI health check-in for <strong>{lastPatient.name}</strong>?</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => { setShowSuccess(false); router.push(`/patient/checkin?patientId=${lastPatient.id}&patientName=${encodeURIComponent(lastPatient.name)}`); }}
                    className="bg-teal hover:bg-teal-dark text-white rounded-full px-6"><MessageCircle className="w-4 h-4 mr-2" />Start AI Check-in</Button>
                  <Button variant="outline" onClick={() => setShowSuccess(false)} className="rounded-full">Skip</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active visit panel */}
      <AnimatePresence>
        {active && active.status === "in_progress" && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-brand bg-brand/5 shadow-lg overflow-hidden">
              <div className="bg-green-500 text-white px-5 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium"><MapPinCheck className="w-4 h-4" />GPS Verified — At {active.patient_name}&apos;s location</div>
                <div className="flex items-center gap-1 text-sm font-mono"><Clock className="w-3 h-3" />{formatTime(elapsed)}</div>
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-[var(--font-heading)] font-bold text-xl">{active.patient_name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{active.patient_address}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-[var(--font-heading)] text-3xl font-black text-brand tabular-nums">{formatTime(elapsed)}</div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>
                </div>

                {/* TASK CHECKLIST */}
                <div>
                  <button onClick={() => setShowTasks(!showTasks)} className="flex items-center justify-between w-full text-sm font-semibold mb-2">
                    <span className="flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-brand" />Daily Tasks ({tasks.filter((t) => t.done).length}/{tasks.length})</span>
                    {showTasks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showTasks && (
                    <div className="space-y-1.5">
                      {tasks.map((task) => (
                        <button key={task.id} onClick={() => setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, done: !t.done } : t))}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${task.done ? "bg-green-50 border border-green-200" : "bg-white border border-border hover:border-brand/30"}`}>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${task.done ? "bg-green-500 border-green-500" : "border-muted-foreground/30"}`}>
                            {task.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${task.done ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                            <p className="text-[10px] text-muted-foreground">{task.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Service logging */}
                <div>
                  <p className="text-sm font-semibold mb-2">Services Delivered:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SERVICE_TYPES.map((s) => (
                      <button key={s.label} onClick={() => setSelectedServices((p) => p.includes(s.label) ? p.filter((x) => x !== s.label) : [...p, s.label])}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${selectedServices.includes(s.label) ? "bg-brand text-white" : "bg-white border border-border text-muted-foreground hover:border-brand/50"}`}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily update */}
                <div>
                  <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-teal" />Daily Update (visible to family):</p>
                  <Textarea placeholder="How was the patient today? Any observations, changes, or concerns..." value={dailyUpdate} onChange={(e) => setDailyUpdate(e.target.value)} className="resize-none bg-white text-sm" rows={2} />
                  <div className="mt-2">
                    <label className="text-xs font-medium text-muted-foreground">Mood observation:</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {["Happy", "Calm", "Anxious", "Sad", "Confused", "Agitated"].map((m) => (
                        <button key={m} onClick={() => setMoodObs(m)}
                          className={`px-2 py-1 rounded-full text-[10px] font-medium ${moodObs === m ? "bg-teal text-white" : "bg-white border border-border text-muted-foreground"}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Care notes */}
                <div>
                  <p className="text-sm font-semibold mb-1">Additional Care Notes:</p>
                  <Textarea placeholder="Detailed care notes, observations, vitals recorded..." value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none bg-white text-sm" rows={2} />
                </div>

                {/* ── SHIFT HANDOVER NOTES ── */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-sm font-semibold mb-1.5 flex items-center gap-1.5 text-amber-700">
                    <ArrowRight className="w-4 h-4" />Shift Handover Notes
                    <span className="text-[10px] font-normal text-amber-600 ml-1">(for the next caregiver)</span>
                  </p>
                  <Textarea
                    placeholder="E.g. Patient complained of knee pain — will need physio support. Left side bed rail was lowered overnight. Next dose of metformin at 8 PM..."
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    className="resize-none bg-white text-sm border-amber-200 focus:ring-amber-300"
                    rows={3}
                  />
                  <p className="text-[10px] text-amber-600 mt-1.5">These notes will be shown to the next caregiver before their visit.</p>
                </div>

                <Button onClick={handleCheckOut} className="w-full bg-red-500 hover:bg-red-600 text-white h-12 text-base rounded-xl">
                  <Square className="w-4 h-4 mr-2" />Complete Visit & Check Out
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visit list */}
      <div className="space-y-4">
        {visits.map((visit, i) => {
          const history = patientHistory[visit.patient_id];
          const isScheduled = visit.status === "scheduled";
          const isExpanded = expandedHistory === visit.id;

          return (
            <motion.div key={visit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`border hover:shadow-md transition-all ${visit.id === activeVisit ? "ring-2 ring-brand" : ""}`}>
                <CardContent className="p-4 space-y-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px] py-2 px-3 rounded-xl bg-muted/50">
                        <div className="font-[var(--font-heading)] font-bold text-sm">{formatScheduledTime(visit.scheduled_start)}</div>
                        <div className="text-[10px] text-muted-foreground">to {formatScheduledTime(visit.scheduled_end)}</div>
                      </div>
                      <div>
                        <p className="font-semibold">{visit.patient_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{visit.patient_address}</p>
                        {visit.status === "completed" && (
                          <p className="text-xs text-green-600 font-semibold mt-0.5 flex items-center gap-1">
                            <MapPinCheck className="w-3.5 h-3.5" />Verified &middot; {visit.duration_minutes} min &middot; {visit.services.length} services
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {visit.status === "completed" ? (
                        <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>
                      ) : visit.status === "in_progress" ? (
                        <Badge className="bg-brand/10 text-brand text-xs animate-pulse">Active</Badge>
                      ) : (
                        <>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">Scheduled</Badge>
                          {!activeVisit && (
                            <Button size="sm" onClick={() => handleCheckIn(visit.id)} disabled={checkingIn}
                              className="bg-brand hover:bg-brand-dark text-white rounded-full h-9 px-4">
                              {checkingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Navigation className="w-3 h-3 mr-1.5" />Check In</>}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── PATIENT HISTORY CARD — shown before visit ── */}
                  {isScheduled && history && (
                    <div className="mt-3">
                      <button
                        onClick={() => setExpandedHistory(isExpanded ? null : visit.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${riskColor[history.risk_level || "low"]} hover:opacity-90`}
                      >
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 shrink-0" />
                          <div>
                            <span className="text-xs font-semibold">Last AI Check-in: Score {history.risk_score ?? "—"}</span>
                            <span className="text-[10px] ml-2 opacity-75">({formatRelativeTime(history.created_at)})</span>
                          </div>
                          {history.flags && history.flags.length > 0 && (
                            <Badge className="bg-red-100 text-red-700 text-[9px] ml-1"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{history.flags.length} flag{history.flags.length > 1 ? "s" : ""}</Badge>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="mt-2 p-3 rounded-xl bg-muted/30 border border-border space-y-2">
                              {/* AI Summary */}
                              {history.ai_summary && (
                                <div className="flex items-start gap-2">
                                  <Brain className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                                  <p className="text-xs text-foreground">{history.ai_summary}</p>
                                </div>
                              )}

                              {/* Domain scores */}
                              {Object.keys(history.domains || {}).length > 0 && (
                                <div className="grid grid-cols-2 gap-1.5 mt-2">
                                  {Object.entries(history.domains).map(([domain, data]) => (
                                    <div key={domain} className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5 border">
                                      <span className="text-[10px] text-muted-foreground capitalize">{domain}</span>
                                      <div className="flex items-center gap-1">
                                        <span className={`text-[11px] font-bold ${data.score >= 70 ? "text-green-600" : data.score >= 50 ? "text-amber-600" : "text-red-600"}`}>{data.score}</span>
                                        {data.trend === "declining" ? <TrendingDown className="w-3 h-3 text-red-400" /> : data.trend === "improving" ? <TrendingUp className="w-3 h-3 text-green-400" /> : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Flags */}
                              {history.flags && history.flags.length > 0 && (
                                <div className="space-y-1">
                                  {history.flags.map((flag, fi) => (
                                    <div key={fi} className="flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50 rounded-lg px-2 py-1">
                                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{flag}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border">
                                <Info className="w-3 h-3" />This summary was generated by AI — use clinical judgment
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {isScheduled && !history && (
                    <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-muted/30 border border-dashed border-border flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">No previous AI check-in for this patient</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
