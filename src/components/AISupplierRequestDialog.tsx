import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Bot, Search, Zap, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AISupplierRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (requestData: {
    category: string;
    materials: string[];
    quantity: number;
    unit: string;
    budget: number;
    deadline: string;
    requirements: string;
    priority: string;
  }) => Promise<void>;
}

const materialCategories = [
  'Строительные материалы',
  'Отделочные материалы',
  'Сантехника',
  'Электрика',
  'Инструменты',
  'Крепеж',
  'Ландшафтные материалы',
  'Семена и растения'
];

const commonMaterials = [
  'Цемент', 'Песок', 'Щебень', 'Арматура', 'Кирпич',
  'Плитка керамическая', 'Ламинат', 'Обои',
  'Трубы ПВХ', 'Краны', 'Смесители',
  'Кабель электрический', 'Розетки', 'Выключатели',
  'Саморезы', 'Болты', 'Гвозди',
  'Газонная трава', 'Удобрения', 'Грунт'
];

export function AISupplierRequestDialog({ isOpen, onClose, onSubmit }: AISupplierRequestDialogProps) {
  const { toast } = useToast();
  const [requestData, setRequestData] = useState({
    category: '',
    materials: [] as string[],
    quantity: 0,
    unit: 'шт',
    budget: 0,
    deadline: '',
    requirements: '',
    priority: 'medium'
  });
  const [customMaterial, setCustomMaterial] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMaterialToggle = (material: string) => {
    setRequestData(prev => ({
      ...prev,
      materials: prev.materials.includes(material)
        ? prev.materials.filter(m => m !== material)
        : [...prev.materials, material]
    }));
  };

  const handleAddCustomMaterial = () => {
    if (customMaterial.trim() && !requestData.materials.includes(customMaterial.trim())) {
      setRequestData(prev => ({
        ...prev,
        materials: [...prev.materials, customMaterial.trim()]
      }));
      setCustomMaterial('');
    }
  };

  const handleSubmit = async () => {
    if (!requestData.category || requestData.materials.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите категорию и укажите хотя бы один материал",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await onSubmit(requestData);
      
      toast({
        title: "Заявка создана",
        description: "ИИ-помощник начал поиск поставщиков и отправку запросов цен"
      });
      
      // Сброс формы
      setRequestData({
        category: '',
        materials: [],
        quantity: 0,
        unit: 'шт',
        budget: 0,
        deadline: '',
        requirements: '',
        priority: 'medium'
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать заявку",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            ИИ-заявка поставщикам
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информационный блок */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Автоматический поиск поставщиков</span>
            </div>
            <p className="text-sm text-blue-700">
              ИИ-помощник найдет подходящих поставщиков, отправит запросы цен и предоставит сравнительную таблицу предложений.
            </p>
          </div>

          {/* Основная информация */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Категория материалов *</Label>
              <Select value={requestData.category} onValueChange={(value) => setRequestData({ ...requestData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {materialCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Требуемые материалы *</Label>
              <div className="space-y-3 mt-2">
                {/* Быстрый выбор */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Популярные материалы:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {commonMaterials.slice(0, 12).map((material) => (
                      <div key={material} className="flex items-center space-x-2">
                        <Checkbox
                          id={material}
                          checked={requestData.materials.includes(material)}
                          onCheckedChange={() => handleMaterialToggle(material)}
                        />
                        <Label htmlFor={material} className="text-xs cursor-pointer">
                          {material}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Добавление своего материала */}
                <div className="flex gap-2">
                  <Input
                    value={customMaterial}
                    onChange={(e) => setCustomMaterial(e.target.value)}
                    placeholder="Добавить свой материал..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomMaterial()}
                  />
                  <Button type="button" variant="outline" onClick={handleAddCustomMaterial}>
                    Добавить
                  </Button>
                </div>

                {/* Выбранные материалы */}
                {requestData.materials.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Выбранные материалы:</p>
                    <div className="flex flex-wrap gap-2">
                      {requestData.materials.map((material) => (
                        <Badge 
                          key={material} 
                          variant="secondary" 
                          className="cursor-pointer"
                          onClick={() => handleMaterialToggle(material)}
                        >
                          {material} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantity">Количество</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={requestData.quantity}
                  onChange={(e) => setRequestData({ ...requestData, quantity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="unit">Единица</Label>
                <Select value={requestData.unit} onValueChange={(value) => setRequestData({ ...requestData, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="шт">шт</SelectItem>
                    <SelectItem value="м²">м²</SelectItem>
                    <SelectItem value="м³">м³</SelectItem>
                    <SelectItem value="кг">кг</SelectItem>
                    <SelectItem value="т">тонн</SelectItem>
                    <SelectItem value="л">литров</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="budget">Бюджет (₽)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={requestData.budget}
                  onChange={(e) => setRequestData({ ...requestData, budget: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deadline">Срок поставки</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={requestData.deadline}
                  onChange={(e) => setRequestData({ ...requestData, deadline: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="priority">Приоритет</Label>
                <Select value={requestData.priority} onValueChange={(value) => setRequestData({ ...requestData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="urgent">Срочный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="requirements">Дополнительные требования</Label>
              <Textarea
                id="requirements"
                value={requestData.requirements}
                onChange={(e) => setRequestData({ ...requestData, requirements: e.target.value })}
                placeholder="Укажите особые требования к качеству, доставке, сертификатам..."
                rows={3}
              />
            </div>
          </div>

          {/* Процесс работы ИИ */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Что сделает ИИ-помощник:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Search className="h-3 w-3" />
                <span>Найдет подходящих поставщиков по категории и региону</span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="h-3 w-3" />
                <span>Отправит запросы цен с вашими требованиями</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Соберет ответы и создаст сравнительную таблицу</span>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !requestData.category || requestData.materials.length === 0}
            >
              {loading ? (
                <>Создание заявки...</>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Запустить ИИ-поиск
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}