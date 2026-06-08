/**
 * Tipos del esquema de la base de datos para el cliente de Supabase.
 * Mantener sincronizado con las migraciones en `supabase/migrations/`.
 * (Equivalente a la salida de `supabase gen types typescript`.)
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AppRoleEnum = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'EVENT_MANAGER' | 'GATE_STAFF'
export type EventStatusEnum = 'draft' | 'published' | 'finished' | 'cancelled'
export type TicketStatusEnum = 'valid' | 'used' | 'void'

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          legal_name: string | null
          document_number: string | null
          email: string | null
          phone: string | null
          city: string | null
          country: string
          logo_url: string | null
          plan: string
          status: string
          max_events: number
          max_users: number
          commission_percentage: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          legal_name?: string | null
          document_number?: string | null
          email?: string | null
          phone?: string | null
          city?: string | null
          country?: string
          logo_url?: string | null
          plan?: string
          status?: string
          max_events?: number
          max_users?: number
          commission_percentage?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          legal_name?: string | null
          document_number?: string | null
          email?: string | null
          phone?: string | null
          city?: string | null
          country?: string
          logo_url?: string | null
          plan?: string
          status?: string
          max_events?: number
          max_users?: number
          commission_percentage?: number
        }
        Relationships: []
      }
      user_companies: {
        Row: {
          id: string
          user_id: string
          company_id: string
          role: AppRoleEnum
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          role: AppRoleEnum
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          role?: AppRoleEnum
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          company_id: string | null
          role: AppRoleEnum
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          company_id?: string | null
          role: AppRoleEnum
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          role?: AppRoleEnum
          full_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          company_id: string
          name: string
          venue: string
          event_at: string
          status: EventStatusEnum
          description: string | null
          flyer_url: string | null
          theme_config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          venue: string
          event_at: string
          status?: EventStatusEnum
          description?: string | null
          flyer_url?: string | null
          theme_config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          venue?: string
          event_at?: string
          status?: EventStatusEnum
          description?: string | null
          flyer_url?: string | null
          theme_config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_tiers: {
        Row: {
          id: string
          event_id: string
          company_id: string
          name: string
          price: number
          currency: string
          quota: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          company_id: string
          name: string
          price?: number
          currency: string
          quota?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          company_id?: string
          name?: string
          price?: number
          currency?: string
          quota?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendees: {
        Row: {
          id: string
          company_id: string
          event_id: string
          full_name: string
          email: string
          cedula_enc: string
          cedula_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          event_id: string
          full_name: string
          email: string
          cedula_enc: string
          cedula_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          event_id?: string
          full_name?: string
          email?: string
          cedula_enc?: string
          cedula_hash?: string
          created_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          id: string
          company_id: string
          event_id: string
          tier_id: string
          attendee_id: string
          status: TicketStatusEnum
          used_at: string | null
          pdf_path: string | null
          transfer_receipt_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          event_id: string
          tier_id: string
          attendee_id: string
          status?: TicketStatusEnum
          used_at?: string | null
          pdf_path?: string | null
          transfer_receipt_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          event_id?: string
          tier_id?: string
          attendee_id?: string
          status?: TicketStatusEnum
          used_at?: string | null
          pdf_path?: string | null
          transfer_receipt_path?: string | null
          created_at?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          id: string
          company_id: string
          ticket_id: string | null
          scanned_by: string | null
          result: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          ticket_id?: string | null
          scanned_by?: string | null
          result: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          ticket_id?: string | null
          scanned_by?: string | null
          result?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      checkin_ticket: {
        Args: { p_ticket_id: string }
        Returns: {
          result: string
          used_at: string | null
          full_name: string | null
          tier_name: string | null
        }[]
      }
    }
    Enums: {
      app_role: AppRoleEnum
      event_status: EventStatusEnum
      ticket_status: TicketStatusEnum
    }
    CompositeTypes: Record<string, never>
  }
}
