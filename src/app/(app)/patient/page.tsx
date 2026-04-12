"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  HeartPulse, Mic, Camera, MessageCircle, Activity,
  Calendar, MapPin, Phone, User, ArrowRight, Loader2,
  Clock, AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useHealthCheckins, useVisits } from "@/hooks/use-supabase-data";

export default function PatientPortal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingPatientId = searchParams.get("patientId");

  const [patientId, setPatientId] = useState(existingPatientId || "");
  const [patientName, setPatientName] = useState("");
  const [patientData, setPatientData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);

  const { visits } = useVisits();
  const { checkins } = useHealthCheckins(patientId || undefined);

  // Onboarding form
  const [formName, setFormName] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmergencyName, setFormEmergencyName] = useState("");
  const [formEmergencyPhone, setFormEmergencyPhone] = useState("");

  // On mount: find THIS user's linked patient (not all patients)
  useEffect(() => {
    async function findMyPatient() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); setIsNew(true); return; }

        // Check if this user IS a patient (has a patient_assignments record)
        const { data: assignments } = await supabase
          .from("patient_assignments")
          .select("patient_id, patients(*)")
          .eq("profile_id", user.id)
          .limit(1);

        if (assignments && assignments.length > 0) {
          const p = (assignments[0] as Record<string, unknown>).patients as Record<string, unknown>;
          setPatientId(p.id as string);
          setPatientName(p.full_name as string);
          setPatientData(p);
          setLoading(false);
          return;
        }

        // Check if there's a patient with same email
        const { data: patientByEmail } = await supabase
          .from("patients")
          .select("*")
          .eq("email", user.email)
          .limit(1);

        if (patientByEmail && patientByEmail.length > 0) {
          setPatientId(patientByEmail[0].id);
          setPatientName(patientByEmail[0].full_name);
          setPatientData(patientByEmail[0]);
          setLoading(false);
          return;
        }

        // Check URL param
        if (existingPatientId) {
          const { data: p } = await supabase.from("patients").select("*").eq("id", existingPatientId).single();
          if (p) {
            setPatientId(p.id);
            setPatientName(p.full_name);
            setPatientData(p);
            setLoading(false);
            return;
          }
        }

        // No patient found — show onboarding
        setIsNew(true);
        // Pre-fill name from user metadata
        setFormName(user.user_metadata?.full_name || "");
      } catch (e) {
        console.error(e);
        setIsNew(true);
      }
      setLoading(false);
    }
    findMyPatient();
  }, [existingPatientId]);

  const patientVisits = visits.filter((v) => v.patient_id === patientId);
  const nextVisit = patientVisits.find((v) => v.status === "scheduled");
  const lastCheckin = checkins[0];

  const riskColors: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    moderate: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
    emergency: "bg-red-600 text-white",
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-teal" /></div>;
  }

  // ── NEW PATIENT: Onboarding form ──
  if (isNew || (!patientId && !existingPatientId)) {
    return (
      <div className="max-w-lg mx-auto py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 bg-teal/20 rounded-full animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center shadow-lg shadow-teal/30">
              <HeartPulse className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="font-[var(--font-heading)] text-2xl font-black">Welcome to HealioX</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Let&apos;s set up your profile. Then you&apos;ll talk to our AI health assistant about your needs.
          </p>
        </motion.div>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium flex items-center gap-1 mb-1"><User className="w-3 h-3" />Full Name *</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Margaret Sullivan" className="h-10 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" />Date of Birth</label>
                <Input type="date" value={formDob} onChange={(e) => setFormDob(e.target.value)} className="h-10 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" />Address</label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="42 Rose St, Nedlands WA 6009" className="h-10 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Phone</label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="04XX XXX XXX" className="h-10 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Emergency Contact</label>
                <Input value={formEmergencyName} onChange={(e) => setFormEmergencyName(e.target.value)} placeholder="Name" className="h-10 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Their Phone</label>
                <Input value={formEmergencyPhone} onChange={(e) => setFormEmergencyPhone(e.target.value)} placeholder="04XX XXX XXX" className="h-10 text-sm" />
              </div>
            </div>
            <Button onClick={() => router.push(`/patient/checkin?mode=onboarding&name=${encodeURIComponent(formName)}&dob=${formDob}&address=${encodeURIComponent(formAddress)}&phone=${formPhone}&emergName=${encodeURIComponent(formEmergencyName)}&emergPhone=${formEmergencyPhone}`)}
              disabled={!formName}
              className="w-full h-11 bg-gradient-to-r from-teal to-teal-dark text-white rounded-xl">
              Continue to Health Assessment <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── EXISTING PATIENT: Home with summary ──
  return (
    <div className="max-w-2xl mx-auto py-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center shadow-lg">
            <HeartPulse className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="font-[var(--font-heading)] text-xl font-black">Hello, {patientName}!</h2>
            <p className="text-sm text-muted-foreground">Your AI health assistant is ready.</p>
          </div>
        </div>
      </motion.div>

      {/* Next visit */}
      {nextVisit && (
        <Card className="border-teal/30 bg-teal/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-teal" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Your Next Visit</p>
              <p className="text-xs text-muted-foreground">
                {new Date(nextVisit.scheduled_start).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })} at{" "}
                {new Date(nextVisit.scheduled_start).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-700 text-xs"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>
          </CardContent>
        </Card>
      )}

      {/* Last check-in */}
      {lastCheckin && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold flex items-center gap-1.5"><Activity className="w-4 h-4 text-brand" />Last Health Check-in</p>
              <Badge className={riskColors[lastCheckin.risk_level || "moderate"] || "bg-gray-100"}>Score: {lastCheckin.risk_score}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{lastCheckin.ai_summary || "Check-in completed."}</p>
            {lastCheckin.flags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {lastCheckin.flags.map((f) => <Badge key={f} className="bg-amber-100 text-amber-700 text-[9px]"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{f}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* START CHECK-IN CTA */}
      <Card className="border-2 border-teal/30 bg-gradient-to-br from-teal/5 to-white">
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex justify-center gap-6">
            {[{ icon: Mic, label: "Voice", color: "bg-teal/10 text-teal" }, { icon: Camera, label: "Camera", color: "bg-brand/10 text-brand" }, { icon: MessageCircle, label: "Chat", color: "bg-violet-50 text-violet-600" }].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}><Icon className="w-6 h-6" /></div>
                <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <div>
            <h3 className="font-[var(--font-heading)] text-lg font-bold">Talk to Your Health Assistant</h3>
            <p className="text-sm text-muted-foreground mt-1">Speak, type, or show — describe how you&apos;re feeling.</p>
          </div>
          <Button onClick={() => router.push(`/patient/checkin?patientId=${patientId}&patientName=${encodeURIComponent(patientName)}`)}
            size="lg" className="bg-gradient-to-r from-teal to-teal-dark text-white rounded-full px-10 h-14 text-base shadow-xl shadow-teal/25">
            <HeartPulse className="w-5 h-5 mr-2" />Start Health Check-in
          </Button>
          <p className="text-[10px] text-muted-foreground">Takes 2-3 minutes. Results shared with your care team.</p>
        </CardContent>
      </Card>

      {/* Check-in history */}
      {checkins.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Your Check-in History</h3>
            <div className="space-y-2">
              {checkins.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-[var(--font-heading)] font-bold tabular-nums">{c.risk_score}</span>
                    <Badge className={`${riskColors[c.risk_level || "moderate"]} text-[9px]`}>{(c.risk_level || "moderate").toUpperCase()}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
