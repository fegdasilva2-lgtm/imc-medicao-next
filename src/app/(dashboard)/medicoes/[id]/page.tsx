'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import type { Medicao, MedicaoHistory, ServicoSpot, CentroDeCusto, Usuario } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function MedicaoDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { usuario, isLoading } = useAuth()
  const [medicao, setMedicao] = useState<Medicao | null>(null)
  const [cc, setCC] = useState<CentroDeCusto | null>(null)
  const [history, setHistory] = useState<MedicaoHistory[]>([])
  const [spots, setSpots] = useState<ServicoSpot[]>([])
  const [criadoPor, setCriadoPor] = useState<Usuario | null>(null)
  const [aprovadoPor, setAprovadoPor] = useState<Usuario | null>(null)
  const [rejeitadoPor, setRejeitadoPor] = useState<Usuario | null>(null)
  const [faturadoPor, setFaturadoPor] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (!isLoading && !usuario) {
      router.push('/login')
    }
  }, [isLoading, usuario, router])

  useEffect(() => {
    const loadData = async () => {
      const resolvedParams = await params
      const supabase = createClient()
      
      // Load medicao
      const { data: medicaoData, error } = await supabase
        .from('medicoes')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()
      
      if (error || !medicaoData) {
        router.push('/medicoes')
        return
      }
      
      setMedicao(medicaoData)
      
      // Load CC
      const { data: ccData } = await supabase
        .from('centros_de_custo')
        .select('*')
        .eq('id', medicaoData.centro_de_custo_id)
        .single()
      setCC(ccData)
      
      // Load history
      const { data: historyData } = await supabase
        .from('medicao_history')
        .select('*')
        .eq('medicao_id', resolvedParams.id)
        .order('created_at', { ascending: true })
      setHistory(historyData || [])
      
      // Load spots
      const { data: spotsData } = await supabase
        .from('servicos_spot')
        .select('*')
        .eq('medicao_id', resolvedParams.id)
      setSpots(spotsData || [])
      
      // Load users
      if (medicaoData.criado_por) {
        const { data: user } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', medicaoData.criado_por)
          .single()
        setCriadoPor(user)
      }
      
      if (medicaoData.aprovado_por) {
        const { data: user } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', medicaoData.aprovado_por)
          .single()
        setAprovadoPor(user)
      }
      
      if (medicaoData.rejeitado_por) {
        const { data: user } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', medicaoData.rejeitado_por)
          .single()
        setRejeitadoPor(user)
      }
      
      if (medicaoData.faturado_por) {
        const { data: user } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', medicaoData.faturado_por)
          .single()
        setFaturadoPor(user)
      }
      
      setLoading(false)
    }
    
    if (usuario) {
      loadData()
    }
  }, [params, usuario, router])

  const canEdit = () => {
    if (!usuario || !medicao) return false
    if (usuario.role === 'admin') return true
    if (usuario.role === 'coordenador' && medicao.status === 'rascunho' && medicao.criado_por === usuario.id) return true
    return false
  }

  const canSend = () => {
    if (!usuario || !medicao) return false
    if (usuario.role === 'admin') return true
    if (medicao.status === 'rascunho' && medicao.criado_por === usuario.id) return true
    return false
  }

  const canApprove = () => {
    if (!usuario || !medicao) return false
    if (['admin', 'diretoria', 'cliente'].includes(usuario.role) && medicao.status === 'pendente') return true
    return false
  }

  const canFaturar = () => {
    if (!usuario || !medicao) return false
    if (usuario.role === 'faturamento' && medicao.status === 'aprovado') return true
    return false
  }

  const handleAction = async (action: 'enviar' | 'aprovar' | 'rejeitar' | 'faturar', reason?: string) => {
    setActionLoading(true)
    const supabase = createClient()
    
    const res = await fetch(`/api/medicoes/${medicao!.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, motivo: reason }),
    })
    
    if (res.ok) {
      // Refresh medicao
      const { data: updated } = await supabase
        .from('medicoes')
        .select('*')
        .eq('id', medicao!.id)
        .single()
      setMedicao(updated)
      
      // Refresh history
      const { data: historyData } = await supabase
        .from('medicao_history')
        .select('*')
        .eq('medicao_id', medicao!.id)
        .order('created_at', { ascending: true })
      setHistory(historyData || [])
      
      setShowRejectModal(false)
    } else {
      const { error } = await res.json()
      alert(error || 'Erro ao realizar ação')
    }
    
    setActionLoading(false)
  }

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

  const historyActionLabels: Record<string, string> = {
    criacao: 'Criação',
    edicao: 'Edição',
    envio_pendente: 'Enviado para Pendente',
    aprovacao: 'Aprovação',
    rejeicao: 'Rejeição',
    faturamento: 'Faturamento',
  }

  const historyActionColors: Record<string, string> = {
    criacao: 'bg-gray-500',
    edicao: 'bg-blue-500',
    envio_pendente: 'bg-yellow-500',
    aprovacao: 'bg-green-500',
    rejeicao: 'bg-red-500',
    faturamento: 'bg-blue-500',
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'R$ 0,00'
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatMes = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    )
  }

  if (!medicao || !cc) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Medição não encontrada</p>
        <Link href="/medicoes" className="text-blue-600 hover:underline mt-2 inline-block">
          Voltar para lista
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {cc.codigo} - {formatMes(medicao.mes_referencia)}
            </h1>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[medicao.status]}`}>
              {statusLabels[medicao.status]}
            </span>
          </div>
          <p className="text-gray-500">{cc.descricao}</p>
        </div>
        <Link
          href="/medicoes"
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
        >
          ← Voltar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📋 Informações da Medição
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Centro de Custo</label>
                <p className="font-medium text-gray-900">{cc.codigo}</p>
                <p className="text-sm text-gray-500">{cc.descricao}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Criado por</label>
                <p className="font-medium text-gray-900">{criadoPor?.nome || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Mês Ref.</label>
                <p className="font-medium text-gray-900 capitalize">{formatMes(medicao.mes_referencia)}</p>
              </div>
            </div>
          </div>

          {/* Calculation Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                🧮 Motor de Cálculo
              </h3>
            </div>
            <div className="p-0">
              <table className="w-full">
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">Salário Mensal (CC)</div>
                      <div className="text-xs text-gray-500">Base para cálculo do VU</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(cc.salario_mensal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">VU (Valor Unitário)</div>
                      <div className="text-xs text-gray-500">VU = Salário / (30 × 8.48)</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-blue-600">
                      {formatCurrency(medicao.valor_vu)} <span className="text-xs text-gray-500">/h</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">Realizado HN</div>
                      <div className="text-xs text-gray-500">Horas normais realizadas no mês</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {medicao.realizado_hn} h
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">Subtotal (HN × VU)</div>
                      <div className="text-xs text-gray-500">
                        {medicao.realizado_hn} × {formatCurrency(medicao.valor_vu)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(medicao.realizado_hn * (medicao.valor_vu || 0))}
                    </td>
                  </tr>
                  <tr className={medicao.perda_contrato !== null && medicao.perda_contrato < 0 ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">Perda de Contrato</div>
                      <div className="text-xs text-gray-500">Perda = min(0, (RealizadoHN - 176) × VU)</div>
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${medicao.perda_contrato !== null && medicao.perda_contrato < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(medicao.perda_contrato)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">Serviços SPOT</div>
                      <div className="text-xs text-gray-500">Valores fechados adicionais</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(medicao.valor_spot)}
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-lg text-gray-900">VALOR TOTAL</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(medicao.valor_total)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SPOT Services */}
          {canEdit() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  ⚡ Serviços SPOT
                </h3>
                <Link
                  href={`/medicoes/${medicao.id}/spot/novo`}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  + Adicionar SPOT
                </Link>
              </div>
              <div className="p-6">
                {spots.length > 0 ? (
                  <ul className="space-y-3">
                    {spots.map((spot) => (
                      <li key={spot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-900">{spot.descricao}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-green-600">{formatCurrency(spot.valor)}</span>
                          <button
                            onClick={() => {/* TODO: delete spot */}}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            🗑️
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-center py-4">Nenhum serviço SPOT adicionado.</p>
                )}
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {medicao.status === 'rejeitado' && medicao.motivo_rejeicao && (
            <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-red-200 bg-red-100">
                <h3 className="font-semibold text-red-900 flex items-center gap-2">
                  ❌ Motivo da Rejeição
                </h3>
              </div>
              <div className="p-6">
                <p className="text-red-800">{medicao.motivo_rejeicao}</p>
                {rejeitadoPor && (
                  <p className="text-xs text-red-600 mt-2">Rejeitado por: {rejeitadoPor.nome}</p>
                )}
              </div>
            </div>
          )}

          {/* Snapshot */}
          {medicao.status === 'aprovado' && medicao.snapshot_dados && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-blue-200 bg-blue-100">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  📸 Snapshot da Aprovação
                </h3>
              </div>
              <div className="p-6">
                <pre className="text-xs bg-blue-100 p-3 rounded overflow-x-auto">
                  {JSON.stringify(medicao.snapshot_dados, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                ⚙️ Ações
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {canEdit() && (
                <Link
                  href={`/medicoes/${medicao.id}/editar`}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  ✏️ Editar Medição
                </Link>
              )}
              
              {canSend() && (
                <button
                  onClick={() => handleAction('enviar')}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  📤 Enviar para Aprovação
                </button>
              )}
              
              {canApprove() && (
                <>
                  <button
                    onClick={() => handleAction('aprovar')}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    ✅ Aprovar
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    ❌ Rejeitar
                  </button>
                </>
              )}
              
              {canFaturar() && (
                <button
                  onClick={() => handleAction('faturar')}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  💰 Marcar como Faturado
                </button>
              )}
              
              <Link
                href="/medicoes"
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2"
              >
                ← Voltar
              </Link>
            </div>
          </div>

          {/* History Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                🕐 Histórico
              </h3>
            </div>
            <div className="p-0 max-h-80 overflow-y-auto">
              {history.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {history.map((h) => (
                    <li key={h.id} className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium text-white rounded ${historyActionColors[h.acao] || 'bg-gray-500'}`}>
                          {historyActionLabels[h.acao] || h.acao}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(h.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {h.usuario_id === criadoPor?.id ? criadoPor?.nome : 'Usuário'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-center text-gray-500 text-sm">Nenhum registro</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Motivo da Rejeição</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
              rows={4}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAction('rejeitar', rejectReason)}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Enviando...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
