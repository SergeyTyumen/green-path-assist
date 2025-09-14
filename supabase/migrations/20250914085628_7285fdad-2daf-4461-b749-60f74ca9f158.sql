-- Исправляем RLS политики для user_registration_requests
-- Проблема: анонимные пользователи не могут отправлять заявки

-- Сначала удаляем существующие политики
DROP POLICY IF EXISTS "Allow insert for anonymous and authenticated users" ON public.user_registration_requests;
DROP POLICY IF EXISTS "Allow select for admins only" ON public.user_registration_requests;
DROP POLICY IF EXISTS "Allow update for admins only" ON public.user_registration_requests;

-- Создаем новые правильные политики
-- Разрешаем INSERT для всех (анонимных и аутентифицированных)
CREATE POLICY "public_can_submit_registration_requests"
ON public.user_registration_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Только админы могут просматривать заявки
CREATE POLICY "admins_can_view_registration_requests"
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

-- Только админы могут обновлять заявки
CREATE POLICY "admins_can_update_registration_requests"
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