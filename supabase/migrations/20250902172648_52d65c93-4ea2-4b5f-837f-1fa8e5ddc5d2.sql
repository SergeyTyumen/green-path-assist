-- Fix critical security issue: Add user scoping to channels table
-- This prevents unauthorized access to sensitive Telegram bot credentials

-- Add user_id column to channels table for proper ownership
ALTER TABLE public.channels 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set a default user for existing channels (if any exist)
-- In production, you should assign these to the appropriate user
UPDATE public.channels 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id required for future inserts
ALTER TABLE public.channels 
ALTER COLUMN user_id SET NOT NULL;

-- Drop existing overly permissive RLS policies
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

-- Also secure channel_accounts table for consistency
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Users can view their own channel accounts" ON public.channel_accounts;

-- Create secure policy for channel_accounts that checks ownership through channels table
CREATE POLICY "Users can view their own channel accounts" 
ON public.channel_accounts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.channels 
  WHERE channels.id = channel_accounts.channel_id 
  AND channels.user_id = auth.uid()
));

CREATE POLICY "Users can create channel accounts for their channels" 
ON public.channel_accounts 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.channels 
  WHERE channels.id = channel_accounts.channel_id 
  AND channels.user_id = auth.uid()
));

CREATE POLICY "Users can update their own channel accounts" 
ON public.channel_accounts 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.channels 
  WHERE channels.id = channel_accounts.channel_id 
  AND channels.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own channel accounts" 
ON public.channel_accounts 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.channels 
  WHERE channels.id = channel_accounts.channel_id 
  AND channels.user_id = auth.uid()
));