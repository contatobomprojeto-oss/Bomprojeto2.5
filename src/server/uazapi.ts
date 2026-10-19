import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { logger } from './logger';

/**
 * BOMProjeto Official UAZAPI Integration Client
 * Fully aligned with official documentation at: https://docs.uazapi.com/
 * 
 * Features:
 * - Persistent configuration store (uazapi.config.json + process.env)
 * - Administrative test connection tool with live diagnostics
 * - Real Baileys/WhatsApp Web QR Code generation (never fake JSON)
 * - 8-digit Pairing Code support (connect by phone number without camera)
 * - Auto-detect connection polling
 * - Multi-tenant workspace instance mapping under Master Plan
 * - Webhook processing
 */

export interface WorkspaceWhatsAppSession {
  connected: boolean;
  phoneNumber: string;
  instanceName: string;
  instanceToken?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  explicitlyDisconnected?: boolean;
  batteryLevel?: number;
  qrCode?: string;
  pairingCode?: string;
  profileName?: string;
}

const workspaceWhatsAppSessions: Map<string, WorkspaceWhatsAppSession> = new Map();

// Default global session (inicia desconectado por padrão)
let activeWhatsAppSession: WorkspaceWhatsAppSession = {
  connected: false,
  phoneNumber: '',
  instanceName: 'bomprojeto_master',
  explicitlyDisconnected: true
};

export function getLocalWhatsAppSession(workspaceId?: string): WorkspaceWhatsAppSession {
  if (workspaceId && workspaceWhatsAppSessions.has(workspaceId)) {
    return workspaceWhatsAppSessions.get(workspaceId)!;
  }
  return activeWhatsAppSession;
}

export function updateLocalWhatsAppSession(
  connected: boolean,
  phoneNumber?: string,
  extra?: { 
    workspaceId?: string; 
    instanceName?: string; 
    instanceToken?: string; 
    qrCode?: string; 
    pairingCode?: string;
    profileName?: string;
    explicitlyDisconnected?: boolean;
  }
): WorkspaceWhatsAppSession {
  const current = (extra?.workspaceId && workspaceWhatsAppSessions.has(extra.workspaceId))
    ? workspaceWhatsAppSessions.get(extra.workspaceId)!
    : { ...activeWhatsAppSession };

  const targetSession: WorkspaceWhatsAppSession = {
    ...current,
    connected,
    phoneNumber: phoneNumber !== undefined ? phoneNumber : (connected ? current.phoneNumber : ''),
    ...(extra?.instanceName ? { instanceName: extra.instanceName } : {}),
    ...(extra?.instanceToken ? { instanceToken: extra.instanceToken } : {}),
    qrCode: extra?.qrCode !== undefined ? extra.qrCode : (connected ? current.qrCode : undefined),
    pairingCode: extra?.pairingCode !== undefined ? extra.pairingCode : (connected ? current.pairingCode : undefined),
    ...(extra?.profileName ? { profileName: extra.profileName } : {}),
    explicitlyDisconnected: extra?.explicitlyDisconnected !== undefined ? extra.explicitlyDisconnected : !connected,
    ...(connected ? { connectedAt: new Date().toISOString() } : { disconnectedAt: new Date().toISOString() })
  };

  if (extra?.workspaceId) {
    workspaceWhatsAppSessions.set(extra.workspaceId, targetSession);
  }
  activeWhatsAppSession = targetSession;
  return targetSession;
}

export interface UazapiConfig {
  baseUrl: string;
  token: string;
  instanceName: string;
  adminToken?: string;
  instanceToken?: string;
}

const CONFIG_FILE_PATH = path.resolve(process.cwd(), 'uazapi.config.json');

/**
 * Loads configuration from uazapi.config.json or process.env
 */
