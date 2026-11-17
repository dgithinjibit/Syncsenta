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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      exam_attempts: {
        Row: {
          awarded: number
          created_at: string
          details: Json | null
          exam_id: string
          grade: string
          id: string
          owner_id: string
          percent: number
          pupil_name: string
          subject: string
          term: string
          total: number
        }
        Insert: {
          awarded: number
          created_at?: string
          details?: Json | null
          exam_id: string
          grade: string
          id?: string
          owner_id: string
          percent: number
          pupil_name: string
          subject: string
          term: string
          total: number
        }
        Update: {
          awarded?: number
          created_at?: string
          details?: Json | null
          exam_id?: string
          grade?: string
          id?: string
          owner_id?: string
          percent?: number
          pupil_name?: string
          subject?: string
          term?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string
          grade: string
          id: string
          questions: Json
          subject: string
          term: string
          total_marks: number
        }
        Insert: {
          created_at?: string
          created_by: string
          grade: string
          id?: string
          questions: Json
          subject: string
          term: string
          total_marks?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          grade?: string
          id?: string
          questions?: Json
          subject?: string
          term?: string
          total_marks?: number
        }
        Relationships: []
      }
      generated_resources: {
        Row: {
          additional_info: string | null
          content: Json
          created_at: string
          grade: string
          id: string
          input_params: Json | null
          resource_type: string
          strand: string | null
          sub_strand: string | null
          subject: string
          term: string | null
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          content: Json
          created_at?: string
          grade: string
          id?: string
          input_params?: Json | null
          resource_type?: string
          strand?: string | null
          sub_strand?: string | null
          subject: string
          term?: string | null
          user_id: string
        }
        Update: {
          additional_info?: string | null
          content?: Json
          created_at?: string
          grade?: string
          id?: string
          input_params?: Json | null
          resource_type?: string
          strand?: string | null
          sub_strand?: string | null
          subject?: string
          term?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheme_feedback: {
        Row: {
          created_at: string
          feedback_text: string | null
          generated_content: Json | null
          grade: string
          id: string
          rating: string
          resource_id: string | null
          strand: string | null
          subject: string
          term: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_text?: string | null
          generated_content?: Json | null
          grade: string
          id?: string
          rating: string
          resource_id?: string | null
          strand?: string | null
          subject: string
          term?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_text?: string | null
          generated_content?: Json | null
          grade?: string
          id?: string
          rating?: string
          resource_id?: string | null
          strand?: string | null
          subject?: string
          term?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheme_feedback_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "generated_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      scheme_references: {
        Row: {
          content_snippet: string | null
          description: string | null
          grade: string | null
          id: string
          scraped_at: string
          source_site: string
          strand: string | null
          subject: string | null
          term: string | null
          title: string | null
          url: string
        }
        Insert: {
          content_snippet?: string | null
          description?: string | null
          grade?: string | null
          id?: string
          scraped_at?: string
          source_site: string
          strand?: string | null
          subject?: string | null
          term?: string | null
          title?: string | null
          url: string
        }
        Update: {
          content_snippet?: string | null
          description?: string | null
          grade?: string | null
          id?: string
          scraped_at?: string
          source_site?: string
          strand?: string | null
          subject?: string | null
          term?: string | null
          title?: string | null
          url?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
