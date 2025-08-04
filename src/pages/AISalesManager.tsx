import React, { useState } from 'react';
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
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SalesLead {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  source: string;
  stage: string;
  value: number;
  lastContact: Date;
  nextAction: string;
  priority: 'high' | 'medium' | 'low';
}

const AISalesManager = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<SalesLead[]>([
    {
      id: '1',
      clientName: 'Петров А.И.',
      phone: '+7 (999) 123-45-67',
      email: 'petrov@email.com',
      source: 'Сайт',
      stage: 'Переговоры',
      value: 450000,
      lastContact: new Date('2024-01-10'),
      nextAction: 'Отправить КП',
      priority: 'high'
    },
    {
      id: '2',
      clientName: 'ООО "СтройТех"',
      phone: '+7 (999) 987-65-43',
      email: 'info@stroytech.ru',
      source: 'Звонок',
      stage: 'Квалификация',
      value: 1200000,
      lastContact: new Date('2024-01-12'),
      nextAction: 'Провести презентацию',
      priority: 'high'
    }
  ]);

  const salesStages = [
    { name: 'Лид', count: 8, color: 'bg-blue-500' },
    { name: 'Квалификация', count: 5, color: 'bg-yellow-500' },
    { name: 'Переговоры', count: 3, color: 'bg-orange-500' },
    { name: 'Предложение', count: 2, color: 'bg-purple-500' },
    { name: 'Сделка', count: 1, color: 'bg-green-500' }
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
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
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-sm">Горячий лид</div>
                  <div className="text-xs text-muted-foreground">
                    ООО "СтройТех" показывает высокую активность. Рекомендуется ускорить процесс.
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="font-medium text-sm">Требует внимания</div>
                  <div className="text-xs text-muted-foreground">
                    Петров А.И. не отвечает 3 дня. Попробуйте другой канал связи.
                  </div>
                </div>
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
                <Button>
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
                          <div>{lead.phone}</div>
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
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Phone className="h-4 w-4" />
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