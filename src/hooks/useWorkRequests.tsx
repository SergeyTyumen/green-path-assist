import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface WorkRequest {
  id: string;
  user_id: string;
  project_id: string;
  request_type: string;
  title: string;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  urgency: string;
  status: string;
  assigned_to?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolution_comment?: string | null;
  created_at: string;
  updated_at: string;
}

export const useWorkRequests = (projectId?: string) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("work_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching work requests:", error);
      toast.error("Ошибка загрузки заявок");
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (
    requestData: Omit<WorkRequest, "id" | "user_id" | "created_at" | "updated_at">
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("work_requests")
        .insert([{ ...requestData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setRequests([data, ...requests]);
      toast.success("Заявка создана");
      return data;
    } catch (error: any) {
      console.error("Error creating request:", error);
      toast.error("Ошибка создания заявки");
      throw error;
    }
  };

  const updateRequest = async (id: string, updates: Partial<WorkRequest>) => {
    try {
      const { data, error } = await supabase
        .from("work_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setRequests(requests.map((r) => (r.id === id ? data : r)));
      toast.success("Заявка обновлена");
      return data;
    } catch (error: any) {
      console.error("Error updating request:", error);
      toast.error("Ошибка обновления заявки");
      throw error;
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from("work_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setRequests(requests.filter((r) => r.id !== id));
      toast.success("Заявка удалена");
    } catch (error: any) {
      console.error("Error deleting request:", error);
      toast.error("Ошибка удаления заявки");
      throw error;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, projectId]);

  return {
    requests,
    loading,
    createRequest,
    updateRequest,
    deleteRequest,
    refetch: fetchRequests,
  };
};
