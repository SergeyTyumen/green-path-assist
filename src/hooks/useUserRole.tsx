import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = "admin" | "manager" | "employee" | "master";

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) throw error;

        setRoles(data?.map((r) => r.role as UserRole) || []);
      } catch (error) {
        console.error("Error fetching user roles:", error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: UserRole) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const isManager = hasRole("manager");
  const isMaster = hasRole("master");
  const isEmployee = hasRole("employee");

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isManager,
    isMaster,
    isEmployee,
  };
};
