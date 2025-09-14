import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, useTasks } from "@/hooks/useTasks";
import { useClients } from "@/hooks/useClients";
import { useNotifications } from "@/hooks/useNotifications";
import { useTaskAssignees } from "@/hooks/useTaskAssignees";
import { useProfiles } from "@/hooks/useProfiles";

interface TaskDialogProps {
  task?: Task;
  trigger?: React.ReactNode;
  onClose?: () => void;
}

export function TaskDialog({ task, trigger, onClose }: TaskDialogProps) {
  const [open, setOpen] = useState(false);
  
  const resetForm = () => ({
    title: "",
    description: "",
    client_id: "",
    assignee: "",
    status: "pending" as Task["status"],
    priority: "medium" as Task["priority"],
    category: "other" as Task["category"],
    due_date: undefined as Date | undefined,
    is_public: false,
    assignees: [] as string[],
  });

  const [formData, setFormData] = useState(() => 
    task ? {
      title: task.title,
      description: task.description || "",
      client_id: task.client_id || "",
      assignee: task.assignee || "",
      status: task.status,
      priority: task.priority,
      category: task.category,
      due_date: task.due_date ? new Date(task.due_date) : undefined,
      is_public: (task as any)?.is_public || false,
      assignees: [] as string[],
    } : resetForm()
  );

  const { createTask, updateTask } = useTasks();
  const { clients } = useClients();
  const { scheduleTaskNotification, notifyNewTask, cancelTaskNotifications } = useNotifications();
  const { assignUser } = useTaskAssignees(task?.id);
  const { profiles } = useProfiles();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      ...formData,
      due_date: formData.due_date?.toISOString().split('T')[0],
      client_id: (formData.client_id === "none" || formData.client_id === "") ? null : formData.client_id,
    };

    if (task) {
      await updateTask(task.id, taskData);
      // Отменяем старые уведомления и планируем новые при изменении задачи
      await cancelTaskNotifications(task.id);
      if (taskData.due_date) {
        await scheduleTaskNotification({ ...task, ...taskData });
      }
    } else {
      const newTask = await createTask(taskData);
      if (newTask) {
        // Назначаем ответственных, если задача создана
        if (formData.assignees.length > 0) {
          for (const userId of formData.assignees) {
            try {
              await assignUser(userId);
            } catch (error) {
              console.error('Error assigning user:', error);
            }
          }
        }
        
        // Уведомляем о новой задаче и планируем напоминания
        await notifyNewTask(newTask);
        if (taskData.due_date) {
          await scheduleTaskNotification(newTask);
        }
      }
    }
    
    setOpen(false);
    onClose?.();
  };

  const handleClose = () => {
    if (!task) {
      setFormData(resetForm());
    }
    setOpen(false);
    onClose?.();
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
            <Plus className="h-4 w-4" />
            Создать задачу
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? "Редактировать задачу" : "Создать новую задачу"}
          </DialogTitle>
          <DialogDescription>
            {task ? "Измените параметры задачи" : "Заполните информацию для новой задачи"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название задачи *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Введите название задачи"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignee">Исполнитель</Label>
              <Select
                value={formData.assignee}
                onValueChange={(value) => setFormData({ ...formData, assignee: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Кому назначена задача" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Без исполнителя</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.full_name || profile.email || 'Без имени'}>
                      {profile.full_name || profile.email || 'Без имени'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Подробное описание задачи"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Клиент</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без клиента</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Срок выполнения</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.due_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, "dd.MM.yyyy") : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => setFormData({ ...formData, due_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select
                value={formData.status}
                onValueChange={(value: Task["status"]) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Ожидает</SelectItem>
                  <SelectItem value="in-progress">В работе</SelectItem>
                  <SelectItem value="completed">Выполнена</SelectItem>
                  <SelectItem value="overdue">Просрочена</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Приоритет</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: Task["priority"]) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Категория</Label>
              <Select
                value={formData.category}
                onValueChange={(value: Task["category"]) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Звонок</SelectItem>
                  <SelectItem value="estimate">Смета</SelectItem>
                  <SelectItem value="proposal">Предложение</SelectItem>
                  <SelectItem value="follow-up">Последующая работа</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Тип задачи */}
          <div className="space-y-2">
            <Label>Тип задачи</Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_public" className="text-sm font-normal">
                Общая задача (видна всем сотрудникам)
              </Label>
            </div>
          </div>

          {/* Назначить ответственных */}
          {!task && (
            <div className="space-y-2">
              <Label>Назначить ответственных</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !formData.assignees.includes(value)) {
                    setFormData({ 
                      ...formData, 
                      assignees: [...formData.assignees, value] 
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  {profiles
                    .filter(profile => !formData.assignees.includes(profile.user_id))
                    .map((profile) => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.full_name || profile.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              {/* Список назначенных */}
              {formData.assignees.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Назначенные:</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.assignees.map((userId) => {
                      const profile = profiles.find(p => p.user_id === userId);
                      return (
                        <Badge 
                          key={userId} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {profile?.full_name || profile?.email}
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              assignees: formData.assignees.filter(id => id !== userId)
                            })}
                            className="ml-1 text-xs hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button type="submit">
              {task ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}