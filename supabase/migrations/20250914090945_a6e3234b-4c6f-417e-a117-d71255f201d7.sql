-- Включаем RLS обратно и создаем правильные политики
ALTER TABLE public.user_registration_requests ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "allow_insert_registration_requests" ON public.user_registration_requests;
DROP POLICY IF EXISTS "allow_select_for_admins" ON public.user_registration_requests;
DROP POLICY IF EXISTS "allow_update_for_admins" ON public.user_registration_requests;

-- Политика для INSERT - любой может подать заявку
CREATE POLICY "registration_requests_insert_policy"
ON public.user_registration_requests
FOR INSERT
WITH CHECK (true);

-- Политика для SELECT - только админы
CREATE POLICY "registration_requests_select_policy"
ON public.user_registration_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

-- Политика для UPDATE - только админы
CREATE POLICY "registration_requests_update_policy"
ON public.user_registration_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);