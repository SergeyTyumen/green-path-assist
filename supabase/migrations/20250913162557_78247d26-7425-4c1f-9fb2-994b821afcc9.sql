-- Fix voice_command_history table structure for conversation saving
ALTER TABLE voice_command_history 
ADD COLUMN IF NOT EXISTS command TEXT,
ADD COLUMN IF NOT EXISTS response TEXT,
ADD COLUMN IF NOT EXISTS conversation_context JSONB;