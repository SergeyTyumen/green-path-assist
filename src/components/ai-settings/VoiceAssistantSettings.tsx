import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAISettings } from "@/hooks/useAISettings";
import { Save, Mic, Volume2 } from "lucide-react";

export const VoiceAssistantSettings = () => {
  const { settings, loading, saveSettings } = useAISettings('voice');
  
  const [formData, setFormData] = useState({
    voice_provider: 'openai',
    voice_id: 'alloy',
    speech_rate: 1.0,
    enable_voice_commands: true,
    auto_speech_detection: true,
    noise_reduction: true,
    echo_cancellation: true,
    wake_word_enabled: false,
    wake_word: 'привет ассистент'
  });

  useEffect(() => {
    if (settings?.settings) {
      setFormData({ ...formData, ...settings.settings });
    }
  }, [settings]);

  const handleSave = async () => {
    await saveSettings(formData);
  };

  const voices = [
    { value: 'alloy', label: 'Alloy (Нейтральный)' },
    { value: 'echo', label: 'Echo (Мужской)' },
    { value: 'fable', label: 'Fable (Британский)' },
    { value: 'onyx', label: 'Onyx (Глубокий)' },
    { value: 'nova', label: 'Nova (Женский)' },
    { value: 'shimmer', label: 'Shimmer (Мягкий)' }
  ];

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mic className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Настройки голосового ассистента</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Голос и речь
            </CardTitle>
            <CardDescription>Настройки синтеза речи</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Провайдер голоса</Label>
              <Select 
                value={formData.voice_provider} 
                onValueChange={(value) => setFormData({...formData, voice_provider: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                  <SelectItem value="web_speech">Встроенный браузера</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Голос</Label>
              <Select 
                value={formData.voice_id} 
                onValueChange={(value) => setFormData({...formData, voice_id: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Голосовые команды</Label>
                <p className="text-xs text-muted-foreground">
                  Включить распознавание голосовых команд
                </p>
              </div>
              <Switch
                checked={formData.enable_voice_commands}
                onCheckedChange={(checked) => setFormData({...formData, enable_voice_commands: checked})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Распознавание речи</CardTitle>
            <CardDescription>Настройки обработки звука</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автоопределение речи</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматически начинать прослушивание
                </p>
              </div>
              <Switch
                checked={formData.auto_speech_detection}
                onCheckedChange={(checked) => setFormData({...formData, auto_speech_detection: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Шумоподавление</Label>
                <p className="text-xs text-muted-foreground">
                  Фильтрация фонового шума
                </p>
              </div>
              <Switch
                checked={formData.noise_reduction}
                onCheckedChange={(checked) => setFormData({...formData, noise_reduction: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Подавление эха</Label>
                <p className="text-xs text-muted-foreground">
                  Устранение акустического эха
                </p>
              </div>
              <Switch
                checked={formData.echo_cancellation}
                onCheckedChange={(checked) => setFormData({...formData, echo_cancellation: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Слово-активатор</Label>
                <p className="text-xs text-muted-foreground">
                  Активация по ключевому слову
                </p>
              </div>
              <Switch
                checked={formData.wake_word_enabled}
                onCheckedChange={(checked) => setFormData({...formData, wake_word_enabled: checked})}
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