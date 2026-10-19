import crypto from 'crypto';
import {
  BillingModel,
  ProjectPaymentMethod,
  ProjectBilling,
  ProjectInvoice
} from '../schemas/projectPersistenceSchemas';
import { Installment } from '../types';
import { generatePixEmv } from '../utils/pixService';

export interface MilestoneInput {
  stage_id: string;
  stage_name?: string;
  percentage?: number;
  amount?: number;
  due_date?: string;
}

export interface SetupBillingInput {
  billing_model: BillingModel;
  payment_method: ProjectPaymentMethod;
  total_amount: number;
  installments_count?: number;
  first_due_date?: string;
  milestones?: MilestoneInput[];
  pix_key?: string;
  merchant_name?: string;
}

export interface SetupBillingResult {
  billing: ProjectBilling;
  invoices: ProjectInvoice[];
  installments: Installment[];
}

/**
 * Armazenamento em memória de billings e invoices com persistência em runtime
 */
const billingStore = new Map<string, ProjectBilling>(); // key: billing_id
const projectBillingIndex = new Map<string, string>(); // key: project_id -> billing_id
const invoiceStore = new Map<string, ProjectInvoice>(); // key: invoice_id

/**
 * Auxiliar para formatar datas no formato ISO AAAA-MM-DD
 */
function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adiciona meses mantendo o dia aproximado
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Gera um payload Pix Copia e Cola 100% oficial do Banco Central (EMVCo BR Code com Tag 01 e CRC16)
 */
export function generatePixCopiaECola(
  projectId: string,
  installmentNumber: number,
  amount: number,
  pixKey?: string,
  merchantName?: string
): string {
  const effectiveKey = (pixKey || '').trim() || 'henrique.ferrazms@gmail.com';
  return generatePixEmv({
    pixKey: effectiveKey,
    merchantName: merchantName || 'BOMPROJETO GESTAO',
    merchantCity: 'SAO PAULO',
    amount
  });
}

/**
 * Configura o plano financeiro do projeto calculando as faturas/parcelas
 * conforme o modelo de cobrança: single_payment, installments ou milestone_based.
 */
export function setupProjectBilling(projectId: string, input: SetupBillingInput): SetupBillingResult {
  if (!projectId) {
    throw new Error('projectId é obrigatório para configurar o faturamento do projeto');
  }

  const totalAmount = Number(input.total_amount);
  if (isNaN(totalAmount) || totalAmount < 0) {
    throw new Error('total_amount deve ser um número positivo');
  }

  const billingId = crypto.randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();

  // Define a data base do primeiro vencimento
  let baseDate = new Date();
  if (input.first_due_date) {
    const parsed = new Date(input.first_due_date);
    if (!isNaN(parsed.getTime())) {
      baseDate = parsed;
    }
  }

  const model = input.billing_model || 'single_payment';
  const method = input.payment_method || 'pix';
  const invoices: ProjectInvoice[] = [];

  // ============================================================================
  // a) MODELO: single_payment (À vista)
  // ============================================================================
  if (model === 'single_payment') {
    const invoiceId = crypto.randomUUID();
    const dueDateStr = formatDateToYMD(baseDate);
    const pixCode = generatePixCopiaECola(projectId, 1, totalAmount, input.pix_key, input.merchant_name);

    const singleInvoice: ProjectInvoice = {
      id: invoiceId,
      project_billing_id: billingId,
      project_stage_id: null,
      installment_number: 1,
      amount: totalAmount,
      due_date: dueDateStr,
      payment_link: `https://bomprojeto.com/pay/${invoiceId}`,
      pix_code: pixCode,
      status: 'pending',
      paid_at: null,
      created_at: nowIso,
      updated_at: nowIso
    };

    invoices.push(singleInvoice);
  }

  // ============================================================================
  // b) MODELO: installments (Parcelamento Recorrente / Mensal)
  // ============================================================================
  else if (model === 'installments') {
    const count = Math.max(1, input.installments_count || 2);
    const baseInstallment = Math.floor((totalAmount / count) * 100) / 100;
    // O resíduo de centavos é adicionado à primeira parcela para garantir soma 100% exata
    const remainder = Number((totalAmount - baseInstallment * count).toFixed(2));

    for (let i = 1; i <= count; i++) {
      const invoiceId = crypto.randomUUID();
      const installmentAmount = i === 1 ? Number((baseInstallment + remainder).toFixed(2)) : baseInstallment;
      const dueDate = addMonths(baseDate, i - 1);
      const dueDateStr = formatDateToYMD(dueDate);
      const pixCode = generatePixCopiaECola(projectId, i, installmentAmount, input.pix_key, input.merchant_name);

      const invoice: ProjectInvoice = {
        id: invoiceId,
        project_billing_id: billingId,
        project_stage_id: null,
        installment_number: i,
        amount: installmentAmount,
        due_date: dueDateStr,
        payment_link: `https://bomprojeto.com/pay/${invoiceId}`,
        pix_code: pixCode,
        status: 'pending',
        paid_at: null,
        created_at: nowIso,
        updated_at: nowIso
      };

      invoices.push(invoice);
    }
  }

  // ============================================================================
  // c) MODELO: milestone_based (Por Marcos de Etapas do Projeto)
  // ============================================================================
  else if (model === 'milestone_based') {
    const milestones = input.milestones && input.milestones.length > 0
      ? input.milestones
      : [
          { stage_id: 'stage-1', percentage: 50 },
          { stage_id: 'stage-final', percentage: 50 }
        ];

    let accumulatedAllocated = 0;

    milestones.forEach((milestone, index) => {
      const isLast = index === milestones.length - 1;
      let installmentAmount = 0;

      if (milestone.amount && milestone.amount > 0) {
        installmentAmount = Number(milestone.amount.toFixed(2));
      } else if (milestone.percentage && milestone.percentage > 0) {
        installmentAmount = Number(((totalAmount * milestone.percentage) / 100).toFixed(2));
      } else {
        const remainingCount = milestones.length - index;
        const remainingAmount = totalAmount - accumulatedAllocated;
        installmentAmount = Number((remainingAmount / remainingCount).toFixed(2));
      }

      // No último marco, garante exatidão matemática total
      if (isLast) {
        installmentAmount = Number((totalAmount - accumulatedAllocated).toFixed(2));
      }

      accumulatedAllocated += installmentAmount;

      const invoiceId = crypto.randomUUID();
      const milestoneDueDate = milestone.due_date || formatDateToYMD(addMonths(baseDate, index));
      const pixCode = generatePixCopiaECola(projectId, index + 1, installmentAmount, input.pix_key, input.merchant_name);

      const invoice: ProjectInvoice = {
        id: invoiceId,
        project_billing_id: billingId,
        project_stage_id: milestone.stage_id,
        installment_number: index + 1,
        amount: installmentAmount,
        due_date: milestoneDueDate,
        payment_link: `https://bomprojeto.com/pay/${invoiceId}`,
        pix_code: pixCode,
        status: 'pending',
        paid_at: null,
        created_at: nowIso,
        updated_at: nowIso
      };

      invoices.push(invoice);
    });
  }

  // Cria a entidade principal do faturamento do projeto
  const billing: ProjectBilling = {
    id: billingId,
    project_id: projectId,
    billing_model: model,
    payment_method: method,
    total_amount: totalAmount,
    installments_count: invoices.length,
    status: 'active',
    invoices,
    created_at: nowIso,
    updated_at: nowIso
  };

  // Salva na persistência em memória
  billingStore.set(billingId, billing);
  projectBillingIndex.set(projectId, billingId);
  invoices.forEach((inv) => invoiceStore.set(inv.id, inv));

  // Converte faturas para o formato Installment do projeto (retrocompatibilidade)
  const installments = convertInvoicesToInstallments(invoices, totalAmount);

  return { billing, invoices, installments };
}

