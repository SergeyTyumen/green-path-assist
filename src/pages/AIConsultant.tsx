import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Send, 
  Brain, 
  Zap,
  Settings,
  Database,
  Users,
  Bot,
  Edit3,
  Plus,
  Trash2,
  MessageCircle,
  Send as MessageCircle2,
  Globe,
  Check,
  X,
  Play,
  Pause
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import { getAIConfigForAssistant } from '@/utils/getAPIKeys';
import WhatsAppIntegrationDialog from '@/components/WhatsAppIntegrationDialog';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  source?: 'website' | 'whatsapp' | 'telegram';
  clientId?: string;
  status?: 'pending' | 'approved' | 'sent';
  originalContent?: string;
}

interface KnowledgeItem {
  id: string;
  category: string;
  topic: string;
  content: string;
  keywords: string[];
  priority: number;
  is_active: boolean;
}

interface IntegrationConfig {
  whatsapp: {
    enabled: boolean;
    token?: string;
    webhookUrl?: string;
  };
  telegram: {
    enabled: boolean;
    token?: string;
    webhookUrl?: string;
  };
  website: {
    enabled: boolean;
    widgetCode?: string;
  };
}

const AIConsultant = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: knowledgeBaseItems, loading: kbLoading, createItem, updateItem, deleteItem } = useKnowledgeBase();
  const { integrations: integrationStatus } = useIntegrationStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  
  const [integrations, setIntegrations] = useState<IntegrationConfig>({
    whatsapp: { enabled: integrationStatus.whatsapp },
    telegram: { enabled: integrationStatus.telegram },
    website: { enabled: integrationStatus.website }
  });

  // Обновляем статус интеграций при изменении
  useEffect(() => {
    setIntegrations({
      whatsapp: { enabled: integrationStatus.whatsapp },
      telegram: { enabled: integrationStatus.telegram },
      website: { enabled: integrationStatus.website }
    });
  }, [integrationStatus]);

  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeItem | null>(null);
  const [isKnowledgeDialogOpen, setIsKnowledgeDialogOpen] = useState(false);

  // Быстрые ответы (готовые ответы, а не вопросы)
  const quickReplies = [
    'Здравствуйте! Спасибо за обращение. Я готов ответить на все ваши вопросы о наших услугах.',
    'Для точного расчета стоимости работ нам необходимо произвести замер. Вызов замерщика бесплатный.',
    'Все материалы мы закупаем у проверенных поставщиков с сертификатами качества.',
    'Сроки выполнения работ зависят от объема. Обычно это от 3 до 14 рабочих дней.',
    'На все виды работ мы предоставляем официальную гарантию от 2 до 3 лет.'
  ];

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    try {
      const aiConfig = await getAIConfigForAssistant(user!.id, 'consultant');
      if (!aiConfig?.apiKey) {
        throw new Error('API ключ не найден. Настройте API ключ в разделе настроек.');
      }

      // Вызываем AI Consultant Edge Function
      const { data, error } = await supabase.functions.invoke('ai-consultant', {
        body: {
          question: userMessage,
          context: {
            source: 'website',
            knowledge_base: knowledgeBaseItems
          },
          aiConfig // Передаем настройки AI
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        return data.response;
      } else {
        throw new Error(data.error || 'Ошибка генерации ответа');
      }
    } catch (error) {
      console.error('Error calling AI consultant:', error);
      
      // Fallback: поиск в базе знаний из базы данных
      const relevantKnowledge = knowledgeBaseItems.find(item => 
        item.keywords?.some(keyword => userMessage.toLowerCase().includes(keyword.toLowerCase())) ||
        item.content.toLowerCase().includes(userMessage.toLowerCase().split(' ')[0]) ||
        item.topic.toLowerCase().includes(userMessage.toLowerCase().split(' ')[0])
      );

      if (relevantKnowledge) {
        return relevantKnowledge.content;
      }

      return `Спасибо за ваш вопрос. В данный момент возникли технические трудности. Для получения персональной консультации рекомендую связаться с нашим менеджером по телефону.`;
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      source: 'website'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const aiResponseContent = await generateAIResponse(inputMessage);
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponseContent,
        timestamp: new Date(),
        status: autoMode ? 'sent' : 'pending',
        originalContent: aiResponseContent
      };

      if (autoMode) {
        setMessages(prev => [...prev, aiResponse]);
        toast({
          title: "Сообщение отправлено",
          description: "Ответ автоматически отправлен клиенту",
        });
      } else {
        setPendingMessages(prev => [...prev, aiResponse]);
        toast({
          title: "Ответ сгенерирован",
          description: "Проверьте и отредактируйте ответ перед отправкой",
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать ответ",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const approveMessage = (messageId: string) => {
    const message = pendingMessages.find(m => m.id === messageId);
    if (message) {
      setMessages(prev => [...prev, { ...message, status: 'sent' }]);
      setPendingMessages(prev => prev.filter(m => m.id !== messageId));
      toast({
        title: "Сообщение отправлено",
        description: "Ответ отправлен клиенту",
      });
    }
  };

  const editMessage = (messageId: string, newContent: string) => {
    setPendingMessages(prev => 
      prev.map(m => m.id === messageId ? { ...m, content: newContent } : m)
    );
  };

  const addKnowledgeItem = async (item: Omit<KnowledgeItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    await createItem(item);
  };

  const updateKnowledgeItem = async (id: string, updates: Partial<KnowledgeItem>) => {
    await updateItem(id, updates);
  };

  const deleteKnowledgeItem = async (id: string) => {
    await deleteItem(id);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mr-2"
          >
            ← Назад
          </Button>
          <div className="h-12 w-12 rounded-lg bg-purple-500 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ИИ-Консультант</h1>
            <p className="text-muted-foreground">
              Отвечает на вопросы клиентов по услугам, ценам и материалам
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Brain className="h-3 w-3 mr-1" />
            Активен
          </Badge>
          <Badge variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            OpenAI GPT-4o
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">Консультация</TabsTrigger>
          <TabsTrigger value="knowledge">База знаний</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          {/* Режим работы */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Режим работы</span>
                <div className="flex items-center gap-2">
                  {autoMode ? <Play className="h-4 w-4 text-green-500" /> : <Pause className="h-4 w-4 text-orange-500" />}
                  <Switch checked={autoMode} onCheckedChange={setAutoMode} />
                  <span className="text-sm">{autoMode ? 'Автоматический' : 'Ручной'}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {autoMode 
                  ? 'Сообщения отправляются автоматически без модерации'
                  : 'Каждое сообщение требует подтверждения перед отправкой'
                }
              </p>
            </CardContent>
          </Card>

          {/* Ожидающие модерации сообщения */}
          {pendingMessages.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-700">Ожидают модерации ({pendingMessages.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingMessages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4 space-y-3">
                    <div className="bg-muted p-3 rounded">
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => approveMessage(message.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Отправить
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-3 w-3 mr-1" />
                            Редактировать
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Редактирование ответа</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea 
                              defaultValue={message.content}
                              rows={6}
                              onChange={(e) => editMessage(message.id, e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button onClick={() => approveMessage(message.id)}>
                                Отправить
                              </Button>
                              <Button variant="outline">
                                Отмена
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setPendingMessages(prev => prev.filter(m => m.id !== message.id))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Единый чат клиентов
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className="space-y-2">
                          <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg ${
                              message.type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : message.status === 'sent' 
                                  ? 'bg-green-100 dark:bg-green-900' 
                                  : 'bg-muted'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                {message.source === 'whatsapp' && <MessageCircle className="h-3 w-3 text-green-600" />}
                                {message.source === 'telegram' && <MessageCircle2 className="h-3 w-3 text-blue-600" />}
                                {message.source === 'website' && <Globe className="h-3 w-3 text-gray-600" />}
                                <span className="text-xs opacity-70">
                                  {message.source === 'whatsapp' && 'WhatsApp'}
                                  {message.source === 'telegram' && 'Telegram'}
                                  {message.source === 'website' && 'Сайт'}
                                </span>
                              </div>
                              <p className="text-sm">{message.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted p-3 rounded-lg">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Симуляция сообщения клиента..."
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <Button onClick={sendMessage} disabled={!inputMessage.trim() || isTyping}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Быстрые ответы</CardTitle>
                  <CardDescription>Готовые шаблоны ответов для клиентов</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickReplies.map((reply, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto p-2"
                      onClick={() => setInputMessage(reply)}
                    >
                      <MessageSquare className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="text-xs">{reply.substring(0, 50)}...</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Интеграции</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={integrations.whatsapp.enabled ? "default" : "secondary"}>
                        {integrations.whatsapp.enabled ? "Подключен" : "Не подключен"}
                      </Badge>
                      <WhatsAppIntegrationDialog />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle2 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Telegram</span>
                    </div>
                    <Badge variant={integrations.telegram.enabled ? "default" : "secondary"}>
                      {integrations.telegram.enabled ? "Подключен" : "Не подключен"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">Виджет сайта</span>
                    </div>
                    <Badge variant={integrations.website.enabled ? "default" : "secondary"}>
                      {integrations.website.enabled ? "Подключен" : "Не подключен"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Статистика</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Обращений сегодня</span>
                    <Badge variant="secondary">24</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Средний рейтинг</span>
                    <Badge variant="secondary">4.8/5</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Время ответа</span>
                    <Badge variant="secondary">2 сек</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">База знаний</h2>
            <Dialog open={isKnowledgeDialogOpen} onOpenChange={setIsKnowledgeDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить элемент
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingKnowledge ? 'Редактировать элемент' : 'Добавить элемент'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Категория</Label>
                    <Select defaultValue={editingKnowledge?.category || 'Услуги'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Услуги">Услуги</SelectItem>
                        <SelectItem value="Цены">Цены</SelectItem>
                        <SelectItem value="Материалы">Материалы</SelectItem>
                        <SelectItem value="Гарантии">Гарантии</SelectItem>
                        <SelectItem value="Сроки">Сроки</SelectItem>
                        <SelectItem value="Контакты">Контакты</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Тема/Название</Label>
                    <Input 
                      defaultValue={editingKnowledge?.topic || ''}
                      placeholder="Название темы или услуги"
                    />
                  </div>
                  <div>
                    <Label>Содержание</Label>
                    <Textarea 
                      defaultValue={editingKnowledge?.content || ''}
                      placeholder="Подробная информация по теме: описание, цены, особенности..."
                      className="min-h-[120px]"
                    />
                  </div>
                  <div>
                    <Label>Ключевые слова</Label>
                    <Input 
                      defaultValue={editingKnowledge?.keywords?.join(', ') || ''}
                      placeholder="ключевые слова через запятую"
                    />
                  </div>
                  <div>
                    <Label>Приоритет</Label>
                    <Select defaultValue={editingKnowledge?.priority?.toString() || '1'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите приоритет" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Высокий</SelectItem>
                        <SelectItem value="2">Средний</SelectItem>
                        <SelectItem value="3">Низкий</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => {
                      // В реальном приложении здесь будет сохранение данных из формы
                      if (editingKnowledge) {
                        updateKnowledgeItem(editingKnowledge.id, editingKnowledge);
                      } else {
                        addKnowledgeItem({
                          category: 'Услуги',
                          topic: 'Новая тема',
                          content: 'Новое содержание',
                          keywords: [],
                          priority: 1,
                          is_active: true
                        });
                      }
                      setEditingKnowledge(null);
                      setIsKnowledgeDialogOpen(false);
                    }}>
                      Сохранить
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setEditingKnowledge(null);
                      setIsKnowledgeDialogOpen(false);
                    }}>
                      Отмена
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kbLoading ? (
              <div className="text-center py-8">Загрузка...</div>
            ) : knowledgeBaseItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>База знаний пуста</p>
                <p className="text-sm">Добавьте первый элемент</p>
              </div>
            ) : knowledgeBaseItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setEditingKnowledge(item);
                          setIsKnowledgeDialogOpen(true);
                        }}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteKnowledgeItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="font-medium">Тема:</Label>
                    <p className="text-sm text-muted-foreground mt-1">{item.topic}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Содержание:</Label>
                    <p className="text-sm text-muted-foreground mt-1">{item.content}</p>
                  </div>
                  {item.keywords && item.keywords.length > 0 && (
                    <div>
                      <Label className="font-medium">Ключевые слова:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.keywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="font-medium">Приоритет:</Label>
                    <Badge variant={item.priority === 1 ? "default" : item.priority === 2 ? "secondary" : "outline"} className="ml-2">
                      {item.priority === 1 ? "Высокий" : item.priority === 2 ? "Средний" : "Низкий"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Настройки консультанта
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Промпт системы</Label>
                    <Textarea 
                      className="mt-2"
                      defaultValue="Вы - профессиональный консультант строительной компании. Отвечайте вежливо, информативно и помогайте клиентам с выбором услуг. Используйте информацию из базы знаний для точных ответов о ценах и услугах."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Стиль общения</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button variant="outline" size="sm">Формальный</Button>
                      <Button variant="default" size="sm">Дружелюбный</Button>
                      <Button variant="outline" size="sm">Краткий</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Уведомления о новых обращениях</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Автоматические ответы в нерабочее время</Label>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Интеграции мессенджеров</CardTitle>
                <CardDescription>
                  Настройте подключение к WhatsApp, Telegram и виджету сайта
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">WhatsApp Business</p>
                        <p className="text-sm text-muted-foreground">
                          Подключите WhatsApp API для автоматических ответов
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant={integrations.whatsapp.enabled ? "secondary" : "default"}
                      onClick={() => {
                        setIntegrations(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, enabled: !prev.whatsapp.enabled }
                        }));
                        toast({
                          title: integrations.whatsapp.enabled ? "WhatsApp отключен" : "WhatsApp подключен",
                          description: "Настройки интеграции обновлены",
                        });
                      }}
                    >
                      {integrations.whatsapp.enabled ? "Отключить" : "Подключить"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageCircle2 className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Telegram Bot</p>
                        <p className="text-sm text-muted-foreground">
                          Создайте Telegram бота для консультаций
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant={integrations.telegram.enabled ? "secondary" : "default"}
                      onClick={() => {
                        setIntegrations(prev => ({
                          ...prev,
                          telegram: { ...prev.telegram, enabled: !prev.telegram.enabled }
                        }));
                        toast({
                          title: integrations.telegram.enabled ? "Telegram отключен" : "Telegram подключен",
                          description: "Настройки интеграции обновлены",
                        });
                      }}
                    >
                      {integrations.telegram.enabled ? "Отключить" : "Подключить"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium">Виджет сайта</p>
                        <p className="text-sm text-muted-foreground">
                          Встройте чат-виджет на ваш сайт
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant={integrations.website.enabled ? "secondary" : "default"}
                      onClick={() => {
                        setIntegrations(prev => ({
                          ...prev,
                          website: { ...prev.website, enabled: !prev.website.enabled }
                        }));
                        toast({
                          title: integrations.website.enabled ? "Виджет отключен" : "Виджет подключен",
                          description: "Настройки интеграции обновлены",
                        });
                      }}
                    >
                      {integrations.website.enabled ? "Отключить" : "Подключить"}
                    </Button>
                  </div>
                </div>

                {integrations.website.enabled && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <Label className="text-sm font-medium">Код виджета для вставки на сайт:</Label>
                    <div className="mt-2 p-3 bg-black text-green-400 rounded font-mono text-xs">
                      {`<script src="https://your-domain.com/widget.js"></script>
<div id="ai-consultant-widget"></div>`}
                    </div>
                    <Button variant="outline" size="sm" className="mt-2">
                      Скопировать код
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIConsultant;