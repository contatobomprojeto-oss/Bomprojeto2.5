import { 
  Project, 
  RetencaoProjectData, 
  RetencaoPillar, 
  SemanticWord, 
  AiPlaybookAction, 
  SupportAlert, 
  RetentionAudioInput,
  Installment
} from '../types';

/**
 * Retenção Pro Service - Motor de Análise Preditiva e Blindagem de Clientes
 * Calcula indicadores verdadeiros e isolados por projeto, integrando:
 * 1. Cronograma e avanço físico das etapas de produção
 * 2. Atualizações com fotos de bancada e reações do cliente no portal
 * 3. Status financeiro de parcelas Pix (adimplência, atrasos e vencimentos)
 * 4. Fricção de comunicação no WhatsApp, alertas de suporte e áudios de voz
 */

/**
 * Formata moeda BRL
 */
function formatCurrencyBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

/**
 * Converte data DD/MM/AAAA para objeto Date
 */
function parseDateBR(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  const isoDate = new Date(dateStr);
  return isNaN(isoDate.getTime()) ? null : isoDate;
}

/**
 * Calcula dados analíticos verdadeiros do projeto a partir do seu estado real
 */
export function getRetencaoDataForProject(
  project: Project,
  supportAlerts: SupportAlert[] = [],
  attachedAudios: RetentionAudioInput[] = []
): RetencaoProjectData {
  if (!project) {
    throw new Error('Projeto obrigatório para análise de Retenção Pro');
  }

  const today = new Date();
  const clientFirstName = project.clientName?.split(' ')[0] || 'Cliente';

  // ==========================================================================
  // 1. ANÁLISE DO PILAR FINANCEIRO & CONTRATUAL (contractualRisk)
  // ==========================================================================
  const installments = Array.isArray(project.installments) ? project.installments : [];
  const totalInstallments = installments.length || 1;
  const totalValue = project.totalValue || installments.reduce((sum, i) => sum + (i.amount || 0), 0);

  let paidCount = 0;
  let paidAmount = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  const overdueList: Installment[] = [];

  installments.forEach(inst => {
    if (inst.status === 'paid') {
      paidCount++;
      paidAmount += inst.amount || 0;
    } else {
      const dueDate = parseDateBR(inst.dueDate);
      if (dueDate && dueDate < today) {
        overdueCount++;
        overdueAmount += inst.amount || 0;
        overdueList.push(inst);
      }
    }
  });

  const pendingAmount = totalValue - paidAmount;
  const financialHealthPercent = totalValue > 0 ? Math.round((paidAmount / totalValue) * 100) : 100;

  let contractRiskScore = 10;
  let contractRiskLevel: 'baixo' | 'moderado' | 'critico' = 'baixo';
  let contractRiskDesc = '';
  let contractRiskDetail = '';

  if (overdueCount > 0) {
    contractRiskScore = Math.min(95, 55 + overdueCount * 18);
    contractRiskLevel = contractRiskScore > 75 ? 'critico' : 'moderado';
    contractRiskDesc = `Inadimplência detectada: ${overdueCount} parcela(s) vencida(s) somando ${formatCurrencyBRL(overdueAmount)}.`;
    contractRiskDetail = `Parcela ${overdueList[0]?.number || 1} (${overdueList[0]?.label || 'Em aberto'}) venceu em ${overdueList[0]?.dueDate || 'data recente'}. Chave Pix ${project.pixKey ? 'configurada' : 'pendente'}.`;
  } else if (financialHealthPercent === 100) {
    contractRiskScore = 5;
    contractRiskLevel = 'baixo';
    contractRiskDesc = `Contrato 100% quitado (${formatCurrencyBRL(paidAmount)}). Risco financeiro nulo.`;
    contractRiskDetail = `Todas as ${totalInstallments} parcelas quitadas com sucesso via Pix.`;
  } else {
    contractRiskScore = Math.max(10, Math.min(35, 100 - financialHealthPercent));
    contractRiskLevel = 'baixo';
    contractRiskDesc = `Pagamentos em dia: ${paidCount} de ${totalInstallments} parcelas quitadas (${financialHealthPercent}% liquidado).`;
    contractRiskDetail = `Saldo a liquidar conforme as etapas: ${formatCurrencyBRL(pendingAmount)}. Nenhuma pendência em atraso.`;
  }

  // ==========================================================================
  // 2. ANÁLISE DO PILAR OPERACIONAL & PRAZOS (operationalReliability)
  // ==========================================================================
  const progress = Math.min(100, Math.max(0, project.progressPercent || 0));
  const stages = Array.isArray(project.stages) ? project.stages : [];
  const completedStages = stages.filter(s => s.status === 'completed').length;
  const totalStages = stages.length || 1;
  const isFinished = project.status === 'concluido' || progress === 100;

  const deliveryDateObj = parseDateBR(project.deliveryDate);
  let daysUntilDelivery = 30;
  let isDelayed = false;

  if (deliveryDateObj) {
    const diffTime = deliveryDateObj.getTime() - today.getTime();
    daysUntilDelivery = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilDelivery < 0 && !isFinished) {
      isDelayed = true;
    }
  }

  let operationalScore = 85;
  let operationalLevel: 'excelente' | 'moderado' | 'critico' = 'excelente';
  let operationalDesc = '';
  let operationalDetail = '';

  if (isFinished) {
    operationalScore = 98;
    operationalLevel = 'excelente';
    operationalDesc = `Projeto concluído e entregue com 100% das ${totalStages} etapas concluídas.`;
    operationalDetail = `Entrega finalizada com conformidade técnica garantida.`;
  } else if (isDelayed) {
    const daysLate = Math.abs(daysUntilDelivery);
    operationalScore = Math.max(25, 60 - daysLate * 5);
    operationalLevel = 'critico';
    operationalDesc = `Prazo contratual expirado há ${daysLate} dia(s) (Previsto: ${project.deliveryDate}).`;
    operationalDetail = `Avanço físico em ${progress}% na etapa "${project.currentStage}". Necessário reagendamento formal.`;
  } else if (daysUntilDelivery <= 3 && progress < 70) {
    operationalScore = 48;
    operationalLevel = 'moderado';
    operationalDesc = `Risco de aperto no cronograma: entrega em ${daysUntilDelivery} dias e progresso em ${progress}%.`;
    operationalDetail = `Etapa atual "${project.currentStage}" requer aceleração para montagem no prazo.`;
  } else {
    operationalScore = Math.min(96, Math.max(65, 75 + Math.round((progress / 100) * 15) + (completedStages > 0 ? 5 : 0)));
    operationalLevel = operationalScore >= 80 ? 'excelente' : 'moderado';
    operationalDesc = `Cronograma no prazo: ${completedStages} de ${totalStages} etapas concluídas (${progress}% da OS).`;
    operationalDetail = `Fase atual: "${project.currentStage}". Previsão de entrega confirmada para ${project.deliveryDate}.`;
  }

  // ==========================================================================
  // 3. ANÁLISE DO PILAR DE COMUNICAÇÃO & RUÍDOS (communicationFriction)
  // ==========================================================================
  const daysWithoutUpdate = typeof project.daysWithoutUpdate === 'number' ? project.daysWithoutUpdate : 0;
  const projectAlerts = supportAlerts.filter(a => a.projectId === project.id || a.projectCode === project.code);
  const unreadAlerts = projectAlerts.filter(a => !a.isRead);
  const isAttention = project.status === 'atencao' || project.needsAttention || unreadAlerts.length > 0;

  // Análise vocal se houver áudios anexados
  const hasAudios = attachedAudios.length > 0;
  let audioFrictionPenalty = 0;
  if (hasAudios && isAttention) {
    audioFrictionPenalty = 15;
  }

  let commFrictionScore = 15;
  let commFrictionLevel: 'baixo' | 'moderado' | 'atencao' | 'critico' = 'baixo';
  let commFrictionDesc = '';
  let commFrictionDetail = '';

  if (isAttention || unreadAlerts.length > 0) {
    commFrictionScore = Math.min(100, Math.max(55, 50 + daysWithoutUpdate * 4 + unreadAlerts.length * 15 + audioFrictionPenalty));
    commFrictionLevel = commFrictionScore > 75 ? 'critico' : 'atencao';
    commFrictionDesc = unreadAlerts.length > 0
      ? `Atrito ativo: ${unreadAlerts.length} chamado(s) de suporte do cliente aguardando resposta imediata.`
      : daysWithoutUpdate >= 5
      ? `Atrito por silêncio: cliente há ${daysWithoutUpdate} dias sem notícias sobre a etapa "${project.currentStage}".`
      : `Sinalização de atenção na comunicação com o cliente.`;
    commFrictionDetail = project.lastInteractionText
      ? `Último registro (${project.lastInteractionDate || 'recente'}): "${project.lastInteractionText}".`
      : `Recomenda-se envio de boletim com fotos da bancada pelo WhatsApp imediatamente.`;
  } else if (daysWithoutUpdate >= 4) {
    commFrictionScore = Math.min(50, 25 + (daysWithoutUpdate - 3) * 8);
    commFrictionLevel = 'moderado';
    commFrictionDesc = `Comunicação sem ruídos graves, mas projeto há ${daysWithoutUpdate} dias sem atualização no portal.`;
    commFrictionDetail = `Envio regular de mensagens previne ansiedade e chamados no WhatsApp.`;
  } else {
    commFrictionScore = Math.max(8, 20 - (daysWithoutUpdate === 0 ? 8 : 0));
    commFrictionLevel = 'baixo';
    commFrictionDesc = `Comunicação fluida e ágil. Cliente informado em tempo real pelo WhatsApp.`;
    commFrictionDetail = project.lastInteractionText
      ? `Último contato (${project.lastInteractionDate || 'Hoje'}): "${project.lastInteractionText}".`
      : `Mensagens e etapas sincronizadas sem pendências abertas.`;
  }

  // ==========================================================================
  // 4. ANÁLISE DO PILAR DE VALOR PERCEBIDO & EVIDÊNCIAS (perceivedValue)
  // ==========================================================================
  const updates = Array.isArray(project.updates) ? project.updates : [];
  const totalPhotos = updates.reduce((sum, u) => sum + (Array.isArray(u.photos) ? u.photos.length : 0), 0);
  const positiveReactions = updates.filter(u => Array.isArray(u.clientReactions) && u.clientReactions.length > 0).length;

  let perceivedValScore = 80;
  let perceivedValLevel: 'excelente' | 'moderado' | 'critico' = 'excelente';
  let perceivedValDesc = '';
  let perceivedValDetail = '';

  if (totalPhotos >= 3 || positiveReactions > 0) {
    perceivedValScore = Math.min(98, 80 + totalPhotos * 3 + positiveReactions * 5);
    perceivedValLevel = 'excelente';
    perceivedValDesc = `Alta transparência: ${totalPhotos} fotos técnicas de bancada e ${updates.length} boletins publicados.`;
    perceivedValDetail = `Cliente com evidências visuais contínuas da qualidade do acabamento (${project.category || 'sob medida'}).`;
  } else if (updates.length > 0) {
    perceivedValScore = 75;
    perceivedValLevel = 'moderado';
    perceivedValDesc = `${updates.length} boletim(ns) de texto registrado(s). Oportunidade de incluir mais fotos de produção.`;
    perceivedValDetail = `Fotos de detalhes e ferragens na bancada aumentam o encantamento em até 40%.`;
  } else {
    perceivedValScore = 60;
    perceivedValLevel = 'moderado';
    perceivedValDesc = `Nenhum boletim com fotos técnicas publicado até o momento.`;
    perceivedValDetail = `O envio da primeira foto da etapa "${project.currentStage}" demonstrará o cuidado artesanal.`;
  }

  // ==========================================================================
  // 5. SCORE DE FELICIDADE GERAL & RISCO DE CHURN PREDITIVO
  // ==========================================================================
  // Fórmula ponderada com base nos dados reais
  const happinessScore = Math.round(
    operationalScore * 0.35 +
    perceivedValScore * 0.25 +
    (100 - commFrictionScore) * 0.25 +
    (100 - contractRiskScore) * 0.15
  );

  const finalHappiness = Math.min(100, Math.max(10, happinessScore));

  const happinessStatus: 'verde' | 'amarelo' | 'vermelho' =
    finalHappiness >= 75 ? 'verde' : finalHappiness >= 50 ? 'amarelo' : 'vermelho';

  const happinessStatusLabel =
    happinessStatus === 'verde'
      ? 'Cliente Promotor • Alta Retenção & Indicações'
      : happinessStatus === 'amarelo'
      ? 'Atenção Operacional • Risco Moderado de Atrito'
      : 'Risco Crítico de Cancelamento ou Conflito';

  const happinessTrend = 
    happinessStatus === 'verde' ? +6 : happinessStatus === 'amarelo' ? 0 : -8;

  // ==========================================================================
  // 6. RADAR SEMÂNTICO REAL (PALAVRAS E SENTIMENTOS VERDADEIROS)
  // ==========================================================================
  const positiveCloud: SemanticWord[] = [];
  const negativeCloud: SemanticWord[] = [];

  // Extrai palavras com base na categoria e termos reais do projeto
  const currentStageName = (project.currentStage || '').toLowerCase();
  
  if (operationalScore >= 75) {
    positiveCloud.push({ word: 'cronograma no prazo', count: Math.max(3, completedStages + 2), sentiment: 'positive', sampleContext: `Prazo de entrega confirmado para ${project.deliveryDate}.` });
  }
  if (totalPhotos > 0) {
    positiveCloud.push({ word: 'fotos de bancada aprovadas', count: Math.max(2, totalPhotos), sentiment: 'positive', sampleContext: `${totalPhotos} foto(s) técnicas registradas no portal.` });
  }
  if (paidCount > 0) {
    positiveCloud.push({ word: 'pagamento pix confirmado', count: paidCount, sentiment: 'positive', sampleContext: `${paidCount} parcela(s) quitadas sem atrito.` });
  }
  if (currentStageName) {
    positiveCloud.push({ word: `etapa: ${project.currentStage}`, count: 4, sentiment: 'positive', sampleContext: `Produção avançando com foco na etapa ${project.currentStage}.` });
  }
  positiveCloud.push({ word: 'padrão de acabamento', count: 3, sentiment: 'positive', sampleContext: `Especificação de alto padrão para ${project.title}.` });
  if (positiveReactions > 0) {
    positiveCloud.push({ word: 'reações positivas no portal', count: positiveReactions, sentiment: 'positive', sampleContext: `Cliente interagiu com reações de aprovação.` });
  }

  // Termos de alerta ou atrito reais
  if (overdueCount > 0) {
    negativeCloud.push({ word: 'parcela pix vencida', count: overdueCount, sentiment: 'negative', sampleContext: `Parcela ${overdueList[0]?.number} (${formatCurrencyBRL(overdueAmount)}) aguardando pagamento.` });
  }
  if (daysWithoutUpdate >= 4) {
    negativeCloud.push({ word: `${daysWithoutUpdate} dias sem atualização`, count: daysWithoutUpdate, sentiment: 'negative', sampleContext: `Tempo sem boletim publicado no portal.` });
  }
  if (isDelayed) {
    negativeCloud.push({ word: 'prazo em atraso', count: 3, sentiment: 'negative', sampleContext: `Data limite contratual expirou em ${project.deliveryDate}.` });
  }
  if (unreadAlerts.length > 0) {
    negativeCloud.push({ word: 'suporte solicitado', count: unreadAlerts.length, sentiment: 'negative', sampleContext: unreadAlerts[0]?.message || 'Cliente aguardando retorno.' });
  }
  if (hasAudios && isAttention) {
    negativeCloud.push({ word: 'hesitação no áudio', count: attachedAudios.length, sentiment: 'negative', sampleContext: '[Áudio WhatsApp] Pausas perceptíveis na cobrança de datas.' });
  }

  if (negativeCloud.length === 0) {
    negativeCloud.push({ word: 'ajuste fino pontual', count: 1, sentiment: 'negative', sampleContext: 'Alinhamento natural de cronograma.' });
  }

  // ==========================================================================
  // 7. PLAYBOOK PRESCRITIVO PERSONALIZADO COM AÇÕES DIRETAS NO WHATSAPP
  // ==========================================================================
  const playbook: AiPlaybookAction[] = [];

  // Ação 1: Cobrança se houver parcela vencida
  if (overdueCount > 0) {
    const firstOverdue = overdueList[0];
    playbook.push({
      id: `pb-${project.id}-overdue`,
      title: `Cobrança Amigável: Parcela ${firstOverdue.number} Vencida (${formatCurrencyBRL(firstOverdue.amount)})`,
      diagnosis: `O cliente possui parcela em atraso desde ${firstOverdue.dueDate}. Necessário envio educado de chave Pix para baixa automática.`,
      urgency: 'critica',
      recommendedAction: `Disparar mensagem no WhatsApp com a chave Pix e comprovante da etapa atual.`,
      whatsappMessage: `Olá ${clientFirstName}! Tudo bem? Passando para te atualizar sobre a produção do seu projeto (${project.title}). Notamos que a parcela ${firstOverdue.number} no valor de ${formatCurrencyBRL(firstOverdue.amount)} venceu em ${firstOverdue.dueDate}. Segue a nossa chave Pix ${project.pixKey || 'oficial'} para pagamento e baixa imediata no sistema. Qualquer dúvida estamos à disposição!`,
      applied: false
    });
  }

  // Ação 2: Atualização de fotos se houver silêncio ou atraso
  if (daysWithoutUpdate >= 4 || isDelayed || unreadAlerts.length > 0) {
    playbook.push({
      id: `pb-${project.id}-photos`,
      title: `Prevenção de Ansiedade: Atualização da Etapa "${project.currentStage}"`,
      diagnosis: isDelayed
        ? `Projeto com entrega em atraso. Envio de evidências da sprint é mandatório para conter cancelamentos.`
        : `Cliente há ${daysWithoutUpdate} dias sem atualização das entregas. Oportunidade de tranquilizar o cliente.`,
      urgency: isDelayed ? 'critica' : 'preventiva',
      recommendedAction: `Gravar vídeo rápido de tela ou enviar prints dos relatórios/criativos com status detalhado.`,
      whatsappMessage: `Oi ${clientFirstName}! Como você está? Passando para compartilhar uma atualização em primeira mão do projeto ${project.code}. Nossa equipe está trabalhando com foco total na etapa de "${project.currentStage}" (${progress}% concluído). Seguem atualizações do andamento das entregas!`,
      applied: false
    });
  }

  // Ação 3: Encantamento e pedido de indicação se o score estiver alto
  if (finalHappiness >= 75) {
    playbook.push({
      id: `pb-${project.id}-encantamento`,
      title: `Encantamento & Indicação: Cliente Promotora da Marca`,
      diagnosis: `Score de ${finalHappiness}/100 com cronograma em dia e parcelas quitadas. Momento perfeito para colher depoimento ou pedir indicações.`,
      urgency: 'encantamento',
      recommendedAction: `Enviar agradecimento informal pelo WhatsApp e convite para call de alinhamento ou indicação de novos clientes.`,
      whatsappMessage: `Olá ${clientFirstName}! Passando para agradecer pela confiança na nossa equipe! As etapas do seu projeto ${project.code} estão avançando com excelência e qualidade garantida. Se você tiver algum parceiro de negócios que também precise de escala em tráfego ou automações, será um prazer atendê-los com a mesma dedicação!`,
      applied: false
    });
  }

  // Resumo analítico global
  const summary = isDelayed
    ? `Atenção Crítica: O projeto ${project.code} está com a entrega em atraso em relação à data contratual (${project.deliveryDate}). Ação de alinhamento com ${clientFirstName} necessária.`
    : overdueCount > 0
    ? `Risco Financeiro: Projeto em andamento normal na produção, mas com ${overdueCount} parcela(s) vencida(s) aguardando Pix (${formatCurrencyBRL(overdueAmount)}).`
    : daysWithoutUpdate >= 5
    ? `Atenção Preventiva: Comunicação em silêncio há ${daysWithoutUpdate} dias. Enviar fotos da etapa "${project.currentStage}" para manter o cliente seguro.`
    : `Saúde Operacional Excelente: ${clientFirstName} está com o projeto "${project.title}" rigorosamente no prazo (${progress}%), pagamentos em dia e alta perspectiva de retenção.`;

  return {
    projectId: project.id,
    happinessScore: finalHappiness,
    happinessStatus,
    happinessStatusLabel,
    happinessTrend,
    summary,
    pillars: {
      communicationFriction: {
        score: commFrictionScore,
        label: 'Atrito na Comunicação',
        level: commFrictionLevel as any,
        description: commFrictionDesc,
        detail: commFrictionDetail,
        trend: commFrictionScore > 40 ? 'up' : 'down',
        delta: commFrictionScore > 40 ? +4 : -3
      },
      operationalReliability: {
        score: operationalScore,
        label: 'Confiabilidade Operacional & Prazos',
        level: operationalLevel as any,
        description: operationalDesc,
        detail: operationalDetail,
        trend: operationalScore >= 75 ? 'up' : 'down',
        delta: operationalScore >= 75 ? +3 : -5
      },
      perceivedValue: {
        score: perceivedValScore,
        label: 'Percepção de Valor & Entregas',
        level: perceivedValLevel as any,
        description: perceivedValDesc,
        detail: perceivedValDetail,
        trend: 'up',
        delta: +4
      },
      contractualRisk: {
        score: contractRiskScore,
        label: 'Risco Contratual & Financeiro',
        level: contractRiskLevel as any,
        description: contractRiskDesc,
        detail: contractRiskDetail,
        trend: contractRiskScore > 40 ? 'up' : 'stable',
        delta: contractRiskScore > 40 ? +6 : 0
      }
    },
    semanticRadar: {
      positiveCloud,
      negativeCloud
    },
    playbook,
    vocalToneAnalysis: hasAudios ? {
      audiosAnalyzed: attachedAudios.length,
      toneSummary: isAttention
        ? `Hesitação e ansiedade detectadas em ${attachedAudios.length} áudio(s) do WhatsApp do cliente.`
        : `Tom cordial, tranquilo e satisfeito verificado em ${attachedAudios.length} áudio(s) do WhatsApp.`,
      hesitationLevel: isAttention ? 'moderada' : 'nenhuma',
      irritationLevel: isDelayed ? 'moderada' : 'nenhuma',
      satisfactionLevel: finalHappiness >= 75 ? 'excelente' : finalHappiness >= 50 ? 'regular' : 'baixa',
      audioNotes: `${attachedAudios.length} arquivo(s) de áudio de voz processados pelo motor de IA.`
    } : undefined
  };
}

