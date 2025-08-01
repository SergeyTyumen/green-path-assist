import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ClientComment {
  id: string;
  client_id: string;
  user_id: string;
  content: string;
  comment_type: 'call' | 'meeting' | 'email' | 'message' | 'note';
  author_name: string;
  created_at: string;
  updated_at: string;
}

export function useClientComments(clientId?: string) {
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchComments = async () => {
    if (!user || !clientId) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('client_comments')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching client comments:', error);
      toast.error('Ошибка при загрузке комментариев');
    } finally {
      setLoading(false);
    }
  };

  const createComment = async (
    content: string, 
    commentType: ClientComment['comment_type'] = 'note',
    authorName?: string
  ) => {
    if (!user || !clientId || !content.trim()) return;

    try {
      // Get user profile for author name
      let finalAuthorName = authorName;
      if (!finalAuthorName) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        
        finalAuthorName = profile?.full_name || user.email || 'Пользователь';
      }

      const { data, error } = await supabase
        .from('client_comments')
        .insert({
          client_id: clientId,
          user_id: user.id,
          content: content.trim(),
          comment_type: commentType,
          author_name: finalAuthorName
        })
        .select()
        .single();

      if (error) throw error;
      
      setComments(prev => [data, ...prev]);
      toast.success('Комментарий добавлен');
      return data;
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Ошибка при создании комментария');
    }
  };

  const updateComment = async (commentId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      const { data, error } = await supabase
        .from('client_comments')
        .update({ content: content.trim() })
        .eq('id', commentId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setComments(prev => prev.map(comment => 
        comment.id === commentId ? data : comment
      ));
      
      toast.success('Комментарий обновлен');
      return data;
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Ошибка при обновлении комментария');
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('client_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      toast.success('Комментарий удален');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Ошибка при удалении комментария');
    }
  };

  // Get comments by type
  const getCommentsByType = (type: ClientComment['comment_type']) => {
    return comments.filter(comment => comment.comment_type === type);
  };

  // Get recent comments (last N days)
  const getRecentComments = (days: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return comments.filter(comment => 
      new Date(comment.created_at) > cutoffDate
    );
  };

  useEffect(() => {
    fetchComments();
  }, [user, clientId]);

  return {
    comments,
    loading,
    createComment,
    updateComment,
    deleteComment,
    getCommentsByType,
    getRecentComments,
    refetch: fetchComments
  };
}