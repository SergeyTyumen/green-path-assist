-- Check and fix RLS policies for channels table
-- Drop all existing policies first
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can create their own channels" ON public.channels;
    DROP POLICY IF EXISTS "Users can delete their own channels" ON public.channels;  
    DROP POLICY IF EXISTS "Users can update their own channels" ON public.channels;
    DROP POLICY IF EXISTS "Users can view their own channels" ON public.channels;
    
    -- For channel_accounts table
    DROP POLICY IF EXISTS "Users can view their own channel accounts" ON public.channel_accounts;
    DROP POLICY IF EXISTS "Users can manage their own channel accounts" ON public.channel_accounts;
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Some policies may not exist, continuing...';
END $$;

-- Create secure RLS policies for channels table
CREATE POLICY "Owners can view their channels" 
ON public.channels 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Owners can create channels" 
ON public.channels 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their channels" 
ON public.channels 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete their channels" 
ON public.channels 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create secure RLS policies for channel_accounts table  
CREATE POLICY "Owners can view their channel accounts" 
ON public.channel_accounts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE channels.id = channel_accounts.channel_id 
    AND channels.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage their channel accounts" 
ON public.channel_accounts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE channels.id = channel_accounts.channel_id 
    AND channels.user_id = auth.uid()
  )
);