import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Phone,
  MapPin,
  Star
} from "lucide-react";

interface Contractor {
  id: string;
  name: string;
  specializations: string[];
  location: string;
  phone: string;
  rating: number;
  projectsCount: number;
  status: "active" | "busy" | "inactive";
  lastProject?: string;
}

export default function Contractors() {
  const [searchTerm, setSearchTerm] = useState("");

  const contractors: Contractor[] = [
    {
      id: "CTR-001",
      name: "ИП Смирнов А.В.",
      specializations: ["Ландшафтное проектирование", "Автополив"],
      location: "Москва",
      phone: "+7 (999) 123-45-67",
      rating: 4.8,
      projectsCount: 23,
      status: "active",
      lastProject: "2024-07-20"
    },
    {
      id: "CTR-002", 
      name: "ООО ГазонПро",
      specializations: ["Укладка газона", "Уход за растениями"],
      location: "Московская область",
      phone: "+7 (999) 234-56-78",
      rating: 4.5,
      projectsCount: 15,
      status: "busy",
      lastProject: "2024-07-18"
    },
    {
      id: "CTR-003",
      name: "Садовые мастера",
      specializations: ["Посадка деревьев", "Дренаж", "Освещение"],
      location: "Москва",
      phone: "+7 (999) 345-67-89",
      rating: 4.9,
      projectsCount: 31,
      status: "active"
    }
  ];

  const getStatusBadge = (status: Contractor["status"]) => {
    const statusConfig = {
      "active": { label: "Доступен", className: "bg-green-100 text-green-700" },
      "busy": { label: "Занят", className: "bg-yellow-100 text-yellow-700" },
      "inactive": { label: "Неактивен", className: "bg-gray-100 text-gray-700" }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const filteredContractors = contractors.filter(contractor =>
    contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.specializations.some(spec => 
      spec.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    contractor.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Подрядчики</h1>
          <p className="text-muted-foreground mt-1">
            База подрядчиков и управление сотрудничеством
          </p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
          <Plus className="h-4 w-4" />
          Добавить подрядчика
        </Button>
      </div>

      {/* Поиск и фильтры */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, специализации или локации..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список подрядчиков */}
      <div className="grid gap-4">
        {filteredContractors.map((contractor) => (
          <Card key={contractor.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {contractor.name}
                    </h3>
                    {getStatusBadge(contractor.status)}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {contractor.specializations.map((spec, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {contractor.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {contractor.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {contractor.rating}
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Проектов выполнено: {contractor.projectsCount}
                      {contractor.lastProject && (
                        <span> • Последний проект: {new Date(contractor.lastProject).toLocaleDateString('ru-RU')}</span>
                      )}
                    </div>
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
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredContractors.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Подрядчики не найдены
            </h3>
            <p className="text-muted-foreground mb-4">
              Попробуйте изменить параметры поиска или добавьте нового подрядчика
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить первого подрядчика
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}