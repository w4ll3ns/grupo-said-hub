import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const COLORS = {
  headerBg: [26, 115, 232] as [number, number, number],
  headerText: [255, 255, 255] as [number, number, number],
  sectionBg: [55, 65, 81] as [number, number, number],
  sectionText: [255, 255, 255] as [number, number, number],
  lightBg: [243, 244, 246] as [number, number, number],
  border: [209, 213, 219] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  mutedText: [107, 114, 128] as [number, number, number],
  greenBg: [220, 252, 231] as [number, number, number],
  greenText: [22, 101, 52] as [number, number, number],
  yellowBg: [254, 249, 195] as [number, number, number],
  yellowText: [133, 77, 14] as [number, number, number],
};

// No emojis — jsPDF/helvetica doesn't support them
const climaLabels: Record<string, string> = {
  ensolarado: 'Claro',
  nublado: 'Nublado',
  chuvoso: 'Chuvoso',
  tempestade: 'Tempestade',
};

const condicaoLabels: Record<string, string> = {
  praticavel: 'Praticavel',
  impraticavel: 'Impraticavel',
};

const statusLabels: Record<string, string> = {
  em_andamento: 'Em Andamento',
  concluido: 'Concluido',
  nao_iniciado: 'Nao Iniciado',
};

/** Strip seconds: "07:00:00" → "07:00" */
function formatTime(t: string | null): string {
  if (!t) return '--';
  const parts = t.split(':');
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
}

/** Calculate worked hours from entry/exit/interval */
function calcWorkedHours(
  entrada: string | null,
  saida: string | null,
  intInicio: string | null,
  intFim: string | null
): string {
  if (!entrada || !saida) return '--';
  const toMin = (t: string) => {
    const p = t.split(':').map(Number);
    return p[0] * 60 + p[1];
  };
  let total = toMin(saida) - toMin(entrada);
  if (intInicio && intFim) {
    total -= toMin(intFim) - toMin(intInicio);
  }
  if (total <= 0) return '--';
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

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, width: number): number {
  doc.setFillColor(...COLORS.sectionBg);
  doc.rect(x, y, width, 7, 'F');
  doc.setTextColor(...COLORS.sectionText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x + 3, y + 5);
  return y + 9;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, margin: number): number {
  if (y + needed > 285) {
    doc.addPage();
    return margin;
  }
  return y;
}

