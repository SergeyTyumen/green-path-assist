import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, ExternalLink, Copy, CheckCircle, Loader2 } from 'lucide-react';

interface TelegramIntegrationDialogProps {
  onSettingsChange?: () => void;
}

const TelegramIntegrationDialog = ({ onSettingsChange }: TelegramIntegrationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSet, setWebhookSet] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadSettings();
    }
  }, [open, user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('user_id', user!.id)
        .eq('integration_type', 'telegram')
        .single();

      if (data && !error) {
        const settings = data.settings as any;
        setBotToken(settings.bot_token || '');
        setIsActive(data.is_active || false);
        setWebhookUrl(settings.webhook_url || '');
        setWebhookSet(settings.webhook_set || false);
      }
    } catch (error) {
      console.error('Error loading Telegram settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!botToken.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите токен бота",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const settings = {
        bot_token: botToken,
        webhook_url: webhookUrl,
        webhook_set: webhookSet,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          user_id: user!.id,
          integration_type: 'telegram',
          settings,
          is_active: isActive,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Успешно сохранено",
        description: "Настройки Telegram интеграции обновлены",
      });

      onSettingsChange?.();
      setOpen(false);
    } catch (error) {
      console.error('Error saving Telegram settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const setupWebhook = async () => {
    if (!botToken.trim()) {
      toast({
        title: "Ошибка",
        description: "Сначала введите токен бота",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Генерируем webhook URL для Telegram бота
      const projectUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nxyzmxqtzsvjezmkmkja.supabase.co';
      const generatedWebhookUrl = `${projectUrl}/functions/v1/telegram-webhook`;
      
      setWebhookUrl(generatedWebhookUrl);
      setWebhookSet(true);

      toast({
        title: "Webhook URL создан",
        description: "Скопируйте URL и настройте его в BotFather",
      });
    } catch (error) {
      console.error('Error setting up webhook:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось настроить webhook",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: "URL скопирован в буфер обмена",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {isActive ? 'Настроено' : 'Настроить Telegram'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Настройка Telegram Bot
          </DialogTitle>
          <DialogDescription>
            Подключите Telegram бота для автоматических консультаций клиентов
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <Alert>
              <AlertDescription className="text-sm space-y-2">
                <p className="font-medium">Инструкция по настройке:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Откройте Telegram и найдите @BotFather</li>
                  <li>Создайте нового бота командой /newbot</li>
                  <li>Следуйте инструкциям и получите токен бота</li>
                  <li>Скопируйте токен и вставьте его ниже</li>
                  <li>Настройте webhook для получения сообщений</li>
                </ol>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => window.open('https://t.me/BotFather', '_blank')}
                >
                  Открыть @BotFather <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="botToken">Токен бота</Label>
                <Input
                  id="botToken"
                  type="password"
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Токен выглядит примерно так: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
                </p>
              </div>

              {botToken && (
                <>
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={webhookUrl || 'Нажмите "Создать Webhook" для генерации'}
                        readOnly
                        className="flex-1"
                      />
                      {webhookUrl && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(webhookUrl)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {!webhookSet && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={setupWebhook}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Создать Webhook
                      </Button>
                    )}
                    {webhookSet && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Webhook настроен
                      </div>
                    )}
                  </div>

                  {webhookUrl && (
                    <Alert>
                      <AlertDescription className="text-sm">
                        <p className="font-medium mb-2">Настройка webhook в Telegram:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Скопируйте Webhook URL выше</li>
                          <li>Выполните команду в браузере или через curl:</li>
                        </ol>
                        <code className="block mt-2 p-2 bg-muted rounded text-xs break-all">
                          https://api.telegram.org/bot{botToken || 'YOUR_BOT_TOKEN'}/setWebhook?url={webhookUrl}
                        </code>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="isActive">Активировать интеграцию</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Бот будет отвечать на сообщения клиентов
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={saveSettings} disabled={saving || !botToken}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Сохранить настройки
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TelegramIntegrationDialog;
