import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface SupplierPhone {
  number: string;
  type: 'mobile' | 'landline';
  messenger?: 'whatsapp' | 'telegram' | 'viber' | 'none' | '';
}

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  categories: string[];
  location?: string;
  email?: string;
  rating?: number;
  orders_count?: number;
  status: string;
  entity_type: string;
  phones: SupplierPhone[];
  contact_person?: string;
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data?.map(supplier => ({
        ...supplier,
        phones: Array.isArray(supplier.phones) ? supplier.phones as unknown as SupplierPhone[] : []
      })) || []);
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
          phones: supplierData.phones as any,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      const formattedData = {
        ...data,
        phones: Array.isArray(data.phones) ? data.phones as unknown as SupplierPhone[] : []
      };
      setSuppliers(prev => [formattedData, ...prev]);
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
        .update({
          ...updates,
          phones: updates.phones as any
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const formattedData = {
        ...data,
        phones: Array.isArray(data.phones) ? data.phones as unknown as SupplierPhone[] : []
      };
      setSuppliers(prev => prev.map(supplier => supplier.id === id ? formattedData : supplier));
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