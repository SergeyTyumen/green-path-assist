-- Apply maximum security to all remaining sensitive tables
-- This ensures complete protection of customer contact information

-- Apply same security to clients table
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Deny all access to unauthenticated users" ON public.clients;

ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

CREATE POLICY "block_anonymous_access" ON public.clients FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "authenticated_users_own_clients_select" ON public.clients FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND user_id IS NOT NULL);
CREATE POLICY "authenticated_users_own_clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id AND user_id IS NOT NULL);
CREATE POLICY "authenticated_users_own_clients_update" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND user_id IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id AND user_id IS NOT NULL);
CREATE POLICY "authenticated_users_own_clients_delete" ON public.clients FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND user_id IS NOT NULL);

-- Apply same security to suppliers table  
DROP POLICY IF EXISTS "Users can view their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can create their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Deny all access to unauthenticated users" ON public.suppliers;

ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;

CREATE POLICY "block_anonymous_access" ON public.suppliers FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "authenticated_users_own_suppliers_select" ON public.suppliers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND user_id IS NOT NULL);
CREATE POLICY "authenticated_users_own_suppliers_insert" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id AND user_id IS NOT NULL);
CREATE POLICY "authenticated_users_own_suppliers_update" ON public.suppliers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND user_id IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id AND user_id IS NOT NULL);
CREATE POLICY "authenticated_users_own_suppliers_delete" ON public.suppliers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND user_id IS NOT NULL);

-- Restrict webhook_log access to prevent exposure of system data
DROP POLICY IF EXISTS "Admins can view webhook logs" ON public.webhook_log;

ALTER TABLE public.webhook_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_log FORCE ROW LEVEL SECURITY;

-- Only allow system administrators (you can adjust this based on your user roles)
CREATE POLICY "block_all_webhook_access" ON public.webhook_log FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "block_anonymous_webhook_access" ON public.webhook_log FOR ALL TO anon USING (false) WITH CHECK (false);