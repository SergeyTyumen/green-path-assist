-- Добавляем service_id в estimate_items для хранения услуг
ALTER TABLE estimate_items
ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id);

-- Добавляем description для позиций сметы
ALTER TABLE estimate_items
ADD COLUMN IF NOT EXISTS description text;

-- Делаем material_id nullable, так как может быть либо материал, либо услуга
ALTER TABLE estimate_items
ALTER COLUMN material_id DROP NOT NULL;

-- Добавляем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_estimate_items_service_id ON estimate_items(service_id);

-- Добавляем комментарий
COMMENT ON COLUMN estimate_items.service_id IS 'Reference to service if this item is a service (mutually exclusive with material_id)';
COMMENT ON COLUMN estimate_items.description IS 'Additional description for the estimate item';