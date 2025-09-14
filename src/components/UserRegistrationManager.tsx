import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

interface RegistrationRequest {
  id: string;
  email: string;
  full_name: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
}

export function UserRegistrationManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('user_registration_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as RegistrationRequest[]);
    } catch (error) {
      console.error('Error loading registration requests:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить заявки на регистрацию",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
    setDialogOpen(true);
  };

  const processRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!user) return;
    
    setActionLoading(true);
    
    try {
      // Вызываем Edge Function для обработки заявки
      const { data, error } = await supabase.functions.invoke('process-registration-request', {
        body: {
          requestId,
          action,
          adminNotes: adminNotes || undefined
        }
      });

      if (error) {
        console.error('Error calling process-registration-request:', error);
        throw new Error(error.message || 'Failed to process request');
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      // Показываем результат
      if (action === 'approve' && data.tempPassword) {
        toast({
          title: "Заявка одобрена",
          description: `Пользователь создан. Временный пароль: ${data.tempPassword}`,
          duration: 10000, // Показываем дольше для копирования пароля
        });
      } else {
        toast({
          title: "Успешно",
          description: `Заявка ${action === 'approve' ? 'одобрена' : 'отклонена'}`,
        });
      }

      setDialogOpen(false);
      loadRequests();
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обработать заявку",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Ожидает', icon: Clock, color: 'bg-yellow-100 text-yellow-800' };
      case 'approved':
        return { label: 'Одобрено', icon: CheckCircle, color: 'bg-green-100 text-green-800' };
      case 'rejected':
        return { label: 'Отклонено', icon: XCircle, color: 'bg-red-100 text-red-800' };
      default:
        return { label: 'Неизвестно', icon: Clock, color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Загрузка заявок...</div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserPlus className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Заявки на регистрацию</h2>
          <p className="text-muted-foreground">
            Рассмотрение запросов на доступ к системе
          </p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Ожидают рассмотрения</p>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Одобрено</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Отклонено</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ожидающие заявки */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Новые заявки
            </CardTitle>
            <CardDescription>
              Заявки, ожидающие рассмотрения
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => {
                const statusConfig = getStatusConfig(request.status);
                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{request.full_name}</p>
                        <Badge variant="outline" className={statusConfig.color}>
                          <statusConfig.icon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Подана: {new Date(request.created_at).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {request.message && (
                        <p className="text-sm text-muted-foreground">
                          <MessageSquare className="h-3 w-3 inline mr-1" />
                          {request.message}
                        </p>
                      )}
                    </div>
                    
                    <Button onClick={() => openDialog(request)}>
                      Рассмотреть
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Обработанные заявки */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>История заявок</CardTitle>
            <CardDescription>
              Ранее обработанные заявки
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processedRequests.map((request) => {
                const statusConfig = getStatusConfig(request.status);
                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{request.full_name}</p>
                        <Badge variant="outline" className={statusConfig.color}>
                          <statusConfig.icon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Обработана: {request.processed_at && new Date(request.processed_at).toLocaleDateString('ru-RU')}
                      </p>
                      {request.admin_notes && (
                        <p className="text-sm text-muted-foreground italic">
                          Комментарий: {request.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Заявок на регистрацию пока нет</p>
          </CardContent>
        </Card>
      )}

      {/* Диалог рассмотрения заявки */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Рассмотрение заявки</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Информация о заявителе</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <p><strong>Имя:</strong> {selectedRequest.full_name}</p>
                  <p><strong>Email:</strong> {selectedRequest.email}</p>
                  <p><strong>Дата подачи:</strong> {new Date(selectedRequest.created_at).toLocaleDateString('ru-RU')}</p>
                  {selectedRequest.message && (
                    <p><strong>Сообщение:</strong> {selectedRequest.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="admin-notes">Комментарий администратора</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Добавьте комментарий (необязательно)..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => processRequest(selectedRequest.id, 'approve')}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Одобрить
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => processRequest(selectedRequest.id, 'reject')}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Отклонить
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}