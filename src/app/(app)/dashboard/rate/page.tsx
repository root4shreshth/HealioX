"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Star, CheckCircle2, Heart, User, Award, Clock,
} from "lucide-react";
import { motion } from "framer-motion";

type CaregiverProfile = {
  profile: {
    id: string;
    full_name: string;
    bio: string | null;
    experience_years: number | null;
    specializations: string[];
    languages: string[];
    avatar_url: string | null;
  };
  stats: {
    avg_rating: number;
    rating_count: number;
    visits_30d: number;
    visits_completed_30d: number;
    hours_delivered_30d: number;
    completion_rate: number;
  };
  recent_ratings: { stars: number; comment: string | null; created_at: string }[];
};

export default function RateCaregiverPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const caregiverId = sp.get("caregiver") || "";
  const visitId = sp.get("visit") || "";
  const patientId = sp.get("patient") || "";

  const [data, setData] = useState<CaregiverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!caregiverId) { setLoading(false); return; }
    const res = await fetch(`/api/caregivers/${caregiverId}`, { credentials: "include" });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [caregiverId]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit() {
    if (stars === 0) { setError("Please select a star rating"); return; }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        caregiver_id: caregiverId,
        patient_id: patientId || undefined,
        visit_id: visitId || undefined,
        stars,
        comment: comment.trim() || undefined,
      }),
    });
    const body = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(body.error || "Could not submit"); return; }
    setSubmitted(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  if (!caregiverId || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Caregiver not found or link is invalid.</p>
        <Button onClick={() => router.push("/dashboard")} className="mt-4 bg-brand text-white rounded-full">Back to Dashboard</Button>
      </div>
    );
  }

  const { profile, stats, recent_ratings } = data;

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="font-[var(--font-heading)] text-2xl font-black">Thank you!</h2>
        <p className="text-sm text-muted-foreground mt-2">Your feedback helps us improve care quality for everyone.</p>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Caregiver summary card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-lg shrink-0">
              {profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-[var(--font-heading)] font-black text-xl">{profile.full_name}</h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                {profile.experience_years != null && (
                  <span className="flex items-center gap-1"><Award className="w-3 h-3" />{profile.experience_years} yr experience</span>
                )}
                {stats.avg_rating > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Star className="w-3 h-3 fill-current" />{stats.avg_rating} ({stats.rating_count})
                  </span>
                )}
              </div>
              {profile.specializations?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {profile.specializations.slice(0, 4).map((s) => (
                    <Badge key={s} variant="secondary" className="text-[9px]">{s}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          {profile.bio && <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{profile.bio}</p>}

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="font-[var(--font-heading)] font-black text-lg">{stats.visits_completed_30d}</div>
              <div className="text-[9px] text-muted-foreground">Visits (30d)</div>
            </div>
            <div className="text-center">
              <div className="font-[var(--font-heading)] font-black text-lg">{stats.hours_delivered_30d}h</div>
              <div className="text-[9px] text-muted-foreground">Hours delivered</div>
            </div>
            <div className="text-center">
              <div className="font-[var(--font-heading)] font-black text-lg">{stats.completion_rate}%</div>
              <div className="text-[9px] text-muted-foreground">Completion</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate */}
      <Card className="border-brand/20 bg-brand/5">
        <CardContent className="p-5">
          <h3 className="font-[var(--font-heading)] font-bold mb-1 flex items-center gap-2">
            <Heart className="w-4 h-4 text-brand" />How was the visit?
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Your rating helps other families and motivates your caregiver.</p>

          {/* Stars */}
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHoverStars(n)}
                onMouseLeave={() => setHoverStars(0)}
                onClick={() => setStars(n)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    n <= (hoverStars || stars) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="text-sm font-medium mb-3">
            {stars === 5 && "⭐ Excellent — outstanding care"}
            {stars === 4 && "😊 Very good — above expectations"}
            {stars === 3 && "👍 Good — met expectations"}
            {stars === 2 && "😐 Could be better"}
            {stars === 1 && "😟 Needs improvement"}
            {stars === 0 && <span className="text-muted-foreground">Tap a star to rate</span>}
          </div>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share what went well or what could improve... (optional)"
            rows={4}
            className="resize-none"
            maxLength={1000}
          />
          <p className="text-[10px] text-muted-foreground mt-1">{comment.length}/1000 characters</p>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={submitting || stars === 0}
            className="w-full h-11 mt-4 bg-brand hover:bg-brand-dark text-white rounded-xl font-semibold"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Rating"}
          </Button>
        </CardContent>
      </Card>

      {/* Recent reviews */}
      {recent_ratings.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-[var(--font-heading)] font-bold mb-3">Recent Reviews from Other Families</h3>
            <div className="space-y-2">
              {recent_ratings.slice(0, 5).map((r, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, s) => (
                        <Star key={s} className={`w-3 h-3 ${s < r.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  {r.comment && <p className="text-xs">&ldquo;{r.comment}&rdquo;</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
