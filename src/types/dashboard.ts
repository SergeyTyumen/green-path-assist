export type WidgetSize = 'small' | 'medium' | 'large';

export type WidgetId = 
  | 'new_leads'
  | 'new_messages'
  | 'active_clients'
  | 'my_tasks'
  | 'estimates_in_work'
  | 'proposals_sent'
  | 'ai_notifications'
  | 'project_statuses'
  | 'revenue'
  | 'contractors_status'
  | 'team_stats'
  | 'sales_funnel'
  | 'ai_consultant_stats'
  | 'recent_clients'
  | 'suppliers'
  | 'completed_projects';

export interface DashboardWidget {
  id: WidgetId;
  enabled: boolean;
  size: WidgetSize;
  order: number;
}

export interface DashboardWidgetConfig {
  id: WidgetId;
  title: string;
  description: string;
  defaultSize: WidgetSize;
  availableSizes: WidgetSize[];
  category: 'manager' | 'director' | 'master' | 'common';
  icon: React.ComponentType<any>;
}

export interface WidgetData {
  title: string;
  value: string | number;
  description?: string;
  trend?: number;
  highlight?: boolean;
  onClick?: () => void;
}
