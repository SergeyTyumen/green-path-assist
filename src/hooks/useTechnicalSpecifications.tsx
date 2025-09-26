import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface TechnicalSpecification {
  id: string;
  user_id: string;
  title: string;
  object_description?: string;
  client_name?: string;
  object_address?: string;
  work_scope?: string;
  materials_spec?: any;
  normative_references?: any;
  quality_requirements?: string;
  timeline?: string;
  safety_requirements?: string;
  acceptance_criteria?: string;
  additional_requirements?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useTechnicalSpecifications = () => {
  const [specifications, setSpecifications] = useState<TechnicalSpecification[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchSpecifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('technical_specifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpecifications(data || []);
    } catch (error) {
      console.error('Error fetching technical specifications:', error);
      toast.error('Ошибка загрузки технических заданий');
    } finally {
      setLoading(false);
    }
  };

  const createSpecification = async (specData: Omit<TechnicalSpecification, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('technical_specifications')
        .insert([{ ...specData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchSpecifications();
      toast.success('Техническое задание сохранено');
      return data;
    } catch (error) {
      console.error('Error creating technical specification:', error);
      toast.error('Ошибка сохранения технического задания');
      return null;
    }
  };

  const updateSpecification = async (id: string, updates: Partial<TechnicalSpecification>) => {
    try {
      const { error } = await supabase
        .from('technical_specifications')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchSpecifications();
      toast.success('Техническое задание обновлено');
    } catch (error) {
      console.error('Error updating technical specification:', error);
      toast.error('Ошибка обновления технического задания');
    }
  };

  const deleteSpecification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('technical_specifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchSpecifications();
      toast.success('Техническое задание удалено');
    } catch (error) {
      console.error('Error deleting technical specification:', error);
      toast.error('Ошибка удаления технического задания');
    }
  };

  useEffect(() => {
    fetchSpecifications();
  }, [user]);

  // Автоматическое обновление списка каждые 5 секунд для синхронизации с голосовым помощником
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchSpecifications();
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  return {
    specifications,
    loading,
    createSpecification,
    updateSpecification,
    deleteSpecification,
    refetch: fetchSpecifications
  };
};