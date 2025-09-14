import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Proposal {
  id: string;
  user_id: string;
  client_id?: string;
  title: string;
  amount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  sent_at?: string;
  expires_at?: string;
}

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProposals = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals((data || []) as Proposal[]);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Ошибка при загрузке предложений');
    } finally {
      setLoading(false);
    }
  };

  const createProposal = async (proposalData: Omit<Proposal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          ...proposalData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      setProposals(prev => [data as Proposal, ...prev]);
      toast.success('Предложение создано');
      return data;
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error('Ошибка при создании предложения');
    }
  };

  const updateProposal = async (id: string, updates: Partial<Proposal>) => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setProposals(prev => prev.map(proposal => proposal.id === id ? data as Proposal : proposal));
      toast.success('Предложение обновлено');
      return data;
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error('Ошибка при обновлении предложения');
    }
  };

  const deleteProposal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProposals(prev => prev.filter(proposal => proposal.id !== id));
      toast.success('Предложение удалено');
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Ошибка при удалении предложения');
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [user]);

  return {
    proposals,
    loading,
    createProposal,
    updateProposal,
    deleteProposal,
    refetch: fetchProposals
  };
}