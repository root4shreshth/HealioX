import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/caregivers/[id] — full caregiver profile with ratings + stats
 * Accessible to anyone authenticated (family needs to see the caregiver
 * who visits their loved one).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(_req, async () => {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, full_name, email, role, phone, bio, experience_years, specializations, languages, certifications, avatar_url, hire_date, is_active, org_id, created_at")
      .eq("id", id)
      .single();

    if (error || !profile || profile.role !== "caregiver") {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    // Ratings aggregate
    const { data: ratings } = await admin
      .from("caregiver_ratings")
      .select("stars, comment, created_at, family_id")
      .eq("caregiver_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    const count = ratings?.length || 0;
    const avg = count > 0 ? (ratings || []).reduce((s, r) => s + r.stars, 0) / count : 0;

    // Visits aggregate (last 30 days)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const { data: visits } = await admin
      .from("visits")
      .select("id, status, duration_minutes, scheduled_start, services")
      .eq("caregiver_id", id)
      .gte("scheduled_start", monthAgo.toISOString());

    const v = visits || [];
    const completed = v.filter((x) => x.status === "completed");
    const totalHours = Math.round(completed.reduce((s, x) => s + (x.duration_minutes || 0) / 60, 0) * 10) / 10;

    return NextResponse.json({
      profile,
      stats: {
        avg_rating: Math.round(avg * 10) / 10,
        rating_count: count,
        visits_30d: v.length,
        visits_completed_30d: completed.length,
        hours_delivered_30d: totalHours,
        completion_rate: v.length > 0 ? Math.round((completed.length / v.length) * 100) : 0,
      },
      recent_ratings: (ratings || []).slice(0, 10).map((r) => ({
        stars: r.stars,
        comment: r.comment,
        created_at: r.created_at,
      })),
    });
  });
}
