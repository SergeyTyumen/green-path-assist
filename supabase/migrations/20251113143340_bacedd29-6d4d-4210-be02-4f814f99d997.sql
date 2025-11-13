-- Add read status to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_messages_is_read 
ON public.messages(conversation_id, is_read, direction);

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_conversation_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.messages m
  SET is_read = true
  WHERE m.conversation_id = p_conversation_id
    AND m.direction = 'in'
    AND m.is_read = false
    AND EXISTS (
      SELECT 1 FROM conversations c
      JOIN channels ch ON ch.id = c.channel_id
      WHERE c.id = m.conversation_id
        AND ch.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;