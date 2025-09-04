import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAISettings } from "@/hooks/useAISettings";
import { Save, Users } from "lucide-react";

export const ContractorManagerSettings = () => {
  const { settings, loading, saveSettings } = useAISettings('contractor');
  
  const [formData, setFormData] = useState({
    auto_contractor_matching: true,
    skill_verification: true,
    rating_system: true,
    background_checks: false,
    payment_escrow: true,
    min_rating_threshold: 4.0,
    max_project_value: 500000,
    contract_templates: true
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
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Настройки AI Менеджера подрядчиков</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Поиск и отбор</CardTitle>
            <CardDescription>Автоматизация поиска подрядчиков</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоподбор подрядчиков</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматический поиск по критериям
                </p>
              </div>
              <Switch
                checked={formData.auto_contractor_matching}
                onCheckedChange={(checked) => setFormData({...formData, auto_contractor_matching: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Проверка навыков</Label>
                <p className="text-xs text-muted-foreground">
                  Верификация профессиональных навыков
                </p>
              </div>
              <Switch
                checked={formData.skill_verification}
                onCheckedChange={(checked) => setFormData({...formData, skill_verification: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Система рейтингов</Label>
                <p className="text-xs text-muted-foreground">
                  Оценка работы подрядчиков
                </p>
              </div>
              <Switch
                checked={formData.rating_system}
                onCheckedChange={(checked) => setFormData({...formData, rating_system: checked})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_rating">Минимальный рейтинг</Label>
              <Input
                id="min_rating"
                type="number"
                value={formData.min_rating_threshold}
                onChange={(e) => setFormData({...formData, min_rating_threshold: parseFloat(e.target.value)})}
                min={1}
                max={5}
                step={0.1}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Управление проектами</CardTitle>
            <CardDescription>Настройки работы с проектами</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max_value">Максимальная стоимость проекта (₽)</Label>
              <Input
                id="max_value"
                type="number"
                value={formData.max_project_value}
                onChange={(e) => setFormData({...formData, max_project_value: parseInt(e.target.value)})}
                min={0}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Эскроу платежи</Label>
                <p className="text-xs text-muted-foreground">
                  Безопасные расчеты через депозит
                </p>
              </div>
              <Switch
                checked={formData.payment_escrow}
                onCheckedChange={(checked) => setFormData({...formData, payment_escrow: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Шаблоны договоров</Label>
                <p className="text-xs text-muted-foreground">
                  Автогенерация договоров
                </p>
              </div>
              <Switch
                checked={formData.contract_templates}
                onCheckedChange={(checked) => setFormData({...formData, contract_templates: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Проверка документов</Label>
                <p className="text-xs text-muted-foreground">
                  Верификация удостоверений
                </p>
              </div>
              <Switch
                checked={formData.background_checks}
                onCheckedChange={(checked) => setFormData({...formData, background_checks: checked})}
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