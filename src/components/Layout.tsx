import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";

export function Layout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between px-4 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
                <Menu className="h-4 w-4" />
              </SidebarTrigger>
              <div className="text-sm text-muted-foreground">
                CRM система для ландшафтного бизнеса
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-foreground">
                Администратор
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}