-- Fix security vulnerability: Restrict contractor profile access
-- Remove the overly permissive policy that allows all authenticated users to view contractor profiles
DROP POLICY "Authenticated users can view contractor profiles" ON contractor_profiles;

-- Create new restrictive policy for viewing contractor profiles
-- Contractors can view their own profiles
-- Clients can view contractor profiles only when there's an active request/bid relationship
CREATE POLICY "Restricted contractor profile access" 
ON contractor_profiles 
FOR SELECT 
USING (
  auth.uid() = user_id  -- Contractors can view their own profile
  OR 
  EXISTS (
    SELECT 1 
    FROM requests r
    JOIN projects p ON p.id = r.project_id
    WHERE r.contractor_id = contractor_profiles.user_id
    AND p.user_id = auth.uid()  -- Client can view contractors who have requests on their projects
    AND r.status IN ('pending', 'accepted', 'in_progress')  -- Only active requests
  )
);