-- Создаем таблицу для сохраненных описаний объектов
CREATE TABLE public.saved_object_descriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  object_description TEXT,
  client_name TEXT,
  object_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.saved_object_descriptions ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Users can view their own saved descriptions" 
ON public.saved_object_descriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved descriptions" 
ON public.saved_object_descriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved descriptions" 
ON public.saved_object_descriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved descriptions" 
ON public.saved_object_descriptions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Триггер для обновления updated_at
CREATE TRIGGER update_saved_descriptions_updated_at
BEFORE UPDATE ON public.saved_object_descriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();