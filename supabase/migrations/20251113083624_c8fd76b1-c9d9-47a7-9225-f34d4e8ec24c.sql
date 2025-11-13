-- Удаляем старые политики если есть конфликты
DROP POLICY IF EXISTS "Users can view their own knowledge base items" ON public.knowledge_base;
DROP POLICY IF EXISTS "Users can create their own knowledge base items" ON public.knowledge_base;
DROP POLICY IF EXISTS "Users can update their own knowledge base items" ON public.knowledge_base;
DROP POLICY IF EXISTS "Users can delete their own knowledge base items" ON public.knowledge_base;

-- Создаем заново корректные политики
CREATE POLICY "Users can view their own knowledge base items"
ON public.knowledge_base
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own knowledge base items"
ON public.knowledge_base
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge base items"
ON public.knowledge_base
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge base items"
ON public.knowledge_base
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);