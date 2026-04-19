export const dynamic = "force-dynamic"

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { CentroDeCusto } from '@/types/database'

export default function FacilitiesForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [centrosDeCusto, setCentrosDeCusto] = useState<CentroDeCusto[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    cliente: '',
    contrato: '',
    cc_id: '',
    data_inicial: '',
    data_final: '',
    local_base_regiao: '',
    objeto: '',
    detalhes: '',
    bm_numero: '',
    as_numero: '',
    data_base: '',
    mes_referencia: '',
  })

  useEffect(() => {
    const fetchCCs = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('centros_de_custo')
        .select('*')
        .eq('is_active', true)
        .order('codigo')
      if (data) setCentrosDeCusto(data)
    }
    fetchCCs()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.cliente.trim()) newErrors.cliente = 'Cliente é obrigatório'
    if (!formData.contrato.trim()) newErrors.contrato = 'Contrato é obrigatório'
    if (!formData.data_inicial) newErrors.data_inicial = 'Data inicial é obrigatória'
    if (!formData.data_final) newErrors.data_final = 'Data final é obrigatória'
    if (!formData.objeto.trim()) newErrors.objeto = 'Objeto é obrigatório'

    if (formData.data_inicial && formData.data_final) {
      if (new Date(formData.data_inicial) > new Date(formData.data_final)) {
        newErrors.data_final = 'Data final deve ser maior que inicial'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!usuario) {
      setIsLoading(false)
      return
    }

    const payload = {
      ...formData,
      cc_id: formData.cc_id || null,
      mes_referencia: formData.mes_referencia || null,
      created_by: usuario.id,
      status: 'rascunho',
    }

    const { data, error } = await supabase
      .from('medicoes_facilities')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error creating facility:', error)
      setErrors({ submit: 'Erro ao criar medição. Tente novamente.' })
      setIsLoading(false)
      return
    }

    router.push(`/facilities/${data.id}`)
  }

  // Get current month in YYYY-MM format for default
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <h1 className="text-xl font-bold text-gray-900">Nova Medição Facilities</h1>
          <p className="text-sm text-gray-500">Preencha os dados do cabeçalho</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="cliente" className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <input
                type="text"
                id="cliente"
                name="cliente"
                value={formData.cliente}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.cliente ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nome do cliente"
              />
              {errors.cliente && <p className="mt-1 text-sm text-red-600">{errors.cliente}</p>}
            </div>

            <div>
              <label htmlFor="contrato" className="block text-sm font-medium text-gray-700 mb-1">
                Contrato *
              </label>
              <input
                type="text"
                id="contrato"
                name="contrato"
                value={formData.contrato}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.contrato ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Número do contrato"
              />
              {errors.contrato && <p className="mt-1 text-sm text-red-600">{errors.contrato}</p>}
            </div>

            <div>
              <label htmlFor="cc_id" className="block text-sm font-medium text-gray-700 mb-1">
                Centro de Custo
              </label>
              <select
                id="cc_id"
                name="cc_id"
                value={formData.cc_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione um CC</option>
                {centrosDeCusto.map(cc => (
                  <option key={cc.id} value={cc.id}>
                    {cc.codigo} - {cc.descricao?.substring(0, 30) || cc.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mes_referencia" className="block text-sm font-medium text-gray-700 mb-1">
                Mês Referência
              </label>
              <input
                type="month"
                id="mes_referencia"
                name="mes_referencia"
                value={formData.mes_referencia || currentMonth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="data_inicial" className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial *
              </label>
              <input
                type="date"
                id="data_inicial"
                name="data_inicial"
                value={formData.data_inicial}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.data_inicial ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.data_inicial && <p className="mt-1 text-sm text-red-600">{errors.data_inicial}</p>}
            </div>

            <div>
              <label htmlFor="data_final" className="block text-sm font-medium text-gray-700 mb-1">
                Data Final *
              </label>
              <input
                type="date"
                id="data_final"
                name="data_final"
                value={formData.data_final}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.data_final ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.data_final && <p className="mt-1 text-sm text-red-600">{errors.data_final}</p>}
            </div>

            <div className="col-span-2">
              <label htmlFor="local_base_regiao" className="block text-sm font-medium text-gray-700 mb-1">
                Local/Base/Região
              </label>
              <input
                type="text"
                id="local_base_regiao"
                name="local_base_regiao"
                value={formData.local_base_regiao}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Local/base/região da prestação do serviço"
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="objeto" className="block text-sm font-medium text-gray-700 mb-1">
                Objeto *
              </label>
              <textarea
                id="objeto"
                name="objeto"
                value={formData.objeto}
                onChange={handleChange}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.objeto ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Descrição do objeto da medição"
              />
              {errors.objeto && <p className="mt-1 text-sm text-red-600">{errors.objeto}</p>}
            </div>

            <div className="col-span-2">
              <label htmlFor="detalhes" className="block text-sm font-medium text-gray-700 mb-1">
                Detalhes
              </label>
              <textarea
                id="detalhes"
                name="detalhes"
                value={formData.detalhes}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Informações adicionais"
              />
            </div>

            <div>
              <label htmlFor="bm_numero" className="block text-sm font-medium text-gray-700 mb-1">
                BM Número
              </label>
              <input
                type="text"
                id="bm_numero"
                name="bm_numero"
                value={formData.bm_numero}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Número do BM"
              />
            </div>

            <div>
              <label htmlFor="as_numero" className="block text-sm font-medium text-gray-700 mb-1">
                A.S. Número
              </label>
              <input
                type="text"
                id="as_numero"
                name="as_numero"
                value={formData.as_numero}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Número da A.S."
              />
            </div>

            <div>
              <label htmlFor="data_base" className="block text-sm font-medium text-gray-700 mb-1">
                Data Base
              </label>
              <input
                type="text"
                id="data_base"
                name="data_base"
                value={formData.data_base}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Data base (ex: 01/2024)"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Link
              href="/facilities"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {isLoading ? 'Criando...' : 'Criar Medição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
