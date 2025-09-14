-- Update RLS policy for profiles to allow viewing all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy that allows authenticated users to view all profiles
CREATE POLICY "authenticated_users_can_view_all_profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);