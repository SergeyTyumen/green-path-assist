import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Copy,
  Bot,
  Trash2,
  Brain
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEstimates, Estimate } from "@/hooks/useEstimates";
import { EstimateDialog } from "@/components/EstimateDialog";
import { useClients } from "@/hooks/useClients";
import { toast } from "sonner";

export default function Estimates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { estimates, loading, createEstimate, updateEstimate, deleteEstimate } = useEstimates();
  const { clients } = useClients();

  const getStatusBadge = (status: Estimate["status"]) => {
    const statusConfig = {
      "draft": { label: "Черновик", className: "bg-gray-100 text-gray-700" },
      "sent": { label: "Отправлена", className: "bg-blue-100 text-blue-700" },
      "approved": { label: "Утверждена", className: "bg-green-100 text-green-700" },
      "rejected": { label: "Отклонена", className: "bg-red-100 text-red-700" }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleCreateEstimate = () => {
    setSelectedEstimate(undefined);
    setIsDialogOpen(true);
  };

  const handleEditEstimate = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setIsDialogOpen(true);
  };

  const handleSaveEstimate = async (estimateData: any, items: any[]) => {
    try {
      if (selectedEstimate) {
        // Обновление сметы
        await updateEstimate(selectedEstimate.id, estimateData);
        toast.success("Смета успешно обновлена");
      } else {
        // Создание новой сметы
        const newEstimate = await createEstimate(estimateData);
        if (newEstimate && items.length > 0) {
          // Здесь можно добавить логику создания элементов сметы
          // Пока что просто показываем успешное сообщение
        }
        toast.success("Смета успешно создана");
      }
    } catch (error) {
      toast.error("Произошла ошибка при сохранении сметы");
    }
  };

  const handleDeleteEstimate = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту смету?")) {
      await deleteEstimate(id);
    }
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return "Без клиента";
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Неизвестный клиент";
  };

  const filteredEstimates = estimates.filter(estimate => {
    const clientName = getClientName(estimate.client_id);
    return clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           estimate.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           estimate.id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Сметы</h1>
          <p className="text-muted-foreground mt-1">
            Управление сметами и расчетами проектов
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => navigate('/ai-estimator')}
          >
            <Brain className="h-4 w-4" />
            ИИ-расчет
          </Button>
          <Button 
            onClick={handleCreateEstimate}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2"
          >
            <Plus className="h-4 w-4" />
            Создать смету
          </Button>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по клиенту, проекту или номеру сметы..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список смет */}
      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="grid gap-4">
          {filteredEstimates.map((estimate) => (
            <Card key={estimate.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {estimate.title}
                      </h3>
                      {getStatusBadge(estimate.status)}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {getClientName(estimate.client_id)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Создана: {new Date(estimate.created_at).toLocaleDateString('ru-RU')}</span>
                        <span>Позиций: {estimate.items?.length || 0}</span>
                        {estimate.valid_until && (
                          <span>Действительна до: {new Date(estimate.valid_until).toLocaleDateString('ru-RU')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground">
                        {estimate.total_amount.toLocaleString('ru-RU')}₽
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Общая сумма
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditEstimate(estimate)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteEstimate(estimate.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredEstimates.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Сметы не найдены
            </h3>
            <p className="text-muted-foreground mb-4">
              Попробуйте изменить параметры поиска или создайте новую смету
            </p>
            <Button onClick={handleCreateEstimate}>
              <Plus className="h-4 w-4 mr-2" />
              Создать первую смету
            </Button>
          </CardContent>
        </Card>
      )}

      <EstimateDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        estimate={selectedEstimate}
        onSave={handleSaveEstimate}
      />
    </div>
  );
}