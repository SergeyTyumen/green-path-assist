-- Create completed_projects table for successfully finished projects
CREATE TABLE IF NOT EXISTS public.completed_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  final_amount NUMERIC NOT NULL,
  completion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actual_area NUMERIC,
  services TEXT[] NOT NULL DEFAULT '{}',
  project_duration_days INTEGER, -- calculated from client creation to completion
  client_feedback TEXT,
  client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5),
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'partial', 'completed'
  notes TEXT,
  before_photos TEXT[], -- URLs to photos
  after_photos TEXT[], -- URLs to photos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for querying
CREATE INDEX idx_completed_projects_client_id ON public.completed_projects(client_id);
CREATE INDEX idx_completed_projects_user_id ON public.completed_projects(user_id);
CREATE INDEX idx_completed_projects_completion_date ON public.completed_projects(completion_date DESC);

-- RLS policies for completed_projects
ALTER TABLE public.completed_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own completed projects"
  ON public.completed_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create completed projects"
  ON public.completed_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completed projects"
  ON public.completed_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completed projects"
  ON public.completed_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_completed_projects_updated_at
  BEFORE UPDATE ON public.completed_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add is_completed flag to clients table
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;