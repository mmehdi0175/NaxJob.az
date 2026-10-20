/*
# Fix: log_vacancy_status_change trigger handles cron/system context

## Problem
When expire_old_vacancies() runs via pg_cron, there is no JWT context.
auth.uid() returns NULL and auth.jwt() returns NULL. The trigger's CASE
expression falls through to ELSE 'employer', which is misleading in the
audit log — it looks like an employer changed the status when it was
actually the system.

## Fix
Update the trigger function to detect when auth.uid() is NULL (system/cron
context) and set changed_by_role to 'system' instead of 'employer'.
*/

CREATE OR REPLACE FUNCTION log_vacancy_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO vacancy_status_history (vacancy_id, old_status, new_status, changed_by, changed_by_role, note)
    VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid(),
      CASE
        WHEN auth.uid() IS NULL THEN 'system'
        WHEN auth.jwt() ->> 'user_role' = 'admin' THEN 'admin'
        ELSE 'employer'
      END,
      COALESCE(NEW.admin_note, 'Status dəyişikliyi')
    );
  END IF;
  RETURN NEW;
END;
$$;
