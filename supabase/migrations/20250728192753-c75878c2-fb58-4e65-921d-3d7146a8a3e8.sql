-- Remove delivery_time column and add new fields for suppliers
ALTER TABLE public.suppliers 
DROP COLUMN delivery_time;

-- Add entity_type field
ALTER TABLE public.suppliers 
ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'ООО';

-- Add phones field (array of phone objects with messenger info)
ALTER TABLE public.suppliers 
ADD COLUMN phones JSONB DEFAULT '[]'::jsonb;

-- Add contact_person field
ALTER TABLE public.suppliers 
ADD COLUMN contact_person TEXT;