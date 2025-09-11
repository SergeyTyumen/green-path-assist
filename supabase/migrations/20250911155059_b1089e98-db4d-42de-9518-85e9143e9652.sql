-- Add admin role for the user openai20021986@gmail.com
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Find the user ID for the specified email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'openai20021986@gmail.com'
    LIMIT 1;
    
    -- If user exists, add admin role
    IF target_user_id IS NOT NULL THEN
        -- Insert admin role (ignore if already exists)
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Admin role granted to user: %', target_user_id;
    ELSE
        RAISE NOTICE 'User with email openai20021986@gmail.com not found';
    END IF;
END $$;