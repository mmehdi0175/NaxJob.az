/*
# Premium activation timestamp + premium-ordered vacancy RPC

## Purpose
Track when a vacancy's premium status was activated so we can sort
premium vacancies at the top of the list for 15 days, then let them
fall back to standard ordering. The premium boost window is separate
from the vacancy's overall active lifetime (expires_at).

## Changes
1. ADD COLUMN premium_activated_at timestamptz — set when payment is
   confirmed for a premium vacancy. Nullable since standard vacancies
   never get premium status.
2. Backfill: for existing premium vacancies that have published_at but
   no premium_activated_at, set premium_activated_at = published_at.
3. Create RPC get_ordered_vacancies(p_limit int, p_offset int) that
   returns active vacancies sorted with premium-first logic:
   - Premium vacancies within 15 days of premium_activated_at come first
     (ordered by premium_activated_at DESC).
   - Then all other active vacancies ordered by published_at DESC.
   - Only status='active' and not expired vacancies are included.
4. Create RPC get_ordered_vacancies_by_category(p_category_id uuid,
   p_limit int) for category-filtered premium-ordered listing.

## Notes
- Only ADD COLUMN — no existing columns modified or removed.
- No data loss: backfill uses existing published_at values.
- Premium payment/activation mechanism unchanged — the edge function
  just additionally sets premium_activated_at.
*/

ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS premium_activated_at timestamptz;

-- Backfill existing premium vacancies
UPDATE vacancies
SET premium_activated_at = published_at
WHERE vacancy_type = 'premium'
  AND premium_activated_at IS NULL
  AND published_at IS NULL;

-- Only set when published_at is not null (safe guard)
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
    -- Premium boost: premium vacancies activated within last 15 days come first
    CASE
      WHEN v.vacancy_type = 'premium'
           AND v.premium_activated_at IS NOT NULL
           AND v.premium_activated_at > now() - interval '15 days'
      THEN 0
      ELSE 1
    END ASC,
    -- Within the premium-boosted group, newest first
    CASE
      WHEN v.vacancy_type = 'premium'
           AND v.premium_activated_at IS NOT NULL
           AND v.premium_activated_at > now() - interval '15 days'
      THEN v.premium_activated_at
      ELSE NULL
    END DESC NULLS LAST,
    -- All others by published_at DESC
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
