import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, 
  Send, 
  Brain, 
  Zap,
  Settings,
  Plus,
  Eye,
  Edit,
  Mail,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Proposal {
  id: string;
  clientName: string;
  title: string;
  amount: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
  sentDate?: Date;
  validUntil: Date;
}

const AIProposalManager = () => {
  const { toast } = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([
    {
      id: '1',
      clientName: 'ООО "Стройком"',
      title: 'Ремонт офисных помещений',
      amount: 850000,
      status: 'sent',
      sentDate: new Date('2024-01-10'),
      validUntil: new Date('2024-01-25')
    },
    {
      id: '2',
      clientName: 'Иванов И.И.',
      title: 'Ремонт квартиры',
      amount: 450000,
      status: 'viewed',
      sentDate: new Date('2024-01-12'),
      validUntil: new Date('2024-01-27')
    }
  ]);

  const [newProposal, setNewProposal] = useState({
    clientName: '',
    title: '',
    description: '',
    services: [],
    validDays: 14
  });

  const [generating, setGenerating] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'viewed': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'sent': return 'Отправлено';
      case 'viewed': return 'Просмотрено';
      case 'accepted': return 'Принято';
      case 'rejected': return 'Отклонено';
      default: return status;
    }
  };

  const generateProposal = async () => {
    setGenerating(true);
    
    // Симуляция генерации КП с помощью ИИ
    setTimeout(() => {
      toast({
        title: "КП сгенерировано",
        description: "ИИ успешно создал коммерческое предложение"
      });
      setGenerating(false);
    }, 3000);
  };

  const sendProposal = (id: string) => {
    setProposals(prev => prev.map(p => 
      p.id === id ? { ...p, status: 'sent', sentDate: new Date() } : p
    ));
    toast({
      title: "КП отправлено",
      description: "Коммерческое предложение отправлено клиенту"
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mr-2"
          >
            ← Назад
          </Button>
          <div className="h-12 w-12 rounded-lg bg-indigo-500 flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ИИ-КП-Менеджер</h1>
            <p className="text-muted-foreground">
              Оформляет и отправляет коммерческие предложения заказчикам
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Brain className="h-3 w-3 mr-1" />
            Активен
          </Badge>
          <Badge variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            OpenAI GPT-4o
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">Создать КП</TabsTrigger>
          <TabsTrigger value="proposals">Мои КП</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Новое коммерческое предложение
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Клиент</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите клиента" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client1">ООО "Стройком"</SelectItem>
                      <SelectItem value="client2">Иванов И.И.</SelectItem>
                      <SelectItem value="client3">ИП Петров А.С.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Название проекта</Label>
                  <Input placeholder="Введите название проекта" />
                </div>

                <div className="space-y-2">
                  <Label>Описание работ</Label>
                  <Textarea 
                    placeholder="Опишите требуемые работы..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Срок действия (дней)</Label>
                    <Input type="number" defaultValue={14} />
                  </div>
                  <div className="space-y-2">
                    <Label>Приоритет</Label>
                    <Select defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Высокий</SelectItem>
                        <SelectItem value="medium">Средний</SelectItem>
                        <SelectItem value="low">Низкий</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={generateProposal}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Генерирую КП...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Сгенерировать КП с помощью ИИ
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Шаблоны КП</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Ремонт офиса', description: 'Стандартный ремонт офисных помещений' },
                  { name: 'Ремонт квартиры', description: 'Капитальный ремонт жилых помещений' },
                  { name: 'Коммерческие объекты', description: 'Ремонт торговых и складских помещений' }
                ].map((template, index) => (
                  <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="proposals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Коммерческие предложения
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать КП
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Проект</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Отправлено</TableHead>
                    <TableHead>Действует до</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map((proposal) => (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-medium">{proposal.clientName}</TableCell>
                      <TableCell>{proposal.title}</TableCell>
                      <TableCell>{proposal.amount.toLocaleString()} ₽</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(proposal.status)}>
                          {getStatusText(proposal.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {proposal.sentDate ? proposal.sentDate.toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>{proposal.validUntil.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {proposal.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => sendProposal(proposal.id)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Конверсия КП
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">68%</div>
                <p className="text-sm text-muted-foreground">
                  Принятых предложений за месяц
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Отправлено КП
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">42</div>
                <p className="text-sm text-muted-foreground">
                  За текущий месяц
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Средний срок
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">5 дней</div>
                <p className="text-sm text-muted-foreground">
                  От отправки до принятия
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Настройки КП-менеджера
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Шаблон письма</Label>
                  <Textarea 
                    className="mt-2"
                    placeholder="Уважаемый {client_name}, направляем Вам коммерческое предложение..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Подпись</Label>
                  <Textarea 
                    className="mt-2"
                    placeholder="С уважением, команда компании..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Срок действия по умолчанию</Label>
                    <Input type="number" defaultValue={14} className="mt-2" />
                  </div>
                  <div>
                    <Label>Автоотправка</Label>
                    <Select defaultValue="manual">
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Автоматически</SelectItem>
                        <SelectItem value="manual">Вручную</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full mt-4">
                  Сохранить настройки
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIProposalManager;