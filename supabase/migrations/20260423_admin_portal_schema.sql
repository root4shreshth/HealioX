-- ═══════════════════════════════════════════════════════════════════════════
-- HealioX — Admin Portal Schema Migration
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query).
-- Safe to run multiple times: all statements use IF NOT EXISTS guards.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. PROFILES TABLE ────────────────────────────────────────────────────
-- Add missing columns used by the admin portal, auth hook, and layout.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_id     uuid,
  ADD COLUMN IF NOT EXISTS phone      text,
  ADD COLUMN IF NOT EXISTS is_active  boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Foreign key from profiles.org_id → organizations.id (only if organizations exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'profiles_org_id_fkey' AND table_name = 'profiles'
    ) THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_org_id_fkey
        FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Helpful index for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role   ON public.profiles(role);


-- ─── 2. ORGANIZATIONS TABLE ───────────────────────────────────────────────
-- Add columns needed by the settings page and signup flow.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS phone    text,
  ADD COLUMN IF NOT EXISTS email    text,
  ADD COLUMN IF NOT EXISTS website  text,
  ADD COLUMN IF NOT EXISTS plan     text DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();


-- ─── 3. PATIENTS TABLE ────────────────────────────────────────────────────
-- Rename NDIS (Australian) to national_health_id, keep old column for back-compat.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS national_health_id text,
  ADD COLUMN IF NOT EXISTS gender             text,
  ADD COLUMN IF NOT EXISTS phone              text,
  ADD COLUMN IF NOT EXISTS metadata           jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active          boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at         timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz DEFAULT now();

-- Copy old ndis_number values into national_health_id if the old column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'ndis_number') THEN
    UPDATE public.patients
      SET national_health_id = ndis_number
      WHERE national_health_id IS NULL AND ndis_number IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_patients_org       ON public.patients(organization_id);
CREATE INDEX IF NOT EXISTS idx_patients_active    ON public.patients(is_active);
CREATE INDEX IF NOT EXISTS idx_patients_risk      ON public.patients(risk_level);


-- ─── 4. VISITS TABLE ──────────────────────────────────────────────────────
-- Add caregiver_id for assignment + scoped queries.

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS caregiver_id     uuid,
  ADD COLUMN IF NOT EXISTS check_in_lat     numeric(9,6),
  ADD COLUMN IF NOT EXISTS check_in_lng     numeric(9,6),
  ADD COLUMN IF NOT EXISTS created_at       timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz DEFAULT now();

-- Foreign key to profiles (caregivers are stored there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'visits_caregiver_id_fkey' AND table_name = 'visits'
  ) THEN
    ALTER TABLE public.visits
      ADD CONSTRAINT visits_caregiver_id_fkey
      FOREIGN KEY (caregiver_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visits_caregiver  ON public.visits(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient    ON public.visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_scheduled  ON public.visits(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_visits_status     ON public.visits(status);


-- ─── 5. ALERTS TABLE ──────────────────────────────────────────────────────
-- Add resolution tracking columns.

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS resolved_by       uuid,
  ADD COLUMN IF NOT EXISTS resolved_at       timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by   uuid,
  ADD COLUMN IF NOT EXISTS acknowledged_at   timestamptz,
  ADD COLUMN IF NOT EXISTS created_at        timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_alerts_status   ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_patient  ON public.alerts(patient_id);


-- ─── 6. ACTIVITY LOG TABLE ────────────────────────────────────────────────
-- Audit trail for admin actions. Used by /admin dashboard activity feed.

CREATE TABLE IF NOT EXISTS public.activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity      text,
  entity_id   text,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_org     ON public.activity_log(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.activity_log(created_at DESC);


-- ─── 7. PATIENT ASSIGNMENTS TABLE ─────────────────────────────────────────
-- Links family members to patients they can view.

CREATE TABLE IF NOT EXISTS public.patient_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  profile_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship   text DEFAULT 'family',
  created_at     timestamptz DEFAULT now(),
  UNIQUE(patient_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_pa_patient ON public.patient_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_pa_profile ON public.patient_assignments(profile_id);


-- ─── 8. DAILY UPDATES TABLE ───────────────────────────────────────────────
-- Caregiver's post-visit update visible to family.

CREATE TABLE IF NOT EXISTS public.daily_updates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  caregiver_id      uuid,
  visit_id          uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  content           text NOT NULL,
  mood_observation  text,
  medication_taken  boolean DEFAULT false,
  concerns          text[] DEFAULT '{}',
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_updates_patient ON public.daily_updates(patient_id);


-- ─── 9. BACKFILL: assign existing profiles to default org ─────────────────
-- For existing accounts created before org_id existed.

DO $$
DECLARE
  default_org_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Ensure default demo org exists
  INSERT INTO public.organizations (id, name, type, address, plan)
    VALUES (default_org_id, 'SevaCare India Pvt. Ltd.', 'home_care', 'New Delhi, India', 'trial')
    ON CONFLICT (id) DO NOTHING;

  -- Assign orphaned profiles to it
  UPDATE public.profiles
    SET org_id = default_org_id
    WHERE org_id IS NULL;
END $$;


-- ─── 10. REFRESH SCHEMA CACHE ────────────────────────────────────────────
-- Force PostgREST (the API layer Supabase uses) to pick up the new columns.
-- Without this, you might still get "column not found in schema cache" errors
-- for up to 60 seconds.
NOTIFY pgrst, 'reload schema';


-- ─── DONE ────────────────────────────────────────────────────────────────
-- You should now be able to:
--   ✓ Create caregivers from the admin portal
--   ✓ Onboard patients
--   ✓ Schedule visits with caregiver assignment
--   ✓ Resolve/acknowledge alerts
--   ✓ View activity log
--   ✓ See stats from real org-scoped data
-- ═══════════════════════════════════════════════════════════════════════════
