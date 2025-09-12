-- Create technical specifications table
CREATE TABLE public.technical_specifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  object_description TEXT,
  client_name TEXT,
  object_address TEXT,
  work_scope TEXT,
  materials_spec JSONB,
  normative_references JSONB,
  quality_requirements TEXT,
  timeline TEXT,
  safety_requirements TEXT,
  acceptance_criteria TEXT,
  additional_requirements TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technical_specifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own technical specifications" 
ON public.technical_specifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own technical specifications" 
ON public.technical_specifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own technical specifications" 
ON public.technical_specifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own technical specifications" 
ON public.technical_specifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_technical_specifications_updated_at
BEFORE UPDATE ON public.technical_specifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();