import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Brain, 
  MessageSquare, 
  BarChart3, 
  FileText, 
  Users, 
  Zap,
  Settings,
  Crosshair,
  Mic
} from 'lucide-react';

const AIAssistants = () => {
  const navigate = useNavigate();
  
  const assistants = [
    {
      id: 'voice-dispatcher',
      name: 'Голосовой ИИ-ассистент',
      description: 'Главный помощник руководителя с голосовым управлением и диспетчеризацией',
      icon: Mic,
      status: 'active',
      features: ['Голосовые команды', 'Управление другими ИИ', 'Диспетчеризация задач', 'Аналитика CRM'],
      color: 'bg-blue-500',
      route: '/voice-chat'
    },
    {
      id: 'tinkoff-voice',
      name: 'Tinkoff VoiceKit',
      description: 'Голосовой ассистент на базе российских технологий Тинькофф',
      icon: Mic,
      status: 'active',
      features: ['STT Tinkoff', 'TTS Tinkoff', 'Voice Activity Detection', 'Непрерывный режим'],
      color: 'bg-yellow-500',
      route: '/tinkoff-voice'
    },
    {
      id: 'ai-consultant',
      name: 'ИИ-консультант',
      description: 'Отвечает на вопросы клиентов по услугам, ценам и материалам',
      icon: MessageSquare,
      status: 'development',
      features: ['База услуг и материалов', 'Консультации клиентов', 'Сбор информации'],
      color: 'bg-purple-500',
      route: '/ai-consultant'
    },
    {
      id: 'ai-estimator',
      name: 'ИИ-сметчик',
      description: 'Формирует предварительные и точные сметы по техзаданию',
      icon: FileText,
      status: 'development',
      features: ['Автоматический расчёт объёмов', 'Нормы и коэффициенты', 'Экспорт в PDF/Word'],
      color: 'bg-green-500',
      route: '/ai-estimator'
    },
    {
      id: 'ai-proposal-manager',
      name: 'ИИ-КП-менеджер',
      description: 'Оформляет и отправляет коммерческие предложения заказчикам',
      icon: FileText,
      status: 'development',
      features: ['Оформление КП', 'Автоотправка клиентам', 'Отслеживание статусов'],
      color: 'bg-indigo-500',
      route: '/ai-proposal-manager'
    },
    {
      id: 'ai-sales-manager',
      name: 'ИИ-продажник',
      description: 'Ведение клиентов от заявки до заключения договора',
      icon: Users,
      status: 'development',
      features: ['Определение потребностей', 'Ведение воронки продаж', 'Автоматические напоминания'],
      color: 'bg-orange-500',
      route: '/ai-sales-manager'
    },
    {
      id: 'ai-supplier-manager',
      name: 'ИИ-поставщик-менеджер',
      description: 'Находит поставщиков и запрашивает цены по категориям',
      icon: Settings,
      status: 'development',
      features: ['Поиск поставщиков', 'Запрос цен', 'Анализ предложений'],
      color: 'bg-teal-500',
      route: '/ai-supplier-manager'
    },
    {
      id: 'ai-contractor-manager',
      name: 'ИИ-подрядчик-менеджер',
      description: 'Находит исполнителей по видам работ и формирует задания',
      icon: Settings,
      status: 'development',
      features: ['Поиск подрядчиков', 'Формирование заданий', 'Контроль сроков'],
      color: 'bg-cyan-500',
      route: '/ai-contractor-manager'
    },
    {
      id: 'ai-analyst',
      name: 'ИИ-аналитик',
      description: 'Глубокая аналитика бизнеса и прогнозы',
      icon: BarChart3,
      status: 'active',
      features: ['Автоматические отчеты', 'Анализ источников', 'Рекомендации по бюджету'],
      color: 'bg-emerald-500',
      route: '/ai-analyst'
    },
    {
      id: 'competitor-analysis',
      name: 'Анализ конкурентов',
      description: 'Сравнение КП и коррекция предложений',
      icon: Crosshair,
      status: 'active',
      features: ['Сравнение КП', 'Анализ цен', 'Поиск акций конкурентов'],
      color: 'bg-red-500',
      route: '/competitor-analysis'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-white';
      case 'demo': return 'bg-gray-500 text-white';
      case 'development': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ИИ-Помощники</h1>
        <p className="text-muted-foreground">
          Управляйте всеми ИИ-помощниками из единого центра
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {assistants.map((assistant) => {
          const Icon = assistant.icon;
          return (
            <Card key={assistant.id} className="hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-lg ${assistant.color} flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{assistant.name}</CardTitle>
                      <Badge variant="secondary" className={getStatusColor(assistant.status)}>
                        {assistant.status === 'active' ? 'Активен' : assistant.status === 'demo' ? 'Демо' : 'В разработке'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <CardDescription className="mb-4 text-sm leading-relaxed">
                  {assistant.description}
                </CardDescription>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Возможности:</h4>
                    <div className="flex flex-wrap gap-2">
                      {assistant.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => navigate(assistant.route)}
                      disabled={assistant.status === 'development'}
                    >
                      {assistant.status === 'development' ? 'В разработке' : 'Открыть'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-muted-foreground">Активных помощника</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">OpenAI</p>
                <p className="text-sm text-muted-foreground">Основная модель</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-sm text-muted-foreground">Готовность системы</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIAssistants;