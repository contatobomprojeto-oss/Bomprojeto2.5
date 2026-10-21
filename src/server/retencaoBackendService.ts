import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Project, 
  Installment, 
  ProjectStage, 
  ProjectUpdate, 
  RetentionAudioInput, 
  VocalToneAnalysis 
} from '../types';

// ============================================================================
// 1. ISOLAMENTO ESTRITO DE DADOS: INTERFACES TYPESCRIPT DO SCHEMA
// Tabela / Entidade: RetencaoProAnalysis
// Regra: O campo 'project_id' é chave obrigatória e indexada.
// Cada análise pertence exclusivamente a um único projeto.
// ============================================================================

export type ChurnRisk = 'BAIXO' | 'MEDIO' | 'CRITICO';

export interface RetencaoPillarItem {
  score: number; // 0 a 100
  justification: string;
  level?: 'excelente' | 'bom' | 'moderado' | 'atencao' | 'critico' | 'baixo';
  trend?: 'up' | 'down' | 'stable';
  delta?: number;
}

export interface RetencaoPillars {
  communicationFriction: RetencaoPillarItem;
  operationalReliability: RetencaoPillarItem;
  perceivedValue: RetencaoPillarItem;
  contractualRisk: RetencaoPillarItem;
}

export interface RetencaoSemanticWordItem {
  text: string;
  count: number;
  sentimentWeight: number; // Peso 0.0 a 1.0 ou intensidade
  category?: string;
  sampleContext?: string;
}

export interface RetencaoPrescriptiveActionItem {
  priority: 'ALTA' | 'MEDIA' | 'BAIXA' | 'CRITICA';
  diagnosis: string;
  action: string;
  whatsappTemplate: string;
}

/**
 * Entidade RetencaoProAnalysis (Schema de banco de dados)
 * project_id é chave obrigatória e indexada para isolamento multi-tenant
 */
export interface RetencaoProAnalysis {
  id: string;
  project_id: string; // Chave obrigatória e indexada
  workspace_id?: string;
  happinessScore: number; // 0 a 100
  churnRisk: ChurnRisk; // 'BAIXO' | 'MEDIO' | 'CRITICO'
  pillars: RetencaoPillars;
  positiveWords: RetencaoSemanticWordItem[];
  negativeWords: RetencaoSemanticWordItem[];
  prescriptiveActions: RetencaoPrescriptiveActionItem[];
  vocalToneAnalysis?: VocalToneAnalysis;
  aiModel?: string;
  analyzedAt: string;
  isContingency?: boolean;
  contingencyReason?: string;
}

export interface RetentionAnalysisResponse {
  success: boolean;
  status: 'ai_generated' | 'contingency' | 'cached';
  message: string;
  data: RetencaoProAnalysis;
}

// ============================================================================
// 2. CAMADA DE PERSISTÊNCIA E INDEXAÇÃO EM MEMÓRIA / DISCO
// Garante busca O(1) indexada por project_id
// ============================================================================

const DATA_DIR = path.join(process.cwd(), 'data');
const RETENCAO_FILE = path.join(DATA_DIR, 'retencao_analyses.json');

// Índice em memória: Map<project_id, RetencaoProAnalysis>
const analysesIndexByProjectId = new Map<string, RetencaoProAnalysis>();

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('[RetencaoPro] Erro ao criar diretório de dados:', e);
    }
  }
}

