import { logger } from './logger';

export interface QueuedMessageJob {
  id: string;
  traceId: string;
  senderPhone: string;
  payloadText: string;
  rawPayload?: any;
  projectId?: string;
  workspaceId?: string;
  attempts: number;
  maxAttempts: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'DEAD_LETTER';
  createdAt: string;
  lastAttemptAt?: string;
  nextRetryAt?: number;
  errorMessage?: string;
  responsePreview?: string;
}

export interface DeadLetterItem {
  job: QueuedMessageJob;
  deadLetteredAt: string;
  finalError: string;
  retryCount: number;
}

export class ResilientMessageQueue {
  private deduplicationStore: Map<string, { timestamp: number; result?: any }> = new Map();
  private pendingQueue: QueuedMessageJob[] = [];
  private processingQueue: Map<string, QueuedMessageJob> = new Map();
  private deadLetterQueue: DeadLetterItem[] = [];
  private senderActiveLocks: Set<string> = new Set();
  private senderBuffers: Map<string, { timer: NodeJS.Timeout; texts: string[]; traceId: string; rawPayload: any }> = new Map();
  
  // Rate limiting & concurrency constraints
  private isWorkerRunning = false;
  private maxConcurrentWorkers = 3;
  private currentActiveWorkers = 0;
  private minIntervalBetweenDispatchesMs = 800;
  private lastDispatchTime = 0;

  // Deduplication TTL (5 minutes)
  private readonly DEDUP_TTL_MS = 5 * 60 * 1000;

  constructor() {
    // Periodically clean old deduplication keys every 2 minutes
    setInterval(() => this.cleanupDeduplication(), 2 * 60 * 1000);
    // Worker tick loop every 400ms
    setInterval(() => this.processNextJobs(), 400);
  }

  /**
   * Generates a deterministic hash for deduplicating incoming webhooks and dispatch requests.
   */
  public generateIdempotencyKey(senderPhone: string, textOrId: string): string {
    const cleanPhone = senderPhone.replace(/\D/g, '');
    const cleanContent = textOrId.trim().toLowerCase().slice(0, 80);
    return `dedup-${cleanPhone}-${cleanContent}`;
  }

