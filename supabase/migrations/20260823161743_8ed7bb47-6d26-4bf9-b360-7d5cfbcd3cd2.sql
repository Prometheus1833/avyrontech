REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;

GRANT UPDATE (
  display_name, avatar_url, phone, address, entity_type, company_name, cui,
  social_facebook, social_instagram, social_tiktok, website, language, theme, pseudonym
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_staff_role_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_role IS DISTINCT FROM OLD.staff_role
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change staff_role';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_staff_role_self_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_prevent_staff_role_self_update ON public.profiles;
CREATE TRIGGER profiles_prevent_staff_role_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_staff_role_self_update();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
