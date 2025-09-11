-- Обновляем задачи для клиента Федорова Алексея Николаевича
UPDATE tasks 
SET client_id = 'a8560ade-1312-41f3-8992-0ef8566f23bf'
WHERE client_id IS NULL 
AND (title ILIKE '%федоров%' OR description ILIKE '%федоров%' OR title ILIKE '%ландшафтный%' OR title ILIKE '%алексей%');