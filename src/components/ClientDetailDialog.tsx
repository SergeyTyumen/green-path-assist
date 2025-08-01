import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  MessageSquare,
  Edit,
  Save,
  X,
  CheckCircle,
  Clock,
  User,
  Plus,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client, useClients } from '@/hooks/useClients';
import { useClientStages, ClientStage } from '@/hooks/useClientStages';
import { useClientComments, ClientComment } from '@/hooks/useClientComments';

interface ClientDetailDialogProps {
  client: Client;
  children: React.ReactNode;
  onUpdate?: (updatedClient: Client) => void;
  onStageUpdate?: () => void;
}

const getStageColor = (stage: ClientStage, isActive: boolean) => {
  if (stage.completed) return 'bg-green-500 text-white';
  if (isActive) return 'bg-blue-500 text-white';
  return 'bg-gray-200 text-gray-600';
};

const getCommentTypeIcon = (type: ClientComment['comment_type']) => {
  switch (type) {
    case 'call': return <Phone className="h-4 w-4" />;
    case 'meeting': return <User className="h-4 w-4" />;
    case 'email': return <Mail className="h-4 w-4" />;
    case 'message': return <MessageSquare className="h-4 w-4" />;
    default: return <Edit className="h-4 w-4" />;
  }
};

export function ClientDetailDialog({ client, children, onUpdate, onStageUpdate }: ClientDetailDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Client>(client);
  const [newComment, setNewComment] = useState('');
  const [newCommentType, setNewCommentType] = useState<ClientComment['comment_type']>('note');

  // Use real hooks for stages, comments, and client updates
  const { updateClient } = useClients();
  
  const { 
    stages, 
    loading: stagesLoading, 
    updateStageStatus 
  } = useClientStages(client.id);
  
  const { 
    comments, 
    loading: commentsLoading, 
    createComment 
  } = useClientComments(client.id);

  useEffect(() => {
    setEditedClient(client);
  }, [client]);

  const handleSave = async () => {
    const updatedClient = await updateClient(client.id, editedClient);
    if (updatedClient) {
      onUpdate?.(updatedClient);
      setIsEditing(false);
    }
  };

  const handleStageToggle = async (stageId: string) => {
    console.log('🎯 handleStageToggle - клик по стадии:', stageId);
    const stage = stages.find(s => s.id === stageId);
    console.log('📋 Найденная стадия:', stage);
    
    if (stage) {
      console.log('🔄 Переключаем стадию с', stage.completed, 'на', !stage.completed);
      await updateStageStatus(stageId, !stage.completed);
      // Обновляем summary на главной странице
      console.log('🔄 Вызываем onStageUpdate');
      onStageUpdate?.();
    } else {
      console.error('❌ Стадия не найдена для ID:', stageId);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    await createComment(newComment, newCommentType);
    setNewComment('');
    // Обновляем summary на главной странице (последний комментарий)
    onStageUpdate?.();
  };

  // Находим первую невыполненную стадию ПО ПОРЯДКУ
  const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);
  const currentStageIndex = sortedStages.findIndex(stage => !stage.completed);
  
  // Логирование для диагностики
  console.log('🎭 ClientDetailDialog рендерится:', {
    clientId: client.id,
    stagesCount: stages.length,
    currentStageIndex,
    stagesCompleted: stages.filter(s => s.completed).length,
    sortedStages: sortedStages.map(s => `${s.stage_order}:${s.stage_name}(${s.completed ? '✅' : '❌'})`)
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Карточка клиента</span>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" />
                    Сохранить
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-1" />
                    Отмена
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Редактировать
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Полная информация о клиенте и история работы с заявкой
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Информация о клиенте</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Имя</label>
                        <Input
                          value={editedClient.name}
                          onChange={(e) => setEditedClient(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm text-muted-foreground">Имя</div>
                        <div className="font-medium">{client.name}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={`${client.status === 'new' ? 'bg-blue-500' : 
                      client.status === 'in-progress' ? 'bg-yellow-500' : 'bg-green-500'} text-white`}>
                      {client.status === 'new' ? 'Новый' : 
                       client.status === 'in-progress' ? 'В работе' : 'Завершен'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        value={editedClient.phone}
                        onChange={(e) => setEditedClient(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    ) : (
                      <span>{client.phone}</span>
                    )}
                  </div>

                  {(client.email || isEditing) && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {isEditing ? (
                        <Input
                          value={editedClient.email || ''}
                          onChange={(e) => setEditedClient(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Email"
                        />
                      ) : (
                        <span>{client.email}</span>
                      )}
                    </div>
                  )}
                </div>

                {(client.address || isEditing) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    {isEditing ? (
                      <Input
                        value={editedClient.address || ''}
                        onChange={(e) => setEditedClient(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Адрес"
                      />
                    ) : (
                      <span>{client.address}</span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Бюджет</div>
                    <div className="font-medium">₽{client.budget?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Площадь</div>
                    <div className="font-medium">{client.project_area}м²</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-2">Услуги</div>
                  <div className="space-y-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Описание проекта</label>
                        <Textarea
                          value={editedClient.project_description || ''}
                          onChange={(e) => setEditedClient(prev => ({ ...prev, project_description: e.target.value }))}
                          placeholder="Краткое описание проекта/заявки"
                          rows={2}
                        />
                      </div>
                    ) : client.project_description ? (
                      <div className="text-sm text-foreground bg-primary/10 p-3 rounded-lg">
                        {client.project_description}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {client.services.map((service) => (
                        <Badge key={service} variant="secondary">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Stages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Стадии работы с заявкой
                  {stagesLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Загрузка стадий...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedStages.map((stage, index) => (
                      <div
                        key={stage.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer",
                          stage.completed 
                            ? "bg-green-50 border-green-200 text-green-800" 
                            : index === currentStageIndex 
                            ? "bg-blue-50 border-blue-200 text-blue-800"
                            : "bg-gray-50 border-gray-200 text-gray-600"
                        )}
                        onClick={() => handleStageToggle(stage.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium",
                            getStageColor(stage, index === currentStageIndex)
                          )}>
                            {stage.completed ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : index === currentStageIndex ? (
                              <Clock className="h-4 w-4" />
                            ) : (
                              stage.stage_order
                            )}
                          </div>
                          <span className="font-medium">{stage.stage_name}</span>
                        </div>
                        {stage.completed && stage.completed_date && (
                          <div className="text-sm text-muted-foreground">
                            {new Date(stage.completed_date).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  История общения
                  {commentsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new comment */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex gap-2">
                    <Select value={newCommentType} onValueChange={(value) => setNewCommentType(value as ClientComment['comment_type'])}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Тип комментария" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">Заметка</SelectItem>
                        <SelectItem value="call">Звонок</SelectItem>
                        <SelectItem value="meeting">Встреча</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="message">Сообщение</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="Добавить комментарий..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAddComment} size="sm" disabled={!newComment.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить комментарий
                  </Button>
                </div>

                <Separator />

                {/* Comments list */}
                {commentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Загрузка комментариев...</span>
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-l-4 border-primary/20 pl-4 py-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            {getCommentTypeIcon(comment.comment_type)}
                            <span className="capitalize">{comment.comment_type === 'note' ? 'Заметка' : 
                              comment.comment_type === 'call' ? 'Звонок' :
                              comment.comment_type === 'meeting' ? 'Встреча' :
                              comment.comment_type === 'email' ? 'Email' : 'Сообщение'}</span>
                          </div>
                          <span className="text-sm font-medium">{comment.author_name}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <div className="text-sm text-foreground leading-relaxed">
                          {comment.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Пока нет комментариев к этому клиенту
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}