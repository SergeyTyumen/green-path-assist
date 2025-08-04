import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Clock,
  AlertCircle,
  Calendar,
  User,
  Loader2,
  Trash2
} from "lucide-react";
import { useTasks, Task } from "@/hooks/useTasks";
import { useClients } from "@/hooks/useClients";
import { TaskDialog } from "@/components/TaskDialog";
import { toast } from "sonner";

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const { tasks, loading, updateTask, deleteTask } = useTasks();
  const { clients } = useClients();

  const handleCompleteTask = async (task: Task) => {
    await updateTask(task.id, { status: "completed" });
    toast.success("Задача помечена как выполненная");
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const getStatusBadge = (status: Task["status"]) => {
    const statusConfig = {
      "pending": { label: "Ожидает", className: "bg-gray-100 text-gray-700" },
      "in-progress": { label: "В работе", className: "bg-blue-100 text-blue-700" },
      "completed": { label: "Выполнена", className: "bg-green-100 text-green-700" },
      "overdue": { label: "Просрочена", className: "bg-red-100 text-red-700" }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={`${config.className} whitespace-nowrap`}>
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: Task["priority"]) => {
    const priorityConfig = {
      "low": { label: "Низкий", className: "bg-green-50 text-green-600 border-green-200" },
      "medium": { label: "Средний", className: "bg-yellow-50 text-yellow-600 border-yellow-200" },
      "high": { label: "Высокий", className: "bg-red-50 text-red-600 border-red-200" }
    };
    
    const config = priorityConfig[priority];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getCategoryIcon = (category: Task["category"]) => {
    const iconMap = {
      "call": <Clock className="h-4 w-4" />,
      "estimate": <CheckSquare className="h-4 w-4" />,
      "proposal": <Edit className="h-4 w-4" />,
      "follow-up": <AlertCircle className="h-4 w-4" />,
      "other": <CheckSquare className="h-4 w-4" />
    };
    return iconMap[category];
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;
    const matchesPriority = selectedPriority === "all" || task.priority === selectedPriority;
    const matchesClient = selectedClient === "all" || task.client_id === selectedClient;
    return matchesSearch && matchesStatus && matchesPriority && matchesClient;
  });

  const getClientName = (clientId: string | null | undefined) => {
    if (!clientId) return "Без клиента";
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Неизвестный клиент";
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка задач...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Задачи</h1>
          <p className="text-muted-foreground mt-1">
            Управление задачами и контроль выполнения
          </p>
        </div>
        <TaskDialog />
      </div>

      {/* Поиск и фильтры */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, клиенту или проекту..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="pending">Ожидает</SelectItem>
                <SelectItem value="in-progress">В работе</SelectItem>
                <SelectItem value="completed">Выполнена</SelectItem>
                <SelectItem value="overdue">Просрочена</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Приоритет" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все приоритеты</SelectItem>
                <SelectItem value="high">Высокий</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="low">Низкий</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Клиент" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все клиенты</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Статистика задач */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { status: "pending", label: "Ожидает", color: "text-gray-600" },
          { status: "in-progress", label: "В работе", color: "text-blue-600" },
          { status: "completed", label: "Выполнено", color: "text-green-600" },
          { status: "overdue", label: "Просрочено", color: "text-red-600" }
        ].map(({ status, label, color }) => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckSquare className={`h-5 w-5 ${color}`} />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {tasks.filter(t => t.status === status).length}
                  </div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Список задач */}
      <div className="grid gap-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getCategoryIcon(task.category)}
                    <h3 className="text-lg font-semibold text-foreground">
                      {task.title}
                    </h3>
                    {getStatusBadge(task.status)}
                    {getPriorityBadge(task.priority)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {task.description}
                  </p>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium text-foreground">Клиент: {getClientName(task.client_id)}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.assignee || 'Не назначен'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Срок: {task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : 'Не установлен'}
                      </div>
                      <span>Создана: {new Date(task.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <TaskDialog
                    task={task}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                    }
                  />
                  {task.status !== "completed" && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleCompleteTask(task)}
                    >
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие нельзя отменить. Задача будет удалена безвозвратно.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteTask(task.id)}>
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Задачи не найдены
            </h3>
            <p className="text-muted-foreground mb-4">
              Попробуйте изменить параметры поиска или создайте новую задачу
            </p>
            <TaskDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать первую задачу
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}