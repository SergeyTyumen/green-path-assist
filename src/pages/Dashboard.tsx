import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calculator, 
  FileText, 
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  Loader2
} from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useTasks } from "@/hooks/useTasks";
import { useEstimates } from "@/hooks/useEstimates";
import { useProposals } from "@/hooks/useProposals";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
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

  const { clients, loading: clientsLoading, createClient } = useClients();
  const { tasks, loading: tasksLoading } = useTasks();
  const { estimates, loading: estimatesLoading } = useEstimates();
  const { proposals, loading: proposalsLoading } = useProposals();

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
      title: "Активные клиенты",
      value: clients.length.toString(),
      change: "+12%",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Сметы в работе",
      value: estimates.filter(e => e.status === 'draft' || e.status === 'sent').length.toString(),
      change: "+3",
      icon: Calculator,
      color: "text-green-600"
    },
    {
      title: "Отправленные КП",
      value: proposals.filter(p => p.status === 'sent').length.toString(),
      change: "+5",
      icon: FileText,
      color: "text-purple-600"
    },
    {
      title: "Общий оборот",
      value: `₽${(proposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0) / 1000000).toFixed(1)}М`,
      change: "+18%",
      icon: TrendingUp,
      color: "text-emerald-600"
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Дашборд</h1>
          <p className="text-muted-foreground mt-1">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-green-600 font-medium">
                {stat.change} за месяц
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Последние клиенты */}
        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Последние клиенты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentClients.map((client, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Задачи на сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayTasks.map((task, index) => (
                <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                  task.priority === 'high' ? 'bg-red-50 border-red-200' :
                  task.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-green-50 border-green-200'
                }`}>
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