export function getUazapiConfig(overrides?: { workspaceId?: string; instanceName?: string }): UazapiConfig {
  let fileConfig: Partial<UazapiConfig> = {};
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      fileConfig = JSON.parse(content);
    }
  } catch {
    // Ignore JSON parse errors
  }

  const session = overrides?.workspaceId ? getLocalWhatsAppSession(overrides.workspaceId) : getLocalWhatsAppSession();

  const rawBaseUrl = fileConfig.baseUrl || process.env.UAZAPI_BASE_URL || 'https://api.uazapi.com';
  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, '');

  const adminToken = (fileConfig.adminToken || process.env.UAZAPI_ADMIN_TOKEN || '').trim();
  const envToken = (fileConfig.instanceToken || fileConfig.token || process.env.UAZAPI_TOKEN || '').trim();

  const cleanWorkspace = overrides?.workspaceId ? overrides.workspaceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) : '';
  const defaultInstance = cleanWorkspace ? `bomprojeto_${cleanWorkspace}` : (fileConfig.instanceName || process.env.UAZAPI_INSTANCE_NAME || 'bomprojeto_master');

  const instanceName = (overrides?.instanceName || session.instanceName || defaultInstance).trim();
  const instanceToken = session.instanceToken || envToken || adminToken;

  return {
    baseUrl,
    token: instanceToken,
    instanceName,
    adminToken: adminToken || envToken || undefined,
    instanceToken
  };
}

/**
 * Saves configuration persistently to uazapi.config.json
 */
export function saveUazapiConfig(newConfig: Partial<UazapiConfig>): UazapiConfig {
  let current: Record<string, any> = {};
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      current = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
    }
  } catch {
    current = {};
  }

  const updated = {
    ...current,
    baseUrl: (newConfig.baseUrl || current.baseUrl || 'https://api.uazapi.com').trim().replace(/\/+$/, ''),
    adminToken: newConfig.adminToken !== undefined ? newConfig.adminToken.trim() : (current.adminToken || ''),
    instanceToken: newConfig.instanceToken !== undefined ? newConfig.instanceToken.trim() : (current.instanceToken || newConfig.token || ''),
    instanceName: (newConfig.instanceName || current.instanceName || 'bomprojeto_master').trim(),
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  console.log('[UAZAPI Config] Configurações persistidas em uazapi.config.json');
  return getUazapiConfig();
}

/**
 * Checks if UAZAPI credentials have been configured
 */
export function isUazapiConfigured(config?: UazapiConfig): boolean {
  const cfg = config || getUazapiConfig();
  const hasToken = Boolean((cfg.adminToken && cfg.adminToken.length >= 6) || (cfg.token && cfg.token.length >= 6));
  const hasValidUrl = Boolean(cfg.baseUrl && cfg.baseUrl.startsWith('http'));
  return hasToken && hasValidUrl;
}

/**
 * Formats a phone number to standard international WhatsApp format without '+': 5511999999999
 * Handles Brazilian DDDs, leading zeros, and full international formats.
 */
export function normalizeWhatsAppNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');
  // Remove leading zeros (e.g. 067999881234 -> 67999881234)
  digits = digits.replace(/^0+/, '');

  // If already starts with 55
  if (digits.startsWith('55')) {
    // 55 + DDD (2) + 8 or 9 digits -> length 12 or 13
    if (digits.length >= 12 && digits.length <= 13) {
      return digits;
    }
  }

  // DDD (2) + 8 or 9 digits -> length 10 or 11
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

/**
 * Builds an official direct WhatsApp Web/Mobile link (wa.me / api.whatsapp.com)
 * Guaranteed 1-click fallback that opens directly in WhatsApp with the pre-filled text.
 */
export function buildWhatsAppDirectLink(phone: string, text: string): string {
  const clean = normalizeWhatsAppNumber(phone);
  return `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(text)}`;
}

/**
 * Ensures the UAZAPI webhook is configured and listening for incoming customer messages.
 */
