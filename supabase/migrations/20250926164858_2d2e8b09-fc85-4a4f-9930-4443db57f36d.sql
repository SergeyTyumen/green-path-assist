-- Изменяем структуру таблицы knowledge_base для более эффективной работы с ИИ
-- Вместо "вопрос-ответ" делаем "тема-информация"

-- Переименовываем и изменяем колонки
ALTER TABLE public.knowledge_base 
DROP COLUMN question,
ADD COLUMN topic text NOT NULL DEFAULT '',
ADD COLUMN content text NOT NULL DEFAULT '',
ADD COLUMN keywords text[] DEFAULT '{}',
ADD COLUMN priority integer DEFAULT 1;

-- Переименовываем answer в content (временно используем старую колонку)
UPDATE public.knowledge_base SET content = answer WHERE answer IS NOT NULL;
ALTER TABLE public.knowledge_base DROP COLUMN answer;

-- Добавляем комментарий для ясности
COMMENT ON COLUMN public.knowledge_base.topic IS 'Тема или заголовок информационного блока';
COMMENT ON COLUMN public.knowledge_base.content IS 'Подробная информация по теме';
COMMENT ON COLUMN public.knowledge_base.keywords IS 'Ключевые слова для поиска релевантной информации';
COMMENT ON COLUMN public.knowledge_base.priority IS 'Приоритет информации (1-высокий, 3-низкий)';

-- Добавляем индекс для быстрого поиска по ключевым словам
CREATE INDEX idx_knowledge_base_keywords ON public.knowledge_base USING GIN(keywords);
CREATE INDEX idx_knowledge_base_category_priority ON public.knowledge_base(category, priority);