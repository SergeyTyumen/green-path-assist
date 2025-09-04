import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAISettings } from "@/hooks/useAISettings";
import { Save, RefreshCw, Settings2 } from "lucide-react";

export const BaseAISettings = () => {
  const { settings, loading, saveSettings } = useAISettings('base');
  
  // Состояние формы
  const [formData, setFormData] = useState({
    openai_model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 1000,
    enable_logging: true,
    response_language: 'ru',
    timeout_seconds: 30,
    retry_attempts: 3,
    enable_context_memory: true,
    context_memory_size: 10,
  });

  useEffect(() => {
    if (settings?.settings) {
      setFormData({
        ...formData,
        ...settings.settings
      });
    }
  }, [settings]);

  const handleSave = async () => {
    await saveSettings(formData);
  };

  const models = [
    { value: 'gpt-5-2025-08-07', label: 'GPT-5 (Флагманская модель)' },
    { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini (Быстрая)' },
    { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1 (Надежная)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Экономичная)' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Загрузка настроек...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Базовые настройки AI</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Модель и параметры */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Модель и параметры</CardTitle>
            <CardDescription>
              Основные настройки AI модели
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model">Модель AI</Label>
              <Select 
                value={formData.openai_model} 
                onValueChange={(value) => setFormData({...formData, openai_model: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Температура: {formData.temperature}</Label>
              <Slider
                value={[formData.temperature]}
                onValueChange={([value]) => setFormData({...formData, temperature: value})}
                max={2}
                min={0}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Контролирует креативность ответов (0 = строгий, 2 = творческий)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_tokens">Максимум токенов</Label>
              <Input
                id="max_tokens"
                type="number"
                value={formData.max_tokens}
                onChange={(e) => setFormData({...formData, max_tokens: parseInt(e.target.value)})}
                min={100}
                max={4000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Язык ответов</Label>
              <Select 
                value={formData.response_language} 
                onValueChange={(value) => setFormData({...formData, response_language: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="auto">Автоопределение</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Производительность и безопасность */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Производительность</CardTitle>
            <CardDescription>
              Настройки производительности и лимитов
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timeout">Таймаут (секунды)</Label>
              <Input
                id="timeout"
                type="number"
                value={formData.timeout_seconds}
                onChange={(e) => setFormData({...formData, timeout_seconds: parseInt(e.target.value)})}
                min={5}
                max={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retry">Попытки повтора</Label>
              <Input
                id="retry"
                type="number"
                value={formData.retry_attempts}
                onChange={(e) => setFormData({...formData, retry_attempts: parseInt(e.target.value)})}
                min={1}
                max={5}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Логирование</Label>
                <p className="text-xs text-muted-foreground">
                  Сохранять историю запросов
                </p>
              </div>
              <Switch
                checked={formData.enable_logging}
                onCheckedChange={(checked) => setFormData({...formData, enable_logging: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Память контекста</Label>
                <p className="text-xs text-muted-foreground">
                  Запоминать предыдущие сообщения
                </p>
              </div>
              <Switch
                checked={formData.enable_context_memory}
                onCheckedChange={(checked) => setFormData({...formData, enable_context_memory: checked})}
              />
            </div>

            {formData.enable_context_memory && (
              <div className="space-y-2">
                <Label>Размер памяти: {formData.context_memory_size} сообщений</Label>
                <Slider
                  value={[formData.context_memory_size]}
                  onValueChange={([value]) => setFormData({...formData, context_memory_size: value})}
                  max={50}
                  min={5}
                  step={5}
                  className="w-full"
                />
              </div>
            )}
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