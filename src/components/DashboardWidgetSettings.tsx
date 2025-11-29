import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useProfiles } from '@/hooks/useProfiles';
import { supabase } from '@/integrations/supabase/client';
import { WIDGET_CONFIGS, WIDGET_PRESETS } from '@/config/dashboardWidgets';
import { DashboardWidget, WidgetSize } from '@/types/dashboard';
import { Loader2, GripVertical, LayoutGrid } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableWidgetItemProps {
  widget: DashboardWidget;
  config: any;
  onToggle: (id: string) => void;
  onSizeChange: (id: string, size: WidgetSize) => void;
}

function SortableWidgetItem({ widget, config, onToggle, onSizeChange }: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = config.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-card border rounded-lg"
    >
      <div className="flex items-center gap-3 flex-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <Label className="text-sm font-medium">{config.title}</Label>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={widget.size}
          onValueChange={(value: WidgetSize) => onSizeChange(widget.id, value)}
          disabled={!widget.enabled}
        >
          <SelectTrigger className="w-[110px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Малый</SelectItem>
            <SelectItem value="medium">Средний</SelectItem>
            <SelectItem value="large">Большой</SelectItem>
          </SelectContent>
        </Select>
        <Switch
          checked={widget.enabled}
          onCheckedChange={() => onToggle(widget.id)}
        />
      </div>
    </div>
  );
}

export function DashboardWidgetSettings() {
  const { currentProfile } = useProfiles();
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Загрузка настроек из профиля
  useEffect(() => {
    if (currentProfile) {
      const prefs = currentProfile.ui_preferences as any;
      if (prefs?.dashboard_widgets && Array.isArray(prefs.dashboard_widgets)) {
        setWidgets(prefs.dashboard_widgets);
      } else {
        // Установка значений по умолчанию для менеджера
        setWidgets(WIDGET_PRESETS.manager as DashboardWidget[]);
      }
    }
  }, [currentProfile]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  };

  const handleSizeChange = (widgetId: string, size: WidgetSize) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, size } : w))
    );
  };

  const handleToggle = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleApplyPreset = (preset: 'manager' | 'director' | 'master') => {
    setWidgets(WIDGET_PRESETS[preset] as DashboardWidget[]);
    toast({
      title: 'Шаблон применен',
      description: `Установлен шаблон для роли "${preset === 'manager' ? 'Менеджер' : preset === 'director' ? 'Руководитель' : 'Мастер'}"`,
    });
  };

  const handleSave = async () => {
    if (!currentProfile) return;

    setSaving(true);
    try {
      const currentPrefs = (currentProfile.ui_preferences as any) || {};
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ui_preferences: {
            ...currentPrefs,
            dashboard_widgets: widgets
          }
        })
        .eq('user_id', currentProfile.user_id);

      if (error) throw error;

      toast({
        title: 'Настройки сохранены',
        description: 'Виджеты дашборда обновлены',
      });
    } catch (error) {
      console.error('Error saving dashboard settings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setWidgets(WIDGET_PRESETS.manager as DashboardWidget[]);
    toast({
      title: 'Настройки сброшены',
      description: 'Восстановлены настройки по умолчанию',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Настройка дашборда
            </CardTitle>
            <CardDescription>
              Настройте виджеты рабочего стола: перетаскивайте для изменения порядка и включайте/выключайте нужные
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Шаблоны */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Быстрая настройка по шаблону</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('manager')}
            >
              Менеджер
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('director')}
            >
              Руководитель
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('master')}
            >
              Мастер
            </Button>
          </div>
        </div>

        {/* Табы по категориям */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Все виджеты (перетащите для изменения порядка)</Label>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              {widgets.map((widget) => {
                const config = WIDGET_CONFIGS[widget.id];
                if (!config) return null;

                return (
                  <SortableWidgetItem
                    key={widget.id}
                    widget={widget}
                    config={config}
                    onToggle={handleToggle}
                    onSizeChange={handleSizeChange}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>

        {/* Кнопки управления */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            Сбросить
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить настройки'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
