-- Добавляем поле для назначенного менеджера в таблицу clients
ALTER TABLE clients 
ADD COLUMN assigned_manager_id UUID REFERENCES auth.users(id);

-- Добавляем индекс для быстрого поиска клиентов менеджера
CREATE INDEX idx_clients_assigned_manager ON clients(assigned_manager_id);

-- Добавляем индекс для поиска нераспределенных клиентов
CREATE INDEX idx_clients_unassigned ON clients(assigned_manager_id) WHERE assigned_manager_id IS NULL;