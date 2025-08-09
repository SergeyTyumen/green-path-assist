import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  Filter,
  Bot,
  Loader2,
  Eye,
  Edit,
  FileText
} from "lucide-react";
import { useClients, Client } from "@/hooks/useClients";
import { ClientDetailDialog } from "@/components/ClientDetailDialog";
import { AddClientDialog } from "@/components/AddClientDialog";
import { ClickablePhone } from "@/components/ClickablePhone";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [advancedFilters, setAdvancedFilters] = useState({
    serviceFilter: "all",
    budgetMin: "",
    budgetMax: "",
    areaMin: "",
    areaMax: ""
  });

  const { clients, loading, createClient, updateClient } = useClients();

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
    
    // Дополнительные фильтры
    const matchesService = advancedFilters.serviceFilter === "all" || 
                          client.services.includes(advancedFilters.serviceFilter);
    const matchesBudget = (!advancedFilters.budgetMin || (client.budget && client.budget >= parseFloat(advancedFilters.budgetMin))) &&
                         (!advancedFilters.budgetMax || (client.budget && client.budget <= parseFloat(advancedFilters.budgetMax)));
    const matchesArea = (!advancedFilters.areaMin || (client.project_area && client.project_area >= parseFloat(advancedFilters.areaMin))) &&
                       (!advancedFilters.areaMax || (client.project_area && client.project_area <= parseFloat(advancedFilters.areaMax)));
    
    return matchesSearch && matchesStatus && matchesService && matchesBudget && matchesArea;
  });

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setShowDetailDialog(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowAddDialog(true);
  };

  const handleSaveClient = async (clientData: Partial<Client>) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, clientData);
        toast({
          title: "Успешно",
          description: "Данные клиента обновлены"
        });
      } else {
        // Валидация обязательных полей для создания
        if (!clientData.name || !clientData.phone || !clientData.status) {
          toast({
            title: "Ошибка",
            description: "Заполните обязательные поля",
            variant: "destructive"
          });
          return;
        }
        await createClient(clientData as Omit<Client, "id" | "user_id" | "created_at" | "updated_at">);
        toast({
          title: "Успешно",
          description: "Клиент добавлен"
        });
      }
      setEditingClient(null);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить данные клиента",
        variant: "destructive"
      });
    }
  };

  const handleCreateEstimate = (client: Client) => {
    // Переход на страницу создания сметы с предзаполненными данными клиента
    navigate(`/estimates?client=${client.id}`);
  };

  const handleCallClient = (client: Client) => {
    window.open(`tel:${client.phone}`);
  };

  const handleAIAssistant = () => {
    navigate('/ai-consultant');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка клиентов...</span>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Клиенты и заявки</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Управление клиентской базой и заявками
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" className="gap-2 min-h-[44px]" onClick={handleAIAssistant}>
            <Bot className="h-4 w-4" />
            <span className="sm:inline">ИИ-помощник</span>
          </Button>
          <Button 
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2 min-h-[44px]"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="sm:inline">Добавить клиента</span>
          </Button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <Card className="bg-gradient-to-r from-card to-card/50">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, телефону или email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 min-h-[44px]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="min-h-[40px] text-xs sm:text-sm"
              >
                Все
              </Button>
              <Button 
                variant={statusFilter === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("new")}
                className="min-h-[40px] text-xs sm:text-sm"
              >
                Новые
              </Button>
              <Button 
                variant={statusFilter === "in-progress" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("in-progress")}
                className="min-h-[40px] text-xs sm:text-sm"
              >
                В работе
              </Button>
              <Dialog open={showFiltersDialog} onOpenChange={setShowFiltersDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="min-h-[40px] text-xs sm:text-sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Фильтры
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Расширенные фильтры</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Услуга</Label>
                      <Select 
                        value={advancedFilters.serviceFilter} 
                        onValueChange={(value) => setAdvancedFilters({...advancedFilters, serviceFilter: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все услуги</SelectItem>
                          <SelectItem value="landscape-design">Ландшафтный дизайн</SelectItem>
                          <SelectItem value="auto-irrigation">Автополив</SelectItem>
                          <SelectItem value="lawn">Газон</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Бюджет от</Label>
                        <Input 
                          type="number" 
                          value={advancedFilters.budgetMin}
                          onChange={(e) => setAdvancedFilters({...advancedFilters, budgetMin: e.target.value})}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Бюджет до</Label>
                        <Input 
                          type="number" 
                          value={advancedFilters.budgetMax}
                          onChange={(e) => setAdvancedFilters({...advancedFilters, budgetMax: e.target.value})}
                          placeholder="∞"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={() => {
                        setAdvancedFilters({serviceFilter: "all", budgetMin: "", budgetMax: "", areaMin: "", areaMax: ""});
                        setShowFiltersDialog(false);
                      }}>
                        Сбросить
                      </Button>
                      <Button onClick={() => setShowFiltersDialog(false)}>
                        Применить
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список клиентов */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="bg-gradient-to-br from-card to-card/50 hover:shadow-lg transition-all duration-200 border border-border/50 overflow-hidden">
            <CardHeader className="pb-3 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg font-semibold text-foreground truncate">
                    {client.name}
                  </CardTitle>
                  <Badge className={getStatusConfig(client.status).className}>
                    {getStatusConfig(client.status).label}
                  </Badge>
                </div>
                <div className="text-left sm:text-right text-sm text-muted-foreground shrink-0 space-y-1">
                  <div>Бюджет: ₽{client.budget?.toLocaleString()}</div>
                  <div>Площадь: {client.project_area}м²</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="space-y-2">
                <ClickablePhone 
                  phone={client.phone} 
                  variant="text" 
                  className="text-sm text-muted-foreground min-h-[44px] flex items-center"
                />
                {client.email && (
                  <div className="flex items-center gap-2 text-sm min-h-[32px]">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-sm min-h-[32px]">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
                 {client.last_contact && (
                  <div className="flex items-center gap-2 text-sm min-h-[32px]">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">Последний контакт: {new Date(client.last_contact).toLocaleDateString()}</span>
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

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => handleViewClient(client)} className="min-h-[40px] justify-start">
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="sm:inline">Просмотр</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleEditClient(client)} className="min-h-[40px] justify-start">
                  <Edit className="h-4 w-4 mr-1" />
                  <span className="sm:inline">Редактировать</span>
                </Button>
                <Button size="sm" onClick={() => handleCreateEstimate(client)} className="min-h-[40px] justify-start">
                  <FileText className="h-4 w-4 mr-1" />
                  <span className="sm:inline">Создать смету</span>
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

      {/* Диалоги */}
      <ClientDetailDialog
        client={selectedClient}
        isOpen={showDetailDialog}
        onClose={() => {
          setShowDetailDialog(false);
          setSelectedClient(null);
        }}
        onEdit={handleEditClient}
        onClientUpdate={(updatedClient) => {
          // Обновляем данные клиента в хуке
          updateClient(updatedClient.id, {
            name: updatedClient.name,
            phone: updatedClient.phone,
            email: updatedClient.email,
            address: updatedClient.address,
            services: updatedClient.services,
            status: updatedClient.status,
            notes: updatedClient.notes,
            project_area: updatedClient.project_area,
            budget: updatedClient.budget,
            project_description: updatedClient.project_description,
            next_action: updatedClient.next_action,
            last_contact: updatedClient.last_contact
          });
          // Обновляем selectedClient с правильным типом
          const updatedSelectedClient = clients.find(c => c.id === updatedClient.id);
          if (updatedSelectedClient) {
            setSelectedClient({...updatedSelectedClient, ...updatedClient});
          }
        }}
      />

      <AddClientDialog
        isOpen={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
        client={editingClient}
      />
    </div>
  );
}