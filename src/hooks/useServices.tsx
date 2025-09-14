import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Service {
  id: string;
  user_id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  description?: string;
  duration_hours: number;
  created_at: string;
  updated_at: string;
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchServices = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Ошибка при загрузке услуг');
    } finally {
      setLoading(false);
    }
  };

  const createService = async (serviceData: Omit<Service, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('services')
        .insert({
          ...serviceData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      setServices(prev => [data, ...prev]);
      toast.success('Услуга добавлена');
      return data;
    } catch (error) {
      console.error('Error creating service:', error);
      toast.error('Ошибка при добавлении услуги');
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    try {
      const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setServices(prev => prev.map(service => service.id === id ? data : service));
      toast.success('Услуга обновлена');
      return data;
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Ошибка при обновлении услуги');
    }
  };

  const deleteService = async (id: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setServices(prev => prev.filter(service => service.id !== id));
      toast.success('Услуга удалена');
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Ошибка при удалении услуги');
    }
  };

  useEffect(() => {
    fetchServices();
  }, [user]);

  return {
    services,
    loading,
    createService,
    updateService,
    deleteService,
    refetch: fetchServices
  };
}