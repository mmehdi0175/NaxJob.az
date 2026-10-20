/*
# Server-side free quota enforcement

## Rule
Each employer can publish no more than `free_quota_per_month` (currently 2) free
vacancies per calendar month. The limit is enforced atomically at the database level.

## What counts toward the limit
Only vacancies where ALL of these are true:
  - is_free_quota = true
  - status = 'active' (currently published)
  - created_at falls within the current calendar month

Rejected, deleted (removed), expired, draft, pending_payment, and suspended
vacancies do NOT count toward the free limit. This means:
  - If a free vacancy is rejected by admin, it frees up the quota slot.
  - If a free vacancy is deleted by the employer, it frees up the quota slot.
  - Expired free vacancies DO count (they consumed their 30-day slot).
  - Suspended free vacancies DO count (admin suspended but the slot was used).

## Enforcement mechanism
1. BEFORE INSERT trigger on vacancies: rejects inserts where is_free_quota = true
   AND status = 'active' if the employer has already used their monthly quota.
2. SECURITY DEFINER function publish_free_vacancy: atomically checks quota and
   inserts — used by the frontend to prevent race conditions.

## Concurrency safety
The trigger uses an advisory lock scoped to the company_id to serialize
quota checks for the same employer. Two concurrent inserts for the same
company will be serialized, preventing double-spending of the quota.
*/

-- ============================================================
-- 1. Update the quota counting function to match the rule
-- ============================================================
CREATE OR REPLACE FUNCTION get_employer_monthly_vacancy_count(p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_count int;
BEGIN
  SELECT COUNT(*) INTO month_count
  FROM vacancies
  WHERE company_id = p_company_id
    AND is_free_quota = true
    AND status = 'active'
    AND date_trunc('month', created_at) = date_trunc('month', now());
  RETURN month_count;
END;
$$;

-- ============================================================
-- 2. Create the BEFORE INSERT trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_free_quota_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quota_limit int;
  current_count int;
  company_user_id uuid;
  lock_key bigint;
BEGIN
  -- Only applies to free quota vacancies being published directly
  IF NEW.is_free_quota = true AND NEW.status = 'active' THEN
    -- Get the quota limit from settings
    SELECT free_quota_per_month INTO quota_limit FROM admin_settings LIMIT 1;
    IF quota_limit IS NULL THEN
      quota_limit := 2;
    END IF;

    -- Acquire a transaction-scoped advisory lock keyed to the company
    -- This serializes concurrent free-quota inserts for the same company
    lock_key := hashtextextended('free_quota_' || NEW.company_id::text, 0);
    PERFORM pg_advisory_xact_lock(lock_key);

    -- Count current month's active free vacancies for this company
    SELECT COUNT(*) INTO current_count
    FROM vacancies
    WHERE company_id = NEW.company_id
      AND is_free_quota = true
      AND status = 'active'
      AND date_trunc('month', created_at) = date_trunc('month', now());

    IF current_count >= quota_limit THEN
      RAISE EXCEPTION 'Pulsuz elan kvotası bu ay üçün dolmuşdur (limit: %).', quota_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, create new one
DROP TRIGGER IF EXISTS trigger_enforce_free_quota ON vacancies;
CREATE TRIGGER trigger_enforce_free_quota
  BEFORE INSERT ON vacancies
  FOR EACH ROW
  EXECUTE FUNCTION enforce_free_quota_limit();

-- ============================================================
-- 3. Create atomic publish_free_vacancy RPC
-- ============================================================
CREATE OR REPLACE FUNCTION publish_free_vacancy(
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
  p_vacancy_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Only standard vacancies can use the free quota
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
      -- Quota exhausted: create as pending_payment instead
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
    published_at, expires_at
  ) VALUES (
    company_rec.id, p_category_id, p_city_id, p_title, p_description,
    NULLIF(p_requirements, ''), NULLIF(p_responsibilities, ''),
    p_salary_min, p_salary_max,
    'AZN', p_salary_visible, p_employment_type, p_experience_min,
    NULLIF(p_education, ''), NULLIF(p_contact_person, ''),
    NULLIF(p_contact_email, ''), NULLIF(p_contact_phone, ''),
    p_vacancy_type, initial_status, is_free, is_free,
    CASE WHEN is_free THEN now_ts ELSE NULL END,
    expires_ts
  )
  RETURNING id INTO new_vacancy_id;

  RETURN new_vacancy_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION publish_free_vacancy TO authenticated;
GRANT EXECUTE ON FUNCTION get_employer_monthly_vacancy_count TO authenticated;
