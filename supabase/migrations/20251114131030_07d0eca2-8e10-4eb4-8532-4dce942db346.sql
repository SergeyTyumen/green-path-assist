-- Исправляем search_path для функции архивации при удалении клиента
CREATE OR REPLACE FUNCTION archive_conversation_on_client_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Архивируем все разговоры связанные с контактом удаленного клиента
  UPDATE conversations
  SET archived = true, archived_at = now()
  WHERE contact_id = OLD.contact_id;
  
  RETURN OLD;
END;
$$;

-- Исправляем search_path для функции автоархивации
CREATE OR REPLACE FUNCTION auto_archive_old_conversations(days_threshold integer DEFAULT 60)
RETURNS integer
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Архивируем разговоры без активности более X дней
  WITH archived AS (
    UPDATE conversations
    SET archived = true, archived_at = now()
    WHERE archived = false
      AND last_message_at < now() - (days_threshold || ' days')::interval
    RETURNING id
  )
  SELECT count(*) INTO archived_count FROM archived;
  
  RETURN archived_count;
END;
$$;