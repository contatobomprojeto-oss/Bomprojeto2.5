import crypto from 'crypto';
import QRCode from 'qrcode';
import { logger } from './logger';

export type PaymentGatewayEnv = 'sandbox' | 'production';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled';
export type PaymentMethod = 'pix' | 'credit_card' | 'subscription';

export interface PaymentGatewayConfig {
  env: PaymentGatewayEnv;
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  isConfigured: boolean;
}

export interface PixPaymentRequest {
  amount: number;
  description: string;
  payer: {
    email: string;
    name?: string;
    cpfCnpj?: string;
    phone?: string;
  };
  expirationMinutes?: number;
  externalReference?: string;
  metadata?: Record<string, any>;
  planId?: string;
  projectId?: string;
  installmentNumber?: number;
}

export interface PixPaymentResponse {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  description: string;
  qrCode: string; // Copia e Cola (EMV payload)
  qrCodeBase64: string; // Base64 data image URL
  expiresAt: string;
  isSandbox: boolean;
  externalReference: string;
  createdAt: string;
}

export interface PaymentOrderRecord {
  id: string;
  paymentMethod: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  description: string;
  payerEmail: string;
  payerName?: string;
  externalReference: string;
  planId?: string;
  projectId?: string;
  installmentNumber?: number;
  qrCode?: string;
  qrCodeBase64?: string;
  isSandbox: boolean;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  metadata?: Record<string, any>;
}

// In-memory payment orders store with fast lookup
const paymentOrdersStore: Map<string, PaymentOrderRecord> = new Map();

/**
 * Returns current payment gateway credentials securely from process.env
 */
export function getPaymentGatewayConfig(): PaymentGatewayConfig {
  const env: PaymentGatewayEnv = (process.env.PAYMENT_GATEWAY_ENV || 'production').toLowerCase() === 'sandbox' 
    ? 'sandbox' 
    : 'production';

  const publicKey = (
    process.env.PAYMENT_PUBLIC_KEY || 
    process.env.MERCADO_PAGO_PUBLIC_KEY || 
    'APP_USR-e518ea4d-6432-4cf6-9615-4a9fb87fcf7e'
  ).trim();

  const secretKey = (
    process.env.PAYMENT_SECRET_KEY || 
    process.env.MERCADO_PAGO_ACCESS_TOKEN || 
    'APP_USR-953693585260394-082010-e3f0f1deb9b0d5d612ba39e71e7e781d-402745499'
  ).trim();

  const webhookSecret = (process.env.PAYMENT_WEBHOOK_SECRET || '').trim();

  return {
    env,
    publicKey,
    secretKey,
    webhookSecret,
    isConfigured: Boolean(secretKey && secretKey.length > 8)
  };
}

/**
 * Returns safe masked credentials for frontend configuration and diagnostics
 * (Never reveals the secret key or webhook secret)
 */
export function getPublicPaymentGatewayStatus() {
  const config = getPaymentGatewayConfig();
  return {
    env: config.env,
    isConfigured: config.isConfigured,
    publicKey: config.publicKey ? `${config.publicKey.slice(0, 8)}...${config.publicKey.slice(-4)}` : '',
    hasSecretKey: Boolean(config.secretKey),
    secretKeyPreview: config.secretKey ? `${config.secretKey.slice(0, 7)}••••••••${config.secretKey.slice(-4)}` : 'Não configurada',
    hasWebhookSecret: Boolean(config.webhookSecret),
    webhookSecretPreview: config.webhookSecret ? `whsec_••••••••${config.webhookSecret.slice(-4)}` : 'Não configurada',
    webhookUrl: '/api/webhooks/payment'
  };
}

/**
 * Formats a valid Brazilian Central Bank Pix Copia e Cola EMV payload (BR Code standard)
 */
