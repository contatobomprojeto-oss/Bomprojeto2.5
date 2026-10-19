/**
 * BOMProjeto - Integração Oficial Mercado Pago Subscriptions (Produção)
 * Credenciais Oficiais Ativas de Produção
 */

export const DEFAULT_MP_PUBLIC_KEY = 'APP_USR-e518ea4d-6432-4cf6-9615-4a9fb87fcf7e';
export const DEFAULT_MP_ACCESS_TOKEN = 'APP_USR-953693585260394-082010-e3f0f1deb9b0d5d612ba39e71e7e781d-402745499';
export const DEFAULT_MP_CLIENT_ID = '953693585260394';
export const DEFAULT_MP_CLIENT_SECRET = 'xP69tRvqcMuoqd6HMNlDpjoLkCj9NDW8';

export interface MpPlanPayload {
  reason: string;
  auto_recurring: {
    frequency: number;
    frequency_type: 'days' | 'months';
    repetitions?: number;
    billing_day?: number;
    billing_day_proportional?: boolean;
    free_trial?: {
      frequency: number;
      frequency_type: 'days' | 'months';
    };
    transaction_amount: number;
    currency_id: string; // 'BRL'
  };
  payment_methods_allowed?: {
    payment_types?: Array<{ id?: string }>;
    payment_methods?: Array<{ id?: string }>;
  };
  back_url: string;
}

export interface MpSubscriptionPayload {
  preapproval_plan_id: string;
  reason: string;
  external_reference: string;
  payer_email: string;
  card_token_id?: string;
  auto_recurring?: {
    frequency: number;
    frequency_type: 'days' | 'months';
    start_date?: string;
    end_date?: string;
    transaction_amount: number;
    currency_id: string; // 'BRL'
  };
  back_url: string;
  status?: 'authorized' | 'pending' | 'cancelled';
}

interface CachedPlan {
  id: string;
  reason: string;
  init_point?: string;
  status?: string;
  auto_recurring?: any;
  isMock?: boolean;
}

// In-memory cache for created plans to avoid duplicating plans unnecessarily
const cachedPlans: Record<string, CachedPlan> = {};

export function getMercadoPagoAccessToken(): string {
  return (
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    process.env.MP_ACCESS_TOKEN ||
    process.env.PAYMENT_SECRET_KEY ||
    DEFAULT_MP_ACCESS_TOKEN
  ).trim();
}

export function getMercadoPagoPublicKey(): string {
  return (
    process.env.MERCADO_PAGO_PUBLIC_KEY ||
    process.env.MP_PUBLIC_KEY ||
    process.env.PAYMENT_PUBLIC_KEY ||
    DEFAULT_MP_PUBLIC_KEY
  ).trim();
}

export function isMercadoPagoConfigured(): boolean {
  const token = getMercadoPagoAccessToken();
  return Boolean(token && token.trim().length > 15);
}

export interface MpTranslatedError {
  title: string;
  message: string;
  reasonCode: 
    | 'insufficient_amount' 
    | 'call_for_authorize' 
    | 'card_disabled' 
    | 'invalid_security_code' 
    | 'invalid_date' 
    | 'invalid_card_number' 
    | 'same_user' 
    | 'unsupported_recurring' 
    | 'high_risk' 
    | 'bad_document' 
    | 'generic';
  actionPrompt: string;
  canRetry: boolean;
  suggestPix: boolean;
}

/**
 * Analisa e traduz erros do Mercado Pago de forma estruturada para exibição na UI
 */
export function analyzeMpError(data: any): MpTranslatedError {
  if (!data) {
    return {
      title: 'Erro de Pagamento',
      message: 'Não foi possível processar a transação com a operadora do cartão.',
      reasonCode: 'generic',
      actionPrompt: 'Verifique se os dados estão corretos ou tente pagar via Pix.',
      canRetry: true,
      suggestPix: true
    };
  }

  // Coleta todas as causas possíveis da resposta do Mercado Pago
  const causes: string[] = [];
  if (Array.isArray(data.cause_error)) {
    data.cause_error.forEach((c: any) => causes.push(c.description || c.code || ''));
  }
  if (Array.isArray(data.cause)) {
    data.cause.forEach((c: any) => causes.push(c.description || c.code || ''));
  }
  if (Array.isArray(data.causes)) {
    data.causes.forEach((c: any) => causes.push(c.description || c.code || ''));
  }

  const rawMsg = [
    data.message || '',
    data.error || '',
    data.status_detail || '',
    data.code || '',
    ...causes
  ].join(' ').toLowerCase();

  // 1. Falta de saldo ou limite
  if (
    rawMsg.includes('cc_rejected_insufficient_amount') ||
    rawMsg.includes('insufficient_amount') ||
    rawMsg.includes('insufficient_funds') ||
    rawMsg.includes('saldo insuficiente') ||
    rawMsg.includes('limite insuficiente')
  ) {
    return {
      title: 'Saldo ou Limite Insuficiente',
      message: 'O pagamento não foi aprovado pelo banco emissor por falta de saldo ou limite disponível no cartão de crédito.',
      reasonCode: 'insufficient_amount',
      actionPrompt: 'Aumente o limite temporário no app do seu banco, utilize outro cartão com limite disponível ou faça o pagamento à vista via Pix com liberação instantânea.',
      canRetry: true,
      suggestPix: true
    };
  }

  // 2. Bloqueio preventivo / ligar para autorizar
  if (
    rawMsg.includes('cc_rejected_call_for_authorize') ||
    rawMsg.includes('call_for_authorize') ||
    rawMsg.includes('call for authorize') ||
    rawMsg.includes('autorização necessária') ||
    rawMsg.includes('autorizar junto ao banco')
  ) {
    return {
      title: 'Bloqueio Preventivo pela Operadora',
      message: 'O pagamento foi bloqueado preventivamente pelo banco emissor do cartão por motivos de segurança.',
      reasonCode: 'call_for_authorize',
      actionPrompt: 'Acesse o aplicativo do seu banco para autorizar compras no Mercado Pago ou ligue no telefone impresso no verso do cartão. Para liberar seu plano agora sem esperar, pague com Pix.',
      canRetry: true,
      suggestPix: true
    };
  }

  // 3. Cartão desativado ou bloqueado
  if (
    rawMsg.includes('cc_rejected_card_disabled') ||
    rawMsg.includes('card_disabled') ||
    rawMsg.includes('cartão bloqueado') ||
    rawMsg.includes('cartão desativado')
  ) {
    return {
      title: 'Cartão Bloqueado ou Desativado',
      message: 'O cartão informado está desativado, bloqueado ou impossibilitado de realizar transações online.',
      reasonCode: 'card_disabled',
      actionPrompt: 'Desbloqueie o cartão no aplicativo do seu banco ou utilize outro cartão de crédito ativo.',
      canRetry: true,
      suggestPix: true
    };
  }

  // 4. Código CVV incorreto
  if (
    rawMsg.includes('cc_rejected_bad_filled_security_code') ||
    rawMsg.includes('bad_filled_security_code') ||
    rawMsg.includes('security_code') ||
    rawMsg.includes('código de segurança')
  ) {
    return {
      title: 'Código de Segurança (CVV) Incorreto',
      message: 'O código de segurança de 3 ou 4 dígitos informado no formulário não confere com o cartão.',
      reasonCode: 'invalid_security_code',
      actionPrompt: 'Verifique o código impresso no verso do seu cartão físico ou no cartão virtual gerado no app do banco e preencha novamente.',
      canRetry: true,
      suggestPix: false
    };
  }

  // 5. Data de validade incorreta ou vencida
  if (
    rawMsg.includes('cc_rejected_bad_filled_date') ||
    rawMsg.includes('bad_filled_date') ||
    rawMsg.includes('expiration_date') ||
    rawMsg.includes('expiration_month') ||
    rawMsg.includes('expiration_year') ||
    rawMsg.includes('cartão vencido')
  ) {
    return {
      title: 'Data de Validade Incorreta ou Vencida',
      message: 'A data de vencimento (mês/ano) do cartão é inválida ou o cartão encontra-se expirado.',
      reasonCode: 'invalid_date',
      actionPrompt: 'Confira a data de validade impressa no cartão (formato MM/AA) e tente novamente.',
      canRetry: true,
      suggestPix: false
    };
  }

  // 6. Número do cartão inválido ou Luhn failed
  if (
    rawMsg.includes('cc_rejected_bad_filled_card_number') ||
    rawMsg.includes('bad_filled_card_number') ||
    rawMsg.includes('luhn failed') ||
    rawMsg.includes('invalid parameter \'card_number\'')
  ) {
    return {
      title: 'Número do Cartão Inválido',
      message: 'O número de 16 dígitos informado não corresponde a um cartão de crédito válido.',
      reasonCode: 'invalid_card_number',
      actionPrompt: 'Revise os dígitos do seu cartão com atenção e redigite o número.',
      canRetry: true,
      suggestPix: false
    };
  }

  // 7. Cartão não suporta assinatura recorrente
  if (
    rawMsg.includes('unsupported_credit_card_for_recurring_payment') ||
    rawMsg.includes('card_type_not_allowed') ||
    rawMsg.includes('code":109') ||
    rawMsg.includes('code 109')
  ) {
    return {
      title: 'Cartão Não Suporta Cobrança Recorrente',
      message: 'O cartão informado (como cartões pré-pagos ou virtuais de uso único) não aceita planos de assinatura recorrente automática.',
      reasonCode: 'unsupported_recurring',
      actionPrompt: 'Utilize um cartão de crédito tradicional de banco ou assine com o plano anual à vista via Pix com 10% de desconto.',
      canRetry: true,
      suggestPix: true
    };
  }

  // 8. E-mail do recebedor igual ao do pagador
  if (
    (rawMsg.includes('collector_id') && rawMsg.includes('payer_id')) ||
    rawMsg.includes('cannot be the same user')
  ) {
    return {
      title: 'E-mail Conflitante com a Conta Recebedora',
      message: 'O e-mail informado para a assinatura pertence à própria conta administradora do Mercado Pago (henrique.ferrazms@gmail.com).',
      reasonCode: 'same_user',
      actionPrompt: 'Informe o e-mail real do cliente assinante no campo de faturamento para que o Mercado Pago processe a cobrança.',
      canRetry: true,
      suggestPix: false
    };
  }

  // 9. Documento (CPF / CNPJ)
  if (rawMsg.includes('identification') || rawMsg.includes('cpf')) {
    return {
      title: 'CPF ou CNPJ Inválido',
      message: 'O documento do titular do cartão é obrigatório para emissão de nota e autorização pelo Mercado Pago.',
      reasonCode: 'bad_document',
      actionPrompt: 'Preencha o CPF ou CNPJ completo do titular do cartão.',
      canRetry: true,
      suggestPix: false
    };
  }

  // 10. Antifraude / High Risk
  if (rawMsg.includes('high_risk') || rawMsg.includes('antifraude')) {
    return {
      title: 'Transação Não Autorizada pela Operadora',
      message: 'O pagamento não foi liberado pelas políticas de segurança da instituição do cartão.',
      reasonCode: 'high_risk',
      actionPrompt: 'Tente outro cartão de crédito emitido por uma instituição bancária diferente ou realize o pagamento instantâneo via Pix.',
      canRetry: true,
      suggestPix: true
    };
  }

  const cleanCause = causes[0] || data.message || 'Falha ao processar pagamento com o Mercado Pago.';
  return {
    title: 'Pagamento Não Aprovado',
    message: cleanCause,
    reasonCode: 'generic',
    actionPrompt: 'Verifique os dados informados, tente outro cartão de crédito ou pague via Pix para ativação imediata.',
    canRetry: true,
    suggestPix: true
  };
}

/**
 * Traduz erros do Mercado Pago para mensagens claras em português
 */
export function translateMpError(data: any): string {
  const analyzed = analyzeMpError(data);
  return `${analyzed.title}: ${analyzed.message} ${analyzed.actionPrompt}`;
}

/**
 * Tokeniza com segurança o cartão de crédito diretamente na API de Produção do Mercado Pago
 */
export async function tokenizeCard(card: {
  cardNumber: string;
  cardHolder: string;
  cardExpiry: string; // MM/AA ou MM/AAAA
  cardCvv: string;
  cpfCnpj?: string;
}): Promise<string> {
  const token = getMercadoPagoAccessToken();
  const publicKey = getMercadoPagoPublicKey();

  const cleanNumber = card.cardNumber.replace(/\D/g, '');
  const parts = card.cardExpiry.split('/');
  const expMonth = parseInt(parts[0], 10);
  let expYear = parseInt(parts[1], 10);
  if (expYear < 100) expYear += 2000;

  let cleanDoc = (card.cpfCnpj || '').replace(/\D/g, '');
  if (!cleanDoc || cleanDoc.length < 11) {
    cleanDoc = '19119119100'; // CPF válido padrão para tokenização caso omitido
  }

  const payload: any = {
    card_number: cleanNumber,
    cardholder: {
      name: (card.cardHolder || 'CLIENTE ASSINANTE').trim().toUpperCase(),
      identification: {
        type: cleanDoc.length > 11 ? 'CNPJ' : 'CPF',
        number: cleanDoc
      }
    },
    security_code: card.cardCvv.trim(),
    expiration_month: expMonth,
    expiration_year: expYear
  };

  // Tenta tokenizar com public_key no endpoint oficial de tokenização
  const response = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${publicKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok || !data.id) {
    console.error('[Mercado Pago Tokenize Card Error]:', data);
    const analyzed = analyzeMpError(data);
    const err: any = new Error(analyzed.message);
    err.rejection = analyzed;
    throw err;
  }

  return data.id;
}

/**
 * Passo 1: Cria um plano associado no Mercado Pago (/preapproval_plan)
 */
export async function createPreapprovalPlan(planData: MpPlanPayload): Promise<{
  id: string;
  reason: string;
  init_point?: string;
  status?: string;
  auto_recurring?: any;
  isMock?: boolean;
}> {
  const token = getMercadoPagoAccessToken();
  const cacheKey = `${planData.reason}_${planData.auto_recurring.transaction_amount}_${planData.auto_recurring.frequency}`;

  if (cachedPlans[cacheKey]) {
    return cachedPlans[cacheKey];
  }

  try {
    const response = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(planData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Mercado Pago API Error - preapproval_plan]:', data);
      throw new Error(translateMpError(data));
    }

    const result = {
      id: data.id,
      reason: data.reason,
      init_point: data.init_point,
      status: data.status,
      auto_recurring: data.auto_recurring,
      isMock: false
    };

    cachedPlans[cacheKey] = result;
    return result;
  } catch (error: any) {
    console.error('[Mercado Pago preapproval_plan Exception]:', error);
    throw error;
  }
}

/**
 * Passo 2: Cria a assinatura para o cliente pagador (/preapproval) com o cartão tokenizado
 */
export async function createPreapprovalSubscription(subData: MpSubscriptionPayload): Promise<{
  id: string;
  status: string;
  reason: string;
  payer_email: string;
  init_point?: string;
  date_created: string;
  external_reference?: string;
  isMock?: boolean;
}> {
  const token = getMercadoPagoAccessToken();

  try {
    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Mercado Pago API Error - preapproval]:', data);
      const analyzed = analyzeMpError(data);
      const customErr: any = new Error(analyzed.message);
      customErr.rejection = analyzed;
      customErr.status = response.status;
      throw customErr;
    }

    return {
      id: data.id,
      status: data.status || 'authorized',
      reason: data.reason,
      payer_email: data.payer_email,
      init_point: data.init_point,
      date_created: data.date_created || new Date().toISOString(),
      external_reference: data.external_reference,
      isMock: false
    };
  } catch (error: any) {
    console.error('[Mercado Pago preapproval Exception]:', error);
    throw error;
  }
}

/**
 * Consulta status de uma assinatura (/preapproval/:id)
 */
export async function getPreapprovalSubscription(id: string): Promise<any> {
  const token = getMercadoPagoAccessToken();

  try {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('[Mercado Pago get subscription error]:', error);
    return { id, status: 'authorized', isMock: false };
  }
}
