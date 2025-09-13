import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageCircle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProfiles } from '@/hooks/useProfiles';

interface SendDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: 'proposal' | 'estimate' | 'technical_specification' | 'contract';
  documentId: string;
  documentTitle: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
}

export function SendDocumentDialog({
  open,
  onOpenChange,
  documentType,
  documentId,
  documentTitle,
  clientId,
  clientName,
  clientPhone,
  clientEmail
}: SendDocumentDialogProps) {
  const { profiles } = useProfiles();
  const { toast } = useToast();
  const [recipientType, setRecipientType] = useState<'client' | 'user'>('client');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [sendMethod, setSendMethod] = useState<'email' | 'telegram' | 'whatsapp'>('email');
  const [customContact, setCustomContact] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const getDocumentTypeName = (type: string) => {
    const types = {
      proposal: 'Коммерческое предложение',
      estimate: 'Смета',
      technical_specification: 'Техническое задание',
      contract: 'Договор'
    };
    return types[type as keyof typeof types] || type;
  };

  const getContactFromClient = () => {
    switch (sendMethod) {
      case 'email':
        return clientEmail || '';
      case 'whatsapp':
      case 'telegram':
        return clientPhone || '';
      default:
        return '';
    }
  };

  const getContactFromUser = () => {
    if (!selectedUserId) return '';
    const selectedProfile = profiles.find(p => p.user_id === selectedUserId);
    if (!selectedProfile) return '';

    switch (sendMethod) {
      case 'email':
        return selectedProfile.email || '';
      case 'telegram':
        return selectedProfile.telegram_username || '';
      case 'whatsapp':
        return selectedProfile.whatsapp_phone || '';
      default:
        return '';
    }
  };

  const handleSend = async () => {
    setSending(true);
    
    try {
      let recipientContact = '';
      let recipientId = '';

      if (recipientType === 'client') {
        if (!clientId) {
          throw new Error('ID клиента не указан');
        }
        recipientContact = customContact || getContactFromClient();
        recipientId = clientId;
      } else {
        if (!selectedUserId) {
          throw new Error('Пользователь не выбран');
        }
        recipientContact = customContact || getContactFromUser();
        recipientId = selectedUserId;
      }

      if (!recipientContact) {
        throw new Error('Контактная информация получателя не указана');
      }

      // Вызываем edge function для отправки документа
      const { data, error } = await supabase.functions.invoke('send-document', {
        body: {
          recipientType,
          recipientId,
          documentType,
          documentId,
          sendMethod,
          recipientContact,
          message,
          documentTitle
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Успешно",
        description: `${getDocumentTypeName(documentType)} отправлен`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending document:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить документ",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'telegram':
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Send className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Отправить документ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Документ</Label>
            <div className="text-sm text-muted-foreground">
              {getDocumentTypeName(documentType)}: {documentTitle}
            </div>
          </div>

          <div>
            <Label htmlFor="recipient-type">Получатель</Label>
            <Select value={recipientType} onValueChange={(value: 'client' | 'user') => setRecipientType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Клиент</SelectItem>
                <SelectItem value="user">Сотрудник</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientType === 'client' && clientName && (
            <div>
              <Label>Клиент</Label>
              <div className="text-sm text-muted-foreground">{clientName}</div>
            </div>
          )}

          {recipientType === 'user' && (
            <div>
              <Label htmlFor="user-select">Сотрудник</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name || profile.email || 'Без имени'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="send-method">Способ отправки</Label>
            <Select value={sendMethod} onValueChange={(value: 'email' | 'telegram' | 'whatsapp') => setSendMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="telegram">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Telegram
                  </div>
                </SelectItem>
                <SelectItem value="whatsapp">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="contact">Контакт</Label>
            <Input
              id="contact"
              value={customContact || (recipientType === 'client' ? getContactFromClient() : getContactFromUser())}
              onChange={(e) => setCustomContact(e.target.value)}
              placeholder={
                sendMethod === 'email' 
                  ? 'email@example.com' 
                  : sendMethod === 'telegram'
                  ? '@username'
                  : '+7XXXXXXXXXX'
              }
            />
          </div>

          <div>
            <Label htmlFor="message">Сообщение (необязательно)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Дополнительное сообщение..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending && <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
              {getMethodIcon(sendMethod)}
              Отправить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}