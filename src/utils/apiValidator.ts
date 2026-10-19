/**
 * BOMProjeto - Validador de Integridade de Dados Frontend
 * Validação rigorosa de formatos de data e valores financeiros antes do envio via fetch.
 */

export interface ValidationResult<T = any> {
  isValid: boolean;
  error?: string;
  cleanValue?: T;
}

export interface PayloadValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Valida se uma string ou data representa uma data de calendário real e válida.
 * Suporta formatos:
 * - DD/MM/AAAA (ex: 28/11/2026, 05/01/2026)
 * - D/M/AAAA (ex: 5/1/2026)
 * - YYYY-MM-DD (ex: 2026-11-28)
 * - Textual descritivo aceito: "Hoje", "25 Nov 2026", "28 de Novembro de 2026"
 * 
 * Rejeita explicitamente:
 * - Strings vazias ou só espaços
 * - "NaN", "undefined", "null", "Invalid Date"
 * - "00/00/0000", "0/0/0000"
 * - Dias inválidos (> 31 ou > dias do mês específico)
 * - Meses inválidos (> 12 ou < 1)
 * - Anos fora da faixa aceitável (2000 a 2100)
 */
export function validateDateFormat(
  value: unknown,
  fieldName = 'Data',
  isRequired = true
): ValidationResult<string> {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    if (isRequired) {
      return {
        isValid: false,
        error: `O campo "${fieldName}" é obrigatório e não pode ficar em branco.`
      };
    }
    return { isValid: true, cleanValue: '' };
  }

  const str = String(value).trim();

  // Rejeita padrões explicitamente corrompidos
  const corruptPatterns = [
    /^nan$/i,
    /^undefined$/i,
    /^null$/i,
    /^invalid(\s+date)?$/i,
    /^00?\/00?\/0000$/,
    /^0000-00-00$/,
    /^--$/
  ];

  if (corruptPatterns.some(pattern => pattern.test(str))) {
    return {
      isValid: false,
      error: `O campo "${fieldName}" possui um valor de data corrompido ("${str}"). Preencha uma data válida.`
    };
  }

  // 1. Formato Brasileiro: DD/MM/AAAA ou D/M/AAAA
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10);
    const year = parseInt(brMatch[3], 10);

    if (year < 2000 || year > 2100) {
      return {
        isValid: false,
        error: `O ano no campo "${fieldName}" (${year}) deve estar entre 2000 e 2100.`
      };
    }

    if (month < 1 || month > 12) {
      return {
        isValid: false,
        error: `O mês no campo "${fieldName}" (${month}) deve estar entre 1 e 12.`
      };
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      return {
        isValid: false,
        error: `O dia no campo "${fieldName}" (${day}) é inválido para o mês ${month}/${year}. O mês possui ${daysInMonth} dias.`
      };
    }

    const cleanDay = String(day).padStart(2, '0');
    const cleanMonth = String(month).padStart(2, '0');
    return {
      isValid: true,
      cleanValue: `${cleanDay}/${cleanMonth}/${year}`
    };
  }

  // 2. Formato ISO: YYYY-MM-DD com ou sem tempo (T ou espaço)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    if (year < 2000 || year > 2100) {
      return {
        isValid: false,
        error: `O ano no campo "${fieldName}" (${year}) deve estar entre 2000 e 2100.`
      };
    }

    if (month < 1 || month > 12) {
      return {
        isValid: false,
        error: `O mês no campo "${fieldName}" (${month}) deve estar entre 1 e 12.`
      };
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      return {
        isValid: false,
        error: `O dia no campo "${fieldName}" (${day}) é inválido para o mês ${month}/${year}.`
      };
    }

    return {
      isValid: true,
      cleanValue: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    };
  }

  // 3. Formato amigável do sistema: "Hoje", "Hoje, HH:mm", "DD Mês AAAA"
  const friendlyPatterns = [
    /^hoje(\s*,\s*\d{1,2}:\d{2})?$/i,
    /^\d{1,2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\s+\d{4}$/i,
    /^\d{1,2}\s+de\s+[a-zçãé]+\s+de\s+\d{4}$/i
  ];

  if (friendlyPatterns.some(pattern => pattern.test(str))) {
    return { isValid: true, cleanValue: str };
  }

  // Se não bater com nenhum formato aceito
  return {
    isValid: false,
    error: `O formato da data no campo "${fieldName}" ("${str}") é inválido. Utilize o formato DD/MM/AAAA (ex: 28/11/2026).`
  };
}

/**
 * Valida se um valor financeiro é numérico, positivo e não nulo/corrompido.
 * Aceita números (`14500`, `9533.50`) ou strings monetárias (`"14500"`, `"R$ 14.500,00"`, `"14.500,50"`).
 */
