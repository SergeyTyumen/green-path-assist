-- Fix Function Search Path Security Issue
-- Update existing functions to have proper search_path setting

CREATE OR REPLACE FUNCTION public.update_stage_changed_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF OLD.conversion_stage IS DISTINCT FROM NEW.conversion_stage THEN
        NEW.stage_changed_at = now();
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Insert default client role for new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.create_default_client_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;