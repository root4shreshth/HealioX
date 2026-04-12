-- ============================================================
-- HealioX Care Intelligence Platform - Database Schema
-- ============================================================

-- ENUMS
CREATE TYPE user_role AS ENUM ('caregiver', 'patient', 'family', 'provider_admin', 'government');
CREATE TYPE visit_status AS ENUM ('scheduled', 'in_progress', 'completed', 'missed', 'cancelled');
CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high', 'emergency');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'urgent', 'emergency');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'escalated');

-- ============================================================
-- TABLES
-- ============================================================

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'provider',
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'family',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  organization_id UUID REFERENCES organizations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_org ON profiles(organization_id);

-- Patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geofence_radius INTEGER NOT NULL DEFAULT 100,
  ndis_number TEXT,
  risk_level risk_level NOT NULL DEFAULT 'low',
  risk_score NUMERIC(5,2) DEFAULT 0,
  primary_conditions TEXT[] DEFAULT '{}',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  organization_id UUID REFERENCES organizations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_risk ON patients(risk_level);

-- Patient assignments
CREATE TABLE patient_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id, profile_id)
);

CREATE INDEX idx_assignments_patient ON patient_assignments(patient_id);
CREATE INDEX idx_assignments_profile ON patient_assignments(profile_id);

-- Visits
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  caregiver_id UUID NOT NULL REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  gps_verified BOOLEAN DEFAULT false,
  distance_from_patient NUMERIC(10,2),
  status visit_status NOT NULL DEFAULT 'scheduled',
  caregiver_notes TEXT,
  voice_note_url TEXT,
  evidence_photos TEXT[] DEFAULT '{}',
  services TEXT[] DEFAULT '{}',
  duration_minutes INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_visits_caregiver ON visits(caregiver_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_scheduled ON visits(scheduled_start);

-- Health check-ins
CREATE TABLE health_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  visit_id UUID REFERENCES visits(id),
  triggered_by UUID REFERENCES profiles(id),
  conversation JSONB NOT NULL DEFAULT '[]',
  risk_score NUMERIC(5,2),
  risk_level risk_level,
  risk_change NUMERIC(5,2),
  confidence NUMERIC(3,2),
  domains JSONB DEFAULT '{}',
  ai_summary TEXT,
  flags TEXT[] DEFAULT '{}',
  recommended_actions TEXT[] DEFAULT '{}',
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkins_patient ON health_checkins(patient_id);
CREATE INDEX idx_checkins_risk ON health_checkins(risk_level);
CREATE INDEX idx_checkins_created ON health_checkins(created_at DESC);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  checkin_id UUID REFERENCES health_checkins(id),
  visit_id UUID REFERENCES visits(id),
  type TEXT NOT NULL,
  severity alert_severity NOT NULL,
  status alert_status NOT NULL DEFAULT 'active',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_patient ON alerts(patient_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_patients_updated BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_visits_updated BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_alerts_updated BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate visit duration
CREATE OR REPLACE FUNCTION calculate_visit_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_out_time IS NOT NULL AND NEW.check_in_time IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_visit_duration BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION calculate_visit_duration();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- For hackathon demo: allow all authenticated users to read/write
-- In production, these would be scoped per-role and per-organization

CREATE POLICY "Allow all for authenticated users" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON patient_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON visits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON health_checkins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON organizations FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Demo organization
INSERT INTO organizations (id, name, type, address) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Continuity Care WA', 'provider', 'Perth, Western Australia');

-- Demo patients
INSERT INTO patients (id, full_name, date_of_birth, address, lat, lng, risk_level, risk_score, primary_conditions, emergency_contact_name, emergency_contact_phone, ndis_number, organization_id) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Margaret Sullivan', '1941-03-15', '42 Rose St, Nedlands WA 6009', -31.9815, 115.8025, 'moderate', 62, ARRAY['Arthritis', 'Mild Cognitive Decline', 'Hypertension'], 'Sarah Sullivan', '0412 345 678', 'NDIS-4432891', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000102', 'John Davis', '1938-07-22', '18 Oak Ave, Subiaco WA 6008', -31.9490, 115.8277, 'low', 81, ARRAY['Type 2 Diabetes', 'Hearing Loss'], 'Michael Davis', '0423 456 789', 'NDIS-5561023', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000103', 'Alice Wong', '1945-11-08', '7 Cliff Rd, Claremont WA 6010', -31.9757, 115.7829, 'high', 38, ARRAY['Parkinson''s Disease', 'Depression', 'Fall Risk'], 'David Wong', '0434 567 890', 'NDIS-7789234', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000104', 'Robert Chen', '1950-01-30', '95 Park Way, Crawley WA 6009', -31.9818, 115.8171, 'low', 88, ARRAY['COPD', 'Mild Anxiety'], 'Linda Chen', '0445 678 901', 'NDIS-3345678', '00000000-0000-0000-0000-000000000001');

-- Demo alerts
INSERT INTO alerts (patient_id, type, severity, title, description) VALUES
  ('00000000-0000-0000-0000-000000000103', 'health_decline', 'urgent', 'Rapid Health Decline - Alice Wong', 'Risk score dropped from 52 to 38 over the past week. Multiple domains showing decline.'),
  ('00000000-0000-0000-0000-000000000101', 'risk_change', 'warning', 'Mobility Concern - Margaret Sullivan', 'Mobility score has declined for 3 consecutive check-ins. Knee pain reported as worsening.');

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE visits;
ALTER PUBLICATION supabase_realtime ADD TABLE health_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
