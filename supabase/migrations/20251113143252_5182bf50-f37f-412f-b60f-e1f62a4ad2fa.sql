-- Add read status to voice_command_history table
ALTER TABLE public.voice_command_history 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add index for performance on is_read field
CREATE INDEX IF NOT EXISTS idx_voice_command_history_is_read 
ON public.voice_command_history(user_id, is_read);