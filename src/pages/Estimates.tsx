import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Copy,
  Bot,
  Trash2,
  Brain
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEstimates, Estimate } from "@/hooks/useEstimates";
import { EstimateDialog } from "@/components/EstimateDialog";
import { useClients } from "@/hooks/useClients";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

export default function Estimates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { estimates, loading, createEstimate, updateEstimate, deleteEstimate, refetch } = useEstimates();
  const { clients } = useClients();

  const getStatusBadge = (status: Estimate["status"]) => {
    const statusConfig = {
      "draft": { label: "Черновик", className: "bg-gray-100 text-gray-700" },
      "sent": { label: "Отправлена", className: "bg-blue-100 text-blue-700" },
      "approved": { label: "Утверждена", className: "bg-green-100 text-green-700" },
      "rejected": { label: "Отклонена", className: "bg-red-100 text-red-700" }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleCreateEstimate = () => {
    setSelectedEstimate(undefined);
    setIsDialogOpen(true);
  };

  const handleEditEstimate = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setIsDialogOpen(true);
  };

  const handleViewEstimate = async (estimate: Estimate) => {
    await generateEstimatePDF(estimate);
  };

  const generateEstimatePDF = async (estimate: Estimate) => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      
      const getItemName = (item: any) => {
        return item.materials?.name || item.services?.name || item.description || 'Позиция';
      };
      
      // Создаем временный элемент для рендера PDF
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '210mm'; // A4 width
      element.style.backgroundColor = 'white';
      element.style.padding = '20mm';
      element.style.fontFamily = 'Arial, sans-serif';
      
      const clientName = getClientName(estimate.client_id);
      
      element.innerHTML = `
        <div style="margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">
          <h1 style="margin: 0; font-size: 24px; color: #333;">СМЕТА №${estimate.id.slice(-8).toUpperCase()}</h1>
          <p style="margin: 5px 0; color: #666;">${estimate.title}</p>
          <p style="margin: 5px 0; color: #666;">Клиент: ${clientName}</p>
          <p style="margin: 5px 0; color: #666;">Дата: ${new Date(estimate.created_at).toLocaleDateString('ru-RU')}</p>
          ${estimate.valid_until ? `<p style="margin: 5px 0; color: #666;">Действительна до: ${new Date(estimate.valid_until).toLocaleDateString('ru-RU')}</p>` : ''}
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">№</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Наименование</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold;">Кол-во</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold;">Цена</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold;">Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${estimate.items && estimate.items.length > 0 ? 
              estimate.items.map((item, index) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${index + 1}</td>
                  <td style="border: 1px solid #ddd; padding: 10px;">${getItemName(item)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${item.quantity}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${item.unit_price.toLocaleString('ru-RU')} ₽</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${item.total.toLocaleString('ru-RU')} ₽</td>
                </tr>
              `).join('') 
              : 
              '<tr><td colspan="5" style="border: 1px solid #ddd; padding: 20px; text-align: center; color: #999;">Позиции не добавлены</td></tr>'
            }
          </tbody>
        </table>
        
        <div style="text-align: right; margin-top: 30px;">
          <div style="font-size: 18px; font-weight: bold; color: #333;">
            Итого: ${estimate.total_amount.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        
        <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
          <p>Дата создания: ${new Date().toLocaleString('ru-RU')}</p>
          <p>Статус: ${getStatusLabel(estimate.status)}</p>
        </div>
      `;
      
      document.body.appendChild(element);
      
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
      });
      
      document.body.removeChild(element);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Смета_${estimate.title}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.pdf`);
      toast.success('PDF смета сгенерирована и скачана');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Ошибка при генерации PDF');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'draft': 'Черновик',
      'sent': 'Отправлена',
      'approved': 'Утверждена',
      'rejected': 'Отклонена'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleSaveEstimate = async (estimateData: any, items: any[]) => {
    console.log('Saving estimate with data:', estimateData, 'and items:', items);
    try {
      if (selectedEstimate) {
        // Обновление сметы
        await updateEstimate(selectedEstimate.id, estimateData);
        
        // Удаляем старые позиции
        const { error: deleteError } = await supabase
          .from('estimate_items')
          .delete()
          .eq('estimate_id', selectedEstimate.id);
        
        if (deleteError) throw deleteError;
        
        // Создаем новые позиции
        if (items.length > 0) {
          const { error: insertError } = await supabase
            .from('estimate_items')
            .insert(
              items.map(item => ({
                estimate_id: selectedEstimate.id,
                material_id: item.material_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total
              }))
            );
          
          if (insertError) throw insertError;
        }
        
        toast.success("Смета успешно обновлена");
      } else {
        // Создание новой сметы
        const newEstimate = await createEstimate(estimateData);
        if (newEstimate && items.length > 0) {
          console.log('Creating estimate items for estimate:', newEstimate.id);
          const { error: itemsError } = await supabase
            .from('estimate_items')
            .insert(
              items.map(item => ({
                estimate_id: newEstimate.id,
                material_id: item.material_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total
              }))
            );
          
          if (itemsError) {
            console.error('Error creating estimate items:', itemsError);
            throw itemsError;
          }
          console.log('Successfully created estimate items');
        }
        toast.success("Смета успешно создана");
      }
      
      // Обновляем список смет
      refetch();
    } catch (error) {
      console.error('Error saving estimate:', error);
      toast.error("Произошла ошибка при сохранении сметы");
    }
  };

  const handleDeleteEstimate = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту смету?")) {
      await deleteEstimate(id);
    }
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return "Без клиента";
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Неизвестный клиент";
  };

  const filteredEstimates = estimates.filter(estimate => {
    const clientName = getClientName(estimate.client_id);
    return clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           estimate.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           estimate.id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="max-w-full w-full p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">Сметы</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Управление сметами и расчетами проектов
          </p>
        </div>
        <div className="flex flex-wrap gap-2 min-w-0">
          <Button 
            variant="outline" 
            className="gap-2 min-h-[44px]"
            onClick={() => navigate('/ai-estimator')}
          >
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">ИИ-расчет</span>
            <span className="sm:hidden">ИИ</span>
          </Button>
          <Button 
            onClick={handleCreateEstimate}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2 min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Создать смету</span>
            <span className="sm:hidden">Создать</span>
          </Button>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по клиенту, проекту или номеру сметы..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список смет */}
      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="grid gap-4">
          {filteredEstimates.map((estimate) => (
            <Card 
              key={estimate.id} 
              className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.01]"
              onClick={() => handleViewEstimate(estimate)}
            >
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground break-words">
                          {estimate.title}
                        </h3>
                        {getStatusBadge(estimate.status)}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground break-words">
                          {getClientName(estimate.client_id)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                          <span>Создана: {new Date(estimate.created_at).toLocaleDateString('ru-RU')}</span>
                          <span>Позиций: {estimate.items?.length || 0}</span>
                          {estimate.valid_until && (
                            <span>Действительна до: {new Date(estimate.valid_until).toLocaleDateString('ru-RU')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="text-left sm:text-right">
                        <div className="text-xl sm:text-2xl font-bold text-foreground">
                          {estimate.total_amount.toLocaleString('ru-RU')}₽
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Общая сумма
                        </div>
                      </div>

                      <div className="flex flex-row gap-1 shrink-0">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="min-w-[44px] min-h-[44px] p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEstimate(estimate);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="min-w-[44px] min-h-[44px] p-0"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              // Копируем смету
                              const newEstimate = await createEstimate({
                                ...estimate,
                                title: `${estimate.title} (копия)`,
                                status: 'draft'
                              });
                              
                              // Копируем позиции сметы
                              if (newEstimate && estimate.items && estimate.items.length > 0) {
                                const { error: itemsError } = await supabase
                                  .from('estimate_items')
                                  .insert(
                                    estimate.items.map((item: any) => ({
                                      estimate_id: newEstimate.id,
                                      material_id: item.material_id,
                                      service_id: item.service_id,
                                      quantity: item.quantity,
                                      unit_price: item.unit_price,
                                      total: item.total,
                                      description: item.description
                                    }))
                                  );
                                
                                if (itemsError) throw itemsError;
                              }
                              
                              toast.success('Смета успешно скопирована');
                              refetch();
                            } catch (error) {
                              console.error('Error copying estimate:', error);
                              toast.error('Ошибка при копировании сметы');
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="min-w-[44px] min-h-[44px] p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEstimate(estimate.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredEstimates.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Сметы не найдены
            </h3>
            <p className="text-muted-foreground mb-4">
              Попробуйте изменить параметры поиска или создайте новую смету
            </p>
            <Button onClick={handleCreateEstimate}>
              <Plus className="h-4 w-4 mr-2" />
              Создать первую смету
            </Button>
          </CardContent>
        </Card>
      )}

      <EstimateDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        estimate={selectedEstimate}
        onSave={handleSaveEstimate}
      />
    </div>
  );
}