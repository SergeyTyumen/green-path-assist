import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAISettings } from '@/hooks/useAISettings';
import { Save, Settings } from 'lucide-react';

export const SupplierManagerSettings: React.FC = () => {
  const { settings, loading, saveSettings } = useAISettings('supplier-manager');
  
  const [formData, setFormData] = useState({
    search_radius: 50,
    min_suppliers: 3,
    price_weight: 40,
    quality_weight: 35,
    delivery_weight: 25,
    auto_request: true
  });

  useEffect(() => {
    if (settings?.settings) {
      setFormData({ ...formData, ...settings.settings });
    }
  }, [settings]);

  const handleSave = async () => {
    await saveSettings(formData);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-6">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-teal-500" />
        <h3 className="text-lg font-semibold">Настройки ИИ-Поставщик-Менеджера</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Параметры поиска</CardTitle>
            <CardDescription>Настройки поиска поставщиков</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Радиус поиска (км)</Label>
              <Input
                type="number"
                value={formData.search_radius}
                onChange={(e) => setFormData({...formData, search_radius: parseInt(e.target.value)})}
                min={10}
                max={500}
              />
            </div>

            <div className="space-y-2">
              <Label>Минимум поставщиков</Label>
              <Input
                type="number"
                value={formData.min_suppliers}
                onChange={(e) => setFormData({...formData, min_suppliers: parseInt(e.target.value)})}
                min={1}
                max={10}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоматические запросы</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматически отправлять запросы найденным поставщикам
                </p>
              </div>
              <Switch
                checked={formData.auto_request}
                onCheckedChange={(checked) => setFormData({...formData, auto_request: checked})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Веса критериев оценки</CardTitle>
            <CardDescription>Важность факторов при выборе поставщика</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Вес цены: {formData.price_weight}%</Label>
              <Slider
                value={[formData.price_weight]}
                onValueChange={([value]) => setFormData({...formData, price_weight: value})}
                max={80}
                min={10}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Вес качества: {formData.quality_weight}%</Label>
              <Slider
                value={[formData.quality_weight]}
                onValueChange={([value]) => setFormData({...formData, quality_weight: value})}
                max={80}
                min={10}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Вес сроков: {formData.delivery_weight}%</Label>
              <Slider
                value={[formData.delivery_weight]}
                onValueChange={([value]) => setFormData({...formData, delivery_weight: value})}
                max={50}
                min={10}
                step={5}
                className="w-full"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Общий вес: {formData.price_weight + formData.quality_weight + formData.delivery_weight}%
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