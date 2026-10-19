/**
 * BOMProjeto Production Structured Logger & Observability Engine
 * Provides structured trace logging, error tracking, metric windows, and alert thresholds.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type LogCategory = 'webhook' | 'queue' | 'uazapi' | 'ai_agent' | 'business_logic' | 'system';

export interface StructuredLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  traceId?: string;
  message: string;
  phone?: string;
  projectId?: string;
  latencyMs?: number;
  data?: any;
  errorStack?: string;
}

export interface SystemHealthMetrics {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  totalEventsProcessed: number;
  totalErrors: number;
  errorRatePercent: number;
  activeQueueLength: number;
  dlqLength: number;
  recentLogsCount: number;
  alerts: Array<{
    id: string;
    severity: 'INFO' | 'WARN' | 'CRITICAL';
    message: string;
    triggeredAt: string;
  }>;
  windowStats: {
    last5Minutes: { total: number; errors: number; errorRate: number };
    last1Hour: { total: number; errors: number; errorRate: number };
    last24Hours: { total: number; errors: number; errorRate: number };
  };
}

class ObservabilityManager {
  private logs: StructuredLog[] = [];
  private maxLogs = 2000;
  private totalEventsCounter = 0;
  private totalErrorsCounter = 0;
  private activeAlerts: Array<{ id: string; severity: 'INFO' | 'WARN' | 'CRITICAL'; message: string; triggeredAt: string }> = [];

  constructor() {
    this.log('INFO', 'system', 'Sistema de Observabilidade e Auditoria de Logs inicializado.');
  }

  public log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    meta?: {
      traceId?: string;
      phone?: string;
      projectId?: string;
      latencyMs?: number;
      data?: any;
      error?: any;
    }
  ): StructuredLog {
    this.totalEventsCounter++;
    if (level === 'ERROR' || level === 'FATAL') {
      this.totalErrorsCounter++;
    }

    const logEntry: StructuredLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      traceId: meta?.traceId,
      message,
      phone: meta?.phone,
      projectId: meta?.projectId,
      latencyMs: meta?.latencyMs,
      data: meta?.data,
      errorStack: meta?.error instanceof Error ? meta.error.stack : (typeof meta?.error === 'string' ? meta.error : undefined)
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Format console output cleanly
    const badge = `[${logEntry.timestamp.slice(11, 19)}] [${level}] [${category.toUpperCase()}]`;
    if (level === 'ERROR' || level === 'FATAL') {
      console.error(`${badge} ❌ ${message}`, meta?.data || meta?.error || '');
      this.checkAlertThresholds();
    } else if (level === 'WARN') {
      console.warn(`${badge} ⚠️ ${message}`, meta?.data || '');
    } else {
      console.log(`${badge} ${message}`);
    }

    return logEntry;
  }

  public getLogs(options?: {
    level?: LogLevel | 'ALL';
    category?: LogCategory | 'ALL';
    search?: string;
    limit?: number;
    phone?: string;
  }): StructuredLog[] {
    let result = this.logs;

    if (options?.level && options.level !== 'ALL') {
      result = result.filter(l => l.level === options.level);
    }
    if (options?.category && options.category !== 'ALL') {
      result = result.filter(l => l.category === options.category);
    }
    if (options?.phone) {
      const clean = options.phone.replace(/\D/g, '');
      result = result.filter(l => l.phone && l.phone.includes(clean));
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter(l => 
        l.message.toLowerCase().includes(q) ||
        (l.phone && l.phone.includes(q)) ||
        (l.projectId && l.projectId.toLowerCase().includes(q)) ||
        (l.traceId && l.traceId.toLowerCase().includes(q))
      );
    }

    return result.slice(0, options?.limit || 100);
  }

  public getMetrics(activeQueueLength = 0, dlqLength = 0): SystemHealthMetrics {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    let total5m = 0, err5m = 0;
    let total1h = 0, err1h = 0;
    let total24h = 0, err24h = 0;

    for (const log of this.logs) {
      const t = new Date(log.timestamp).getTime();
      const isErr = log.level === 'ERROR' || log.level === 'FATAL';

      if (t >= fiveMinAgo) {
        total5m++;
        if (isErr) err5m++;
      }
      if (t >= oneHourAgo) {
        total1h++;
        if (isErr) err1h++;
      }
      if (t >= twentyFourHoursAgo) {
        total24h++;
        if (isErr) err24h++;
      }
    }

    const rate5m = total5m > 0 ? Number(((err5m / total5m) * 100).toFixed(2)) : 0;
    const rate1h = total1h > 0 ? Number(((err1h / total1h) * 100).toFixed(2)) : 0;
    const rate24h = total24h > 0 ? Number(((err24h / total24h) * 100).toFixed(2)) : 0;

    let status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    if (dlqLength > 0 || rate5m >= 15 || rate1h >= 20) {
      status = 'CRITICAL';
    } else if (rate5m > 5 || err5m > 3 || dlqLength > 0) {
      status = 'DEGRADED';
    }

    return {
      status,
      totalEventsProcessed: this.totalEventsCounter,
      totalErrors: this.totalErrorsCounter,
      errorRatePercent: rate1h,
      activeQueueLength,
      dlqLength,
      recentLogsCount: this.logs.length,
      alerts: this.activeAlerts.slice(0, 5),
      windowStats: {
        last5Minutes: { total: total5m, errors: err5m, errorRate: rate5m },
        last1Hour: { total: total1h, errors: err1h, errorRate: rate1h },
        last24Hours: { total: total24h, errors: err24h, errorRate: rate24h }
      }
    };
  }

  private checkAlertThresholds() {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const recentErrors = this.logs.filter(l => (l.level === 'ERROR' || l.level === 'FATAL') && new Date(l.timestamp).getTime() >= fiveMinAgo);

    if (recentErrors.length >= 5) {
      const alertId = `alert-${Math.floor(now / (60 * 1000))}`;
      if (!this.activeAlerts.some(a => a.id === alertId)) {
        this.activeAlerts.unshift({
          id: alertId,
          severity: 'CRITICAL',
          message: `Taxa anormal de erros detectada: ${recentErrors.length} falhas registradas nos últimos 5 minutos!`,
          triggeredAt: new Date().toISOString()
        });
        if (this.activeAlerts.length > 20) this.activeAlerts.pop();
      }
    }
  }

  public clearLogs() {
    this.logs = [];
    this.activeAlerts = [];
    this.log('INFO', 'system', 'Logs de auditoria e alertas limpos pelo administrador.');
  }
}

export const logger = new ObservabilityManager();
