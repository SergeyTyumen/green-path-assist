import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building, Database, Globe, MapPin, Plus, X } from "lucide-react";
import { BaseAISettings } from "./BaseAISettings";

export default function TechnicalSpecialistSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    region: "russia",
    workTypes: ["concrete", "masonry", "roofing", "insulation", "foundation"],
    normativeSources: [
      { id: "1", name: "СНИП 3.03.01-87", description: "Несущие и ограждающие конструкции", enabled: true },
      { id: "2", name: "ГОСТ 31108-2003", description: "Цементы общестроительные", enabled: true },
      { id: "3", name: "СНИП 2.02.01-83", description: "Основания зданий и сооружений", enabled: true },
    ],
    customSources: [] as Array<{id: string, name: string, url: string, description: string}>,
    qualityRequirements: "standard",
    includeLocalCodes: true,
  });

  const [newSource, setNewSource] = useState({ name: "", url: "", description: "" });

  const regions = [
    { value: "russia", label: "Россия (СНИП, ГОСТ)" },
    { value: "moscow", label: "Москва и МО" },
    { value: "spb", label: "Санкт-Петербург и ЛО" },
    { value: "sochi", label: "Сочи и Краснодарский край" },
    { value: "kazan", label: "Казань и Татарстан" },
  ];

  const workTypeOptions = [
    { value: "concrete", label: "Бетонные работы" },
    { value: "masonry", label: "Каменные работы" },
    { value: "roofing", label: "Кровельные работы" },
    { value: "insulation", label: "Теплоизоляция" },
    { value: "foundation", label: "Фундаментные работы" },
    { value: "waterproofing", label: "Гидроизоляция" },
    { value: "finishing", label: "Отделочные работы" },
    { value: "electrical", label: "Электромонтажные работы" },
    { value: "plumbing", label: "Сантехнические работы" },
  ];

  const addCustomSource = () => {
    if (newSource.name && newSource.url) {
      const source = {
        id: Date.now().toString(),
        ...newSource
      };
      setSettings(prev => ({
        ...prev,
        customSources: [...prev.customSources, source]
      }));
      setNewSource({ name: "", url: "", description: "" });
      toast({
        title: "Источник добавлен",
        description: `Добавлен источник: ${source.name}`,
      });
    }
  };

  const removeCustomSource = (id: string) => {
    setSettings(prev => ({
      ...prev,
      customSources: prev.customSources.filter(s => s.id !== id)
    }));
  };

  const toggleNormativeSource = (id: string) => {
    setSettings(prev => ({
      ...prev,
      normativeSources: prev.normativeSources.map(source =>
        source.id === id ? { ...source, enabled: !source.enabled } : source
      )
    }));
  };

  const toggleWorkType = (workType: string) => {
    setSettings(prev => ({
      ...prev,
      workTypes: prev.workTypes.includes(workType)
        ? prev.workTypes.filter(t => t !== workType)
        : [...prev.workTypes, workType]
    }));
  };

  const saveSettings = () => {
    localStorage.setItem('technical-specialist-settings', JSON.stringify(settings));
    toast({
      title: "Настройки сохранены",
      description: "Настройки AI-Технолога успешно сохранены",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Настройки AI-Технолога</h2>
          <p className="text-muted-foreground">
            Конфигурация нормативной базы и региональных требований
          </p>
        </div>
      </div>

      {/* Региональные настройки */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Региональные настройки
          </CardTitle>
          <CardDescription>
            Выберите регион для применения соответствующих строительных норм
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Регион работы</Label>
            <Select value={settings.region} onValueChange={(value) => setSettings(prev => ({ ...prev, region: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Включать местные нормы</Label>
              <p className="text-sm text-muted-foreground">
                Учитывать региональные строительные нормы и требования
              </p>
            </div>
            <Switch
              checked={settings.includeLocalCodes}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, includeLocalCodes: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Типы работ */}
      <Card>
        <CardHeader>
          <CardTitle>Специализация по видам работ</CardTitle>
          <CardDescription>
            Выберите виды работ, для которых будут применяться нормативы
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {workTypeOptions.map((workType) => (
              <div
                key={workType.value}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  settings.workTypes.includes(workType.value)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => toggleWorkType(workType.value)}
              >
                <div className="text-sm font-medium">{workType.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Нормативные источники */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Нормативная база
          </CardTitle>
          <CardDescription>
            Управление источниками нормативных документов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium">Основные нормативы</h4>
            {settings.normativeSources.map((source) => (
              <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{source.name}</div>
                  <div className="text-sm text-muted-foreground">{source.description}</div>
                </div>
                <Switch
                  checked={source.enabled}
                  onCheckedChange={() => toggleNormativeSource(source.id)}
                />
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Дополнительные источники</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Название источника</Label>
                <Input
                  value={newSource.name}
                  onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ГОСТ 12345-2023"
                />
              </div>
              <div className="space-y-2">
                <Label>URL или API</Label>
                <Input
                  value={newSource.url}
                  onChange={(e) => setNewSource(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://docs.cntd.ru/..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Input
                value={newSource.description}
                onChange={(e) => setNewSource(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание применения норматива"
              />
            </div>
            <Button onClick={addCustomSource} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Добавить источник
            </Button>
          </div>

          {settings.customSources.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-sm">Добавленные источники:</h5>
              {settings.customSources.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <span className="font-medium">{source.name}</span>
                    {source.description && (
                      <span className="text-sm text-muted-foreground ml-2">- {source.description}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomSource(source.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Базовые настройки AI */}
      <BaseAISettings />

      <div className="flex justify-end">
        <Button onClick={saveSettings}>
          Сохранить настройки
        </Button>
      </div>
    </div>
  );
}