-- Add pseudonym and staff_role to profiles
CREATE TYPE public.staff_role AS ENUM ('dev', 'designer', 'marketing', 'support');

ALTER TABLE public.profiles
  ADD COLUMN pseudonym TEXT,
  ADD COLUMN staff_role public.staff_role;

-- Allow everyone authenticated to view pseudonym/avatar of staff (for chat display later)
-- Keep existing RLS as-is; pseudonym is just a column on profiles.