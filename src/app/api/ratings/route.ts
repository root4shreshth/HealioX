import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/ratings?caregiver_id=... — public-ish list of ratings for a caregiver
 * Returns aggregated stats + recent comments. Anyone logged in can read.
 */
export async function GET(req: NextRequest) {
  return withAuth(req, async (req) => {
    const url = new URL(req.url);
    const caregiverId = url.searchParams.get("caregiver_id");
    if (!caregiverId) {
      return NextResponse.json({ error: "caregiver_id required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: ratings, error } = await admin
      .from("caregiver_ratings")
      .select("id, stars, comment, created_at, patient_id, family_id")
      .eq("caregiver_id", caregiverId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const list = ratings || [];
    const count = list.length;
    const avg = count > 0 ? list.reduce((s, r) => s + r.stars, 0) / count : 0;
    const distribution = [1, 2, 3, 4, 5].reduce((acc: Record<number, number>, n) => {
      acc[n] = list.filter((r) => r.stars === n).length;
      return acc;
    }, {});

    return NextResponse.json({
      average: Math.round(avg * 10) / 10,
      count,
      distribution,
      recent: list.slice(0, 10).map((r) => ({
        id: r.id,
        stars: r.stars,
        comment: r.comment,
        created_at: r.created_at,
      })),
    });
  });
}

/**
 * POST /api/ratings — family submits a rating for a caregiver
 */
type RateBody = {
  caregiver_id: string;
  patient_id?: string;
  visit_id?: string;
  stars: number;
  comment?: string;
};

export async function POST(req: NextRequest) {
  return withAuth(req, async (req, user, role) => {
    if (!["family", "provider_admin"].includes(role)) {
      return NextResponse.json({ error: "Only family members can rate caregivers" }, { status: 403 });
    }

    let body: RateBody;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    if (!body.caregiver_id) return NextResponse.json({ error: "caregiver_id required" }, { status: 400 });
    if (typeof body.stars !== "number" || body.stars < 1 || body.stars > 5) {
      return NextResponse.json({ error: "stars must be between 1 and 5" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Resolve family's org + caregiver's org must match
    const [famRes, cgRes] = await Promise.all([
      admin.from("profiles").select("org_id").eq("id", user.id).single(),
      admin.from("profiles").select("org_id, role").eq("id", body.caregiver_id).single(),
    ]);

    if (!cgRes.data || cgRes.data.role !== "caregiver") {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }
    if (famRes.data?.org_id && cgRes.data.org_id && famRes.data.org_id !== cgRes.data.org_id) {
      return NextResponse.json({ error: "Cannot rate caregivers outside your care organization" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("caregiver_ratings")
      .upsert(
        {
          caregiver_id: body.caregiver_id,
          family_id: user.id,
          patient_id: body.patient_id || null,
          visit_id: body.visit_id || null,
          stars: Math.round(body.stars),
          comment: body.comment?.slice(0, 1000) || null,
          org_id: cgRes.data.org_id || famRes.data?.org_id || null,
        },
        { onConflict: "family_id,caregiver_id,patient_id" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rating: data, message: "Thank you for your feedback" });
  });
}
