import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ProjectAssignment {
  id: string;
  project_id: string;
  worker_id: string;
  role_on_project: string;
  assigned_at: string;
  assigned_by: string;
  removed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useProjectAssignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("project_assignments")
        .select("*")
        .eq("worker_id", user.id)
        .is("removed_at", null)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error: any) {
      console.error("Error fetching project assignments:", error);
      toast.error("Ошибка загрузки назначений");
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (
    assignmentData: Omit<ProjectAssignment, "id" | "created_at" | "updated_at" | "assigned_by">
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("project_assignments")
        .insert([{ ...assignmentData, assigned_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      setAssignments([data, ...assignments]);
      toast.success("Мастер назначен на проект");
      return data;
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      toast.error("Ошибка назначения мастера");
      throw error;
    }
  };

  const removeAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("project_assignments")
        .update({ removed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setAssignments(assignments.filter((a) => a.id !== id));
      toast.success("Назначение отменено");
    } catch (error: any) {
      console.error("Error removing assignment:", error);
      toast.error("Ошибка отмены назначения");
      throw error;
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  return {
    assignments,
    loading,
    createAssignment,
    removeAssignment,
    refetch: fetchAssignments,
  };
};