export function validateFinancialValue(
  value: unknown,
  fieldName = 'Valor Financeiro',
  options: { required?: boolean; min?: number; max?: number; allowZero?: boolean } = {}
): ValidationResult<number> {
  const { required = true, min = 0.01, max = 100_000_000, allowZero = false } = options;

  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    if (required) {
      return {
        isValid: false,
        error: `O campo "${fieldName}" é obrigatório e não pode ficar em branco.`
      };
    }
    return { isValid: true, cleanValue: 0 };
  }

  let numeric: number;

  if (typeof value === 'number') {
    numeric = value;
  } else if (typeof value === 'string') {
    const raw = value.trim();
    if (/^nan$/i.test(raw) || /^undefined$/i.test(raw) || /^null$/i.test(raw)) {
      return {
        isValid: false,
        error: `O campo "${fieldName}" contém um valor financeiro corrompido ("${raw}").`
      };
    }

    // Limpa símbolos de moeda e formatação brasileira (R$, pontos de milhar, vírgula decimal)
    let cleaned = raw.replace(/[^\d.,-]/g, '');

    // Se possui vírgula e ponto (ex: 1.250,50), remove pontos de milhar e troca vírgula por ponto
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      // Se possui apenas vírgula (ex: 1250,50)
      cleaned = cleaned.replace(',', '.');
    }

    numeric = Number(cleaned);
  } else {
    return {
      isValid: false,
      error: `O campo "${fieldName}" possui um tipo de dado inválido.`
    };
  }

  if (isNaN(numeric) || !isFinite(numeric)) {
    return {
      isValid: false,
      error: `O campo "${fieldName}" deve ser um número válido e não pode conter caracteres corrompidos.`
    };
  }

  if (numeric === 0 && !allowZero) {
    return {
      isValid: false,
      error: `O campo "${fieldName}" deve ser maior que zero (R$ 0,00 não é permitido).`
    };
  }

  const effectiveMin = allowZero ? 0 : min;
  if (numeric < effectiveMin) {
    return {
      isValid: false,
      error: `O campo "${fieldName}" não pode ser negativo ou inferior a R$ ${effectiveMin.toFixed(2)}.`
    };
  }

  if (numeric > max) {
    return {
      isValid: false,
      error: `O campo "${fieldName}" excede o limite máximo permitido de R$ ${max.toLocaleString('pt-BR')}.`
    };
  }

  return {
    isValid: true,
    cleanValue: Number(numeric.toFixed(2))
  };
}

/**
 * Valida a lista de parcelas financeiras de um projeto.
 */
export function validateInstallmentsArray(
  installments: unknown,
  totalExpected?: number
): ValidationResult<any[]> {
  if (!Array.isArray(installments)) {
    return {
      isValid: false,
      error: 'O cronograma financeiro deve ser uma lista válida de parcelas.'
    };
  }

  if (installments.length === 0) {
    return {
      isValid: false,
      error: 'O projeto deve conter pelo menos 1 parcela de pagamento configurada.'
    };
  }

  let calculatedSum = 0;

  for (let i = 0; i < installments.length; i++) {
    const inst = installments[i];
    const instLabel = inst.label || `Parcela #${inst.number || i + 1}`;

    // Valida valor da parcela
    const amountVal = validateFinancialValue(inst.amount, `Valor da ${instLabel}`, { min: 0.01, allowZero: false });
    if (!amountVal.isValid) {
      return { isValid: false, error: amountVal.error };
    }
    calculatedSum += amountVal.cleanValue!;

    // Valida data de vencimento da parcela se fornecida
    if (inst.dueDate !== undefined && inst.dueDate !== null && String(inst.dueDate).trim() !== '') {
      const dateVal = validateDateFormat(inst.dueDate, `Vencimento da ${instLabel}`, true);
      if (!dateVal.isValid) {
        return { isValid: false, error: dateVal.error };
      }
    }

    // Valida data de pagamento se já quitada
    if (inst.status === 'paid' && inst.paidDate) {
      const paidDateVal = validateDateFormat(inst.paidDate, `Data de quitação da ${instLabel}`, false);
      if (!paidDateVal.isValid) {
        return { isValid: false, error: paidDateVal.error };
      }
    }
  }

  // Se um valor total esperado foi fornecido, verifica tolerância de centavos
  if (totalExpected && totalExpected > 0) {
    const diff = Math.abs(calculatedSum - totalExpected);
    if (diff > 1.0) {
      return {
        isValid: false,
        error: `A soma das parcelas (R$ ${calculatedSum.toFixed(2)}) não confere com o valor total do projeto (R$ ${totalExpected.toFixed(2)}). Ajuste os valores das parcelas.`
      };
    }
  }

  return { isValid: true, cleanValue: installments };
}

/**
 * Validação de integridade global para qualquer payload de projeto antes do envio via fetch.
 */
