import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { format, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TDocumentDefinitions, Content, TableCell, StyleDictionary } from 'pdfmake/interfaces';

// Register fonts
(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs ?? pdfFonts;

export interface RDOPdfData {
  rdo: {
    id: string;
    numero: number | null;
    data: string;
    status: string;
    horario_entrada: string | null;
    horario_saida: string | null;
    horario_intervalo_inicio: string | null;
    horario_intervalo_fim: string | null;
    clima_manha: string;
    clima_tarde: string;
    condicao_manha: string;
    condicao_tarde: string;
    observacoes: string | null;
  };
  empresa: {
    nome: string;
    cnpj: string | null;
    logo_url: string | null;
  };
  obra: {
    nome: string;
    contrato: string | null;
    contratante: string | null;
    local: string | null;
    endereco: string | null;
    data_inicio: string | null;
    prazo_contratual_dias: number | null;
    responsavel: string | null;
  };
  funcionarios: {
    nome: string;
    cargo: string | null;
    presente: boolean;
    horas: number | null;
    horario_entrada: string | null;
    horario_saida: string | null;
    horario_intervalo: string | null;
    local_trabalho: string | null;
  }[];
  equipamentos: {
    nome: string;
    tipo: string | null;
    quantidade: number;
    horas_uso: number | null;
    operacional: boolean;
  }[];
  atividades: {
    descricao: string;
    quantidade: number | null;
    unidade: string | null;
    status: string;
  }[];
  fotos: {
    url: string;
    legenda: string | null;
  }[];
  aprovacoes: {
    tipo: string;
    nome: string;
    cargo: string | null;
    email: string | null;
    matricula: string | null;
    status: string;
    aprovado_em: string | null;
  }[];
}

// ── Helpers ──

const BORDER_COLOR = '#9ca3af';
const SECTION_BG = '#f3f4f6';
const COL_HEADER_BG = '#f9fafb';
const ZEBRA_ODD = '#fafafa';
const GREEN = '#16a34a';
const BLUE = '#3b82f6';
const RED = '#dc2626';
const MUTED = '#6b7280';

const climaLabels: Record<string, string> = {
  ensolarado: 'Claro',
  nublado: 'Nublado',
  chuvoso: 'Chuvoso',
  tempestade: 'Tempestade',
};

const condicaoLabels: Record<string, string> = {
  praticavel: 'Praticável',
  impraticavel: 'Impraticável',
};

const statusLabels: Record<string, string> = {
  em_andamento: 'Em Andamento',
  concluido: 'Concluída',
  concluida: 'Concluída',
  nao_iniciado: 'Não Iniciado',
  paralisada: 'Paralisada',
  paralisado: 'Paralisada',
};

const statusColors: Record<string, string> = {
  em_andamento: BLUE,
  concluido: GREEN,
  concluida: GREEN,
  nao_iniciado: MUTED,
  paralisada: RED,
  paralisado: RED,
};

function fmt(t: string | null): string {
  if (!t) return '—';
  const parts = t.split(':');
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
}

function calcHours(entrada: string | null, saida: string | null, intInicio: string | null, intFim: string | null): string {
  if (!entrada || !saida) return '—';
  const toMin = (t: string) => { const p = t.split(':').map(Number); return p[0] * 60 + p[1]; };
  let total = toMin(saida) - toMin(entrada);
  if (intInicio && intFim) total -= toMin(intFim) - toMin(intInicio);
  if (total <= 0) return '—';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function sectionTitle(text: string): Content {
  return {
    text,
    style: 'sectionHeader',
    margin: [0, 8, 0, 2],
  };
}

function defaultBorders(): [boolean, boolean, boolean, boolean] {
  return [true, true, true, true];
}

// ── Build PDF ──

export async function generateRDOPdf(data: RDOPdfData): Promise<void> {
  const rdoDate = new Date(data.rdo.data + 'T00:00:00');
  const formattedDate = format(rdoDate, 'dd/MM/yyyy');
  const diaSemana = format(rdoDate, 'EEEE', { locale: ptBR });
  const diaSemanaCapitalized = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  const rdoNumero = data.rdo.numero ? String(data.rdo.numero) : '—';
  const isAprovado = data.rdo.status === 'finalizado';

  // Prazo calculations
  const prazoContratual = data.obra.prazo_contratual_dias;
  let prazoDecorrido: number | null = null;
  let prazoVencer: number | null = null;
  if (prazoContratual && data.obra.data_inicio) {
    const inicio = new Date(data.obra.data_inicio + 'T00:00:00');
    prazoDecorrido = differenceInCalendarDays(rdoDate, inicio);
    prazoVencer = prazoContratual - prazoDecorrido;
  }
  const fmtPrazo = (v: number | null) => (v != null ? `${v} dias` : '—');

  // Hours
  const horaEntrada = fmt(data.rdo.horario_entrada);
  const horaSaida = fmt(data.rdo.horario_saida);
  const intInicio = fmt(data.rdo.horario_intervalo_inicio);
  const intFim = fmt(data.rdo.horario_intervalo_fim);
  const horasTrabalhadas = calcHours(data.rdo.horario_entrada, data.rdo.horario_saida, data.rdo.horario_intervalo_inicio, data.rdo.horario_intervalo_fim);

  // Load logo
  let logoContent: Content;
  if (data.empresa.logo_url) {
    const logoBase64 = await loadImageAsBase64(data.empresa.logo_url);
    if (logoBase64) {
      logoContent = { image: logoBase64, width: 120, height: 40, margin: [0, 0, 0, 4] };
    } else {
      logoContent = { text: data.empresa.nome, style: 'companyName', margin: [0, 0, 0, 4] };
    }
  } else {
    logoContent = { text: data.empresa.nome, style: 'companyName', margin: [0, 0, 0, 4] };
  }

  // Load photos
  const photoImages: (string | null)[] = [];
  for (const foto of data.fotos) {
    photoImages.push(await loadImageAsBase64(foto.url));
  }

  // ── Content sections ──
  const content: Content[] = [];

  // ====== 1. HEADER: 2-column table (70/30) ======
  const headerLeftTable: Content = {
    table: {
      widths: ['auto', '*'],
      body: [
        [{ text: 'Obra', style: 'labelCell' }, { text: data.obra.nome, style: 'valueCell', bold: true }],
        [{ text: 'Local', style: 'labelCell' }, { text: data.obra.local || data.obra.endereco || '—', style: 'valueCell' }],
        [{ text: 'Contratante', style: 'labelCell' }, { text: data.obra.contratante || '—', style: 'valueCell' }],
        [{ text: 'Responsável', style: 'labelCell' }, { text: data.obra.responsavel || '—', style: 'valueCell' }],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => BORDER_COLOR,
      vLineColor: () => BORDER_COLOR,
    },
  };

  const rightInfoRows: TableCell[][] = [
    [{ text: 'Relatório n°', style: 'labelCell' }, { text: rdoNumero, style: 'valueCell', bold: true }],
    [{ text: 'Data do relatório', style: 'labelCell' }, { text: formattedDate, style: 'valueCell', bold: true }],
    [{ text: 'Dia da semana', style: 'labelCell' }, { text: diaSemanaCapitalized, style: 'valueCell' }],
    [{ text: 'Contrato', style: 'labelCell' }, { text: data.obra.contrato || '—', style: 'valueCell' }],
    [{ text: 'Prazo contratual', style: 'labelCell' }, { text: fmtPrazo(prazoContratual), style: 'valueCell' }],
    [{ text: 'Prazo decorrido', style: 'labelCell' }, { text: fmtPrazo(prazoDecorrido), style: 'valueCell' }],
    [{ text: 'Prazo a vencer', style: 'labelCell' }, { text: fmtPrazo(prazoVencer), style: 'valueCell' }],
  ];

  const headerRightTable: Content = {
    table: {
      widths: ['auto', '*'],
      body: rightInfoRows,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => BORDER_COLOR,
      vLineColor: () => BORDER_COLOR,
    },
  };

  // Badge "Aprovado"
  const badgeContent: Content = isAprovado
    ? {
        table: {
          widths: ['*'],
          body: [[{
            text: 'APROVADO',
            alignment: 'center' as const,
            color: '#ffffff',
            bold: true,
            fontSize: 9,
            margin: [8, 3, 8, 3] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          fillColor: () => GREEN,
        },
        margin: [0, 0, 0, 4] as [number, number, number, number],
      }
    : { text: '' };

  content.push({
    columns: [
      {
        width: '65%',
        stack: [logoContent, headerLeftTable],
      },
      {
        width: '35%',
        stack: [badgeContent, headerRightTable],
      },
    ],
    columnGap: 10,
  });

  // ====== 2. HORÁRIO + CLIMA (side by side) ======
  content.push(sectionTitle('Horário de Trabalho / Condição Climática'));

  const horarioTable: Content = {
    table: {
      widths: ['auto', '*', 'auto'],
      body: [
        [
          { text: 'Horário de trabalho', style: 'colHeader', colSpan: 2, border: defaultBorders() }, {},
          { text: 'Horas trabalhadas', style: 'colHeader', alignment: 'center' as const, border: defaultBorders() },
        ],
        [
          { text: 'Entrada / Saída', style: 'labelCell', border: defaultBorders() },
          { text: `${horaEntrada} - ${horaSaida}`, style: 'valueCell', bold: true, border: defaultBorders() },
          { text: horasTrabalhadas, fontSize: 14, bold: true, alignment: 'center' as const, rowSpan: 2, margin: [0, 4, 0, 0] as [number, number, number, number], border: defaultBorders() },
        ],
        [
          { text: 'Intervalo', style: 'labelCell', border: defaultBorders() },
          { text: `${intInicio} - ${intFim}`, style: 'valueCell', bold: true, border: defaultBorders() },
          {},
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => BORDER_COLOR,
      vLineColor: () => BORDER_COLOR,
      fillColor: (row: number) => row === 0 ? COL_HEADER_BG : null,
    },
  };

  const climaTable: Content = {
    table: {
      widths: ['auto', '*', '*'],
      body: [
        [
          { text: 'Condição climática', style: 'colHeader', border: defaultBorders() },
          { text: 'Tempo', style: 'colHeader', alignment: 'center' as const, border: defaultBorders() },
          { text: 'Condição', style: 'colHeader', alignment: 'center' as const, border: defaultBorders() },
        ],
        [
          { text: 'Manhã', style: 'labelCell', border: defaultBorders() },
          { text: climaLabels[data.rdo.clima_manha] || data.rdo.clima_manha, alignment: 'center' as const, border: defaultBorders() },
          { text: condicaoLabels[data.rdo.condicao_manha] || data.rdo.condicao_manha, alignment: 'center' as const, border: defaultBorders() },
        ],
        [
          { text: 'Tarde', style: 'labelCell', border: defaultBorders() },
          { text: climaLabels[data.rdo.clima_tarde] || data.rdo.clima_tarde, alignment: 'center' as const, border: defaultBorders() },
          { text: condicaoLabels[data.rdo.condicao_tarde] || data.rdo.condicao_tarde, alignment: 'center' as const, border: defaultBorders() },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => BORDER_COLOR,
      vLineColor: () => BORDER_COLOR,
      fillColor: (row: number) => row === 0 ? COL_HEADER_BG : null,
    },
  };

  content.push({
    columns: [
      { width: '50%', ...horarioTable } as any,
      { width: '50%', ...climaTable } as any,
    ],
    columnGap: 6,
  });

  // ====== 3. MÃO DE OBRA ======
  const presenteFuncs = data.funcionarios.filter((f) => f.presente);
  content.push(sectionTitle(`Mão de Obra (${presenteFuncs.length})`));

  if (presenteFuncs.length > 0) {
    const maoDeObraBody: TableCell[][] = [
      [
        { text: 'N°', style: 'colHeader', alignment: 'center' as const },
        { text: 'Nome', style: 'colHeader' },
        { text: 'Função', style: 'colHeader' },
        { text: 'Entrada / Saída', style: 'colHeader', alignment: 'center' as const },
        { text: 'Intervalo', style: 'colHeader', alignment: 'center' as const },
        { text: 'Horas', style: 'colHeader', alignment: 'center' as const },
        { text: 'Local', style: 'colHeader' },
      ],
      ...presenteFuncs.map((f, i) => [
        { text: String(i + 1), alignment: 'center' as const },
        { text: f.nome },
        { text: f.cargo || '—' },
        { text: `${fmt(f.horario_entrada)} - ${fmt(f.horario_saida)}`, alignment: 'center' as const },
        { text: fmt(f.horario_intervalo), alignment: 'center' as const },
        { text: f.horas != null ? `${String(f.horas).padStart(2, '0')}:00` : '—', alignment: 'center' as const },
        { text: f.local_trabalho || '—', color: MUTED },
      ] as TableCell[]),
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: [20, '*', 60, 70, 55, 35, 60],
        body: maoDeObraBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => BORDER_COLOR,
        vLineColor: () => BORDER_COLOR,
        fillColor: (row: number) => {
          if (row === 0) return COL_HEADER_BG;
          return row % 2 === 0 ? ZEBRA_ODD : null;
        },
      },
    });
  } else {
    content.push({ text: 'Nenhum funcionário registrado.', color: MUTED, italics: true, margin: [0, 2, 0, 4] });
  }

  // ====== 4. EQUIPAMENTOS (grid 6 columns) ======
  content.push(sectionTitle(`Equipamentos (${data.equipamentos.length})`));

  if (data.equipamentos.length > 0) {
    const gridCols = 6;
    const equipRows: TableCell[][] = [];

    for (let i = 0; i < data.equipamentos.length; i += gridCols) {
      const nameRow: TableCell[] = [];
      const qtyRow: TableCell[] = [];
      for (let j = 0; j < gridCols; j++) {
        const e = data.equipamentos[i + j];
        if (e) {
          nameRow.push({ text: e.nome, alignment: 'center' as const, fontSize: 7 });
          qtyRow.push({ text: String(e.quantidade), alignment: 'center' as const, bold: true, fontSize: 9 });
        } else {
          nameRow.push({ text: '' });
          qtyRow.push({ text: '' });
        }
      }
      equipRows.push(nameRow, qtyRow);
    }

    content.push({
      table: {
        widths: Array(gridCols).fill('*'),
        body: equipRows,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => BORDER_COLOR,
        vLineColor: () => BORDER_COLOR,
      },
    });
  } else {
    content.push({ text: 'Nenhum equipamento registrado.', color: MUTED, italics: true, margin: [0, 2, 0, 4] });
  }

  // ====== 5. ATIVIDADES ======
  content.push(sectionTitle(`Atividades (${data.atividades.length})`));

  if (data.atividades.length > 0) {
    const atividadesBody: TableCell[][] = [
      [
        { text: 'Descrição', style: 'colHeader' },
        { text: 'Status', style: 'colHeader', alignment: 'center' as const },
      ],
      ...data.atividades.map((a) => {
        const statusKey = a.status;
        const statusLabel = statusLabels[statusKey] || statusKey;
        const statusColor = statusColors[statusKey] || '#000000';
        return [
          { text: a.descricao },
          { text: statusLabel, alignment: 'center' as const, color: statusColor, bold: true },
        ] as TableCell[];
      }),
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 80],
        body: atividadesBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => BORDER_COLOR,
        vLineColor: () => BORDER_COLOR,
        fillColor: (row: number) => {
          if (row === 0) return COL_HEADER_BG;
          return row % 2 === 0 ? ZEBRA_ODD : null;
        },
      },
    });
  } else {
    content.push({ text: 'Nenhuma atividade registrada.', color: MUTED, italics: true, margin: [0, 2, 0, 4] });
  }

  // ====== 6. OBSERVAÇÕES ======
  if (data.rdo.observacoes) {
    content.push(sectionTitle('Observações'));
    content.push({
      table: {
        widths: ['*'],
        body: [[{ text: data.rdo.observacoes, margin: [4, 4, 4, 4] as [number, number, number, number] }]],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => BORDER_COLOR,
        vLineColor: () => BORDER_COLOR,
      },
    });
  }

  // ====== 7. FOTOS (2-column grid) ======
  if (data.fotos.length > 0) {
    content.push(sectionTitle(`Registro Fotográfico (${data.fotos.length})`));

    for (let i = 0; i < data.fotos.length; i += 2) {
      const cols: Content[] = [];

      for (let j = 0; j < 2; j++) {
        const idx = i + j;
        if (idx < data.fotos.length) {
          const imgData = photoImages[idx];
          const foto = data.fotos[idx];
          const stackItems: Content[] = [];

          if (imgData) {
            stackItems.push({
              image: imgData,
              width: 230,
              height: 170,
              margin: [0, 0, 0, 2] as [number, number, number, number],
            });
          } else {
            stackItems.push({
              text: 'Imagem indisponível',
              alignment: 'center',
              color: MUTED,
              italics: true,
              margin: [0, 60, 0, 60] as [number, number, number, number],
            });
          }

          if (foto.legenda) {
            stackItems.push({
              text: foto.legenda,
              fontSize: 7,
              color: MUTED,
              italics: true,
              margin: [0, 0, 0, 4] as [number, number, number, number],
            });
          }

          cols.push({ stack: stackItems, width: '50%' } as any);
        }
      }

      if (cols.length > 0) {
        content.push({
          columns: cols,
          columnGap: 8,
          margin: [0, 4, 0, 4] as [number, number, number, number],
        });
      }
    }
  }

  // ====== 8. APROVAÇÕES (2-column: CONTRATADA / CONTRATANTE) ======
  content.push(sectionTitle('Aprovações / Assinaturas'));

  const contratada = data.aprovacoes.find((a) => a.tipo === 'contratada');
  const contratante = data.aprovacoes.find((a) => a.tipo === 'contratante');

  const buildApprovalBlock = (label: string, person: typeof contratada): Content => {
    const items: Content[] = [
      { text: label, bold: true, fontSize: 9, alignment: 'center', margin: [0, 4, 0, 6] as [number, number, number, number], fillColor: SECTION_BG } as any,
    ];

    if (person) {
      items.push({ text: person.nome.toUpperCase(), bold: true, fontSize: 11, margin: [4, 4, 4, 2] as [number, number, number, number] });
      if (person.cargo) items.push({ text: `Cargo: ${person.cargo}`, fontSize: 8, color: MUTED, margin: [4, 0, 4, 1] as [number, number, number, number] });
      if (person.matricula) items.push({ text: `Matrícula: ${person.matricula}`, fontSize: 8, color: MUTED, margin: [4, 0, 4, 1] as [number, number, number, number] });
      if (person.email) items.push({ text: `E-mail: ${person.email}`, fontSize: 8, color: MUTED, margin: [4, 0, 4, 4] as [number, number, number, number] });

      if (person.aprovado_em) {
        items.push({
          table: {
            widths: ['*'],
            body: [[{
              text: `Aprovado ${format(new Date(person.aprovado_em), 'dd/MM/yyyy HH:mm')}`,
              alignment: 'center' as const,
              color: '#ffffff',
              bold: true,
              fontSize: 8,
              margin: [6, 3, 6, 3] as [number, number, number, number],
            }]],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            fillColor: () => GREEN,
          },
          margin: [4, 2, 4, 4] as [number, number, number, number],
        });
      } else {
        items.push({
          table: {
            widths: ['*'],
            body: [[{
              text: 'Pendente',
              alignment: 'center' as const,
              color: '#ffffff',
              bold: true,
              fontSize: 8,
              margin: [6, 3, 6, 3] as [number, number, number, number],
            }]],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            fillColor: () => MUTED,
          },
          margin: [4, 2, 4, 4] as [number, number, number, number],
        });
      }
    } else {
      items.push({ text: 'Pendente', alignment: 'center', color: MUTED, italics: true, margin: [0, 20, 0, 20] as [number, number, number, number] });
    }

    return {
      table: {
        widths: ['*'],
        body: [[{ stack: items, border: defaultBorders() }]],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => BORDER_COLOR,
        vLineColor: () => BORDER_COLOR,
      },
    };
  };

  content.push({
    columns: [
      { width: '50%', ...buildApprovalBlock('CONTRATADA', contratada) } as any,
      { width: '50%', ...buildApprovalBlock('CONTRATANTE', contratante) } as any,
    ],
    columnGap: 6,
  });

  // ── Styles ──
  const styles: StyleDictionary = {
    companyName: { fontSize: 14, bold: true },
    sectionHeader: { fontSize: 10, bold: true, fillColor: SECTION_BG, margin: [4, 2, 4, 2] as any },
    colHeader: { fontSize: 8, bold: true, fillColor: COL_HEADER_BG },
    labelCell: { fontSize: 8, color: MUTED },
    valueCell: { fontSize: 8 },
  };

  // ── Document definition ──
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [57, 43, 57, 43], // ~20mm sides, ~15mm top/bottom
    defaultStyle: {
      fontSize: 9,
      font: 'Roboto',
    },
    styles,
    content,
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `Relatório ${formattedDate}  n° ${rdoNumero}  •  ${isAprovado ? 'Aprovado' : 'Rascunho'}`,
          fontSize: 7,
          color: MUTED,
          margin: [57, 0, 0, 0],
        },
        {
          text: `Página ${currentPage} / ${pageCount}`,
          fontSize: 7,
          color: MUTED,
          alignment: 'right' as const,
          margin: [0, 0, 57, 0],
        },
      ],
      margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
  };

  // Generate and download
  const filename = `RDO_${rdoNumero}_${data.rdo.data}.pdf`;
  pdfMake.createPdf(docDefinition).download(filename);
}
