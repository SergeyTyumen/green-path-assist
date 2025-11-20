import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ClientArchive {
  id: string;
  client_id: string;
  user_id: string;
  archive_reason_type: string;
  archive_reason_comment?: string;
  archive_period: number;
  archived_at: string;
  restore_at: string;
  restored_at?: string;
  status: string;
  reminder_type: string;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export function useClientArchives(clientId?: string) {
  const [archives, setArchives] = useState<ClientArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchArchives = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('client_archives')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setArchives(data || []);
    } catch (error) {
      console.error('Error fetching archives:', error);
      toast.error('Ошибка при загрузке архивов');
    } finally {
      setLoading(false);
    }
  };

  const archiveClient = async (
    clientId: string,
    reasonType: string,
    reasonComment: string,
    period: number,
    reminderType: string
  ) => {
    if (!user) return;

    try {
      const archivedAt = new Date();
      const restoreAt = new Date(archivedAt.getTime() + period * 24 * 60 * 60 * 1000);

      // Create archive record
      const { data: archiveData, error: archiveError } = await supabase
        .from('client_archives')
        .insert({
          client_id: clientId,
          user_id: user.id,
          archive_reason_type: reasonType,
          archive_reason_comment: reasonComment,
          archive_period: period,
          restore_at: restoreAt.toISOString(),
          reminder_type: reminderType,
        })
        .select()
        .single();

      if (archiveError) throw archiveError;

      // Update client status
      const { error: clientError } = await supabase
        .from('applications')
        .update({
          status: 'postponed',
          is_archived: true,
          archived_until: restoreAt.toISOString(),
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Add comment to history
      await supabase.from('client_comments').insert({
        client_id: clientId,
        user_id: user.id,
        author_name: 'Система',
        comment_type: 'archive',
        content: `Клиент отправлен в архив на ${period} дней. Причина: ${reasonType}. ${reasonComment || ''}`,
      });

      toast.success('Клиент отправлен в архив');
      await fetchArchives();
      return archiveData;
    } catch (error) {
      console.error('Error archiving client:', error);
      toast.error('Ошибка при архивации клиента');
    }
  };

  const restoreClient = async (archiveId: string, clientId: string) => {
    if (!user) return;

    try {
      // Update archive record
      const { error: archiveError } = await supabase
        .from('client_archives')
        .update({
          status: 'restored',
          restored_at: new Date().toISOString(),
        })
        .eq('id', archiveId);

      if (archiveError) throw archiveError;

      // Update client status
      const { error: clientError } = await supabase
        .from('applications')
        .update({
          is_archived: false,
          archived_until: null,
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Add comment to history
      await supabase.from('client_comments').insert({
        client_id: clientId,
        user_id: user.id,
        author_name: 'Система',
        comment_type: 'restore',
        content: 'Клиент восстановлен из архива',
      });

      toast.success('Клиент восстановлен из архива');
      await fetchArchives();
    } catch (error) {
      console.error('Error restoring client:', error);
      toast.error('Ошибка при восстановлении клиента');
    }
  };

  const getDaysUntilRestore = (restoreAt: string): number => {
    const now = new Date();
    const restore = new Date(restoreAt);
    const diffTime = restore.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  useEffect(() => {
    fetchArchives();
  }, [user, clientId]);

  return {
    archives,
    loading,
    archiveClient,
    restoreClient,
    getDaysUntilRestore,
    refetch: fetchArchives,
  };
}
