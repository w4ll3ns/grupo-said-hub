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
  public: {
    Tables: {
      centros_custo: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativa: boolean
          banco: string | null
          conta: string | null
          created_at: string
          empresa_id: string
          id: string
          nome: string
          saldo_inicial: number
          tipo: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativa?: boolean
          banco?: string | null
          conta?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativa?: boolean
          banco?: string | null
          conta?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativa: boolean
          cnpj: string | null
          created_at: string
          id: string
          logo_url: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipamentos: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          nome: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          ativa: boolean
          created_at: string
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formas_pagamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          centro_custo_id: string | null
          conta_bancaria_id: string | null
          created_at: string
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string
          forma_pagamento_id: string | null
          id: string
          observacoes: string | null
          plano_despesa_id: string | null
          plano_receita_id: string | null
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          centro_custo_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string
          forma_pagamento_id?: string | null
          id?: string
          observacoes?: string | null
          plano_despesa_id?: string | null
          plano_receita_id?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          centro_custo_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          empresa_id?: string
          forma_pagamento_id?: string | null
          id?: string
          observacoes?: string | null
          plano_despesa_id?: string | null
          plano_receita_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_plano_despesa_id_fkey"
            columns: ["plano_despesa_id"]
            isOneToOne: false
            referencedRelation: "plano_despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_plano_receita_id_fkey"
            columns: ["plano_receita_id"]
            isOneToOne: false
            referencedRelation: "plano_receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          contratante: string | null
          contrato: string | null
          created_at: string
          data_inicio: string | null
          data_previsao: string | null
          empresa_id: string
          endereco: string | null
          id: string
          local: string | null
          nome: string
          prazo_contratual_dias: number | null
          responsavel: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contratante?: string | null
          contrato?: string | null
          created_at?: string
          data_inicio?: string | null
          data_previsao?: string | null
          empresa_id: string
          endereco?: string | null
          id?: string
          local?: string | null
          nome: string
          prazo_contratual_dias?: number | null
          responsavel?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contratante?: string | null
          contrato?: string | null
          created_at?: string
          data_inicio?: string | null
          data_previsao?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          local?: string | null
          nome?: string
          prazo_contratual_dias?: number | null
          responsavel?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_permissoes: {
        Row: {
          aprovar: boolean
          criar: boolean
          editar: boolean
          excluir: boolean
          funcionalidade: string
          id: string
          modulo: string
          perfil_id: string
          visualizar: boolean
        }
        Insert: {
          aprovar?: boolean
          criar?: boolean
          editar?: boolean
          excluir?: boolean
          funcionalidade: string
          id?: string
          modulo: string
          perfil_id: string
          visualizar?: boolean
        }
        Update: {
          aprovar?: boolean
          criar?: boolean
          editar?: boolean
          excluir?: boolean
          funcionalidade?: string
          id?: string
          modulo?: string
          perfil_id?: string
          visualizar?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "perfil_permissoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string | null
          id: string
          nome: string
          sistema: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          sistema?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          sistema?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_despesas: {
        Row: {
          ativa: boolean
          categoria: string
          created_at: string
          empresa_id: string
          id: string
          subcategoria: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          categoria: string
          created_at?: string
          empresa_id: string
          id?: string
          subcategoria: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          categoria?: string
          created_at?: string
          empresa_id?: string
          id?: string
          subcategoria?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_despesas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_receitas: {
        Row: {
          ativa: boolean
          categoria: string
          created_at: string
          empresa_id: string
          id: string
          subcategoria: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          categoria: string
          created_at?: string
          empresa_id: string
          id?: string
          subcategoria: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          categoria?: string
          created_at?: string
          empresa_id?: string
          id?: string
          subcategoria?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_receitas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          foto_url: string | null
          id: string
          matricula: string | null
          nome: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          foto_url?: string | null
          id: string
          matricula?: string | null
          nome?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          matricula?: string | null
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rdo_aprovacoes: {
        Row: {
          aprovado_em: string | null
          cargo: string | null
          created_at: string
          email: string | null
          id: string
          matricula: string | null
          nome: string
          rdo_id: string
          status: string
          tipo: string
        }
        Insert: {
          aprovado_em?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          matricula?: string | null
          nome: string
          rdo_id: string
          status?: string
          tipo: string
        }
        Update: {
          aprovado_em?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          matricula?: string | null
          nome?: string
          rdo_id?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_aprovacoes_rdo_id_fkey"
            columns: ["rdo_id"]
            isOneToOne: false
            referencedRelation: "rdos"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_atividades: {
        Row: {
          descricao: string
          id: string
          quantidade: number | null
          rdo_id: string
          status: string
          unidade: string | null
        }
        Insert: {
          descricao: string
          id?: string
          quantidade?: number | null
          rdo_id: string
          status?: string
          unidade?: string | null
        }
        Update: {
          descricao?: string
          id?: string
          quantidade?: number | null
          rdo_id?: string
          status?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rdo_atividades_rdo_id_fkey"
            columns: ["rdo_id"]
            isOneToOne: false
            referencedRelation: "rdos"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_equipamentos: {
        Row: {
          equipamento_id: string
          horas_uso: number | null
          id: string
          observacao: string | null
          operacional: boolean
          quantidade: number
          rdo_id: string
        }
        Insert: {
          equipamento_id: string
          horas_uso?: number | null
          id?: string
          observacao?: string | null
          operacional?: boolean
          quantidade?: number
          rdo_id: string
        }
        Update: {
          equipamento_id?: string
          horas_uso?: number | null
          id?: string
          observacao?: string | null
          operacional?: boolean
          quantidade?: number
          rdo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_equipamentos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_equipamentos_rdo_id_fkey"
            columns: ["rdo_id"]
            isOneToOne: false
            referencedRelation: "rdos"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_fotos: {
        Row: {
          created_at: string
          id: string
          legenda: string | null
          rdo_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          legenda?: string | null
          rdo_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          legenda?: string | null
          rdo_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_fotos_rdo_id_fkey"
            columns: ["rdo_id"]
            isOneToOne: false
            referencedRelation: "rdos"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_funcionarios: {
        Row: {
          funcionario_id: string
          horario_entrada: string | null
          horario_intervalo: string | null
          horario_saida: string | null
          horas: number | null
          id: string
          local_trabalho: string | null
          observacao: string | null
          presente: boolean
          rdo_id: string
        }
        Insert: {
          funcionario_id: string
          horario_entrada?: string | null
          horario_intervalo?: string | null
          horario_saida?: string | null
          horas?: number | null
          id?: string
          local_trabalho?: string | null
          observacao?: string | null
          presente?: boolean
          rdo_id: string
        }
        Update: {
          funcionario_id?: string
          horario_entrada?: string | null
          horario_intervalo?: string | null
          horario_saida?: string | null
          horas?: number | null
          id?: string
          local_trabalho?: string | null
          observacao?: string | null
          presente?: boolean
          rdo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_funcionarios_rdo_id_fkey"
            columns: ["rdo_id"]
            isOneToOne: false
            referencedRelation: "rdos"
            referencedColumns: ["id"]
          },
        ]
      }
      rdos: {
        Row: {
          clima_manha: string
          clima_tarde: string
          condicao_manha: string
          condicao_tarde: string
          created_at: string
          created_by: string | null
          data: string
          empresa_id: string
          horario_entrada: string | null
          horario_intervalo_fim: string | null
          horario_intervalo_inicio: string | null
          horario_saida: string | null
          id: string
          numero: number | null
          obra_id: string
          observacoes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          clima_manha?: string
          clima_tarde?: string
          condicao_manha?: string
          condicao_tarde?: string
          created_at?: string
          created_by?: string | null
          data: string
          empresa_id: string
          horario_entrada?: string | null
          horario_intervalo_fim?: string | null
          horario_intervalo_inicio?: string | null
          horario_saida?: string | null
          id?: string
          numero?: number | null
          obra_id: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          clima_manha?: string
          clima_tarde?: string
          condicao_manha?: string
          condicao_tarde?: string
          created_at?: string
          created_by?: string | null
          data?: string
          empresa_id?: string
          horario_entrada?: string | null
          horario_intervalo_fim?: string | null
          horario_intervalo_inicio?: string | null
          horario_saida?: string | null
          id?: string
          numero?: number | null
          obra_id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_empresas: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_obras: {
        Row: {
          created_at: string
          id: string
          obra_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          obra_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          obra_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_obras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_perfis: {
        Row: {
          created_at: string
          id: string
          perfil_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          perfil_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          perfil_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_perfis_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: {
          _acao: string
          _funcionalidade: string
          _modulo: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      user_belongs_to_empresa: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "financeiro"
        | "compras"
        | "engenharia"
        | "solicitante"
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
      app_role: ["admin", "financeiro", "compras", "engenharia", "solicitante"],
    },
  },
} as const