export async function generateRDOPdf(data: RDOPdfData): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const rdoDate = new Date(data.rdo.data + 'T00:00:00');
  const formattedDate = format(rdoDate, 'dd/MM/yyyy');
  const diaSemana = format(rdoDate, 'EEEE', { locale: ptBR });
  const rdoNumero = data.rdo.numero ? String(data.rdo.numero) : '--';
  const statusLabel = data.rdo.status === 'finalizado' ? 'Aprovado' : 'Rascunho';

  // =========== TOP BAR ===========
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, pageWidth, 12, 'F');
  doc.setTextColor(...COLORS.headerText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Relatorio ${formattedDate}  n. ${rdoNumero}`, margin, 8);

  // Status badge
  const badgeBg = data.rdo.status === 'finalizado' ? COLORS.greenBg : COLORS.yellowBg;
  const badgeText = data.rdo.status === 'finalizado' ? COLORS.greenText : COLORS.yellowText;
  doc.setFillColor(...badgeBg);
  doc.roundedRect(pageWidth - margin - 28, 3, 26, 6, 1, 1, 'F');
  doc.setTextColor(...badgeText);
  doc.setFontSize(7);
  doc.text(statusLabel, pageWidth - margin - 15, 7.5, { align: 'center' });

  y = 16;

  // =========== HEADER INFO BOX ===========
  // Now includes Contrato in right panel
  const headerH = 24;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, headerH);

  // Left: Company name + CNPJ
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(data.empresa.nome, margin + 4, y + 8);
  if (data.empresa.cnpj) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mutedText);
    doc.text(`CNPJ: ${data.empresa.cnpj}`, margin + 4, y + 13);
  }

  // Right panel: Relatório n°, Data, Dia, Contrato
  const rightCol = margin + contentWidth * 0.52;
  doc.setLineWidth(0.3);
  doc.line(rightCol - 4, y, rightCol - 4, y + headerH);

  const infoLabels = ['Relatorio n.', 'Data relatorio', 'Dia da semana', 'Contrato'];
  const infoValues = [
    rdoNumero,
    formattedDate,
    diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
    data.obra.contrato || '--',
  ];

  infoLabels.forEach((label, i) => {
    const rowY = y + 5.5 + i * 4.8;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mutedText);
    doc.text(label, rightCol, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(infoValues[i], rightCol + 32, rowY);
  });

  y += headerH + 4;

  // =========== SECTION: Dados da Obra ===========
  y = drawSectionHeader(doc, 'Relatorio Diario de Obra (RDO)', margin, y, contentWidth);

  const prazoContratual = data.obra.prazo_contratual_dias;
  let prazoDecorrido: number | null = null;
  let prazoVencer: number | null = null;
  if (prazoContratual && data.obra.data_inicio) {
    const inicio = new Date(data.obra.data_inicio + 'T00:00:00');
    prazoDecorrido = Math.max(0, differenceInCalendarDays(rdoDate, inicio));
    prazoVencer = Math.max(0, prazoContratual - prazoDecorrido);
  }

  const fmtPrazo = (v: number | null) => (v != null ? `${v} dias` : '--');

  const obraRows = [
    ['Obra:', data.obra.nome, 'Prazo contratual:', fmtPrazo(prazoContratual)],
    ['Local:', data.obra.local || data.obra.endereco || '--', 'Prazo decorrido:', fmtPrazo(prazoDecorrido)],
    ['Contratante:', data.obra.contratante || '--', 'Prazo a vencer:', fmtPrazo(prazoVencer)],
    ['Responsavel:', data.obra.responsavel || '--', '', ''],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5, textColor: COLORS.text },
    columnStyles: {
      0: { fontStyle: 'normal', textColor: COLORS.mutedText, cellWidth: 28 },
      1: { fontStyle: 'bold', cellWidth: contentWidth * 0.38 - 28 },
      2: { fontStyle: 'normal', textColor: COLORS.mutedText, cellWidth: 32 },
      3: { fontStyle: 'bold' },
    },
    body: obraRows,
  });

  y = (doc as any).lastAutoTable.finalY + 2;

  // =========== SECTION: Horário e Clima (redesigned) ===========
  y = drawSectionHeader(doc, 'Horario de Trabalho / Condicao Climatica', margin, y, contentWidth);

  const horaEntrada = formatTime(data.rdo.horario_entrada);
  const horaSaida = formatTime(data.rdo.horario_saida);
  const intInicio = formatTime(data.rdo.horario_intervalo_inicio);
  const intFim = formatTime(data.rdo.horario_intervalo_fim);
  const horasTrabalhadas = calcWorkedHours(
    data.rdo.horario_entrada,
    data.rdo.horario_saida,
    data.rdo.horario_intervalo_inicio,
    data.rdo.horario_intervalo_fim
  );

  // 3-block layout: Left (horários) | Center (horas) | Right (clima)
  const blockH = 22;
  const leftW = contentWidth * 0.32;
  const centerW = contentWidth * 0.2;
  const rightW = contentWidth - leftW - centerW;

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, leftW, blockH);
  doc.rect(margin + leftW, y, centerW, blockH);
  doc.rect(margin + leftW + centerW, y, rightW, blockH);

  // Left block: Entrada/Saída/Intervalo
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mutedText);
  doc.text('Entrada:', margin + 2, y + 6);
  doc.text('Saida:', margin + 2, y + 11);
  doc.text('Intervalo:', margin + 2, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(horaEntrada, margin + 22, y + 6);
  doc.text(horaSaida, margin + 22, y + 11);
  doc.text(`${intInicio} - ${intFim}`, margin + 22, y + 16);

  // Center block: Horas trabalhadas
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mutedText);
  doc.text('Horas Trab.', margin + leftW + centerW / 2, y + 5, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(horasTrabalhadas, margin + leftW + centerW / 2, y + 15, { align: 'center' });

  // Right block: Clima table
  const climaX = margin + leftW + centerW;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.mutedText);
  doc.text('Periodo', climaX + 2, y + 5);
  doc.text('Clima', climaX + 18, y + 5);
  doc.text('Condicao', climaX + rightW - 18, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(7);
  // Manhã
  doc.text('Manha', climaX + 2, y + 11);
  doc.text(climaLabels[data.rdo.clima_manha] || data.rdo.clima_manha, climaX + 18, y + 11);
  doc.text(condicaoLabels[data.rdo.condicao_manha] || data.rdo.condicao_manha, climaX + rightW - 18, y + 11);
  // Tarde
  doc.text('Tarde', climaX + 2, y + 17);
  doc.text(climaLabels[data.rdo.clima_tarde] || data.rdo.clima_tarde, climaX + 18, y + 17);
  doc.text(condicaoLabels[data.rdo.condicao_tarde] || data.rdo.condicao_tarde, climaX + rightW - 18, y + 17);

  y += blockH + 4;

  // =========== SECTION: Mão de Obra ===========
  const presenteFuncs = data.funcionarios.filter((f) => f.presente);
  y = checkPageBreak(doc, y, 20, margin);
  y = drawSectionHeader(doc, `Mao de Obra (${presenteFuncs.length})`, margin, y, contentWidth);

  if (presenteFuncs.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['N.', 'Nome', 'Funcao', 'Entrada / Saida', 'Intervalo', 'Horas', 'Local']],
      body: presenteFuncs.map((f, i) => [
        String(i + 1),
        f.nome,
        f.cargo || '--',
        `${formatTime(f.horario_entrada)} - ${formatTime(f.horario_saida)}`,
        formatTime(f.horario_intervalo),
        f.horas != null ? String(f.horas) + 'h' : '--',
        f.local_trabalho || '',
      ]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.sectionBg, textColor: COLORS.sectionText, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.lightBg },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 38 },
        2: { cellWidth: 25 },
        3: { cellWidth: 28 },
        6: { fontStyle: 'italic', textColor: COLORS.mutedText },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 2;
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.mutedText);
    doc.text('Nenhum funcionario registrado.', margin + 4, y + 5);
    y += 10;
  }

  // =========== SECTION: Equipamentos (grid layout) ===========
  y = checkPageBreak(doc, y, 20, margin);
  const selEquips = data.equipamentos;
  y = drawSectionHeader(doc, `Equipamentos (${selEquips.length})`, margin, y, contentWidth);

  if (selEquips.length > 0) {
    const gridCols = 6;
    const cellW = contentWidth / gridCols;
    const cellH = 12;

    for (let i = 0; i < selEquips.length; i += gridCols) {
      y = checkPageBreak(doc, y, cellH + 2, margin);
      const rowEquips = selEquips.slice(i, i + gridCols);

      for (let j = 0; j < rowEquips.length; j++) {
        const e = rowEquips[j];
        const cx = margin + j * cellW;

        // Cell border
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.2);
        doc.rect(cx, y, cellW, cellH);

        // Name (top)
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.text);
        const nameLines = doc.splitTextToSize(e.nome, cellW - 3);
        doc.text(nameLines[0] || '', cx + 1.5, y + 4);

        // Quantity (bottom)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.mutedText);
        doc.text(String(e.quantidade), cx + cellW / 2, y + 10, { align: 'center' });
      }

      // Fill empty cells in last row
      for (let j = rowEquips.length; j < gridCols; j++) {
        const cx = margin + j * cellW;
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.2);
        doc.rect(cx, y, cellW, cellH);
      }

      y += cellH;
    }
    y += 2;
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.mutedText);
    doc.text('Nenhum equipamento registrado.', margin + 4, y + 5);
    y += 10;
  }

  // =========== SECTION: Atividades (simplified: Descrição + Status) ===========
  y = checkPageBreak(doc, y, 20, margin);
  y = drawSectionHeader(doc, `Atividades (${data.atividades.length})`, margin, y, contentWidth);

  if (data.atividades.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Descricao', 'Status']],
      body: data.atividades.map((a) => [
        a.descricao,
        statusLabels[a.status] || a.status,
      ]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.sectionBg, textColor: COLORS.sectionText, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.lightBg },
      columnStyles: {
        0: { cellWidth: contentWidth - 30 },
        1: { cellWidth: 30, halign: 'center' },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 2;
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.mutedText);
    doc.text('Nenhuma atividade registrada.', margin + 4, y + 5);
    y += 10;
  }

  // =========== SECTION: Observações ===========
  if (data.rdo.observacoes) {
    y = checkPageBreak(doc, y, 20, margin);
    y = drawSectionHeader(doc, 'Observacoes', margin, y, contentWidth);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    const lines = doc.splitTextToSize(data.rdo.observacoes, contentWidth - 8);
    doc.text(lines, margin + 4, y + 4);
    y += lines.length * 4 + 6;
  }

  // =========== SECTION: Fotos ===========
  if (data.fotos.length > 0) {
    y = checkPageBreak(doc, y, 60, margin);
    y = drawSectionHeader(doc, `Registro Fotografico (${data.fotos.length})`, margin, y, contentWidth);

    const colWidth = (contentWidth - 4) / 2;
    const imgHeight = 50;

    for (let i = 0; i < data.fotos.length; i += 2) {
      y = checkPageBreak(doc, y, imgHeight + 12, margin);

      for (let j = 0; j < 2 && i + j < data.fotos.length; j++) {
        const foto = data.fotos[i + j];
        const x = margin + j * (colWidth + 4);
        const imgData = await loadImageAsBase64(foto.url);
        if (imgData) {
          try {
            doc.addImage(imgData, 'JPEG', x, y, colWidth, imgHeight);
          } catch {
            doc.setFillColor(...COLORS.lightBg);
            doc.rect(x, y, colWidth, imgHeight, 'F');
            doc.setFontSize(7);
            doc.setTextColor(...COLORS.mutedText);
            doc.text('Imagem indisponivel', x + colWidth / 2, y + imgHeight / 2, { align: 'center' });
          }
        }
        if (foto.legenda) {
          doc.setFontSize(6);
          doc.setTextColor(...COLORS.mutedText);
          doc.text(foto.legenda, x + 1, y + imgHeight + 3);
        }
      }
      y += imgHeight + 8;
    }
  }

  // =========== SECTION: Assinaturas (redesigned) ===========
  y = checkPageBreak(doc, y, 50, margin);
  y = drawSectionHeader(doc, 'Aprovacoes / Assinaturas', margin, y, contentWidth);

  const contratada = data.aprovacoes.find((a) => a.tipo === 'contratada');
  const contratante = data.aprovacoes.find((a) => a.tipo === 'contratante');
  const halfW = (contentWidth - 4) / 2;
  const sigBoxH = 42;

  const drawSignatureBox = (
    label: string,
    person: typeof contratada | undefined,
    x: number
  ) => {
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.rect(x, y, halfW, sigBoxH);

    // Title
    doc.setFillColor(...COLORS.lightBg);
    doc.rect(x, y, halfW, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(label, x + halfW / 2, y + 5, { align: 'center' });

    if (person) {
      // Name (large bold)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text(person.nome, x + 4, y + 14);

      // Cargo
      if (person.cargo) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.mutedText);
        doc.text(`Cargo: ${person.cargo}`, x + 4, y + 19);
      }

      // Matrícula
      if (person.matricula) {
        doc.setFontSize(7);
        doc.text(`Matricula: ${person.matricula}`, x + 4, y + 24);
      }

      // Email
      if (person.email) {
        doc.setFontSize(7);
        doc.text(`Email: ${person.email}`, x + 4, y + 29);
      }

      // Approval badge
      if (person.aprovado_em) {
        const badgeY = y + sigBoxH - 10;
        doc.setFillColor(...COLORS.greenBg);
        doc.roundedRect(x + 3, badgeY, halfW - 6, 8, 1, 1, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.greenText);
        doc.text(
          `Aprovado em ${format(new Date(person.aprovado_em), 'dd/MM/yyyy HH:mm')}`,
          x + halfW / 2,
          badgeY + 5.5,
          { align: 'center' }
        );
      } else {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...COLORS.yellowText);
        doc.text('Pendente', x + halfW / 2, y + sigBoxH - 6, { align: 'center' });
      }
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.mutedText);
      doc.text('Pendente', x + halfW / 2, y + sigBoxH / 2 + 4, { align: 'center' });
    }
  };

  drawSignatureBox('CONTRATADA', contratada, margin);
  drawSignatureBox('CONTRATANTE', contratante, margin + halfW + 4);

  // =========== FOOTER on each page ===========
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.mutedText);
    doc.text(`${data.empresa.nome} -- RDO n. ${rdoNumero} -- ${formattedDate}`, margin, 293);
    doc.text(`Pagina ${p}/${pageCount}`, pageWidth - margin, 293, { align: 'right' });
  }

  // Save
  const filename = `RDO_${rdoNumero}_${data.rdo.data}.pdf`;
  doc.save(filename);
}
