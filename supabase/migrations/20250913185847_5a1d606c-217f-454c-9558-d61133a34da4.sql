-- Добавляем поле статуса пользователя в профили
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;

-- Создаем таблицу для заявок на регистрацию
CREATE TABLE IF NOT EXISTS public.user_registration_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.user_registration_requests ENABLE ROW LEVEL SECURITY;

-- Политики для заявок на регистрацию
CREATE POLICY "Admins can view all registration requests" 
ON public.user_registration_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Anyone can create registration requests" 
ON public.user_registration_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update registration requests" 
ON public.user_registration_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Триггер для обновления updated_at
CREATE TRIGGER update_user_registration_requests_updated_at
  BEFORE UPDATE ON public.user_registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();