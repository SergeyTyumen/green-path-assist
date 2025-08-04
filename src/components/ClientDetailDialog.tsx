import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText, 
  User,
  Edit,
  X
} from 'lucide-react';

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
}

export function ClientDetailDialog({ client, isOpen, onClose, onEdit }: ClientDetailDialogProps) {
  if (!client) return null;

  const getStatusConfig = (status: string) => {
    const configs = {
      "new": { label: "Новый", className: "bg-blue-100 text-blue-700" },
      "in-progress": { label: "В работе", className: "bg-yellow-100 text-yellow-700" },
      "proposal-sent": { label: "КП отправлено", className: "bg-purple-100 text-purple-700" },
      "call-scheduled": { label: "Созвон", className: "bg-orange-100 text-orange-700" },
      "postponed": { label: "Отложено", className: "bg-gray-100 text-gray-700" },
      "closed": { label: "Закрыт", className: "bg-green-100 text-green-700" }
    };
    return configs[status as keyof typeof configs] || configs.new;
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {client.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(client)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Редактировать
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
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
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
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
              <h3 className="font-semibold">История взаимодействия</h3>
              
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
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button className="flex-1">
            <FileText className="h-4 w-4 mr-2" />
            Создать смету
          </Button>
          <Button variant="outline" className="flex-1">
            <Phone className="h-4 w-4 mr-2" />
            Позвонить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}