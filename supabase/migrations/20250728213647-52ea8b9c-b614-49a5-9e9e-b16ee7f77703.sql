-- Создание таблицы для истории голосовых команд
CREATE TABLE public.voice_command_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  voice_text TEXT,
  transcript TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  parsed_entities JSONB DEFAULT '{}'::jsonb,
  execution_result JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error', 'partial')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.voice_command_history ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS
CREATE POLICY "Users can view their own voice command history" 
ON public.voice_command_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice command history" 
ON public.voice_command_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice command history" 
ON public.voice_command_history 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Добавляем поле assignee в таблицу tasks для указания ответственного ИИ-агента
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS ai_agent TEXT;

-- Создаем индексы для оптимизации
CREATE INDEX idx_voice_command_history_user_id ON public.voice_command_history(user_id);
CREATE INDEX idx_voice_command_history_status ON public.voice_command_history(status);
CREATE INDEX idx_voice_command_history_created_at ON public.voice_command_history(created_at);

-- Создаем триггер для автоматического обновления updated_at
CREATE TRIGGER update_voice_command_history_updated_at
BEFORE UPDATE ON public.voice_command_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();