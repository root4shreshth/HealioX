"use client";

import { use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Activity, MapPinCheck, Phone, AlertTriangle,
  CheckCircle2, Heart, Brain, Moon, Utensils, Footprints, Pill,
  Frown, Clock, Shield, Loader2, MessageCircle,
} from "lucide-react";
import { usePatients, useHealthCheckins, useVisits } from "@/hooks/use-supabase-data";
import { calculateCareQuality } from "@/lib/care-metrics";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";

const riskBadge: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  moderate: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  emergency: "bg-red-600 text-white",
};

const domainIcons: Record<string, typeof Activity> = {
  mood: Frown, pain: AlertTriangle, mobility: Footprints,
  medication: Pill, sleep: Moon, appetite: Utensils, cognition: Brain,
};

export default function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const { patients, loading: pLoading } = usePatients();
  const { checkins, loading: cLoading } = useHealthCheckins(patientId);
  const { visits, loading: vLoading } = useVisits();

  const loading = pLoading || cLoading || vLoading;
  const patient = patients.find((p) => p.id === patientId);
  const patientVisits = visits.filter((v) => v.patient_id === patientId);
  const latestCheckin = checkins[0]; // Already sorted by created_at DESC

  // Trend data from real check-ins
  const trendData = checkins
    .filter((c) => c.risk_score !== null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((c) => ({
      date: new Date(c.created_at).toISOString().split("T")[0],
      score: c.risk_score,
    }));

  // Radar data from latest check-in
  const radarData = latestCheckin?.domains
    ? Object.entries(latestCheckin.domains).map(([key, val]) => ({
        domain: key.charAt(0).toUpperCase() + key.slice(1),
        score: val.score,
      }))
    : [];

  // Care quality
  const careQuality = calculateCareQuality(
    patientVisits.map((v) => ({ id: v.id, status: v.status, gps_verified: v.gps_verified, duration_minutes: v.duration_minutes, services: v.services })),
    checkins.map((c) => ({ risk_score: c.risk_score, risk_level: c.risk_level, created_at: c.created_at }))
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Patient not found</p>
        <Link href="/dashboard/patients"><Button variant="ghost" className="mt-4">Back</Button></Link>
      </div>
    );
  }

  // Build care timeline (visits + check-ins merged by time)
  type TimelineEntry = { type: "visit" | "checkin"; time: string; data: Record<string, unknown> };
  const timeline: TimelineEntry[] = [
    ...patientVisits.filter((v) => v.status === "completed").map((v) => ({
      type: "visit" as const,
      time: v.check_in_time || v.scheduled_start,
      data: v as unknown as Record<string, unknown>,
    })),
    ...checkins.map((c) => ({
      type: "checkin" as const,
      time: c.created_at,
      data: c as unknown as Record<string, unknown>,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/dashboard/patients">
        <Button variant="ghost" size="sm" className="text-muted-foreground"><ArrowLeft className="w-4 h-4 mr-1" />All Patients</Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            patient.risk_level === "high" || patient.risk_level === "emergency" ? "bg-red-100" :
            patient.risk_level === "moderate" ? "bg-amber-100" : "bg-green-100"
          }`}>
            <span className="text-xl font-[var(--font-heading)] font-black">
              {patient.full_name.split(" ").map((n) => n[0]).join("")}
            </span>
          </div>
          <div>
            <h2 className="font-[var(--font-heading)] text-2xl font-black">{patient.full_name}</h2>
            <p className="text-sm text-muted-foreground">Age {patient.age} &middot; {patient.address}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {patient.primary_conditions.map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-3xl font-[var(--font-heading)] font-black tabular-nums">{patient.risk_score}</div>
            <Badge className={`${riskBadge[patient.risk_level] || ""} text-xs`}>{patient.risk_level.toUpperCase()} RISK</Badge>
          </div>
          <Link href={`/patient?patientId=${patient.id}&patientName=${encodeURIComponent(patient.full_name)}`}>
            <Button size="sm" className="bg-teal hover:bg-teal-dark text-white rounded-full">
              <MessageCircle className="w-4 h-4 mr-1" />AI Check-in
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Activity className="w-5 h-5 text-brand mx-auto mb-1" />
          <div className="text-lg font-[var(--font-heading)] font-bold">{patient.risk_score}</div>
          <div className="text-[10px] text-muted-foreground">Risk Score</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <MapPinCheck className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <div className="text-lg font-[var(--font-heading)] font-bold">{patientVisits.filter((v) => v.status === "completed").length}</div>
          <div className="text-[10px] text-muted-foreground">Verified Visits</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Heart className="w-5 h-5 text-teal mx-auto mb-1" />
          <div className="text-lg font-[var(--font-heading)] font-bold">{careQuality.overall}%</div>
          <div className="text-[10px] text-muted-foreground">Care Quality</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Phone className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <div className="text-xs font-semibold truncate">{patient.emergency_contact_name}</div>
          <div className="text-[10px] text-muted-foreground">Emergency Contact</div>
        </CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Trend chart */}
        <Card className="lg:col-span-3">
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold mb-4">Health Trend (from AI check-ins)</h3>
            <div className="h-56">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="patientGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EA580C" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                    <Area type="monotone" dataKey="score" stroke="#EA580C" strokeWidth={2} fill="url(#patientGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No check-in data yet. Run an AI health check-in to see trends.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Radar */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold mb-4">Health Domains</h3>
            {radarData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10 }} />
                    <Radar dataKey="score" stroke="#0D9488" fill="#0D9488" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No domain data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest check-in domains */}
      {latestCheckin && Object.keys(latestCheckin.domains).length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold mb-4">Latest Check-in Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(latestCheckin.domains).map(([domain, data]) => {
                const Icon = domainIcons[domain] || Activity;
                return (
                  <div key={domain} className="p-3 rounded-xl border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <Badge className={`text-[9px] ${data.trend === "declining" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                        {data.trend === "declining" ? "Declining" : "Stable"}
                      </Badge>
                    </div>
                    <div className="text-xl font-[var(--font-heading)] font-black tabular-nums">{data.score}</div>
                    <div className="text-xs text-muted-foreground capitalize">{domain}</div>
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${data.score >= 70 ? "bg-green-500" : data.score >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${data.score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {latestCheckin.ai_summary && (
              <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm font-semibold mb-1">AI Summary</p>
                <p className="text-sm text-muted-foreground">{latestCheckin.ai_summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Care Timeline — complete audit trail */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-[var(--font-heading)] font-bold flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-brand" />Care Timeline
          </h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No care activity recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((entry, i) => (
                <div key={i} className="flex gap-4 p-3 rounded-xl border border-border">
                  <div className="text-xs text-muted-foreground font-mono min-w-[80px]">
                    {new Date(entry.time).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    <br />
                    {new Date(entry.time).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
                  </div>
                  {entry.type === "visit" ? (
                    <>
                      <MapPinCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">Care Visit</p>
                        <p className="text-xs text-muted-foreground">
                          {(entry.data as unknown as { duration_minutes: number }).duration_minutes} min &middot;
                          GPS {(entry.data as unknown as { gps_verified: boolean }).gps_verified ? "verified" : "unverified"} &middot;
                          {((entry.data as unknown as { services: string[] }).services || []).length} services
                        </p>
                        {(entry.data as unknown as { caregiver_notes: string }).caregiver_notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            &ldquo;{(entry.data as unknown as { caregiver_notes: string }).caregiver_notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5 text-teal shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">AI Health Check-in</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs">Risk Score: <strong>{(entry.data as unknown as { risk_score: number }).risk_score}</strong></span>
                          <Badge className={`text-[9px] ${riskBadge[(entry.data as unknown as { risk_level: string }).risk_level] || ""}`}>
                            {((entry.data as unknown as { risk_level: string }).risk_level || "").toUpperCase()}
                          </Badge>
                        </div>
                        {((entry.data as unknown as { flags: string[] }).flags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {((entry.data as unknown as { flags: string[] }).flags).map((f: string) => (
                              <Badge key={f} className="bg-red-100 text-red-700 text-[9px]">{f}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
