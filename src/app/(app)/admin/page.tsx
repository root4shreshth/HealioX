"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, AlertTriangle, MapPinCheck, Activity, TrendingUp, TrendingDown,
  Loader2, CheckCircle2, Clock, Shield, Database, BarChart2,
  Building2, IndianRupee, UserCheck, AlertCircle, Download,
  Star, Calendar, ChevronRight, Bell, Minus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────
type AdminStats = {
  totalPatients: number;
  activePatients: number;
  totalCaregivers: number;
  totalVisitsToday: number;
  completedVisitsToday: number;
  lateCheckIns: number;
  monthlyRevenue: number;
  avgRiskScore: number;
  highRiskPatients: number;
  activeAlerts: number;
};

type CaregiverPerf = {
  id: string;
  name: string;
  visitsAssigned: number;
  visitsCompleted: number;
  lateCheckIns: number;
  avgDuration: number;
  rating: number;
  lastActive: string;
};

type Patient = {
  id: string;
  full_name: string;
  risk_level: string;
  risk_score: number;
  primary_conditions: string[];
  address: string;
  last_checkin?: string;
};

type RecentAlert = {
  id: string;
  title: string;
  severity: string;
  patient_name: string;
  created_at: string;
};

const RISK_COLORS = { low: "#22c55e", moderate: "#f59e0b", high: "#ef4444", emergency: "#7f1d1d" };
const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#dc2626"];

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart2 },
  { key: "caregivers", label: "Caregivers", icon: UserCheck },
  { key: "patients", label: "Patients", icon: Users },
  { key: "revenue", label: "Revenue", icon: IndianRupee },
] as const;

