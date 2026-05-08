-- ─────────────────────────────────────────────────────────────────────────
-- Caregiver verification system: store AI-extracted ID + degree data
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'))
    DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by         UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS aadhaar_number      TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_doc_url     TEXT,
  ADD COLUMN IF NOT EXISTS degree_doc_url      TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth       DATE,
  ADD COLUMN IF NOT EXISTS gender              TEXT,
  ADD COLUMN IF NOT EXISTS address             TEXT,
  ADD COLUMN IF NOT EXISTS qualification       TEXT,
  ADD COLUMN IF NOT EXISTS institution         TEXT,
  ADD COLUMN IF NOT EXISTS year_of_passing     INT,
  ADD COLUMN IF NOT EXISTS verification_data   JSONB; -- raw AI extraction

-- Mask Aadhaar to last-4 in any text projection (helper view)
CREATE OR REPLACE VIEW caregiver_verification_summary AS
SELECT
  id,
  full_name,
  email,
  verification_status,
  verified_at,
  CASE WHEN aadhaar_number IS NOT NULL
       THEN 'XXXX XXXX ' || RIGHT(aadhaar_number, 4)
       ELSE NULL END AS aadhaar_masked,
  date_of_birth,
  gender,
  qualification,
  institution,
  year_of_passing
FROM profiles
WHERE role = 'caregiver';

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';
