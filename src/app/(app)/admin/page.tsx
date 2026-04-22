"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, AlertTriangle, Activity, TrendingUp, Loader2,
  Bell, CheckCircle2, Clock, UserCheck, IndianRupee,
  Calendar, ArrowRight, Heart, AlertCircle, Zap, Database,
  Shield, Plus, BarChart3, Stethoscope,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";

// ── Types from /api/admin/stats ──────────────────────────────────────────────
type StatsResponse = {
  kpis: {
    total_patients: number;
    total_caregivers: number;
    visits_today: number;
    visits_completed_today: number;
    completion_rate: number;
    late_checkins: number;
    active_alerts: number;
    avg_risk_score: number;
  };
  risk_distribution: { low: number; moderate: number; high: number; emergency: number };
  alert_severity: { emergency: number; urgent: number; warning: number; info: number };
  top_conditions: { name: string; count: number }[];
  visit_volume_7d: { date: string; visits: number; completed: number }[];
  risk_trend_30d: { date: string; avg: number }[];
  recent_alerts: { id: string; severity: string; type: string; patient_name: string; created_at: string }[];
  recent_activity: { id: string; action: string; entity: string | null; created_at: string; metadata: Record<string, unknown> }[];
  revenue: { weekly_inr: number; projected_monthly_inr: number; completed_visits_week: number };
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#7f1d1d"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [orgName, setOrgName] = useState("Your Organization");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [statsRes, orgRes] = await Promise.all([
        fetch("/api/admin/stats", { credentials: "include" }),
        fetch("/api/admin/organization", { credentials: "include" }),
      ]);

      if (!statsRes.ok) {
        const body = await statsRes.json().catch(() => ({ error: "Failed to load" }));
        setError(body.error || "Could not load dashboard");
        setLoading(false);
        return;
      }

      const statsData: StatsResponse = await statsRes.json();
      setStats(statsData);

      if (orgRes.ok) {
        const { organization } = await orgRes.json();
        if (organization?.name) setOrgName(organization.name);
      }
    } catch (e) {
      console.error(e);
      setError("Network error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="font-[var(--font-heading)] text-xl font-bold">Unable to load dashboard</h3>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
        <Button onClick={load} className="mt-4 bg-brand text-white rounded-full px-6">Retry</Button>
      </div>
    );
  }

  const { kpis, risk_distribution, alert_severity, top_conditions, visit_volume_7d, risk_trend_30d, recent_alerts, recent_activity, revenue } = stats;

  const riskDist = [
    { name: "Low", value: risk_distribution.low },
    { name: "Moderate", value: risk_distribution.moderate },
    { name: "High", value: risk_distribution.high },
    { name: "Emergency", value: risk_distribution.emergency },
  ].filter((d) => d.value > 0);

  const alertDist = [
    { name: "Emergency", value: alert_severity.emergency, color: "#7f1d1d" },
    { name: "Urgent", value: alert_severity.urgent, color: "#ef4444" },
    { name: "Warning", value: alert_severity.warning, color: "#f59e0b" },
    { name: "Info", value: alert_severity.info, color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-black">{orgName}</h2>
          <p className="text-sm text-muted-foreground">
            Control center · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Live</Badge>
          <Link href="/admin/caregivers"><Button size="sm" variant="outline" className="rounded-full text-xs"><Plus className="w-3.5 h-3.5 mr-1" />Add Caregiver</Button></Link>
          <Link href="/admin/patients"><Button size="sm" className="bg-brand hover:bg-brand-dark text-white rounded-full text-xs"><Plus className="w-3.5 h-3.5 mr-1" />Onboard Patient</Button></Link>
        </div>
      </div>

      {/* ── Primary KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active Patients", value: kpis.total_patients, icon: Users, color: "text-brand", bg: "bg-brand/10", sub: "under care", href: "/admin/patients" },
          { label: "Caregivers", value: kpis.total_caregivers, icon: UserCheck, color: "text-teal", bg: "bg-teal/10", sub: "on roster", href: "/admin/caregivers" },
          { label: "Visits Today", value: `${kpis.visits_completed_today}/${kpis.visits_today}`, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", sub: `${kpis.completion_rate}% complete`, href: "/admin/schedule" },
          { label: "Active Alerts", value: kpis.active_alerts, icon: Bell, color: "text-red-500", bg: "bg-red-50", sub: kpis.active_alerts > 0 ? "need review" : "all clear", href: "/admin/alerts" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={s.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </div>
                  <div className="mt-3 font-[var(--font-heading)] text-2xl font-black">{s.value}</div>
                  <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">{s.sub}</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Attention banner ── */}
      {(kpis.late_checkins > 0 || alert_severity.emergency > 0) && (
        <div className="space-y-2">
          {alert_severity.emergency > 0 && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center animate-pulse"><Zap className="w-4 h-4 text-white" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">{alert_severity.emergency} emergency alert{alert_severity.emergency > 1 ? "s" : ""} requires immediate attention</p>
                  <p className="text-xs text-red-700">Patients may be in critical condition. Review now.</p>
                </div>
                <Link href="/admin/alerts"><Button size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-full text-xs">Review Now</Button></Link>
              </CardContent>
            </Card>
          )}
          {kpis.late_checkins > 0 && (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">{kpis.late_checkins} caregiver{kpis.late_checkins > 1 ? "s" : ""} checked in late today</p>
                  <p className="text-xs text-amber-700">More than 15 minutes after scheduled start time.</p>
                </div>
                <Link href="/admin/caregivers"><Button size="sm" variant="outline" className="border-amber-300 text-amber-700 text-xs rounded-full">View</Button></Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Row 1: Visit volume + Risk distribution ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-brand" />Visit Volume — Last 7 Days</h3>
              <Badge variant="secondary" className="text-xs">{visit_volume_7d.reduce((s, d) => s + d.visits, 0)} total</Badge>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visit_volume_7d} barGap={3}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="visits" name="Scheduled" fill="#EA580C" opacity={0.35} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#EA580C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2 mb-3"><Shield className="w-4 h-4 text-brand" />Risk Distribution</h3>
            {riskDist.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No patients yet</p>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskDist} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                      {riskDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Legend formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Risk trend + Alerts ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-teal" />Avg Risk Score — 30 Day Trend</h3>
              <div className="text-right">
                <div className="text-xl font-[var(--font-heading)] font-black">{kpis.avg_risk_score}</div>
                <div className="text-[10px] text-muted-foreground">current avg</div>
              </div>
            </div>
            {risk_trend_30d.length > 1 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={risk_trend_30d}>
                    <defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} /><stop offset="95%" stopColor="#14b8a6" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="avg" stroke="#14b8a6" strokeWidth={2} fill="url(#trendGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-muted-foreground gap-2 text-sm">
                <Activity className="w-8 h-8 text-muted-foreground/30" />Need more check-ins to plot a trend
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2"><Bell className="w-4 h-4 text-red-500" />Recent Alerts</h3>
              <Link href="/admin/alerts"><Button variant="ghost" size="sm" className="text-xs text-brand">View all<ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
            </div>
            {recent_alerts.length === 0 ? (
              <div className="text-center py-10"><CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No active alerts</p></div>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {recent_alerts.map((a) => (
                  <div key={a.id} className={`p-2.5 rounded-lg border ${a.severity === "emergency" ? "border-red-300 bg-red-50" : a.severity === "urgent" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">{a.patient_name}</span>
                      <Badge className={`text-[9px] shrink-0 ${a.severity === "emergency" ? "bg-red-600 text-white" : a.severity === "urgent" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.severity}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{a.type.replace(/_/g, " ")} · {new Date(a.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Top conditions + Revenue + Activity ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2 mb-3"><Stethoscope className="w-4 h-4 text-brand" />Top Conditions</h3>
            {top_conditions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No conditions tracked yet</p>
            ) : (
              <div className="space-y-2">
                {top_conditions.map((c) => {
                  const max = top_conditions[0]?.count || 1;
                  const pct = (c.count / max) * 100;
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium truncate">{c.name}</span>
                        <span className="text-muted-foreground">{c.count}</span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-teal/20 bg-teal/5">
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2 mb-3"><IndianRupee className="w-4 h-4 text-teal" />Revenue</h3>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">This week</div>
                <div className="font-[var(--font-heading)] text-2xl font-black">₹{revenue.weekly_inr.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-muted-foreground">{revenue.completed_visits_week} completed visits</div>
              </div>
              <div className="pt-3 border-t border-teal/20">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Projected monthly</div>
                <div className="font-[var(--font-heading)] text-xl font-black text-teal">₹{revenue.projected_monthly_inr.toLocaleString("en-IN")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-violet-500" />Recent Activity</h3>
            {recent_activity.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No activity yet</p>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {recent_activity.map((act) => (
                  <div key={act.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30">
                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-violet-600">{(act.action[0] || "?").toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate capitalize">{act.action.replace(/\./g, " → ").replace(/_/g, " ")}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(act.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
