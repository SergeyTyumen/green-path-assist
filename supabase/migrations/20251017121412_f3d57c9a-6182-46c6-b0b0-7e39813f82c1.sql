-- Create storage bucket for proposal templates
INSERT INTO storage.buckets (id, name, public) 
VALUES ('proposal-templates', 'proposal-templates', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for proposal templates bucket
CREATE POLICY "Users can upload their own proposal templates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'proposal-templates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own proposal templates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proposal-templates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own proposal templates"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'proposal-templates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own proposal templates"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'proposal-templates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add template_url column to proposals table to store reference to template used
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS template_url text;

-- Add content column to proposals table to store generated content
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS content text;