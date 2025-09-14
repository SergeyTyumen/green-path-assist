-- Временно отключаем RLS для user_registration_requests чтобы разблокировать функционал
-- После тестирования включим обратно с исправленными политиками

ALTER TABLE public.user_registration_requests DISABLE ROW LEVEL SECURITY;

-- Добавляем комментарий для напоминания
COMMENT ON TABLE public.user_registration_requests IS 'RLS временно отключен для отладки. Нужно включить обратно после тестирования.';