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
  };
  funcionarios: {
    nome: string;
    cargo: string | null;
    presente: boolean;
    horas: number | null;
    horario_entrada: string | null;
    horario_saida: string | null;
    horario_intervalo: string | null;
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
  headerBg: [26, 115, 232] as [number, number, number],       // #1a73e8
  headerText: [255, 255, 255] as [number, number, number],
  sectionBg: [55, 65, 81] as [number, number, number],        // gray-700
  sectionText: [255, 255, 255] as [number, number, number],
  lightBg: [243, 244, 246] as [number, number, number],       // gray-100
  border: [209, 213, 219] as [number, number, number],        // gray-300
  text: [31, 41, 55] as [number, number, number],             // gray-800
  mutedText: [107, 114, 128] as [number, number, number],     // gray-500
  greenBg: [220, 252, 231] as [number, number, number],
  greenText: [22, 101, 52] as [number, number, number],
  yellowBg: [254, 249, 195] as [number, number, number],
  yellowText: [133, 77, 14] as [number, number, number],
};

const climaLabels: Record<string, string> = {
  ensolarado: '☀ Ensolarado',
  nublado: '☁ Nublado',
  chuvoso: '🌧 Chuvoso',
  tempestade: '⛈ Tempestade',
};

const condicaoLabels: Record<string, string> = {
  praticavel: 'Praticável',
  impraticavel: 'Impraticável',
};

const statusLabels: Record<string, string> = {
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  nao_iniciado: 'Não Iniciado',
};

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

