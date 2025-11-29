import { 
  MessageSquare, 
  MessageCircle, 
  Users, 
  CheckSquare, 
  Calculator, 
  FileText, 
  Bell,
  Activity,
  TrendingUp,
  Briefcase,
  UsersIcon,
  Filter,
  UserCheck,
  Package,
  Trophy
} from "lucide-react";
import { DashboardWidgetConfig } from "@/types/dashboard";

export const WIDGET_CONFIGS: Record<string, DashboardWidgetConfig> = {
  new_leads: {
    id: 'new_leads',
    title: 'Новые заявки',
    description: 'Лиды, требующие обработки',
    defaultSize: 'small',
    availableSizes: ['small', 'medium', 'large'],
    category: 'manager',
    icon: MessageSquare
  },
  new_messages: {
    id: 'new_messages',
    title: 'Новые сообщения',
    description: 'Сообщения от клиентов',
    defaultSize: 'small',
    availableSizes: ['small', 'medium', 'large'],
    category: 'manager',
    icon: MessageCircle
  },
  active_clients: {
    id: 'active_clients',
    title: 'Активные клиенты',
    description: 'Клиенты в работе',
    defaultSize: 'small',
    availableSizes: ['small', 'medium', 'large'],
    category: 'common',
    icon: Users
  },
  my_tasks: {
    id: 'my_tasks',
    title: 'Мои задачи',
    description: 'Текущие задачи',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    category: 'common',
    icon: CheckSquare
  },
  estimates_in_work: {
    id: 'estimates_in_work',
    title: 'Сметы в работе',
    description: 'Сметы на согласовании',
    defaultSize: 'small',
    availableSizes: ['small', 'medium', 'large'],
    category: 'manager',
    icon: Calculator
  },
  proposals_sent: {
    id: 'proposals_sent',
    title: 'Отправленные КП',
    description: 'Коммерческие предложения',
    defaultSize: 'small',
    availableSizes: ['small', 'medium', 'large'],
    category: 'manager',
    icon: FileText
  },
  ai_notifications: {
    id: 'ai_notifications',
    title: 'AI-уведомления',
    description: 'Предложения от ассистента',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    category: 'common',
    icon: Bell
  },
  project_statuses: {
    id: 'project_statuses',
    title: 'Статусы проектов',
    description: 'Прогресс по проектам',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    category: 'common',
    icon: Activity
  },
  revenue: {
    id: 'revenue',
    title: 'Общий оборот',
    description: 'Финансовая статистика',
    defaultSize: 'small',
    availableSizes: ['small', 'medium', 'large'],
    category: 'director',
    icon: TrendingUp
  },
  contractors_status: {
    id: 'contractors_status',
    title: 'Подрядчики',
    description: 'Занятость по объектам',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    category: 'director',
    icon: Briefcase
  },
  team_stats: {
    id: 'team_stats',
    title: 'Команда',
    description: 'Загрузка менеджеров',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    category: 'director',
    icon: UsersIcon
  },
  sales_funnel: {
    id: 'sales_funnel',
    title: 'Воронка продаж',
    description: 'Конверсия по этапам',
    defaultSize: 'large',
    availableSizes: ['small', 'medium', 'large'],
    category: 'director',
    icon: Filter
  },
  ai_consultant_stats: {
    id: 'ai_consultant_stats',
    title: 'AI-консультант',
    description: 'Статистика работы ассистента',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    category: 'common',
    icon: MessageCircle
  },
  recent_clients: {
    id: 'recent_clients',
    title: 'Недавние клиенты',
    description: 'Последние обращения',
    defaultSize: 'large',
    availableSizes: ['small', 'medium', 'large'],
    category: 'manager',
    icon: UserCheck
  },
  suppliers: {
    id: 'suppliers',
    title: 'Поставщики',
    description: 'Заказы и долги',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    category: 'director',
    icon: Package
  },
  completed_projects: {
    id: 'completed_projects',
    title: 'Завершенные проекты',
    description: 'Проекты за период',
    defaultSize: 'medium',
    availableSizes: ['small', 'medium', 'large'],
    category: 'director',
    icon: Trophy
  }
};

// Предустановленные шаблоны для разных ролей
export const WIDGET_PRESETS = {
  manager: [
    { id: 'new_leads', enabled: true, size: 'small', order: 0 },
    { id: 'new_messages', enabled: true, size: 'small', order: 1 },
    { id: 'active_clients', enabled: true, size: 'small', order: 2 },
    { id: 'my_tasks', enabled: true, size: 'medium', order: 3 },
    { id: 'estimates_in_work', enabled: true, size: 'small', order: 4 },
    { id: 'proposals_sent', enabled: true, size: 'small', order: 5 },
    { id: 'ai_consultant_stats', enabled: true, size: 'medium', order: 6 },
    { id: 'recent_clients', enabled: true, size: 'large', order: 7 }
  ],
  director: [
    { id: 'revenue', enabled: true, size: 'small', order: 0 },
    { id: 'active_clients', enabled: true, size: 'small', order: 1 },
    { id: 'sales_funnel', enabled: true, size: 'large', order: 2 },
    { id: 'team_stats', enabled: true, size: 'medium', order: 3 },
    { id: 'contractors_status', enabled: true, size: 'medium', order: 4 },
    { id: 'completed_projects', enabled: true, size: 'medium', order: 5 },
    { id: 'suppliers', enabled: true, size: 'medium', order: 6 }
  ],
  master: [
    { id: 'my_tasks', enabled: true, size: 'medium', order: 0 },
    { id: 'project_statuses', enabled: true, size: 'medium', order: 1 },
    { id: 'ai_notifications', enabled: true, size: 'medium', order: 2 },
    { id: 'active_clients', enabled: true, size: 'small', order: 3 }
  ]
};
