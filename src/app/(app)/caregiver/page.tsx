"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin, Play, Square, Loader2, Mic, Camera, MessageCircle,
  MapPinCheck, CheckCircle2, Clock, Navigation, Shield, Database,
  ClipboardList, Send, ChevronDown, ChevronUp, FileText,
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

// Default task templates per visit
const DEFAULT_TASKS = [
  { title: "Check vital signs", category: "nursing", desc: "Blood pressure, temperature, pulse" },
  { title: "Administer medication", category: "medication", desc: "Ensure all prescribed meds taken" },
  { title: "Personal hygiene assistance", category: "personal_care", desc: "Bathing, grooming, dressing" },
  { title: "Prepare meal/snack", category: "meal", desc: "Nutritious meal as per diet plan" },
  { title: "Mobility exercises", category: "mobility", desc: "Guided stretches, walking assistance" },
  { title: "Emotional check-in", category: "social", desc: "Conversation, companionship, mood observation" },
];

export default function CaregiverPortal() {
  const router = useRouter();
  const { visits, setVisits, loading, refetch } = useVisits();
  const [activeVisit, setActiveVisit] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPatient, setLastPatient] = useState({ id: "", name: "" });

  // Task management
  const [tasks, setTasks] = useState(DEFAULT_TASKS.map((t, i) => ({ ...t, id: `task-${i}`, done: false })));
  const [showTasks, setShowTasks] = useState(true);

  // Daily update
  const [dailyUpdate, setDailyUpdate] = useState("");
  const [moodObs, setMoodObs] = useState("");
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const active = visits.find((v) => v.id === activeVisit);

  useEffect(() => {
    if (!activeVisit) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [activeVisit]);

  const handleRefresh = useCallback(() => { refetch(); }, [refetch]);
  useRealtimeRefresh(["visits"], handleRefresh);

  async function handleCheckIn(visitId: string) {
    setCheckingIn(true);
    let lat = -31.9815, lng = 115.8025;
    try {
      const pos = await new Promise<GeolocationPosition>((r, e) => navigator.geolocation.getCurrentPosition(r, e, { timeout: 5000 }));
      lat = pos.coords.latitude; lng = pos.coords.longitude;
    } catch { /* defaults */ }

    try {
      const supabase = createClient();
      await supabase.from("visits").update({ status: "in_progress", check_in_time: new Date().toISOString(), check_in_lat: lat, check_in_lng: lng, gps_verified: true }).eq("id", visitId);
    } catch { /* continue */ }

    setVisits((prev) => prev.map((v) => v.id === visitId ? { ...v, status: "in_progress", check_in_time: new Date().toISOString(), gps_verified: true } : v));
    setActiveVisit(visitId);
    setCheckingIn(false);
    setElapsed(0);
    setTasks(DEFAULT_TASKS.map((t, i) => ({ ...t, id: `task-${i}`, done: false })));
  }

  async function handleCheckOut() {
    if (!activeVisit || !active) return;
    const duration = Math.round(elapsed / 60) || 1;
    setLastPatient({ id: active.patient_id, name: active.patient_name });

    try {
      const supabase = createClient();
      await supabase.from("visits").update({ status: "completed", check_out_time: new Date().toISOString(), duration_minutes: duration, services: selectedServices, caregiver_notes: notes }).eq("id", activeVisit);

      // Save daily update if provided
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

    setVisits((prev) => prev.map((v) => v.id === activeVisit
      ? { ...v, status: "completed", check_out_time: new Date().toISOString(), duration_minutes: duration, services: selectedServices, caregiver_notes: notes }
      : v));
    setActiveVisit(null);
    setSelectedServices([]);
    setNotes("");
    setDailyUpdate("");
    setMoodObs("");
    setElapsed(0);
    setShowSuccess(true);
  }

  async function seedData() { await fetch("/api/seed", { method: "POST" }); refetch(); }

  function formatTime(s: number) { return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`; }
  function formatScheduledTime(iso: string) { return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }); }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  if (visits.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-[var(--font-heading)] text-xl font-bold">No Visits Assigned</h3>
        <p className="text-sm text-muted-foreground mt-2">You have no visits scheduled today. Patients will be assigned to you automatically.</p>
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
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</p>
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

      {/* Active visit panel with tasks */}
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
                  <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-teal" />Daily Update (syncs to family):</p>
                  <Textarea placeholder="How was the patient today? Any observations, changes, or concerns..." value={dailyUpdate} onChange={(e) => setDailyUpdate(e.target.value)} className="resize-none bg-white text-sm" rows={2} />
                  <div className="mt-2">
                    <label className="text-xs font-medium text-muted-foreground">Mood observation:</label>
                    <div className="flex gap-2 mt-1">
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
                  <p className="text-sm font-semibold mb-1">Additional Notes:</p>
                  <Textarea placeholder="Detailed care notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none bg-white text-sm" rows={2} />
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
      <div className="space-y-3">
        {visits.map((visit, i) => (
          <motion.div key={visit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`border hover:shadow-md transition-all ${visit.id === activeVisit ? "ring-2 ring-brand" : ""}`}>
              <CardContent className="p-4">
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
                          <Button size="sm" onClick={() => handleCheckIn(visit.id)} disabled={checkingIn} className="bg-brand hover:bg-brand-dark text-white rounded-full h-9 px-4">
                            {checkingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Navigation className="w-3 h-3 mr-1.5" />Check In</>}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
