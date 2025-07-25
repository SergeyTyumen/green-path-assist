import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Truck,
  AlertTriangle
} from "lucide-react";

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  minStock: number;
  supplier: string;
  lastUpdated: string;
  status: "in-stock" | "low-stock" | "out-of-stock";
}

export default function Materials() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const materials: Material[] = [
    {
      id: "MAT-001",
      name: "Газонная трава премиум",
      category: "Растения",
      unit: "кг",
      price: 450,
      stock: 25,
      minStock: 10,
      supplier: "Зеленый мир",
      lastUpdated: "2024-07-22",
      status: "in-stock"
    },
    {
      id: "MAT-002", 
      name: "Щебень гранитный 20-40мм",
      category: "Камень",
      unit: "м³",
      price: 2800,
      stock: 3,
      minStock: 5,
      supplier: "СтройМатериалы+",
      lastUpdated: "2024-07-20",
      status: "low-stock"
    },
    {
      id: "MAT-003",
      name: "Дренажная труба ПВХ 110мм",
      category: "Автополив",
      unit: "м",
      price: 320,
      stock: 0,
      minStock: 20,
      supplier: "АквaСистемы",
      lastUpdated: "2024-07-18",
      status: "out-of-stock"
    },
    {
      id: "MAT-004",
      name: "Песок речной крупнозернистый",
      category: "Песок",
      unit: "м³",
      price: 1200,
      stock: 15,
      minStock: 8,
      supplier: "СтройМатериалы+",
      lastUpdated: "2024-07-21",
      status: "in-stock"
    }
  ];

  const categories = ["all", "Растения", "Камень", "Песок", "Автополив", "Удобрения"];

  const getStatusBadge = (status: Material["status"]) => {
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
                         material.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || material.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Материалы</h1>
          <p className="text-muted-foreground mt-1">
            Номенклатура материалов и управление складскими остатками
          </p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
          <Plus className="h-4 w-4" />
          Добавить материал
        </Button>
      </div>

      {/* Поиск и фильтры */}
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
                {categories.slice(1).map((category) => (
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
                  {materials.filter(m => m.status === "in-stock").length}
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
                  {materials.filter(m => m.status === "low-stock").length}
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
                  {materials.filter(m => m.status === "out-of-stock").length}
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
                    {getStatusBadge(material.status)}
                    <Badge variant="outline" className="text-xs">
                      {material.category}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Цена: ₽{material.price.toLocaleString('ru-RU')} за {material.unit}</span>
                      <span>Остаток: {material.stock} {material.unit}</span>
                      <span>Мин. остаток: {material.minStock} {material.unit}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {material.supplier}
                      </div>
                      <span>Обновлено: {new Date(material.lastUpdated).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {material.status === "low-stock" || material.status === "out-of-stock" ? (
                    <Button variant="outline" size="sm" className="gap-2">
                      <Truck className="h-4 w-4" />
                      Заказать
                    </Button>
                  ) : null}

                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить первый материал
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}