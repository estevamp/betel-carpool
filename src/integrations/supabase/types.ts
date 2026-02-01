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
      absences: {
        Row: {
          created_at: string
          end_date: string
          id: string
          notes: string | null
          profile_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          profile_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          profile_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evacuation_cars: {
        Row: {
          created_at: string
          destination: string | null
          driver_id: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination?: string | null
          driver_id: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination?: string | null
          driver_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evacuation_cars_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evacuation_passengers: {
        Row: {
          created_at: string
          evacuation_car_id: string
          id: string
          passenger_id: string
        }
        Insert: {
          created_at?: string
          evacuation_car_id: string
          id?: string
          passenger_id: string
        }
        Update: {
          created_at?: string
          evacuation_car_id?: string
          id?: string
          passenger_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evacuation_passengers_evacuation_car_id_fkey"
            columns: ["evacuation_car_id"]
            isOneToOne: false
            referencedRelation: "evacuation_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evacuation_passengers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faq: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean | null
          order_index: number | null
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_driver: boolean | null
          is_exempt: boolean | null
          is_married: boolean | null
          pix_key: string | null
          sex: Database["public"]["Enums"]["sex_type"] | null
          show_tips: boolean | null
          spouse_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_driver?: boolean | null
          is_exempt?: boolean | null
          is_married?: boolean | null
          pix_key?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          show_tips?: boolean | null
          spouse_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_driver?: boolean | null
          is_exempt?: boolean | null
          is_married?: boolean | null
          pix_key?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          show_tips?: boolean | null
          spouse_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_spouse_id_fkey"
            columns: ["spouse_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_requests: {
        Row: {
          created_at: string
          id: string
          is_fulfilled: boolean | null
          notes: string | null
          profile_id: string
          requested_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_fulfilled?: boolean | null
          notes?: string | null
          profile_id: string
          requested_date: string
        }
        Update: {
          created_at?: string
          id?: string
          is_fulfilled?: boolean | null
          notes?: string | null
          profile_id?: string
          requested_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          type: string | null
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          type?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          type?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          creditor_id: string
          debtor_id: string
          id: string
          month: string
          trip_id: string | null
          trip_type: Database["public"]["Enums"]["trip_type"] | null
        }
        Insert: {
          amount: number
          created_at?: string
          creditor_id: string
          debtor_id: string
          id?: string
          month: string
          trip_id?: string | null
          trip_type?: Database["public"]["Enums"]["trip_type"] | null
        }
        Update: {
          amount?: number
          created_at?: string
          creditor_id?: string
          debtor_id?: string
          id?: string
          month?: string
          trip_id?: string | null
          trip_type?: Database["public"]["Enums"]["trip_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_debtor_id_fkey"
            columns: ["debtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          created_at: string
          creditor_id: string
          debtor_id: string
          id: string
          is_paid: boolean | null
          month: string
          paid_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          creditor_id: string
          debtor_id: string
          id?: string
          is_paid?: boolean | null
          month: string
          paid_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          creditor_id?: string
          debtor_id?: string
          id?: string
          is_paid?: boolean | null
          month?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_debtor_id_fkey"
            columns: ["debtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_passengers: {
        Row: {
          created_at: string
          id: string
          passenger_id: string
          trip_id: string
          trip_type: Database["public"]["Enums"]["trip_type"] | null
        }
        Insert: {
          created_at?: string
          id?: string
          passenger_id: string
          trip_id: string
          trip_type?: Database["public"]["Enums"]["trip_type"] | null
        }
        Update: {
          created_at?: string
          id?: string
          passenger_id?: string
          trip_id?: string
          trip_type?: Database["public"]["Enums"]["trip_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_passengers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_passengers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          departure_at: string
          driver_id: string
          id: string
          is_active: boolean | null
          is_betel_car: boolean | null
          is_urgent: boolean | null
          max_passengers: number | null
          notes: string | null
          return_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          departure_at: string
          driver_id: string
          id?: string
          is_active?: boolean | null
          is_betel_car?: boolean | null
          is_urgent?: boolean | null
          max_passengers?: number | null
          notes?: string | null
          return_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          departure_at?: string
          driver_id?: string
          id?: string
          is_active?: boolean | null
          is_betel_car?: boolean | null
          is_urgent?: boolean | null
          max_passengers?: number | null
          notes?: string | null
          return_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      get_current_profile_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      sex_type: "Homem" | "Mulher"
      trip_type: "Ida e Volta" | "Apenas Ida" | "Apenas Volta"
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
      app_role: ["admin", "user"],
      sex_type: ["Homem", "Mulher"],
      trip_type: ["Ida e Volta", "Apenas Ida", "Apenas Volta"],
    },
  },
} as const
