-- Create services table for nomenclature
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'услуга',
  price NUMERIC NOT NULL,
  description TEXT,
  duration_hours INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own services" 
ON public.services 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own services" 
ON public.services 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own services" 
ON public.services 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own services" 
ON public.services 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();