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
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center justify-between px-2 sm:px-4 border-b bg-card/50 backdrop-blur-sm shrink-0 sticky top-0 z-40">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <SidebarTrigger className="h-9 w-9 sm:h-10 sm:w-10 p-0 hover:bg-primary/10 hover:text-primary text-primary border border-primary/20 rounded-md shrink-0">
                  <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6" />
                </SidebarTrigger>
                <div className="text-xs sm:text-sm text-muted-foreground truncate">
                  Ландшафтная CRM
                </div>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <div className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-none">
                  {user?.email}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="h-8 w-8 p-0 shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <main className="flex-1 overflow-auto max-w-full min-w-0">
              <div className="w-full max-w-full min-w-0">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}