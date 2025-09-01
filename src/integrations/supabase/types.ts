export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      automation_logs: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          reservation_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          reservation_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      car_status_logs: {
        Row: {
          action: string
          details: string | null
          error: string | null
          executed_at: string | null
          id: number
        }
        Insert: {
          action: string
          details?: string | null
          error?: string | null
          executed_at?: string | null
          id?: number
        }
        Update: {
          action?: string
          details?: string | null
          error?: string | null
          executed_at?: string | null
          id?: number
        }
        Relationships: []
      }
      cars: {
        Row: {
          brand: string
          color: string | null
          created_at: string | null
          current_km: number | null
          id: string
          km_margin: number
          last_maintenance: string | null
          last_revision_km: number
          last_used_date: string | null
          model: string
          next_maintenance_km: number | null
          next_revision_km: number
          observations: string | null
          plate: string
          status: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          brand?: string
          color?: string | null
          created_at?: string | null
          current_km?: number | null
          id?: string
          km_margin?: number
          last_maintenance?: string | null
          last_revision_km?: number
          last_used_date?: string | null
          model?: string
          next_maintenance_km?: number | null
          next_revision_km?: number
          observations?: string | null
          plate: string
          status?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string | null
          current_km?: number | null
          id?: string
          km_margin?: number
          last_maintenance?: string | null
          last_revision_km?: number
          last_used_date?: string | null
          model?: string
          next_maintenance_km?: number | null
          next_revision_km?: number
          observations?: string | null
          plate?: string
          status?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      conductors: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          email: string
          id: string
          km_reminder_last_sent_on: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          km_reminder_last_sent_on?: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          km_reminder_last_sent_on?: string
          name?: string
        }
        Relationships: []
      }
      km_records: {
        Row: {
          car_id: string
          created_at: string | null
          current_km: number
          id: string
          km_driven: number | null
          previous_km: number
          record_date: string
          reservation_id: string | null
        }
        Insert: {
          car_id: string
          created_at?: string | null
          current_km: number
          id?: string
          km_driven?: number | null
          previous_km: number
          record_date?: string
          reservation_id?: string | null
        }
        Update: {
          car_id?: string
          created_at?: string | null
          current_km?: number
          id?: string
          km_driven?: number | null
          previous_km?: number
          record_date?: string
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "km_records_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "km_records_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_history: {
        Row: {
          car_id: string
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          km_at_maintenance: number
          maintenance_date: string
          maintenance_type_id: string
          next_due_date: string
          next_due_km: number
          notes: string | null
          performed_by: string | null
          updated_at: string | null
        }
        Insert: {
          car_id: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          km_at_maintenance: number
          maintenance_date: string
          maintenance_type_id: string
          next_due_date: string
          next_due_km: number
          notes?: string | null
          performed_by?: string | null
          updated_at?: string | null
        }
        Update: {
          car_id?: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          km_at_maintenance?: number
          maintenance_date?: string
          maintenance_type_id?: string
          next_due_date?: string
          next_due_km?: number
          notes?: string | null
          performed_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_history_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_history_maintenance_type_id_fkey"
            columns: ["maintenance_type_id"]
            isOneToOne: false
            referencedRelation: "maintenance_types"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          car_id: string
          created_at: string | null
          description: string | null
          id: string
          km_at_maintenance: number
          maintenance_date: string
          type: string
        }
        Insert: {
          car_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          km_at_maintenance: number
          maintenance_date: string
          type: string
        }
        Update: {
          car_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          km_at_maintenance?: number
          maintenance_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_types: {
        Row: {
          category: string
          created_at: string | null
          default_km_interval: number | null
          default_time_interval_months: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_km_interval: number | null
          max_time_interval_months: number | null
          min_km_interval: number | null
          min_time_interval_months: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          default_km_interval?: number | null
          default_time_interval_months?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_km_interval?: number | null
          max_time_interval_months?: number | null
          min_km_interval?: number | null
          min_time_interval_months?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          default_km_interval?: number | null
          default_time_interval_months?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_km_interval?: number | null
          max_time_interval_months?: number | null
          min_km_interval?: number | null
          min_time_interval_months?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reservation_companions: {
        Row: {
          conductor_id: string
          created_at: string | null
          id: string
          reservation_id: string
        }
        Insert: {
          conductor_id: string
          created_at?: string | null
          id?: string
          reservation_id: string
        }
        Update: {
          conductor_id?: string
          created_at?: string | null
          id?: string
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_companions_conductor_id_fkey"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "conductors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_companions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          car: string
          car_id: string
          companions: string[] | null
          conductor_id: string
          created_at: string | null
          destination: string
          destinations: string[] | null
          driver_name: string
          email_sent_at: string | null
          end_date: string
          end_km: number | null
          id: string
          km_informed: boolean | null
          pickup_date: string
          return_date: string
          start_date: string
          start_km: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          car: string
          car_id: string
          companions?: string[] | null
          conductor_id: string
          created_at?: string | null
          destination: string
          destinations?: string[] | null
          driver_name: string
          email_sent_at?: string | null
          end_date: string
          end_km?: number | null
          id?: string
          km_informed?: boolean | null
          pickup_date: string
          return_date: string
          start_date: string
          start_km?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          car?: string
          car_id?: string
          companions?: string[] | null
          conductor_id?: string
          created_at?: string | null
          destination?: string
          destinations?: string[] | null
          driver_name?: string
          email_sent_at?: string | null
          end_date?: string
          end_km?: number | null
          id?: string
          km_informed?: boolean | null
          pickup_date?: string
          return_date?: string
          start_date?: string
          start_km?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_conductor_id_fkey"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "conductors"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance_config: {
        Row: {
          car_id: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          km_interval: number
          maintenance_type_id: string
          time_interval_months: number
          updated_at: string | null
        }
        Insert: {
          car_id: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          km_interval: number
          maintenance_type_id: string
          time_interval_months: number
          updated_at?: string | null
        }
        Update: {
          car_id?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          km_interval?: number
          maintenance_type_id?: string
          time_interval_months?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_config_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_config_maintenance_type_id_fkey"
            columns: ["maintenance_type_id"]
            isOneToOne: false
            referencedRelation: "maintenance_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}