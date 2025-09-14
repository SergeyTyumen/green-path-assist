-- Fix RLS security issues by enabling RLS on all public tables

-- Enable RLS on tables that might not have it enabled
ALTER TABLE IF EXISTS public.user_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS policies for user_registration_requests with proper access control
DROP POLICY IF EXISTS "allow_anonymous_insert_registration_requests" ON public.user_registration_requests;
DROP POLICY IF EXISTS "admin_can_select_registration_requests" ON public.user_registration_requests;
DROP POLICY IF EXISTS "admin_can_update_registration_requests" ON public.user_registration_requests;

-- Allow anonymous users to create registration requests
CREATE POLICY "allow_anonymous_insert_registration_requests" 
ON public.user_registration_requests 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow admin users to select registration requests
CREATE POLICY "admin_can_select_registration_requests" 
ON public.user_registration_requests 
FOR SELECT 
TO authenticated
USING (is_admin());

-- Allow admin users to update registration requests
CREATE POLICY "admin_can_update_registration_requests" 
ON public.user_registration_requests 
FOR UPDATE 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Ensure profiles table has proper RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add a trigger to create a default profile for new users
CREATE OR REPLACE FUNCTION public.create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  
  -- Create default employee role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile_on_signup();