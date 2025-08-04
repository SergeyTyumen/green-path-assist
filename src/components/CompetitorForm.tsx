import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  X, 
  Globe, 
  Building, 
  Link,
  MapPin,
  Phone,
  Mail,
  FileText,
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react';

interface CompetitorData {
  name: string;
  website: string;
  socialLinks: string[];
  description: string;
  location: string;
  phone: string;
  email: string;
  specializations: string[];
  priceRange: string;
  notes: string;
}

interface CompetitorFormProps {
  onSave: (data: CompetitorData) => void;
}

const CompetitorForm: React.FC<CompetitorFormProps> = ({ onSave }) => {
  const [competitor, setCompetitor] = useState<CompetitorData>({
    name: '',
    website: '',
    socialLinks: [''],
    description: '',
    location: '',
    phone: '',
    email: '',
    specializations: [''],
    priceRange: '',
    notes: ''
  });

  const addField = (field: 'socialLinks' | 'specializations') => {
    setCompetitor(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeField = (field: 'socialLinks' | 'specializations', index: number) => {
    setCompetitor(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateField = (field: 'socialLinks' | 'specializations', index: number, value: string) => {
    setCompetitor(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const handleSave = () => {
    const cleanedData = {
      ...competitor,
      socialLinks: competitor.socialLinks.filter(link => link.trim() !== ''),
      specializations: competitor.specializations.filter(spec => spec.trim() !== '')
    };
    onSave(cleanedData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Карточка конкурента
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Основное</TabsTrigger>
            <TabsTrigger value="contact">Контакты</TabsTrigger>
            <TabsTrigger value="analysis">Анализ</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Название компании</Label>
              <Input
                placeholder="ООО 'Ландшафт Про'"
                value={competitor.name}
                onChange={(e) => setCompetitor(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Основной сайт
              </Label>
              <Input
                placeholder="https://example.com"
                value={competitor.website}
                onChange={(e) => setCompetitor(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Социальные сети и ресурсы
              </Label>
              {competitor.socialLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="https://instagram.com/company или https://avito.ru/profile"
                    value={link}
                    onChange={(e) => updateField('socialLinks', index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeField('socialLinks', index)}
                    disabled={competitor.socialLinks.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addField('socialLinks')}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить ссылку
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Специализации</Label>
              {competitor.specializations.map((spec, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Ландшафтный дизайн, Автополив, Озеленение"
                    value={spec}
                    onChange={(e) => updateField('specializations', index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeField('specializations', index)}
                    disabled={competitor.specializations.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addField('specializations')}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить специализацию
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Местоположение
              </Label>
              <Input
                placeholder="г. Москва, ул. Примерная, 123"
                value={competitor.location}
                onChange={(e) => setCompetitor(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Телефон
              </Label>
              <Input
                placeholder="+7 (999) 123-45-67"
                value={competitor.phone}
                onChange={(e) => setCompetitor(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                placeholder="info@company.com"
                value={competitor.email}
                onChange={(e) => setCompetitor(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Описание деятельности</Label>
              <Textarea
                placeholder="Краткое описание компании, ключевые особенности, преимущества..."
                value={competitor.description}
                onChange={(e) => setCompetitor(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Ценовой диапазон
              </Label>
              <Input
                placeholder="от 2000 до 5000 руб/м² или 'Средний сегмент'"
                value={competitor.priceRange}
                onChange={(e) => setCompetitor(prev => ({ ...prev, priceRange: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Заметки и наблюдения
              </Label>
              <Textarea
                placeholder="Особенности работы, уникальные предложения, акции, сильные и слабые стороны..."
                value={competitor.notes}
                onChange={(e) => setCompetitor(prev => ({ ...prev, notes: e.target.value }))}
                rows={6}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Создано: {new Date().toLocaleDateString('ru-RU')}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Статус: Новый
              </Badge>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave} className="flex-1">
            Сохранить конкурента
          </Button>
          <Button variant="outline" className="flex-1">
            Отмена
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompetitorForm;