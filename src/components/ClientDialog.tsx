import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { useClients, type Client } from "@/hooks/useClients";
import { toast } from "sonner";

interface ClientDialogProps {
  children: React.ReactNode;
  client?: Client;
  onSuccess?: () => void;
}

export function ClientDialog({ children, client, onSuccess }: ClientDialogProps) {
  const { createClient, updateClient } = useClients();
  const [open, setOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: client?.name || "",
    phone: client?.phone || "",
    email: client?.email || "",
    address: client?.address || "",
    services: client?.services || [],
    status: client?.status || "new",
    notes: client?.notes || "",
    project_description: client?.project_description || "",
    last_contact: client?.last_contact || "",
    next_action: client?.next_action || "",
    project_area: client?.project_area || undefined,
    budget: client?.budget || undefined,
  });

  const [newService, setNewService] = useState("");

  const availableServices = [
    "Ландшафтное проектирование",
    "Автополив",
    "Укладка газона",
    "Уход за растениями", 
    "Посадка деревьев",
    "Дренаж",
    "Освещение",
    "Мощение дорожек",
    "Установка заборов",
    "Создание водоемов",
    "Альпийские горки",
    "Вертикальное озеленение",
    "Футбольное поле",
    "Детская площадка",
    "Спортивная площадка"
  ];

  const statusOptions = [
    { value: "new", label: "Новый" },
    { value: "in-progress", label: "В работе" },
    { value: "proposal-sent", label: "КП отправлено" },
    { value: "call-scheduled", label: "Созвон" },
    { value: "postponed", label: "Отложено" },
    { value: "closed", label: "Закрыт" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Введите имя клиента");
      return;
    }
    
    if (!formData.phone.trim()) {
      toast.error("Введите телефон клиента");
      return;
    }

    console.log('🚀 Начинаем создание клиента:', formData);

    try {
      if (client) {
        // Обновление существующего клиента
        console.log('📝 Обновляем клиента:', client.id);
        await updateClient(client.id, formData);
        toast.success("Клиент обновлен!");
      } else {
        // Создание нового клиента
        console.log('➕ Создаем нового клиента');
        
        // Очищаем пустые строки для дат - заменяем на null
        const cleanedData = {
          ...formData,
          last_contact: formData.last_contact?.trim() || null,
          project_area: formData.project_area || null,
          budget: formData.budget || null,
          email: formData.email?.trim() || null,
          address: formData.address?.trim() || null,
          notes: formData.notes?.trim() || null,
          project_description: formData.project_description?.trim() || null,
          next_action: formData.next_action?.trim() || null,
        };
        
        console.log('🧹 Очищенные данные:', cleanedData);
        const result = await createClient(cleanedData);
        console.log('✅ Результат создания:', result);
        toast.success("Клиент создан!");
      }
      
      setOpen(false);
      onSuccess?.();
      
      // Сброс формы только при создании нового клиента
      if (!client) {
        setFormData({
          name: "",
          phone: "",
          email: "",
          address: "",
          services: [],
          status: "new",
          notes: "",
          project_description: "",
          last_contact: "",
          next_action: "",
          project_area: undefined,
          budget: undefined,
        });
      }
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error("Ошибка при сохранении клиента");
    }
  };

  const addService = () => {
    if (newService.trim() && !formData.services.includes(newService.trim())) {
      setFormData({
        ...formData,
        services: [...formData.services, newService.trim()]
      });
      setNewService("");
    }
  };

  const removeService = (serviceToRemove: string) => {
    setFormData({
      ...formData,
      services: formData.services.filter(service => service !== serviceToRemove)
    });
  };

  const addAvailableService = (service: string) => {
    if (!formData.services.includes(service)) {
      setFormData({
        ...formData,
        services: [...formData.services, service]
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? "Редактировать клиента" : "Добавить нового клиента"}
          </DialogTitle>
          <DialogDescription>
            {client ? "Изменить информацию о клиенте и его проекте" : "Создать новый профиль клиента с контактными данными и описанием проекта"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя клиента *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Фамилия Имя Отчество"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Адрес */}
          <div className="space-y-2">
            <Label htmlFor="address">Адрес объекта</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Город, улица, дом"
            />
          </div>

          {/* Описание проекта */}
          <div className="space-y-2">
            <Label htmlFor="project_description">Описание проекта</Label>
            <Textarea
              id="project_description"
              value={formData.project_description}
              onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
              placeholder="Краткое описание желаемого проекта"
              rows={2}
            />
          </div>

          {/* Проект детали */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_area">Площадь (м²)</Label>
              <Input
                id="project_area"
                type="number"
                value={formData.project_area || ""}
                onChange={(e) => setFormData({ ...formData, project_area: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Бюджет (₽)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget || ""}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="500000"
              />
            </div>
          </div>

          {/* Услуги */}
          <div className="space-y-4">
            <Label>Услуги</Label>
            
            {/* Быстрый выбор услуг */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Популярные услуги:</Label>
              <div className="flex flex-wrap gap-2">
                {availableServices.map((service) => (
                  <Badge
                    key={service}
                    variant={formData.services.includes(service) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() => addAvailableService(service)}
                  >
                    {service}
                    {formData.services.includes(service) && (
                      <X
                        className="h-3 w-3 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeService(service);
                        }}
                      />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Добавление своей услуги */}
            <div className="flex gap-2">
              <Input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Добавить свою услугу"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
              />
              <Button type="button" onClick={addService} variant="outline">
                Добавить
              </Button>
            </div>

            {/* Выбранные услуги */}
            {formData.services.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Выбранные услуги:</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.services.map((service) => (
                    <Badge key={service} variant="default">
                      {service}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => removeService(service)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Заметки */}
          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Дополнительная информация о клиенте"
              rows={3}
            />
          </div>

          {/* Следующие действия */}
          <div className="space-y-2">
            <Label htmlFor="next_action">Следующее действие</Label>
            <Input
              id="next_action"
              value={formData.next_action}
              onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
              placeholder="Позвонить, отправить КП, назначить встречу..."
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {client ? "Сохранить изменения" : "Создать клиента"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}