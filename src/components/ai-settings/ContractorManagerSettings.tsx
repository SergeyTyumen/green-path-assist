import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAISettings } from '@/hooks/useAISettings';
import { Save, Settings } from 'lucide-react';

export const ContractorManagerSettings: React.FC = () => {
  const { settings, loading, saveSettings } = useAISettings('contractor-manager');
  
  const [formData, setFormData] = useState({
    search_radius: 30,
    min_experience: 2,
    min_rating: 4.0,
    portfolio_required: true,
    insurance_required: true,
    progress_check_frequency: 'every_2_days',
    auto_assign: false
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
        <Settings className="h-5 w-5 text-cyan-500" />
        <h3 className="text-lg font-semibold">Настройки ИИ-Подрядчик-Менеджера</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Критерии отбора</CardTitle>
            <CardDescription>Требования к подрядчикам</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Радиус поиска (км)</Label>
              <Input
                type="number"
                value={formData.search_radius}
                onChange={(e) => setFormData({...formData, search_radius: parseInt(e.target.value)})}
                min={5}
                max={200}
              />
            </div>

            <div className="space-y-2">
              <Label>Минимальный опыт (лет)</Label>
              <Input
                type="number"
                value={formData.min_experience}
                onChange={(e) => setFormData({...formData, min_experience: parseInt(e.target.value)})}
                min={1}
                max={20}
              />
            </div>

            <div className="space-y-2">
              <Label>Минимальный рейтинг</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.min_rating}
                onChange={(e) => setFormData({...formData, min_rating: parseFloat(e.target.value)})}
                min={3.0}
                max={5.0}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Обязательное портфолио</Label>
                <p className="text-xs text-muted-foreground">
                  Требовать наличие портфолио работ
                </p>
              </div>
              <Switch
                checked={formData.portfolio_required}
                onCheckedChange={(checked) => setFormData({...formData, portfolio_required: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Обязательная страховка</Label>
                <p className="text-xs text-muted-foreground">
                  Требовать страхование ответственности
                </p>
              </div>
              <Switch
                checked={formData.insurance_required}
                onCheckedChange={(checked) => setFormData({...formData, insurance_required: checked})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Управление проектами</CardTitle>
            <CardDescription>Настройки контроля выполнения</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Частота контроля прогресса</Label>
              <Select 
                value={formData.progress_check_frequency} 
                onValueChange={(value) => setFormData({...formData, progress_check_frequency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Ежедневно</SelectItem>
                  <SelectItem value="every_2_days">Каждые 2 дня</SelectItem>
                  <SelectItem value="weekly">Еженедельно</SelectItem>
                  <SelectItem value="biweekly">Раз в 2 недели</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоматическое назначение</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматически назначать лучшего подрядчика
                </p>
              </div>
              <Switch
                checked={formData.auto_assign}
                onCheckedChange={(checked) => setFormData({...formData, auto_assign: checked})}
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