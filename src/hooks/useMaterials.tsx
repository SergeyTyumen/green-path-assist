import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Material {
  id: string;
  user_id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  min_stock: number;
  supplier?: string;
  created_at: string;
  updated_at: string;
  last_updated: string;
}

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMaterials = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Ошибка при загрузке материалов');
    } finally {
      setLoading(false);
    }
  };

  const createMaterial = async (materialData: Omit<Material, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_updated'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('materials')
        .insert({
          ...materialData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      setMaterials(prev => [data, ...prev]);
      toast.success('Материал добавлен');
      return data;
    } catch (error) {
      console.error('Error creating material:', error);
      toast.error('Ошибка при добавлении материала');
    }
  };

  const updateMaterial = async (id: string, updates: Partial<Material>) => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setMaterials(prev => prev.map(material => material.id === id ? data : material));
      toast.success('Материал обновлен');
      return data;
    } catch (error) {
      console.error('Error updating material:', error);
      toast.error('Ошибка при обновлении материала');
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMaterials(prev => prev.filter(material => material.id !== id));
      toast.success('Материал удален');
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Ошибка при удалении материала');
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [user]);

  return {
    materials,
    loading,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    refetch: fetchMaterials
  };
}