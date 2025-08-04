import { Outlet } from "react-router-dom";
import { Menu, LogOut, LayoutGrid } from "lucide-react";
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
        <div className="min-h-screen flex w-full bg-background overflow-x-hidden max-w-screen">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center justify-between px-4 border-b bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary text-primary border border-primary/20 rounded-md">
                  <LayoutGrid className="h-6 w-6" />
                </SidebarTrigger>
                <div className="text-sm text-muted-foreground">
                  Ландшафтная CRM
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

            <main className="flex-1 overflow-auto max-w-full overflow-x-hidden">
              <div className="w-full max-w-full">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}