-- Временно отключаем RLS для диагностики и включаем обратно с правильными политиками
ALTER TABLE public.user_registration_requests DISABLE ROW LEVEL SECURITY;

-- Проверяем что таблица доступна
SELECT 'Table accessible without RLS' as test;

-- Включаем RLS обратно
ALTER TABLE public.user_registration_requests ENABLE ROW LEVEL SECURITY;

-- Удаляем все политики и создаем заново с правильным синтаксисом
DROP POLICY IF EXISTS "Anonymous users can create registration requests" ON public.user_registration_requests;
DROP POLICY IF EXISTS "Admins can view all registration requests" ON public.user_registration_requests;
DROP POLICY IF EXISTS "Admins can update registration requests" ON public.user_registration_requests;

-- Создаем политику для INSERT, которая разрешает анонимным и аутентифицированным пользователям создавать заявки
CREATE POLICY "Allow insert for anonymous and authenticated users"
ON public.user_registration_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Создаем политику для SELECT только для администраторов
CREATE POLICY "Allow select for admins only"
ON public.user_registration_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Создаем политику для UPDATE только для администраторов
CREATE POLICY "Allow update for admins only"
ON public.user_registration_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);