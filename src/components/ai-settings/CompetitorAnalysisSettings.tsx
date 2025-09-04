import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAISettings } from "@/hooks/useAISettings";
import { Save, TrendingUp } from "lucide-react";

export const CompetitorAnalysisSettings = () => {
  const { settings, loading, saveSettings } = useAISettings('competitor');
  
  const [formData, setFormData] = useState({
    auto_monitoring: true,
    price_tracking: true,
    social_media_monitoring: false,
    website_monitoring: true,
    alert_threshold: 10,
    analysis_frequency: 'daily',
    competitor_list: '',
    include_seo_analysis: true
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
        <h3 className="text-lg font-semibold">Настройки анализа конкурентов</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Мониторинг</CardTitle>
            <CardDescription>Автоматическое отслеживание конкурентов</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоматический мониторинг</Label>
                <p className="text-xs text-muted-foreground">
                  Регулярное отслеживание изменений
                </p>
              </div>
              <Switch
                checked={formData.auto_monitoring}
                onCheckedChange={(checked) => setFormData({...formData, auto_monitoring: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Отслеживание цен</Label>
                <p className="text-xs text-muted-foreground">
                  Мониторинг ценовых изменений
                </p>
              </div>
              <Switch
                checked={formData.price_tracking}
                onCheckedChange={(checked) => setFormData({...formData, price_tracking: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Мониторинг сайтов</Label>
                <p className="text-xs text-muted-foreground">
                  Отслеживание изменений на сайтах
                </p>
              </div>
              <Switch
                checked={formData.website_monitoring}
                onCheckedChange={(checked) => setFormData({...formData, website_monitoring: checked})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Порог уведомлений (%)</Label>
              <Input
                id="threshold"
                type="number"
                value={formData.alert_threshold}
                onChange={(e) => setFormData({...formData, alert_threshold: parseInt(e.target.value)})}
                min={1}
                max={50}
              />
              <p className="text-xs text-muted-foreground">
                Уведомлять при изменении цен более чем на указанный процент
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Конкуренты</CardTitle>
            <CardDescription>Управление списком конкурентов</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="competitors">Список конкурентов</Label>
              <Textarea
                id="competitors"
                value={formData.competitor_list}
                onChange={(e) => setFormData({...formData, competitor_list: e.target.value})}
                placeholder="Введите названия компаний или сайты конкурентов (по одному на строку)"
                rows={5}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SEO анализ</Label>
                <p className="text-xs text-muted-foreground">
                  Анализ SEO показателей конкурентов
                </p>
              </div>
              <Switch
                checked={formData.include_seo_analysis}
                onCheckedChange={(checked) => setFormData({...formData, include_seo_analysis: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Соцсети</Label>
                <p className="text-xs text-muted-foreground">
                  Мониторинг активности в соцсетях
                </p>
              </div>
              <Switch
                checked={formData.social_media_monitoring}
                onCheckedChange={(checked) => setFormData({...formData, social_media_monitoring: checked})}
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