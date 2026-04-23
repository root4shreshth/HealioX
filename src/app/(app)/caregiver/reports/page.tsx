"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Calendar, Clock, Users, Star, CheckCircle2, AlertTriangle,
  TrendingUp, FileText, Download, Heart, Activity, Award, Printer,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";

type Report = {
  caregiver: { id: string; name: string; email: string; hire_date: string | null; specializations: string[] };
  period: "week" | "month";
  from: string;
  to: string;
  summary: {
    total_visits: number;
    completed_visits: number;
    scheduled_visits: number;
    total_hours: number;
    unique_patients: number;
    late_checkins: number;
    completion_rate: number;
    on_time_rate: number;
    avg_rating: number;
    rating_count: number;
    concerns_raised: number;
    medications_administered: number;
  };
  daily: { date: string; visits: number; hours: number }[];
  services: { name: string; count: number }[];
  patients: { id: string; name: string; address: string; visitCount: number; hours: number }[];
  concerns: string[];
  ratings: { stars: number; comment: string | null; created_at: string }[];
};

export default function CaregiverReportsPage() {
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await fetch(`/api/caregivers/${user.id}/report?period=${period}`, { credentials: "include" });
    if (res.ok) setReport(await res.json());
    setLoading(false);
  }, [user?.id, period]);

  useEffect(() => { load(); }, [load]);

  function exportPdf() { window.print(); }

  function exportCsv() {
    if (!report) return;
    const rows: (string | number)[][] = [
      ["Report Period", period],
      ["From", report.from],
      ["To", report.to],
      [],
      ["Summary"],
      ["Total Visits", report.summary.total_visits],
      ["Completed", report.summary.completed_visits],
      ["Hours Delivered", report.summary.total_hours],
      ["Unique Patients", report.summary.unique_patients],
      ["Completion Rate %", report.summary.completion_rate],
      ["On-time Rate %", report.summary.on_time_rate],
      ["Late Check-ins", report.summary.late_checkins],
      ["Avg Rating", report.summary.avg_rating],
      ["Medications Administered", report.summary.medications_administered],
      [],
      ["Patient Name", "Address", "Visits", "Hours"],
      ...report.patients.map((p) => [p.name, p.address, p.visitCount, p.hours]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `caregiver-report-${period}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;
  if (!report) return <div className="text-center py-20 text-muted-foreground text-sm">No report data available yet.</div>;

  const { summary, daily, services, patients, concerns, ratings } = report;

  return (
    <div className="space-y-5 print:space-y-3 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-black">My Reports</h2>
          <p className="text-sm text-muted-foreground">Track your work, completion rates, and feedback</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
            {(["week", "month"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  period === p ? "bg-white shadow text-brand" : "text-muted-foreground"
                }`}>
                This {p}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} className="text-xs rounded-full"><Download className="w-3.5 h-3.5 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportPdf} className="text-xs rounded-full"><Printer className="w-3.5 h-3.5 mr-1" />Print / PDF</Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-black">{report.caregiver.name} — Care Report</h1>
        <p className="text-sm">{new Date(report.from).toLocaleDateString()} – {new Date(report.to).toLocaleDateString()} ({period})</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Visits Completed", value: summary.completed_visits, sub: `of ${summary.total_visits} total`, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Hours Delivered", value: `${summary.total_hours}h`, sub: `over ${summary.unique_patients} patients`, icon: Clock, color: "text-brand", bg: "bg-brand/10" },
          { label: "Completion Rate", value: `${summary.completion_rate}%`, sub: `${summary.on_time_rate}% on time`, icon: TrendingUp, color: "text-teal", bg: "bg-teal/10" },
          { label: "Avg Rating", value: summary.avg_rating > 0 ? summary.avg_rating : "—", sub: `${summary.rating_count} review${summary.rating_count !== 1 ? "s" : ""}`, icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
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

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <div className="font-[var(--font-heading)] font-black text-xl">{summary.medications_administered}</div>
          <div className="text-[10px] text-muted-foreground">Medications administered</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <div className="font-[var(--font-heading)] font-black text-xl">{summary.concerns_raised}</div>
          <div className="text-[10px] text-muted-foreground">Concerns flagged</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <div className="font-[var(--font-heading)] font-black text-xl">{summary.late_checkins}</div>
          <div className="text-[10px] text-muted-foreground">Late check-ins</div>
        </CardContent></Card>
      </div>

      {/* Daily breakdown */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-[var(--font-heading)] font-bold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand" />Daily Activity
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs><linearGradient id="gradDaily" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EA580C" stopOpacity={0.25} /><stop offset="95%" stopColor="#EA580C" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Area type="monotone" dataKey="visits" stroke="#EA580C" strokeWidth={2} fill="url(#gradDaily)" name="Visits" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Services + Patients */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold mb-3">Services Delivered</h3>
            {services.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No services logged yet</p>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={services} layout="vertical" margin={{ left: 60 }}>
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#14b8a6" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal" />Patients Cared For
            </h3>
            {patients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No patients yet</p>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {patients.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.address}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-sm font-[var(--font-heading)] font-black">{p.visitCount}</div>
                      <div className="text-[9px] text-muted-foreground">{p.hours}h</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ratings + Concerns */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />Family Feedback
            </h3>
            {ratings.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No ratings yet this {period}</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ratings.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }, (_, s) => (
                          <Star key={s} className={`w-3 h-3 ${s < r.stars ? "fill-current" : "stroke-current fill-transparent"}`} />
                        ))}
                      </div>
                      <span className="text-[9px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    </div>
                    {r.comment && <p className="text-xs text-foreground">&ldquo;{r.comment}&rdquo;</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />Concerns Flagged
            </h3>
            {concerns.length === 0 ? (
              <div className="text-center py-6"><CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" /><p className="text-xs text-muted-foreground">No concerns raised — great work</p></div>
            ) : (
              <div className="space-y-1.5">
                {concerns.map((c, i) => (
                  <div key={i} className="text-xs p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />{c}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-xs text-muted-foreground print:mt-4">
        Generated by HealioX · {new Date().toLocaleString("en-IN")}
      </div>
    </div>
  );
}