/**
 * Converte as faturas do novo modelo para a interface Installment do App
 */
export function convertInvoicesToInstallments(invoices: ProjectInvoice[], totalAmount: number): Installment[] {
  return invoices.map((inv) => {
    const pct = totalAmount > 0 ? Math.round((inv.amount / totalAmount) * 100) : 0;
    return {
      number: inv.installment_number,
      label: `${inv.installment_number}ª Parcela (${pct}%)`,
      percentage: pct,
      amount: inv.amount,
      status: inv.status === 'paid' ? 'paid' : 'pending',
      dueDate: inv.due_date,
      paidDate: inv.paid_at || undefined,
      paymentMethod: 'Pix Dinâmico',
      authCode: inv.status === 'paid' ? `AUTH-${inv.id.slice(-6).toUpperCase()}` : undefined,
      pixQrCode: inv.pix_code || undefined
    };
  });
}

/**
 * Busca o faturamento cadastrado para um projeto
 */
export function getProjectBilling(projectId: string): ProjectBilling | undefined {
  const billingId = projectBillingIndex.get(projectId);
  if (!billingId) return undefined;
  return billingStore.get(billingId);
}

/**
 * Busca todas as faturas de um faturamento
 */
export function getBillingInvoices(billingId: string): ProjectInvoice[] {
  const billing = billingStore.get(billingId);
  if (!billing) return [];
  return billing.invoices || [];
}

/**
 * Marca uma fatura específica como paga, atualizando o status do billing se todas estiverem pagas
 * Sem quebrar ou alterar de forma inconsistente o status do projeto.
 */
export function markInvoiceAsPaid(
  invoiceId: string,
  details?: { paidAt?: string; paymentMethod?: string; authCode?: string }
): { success: boolean; invoice?: ProjectInvoice; billing?: ProjectBilling; allPaid: boolean } {
  const invoice = invoiceStore.get(invoiceId);
  if (!invoice) {
    return { success: false, allPaid: false };
  }

  const nowIso = details?.paidAt || new Date().toISOString();
  invoice.status = 'paid';
  invoice.paid_at = nowIso;
  invoice.updated_at = nowIso;
  invoiceStore.set(invoiceId, invoice);

  // Atualiza no billing pai
  const billing = billingStore.get(invoice.project_billing_id);
  let allPaid = false;

  if (billing && billing.invoices) {
    const parentInvoiceIndex = billing.invoices.findIndex((inv) => inv.id === invoiceId);
    if (parentInvoiceIndex !== -1) {
      billing.invoices[parentInvoiceIndex] = invoice;
    }

    allPaid = billing.invoices.every((inv) => inv.status === 'paid');
    if (allPaid) {
      billing.status = 'completed';
    }
    billing.updated_at = nowIso;
    billingStore.set(billing.id, billing);
  }

  return {
    success: true,
    invoice,
    billing,
    allPaid
  };
}
