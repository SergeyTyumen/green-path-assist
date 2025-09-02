-- Fix RLS policies for channels table to restrict access to owners only
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

-- Fix channel_accounts table RLS policies  
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