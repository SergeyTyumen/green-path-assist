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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNormativeDocuments, NormativeDocument } from "@/hooks/useNormativeDocuments";
import { BookOpen, Plus, Edit2, Trash2, FileText, Loader2 } from "lucide-react";

const DOCUMENT_TYPES = [
  { value: "GOST", label: "ГОСТ" },
  { value: "SNiP", label: "СНиП" },
  { value: "SP", label: "СП (Свод Правил)" },
  { value: "STO", label: "СТО (Стандарт организации)" },
  { value: "Technical", label: "Техническое условие" },
  { value: "Other", label: "Другое" },
];

export default function NormativeDocuments() {
  const { documents, loading, createDocument, updateDocument, deleteDocument } = useNormativeDocuments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<NormativeDocument | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    document_number: "",
    document_type: "GOST",
    year: new Date().getFullYear(),
    description: "",
    document_url: "",
    document_text: "",
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      document_number: "",
      document_type: "GOST",
      year: new Date().getFullYear(),
      description: "",
      document_url: "",
      document_text: "",
      is_active: true,
    });
    setEditingDoc(null);
  };

  const handleOpenDialog = (doc?: NormativeDocument) => {
    if (doc) {
      setEditingDoc(doc);
      setFormData({
        name: doc.name,
        document_number: doc.document_number,
        document_type: doc.document_type,
        year: doc.year || new Date().getFullYear(),
        description: doc.description || "",
        document_url: doc.document_url || "",
        document_text: doc.document_text || "",
        is_active: doc.is_active,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingDoc) {
      await updateDocument(editingDoc.id, formData);
    } else {
      await createDocument(formData);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этот документ?")) {
      await deleteDocument(id);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Нормативная база</h1>
            <p className="text-muted-foreground">
              Управление нормативными документами для технических заданий
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить документ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDoc ? "Редактировать документ" : "Новый нормативный документ"}</DialogTitle>
              <DialogDescription>
                Укажите информацию о нормативном документе
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название документа</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Бетонные и железобетонные конструкции"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document_number">Номер документа</Label>
                  <Input
                    id="document_number"
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    placeholder="Например: 10180-2012"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document_type">Тип документа</Label>
                  <Select value={formData.document_type} onValueChange={(value) => setFormData({ ...formData, document_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Год</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание области применения"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_url">Ссылка на документ (опционально)</Label>
                <Input
                  id="document_url"
                  value={formData.document_url}
                  onChange={(e) => setFormData({ ...formData, document_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_text">Текст документа (опционально)</Label>
                <Textarea
                  id="document_text"
                  value={formData.document_text}
                  onChange={(e) => setFormData({ ...formData, document_text: e.target.value })}
                  placeholder="Основные требования и положения документа..."
                  rows={5}
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
                {editingDoc ? "Обновить" : "Создать"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Нормативные документы</CardTitle>
          <CardDescription>
            Документы используются AI-Технологом при формировании технических заданий
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нормативные документы пока не добавлены</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Номер</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Год</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant="outline">{doc.document_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{doc.document_number}</TableCell>
                    <TableCell>{doc.name}</TableCell>
                    <TableCell>{doc.year}</TableCell>
                    <TableCell>
                      {doc.is_active ? (
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
                          onClick={() => handleOpenDialog(doc)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id)}
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
