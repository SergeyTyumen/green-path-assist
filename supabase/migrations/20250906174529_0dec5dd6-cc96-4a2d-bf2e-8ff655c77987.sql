-- Fix RLS policies for sensitive data tables to ensure proper authentication and access control

-- Drop existing policies that might be too permissive
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Restricted contractor profile access" ON public.contractor_profiles;
DROP POLICY IF EXISTS "Users can view their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Contacts table - ensure only authenticated users can access their own contacts
CREATE POLICY "Users can view their own contacts" 
ON public.contacts 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts" 
ON public.contacts 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
ON public.contacts 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" 
ON public.contacts 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Clients table - ensure only authenticated users can access their own clients
CREATE POLICY "Users can view their own clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Update other client policies to explicitly require authentication
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

CREATE POLICY "Users can create their own clients" 
ON public.clients 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" 
ON public.clients 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Contractor profiles - ensure proper access control
CREATE POLICY "Contractors can view their own profile" 
ON public.contractor_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow clients to view contractor profiles only when they have active requests
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

-- Suppliers table - ensure only authenticated users can access their own suppliers
DROP POLICY IF EXISTS "Users can view their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can create their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete their own suppliers" ON public.suppliers;

CREATE POLICY "Users can view their own suppliers" 
ON public.suppliers 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own suppliers" 
ON public.suppliers 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers" 
ON public.suppliers 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers" 
ON public.suppliers 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Profiles table - ensure only authenticated users can access their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Update other profile policies to explicitly require authentication
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);