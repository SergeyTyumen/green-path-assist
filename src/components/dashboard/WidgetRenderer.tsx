import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  MessageCircle, 
  Users, 
  CheckSquare, 
  Calculator, 
  FileText,
  TrendingUp,
  Activity,
  Briefcase,
  Bell
} from 'lucide-react';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import { WidgetId, WidgetSize } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface WidgetRendererProps {
  widgetId: WidgetId;
  size: WidgetSize;
  data: any;
}

export function WidgetRenderer({ widgetId, size, data }: WidgetRendererProps) {
  const navigate = useNavigate();

  switch (widgetId) {
    case 'new_leads':
      return (
        <DashboardWidget
          title="Новые обращения"
          value={data.newRequestsCount}
          description="Требуют обработки"
          icon={MessageSquare}
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
          size={size}
          highlight={data.newRequestsCount > 0}
          onClick={() => navigate('/ai-consultant')}
        />
      );

    case 'new_messages':
      return (
        <DashboardWidget
          title="Новые сообщения"
          value={data.newMessagesCount}
          description="От ваших клиентов"
          icon={MessageCircle}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
          size={size}
          highlight={data.newMessagesCount > 0}
          onClick={() => navigate('/ai-consultant')}
        />
      );

    case 'active_clients':
      return (
        <DashboardWidget
          title="Активные клиенты"
          value={data.clientsCount}
          description={data.statsChanges.clientsChange !== 0 
            ? `${data.statsChanges.clientsChange > 0 ? '+' : ''}${data.statsChanges.clientsChange}%`
            : 'Нет изменений'}
          icon={Users}
          iconColor="text-indigo-600"
          bgColor="bg-indigo-50"
          size={size}
          trend={data.statsChanges.clientsChange}
          onClick={() => navigate('/clients')}
        />
      );

    case 'my_tasks':
      return (
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/tasks')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Мои задачи</CardTitle>
              <CheckSquare className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.todayTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет задач на сегодня</p>
              ) : (
                data.todayTasks.map((task: any) => (
                  <div key={task.id} className="flex items-start justify-between p-2 bg-muted/50 rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                    </div>
                    <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                      {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                    </Badge>
                  </div>
                ))
              )}
              {data.todayTasks.length > 0 && (
                <Button variant="outline" size="sm" className="w-full mt-2">
                  Показать все задачи
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );

    case 'estimates_in_work':
      return (
        <DashboardWidget
          title="Сметы в работе"
          value={data.estimatesInWork}
          description={data.statsChanges.estimatesChange !== 0
            ? `${data.statsChanges.estimatesChange > 0 ? '+' : ''}${data.statsChanges.estimatesChange}`
            : 'Нет изменений'}
          icon={Calculator}
          iconColor="text-green-600"
          bgColor="bg-green-50"
          size={size}
          onClick={() => navigate('/estimates')}
        />
      );

    case 'proposals_sent':
      return (
        <DashboardWidget
          title="Отправленные КП"
          value={data.proposalsSent}
          description={data.statsChanges.proposalsChange !== 0
            ? `${data.statsChanges.proposalsChange > 0 ? '+' : ''}${data.statsChanges.proposalsChange}`
            : 'Нет изменений'}
          icon={FileText}
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
          size={size}
          onClick={() => navigate('/proposals')}
        />
      );

    case 'revenue':
      return (
        <DashboardWidget
          title="Общий оборот"
          value={data.revenue}
          description={data.statsChanges.revenueChange !== 0
            ? `${data.statsChanges.revenueChange > 0 ? '+' : ''}${data.statsChanges.revenueChange}%`
            : 'Нет изменений'}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          bgColor="bg-emerald-50"
          size={size}
          trend={data.statsChanges.revenueChange}
          onClick={() => navigate('/proposals')}
        />
      );

    case 'ai_consultant_stats':
      return (
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/ai-consultant')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">AI Консультант</CardTitle>
              <MessageCircle className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Диалоги сегодня</span>
                <span className="font-bold">{data.consultantStats.todayConversations}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Среднее время ответа</span>
                <span className="font-bold">{data.consultantStats.averageResponseTime}с</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Всего сообщений</span>
                <span className="font-bold">{data.consultantStats.totalMessages}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case 'recent_clients':
      return (
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/clients')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Недавние клиенты</CardTitle>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет клиентов</p>
              ) : (
                data.recentClients.map((client: any) => (
                  <div key={client.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <div>
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.phone}</p>
                    </div>
                    <Badge variant="secondary">{client.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      );

    case 'project_statuses':
      return (
        <Card className="cursor-pointer hover:shadow-md transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Статусы проектов</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Данные проектов...</p>
          </CardContent>
        </Card>
      );

    case 'contractors_status':
      return (
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/contractors')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Подрядчики</CardTitle>
              <Briefcase className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Данные подрядчиков...</p>
          </CardContent>
        </Card>
      );

    case 'ai_notifications':
      return (
        <Card className="cursor-pointer hover:shadow-md transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">AI-уведомления</CardTitle>
              <Bell className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Нет новых уведомлений</p>
          </CardContent>
        </Card>
      );

    default:
      return (
        <Card>
          <CardHeader>
            <CardTitle>Виджет не найден</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Виджет {widgetId} не реализован</p>
          </CardContent>
        </Card>
      );
  }
}
