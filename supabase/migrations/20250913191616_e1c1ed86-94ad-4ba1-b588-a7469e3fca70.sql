-- Обновляем профиль правильного пользователя
UPDATE profiles 
SET 
  email = 'openai20021986@gmail.com',
  status = 'active',
  approved_at = now()
WHERE user_id = '9f9371a7-bc0c-482d-af09-789b58b5aa24';