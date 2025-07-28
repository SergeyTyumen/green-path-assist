import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export interface Contractor {
  id: string;
  user_id: string;
  company_name: string;
  specialization: string[];
  phone?: string;
  description?: string;
  experience_years?: number;
  completed_projects?: number;
  rating?: number;
  verified?: boolean;
  portfolio_images?: string[];
  created_at: string;
  updated_at: string;
}

export const useContractors = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchContractors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contractor_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching contractors:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить подрядчиков",
          variant: "destructive",
        });
        return;
      }

      setContractors(data || []);
    } catch (error) {
      console.error("Error fetching contractors:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить подрядчиков",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createContractor = async (contractorData: Omit<Contractor, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Необходимо войти в систему",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("contractor_profiles")
        .insert({
          ...contractorData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating contractor:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать подрядчика",
          variant: "destructive",
        });
        return;
      }

      setContractors(prev => [data, ...prev]);
      toast({
        title: "Успешно",
        description: "Подрядчик создан",
      });
    } catch (error) {
      console.error("Error creating contractor:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать подрядчика",
        variant: "destructive",
      });
    }
  };

  const updateContractor = async (id: string, updates: Partial<Contractor>) => {
    try {
      const { data, error } = await supabase
        .from("contractor_profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating contractor:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось обновить подрядчика",
          variant: "destructive",
        });
        return;
      }

      setContractors(prev => 
        prev.map(contractor => 
          contractor.id === id ? data : contractor
        )
      );
      toast({
        title: "Успешно",
        description: "Подрядчик обновлен",
      });
    } catch (error) {
      console.error("Error updating contractor:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить подрядчика",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  return {
    contractors,
    loading,
    createContractor,
    updateContractor,
    refetch: fetchContractors,
  };
};