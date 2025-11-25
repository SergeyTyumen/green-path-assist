-- Fix infinite recursion in RLS policies by using SECURITY DEFINER functions

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Мастера видят свои назначения" ON project_assignments;
DROP POLICY IF EXISTS "Менеджеры обновляют назначения" ON project_assignments;
DROP POLICY IF EXISTS "Менеджеры создают назначения" ON project_assignments;
DROP POLICY IF EXISTS "Менеджеры удаляют назначения" ON project_assignments;

-- Create helper functions with SECURITY DEFINER to avoid recursion
CREATE OR REPLACE FUNCTION is_project_manager(project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM applications 
    WHERE id = project_id 
    AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION is_assigned_to_project(project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_assignments
    WHERE project_assignments.project_id = is_assigned_to_project.project_id
    AND worker_id = auth.uid()
    AND removed_at IS NULL
  )
$$;

-- Recreate policies using SECURITY DEFINER functions
CREATE POLICY "Мастера видят свои назначения"
ON project_assignments
FOR SELECT
TO authenticated
USING (
  auth.uid() = worker_id 
  OR is_project_manager(project_id)
  OR is_admin()
);

CREATE POLICY "Менеджеры создают назначения"
ON project_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  is_project_manager(project_id)
  OR is_admin()
);

CREATE POLICY "Менеджеры обновляют назначения"
ON project_assignments
FOR UPDATE
TO authenticated
USING (
  is_project_manager(project_id)
  OR is_admin()
);

CREATE POLICY "Менеджеры удаляют назначения"
ON project_assignments
FOR DELETE
TO authenticated
USING (
  is_project_manager(project_id)
  OR is_admin()
);