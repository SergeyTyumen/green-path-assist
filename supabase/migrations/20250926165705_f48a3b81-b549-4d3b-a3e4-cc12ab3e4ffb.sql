-- Создаем таблицу для настроек интеграций
CREATE TABLE public.integration_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    integration_type text NOT NULL,
    settings jsonb NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS
CREATE POLICY "Users can manage their own integration settings"
    ON public.integration_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Добавляем поле whatsapp_number в таблицу contacts если его еще нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'whatsapp_number'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.contacts ADD COLUMN whatsapp_number text;
    END IF;
END $$;

-- Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_integration_settings_user_type 
    ON public.integration_settings(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_number 
    ON public.contacts(whatsapp_number) WHERE whatsapp_number IS NOT NULL;

-- Добавляем триггер для обновления updated_at
CREATE TRIGGER update_integration_settings_updated_at
    BEFORE UPDATE ON public.integration_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();