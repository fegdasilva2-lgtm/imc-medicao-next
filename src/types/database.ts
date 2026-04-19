export type UserRole = 'admin' | 'coordenador' | 'gerente' | 'diretoria' | 'cliente' | 'faturamento'

export type MedicaoStatus = 'rascunho' | 'pendente' | 'aprovado' | 'rejeitado' | 'faturado'

export interface Empresa {
  id: string
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  created_at: string
  updated_at: string | null
}

export interface Usuario {
  id: string
  email: string
  nome: string
  role: UserRole
  empresa_id: string | null
  created_at: string
  updated_at: string | null
}

export interface CentroDeCusto {
  id: string
  empresa_id: string
  nome: string
  codigo: string | null
  descricao: string | null
  salario_mensal: number | null
  responsavel: string | null
  created_at: string
  updated_at: string | null
}

export interface UsuarioCC {
  id: string
  usuario_id: string
  centro_de_custo_id: string
  created_at: string
}

export interface Medicao {
  id: string
  centro_de_custo_id: string
  mes_referencia: string
  status: MedicaoStatus
  realizado_hn: number
  valor_vu: number | null
  perda_contrato: number | null
  valor_spot: number
  valor_total: number | null
  snapshot_dados: Record<string, string> | null
  motivo_rejeicao: string | null
  criado_por: string
  aprovado_por: string | null
  rejeitado_por: string | null
  faturado_por: string | null
  data_aprovacao: string | null
  data_faturamento: string | null
  created_at: string
  updated_at: string | null
}

export interface MedicaoHistory {
  id: string
  medicao_id: string
  usuario_id: string
  acao: 'criacao' | 'edicao' | 'envio_pendente' | 'aprovacao' | 'rejeicao' | 'faturamento'
  dados_anteriores: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  created_at: string
}

export interface Funcao {
  id: string
  nome: string
  descricao: string | null
  salario_mensal: number | null
  created_at: string
}

export interface MedicaoFacilities {
  id: string
  cc_id: string | null
  cliente: string
  contrato: string
  data_inicial: string
  data_final: string
  local_base_regiao: string
  objeto: string
  detalhes: string
  bm_numero: string
  as_numero: string
  data_base: string
  mes_referencia: string | null
  status: 'rascunho' | 'pendente' | 'aprovado' | 'rejeitado' | 'faturado'
  created_by: string
  aprovado_por: string | null
  rejeitado_por: string | null
  motivo_rejeicao: string | null
  created_at: string
  updated_at: string | null
  // Relations
  centros_de_custo?: CentroDeCusto | null
}

export interface LinhaEntradaFacilities {
  id: string
  medicao_id: string
  tipo: 'hn' | 'hc' | 'he'
  item: number
  registro: string
  colaborador: string
  funcao_id: string
  admissao: string | null
  hn: number | null
  qtd_50_d: number
  rs_50_d: number
  qtd_50_n: number
  rs_50_n: number
  qtd_100_d: number
  rs_100_d: number
  qtd_100_n: number
  rs_100_n: number
  descricao_servico: string
  motivo: string
  created_at: string
  // Relations
  funcoes?: Funcao
}

export interface MemoriaCalculoFacilities {
  id: string
  medicao_id: string
  funcao_id: string
  tipo: 'regular' | 'extraordinario'
  unidade: string
  efetivo: number
  previsto_contrato: number
  acumulado_atual: number
  saldo_contrato: number
  previsto_mes: number
  diaria_normal: number
  observacoes: string
  valor_unitario: number
  realizado_hn_efetivo: number
  realizado_hn_volante: number
  realizado_he_efetivo: number
  realizado_he_volante: number
  medicao_periodo: number
  perda_mediacao: number
  custo_extra_mes: number
  created_at: string
  // Relations
  funcoes?: Funcao
}

export interface QuadroResumoFacilities {
  id: string
  medicao_id: string
  descricao: string
  centro_custo: string
  cnpj: string
  periodo_inicial: string | null
  periodo_final: string | null
  valor: number
  pedido: string
  ordem: number
  created_at: string
}

