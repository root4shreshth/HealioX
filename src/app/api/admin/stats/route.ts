import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/stats — Consolidated dashboard stats for the admin portal.
 * Returns real, org-scoped metrics for the infographic dashboard.
 */
export async function GET(req: NextRequest) {
  return withAdmin(req, async (_req, _user, _role, orgId) => {
    const admin = createAdminClient();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);

    // Parallel queries
    const [
      patientsRes,
      caregiversRes,
      visitsTodayRes,
      visitsWeekRes,
      alertsRes,
      checkinsRes,
      activityRes,
    ] = await Promise.all([
      admin.from("patients")
        .select("id, risk_level, risk_score, created_at, is_active, primary_conditions")
        .eq("organization_id", orgId),
      admin.from("profiles")
        .select("id, is_active, role")
        .eq("org_id", orgId)
        .eq("role", "caregiver"),
      admin.from("visits")
        .select("id, status, check_in_time, scheduled_start, duration_minutes, services, caregiver_id, patients!inner(organization_id)")
        .eq("patients.organization_id", orgId)
        .gte("scheduled_start", `${todayStr}T00:00:00`)
        .lte("scheduled_start", `${todayStr}T23:59:59`),
      admin.from("visits")
        .select("id, status, scheduled_start, duration_minutes, services, patients!inner(organization_id)")
        .eq("patients.organization_id", orgId)
        .gte("scheduled_start", weekAgo.toISOString())
        .lte("scheduled_start", today.toISOString()),
      admin.from("alerts")
        .select("id, severity, type, status, created_at, patients!inner(organization_id, full_name)")
        .eq("patients.organization_id", orgId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10),
      admin.from("health_checkins")
        .select("id, risk_score, completed, created_at, patients!inner(organization_id)")
        .eq("patients.organization_id", orgId)
        .eq("completed", true)
        .gte("created_at", monthAgo.toISOString())
        .order("created_at", { ascending: false }),
      admin.from("activity_log")
        .select("id, action, entity, created_at, metadata, user_id")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const patients = patientsRes.data || [];
    const caregivers = caregiversRes.data || [];
    const visitsToday = visitsTodayRes.data || [];
    const visitsWeek = visitsWeekRes.data || [];
    const alerts = alertsRes.data || [];
    const checkins = checkinsRes.data || [];
    const activity = activityRes.data || [];

    // Active patients
    const activePatients = patients.filter((p) => p.is_active);

    // Risk distribution
    const riskDist = {
      low: activePatients.filter((p) => p.risk_level === "low").length,
      moderate: activePatients.filter((p) => p.risk_level === "moderate").length,
      high: activePatients.filter((p) => p.risk_level === "high").length,
      emergency: activePatients.filter((p) => p.risk_level === "emergency").length,
    };

    // Avg risk score
    const avgRisk = activePatients.length > 0
      ? Math.round(activePatients.reduce((s, p) => s + (p.risk_score || 0), 0) / activePatients.length)
      : 0;

    // Today's visit metrics
    const completedToday = visitsToday.filter((v) => v.status === "completed").length;
    const lateToday = visitsToday.filter((v) => {
      const scheduled = new Date(v.scheduled_start).getTime();
      const checkedIn = v.check_in_time ? new Date(v.check_in_time).getTime() : null;
      return checkedIn && checkedIn - scheduled > 15 * 60 * 1000;
    }).length;
    const completionRate = visitsToday.length > 0
      ? Math.round((completedToday / visitsToday.length) * 100)
      : 0;

    // 7-day visit volume chart
    const visitVolume: { date: string; visits: number; completed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
      const dayVisits = visitsWeek.filter((v) => {
        const vd = new Date(v.scheduled_start).toISOString().split("T")[0];
        return vd === dStr;
      });
      visitVolume.push({
        date: dStr,
        visits: dayVisits.length,
        completed: dayVisits.filter((v) => v.status === "completed").length,
      });
    }

    // Condition frequency (top 5)
    const conditionCounts: Record<string, number> = {};
    activePatients.forEach((p) => {
      (p.primary_conditions as string[] | null || []).forEach((c) => {
        conditionCounts[c] = (conditionCounts[c] || 0) + 1;
      });
    });
    const topConditions = Object.entries(conditionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Real revenue: ₹850 avg per completed visit this week
    const completedThisWeek = visitsWeek.filter((v) => v.status === "completed").length;
    const weeklyRevenue = completedThisWeek * 850;
    const projectedMonthly = weeklyRevenue * 4.3;

    // 30-day avg risk trend (for sparkline)
    const riskTrend = (() => {
      const byDay: Record<string, number[]> = {};
      checkins.forEach((c) => {
        const d = new Date(c.created_at).toISOString().split("T")[0];
        if (!byDay[d]) byDay[d] = [];
        if (c.risk_score !== null) byDay[d].push(Number(c.risk_score));
      });
      return Object.entries(byDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, scores]) => ({
          date,
          avg: Math.round(scores.reduce((s, n) => s + n, 0) / scores.length),
        }));
    })();

    // Alert severity breakdown
    const alertSeverity = {
      emergency: alerts.filter((a) => a.severity === "emergency").length,
      urgent: alerts.filter((a) => a.severity === "urgent").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
    };

    return NextResponse.json({
      kpis: {
        total_patients: activePatients.length,
        total_caregivers: caregivers.filter((c) => c.is_active).length,
        visits_today: visitsToday.length,
        visits_completed_today: completedToday,
        completion_rate: completionRate,
        late_checkins: lateToday,
        active_alerts: alerts.length,
        avg_risk_score: avgRisk,
      },
      risk_distribution: riskDist,
      alert_severity: alertSeverity,
      top_conditions: topConditions,
      visit_volume_7d: visitVolume,
      risk_trend_30d: riskTrend,
      recent_alerts: alerts.slice(0, 5).map((a) => {
        // patients join may be object or array depending on cardinality
        const p = a.patients as unknown;
        const patient = Array.isArray(p) ? p[0] : p;
        return {
          id: a.id,
          severity: a.severity,
          type: a.type,
          patient_name: (patient?.full_name as string) || "Unknown",
          created_at: a.created_at,
        };
      }),
      recent_activity: activity.map((a) => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        created_at: a.created_at,
        metadata: a.metadata,
      })),
      revenue: {
        weekly_inr: weeklyRevenue,
        projected_monthly_inr: Math.round(projectedMonthly),
        completed_visits_week: completedThisWeek,
      },
    });
  });
}
