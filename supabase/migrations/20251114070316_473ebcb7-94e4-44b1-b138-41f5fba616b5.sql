-- Обновляем RLS политику для просмотра комментариев клиентов
-- Пользователь может видеть все комментарии к своим клиентам
DROP POLICY IF EXISTS "Users can view their own client comments" ON client_comments;

CREATE POLICY "Users can view comments of their clients" 
ON client_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = client_comments.client_id 
    AND clients.user_id = auth.uid()
  )
);