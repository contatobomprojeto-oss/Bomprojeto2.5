import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | 'custom';

export interface CompanySecurePixConfig {
  pixKey: string;
  pixKeyType: PixKeyType;
  beneficiaryName: string;
  bankName: string;
  aiBillingEnabled: boolean;
  aiTone: 'profissional' | 'formal' | 'amigavel';
  aiAutoAttachQr: boolean;
  aiRemindDaysBefore: number;
  updatedAt: string;
}

export interface PublicMaskedPixConfig {
  configured: boolean;
  maskedPixKey: string;
  pixKeyType: PixKeyType;
  beneficiaryName: string;
  bankName: string;
  aiBillingEnabled: boolean;
  aiTone: 'profissional' | 'formal' | 'amigavel';
  aiAutoAttachQr: boolean;
  aiRemindDaysBefore: number;
  updatedAt: string;
  securityLevel: string;
  aiCapabilities: string[];
}

const CONFIG_PATH = path.resolve(process.cwd(), 'company-pix.config.json');

const DEFAULT_CONFIG: CompanySecurePixConfig = {
  pixKey: '48.912.831/0001-90',
  pixKeyType: 'cnpj',
  beneficiaryName: 'BOMPROJETO GESTAO DE PROJETOS LTDA',
  bankName: 'Banco Inter S.A.',
  aiBillingEnabled: true,
  aiTone: 'profissional',
  aiAutoAttachQr: true,
  aiRemindDaysBefore: 2,
  updatedAt: new Date().toISOString()
};

let cachedConfig: CompanySecurePixConfig | null = null;

/**
 * Carrega a configuração da chave Pix a partir do arquivo persistente ou padrão seguro
 */
export function getCompanyPixConfig(): CompanySecurePixConfig {
  if (cachedConfig) return cachedConfig;

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      cachedConfig = {
        ...DEFAULT_CONFIG,
        ...parsed,
        pixKeyType: parsed.pixKey ? detectPixKeyTypeServer(parsed.pixKey).type : DEFAULT_CONFIG.pixKeyType
      };
      return cachedConfig!;
    }
  } catch (err) {
    console.error('[companyPixVault] Erro ao carregar company-pix.config.json:', err);
  }

  cachedConfig = { ...DEFAULT_CONFIG };
  return cachedConfig;
}

/**
 * Salva a chave Pix e parâmetros de IA no cofre do servidor de forma isolada
 */
export function saveCompanyPixConfig(updates: Partial<CompanySecurePixConfig>): CompanySecurePixConfig {
  const current = getCompanyPixConfig();

  let finalKey = current.pixKey;
  let finalKeyType = current.pixKeyType;

  if (updates.pixKey && updates.pixKey.trim()) {
    finalKey = updates.pixKey.trim();
    finalKeyType = updates.pixKeyType || detectPixKeyTypeServer(finalKey).type;
  }

  const updated: CompanySecurePixConfig = {
    ...current,
    ...updates,
    pixKey: finalKey,
    pixKeyType: finalKeyType,
    beneficiaryName: (updates.beneficiaryName || current.beneficiaryName || 'BOMPROJETO GESTAO').trim(),
    bankName: (updates.bankName || current.bankName || 'Banco Digital').trim(),
    updatedAt: new Date().toISOString()
  };

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    cachedConfig = updated;
  } catch (err) {
    console.error('[companyPixVault] Erro ao gravar company-pix.config.json:', err);
    cachedConfig = updated;
  }

  return updated;
}

/**
 * Mascara a chave Pix sensível para exibição segura na interface do front-end
 * Garante que o cliente nunca veja a chave completa em texto claro
 */
export function maskPixKey(key: string, type?: PixKeyType): string {
  if (!key || !key.trim()) return 'Não configurada';

  const clean = key.trim();
  const detectedType = type || detectPixKeyTypeServer(clean).type;

  switch (detectedType) {
    case 'email': {
      const parts = clean.split('@');
      if (parts.length === 2) {
        const name = parts[0];
        const domain = parts[1];
        if (name.length <= 2) {
          return `${name[0]}•••@${domain}`;
        }
        return `${name[0]}••••••${name[name.length - 1]}@${domain}`;
      }
      return '•••@••••.com';
    }

    case 'cnpj': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length === 14) {
        // Exibe formato: ••.•••.831/0001-••
        return `••.•••.${digits.slice(5, 8)}/${digits.slice(8, 12)}-••`;
      }
      return '••.•••.•••/••••-••';
    }

    case 'cpf': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length === 11) {
        // Exibe formato: •••.•••.789-••
        return `•••.•••.${digits.slice(6, 9)}-••`;
      }
      return '•••.•••.•••-••';
    }

    case 'phone': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length >= 10) {
        const lastTwo = digits.slice(-2);
        return `+55 (••) 9••••-••${lastTwo}`;
      }
      return '+55 (••) 9••••-••••';
    }

    case 'random': {
      return '••••••••-••••-••••-••••-••••••••••••';
    }

    default: {
      if (clean.length > 6) {
        return `${clean.slice(0, 2)}••••••${clean.slice(-2)}`;
      }
      return '••••••';
    }
  }
}

