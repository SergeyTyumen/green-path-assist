import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calculator } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useMaterials } from "@/hooks/useMaterials";
import { useServices } from "@/hooks/useServices";
import { Estimate, EstimateItem } from "@/hooks/useEstimates";

interface EstimateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  estimate?: Estimate;
  onSave: (estimateData: Omit<Estimate, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'items'>, items: Omit<EstimateItem, 'id' | 'estimate_id' | 'created_at'>[]) => Promise<void>;
}

interface EstimateItemInput {
  material_id?: string;
  service_id?: string;
  type: 'material' | 'service';
  name: string;
  quantity: number;
  unit_price: number;
  unit: string;
  total: number;
}

export function EstimateDialog({ isOpen, onClose, estimate, onSave }: EstimateDialogProps) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [status, setStatus] = useState<'draft' | 'sent' | 'approved' | 'rejected'>('draft');
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<EstimateItemInput[]>([]);

  const { clients } = useClients();
  const { materials } = useMaterials();
  const { services } = useServices();

  useEffect(() => {
    if (estimate) {
      setTitle(estimate.title);
      setClientId(estimate.client_id || "");
      setStatus(estimate.status);
      setValidUntil(estimate.valid_until || "");
      
      // Преобразуем существующие items
      if (estimate.items) {
        const convertedItems: EstimateItemInput[] = estimate.items.map(item => {
          let itemDetails;
          let type: 'material' | 'service' = 'material';
          
          if (item.material_id) {
            itemDetails = materials.find(m => m.id === item.material_id);
            type = 'material';
          } else {
            // Предполагаем, что это услуга
            itemDetails = services.find(s => s.id === item.material_id);
            type = 'service';
          }

          return {
            material_id: type === 'material' ? item.material_id : undefined,
            service_id: type === 'service' ? item.material_id : undefined,
            type,
            name: itemDetails?.name || 'Неизвестный элемент',
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            unit: itemDetails?.unit || 'шт',
            total: Number(item.total)
          };
        });
        setItems(convertedItems);
      }
    } else {
      resetForm();
    }
  }, [estimate, materials, services]);

  const resetForm = () => {
    setTitle("");
    setClientId("");
    setStatus('draft');
    setValidUntil("");
    setItems([]);
  };

  const addItem = () => {
    setItems([...items, {
      type: 'material',
      name: '',
      quantity: 1,
      unit_price: 0,
      unit: 'шт',
      total: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof EstimateItemInput, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    
    if (field === 'material_id' || field === 'service_id') {
      // Сброс данных при смене материала/услуги
      const selectedItem = field === 'material_id' 
        ? materials.find(m => m.id === value)
        : services.find(s => s.id === value);
      
      if (selectedItem) {
        item.type = field === 'material_id' ? 'material' : 'service';
        item.material_id = field === 'material_id' ? value : undefined;
        item.service_id = field === 'service_id' ? value : undefined;
        item.name = selectedItem.name;
        item.unit_price = Number(selectedItem.price);
        item.unit = selectedItem.unit;
        item.total = item.quantity * Number(selectedItem.price);
      }
    } else {
      (item as any)[field] = value;
      
      // Пересчет общей стоимости
      if (field === 'quantity' || field === 'unit_price') {
        item.total = Number(item.quantity) * Number(item.unit_price);
      }
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    const estimateData = {
      title: title.trim(),
      client_id: clientId || undefined,
      status,
      total_amount: getTotalAmount(),
      valid_until: validUntil || undefined
    };

    const estimateItems = items.map(item => ({
      material_id: item.material_id || item.service_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total
    }));

    await onSave(estimateData, estimateItems);
    onClose();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {estimate ? "Редактировать смету" : "Создать смету"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название сметы</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название проекта"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Клиент</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Черновик</SelectItem>
                  <SelectItem value="sent">Отправлена</SelectItem>
                  <SelectItem value="approved">Утверждена</SelectItem>
                  <SelectItem value="rejected">Отклонена</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil">Действительна до</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Позиции сметы</CardTitle>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Добавить позицию
              </Button>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Добавьте позиции в смету
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Наименование</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Объем</TableHead>
                        <TableHead>Ед. изм</TableHead>
                        <TableHead>Цена за ед.</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.material_id || item.service_id || ''}
                              onValueChange={(value) => {
                                const field = item.type === 'material' ? 'material_id' : 'service_id';
                                updateItem(index, field, value);
                              }}
                            >
                              <SelectTrigger className="min-w-[200px]">
                                <SelectValue placeholder="Выберите позицию" />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="p-2">
                                  <div className="flex gap-2 mb-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={item.type === 'material' ? 'default' : 'outline'}
                                      onClick={() => updateItem(index, 'type', 'material')}
                                    >
                                      Материалы
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={item.type === 'service' ? 'default' : 'outline'}
                                      onClick={() => updateItem(index, 'type', 'service')}
                                    >
                                      Услуги
                                    </Button>
                                  </div>
                                </div>
                                {(item.type === 'material' ? materials : services).map((option) => (
                                  <SelectItem key={option.id} value={option.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{option.name}</span>
                                      <Badge variant="outline" className="ml-2">
                                        {option.price}₽/{option.unit}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.type === 'material' ? 'default' : 'secondary'}>
                              {item.type === 'material' ? 'Материал' : 'Услуга'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                              min="0"
                              step="0.01"
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{item.unit}</span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                              min="0"
                              step="0.01"
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {item.total.toLocaleString('ru-RU')}₽
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {items.length > 0 && (
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-bold">
                      Итого: {getTotalAmount().toLocaleString('ru-RU')}₽
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">
              {estimate ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}