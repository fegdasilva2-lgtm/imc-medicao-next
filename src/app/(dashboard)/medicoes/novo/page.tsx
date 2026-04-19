export const dynamic = "force-dynamic"

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import type { CentroDeCusto } from '@/types/database'

export default function NovaMedicaoPage() {
  const router = useRouter()
  const { usuario, isLoading } = useAuth()
  const [centrosDeCusto, setCentrosDeCusto] = useState<CentroDeCusto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [ccId, setCcId] = useState('')
  const [mesReferencia, setMesReferencia] = useState('')
  const [realizadoHn, setRealizadoHn] = useState('')
  const [valorSpot, setValorSpot] = useState('0')
  const [salarioMensal, setSalarioMensal] = useState<number>(0)

  // Calculated values
  const [vu, setVu] = useState(0)
  const [perda, setPerda] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!isLoading && !usuario) {
      router.push('/login')
    }
  }, [isLoading, usuario, router])

  useEffect(() => {
    const loadCCs = async () => {
      const supabase = createClient()
      
      let query = supabase
        .from('centros_de_custo')
        .select('*')
        .eq('is_active', true)
        .order('codigo')

      // Coordenadores only see their assigned CCs
      if (usuario?.role === 'coordenador') {
        const { data: userCCs } = await supabase
          .from('usuarios_ccs')
          .select('centros_de_custo_id')
          .eq('usuario_id', usuario.id)
        
        if (userCCs && userCCs.length > 0) {
          const ccIds = userCCs.map((ucc: { centros_de_custo_id: string }) => ucc.centros_de_custo_id)
          query = query.in('id', ccIds)
        } else {
          setLoading(false)
          return
        }
      }

      const { data } = await query
      setCentrosDeCusto(data || [])
      setLoading(false)
    }

    if (usuario) {
      loadCCs()
    }
  }, [usuario])

  // Calculate values when inputs change
  useEffect(() => {
    if (salarioMensal > 0) {
      const vuCalculated = salarioMensal / (30 * 8.48)
      const realizado = parseInt(realizadoHn) || 0
      const spot = parseFloat(valorSpot) || 0
      const perdaCalculada = Math.min(0, (realizado - 176) * vuCalculated)
      const totalCalculado = (realizado * vuCalculated) + perdaCalculada + spot

      setVu(vuCalculated)
      setPerda(perdaCalculada)
      setTotal(totalCalculado)
    }
  }, [salarioMensal, realizadoHn, valorSpot])

  const handleCCChange = (ccId: string) => {
    setCcId(ccId)
    const cc = centrosDeCusto.find(c => c.id === ccId)
    if (cc) {
      setSalarioMensal(cc.salario_mensal || 0)
    }
  }

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
  }

  const validateForm = () => {
    if (!ccId) {
      setError('Selecione um Centro de Custo')
      return false
    }
    if (!mesReferencia) {
      setError('Selecione o Mês de Referência')
      return false
    }
    if (!realizadoHn || parseInt(realizadoHn) < 0) {
      setError('Informe o Realizado em Horas Normais')
      return false
    }
    setError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setSaving(true)
    const supabase = createClient()

    // Calculate VU and values
    const vuCalculated = salarioMensal / (30 * 8.48)
    const realizado = parseInt(realizadoHn)
    const spot = parseFloat(valorSpot) || 0
    const perdaCalculada = Math.min(0, (realizado - 176) * vuCalculated)
    const totalCalculado = (realizado * vuCalculated) + perdaCalculada + spot

    const { data, error: insertError } = await supabase
      .from('medicoes')
      .insert({
        cc_id: ccId,
        mes_referencia: `${mesReferencia}-01`,
        status: 'rascunho',
        realizado_hn: realizado,
        valor_vu: vuCalculated,
        perda_contrato: perdaCalculada,
        valor_spot: spot,
        valor_total: totalCalculado,
        created_by_id: usuario!.id,
      })
      .select()
      .single()

    if (insertError) {
      setError('Erro ao criar medição: ' + insertError.message)
      setSaving(false)
      return
    }

    // Create history record
    await supabase.from('medicao_history').insert({
      medicao_id: data.id,
      usuario_id: usuario!.id,
      acao: 'criacao',
      dados_anteriores: null,
      dados_novos: {
        cc: ccId,
        mes_referencia: mesReferencia,
        realizado_hn: realizado,
        valor_spot: spot,
      }
    })

    router.push(`/medicoes/${data.id}`)
  }

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    )
  }

  // Check permission
  if (usuario?.role !== 'admin' && usuario?.role !== 'coordenador') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Você não tem permissão para criar medições.</p>
        <Link href="/medicoes" className="text-blue-600 hover:underline mt-2 inline-block">
          Voltar para lista
        </Link>
      </div>
    )
  }

  // Check if coordenador has CCs assigned
  if (usuario?.role === 'coordenador' && centrosDeCusto.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Você não possui Centros de Custo atribuídos.</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Nova Medição</h1>
          <p className="text-gray-500">Criar uma nova medição de serviços</p>
        </div>
        <Link
          href="/medicoes"
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
        >
          ← Voltar
        </Link>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Centro de Custo */}
            <div>
              <label htmlFor="cc" className="block text-sm font-medium text-gray-700 mb-1">
                Centro de Custo <span className="text-red-500">*</span>
              </label>
              <select
                id="cc"
                value={ccId}
                onChange={(e) => handleCCChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecione um CC</option>
                {centrosDeCusto.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.codigo} - {cc.descricao || cc.nome}
                  </option>
                ))}
              </select>
              {ccId && salarioMensal > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  Salário Mensal: {formatCurrency(salarioMensal)}
                </p>
              )}
            </div>

            {/* Mês de Referência */}
            <div>
              <label htmlFor="mes" className="block text-sm font-medium text-gray-700 mb-1">
                Mês de Referência <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                id="mes"
                value={mesReferencia}
                onChange={(e) => setMesReferencia(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <hr className="my-6" />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Cálculos
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Realizado HN */}
            <div>
              <label htmlFor="realizado" className="block text-sm font-medium text-gray-700 mb-1">
                Realizado (Horas Normais) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="realizado"
                value={realizadoHn}
                onChange={(e) => setRealizadoHn(e.target.value)}
                placeholder="176"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">Quantidade de horas normais realizadas no mês</p>
            </div>

            {/* Valor SPOT */}
            <div>
              <label htmlFor="spot" className="block text-sm font-medium text-gray-700 mb-1">
                Serviços SPOT (R$)
              </label>
              <input
                type="number"
                id="spot"
                value={valorSpot}
                onChange={(e) => setValorSpot(e.target.value)}
                placeholder="0,00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">Soma dos valores SPOT da medição</p>
            </div>
          </div>

          {/* Calculated Values Display */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-sm text-gray-500 mb-1">VU (Valor Unitário)</p>
                <p className="text-xl font-bold text-blue-600">
                  {vu > 0 ? formatCurrency(vu) : 'R$ 0,00'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Salário / (30 × 8.48)</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Perda de Contrato</p>
                <p className={`text-xl font-bold ${perda < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(perda)}
                </p>
                <p className="text-xs text-gray-400 mt-1">min(0, (HN - 176) × VU)</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Valor Total</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(total)}</p>
                <p className="text-xs text-gray-400 mt-1">(HN × VU) + Perda + SPOT</p>
              </div>
            </div>
          </div>

          <hr className="my-6" />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link
              href="/medicoes"
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Criando...' : 'Criar Medição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
