import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  comment_type: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

interface ClientCommentManagerProps {
  clientId: string;
  clientName: string;
}

export function ClientCommentManager({ clientId, clientName }: ClientCommentManagerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('client_comments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Ошибка при загрузке комментариев');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('client_comments')
        .insert({
          client_id: clientId,
          user_id: user.id,
          content: newComment.trim(),
          comment_type: 'note',
          author_name: user.email || 'Пользователь'
        })
        .select()
        .single();

      if (error) throw error;
      
      setComments([data, ...comments]);
      setNewComment('');
      toast.success('Комментарий добавлен');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Ошибка при добавлении комментария');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [clientId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('ru-RU')} в ${date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  };

  const getCommentTypeLabel = (type: string) => {
    const types = {
      'note': 'Заметка',
      'status_change': 'Изменение статуса',
      'call': 'Звонок',
      'meeting': 'Встреча'
    };
    return types[type as keyof typeof types] || 'Заметка';
  };

  const getCommentTypeColor = (type: string) => {
    const colors = {
      'note': 'bg-blue-100 text-blue-700',
      'status_change': 'bg-green-100 text-green-700',
      'call': 'bg-orange-100 text-orange-700',
      'meeting': 'bg-purple-100 text-purple-700'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          История работы с клиентом {clientName}
        </h3>
        <span className="text-sm text-muted-foreground">
          {comments.length} записей
        </span>
      </div>

      {/* Форма добавления комментария */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Добавить запись</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Опишите взаимодействие с клиентом, изменения в проекте или важные заметки..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button 
              onClick={addComment}
              disabled={!newComment.trim() || submitting}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              {submitting ? 'Добавление...' : 'Добавить запись'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Список комментариев */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">История взаимодействий</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Загрузка истории...
              </div>
            ) : comments.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                История взаимодействий пуста
              </div>
            ) : (
              <div className="space-y-0">
                {comments.map((comment, index) => (
                  <div key={comment.id}>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getCommentTypeColor(comment.comment_type)}>
                            {getCommentTypeLabel(comment.comment_type)}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {comment.author_name}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(comment.created_at)}
                        </div>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                    {index < comments.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}