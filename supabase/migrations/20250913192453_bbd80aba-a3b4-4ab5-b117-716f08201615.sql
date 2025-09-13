-- Удаляем старые политики для user_registration_requests
DROP POLICY IF EXISTS "Anyone can create registration requests" ON public.user_registration_requests;
DROP POLICY IF EXISTS "Admins can view all registration requests" ON public.user_registration_requests;
DROP POLICY IF EXISTS "Admins can update registration requests" ON public.user_registration_requests;

-- Создаем новые политики, которые работают для анонимных пользователей
CREATE POLICY "Anonymous users can create registration requests" 
ON public.user_registration_requests 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all registration requests" 
ON public.user_registration_requests 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update registration requests" 
ON public.user_registration_requests 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);