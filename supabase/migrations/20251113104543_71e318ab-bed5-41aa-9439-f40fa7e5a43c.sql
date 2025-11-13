-- Удаляем дубликаты, оставляя только самую новую запись для каждого пользователя и типа интеграции
DELETE FROM integration_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, integration_type) id
  FROM integration_settings
  ORDER BY user_id, integration_type, updated_at DESC
);

-- Добавляем уникальный constraint чтобы предотвратить дубликаты в будущем
ALTER TABLE integration_settings 
ADD CONSTRAINT integration_settings_user_integration_unique 
UNIQUE (user_id, integration_type);