-- ENUMS
CREATE TYPE public.project_status AS ENUM ('todo','in_progress','review','blocked','done','cancelled');
CREATE TYPE public.project_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE public.maintenance_status AS ENUM ('healthy','needs_attention','in_progress','offline','paused');

-- PROJECTS
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  requirements text,
  client_id uuid,
  subscription_id uuid,
  owner_id uuid NOT NULL,
  assignee_id uuid,
  status public.project_status NOT NULL DEFAULT 'todo',
  priority public.project_priority NOT NULL DEFAULT 'medium',
  deadline timestamptz,
  budget_cents integer DEFAULT 0,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view all projects" ON public.projects FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin'));
CREATE POLICY "Staff create projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = owner_id) AND (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin')));
CREATE POLICY "Staff update projects" ON public.projects FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete projects" ON public.projects FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- PROJECT NOTES
CREATE TABLE public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view project notes" ON public.project_notes FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin'));
CREATE POLICY "Staff create project notes" ON public.project_notes FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = author_id) AND (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin')));
CREATE POLICY "Authors or admins delete project notes" ON public.project_notes FOR DELETE TO authenticated
  USING ((auth.uid() = author_id) OR has_role(auth.uid(),'admin'));

-- MAINTENANCE SITES
CREATE TABLE public.maintenance_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  site_name text NOT NULL,
  site_url text NOT NULL,
  status public.maintenance_status NOT NULL DEFAULT 'healthy',
  notes text,
  last_check_at timestamptz,
  next_check_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view maintenance sites" ON public.maintenance_sites FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin'));
CREATE POLICY "Staff create maintenance sites" ON public.maintenance_sites FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin'));
CREATE POLICY "Staff update maintenance sites" ON public.maintenance_sites FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete maintenance sites" ON public.maintenance_sites FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER maintenance_sites_set_updated_at BEFORE UPDATE ON public.maintenance_sites
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- MAINTENANCE LOGS
CREATE TABLE public.maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.maintenance_sites(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view maintenance logs" ON public.maintenance_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin'));
CREATE POLICY "Staff create maintenance logs" ON public.maintenance_logs FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = author_id) AND (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin')));

-- STAFF CHAT (realtime)
CREATE TABLE public.staff_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view chat" ON public.staff_chat_messages FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin'));
CREATE POLICY "Staff post chat" ON public.staff_chat_messages FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = author_id) AND (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin')));
CREATE POLICY "Authors or admins delete chat" ON public.staff_chat_messages FOR DELETE TO authenticated
  USING ((auth.uid() = author_id) OR has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_chat_messages;
ALTER TABLE public.staff_chat_messages REPLICA IDENTITY FULL;

-- STORAGE BUCKET pentru resurse staff
INSERT INTO storage.buckets (id, name, public) VALUES ('staff-resources','staff-resources', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff list resources" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'staff-resources' AND (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin')));
CREATE POLICY "Staff upload resources" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'staff-resources' AND (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin')));
CREATE POLICY "Staff update resources" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'staff-resources' AND (has_role(auth.uid(),'staff') OR has_role(auth.uid(),'admin')));
CREATE POLICY "Admins delete resources" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'staff-resources' AND has_role(auth.uid(),'admin'));

-- INDEX
CREATE INDEX idx_projects_assignee ON public.projects(assignee_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_project_notes_project ON public.project_notes(project_id);
CREATE INDEX idx_maintenance_logs_site ON public.maintenance_logs(site_id);
CREATE INDEX idx_staff_chat_created ON public.staff_chat_messages(created_at DESC);