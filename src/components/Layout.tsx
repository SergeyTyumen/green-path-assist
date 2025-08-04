import { Outlet } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

export function Layout() {
  const { user, signOut } = useAuth();

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="main-container">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            <header className="header">
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
                  {user?.email}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="h-8 w-8 p-0"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <main className="main-content">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}