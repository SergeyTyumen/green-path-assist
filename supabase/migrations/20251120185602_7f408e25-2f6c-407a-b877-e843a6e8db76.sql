-- Create client_archives table for managing archived clients
CREATE TABLE IF NOT EXISTS public.client_archives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  archive_reason_type TEXT NOT NULL, -- 'no_contact', 'insufficient_budget', 'project_postponed', 'other'
  archive_reason_comment TEXT,
  archive_period INTEGER NOT NULL, -- in days: 30, 90, 180, 365
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  restore_at TIMESTAMP WITH TIME ZONE NOT NULL, -- calculated: archived_at + archive_period
  restored_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'restored', 'cancelled'
  reminder_type TEXT NOT NULL DEFAULT 'system', -- 'system', 'email', 'telegram'
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for querying active archives
CREATE INDEX idx_client_archives_client_id ON public.client_archives(client_id);
CREATE INDEX idx_client_archives_status ON public.client_archives(status);
CREATE INDEX idx_client_archives_restore_at ON public.client_archives(restore_at) WHERE status = 'active';

-- RLS policies for client_archives
ALTER TABLE public.client_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own client archives"
  ON public.client_archives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create client archives"
  ON public.client_archives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client archives"
  ON public.client_archives FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client archives"
  ON public.client_archives FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_client_archives_updated_at
  BEFORE UPDATE ON public.client_archives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add archive-related fields to clients table
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_until TIMESTAMP WITH TIME ZONE;