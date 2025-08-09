-- Создаем таблицу для хранения закрытых сделок с причинами
CREATE TABLE public.closed_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  closure_reason TEXT NOT NULL,
  closure_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deal_amount NUMERIC,
  project_area INTEGER,
  services TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.closed_deals ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS
CREATE POLICY "Users can view their own closed deals" 
ON public.closed_deals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own closed deals" 
ON public.closed_deals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own closed deals" 
ON public.closed_deals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own closed deals" 
ON public.closed_deals 
FOR DELETE 
USING (auth.uid() = user_id);