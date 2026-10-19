/**
 * BOMProjeto - Middleware de Interceptação e Validação Prévia de Fetch no Frontend
 * 
 * Intercepta chamadas de fetch no navegador antes do envio para o servidor.
 * Valida o formato de datas e valores financeiros em requisições de mutação (POST, PUT, PATCH),
 * bloqueando a requisição imediatamente e notificando a interface caso existam dados
 * corrompidos, inválidos ou em branco.
 */

import { 
  validateProjectPayload, 
  validateDateFormat, 
  validateFinancialValue,
  deepScanCorruptedData
} from './apiValidator';

export const VALIDATION_BLOCKED_EVENT = 'frontend-validation-blocked';

export interface ValidationBlockedEventDetail {
  url: string;
  method: string;
  errors: string[];
  primaryError: string;
}

let isInterceptorInstalled = false;
let originalFetch: typeof window.fetch | null = null;

/**
 * Notifica a aplicação e a interface de usuário sobre o bloqueio de salvamento.
 */
function notifyValidationBlocked(url: string, method: string, errors: string[]) {
  const primaryError = errors[0] || 'Dados corrompidos ou em branco detectados. Salvamento bloqueado.';
  
  console.warn(`[Middleware Fetch Frontend]: Bloqueado salvamento em ${method} ${url}`, {
    errors,
    timestamp: new Date().toISOString()
  });

  if (typeof window !== 'undefined') {
    const event = new CustomEvent<ValidationBlockedEventDetail>(VALIDATION_BLOCKED_EVENT, {
      detail: {
        url,
        method,
        errors,
        primaryError
      }
    });
    window.dispatchEvent(event);
  }
}

/**
 * Inspeciona o corpo de uma requisição e valida campos críticos de data e valor financeiro.
 */
