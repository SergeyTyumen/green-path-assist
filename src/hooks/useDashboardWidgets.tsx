import { useState, useEffect } from 'react';
import { useProfiles } from './useProfiles';
import { DashboardWidget, WidgetSize } from '@/types/dashboard';
import { WIDGET_PRESETS } from '@/config/dashboardWidgets';

// Миграция старых размеров в новые
function migrateWidgetSize(oldSize: string): WidgetSize {
  const sizeMap: Record<string, WidgetSize> = {
    '1x1': 'small',
    '1x2': 'medium',
    '2x1': 'medium',
    '2x2': 'large'
  };
  
  return sizeMap[oldSize] || 'small';
}

export function useDashboardWidgets() {
  const { currentProfile } = useProfiles();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);

  useEffect(() => {
    if (currentProfile) {
      const prefs = currentProfile.ui_preferences as any;
      if (prefs?.dashboard_widgets && Array.isArray(prefs.dashboard_widgets)) {
        // Мигрируем старые размеры в новые и сортируем виджеты по порядку
        const migratedWidgets = prefs.dashboard_widgets.map((widget: any) => ({
          ...widget,
          size: migrateWidgetSize(widget.size)
        }));
        const sortedWidgets = [...migratedWidgets].sort((a, b) => a.order - b.order);
        setWidgets(sortedWidgets);
      } else {
        // Установка значений по умолчанию для менеджера
        setWidgets(WIDGET_PRESETS.manager as DashboardWidget[]);
      }
    }
  }, [currentProfile]);

  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);

  return {
    widgets: enabledWidgets,
    loading: !currentProfile
  };
}
