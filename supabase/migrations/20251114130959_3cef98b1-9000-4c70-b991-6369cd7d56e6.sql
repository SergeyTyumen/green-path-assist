-- Добавляем поля для архивации разговоров
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Создаем индексы для быстрых запросов
-- Индекс для активных (неархивных) разговоров
CREATE INDEX IF NOT EXISTS idx_conversations_archived_active 
ON conversations(archived, last_message_at DESC) 
WHERE archived = false;

-- Индекс для архивных разговоров
CREATE INDEX IF NOT EXISTS idx_conversations_archived_only 
ON conversations(archived_at DESC) 
WHERE archived = true;

-- Индекс для связи с каналами (для фильтрации по пользователю)
CREATE INDEX IF NOT EXISTS idx_conversations_channel_archived 
ON conversations(channel_id, archived, last_message_at DESC);

-- Функция автоархивации разговоров при удалении клиента
CREATE OR REPLACE FUNCTION archive_conversation_on_client_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Архивируем все разговоры связанные с контактом удаленного клиента
  UPDATE conversations
  SET archived = true, archived_at = now()
  WHERE contact_id = OLD.contact_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоархивации при удалении клиента
DROP TRIGGER IF EXISTS trigger_archive_on_client_delete ON clients;
CREATE TRIGGER trigger_archive_on_client_delete
AFTER DELETE ON clients
FOR EACH ROW
EXECUTE FUNCTION archive_conversation_on_client_delete();

-- Функция для автоархивации старых разговоров (можно вызывать периодически)
CREATE OR REPLACE FUNCTION auto_archive_old_conversations(days_threshold integer DEFAULT 60)
RETURNS integer AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии для документации
COMMENT ON COLUMN conversations.archived IS 'Флаг архивации разговора. Архивные разговоры не загружаются в основной интерфейс для оптимизации производительности.';
COMMENT ON COLUMN conversations.archived_at IS 'Дата и время архивации разговора';
COMMENT ON FUNCTION auto_archive_old_conversations IS 'Автоматическая архивация неактивных разговоров. Вызов: SELECT auto_archive_old_conversations(60);';