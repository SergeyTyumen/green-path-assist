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
import { Textarea } from '@/components/ui/textarea';
import { 
  Calculator, 
  FileText, 
  Settings, 
  Download,
  Plus,
  Trash2,
  Brain,
  Zap,
  Mic,
  MapPin,
  Building,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EstimatorSettings } from '@/components/ai-settings/EstimatorSettings';

interface TechnicalSpecification {
  objectDescription: string;
  location: string;
  selectedServices: string[];
  customServices: string[];
  workComposition: string;
  selectedMaterials: string[];
  paymentTerms: string;
}

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
  const [techSpec, setTechSpec] = useState<TechnicalSpecification>({
    objectDescription: '',
    location: '',
    selectedServices: [],
    customServices: [],
    workComposition: '',
    selectedMaterials: [],
    paymentTerms: ''
  });
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [results, setResults] = useState<EstimateResult[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const availableServices = [
    'Ландшафтный дизайн',
    'Автоматический полив',
    'Устройство газона',
    'Посадка растений',
    'Мощение дорожек',
    'Устройство освещения',
    'Водные элементы',
    'Малые архитектурные формы',
    'Ограждения и заборы',
    'Дренажная система'
  ];

  const availableMaterials = [
    'Тротуарная плитка',
    'Природный камень',
    'Газонная трава',
    'Саженцы деревьев',
    'Кустарники',
    'Многолетние растения',
    'Система капельного полива',
    'Дренажные трубы',
    'Геотекстиль',
    'Песок',
    'Щебень',
    'Грунт растительный'
  ];

  const updateTechSpec = (field: keyof TechnicalSpecification, value: any) => {
    setTechSpec(prev => ({ ...prev, [field]: value }));
  };

  const toggleService = (service: string) => {
    setTechSpec(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(service)
        ? prev.selectedServices.filter(s => s !== service)
        : [...prev.selectedServices, service]
    }));
  };

  const addCustomService = (service: string) => {
    if (service.trim() && !techSpec.customServices.includes(service.trim())) {
      setTechSpec(prev => ({
        ...prev,
        customServices: [...prev.customServices, service.trim()]
      }));
    }
  };

  const removeCustomService = (service: string) => {
    setTechSpec(prev => ({
      ...prev,
      customServices: prev.customServices.filter(s => s !== service)
    }));
  };

  const toggleMaterial = (material: string) => {
    setTechSpec(prev => ({
      ...prev,
      selectedMaterials: prev.selectedMaterials.includes(material)
        ? prev.selectedMaterials.filter(m => m !== material)
        : [...prev.selectedMaterials, material]
    }));
  };

  const generateDescription = async () => {
    const allServices = [...techSpec.selectedServices, ...techSpec.customServices];
    if (allServices.length === 0) {
      toast({
        title: "Выберите услуги",
        description: "Для генерации описания необходимо выбрать хотя бы одну услугу",
        variant: "destructive"
      });
      return;
    }

    const generatedText = `Объект благоустройства и ландшафтного дизайна по адресу: ${techSpec.location || '[указать адрес]'}. 

Планируемые работы включают в себя: ${allServices.join(', ').toLowerCase()}. 

Использование материалов: ${techSpec.selectedMaterials.length > 0 ? techSpec.selectedMaterials.join(', ').toLowerCase() : '[материалы будут уточнены]'}.

Описание работ: ${techSpec.workComposition || '[детальное описание работ будет предоставлено отдельно]'}.`;

    updateTechSpec('objectDescription', generatedText);
    
    toast({
      title: "Описание сгенерировано",
      description: "Базовое описание объекта создано на основе выбранных услуг"
    });
  };

  const startVoiceInput = () => {
    setIsRecording(true);
    // Здесь будет реализация голосового ввода
    toast({
      title: "Голосовой ввод",
      description: "Функция голосового ввода будет реализована в следующих версиях"
    });
    setTimeout(() => setIsRecording(false), 2000);
  };

  const calculateEstimate = async () => {
    if (techSpec.selectedServices.length === 0 && techSpec.customServices.length === 0) {
      toast({
        title: "Выберите услуги",
        description: "Для расчета сметы необходимо выбрать хотя бы одну услугу",
        variant: "destructive"
      });
      return;
    }

    setCalculating(true);
    
    try {
      // Формируем данные для отправки в AI Estimator
      const allServices = [...techSpec.selectedServices, ...techSpec.customServices];
      
      // Парсим площадь из описания или используем базовую
      let area = 100;
      const areaMatch = techSpec.objectDescription.match(/(\d+)\s*(м²|кв\.?\s*м)/i);
      if (areaMatch) {
        area = parseInt(areaMatch[1]);
      }

      // Формируем список услуг с количествами
      const services = allServices.map(service => ({
        service: service,
        quantity: area,
        unit: 'м²',
        area: area
      }));

      // Вызываем AI Estimator
      const { data, error } = await supabase.functions.invoke('ai-estimator', {
        body: {
          action: 'calculate_materials',
          data: { services }
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
        coefficient: 1.0,
        total: calc.total_cost || 0
      }));

      setResults(calculatedResults);
      
      // Создаем смету в системе
      await supabase.functions.invoke('ai-estimator', {
        body: {
          action: 'create_estimate',
          data: {
            estimate: {
              title: `Смета: ${techSpec.objectDescription.slice(0, 50)}...`,
              services: services,
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +30 дней
            }
          }
        }
      });
      
      toast({
        title: "Смета создана",
        description: "ИИ-сметчик успешно рассчитал материалы и создал смету на основе ваших данных"
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
            ← Назад
          </Button>
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

      <Tabs defaultValue="technical-spec" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="technical-spec">Техническое задание</TabsTrigger>
          <TabsTrigger value="results">Смета</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="technical-spec" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Описание объекта */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Описание объекта
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Основное описание</Label>
                  <div className="relative">
                    <Textarea
                      value={techSpec.objectDescription}
                      onChange={(e) => updateTechSpec('objectDescription', e.target.value)}
                      placeholder="Описание объекта благоустройства..."
                      className="min-h-[120px] pr-12"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={startVoiceInput}
                      disabled={isRecording}
                    >
                      <Mic className={`h-4 w-4 ${isRecording ? 'text-red-500' : ''}`} />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>География расположения</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={techSpec.location}
                      onChange={(e) => updateTechSpec('location', e.target.value)}
                      placeholder="Адрес или регион..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button variant="outline" onClick={generateDescription} className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Сгенерировать описание
                </Button>
              </CardContent>
            </Card>

            {/* Виды работ и услуг */}
            <Card>
              <CardHeader>
                <CardTitle>Виды работ и услуг</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {availableServices.map((service) => (
                    <div key={service} className="flex items-center space-x-2">
                      <Checkbox
                        id={service}
                        checked={techSpec.selectedServices.includes(service)}
                        onCheckedChange={() => toggleService(service)}
                      />
                      <Label htmlFor={service} className="text-sm">
                        {service}
                      </Label>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Дополнительные услуги</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Введите название услуги..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addCustomService(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        const input = e.currentTarget.parentNode?.querySelector('input') as HTMLInputElement;
                        if (input) {
                          addCustomService(input.value);
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {techSpec.customServices.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {techSpec.customServices.map((service) => (
                        <Badge key={service} variant="secondary" className="flex items-center gap-1">
                          {service}
                          <button
                            onClick={() => removeCustomService(service)}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Состав работ */}
            <Card>
              <CardHeader>
                <CardTitle>Состав работ и услуг</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={techSpec.workComposition}
                  onChange={(e) => updateTechSpec('workComposition', e.target.value)}
                  placeholder="Детальное описание состава работ..."
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>

            {/* Используемые материалы */}
            <Card>
              <CardHeader>
                <CardTitle>Используемые материалы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {availableMaterials.map((material) => (
                    <div key={material} className="flex items-center space-x-2">
                      <Checkbox
                        id={material}
                        checked={techSpec.selectedMaterials.includes(material)}
                        onCheckedChange={() => toggleMaterial(material)}
                      />
                      <Label htmlFor={material} className="text-sm">
                        {material}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Условия оплаты */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Условия оплаты</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={techSpec.paymentTerms}
                  onChange={(e) => updateTechSpec('paymentTerms', e.target.value)}
                  placeholder="Условия и график оплаты..."
                  className="min-h-[80px]"
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={calculateEstimate}
              disabled={calculating || (techSpec.selectedServices.length === 0 && techSpec.customServices.length === 0)}
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
                  <p className="text-sm">Перейдите на вкладку "Техническое задание" для создания сметы</p>
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