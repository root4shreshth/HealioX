// Demo data for hackathon demonstration
// In production, this comes from Supabase

export const DEMO_PATIENTS = [
  {
    id: "p1",
    full_name: "Margaret Sullivan",
    date_of_birth: "1941-03-15",
    age: 85,
    address: "42 Rose St, Nedlands WA 6009",
    risk_level: "moderate" as const,
    risk_score: 62,
    primary_conditions: ["Arthritis", "Mild Cognitive Decline", "Hypertension"],
    ndis_number: "NDIS-4432891",
    emergency_contact_name: "Sarah Sullivan",
    emergency_contact_phone: "0412 345 678",
  },
  {
    id: "p2",
    full_name: "John Davis",
    date_of_birth: "1938-07-22",
    age: 87,
    address: "18 Oak Ave, Subiaco WA 6008",
    risk_level: "low" as const,
    risk_score: 81,
    primary_conditions: ["Type 2 Diabetes", "Hearing Loss"],
    ndis_number: "NDIS-5561023",
    emergency_contact_name: "Michael Davis",
    emergency_contact_phone: "0423 456 789",
  },
  {
    id: "p3",
    full_name: "Alice Wong",
    date_of_birth: "1945-11-08",
    age: 80,
    address: "7 Cliff Rd, Claremont WA 6010",
    risk_level: "high" as const,
    risk_score: 38,
    primary_conditions: ["Parkinson's Disease", "Depression", "Fall Risk"],
    ndis_number: "NDIS-7789234",
    emergency_contact_name: "David Wong",
    emergency_contact_phone: "0434 567 890",
  },
  {
    id: "p4",
    full_name: "Robert Chen",
    date_of_birth: "1950-01-30",
    age: 76,
    address: "95 Park Way, Crawley WA 6009",
    risk_level: "low" as const,
    risk_score: 88,
    primary_conditions: ["COPD", "Mild Anxiety"],
    ndis_number: "NDIS-3345678",
    emergency_contact_name: "Linda Chen",
    emergency_contact_phone: "0445 678 901",
  },
];

export const DEMO_VISITS_TODAY = [
  {
    id: "v1",
    patient: DEMO_PATIENTS[0],
    scheduled_start: "2026-04-11T09:00:00",
    scheduled_end: "2026-04-11T10:00:00",
    status: "completed" as const,
    check_in_time: "2026-04-11T09:02:00",
    check_out_time: "2026-04-11T09:47:00",
    gps_verified: true,
    duration_minutes: 45,
    services: ["Personal Care", "Medication Assistance"],
    caregiver_notes: "Margaret was in good spirits. Assisted with shower and morning medication.",
  },
  {
    id: "v2",
    patient: DEMO_PATIENTS[1],
    scheduled_start: "2026-04-11T10:30:00",
    scheduled_end: "2026-04-11T11:30:00",
    status: "scheduled" as const,
    check_in_time: null,
    check_out_time: null,
    gps_verified: false,
    duration_minutes: null,
    services: [],
    caregiver_notes: "",
  },
  {
    id: "v3",
    patient: DEMO_PATIENTS[2],
    scheduled_start: "2026-04-11T13:00:00",
    scheduled_end: "2026-04-11T14:00:00",
    status: "scheduled" as const,
    check_in_time: null,
    check_out_time: null,
    gps_verified: false,
    duration_minutes: null,
    services: [],
    caregiver_notes: "",
  },
  {
    id: "v4",
    patient: DEMO_PATIENTS[3],
    scheduled_start: "2026-04-11T15:00:00",
    scheduled_end: "2026-04-11T15:45:00",
    status: "scheduled" as const,
    check_in_time: null,
    check_out_time: null,
    gps_verified: false,
    duration_minutes: null,
    services: [],
    caregiver_notes: "",
  },
];

export const DEMO_HEALTH_CHECKINS = [
  {
    id: "hc1",
    patient_id: "p1",
    date: "2026-04-11",
    risk_score: 62,
    risk_level: "moderate" as const,
    domains: {
      mood: { score: 70, trend: "stable" as const },
      pain: { score: 45, trend: "declining" as const },
      mobility: { score: 55, trend: "declining" as const },
      medication: { score: 90, trend: "stable" as const },
      sleep: { score: 60, trend: "stable" as const },
      appetite: { score: 75, trend: "stable" as const },
      cognition: { score: 58, trend: "declining" as const },
    },
    summary: "Margaret reports increased knee pain and some difficulty with mobility. Cognition shows mild decline. Medication adherence remains excellent.",
    flags: ["Knee pain worsening", "Mobility declining"],
  },
  {
    id: "hc2",
    patient_id: "p3",
    date: "2026-04-11",
    risk_score: 38,
    risk_level: "high" as const,
    domains: {
      mood: { score: 30, trend: "declining" as const },
      pain: { score: 50, trend: "stable" as const },
      mobility: { score: 25, trend: "declining" as const },
      medication: { score: 70, trend: "stable" as const },
      sleep: { score: 35, trend: "declining" as const },
      appetite: { score: 40, trend: "declining" as const },
      cognition: { score: 55, trend: "stable" as const },
    },
    summary: "Alice showing significant decline in mood and mobility. Sleep and appetite are both deteriorating. Fall risk elevated. Recommend care plan review.",
    flags: ["Severe mood decline", "High fall risk", "Appetite loss", "Sleep disruption"],
  },
];

export const DEMO_ALERTS = [
  {
    id: "a1",
    patient: DEMO_PATIENTS[2],
    type: "health_decline",
    severity: "urgent" as const,
    title: "Rapid Health Decline - Alice Wong",
    description: "Risk score dropped from 52 to 38 over the past week. Multiple domains showing decline.",
    status: "active" as const,
    created_at: "2026-04-11T08:30:00",
  },
  {
    id: "a2",
    patient: DEMO_PATIENTS[0],
    type: "risk_change",
    severity: "warning" as const,
    title: "Mobility Concern - Margaret Sullivan",
    description: "Mobility score has declined for 3 consecutive check-ins. Knee pain reported as worsening.",
    status: "active" as const,
    created_at: "2026-04-11T09:45:00",
  },
];

// Historical risk scores for trend chart (last 30 days)
export function generateTrendData(patientId: string) {
  const baseScores: Record<string, number> = {
    p1: 75,
    p2: 85,
    p3: 55,
    p4: 90,
  };
  const base = baseScores[patientId] || 70;
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variation = Math.sin(i * 0.3) * 8 + (Math.random() - 0.5) * 6;
    const decline = patientId === "p3" ? i * 0.5 : 0; // Alice declining
    data.push({
      date: date.toISOString().split("T")[0],
      score: Math.max(10, Math.min(100, Math.round(base + variation - decline))),
    });
  }
  return data;
}
