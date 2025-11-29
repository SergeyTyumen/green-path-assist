import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Users, MessageSquare, UserCheck, CheckSquare, 
  FileText, Send, TrendingUp, DollarSign,
  HardHat, UsersRound, Bot, Clock,
  Building2, FolderCheck, AlertCircle
} from 'lucide-react';
import { WidgetId } from '@/types/dashboard';

interface WidgetRendererProps {
  widgetId: WidgetId;
  data: any;
}

export function WidgetRenderer({ widgetId, data }: WidgetRendererProps) {
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
          icon={MessageSquare}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
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
          trend={data.statsChanges.clientsChange}
          onClick={() => navigate('/clients')}
        />
      );

    case 'my_tasks':
      return (
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/tasks')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Мои задачи</CardTitle>
            <div className="rounded-full p-1.5 bg-green-50">
              <CheckSquare className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-2xl font-bold mb-2">{data.tasksStats.total}</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Ожидают</span>
                <Badge variant="secondary" className="text-xs">{data.tasksStats.pending}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">В работе</span>
                <Badge variant="secondary" className="text-xs">{data.tasksStats.inProgress}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Просрочено</span>
                <Badge variant="destructive" className="text-xs">{data.tasksStats.overdue}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t">
                <span className="text-muted-foreground">Высокий приоритет</span>
                <Badge variant="destructive" className="text-xs">{data.tasksStats.highPriority}</Badge>
              </div>
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
          icon={FileText}
          iconColor="text-green-600"
          bgColor="bg-green-50"
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
          icon={Send}
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
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
          icon={DollarSign}
          iconColor="text-emerald-600"
          bgColor="bg-emerald-50"
          trend={data.statsChanges.revenueChange}
          onClick={() => navigate('/proposals')}
        />
      );

    case 'ai_consultant_stats':
      return (
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/ai-consultant')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-medium">AI Консультант</CardTitle>
            <div className="rounded-full p-1.5 bg-blue-50">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Диалоги сегодня</span>
                <span className="font-bold">{data.consultantStats.todayConversations}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Среднее время ответа</span>
                <span className="font-bold">{data.consultantStats.averageResponseTime}с</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Всего сообщений</span>
                <span className="font-bold">{data.consultantStats.totalMessages}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case 'recent_clients':
      return (
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/clients')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Недавние клиенты</CardTitle>
            <div className="rounded-full p-1.5 bg-indigo-50">
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-2">
              {data.recentClients.length === 0 ? (
                <p className="text-xs text-muted-foreground">Нет клиентов</p>
              ) : (
                data.recentClients.slice(0, 3).map((client: any) => (
                  <div key={client.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.phone}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs ml-2">{client.status}</Badge>
                  </div>
                ))
              )}
            </div>
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
