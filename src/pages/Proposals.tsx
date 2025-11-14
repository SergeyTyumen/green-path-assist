import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Download,
  Send,
  Bot,
  Loader2,
  Trash2
} from "lucide-react";
import { useProposals } from "@/hooks/useProposals";
import { useClients } from "@/hooks/useClients";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Proposals() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingProposal, setViewingProposal] = useState<any | null>(null);
  
  const { proposals, loading, updateProposal, deleteProposal } = useProposals();
  const { clients } = useClients();

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      "draft": { label: "Черновик", className: "bg-gray-100 text-gray-700" },
      "sent": { label: "Отправлено", className: "bg-blue-100 text-blue-700" },
      "approved": { label: "Принято", className: "bg-green-100 text-green-700" },
      "rejected": { label: "Отклонено", className: "bg-red-100 text-red-700" }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return "Без клиента";
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Неизвестный клиент";
  };

  const handleViewProposal = (proposal: any) => {
    setViewingProposal(proposal);
  };

  const handleSendProposal = async (proposalId: string) => {
    try {
      await updateProposal(proposalId, { status: 'sent', sent_at: new Date().toISOString() });
      toast.success("КП отправлено клиенту");
    } catch (error) {
      toast.error("Ошибка при отправке КП");
    }
  };

  const handleDownloadProposal = (proposal: any) => {
    if (proposal.template_url) {
      window.open(proposal.template_url, '_blank');
    } else {
      toast.error("Документ КП не найден");
    }
  };

  const handleDeleteProposal = async (proposalId: string) => {
    if (window.confirm("Вы уверены, что хотите удалить это коммерческое предложение?")) {
      await deleteProposal(proposalId);
    }
  };

  const filteredProposals = proposals.filter(proposal => {
    const clientName = getClientName(proposal.client_id);
    return clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           proposal.id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка КП...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground">Коммерческие предложения</h1>
          <p className="text-muted-foreground mt-1">
            Управление КП и отправка клиентам
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Button 
            variant="outline" 
            className="gap-2 min-touch-target"
            onClick={() => navigate('/ai-proposal-manager')}
          >
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">ИИ-генерация</span>
            <span className="sm:hidden">ИИ</span>
          </Button>
          <Button 
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2 min-touch-target"
            onClick={() => navigate('/ai-proposal-manager')}
          >
            <Plus className="h-4 w-4" />
            Создать КП
          </Button>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по клиенту, проекту или номеру КП..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список КП */}
      <div className="grid gap-4">
        {filteredProposals.map((proposal) => (
          <Card 
            key={proposal.id} 
            className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.01]"
            onClick={() => handleViewProposal(proposal)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {proposal.title}
                    </h3>
                    {getStatusBadge(proposal.status)}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground overflow-wrap-anywhere">
                      {getClientName(proposal.client_id)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                      {proposal.sent_at && (
                        <span className="whitespace-nowrap">
                          Отправлено: {new Date(proposal.sent_at).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                      {proposal.expires_at && (
                        <span className="whitespace-nowrap">
                          Действительно до: {new Date(proposal.expires_at).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                      <span className="whitespace-nowrap">
                        Создано: {new Date(proposal.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="text-left sm:text-right">
                    <div className="text-2xl font-bold text-foreground">
                      ₽{proposal.amount.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Сумма предложения
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="min-touch-target"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/ai-proposal-manager');
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="min-touch-target"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadProposal(proposal);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {proposal.status === "draft" && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="min-touch-target"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendProposal(proposal.id);
                        }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="min-touch-target text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProposal(proposal.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProposals.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              КП не найдены
            </h3>
            <p className="text-muted-foreground mb-4">
              Попробуйте изменить параметры поиска или создайте новое коммерческое предложение
            </p>
            <Button onClick={() => navigate('/ai-proposal-manager')}>
              <Plus className="h-4 w-4 mr-2" />
              Создать первое КП
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Диалог просмотра КП */}
      <Dialog open={!!viewingProposal} onOpenChange={() => setViewingProposal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingProposal?.title}</DialogTitle>
          </DialogHeader>
          {viewingProposal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Клиент</p>
                  <p className="font-medium">{getClientName(viewingProposal.client_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Сумма</p>
                  <p className="font-medium">₽{viewingProposal.amount.toLocaleString('ru-RU')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Статус</p>
                  <div className="mt-1">{getStatusBadge(viewingProposal.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Создано</p>
                  <p className="font-medium">{new Date(viewingProposal.created_at).toLocaleDateString('ru-RU')}</p>
                </div>
              </div>
              
              {viewingProposal.content && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Содержание КП</p>
                  <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                    {viewingProposal.content}
                  </div>
                </div>
              )}

              {viewingProposal.template_url && (
                <div className="flex gap-2">
                  <Button onClick={() => handleDownloadProposal(viewingProposal)}>
                    <Download className="h-4 w-4 mr-2" />
                    Скачать КП
                  </Button>
                  {viewingProposal.status === 'draft' && (
                    <Button 
                      variant="default"
                      onClick={() => {
                        handleSendProposal(viewingProposal.id);
                        setViewingProposal(null);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Отправить клиенту
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}