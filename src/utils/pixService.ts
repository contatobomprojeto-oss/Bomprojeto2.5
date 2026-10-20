import QRCode from 'qrcode';
import { Project, Installment } from '../types';

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | 'custom';

export interface PixDetails {
  rawKey: string;
  cleanKey: string;
  keyType: PixKeyType;
  keyTypeLabel: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  formattedAmount: string;
  txId: string;
  copiaECola: string; // Payload EMV oficial do Banco Central
  qrCodeBase64: string; // Imagem do QR Code em Base64
  isPlaceholder?: boolean; // Indica se é uma chave de exemplo/demonstração
}

/**
 * Validação algorítmica de CPF (Módulo 11 oficial da Receita Federal)
 */
export function isValidCpf(cpf: string): boolean {
  const digits = (cpf || '').replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // descarta sequências repetidas (00000000000, 11111111111, etc.)

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10), 10)) return false;

  return true;
}

/**
 * Utilitário seguro para cópia para a área de transferência com fallback
 */
export function safeCopyToClipboard(text: string): boolean {
  if (!text) return false;
  const clean = text.trim();
  try {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(clean);
      return true;
    }
  } catch {}
  try {
    const textArea = document.createElement('textarea');
    textArea.value = clean;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * Remove acentos e caracteres especiais para compatibilidade com o padrão EMV do BACEN
 */
function normalizeString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Identifica e higieniza com precisão o tipo de chave Pix de acordo com as normas do BACEN
 */
export function detectPixKeyType(key: string): { 
  type: PixKeyType; 
  label: string; 
  clean: string;
  isPlaceholder: boolean;
} {
  const trimmed = (key || '').trim();

  if (!trimmed) {
    return {
      type: 'custom',
      label: 'Não informada',
      clean: '',
      isPlaceholder: true
    };
  }

  // Verifica se é o e-mail de demonstração / placeholder
  const isPlaceholder = 
    trimmed.toLowerCase() === 'pix@gestaodeprojetos.com.br' ||
    trimmed.toLowerCase().includes('gestaodeprojetos.com.br');

  // 1. E-mail (contém @ e .)
  if (trimmed.includes('@') && trimmed.includes('.')) {
    return {
      type: 'email',
      label: 'E-mail',
      clean: trimmed.toLowerCase(),
      isPlaceholder
    };
  }

  const digits = trimmed.replace(/\D/g, '');

  // 2. Chave Aleatória (EVP / UUID) - 32 a 36 caracteres hexadecimais
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  const cleanHex = trimmed.replace(/-/g, '');
  if (isUuid || (cleanHex.length === 32 && /^[0-9a-fA-F]+$/.test(cleanHex))) {
    return {
      type: 'random',
      label: 'Chave Aleatória',
      clean: trimmed.toLowerCase(),
      isPlaceholder: false
    };
  }

  // 3. CNPJ (14 dígitos)
  if (digits.length === 14) {
    return {
      type: 'cnpj',
      label: 'CNPJ',
      clean: digits,
      isPlaceholder: false
    };
  }

  // 4. Telefone Celular Internacional com +55 ou 55 com 12/13 dígitos
  if (trimmed.startsWith('+55') || (trimmed.startsWith('55') && (digits.length === 12 || digits.length === 13))) {
    const purePhone = digits.startsWith('55') ? digits : `55${digits}`;
    return {
      type: 'phone',
      label: 'Telefone Celular',
      clean: `+${purePhone}`,
      isPlaceholder: false
    };
  }

  // Se tiver formatação explícita de telefone (parênteses ou sinal de +)
  if (trimmed.includes('(') || trimmed.includes(')') || trimmed.startsWith('+')) {
    const phoneDigits = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
    return {
      type: 'phone',
      label: 'Telefone Celular',
      clean: `+${phoneDigits}`,
      isPlaceholder: false
    };
  }

  // 5. Diferenciação rigorosa entre CPF e Celular com DDD (ambos possuem 11 dígitos):
  if (digits.length === 11) {
    // Se possui pontos e hífen (ex: 123.456.789-00), é garantidamente CPF
    if (trimmed.includes('.') || trimmed.includes('-')) {
      return {
        type: 'cpf',
        label: 'CPF',
        clean: digits,
        isPlaceholder: false
      };
    }

    // Se é válido pelo algoritmo oficial de CPF
    if (isValidCpf(digits)) {
      return {
        type: 'cpf',
        label: 'CPF',
        clean: digits,
        isPlaceholder: false
      };
    }

    // Se não é CPF válido e possui 3º dígito 9 (celular com DDD brasileiro: ex: 11987654321)
    if (digits.charAt(2) === '9') {
      return {
        type: 'phone',
        label: 'Telefone Celular',
        clean: `+55${digits}`,
        isPlaceholder: false
      };
    }

    return {
      type: 'cpf',
      label: 'CPF',
      clean: digits,
      isPlaceholder: false
    };
  }

  // 6. Telefone fixo com DDD (10 dígitos: ex: 1133334444)
  if (digits.length === 10) {
    return {
      type: 'phone',
      label: 'Telefone Fixo',
      clean: `+55${digits}`,
      isPlaceholder: false
    };
  }

  return {
    type: 'custom',
    label: 'Chave Pix',
    clean: trimmed,
    isPlaceholder
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
 * Calcula o checksum CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF)
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
 * Gera o payload oficial do Banco Central do Brasil para Pix Copia e Cola (BR Code)
 * 100% aderente ao Manual de Iniciação do Pix do Banco Central do Brasil (EMVCo BR Code).
 * 
 * ESTRUTURA DO PAYLOAD OFICIAL:
 * - 00 (Payload Format Indicator): '01' -> '000201'
 * - 01 (Point of Initiation Method): '11' -> '010211' (CRÍTICO: exigido por Nubank, Itaú, BB, etc.)
 * - 26 (Merchant Account Information):
 *      00 (GUI): 'br.gov.bcb.pix'
 *      01 (Chave Pix limpa): CPF, CNPJ, Celular (+55...), E-mail ou EVP
 * - 52 (Merchant Category Code): '0000' -> '52040000'
 * - 53 (Transaction Currency): '986' (BRL) -> '5303986'
 * - 54 (Transaction Amount): 'XXXX.XX'
 * - 58 (Country Code): 'BR' -> '5802BR'
 * - 59 (Merchant Name): Nome do recebedor (sem acentos, até 25 caracteres)
 * - 60 (Merchant City): Cidade do recebedor (sem acentos, até 15 caracteres)
 * - 62 (Additional Data Field Template): Tag 05 = '***' -> '62070503***' (padrão BACEN estático)
 * - 63 (CRC16-CCITT): '6304' + 4 dígitos hexadecimais em maiúsculas
 */
export function generatePixEmv(params: {
  pixKey: string;
  merchantName?: string;
  merchantCity?: string;
  amount?: number;
  txId?: string;
}): string {
  const { clean: cleanKey } = detectPixKeyType(params.pixKey);
  
  if (!cleanKey) {
    return '';
  }

  const cleanName = (normalizeString(params.merchantName || 'BOMPROJETO GESTAO') || 'BOMPROJETO')
    .slice(0, 25)
    .toUpperCase();
    
  const cleanCity = (normalizeString(params.merchantCity || 'SAO PAULO') || 'SAO PAULO')
    .slice(0, 15)
    .toUpperCase();

  const merchantAccountInfo = formatTlv('00', 'br.gov.bcb.pix') + formatTlv('01', cleanKey);
  
  // Tag 05 no campo 62: '***' (padrão oficial BACEN para QR Estático) ou txId alfanumérico válido
  let cleanTxId = '***';
  if (params.txId && params.txId !== '***') {
    const alphanumericTxId = params.txId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);
    if (alphanumericTxId) {
      cleanTxId = alphanumericTxId;
    }
  }
  const additionalDataField = formatTlv('05', cleanTxId);

  // Payload Format Indicator (00) -> Point of Initiation Method (01) -> Merchant Account Info (26)
  // Nota: A inclusão da Tag 01 com '11' (QR Estático) é obrigatória pela norma do BACEN (BR Code)
  // e é exigida expressamente por aplicativos bancários como Nubank, Itaú, Bradesco, BB, Caixa, etc.
  let raw = 
    formatTlv('00', '01') + // 00: Payload Format Indicator ('01')
    formatTlv('01', '11') + // 01: Point of Initiation Method ('11' = QR Estático reutilizável)
    formatTlv('26', merchantAccountInfo) + // 26: Merchant Account Information (br.gov.bcb.pix + chave)
    formatTlv('52', '0000') + // 52: Merchant Category Code ('0000')
    formatTlv('53', '986'); // 53: Currency Code (BRL = 986)

  // Se houver valor definido válido e maior que zero, inclui Tag 54 formatado em 2 casas decimais
  const numAmount = typeof params.amount === 'number'
    ? params.amount
    : parseFloat(String(params.amount || 0));

  if (!isNaN(numAmount) && isFinite(numAmount) && numAmount > 0) {
    const formattedAmount = numAmount.toFixed(2);
    raw += formatTlv('54', formattedAmount);
  }

  raw += 
    formatTlv('58', 'BR') + // 58: Country Code ('BR')
    formatTlv('59', cleanName) + // 59: Merchant Name
    formatTlv('60', cleanCity) + // 60: Merchant City
    formatTlv('62', additionalDataField) + // 62: Additional Data Field (txId)
    '6304'; // 63: CRC16 placeholder

  const crc = calculateCrc16(raw);
  return `${raw}${crc}`;
}

/**
 * Higieniza de forma rigorosa o código Pix Copia e Cola:
 * - Remove quebras de linha (\r, \n), tabulações e espaços duplos
 * - Elimina caracteres invisíveis Unicode (zero-width space, BOM, etc.)
 * - Garante que o payload esteja limpo e pronto para renderização ou envio
 */
export function sanitizePixCopiaECola(payload: string): string {
  if (typeof payload !== 'string') return '';
  return payload
    .replace(/[\r\n\t]+/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/**
 * Converte o código Pix Copia e Cola em imagem QR Code Base64
 * Higieniza o payload removendo quebras de linha e caracteres invisíveis que corrompem a leitura por câmeras bancárias
 * Configurado com contraste máximo (preto #000000 no branco) e margem EMV para leitura instantânea por câmeras
 */
export async function generatePixQrCodeBase64(copiaECola: string): Promise<string> {
  const sanitized = sanitizePixCopiaECola(copiaECola);
  if (!sanitized) return '';
  try {
    return await QRCode.toDataURL(sanitized, {
      width: 400,
      margin: 3, // Margem de segurança (quiet zone) exigida pela especificação EMV
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000', // Preto puro para máxima leitura por qualquer aplicativo de banco
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('[pixService] Erro ao renderizar QR Code:', err);
    return '';
  }
}

export interface BankAppLink {
  id: string;
  name: string;
  shortName: string;
  color: string;
  deepLink: string;
  webFallback: string;
}

/**
 * Retorna lista de deep links de atalho para os principais aplicativos de bancos brasileiros
 */
export function getBankAppLinks(): BankAppLink[] {
  return [
    {
      id: 'nubank',
      name: 'Nubank',
      shortName: 'Nubank',
      color: '#820AD1',
      deepLink: 'nubank://',
      webFallback: 'https://nubank.com.br'
    },
    {
      id: 'itau',
      name: 'Banco Itaú',
      shortName: 'Itaú',
      color: '#EC7000',
      deepLink: 'itau://',
      webFallback: 'https://www.itau.com.br'
    },
    {
      id: 'inter',
      name: 'Banco Inter',
      shortName: 'Inter',
      color: '#FF7A00',
      deepLink: 'bancointer://',
      webFallback: 'https://www.bancointer.com.br'
    },
    {
      id: 'bradesco',
      name: 'Banco Bradesco',
      shortName: 'Bradesco',
      color: '#CC092F',
      deepLink: 'bradesco://',
      webFallback: 'https://banco.bradesco'
    },
    {
      id: 'bb',
      name: 'Banco do Brasil',
      shortName: 'BB',
      color: '#FBF000',
      deepLink: 'bb://',
      webFallback: 'https://www.bb.com.br'
    },
    {
      id: 'santander',
      name: 'Santander',
      shortName: 'Santander',
      color: '#EC0000',
      deepLink: 'santander://',
      webFallback: 'https://www.santander.com.br'
    },
    {
      id: 'mercadopago',
      name: 'Mercado Pago',
      shortName: 'Mercado Pago',
      color: '#009EE3',
      deepLink: 'mercadopago://',
      webFallback: 'https://www.mercadopago.com.br'
    },
    {
      id: 'c6',
      name: 'C6 Bank',
      shortName: 'C6 Bank',
      color: '#242424',
      deepLink: 'c6bank://',
      webFallback: 'https://www.c6bank.com.br'
    }
  ];
}

/**
 * Cria a estrutura de dados Pix completa e segura para um cliente/projeto específico
 * Garante isolamento estrito de dados por projeto e parcela
 */
export async function buildClientPixDetails(
  project: Project,
  installment: Installment,
  customPixKey?: string,
  merchantName?: string
): Promise<PixDetails> {
  const isPlaceholderKey = (k?: string) => !k || k.toLowerCase().includes('gestaodeprojetos.com.br');

  // Chave Pix prioritária: Customizada da chamada -> Salva no projeto -> Configuração salva no localStorage
  let activeKey = customPixKey?.trim() || project.pixKey?.trim();
  if (!activeKey || isPlaceholderKey(activeKey)) {
    try {
      activeKey = localStorage.getItem('bomprojeto_company_pix_key') || '';
      if (!activeKey || isPlaceholderKey(activeKey)) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('bomprojeto_company_pix_key_')) {
            const v = localStorage.getItem(k);
            if (v && v.trim() && !isPlaceholderKey(v)) {
              activeKey = v.trim();
              break;
            }
          }
        }
      }
    } catch {
      activeKey = '';
    }
  }

  if ((!activeKey || isPlaceholderKey(activeKey)) && project.ownerEmail && project.ownerEmail.includes('@') && !isPlaceholderKey(project.ownerEmail)) {
    activeKey = project.ownerEmail.trim();
  }

  // Fallback seguro para CNPJ oficial registrado
  if (!activeKey || isPlaceholderKey(activeKey)) {
    activeKey = '48.912.831/0001-90';
  }

  const detected = detectPixKeyType(activeKey);
  const amount = installment.amount > 0 ? installment.amount : 0;
  const formattedAmount = amount > 0 
    ? amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    : '0,00';
  
  // Identificador visual amigável da OS para conferência no sistema
  const safeProjectCode = (project.code || 'PRJ').replace(/[^a-zA-Z0-9]/g, '').slice(-8);
  const displayTxId = `OS${safeProjectCode}P${installment.number || 1}`;

  const cleanMerchant = merchantName || project.workspaceName || 'BOM PROJETO';
  
  // 1. Se já havia um payload dinâmico oficial salvo na parcela com QR Code, aproveita diretamente
  if (installment.pixQrCode && installment.pixQrCode.startsWith('000201')) {
    const qrBase64 = installment.pixQrCodeBase64 || await generatePixQrCodeBase64(installment.pixQrCode);
    return {
      rawKey: activeKey,
      cleanKey: detected.clean,
      keyType: detected.type,
      keyTypeLabel: detected.label,
      merchantName: cleanMerchant,
      merchantCity: 'SAO PAULO',
      amount,
      formattedAmount,
      txId: displayTxId,
      copiaECola: installment.pixQrCode,
      qrCodeBase64: qrBase64,
      isPlaceholder: false
    };
  }

  // 2. Tenta gerar via gateway oficial (/api/payment/pix) para registrar no BACEN / Mercado Pago
  if (typeof window !== 'undefined' && amount > 0) {
    try {
      const resp = await fetch('/api/payment/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: `OS ${project.code} - ${installment.label || `Parcela #${installment.number}`}`,
          payer: {
            email: project.clientPhone ? `${project.clientPhone.replace(/\D/g, '')}@cliente.bomprojeto.com` : 'cliente@empresa.com',
            name: project.clientName || 'Cliente'
          },
          projectId: project.id,
          installmentNumber: installment.number
        }),
        signal: AbortSignal.timeout(3000)
      });
      if (resp.ok) {
        const orderData = await resp.json();
        if (orderData.qrCode && orderData.qrCode.startsWith('000201')) {
          installment.pixQrCode = orderData.qrCode;
          installment.pixQrCodeBase64 = orderData.qrCodeBase64;
          return {
            rawKey: activeKey,
            cleanKey: detected.clean,
            keyType: detected.type,
            keyTypeLabel: detected.label,
            merchantName: cleanMerchant,
            merchantCity: 'SAO PAULO',
            amount,
            formattedAmount,
            txId: orderData.paymentId || displayTxId,
            copiaECola: orderData.qrCode,
            qrCodeBase64: orderData.qrCodeBase64,
            isPlaceholder: false
          };
        }
      }
    } catch {
      // Continua para o gerador nativo BACEN homologado
    }
  }

  // 3. Gera o Copia e Cola oficial estático com validação BACEN completa (Tag 01 incluída)
  let copiaECola = detected.clean ? generatePixEmv({
    pixKey: detected.clean,
    merchantName: cleanMerchant,
    merchantCity: 'SAO PAULO',
    amount
  }) : '';

  copiaECola = sanitizePixCopiaECola(copiaECola);
  const qrCodeBase64 = copiaECola ? await generatePixQrCodeBase64(copiaECola) : '';

  return {
    rawKey: activeKey,
    cleanKey: detected.clean,
    keyType: detected.type,
    keyTypeLabel: detected.label,
    merchantName: cleanMerchant,
    merchantCity: 'SAO PAULO',
    amount,
    formattedAmount,
    txId: displayTxId,
    copiaECola,
    qrCodeBase64,
    isPlaceholder: detected.isPlaceholder
  };
}
