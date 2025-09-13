-- Обновляем роль пользователя isaitov777@gmail.com на администратора
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = '8a5ab020-361e-402a-b237-0e1bb597ea7a';

-- Обновляем статус профиля на активный
UPDATE profiles 
SET status = 'active', approved_at = now()
WHERE user_id = '8a5ab020-361e-402a-b237-0e1bb597ea7a';