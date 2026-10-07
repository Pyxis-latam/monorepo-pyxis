
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "importaciones": {
                  Row: {
                    "archivo_path": string,"creado_en": string,"creado_por": string | null,"filas": number,"id": string,"obra_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archivo_path": string,"creado_en"?: string,"creado_por"?: string | null,"filas": number,"id"?: string,"obra_id": string
                  }
                  Update: {
                    "archivo_path"?: string,"creado_en"?: string,"creado_por"?: string | null,"filas"?: number,"id"?: string,"obra_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "importaciones_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "importaciones_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    }
                  ]
                },"obras": {
                  Row: {
                    "creado_en": string,"creado_por": string | null,"estado": Database["public"]['Enums']["estado_obra"],"id": string,"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"creado_por"?: string | null,"estado"?: Database["public"]['Enums']["estado_obra"],"id"?: string,"nombre": string
                  }
                  Update: {
                    "creado_en"?: string,"creado_por"?: string | null,"estado"?: Database["public"]['Enums']["estado_obra"],"id"?: string,"nombre"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "obras_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"partidas": {
                  Row: {
                    "cantidad": number | null,"codigo": string,"descripcion": string,"fecha_fin": string | null,"fecha_inicio": string | null,"id": string,"obra_id": string,"orden": number,"parent_id": string | null,"precio_unitario": number | null,"unidad": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad"?: number | null,"codigo": string,"descripcion": string,"fecha_fin"?: string | null,"fecha_inicio"?: string | null,"id"?: string,"obra_id": string,"orden": number,"parent_id"?: string | null,"precio_unitario"?: number | null,"unidad"?: string | null
                  }
                  Update: {
                    "cantidad"?: number | null,"codigo"?: string,"descripcion"?: string,"fecha_fin"?: string | null,"fecha_inicio"?: string | null,"id"?: string,"obra_id"?: string,"orden"?: number,"parent_id"?: string | null,"precio_unitario"?: number | null,"unidad"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "partidas_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "partidas_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "partida_ejecutado"
      referencedColumns: ["partida_id"]
    },{
      foreignKeyName: "partidas_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "partidas"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "activo": boolean,"creado_en": string,"email": string,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_usuario"]
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"creado_en"?: string,"email": string,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_usuario"]
                  }
                  Update: {
                    "activo"?: boolean,"creado_en"?: string,"email"?: string,"id"?: string,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol_usuario"]
                  }
                  Relationships: [
                    
                  ]
                },"reportes": {
                  Row: {
                    "anulado": boolean,"anulado_en": string | null,"anulado_por": string | null,"autor": string,"cantidad": number,"comentario": string | null,"creado_en": string,"foto_path": string | null,"id": string,"obra_id": string,"partida_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anulado"?: boolean,"anulado_en"?: string | null,"anulado_por"?: string | null,"autor"?: string,"cantidad": number,"comentario"?: string | null,"creado_en"?: string,"foto_path"?: string | null,"id"?: string,"obra_id": string,"partida_id": string
                  }
                  Update: {
                    "anulado"?: boolean,"anulado_en"?: string | null,"anulado_por"?: string | null,"autor"?: string,"cantidad"?: number,"comentario"?: string | null,"creado_en"?: string,"foto_path"?: string | null,"id"?: string,"obra_id"?: string,"partida_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reportes_anulado_por_fkey"
      columns: ["anulado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reportes_autor_fkey"
      columns: ["autor"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reportes_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reportes_partida_id_fkey"
      columns: ["partida_id"]
isOneToOne: false
      referencedRelation: "partida_ejecutado"
      referencedColumns: ["partida_id"]
    },{
      foreignKeyName: "reportes_partida_id_fkey"
      columns: ["partida_id"]
isOneToOne: false
      referencedRelation: "partidas"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "partida_ejecutado": {
                  Row: {
                    "ejecutado": number | null,"obra_id": string | null,"partida_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "partidas_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "obra_activa":
{ Args: { "p_obra": string }; Returns: boolean
                           },
"rol_actual":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["rol_usuario"]
                           }
          }
          Enums: {
            "estado_obra": "activa"|"cerrada","rol_usuario": "admin"|"terreno"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "estado_obra": ["activa", "cerrada"],"rol_usuario": ["admin", "terreno"]
          }
        }
} as const
