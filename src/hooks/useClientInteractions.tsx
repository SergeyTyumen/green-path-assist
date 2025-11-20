import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ClientInteraction {
  id: string;
  client_id: string;
  application_id?: string;
  user_id: string;
  interaction_type: string; // 'call' | 'email' | 'meeting' | 'whatsapp' | 'telegram' | 'note'
  direction?: string; // 'inbound' | 'outbound'
  subject?: string;
  description?: string;
  duration_minutes?: number;
  outcome?: string; // 'successful' | 'no_answer' | 'scheduled_callback' | 'negative' | 'positive'
  next_action?: string;
  next_action_date?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export function useClientInteractions(clientId?: string) {
  const [interactions, setInteractions] = useState<ClientInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchInteractions = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('client_interactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Error fetching interactions:', error);
      toast.error('Ошибка загрузки истории взаимодействий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteractions();
  }, [user, clientId]);

  const createInteraction = async (interactionData: Omit<ClientInteraction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('client_interactions')
        .insert([{ ...interactionData, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      
      setInteractions(prev => [data, ...prev]);
      toast.success('Взаимодействие добавлено');
      return data;
    } catch (error) {
      console.error('Error creating interaction:', error);
      toast.error('Ошибка при добавлении взаимодействия');
      throw error;
    }
  };

  const updateInteraction = async (id: string, updates: Partial<ClientInteraction>) => {
    try {
      const { data, error } = await supabase
        .from('client_interactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setInteractions(prev => prev.map(i => i.id === id ? data : i));
      toast.success('Взаимодействие обновлено');
      return data;
    } catch (error) {
      console.error('Error updating interaction:', error);
      toast.error('Ошибка при обновлении');
      throw error;
    }
  };

  const deleteInteraction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('client_interactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setInteractions(prev => prev.filter(i => i.id !== id));
      toast.success('Взаимодействие удалено');
    } catch (error) {
      console.error('Error deleting interaction:', error);
      toast.error('Ошибка при удалении');
      throw error;
    }
  };

  return {
    interactions,
    loading,
    createInteraction,
    updateInteraction,
    deleteInteraction,
    refetch: fetchInteractions
  };
}
