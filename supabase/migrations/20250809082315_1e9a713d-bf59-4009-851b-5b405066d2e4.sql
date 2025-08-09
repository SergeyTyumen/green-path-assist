-- Fix contractor profiles RLS policy to be more secure
-- Remove the overly permissive "Anyone can view contractor profiles" policy
DROP POLICY IF EXISTS "Anyone can view contractor profiles" ON public.contractor_profiles;

-- Create a more secure policy for viewing contractor profiles
-- Only authenticated users can view contractor profiles
CREATE POLICY "Authenticated users can view contractor profiles" 
ON public.contractor_profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Fix database function search_path security issues
-- Update existing functions to have secure search_path
ALTER FUNCTION public.update_stage_changed_at() SET search_path = '';
ALTER FUNCTION public.handle_new_user_role() SET search_path = '';
ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) SET search_path = '';
ALTER FUNCTION public.create_default_client_stages() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';