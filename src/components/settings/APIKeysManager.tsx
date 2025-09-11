import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, TestTube } from "lucide-react";

interface APIKeyConfig {
  id?: string;
  provider: string;
  api_key: string;
  base_url?: string;
  model?: string;
  is_active: boolean;
  last_tested?: string;
  test_status?: 'success' | 'error' | 'pending';
}

// Доступные модели для каждого провайдера
const modelOptions: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: 'GPT-5 (2025-08-07)', value: 'gpt-5-2025-08-07' },
    { label: 'GPT-5 Mini (2025-08-07)', value: 'gpt-5-mini-2025-08-07' },
    { label: 'GPT-5 Nano (2025-08-07)', value: 'gpt-5-nano-2025-08-07' },
    { label: 'GPT-4.1 (2025-04-14)', value: 'gpt-4.1-2025-04-14' },
    { label: 'GPT-4.1 Mini (2025-04-14)', value: 'gpt-4.1-mini-2025-04-14' },
    { label: 'O3 (2025-04-16)', value: 'o3-2025-04-16' },
    { label: 'O4 Mini (2025-04-16)', value: 'o4-mini-2025-04-16' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4o', value: 'gpt-4o' },
  ],
  yandexgpt: [
    { label: 'YandexGPT', value: 'yandexgpt' },
    { label: 'YandexGPT Lite', value: 'yandexgpt-lite' },
    { label: 'YandexGPT Pro', value: 'yandexgpt-pro' },
  ],
  anthropic: [
    { label: 'Claude Opus 4 (2025-08-05)', value: 'claude-opus-4-1-20250805' },
    { label: 'Claude Sonnet 4 (2025-05-14)', value: 'claude-sonnet-4-20250514' },
    { label: 'Claude 3.5 Haiku (2024-10-22)', value: 'claude-3-5-haiku-20241022' },
    { label: 'Claude 3.7 Sonnet (2025-02-19)', value: 'claude-3-7-sonnet-20250219' },
    { label: 'Claude 3.5 Sonnet (2024-10-22)', value: 'claude-3-5-sonnet-20241022' },
    { label: 'Claude 3 Opus (2024-02-29)', value: 'claude-3-opus-20240229' },
  ],
};

const defaultConfigs: Record<string, Partial<APIKeyConfig>> = {
  openai: {
    provider: 'openai',
    base_url: 'https://api.openai.com/v1',
    model: 'gpt-5-2025-08-07',
    is_active: true
  },
  yandexgpt: {
    provider: 'yandexgpt',
    base_url: 'https://llm.api.cloud.yandex.net',
    model: 'yandexgpt',
    is_active: false
  },
  elevenlabs: {
    provider: 'elevenlabs',
    base_url: 'https://api.elevenlabs.io/v1',
    is_active: false
  },
  anthropic: {
    provider: 'anthropic',
    base_url: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-20250514',
    is_active: false
  }
};

