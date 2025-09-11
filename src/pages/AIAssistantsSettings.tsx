import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Key, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { BaseAISettings } from "@/components/ai-settings/BaseAISettings";
import { APIKeysManager } from "@/components/settings/APIKeysManager";
const AIAssistantsSettings = () => {
  const { user } = useAuth();

  // Проверка на администратора (в будущем можно добавить проверку роли из базы данных)
  // Пока что считаем администратором первого зарегистрированного пользователя или проверяем email
  const isAdmin = user?.email === 'admin@company.com' || user?.user_metadata?.role === 'admin';

  if (!isAdmin) {
    return <Navigate to="/" replace />;
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