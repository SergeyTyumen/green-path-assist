import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface KnowledgeBaseFormProps {
  initialData?: {
    category?: string;
    topic?: string;
    content?: string;
    keywords?: string[];
    priority?: number;
  } | null;
  onSave: (data: {
    category: string;
    topic: string;
    content: string;
    keywords: string[];
    priority: number;
  }) => void;
  onCancel: () => void;
}

const KnowledgeBaseForm: React.FC<KnowledgeBaseFormProps> = ({ initialData, onSave, onCancel }) => {
  const [category, setCategory] = useState(initialData?.category || 'Услуги');
  const [topic, setTopic] = useState(initialData?.topic || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [keywords, setKeywords] = useState(initialData?.keywords?.join(', ') || '');
  const [priority, setPriority] = useState(initialData?.priority?.toString() || '1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const keywordsArray = keywords
      ? keywords.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    onSave({
      category,
      topic,
      content,
      keywords: keywordsArray,
      priority: parseInt(priority)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Категория</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите категорию" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Услуги">Услуги</SelectItem>
            <SelectItem value="Цены">Цены</SelectItem>
            <SelectItem value="Материалы">Материалы</SelectItem>
            <SelectItem value="Гарантии">Гарантии</SelectItem>
            <SelectItem value="Сроки">Сроки</SelectItem>
            <SelectItem value="Контакты">Контакты</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>Тема/Название</Label>
        <Input 
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Название темы или услуги"
          required
        />
      </div>
      
      <div>
        <Label>Содержание</Label>
        <Textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Подробная информация по теме: описание, цены, особенности..."
          className="min-h-[120px]"
          required
        />
      </div>
      
      <div>
        <Label>Ключевые слова</Label>
        <Input 
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="ключевые слова через запятую"
        />
      </div>
      
      <div>
        <Label>Приоритет</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите приоритет" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Высокий</SelectItem>
            <SelectItem value="2">Средний</SelectItem>
            <SelectItem value="3">Низкий</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2">
        <Button type="submit">
          Сохранить
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
};

export default KnowledgeBaseForm;