export function inspectAndValidatePayload(
  url: string,
  method: string,
  body: any
): { isValid: boolean; errors: string[] } {
  // Apenas inspeciona mutações em rotas de dados (POST, PUT, PATCH)
  const upperMethod = (method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH'].includes(upperMethod)) {
    return { isValid: true, errors: [] };
  }

  const errors: string[] = [];

  // Se body for FormData
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    for (const [key, value] of (body as any).entries()) {
      if (typeof value === 'string') {
        const isDateKey = /(date|data|prazo|vencimento|deadline|entrega|duedate)/i.test(key);
        const isFinancialKey = /(value|valor|price|preco|amount|orcamento|budget|total)/i.test(key);
        if (isDateKey) {
          const res = validateDateFormat(value, key, false);
          if (!res.isValid && res.error) errors.push(res.error);
        } else if (isFinancialKey) {
          const res = validateFinancialValue(value, key, { required: false, allowZero: true });
          if (!res.isValid && res.error) errors.push(res.error);
        }
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  // Se body for URLSearchParams
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    for (const [key, value] of (body as any).entries()) {
      const isDateKey = /(date|data|prazo|vencimento|deadline|entrega|duedate)/i.test(key);
      const isFinancialKey = /(value|valor|price|preco|amount|orcamento|budget|total)/i.test(key);
      if (isDateKey) {
        const res = validateDateFormat(value, key, false);
        if (!res.isValid && res.error) errors.push(res.error);
      } else if (isFinancialKey) {
        const res = validateFinancialValue(value, key, { required: false, allowZero: true });
        if (!res.isValid && res.error) errors.push(res.error);
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  let parsed: any = null;

  if (typeof body === 'string') {
    try {
      parsed = JSON.parse(body);
    } catch {
      // Se não for JSON, ignora inspeção estruturada
      return { isValid: true, errors: [] };
    }
  } else if (body && typeof body === 'object') {
    parsed = body;
  }

  if (!parsed || typeof parsed !== 'object') {
    return { isValid: true, errors: [] };
  }

  // 1. Rota de orçamento de projeto: /api/projects/:id/budget
  if (url.includes('/budget')) {
    if (parsed.totalValue !== undefined) {
      const valRes = validateFinancialValue(parsed.totalValue, 'Valor Total do Orçamento', { min: 1 });
      if (!valRes.isValid && valRes.error) errors.push(valRes.error);
    }
    if (Array.isArray(parsed.installments)) {
      parsed.installments.forEach((inst: any, idx: number) => {
        const instLabel = inst.label || `Parcela #${idx + 1}`;
        const instVal = validateFinancialValue(inst.amount, `Valor da ${instLabel}`, { min: 0.01 });
        if (!instVal.isValid && instVal.error) errors.push(instVal.error);
        if (inst.dueDate) {
          const dateVal = validateDateFormat(inst.dueDate, `Vencimento da ${instLabel}`);
          if (!dateVal.isValid && dateVal.error) errors.push(dateVal.error);
        }
      });
    }
    return { isValid: errors.length === 0, errors };
  }

  // 2. Rota de quitação/parcelas: /api/projects/:id/pay-installment
  if (url.includes('/pay-installment')) {
    if (parsed.installmentNumber !== undefined && (isNaN(Number(parsed.installmentNumber)) || Number(parsed.installmentNumber) < 1)) {
      errors.push('O número da parcela é inválido.');
    }
    return { isValid: errors.length === 0, errors };
  }

  // 3. Rota geral de projetos: apenas criação (POST /api/projects) ou atualização direta (PATCH/PUT /api/projects/:id)
  // Ignora sub-rotas como /updates, /support-request, /react, /pix, /status, /whatsapp-alert
  const isDirectProjectCreation = upperMethod === 'POST' && /\/api\/projects(\?|$)/.test(url);
  const isDirectProjectPatchOrPut = (upperMethod === 'PATCH' || upperMethod === 'PUT') && /\/api\/projects\/[^\/\?]+(\?|$)/.test(url);

  if (isDirectProjectCreation || isDirectProjectPatchOrPut) {
    const isPatch = isDirectProjectPatchOrPut;
    const validation = validateProjectPayload(parsed, isPatch);
    if (!validation.isValid) {
      errors.push(...validation.errors);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Cria uma resposta HTTP 422 sintética para interromper a requisição localmente com segurança.
 */
function createBlockedResponse(errors: string[]): Response {
  const primaryError = errors[0] || 'Validação prévia no frontend falhou: dados corrompidos ou em branco.';
  const bodyText = JSON.stringify({
    success: false,
    error: primaryError,
    errors,
    blockedByMiddleware: true
  });

  return new Response(bodyText, {
    status: 422,
    statusText: 'Unprocessable Entity (Blocked by BOMProjeto Frontend Middleware)',
    headers: {
      'Content-Type': 'application/json',
      'X-Blocked-By': 'BOMProjeto-Frontend-Validator'
    }
  });
}

/**
 * Função de fetch segura que executa a validação prévia.
 */
export async function secureFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || (input instanceof Request ? input.method : 'GET');
  const body = init?.body || (input instanceof Request ? (input as any)._bodyInit : undefined);

  const check = inspectAndValidatePayload(url, method, body);
  if (!check.isValid) {
    notifyValidationBlocked(url, method, check.errors);
    return createBlockedResponse(check.errors);
  }

  const fetchFn = originalFetch || window.fetch;
  return fetchFn(input, init);
}

/**
 * Instala o interceptor global em `window.fetch` para garantir proteção em todo o frontend.
 */
export function initFrontendFetchInterceptor() {
  if (typeof window === 'undefined' || isInterceptorInstalled) {
    return;
  }

  try {
    originalFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
  } catch {
    originalFetch = null;
  }

  if (!originalFetch) {
    return;
  }

  const interceptedFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    const body = init?.body || (input instanceof Request ? (input as any)._bodyInit : undefined);

    const check = inspectAndValidatePayload(url, method, body);
    if (!check.isValid) {
      notifyValidationBlocked(url, method, check.errors);
      return createBlockedResponse(check.errors);
    }

    if (originalFetch) {
      return originalFetch(input, init);
    }
    return Promise.resolve(new Response(JSON.stringify({ success: false, error: 'Fetch indisponível' }), { status: 500 }));
  };

  // Instala de forma segura garantindo que window.fetch tenha sempre getter e setter válidos
  let installed = false;

  // 1. Tenta atribuir diretamente (usando o setter seguro já registrado em index.html)
  try {
    (window as any).fetch = interceptedFetch;
    installed = true;
  } catch (errAssign) {
    // 2. Se falhar por qualquer motivo de restrição de getter, redefine no window com get e set
    try {
      Object.defineProperty(window, 'fetch', {
        get: () => interceptedFetch,
        set: (fn) => {
          if (typeof fn === 'function') {
            originalFetch = fn;
          }
        },
        configurable: true,
        enumerable: true
      });
      installed = true;
    } catch (errDef) {
      // 3. Fallback no Window.prototype caso window seja não configurável
      try {
        const winProto = typeof Window !== 'undefined' ? Window.prototype : null;
        if (winProto) {
          Object.defineProperty(winProto, 'fetch', {
            get: () => interceptedFetch,
            set: (fn) => {
              if (typeof fn === 'function') {
                originalFetch = fn;
              }
            },
            configurable: true,
            enumerable: true
          });
          installed = true;
        }
      } catch (errProto) {}
    }
  }

  isInterceptorInstalled = installed;
  if (installed) {
    console.info('🛡️ [BOMProjeto] Middleware de validação prévia de fetch ativo no frontend.');
  }
}

/**
 * Helper para registrar um ouvinte de bloqueios de validação no frontend
 */
export function onFrontendValidationBlocked(callback: (detail: ValidationBlockedEventDetail) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const custom = e as CustomEvent<ValidationBlockedEventDetail>;
    if (custom.detail) {
      callback(custom.detail);
    }
  };

  window.addEventListener(VALIDATION_BLOCKED_EVENT, handler);
  return () => {
    window.removeEventListener(VALIDATION_BLOCKED_EVENT, handler);
  };
}
