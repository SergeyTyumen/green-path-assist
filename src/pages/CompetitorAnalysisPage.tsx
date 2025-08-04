import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Crosshair, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  RefreshCw,
  Eye,
  Zap,
  Building,
  Search,
  BarChart3,
  Calendar,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CompetitorForm from '@/components/CompetitorForm';
import CompetitorAnalysisTools from '@/components/CompetitorAnalysisTools';

interface CompetitorAnalysis {
  analysis: string;
  actionPlan: string;
  analysisType: string;
  competitorAnalyzed: boolean;
  ourProposalAnalyzed: boolean;
  generated_at: string;
}

const CompetitorAnalysisPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [competitorProposal, setCompetitorProposal] = useState('');
  const [ourProposal, setOurProposal] = useState('');

  const analyzeCompetitor = async (analysisType: 'comparison' | 'competitor_only') => {
    if (analysisType === 'comparison' && (!competitorProposal.trim() || !ourProposal.trim())) {
      toast({
        title: 'Заполните оба поля',
        description: 'Для сравнения нужны оба КП - наше и конкурента',
        variant: 'destructive',
      });
      return;
    }

    if (analysisType === 'competitor_only' && !competitorProposal.trim()) {
      toast({
        title: 'Загрузите КП конкурента',
        description: 'Введите или вставьте текст коммерческого предложения',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('competitor-analysis', {
        body: { 
          competitorProposal,
          ourProposal: analysisType === 'comparison' ? ourProposal : undefined,
          analysisType 
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setAnalysis(data);
      toast({
        title: 'Анализ готов',
        description: 'Конкурентный анализ завершен успешно',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось провести анализ. Попробуйте еще раз.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <Crosshair className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Конкурентный анализ</h1>
            <p className="text-muted-foreground">Анализ предложений конкурентов и улучшение ваших КП</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="analysis">КП Анализ</TabsTrigger>
          <TabsTrigger value="competitors">База конкурентов</TabsTrigger>
          <TabsTrigger value="monitoring">Мониторинг</TabsTrigger>
          <TabsTrigger value="trends">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Input Section */}
            <div className="xl:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Загрузка КП
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="comparison" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="comparison">Сравнение</TabsTrigger>
                  <TabsTrigger value="competitor">Только конкурент</TabsTrigger>
                </TabsList>
                
                <TabsContent value="comparison" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">КП конкурента</label>
                    <Textarea
                      placeholder="Вставьте текст коммерческого предложения конкурента или основные пункты..."
                      value={competitorProposal}
                      onChange={(e) => setCompetitorProposal(e.target.value)}
                      rows={8}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Наше КП</label>
                    <Textarea
                      placeholder="Вставьте текст нашего коммерческого предложения..."
                      value={ourProposal}
                      onChange={(e) => setOurProposal(e.target.value)}
                      rows={8}
                    />
                  </div>
                  <Button 
                    onClick={() => analyzeCompetitor('comparison')} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Crosshair className="h-4 w-4 mr-2" />}
                    Сравнить КП
                  </Button>
                </TabsContent>
                
                <TabsContent value="competitor" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">КП конкурента</label>
                    <Textarea
                      placeholder="Вставьте текст коммерческого предложения конкурента..."
                      value={competitorProposal}
                      onChange={(e) => setCompetitorProposal(e.target.value)}
                      rows={12}
                    />
                  </div>
                  <Button 
                    onClick={() => analyzeCompetitor('competitor_only')} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    Анализировать
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Статистика анализов</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Проанализировано КП</span>
                  <Badge variant="secondary">47</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Выявлено акций</span>
                  <Badge variant="secondary">12</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Улучшений внедрено</span>
                  <Badge variant="secondary">23</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Конкурентов в базе</span>
                  <Badge variant="secondary">15</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Трендов выявлено</span>
                  <Badge variant="secondary">8</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Быстрые действия */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Быстрые действия
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Search className="h-4 w-4 mr-2" />
                  Поиск новых акций
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Обновить тренды
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Анализ цен
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Target className="h-4 w-4 mr-2" />
                  Прогноз изменений
                </Button>
              </CardContent>
            </Card>
          </div>

        {/* Results Section */}
        <div className="xl:col-span-2">
          {analysis ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Результат анализа
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={analysis.analysisType === 'comparison' ? 'default' : 'secondary'}>
                        {analysis.analysisType === 'comparison' ? 'Сравнение' : 'Анализ конкурента'}
                      </Badge>
                      <Badge variant="outline">
                        {new Date(analysis.generated_at).toLocaleString('ru-RU')}
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
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                          Анализ конкурентов
                        </h3>
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap">{analysis.analysis}</p>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <Zap className="h-5 w-5 text-green-500" />
                          План действий
                        </h3>
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap">{analysis.actionPlan}</p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Analysis Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-semibold">Анализ завершен</p>
                        <p className="text-sm text-muted-foreground">Готовы рекомендации</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-semibold">КП конкурента</p>
                        <p className="text-sm text-muted-foreground">
                          {analysis.competitorAnalyzed ? 'Проанализировано' : 'Не загружено'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                      <div>
                        <p className="font-semibold">Наше КП</p>
                        <p className="text-sm text-muted-foreground">
                          {analysis.ourProposalAnalyzed ? 'Сравнение готово' : 'Только анализ конкурента'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <CardContent className="text-center">
                <Crosshair className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Готов к анализу</h3>
                <p className="text-muted-foreground">
                  Загрузите КП конкурента для получения детального анализа и рекомендаций
                </p>
              </CardContent>
            </Card>
          )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="competitors">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompetitorForm onSave={(data) => {
              console.log('Сохранение конкурента:', data);
              toast({
                title: 'Конкурент добавлен',
                description: `${data.name} успешно добавлен в базу`,
              });
            }} />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  База конкурентов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Пример карточек конкурентов */}
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">ООО "Зеленый Мир"</h4>
                      <Badge variant="outline">Активный</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Ландшафтный дизайн, автополив, озеленение
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Средний сегмент</span>
                      <span>•</span>
                      <span>15 отслеживаемых URL</span>
                      <span>•</span>
                      <span>Последнее обновление: вчера</span>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">ИП Садовников</h4>
                      <Badge variant="secondary">Мониторинг</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Ландшафтный дизайн, уход за садом
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Эконом сегмент</span>
                      <span>•</span>
                      <span>8 отслеживаемых URL</span>
                      <span>•</span>
                      <span>Последнее обновление: 3 дня назад</span>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    Показать всех конкурентов (15)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring">
          <CompetitorAnalysisTools />
        </TabsContent>

        <TabsContent value="trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Ценовые тренды
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Ландшафтный дизайн</span>
                      <Badge variant="default" className="bg-green-600">↗ +12%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Рост цен в весенний период. Прогноз до мая: +18%
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Автополив</span>
                      <Badge variant="destructive">↘ -8%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Снижение цен из-за конкуренции. Стабилизация ожидается в июне
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Мощение</span>
                      <Badge variant="secondary">→ 0%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Цены стабильны. Небольшой рост ожидается к концу сезона
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Сезонная аналитика
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Весенний пик (март-май)</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Рост спроса на газоны: +40%</li>
                      <li>• Увеличение цен на посадочный материал: +25%</li>
                      <li>• Пик активности конкурентов в соцсетях</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Летний период (июнь-август)</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Стабилизация цен на основные услуги</li>
                      <li>• Рост спроса на системы полива: +60%</li>
                      <li>• Активные акции по уходу за садом</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Осенне-зимний спад</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Снижение цен на проектирование: -20%</li>
                      <li>• Акции на подготовку к следующему сезону</li>
                      <li>• Минимальная активность конкурентов</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompetitorAnalysisPage;