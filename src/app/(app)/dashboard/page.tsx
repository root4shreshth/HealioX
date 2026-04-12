"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, AlertTriangle, MapPinCheck, Activity, ChevronRight,
  Bell, Loader2, CheckCircle2, Clock, Shield, TrendingDown, TrendingUp,
  Eye, DollarSign, Star, AlertCircle, Database, FileText, Heart,
  Calendar, MessageCircle,
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

export default function FamilyDashboard() {
  const [linkedPatient, setLinkedPatient] = useState<LinkedPatient | null>(null);
  const [allPatients, setAllPatients] = useState<LinkedPatient[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSeed, setNeedsSeed] = useState(false);
  const [userRole, setUserRole] = useState("");

  const { alerts, refetch: refetchAlerts } = useAlerts();
  const { visits, refetch: refetchVisits } = useVisits();
  const patientId = linkedPatient?.id;
  const { checkins } = useHealthCheckins(patientId || undefined);

  // Find this user's linked patient (not all patients)
  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const role = user.user_metadata?.role || "family";
        setUserRole(role);

        // If provider_admin, show all patients
        if (role === "provider_admin" || role === "government") {
          const { data: pts } = await supabase.from("patients").select("*").eq("is_active", true).order("risk_score");
          if (pts && pts.length > 0) {
            setAllPatients(pts.map((p) => ({ ...p, primary_conditions: p.primary_conditions || [] })));
            setLinkedPatient({ ...pts[0], primary_conditions: pts[0].primary_conditions || [] });
          } else {
            setNeedsSeed(true);
          }
        } else {
          // Family: find linked patient via assignments
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
            // Fallback: show first patient
            const { data: pts } = await supabase.from("patients").select("*").limit(4);
            if (pts && pts.length > 0) {
              setLinkedPatient({ ...pts[0], primary_conditions: pts[0].primary_conditions || [] });
              setAllPatients(pts.map((p) => ({ ...p, primary_conditions: p.primary_conditions || [] })));
            } else {
              setNeedsSeed(true);
            }
          }
        }

        // Load daily updates for linked patient
        if (linkedPatient?.id) {
          const { data: updates } = await supabase
            .from("daily_updates")
            .select("*")
            .eq("patient_id", linkedPatient.id)
            .order("created_at", { ascending: false })
            .limit(10);
          if (updates) setDailyUpdates(updates);
        }
      } catch (e) { console.error(e); setNeedsSeed(true); }
      setLoading(false);
    }
    loadData();
  }, [linkedPatient?.id]);

  // Reload daily updates when linkedPatient changes
  useEffect(() => {
    if (!linkedPatient?.id) return;
    async function loadUpdates() {
      const supabase = createClient();
      const { data } = await supabase.from("daily_updates").select("*").eq("patient_id", linkedPatient!.id).order("created_at", { ascending: false }).limit(10);
      if (data) setDailyUpdates(data);
    }
    loadUpdates();
  }, [linkedPatient?.id]);

  const handleRefresh = useCallback(() => { refetchAlerts(); refetchVisits(); }, [refetchAlerts, refetchVisits]);
  useRealtimeRefresh(["visits", "alerts", "health_checkins", "daily_updates"], handleRefresh);

  // Metrics
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

  async function seedData() { await fetch("/api/seed", { method: "POST" }); window.location.reload(); }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  if (needsSeed || !linkedPatient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Database className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="font-[var(--font-heading)] text-xl font-bold">No Patient Data Yet</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">Seed demo data to see the dashboard with a linked patient, visit history, health check-ins, and daily updates.</p>
        <Button onClick={seedData} className="mt-6 bg-brand hover:bg-brand-dark text-white rounded-full px-6"><Database className="w-4 h-4 mr-2" />Seed Demo Data</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header — focused on THIS patient */}
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
          <Badge className={riskBadge[linkedPatient.risk_level] || "bg-gray-100"}>
            Risk: {linkedPatient.risk_score}
          </Badge>
          <Badge variant="secondary" className="text-xs"><Eye className="w-3 h-3 mr-1" />Live</Badge>
        </div>
      </div>

      {/* Key metrics for THIS patient */}
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

      {/* Daily Updates from Caregiver — the transparency layer */}
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
                    <span className="text-xs font-semibold">{new Date(update.created_at).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</span>
                    <div className="flex items-center gap-2">
                      {update.mood_observation && (
                        <Badge variant="secondary" className="text-[9px]">{update.mood_observation}</Badge>
                      )}
                      {update.medication_taken && (
                        <Badge className="bg-green-100 text-green-700 text-[9px]"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Meds taken</Badge>
                      )}
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
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} />
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
        {/* Visit Timeline */}
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
                      <span className="text-xs font-semibold">{new Date(v.scheduled_start).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}</span>
                      {v.status === "completed" && <span className="text-[10px] text-muted-foreground ml-2">{v.duration_minutes}min &middot; {v.services.length} services &middot; GPS {v.gps_verified ? "verified" : "?"}</span>}
                    </div>
                    <Badge className={`text-[9px] ${v.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {v.status === "completed" ? "Verified" : "Scheduled"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funding Accountability */}
        <Card className="border-teal/20 bg-teal/5">
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2 mb-3"><DollarSign className="w-4 h-4 text-teal" />Funding Accountability</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 border"><div className="text-xl font-[var(--font-heading)] font-black">{funding.totalVerifiedHours}h</div><div className="text-[10px] text-muted-foreground">Verified Hours</div></div>
              <div className="bg-white rounded-xl p-3 border"><div className="text-xl font-[var(--font-heading)] font-black">{funding.totalServicesDelivered}</div><div className="text-[10px] text-muted-foreground">Services Delivered</div></div>
              <div className="bg-white rounded-xl p-3 border"><div className="text-xl font-[var(--font-heading)] font-black">{funding.verificationRate}%</div><div className="text-[10px] text-muted-foreground">GPS Verified</div></div>
              <div className="bg-white rounded-xl p-3 border"><div className="text-xl font-[var(--font-heading)] font-black text-green-600">${funding.estimatedSavings.toLocaleString()}</div><div className="text-[10px] text-muted-foreground">Est. Savings</div></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Other patients (only for provider_admin) */}
      {allPatients.length > 1 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-[var(--font-heading)] font-bold">All Patients</h3>
              <Link href="/dashboard/patients"><Button variant="ghost" size="sm" className="text-xs text-brand">View All<ChevronRight className="w-3 h-3 ml-1" /></Button></Link>
            </div>
            <div className="space-y-2">
              {allPatients.map((p) => (
                <Link key={p.id} href={`/dashboard/patients/${p.id}`}>
                  <div className={`flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${p.id === linkedPatient?.id ? "bg-brand/5 border border-brand/20" : "hover:bg-muted/50"}`}
                    onClick={(e) => { e.preventDefault(); setLinkedPatient(p); }}>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.risk_level === "high" ? "bg-red-100 text-red-700" : p.risk_level === "moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {p.full_name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span className="text-sm font-semibold">{p.full_name}</span>
                    </div>
                    <Badge className={`${riskBadge[p.risk_level] || ""} text-[9px]`}>{p.risk_score}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
