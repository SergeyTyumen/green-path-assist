import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText, 
  User,
  Edit,
  MessageSquare,
  TrendingUp,
  Archive
} from 'lucide-react';
import { ClickablePhone } from '@/components/ClickablePhone';
import { ClientCommentManager } from '@/components/ClientCommentManager';
import { SalesFunnel } from '@/components/SalesFunnel';
import { ProposalManager } from '@/components/ProposalManager';
import { ContractManager } from '@/components/ContractManager';
import { ArchiveClientDialog } from '@/components/ArchiveClientDialog';

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  services: string[];
  status: string;
  notes?: string;
  last_contact?: string;
  next_action?: string;
  project_area?: number;
  budget?: number;
  project_description?: string;
  created_at: string;
  updated_at: string;
}

interface ClientDetailDialogProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (client: Client) => void;
  onClientUpdate?: (client: Client) => void;
}

export function ClientDetailDialog({ client, isOpen, onClose, onEdit, onClientUpdate }: ClientDetailDialogProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  
  if (!client) return null;

  const getStatusConfig = (status: string) => {
    const configs = {
      "lead": { label: "Лид", className: "bg-blue-100 text-blue-700" },
      "qualification": { label: "Квалификация", className: "bg-cyan-100 text-cyan-700" },
      "site-visit": { label: "Замер", className: "bg-indigo-100 text-indigo-700" },
      "proposal-sent": { label: "КП отправлено", className: "bg-purple-100 text-purple-700" },
      "negotiation": { label: "Переговоры", className: "bg-orange-100 text-orange-700" },
      "contract-signing": { label: "Договор", className: "bg-amber-100 text-amber-700" },
      "in-progress": { label: "В работе", className: "bg-yellow-100 text-yellow-700" },
      "completed": { label: "Завершено", className: "bg-green-100 text-green-700" },
      "postponed": { label: "Отложено", className: "bg-gray-100 text-gray-700" },
      "closed": { label: "Закрыто", className: "bg-red-100 text-red-700" }
    };
    return configs[status as keyof typeof configs] || configs.lead;
  };

  const getServiceLabel = (service: string) => {
    const labels = {
      "landscape-design": "Ландшафтный дизайн",
      "auto-irrigation": "Автополив", 
      "lawn": "Газон",
      "planting": "Посадка растений",
      "hardscape": "Мощение",
      "maintenance": "Обслуживание"
    };
    return labels[service as keyof typeof labels] || service;
  };

  const handleClientUpdate = (updatedClient: Client) => {
    if (onClientUpdate) {
      onClientUpdate(updatedClient);
    }
  };

  const handleArchived = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[95vh] sm:h-auto sm:max-h-[90vh] w-[95vw] sm:w-auto grid grid-rows-[auto_1fr_auto] overflow-hidden p-0">
        <div className="p-6 pb-3 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {client.name}
            </DialogTitle>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(client)}>
                <Edit className="h-4 w-4 mr-1" />
                Редактировать
              </Button>
            )}
          </DialogHeader>
        </div>

        <div className="overflow-hidden px-6">
          <Tabs defaultValue="overview" className="h-full grid grid-rows-[auto_1fr]">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Обзор</span>
              <span className="sm:hidden">Инфо</span>
            </TabsTrigger>
            <TabsTrigger value="funnel" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Воронка и документы</span>
              <span className="sm:hidden">Сделка</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">История</span>
              <span className="sm:hidden">Чат</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="overflow-y-auto h-full pr-2 sm:pr-4 pb-4">
            <div className="space-y-6">
              {/* Статус и основная информация */}
              <div className="flex items-center justify-between">
                <Badge className={getStatusConfig(client.status).className}>
                  {getStatusConfig(client.status).label}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Создан: {new Date(client.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>

              {/* Контактная информация */}
              <div className="space-y-3">
                <h3 className="font-semibold">Контактная информация</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ClickablePhone 
                    phone={client.phone} 
                    variant="text" 
                    className="text-sm"
                  />
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 md:col-span-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{client.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Проект */}
              <div className="space-y-3">
                <h3 className="font-semibold">Информация о проекте</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.budget && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Бюджет: ₽{client.budget.toLocaleString()}</span>
                    </div>
                  )}
                  {client.project_area && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Площадь: {client.project_area} м²</span>
                    </div>
                  )}
                </div>

                {client.project_description && (
                  <div>
                    <Label className="text-sm font-medium">Описание проекта:</Label>
                    <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded-lg">
                      {client.project_description}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Услуги */}
              {client.services.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Интересующие услуги</h3>
                  <div className="flex flex-wrap gap-2">
                    {client.services.map((service) => (
                      <Badge key={service} variant="secondary">
                        {getServiceLabel(service)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Взаимодействие */}
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold">Быстрый обзор</h3>
                
                {client.last_contact && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Последний контакт: {new Date(client.last_contact).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                )}

                {client.next_action && (
                  <div>
                    <Label className="text-sm font-medium">Следующее действие:</Label>
                    <p className="text-sm text-primary bg-primary/10 p-3 rounded-lg mt-1">
                      {client.next_action}
                    </p>
                  </div>
                )}

                {client.notes && (
                  <div>
                    <Label className="text-sm font-medium">Заметки:</Label>
                    <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded-lg">
                      {client.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="funnel" className="overflow-y-auto h-full pr-2 sm:pr-4 pb-4 space-y-6">
            <SalesFunnel 
              clientId={client.id}
              currentStage={client.status}
              clientCreatedAt={client.created_at}
              clientName={client.name}
              clientServices={client.services}
              clientBudget={client.budget}
              clientArea={client.project_area}
              onClientUpdate={handleClientUpdate}
            />
            
            <ProposalManager clientId={client.id} clientName={client.name} />
            
            <ContractManager clientId={client.id} clientName={client.name} />
          </TabsContent>

          <TabsContent value="history" className="overflow-y-auto h-full pr-2 sm:pr-4 pb-4">
            <ClientCommentManager
            clientId={client.id} 
            clientName={client.name}
            clientData={{
              stage: client.status,
              phone: client.phone,
              email: client.email
              }}
            />
          </TabsContent>
        </Tabs>
        </div>

        <div className="p-6 pt-4 border-t shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="flex-1 min-h-[44px]">
              <FileText className="h-4 w-4 mr-2" />
              Создать смету
            </Button>
            <Button variant="outline" className="flex-1 min-h-[44px]">
              <Phone className="h-4 w-4 mr-2" />
              Позвонить
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 min-h-[44px]"
              onClick={() => setShowArchiveDialog(true)}
            >
              <Archive className="h-4 w-4 mr-2" />
              Архив
            </Button>
          </div>
        </div>
      </DialogContent>

      <ArchiveClientDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        clientId={client.id}
        clientName={client.name}
        onArchived={handleArchived}
      />
    </Dialog>
  );
}