"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send, Mic, MicOff, HeartPulse, Loader2, CheckCircle2,
  AlertTriangle, Activity, Camera, Volume2, VolumeX, Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useVoiceEngine } from "@/components/patient/VoiceEngine";
import { CameraCapture } from "@/components/patient/CameraCapture";
import Link from "next/link";

type Message = { id: string; role: "ai" | "user"; content: string; imageUrl?: string; timestamp: Date };
type RiskResult = { score: number; level: string; domains: Record<string, { score: number; trend: string }>; summary: string; flags: string[] };

export default function CheckinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || "";
  const patientName = searchParams.get("patientName") ? decodeURIComponent(searchParams.get("patientName")!) : "";
  const isOnboarding = searchParams.get("mode") === "onboarding";
  const onboardName = searchParams.get("name") ? decodeURIComponent(searchParams.get("name")!) : "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [assessedCount, setAssessedCount] = useState(0);
  const [voiceActive, setVoiceActive] = useState(true);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // Start AI greeting on mount
  useEffect(() => {
    callAI("");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Voice auto-submits after the user stops speaking for ~1.5s.
  // The VoiceEngine's silence detector ensures this only fires with a
  // complete sentence, not per-word. We also guard against submitting
  // while the AI is still typing its previous response.
  const isTypingRef = useRef(false);
  useEffect(() => { isTypingRef.current = isTyping; }, [isTyping]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    const clean = text.trim();
    if (!isFinal || !clean) return;
    if (isTypingRef.current) {
      // AI is still generating — just fill input, don't clobber conversation
      setInput(clean);
      return;
    }
    // Auto-send the completed utterance
    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: clean, timestamp: new Date() }]);
    callAI(clean);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { isSpeaking, interimTranscript, speak, stopSpeaking, isSupported } = useVoiceEngine({
    onTranscript: handleTranscript,
    isListening: voiceActive && !isComplete,
    speakEnabled,
  });

  function getHistory() {
    return messages.map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.imageUrl ? `${m.content}\n[IMAGE: Patient shared a photo]` : m.content,
    }));
  }

  async function callAI(userMessage: string) {
    setIsTyping(true);
    try {
      const context = isOnboarding
        ? `New patient onboarding for ${onboardName || "a new patient"}. They are describing their health issues for the first time. Ask about their main health concerns, daily challenges, what kind of help they need, and how they're feeling. Be warm and welcoming. This is their FIRST interaction with the platform.`
        : `Follow-up health check-in for ${patientName || "patient"}. Assess their current health across 7 domains.`;

      const res = await fetch("/api/ai/health-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: userMessage, conversationHistory: getHistory(), patientContext: context }),
      });
      const data = await res.json();
      const aiText = data.message || data.content || "Could you tell me more?";

      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "ai", content: aiText, timestamp: new Date() }]);
      if (speakEnabled) speak(aiText);
      if (data.assessedDomains) setAssessedCount(data.assessedDomains.length);
      else setAssessedCount((prev) => Math.min(prev + 1, 7));

      if (data.isComplete) {
        if (isOnboarding) await completeOnboarding();
        else await performRiskScoring();
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "ai", content: "Sorry, could you try again?", timestamp: new Date() }]);
    } finally { setIsTyping(false); }
  }

  async function completeOnboarding() {
    setIsTyping(true);
    try {
      const res = await fetch("/api/patients/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversation: getHistory(),
          patientName: onboardName || searchParams.get("name"),
          dateOfBirth: searchParams.get("dob") || "1950-01-01",
          address: searchParams.get("address") ? decodeURIComponent(searchParams.get("address")!) : "Delhi, India",
          phone: searchParams.get("phone"),
          emergencyContactName: searchParams.get("emergName") ? decodeURIComponent(searchParams.get("emergName")!) : null,
          emergencyContactPhone: searchParams.get("emergPhone"),
        }),
      });
      const data = await res.json();

      if (data.patient) {
        setNewPatientId(data.patient.id);
        const msg = `Thank you, ${onboardName || "there"}! I've created your health profile. Your risk level is ${data.profile?.risk_level || "moderate"}. Let me assign you a caregiver now...`;
        setMessages((prev) => [...prev, { id: `ai-ob-${Date.now()}`, role: "ai", content: msg, timestamp: new Date() }]);
        if (speakEnabled) speak(msg);

        // Auto-assign
        const assignRes = await fetch("/api/patients/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId: data.patient.id }),
        });
        const assignData = await assignRes.json();
        const assignMsg = `You've been assigned to ${assignData.assignment?.caregiverName || "a caregiver"}. Your first visit is scheduled. You can use this health assistant anytime!`;
        setMessages((prev) => [...prev, { id: `ai-as-${Date.now()}`, role: "ai", content: assignMsg, timestamp: new Date() }]);
        if (speakEnabled) speak(assignMsg);
      }
    } catch (e) { console.error(e); }
    setIsComplete(true);
    setAssessedCount(7);
    setVoiceActive(false);
    setIsTyping(false);
  }

  async function performRiskScoring() {
    try {
      const res = await fetch("/api/ai/risk-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversation: getHistory() }),
      });
      const data = await res.json();
      if (!data.error) {
        const result: RiskResult = { score: data.risk_score || 65, level: data.risk_level || "moderate", domains: data.domains || {}, summary: data.summary || "Assessment complete.", flags: data.flags || [] };
        setRiskResult(result);
        // Save
        try {
          const supabase = createClient();
          const pid = patientId || newPatientId;
          if (pid) {
            await supabase.from("health_checkins").insert({ patient_id: pid, conversation: getHistory(), risk_score: result.score, risk_level: result.level, confidence: data.confidence || 0.8, domains: result.domains, ai_summary: result.summary, flags: result.flags, completed: true, completed_at: new Date().toISOString() });
            await supabase.from("patients").update({ risk_score: result.score, risk_level: result.level }).eq("id", pid);
          }
        } catch (e) { console.error("DB:", e); }
      }
    } catch { setRiskResult({ score: 65, level: "moderate", domains: {}, summary: "Assessment complete.", flags: [] }); }
    setIsComplete(true);
    setAssessedCount(7);
    setVoiceActive(false);
    const msg = "Your check-in is complete! Results shared with your care team.";
    setMessages((prev) => [...prev, { id: `done-${Date.now()}`, role: "ai", content: msg, timestamp: new Date() }]);
    if (speakEnabled) speak(msg);
  }

  function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || isTyping) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: msg, timestamp: new Date() }]);
    setInput("");
    callAI(msg);
  }

  async function handleImageCapture(base64: string) {
    setCameraOpen(false);
    setAnalyzingImage(true);
    setMessages((prev) => [...prev, { id: `img-${Date.now()}`, role: "user", content: "Let me show you this.", imageUrl: base64, timestamp: new Date() }]);
    try {
      const res = await fetch("/api/ai/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageBase64: base64, conversationContext: messages.slice(-3).map((m) => m.content).join(" ") }),
      });
      const data = await res.json();
      const aiText = `${data.observation || ""} ${data.healthRelevance || ""} ${data.followUpQuestion || ""}`.trim() || "Thank you for showing me. Can you describe what you're experiencing?";
      setMessages((prev) => [...prev, { id: `vis-${Date.now()}`, role: "ai", content: aiText, timestamp: new Date() }]);
      if (speakEnabled) speak(aiText);
    } catch {
      const fb = "Thank you for showing me. Can you tell me more?";
      setMessages((prev) => [...prev, { id: `vis-e-${Date.now()}`, role: "ai", content: fb, timestamp: new Date() }]);
    }
    setAnalyzingImage(false);
  }

  const riskColors: Record<string, string> = { low: "bg-green-100 text-green-700 border-green-200", moderate: "bg-amber-100 text-amber-700 border-amber-200", high: "bg-red-100 text-red-700 border-red-200", emergency: "bg-red-600 text-white border-red-700" };
  const progress = Math.round((assessedCount / 7) * 100);

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{isOnboarding ? "Health Assessment" : isComplete ? "Complete" : `Check-in — ${assessedCount}/7 domains`}</span>
          <div className="flex items-center gap-2">
            {isSpeaking ? (
              <span className="flex items-center gap-1 text-brand"><Volume2 className="w-3 h-3" />AI speaking · mic paused</span>
            ) : voiceActive ? (
              <span className="flex items-center gap-1 text-teal"><span className="w-1.5 h-1.5 bg-teal rounded-full animate-pulse" />Listening</span>
            ) : null}
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-teal to-teal-dark rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Camera */}
      <AnimatePresence>
        {cameraOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3">
            <CameraCapture isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleImageCapture} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-brand text-white rounded-br-md" : "bg-white border border-border rounded-bl-md shadow-sm"}`}>
                {msg.role === "ai" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-teal" />
                    <span className="text-xs font-semibold text-teal">HealioX AI</span>
                  </div>
                )}
                {msg.imageUrl && <div className="mb-2 rounded-xl overflow-hidden"><img src={msg.imageUrl} alt="Captured" className="w-full h-32 object-cover" /></div>}
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {(isTyping || analyzingImage) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-white border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1"><HeartPulse className="w-3.5 h-3.5 text-teal" /><span className="text-xs font-semibold text-teal">{analyzingImage ? "Analyzing..." : "Thinking..."}</span></div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-teal/40 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-teal/40 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="w-2 h-2 bg-teal/40 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          </motion.div>
        )}

        {interimTranscript && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} className="flex justify-end">
            <div className="max-w-[80%] px-4 py-2 rounded-2xl text-sm bg-brand/20 text-brand italic rounded-br-md">{interimTranscript}...</div>
          </motion.div>
        )}
      </div>

      {/* Risk result */}
      {isComplete && riskResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="my-3">
          <Card className={`border-2 ${riskColors[riskResult.level]}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-[var(--font-heading)] font-bold flex items-center gap-2"><Activity className="w-5 h-5" />Risk Assessment</span>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-[var(--font-heading)] font-black">{riskResult.score}</span>
                  <Badge className={riskColors[riskResult.level]}>{riskResult.level.toUpperCase()}</Badge>
                </div>
              </div>
              {Object.keys(riskResult.domains).length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {Object.entries(riskResult.domains).map(([d, v]) => (
                    <div key={d} className="flex items-center justify-between bg-white/60 rounded-lg px-2 py-1">
                      <span className="text-xs capitalize">{d}</span>
                      <span className="text-xs font-bold">{v.score}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs opacity-80">{riskResult.summary}</p>
            </CardContent>
          </Card>

          {/* Back to home */}
          <div className="mt-3 text-center">
            <Link href="/patient">
              <Button variant="outline" className="rounded-full"><Home className="w-4 h-4 mr-2" />Back to Home</Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Input */}
      {!isComplete && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2">
            <Button variant={voiceActive ? "default" : "outline"} size="sm" onClick={() => setVoiceActive(!voiceActive)}
              className={`rounded-full text-xs ${voiceActive ? (isSpeaking ? "bg-muted text-muted-foreground" : "bg-teal hover:bg-teal-dark text-white") : ""}`}>
              {voiceActive ? <Mic className="w-3.5 h-3.5 mr-1" /> : <MicOff className="w-3.5 h-3.5 mr-1" />}
              {voiceActive ? (isSpeaking ? "Mic paused" : "Listening...") : "Voice"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCameraOpen(!cameraOpen)} className={`rounded-full text-xs ${cameraOpen ? "border-brand text-brand" : ""}`}>
              <Camera className="w-3.5 h-3.5 mr-1" />Camera
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSpeakEnabled(!speakEnabled); if (isSpeaking) stopSpeaking(); }} className="rounded-full text-xs ml-auto">
              {speakEnabled ? <Volume2 className="w-3.5 h-3.5 mr-1" /> : <VolumeX className="w-3.5 h-3.5 mr-1" />}
              {speakEnabled ? "Sound On" : "Mute"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={voiceActive ? "Listening... or type here" : "Type your message..."}
              className="flex-1 h-11 px-4 rounded-full border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal/50" disabled={isTyping} />
            <Button onClick={() => sendMessage()} disabled={!input.trim() || isTyping} size="icon" className="shrink-0 rounded-full bg-teal hover:bg-teal-dark text-white h-11 w-11">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
