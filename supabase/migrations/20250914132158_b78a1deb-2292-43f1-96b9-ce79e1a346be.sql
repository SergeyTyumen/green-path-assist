-- Создаем таблицу для настройки прав доступа к модулям
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_name TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(user_id, module_name)
);

-- Создаем таблицу для назначения ответственных за задачи
CREATE TABLE public.task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL,
  UNIQUE(task_id, user_id)
);

-- Добавляем поле is_public в таблицу tasks
ALTER TABLE public.tasks ADD COLUMN is_public BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS policies для user_permissions
CREATE POLICY "Admins can manage all user permissions" 
ON public.user_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view their own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- RLS policies для task_assignees
CREATE POLICY "Users can view task assignees for their tasks or assigned tasks" 
ON public.task_assignees 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.id = task_assignees.task_id 
    AND (tasks.user_id = auth.uid() OR tasks.is_public = true)
  )
);

CREATE POLICY "Task creators can manage task assignees" 
ON public.task_assignees 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.id = task_assignees.task_id 
    AND tasks.user_id = auth.uid()
  )
);

-- Обновляем RLS политики для tasks
DROP POLICY IF EXISTS "authenticated_users_can_view_all_tasks" ON public.tasks;

CREATE POLICY "Users can view their own tasks and public tasks and assigned tasks" 
ON public.tasks 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_public = true OR
  EXISTS (
    SELECT 1 FROM public.task_assignees 
    WHERE task_assignees.task_id = tasks.id 
    AND task_assignees.user_id = auth.uid()
  )
);

-- Создаем функцию для проверки прав доступа к модулю
CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id UUID, 
  _module_name TEXT, 
  _permission_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Админы имеют доступ ко всему
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Проверяем конкретное разрешение
  RETURN EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id 
    AND module_name = _module_name
    AND CASE 
      WHEN _permission_type = 'view' THEN can_view
      WHEN _permission_type = 'create' THEN can_create
      WHEN _permission_type = 'edit' THEN can_edit
      WHEN _permission_type = 'delete' THEN can_delete
      ELSE false
    END = true
  );
END;
$$;

-- Создаем триггер для обновления updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();