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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Archive, Calendar, Bell } from 'lucide-react';
import { useClientArchives } from '@/hooks/useClientArchives';

interface ArchiveClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onArchived?: () => void;
}

const ARCHIVE_REASONS = [
  { value: 'no_contact', label: 'Клиент не выходит на связь' },
  { value: 'insufficient_budget', label: 'Недостаточно бюджета' },
  { value: 'project_postponed', label: 'Клиент переносит проект' },
  { value: 'other', label: 'Другое' },
];

const ARCHIVE_PERIODS = [
  { value: 30, label: '1 месяц' },
  { value: 90, label: '3 месяца' },
  { value: 180, label: '6 месяцев' },
  { value: 365, label: '1 год' },
];

const REMINDER_TYPES = [
  { value: 'system', label: 'В системе', icon: Bell },
  { value: 'email', label: 'Email', icon: Bell },
  { value: 'telegram', label: 'Telegram', icon: Bell },
];

export function ArchiveClientDialog({
  isOpen,
  onClose,
  clientId,
  clientName,
  onArchived,
}: ArchiveClientDialogProps) {
  const [reasonType, setReasonType] = useState<string>('');
  const [reasonComment, setReasonComment] = useState('');
  const [period, setPeriod] = useState<number>(30);
  const [reminderType, setReminderType] = useState('system');
  const [isArchiving, setIsArchiving] = useState(false);

  const { archiveClient } = useClientArchives();

  const handleArchive = async () => {
    if (!reasonType) {
      return;
    }

    setIsArchiving(true);
    try {
      await archiveClient(clientId, reasonType, reasonComment, period, reminderType);
      onArchived?.();
      handleClose();
    } finally {
      setIsArchiving(false);
    }
  };

  const handleClose = () => {
    setReasonType('');
    setReasonComment('');
    setPeriod(30);
    setReminderType('system');
    onClose();
  };

  const getRestoreDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + period);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Archive className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <DialogTitle>Отправить в архив</DialogTitle>
              <DialogDescription>
                {clientName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Archive Period */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Период архивации
            </Label>
            <Select value={period.toString()} onValueChange={(v) => setPeriod(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARCHIVE_PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value.toString()}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Возврат из архива: {getRestoreDate()}
            </p>
          </div>

          {/* Archive Reason Type */}
          <div className="space-y-2">
            <Label>Причина архивации</Label>
            <Select value={reasonType} onValueChange={setReasonType}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите причину" />
              </SelectTrigger>
              <SelectContent>
                {ARCHIVE_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label>Комментарий {reasonType !== 'other' && '(опционально)'}</Label>
            <Textarea
              value={reasonComment}
              onChange={(e) => setReasonComment(e.target.value)}
              placeholder={
                reasonType === 'other'
                  ? 'Укажите причину архивации'
                  : 'Дополнительная информация'
              }
              rows={3}
            />
          </div>

          {/* Reminder Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Напоминание о возобновлении контакта
            </Label>
            <Select value={reminderType} onValueChange={setReminderType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isArchiving}>
            Отмена
          </Button>
          <Button
            onClick={handleArchive}
            disabled={!reasonType || (reasonType === 'other' && !reasonComment) || isArchiving}
          >
            {isArchiving ? 'Архивация...' : 'Отправить в архив'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
