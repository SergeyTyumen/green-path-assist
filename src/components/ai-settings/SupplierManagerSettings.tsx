import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAISettings } from "@/hooks/useAISettings";
import { Save, Building } from "lucide-react";

export const SupplierManagerSettings = () => {
  const { settings, loading, saveSettings } = useAISettings('supplier');
  
  const [formData, setFormData] = useState({
    auto_supplier_matching: true,
    price_comparison: true,
    quality_scoring: true,
    delivery_tracking: true,
    payment_reminders: true,
    min_order_threshold: 5000,
    preferred_payment_terms: 30,
    auto_reorder_enabled: false
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
        <Building className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Настройки AI Менеджера поставщиков</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Автоматизация</CardTitle>
            <CardDescription>Автоматические процессы работы с поставщиками</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоподбор поставщиков</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматический поиск подходящих поставщиков
                </p>
              </div>
              <Switch
                checked={formData.auto_supplier_matching}
                onCheckedChange={(checked) => setFormData({...formData, auto_supplier_matching: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Сравнение цен</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматическое сравнение предложений
                </p>
              </div>
              <Switch
                checked={formData.price_comparison}
                onCheckedChange={(checked) => setFormData({...formData, price_comparison: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Оценка качества</Label>
                <p className="text-xs text-muted-foreground">
                  Система оценки поставщиков
                </p>
              </div>
              <Switch
                checked={formData.quality_scoring}
                onCheckedChange={(checked) => setFormData({...formData, quality_scoring: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автозаказы</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматическое пополнение запасов
                </p>
              </div>
              <Switch
                checked={formData.auto_reorder_enabled}
                onCheckedChange={(checked) => setFormData({...formData, auto_reorder_enabled: checked})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Условия сотрудничества</CardTitle>
            <CardDescription>Параметры работы с поставщиками</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="min_order">Минимальная сумма заказа (₽)</Label>
              <Input
                id="min_order"
                type="number"
                value={formData.min_order_threshold}
                onChange={(e) => setFormData({...formData, min_order_threshold: parseInt(e.target.value)})}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_terms">Срок оплаты (дней)</Label>
              <Input
                id="payment_terms"
                type="number"
                value={formData.preferred_payment_terms}
                onChange={(e) => setFormData({...formData, preferred_payment_terms: parseInt(e.target.value)})}
                min={0}
                max={90}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Отслеживание доставки</Label>
                <p className="text-xs text-muted-foreground">
                  Мониторинг статуса доставок
                </p>
              </div>
              <Switch
                checked={formData.delivery_tracking}
                onCheckedChange={(checked) => setFormData({...formData, delivery_tracking: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Напоминания об оплате</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматические уведомления
                </p>
              </div>
              <Switch
                checked={formData.payment_reminders}
                onCheckedChange={(checked) => setFormData({...formData, payment_reminders: checked})}
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