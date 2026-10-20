/*
# CV fields for candidates + CV storage bucket

## Purpose
Add CV-related fields to the candidates table so candidates can create
a structured CV profile and upload a PDF CV file that employers can search.

## Changes to candidates table (ADD COLUMN only — no data loss)
- profession text — desired job title / profession (nullable)
- experience_years int — years of experience (nullable)
- city_id uuid — preferred location, FK to cities (nullable)
- cv_file_path text — storage path in 'cvs' bucket (nullable)
- cv_visible boolean — whether CV is visible to employers (default true)
- bio text — short professional summary (nullable)
- skills text — comma-separated skills (nullable)

## RLS Updates
- Add a SELECT policy allowing authenticated employers to view candidates
  whose cv_visible is true (public CV listing for the CV-lər page).

## Storage
- Reuse existing 'cvs' bucket (created in migration 012).
- Add policies for candidates to DELETE/UPDATE their own CV files.
*/

-- Add CV fields to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS profession text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS experience_years int;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES cities(id) ON DELETE SET NULL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_file_path text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_visible boolean NOT NULL DEFAULT true;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skills text;

-- Add a SELECT policy: employers can view candidates with public CVs
DROP POLICY IF EXISTS "candidates_employer_cv_browse" ON candidates;
CREATE POLICY "candidates_employer_cv_browse" ON candidates
  FOR SELECT TO authenticated USING (
    cv_visible = true
    AND EXISTS (
      SELECT 1 FROM companies c WHERE c.user_id = auth.uid()
    )
  );

-- Storage policies for CV files (candidate can delete/replace own files)
DROP POLICY IF EXISTS "cvs_candidate_delete" ON storage.objects;
CREATE POLICY "cvs_candidate_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "cvs_candidate_update" ON storage.objects;
CREATE POLICY "cvs_candidate_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );