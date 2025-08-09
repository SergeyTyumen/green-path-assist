import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ProposalManager } from './ProposalManager';
import { ContractManager } from './ContractManager';

interface Client {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  budget?: number;
  project_area?: number;
  services?: string[];
  notes?: string;
}

interface ClientStatusManagerProps {
  client: Client;
  onClientUpdate: (updatedClient: Client) => void;
}

export function ClientStatusManager({ client, onClientUpdate }: ClientStatusManagerProps) {
  const [newStatus, setNewStatus] = useState(client.status);
  const [updating, setUpdating] = useState(false);
  const [showClosureReason, setShowClosureReason] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const { user } = useAuth();

  const statusOptions = [
    { value: "new", label: "Новый", color: "bg-blue-100 text-blue-700" },
    { value: "in-progress", label: "В работе", color: "bg-yellow-100 text-yellow-700" },
    { value: "proposal-sent", label: "КП отправлено", color: "bg-purple-100 text-purple-700" },
    { value: "call-scheduled", label: "Созвон назначен", color: "bg-orange-100 text-orange-700" },
    { value: "contract-signing", label: "Подписание договора", color: "bg-indigo-100 text-indigo-700" },
    { value: "completed", label: "Выполнен", color: "bg-green-100 text-green-700" },
    { value: "postponed", label: "Отложено", color: "bg-gray-100 text-gray-700" },
    { value: "closed", label: "Закрыт", color: "bg-red-100 text-red-700" }
  ];

  const closureReasons = [
    "Не прошли по цене",
    "Выбрали другого подрядчика",
    "Отложили проект",
    "Не устроили сроки",
    "Не устроило качество предложения",
    "Изменились обстоятельства",
    "Другое"
  ];

  const getCurrentStatusConfig = () => {
    return statusOptions.find(s => s.value === client.status) || statusOptions[0];
  };

  const getNewStatusConfig = () => {
    return statusOptions.find(s => s.value === newStatus) || statusOptions[0];
  };

  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    if (status === 'closed') {
      setShowClosureReason(true);
    } else {
      setShowClosureReason(false);
      setClosureReason('');
      setCustomReason('');
    }
  };

  const updateClientStatus = async () => {
    if (newStatus === client.status || !user) return;

    // Проверяем обязательность причины для статуса "закрыт"
    if (newStatus === 'closed' && !closureReason && !customReason) {
      toast.error('Укажите причину закрытия сделки');
      return;
    }

    setUpdating(true);
    try {
      // Обновляем статус клиента
      const { data: updatedClient, error: updateError } = await supabase
        .from('clients')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Если статус "закрыт", сохраняем в таблицу закрытых сделок
      if (newStatus === 'closed') {
        const finalReason = customReason || closureReason;
        
        const { error: closedDealError } = await supabase
          .from('closed_deals')
          .insert({
            user_id: user.id,
            client_id: client.id,
            client_name: client.name,
            closure_reason: finalReason,
            deal_amount: client.budget,
            project_area: client.project_area,
            services: client.services || [],
            notes: client.notes
          });

        if (closedDealError) throw closedDealError;
      }

      // Добавляем запись в историю комментариев
      const oldStatusLabel = getCurrentStatusConfig().label;
      const newStatusLabel = getNewStatusConfig().label;
      
      let commentContent = `Статус изменен с "${oldStatusLabel}" на "${newStatusLabel}"`;
      if (newStatus === 'closed') {
        const finalReason = customReason || closureReason;
        commentContent += `. Причина закрытия: ${finalReason}`;
      }
      
      const { error: commentError } = await supabase
        .from('client_comments')
        .insert({
          client_id: client.id,
          user_id: user.id,
          content: commentContent,
          comment_type: 'status_change',
          author_name: user.email || 'Пользователь'
        });

      if (commentError) throw commentError;

      onClientUpdate(updatedClient);
      toast.success('Статус клиента обновлен');
      
      // Сбрасываем состояние формы
      setShowClosureReason(false);
      setClosureReason('');
      setCustomReason('');
    } catch (error) {
      console.error('Error updating client status:', error);
      toast.error('Ошибка при обновлении статуса');
      setNewStatus(client.status); // Возвращаем обратно
    } finally {
      setUpdating(false);
    }
  };

  const hasStatusChanged = newStatus !== client.status;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Управление статусом</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Текущий статус:</span>
              <Badge className={getCurrentStatusConfig().color + " ml-2"}>
                {getCurrentStatusConfig().label}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Изменить статус:</label>
              <Select value={newStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]}`} />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showClosureReason && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium">Причина закрытия сделки:</Label>
                <Select value={closureReason} onValueChange={setClosureReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите причину" />
                  </SelectTrigger>
                  <SelectContent>
                    {closureReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {(closureReason === 'Другое' || closureReason === '') && (
                  <div>
                    <Label className="text-sm">Укажите свою причину:</Label>
                    <Textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Опишите причину закрытия сделки..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            {hasStatusChanged && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  <Badge className={getCurrentStatusConfig().color}>
                    {getCurrentStatusConfig().label}
                  </Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge className={getNewStatusConfig().color}>
                    {getNewStatusConfig().label}
                  </Badge>
                </div>
                
                <Button 
                  onClick={updateClientStatus}
                  disabled={updating}
                  className="w-full"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updating ? 'Обновление...' : 'Применить изменение статуса'}
                </Button>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Последнее обновление: {new Date(client.updated_at).toLocaleDateString('ru-RU')} в {new Date(client.updated_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </CardContent>
      </Card>

      <ProposalManager clientId={client.id} clientName={client.name} />
      
      <ContractManager clientId={client.id} clientName={client.name} />
    </div>
  );
}