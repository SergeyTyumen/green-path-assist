import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface EstimateItem {
  id: string;
  estimate_id: string;
  material_id?: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface Estimate {
  id: string;
  user_id: string;
  client_id?: string;
  title: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  valid_until?: string;
  items?: EstimateItem[];
}

export function useEstimates() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchEstimates = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          items:estimate_items(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEstimates((data || []) as Estimate[]);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast.error('Ошибка при загрузке смет');
    } finally {
      setLoading(false);
    }
  };

  const createEstimate = async (estimateData: Omit<Estimate, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'items'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('estimates')
        .insert({
          ...estimateData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      setEstimates(prev => [data as Estimate, ...prev]);
      toast.success('Смета создана');
      return data;
    } catch (error) {
      console.error('Error creating estimate:', error);
      toast.error('Ошибка при создании сметы');
    }
  };

  const updateEstimate = async (id: string, updates: Partial<Estimate>) => {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setEstimates(prev => prev.map(estimate => estimate.id === id ? data as Estimate : estimate));
      toast.success('Смета обновлена');
      return data;
    } catch (error) {
      console.error('Error updating estimate:', error);
      toast.error('Ошибка при обновлении сметы');
    }
  };

  const deleteEstimate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEstimates(prev => prev.filter(estimate => estimate.id !== id));
      toast.success('Смета удалена');
    } catch (error) {
      console.error('Error deleting estimate:', error);
      toast.error('Ошибка при удалении сметы');
    }
  };

  useEffect(() => {
    fetchEstimates();
  }, [user]);

  return {
    estimates,
    loading,
    createEstimate,
    updateEstimate,
    deleteEstimate,
    refetch: fetchEstimates
  };
}