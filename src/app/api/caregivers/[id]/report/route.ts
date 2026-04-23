import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/caregivers/[id]/report?period=week|month
 *
 * Returns a formatted work report for the caregiver:
 *   - Summary stats (visits, hours, services, patients served)
 *   - Daily breakdown
 *   - Service-type breakdown
 *   - Patient list with visit counts
 *   - Concerns/flags raised
 *   - Ratings received in the period
 *   - Late check-ins + completion rate
 *
 * Access:
 *   - The caregiver themselves
 *   - provider_admin in the same org
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (req, user, role) => {
    const { id } = await params;
    const url = new URL(req.url);
    const period = url.searchParams.get("period") === "month" ? "month" : "week";

    const admin = createAdminClient();

    // Access control
    if (role === "caregiver" && id !== user.id) {
      return NextResponse.json({ error: "Can only view your own reports" }, { status: 403 });
    }
    if (role === "provider_admin") {
      const { data: caller } = await admin.from("profiles").select("org_id").eq("id", user.id).single();
      const { data: target } = await admin.from("profiles").select("org_id").eq("id", id).single();
      if (!caller || !target || caller.org_id !== target.org_id) {
        return NextResponse.json({ error: "Not in your organization" }, { status: 403 });
      }
    }

    // Resolve date range
    const now = new Date();
    const from = new Date(now);
    if (period === "week") from.setDate(now.getDate() - 7);
    else from.setDate(now.getDate() - 30);

    // Fetch data in parallel
    const [visitsRes, profileRes, ratingsRes, updatesRes] = await Promise.all([
      admin.from("visits")
        .select("id, patient_id, scheduled_start, check_in_time, check_out_time, status, duration_minutes, services, caregiver_notes, patients(full_name, address)")
        .eq("caregiver_id", id)
        .gte("scheduled_start", from.toISOString())
        .order("scheduled_start", { ascending: false }),
      admin.from("profiles")
        .select("full_name, email, hire_date, specializations")
        .eq("id", id)
        .single(),
      admin.from("caregiver_ratings")
        .select("stars, comment, created_at")
        .eq("caregiver_id", id)
        .gte("created_at", from.toISOString()),
      admin.from("daily_updates")
        .select("patient_id, content, mood_observation, medication_taken, concerns, created_at")
        .eq("caregiver_id", id)
        .gte("created_at", from.toISOString()),
    ]);

    const visits = visitsRes.data || [];
    const ratings = ratingsRes.data || [];
    const updates = updatesRes.data || [];

    const completed = visits.filter((v) => v.status === "completed");
    const scheduled = visits.filter((v) => v.status === "scheduled");
    const lateCheckins = visits.filter((v) => {
      const s = new Date(v.scheduled_start).getTime();
      const c = v.check_in_time ? new Date(v.check_in_time).getTime() : null;
      return c && c - s > 15 * 60 * 1000;
    });

    const totalMinutes = completed.reduce((s, v) => s + (v.duration_minutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Service-type breakdown
    const serviceCounts: Record<string, number> = {};
    completed.forEach((v) => {
      (v.services as string[] || []).forEach((s) => {
        serviceCounts[s] = (serviceCounts[s] || 0) + 1;
      });
    });
    const topServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // Patient breakdown
    const patientMap: Record<string, { id: string; name: string; address: string; visitCount: number; hours: number }> = {};
    completed.forEach((v) => {
      const p = v.patients as unknown;
      const patient = Array.isArray(p) ? p[0] : p;
      const row = patient as { full_name?: string; address?: string } | null;
      const pid = v.patient_id as string;
      if (!patientMap[pid]) {
        patientMap[pid] = {
          id: pid,
          name: row?.full_name || "Unknown",
          address: row?.address || "",
          visitCount: 0,
          hours: 0,
        };
      }
      patientMap[pid].visitCount++;
      patientMap[pid].hours += (v.duration_minutes || 0) / 60;
    });
    const patients = Object.values(patientMap).map((p) => ({
      ...p,
      hours: Math.round(p.hours * 10) / 10,
    }));

    // Daily breakdown
    const days: Record<string, { date: string; visits: number; hours: number }> = {};
    const cursor = new Date(from);
    while (cursor <= now) {
      const key = cursor.toISOString().split("T")[0];
      days[key] = { date: key, visits: 0, hours: 0 };
      cursor.setDate(cursor.getDate() + 1);
    }
    completed.forEach((v) => {
      const key = new Date(v.scheduled_start).toISOString().split("T")[0];
      if (days[key]) {
        days[key].visits++;
        days[key].hours += (v.duration_minutes || 0) / 60;
      }
    });
    const daily = Object.values(days).map((d) => ({ ...d, hours: Math.round(d.hours * 10) / 10 }));

    // Concerns raised
    const concernsRaised: string[] = [];
    updates.forEach((u) => {
      (u.concerns as string[] || []).forEach((c) => concernsRaised.push(c));
    });

    // Rating aggregate
    const ratingAvg = ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r.stars, 0) / ratings.length) * 10) / 10
      : 0;

    return NextResponse.json({
      caregiver: {
        id,
        name: profileRes.data?.full_name || "Caregiver",
        email: profileRes.data?.email,
        hire_date: profileRes.data?.hire_date,
        specializations: profileRes.data?.specializations || [],
      },
      period,
      from: from.toISOString(),
      to: now.toISOString(),
      summary: {
        total_visits: visits.length,
        completed_visits: completed.length,
        scheduled_visits: scheduled.length,
        total_hours: totalHours,
        unique_patients: patients.length,
        late_checkins: lateCheckins.length,
        completion_rate: visits.length > 0 ? Math.round((completed.length / visits.length) * 100) : 0,
        on_time_rate: visits.length > 0 ? Math.round(((visits.length - lateCheckins.length) / visits.length) * 100) : 100,
        avg_rating: ratingAvg,
        rating_count: ratings.length,
        concerns_raised: concernsRaised.length,
        medications_administered: updates.filter((u) => u.medication_taken).length,
      },
      daily,
      services: topServices,
      patients,
      concerns: [...new Set(concernsRaised)].slice(0, 20),
      ratings: ratings.slice(0, 10).map((r) => ({
        stars: r.stars,
        comment: r.comment,
        created_at: r.created_at,
      })),
    });
  });
}
