/*
# Structured CV data table + candidate photos storage bucket

## Purpose
Stores one structured CV per row for candidates, supporting the 6-step
CV creation wizard (vəzifə, şəxsi məlumatlar, təhsil, iş təcrübəsi,
öünüzlə haqqında, əlaqə). Each candidate can own multiple CVs.

## New Tables
- `candidate_cv_data`
  - `id` uuid PK
  - `user_id` uuid NOT NULL, FK -> auth.users(id) ON DELETE CASCADE, DEFAULT auth.uid()
  - `title` text NOT NULL — user-given CV name (default "CV")
  - Step 1 — Vəzifə
    - `profession` text (peşə/vəzifə)
    - `min_salary` numeric (gözlənilən minimum maaş, AZN)
    - `specialty` text (ixtisas)
  - Step 2 — Şəxsi məlumatlar
    - `first_name` text
    - `last_name` text
    - `patronymic` text
    - `birth_date` date (doğum tarixi)
    - `gender` text ('male' | 'female')
    - `city_id` uuid FK -> cities(id) ON DELETE SET NULL
    - `photo_path` text (storage path in 'candidate-photos' bucket)
  - Step 3 — Təhsil
    - `education_level` text ('none'|'secondary'|'secondary_special'|'secondary_technical'|'incomplete_higher'|'higher'|'scientific_degree')
    - `education_details` text
  - Step 4 — İş təcrübəsi
    - `experience_duration` text ('none'|'under_1'|'1_to_3'|'3_to_5'|'over_5')
    - `experience_details` text
  - Step 5 — Özünüz haqqında
    - `about` text (haqqımda)
    - `skills` text (bacarıqlar)
  - Step 6 — Əlaqə
    - `phone` text
    - `email` text
  - `is_active` boolean DEFAULT true
  - `created_at` timestamptz DEFAULT now()
  - `updated_at` timestamptz DEFAULT now()

## Security
- RLS enabled on candidate_cv_data.
- 4 separate CRUD policies scoped TO authenticated with auth.uid() = user_id:
  - select_own_cv / insert_own_cv / update_own_cv / delete_own_cv
- Admin role can SELECT via jwt user_role = 'admin'.

## Storage
- New private bucket `candidate-photos` for candidate profile photos.
- Policies:
  - upload/read/update/delete own photo (folder = auth.uid()).
  - employer + admin read of any photo (so employer-facing CV views work).
*/

CREATE TABLE IF NOT EXISTS candidate_cv_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'CV',
  profession text,
  min_salary numeric(12,2),
  specialty text,
  first_name text,
  last_name text,
  patronymic text,
  birth_date date,
  gender text CHECK (gender IN ('male', 'female')),
  city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  photo_path text,
  education_level text CHECK (education_level IN (
    'none', 'secondary', 'secondary_special', 'secondary_technical',
    'incomplete_higher', 'higher', 'scientific_degree'
  )),
  education_details text,
  experience_duration text CHECK (experience_duration IN (
    'none', 'under_1', '1_to_3', '3_to_5', 'over_5'
  )),
  experience_details text,
  about text,
  skills text,
  phone text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_cv_data_user_id
  ON candidate_cv_data(user_id);

ALTER TABLE candidate_cv_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cv" ON candidate_cv_data;
CREATE POLICY "select_own_cv" ON candidate_cv_data
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cv" ON candidate_cv_data;
CREATE POLICY "insert_own_cv" ON candidate_cv_data
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cv" ON candidate_cv_data;
CREATE POLICY "update_own_cv" ON candidate_cv_data
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cv" ON candidate_cv_data;
CREATE POLICY "delete_own_cv" ON candidate_cv_data
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admin can read all CVs (for moderation)
DROP POLICY IF EXISTS "admin_select_cv" ON candidate_cv_data;
CREATE POLICY "admin_select_cv" ON candidate_cv_data
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'user_role'::text) = 'admin'::text);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_candidate_cv_data_updated_at ON candidate_cv_data;
CREATE OR REPLACE FUNCTION set_candidate_cv_data_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidate_cv_data_updated_at
  BEFORE UPDATE ON candidate_cv_data
  FOR EACH ROW
  EXECUTE FUNCTION set_candidate_cv_data_updated_at();

-- Storage bucket for candidate photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-photos', 'candidate-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Candidate: manage own photos
DROP POLICY IF EXISTS "candidate_photos_upload" ON storage.objects;
CREATE POLICY "candidate_photos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "candidate_photos_read_own" ON storage.objects;
CREATE POLICY "candidate_photos_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'candidate-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "candidate_photos_update" ON storage.objects;
CREATE POLICY "candidate_photos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'candidate-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'candidate-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "candidate_photos_delete" ON storage.objects;
CREATE POLICY "candidate_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'candidate-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Employer + admin can read candidate photos (for CV browsing)
DROP POLICY IF EXISTS "candidate_photos_employer_read" ON storage.objects;
CREATE POLICY "candidate_photos_employer_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'candidate-photos'
    AND (
      (auth.jwt() ->> 'user_role'::text) = 'admin'::text
      OR EXISTS (SELECT 1 FROM companies c WHERE c.user_id = auth.uid())
    )
  );
