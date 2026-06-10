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
      account_archives: {
        Row: {
          account_email: string | null
          account_id: string
          account_name: string | null
          account_type: string
          action: string
          archived_at: string
          archived_by: string
          archived_data: Json | null
          created_at: string
          expires_at: string
          id: string
          org_id: string | null
          reason: string | null
        }
        Insert: {
          account_email?: string | null
          account_id: string
          account_name?: string | null
          account_type: string
          action: string
          archived_at?: string
          archived_by: string
          archived_data?: Json | null
          created_at?: string
          expires_at?: string
          id?: string
          org_id?: string | null
          reason?: string | null
        }
        Update: {
          account_email?: string | null
          account_id?: string
          account_name?: string | null
          account_type?: string
          action?: string
          archived_at?: string
          archived_by?: string
          archived_data?: Json | null
          created_at?: string
          expires_at?: string
          id?: string
          org_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_archives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_archives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_archives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      account_health_reports: {
        Row: {
          checked_at: string
          checks: Json
          created_at: string
          id: string
          issues: string[]
          status: string
          subject_id: string
          subject_label: string | null
          subject_type: string
        }
        Insert: {
          checked_at?: string
          checks?: Json
          created_at?: string
          id?: string
          issues?: string[]
          status: string
          subject_id: string
          subject_label?: string | null
          subject_type: string
        }
        Update: {
          checked_at?: string
          checks?: Json
          created_at?: string
          id?: string
          issues?: string[]
          status?: string
          subject_id?: string
          subject_label?: string | null
          subject_type?: string
        }
        Relationships: []
      }
      admin_support_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          org_id: string | null
          provider: string
          request_type: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          org_id?: string | null
          provider: string
          request_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          org_id?: string | null
          provider?: string
          request_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_support_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_support_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_support_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_job_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          credits_cost: number
          credits_deducted: boolean
          error_message: string | null
          id: string
          input_data: Json
          job_type: string
          max_retries: number
          next_retry_at: string | null
          org_id: string
          priority: number
          result_data: Json | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credits_cost?: number
          credits_deducted?: boolean
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type: string
          max_retries?: number
          next_retry_at?: string | null
          org_id: string
          priority?: number
          result_data?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credits_cost?: number
          credits_deducted?: boolean
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          max_retries?: number
          next_retry_at?: string | null
          org_id?: string
          priority?: number
          result_data?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_job_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_job_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_job_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
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
          {
            foreignKeyName: "ai_measurement_bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_measurement_bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      app_fee_settings: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          fee_type: string
          generation_fee: number
          id: string
          is_active: boolean | null
          monthly_fee: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          fee_type?: string
          generation_fee?: number
          id?: string
          is_active?: boolean | null
          monthly_fee?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          fee_type?: string
          generation_fee?: number
          id?: string
          is_active?: boolean | null
          monthly_fee?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          org_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          max_bookings_per_slot: number
          org_id: string
          slot_duration_minutes: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          max_bookings_per_slot?: number
          org_id: string
          slot_duration_minutes?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          max_bookings_per_slot?: number
          org_id?: string
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transfer_payments: {
        Row: {
          account_name: string | null
          amount: number
          auto_verified: boolean | null
          auto_verified_at: string | null
          bank_account_id: string | null
          bank_name: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          org_id: string | null
          proof_url: string | null
          purpose: string
          reference_id: string | null
          reference_type: string | null
          rejection_reason: string | null
          status: string
          transfer_reference: string | null
          updated_at: string
          user_id: string
          verification_method: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_name?: string | null
          amount: number
          auto_verified?: boolean | null
          auto_verified_at?: string | null
          bank_account_id?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          org_id?: string | null
          proof_url?: string | null
          purpose: string
          reference_id?: string | null
          reference_type?: string | null
          rejection_reason?: string | null
          status?: string
          transfer_reference?: string | null
          updated_at?: string
          user_id: string
          verification_method?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_name?: string | null
          amount?: number
          auto_verified?: boolean | null
          auto_verified_at?: string | null
          bank_account_id?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          org_id?: string | null
          proof_url?: string | null
          purpose?: string
          reference_id?: string | null
          reference_type?: string | null
          rejection_reason?: string | null
          status?: string
          transfer_reference?: string | null
          updated_at?: string
          user_id?: string
          verification_method?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transfer_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "platform_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfer_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfer_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfer_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_queries: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          org_id: string | null
          priority: string
          query_type: string
          related_order_id: string | null
          related_payment_id: string | null
          related_subscription_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          org_id?: string | null
          priority?: string
          query_type?: string
          related_order_id?: string | null
          related_payment_id?: string | null
          related_subscription_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          org_id?: string | null
          priority?: string
          query_type?: string
          related_order_id?: string | null
          related_payment_id?: string | null
          related_subscription_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_queries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_queries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_queries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_queries_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: string
          org_id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: string
          org_id: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: string
          org_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_dates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_dates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      call_billing_records: {
        Row: {
          billing_status: string
          call_log_id: string | null
          call_type: string
          caller_type: string
          caller_user_id: string
          charged_at: string | null
          created_at: string
          duration_seconds: number
          id: string
          metadata: Json | null
          org_id: string
          rate_per_minute: number
          refund_reason: string | null
          refunded_at: string | null
          total_credits_charged: number
          updated_at: string
          wallet_id: string | null
        }
        Insert: {
          billing_status?: string
          call_log_id?: string | null
          call_type?: string
          caller_type?: string
          caller_user_id: string
          charged_at?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          metadata?: Json | null
          org_id: string
          rate_per_minute?: number
          refund_reason?: string | null
          refunded_at?: string | null
          total_credits_charged?: number
          updated_at?: string
          wallet_id?: string | null
        }
        Update: {
          billing_status?: string
          call_log_id?: string | null
          call_type?: string
          caller_type?: string
          caller_user_id?: string
          charged_at?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          metadata?: Json | null
          org_id?: string
          rate_per_minute?: number
          refund_reason?: string | null
          refunded_at?: string | null
          total_credits_charged?: number
          updated_at?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_billing_records_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_billing_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_billing_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_billing_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_billing_records_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          answered_at: string | null
          call_sid: string | null
          caller_name: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          forwarded_to: string | null
          from_number: string
          id: string
          ivr_path: string[] | null
          notes: string | null
          org_id: string
          recording_sid: string | null
          recording_url: string | null
          started_at: string | null
          status: string
          thread_id: string | null
          to_number: string
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          call_sid?: string | null
          caller_name?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          forwarded_to?: string | null
          from_number: string
          id?: string
          ivr_path?: string[] | null
          notes?: string | null
          org_id: string
          recording_sid?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string
          thread_id?: string | null
          to_number: string
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          call_sid?: string | null
          caller_name?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          forwarded_to?: string | null
          from_number?: string
          id?: string
          ivr_path?: string[] | null
          notes?: string | null
          org_id?: string
          recording_sid?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string
          thread_id?: string | null
          to_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_routing_config: {
        Row: {
          created_at: string | null
          fallback_channel: string | null
          id: string
          is_active: boolean | null
          org_id: string | null
          primary_channel: string
          priority: number | null
          process_name: string
          provider: string
          routing_conditions: Json | null
          secondary_channel: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fallback_channel?: string | null
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          primary_channel?: string
          priority?: number | null
          process_name: string
          provider?: string
          routing_conditions?: Json | null
          secondary_channel?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fallback_channel?: string | null
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          primary_channel?: string
          priority?: number | null
          process_name?: string
          provider?: string
          routing_conditions?: Json | null
          secondary_channel?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_routing_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_routing_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_routing_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      comms_provider_status: {
        Row: {
          balance_amount: number | null
          balance_currency: string | null
          created_at: string | null
          id: string
          last_checked_at: string | null
          latency_ms: number | null
          metadata: Json | null
          provider: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          balance_amount?: number | null
          balance_currency?: string | null
          created_at?: string | null
          id?: string
          last_checked_at?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          provider: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          balance_amount?: number | null
          balance_currency?: string | null
          created_at?: string | null
          id?: string
          last_checked_at?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          provider?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      comms_token_rates: {
        Row: {
          channel: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          provider: string | null
          tokens_per_unit: number
          unit_label: string
          updated_at: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string | null
          tokens_per_unit?: number
          unit_label?: string
          updated_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string | null
          tokens_per_unit?: number
          unit_label?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      comms_token_usage: {
        Row: {
          channel: string
          created_at: string | null
          description: string | null
          id: string
          org_id: string | null
          provider: string | null
          rate_applied: number
          reference_id: string | null
          tokens_consumed: number
          units_used: number
          user_id: string
          wallet_id: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          provider?: string | null
          rate_applied: number
          reference_id?: string | null
          tokens_consumed?: number
          units_used?: number
          user_id: string
          wallet_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          provider?: string | null
          rate_applied?: number
          reference_id?: string | null
          tokens_consumed?: number
          units_used?: number
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comms_token_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_token_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_token_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_token_usage_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      comms_usage_analytics: {
        Row: {
          call_minutes: number | null
          calls_made: number | null
          channel: string
          created_at: string | null
          currency: string | null
          id: string
          messages_delivered: number | null
          messages_failed: number | null
          messages_sent: number | null
          org_id: string | null
          period_end: string
          period_start: string
          provider: string
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          call_minutes?: number | null
          calls_made?: number | null
          channel: string
          created_at?: string | null
          currency?: string | null
          id?: string
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_sent?: number | null
          org_id?: string | null
          period_end: string
          period_start: string
          provider: string
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          call_minutes?: number | null
          calls_made?: number | null
          channel?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_sent?: number | null
          org_id?: string | null
          period_end?: string
          period_start?: string
          provider?: string
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comms_usage_analytics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_usage_analytics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_usage_analytics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_payments: {
        Row: {
          agency_fee_amount: number
          contract_id: string
          created_at: string
          currency: string
          customer_paid_amount: number
          id: string
          notes: string | null
          order_id: string | null
          org_id: string
          org_net_amount: number
          paid_at: string | null
          status: string
          tailor_id: string
          tailor_payout_amount: number
          updated_at: string
        }
        Insert: {
          agency_fee_amount?: number
          contract_id: string
          created_at?: string
          currency?: string
          customer_paid_amount?: number
          id?: string
          notes?: string | null
          order_id?: string | null
          org_id: string
          org_net_amount?: number
          paid_at?: string | null
          status?: string
          tailor_id: string
          tailor_payout_amount?: number
          updated_at?: string
        }
        Update: {
          agency_fee_amount?: number
          contract_id?: string
          created_at?: string
          currency?: string
          customer_paid_amount?: number
          id?: string
          notes?: string | null
          order_id?: string | null
          org_id?: string
          org_net_amount?: number
          paid_at?: string | null
          status?: string
          tailor_id?: string
          tailor_payout_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "tailor_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          expired: boolean
          expires_at: string | null
          feature_type: string | null
          id: string
          metadata: Json | null
          session_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          description?: string | null
          expired?: boolean
          expires_at?: string | null
          feature_type?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          type?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          expired?: boolean
          expires_at?: string | null
          feature_type?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          lifetime_purchased: number
          lifetime_used: number
          org_id: string | null
          owner_id: string
          owner_type: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          lifetime_purchased?: number
          lifetime_used?: number
          org_id?: string | null
          owner_id: string
          owner_type?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          lifetime_purchased?: number
          lifetime_used?: number
          org_id?: string | null
          owner_id?: string
          owner_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_wallets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_wallets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_wallets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "custom_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_invoices: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          discount_amount: number
          due_date: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          notes: string | null
          org_id: string | null
          paid_at: string | null
          payment_terms: string | null
          recipient_email: string | null
          recipient_name: string
          recipient_org_id: string | null
          recipient_type: string
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          notes?: string | null
          org_id?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          recipient_email?: string | null
          recipient_name: string
          recipient_org_id?: string | null
          recipient_type?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          notes?: string | null
          org_id?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          recipient_email?: string | null
          recipient_name?: string
          recipient_org_id?: string | null
          recipient_type?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_invoices_recipient_org_id_fkey"
            columns: ["recipient_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_invoices_recipient_org_id_fkey"
            columns: ["recipient_org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_invoices_recipient_org_id_fkey"
            columns: ["recipient_org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_opt_outs: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          opt_out_type: string
          opted_back_in_at: string | null
          opted_out_at: string
          opted_out_features: string[]
          org_id: string
          reason: string | null
          status: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          opt_out_type?: string
          opted_back_in_at?: string | null
          opted_out_at?: string
          opted_out_features?: string[]
          org_id: string
          reason?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          opt_out_type?: string
          opted_back_in_at?: string | null
          opted_out_at?: string
          opted_out_features?: string[]
          org_id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_opt_outs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_opt_outs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_opt_outs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
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
          {
            foreignKeyName: "customer_registrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_registrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reviews: {
        Row: {
          body: string | null
          catalogue_item_id: string | null
          created_at: string
          id: string
          is_published: boolean
          order_id: string | null
          org_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          catalogue_item_id?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          order_id?: string | null
          org_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          catalogue_item_id?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          order_id?: string | null
          org_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_reviews_catalogue_item_id_fkey"
            columns: ["catalogue_item_id"]
            isOneToOne: false
            referencedRelation: "org_catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_name: string
          price_amount: number
          price_currency: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_name?: string
          price_amount?: number
          price_currency?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_name?: string
          price_amount?: number
          price_currency?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_wishlists: {
        Row: {
          catalogue_item_id: string
          created_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          catalogue_item_id: string
          created_at?: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          catalogue_item_id?: string
          created_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_wishlists_catalogue_item_id_fkey"
            columns: ["catalogue_item_id"]
            isOneToOne: false
            referencedRelation: "org_catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_wishlists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_wishlists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_wishlists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_flags: {
        Row: {
          created_at: string
          description: string | null
          escalated_at: string | null
          flag_type: string
          id: string
          org_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          shipment_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          escalated_at?: string | null
          flag_type?: string
          id?: string
          org_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shipment_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          escalated_at?: string | null
          flag_type?: string
          id?: string
          org_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shipment_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_flags_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_jobs: {
        Row: {
          attempt: number
          created_at: string
          created_by: string | null
          id: string
          kind: string
          last_error: string | null
          last_run_at: string | null
          max_attempts: number
          next_attempt_at: string
          org_id: string | null
          payload: Json
          status: string
          updated_at: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          last_error?: string | null
          last_run_at?: string | null
          max_attempts?: number
          next_attempt_at?: string
          org_id?: string | null
          payload?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          attempt?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          last_run_at?: string | null
          max_attempts?: number
          next_attempt_at?: string
          org_id?: string | null
          payload?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployment_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployment_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      disclaimer_acknowledgments: {
        Row: {
          acknowledged_at: string
          acknowledgment_type: string
          context: string
          created_at: string
          disclaimer_version: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          acknowledgment_type?: string
          context?: string
          created_at?: string
          disclaimer_version?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          acknowledgment_type?: string
          context?: string
          created_at?: string
          disclaimer_version?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          ai_auto_resolved: boolean | null
          ai_classification: Json | null
          ai_recommendation: string | null
          ai_sentiment: string | null
          category: string | null
          compensation_amount: number | null
          compensation_currency: string | null
          compensation_type: string | null
          created_at: string
          description: string | null
          dispute_type: string
          escalated_at: string | null
          escalation_level: number | null
          evidence_urls: string[] | null
          filed_against: string | null
          filed_by: string
          id: string
          mediation_notes: string | null
          mediation_scheduled_at: string | null
          order_id: string | null
          org_id: string
          priority: string
          resolution_notes: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          shipment_id: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          ai_auto_resolved?: boolean | null
          ai_classification?: Json | null
          ai_recommendation?: string | null
          ai_sentiment?: string | null
          category?: string | null
          compensation_amount?: number | null
          compensation_currency?: string | null
          compensation_type?: string | null
          created_at?: string
          description?: string | null
          dispute_type?: string
          escalated_at?: string | null
          escalation_level?: number | null
          evidence_urls?: string[] | null
          filed_against?: string | null
          filed_by: string
          id?: string
          mediation_notes?: string | null
          mediation_scheduled_at?: string | null
          order_id?: string | null
          org_id: string
          priority?: string
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          ai_auto_resolved?: boolean | null
          ai_classification?: Json | null
          ai_recommendation?: string | null
          ai_sentiment?: string | null
          category?: string | null
          compensation_amount?: number | null
          compensation_currency?: string | null
          compensation_type?: string | null
          created_at?: string
          description?: string | null
          dispute_type?: string
          escalated_at?: string | null
          escalation_level?: number | null
          evidence_urls?: string[] | null
          filed_against?: string | null
          filed_by?: string
          id?: string
          mediation_notes?: string | null
          mediation_scheduled_at?: string | null
          order_id?: string | null
          org_id?: string
          priority?: string
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      dns_propagation_checks: {
        Row: {
          checked_at: string
          error: string | null
          found_values: Json
          id: string
          latency_ms: number | null
          matched: boolean
          record_id: string | null
          resolver: string
          resolver_label: string | null
        }
        Insert: {
          checked_at?: string
          error?: string | null
          found_values?: Json
          id?: string
          latency_ms?: number | null
          matched?: boolean
          record_id?: string | null
          resolver: string
          resolver_label?: string | null
        }
        Update: {
          checked_at?: string
          error?: string | null
          found_values?: Json
          id?: string
          latency_ms?: number | null
          matched?: boolean
          record_id?: string | null
          resolver?: string
          resolver_label?: string | null
        }
        Relationships: []
      }
      dns_record_audit: {
        Row: {
          created_at: string
          domain: string
          id: string
          name: string
          new_value: string | null
          old_value: string | null
          record_id: string | null
          record_type: string
          source: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          name: string
          new_value?: string | null
          old_value?: string | null
          record_id?: string | null
          record_type: string
          source?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          name?: string
          new_value?: string | null
          old_value?: string | null
          record_id?: string | null
          record_type?: string
          source?: string
        }
        Relationships: []
      }
      domain_requests: {
        Row: {
          annual_renewal_fee: number | null
          consent_given: boolean | null
          consent_given_at: string | null
          created_at: string | null
          dns_records: Json | null
          domain_name: string
          domain_type: string
          expires_at: string | null
          gateway_reference: string | null
          id: string
          notes: string | null
          org_id: string | null
          payment_status: string | null
          platform_price: number | null
          provisioned_at: string | null
          ssl_status: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          vendor: string | null
          vendor_price: number | null
        }
        Insert: {
          annual_renewal_fee?: number | null
          consent_given?: boolean | null
          consent_given_at?: string | null
          created_at?: string | null
          dns_records?: Json | null
          domain_name: string
          domain_type?: string
          expires_at?: string | null
          gateway_reference?: string | null
          id?: string
          notes?: string | null
          org_id?: string | null
          payment_status?: string | null
          platform_price?: number | null
          provisioned_at?: string | null
          ssl_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          vendor?: string | null
          vendor_price?: number | null
        }
        Update: {
          annual_renewal_fee?: number | null
          consent_given?: boolean | null
          consent_given_at?: string | null
          created_at?: string | null
          dns_records?: Json | null
          domain_name?: string
          domain_type?: string
          expires_at?: string | null
          gateway_reference?: string | null
          id?: string
          notes?: string | null
          org_id?: string | null
          payment_status?: string | null
          platform_price?: number | null
          provisioned_at?: string | null
          ssl_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          vendor?: string | null
          vendor_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_vendor_configs: {
        Row: {
          api_base_url: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          markup_percent: number | null
          min_price: number | null
          updated_at: string | null
          vendor_name: string
        }
        Insert: {
          api_base_url?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          markup_percent?: number | null
          min_price?: number | null
          updated_at?: string | null
          vendor_name: string
        }
        Update: {
          api_base_url?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          markup_percent?: number | null
          min_price?: number | null
          updated_at?: string | null
          vendor_name?: string
        }
        Relationships: []
      }
      download_tracking: {
        Row: {
          created_at: string
          credits_charged: number
          file_url: string | null
          id: string
          org_id: string
          resource_id: string | null
          resource_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_charged?: number
          file_url?: string | null
          id?: string
          org_id: string
          resource_id?: string | null
          resource_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_charged?: number
          file_url?: string | null
          id?: string
          org_id?: string
          resource_id?: string | null
          resource_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_tracking_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_tracking_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_tracking_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      embed_configurations: {
        Row: {
          allowed_domains: string[]
          branding_text: string | null
          created_at: string
          enabled_features: string[]
          id: string
          is_enabled: boolean
          org_id: string
          theme_config: Json
          updated_at: string
          widget_key: string
        }
        Insert: {
          allowed_domains?: string[]
          branding_text?: string | null
          created_at?: string
          enabled_features?: string[]
          id?: string
          is_enabled?: boolean
          org_id: string
          theme_config?: Json
          updated_at?: string
          widget_key?: string
        }
        Update: {
          allowed_domains?: string[]
          branding_text?: string | null
          created_at?: string
          enabled_features?: string[]
          id?: string
          is_enabled?: boolean
          org_id?: string
          theme_config?: Json
          updated_at?: string
          widget_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "embed_configurations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embed_configurations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embed_configurations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_summary"
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
      feature_access_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billing_type: string
          created_at: string
          description: string | null
          expires_at: string | null
          feature_key: string
          feature_name: string
          gateway_checkout_url: string | null
          gateway_reference: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          paid_at: string | null
          price_amount: number
          price_currency: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billing_type?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          feature_key: string
          feature_name: string
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          paid_at?: string | null
          price_amount?: number
          price_currency?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billing_type?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          feature_key?: string
          feature_name?: string
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          paid_at?: string | null
          price_amount?: number
          price_currency?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_access_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_access_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_access_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_product_slots: {
        Row: {
          amount_paid: number | null
          catalogue_item_id: string
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          org_id: string | null
          payment_status: string | null
          slot_type: string
          updated_at: string | null
          user_id: string
          user_role: string
          week_end: string
          week_start: string
        }
        Insert: {
          amount_paid?: number | null
          catalogue_item_id: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          payment_status?: string | null
          slot_type?: string
          updated_at?: string | null
          user_id: string
          user_role?: string
          week_end: string
          week_start: string
        }
        Update: {
          amount_paid?: number | null
          catalogue_item_id?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          payment_status?: string | null
          slot_type?: string
          updated_at?: string | null
          user_id?: string
          user_role?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_product_slots_catalogue_item_id_fkey"
            columns: ["catalogue_item_id"]
            isOneToOne: false
            referencedRelation: "org_catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_product_slots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_product_slots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_product_slots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_slot_config: {
        Row: {
          created_at: string | null
          free_slots_per_period: number
          id: string
          is_active: boolean | null
          paid_slot_currency: string | null
          paid_slot_price: number
          period_weeks: number
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          free_slots_per_period?: number
          id?: string
          is_active?: boolean | null
          paid_slot_currency?: string | null
          paid_slot_price?: number
          period_weeks?: number
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          free_slots_per_period?: number
          id?: string
          is_active?: boolean | null
          paid_slot_currency?: string | null
          paid_slot_price?: number
          period_weeks?: number
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      garment_catalog: {
        Row: {
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          download_count: number
          id: string
          image_url: string | null
          is_published: boolean
          media_type: string
          media_url: string | null
          metadata: Json | null
          name: string
          org_id: string
          price: number | null
          sync_to_catalogue: boolean
          sync_to_website: boolean
          tags: string[] | null
          tryon_count: number
          tryon_enabled: boolean
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          download_count?: number
          id?: string
          image_url?: string | null
          is_published?: boolean
          media_type?: string
          media_url?: string | null
          metadata?: Json | null
          name: string
          org_id: string
          price?: number | null
          sync_to_catalogue?: boolean
          sync_to_website?: boolean
          tags?: string[] | null
          tryon_count?: number
          tryon_enabled?: boolean
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          download_count?: number
          id?: string
          image_url?: string | null
          is_published?: boolean
          media_type?: string
          media_url?: string | null
          metadata?: Json | null
          name?: string
          org_id?: string
          price?: number | null
          sync_to_catalogue?: boolean
          sync_to_website?: boolean
          tags?: string[] | null
          tryon_count?: number
          tryon_enabled?: boolean
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "garment_catalog_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_catalog_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_catalog_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verification_attempts: {
        Row: {
          biometrics_used: string[] | null
          confidence_score: number | null
          cost_usd: number | null
          country: string | null
          created_at: string
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          id_number_masked: string | null
          id_type: string | null
          provider: string
          provider_reference: string | null
          provider_response: Json | null
          status: string
          updated_at: string
          verification_type: string
        }
        Insert: {
          biometrics_used?: string[] | null
          confidence_score?: number | null
          cost_usd?: number | null
          country?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          id_number_masked?: string | null
          id_type?: string | null
          provider: string
          provider_reference?: string | null
          provider_response?: Json | null
          status?: string
          updated_at?: string
          verification_type: string
        }
        Update: {
          biometrics_used?: string[] | null
          confidence_score?: number | null
          cost_usd?: number | null
          country?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          id_number_masked?: string | null
          id_type?: string | null
          provider?: string
          provider_reference?: string | null
          provider_response?: Json | null
          status?: string
          updated_at?: string
          verification_type?: string
        }
        Relationships: []
      }
      inbound_messages: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          from_number: string
          id: string
          is_read: boolean
          media_urls: Json | null
          message_sid: string | null
          num_media: number | null
          org_id: string
          raw_event: Json | null
          thread_id: string | null
          to_number: string
        }
        Insert: {
          body?: string | null
          channel?: string
          created_at?: string
          from_number: string
          id?: string
          is_read?: boolean
          media_urls?: Json | null
          message_sid?: string | null
          num_media?: number | null
          org_id: string
          raw_event?: Json | null
          thread_id?: string | null
          to_number: string
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          from_number?: string
          id?: string
          is_read?: boolean
          media_urls?: Json | null
          message_sid?: string | null
          num_media?: number | null
          org_id?: string
          raw_event?: Json | null
          thread_id?: string | null
          to_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_event_log: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          event_source: string
          event_type: string
          id: string
          mcp_response: Json | null
          mcp_tool_name: string | null
          org_id: string
          payload: Json | null
          processing_time_ms: number | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          event_source: string
          event_type: string
          id?: string
          mcp_response?: Json | null
          mcp_tool_name?: string | null
          org_id: string
          payload?: Json | null
          processing_time_ms?: number | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          event_source?: string
          event_type?: string
          id?: string
          mcp_response?: Json | null
          mcp_tool_name?: string | null
          org_id?: string
          payload?: Json | null
          processing_time_ms?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_event_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_event_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_event_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_tenant_usage: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          processing_time_ms: number | null
          status: string | null
          tenant_id: string
          tool_name: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          processing_time_ms?: number | null
          status?: string | null
          tenant_id: string
          tool_name?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          processing_time_ms?: number | null
          status?: string | null
          tenant_id?: string
          tool_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_tenant_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mcp_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_tenant_webhooks: {
        Row: {
          created_at: string | null
          events: string[]
          id: string
          is_active: boolean
          secret_hash: string | null
          tenant_id: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret_hash?: string | null
          tenant_id: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret_hash?: string | null
          tenant_id?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_tenant_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mcp_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_tenants: {
        Row: {
          allowed_tools: string[] | null
          api_key_hash: string | null
          api_key_prefix: string | null
          base_url: string | null
          blocked_tools: string[] | null
          created_at: string | null
          display_name: string
          domains: string[]
          id: string
          is_active: boolean
          metadata: Json | null
          mode: string
          rate_limit_per_min: number
          registered_by: string | null
          tenant_key: string
          updated_at: string | null
        }
        Insert: {
          allowed_tools?: string[] | null
          api_key_hash?: string | null
          api_key_prefix?: string | null
          base_url?: string | null
          blocked_tools?: string[] | null
          created_at?: string | null
          display_name: string
          domains?: string[]
          id?: string
          is_active?: boolean
          metadata?: Json | null
          mode?: string
          rate_limit_per_min?: number
          registered_by?: string | null
          tenant_key: string
          updated_at?: string | null
        }
        Update: {
          allowed_tools?: string[] | null
          api_key_hash?: string | null
          api_key_prefix?: string | null
          base_url?: string | null
          blocked_tools?: string[] | null
          created_at?: string | null
          display_name?: string
          domains?: string[]
          id?: string
          is_active?: boolean
          metadata?: Json | null
          mode?: string
          rate_limit_per_min?: number
          registered_by?: string | null
          tenant_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mcp_worker_config: {
        Row: {
          auth_method: string | null
          created_at: string | null
          event_routing: Json | null
          id: string
          is_enabled: boolean | null
          mcp_server_url: string
          metadata: Json | null
          org_id: string
          updated_at: string | null
        }
        Insert: {
          auth_method?: string | null
          created_at?: string | null
          event_routing?: Json | null
          id?: string
          is_enabled?: boolean | null
          mcp_server_url: string
          metadata?: Json | null
          org_id: string
          updated_at?: string | null
        }
        Update: {
          auth_method?: string | null
          created_at?: string | null
          event_routing?: Json | null
          id?: string
          is_enabled?: boolean | null
          mcp_server_url?: string
          metadata?: Json | null
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_worker_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_worker_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_worker_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "measurement_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      media_group_items: {
        Row: {
          caption: string | null
          created_at: string | null
          group_id: string
          id: string
          media_type: string
          media_url: string
          sort_order: number | null
          video_upload_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          group_id: string
          id?: string
          media_type: string
          media_url: string
          sort_order?: number | null
          video_upload_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          group_id?: string
          id?: string
          media_type?: string
          media_url?: string
          sort_order?: number | null
          video_upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "media_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_group_items_video_upload_id_fkey"
            columns: ["video_upload_id"]
            isOneToOne: false
            referencedRelation: "video_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      media_groups: {
        Row: {
          catalogue_item_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          name: string
          org_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          catalogue_item_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          org_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          catalogue_item_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          org_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_documents: {
        Row: {
          ai_generated: boolean | null
          call_log_id: string | null
          content: string | null
          created_at: string
          created_by: string
          doc_type: string
          duration_seconds: number | null
          id: string
          is_archived: boolean | null
          language: string | null
          metadata: Json | null
          org_id: string
          participants: Json | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          call_log_id?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          doc_type?: string
          duration_seconds?: number | null
          id?: string
          is_archived?: boolean | null
          language?: string | null
          metadata?: Json | null
          org_id: string
          participants?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          call_log_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          doc_type?: string
          duration_seconds?: number | null
          id?: string
          is_archived?: boolean | null
          language?: string | null
          metadata?: Json | null
          org_id?: string
          participants?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_documents_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      message_archives: {
        Row: {
          archived_at: string
          body: string | null
          channel: string
          created_at: string
          direction: string
          error_message: string | null
          event_type: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          original_message_id: string | null
          provider: string | null
          recipient_contact: string | null
          recipient_id: string | null
          recipient_type: string
          sender_id: string | null
          sender_type: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          archived_at?: string
          body?: string | null
          channel?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          original_message_id?: string | null
          provider?: string | null
          recipient_contact?: string | null
          recipient_id?: string | null
          recipient_type?: string
          sender_id?: string | null
          sender_type?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          archived_at?: string
          body?: string | null
          channel?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          original_message_id?: string | null
          provider?: string | null
          recipient_contact?: string | null
          recipient_id?: string | null
          recipient_type?: string
          sender_id?: string | null
          sender_type?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_archives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_archives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_archives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
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
          {
            foreignKeyName: "message_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      message_routing_rules: {
        Row: {
          action_type: string
          auto_response: string | null
          channel: string | null
          condition_type: string
          created_at: string
          description: string | null
          enabled: boolean
          end_time: string | null
          forward_to: string | null
          history_type: string | null
          id: string
          keywords: string[] | null
          name: string
          org_id: string
          priority: number
          sentiment: string | null
          start_time: string | null
          time_type: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          action_type?: string
          auto_response?: string | null
          channel?: string | null
          condition_type?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          end_time?: string | null
          forward_to?: string | null
          history_type?: string | null
          id?: string
          keywords?: string[] | null
          name: string
          org_id: string
          priority?: number
          sentiment?: string | null
          start_time?: string | null
          time_type?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          action_type?: string
          auto_response?: string | null
          channel?: string | null
          condition_type?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          end_time?: string | null
          forward_to?: string | null
          history_type?: string | null
          id?: string
          keywords?: string[] | null
          name?: string
          org_id?: string
          priority?: number
          sentiment?: string | null
          start_time?: string | null
          time_type?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_routing_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_routing_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_routing_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          channel: string
          created_at: string
          customer_number: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          message_count: number
          org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_number: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          message_count?: number
          org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_number?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          message_count?: number
          org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_rate_config: {
        Row: {
          channel: string
          created_at: string | null
          currency: string
          id: string
          is_active: boolean | null
          provider: string
          rate_per_message: number
          region: string
          updated_at: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          provider: string
          rate_per_message?: number
          region?: string
          updated_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          provider?: string
          rate_per_message?: number
          region?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      monetization_switches: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          label: string
          scope_key: string
          scope_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          label: string
          scope_key: string
          scope_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          label?: string
          scope_key?: string
          scope_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      nexus_tracking: {
        Row: {
          created_at: string
          id: string
          jurisdiction_id: string
          nexus_triggered: boolean
          nexus_triggered_at: string | null
          threshold_revenue_pct: number | null
          threshold_transaction_pct: number | null
          total_revenue: number
          total_transactions: number
          tracking_period: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jurisdiction_id: string
          nexus_triggered?: boolean
          nexus_triggered_at?: string | null
          threshold_revenue_pct?: number | null
          threshold_transaction_pct?: number | null
          total_revenue?: number
          total_transactions?: number
          tracking_period: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jurisdiction_id?: string
          nexus_triggered?: boolean
          nexus_triggered_at?: string | null
          threshold_revenue_pct?: number | null
          threshold_transaction_pct?: number | null
          total_revenue?: number
          total_transactions?: number
          tracking_period?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexus_tracking_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "tax_jurisdictions"
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
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      opt_out_registry: {
        Row: {
          created_at: string
          customer_number: string
          id: string
          opted_in_at: string | null
          opted_out_at: string | null
          org_id: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_number: string
          id?: string
          opted_in_at?: string | null
          opted_out_at?: string | null
          org_id: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_number?: string
          id?: string
          opted_in_at?: string | null
          opted_out_at?: string | null
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "opt_out_registry_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opt_out_registry_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opt_out_registry_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      order_delegations: {
        Row: {
          accepted_at: string | null
          admin_notes: string | null
          completed_at: string | null
          contract_id: string | null
          created_at: string
          deadline: string | null
          delegated_by: string
          id: string
          order_id: string
          org_id: string
          priority: string
          quality_rating: number | null
          started_at: string | null
          status: string
          tailor_id: string
          tailor_notes: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          admin_notes?: string | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string
          deadline?: string | null
          delegated_by: string
          id?: string
          order_id: string
          org_id: string
          priority?: string
          quality_rating?: number | null
          started_at?: string | null
          status?: string
          tailor_id: string
          tailor_notes?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          admin_notes?: string | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string
          deadline?: string | null
          delegated_by?: string
          id?: string
          order_id?: string
          org_id?: string
          priority?: string
          quality_rating?: number | null
          started_at?: string | null
          status?: string
          tailor_id?: string
          tailor_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_delegations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "tailor_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_delegations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_delegations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_delegations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_delegations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
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
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
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
          {
            foreignKeyName: "org_api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      org_app_configs: {
        Row: {
          api_access_enabled: boolean
          app_description: string | null
          app_name: string
          app_store_url: string | null
          created_at: string
          download_count: number | null
          gateway_reference: string | null
          generation_currency: string
          generation_fee: number
          icon_url: string | null
          id: string
          is_generated: boolean | null
          is_public_deployment: boolean
          is_published: boolean | null
          last_generated_at: string | null
          monthly_maintenance_fee: number
          org_id: string
          paid_at: string | null
          payment_status: string
          public_deployment_approved_at: string | null
          public_deployment_approved_by: string | null
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          api_access_enabled?: boolean
          app_description?: string | null
          app_name?: string
          app_store_url?: string | null
          created_at?: string
          download_count?: number | null
          gateway_reference?: string | null
          generation_currency?: string
          generation_fee?: number
          icon_url?: string | null
          id?: string
          is_generated?: boolean | null
          is_public_deployment?: boolean
          is_published?: boolean | null
          last_generated_at?: string | null
          monthly_maintenance_fee?: number
          org_id: string
          paid_at?: string | null
          payment_status?: string
          public_deployment_approved_at?: string | null
          public_deployment_approved_by?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          api_access_enabled?: boolean
          app_description?: string | null
          app_name?: string
          app_store_url?: string | null
          created_at?: string
          download_count?: number | null
          gateway_reference?: string | null
          generation_currency?: string
          generation_fee?: number
          icon_url?: string | null
          id?: string
          is_generated?: boolean | null
          is_public_deployment?: boolean
          is_published?: boolean | null
          last_generated_at?: string | null
          monthly_maintenance_fee?: number
          org_id?: string
          paid_at?: string | null
          payment_status?: string
          public_deployment_approved_at?: string | null
          public_deployment_approved_by?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_app_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_app_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_app_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      org_app_downloads: {
        Row: {
          created_at: string
          id: string
          install_method: string
          org_id: string
          platform: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          install_method?: string
          org_id: string
          platform?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          install_method?: string
          org_id?: string
          platform?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_app_downloads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_app_downloads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_app_downloads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      org_carrier_settings: {
        Row: {
          carrier_id: string
          created_at: string
          credentials_key_id: string | null
          id: string
          is_enabled: boolean
          markup_type: string
          markup_value: number
          org_id: string
          updated_at: string
        }
        Insert: {
          carrier_id: string
          created_at?: string
          credentials_key_id?: string | null
          id?: string
          is_enabled?: boolean
          markup_type?: string
          markup_value?: number
          org_id: string
          updated_at?: string
        }
        Update: {
          carrier_id?: string
          created_at?: string
          credentials_key_id?: string | null
          id?: string
          is_enabled?: boolean
          markup_type?: string
          markup_value?: number
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_carrier_settings_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "shipping_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_carrier_settings_credentials_key_id_fkey"
            columns: ["credentials_key_id"]
            isOneToOne: false
            referencedRelation: "org_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_carrier_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_carrier_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_carrier_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
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
          {
            foreignKeyName: "org_catalogue_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_catalogue_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      org_company_officers: {
        Row: {
          bio: string | null
          created_at: string
          display_order: number
          email: string | null
          full_name: string
          id: string
          is_public: boolean
          org_id: string
          phone: string | null
          photo_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          full_name: string
          id?: string
          is_public?: boolean
          org_id: string
          phone?: string | null
          photo_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          full_name?: string
          id?: string
          is_public?: boolean
          org_id?: string
          phone?: string | null
          photo_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_company_officers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_company_officers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_company_officers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
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
          {
            foreignKeyName: "org_consultations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_consultations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      org_fee_exemptions: {
        Row: {
          created_at: string | null
          exemption_type: string
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          invoice_generated_at: string | null
          invoice_id: string | null
          is_active: boolean | null
          org_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          exemption_type: string
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          invoice_generated_at?: string | null
          invoice_id?: string | null
          is_active?: boolean | null
          org_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          exemption_type?: string
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          invoice_generated_at?: string | null
          invoice_id?: string | null
          is_active?: boolean | null
          org_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_fee_exemptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_fee_exemptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_fee_exemptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      org_integration_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          environment: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          org_id: string
          revoked_at: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          org_id: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          org_id?: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_integration_api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_integration_api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_integration_api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
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
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
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
          {
            foreignKeyName: "org_notification_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_notification_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      org_outbound_webhooks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          events: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_delivery_at: string | null
          last_status: number | null
          org_id: string
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_status?: number | null
          org_id: string
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_status?: number | null
          org_id?: string
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_outbound_webhooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_outbound_webhooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_outbound_webhooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      org_phone_numbers: {
        Row: {
          assigned_at: string | null
          channel: string
          created_at: string
          id: string
          messaging_service_sid: string | null
          org_id: string
          phone_number: string
          status: string
        }
        Insert: {
          assigned_at?: string | null
          channel?: string
          created_at?: string
          id?: string
          messaging_service_sid?: string | null
          org_id: string
          phone_number: string
          status?: string
        }
        Update: {
          assigned_at?: string | null
          channel?: string
          created_at?: string
          id?: string
          messaging_service_sid?: string | null
          org_id?: string
          phone_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_phone_numbers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_phone_numbers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_phone_numbers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
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
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_summary"
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
      org_tax_settings: {
        Row: {
          collect_customer_tax_id: boolean | null
          country_code: string
          created_at: string
          default_tax_rate: number | null
          id: string
          metadata: Json | null
          org_id: string
          state_province: string | null
          tax_enabled: boolean
          tax_id_number: string | null
          tax_id_type: string | null
          tax_inclusive_pricing: boolean
          updated_at: string
        }
        Insert: {
          collect_customer_tax_id?: boolean | null
          country_code?: string
          created_at?: string
          default_tax_rate?: number | null
          id?: string
          metadata?: Json | null
          org_id: string
          state_province?: string | null
          tax_enabled?: boolean
          tax_id_number?: string | null
          tax_id_type?: string | null
          tax_inclusive_pricing?: boolean
          updated_at?: string
        }
        Update: {
          collect_customer_tax_id?: boolean | null
          country_code?: string
          created_at?: string
          default_tax_rate?: number | null
          id?: string
          metadata?: Json | null
          org_id?: string
          state_province?: string | null
          tax_enabled?: boolean
          tax_id_number?: string | null
          tax_id_type?: string | null
          tax_inclusive_pricing?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_tax_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tax_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tax_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      org_webhook_deliveries: {
        Row: {
          attempted_at: string
          duration_ms: number | null
          event: string
          id: string
          org_id: string
          payload: Json
          request_id: string
          response_body: string | null
          response_status: number | null
          succeeded: boolean
          webhook_id: string
        }
        Insert: {
          attempted_at?: string
          duration_ms?: number | null
          event: string
          id?: string
          org_id: string
          payload: Json
          request_id: string
          response_body?: string | null
          response_status?: number | null
          succeeded?: boolean
          webhook_id: string
        }
        Update: {
          attempted_at?: string
          duration_ms?: number | null
          event?: string
          id?: string
          org_id?: string
          payload?: Json
          request_id?: string
          response_body?: string | null
          response_status?: number | null
          succeeded?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "org_outbound_webhooks"
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
          color_palette: Json
          created_at: string
          facebook_url: string | null
          favicon_url: string | null
          font_body: string
          font_heading: string
          hero_description: string | null
          hero_image_url: string | null
          id: string
          instagram_url: string | null
          is_enabled: boolean
          linkedin_url: string | null
          mission_statement: string | null
          mode: string
          org_id: string
          our_story: string | null
          public_website_url: string | null
          tagline: string | null
          theme: string
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          vision_statement: string | null
          webhook_url: string | null
          whatsapp_number: string | null
          youtube_url: string | null
        }
        Insert: {
          accent_color?: string | null
          api_key?: string | null
          api_secret?: string | null
          brand_color?: string | null
          color_palette?: Json
          created_at?: string
          facebook_url?: string | null
          favicon_url?: string | null
          font_body?: string
          font_heading?: string
          hero_description?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_enabled?: boolean
          linkedin_url?: string | null
          mission_statement?: string | null
          mode?: string
          org_id: string
          our_story?: string | null
          public_website_url?: string | null
          tagline?: string | null
          theme?: string
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          vision_statement?: string | null
          webhook_url?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Update: {
          accent_color?: string | null
          api_key?: string | null
          api_secret?: string | null
          brand_color?: string | null
          color_palette?: Json
          created_at?: string
          facebook_url?: string | null
          favicon_url?: string | null
          font_body?: string
          font_heading?: string
          hero_description?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_enabled?: boolean
          linkedin_url?: string | null
          mission_statement?: string | null
          mode?: string
          org_id?: string
          our_story?: string | null
          public_website_url?: string | null
          tagline?: string | null
          theme?: string
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          vision_statement?: string | null
          webhook_url?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_websites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_websites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_websites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          business_reg_number: string | null
          business_reg_type: string | null
          business_reg_verification_status: string | null
          business_reg_verified: boolean | null
          business_reg_verified_at: string | null
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
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          phone: string | null
          physical_address: string | null
          region: string | null
          slug: string
          specialties: string[] | null
          updated_at: string
          verification_notes: string | null
          verification_reviewed_at: string | null
          verification_reviewed_by: string | null
          verification_submitted_at: string | null
        }
        Insert: {
          address?: string | null
          business_reg_number?: string | null
          business_reg_type?: string | null
          business_reg_verification_status?: string | null
          business_reg_verified?: boolean | null
          business_reg_verified_at?: string | null
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
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          physical_address?: string | null
          region?: string | null
          slug: string
          specialties?: string[] | null
          updated_at?: string
          verification_notes?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verification_submitted_at?: string | null
        }
        Update: {
          address?: string | null
          business_reg_number?: string | null
          business_reg_type?: string | null
          business_reg_verification_status?: string | null
          business_reg_verified?: boolean | null
          business_reg_verified_at?: string | null
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
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          physical_address?: string | null
          region?: string | null
          slug?: string
          specialties?: string[] | null
          updated_at?: string
          verification_notes?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verification_submitted_at?: string | null
        }
        Relationships: []
      }
      outbound_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          error_message: string | null
          from_number: string | null
          id: string
          in_reply_to: string | null
          is_auto_reply: boolean
          org_id: string
          priority: string
          retry_count: number
          scheduled_at: string | null
          sent_at: string | null
          status: string
          thread_id: string | null
          to_number: string
          twilio_sid: string | null
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          error_message?: string | null
          from_number?: string | null
          id?: string
          in_reply_to?: string | null
          is_auto_reply?: boolean
          org_id: string
          priority?: string
          retry_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          thread_id?: string | null
          to_number: string
          twilio_sid?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          error_message?: string | null
          from_number?: string | null
          id?: string
          in_reply_to?: string | null
          is_auto_reply?: boolean
          org_id?: string
          priority?: string
          retry_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          thread_id?: string | null
          to_number?: string
          twilio_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      paystack_dva_transactions: {
        Row: {
          amount: number
          channel: string | null
          created_at: string
          credited_at: string | null
          credited_wallet: boolean
          currency: string
          gateway_response: string | null
          id: string
          metadata: Json | null
          paystack_reference: string
          purpose: string
          sender_account: string | null
          sender_bank: string | null
          sender_name: string | null
          session_id: string | null
          status: string
          user_id: string
          virtual_account_id: string | null
        }
        Insert: {
          amount: number
          channel?: string | null
          created_at?: string
          credited_at?: string | null
          credited_wallet?: boolean
          currency?: string
          gateway_response?: string | null
          id?: string
          metadata?: Json | null
          paystack_reference: string
          purpose?: string
          sender_account?: string | null
          sender_bank?: string | null
          sender_name?: string | null
          session_id?: string | null
          status?: string
          user_id: string
          virtual_account_id?: string | null
        }
        Update: {
          amount?: number
          channel?: string | null
          created_at?: string
          credited_at?: string | null
          credited_wallet?: boolean
          currency?: string
          gateway_response?: string | null
          id?: string
          metadata?: Json | null
          paystack_reference?: string
          purpose?: string
          sender_account?: string | null
          sender_bank?: string | null
          sender_name?: string | null
          session_id?: string | null
          status?: string
          user_id?: string
          virtual_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paystack_dva_transactions_virtual_account_id_fkey"
            columns: ["virtual_account_id"]
            isOneToOne: false
            referencedRelation: "paystack_virtual_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      paystack_virtual_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string
          bank_name: string
          bank_slug: string | null
          created_at: string
          currency: string
          customer_code: string
          dva_id: string | null
          expected_amount: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          purpose: string | null
          reference_id: string | null
          reference_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_type?: string
          bank_name: string
          bank_slug?: string | null
          created_at?: string
          currency?: string
          customer_code: string
          dva_id?: string | null
          expected_amount?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          purpose?: string | null
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string
          bank_name?: string
          bank_slug?: string | null
          created_at?: string
          currency?: string
          customer_code?: string
          dva_id?: string | null
          expected_amount?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          purpose?: string | null
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_api_keys: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key_name: string
          key_value: string
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key_name: string
          key_value: string
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key_name?: string
          key_value?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string | null
          bank_name: string
          bank_type: string
          created_at: string | null
          currency: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          notes: string | null
          provider_slug: string
          sort_code: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code?: string | null
          bank_name: string
          bank_type?: string
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          provider_slug: string
          sort_code?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string | null
          bank_name?: string
          bank_type?: string
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          provider_slug?: string
          sort_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_call_archives: {
        Row: {
          archived_at: string
          billing_record_id: string | null
          call_log_id: string | null
          call_type: string
          caller_id: string
          caller_type: string
          created_at: string
          credits_charged: number | null
          direction: string
          duration_seconds: number | null
          feedback_notes: string | null
          from_number: string | null
          id: string
          meeting_doc_id: string | null
          metadata: Json | null
          org_id: string
          quality_score: number | null
          recording_url: string | null
          to_number: string | null
          transcript_url: string | null
        }
        Insert: {
          archived_at?: string
          billing_record_id?: string | null
          call_log_id?: string | null
          call_type?: string
          caller_id: string
          caller_type?: string
          created_at?: string
          credits_charged?: number | null
          direction?: string
          duration_seconds?: number | null
          feedback_notes?: string | null
          from_number?: string | null
          id?: string
          meeting_doc_id?: string | null
          metadata?: Json | null
          org_id: string
          quality_score?: number | null
          recording_url?: string | null
          to_number?: string | null
          transcript_url?: string | null
        }
        Update: {
          archived_at?: string
          billing_record_id?: string | null
          call_log_id?: string | null
          call_type?: string
          caller_id?: string
          caller_type?: string
          created_at?: string
          credits_charged?: number | null
          direction?: string
          duration_seconds?: number | null
          feedback_notes?: string | null
          from_number?: string | null
          id?: string
          meeting_doc_id?: string | null
          metadata?: Json | null
          org_id?: string
          quality_score?: number | null
          recording_url?: string | null
          to_number?: string | null
          transcript_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_call_archives_billing_record_id_fkey"
            columns: ["billing_record_id"]
            isOneToOne: false
            referencedRelation: "call_billing_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_call_archives_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_call_archives_meeting_doc_id_fkey"
            columns: ["meeting_doc_id"]
            isOneToOne: false
            referencedRelation: "meeting_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_call_archives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_call_archives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_call_archives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_dns_records: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_managed: boolean
          last_checked_at: string | null
          name: string
          notes: string | null
          priority: number | null
          provider_hint: string | null
          purpose: string | null
          record_type: string
          ttl: number
          updated_at: string
          value: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_managed?: boolean
          last_checked_at?: string | null
          name?: string
          notes?: string | null
          priority?: number | null
          provider_hint?: string | null
          purpose?: string | null
          record_type: string
          ttl?: number
          updated_at?: string
          value: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_managed?: boolean
          last_checked_at?: string | null
          name?: string
          notes?: string | null
          priority?: number | null
          provider_hint?: string | null
          purpose?: string | null
          record_type?: string
          ttl?: number
          updated_at?: string
          value?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      platform_feature_flags: {
        Row: {
          api_provider: string | null
          category: string
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          full_platform_default: boolean
          id: string
          is_enabled: boolean
          metadata: Json | null
          mvp_default: boolean
          required_secret_names: string[] | null
          requires_api_key: boolean
          toggle_mechanism: string
          updated_at: string
        }
        Insert: {
          api_provider?: string | null
          category?: string
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          full_platform_default?: boolean
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          mvp_default?: boolean
          required_secret_names?: string[] | null
          requires_api_key?: boolean
          toggle_mechanism?: string
          updated_at?: string
        }
        Update: {
          api_provider?: string | null
          category?: string
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          full_platform_default?: boolean
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          mvp_default?: boolean
          required_secret_names?: string[] | null
          requires_api_key?: boolean
          toggle_mechanism?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_fee_config: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          fee_category: string
          fee_key: string
          fee_label: string
          fee_unit: string
          fee_value: number
          id: string
          is_active: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee_category?: string
          fee_key: string
          fee_label: string
          fee_unit?: string
          fee_value?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee_category?: string
          fee_key?: string
          fee_label?: string
          fee_unit?: string
          fee_value?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
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
            foreignKeyName: "platform_fee_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
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
      platform_phone_numbers: {
        Row: {
          country_code: string | null
          created_at: string | null
          forwarding_config: Json | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          notes: string | null
          number_label: string
          number_type: string
          phone_number: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          forwarding_config?: Json | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          number_label: string
          number_type?: string
          phone_number?: string
          provider?: string
          updated_at?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          forwarding_config?: Json | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          number_label?: string
          number_type?: string
          phone_number?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          copyright_text: string | null
          created_at: string
          description: string | null
          favicon_url: string | null
          hero_backdrop_type: string
          hero_backdrop_url: string | null
          id: string
          logo_url: string | null
          meta_keywords: string | null
          mission: string | null
          platform_name: string
          platform_short_name: string
          sentinel_mcp_url: string | null
          social_links: Json | null
          tagline: string | null
          updated_at: string
          vision: string | null
          website_url: string | null
        }
        Insert: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          copyright_text?: string | null
          created_at?: string
          description?: string | null
          favicon_url?: string | null
          hero_backdrop_type?: string
          hero_backdrop_url?: string | null
          id?: string
          logo_url?: string | null
          meta_keywords?: string | null
          mission?: string | null
          platform_name?: string
          platform_short_name?: string
          sentinel_mcp_url?: string | null
          social_links?: Json | null
          tagline?: string | null
          updated_at?: string
          vision?: string | null
          website_url?: string | null
        }
        Update: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          copyright_text?: string | null
          created_at?: string
          description?: string | null
          favicon_url?: string | null
          hero_backdrop_type?: string
          hero_backdrop_url?: string | null
          id?: string
          logo_url?: string | null
          meta_keywords?: string | null
          mission?: string | null
          platform_name?: string
          platform_short_name?: string
          sentinel_mcp_url?: string | null
          social_links?: Json | null
          tagline?: string | null
          updated_at?: string
          vision?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      platform_tour_sync_state: {
        Row: {
          id: number
          is_stale: boolean
          last_platform_update_id: string | null
          last_sync_attempt_at: string | null
          last_sync_message: string | null
          last_sync_status: string | null
          last_sync_success_at: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          is_stale?: boolean
          last_platform_update_id?: string | null
          last_sync_attempt_at?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          last_sync_success_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          is_stale?: boolean
          last_platform_update_id?: string | null
          last_sync_attempt_at?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          last_sync_success_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_tour_tracks: {
        Row: {
          accent: string
          created_at: string
          cta_label: string
          cta_path: string
          generated_at: string
          generated_by: string
          icon: string
          id: string
          label: string
          role: string
          source_version: string | null
          steps: Json
          tagline: string
          updated_at: string
        }
        Insert: {
          accent: string
          created_at?: string
          cta_label: string
          cta_path: string
          generated_at?: string
          generated_by?: string
          icon: string
          id?: string
          label: string
          role: string
          source_version?: string | null
          steps?: Json
          tagline: string
          updated_at?: string
        }
        Update: {
          accent?: string
          created_at?: string
          cta_label?: string
          cta_path?: string
          generated_at?: string
          generated_by?: string
          icon?: string
          id?: string
          label?: string
          role?: string
          source_version?: string | null
          steps?: Json
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_updates: {
        Row: {
          audience: string
          created_at: string
          created_by: string | null
          force_reload: boolean
          id: string
          notes: string | null
          published_at: string
          severity: string
          title: string
          version: string
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by?: string | null
          force_reload?: boolean
          id?: string
          notes?: string | null
          published_at?: string
          severity?: string
          title: string
          version: string
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string | null
          force_reload?: boolean
          id?: string
          notes?: string | null
          published_at?: string
          severity?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      premium_feature_usage: {
        Row: {
          billed_to: string
          created_at: string
          credits_used: number
          currency: string
          feature_type: string
          id: string
          is_included: boolean
          metadata: Json | null
          org_id: string
          session_id: string | null
          status: string
          unit_price: number
          user_id: string
        }
        Insert: {
          billed_to?: string
          created_at?: string
          credits_used?: number
          currency?: string
          feature_type: string
          id?: string
          is_included?: boolean
          metadata?: Json | null
          org_id: string
          session_id?: string | null
          status?: string
          unit_price?: number
          user_id: string
        }
        Update: {
          billed_to?: string
          created_at?: string
          credits_used?: number
          currency?: string
          feature_type?: string
          id?: string
          is_included?: boolean
          metadata?: Json | null
          org_id?: string
          session_id?: string | null
          status?: string
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_feature_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_feature_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_feature_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_audit_log: {
        Row: {
          changed_at: string | null
          changed_by: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_status: string
          access_status_notes: string | null
          access_status_reviewed_at: string | null
          access_status_reviewed_by: string | null
          access_status_submitted_at: string | null
          avatar_url: string | null
          bio: string | null
          business_name: string | null
          created_at: string
          current_org_id: string | null
          deactivated_at: string | null
          display_name: string | null
          facebook_url: string | null
          free_tours_used: number
          id: string
          identity_number: string | null
          identity_type: string | null
          identity_verification_status: string | null
          identity_verified: boolean | null
          identity_verified_at: string | null
          instagram_url: string | null
          is_deactivated: boolean
          latitude: number | null
          linkedin_url: string | null
          longitude: number | null
          physical_address: string | null
          portfolio_url: string | null
          promo_consent: boolean
          promo_consent_at: string | null
          referral_code: string | null
          specialty: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          access_status?: string
          access_status_notes?: string | null
          access_status_reviewed_at?: string | null
          access_status_reviewed_by?: string | null
          access_status_submitted_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          created_at?: string
          current_org_id?: string | null
          deactivated_at?: string | null
          display_name?: string | null
          facebook_url?: string | null
          free_tours_used?: number
          id: string
          identity_number?: string | null
          identity_type?: string | null
          identity_verification_status?: string | null
          identity_verified?: boolean | null
          identity_verified_at?: string | null
          instagram_url?: string | null
          is_deactivated?: boolean
          latitude?: number | null
          linkedin_url?: string | null
          longitude?: number | null
          physical_address?: string | null
          portfolio_url?: string | null
          promo_consent?: boolean
          promo_consent_at?: string | null
          referral_code?: string | null
          specialty?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          access_status?: string
          access_status_notes?: string | null
          access_status_reviewed_at?: string | null
          access_status_reviewed_by?: string | null
          access_status_submitted_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          created_at?: string
          current_org_id?: string | null
          deactivated_at?: string | null
          display_name?: string | null
          facebook_url?: string | null
          free_tours_used?: number
          id?: string
          identity_number?: string | null
          identity_type?: string | null
          identity_verification_status?: string | null
          identity_verified?: boolean | null
          identity_verified_at?: string | null
          instagram_url?: string | null
          is_deactivated?: boolean
          latitude?: number | null
          linkedin_url?: string | null
          longitude?: number | null
          physical_address?: string | null
          portfolio_url?: string | null
          promo_consent?: boolean
          promo_consent_at?: string | null
          referral_code?: string | null
          specialty?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_org_id_fkey"
            columns: ["current_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_org_id_fkey"
            columns: ["current_org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_org_id_fkey"
            columns: ["current_org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_grant_caps: {
        Row: {
          cap: number
          created_at: string
          description: string | null
          grant_type: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          cap: number
          created_at?: string
          description?: string | null
          grant_type: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          cap?: number
          created_at?: string
          description?: string | null
          grant_type?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      promotional_grants: {
        Row: {
          claimed_at: string
          grant_type: string
          id: string
          notes: string | null
          org_id: string | null
          slot_number: number
          user_id: string | null
        }
        Insert: {
          claimed_at?: string
          grant_type: string
          id?: string
          notes?: string | null
          org_id?: string | null
          slot_number: number
          user_id?: string | null
        }
        Update: {
          claimed_at?: string
          grant_type?: string
          id?: string
          notes?: string | null
          org_id?: string | null
          slot_number?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotional_grants_grant_type_fkey"
            columns: ["grant_type"]
            isOneToOne: false
            referencedRelation: "promotional_grant_caps"
            referencedColumns: ["grant_type"]
          },
          {
            foreignKeyName: "promotional_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_routing_config: {
        Row: {
          channel: string
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          phone_number_id: string | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone_number_id?: string | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone_number_id?: string | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_routing_config_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "platform_phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      regional_operations: {
        Row: {
          ai_features_enabled: boolean
          available_carriers: string[]
          available_gateways: string[]
          available_messaging_providers: string[]
          communications_enabled: boolean
          country_codes: string[]
          created_at: string
          currency: string
          flag_emoji: string | null
          id: string
          is_active: boolean
          launched_at: string | null
          logistics_enabled: boolean
          marketplace_enabled: boolean
          mobile_app_enabled: boolean
          notes: string | null
          payments_enabled: boolean
          region_code: string
          region_name: string
          subscriptions_enabled: boolean
          timezone: string | null
          updated_at: string
          video_calls_enabled: boolean
          virtual_tryon_enabled: boolean
          website_builder_enabled: boolean
        }
        Insert: {
          ai_features_enabled?: boolean
          available_carriers?: string[]
          available_gateways?: string[]
          available_messaging_providers?: string[]
          communications_enabled?: boolean
          country_codes?: string[]
          created_at?: string
          currency?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean
          launched_at?: string | null
          logistics_enabled?: boolean
          marketplace_enabled?: boolean
          mobile_app_enabled?: boolean
          notes?: string | null
          payments_enabled?: boolean
          region_code: string
          region_name: string
          subscriptions_enabled?: boolean
          timezone?: string | null
          updated_at?: string
          video_calls_enabled?: boolean
          virtual_tryon_enabled?: boolean
          website_builder_enabled?: boolean
        }
        Update: {
          ai_features_enabled?: boolean
          available_carriers?: string[]
          available_gateways?: string[]
          available_messaging_providers?: string[]
          communications_enabled?: boolean
          country_codes?: string[]
          created_at?: string
          currency?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean
          launched_at?: string | null
          logistics_enabled?: boolean
          marketplace_enabled?: boolean
          mobile_app_enabled?: boolean
          notes?: string | null
          payments_enabled?: boolean
          region_code?: string
          region_name?: string
          subscriptions_enabled?: boolean
          timezone?: string | null
          updated_at?: string
          video_calls_enabled?: boolean
          virtual_tryon_enabled?: boolean
          website_builder_enabled?: boolean
        }
        Relationships: []
      }
      sentinel_agent_incidents: {
        Row: {
          agent_key: string
          agent_kind: string
          agent_name: string | null
          attempt_count: number | null
          created_at: string
          details: Json
          error_message: string | null
          event_type: string
          from_status: string | null
          id: string
          next_retry_at: string | null
          to_status: string | null
        }
        Insert: {
          agent_key: string
          agent_kind: string
          agent_name?: string | null
          attempt_count?: number | null
          created_at?: string
          details?: Json
          error_message?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          next_retry_at?: string | null
          to_status?: string | null
        }
        Update: {
          agent_key?: string
          agent_kind?: string
          agent_name?: string | null
          attempt_count?: number | null
          created_at?: string
          details?: Json
          error_message?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          next_retry_at?: string | null
          to_status?: string | null
        }
        Relationships: []
      }
      sentinel_alert_settings: {
        Row: {
          agent_failure_alert_enabled: boolean
          agent_stuck_after_minutes: number
          id: number
          notify_emails: string[]
          shield_stuck_after_minutes: number
          updated_at: string
        }
        Insert: {
          agent_failure_alert_enabled?: boolean
          agent_stuck_after_minutes?: number
          id?: number
          notify_emails?: string[]
          shield_stuck_after_minutes?: number
          updated_at?: string
        }
        Update: {
          agent_failure_alert_enabled?: boolean
          agent_stuck_after_minutes?: number
          id?: number
          notify_emails?: string[]
          shield_stuck_after_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      sentinel_mcp_addons: {
        Row: {
          addon_key: string
          available_to_roles: string[]
          category: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          mcp_tool_name: string | null
          metadata: Json
          monthly_price_usd: number
          name: string
          per_request_price_usd: number | null
          updated_at: string
        }
        Insert: {
          addon_key: string
          available_to_roles?: string[]
          category: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          mcp_tool_name?: string | null
          metadata?: Json
          monthly_price_usd?: number
          name: string
          per_request_price_usd?: number | null
          updated_at?: string
        }
        Update: {
          addon_key?: string
          available_to_roles?: string[]
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          mcp_tool_name?: string | null
          metadata?: Json
          monthly_price_usd?: number
          name?: string
          per_request_price_usd?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sentinel_mcp_platform_subscription: {
        Row: {
          billing_tier: string
          cascades_to_users: boolean
          client_name: string
          contact_email: string
          id: number
          is_active: boolean
          notes: string | null
          subscribed_at: string
          updated_at: string
        }
        Insert: {
          billing_tier?: string
          cascades_to_users?: boolean
          client_name?: string
          contact_email?: string
          id?: number
          is_active?: boolean
          notes?: string | null
          subscribed_at?: string
          updated_at?: string
        }
        Update: {
          billing_tier?: string
          cascades_to_users?: boolean
          client_name?: string
          contact_email?: string
          id?: number
          is_active?: boolean
          notes?: string | null
          subscribed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sentinel_mcp_user_subscriptions: {
        Row: {
          addon_id: string
          amount_usd: number
          billing_cycle: string
          created_at: string
          current_period_end: string | null
          current_period_start: string
          id: string
          last_invoice_id: string | null
          metadata: Json
          org_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          addon_id: string
          amount_usd?: number
          billing_cycle?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          last_invoice_id?: string | null
          metadata?: Json
          org_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          addon_id?: string
          amount_usd?: number
          billing_cycle?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          last_invoice_id?: string | null
          metadata?: Json
          org_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sentinel_mcp_user_subscriptions_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "sentinel_mcp_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentinel_mcp_user_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentinel_mcp_user_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentinel_mcp_user_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      sentinel_platform_agents: {
        Row: {
          activated_at: string | null
          agent_key: string
          agent_name: string
          attempt_count: number
          cascades_to_users: boolean
          client_email: string
          created_at: string
          description: string | null
          id: string
          idempotency_key: string | null
          idempotency_key_expires_at: string | null
          last_attempt_at: string | null
          last_error: string | null
          max_attempts: number
          mcp_tool_name: string
          next_retry_at: string | null
          plan_key: string
          provider_response: Json | null
          request_payload: Json | null
          requested_at: string | null
          requested_features: Json
          scope: string
          service_category: string
          status: string
          stuck_after_minutes: number
          tier: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          agent_key: string
          agent_name: string
          attempt_count?: number
          cascades_to_users?: boolean
          client_email?: string
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          idempotency_key_expires_at?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number
          mcp_tool_name: string
          next_retry_at?: string | null
          plan_key: string
          provider_response?: Json | null
          request_payload?: Json | null
          requested_at?: string | null
          requested_features?: Json
          scope?: string
          service_category: string
          status?: string
          stuck_after_minutes?: number
          tier?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          agent_key?: string
          agent_name?: string
          attempt_count?: number
          cascades_to_users?: boolean
          client_email?: string
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          idempotency_key_expires_at?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number
          mcp_tool_name?: string
          next_retry_at?: string | null
          plan_key?: string
          provider_response?: Json | null
          request_payload?: Json | null
          requested_at?: string | null
          requested_features?: Json
          scope?: string
          service_category?: string
          status?: string
          stuck_after_minutes?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      sentinel_shield_activation: {
        Row: {
          activated_at: string | null
          attempt_count: number
          client_email: string
          created_at: string
          id: number
          idempotency_key: string | null
          idempotency_key_expires_at: string | null
          last_attempt_at: string | null
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          plan_key: string
          provider_response: Json | null
          request_payload: Json | null
          requested_at: string | null
          status: string
          stuck_after_minutes: number
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          attempt_count?: number
          client_email?: string
          created_at?: string
          id?: number
          idempotency_key?: string | null
          idempotency_key_expires_at?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          plan_key?: string
          provider_response?: Json | null
          request_payload?: Json | null
          requested_at?: string | null
          status?: string
          stuck_after_minutes?: number
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          attempt_count?: number
          client_email?: string
          created_at?: string
          id?: number
          idempotency_key?: string | null
          idempotency_key_expires_at?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          plan_key?: string
          provider_response?: Json | null
          request_payload?: Json | null
          requested_at?: string | null
          status?: string
          stuck_after_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      sentinel_storage_entitlements: {
        Row: {
          auto_cleanup_enabled: boolean
          base_monthly_usd: number
          created_at: string
          current_object_count: number
          current_period_end: string
          current_period_start: string
          current_usage_bytes: number
          id: string
          included_gb: number
          last_cleanup_at: string | null
          last_cleanup_deleted_count: number
          last_error: string | null
          last_usage_calc_at: string | null
          metadata: Json
          org_id: string | null
          overage_per_gb_usd: number
          owner_type: string
          provider_buckets: Json
          provisioned_at: string | null
          provisioning_response: Json | null
          retention_days: number | null
          revoked_at: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auto_cleanup_enabled?: boolean
          base_monthly_usd?: number
          created_at?: string
          current_object_count?: number
          current_period_end?: string
          current_period_start?: string
          current_usage_bytes?: number
          id?: string
          included_gb?: number
          last_cleanup_at?: string | null
          last_cleanup_deleted_count?: number
          last_error?: string | null
          last_usage_calc_at?: string | null
          metadata?: Json
          org_id?: string | null
          overage_per_gb_usd?: number
          owner_type: string
          provider_buckets?: Json
          provisioned_at?: string | null
          provisioning_response?: Json | null
          retention_days?: number | null
          revoked_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auto_cleanup_enabled?: boolean
          base_monthly_usd?: number
          created_at?: string
          current_object_count?: number
          current_period_end?: string
          current_period_start?: string
          current_usage_bytes?: number
          id?: string
          included_gb?: number
          last_cleanup_at?: string | null
          last_cleanup_deleted_count?: number
          last_error?: string | null
          last_usage_calc_at?: string | null
          metadata?: Json
          org_id?: string | null
          overage_per_gb_usd?: number
          owner_type?: string
          provider_buckets?: Json
          provisioned_at?: string | null
          provisioning_response?: Json | null
          retention_days?: number | null
          revoked_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sentinel_storage_entitlements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentinel_storage_entitlements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentinel_storage_entitlements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentinel_storage_entitlements_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "sentinel_mcp_user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      sentinel_storage_objects: {
        Row: {
          content_type: string | null
          created_at: string
          entitlement_id: string
          expires_at: string | null
          id: string
          is_public: boolean
          metadata: Json
          original_filename: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          entitlement_id: string
          expires_at?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json
          original_filename: string
          size_bytes?: number
          storage_path: string
          uploaded_by: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          entitlement_id?: string
          expires_at?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json
          original_filename?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "sentinel_storage_objects_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "sentinel_storage_entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      sentinel_storage_usage_ledger: {
        Row: {
          avg_bytes: number
          base_charge_usd: number
          created_at: string
          entitlement_id: string
          id: string
          included_gb: number
          overage_charge_usd: number
          overage_gb: number
          peak_bytes: number
          period_end: string
          period_start: string
          status: string
          total_usd: number
          updated_at: string
        }
        Insert: {
          avg_bytes?: number
          base_charge_usd?: number
          created_at?: string
          entitlement_id: string
          id?: string
          included_gb: number
          overage_charge_usd?: number
          overage_gb?: number
          peak_bytes?: number
          period_end: string
          period_start: string
          status?: string
          total_usd?: number
          updated_at?: string
        }
        Update: {
          avg_bytes?: number
          base_charge_usd?: number
          created_at?: string
          entitlement_id?: string
          id?: string
          included_gb?: number
          overage_charge_usd?: number
          overage_gb?: number
          peak_bytes?: number
          period_end?: string
          period_start?: string
          status?: string
          total_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sentinel_storage_usage_ledger_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "sentinel_storage_entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_optimization_requests: {
        Row: {
          amount_usd: number
          billing_status: string
          completed_at: string | null
          created_at: string
          id: string
          keywords: string[] | null
          mcp_event_id: string | null
          mcp_response: Json | null
          notes: string | null
          org_id: string | null
          requester_id: string
          routed_to: string
          scope: string
          status: string
          target_url: string
          updated_at: string
        }
        Insert: {
          amount_usd?: number
          billing_status?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          mcp_event_id?: string | null
          mcp_response?: Json | null
          notes?: string | null
          org_id?: string | null
          requester_id?: string
          routed_to?: string
          scope?: string
          status?: string
          target_url: string
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          billing_status?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          mcp_event_id?: string | null
          mcp_response?: Json | null
          notes?: string | null
          org_id?: string | null
          requester_id?: string
          routed_to?: string
          scope?: string
          status?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_optimization_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_optimization_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_optimization_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_tracking_events: {
        Row: {
          carrier_status_code: string | null
          created_at: string
          description: string | null
          event_timestamp: string
          id: string
          location: string | null
          raw_data: Json | null
          shipment_id: string
          status: string
        }
        Insert: {
          carrier_status_code?: string | null
          created_at?: string
          description?: string | null
          event_timestamp?: string
          id?: string
          location?: string | null
          raw_data?: Json | null
          shipment_id: string
          status: string
        }
        Update: {
          carrier_status_code?: string | null
          created_at?: string
          description?: string | null
          event_timestamp?: string
          id?: string
          location?: string | null
          raw_data?: Json | null
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_delivery_date: string | null
          carrier_cost: number | null
          carrier_id: string | null
          carrier_reference: string | null
          created_at: string
          currency: string
          declared_value: number | null
          delivered_at: string | null
          estimated_delivery_date: string | null
          id: string
          insurance_amount: number | null
          label_format: string | null
          label_url: string | null
          markup_amount: number | null
          metadata: Json | null
          notes: string | null
          order_id: string | null
          org_id: string
          package_description: string | null
          package_dimensions: Json | null
          package_weight: number | null
          recipient_address: Json | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          sender_address: Json | null
          sender_name: string | null
          sender_phone: string | null
          shipped_at: string | null
          shipping_cost: number | null
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          carrier_cost?: number | null
          carrier_id?: string | null
          carrier_reference?: string | null
          created_at?: string
          currency?: string
          declared_value?: number | null
          delivered_at?: string | null
          estimated_delivery_date?: string | null
          id?: string
          insurance_amount?: number | null
          label_format?: string | null
          label_url?: string | null
          markup_amount?: number | null
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          org_id: string
          package_description?: string | null
          package_dimensions?: Json | null
          package_weight?: number | null
          recipient_address?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sender_address?: Json | null
          sender_name?: string | null
          sender_phone?: string | null
          shipped_at?: string | null
          shipping_cost?: number | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          carrier_cost?: number | null
          carrier_id?: string | null
          carrier_reference?: string | null
          created_at?: string
          currency?: string
          declared_value?: number | null
          delivered_at?: string | null
          estimated_delivery_date?: string | null
          id?: string
          insurance_amount?: number | null
          label_format?: string | null
          label_url?: string | null
          markup_amount?: number | null
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          org_id?: string
          package_description?: string | null
          package_dimensions?: Json | null
          package_weight?: number | null
          recipient_address?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sender_address?: Json | null
          sender_name?: string | null
          sender_phone?: string | null
          shipped_at?: string | null
          shipping_cost?: number | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "shipping_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_carriers: {
        Row: {
          api_base_url: string | null
          carrier_type: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          supported_regions: string[] | null
          tracking_url_template: string | null
          updated_at: string
        }
        Insert: {
          api_base_url?: string | null
          carrier_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          supported_regions?: string[] | null
          tracking_url_template?: string | null
          updated_at?: string
        }
        Update: {
          api_base_url?: string | null
          carrier_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          supported_regions?: string[] | null
          tracking_url_template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shipping_rate_quotes: {
        Row: {
          carrier_id: string
          carrier_rate: number
          created_at: string
          currency: string
          destination_address: Json
          estimated_days: number | null
          expires_at: string
          final_rate: number
          id: string
          org_id: string
          origin_address: Json
          package_dimensions: Json | null
          package_weight: number | null
          service_type: string | null
        }
        Insert: {
          carrier_id: string
          carrier_rate: number
          created_at?: string
          currency?: string
          destination_address: Json
          estimated_days?: number | null
          expires_at: string
          final_rate: number
          id?: string
          org_id: string
          origin_address: Json
          package_dimensions?: Json | null
          package_weight?: number | null
          service_type?: string | null
        }
        Update: {
          carrier_id?: string
          carrier_rate?: number
          created_at?: string
          currency?: string
          destination_address?: Json
          estimated_days?: number | null
          expires_at?: string
          final_rate?: number
          id?: string
          org_id?: string
          origin_address?: Json
          package_dimensions?: Json | null
          package_weight?: number | null
          service_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rate_quotes_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "shipping_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rate_quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rate_quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rate_quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      social_sync_configs: {
        Row: {
          account_handle: string | null
          account_url: string | null
          auto_publish: boolean
          content_filter: Json | null
          created_at: string
          id: string
          is_enabled: boolean
          last_synced_at: string | null
          metadata: Json | null
          org_id: string | null
          owner_id: string
          owner_type: string
          platform: string
          sync_direction: string
          sync_frequency: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          account_handle?: string | null
          account_url?: string | null
          auto_publish?: boolean
          content_filter?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_synced_at?: string | null
          metadata?: Json | null
          org_id?: string | null
          owner_id: string
          owner_type?: string
          platform: string
          sync_direction?: string
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          account_handle?: string | null
          account_url?: string | null
          auto_publish?: boolean
          content_filter?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_synced_at?: string | null
          metadata?: Json | null
          org_id?: string | null
          owner_id?: string
          owner_type?: string
          platform?: string
          sync_direction?: string
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_sync_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_sync_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_sync_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string
          due_date: string | null
          gateway_reference: string | null
          id: string
          invoice_number: string
          invoice_type: string
          issued_at: string
          org_id: string | null
          paid_at: string | null
          payment_method: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          status: string
          updated_at: string
          user_id: string
          waiver_reason: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          description: string
          due_date?: string | null
          gateway_reference?: string | null
          id?: string
          invoice_number: string
          invoice_type?: string
          issued_at?: string
          org_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
          waiver_reason?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string
          due_date?: string | null
          gateway_reference?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: string
          issued_at?: string
          org_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          waiver_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          ai_measurement_price: number | null
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          included_ai_measurements: number | null
          included_video_minutes: number | null
          included_virtual_tryons: number | null
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
          video_minute_price: number | null
          virtual_tryon_price: number | null
        }
        Insert: {
          ai_measurement_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          included_ai_measurements?: number | null
          included_video_minutes?: number | null
          included_virtual_tryons?: number | null
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
          video_minute_price?: number | null
          virtual_tryon_price?: number | null
        }
        Update: {
          ai_measurement_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          included_ai_measurements?: number | null
          included_video_minutes?: number | null
          included_virtual_tryons?: number | null
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
          video_minute_price?: number | null
          virtual_tryon_price?: number | null
        }
        Relationships: []
      }
      subscription_rates: {
        Row: {
          billing_cycle: string
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          plan_name: string
          price_amount: number
          price_currency: string
          role_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          plan_name: string
          price_amount?: number
          price_currency?: string
          role_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          plan_name?: string
          price_amount?: number
          price_currency?: string
          role_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tailor_catalogue_items: {
        Row: {
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          is_published: boolean
          media_type: string
          media_url: string | null
          metadata: Json | null
          name: string
          org_id: string | null
          price: number | null
          social_platform: string | null
          social_post_id: string | null
          source: string
          source_url: string | null
          tags: string[] | null
          tailor_id: string
          tryon_enabled: boolean
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          media_type?: string
          media_url?: string | null
          metadata?: Json | null
          name: string
          org_id?: string | null
          price?: number | null
          social_platform?: string | null
          social_post_id?: string | null
          source?: string
          source_url?: string | null
          tags?: string[] | null
          tailor_id: string
          tryon_enabled?: boolean
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          media_type?: string
          media_url?: string | null
          metadata?: Json | null
          name?: string
          org_id?: string | null
          price?: number | null
          social_platform?: string | null
          social_post_id?: string | null
          source?: string
          source_url?: string | null
          tags?: string[] | null
          tailor_id?: string
          tryon_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tailor_catalogue_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tailor_catalogue_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tailor_catalogue_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      tailor_contracts: {
        Row: {
          agency_fee_percent: number
          auto_renew: boolean
          contract_number: string
          contract_type: string
          created_at: string
          end_date: string | null
          id: string
          max_concurrent_orders: number | null
          notes: string | null
          org_id: string
          payment_terms: string
          start_date: string
          status: string
          tailor_id: string
          tailor_rate_type: string
          tailor_rate_value: number
          terminated_at: string | null
          terminated_by: string | null
          termination_reason: string | null
          updated_at: string
        }
        Insert: {
          agency_fee_percent?: number
          auto_renew?: boolean
          contract_number: string
          contract_type?: string
          created_at?: string
          end_date?: string | null
          id?: string
          max_concurrent_orders?: number | null
          notes?: string | null
          org_id: string
          payment_terms?: string
          start_date?: string
          status?: string
          tailor_id: string
          tailor_rate_type?: string
          tailor_rate_value?: number
          terminated_at?: string | null
          terminated_by?: string | null
          termination_reason?: string | null
          updated_at?: string
        }
        Update: {
          agency_fee_percent?: number
          auto_renew?: boolean
          contract_number?: string
          contract_type?: string
          created_at?: string
          end_date?: string | null
          id?: string
          max_concurrent_orders?: number | null
          notes?: string | null
          org_id?: string
          payment_terms?: string
          start_date?: string
          status?: string
          tailor_id?: string
          tailor_rate_type?: string
          tailor_rate_value?: number
          terminated_at?: string | null
          terminated_by?: string | null
          termination_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tailor_contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tailor_contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tailor_contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tax_jurisdictions: {
        Row: {
          applies_to_saas: boolean
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          jurisdiction_code: string
          jurisdiction_name: string
          jurisdiction_type: string
          metadata: Json | null
          nexus_revenue_threshold: number | null
          nexus_transaction_threshold: number | null
          tax_name: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          applies_to_saas?: boolean
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          jurisdiction_code: string
          jurisdiction_name: string
          jurisdiction_type?: string
          metadata?: Json | null
          nexus_revenue_threshold?: number | null
          nexus_transaction_threshold?: number | null
          tax_name?: string
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          applies_to_saas?: boolean
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          jurisdiction_code?: string
          jurisdiction_name?: string
          jurisdiction_type?: string
          metadata?: Json | null
          nexus_revenue_threshold?: number | null
          nexus_transaction_threshold?: number | null
          tax_name?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      tax_ledger: {
        Row: {
          created_at: string
          currency: string
          customer_country: string | null
          customer_state: string | null
          entity_id: string | null
          entity_type: string
          exemption_reason: string | null
          id: string
          is_exempt: boolean
          jurisdiction_id: string | null
          org_id: string | null
          period: string
          reference_id: string | null
          reference_type: string | null
          status: string
          tax_amount: number
          tax_rate: number
          tax_type: string
          taxable_amount: number
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_country?: string | null
          customer_state?: string | null
          entity_id?: string | null
          entity_type?: string
          exemption_reason?: string | null
          id?: string
          is_exempt?: boolean
          jurisdiction_id?: string | null
          org_id?: string | null
          period: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          tax_amount?: number
          tax_rate?: number
          tax_type: string
          taxable_amount: number
        }
        Update: {
          created_at?: string
          currency?: string
          customer_country?: string | null
          customer_state?: string | null
          entity_id?: string | null
          entity_type?: string
          exemption_reason?: string | null
          id?: string
          is_exempt?: boolean
          jurisdiction_id?: string | null
          org_id?: string | null
          period?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          tax_amount?: number
          tax_rate?: number
          tax_type?: string
          taxable_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_ledger_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "tax_jurisdictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      termii_campaigns: {
        Row: {
          campaign_name: string
          campaign_type: string
          cost_amount: number | null
          cost_currency: string | null
          created_at: string | null
          created_by: string
          delivered_count: number | null
          failed_count: number | null
          id: string
          message_template: string
          org_id: string
          phonebook_id: string | null
          scheduled_at: string | null
          sender_id: string | null
          sent_at: string | null
          status: string | null
          termii_campaign_id: string | null
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_name: string
          campaign_type?: string
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string | null
          created_by: string
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message_template: string
          org_id: string
          phonebook_id?: string | null
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: string | null
          termii_campaign_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_name?: string
          campaign_type?: string
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string | null
          created_by?: string
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message_template?: string
          org_id?: string
          phonebook_id?: string | null
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: string | null
          termii_campaign_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "termii_campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termii_campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termii_campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      termii_phonebooks: {
        Row: {
          contact_count: number | null
          created_at: string | null
          description: string | null
          id: string
          org_id: string
          phonebook_name: string
          termii_phonebook_id: string | null
          updated_at: string | null
        }
        Insert: {
          contact_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          org_id: string
          phonebook_name: string
          termii_phonebook_id?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          org_id?: string
          phonebook_name?: string
          termii_phonebook_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "termii_phonebooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termii_phonebooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termii_phonebooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      token_packages: {
        Row: {
          bonus_credits: number
          created_at: string
          credits: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_amount: number
          price_currency: string
          sort_order: number
          target_role: string
          updated_at: string
        }
        Insert: {
          bonus_credits?: number
          created_at?: string
          credits: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_amount?: number
          price_currency?: string
          sort_order?: number
          target_role?: string
          updated_at?: string
        }
        Update: {
          bonus_credits?: number
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_amount?: number
          price_currency?: string
          sort_order?: number
          target_role?: string
          updated_at?: string
        }
        Relationships: []
      }
      token_purchases: {
        Row: {
          amount_paid: number
          created_at: string
          credits_purchased: number
          currency: string
          gateway_checkout_url: string | null
          gateway_reference: string | null
          id: string
          org_id: string | null
          package_id: string | null
          paid_at: string | null
          payment_gateway: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          credits_purchased: number
          currency?: string
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          id?: string
          org_id?: string | null
          package_id?: string | null
          paid_at?: string | null
          payment_gateway: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          credits_purchased?: number
          currency?: string
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          id?: string
          org_id?: string | null
          package_id?: string | null
          paid_at?: string | null
          payment_gateway?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "token_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          last_seen_at: string
          last_step_index: number
          role: string
          total_steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          last_seen_at?: string
          last_step_index?: number
          role: string
          total_steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          last_seen_at?: string
          last_step_index?: number
          role?: string
          total_steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_fee_exemptions: {
        Row: {
          created_at: string
          exemption_type: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          invoice_generated_at: string | null
          invoice_id: string | null
          is_active: boolean
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          exemption_type: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          invoice_generated_at?: string | null
          invoice_id?: string | null
          is_active?: boolean
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          exemption_type?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          invoice_generated_at?: string | null
          invoice_id?: string | null
          is_active?: boolean
          reason?: string | null
          user_id?: string
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
          {
            foreignKeyName: "user_notification_preferences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
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
      verification_provider_config: {
        Row: {
          config: Json | null
          cost_per_verification: number | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean | null
          monthly_limit: number | null
          monthly_used: number | null
          priority: number | null
          provider: string
          supported_countries: string[] | null
          supported_entity_types: string[] | null
          supported_id_types: string[] | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          cost_per_verification?: number | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean | null
          monthly_limit?: number | null
          monthly_used?: number | null
          priority?: number | null
          provider: string
          supported_countries?: string[] | null
          supported_entity_types?: string[] | null
          supported_id_types?: string[] | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          cost_per_verification?: number | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean | null
          monthly_limit?: number | null
          monthly_used?: number | null
          priority?: number | null
          provider?: string
          supported_countries?: string[] | null
          supported_entity_types?: string[] | null
          supported_id_types?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      verification_provider_test_log: {
        Row: {
          created_at: string
          environment: string | null
          id: string
          latency_ms: number | null
          message: string | null
          provider: string
          status_code: number | null
          success: boolean
          tested_by: string | null
        }
        Insert: {
          created_at?: string
          environment?: string | null
          id?: string
          latency_ms?: number | null
          message?: string | null
          provider: string
          status_code?: number | null
          success: boolean
          tested_by?: string | null
        }
        Update: {
          created_at?: string
          environment?: string | null
          id?: string
          latency_ms?: number | null
          message?: string | null
          provider?: string
          status_code?: number | null
          success?: boolean
          tested_by?: string | null
        }
        Relationships: []
      }
      video_uploads: {
        Row: {
          catalogue_item_id: string | null
          created_at: string | null
          duration_seconds: number | null
          file_name: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          media_group_id: string | null
          org_id: string | null
          status: string | null
          tokens_charged: number
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          catalogue_item_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          media_group_id?: string | null
          org_id?: string | null
          status?: string | null
          tokens_charged?: number
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          catalogue_item_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          media_group_id?: string | null
          org_id?: string | null
          status?: string | null
          tokens_charged?: number
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_uploads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_uploads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_uploads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_uploads_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_tryon_sessions: {
        Row: {
          created_at: string
          customer_id: string
          error_message: string | null
          garment_description: string | null
          id: string
          input_image_url: string | null
          measurement_profile_id: string | null
          metadata: Json | null
          org_id: string
          result_image_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          error_message?: string | null
          garment_description?: string | null
          id?: string
          input_image_url?: string | null
          measurement_profile_id?: string | null
          metadata?: Json | null
          org_id: string
          result_image_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          error_message?: string | null
          garment_description?: string | null
          id?: string
          input_image_url?: string | null
          measurement_profile_id?: string | null
          metadata?: Json | null
          org_id?: string
          result_image_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_tryon_sessions_measurement_profile_id_fkey"
            columns: ["measurement_profile_id"]
            isOneToOne: false
            referencedRelation: "measurement_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_tryon_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_tryon_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_tryon_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_auto_topup: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          max_monthly_topups: number | null
          month_reset_at: string | null
          payment_method: string | null
          threshold_balance: number | null
          topup_amount: number | null
          topups_this_month: number | null
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_monthly_topups?: number | null
          month_reset_at?: string | null
          payment_method?: string | null
          threshold_balance?: number | null
          topup_amount?: number | null
          topups_this_month?: number | null
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_monthly_topups?: number | null
          month_reset_at?: string | null
          payment_method?: string | null
          threshold_balance?: number | null
          topup_amount?: number | null
          topups_this_month?: number | null
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_auto_topup_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: true
            referencedRelation: "credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_event_log: {
        Row: {
          call_sid: string | null
          created_at: string
          event_type: string
          external_id: string | null
          from_number: string | null
          headers: Json
          id: string
          message_sid: string | null
          org_id: string | null
          payload: Json
          processing_notes: string | null
          provider: string
          received_at: string
          signature_reason: string | null
          signature_verified: boolean
          status: string | null
          to_number: string | null
        }
        Insert: {
          call_sid?: string | null
          created_at?: string
          event_type: string
          external_id?: string | null
          from_number?: string | null
          headers?: Json
          id?: string
          message_sid?: string | null
          org_id?: string | null
          payload?: Json
          processing_notes?: string | null
          provider: string
          received_at?: string
          signature_reason?: string | null
          signature_verified?: boolean
          status?: string | null
          to_number?: string | null
        }
        Update: {
          call_sid?: string | null
          created_at?: string
          event_type?: string
          external_id?: string | null
          from_number?: string | null
          headers?: Json
          id?: string
          message_sid?: string | null
          org_id?: string | null
          payload?: Json
          processing_notes?: string | null
          provider?: string
          received_at?: string
          signature_reason?: string | null
          signature_verified?: boolean
          status?: string | null
          to_number?: string | null
        }
        Relationships: []
      }
      website_builder_requests: {
        Row: {
          assigned_admin_id: string | null
          assigned_at: string | null
          assigned_to: string | null
          completed_at: string | null
          contact_history: Json | null
          created_at: string
          deadline: string | null
          gateway_checkout_url: string | null
          gateway_reference: string | null
          id: string
          implementation_notes: string | null
          launched_at: string | null
          monthly_maintenance: number
          notes: string | null
          one_time_fee: number
          org_id: string
          paid_at: string | null
          payment_gateway: string | null
          payment_status: string
          plan: string
          platform_fee: number
          preview_url: string | null
          priority: string
          requested_at: string
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_history?: Json | null
          created_at?: string
          deadline?: string | null
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          id?: string
          implementation_notes?: string | null
          launched_at?: string | null
          monthly_maintenance?: number
          notes?: string | null
          one_time_fee?: number
          org_id: string
          paid_at?: string | null
          payment_gateway?: string | null
          payment_status?: string
          plan?: string
          platform_fee?: number
          preview_url?: string | null
          priority?: string
          requested_at?: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_history?: Json | null
          created_at?: string
          deadline?: string | null
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          id?: string
          implementation_notes?: string | null
          launched_at?: string | null
          monthly_maintenance?: number
          notes?: string | null
          one_time_fee?: number
          org_id?: string
          paid_at?: string | null
          payment_gateway?: string | null
          payment_status?: string
          plan?: string
          platform_fee?: number
          preview_url?: string | null
          priority?: string
          requested_at?: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_builder_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_builder_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_builder_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      website_builder_subscriptions: {
        Row: {
          activated_at: string | null
          auto_renew: boolean
          cancelled_at: string | null
          created_at: string
          gateway_checkout_url: string | null
          gateway_reference: string | null
          grandfathered_at: string | null
          id: string
          monthly_fee: number
          notes: string | null
          org_id: string
          payment_gateway: string | null
          plan: string
          platform_fee: number
          status: string
          trial_end: string
          trial_start: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          grandfathered_at?: string | null
          id?: string
          monthly_fee?: number
          notes?: string | null
          org_id: string
          payment_gateway?: string | null
          plan?: string
          platform_fee?: number
          status?: string
          trial_end?: string
          trial_start?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          gateway_checkout_url?: string | null
          gateway_reference?: string | null
          grandfathered_at?: string | null
          id?: string
          monthly_fee?: number
          notes?: string | null
          org_id?: string
          payment_gateway?: string | null
          plan?: string
          platform_fee?: number
          status?: string
          trial_end?: string
          trial_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_builder_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_builder_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_builder_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      website_pricing_config: {
        Row: {
          config_data: Json
          created_at: string
          created_by: string
          id: string
          version: number
        }
        Insert: {
          config_data?: Json
          created_at?: string
          created_by: string
          id?: string
          version?: number
        }
        Update: {
          config_data?: Json
          created_at?: string
          created_by?: string
          id?: string
          version?: number
        }
        Relationships: []
      }
      website_pricing_history: {
        Row: {
          changed_at: string
          changed_by: string
          config_id: string | null
          field: string
          id: string
          new_value: string
          old_value: string
          plan: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          config_id?: string | null
          field: string
          id?: string
          new_value: string
          old_value: string
          plan: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          config_id?: string | null
          field?: string
          id?: string
          new_value?: string
          old_value?: string
          plan?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_pricing_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "website_pricing_config"
            referencedColumns: ["id"]
          },
        ]
      }
      website_request_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          request_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          request_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_request_audit_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "website_builder_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      whatchimp_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          org_id: string | null
          owner_id: string
          owner_type: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          org_id?: string | null
          owner_id: string
          owner_type?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          org_id?: string | null
          owner_id?: string
          owner_type?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatchimp_api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatchimp_api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatchimp_api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_pending_verifications_v: {
        Row: {
          country: string | null
          created_at: string | null
          name: string | null
          notes: string | null
          owner_user_id: string | null
          reg_number: string | null
          reg_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string | null
          status: string | null
          submitted_at: string | null
          target_id: string | null
          target_type: string | null
        }
        Relationships: []
      }
      org_websites_public: {
        Row: {
          accent_color: string | null
          brand_color: string | null
          color_palette: Json | null
          created_at: string | null
          facebook_url: string | null
          favicon_url: string | null
          font_body: string | null
          font_heading: string | null
          hero_description: string | null
          hero_image_url: string | null
          id: string | null
          instagram_url: string | null
          is_enabled: boolean | null
          linkedin_url: string | null
          mission_statement: string | null
          mode: string | null
          org_id: string | null
          tagline: string | null
          theme: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string | null
          vision_statement: string | null
          whatsapp_number: string | null
          youtube_url: string | null
        }
        Insert: {
          accent_color?: string | null
          brand_color?: string | null
          color_palette?: Json | null
          created_at?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          hero_description?: string | null
          hero_image_url?: string | null
          id?: string | null
          instagram_url?: string | null
          is_enabled?: boolean | null
          linkedin_url?: string | null
          mission_statement?: string | null
          mode?: string | null
          org_id?: string | null
          tagline?: string | null
          theme?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          vision_statement?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Update: {
          accent_color?: string | null
          brand_color?: string | null
          color_palette?: Json | null
          created_at?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          hero_description?: string | null
          hero_image_url?: string | null
          id?: string | null
          instagram_url?: string | null
          is_enabled?: boolean | null
          linkedin_url?: string | null
          mission_statement?: string | null
          mode?: string | null
          org_id?: string | null
          tagline?: string | null
          theme?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          vision_statement?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_websites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_websites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_websites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations_public: {
        Row: {
          country: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string | null
          phone: string | null
          physical_address: string | null
          region: string | null
          slug: string | null
          specialties: string[] | null
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          phone?: string | null
          physical_address?: string | null
          region?: string | null
          slug?: string | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          phone?: string | null
          physical_address?: string | null
          region?: string | null
          slug?: string | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organizations_summary: {
        Row: {
          country: string | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          region: string | null
          slug: string | null
        }
        Insert: {
          country?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          region?: string | null
          slug?: string | null
        }
        Update: {
          country?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          region?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_set_verification_status: {
        Args: {
          _decision: string
          _notes?: string
          _target_id: string
          _target_type: string
        }
        Returns: Json
      }
      assign_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      claim_promotional_grant: {
        Args: { _grant_type: string; _org_id?: string }
        Returns: Json
      }
      cleanup_expired_sentinel_storage_objects: {
        Args: { _limit?: number }
        Returns: {
          deleted_id: string
          entitlement_id: string
          storage_path: string
        }[]
      }
      create_organization_with_admin: {
        Args: {
          _country?: string
          _currency?: string
          _name: string
          _slug: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_designer_personal_org: { Args: never; Returns: string }
      get_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_public_org_officers: {
        Args: { _org_id: string }
        Returns: {
          bio: string
          display_order: number
          full_name: string
          id: string
          org_id: string
          photo_url: string
          title: string
        }[]
      }
      has_promotional_grant: {
        Args: { _grant_type: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_monetization_enabled: {
        Args: { _feature?: string; _function?: string; _user_type?: string }
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
      join_organization: {
        Args: {
          _org_id: string
          _role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      log_admin_access_violation: {
        Args: { _function_name: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      org_has_promotional_grant: {
        Args: { _grant_type: string; _org_id: string }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "super_assistant"
        | "org_admin"
        | "manager"
        | "tailor"
        | "customer"
        | "designer"
        | "platform_management"
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
      app_role: [
        "super_admin",
        "super_assistant",
        "org_admin",
        "manager",
        "tailor",
        "customer",
        "designer",
        "platform_management",
      ],
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
