/*
# Email Verification + Candidate Registration + CV Applications

## Purpose
Add email verification with OTP codes for both employer and candidate registration,
candidate accounts with personal profiles, and a CV upload system for applying to vacancies.

## New Tables
1. email_verification_codes — one-time verification codes (service role only)
2. candidates — candidate profiles linked to auth.users
3. vacancy_applications — CV applications with status tracking

## Security
- email_verification_codes: deny-all for anon/authenticated
- candidates: self-read/write + employer read (via applications) + admin read all
- vacancy_applications: self-read/insert + employer read/update + admin all
- Storage 'cvs': private bucket, candidate upload to own folder, employer read for their vacancies

## Functions
- verify_email_code: SECURITY DEFINER, verifies code hash, returns payload

## Notes
No existing tables modified. No existing data affected.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. email_verification_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('employer', 'candidate')),
  payload jsonb NOT NULL DEFAULT '{}',
  attempts int NOT NULL DEFAULT 0,
  resend_count int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ev_codes_email ON email_verification_codes (email);
CREATE INDEX IF NOT EXISTS idx_ev_codes_expires ON email_verification_codes (expires_at);

ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ev_codes_deny_all_select" ON email_verification_codes;
CREATE POLICY "ev_codes_deny_all_select" ON email_verification_codes
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "ev_codes_deny_all_insert" ON email_verification_codes;
CREATE POLICY "ev_codes_deny_all_insert" ON email_verification_codes
  FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "ev_codes_deny_all_update" ON email_verification_codes;
CREATE POLICY "ev_codes_deny_all_update" ON email_verification_codes
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

-- ============================================================
-- 2. vacancy_applications (created BEFORE candidates policies that reference it)
-- ============================================================
CREATE TABLE IF NOT EXISTS vacancy_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_file_path text NOT NULL,
  cover_letter text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'interview', 'rejected', 'hired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vacancy_applications_unique
  ON vacancy_applications (vacancy_id, candidate_id);

CREATE INDEX IF NOT EXISTS idx_applications_vacancy ON vacancy_applications (vacancy_id);
CREATE INDEX IF NOT EXISTS idx_applications_user ON vacancy_applications (user_id);

-- ============================================================
-- 3. candidates (created after vacancy_applications so FK works)
-- ============================================================
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  patronymic text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Now add the FK from vacancy_applications to candidates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vacancy_applications_candidate_id_fkey'
      AND table_name = 'vacancy_applications'
  ) THEN
    ALTER TABLE vacancy_applications
      ADD CONSTRAINT vacancy_applications_candidate_id_fkey
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidates_self_select" ON candidates;
CREATE POLICY "candidates_self_select" ON candidates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "candidates_self_insert" ON candidates;
CREATE POLICY "candidates_self_insert" ON candidates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "candidates_self_update" ON candidates;
CREATE POLICY "candidates_self_update" ON candidates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "candidates_employer_select" ON candidates;
CREATE POLICY "candidates_employer_select" ON candidates
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM vacancy_applications va
      JOIN vacancies v ON va.vacancy_id = v.id
      JOIN companies c ON v.company_id = c.id
      WHERE va.user_id = candidates.user_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "candidates_admin_select" ON candidates;
CREATE POLICY "candidates_admin_select" ON candidates
  FOR SELECT TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin');

-- ============================================================
-- 4. vacancy_applications RLS
-- ============================================================
ALTER TABLE vacancy_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_self_select" ON vacancy_applications;
CREATE POLICY "applications_self_select" ON vacancy_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "applications_self_insert" ON vacancy_applications;
CREATE POLICY "applications_self_insert" ON vacancy_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "applications_employer_select" ON vacancy_applications;
CREATE POLICY "applications_employer_select" ON vacancy_applications
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM vacancies v
      JOIN companies c ON v.company_id = c.id
      WHERE v.id = vacancy_applications.vacancy_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "applications_employer_update" ON vacancy_applications;
CREATE POLICY "applications_employer_update" ON vacancy_applications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vacancies v
      JOIN companies c ON v.company_id = c.id
      WHERE v.id = vacancy_applications.vacancy_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vacancies v
      JOIN companies c ON v.company_id = c.id
      WHERE v.id = vacancy_applications.vacancy_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "applications_admin_select" ON vacancy_applications;
CREATE POLICY "applications_admin_select" ON vacancy_applications
  FOR SELECT TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin');

DROP POLICY IF EXISTS "applications_admin_update" ON vacancy_applications;
CREATE POLICY "applications_admin_update" ON vacancy_applications
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'user_role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');

-- ============================================================
-- 5. SECURITY DEFINER: verify_email_code
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_email_code(
  p_email text,
  p_code text,
  p_purpose text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_record RECORD;
  v_hash text;
BEGIN
  SELECT * INTO v_record
  FROM email_verification_codes
  WHERE email = lower(trim(p_email))
    AND purpose = p_purpose
    AND used_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Təsdiq kodu tapılmadı. Yeni kod istəyin.');
  END IF;

  IF v_record.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Təsdiq kodunun müddəti bitib. Yeni kod istəyin.');
  END IF;

  IF v_record.attempts >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Çoxlu yanlış cəhd. Yeni kod istəyin.');
  END IF;

  v_hash = encode(digest(p_code, 'sha256'), 'hex');

  IF v_hash != v_record.code_hash THEN
    UPDATE email_verification_codes
    SET attempts = attempts + 1
    WHERE id = v_record.id;

    RETURN jsonb_build_object('success', false, 'error', 'Yanlış təsdiq kodu.');
  END IF;

  UPDATE email_verification_codes
  SET used_at = now(), attempts = v_record.attempts + 1
  WHERE id = v_record.id;

  RETURN jsonb_build_object('success', true, 'payload', v_record.payload);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.verify_email_code(text, text, text) TO authenticated, anon;

-- ============================================================
-- 6. Storage bucket for CVs (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "cvs_candidate_upload" ON storage.objects;
CREATE POLICY "cvs_candidate_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "cvs_candidate_read" ON storage.objects;
CREATE POLICY "cvs_candidate_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "cvs_employer_read" ON storage.objects;
CREATE POLICY "cvs_employer_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cvs'
    AND EXISTS (
      SELECT 1 FROM vacancy_applications va
      JOIN vacancies v ON va.vacancy_id = v.id
      JOIN companies c ON v.company_id = c.id
      WHERE c.user_id = auth.uid()
        AND va.cv_file_path = name
    )
  );

DROP POLICY IF EXISTS "cvs_admin_read" ON storage.objects;
CREATE POLICY "cvs_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cvs'
    AND auth.jwt() ->> 'user_role' = 'admin'
  );
