import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Star } from 'lucide-react';
import { useCompletedProjects } from '@/hooks/useCompletedProjects';
import { supabase } from '@/integrations/supabase/client';

interface CompleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  clientServices: string[];
  clientBudget?: number;
  clientArea?: number;
  clientCreatedAt: string;
  onCompleted?: () => void;
}

export function CompleteProjectDialog({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientServices,
  clientBudget,
  clientArea,
  clientCreatedAt,
  onCompleted,
}: CompleteProjectDialogProps) {
  const [finalAmount, setFinalAmount] = useState(clientBudget?.toString() || '');
  const [actualArea, setActualArea] = useState(clientArea?.toString() || '');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [paymentStatus, setPaymentStatus] = useState('completed');
  const [notes, setNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const { completeProject } = useCompletedProjects();

  const handleComplete = async () => {
    if (!finalAmount || parseFloat(finalAmount) <= 0) {
      return;
    }

    setIsCompleting(true);
    try {
      // Создаем запись о завершенном проекте
      await completeProject(
        clientId,
        clientName,
        parseFloat(finalAmount),
        actualArea ? parseFloat(actualArea) : undefined,
        clientServices,
        feedback,
        rating,
        paymentStatus,
        notes,
        clientCreatedAt
      );
      
      // Обновляем клиента - помечаем как завершенный
      await supabase
        .from('applications')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', clientId);
      
      onCompleted?.();
      handleClose();
    } finally {
      setIsCompleting(false);
    }
  };

  const handleClose = () => {
    setFinalAmount(clientBudget?.toString() || '');
    setActualArea(clientArea?.toString() || '');
    setFeedback('');
    setRating(5);
    setPaymentStatus('completed');
    setNotes('');
    onClose();
  };

  const renderStars = () => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="transition-colors"
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <DialogTitle>Завершение проекта</DialogTitle>
              <DialogDescription>
                {clientName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Final Amount */}
          <div className="space-y-2">
            <Label className="required">Финальная сумма проекта (₽)</Label>
            <Input
              type="number"
              value={finalAmount}
              onChange={(e) => setFinalAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="1000"
            />
          </div>

          {/* Actual Area */}
          <div className="space-y-2">
            <Label>Фактическая площадь (м²)</Label>
            <Input
              type="number"
              value={actualArea}
              onChange={(e) => setActualArea(e.target.value)}
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>

          {/* Payment Status */}
          <div className="space-y-2">
            <Label>Статус оплаты</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Оплачено полностью</SelectItem>
                <SelectItem value="partial">Частичная оплата</SelectItem>
                <SelectItem value="pending">Ожидает оплаты</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client Rating */}
          <div className="space-y-2">
            <Label>Оценка клиента</Label>
            {renderStars()}
            <p className="text-sm text-muted-foreground">
              {rating}/5 - {rating === 5 ? 'Отлично' : rating === 4 ? 'Хорошо' : rating === 3 ? 'Нормально' : rating === 2 ? 'Плохо' : 'Очень плохо'}
            </p>
          </div>

          {/* Client Feedback */}
          <div className="space-y-2">
            <Label>Отзыв клиента</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Что сказал клиент о работе?"
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Заметки о завершении</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация о проекте"
              rows={3}
            />
          </div>

          {/* Project Duration Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Проект будет помещен в раздел "Реализованные проекты" с автоматическим расчетом длительности выполнения.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isCompleting}>
            Отмена
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!finalAmount || parseFloat(finalAmount) <= 0 || isCompleting}
          >
            {isCompleting ? 'Завершение...' : 'Завершить проект'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
