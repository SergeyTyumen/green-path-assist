import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string;
}

export function useTaskAssignees(taskId?: string) {
  const { user } = useAuth();
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignees = async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('task_assignees')
        .select('*')
        .eq('task_id', taskId)
        .order('assigned_at', { ascending: true });

      if (error) {
        console.error('Error fetching task assignees:', error);
        return;
      }

      setAssignees(data || []);
    } catch (error) {
      console.error('Error fetching task assignees:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignUser = async (userId: string) => {
    if (!user || !taskId) throw new Error('User not authenticated or task ID not provided');

    try {
      const { data, error } = await supabase
        .from('task_assignees')
        .insert({
          task_id: taskId,
          user_id: userId,
          assigned_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error assigning user to task:', error);
        throw error;
      }

      await fetchAssignees();
      return data;
    } catch (error) {
      console.error('Error assigning user to task:', error);
      throw error;
    }
  };

  const unassignUser = async (userId: string) => {
    if (!taskId) throw new Error('Task ID not provided');

    try {
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error unassigning user from task:', error);
        throw error;
      }

      await fetchAssignees();
    } catch (error) {
      console.error('Error unassigning user from task:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchAssignees();
  }, [taskId]);

  return {
    assignees,
    loading,
    assignUser,
    unassignUser,
    refetch: fetchAssignees
  };
}