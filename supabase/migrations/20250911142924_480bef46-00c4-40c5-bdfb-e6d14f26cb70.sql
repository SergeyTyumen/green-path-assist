-- Add advanced_features column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS advanced_features JSONB DEFAULT '{
  "enable_function_calling": true,
  "enable_memory": true,
  "auto_save_conversations": true,
  "privacy_mode": false
}'::jsonb;

-- Create API keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for API keys
CREATE POLICY "Users can view their own API keys" 
ON public.api_keys 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" 
ON public.api_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" 
ON public.api_keys 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" 
ON public.api_keys 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();