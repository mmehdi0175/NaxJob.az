/*
# Naxçıvan MR Bölgü Sistemi

## Purpose
Replace the general city list with Naxçıvan Muxtar Respublikası administrative regions
in the vacancy creation form. Add a free-text "Alt bölgə / Kənd / Ərazi" field.

## Changes

### 1. New cities (Naxçıvan MR regions)
Adds 8 new rows to the `cities` table for Naxçıvan MR administrative regions:
- Naxçıvan şəhəri
- Babək rayonu
- Culfa rayonu
- Ordubad rayonu
- Sədərək rayonu
- Şahbuz rayonu
- Şərur rayonu
- Kəngərli rayonu

Existing city rows are NOT deleted — existing vacancies keep their references.
The old "Naxçıvan" entry (slug: naxcivan) is kept for backward compatibility;
the new "Naxçıvan şəhəri" entry (slug: naxcivan-seheri) is the one used going forward.

### 2. New column: vacancies.subregion
- `subregion` text, nullable — stores free-text alt bölgə / kənd / ərazi name
- Example values: "Nehrəm kəndi", "Qızılca kəndi", "şəhər mərkəzi"
- Not mandatory; can be NULL

### 3. Updated function: publish_free_vacancy
Adds parameter `p_subregion text` and inserts it into the new column.

### 4. Index
Adds an index on `vacancies.subregion` to support search filtering.

## Security
No RLS policy changes. Existing policies remain intact.
The new column is accessible under the same policies as the rest of the vacancies table.

## Notes
1. Existing vacancies are unaffected — `subregion` defaults to NULL.
2. No existing data is deleted or modified.
3. The region list is managed in a single source (the `cities` table).
*/

-- Step 1: Add Naxçıvan MR regions to cities table
INSERT INTO cities (name_az, slug, sort_order) VALUES
  ('Naxçıvan şəhəri', 'naxcivan-seheri', 101),
  ('Babək rayonu', 'babek-rayonu', 102),
  ('Culfa rayonu', 'culfa-rayonu', 103),
  ('Ordubad rayonu', 'ordubad-rayonu', 104),
  ('Sədərək rayonu', 'sederek-rayonu', 105),
  ('Şahbuz rayonu', 'sahbuz-rayonu', 106),
  ('Şərur rayonu', 'serur-rayonu', 107),
  ('Kəngərli rayonu', 'kengerli-rayonu', 108)
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Add subregion column to vacancies
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS subregion text;

-- Step 3: Add index for subregion search
CREATE INDEX IF NOT EXISTS idx_vacancies_subregion ON vacancies (subregion) WHERE subregion IS NOT NULL;

-- Step 4: Recreate publish_free_vacancy with subregion support
CREATE OR REPLACE FUNCTION public.publish_free_vacancy(
  p_title text,
  p_description text,
  p_category_id uuid,
  p_city_id uuid,
  p_requirements text,
  p_responsibilities text,
  p_salary_min numeric,
  p_salary_max numeric,
  p_salary_visible boolean,
  p_employment_type text,
  p_experience_min integer,
  p_education text,
  p_contact_person text,
  p_contact_email text,
  p_contact_phone text,
  p_vacancy_type text,
  p_subregion text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_uid uuid := auth.uid();
  company_rec RECORD;
  settings_rec RECORD;
  quota_limit int;
  current_count int;
  lock_key bigint;
  new_vacancy_id uuid;
  now_ts timestamptz := now();
  expires_ts timestamptz;
  is_free boolean;
  initial_status text;
  duration_days int;
BEGIN
  -- Authenticate
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'İstifadəçi autentifikasiya olunmamışdır.';
  END IF;

  -- Only employers can create vacancies
  IF auth.jwt() ->> 'user_role' != 'employer' AND auth.jwt() ->> 'user_role' != 'admin' THEN
    RAISE EXCEPTION 'Yalnız işəgötürənlər vakansiya yarada bilər.';
  END IF;

  -- Get the caller's company
  SELECT * INTO company_rec FROM companies WHERE user_id = caller_uid LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Şirkət profili tapılmadı.';
  END IF;

  -- Get settings
  SELECT * INTO settings_rec FROM admin_settings LIMIT 1;
  IF NOT FOUND THEN
    settings_rec.standard_vacancy_price := 15;
    settings_rec.premium_vacancy_price := 20;
    settings_rec.vacancy_duration_days := 30;
    settings_rec.free_quota_per_month := 2;
  END IF;

  quota_limit := COALESCE(settings_rec.free_quota_per_month, 2);
  duration_days := COALESCE(settings_rec.vacancy_duration_days, 30);

  -- Determine if this can be a free vacancy
  is_free := (p_vacancy_type = 'standard');

  -- Acquire advisory lock for this company's quota
  lock_key := hashtextextended('free_quota_' || company_rec.id::text, 0);
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Check quota if free
  IF is_free THEN
    SELECT COUNT(*) INTO current_count
    FROM vacancies
    WHERE company_id = company_rec.id
      AND is_free_quota = true
      AND status = 'active'
      AND date_trunc('month', created_at) = date_trunc('month', now());

    IF current_count >= quota_limit THEN
      is_free := false;
    END IF;
  END IF;

  IF is_free THEN
    initial_status := 'active';
    expires_ts := now_ts + (duration_days || ' days')::interval;
  ELSE
    initial_status := 'pending_payment';
    expires_ts := NULL;
  END IF;

  -- Insert the vacancy
  INSERT INTO vacancies (
    company_id, category_id, city_id, title, description,
    requirements, responsibilities, salary_min, salary_max,
    salary_currency, salary_visible, employment_type, experience_min,
    education, contact_person, contact_email, contact_phone,
    vacancy_type, status, is_paid, is_free_quota,
    published_at, expires_at, subregion
  ) VALUES (
    company_rec.id, p_category_id, p_city_id, p_title, p_description,
    NULLIF(p_requirements, ''), NULLIF(p_responsibilities, ''),
    p_salary_min, p_salary_max,
    'AZN', p_salary_visible, p_employment_type, p_experience_min,
    NULLIF(p_education, ''), NULLIF(p_contact_person, ''),
    NULLIF(p_contact_email, ''), NULLIF(p_contact_phone, ''),
    p_vacancy_type, initial_status, is_free, is_free,
    CASE WHEN is_free THEN now_ts ELSE NULL END,
    expires_ts,
    NULLIF(p_subregion, '')
  )
  RETURNING id INTO new_vacancy_id;

  RETURN new_vacancy_id;
END;
$function$;
