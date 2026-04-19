import { redirect, notFound } from 'next/navigation'
import { createClient, getUsuario } from '@/lib/supabase/server'
import type { 
  MedicaoFacilities, 
  LinhaEntradaFacilities, 
  MemoriaCalculoFacilities, 
  QuadroResumoFacilities 
} from '@/types/database'
import FacilitiesDetailClient from './FacilitiesDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FacilitiesDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const usuario = await getUsuario()

  if (!usuario) {
    redirect('/login')
  }

  // Fetch main facility record
  const { data: facility, error: facilityError } = await supabase
    .from('medicoes_facilities')
    .select(`
      *,
      centros_de_custo:centros_de_custo(id, codigo, descricao)
    `)
    .eq('id', id)
    .single()

  if (facilityError || !facility) {
    notFound()
  }

  // Fetch all related data in parallel
  const [
    { data: linhasHN },
    { data: linhasHC },
    { data: linhasHE },
    { data: memoriasRegular },
    { data: memoriasExtra },
    { data: quadrosResumo }
  ] = await Promise.all([
    supabase
      .from('linhas_entrada_facilities')
      .select('*, funcoes:funcoes(*)')
      .eq('medicao_id', id)
      .eq('tipo', 'hn')
      .order('item'),
    supabase
      .from('linhas_entrada_facilities')
      .select('*, funcoes:funcoes(*)')
      .eq('medicao_id', id)
      .eq('tipo', 'hc')
      .order('item'),
    supabase
      .from('linhas_entrada_facilities')
      .select('*, funcoes:funcoes(*)')
      .eq('medicao_id', id)
      .eq('tipo', 'he')
      .order('item'),
    supabase
      .from('memorias_calculo_facilities')
      .select('*, funcoes:funcoes(*)')
      .eq('medicao_id', id)
      .eq('tipo', 'regular')
      .order('funcoes(nome)'),
    supabase
      .from('memorias_calculo_facilities')
      .select('*, funcoes:funcoes(*)')
      .eq('medicao_id', id)
      .eq('tipo', 'extraordinario')
      .order('funcoes(nome)'),
    supabase
      .from('quadros_resumo_facilities')
      .select('*')
      .eq('medicao_id', id)
      .order('ordem')
  ])

  // Transform data to expected types
  const typedFacility = facility as unknown as MedicaoFacilities
  const typedLinhasHN = (linhasHN || []) as unknown as LinhaEntradaFacilities[]
  const typedLinhasHC = (linhasHC || []) as unknown as LinhaEntradaFacilities[]
  const typedLinhasHE = (linhasHE || []) as unknown as LinhaEntradaFacilities[]
  const typedMemoriasRegular = (memoriasRegular || []) as unknown as MemoriaCalculoFacilities[]
  const typedMemoriasExtra = (memoriasExtra || []) as unknown as MemoriaCalculoFacilities[]
  const typedQuadrosResumo = (quadrosResumo || []) as unknown as QuadroResumoFacilities[]

  return (
    <FacilitiesDetailClient
      facility={typedFacility}
      linhasHN={typedLinhasHN}
      linhasHC={typedLinhasHC}
      linhasHE={typedLinhasHE}
      memoriasRegular={typedMemoriasRegular}
      memoriasExtra={typedMemoriasExtra}
      quadrosResumo={typedQuadrosResumo}
      usuario={usuario}
    />
  )
}
