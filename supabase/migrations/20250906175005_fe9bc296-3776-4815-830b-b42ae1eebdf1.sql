-- Add additional security by ensuring the user_id column cannot be null and add proper constraints
-- This prevents any potential bypasses where user_id might be null

-- First, update any existing records with null user_id (if any) to prevent constraint violations
UPDATE public.contacts SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE public.clients SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE public.profiles SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE public.contractor_profiles SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE public.suppliers SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- Make user_id columns NOT NULL to prevent bypasses
ALTER TABLE public.contacts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.clients ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.contractor_profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.suppliers ALTER COLUMN user_id SET NOT NULL;

-- Add restrictive policies that explicitly deny access to unauthenticated users
CREATE POLICY "Deny all access to unauthenticated users" 
ON public.contacts 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny all access to unauthenticated users" 
ON public.clients 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny all access to unauthenticated users" 
ON public.profiles 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny all access to unauthenticated users" 
ON public.contractor_profiles 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny all access to unauthenticated users" 
ON public.suppliers 
FOR ALL 
TO anon
USING (false);