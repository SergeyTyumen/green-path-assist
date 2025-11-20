import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Application {
  id: string;
  user_id: string;
  client_id?: string;
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
  project_description?: string;
  conversion_stage?: string;
  stage_changed_at?: string;
  lead_quality_score?: number;
  assigned_manager_id?: string;
  is_completed?: boolean;
  completed_at?: string;
  is_archived?: boolean;
  archived_until?: string;
}

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchApplications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Ошибка загрузки заявок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const createApplication = async (appData: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert([{ ...appData, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      
      setApplications(prev => [data, ...prev]);
      toast.success('Заявка добавлена');
      return data;
    } catch (error) {
      console.error('Error creating application:', error);
      toast.error('Ошибка при добавлении заявки');
      throw error;
    }
  };

  const updateApplication = async (id: string, updates: Partial<Application>) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setApplications(prev => prev.map(a => a.id === id ? data : a));
      toast.success('Заявка обновлена');
      return data;
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Ошибка при обновлении заявки');
      throw error;
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setApplications(prev => prev.filter(a => a.id !== id));
      toast.success('Заявка удалена');
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error('Ошибка при удалении заявки');
      throw error;
    }
  };

  return {
    applications,
    loading,
    createApplication,
    updateApplication,
    deleteApplication,
    refetch: fetchApplications
  };
}
