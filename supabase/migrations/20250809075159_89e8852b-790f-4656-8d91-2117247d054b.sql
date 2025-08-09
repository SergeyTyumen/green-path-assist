-- Создание таблицы для договоров
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID,
  title TEXT NOT NULL,
  template_name TEXT NOT NULL DEFAULT 'standard',
  content TEXT,
  amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  valid_until DATE
);

-- Включаем RLS для таблицы договоров
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Создаем политики для договоров
CREATE POLICY "Users can create their own contracts"
ON public.contracts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own contracts"
ON public.contracts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own contracts"
ON public.contracts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contracts"
ON public.contracts
FOR DELETE
USING (auth.uid() = user_id);

-- Обновляем триггер для обновления времени
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Создание таблицы для шаблонов КП и договоров
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'proposal' или 'contract'
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS для таблицы шаблонов
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Создаем политики для шаблонов
CREATE POLICY "Users can create their own templates"
ON public.templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own templates"
ON public.templates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.templates
FOR DELETE
USING (auth.uid() = user_id);

-- Обновляем триггер для обновления времени
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();