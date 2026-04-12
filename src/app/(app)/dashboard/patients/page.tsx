"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Database } from "lucide-react";
import { usePatients } from "@/hooks/use-supabase-data";
import { useState } from "react";
import Link from "next/link";

const riskBadge: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  moderate: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  emergency: "bg-red-600 text-white",
};

export default function PatientsPage() {
  const { patients, loading, needsSeed } = usePatients();
  const [search, setSearch] = useState("");

  const filtered = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  async function seedData() {
    await fetch("/api/seed", { method: "POST" });
    window.location.reload();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;
  }

  if (patients.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-[var(--font-heading)] text-xl font-bold">No Patients Found</h3>
        <p className="text-sm text-muted-foreground mt-2">Seed demo data to see the patient list.</p>
        <Button onClick={seedData} className="mt-6 bg-brand hover:bg-brand-dark text-white rounded-full px-6">
          <Database className="w-4 h-4 mr-2" />Seed Demo Data
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-[var(--font-heading)] text-2xl font-black">Patients</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((patient) => (
          <Link key={patient.id} href={`/dashboard/patients/${patient.id}`}>
            <Card className="border-border hover:shadow-lg hover:border-brand/20 transition-all cursor-pointer group h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      patient.risk_level === "high" || patient.risk_level === "emergency" ? "bg-red-100" :
                      patient.risk_level === "moderate" ? "bg-amber-100" : "bg-green-100"
                    }`}>
                      <span className={`text-sm font-bold ${
                        patient.risk_level === "high" || patient.risk_level === "emergency" ? "text-red-700" :
                        patient.risk_level === "moderate" ? "text-amber-700" : "text-green-700"
                      }`}>
                        {patient.full_name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="font-[var(--font-heading)] font-bold group-hover:text-brand transition-colors">{patient.full_name}</p>
                      <p className="text-xs text-muted-foreground">Age {patient.age}</p>
                    </div>
                  </div>
                  <Badge className={`${riskBadge[patient.risk_level] || ""} text-[10px]`}>{patient.risk_level.toUpperCase()}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Risk Score</span>
                    <span className="font-[var(--font-heading)] font-bold">{patient.risk_score}/100</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${patient.risk_score >= 70 ? "bg-green-500" : patient.risk_score >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${patient.risk_score}%` }} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {patient.primary_conditions.map((c) => (
                    <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