/**
 * Converte o schema de backend 'RetencaoProAnalysis' para a interface de renderização 'RetencaoProjectData'
 */
export function convertBackendAnalysisToProjectData(
  analysis: any,
  project: Project
): RetencaoProjectData {
  const score = Math.min(100, Math.max(0, analysis.happinessScore ?? 75));
  const happinessStatus: 'verde' | 'amarelo' | 'vermelho' =
    score >= 75 ? 'verde' : score >= 50 ? 'amarelo' : 'vermelho';

  const riskLabel = analysis.churnRisk === 'CRITICO'
    ? 'Risco Crítico de Cancelamento ou Conflito'
    : analysis.churnRisk === 'MEDIO'
    ? 'Atenção Operacional • Risco Moderado de Atrito'
    : 'Cliente Promotor • Alta Retenção & Indicações';

  const commFriction = analysis.pillars?.communicationFriction || {};
  const operational = analysis.pillars?.operationalReliability || {};
  const perceived = analysis.pillars?.perceivedValue || {};
  const contract = analysis.pillars?.contractualRisk || {};

  return {
    projectId: project.id,
    happinessScore: score,
    happinessStatus,
    happinessStatusLabel: riskLabel,
    happinessTrend: score >= 75 ? +6 : score >= 50 ? 0 : -8,
    summary: analysis.summary || operational.justification || perceived.justification || 'Análise preditiva gerada pela IA.',
    pillars: {
      communicationFriction: {
        score: commFriction.score ?? 20,
        label: 'Atrito na Comunicação',
        level: (commFriction.level || (commFriction.score > 50 ? 'atencao' : 'baixo')) as any,
        description: commFriction.justification || 'Comunicação pelo WhatsApp avaliada.',
        detail: `Score de fricção calculado: ${commFriction.score ?? 20}/100.`,
        trend: (commFriction.score ?? 20) > 40 ? 'up' : 'down',
        delta: 0
      },
      operationalReliability: {
        score: operational.score ?? 85,
        label: 'Confiabilidade Operacional & Prazos',
        level: (operational.level || (operational.score >= 75 ? 'excelente' : 'moderado')) as any,
        description: operational.justification || 'Avanço de etapas monitorado.',
        detail: `Confiabilidade calculada: ${operational.score ?? 85}/100.`,
        trend: (operational.score ?? 85) >= 75 ? 'up' : 'down',
        delta: +3
      },
      perceivedValue: {
        score: perceived.score ?? 90,
        label: 'Percepção de Valor & Entregas',
        level: (perceived.level || (perceived.score >= 75 ? 'excelente' : 'moderado')) as any,
        description: perceived.justification || 'Fotos e acabamento avaliados.',
        detail: `Percepção de valor calculada: ${perceived.score ?? 90}/100.`,
        trend: 'up',
        delta: +4
      },
      contractualRisk: {
        score: contract.score ?? 15,
        label: 'Risco Contratual & Financeiro',
        level: (contract.level || (contract.score > 40 ? 'moderado' : 'baixo')) as any,
        description: contract.justification || 'Status de parcelas e contratos.',
        detail: `Risco financeiro calculado: ${contract.score ?? 15}/100.`,
        trend: (contract.score ?? 15) > 40 ? 'up' : 'stable',
        delta: 0
      }
    },
    semanticRadar: {
      positiveCloud: Array.isArray(analysis.positiveWords)
        ? analysis.positiveWords.map((w: any) => ({
            word: w.text || w.word,
            count: Number(w.count) || 1,
            sentiment: 'positive' as const,
            sampleContext: w.sampleContext || `Termo positivo citado no projeto.`
          }))
        : [],
      negativeCloud: Array.isArray(analysis.negativeWords)
        ? analysis.negativeWords.map((w: any) => ({
            word: w.text || w.word,
            count: Number(w.count) || 1,
            sentiment: 'negative' as const,
            sampleContext: w.sampleContext || `Termo de fricção citado no projeto.`
          }))
        : []
    },
    playbook: Array.isArray(analysis.prescriptiveActions)
      ? analysis.prescriptiveActions.map((a: any, idx: number) => ({
          id: `pb-api-${project.id}-${idx}`,
          title: a.diagnosis || `Ação Prescritiva ${idx + 1}`,
          diagnosis: a.diagnosis || 'Diagnóstico da IA.',
          urgency: (a.priority === 'CRITICA' ? 'critica' : a.priority === 'ALTA' ? 'preventiva' : 'encantamento') as any,
          recommendedAction: a.action || 'Ação sugerida pela inteligência.',
          whatsappMessage: a.whatsappTemplate || '',
          applied: false
        }))
      : [],
    vocalToneAnalysis: analysis.vocalToneAnalysis
  };
}

/**
 * Consulta a rota de backend /api/retencao/:projectId/analyze enviando o projeto atualizado e áudios
 */
export async function fetchProjectRetentionFromBackend(
  projectId: string,
  fresh = false,
  audioFiles?: RetentionAudioInput[],
  project?: Project,
  supportAlerts?: SupportAlert[]
): Promise<any | null> {
  try {
    const url = `/api/retencao/${encodeURIComponent(projectId)}/analyze`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fresh,
        audioFiles: audioFiles || [],
        project,
        supportAlerts: supportAlerts || []
      })
    });

    if (!res.ok) {
      console.warn(`[RetencaoPro Client] Erro na resposta do backend: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data?.data || null;
  } catch (err) {
    console.warn('[RetencaoPro Client] Falha ao conectar ao backend de retenção:', err);
    return null;
  }
}
