-- Создание таблиц для системы норм расхода и сметного расчёта

-- Таблица материалов
CREATE TABLE public.materials_norms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('м³', 'тн', 'м²', 'кг', 'шт', 'п.м')),
  bulk_density NUMERIC,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица норм расхода
CREATE TABLE public.norms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  material_id UUID NOT NULL REFERENCES public.materials_norms(id) ON DELETE CASCADE,
  thickness NUMERIC NOT NULL DEFAULT 0,
  compaction_ratio NUMERIC NOT NULL DEFAULT 1.0,
  mandatory BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица результатов сметных расчётов
CREATE TABLE public.smeta_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_quantity NUMERIC NOT NULL,
  service_unit TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_unit TEXT NOT NULL,
  thickness NUMERIC,
  compaction_ratio NUMERIC,
  bulk_density NUMERIC,
  calculation_formula TEXT,
  calculated_quantity NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включение RLS для всех таблиц
ALTER TABLE public.materials_norms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.norms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smeta_items ENABLE ROW LEVEL SECURITY;

-- Политики RLS для materials_norms
CREATE POLICY "Users can view their own material norms" 
ON public.materials_norms 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own material norms" 
ON public.materials_norms 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own material norms" 
ON public.materials_norms 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own material norms" 
ON public.materials_norms 
FOR DELETE 
USING (auth.uid() = user_id);

-- Политики RLS для norms
CREATE POLICY "Users can view their own norms" 
ON public.norms 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own norms" 
ON public.norms 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own norms" 
ON public.norms 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own norms" 
ON public.norms 
FOR DELETE 
USING (auth.uid() = user_id);

-- Политики RLS для smeta_items
CREATE POLICY "Users can view their own smeta items" 
ON public.smeta_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own smeta items" 
ON public.smeta_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own smeta items" 
ON public.smeta_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own smeta items" 
ON public.smeta_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_materials_norms_updated_at
BEFORE UPDATE ON public.materials_norms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_norms_updated_at
BEFORE UPDATE ON public.norms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Индексы для оптимизации
CREATE INDEX idx_materials_norms_user_id ON public.materials_norms(user_id);
CREATE INDEX idx_materials_norms_name ON public.materials_norms(name);
CREATE INDEX idx_norms_user_id ON public.norms(user_id);
CREATE INDEX idx_norms_service_name ON public.norms(service_name);
CREATE INDEX idx_norms_material_id ON public.norms(material_id);
CREATE INDEX idx_smeta_items_user_id ON public.smeta_items(user_id);
CREATE INDEX idx_smeta_items_task_id ON public.smeta_items(task_id);