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
      ai_measurement_bookings: {
        Row: {
          actual_duration_minutes: number | null
          additional_hour_rate: number
          booking_status: string
          created_at: string
          currency: string
          customer_id: string
          ended_at: string | null
          first_hour_rate: number
          gateway_checkout_url: string | null
          gateway_reference: string | null
          hours_booked: number
          id: string
          local_amount: number | null
          local_currency: string | null
          measurements_captured: Json | null
          org_id: string
          org_share_amount: number
          org_share_percent: number
          paid_at: string | null
          payment_gateway: string | null
          payment_status: string
          platform_share_amount: number
          platform_share_percent: number
          scheduled_at: string | null
          session_notes: string | null
          session_type: string
          started_at: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          actual_duration_minutes?: number | null
          additional_hour_rate?: number
          booking_status?: string
          created_at?: string
          currency?: string
          customer_id: string
          ended_at?: string | null
          first_hour_rate?: number
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          hours_booked?: number
          id?: string
          local_amount?: number | null
          local_currency?: string | null
          measurements_captured?: Json | null
          org_id: string
          org_share_amount?: number
          org_share_percent?: number
          paid_at?: string | null
          payment_gateway?: string | null
          payment_status?: string
          platform_share_amount?: number
          platform_share_percent?: number
          scheduled_at?: string | null
          session_notes?: string | null
          session_type?: string
          started_at?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          actual_duration_minutes?: number | null
          additional_hour_rate?: number
          booking_status?: string
          created_at?: string
          currency?: string
          customer_id?: string
          ended_at?: string | null
          first_hour_rate?: number
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          hours_booked?: number
          id?: string
          local_amount?: number | null
          local_currency?: string | null
          measurements_captured?: Json | null
          org_id?: string
          org_share_amount?: number
          org_share_percent?: number
          paid_at?: string | null
          payment_gateway?: string | null
          payment_status?: string
          platform_share_amount?: number
          platform_share_percent?: number
          scheduled_at?: string | null
          session_notes?: string | null
          session_type?: string
          started_at?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_measurement_bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_registrations: {
        Row: {
          created_at: string
          fee_amount: number
          fee_currency: string
          gateway_checkout_url: string | null
          gateway_reference: string | null
          id: string
          local_amount: number | null
          local_currency: string | null
          org_id: string
          paid_at: string | null
          payment_gateway: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fee_amount?: number
          fee_currency?: string
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          id?: string
          local_amount?: number | null
          local_currency?: string | null
          org_id: string
          paid_at?: string | null
          payment_gateway?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fee_amount?: number
          fee_currency?: string
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          id?: string
          local_amount?: number | null
          local_currency?: string | null
          org_id?: string
          paid_at?: string | null
          payment_gateway?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_registrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      message_logs: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          error_message: string | null
          event_type: string
          external_id: string | null
          id: string
          order_id: string | null
          org_id: string
          recipient_contact: string | null
          recipient_id: string
          recipient_type: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          error_message?: string | null
          event_type: string
          external_id?: string | null
          id?: string
          order_id?: string | null
          org_id: string
          recipient_contact?: string | null
          recipient_id: string
          recipient_type: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          error_message?: string | null
          event_type?: string
          external_id?: string | null
          id?: string
          order_id?: string | null
          org_id?: string
          recipient_contact?: string | null
          recipient_id?: string
          recipient_type?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_org_id_fkey"
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
          admin_fee_amount: number
          admin_fee_percent: number
          amount_paid: number | null
          assigned_tailor_id: string | null
          created_at: string
          currency: string
          customer_id: string
          customer_total: number
          deposit_amount: number | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          order_number: string
          org_id: string
          payment_status: string
          platform_fee_amount: number
          platform_fee_percent: number
          status: Database["public"]["Enums"]["order_status"]
          title: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          admin_fee_amount?: number
          admin_fee_percent?: number
          amount_paid?: number | null
          assigned_tailor_id?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          customer_total?: number
          deposit_amount?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          org_id: string
          payment_status?: string
          platform_fee_amount?: number
          platform_fee_percent?: number
          status?: Database["public"]["Enums"]["order_status"]
          title: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          admin_fee_amount?: number
          admin_fee_percent?: number
          amount_paid?: number | null
          assigned_tailor_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          customer_total?: number
          deposit_amount?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          org_id?: string
          payment_status?: string
          platform_fee_amount?: number
          platform_fee_percent?: number
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
      org_catalogue_items: {
        Row: {
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          org_id: string
          price: number | null
          sort_order: number
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          org_id: string
          price?: number | null
          sort_order?: number
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          org_id?: string
          price?: number | null
          sort_order?: number
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_catalogue_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_consultations: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          message: string | null
          notes: string | null
          org_id: string
          preferred_date: string | null
          preferred_time: string | null
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          message?: string | null
          notes?: string | null
          org_id: string
          preferred_date?: string | null
          preferred_time?: string | null
          service_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          message?: string | null
          notes?: string | null
          org_id?: string
          preferred_date?: string | null
          preferred_time?: string | null
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_consultations_org_id_fkey"
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
      org_notification_settings: {
        Row: {
          brand_color: string | null
          created_at: string
          email_enabled: boolean
          email_footer_text: string | null
          id: string
          notify_assigned_tailor: boolean
          notify_customer: boolean
          notify_org_admin: boolean
          org_id: string
          sms_enabled: boolean
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          email_enabled?: boolean
          email_footer_text?: string | null
          id?: string
          notify_assigned_tailor?: boolean
          notify_customer?: boolean
          notify_org_admin?: boolean
          org_id: string
          sms_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          email_enabled?: boolean
          email_footer_text?: string | null
          id?: string
          notify_assigned_tailor?: boolean
          notify_customer?: boolean
          notify_org_admin?: boolean
          org_id?: string
          sms_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_notification_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
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
          is_trial: boolean
          org_id: string
          payment_gateway: string | null
          plan_id: string
          status: string
          trial_ends_at: string | null
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
          is_trial?: boolean
          org_id: string
          payment_gateway?: string | null
          plan_id: string
          status?: string
          trial_ends_at?: string | null
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
          is_trial?: boolean
          org_id?: string
          payment_gateway?: string | null
          plan_id?: string
          status?: string
          trial_ends_at?: string | null
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
      org_websites: {
        Row: {
          accent_color: string | null
          api_key: string | null
          api_secret: string | null
          brand_color: string | null
          created_at: string
          facebook_url: string | null
          hero_description: string | null
          hero_image_url: string | null
          id: string
          instagram_url: string | null
          is_enabled: boolean
          mode: string
          org_id: string
          tagline: string | null
          theme: string
          updated_at: string
          webhook_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          accent_color?: string | null
          api_key?: string | null
          api_secret?: string | null
          brand_color?: string | null
          created_at?: string
          facebook_url?: string | null
          hero_description?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_enabled?: boolean
          mode?: string
          org_id: string
          tagline?: string | null
          theme?: string
          updated_at?: string
          webhook_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          accent_color?: string | null
          api_key?: string | null
          api_secret?: string | null
          brand_color?: string | null
          created_at?: string
          facebook_url?: string | null
          hero_description?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_enabled?: boolean
          mode?: string
          org_id?: string
          tagline?: string | null
          theme?: string
          updated_at?: string
          webhook_url?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_websites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
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
          invite_code: string
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
          invite_code?: string
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
          invite_code?: string
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
          admin_fee_amount: number
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
          platform_fee_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          admin_fee_amount?: number
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
          platform_fee_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          admin_fee_amount?: number
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
          platform_fee_amount?: number
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
      platform_fee_ledger: {
        Row: {
          amount: number
          created_at: string
          currency: string
          fee_type: string
          id: string
          order_id: string | null
          org_id: string
          payment_id: string | null
          settled_at: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          fee_type: string
          id?: string
          order_id?: string | null
          org_id: string
          payment_id?: string | null
          settled_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          fee_type?: string
          id?: string
          order_id?: string | null
          org_id?: string
          payment_id?: string | null
          settled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_fee_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
          trial_days: number
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
          trial_days?: number
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
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          due_reminder_email: boolean
          due_reminder_sms: boolean
          due_reminder_whatsapp: boolean
          id: string
          order_status_email: boolean
          order_status_sms: boolean
          order_status_whatsapp: boolean
          org_id: string
          payment_email: boolean
          payment_sms: boolean
          payment_whatsapp: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_reminder_email?: boolean
          due_reminder_sms?: boolean
          due_reminder_whatsapp?: boolean
          id?: string
          order_status_email?: boolean
          order_status_sms?: boolean
          order_status_whatsapp?: boolean
          org_id: string
          payment_email?: boolean
          payment_sms?: boolean
          payment_whatsapp?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_reminder_email?: boolean
          due_reminder_sms?: boolean
          due_reminder_whatsapp?: boolean
          id?: string
          order_status_email?: boolean
          order_status_sms?: boolean
          order_status_whatsapp?: boolean
          org_id?: string
          payment_email?: boolean
          payment_sms?: boolean
          payment_whatsapp?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
