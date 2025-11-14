import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calculator, 
  FileText, 
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  Loader2,
  MessageSquare,
  MessageCircle,
  Activity
} from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useTasks } from "@/hooks/useTasks";
import { useEstimates } from "@/hooks/useEstimates";
import { useProposals } from "@/hooks/useProposals";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    services: [],
    project_description: '',
    status: 'new',
    budget: 0,
    project_area: 0
  });
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [statsChanges, setStatsChanges] = useState({
    clientsChange: 0,
    estimatesChange: 0,
    proposalsChange: 0,
    revenueChange: 0
  });
  const [consultantStats, setConsultantStats] = useState({
    todayConversations: 0,
    averageResponseTime: 0,
    totalMessages: 0
  });

  const { clients, loading: clientsLoading, createClient } = useClients();
  const { tasks, loading: tasksLoading } = useTasks();
  const { estimates, loading: estimatesLoading } = useEstimates();
  const { proposals, loading: proposalsLoading } = useProposals();

  // Расчет изменений статистики
  useEffect(() => {
    if (!user || clientsLoading || estimatesLoading || proposalsLoading) return;

    const calculateChanges = async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      try {
        // Клиенты: сравниваем последние 30 дней с предыдущими 30 днями
        const { data: currentClients } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString());

        const { data: previousClients } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', sixtyDaysAgo.toISOString())
          .lt('created_at', thirtyDaysAgo.toISOString());

        const clientsChange = previousClients?.length 
          ? Math.round(((currentClients?.length || 0) - previousClients.length) / previousClients.length * 100)
          : 0;

        // Сметы в работе: сравниваем текущие с месячной давности
        const { data: currentEstimates } = await supabase
          .from('estimates')
          .select('id')
          .eq('user_id', user.id)
          .in('status', ['draft', 'sent'])
          .gte('created_at', thirtyDaysAgo.toISOString());

        const { data: previousEstimates } = await supabase
          .from('estimates')
          .select('id')
          .eq('user_id', user.id)
          .in('status', ['draft', 'sent'])
          .gte('created_at', sixtyDaysAgo.toISOString())
          .lt('created_at', thirtyDaysAgo.toISOString());

        const estimatesChange = (currentEstimates?.length || 0) - (previousEstimates?.length || 0);

        // Отправленные КП: сравниваем за период
        const { data: currentProposals } = await supabase
          .from('proposals')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'sent')
          .gte('created_at', thirtyDaysAgo.toISOString());

        const { data: previousProposals } = await supabase
          .from('proposals')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'sent')
          .gte('created_at', sixtyDaysAgo.toISOString())
          .lt('created_at', thirtyDaysAgo.toISOString());

        const proposalsChange = (currentProposals?.length || 0) - (previousProposals?.length || 0);

        // Оборот: сравниваем одобренные КП за период
        const { data: currentRevenue } = await supabase
          .from('proposals')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .gte('created_at', thirtyDaysAgo.toISOString());

        const { data: previousRevenue } = await supabase
          .from('proposals')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .gte('created_at', sixtyDaysAgo.toISOString())
          .lt('created_at', thirtyDaysAgo.toISOString());

        const currentRevenueTotal = currentRevenue?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const previousRevenueTotal = previousRevenue?.reduce((sum, p) => sum + p.amount, 0) || 0;
        
        const revenueChange = previousRevenueTotal 
          ? Math.round((currentRevenueTotal - previousRevenueTotal) / previousRevenueTotal * 100)
          : 0;

        setStatsChanges({
          clientsChange,
          estimatesChange,
          proposalsChange,
          revenueChange
        });
      } catch (error) {
        console.error('Error calculating stats changes:', error);
      }
    };

    calculateChanges();
  }, [user, clientsLoading, estimatesLoading, proposalsLoading]);

  // Загрузка уведомлений о новых сообщениях
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        // Получаем все каналы пользователя
        const { data: channels } = await supabase
          .from('channels')
          .select('id')
          .eq('user_id', user.id);

        if (!channels || channels.length === 0) return;

        const channelIds = channels.map(c => c.id);

        // Получаем все неархивные conversations с последними сообщениями
        const { data: conversations } = await supabase
          .from('conversations')
          .select(`
            id,
            contact_id,
            contacts (id, name, phone, email),
            messages (
              id,
              direction,
              created_at,
              is_read
            )
          `)
          .eq('archived', false)
          .in('channel_id', channelIds)
          .order('created_at', { ascending: false });

        if (!conversations) return;

        // Получаем всех клиентов пользователя
        const { data: allClients } = await supabase
          .from('clients')
          .select('id, lead_source_details, assigned_manager_id')
          .eq('user_id', user.id);

        // Создаем Map для быстрого поиска клиентов по contact_id
        const contactToClientMap = new Map();
        allClients?.forEach(client => {
          const sourceDetails = client.lead_source_details as { contact_id?: string } | null;
          const contactId = sourceDetails?.contact_id;
          if (contactId) {
            contactToClientMap.set(contactId, client);
          }
        });

        let newRequests = 0;
        let myClientMessages = 0;

        // Группируем сообщения по conversation_id и проверяем последнее сообщение
        conversations.forEach((conv: any) => {
          if (!conv.messages || conv.messages.length === 0) return;

          // Сортируем сообщения по времени создания
          const sortedMessages = [...conv.messages].sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          // Берем последнее сообщение
          const lastMessage = sortedMessages[sortedMessages.length - 1];

          // Проверяем, является ли последнее сообщение входящим от клиента И непрочитанным
          if (lastMessage.direction === 'in' && !lastMessage.is_read) {
            const client = contactToClientMap.get(conv.contact_id);

            if (!client) {
              // Новое обращение - нет связанного клиента
              newRequests++;
            } else if (client.assigned_manager_id === user.id) {
              // Сообщение от моего клиента
              myClientMessages++;
            }
          }
        });

        setNewRequestsCount(newRequests);
        setNewMessagesCount(myClientMessages);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();

    // Подписка на новые сообщения и изменения статуса прочтения
    const channel = supabase
      .channel('dashboard-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Загрузка статистики AI консультанта
  useEffect(() => {
    if (!user) return;

    const loadConsultantStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Получаем каналы пользователя
        const { data: channels } = await supabase
          .from('channels')
          .select('id')
          .eq('user_id', user.id);

        if (!channels || channels.length === 0) return;

        const channelIds = channels.map(c => c.id);

        // Получаем разговоры за сегодня (неархивные)
        const { data: todayConversations } = await supabase
          .from('conversations')
          .select('id, created_at')
          .eq('archived', false)
          .in('channel_id', channelIds)
          .gte('created_at', today.toISOString());

        // Получаем все сообщения за сегодня
        const { data: todayMessages } = await supabase
          .from('messages')
          .select('id, created_at, direction, conversation_id')
          .gte('created_at', today.toISOString());

        // Фильтруем сообщения, которые относятся к нашим разговорам
        const conversationIds = todayConversations?.map(c => c.id) || [];
        const relevantMessages = todayMessages?.filter(m => 
          conversationIds.includes(m.conversation_id)
        ) || [];

        // Рассчитываем среднее время ответа
        let totalResponseTime = 0;
        let responseCount = 0;

        // Группируем сообщения по conversation_id
        const messagesByConv = relevantMessages.reduce((acc: any, msg: any) => {
          if (!acc[msg.conversation_id]) acc[msg.conversation_id] = [];
          acc[msg.conversation_id].push(msg);
          return acc;
        }, {});

        // Для каждого разговора находим пары входящее->исходящее
        Object.values(messagesByConv).forEach((messages: any) => {
          const sorted = [...messages].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].direction === 'in' && sorted[i + 1].direction === 'out') {
              const inTime = new Date(sorted[i].created_at).getTime();
              const outTime = new Date(sorted[i + 1].created_at).getTime();
              const responseTime = (outTime - inTime) / 1000; // в секундах
              
              if (responseTime > 0 && responseTime < 3600) { // игнорируем ответы > 1 часа
                totalResponseTime += responseTime;
                responseCount++;
              }
            }
          }
        });

        const avgResponseTime = responseCount > 0 
          ? Math.round(totalResponseTime / responseCount)
          : 0;

        setConsultantStats({
          todayConversations: todayConversations?.length || 0,
          averageResponseTime: avgResponseTime,
          totalMessages: relevantMessages.length
        });

      } catch (error) {
        console.error('Error loading consultant stats:', error);
      }
    };

    loadConsultantStats();
  }, [user]);

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone) {
      toast({
        title: "Ошибка",
        description: "Заполните обязательные поля: имя и телефон",
        variant: "destructive"
      });
      return;
    }

    try {
      await createClient(newClient);
      setShowAddClientDialog(false);
      setNewClient({ name: '', phone: '', email: '', services: [], project_description: '', status: 'new', budget: 0, project_area: 0 });
      toast({
        title: "Успешно",
        description: "Клиент добавлен"
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить клиента",
        variant: "destructive"
      });
    }
  };

  const recentClients = clients.slice(0, 4);
  const todayTasks = tasks.filter(task => task.status === 'pending').slice(0, 3);

  const stats = [
    {
      title: "Новые обращения",
      value: newRequestsCount.toString(),
      description: "Требуют обработки",
      icon: MessageSquare,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      onClick: () => navigate('/ai-consultant'),
      highlight: newRequestsCount > 0
    },
    {
      title: "Новые сообщения",
      value: newMessagesCount.toString(),
      description: "От ваших клиентов",
      icon: MessageCircle,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      onClick: () => navigate('/ai-consultant'),
      highlight: newMessagesCount > 0
    },
    {
      title: "Активные клиенты",
      value: clients.length.toString(),
      description: statsChanges.clientsChange !== 0 
        ? `${statsChanges.clientsChange > 0 ? '+' : ''}${statsChanges.clientsChange}%`
        : 'Нет изменений',
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      onClick: () => navigate('/clients')
    },
    {
      title: "Сметы в работе",
      value: estimates.filter(e => e.status === 'draft' || e.status === 'sent').length.toString(),
      description: statsChanges.estimatesChange !== 0
        ? `${statsChanges.estimatesChange > 0 ? '+' : ''}${statsChanges.estimatesChange}`
        : 'Нет изменений',
      icon: Calculator,
      color: "text-green-600",
      bgColor: "bg-green-50",
      onClick: () => navigate('/estimates')
    },
    {
      title: "Отправленные КП",
      value: proposals.filter(p => p.status === 'sent').length.toString(),
      description: statsChanges.proposalsChange !== 0
        ? `${statsChanges.proposalsChange > 0 ? '+' : ''}${statsChanges.proposalsChange}`
        : 'Нет изменений',
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      onClick: () => navigate('/proposals')
    },
    {
      title: "Общий оборот",
      value: `₽${(proposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0) / 1000000).toFixed(1)}М`,
      description: statsChanges.revenueChange !== 0
        ? `${statsChanges.revenueChange > 0 ? '+' : ''}${statsChanges.revenueChange}%`
        : 'Нет изменений',
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      onClick: () => navigate('/proposals')
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "new": { label: "Новый", className: "bg-status-new/10 text-status-new" },
      "proposal-sent": { label: "КП отправлено", className: "bg-status-proposal-sent/10 text-status-proposal-sent" },
      "call-scheduled": { label: "Созвон", className: "bg-status-call-scheduled/10 text-status-call-scheduled" },
      "in-progress": { label: "В работе", className: "bg-status-in-progress/10 text-status-in-progress" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (clientsLoading || tasksLoading || estimatesLoading || proposalsLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка дашборда...</span>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Дашборд</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Обзор активности и ключевые метрики
          </p>
        </div>
        <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              <Plus className="h-4 w-4 mr-2" />
              Добавить клиента
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить нового клиента</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Имя клиента *</Label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Введите имя клиента"
                />
              </div>
              <div>
                <Label htmlFor="phone">Телефон *</Label>
                <Input
                  id="phone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="description">Описание проекта</Label>
                <Textarea
                  id="description"
                  value={newClient.project_description}
                  onChange={(e) => setNewClient({ ...newClient, project_description: e.target.value })}
                  placeholder="Краткое описание потребностей клиента"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddClientDialog(false)}>
                  Отмена
                </Button>
                <Button onClick={handleAddClient}>
                  Добавить клиента
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="relative overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border/50 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={stat.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground font-medium">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* AI Консультант - сводная карточка */}
        <Card 
          className="relative overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border/50 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => navigate('/ai-consultant')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Консультант
            </CardTitle>
            <Activity className="h-5 w-5 text-cyan-600" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Обращений:</span>
              <Badge variant="secondary" className="text-xs">{consultantStats.todayConversations}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Сообщений:</span>
              <Badge variant="secondary" className="text-xs">{consultantStats.totalMessages}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Время:</span>
              <Badge variant="secondary" className="text-xs">
                {consultantStats.averageResponseTime > 0 
                  ? `${consultantStats.averageResponseTime} сек`
                  : '-'
                }
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Последние клиенты */}
        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader 
            className="cursor-pointer hover:bg-accent/20 transition-colors rounded-t-lg"
            onClick={() => navigate('/clients')}
          >
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Последние клиенты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentClients.map((client, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/clients')}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{client.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {client.last_contact ? new Date(client.last_contact).toLocaleDateString() : 'Недавно'}
                    </span>
                  </div>
                  {getStatusBadge(client.status)}
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/clients')}>
              Посмотреть всех клиентов
            </Button>
          </CardContent>
        </Card>

        {/* Задачи на сегодня */}
        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader 
            className="cursor-pointer hover:bg-accent/20 transition-colors rounded-t-lg"
            onClick={() => navigate('/tasks')}
          >
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Задачи на сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayTasks.map((task, index) => (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${
                    task.priority === 'high' ? 'bg-red-50 border-red-200 hover:bg-red-100' :
                    task.priority === 'medium' ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' :
                    'bg-green-50 border-green-200 hover:bg-green-100'
                  }`}
                  onClick={() => navigate('/tasks')}
                >
                  <div className="h-4 w-4">
                    {task.category === 'call' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                    {task.category === 'estimate' && <Calculator className="h-4 w-4 text-blue-600" />}
                    {task.category === 'proposal' && <FileText className="h-4 w-4 text-green-600" />}
                    {task.category === 'other' && <Clock className="h-4 w-4 text-gray-600" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      task.priority === 'high' ? 'text-red-800' :
                      task.priority === 'medium' ? 'text-yellow-800' :
                      'text-green-800'
                    }`}>
                      {task.title}
                    </p>
                    <p className={`text-xs ${
                      task.priority === 'high' ? 'text-red-600' :
                      task.priority === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'} приоритет
                    </p>
                  </div>
                </div>
              ))}
              {todayTasks.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Нет активных задач на сегодня
                </div>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/tasks')}>
              Посмотреть все задачи
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}