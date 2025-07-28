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

interface SupplierPhone {
  number: string;
  type: 'mobile' | 'landline';
  messenger?: 'whatsapp' | 'telegram' | 'viber' | 'none' | '';
}

interface Supplier {
  id: string;
  user_id: string;
  name: string;
  categories: string[];
  location?: string;
  email?: string;
  status: string;
  rating?: number;
  orders_count?: number;
  entity_type: string;
  phones: SupplierPhone[];
  contact_person?: string;
  tags?: string[];
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
    email: supplier?.email || "",
    status: supplier?.status || "active",
    rating: supplier?.rating || 0,
    entity_type: supplier?.entity_type || "ООО",
    phones: supplier?.phones || [],
    contact_person: supplier?.contact_person || "",
    categories: supplier?.categories || [],
    tags: supplier?.tags || [],
  });

  const { createSupplier, updateSupplier } = useSuppliers();

  const availableCategories = [
    "Растения", "Элементы декора", "Сыпучие материалы", 
    "Автополив", "Удобрения", "Инструменты", "Техника", "Брусчатка"
  ];

  const availableTags = [
    { name: "Собственное производство", color: "bg-green-500" },
    { name: "Дилерская скидка", color: "bg-blue-500" },
    { name: "Удобный склад", color: "bg-purple-500" },
    { name: "Есть отсрочка", color: "bg-orange-500" },
    { name: "Быстрая доставка", color: "bg-red-500" },
    { name: "Эксклюзивный поставщик", color: "bg-indigo-500" },
  ];

  const statusOptions = [
    { value: "active", label: "Активен" },
    { value: "on-hold", label: "Приостановлен" },
    { value: "inactive", label: "Неактивен" }
  ];

  const entityTypeOptions = [
    { value: "physical", label: "Частное лицо" },
    { value: "self-employed", label: "Самозанятый" },
    { value: "ip", label: "ИП" },
    { value: "ooo", label: "ООО" }
  ];

  const messengerOptions = [
    { value: "none", label: "Нет" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "telegram", label: "Telegram" },
    { value: "viber", label: "Viber" }
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

  const handleTagChange = (tag: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== tag)
      }));
    }
  };

  const addPhone = () => {
    setFormData(prev => ({
      ...prev,
      phones: [...prev.phones, { number: "", type: "mobile", messenger: "none" }]
    }));
  };

  const updatePhone = (index: number, field: keyof SupplierPhone, value: string) => {
    setFormData(prev => ({
      ...prev,
      phones: prev.phones.map((phone, i) => 
        i === index ? { ...phone, [field]: value } : phone
      )
    }));
  };

  const removePhone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index)
    }));
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
          email: "",
          status: "active",
          rating: 0,
          entity_type: "ООО",
          phones: [],
          contact_person: "",
          categories: [],
          tags: [],
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
              <Label htmlFor="entity_type">Тип организации</Label>
              <Select 
                value={formData.entity_type} 
                onValueChange={(value) => setFormData({ ...formData, entity_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  {entityTypeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact_person">Контактное лицо</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="ФИО контактного лица"
              />
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="location">Локация</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Город, регион"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Телефоны</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPhone}>
                Добавить телефон
              </Button>
            </div>
            {formData.phones.map((phone, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 p-3 border rounded-md">
                <Input
                  placeholder="+7 (xxx) xxx-xx-xx"
                  value={phone.number}
                  onChange={(e) => updatePhone(index, 'number', e.target.value)}
                />
                <Select 
                  value={phone.type} 
                  onValueChange={(value) => updatePhone(index, 'type', value as 'mobile' | 'landline')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Мобильный</SelectItem>
                    <SelectItem value="landline">Городской</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={phone.messenger || "none"} 
                  onValueChange={(value) => updatePhone(index, 'messenger', value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Мессенджер" />
                  </SelectTrigger>
                  <SelectContent>
                    {messengerOptions.map((messenger) => (
                      <SelectItem key={messenger.value} value={messenger.value}>
                        {messenger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removePhone(index)}
                >
                  Удалить
                </Button>
              </div>
            ))}
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

          <div className="space-y-2">
            <Label>Метки</Label>
            <div className="grid grid-cols-2 gap-2 p-4 border rounded-md">
              {availableTags.map((tag) => (
                <div key={tag.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag.name}`}
                    checked={formData.tags.includes(tag.name)}
                    onCheckedChange={(checked) => 
                      handleTagChange(tag.name, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`tag-${tag.name}`}
                    className="text-sm font-normal cursor-pointer flex items-center space-x-2"
                  >
                    <span className={`w-3 h-3 rounded-full ${tag.color}`}></span>
                    <span>{tag.name}</span>
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