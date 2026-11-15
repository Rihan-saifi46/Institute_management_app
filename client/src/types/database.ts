// ==============================================================================
// Z Institute Management System - Database Type Definitions
// Generated for Supabase JavaScript SDK (@supabase/supabase-js)
// Aligned with Migrations 0001 - 0006 (Monthly Fee Engine & Advance Module)
// ==============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AdminRole = 'super_admin' | 'manager';
export type StudentStatus = 'active' | 'completed' | 'dropped';
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
export type AttendanceStatus = 'present' | 'absent';
export type FeeStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type AdvanceStatus = 'Upcoming' | 'Partially Applied' | 'Applied' | 'Voided';
export type OutboxStatus = 'pending' | 'sent' | 'failed' | 'not_required';
export type AllocationType = 'normal_payment' | 'advance_adjustment';

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          full_name: string;
          role: AdminRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          full_name: string;
          role?: AdminRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          full_name?: string;
          role?: AdminRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          admission_id: string;
          name: string;
          phone: string;
          email: string | null;
          course: string;
          total_fee: number;
          joining_date: string;
          status: StudentStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          admission_id: string;
          name: string;
          phone: string;
          email?: string | null;
          course: string;
          total_fee: number;
          joining_date?: string;
          status?: StudentStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          admission_id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          course?: string;
          total_fee?: number;
          joining_date?: string;
          status?: StudentStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fee_payments: {
        Row: {
          id: string;
          student_id: string;
          amount: number;
          payment_date: string;
          payment_mode: PaymentMode;
          receipt_number: string | null;
          remarks: string | null;
          is_reversal: boolean;
          reversal_of_id: string | null;
          void_reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          amount: number;
          payment_date?: string;
          payment_mode?: PaymentMode;
          receipt_number?: string | null;
          remarks?: string | null;
          is_reversal?: boolean;
          reversal_of_id?: string | null;
          void_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          amount?: number;
          payment_date?: string;
          payment_mode?: PaymentMode;
          receipt_number?: string | null;
          remarks?: string | null;
          is_reversal?: boolean;
          reversal_of_id?: string | null;
          void_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fee_payments_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_payments_reversal_of_id_fkey";
            columns: ["reversal_of_id"];
            referencedRelation: "fee_payments";
            referencedColumns: ["id"];
          }
        ];
      };
      attendance: {
        Row: {
          id: string;
          student_id: string;
          date: string;
          status: AttendanceStatus;
          remarks: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          date?: string;
          status: AttendanceStatus;
          remarks?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          date?: string;
          status?: AttendanceStatus;
          remarks?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      fee_periods: {
        Row: {
          id: string;
          period_key: string;
          period_name: string;
          start_date: string;
          end_date: string;
          due_date: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          period_key: string;
          period_name: string;
          start_date: string;
          end_date: string;
          due_date: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          period_key?: string;
          period_name?: string;
          start_date?: string;
          end_date?: string;
          due_date?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      monthly_fee_dues: {
        Row: {
          id: string;
          student_id: string;
          period_id: string;
          fee_snapshot: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          period_id: string;
          fee_snapshot: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          period_id?: string;
          fee_snapshot?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_fee_dues_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_fee_dues_period_id_fkey";
            columns: ["period_id"];
            referencedRelation: "fee_periods";
            referencedColumns: ["id"];
          }
        ];
      };
      fee_payment_allocations: {
        Row: {
          id: string;
          payment_id: string;
          due_id: string;
          allocated_amount: number;
          allocation_type: AllocationType;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          due_id: string;
          allocated_amount: number;
          allocation_type?: AllocationType;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          due_id?: string;
          allocated_amount?: number;
          allocation_type?: AllocationType;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fee_payment_allocations_payment_id_fkey";
            columns: ["payment_id"];
            referencedRelation: "fee_payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_payment_allocations_due_id_fkey";
            columns: ["due_id"];
            referencedRelation: "monthly_fee_dues";
            referencedColumns: ["id"];
          }
        ];
      };
      advance_fee_records: {
        Row: {
          id: string;
          student_id: string;
          target_period_id: string;
          payment_id: string;
          amount_received: number;
          status: AdvanceStatus;
          created_by: string | null;
          created_at: string;
          applied_at: string | null;
          voided_by: string | null;
          voided_at: string | null;
          void_reason: string | null;
          reversal_payment_id: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          target_period_id: string;
          payment_id: string;
          amount_received: number;
          status?: AdvanceStatus;
          created_by?: string | null;
          created_at?: string;
          applied_at?: string | null;
          voided_by?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
          reversal_payment_id?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          target_period_id?: string;
          payment_id?: string;
          amount_received?: number;
          status?: AdvanceStatus;
          created_by?: string | null;
          created_at?: string;
          applied_at?: string | null;
          voided_by?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
          reversal_payment_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "advance_fee_records_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "advance_fee_records_target_period_id_fkey";
            columns: ["target_period_id"];
            referencedRelation: "fee_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "advance_fee_records_payment_id_fkey";
            columns: ["payment_id"];
            referencedRelation: "fee_payments";
            referencedColumns: ["id"];
          }
        ];
      };
      email_outbox: {
        Row: {
          id: string;
          student_id: string | null;
          advance_record_id: string | null;
          recipient_email: string | null;
          subject: string;
          template_name: string;
          payload: Json;
          status: OutboxStatus;
          attempts: number;
          last_error: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          advance_record_id?: string | null;
          recipient_email?: string | null;
          subject: string;
          template_name: string;
          payload: Json;
          status?: OutboxStatus;
          attempts?: number;
          last_error?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          advance_record_id?: string | null;
          recipient_email?: string | null;
          subject?: string;
          template_name?: string;
          payload?: Json;
          status?: OutboxStatus;
          attempts?: number;
          last_error?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_outbox_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_outbox_advance_record_id_fkey";
            columns: ["advance_record_id"];
            referencedRelation: "advance_fee_records";
            referencedColumns: ["id"];
          }
        ];
      };
      monthly_generation_logs: {
        Row: {
          id: string;
          period_key: string;
          triggered_by: string;
          dues_created: number;
          advances_applied: number;
          status: string;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          period_key: string;
          triggered_by: string;
          dues_created?: number;
          advances_applied?: number;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          period_key?: string;
          triggered_by?: string;
          dues_created?: number;
          advances_applied?: number;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      student_fee_summary: {
        Row: {
          id: string;
          admission_id: string;
          name: string;
          phone: string;
          course: string;
          status: StudentStatus;
          joining_date: string;
          total_fee: number;
          total_paid: number;
          balance_due: number;
          fee_status: FeeStatus;
        };
        Relationships: [];
      };
      monthly_due_status_view: {
        Row: {
          due_id: string;
          student_id: string;
          admission_id: string;
          student_name: string;
          student_phone: string;
          student_email: string | null;
          student_course: string;
          period_id: string;
          period_key: string;
          period_name: string;
          period_start: string;
          period_end: string;
          due_date: string;
          fee_snapshot: number;
          normal_paid_amount: number;
          advance_applied_amount: number;
          total_settled_amount: number;
          balance_remaining: number;
          status: FeeStatus;
          is_arrears: boolean;
        };
        Relationships: [];
      };
    };
    Functions: {
      reverse_payment: {
        Args: {
          p_payment_id: string;
          p_reason: string;
        };
        Returns: string;
      };
      mark_batch_attendance: {
        Args: {
          p_date: string;
          p_records: Json;
        };
        Returns: number;
      };
      generate_monthly_dues: {
        Args: {
          p_period_key: string;
        };
        Returns: Json;
      };
      collect_monthly_fee: {
        Args: {
          p_due_id: string;
          p_amount: number;
          p_payment_mode: string;
          p_receipt_number?: string;
          p_remarks?: string;
        };
        Returns: Json;
      };
      record_advance_fee: {
        Args: {
          p_student_id: string;
          p_target_period_key: string;
          p_amount: number;
          p_payment_mode: string;
          p_receipt_number?: string;
          p_remarks?: string;
          p_student_email?: string;
        };
        Returns: Json;
      };
      apply_advance_adjustments: {
        Args: {
          p_period_id: string;
        };
        Returns: number;
      };
      void_advance_fee: {
        Args: {
          p_advance_id: string;
          p_void_reason: string;
        };
        Returns: Json;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_active_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
