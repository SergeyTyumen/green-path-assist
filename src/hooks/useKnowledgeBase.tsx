import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface KnowledgeBaseItem {
  id: string;
  user_id: string;
  category: string;
  topic: string;
  content: string;
  keywords: string[];
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useKnowledgeBase() {
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchKnowledgeBase = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      toast.error('Ошибка при загрузке базы знаний');
    } finally {
      setLoading(false);
    }
  };

  const createItem = async (itemData: Omit<KnowledgeBaseItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .insert({
          ...itemData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      setItems(prev => [data, ...prev]);
      toast.success('Элемент базы знаний добавлен');
      return data;
    } catch (error) {
      console.error('Error creating knowledge base item:', error);
      toast.error('Ошибка при добавлении элемента');
    }
  };

  const updateItem = async (id: string, updates: Partial<KnowledgeBaseItem>) => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error('Элемент не найден');
        return;
      }
      
      setItems(prev => prev.map(item => item.id === id ? data : item));
      toast.success('Элемент базы знаний обновлен');
      return data;
    } catch (error) {
      console.error('Error updating knowledge base item:', error);
      toast.error('Ошибка при обновлении элемента');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Элемент базы знаний удален');
    } catch (error) {
      console.error('Error deleting knowledge base item:', error);
      toast.error('Ошибка при удалении элемента');
    }
  };

  useEffect(() => {
    fetchKnowledgeBase();
  }, [user]);

  return {
    items,
    loading,
    createItem,
    updateItem,
    deleteItem,
    refetch: fetchKnowledgeBase
  };
}