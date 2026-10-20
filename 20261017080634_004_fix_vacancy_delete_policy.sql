/*
# Fix: Add DELETE policy on vacancies for owners

## Problem
The vacancies table had no DELETE policy. Employers could not delete their own
draft/pending vacancies through the Supabase client, even though the UI (MyVacancies)
shows a delete button for draft/pending_payment/rejected statuses.

## Fix
Added a DELETE policy allowing employers to delete only their own vacancies
where status is 'draft', 'pending_payment', or 'rejected'.
Published vacancies (active/expired/suspended/removed) cannot be deleted by employers.
*/

CREATE POLICY "vacancies_owner_delete" ON vacancies FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = vacancies.company_id AND companies.user_id = auth.uid())
    AND vacancies.status IN ('draft', 'pending_payment', 'rejected')
  );
