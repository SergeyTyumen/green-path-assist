-- Migration: Add client stages and comments functionality
-- Created: 2025-01-30

-- Create client_stages table
CREATE TABLE IF NOT EXISTS client_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    stage_order INTEGER NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create client_comments table
CREATE TABLE IF NOT EXISTS client_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    comment_type TEXT NOT NULL DEFAULT 'note' CHECK (comment_type IN ('call', 'meeting', 'email', 'message', 'note')),
    author_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_stages_client_id ON client_stages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_stages_user_id ON client_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_client_stages_order ON client_stages(client_id, stage_order);

CREATE INDEX IF NOT EXISTS idx_client_comments_client_id ON client_comments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_comments_user_id ON client_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_client_comments_created_at ON client_comments(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE client_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_comments ENABLE ROW LEVEL SECURITY;

-- Policies for client_stages
CREATE POLICY "Users can view their own client stages" ON client_stages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own client stages" ON client_stages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client stages" ON client_stages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client stages" ON client_stages
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for client_comments
CREATE POLICY "Users can view their own client comments" ON client_comments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own client comments" ON client_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client comments" ON client_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client comments" ON client_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically insert default stages for new clients
CREATE OR REPLACE FUNCTION create_default_client_stages()
RETURNS TRIGGER AS $$
DECLARE
    stage_names TEXT[] := ARRAY[
        'Первый звонок',
        'Назначен замер', 
        'Готовим смету',
        'Выставили КП',
        'Вносятся правки',
        'Вышли на договор',
        'Договор подписан',
        'Объект в работе',
        'Завершен'
    ];
    stage_name TEXT;
    stage_order_num INTEGER := 1;
BEGIN
    -- Insert default stages for the new client
    FOREACH stage_name IN ARRAY stage_names
    LOOP
        INSERT INTO client_stages (client_id, user_id, stage_name, stage_order, completed)
        VALUES (NEW.id, NEW.user_id, stage_name, stage_order_num, false);
        stage_order_num := stage_order_num + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create stages for new clients
DROP TRIGGER IF EXISTS trigger_create_default_stages ON clients;
CREATE TRIGGER trigger_create_default_stages
    AFTER INSERT ON clients
    FOR EACH ROW
    EXECUTE FUNCTION create_default_client_stages();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_client_stages_updated_at
    BEFORE UPDATE ON client_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_comments_updated_at
    BEFORE UPDATE ON client_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for existing clients (optional)
-- This will create stages for existing clients if they don't have any
DO $$
DECLARE
    client_record RECORD;
    stage_names TEXT[] := ARRAY[
        'Первый звонок',
        'Назначен замер', 
        'Готовим смету',
        'Выставили КП',
        'Вносятся правки',
        'Вышли на договор',
        'Договор подписан',
        'Объект в работе',
        'Завершен'
    ];
    stage_name TEXT;
    stage_order_num INTEGER;
BEGIN
    -- For each existing client that doesn't have stages
    FOR client_record IN 
        SELECT id, user_id FROM clients 
        WHERE id NOT IN (SELECT DISTINCT client_id FROM client_stages)
    LOOP
        stage_order_num := 1;
        FOREACH stage_name IN ARRAY stage_names
        LOOP
            INSERT INTO client_stages (client_id, user_id, stage_name, stage_order, completed)
            VALUES (client_record.id, client_record.user_id, stage_name, stage_order_num, false);
            stage_order_num := stage_order_num + 1;
        END LOOP;
    END LOOP;
END
$$;