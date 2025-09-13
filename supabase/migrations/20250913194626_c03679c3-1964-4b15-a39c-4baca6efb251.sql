-- Security hardening for contacts table
-- The current issue is that while RLS policies exist, they could be improved for better security

-- Add additional security constraints and improve existing policies
-- 1. Add a check constraint to ensure user_id is never null (prevents orphaned records)
ALTER TABLE public.contacts ADD CONSTRAINT contacts_user_id_not_null CHECK (user_id IS NOT NULL);

-- 2. Create a security definer function to ensure proper user access
CREATE OR REPLACE FUNCTION public.is_contacts_owner(contact_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure the current user is authenticated and matches the contact owner
  RETURN auth.uid() IS NOT NULL AND auth.uid() = contact_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3. Drop the existing policies and create more secure ones
DROP POLICY IF EXISTS "authenticated_users_own_contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "authenticated_users_own_contacts_insert" ON public.contacts;
DROP POLICY IF EXISTS "authenticated_users_own_contacts_update" ON public.contacts;
DROP POLICY IF EXISTS "authenticated_users_own_contacts_delete" ON public.contacts;
DROP POLICY IF EXISTS "block_anonymous_access" ON public.contacts;

-- 4. Create improved RLS policies with better security
-- Policy for SELECT - only owners can view their contacts
CREATE POLICY "contacts_select_own_only"
ON public.contacts
FOR SELECT
TO authenticated
USING (public.is_contacts_owner(user_id));

-- Policy for INSERT - ensure new contacts are owned by the authenticated user
CREATE POLICY "contacts_insert_own_only"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (public.is_contacts_owner(user_id));

-- Policy for UPDATE - only owners can update their contacts
CREATE POLICY "contacts_update_own_only"
ON public.contacts
FOR UPDATE
TO authenticated
USING (public.is_contacts_owner(user_id))
WITH CHECK (public.is_contacts_owner(user_id));

-- Policy for DELETE - only owners can delete their contacts
CREATE POLICY "contacts_delete_own_only"
ON public.contacts
FOR DELETE
TO authenticated
USING (public.is_contacts_owner(user_id));

-- 5. Explicitly deny all access to anonymous users
CREATE POLICY "contacts_deny_anonymous"
ON public.contacts
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 6. Add audit logging trigger for contact access (optional security feature)
CREATE OR REPLACE FUNCTION public.log_contact_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log sensitive contact operations for security monitoring
  INSERT INTO audit_logs (user_id, table_name, operation, record_id, timestamp)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- If audit table doesn't exist, continue without logging
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the audit trigger
CREATE TRIGGER contact_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_contact_access();