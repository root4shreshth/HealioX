-- ============================================================
-- New tables for caregiver tasks, daily updates, and reports
-- ============================================================

-- Daily task templates (what caregivers should do per visit)
CREATE TABLE IF NOT EXISTS care_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- personal_care, medication, meal, mobility, social, nursing
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_care_tasks_visit ON care_tasks(visit_id);
CREATE INDEX idx_care_tasks_patient ON care_tasks(patient_id);

-- Daily updates submitted by caregivers (sync to family portal)
CREATE TABLE IF NOT EXISTS daily_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  caregiver_id UUID NOT NULL REFERENCES profiles(id),
  visit_id UUID REFERENCES visits(id),
  update_type TEXT NOT NULL DEFAULT 'daily', -- daily, incident, observation
  content TEXT NOT NULL,
  mood_observation TEXT, -- caregiver's observation of patient mood
  appetite_observation TEXT,
  mobility_observation TEXT,
  medication_taken BOOLEAN,
  concerns TEXT[],
  photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_updates_patient ON daily_updates(patient_id);
CREATE INDEX idx_daily_updates_caregiver ON daily_updates(caregiver_id);
CREATE INDEX idx_daily_updates_created ON daily_updates(created_at DESC);

-- Monthly reports (generated from visit + task + update data)
CREATE TABLE IF NOT EXISTS monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  organization_id UUID REFERENCES organizations(id),
  report_month DATE NOT NULL, -- first day of the month
  total_visits INTEGER DEFAULT 0,
  completed_visits INTEGER DEFAULT 0,
  verified_visits INTEGER DEFAULT 0,
  total_care_hours NUMERIC(10,2) DEFAULT 0,
  services_delivered TEXT[],
  avg_risk_score NUMERIC(5,2),
  risk_trend TEXT, -- improving, stable, declining
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  health_checkins_count INTEGER DEFAULT 0,
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, ready, submitted
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_monthly_reports_patient ON monthly_reports(patient_id);

-- RLS
ALTER TABLE care_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON care_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON daily_updates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON monthly_reports FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE care_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_updates;
