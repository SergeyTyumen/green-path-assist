-- Создаем таблицу для базы знаний ИИ-консультанта (вопросы-ответы)
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Создаем политики доступа
CREATE POLICY "Users can create their own knowledge base items" 
ON public.knowledge_base 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own knowledge base items" 
ON public.knowledge_base 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge base items" 
ON public.knowledge_base 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge base items" 
ON public.knowledge_base 
FOR DELETE 
USING (auth.uid() = user_id);

-- Создаем триггер для автоматического обновления updated_at
CREATE TRIGGER update_knowledge_base_updated_at
BEFORE UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();