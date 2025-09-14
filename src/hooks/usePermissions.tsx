import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserPermission {
  id: string;
  user_id: string;
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ModulePermission {
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const AVAILABLE_MODULES = [
  'clients',
  'tasks',
  'estimates',
  'proposals',
  'materials',
  'suppliers',
  'services',
  'contractors',
  'contracts',
  'technical_specifications'
] as const;

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) {
        console.error('Error checking admin role:', error);
        return;
      }
      setIsAdmin(data || false);
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  const fetchAllPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .order('user_id', { ascending: true });

      if (error) {
        console.error('Error fetching permissions:', error);
        return;
      }

      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchUserPermissions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user permissions:', error);
        return;
      }

      const userModulePermissions: ModulePermission[] = AVAILABLE_MODULES.map(module => {
        const permission = data?.find(p => p.module_name === module);
        return {
          module_name: module,
          can_view: permission?.can_view || false,
          can_create: permission?.can_create || false,
          can_edit: permission?.can_edit || false,
          can_delete: permission?.can_delete || false,
        };
      });

      setUserPermissions(userModulePermissions);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const setUserPermission = async (
    userId: string,
    moduleName: string,
    permissions: Partial<Omit<UserPermission, 'id' | 'user_id' | 'module_name' | 'created_at' | 'updated_at' | 'created_by'>>
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          module_name: moduleName,
          created_by: user.id,
          ...permissions
        }, {
          onConflict: 'user_id,module_name'
        })
        .select()
        .single();

      if (error) {
        console.error('Error setting user permission:', error);
        throw error;
      }

      await fetchAllPermissions();
      return data;
    } catch (error) {
      console.error('Error setting user permission:', error);
      throw error;
    }
  };

  const hasPermission = (moduleName: string, permissionType: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    if (isAdmin) return true;
    
    const permission = userPermissions.find(p => p.module_name === moduleName);
    if (!permission) return false;
    
    switch (permissionType) {
      case 'view':
        return permission.can_view;
      case 'create':
        return permission.can_create;
      case 'edit':
        return permission.can_edit;
      case 'delete':
        return permission.can_delete;
      default:
        return false;
    }
  };

  useEffect(() => {
    if (user) {
      checkAdminRole();
      fetchUserPermissions();
      fetchAllPermissions();
    }
  }, [user]);

  return {
    permissions,
    userPermissions,
    loading,
    isAdmin,
    hasPermission,
    setUserPermission,
    refetch: () => {
      fetchAllPermissions();
      fetchUserPermissions();
    },
    availableModules: AVAILABLE_MODULES
  };
}