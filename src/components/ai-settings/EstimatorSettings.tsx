import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAISettings } from "@/hooks/useAISettings";
import { Save, Calculator } from "lucide-react";

export const EstimatorSettings = () => {
  const { settings, loading, saveSettings } = useAISettings('estimator');
  
  const [formData, setFormData] = useState({
    auto_calculate_materials: true,
    include_labor_costs: true,
    markup_percentage: 20,
    currency: 'RUB',
    tax_rate: 20,
    default_work_hours_per_day: 8,
    seasonal_price_adjustment: false,
    custom_pricing_rules: '',
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
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Настройки AI Оценщика</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Расчеты и ценообразование</CardTitle>
            <CardDescription>Основные параметры расчета смет</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Авторасчет материалов</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматически рассчитывать количество материалов
                </p>
              </div>
              <Switch
                checked={formData.auto_calculate_materials}
                onCheckedChange={(checked) => setFormData({...formData, auto_calculate_materials: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Включать трудозатраты</Label>
                <p className="text-xs text-muted-foreground">
                  Добавлять стоимость работ в смету
                </p>
              </div>
              <Switch
                checked={formData.include_labor_costs}
                onCheckedChange={(checked) => setFormData({...formData, include_labor_costs: checked})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="markup">Наценка (%)</Label>
              <Input
                id="markup"
                type="number"
                value={formData.markup_percentage}
                onChange={(e) => setFormData({...formData, markup_percentage: parseInt(e.target.value)})}
                min={0}
                max={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax">НДС (%)</Label>
              <Input
                id="tax"
                type="number"
                value={formData.tax_rate}
                onChange={(e) => setFormData({...formData, tax_rate: parseInt(e.target.value)})}
                min={0}
                max={25}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Дополнительные настройки</CardTitle>
            <CardDescription>Кастомизация процесса оценки</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="work_hours">Рабочих часов в день</Label>
              <Input
                id="work_hours"
                type="number"
                value={formData.default_work_hours_per_day}
                onChange={(e) => setFormData({...formData, default_work_hours_per_day: parseInt(e.target.value)})}
                min={4}
                max={16}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Сезонные корректировки</Label>
                <p className="text-xs text-muted-foreground">
                  Учитывать сезонные изменения цен
                </p>
              </div>
              <Switch
                checked={formData.seasonal_price_adjustment}
                onCheckedChange={(checked) => setFormData({...formData, seasonal_price_adjustment: checked})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom_rules">Кастомные правила ценообразования</Label>
              <Textarea
                id="custom_rules"
                value={formData.custom_pricing_rules}
                onChange={(e) => setFormData({...formData, custom_pricing_rules: e.target.value})}
                placeholder="Опишите специальные правила расчета цен..."
                rows={3}
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