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
  Bot
} from "lucide-react";

interface Estimate {
  id: string;
  client: string;
  project: string;
  total: number;
  status: "draft" | "calculated" | "approved" | "rejected";
  createdAt: string;
  items: number;
}

export default function Estimates() {
  const [searchTerm, setSearchTerm] = useState("");

  const estimates: Estimate[] = [
    {
      id: "EST-001",
      client: "Анна Петрова",
      project: "Ландшафтное проектирование участка",
      total: 450000,
      status: "calculated",
      createdAt: "2024-07-20",
      items: 12
    },
    {
      id: "EST-002", 
      client: "ООО Стройком",
      project: "Система автополива",
      total: 280000,
      status: "draft",
      createdAt: "2024-07-22",
      items: 8
    },
    {
      id: "EST-003",
      client: "Михаил Иванов", 
      project: "Укладка газона",
      total: 150000,
      status: "approved",
      createdAt: "2024-07-18",
      items: 5
    }
  ];

  const getStatusBadge = (status: Estimate["status"]) => {
    const statusConfig = {
      "draft": { label: "Черновик", className: "bg-gray-100 text-gray-700" },
      "calculated": { label: "Рассчитана", className: "bg-blue-100 text-blue-700" },
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

  const filteredEstimates = estimates.filter(estimate =>
    estimate.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Button variant="outline" className="gap-2">
            <Bot className="h-4 w-4" />
            ИИ-расчет
          </Button>
          <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
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
      <div className="grid gap-4">
        {filteredEstimates.map((estimate) => (
          <Card key={estimate.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {estimate.id}
                    </h3>
                    {getStatusBadge(estimate.status)}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {estimate.client}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {estimate.project}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Создана: {new Date(estimate.createdAt).toLocaleDateString('ru-RU')}</span>
                      <span>Позиций: {estimate.items}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">
                      ₽{estimate.total.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Общая сумма
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать первую смету
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}