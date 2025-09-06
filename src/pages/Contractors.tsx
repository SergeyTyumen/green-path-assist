import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wrench, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Phone,
  MapPin,
  Star,
  Calendar,
  Award
} from "lucide-react";
import { useContractors } from "@/hooks/useContractors";
import { ContractorDialog } from "@/components/ContractorDialog";
import { ClickablePhone } from "@/components/ClickablePhone";

export default function Contractors() {
  const [searchTerm, setSearchTerm] = useState("");
  const { contractors, loading } = useContractors();

  const getStatusBadge = (verified: boolean) => {
    if (verified) {
      return (
        <Badge className="bg-green-100 text-green-700">
          Верифицирован
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        Не верифицирован
      </Badge>
    );
  };

  const filteredContractors = contractors.filter(contractor =>
    contractor.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.specialization.some(spec => 
      spec.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    (contractor.description && contractor.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Подрядчики</h1>
            <p className="text-muted-foreground mt-1">
              База подрядчиков и управление сотрудничеством
            </p>
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Подрядчики</h1>
          <p className="text-muted-foreground mt-1">
            База подрядчиков и управление сотрудничеством
          </p>
        </div>
        <ContractorDialog>
          <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
            <Plus className="h-4 w-4" />
            Добавить подрядчика
          </Button>
        </ContractorDialog>
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
          <Card 
            key={contractor.id} 
            className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.01]"
            onClick={() => {
              // Здесь будет логика открытия детального просмотра
              console.log('Просмотр подрядчика:', contractor.id);
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {contractor.company_name}
                    </h3>
                    {getStatusBadge(contractor.verified || false)}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {contractor.specialization.map((spec, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                    
                    {contractor.description && (
                      <p className="text-sm text-muted-foreground">
                        {contractor.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {contractor.phone && (
                        <div 
                          className="text-sm text-muted-foreground cursor-pointer hover:text-primary underline flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${contractor.phone}`);
                          }}
                        >
                          <Phone className="h-4 w-4" />
                          {contractor.phone}
                        </div>
                      )}
                      {contractor.rating && contractor.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {contractor.rating}
                        </div>
                      )}
                      {contractor.experience_years && contractor.experience_years > 0 && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {contractor.experience_years} лет опыта
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {contractor.completed_projects && contractor.completed_projects > 0 && (
                        <>
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            Проектов выполнено: {contractor.completed_projects}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <ContractorDialog contractor={contractor}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </ContractorDialog>
                  {contractor.phone && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`tel:${contractor.phone}`);
                      }}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
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
            <ContractorDialog>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить первого подрядчика
              </Button>
            </ContractorDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}