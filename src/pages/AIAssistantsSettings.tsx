import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Key, ShieldCheck, Calculator, FileText, TrendingUp, BarChart3, Users, Truck, HardHat, Target, Mic, Building } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { BaseAISettings } from "@/components/ai-settings/BaseAISettings";
import TechnicalSpecialistSettings from "@/components/ai-settings/TechnicalSpecialistSettings";
import { APIKeysManager } from "@/components/settings/APIKeysManager";
import { supabase } from "@/integrations/supabase/client";

const AIAssistantsSettings = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");

  const assistantTabs = [
    { id: "general", name: "Общие настройки", icon: Settings },
    { id: "technical", name: "AI-Технолог", icon: Building },
    { id: "api", name: "API ключи", icon: Key },
  ];

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

        {/* Навигация по вкладкам */}
        <Card>
          <CardContent className="p-0">
            <div className="flex border-b">
              {assistantTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    className="rounded-none flex-1 justify-start gap-2"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.name}
                  </Button>
                );
              })}
            </div>
            <div className="p-6">
              {activeTab === "general" && <BaseAISettings />}
              {activeTab === "technical" && <TechnicalSpecialistSettings />}
              {activeTab === "api" && <APIKeysManager />}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIAssistantsSettings;