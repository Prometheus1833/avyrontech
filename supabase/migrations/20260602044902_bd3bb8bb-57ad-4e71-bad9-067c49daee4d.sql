-- Add new status values to project_status enum
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'started';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'refining';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'maintenance';

-- Sequence for project numbers starting at 10
CREATE SEQUENCE IF NOT EXISTS public.project_number_seq START WITH 10 INCREMENT BY 1;
GRANT USAGE, SELECT ON SEQUENCE public.project_number_seq TO authenticated, service_role;

-- Add new columns to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_number integer NOT NULL DEFAULT nextval('public.project_number_seq'),
  ADD COLUMN IF NOT EXISTS link1 text,
  ADD COLUMN IF NOT EXISTS link2 text,
  ADD COLUMN IF NOT EXISTS link3 text,
  ADD COLUMN IF NOT EXISTS client_first_name text,
  ADD COLUMN IF NOT EXISTS client_last_name text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_facebook text,
  ADD COLUMN IF NOT EXISTS client_instagram text,
  ADD COLUMN IF NOT EXISTS client_tiktok text,
  ADD COLUMN IF NOT EXISTS project_type text,
  ADD COLUMN IF NOT EXISTS estimated_duration text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS delivery_date date,
  ADD COLUMN IF NOT EXISTS integrations text,
  ADD COLUMN IF NOT EXISTS additional_costs_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_change_requests text,
  ADD COLUMN IF NOT EXISTS staff_members uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS linked_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS projects_project_number_key ON public.projects(project_number);

-- Project tasks table (checklist)
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  author_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
GRANT ALL ON public.project_tasks TO service_role;

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view project tasks" ON public.project_tasks
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.client_id = auth.uid()));

CREATE POLICY "Staff create project tasks" ON public.project_tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Staff update project tasks" ON public.project_tasks
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff or author delete project tasks" ON public.project_tasks
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow clients linked via linked_user_id to view their project
CREATE POLICY "Linked users view projects" ON public.projects
  FOR SELECT TO authenticated
  USING (auth.uid() = linked_user_id);