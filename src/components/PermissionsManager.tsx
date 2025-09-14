import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { useProfiles } from '@/hooks/useProfiles';
import { toast } from 'sonner';

interface PermissionsManagerProps {
  userId?: string;
  userName?: string;
}

const MODULE_NAMES = {
  clients: 'Клиенты',
  tasks: 'Задачи',
  estimates: 'Сметы',
  proposals: 'Коммерческие предложения',
  materials: 'Материалы',
  suppliers: 'Поставщики',
  services: 'Услуги',
  contractors: 'Подрядчики',
  contracts: 'Договоры',
  technical_specifications: 'Технические спецификации'
} as const;

const PERMISSION_NAMES = {
  can_view: 'Просмотр',
  can_create: 'Создание',
  can_edit: 'Редактирование',
  can_delete: 'Удаление'
} as const;

export function PermissionsManager({ userId, userName }: PermissionsManagerProps) {
  const { permissions, setUserPermission, availableModules, loading } = usePermissions();
  const { profiles } = useProfiles();

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Управление правами доступа</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Выберите пользователя для настройки прав доступа</p>
        </CardContent>
      </Card>
    );
  }

  const userPermissions = permissions.filter(p => p.user_id === userId);

  const handlePermissionChange = async (
    moduleName: string,
    permissionType: keyof typeof PERMISSION_NAMES,
    value: boolean
  ) => {
    try {
      const existingPermission = userPermissions.find(p => p.module_name === moduleName);
      
      await setUserPermission(userId, moduleName, {
        [permissionType]: value,
        // Сохраняем существующие разрешения
        can_view: permissionType === 'can_view' ? value : existingPermission?.can_view || false,
        can_create: permissionType === 'can_create' ? value : existingPermission?.can_create || false,
        can_edit: permissionType === 'can_edit' ? value : existingPermission?.can_edit || false,
        can_delete: permissionType === 'can_delete' ? value : existingPermission?.can_delete || false,
      });

      toast.success('Права доступа обновлены');
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Ошибка при обновлении прав доступа');
    }
  };

  const getUserPermissionValue = (moduleName: string, permissionType: keyof typeof PERMISSION_NAMES): boolean => {
    const permission = userPermissions.find(p => p.module_name === moduleName);
    return permission?.[permissionType] || false;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Управление правами доступа</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Загрузка...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Управление правами доступа
          {userName && <Badge variant="secondary">{userName}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {availableModules.map((module) => {
          const moduleName = MODULE_NAMES[module] || module;
          
          return (
            <div key={module} className="space-y-3">
              <h4 className="font-medium text-lg">{moduleName}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(PERMISSION_NAMES).map(([key, label]) => {
                  const permissionKey = key as keyof typeof PERMISSION_NAMES;
                  const isChecked = getUserPermissionValue(module, permissionKey);
                  
                  return (
                    <div key={key} className="flex items-center space-x-2">
                      <Switch
                        id={`${module}-${key}`}
                        checked={isChecked}
                        onCheckedChange={(value) => 
                          handlePermissionChange(module, permissionKey, value)
                        }
                      />
                      <label 
                        htmlFor={`${module}-${key}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}