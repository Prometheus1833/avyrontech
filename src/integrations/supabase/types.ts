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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      domain_checks: {
        Row: {
          created_at: string
          domain: string
          id: string
          ip_hash: string | null
          name: string
          source: string | null
          status: string
          tld: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          ip_hash?: string | null
          name: string
          source?: string | null
          status: string
          tld: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          ip_hash?: string | null
          name?: string
          source?: string | null
          status?: string
          tld?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      example_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string
          source_category: string | null
          source_name: string | null
          source_slug: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone: string
          source_category?: string | null
          source_name?: string | null
          source_slug?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string
          source_category?: string | null
          source_name?: string | null
          source_slug?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      examples: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string
          display_url: string | null
          external_url: string | null
          has_internal_demo: boolean
          id: string
          image_path: string | null
          internal_demo_path: string | null
          name: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          description: string
          display_url?: string | null
          external_url?: string | null
          has_internal_demo?: boolean
          id?: string
          image_path?: string | null
          internal_demo_path?: string | null
          name: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          display_url?: string | null
          external_url?: string | null
          has_internal_demo?: boolean
          id?: string
          image_path?: string | null
          internal_demo_path?: string | null
          name?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string
          notes: string | null
          paid_at: string | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          action: string
          author_id: string
          created_at: string
          details: string | null
          id: string
          site_id: string
        }
        Insert: {
          action: string
          author_id: string
          created_at?: string
          details?: string | null
          id?: string
          site_id: string
        }
        Update: {
          action?: string
          author_id?: string
          created_at?: string
          details?: string | null
          id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "maintenance_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_sites: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          last_check_at: string | null
          next_check_at: string | null
          notes: string | null
          site_name: string
          site_url: string
          status: Database["public"]["Enums"]["maintenance_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          last_check_at?: string | null
          next_check_at?: string | null
          notes?: string | null
          site_name: string
          site_url: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          last_check_at?: string | null
          next_check_at?: string | null
          notes?: string | null
          site_name?: string
          site_url?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          updated_at?: string
        }
        Relationships: []
      }
      news_comments: {
        Row: {
          author_id: string
          author_name: string | null
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "news_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          author_id: string
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_stats: {
        Row: {
          avg_response_ms: number
          created_at: string
          id: string
          period_end: string
          period_start: string
          subscription_id: string
          unique_visitors: number
          uptime_percent: number
          user_id: string
          visits: number
        }
        Insert: {
          avg_response_ms?: number
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          subscription_id: string
          unique_visitors?: number
          uptime_percent?: number
          user_id: string
          visits?: number
        }
        Update: {
          avg_response_ms?: number
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          subscription_id?: string
          unique_visitors?: number
          uptime_percent?: number
          user_id?: string
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_stats_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          company_name: string | null
          created_at: string
          cui: string | null
          display_name: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          id: string
          language: string
          phone: string | null
          pseudonym: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_tiktok: string | null
          staff_role: Database["public"]["Enums"]["staff_role"] | null
          theme: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          cui?: string | null
          display_name?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id: string
          language?: string
          phone?: string | null
          pseudonym?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          staff_role?: Database["public"]["Enums"]["staff_role"] | null
          theme?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          cui?: string | null
          display_name?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          language?: string
          phone?: string | null
          pseudonym?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          staff_role?: Database["public"]["Enums"]["staff_role"] | null
          theme?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      project_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assignee_id: string | null
          budget_cents: number | null
          client_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          owner_id: string
          priority: Database["public"]["Enums"]["project_priority"]
          progress: number
          requirements: string | null
          status: Database["public"]["Enums"]["project_status"]
          subscription_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          budget_cents?: number | null
          client_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          owner_id: string
          priority?: Database["public"]["Enums"]["project_priority"]
          progress?: number
          requirements?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          subscription_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          budget_cents?: number | null
          client_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          owner_id?: string
          priority?: Database["public"]["Enums"]["project_priority"]
          progress?: number
          requirements?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          subscription_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["announcement_priority"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["announcement_priority"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["announcement_priority"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_chat_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          next_renewal_at: string | null
          price_cents: number
          product_name: string
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          next_renewal_at?: string | null
          price_cents?: number
          product_name: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          next_renewal_at?: string | null
          price_cents?: number
          product_name?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_staff_reply: boolean
          ticket_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_domain_checks: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      announcement_priority: "info" | "normal" | "important" | "critical"
      app_role: "user" | "staff" | "admin"
      billing_cycle: "monthly" | "quarterly" | "yearly" | "one_time"
      entity_type: "individual" | "srl" | "pfa" | "ii" | "other"
      invoice_status: "paid" | "pending" | "overdue" | "cancelled"
      maintenance_status:
        | "healthy"
        | "needs_attention"
        | "in_progress"
        | "offline"
        | "paused"
      project_priority: "low" | "medium" | "high" | "urgent"
      project_status:
        | "todo"
        | "in_progress"
        | "review"
        | "blocked"
        | "done"
        | "cancelled"
      staff_role: "dev" | "designer" | "marketing" | "support"
      subscription_status: "active" | "suspended" | "cancelled" | "pending"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
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
      announcement_priority: ["info", "normal", "important", "critical"],
      app_role: ["user", "staff", "admin"],
      billing_cycle: ["monthly", "quarterly", "yearly", "one_time"],
      entity_type: ["individual", "srl", "pfa", "ii", "other"],
      invoice_status: ["paid", "pending", "overdue", "cancelled"],
      maintenance_status: [
        "healthy",
        "needs_attention",
        "in_progress",
        "offline",
        "paused",
      ],
      project_priority: ["low", "medium", "high", "urgent"],
      project_status: [
        "todo",
        "in_progress",
        "review",
        "blocked",
        "done",
        "cancelled",
      ],
      staff_role: ["dev", "designer", "marketing", "support"],
      subscription_status: ["active", "suspended", "cancelled", "pending"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const
