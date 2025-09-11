import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

// Individual assistant settings components
import { VoiceAssistantSettings } from '@/components/ai-settings/VoiceAssistantSettings';
import { EstimatorSettings } from '@/components/ai-settings/EstimatorSettings';
import { SalesManagerSettings } from '@/components/ai-settings/SalesManagerSettings';
import { AnalystSettings } from '@/components/ai-settings/AnalystSettings';
import { CompetitorAnalysisSettings } from '@/components/ai-settings/CompetitorAnalysisSettings';
import { SupplierManagerSettings } from '@/components/ai-settings/SupplierManagerSettings';
import { ContractorManagerSettings } from '@/components/ai-settings/ContractorManagerSettings';
import { ProposalManagerSettings } from '@/components/ai-settings/ProposalManagerSettings';
import { ConsultantSettings } from '@/components/ai-settings/ConsultantSettings';
import { BaseAISettings } from '@/components/ai-settings/BaseAISettings';

const AIAssistants = () => {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  
  const assistants = [
    {
      id: 'voice-dispatcher',
      name: 'Голосовой ИИ-ассистент',
      description: 'Главный помощник руководителя с голосовым управлением и диспетчеризацией',
      icon: Mic,
      status: 'active',
      features: ['Голосовые команды', 'Управление другими ИИ', 'Диспетчеризация задач', 'Аналитика CRM'],
      color: 'bg-blue-500',
      route: '/voice-chat',
      settingsComponent: 'voice'
    },
    {
      id: 'ai-consultant',
      name: 'ИИ-консультант',
      description: 'Отвечает на вопросы клиентов по услугам, ценам и материалам',
      icon: MessageSquare,
      status: 'active',
      features: ['База услуг и материалов', 'Консультации клиентов', 'Сбор информации'],
      color: 'bg-purple-500',
      route: '/ai-consultant',
      settingsComponent: 'consultant'
    },
    {
      id: 'ai-estimator',
      name: 'ИИ-сметчик',
      description: 'Формирует предварительные и точные сметы по техзаданию',
      icon: FileText,
      status: 'active',
      features: ['Автоматический расчёт объёмов', 'Нормы и коэффициенты', 'Экспорт в PDF/Word'],
      color: 'bg-green-500',
      route: '/ai-estimator',
      settingsComponent: 'estimator'
    },
    {
      id: 'ai-proposal-manager',
      name: 'ИИ-КП-менеджер',
      description: 'Оформляет и отправляет коммерческие предложения заказчикам',
      icon: FileText,
      status: 'active',
      features: ['Оформление КП', 'Автоотправка клиентам', 'Отслеживание статусов'],
      color: 'bg-indigo-500',
      route: '/ai-proposal-manager',
      settingsComponent: 'proposal'
    },
    {
      id: 'ai-sales-manager',
      name: 'ИИ-продажник',
      description: 'Ведение клиентов от заявки до заключения договора',
      icon: Users,
      status: 'active',
      features: ['Определение потребностей', 'Ведение воронки продаж', 'Автоматические напоминания'],
      color: 'bg-orange-500',
      route: '/ai-sales-manager',
      settingsComponent: 'sales'
    },
    {
      id: 'ai-supplier-manager',
      name: 'ИИ-поставщик-менеджер',
      description: 'Находит поставщиков и запрашивает цены по категориям',
      icon: Settings,
      status: 'active',
      features: ['Поиск поставщиков', 'Запрос цен', 'Анализ предложений'],
      color: 'bg-teal-500',
      route: '/ai-supplier-manager',
      settingsComponent: 'supplier'
    },
    {
      id: 'ai-contractor-manager',
      name: 'ИИ-подрядчик-менеджер',
      description: 'Находит исполнителей по видам работ и формирует задания',
      icon: Settings,
      status: 'active',
      features: ['Поиск подрядчиков', 'Формирование заданий', 'Контроль сроков'],
      color: 'bg-cyan-500',
      route: '/ai-contractor-manager',
      settingsComponent: 'contractor'
    },
    {
      id: 'ai-analyst',
      name: 'ИИ-аналитик',
      description: 'Глубокая аналитика бизнеса и прогнозы',
      icon: BarChart3,
      status: 'active',
      features: ['Автоматические отчеты', 'Анализ источников', 'Рекомендации по бюджету'],
      color: 'bg-emerald-500',
      route: '/ai-analyst',
      settingsComponent: 'analyst'
    },
    {
      id: 'competitor-analysis',
      name: 'Анализ конкурентов',
      description: 'Сравнение КП и коррекция предложений',
      icon: Crosshair,
      status: 'active',
      features: ['Сравнение КП', 'Анализ цен', 'Поиск акций конкурентов'],
      color: 'bg-red-500',
      route: '/competitor-analysis',
      settingsComponent: 'competitor'
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

  const openSettings = (assistantId: string) => {
    setSelectedAssistant(assistantId);
    setSettingsOpen(true);
  };

  const renderSettingsComponent = () => {
    if (!selectedAssistant) return null;

    const assistant = assistants.find(a => a.id === selectedAssistant);
    if (!assistant) return null;

    switch (assistant.settingsComponent) {
      case 'voice':
        return <VoiceAssistantSettings />;
      case 'consultant':
        return <ConsultantSettings />;
      case 'estimator':
        return <EstimatorSettings />;
      case 'proposal':
        return <ProposalManagerSettings />;
      case 'sales':
        return <SalesManagerSettings />;
      case 'supplier':
        return <SupplierManagerSettings />;
      case 'contractor':
        return <ContractorManagerSettings />;
      case 'analyst':
        return <AnalystSettings />;
      case 'competitor':
        return <CompetitorAnalysisSettings />;
      default:
        return <BaseAISettings />;
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
            <Card 
              key={assistant.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
              onClick={() => assistant.status !== 'development' && navigate(assistant.route)}
            >
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
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSettings(assistant.id);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Настройки
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAssistant && assistants.find(a => a.id === selectedAssistant)?.name} - Настройки
            </DialogTitle>
          </DialogHeader>
          {renderSettingsComponent()}
        </DialogContent>
      </Dialog>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">9</p>
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

      {/* General Settings Button */}
      <div className="mt-8 flex justify-center">
        <Button 
          variant="outline" 
          onClick={() => navigate('/ai-assistants-settings')}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Общие настройки и API ключи
        </Button>
      </div>
    </div>
  );
};

export default AIAssistants;