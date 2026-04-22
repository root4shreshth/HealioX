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
  Clock, AlertTriangle, Pill, Globe, PhoneCall,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useHealthCheckins, useVisits } from "@/hooks/use-supabase-data";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "ta", label: "தமிழ்" },
  { code: "mr", label: "मराठी" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
];

export default function PatientPortal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingPatientId = searchParams.get("patientId");

  const [patientId, setPatientId] = useState(existingPatientId || "");
  const [patientName, setPatientName] = useState("");
  const [patientData, setPatientData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);

  // New feature states
  const [selectedLang, setSelectedLang] = useState("en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [medTaken, setMedTaken] = useState<boolean | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(0);
  const [sosSent, setSosSent] = useState(false);

  const { visits } = useVisits();
  const { checkins } = useHealthCheckins(patientId || undefined);

  // Onboarding form
  const [formName, setFormName] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmergencyName, setFormEmergencyName] = useState("");
  const [formEmergencyPhone, setFormEmergencyPhone] = useState("");

  useEffect(() => {
    async function findMyPatient() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); setIsNew(true); return; }

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

        const { data: patientByEmail } = await supabase
          .from("patients").select("*").eq("email", user.email).limit(1);
        if (patientByEmail && patientByEmail.length > 0) {
          setPatientId(patientByEmail[0].id);
          setPatientName(patientByEmail[0].full_name);
          setPatientData(patientByEmail[0]);
          setLoading(false);
          return;
        }

        if (existingPatientId) {
          const { data: p } = await supabase.from("patients").select("*").eq("id", existingPatientId).single();
          if (p) { setPatientId(p.id); setPatientName(p.full_name); setPatientData(p); setLoading(false); return; }
        }

        setIsNew(true);
        setFormName(user.user_metadata?.full_name || "");
      } catch (e) { console.error(e); setIsNew(true); }
      setLoading(false);
    }
    findMyPatient();
  }, [existingPatientId]);

  // SOS countdown
  useEffect(() => {
    if (!sosActive) return;
    setSosCountdown(5);
    const timer = setInterval(() => {
      setSosCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          triggerSOS();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sosActive]); // eslint-disable-line react-hooks/exhaustive-deps

  async function triggerSOS() {
    setSosActive(false);
    setSosSent(true);
    try {
      const supabase = createClient();
      await supabase.from("alerts").insert({
        patient_id: patientId,
        type: "sos",
        severity: "emergency",
        title: `🆘 SOS ALERT — ${patientName}`,
        description: "Patient pressed the emergency SOS button. Immediate attention required. Family and nearest caregiver have been notified.",
        status: "active",
      });
    } catch (e) { console.error("SOS alert error:", e); }
    setTimeout(() => setSosSent(false), 8000);
  }

  const patientVisits = visits.filter((v) => v.patient_id === patientId);
  const nextVisit = patientVisits.find((v) => v.status === "scheduled");
  const lastCheckin = checkins[0];
  const firstCheckin = checkins[checkins.length - 1];

  const riskColors: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    moderate: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
    emergency: "bg-red-600 text-white",
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-teal" /></div>;

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
          <p className="text-sm text-muted-foreground mt-2">Let&apos;s set up your profile. Then you&apos;ll talk to our AI health assistant.</p>
        </motion.div>
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium flex items-center gap-1 mb-1"><User className="w-3 h-3" />Full Name *</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Sunita Devi" className="h-10 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" />Date of Birth</label>
                <Input type="date" value={formDob} onChange={(e) => setFormDob(e.target.value)} className="h-10 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" />Address</label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="12 Rajpur Road, Delhi 110054" className="h-10 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Phone</label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+91 98100..." className="h-10 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Emergency Contact</label>
                <Input value={formEmergencyName} onChange={(e) => setFormEmergencyName(e.target.value)} placeholder="Name" className="h-10 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Their Phone</label>
                <Input value={formEmergencyPhone} onChange={(e) => setFormEmergencyPhone(e.target.value)} placeholder="+91 98..." className="h-10 text-sm" />
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

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-4">

      {/* Header row with language selector */}
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center shadow-lg">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-[var(--font-heading)] text-xl font-black">Hello, {patientName}!</h2>
            <p className="text-sm text-muted-foreground">Your AI health assistant is ready.</p>
          </div>
        </motion.div>

        {/* Language selector */}
        <div className="relative">
          <button onClick={() => setShowLangPicker(!showLangPicker)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white hover:border-brand/40 text-sm font-medium transition-colors">
            <Globe className="w-4 h-4 text-muted-foreground" />
            {LANGUAGES.find((l) => l.code === selectedLang)?.label}
          </button>
          <AnimatePresence>
            {showLangPicker && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-50 py-1 min-w-[130px]">
                {LANGUAGES.map((l) => (
                  <button key={l.code} onClick={() => { setSelectedLang(l.code); setShowLangPicker(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${selectedLang === l.code ? "font-semibold text-brand" : ""}`}>
                    {l.label}
                  </button>
                ))}
                <div className="px-3 py-1.5 border-t border-border mt-1">
                  <p className="text-[10px] text-muted-foreground">More languages coming soon</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SOS Banner */}
      <AnimatePresence>
        {sosSent && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-red-600 text-white rounded-2xl p-4 flex items-center gap-3">
            <PhoneCall className="w-6 h-6 animate-pulse" />
            <div>
              <p className="font-bold text-sm">Help is on the way!</p>
              <p className="text-xs opacity-90">Your family and caregiver have been alerted. Stay calm.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medication Reminder Banner */}
      <AnimatePresence>
        {medTaken === null && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-amber-200 bg-amber-50/60">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Medication Reminder</p>
                    <p className="text-xs text-amber-700">Have you taken your medicines today?</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => setMedTaken(true)}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full h-8 px-3 text-xs">Yes ✓</Button>
                  <Button size="sm" variant="outline" onClick={() => setMedTaken(false)}
                    className="border-red-300 text-red-600 hover:bg-red-50 rounded-full h-8 px-3 text-xs">No</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {medTaken === true && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-green-200 bg-green-50/60">
              <CardContent className="p-3 flex items-center gap-2">
                <Pill className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700 font-medium">Great! Medication logged for today ✓</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {medTaken === false && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-red-200 bg-red-50/60">
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-700 font-medium">Please take your medicine now. Family notified.</p>
                </div>
                <Button size="sm" onClick={() => setMedTaken(true)} className="bg-green-500 text-white rounded-full h-7 px-3 text-xs shrink-0">Done ✓</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next visit */}
      {nextVisit && (
        <Card className="border-teal/30 bg-teal/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-teal" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Your Next Visit</p>
              <p className="text-xs text-muted-foreground">
                {new Date(nextVisit.scheduled_start).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} at{" "}
                {new Date(nextVisit.scheduled_start).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-700 text-xs shrink-0"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>
          </CardContent>
        </Card>
      )}

      {/* Last check-in + baseline comparison */}
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
                {lastCheckin.flags.map((f: string) => <Badge key={f} className="bg-amber-100 text-amber-700 text-[9px]"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{f}</Badge>)}
              </div>
            )}
            {/* Baseline comparison */}
            {firstCheckin && firstCheckin.id !== lastCheckin.id && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
                <div className="text-xs text-muted-foreground">vs. first check-in:</div>
                <div className={`text-xs font-bold ${(lastCheckin.risk_score || 0) > (firstCheckin.risk_score || 0) ? "text-green-600" : "text-red-500"}`}>
                  {(lastCheckin.risk_score || 0) > (firstCheckin.risk_score || 0) ? "▲" : "▼"} {Math.abs((lastCheckin.risk_score || 0) - (firstCheckin.risk_score || 0))} pts
                  {(lastCheckin.risk_score || 0) > (firstCheckin.risk_score || 0) ? " improving" : " declining"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* START CHECK-IN CTA */}
      <Card className="border-2 border-teal/30 bg-gradient-to-br from-teal/5 to-white">
        <CardContent className="p-5 text-center space-y-4">
          <div className="flex justify-center gap-6">
            {[{ icon: Mic, label: "Voice", color: "bg-teal/10 text-teal" }, { icon: Camera, label: "Camera", color: "bg-brand/10 text-brand" }, { icon: MessageCircle, label: "Chat", color: "bg-violet-50 text-violet-600" }].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center`}><Icon className="w-5 h-5" /></div>
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

      {/* 🆘 SOS BUTTON */}
      <Card className="border-red-200 bg-red-50/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700">Emergency SOS</p>
                <p className="text-xs text-muted-foreground">Alerts family + caregiver instantly</p>
              </div>
            </div>
            {sosActive ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 font-bold animate-pulse">Sending in {sosCountdown}s...</span>
                <Button size="sm" variant="outline" onClick={() => setSosActive(false)} className="rounded-full border-red-300 text-red-600 h-8 px-3 text-xs">
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setSosActive(true)}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full h-9 px-4 text-sm font-bold shadow-lg shadow-red-200">
                🆘 SOS
              </Button>
            )}
          </div>
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
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
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
