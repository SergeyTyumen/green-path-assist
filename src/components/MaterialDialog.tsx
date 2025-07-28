import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMaterials, Material } from "@/hooks/useMaterials";
import { useClients } from "@/hooks/useClients";
import { toast } from "sonner";

interface MaterialDialogProps {
  children: React.ReactNode;
  material?: Material;
  onSuccess?: () => void;
}

export function MaterialDialog({ children, material, onSuccess }: MaterialDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: material?.name || "",
    category: material?.category || "",
    unit: material?.unit || "",
    price: material?.price || 0,
    stock: material?.stock || 0,
    min_stock: material?.min_stock || 0,
    supplier: material?.supplier || "",
  });

  const { createMaterial, updateMaterial } = useMaterials();

  const categories = ["Растения", "Элементы декора", "Сыпучие материалы", "Автополив", "Удобрения", "Инструменты", "Другое"];
  const units = ["шт", "м.п", "м²", "м³", "кг", "тн", "упак", "л", "рейс"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Введите название материала");
      return;
    }

    if (!formData.category) {
      toast.error("Выберите категорию");
      return;
    }

    if (!formData.unit) {
      toast.error("Выберите единицу измерения");
      return;
    }

    if (formData.price <= 0) {
      toast.error("Цена должна быть больше 0");
      return;
    }

    try {
      if (material) {
        await updateMaterial(material.id, formData);
      } else {
        await createMaterial(formData);
      }
      
      setOpen(false);
      onSuccess?.();
      
      // Сброс формы только при создании нового материала
      if (!material) {
        setFormData({
          name: "",
          category: "",
          unit: "",
          price: 0,
          stock: 0,
          min_stock: 0,
          supplier: "",
        });
      }
    } catch (error) {
      console.error("Error saving material:", error);
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
            {material ? "Редактировать материал" : "Добавить материал"}
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
                placeholder="Например: Газонная трава"
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

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="unit">Единица измерения *</Label>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Текущий остаток</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min_stock">Минимальный остаток</Label>
              <Input
                id="min_stock"
                type="number"
                min="0"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Поставщик</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Название поставщика"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">
              {material ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}