-- Обновляем таблицу profiles для хранения настроек голосового помощника
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_ai_model text DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS interaction_mode text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS voice_settings jsonb DEFAULT '{"voice_provider": "web_speech", "voice_id": "alloy", "speech_rate": 1.0, "speech_pitch": 1.0}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_settings jsonb DEFAULT '{"openai_model": "gpt-4o-mini", "yandex_model": "yandexgpt", "temperature": 0.7, "max_tokens": 1000}'::jsonb;