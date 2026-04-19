import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getUsuario } from '@/lib/supabase/server'
import type { MedicaoFacilities } from '@/types/database'

interface SearchParams {
  status?: string
  page?: string
}

export default async function FacilitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const usuario = await getUsuario()

  if (!usuario) {
    redirect('/login')
  }

  const role = usuario.role
  const isCoordenadorOrAdmin = role === 'admin' || role === 'coordenador'

  const statusFilter = searchParams.status || ''
  const page = parseInt(searchParams.page || '1')
  const pageSize = 25

  let query = supabase
    .from('medicoes_facilities')
    .select(`
      id,
      cliente,
      contrato,
      data_inicial,
      data_final,
      status,
      created_at,
      cc_id,
      centros_de_custo:centros_de_custo(id, codigo, descricao)
    `, { count: 'exact' })

  // Only show rascunho for admin/coordenador
  if (role !== 'admin' && role !== 'coordenador') {
    query = query.neq('status', 'rascunho')
  }

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to).order('created_at', { ascending: false })

  const { data: facilities, count } = await query

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medições Facilities</h1>
          <p className="text-gray-500">Gerencie as medições de facilities</p>
        </div>
        {isCoordenadorOrAdmin && (
          <Link
            href="/facilities/novo"
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
              href="/facilities"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contrato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centro Custo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facilities && facilities.length > 0 ? (
                facilities.map((facility) => {
                  const cc = facility.centros_de_custo as unknown as { codigo: string; descricao: string } | null
                  return (
                    <tr key={facility.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{facility.cliente}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{facility.contrato}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {formatDate(facility.data_inicial)} a {formatDate(facility.data_final)}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{cc?.codigo || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[facility.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[facility.status] || facility.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {new Date(facility.created_at).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/facilities/${facility.id}`}
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
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma medição facilities encontrada
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
                  href={`/facilities?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/facilities?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
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
