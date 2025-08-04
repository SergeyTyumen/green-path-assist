-- Добавить поле источника лидов в таблицу clients
ALTER TABLE public.clients 
ADD COLUMN lead_source text DEFAULT 'unknown',
ADD COLUMN lead_source_details jsonb DEFAULT '{}',
ADD COLUMN conversion_stage text DEFAULT 'new',
ADD COLUMN stage_changed_at timestamp with time zone DEFAULT now(),
ADD COLUMN lead_quality_score integer DEFAULT 0,
ADD COLUMN campaign_id text,
ADD COLUMN utm_source text,
ADD COLUMN utm_medium text,
ADD COLUMN utm_campaign text,
ADD COLUMN referrer_url text;

-- Обновить существующие записи
UPDATE public.clients 
SET lead_source = 'manual' 
WHERE lead_source = 'unknown';

-- Добавить индексы для аналитики
CREATE INDEX idx_clients_lead_source ON public.clients(lead_source);
CREATE INDEX idx_clients_conversion_stage ON public.clients(conversion_stage);
CREATE INDEX idx_clients_created_at ON public.clients(created_at);
CREATE INDEX idx_clients_lead_quality_score ON public.clients(lead_quality_score);

-- Создать триггер для отслеживания изменения стадий
CREATE OR REPLACE FUNCTION update_stage_changed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.conversion_stage IS DISTINCT FROM NEW.conversion_stage THEN
        NEW.stage_changed_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stage_changed_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION update_stage_changed_at();