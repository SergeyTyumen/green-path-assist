-- Добавляем поле work_items для структурированного хранения услуг в ТЗ
ALTER TABLE technical_specifications 
ADD COLUMN IF NOT EXISTS work_items JSONB DEFAULT NULL;

-- Добавляем комментарий для документации
COMMENT ON COLUMN technical_specifications.work_items IS 
'Структурированный массив услуг: [{"service_name": "Название услуги", "quantity": 100, "unit": "м²"}]. 
Используется AI-сметчиком для точного сопоставления с номенклатурой.';

-- Создаем индекс для быстрого поиска по work_items
CREATE INDEX IF NOT EXISTS idx_technical_specifications_work_items 
ON technical_specifications USING GIN (work_items);