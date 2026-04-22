"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Bell, CheckCircle2, Zap, AlertTriangle,
  AlertCircle, Info, Clock, Filter, X,
} from "lucide-react";
import { motion } from "framer-motion";

type Alert = {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_risk_level: string;
  type: string;
  severity: "info" | "warning" | "urgent" | "emergency";
  title: string;
  description: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; icon: typeof Bell; border: string }> = {
  emergency: { bg: "bg-red-600", text: "text-white", icon: Zap, border: "border-red-300" },
  urgent:    { bg: "bg-red-100", text: "text-red-700", icon: AlertCircle, border: "border-red-200" },
  warning:   { bg: "bg-amber-100", text: "text-amber-700", icon: AlertTriangle, border: "border-amber-200" },
  info:      { bg: "bg-blue-100", text: "text-blue-700", icon: Info, border: "border-blue-200" },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "resolved" | "all">("active");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/alerts?status=${filter}`, { credentials: "include" });
    if (res.ok) setAlerts((await res.json()).alerts || []);
    setLoading(false);
    setSelected(new Set());
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function toggleSelect(id: string) {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  }

  async function handleResolve(ids: string[]) {
    setBulkAction(true);
    await fetch("/api/admin/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids, action: "resolve" }),
    });
    setBulkAction(false);
    load();
  }

  async function handleAcknowledge(ids: string[]) {
    setBulkAction(true);
    await fetch("/api/admin/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids, action: "acknowledge" }),
    });
    setBulkAction(false);
    load();
  }

  const bySeverity = {
    emergency: alerts.filter((a) => a.severity === "emergency" && a.status === "active").length,
    urgent:    alerts.filter((a) => a.severity === "urgent" && a.status === "active").length,
    warning:   alerts.filter((a) => a.severity === "warning" && a.status === "active").length,
    info:      alerts.filter((a) => a.severity === "info" && a.status === "active").length,
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-black">Alerts</h2>
          <p className="text-sm text-muted-foreground">Monitor and respond to patient events</p>
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleAcknowledge(Array.from(selected))} disabled={bulkAction} className="rounded-full text-xs">
              Acknowledge ({selected.size})
            </Button>
            <Button size="sm" onClick={() => handleResolve(Array.from(selected))} disabled={bulkAction} className="bg-green-600 hover:bg-green-700 text-white rounded-full text-xs">
              {bulkAction ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
              Resolve ({selected.size})
            </Button>
          </div>
        )}
      </div>

      {/* Severity summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["emergency", "urgent", "warning", "info"] as const).map((sev) => {
          const cfg = SEVERITY_CONFIG[sev];
          const count = bySeverity[sev];
          return (
            <Card key={sev} className={count > 0 && sev === "emergency" ? "border-red-300 animate-pulse" : ""}>
              <CardContent className="p-3">
                <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center mb-2`}>
                  <cfg.icon className={`w-4 h-4 ${cfg.text}`} />
                </div>
                <div className="font-[var(--font-heading)] text-xl font-black">{count}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{sev} — active</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-full max-w-sm">
        {(["active", "resolved", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
              filter === f ? "bg-white shadow text-brand" : "text-muted-foreground hover:text-foreground"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="font-[var(--font-heading)] font-bold">All clear</h3>
            <p className="text-sm text-muted-foreground mt-1">No {filter !== "all" ? filter : ""} alerts right now</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((a, i) => {
            const cfg = SEVERITY_CONFIG[a.severity];
            const isSelected = selected.has(a.id);
            const Icon = cfg.icon;
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className={`${cfg.border} ${isSelected ? "ring-2 ring-brand" : ""} ${a.severity === "emergency" && a.status === "active" ? "bg-red-50/40" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {a.status === "active" && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(a.id)}
                          className="mt-1 shrink-0"
                        />
                      )}
                      <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${cfg.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{a.title}</span>
                          <Badge className={`text-[9px] ${cfg.bg} ${cfg.text}`}>{a.severity}</Badge>
                          {a.status === "resolved" && (
                            <Badge className="bg-green-100 text-green-700 text-[9px]"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Resolved</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span className="font-semibold">{a.patient_name}</span>
                          <span>·</span>
                          <span className="capitalize">{a.type.replace(/_/g, " ")}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{new Date(a.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                          {a.resolved_at && (
                            <>
                              <span>·</span>
                              <span className="text-green-600">Resolved {new Date(a.resolved_at).toLocaleString("en-IN", { day: "numeric", month: "short" })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {a.status === "active" && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => handleAcknowledge([a.id])} className="h-8 text-xs">Acknowledge</Button>
                          <Button size="sm" onClick={() => handleResolve([a.id])} className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs">Resolve</Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
