import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface VoiceSettings {
  voice_provider: 'web_speech' | 'elevenlabs';
  voice_id: string;
  speech_rate: number;
  speech_pitch: number;
  elevenlabs_api_key?: string;
}

interface AISettings {
  openai_model: string;
  yandex_model: string;
  temperature: number;
  max_tokens: number;
}

interface UserSettings {
  preferred_ai_model: 'openai' | 'yandex';
  interaction_mode: 'text' | 'voice';
  voice_settings: VoiceSettings;
  ai_settings: AISettings;
}

const defaultSettings: UserSettings = {
  preferred_ai_model: 'openai',
  interaction_mode: 'text',
  voice_settings: {
    voice_provider: 'web_speech',
    voice_id: 'alloy',
    speech_rate: 1.0,
    speech_pitch: 1.0
  },
  ai_settings: {
    openai_model: 'gpt-4o-mini',
    yandex_model: 'yandexgpt',
    temperature: 0.7,
    max_tokens: 1000
  }
};

export function VoiceAssistantSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_ai_model, interaction_mode, voice_settings, ai_settings')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          preferred_ai_model: (data.preferred_ai_model as 'openai' | 'yandex') || 'openai',
          interaction_mode: (data.interaction_mode as 'text' | 'voice') || 'text',
          voice_settings: (data.voice_settings as unknown as VoiceSettings) || defaultSettings.voice_settings,
          ai_settings: (data.ai_settings as unknown as AISettings) || defaultSettings.ai_settings
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_ai_model: settings.preferred_ai_model,
          interaction_mode: settings.interaction_mode,
          voice_settings: settings.voice_settings as any,
          ai_settings: settings.ai_settings as any
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Настройки сохранены",
        description: "Настройки голосового помощника успешно обновлены",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateVoiceSettings = (key: keyof VoiceSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      voice_settings: {
        ...prev.voice_settings,
        [key]: value
      }
    }));
  };

  const updateAISettings = (key: keyof AISettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      ai_settings: {
        ...prev.ai_settings,
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Модель ИИ</CardTitle>
          <CardDescription>
            Выберите предпочтительную модель искусственного интеллекта
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="ai-model">Модель ИИ</Label>
            <Select
              value={settings.preferred_ai_model}
              onValueChange={(value: 'openai' | 'yandex') => 
                setSettings(prev => ({ ...prev, preferred_ai_model: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите модель" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">ChatGPT (OpenAI)</SelectItem>
                <SelectItem value="yandex">YandexGPT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.preferred_ai_model === 'openai' && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="openai-model">Модель OpenAI</Label>
              <Select
                value={settings.ai_settings.openai_model}
                onValueChange={(value) => updateAISettings('openai_model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {settings.preferred_ai_model === 'yandex' && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="yandex-model">Модель YandexGPT</Label>
              <Select
                value={settings.ai_settings.yandex_model}
                onValueChange={(value) => updateAISettings('yandex_model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yandexgpt">YandexGPT</SelectItem>
                  <SelectItem value="yandexgpt-lite">YandexGPT Lite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="temperature">Температура: {settings.ai_settings.temperature}</Label>
            <Slider
              value={[settings.ai_settings.temperature]}
              onValueChange={([value]) => updateAISettings('temperature', value)}
              max={1}
              min={0}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="max-tokens">Максимум токенов</Label>
            <Input
              type="number"
              value={settings.ai_settings.max_tokens}
              onChange={(e) => updateAISettings('max_tokens', parseInt(e.target.value))}
              min={100}
              max={4000}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Режим взаимодействия</CardTitle>
          <CardDescription>
            Выберите способ взаимодействия с помощником
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="interaction-mode"
              checked={settings.interaction_mode === 'voice'}
              onCheckedChange={(checked) =>
                setSettings(prev => ({
                  ...prev,
                  interaction_mode: checked ? 'voice' : 'text'
                }))
              }
            />
            <Label htmlFor="interaction-mode">
              Голосовой режим {settings.interaction_mode === 'voice' ? '(включен)' : '(выключен)'}
            </Label>
          </div>
        </CardContent>
      </Card>

      {settings.interaction_mode === 'voice' && (
        <Card>
          <CardHeader>
            <CardTitle>Настройки голоса</CardTitle>
            <CardDescription>
              Настройте параметры синтеза речи
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="voice-provider">Провайдер TTS</Label>
              <Select
                value={settings.voice_settings.voice_provider}
                onValueChange={(value: 'web_speech' | 'elevenlabs') =>
                  updateVoiceSettings('voice_provider', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web_speech">Web Speech API</SelectItem>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.voice_settings.voice_provider === 'elevenlabs' && (
              <>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="elevenlabs-key">API ключ ElevenLabs</Label>
                  <Input
                    type="password"
                    value={settings.voice_settings.elevenlabs_api_key || ''}
                    onChange={(e) => updateVoiceSettings('elevenlabs_api_key', e.target.value)}
                    placeholder="Введите API ключ ElevenLabs"
                  />
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="voice-id">ID голоса</Label>
                  <Select
                    value={settings.voice_settings.voice_id}
                    onValueChange={(value) => updateVoiceSettings('voice_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9BWtsMINqrJLrRacOk9x">Aria</SelectItem>
                      <SelectItem value="CwhRBWXzGAHq8TQ4Fs17">Roger</SelectItem>
                      <SelectItem value="EXAVITQu4vr4xnSDxMaL">Sarah</SelectItem>
                      <SelectItem value="FGY2WhTYpPnrIDTdsKH5">Laura</SelectItem>
                      <SelectItem value="alloy">Alloy (OpenAI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="speech-rate">Скорость речи: {settings.voice_settings.speech_rate}</Label>
              <Slider
                value={[settings.voice_settings.speech_rate]}
                onValueChange={([value]) => updateVoiceSettings('speech_rate', value)}
                max={2}
                min={0.5}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="speech-pitch">Высота голоса: {settings.voice_settings.speech_pitch}</Label>
              <Slider
                value={[settings.voice_settings.speech_pitch]}
                onValueChange={([value]) => updateVoiceSettings('speech_pitch', value)}
                max={2}
                min={0.5}
                step={0.1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={saveSettings} disabled={loading} className="w-full">
        {loading ? "Сохранение..." : "Сохранить настройки"}
      </Button>
    </div>
  );
}