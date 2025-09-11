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
  HardHat
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

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

const navigationItems = [
  { title: "Дашборд", url: "/", icon: LayoutDashboard },
  { title: "Клиенты и заявки", url: "/clients", icon: Users },
  { title: "AI-Технолог", url: "/ai-technical-specialist", icon: HardHat },
  { title: "Сметы", url: "/estimates", icon: Calculator },
  { title: "Коммерческие предложения", url: "/proposals", icon: FileText },
  { title: "Подрядчики", url: "/contractors", icon: Wrench },
  { title: "Поставщики", url: "/suppliers", icon: Truck },
  { title: "Номенклатура", url: "/nomenclature", icon: Package },
  { title: "Задачи", url: "/tasks", icon: CheckSquare },
  { title: "Архив проектов", url: "/archive", icon: Archive },
  { title: "ИИ-помощники", url: "/ai-assistants", icon: Bot },
  { title: "Голосовой помощник", url: "/voice-chat", icon: Mic },
  
  
  { title: "Управление пользователями", url: "/user-management", icon: UserCog },
];

export function AppSidebar() {
  const { state, setOpen, isMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

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
              {navigationItems.map((item) => (
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