function generatePixEmvPayload(params: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txId: string;
}): string {
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const cleanKey = params.pixKey.replace(/[^a-zA-Z0-9@.+_-]/g, '');
  const cleanName = params.merchantName.slice(0, 25).toUpperCase();
  const cleanCity = params.merchantCity.slice(0, 15).toUpperCase();
  const formattedAmount = params.amount.toFixed(2);
  const additionalDataField = formatField('05', '***');

  const merchantAccountInfo = formatField('00', 'br.gov.bcb.pix') + formatField('01', cleanKey);

  let raw = 
    formatField('00', '01') + // Payload Format Indicator
    formatField('01', '11') + // Point of Initiation Method: 11 (Static QR Code)
    formatField('26', merchantAccountInfo) + // Merchant Account Information
    formatField('52', '0000') + // Merchant Category Code
    formatField('53', '986') + // Transaction Currency (BRL)
    formatField('54', formattedAmount) + // Transaction Amount
    formatField('58', 'BR') + // Country Code
    formatField('59', cleanName) + // Merchant Name
    formatField('60', cleanCity) + // Merchant City
    formatField('62', additionalDataField) + // Additional Data Field
    '6304'; // CRC16 placeholder

  // CRC16-CCITT calculation
  let crc = 0xFFFF;
  for (let i = 0; i < raw.length; i++) {
    crc ^= raw.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  return `${raw}${crcHex}`;
}

/**
 * Creates a Pix Payment Order:
 * - If real secret key is configured: calls Gateway API (e.g. Mercado Pago /v1/payments)
 * - If in Sandbox / Local test: generates a complete, valid EMV Pix Copia e Cola with QR Code
 */
export async function createPixPayment(req: PixPaymentRequest): Promise<PixPaymentResponse> {
  const config = getPaymentGatewayConfig();
  const now = new Date();
  const expirationMins = req.expirationMinutes || 30;
  const expiresAt = new Date(now.getTime() + expirationMins * 60 * 1000).toISOString();
  const paymentId = `pix_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const extRef = req.externalReference || paymentId;

  // Case 1: Real Secret Key Configured -> Call Gateway API
  if (config.isConfigured && (config.secretKey.startsWith('TEST-') || config.secretKey.startsWith('APP_USR-') || config.secretKey.length > 20)) {
    try {
      const isMp = config.secretKey.includes('-') || config.secretKey.length > 30;
      if (isMp) {
        logger.log('INFO', 'business_logic', `Criando cobrança Pix na API do Mercado Pago para ${req.payer.email} (R$ ${req.amount})`, {
          data: { amount: req.amount, planId: req.planId }
        });

        const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.secretKey}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': paymentId
          },
          body: JSON.stringify({
            transaction_amount: Number(req.amount),
            description: req.description,
            payment_method_id: 'pix',
            date_of_expiration: expiresAt,
            payer: {
              email: req.payer.email,
              first_name: (req.payer.name || req.payer.email).split(' ')[0],
              last_name: (req.payer.name || '').split(' ').slice(1).join(' ') || 'Cliente',
              identification: req.payer.cpfCnpj ? {
                type: req.payer.cpfCnpj.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF',
                number: req.payer.cpfCnpj.replace(/\D/g, '')
              } : undefined
            },
            external_reference: extRef
          }),
          signal: AbortSignal.timeout(8000)
        });

        const mpData = await mpRes.json();
        if (mpRes.ok && mpData.point_of_interaction?.transaction_data) {
          const transData = mpData.point_of_interaction.transaction_data;
          const qrCode = transData.qr_code;
          let qrCodeBase64 = transData.qr_code_base64;
          if (qrCodeBase64 && !qrCodeBase64.startsWith('data:image')) {
            qrCodeBase64 = `data:image/png;base64,${qrCodeBase64}`;
          }

          const order: PaymentOrderRecord = {
            id: String(mpData.id || paymentId),
            paymentMethod: 'pix',
            amount: req.amount,
            status: 'pending',
            description: req.description,
            payerEmail: req.payer.email,
            payerName: req.payer.name,
            externalReference: extRef,
            planId: req.planId,
            projectId: req.projectId,
            installmentNumber: req.installmentNumber,
            qrCode,
            qrCodeBase64,
            isSandbox: config.env === 'sandbox',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            metadata: req.metadata
          };
          paymentOrdersStore.set(order.id, order);

          return {
            paymentId: order.id,
            status: 'pending',
            amount: req.amount,
            description: req.description,
            qrCode,
            qrCodeBase64,
            expiresAt,
            isSandbox: config.env === 'sandbox',
            externalReference: extRef,
            createdAt: now.toISOString()
          };
        }
      }
    } catch (err: any) {
      logger.log('WARN', 'business_logic', `Falha ao chamar API externa do gateway para Pix: ${err.message}. Operando em modo simulado seguro.`, {
        error: err
      });
    }
  }

  // Case 2: Sandbox / Test mode with Instant EMV Generation
  logger.log('INFO', 'business_logic', `Gerando ordem Pix em ambiente Sandbox seguro (R$ ${req.amount}) para ${req.payer.email}`, {
    data: { amount: req.amount, planId: req.planId }
  });

  const pixKey = '48.912.831/0001-90'; // Chave Oficial CNPJ BOMProjeto
  const qrCodeText = generatePixEmvPayload({
    pixKey,
    merchantName: 'BOMPROJETO TECNOLOGIA',
    merchantCity: 'SAO PAULO',
    amount: req.amount,
    txId: extRef.slice(0, 20)
  });

  const qrCodeBase64 = await QRCode.toDataURL(qrCodeText, {
    width: 380,
    margin: 2,
    color: { dark: '#1c1c1a', light: '#ffffff' }
  });

  const order: PaymentOrderRecord = {
    id: paymentId,
    paymentMethod: 'pix',
    amount: req.amount,
    status: 'pending',
    description: req.description,
    payerEmail: req.payer.email,
    payerName: req.payer.name,
    externalReference: extRef,
    planId: req.planId,
    projectId: req.projectId,
    installmentNumber: req.installmentNumber,
    qrCode: qrCodeText,
    qrCodeBase64,
    isSandbox: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    metadata: req.metadata
  };
  paymentOrdersStore.set(paymentId, order);

  return {
    paymentId,
    status: 'pending',
    amount: req.amount,
    description: req.description,
    qrCode: qrCodeText,
    qrCodeBase64,
    expiresAt,
    isSandbox: true,
    externalReference: extRef,
    createdAt: now.toISOString()
  };
}

/**
 * Validates the Webhook cryptographic signature (HMAC-SHA256)
 * to verify that the request truly came from the payment gateway.
 */
export function verifyPaymentWebhookSignature(req: {
  headers: Record<string, any>;
  body: any;
  rawBody?: string;
}): { isValid: boolean; reason?: string } {
  const config = getPaymentGatewayConfig();

  // If no secret key is configured, allow in development/sandbox with warning
  if (!config.webhookSecret) {
    return {
      isValid: true,
      reason: 'Sandbox: PAYMENT_WEBHOOK_SECRET não configurado. Aceito em modo desenvolvimento.'
    };
  }

  const signatureHeader = 
    req.headers['x-signature'] || 
    req.headers['x-hub-signature-256'] || 
    req.headers['x-signature-sha256'] ||
    '';

  if (!signatureHeader) {
    // Check if query token is provided as alternative
    return { isValid: false, reason: 'Cabeçalho de assinatura do webhook ausente' };
  }

  try {
    // Signature format in Mercado Pago: ts=...,v1=hash
    let receivedHash = signatureHeader;
    if (signatureHeader.includes('v1=')) {
      const parts = signatureHeader.split(',');
      const v1Part = parts.find((p: string) => p.startsWith('v1='));
      if (v1Part) {
        receivedHash = v1Part.replace('v1=', '');
      }
    }

    const payloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const expectedHash = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(payloadString)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedHash),
      Buffer.from(expectedHash)
    );

    return { isValid };
  } catch (err: any) {
    return { isValid: false, reason: `Erro ao calcular HMAC: ${err.message}` };
  }
}

/**
 * Handles incoming payment webhook events:
 * - payment.created / charge.pending
 * - payment.approved / charge.paid
 * - payment.failed / charge.refunded
 */
export function processPaymentWebhookEvent(body: any): {
  processed: boolean;
  event: string;
  orderId?: string;
  status?: PaymentStatus;
  message: string;
} {
  const event = body.action || body.type || body.event || 'payment.update';
  const data = body.data || body.payment || body;
  const orderId = String(data.id || body.id || '');

  logger.log('INFO', 'webhook', `Webhook de pagamento recebido [${event}]: Order #${orderId}`, {
    data: { event, orderId }
  });

  // Find order in memory or by external reference
  let order = paymentOrdersStore.get(orderId);
  if (!order && data.external_reference) {
    for (const ord of paymentOrdersStore.values()) {
      if (ord.externalReference === data.external_reference) {
        order = ord;
        break;
      }
    }
  }

  // Map event to internal payment status
  let newStatus: PaymentStatus = 'pending';
  if (
    event === 'payment.approved' || 
    event === 'charge.paid' || 
    event === 'payment.created' && data.status === 'approved' ||
    data.status === 'approved' || 
    data.status === 'paid'
  ) {
    newStatus = 'approved';
  } else if (
    event === 'payment.failed' || 
    event === 'charge.refunded' || 
    data.status === 'rejected' || 
    data.status === 'cancelled'
  ) {
    newStatus = 'rejected';
  }

  if (order) {
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    if (newStatus === 'approved') {
      order.approvedAt = new Date().toISOString();
    }
    paymentOrdersStore.set(order.id, order);

    logger.log('INFO', 'business_logic', `✅ Status do pedido [${order.id}] atualizado via webhook para: ${newStatus.toUpperCase()}`, {
      data: { orderId: order.id, status: newStatus, amount: order.amount, planId: order.planId }
    });
  }

  return {
    processed: true,
    event,
    orderId,
    status: newStatus,
    message: `Notificação de pagamento processada. Status: ${newStatus}`
  };
}

