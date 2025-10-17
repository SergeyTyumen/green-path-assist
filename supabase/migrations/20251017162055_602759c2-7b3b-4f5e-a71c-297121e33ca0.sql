-- Создаем таблицу для настроек КП-менеджера
CREATE TABLE IF NOT EXISTS public.proposal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_template TEXT,
  signature TEXT,
  default_validity_days INTEGER DEFAULT 14,
  auto_send BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Включаем RLS
ALTER TABLE public.proposal_settings ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут просматривать только свои настройки
CREATE POLICY "Users can view their own proposal settings"
  ON public.proposal_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователи могут создавать свои настройки
CREATE POLICY "Users can create their own proposal settings"
  ON public.proposal_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи могут обновлять свои настройки
CREATE POLICY "Users can update their own proposal settings"
  ON public.proposal_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Политика: пользователи могут удалять свои настройки
CREATE POLICY "Users can delete their own proposal settings"
  ON public.proposal_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_proposal_settings_updated_at
  BEFORE UPDATE ON public.proposal_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();