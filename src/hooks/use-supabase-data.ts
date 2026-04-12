"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ──
export type Patient = {
  id: string;
  full_name: string;
  date_of_birth: string;
  age: number;
  address: string;
  risk_level: "low" | "moderate" | "high" | "emergency";
  risk_score: number;
  primary_conditions: string[];
  ndis_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

export type Alert = {
  id: string;
  patient_id: string;
  patient_name: string;
  type: string;
  severity: "info" | "warning" | "urgent" | "emergency";
  title: string;
  description: string;
  status: string;
  created_at: string;
};

export type Visit = {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_address: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  gps_verified: boolean;
  duration_minutes: number | null;
  services: string[];
  caregiver_notes: string;
};

export type HealthCheckin = {
  id: string;
  patient_id: string;
  risk_score: number | null;
  risk_level: string | null;
  domains: Record<string, { score: number; trend: string; notes?: string }>;
  ai_summary: string | null;
  flags: string[];
  completed: boolean;
  created_at: string;
};

// ── Hooks ──

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSeed, setNeedsSeed] = useState(false);

  const fetchPatients = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("is_active", true)
        .order("risk_score", { ascending: true });

      if (error) {
        console.error("Patients fetch error:", error);
        setNeedsSeed(true);
        return;
      }

      if (!data || data.length === 0) {
        setNeedsSeed(true);
        return;
      }

      setPatients(
        data.map((p) => ({
          id: p.id,
          full_name: p.full_name,
          date_of_birth: p.date_of_birth,
          age: Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / 31557600000),
          address: p.address,
          risk_level: p.risk_level,
          risk_score: Number(p.risk_score) || 0,
          primary_conditions: p.primary_conditions || [],
          ndis_number: p.ndis_number || "",
          emergency_contact_name: p.emergency_contact_name || "",
          emergency_contact_phone: p.emergency_contact_phone || "",
        }))
      );
      setNeedsSeed(false);
    } catch {
      setNeedsSeed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  return { patients, loading, needsSeed, refetch: fetchPatients };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("alerts")
        .select("*, patients(full_name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Alerts fetch error:", error);
        return;
      }

      setAlerts(
        (data || []).map((a: Record<string, unknown>) => ({
          id: a.id as string,
          patient_id: a.patient_id as string,
          patient_name: ((a.patients as Record<string, unknown>)?.full_name as string) || "Unknown",
          type: a.type as string,
          severity: a.severity as Alert["severity"],
          title: a.title as string,
          description: a.description as string,
          status: a.status as string,
          created_at: a.created_at as string,
        }))
      );
    } catch {
      console.error("Alerts fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  return { alerts, loading, refetch: fetchAlerts };
}

export function useVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisits = useCallback(async () => {
    try {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("visits")
        .select("*, patients(full_name, address)")
        .gte("scheduled_start", `${today}T00:00:00`)
        .lte("scheduled_start", `${today}T23:59:59`)
        .order("scheduled_start");

      if (error) {
        console.error("Visits fetch error:", error);
        return;
      }

      setVisits(
        (data || []).map((v: Record<string, unknown>) => {
          const patient = v.patients as Record<string, unknown> | null;
          return {
            id: v.id as string,
            patient_id: v.patient_id as string,
            patient_name: (patient?.full_name as string) || "Unknown",
            patient_address: (patient?.address as string) || "",
            scheduled_start: v.scheduled_start as string,
            scheduled_end: v.scheduled_end as string,
            status: v.status as string,
            check_in_time: v.check_in_time as string | null,
            check_out_time: v.check_out_time as string | null,
            gps_verified: (v.gps_verified as boolean) || false,
            duration_minutes: v.duration_minutes as number | null,
            services: (v.services as string[]) || [],
            caregiver_notes: (v.caregiver_notes as string) || "",
          };
        })
      );
    } catch {
      console.error("Visits fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  return { visits, setVisits, loading, refetch: fetchVisits };
}

export function useHealthCheckins(patientId?: string) {
  const [checkins, setCheckins] = useState<HealthCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const supabase = createClient();
        let query = supabase
          .from("health_checkins")
          .select("*")
          .eq("completed", true)
          .order("created_at", { ascending: false })
          .limit(30);

        if (patientId) {
          query = query.eq("patient_id", patientId);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Checkins fetch error:", error);
          return;
        }

        setCheckins(
          (data || []).map((c) => ({
            id: c.id,
            patient_id: c.patient_id,
            risk_score: c.risk_score ? Number(c.risk_score) : null,
            risk_level: c.risk_level,
            domains: c.domains || {},
            ai_summary: c.ai_summary,
            flags: c.flags || [],
            completed: c.completed,
            created_at: c.created_at,
          }))
        );
      } catch {
        console.error("Checkins fetch failed");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [patientId]);

  return { checkins, loading };
}

// Real-time subscription
export function useRealtimeRefresh(tables: string[], callback: () => void) {
  useEffect(() => {
    const supabase = createClient();
    const channels = tables.map((table) =>
      supabase
        .channel(`realtime-${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          callback();
        })
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [tables, callback]);
}