export function validateProjectPayload(payload: any, isPatch = false): PayloadValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['O corpo da requisição está vazio ou em formato inválido.'] };
  }

  // 1. Validação de Nome do Cliente e Título (em criação ou se presente em patch)
  if (!isPatch || payload.clientName !== undefined) {
    if (!payload.clientName || typeof payload.clientName !== 'string' || payload.clientName.trim().length < 2) {
      errors.push('O Nome do Cliente é obrigatório e deve ter no mínimo 2 caracteres.');
    }
  }

  if (!isPatch || payload.title !== undefined) {
    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length < 3) {
      errors.push('O Título do Projeto é obrigatório e deve ter no mínimo 3 caracteres.');
    }
  }

  // 2. Validação de Data de Entrega
  if (!isPatch || payload.deliveryDate !== undefined) {
    const dateRes = validateDateFormat(payload.deliveryDate, 'Prazo Previsto de Entrega', !isPatch);
    if (!dateRes.isValid && dateRes.error) {
      errors.push(dateRes.error);
    }
  }

  // 3. Validação de Data de Contrato
  if (payload.contractDate !== undefined && payload.contractDate !== null && String(payload.contractDate).trim() !== '') {
    const contractRes = validateDateFormat(payload.contractDate, 'Data do Contrato', false);
    if (!contractRes.isValid && contractRes.error) {
      errors.push(contractRes.error);
    }
  }

  // 4. Validação de Valor Total do Projeto
  if (!isPatch || payload.totalValue !== undefined) {
    const valRes = validateFinancialValue(payload.totalValue, 'Valor Total do Projeto', { min: 1, allowZero: false });
    if (!valRes.isValid && valRes.error) {
      errors.push(valRes.error);
    }
  }

  // 5. Validação de Parcelas (se presentes)
  if (payload.installments && Array.isArray(payload.installments)) {
    const expTotal = typeof payload.totalValue === 'number' ? payload.totalValue : undefined;
    const instRes = validateInstallmentsArray(payload.installments, expTotal);
    if (!instRes.isValid && instRes.error) {
      errors.push(instRes.error);
    }
  }

  // 6. Validação do Módulo de Faturamento Inteligente (billingData)
  if (payload.billingData && typeof payload.billingData === 'object') {
    if (payload.billingData.total_amount !== undefined) {
      const billValRes = validateFinancialValue(payload.billingData.total_amount, 'Valor Total do Faturamento', { min: 1 });
      if (!billValRes.isValid && billValRes.error) {
        errors.push(billValRes.error);
      }
    }
    if (payload.billingData.first_due_date) {
      const billDateRes = validateDateFormat(payload.billingData.first_due_date, 'Vencimento da 1ª Parcela', false);
      if (!billDateRes.isValid && billDateRes.error) {
        errors.push(billDateRes.error);
      }
    }
  }

  // 7. Validação de Etapas e datas internas
  if (payload.stages && Array.isArray(payload.stages)) {
    payload.stages.forEach((stg: any, idx: number) => {
      if (stg.date && String(stg.date).trim() !== '') {
        const stgDateRes = validateDateFormat(stg.date, `Data da Etapa ${stg.name || idx + 1}`, false);
        if (!stgDateRes.isValid && stgDateRes.error) {
          errors.push(stgDateRes.error);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Varredura profunda e recursiva de qualquer payload JSON enviado ao backend.
 * Identifica e bloqueia valores de data corrompidos ou em branco e valores financeiros
 * inválidos, nulos ou corrompidos.
 */
export function deepScanCorruptedData(obj: any, path = ''): string[] {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object') return errors;

  // Regex para detecção de chaves relacionadas a datas e valores monetários
  const isDateKey = /(date|data|prazo|vencimento|deadline|entrega|duedate|startdate|enddate)/i;
  const isFinancialKey = /(value|valor|price|preco|amount|orcamento|budget|total_amount|saldo|faturamento|tarifa)/i;
  const isExcludedKey = /(valuetype|selectedvalue|paramvalue|categoryvalue|tokenvalue|rolevalue|statusvalue|fieldvalue|dateformatted)/i;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const currentPath = `${path}[${index}]`;
      if (item && typeof item === 'object') {
        errors.push(...deepScanCorruptedData(item, currentPath));
      }
    });
    return errors;
  }

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (value && typeof value === 'object') {
      errors.push(...deepScanCorruptedData(value, currentPath));
      continue;
    }

    if (isExcludedKey.test(key)) {
      continue;
    }

    // Validação de campos de data detectados
    if (isDateKey.test(key)) {
      const strVal = String(value ?? '').trim();
      if ((value === null || value === undefined || strVal === '') && (key === 'deliveryDate' || key === 'dueDate' || key === 'dataEntrega')) {
        errors.push(`O campo de data obrigatório "${currentPath}" não pode ficar em branco.`);
      } else if (strVal !== '') {
        const res = validateDateFormat(value, currentPath, false);
        if (!res.isValid && res.error) {
          errors.push(res.error);
        }
      }
    }

    // Validação de campos financeiros detectados
    if (isFinancialKey.test(key)) {
      if (value !== undefined) {
        const strVal = String(value ?? '').trim();
        if ((value === null || strVal === '') && (key === 'totalValue' || key === 'amount' || key === 'total_amount')) {
          errors.push(`O campo financeiro obrigatório "${currentPath}" não pode ficar em branco.`);
        } else if (strVal !== '') {
          const res = validateFinancialValue(value, currentPath, { required: false, min: 0, allowZero: true });
          if (!res.isValid && res.error) {
            errors.push(res.error);
          }
        }
      }
    }
  }

  return errors;
}

