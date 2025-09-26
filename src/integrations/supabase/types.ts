export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_assistant_settings: {
        Row: {
          assistant_type: string
          created_at: string
          id: string
          is_active: boolean
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          assistant_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          assistant_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_prompts: {
        Row: {
          assistant_type: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          prompt_type: string
          updated_at: string
          user_id: string
          variables: Json | null
        }
        Insert: {
          assistant_type: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          prompt_type?: string
          updated_at?: string
          user_id: string
          variables?: Json | null
        }
        Update: {
          assistant_type?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          prompt_type?: string
          updated_at?: string
          user_id?: string
          variables?: Json | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      channel_accounts: {
        Row: {
          channel_id: string
          created_at: string
          display_name: string
          external_account_id: string
          id: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          display_name: string
          external_account_id: string
          id?: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          display_name?: string
          external_account_id?: string
          id?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_accounts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string
          credentials: Json | null
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials?: Json | null
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_comments: {
        Row: {
          author_name: string
          client_id: string
          comment_type: string
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          author_name: string
          client_id: string
          comment_type?: string
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          author_name?: string
          client_id?: string
          comment_type?: string
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_comments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_stages: {
        Row: {
          client_id: string
          completed: boolean | null
          completed_date: string | null
          created_at: string | null
          id: string
          stage_name: string
          stage_order: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          completed?: boolean | null
          completed_date?: string | null
          created_at?: string | null
          id?: string
          stage_name: string
          stage_order: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          completed?: boolean | null
          completed_date?: string | null
          created_at?: string | null
          id?: string
          stage_name?: string
          stage_order?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_stages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          budget: number | null
          campaign_id: string | null
          conversion_stage: string | null
          created_at: string
          email: string | null
          id: string
          last_contact: string | null
          lead_quality_score: number | null
          lead_source: string | null
          lead_source_details: Json | null
          name: string
          next_action: string | null
          notes: string | null
          phone: string
          project_area: number | null
          project_description: string | null
          referrer_url: string | null
          services: string[]
          stage_changed_at: string | null
          status: string
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          address?: string | null
          budget?: number | null
          campaign_id?: string | null
          conversion_stage?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact?: string | null
          lead_quality_score?: number | null
          lead_source?: string | null
          lead_source_details?: Json | null
          name: string
          next_action?: string | null
          notes?: string | null
          phone: string
          project_area?: number | null
          project_description?: string | null
          referrer_url?: string | null
          services?: string[]
          stage_changed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          address?: string | null
          budget?: number | null
          campaign_id?: string | null
          conversion_stage?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact?: string | null
          lead_quality_score?: number | null
          lead_source?: string | null
          lead_source_details?: Json | null
          name?: string
          next_action?: string | null
          notes?: string | null
          phone?: string
          project_area?: number | null
          project_description?: string | null
          referrer_url?: string | null
          services?: string[]
          stage_changed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      closed_deals: {
        Row: {
          client_id: string
          client_name: string
          closure_date: string
          closure_reason: string
          created_at: string
          deal_amount: number | null
          id: string
          notes: string | null
          project_area: number | null
          services: string[] | null
          user_id: string
        }
        Insert: {
          client_id: string
          client_name: string
          closure_date?: string
          closure_reason: string
          created_at?: string
          deal_amount?: number | null
          id?: string
          notes?: string | null
          project_area?: number | null
          services?: string[] | null
          user_id: string
        }
        Update: {
          client_id?: string
          client_name?: string
          closure_date?: string
          closure_reason?: string
          created_at?: string
          deal_amount?: number | null
          id?: string
          notes?: string | null
          project_area?: number | null
          services?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      consultant_knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_identities: {
        Row: {
          channel_id: string
          contact_id: string
          created_at: string
          external_user_id: string
          id: string
          meta: Json | null
        }
        Insert: {
          channel_id: string
          contact_id: string
          created_at?: string
          external_user_id: string
          id?: string
          meta?: Json | null
        }
        Update: {
          channel_id?: string
          contact_id?: string
          created_at?: string
          external_user_id?: string
          id?: string
          meta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_identities_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_identities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
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
      contracts: {
        Row: {
          amount: number | null
          client_id: string | null
          content: string | null
          created_at: string
          id: string
          sent_at: string | null
          signed_at: string | null
          status: string
          template_name: string
          title: string
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          amount?: number | null
          client_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          sent_at?: string | null
          signed_at?: string | null
          status?: string
          template_name?: string
          title: string
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          amount?: number | null
          client_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          sent_at?: string | null
          signed_at?: string | null
          status?: string
          template_name?: string
          title?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assigned_to: string | null
          channel_account_id: string
          channel_id: string
          contact_id: string
          created_at: string
          id: string
          last_message_at: string | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          channel_account_id: string
          channel_id: string
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          channel_account_id?: string
          channel_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_channel_account_id_fkey"
            columns: ["channel_account_id"]
            isOneToOne: false
            referencedRelation: "channel_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sends: {
        Row: {
          created_at: string
          delivered_at: string | null
          document_id: string
          document_type: string
          error_message: string | null
          id: string
          recipient_contact: string
          recipient_id: string
          recipient_type: string
          send_method: string
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          document_id: string
          document_type: string
          error_message?: string | null
          id?: string
          recipient_contact: string
          recipient_id: string
          recipient_type: string
          send_method: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          document_id?: string
          document_type?: string
          error_message?: string | null
          id?: string
          recipient_contact?: string
          recipient_id?: string
          recipient_type?: string
          send_method?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
      message_attachments: {
        Row: {
          created_at: string
          id: string
          message_id: string
          mime_type: string | null
          size: number | null
          storage_key: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          mime_type?: string | null
          size?: number | null
          storage_key: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          mime_type?: string | null
          size?: number | null
          storage_key?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_user_id: string | null
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          id: string
          payload: Json | null
          provider: string
          provider_message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string
          text: string | null
          updated_at: string
        }
        Insert: {
          author_user_id?: string | null
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          id?: string
          payload?: Json | null
          provider: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          text?: string | null
          updated_at?: string
        }
        Update: {
          author_user_id?: string | null
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          id?: string
          payload?: Json | null
          provider?: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
      outbox_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          message_id: string
          next_retry_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          message_id: string
          next_retry_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          message_id?: string
          next_retry_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbox_queue_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          advanced_features: Json | null
          ai_settings: Json | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          company_name: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          interaction_mode: string | null
          invitation_token: string | null
          invited_at: string | null
          invited_by: string | null
          phone: string | null
          position: string | null
          preferred_ai_model: string | null
          status: string | null
          telegram_username: string | null
          updated_at: string
          user_id: string
          user_type: string | null
          voice_settings: Json | null
          whatsapp_phone: string | null
        }
        Insert: {
          advanced_features?: Json | null
          ai_settings?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          interaction_mode?: string | null
          invitation_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          phone?: string | null
          position?: string | null
          preferred_ai_model?: string | null
          status?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
          voice_settings?: Json | null
          whatsapp_phone?: string | null
        }
        Update: {
          advanced_features?: Json | null
          ai_settings?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          interaction_mode?: string | null
          invitation_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          phone?: string | null
          position?: string | null
          preferred_ai_model?: string | null
          status?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
          voice_settings?: Json | null
          whatsapp_phone?: string | null
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
      saved_object_descriptions: {
        Row: {
          client_name: string | null
          created_at: string
          id: string
          name: string
          object_address: string | null
          object_description: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          id?: string
          name: string
          object_address?: string | null
          object_description?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          id?: string
          name?: string
          object_address?: string | null
          object_description?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      task_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          task_id?: string
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
          is_public: boolean | null
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
          is_public?: boolean | null
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
          is_public?: boolean | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      technical_specifications: {
        Row: {
          acceptance_criteria: string | null
          additional_requirements: string | null
          client_name: string | null
          created_at: string
          id: string
          materials_spec: Json | null
          normative_references: Json | null
          object_address: string | null
          object_description: string | null
          quality_requirements: string | null
          safety_requirements: string | null
          status: string
          timeline: string | null
          title: string
          updated_at: string
          user_id: string
          work_scope: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          additional_requirements?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          materials_spec?: Json | null
          normative_references?: Json | null
          object_address?: string | null
          object_description?: string | null
          quality_requirements?: string | null
          safety_requirements?: string | null
          status?: string
          timeline?: string | null
          title: string
          updated_at?: string
          user_id: string
          work_scope?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          additional_requirements?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          materials_spec?: Json | null
          normative_references?: Json | null
          object_address?: string | null
          object_description?: string | null
          quality_requirements?: string | null
          safety_requirements?: string | null
          status?: string
          timeline?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          work_scope?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string
          created_by: string
          id: string
          module_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          created_by: string
          id?: string
          module_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          created_by?: string
          id?: string
          module_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_push_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_registration_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
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
          command: string | null
          conversation_context: Json | null
          created_at: string
          execution_result: Json | null
          id: string
          parsed_entities: Json | null
          response: string | null
          status: string
          transcript: string
          updated_at: string
          user_id: string
          voice_text: string | null
        }
        Insert: {
          actions?: Json
          command?: string | null
          conversation_context?: Json | null
          created_at?: string
          execution_result?: Json | null
          id?: string
          parsed_entities?: Json | null
          response?: string | null
          status?: string
          transcript: string
          updated_at?: string
          user_id: string
          voice_text?: string | null
        }
        Update: {
          actions?: Json
          command?: string | null
          conversation_context?: Json | null
          created_at?: string
          execution_result?: Json | null
          id?: string
          parsed_entities?: Json | null
          response?: string | null
          status?: string
          transcript?: string
          updated_at?: string
          user_id?: string
          voice_text?: string | null
        }
        Relationships: []
      }
      webhook_log: {
        Row: {
          error_message: string | null
          id: string
          processing_status: string
          provider: string
          raw_data: Json
          received_at: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          processing_status?: string
          provider: string
          raw_data: Json
          received_at?: string
        }
        Update: {
          error_message?: string | null
          id?: string
          processing_status?: string
          provider?: string
          raw_data?: Json
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_create_tasks: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_user_delete_tasks: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_user_edit_tasks: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_user_view_tasks: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_module_permission: {
        Args: {
          _module_name: string
          _permission_type: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_contacts_owner: {
        Args: { contact_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
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
      app_role: ["admin", "manager", "employee"],
    },
  },
} as const
