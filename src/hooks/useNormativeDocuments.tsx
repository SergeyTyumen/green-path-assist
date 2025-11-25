import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface NormativeDocument {
  id: string;
  user_id: string;
  name: string;
  document_number: string;
  document_type: string;
  year?: number;
  description?: string;
  document_url?: string;
  document_text?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useNormativeDocuments = () => {
  const [documents, setDocuments] = useState<NormativeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchDocuments = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('normative_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching normative documents:', error);
      toast.error('Ошибка загрузки нормативных документов');
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (docData: Omit<NormativeDocument, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('normative_documents')
        .insert([{ ...docData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchDocuments();
      toast.success('Нормативный документ добавлен');
      return data;
    } catch (error) {
      console.error('Error creating normative document:', error);
      toast.error('Ошибка создания нормативного документа');
      return null;
    }
  };

  const updateDocument = async (id: string, updates: Partial<NormativeDocument>) => {
    try {
      const { error } = await supabase
        .from('normative_documents')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchDocuments();
      toast.success('Нормативный документ обновлен');
    } catch (error) {
      console.error('Error updating normative document:', error);
      toast.error('Ошибка обновления нормативного документа');
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase
        .from('normative_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchDocuments();
      toast.success('Нормативный документ удален');
    } catch (error) {
      console.error('Error deleting normative document:', error);
      toast.error('Ошибка удаления нормативного документа');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  // Realtime подписка на изменения
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('normative-documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'normative_documents'
        },
        () => {
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    refetch: fetchDocuments
  };
};
