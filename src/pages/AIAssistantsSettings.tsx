import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, Brain, Mic, Calculator, BarChart3, TrendingUp, Users, FileText, Building } from "lucide-react";
import { BaseAISettings } from "@/components/ai-settings/BaseAISettings";
import { VoiceAssistantSettings } from "@/components/ai-settings/VoiceAssistantSettings";
import { EstimatorSettings } from "@/components/ai-settings/EstimatorSettings";
import { SalesManagerSettings } from "@/components/ai-settings/SalesManagerSettings";
import { AnalystSettings } from "@/components/ai-settings/AnalystSettings";
import { CompetitorAnalysisSettings } from "@/components/ai-settings/CompetitorAnalysisSettings";
import { SupplierManagerSettings } from "@/components/ai-settings/SupplierManagerSettings";
import { ContractorManagerSettings } from "@/components/ai-settings/ContractorManagerSettings";
import { ProposalManagerSettings } from "@/components/ai-settings/ProposalManagerSettings";
import { ConsultantSettings } from "@/components/ai-settings/ConsultantSettings";

const assistants = [
  {
    id: "base",
    name: "Базовые настройки AI",
    description: "Общие настройки для всех ассистентов",
    icon: Brain,
    category: "core",
    priority: 1
  },
  {
    id: "voice",
    name: "Голосовой ассистент",
    description: "Настройки голосового взаимодействия",
    icon: Mic,
    category: "interaction",
    priority: 2
  },
  {
    id: "estimator",
    name: "AI Оценщик",
    description: "Автоматическое составление смет",
    icon: Calculator,
    category: "business",
    priority: 3
  },
  {
    id: "sales",
    name: "AI Менеджер продаж",
    description: "Управление продажами и клиентами",
    icon: TrendingUp,
    category: "business",
    priority: 4
  },
  {
    id: "analyst",
    name: "AI Аналитик",
    description: "Анализ данных и отчеты",
    icon: BarChart3,
    category: "analytics",
    priority: 5
  },
  {
    id: "competitor",
    name: "Анализ конкурентов",
    description: "Мониторинг и анализ конкурентов",
    icon: TrendingUp,
    category: "analytics",
    priority: 6
  },
  {
    id: "supplier",
    name: "AI Менеджер поставщиков",
    description: "Управление поставщиками",
    icon: Building,
    category: "business",
    priority: 7
  },
  {
    id: "contractor",
    name: "AI Менеджер подрядчиков",
    description: "Поиск и управление подрядчиками",
    icon: Users,
    category: "business",
    priority: 8
  },
  {
    id: "proposal",
    name: "AI Менеджер предложений",
    description: "Создание коммерческих предложений",
    icon: FileText,
    category: "business",
    priority: 9
  }
];

const categoryLabels = {
  core: "Основные",
  interaction: "Взаимодействие", 
  business: "Бизнес-процессы",
  analytics: "Аналитика"
};

const AIAssistantsSettings = () => {
  const [activeAssistant, setActiveAssistant] = useState("base");

  const renderAssistantSettings = () => {
    switch (activeAssistant) {
      case "base":
        return <BaseAISettings />;
      case "voice":
        return <VoiceAssistantSettings />;
      case "estimator":
        return <EstimatorSettings />;
      case "sales":
        return <SalesManagerSettings />;
      case "analyst":
        return <AnalystSettings />;
      case "competitor":
        return <CompetitorAnalysisSettings />;
      case "supplier":
        return <SupplierManagerSettings />;
      case "contractor":
        return <ContractorManagerSettings />;
      case "proposal":
        return <ProposalManagerSettings />;
      case "consultant":
        return <ConsultantSettings />;
      default:
        return <BaseAISettings />;
    }
  };

  const groupedAssistants = assistants.reduce((acc, assistant) => {
    if (!acc[assistant.category]) {
      acc[assistant.category] = [];
    }
    acc[assistant.category].push(assistant);
    return acc;
  }, {} as Record<string, typeof assistants>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Настройки AI Ассистентов</h1>
          <p className="text-muted-foreground">
            Конфигурация и персонализация AI помощников для вашего бизнеса
          </p>
        </div>
      </div>

      <Tabs value={activeAssistant} onValueChange={setActiveAssistant} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Боковая панель с ассистентами */}
          <div className="lg:col-span-1">
            <TabsList className="flex flex-col h-auto w-full p-1 bg-background border">
              {Object.entries(groupedAssistants).map(([category, categoryAssistants]) => (
                <div key={category} className="w-full space-y-1">
                  <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </div>
                  {categoryAssistants.map((assistant) => {
                    const Icon = assistant.icon;
                    return (
                      <TabsTrigger
                        key={assistant.id}
                        value={assistant.id}
                        className="w-full justify-start h-auto p-3 data-[state=active]:bg-primary/10"
                      >
                        <div className="flex items-start gap-3 w-full">
                          <Icon className="h-5 w-5 mt-0.5 text-primary" />
                          <div className="text-left">
                            <div className="font-medium text-sm">{assistant.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {assistant.description}
                            </div>
                          </div>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </div>
              ))}
            </TabsList>
          </div>

          {/* Основная область настроек */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {(() => {
                    const assistant = assistants.find(a => a.id === activeAssistant);
                    const Icon = assistant?.icon || Brain;
                    return (
                      <>
                        <Icon className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {assistant?.name}
                            <Badge variant="secondary" className="text-xs">
                              Приоритет {assistant?.priority}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {assistant?.description}
                          </CardDescription>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent>
                {renderAssistantSettings()}
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default AIAssistantsSettings;