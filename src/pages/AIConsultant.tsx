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
  Pause,
  Sparkles,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import { getAIConfigForAssistant } from '@/utils/getAPIKeys';
import WhatsAppIntegrationDialog from '@/components/WhatsAppIntegrationDialog';
import TelegramIntegrationDialog from '@/components/TelegramIntegrationDialog';
import WebsiteWidgetIntegrationDialog from '@/components/WebsiteWidgetIntegrationDialog';
import KnowledgeBaseForm from '@/components/KnowledgeBaseForm';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  source?: 'website' | 'whatsapp' | 'telegram';
  clientId?: string;
  clientName?: string;
  conversationId?: string;
  status?: 'pending' | 'approved' | 'sent';
  originalContent?: string;
  aiImproved?: boolean;
  isRead?: boolean;
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
  const { integrations: integrationStatus, refetch: refetchIntegrations } = useIntegrationStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [createdLeads, setCreatedLeads] = useState<Set<string>>(new Set());
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [myClients, setMyClients] = useState<any[]>([]);
  const [clientComment, setClientComment] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  const [isGeneratingNextActions, setIsGeneratingNextActions] = useState(false);
  const [suggestedNextActions, setSuggestedNextActions] = useState<Array<{title: string, priority: string, category: string}>>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<{
    clientId: string;
    clientName: string;
    conversationId: string;
    source: 'website' | 'whatsapp' | 'telegram';
  } | null>(null);
  const [chatFilter, setChatFilter] = useState<'new' | 'my'>('new');

  // Загрузка настроек автоматического режима
  useEffect(() => {
    if (!user) return;
    
    const loadAutoMode = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('ai_settings')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        
        const aiSettings = data?.ai_settings as any;
        if (aiSettings?.auto_send_enabled !== undefined) {
          setAutoMode(aiSettings.auto_send_enabled);
        }
      } catch (error) {
        console.error('Error loading auto mode:', error);
      }
    };
    
    loadAutoMode();
  }, [user]);

  // Сохранение настроек автоматического режима
  useEffect(() => {
    if (!user) return;

    const saveAutoMode = async () => {
      try {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('ai_settings')
          .eq('user_id', user.id)
          .single();

        const currentSettings = (currentProfile?.ai_settings as any) || {};

        const { error } = await supabase
          .from('profiles')
          .update({
            ai_settings: {
              ...currentSettings,
              auto_send_enabled: autoMode
            }
          })
          .eq('user_id', user.id);

        if (error) throw error;

        console.log('Auto mode saved:', autoMode);
      } catch (error) {
        console.error('Error saving auto mode:', error);
      }
    };

    saveAutoMode();
  }, [autoMode, user]);

  // Загрузка реальных сообщений из базы данных
  useEffect(() => {
    if (!user) return;

    const loadMessages = async () => {
      try {
        // Сначала получаем каналы пользователя
        const { data: userChannels, error: channelsError } = await supabase
          .from('channels')
          .select('id')
          .eq('user_id', user.id);

        if (channelsError) {
          console.error('Error loading channels:', channelsError);
          return;
        }

        if (!userChannels || userChannels.length === 0) {
          console.log('No channels found for user');
          return;
        }

        const channelIds = userChannels.map(ch => ch.id);

        // Загружаем существующих клиентов, чтобы определить какие контакты уже стали лидами
        const { data: existingClients, error: clientsError } = await supabase
          .from('clients')
          .select('lead_source_details')
          .or(`user_id.eq.${user.id},assigned_manager_id.eq.${user.id}`)
          .not('lead_source_details', 'is', null);

        if (clientsError) {
          console.error('Error loading existing clients:', clientsError);
        }

        // Извлекаем contact_id из lead_source_details и заполняем Set
        const existingLeadContactIds = new Set<string>();
        existingClients?.forEach((client: any) => {
          const contactId = client.lead_source_details?.contact_id;
          if (contactId) {
            existingLeadContactIds.add(contactId);
          }
        });
        setCreatedLeads(existingLeadContactIds);

        // Загружаем клиентов для отображения в списке "Мои клиенты"
        const { data: clientsList, error: clientsListError } = await supabase
          .from('clients')
          .select('*')
          .or(`user_id.eq.${user.id},assigned_manager_id.eq.${user.id}`)
          .not('lead_source_details', 'is', null)
          .order('updated_at', { ascending: false });

        if (clientsListError) {
          console.error('Error loading clients list:', clientsListError);
        } else {
          setMyClients(clientsList || []);
        }

        // Загружаем все conversations пользователя с последними сообщениями
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select(`
            id,
            contact_id,
            channel_id,
            contacts (id, name),
            channels (type),
            messages (
              id,
              text,
              direction,
              created_at,
              sent_at,
              provider,
              status,
              payload,
              is_read
            )
          `)
          .in('channel_id', channelIds)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading messages:', error);
          return;
        }

        console.log('Loaded conversations:', conversations?.length || 0);

        // Преобразуем в формат ChatMessage
        const allMessages: ChatMessage[] = [];
        conversations?.forEach((conv: any) => {
          conv.messages?.forEach((msg: any) => {
            allMessages.push({
              id: msg.id,
              type: msg.direction === 'in' ? 'user' : 'assistant',
              content: msg.text || '',
              timestamp: new Date(msg.sent_at || msg.created_at),
              source: conv.channels?.type as 'telegram' | 'whatsapp' | 'website',
              clientId: conv.contact_id,
              clientName: conv.contacts?.name || 'Неизвестный',
              conversationId: conv.id,
              status: msg.status === 'sent' ? 'sent' : 'pending',
              isRead: msg.is_read || false
            });
          });
        });

        // Сортируем по времени
        allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setMessages(allMessages);
      } catch (error) {
        console.error('Error in loadMessages:', error);
      }
    };

    loadMessages();

    // Подписка на новые сообщения
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('New message received:', payload);
          // Добавляем только новое сообщение, не перезагружаем все
          const newMsg = payload.new as any;
          
          // Проверяем, есть ли уже это сообщение в списке
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) {
              return prev; // Уже есть, не добавляем
            }
            
            // Получаем дополнительные данные для отображения
            const loadMessageDetails = async () => {
              try {
                const { data: conversation } = await supabase
                  .from('conversations')
                  .select(`
                    contact_id,
                    contacts (name),
                    channels (type)
                  `)
                  .eq('id', newMsg.conversation_id)
                  .single();
                
                const chatMessage: ChatMessage = {
                  id: newMsg.id,
                  type: newMsg.direction === 'in' ? 'user' : 'assistant',
                  content: newMsg.text || '',
                  timestamp: new Date(newMsg.sent_at || newMsg.created_at),
                  source: conversation?.channels?.type as 'telegram' | 'whatsapp' | 'website',
                  clientId: conversation?.contact_id,
                  clientName: conversation?.contacts?.name || 'Неизвестный',
                  conversationId: newMsg.conversation_id,
                  status: newMsg.status === 'sent' ? 'sent' : 'pending'
                };
                
                setMessages(prev => {
                  // Проверяем еще раз перед добавлением
                  if (prev.some(m => m.id === chatMessage.id)) {
                    return prev;
                  }
                  return [...prev, chatMessage].sort((a, b) => 
                    a.timestamp.getTime() - b.timestamp.getTime()
                  );
                });
              } catch (error) {
                console.error('Error loading message details:', error);
              }
            };
            
            loadMessageDetails();
            return prev; // Вернем текущий массив, обновление произойдет в loadMessageDetails
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
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
  const [manualReply, setManualReply] = useState('');
  const [isProcessingManualReply, setIsProcessingManualReply] = useState(false);
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
      // Вызываем AI Consultant Edge Function
      const { data, error } = await supabase.functions.invoke('ai-consultant', {
        body: {
          question: userMessage,
          context: {
            source: 'website'
          },
          auto_send: autoMode
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message);
      }

      if (data?.success) {
        return data.response;
      } else {
        throw new Error(data?.error || 'Ошибка генерации ответа');
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

  const approveMessage = async (messageId: string) => {
    const message = pendingMessages.find(m => m.id === messageId);
    if (!message || !user) return;

    try {
      // Если есть conversationId, используем его напрямую
      let conversationId = message.conversationId;
      let provider = message.source || 'telegram';
      let chatId: string | null = null;

      if (!conversationId) {
        // Находим последнюю conversation для этого пользователя
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('id, channels!inner(id, type, user_id), messages!inner(payload, direction)')
          .eq('channels.user_id', user.id)
          .order('last_message_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (convError || !conversations) {
          console.error('Ошибка поиска conversation:', convError);
          toast({
            title: "Ошибка",
            description: "Не удалось найти чат с клиентом. Пожалуйста, дождитесь входящего сообщения.",
            variant: "destructive",
          });
          return;
        }

        conversationId = conversations.id;
        const channelData = conversations.channels as any;
        provider = channelData?.type || 'telegram';
        
        // Получаем chat_id из последнего входящего сообщения
        const messages = (conversations as any).messages || [];
        const incomingMessage = messages.find((m: any) => m.direction === 'in');
        chatId = incomingMessage?.payload?.chat_id || incomingMessage?.payload?.from?.id;
      } else {
        // Получаем данные conversation
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('channels!inner(type), messages!inner(payload, direction)')
          .eq('id', conversationId)
          .single();

        if (conversation) {
          const channelData = conversation.channels as any;
          provider = channelData?.type || 'telegram';
          
          // Получаем chat_id из последнего входящего сообщения
          const messages = (conversation as any).messages || [];
          const incomingMessage = messages.find((m: any) => m.direction === 'in');
          chatId = incomingMessage?.payload?.chat_id || incomingMessage?.payload?.from?.id;
        }
      }

      // Сохраняем сообщение в базу данных
      const { data: savedMessage, error: saveError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction: 'out',
          text: message.content,
          status: 'sent',
          provider: provider,
          sent_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (saveError) {
        console.error('Ошибка сохранения сообщения:', saveError);
        throw saveError;
      }

      console.log('Сообщение сохранено в БД:', savedMessage?.id);

      // Отправляем в Telegram (если это Telegram канал)
      if (provider === 'telegram' && chatId) {
        // Вызываем edge function для отправки в Telegram
        const { error: telegramError } = await supabase.functions.invoke('telegram-send-message', {
          body: {
            chat_id: chatId,
            text: message.content
          }
        });

        if (telegramError) {
          console.error('Ошибка отправки в Telegram:', telegramError);
          toast({
            title: "Предупреждение",
            description: "Сообщение сохранено, но не отправлено в Telegram",
            variant: "destructive",
          });
        }
      }

      // Обновляем UI - НЕ добавляем сообщение здесь, оно придет через realtime
      setPendingMessages(prev => prev.filter(m => m.id !== messageId));
      
      toast({
        title: "Сообщение отправлено",
        description: "Ответ отправлен клиенту",
      });
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      });
    }
  };

  const editMessage = (messageId: string, newContent: string) => {
    setPendingMessages(prev => 
      prev.map(m => m.id === messageId ? { ...m, content: newContent } : m)
    );
  };

  // Обработка ручного ответа с AI-ассистированием
  const handleManualReply = async () => {
    if (!manualReply.trim() || !user) return;

    // Проверяем, выбран ли получатель
    if (!selectedRecipient) {
      toast({
        title: "Выберите получателя",
        description: "Пожалуйста, выберите клиента из списка",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingManualReply(true);

    try {
      // Отправляем текст менеджера в AI для улучшения
      const { data, error } = await supabase.functions.invoke('ai-consultant', {
        body: {
          question: `Улучши этот ответ клиенту, сделай его более профессиональным и информативным, но сохрани смысл. Если нужно, добавь недостающую информацию: "${manualReply}"`,
          context: {
            source: 'manual_review'
          },
          auto_send: false
        }
      });

      if (error) {
        console.error('Ошибка AI обработки:', error);
        throw error;
      }

      const aiImprovedVersion = data?.response || manualReply;

      // Создаем два варианта сообщения для модерации
      const manualMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: manualReply,
        timestamp: new Date(),
        status: 'pending',
        originalContent: manualReply,
        conversationId: selectedRecipient.conversationId,
        clientId: selectedRecipient.clientId,
        clientName: selectedRecipient.clientName,
        source: selectedRecipient.source
      };

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiImprovedVersion,
        timestamp: new Date(),
        status: 'pending',
        originalContent: manualReply,
        aiImproved: true,
        conversationId: selectedRecipient.conversationId,
        clientId: selectedRecipient.clientId,
        clientName: selectedRecipient.clientName,
        source: selectedRecipient.source
      };

      // Добавляем оба варианта в очередь модерации
      setPendingMessages(prev => [...prev, manualMessage, aiMessage]);
      setManualReply('');

      toast({
        title: "Варианты ответа готовы",
        description: "Выберите версию для отправки клиенту",
      });
    } catch (error) {
      console.error('Ошибка обработки ответа:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать ответ",
        variant: "destructive",
      });
    } finally {
      setIsProcessingManualReply(false);
    }
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

  const createLeadFromContact = async (contactId: string, contactName: string, source: string) => {
    if (!user) return;

    try {
      // Получаем данные контакта
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('name, phone, email')
        .eq('id', contactId)
        .single();

      if (contactError) throw contactError;

      // Проверяем, существует ли уже клиент с таким контактом
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .or(`phone.eq.${contact.phone},email.eq.${contact.email}`)
        .maybeSingle();

      if (existingClient) {
        toast({
          title: "Клиент уже существует",
          description: `${existingClient.name} уже добавлен в базу клиентов`,
        });
        return;
      }

      // Создаем нового клиента и автоматически назначаем текущего менеджера
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: contact.name || contactName,
          phone: contact.phone || '',
          email: contact.email,
          status: 'new',
          services: [],
          assigned_manager_id: user.id, // Назначаем текущего менеджера
          lead_source_details: {
            source: source,
            contact_id: contactId
          }
        })
        .select()
        .single();

      if (clientError) throw clientError;

      toast({
        title: "Лид создан и назначен вам",
        description: `${newClient.name} добавлен в ваш список клиентов`,
      });

      // Добавляем contactId в список созданных лидов
      setCreatedLeads(prev => new Set(prev).add(contactId));
      
      // Переключаем на вкладку "Мои клиенты"
      setChatFilter('my');
    } catch (error) {
      console.error('Ошибка создания лида:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать лида",
        variant: "destructive",
      });
    }
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

          {/* Фильтр чата */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Фильтр клиентов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={chatFilter} onValueChange={(v) => setChatFilter(v as 'new' | 'my')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="new" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Новые обращения
                    <Badge variant="secondary" className="ml-auto">
                      {messages.filter(m => m.type === 'user' && m.clientId && !createdLeads.has(m.clientId)).length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="my" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Мои клиенты
                    <Badge variant="secondary" className="ml-auto">
                      {messages.filter(m => m.type === 'user' && !m.isRead && m.clientId && createdLeads.has(m.clientId)).length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Ожидающие модерации сообщения */}
          {pendingMessages.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-700">Ожидают модерации ({pendingMessages.length})</CardTitle>
                <CardDescription>
                  Выберите версию сообщения для отправки клиенту
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingMessages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {message.aiImproved ? (
                          <Badge variant="default" className="mt-1">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI улучшенная версия
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="mt-1">
                            <User className="h-3 w-3 mr-1" />
                            Ваша версия
                          </Badge>
                        )}
                      </div>
                      {message.clientName && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{message.clientName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {message.source === 'telegram' && '💬 Telegram'}
                            {message.source === 'whatsapp' && '📱 WhatsApp'}
                            {message.source === 'website' && '🌐 Сайт'}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {message.originalContent && message.originalContent !== message.content && (
                      <div className="bg-muted/50 p-2 rounded text-xs">
                        <span className="font-medium">Исходный текст:</span>
                        <p className="mt-1 text-muted-foreground">{message.originalContent}</p>
                      </div>
                    )}
                    <div className="bg-background border p-3 rounded">
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => approveMessage(message.id)}
                        className="flex-1"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Отправить эту версию
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Редактировать сообщение</DialogTitle>
                          </DialogHeader>
                          <Textarea 
                            defaultValue={message.content}
                            rows={6}
                            onChange={(e) => editMessage(message.id, e.target.value)}
                          />
                          <Button onClick={() => approveMessage(message.id)}>
                            Отправить
                          </Button>
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
              {/* Единый чат клиентов */}
              <Card>
                <CardHeader>
                  <CardTitle>Единый чат клиентов</CardTitle>
                  <CardDescription>
                    Все обращения из Telegram, WhatsApp и сайта
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {messages
                        .filter(message => {
                          // Фильтруем сообщения в зависимости от выбранной вкладки
                          if (chatFilter === 'new') {
                            // Показываем только нераспределенных клиентов
                            return !message.clientId || !createdLeads.has(message.clientId);
                          } else {
                            // Показываем только моих клиентов
                            const isMyClient = message.clientId && createdLeads.has(message.clientId);
                            if (!isMyClient) return false;
                            
                            // Дополнительная фильтрация по выбранному клиенту
                            if (selectedClientId) {
                              const client = myClients.find(c => c.lead_source_details?.contact_id === message.clientId);
                              return client?.id === selectedClientId;
                            }
                            return true;
                          }
                        })
                        .map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === 'user' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.type === 'user'
                                ? 'bg-muted'
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {message.clientName && message.type === 'user' && (
                                <Badge variant="secondary" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {message.clientName}
                                </Badge>
                              )}
                              {message.source && (
                                <Badge variant="outline" className="text-xs">
                                  {message.source === 'telegram' && '📱 Telegram'}
                                  {message.source === 'whatsapp' && '💬 WhatsApp'}
                                  {message.source === 'website' && '🌐 Сайт'}
                                </Badge>
                              )}
                              <span className="text-xs opacity-70">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                            {message.type === 'user' && message.clientId && chatFilter === 'new' && (
                              <Button
                                size="sm"
                                variant={createdLeads.has(message.clientId) ? "default" : "ghost"}
                                className="mt-2 h-6 text-xs"
                                onClick={() => createLeadFromContact(message.clientId!, message.clientName || 'Клиент', message.source || 'telegram')}
                                disabled={createdLeads.has(message.clientId)}
                              >
                                {createdLeads.has(message.clientId) ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    Лид создан
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Создать лида и взять в работу
                                  </>
                                )}
                              </Button>
                            )}
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
                      {messages.filter(m => {
                        if (chatFilter === 'new') {
                          return !m.clientId || !createdLeads.has(m.clientId);
                        } else {
                          return m.clientId && createdLeads.has(m.clientId);
                        }
                      }).filter(m => {
                        if (chatFilter === 'my' && selectedClientId) {
                          const client = myClients.find(c => c.lead_source_details?.contact_id === m.clientId);
                          return client?.id === selectedClientId;
                        }
                        return true;
                      }).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground">
                            {chatFilter === 'new' 
                              ? 'Нет новых обращений' 
                              : 'У вас пока нет клиентов. Создайте лида из новых обращений.'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  {/* Поле для ручного ответа менеджера */}
                  <div className="border-t pt-4 space-y-2">
                    <Label className="text-sm font-medium">Ответить клиенту</Label>
                    
                    {/* Селектор получателя - только для вкладки "Новые обращения" */}
                    {chatFilter === 'new' && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Получатель</Label>
                        <Select
                          value={selectedRecipient?.clientId || ''}
                          onValueChange={(value) => {
                            const recipient = messages
                              .filter(m => m.type === 'user' && m.clientId)
                              .reverse()
                              .find(m => m.clientId === value);
                            if (recipient) {
                              setSelectedRecipient({
                                clientId: recipient.clientId!,
                                clientName: recipient.clientName!,
                                conversationId: recipient.conversationId!,
                                source: recipient.source!
                              });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите клиента для ответа">
                              {selectedRecipient && (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{selectedRecipient.clientName}</span>
                                  <Badge variant="outline" className="ml-auto text-xs">
                                    {selectedRecipient.source === 'telegram' && '💬 Telegram'}
                                    {selectedRecipient.source === 'whatsapp' && '📱 WhatsApp'}
                                    {selectedRecipient.source === 'website' && '🌐 Сайт'}
                                  </Badge>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(new Map(
                              messages
                                .filter(m => {
                                  if (!m.clientId || m.type !== 'user') return false;
                                  return !createdLeads.has(m.clientId);
                                })
                                .reverse()
                                .map(m => [m.clientId, m])
                            ).values()).map((message) => (
                              <SelectItem key={message.clientId} value={message.clientId!}>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{message.clientName}</span>
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {message.source === 'telegram' && '💬 TG'}
                                    {message.source === 'whatsapp' && '📱 WA'}
                                    {message.source === 'website' && '🌐 Web'}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Информация о получателе для вкладки "Мои клиенты" */}
                    {chatFilter === 'my' && selectedRecipient && (
                      <div className="bg-muted/50 rounded-md p-2 flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Вы отвечаете: <span className="font-medium">{selectedRecipient.clientName}</span></span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {selectedRecipient.source === 'telegram' && '💬 Telegram'}
                          {selectedRecipient.source === 'whatsapp' && '📱 WhatsApp'}
                          {selectedRecipient.source === 'website' && '🌐 Сайт'}
                        </Badge>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Textarea
                        value={manualReply}
                        onChange={(e) => setManualReply(e.target.value)}
                        placeholder="Напишите ответ клиенту... AI проверит и предложит улучшенную версию"
                        rows={3}
                        className="flex-1"
                        disabled={!selectedRecipient}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        {autoMode ? '🤖 Авто-режим: AI ответит автоматически' : '✋ Ручной режим: AI предложит варианты для модерации'}
                      </p>
                      <Button 
                        onClick={handleManualReply} 
                        disabled={!manualReply.trim() || isProcessingManualReply || !selectedRecipient}
                        size="sm"
                      >
                        {isProcessingManualReply ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            Обработка...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Подготовить ответ
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Симуляция клиента (для тестирования) */}
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium text-muted-foreground">Симуляция клиента (тестирование)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Симуляция сообщения клиента..."
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <Button onClick={sendMessage} disabled={!inputMessage.trim() || isTyping} variant="outline" size="sm">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {chatFilter === 'my' ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Мои клиенты</CardTitle>
                      <CardDescription>Выберите клиента для просмотра переписки</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {myClients.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Нет клиентов
                            </p>
                          ) : (
                            myClients.map((client) => {
                              const clientMessages = messages.filter(m => {
                                return m.clientId && client.lead_source_details?.contact_id === m.clientId;
                              });
                              const unreadCount = clientMessages.filter(m => m.type === 'user' && !m.isRead).length;
                              
                              return (
                                <Button
                                  key={client.id}
                                  variant={selectedClientId === client.id ? "default" : "ghost"}
                                  className="w-full justify-start text-left h-auto p-3"
                                  onClick={async () => {
                                    setSelectedClientId(client.id);
                                    // Автоматически устанавливаем получателя для ответа
                                    const contactId = client.lead_source_details?.contact_id;
                                    if (contactId) {
                                      const message = messages.find(m => m.clientId === contactId && m.type === 'user');
                                      if (message && message.conversationId) {
                                        setSelectedRecipient({
                                          clientId: message.clientId!,
                                          clientName: message.clientName!,
                                          conversationId: message.conversationId!,
                                          source: message.source!
                                        });
                                        
                                        // Помечаем сообщения как прочитанные
                                        try {
                                          // Используем raw SQL для обновления is_read
                                          const { error: markError } = await supabase
                                            .rpc('mark_messages_as_read' as any, {
                                              p_conversation_id: message.conversationId,
                                              p_user_id: user?.id
                                            } as any);
                                          
                                          if (markError) {
                                            console.error('Error marking messages as read:', markError);
                                          }
                                          
                                          // Обновляем локальное состояние
                                          setMessages(prev => prev.map(m => 
                                            m.conversationId === message.conversationId && m.type === 'user'
                                              ? { ...m, isRead: true }
                                              : m
                                          ));
                                        } catch (error) {
                                          console.error('Error marking messages as read:', error);
                                        }
                                      }
                                    }
                                  }}
                                >
                                  <div className="flex flex-col items-start w-full">
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-medium">{client.name}</span>
                                      {unreadCount > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                          {unreadCount}
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {client.phone}
                                    </span>
                                  </div>
                                </Button>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {selectedClientId && (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Комментарий о переговорах</CardTitle>
                          <CardDescription>Запишите результат общения с клиентом</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Например: Обсудили проект ландшафтного дизайна. Клиент заинтересован в автополиве и газоне. Площадь участка 15 соток..."
                                value={clientComment}
                                onChange={(e) => setClientComment(e.target.value)}
                                rows={4}
                                className="flex-1"
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!selectedRecipient || !user) {
                                  toast({
                                    title: "Выберите чат",
                                    description: "Сначала откройте диалог с клиентом в центральной панели",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                setIsGeneratingComment(true);
                                try {
                                  // Получаем все сообщения открытого чата
                                  const chatMessages = messages.filter(m => 
                                    m.conversationId === selectedRecipient.conversationId
                                  );
                                  
                                  if (chatMessages.length === 0) {
                                    toast({
                                      title: "Нет истории переписки",
                                      description: "Недостаточно сообщений для генерации комментария",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  console.log('Generating summary for:', {
                                    clientName: selectedRecipient.clientName,
                                    messagesCount: chatMessages.length,
                                    conversationId: selectedRecipient.conversationId
                                  });
                                  
                                  const { data, error } = await supabase.functions.invoke('generate-conversation-summary', {
                                    body: {
                                      messages: chatMessages.map(m => ({
                                        type: m.type,
                                        content: m.content
                                      })),
                                      clientName: selectedRecipient.clientName
                                    }
                                  });
                                  
                                  console.log('AI Response:', { data, error });
                                  
                                  if (error) {
                                    console.error('Function error:', error);
                                    throw error;
                                  }
                                  
                                  if (data?.error) {
                                    toast({
                                      title: "Ошибка",
                                      description: data.error,
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  // Получаем summary из ответа
                                  const summary = data?.summary;
                                  
                                  if (!summary || summary.trim() === '') {
                                    console.error('Empty summary received:', data);
                                    toast({
                                      title: "Ошибка",
                                      description: "ИИ вернул пустой комментарий. Попробуйте еще раз.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  setClientComment(summary);
                                  toast({
                                    title: "Комментарий сгенерирован",
                                    description: "Проверьте и отредактируйте комментарий перед сохранением",
                                  });
                                } catch (error) {
                                  console.error('Error generating comment:', error);
                                  toast({
                                    title: "Ошибка",
                                    description: "Не удалось сгенерировать комментарий",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setIsGeneratingComment(false);
                                }
                              }}
                              disabled={!selectedClientId || isGeneratingComment}
                              className="w-full"
                            >
                              {isGeneratingComment ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                  Генерация...
                                </>
                              ) : (
                                <>
                                  <Brain className="h-4 w-4 mr-2" />
                                  Сгенерировать с помощью ИИ
                                </>
                              )}
                            </Button>
                          </div>
                          <Button
                            onClick={async () => {
                              if (!clientComment.trim() || !user) return;
                              
                              setIsSavingComment(true);
                              try {
                                const { error } = await supabase
                                  .from('client_comments')
                                  .insert({
                                    client_id: selectedClientId,
                                    user_id: user.id,
                                    content: clientComment.trim(),
                                    comment_type: 'note',
                                    author_name: user.email || 'Менеджер'
                                  });

                                if (error) throw error;
                                
                                toast({
                                  title: "Комментарий сохранен",
                                  description: "Комментарий добавлен в карточку клиента",
                                });
                                setClientComment('');
                              } catch (error) {
                                console.error('Error saving comment:', error);
                                toast({
                                  title: "Ошибка",
                                  description: "Не удалось сохранить комментарий",
                                  variant: "destructive",
                                });
                              } finally {
                                setIsSavingComment(false);
                              }
                            }}
                            disabled={!clientComment.trim() || isSavingComment}
                            className="w-full"
                          >
                            {isSavingComment ? 'Сохранение...' : 'Сохранить комментарий'}
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Следующее действие</CardTitle>
                          <CardDescription>Запланируйте следующий шаг</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Button 
                            onClick={async () => {
                              if (!selectedClientId || !user) {
                                toast({
                                  title: "Ошибка",
                                  description: "Выберите клиента",
                                  variant: "destructive",
                                });
                                return;
                              }

                              const client = myClients.find(c => c.id === selectedClientId);
                              if (!selectedClientId) {
                                toast({
                                  title: "Ошибка",
                                  description: "Выберите клиента",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              setIsGeneratingNextActions(true);
                              try {
                                const { data, error } = await supabase.functions.invoke('generate-next-action', {
                                  body: {
                                    clientId: selectedClientId,
                                    currentComment: clientComment.trim(),
                                    clientData: {
                                      name: client?.name,
                                      stage: client?.conversion_stage,
                                      phone: client?.phone,
                                      email: client?.email,
                                    }
                                  }
                                });

                                if (error) throw error;
                                
                                if (data?.suggestions) {
                                  setSuggestedNextActions(data.suggestions);
                                  toast({
                                    title: "Готово",
                                    description: `Предложено ${data.suggestions.length} действий`,
                                  });
                                }
                              } catch (error) {
                                console.error('Error generating next actions:', error);
                                toast({
                                  title: "Ошибка",
                                  description: "Не удалось сгенерировать действия",
                                  variant: "destructive",
                                });
                              } finally {
                                setIsGeneratingNextActions(false);
                              }
                            }}
                            disabled={isGeneratingNextActions || !selectedClientId}
                            className="w-full"
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {isGeneratingNextActions ? 'Генерация...' : 'Сгенерировать с помощью ИИ'}
                          </Button>

                          {suggestedNextActions.length > 0 && (
                            <div className="space-y-2">
                              <Label>Предложенные действия</Label>
                              {suggestedNextActions.map((action, index) => (
                                <Card key={index} className="p-3 cursor-pointer hover:bg-accent transition-colors" onClick={() => {
                                  setNextAction(action.title);
                                }}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{action.title}</p>
                                      <div className="flex gap-2 mt-1">
                                        <Badge variant={action.priority === 'high' ? 'destructive' : action.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
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
                            <Label>Описание действия</Label>
                            <Textarea
                              placeholder="Например: Позвонить клиенту для уточнения деталей проекта"
                              value={nextAction}
                              onChange={(e) => setNextAction(e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Дата выполнения</Label>
                            <Input
                              type="date"
                              value={nextActionDate}
                              onChange={(e) => setNextActionDate(e.target.value)}
                            />
                          </div>
                          <Button 
                            onClick={async () => {
                              if (!nextAction.trim() || !user) return;
                              
                              try {
                                const { error } = await supabase
                                  .from('tasks')
                                  .insert({
                                    user_id: user.id,
                                    client_id: selectedClientId,
                                    title: nextAction.trim(),
                                    description: `Следующее действие по клиенту ${myClients.find(c => c.id === selectedClientId)?.name}`,
                                    due_date: nextActionDate || null,
                                    status: 'pending',
                                    priority: 'medium',
                                    category: 'client_follow_up'
                                  });

                                if (error) throw error;
                                
                                toast({
                                  title: "Задача создана",
                                  description: "Следующее действие добавлено в задачи",
                                });
                                setNextAction('');
                                setNextActionDate('');
                                setSuggestedNextActions([]);
                              } catch (error) {
                                console.error('Error creating task:', error);
                                toast({
                                  title: "Ошибка",
                                  description: "Не удалось создать задачу",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={!nextAction.trim()}
                            className="w-full"
                          >
                            Создать задачу
                          </Button>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </>
              ) : (
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
              )}

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
            <Dialog open={isKnowledgeDialogOpen} onOpenChange={(open) => {
              setIsKnowledgeDialogOpen(open);
              if (!open) setEditingKnowledge(null);
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingKnowledge(null)}>
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
                <KnowledgeBaseForm 
                  initialData={editingKnowledge}
                  onSave={(data) => {
                    if (editingKnowledge) {
                      updateKnowledgeItem(editingKnowledge.id, data);
                    } else {
                      addKnowledgeItem({ ...data, is_active: true });
                    }
                    setEditingKnowledge(null);
                    setIsKnowledgeDialogOpen(false);
                  }}
                  onCancel={() => {
                    setEditingKnowledge(null);
                    setIsKnowledgeDialogOpen(false);
                  }}
                />
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
                    <WhatsAppIntegrationDialog 
                      onSettingsChange={refetchIntegrations} 
                      isConfigured={integrationStatus.whatsapp}
                    />
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
                    <TelegramIntegrationDialog 
                      onSettingsChange={refetchIntegrations}
                      isConfigured={integrationStatus.telegram}
                    />
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
                    <WebsiteWidgetIntegrationDialog 
                      onSettingsChange={refetchIntegrations}
                      isConfigured={integrationStatus.website}
                    />
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIConsultant;