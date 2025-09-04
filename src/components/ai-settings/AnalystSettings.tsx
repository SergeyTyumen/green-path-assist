import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAISettings } from "@/hooks/useAISettings";
import { Save, BarChart3 } from "lucide-react";

export const AnalystSettings = () => {
  const { settings, loading, saveSettings } = useAISettings('analyst');
  
  const [formData, setFormData] = useState({
    auto_reports: true,
    report_frequency: 'weekly',
    include_forecasting: true,
    trend_analysis: true,
    competitor_tracking: false,
    financial_analysis: true,
    performance_metrics: true,
    export_format: 'pdf'
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
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Настройки AI Аналитика</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Отчеты и аналитика</CardTitle>
            <CardDescription>Настройки генерации отчетов</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоматические отчеты</Label>
                <p className="text-xs text-muted-foreground">
                  Генерировать отчеты по расписанию
                </p>
              </div>
              <Switch
                checked={formData.auto_reports}
                onCheckedChange={(checked) => setFormData({...formData, auto_reports: checked})}
              />
            </div>

            <div className="space-y-2">
              <Label>Частота отчетов</Label>
              <Select 
                value={formData.report_frequency} 
                onValueChange={(value) => setFormData({...formData, report_frequency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Ежедневно</SelectItem>
                  <SelectItem value="weekly">Еженедельно</SelectItem>
                  <SelectItem value="monthly">Ежемесячно</SelectItem>
                  <SelectItem value="quarterly">Ежеквартально</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Прогнозирование</Label>
                <p className="text-xs text-muted-foreground">
                  Включать прогнозы в отчеты
                </p>
              </div>
              <Switch
                checked={formData.include_forecasting}
                onCheckedChange={(checked) => setFormData({...formData, include_forecasting: checked})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Типы анализа</CardTitle>
            <CardDescription>Виды аналитических данных</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Анализ трендов</Label>
                <p className="text-xs text-muted-foreground">
                  Выявление тенденций в данных
                </p>
              </div>
              <Switch
                checked={formData.trend_analysis}
                onCheckedChange={(checked) => setFormData({...formData, trend_analysis: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Финансовый анализ</Label>
                <p className="text-xs text-muted-foreground">
                  Анализ финансовых показателей
                </p>
              </div>
              <Switch
                checked={formData.financial_analysis}
                onCheckedChange={(checked) => setFormData({...formData, financial_analysis: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Метрики производительности</Label>
                <p className="text-xs text-muted-foreground">
                  KPI и операционные показатели
                </p>
              </div>
              <Switch
                checked={formData.performance_metrics}
                onCheckedChange={(checked) => setFormData({...formData, performance_metrics: checked})}
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