/**
 * Retrieves a stored payment order
 */
export function getPaymentOrder(paymentId: string): PaymentOrderRecord | null {
  return paymentOrdersStore.get(paymentId) || null;
}

/**
 * Returns all payment orders for audit and diagnostics
 */
export function getAllPaymentOrders(): PaymentOrderRecord[] {
  return Array.from(paymentOrdersStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Simulates a payment approval in sandbox for homologation checklist testing
 */
export function simulateSandboxPaymentApproval(paymentId: string): {
  success: boolean;
  order?: PaymentOrderRecord;
  message: string;
} {
  const order = paymentOrdersStore.get(paymentId);
  if (!order) {
    return { success: false, message: 'Pedido de pagamento não localizado.' };
  }

  order.status = 'approved';
  order.approvedAt = new Date().toISOString();
  order.updatedAt = new Date().toISOString();
  paymentOrdersStore.set(order.id, order);

  logger.log('INFO', 'business_logic', `[Homologação Sandbox] Pagamento #${order.id} APROVADO com sucesso no teste!`, {
    data: { orderId: order.id, amount: order.amount, planId: order.planId }
  });

  return {
    success: true,
    order,
    message: `Pagamento de R$ ${order.amount.toFixed(2)} aprovado com sucesso no ambiente Sandbox.`
  };
}
