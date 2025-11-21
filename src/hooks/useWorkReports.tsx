import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface WorkReport {
  id: string;
  user_id: string;
  task_id?: string | null;
  project_id: string;
  report_type: string;
  description?: string | null;
  photos: string[];
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
  created_at: string;
  updated_at: string;
}

export const useWorkReports = (projectId?: string) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("work_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      console.error("Error fetching work reports:", error);
      toast.error("Ошибка загрузки отчетов");
    } finally {
      setLoading(false);
    }
  };

  const createReport = async (
    reportData: Omit<WorkReport, "id" | "user_id" | "created_at" | "updated_at">
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("work_reports")
        .insert([{ ...reportData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setReports([data, ...reports]);
      toast.success("Отчет создан");
      return data;
    } catch (error: any) {
      console.error("Error creating report:", error);
      toast.error("Ошибка создания отчета");
      throw error;
    }
  };

  const updateReport = async (id: string, updates: Partial<WorkReport>) => {
    try {
      const { data, error } = await supabase
        .from("work_reports")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setReports(reports.map((r) => (r.id === id ? data : r)));
      toast.success("Отчет обновлен");
      return data;
    } catch (error: any) {
      console.error("Error updating report:", error);
      toast.error("Ошибка обновления отчета");
      throw error;
    }
  };

  const deleteReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from("work_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setReports(reports.filter((r) => r.id !== id));
      toast.success("Отчет удален");
    } catch (error: any) {
      console.error("Error deleting report:", error);
      toast.error("Ошибка удаления отчета");
      throw error;
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user, projectId]);

  return {
    reports,
    loading,
    createReport,
    updateReport,
    deleteReport,
    refetch: fetchReports,
  };
};
