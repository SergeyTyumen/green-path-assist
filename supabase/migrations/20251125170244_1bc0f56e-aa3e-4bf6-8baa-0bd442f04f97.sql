-- Таблица для нормативных документов (СНИПы, ГОСТы)
CREATE TABLE IF NOT EXISTS normative_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  document_number TEXT NOT NULL,
  year INTEGER,
  document_type TEXT NOT NULL CHECK (document_type IN ('СНИП', 'ГОСТ', 'СП', 'ТУ', 'Другое')),
  description TEXT,
  document_text TEXT,
  document_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица для шаблонов смет (веб-таблицы)
CREATE TABLE IF NOT EXISTS estimate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  work_type TEXT NOT NULL,
  description TEXT,
  table_structure JSONB DEFAULT '{"columns": [{"id": "name", "label": "Наименование", "type": "text"}, {"id": "unit", "label": "Единица измерения", "type": "text"}, {"id": "quantity", "label": "Количество", "type": "number"}]}'::jsonb,
  template_rows JSONB DEFAULT '[]'::jsonb,
  formulas JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_normative_documents_user_id ON normative_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_normative_documents_type ON normative_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_user_id ON estimate_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_work_type ON estimate_templates(work_type);

-- Триггеры для updated_at
CREATE OR REPLACE FUNCTION update_normative_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_normative_documents_updated_at
BEFORE UPDATE ON normative_documents
FOR EACH ROW
EXECUTE FUNCTION update_normative_documents_updated_at();

CREATE OR REPLACE FUNCTION update_estimate_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_estimate_templates_updated_at
BEFORE UPDATE ON estimate_templates
FOR EACH ROW
EXECUTE FUNCTION update_estimate_templates_updated_at();

-- RLS политики для normative_documents
ALTER TABLE normative_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свои нормативные документы"
ON normative_documents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Пользователи создают свои нормативные документы"
ON normative_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи обновляют свои нормативные документы"
ON normative_documents
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Пользователи удаляют свои нормативные документы"
ON normative_documents
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS политики для estimate_templates
ALTER TABLE estimate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свои шаблоны смет"
ON estimate_templates
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Пользователи создают свои шаблоны смет"
ON estimate_templates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи обновляют свои шаблоны смет"
ON estimate_templates
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Пользователи удаляют свои шаблоны смет"
ON estimate_templates
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);