export async function generateRDOPdf(data: RDOPdfData): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const rdoDate = new Date(data.rdo.data + 'T00:00:00');
  const formattedDate = format(rdoDate, 'dd/MM/yyyy');
  const diaSemana = format(rdoDate, 'EEEE', { locale: ptBR });
  const rdoNumero = data.rdo.numero ? String(data.rdo.numero) : '—';
  const statusLabel = data.rdo.status === 'finalizado' ? 'Aprovado' : 'Rascunho';

  // =========== TOP BAR ===========
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, pageWidth, 12, 'F');
  doc.setTextColor(...COLORS.headerText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Relatório ${formattedDate}  n° ${rdoNumero}`, margin, 8);

  // Status badge
  if (data.rdo.status === 'finalizado') {
    doc.setFillColor(...COLORS.greenBg);
    doc.roundedRect(pageWidth - margin - 28, 3, 26, 6, 1, 1, 'F');
    doc.setTextColor(...COLORS.greenText);
    doc.setFontSize(7);
    doc.text(statusLabel, pageWidth - margin - 15, 7.5, { align: 'center' });
  } else {
    doc.setFillColor(...COLORS.yellowBg);
    doc.roundedRect(pageWidth - margin - 28, 3, 26, 6, 1, 1, 'F');
    doc.setTextColor(...COLORS.yellowText);
    doc.setFontSize(7);
    doc.text(statusLabel, pageWidth - margin - 15, 7.5, { align: 'center' });
  }

  y = 16;

  // =========== HEADER INFO BOX ===========
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, 22);

  // Left: Company name
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

  // Right: RDO info
  const rightCol = margin + contentWidth * 0.55;
  doc.setLineWidth(0.3);
  doc.line(rightCol - 4, y, rightCol - 4, y + 22);

  const infoLabels = ['Relatório n°', 'Data relatório', 'Dia da semana'];
  const infoValues = [rdoNumero, formattedDate, diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)];

  infoLabels.forEach((label, i) => {
    const rowY = y + 6 + i * 5.5;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mutedText);
    doc.text(label, rightCol, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(infoValues[i], rightCol + 35, rowY);
  });

  y += 26;

  // =========== SECTION: Dados da Obra ===========
  y = drawSectionHeader(doc, 'Relatório Diário de Obra (RDO)', margin, y, contentWidth);

  // Obra info - 2 columns
  const prazoContratual = data.obra.prazo_contratual_dias || 0;
  let prazoDecorrido = 0;
  let prazoVencer = 0;
  if (data.obra.data_inicio) {
    const inicio = new Date(data.obra.data_inicio + 'T00:00:00');
    prazoDecorrido = Math.max(0, differenceInCalendarDays(rdoDate, inicio));
    prazoVencer = Math.max(0, prazoContratual - prazoDecorrido);
  }

  const obraRows = [
    ['Obra:', data.obra.nome, 'Prazo contratual:', `${prazoContratual} dias`],
    ['Local:', data.obra.local || data.obra.endereco || '—', 'Prazo decorrido:', `${prazoDecorrido} dias`],
    ['Contratante:', data.obra.contratante || '—', 'Prazo a vencer:', `${prazoVencer} dias`],
  ];
  if (data.obra.contrato) {
    obraRows.push(['Contrato:', data.obra.contrato, '', '']);
  }

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

  // =========== SECTION: Horário e Clima ===========
  y = drawSectionHeader(doc, 'Horário de Trabalho / Condição Climática', margin, y, contentWidth);

  const horaEntrada = data.rdo.horario_entrada || '—';
  const horaSaida = data.rdo.horario_saida || '—';
  const intInicio = data.rdo.horario_intervalo_inicio || '—';
  const intFim = data.rdo.horario_intervalo_fim || '—';

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Horário', 'Horas', 'Período', 'Clima', 'Condição']],
    body: [
      [`Entrada: ${horaEntrada}`, '', 'Manhã', climaLabels[data.rdo.clima_manha] || data.rdo.clima_manha, condicaoLabels[data.rdo.condicao_manha] || data.rdo.condicao_manha],
      [`Saída: ${horaSaida}`, '', 'Tarde', climaLabels[data.rdo.clima_tarde] || data.rdo.clima_tarde, condicaoLabels[data.rdo.condicao_tarde] || data.rdo.condicao_tarde],
      [`Intervalo: ${intInicio} - ${intFim}`, '', '', '', ''],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: COLORS.text },
    headStyles: { fillColor: COLORS.sectionBg, textColor: COLORS.sectionText, fontSize: 7, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLORS.lightBg },
  });

  y = (doc as any).lastAutoTable.finalY + 2;

  // =========== SECTION: Mão de Obra ===========
  const presenteFuncs = data.funcionarios.filter((f) => f.presente);
  y = drawSectionHeader(doc, `Mão de Obra (${presenteFuncs.length})`, margin, y, contentWidth);

  if (presenteFuncs.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['N°', 'Nome', 'Função', 'Entrada', 'Saída', 'Intervalo', 'Horas']],
      body: presenteFuncs.map((f, i) => [
        String(i + 1),
        f.nome,
        f.cargo || '—',
        f.horario_entrada || '—',
        f.horario_saida || '—',
        f.horario_intervalo || '—',
        f.horas != null ? String(f.horas) + 'h' : '—',
      ]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.sectionBg, textColor: COLORS.sectionText, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.lightBg },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 2;
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.mutedText);
    doc.text('Nenhum funcionário registrado.', margin + 4, y + 5);
    y += 10;
  }

  // Page break check
  if (y > 240) { doc.addPage(); y = margin; }

  // =========== SECTION: Equipamentos ===========
  const selEquips = data.equipamentos;
  y = drawSectionHeader(doc, `Equipamentos (${selEquips.length})`, margin, y, contentWidth);

  if (selEquips.length > 0) {
    // Grid layout: 3 columns (nome | qtd | status)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Equipamento', 'Qtd', 'Horas Uso', 'Status']],
      body: selEquips.map((e) => [
        e.nome,
        String(e.quantidade),
        e.horas_uso != null ? String(e.horas_uso) + 'h' : '—',
        e.operacional ? 'Operacional' : 'Inoperante',
      ]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.sectionBg, textColor: COLORS.sectionText, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.lightBg },
    });
    y = (doc as any).lastAutoTable.finalY + 2;
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.mutedText);
    doc.text('Nenhum equipamento registrado.', margin + 4, y + 5);
    y += 10;
  }

  if (y > 240) { doc.addPage(); y = margin; }

  // =========== SECTION: Atividades ===========
  y = drawSectionHeader(doc, `Atividades (${data.atividades.length})`, margin, y, contentWidth);

  if (data.atividades.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['N°', 'Descrição', 'Quantidade', 'Unidade', 'Status']],
      body: data.atividades.map((a, i) => [
        String(i + 1),
        a.descricao,
        a.quantidade != null ? String(a.quantidade) : '—',
        a.unidade || '—',
        statusLabels[a.status] || a.status,
      ]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.sectionBg, textColor: COLORS.sectionText, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.lightBg },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 80 },
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
    if (y > 250) { doc.addPage(); y = margin; }
    y = drawSectionHeader(doc, 'Observações', margin, y, contentWidth);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    const lines = doc.splitTextToSize(data.rdo.observacoes, contentWidth - 8);
    doc.text(lines, margin + 4, y + 4);
    y += lines.length * 4 + 6;
  }

  // =========== SECTION: Fotos ===========
  if (data.fotos.length > 0) {
    if (y > 200) { doc.addPage(); y = margin; }
    y = drawSectionHeader(doc, `Registro Fotográfico (${data.fotos.length})`, margin, y, contentWidth);

    const colWidth = (contentWidth - 4) / 2;
    const imgHeight = 50;

    for (let i = 0; i < data.fotos.length; i += 2) {
      if (y + imgHeight + 12 > 285) { doc.addPage(); y = margin; }

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
            doc.text('Imagem indisponível', x + colWidth / 2, y + imgHeight / 2, { align: 'center' });
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

  // =========== SECTION: Assinaturas ===========
  if (y > 240) { doc.addPage(); y = margin; }
  y = drawSectionHeader(doc, 'Aprovações / Assinaturas', margin, y, contentWidth);

  const contratada = data.aprovacoes.find((a) => a.tipo === 'contratada');
  const contratante = data.aprovacoes.find((a) => a.tipo === 'contratante');
  const halfW = (contentWidth - 4) / 2;

  // Contratada box
  doc.setDrawColor(...COLORS.border);
  doc.rect(margin, y, halfW, 30);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('CONTRATADA', margin + halfW / 2, y + 5, { align: 'center' });

  if (contratada) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(contratada.nome, margin + 4, y + 12);
    if (contratada.cargo) doc.text(`Cargo: ${contratada.cargo}`, margin + 4, y + 16);
    if (contratada.matricula) doc.text(`Matrícula: ${contratada.matricula}`, margin + 4, y + 20);
    if (contratada.aprovado_em) {
      doc.setTextColor(...COLORS.greenText);
      doc.text(`Aprovado: ${format(new Date(contratada.aprovado_em), 'dd/MM/yyyy HH:mm')}`, margin + 4, y + 26);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.mutedText);
    doc.text('Pendente', margin + halfW / 2, y + 18, { align: 'center' });
  }

  // Contratante box
  const rightX = margin + halfW + 4;
  doc.setDrawColor(...COLORS.border);
  doc.rect(rightX, y, halfW, 30);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('CONTRATANTE', rightX + halfW / 2, y + 5, { align: 'center' });

  if (contratante) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.text);
    doc.text(contratante.nome, rightX + 4, y + 12);
    if (contratante.cargo) doc.text(`Cargo: ${contratante.cargo}`, rightX + 4, y + 16);
    if (contratante.email) doc.text(`Email: ${contratante.email}`, rightX + 4, y + 20);
    if (contratante.aprovado_em) {
      doc.setTextColor(...COLORS.greenText);
      doc.text(`Aprovado: ${format(new Date(contratante.aprovado_em), 'dd/MM/yyyy HH:mm')}`, rightX + 4, y + 26);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.mutedText);
    doc.text('Pendente', rightX + halfW / 2, y + 18, { align: 'center' });
  }

  // =========== FOOTER on each page ===========
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.mutedText);
    doc.text(`${data.empresa.nome} — RDO n° ${rdoNumero} — ${formattedDate}`, margin, 293);
    doc.text(`Página ${p}/${pageCount}`, pageWidth - margin, 293, { align: 'right' });
  }

  // Save
  const filename = `RDO_${rdoNumero}_${data.rdo.data}.pdf`;
  doc.save(filename);
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
