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
        <div style={{
          display: 'flex', 
          minHeight: '100vh', 
          backgroundColor: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            width: '250px',
            background: 'linear-gradient(180deg, #16a34a, #15803d)',
            color: 'white',
            padding: '1rem'
          }}>
            <h1 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem', color: 'white'}}>
              ParkConstructionCRM
            </h1>
            <AppSidebar />
          </div>
          
          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <header style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'white',
              padding: '1rem 2rem',
              borderBottom: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <SidebarTrigger style={{
                  height: '2rem', 
                  width: '2rem', 
                  padding: 0,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem'
                }}>
                  <Menu style={{height: '1rem', width: '1rem'}} />
                </SidebarTrigger>
                <div style={{fontSize: '0.875rem', color: '#64748b'}}>
                  CRM система для ландшафтного бизнеса
                </div>
              </div>
              
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <div style={{fontSize: '0.875rem', fontWeight: 500, color: '#1e293b'}}>
                  {user?.email}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  style={{
                    height: '2rem', 
                    width: '2rem', 
                    padding: 0,
                    backgroundColor: 'transparent',
                    border: 'none'
                  }}
                >
                  <LogOut style={{height: '1rem', width: '1rem'}} />
                </Button>
              </div>
            </header>

            <main style={{flex: 1, padding: '2rem', backgroundColor: '#f8fafc'}}>
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}