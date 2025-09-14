-- Удаляем все политики и создаем новые, более простые
DROP POLICY IF EXISTS "public_can_submit_registration_requests" ON public.user_registration_requests;
DROP POLICY IF EXISTS "admins_can_view_registration_requests" ON public.user_registration_requests;
DROP POLICY IF EXISTS "admins_can_update_registration_requests" ON public.user_registration_requests;

-- Разрешаем INSERT для всех (включая анонимных)
CREATE POLICY "allow_insert_registration_requests"
ON public.user_registration_requests
FOR INSERT
WITH CHECK (true);

-- Разрешаем SELECT только админам
CREATE POLICY "allow_select_for_admins"
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

-- Разрешаем UPDATE только админам
CREATE POLICY "allow_update_for_admins"
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