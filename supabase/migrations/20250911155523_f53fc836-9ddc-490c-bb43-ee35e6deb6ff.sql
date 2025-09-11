-- Drop the function that depends on the old enum
DROP FUNCTION public.has_role(uuid, app_role);

-- Update app_role enum to use employee roles instead of client/contractor
ALTER TYPE public.app_role RENAME TO app_role_old;

CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee');

-- Update existing user_roles table
ALTER TABLE public.user_roles 
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role 
  USING CASE 
    WHEN role::text = 'admin' THEN 'admin'::public.app_role
    WHEN role::text = 'contractor' THEN 'manager'::public.app_role
    ELSE 'employee'::public.app_role
  END;

-- Drop old enum type
DROP TYPE public.app_role_old;

-- Recreate the has_role function with the new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- Update the default user role trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default employee role for new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$function$;