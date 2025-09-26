-- Удаляем таблицу consultant_knowledge_base и связанные объекты
DROP TRIGGER IF EXISTS update_consultant_knowledge_base_updated_at ON public.consultant_knowledge_base;
DROP TABLE IF EXISTS public.consultant_knowledge_base;