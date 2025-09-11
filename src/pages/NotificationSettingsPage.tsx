import { NotificationSettings } from "@/components/NotificationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function NotificationSettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Настройки уведомлений</h1>
          <p className="text-muted-foreground">
            Управление уведомлениями для мобильного приложения
          </p>
        </div>
      </div>

      <NotificationSettings />
    </div>
  );
}