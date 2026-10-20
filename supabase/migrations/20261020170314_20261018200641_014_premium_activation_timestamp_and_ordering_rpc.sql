/*
# Premium activation timestamp + premium-ordered vacancy RPC

## Purpose
Track when a vacancy's premium status was activated so we can sort
premium vacancies at the top of the list for 15 days, then let them
fall back to standard ordering.

## Changes
1. ADD COLUMN premium_activated_at timestamptz
2. Backfill existing premium vacancies
3. Create RPC get_ordered_vacancies(p_limit int, p_offset int)
4. Create RPC get_ordered_vacancies_by_category(p_category_id uuid, p_limit int)
5. Create RPC get_ordered_vacancies_by_company(p_company_id uuid, p_limit int)
*/

ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS premium_activated_at timestamptz;

-- Backfill existing premium vacancies
UPDATE vacancies
SET premium_activated_at = published_at
WHERE vacancy_type = 'premium'
  AND premium_activated_at IS NULL
  AND published_at IS NULL;

UPDATE vacancies
SET premium_activated_at = published_at
WHERE vacancy_type = 'premium'
  AND premium_activated_at IS NULL
  AND published_at IS NOT NULL;

-- RPC: get active vacancies with premium-first ordering (15-day window)
CREATE OR REPLACE FUNCTION get_ordered_vacancies(p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS SETOF vacancies
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM vacancies v
  WHERE v.status = 'active'
    AND v.expires_at IS NOT NULL
    AND v.expires_at > now()
  ORDER BY
    CASE
      WHEN v.vacancy_type = 'premium'
           AND v.premium_activated_at IS NOT NULL
           AND v.premium_activated_at > now() - interval '15 days'
      THEN 0
      ELSE 1
    END ASC,
    CASE
      WHEN v.vacancy_type = 'premium'
           AND v.premium_activated_at IS NOT NULL
           AND v.premium_activated_at > now() - interval '15 days'
      THEN v.premium_activated_at
      ELSE NULL
    END DESC NULLS LAST,
    v.published_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- RPC: category-filtered premium-ordered vacancies
CREATE OR REPLACE FUNCTION get_ordered_vacancies_by_category(p_category_id uuid, p_limit int DEFAULT 20)
RETURNS SETOF vacancies
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM vacancies v
  WHERE v.status = 'active'
    AND v.expires_at IS NOT NULL
    AND v.expires_at > now()
    AND v.category_id = p_category_id
  ORDER BY
    CASE
      WHEN v.vacancy_type = 'premium'
           AND v.premium_activated_at IS NOT NULL
           AND v.premium_activated_at > now() - interval '15 days'
      THEN 0
      ELSE 1
    END ASC,
    CASE
      WHEN v.vacancy_type = 'premium'
           AND v.premium_activated_at IS NOT NULL
           AND v.premium_activated_at > now() - interval '15 days'
      THEN v.premium_activated_at
      ELSE NULL
    END DESC NULLS LAST,
    v.published_at DESC NULLS LAST
  LIMIT p_limit;
$$;

-- RPC: company-filtered premium-ordered vacancies
CREATE OR REPLACE FUNCTION get_ordered_vacancies_by_company(p_company_id uuid, p_limit int DEFAULT 20)
RETURNS SETOF vacancies
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM vacancies v
  WHERE v.status = 'active'
    AND v.expires_at IS NOT NULL
    AND v.expires_at > now()
    AND v.company_id = p_company_id
  ORDER BY
    CASE
      WHEN v.vacancy_type = 'premium'
           AND v.premium_activated_at IS NOT NULL
           AND v.premium_activated_at > now() - interval '15 days'
      THEN 0
      ELSE 1
    END ASC,
    CASE
      WHEN v.vacancy_type = 'premium'
           AND v.premium_activated_at IS NOT NULL
           AND v.premium_activated_at > now() - interval '15 days'
      THEN v.premium_activated_at
      ELSE NULL
    END DESC NULLS LAST,
    v.published_at DESC NULLS LAST
  LIMIT p_limit;
$$;

-- Grant execute to authenticated and anon
GRANT EXECUTE ON FUNCTION get_ordered_vacancies(int, int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_ordered_vacancies_by_category(uuid, int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_ordered_vacancies_by_company(uuid, int) TO authenticated, anon;