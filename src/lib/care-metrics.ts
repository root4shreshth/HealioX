// Care quality and funding metrics calculations
// These directly address the problem statement pillars:
// - Transparency: visit verification rates
// - Quality: composite care quality scores
// - Efficiency: funding accountability metrics

export type CareQualityScore = {
  overall: number; // 0-100
  visitVerification: number; // % of visits GPS-verified
  serviceCompletion: number; // avg services per visit
  checkinCoverage: number; // % of visits with AI check-in
  riskTrend: "improving" | "stable" | "declining";
};

export type FundingMetrics = {
  totalVerifiedHours: number;
  totalServicesDelivered: number;
  verificationRate: number; // percentage
  estimatedSavings: number; // dollars
  anomalies: { type: string; description: string; visitId: string }[];
};

type Visit = {
  id: string;
  status: string;
  gps_verified: boolean;
  duration_minutes: number | null;
  services: string[] | null;
};

type Checkin = {
  risk_score: number | null;
  risk_level: string | null;
  created_at: string;
};

export function calculateCareQuality(
  visits: Visit[],
  checkins: Checkin[]
): CareQualityScore {
  const completedVisits = visits.filter((v) => v.status === "completed");
  const totalVisits = visits.length || 1;

  // Visit verification rate
  const verifiedVisits = completedVisits.filter((v) => v.gps_verified);
  const visitVerification = Math.round(
    (verifiedVisits.length / Math.max(completedVisits.length, 1)) * 100
  );

  // Service completion (avg services per completed visit)
  const totalServices = completedVisits.reduce(
    (sum, v) => sum + (v.services?.length || 0),
    0
  );
  const avgServices = completedVisits.length > 0
    ? totalServices / completedVisits.length
    : 0;
  const serviceCompletion = Math.min(Math.round((avgServices / 3) * 100), 100); // 3 services = 100%

  // Check-in coverage
  const checkinCoverage = Math.round(
    (checkins.length / Math.max(completedVisits.length, 1)) * 100
  );

  // Risk trend (from last 5 check-ins)
  const recentCheckins = checkins
    .filter((c) => c.risk_score !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  let riskTrend: "improving" | "stable" | "declining" = "stable";
  if (recentCheckins.length >= 3) {
    const recent = recentCheckins.slice(0, 2).reduce((s, c) => s + (c.risk_score || 0), 0) / 2;
    const older = recentCheckins.slice(-2).reduce((s, c) => s + (c.risk_score || 0), 0) / 2;
    if (recent > older + 5) riskTrend = "improving";
    else if (recent < older - 5) riskTrend = "declining";
  }

  // Overall quality score (weighted)
  const overall = Math.round(
    visitVerification * 0.35 +
    serviceCompletion * 0.25 +
    Math.min(checkinCoverage, 100) * 0.25 +
    (riskTrend === "improving" ? 100 : riskTrend === "stable" ? 70 : 30) * 0.15
  );

  return {
    overall,
    visitVerification,
    serviceCompletion,
    checkinCoverage: Math.min(checkinCoverage, 100),
    riskTrend,
  };
}

export function calculateFundingMetrics(visits: Visit[]): FundingMetrics {
  const completedVisits = visits.filter((v) => v.status === "completed");
  const verifiedVisits = completedVisits.filter((v) => v.gps_verified);

  // Total verified hours
  const totalMinutes = verifiedVisits.reduce(
    (sum, v) => sum + (v.duration_minutes || 0),
    0
  );
  const totalVerifiedHours = Math.round((totalMinutes / 60) * 10) / 10;

  // Total services delivered
  const totalServicesDelivered = completedVisits.reduce(
    (sum, v) => sum + (v.services?.length || 0),
    0
  );

  // Verification rate
  const verificationRate = completedVisits.length > 0
    ? Math.round((verifiedVisits.length / completedVisits.length) * 100)
    : 0;

  // Estimated savings (early intervention prevents ~$5,000 per avoided hospital admission)
  // Rough estimate: each health check-in that catches a decline saves ~$2,000
  const estimatedSavings = completedVisits.length * 450; // Average per-visit value

  // Anomalies
  const anomalies: FundingMetrics["anomalies"] = [];
  for (const visit of completedVisits) {
    if (visit.duration_minutes !== null && visit.duration_minutes < 10) {
      anomalies.push({
        type: "short_visit",
        description: `Visit lasted only ${visit.duration_minutes} min (expected 30-60 min)`,
        visitId: visit.id,
      });
    }
    if (!visit.services || visit.services.length === 0) {
      anomalies.push({
        type: "no_services",
        description: "Visit completed but no services were logged",
        visitId: visit.id,
      });
    }
    if (!visit.gps_verified) {
      anomalies.push({
        type: "unverified",
        description: "Visit completed without GPS verification",
        visitId: visit.id,
      });
    }
  }

  return {
    totalVerifiedHours,
    totalServicesDelivered,
    verificationRate,
    estimatedSavings,
    anomalies,
  };
}

// Check for missed visits (Transparency feature)
export function detectMissedVisits(visits: Visit[]): string[] {
  const now = new Date();
  const missed: string[] = [];

  for (const visit of visits) {
    if (visit.status === "scheduled") {
      // This is a simplified check — in production you'd check scheduled_start
      // For now we flag any scheduled visit as potentially overdue
      missed.push(visit.id);
    }
  }

  return missed;
}
