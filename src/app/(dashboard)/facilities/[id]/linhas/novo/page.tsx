'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Funcao } from '@/types/database'

interface Props {
  medicaoId: string
  tipo: 'hn' | 'hc' | 'he'
}

export default function LinhaEntradaForm({ medicaoId, tipo }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tipoParam = searchParams.get('tipo') as 'hn' | 'hc' | 'he' | null
  const finalTipo = tipoParam || tipo

  const [isLoading, setIsLoading] = useState(false)
  const [funcoes, setFuncoes] = useState<Funcao[]>([])
  const [errors, setErrors] = useState<Record<string, string>>()
  const [itemNumber, setItemNumber] = useState(1)

  const [formData, setFormData] = useState({
    registro: '',
    colaborador: '',
    funcao_id: '',
    admissao: '',
    hn: '',
    qtd_50_d: '0',
    rs_50_d: '0',
    qtd_50_n: '0',
    rs_50_n: '0',
    qtd_100_d: '0',
    rs_100_d: '0',
    qtd_100_n: '0',
    rs_100_n: '0',
    descricao_servico: '',
    motivo: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch funcoes
      const { data: funcoesData } = await supabase
        .from('funcoes')
        .select('*')
        .order('nome')
      if (funcoesData) setFuncoes(funcoesData)

      // Get next item number
      const { data: existingLines } = await supabase
        .from('linhas_entrada_facilities')
        .select('item')
        .eq('medicao_id', medicaoId)
        .eq('tipo', finalTipo)
      if (existingLines && existingLines.length > 0) {
        const maxItem = Math.max(...existingLines.map(l => l.item))
        setItemNumber(maxItem + 1)
      }
    }
    fetchData()
  }, [medicaoId, finalTipo])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // Allow empty or valid decimal numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.colaborador.trim()) newErrors.colaborador = 'Colaborador é obrigatório'
    if (!formData.funcao_id) newErrors.funcao_id = 'Função é obrigatória'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    const supabase = createClient()

    const payload = {
      medicao_id: medicaoId,
      tipo: finalTipo,
      item: itemNumber,
      registro: formData.registro,
      colaborador: formData.colaborador,
      funcao_id: formData.funcao_id,
      admissao: formData.admissao || null,
      hn: finalTipo !== 'he' ? parseFloat(formData.hn) || 0 : null,
      qtd_50_d: parseFloat(formData.qtd_50_d) || 0,
      rs_50_d: parseFloat(formData.rs_50_d) || 0,
      qtd_50_n: parseFloat(formData.qtd_50_n) || 0,
      rs_50_n: parseFloat(formData.rs_50_n) || 0,
      qtd_100_d: parseFloat(formData.qtd_100_d) || 0,
      rs_100_d: parseFloat(formData.rs_100_d) || 0,
      qtd_100_n: parseFloat(formData.qtd_100_n) || 0,
      rs_100_n: parseFloat(formData.rs_100_n) || 0,
      descricao_servico: formData.descricao_servico,
      motivo: formData.motivo,
    }

    const { error } = await supabase
      .from('linhas_entrada_facilities')
      .insert(payload)

    if (error) {
      console.error('Error creating linha:', error)
      setErrors({ submit: 'Erro ao criar linha. Tente novamente.' })
      setIsLoading(false)
      return
    }

    router.push(`/facilities/${medicaoId}?tab=${finalTipo === 'hn' ? 'hn' : finalTipo === 'hc' ? 'hc' : 'he'}`)
  }

  const tipoLabels = {
    hn: 'HN Efetivo',
    hc: 'HC Volante',
    he: 'HE Cliente',
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Adicionar Linha - {tipoLabels[finalTipo]}</h1>
              <p className="text-sm text-gray-500">Medição Facilities</p>
            </div>
            <Link
              href={`/facilities/${medicaoId}`}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Voltar
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {errors?.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
              <input
                type="text"
                value={itemNumber}
                disabled
                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500"
              />
            </div>

            <div>
              <label htmlFor="registro" className="block text-sm font-medium text-gray-700 mb-1">
                Registro
              </label>
              <input
                type="text"
                id="registro"
                name="registro"
                value={formData.registro}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Número de registro"
              />
            </div>

            <div>
              <label htmlFor="colaborador" className="block text-sm font-medium text-gray-700 mb-1">
                Colaborador *
              </label>
              <input
                type="text"
                id="colaborador"
                name="colaborador"
                value={formData.colaborador}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors?.colaborador ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nome do colaborador"
              />
              {errors?.colaborador && <p className="mt-1 text-sm text-red-600">{errors.colaborador}</p>}
            </div>

            <div>
              <label htmlFor="funcao_id" className="block text-sm font-medium text-gray-700 mb-1">
                Função *
              </label>
              <select
                id="funcao_id"
                name="funcao_id"
                value={formData.funcao_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors?.funcao_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Selecione uma função</option>
                {funcoes.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
              {errors?.funcao_id && <p className="mt-1 text-sm text-red-600">{errors.funcao_id}</p>}
            </div>

            {finalTipo !== 'he' && (
              <div>
                <label htmlFor="admissao" className="block text-sm font-medium text-gray-700 mb-1">
                  Admissão
                </label>
                <input
                  type="date"
                  id="admissao"
                  name="admissao"
                  value={formData.admissao}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {finalTipo !== 'he' && (
              <div>
                <label htmlFor="hn" className="block text-sm font-medium text-gray-700 mb-1">
                  HN
                </label>
                <input
                  type="text"
                  id="hn"
                  name="hn"
                  value={formData.hn}
                  onChange={handleNumberChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {/* HE Fields */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Horas Extras</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">50% D (Qtd)</label>
                <input
                  type="text"
                  name="qtd_50_d"
                  value={formData.qtd_50_d}
                  onChange={handleNumberChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">50% D (R$)</label>
                <input
                  type="text"
                  name="rs_50_d"
                  value={formData.rs_50_d}
                  onChange={handleNumberChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">50% N (Qtd)</label>
                <input
                  type="text"
                  name="qtd_50_n"
                  value={formData.qtd_50_n}
                  onChange={handleNumberChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">50% N (R$)</label>
                <input
                  type="text"
                  name="rs_50_n"
                  value={formData.rs_50_n}
                  onChange={handleNumberChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">100% D (Qtd)</label>
                <input
                  type="text"
                  name="qtd_100_d"
                  value={formData.qtd_100_d}
                  onChange={handleNumberChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">100% D (R$)</label>
                <input
                  type="text"
                  name="rs_100_d"
                  value={formData.rs_100_d}
                  onChange={handleNumberChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">100% N (Qtd)</label>
                <input
                  type="text"
                  name="qtd_100_n"
                  value={formData.qtd_100_n}
                  onChange={handleNumberChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">100% N (R$)</label>
                <input
                  type="text"
                  name="rs_100_n"
                  value={formData.rs_100_n}
                  onChange={handleNumberChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Description for HE */}
          {finalTipo === 'he' && (
            <div className="mt-6">
              <label htmlFor="descricao_servico" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição do Serviço
              </label>
              <textarea
                id="descricao_servico"
                name="descricao_servico"
                value={formData.descricao_servico}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Descrição do serviço realizado"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Link
              href={`/facilities/${medicaoId}`}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {isLoading ? 'Salvando...' : 'Adicionar Linha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
