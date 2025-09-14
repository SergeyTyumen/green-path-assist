-- Удаляем все существующие политики для таблицы tasks
DROP POLICY IF EXISTS "Users can view their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Enable access to tasks based on user permissions" ON public.tasks;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.tasks;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.tasks;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.tasks;

-- Создаем новые простые политики для таблицы tasks без рекурсии
CREATE POLICY "Users can view tasks with permissions" 
ON public.tasks 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR is_public = true
  OR EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = auth.uid() 
    AND up.module_name = 'tasks' 
    AND up.can_view = true
  )
);

CREATE POLICY "Users can create tasks with permissions" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_permissions up 
      WHERE up.user_id = auth.uid() 
      AND up.module_name = 'tasks' 
      AND up.can_create = true
    )
    OR auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE user_type = 'admin'
    )
  )
);

CREATE POLICY "Users can update tasks with permissions" 
ON public.tasks 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_permissions up 
      WHERE up.user_id = auth.uid() 
      AND up.module_name = 'tasks' 
      AND up.can_edit = true
    )
    OR auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE user_type = 'admin'
    )
  )
);

CREATE POLICY "Users can delete tasks with permissions" 
ON public.tasks 
FOR DELETE 
USING (
  auth.uid() = user_id 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_permissions up 
      WHERE up.user_id = auth.uid() 
      AND up.module_name = 'tasks' 
      AND up.can_delete = true
    )
    OR auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE user_type = 'admin'
    )
  )
);