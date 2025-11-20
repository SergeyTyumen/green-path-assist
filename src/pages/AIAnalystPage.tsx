import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  DollarSign,
  Users,
  Calendar,
  FileText,
  Lightbulb,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getAIConfigForAssistant } from '@/utils/getAPIKeys';

interface AnalysisReport {
  analysis: string;
  recommendations: string;
  reportType: string;
  generated_at: string;
}

const AIAnalystPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [customRequest, setCustomRequest] = useState('');

  const reportTypes = [
    {
      id: 'sources',
      title: 'Анализ источников лидов',
      description: 'Эффективность каналов привлечения и рекомендации по бюджету',
      icon: Target,
      color: 'bg-blue-500'
    },
    {
      id: 'conversion',
      title: 'Анализ воронки продаж',
      description: 'Конверсия по этапам и способы улучшения',
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      id: 'profitability',
      title: 'Анализ рентабельности',
      description: 'Прибыльность по видам работ и клиентам',
      icon: DollarSign,
      color: 'bg-yellow-500'
    },
    {
      id: 'forecast',
      title: 'Прогноз спроса',
      description: 'Прогноз на следующий сезон с учетом трендов',
      icon: Calendar,
      color: 'bg-purple-500'
    }
  ];

  const generateReport = async (reportType: string) => {
    setLoading(true);
    try {
      // Получаем данные из CRM для анализа
      const { data: clientsData } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      const aiConfig = await getAIConfigForAssistant(user!.id, 'analyst');
      if (!aiConfig?.apiKey) {
        toast({
          title: "API ключ не найден",
          description: "Настройте API ключ в разделе 'Настройки' → 'API Ключи'",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('ai-analyst', {
        body: { 
          request: customRequest || `Создай ${reportTypes.find(t => t.id === reportType)?.title.toLowerCase()}`,
          reportType,
          aiConfig, // Передаем настройки AI
          crmData: {
            clients: clientsData || [],
            totalClients: clientsData?.length || 0,
            leadSources: extractLeadSourcesStats(clientsData || []),
            conversionStages: extractConversionStats(clientsData || []),
            recentActivity: getRecentActivity(clientsData || [])
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setReport(data);
      toast({
        title: 'Отчет готов',
        description: 'ИИ-аналитик подготовил подробный анализ на основе данных CRM',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сгенерировать отчет. Попробуйте еще раз.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Функции для извлечения статистики из CRM
  const extractLeadSourcesStats = (clients: any[]) => {
    const sources = clients.reduce((acc, client) => {
      const source = client.lead_source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(sources).map(([source, count]) => ({
      source,
      count,
      percentage: ((count as number) / clients.length * 100).toFixed(1)
    }));
  };

  const extractConversionStats = (clients: any[]) => {
    const stages = clients.reduce((acc, client) => {
      const stage = client.conversion_stage || 'new';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(stages).map(([stage, count]) => ({
      stage,
      count,
      percentage: ((count as number) / clients.length * 100).toFixed(1)
    }));
  };

  const getRecentActivity = (clients: any[]) => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    return {
      newClientsLastMonth: clients.filter(c => new Date(c.created_at) > lastMonth).length,
      avgLeadQuality: clients.reduce((sum, c) => sum + (c.lead_quality_score || 0), 0) / clients.length,
      topSources: extractLeadSourcesStats(clients).slice(0, 3)
    };
  };

  const generateCustomReport = async () => {
    if (!customRequest.trim()) {
      toast({
        title: 'Введите запрос',
        description: 'Опишите, какой анализ вам нужен',
        variant: 'destructive',
      });
      return;
    }
    await generateReport('general');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
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
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ИИ-Аналитик</h1>
            <p className="text-muted-foreground">Глубокая аналитика бизнеса и рекомендации по развитию</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Готовые отчеты
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reportTypes.map((reportType) => {
              const Icon = reportType.icon;
              return (
                <div key={reportType.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg ${reportType.color} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{reportType.title}</h3>
                      <p className="text-sm text-muted-foreground">{reportType.description}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => generateReport(reportType.id)}
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Создать'}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Custom Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Кастомный анализ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Опишите, какой анализ вам нужен. Например: 'Проанализируй эффективность рекламы в Instagram' или 'Сравни рентабельность проектов по районам'"
              value={customRequest}
              onChange={(e) => setCustomRequest(e.target.value)}
              rows={5}
            />
            <Button 
              onClick={generateCustomReport} 
              disabled={loading || !customRequest.trim()}
              className="w-full"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              Создать анализ
            </Button>
          </CardContent>
        </Card>

        {/* Report Display */}
        {report && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Результат анализа
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {new Date(report.generated_at).toLocaleString('ru-RU')}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Скачать
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                        Анализ
                      </h3>
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{report.analysis}</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        Рекомендации
                      </h3>
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{report.recommendations}</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalystPage;