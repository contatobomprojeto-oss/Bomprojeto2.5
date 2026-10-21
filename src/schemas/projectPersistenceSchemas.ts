import { z } from 'zod';

// ==============================================================================
// 1. ENUMS E CONSTANTES DE DOMÍNIO
// ==============================================================================

export const INDUSTRY_SECTORS = [
  'marketing_agency',
  'ai_agency',
  'media_buyer'
] as const;

export type IndustrySector = (typeof INDUSTRY_SECTORS)[number];
export type BusinessType = IndustrySector;

export const STAGE_ACTION_TYPES = [
  'notification_only',
  'input_request',
  'approval_request',
  'billing_payment'
] as const;

export type StageActionType = (typeof STAGE_ACTION_TYPES)[number];

export const BILLING_MODELS = [
  'single_payment',
  'installments',
  'milestone_based'
] as const;

export type BillingModel = (typeof BILLING_MODELS)[number];

export const PROJECT_PAYMENT_METHODS = [
  'pix',
  'boleto',
  'credit_card'
] as const;

export type ProjectPaymentMethod = (typeof PROJECT_PAYMENT_METHODS)[number];

export const BILLING_STATUSES = [
  'draft',
  'active',
  'completed',
  'cancelled'
] as const;

export type BillingStatus = (typeof BILLING_STATUSES)[number];

export const INVOICE_STATUSES = [
  'pending',
  'paid',
  'overdue',
  'cancelled'
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// ==============================================================================
// 2. SCHEMAS: TEMPLATES INTELIGENTES POR SETOR (ETAPAS E WHATSAPP)
// ==============================================================================

/**
 * Validação de uma etapa individual dentro de um template
 */
export const projectTemplateStageSchema = z.object({
  id: z.string().uuid({ message: 'ID da etapa do template deve ser um UUID válido' }),
  template_id: z.string().uuid({ message: 'Template ID deve ser um UUID válido' }),
  stage_number: z.number().int().min(1, { message: 'O número da etapa deve ser maior ou igual a 1' }),
  stage_name: z.string().min(2, { message: 'Nome da etapa deve ter pelo menos 2 caracteres' }).max(120),
  objective: z.string().max(1000).optional().nullable(),
  action_type: z.enum(STAGE_ACTION_TYPES),
  whatsapp_template: z.string().max(2000).optional().nullable(),
  ai_context_instruction: z.string().max(2000).optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
});

export const createProjectTemplateStageSchema = projectTemplateStageSchema.omit({
  id: true,
  template_id: true,
  created_at: true,
  updated_at: true
});

/**
 * Validação do Template Mestre de Projeto
 */
export const projectTemplateSchema = z.object({
  id: z.string().uuid({ message: 'ID do template deve ser um UUID válido' }),
  organization_id: z.string().uuid().optional().nullable(),
  sector_key: z.enum(INDUSTRY_SECTORS),
  sector_label: z.string().min(3, { message: 'Rótulo do setor deve ter pelo menos 3 caracteres' }).max(100),
  tone_of_voice: z.string().min(10, { message: 'Defina as instruções de tom de voz com no mínimo 10 caracteres' }),
  is_system_default: z.boolean().default(false),
  stages: z.array(projectTemplateStageSchema).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
});

export const createProjectTemplateSchema = z.object({
  organization_id: z.string().uuid().optional().nullable(),
  sector_key: z.enum(INDUSTRY_SECTORS),
  sector_label: z.string().min(3).max(100),
  tone_of_voice: z.string().min(10),
  is_system_default: z.boolean().default(false),
  stages: z.array(createProjectTemplateStageSchema).min(1, {
    message: 'O template deve possuir ao menos 1 etapa configurada'
  })
});

// ==============================================================================
// 3. SCHEMAS: MÓDULO FINANCEIRO FLEXÍVEL (COBRANÇAS E FATURAS)
// ==============================================================================

/**
 * Validação de Fatura/Parcela Individual (project_invoices)
 */
export const projectInvoiceSchema = z.object({
  id: z.string().uuid({ message: 'ID da fatura deve ser um UUID válido' }),
  project_billing_id: z.string().uuid({ message: 'ID do plano de faturamento deve ser um UUID válido' }),
  project_stage_id: z.string().uuid({ message: 'ID da etapa vinculada deve ser um UUID válido' }).optional().nullable(),
  installment_number: z.number().int().min(1, { message: 'Número da parcela deve ser pelo menos 1' }),
  amount: z.number().positive({ message: 'O valor da fatura deve ser maior que zero' }),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data de vencimento deve estar no formato AAAA-MM-DD' }),
  payment_link: z.string().url({ message: 'Link de pagamento deve ser uma URL válida' }).optional().nullable(),
  pix_code: z.string().optional().nullable(),
  status: z.enum(INVOICE_STATUSES).default('pending'),
  paid_at: z.string().datetime().optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
});

export const createProjectInvoiceSchema = projectInvoiceSchema.omit({
  id: true,
  project_billing_id: true,
  created_at: true,
  updated_at: true
});

/**
 * Validação do Plano Financeiro do Projeto (project_billings)
 */
export const projectBillingSchema = z.object({
  id: z.string().uuid({ message: 'ID do faturamento deve ser um UUID válido' }),
  project_id: z.string().uuid({ message: 'ID do projeto deve ser um UUID válido' }),
  billing_model: z.enum(BILLING_MODELS),
  payment_method: z.enum(PROJECT_PAYMENT_METHODS),
  total_amount: z.number().min(0, { message: 'O valor total do projeto não pode ser negativo' }),
  installments_count: z.number().int().min(1, { message: 'O número de parcelas deve ser no mínimo 1' }),
  status: z.enum(BILLING_STATUSES).default('active'),
  invoices: z.array(projectInvoiceSchema).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
});

/**
 * Schema de Criação com Validações de Consistência Financeira:
 * - À vista (single_payment): exige installments_count == 1
 * - Parcelado / Marcos: valida consistência do valor total com a soma das parcelas
 */
export const createProjectBillingSchema = z.object({
  project_id: z.string().uuid({ message: 'ID do projeto deve ser um UUID válido' }),
  billing_model: z.enum(BILLING_MODELS),
  payment_method: z.enum(PROJECT_PAYMENT_METHODS),
  total_amount: z.number().positive({ message: 'O valor total deve ser positivo' }),
  installments_count: z.number().int().min(1).default(1),
  status: z.enum(BILLING_STATUSES).default('active'),
  invoices: z.array(createProjectInvoiceSchema).min(1, {
    message: 'Pelo menos uma fatura/parcela deve ser configurada'
  })
}).superRefine((data, ctx) => {
  // Regra 1: Pagamento à vista não pode ter mais de 1 parcela
  if (data.billing_model === 'single_payment' && data.installments_count > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O modelo de pagamento à vista (single_payment) deve possuir exatamente 1 parcela',
      path: ['installments_count']
    });
  }

  // Regra 2: A quantidade de faturas enviadas deve ser compatível com installments_count
  if (data.invoices.length !== data.installments_count) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `A quantidade de faturas (${data.invoices.length}) deve coincidir com o número de parcelas informado (${data.installments_count})`,
      path: ['invoices']
    });
  }

  // Regra 3: Se houver faturas, a soma deve bater com total_amount (com tolerância de 2 centavos para arredondamento)
  const invoicesSum = data.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const diff = Math.abs(invoicesSum - data.total_amount);
  if (diff > 0.05) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `A soma das faturas (R$ ${invoicesSum.toFixed(2)}) difere do total do projeto (R$ ${data.total_amount.toFixed(2)})`,
      path: ['total_amount']
    });
  }

  // Regra 4: No modelo milestone_based, cada fatura deve vincular uma etapa correspondente
  if (data.billing_model === 'milestone_based') {
    const unlinkedIndex = data.invoices.findIndex(inv => !inv.project_stage_id);
    if (unlinkedIndex !== -1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Fatura ${unlinkedIndex + 1} no modelo por marcos deve conter o vínculo da etapa (project_stage_id)`,
        path: ['invoices', unlinkedIndex, 'project_stage_id']
      });
    }
  }
});

// ==============================================================================
// 4. TIPOS INFERIDOS EM TYPESCRIPT
// ==============================================================================

export type ProjectTemplateStage = z.infer<typeof projectTemplateStageSchema>;
export type CreateProjectTemplateStage = z.infer<typeof createProjectTemplateStageSchema>;

export type ProjectTemplate = z.infer<typeof projectTemplateSchema>;
export type CreateProjectTemplate = z.infer<typeof createProjectTemplateSchema>;

export type ProjectInvoice = z.infer<typeof projectInvoiceSchema>;
export type CreateProjectInvoice = z.infer<typeof createProjectInvoiceSchema>;

export type ProjectBilling = z.infer<typeof projectBillingSchema>;
export type CreateProjectBilling = z.infer<typeof createProjectBillingSchema>;
