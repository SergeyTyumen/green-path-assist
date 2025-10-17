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
import { 
  Settings, 
  Search, 
  Brain, 
  Zap,
  Plus,
  Eye,
  Mail,
  Phone,
  TrendingUp,
  Package,
  Clock,
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getAIConfigForAssistant } from '@/utils/getAPIKeys';

interface SupplierRequest {
  id: string;
  category: string;
  materials: string[];
  quantity: number;
  unit: string;
  deadline: Date;
  status: 'searching' | 'requests_sent' | 'responses_received' | 'completed';
  suppliers: SupplierResponse[];
}

interface SupplierResponse {
  id: string;
  supplierName: string;
  price: number;
  delivery: string;
  rating: number;
  response: boolean;
}

const AISupplierManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<SupplierRequest[]>([
    {
      id: '1',
      category: 'Строительные материалы',
      materials: ['Цемент М400', 'Песок строительный'],
      quantity: 10,
      unit: 'тонн',
      deadline: new Date('2024-01-20'),
      status: 'responses_received',
      suppliers: [
        { id: '1', supplierName: 'СтройМатериалы+', price: 4500, delivery: '2-3 дня', rating: 4.8, response: true },
        { id: '2', supplierName: 'БетонСнаб', price: 4200, delivery: '1-2 дня', rating: 4.6, response: true },
        { id: '3', supplierName: 'МегаСтрой', price: 4800, delivery: '3-5 дней', rating: 4.2, response: false }
      ]
    }
  ]);

  const [newRequest, setNewRequest] = useState({
    category: '',
    materials: '',
    quantity: '',
    unit: 'шт',
    deadline: ''
  });

  const [searching, setSearching] = useState(false);

  const categories = [
    'Строительные материалы',
    'Отделочные материалы', 
    'Сантехника',
    'Электрика',
    'Инструменты',
    'Крепеж'
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'searching': return 'bg-blue-100 text-blue-800';
      case 'requests_sent': return 'bg-yellow-100 text-yellow-800';
      case 'responses_received': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'searching': return 'Поиск поставщиков';
      case 'requests_sent': return 'Запросы отправлены';
      case 'responses_received': return 'Получены ответы';
      case 'completed': return 'Завершено';
      default: return status;
    }
  };

  const searchSuppliers = async () => {
    if (!newRequest.category || !newRequest.materials) {
      toast({
        title: "Ошибка",
        description: "Заполните категорию и материалы",
        variant: "destructive"
      });
      return;
    }

    setSearching(true);
    
    try {
      const aiConfig = await getAIConfigForAssistant(user!.id, 'supplier-manager');
      if (!aiConfig?.apiKey) {
        toast({
          title: "API ключ не найден",
          description: "Настройте API ключ в разделе 'Настройки' → 'API Ключи'",
          variant: "destructive"
        });
        setSearching(false);
        return;
      }

      // Вызываем AI Supplier Manager для поиска поставщиков
      const { data, error } = await supabase.functions.invoke('ai-supplier-manager', {
        body: {
          action: 'find_suppliers',
          data: {
            categories: [newRequest.category],
            materials: newRequest.materials.split(',').map(m => m.trim()),
            quantity: parseInt(newRequest.quantity) || 1,
            unit: newRequest.unit,
            deadline: newRequest.deadline
          },
          aiConfig // Передаем настройки AI
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast({
          title: "Поиск завершен",
          description: `ИИ нашел ${data.total_found} поставщиков и сгенерировал рекомендации`
        });

        // Очищаем форму
        setNewRequest({
          category: '',
          materials: '',
          quantity: '',
          unit: 'шт',
          deadline: ''
        });
      } else {
        throw new Error(data.error || 'Ошибка поиска поставщиков');
      }
    } catch (error) {
      console.error('Error searching suppliers:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось найти поставщиков",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

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
          <div className="h-12 w-12 rounded-lg bg-teal-500 flex items-center justify-center">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ИИ-Поставщик-Менеджер</h1>
            <p className="text-muted-foreground">
              Находит поставщиков и запрашивает цены по категориям
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

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests">Запросы</TabsTrigger>
          <TabsTrigger value="suppliers">Поставщики</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Запросы цен
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Новый запрос
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Категория</TableHead>
                        <TableHead>Материалы</TableHead>
                        <TableHead>Количество</TableHead>
                        <TableHead>Срок</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.category}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {request.materials.join(', ')}
                            </div>
                          </TableCell>
                          <TableCell>{request.quantity} {request.unit}</TableCell>
                          <TableCell>{request.deadline.toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(request.status)}>
                              {getStatusText(request.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Новый запрос
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <Select value={newRequest.category} onValueChange={(value) => setNewRequest({...newRequest, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Материалы</Label>
                  <Textarea 
                    placeholder="Укажите названия материалов через запятую..."
                    rows={3}
                    value={newRequest.materials}
                    onChange={(e) => setNewRequest({...newRequest, materials: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Количество</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={newRequest.quantity}
                      onChange={(e) => setNewRequest({...newRequest, quantity: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Единица</Label>
                    <Select value={newRequest.unit} onValueChange={(value) => setNewRequest({...newRequest, unit: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="шт">шт</SelectItem>
                        <SelectItem value="м²">м²</SelectItem>
                        <SelectItem value="м³">м³</SelectItem>
                        <SelectItem value="кг">кг</SelectItem>
                        <SelectItem value="т">тонн</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Срок поставки</Label>
                  <Input 
                    type="date" 
                    value={newRequest.deadline}
                    onChange={(e) => setNewRequest({...newRequest, deadline: e.target.value})}
                  />
                </div>

                <Button 
                  onClick={searchSuppliers}
                  disabled={searching}
                  className="w-full"
                >
                  {searching ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Поиск поставщиков...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Найти поставщиков
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Responses section */}
          {requests[0] && requests[0].status === 'responses_received' && (
            <Card>
              <CardHeader>
                <CardTitle>Ответы поставщиков</CardTitle>
                <CardDescription>
                  Запрос: {requests[0].materials.join(', ')} ({requests[0].quantity} {requests[0].unit})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Поставщик</TableHead>
                      <TableHead>Цена за единицу</TableHead>
                      <TableHead>Срок доставки</TableHead>
                      <TableHead>Рейтинг</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests[0].suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.supplierName}</TableCell>
                        <TableCell>{supplier.price.toLocaleString()} ₽</TableCell>
                        <TableCell>{supplier.delivery}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {supplier.rating}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={supplier.response ? "default" : "secondary"}>
                            {supplier.response ? "Ответил" : "Ожидание"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                База поставщиков
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'СтройМатериалы+', category: 'Стройматериалы', rating: 4.8, orders: 45 },
                  { name: 'БетонСнаб', category: 'Бетон, цемент', rating: 4.6, orders: 32 },
                  { name: 'ЭлектроТорг', category: 'Электрика', rating: 4.7, orders: 28 },
                  { name: 'СантехПро', category: 'Сантехника', rating: 4.5, orders: 19 },
                  { name: 'ИнструментСервис', category: 'Инструменты', rating: 4.9, orders: 67 },
                  { name: 'КрепежОпт', category: 'Крепеж', rating: 4.3, orders: 23 }
                ].map((supplier, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{supplier.name}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{supplier.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{supplier.category}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{supplier.orders} заказов</span>
                        <Button variant="outline" size="sm">Связаться</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Запросов в месяц
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">47</div>
                <p className="text-sm text-muted-foreground">
                  +12% к прошлому месяцу
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Время ответа
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">4.2 ч</div>
                <p className="text-sm text-muted-foreground">
                  Среднее время ответа
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Экономия
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">18%</div>
                <p className="text-sm text-muted-foreground">
                  Средняя экономия на закупках
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Поставщиков
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">156</div>
                <p className="text-sm text-muted-foreground">
                  В базе данных
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
                Настройки поиска поставщиков
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Шаблон запроса</Label>
                  <Textarea 
                    className="mt-2"
                    placeholder="Здравствуйте! Нас интересует поставка материалов..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Минимальный рейтинг поставщика</Label>
                    <Select defaultValue="4.0">
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3.0">3.0 и выше</SelectItem>
                        <SelectItem value="4.0">4.0 и выше</SelectItem>
                        <SelectItem value="4.5">4.5 и выше</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Максимальное расстояние (км)</Label>
                    <Input type="number" defaultValue={50} className="mt-2" />
                  </div>
                </div>
                <div>
                  <Label>Автоматическая отправка запросов</Label>
                  <Select defaultValue="manual">
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Автоматически</SelectItem>
                      <SelectItem value="manual">Вручную</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AISupplierManager;