export async function ensureUazapiWebhook(config?: UazapiConfig, customWebhookUrl?: string): Promise<{
  success: boolean;
  webhookUrl?: string;
  error?: string;
}> {
  const cfg = config || getUazapiConfig();
  if (!isUazapiConfigured(cfg)) {
    return { success: false, error: 'UAZAPI não configurado' };
  }

  const appBaseUrl = customWebhookUrl || process.env.APP_URL || 'https://ais-dev-mfyo7ab4kaxz6m3oi2m4fh-485829572863.us-west1.run.app';
  const targetWebhookUrl = customWebhookUrl || `${appBaseUrl.replace(/\/$/, '')}/api/webhooks/uazapi`;

  const headers = buildUazapiHeaders(cfg, true);

  try {
    const res = await fetch(`${cfg.baseUrl}/webhook`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url: targetWebhookUrl,
        enabled: true,
        events: ['messages', 'connection', 'status', 'messages.upsert']
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      console.log(`[UAZAPI Webhook] Configurado com sucesso para: ${targetWebhookUrl}`);
      return { success: true, webhookUrl: targetWebhookUrl };
    } else {
      const errText = await res.text().catch(() => '');
      return { success: false, error: `HTTP ${res.status}: ${errText.slice(0, 100)}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Builds HTTP headers compliant with UAZAPI v2.0
 */
function buildUazapiHeaders(config: UazapiConfig, useAdminToken: boolean = false): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  const tokenToUse = useAdminToken 
    ? (config.adminToken || config.token)
    : (config.instanceToken || config.token || config.adminToken);

  if (tokenToUse) {
    headers['token'] = tokenToUse;
    headers['Authorization'] = `Bearer ${tokenToUse}`;
    headers['apikey'] = tokenToUse;
  }

  if (config.adminToken) {
    headers['admintoken'] = config.adminToken;
  }

  return headers;
}

/**
 * Tests connection to the UAZAPI server and returns diagnostic info
 */
export async function testUazapiConnection(testConfig?: Partial<UazapiConfig>): Promise<{
  success: boolean;
  statusCode?: number;
  message: string;
  latencyMs: number;
  baseUrl: string;
  details?: any;
}> {
  const baseConfig = getUazapiConfig();
  const config = testConfig ? {
    baseUrl: (testConfig.baseUrl?.trim()) || baseConfig.baseUrl,
    adminToken: (testConfig.adminToken?.trim()) || baseConfig.adminToken,
    instanceToken: (testConfig.instanceToken?.trim()) || baseConfig.instanceToken,
    instanceName: (testConfig.instanceName?.trim()) || baseConfig.instanceName,
    token: (testConfig.token?.trim()) || (testConfig.instanceToken?.trim()) || (testConfig.adminToken?.trim()) || baseConfig.token
  } : baseConfig;
  const startTime = Date.now();

  if (!config.baseUrl) {
    return {
      success: false,
      message: 'URL base da UAZAPI não informada.',
      latencyMs: 0,
      baseUrl: config.baseUrl
    };
  }

  if (!config.adminToken && !config.token) {
    return {
      success: false,
      message: 'Token de autenticação (adminToken ou token de instância) não informado.',
      latencyMs: 0,
      baseUrl: config.baseUrl
    };
  }

  const headers = buildUazapiHeaders(config, true);

  // Test endpoints to check in order: /instance/status, /instance/all, /instance/info
  const endpointsToTest = [
    `${config.baseUrl}/instance/status`,
    `${config.baseUrl}/instance/status?name=${encodeURIComponent(config.instanceName)}`,
    `${config.baseUrl}/instance/all`,
    `${config.baseUrl}/instance/list`,
    `${config.baseUrl}/instance/init`
  ];

  let lastStatus = 0;
  let lastError = '';

  for (const endpoint of endpointsToTest) {
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(7000)
      });

      lastStatus = res.status;
      const latencyMs = Date.now() - startTime;
      const rawText = await res.text();
      let parsedData: any = null;
      try { parsedData = JSON.parse(rawText); } catch { parsedData = rawText.slice(0, 200); }

      if (res.ok) {
        return {
          success: true,
          statusCode: res.status,
          message: `Conexão com servidor UAZAPI estabelecida com sucesso! (${latencyMs}ms)`,
          latencyMs,
          baseUrl: config.baseUrl,
          details: parsedData
        };
      } else if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          statusCode: res.status,
          message: `Servidor UAZAPI respondeu 401/403: O Token informado é inválido ou não possui permissão. Verifique suas credenciais.`,
          latencyMs,
          baseUrl: config.baseUrl,
          details: parsedData
        };
      } else {
        lastError = `HTTP ${res.status}: ${typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData)}`;
      }
    } catch (err: any) {
      lastError = err.message;
    }
  }

  const latencyMs = Date.now() - startTime;
  return {
    success: false,
    statusCode: lastStatus,
    message: `Falha ao conectar com ${config.baseUrl}: ${lastError}`,
    latencyMs,
    baseUrl: config.baseUrl
  };
}

/**
 * Ensures instance exists on UAZAPI server (/instance/create)
 */
async function ensureUazapiInstance(config: UazapiConfig, workspaceId?: string): Promise<string | undefined> {
  if (!isUazapiConfigured(config)) return undefined;

  // 1. If we already have an instanceToken, check if it's healthy
  if (config.instanceToken) {
    try {
      const res = await fetch(`${config.baseUrl}/instance/status`, {
        headers: { 'token': config.instanceToken, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        return config.instanceToken;
      }
    } catch {}
  }

  // 2. Otherwise create instance using admintoken
  const headers = buildUazapiHeaders(config, true);

  const createEndpoints = [
    `${config.baseUrl}/instance/create`,
    `${config.baseUrl}/instance/init`
  ];

  for (const endpoint of createEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: config.instanceName
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const createdToken = data.token || data.instance?.token || data.key;
        if (createdToken) {
          saveUazapiConfig({ instanceToken: createdToken });
          updateLocalWhatsAppSession(false, undefined, {
            workspaceId,
            instanceName: config.instanceName,
            instanceToken: createdToken
          });
          return createdToken;
        }
      }
    } catch {
      // Continue to next endpoint or existing instance
    }
  }

  return config.instanceToken;
}

export interface SendTextMessageParams {
  number: string;
  text: string;
  delay?: number;
  readchat?: boolean;
  replyId?: string;
  workspaceId?: string;
  instanceName?: string;
}

export interface SendMediaMessageParams {
  number: string;
  mediaUrl: string;
  caption?: string;
  mediaType?: 'image' | 'document' | 'audio' | 'video';
  fileName?: string;
  workspaceId?: string;
  instanceName?: string;
}

export interface UazapiSendResult {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'simulated' | 'error';
  timestamp: string;
  details?: any;
  error?: string;
  waMeUrl?: string;
  cleanNumber?: string;
}

export interface UazapiInstanceStatus {
  connected: boolean;
  state: 'connected' | 'connecting' | 'disconnected' | 'hibernated' | 'not_configured';
  phone?: string;
  profileName?: string;
  batteryLevel?: number;
  qrCode?: string;
  pairingCode?: string;
  provider: 'uazapi_bomprojeto';
  planType: 'master_included';
  isConfigured: boolean;
  configNotice?: string;
}

/**
 * Requests an authentic WhatsApp Web QR Code from the official UAZAPI instance.
 * Aligned with https://docs.uazapi.com/ (POST /instance/connect)
 */
export async function getUazapiQRCode(
  customPhone?: string,
  overrides?: { workspaceId?: string; instanceName?: string }
): Promise<{
  qrCode?: string;
  message: string;
  connected: boolean;
  pairingCode?: string;
  instanceName?: string;
  planIncluded: boolean;
  needsConfig?: boolean;
  errorDetail?: string;
}> {
  const config = getUazapiConfig(overrides);

  // Prepara sessão local para nova tentativa de conexão
  updateLocalWhatsAppSession(false, customPhone, {
    workspaceId: overrides?.workspaceId,
    instanceName: config.instanceName,
    explicitlyDisconnected: false
  });

  if (isUazapiConfigured(config)) {
    try {
      const activeToken = await ensureUazapiInstance(config, overrides?.workspaceId);
      if (activeToken) {
        config.token = activeToken;
        config.instanceToken = activeToken;
      }

      const headers = {
        'Content-Type': 'application/json',
        'token': config.instanceToken || config.token,
        ...(config.adminToken ? { 'admintoken': config.adminToken } : {})
      };

      // 1. Check current status first to see if QR code is already waiting or instance is connected
      try {
        const statusRes = await fetch(`${config.baseUrl}/instance/status`, {
          headers,
          signal: AbortSignal.timeout(5000)
        });

        if (statusRes.ok) {
          const statusData = await statusRes.json().catch(() => ({}));
          const isConnected = Boolean(
            statusData.status?.connected || 
            statusData.status?.loggedIn || 
            statusData.instance?.status === 'connected'
          );

          if (isConnected) {
            updateLocalWhatsAppSession(true, customPhone, {
              workspaceId: overrides?.workspaceId,
              instanceName: config.instanceName
            });
            return {
              connected: true,
              message: 'WhatsApp já conectado com sucesso!',
              instanceName: config.instanceName,
              planIncluded: true
            };
          }

          const existingQr = statusData.instance?.qrcode || statusData.qrcode;
          if (existingQr && typeof existingQr === 'string' && existingQr.length > 50) {
            let formattedQr = existingQr;
            if (!formattedQr.startsWith('data:image')) {
              formattedQr = await QRCode.toDataURL(existingQr, {
                width: 380,
                margin: 2,
                color: { dark: '#1c1c1a', light: '#ffffff' }
              });
            }

            updateLocalWhatsAppSession(false, customPhone, {
              workspaceId: overrides?.workspaceId,
              instanceName: config.instanceName,
              qrCode: formattedQr
            });

            return {
              qrCode: formattedQr,
              connected: false,
              message: 'Aponte a câmera do WhatsApp para este QR Code para conectar.',
              instanceName: config.instanceName,
              planIncluded: true
            };
          }
        }
      } catch (err: any) {
        console.warn('[UAZAPI Status Check Warn]:', err.message);
      }

      // 2. Start connection via official /instance/connect
      const connectRes = await fetch(`${config.baseUrl}/instance/connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(8000)
      });

      if (connectRes.ok) {
        const connectData = await connectRes.json().catch(() => ({}));
        const isConnected = Boolean(
          connectData.connected || 
          connectData.status?.connected || 
          connectData.status?.loggedIn || 
          connectData.instance?.status === 'connected'
        );

        if (isConnected) {
          updateLocalWhatsAppSession(true, customPhone, {
            workspaceId: overrides?.workspaceId,
            instanceName: config.instanceName
          });
          return {
            connected: true,
            message: 'WhatsApp já conectado com sucesso!',
            instanceName: config.instanceName,
            planIncluded: true
          };
        }

        const rawCode = connectData.instance?.qrcode || connectData.qrcode || connectData.qr || connectData.base64;
        if (rawCode && typeof rawCode === 'string') {
          let formattedQr = rawCode;
          if (!formattedQr.startsWith('data:image')) {
            formattedQr = await QRCode.toDataURL(rawCode, {
              width: 380,
              margin: 2,
              color: { dark: '#1c1c1a', light: '#ffffff' }
            });
          }

          updateLocalWhatsAppSession(false, customPhone, {
            workspaceId: overrides?.workspaceId,
            instanceName: config.instanceName,
            qrCode: formattedQr
          });

          return {
            qrCode: formattedQr,
            connected: false,
            message: 'Aponte a câmera do WhatsApp para este QR Code para conectar.',
            instanceName: config.instanceName,
            planIncluded: true
          };
        }
      }
    } catch (err: any) {
      console.error('[UAZAPI Connect Exception]:', err.message);
    }
  }

  // If could not fetch official QR code
  return {
    connected: false,
    message: 'Não foi possível carregar o QR Code oficial no momento. Clique em "Recarregar outro código" para tentar novamente.',
    instanceName: config.instanceName,
    planIncluded: true
  };
}

