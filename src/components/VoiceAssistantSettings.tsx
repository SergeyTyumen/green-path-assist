import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { APIKeysManager } from "@/components/settings/APIKeysManager";
import { TTSTestButton } from "@/components/TTSTestButton";

interface VoiceSettings {
  tts_provider: 'web_speech' | 'openai' | 'elevenlabs' | 'yandex';
  voice_provider: 'web_speech' | 'server';
  voice_id: string;
  speech_rate: number;
  speech_pitch: number;
  elevenlabs_api_key?: string;
  yandex_api_key?: string;
}

interface AISettings {
  openai_model: string;
  yandex_model: string;
  anthropic_model: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
  enable_streaming: boolean;
  context_window: number;
}

interface UserSettings {
  preferred_ai_model: 'openai' | 'yandex' | 'anthropic';
  interaction_mode: 'text' | 'voice' | 'mixed';
  voice_settings: VoiceSettings;
  ai_settings: AISettings;
  advanced_features: {
    enable_function_calling: boolean;
    enable_memory: boolean;
    auto_save_conversations: boolean;
    privacy_mode: boolean;
  };
}

const defaultSettings: UserSettings = {
  preferred_ai_model: 'openai',
  interaction_mode: 'mixed',
  voice_settings: {
    tts_provider: 'openai',
    voice_provider: 'server',
    voice_id: 'alloy',
    speech_rate: 1.0,
    speech_pitch: 1.0
  },
  ai_settings: {
    openai_model: 'gpt-5-2025-08-07',
    yandex_model: 'yandexgpt',
    anthropic_model: 'claude-3-haiku-20240307',
    temperature: 0.7,
    max_tokens: 2000,
    timeout: 30,
    enable_streaming: true,
    context_window: 4000
  },
  advanced_features: {
    enable_function_calling: true,
    enable_memory: true,
    auto_save_conversations: true,
    privacy_mode: false
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
        .select('preferred_ai_model, interaction_mode, voice_settings, ai_settings, advanced_features')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          preferred_ai_model: (data.preferred_ai_model as 'openai' | 'yandex' | 'anthropic') || 'openai',
          interaction_mode: (data.interaction_mode as 'text' | 'voice' | 'mixed') || 'text',
          voice_settings: (data.voice_settings as unknown as VoiceSettings) || defaultSettings.voice_settings,
          ai_settings: (data.ai_settings as unknown as AISettings) || defaultSettings.ai_settings,
          advanced_features: (data.advanced_features as any) || defaultSettings.advanced_features
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
          ai_settings: settings.ai_settings as any,
          advanced_features: settings.advanced_features as any
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Дополнительно сохраняем в localStorage для доступа из getAPIKeys
      if (user) {
        const storageKey = `user_settings_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify({
          preferred_ai_model: settings.preferred_ai_model,
          interaction_mode: settings.interaction_mode,
          ai_settings: settings.ai_settings
        }));
      }

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

  const getVoiceOptions = (provider: string) => {
    switch (provider) {
      case 'web_speech':
        return [
          { id: 'browser-default', name: 'Голос браузера по умолчанию' },
          { id: 'browser-female', name: 'Женский голос браузера' },
          { id: 'browser-male', name: 'Мужской голос браузера' }
        ];
      case 'openai':
        return [
          { id: 'alloy', name: 'Alloy (нейтральный)' },
          { id: 'echo', name: 'Echo (мужской)' },
          { id: 'fable', name: 'Fable (британский)' },
          { id: 'onyx', name: 'Onyx (глубокий мужской)' },
          { id: 'nova', name: 'Nova (женский)' },
          { id: 'shimmer', name: 'Shimmer (женский)' }
        ];
      case 'elevenlabs':
        return [
          { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria (женский)' },
          { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger (мужской)' },
          { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (женский)' },
          { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura (женский)' },
          { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie (мужской)' },
          { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (мужской)' },
          { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum (мужской)' },
          { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River (нейтральный)' }
        ];
      case 'yandex':
        return [
          { id: 'alena', name: 'Алёна (женский)' },
          { id: 'filipp', name: 'Филипп (мужской)' },
          { id: 'ermil', name: 'Ермил (мужской)' },
          { id: 'jane', name: 'Джейн (женский)' },
          { id: 'omazh', name: 'Омаж (женский)' },
          { id: 'zahar', name: 'Захар (мужской)' }
        ];
      default:
        return [];
    }
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
    <Tabs defaultValue="ai" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="ai">ИИ Модели</TabsTrigger>
        <TabsTrigger value="interaction">Взаимодействие</TabsTrigger>
        <TabsTrigger value="voice">Голос</TabsTrigger>
        <TabsTrigger value="api">API Ключи</TabsTrigger>
      </TabsList>

      <TabsContent value="ai" className="space-y-6">
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
                <SelectItem value="openai">OpenAI GPT</SelectItem>
                <SelectItem value="yandex">YandexGPT</SelectItem>
                <SelectItem value="anthropic">Anthropic Claude</SelectItem>
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
                  <SelectItem value="gpt-5-2025-08-07">GPT-5 (Лучший)</SelectItem>
                  <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini (Быстрый)</SelectItem>
                  <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
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

          {settings.preferred_ai_model === 'anthropic' && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="anthropic-model">Модель Anthropic</Label>
              <Select
                value={settings.ai_settings.anthropic_model}
                onValueChange={(value) => updateAISettings('anthropic_model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                  <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                  <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
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

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="timeout">Таймаут (секунды)</Label>
            <Input
              type="number"
              value={settings.ai_settings.timeout}
              onChange={(e) => updateAISettings('timeout', parseInt(e.target.value))}
              min={10}
              max={120}
            />
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="context-window">Размер контекста (токены)</Label>
            <Input
              type="number"
              value={settings.ai_settings.context_window}
              onChange={(e) => updateAISettings('context_window', parseInt(e.target.value))}
              min={1000}
              max={32000}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enable-streaming"
              checked={settings.ai_settings.enable_streaming}
              onCheckedChange={(checked) => updateAISettings('enable_streaming', checked)}
            />
            <Label htmlFor="enable-streaming">Потоковая передача ответов</Label>
          </div>
        </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="interaction" className="space-y-6">
        <Card>
        <CardHeader>
          <CardTitle>Режим взаимодействия</CardTitle>
          <CardDescription>
            Выберите способ взаимодействия с помощником
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="interaction-mode">Режим взаимодействия</Label>
            <Select
              value={settings.interaction_mode}
              onValueChange={(value: 'text' | 'voice' | 'mixed') =>
                setSettings(prev => ({ ...prev, interaction_mode: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Только текст</SelectItem>
                <SelectItem value="voice">Только голос</SelectItem>
                <SelectItem value="mixed">Смешанный режим</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Расширенные функции</h4>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="function-calling"
                checked={settings.advanced_features.enable_function_calling}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    advanced_features: { ...prev.advanced_features, enable_function_calling: checked }
                  }))
                }
              />
              <Label htmlFor="function-calling">Вызов функций (создание клиентов, смет)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enable-memory"
                checked={settings.advanced_features.enable_memory}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    advanced_features: { ...prev.advanced_features, enable_memory: checked }
                  }))
                }
              />
              <Label htmlFor="enable-memory">Память разговоров</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-save"
                checked={settings.advanced_features.auto_save_conversations}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    advanced_features: { ...prev.advanced_features, auto_save_conversations: checked }
                  }))
                }
              />
              <Label htmlFor="auto-save">Автосохранение диалогов</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="privacy-mode"
                checked={settings.advanced_features.privacy_mode}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    advanced_features: { ...prev.advanced_features, privacy_mode: checked }
                  }))
                }
              />
              <Label htmlFor="privacy-mode">Режим приватности</Label>
            </div>
          </div>
        </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="voice" className="space-y-6">

        {(settings.interaction_mode === 'voice' || settings.interaction_mode === 'mixed') && (
          <Card>
          <CardHeader>
            <CardTitle>Настройки голоса</CardTitle>
            <CardDescription>
              Настройте провайдер и параметры синтеза речи
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="voice-provider">Голосовая система</Label>
            <Select
              value={settings.voice_settings.voice_provider || 'server'}
              onValueChange={(value: 'web_speech' | 'server') => 
                updateVoiceSettings('voice_provider', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web_speech">Только браузер (может не работать на мобильных)</SelectItem>
                <SelectItem value="server">Умная система (браузер + сервер)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="tts-provider">Провайдер синтеза речи</Label>
              <Select
                value={settings.voice_settings.tts_provider}
                onValueChange={(value: 'web_speech' | 'openai' | 'elevenlabs' | 'yandex') => {
                  updateVoiceSettings('tts_provider', value);
                  // Сбросить голос при смене провайдера
                  const firstVoice = getVoiceOptions(value)[0]?.id || '';
                  updateVoiceSettings('voice_id', firstVoice);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web_speech">Web Speech API (встроенный)</SelectItem>
                  <SelectItem value="openai">OpenAI TTS (высокое качество)</SelectItem>
                  <SelectItem value="elevenlabs">ElevenLabs (премиум)</SelectItem>
                  <SelectItem value="yandex">Yandex SpeechKit (русский)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="voice-id">Голос</Label>
              <Select
                value={settings.voice_settings.voice_id}
                onValueChange={(value) => updateVoiceSettings('voice_id', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getVoiceOptions(settings.voice_settings.tts_provider).map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* API ключи для платных провайдеров */}
            {settings.voice_settings.tts_provider === 'elevenlabs' && (
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="elevenlabs-key">API ключ ElevenLabs</Label>
                <Input
                  type="password"
                  value={settings.voice_settings.elevenlabs_api_key || ''}
                  onChange={(e) => updateVoiceSettings('elevenlabs_api_key', e.target.value)}
                  placeholder="Введите API ключ ElevenLabs"
                />
              </div>
            )}

            {settings.voice_settings.tts_provider === 'yandex' && (
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="yandex-key">API ключ Yandex</Label>
                <Input
                  type="password"
                  value={settings.voice_settings.yandex_api_key || ''}
                  onChange={(e) => updateVoiceSettings('yandex_api_key', e.target.value)}
                  placeholder="Введите API ключ Yandex SpeechKit"
                />
              </div>
            )}

            {/* Информация о провайдере */}
            <div className="p-3 bg-muted rounded-md text-sm">
              {settings.voice_settings.tts_provider === 'web_speech' && (
                <div>
                  <strong>Web Speech API:</strong> Использует встроенные голоса браузера. 
                  Бесплатно, но качество зависит от операционной системы.
                </div>
              )}
              {settings.voice_settings.tts_provider === 'openai' && (
                <div>
                  <strong>OpenAI TTS:</strong> Высококачественные голоса от OpenAI. 
                  Стоимость ~$15 за 1M символов. Очень естественное звучание.
                </div>
              )}
              {settings.voice_settings.tts_provider === 'elevenlabs' && (
                <div>
                  <strong>ElevenLabs:</strong> Премиум качество с эмоциональностью. 
                  Самое высокое качество, но дороже OpenAI.
                </div>
              )}
              {settings.voice_settings.tts_provider === 'yandex' && (
                <div>
                  <strong>Yandex SpeechKit:</strong> Оптимизирован для русского языка. 
                  Хорошее качество русской речи, отдельная подписка.
                </div>
              )}
            </div>

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

            {/* Кнопка тестирования голоса */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Тест голоса</Label>
                <TTSTestButton
                  provider={settings.voice_settings.tts_provider}
                  voice={settings.voice_settings.voice_id}
                  rate={settings.voice_settings.speech_rate}
                  pitch={settings.voice_settings.speech_pitch}
                  apiKey={
                    settings.voice_settings.tts_provider === 'elevenlabs' 
                      ? settings.voice_settings.elevenlabs_api_key
                      : settings.voice_settings.tts_provider === 'yandex'
                      ? settings.voice_settings.yandex_api_key
                      : undefined
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </TabsContent>

      <TabsContent value="api" className="space-y-6">
        <APIKeysManager />
      </TabsContent>

      <div className="flex justify-end pt-6">
        <Button onClick={saveSettings} disabled={loading}>
          {loading ? "Сохранение..." : "Сохранить настройки"}
        </Button>
      </div>
    </Tabs>
  );
}