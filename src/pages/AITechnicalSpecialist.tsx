import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, User, MapPin, Building, Calculator, ArrowRight, Save, FolderOpen, Settings } from "lucide-react";
import VoiceRecorder from "@/components/VoiceRecorder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TechnicalSpecialistSettings from "@/components/ai-settings/TechnicalSpecialistSettings";

interface TechnicalSpecification {
  id: string;
  object_description: string;
  client_name: string;
  object_address: string;
  work_scope: string;
  materials_spec: string;
  normative_references: string[];
  recommendations: string;
  estimated_area: number;
  estimated_duration: string;
  created_at: string;
}

export default function AITechnicalSpecialist() {
  const [loading, setLoading] = useState(false);
  const [objectDescription, setObjectDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [objectAddress, setObjectAddress] = useState("");
  const [specification, setSpecification] = useState<TechnicalSpecification | null>(null);
  const [savedDescriptions, setSavedDescriptions] = useState<Array<{id: string, name: string, data: any}>>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string>("");
  const { toast } = useToast();

  // Load saved descriptions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('saved-descriptions');
    if (saved) {
      setSavedDescriptions(JSON.parse(saved));
    }
  }, []);

  const generateSpecification = async () => {
    if (!objectDescription.trim()) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Пожалуйста, опишите объект и требуемые работы",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-technical-specialist', {
        body: {
          object_description: objectDescription,
          client_name: clientName,
          object_address: objectAddress,
        },
      });

      if (error) throw error;

      setSpecification(data.specification);
      toast({
        title: "Техническое задание сформировано",
        description: "ТЗ успешно создано на основе описания объекта",
      });
    } catch (error) {
      console.error('Error generating specification:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось сформировать техническое задание",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveDescription = () => {
    const name = prompt("Введите название для сохранения:");
    if (name && (objectDescription.trim() || clientName.trim() || objectAddress.trim())) {
      const newSaved = {
        id: Date.now().toString(),
        name,
        data: { objectDescription, clientName, objectAddress, savedAt: new Date().toISOString() }
      };
      const updated = [...savedDescriptions, newSaved];
      setSavedDescriptions(updated);
      localStorage.setItem('saved-descriptions', JSON.stringify(updated));
      toast({
        title: "Описание сохранено",
        description: `Сохранено как "${name}"`,
      });
    }
  };

  const loadDescription = (id: string) => {
    const saved = savedDescriptions.find(s => s.id === id);
    if (saved) {
      setObjectDescription(saved.data.objectDescription || "");
      setClientName(saved.data.clientName || "");
      setObjectAddress(saved.data.objectAddress || "");
      setSelectedSavedId(id);
      toast({
        title: "Описание загружено",
        description: `Загружено: "${saved.name}"`,
      });
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setObjectDescription(prev => prev ? `${prev}\n\n${text}` : text);
  };

  const transferToEstimator = () => {
    if (specification) {
      // Переход к AI-сметчику с данными ТЗ
      const searchParams = new URLSearchParams({
        ts_id: specification.id,
        work_scope: specification.work_scope,
        materials: specification.materials_spec,
        area: specification.estimated_area.toString(),
      });
      window.location.href = `/ai-estimator?${searchParams.toString()}`;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI-Технолог</h1>
          <p className="text-muted-foreground">
            Формирование технического задания на основе описания объекта
          </p>
        </div>
      </div>

      <Tabs defaultValue="workspace" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="workspace">Рабочая область</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>
        
        <TabsContent value="workspace" className="space-y-8">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Форма ввода */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Описание объекта
            </CardTitle>
            <CardDescription>
              Опишите объект и требуемые работы для формирования ТЗ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Сохраненные описания */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Загрузить сохраненное описание
              </Label>
              <Select value={selectedSavedId} onValueChange={loadDescription} disabled={savedDescriptions.length === 0}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={
                    savedDescriptions.length === 0 
                      ? "Нет сохраненных описаний" 
                      : "Выберите сохраненное описание"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {savedDescriptions.map((saved) => (
                    <SelectItem key={saved.id} value={saved.id}>
                      {saved.name} ({new Date(saved.data.savedAt).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Имя клиента
              </Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Введите имя клиента"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="object-address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Адрес объекта
              </Label>
              <Input
                id="object-address"
                value={objectAddress}
                onChange={(e) => setObjectAddress(e.target.value)}
                placeholder="Введите адрес объекта"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="object-description" className="flex items-center justify-between">
                <span>Описание объекта и требуемых работ</span>
                <VoiceRecorder onTranscription={handleVoiceTranscription} />
              </Label>
              <Textarea
                id="object-description"
                value={objectDescription}
                onChange={(e) => setObjectDescription(e.target.value)}
                placeholder="Опишите объект, его состояние, требуемые работы, особенности участка, пожелания клиента..."
                className="min-h-[200px]"
              />
            </div>

            {/* Кнопки сохранения и формирования ТЗ */}
            <div className="flex gap-2">
              <Button 
                onClick={saveDescription} 
                disabled={!objectDescription.trim() && !clientName.trim() && !objectAddress.trim()}
                variant="outline"
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                Сохранить описание
              </Button>
            </div>

            <Button 
              onClick={generateSpecification} 
              disabled={loading || !objectDescription.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Формирую ТЗ...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Сформировать ТЗ
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Результат - техническое задание */}
        <Card>
          <CardHeader>
            <CardTitle>Техническое задание</CardTitle>
            <CardDescription>
              Сформированное ТЗ на основе нормативных документов
            </CardDescription>
          </CardHeader>
          <CardContent>
            {specification ? (
              <div className="h-[600px] overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">ОБЩАЯ ИНФОРМАЦИЯ</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Клиент:</span> {specification.client_name}</p>
                      <p><span className="font-medium">Адрес:</span> {specification.object_address}</p>
                      <p><span className="font-medium">Площадь:</span> {specification.estimated_area} м²</p>
                      <p><span className="font-medium">Длительность:</span> {specification.estimated_duration}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">ОБЪЕМ РАБОТ</h3>
                    <div className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-md">
                      {specification.work_scope}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ</h3>
                    <div className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-md">
                      {specification.materials_spec}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">НОРМАТИВНЫЕ ССЫЛКИ</h3>
                    <div className="flex flex-wrap gap-2">
                      {specification.normative_references.map((ref, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {ref}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">РЕКОМЕНДАЦИИ</h3>
                    <div className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-md">
                      {specification.recommendations}
                    </div>
                  </div>

                  <Separator />

                  <Button 
                    onClick={transferToEstimator}
                    className="w-full"
                    variant="default"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Передать в AI-Сметчик
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-center">
                  Техническое задание появится здесь<br />
                  после обработки описания объекта
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Информационный блок */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Как работает AI-Технолог</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs">1</span>
                Анализ описания
              </div>
              <p className="text-muted-foreground">
                AI анализирует описание объекта и определяет виды работ согласно строительным нормам
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs">2</span>
                Формирование ТЗ
              </div>
              <p className="text-muted-foreground">
                На основе СНИП, ГОСТ формируется техническое задание с указанием материалов и объемов
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs">3</span>
                Передача в сметчик
              </div>
              <p className="text-muted-foreground">
                Готовое ТЗ передается в AI-Сметчик для точного расчета стоимости работ
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <TechnicalSpecialistSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}