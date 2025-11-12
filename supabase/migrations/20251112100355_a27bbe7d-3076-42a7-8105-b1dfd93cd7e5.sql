-- Активируем realtime для таблицы messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Добавляем таблицу в публикацию realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;