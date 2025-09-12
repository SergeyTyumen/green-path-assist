import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Download, Eye, FileText, Trash2, Plus, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTechnicalSpecifications } from '@/hooks/useTechnicalSpecifications';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const TechnicalSpecifications = () => {
  const { specifications, loading, deleteSpecification } = useTechnicalSpecifications();
  const navigate = useNavigate();
  const [selectedSpec, setSelectedSpec] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'approved': return 'Утверждено';
      case 'archived': return 'Архив';
      default: return status;
    }
  };

  const handleDownloadPDF = async (spec: any) => {
    toast.info('Скачивание PDF будет реализовано в следующей версии');
  };

  const handleDownloadDocx = async (spec: any) => {
    toast.info('Скачивание DOCX будет реализовано в следующей версии');
  };

  const handleView = (spec: any) => {
    setSelectedSpec(spec);
    setIsViewDialogOpen(true);
  };

  if (loading) {
    return <div className="p-8">Загрузка...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Технические задания</h1>
          <p className="text-muted-foreground">Управление техническими заданиями</p>
        </div>
        <Button onClick={() => navigate('/ai-technical-specialist')}>
          <Plus className="w-4 h-4 mr-2" />
          Создать ТЗ
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список технических заданий</CardTitle>
          <CardDescription>
            Все созданные технические задания с возможностью просмотра и скачивания
          </CardDescription>
        </CardHeader>
        <CardContent>
          {specifications.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Технических заданий пока нет</p>
              <Button 
                className="mt-4" 
                onClick={() => navigate('/ai-technical-specialist')}
              >
                Создать первое ТЗ
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specifications.map((spec) => (
                  <TableRow key={spec.id}>
                    <TableCell className="font-medium">{spec.title}</TableCell>
                    <TableCell>{spec.client_name || 'Не указан'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(spec.status)}>
                        {getStatusText(spec.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(spec.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(spec)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(spec)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadDocx(spec)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          DOCX
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить техническое задание?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие нельзя отменить. Техническое задание будет удалено навсегда.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSpecification(spec.id)}>
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedSpec?.title || 'Техническое задание'}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsViewDialogOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedSpec && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground">Клиент</h3>
                    <p>{selectedSpec.client_name || 'Не указан'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground">Статус</h3>
                    <Badge className={getStatusColor(selectedSpec.status)}>
                      {getStatusText(selectedSpec.status)}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground">Дата создания</h3>
                    <p>{format(new Date(selectedSpec.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground">Адрес объекта</h3>
                    <p>{selectedSpec.object_address || 'Не указан'}</p>
                  </div>
                </div>
                
                {selectedSpec.description && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Описание объекта</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.description}</p>
                    </div>
                  </div>
                )}

                {selectedSpec.requirements && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Требования</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.requirements}</p>
                    </div>
                  </div>
                )}

                {selectedSpec.technical_details && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Технические детали</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.technical_details}</p>
                    </div>
                  </div>
                )}

                {selectedSpec.deliverables && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Результаты работ</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.deliverables}</p>
                    </div>
                  </div>
                )}

                {selectedSpec.timeline && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Временные рамки</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.timeline}</p>
                    </div>
                  </div>
                )}

                {selectedSpec.notes && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Дополнительные заметки</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TechnicalSpecifications;