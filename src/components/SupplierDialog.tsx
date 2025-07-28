import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useSuppliers } from "@/hooks/useSuppliers";
import { toast } from "sonner";

interface Supplier {
  id: string;
  user_id: string;
  name: string;
  categories: string[];
  location?: string;
  phone?: string;
  email?: string;
  status: string;
  rating?: number;
  orders_count?: number;
  delivery_time?: string;
  created_at: string;
  updated_at: string;
}

interface SupplierDialogProps {
  children: React.ReactNode;
  supplier?: Supplier;
  onSuccess?: () => void;
}

export function SupplierDialog({ children, supplier, onSuccess }: SupplierDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: supplier?.name || "",
    location: supplier?.location || "",
    phone: supplier?.phone || "",
    email: supplier?.email || "",
    status: supplier?.status || "active",
    rating: supplier?.rating || 0,
    delivery_time: supplier?.delivery_time || "",
    categories: supplier?.categories || [],
  });

  const { createSupplier, updateSupplier } = useSuppliers();

  const availableCategories = [
    "Растения", "Элементы декора", "Сыпучие материалы", 
    "Автополив", "Удобрения", "Инструменты", "Техника"
  ];

  const statusOptions = [
    { value: "active", label: "Активен" },
    { value: "on-hold", label: "Приостановлен" },
    { value: "inactive", label: "Неактивен" }
  ];

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, category]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        categories: prev.categories.filter(cat => cat !== category)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Введите название поставщика");
      return;
    }

    if (formData.categories.length === 0) {
      toast.error("Выберите хотя бы одну категорию");
      return;
    }

    try {
      const supplierData = {
        ...formData,
        rating: Number(formData.rating) || 0,
      };

      if (supplier) {
        await updateSupplier(supplier.id, supplierData);
      } else {
        await createSupplier(supplierData);
      }
      
      setOpen(false);
      onSuccess?.();
      
      // Сброс формы только при создании нового поставщика
      if (!supplier) {
        setFormData({
          name: "",
          location: "",
          phone: "",
          email: "",
          status: "active",
          rating: 0,
          delivery_time: "",
          categories: [],
        });
      }
    } catch (error) {
      console.error("Error saving supplier:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {supplier ? "Редактировать поставщика" : "Добавить поставщика"}
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
                placeholder="Название поставщика"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (xxx) xxx-xx-xx"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="supplier@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Локация</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Город, регион"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_time">Время доставки</Label>
              <Input
                id="delivery_time"
                value={formData.delivery_time}
                onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                placeholder="1-2 дня"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rating">Рейтинг (0-5)</Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                placeholder="4.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Категории товаров *</Label>
            <div className="grid grid-cols-2 gap-2 p-4 border rounded-md">
              {availableCategories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={formData.categories.includes(category)}
                    onCheckedChange={(checked) => 
                      handleCategoryChange(category, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`category-${category}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">
              {supplier ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}