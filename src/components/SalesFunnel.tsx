import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Sparkles, 
  Search, 
  MapPin, 
  FileText, 
  MessageCircle, 
  PenLine, 
  Hammer, 
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SalesFunnelProps {
  clientId: string;
  currentStage: string;
  clientCreatedAt: string;
  clientName: string;
  onClientUpdate?: (updatedClient: any) => void;
}

export interface FunnelStage {
  id: string;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  probability: number;
  description: string;
}

export const FUNNEL_STAGES: FunnelStage[] = [
  {
    id: 'lead',
    label: 'Лид',
    icon: Sparkles,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    probability: 10,
    description: 'Первый контакт с клиентом'
  },
  {
    id: 'qualification',
    label: 'Квалификация',
    icon: Search,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    probability: 20,
    description: 'Уточнение потребностей'
  },
  {
    id: 'site-visit',
    label: 'Замер',
    icon: MapPin,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    probability: 35,
    description: 'Выезд на объект'
  },
  {
    id: 'proposal-sent',
    label: 'КП',
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    probability: 50,
    description: 'Коммерческое предложение'
  },
  {
    id: 'negotiation',
    label: 'Переговоры',
    icon: MessageCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    probability: 65,
    description: 'Обсуждение условий'
  },
  {
    id: 'contract-signing',
    label: 'Договор',
    icon: PenLine,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    probability: 80,
    description: 'Подписание договора'
  },
  {
    id: 'in-progress',
    label: 'В работе',
    icon: Hammer,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    probability: 90,
    description: 'Выполнение проекта'
  },
  {
    id: 'completed',
    label: 'Завершено',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    probability: 100,
    description: 'Проект сдан'
  }
];

const INACTIVE_STAGES: FunnelStage[] = [
  {
    id: 'postponed',
    label: 'Отложено',
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    probability: 0,
    description: 'Клиент отложил проект'
  },
  {
    id: 'closed',
    label: 'Закрыто',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    probability: 0,
    description: 'Сделка не состоялась'
  }
];

