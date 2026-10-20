/*
# Admin user provisioning function

## Overview
Creates a SECURITY DEFINER function that allows promoting an existing auth user
to admin role by setting `user_role: 'admin'` in `raw_app_meta_data`.

## Usage
After a user registers normally (as an employer), run:
SELECT promote_to_admin('user-email@example.com');

## Security
- SECURITY DEFINER so it can modify auth.users (which requires service role)
- Only callable with the service role key (not exposed to anon/authenticated)
- Does not create new users — only promotes existing ones
*/

CREATE OR REPLACE FUNCTION promote_to_admin(p_email text)
RETURNS boolean AS $$
DECLARE
  target_user uuid;
BEGIN
  SELECT id INTO target_user FROM auth.users WHERE email = p_email;
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_email;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"user_role": "admin"}'::jsonb
  WHERE id = target_user;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;