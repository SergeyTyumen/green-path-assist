-- Шаг 1: Создаем новую таблицу clients для базовой информации о клиентах
CREATE TABLE IF NOT EXISTS public.clients_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  company_name TEXT,
  position TEXT,
  notes TEXT,
  lead_source TEXT DEFAULT 'unknown',
  lead_source_details JSONB DEFAULT '{}',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  campaign_id TEXT,
  referrer_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS для clients_base
ALTER TABLE public.clients_base ENABLE ROW LEVEL SECURITY;

-- Политики для clients_base
CREATE POLICY "Users can view their own clients"
  ON public.clients_base FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients"
  ON public.clients_base FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON public.clients_base FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON public.clients_base FOR DELETE
  USING (auth.uid() = user_id);

-- Создаем индексы
CREATE INDEX idx_clients_base_user_id ON public.clients_base(user_id);
CREATE INDEX idx_clients_base_phone ON public.clients_base(phone);
CREATE INDEX idx_clients_base_email ON public.clients_base(email);

-- Шаг 2: Переименовываем текущую таблицу clients в applications
ALTER TABLE public.clients RENAME TO applications;

-- Добавляем поле client_id в applications (связь с clients_base)
ALTER TABLE public.applications ADD COLUMN client_id UUID REFERENCES public.clients_base(id) ON DELETE CASCADE;

-- Создаем индекс для client_id
CREATE INDEX idx_applications_client_id ON public.applications(client_id);

-- Обновляем политики для applications (они автоматически переименовались)
-- Оставляем существующие политики, но переименовываем для ясности
DROP POLICY IF EXISTS "authenticated_users_can_view_all_clients" ON public.applications;
DROP POLICY IF EXISTS "authenticated_users_can_create_clients" ON public.applications;
DROP POLICY IF EXISTS "authenticated_users_can_update_all_clients" ON public.applications;
DROP POLICY IF EXISTS "authenticated_users_can_delete_all_clients" ON public.applications;
DROP POLICY IF EXISTS "block_anonymous_access" ON public.applications;

-- Создаем новые политики для applications
CREATE POLICY "Users can view all applications"
  ON public.applications FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update all applications"
  ON public.applications FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete all applications"
  ON public.applications FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Шаг 3: Создаем таблицу для истории взаимодействий с клиентами
CREATE TABLE IF NOT EXISTS public.client_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients_base(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL, -- 'call', 'email', 'meeting', 'whatsapp', 'telegram', 'note'
  direction TEXT DEFAULT 'outbound', -- 'inbound', 'outbound'
  subject TEXT,
  description TEXT,
  duration_minutes INTEGER,
  outcome TEXT, -- 'successful', 'no_answer', 'scheduled_callback', 'negative', 'positive'
  next_action TEXT,
  next_action_date TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS для client_interactions
ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

-- Политики для client_interactions
CREATE POLICY "Users can view their own client interactions"
  ON public.client_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create client interactions"
  ON public.client_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client interactions"
  ON public.client_interactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client interactions"
  ON public.client_interactions FOR DELETE
  USING (auth.uid() = user_id);

-- Создаем индексы для client_interactions
CREATE INDEX idx_client_interactions_client_id ON public.client_interactions(client_id);
CREATE INDEX idx_client_interactions_application_id ON public.client_interactions(application_id);
CREATE INDEX idx_client_interactions_user_id ON public.client_interactions(user_id);
CREATE INDEX idx_client_interactions_created_at ON public.client_interactions(created_at DESC);

-- Триггер для обновления updated_at в clients_base
CREATE OR REPLACE FUNCTION update_clients_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_base_updated_at
  BEFORE UPDATE ON public.clients_base
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_base_updated_at();

-- Триггер для обновления updated_at в client_interactions
CREATE TRIGGER client_interactions_updated_at
  BEFORE UPDATE ON public.client_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Миграция существующих данных: создаем базовых клиентов из текущих заявок
INSERT INTO public.clients_base (id, user_id, name, phone, email, address, notes, lead_source, lead_source_details, utm_source, utm_medium, utm_campaign, campaign_id, referrer_url, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  user_id,
  name,
  phone,
  email,
  address,
  notes,
  COALESCE(lead_source, 'unknown'),
  COALESCE(lead_source_details, '{}'),
  utm_source,
  utm_medium,
  utm_campaign,
  campaign_id,
  referrer_url,
  created_at,
  updated_at
FROM public.applications
ON CONFLICT DO NOTHING;

-- Связываем существующие заявки с созданными клиентами (по phone как уникальному идентификатору)
UPDATE public.applications a
SET client_id = cb.id
FROM public.clients_base cb
WHERE a.phone = cb.phone AND a.user_id = cb.user_id;

-- Комментарии для документации
COMMENT ON TABLE public.clients_base IS 'Базовая информация о клиентах компании';
COMMENT ON TABLE public.applications IS 'Заявки (проекты) от клиентов';
COMMENT ON TABLE public.client_interactions IS 'История всех взаимодействий с клиентами';

COMMENT ON COLUMN public.applications.client_id IS 'Связь с базовой информацией о клиенте';
COMMENT ON COLUMN public.client_interactions.interaction_type IS 'Тип взаимодействия: call, email, meeting, whatsapp, telegram, note';
COMMENT ON COLUMN public.client_interactions.direction IS 'Направление: inbound (входящий), outbound (исходящий)';
COMMENT ON COLUMN public.client_interactions.outcome IS 'Результат взаимодействия: successful, no_answer, scheduled_callback, negative, positive';