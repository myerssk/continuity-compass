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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          onboarding_completed_at: string | null
          onboarding_outcome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string
          id: string
          last_name?: string
          onboarding_completed_at?: string | null
          onboarding_outcome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          onboarding_completed_at?: string | null
          onboarding_outcome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: { id: string; name: string; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; created_by: string; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; created_by?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      workspace_members: {
        Row: { workspace_id: string; user_id: string; role: Database["public"]["Enums"]["app_role"]; created_at: string }
        Insert: { workspace_id: string; user_id: string; role?: Database["public"]["Enums"]["app_role"]; created_at?: string }
        Update: { workspace_id?: string; user_id?: string; role?: Database["public"]["Enums"]["app_role"]; created_at?: string }
        Relationships: []
      }
      workspace_bcp_state: {
        Row: { workspace_id: string; state: Json; revision: number; updated_by: string; updated_at: string }
        Insert: { workspace_id: string; state?: Json; revision?: number; updated_by: string; updated_at?: string }
        Update: { workspace_id?: string; state?: Json; revision?: number; updated_by?: string; updated_at?: string }
        Relationships: []
      }
      servicenow_connections: {
        Row: { workspace_id: string; instance_url: string; mode: string; status: string; auth_method: string; last_sync_at: string | null; last_sync_status: string | null; last_sync_summary: Json; created_by: string; updated_by: string; created_at: string; updated_at: string }
        Insert: { workspace_id: string; instance_url: string; mode?: string; status?: string; auth_method?: string; last_sync_at?: string | null; last_sync_status?: string | null; last_sync_summary?: Json; created_by: string; updated_by: string; created_at?: string; updated_at?: string }
        Update: { instance_url?: string; mode?: string; status?: string; auth_method?: string; last_sync_at?: string | null; last_sync_status?: string | null; last_sync_summary?: Json; updated_by?: string; updated_at?: string }
        Relationships: []
      }
      servicenow_sync_mappings: {
        Row: { id: string; workspace_id: string; compass_type: string; compass_id: string; servicenow_table: string; servicenow_sys_id: string; sync_direction: string; last_synced_at: string | null; last_hash: string | null }
        Insert: { id?: string; workspace_id: string; compass_type: string; compass_id: string; servicenow_table: string; servicenow_sys_id: string; sync_direction?: string; last_synced_at?: string | null; last_hash?: string | null }
        Update: { compass_type?: string; compass_id?: string; servicenow_table?: string; servicenow_sys_id?: string; sync_direction?: string; last_synced_at?: string | null; last_hash?: string | null }
        Relationships: []
      }
      servicenow_sync_runs: {
        Row: { id: string; workspace_id: string; direction: string; dry_run: boolean; status: string; requested_by: string; started_at: string | null; completed_at: string | null; summary: Json; error_message: string | null; created_at: string }
        Insert: { id?: string; workspace_id: string; direction: string; dry_run?: boolean; status?: string; requested_by: string; started_at?: string | null; completed_at?: string | null; summary?: Json; error_message?: string | null; created_at?: string }
        Update: { status?: string; started_at?: string | null; completed_at?: string | null; summary?: Json; error_message?: string | null }
        Relationships: []
      }
      workspace_audit_events: {
        Row: { id: string; workspace_id: string; actor_user_id: string; action: string; entity_type: string; entity_id: string | null; summary: string; metadata: Json; occurred_at: string }
        Insert: { id?: string; workspace_id: string; actor_user_id: string; action: string; entity_type: string; entity_id?: string | null; summary: string; metadata?: Json; occurred_at?: string }
        Update: { id?: string }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "administrator"
        | "bcp_coordinator"
        | "contributor"
        | "approver"
        | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "administrator",
        "bcp_coordinator",
        "contributor",
        "approver",
        "viewer",
      ],
    },
  },
} as const