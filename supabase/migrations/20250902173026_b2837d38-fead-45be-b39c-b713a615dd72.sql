-- Fix RLS policies for contacts table to prevent unauthorized access to customer data
-- Drop the overly permissive policy that allows any authenticated user to view all contacts
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;

-- Create secure RLS policies that restrict access to contact owners only
CREATE POLICY "Users can view their own contacts" 
ON public.contacts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
ON public.contacts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" 
ON public.contacts 
FOR DELETE 
USING (auth.uid() = user_id);