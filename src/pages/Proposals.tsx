import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Download,
  Send,
  Bot
} from "lucide-react";

interface Proposal {
  id: string;
  client: string;
  project: string;
  amount: number;
  status: "draft" | "sent" | "viewed" | "approved" | "rejected";
  sentAt?: string;
  validUntil: string;
  estimateId?: string;
}

export default function Proposals() {
  const [searchTerm, setSearchTerm] = useState("");

  const proposals: Proposal[] = [
    {
      id: "KP-001",
      client: "Анна Петрова",
      project: "Ландшафтное проектирование участка",
      amount: 450000,
      status: "sent",
      sentAt: "2024-07-22",
      validUntil: "2024-08-22",
      estimateId: "EST-001"
    },
    {
      id: "KP-002", 
      client: "ООО Стройком",
      project: "Система автополива",
      amount: 280000,
      status: "draft",
      validUntil: "2024-08-25",
      estimateId: "EST-002"
    },
    {
      id: "KP-003",
      client: "Михаил Иванов", 
      project: "Укладка газона",
      amount: 150000,
      status: "approved",
      sentAt: "2024-07-20",
      validUntil: "2024-08-20",
      estimateId: "EST-003"
    }
  ];

  const getStatusBadge = (status: Proposal["status"]) => {
    const statusConfig = {
      "draft": { label: "Черновик", className: "bg-gray-100 text-gray-700" },
      "sent": { label: "Отправлено", className: "bg-blue-100 text-blue-700" },
      "viewed": { label: "Просмотрено", className: "bg-yellow-100 text-yellow-700" },
      "approved": { label: "Принято", className: "bg-green-100 text-green-700" },
      "rejected": { label: "Отклонено", className: "bg-red-100 text-red-700" }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const filteredProposals = proposals.filter(proposal =>
    proposal.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proposal.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proposal.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Коммерческие предложения</h1>
          <p className="text-muted-foreground mt-1">
            Управление КП и отправка клиентам
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Bot className="h-4 w-4" />
            ИИ-генерация
          </Button>
          <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
            <Plus className="h-4 w-4" />
            Создать КП
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
                placeholder="Поиск по клиенту, проекту или номеру КП..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список КП */}
      <div className="grid gap-4">
        {filteredProposals.map((proposal) => (
          <Card key={proposal.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {proposal.id}
                    </h3>
                    {getStatusBadge(proposal.status)}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {proposal.client}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {proposal.project}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {proposal.sentAt && (
                        <span>Отправлено: {new Date(proposal.sentAt).toLocaleDateString('ru-RU')}</span>
                      )}
                      <span>Действительно до: {new Date(proposal.validUntil).toLocaleDateString('ru-RU')}</span>
                      {proposal.estimateId && (
                        <span>Смета: {proposal.estimateId}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">
                      ₽{proposal.amount.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Сумма предложения
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
                      <Download className="h-4 w-4" />
                    </Button>
                    {proposal.status === "draft" && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProposals.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              КП не найдены
            </h3>
            <p className="text-muted-foreground mb-4">
              Попробуйте изменить параметры поиска или создайте новое коммерческое предложение
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать первое КП
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}