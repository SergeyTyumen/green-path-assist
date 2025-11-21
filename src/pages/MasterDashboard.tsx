import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProjectAssignments } from "@/hooks/useProjectAssignments";
import { useWorkReports } from "@/hooks/useWorkReports";
import { useWorkRequests } from "@/hooks/useWorkRequests";
import { Briefcase, Calendar, ClipboardList, Bell } from "lucide-react";

const MasterDashboard = () => {
  const { assignments, loading: assignmentsLoading } = useProjectAssignments();
  const { reports, loading: reportsLoading } = useWorkReports();
  const { requests, loading: requestsLoading } = useWorkRequests();

  const getReportTypeLabel = (type: string) => {
    const labels = {
      hidden_work: "Скрытые работы",
      stage_work: "Этап работ",
      completion: "Завершение",
      issue: "Проблема",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getRequestTypeLabel = (type: string) => {
    const labels = {
      material: "Материалы",
      equipment: "Техника",
      staff: "Доп. люди",
      other: "Прочее",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-500",
      approved: "bg-green-500",
      rejected: "bg-red-500",
      completed: "bg-blue-500",
    };
    return colors[status as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Панель мастера</h1>
            <p className="text-muted-foreground">Управление проектами и заявками</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Активные проекты</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Отчеты</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Заявки</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Уведомления</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projects">Мои объекты</TabsTrigger>
            <TabsTrigger value="reports">Фотоотчеты</TabsTrigger>
            <TabsTrigger value="requests">Заявки</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Назначенные проекты</CardTitle>
                <CardDescription>
                  Список объектов, на которых вы работаете
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignmentsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Загрузка...
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    У вас пока нет назначенных проектов
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">Проект #{assignment.project_id.substring(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            Назначен: {new Date(assignment.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge>{assignment.role_on_project}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Фотоотчеты</CardTitle>
                <CardDescription>
                  Скрытые работы и этапы выполнения
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Загрузка...
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Отчетов пока нет
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getReportTypeLabel(report.report_type)}
                            </Badge>
                            <Badge className={getStatusColor(report.status)}>
                              {report.status}
                            </Badge>
                          </div>
                          <p className="text-sm">{report.description || "Без описания"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Просмотр
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Заявки</CardTitle>
                <CardDescription>
                  Запросы на материалы, технику и персонал
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Загрузка...
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Заявок пока нет
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getRequestTypeLabel(request.request_type)}
                            </Badge>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="font-medium">{request.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Детали
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default MasterDashboard;
