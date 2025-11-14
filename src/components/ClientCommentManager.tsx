import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, MessageSquare, Clock, User, Sparkles } from 'lucide-react';
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
  clientData?: {
    stage?: string;
    phone?: string;
    email?: string;
  };
}

export function ClientCommentManager({ clientId, clientName, clientData }: ClientCommentManagerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isGeneratingNextActions, setIsGeneratingNextActions] = useState(false);
  const [suggestedNextActions, setSuggestedNextActions] = useState<any[]>([]);
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
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

  const handleGenerateNextActions = async () => {
    // Проверяем наличие комментариев (текущего или сохранённых)
    const hasCurrentComment = newComment.trim().length > 0;
    const hasSavedComments = comments.length > 0;
    
    if (!hasCurrentComment && !hasSavedComments) {
      toast.error('Напишите комментарий о переговорах для генерации действий');
      return;
    }

    setIsGeneratingNextActions(true);
    try {
      const requestBody = {
        clientId,
        currentComment: newComment.trim(),
        clientData: {
          name: clientName,
          stage: clientData?.stage,
          phone: clientData?.phone,
          email: clientData?.email,
        }
      };

      const { data, error } = await supabase.functions.invoke('generate-next-action', {
        body: requestBody
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestedNextActions(data.suggestions);
        toast.success(`Предложено ${data.suggestions.length} действий`);
      }
    } catch (error) {
      console.error('Error generating next actions:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка генерации действий');
    } finally {
      setIsGeneratingNextActions(false);
    }
  };

  const handleCreateTask = async () => {
    if (!nextAction.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          client_id: clientId,
          title: nextAction.trim(),
          due_date: nextActionDate || null,
          status: 'pending',
          priority: 'medium',
          category: 'other'
        });

      if (error) throw error;

      toast.success('Задача создана');
      setNextAction('');
      setNextActionDate('');
      setSuggestedNextActions([]);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Ошибка при создании задачи');
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
              {submitting ? 'Сохранение...' : 'Добавить запись'}
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
          <div className="max-h-[400px] overflow-y-auto">
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
          </div>
        </CardContent>
      </Card>

      {/* Секция следующих действий */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Следующее действие
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleGenerateNextActions}
            disabled={isGeneratingNextActions}
            className="w-full"
            variant="outline"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isGeneratingNextActions ? 'Генерация...' : 'Сгенерировать с помощью ИИ'}
          </Button>

          {suggestedNextActions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Предложенные действия</Label>
              {suggestedNextActions.map((action, index) => (
                <Card 
                  key={index} 
                  className="p-3 cursor-pointer hover:bg-accent transition-colors" 
                  onClick={() => setNextAction(action.title)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge 
                          variant={action.priority === 'high' ? 'destructive' : action.priority === 'medium' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {action.priority === 'high' ? 'Высокий' : action.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{action.category}</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nextAction">Описание действия</Label>
            <Textarea
              id="nextAction"
              placeholder="Например: Позвонить клиенту для уточнения деталей проекта"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextActionDate">Дата выполнения (опционально)</Label>
            <Input
              id="nextActionDate"
              type="date"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
            />
          </div>

          <Button
            onClick={handleCreateTask}
            disabled={!nextAction.trim()}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать задачу
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
