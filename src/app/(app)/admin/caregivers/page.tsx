"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserPlus, Loader2, Search, Mail, Phone, Clock,
  CheckCircle2, XCircle, Copy, Check, UserCog, AlertCircle,
  Trash2, Power, PowerOff, X, Upload, Sparkles,
  ArrowRight, ArrowLeft, BadgeCheck, ScanLine,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isValidEmail, isValidPhone, isValidName, normalizePhone, isValidAadhaar } from "@/lib/validation";

type Caregiver = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  verification_status?: "unverified" | "pending" | "verified" | "rejected";
  qualification?: string | null;
  created_at: string;
  updated_at: string;
  stats_today: { assigned: number; completed: number; late: number; avgMin: number };
};

export default function CaregiversPage() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createdCred, setCreatedCred] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/caregivers", { credentials: "include" });
    if (res.ok) {
      const { caregivers } = await res.json();
      setCaregivers(caregivers || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleActive(cg: Caregiver) {
    await fetch(`/api/admin/caregivers/${cg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: !cg.is_active }),
    });
    load();
  }

  async function handleDeactivate(cg: Caregiver) {
    if (!confirm(`Deactivate ${cg.full_name}? They won't be able to log in. Visit history is preserved.`)) return;
    await fetch(`/api/admin/caregivers/${cg.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    load();
  }

  const filtered = caregivers.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const active = caregivers.filter((c) => c.is_active).length;
  const inactive = caregivers.length - active;
  const lateToday = caregivers.reduce((s, c) => s + c.stats_today.late, 0);
  const completedToday = caregivers.reduce((s, c) => s + c.stats_today.completed, 0);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-black">Caregivers</h2>
          <p className="text-sm text-muted-foreground">Create, manage, and monitor your care team</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-brand hover:bg-brand-dark text-white rounded-full">
          <UserPlus className="w-4 h-4 mr-2" />Add Caregiver
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Caregivers", value: caregivers.length, icon: UserCog, color: "text-brand", bg: "bg-brand/10" },
          { label: "Active", value: active, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Deactivated", value: inactive, icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
          { label: "Late Today", value: lateToday, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
              <div className="font-[var(--font-heading)] text-xl font-black">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <UserCog className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{search ? "No matches" : "No caregivers yet. Add your first one."}</p>
            {!search && (
              <Button onClick={() => setShowCreate(true)} className="mt-4 bg-brand text-white rounded-full">
                <UserPlus className="w-4 h-4 mr-2" />Add Caregiver
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((cg, i) => (
            <motion.div key={cg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={`hover:shadow-md transition-all ${!cg.is_active ? "opacity-60" : ""} ${cg.stats_today.late > 0 ? "border-amber-200" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-full bg-brand/10 flex items-center justify-center text-sm font-bold text-brand shrink-0">
                        {cg.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate">{cg.full_name}</p>
                          {cg.verification_status === "verified" && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[9px] border border-emerald-200">
                              <BadgeCheck className="w-2.5 h-2.5 mr-0.5" />ID Verified
                            </Badge>
                          )}
                          {cg.verification_status === "pending" && (
                            <Badge className="bg-amber-100 text-amber-700 text-[9px]">Pending review</Badge>
                          )}
                          {!cg.is_active && <Badge className="bg-gray-100 text-gray-500 text-[9px]">Deactivated</Badge>}
                          {cg.stats_today.late > 0 && <Badge className="bg-amber-100 text-amber-700 text-[9px]"><Clock className="w-2.5 h-2.5 mr-0.5" />{cg.stats_today.late} late</Badge>}
                        </div>
                        {cg.qualification && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{cg.qualification}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{cg.email}</span>
                          {cg.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cg.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => handleToggleActive(cg)} title={cg.is_active ? "Pause access" : "Restore access"} className="h-8 w-8 p-0">
                        {cg.is_active ? <Power className="w-4 h-4 text-green-600" /> : <PowerOff className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeactivate(cg)} title="Deactivate" className="h-8 w-8 p-0 hover:bg-red-50">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Today's stats */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[
                      { label: "Assigned", value: cg.stats_today.assigned },
                      { label: "Completed", value: cg.stats_today.completed },
                      { label: "Late", value: cg.stats_today.late, warn: cg.stats_today.late > 0 },
                      { label: "Avg mins", value: cg.stats_today.avgMin || "—" },
                    ].map((stat) => (
                      <div key={stat.label} className={`text-center rounded-lg p-2 ${stat.warn ? "bg-amber-50 border border-amber-200" : "bg-muted/30"}`}>
                        <div className={`font-[var(--font-heading)] font-black text-base ${stat.warn ? "text-amber-600" : ""}`}>{stat.value}</div>
                        <div className="text-[9px] text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Completion rate */}
                  {cg.stats_today.assigned > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Today's completion</span>
                        <span>{Math.round((cg.stats_today.completed / cg.stats_today.assigned) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${(cg.stats_today.completed / cg.stats_today.assigned) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateCaregiverModal
            onClose={() => setShowCreate(false)}
            onCreated={(cred) => { setCreatedCred(cred); setShowCreate(false); load(); }}
          />
        )}
        {createdCred && (
          <CredentialsModal credentials={createdCred} onClose={() => setCreatedCred(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Add-Caregiver Wizard ─────────────────────────────────────────────────────
type WizardForm = {
  full_name: string;
  email_username: string;
  email_domain: string;
  phone: string;
  password: string;
  aadhaar_number: string;
  date_of_birth: string;
  gender: string;
  address: string;
  qualification: string;
  institution: string;
  year_of_passing: string;
};

const EMAIL_DOMAINS = [
  "@gmail.com",
  "@yahoo.com",
  "@yahoo.co.in",
  "@outlook.com",
  "@hotmail.com",
  "@icloud.com",
  "@proton.me",
  "@aayucare.in",
  "@aayucare.demo",
];

const EMPTY_FORM: WizardForm = {
  full_name: "", email_username: "", email_domain: "@gmail.com",
  phone: "", password: "",
  aadhaar_number: "", date_of_birth: "", gender: "", address: "",
  qualification: "", institution: "", year_of_passing: "",
};

const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;

// Token-set name comparison — returns match flag, score (0-1), and a reason.
function compareNames(a: string, b: string) {
  const norm = (s: string) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-zऀ-ॿ\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2);

  const tA = new Set(norm(a));
  const tB = new Set(norm(b));
  if (tA.size === 0 || tB.size === 0) {
    return { match: false, score: 0, reason: "Could not read one of the names." };
  }
  const intersection = [...tA].filter((t) => tB.has(t));
  const score = intersection.length / Math.max(tA.size, tB.size);

  // Strong match: 2+ tokens overlap (typical first-name + surname)
  if (intersection.length >= 2) {
    return { match: true, score, reason: "" };
  }
  // Weak match: single token, but one of the names is itself just one token
  if (intersection.length === 1 && (tA.size === 1 || tB.size === 1)) {
    return { match: true, score, reason: "" };
  }
  return {
    match: false,
    score,
    reason: `Aadhaar name "${a}" does not match degree name "${b}".`,
  };
}

function CreateCaregiverModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (cred: { email: string; password: string }) => void;
}) {
  const [step, setStep] = useState(1); // 1 = Aadhaar, 2 = Degree, 3 = Confirm
  const [form, setForm] = useState<WizardForm>(() => ({ ...EMPTY_FORM, password: generatePassword() }));
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);
  const [degreePreview, setDegreePreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aadhaarConfidence, setAadhaarConfidence] = useState<number | null>(null);
  const [degreeConfidence, setDegreeConfidence] = useState<number | null>(null);

  // Names extracted from each document — used for cross-document matching.
  const [aadhaarName, setAadhaarName] = useState("");
  const [degreeName, setDegreeName] = useState("");

  // Composed full email
  const composedEmail = `${form.email_username}${form.email_domain}`.toLowerCase();

  // ── Inline validation derived from form state ──────────────────────────
  const usernameErr = form.email_username && !USERNAME_RE.test(form.email_username)
    ? "Only letters, digits, dot, dash, underscore — no @ or spaces"
    : "";
  const emailErr = (!usernameErr && form.email_username && !isValidEmail(composedEmail))
    ? "Resulting email is invalid"
    : "";
  const phoneErr = form.phone && !isValidPhone(normalizePhone(form.phone)) ? "Use +<country><number> e.g. +919810000000" : "";
  const nameErr = form.full_name && !isValidName(form.full_name) ? "Use letters only (2-80 chars)" : "";
  const aadhaarErr = form.aadhaar_number && !isValidAadhaar(form.aadhaar_number) ? "Aadhaar must be 12 digits" : "";

  // ── Name match status — only meaningful once both docs are uploaded ────
  const nameMatch = (aadhaarName && degreeName)
    ? compareNames(aadhaarName, degreeName)
    : null;
  const nameMismatchBlocking = nameMatch !== null && !nameMatch.match;

  function update<K extends keyof WizardForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleUpload(docType: "aadhaar" | "degree", file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Max 5 MB.");
      return;
    }
    setError("");
    setExtracting(true);
    try {
      const base64 = await fileToBase64(file);
      if (docType === "aadhaar") setAadhaarPreview(base64);
      else setDegreePreview(base64);

      const res = await fetch("/api/admin/caregivers/extract-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ docType, imageBase64: base64 }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "AI extraction failed");
        setExtracting(false);
        return;
      }
      const ex = body.extracted as Record<string, unknown>;

      if (docType === "aadhaar") {
        const extractedName = typeof ex.fullName === "string" ? ex.fullName : "";
        setAadhaarName(extractedName);
        setForm((f) => ({
          ...f,
          full_name: extractedName || f.full_name,
          aadhaar_number: typeof ex.aadhaarNumber === "string" ? ex.aadhaarNumber : f.aadhaar_number,
          date_of_birth: typeof ex.dateOfBirth === "string" ? ex.dateOfBirth : f.date_of_birth,
          gender: typeof ex.gender === "string" ? ex.gender : f.gender,
          address: typeof ex.address === "string" ? ex.address : f.address,
        }));
        setAadhaarConfidence(typeof ex.confidence === "number" ? ex.confidence : null);
      } else {
        const extractedName = typeof ex.holderName === "string" ? ex.holderName : "";
        setDegreeName(extractedName);
        setForm((f) => ({
          ...f,
          // Aadhaar name takes priority — never overwrite with degree name here.
          // The mismatch (if any) is surfaced via the warning banner.
          qualification: typeof ex.qualification === "string" ? ex.qualification : f.qualification,
          institution: typeof ex.institution === "string" ? ex.institution : f.institution,
          year_of_passing: typeof ex.yearOfPassing === "number" ? String(ex.yearOfPassing) : f.year_of_passing,
        }));
        setDegreeConfidence(typeof ex.confidence === "number" ? ex.confidence : null);

        // Cross-document name match — block creation if names diverge.
        if (aadhaarName && extractedName) {
          const cmp = compareNames(aadhaarName, extractedName);
          if (!cmp.match) {
            setError(
              `Document mismatch — Aadhaar holder is "${aadhaarName}" but degree holder is "${extractedName}". ` +
              `Re-upload the correct degree certificate, or skip the degree to create an unverified caregiver.`
            );
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setExtracting(false);
    }
  }

  async function handleFinalSubmit() {
    setError("");
    // Compose the full email from username + domain
    const fullEmail = `${form.email_username}${form.email_domain}`.toLowerCase();

    // Final guard before hitting the server
    if (!form.email_username) return setError("Email username is required");
    if (!USERNAME_RE.test(form.email_username)) return setError("Email username has invalid characters");
    if (!isValidEmail(fullEmail)) return setError("Resulting email is invalid");
    if (!isValidName(form.full_name)) return setError("Please enter a valid full name");
    if (form.phone && !isValidPhone(normalizePhone(form.phone))) {
      return setError("Please enter a valid phone with country code");
    }
    // Hard-block on cross-document name mismatch — do not let a verified
    // account get created when the IDs disagree on who this person is.
    if (nameMismatchBlocking) {
      return setError(
        `Document mismatch — ${nameMatch?.reason || "Aadhaar and degree names do not match."} ` +
        `Re-upload the correct degree, or remove the degree to create an unverified caregiver.`
      );
    }

    setSubmitting(true);
    const payload = {
      email: fullEmail,
      password: form.password,
      full_name: form.full_name.trim(),
      phone: form.phone ? normalizePhone(form.phone) : undefined,
      aadhaar_number: form.aadhaar_number ? form.aadhaar_number.replace(/\D/g, "") : undefined,
      date_of_birth: form.date_of_birth || undefined,
      gender: form.gender || undefined,
      address: form.address || undefined,
      qualification: form.qualification || undefined,
      institution: form.institution || undefined,
      year_of_passing: form.year_of_passing ? Number(form.year_of_passing) : undefined,
      verification_data: {
        aadhaar_confidence: aadhaarConfidence,
        degree_confidence: degreeConfidence,
        verified_at: new Date().toISOString(),
      },
      is_verified: !!aadhaarPreview, // Aadhaar required for verified status
    };

    const res = await fetch("/api/admin/caregivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "Failed to create"); return; }
    onCreated({ email: payload.email, password: payload.password });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-xl my-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        {/* Header + step indicator */}
        <div className="p-5 border-b">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-[var(--font-heading)] font-bold text-lg">Onboard Verified Caregiver</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Upload ID → Upload Degree → Confirm Details</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0"><X className="w-4 h-4" /></Button>
          </div>
          {/* Stepper */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === n ? "bg-brand text-white" : step > n ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {step > n ? <Check className="w-3.5 h-3.5" /> : n}
                </div>
                <div className="text-xs">
                  {n === 1 && "Aadhaar"}
                  {n === 2 && "Degree"}
                  {n === 3 && "Confirm"}
                </div>
                {n < 3 && <div className={`flex-1 h-0.5 ${step > n ? "bg-emerald-500" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* ── STEP 1: Aadhaar upload ─────────────────────────────── */}
          {step === 1 && (
            <UploadStep
              title="Upload Aadhaar Card"
              hint="Front side preferred. AI will read name, DOB, gender, address, and 12-digit Aadhaar."
              preview={aadhaarPreview}
              extracting={extracting}
              onFile={(f) => handleUpload("aadhaar", f)}
              extractedSummary={
                aadhaarPreview && form.aadhaar_number ? (
                  <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                    <Info label="Name" value={form.full_name} />
                    <Info label="Aadhaar" value={form.aadhaar_number ? `XXXX XXXX ${form.aadhaar_number.slice(-4)}` : "—"} />
                    <Info label="DOB" value={form.date_of_birth} />
                    <Info label="Gender" value={form.gender} />
                    <Info label="Confidence" value={aadhaarConfidence ? `${Math.round(aadhaarConfidence * 100)}%` : "—"} />
                  </div>
                ) : null
              }
            />
          )}

          {/* ── STEP 2: Degree upload ──────────────────────────────── */}
          {step === 2 && (
            <>
              <UploadStep
                title="Upload Degree / Qualification Certificate"
                hint="Upload degree, GNM/ANM/BSc Nursing certificate, or any caregiver training credential. Name must match Aadhaar."
                preview={degreePreview}
                extracting={extracting}
                optional
                onFile={(f) => handleUpload("degree", f)}
                extractedSummary={
                  degreePreview && form.qualification ? (
                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      <Info label="Holder" value={degreeName} />
                      <Info label="Qualification" value={form.qualification} />
                      <Info label="Institution" value={form.institution} />
                      <Info label="Year" value={form.year_of_passing} />
                      <Info label="Confidence" value={degreeConfidence ? `${Math.round(degreeConfidence * 100)}%` : "—"} />
                      <Info label="Aadhaar holder" value={aadhaarName} />
                    </div>
                  ) : null
                }
              />

              {nameMismatchBlocking && (
                <Button variant="outline" size="sm" onClick={() => {
                  setDegreePreview(null);
                  setDegreeName("");
                  setDegreeConfidence(null);
                  setForm((f) => ({ ...f, qualification: "", institution: "", year_of_passing: "" }));
                  setError("");
                }} className="w-full">
                  <X className="w-3.5 h-3.5 mr-1.5" />Remove degree (continue as unverified)
                </Button>
              )}

              {nameMatch && (
                nameMatch.match ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-emerald-800">
                        Names match · {Math.round(nameMatch.score * 100)}% similarity
                      </p>
                      <p className="text-emerald-700/80">Aadhaar and degree refer to the same person.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-red-800">
                        ⛔ Verification rejected · names do not match
                      </p>
                      <p className="text-red-700/90 mt-0.5">
                        Aadhaar: <strong className="font-mono">{aadhaarName}</strong>
                        {" "}vs Degree: <strong className="font-mono">{degreeName}</strong>
                        {" "}({Math.round(nameMatch.score * 100)}% similarity).
                      </p>
                      <p className="text-red-700/80 mt-1">
                        Re-upload the correct degree certificate, or remove the degree to create
                        an unverified caregiver instead.
                      </p>
                    </div>
                  </div>
                )
              )}
            </>
          )}

          {/* ── STEP 3: Confirm + login credentials ────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              {nameMismatchBlocking ? (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-red-800">⛔ Document mismatch — verification rejected</p>
                    <p className="text-red-700/90 mt-0.5">
                      Aadhaar holder <strong className="font-mono">&ldquo;{aadhaarName}&rdquo;</strong> does not
                      match degree holder <strong className="font-mono">&ldquo;{degreeName}&rdquo;</strong>
                      {nameMatch ? ` (similarity ${Math.round(nameMatch.score * 100)}%)` : ""}.
                      Re-upload the correct degree, or go back and skip the degree step.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-emerald-800">
                      AI extraction complete
                      {nameMatch?.match && degreeName ? " · names match" : ""}
                    </p>
                    <p className="text-emerald-700/80">Review and edit any field before creating the verified account.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label="Full Name *"
                  value={form.full_name}
                  onChange={(v) => update("full_name", v)}
                  error={nameErr}
                  placeholder="Ravi Sharma"
                />
                <FieldInput
                  label="Phone (with country code)"
                  value={form.phone}
                  type="tel"
                  inputMode="tel"
                  pattern="[+0-9 ]*"
                  onChange={(v) => update("phone", v.replace(/[^\d+ ]/g, ""))}
                  onBlur={() => form.phone && update("phone", normalizePhone(form.phone))}
                  error={phoneErr}
                  placeholder="+919810000000"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Email * (login)</label>
                <div className="flex gap-2">
                  <Input
                    value={form.email_username}
                    onChange={(e) => {
                      // Strip @ and any whitespace; lowercase
                      const cleaned = e.target.value.replace(/[@\s]/g, "").toLowerCase();
                      update("email_username", cleaned);
                    }}
                    onPaste={(e) => {
                      // If user pastes a full email, split it
                      const txt = e.clipboardData.getData("text").trim();
                      if (txt.includes("@")) {
                        e.preventDefault();
                        const [user, domain] = txt.split("@");
                        update("email_username", user.replace(/[@\s]/g, "").toLowerCase());
                        if (domain && EMAIL_DOMAINS.includes("@" + domain.toLowerCase())) {
                          update("email_domain", "@" + domain.toLowerCase());
                        }
                      }
                    }}
                    placeholder="hype4shreshth"
                    autoComplete="off"
                    inputMode="email"
                    className={`flex-1 ${usernameErr || emailErr ? "border-red-300 focus-visible:ring-red-200" : ""}`}
                  />
                  <select
                    value={form.email_domain}
                    onChange={(e) => update("email_domain", e.target.value)}
                    className="h-10 px-3 rounded-md border border-input bg-background text-sm shrink-0 min-w-[150px]"
                  >
                    {EMAIL_DOMAINS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                {form.email_username && !usernameErr && !emailErr && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Login email: <span className="font-mono">{composedEmail}</span>
                  </p>
                )}
                {(usernameErr || emailErr) && (
                  <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{usernameErr || emailErr}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FieldInput
                  label="Aadhaar (12 digits)"
                  value={form.aadhaar_number}
                  inputMode="numeric"
                  maxLength={12}
                  onChange={(v) => update("aadhaar_number", v.replace(/\D/g, "").slice(0, 12))}
                  error={aadhaarErr}
                  placeholder="123412341234"
                />
                <FieldInput
                  label="Date of Birth"
                  value={form.date_of_birth}
                  type="date"
                  onChange={(v) => update("date_of_birth", v)}
                />
                <div>
                  <label className="text-xs font-medium mb-1 block">Gender</label>
                  <select value={form.gender} onChange={(e) => update("gender", e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="">—</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <FieldInput
                label="Address (from Aadhaar)"
                value={form.address}
                onChange={(v) => update("address", v)}
                placeholder="Street, area, city, PIN"
              />

              <div className="grid grid-cols-3 gap-3">
                <FieldInput
                  label="Qualification"
                  value={form.qualification}
                  onChange={(v) => update("qualification", v)}
                  placeholder="GNM / BSc Nursing"
                />
                <FieldInput
                  label="Institution"
                  value={form.institution}
                  onChange={(v) => update("institution", v)}
                  placeholder="Govt. School of Nursing"
                />
                <FieldInput
                  label="Year of Passing"
                  value={form.year_of_passing}
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(v) => update("year_of_passing", v.replace(/\D/g, "").slice(0, 4))}
                  placeholder="2019"
                />
              </div>

              <div className="border-t pt-4">
                <label className="text-xs font-medium mb-1 block">Temporary Password *</label>
                <div className="flex gap-2">
                  <Input value={form.password} onChange={(e) => update("password", e.target.value)}
                    required minLength={8} className="font-mono text-sm" />
                  <Button type="button" variant="outline" onClick={() => update("password", generatePassword())} size="sm">Regen</Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Min 8 chars with letters and a digit. They can change this on first login.</p>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />{error}
            </p>
          )}
        </div>

        {/* Footer nav */}
        <div className="p-4 border-t flex items-center justify-between gap-2 sticky bottom-0 bg-white">
          <Button variant="outline" disabled={step === 1}
            onClick={() => { setError(""); setStep(step - 1); }}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => { setError(""); setStep(step + 1); }}
              disabled={
                extracting ||
                (step === 1 && !aadhaarPreview) ||
                (step === 2 && nameMismatchBlocking)
              }
              className="bg-brand hover:bg-brand-dark text-white">
              {extracting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {step === 1 ? "Next: Degree" : "Next: Confirm"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button onClick={handleFinalSubmit}
              disabled={
                submitting || !!emailErr || !!usernameErr || !!phoneErr || !!nameErr || !!aadhaarErr ||
                !form.email_username || !form.full_name || nameMismatchBlocking
              }
              className={nameMismatchBlocking
                ? "bg-red-600 hover:bg-red-700 text-white opacity-60 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BadgeCheck className="w-4 h-4 mr-2" />}
              {nameMismatchBlocking ? "Rejected — Names Mismatch" : "Create Verified Caregiver"}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Reusable upload step ────────────────────────────────────────────────────
function UploadStep({ title, hint, preview, extracting, onFile, extractedSummary, optional }: {
  title: string;
  hint: string;
  preview: string | null;
  extracting: boolean;
  onFile: (f: File) => void;
  extractedSummary?: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-sm">{title}</p>
        {optional && <Badge className="bg-muted text-muted-foreground text-[9px]">Optional</Badge>}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{hint}</p>

      <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
        preview ? "border-emerald-300 bg-emerald-50/30" : "border-muted-foreground/30 hover:border-brand/40 hover:bg-muted/20"
      }`}>
        <input type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files && e.target.files[0] && onFile(e.target.files[0])}
          disabled={extracting}
        />
        {extracting ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
            <p className="text-xs font-medium">Analysing with AI…</p>
            <p className="text-[10px] text-muted-foreground">Extracting fields from the document</p>
          </div>
        ) : preview ? (
          <div className="space-y-3">
            <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-lg border" />
            <div className="flex items-center justify-center gap-1 text-xs text-emerald-700 font-medium">
              <ScanLine className="w-3.5 h-3.5" />Re-upload to re-scan
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-brand" />
            </div>
            <p className="text-sm font-medium">Click to upload or drag &amp; drop</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />JPG, PNG. Max 5 MB. AI auto-fills fields.
            </p>
          </div>
        )}
      </label>

      {extractedSummary}
    </div>
  );
}

// ── Reusable validated input ────────────────────────────────────────────────
function FieldInput({ label, value, onChange, error, ...rest }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={error ? "border-red-300 focus-visible:ring-red-200" : ""}
        {...rest}
      />
      {error && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="bg-muted/40 rounded-lg p-2">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value || "—"}</div>
    </div>
  );
}

// ── Credentials modal (shown after create) ──────────────────────────────────
function CredentialsModal({ credentials, onClose }: { credentials: { email: string; password: string }; onClose: () => void }) {
  const [copied, setCopied] = useState<"email" | "password" | "both" | null>(null);

  function copy(text: string, kind: "email" | "password" | "both") {
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 text-center border-b">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-[var(--font-heading)] font-bold text-lg">Caregiver Created</h3>
          <p className="text-xs text-muted-foreground mt-1">Share these credentials securely. This is the only time the password is shown.</p>
        </div>

        <div className="p-5 space-y-3">
          <div className="bg-muted/30 rounded-xl p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Email</div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm font-mono truncate">{credentials.email}</code>
              <Button size="sm" variant="ghost" onClick={() => copy(credentials.email, "email")} className="h-7 w-7 p-0 shrink-0">
                {copied === "email" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Temporary Password</div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm font-mono truncate">{credentials.password}</code>
              <Button size="sm" variant="ghost" onClick={() => copy(credentials.password, "password")} className="h-7 w-7 p-0 shrink-0">
                {copied === "password" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <Button
            className="w-full bg-brand hover:bg-brand-dark text-white"
            onClick={() => copy(`Login: ${credentials.email}\nPassword: ${credentials.password}\nSign in at: ${window.location.origin}/login`, "both")}
          >
            {copied === "both" ? <><Check className="w-4 h-4 mr-2" />Copied!</> : <><Copy className="w-4 h-4 mr-2" />Copy Login Details</>}
          </Button>

          <Button variant="outline" onClick={onClose} className="w-full">Done</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Generate a memorable 9-char password with mixed case + digit (passes isValidPassword)
function generatePassword(): string {
  const words = ["care", "seva", "heal", "help", "safe", "kind", "trust"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  const cap = word.charAt(0).toUpperCase() + word.slice(1);
  return `${cap}${num}!`; // e.g. Care4821! → 9 chars, has letter + digit
}
