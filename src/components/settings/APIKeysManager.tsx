import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Save, Trash2 } from 'lucide-react';

interface APIKey {
  provider: string;
  api_key: string;
  is_active: boolean;
  showKey: boolean;
}

const providers = [
  { id: 'openai', name: 'OpenAI', description: 'Для GPT моделей и TTS' },
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'Для высококачественного синтеза речи' },
  { id: 'yandexgpt', name: 'YandexGPT', description: 'Для русскоязычных моделей' },
  { id: 'anthropic', name: 'Anthropic', description: 'Для Claude моделей' },
];

export function APIKeysManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAPIKeys();
  }, [user]);

  const loadAPIKeys = async () => {
    if (!user) return;

    try {
      // Load from Supabase
      const { data, error } = await supabase
        .from('api_keys')
        .select('provider, api_key')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading API keys from Supabase:', error);
        // Fallback to localStorage
        loadFromLocalStorage();
        return;
      }

      // Convert Supabase data to our format
      const supabaseKeys: Record<string, string> = {};
      if (data) {
        data.forEach(item => {
          supabaseKeys[item.provider] = item.api_key;
        });
      }

      // Initialize all providers
      const initialKeys: APIKey[] = providers.map(provider => ({
        provider: provider.id,
        api_key: supabaseKeys[provider.id] || '',
        is_active: !!supabaseKeys[provider.id],
        showKey: false
      }));

      setApiKeys(initialKeys);
    } catch (error) {
      console.error('Error loading API keys:', error);
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    if (!user) return;

    try {
      const storageKey = `api_keys_${user.id}`;
      const savedKeysRaw = localStorage.getItem(storageKey);
      const savedKeys = savedKeysRaw ? JSON.parse(savedKeysRaw) : [];

      const localKeys: Record<string, APIKey> = {};
      savedKeys.forEach((key: APIKey) => {
        localKeys[key.provider] = { ...key, showKey: false };
      });

      const initialKeys: APIKey[] = providers.map(provider => 
        localKeys[provider.id] || {
          provider: provider.id,
          api_key: '',
          is_active: false,
          showKey: false
        }
      );

      setApiKeys(initialKeys);
    } catch (error) {
      console.error('Error loading API keys from localStorage:', error);
      // Initialize empty keys
      const initialKeys: APIKey[] = providers.map(provider => ({
        provider: provider.id,
        api_key: '',
        is_active: false,
        showKey: false
      }));
      setApiKeys(initialKeys);
    }
  };

  const updateAPIKey = (provider: string, field: keyof APIKey, value: any) => {
    setApiKeys(prev => prev.map(key => 
      key.provider === provider ? { ...key, [field]: value } : key
    ));
  };

  const saveAPIKeys = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Save to Supabase
      const keysToSave = apiKeys.filter(key => key.api_key.trim() !== '');
      
      if (keysToSave.length > 0) {
        const { error } = await supabase
          .from('api_keys')
          .upsert(
            keysToSave.map(key => ({
              user_id: user.id,
              provider: key.provider,
              api_key: key.api_key.trim()
            })),
            { onConflict: 'user_id,provider' }
          );

        if (error) {
          throw error;
        }
      }

      // Remove empty keys from Supabase
      const emptyKeys = apiKeys.filter(key => key.api_key.trim() === '');
      if (emptyKeys.length > 0) {
        const { error } = await supabase
          .from('api_keys')
          .delete()
          .eq('user_id', user.id)
          .in('provider', emptyKeys.map(k => k.provider));

        if (error) {
          console.error('Error removing empty keys:', error);
        }
      }

      // Also save to localStorage as backup
      const storageKey = `api_keys_${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(apiKeys));

      toast({
        title: 'API ключи сохранены',
        description: 'Ключи синхронизированы на всех ваших устройствах',
      });

    } catch (error) {
      console.error('Error saving API keys:', error);
      toast({
        title: 'Ошибка сохранения',
        description: 'Не удалось сохранить API ключи. Попробуйте еще раз.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAPIKey = async (provider: string) => {
    if (!user) return;

    try {
      // Remove from Supabase
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);

      if (error) {
        throw error;
      }

      // Update local state
      updateAPIKey(provider, 'api_key', '');
      updateAPIKey(provider, 'is_active', false);

      toast({
        title: 'API ключ удален',
        description: `Ключ ${provider} удален со всех устройств`,
      });

    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: 'Ошибка удаления',
        description: 'Не удалось удалить API ключ',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Загрузка API ключей...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Ключи</CardTitle>
          <CardDescription>
            Управление API ключами для различных сервисов. Ключи синхронизируются между всеми вашими устройствами.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {providers.map(provider => {
            const keyData = apiKeys.find(k => k.provider === provider.id);
            if (!keyData) return null;

            return (
              <div key={provider.id} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{provider.name}</h3>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={keyData.is_active}
                      onCheckedChange={(checked) => updateAPIKey(provider.id, 'is_active', checked)}
                      disabled={!keyData.api_key.trim()}
                    />
                    <Label className="text-sm">Активен</Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor={`${provider.id}-key`}>API Ключ</Label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Input
                        id={`${provider.id}-key`}
                        type={keyData.showKey ? 'text' : 'password'}
                        value={keyData.api_key}
                        onChange={(e) => updateAPIKey(provider.id, 'api_key', e.target.value)}
                        placeholder={`Введите ${provider.name} API ключ`}
                        className="pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => updateAPIKey(provider.id, 'showKey', !keyData.showKey)}
                      >
                        {keyData.showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {keyData.api_key.trim() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAPIKey(provider.id)}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-4">
            <Button onClick={saveAPIKeys} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Сохранение...' : 'Сохранить ключи'}
            </Button>
          </div>

          <div className="p-4 bg-muted rounded-lg text-sm">
            <h4 className="font-medium mb-2">Важная информация:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• API ключи синхронизируются между всеми вашими устройствами</li>
              <li>• Ключи хранятся в зашифрованном виде в базе данных</li>
              <li>• Отключите неиспользуемые ключи для безопасности</li>
              <li>• Резервная копия хранится локально на каждом устройстве</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}