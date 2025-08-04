import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Package, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  min_stock: number;
  supplier?: string;
}

interface OrderMaterialDialogProps {
  material: Material;
  isOpen: boolean;
  onClose: () => void;
  onOrder: (orderData: {
    materialId: string;
    quantity: number;
    priority: string;
    notes: string;
  }) => Promise<void>;
}

export function OrderMaterialDialog({ material, isOpen, onClose, onOrder }: OrderMaterialDialogProps) {
  const { toast } = useToast();
  const [orderData, setOrderData] = useState({
    quantity: material.min_stock - material.stock + 10, // Умное предложение количества
    priority: 'medium',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (orderData.quantity <= 0) {
      toast({
        title: "Ошибка",
        description: "Количество должно быть больше 0",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await onOrder({
        materialId: material.id,
        quantity: orderData.quantity,
        priority: orderData.priority,
        notes: orderData.notes
      });
      
      toast({
        title: "Заказ оформлен",
        description: `Заказ на ${orderData.quantity} ${material.unit} материала "${material.name}" отправлен поставщику`
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось оформить заказ",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const estimatedCost = orderData.quantity * material.price;
  const isUrgent = material.stock === 0;
  const recommendedQuantity = Math.max(material.min_stock - material.stock + 10, 10);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Заказ материала
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Информация о материале */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4" />
              <h4 className="font-medium">{material.name}</h4>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Текущий остаток: {material.stock} {material.unit}</div>
              <div>Минимальный остаток: {material.min_stock} {material.unit}</div>
              <div>Цена: ₽{material.price.toLocaleString()} за {material.unit}</div>
              {material.supplier && <div>Поставщик: {material.supplier}</div>}
            </div>
            
            {isUrgent && (
              <div className="flex items-center gap-1 mt-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Материал закончился!</span>
              </div>
            )}
          </div>

          {/* Форма заказа */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">Количество для заказа ({material.unit})</Label>
              <Input
                id="quantity"
                type="number"
                value={orderData.quantity}
                onChange={(e) => setOrderData({ ...orderData, quantity: parseInt(e.target.value) || 0 })}
                min="1"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Рекомендуется: {recommendedQuantity} {material.unit}
              </div>
            </div>

            <div>
              <Label htmlFor="priority">Приоритет заказа</Label>
              <Select value={orderData.priority} onValueChange={(value) => setOrderData({ ...orderData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="urgent">Срочный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Комментарий к заказу</Label>
              <Textarea
                id="notes"
                value={orderData.notes}
                onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                placeholder="Дополнительные требования к заказу..."
                rows={3}
              />
            </div>

            {/* Расчет стоимости */}
            <div className="p-3 bg-primary/5 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Предварительная стоимость:</span>
                <span className="font-bold text-lg">₽{estimatedCost.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Ожидаемый срок доставки: 3-5 дней</span>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={loading || orderData.quantity <= 0}>
              {loading ? 'Оформление...' : 'Оформить заказ'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}