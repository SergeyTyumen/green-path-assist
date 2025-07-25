import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Brain, 
  Settings, 
  Play,
  Pause,
  RotateCcw,
  Zap,
  FileText,
  Calculator,
  Phone,
  Mail
} from "lucide-react";

interface AIAssistant {
  id: string;
  name: string;
  description: string;
  function: string;
  status: "active" | "inactive" | "training";
  lastUsed?: string;
  usageCount: number;
  accuracy: number;
}

export default function AIAssistants() {
  const assistants: AIAssistant[] = [
    {
      id: "ai-001",
      name: "ИИ-аналитик клиентов",
      description: "Анализирует разговоры с клиентами и автоматически заполняет карточки, выделяет ключевые потребности и предлагает следующие шаги",
      function: "Заполнение карточек клиентов по звонкам и переписке",
      status: "active",
      lastUsed: "2024-07-22",
      usageCount: 156,
      accuracy: 94
    },
    {
      id: "ai-002", 
      name: "ИИ-калькулятор смет",
      description: "Автоматически рассчитывает предварительные сметы на основе типа работ, площади участка и выбранных материалов",
      function: "Расчет предварительных смет по проектам",
      status: "active",
      lastUsed: "2024-07-21",
      usageCount: 89,
      accuracy: 87
    },
    {
      id: "ai-003",
      name: "ИИ-генератор КП",
      description: "Создает персонализированные коммерческие предложения в PDF формате на основе данных сметы и информации о клиенте",
      function: "Генерация коммерческих предложений",
      status: "active",
      lastUsed: "2024-07-20",
      usageCount: 67,
      accuracy: 91
    },
    {
      id: "ai-004",
      name: "ИИ-планировщик задач",
      description: "Автоматически создает задачи по этапам проекта и напоминает о \"спящих\" клиентах, которые давно не выходили на связь",
      function: "Планирование задач и напоминания",
      status: "training",
      lastUsed: "",
      usageCount: 23,
      accuracy: 76
    },
    {
      id: "ai-005",
      name: "ИИ-помощник закупок",
      description: "Анализирует потребности в материалах и автоматически формирует заявки поставщикам с учетом текущих остатков",
      function: "Автоматизация заказов материалов",
      status: "inactive",
      lastUsed: "2024-07-15",
      usageCount: 12,
      accuracy: 82
    }
  ];

  const getStatusBadge = (status: AIAssistant["status"]) => {
    const statusConfig = {
      "active": { label: "Активен", className: "bg-green-100 text-green-700" },
      "inactive": { label: "Неактивен", className: "bg-gray-100 text-gray-700" },
      "training": { label: "Обучается", className: "bg-blue-100 text-blue-700" }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getActionButton = (assistant: AIAssistant) => {
    if (assistant.status === "active") {
      return (
        <Button variant="outline" size="sm" className="gap-2">
          <Pause className="h-4 w-4" />
          Приостановить
        </Button>
      );
    } else if (assistant.status === "inactive") {
      return (
        <Button variant="outline" size="sm" className="gap-2">
          <Play className="h-4 w-4" />
          Активировать
        </Button>
      );
    } else {
      return (
        <Button variant="outline" size="sm" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Переобучить
        </Button>
      );
    }
  };

  const getFunctionIcon = (id: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      "ai-001": <Phone className="h-5 w-5 text-blue-600" />,
      "ai-002": <Calculator className="h-5 w-5 text-green-600" />,
      "ai-003": <FileText className="h-5 w-5 text-purple-600" />,
      "ai-004": <Zap className="h-5 w-5 text-yellow-600" />,
      "ai-005": <Mail className="h-5 w-5 text-indigo-600" />
    };
    return iconMap[id] || <Bot className="h-5 w-5 text-gray-600" />;
  };

  const totalUsage = assistants.reduce((sum, ai) => sum + ai.usageCount, 0);
  const activeAssistants = assistants.filter(ai => ai.status === "active").length;
  const avgAccuracy = Math.round(assistants.reduce((sum, ai) => sum + ai.accuracy, 0) / assistants.length);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ИИ-помощники</h1>
          <p className="text-muted-foreground mt-1">
            Автоматизация рабочих процессов с помощью искусственного интеллекта
          </p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
          <Settings className="h-4 w-4" />
          Общие настройки
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold text-foreground">{activeAssistants}</div>
                <div className="text-sm text-muted-foreground">Активных помощников</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-foreground">{totalUsage}</div>
                <div className="text-sm text-muted-foreground">Всего использований</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-foreground">{avgAccuracy}%</div>
                <div className="text-sm text-muted-foreground">Средняя точность</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список ИИ-помощников */}
      <div className="grid gap-6">
        {assistants.map((assistant) => (
          <Card key={assistant.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  <div className="flex-shrink-0">
                    {getFunctionIcon(assistant.id)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {assistant.name}
                      </h3>
                      {getStatusBadge(assistant.status)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {assistant.description}
                    </p>
                    
                    <div className="text-sm font-medium text-foreground mb-2">
                      Функция: {assistant.function}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Использований: {assistant.usageCount}</span>
                      <span>Точность: {assistant.accuracy}%</span>
                      {assistant.lastUsed && (
                        <span>Последнее использование: {new Date(assistant.lastUsed).toLocaleDateString('ru-RU')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {getActionButton(assistant)}
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Информационное сообщение */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Brain className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Настройка ИИ-помощников
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                ИИ-помощники используют заглушки для демонстрации функциональности. 
                Для полноценной работы потребуется интеграция с внешними AI-сервисами 
                (OpenAI, Anthropic, или собственные модели).
              </p>
              <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                Подробнее о настройке
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}