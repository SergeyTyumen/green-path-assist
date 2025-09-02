-- Add user_id column to channels table for proper ownership
ALTER TABLE public.channels ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing channels to assign them to the first admin user (if any exists)
-- For now, we'll set them to NULL and require manual assignment
UPDATE public.channels SET user_id = NULL WHERE user_id IS NULL;

-- Make user_id NOT NULL after setting values
ALTER TABLE public.channels ALTER COLUMN user_id SET NOT NULL;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can create their own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can delete their own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can update their own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can view their own channels" ON public.channels;

-- Create secure RLS policies that restrict access to channel owners only
CREATE POLICY "Users can view their own channels" 
ON public.channels 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own channels" 
ON public.channels 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channels" 
ON public.channels 
FOR UPDATE 
USING (auth.uid() = user_id);

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

-- Secure contact_identities table as well to prevent data leakage
DROP POLICY IF EXISTS "Users can view their own contact identities" ON public.contact_identities;

CREATE POLICY "Users can view their own contact identities" 
ON public.contact_identities 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.contacts 
    WHERE contacts.id = contact_identities.contact_id 
    AND contacts.user_id = auth.uid()
  )
);