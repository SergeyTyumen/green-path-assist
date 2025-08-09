import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Phone,
  MapPin,
  Star,
  Bot,
  Loader2,
  Mail
} from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { SupplierDialog } from "@/components/SupplierDialog";
import { ClickablePhone } from "@/components/ClickablePhone";

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

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const { suppliers, loading } = useSuppliers();

  const availableTags = [
    { name: "Собственное производство", color: "bg-green-500" },
    { name: "Дилерская скидка", color: "bg-blue-500" },
    { name: "Удобный склад", color: "bg-purple-500" },
    { name: "Есть отсрочка", color: "bg-orange-500" },
    { name: "Быстрая доставка", color: "bg-red-500" },
    { name: "Эксклюзивный поставщик", color: "bg-indigo-500" },
  ];

  const getTagColor = (tagName: string) => {
    const tag = availableTags.find(t => t.name === tagName);
    return tag?.color || "bg-gray-500";
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "active": { label: "Активен", className: "bg-green-100 text-green-700" },
      "on-hold": { label: "Приостановлен", className: "bg-yellow-100 text-yellow-700" },
      "inactive": { label: "Неактивен", className: "bg-gray-100 text-gray-700" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.categories.some(cat => 
      cat.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    (supplier.location && supplier.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка поставщиков...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Поставщики</h1>
          <p className="text-muted-foreground mt-1">
            База поставщиков материалов и управление заказами
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Bot className="h-4 w-4" />
            ИИ-заявка
          </Button>
          <SupplierDialog>
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
              <Plus className="h-4 w-4" />
              Добавить поставщика
            </Button>
          </SupplierDialog>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, категории материалов или локации..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список поставщиков */}
      <div className="grid gap-4">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground break-words">
                        {supplier.name}
                      </h3>
                      {getStatusBadge(supplier.status)}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {supplier.categories.map((category, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                      
                      {supplier.tags && supplier.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {supplier.tags.map((tag, index) => (
                            <Badge 
                              key={index} 
                              className={`text-xs text-white ${getTagColor(tag)}`}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        {supplier.location && (
                          <div className="flex items-center gap-1 break-words">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="overflow-wrap-anywhere">{supplier.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="font-medium">🏢 {supplier.entity_type}</span>
                        </div>
                        {supplier.contact_person && (
                          <div className="flex items-center gap-1 break-words">
                            <span className="overflow-wrap-anywhere">👤 {supplier.contact_person}</span>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1 break-words">
                            <Mail className="h-4 w-4 shrink-0" />
                            <span className="overflow-wrap-anywhere">{supplier.email}</span>
                          </div>
                        )}
                        {supplier.rating && supplier.rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
                            {supplier.rating}
                          </div>
                        )}
                      </div>
                      
                      {supplier.phones && supplier.phones.length > 0 && (
                        <div className="space-y-1">
                          {supplier.phones.map((phone, index) => (
                            <div key={index} className="flex flex-wrap items-center gap-2">
                              <ClickablePhone 
                                phone={phone.number} 
                                messenger={phone.messenger || undefined}
                                variant="text"
                                className="text-sm"
                              />
                              <Badge variant="outline" className="text-xs">
                                {phone.type === 'mobile' ? 'Мобильный' : 'Городской'}
                              </Badge>
                              {phone.messenger && !["none", ""].includes(phone.messenger) && (
                                <Badge variant="secondary" className="text-xs">
                                  {phone.messenger}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        {supplier.orders_count !== undefined && (
                          <span>Заказов выполнено: {supplier.orders_count}</span>
                        )}
                        <span> • Обновлено: {new Date(supplier.updated_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-1 sm:gap-2 shrink-0">
                    <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px] p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <SupplierDialog supplier={supplier}>
                      <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px] p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </SupplierDialog>
                    {supplier.phones && supplier.phones.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="min-w-[44px] min-h-[44px] p-0"
                        onClick={() => window.open(`tel:${supplier.phones[0].number}`)}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Поставщики не найдены
            </h3>
            <p className="text-muted-foreground mb-4">
              Попробуйте изменить параметры поиска или добавьте нового поставщика
            </p>
            <SupplierDialog>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить первого поставщика
              </Button>
            </SupplierDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}