  /**
   * Checks if an incoming event was already processed within the idempotency window.
   */
  public isDuplicate(key: string): boolean {
    const existing = this.deduplicationStore.get(key);
    if (!existing) return false;

    if (Date.now() - existing.timestamp > this.DEDUP_TTL_MS) {
      this.deduplicationStore.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Marks a key as processed to prevent redundant executions.
   */
  public markProcessed(key: string, result?: any) {
    this.deduplicationStore.set(key, { timestamp: Date.now(), result });
  }

  /**
   * Debounces fast consecutive messages from the same sender (e.g. within 1.8 seconds)
   * into a single aggregated message, preventing race conditions and fragmented AI replies.
   */
  public enqueueIncomingWithDebounce(
    senderPhone: string,
    text: string,
    rawPayload: any,
    onReadyToProcess: (aggregatedText: string, traceId: string) => Promise<void>
  ): void {
    const clean = senderPhone.replace(/\D/g, '');
    const traceId = `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const existingBuffer = this.senderBuffers.get(clean);
    if (existingBuffer) {
      clearTimeout(existingBuffer.timer);
      existingBuffer.texts.push(text);
      logger.log('INFO', 'queue', `[Debounce Agrupador] Nova mensagem de ${clean} agrupada ao contexto pendente (${existingBuffer.texts.length} msgs).`, {
        phone: clean,
        traceId: existingBuffer.traceId
      });

      existingBuffer.timer = setTimeout(async () => {
        const fullText = existingBuffer.texts.join(' \n');
        this.senderBuffers.delete(clean);
        await onReadyToProcess(fullText, existingBuffer.traceId);
      }, 1600);
    } else {
      const buffer = {
        texts: [text],
        traceId,
        rawPayload,
        timer: setTimeout(async () => {
          const current = this.senderBuffers.get(clean);
          if (current) {
            const fullText = current.texts.join(' \n');
            this.senderBuffers.delete(clean);
            await onReadyToProcess(fullText, current.traceId);
          }
        }, 1600)
      };
      this.senderBuffers.set(clean, buffer);
    }
  }

  /**
   * Adds an outgoing message job with automatic retry parameters.
   */
  public enqueueJob(
    jobParams: Omit<QueuedMessageJob, 'id' | 'attempts' | 'status' | 'createdAt'>,
    handler: (job: QueuedMessageJob) => Promise<{ success: boolean; error?: string; responsePreview?: string }>
  ): QueuedMessageJob {
    const job: QueuedMessageJob = {
      ...jobParams,
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      attempts: 0,
      maxAttempts: jobParams.maxAttempts ?? 4,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    (job as any)._handler = handler;
    this.pendingQueue.push(job);

    logger.log('INFO', 'queue', `Job de disparo enfileirado [${job.id}] para ${job.senderPhone}. Fila pendente: ${this.pendingQueue.length}`, {
      traceId: job.traceId,
      phone: job.senderPhone,
      data: { attempts: job.attempts, maxAttempts: job.maxAttempts }
    });

    return job;
  }

  /**
   * Worker dispatcher enforcing per-sender locks, concurrency limits, and exponential backoff.
   */
  private async processNextJobs() {
    if (this.currentActiveWorkers >= this.maxConcurrentWorkers || this.pendingQueue.length === 0) {
      return;
    }

    const now = Date.now();
    // Throttle dispatch rate to prevent WhatsApp ban / 429
    if (now - this.lastDispatchTime < this.minIntervalBetweenDispatchesMs) {
      return;
    }

    // Find the next eligible job whose retry time has arrived and whose sender is not currently locked
    const eligibleIndex = this.pendingQueue.findIndex(job => {
      if (job.nextRetryAt && now < job.nextRetryAt) return false;
      if (this.senderActiveLocks.has(job.senderPhone)) return false;
      return true;
    });

    if (eligibleIndex === -1) return;

    const [job] = this.pendingQueue.splice(eligibleIndex, 1);
    const handler = (job as any)._handler;
    if (!handler) {
      logger.log('ERROR', 'queue', `Job [${job.id}] sem handler associado descartado.`, { traceId: job.traceId });
      return;
    }

    this.currentActiveWorkers++;
    this.lastDispatchTime = now;
    this.senderActiveLocks.add(job.senderPhone);
    this.processingQueue.set(job.id, job);

    job.status = 'PROCESSING';
    job.attempts++;
    job.lastAttemptAt = new Date().toISOString();

    const startTime = Date.now();

    try {
      logger.log('INFO', 'queue', `Processando tentativa ${job.attempts}/${job.maxAttempts} do job [${job.id}] para ${job.senderPhone}...`, {
        traceId: job.traceId,
        phone: job.senderPhone
      });

      const result = await handler(job);
      const latencyMs = Date.now() - startTime;

      if (result.success) {
        job.status = 'COMPLETED';
        job.responsePreview = result.responsePreview;
        this.processingQueue.delete(job.id);
        this.senderActiveLocks.delete(job.senderPhone);

        logger.log('INFO', 'queue', `Job [${job.id}] concluído com sucesso em ${latencyMs}ms.`, {
          traceId: job.traceId,
          phone: job.senderPhone,
          latencyMs
        });
      } else {
        throw new Error(result.error || 'Erro reportado pelo executor de envio');
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = (err?.message || String(err) || 'Erro desconhecido').toString();
      job.errorMessage = errorMsg;

      const isNonRetryable = 
        errorMsg.includes('não possui conta ativa no WhatsApp') || 
        errorMsg.includes('not on WhatsApp') || 
        errorMsg.includes('inválido');

      if (!isNonRetryable && job.attempts < job.maxAttempts) {
        // Exponential backoff: 2s, 4s, 8s, 16s with random jitter
        const backoffSeconds = Math.pow(2, job.attempts) + Math.random();
        job.status = 'RETRYING';
        job.nextRetryAt = Date.now() + Math.round(backoffSeconds * 1000);

        this.processingQueue.delete(job.id);
        this.senderActiveLocks.delete(job.senderPhone);
        this.pendingQueue.push(job);

        logger.log('WARN', 'queue', `Falha temporária no job [${job.id}]: ${errorMsg}. Reagendado para daqui a ${backoffSeconds.toFixed(1)}s (tentativa ${job.attempts}/${job.maxAttempts}).`, {
          traceId: job.traceId,
          phone: job.senderPhone,
          latencyMs,
          error: err
        });
      } else {
        // Non-retryable or exceeded max retries -> Move to Dead Letter Queue or mark failed
        job.status = isNonRetryable ? 'FAILED' : 'DEAD_LETTER';
        this.processingQueue.delete(job.id);
        this.senderActiveLocks.delete(job.senderPhone);

        const deadItem: DeadLetterItem = {
          job,
          deadLetteredAt: new Date().toISOString(),
          finalError: errorMsg,
          retryCount: job.attempts
        };
        this.deadLetterQueue.unshift(deadItem);
        if (this.deadLetterQueue.length > 500) this.deadLetterQueue.pop();

        logger.log(isNonRetryable ? 'WARN' : 'ERROR', 'queue', `${isNonRetryable ? '⚠️ Falha permanente (sem retentativa)' : '❌ Job esgotou retentativas'}: [${job.id}]. Erro: ${job.errorMessage}`, {
          traceId: job.traceId,
          phone: job.senderPhone,
          latencyMs,
          error: err
        });
      }
    } finally {
      this.currentActiveWorkers--;
    }
  }

  /**
   * Retries a dead-lettered message manually from the Admin console.
   */
  public retryDeadLetterJob(jobId: string, customHandler?: (job: QueuedMessageJob) => Promise<any>): boolean {
    const index = this.deadLetterQueue.findIndex(item => item.job.id === jobId);
    if (index === -1) return false;

    const [item] = this.deadLetterQueue.splice(index, 1);
    const job = item.job;
    job.attempts = 0;
    job.status = 'PENDING';
    job.nextRetryAt = undefined;
    job.errorMessage = undefined;

    if (customHandler) {
      (job as any)._handler = customHandler;
    }

    this.pendingQueue.push(job);
    logger.log('INFO', 'queue', `Job [${job.id}] reativado da Dead Letter Queue para reprocessamento manual.`, {
      traceId: job.traceId,
      phone: job.senderPhone
    });
    return true;
  }

  public getQueueStats() {
    return {
      pending: this.pendingQueue.length,
      processing: this.processingQueue.size,
      activeLocks: Array.from(this.senderActiveLocks),
      deadLetterCount: this.deadLetterQueue.length,
      dedupCacheSize: this.deduplicationStore.size
    };
  }

  public getDeadLetters(): DeadLetterItem[] {
    return this.deadLetterQueue;
  }

  public clearDeadLetters() {
    this.deadLetterQueue = [];
    logger.log('INFO', 'queue', 'Dead Letter Queue (DLQ) limpa pelo administrador.');
  }

  private cleanupDeduplication() {
    const now = Date.now();
    for (const [key, value] of this.deduplicationStore.entries()) {
      if (now - value.timestamp > this.DEDUP_TTL_MS) {
        this.deduplicationStore.delete(key);
      }
    }
  }
}

export const messageQueue = new ResilientMessageQueue();
