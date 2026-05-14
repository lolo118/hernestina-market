/**
 * Manually curated database types. Regenerate later with:
 *   npx supabase gen types typescript --project-id <id> --schema public > src/lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Relationship<C extends string, T extends string, RC extends string> = {
  foreignKeyName: string
  columns: [C]
  isOneToOne: false
  referencedRelation: T
  referencedColumns: [RC]
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: "superuser" | "cashier"
          active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role: "superuser" | "cashier"
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
        Relationships: []
      }
      sections: {
        Row: { id: number; code: string; name: string; default_iva_rate: number }
        Insert: { id?: number; code: string; name: string; default_iva_rate?: number }
        Update: Partial<Database["public"]["Tables"]["sections"]["Insert"]>
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          store_name: string
          address: string | null
          cuit: string | null
          receipt_footer: string | null
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>
        Relationships: []
      }
      products: {
        Row: {
          id: number
          section_id: number
          name: string
          description: string | null
          barcode: string | null
          sku: string | null
          unit: string
          cost: number
          price: number
          iva_rate: number
          stock: number
          min_stock: number
          active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          section_id: number
          name: string
          description?: string | null
          barcode?: string | null
          sku?: string | null
          unit: string
          cost?: number
          price: number
          iva_rate?: number
          stock?: number
          min_stock?: number
          active?: boolean
          created_by?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>
        Relationships: [Relationship<"section_id", "sections", "id">, Relationship<"created_by", "profiles", "id">]
      }
      cash_sessions: {
        Row: {
          id: number
          cashier_id: string
          opened_at: string
          closed_at: string | null
          opening_cash: number
          expected_cash: number | null
          counted_cash: number | null
          difference: number | null
          notes: string | null
          status: "open" | "closed"
        }
        Insert: { cashier_id: string; opening_cash: number; notes?: string | null }
        Update: Partial<Database["public"]["Tables"]["cash_sessions"]["Row"]>
        Relationships: [Relationship<"cashier_id", "profiles", "id">]
      }
      sales: {
        Row: {
          id: number
          cashier_id: string
          cash_session_id: number | null
          subtotal: number
          iva_total: number
          total: number
          status: "completed" | "voided"
          voided_at: string | null
          voided_by: string | null
          void_reason: string | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["sales"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["sales"]["Row"]>
        Relationships: [
          Relationship<"cashier_id", "profiles", "id">,
          Relationship<"cash_session_id", "cash_sessions", "id">,
          Relationship<"voided_by", "profiles", "id">,
        ]
      }
      sale_items: {
        Row: {
          id: number
          sale_id: number
          product_id: number
          product_name: string
          quantity: number
          unit: string
          unit_price: number
          iva_rate: number
          subtotal: number
        }
        Insert: Partial<Database["public"]["Tables"]["sale_items"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["sale_items"]["Row"]>
        Relationships: [
          Relationship<"sale_id", "sales", "id">,
          Relationship<"product_id", "products", "id">,
        ]
      }
      sale_payments: {
        Row: {
          id: number
          sale_id: number
          method: string
          amount: number
          reference: string | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["sale_payments"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["sale_payments"]["Row"]>
        Relationships: [Relationship<"sale_id", "sales", "id">]
      }
      stock_movements: {
        Row: {
          id: number
          product_id: number
          type: "entry" | "adjustment" | "sale" | "void" | "loss"
          quantity: number
          unit_cost: number | null
          reason: string | null
          reference_id: number | null
          user_id: string
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["stock_movements"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["stock_movements"]["Row"]>
        Relationships: [
          Relationship<"product_id", "products", "id">,
          Relationship<"user_id", "profiles", "id">,
        ]
      }
      audit_log: {
        Row: {
          id: number
          user_id: string | null
          action: string
          entity: string
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["audit_log"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Row"]>
        Relationships: [Relationship<"user_id", "profiles", "id">]
      }
    }
    Views: {
      v_low_stock: {
        Row: { id: number; name: string; stock: number; min_stock: number; section_name: string }
        Relationships: []
      }
    }
    Functions: {
      create_sale: {
        Args: {
          p_cashier_id: string
          p_cash_session_id: number
          p_items: Json
          p_payments: Json
        }
        Returns: number
      }
      register_stock_entry: {
        Args: {
          p_product_id: number
          p_quantity: number
          p_unit_cost?: number | null
          p_reason?: string | null
          p_update_cost?: boolean
          p_type?: "entry" | "adjustment" | "loss"
        }
        Returns: number
      }
      void_sale: { Args: { p_sale_id: number; p_reason: string }; Returns: void }
      open_cash_session: { Args: { p_opening_cash: number }; Returns: number }
      close_cash_session: { Args: { p_session_id: number; p_counted_cash: number; p_notes?: string | null }; Returns: void }
      is_superuser: { Args: Record<string, never>; Returns: boolean }
      is_active_user: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Product = Tables<"products">
export type Profile = Tables<"profiles">
export type Sale = Tables<"sales">
export type SaleItem = Tables<"sale_items">
export type SalePayment = Tables<"sale_payments">
export type CashSession = Tables<"cash_sessions">
export type StockMovement = Tables<"stock_movements">
export type Section = Tables<"sections">
export type AuditLog = Tables<"audit_log">
export type AppSettings = Tables<"settings">
