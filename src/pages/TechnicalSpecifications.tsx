import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Download, Eye, FileText, Trash2, Plus, Edit3, Sparkles, Mic, MicOff } from 'lucide-react';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTechnicalSpecifications } from '@/hooks/useTechnicalSpecifications';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

const TechnicalSpecifications = () => {
  const { specifications, loading, deleteSpecification, updateSpecification } = useTechnicalSpecifications();
  const navigate = useNavigate();
  const [selectedSpec, setSelectedSpec] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [showSmartEdit, setShowSmartEdit] = useState(false);
  const [editInstructions, setEditInstructions] = useState('');
  const [fieldsToEdit, setFieldsToEdit] = useState<string[]>([]);
  const [isSmartEditing, setIsSmartEditing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

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

  const formatMaterialsSpec = (materialsSpec: any): string => {
    if (!materialsSpec) return '';
    
    try {
      // Если это строка, пытаемся распарсить JSON
      const materials = typeof materialsSpec === 'string' 
        ? JSON.parse(materialsSpec) 
        : materialsSpec;
      
      // Если это массив или объект с материалами
      if (Array.isArray(materials)) {
        return materials.map((material: any, index: number) => {
          let result = `${index + 1}. ${material.name || 'Материал'}\n`;
          if (material.norm) result += `   ГОСТ/норма: ${material.norm}\n`;
          if (material.type) result += `   Тип: ${material.type}\n`;
          if (material.unit) result += `   Единица: ${material.unit}\n`;
          if (material.quantity) result += `   Количество: ${material.quantity}\n`;
          if (material.characteristics) {
            if (typeof material.characteristics === 'object') {
              result += `   Характеристики:\n`;
              Object.entries(material.characteristics).forEach(([key, value]) => {
                result += `      ${key}: ${value}\n`;
              });
            } else {
              result += `   Характеристики: ${material.characteristics}\n`;
            }
          }
          if (material.modulus) result += `   Модуль: ${material.modulus}\n`;
          if (material.density) result += `   Плотность: ${material.density}\n`;
          if (material.size) result += `   Размер: ${material.size}\n`;
          if (material.material) result += `   Материал: ${material.material}\n`;
          return result;
        }).join('\n');
      } else if (typeof materials === 'object') {
        // Если это объект с ключами как названиями материалов
        return Object.entries(materials).map(([key, value]: [string, any], index: number) => {
          let result = `${index + 1}. ${key}\n`;
          if (typeof value === 'object') {
            Object.entries(value).forEach(([subKey, subValue]) => {
              result += `   ${subKey}: ${typeof subValue === 'object' ? JSON.stringify(subValue) : subValue}\n`;
            });
          } else {
            result += `   ${value}\n`;
          }
          return result;
        }).join('\n');
      }
      
      return String(materials);
    } catch (e) {
      // Если не получилось распарсить, возвращаем как есть
      return typeof materialsSpec === 'string' ? materialsSpec : JSON.stringify(materialsSpec, null, 2);
    }
  };

  const handleDownloadPDF = async (spec: any) => {
    try {
      // Загружаем шрифт с поддержкой кириллицы (файл содержит base64 шрифта)
      const fontResponse = await fetch('/fonts/Roboto-Regular.ttf');
      const fontBase64 = await fontResponse.text();

      const doc = new jsPDF();
      doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto', 'normal');

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const lineHeight = 7;
      let yPosition = 20;

      // Заголовок
      doc.setFontSize(16);
      doc.text('ТЕХНИЧЕСКОЕ ЗАДАНИЕ', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight * 2;

      // Общая информация
      doc.setFontSize(12);
      doc.text('ОБЩАЯ ИНФОРМАЦИЯ', margin, yPosition);
      yPosition += lineHeight;

      doc.setFontSize(10);
      doc.text(`Название: ${spec.title || 'Не указано'}`, margin, yPosition);
      yPosition += lineHeight;
      doc.text(`Клиент: ${spec.client_name || 'Не указан'}`, margin, yPosition);
      yPosition += lineHeight;
      doc.text(`Адрес: ${spec.object_address || 'Не указан'}`, margin, yPosition);
      yPosition += lineHeight * 2;

      // Описание объекта
      if (spec.object_description) {
        doc.setFontSize(12);
        doc.text('ОПИСАНИЕ ОБЪЕКТА', margin, yPosition);
        yPosition += lineHeight;
        
        doc.setFontSize(10);
        const descLines = doc.splitTextToSize(spec.object_description, pageWidth - margin * 2);
        descLines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
        yPosition += lineHeight;
      }

      // Объем работ
      if (spec.work_scope) {
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(12);
        doc.text('ОБЪЕМ РАБОТ', margin, yPosition);
        yPosition += lineHeight;

        doc.setFontSize(10);
        const workLines = doc.splitTextToSize(spec.work_scope, pageWidth - margin * 2);
        workLines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
        yPosition += lineHeight;
      }

      // Спецификация материалов
      if (spec.materials_spec) {
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(12);
        doc.text('СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ', margin, yPosition);
        yPosition += lineHeight;

        doc.setFontSize(10);
        const materialsText = formatMaterialsSpec(spec.materials_spec);
        const materialsLines = doc.splitTextToSize(materialsText, pageWidth - margin * 2);
        materialsLines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
      }

      doc.save(`ТЗ_${spec.client_name || 'документ'}_${format(new Date(), 'dd.MM.yyyy')}.pdf`);
      toast.success('PDF успешно загружен');
    } catch (error) {
      console.error('Ошибка создания PDF:', error);
      toast.error('Ошибка при создании PDF');
    }
  };

  const handleDownloadDocx = async (spec: any) => {
    try {
      const paragraphs = [] as Paragraph[];

      // Заголовок
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'ТЕХНИЧЕСКОЕ ЗАДАНИЕ', bold: true, size: 32 }),
          ],
        }),
      );

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Название: ${spec.title || 'Не указано'}`,
              size: 24,
            }),
          ],
        }),
      );

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Клиент: ${spec.client_name || 'Не указан'}`,
              size: 24,
            }),
          ],
        }),
      );

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Адрес объекта: ${spec.object_address || 'Не указан'}`,
              size: 24,
            }),
          ],
        }),
      );

      // Описание объекта
      if (spec.object_description) {
        paragraphs.push(new Paragraph(''));
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: 'ОПИСАНИЕ ОБЪЕКТА', bold: true })],
          }),
        );
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: spec.object_description })],
          }),
        );
      }

      // Объем работ
      if (spec.work_scope) {
        paragraphs.push(new Paragraph(''));
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: 'ОБЪЕМ РАБОТ', bold: true })],
          }),
        );
        spec.work_scope.split('\n').forEach((line: string) => {
          paragraphs.push(new Paragraph({ children: [new TextRun({ text: line })] }));
        });
      }

      // Спецификация материалов
      if (spec.materials_spec) {
        const materialsText = formatMaterialsSpec(spec.materials_spec);
        paragraphs.push(new Paragraph(''));
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: 'СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ', bold: true })],
          }),
        );
        materialsText.split('\n').forEach((line: string) => {
          paragraphs.push(new Paragraph({ children: [new TextRun({ text: line })] }));
        });
      }

      // Нормативные ссылки
      if (spec.normative_references) {
        const refs = Array.isArray(spec.normative_references)
          ? spec.normative_references
          : String(spec.normative_references).split('\n');
        paragraphs.push(new Paragraph(''));
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: 'НОРМАТИВНЫЕ ССЫЛКИ', bold: true })],
          }),
        );
        refs.forEach((ref: string) => {
          if (ref.trim()) {
            paragraphs.push(new Paragraph({ children: [new TextRun({ text: ref })] }));
          }
        });
      }

      // Прочие разделы
      const extraFields: { label: string; value?: string }[] = [
        { label: 'Требования к качеству', value: spec.quality_requirements },
        { label: 'Временные рамки', value: spec.timeline },
        { label: 'Требования безопасности', value: spec.safety_requirements },
        { label: 'Критерии приемки', value: spec.acceptance_criteria },
        { label: 'Дополнительные требования', value: spec.additional_requirements },
      ];

      extraFields.forEach(({ label, value }) => {
        if (value) {
          paragraphs.push(new Paragraph(''));
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: label.toUpperCase(), bold: true })],
            }),
          );
          value.split('\n').forEach((line: string) => {
            paragraphs.push(new Paragraph({ children: [new TextRun({ text: line })] }));
          });
        }
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ТЗ_${spec.client_name || 'документ'}_${format(new Date(), 'dd.MM.yyyy')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('DOCX успешно загружен');
    } catch (error) {
      console.error('Ошибка создания DOCX:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка при создании DOCX');
    }
  };

  const handleCreateEstimate = (spec: any) => {
    // Переход к AI-сметчику с данными ТЗ
    const searchParams = new URLSearchParams({
      ts_id: spec.id,
      work_scope: spec.work_scope || '',
      materials: typeof spec.materials_spec === 'string' 
        ? spec.materials_spec 
        : JSON.stringify(spec.materials_spec),
      client_name: spec.client_name || '',
      object_address: spec.object_address || ''
    });
    navigate(`/ai-estimator?${searchParams.toString()}`);
    toast.info('Переход к созданию сметы...');
  };

  const handleView = (spec: any) => {
    setSelectedSpec(spec);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (spec: any) => {
    setSelectedSpec(spec);
    setEditFormData({
      title: spec.title || '',
      client_name: spec.client_name || '',
      object_address: spec.object_address || '',
      object_description: spec.object_description || '',
      work_scope: spec.work_scope || '',
      materials_spec: typeof spec.materials_spec === 'string' ? spec.materials_spec : JSON.stringify(spec.materials_spec, null, 2),
      normative_references: Array.isArray(spec.normative_references) ? spec.normative_references.join('\n') : (spec.normative_references || ''),
      quality_requirements: spec.quality_requirements || '',
      timeline: spec.timeline || '',
      safety_requirements: spec.safety_requirements || '',
      acceptance_criteria: spec.acceptance_criteria || '',
      additional_requirements: spec.additional_requirements || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSpec) return;
    
    try {
      const updatedData = {
        title: editFormData.title,
        client_name: editFormData.client_name,
        object_address: editFormData.object_address,
        object_description: editFormData.object_description,
        work_scope: editFormData.work_scope,
        materials_spec: editFormData.materials_spec,
        normative_references: editFormData.normative_references.split('\n').filter((line: string) => line.trim()),
        quality_requirements: editFormData.quality_requirements,
        timeline: editFormData.timeline,
        safety_requirements: editFormData.safety_requirements,
        acceptance_criteria: editFormData.acceptance_criteria,
        additional_requirements: editFormData.additional_requirements
      };
      
      await updateSpecification(selectedSpec.id, updatedData);
      setIsEditDialogOpen(false);
      toast.success('Техническое задание обновлено');
    } catch (error) {
      toast.error('Ошибка при обновлении технического задания');
    }
  };

  const handleSmartEdit = async () => {
    if (!selectedSpec || !editInstructions.trim() || fieldsToEdit.length === 0) {
      toast.error('Укажите инструкции по редактированию и выберите поля для изменения');
      return;
    }

    setIsSmartEditing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('edit-technical-specification', {
        body: {
          specification_id: selectedSpec.id,
          edit_instructions: editInstructions,
          fields_to_edit: fieldsToEdit,
          current_specification: selectedSpec
        }
      });

      if (error) throw error;

      toast.success('Техническое задание успешно отредактировано');
      setShowSmartEdit(false);
      setEditInstructions('');
      setFieldsToEdit([]);
      setIsEditDialogOpen(false);
      // Перезагружаем данные
      window.location.reload();
    } catch (error) {
      console.error('Ошибка умного редактирования:', error);
      toast.error('Ошибка при редактировании технического задания');
    } finally {
      setIsSmartEditing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Ошибка доступа к микрофону:', error);
      toast.error('Ошибка доступа к микрофону');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Конвертируем аудио в base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Отправляем на speech-to-text
        const { data, error } = await supabase.functions.invoke('speech-to-text', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        // Добавляем распознанный текст к инструкциям
        const newText = data.text || '';
        setEditInstructions(prev => {
          const separator = prev.trim() ? ' ' : '';
          return prev + separator + newText;
        });
        
        toast.success('Голосовое сообщение обработано');
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Ошибка обработки аудио:', error);
      toast.error('Ошибка обработки голосового сообщения');
    }
  };

  const fieldLabels = {
    title: 'Название',
    object_description: 'Описание объекта',
    client_name: 'Имя клиента',
    object_address: 'Адрес объекта',
    work_scope: 'Объем работ',
    materials_spec: 'Спецификация материалов',
    normative_references: 'Нормативные ссылки',
    quality_requirements: 'Требования к качеству',
    timeline: 'Временные рамки',
    safety_requirements: 'Требования безопасности',
    acceptance_criteria: 'Критерии приемки',
    additional_requirements: 'Дополнительные требования'
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
                          onClick={() => handleEdit(spec)}
                        >
                          <Edit3 className="w-4 h-4" />
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateEstimate(spec)}
                          className="text-primary hover:text-primary"
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          Смета
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
            <DialogTitle>
              {selectedSpec?.title || 'Техническое задание'}
            </DialogTitle>
            <DialogDescription>
              Подробная информация о техническом задании
            </DialogDescription>
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
                
                {selectedSpec.work_scope && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Объем работ (сгенерировано)</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.work_scope}</p>
                    </div>
                  </div>
                )}

                {selectedSpec.object_description && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Исходное описание клиента</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.object_description}</p>
                    </div>
                  </div>
                )}

                {selectedSpec.materials_spec && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Спецификация материалов</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm font-sans">{formatMaterialsSpec(selectedSpec.materials_spec)}</pre>
                    </div>
                  </div>
                )}

                {selectedSpec.normative_references && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Нормативные ссылки</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(selectedSpec.normative_references, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {selectedSpec.quality_requirements && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Требования к качеству</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.quality_requirements}</p>
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

                {selectedSpec.safety_requirements && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Требования безопасности</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.safety_requirements}</p>
                    </div>
                  </div>
                )}

                {selectedSpec.acceptance_criteria && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Критерии приемки</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.acceptance_criteria}</p>
                    </div>
                  </div>
                )}

                {selectedSpec.additional_requirements && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Дополнительные требования</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedSpec.additional_requirements}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Редактировать техническое задание
            </DialogTitle>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSmartEdit(!showSmartEdit)}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                {showSmartEdit ? 'Ручное редактирование' : 'Умное редактирование'}
              </Button>
            </div>
            <DialogDescription>
              {showSmartEdit 
                ? 'Опишите, что нужно изменить, и AI внесет точные правки только в указанные поля'
                : 'Внесите необходимые изменения в техническое задание вручную'
              }
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {showSmartEdit ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit_instructions">Инструкции по редактированию</Label>
                  <div className="relative">
                    <Textarea
                      id="edit_instructions"
                      rows={3}
                      placeholder="Например: Увеличь объем песка в 2 раза, добавь требования по гидроизоляции фундамента, измени сроки на 15 рабочих дней..."
                      value={editInstructions}
                      onChange={(e) => setEditInstructions(e.target.value)}
                      className="pr-12"
                    />
                    <Button
                      type="button"
                      variant={isRecording ? "destructive" : "outline"}
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isSmartEditing}
                    >
                      {isRecording ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {isRecording && (
                    <p className="text-sm text-muted-foreground mt-1">
                      🔴 Запись... Нажмите кнопку микрофона еще раз для остановки
                    </p>
                  )}
                </div>

                <div>
                  <Label>Выберите поля для редактирования:</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(fieldLabels).map(([field, label]) => (
                      <div key={field} className="flex items-center space-x-2">
                        <Checkbox
                          id={field}
                          checked={fieldsToEdit.includes(field)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFieldsToEdit([...fieldsToEdit, field]);
                            } else {
                              setFieldsToEdit(fieldsToEdit.filter(f => f !== field));
                            }
                          }}
                        />
                        <Label htmlFor={field} className="text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleSmartEdit}
                    disabled={isSmartEditing || !editInstructions.trim() || fieldsToEdit.length === 0}
                  >
                    {isSmartEditing ? 'Обрабатываем...' : 'Применить изменения'}
                  </Button>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Название</Label>
                  <Input
                    id="title"
                    value={editFormData.title || ''}
                    onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="client_name">Клиент</Label>
                  <Input
                    id="client_name"
                    value={editFormData.client_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, client_name: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="object_address">Адрес объекта</Label>
                <Input
                  id="object_address"
                  value={editFormData.object_address || ''}
                  onChange={(e) => setEditFormData({...editFormData, object_address: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="object_description">Исходное описание клиента</Label>
                <Textarea
                  id="object_description"
                  rows={3}
                  value={editFormData.object_description || ''}
                  onChange={(e) => setEditFormData({...editFormData, object_description: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="work_scope">Объем работ</Label>
                <Textarea
                  id="work_scope"
                  rows={5}
                  value={editFormData.work_scope || ''}
                  onChange={(e) => setEditFormData({...editFormData, work_scope: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="materials_spec">Спецификация материалов</Label>
                <Textarea
                  id="materials_spec"
                  rows={4}
                  value={editFormData.materials_spec || ''}
                  onChange={(e) => setEditFormData({...editFormData, materials_spec: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="normative_references">Нормативные ссылки (по одной на строку)</Label>
                <Textarea
                  id="normative_references"
                  rows={3}
                  value={editFormData.normative_references || ''}
                  onChange={(e) => setEditFormData({...editFormData, normative_references: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="quality_requirements">Требования к качеству</Label>
                <Textarea
                  id="quality_requirements"
                  rows={3}
                  value={editFormData.quality_requirements || ''}
                  onChange={(e) => setEditFormData({...editFormData, quality_requirements: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="timeline">Временные рамки</Label>
                <Textarea
                  id="timeline"
                  rows={2}
                  value={editFormData.timeline || ''}
                  onChange={(e) => setEditFormData({...editFormData, timeline: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="safety_requirements">Требования безопасности</Label>
                <Textarea
                  id="safety_requirements"
                  rows={3}
                  value={editFormData.safety_requirements || ''}
                  onChange={(e) => setEditFormData({...editFormData, safety_requirements: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="acceptance_criteria">Критерии приемки</Label>
                <Textarea
                  id="acceptance_criteria"
                  rows={3}
                  value={editFormData.acceptance_criteria || ''}
                  onChange={(e) => setEditFormData({...editFormData, acceptance_criteria: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="additional_requirements">Дополнительные требования</Label>
                <Textarea
                  id="additional_requirements"
                  rows={3}
                  value={editFormData.additional_requirements || ''}
                  onChange={(e) => setEditFormData({...editFormData, additional_requirements: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button onClick={handleSaveEdit}>
                  Сохранить изменения
                </Button>
              </div>
            </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TechnicalSpecifications;