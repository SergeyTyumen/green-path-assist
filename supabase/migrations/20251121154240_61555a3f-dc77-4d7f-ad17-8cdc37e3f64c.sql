-- Создаем функцию для проверки роли мастера
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'master'::app_role
  )
$$;

-- Таблица назначений мастеров на объекты
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL,
  role_on_project text NOT NULL DEFAULT 'master',
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid NOT NULL,
  removed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, worker_id)
);

-- Таблица фотоотчетов мастеров
CREATE TABLE IF NOT EXISTS public.work_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('hidden_work', 'stage_work', 'completion', 'issue')),
  description text,
  photos text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Таблица заявок от мастеров
CREATE TABLE IF NOT EXISTS public.work_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('material', 'equipment', 'staff', 'other')),
  title text NOT NULL,
  description text,
  quantity numeric,
  unit text,
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  assigned_to uuid,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  resolution_comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Включаем RLS на новых таблицах
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_requests ENABLE ROW LEVEL SECURITY;

-- RLS для project_assignments
CREATE POLICY "Мастера видят свои назначения"
ON public.project_assignments
FOR SELECT
USING (
  auth.uid() = worker_id OR
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = project_assignments.project_id
    AND a.user_id = auth.uid()
  ) OR
  is_admin()
);

CREATE POLICY "Менеджеры создают назначения"
ON public.project_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = project_assignments.project_id
    AND a.user_id = auth.uid()
  ) OR
  is_admin()
);

CREATE POLICY "Менеджеры обновляют назначения"
ON public.project_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = project_assignments.project_id
    AND a.user_id = auth.uid()
  ) OR
  is_admin()
);

CREATE POLICY "Менеджеры удаляют назначения"
ON public.project_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = project_assignments.project_id
    AND a.user_id = auth.uid()
  ) OR
  is_admin()
);

-- RLS для work_reports
CREATE POLICY "Мастера видят отчеты по своим проектам"
ON public.work_reports
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = work_reports.project_id
    AND pa.worker_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = work_reports.project_id
    AND a.user_id = auth.uid()
  ) OR
  is_admin()
);

CREATE POLICY "Мастера создают свои отчеты"
ON public.work_reports
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = work_reports.project_id
    AND pa.worker_id = auth.uid()
    AND pa.removed_at IS NULL
  )
);

CREATE POLICY "Мастера обновляют свои отчеты"
ON public.work_reports
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Менеджеры могут одобрять отчеты"
ON public.work_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = work_reports.project_id
    AND a.user_id = auth.uid()
  ) OR
  is_admin()
);

-- RLS для work_requests
CREATE POLICY "Мастера видят заявки по своим проектам"
ON public.work_requests
FOR SELECT
USING (
  auth.uid() = user_id OR
  auth.uid() = assigned_to OR
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = work_requests.project_id
    AND a.user_id = auth.uid()
  ) OR
  is_admin()
);

CREATE POLICY "Мастера создают заявки"
ON public.work_requests
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = work_requests.project_id
    AND pa.worker_id = auth.uid()
    AND pa.removed_at IS NULL
  )
);

CREATE POLICY "Мастера обновляют свои заявки"
ON public.work_requests
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Менеджеры обрабатывают заявки"
ON public.work_requests
FOR UPDATE
USING (
  auth.uid() = assigned_to OR
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = work_requests.project_id
    AND a.user_id = auth.uid()
  ) OR
  is_admin()
);

-- Обновляем RLS для tasks - мастера видят задачи по назначенным проектам
CREATE POLICY "Мастера видят задачи по своим проектам"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE tasks.client_id IS NOT NULL 
    AND pa.project_id = tasks.client_id::uuid
    AND pa.worker_id = auth.uid()
    AND pa.removed_at IS NULL
  )
);

-- Обновляем RLS для applications - мастера видят назначенные проекты
CREATE POLICY "Мастера видят назначенные проекты"
ON public.applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = applications.id
    AND pa.worker_id = auth.uid()
    AND pa.removed_at IS NULL
  )
);

-- Обновляем RLS для client_comments - мастера видят комментарии после даты назначения
CREATE POLICY "Мастера видят комментарии с даты назначения"
ON public.client_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = client_comments.client_id::uuid
    AND pa.worker_id = auth.uid()
    AND pa.removed_at IS NULL
    AND client_comments.created_at >= pa.assigned_at
  )
);

-- Мастера могут добавлять комментарии к назначенным проектам
CREATE POLICY "Мастера создают комментарии по проектам"
ON public.client_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = client_comments.client_id::uuid
    AND pa.worker_id = auth.uid()
    AND pa.removed_at IS NULL
  )
);

-- Обновляем RLS для technical_specifications - мастера видят ТЗ назначенных проектов
CREATE POLICY "Мастера видят ТЗ по своим проектам"
ON public.technical_specifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_assignments pa
    JOIN public.applications a ON a.id = pa.project_id
    WHERE pa.worker_id = auth.uid()
    AND pa.removed_at IS NULL
    AND technical_specifications.client_name = a.name
  )
);

-- Триггеры для updated_at
CREATE TRIGGER update_project_assignments_updated_at
  BEFORE UPDATE ON public.project_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_reports_updated_at
  BEFORE UPDATE ON public.work_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_requests_updated_at
  BEFORE UPDATE ON public.work_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();