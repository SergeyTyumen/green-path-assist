import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ClientSummary {
  client_id: string;
  last_comment?: string;
  last_comment_date?: string;
  current_stage?: string;
  current_stage_date?: string;
  completed_stages_count: number;
  total_stages_count: number;
}

export function useClientSummary() {
  const [summaries, setSummaries] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchClientSummaries = async () => {
    console.log('🔄 useClientSummary.fetchClientSummaries - начало');
    
    if (!user) {
      console.log('❌ useClientSummary: пользователь не авторизован');
      setLoading(false);
      return;
    }
    
    try {
      // Get latest comment for each client
      const { data: latestComments, error: commentsError } = await supabase
        .from('client_comments')
        .select('client_id, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Get current stage info for each client
      const { data: stagesData, error: stagesError } = await supabase
        .from('client_stages')
        .select('client_id, stage_name, completed, completed_date, stage_order')
        .eq('user_id', user.id)
        .order('stage_order', { ascending: true });

      console.log('🔍 SQL запрос стадий выполнен:', { 
        stagesCount: stagesData?.length, 
        stagesError,
        firstFewStages: stagesData?.slice(0, 5)
      });

      if (commentsError) throw commentsError;
      if (stagesError) throw stagesError;

      // Group data by client
      const clientSummaries: { [key: string]: ClientSummary } = {};

      // Process comments
      if (latestComments) {
        const commentsByClient = latestComments.reduce((acc, comment) => {
          if (!acc[comment.client_id]) {
            acc[comment.client_id] = comment;
          }
          return acc;
        }, {} as { [key: string]: typeof latestComments[0] });

        Object.entries(commentsByClient).forEach(([clientId, comment]) => {
          if (!clientSummaries[clientId]) {
            clientSummaries[clientId] = {
              client_id: clientId,
              completed_stages_count: 0,
              total_stages_count: 0
            };
          }
          clientSummaries[clientId].last_comment = comment.content;
          clientSummaries[clientId].last_comment_date = comment.created_at;
        });
      }

      // Process stages
      if (stagesData) {
        console.log('🔄 useClientSummary: обрабатываем stagesData:', stagesData.length, 'стадий');
        console.log('📋 RAW stagesData:', stagesData);
        
        const stagesByClient = stagesData.reduce((acc, stage) => {
          if (!acc[stage.client_id]) {
            acc[stage.client_id] = [];
          }
          acc[stage.client_id].push(stage);
          return acc;
        }, {} as { [key: string]: typeof stagesData });

        console.log('📊 stagesByClient:', stagesByClient);

        Object.entries(stagesByClient).forEach(([clientId, stages]) => {
          console.log(`🎯 Обрабатываем клиента ${clientId}:`, stages.length, 'стадий');
          
          if (!clientSummaries[clientId]) {
            clientSummaries[clientId] = {
              client_id: clientId,
              completed_stages_count: 0,
              total_stages_count: 0
            };
          }

          // Сортируем стадии по порядку
          const sortedStages = stages.sort((a, b) => a.stage_order - b.stage_order);
          const completedStages = sortedStages.filter(s => s.completed);
          const currentStage = sortedStages.find(s => !s.completed); // Первая невыполненная ПО ПОРЯДКУ
          const lastCompletedStage = completedStages
            .sort((a, b) => new Date(b.completed_date || '').getTime() - new Date(a.completed_date || '').getTime())[0];

          console.log(`📈 Клиент ${clientId}:`, {
            total: sortedStages.length,
            completed: completedStages.length,
            completedStageNames: completedStages.map(s => s.stage_name),
            currentStageName: currentStage?.stage_name,
            lastCompletedStageName: lastCompletedStage?.stage_name,
            sortedStageNames: sortedStages.map(s => `${s.stage_order}:${s.stage_name}(${s.completed ? '✅' : '❌'})`)
          });

          clientSummaries[clientId].completed_stages_count = completedStages.length;
          clientSummaries[clientId].total_stages_count = sortedStages.length;
          
          if (currentStage) {
            clientSummaries[clientId].current_stage = currentStage.stage_name;
            // If there's a last completed stage, use its completion date as the start of current stage
            if (lastCompletedStage && lastCompletedStage.completed_date) {
              clientSummaries[clientId].current_stage_date = lastCompletedStage.completed_date;
            }
          } else if (completedStages.length === sortedStages.length && lastCompletedStage) {
            // All stages completed
            clientSummaries[clientId].current_stage = 'Завершен';
            clientSummaries[clientId].current_stage_date = lastCompletedStage.completed_date;
          }
          
          console.log(`✅ Клиент ${clientId} итог:`, clientSummaries[clientId]);
        });
      }

      const summariesArray = Object.values(clientSummaries);
      console.log('✅ useClientSummary: обновляем summaries, найдено:', summariesArray.length);
      console.log('📊 useClientSummary: данные summaries:', summariesArray);
      setSummaries(summariesArray);
    } catch (error) {
      console.error('❌ useClientSummary: ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientSummaries();
  }, [user]);

  const getSummaryForClient = (clientId: string): ClientSummary | undefined => {
    return summaries.find(s => s.client_id === clientId);
  };

  return {
    summaries,
    loading,
    getSummaryForClient,
    refetch: fetchClientSummaries
  };
}