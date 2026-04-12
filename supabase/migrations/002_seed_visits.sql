-- Seed demo visits for today
-- We need a caregiver profile first. This creates a placeholder one.
-- When a real user signs up as caregiver, their visits will show.

-- Create a demo caregiver user in auth (if not exists)
-- NOTE: For the hackathon demo, visits will show using demo data fallback
-- until a real caregiver signs up and gets assigned visits.

-- Insert demo visits for today using the first patient IDs
-- The caregiver_id will be set to a placeholder UUID that gets replaced
-- when a real caregiver logs in.

DO $$
DECLARE
  demo_caregiver_id UUID := '00000000-0000-0000-0000-000000000099';
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Only seed if no visits exist for today
  IF NOT EXISTS (SELECT 1 FROM visits WHERE scheduled_start::date = today_date) THEN

    -- Insert placeholder caregiver profile if not exists
    INSERT INTO profiles (id, role, full_name, email, organization_id)
    VALUES (demo_caregiver_id, 'caregiver', 'Sarah Johnson', 'caregiver@healiox.demo', '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (id) DO NOTHING;

    -- Visit 1: Margaret Sullivan (completed)
    INSERT INTO visits (patient_id, caregiver_id, organization_id, scheduled_start, scheduled_end, status, check_in_time, check_out_time, gps_verified, duration_minutes, services, caregiver_notes)
    VALUES (
      '00000000-0000-0000-0000-000000000101',
      demo_caregiver_id,
      '00000000-0000-0000-0000-000000000001',
      today_date + TIME '09:00',
      today_date + TIME '10:00',
      'completed',
      today_date + TIME '09:02',
      today_date + TIME '09:47',
      true,
      45,
      ARRAY['Personal Care', 'Medication Assistance'],
      'Margaret was in good spirits. Assisted with shower and morning medication.'
    );

    -- Visit 2: John Davis (scheduled)
    INSERT INTO visits (patient_id, caregiver_id, organization_id, scheduled_start, scheduled_end, status)
    VALUES (
      '00000000-0000-0000-0000-000000000102',
      demo_caregiver_id,
      '00000000-0000-0000-0000-000000000001',
      today_date + TIME '10:30',
      today_date + TIME '11:30',
      'scheduled'
    );

    -- Visit 3: Alice Wong (scheduled)
    INSERT INTO visits (patient_id, caregiver_id, organization_id, scheduled_start, scheduled_end, status)
    VALUES (
      '00000000-0000-0000-0000-000000000103',
      demo_caregiver_id,
      '00000000-0000-0000-0000-000000000001',
      today_date + TIME '13:00',
      today_date + TIME '14:00',
      'scheduled'
    );

    -- Visit 4: Robert Chen (scheduled)
    INSERT INTO visits (patient_id, caregiver_id, organization_id, scheduled_start, scheduled_end, status)
    VALUES (
      '00000000-0000-0000-0000-000000000104',
      demo_caregiver_id,
      '00000000-0000-0000-0000-000000000001',
      today_date + TIME '15:00',
      today_date + TIME '15:45',
      'scheduled'
    );

    RAISE NOTICE 'Demo visits seeded for today';
  ELSE
    RAISE NOTICE 'Visits already exist for today, skipping seed';
  END IF;
END $$;