export function SalesFunnel({ clientId, currentStage, clientCreatedAt, clientName, onClientUpdate }: SalesFunnelProps) {
  const [stageHistory, setStageHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [closureReason, setClosureReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();

  const closureReasons = [
    "Не прошли по цене",
    "Выбрали другого подрядчика",
    "Отложили проект",
    "Не устроили сроки",
    "Не устроило качество предложения",
    "Изменились обстоятельства",
    "Другое"
  ];

  useEffect(() => {
    loadStageHistory();
  }, [clientId]);

  const loadStageHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('client_stages')
        .select('*')
        .eq('client_id', clientId)
        .order('stage_order', { ascending: true });

      if (error) throw error;
      setStageHistory(data || []);
    } catch (error) {
      console.error('Error loading stage history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStageInfo = () => {
    return [...FUNNEL_STAGES, ...INACTIVE_STAGES].find(s => s.id === currentStage) || FUNNEL_STAGES[0];
  };

  const currentStageInfo = getCurrentStageInfo();
  const currentStageIndex = FUNNEL_STAGES.findIndex(s => s.id === currentStage);
  const progress = currentStageInfo.probability;

  const getDaysOnStage = () => {
    const created = new Date(clientCreatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleStageClick = (stageId: string) => {
    if (stageId === currentStage) return; // Если уже на этом этапе
    setSelectedStage(stageId);
    setShowConfirmDialog(true);
  };

  const updateClientStatus = async () => {
    if (!selectedStage || !user) return;

    // Проверяем обязательность причины для статуса "закрыт"
    if (selectedStage === 'closed' && !closureReason && !customReason) {
      toast.error('Укажите причину закрытия сделки');
      return;
    }

    setUpdating(true);
    try {
      // Обновляем статус клиента
      const { data: updatedClient, error: updateError } = await supabase
        .from('clients')
        .update({ 
          status: selectedStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Если статус "закрыт", сохраняем в таблицу закрытых сделок
      if (selectedStage === 'closed') {
        const finalReason = customReason || closureReason;
        
        await supabase
          .from('closed_deals')
          .insert({
            user_id: user.id,
            client_id: clientId,
            client_name: clientName,
            closure_reason: finalReason,
            notes: `Сделка закрыта: ${finalReason}`
          });
      }

      // Добавляем запись в историю комментариев
      const oldStageLabel = getCurrentStageInfo().label;
      const newStageInfo = [...FUNNEL_STAGES, ...INACTIVE_STAGES].find(s => s.id === selectedStage);
      const newStageLabel = newStageInfo?.label || selectedStage;
      
      let commentContent = `Статус изменен с "${oldStageLabel}" на "${newStageLabel}"`;
      if (selectedStage === 'closed') {
        const finalReason = customReason || closureReason;
        commentContent += `. Причина закрытия: ${finalReason}`;
      }
      
      await supabase
        .from('client_comments')
        .insert({
          client_id: clientId,
          user_id: user.id,
          content: commentContent,
          comment_type: 'status_change',
          author_name: user.email || 'Пользователь'
        });

      if (onClientUpdate && updatedClient) {
        onClientUpdate(updatedClient);
      }
      
      toast.success('Статус клиента обновлен');
      setShowConfirmDialog(false);
      setClosureReason('');
      setCustomReason('');
      setSelectedStage(null);
    } catch (error) {
      console.error('Error updating client status:', error);
      toast.error('Ошибка при обновлении статуса');
    } finally {
      setUpdating(false);
    }
  };

  const getSelectedStageInfo = () => {
    if (!selectedStage) return null;
    return [...FUNNEL_STAGES, ...INACTIVE_STAGES].find(s => s.id === selectedStage);
  };

  const isStageCompleted = (stageId: string) => {
    const stageIndex = FUNNEL_STAGES.findIndex(s => s.id === stageId);
    return stageIndex < currentStageIndex || currentStage === 'completed';
  };

  const isCurrentStage = (stageId: string) => {
    return stageId === currentStage;
  };

  return (
    <div className="space-y-6">
      {/* Текущий этап и вероятность */}
      <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Прогресс сделки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-xl", currentStageInfo.bgColor)}>
                <currentStageInfo.icon className={cn("h-6 w-6", currentStageInfo.color)} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Текущий этап</p>
                <p className="text-lg font-semibold">{currentStageInfo.label}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Вероятность</p>
              <p className="text-2xl font-bold text-primary">{progress}%</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Прогресс</span>
              <span>{getDaysOnStage()} дней на этапе</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <p className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-lg">
            {currentStageInfo.description}
          </p>
        </CardContent>
      </Card>

      {/* Визуальная воронка */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Этапы воронки продаж</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {FUNNEL_STAGES.map((stage, index) => {
            const completed = isStageCompleted(stage.id);
            const current = isCurrentStage(stage.id);
            
            return (
              <div
                key={stage.id}
                onClick={() => handleStageClick(stage.id)}
                className={cn(
                  "relative group cursor-pointer transition-all duration-200",
                  current && "scale-[1.02]"
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    completed && !current && "bg-accent/30 border-accent",
                    current && cn(stage.bgColor, stage.borderColor, "shadow-md"),
                    !completed && !current && "bg-muted/30 border-muted opacity-60 hover:opacity-100"
                  )}
                >
                  {/* Иконка и номер */}
                  <div className="relative">
                    <div
                      className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-xl transition-all",
                        completed && !current && "bg-accent border-2 border-accent-foreground/20",
                        current && stage.bgColor,
                        !completed && !current && "bg-muted"
                      )}
                    >
                      {completed && !current ? (
                        <CheckCircle className="h-6 w-6 text-primary" />
                      ) : (
                        <stage.icon
                          className={cn(
                            "h-6 w-6",
                            current && stage.color,
                            !completed && !current && "text-muted-foreground"
                          )}
                        />
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {index + 1}
                    </Badge>
                  </div>

                  {/* Информация */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={cn(
                        "font-semibold",
                        current && "text-foreground",
                        completed && !current && "text-foreground",
                        !completed && !current && "text-muted-foreground"
                      )}>
                        {stage.label}
                      </h4>
                      <Badge
                        variant={current ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          current && "bg-primary"
                        )}
                      >
                        {stage.probability}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stage.description}
                    </p>
                  </div>

                  {/* Индикатор текущего */}
                  {current && (
                    <div className="absolute inset-0 rounded-xl border-2 border-primary/50 animate-pulse pointer-events-none" />
                  )}
                </div>

                {/* Коннектор */}
                {index < FUNNEL_STAGES.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 h-4 ml-[28px] transition-all",
                      completed ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}

          {/* Неактивные статусы */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-3 font-medium">Другие статусы</p>
            <div className="grid grid-cols-2 gap-3">
              {INACTIVE_STAGES.map((stage) => {
                const current = isCurrentStage(stage.id);
                
                return (
                  <div
                    key={stage.id}
                    onClick={() => handleStageClick(stage.id)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                      current && cn(stage.bgColor, stage.borderColor, "border-2 shadow-sm"),
                      !current && "bg-muted/30 border-muted hover:bg-muted/50"
                    )}
                  >
                    <stage.icon
                      className={cn(
                        "h-4 w-4",
                        current ? stage.color : "text-muted-foreground"
                      )}
                    />
                    <span className={cn(
                      "text-sm font-medium",
                      current ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Диалог подтверждения смены статуса */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить этап сделки?</DialogTitle>
            <DialogDescription>
              Вы собираетесь изменить этап с "{getCurrentStageInfo().label}" на "{getSelectedStageInfo()?.label}"
            </DialogDescription>
          </DialogHeader>

          {selectedStage === 'closed' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Причина закрытия сделки *</Label>
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setSelectedStage(null);
                setClosureReason('');
                setCustomReason('');
              }}
              disabled={updating}
            >
              Отмена
            </Button>
            <Button onClick={updateClientStatus} disabled={updating}>
              {updating ? 'Обновление...' : 'Изменить этап'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
