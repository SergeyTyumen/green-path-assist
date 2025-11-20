import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Archive as ArchiveIcon,
  Search, 
  Eye, 
  Download,
  Calendar,
  DollarSign,
  User,
  RotateCcw,
  Clock,
  CheckCircle2,
  Star
} from "lucide-react";
import { useClientArchives } from "@/hooks/useClientArchives";
import { useClients } from "@/hooks/useClients";
import { useCompletedProjects } from "@/hooks/useCompletedProjects";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Archive() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReasonType, setSelectedReasonType] = useState("all");
  const [activeTab, setActiveTab] = useState<'archived' | 'completed'>('archived');
  
  const { archives, loading, restoreClient, getDaysUntilRestore, refetch } = useClientArchives();
  const { clients } = useClients();
  const { projects: completedProjects, loading: projectsLoading } = useCompletedProjects();

  useEffect(() => {
    refetch();
  }, []);

  const getReasonBadge = (reasonType: string) => {
    const reasonConfig = {
      "no_contact": { label: "Не на связи", className: "bg-orange-100 text-orange-700" },
      "insufficient_budget": { label: "Нет бюджета", className: "bg-red-100 text-red-700" },
      "project_postponed": { label: "Переносит", className: "bg-blue-100 text-blue-700" },
      "other": { label: "Другое", className: "bg-gray-100 text-gray-700" }
    };
    
    const config = reasonConfig[reasonType as keyof typeof reasonConfig] || reasonConfig.other;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const activeArchives = archives.filter(a => a.status === 'active');
  
  const archivedClientsWithData = activeArchives.map(archive => {
    const client = clients.find(c => c.id === archive.client_id);
    return {
      archive,
      client
    };
  }).filter(item => item.client);

  const filteredArchives = archivedClientsWithData.filter(({ archive, client }) => {
    const matchesSearch = client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client?.phone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesReason = selectedReasonType === "all" || archive.archive_reason_type === selectedReasonType;
    return matchesSearch && matchesReason;
  });

  const handleRestore = async (archiveId: string, clientId: string) => {
    await restoreClient(archiveId, clientId);
    refetch();
  };

  const totalRevenue = completedProjects.reduce((sum, p) => sum + p.final_amount, 0);
  const avgProjectDuration = completedProjects.length > 0
    ? Math.round(completedProjects.reduce((sum, p) => sum + (p.project_duration_days || 0), 0) / completedProjects.length)
    : 0;

  const filteredProjects = completedProjects.filter(project => {
    const matchesSearch = project.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="max-w-full w-full p-4 sm:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">Архив</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base break-words">
            Архивные клиенты и реализованные проекты
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'archived' | 'completed')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <ArchiveIcon className="h-4 w-4" />
            Архивные клиенты
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Реализованные проекты
          </TabsTrigger>
        </TabsList>

        {/* Архивные клиенты */}
        <TabsContent value="archived" className="space-y-6">
          {/* Статистика архивных */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ArchiveIcon className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">{activeArchives.length}</div>
                    <div className="text-sm text-muted-foreground">Клиентов в архиве</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {activeArchives.filter(a => getDaysUntilRestore(a.restore_at) <= 7).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Возврат на этой неделе</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {archives.filter(a => a.status === 'restored').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Восстановлено всего</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Поиск и фильтры для архива */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по имени или телефону..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedReasonType} onValueChange={setSelectedReasonType}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Причина" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все причины</SelectItem>
                      <SelectItem value="no_contact">Не на связи</SelectItem>
                      <SelectItem value="insufficient_budget">Нет бюджета</SelectItem>
                      <SelectItem value="project_postponed">Переносит</SelectItem>
                      <SelectItem value="other">Другое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

      {/* Список архивных клиентов */}
      <div className="grid gap-4">
        {filteredArchives.map(({ archive, client }) => {
          if (!client) return null;
          
          const daysLeft = getDaysUntilRestore(archive.restore_at);
          const restoreDate = new Date(archive.restore_at);

          return (
            <Card key={archive.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground">
                        {client.name}
                      </h3>
                      {getReasonBadge(archive.archive_reason_type)}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone}</span>
                        {client.email && <span className="text-muted-foreground">• {client.email}</span>}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Возврат: {format(restoreDate, 'd MMMM yyyy', { locale: ru })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span className={daysLeft <= 7 ? 'text-orange-600 font-medium' : ''}>
                            Осталось: {daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}
                          </span>
                        </div>
                      </div>

                      {archive.archive_reason_comment && (
                        <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            {archive.archive_reason_comment}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <span>Архивирован: {format(new Date(archive.archived_at), 'd MMMM yyyy', { locale: ru })}</span>
                        <span>•</span>
                        <span>Период: {archive.archive_period} дней</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRestore(archive.id, client.id)}
                      className="w-full sm:w-auto"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Восстановить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredArchives.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <ArchiveIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Архивных клиентов не найдено
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedReasonType !== 'all' 
                ? 'Попробуйте изменить параметры поиска' 
                : 'Пока нет клиентов в архиве'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}