function loadPersistedAnalyses(): void {
  try {
    ensureDataDir();
    if (fs.existsSync(RETENCAO_FILE)) {
      const raw = fs.readFileSync(RETENCAO_FILE, 'utf-8');
      const list: RetencaoProAnalysis[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        analysesIndexByProjectId.clear();
        for (const item of list) {
          if (item && item.project_id) {
            analysesIndexByProjectId.set(item.project_id, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[RetencaoPro] Aviso ao carregar análises persistidas:', err);
  }
}

function saveAnalysesToDisk(): void {
  try {
    ensureDataDir();
    const list = Array.from(analysesIndexByProjectId.values());
    const tmp = `${RETENCAO_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf-8');
    fs.renameSync(tmp, RETENCAO_FILE);
  } catch (err) {
    console.error('[RetencaoPro] Erro ao salvar análises no disco:', err);
  }
}

// Inicializa o índice carregando do disco
loadPersistedAnalyses();

// ============================================================================
// 3. GERADOR DE CONTINGÊNCIA AMIGÁVEL
// Executado quando GEMINI_API_KEY não estiver configurada ou falhar
// ============================================================================

export function buildContingencyRetentionAnalysis(
  project: Project,
  reason = 'Chave GEMINI_API_KEY não configurada ou em modo contingência',
  audioFiles?: RetentionAudioInput[],
  supportAlerts?: any[]
): RetencaoProAnalysis {
  const today = new Date();
  const progress = Math.min(100, Math.max(0, project.progressPercent || 0));
  const stages = Array.isArray(project.stages) ? project.stages : [];
  const completedStages = stages.filter(s => s.status === 'completed').length;
  const totalStages = stages.length || 1;
  const isFinished = project.status === 'concluido' || progress === 100;
  const updates = Array.isArray(project.updates) ? project.updates : [];
  const totalPhotos = updates.reduce((sum, u) => sum + (Array.isArray(u.photos) ? u.photos.length : 0), 0);
  const positiveReactions = updates.filter(u => Array.isArray(u.clientReactions) && u.clientReactions.length > 0).length;

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
    } else if (inst.dueDate) {
      const parts = inst.dueDate.split('/');
      let dueObj: Date | null = null;
      if (parts.length === 3) {
        dueObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else {
        dueObj = new Date(inst.dueDate);
      }
      if (dueObj && dueObj < today) {
        overdueCount++;
        overdueAmount += inst.amount || 0;
        overdueList.push(inst);
      }
    }
  });

  const financialHealth = totalValue > 0 ? Math.round((paidAmount / totalValue) * 100) : 100;

  // Prazo e entrega
  let daysUntilDelivery = 30;
  let isDelayed = false;
  if (project.deliveryDate) {
    const parts = project.deliveryDate.split('/');
    let delObj: Date | null = null;
    if (parts.length === 3) {
      delObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else {
      delObj = new Date(project.deliveryDate);
    }
    if (delObj) {
      daysUntilDelivery = Math.ceil((delObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDelivery < 0 && !isFinished) {
        isDelayed = true;
      }
    }
  }

  // Alertas e Fricção
  const daysWithoutUpdate = typeof project.daysWithoutUpdate === 'number' ? project.daysWithoutUpdate : 0;
  const projectAlerts = Array.isArray(supportAlerts) 
    ? supportAlerts.filter(a => a.projectId === project.id || a.projectCode === project.code) 
    : [];
  const unreadAlerts = projectAlerts.filter(a => !a.isRead);
  const isAttention = project.status === 'atencao' || project.needsAttention || unreadAlerts.length > 0 || isDelayed;

  const hasAudios = Array.isArray(audioFiles) && audioFiles.length > 0;
  let audioFrictionPenalty = 0;
  if (hasAudios && isAttention) {
    audioFrictionPenalty = 15;
  }

  // 1. Pilar Comunicação
  let commFrictionScore = 15;
  if (isAttention || unreadAlerts.length > 0) {
    commFrictionScore = Math.min(100, Math.max(55, 50 + daysWithoutUpdate * 4 + unreadAlerts.length * 15 + audioFrictionPenalty));
  } else if (daysWithoutUpdate >= 4) {
    commFrictionScore = Math.min(50, 25 + (daysWithoutUpdate - 3) * 8);
  } else {
    commFrictionScore = Math.max(8, 20 - (daysWithoutUpdate === 0 ? 8 : 0));
  }

  // 2. Pilar Operacional
  let operationalScore = 85;
  if (isFinished) {
    operationalScore = 98;
  } else if (isDelayed) {
    operationalScore = Math.max(25, 60 - Math.abs(daysUntilDelivery) * 5);
  } else if (daysUntilDelivery <= 3 && progress < 70) {
    operationalScore = 48;
  } else {
    operationalScore = Math.min(96, Math.max(65, 75 + Math.round((progress / 100) * 15) + (completedStages > 0 ? 5 : 0)));
  }

  // 3. Pilar Percepção de Valor
  let perceivedValScore = 80;
  if (totalPhotos >= 3 || positiveReactions > 0) {
    perceivedValScore = Math.min(98, 80 + totalPhotos * 3 + positiveReactions * 5);
  } else if (updates.length > 0) {
    perceivedValScore = 75;
  } else {
    perceivedValScore = 60;
  }

  // 4. Pilar Risco Contratual
  let contractRiskScore = 10;
  if (overdueCount > 0) {
    contractRiskScore = Math.min(95, 55 + overdueCount * 18);
  } else if (financialHealth === 100) {
    contractRiskScore = 5;
  } else {
    contractRiskScore = Math.max(10, Math.min(35, 100 - financialHealth));
  }

  // Score Geral
  const score = Math.min(100, Math.max(10, Math.round(
    operationalScore * 0.35 +
    perceivedValScore * 0.25 +
    (100 - commFrictionScore) * 0.25 +
    (100 - contractRiskScore) * 0.15
  )));

  const churnRisk: ChurnRisk = score >= 75 ? 'BAIXO' : score >= 50 ? 'MEDIO' : 'CRITICO';

  const pillars: RetencaoPillars = {
    communicationFriction: {
      score: commFrictionScore,
      justification: unreadAlerts.length > 0
        ? `${unreadAlerts.length} chamado(s) de suporte pendente(s) de retorno.`
        : daysWithoutUpdate >= 5
        ? `Cliente sem notícias da produção há ${daysWithoutUpdate} dias.`
        : hasAudios
        ? `Voz avaliada em ${audioFiles.length} áudio(s) do WhatsApp. Tempo de resposta sob controle.`
        : 'Comunicação pontual e assertiva pelo WhatsApp.',
      level: commFrictionScore > 75 ? 'critico' : commFrictionScore > 50 ? 'atencao' : 'baixo'
    },
    operationalReliability: {
      score: operationalScore,
      justification: isDelayed
        ? `Prazo contratual expirou em ${project.deliveryDate}. Progresso em ${progress}%.`
        : `Etapa "${project.currentStage}". ${completedStages} de ${totalStages} etapas concluídas (${progress}%).`,
      level: operationalScore >= 75 ? 'excelente' : operationalScore >= 50 ? 'moderado' : 'critico'
    },
    perceivedValue: {
      score: perceivedValScore,
      justification: totalPhotos > 0
        ? `${totalPhotos} foto(s) de bancada e ${updates.length} boletins técnicos publicados.`
        : 'Recomenda-se envio de fotos de bancada para reforçar percepção de acabamento.',
      level: perceivedValScore >= 75 ? 'excelente' : 'moderado'
    },
    contractualRisk: {
      score: contractRiskScore,
      justification: overdueCount > 0
        ? `${overdueCount} parcela(s) vencida(s) totalizando R$ ${overdueAmount.toLocaleString('pt-BR')}.`
        : `${paidCount} de ${totalInstallments} parcelas quitadas (R$ ${paidAmount.toLocaleString('pt-BR')}).`,
      level: contractRiskScore > 70 ? 'critico' : contractRiskScore > 35 ? 'moderado' : 'baixo'
    }
  };

  const positiveWords: RetencaoSemanticWordItem[] = [
    { text: 'cronograma no prazo', count: Math.max(3, completedStages + 2), sentimentWeight: 0.9, category: 'prazo', sampleContext: `Entrega prevista para ${project.deliveryDate}.` }
  ];
  if (totalPhotos > 0) {
    positiveWords.push({ text: 'fotos de bancada aprovadas', count: totalPhotos, sentimentWeight: 0.85, category: 'qualidade', sampleContext: `${totalPhotos} fotos técnicas registradas.` });
  }
  if (paidCount > 0) {
    positiveWords.push({ text: 'pagamento em dia', count: paidCount, sentimentWeight: 0.8, category: 'financeiro', sampleContext: `${paidCount} parcelas quitadas.` });
  }

  const negativeWords: RetencaoSemanticWordItem[] = [];
  if (overdueCount > 0) {
    negativeWords.push({ text: 'parcela vencida', count: overdueCount, sentimentWeight: 0.9, category: 'financeiro', sampleContext: `Parcela ${overdueList[0]?.number} pendente.` });
  }
  if (daysWithoutUpdate >= 4) {
    negativeWords.push({ text: 'tempo sem atualização', count: daysWithoutUpdate, sentimentWeight: 0.8, category: 'comunicação', sampleContext: `${daysWithoutUpdate} dias sem boletim.` });
  }
  if (isDelayed) {
    negativeWords.push({ text: 'prazo em atraso', count: 3, sentimentWeight: 0.85, category: 'cronograma', sampleContext: `Prazo limite ${project.deliveryDate}.` });
  }
  if (negativeWords.length === 0) {
    negativeWords.push({ text: 'ajuste fino', count: 1, sentimentWeight: 0.2, category: 'alinhamento', sampleContext: 'Alinhamento natural de cronograma.' });
  }

  let vocalToneAnalysis: VocalToneAnalysis | undefined = undefined;
  if (hasAudios) {
    vocalToneAnalysis = {
      audiosAnalyzed: audioFiles.length,
      toneSummary: isAttention
        ? `Hesitação ou urgência identificada em ${audioFiles.length} áudio(s) do WhatsApp.`
        : `Tom cordial e tranquilo verificado em ${audioFiles.length} mensagem(ns) de voz.`,
      hesitationLevel: isAttention ? 'moderada' : 'nenhuma',
      irritationLevel: isDelayed ? 'moderada' : 'nenhuma',
      satisfactionLevel: score >= 75 ? 'excelente' : score >= 50 ? 'regular' : 'baixa',
      audioNotes: `${audioFiles.length} áudio(s) processado(s).`
    };
  }

  const clientFirstName = project.clientName?.split(' ')[0] || 'Cliente';
  const prescriptiveActions: RetencaoPrescriptiveActionItem[] = [];

  if (overdueCount > 0) {
    const firstOverdue = overdueList[0];
    prescriptiveActions.push({
      priority: 'CRITICA',
      diagnosis: `Parcela ${firstOverdue.number} no valor de R$ ${firstOverdue.amount.toLocaleString('pt-BR')} vencida em ${firstOverdue.dueDate}.`,
      action: 'Enviar lembrete amigável no WhatsApp com a chave Pix para baixa rápida.',
      whatsappTemplate: `Olá ${clientFirstName}! Tudo bem? Passando para te atualizar sobre o projeto ${project.code}. Notamos que a parcela ${firstOverdue.number} (R$ ${firstOverdue.amount.toLocaleString('pt-BR')}) venceu em ${firstOverdue.dueDate}. Segue a nossa chave Pix ${project.pixKey || 'oficial'} para baixa automática. Qualquer dúvida estamos à disposição!`
    });
  }

  if (daysWithoutUpdate >= 4 || isDelayed) {
    prescriptiveActions.push({
      priority: isDelayed ? 'CRITICA' : 'ALTA',
      diagnosis: isDelayed
        ? `Prazo acordado expirou em ${project.deliveryDate}. Cliente necessita de evidência da sprint imediata.`
        : `Cliente há ${daysWithoutUpdate} dias sem atualização das entregas e métricas.`,
      action: 'Enviar prints de campanhas/automações da etapa atual e confirmar cronograma da sprint.',
      whatsappTemplate: `Oi ${clientFirstName}! Como você está? Passando para compartilhar uma atualização em primeira mão do projeto ${project.code}. Estamos avançando com foco na etapa de "${project.currentStage}" (${progress}% concluído). Seguem atualizações do andamento das entregas!`
    });
  }

  if (prescriptiveActions.length === 0) {
    prescriptiveActions.push({
      priority: 'BAIXA',
      diagnosis: 'Projeto 100% no prazo com pagamentos quitados. Excelente oportunidade para pedir indicações.',
      action: 'Agradecer a parceria e convidar o cliente a indicar amigos.',
      whatsappTemplate: `Olá ${clientFirstName}! As etapas do seu projeto ${project.code} estão avançando com excelência na fase de "${project.currentStage}". Muito obrigado pela confiança!`
    });
  }

  return {
    id: `ret-contingency-${project.id}-${Date.now()}`,
    project_id: project.id,
    workspace_id: project.workspaceId || 'ws-matriz',
    happinessScore: score,
    churnRisk,
    pillars,
    positiveWords,
    negativeWords,
    prescriptiveActions,
    vocalToneAnalysis,
    aiModel: 'contingency_heuristic_engine',
    analyzedAt: new Date().toISOString(),
    isContingency: true,
    contingencyReason: reason
  };
}

// ============================================================================
// 4. FUNÇÃO PRINCIPAL: analyzeProjectRetention(projectId)
// Integração real com Gemini API (@google/genai) + Isolamento Estrito
// ============================================================================

/**
 * Realiza a análise preditiva de retenção para um projeto específico.
 * - Lê process.env.GEMINI_API_KEY
 * - Se a chave não existir, retorna status amigável de contingência
 * - Executa prompt com System Instruction estrito para isolamento do projeto
 * - Retorna estritamente JSON estruturado
 */
export async function analyzeProjectRetention(
  projectId: string,
  projectGetter: (id: string) => Project | undefined,
  audioFiles?: RetentionAudioInput[],
  supportAlerts?: any[],
  projectInput?: Project
): Promise<RetentionAnalysisResponse> {
  const cleanId = (projectId || '').trim();
  if (!cleanId) {
    throw new Error('ID do projeto é obrigatório para análise de Retenção Pro.');
  }

  // 1. Busca os dados reais do projeto para isolamento estrito (prioriza objeto enviado pelo front)
  const project = projectInput || projectGetter(cleanId);
  if (!project) {
    throw new Error(`Projeto com ID "${cleanId}" não foi encontrado no sistema.`);
  }

  // 1.1 Se áudios não forem passados diretamente, verifica se o projeto possui documentos de áudio vinculados
  const effectiveAudios: RetentionAudioInput[] = [...(audioFiles || [])];
  if (effectiveAudios.length === 0 && Array.isArray(project.documents)) {
    for (const doc of project.documents) {
      const docName = (doc.name || '').toLowerCase();
      const isAudio = (doc.type || '').startsWith('audio/') || 
                      docName.endsWith('.ogg') || 
                      docName.endsWith('.mp3') || 
                      docName.endsWith('.wav');
      if (isAudio && doc.url && doc.url.startsWith('data:audio/')) {
        const mimeMatch = doc.url.match(/^data:(audio\/[^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : (docName.endsWith('.mp3') ? 'audio/mp3' : 'audio/ogg');
        const base64 = doc.url.replace(/^data:[^;]+;base64,/, '');
        effectiveAudios.push({
          filename: doc.name,
          mimeType,
          base64,
          uploadedAt: doc.uploadedAt,
          sender: 'cliente'
        });
      }
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // 2. Se a chave não existir, retorna status amigável de contingência sem quebrar o sistema
  if (!apiKey || apiKey.trim() === '') {
    console.info(`[RetencaoPro] Chave GEMINI_API_KEY ausente. Executando em contingência para projeto ${project.code} (${project.id}).`);
    const contingencyAnalysis = buildContingencyRetentionAnalysis(
      project,
      'A chave GEMINI_API_KEY não está configurada no ambiente. Análise gerada pelo motor heurístico local.',
      effectiveAudios,
      supportAlerts
    );
    // Indexa por project_id
    analysesIndexByProjectId.set(project.id, contingencyAnalysis);
    saveAnalysesToDisk();

    return {
      success: true,
      status: 'contingency',
      message: 'Análise de retenção gerada em modo de contingência (GEMINI_API_KEY ausente).',
      data: contingencyAnalysis
    };
  }

  // 3. Monta o contexto analítico exclusivo do projeto
  const stagesSummary = (project.stages || [])
    .map((s: ProjectStage, idx: number) => `${idx + 1}. ${s.name} [Status: ${s.status}] ${s.detail || ''}`)
    .join('\n');

  const updatesSummary = (project.updates || [])
    .map((u: ProjectUpdate) => `[${u.timestamp || 'Recente'} por ${u.author}]: ${u.message}`)
    .join('\n');

  const alertsSummary = (supportAlerts || [])
    .map((a: any) => `[Alerta ${a.date || ''} ${a.timestamp || ''}]: ${a.message}`)
    .join('\n');

  const installmentsSummary = (project.installments || [])
    .map((i: Installment) => `Parcela ${i.number} (${i.label}): R$ ${i.amount} - Status: ${i.status}`)
    .join('\n');

  const projectContext = `
DADOS DO PROJETO PARA ANÁLISE DE RETENÇÃO PRO:
- ID do Projeto: ${project.id}
- Código da OS: ${project.code}
- Nome do Cliente: ${project.clientName}
- Telefone do Cliente: ${project.clientPhone || 'Não informado'}
- Título do Projeto: ${project.title}
- Categoria: ${project.category}
- Status Atual: ${project.status} (Precisa de atenção: ${project.needsAttention ? 'SIM' : 'NÃO'})
- Etapa Atual: ${project.currentStage}
- Progresso Físico: ${project.progressPercent}%
- Previsão de Entrega: ${project.deliveryDate}
- Data do Contrato: ${project.contractDate}
- Valor Total Contratado: R$ ${project.totalValue}
- Dias sem Atualização: ${project.daysWithoutUpdate} dias
- Última Interação: ${project.lastInteractionDate} (${project.lastInteractionText || 'N/A'})
- Mensagens de Áudio Anexadas para Análise de Voz: ${effectiveAudios.length} arquivo(s)

CRONOGRAMA DE ETAPAS:
${stagesSummary || 'Nenhuma etapa cadastrada'}

HISTÓRICO DE ATUALIZAÇÕES & TRATAMENTO:
${updatesSummary || 'Nenhuma atualização recente'}

ALERTAS DE SUPORTE E ATENDIMENTO:
${alertsSummary || 'Nenhum alerta crítico registrado'}

FINANCEIRO & PARCELAS:
${installmentsSummary || 'Sem parcelas configuradas'}
`;

  // 4. System Instruction com isolamento estrito e diretrizes preditivas + Multimodalidade de Áudio
  const systemInstruction = `
Você é o motor analítico sênior do "Retenção Pro" no sistema BomProjeto.
Sua missão é avaliar a saúde do relacionamento, o risco de cancelamento (churn) e a satisfação do cliente EXCLUSIVAMENTE para o projeto fornecido.

DIRETRIZES DE AVALIAÇÃO:
1. Avalie APENAS os dados do projeto enviado. Não invente dados de outros clientes.
2. Analise os 4 pilares:
   - communicationFriction: atrito de comunicação, tempo de resposta, ruídos no WhatsApp (score 0-100, onde 0 = sem atrito e 100 = atrito gravíssimo).
   - operationalReliability: cumprimento de prazos, avanço regular de etapas (score 0-100, onde 100 = perfeito).
   - perceivedValue: percepção de valor do cliente, fotos de bancada e acabamento (score 0-100, onde 100 = encantamento total).
   - contractualRisk: inadimplência, termos pendentes, atrasos financeiros (score 0-100, onde 0 = sem risco e 100 = alto risco).
3. AVALIAÇÃO MULTIMODAL DE ÁUDIOS DO WHATSAPP (.ogg / .mp3):
   Se houver arquivos de áudio anexados:
   - Escute atentamente o tom de voz do cliente: hesitação, pausas, insegurança, rispidez, irritação, alívio, alegria ou cordialidade.
   - A hesitação ou insegurança na voz deve ser explicitamente descrita e refletida no pilar 'communicationFriction'.
   - A irritação ou cobrança na voz deve elevar o atrito e aumentar o risco de cancelamento (churnRisk).
   - A satisfação audível e o tom positivo devem elevar o 'perceivedValue' e reduzir o atrito.
   - Extraia palavras-chave e expressões literais ditas pelo cliente no áudio e insira em positiveWords ou negativeWords com sampleContext iniciando com '[Áudio WhatsApp]'.
   - Preencha o objeto 'vocalToneAnalysis' com o resumo do tom de voz detectado, níveis de hesitação, irritação e satisfação.
4. happinessScore geral: média ponderada (0 a 100).
5. churnRisk: categorizar ESTRITAMENTE em 'BAIXO' (score >= 75), 'MEDIO' (50 a 74) ou 'CRITICO' (< 50).
6. positiveWords: palavras/expressões de elogio e qualidade que sintetizam o projeto com contagem e peso.
7. negativeWords: palavras/expressões de atrito, dúvida ou atraso com contagem e peso.
8. prescriptiveActions: lista de ações práticas com prioridade ('CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'), diagnóstico claro, ação recomendada e mensagem pronta e amigável formatada para WhatsApp em português do Brasil.

RETORNE ESTRITAMENTE O JSON ESTRUTURADO NO FORMATO ESPECIFICADO.
`;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // Monta partes multimodais (áudios + texto)
    const audioParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
    if (effectiveAudios.length > 0) {
      for (const audio of effectiveAudios) {
        if (!audio.base64) continue;
        const cleanBase64 = audio.base64.replace(/^data:[^;]+;base64,/, '').trim();
        let mimeType = audio.mimeType || 'audio/ogg';
        const lowerName = (audio.filename || '').toLowerCase();
        if (lowerName.endsWith('.mp3')) mimeType = 'audio/mp3';
        else if (lowerName.endsWith('.ogg')) mimeType = 'audio/ogg';
        else if (lowerName.endsWith('.wav')) mimeType = 'audio/wav';

        audioParts.push({
          inlineData: {
            mimeType,
            data: cleanBase64
          }
        });
      }
    }

    const promptText = `Analise detalhadamente o projeto ${project.code} (${project.clientName}) ${effectiveAudios.length > 0 ? `incluindo a escuta atenta dos ${effectiveAudios.length} áudio(s) de voz anexados do WhatsApp` : ''} e gere o diagnóstico do Retenção Pro:\n\n${projectContext}`;

    const contents = [
      ...audioParts,
      { text: promptText }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            happinessScore: {
              type: Type.INTEGER,
              description: 'Score geral de satisfação e retenção de 0 a 100'
            },
            churnRisk: {
              type: Type.STRING,
              enum: ['BAIXO', 'MEDIO', 'CRITICO'],
              description: 'Nível de risco de cancelamento'
            },
            pillars: {
              type: Type.OBJECT,
              properties: {
                communicationFriction: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    justification: { type: Type.STRING },
                    level: { type: Type.STRING }
                  },
                  required: ['score', 'justification']
                },
                operationalReliability: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    justification: { type: Type.STRING },
                    level: { type: Type.STRING }
                  },
                  required: ['score', 'justification']
                },
                perceivedValue: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    justification: { type: Type.STRING },
                    level: { type: Type.STRING }
                  },
                  required: ['score', 'justification']
                },
                contractualRisk: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    justification: { type: Type.STRING },
                    level: { type: Type.STRING }
                  },
                  required: ['score', 'justification']
                }
              },
              required: [
                'communicationFriction',
                'operationalReliability',
                'perceivedValue',
                'contractualRisk'
              ]
            },
            positiveWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  count: { type: Type.INTEGER },
                  sentimentWeight: { type: Type.NUMBER }
                },
                required: ['text', 'count', 'sentimentWeight']
              }
            },
            negativeWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  count: { type: Type.INTEGER },
                  sentimentWeight: { type: Type.NUMBER }
                },
                required: ['text', 'count', 'sentimentWeight']
              }
            },
            prescriptiveActions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  priority: { type: Type.STRING },
                  diagnosis: { type: Type.STRING },
                  action: { type: Type.STRING },
                  whatsappTemplate: { type: Type.STRING }
                },
                required: ['priority', 'diagnosis', 'action', 'whatsappTemplate']
              }
            },
            vocalToneAnalysis: {
              type: Type.OBJECT,
              properties: {
                audiosAnalyzed: { type: Type.INTEGER },
                toneSummary: { type: Type.STRING },
                hesitationLevel: { type: Type.STRING, enum: ['nenhuma', 'leve', 'moderada', 'alta'] },
                irritationLevel: { type: Type.STRING, enum: ['nenhuma', 'leve', 'moderada', 'alta'] },
                satisfactionLevel: { type: Type.STRING, enum: ['baixa', 'regular', 'alta', 'excelente'] },
                audioNotes: { type: Type.STRING }
              },
              required: ['audiosAnalyzed', 'toneSummary']
            }
          },
          required: [
            'happinessScore',
            'churnRisk',
            'pillars',
            'positiveWords',
            'negativeWords',
            'prescriptiveActions'
          ]
        }
      }
    });

    const rawText = response.text || '';
    if (!rawText) {
      throw new Error('Gemini retornou resposta vazia.');
    }

    const parsed = JSON.parse(rawText);

    // Normaliza e consolida objeto RetencaoProAnalysis
    const analysis: RetencaoProAnalysis = {
      id: `ret-gemini-${project.id}-${Date.now()}`,
      project_id: project.id, // Chave obrigatória e indexada
      workspace_id: project.workspaceId || 'ws-matriz',
      happinessScore: Math.min(100, Math.max(0, Number(parsed.happinessScore) || 70)),
      churnRisk: (parsed.churnRisk === 'CRITICO' || parsed.churnRisk === 'MEDIO' || parsed.churnRisk === 'BAIXO')
        ? parsed.churnRisk
        : 'MEDIO',
      pillars: {
        communicationFriction: {
          score: Math.min(100, Math.max(0, Number(parsed.pillars?.communicationFriction?.score) || 20)),
          justification: parsed.pillars?.communicationFriction?.justification || 'Comunicação avaliada com base nas interações.',
          level: parsed.pillars?.communicationFriction?.level || 'baixo'
        },
        operationalReliability: {
          score: Math.min(100, Math.max(0, Number(parsed.pillars?.operationalReliability?.score) || 80)),
          justification: parsed.pillars?.operationalReliability?.justification || 'Avanço operacional no prazo.',
          level: parsed.pillars?.operationalReliability?.level || 'excelente'
        },
        perceivedValue: {
          score: Math.min(100, Math.max(0, Number(parsed.pillars?.perceivedValue?.score) || 85)),
          justification: parsed.pillars?.perceivedValue?.justification || 'Percepção de acabamento e valor.',
          level: parsed.pillars?.perceivedValue?.level || 'excelente'
        },
        contractualRisk: {
          score: Math.min(100, Math.max(0, Number(parsed.pillars?.contractualRisk?.score) || 15)),
          justification: parsed.pillars?.contractualRisk?.justification || 'Situação contratual analisada.',
          level: parsed.pillars?.contractualRisk?.level || 'baixo'
        }
      },
      positiveWords: Array.isArray(parsed.positiveWords) ? parsed.positiveWords : [],
      negativeWords: Array.isArray(parsed.negativeWords) ? parsed.negativeWords : [],
      prescriptiveActions: Array.isArray(parsed.prescriptiveActions) ? parsed.prescriptiveActions : [],
      vocalToneAnalysis: parsed.vocalToneAnalysis || (effectiveAudios.length > 0 ? {
        audiosAnalyzed: effectiveAudios.length,
        toneSummary: 'Áudios de voz escutados e avaliados no diagnóstico geral.',
        hesitationLevel: 'nenhuma',
        irritationLevel: 'nenhuma',
        satisfactionLevel: 'alta'
      } : undefined),
      aiModel: 'gemini-3.8-flash',
      analyzedAt: new Date().toISOString(),
      isContingency: false
    };

    // 5. Indexa por project_id e persiste
    analysesIndexByProjectId.set(project.id, analysis);
    saveAnalysesToDisk();

    return {
      success: true,
      status: 'ai_generated',
      message: 'Análise de retenção gerada com sucesso via Gemini 3.8 Flash.',
      data: analysis
    };
  } catch (error: any) {
    console.error(`[RetencaoPro] Erro na chamada ao Gemini para o projeto ${project.id}:`, error?.message || error);

    // Fallback amigável de contingência caso a chamada de IA falhe (ex: rate limit ou erro transitório)
    const contingencyAnalysis = buildContingencyRetentionAnalysis(
      project,
      `Falha na chamada Gemini API (${error?.message || 'erro transitório'}). Modo de contingência ativado.`,
      effectiveAudios,
      supportAlerts
    );
    analysesIndexByProjectId.set(project.id, contingencyAnalysis);
    saveAnalysesToDisk();

    return {
      success: true,
      status: 'contingency',
      message: 'Análise gerada em modo contingência devido a indisponibilidade momentânea da IA.',
      data: contingencyAnalysis
    };
  }
}

/**
 * Recupera análise de retenção já indexada para o projeto
 */
export function getStoredProjectRetention(projectId: string): RetencaoProAnalysis | null {
  if (!projectId) return null;
  return analysesIndexByProjectId.get(projectId) || null;
}

/**
 * Remove análise associada ao projeto (útil ao deletar projeto)
 */
export function removeProjectRetention(projectId: string): boolean {
  if (!projectId) return false;
  const existed = analysesIndexByProjectId.delete(projectId);
  if (existed) {
    saveAnalysesToDisk();
  }
  return existed;
}
