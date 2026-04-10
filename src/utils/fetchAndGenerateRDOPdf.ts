import { supabase } from '@/lib/supabase';
import { generateRDOPdf, RDOPdfData } from '@/utils/generateRDOPdf';
import { toast } from 'sonner';

export async function fetchAndGenerateRDOPdf(rdoId: string) {
  try {
    toast.info('Gerando PDF...');

    // Fetch all data in parallel
    const [rdoRes, funcRes, equipRes, ativRes, fotosRes, aprovRes] = await Promise.all([
      supabase.from('rdos').select('*, obras(nome, contrato, contratante, local, endereco, data_inicio, prazo_contratual_dias, responsavel), empresas:empresa_id(nome, cnpj, logo_url)').eq('id', rdoId).single(),
      supabase.from('rdo_funcionarios').select('*, funcionarios(nome, cargo)').eq('rdo_id', rdoId),
      supabase.from('rdo_equipamentos').select('*, equipamentos(nome, tipo)').eq('rdo_id', rdoId),
      supabase.from('rdo_atividades').select('*').eq('rdo_id', rdoId),
      supabase.from('rdo_fotos').select('*').eq('rdo_id', rdoId),
      supabase.from('rdo_aprovacoes').select('*').eq('rdo_id', rdoId),
    ]);

    if (rdoRes.error || !rdoRes.data) throw new Error('RDO não encontrado');

    const rdo = rdoRes.data;
    const empresa = (rdo as any).empresas || { nome: '—', cnpj: null, logo_url: null };
    const obra = (rdo as any).obras || {};

    const pdfData: RDOPdfData = {
      rdo: {
        id: rdo.id,
        numero: rdo.numero,
        data: rdo.data,
        status: rdo.status,
        horario_entrada: rdo.horario_entrada,
        horario_saida: rdo.horario_saida,
        horario_intervalo_inicio: rdo.horario_intervalo_inicio,
        horario_intervalo_fim: rdo.horario_intervalo_fim,
        clima_manha: rdo.clima_manha,
        clima_tarde: rdo.clima_tarde,
        condicao_manha: rdo.condicao_manha,
        condicao_tarde: rdo.condicao_tarde,
        observacoes: rdo.observacoes,
      },
      empresa: { nome: empresa.nome, cnpj: empresa.cnpj, logo_url: empresa.logo_url },
      obra: {
        nome: obra.nome || '—',
        contrato: obra.contrato,
        contratante: obra.contratante,
        local: obra.local,
        endereco: obra.endereco,
        data_inicio: obra.data_inicio,
        prazo_contratual_dias: obra.prazo_contratual_dias,
      },
      funcionarios: (funcRes.data || []).map((f: any) => ({
        nome: f.funcionarios?.nome || '—',
        cargo: f.funcionarios?.cargo,
        presente: f.presente,
        horas: f.horas,
        horario_entrada: f.horario_entrada,
        horario_saida: f.horario_saida,
        horario_intervalo: f.horario_intervalo,
      })),
      equipamentos: (equipRes.data || []).map((e: any) => ({
        nome: e.equipamentos?.nome || '—',
        tipo: e.equipamentos?.tipo,
        quantidade: e.quantidade || 1,
        horas_uso: e.horas_uso,
        operacional: e.operacional,
      })),
      atividades: (ativRes.data || []).map((a: any) => ({
        descricao: a.descricao,
        quantidade: a.quantidade,
        unidade: a.unidade,
        status: a.status,
      })),
      fotos: (fotosRes.data || []).map((f: any) => ({ url: f.url, legenda: f.legenda })),
      aprovacoes: (aprovRes.data || []).map((a: any) => ({
        tipo: a.tipo,
        nome: a.nome,
        cargo: a.cargo,
        email: a.email,
        matricula: a.matricula,
        status: a.status,
        aprovado_em: a.aprovado_em,
      })),
    };

    await generateRDOPdf(pdfData);
    toast.success('PDF gerado com sucesso!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.error('Erro ao gerar PDF');
  }
}
