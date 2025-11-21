-- Добавляем роль master в enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'master';