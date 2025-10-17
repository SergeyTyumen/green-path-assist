import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download,
  Eye,
  Edit,
  Code
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
  is_default: boolean;
  created_at: string;
}

export function ProposalTemplateManager() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'html',
    content: ''
  });

  // Загрузить список шаблонов
  const loadTemplates = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('type', 'proposal')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Ошибка загрузки шаблонов');
    }
  };

  // Загрузить файл шаблона
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = [
      'text/html',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md')) {
      toast.error('Поддерживаются только HTML, TXT, MD, DOCX файлы');
      return;
    }

    setLoading(true);
    try {
      // Загружаем файл в Storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('proposal-templates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Читаем содержимое для текстовых файлов
      let content = '';
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.html')) {
        content = await file.text();
      } else {
        content = `[DOCX файл: ${file.name}]`;
      }

      // Сохраняем в базу
      const { error: dbError } = await supabase
        .from('templates')
        .insert({
          user_id: user.id,
          name: newTemplate.name || file.name.replace(/\.[^/.]+$/, ''),
          type: 'proposal',
          content: content,
          is_default: false
        });

      if (dbError) throw dbError;

      toast.success('Шаблон загружен');
      setNewTemplate({ name: '', type: 'html', content: '' });
      await loadTemplates();
    } catch (error) {
      console.error('Error uploading template:', error);
      toast.error('Ошибка загрузки шаблона');
    } finally {
      setLoading(false);
    }
  };

  // Создать текстовый шаблон
  const handleCreateTextTemplate = async () => {
    if (!user || !newTemplate.name || !newTemplate.content) {
      toast.error('Заполните название и содержание шаблона');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('templates')
        .insert({
          user_id: user.id,
          name: newTemplate.name,
          type: 'proposal',
          content: newTemplate.content,
          is_default: false
        });

      if (error) throw error;

      toast.success('Шаблон создан');
      setNewTemplate({ name: '', type: 'html', content: '' });
      await loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Ошибка создания шаблона');
    } finally {
      setLoading(false);
    }
  };

  // Удалить шаблон
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Шаблон удален');
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Ошибка удаления шаблона');
    }
  };

  // Установить как дефолтный
  const handleSetDefault = async (id: string) => {
    try {
      // Сбрасываем все дефолтные
      await supabase
        .from('templates')
        .update({ is_default: false })
        .eq('user_id', user?.id)
        .eq('type', 'proposal');

      // Устанавливаем новый дефолтный
      const { error } = await supabase
        .from('templates')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('Шаблон установлен как основной');
      await loadTemplates();
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Ошибка установки шаблона');
    }
  };

  useState(() => {
    loadTemplates();
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Загрузить шаблон
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={uploadMode === 'file' ? 'default' : 'outline'}
              onClick={() => setUploadMode('file')}
            >
              Файл
            </Button>
            <Button
              variant={uploadMode === 'text' ? 'default' : 'outline'}
              onClick={() => setUploadMode('text')}
            >
              Текст
            </Button>
          </div>

          {uploadMode === 'file' ? (
            <div className="space-y-4">
              <div>
                <Label>Название шаблона</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Стандартный бланк КП"
                />
              </div>
              <div>
                <Label>Файл шаблона (HTML, TXT, MD, DOCX)</Label>
                <Input
                  type="file"
                  accept=".html,.txt,.md,.docx"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-2">Доступные переменные:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <code>{'{{client_name}}'}</code>
                  <code>{'{{client_phone}}'}</code>
                  <code>{'{{client_email}}'}</code>
                  <code>{'{{client_address}}'}</code>
                  <code>{'{{amount}}'}</code>
                  <code>{'{{date}}'}</code>
                  <code>{'{{services}}'}</code>
                  <code>{'{{estimate_details}}'}</code>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Название шаблона</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Стандартный бланк КП"
                />
              </div>
              <div>
                <Label>HTML содержание</Label>
                <Textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="<h1>Коммерческое предложение</h1>..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <Button onClick={handleCreateTextTemplate} disabled={loading}>
                <FileText className="h-4 w-4 mr-2" />
                Создать шаблон
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Мои шаблоны ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Нет загруженных шаблонов</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{template.name}</h4>
                        {template.is_default && (
                          <Badge variant="secondary">По умолчанию</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Создан: {new Date(template.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(template.id)}
                        disabled={template.is_default}
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
