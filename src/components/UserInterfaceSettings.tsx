import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useProfiles } from '@/hooks/useProfiles';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface MenuItemConfig {
  id: string;
  label: string;
  description?: string;
}

const MENU_ITEMS: MenuItemConfig[] = [
  { id: 'dashboard', label: 'Дашборд', description: 'Главная страница с общей статистикой' },
  { id: 'clients', label: 'Клиенты', description: 'База клиентов CRM' },
  { id: 'tasks', label: 'Задачи', description: 'Управление задачами' },
  { id: 'estimates', label: 'Сметы', description: 'Создание и управление сметами' },
  { id: 'proposals', label: 'Коммерческие предложения', description: 'КП для клиентов' },
  { id: 'technical-specifications', label: 'Технические задания', description: 'ТЗ для проектов' },
  { id: 'contractors', label: 'Подрядчики', description: 'База подрядчиков' },
  { id: 'suppliers', label: 'Поставщики', description: 'База поставщиков' },
  { id: 'nomenclature', label: 'Номенклатура', description: 'Материалы и услуги' },
  { id: 'ai-assistants', label: 'AI Помощники', description: 'Искусственный интеллект для работы' },
  { id: 'voice-chat', label: 'Голосовой помощник', description: 'Голосовое управление CRM' },
  { id: 'competitor-analysis', label: 'Анализ конкурентов', description: 'Анализ рынка и конкурентов' },
  { id: 'user-management', label: 'Управление пользователями', description: 'Администрирование пользователей' },
  { id: 'archive', label: 'Архив', description: 'Закрытые сделки' },
];

const DASHBOARD_WIDGETS: MenuItemConfig[] = [
  { id: 'stats', label: 'Статистика', description: 'Основные показатели' },
  { id: 'recent_clients', label: 'Последние клиенты', description: 'Недавно добавленные клиенты' },
  { id: 'tasks_today', label: 'Задачи на сегодня', description: 'Актуальные задачи' },
  { id: 'ai_consultant', label: 'AI Консультант', description: 'Статистика AI помощника' }
];

export function UserInterfaceSettings() {
  const { currentProfile, updateProfile } = useProfiles();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedMenuItems, setSelectedMenuItems] = useState<string[]>([]);
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);

  useEffect(() => {
    if (currentProfile?.ui_preferences) {
      const prefs = currentProfile.ui_preferences as any;
      setSelectedMenuItems(prefs.visible_menu_items || []);
      setSelectedWidgets(prefs.dashboard_widgets || []);
    } else {
      // По умолчанию все включено
      setSelectedMenuItems(MENU_ITEMS.map(item => item.id));
      setSelectedWidgets(DASHBOARD_WIDGETS.map(widget => widget.id));
    }
  }, [currentProfile]);

  const handleMenuItemToggle = (itemId: string) => {
    setSelectedMenuItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleWidgetToggle = (widgetId: string) => {
    setSelectedWidgets(prev => 
      prev.includes(widgetId) 
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({
        ui_preferences: {
          visible_menu_items: selectedMenuItems,
          dashboard_widgets: selectedWidgets,
        }
      });
      
      toast({
        title: 'Настройки сохранены',
        description: 'Настройки интерфейса успешно обновлены. Обновите страницу для применения изменений.',
      });
      
      // Обновляем страницу для применения изменений
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error saving UI preferences:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки интерфейса',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedMenuItems(MENU_ITEMS.map(item => item.id));
    setSelectedWidgets(DASHBOARD_WIDGETS.map(widget => widget.id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Настройка меню</CardTitle>
          <CardDescription>
            Выберите разделы, которые будут отображаться в боковом меню
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {MENU_ITEMS.map((item) => (
            <div key={item.id} className="flex items-start space-x-3">
              <Checkbox
                id={`menu-${item.id}`}
                checked={selectedMenuItems.includes(item.id)}
                onCheckedChange={() => handleMenuItemToggle(item.id)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor={`menu-${item.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {item.label}
                </Label>
                {item.description && (
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Настройка дашборда</CardTitle>
          <CardDescription>
            Выберите виджеты, которые будут отображаться на главной странице
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DASHBOARD_WIDGETS.map((widget) => (
            <div key={widget.id} className="flex items-start space-x-3">
              <Checkbox
                id={`widget-${widget.id}`}
                checked={selectedWidgets.includes(widget.id)}
                onCheckedChange={() => handleWidgetToggle(widget.id)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor={`widget-${widget.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {widget.label}
                </Label>
                {widget.description && (
                  <p className="text-sm text-muted-foreground">
                    {widget.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить настройки
        </Button>
        <Button onClick={handleReset} variant="outline" disabled={loading}>
          Сбросить по умолчанию
        </Button>
      </div>
    </div>
  );
}
