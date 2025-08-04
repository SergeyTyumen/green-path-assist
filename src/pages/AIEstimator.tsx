import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  FileText, 
  Settings, 
  Download,
  Plus,
  Trash2,
  Brain,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkItem {
  id: string;
  name: string;
  area: number;
  options: string[];
  pricePerM2?: number;
  coefficient?: number;
  total?: number;
}

interface EstimateResult {
  position: string;
  area: number;
  pricePerM2: number;
  coefficient: number;
  total: number;
}

const AIEstimator = () => {
  const { toast } = useToast();
  const [workItems, setWorkItems] = useState<WorkItem[]>([
    { id: '1', name: 'укладка плитки', area: 120, options: ['подготовка основания'] }
  ]);
  const [calculating, setCalculating] = useState(false);
  const [results, setResults] = useState<EstimateResult[]>([]);

  const workTypes = [
    'укладка плитки',
    'покраска стен',
    'штукатурка',
    'устройство стяжки',
    'монтаж гипсокартона',
    'укладка ламината',
    'установка дверей',
    'установка окон'
  ];

  const availableOptions = [
    'подготовка основания',
    'грунтовка',
    'армирование',
    'теплоизоляция',
    'гидроизоляция',
    'финишная обработка'
  ];

  const addWorkItem = () => {
    const newItem: WorkItem = {
      id: Date.now().toString(),
      name: '',
      area: 0,
      options: []
    };
    setWorkItems([...workItems, newItem]);
  };

  const removeWorkItem = (id: string) => {
    setWorkItems(workItems.filter(item => item.id !== id));
  };

  const updateWorkItem = (id: string, field: keyof WorkItem, value: any) => {
    setWorkItems(workItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const toggleOption = (itemId: string, option: string) => {
    setWorkItems(workItems.map(item => {
      if (item.id === itemId) {
        const newOptions = item.options.includes(option)
          ? item.options.filter(opt => opt !== option)
          : [...item.options, option];
        return { ...item, options: newOptions };
      }
      return item;
    }));
  };

  const calculateEstimate = async () => {
    setCalculating(true);
    
    // Симуляция расчета ИИ-сметчика
    try {
      const calculatedResults: EstimateResult[] = workItems.map(item => {
        // Базовые цены (в реальности будут из базы данных)
        const basePrices: Record<string, number> = {
          'укладка плитки': 1100,
          'покраска стен': 400,
          'штукатурка': 350,
          'устройство стяжки': 600,
          'монтаж гипсокартона': 450,
          'укладка ламината': 800,
          'установка дверей': 2500,
          'установка окон': 3500
        };

        const basePrice = basePrices[item.name] || 500;
        let coefficient = 1.0;
        
        // Коэффициенты для опций
        if (item.options.includes('подготовка основания')) coefficient += 0.1;
        if (item.options.includes('грунтовка')) coefficient += 0.05;
        if (item.options.includes('армирование')) coefficient += 0.15;
        if (item.options.includes('теплоизоляция')) coefficient += 0.2;
        if (item.options.includes('гидроизоляция')) coefficient += 0.1;
        if (item.options.includes('финишная обработка')) coefficient += 0.08;

        const pricePerM2 = Math.round(basePrice * coefficient);
        const total = Math.round(item.area * pricePerM2);

        return {
          position: `${item.name}${item.options.length > 0 ? ` (${item.options.join(', ')})` : ''}`,
          area: item.area,
          pricePerM2,
          coefficient,
          total
        };
      });

      setResults(calculatedResults);
      toast({
        title: "Смета рассчитана",
        description: "ИИ-сметчик успешно обработал техническое задание"
      });
    } catch (error) {
      toast({
        title: "Ошибка расчета",
        description: "Не удалось рассчитать смету",
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };

  const exportToPDF = () => {
    toast({
      title: "Экспорт в PDF",
      description: "Функция экспорта будет реализована в следующих версиях"
    });
  };

  const totalAmount = results.reduce((sum, result) => sum + result.total, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-lg bg-green-500 flex items-center justify-center">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ИИ-Сметчик</h1>
            <p className="text-muted-foreground">
              Автоматический расчет смет по техническому заданию
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

      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calculator">Калькулятор</TabsTrigger>
          <TabsTrigger value="results">Результаты</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Техническое задание
              </CardTitle>
              <CardDescription>
                Добавьте виды работ и их параметры для расчета сметы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {workItems.map((item, index) => (
                <div key={item.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Позиция {index + 1}</h4>
                    {workItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWorkItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Вид работ</Label>
                      <Select
                        value={item.name}
                        onValueChange={(value) => updateWorkItem(item.id, 'name', value)}
                      >
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
                      <Label>Площадь (м²)</Label>
                      <Input
                        type="number"
                        value={item.area}
                        onChange={(e) => updateWorkItem(item.id, 'area', parseFloat(e.target.value) || 0)}
                        placeholder="Введите площадь"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Дополнительные опции</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {availableOptions.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${item.id}-${option}`}
                            checked={item.options.includes(option)}
                            onCheckedChange={() => toggleOption(item.id, option)}
                          />
                          <Label 
                            htmlFor={`${item.id}-${option}`}
                            className="text-sm font-normal"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                <Button variant="outline" onClick={addWorkItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить позицию
                </Button>
                <Button 
                  onClick={calculateEstimate}
                  disabled={calculating || workItems.some(item => !item.name || item.area <= 0)}
                  className="ml-auto"
                >
                  {calculating ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Расчет...
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4 mr-2" />
                      Рассчитать смету
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Результаты расчета
                </div>
                {results.length > 0 && (
                  <Button variant="outline" onClick={exportToPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Экспорт PDF
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет результатов расчета</p>
                  <p className="text-sm">Перейдите на вкладку "Калькулятор" для создания сметы</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div className="md:col-span-2">
                          <h4 className="font-medium">{result.position}</h4>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Площадь</p>
                          <p className="font-medium">{result.area} м²</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Цена за м²</p>
                          <p className="font-medium">{result.pricePerM2.toLocaleString()} ₽</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Итого</p>
                          <p className="font-bold text-lg">{result.total.toLocaleString()} ₽</p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Коэффициент: {result.coefficient.toFixed(2)}
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <h3 className="text-lg font-bold">Общая стоимость работ:</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {totalAmount.toLocaleString()} ₽
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Настройки ИИ-сметчика
              </CardTitle>
              <CardDescription>
                Конфигурация базы норм и коэффициентов
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">База данных работ</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Управление справочником видов работ и нормативами
                  </p>
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Редактировать базу норм
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Коэффициенты сложности</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Настройка коэффициентов для различных опций работ
                  </p>
                  <Button variant="outline">
                    <Calculator className="h-4 w-4 mr-2" />
                    Настроить коэффициенты
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">ИИ-модель</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Параметры работы искусственного интеллекта
                  </p>
                  <div className="space-y-2">
                    <Label>Модель ИИ</Label>
                    <Select defaultValue="gpt-4o">
                      <SelectTrigger className="w-full md:w-[300px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o (Рекомендуется)</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Быстрее)</SelectItem>
                        <SelectItem value="gpt-3.5">GPT-3.5 Turbo (Экономично)</SelectItem>
                      </SelectContent>
                    </Select>
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

export default AIEstimator;