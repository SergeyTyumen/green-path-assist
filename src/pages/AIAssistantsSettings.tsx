import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Key, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { BaseAISettings } from "@/components/ai-settings/BaseAISettings";
import { APIKeysManager } from "@/components/settings/APIKeysManager";
import { supabase } from "@/integrations/supabase/client";
const AIAssistantsSettings = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });
      
      if (error) throw error;
      setIsAdmin(data);
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800 dark:text-red-200">Доступ запрещен</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 dark:text-red-300">
              У вас нет административных прав для доступа к настройкам системы.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Настройки системы</h1>
          <p className="text-muted-foreground">
            Общие настройки и конфигурация API ключей для всех AI ассистентов
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Уведомление об административных правах */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-800 dark:text-amber-200">Административный доступ</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              У вас есть административные права для настройки системы. Настройки отдельных ассистентов доступны на главной странице AI помощников.
            </p>
          </CardContent>
        </Card>

        {/* Базовые настройки AI и API ключи */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Key className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Общие настройки и API ключи</CardTitle>
                <CardDescription>
                  Настройка API ключей и базовых параметров для всех AI ассистентов
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <BaseAISettings />
              <APIKeysManager />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIAssistantsSettings;