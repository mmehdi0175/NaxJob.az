/*
# Fix verify_email_code: pgcrypto digest() not on search_path

## Root cause
verify_email_code has `SET search_path TO 'public'`, so pgcrypto's
digest() in the `extensions` schema is not visible. Postgres could
not resolve digest() and raised:
  ERROR: function digest(text, unknown) does not exist

## Fix
Call pgcrypto functions with their fully-qualified schema:
extensions.digest(...).
*/

CREATE OR REPLACE FUNCTION public.verify_email_code(p_email text, p_code text, p_purpose text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_record RECORD;
v_hash text;
BEGIN
SELECT * INTO v_record
FROM email_verification_codes
WHERE email = lower(trim(p_email))
AND purpose = p_purpose
AND used_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

IF NOT FOUND THEN
RETURN jsonb_build_object('success', false, 'error', 'Təsdiq kodu tapılmadı. Yeni kod istəyin.');
END IF;

IF v_record.expires_at < now() THEN
RETURN jsonb_build_object('success', false, 'error', 'Təsdiq kodunun müddəti bitib. Yeni kod istəyin.');
END IF;

IF v_record.attempts >= 5 THEN
RETURN jsonb_build_object('success', false, 'error', 'Çoxlu yanlış cəhd. Yeni kod istəyin.');
END IF;

-- pgcrypto lives in the extensions schema, which is NOT on the
-- function's search_path. Qualify the call explicitly.
v_hash = encode(extensions.digest(p_code, 'sha256'), 'hex');

IF v_hash != v_record.code_hash THEN
UPDATE email_verification_codes
SET attempts = attempts + 1
WHERE id = v_record.id;

RETURN jsonb_build_object('success', false, 'error', 'Yanlış təsdiq kodu.');
END IF;

UPDATE email_verification_codes
SET used_at = now(), attempts = v_record.attempts + 1
WHERE id = v_record.id;

RETURN jsonb_build_object('success', true, 'payload', v_record.payload);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.verify_email_code(text, text, text) TO authenticated, anon;