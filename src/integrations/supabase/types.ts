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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string
          fetched_at: string
          id: string
          rate: number
          target_currency: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          fetched_at?: string
          id?: string
          rate: number
          target_currency: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          fetched_at?: string
          id?: string
          rate?: number
          target_currency?: string
        }
        Relationships: []
      }
      measurement_profiles: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          measurements: Json
          org_id: string
          profile_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          measurements?: Json
          org_id: string
          profile_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          measurements?: Json
          org_id?: string
          profile_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          order_id: string | null
          org_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          order_id?: string | null
          org_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string | null
          org_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          description: string | null
          fabric_details: string | null
          id: string
          measurements: Json | null
          name: string
          order_id: string
          quantity: number
          status: Database["public"]["Enums"]["order_status"]
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          fabric_details?: string | null
          id?: string
          measurements?: Json | null
          name: string
          order_id: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          fabric_details?: string | null
          id?: string
          measurements?: Json | null
          name?: string
          order_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          note: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number | null
          assigned_tailor_id: string | null
          created_at: string
          currency: string
          customer_id: string
          deposit_amount: number | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          order_number: string
          org_id: string
          payment_status: string
          status: Database["public"]["Enums"]["order_status"]
          title: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          assigned_tailor_id?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          deposit_amount?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          org_id: string
          payment_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          title: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          assigned_tailor_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          deposit_amount?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          org_id?: string
          payment_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          title?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_name: string
          key_value: string
          org_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_name: string
          key_value: string
          org_id: string
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_name?: string
          key_value?: string
          org_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          current_period_end: string
          current_period_start: string
          gateway_customer_id: string | null
          gateway_subscription_id: string | null
          id: string
          org_id: string
          payment_gateway: string | null
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          org_id: string
          payment_gateway?: string | null
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          org_id?: string
          payment_gateway?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          email: string | null
          id: string
          invoice_address: string | null
          invoice_logo_url: string | null
          invoice_notes: string | null
          invoice_payment_terms: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          email?: string | null
          id?: string
          invoice_address?: string | null
          invoice_logo_url?: string | null
          invoice_notes?: string | null
          invoice_payment_terms?: string | null
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          email?: string | null
          id?: string
          invoice_address?: string | null
          invoice_logo_url?: string | null
          invoice_notes?: string | null
          invoice_payment_terms?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway_checkout_url: string | null
          gateway_payment_id: string | null
          id: string
          notes: string | null
          order_id: string
          org_id: string
          paid_at: string | null
          payment_gateway: string | null
          payment_method: string | null
          payment_type: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gateway_checkout_url?: string | null
          gateway_payment_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          org_id: string
          paid_at?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          payment_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway_checkout_url?: string | null
          gateway_payment_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          org_id?: string
          paid_at?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          payment_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          created_at: string
          current_org_id: string | null
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          current_org_id?: string | null
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          current_org_id?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_org_id_fkey"
            columns: ["current_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          max_customers: number | null
          max_members: number | null
          max_orders: number | null
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_customers?: number | null
          max_members?: number | null
          max_orders?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_customers?: number | null
          max_members?: number | null
          max_orders?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_own_profile: { Args: { profile_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "org_admin" | "tailor" | "customer"
      order_status:
        | "pending"
        | "confirmed"
        | "measuring"
        | "cutting"
        | "sewing"
        | "fitting"
        | "completed"
        | "delivered"
        | "cancelled"
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
      app_role: ["super_admin", "org_admin", "tailor", "customer"],
      order_status: [
        "pending",
        "confirmed",
        "measuring",
        "cutting",
        "sewing",
        "fitting",
        "completed",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
