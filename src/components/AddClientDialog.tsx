import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Bot, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
}

interface AddClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Partial<Client>) => Promise<void>;
  client?: Client; // Для редактирования
}

const availableServices = [
  { id: "landscape-design", label: "Ландшафтный дизайн" },
  { id: "auto-irrigation", label: "Автополив" },
  { id: "lawn", label: "Газон" },
  { id: "planting", label: "Посадка растений" },
  { id: "hardscape", label: "Мощение" },
  { id: "maintenance", label: "Обслуживание" }
];

const statusOptions = [
  { value: "new", label: "Новый" },
  { value: "in-progress", label: "В работе" },
  { value: "proposal-sent", label: "КП отправлено" },
  { value: "call-scheduled", label: "Созвон назначен" },
  { value: "postponed", label: "Отложено" },
  { value: "closed", label: "Закрыт" }
];

export function AddClientDialog({ isOpen, onClose, onSave, client }: AddClientDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState(() => ({
    name: client?.name || '',
    phone: client?.phone || '',
    email: client?.email || '',
    address: client?.address || '',
    status: client?.status || 'new',
    services: client?.services || [],
    project_area: client?.project_area || '',
    budget: client?.budget || '',
    project_description: client?.project_description || '',
    notes: client?.notes || '',
    next_action: client?.next_action || ''
  }));

  const [loading, setLoading] = useState(false);
  const [generatingAction, setGeneratingAction] = useState(false);

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const generateNextAction = async () => {
    if (!user || !formData.name || !formData.status) {
      return;
    }

    setGeneratingAction(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-next-action', {
        body: {
          clientData: {
            ...formData,
            id: client?.id,
            project_area: formData.project_area ? parseInt(formData.project_area.toString()) : undefined,
            budget: formData.budget ? parseFloat(formData.budget.toString()) : undefined
          },
          userId: user.id
        }
      });

      if (error) throw error;

      if (data?.success && data?.nextAction) {
        setFormData(prev => ({
          ...prev,
          next_action: data.nextAction
        }));
      }
    } catch (error) {
      console.error('Error generating next action:', error);
    } finally {
      setGeneratingAction(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      return;
    }

    setLoading(true);
    try {
      const clientData = {
        ...formData,
        project_area: formData.project_area ? parseInt(formData.project_area.toString()) : undefined,
        budget: formData.budget ? parseFloat(formData.budget.toString()) : undefined
      };
      await onSave(clientData);
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      status: 'new',
      services: [],
      project_area: '',
      budget: '',
      project_description: '',
      notes: '',
      next_action: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {client ? 'Редактировать клиента' : 'Добавить нового клиента'}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Основная информация */}
          <div className="space-y-4">
            <h3 className="font-semibold">Основная информация</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Имя клиента *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите имя клиента"
                />
              </div>

              <div>
                <Label htmlFor="status">Статус</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label htmlFor="address">Адрес</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Адрес объекта"
              />
            </div>
          </div>

          {/* Проект */}
          <div className="space-y-4">
            <h3 className="font-semibold">Информация о проекте</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area">Площадь (м²)</Label>
                <Input
                  id="area"
                  type="number"
                  value={formData.project_area}
                  onChange={(e) => setFormData({ ...formData, project_area: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="budget">Бюджет (₽)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Описание проекта</Label>
              <Textarea
                id="description"
                value={formData.project_description}
                onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
                placeholder="Краткое описание потребностей клиента"
                rows={3}
              />
            </div>

            {/* Услуги */}
            <div>
              <Label>Интересующие услуги</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {availableServices.map((service) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={service.id}
                      checked={formData.services.includes(service.id)}
                      onCheckedChange={() => handleServiceToggle(service.id)}
                    />
                    <Label
                      htmlFor={service.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {service.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="space-y-4">
            <h3 className="font-semibold">Дополнительная информация</h3>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="next_action">Следующее действие</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateNextAction}
                  disabled={generatingAction || !formData.name || !formData.status}
                  className="gap-2"
                >
                  {generatingAction ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                  {generatingAction ? 'Генерация...' : 'ИИ-генерация'}
                </Button>
              </div>
              <Input
                id="next_action"
                value={formData.next_action}
                onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                placeholder="Например: Позвонить 15.01.2024"
              />
            </div>

            <div>
              <Label htmlFor="notes">Заметки</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Дополнительные заметки о клиенте"
                rows={3}
              />
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !formData.name || !formData.phone}>
              {loading ? (
                <>Сохранение...</>
              ) : (
                <>
                  {client ? 'Обновить' : 'Добавить'} клиента
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}