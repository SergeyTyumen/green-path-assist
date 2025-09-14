-- Исправляем политики для user_registration_requests
-- Сначала удаляем текущие политики
DROP POLICY IF EXISTS "registration_requests_insert_policy" ON public.user_registration_requests;
DROP POLICY IF EXISTS "registration_requests_select_policy" ON public.user_registration_requests;
DROP POLICY IF EXISTS "registration_requests_update_policy" ON public.user_registration_requests;

-- Создаем функцию для проверки роли администратора (если её нет)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  );
$$;

-- Политика для INSERT - любой может подать заявку (даже неаутентифицированный)
CREATE POLICY "allow_anonymous_insert_registration_requests"
ON public.user_registration_requests
FOR INSERT
WITH CHECK (true);

-- Политика для SELECT - только админы
CREATE POLICY "admin_can_select_registration_requests"
ON public.user_registration_requests
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Политика для UPDATE - только админы
CREATE POLICY "admin_can_update_registration_requests"
ON public.user_registration_requests
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());