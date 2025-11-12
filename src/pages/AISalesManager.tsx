import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Phone, 
  Brain, 
  Zap,
  Settings,
  Plus,
  Eye,
  Calendar,
  TrendingUp,
  Target,
  DollarSign,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClickablePhone } from '@/components/ClickablePhone';
import { useClients } from '@/hooks/useClients';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const AISalesManager = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clients, loading } = useClients();
  const [analyzing, setAnalyzing] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);

  // Преобразуем клиентов в лиды для работы с воронкой
  const leads = clients.map(client => ({
    id: client.id,
    clientName: client.name,
    phone: client.phone,
    email: client.email || '',
    source: client.lead_source || 'Сайт',
    stage: client.status === 'new' ? 'Лид' : 
           client.status === 'in-progress' ? 'Квалификация' : 
           client.status === 'proposal-sent' ? 'Предложение' : 'Переговоры',
    value: client.budget || 0,
    lastContact: new Date(client.last_contact || client.created_at),
    nextAction: client.next_action || 'Связаться с клиентом',
    priority: (client.lead_quality_score || 0) > 70 ? 'high' as const : 
              (client.lead_quality_score || 0) > 40 ? 'medium' as const : 'low' as const
  }));

  const salesStages = [
    { name: 'Лид', count: leads.filter(l => l.stage === 'Лид').length, color: 'bg-blue-500' },
    { name: 'Квалификация', count: leads.filter(l => l.stage === 'Квалификация').length, color: 'bg-yellow-500' },
    { name: 'Переговоры', count: leads.filter(l => l.stage === 'Переговоры').length, color: 'bg-orange-500' },
    { name: 'Предложение', count: leads.filter(l => l.stage === 'Предложение').length, color: 'bg-purple-500' },
    { name: 'Сделка', count: leads.filter(l => l.stage === 'Сделка').length, color: 'bg-green-500' }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return priority;
    }
  };

  const analyzeClient = async (clientId: string) => {
    if (!user) return;
    
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-sales-manager', {
        body: {
          action: 'analyze_client',
          clientId,
          salesContext: {
            currentStage: clients.find(c => c.id === clientId)?.status,
            requestedBy: user.id
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        setAiRecommendations(data.data);
        toast({
          title: "Анализ завершен",
          description: "Получены рекомендации ИИ",
        });
      }
    } catch (error) {
      console.error('Error analyzing client:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось проанализировать клиента",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка данных...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
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
          <div className="h-12 w-12 rounded-lg bg-orange-500 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ИИ-Продажник</h1>
            <p className="text-muted-foreground">
              Ведение клиентов от заявки до заключения договора
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Brain className="h-3 w-3 mr-1" />
            Активен
          </Badge>
          <Badge variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            OpenAI GPT-4o
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="funnel" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="funnel">Воронка продаж</TabsTrigger>
          <TabsTrigger value="leads">Лиды</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {salesStages.map((stage, index) => (
              <Card key={index} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${stage.color}`} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">{stage.count}</div>
                  <div className="space-y-2">
                    {leads.filter(lead => lead.stage.toLowerCase().includes(stage.name.toLowerCase())).map(lead => (
                      <div key={lead.id} className="p-2 bg-muted/50 rounded text-xs">
                        <div className="font-medium">{lead.clientName}</div>
                        <div className="text-muted-foreground">{lead.value.toLocaleString()} ₽</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Конверсия воронки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Лид → Квалификация</span>
                    <span>62%</span>
                  </div>
                  <Progress value={62} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Квалификация → Переговоры</span>
                    <span>60%</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Переговоры → Сделка</span>
                    <span>33%</span>
                  </div>
                  <Progress value={33} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Предстоящие действия</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { client: 'Петров А.И.', action: 'Отправить КП', time: 'Сегодня 14:00' },
                  { client: 'ООО "СтройТех"', action: 'Презентация', time: 'Завтра 10:00' },
                  { client: 'Сидоров В.П.', action: 'Звонок', time: 'Завтра 16:00' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium text-sm">{item.client}</div>
                      <div className="text-xs text-muted-foreground">{item.action}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{item.time}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Рекомендации ИИ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiRecommendations ? (
                  <>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium text-sm">Анализ клиента</div>
                      <div className="text-xs text-muted-foreground">
                        {aiRecommendations.analysis}
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-medium text-sm">Рекомендуемое действие</div>
                      <div className="text-xs text-muted-foreground">
                        {aiRecommendations.recommendedAction}
                      </div>
                    </div>
                    {aiRecommendations.nextActions?.length > 0 && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="font-medium text-sm mb-2">Следующие шаги</div>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {aiRecommendations.nextActions.map((action: string, i: number) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Выберите клиента в таблице и нажмите "Анализ ИИ" для получения рекомендаций
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Управление лидами
                </div>
                <Button onClick={() => navigate('/clients')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить лид
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Контакты</TableHead>
                    <TableHead>Источник</TableHead>
                    <TableHead>Этап</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Приоритет</TableHead>
                    <TableHead>Следующее действие</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.clientName}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <ClickablePhone phone={lead.phone} variant="text" className="text-xs" />
                          <div className="text-muted-foreground">{lead.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{lead.source}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.stage}</Badge>
                      </TableCell>
                      <TableCell>{lead.value.toLocaleString()} ₽</TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(lead.priority)}>
                          {getPriorityText(lead.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{lead.nextAction}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/clients`)}
                            title="Просмотр клиента"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.open(`tel:${lead.phone}`)}
                            title="Позвонить"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => analyzeClient(lead.id)}
                            disabled={analyzing}
                            title="Анализ ИИ"
                          >
                            {analyzing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Новые лиды
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">23</div>
                <p className="text-sm text-muted-foreground">
                  За текущий месяц
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Объем воронки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">5.2М ₽</div>
                <p className="text-sm text-muted-foreground">
                  Потенциальный доход
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Конверсия
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">18%</div>
                <p className="text-sm text-muted-foreground">
                  Лид в сделку
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Цикл продаж
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">12 дней</div>
                <p className="text-sm text-muted-foreground">
                  Средняя длительность
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Настройки продажника
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Сценарий квалификации</Label>
                  <Textarea 
                    className="mt-2"
                    placeholder="Какой у вас бюджет на проект? Какие сроки вас интересуют?..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Автоматические напоминания</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label className="text-sm">Частота контактов</Label>
                      <Select defaultValue="3days">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1day">Каждый день</SelectItem>
                          <SelectItem value="3days">Каждые 3 дня</SelectItem>
                          <SelectItem value="1week">Каждую неделю</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Максимум попыток</Label>
                      <Input type="number" defaultValue={5} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AISalesManager;