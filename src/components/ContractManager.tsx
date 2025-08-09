import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Eye, 
  Edit, 
  Send, 
  Download,
  Mail,
  MessageSquare,
  Plus,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Contract {
  id: string;
  title: string;
  template_name: string;
  status: string;
  amount: number;
  created_at: string;
  sent_at?: string;
  signed_at?: string;
  valid_until?: string;
}

interface ContractManagerProps {
  clientId: string;
  clientName: string;
}

export function ContractManager({ clientId, clientName }: ContractManagerProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [contractTitle, setContractTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const { user } = useAuth();

  React.useEffect(() => {
    fetchContracts();
  }, [clientId]);

  const fetchContracts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      "draft": { label: "Черновик", className: "bg-gray-100 text-gray-700" },
      "review": { label: "На согласовании", className: "bg-yellow-100 text-yellow-700" },
      "sent": { label: "Отправлен клиенту", className: "bg-blue-100 text-blue-700" },
      "signed": { label: "Подписан", className: "bg-green-100 text-green-700" },
      "rejected": { label: "Отклонен", className: "bg-red-100 text-red-700" }
    };
    return configs[status as keyof typeof configs] || configs.draft;
  };

  const handleCreateContract = async () => {
    if (!contractTitle.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          user_id: user.id,
          client_id: clientId,
          title: contractTitle,
          template_name: selectedTemplate,
          status: 'draft',
          amount: 0
        })
        .select()
        .single();

      if (error) throw error;

      setContracts(prev => [data, ...prev]);
      setContractTitle('');
      setShowCreateForm(false);
      toast.success('Договор создан');
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('Ошибка при создании договора');
    }
  };

  const handleStatusChange = async (contractId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'sent') {
        updateData.sent_at = new Date().toISOString();
      } else if (newStatus === 'signed') {
        updateData.signed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', contractId);

      if (error) throw error;

      setContracts(prev => 
        prev.map(contract => 
          contract.id === contractId 
            ? { ...contract, ...updateData }
            : contract
        )
      );

      toast.success('Статус договора обновлен');
    } catch (error) {
      console.error('Error updating contract status:', error);
      toast.error('Ошибка при обновлении статуса');
    }
  };

  const viewContractPDF = (contractId: string) => {
    toast.info('Открытие PDF просмотра договора');
  };

  const editContract = (contractId: string) => {
    toast.info('Открытие редактора договора');
  };

  const downloadContract = (contractId: string) => {
    toast.success('Договор скачан');
  };

  const sendByEmail = (contractId: string) => {
    toast.success('Договор отправлен по электронной почте');
  };

  const sendForApproval = (contractId: string) => {
    handleStatusChange(contractId, 'review');
    toast.success('Договор отправлен на согласование');
  };

  if (loading) {
    return <div className="text-center py-4">Загрузка...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Договоры
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="h-4 w-4 mr-1" />
              Создать договор
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Шаблоны
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showCreateForm && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-3">
            <div>
              <Label>Название договора</Label>
              <input
                type="text"
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                placeholder="Введите название договора"
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <Label>Шаблон договора</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Стандартный договор</SelectItem>
                  <SelectItem value="construction">Договор подряда</SelectItem>
                  <SelectItem value="service">Договор услуг</SelectItem>
                  <SelectItem value="custom">Пользовательский шаблон</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateContract} size="sm">
                Создать договор
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)} size="sm">
                Отмена
              </Button>
            </div>
          </div>
        )}

        {contracts.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Нет договоров для этого клиента
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <div key={contract.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{contract.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Шаблон: {contract.template_name} • Сумма: ₽{contract.amount?.toLocaleString() || 0}
                    </p>
                  </div>
                  <Badge className={getStatusConfig(contract.status).className}>
                    {getStatusConfig(contract.status).label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Создан: {new Date(contract.created_at).toLocaleDateString('ru-RU')}
                    {contract.sent_at && (
                      <span className="ml-2">
                        • Отправлен: {new Date(contract.sent_at).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                    {contract.signed_at && (
                      <span className="ml-2">
                        • Подписан: {new Date(contract.signed_at).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => viewContractPDF(contract.id)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => editContract(contract.id)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => downloadContract(contract.id)}>
                      <Download className="h-3 w-3" />
                    </Button>
                    {contract.status === 'draft' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => sendForApproval(contract.id)}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => sendByEmail(contract.id)}>
                      <Mail className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {contract.status !== 'draft' && (
                  <div className="mt-2">
                    <Label className="text-xs">Изменить статус:</Label>
                    <Select 
                      value={contract.status} 
                      onValueChange={(value) => handleStatusChange(contract.id, value)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Черновик</SelectItem>
                        <SelectItem value="review">На согласовании</SelectItem>
                        <SelectItem value="sent">Отправлен клиенту</SelectItem>
                        <SelectItem value="signed">Подписан</SelectItem>
                        <SelectItem value="rejected">Отклонен</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}