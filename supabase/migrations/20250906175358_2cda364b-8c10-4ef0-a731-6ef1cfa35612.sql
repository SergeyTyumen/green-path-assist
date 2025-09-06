-- Create the most restrictive RLS setup possible for contacts table
-- This ensures maximum security by layering multiple protection mechanisms

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can create their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Deny all access to unauthenticated users" ON public.contacts;

-- Disable RLS temporarily to recreate it properly
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner (this ensures even table owner follows RLS)
ALTER TABLE public.contacts FORCE ROW LEVEL SECURITY;

-- Create the most restrictive policies possible
-- Explicitly deny ALL access to anonymous users
CREATE POLICY "block_anonymous_access" 
ON public.contacts 
FOR ALL 
TO anon
USING (false) 
WITH CHECK (false);

-- Only allow authenticated users to access their own records with explicit checks
CREATE POLICY "authenticated_users_own_contacts_select" 
ON public.contacts 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND user_id IS NOT NULL
);

CREATE POLICY "authenticated_users_own_contacts_insert" 
ON public.contacts 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND user_id IS NOT NULL
);

CREATE POLICY "authenticated_users_own_contacts_update" 
ON public.contacts 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND user_id IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND user_id IS NOT NULL
);

CREATE POLICY "authenticated_users_own_contacts_delete" 
ON public.contacts 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND user_id IS NOT NULL
);