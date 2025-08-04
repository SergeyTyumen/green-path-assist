import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  TrendingUp, 
  BarChart3, 
  Calendar,
  DollarSign,
  Eye,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  Globe
} from 'lucide-react';

interface AnalysisTask {
  id: string;
  type: 'price_monitoring' | 'promo_search' | 'trend_analysis' | 'engagement_analysis';
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  url?: string;
  result?: any;
  createdAt: Date;
}

const CompetitorAnalysisTools = () => {
  const [tasks, setTasks] = useState<AnalysisTask[]>([]);
  const [monitoringUrl, setMonitoringUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const startPriceMonitoring = async () => {
    if (!monitoringUrl.trim()) return;
    
    const newTask: AnalysisTask = {
      id: Date.now().toString(),
      type: 'price_monitoring',
      status: 'running',
      progress: 0,
      url: monitoringUrl,
      createdAt: new Date()
    };
    
    setTasks(prev => [newTask, ...prev]);
    setLoading(true);
    
    // Симуляция процесса анализа
    const intervals = [0, 25, 50, 75, 100];
    for (let i = 0; i < intervals.length; i++) {
      setTimeout(() => {
        setTasks(prev => prev.map(task => 
          task.id === newTask.id 
            ? { ...task, progress: intervals[i], status: i === intervals.length - 1 ? 'completed' : 'running' }
            : task
        ));
        if (i === intervals.length - 1) {
          setLoading(false);
        }
      }, i * 1000);
    }
  };

  const startPromoSearch = async () => {
    const newTask: AnalysisTask = {
      id: Date.now().toString(),
      type: 'promo_search',
      status: 'running',
      progress: 0,
      createdAt: new Date()
    };
    
    setTasks(prev => [newTask, ...prev]);
    
    // Симуляция поиска акций
    setTimeout(() => {
      setTasks(prev => prev.map(task => 
        task.id === newTask.id 
          ? { 
              ...task, 
              progress: 100, 
              status: 'completed',
              result: {
                foundPromotions: 5,
                newOffers: 2,
                priceChanges: 3
              }
            }
          : task
      ));
    }, 3000);
  };

  const startTrendAnalysis = async () => {
    const newTask: AnalysisTask = {
      id: Date.now().toString(),
      type: 'trend_analysis',
      status: 'running',
      progress: 0,
      createdAt: new Date()
    };
    
    setTasks(prev => [newTask, ...prev]);
    
    setTimeout(() => {
      setTasks(prev => prev.map(task => 
        task.id === newTask.id 
          ? { 
              ...task, 
              progress: 100, 
              status: 'completed',
              result: {
                trend: 'upward',
                predictedChange: '+15%',
                confidence: 85
              }
            }
          : task
      ));
    }, 4000);
  };

  const getTaskIcon = (type: AnalysisTask['type']) => {
    switch (type) {
      case 'price_monitoring': return <DollarSign className="h-4 w-4" />;
      case 'promo_search': return <Search className="h-4 w-4" />;
      case 'trend_analysis': return <TrendingUp className="h-4 w-4" />;
      case 'engagement_analysis': return <Eye className="h-4 w-4" />;
    }
  };

  const getTaskTitle = (type: AnalysisTask['type']) => {
    switch (type) {
      case 'price_monitoring': return 'Мониторинг цен';
      case 'promo_search': return 'Поиск акций';
      case 'trend_analysis': return 'Анализ трендов';
      case 'engagement_analysis': return 'Анализ вовлечённости';
    }
  };

  const getStatusBadge = (status: AnalysisTask['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Ожидание</Badge>;
      case 'running': return <Badge variant="default"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Выполняется</Badge>;
      case 'completed': return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Завершено</Badge>;
      case 'error': return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Ошибка</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Инструменты анализа конкурентов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monitoring" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="monitoring">Мониторинг</TabsTrigger>
              <TabsTrigger value="promotions">Акции</TabsTrigger>
              <TabsTrigger value="trends">Тренды</TabsTrigger>
              <TabsTrigger value="engagement">Вовлечённость</TabsTrigger>
            </TabsList>
            
            <TabsContent value="monitoring" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  URL для мониторинга цен
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://competitor-site.com/services"
                    value={monitoringUrl}
                    onChange={(e) => setMonitoringUrl(e.target.value)}
                  />
                  <Button 
                    onClick={startPriceMonitoring}
                    disabled={loading || !monitoringUrl.trim()}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Запустить
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Автоматический мониторинг изменений цен на услуги конкурентов
              </p>
            </TabsContent>

            <TabsContent value="promotions" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Поиск акций</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Сканирование сайтов на наличие новых акций и спецпредложений
                    </p>
                    <Button onClick={startPromoSearch} size="sm" className="w-full">
                      <Search className="h-4 w-4 mr-2" />
                      Найти акции
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Анализ рекламы</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Мониторинг рекламных объявлений в соцсетях и на досках
                    </p>
                    <Button size="sm" className="w-full" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Анализировать
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Анализ трендов цен</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Построение трендов изменения цен и прогнозирование будущих изменений
                    </p>
                    <Button onClick={startTrendAnalysis} size="sm">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Построить тренд
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Сезонный анализ</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Выявление сезонных паттернов в ценообразовании конкурентов
                    </p>
                    <Button size="sm" variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Анализировать сезонность
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Анализ активности</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Отслеживание активности конкурентов в соцсетях
                    </p>
                    <Button size="sm" className="w-full" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Проанализировать
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Отзывы и рейтинги</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Мониторинг отзывов и рейтингов конкурентов
                    </p>
                    <Button size="sm" className="w-full" variant="outline">
                      <Target className="h-4 w-4 mr-2" />
                      Собрать данные
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* История задач */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              История анализов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTaskIcon(task.type)}
                      <span className="font-medium">{getTaskTitle(task.type)}</span>
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {task.createdAt.toLocaleTimeString('ru-RU')}
                      </span>
                      {task.status === 'completed' && (
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {task.url && (
                    <p className="text-sm text-muted-foreground mb-2">
                      URL: {task.url}
                    </p>
                  )}
                  
                  {task.status === 'running' && (
                    <Progress value={task.progress} className="mb-2" />
                  )}
                  
                  {task.result && (
                    <div className="bg-muted/50 rounded p-2 text-sm">
                      {task.type === 'promo_search' && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>Найдено акций: {task.result.foundPromotions}</div>
                          <div>Новые предложения: {task.result.newOffers}</div>
                          <div>Изменения цен: {task.result.priceChanges}</div>
                        </div>
                      )}
                      {task.type === 'trend_analysis' && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>Тренд: {task.result.trend}</div>
                          <div>Прогноз: {task.result.predictedChange}</div>
                          <div>Уверенность: {task.result.confidence}%</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompetitorAnalysisTools;