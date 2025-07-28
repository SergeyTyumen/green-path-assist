import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Truck,
  AlertTriangle,
  Loader2,
  Settings,
  Clock
} from "lucide-react";
import { useMaterials, Material } from "@/hooks/useMaterials";
import { useServices, Service } from "@/hooks/useServices";
import { MaterialDialog } from "@/components/MaterialDialog";
import { ServiceDialog } from "@/components/ServiceDialog";

export default function Nomenclature() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { materials, loading: materialsLoading } = useMaterials();
  const { services, loading: servicesLoading } = useServices();

  const materialCategories = ["all", "Растения", "Камень", "Песок", "Автополив", "Удобрения"];
  const serviceCategories = ["all", "Проектирование", "Земляные работы", "Посадка", "Укладка", "Монтаж", "Обслуживание"];

  const getStatusBadge = (material: Material) => {
    let status: "in-stock" | "low-stock" | "out-of-stock";
    if (material.stock === 0) {
      status = "out-of-stock";
    } else if (material.stock <= material.min_stock) {
      status = "low-stock";
    } else {
      status = "in-stock";
    }

    const statusConfig = {
      "in-stock": { label: "В наличии", className: "bg-green-100 text-green-700" },
      "low-stock": { label: "Мало", className: "bg-yellow-100 text-yellow-700" },
      "out-of-stock": { label: "Нет в наличии", className: "bg-red-100 text-red-700" }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (material.supplier && material.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || material.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (materialsLoading || servicesLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка номенклатуры...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Номенклатура</h1>
          <p className="text-muted-foreground mt-1">
            Материалы и услуги для составления смет
          </p>
        </div>
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="materials" className="gap-2">
            <Package className="h-4 w-4" />
            Материалы
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Settings className="h-4 w-4" />
            Услуги
          </TabsTrigger>
        </TabsList>

        {/* Материалы */}
        <TabsContent value="materials" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Материалы</h2>
              <p className="text-sm text-muted-foreground">Управление складскими остатками</p>
            </div>
            <MaterialDialog>
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
                <Plus className="h-4 w-4" />
                Добавить материал
              </Button>
            </MaterialDialog>
          </div>

          {/* Поиск и фильтры для материалов */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию материала или поставщику..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Категория" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {materialCategories.slice(1).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Статистика остатков */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {materials.filter(m => m.stock > m.min_stock).length}
                    </div>
                    <div className="text-sm text-muted-foreground">В наличии</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {materials.filter(m => m.stock > 0 && m.stock <= m.min_stock).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Заканчивается</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {materials.filter(m => m.stock === 0).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Нет в наличии</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Список материалов */}
          <div className="grid gap-4">
            {filteredMaterials.map((material) => (
              <Card key={material.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {material.name}
                        </h3>
                        {getStatusBadge(material)}
                        <Badge variant="outline" className="text-xs">
                          {material.category}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Цена: ₽{material.price.toLocaleString('ru-RU')} за {material.unit}</span>
                          <span>Остаток: {material.stock} {material.unit}</span>
                          <span>Мин. остаток: {material.min_stock} {material.unit}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {material.supplier || 'Не указан'}
                          </div>
                          <span>Обновлено: {new Date(material.last_updated).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {(material.stock === 0 || material.stock <= material.min_stock) ? (
                        <Button variant="outline" size="sm" className="gap-2">
                          <Truck className="h-4 w-4" />
                          Заказать
                        </Button>
                      ) : null}

                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <MaterialDialog material={material}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </MaterialDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMaterials.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Материалы не найдены
                </h3>
                <p className="text-muted-foreground mb-4">
                  Попробуйте изменить параметры поиска или добавьте новый материал
                </p>
                <MaterialDialog>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить первый материал
                  </Button>
                </MaterialDialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Услуги */}
        <TabsContent value="services" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Услуги</h2>
              <p className="text-sm text-muted-foreground">Каталог предоставляемых услуг</p>
            </div>
            <ServiceDialog>
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
                <Plus className="h-4 w-4" />
                Добавить услугу
              </Button>
            </ServiceDialog>
          </div>

          {/* Поиск и фильтры для услуг */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию услуги или описанию..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Категория" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {serviceCategories.slice(1).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Список услуг */}
          <div className="grid gap-4">
            {filteredServices.map((service) => (
              <Card key={service.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {service.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {service.category}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Цена: ₽{service.price.toLocaleString('ru-RU')} за {service.unit}</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{service.duration_hours}ч</span>
                          </div>
                        </div>
                        
                        {service.description && (
                          <p className="text-xs text-muted-foreground">
                            {service.description}
                          </p>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          <span>Обновлено: {new Date(service.updated_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <ServiceDialog service={service}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </ServiceDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Услуги не найдены
                </h3>
                <p className="text-muted-foreground mb-4">
                  Попробуйте изменить параметры поиска или добавьте новую услугу
                </p>
                <ServiceDialog>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить первую услугу
                  </Button>
                </ServiceDialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}