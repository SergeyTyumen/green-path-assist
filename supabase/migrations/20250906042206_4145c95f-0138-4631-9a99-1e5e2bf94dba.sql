-- Fix critical security vulnerability: Restrict conversation and message access
-- Currently ANY authenticated user can read ALL conversations and messages

-- Drop the overly permissive policies
DROP POLICY "Authenticated users can view conversations" ON conversations;
DROP POLICY "Authenticated users can view messages" ON messages;

-- Create restrictive policy for conversations
-- Users can only view conversations related to their own contacts or channels
CREATE POLICY "Users can view their own conversations" 
ON conversations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM contacts 
    WHERE contacts.id = conversations.contact_id 
    AND contacts.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = conversations.channel_id 
    AND channels.user_id = auth.uid()
  )
);

-- Create restrictive policy for messages
-- Users can only view messages from conversations they have access to
CREATE POLICY "Users can view messages from their conversations" 
ON messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN contacts ct ON ct.id = c.contact_id
    WHERE c.id = messages.conversation_id 
    AND ct.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN channels ch ON ch.id = c.channel_id
    WHERE c.id = messages.conversation_id 
    AND ch.user_id = auth.uid()
  )
);

-- Create policies for other operations on conversations
CREATE POLICY "Users can insert conversations for their contacts/channels" 
ON conversations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contacts 
    WHERE contacts.id = conversations.contact_id 
    AND contacts.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = conversations.channel_id 
    AND channels.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own conversations" 
ON conversations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM contacts 
    WHERE contacts.id = conversations.contact_id 
    AND contacts.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = conversations.channel_id 
    AND channels.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own conversations" 
ON conversations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM contacts 
    WHERE contacts.id = conversations.contact_id 
    AND contacts.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = conversations.channel_id 
    AND channels.user_id = auth.uid()
  )
);

-- Create policies for other operations on messages
CREATE POLICY "Users can insert messages in their conversations" 
ON messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN contacts ct ON ct.id = c.contact_id
    WHERE c.id = messages.conversation_id 
    AND ct.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN channels ch ON ch.id = c.channel_id
    WHERE c.id = messages.conversation_id 
    AND ch.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update messages in their conversations" 
ON messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN contacts ct ON ct.id = c.contact_id
    WHERE c.id = messages.conversation_id 
    AND ct.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN channels ch ON ch.id = c.channel_id
    WHERE c.id = messages.conversation_id 
    AND ch.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete messages from their conversations" 
ON messages 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN contacts ct ON ct.id = c.contact_id
    WHERE c.id = messages.conversation_id 
    AND ct.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN channels ch ON ch.id = c.channel_id
    WHERE c.id = messages.conversation_id 
    AND ch.user_id = auth.uid()
  )
);