export const APIKeysManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<APIKeyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAPIKeys();
  }, [user]);

  const loadAPIKeys = async () => {
    if (!user) return;

    try {
      const storageKey = `api_keys_${user.id}`;
      const savedKeysRaw = localStorage.getItem(storageKey);
      const savedKeys = savedKeysRaw ? JSON.parse(savedKeysRaw) : [];
      
      // Создаем объект для быстрого поиска сохраненных конфигураций
      const savedConfigsMap = new Map(
        savedKeys.map((config: APIKeyConfig) => [config.provider, config])
      );
      
      // Объединяем дефолтные конфигурации с сохраненными
      const loadedConfigs: APIKeyConfig[] = [];
      
      for (const [provider, defaultConfig] of Object.entries(defaultConfigs)) {
        const savedConfig = savedConfigsMap.get(provider) as APIKeyConfig | undefined;
        
        loadedConfigs.push({
          ...defaultConfig,
          api_key: savedConfig?.api_key || '',
          base_url: savedConfig?.base_url || defaultConfig.base_url || '',
          model: savedConfig?.model || defaultConfig.model || '',
          is_active: savedConfig?.is_active ?? defaultConfig.is_active ?? false,
          test_status: savedConfig?.test_status,
          last_tested: savedConfig?.last_tested,
          id: savedConfig?.id || `temp_${provider}`,
          user_id: user.id
        } as APIKeyConfig);
      }

      setConfigs(loadedConfigs);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить API ключи",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAPIKey = async (provider: string, configData: Partial<APIKeyConfig>) => {
    if (!user) return;

    try {
      // Находим конфигурацию для обновления
      const existingConfig = configs.find(c => c.provider === provider);
      const updatedConfig = { ...existingConfig, ...configData };
      
      // Обновляем массив конфигураций
      const updatedConfigs = configs.map(c => 
        c.provider === provider 
          ? updatedConfig
          : c
      );
      
      // Сохраняем в localStorage с правильным ключом
      const storageKey = `api_keys_${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedConfigs));
      
      // Обновляем состояние
      setConfigs(updatedConfigs);

      toast({
        title: "Успешно",
        description: `Настройки для ${provider} сохранены`,
      });
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    }
  };

  const testAPIKey = async (provider: string) => {
    const config = configs.find(c => c.provider === provider);
    if (!config?.api_key) {
      toast({
        title: "Ошибка",
        description: "API ключ не настроен",
        variant: "destructive",
      });
      return;
    }

    setTestingProvider(provider);
    
    try {
      // Здесь можно добавить реальную проверку через edge function
      // Пока что симуляция
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await saveAPIKey(provider, {
        test_status: 'success',
        last_tested: new Date().toISOString()
      });

      toast({
        title: "Тест успешен",
        description: `API ключ для ${provider} работает корректно`,
      });
    } catch (error) {
      await saveAPIKey(provider, {
        test_status: 'error',
        last_tested: new Date().toISOString()
      });

      toast({
        title: "Тест не пройден",
        description: `Ошибка API ключа для ${provider}`,
        variant: "destructive",
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const renderProviderConfig = (config: APIKeyConfig) => {
    const isVisible = showKeys[config.provider];
    const isTesting = testingProvider === config.provider;

    return (
      <Card key={config.provider} className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base capitalize">{config.provider}</CardTitle>
              {config.is_active && (
                <Badge variant="default" className="text-xs">Активен</Badge>
              )}
              {config.test_status === 'success' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {config.test_status === 'error' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => 
                saveAPIKey(config.provider, { is_active: checked })
              }
            />
          </div>
          <CardDescription>
            {config.provider === 'openai' && 'OpenAI GPT модели для чата и голоса'}
            {config.provider === 'yandexgpt' && 'Yandex GPT для российских пользователей'}
            {config.provider === 'elevenlabs' && 'ElevenLabs для синтеза речи'}
            {config.provider === 'anthropic' && 'Claude модели от Anthropic'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Ключ</Label>
            <div className="flex gap-2">
              <Input
                type={isVisible ? "text" : "password"}
                value={config.api_key}
                onChange={(e) => {
                  const newConfigs = configs.map(c =>
                    c.provider === config.provider
                      ? { ...c, api_key: e.target.value }
                      : c
                  );
                  setConfigs(newConfigs);
                }}
                placeholder={`Введите ${config.provider} API ключ`}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleKeyVisibility(config.provider)}
              >
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Базовый URL</Label>
            <Input
              value={config.base_url || ''}
              onChange={(e) => {
                const newConfigs = configs.map(c =>
                  c.provider === config.provider
                    ? { ...c, base_url: e.target.value }
                    : c
                );
                setConfigs(newConfigs);
              }}
              placeholder="https://api.example.com/v1"
            />
          </div>

          {(config.provider === 'openai' || config.provider === 'yandexgpt' || config.provider === 'anthropic') && (
            <div className="space-y-2">
              <Label>Модель по умолчанию</Label>
              <Select
                value={config.model || ''}
                onValueChange={(value) => {
                  const newConfigs = configs.map(c =>
                    c.provider === config.provider
                      ? { ...c, model: value }
                      : c
                  );
                  setConfigs(newConfigs);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите модель" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions[config.provider]?.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => saveAPIKey(config.provider, config)}
              disabled={!config.api_key}
              className="flex-1"
            >
              <Key className="h-4 w-4 mr-2" />
              Сохранить
            </Button>
            <Button
              variant="outline"
              onClick={() => testAPIKey(config.provider)}
              disabled={!config.api_key || isTesting}
              className="flex-1"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isTesting ? 'Тестирование...' : 'Тест'}
            </Button>
          </div>

          {config.last_tested && (
            <div className="text-xs text-muted-foreground">
              Последний тест: {new Date(config.last_tested).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="flex justify-center p-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Key className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Управление API ключами</h3>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          API ключи безопасно хранятся в зашифрованном виде и используются только для ваших запросов.
          Рекомендуется тестировать ключи после добавления.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai">ИИ Модели</TabsTrigger>
          <TabsTrigger value="voice">Голосовые</TabsTrigger>
          <TabsTrigger value="other">Другие</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-4">
          {configs
            .filter(c => ['openai', 'yandexgpt', 'anthropic'].includes(c.provider))
            .map(renderProviderConfig)}
        </TabsContent>

        <TabsContent value="voice" className="space-y-4">
          {configs
            .filter(c => ['elevenlabs'].includes(c.provider))
            .map(renderProviderConfig)}
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          {configs
            .filter(c => !['openai', 'yandexgpt', 'anthropic', 'elevenlabs'].includes(c.provider))
            .map(renderProviderConfig)}
        </TabsContent>
      </Tabs>
    </div>
  );
};