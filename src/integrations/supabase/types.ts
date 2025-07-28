export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          budget: number | null
          created_at: string
          email: string | null
          id: string
          last_contact: string | null
          name: string
          next_action: string | null
          notes: string | null
          phone: string
          project_area: number | null
          services: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          budget?: number | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact?: string | null
          name: string
          next_action?: string | null
          notes?: string | null
          phone: string
          project_area?: number | null
          services?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          budget?: number | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact?: string | null
          name?: string
          next_action?: string | null
          notes?: string | null
          phone?: string
          project_area?: number | null
          services?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contractor_profiles: {
        Row: {
          company_name: string
          completed_projects: number | null
          created_at: string
          description: string | null
          experience_years: number | null
          id: string
          phone: string | null
          portfolio_images: string[] | null
          rating: number | null
          specialization: string[]
          updated_at: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          company_name: string
          completed_projects?: number | null
          created_at?: string
          description?: string | null
          experience_years?: number | null
          id?: string
          phone?: string | null
          portfolio_images?: string[] | null
          rating?: number | null
          specialization?: string[]
          updated_at?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          company_name?: string
          completed_projects?: number | null
          created_at?: string
          description?: string | null
          experience_years?: number | null
          id?: string
          phone?: string | null
          portfolio_images?: string[] | null
          rating?: number | null
          specialization?: string[]
          updated_at?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      estimate_items: {
        Row: {
          created_at: string
          estimate_id: string
          id: string
          material_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          estimate_id: string
          id?: string
          material_id?: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          estimate_id?: string
          id?: string
          material_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          status: string
          title: string
          total_amount: number
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          status?: string
          title: string
          total_amount?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          status?: string
          title?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          category: string
          characteristics: string | null
          created_at: string
          id: string
          last_updated: string
          min_stock: number
          name: string
          price: number
          properties: Json | null
          purpose: string | null
          stock: number
          supplier: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          characteristics?: string | null
          created_at?: string
          id?: string
          last_updated?: string
          min_stock?: number
          name: string
          price: number
          properties?: Json | null
          purpose?: string | null
          stock?: number
          supplier?: string | null
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          characteristics?: string | null
          created_at?: string
          id?: string
          last_updated?: string
          min_stock?: number
          name?: string
          price?: number
          properties?: Json | null
          purpose?: string | null
          stock?: number
          supplier?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      materials_norms: {
        Row: {
          active: boolean
          bulk_density: number | null
          created_at: string
          id: string
          name: string
          notes: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          bulk_density?: number | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          bulk_density?: number | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      norms: {
        Row: {
          active: boolean
          compaction_ratio: number
          created_at: string
          id: string
          mandatory: boolean
          material_id: string
          service_name: string
          thickness: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          compaction_ratio?: number
          created_at?: string
          id?: string
          mandatory?: boolean
          material_id: string
          service_name: string
          thickness?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          compaction_ratio?: number
          created_at?: string
          id?: string
          mandatory?: boolean
          material_id?: string
          service_name?: string
          thickness?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "norms_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials_norms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          user_type: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          area: number | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          object_type: string
          photo_url: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: number | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          object_type: string
          photo_url?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: number | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          object_type?: string
          photo_url?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          sent_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          client_id: string
          contractor_id: string | null
          created_at: string
          id: string
          message: string | null
          project_id: string
          proposed_price: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          contractor_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          project_id: string
          proposed_price?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          contractor_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string
          proposed_price?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          name: string
          price: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          name: string
          price: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          name?: string
          price?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smeta_items: {
        Row: {
          bulk_density: number | null
          calculated_quantity: number
          calculation_formula: string | null
          compaction_ratio: number | null
          created_at: string
          id: string
          material_name: string
          material_unit: string
          service_name: string
          service_quantity: number
          service_unit: string
          task_id: string | null
          thickness: number | null
          user_id: string
        }
        Insert: {
          bulk_density?: number | null
          calculated_quantity: number
          calculation_formula?: string | null
          compaction_ratio?: number | null
          created_at?: string
          id?: string
          material_name: string
          material_unit: string
          service_name: string
          service_quantity: number
          service_unit: string
          task_id?: string | null
          thickness?: number | null
          user_id: string
        }
        Update: {
          bulk_density?: number | null
          calculated_quantity?: number
          calculation_formula?: string | null
          compaction_ratio?: number | null
          created_at?: string
          id?: string
          material_name?: string
          material_unit?: string
          service_name?: string
          service_quantity?: number
          service_unit?: string
          task_id?: string | null
          thickness?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smeta_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          categories: string[]
          contact_person: string | null
          created_at: string
          email: string | null
          entity_type: string
          id: string
          location: string | null
          name: string
          orders_count: number | null
          phone: string | null
          phones: Json | null
          rating: number | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: string[]
          contact_person?: string | null
          created_at?: string
          email?: string | null
          entity_type?: string
          id?: string
          location?: string | null
          name: string
          orders_count?: number | null
          phone?: string | null
          phones?: Json | null
          rating?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: string[]
          contact_person?: string | null
          created_at?: string
          email?: string | null
          entity_type?: string
          id?: string
          location?: string | null
          name?: string
          orders_count?: number | null
          phone?: string | null
          phones?: Json | null
          rating?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          ai_agent: string | null
          assignee: string | null
          category: string
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_agent?: string | null
          assignee?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_agent?: string | null
          assignee?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_command_history: {
        Row: {
          actions: Json
          created_at: string
          execution_result: Json | null
          id: string
          parsed_entities: Json | null
          status: string
          transcript: string
          updated_at: string
          user_id: string
          voice_text: string | null
        }
        Insert: {
          actions?: Json
          created_at?: string
          execution_result?: Json | null
          id?: string
          parsed_entities?: Json | null
          status?: string
          transcript: string
          updated_at?: string
          user_id: string
          voice_text?: string | null
        }
        Update: {
          actions?: Json
          created_at?: string
          execution_result?: Json | null
          id?: string
          parsed_entities?: Json | null
          status?: string
          transcript?: string
          updated_at?: string
          user_id?: string
          voice_text?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "client" | "contractor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["client", "contractor", "admin"],
    },
  },
} as const
