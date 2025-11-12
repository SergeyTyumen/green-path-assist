import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Globe, Copy, CheckCircle, Loader2, Code, Eye } from 'lucide-react';

interface WebsiteWidgetIntegrationDialogProps {
  onSettingsChange?: () => void;
  isConfigured?: boolean;
}

const WebsiteWidgetIntegrationDialog = ({ onSettingsChange, isConfigured = false }: WebsiteWidgetIntegrationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Widget settings
  const [isActive, setIsActive] = useState(false);
  const [widgetTitle, setWidgetTitle] = useState('Онлайн консультант');
  const [welcomeMessage, setWelcomeMessage] = useState('Здравствуйте! Чем могу помочь?');
  const [widgetPosition, setWidgetPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [primaryColor, setPrimaryColor] = useState('#8B5CF6');
  const [showCompanyName, setShowCompanyName] = useState(true);
  const [companyName, setCompanyName] = useState('Наша компания');

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
        .eq('integration_type', 'website')
        .single();

      if (data && !error) {
        const settings = data.settings as any;
        setWidgetTitle(settings.widget_title || 'Онлайн консультант');
        setWelcomeMessage(settings.welcome_message || 'Здравствуйте! Чем могу помочь?');
        setWidgetPosition(settings.widget_position || 'bottom-right');
        setPrimaryColor(settings.primary_color || '#8B5CF6');
        setShowCompanyName(settings.show_company_name !== false);
        setCompanyName(settings.company_name || 'Наша компания');
        setIsActive(data.is_active || false);
      }
    } catch (error) {
      console.error('Error loading website widget settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settings = {
        widget_title: widgetTitle,
        welcome_message: welcomeMessage,
        widget_position: widgetPosition,
        primary_color: primaryColor,
        show_company_name: showCompanyName,
        company_name: companyName,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          user_id: user!.id,
          integration_type: 'website',
          settings,
          is_active: isActive,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Успешно сохранено",
        description: "Настройки виджета обновлены",
      });

      onSettingsChange?.();
      setOpen(false);
    } catch (error) {
      console.error('Error saving website widget settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateWidgetCode = () => {
    const projectUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nxyzmxqtzsvjezmkmkja.supabase.co';
    
    return `<!-- AI Consultant Widget -->
<div id="ai-consultant-widget"></div>
<script>
(function() {
  const config = {
    userId: '${user?.id || 'YOUR_USER_ID'}',
    apiUrl: '${projectUrl}/functions/v1/ai-consultant',
    title: '${widgetTitle}',
    welcomeMessage: '${welcomeMessage}',
    position: '${widgetPosition}',
    primaryColor: '${primaryColor}',
    companyName: '${showCompanyName ? companyName : ''}',
  };

  // Create widget container
  const widget = document.createElement('div');
  widget.id = 'ai-chat-widget';
  widget.style.cssText = \`
    position: fixed;
    ${widgetPosition === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
    bottom: 20px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  \`;

  // Create toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.innerHTML = '💬';
  toggleBtn.style.cssText = \`
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: \${config.primaryColor};
    border: none;
    cursor: pointer;
    font-size: 28px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: transform 0.2s;
  \`;
  toggleBtn.onmouseover = () => toggleBtn.style.transform = 'scale(1.1)';
  toggleBtn.onmouseout = () => toggleBtn.style.transform = 'scale(1)';

  // Create chat window
  const chatWindow = document.createElement('div');
  chatWindow.style.cssText = \`
    display: none;
    width: 380px;
    height: 600px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    position: absolute;
    bottom: 80px;
    ${widgetPosition === 'bottom-right' ? 'right: 0;' : 'left: 0;'}
    flex-direction: column;
  \`;

  // Header
  const header = document.createElement('div');
  header.style.cssText = \`
    background: \${config.primaryColor};
    color: white;
    padding: 16px;
    border-radius: 12px 12px 0 0;
    font-weight: 600;
  \`;
  header.innerHTML = \`
    <div style="font-size: 18px;">\${config.title}</div>
    \${config.companyName ? \`<div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">\${config.companyName}</div>\` : ''}
  \`;

  // Messages container
  const messagesDiv = document.createElement('div');
  messagesDiv.style.cssText = \`
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: #f9fafb;
  \`;

  // Add welcome message
  messagesDiv.innerHTML = \`
    <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
      \${config.welcomeMessage}
    </div>
  \`;

  // Input area
  const inputArea = document.createElement('div');
  inputArea.style.cssText = \`
    padding: 16px;
    border-top: 1px solid #e5e7eb;
    background: white;
    border-radius: 0 0 12px 12px;
  \`;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Напишите ваш вопрос...';
  input.style.cssText = \`
    width: 100%;
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    outline: none;
    font-size: 14px;
  \`;

  // Send message function
  const sendMessage = async () => {
    const message = input.value.trim();
    if (!message) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.style.cssText = \`
      background: \${config.primaryColor};
      color: white;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      max-width: 80%;
      margin-left: auto;
    \`;
    userMsg.textContent = message;
    messagesDiv.appendChild(userMsg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    input.value = '';

    // Call AI consultant
    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: message,
          context: { source: 'website' }
        })
      });

      const data = await response.json();
      
      // Add AI response
      const aiMsg = document.createElement('div');
      aiMsg.style.cssText = \`
        background: white;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        max-width: 80%;
      \`;
      aiMsg.textContent = data.response || data.error || 'Извините, произошла ошибка';
      messagesDiv.appendChild(aiMsg);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  inputArea.appendChild(input);
  chatWindow.appendChild(header);
  chatWindow.appendChild(messagesDiv);
  chatWindow.appendChild(inputArea);

  // Toggle chat
  toggleBtn.onclick = () => {
    const isOpen = chatWindow.style.display === 'flex';
    chatWindow.style.display = isOpen ? 'none' : 'flex';
  };

  widget.appendChild(toggleBtn);
  widget.appendChild(chatWindow);
  document.body.appendChild(widget);
})();
</script>`;
  };

  const copyCode = () => {
    const code = generateWidgetCode();
    navigator.clipboard.writeText(code);
    toast({
      title: "Скопировано",
      description: "Код виджета скопирован в буфер обмена",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {isConfigured ? 'Настроено' : 'Настроить виджет'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-600" />
            Настройка виджета сайта
          </DialogTitle>
          <DialogDescription>
            Настройте чат-виджет и встройте его на ваш сайт
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">
                <Eye className="h-4 w-4 mr-2" />
                Настройки
              </TabsTrigger>
              <TabsTrigger value="code">
                <Code className="h-4 w-4 mr-2" />
                Код для встраивания
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="widgetTitle">Заголовок виджета</Label>
                  <Input
                    id="widgetTitle"
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    placeholder="Онлайн консультант"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="widgetPosition">Позиция на странице</Label>
                  <Select value={widgetPosition} onValueChange={(v: any) => setWidgetPosition(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Справа внизу</SelectItem>
                      <SelectItem value="bottom-left">Слева внизу</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Приветственное сообщение</Label>
                <Textarea
                  id="welcomeMessage"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Здравствуйте! Чем могу помочь?"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Основной цвет</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#8B5CF6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Название компании</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Наша компания"
                    disabled={!showCompanyName}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="showCompanyName">Показывать название компании</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Отображать в заголовке виджета
                  </p>
                </div>
                <Switch
                  id="showCompanyName"
                  checked={showCompanyName}
                  onCheckedChange={setShowCompanyName}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="isActive">Активировать виджет</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Виджет будет отвечать на вопросы посетителей
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </TabsContent>

            <TabsContent value="code" className="space-y-4">
              <Alert>
                <AlertDescription>
                  <p className="font-medium mb-2">Инструкция по установке:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2 text-sm">
                    <li>Скопируйте код ниже</li>
                    <li>Вставьте код перед закрывающим тегом &lt;/body&gt; на вашем сайте</li>
                    <li>Виджет появится на всех страницах сайта</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Код для встраивания</Label>
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    <Copy className="h-4 w-4 mr-2" />
                    Копировать
                  </Button>
                </div>
                <Textarea
                  value={generateWidgetCode()}
                  readOnly
                  rows={20}
                  className="font-mono text-xs"
                />
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Сохранить настройки
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WebsiteWidgetIntegrationDialog;
