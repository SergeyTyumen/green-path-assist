import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  services: string[];
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  last_contact?: string;
  next_action?: string;
  project_area?: number;
  budget?: number;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchClients = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Ошибка при загрузке клиентов');
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...clientData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      setClients(prev => [data, ...prev]);
      toast.success('Клиент успешно добавлен');
      return data;
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Ошибка при создании клиента');
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setClients(prev => prev.map(client => client.id === id ? data : client));
      toast.success('Клиент обновлен');
      return data;
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Ошибка при обновлении клиента');
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setClients(prev => prev.filter(client => client.id !== id));
      toast.success('Клиент удален');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Ошибка при удалении клиента');
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  return {
    clients,
    loading,
    createClient,
    updateClient,
    deleteClient,
    refetch: fetchClients
  };
}