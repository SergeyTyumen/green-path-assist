-- Add tags column to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Add comment to describe the column
COMMENT ON COLUMN public.suppliers.tags IS 'Array of supplier tags like "Собственное производство", "Дилерская скидка", etc.';