export interface ServicoSpot {
  id: string
  medicao_id: string
  descricao: string | null
  valor: number
  created_at: string
}

export interface LinhaEntrada {
  id: string
  medicao_id: string
  centro_de_custo_id: string
  servico_spot_id: string | null
  descricao: string | null
  quantidade: number | null
  valor_unitario: number | null
  valor_total: number | null
  created_at: string
}

export interface MemoriaCalculo {
  id: string
  medicao_id: string
  descricao: string | null
  memoria: string | null
  created_at: string
}

export interface QuadroResumo {
  id: string
  medicao_id: string
  titulo: string | null
  conteudo: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      empresas: {
        Row: Empresa
        Insert: Omit<Empresa, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Empresa, 'id' | 'created_at'>>
      }
      usuarios: {
        Row: Usuario
        Insert: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Usuario, 'id' | 'created_at'>>
      }
      centros_de_custo: {
        Row: CentroDeCusto
        Insert: Omit<CentroDeCusto, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CentroDeCusto, 'id' | 'created_at'>>
      }
      usuarios_ccs: {
        Row: UsuarioCC
        Insert: Omit<UsuarioCC, 'id' | 'created_at'>
        Update: Partial<Omit<UsuarioCC, 'id' | 'created_at'>>
      }
      medicoes: {
        Row: Medicao
        Insert: Omit<Medicao, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Medicao, 'id' | 'created_at'>>
      }
      medicao_history: {
        Row: MedicaoHistory
        Insert: Omit<MedicaoHistory, 'id' | 'created_at'>
        Update: Partial<Omit<MedicaoHistory, 'id' | 'created_at'>>
      }
      funcoes: {
        Row: Funcao
        Insert: Omit<Funcao, 'id' | 'created_at'>
        Update: Partial<Omit<Funcao, 'id' | 'created_at'>>
      }
      medicoes_facilities: {
        Row: MedicaoFacilities
        Insert: Omit<MedicaoFacilities, 'id' | 'created_at'>
        Update: Partial<Omit<MedicaoFacilities, 'id' | 'created_at'>>
      }
      linhas_entrada_facilities: {
        Row: LinhaEntradaFacilities
        Insert: Omit<LinhaEntradaFacilities, 'id' | 'created_at'>
        Update: Partial<Omit<LinhaEntradaFacilities, 'id' | 'created_at'>>
      }
      memorias_calculo_facilities: {
        Row: MemoriaCalculoFacilities
        Insert: Omit<MemoriaCalculoFacilities, 'id' | 'created_at'>
        Update: Partial<Omit<MemoriaCalculoFacilities, 'id' | 'created_at'>>
      }
      quadros_resumo_facilities: {
        Row: QuadroResumoFacilities
        Insert: Omit<QuadroResumoFacilities, 'id' | 'created_at'>
        Update: Partial<Omit<QuadroResumoFacilities, 'id' | 'created_at'>>
      }
      servicos_spot: {
        Row: ServicoSpot
        Insert: Omit<ServicoSpot, 'id' | 'created_at'>
        Update: Partial<Omit<ServicoSpot, 'id' | 'created_at'>>
      }
      linhas_entrada: {
        Row: LinhaEntrada
        Insert: Omit<LinhaEntrada, 'id' | 'created_at'>
        Update: Partial<Omit<LinhaEntrada, 'id' | 'created_at'>>
      }
      memorias_calculo: {
        Row: MemoriaCalculo
        Insert: Omit<MemoriaCalculo, 'id' | 'created_at'>
        Update: Partial<Omit<MemoriaCalculo, 'id' | 'created_at'>>
      }
      quadros_resumo: {
        Row: QuadroResumo
        Insert: Omit<QuadroResumo, 'id' | 'created_at'>
        Update: Partial<Omit<QuadroResumo, 'id' | 'created_at'>>
      }
    }
  }
}
