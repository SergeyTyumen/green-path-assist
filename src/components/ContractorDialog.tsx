import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useContractors, type Contractor } from "@/hooks/useContractors";

interface ContractorDialogProps {
  children: React.ReactNode;
  contractor?: Contractor;
  onSuccess?: () => void;
}

export function ContractorDialog({ children, contractor, onSuccess }: ContractorDialogProps) {
  const { createContractor, updateContractor } = useContractors();
  const [open, setOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    company_name: contractor?.company_name || "",
    specialization: contractor?.specialization || [],
    phone: contractor?.phone || "",
    description: contractor?.description || "",
    experience_years: contractor?.experience_years || 0,
    completed_projects: contractor?.completed_projects || 0,
    rating: contractor?.rating || 0,
    verified: contractor?.verified || false,
    portfolio_images: contractor?.portfolio_images || [],
  });

  const [newSpecialization, setNewSpecialization] = useState("");
  const [newPortfolioImage, setNewPortfolioImage] = useState("");

  const availableSpecializations = [
    "Ландшафтное проектирование",
    "Автополив",
    "Укладка газона",
    "Уход за растениями", 
    "Посадка деревьев",
    "Дренаж",
    "Освещение",
    "Мощение дорожек",
    "Установка заборов",
    "Создание водоемов",
    "Альпийские горки",
    "Вертикальное озеленение"
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addSpecialization = (specialization: string) => {
    if (specialization && !formData.specialization.includes(specialization)) {
      setFormData(prev => ({
        ...prev,
        specialization: [...prev.specialization, specialization]
      }));
    }
    setNewSpecialization("");
  };

  const removeSpecialization = (specialization: string) => {
    setFormData(prev => ({
      ...prev,
      specialization: prev.specialization.filter(s => s !== specialization)
    }));
  };

  const addPortfolioImage = () => {
    if (newPortfolioImage && !formData.portfolio_images.includes(newPortfolioImage)) {
      setFormData(prev => ({
        ...prev,
        portfolio_images: [...prev.portfolio_images, newPortfolioImage]
      }));
      setNewPortfolioImage("");
    }
  };

  const removePortfolioImage = (image: string) => {
    setFormData(prev => ({
      ...prev,
      portfolio_images: prev.portfolio_images.filter(img => img !== image)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_name.trim()) {
      return;
    }

    try {
      if (contractor) {
        await updateContractor(contractor.id, formData);
      } else {
        await createContractor(formData);
      }
      
      setOpen(false);
      onSuccess?.();
      
      // Reset form if creating new
      if (!contractor) {
        setFormData({
          company_name: "",
          specialization: [],
          phone: "",
          description: "",
          experience_years: 0,
          completed_projects: 0,
          rating: 0,
          verified: false,
          portfolio_images: [],
        });
      }
    } catch (error) {
      console.error("Error saving contractor:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contractor ? "Редактировать подрядчика" : "Добавить подрядчика"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Название компании *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="ООО Ландшафт"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+7 (999) 123-45-67"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Краткое описание деятельности подрядчика"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="experience_years">Опыт работы (лет)</Label>
              <Input
                id="experience_years"
                type="number"
                value={formData.experience_years}
                onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            
            <div>
              <Label htmlFor="completed_projects">Завершенных проектов</Label>
              <Input
                id="completed_projects"
                type="number"
                value={formData.completed_projects}
                onChange={(e) => handleInputChange('completed_projects', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            
            <div>
              <Label htmlFor="rating">Рейтинг</Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                value={formData.rating}
                onChange={(e) => handleInputChange('rating', parseFloat(e.target.value) || 0)}
                min="0"
                max="5"
              />
            </div>
          </div>

          {/* Специализации */}
          <div>
            <Label>Специализации</Label>
            <div className="flex gap-2 mb-2">
              <select
                value={newSpecialization}
                onChange={(e) => setNewSpecialization(e.target.value)}
                className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">Выберите специализацию</option>
                {availableSpecializations
                  .filter(spec => !formData.specialization.includes(spec))
                  .map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))
                }
              </select>
              <Button
                type="button"
                onClick={() => addSpecialization(newSpecialization)}
                disabled={!newSpecialization}
                size="sm"
              >
                Добавить
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {formData.specialization.map((spec) => (
                <Badge key={spec} variant="secondary" className="text-xs">
                  {spec}
                  <button
                    type="button"
                    onClick={() => removeSpecialization(spec)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Портфолио */}
          <div>
            <Label>Портфолио (ссылки на изображения)</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newPortfolioImage}
                onChange={(e) => setNewPortfolioImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addPortfolioImage}
                disabled={!newPortfolioImage}
                size="sm"
              >
                Добавить
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {formData.portfolio_images.map((image, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {image.length > 30 ? `${image.substring(0, 30)}...` : image}
                  <button
                    type="button"
                    onClick={() => removePortfolioImage(image)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">
              {contractor ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}