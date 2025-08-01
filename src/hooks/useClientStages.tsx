import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ClientStage {
  id: string;
  client_id: string;
  user_id: string;
  stage_name: string;
  stage_order: number;
  completed: boolean;
  completed_date?: string;
  created_at: string;
  updated_at: string;
}

export function useClientStages(clientId?: string) {
  const [stages, setStages] = useState<ClientStage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStages = async () => {
    if (!user || !clientId) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('client_stages')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('stage_order', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error fetching client stages:', error);
      toast.error('Ошибка при загрузке стадий работы');
    } finally {
      setLoading(false);
    }
  };

  const updateStageStatus = async (stageId: string, completed: boolean) => {
    console.log('🔍 updateStageStatus - начало:', { stageId, completed, user: user?.id });
    
    if (!user) {
      console.error('❌ Пользователь не авторизован');
      return;
    }

    try {
      const updates: Partial<ClientStage> = {
        completed,
        completed_date: completed ? new Date().toISOString() : null
      };

      console.log('📝 Обновления для отправки:', updates);

      const { data, error } = await supabase
        .from('client_stages')
        .update(updates)
        .eq('id', stageId)
        .eq('user_id', user.id)
        .select()
        .single();

      console.log('📊 Ответ Supabase:', { data, error });

      if (error) throw error;
      
      console.log('✅ Обновляем локальное состояние stageId:', stageId);
      setStages(prev => {
        const updated = prev.map(stage => 
          stage.id === stageId ? data : stage
        );
        console.log('📋 Новые стадии:', updated);
        console.log('🎯 Обновленная стадия:', data);
        return updated;
      });
      
      toast.success(completed ? 'Стадия выполнена' : 'Стадия отменена');
      console.log('🎉 updateStageStatus завершено успешно');
      return data;
    } catch (error) {
      console.error('❌ Ошибка обновления стадии:', error);
      toast.error('Ошибка при обновлении стадии: ' + error.message);
    }
  };

  const createCustomStage = async (stageName: string, order: number) => {
    if (!user || !clientId) return;

    try {
      const { data, error } = await supabase
        .from('client_stages')
        .insert({
          client_id: clientId,
          user_id: user.id,
          stage_name: stageName,
          stage_order: order,
          completed: false
        })
        .select()
        .single();

      if (error) throw error;
      
      setStages(prev => [...prev, data].sort((a, b) => a.stage_order - b.stage_order));
      toast.success('Новая стадия добавлена');
      return data;
    } catch (error) {
      console.error('Error creating custom stage:', error);
      toast.error('Ошибка при создании стадии');
    }
  };

  const deleteStage = async (stageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('client_stages')
        .delete()
        .eq('id', stageId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setStages(prev => prev.filter(stage => stage.id !== stageId));
      toast.success('Стадия удалена');
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error('Ошибка при удалении стадии');
    }
  };

  useEffect(() => {
    fetchStages();
  }, [user, clientId]);

  return {
    stages,
    loading,
    updateStageStatus,
    createCustomStage,
    deleteStage,
    refetch: fetchStages
  };
}