/**
 * Requests an 8-character Pairing Code for connecting without camera
 * (WhatsApp > Aparelhos Conectados > Conectar com número de telefone)
 */
export async function getUazapiPairingCode(
  phone: string,
  overrides?: { workspaceId?: string; instanceName?: string }
): Promise<{
  pairingCode?: string;
  success: boolean;
  message: string;
}> {
  const config = getUazapiConfig(overrides);
  const cleanPhone = normalizeWhatsAppNumber(phone);

  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      success: false,
      message: 'Número de WhatsApp inválido. Digite com DDD (Ex: 11999998888).'
    };
  }

  if (!isUazapiConfigured(config)) {
    return {
      success: false,
      message: 'Credenciais UAZAPI não configuradas. Configure a URL e Token na aba Configurações.'
    };
  }

      const activeToken = await ensureUazapiInstance(config, overrides?.workspaceId);
      if (activeToken) {
        config.token = activeToken;
        config.instanceToken = activeToken;
      }

      const res = await fetch(`${config.baseUrl}/instance/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': config.instanceToken || config.token,
          ...(config.adminToken ? { 'admintoken': config.adminToken } : {})
        },
        body: JSON.stringify({
          phone: cleanPhone
        }),
        signal: AbortSignal.timeout(9000)
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const pairing = data.instance?.paircode || data.paircode || data.pairingCode || data.pairing_code || data.code;
        if (pairing) {
          updateLocalWhatsAppSession(false, phone, {
            workspaceId: overrides?.workspaceId,
            instanceName: config.instanceName,
            pairingCode: pairing
          });
          return {
            success: true,
            pairingCode: pairing,
            message: `Código de pareamento gerado: ${pairing}. Digite no seu WhatsApp.`
          };
        }
      }

  return {
    success: false,
    message: 'Não foi possível gerar o código de pareamento no servidor UAZAPI. Tente via QR Code.'
  };
}

/**
 * Checks WhatsApp instance connection status.
 */
export async function getUazapiStatus(overrides?: { workspaceId?: string; instanceName?: string }): Promise<UazapiInstanceStatus> {
  const config = getUazapiConfig(overrides);
  const session = getLocalWhatsAppSession(overrides?.workspaceId);
  const configured = isUazapiConfigured(config);

  if (!configured) {
    return {
      connected: false,
      state: 'not_configured',
      phone: '',
      profileName: '',
      qrCode: undefined,
      pairingCode: undefined,
      provider: 'uazapi_bomprojeto',
      planType: 'master_included',
      isConfigured: false,
      configNotice: 'Credenciais UAZAPI não configuradas.'
    };
  }

  const headers = buildUazapiHeaders(config);

  const statusEndpoints = [
    `${config.baseUrl}/instance/status`,
    `${config.baseUrl}/instance/status?name=${encodeURIComponent(config.instanceName)}`,
    `${config.baseUrl}/instance/connectionState/${encodeURIComponent(config.instanceName)}`
  ];

  for (const endpoint of statusEndpoints) {
    try {
      const res = await fetch(endpoint, { 
        headers,
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const stateStr = (data.state || data.instance?.status || data.status?.state || '').toLowerCase();
        const isConnected = stateStr === 'connected' || stateStr === 'open' || Boolean(data.connected) || Boolean(data.status?.connected) || Boolean(data.status?.loggedIn);

        if (isConnected) {
          const rawPhone = data.status?.jid 
            ? data.status.jid.replace(/@.*$/, '') 
            : (data.phone || data.number || data.instance?.owner || data.instance?.phone || session.phoneNumber || '');
          const phone = rawPhone ? normalizeWhatsAppNumber(rawPhone) : '';
          const profile = data.profileName || data.name || data.instance?.profileName || session.profileName;

          updateLocalWhatsAppSession(true, phone, {
            workspaceId: overrides?.workspaceId,
            instanceName: config.instanceName,
            profileName: profile,
            explicitlyDisconnected: false
          });

          return {
            connected: true,
            state: 'connected',
            phone,
            profileName: profile || config.instanceName,
            batteryLevel: data.batteryLevel || data.instance?.batteryLevel,
            qrCode: undefined,
            pairingCode: undefined,
            provider: 'uazapi_bomprojeto',
            planType: 'master_included',
            isConfigured: true
          };
        } else {
          // Instância desconectada no servidor remoto
          const qr = data.instance?.qrcode || data.qrcode || data.qr || data.base64 || data.code;
          const pairing = data.instance?.paircode || data.paircode || data.pairingCode || data.pairing_code;

          updateLocalWhatsAppSession(false, '', {
            workspaceId: overrides?.workspaceId,
            instanceName: config.instanceName,
            qrCode: qr || session.qrCode,
            pairingCode: pairing || session.pairingCode
          });

          return {
            connected: false,
            state: stateStr === 'connecting' ? 'connecting' : 'disconnected',
            phone: '',
            profileName: '',
            batteryLevel: undefined,
            qrCode: qr || session.qrCode,
            pairingCode: pairing || session.pairingCode,
            provider: 'uazapi_bomprojeto',
            planType: 'master_included',
            isConfigured: true
          };
        }
      }
    } catch {
      // Continue to next
    }
  }

  return {
    connected: Boolean(session.connected),
    state: session.connected ? 'connected' : 'disconnected',
    phone: session.connected ? session.phoneNumber : '',
    profileName: session.connected ? (session.profileName || session.instanceName) : '',
    qrCode: session.connected ? undefined : session.qrCode,
    pairingCode: session.connected ? undefined : session.pairingCode,
    provider: 'uazapi_bomprojeto',
    planType: 'master_included',
    isConfigured: true
  };
}

/**
 * Dispatches a text message through official UAZAPI /send/text endpoint
 */
export async function sendUazapiTextMessage(params: SendTextMessageParams): Promise<UazapiSendResult> {
  const config = getUazapiConfig({
    workspaceId: params.workspaceId,
    instanceName: params.instanceName
  });
  const cleanNumber = normalizeWhatsAppNumber(params.number);
  const now = new Date().toISOString();

  if (!cleanNumber) {
    return {
      success: false,
      status: 'error',
      timestamp: now,
      error: 'Número de telefone do cliente inválido ou não informado'
    };
  }

  if (!isUazapiConfigured(config)) {
    console.warn('[UAZAPI Send] Credenciais não configuradas. Mensagem em fila:', cleanNumber);
    return {
      success: true,
      status: 'simulated',
      messageId: `bp-sim-${Date.now()}`,
      timestamp: now,
      waMeUrl: buildWhatsAppDirectLink(cleanNumber, params.text),
      cleanNumber,
      details: { notice: 'Configurar credenciais UAZAPI para envio real' }
    };
  }

  const headers = buildUazapiHeaders(config);

  const officialPayload = {
    number: cleanNumber,
    text: params.text,
    delay: params.delay ?? 1200,
    readchat: params.readchat ?? true,
    ...(params.replyId ? { replyid: params.replyId } : {})
  };

  const legacyPayload = {
    ...officialPayload,
    session: config.instanceName,
    instanceName: config.instanceName
  };

  const endpointsToTry = [
    { url: `${config.baseUrl}/send/text`, body: officialPayload },
    { url: `${config.baseUrl}/sendText`, body: legacyPayload },
    { url: `${config.baseUrl}/message/sendText`, body: legacyPayload }
  ];

  let lastError = '';

  for (const { url, body } of endpointsToTry) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(9000)
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const msgId = data.id || data.messageId || data.key?.id || `uazapi-${Date.now()}`;
        logger.log('INFO', 'uazapi', `Mensagem enviada com sucesso para ${cleanNumber} via ${url}`, {
          phone: cleanNumber,
          data: { messageId: msgId, responseStatus: response.status }
        });
        return {
          success: true,
          status: 'sent',
          messageId: msgId,
          timestamp: now,
          waMeUrl: buildWhatsAppDirectLink(cleanNumber, params.text),
          cleanNumber,
          details: data
        };
      } else {
        const errBody = await response.text().catch(() => '');
        lastError = `HTTP ${response.status} em ${url}: ${errBody.slice(0, 150)}`;
        logger.log('WARN', 'uazapi', `Resposta não-200 da UAZAPI: ${lastError}`, {
          phone: cleanNumber,
          data: { status: response.status, body: errBody.slice(0, 200) }
        });

        // If the number is confirmed not registered on WhatsApp, stop cycling immediately
        if (errBody.includes('not on WhatsApp') || errBody.includes('not on whatsapp') || errBody.includes('invalid number')) {
          logger.log('WARN', 'business_logic', `Destinatário ${cleanNumber} não possui conta ativa no WhatsApp. Disparo finalizado sem retentativa desnecessária.`, {
            phone: cleanNumber
          });
          return {
            success: false,
            status: 'error',
            timestamp: now,
            waMeUrl: buildWhatsAppDirectLink(cleanNumber, params.text),
            cleanNumber,
            error: `O número ${cleanNumber} não possui conta ativa no WhatsApp.`
          };
        }
      }
    } catch (err: any) {
      lastError = `Falha de conexão com UAZAPI em ${url}: ${err.message}`;
      logger.log('WARN', 'uazapi', `Exceção ao chamar UAZAPI: ${lastError}`, {
        phone: cleanNumber,
        error: err
      });
    }
  }

  logger.log('ERROR', 'uazapi', `Falha definitiva no envio de mensagem para ${cleanNumber}: ${lastError}`, {
    phone: cleanNumber
  });

  return {
    success: false,
    status: 'error',
    timestamp: now,
    waMeUrl: buildWhatsAppDirectLink(cleanNumber, params.text),
    cleanNumber,
    error: lastError || 'Erro ao enviar mensagem via UAZAPI'
  };
}

/**
 * Dispatches an image or media message through official UAZAPI /send/media endpoint
 */
export async function sendUazapiMediaMessage(params: SendMediaMessageParams): Promise<UazapiSendResult> {
  const config = getUazapiConfig({
    workspaceId: params.workspaceId,
    instanceName: params.instanceName
  });
  const cleanNumber = normalizeWhatsAppNumber(params.number);
  const now = new Date().toISOString();

  if (!cleanNumber) {
    return {
      success: false,
      status: 'error',
      timestamp: now,
      error: 'Número de telefone inválido'
    };
  }

  if (!isUazapiConfigured(config)) {
    return {
      success: true,
      status: 'simulated',
      messageId: `bp-media-sim-${Date.now()}`,
      timestamp: now,
      waMeUrl: buildWhatsAppDirectLink(cleanNumber, params.caption || 'Foto do Projeto'),
      cleanNumber,
      details: { notice: 'Credenciais UAZAPI não configuradas' }
    };
  }

  const headers = buildUazapiHeaders(config);

  const officialPayload = {
    number: cleanNumber,
    type: params.mediaType || 'image',
    media: params.mediaUrl,
    caption: params.caption || '',
    fileName: params.fileName || 'foto_producao.jpg'
  };

  const legacyPayload = {
    ...officialPayload,
    session: config.instanceName,
    instanceName: config.instanceName,
    path: params.mediaUrl,
    url: params.mediaUrl
  };

  const endpointsToTry = [
    { url: `${config.baseUrl}/send/media`, body: officialPayload },
    { url: `${config.baseUrl}/sendImage`, body: legacyPayload },
    { url: `${config.baseUrl}/message/sendMedia`, body: legacyPayload }
  ];

  let lastError = '';

  for (const { url, body } of endpointsToTry) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12000)
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          status: 'sent',
          messageId: data.id || data.messageId || `uazapi-media-${Date.now()}`,
          timestamp: now,
          waMeUrl: buildWhatsAppDirectLink(cleanNumber, params.caption || 'Foto do Projeto'),
          cleanNumber,
          details: data
        };
      } else {
        const errBody = await response.text().catch(() => '');
        lastError = `HTTP ${response.status} em ${url}: ${errBody.slice(0, 150)}`;
      }
    } catch (err: any) {
      lastError = `Erro ao chamar ${url}: ${err.message}`;
    }
  }

  return {
    success: false,
    status: 'error',
    timestamp: now,
    waMeUrl: buildWhatsAppDirectLink(cleanNumber, params.caption || 'Foto do Projeto'),
    cleanNumber,
    error: lastError || 'Erro ao enviar mídia via UAZAPI'
  };
}

/**
 * Disconnects or logs out a WhatsApp instance synchronously and clears all session data
 */
export async function disconnectUazapiInstance(overrides?: { workspaceId?: string; instanceName?: string }): Promise<{ success: boolean; message: string }> {
  const config = getUazapiConfig(overrides);

  // 1. Marca imediatamente a sessão local como desconectada e limpa dados
  updateLocalWhatsAppSession(false, '', { 
    workspaceId: overrides?.workspaceId,
    explicitlyDisconnected: true,
    qrCode: undefined,
    pairingCode: undefined,
    profileName: ''
  });

  if (!isUazapiConfigured(config)) {
    return { success: true, message: 'WhatsApp desconectado com sucesso.' };
  }

  const headers = buildUazapiHeaders(config);

  // 2. Chama desconexão oficial síncrona na UAZAPI (/instance/disconnect)
  try {
    const res = await fetch(`${config.baseUrl}/instance/disconnect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      console.log(`[UAZAPI Disconnect] Instância ${config.instanceName} desconectada na UAZAPI.`);
    } else {
      const errText = await res.text().catch(() => '');
      console.warn(`[UAZAPI Disconnect HTTP ${res.status}]: ${errText.slice(0, 100)}`);
    }
  } catch (err: any) {
    console.warn(`[UAZAPI Disconnect Error]: ${err.message}`);
  }

  // 3. Garante limpeza final na sessão local
  updateLocalWhatsAppSession(false, '', { 
    workspaceId: overrides?.workspaceId,
    explicitlyDisconnected: true,
    qrCode: undefined,
    pairingCode: undefined,
    profileName: ''
  });

  return { success: true, message: 'WhatsApp desconectado da sua conta com sucesso.' };
}
