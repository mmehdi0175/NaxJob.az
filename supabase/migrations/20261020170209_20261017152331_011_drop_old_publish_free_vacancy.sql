/*
# Drop old publish_free_vacancy overload

The CREATE OR REPLACE in migration 009 created a new function overload
with the p_subregion parameter, but did not drop the old 16-arg version.
This drops the old one so Supabase RPC calls resolve to the new function.
*/

DROP FUNCTION IF EXISTS public.publish_free_vacancy(
  text, text, uuid, uuid, text, text, numeric, numeric, boolean,
  text, integer, text, text, text, text, text
);