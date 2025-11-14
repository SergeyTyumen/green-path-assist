-- Fix mark_messages_as_read function to update both is_read and read_at fields
-- This ensures Dashboard and AIConsultant use consistent read status

CREATE OR REPLACE FUNCTION mark_messages_as_read(p_conversation_id UUID, p_user_id UUID)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages m
  SET 
    is_read = true,
    read_at = now()
  WHERE m.conversation_id = p_conversation_id
    AND m.direction = 'in'
    AND m.is_read = false
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.channels ch ON ch.id = c.channel_id
      WHERE c.id = m.conversation_id
        AND ch.user_id = p_user_id
    );
END;
$$;