import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  categories: string[];
  location?: string;
  phone?: string;
  email?: string;
  rating?: number;
  orders_count?: number;
  status: string;
  delivery_time?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSuppliers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Ошибка при загрузке поставщиков');
    } finally {
      setLoading(false);
    }
  };

  const createSupplier = async (supplierData: Omit<Supplier, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          ...supplierData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      setSuppliers(prev => [data, ...prev]);
      toast.success('Поставщик добавлен');
      return data;
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast.error('Ошибка при добавлении поставщика');
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setSuppliers(prev => prev.map(supplier => supplier.id === id ? data : supplier));
      toast.success('Поставщик обновлен');
      return data;
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast.error('Ошибка при обновлении поставщика');
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
      toast.success('Поставщик удален');
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Ошибка при удалении поставщика');
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [user]);

  return {
    suppliers,
    loading,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    refetch: fetchSuppliers
  };
}