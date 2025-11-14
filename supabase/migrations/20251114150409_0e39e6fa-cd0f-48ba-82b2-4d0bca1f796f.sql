-- Add ui_preferences field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN ui_preferences JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.ui_preferences IS 'User interface customization settings: visible menu items, dashboard widgets, etc.';