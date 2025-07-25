import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Archive as ArchiveIcon,
  Search, 
  Eye, 
  Download,
  Calendar,
  DollarSign,
  User
} from "lucide-react";

interface ArchivedProject {
  id: string;
  name: string;
  client: string;
  contractor: string;
  totalAmount: number;
  startDate: string;
  completionDate: string;
  status: "completed" | "cancelled" | "on-hold";
  category: "landscaping" | "irrigation" | "lawn" | "lighting" | "drainage";
  estimateId?: string;
  proposalId?: string;
}

export default function Archive() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const archivedProjects: ArchivedProject[] = [
    {
      id: "PRJ-001",
      name: "Ландшафтный дизайн коттеджа",
      client: "Семья Ивановых",
      contractor: "ИП Смирнов А.В.",
      totalAmount: 850000,
      startDate: "2024-05-15",
      completionDate: "2024-07-10",
      status: "completed",
      category: "landscaping",
      estimateId: "EST-001",
      proposalId: "KP-001"
    },
    {
      id: "PRJ-002", 
      name: "Система автополива дачного участка",
      client: "Петр Сидоров",
      contractor: "АквaСистемы",
      totalAmount: 320000,
      startDate: "2024-06-01",
      completionDate: "2024-06-25",
      status: "completed",
      category: "irrigation",
      estimateId: "EST-002",
      proposalId: "KP-002"
    },
    {
      id: "PRJ-003",
      name: "Укладка газона на участке",
      client: "ООО Офис-Центр",
      contractor: "ООО ГазонПро",
      totalAmount: 180000,
      startDate: "2024-04-20",
      completionDate: "",
      status: "cancelled",
      category: "lawn"
    },
    {
      id: "PRJ-004",
      name: "Садовое освещение",
      client: "Анна Федорова",
      contractor: "Садовые мастера",
      totalAmount: 450000,
      startDate: "2024-03-10",
      completionDate: "2024-04-15",
      status: "completed",
      category: "lighting",
      estimateId: "EST-003"
    }
  ];

  const getStatusBadge = (status: ArchivedProject["status"]) => {
    const statusConfig = {
      "completed": { label: "Завершен", className: "bg-green-100 text-green-700" },
      "cancelled": { label: "Отменен", className: "bg-red-100 text-red-700" },
      "on-hold": { label: "Приостановлен", className: "bg-yellow-100 text-yellow-700" }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getCategoryBadge = (category: ArchivedProject["category"]) => {
    const categoryConfig = {
      "landscaping": { label: "Ландшафт", className: "bg-green-50 text-green-600" },
      "irrigation": { label: "Автополив", className: "bg-blue-50 text-blue-600" },
      "lawn": { label: "Газон", className: "bg-emerald-50 text-emerald-600" },
      "lighting": { label: "Освещение", className: "bg-yellow-50 text-yellow-600" },
      "drainage": { label: "Дренаж", className: "bg-gray-50 text-gray-600" }
    };
    
    const config = categoryConfig[category];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const filteredProjects = archivedProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.contractor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || project.status === selectedStatus;
    const matchesCategory = selectedCategory === "all" || project.category === selectedCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalCompleted = archivedProjects.filter(p => p.status === "completed").length;
  const totalRevenue = archivedProjects
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Архив проектов</h1>
          <p className="text-muted-foreground mt-1">
            Завершенные и отмененные проекты
          </p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArchiveIcon className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold text-foreground">{totalCompleted}</div>
                <div className="text-sm text-muted-foreground">Завершено проектов</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-foreground">
                  ₽{totalRevenue.toLocaleString('ru-RU')}
                </div>
                <div className="text-sm text-muted-foreground">Общий оборот</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {totalCompleted > 0 ? Math.round(totalRevenue / totalCompleted).toLocaleString('ru-RU') : 0}
                </div>
                <div className="text-sm text-muted-foreground">Средний чек (₽)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Поиск и фильтры */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, клиенту или подрядчику..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="completed">Завершен</SelectItem>
                <SelectItem value="cancelled">Отменен</SelectItem>
                <SelectItem value="on-hold">Приостановлен</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                <SelectItem value="landscaping">Ландшафт</SelectItem>
                <SelectItem value="irrigation">Автополив</SelectItem>
                <SelectItem value="lawn">Газон</SelectItem>
                <SelectItem value="lighting">Освещение</SelectItem>
                <SelectItem value="drainage">Дренаж</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Список проектов */}
      <div className="grid gap-4">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {project.name}
                    </h3>
                    {getStatusBadge(project.status)}
                    {getCategoryBadge(project.category)}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{project.client}</span>
                      </div>
                      <span className="text-muted-foreground">• {project.contractor}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Начат: {new Date(project.startDate).toLocaleDateString('ru-RU')}
                      </div>
                      {project.completionDate && (
                        <span>Завершен: {new Date(project.completionDate).toLocaleDateString('ru-RU')}</span>
                      )}
                      {project.estimateId && <span>Смета: {project.estimateId}</span>}
                      {project.proposalId && <span>КП: {project.proposalId}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">
                      ₽{project.totalAmount.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Сумма проекта
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <ArchiveIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Проекты не найдены
            </h3>
            <p className="text-muted-foreground">
              Попробуйте изменить параметры поиска
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}