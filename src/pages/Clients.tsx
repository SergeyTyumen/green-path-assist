import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  Filter,
  Bot,
  Loader2
} from "lucide-react";
import { useClients, Client } from "@/hooks/useClients";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { clients, loading } = useClients();

  const getStatusConfig = (status: string) => {
    const configs = {
      "new": { label: "Новый", className: "bg-status-new text-white" },
      "in-progress": { label: "В работе", className: "bg-status-in-progress text-white" },
      "proposal-sent": { label: "КП отправлено", className: "bg-status-proposal-sent text-white" },
      "call-scheduled": { label: "Созвон", className: "bg-status-call-scheduled text-white" },
      "postponed": { label: "Отложено", className: "bg-status-postponed text-white" },
      "closed": { label: "Закрыт", className: "bg-status-closed text-white" }
    };
    return configs[status as keyof typeof configs] || configs.new;
  };

  const getServiceLabel = (service: string) => {
    const labels = {
      "landscape-design": "Ландшафтный дизайн",
      "auto-irrigation": "Автополив", 
      "lawn": "Газон",
      "planting": "Посадка растений",
      "hardscape": "Мощение",
      "maintenance": "Обслуживание"
    };
    return labels[service as keyof typeof labels] || service;
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone.includes(searchTerm) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка клиентов...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Клиенты и заявки</h1>
          <p className="text-muted-foreground mt-1">
            Управление клиентской базой и заявками
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Bot className="h-4 w-4" />
            ИИ-помощник
          </Button>
          <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
            <Plus className="h-4 w-4" />
            Добавить клиента
          </Button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <Card className="bg-gradient-to-r from-card to-card/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, телефону или email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                Все
              </Button>
              <Button 
                variant={statusFilter === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("new")}
              >
                Новые
              </Button>
              <Button 
                variant={statusFilter === "in-progress" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("in-progress")}
              >
                В работе
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Фильтры
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список клиентов */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="bg-gradient-to-br from-card to-card/50 hover:shadow-lg transition-all duration-200 border border-border/50">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {client.name}
                  </CardTitle>
                  <Badge className={getStatusConfig(client.status).className}>
                    {getStatusConfig(client.status).label}
                  </Badge>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>Бюджет: ₽{client.budget?.toLocaleString()}</div>
                  <div>Площадь: {client.project_area}м²</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
                 {client.last_contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Последний контакт: {new Date(client.last_contact).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Услуги:</div>
                <div className="flex flex-wrap gap-1">
                  {client.services.map((service) => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      {getServiceLabel(service)}
                    </Badge>
                  ))}
                </div>
              </div>

              {client.notes && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Заметки:</div>
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {client.notes}
                  </div>
                </div>
              )}

              {client.next_action && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Следующее действие:</div>
                  <div className="text-sm text-primary bg-primary/10 p-3 rounded-lg">
                    {client.next_action}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1">
                  Редактировать
                </Button>
                <Button size="sm" variant="outline">
                  Создать смету
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-muted-foreground">
              Клиенты не найдены. Попробуйте изменить критерии поиска.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}