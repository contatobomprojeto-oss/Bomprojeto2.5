import { Project, ProjectStage, ProjectUpdate } from '../types';
import { sendUazapiTextMessage } from '../server/uazapi';
import { getProjectBilling, getBillingInvoices } from './projectBillingService';
import { getTemplateById, getSectorFallbackTemplate, normalizeSectorKey } from './aiTemplateService';
import { ProjectInvoice } from '../schemas/projectPersistenceSchemas';
import { buildClientPortalUrl } from '../utils/portalUrl';

export interface DispatchStageUpdateResult {
  success: boolean;
  messageId?: string;
  sentMessage?: string;
  error?: string;
}

export interface DispatchInvoiceReminderResult {
  success: boolean;
  messageId?: string;
  sentMessage?: string;
  reason?: string;
  error?: string;
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
 * Dispara notificação de avanço/atualização de etapa via WhatsApp
 * Substitui dinamicamente variáveis como {{nome_cliente}}, {{link_painel}}, {{link_aprovacao}}, etc.
 */
export async function dispatchStageUpdate(
  project: Project,
  stageId: string,
  options?: {
    portalUrl?: string;
    approvalUrl?: string;
    customNote?: string;
  }
): Promise<DispatchStageUpdateResult> {
  if (!project || !project.clientPhone) {
    return { success: false, error: 'Projeto ou telefone do cliente inválido' };
  }

  const stage = project.stages.find((s) => s.id === stageId) || project.stages.find((s) => s.name === stageId) || project.stages[0];
  const stageName = stage?.name || project.currentStage;
  const trackingLink = options?.portalUrl || buildClientPortalUrl(project.id);
  const approvalLink = options?.approvalUrl || `${trackingLink}?action=approve&stage=${encodeURIComponent(stageName)}`;

  // 1. Localiza a fatura pendente relacionada ou próxima fatura
  const billing = getProjectBilling(project.id);
  const invoices = billing ? getBillingInvoices(billing.id) : [];
  const linkedInvoice = invoices.find((inv) => inv.project_stage_id === stage?.id && inv.status === 'pending')
    || invoices.find((inv) => inv.status === 'pending');
  const pixLink = linkedInvoice?.payment_link || trackingLink;

  // 2. Busca o template da etapa
  let messageTemplate = '';
  const templateId = (project as any).templateId;
  const sector = (project as any).industrySector || project.category || 'marcenaria';

  if ((stage as any)?.whatsapp_template) {
    messageTemplate = (stage as any).whatsapp_template;
  } else if (templateId) {
    const savedTemplate = getTemplateById(templateId);
    const matchingStage = savedTemplate?.stages?.find(
      (s) => s.stage_name.toLowerCase().includes(stageName.toLowerCase()) || s.id === stageId
    );
    if (matchingStage?.whatsapp_template) {
      messageTemplate = matchingStage.whatsapp_template;
    }
  }

  if (!messageTemplate) {
    const fallbackTemplate = getSectorFallbackTemplate(project.workspaceName || 'BOM Projeto', normalizeSectorKey(sector));
    const matchingStage = fallbackTemplate.stages.find(
      (s) => s.stage_name.toLowerCase().includes(stageName.toLowerCase())
    );
    messageTemplate = matchingStage?.whatsapp_template ||
      'Temos atualização do seu projeto junto à "{{empresa}}" ({{etapa}}).\n\nConfira no link 👇\n{{link_portal}}';
  }

  // 3. Substituição segura de variáveis
  const firstName = project.clientName.split(' ')[0] || project.clientName;
  const companyName = project.workspaceName || 'BOM Projeto';

  let finalMessage = messageTemplate
    .replace(/\{\{nome_cliente\}\}/gi, firstName)
    .replace(/\{\{cliente\}\}/gi, firstName)
    .replace(/\{\{projeto\}\}/gi, project.title)
    .replace(/\{\{empresa\}\}/gi, companyName)
    .replace(/\{\{etapa\}\}/gi, stageName)
    .replace(/\{\{link_painel\}\}/gi, trackingLink)
    .replace(/\{\{link_portal\}\}/gi, trackingLink)
    .replace(/\{\{link_aprovacao\}\}/gi, approvalLink)
    .replace(/\{\{link_pix\}\}/gi, pixLink);

  if (options?.customNote) {
    finalMessage += `\n\n📌 *Observação da equipe:* ${options.customNote}`;
  }

  try {
    const sendResult = await sendUazapiTextMessage({
      number: project.clientPhone,
      text: finalMessage,
      workspaceId: project.workspaceId
    });

    if (sendResult.success) {
      // Registra a atualização na linha do tempo do projeto
      const newUpdate: ProjectUpdate = {
        id: `upd-${Date.now()}`,
        timestamp: 'Agora',
        author: 'Disparador Automático',
        role: 'Sistema WhatsApp',
        stageId: stage?.id || 's-current',
        stageName,
        message: finalMessage,
        whatsappSent: true,
        photos: []
      };

      if (!project.updates) {
        project.updates = [];
      }
      project.updates.unshift(newUpdate);
      project.lastInteractionDate = 'Agora';
      project.lastInteractionText = `Disparo etapa: ${stageName}`;
      project.lastInteractionType = 'whatsapp';

      return {
        success: true,
        messageId: sendResult.messageId,
        sentMessage: finalMessage
      };
    } else {
      return {
        success: false,
        error: sendResult.error || 'Falha ao enviar mensagem via UAZAPI'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado no envio de WhatsApp'
    };
  }
}

/**
 * Envia lembrete amigável e proativo de vencimento de fatura com link e código Pix
 */
export async function dispatchInvoiceReminder(
  invoice: ProjectInvoice,
  project: Project,
  options?: {
    reminderType?: 'upcoming' | 'due_today' | 'overdue';
    portalUrl?: string;
  }
): Promise<DispatchInvoiceReminderResult> {
  if (!invoice) {
    return { success: false, reason: 'invoice_not_found', error: 'Fatura não encontrada' };
  }

  if (invoice.status === 'paid') {
    return { success: false, reason: 'already_paid', error: 'Esta fatura já está quitada' };
  }

  if (!project || !project.clientPhone) {
    return { success: false, reason: 'no_client_phone', error: 'Projeto sem telefone de WhatsApp cadastrado' };
  }

  if (project.billingNotificationsEnabled === false) {
    return { 
      success: false, 
      reason: 'billing_notifications_disabled', 
      error: 'Notificações de cobrança desativadas individualmente para este cliente/projeto' 
    };
  }

  const firstName = project.clientName.split(' ')[0] || project.clientName;
  const companyName = project.workspaceName || 'BOM Projeto';
  const paymentLink = invoice.payment_link || options?.portalUrl || `https://bomprojeto.com/portal/${project.id}`;
  const amountStr = formatCurrencyBRL(invoice.amount);
  const dueDateStr = formatDateBRL(invoice.due_date);

  const billing = getProjectBilling(project.id);
  const totalInstallments = billing?.installments_count || 1;

  let message = '';
  const type = options?.reminderType || (invoice.status === 'overdue' ? 'overdue' : 'upcoming');

  if (type === 'due_today') {
    message = `🔔 Olá, ${firstName}! Tudo bem? Passando para lembrar que a *Parcela ${invoice.installment_number} de ${totalInstallments}* do seu projeto *${project.title}* na ${companyName} vence *HOJE* (${dueDateStr}).\n\n💰 *Valor:* ${amountStr}`;
  } else if (type === 'overdue') {
    message = `⚠️ Olá, ${firstName}! Consta em aberto a *Parcela ${invoice.installment_number} de ${totalInstallments}* do seu projeto *${project.title}*, com vencimento em ${dueDateStr}.\n\n💰 *Valor:* ${amountStr}\n\nCaso já tenha realizado o pagamento, favor desconsiderar.`;
  } else {
    message = `👋 Olá, ${firstName}! Tudo bem? Segue o lembrete da próxima parcela do seu projeto *${project.title}* na ${companyName}:\n\n📋 *Parcela:* ${invoice.installment_number} de ${totalInstallments}\n📅 *Vencimento:* ${dueDateStr}\n💰 *Valor:* ${amountStr}`;
  }

  message += `\n\n💳 *Pague via Pix Copia e Cola ou Cartão no link seguro:*\n👉 ${paymentLink}`;

  if (invoice.pix_code) {
    message += `\n\n📲 *Código Pix Copia e Cola:*\n\`${invoice.pix_code}\``;
  }

  message += `\n\nQualquer dúvida, nossa equipe está à disposição! ✨`;

  try {
    const sendResult = await sendUazapiTextMessage({
      number: project.clientPhone,
      text: message,
      workspaceId: project.workspaceId
    });

    if (sendResult.success) {
      return {
        success: true,
        messageId: sendResult.messageId,
        sentMessage: message
      };
    } else {
      return {
        success: false,
        error: sendResult.error || 'Falha ao despachar lembrete via UAZAPI'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado no envio de lembrete de cobrança'
    };
  }
}
