import { useState, useEffect } from 'react';
import { useProfiles } from './useProfiles';
import { DashboardWidget } from '@/types/dashboard';
import { WIDGET_PRESETS } from '@/config/dashboardWidgets';

export function useDashboardWidgets() {
  const { currentProfile } = useProfiles();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);

  useEffect(() => {
    if (currentProfile) {
      const prefs = currentProfile.ui_preferences as any;
      if (prefs?.dashboard_widgets && Array.isArray(prefs.dashboard_widgets)) {
        // Сортируем виджеты по порядку
        const sortedWidgets = [...prefs.dashboard_widgets].sort((a, b) => a.order - b.order);
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
