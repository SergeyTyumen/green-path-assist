import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAISettings } from "@/hooks/useAISettings";
import { Save, FileText } from "lucide-react";

export const ProposalManagerSettings = () => {
  const { settings, loading, saveSettings } = useAISettings('proposal');
  
  const [formData, setFormData] = useState({
    auto_proposal_generation: true,
    include_pricing: true,
    include_timeline: true,
    include_portfolio: true,
    proposal_template: 'professional',
    default_validity_days: 30,
    follow_up_enabled: true,
    custom_branding: true,
    digital_signature: false,
    company_description: ''
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
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Настройки AI Менеджера предложений</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Содержание предложений</CardTitle>
            <CardDescription>Что включать в коммерческие предложения</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автогенерация КП</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматическое создание предложений
                </p>
              </div>
              <Switch
                checked={formData.auto_proposal_generation}
                onCheckedChange={(checked) => setFormData({...formData, auto_proposal_generation: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Включать ценообразование</Label>
                <p className="text-xs text-muted-foreground">
                  Детализированная стоимость услуг
                </p>
              </div>
              <Switch
                checked={formData.include_pricing}
                onCheckedChange={(checked) => setFormData({...formData, include_pricing: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Включать временные рамки</Label>
                <p className="text-xs text-muted-foreground">
                  Планы и сроки выполнения
                </p>
              </div>
              <Switch
                checked={formData.include_timeline}
                onCheckedChange={(checked) => setFormData({...formData, include_timeline: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Включать портфолио</Label>
                <p className="text-xs text-muted-foreground">
                  Примеры выполненных работ
                </p>
              </div>
              <Switch
                checked={formData.include_portfolio}
                onCheckedChange={(checked) => setFormData({...formData, include_portfolio: checked})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Оформление и процесс</CardTitle>
            <CardDescription>Настройки дизайна и workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Шаблон предложения</Label>
              <Select 
                value={formData.proposal_template} 
                onValueChange={(value) => setFormData({...formData, proposal_template: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Профессиональный</SelectItem>
                  <SelectItem value="modern">Современный</SelectItem>
                  <SelectItem value="classic">Классический</SelectItem>
                  <SelectItem value="creative">Креативный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validity">Срок действия (дней)</Label>
              <Input
                id="validity"
                type="number"
                value={formData.default_validity_days}
                onChange={(e) => setFormData({...formData, default_validity_days: parseInt(e.target.value)})}
                min={1}
                max={365}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Фирменный стиль</Label>
                <p className="text-xs text-muted-foreground">
                  Использовать корпоративные цвета/логотип
                </p>
              </div>
              <Switch
                checked={formData.custom_branding}
                onCheckedChange={(checked) => setFormData({...formData, custom_branding: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоследование</Label>
                <p className="text-xs text-muted-foreground">
                  Напоминания о статусе предложений
                </p>
              </div>
              <Switch
                checked={formData.follow_up_enabled}
                onCheckedChange={(checked) => setFormData({...formData, follow_up_enabled: checked})}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Описание компании</CardTitle>
            <CardDescription>Стандартное описание для включения в предложения</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="company_desc">О компании</Label>
              <Textarea
                id="company_desc"
                value={formData.company_description}
                onChange={(e) => setFormData({...formData, company_description: e.target.value})}
                placeholder="Введите описание вашей компании для включения в коммерческие предложения..."
                rows={4}
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