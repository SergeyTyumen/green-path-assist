import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  FileText, 
  Settings, 
  Download,
  Brain,
  Zap,
  ArrowLeft,
  CheckCircle,
  MapPin,
  Building,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getAIConfigForAssistant } from '@/utils/getAPIKeys';
import { EstimatorSettings } from '@/components/ai-settings/EstimatorSettings';

interface WorkItem {
  service: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
}

interface EstimateResult {
  position: string;
  area: number;
  pricePerM2: number;
  coefficient: number;
  total: number;
}

interface TechnicalSpecification {
  id: string;
  client_name: string;
  object_address: string;
  work_scope: string;
  materials_spec: any;
  estimated_area: number;
  estimated_duration: string;
  recommendations: string;
}

const AIEstimator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [techSpec, setTechSpec] = useState<TechnicalSpecification | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [results, setResults] = useState<EstimateResult[]>([]);
  const [manualItems, setManualItems] = useState<WorkItem[]>([]);

  // Загружаем данные из URL параметров при загрузке компонента
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tsId = urlParams.get('ts_id');
    const workScope = urlParams.get('work_scope');
    const materials = urlParams.get('materials');
    const area = urlParams.get('area');

    if (tsId && workScope) {
      // Формируем техническое задание из переданных параметров
      const spec: TechnicalSpecification = {
        id: tsId,
        client_name: urlParams.get('client_name') || 'Клиент',
        object_address: urlParams.get('object_address') || 'Адрес не указан',
        work_scope: decodeURIComponent(workScope),
        materials_spec: materials ? decodeURIComponent(materials) : '',
        estimated_area: area ? parseInt(area) : 100,
        estimated_duration: urlParams.get('duration') || 'Не указана',
        recommendations: urlParams.get('recommendations') || ''
      };

      setTechSpec(spec);

      // Автоматически парсим работы из объема работ
      parseWorkItems(spec.work_scope, spec.estimated_area);

      toast({
        title: "Данные получены от AI-Технолога",
        description: "Техническое задание успешно загружено для расчета сметы"
      });
    }
  }, []);

  const parseWorkItems = (workScope: string, area: number) => {
    // Простой парсинг работ из текста ТЗ
    const lines = workScope.split('\n').filter(line => line.trim());
    const items: WorkItem[] = [];

    lines.forEach(line => {
      if (line.includes('м²') || line.includes('кв.м') || line.includes('работы')) {
        const serviceName = line.replace(/^\d+\.?\s*/, '').split(':')[0].trim();
        if (serviceName && serviceName.length > 5) {
          items.push({
            service: serviceName,
            quantity: area,
            unit: 'м²'
          });
        }
      }
    });

    if (items.length === 0) {
      // Если не удалось распарсить, создаем базовые позиции
      items.push({
        service: 'Комплекс работ по благоустройству',
        quantity: area,
        unit: 'м²'
      });
    }

    setWorkItems(items);
  };

  const addManualItem = () => {
    const newItem: WorkItem = {
      service: '',
      quantity: 0,
      unit: 'м²'
    };
    setManualItems([...manualItems, newItem]);
  };

  const updateManualItem = (index: number, field: keyof WorkItem, value: string | number) => {
    const updatedItems = [...manualItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setManualItems(updatedItems);
  };

  const removeManualItem = (index: number) => {
    setManualItems(manualItems.filter((_, i) => i !== index));
  };

  const calculateEstimate = async () => {
    if (workItems.length === 0 && manualItems.filter(item => item.service.trim()).length === 0) {
      toast({
        title: "Нет работ для расчета",
        description: "Добавьте позиции для расчета сметы",
        variant: "destructive"
      });
      return;
    }

    setCalculating(true);
    
    try {
      const aiConfig = await getAIConfigForAssistant(user!.id, 'estimator');
      if (!aiConfig?.apiKey) {
        toast({
          title: "API ключ не найден",
          description: "Настройте API ключ в разделе 'Настройки' → 'API Ключи'",
          variant: "destructive"
        });
        return;
      }

      // Объединяем автоматические и ручные позиции
      const allItems = [
        ...workItems,
        ...manualItems.filter(item => item.service.trim())
      ];

      // Вызываем AI Estimator
      const { data, error } = await supabase.functions.invoke('ai-estimator', {
        body: {
          action: 'calculate_materials',
          data: { 
            services: allItems,
            technical_spec: techSpec
          },
          aiConfig // Передаем настройки AI
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Ошибка расчета материалов');
      }

      // Преобразуем результат в формат для отображения
      const calculatedResults: EstimateResult[] = data.calculations.map((calc: any) => ({
        position: calc.service,
        area: calc.quantity,
        pricePerM2: calc.total_cost ? Math.round(calc.total_cost / calc.quantity) : 0,
        coefficient: calc.coefficient || 1.0,
        total: calc.total_cost || 0
      }));

      setResults(calculatedResults);
      
      // Создаем смету в системе
      await supabase.functions.invoke('ai-estimator', {
        body: {
          action: 'create_estimate',
          data: {
            estimate: {
              title: `Смета: ${techSpec?.client_name || 'Объект'} - ${techSpec?.object_address || 'Адрес'}`,
              services: allItems,
              client_name: techSpec?.client_name,
              object_address: techSpec?.object_address,
              technical_spec_id: techSpec?.id,
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +30 дней
            }
          }
        }
      });
      
      toast({
        title: "Смета создана",
        description: "ИИ-сметчик успешно рассчитал материалы и создал смету"
      });
    } catch (error) {
      console.error('Error calculating estimate:', error);
      toast({
        title: "Ошибка расчета",
        description: error.message || "Не удалось рассчитать смету",
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>
          <div className="h-12 w-12 rounded-lg bg-green-500 flex items-center justify-center">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ИИ-Сметчик</h1>
            <p className="text-muted-foreground">
              Автоматический расчет смет на основе технического задания
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
          {techSpec && (
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              ТЗ получено от AI-Технолога
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="work-items" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="work-items">Позиции работ</TabsTrigger>
          <TabsTrigger value="results">Смета</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="work-items" className="space-y-6">
          {/* Информация о ТЗ */}
          {techSpec && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <FileText className="h-5 w-5" />
                  Техническое задание от AI-Технолога
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Клиент:</span>
                    <span>{techSpec.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Адрес:</span>
                    <span>{techSpec.object_address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Площадь:</span>
                    <span>{techSpec.estimated_area} м²</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Автоматически определенные работы */}
            <Card>
              <CardHeader>
                <CardTitle>Работы из ТЗ</CardTitle>
                <CardDescription>
                  Позиции, автоматически определенные из технического задания
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Нет данных от AI-Технолога
                  </p>
                ) : (
                  <div className="space-y-3">
                    {workItems.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="font-medium">{item.service}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.quantity} {item.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Дополнительные работы */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Дополнительные позиции
                  <Button onClick={addManualItem} size="sm">
                    Добавить
                  </Button>
                </CardTitle>
                <CardDescription>
                  Добавьте дополнительные работы для расчета
                </CardDescription>
              </CardHeader>
              <CardContent>
                {manualItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Нет дополнительных позиций
                  </p>
                ) : (
                  <div className="space-y-4">
                    {manualItems.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-3">
                        <div className="flex justify-between items-start">
                          <Label>Название работы</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeManualItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Удалить
                          </Button>
                        </div>
                        <Input
                          value={item.service}
                          onChange={(e) => updateManualItem(index, 'service', e.target.value)}
                          placeholder="Название работы..."
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Количество</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateManualItem(index, 'quantity', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label>Единица</Label>
                            <Input
                              value={item.unit}
                              onChange={(e) => updateManualItem(index, 'unit', e.target.value)}
                              placeholder="м²"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={calculateEstimate}
              disabled={calculating || (workItems.length === 0 && manualItems.filter(item => item.service.trim()).length === 0)}
              size="lg"
              className="px-8"
            >
              {calculating ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Расчет сметы...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Рассчитать смету
                </>
              )}
            </Button>
          </div>
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
                  <p className="text-sm">Перейдите на вкладку "Позиции работ" для создания сметы</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Информация о клиенте */}
                  {techSpec && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Информация о заказе</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div><span className="font-medium">Клиент:</span> {techSpec.client_name}</div>
                        <div><span className="font-medium">Адрес:</span> {techSpec.object_address}</div>
                        <div><span className="font-medium">Площадь:</span> {techSpec.estimated_area} м²</div>
                        <div><span className="font-medium">Длительность:</span> {techSpec.estimated_duration}</div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Позиции сметы */}
                  {results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div className="md:col-span-2">
                          <h4 className="font-medium">{result.position}</h4>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Количество</p>
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
                        Коэффициент сложности: {result.coefficient.toFixed(2)}
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg">
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
          <EstimatorSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIEstimator;