'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { 
  MedicaoFacilities, 
  LinhaEntradaFacilities, 
  MemoriaCalculoFacilities, 
  QuadroResumoFacilities,
  Usuario 
} from '@/types/database'

interface Props {
  facility: MedicaoFacilities
  linhasHN: LinhaEntradaFacilities[]
  linhasHC: LinhaEntradaFacilities[]
  linhasHE: LinhaEntradaFacilities[]
  memoriasRegular: MemoriaCalculoFacilities[]
  memoriasExtra: MemoriaCalculoFacilities[]
  quadrosResumo: QuadroResumoFacilities[]
  usuario: Usuario
}

export default function FacilitiesDetailClient({
  facility,
  linhasHN,
  linhasHC,
  linhasHE,
  memoriasRegular,
  memoriasExtra,
  quadrosResumo,
  usuario
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('cabecalho')
  const [isLoading, setIsLoading] = useState(false)

  const role = usuario.role
  const isCoordenadorOrAdmin = role === 'admin' || role === 'coordenador'
  const podeEditar = isCoordenadorOrAdmin && facility.status === 'rascunho'

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
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  const formatNumber = (value: number | null, decimals = 2) => {
    if (value == null) return '-'
    return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('medicoes_facilities')
      .update({ status: newStatus })
      .eq('id', facility.id)

    if (!error) {
      router.refresh()
    }
    setIsLoading(false)
  }

  // Calculate totals
  const totalHN = {
    hn: linhasHN.reduce((sum, l) => sum + (l.hn || 0), 0),
    qty_50_d: linhasHN.reduce((sum, l) => sum + l.qtd_50_d, 0),
    rs_50_d: linhasHN.reduce((sum, l) => sum + l.rs_50_d, 0),
    qty_50_n: linhasHN.reduce((sum, l) => sum + l.qtd_50_n, 0),
    rs_50_n: linhasHN.reduce((sum, l) => sum + l.rs_50_n, 0),
    qty_100_d: linhasHN.reduce((sum, l) => sum + l.qtd_100_d, 0),
    rs_100_d: linhasHN.reduce((sum, l) => sum + l.rs_100_d, 0),
    qty_100_n: linhasHN.reduce((sum, l) => sum + l.qtd_100_n, 0),
    rs_100_n: linhasHN.reduce((sum, l) => sum + l.rs_100_n, 0),
  }

  const totalHC = {
    hn: linhasHC.reduce((sum, l) => sum + (l.hn || 0), 0),
    qty_50_d: linhasHC.reduce((sum, l) => sum + l.qtd_50_d, 0),
    rs_50_d: linhasHC.reduce((sum, l) => sum + l.rs_50_d, 0),
    qty_50_n: linhasHC.reduce((sum, l) => sum + l.qtd_50_n, 0),
    rs_50_n: linhasHC.reduce((sum, l) => sum + l.rs_50_n, 0),
    qty_100_d: linhasHC.reduce((sum, l) => sum + l.qtd_100_d, 0),
    rs_100_d: linhasHC.reduce((sum, l) => sum + l.rs_100_d, 0),
    qty_100_n: linhasHC.reduce((sum, l) => sum + l.qtd_100_n, 0),
    rs_100_n: linhasHC.reduce((sum, l) => sum + l.rs_100_n, 0),
  }

  const totalHE = {
    qty_50_d: linhasHE.reduce((sum, l) => sum + l.qtd_50_d, 0),
    rs_50_d: linhasHE.reduce((sum, l) => sum + l.rs_50_d, 0),
    qty_50_n: linhasHE.reduce((sum, l) => sum + l.qtd_50_n, 0),
    rs_50_n: linhasHE.reduce((sum, l) => sum + l.rs_50_n, 0),
    qty_100_d: linhasHE.reduce((sum, l) => sum + l.qtd_100_d, 0),
    rs_100_d: linhasHE.reduce((sum, l) => sum + l.rs_100_d, 0),
    qty_100_n: linhasHE.reduce((sum, l) => sum + l.qtd_100_n, 0),
    rs_100_n: linhasHE.reduce((sum, l) => sum + l.rs_100_n, 0),
  }

  const totalRegular = memoriasRegular.reduce((sum, m) => sum + m.medicao_periodo, 0)

  const tabs = [
    { id: 'cabecalho', label: 'A. Cabeçalho', icon: '📋' },
    { id: 'hn', label: 'B. HN Efetivo', icon: '⏰' },
    { id: 'hc', label: 'C. HC Volante', icon: '👥' },
    { id: 'he', label: 'D. HE Cliente', icon: '💰' },
    { id: 'memoria', label: 'E. Memória', icon: '🧮' },
    { id: 'resumo', label: 'F. Quadro Resumo', icon: '📊' },
  ]

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{facility.cliente}</h2>
              <p className="text-sm text-gray-500">
                Contrato: {facility.contrato} | Período: {formatDate(facility.data_inicial)} a {formatDate(facility.data_final)}
              </p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[facility.status]}`}>
              {statusLabels[facility.status]}
            </span>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Local/Base/Região</p>
              <p className="font-medium text-gray-900">{facility.local_base_regiao || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Centro de Custo</p>
              <p className="font-medium text-gray-900">{facility.cc_id || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Objeto</p>
              <p className="font-medium text-gray-900 truncate">{facility.objeto || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isCoordenadorOrAdmin && facility.status === 'rascunho' && (
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => handleStatusChange('pendente')}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Enviando...' : 'Enviar para Aprovação'}
          </button>
        </div>
      )}

      {isCoordenadorOrAdmin && facility.status === 'pendente' && (
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => handleStatusChange('rascunho')}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium"
          >
            Voltar para Rascunho
          </button>
          <button
            onClick={() => handleStatusChange('aprovado')}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            Aprovar
          </button>
          <button
            onClick={() => handleStatusChange('rejeitado')}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
          >
            Rejeitar
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* A. Cabeçalho */}
        {activeTab === 'cabecalho' && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Cliente</label>
                <input type="text" value={facility.cliente} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Contrato</label>
                <input type="text" value={facility.contrato} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Data Inicial</label>
                <input type="text" value={formatDate(facility.data_inicial)} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Data Final</label>
                <input type="text" value={formatDate(facility.data_final)} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Local/Base/Região</label>
                <input type="text" value={facility.local_base_regiao} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">BM Número</label>
                <input type="text" value={facility.bm_numero || '-'} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">A.S. Número</label>
                <input type="text" value={facility.as_numero || '-'} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Data Base</label>
                <input type="text" value={facility.data_base || '-'} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Objeto</label>
                <textarea value={facility.objeto} readOnly rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Detalhes</label>
                <textarea value={facility.detalhes || ''} readOnly rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {/* B. HN Efetivo */}
        {activeTab === 'hn' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Horas Normais Efetivas</h3>
              {podeEditar && (
                <Link
                  href={`/facilities/${facility.id}/linhas/novo?tipo=hn`}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
                >
                  + Adicionar Linha
                </Link>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registro</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admissão</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">HN</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">50% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 50% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">50% N</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 50% N</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">100% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 100% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">100% N</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 100% N</th>
                    {podeEditar && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {linhasHN.length > 0 ? (
                    linhasHN.map((linha) => (
                      <tr key={linha.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{linha.item}</td>
                        <td className="px-4 py-3 text-sm">{linha.registro || '-'}</td>
                        <td className="px-4 py-3 text-sm">{linha.colaborador}</td>
                        <td className="px-4 py-3 text-sm">{linha.funcoes?.nome || '-'}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(linha.admissao)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.hn)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_50_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_50_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_50_n)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_50_n)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_100_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_100_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_100_n)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_100_n)}</td>
                        {podeEditar && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Link href={`/facilities/${facility.id}/linhas/${linha.id}`} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Editar</Link>
                              <button className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50">Excluir</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={podeEditar ? 15 : 14} className="px-4 py-8 text-center text-gray-500">
                        Nenhuma linha HN adicionada.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td colSpan={5} className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHN.hn)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHN.qty_50_d)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHN.rs_50_d)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHN.qty_50_n)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHN.rs_50_n)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHN.qty_100_d)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHN.rs_100_d)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHN.qty_100_n)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHN.rs_100_n)}</td>
                    {podeEditar && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* C. HC Volante */}
        {activeTab === 'hc' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">HC Volante - Equipe Temporária</h3>
              {podeEditar && (
                <Link
                  href={`/facilities/${facility.id}/linhas/novo?tipo=hc`}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
                >
                  + Adicionar Linha
                </Link>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registro</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">HN</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">50% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 50% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">50% N</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 50% N</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">100% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 100% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">100% N</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 100% N</th>
                    {podeEditar && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {linhasHC.length > 0 ? (
                    linhasHC.map((linha) => (
                      <tr key={linha.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{linha.item}</td>
                        <td className="px-4 py-3 text-sm">{linha.registro || '-'}</td>
                        <td className="px-4 py-3 text-sm">{linha.colaborador}</td>
                        <td className="px-4 py-3 text-sm">{linha.funcoes?.nome || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.hn)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_50_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_50_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_50_n)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_50_n)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_100_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_100_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_100_n)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_100_n)}</td>
                        {podeEditar && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Link href={`/facilities/${facility.id}/linhas/${linha.id}`} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Editar</Link>
                              <button className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50">Excluir</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={podeEditar ? 14 : 13} className="px-4 py-8 text-center text-gray-500">
                        Nenhuma linha HC adicionada.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHC.hn)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHC.qty_50_d)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHC.rs_50_d)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHC.qty_50_n)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHC.rs_50_n)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHC.qty_100_d)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHC.rs_100_d)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHC.qty_100_n)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHC.rs_100_n)}</td>
                    {podeEditar && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* D. HE Cliente */}
        {activeTab === 'he' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Horas Extras - Cliente</h3>
              {podeEditar && (
                <Link
                  href={`/facilities/${facility.id}/linhas/novo?tipo=he`}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
                >
                  + Adicionar Linha
                </Link>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registro</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">50% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 50% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">50% N</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 50% N</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">100% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 100% D</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">100% N</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R$ 100% N</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    {podeEditar && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {linhasHE.length > 0 ? (
                    linhasHE.map((linha) => (
                      <tr key={linha.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{linha.item}</td>
                        <td className="px-4 py-3 text-sm">{linha.registro || '-'}</td>
                        <td className="px-4 py-3 text-sm">{linha.colaborador}</td>
                        <td className="px-4 py-3 text-sm">{linha.funcoes?.nome || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_50_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_50_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_50_n)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_50_n)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_100_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_100_d)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatNumber(linha.qtd_100_n)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(linha.rs_100_n)}</td>
                        <td className="px-4 py-3 text-sm max-w-xs truncate">{linha.descricao_servico || '-'}</td>
                        {podeEditar && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Link href={`/facilities/${facility.id}/linhas/${linha.id}`} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Editar</Link>
                              <button className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50">Excluir</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={podeEditar ? 14 : 13} className="px-4 py-8 text-center text-gray-500">
                        Nenhuma linha HE adicionada.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHE.qty_50_d)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHE.rs_50_d)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHE.qty_50_n)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHE.rs_50_n)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHE.qty_100_d)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHE.rs_100_d)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalHE.qty_100_n)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalHE.rs_100_n)}</td>
                    <td colSpan={2}></td>
                    {podeEditar && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* E. Memória de Cálculo */}
        {activeTab === 'memoria' && (
          <div className="space-y-6">
            {/* Serviços Regulares */}
            <div>
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-900">Serviços Regulares</h3>
                {podeEditar && (
                  <Link
                    href={`/facilities/${facility.id}/memoria/novo?tipo=regular`}
                    className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
                  >
                    + Adicionar Função
                  </Link>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unid.</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Efetivo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Previsto Contrato</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acumulado Atual</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo Contrato</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Previsto Mês</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">HN Efetivo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">HN Volante</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">HE Efetivo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">VU</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Medição Período</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Perda</th>
                      {podeEditar && <th className="px-4 py-3"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {memoriasRegular.length > 0 ? (
                      memoriasRegular.map((mem) => (
                        <tr key={mem.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{mem.funcoes?.nome || '-'}</td>
                          <td className="px-4 py-3 text-sm text-center">{mem.unidade}</td>
                          <td className="px-4 py-3 text-sm text-center">{mem.efetivo}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(mem.previsto_contrato)}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(mem.acumulado_atual)}</td>
                          <td className={`px-4 py-3 text-sm text-right ${mem.saldo_contrato < 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(mem.saldo_contrato)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(mem.previsto_mes)}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatNumber(mem.realizado_hn_efetivo)}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatNumber(mem.realizado_hn_volante)}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(mem.realizado_he_efetivo)}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(mem.valor_unitario)}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">{formatCurrency(mem.medicao_periodo)}</td>
                          <td className={`px-4 py-3 text-sm text-right ${mem.perda_mediacao > 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(mem.perda_mediacao)}
                          </td>
                          {podeEditar && (
                            <td className="px-4 py-3">
                              <Link href={`/facilities/${facility.id}/memoria/${mem.id}`} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Editar</Link>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={podeEditar ? 13 : 12} className="px-4 py-8 text-center text-gray-500">
                          Nenhuma função na memória. <Link href={`/facilities/${facility.id}/memoria/novo?tipo=regular`} className="text-blue-600 hover:underline">Adicionar</Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-blue-50 font-bold">
                    <tr>
                      <td colSpan={11} className="px-4 py-3 text-right">TOTAL SERVIÇOS REGULARES:</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(totalRegular)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Serviços Extraordinários */}
            <div>
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-900">Serviços Extraordinários</h3>
                {podeEditar && (
                  <Link
                    href={`/facilities/${facility.id}/memoria/novo?tipo=extraordinario`}
                    className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
                  >
                    + Adicionar
                  </Link>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unid.</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Efetivo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diária Normal</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Medição Período</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observações</th>
                      {podeEditar && <th className="px-4 py-3"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {memoriasExtra.length > 0 ? (
                      memoriasExtra.map((mem) => (
                        <tr key={mem.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{mem.funcoes?.nome || '-'}</td>
                          <td className="px-4 py-3 text-sm text-center">{mem.unidade}</td>
                          <td className="px-4 py-3 text-sm text-center">{mem.efetivo}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(mem.diaria_normal)}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">{formatCurrency(mem.medicao_periodo)}</td>
                          <td className="px-4 py-3 text-sm max-w-xs truncate">{mem.observacoes || '-'}</td>
                          {podeEditar && (
                            <td className="px-4 py-3">
                              <Link href={`/facilities/${facility.id}/memoria/${mem.id}`} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Editar</Link>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={podeEditar ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                          Nenhum serviço extraordinário.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* F. Quadro Resumo */}
        {activeTab === 'resumo' && (
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quadro Resumo</h3>
            <div className="space-y-4">
              {quadrosResumo.length > 0 ? (
                quadrosResumo.map((quadro) => (
                  <div key={quadro.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Descrição</p>
                        <p className="font-medium">{quadro.descricao}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Centro de Custo</p>
                        <p className="font-medium">{quadro.centro_custo || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">CNPJ</p>
                        <p className="font-medium">{quadro.cnpj || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Período</p>
                        <p className="font-medium">
                          {formatDate(quadro.periodo_inicial)} a {formatDate(quadro.periodo_final)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 uppercase">Valor</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(quadro.valor)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Nenhum quadro resumo disponível.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
