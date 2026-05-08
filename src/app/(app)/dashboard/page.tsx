"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, AlertTriangle, MapPinCheck, Activity, ChevronRight,
  Bell, Loader2, CheckCircle2, Clock, Shield, TrendingDown, TrendingUp,
  Eye, DollarSign, Star, FileText, Heart,
  Calendar, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { useAlerts, useVisits, useHealthCheckins, useRealtimeRefresh } from "@/hooks/use-supabase-data";
import { calculateCareQuality, calculateFundingMetrics } from "@/lib/care-metrics";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import Link from "next/link";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

const riskBadge: Record<string, string> = {
  low: "bg-green-100 text-green-700", moderate: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700", emergency: "bg-red-600 text-white",
};

type LinkedPatient = {
  id: string; full_name: string; risk_level: string; risk_score: number;
  primary_conditions: string[]; date_of_birth: string; address: string;
  emergency_contact_name: string;
};

type DailyUpdate = {
  id: string; content: string; mood_observation: string | null;
  medication_taken: boolean; concerns: string[]; created_at: string;
};

// ── Calendar helpers ────────────────────────────────────────────────
function getWeekDays() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function FamilyDashboard() {
  const [linkedPatient, setLinkedPatient] = useState<LinkedPatient | null>(null);
  const [allPatients, setAllPatients] = useState<LinkedPatient[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSeed, setNeedsSeed] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "calendar" | "compare">("overview");

  // Baseline check-in (first ever)
  const [baselineCheckin, setBaselineCheckin] = useState<{ risk_score: number; created_at: string; domains: Record<string, { score: number }> } | null>(null);

  const patientId = linkedPatient?.id;
  // Alerts scoped to this patient only (not all patients)
  const { alerts, refetch: refetchAlerts } = useAlerts(patientId ? [patientId] : undefined);
  // Visits for the whole week so the calendar tab works
  const { visits, refetch: refetchVisits } = useVisits({ patientId: patientId || null, weekView: true });
  const { checkins } = useHealthCheckins(patientId || undefined);

  // Week days for calendar
  const weekDays = getWeekDays();

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const role = user.user_metadata?.role || "family";
        setUserRole(role);

        if (role === "provider_admin" || role === "government") {
          const { data: pts } = await supabase.from("patients").select("*").eq("is_active", true).order("risk_score");
          if (pts && pts.length > 0) {
            setAllPatients(pts.map((p) => ({ ...p, primary_conditions: p.primary_conditions || [] })));
            setLinkedPatient({ ...pts[0], primary_conditions: pts[0].primary_conditions || [] });
          } else {
            setNeedsSeed(true);
          }
        } else {
          const { data: assignments } = await supabase
            .from("patient_assignments")
            .select("patient_id, patients(*)")
            .eq("profile_id", user.id);

          if (assignments && assignments.length > 0) {
            const p = (assignments[0] as Record<string, unknown>).patients as LinkedPatient;
            setLinkedPatient({ ...p, primary_conditions: p.primary_conditions || [] });
            setAllPatients(assignments.map((a) => {
              const pt = (a as Record<string, unknown>).patients as LinkedPatient;
              return { ...pt, primary_conditions: pt.primary_conditions || [] };
            }));
          } else {
            setNeedsSeed(true);
          }
        }
      } catch (e) { console.error(e); setNeedsSeed(true); }
      setLoading(false);
    }
    loadData();
  }, []);

  // Load daily updates & baseline when patient changes
  useEffect(() => {
    if (!linkedPatient?.id) return;
    async function loadExtra() {
      const supabase = createClient();
      const [updatesRes, baselineRes] = await Promise.all([
        supabase.from("daily_updates").select("*").eq("patient_id", linkedPatient!.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("health_checkins").select("risk_score, created_at, domains").eq("patient_id", linkedPatient!.id).eq("completed", true).order("created_at", { ascending: true }).limit(1).single(),
      ]);
      if (updatesRes.data) setDailyUpdates(updatesRes.data);
      if (baselineRes.data) setBaselineCheckin(baselineRes.data as typeof baselineCheckin);
    }
    loadExtra();
  }, [linkedPatient?.id]);

  const handleRefresh = useCallback(() => { refetchAlerts(); refetchVisits(); }, [refetchAlerts, refetchVisits]);
  useRealtimeRefresh(["visits", "alerts", "health_checkins", "daily_updates"], handleRefresh);

  const patientVisits = visits.filter((v) => v.patient_id === patientId);
  const completedVisits = patientVisits.filter((v) => v.status === "completed");
  const verifiedVisits = completedVisits.filter((v) => v.gps_verified);
  const patientAlerts = alerts.filter((a) => a.patient_id === patientId);

  const careQuality = calculateCareQuality(
    patientVisits.map((v) => ({ id: v.id, status: v.status, gps_verified: v.gps_verified, duration_minutes: v.duration_minutes, services: v.services })),
    checkins.map((c) => ({ risk_score: c.risk_score, risk_level: c.risk_level, created_at: c.created_at }))
  );
  const funding = calculateFundingMetrics(
    patientVisits.map((v) => ({ id: v.id, status: v.status, gps_verified: v.gps_verified, duration_minutes: v.duration_minutes, services: v.services }))
  );

  const trendData = checkins
    .filter((c) => c.risk_score !== null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((c) => ({ date: new Date(c.created_at).toISOString().split("T")[0], score: c.risk_score }));

  // Latest check-in for comparison
  const latestCheckin = checkins[0] || null;

  // Auto-seed if the family account has no linked patient yet (first-login setup)
  useEffect(() => {
    if (loading) return;
    if (!needsSeed) return;
    if (typeof window === "undefined") return;
    const key = "aayucare_seeded_dashboard";
    if (sessionStorage.getItem(key) === "1") return;
    (async () => {
      try {
        const res = await fetch("/api/seed", {
          method: "POST",
          credentials: "include",
          headers: { "x-seed-token": "aayucare-dev-seed" },
        });
        if (res.ok) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
        } else {
          const body = await res.text().catch(() => "");
          console.warn("[auto-seed dashboard] failed", res.status, body);
        }
      } catch (err) {
        console.warn("[auto-seed dashboard] error", err);
      }
    })();
  }, [loading, needsSeed]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  if (!linkedPatient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
        <h3 className="font-[var(--font-heading)] text-xl font-bold">Setting up your dashboard…</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Linking your account to your family member&apos;s care record. This only happens on first login.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${linkedPatient.risk_level === "high" ? "bg-red-100" : linkedPatient.risk_level === "moderate" ? "bg-amber-100" : "bg-green-100"}`}>
            <Heart className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h2 className="font-[var(--font-heading)] text-xl font-black">{linkedPatient.full_name}&apos;s Care</h2>
            <p className="text-xs text-muted-foreground">{linkedPatient.address || "Care Dashboard"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={riskBadge[linkedPatient.risk_level] || "bg-gray-100"}>Risk: {linkedPatient.risk_score}</Badge>
          <Badge variant="secondary" className="text-xs"><Eye className="w-3 h-3 mr-1" />Live</Badge>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-full">
        {([
          { key: "overview", label: "Overview", icon: Activity },
          { key: "calendar", label: "Visit Calendar", icon: Calendar },
          { key: "compare", label: "Progress", icon: TrendingUp },
        ] as const).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.key ? "bg-white shadow text-brand" : "text-muted-foreground hover:text-foreground"}`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Key metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Risk Score", value: linkedPatient.risk_score, icon: Activity, color: "text-brand", bg: "bg-brand/10", sub: linkedPatient.risk_level },
              { label: "Active Alerts", value: patientAlerts.length, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", sub: patientAlerts.length > 0 ? "Needs attention" : "All clear" },
              { label: "Visits Verified", value: `${verifiedVisits.length}/${patientVisits.length}`, icon: MapPinCheck, color: "text-green-600", bg: "bg-green-50", sub: "GPS confirmed" },
              { label: "Care Quality", value: `${careQuality.overall}%`, icon: Star, color: "text-teal", bg: "bg-teal/10", sub: careQuality.riskTrend },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card><CardContent className="p-3">
                  <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                  <div className="font-[var(--font-heading)] text-xl font-black">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  <div className="text-[9px] text-muted-foreground/70 mt-0.5">{s.sub}</div>
                </CardContent></Card>
              </motion.div>
            ))}
          </div>

          {/* Daily Updates */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-teal" />Daily Caregiver Updates
              </h3>
              {dailyUpdates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No daily updates yet. Updates appear here after each caregiver visit.</p>
              ) : (
                <div className="space-y-3">
                  {dailyUpdates.slice(0, 5).map((update) => (
                    <div key={update.id} className="p-3 rounded-xl bg-muted/30 border border-border">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold">{new Date(update.created_at).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
                        <div className="flex items-center gap-2">
                          {update.mood_observation && <Badge variant="secondary" className="text-[9px]">{update.mood_observation}</Badge>}
                          {update.medication_taken && <Badge className="bg-green-100 text-green-700 text-[9px]"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Meds taken</Badge>}
                        </div>
                      </div>
                      <p className="text-sm text-foreground">{update.content}</p>
                      {update.concerns && update.concerns.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {update.concerns.map((c) => (
                            <Badge key={c} className="bg-amber-100 text-amber-700 text-[9px]"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{c}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Health Trend */}
            <Card className="lg:col-span-2">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-[var(--font-heading)] font-bold">Health Trend</h3>
                  {careQuality.riskTrend === "declining" && <Badge className="bg-red-100 text-red-700"><TrendingDown className="w-3 h-3 mr-1" />Declining</Badge>}
                  {careQuality.riskTrend === "improving" && <Badge className="bg-green-100 text-green-700"><TrendingUp className="w-3 h-3 mr-1" />Improving</Badge>}
                </div>
                <div className="h-48">
                  {trendData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EA580C" stopOpacity={0.15} /><stop offset="95%" stopColor="#EA580C" stopOpacity={0} /></linearGradient></defs>
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Area type="monotone" dataKey="score" stroke="#EA580C" strokeWidth={2} fill="url(#g1)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground"><Activity className="w-5 h-5 mr-2" />Health check-ins will show trends here</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2 mb-3"><Bell className="w-4 h-4 text-red-500" />Alerts</h3>
                {patientAlerts.length === 0 ? (
                  <div className="text-center py-4"><CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No active alerts</p></div>
                ) : (
                  <div className="space-y-2">
                    {patientAlerts.map((a) => (
                      <div key={a.id} className={`p-3 rounded-xl border ${a.severity === "urgent" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                        <p className="text-sm font-semibold">{a.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                        <Badge className={`mt-1.5 text-[9px] ${a.severity === "urgent" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.severity}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Visit Verification + Funding */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <CardContent className="p-5">
                <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2 mb-3"><Shield className="w-4 h-4 text-brand" />Visit Verification</h3>
                {patientVisits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No visits yet</p>
                ) : (
                  <div className="space-y-2">
                    {patientVisits.map((v) => (
                      <div key={v.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${v.status === "completed" ? "border-green-200 bg-green-50/30" : "border-border"}`}>
                        {v.status === "completed" ? <MapPinCheck className="w-4 h-4 text-green-500 shrink-0" /> : <Clock className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                        <div className="flex-1">
                          <span className="text-xs font-semibold">{new Date(v.scheduled_start).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                          {v.status === "completed" && <span className="text-[10px] text-muted-foreground ml-2">{v.duration_minutes}min · {v.services.length} services · GPS {v.gps_verified ? "verified" : "?"}</span>}
                        </div>
                        <Badge className={`text-[9px] ${v.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{v.status === "completed" ? "Verified" : "Scheduled"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-teal/20 bg-teal/5">
              <CardContent className="p-5">
                <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2 mb-3"><DollarSign className="w-4 h-4 text-teal" />Funding Accountability</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border"><div className="text-xl font-[var(--font-heading)] font-black">{funding.totalVerifiedHours}h</div><div className="text-[10px] text-muted-foreground">Verified Hours</div></div>
                  <div className="bg-white rounded-xl p-3 border"><div className="text-xl font-[var(--font-heading)] font-black">{funding.totalServicesDelivered}</div><div className="text-[10px] text-muted-foreground">Services Delivered</div></div>
                  <div className="bg-white rounded-xl p-3 border"><div className="text-xl font-[var(--font-heading)] font-black">{funding.verificationRate}%</div><div className="text-[10px] text-muted-foreground">GPS Verified</div></div>
                  <div className="bg-white rounded-xl p-3 border"><div className="text-xl font-[var(--font-heading)] font-black text-green-600">₹{funding.estimatedSavings.toLocaleString("en-IN")}</div><div className="text-[10px] text-muted-foreground">Est. Savings</div></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Other patients (provider_admin only) */}
          {allPatients.length > 1 && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-[var(--font-heading)] font-bold">All Patients</h3>
                  <Link href="/dashboard/patients"><Button variant="ghost" size="sm" className="text-xs text-brand">View All<ChevronRight className="w-3 h-3 ml-1" /></Button></Link>
                </div>
                <div className="space-y-2">
                  {allPatients.map((p) => (
                    <div key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${p.id === linkedPatient?.id ? "bg-brand/5 border border-brand/20" : "hover:bg-muted/50"}`}
                      onClick={() => setLinkedPatient(p)}>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.risk_level === "high" ? "bg-red-100 text-red-700" : p.risk_level === "moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                          {p.full_name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <span className="text-sm font-semibold">{p.full_name}</span>
                      </div>
                      <Badge className={`${riskBadge[p.risk_level] || ""} text-[9px]`}>{p.risk_score}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── VISIT CALENDAR TAB ── */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand" />This Week&apos;s Schedule
                </h3>
                <Badge variant="secondary" className="text-xs">Read-only</Badge>
              </div>

              {/* Week grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {weekDays.map((day) => {
                  const dayVisits = visits.filter((v) => isSameDay(new Date(v.scheduled_start), day));
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={day.toISOString()} className={`rounded-xl p-2 text-center min-h-[80px] border ${isToday ? "border-brand bg-brand/5" : "border-border bg-muted/20"}`}>
                      <div className={`text-[10px] font-semibold mb-1 ${isToday ? "text-brand" : "text-muted-foreground"}`}>
                        {day.toLocaleDateString("en-IN", { weekday: "short" })}
                      </div>
                      <div className={`text-base font-[var(--font-heading)] font-black ${isToday ? "text-brand" : ""}`}>
                        {day.getDate()}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {dayVisits.map((v) => (
                          <div key={v.id} className={`w-full text-[9px] rounded px-1 py-0.5 truncate font-medium ${v.status === "completed" ? "bg-green-100 text-green-700" : v.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                            {new Date(v.scheduled_start).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </div>
                        ))}
                        {dayVisits.length === 0 && <div className="text-[9px] text-muted-foreground/50 mt-1">—</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Visit detail list */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">All visits this week</p>
                {visits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No visits scheduled this week</p>
                ) : (
                  visits.map((v) => (
                    <div key={v.id} className={`flex items-center gap-3 p-3 rounded-xl border ${v.status === "completed" ? "border-green-200 bg-green-50/30" : v.status === "in_progress" ? "border-blue-200 bg-blue-50/30" : "border-border"}`}>
                      <div className="text-center min-w-[50px]">
                        <div className="text-[10px] font-bold">{new Date(v.scheduled_start).toLocaleDateString("en-IN", { weekday: "short" })}</div>
                        <div className="text-base font-[var(--font-heading)] font-black">{new Date(v.scheduled_start).getDate()}</div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{v.patient_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(v.scheduled_start).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} –{" "}
                          {new Date(v.scheduled_end).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                        </p>
                        {v.status === "completed" && v.duration_minutes && (
                          <p className="text-[10px] text-green-600 mt-0.5">{v.duration_minutes} min · {v.services.length} services delivered</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge className={`text-[9px] ${v.status === "completed" ? "bg-green-100 text-green-700" : v.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                          {v.status === "completed" ? "✓ Done" : v.status === "in_progress" ? "🔵 Active" : "Scheduled"}
                        </Badge>
                        {v.status === "completed" && v.caregiver_id && (
                          <Link
                            href={`/dashboard/rate?caregiver=${v.caregiver_id}&visit=${v.id}&patient=${v.patient_id}`}
                            className="text-[10px] text-brand hover:underline font-semibold flex items-center gap-0.5"
                          >
                            <Star className="w-3 h-3" /> Rate
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── PROGRESS / BASELINE COMPARISON TAB ── */}
      {activeTab === "compare" && (
        <div className="space-y-4">
          {/* Overall comparison */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-brand" />Health Progress — Baseline vs Now
              </h3>

              {!baselineCheckin || !latestCheckin ? (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Need at least 2 AI health check-ins to compare progress.</p>
                  <p className="text-xs text-muted-foreground mt-1">Check-ins are done by the caregiver or patient after each visit.</p>
                </div>
              ) : (
                <>
                  {/* Score comparison */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 rounded-xl bg-muted/30 border">
                      <p className="text-[10px] text-muted-foreground mb-1">Baseline Score</p>
                      <p className="text-4xl font-[var(--font-heading)] font-black text-muted-foreground">{baselineCheckin.risk_score ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(baselineCheckin.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="flex items-center justify-center">
                      {(() => {
                        const diff = (latestCheckin.risk_score ?? 0) - (baselineCheckin.risk_score ?? 0);
                        const improved = diff > 0;
                        const same = diff === 0;
                        return (
                          <div className={`text-center p-3 rounded-xl ${improved ? "bg-green-50 border border-green-200" : same ? "bg-gray-50 border border-gray-200" : "bg-red-50 border border-red-200"}`}>
                            {improved ? <ArrowUpRight className="w-6 h-6 text-green-500 mx-auto" /> : same ? <Minus className="w-6 h-6 text-gray-400 mx-auto" /> : <ArrowDownRight className="w-6 h-6 text-red-500 mx-auto" />}
                            <p className={`text-xl font-[var(--font-heading)] font-black ${improved ? "text-green-600" : same ? "text-gray-500" : "text-red-600"}`}>
                              {diff > 0 ? "+" : ""}{diff}
                            </p>
                            <p className="text-[9px] text-muted-foreground">{improved ? "Improved" : same ? "No change" : "Declined"}</p>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="text-center p-4 rounded-xl bg-brand/5 border border-brand/20">
                      <p className="text-[10px] text-muted-foreground mb-1">Current Score</p>
                      <p className={`text-4xl font-[var(--font-heading)] font-black ${(latestCheckin.risk_score ?? 0) >= (baselineCheckin.risk_score ?? 0) ? "text-green-600" : "text-red-600"}`}>
                        {latestCheckin.risk_score ?? "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(latestCheckin.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>

                  {/* Domain comparison */}
                  {Object.keys(baselineCheckin.domains || {}).length > 0 && Object.keys(latestCheckin.domains || {}).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Domain Breakdown</p>
                      <div className="space-y-2">
                        {Object.entries(baselineCheckin.domains).map(([domain, baseData]) => {
                          const currentData = latestCheckin.domains?.[domain];
                          if (!currentData) return null;
                          const diff = currentData.score - baseData.score;
                          const pct = baseData.score > 0 ? Math.round((currentData.score / 100) * 100) : 0;
                          return (
                            <div key={domain} className="flex items-center gap-3">
                              <div className="w-20 text-xs text-muted-foreground capitalize shrink-0">{domain}</div>
                              <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${currentData.score >= 70 ? "bg-green-500" : currentData.score >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="w-10 text-xs font-bold text-right">{currentData.score}</div>
                              <div className={`w-12 text-[10px] font-semibold text-right ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                                {diff > 0 ? `+${diff}` : diff === 0 ? "—" : diff}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Check-in count */}
                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span>Based on {checkins.length} AI check-in{checkins.length !== 1 ? "s" : ""}</span>
                    <span>Tracking since {new Date(baselineCheckin.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Full trend chart */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-[var(--font-heading)] font-bold mb-3">Full Health Trend</h3>
              <div className="h-56">
                {trendData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EA580C" stopOpacity={0.2} /><stop offset="95%" stopColor="#EA580C" stopOpacity={0} /></linearGradient></defs>
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="score" stroke="#EA580C" strokeWidth={2} fill="url(#g2)" dot={{ r: 3, fill: "#EA580C" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                    <Activity className="w-8 h-8 text-muted-foreground/40" />
                    Need at least 2 check-ins to show a trend
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
