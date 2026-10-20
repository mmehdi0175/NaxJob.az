/*
# Fix: Schedule automatic vacancy expiry via pg_cron

## Problem
The `expire_old_vacancies()` function exists but is never called automatically.
Active vacancies with expires_at in the past remain 'active' indefinitely.

## Fix
Schedule pg_cron to run `expire_old_vacancies()` every hour, which updates
status to 'expired' for all active vacancies past their expiry date.
*/

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly expiry check
SELECT cron.schedule(
  'expire-old-vacancies-hourly',
  '0 * * * *',
  $$SELECT expire_old_vacancies();$$
);