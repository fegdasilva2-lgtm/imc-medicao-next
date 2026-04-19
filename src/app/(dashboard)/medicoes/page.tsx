import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getUsuario } from '@/lib/supabase/server'
import type { Medicao, CentroDeCusto } from '@/types/database'

interface SearchParams {
  status?: string
  page?: string
}

export default async function MedicoesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const usuario = await getUsuario()
  
  if (!usuario) {
    redirect('/login')
  }

  const role = usuario.role
  const isCoordenadorOrAdmin = role === 'admin' || role === 'coordenador'
  
  // Get filter from URL
  const statusFilter = searchParams.status || ''
  const page = parseInt(searchParams.page || '1')
  const pageSize = 25

  // Get visible CCs based on role
  let ccs: CentroDeCusto[] = []
  
  if (role === 'admin' || role === 'diretoria' || role === 'faturamento') {
    const { data } = await supabase
      .from('centros_de_custo')
      .select('*')
      .eq('is_active', true)
    ccs = data || []
  } else if (role === 'coordenador' || role === 'gerente') {
    const { data: userCCs } = await supabase
      .from('usuarios_ccs')
      .select('centros_de_custo_id')
      .eq('usuario_id', usuario.id)
    
    if (userCCs && userCCs.length > 0) {
      const ccIds = userCCs.map((ucc: { centros_de_custo_id: string }) => ucc.centros_de_custo_id)
      const { data } = await supabase
        .from('centros_de_custo')
        .select('*')
        .in('id', ccIds)
        .eq('is_active', true)
      ccs = data || []
    }
  } else if (role === 'cliente') {
    const { data } = await supabase
      .from('centros_de_custo')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .eq('is_active', true)
    ccs = data || []
  }

  // Build query for medicoes
  let query = supabase
    .from('medicoes')
    .select(`
      id,
      mes_referencia,
      status,
      realizado_hn,
      valor_spot,
      valor_total,
      perda_contrato,
      criado_por,
      centro_de_custo_id,
      centros_de_custo:centros_de_custo(id, codigo, descricao, salario_mensal)
    `, { count: 'exact' })

  // For non-admin/coordenador, filter by visible CCs
  if (role !== 'admin' && role !== 'diretoria' && role !== 'faturamento') {
    if (ccs.length > 0) {
      const ccIds = ccs.map(cc => cc.id)
      query = query.in('centro_de_custo_id', ccIds)
    } else {
      query = query.eq('centro_de_custo_id', 'empty')
    }
  }

  // Exclude rascunho for most roles (except creator)
  if (role !== 'admin' && role !== 'coordenador') {
    query = query.neq('status', 'rascunho')
  }

  // Apply status filter
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to).order('mes_referencia', { ascending: false }).order('created_at', { ascending: false })

  const { data: medicoes, count } = await query

  const totalPages = Math.ceil((count || 0) / pageSize)

  const statusColors: Record<string, string> = {
    rascunho: 'bg-gray-100 text-gray-700',
    pendente: 'bg-yellow-100 text-yellow-700',
    aprovado: 'bg-green-100 text-green-700',
    rejeitado: 'bg-red-100 text-red-700',
    faturado: 'bg-blue-100 text-blue-700',
  }

  const statusLabels: Record<string, string> = {
    rascunho: 'Rascunho',
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    faturado: 'Faturado',
  }

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-'
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  const formatMes = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medições</h1>
          <p className="text-gray-500">Gerencie as medições de serviços</p>
        </div>
        {isCoordenadorOrAdmin && (
          <Link
            href="/medicoes/novo"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
          >
            <span>+</span> Nova Medição
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <form method="get" className="flex items-end gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              id="status"
              name="status"
              defaultValue={statusFilter}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="rascunho">Rascunho</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
              <option value="faturado">Faturado</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Filtrar
          </button>
          {statusFilter && (
            <Link
              href="/medicoes"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Limpar
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centro de Custo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mês</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Realizado HN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perda</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SPOT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medicoes && medicoes.length > 0 ? (
                medicoes.map((medicao) => {
                  const cc = medicao.centros_de_custo as unknown as { codigo: string; descricao: string } | null
                  const perda = medicao.perda_contrato ?? 0
                  
                  return (
                    <tr key={medicao.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{cc?.codigo || 'N/A'}</span>
                        <p className="text-xs text-gray-500">{cc?.descricao?.substring(0, 25) || ''}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700 capitalize">{formatMes(medicao.mes_referencia)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[medicao.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[medicao.status] || medicao.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{medicao.realizado_hn} h</td>
                      <td className={`px-6 py-4 ${perda < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {formatCurrency(perda)}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{formatCurrency(medicao.valor_spot)}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{formatCurrency(medicao.valor_total)}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/medicoes/${medicao.id}`}
                          className="px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma medição encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={`/medicoes?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/medicoes?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Próxima
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
