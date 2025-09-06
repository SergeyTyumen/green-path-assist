import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAISettings } from '@/hooks/useAISettings';
import { Save, MessageSquare } from 'lucide-react';

export const ConsultantSettings: React.FC = () => {
  const { settings, loading, saveSettings } = useAISettings('consultant');
  
  const [formData, setFormData] = useState({
    auto_mode: false,
    response_delay: 2,
    knowledge_priority: 'database',
    max_response_length: 500,
    personalization_level: 'medium',
    include_recommendations: true
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
        <MessageSquare className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-semibold">Настройки ИИ-Консультанта</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Режим работы</CardTitle>
            <CardDescription>Основные параметры консультирования</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоматические ответы</Label>
                <p className="text-xs text-muted-foreground">
                  Отправлять ответы без модерации
                </p>
              </div>
              <Switch
                checked={formData.auto_mode}
                onCheckedChange={(checked) => setFormData({...formData, auto_mode: checked})}
              />
            </div>

            <div className="space-y-2">
              <Label>Задержка ответа: {formData.response_delay} сек</Label>
              <Slider
                value={[formData.response_delay]}
                onValueChange={([value]) => setFormData({...formData, response_delay: value})}
                max={10}
                min={0}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Приоритет источников</Label>
              <Select 
                value={formData.knowledge_priority} 
                onValueChange={(value) => setFormData({...formData, knowledge_priority: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="database">База данных услуг</SelectItem>
                  <SelectItem value="knowledge_base">База знаний</SelectItem>
                  <SelectItem value="ai_generation">ИИ генерация</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Персонализация</CardTitle>
            <CardDescription>Настройки персонализации ответов</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Максимальная длина ответа</Label>
              <Input
                type="number"
                value={formData.max_response_length}
                onChange={(e) => setFormData({...formData, max_response_length: parseInt(e.target.value)})}
                min={100}
                max={2000}
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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Включать рекомендации</Label>
                <p className="text-xs text-muted-foreground">
                  Предлагать дополнительные услуги
                </p>
              </div>
              <Switch
                checked={formData.include_recommendations}
                onCheckedChange={(checked) => setFormData({...formData, include_recommendations: checked})}
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