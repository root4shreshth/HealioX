-- ═══════════════════════════════════════════════════════════════════════════
-- AayuCare — Ratings, caregiver profiles, reports
-- Safe to run multiple times (all statements use IF NOT EXISTS guards).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. CAREGIVER RATINGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.caregiver_ratings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id   uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  visit_id     uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  stars        int  NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment      text,
  org_id       uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(family_id, caregiver_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_caregiver ON public.caregiver_ratings(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_ratings_family    ON public.caregiver_ratings(family_id);
CREATE INDEX IF NOT EXISTS idx_ratings_patient   ON public.caregiver_ratings(patient_id);
CREATE INDEX IF NOT EXISTS idx_ratings_org       ON public.caregiver_ratings(org_id);


-- ── 2. CAREGIVER PROFILE EXTENSIONS ─────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio               text,
  ADD COLUMN IF NOT EXISTS experience_years  int,
  ADD COLUMN IF NOT EXISTS specializations   text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages         text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications    text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avatar_url        text,
  ADD COLUMN IF NOT EXISTS hire_date         date,
  -- WhatsApp opt-in for family contact
  ADD COLUMN IF NOT EXISTS whatsapp_number   text,
  ADD COLUMN IF NOT EXISTS whatsapp_verified boolean DEFAULT false;


-- ── 3. PATIENT ASSIGNMENTS EXTENSION ───────────────────────────────────
-- Tag caregiver-type assignments explicitly, track who assigned them
ALTER TABLE public.patient_assignments
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_primary  boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes       text;


-- ── 4. NOTIFICATIONS LOG ────────────────────────────────────────────────
-- Audit trail of every WhatsApp / email / SMS we send (success or failure)
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel     text NOT NULL,           -- 'whatsapp' | 'sms' | 'email'
  to_address  text NOT NULL,           -- phone or email
  template    text,                    -- e.g. 'visit_completed', 'sos', 'rating_request'
  payload     jsonb DEFAULT '{}'::jsonb,
  status      text DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed'
  provider_id text,                    -- Twilio SID etc.
  error       text,
  patient_id  uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  visit_id    uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_org     ON public.notifications_log(org_id);
CREATE INDEX IF NOT EXISTS idx_notif_status  ON public.notifications_log(status);
CREATE INDEX IF NOT EXISTS idx_notif_created ON public.notifications_log(created_at DESC);


-- ── 5. REFRESH SCHEMA CACHE ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
