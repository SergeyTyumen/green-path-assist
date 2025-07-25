import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calculator, 
  FileText, 
  TrendingUp,
  Clock,
  AlertCircle,
  Plus
} from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      title: "Активные клиенты",
      value: "24",
      change: "+12%",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Сметы в работе",
      value: "8",
      change: "+3",
      icon: Calculator,
      color: "text-green-600"
    },
    {
      title: "Отправленные КП",
      value: "12",
      change: "+5",
      icon: FileText,
      color: "text-purple-600"
    },
    {
      title: "Общий оборот",
      value: "₽2.4М",
      change: "+18%",
      icon: TrendingUp,
      color: "text-emerald-600"
    }
  ];

  const recentClients = [
    { name: "Анна Петрова", status: "new", lastContact: "Сегодня" },
    { name: "ООО Стройком", status: "proposal-sent", lastContact: "2 дня назад" },
    { name: "Михаил Иванов", status: "call-scheduled", lastContact: "3 дня назад" },
    { name: "Дачный кооператив", status: "in-progress", lastContact: "5 дней назад" }
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Дашборд</h1>
          <p className="text-muted-foreground mt-1">
            Обзор активности и ключевые метрики
          </p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
          <Plus className="h-4 w-4 mr-2" />
          Добавить клиента
        </Button>
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
                    <span className="text-sm text-muted-foreground">{client.lastContact}</span>
                  </div>
                  {getStatusBadge(client.status)}
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
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
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    Связаться с Анной Петровой
                  </p>
                  <p className="text-xs text-yellow-600">
                    Высокий приоритет
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Calculator className="h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    Подготовить смету для ООО Стройком
                  </p>
                  <p className="text-xs text-blue-600">
                    Средний приоритет
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <FileText className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    Отправить КП по автополиву
                  </p>
                  <p className="text-xs text-green-600">
                    Низкий приоритет
                  </p>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              Посмотреть все задачи
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}