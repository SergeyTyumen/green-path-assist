import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAISettings } from '@/hooks/useAISettings';
import { Save, FileText } from 'lucide-react';

export const ProposalManagerSettings: React.FC = () => {
  const { settings, loading, saveSettings } = useAISettings('proposal-manager');
  
  const [formData, setFormData] = useState({
    default_validity_days: 14,
    auto_send: false,
    include_company_info: true,
    proposal_style: 'friendly',
    follow_up_days: 7,
    personalization_level: 'high'
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
        <FileText className="h-5 w-5 text-indigo-500" />
        <h3 className="text-lg font-semibold">Настройки ИИ-КП-Менеджера</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Параметры КП</CardTitle>
            <CardDescription>Основные настройки создания предложений</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Срок действия КП (дней)</Label>
              <Input
                type="number"
                value={formData.default_validity_days}
                onChange={(e) => setFormData({...formData, default_validity_days: parseInt(e.target.value)})}
                min={1}
                max={90}
              />
            </div>

            <div className="space-y-2">
              <Label>Стиль КП</Label>
              <Select 
                value={formData.proposal_style} 
                onValueChange={(value) => setFormData({...formData, proposal_style: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Формальный</SelectItem>
                  <SelectItem value="friendly">Дружелюбный</SelectItem>
                  <SelectItem value="premium">Премиум</SelectItem>
                  <SelectItem value="minimalist">Минималистичный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоматическая отправка</Label>
                <p className="text-xs text-muted-foreground">
                  Отправлять КП сразу после создания
                </p>
              </div>
              <Switch
                checked={formData.auto_send}
                onCheckedChange={(checked) => setFormData({...formData, auto_send: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Информация о компании</Label>
                <p className="text-xs text-muted-foreground">
                  Включать блок о компании в КП
                </p>
              </div>
              <Switch
                checked={formData.include_company_info}
                onCheckedChange={(checked) => setFormData({...formData, include_company_info: checked})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Напоминания и персонализация</CardTitle>
            <CardDescription>Настройки follow-up и персонализации</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Напоминание через (дней)</Label>
              <Input
                type="number"
                value={formData.follow_up_days}
                onChange={(e) => setFormData({...formData, follow_up_days: parseInt(e.target.value)})}
                min={1}
                max={30}
              />
            </div>

            <div className="space-y-2">
              <Label>Уровень персонализации</Label>
              <Select 
                value={formData.personalization_level} 
                onValueChange={(value) => setFormData({...formData, personalization_level: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                </SelectContent>
              </Select>
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