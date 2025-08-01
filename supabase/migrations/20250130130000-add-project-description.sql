-- Migration: Add project description field to clients
-- Created: 2025-01-30

-- Add project_description field to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_description TEXT;

-- Update existing client with sample data
UPDATE clients 
SET project_description = 'футбольное поле для детей' 
WHERE name = 'Гаврилюк Сергей Владимирович';

-- Add comment explaining the field
COMMENT ON COLUMN clients.project_description IS 'Краткое описание проекта/заявки клиента';