import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, Shield, Search, UserCheck, Crown } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  role?: string;
}

const UserManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const checkAdminRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        });
      
      if (error) throw error;
      setIsAdmin(data);
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Получаем пользователей из auth.users через админский запрос
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      // Получаем роли пользователей
      const userIds = authUsers.users.map(u => u.id);
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      
      if (rolesError) throw rolesError;

      // Объединяем данные
      const rolesMap = new Map(userRoles.map(r => [r.user_id, r.role]));
      
      const usersWithRoles: UserProfile[] = authUsers.users.map(user => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        role: rolesMap.get(user.id) || 'client'
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить пользователей",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'client' | 'contractor' | 'admin') => {
    try {
      // Проверяем, есть ли уже роль у пользователя
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRole) {
        // Обновляем существующую роль
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Создаем новую роль
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        
        if (error) throw error;
      }

      // Обновляем локальное состояние
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId ? { ...u, role: newRole } : u
        )
      );

      toast({
        title: "Успешно",
        description: `Роль пользователя изменена на ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить роль пользователя",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'contractor':
        return <UserCheck className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500 text-white';
      case 'contractor':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'contractor':
        return 'Подрядчик';
      default:
        return 'Клиент';
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800 dark:text-red-200">Доступ запрещен</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300">
              У вас нет прав для управления пользователями. Обратитесь к администратору.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Загрузка пользователей...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Управление пользователями</h1>
          <p className="text-muted-foreground">
            Управление ролями и доступом пользователей системы
          </p>
        </div>
      </div>

      {/* Поиск */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Поиск пользователей</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Всего пользователей</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Администраторы</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Подрядчики</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'contractor').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">Клиенты</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'client').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список пользователей */}
      <Card>
        <CardHeader>
          <CardTitle>Пользователи системы</CardTitle>
          <CardDescription>
            Управление ролями и правами доступа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.email}</p>
                    <Badge variant="outline" className={getRoleColor(user.role || 'client')}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(user.role || 'client')}
                        {getRoleLabel(user.role || 'client')}
                      </div>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Зарегистрирован: {new Date(user.created_at).toLocaleDateString()}
                    {user.last_sign_in_at && (
                      <> • Последний вход: {new Date(user.last_sign_in_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={user.role}
                    onValueChange={(value: 'client' | 'contractor' | 'admin') => updateUserRole(user.id, value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Клиент</SelectItem>
                      <SelectItem value="contractor">Подрядчик</SelectItem>
                      <SelectItem value="admin">Администратор</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Пользователи не найдены</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;