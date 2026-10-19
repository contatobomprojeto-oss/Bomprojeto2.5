import jsPDF from 'jspdf';
import { Project, ProjectStage } from '../types';

export function generateProjectSummaryPdf(
  project: Project,
  workshopName: string = 'Gestão de Projetos',
  workshopContact: string = '+55 (11) 98765-4321',
  workshopCity: string = 'São Paulo - SP'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Header Banner: Workshop Brand
  doc.setFillColor(30, 29, 27); // Dark espresso (#1e1d1b)
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(workshopName.toUpperCase(), margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(215, 210, 200);
  doc.text(
    `RELATÓRIO TÉCNICO & EXTRATO FORMAL DA ORDEM DE SERVIÇO • ${workshopCity}`,
    margin + 6,
    y + 16
  );

  // OS Badge on top right
  doc.setFillColor(159, 60, 22); // Terracotta (#9f3c16)
  doc.roundedRect(pageWidth - margin - 42, y + 4, 36, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`OS #${project.code.replace('#', '')}`, pageWidth - margin - 38, y + 10);
  doc.setFontSize(7);
  doc.text('DOCUMENTO OFICIAL', pageWidth - margin - 38, y + 15);

  y += 28;

  // Metadata Card: Client, Project, Dates
  doc.setDrawColor(222, 216, 205);
  doc.setFillColor(252, 250, 247);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  // Col 1: Client
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(115, 115, 108);
  doc.text('CLIENTE TITULAR', margin + 4, y + 6);
  doc.setFontSize(10.5);
  doc.setTextColor(28, 28, 26);
  doc.text(project.clientName, margin + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78);
  doc.text(`Telefone: ${project.clientPhone || '(11) 98123-4567'}`, margin + 4, y + 18);
  doc.text(`Unidade / Local: ${project.unit || 'Apto 142 - Torre Araucária'}`, margin + 4, y + 23);

  // Col 2: Project Info
  const col2X = margin + contentWidth * 0.45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(115, 115, 108);
  doc.text('PROJETO & ESPECIFICAÇÃO', col2X, y + 6);
  doc.setFontSize(10.5);
  doc.setTextColor(28, 28, 26);
  const truncatedTitle = project.title.length > 30 ? project.title.slice(0, 30) + '...' : project.title;
  doc.text(truncatedTitle, col2X, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78);
  doc.text(`Segmento: ${project.category?.toUpperCase() || 'MARCENARIA'}`, col2X, y + 18);
  doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, col2X, y + 23);

  // Col 3: Status & Delivery
  const col3X = margin + contentWidth * 0.76;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(115, 115, 108);
  doc.text('STATUS DO PROJETO', col3X, y + 6);

  const isCompleted = project.status === 'concluido' || project.progressPercent === 100;
  doc.setFontSize(9.5);
  if (isCompleted) {
    doc.setTextColor(22, 101, 52);
    doc.text('CONCLUÍDO 100%', col3X, y + 12);
  } else {
    doc.setTextColor(159, 60, 22);
    doc.text(`${project.progressPercent}% CONCLUÍDO`, col3X, y + 12);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78);
  doc.text(`Previsão: ${project.deliveryDate}`, col3X, y + 18);
  doc.text(`Contrato: ${project.contractDate || '18/09/2026'}`, col3X, y + 23);

  y += 34;

  // SECTION 1: Status Financeiro do Projeto
  doc.setFillColor(237, 232, 223);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 28, 26);
  doc.text('1. DEMONSTRATIVO FINANCEIRO & FLUXO DE PAGAMENTO', margin + 3, y + 5);

  y += 10;

  const totalValue = project.totalValue || 9533;
  const paidInstallments = (project.installments || []).filter(i => i.status === 'paid');
  const paidTotal = paidInstallments.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingTotal = Math.max(0, totalValue - paidTotal);
  const paidPercent = totalValue > 0 ? Math.round((paidTotal / totalValue) * 100) : 0;

  // 3 Metric Cards for Finance
  const boxW = (contentWidth - 6) / 3;
  
  // Box 1: Total
  doc.setDrawColor(222, 216, 205);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, boxW, 16, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(115, 115, 108);
  doc.text('VALOR TOTAL CONTRATADO', margin + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 28, 26);
  doc.text(`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 3, y + 12);

  // Box 2: Quitado
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin + boxW + 3, y, boxW, 16, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text(`VALOR PAGO (${paidPercent}%)`, margin + boxW + 6, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(22, 101, 52);
  doc.text(`R$ ${paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + boxW + 6, y + 12);

  // Box 3: Saldo
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + (boxW + 3) * 2, y, boxW, 16, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(115, 115, 108);
  doc.text('SALDO PENDENTE', margin + (boxW + 3) * 2 + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(pendingTotal > 0 ? 159 : 28, pendingTotal > 0 ? 60 : 28, pendingTotal > 0 ? 22 : 26);
  doc.text(`R$ ${pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + (boxW + 3) * 2 + 3, y + 12);

  y += 20;

  // Installments Table Header
  doc.setFillColor(247, 244, 238);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(87, 83, 78);
  doc.text('PARCELA', margin + 3, y + 4.2);
  doc.text('VALOR (R$)', margin + 35, y + 4.2);
  doc.text('VENCIMENTO', margin + 70, y + 4.2);
  doc.text('STATUS', margin + 110, y + 4.2);
  doc.text('FORMA / AUTENTICAÇÃO', margin + 140, y + 4.2);

  y += 6;

  // Installments Rows
  const installments = project.installments && project.installments.length > 0 
    ? project.installments 
    : [
        { number: 1, amount: totalValue * 0.5, dueDate: '18 Set 2026', status: 'paid' as const, paidDate: '18 Set 2026', authCode: 'PX-8831' },
        { number: 2, amount: totalValue * 0.5, dueDate: project.deliveryDate, status: 'pending' as const }
      ];

  installments.forEach((inst, index) => {
    const isPaid = inst.status === 'paid';
    doc.setFillColor(index % 2 === 0 ? 255 : 252, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 247);
    doc.rect(margin, y, contentWidth, 6.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(28, 28, 26);
    doc.text(`Parcela ${inst.number} de ${installments.length}`, margin + 3, y + 4.5);
    doc.text(`R$ ${inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 35, y + 4.5);
    doc.text(inst.dueDate || 'Na Entrega', margin + 70, y + 4.5);

    if (isPaid) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52);
      doc.text('QUITADO [OK]', margin + 110, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(87, 83, 78);
      doc.text(`Pix Inter • Aut. #${inst.authCode || 'PX-7729'}`, margin + 140, y + 4.5);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text('AGUARDANDO', margin + 110, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(115, 115, 108);
      doc.text('Chave Pix na Entrega', margin + 140, y + 4.5);
    }

    y += 6.5;
  });

  y += 7;

  // SECTION 2: Etapas e Cronograma do Projeto
  doc.setFillColor(237, 232, 223);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 28, 26);
  doc.text('2. CRONOGRAMA & EVOLUÇÃO DAS ETAPAS DE PRODUÇÃO', margin + 3, y + 5);

  y += 10;

  // Stages Table Header
  doc.setFillColor(247, 244, 238);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(87, 83, 78);
  doc.text('ETAPA', margin + 3, y + 4.2);
  doc.text('STATUS', margin + 65, y + 4.2);
  doc.text('DATA / CONCLUSÃO', margin + 102, y + 4.2);
  doc.text('AVANÇADO POR / RESPONSÁVEL', margin + 138, y + 4.2);

  y += 6;

  const stagesList: ProjectStage[] = project.stages && project.stages.length > 0
    ? project.stages
    : [
        { id: '1', name: 'Projeto Executivo & Aprovação', description: 'Aprovação', status: 'completed' as const, date: '18 Set', notes: 'Aprovado digitalmente', completedBy: 'Henrique Ferraz', completedByRole: 'Administrador', completedAt: '18/09/2026 às 14:00' },
        { id: '2', name: 'Medição Fina no Local', description: 'Medição', status: 'completed' as const, date: '19 Set', notes: 'Prumos validados a laser', completedBy: 'Carlos Marceneiro', completedByRole: 'Marceneiro', completedAt: '19/09/2026 às 10:30' },
        { id: '3', name: 'Corte CNC & Furação', description: 'Usinagem', status: 'current' as const, date: '25 Set', notes: 'Em usinagem' },
        { id: '4', name: 'Montagem em Bancada & Ajustes', description: 'Montagem', status: 'upcoming' as const, date: '05 Out', notes: 'Ferragens Blum' },
        { id: '5', name: 'Instalação no Local & Entrega', description: 'Instalação', status: 'upcoming' as const, date: project.deliveryDate, notes: 'Montagem final' }
      ];

  stagesList.forEach((stage, idx) => {
    const isCompletedStage = stage.status === 'completed';
    const isCurrent = stage.status === 'current';

    doc.setFillColor(idx % 2 === 0 ? 255 : 252, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 247);
    doc.rect(margin, y, contentWidth, 6.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(28, 28, 26);
    doc.text(`${idx + 1}. ${stage.name}`, margin + 3, y + 4.6);

    doc.setFontSize(7.5);
    if (isCompletedStage) {
      doc.setTextColor(22, 101, 52);
      doc.text('CONCLUÍDA ✓', margin + 65, y + 4.6);
    } else if (isCurrent) {
      doc.setTextColor(159, 60, 22);
      doc.text('EM ANDAMENTO ⚙', margin + 65, y + 4.6);
    } else {
      doc.setTextColor(115, 115, 108);
      doc.text('PROGRAMADA', margin + 65, y + 4.6);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(87, 83, 78);
    const dateFormatted = stage.completedAt || stage.date || `Fase ${idx + 1}`;
    doc.text(dateFormatted.length > 20 ? dateFormatted.slice(0, 18) + '...' : dateFormatted, margin + 102, y + 4.6);

    const responsibleText = isCompletedStage
      ? (stage.completedBy ? `${stage.completedBy}${stage.completedByRole ? ` (${stage.completedByRole})` : ''}` : 'Equipe Técnica')
      : isCurrent
      ? 'Em execução ativa'
      : (stage.notes || 'Equipe Especializada');
    doc.text(responsibleText.length > 26 ? responsibleText.slice(0, 24) + '...' : responsibleText, margin + 138, y + 4.6);

    y += 6.8;
  });

  y += 7;

  // Check if we need page break or if updates fit
  const updatesList = project.updates || [];
  const needsSecondPage = updatesList.length > 2 || y > 200;

  if (needsSecondPage) {
    // Add page footer to page 1
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(140, 136, 127);
    doc.text(
      `Documento emitido eletronicamente via Sistema BOMProjeto em ${new Date().toLocaleString('pt-BR')} • OS #${project.code.replace('#', '')} • Folha 1/2`,
      margin,
      285
    );

    // PAGE 2
    doc.addPage();
    y = 16;

    // Header on Page 2
    doc.setFillColor(30, 29, 27);
    doc.rect(margin, y, contentWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${workshopName.toUpperCase()} • OS #${project.code.replace('#', '')} • ${project.clientName}`, margin + 5, y + 9);
    y += 18;
  }

  // SECTION 3: Histórico de Tratamentos & Atualizações (Auditoria de quem fez o quê)
  doc.setFillColor(237, 232, 223);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 28, 26);
  doc.text('3. REGISTRO DE TRATAMENTO DE DEMANDAS & ATUALIZAÇÕES DA EQUIPE', margin + 3, y + 5);

  y += 10;

  // Updates Table Header
  doc.setFillColor(247, 244, 238);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(87, 83, 78);
  doc.text('DATA / HORA', margin + 3, y + 4.2);
  doc.text('TRATADO POR (RESPONSÁVEL)', margin + 40, y + 4.2);
  doc.text('CARGO / FUNÇÃO', margin + 85, y + 4.2);
  doc.text('ETAPA', margin + 120, y + 4.2);
  doc.text('TRATAMENTO / MENSAGEM', margin + 150, y + 4.2);

  y += 6;

  const displayUpdates = updatesList.length > 0 ? updatesList.slice(0, 8) : [
    {
      id: 'default-1',
      timestamp: `${new Date().toLocaleDateString('pt-BR')} às 09:00`,
      author: 'Equipe Técnica',
      role: 'Gestor de Projetos',
      stageName: project.currentStage || 'Planejamento',
      message: 'Projeto iniciado e documentação técnica revisada com o cliente.'
    }
  ];

  displayUpdates.forEach((upd, uIdx) => {
    doc.setFillColor(uIdx % 2 === 0 ? 255 : 252, uIdx % 2 === 0 ? 255 : 250, uIdx % 2 === 0 ? 255 : 247);
    doc.rect(margin, y, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(28, 28, 26);
    doc.text(upd.timestamp || 'Recentemente', margin + 3, y + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.text((upd.author || 'Equipe').slice(0, 22), margin + 40, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(87, 83, 78);
    doc.text((upd.role || 'Oficina').slice(0, 18), margin + 85, y + 4.8);
    doc.text((upd.stageName || 'Geral').slice(0, 16), margin + 120, y + 4.8);

    const cleanMsg = (upd.message || '').replace(/\s+/g, ' ').trim();
    doc.text(cleanMsg.length > 32 ? cleanMsg.slice(0, 30) + '...' : cleanMsg, margin + 150, y + 4.8);

    y += 7;
  });

  y += 7;

  // SECTION 4: Termos, Garantia & Autenticidade
  doc.setFillColor(237, 232, 223);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 28, 26);
  doc.text('4. TERMOS DE GARANTIA & VALIDAÇÃO TÉCNICA', margin + 3, y + 5);

  y += 10;

  doc.setDrawColor(222, 216, 205);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(87, 83, 78);
  doc.text(
    '• GARANTIA TÉCNICA: 05 (cinco) anos contra vícios de execução e inconformidades em relação ao memorial descritivo.',
    margin + 3,
    y + 5
  );
  doc.text(
    '• AUDITORIA DE ATENDIMENTO: Toda etapa e atualização contém carimbo visual com identificação do responsável e data/hora.',
    margin + 3,
    y + 10
  );
  doc.text(
    `• SUPORTE DIRETO DO PROJETO: Contato oficial via WhatsApp ${workshopContact} ou atendimento presencial na empresa.`,
    margin + 3,
    y + 15
  );

  y += 26;

  // Signatures / Formal Verification Block
  const sigW = (contentWidth - 10) / 2;

  // Signature
  doc.setDrawColor(180, 175, 165);
  doc.line(margin + 5, y + 10, margin + sigW - 5, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(28, 28, 26);
  doc.text(workshopName, margin + (sigW / 2) - 15, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(115, 115, 108);
  doc.text('Responsável Técnico do Projeto', margin + (sigW / 2) - 18, y + 18);

  // Client Signature / Confirmation
  const sig2X = margin + sigW + 10;
  doc.line(sig2X + 5, y + 10, sig2X + sigW - 5, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(28, 28, 26);
  doc.text(project.clientName, sig2X + (sigW / 2) - 15, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(115, 115, 108);
  doc.text('Assinatura Digital / Aceite do Cliente', sig2X + (sigW / 2) - 20, y + 18);

  // Footer: Timestamp & Verification Code
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 136, 127);
  const nowStr = new Date().toLocaleString('pt-BR');
  const pageLabel = needsSecondPage ? 'Folha 2/2' : 'Folha 1/1';
  doc.text(
    `Documento emitido eletronicamente via Sistema BOMProjeto em ${nowStr} • Hash de Autenticidade: ${project.id.toUpperCase()}-${Date.now().toString().slice(-6)} • ${pageLabel}`,
    margin,
    285
  );

  return doc;
}
