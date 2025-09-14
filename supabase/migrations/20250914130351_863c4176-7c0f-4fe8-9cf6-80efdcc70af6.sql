-- Переделаем RLS политики для совместного использования CRM данных
-- Все аутентифицированные пользователи должны видеть общие данные

-- Клиенты - общие для всех пользователей
DROP POLICY IF EXISTS "authenticated_users_own_clients_select" ON public.clients;
DROP POLICY IF EXISTS "authenticated_users_own_clients_insert" ON public.clients;
DROP POLICY IF EXISTS "authenticated_users_own_clients_update" ON public.clients;
DROP POLICY IF EXISTS "authenticated_users_own_clients_delete" ON public.clients;

CREATE POLICY "authenticated_users_can_view_all_clients"
ON public.clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_can_create_clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_all_clients"
ON public.clients FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_all_clients"
ON public.clients FOR DELETE
TO authenticated
USING (true);

-- Задачи - общие для всех пользователей
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "authenticated_users_can_view_all_tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_can_create_tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_all_tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_all_tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (true);

-- Подрядчики - общие для всех пользователей
DROP POLICY IF EXISTS "Contractors can view their own profile" ON public.contractor_profiles;
DROP POLICY IF EXISTS "Contractors can insert their own profile" ON public.contractor_profiles;
DROP POLICY IF EXISTS "Contractors can update their own profile" ON public.contractor_profiles;

CREATE POLICY "authenticated_users_can_view_all_contractors"
ON public.contractor_profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_can_create_contractor_profile"
ON public.contractor_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_all_contractors"
ON public.contractor_profiles FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_all_contractors"
ON public.contractor_profiles FOR DELETE
TO authenticated
USING (true);

-- Поставщики - общие для всех пользователей
DROP POLICY IF EXISTS "authenticated_users_own_suppliers_select" ON public.suppliers;
DROP POLICY IF EXISTS "authenticated_users_own_suppliers_insert" ON public.suppliers;
DROP POLICY IF EXISTS "authenticated_users_own_suppliers_update" ON public.suppliers;
DROP POLICY IF EXISTS "authenticated_users_own_suppliers_delete" ON public.suppliers;

CREATE POLICY "authenticated_users_can_view_all_suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_can_create_suppliers"
ON public.suppliers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_all_suppliers"
ON public.suppliers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_all_suppliers"
ON public.suppliers FOR DELETE
TO authenticated
USING (true);

-- Материалы - общие для всех пользователей
DROP POLICY IF EXISTS "Users can view their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can create their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can update their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can delete their own materials" ON public.materials;

CREATE POLICY "authenticated_users_can_view_all_materials"
ON public.materials FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_can_create_materials"
ON public.materials FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_all_materials"
ON public.materials FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_all_materials"
ON public.materials FOR DELETE
TO authenticated
USING (true);

-- Услуги - общие для всех пользователей
DROP POLICY IF EXISTS "Users can view their own services" ON public.services;
DROP POLICY IF EXISTS "Users can create their own services" ON public.services;
DROP POLICY IF EXISTS "Users can update their own services" ON public.services;
DROP POLICY IF EXISTS "Users can delete their own services" ON public.services;

CREATE POLICY "authenticated_users_can_view_all_services"
ON public.services FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_can_create_services"
ON public.services FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_all_services"
ON public.services FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_all_services"
ON public.services FOR DELETE
TO authenticated
USING (true);

-- Сметы - общие для всех пользователей
DROP POLICY IF EXISTS "Users can view their own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can create their own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can update their own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can delete their own estimates" ON public.estimates;

CREATE POLICY "authenticated_users_can_view_all_estimates"
ON public.estimates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_can_create_estimates"
ON public.estimates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_all_estimates"
ON public.estimates FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_all_estimates"
ON public.estimates FOR DELETE
TO authenticated
USING (true);

-- Предложения - общие для всех пользователей
DROP POLICY IF EXISTS "Users can view their own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can create their own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can update their own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can delete their own proposals" ON public.proposals;

CREATE POLICY "authenticated_users_can_view_all_proposals"
ON public.proposals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_can_create_proposals"
ON public.proposals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_all_proposals"
ON public.proposals FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_all_proposals"
ON public.proposals FOR DELETE
TO authenticated
USING (true);