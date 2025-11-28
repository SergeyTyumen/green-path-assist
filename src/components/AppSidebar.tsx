import { 
  Users, 
  Calculator, 
  FileText, 
  Wrench, 
  Truck, 
  Package, 
  CheckSquare, 
  Archive, 
  Bot,
  LayoutDashboard,
  Mic,
  MessageCircle,
  Settings,
  UserCog,
  HardHat,
  User,
  BookOpen,
  FileSpreadsheet,
  Bell
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useProfiles } from "@/hooks/useProfiles";
import { useUserRole, UserRole } from "@/hooks/useUserRole";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type NavigationItem = {
  id: string;
  title: string;
  url: string;
  icon: any;
  requireRole?: UserRole;
};

const navigationItems: NavigationItem[] = [
  { id: "dashboard", title: "Дашборд", url: "/", icon: LayoutDashboard },
  { id: "master-dashboard", title: "Панель мастера", url: "/master-dashboard", icon: HardHat, requireRole: "master" },
  { id: "clients", title: "Клиенты и заявки", url: "/clients", icon: Users },
  { id: "ai-technical-specialist", title: "AI-Технолог", url: "/ai-technical-specialist", icon: HardHat },
  { id: "technical-specifications", title: "Технические задания", url: "/technical-specifications", icon: FileText },
  { id: "normative-documents", title: "Нормативная база", url: "/normative-documents", icon: BookOpen },
  { id: "estimate-templates", title: "Шаблоны смет", url: "/estimate-templates", icon: FileSpreadsheet },
  { id: "estimates", title: "Сметы", url: "/estimates", icon: Calculator },
  { id: "proposals", title: "Коммерческие предложения", url: "/proposals", icon: FileText },
  { id: "contractors", title: "Подрядчики", url: "/contractors", icon: Wrench },
  { id: "suppliers", title: "Поставщики", url: "/suppliers", icon: Truck },
  { id: "nomenclature", title: "Номенклатура", url: "/nomenclature", icon: Package },
  { id: "tasks", title: "Задачи", url: "/tasks", icon: CheckSquare },
  { id: "archive", title: "Архив проектов", url: "/archive", icon: Archive },
  { id: "ai-assistants", title: "ИИ-помощники", url: "/ai-assistants", icon: Bot },
  { id: "voice-chat", title: "Голосовой помощник", url: "/voice-chat", icon: Mic },
  { id: "notification-settings", title: "Настройки уведомлений", url: "/notification-settings", icon: Bell },
  { id: "user-profile", title: "Профили пользователей", url: "/user-profile", icon: User },
  { id: "user-management", title: "Управление пользователями", url: "/user-management", icon: UserCog },
];

export function AppSidebar() {
  const { state, setOpen, isMobile } = useSidebar();
  const { currentProfile } = useProfiles();
  const { hasRole } = useUserRole();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  // Фильтруем пункты меню на основе настроек пользователя и ролей
  // ВАЖНО: "user-profile" всегда должен быть виден, чтобы пользователь мог попасть в настройки
  const visibleMenuItems = currentProfile?.ui_preferences?.visible_menu_items;
  const filteredNavigationItems = navigationItems.filter(item => {
    // Проверяем требование роли
    if (item.requireRole && !hasRole(item.requireRole)) {
      return false;
    }
    
    // Проверяем видимость в настройках
    if (visibleMenuItems && visibleMenuItems.length > 0) {
      return visibleMenuItems.includes(item.id) || item.id === "user-profile";
    }
    
    return true;
  });

  const handleNavClick = () => {
    // Auto-collapse sidebar when navigation item is clicked on mobile
    if (isMobile) {
      setOpen(false);
    }
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    const active = isActive(path);
    return active 
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-accent hover:text-accent-foreground transition-colors";
  };

  return (
    <Sidebar 
      variant={isMobile ? "floating" : "sidebar"}
      collapsible="icon"
      className="border-r bg-gradient-to-b from-card to-muted/30"
    >
      <SidebarContent className="p-0">
        <div className="p-4 border-b">
          {!collapsed && (
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
              <img 
                src="/lovable-uploads/900f396b-e7ec-4d42-b47f-de8d106ffd9b.png" 
                alt="ParkConstructionCRM" 
                className="h-6 w-6" 
              />
              <span className="truncate">ParkConstructionCRM</span>
            </h2>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <img 
                src="/lovable-uploads/900f396b-e7ec-4d42-b47f-de8d106ffd9b.png" 
                alt="ParkConstructionCRM" 
                className="h-6 w-6" 
              />
            </div>
          )}
        </div>

        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={collapsed ? "sr-only" : "px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider"}>
            Навигация
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {filteredNavigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className={getNavClassName(item.url)}
                      onClick={handleNavClick}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {(!collapsed || isMobile) && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}