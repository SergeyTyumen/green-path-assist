import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import VoiceRecorder from '@/components/VoiceRecorder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import TechnicalSpecialistSettings from '@/components/ai-settings/TechnicalSpecialistSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTechnicalSpecifications } from '@/hooks/useTechnicalSpecifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SavedDescription {
  id: string;
  name: string;
  object_description: string;
  client_name: string;
  object_address: string;
  created_at: string;
}

interface TechnicalSpecification {
  object_description: string;
  client_name: string;
  object_address: string;
  work_scope: string;
  materials_spec: any;
  normative_references: any;
  quality_requirements: string;
  timeline: string;
  safety_requirements: string;
  acceptance_criteria: string;
  additional_requirements: string;
}

const AITechnicalSpecialist = () => {
  const [objectDescription, setObjectDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [objectAddress, setObjectAddress] = useState('');
  const [generatedSpecification, setGeneratedSpecification] = useState<TechnicalSpecification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedDescriptions, setSavedDescriptions] = useState<SavedDescription[]>([]);
  const [viewMode, setViewMode] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createSpecification, specifications } = useTechnicalSpecifications();

  useEffect(() => {
    loadSavedDescriptions();
    
    // Проверяем, нужно ли отобразить существующее ТЗ
    const viewId = searchParams.get('view');
    if (viewId) {
      const spec = specifications.find(s => s.id === viewId);
      if (spec) {
        setViewMode(true);
        setGeneratedSpecification({
          object_description: spec.object_description || '',
          client_name: spec.client_name || '',
          object_address: spec.object_address || '',
          work_scope: spec.work_scope || '',
          materials_spec: spec.materials_spec || {},
          normative_references: spec.normative_references || {},
          quality_requirements: spec.quality_requirements || '',
          timeline: spec.timeline || '',
          safety_requirements: spec.safety_requirements || '',
          acceptance_criteria: spec.acceptance_criteria || '',
          additional_requirements: spec.additional_requirements || ''
        });
        setObjectDescription(spec.object_description || '');
        setClientName(spec.client_name || '');
        setObjectAddress(spec.object_address || '');
      }
    }
  }, [searchParams, specifications]);

  const loadSavedDescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_object_descriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedDescriptions(data || []);
    } catch (error) {
      console.error('Error loading saved descriptions:', error);
    }
  };

  const generateSpecification = async () => {
    if (!objectDescription.trim()) {
      toast.error('Пожалуйста, введите описание объекта');
      return;
    }

    setIsLoading(true);
    setGeneratedSpecification(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-technical-specialist', {
        body: {
          object_description: objectDescription,
          client_name: clientName,
          object_address: objectAddress
        }
      });

      if (error) throw error;

      setGeneratedSpecification(data);
      
      // Сохраняем техническое задание в базу данных
      await saveTechnicalSpecification(data);
      
      toast.success('Техническое задание успешно сгенерировано и сохранено');
    } catch (error) {
      console.error('Error generating specification:', error);
      toast.error('Ошибка при генерации технического задания');
    } finally {
      setIsLoading(false);
    }
  };

  const saveDescription = async () => {
    const name = prompt('Введите название для сохранения:');
    if (name && (objectDescription.trim() || clientName.trim() || objectAddress.trim())) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('saved_object_descriptions')
          .insert({
            name,
            object_description: objectDescription,
            client_name: clientName,
            object_address: objectAddress,
            user_id: userData.user?.id
          });

        if (error) throw error;

        await loadSavedDescriptions();
        toast.success(`Описание сохранено как "${name}"`);
      } catch (error) {
        console.error('Error saving description:', error);
        toast.error('Не удалось сохранить описание');
      }
    }
  };

  const loadDescription = (id: string) => {
    const saved = savedDescriptions.find(s => s.id === id);
    if (saved) {
      setObjectDescription(saved.object_description || '');
      setClientName(saved.client_name || '');
      setObjectAddress(saved.object_address || '');
      toast.success(`Загружено: "${saved.name}"`);
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setObjectDescription(prev => prev ? `${prev}\n\n${text}` : text);
  };

  const saveTechnicalSpecification = async (specification: TechnicalSpecification) => {
    const title = `ТЗ для ${clientName || 'Объект'} от ${new Date().toLocaleDateString('ru-RU')}`;
    
    await createSpecification({
      title,
      object_description: objectDescription,
      client_name: clientName,
      object_address: objectAddress,
      work_scope: specification.work_scope,
      materials_spec: specification.materials_spec,
      normative_references: specification.normative_references,
      quality_requirements: specification.quality_requirements,
      timeline: specification.timeline,
      safety_requirements: specification.safety_requirements,
      acceptance_criteria: specification.acceptance_criteria,
      additional_requirements: specification.additional_requirements,
      status: 'draft'
    });
  };

  const transferToEstimator = () => {
    if (!generatedSpecification) {
      toast.error('Сначала сгенерируйте техническое задание');
      return;
    }

    const params = new URLSearchParams({
      work_scope: generatedSpecification.work_scope || '',
      materials: JSON.stringify(generatedSpecification.materials_spec || {}),
      client_name: generatedSpecification.client_name || clientName,
      object_address: generatedSpecification.object_address || objectAddress
    });

    navigate(`/ai-estimator?${params.toString()}`);
    toast.success('Данные переданы в AI-Сметчик');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">AI-Технолог</h1>
          <p className="text-muted-foreground">Создание технических заданий на основе описания объекта</p>
        </div>
        {viewMode && (
          <Button variant="outline" onClick={() => navigate('/technical-specifications')}>
            К списку ТЗ
          </Button>
        )}
      </div>

      <Tabs defaultValue="workspace" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="workspace">Рабочая область</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Форма ввода */}
            <Card>
              <CardHeader>
                <CardTitle>Описание объекта</CardTitle>
                <CardDescription>
                  Опишите объект и требуемые работы для формирования ТЗ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Сохраненные описания */}
                {savedDescriptions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Загрузить сохраненное описание</Label>
                    <Select onValueChange={loadDescription}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите сохраненное описание" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedDescriptions.map((saved) => (
                          <SelectItem key={saved.id} value={saved.id}>
                            {saved.name} ({new Date(saved.created_at).toLocaleDateString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="client-name">Имя клиента</Label>
                  <Input
                    id="client-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Введите имя клиента"
                    disabled={viewMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="object-address">Адрес объекта</Label>
                  <Input
                    id="object-address"
                    value={objectAddress}
                    onChange={(e) => setObjectAddress(e.target.value)}
                    placeholder="Введите адрес объекта"
                    disabled={viewMode}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="object-description">Описание объекта и требуемых работ</Label>
                    {!viewMode && <VoiceRecorder onTranscription={handleVoiceTranscription} />}
                  </div>
                  <Textarea
                    id="object-description"
                    value={objectDescription}
                    onChange={(e) => setObjectDescription(e.target.value)}
                    placeholder="Опишите объект, его состояние, требуемые работы..."
                    className="min-h-[200px]"
                    disabled={viewMode}
                  />
                </div>

                {!viewMode && (
                  <>
                    <Button onClick={saveDescription} variant="outline" className="w-full">
                      Сохранить описание
                    </Button>
                    <Button 
                      onClick={generateSpecification} 
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? 'Генерация...' : 'Сгенерировать техническое задание'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Результат */}
            {generatedSpecification && (
              <Card>
                <CardHeader>
                  <CardTitle>Техническое задание</CardTitle>
                  <CardDescription>
                    Сформированное ТЗ на основе нормативных документов
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-[500px] overflow-y-auto space-y-4">
                    {/* Общая информация */}
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">ОБЩАЯ ИНФОРМАЦИЯ</h3>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Клиент:</span> {generatedSpecification.client_name || clientName}</p>
                        <p><span className="font-medium">Адрес:</span> {generatedSpecification.object_address || objectAddress}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Объем работ */}
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">ОБЪЕМ РАБОТ</h3>
                      <div className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-md">
                        {generatedSpecification.work_scope}
                      </div>
                    </div>

                    <Separator />

                    {/* Спецификация материалов */}
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ</h3>
                      <div className="text-sm bg-muted/50 p-3 rounded-md">
                        {typeof generatedSpecification.materials_spec === 'string' ? (
                          <div className="whitespace-pre-line">{generatedSpecification.materials_spec}</div>
                        ) : generatedSpecification.materials_spec && typeof generatedSpecification.materials_spec === 'object' ? (
                          Object.entries(generatedSpecification.materials_spec).map(([key, value]: [string, any]) => (
                            <div key={key} className="border-b border-muted pb-2 last:border-b-0">
                              <div className="font-medium capitalize">{key.replace(/_/g, ' ')}</div>
                              {typeof value === 'object' && value !== null ? (
                                <div className="ml-4 text-xs text-muted-foreground">
                                  {Object.entries(value).map(([subKey, subValue]) => (
                                    <div key={subKey}>
                                      <span className="font-medium">{subKey}:</span> {String(subValue)}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="ml-4 text-xs text-muted-foreground">{String(value)}</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div>Спецификация материалов не загружена</div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Нормативные ссылки */}
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">НОРМАТИВНЫЕ ССЫЛКИ</h3>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(generatedSpecification.normative_references) ? (
                          generatedSpecification.normative_references.map((ref, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {ref}
                            </Badge>
                          ))
                        ) : generatedSpecification.normative_references && typeof generatedSpecification.normative_references === 'object' ? (
                          Object.values(generatedSpecification.normative_references).map((ref, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {String(ref)}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Нормативные ссылки не указаны
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Требования к качеству */}
                    {generatedSpecification.quality_requirements && (
                      <>
                        <div>
                          <h3 className="font-semibold text-sm text-muted-foreground mb-2">ТРЕБОВАНИЯ К КАЧЕСТВУ</h3>
                          <div className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-md">
                            {generatedSpecification.quality_requirements}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Временные рамки */}
                    {generatedSpecification.timeline && (
                      <>
                        <div>
                          <h3 className="font-semibold text-sm text-muted-foreground mb-2">ВРЕМЕННЫЕ РАМКИ</h3>
                          <div className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-md">
                            {generatedSpecification.timeline}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Требования безопасности */}
                    {generatedSpecification.safety_requirements && (
                      <>
                        <div>
                          <h3 className="font-semibold text-sm text-muted-foreground mb-2">ТРЕБОВАНИЯ БЕЗОПАСНОСТИ</h3>
                          <div className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-md">
                            {generatedSpecification.safety_requirements}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Критерии приемки */}
                    {generatedSpecification.acceptance_criteria && (
                      <>
                        <div>
                          <h3 className="font-semibold text-sm text-muted-foreground mb-2">КРИТЕРИИ ПРИЕМКИ</h3>
                          <div className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-md">
                            {generatedSpecification.acceptance_criteria}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Дополнительные требования */}
                    {generatedSpecification.additional_requirements && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">ДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ</h3>
                        <div className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-md">
                          {generatedSpecification.additional_requirements}
                        </div>
                      </div>
                    )}
                  </div>

                  {!viewMode && (
                    <div className="flex space-x-2">
                      <Button onClick={transferToEstimator} className="flex-1">
                        Передать в AI-Сметчик
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <TechnicalSpecialistSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITechnicalSpecialist;