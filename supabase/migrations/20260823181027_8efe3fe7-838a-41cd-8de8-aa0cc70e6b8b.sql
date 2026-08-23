CREATE OR REPLACE FUNCTION public.prevent_staff_role_self_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.staff_role := NULL;
  ELSIF TG_OP = 'UPDATE' AND NEW.staff_role IS DISTINCT FROM OLD.staff_role THEN
    NEW.staff_role := OLD.staff_role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_staff_role_self_assignment ON public.profiles;
CREATE TRIGGER profiles_prevent_staff_role_self_assignment
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_staff_role_self_assignment();

REVOKE UPDATE (staff_role) ON public.profiles FROM authenticated, anon;