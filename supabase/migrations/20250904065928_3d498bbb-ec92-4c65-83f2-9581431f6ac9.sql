-- Создаем таблицу для настроек AI ассистентов
CREATE TABLE public.ai_assistant_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assistant_type TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ограничения
  UNIQUE(user_id, assistant_type)
);

-- Включаем RLS
ALTER TABLE public.ai_assistant_settings ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS
CREATE POLICY "Users can view their own assistant settings" 
ON public.ai_assistant_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistant settings" 
ON public.ai_assistant_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistant settings" 
ON public.ai_assistant_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistant settings" 
ON public.ai_assistant_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Создаем функцию для обновления updated_at
CREATE TRIGGER update_ai_assistant_settings_updated_at
BEFORE UPDATE ON public.ai_assistant_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Создаем таблицу для шаблонов промптов ассистентов
CREATE TABLE public.ai_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assistant_type TEXT NOT NULL,
  prompt_type TEXT NOT NULL DEFAULT 'system', -- system, user, custom
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- переменные для шаблона
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS для промптов
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS для промптов
CREATE POLICY "Users can view their own prompts" 
ON public.ai_prompts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prompts" 
ON public.ai_prompts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts" 
ON public.ai_prompts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts" 
ON public.ai_prompts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Триггер для updated_at
CREATE TRIGGER update_ai_prompts_updated_at
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();