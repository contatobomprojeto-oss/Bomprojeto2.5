import { Project } from '../types';

export type DateFilterPreset = 
  | 'all' 
  | 'today' 
  | 'last_7_days' 
  | 'last_30_days' 
  | 'this_month' 
  | 'last_month' 
  | 'this_year' 
  | 'custom';

export type DateFilterBasis = 'contract' | 'delivery' | 'both';

export interface DateRangeFilter {
  preset: DateFilterPreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  basis: DateFilterBasis;
}

export const DEFAULT_DATE_FILTER: DateRangeFilter = {
  preset: 'all',
  startDate: '',
  endDate: '',
  basis: 'contract'
};

/**
 * Formata um objeto Date para YYYY-MM-DD no fuso local
 */
export function formatToYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna as datas de início e fim no formato YYYY-MM-DD para cada preset
 */
export function getDateRangeForPreset(preset: DateFilterPreset): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case 'today': {
      const todayStr = formatToYmd(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case 'last_7_days': {
      const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      return { startDate: formatToYmd(past7), endDate: formatToYmd(now) };
    }
    case 'last_30_days': {
      const past30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      return { startDate: formatToYmd(past30), endDate: formatToYmd(now) };
    }
    case 'this_month': {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return { startDate: formatToYmd(firstDay), endDate: formatToYmd(lastDay) };
    }
    case 'last_month': {
      const firstDayPrev = new Date(year, month - 1, 1);
      const lastDayPrev = new Date(year, month, 0);
      return { startDate: formatToYmd(firstDayPrev), endDate: formatToYmd(lastDayPrev) };
    }
    case 'this_year': {
      const firstDayYear = new Date(year, 0, 1);
      const lastDayYear = new Date(year, 11, 31);
      return { startDate: formatToYmd(firstDayYear), endDate: formatToYmd(lastDayYear) };
    }
    case 'all':
    default:
      return { startDate: '', endDate: '' };
  }
}

/**
 * Converte strings variadas (DD/MM/YYYY, YYYY-MM-DD, DD/MM, ISO, etc.) para Date
 */
export function parseFlexibleDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // DD/MM/YYYY ou DD-MM-YYYY
  const brFullMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brFullMatch) {
    const day = parseInt(brFullMatch[1], 10);
    const month = parseInt(brFullMatch[2], 10) - 1;
    const year = parseInt(brFullMatch[3], 10);
    return new Date(year, month, day);
  }

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day);
  }

  // DD/MM (assume o ano atual)
  const brShortMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (brShortMatch) {
    const day = parseInt(brShortMatch[1], 10);
    const month = parseInt(brShortMatch[2], 10) - 1;
    return new Date(new Date().getFullYear(), month, day);
  }

  // Parse ISO padrão
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Verifica se uma data específica cai dentro do intervalo startDate e endDate
 */
export function isDateWithinRange(
  targetDate: Date | null,
  startDateStr: string,
  endDateStr: string
): boolean {
  if (!targetDate) return false;

  if (startDateStr) {
    const start = parseFlexibleDate(startDateStr);
    if (start) {
      start.setHours(0, 0, 0, 0);
      if (targetDate.getTime() < start.getTime()) {
        return false;
      }
    }
  }

  if (endDateStr) {
    const end = parseFlexibleDate(endDateStr);
    if (end) {
      end.setHours(23, 59, 59, 999);
      if (targetDate.getTime() > end.getTime()) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Testa se um projeto pertence ao período selecionado
 */
export function isProjectInDateRange(project: Project, filter: DateRangeFilter): boolean {
  if (filter.preset === 'all' && !filter.startDate && !filter.endDate) {
    return true;
  }

  const contractDate = parseFlexibleDate(project.contractDate);
  const deliveryDate = parseFlexibleDate(project.deliveryDate);

  if (filter.basis === 'contract') {
    if (!contractDate) return true; // se não tem data, não exclui bruscamente
    return isDateWithinRange(contractDate, filter.startDate, filter.endDate);
  }

  if (filter.basis === 'delivery') {
    if (!deliveryDate) return true;
    return isDateWithinRange(deliveryDate, filter.startDate, filter.endDate);
  }

  // 'both': satisfaz se contrato OU entrega OU alguma parcela cair no período
  const matchesContract = contractDate ? isDateWithinRange(contractDate, filter.startDate, filter.endDate) : false;
  const matchesDelivery = deliveryDate ? isDateWithinRange(deliveryDate, filter.startDate, filter.endDate) : false;

  if (matchesContract || matchesDelivery) return true;

  // Fallback: verifica parcelas
  if (project.installments && project.installments.length > 0) {
    const anyInst = project.installments.some(inst => {
      const d = parseFlexibleDate(inst.paidDate || inst.dueDate);
      return d ? isDateWithinRange(d, filter.startDate, filter.endDate) : false;
    });
    if (anyInst) return true;
  }

  return false;
}

/**
 * Filtra lista de projetos pelo filtro de datas
 */
export function filterProjectsByDate(projects: Project[], filter: DateRangeFilter): Project[] {
  if (filter.preset === 'all' && !filter.startDate && !filter.endDate) {
    return projects;
  }
  return projects.filter(p => isProjectInDateRange(p, filter));
}

/**
 * Formata um rótulo legível em português do período selecionado
 */
export function formatDateRangeLabel(filter: DateRangeFilter): string {
  if (filter.preset === 'all' && !filter.startDate && !filter.endDate) {
    return 'Todo o histórico';
  }

  const formatPtDate = (ymd: string) => {
    if (!ymd) return '';
    const parts = ymd.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return ymd;
  };

  switch (filter.preset) {
    case 'today':
      return `Hoje (${formatPtDate(filter.startDate)})`;
    case 'last_7_days':
      return `Últimos 7 dias (${formatPtDate(filter.startDate)} a ${formatPtDate(filter.endDate)})`;
    case 'last_30_days':
      return `Últimos 30 dias (${formatPtDate(filter.startDate)} a ${formatPtDate(filter.endDate)})`;
    case 'this_month':
      return `Este Mês (${formatPtDate(filter.startDate)} a ${formatPtDate(filter.endDate)})`;
    case 'last_month':
      return `Mês Anterior (${formatPtDate(filter.startDate)} a ${formatPtDate(filter.endDate)})`;
    case 'this_year':
      return `Ano Atual (${new Date().getFullYear()})`;
    case 'custom':
    default:
      if (filter.startDate && filter.endDate) {
        return `${formatPtDate(filter.startDate)} até ${formatPtDate(filter.endDate)}`;
      }
      if (filter.startDate) {
        return `A partir de ${formatPtDate(filter.startDate)}`;
      }
      if (filter.endDate) {
        return `Até ${formatPtDate(filter.endDate)}`;
      }
      return 'Período personalizado';
  }
}
