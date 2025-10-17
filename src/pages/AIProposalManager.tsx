import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, 
  Send, 
  Brain, 
  Zap,
  Settings,
  Plus,
  Eye,
  Edit,
  Mail,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProposals } from '@/hooks/useProposals';
import { useClients } from '@/hooks/useClients';
import { useEstimates } from '@/hooks/useEstimates';
import { useProposalSettings } from '@/hooks/useProposalSettings';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getAIConfigForAssistant } from '@/utils/getAPIKeys';
import { ProposalTemplateManager } from '@/components/ProposalTemplateManager';

const AIProposalManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { proposals, loading, createProposal, updateProposal } = useProposals();
  const { clients } = useClients();
  const { estimates, loading: estimatesLoading } = useEstimates();
  const { settings, loading: settingsLoading, saveSettings } = useProposalSettings();

  const [newProposal, setNewProposal] = useState({
    clientId: '',
    estimateId: '',
    title: '',
    validDays: settings.default_validity_days
  });

  const [generating, setGenerating] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [localSettings, setLocalSettings] = useState(settings);

  // Загрузка шаблонов
  const loadTemplates = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('type', 'proposal')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
      
      // Выбираем дефолтный шаблон
      const defaultTemplate = data?.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'sent': return 'Отправлено клиенту';
      case 'approved': return 'Одобрено';
      case 'rejected': return 'Отклонено';
      default: return status;
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Неизвестный клиент';
  };

  const generateProposal = async () => {
    if (!newProposal.clientId || !newProposal.estimateId || !newProposal.title) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    
    try {
      // Получаем данные клиента
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', newProposal.clientId)
        .single();

      if (clientError) throw clientError;

      // Получаем данные сметы
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('*, estimate_items(*)')
        .eq('id', newProposal.estimateId)
        .single();

      if (estimateError) throw estimateError;

      // Получаем шаблон
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', selectedTemplate || templates.find(t => t.is_default)?.id)
        .single();

      if (templateError) throw templateError;

      // Формируем список услуг из сметы
      const services = estimate.estimate_items?.map((item: any) => 
        `${item.description || 'Услуга'} - ${item.quantity} ${item.unit_price} ₽`
      ).join('\n') || '';

      // Заполняем переменные в шаблоне
      let content = template.content;
      content = content.replace(/\{\{client_name\}\}/g, client.name || '');
      content = content.replace(/\{\{client_phone\}\}/g, client.phone || '');
      content = content.replace(/\{\{client_email\}\}/g, client.email || '');
      content = content.replace(/\{\{client_address\}\}/g, client.address || '');
      content = content.replace(/\{\{amount\}\}/g, estimate.total_amount?.toLocaleString('ru-RU') || '0');
      content = content.replace(/\{\{date\}\}/g, new Date().toLocaleDateString('ru-RU'));
      content = content.replace(/\{\{services\}\}/g, services);
      content = content.replace(/\{\{estimate_details\}\}/g, estimate.title || '');

      // Создаем КП в базе
      await createProposal({
        client_id: newProposal.clientId,
        title: newProposal.title,
        status: 'draft' as const,
        amount: estimate.total_amount || 0,
        content: content,
        expires_at: new Date(Date.now() + newProposal.validDays * 24 * 60 * 60 * 1000).toISOString()
      });
      
      setNewProposal({
        clientId: '',
        estimateId: '',
        title: '',
        validDays: settings.default_validity_days
      });
      
      toast({
        title: "КП создано",
        description: "Коммерческое предложение успешно сформировано на основе шаблона"
      });
    } catch (error) {
      console.error('Error generating proposal:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать КП",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await saveSettings(localSettings);
      
      if (error) throw error;
      
      toast({
        title: "Настройки сохранены",
        description: "Настройки КП-менеджера успешно обновлены"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive"
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // Обновляем локальные настройки при загрузке
  React.useEffect(() => {
    if (!settingsLoading) {
      setLocalSettings(settings);
      setNewProposal(prev => ({ ...prev, validDays: settings.default_validity_days }));
    }
  }, [settings, settingsLoading]);

  // Загружаем шаблоны при монтировании
  React.useEffect(() => {
    loadTemplates();
  }, [user]);

  const sendProposal = async (id: string) => {
    try {
      // Отправляем через AI Proposal Manager
      const { data, error } = await supabase.functions.invoke('ai-proposal-manager', {
        body: {
          action: 'send_proposal',
          data: {
            proposal_id: id
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        // Обновляем локальный статус
        await updateProposal(id, { 
          status: 'sent',
          sent_at: new Date().toISOString()
        });
        
        toast({
          title: "КП отправлено",
          description: `Коммерческое предложение отправлено на ${data.sent_to}`
        });
      } else {
        throw new Error(data.error || 'Ошибка отправки КП');
      }
    } catch (error) {
      console.error('Error sending proposal:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить КП",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mr-2"
          >
            ← Назад
          </Button>
          <div className="h-12 w-12 rounded-lg bg-indigo-500 flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">КП-Менеджер</h1>
            <p className="text-muted-foreground">
              Создание коммерческих предложений на основе шаблонов и смет
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <FileText className="h-3 w-3 mr-1" />
            Активен
          </Badge>
          <Badge variant="outline">
            Шаблонная система
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Создать КП</TabsTrigger>
          <TabsTrigger value="proposals">Мои КП</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Новое коммерческое предложение
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Клиент</Label>
                  <Select value={newProposal.clientId} onValueChange={(value) => setNewProposal(prev => ({ ...prev, clientId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите клиента" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Название проекта</Label>
                  <Input 
                    value={newProposal.title}
                    onChange={(e) => setNewProposal(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Введите название проекта" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Смета</Label>
                  <Select 
                    value={newProposal.estimateId} 
                    onValueChange={(value) => setNewProposal(prev => ({ ...prev, estimateId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите смету" />
                    </SelectTrigger>
                    <SelectContent>
                      {estimatesLoading ? (
                        <SelectItem value="loading" disabled>Загрузка...</SelectItem>
                      ) : newProposal.clientId ? (
                        estimates
                          .filter((e: any) => e.client_id === newProposal.clientId)
                          .map((estimate: any) => (
                            <SelectItem key={estimate.id} value={estimate.id}>
                              {estimate.title} ({estimate.total_amount?.toLocaleString('ru-RU')} ₽)
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Сначала выберите клиента
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Название КП</Label>
                  <Input 
                    value={newProposal.title}
                    onChange={(e) => setNewProposal(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Коммерческое предложение на..." 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Шаблон</Label>
                  <Select 
                    value={selectedTemplate} 
                    onValueChange={setSelectedTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите шаблон" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} {template.is_default && '(по умолчанию)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Срок действия (дней)</Label>
                    <Input 
                      type="number" 
                      value={newProposal.validDays}
                      onChange={(e) => setNewProposal(prev => ({ ...prev, validDays: parseInt(e.target.value) || 14 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Приоритет</Label>
                    <Select defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Высокий</SelectItem>
                        <SelectItem value="medium">Средний</SelectItem>
                        <SelectItem value="low">Низкий</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={generateProposal}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Создаю КП...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Создать КП на основе шаблона
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Переменные для шаблонов</CardTitle>
                <CardDescription>
                  Используйте эти переменные в ваших шаблонах
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <code className="bg-muted p-2 rounded">{`{{client_name}}`}</code>
                  <code className="bg-muted p-2 rounded">{`{{client_phone}}`}</code>
                  <code className="bg-muted p-2 rounded">{`{{client_email}}`}</code>
                  <code className="bg-muted p-2 rounded">{`{{client_address}}`}</code>
                  <code className="bg-muted p-2 rounded">{`{{amount}}`}</code>
                  <code className="bg-muted p-2 rounded">{`{{date}}`}</code>
                  <code className="bg-muted p-2 rounded">{`{{services}}`}</code>
                  <code className="bg-muted p-2 rounded">{`{{estimate_details}}`}</code>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="proposals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Коммерческие предложения
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать КП
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Проект</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Отправлено</TableHead>
                    <TableHead>Действует до</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        Загрузка...
                      </TableCell>
                    </TableRow>
                  ) : proposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        Нет коммерческих предложений
                      </TableCell>
                    </TableRow>
                  ) : (
                    proposals.map((proposal) => (
                      <TableRow key={proposal.id}>
                        <TableCell className="font-medium">
                          {proposal.client_id ? getClientName(proposal.client_id) : 'Без клиента'}
                        </TableCell>
                        <TableCell>{proposal.title}</TableCell>
                        <TableCell>{proposal.amount.toLocaleString()} ₽</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(proposal.status)}>
                            {getStatusText(proposal.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {proposal.sent_at ? new Date(proposal.sent_at).toLocaleDateString('ru-RU') : '-'}
                        </TableCell>
                        <TableCell>
                          {proposal.expires_at ? new Date(proposal.expires_at).toLocaleDateString('ru-RU') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {proposal.status === 'draft' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => sendProposal(proposal.id)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <ProposalTemplateManager />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Настройки КП-менеджера
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Шаблон письма</Label>
                  <Textarea 
                    className="mt-2"
                    placeholder="Уважаемый {{client_name}}, направляем Вам коммерческое предложение..."
                    rows={4}
                    value={localSettings.email_template}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, email_template: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Доступные переменные: {`{{client_name}}, {{title}}`}
                  </p>
                </div>
                <div>
                  <Label>Подпись</Label>
                  <Textarea 
                    className="mt-2"
                    placeholder="С уважением, команда компании..."
                    rows={3}
                    value={localSettings.signature}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, signature: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Срок действия по умолчанию (дней)</Label>
                    <Input 
                      type="number" 
                      className="mt-2"
                      value={localSettings.default_validity_days}
                      onChange={(e) => setLocalSettings(prev => ({ 
                        ...prev, 
                        default_validity_days: parseInt(e.target.value) || 14 
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Автоотправка</Label>
                    <Select 
                      value={localSettings.auto_send ? 'auto' : 'manual'}
                      onValueChange={(value) => setLocalSettings(prev => ({ 
                        ...prev, 
                        auto_send: value === 'auto' 
                      }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Автоматически</SelectItem>
                        <SelectItem value="manual">Вручную</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Сохранение...' : 'Сохранить настройки'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIProposalManager;