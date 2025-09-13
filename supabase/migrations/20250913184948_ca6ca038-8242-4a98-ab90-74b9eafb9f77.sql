-- Создаем таблицу для отправленных документов
CREATE TABLE public.document_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipient_type TEXT NOT NULL, -- 'client' or 'user'
  recipient_id UUID NOT NULL,
  document_type TEXT NOT NULL, -- 'proposal', 'estimate', 'technical_specification', 'contract'
  document_id UUID NOT NULL,
  send_method TEXT NOT NULL, -- 'email', 'telegram', 'whatsapp'
  recipient_contact TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.document_sends ENABLE ROW LEVEL SECURITY;

-- Политики для отправленных документов
CREATE POLICY "Users can view their own document sends" 
ON public.document_sends 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create document sends" 
ON public.document_sends 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document sends" 
ON public.document_sends 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Триггер для автоматического обновления updated_at документов
CREATE TRIGGER update_document_sends_updated_at
  BEFORE UPDATE ON public.document_sends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();