import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAISettings } from "@/hooks/useAISettings";
import { Save, TrendingUp } from "lucide-react";

export const SalesManagerSettings = () => {
  const { settings, loading, saveSettings } = useAISettings('sales');
  
  const [formData, setFormData] = useState({
    auto_lead_scoring: true,
    follow_up_reminders: true,
    pipeline_automation: true,
    lead_qualification_threshold: 70,
    auto_proposal_generation: false,
    crm_sync_enabled: true,
    email_templates_enabled: true,
    conversion_tracking: true
  });

  useEffect(() => {
    if (settings?.settings) {
      setFormData({ ...formData, ...settings.settings });
    }
  }, [settings]);

  const handleSave = async () => {
    await saveSettings(formData);
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Настройки AI Менеджера продаж</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Управление лидами</CardTitle>
            <CardDescription>Автоматизация работы с потенциальными клиентами</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоскоринг лидов</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматическая оценка качества лидов
                </p>
              </div>
              <Switch
                checked={formData.auto_lead_scoring}
                onCheckedChange={(checked) => setFormData({...formData, auto_lead_scoring: checked})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Порог квалификации лидов (%)</Label>
              <Input
                id="threshold"
                type="number"
                value={formData.lead_qualification_threshold}
                onChange={(e) => setFormData({...formData, lead_qualification_threshold: parseInt(e.target.value)})}
                min={0}
                max={100}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Напоминания о следующих шагах</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматические уведомления о контактах
                </p>
              </div>
              <Switch
                checked={formData.follow_up_reminders}
                onCheckedChange={(checked) => setFormData({...formData, follow_up_reminders: checked})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Автоматизация</CardTitle>
            <CardDescription>Настройки автоматических процессов</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоматизация воронки</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматическое перемещение по стадиям
                </p>
              </div>
              <Switch
                checked={formData.pipeline_automation}
                onCheckedChange={(checked) => setFormData({...formData, pipeline_automation: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автогенерация предложений</Label>
                <p className="text-xs text-muted-foreground">
                  Создавать предложения автоматически
                </p>
              </div>
              <Switch
                checked={formData.auto_proposal_generation}
                onCheckedChange={(checked) => setFormData({...formData, auto_proposal_generation: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Отслеживание конверсий</Label>
                <p className="text-xs text-muted-foreground">
                  Анализ эффективности продаж
                </p>
              </div>
              <Switch
                checked={formData.conversion_tracking}
                onCheckedChange={(checked) => setFormData({...formData, conversion_tracking: checked})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Сохранить настройки
        </Button>
      </div>
    </div>
  );
};