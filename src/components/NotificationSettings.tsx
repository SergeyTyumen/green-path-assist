import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, BellOff, Smartphone, Settings, Volume2, Vibrate } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const NotificationSettings = () => {
  const { 
    isSupported, 
    settings, 
    loading, 
    updateSettings, 
    requestPermissions 
  } = useNotifications();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Настройки уведомлений
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Уведомления недоступны
          </CardTitle>
          <CardDescription>
            Уведомления доступны только в мобильном приложении
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Для получения уведомлений используйте мобильную версию приложения
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Настройки уведомлений
          {settings.enabled && <Badge variant="secondary">Включены</Badge>}
        </CardTitle>
        <CardDescription>
          Управляйте уведомлениями о задачах и напоминаниях
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Основные настройки */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications-enabled" className="text-base font-medium">
                Включить уведомления
              </Label>
              <p className="text-sm text-muted-foreground">
                Общий переключатель для всех уведомлений
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          {settings.enabled && (
            <>
              <Separator />
              
              {/* Типы уведомлений */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Типы уведомлений
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="task-reminders" className="text-sm font-medium">
                        Напоминания о задачах
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Уведомления за час до дедлайна
                      </p>
                    </div>
                    <Switch
                      id="task-reminders"
                      checked={settings.taskReminders}
                      onCheckedChange={(taskReminders) => updateSettings({ taskReminders })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="overdue-alerts" className="text-sm font-medium">
                        Просроченные задачи
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Уведомления о просроченных задачах
                      </p>
                    </div>
                    <Switch
                      id="overdue-alerts"
                      checked={settings.overdueAlerts}
                      onCheckedChange={(overdueAlerts) => updateSettings({ overdueAlerts })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="new-task-alerts" className="text-sm font-medium">
                        Новые задачи
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Уведомления о созданных задачах
                      </p>
                    </div>
                    <Switch
                      id="new-task-alerts"
                      checked={settings.newTaskAlerts}
                      onCheckedChange={(newTaskAlerts) => updateSettings({ newTaskAlerts })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Настройки воспроизведения */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Настройки воспроизведения
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sound-enabled" className="text-sm font-medium">
                        Звуковые уведомления
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Воспроизводить звук при уведомлениях
                      </p>
                    </div>
                    <Switch
                      id="sound-enabled"
                      checked={settings.soundEnabled}
                      onCheckedChange={(soundEnabled) => updateSettings({ soundEnabled })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="vibration-enabled" className="text-sm font-medium">
                        Вибрация
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Вибрировать при уведомлениях
                      </p>
                    </div>
                    <Switch
                      id="vibration-enabled"
                      checked={settings.vibrationEnabled}
                      onCheckedChange={(vibrationEnabled) => updateSettings({ vibrationEnabled })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Действия */}
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  onClick={requestPermissions}
                  className="w-full"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Проверить разрешения
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  Если уведомления не приходят, убедитесь что разрешения предоставлены в настройках устройства
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};