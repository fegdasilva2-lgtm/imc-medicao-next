import { NextRequest, NextResponse } from 'next/server'
import { createClient, getUsuario } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const usuario = await getUsuario()
  
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const resolvedParams = await params
  const { id } = resolvedParams
  const body = await request.json()
  const { action, motivo } = body

  // Get current medicao
  const { data: medicao, error: fetchError } = await supabase
    .from('medicoes')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !medicao) {
    return NextResponse.json({ error: 'Medição não encontrada' }, { status: 404 })
  }

  let newStatus = ''
  let historyAction = ''
  const updates: Record<string, unknown> = {}

  switch (action) {
    case 'enviar':
      // Can send if: admin OR (rascunho AND creator)
      if (usuario.role !== 'admin' && !(medicao.status === 'rascunho' && medicao.criado_por === usuario.id)) {
        return NextResponse.json({ error: 'Sem permissão para enviar' }, { status: 403 })
      }
      newStatus = 'pendente'
      historyAction = 'envio_pendente'
      break

    case 'aprovar':
      // Can approve if: admin/diretoria/cliente AND status is pendente
      if (!['admin', 'diretoria', 'cliente'].includes(usuario.role)) {
        return NextResponse.json({ error: 'Sem permissão para aprovar' }, { status: 403 })
      }
      if (medicao.status !== 'pendente') {
        return NextResponse.json({ error: 'Medição não está pendente' }, { status: 400 })
      }
      newStatus = 'aprovado'
      historyAction = 'aprovacao'
      updates.aprovado_por = usuario.id
      updates.data_aprovacao = new Date().toISOString()
      updates.snapshot_dados = {
        vu: medicao.valor_vu?.toString() || '0',
        perda_contrato: medicao.perda_contrato?.toString() || '0',
        valor_spot: medicao.valor_spot?.toString() || '0',
        valor_total: medicao.valor_total?.toString() || '0',
        realizado_hn: medicao.realizado_hn?.toString() || '0',
        data_aprovacao: new Date().toISOString(),
      }
      break

    case 'rejeitar':
      // Can reject if: admin/diretoria/cliente AND status is pendente
      if (!['admin', 'diretoria', 'cliente'].includes(usuario.role)) {
        return NextResponse.json({ error: 'Sem permissão para rejeitar' }, { status: 403 })
      }
      if (medicao.status !== 'pendente') {
        return NextResponse.json({ error: 'Medição não está pendente' }, { status: 400 })
      }
      if (!motivo) {
        return NextResponse.json({ error: 'Motivo da rejeição é obrigatório' }, { status: 400 })
      }
      newStatus = 'rejeitado'
      historyAction = 'rejeicao'
      updates.rejeitado_por = usuario.id
      updates.motivo_rejeicao = motivo
      break

    case 'faturar':
      // Can faturar if: faturamento role AND status is aprovado
      if (usuario.role !== 'faturamento') {
        return NextResponse.json({ error: 'Sem permissão para marcar como faturado' }, { status: 403 })
      }
      if (medicao.status !== 'aprovado') {
        return NextResponse.json({ error: 'Medição não está aprovada' }, { status: 400 })
      }
      newStatus = 'faturado'
      historyAction = 'faturamento'
      updates.faturado_por = usuario.id
      updates.data_faturamento = new Date().toISOString()
      break

    default:
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  updates.status = newStatus

  // Update medicao
  const { error: updateError } = await supabase
    .from('medicoes')
    .update(updates)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao atualizar medição' }, { status: 500 })
  }

  // Create history record
  await supabase.from('medicao_history').insert({
    medicao_id: id,
    usuario_id: usuario.id,
    acao: historyAction,
    dados_anteriores: { status: medicao.status },
    dados_novos: { status: newStatus, ...(motivo ? { motivo } : {}) }
  })

  return NextResponse.json({ success: true, status: newStatus })
}
