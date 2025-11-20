import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ClientBase {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  company_name?: string;
  position?: string;
  notes?: string;
  lead_source?: string;
  lead_source_details?: any;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  campaign_id?: string;
  referrer_url?: string;
  created_at: string;
  updated_at: string;
}

export function useClientsBase() {
  const [clients, setClients] = useState<ClientBase[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchClients = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('clients_base')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Ошибка загрузки клиентов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  const createClient = async (clientData: Omit<ClientBase, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('clients_base')
        .insert([{ ...clientData, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      
      setClients(prev => [data, ...prev]);
      toast.success('Клиент добавлен');
      return data;
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Ошибка при добавлении клиента');
      throw error;
    }
  };

  const updateClient = async (id: string, updates: Partial<ClientBase>) => {
    try {
      const { data, error } = await supabase
        .from('clients_base')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setClients(prev => prev.map(c => c.id === id ? data : c));
      toast.success('Данные клиента обновлены');
      return data;
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Ошибка при обновлении данных');
      throw error;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setClients(prev => prev.filter(c => c.id !== id));
      toast.success('Клиент удален');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Ошибка при удалении клиента');
      throw error;
    }
  };

  return {
    clients,
    loading,
    createClient,
    updateClient,
    deleteClient,
    refetch: fetchClients
  };
}
