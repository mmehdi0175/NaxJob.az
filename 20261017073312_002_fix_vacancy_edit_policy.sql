/*
# Fix: Prevent employers from editing published vacancies

## Problem
The RLS policy `vacancies_owner_update` allowed employers to update ANY owned vacancy
regardless of status. This violated the business rule that published vacancies must
not be directly editable by employers.

## Fix
Updated the UPDATE policy to only allow editing when the vacancy status is
'draft', 'pending_payment', or 'rejected' — i.e., not yet published or rejected by admin.
Once a vacancy is 'active', 'expired', 'suspended', or 'removed', the employer cannot
modify it and must use the edit-request workflow.

## Security
- No new tables or columns
- Only the UPDATE policy on `vacancies` is changed
*/

-- Drop the old permissive update policy
DROP POLICY IF EXISTS "vacancies_owner_update" ON vacancies;

-- Create a restrictive update policy: only allow updates on non-published vacancies
CREATE POLICY "vacancies_owner_update" ON vacancies FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = vacancies.company_id AND companies.user_id = auth.uid())
    AND vacancies.status IN ('draft', 'pending_payment', 'rejected')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = vacancies.company_id AND companies.user_id = auth.uid())
    AND vacancies.status IN ('draft', 'pending_payment', 'rejected')
  );
