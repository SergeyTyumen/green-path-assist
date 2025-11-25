import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEstimateTemplates, EstimateTemplate } from "@/hooks/useEstimateTemplates";
import { FileSpreadsheet, Plus, Edit2, Trash2, Calculator, Loader2 } from "lucide-react";

const WORK_TYPES = [
  "Земляные работы",
  "Фундаментные работы",
  "Кровельные работы",
  "Фасадные работы",
  "Внутренние отделочные работы",
  "Электромонтажные работы",
  "Сантехнические работы",
  "Ландшафтные работы",
  "Другое",
];

export default function EstimateTemplates() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useEstimateTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EstimateTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    work_type: "",
    description: "",
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      work_type: "",
      description: "",
      is_active: true,
    });
    setEditingTemplate(null);
  };

  const handleOpenDialog = (template?: EstimateTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        work_type: template.work_type,
        description: template.description || "",
        is_active: template.is_active,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, formData);
    } else {
      await createTemplate(formData);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этот шаблон?")) {
      await deleteTemplate(id);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Шаблоны смет</h1>
            <p className="text-muted-foreground">
              Управление шаблонами для автоматического создания смет
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Создать шаблон
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Редактировать шаблон" : "Новый шаблон сметы"}</DialogTitle>
              <DialogDescription>
                Создайте шаблон для типовых видов работ
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название шаблона</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Смета на фундаментные работы"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_type">Вид работ</Label>
                <Input
                  id="work_type"
                  value={formData.work_type}
                  onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                  placeholder="Выберите из списка или введите свой"
                  list="work-types"
                />
                <datalist id="work-types">
                  {WORK_TYPES.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание применения шаблона"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Активен</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSubmit}>
                {editingTemplate ? "Обновить" : "Создать"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Шаблоны смет</CardTitle>
          <CardDescription>
            Шаблоны используются для быстрого создания смет на типовые виды работ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Шаблоны смет пока не созданы</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Вид работ</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.work_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {template.description || "—"}
                    </TableCell>
                    <TableCell>
                      {template.is_active ? (
                        <Badge variant="default">Активен</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивен</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(template)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
