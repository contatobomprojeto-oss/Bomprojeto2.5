import { GoogleGenAI } from '@google/genai';
import { Project } from '../types';
import { getProjectBilling, getBillingInvoices } from './projectBillingService';
import { getTemplateById, getSectorFallbackTemplate, normalizeSectorKey } from './aiTemplateService';
import { ProjectInvoice } from '../schemas/projectPersistenceSchemas';
import { buildClientPortalUrl } from '../utils/portalUrl';

export interface HandleClientMessageInput {
  senderPhone: string;
  messageText: string;
  project?: Project;
  portalUrl?: string;
  historyCount?: number;
}

export interface ClientMessageHandleResult {
  replyText: string;
  intent: 'project_status' | 'billing_inquiry' | 'urgent_support' | 'general';
  invoicesContextFound: boolean;
}

/**
 * Formata um valor numérico para Moeda Brasileira (R$)
 */
function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/**
 * Converte data ISO (AAAA-MM-DD) para formato legível DD/MM/AAAA
 */
function formatDateBRL(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Classifica a intenção primária da mensagem
 */
function detectIntent(text: string): 'project_status' | 'billing_inquiry' | 'urgent_support' | 'general' {
  const lower = text.toLowerCase();
  if (
    lower.includes('pix') ||
    lower.includes('boleto') ||
    lower.includes('pagar') ||
    lower.includes('pagamento') ||
    lower.includes('parcela') ||
    lower.includes('fatura') ||
    lower.includes('cobranca') ||
    lower.includes('valor') ||
    lower.includes('chave') ||
    lower.includes('vencimento')
  ) {
    return 'billing_inquiry';
  }

  if (
    lower.includes('urgente') ||
    lower.includes('parou') ||
    lower.includes('atrasado') ||
    lower.includes('problema') ||
    lower.includes('defeito') ||
    lower.includes('estragou') ||
    lower.includes('socorro') ||
    lower.includes('cancelar')
  ) {
    return 'urgent_support';
  }

  if (
    lower.includes('status') ||
    lower.includes('como ta') ||
    lower.includes('como está') ||
    lower.includes('andamento') ||
    lower.includes('etapa') ||
    lower.includes('quando fica pronto') ||
    lower.includes('prazo') ||
    lower.includes('entrega') ||
    lower.includes('fotos')
  ) {
    return 'project_status';
  }

  return 'general';
}

/**
 * Processa a mensagem recebida do cliente final no WhatsApp com contexto enriquecido da IA
 */
export async function handleIncomingClientMessage(
  input: HandleClientMessageInput
): Promise<ClientMessageHandleResult> {
  const { senderPhone, messageText, project, portalUrl, historyCount = 1 } = input;
  const intent = detectIntent(messageText);

  // Se não localizou nenhum projeto correspondente ao número
  if (!project) {
    const fallbackText =
      'Olá! Seja bem-vindo ao nosso atendimento via WhatsApp. Por favor, me informe seu nome completo ou o código do seu pedido (ex: #PROJ-101) para que eu possa localizar a sua produção e te atender com todos os detalhes!';
    return {
      replyText: fallbackText,
      intent,
      invoicesContextFound: false
    };
  }

  // 1. Busca dados da Etapa Atual e Instrução Específica da IA
  const currentStageObj = project.stages.find((s) => s.name === project.currentStage || s.status === 'current') || project.stages[0];
  let stageAiInstruction = '';

  // 2. Busca Template do Setor para obter o Tom de Voz
  let toneOfVoice = 'Profissional, acolhedor e técnico. Transmite clareza nos prazos e transparência.';
  const templateId = (project as any).templateId;
  const projectSector = (project as any).industrySector || project.category || 'marcenaria';
  const sectorKey = normalizeSectorKey(projectSector);

  if ((currentStageObj as any)?.ai_context_instruction) {
    stageAiInstruction = (currentStageObj as any).ai_context_instruction;
  } else if (templateId) {
    const savedTemplate = getTemplateById(templateId);
    if (savedTemplate) {
      toneOfVoice = savedTemplate.tone_of_voice;
      const matchingStage = savedTemplate.stages?.find(
        (stg) => stg.stage_name.toLowerCase().includes(currentStageObj?.name.toLowerCase() || '')
      );
      if (matchingStage?.ai_context_instruction) {
        stageAiInstruction = matchingStage.ai_context_instruction;
      }
    }
  }

  if (!stageAiInstruction) {
    const fallbackTemplate = getSectorFallbackTemplate(project.workspaceName || 'BOM Projeto', sectorKey);
    const fallbackStage = fallbackTemplate.stages.find(
      (stg) => stg.stage_name.toLowerCase().includes(currentStageObj?.name.toLowerCase() || '')
    );
    if (fallbackStage?.ai_context_instruction) {
      stageAiInstruction = fallbackStage.ai_context_instruction;
    }
  }

  // 3. Busca Faturas do Projeto em project_billings / project_invoices
  const billing = getProjectBilling(project.id);
  const invoices: ProjectInvoice[] = billing ? getBillingInvoices(billing.id) : [];

  let invoicesContextText = 'Nenhuma fatura configurada no novo módulo financeiro.';
  let pendingInvoicesList: ProjectInvoice[] = [];

  if (invoices.length > 0) {
    pendingInvoicesList = invoices.filter((inv) => inv.status === 'pending' || inv.status === 'overdue');
    const totalCount = invoices.length;

    invoicesContextText = invoices
      .map((inv) => {
        const statusLabel = inv.status === 'paid' ? 'PAGA' : inv.status === 'overdue' ? 'VENCIDA' : 'PENDENTE';
        return `• Parcela ${inv.installment_number} de ${totalCount}: ${formatCurrencyBRL(inv.amount)} | Vencimento: ${formatDateBRL(inv.due_date)} | Status: ${statusLabel} ${
          inv.status !== 'paid' && inv.pix_code ? `| Pix Copia e Cola: ${inv.pix_code}` : ''
        }`;
      })
      .join('\n');
  } else if (project.installments && project.installments.length > 0) {
    // Retrocompatibilidade com array installments existente no projeto
    invoicesContextText = project.installments
      .map((inst) => `• ${inst.label}: ${formatCurrencyBRL(inst.amount)} | Status: ${inst.status.toUpperCase()} | Vencimento: ${inst.dueDate}`)
      .join('\n');
  }

  const trackingLink = portalUrl || (project ? buildClientPortalUrl(project.id) : '');

  // 4. Monta o Prompt Enriquecido para o Gemini 2.5 Flash
  const systemInstruction = `Você é o Assistente Virtual Oficial via WhatsApp da empresa "${project.workspaceName || 'BOM Projeto'}", prestando atendimento direto ao cliente final sobre o projeto em andamento.

DIRETRIZES DE COMUNICAÇÃO:
1. Tom de Voz da Empresa: ${toneOfVoice}
2. Contexto da Etapa Atual: ${stageAiInstruction || 'Forneça atualizações tranquilizadoras sobre a execução e cumprimento dos prazos.'}
3. REGRAS RÍGIDAS DE RETORNO:
   - Responda de forma humanizada, calorosa e concisa (máximo de 3 a 4 frases).
   - Se o cliente perguntar sobre pagamentos, parcelas, Pix ou valores, use ESTRITAMENTE as informações da seção de FATURAS DO CLIENTE. Informe o número exato da parcela, o valor em R$, a data de vencimento e, se houver código Pix, forneça-o com clareza.
   - NUNCA invente prazos de entrega, datas de visita técnica ou valores que não estejam explicitamente declarados no contexto. Se não souber de uma data específica que o cliente pedir, diga educadamente que a equipe técnica entrará em contato para confirmar.
   - Se for um caso urgente de suporte técnico ou reclamação, acolha com empatia e confirme que um responsável da equipe foi notificado.
   - Sempre que fizer sentido, indique que fotos e o andamento detalhado estão disponíveis no link sem senha do portal: ${trackingLink}.`;

  const userPrompt = `DADOS DO PROJETO E DO CLIENTE:
- Nome do Cliente: ${project.clientName}
- Título do Projeto: ${project.title} (${project.code})
- Categoria / Setor: ${projectSector}
- Etapa Atual: ${project.currentStage} (${project.progressPercent}% executado)
- Previsão de Entrega Contratual: ${project.deliveryDate}
- Link do Portal do Cliente: ${trackingLink}

FATURAS DO CLIENTE:
${invoicesContextText}

HISTÓRICO DA CONVERSA:
- Mensagens nesta sessão: ${historyCount}
- Última mensagem enviada pelo cliente no WhatsApp:
"${messageText}"

Gere a resposta perfeita para enviar no WhatsApp do cliente:`;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Resposta Fallback Estruturada
    const firstName = project.clientName.split(' ')[0] || 'Cliente';
    let fallbackResponse = `Olá, ${firstName}! Tudo bem? Seu projeto *${project.title}* está na etapa *${project.currentStage}* (${project.progressPercent}% concluído).`;

    if (intent === 'billing_inquiry' && pendingInvoicesList.length > 0) {
      const nextInv = pendingInvoicesList[0];
      fallbackResponse += `\n\nSobre o pagamento: sua parcela ${nextInv.installment_number} no valor de ${formatCurrencyBRL(nextInv.amount)} tem vencimento em ${formatDateBRL(nextInv.due_date)}. Você pode pagar via Pix Copia e Cola no link:\n👉 ${nextInv.payment_link || trackingLink}`;
    } else {
      fallbackResponse += `\n\nVocê pode acompanhar todas as fotos e detalhes pelo seu portal exclusivo:\n👉 ${trackingLink}`;
    }

    return {
      replyText: fallbackResponse,
      intent,
      invoicesContextFound: pendingInvoicesList.length > 0
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.25
      }
    });

    const reply = response.text?.trim();
    if (!reply) {
      throw new Error('Retorno vazio do Gemini');
    }

    return {
      replyText: reply,
      intent,
      invoicesContextFound: pendingInvoicesList.length > 0
    };
  } catch (error) {
    console.warn('[whatsappAiHandler] Falha ao invocar Gemini 2.5 Flash, usando resposta fallback contextualizada:', error);

    const firstName = project.clientName.split(' ')[0] || 'Cliente';
    let fallbackResponse = `Olá, ${firstName}! Tudo bem? Seu projeto *${project.title}* está na etapa *${project.currentStage}* (${project.progressPercent}% concluído).`;

    if (intent === 'billing_inquiry' && pendingInvoicesList.length > 0) {
      const nextInv = pendingInvoicesList[0];
      fallbackResponse += `\n\nSua próxima parcela (${nextInv.installment_number} de ${invoices.length}) no valor de ${formatCurrencyBRL(nextInv.amount)} vence em ${formatDateBRL(nextInv.due_date)}.\n👉 Link de pagamento: ${nextInv.payment_link || trackingLink}`;
    } else {
      fallbackResponse += `\n\nVocê pode conferir o cronograma e registros técnicos no seu portal:\n👉 ${trackingLink}`;
    }

    return {
      replyText: fallbackResponse,
      intent,
      invoicesContextFound: pendingInvoicesList.length > 0
    };
  }
}
