-- Fix RLS policies to require authentication - only update policies missing TO authenticated clause

-- Drop and recreate policies that don't explicitly require authentication
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Restricted contractor profile access" ON public.contractor_profiles;

-- Recreate with explicit authentication requirement
CREATE POLICY "Users can view their own contacts" 
ON public.contacts 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own suppliers" 
ON public.suppliers 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Fix contractor profiles with proper access control
CREATE POLICY "Contractors can view their own profile" 
ON public.contractor_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Clients can view contractors with active requests" 
ON public.contractor_profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM requests r
    JOIN projects p ON p.id = r.project_id
    WHERE r.contractor_id = contractor_profiles.user_id 
    AND p.user_id = auth.uid() 
    AND r.status IN ('pending', 'accepted', 'in_progress')
  )
);