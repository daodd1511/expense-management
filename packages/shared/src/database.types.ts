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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          kind: string
          name: string
          opening_balance: number
          owner_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          kind: string
          name: string
          opening_balance?: number
          owner_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          kind?: string
          name?: string
          opening_balance?: number
          owner_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          owner_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_hidden: boolean
          name: string
          owner_id: string | null
          parent_id: string | null
          type: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          is_hidden?: boolean
          name: string
          owner_id?: string | null
          parent_id?: string | null
          type: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_hidden?: boolean
          name?: string
          owner_id?: string | null
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_favorites: {
        Row: {
          category_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_favorites_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_translations: {
        Row: {
          category_id: string
          id: string
          locale: string
          name: string
        }
        Insert: {
          category_id: string
          id?: string
          locale: string
          name: string
        }
        Update: {
          category_id?: string
          id?: string
          locale?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_events: {
        Row: {
          amount: number
          created_at: string
          event_date: string
          id: string
          kind: string
          loan_id: string
          owner_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          event_date: string
          id?: string
          kind: string
          loan_id: string
          owner_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          event_date?: string
          id?: string
          kind?: string
          loan_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_events_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_people: {
        Row: {
          created_at: string
          id: string
          name: string
          note: string | null
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          note?: string | null
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          owner_id?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          created_at: string
          description: string | null
          direction: string
          due_date: string | null
          id: string
          note: string | null
          original_date: string | null
          owner_id: string
          person_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          direction: string
          due_date?: string | null
          id?: string
          note?: string | null
          original_date?: string | null
          owner_id: string
          person_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          direction?: string
          due_date?: string | null
          id?: string
          note?: string | null
          original_date?: string | null
          owner_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "loan_people"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string
          active: boolean
          amount: number
          cadence: string
          category_id: string | null
          created_at: string
          day_of_month: number
          id: string
          month_of_year: number
          name: string
          next_due_date: string
          note: string | null
          owner_id: string
          type: string
        }
        Insert: {
          account_id: string
          active?: boolean
          amount: number
          cadence: string
          category_id?: string | null
          created_at?: string
          day_of_month: number
          id?: string
          month_of_year: number
          name: string
          next_due_date: string
          note?: string | null
          owner_id: string
          type: string
        }
        Update: {
          account_id?: string
          active?: boolean
          amount?: number
          cadence?: string
          category_id?: string | null
          created_at?: string
          day_of_month?: number
          id?: string
          month_of_year?: number
          name?: string
          next_due_date?: string
          note?: string | null
          owner_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          cash_flow_direction: string | null
          category_id: string | null
          created_at: string
          id: string
          linked_transfer_id: string | null
          loan_event_id: string | null
          merchant: string
          note: string | null
          owner_id: string
          receipt_url: string | null
          subscription_id: string | null
          to_account_id: string | null
          tx_date: string
          tx_time: string | null
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          cash_flow_direction?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          linked_transfer_id?: string | null
          loan_event_id?: string | null
          merchant?: string
          note?: string | null
          owner_id: string
          receipt_url?: string | null
          subscription_id?: string | null
          to_account_id?: string | null
          tx_date: string
          tx_time?: string | null
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          cash_flow_direction?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          linked_transfer_id?: string | null
          loan_event_id?: string | null
          merchant?: string
          note?: string | null
          owner_id?: string
          receipt_url?: string | null
          subscription_id?: string | null
          to_account_id?: string | null
          tx_date?: string
          tx_time?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_linked_transfer_id_fkey"
            columns: ["linked_transfer_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_loan_event_id_fkey"
            columns: ["loan_event_id"]
            isOneToOne: false
            referencedRelation: "loan_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_loan: {
        Args: {
          p_event_date: string
          p_kind: string
          p_loan_id: string
          p_owner_id: string
        }
        Returns: {
          event_amount: number
          event_created_at: string
          event_event_date: string
          event_id: string
          event_kind: string
          event_loan_id: string
          event_owner_id: string
        }[]
      }
      create_disbursed_loan: {
        Args: {
          p_account_id: string
          p_amount: number
          p_description: string
          p_direction: string
          p_due_date: string
          p_event_date: string
          p_note: string
          p_owner_id: string
          p_person_id: string
        }
        Returns: {
          event_amount: number
          event_created_at: string
          event_event_date: string
          event_id: string
          event_kind: string
          event_loan_id: string
          event_owner_id: string
          loan_created_at: string
          loan_description: string
          loan_direction: string
          loan_due_date: string
          loan_id: string
          loan_note: string
          loan_original_date: string
          loan_owner_id: string
          loan_person_id: string
          tx_account_id: string
          tx_amount: number
          tx_cash_flow_direction: string
          tx_created_at: string
          tx_id: string
          tx_loan_event_id: string
          tx_merchant: string
          tx_owner_id: string
          tx_tx_date: string
          tx_type: string
        }[]
      }
      create_loan_repayment: {
        Args: {
          p_account_id: string
          p_amount: number
          p_event_date: string
          p_loan_id: string
          p_owner_id: string
        }
        Returns: {
          event_amount: number
          event_created_at: string
          event_event_date: string
          event_id: string
          event_kind: string
          event_loan_id: string
          event_owner_id: string
          tx_account_id: string
          tx_amount: number
          tx_cash_flow_direction: string
          tx_created_at: string
          tx_id: string
          tx_loan_event_id: string
          tx_merchant: string
          tx_owner_id: string
          tx_tx_date: string
          tx_type: string
        }[]
      }
      create_opening_loan: {
        Args: {
          p_amount: number
          p_balance_as_of: string
          p_description: string
          p_direction: string
          p_due_date: string
          p_note: string
          p_original_date: string
          p_owner_id: string
          p_person_id: string
        }
        Returns: {
          event_amount: number
          event_created_at: string
          event_event_date: string
          event_id: string
          event_kind: string
          event_loan_id: string
          event_owner_id: string
          loan_created_at: string
          loan_description: string
          loan_direction: string
          loan_due_date: string
          loan_id: string
          loan_note: string
          loan_original_date: string
          loan_owner_id: string
          loan_person_id: string
        }[]
      }
      create_transfer_with_fee: {
        Args: {
          p_account_id: string
          p_amount: number
          p_fee: number
          p_merchant: string
          p_note: string
          p_owner_id: string
          p_receipt_url: string
          p_to_account_id: string
          p_tx_date: string
          p_tx_time: string
        }
        Returns: {
          account_id: string
          amount: number
          cash_flow_direction: string | null
          category_id: string | null
          created_at: string
          id: string
          linked_transfer_id: string | null
          loan_event_id: string | null
          merchant: string
          note: string | null
          owner_id: string
          receipt_url: string | null
          subscription_id: string | null
          to_account_id: string | null
          tx_date: string
          tx_time: string | null
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      log_subscription: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id: string
          p_merchant: string
          p_next_due_date: string
          p_note: string
          p_owner_id: string
          p_subscription_id: string
          p_tx_date: string
          p_type: string
        }
        Returns: {
          sub_account_id: string
          sub_active: boolean
          sub_amount: number
          sub_cadence: string
          sub_category_id: string
          sub_created_at: string
          sub_day_of_month: number
          sub_id: string
          sub_month_of_year: number
          sub_name: string
          sub_next_due_date: string
          sub_note: string
          sub_owner_id: string
          sub_type: string
          tx_account_id: string
          tx_amount: number
          tx_category_id: string
          tx_created_at: string
          tx_id: string
          tx_merchant: string
          tx_note: string
          tx_owner_id: string
          tx_receipt_url: string
          tx_subscription_id: string
          tx_to_account_id: string
          tx_tx_date: string
          tx_type: string
        }[]
      }
      update_loan_disbursement: {
        Args: {
          p_account_id: string
          p_amount: number
          p_event_date: string
          p_loan_id: string
          p_owner_id: string
        }
        Returns: {
          event_amount: number
          event_created_at: string
          event_event_date: string
          event_id: string
          event_kind: string
          event_loan_id: string
          event_owner_id: string
          tx_account_id: string
          tx_amount: number
          tx_cash_flow_direction: string
          tx_created_at: string
          tx_id: string
          tx_loan_event_id: string
          tx_merchant: string
          tx_owner_id: string
          tx_tx_date: string
          tx_type: string
        }[]
      }
      update_loan_repayment: {
        Args: {
          p_account_id: string
          p_amount: number
          p_event_date: string
          p_event_id: string
          p_owner_id: string
        }
        Returns: {
          event_amount: number
          event_created_at: string
          event_event_date: string
          event_id: string
          event_kind: string
          event_loan_id: string
          event_owner_id: string
          tx_account_id: string
          tx_amount: number
          tx_cash_flow_direction: string
          tx_created_at: string
          tx_id: string
          tx_loan_event_id: string
          tx_merchant: string
          tx_owner_id: string
          tx_tx_date: string
          tx_type: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
