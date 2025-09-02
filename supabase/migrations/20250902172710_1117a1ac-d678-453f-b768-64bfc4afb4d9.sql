-- First, add user_id column as nullable
ALTER TABLE public.channels ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Get the first user from auth.users to assign existing channels to
-- If no users exist, we'll need to handle this manually
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Try to find the first user
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    -- If a user exists, assign all existing channels to them
    IF first_user_id IS NOT NULL THEN
        UPDATE public.channels SET user_id = first_user_id WHERE user_id IS NULL;
    ELSE
        -- If no users exist, we'll leave user_id as NULL for now
        -- These channels will need to be assigned manually when users are created
        RAISE NOTICE 'No users found. Existing channels will need user assignment.';
    END IF;
END $$;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can create their own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can delete their own channels" ON public.channels;  
DROP POLICY IF EXISTS "Users can update their own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can view their own channels" ON public.channels;

-- Create secure RLS policies that restrict access to channel owners only
-- Allow viewing only if user owns the channel
CREATE POLICY "Users can view their own channels" 
ON public.channels 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow creating channels only if the user sets themselves as owner
CREATE POLICY "Users can create their own channels" 
ON public.channels 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow updating only user's own channels
CREATE POLICY "Users can update their own channels" 
ON public.channels 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow deleting only user's own channels  
CREATE POLICY "Users can delete their own channels" 
ON public.channels 
FOR DELETE 
USING (auth.uid() = user_id);

-- Also secure the channel_accounts table to prevent unauthorized access
DROP POLICY IF EXISTS "Users can view their own channel accounts" ON public.channel_accounts;

CREATE POLICY "Users can view their own channel accounts" 
ON public.channel_accounts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE channels.id = channel_accounts.channel_id 
    AND channels.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own channel accounts" 
ON public.channel_accounts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE channels.id = channel_accounts.channel_id 
    AND channels.user_id = auth.uid()
  )
);