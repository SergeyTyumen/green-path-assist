import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CompletedProject {
  id: string;
  client_id: string;
  user_id: string;
  client_name: string;
  final_amount: number;
  completion_date: string;
  actual_area?: number;
  services: string[];
  project_duration_days?: number;
  client_feedback?: string;
  client_rating?: number;
  payment_status: string;
  notes?: string;
  before_photos?: string[];
  after_photos?: string[];
  created_at: string;
  updated_at: string;
}

export function useCompletedProjects() {
  const [projects, setProjects] = useState<CompletedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProjects = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('completed_projects')
        .select('*')
        .order('completion_date', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching completed projects:', error);
      toast.error('Ошибка при загрузке завершенных проектов');
    } finally {
      setLoading(false);
    }
  };

  const completeProject = async (
    clientId: string,
    clientName: string,
    finalAmount: number,
    actualArea: number | undefined,
    services: string[],
    clientFeedback: string,
    clientRating: number,
    paymentStatus: string,
    notes: string,
    clientCreatedAt: string
  ) => {
    if (!user) return;

    try {
      const completionDate = new Date();
      const createdDate = new Date(clientCreatedAt);
      const durationDays = Math.floor(
        (completionDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create completed project record
      const { data: projectData, error: projectError } = await supabase
        .from('completed_projects')
        .insert({
          client_id: clientId,
          user_id: user.id,
          client_name: clientName,
          final_amount: finalAmount,
          completion_date: completionDate.toISOString(),
          actual_area: actualArea,
          services: services,
          project_duration_days: durationDays,
          client_feedback: clientFeedback,
          client_rating: clientRating,
          payment_status: paymentStatus,
          notes: notes,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Update client status
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          status: 'completed',
          is_completed: true,
          completed_at: completionDate.toISOString(),
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Add comment to history
      await supabase.from('client_comments').insert({
        client_id: clientId,
        user_id: user.id,
        author_name: 'Система',
        comment_type: 'completion',
        content: `Проект успешно завершен. Сумма: ₽${finalAmount.toLocaleString()}. Длительность: ${durationDays} дней. Оценка: ${clientRating}/5`,
      });

      toast.success('Проект завершен и добавлен в реализованные');
      await fetchProjects();
      return projectData;
    } catch (error) {
      console.error('Error completing project:', error);
      toast.error('Ошибка при завершении проекта');
    }
  };

  const updateProject = async (id: string, updates: Partial<CompletedProject>) => {
    try {
      const { data, error } = await supabase
        .from('completed_projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === id ? data : p));
      toast.success('Проект обновлен');
      return data;
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Ошибка при обновлении проекта');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  return {
    projects,
    loading,
    completeProject,
    updateProject,
    refetch: fetchProjects,
  };
}
