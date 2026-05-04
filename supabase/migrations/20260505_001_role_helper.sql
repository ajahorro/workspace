-- ==========================================
-- SAFE ROLE HELPER: get_my_role()
-- Locked search_path, COALESCE for null safety
-- ==========================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role::text, 'UNKNOWN') FROM profiles WHERE id = auth.uid();
$$;
