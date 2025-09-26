import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Copy, ExternalLink, MessageCircle } from 'lucide-react';

interface WhatsAppSettings {
  access_token: string;
  phone_number_id: string;
  webhook_verify_token: string;
  webhook_url: string;
  business_account_id: string;
}

interface IntegrationSettings {
  id?: string;
  integration_type: string;
  settings: WhatsAppSettings;
  is_active: boolean;
}

const WhatsAppIntegrationDialog: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<IntegrationSettings>({
    integration_type: 'whatsapp',
    settings: {
      access_token: '',
      phone_number_id: '',
      webhook_verify_token: 'whatsapp_verify_token',
      webhook_url: `https://nxyzmxqtzsvjezmkmkja.supabase.co/functions/v1/whatsapp-webhook`,
      business_account_id: ''
    },
    is_active: false
  });

  useEffect(() => {
    if (user && isOpen) {
      loadSettings();
    }
  }, [user, isOpen]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('user_id', user!.id)
        .eq('integration_type', 'whatsapp')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          id: data.id,
          integration_type: data.integration_type,
          settings: (data.settings as unknown) as WhatsAppSettings,
          is_active: data.is_active
        });
      }
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки WhatsApp",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const upsertData = {
        user_id: user.id,
        integration_type: 'whatsapp',
        settings: settings.settings as any,
        is_active: settings.is_active
      };

      let result;
      if (settings.id) {
        result = await supabase
          .from('integration_settings')
          .update(upsertData)
          .eq('id', settings.id);
      } else {
        result = await supabase
          .from('integration_settings')
          .insert([upsertData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Настройки сохранены",
        description: "Интеграция с WhatsApp настроена успешно",
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(settings.settings.webhook_url);
    toast({
      title: "Скопировано",
      description: "URL webhook скопирован в буфер обмена",
    });
  };

  const testConnection = async () => {
    if (!settings.settings.access_token || !settings.settings.phone_number_id) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Тестируем подключение через Meta API
      const response = await fetch(`https://graph.facebook.com/v18.0/${settings.settings.phone_number_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.settings.access_token}`,
        }
      });

      if (response.ok) {
        toast({
          title: "Подключение успешно",
          description: "WhatsApp Business API отвечает корректно",
        });
      } else {
        const error = await response.text();
        console.error('WhatsApp API test failed:', error);
        toast({
          title: "Ошибка подключения",
          description: "Проверьте токен доступа и ID номера телефона",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error testing WhatsApp connection:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось проверить подключение",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Настроить WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Настройка интеграции WhatsApp Business
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Статус интеграции */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Статус интеграции</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.is_active}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, is_active: checked }))
                    }
                  />
                  <span className="text-sm">Включить интеграцию</span>
                </div>
                <Badge variant={settings.is_active ? "default" : "secondary"}>
                  {settings.is_active ? "Активна" : "Неактивна"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Настройки API */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Настройки WhatsApp Business API</CardTitle>
              <CardDescription>
                Получите эти данные в{' '}
                <a 
                  href="https://developers.facebook.com/apps/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Meta for Developers
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="access_token">Токен доступа *</Label>
                <Input
                  id="access_token"
                  type="password"
                  value={settings.settings.access_token}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      settings: { ...prev.settings, access_token: e.target.value }
                    }))
                  }
                  placeholder="EAAXXXXXXXX..."
                />
              </div>

              <div>
                <Label htmlFor="phone_number_id">ID номера телефона *</Label>
                <Input
                  id="phone_number_id"
                  value={settings.settings.phone_number_id}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      settings: { ...prev.settings, phone_number_id: e.target.value }
                    }))
                  }
                  placeholder="123456789012345"
                />
              </div>

              <div>
                <Label htmlFor="business_account_id">ID бизнес-аккаунта</Label>
                <Input
                  id="business_account_id"
                  value={settings.settings.business_account_id}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      settings: { ...prev.settings, business_account_id: e.target.value }
                    }))
                  }
                  placeholder="123456789012345"
                />
              </div>
            </CardContent>
          </Card>

          {/* Настройки Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Настройки Webhook</CardTitle>
              <CardDescription>
                Скопируйте эти данные в настройки webhook в Meta for Developers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="webhook_url">URL Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhook_url"
                    value={settings.settings.webhook_url}
                    readOnly
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="verify_token">Токен верификации</Label>
                <div className="flex gap-2">
                  <Input
                    id="verify_token"
                    value={settings.settings.webhook_verify_token}
                    readOnly
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(settings.settings.webhook_verify_token);
                    toast({
                      title: "Скопировано",
                      description: "Токен верификации скопирован",
                    });
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Инструкции */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Инструкция по настройке</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Создайте приложение в Meta for Developers</li>
                <li>Добавьте продукт WhatsApp Business</li>
                <li>Получите токен доступа и ID номера телефона</li>
                <li>Настройте webhook с URL и токеном верификации выше</li>
                <li>Подпишитесь на события: messages</li>
                <li>Протестируйте подключение кнопкой ниже</li>
              </ol>
            </CardContent>
          </Card>

          {/* Кнопки действий */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={isLoading}
            >
              Тест подключения
            </Button>
            <Button
              onClick={saveSettings}
              disabled={isLoading}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppIntegrationDialog;