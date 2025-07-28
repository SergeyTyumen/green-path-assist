-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  services TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_contact TIMESTAMP WITH TIME ZONE,
  next_action TEXT,
  project_area INTEGER,
  budget DECIMAL
);

-- Create tasks table  
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID,
  assignee TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  category TEXT NOT NULL DEFAULT 'other'
);

-- Create materials table
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  price DECIMAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  supplier TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  phone TEXT,
  email TEXT,
  rating DECIMAL DEFAULT 0.0,
  orders_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  delivery_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create estimates table
CREATE TABLE public.estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID,
  title TEXT NOT NULL,
  total_amount DECIMAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until DATE
);

-- Create estimate_items table
CREATE TABLE public.estimate_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  material_id UUID,
  quantity DECIMAL NOT NULL,
  unit_price DECIMAL NOT NULL,
  total DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposals table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID,
  title TEXT NOT NULL,
  amount DECIMAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for tasks
CREATE POLICY "Users can view their own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for materials
CREATE POLICY "Users can view their own materials" ON public.materials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own materials" ON public.materials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own materials" ON public.materials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own materials" ON public.materials FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for suppliers
CREATE POLICY "Users can view their own suppliers" ON public.suppliers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own suppliers" ON public.suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own suppliers" ON public.suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own suppliers" ON public.suppliers FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for estimates
CREATE POLICY "Users can view their own estimates" ON public.estimates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own estimates" ON public.estimates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own estimates" ON public.estimates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own estimates" ON public.estimates FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for estimate_items
CREATE POLICY "Users can view estimate items for their estimates" ON public.estimate_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.estimates WHERE estimates.id = estimate_items.estimate_id AND estimates.user_id = auth.uid()));
CREATE POLICY "Users can create estimate items for their estimates" ON public.estimate_items FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.estimates WHERE estimates.id = estimate_items.estimate_id AND estimates.user_id = auth.uid()));
CREATE POLICY "Users can update estimate items for their estimates" ON public.estimate_items FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.estimates WHERE estimates.id = estimate_items.estimate_id AND estimates.user_id = auth.uid()));
CREATE POLICY "Users can delete estimate items for their estimates" ON public.estimate_items FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.estimates WHERE estimates.id = estimate_items.estimate_id AND estimates.user_id = auth.uid()));

-- Create RLS policies for proposals
CREATE POLICY "Users can view their own proposals" ON public.proposals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own proposals" ON public.proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own proposals" ON public.proposals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own proposals" ON public.proposals FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON public.estimates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();