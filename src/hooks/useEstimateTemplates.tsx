import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface EstimateTemplate {
  id: string;
  user_id: string;
  name: string;
  work_type: string;
  description?: string;
  template_rows?: any;
  table_structure?: any;
  formulas?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useEstimateTemplates = () => {
  const [templates, setTemplates] = useState<EstimateTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchTemplates = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('estimate_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching estimate templates:', error);
      toast.error('Ошибка загрузки шаблонов смет');
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (templateData: Omit<EstimateTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('estimate_templates')
        .insert([{ ...templateData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchTemplates();
      toast.success('Шаблон сметы создан');
      return data;
    } catch (error) {
      console.error('Error creating estimate template:', error);
      toast.error('Ошибка создания шаблона сметы');
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<EstimateTemplate>) => {
    try {
      const { error } = await supabase
        .from('estimate_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchTemplates();
      toast.success('Шаблон сметы обновлен');
    } catch (error) {
      console.error('Error updating estimate template:', error);
      toast.error('Ошибка обновления шаблона сметы');
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('estimate_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchTemplates();
      toast.success('Шаблон сметы удален');
    } catch (error) {
      console.error('Error deleting estimate template:', error);
      toast.error('Ошибка удаления шаблона сметы');
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  // Realtime подписка на изменения
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('estimate-templates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'estimate_templates'
        },
        () => {
          fetchTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates
  };
};
