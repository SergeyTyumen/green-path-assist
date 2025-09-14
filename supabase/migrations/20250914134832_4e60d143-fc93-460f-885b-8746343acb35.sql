-- Создаем security definer функции для предотвращения рекурсии
CREATE OR REPLACE FUNCTION public.can_user_view_tasks(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = _user_id 
    AND up.module_name = 'tasks' 
    AND up.can_view = true
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = _user_id 
    AND ur.role = 'admin'::app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.can_user_create_tasks(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = _user_id 
    AND up.module_name = 'tasks' 
    AND up.can_create = true
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = _user_id 
    AND ur.role = 'admin'::app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.can_user_edit_tasks(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = _user_id 
    AND up.module_name = 'tasks' 
    AND up.can_edit = true
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = _user_id 
    AND ur.role = 'admin'::app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.can_user_delete_tasks(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = _user_id 
    AND up.module_name = 'tasks' 
    AND up.can_delete = true
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = _user_id 
    AND ur.role = 'admin'::app_role
  );
$$;

-- Удаляем все существующие политики для таблицы tasks
DROP POLICY IF EXISTS "Users can view their own tasks and public tasks and assigned ta" ON public.tasks;
DROP POLICY IF EXISTS "authenticated_users_can_create_tasks" ON public.tasks;
DROP POLICY IF EXISTS "authenticated_users_can_delete_all_tasks" ON public.tasks;
DROP POLICY IF EXISTS "authenticated_users_can_update_all_tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks with permissions" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks with permissions" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks with permissions" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks with permissions" ON public.tasks;

-- Создаем простые политики без рекурсии, используя security definer функции
CREATE POLICY "tasks_select_policy" 
ON public.tasks 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR is_public = true
  OR public.can_user_view_tasks(auth.uid())
);

CREATE POLICY "tasks_insert_policy" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND public.can_user_create_tasks(auth.uid())
);

CREATE POLICY "tasks_update_policy" 
ON public.tasks 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND public.can_user_edit_tasks(auth.uid())
);

CREATE POLICY "tasks_delete_policy" 
ON public.tasks 
FOR DELETE 
USING (
  auth.uid() = user_id 
  AND public.can_user_delete_tasks(auth.uid())
);