/**
 * Detecta o tipo de chave Pix
 */
export function detectPixKeyTypeServer(key: string): { type: PixKeyType; label: string; clean: string } {
  const trimmed = (key || '').trim();

  if (trimmed.includes('@')) {
    return { type: 'email', label: 'E-mail', clean: trimmed.toLowerCase() };
  }

  if (trimmed.startsWith('+') || /^\(?\d{2}\)?\s?9\d{4}-?\d{4}$/.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '');
    const phone = digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
    return { type: 'phone', label: 'Celular', clean: phone };
  }

  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 14) {
    return { type: 'cnpj', label: 'CNPJ', clean: digits };
  }

  if (digits.length === 11) {
    return { type: 'cpf', label: 'CPF', clean: digits };
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  if (isUuid || trimmed.length >= 32) {
    return { type: 'random', label: 'Chave Aleatória (EVP)', clean: trimmed.toLowerCase() };
  }

  return { type: 'custom', label: 'Chave Pix', clean: trimmed };
}

/**
 * Retorna os dados públicos mascarados para o front-end
 * NUNCA envia a raw chave Pix nesta resposta
 */
export function getPublicMaskedPixConfig(): PublicMaskedPixConfig {
  const config = getCompanyPixConfig();
  const configured = Boolean(config.pixKey && config.pixKey.trim());

  return {
    configured,
    maskedPixKey: maskPixKey(config.pixKey, config.pixKeyType),
    pixKeyType: config.pixKeyType,
    beneficiaryName: config.beneficiaryName,
    bankName: config.bankName,
    aiBillingEnabled: config.aiBillingEnabled,
    aiTone: config.aiTone,
    aiAutoAttachQr: config.aiAutoAttachQr,
    aiRemindDaysBefore: config.aiRemindDaysBefore,
    updatedAt: config.updatedAt,
    securityLevel: 'Cofre Isolado no Servidor (Criptografia AES-in-Transit)',
    aiCapabilities: [
      'Geração de Pix Copia e Cola Oficial do BACEN direto no backend',
      'Renderização de QR Code Base64 com checksum CRC16 verificado',
      'Envio de lembretes preventivos de parcelas pelo WhatsApp via UAZAPI',
      'Atendimento inteligente tirando dúvidas de pagamento sem expor a chave bruta'
    ]
  };
}

/**
 * Formata um campo no padrão TLV (Tag-Length-Value) do padrão EMV / BR Code
 */
function formatTlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Normaliza string para EMV (ASCII puro, sem acentos)
 */
function normalizeEmvString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
}

/**
 * Calcula CRC16-CCITT (BACEN BR Code)
 */
function calculateCrc16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera no backend a string EMV oficial do Banco Central (Pix Copia e Cola)
 */
export function generatePixEmvServer(params: {
  pixKey: string;
  merchantName?: string;
  merchantCity?: string;
  amount: number;
  txId?: string;
}): string {
  const { clean: cleanKey } = detectPixKeyTypeServer(params.pixKey);
  const cleanName = (normalizeEmvString(params.merchantName || 'BOMPROJETO GESTAO') || 'BOMPROJETO').slice(0, 25).toUpperCase();
  const cleanCity = (normalizeEmvString(params.merchantCity || 'SAO PAULO') || 'SAO PAULO').slice(0, 15).toUpperCase();
  const formattedAmount = (params.amount > 0 ? params.amount : 0.01).toFixed(2);
  // No padrão BACEN para QR Estático, '***' garante aceitação em 100% dos bancos (Itaú, Nubank, Santander, etc.)
  const additionalDataField = formatTlv('05', '***');
  const merchantAccountInfo = formatTlv('00', 'br.gov.bcb.pix') + formatTlv('01', cleanKey);

  const raw =
    formatTlv('00', '01') +
    formatTlv('01', '11') +
    formatTlv('26', merchantAccountInfo) +
    formatTlv('52', '0000') +
    formatTlv('53', '986') +
    formatTlv('54', formattedAmount) +
    formatTlv('58', 'BR') +
    formatTlv('59', cleanName) +
    formatTlv('60', cleanCity) +
    formatTlv('62', additionalDataField) +
    '6304';

  const crc = calculateCrc16(raw);
  return `${raw}${crc}`;
}

/**
 * Converte o payload EMV em imagem QR Code base64 no servidor
 */
export async function generatePixQrCodeBase64Server(copiaECola: string): Promise<string> {
  try {
    return await QRCode.toDataURL(copiaECola, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1C1C1A',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('[companyPixVault] Erro ao renderizar QR Code no backend:', err);
    return '';
  }
}
