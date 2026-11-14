// ==============================================================================
// Z Institute Management System - Database Type Definitions
// Generated for Supabase JavaScript SDK (@supabase/supabase-js)
// Aligned with Migrations 0001 - 0005
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
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'other';
export type AttendanceStatus = 'present' | 'absent';
export type FeeStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

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
          course: string;
          total_fee: number;
          joining_date: string;
          status: StudentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          admission_id: string;
          name: string;
          phone: string;
          course: string;
          total_fee: number;
          joining_date?: string;
          status?: StudentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          admission_id?: string;
          name?: string;
          phone?: string;
          course?: string;
          total_fee?: number;
          joining_date?: string;
          status?: StudentStatus;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          date?: string;
          status: AttendanceStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          date?: string;
          status?: AttendanceStatus;
          created_at?: string;
          updated_at?: string;
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
