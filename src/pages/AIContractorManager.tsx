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
  Settings, 
  Search, 
  Brain, 
  Zap,
  Plus,
  Eye,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Star,
  MapPin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getAIConfigForAssistant } from '@/utils/getAPIKeys';

interface ContractorTask {
  id: string;
  workType: string;
  description: string;
  area: number;
  deadline: Date;
  status: 'searching' | 'assigned' | 'in_progress' | 'completed' | 'overdue';
  contractor?: {
    name: string;
    rating: number;
    specialization: string[];
    location: string;
    price: number;
  };
  progress: number;
}

const AIContractorManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ContractorTask[]>([
    {
      id: '1',
      workType: 'Укладка плитки',
      description: 'Укладка керамической плитки в ванной комнате',
      area: 25,
      deadline: new Date('2024-01-25'),
      status: 'in_progress',
      contractor: {
        name: 'Петров А.И.',
        rating: 4.8,
        specialization: ['Плиточные работы', 'Сантехника'],
        location: 'Тюмень',
        price: 1200
      },
      progress: 65
    },
    {
      id: '2',
      workType: 'Покраска стен',
      description: 'Покраска стен в офисном помещении',
      area: 120,
      deadline: new Date('2024-01-30'),
      status: 'assigned',
      contractor: {
        name: 'Сидоров В.П.',
        rating: 4.6,
        specialization: ['Малярные работы', 'Декорирование'],
        location: 'Тюмень',
        price: 400
      },
      progress: 0
    }
  ]);

  const [newTask, setNewTask] = useState({
    workType: '',
    description: '',
    area: '',
    deadline: '',
    budget: ''
  });

  const [searching, setSearching] = useState(false);

  const workTypes = [
    'Укладка плитки',
    'Покраска стен',
    'Штукатурка',
    'Монтаж гипсокартона',
    'Укладка ламината',
    'Сантехнические работы',
    'Электромонтажные работы',
    'Кровельные работы'
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'searching': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'searching': return 'Поиск исполнителя';
      case 'assigned': return 'Назначен';
      case 'in_progress': return 'В работе';
      case 'completed': return 'Завершено';
      case 'overdue': return 'Просрочено';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'searching': return <Search className="h-4 w-4" />;
      case 'assigned': return <User className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const searchContractors = async () => {
    if (!newTask.workType || !newTask.description) {
      toast({
        title: "Ошибка",
        description: "Заполните вид работ и описание",
        variant: "destructive"
      });
      return;
    }

    setSearching(true);
    
    try {
      const aiConfig = await getAIConfigForAssistant(user!.id, 'contractor-manager');
      if (!aiConfig?.apiKey) {
        toast({
          title: "API ключ не найден",
          description: "Настройте API ключ в разделе 'Настройки' → 'API Ключи'",
          variant: "destructive"
        });
        setSearching(false);
        return;
      }

      // Вызываем AI Contractor Manager для поиска подрядчиков
      const { data, error } = await supabase.functions.invoke('ai-contractor-manager', {
        body: {
          action: 'find_contractors',
          data: {
            work_types: [newTask.workType],
            project_info: {
              description: newTask.description,
              area: parseInt(newTask.area) || 0,
              budget: parseInt(newTask.budget) || 0,
              deadline: newTask.deadline
            }
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
          description: `ИИ нашел ${data.total_found} подходящих исполнителей и сгенерировал рекомендации`
        });

        // Очищаем форму
        setNewTask({
          workType: '',
          description: '',
          area: '',
          deadline: '',
          budget: ''
        });
      } else {
        throw new Error(data.error || 'Ошибка поиска подрядчиков');
      }
    } catch (error) {
      console.error('Error searching contractors:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось найти исполнителей",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const availableContractors = [
    { name: 'Иванов С.М.', rating: 4.9, specialization: ['Плиточные работы'], experience: '8 лет', price: 1100, location: 'Тюмень' },
    { name: 'Строй-Мастер ООО', rating: 4.7, specialization: ['Комплексный ремонт'], experience: '12 лет', price: 950, location: 'Тюмень' },
    { name: 'Петрова Е.А.', rating: 4.8, specialization: ['Малярные работы'], experience: '6 лет', price: 380, location: 'Тюмень' }
  ];

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
          <div className="h-12 w-12 rounded-lg bg-cyan-500 flex items-center justify-center">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ИИ-Подрядчик-Менеджер</h1>
            <p className="text-muted-foreground">
              Находит исполнителей по видам работ и формирует задания
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

      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks">Задания</TabsTrigger>
          <TabsTrigger value="contractors">Исполнители</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Текущие задания
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Новое задание
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <Card key={task.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{task.workType}</h4>
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            </div>
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                              <span className="ml-1">{getStatusText(task.status)}</span>
                            </Badge>
                          </div>

                          {task.contractor && (
                            <div className="flex items-center justify-between mb-3 p-2 bg-muted/50 rounded">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="font-medium">{task.contractor.name}</span>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm">{task.contractor.rating}</span>
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {task.contractor.price} ₽/м²
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Площадь: </span>
                              {task.area} м²
                            </div>
                            <div>
                              <span className="text-muted-foreground">Срок: </span>
                              {task.deadline.toLocaleDateString()}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Прогресс: </span>
                              {task.progress}%
                            </div>
                          </div>

                          {task.status === 'in_progress' && (
                            <div className="mt-3">
                              <Progress value={task.progress} className="h-2" />
                            </div>
                          )}

                          <div className="flex gap-2 mt-3">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Детали
                            </Button>
                            {task.status === 'searching' && (
                              <Button variant="outline" size="sm">
                                <Search className="h-4 w-4 mr-1" />
                                Найти исполнителя
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Новое задание
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Вид работ</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите вид работ" />
                    </SelectTrigger>
                    <SelectContent>
                      {workTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Описание работ</Label>
                  <Textarea 
                    placeholder="Подробное описание задания..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Площадь (м²)</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Бюджет (₽/м²)</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Срок выполнения</Label>
                  <Input type="date" />
                </div>

                <Button 
                  onClick={searchContractors}
                  disabled={searching}
                  className="w-full"
                >
                  {searching ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Поиск исполнителей...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Найти исполнителей
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contractors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                База исполнителей
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableContractors.map((contractor, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{contractor.name}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{contractor.rating}</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>{contractor.specialization.join(', ')}</div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {contractor.location}
                        </div>
                        <div>Опыт: {contractor.experience}</div>
                        <div className="font-medium text-foreground">
                          от {contractor.price} ₽/м²
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        Назначить задание
                      </Button>
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
                  <Calendar className="h-5 w-5" />
                  Активных заданий
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">8</div>
                <p className="text-sm text-muted-foreground">
                  В работе сейчас
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Выполнено в срок
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">94%</div>
                <p className="text-sm text-muted-foreground">
                  За последний месяц
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Средний рейтинг
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">4.7</div>
                <p className="text-sm text-muted-foreground">
                  Рейтинг исполнителей
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Время поиска
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">2.3 ч</div>
                <p className="text-sm text-muted-foreground">
                  Среднее время поиска
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
                Настройки поиска исполнителей
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Критерии отбора</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label className="text-sm">Минимальный рейтинг</Label>
                      <Select defaultValue="4.0">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3.5">3.5 и выше</SelectItem>
                          <SelectItem value="4.0">4.0 и выше</SelectItem>
                          <SelectItem value="4.5">4.5 и выше</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Радиус поиска (км)</Label>
                      <Input type="number" defaultValue={30} />
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Шаблон задания</Label>
                  <Textarea 
                    className="mt-2"
                    placeholder="Требуется выполнить {work_type} на площади {area} м²..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Автоматическое назначение</Label>
                  <Select defaultValue="manual">
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Лучшему исполнителю</SelectItem>
                      <SelectItem value="manual">Ручной выбор</SelectItem>
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

export default AIContractorManager;