type Tab = typeof TABS[number]["key"];

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [caregivers, setCaregivers] = useState<CaregiverPerf[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [orgName, setOrgName] = useState("SevaCare India Pvt. Ltd.");
  const [needsSeed, setNeedsSeed] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];

      const [patientsRes, visitsRes, alertsRes, profilesRes] = await Promise.all([
        supabase.from("patients").select("*").eq("is_active", true),
        supabase.from("visits").select("*, patients(full_name)").gte("scheduled_start", `${today}T00:00:00`).lte("scheduled_start", `${today}T23:59:59`),
        supabase.from("alerts").select("*, patients(full_name)").eq("status", "active").order("created_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("*").eq("role", "caregiver"),
      ]);

      const pts = patientsRes.data || [];
      const vis = visitsRes.data || [];
      const alr = alertsRes.data || [];

      if (pts.length === 0) { setNeedsSeed(true); setLoading(false); return; }

      // Build stats
      const completedToday = vis.filter((v) => v.status === "completed");
      const lateCheckIns = vis.filter((v) => {
        const scheduled = new Date(v.scheduled_start).getTime();
        const checkedIn = v.check_in_time ? new Date(v.check_in_time).getTime() : null;
        return checkedIn && checkedIn - scheduled > 15 * 60 * 1000; // >15min late
      });

      const avgRisk = pts.length > 0 ? Math.round(pts.reduce((sum, p) => sum + (p.risk_score || 0), 0) / pts.length) : 0;
      const highRisk = pts.filter((p) => p.risk_level === "high" || p.risk_level === "emergency").length;
      const monthlyRev = completedToday.length * 850 * 22; // ₹850/visit × 22 working days estimate

      setStats({
        totalPatients: pts.length,
        activePatients: pts.filter((p) => p.is_active).length,
        totalCaregivers: (profilesRes.data || []).length,
        totalVisitsToday: vis.length,
        completedVisitsToday: completedToday.length,
        lateCheckIns: lateCheckIns.length,
        monthlyRevenue: monthlyRev,
        avgRiskScore: avgRisk,
        highRiskPatients: highRisk,
        activeAlerts: alr.length,
      });

      // Caregiver performance (build from visits)
      const caregiverMap: Record<string, CaregiverPerf> = {};
      (profilesRes.data || []).forEach((p) => {
        caregiverMap[p.id] = {
          id: p.id, name: p.full_name || "Unknown",
          visitsAssigned: 0, visitsCompleted: 0, lateCheckIns: 0,
          avgDuration: 0, rating: 4 + Math.random() * 1,
          lastActive: p.updated_at || new Date().toISOString(),
        };
      });

      vis.forEach((v) => {
        const cid = v.caregiver_id;
        if (!cid || !caregiverMap[cid]) return;
        caregiverMap[cid].visitsAssigned++;
        if (v.status === "completed") caregiverMap[cid].visitsCompleted++;
        const scheduled = new Date(v.scheduled_start).getTime();
        const checkedIn = v.check_in_time ? new Date(v.check_in_time).getTime() : null;
        if (checkedIn && checkedIn - scheduled > 15 * 60 * 1000) caregiverMap[cid].lateCheckIns++;
        if (v.duration_minutes) {
          caregiverMap[cid].avgDuration = Math.round((caregiverMap[cid].avgDuration + v.duration_minutes) / 2);
        }
      });

      setCaregivers(Object.values(caregiverMap));
      setPatients(pts.map((p) => ({
        id: p.id, full_name: p.full_name, risk_level: p.risk_level,
        risk_score: p.risk_score, primary_conditions: p.primary_conditions || [],
        address: p.address,
      })));
      setRecentAlerts(alr.map((a) => ({
        id: a.id, title: a.title, severity: a.severity,
        patient_name: (a.patients as Record<string, string>)?.full_name || "Unknown",
        created_at: a.created_at,
      })));
    } catch (e) {
      console.error("Admin data load error:", e);
      setNeedsSeed(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function seedData() {
    await fetch("/api/seed", { method: "POST", headers: { "x-seed-token": "healiox-dev-seed" } });
    loadData();
  }

  function exportCSV() {
    const rows = [
      ["Patient Name", "Risk Level", "Risk Score", "Conditions", "Address"],
      ...patients.map((p) => [p.full_name, p.risk_level, p.risk_score, p.primary_conditions.join("; "), p.address]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; a.download = "healiox-patients.csv"; a.click();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  if (needsSeed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="font-[var(--font-heading)] text-xl font-bold">Admin Portal</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">No organisation data found. Seed demo data to explore the admin dashboard.</p>
        <Button onClick={seedData} className="mt-6 bg-brand hover:bg-brand-dark text-white rounded-full px-6"><Database className="w-4 h-4 mr-2" />Seed Demo Data</Button>
      </div>
    );
  }

  // Chart data
  const riskDist = [
    { name: "Low", value: patients.filter((p) => p.risk_level === "low").length },
    { name: "Moderate", value: patients.filter((p) => p.risk_level === "moderate").length },
    { name: "High", value: patients.filter((p) => p.risk_level === "high").length },
    { name: "Emergency", value: patients.filter((p) => p.risk_level === "emergency").length },
  ].filter((d) => d.value > 0);

  const caregiverBarData = caregivers.map((c) => ({
    name: c.name.split(" ")[0],
    assigned: c.visitsAssigned,
    completed: c.visitsCompleted,
    late: c.lateCheckIns,
  }));

  // Revenue chart (last 6 months estimate)
  const revenueData = Array.from({ length: 6 }, (_, i) => {
    const m = new Date(); m.setMonth(m.getMonth() - (5 - i));
    const base = (stats?.completedVisitsToday ?? 3) * 850 * (18 + Math.floor(Math.random() * 6));
    return { month: m.toLocaleDateString("en-IN", { month: "short" }), revenue: base + Math.floor(Math.random() * 20000), target: base + 15000 };
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-black">{orgName}</h2>
          <p className="text-sm text-muted-foreground">Admin Portal · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs rounded-full">
            <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
          </Button>
          <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Live</Badge>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.key ? "bg-white shadow text-brand" : "text-muted-foreground hover:text-foreground"}`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && stats && (
        <div className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Patients", value: stats.totalPatients, icon: Users, color: "text-brand", bg: "bg-brand/10", sub: `${stats.activePatients} active` },
              { label: "Today's Visits", value: `${stats.completedVisitsToday}/${stats.totalVisitsToday}`, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", sub: "completed" },
              { label: "High Risk", value: stats.highRiskPatients, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", sub: "need attention" },
              { label: "Active Alerts", value: stats.activeAlerts, icon: Bell, color: "text-amber-600", bg: "bg-amber-50", sub: stats.activeAlerts > 0 ? "unresolved" : "all clear" },
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

          {/* Late check-in alert banner */}
          {stats.lateCheckIns > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">{stats.lateCheckIns} late check-in{stats.lateCheckIns > 1 ? "s" : ""} flagged today</p>
                  <p className="text-xs text-amber-700">Caregivers checked in more than 15 minutes after scheduled start time.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActiveTab("caregivers")} className="border-amber-300 text-amber-700 text-xs rounded-full">
                  View <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Risk distribution pie */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-[var(--font-heading)] font-bold mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-brand" />Patient Risk Distribution</h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskDist} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                        {riskDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Legend formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent alerts */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-[var(--font-heading)] font-bold mb-3 flex items-center gap-2"><Bell className="w-4 h-4 text-red-500" />Recent Alerts</h3>
                {recentAlerts.length === 0 ? (
                  <div className="text-center py-6"><CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No active alerts</p></div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {recentAlerts.map((a) => (
                      <div key={a.id} className={`p-2.5 rounded-lg border text-xs ${a.severity === "emergency" ? "border-red-300 bg-red-50" : a.severity === "urgent" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold truncate">{a.title}</span>
                          <Badge className={`text-[9px] ml-2 ${a.severity === "emergency" ? "bg-red-600 text-white" : a.severity === "urgent" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.severity}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5">{a.patient_name} · {new Date(a.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Avg risk + caregiver summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4 text-center">
              <Activity className="w-6 h-6 text-brand mx-auto mb-1" />
              <div className="font-[var(--font-heading)] text-3xl font-black">{stats.avgRiskScore}</div>
              <div className="text-xs text-muted-foreground">Avg Risk Score</div>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <UserCheck className="w-6 h-6 text-teal mx-auto mb-1" />
              <div className="font-[var(--font-heading)] text-3xl font-black">{stats.totalCaregivers}</div>
              <div className="text-xs text-muted-foreground">Active Caregivers</div>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <MapPinCheck className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <div className="font-[var(--font-heading)] text-3xl font-black">
                {stats.totalVisitsToday > 0 ? Math.round((stats.completedVisitsToday / stats.totalVisitsToday) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Visit Completion</div>
            </CardContent></Card>
          </div>
        </div>
      )}

      {/* ── CAREGIVERS TAB ── */}
      {activeTab === "caregivers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-[var(--font-heading)] font-bold">Caregiver Performance</h3>
            <Badge variant="secondary" className="text-xs">{new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</Badge>
          </div>

          {/* Caregiver bar chart */}
          {caregiverBarData.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h4 className="text-sm font-semibold mb-3">Visits Today by Caregiver</h4>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={caregiverBarData} barGap={2}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="assigned" name="Assigned" fill="#EA580C" opacity={0.4} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#EA580C" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="late" name="Late Check-ins" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Caregiver list */}
          {caregivers.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No caregiver profiles found. Seed demo data to populate.</p>
              <Button onClick={seedData} className="mt-3 bg-brand text-white rounded-full px-5 text-sm"><Database className="w-4 h-4 mr-1.5" />Seed Demo Data</Button>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {caregivers.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={c.lateCheckIns > 0 ? "border-amber-200" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand text-sm">
                            {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Last active: {new Date(c.lastActive).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {c.lateCheckIns > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 text-[9px]"><Clock className="w-2.5 h-2.5 mr-0.5" />{c.lateCheckIns} late</Badge>
                          )}
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: 5 }, (_, si) => (
                              <Star key={si} className={`w-3 h-3 ${si < Math.round(c.rating) ? "fill-current" : "stroke-current fill-transparent"}`} />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {[
                          { label: "Assigned", value: c.visitsAssigned },
                          { label: "Completed", value: c.visitsCompleted },
                          { label: "Late Check-ins", value: c.lateCheckIns },
                          { label: "Avg Duration", value: c.avgDuration ? `${c.avgDuration}m` : "—" },
                        ].map((stat) => (
                          <div key={stat.label} className="text-center bg-muted/30 rounded-lg p-2">
                            <div className={`font-[var(--font-heading)] font-black text-base ${stat.label === "Late Check-ins" && (stat.value as number) > 0 ? "text-amber-600" : ""}`}>{stat.value}</div>
                            <div className="text-[9px] text-muted-foreground">{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Completion rate bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Completion rate</span>
                          <span>{c.visitsAssigned > 0 ? Math.round((c.visitsCompleted / c.visitsAssigned) * 100) : 0}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full"
                            style={{ width: `${c.visitsAssigned > 0 ? Math.round((c.visitsCompleted / c.visitsAssigned) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PATIENTS TAB ── */}
      {activeTab === "patients" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-[var(--font-heading)] font-bold">All Patients ({patients.length})</h3>
            <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs rounded-full">
              <Download className="w-3.5 h-3.5 mr-1.5" />Export
            </Button>
          </div>

          {/* Risk filter chips */}
          <div className="flex gap-2 flex-wrap">
            {["All", "emergency", "high", "moderate", "low"].map((level) => (
              <Badge key={level} variant={level === "All" ? "default" : "secondary"} className="cursor-pointer text-xs capitalize">
                {level === "All" ? "All" : level} ({level === "All" ? patients.length : patients.filter((p) => p.risk_level === level).length})
              </Badge>
            ))}
          </div>

          <div className="space-y-2">
            {patients.sort((a, b) => a.risk_score - b.risk_score).map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${p.risk_level === "high" || p.risk_level === "emergency" ? "bg-red-100 text-red-700" : p.risk_level === "moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                          {p.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{p.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.address}</p>
                          {p.primary_conditions.length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {p.primary_conditions.slice(0, 2).map((c) => (
                                <Badge key={c} variant="secondary" className="text-[9px] px-1.5">{c}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-[var(--font-heading)] font-black text-xl">{p.risk_score}</div>
                        <Badge className={`text-[9px] ${p.risk_level === "high" || p.risk_level === "emergency" ? "bg-red-100 text-red-700" : p.risk_level === "moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{p.risk_level}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── REVENUE TAB ── */}
      {activeTab === "revenue" && stats && (
        <div className="space-y-5">
          {/* Revenue KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Est. Monthly Revenue", value: `₹${(stats.monthlyRevenue / 1000).toFixed(0)}K`, icon: IndianRupee, color: "text-green-600", bg: "bg-green-50", sub: "based on completed visits" },
              { label: "Revenue/Visit", value: "₹850", icon: TrendingUp, color: "text-brand", bg: "bg-brand/10", sub: "avg service rate" },
              { label: "Active Contracts", value: stats.activePatients, icon: Shield, color: "text-teal", bg: "bg-teal/10", sub: "care plans running" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card><CardContent className="p-4">
                  <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                  <div className="font-[var(--font-heading)] text-2xl font-black">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  <div className="text-[9px] text-muted-foreground/70 mt-0.5">{s.sub}</div>
                </CardContent></Card>
              </motion.div>
            ))}
          </div>

          {/* Revenue chart */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-[var(--font-heading)] font-bold mb-3">Monthly Revenue (₹) — 6 Month View</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} barGap={4}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, ""]} />
                    <Bar dataKey="revenue" name="Revenue" fill="#EA580C" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Target" fill="#EA580C" opacity={0.2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue breakdown */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-[var(--font-heading)] font-bold mb-3">Revenue Breakdown by Service</h3>
              <div className="space-y-2">
                {[
                  { service: "Personal Care", visits: Math.ceil(stats.completedVisitsToday * 0.3), rate: 750 },
                  { service: "Nursing Care", visits: Math.ceil(stats.completedVisitsToday * 0.25), rate: 1200 },
                  { service: "Medication Assistance", visits: Math.ceil(stats.completedVisitsToday * 0.2), rate: 600 },
                  { service: "Meal Preparation", visits: Math.ceil(stats.completedVisitsToday * 0.15), rate: 500 },
                  { service: "Mobility Support", visits: Math.ceil(stats.completedVisitsToday * 0.1), rate: 650 },
                ].map((row) => {
                  const amount = row.visits * row.rate * 22;
                  const maxAmount = stats.completedVisitsToday * 1200 * 22;
                  const pct = maxAmount > 0 ? Math.min(100, Math.round((amount / maxAmount) * 100)) : 0;
                  return (
                    <div key={row.service} className="flex items-center gap-3">
                      <div className="w-36 text-xs text-muted-foreground shrink-0">{row.service}</div>
                      <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-20 text-xs text-right font-semibold">₹{amount.toLocaleString("en-IN")}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-4">* Estimated based on {stats.completedVisitsToday} visits/day × 22 working days. Actual may vary.</p>
            </CardContent>
          </Card>

          {/* SaaS plan info */}
          <Card className="border-brand/20 bg-brand/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand" />Your HealioX Plan
                </h3>
                <Badge className="bg-brand text-white">Professional</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white rounded-xl p-3 border"><div className="text-lg font-[var(--font-heading)] font-black">50</div><div className="text-[10px] text-muted-foreground">Patients included</div></div>
                <div className="bg-white rounded-xl p-3 border"><div className="text-lg font-[var(--font-heading)] font-black">₹2,999</div><div className="text-[10px] text-muted-foreground">Per month</div></div>
                <div className="bg-white rounded-xl p-3 border"><div className="text-lg font-[var(--font-heading)] font-black">Unlimited</div><div className="text-[10px] text-muted-foreground">Caregivers</div></div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Renews on 1st May 2026 · <span className="text-brand font-semibold cursor-pointer hover:underline">Upgrade to Enterprise</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
