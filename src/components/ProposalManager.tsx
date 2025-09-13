import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SendDocumentDialog } from '@/components/SendDocumentDialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import { useProposals } from '@/hooks/useProposals';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ProposalManagerProps {
  clientId: string;
  clientName: string;
}

export function ProposalManager({ clientId, clientName }: ProposalManagerProps) {
  const { proposals, loading, createProposal, updateProposal } = useProposals();
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalContent, setProposalContent] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Фильтруем предложения для текущего клиента
  const clientProposals = proposals.filter(p => p.client_id === clientId);

  const getStatusConfig = (status: string) => {
    const configs = {
      "draft": { label: "Черновик", className: "bg-gray-100 text-gray-700" },
      "sent": { label: "Отправлено клиенту", className: "bg-blue-100 text-blue-700" },
      "approved": { label: "Одобрено", className: "bg-green-100 text-green-700" },
      "rejected": { label: "Отклонено", className: "bg-red-100 text-red-700" }
    };
    return configs[status as keyof typeof configs] || configs.draft;
  };

  const handleCreateProposal = async () => {
    if (!proposalTitle.trim() || !user) return;

    try {
      await createProposal({
        title: proposalTitle,
        client_id: clientId,
        status: 'draft' as const,
        amount: 0
      });
      
      setProposalTitle('');
      setProposalContent('');
      setShowCreateForm(false);
      toast.success('КП создано');
    } catch (error) {
      toast.error('Ошибка при создании КП');
    }
  };

  const handleStatusChange = async (proposalId: string, newStatus: 'draft' | 'sent' | 'approved' | 'rejected') => {
    try {
      await updateProposal(proposalId, { 
        status: newStatus,
        sent_at: newStatus === 'sent' ? new Date().toISOString() : undefined
      });
      toast.success('Статус КП обновлен');
    } catch (error) {
      toast.error('Ошибка при обновлении статуса');
    }
  };

  const openProposalEditor = () => {
    // Открываем страницу ИИ-КП-менеджер
    window.open('/ai-assistants/ai-proposal-manager', '_blank');
  };

  const openSendDialog = (proposal: any) => {
    setSelectedProposal(proposal);
    setSendDialogOpen(true);
  };

  const sendByEmail = (proposal: any) => {
    openSendDialog(proposal);
  };

  const sendByMessenger = (proposal: any) => {
    openSendDialog(proposal);
  };

  const viewProposalPDF = (proposalId: string) => {
    toast.info('Открытие PDF просмотра КП');
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
            Коммерческие предложения
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="h-4 w-4 mr-1" />
              Создать КП
            </Button>
            <Button variant="outline" size="sm" onClick={openProposalEditor}>
              <Settings className="h-4 w-4 mr-1" />
              Настройки КП
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showCreateForm && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-3">
            <div>
              <Label>Название КП</Label>
              <input
                type="text"
                value={proposalTitle}
                onChange={(e) => setProposalTitle(e.target.value)}
                placeholder="Введите название коммерческого предложения"
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <Label>Шаблон</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Стандартный шаблон</SelectItem>
                  <SelectItem value="premium">Премиум шаблон</SelectItem>
                  <SelectItem value="custom">Пользовательский шаблон</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateProposal} size="sm">
                Создать КП
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)} size="sm">
                Отмена
              </Button>
            </div>
          </div>
        )}

        {clientProposals.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Нет коммерческих предложений для этого клиента
          </div>
        ) : (
          <div className="space-y-3">
            {clientProposals.map((proposal) => (
              <div key={proposal.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{proposal.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Сумма: ₽{proposal.amount?.toLocaleString() || 0}
                    </p>
                  </div>
                  <Badge className={getStatusConfig(proposal.status).className}>
                    {getStatusConfig(proposal.status).label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Создано: {new Date(proposal.created_at).toLocaleDateString('ru-RU')}
                    {proposal.sent_at && (
                      <span className="ml-2">
                        • Отправлено: {new Date(proposal.sent_at).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => viewProposalPDF(proposal.id)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={openProposalEditor}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    {proposal.status === 'draft' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleStatusChange(proposal.id, 'sent')}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => sendByEmail(proposal)}>
                      <Mail className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => sendByMessenger(proposal)}>
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {proposal.status !== 'draft' && (
                  <div className="mt-2">
                    <Label className="text-xs">Изменить статус:</Label>
                    <Select 
                      value={proposal.status} 
                      onValueChange={(value) => handleStatusChange(proposal.id, value as 'draft' | 'sent' | 'approved' | 'rejected')}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Черновик</SelectItem>
                        <SelectItem value="sent">Отправлено клиенту</SelectItem>
                        <SelectItem value="approved">Одобрено</SelectItem>
                        <SelectItem value="rejected">Отклонено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {selectedProposal && (
        <SendDocumentDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          documentType="proposal"
          documentId={selectedProposal.id}
          documentTitle={selectedProposal.title}
          clientId={clientId}
          clientName={clientName}
        />
      )}
    </Card>
  );
}