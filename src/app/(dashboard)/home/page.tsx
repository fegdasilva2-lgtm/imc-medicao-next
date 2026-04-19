import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Usuario, CentroDeCusto, Medicao } from '@/types/database'

export default async function HomePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario) {
    redirect('/login')
  }

  const role = usuario.role

  // Fetch data based on role
  let stats = {
    total_ccs: 0,
    total_medicoes_pendentes: 0,
    total_medicoes_faturadas: 0,
    medicoes_rascunho: 0,
    meus_ccs: [] as CentroDeCusto[],
    medicoes_pendentes_aprovacao: 0,
    pendentes_faturamento: 0,
  }

  // Admin: get totals
  if (role === 'admin') {
    const { count: totalCCs } = await supabase
      .from('centros_de_custo')
      .select('*', { count: 'exact', head: true })
    
    const { count: pendentes } = await supabase
      .from('medicoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente')
    
    const { count: faturadas } = await supabase
      .from('medicoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'faturado')

    stats.total_ccs = totalCCs || 0
    stats.total_medicoes_pendentes = pendentes || 0
    stats.total_medicoes_faturadas = faturadas || 0
  }

  // Coordenador: get rascunhos and assigned CCs
  if (role === 'coordenador' || role === 'gerente') {
    const { data: meusCCs } = await supabase
      .from('usuarios_ccs')
      .select('centros_de_custo_id')
      .eq('usuario_id', user.id)

    if (meusCCs && meusCCs.length > 0) {
      const ccIds = meusCCs.map((ucc: { centros_de_custo_id: string }) => ucc.centros_de_custo_id)
      
      const { data: ccData } = await supabase
        .from('centros_de_custo')
        .select('*')
        .in('id', ccIds)

      stats.meus_ccs = ccData || []
    }

    if (role === 'coordenador') {
      const { count: rascunhos } = await supabase
        .from('medicoes')
        .select('*', { count: 'exact', head: true })
        .eq('criado_por', user.id)
        .eq('status', 'rascunho')

      stats.medicoes_rascunho = rascunhos || 0
    }
  }

  // Cliente: get pending approvals
  if (role === 'cliente') {
    const { count: pendentesAprov } = await supabase
      .from('medicoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente')

    stats.medicoes_pendentes_aprovacao = pendentesAprov || 0
  }

  // Faturamento: get pending billing
  if (role === 'faturamento') {
    const { count: pendentesFat } = await supabase
      .from('medicoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aprovado')

    stats.pendentes_faturamento = pendentesFat || 0
  }

  // Recent medicoes for all roles
  const { data: recentMedicoes } = await supabase
    .from('medicoes')
    .select(`
      id,
      mes_referencia,
      status,
      valor_total,
      criado_por,
      centros_de_custo_id,
      centros_de_custo:centros_de_custo(id, codigo, descricao)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    coordenador: 'Coordenador',
    gerente: 'Gerente',
    diretoria: 'Diretoria',
    cliente: 'Cliente',
    faturamento: 'Faturamento',
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bem-vindo, {usuario.nome}
        </h1>
        <p className="text-gray-500 capitalize">{roleLabels[role] || role}</p>
      </div>

      {/* Role-based Cards */}
      {role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                💰
              </div>
              <div>
                <p className="text-sm text-gray-500">Centros de Custo</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_ccs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-2xl">
                ⏳
              </div>
              <div>
                <p className="text-sm text-gray-500">Pendentes Aprovação</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_medicoes_pendentes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <p className="text-sm text-gray-500">Faturadas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_medicoes_faturadas}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'coordenador' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                📝 Meus Rascunhos
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-2xl">
                  ✏️
                </div>
                <div>
                  <p className="text-sm text-gray-500">Minhas medições em rascunho</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.medicoes_rascunho}</p>
                </div>
              </div>
              <hr className="my-4" />
              <Link
                href="/medicoes/novo"
                className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                + Nova Medição
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                💰 Meus CCs
              </h3>
            </div>
            <div className="p-0">
              {stats.meus_ccs.length === 0 ? (
                <p className="p-6 text-gray-500 text-center">Nenhum CC atribuído</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {stats.meus_ccs.map((cc) => (
                    <li key={cc.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">{cc.codigo}</span>
                        <span className="text-gray-500 ml-2">- {cc.descricao?.substring(0, 30)}</span>
                      </div>
                      <Link
                        href="/centros-de-custo"
                        className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Ver
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {role === 'gerente' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              💰 Meus CCs
            </h3>
          </div>
          <div className="p-0">
            {stats.meus_ccs.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">Nenhum CC atribuído</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.meus_ccs.map((cc) => (
                  <li key={cc.id} className="px-6 py-3">
                    <span className="font-medium text-gray-900">{cc.codigo}</span>
                    <span className="text-gray-500 ml-2">- {cc.descricao}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {role === 'cliente' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-2xl">
                ⏳
              </div>
              <div>
                <p className="text-sm text-gray-500">Pendentes Aprovação</p>
                <p className="text-2xl font-bold text-gray-900">{stats.medicoes_pendentes_aprovacao}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'faturamento' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-2xl">
                ⏳
              </div>
              <div>
                <p className="text-sm text-gray-500">Aguardando Faturamento</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendentes_faturamento}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Medições */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            🕐 Medições Recentes
          </h3>
          <Link
            href="/medicoes"
            className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Ver Todas
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mês</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentMedicoes && recentMedicoes.length > 0 ? (
                recentMedicoes.map((medicao) => {
                  const cc = medicao.centros_de_custo as unknown as { codigo: string; descricao: string } | null
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
                  const mesAno = new Date(medicao.mes_referencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

                  return (
                    <tr key={medicao.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{cc?.codigo || 'N/A'}</span>
                        <p className="text-xs text-gray-500">{cc?.descricao?.substring(0, 20) || ''}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700 capitalize">{mesAno}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[medicao.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[medicao.status] || medicao.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {medicao.valor_total != null
                          ? `R$ ${medicao.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/medicoes/${medicao.id}`}
                          className="px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          👁️ Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma medição encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}