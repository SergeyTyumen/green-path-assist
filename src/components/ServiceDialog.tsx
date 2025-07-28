import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServices, Service } from "@/hooks/useServices";
import { toast } from "sonner";

interface ServiceDialogProps {
  children: React.ReactNode;
  service?: Service;
  onSuccess?: () => void;
}

export function ServiceDialog({ children, service, onSuccess }: ServiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: service?.name || "",
    category: service?.category || "",
    unit: service?.unit || "услуга",
    price: service?.price || 0,
    description: service?.description || "",
    duration_hours: service?.duration_hours || 1,
  });

  const { createService, updateService } = useServices();

  const categories = ["Проектирование", "Земляные работы", "Посадка", "Укладка", "Монтаж", "Обслуживание", "Консультации", "Другое"];
  const units = ["услуга", "час", "м²", "м.п", "м³", "точка", "компл", "шт", "рейс"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Введите название услуги");
      return;
    }

    if (!formData.category) {
      toast.error("Выберите категорию");
      return;
    }

    if (formData.price <= 0) {
      toast.error("Цена должна быть больше 0");
      return;
    }

    try {
      if (service) {
        await updateService(service.id, formData);
      } else {
        await createService(formData);
      }
      
      setOpen(false);
      onSuccess?.();
      
      // Сброс формы только при создании новой услуги
      if (!service) {
        setFormData({
          name: "",
          category: "",
          unit: "услуга",
          price: 0,
          description: "",
          duration_hours: 1,
        });
      }
    } catch (error) {
      console.error("Error saving service:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {service ? "Редактировать услугу" : "Добавить услугу"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Проектирование участка"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Категория *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Цена *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit">Единица измерения</Label>
              <Select 
                value={formData.unit} 
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите единицу" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_hours">Длительность (часы)</Label>
              <Input
                id="duration_hours"
                type="number"
                min="0.5"
                step="0.5"
                value={formData.duration_hours}
                onChange={(e) => setFormData({ ...formData, duration_hours: Number(e.target.value) })}
                placeholder="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Подробное описание услуги..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">
              {service ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}