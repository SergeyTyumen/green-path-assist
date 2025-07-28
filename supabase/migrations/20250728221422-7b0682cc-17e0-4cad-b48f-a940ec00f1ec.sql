-- Добавляем поле характеристик для материалов
ALTER TABLE public.materials 
ADD COLUMN characteristics TEXT;

-- Добавляем поле назначения для лучшей категоризации
ALTER TABLE public.materials 
ADD COLUMN purpose TEXT;

-- Добавляем поле для физических свойств (JSON)
ALTER TABLE public.materials 
ADD COLUMN properties JSONB DEFAULT '{}'::jsonb;

-- Комментарии для документации
COMMENT ON COLUMN public.materials.characteristics IS 'Детальные характеристики материала (размеры, описание, особенности применения)';
COMMENT ON COLUMN public.materials.purpose IS 'Назначение материала (бордюр, плитка, песок для подсыпки и т.д.)';
COMMENT ON COLUMN public.materials.properties IS 'Физические свойства: плотность, размеры, вес и др. в формате JSON';