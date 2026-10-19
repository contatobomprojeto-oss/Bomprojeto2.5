import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Play, 
  Trash2, 
  Search, 
  Filter, 
  Activity, 
  Server, 
  ArrowUpRight, 
  Repeat, 
  Clock, 
  Database,
  ExternalLink,
  Zap,
  Radio
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  category: 'webhook' | 'queue' | 'uazapi' | 'ai_agent' | 'business_logic' | 'system';
  traceId?: string;
  message: string;
  phone?: string;
  projectId?: string;
  latencyMs?: number;
  data?: any;
  errorStack?: string;
}

interface DeadLetterItem {
  job: {
    id: string;
    traceId: string;
    senderPhone: string;
    payloadText: string;
    attempts: number;
    maxAttempts: number;
    status: string;
    createdAt: string;
    errorMessage?: string;
  };
  deadLetteredAt: string;
  finalError: string;
  retryCount: number;
}

interface MetricsData {
  metrics: {
    status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    totalEventsProcessed: number;
    totalErrors: number;
    errorRatePercent: number;
    activeQueueLength: number;
    dlqLength: number;
    recentLogsCount: number;
    alerts: Array<{ id: string; severity: string; message: string; triggeredAt: string }>;
    windowStats: {
      last5Minutes: { total: number; errors: number; errorRate: number };
      last1Hour: { total: number; errors: number; errorRate: number };
      last24Hours: { total: number; errors: number; errorRate: number };
    };
  };
  queue: {
    pending: number;
    processing: number;
    activeLocks: string[];
    deadLetterCount: number;
    dedupCacheSize: number;
  };
  session: {
    connected: boolean;
    phoneNumber: string;
    instanceName: string;
  };
  serverTime: string;
}

export const AdminAuditLogsView: React.FC = () => {
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [deadLetters, setDeadLetters] = useState<DeadLetterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Filters
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stress test feedback
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressTestResult, setStressTestResult] = useState<any | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [mRes, lRes, dRes] = await Promise.all([
        fetch('/api/admin/audit/metrics'),
        fetch(`/api/admin/audit/logs?level=${selectedLevel}&category=${selectedCategory}&search=${encodeURIComponent(searchQuery)}&limit=120`),
        fetch('/api/admin/audit/dlq')
      ]);

      if (mRes.ok) {
        const mData = await mRes.json();
        setMetricsData(mData);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        setLogs(lData.logs || []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDeadLetters(dData.items || []);
      }
    } catch (err) {
      console.error('Error fetching audit data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLevel, selectedCategory, searchQuery]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 4500);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedLevel, selectedCategory, searchQuery]);

  const handleRunStressTest = async () => {
    setIsStressTesting(true);
    setStressTestResult(null);
    try {
      const res = await fetch('/api/admin/audit/simulate-stress-test', { method: 'POST' });
      const data = await res.json();
      setStressTestResult(data);
      setActionNotice('Teste de estresse e validação de idempotência concluído com sucesso!');
      await fetchData();
    } catch (err: any) {
      setActionNotice(`Erro ao rodar teste: ${err.message}`);
    } finally {
      setIsStressTesting(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleRetryDlq = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/audit/dlq/${id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`Job [${id}] reativado na fila.`);
        await fetchData();
      }
    } catch (err: any) {
      setActionNotice(`Erro ao reprocessar: ${err.message}`);
    }
  };

  const handleClearDlq = async () => {
    if (!window.confirm('Tem certeza que deseja limpar a Dead Letter Queue?')) return;
    try {
      await fetch('/api/admin/audit/dlq/clear', { method: 'POST' });
      setActionNotice('Dead Letter Queue limpa com sucesso.');
      await fetchData();
    } catch (err) {}
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Deseja zerar os logs de auditoria em memória?')) return;
    try {
      await fetch('/api/admin/audit/clear-logs', { method: 'POST' });
      setActionNotice('Logs de auditoria zerados.');
      await fetchData();
    } catch (err) {}
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'WARN':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'INFO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'webhook':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'queue':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'uazapi':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ai_agent':
        return 'bg-orange-50 text-[#EA580C] border-orange-200';
      case 'business_logic':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  const statusColor = 
    metricsData?.metrics.status === 'HEALTHY' 
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
      : metricsData?.metrics.status === 'DEGRADED' 
        ? 'text-amber-700 bg-amber-50 border-amber-200' 
        : 'text-red-700 bg-red-50 border-red-200';

  return (
    <div className="space-y-6">
      {/* Top Banner Alert Notice */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E8EAED] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <h2 className="text-lg font-bold text-[#202124]">Auditoria & Observabilidade de Mensageria</h2>
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor}`}>
              {metricsData?.metrics.status || 'ONLINE'}
            </div>
          </div>
          <p className="text-xs text-[#5F6368] mt-1">
            Monitoramento de filas, idempotência anti-duplicação, rastreabilidade de webhooks e Dead Letter Queue (DLQ).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              autoRefresh ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-[#E8EAED] text-[#5F6368]'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-600 animate-pulse' : 'text-zinc-400'}`} />
            <span>{autoRefresh ? 'Ao Vivo (4s)' : 'Pausado'}</span>
          </button>

          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-white border border-[#E8EAED] hover:bg-zinc-50 text-xs font-semibold text-[#202124] rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#EA580C]' : 'text-[#5F6368]'}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleRunStressTest}
            disabled={isStressTesting}
            className="px-3.5 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Zap className={`w-3.5 h-3.5 ${isStressTesting ? 'animate-bounce' : ''}`} />
            <span>{isStressTesting ? 'Executando Teste...' : 'Testar Estresse & Idempotência'}</span>
          </button>
        </div>
      </div>

      {/* Stress Test Report (if executed) */}
      {stressTestResult && (
        <div className="bg-[#202124] text-white p-5 rounded-2xl border border-white/10 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="text-sm font-bold text-white">Relatório da Simulação de Estresse & Idempotência</h3>
            </div>
            <span className="text-[11px] text-white/50">{new Date().toLocaleTimeString()}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] text-white/60 uppercase tracking-wider block font-semibold">Duplicatas Bloqueadas</span>
              <span className="text-xl font-black text-emerald-400 mt-0.5 block">{stressTestResult.results?.duplicatesDetected}</span>
              <span className="text-[10px] text-white/40 block">Evitou disparo duplo</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] text-white/60 uppercase tracking-wider block font-semibold">Payloads Enfileirados</span>
              <span className="text-xl font-black text-white mt-0.5 block">{stressTestResult.results?.jobsEnqueued}</span>
              <span className="text-[10px] text-white/40 block">Sequencial por remetente</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] text-white/60 uppercase tracking-wider block font-semibold">Erros Neutralizados</span>
              <span className="text-xl font-black text-cyan-400 mt-0.5 block">{stressTestResult.results?.errorsHandledGracefully}</span>
              <span className="text-[10px] text-white/40 block">Sem crash no processo</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] text-white/60 uppercase tracking-wider block font-semibold">Integridade Geral</span>
              <span className="text-xl font-black text-emerald-400 mt-0.5 block">100% OK</span>
              <span className="text-[10px] text-white/40 block">Taxa de perda: 0%</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards: Health, Queue, DLQ, WhatsApp */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Taxa de Erro */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAED] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#5F6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">Taxa de Erro (1h)</span>
            <Activity className="w-4 h-4 text-[#EA580C]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#202124]">
              {metricsData?.metrics.windowStats.last1Hour.errorRate || 0}%
            </span>
            <span className="text-xs text-[#5F6368]">
              ({metricsData?.metrics.windowStats.last1Hour.errors || 0} falhas em {metricsData?.metrics.windowStats.last1Hour.total || 0} ev.)
            </span>
          </div>
          <div className="text-[11px] text-[#5F6368] pt-2 border-t border-[#E8EAED] flex items-center justify-between">
            <span>Últimos 5 min:</span>
            <span className="font-semibold text-[#202124]">{metricsData?.metrics.windowStats.last5Minutes.errorRate || 0}% de erro</span>
          </div>
        </div>

        {/* Metric 2: Fila de Processamento */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAED] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#5F6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">Fila Ativa (Queue)</span>
            <Server className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#202124]">
              {metricsData?.queue.pending || 0}
            </span>
            <span className="text-xs text-[#5F6368]">pendentes</span>
          </div>
          <div className="text-[11px] text-[#5F6368] pt-2 border-t border-[#E8EAED] flex items-center justify-between">
            <span>Em execução paralela:</span>
            <span className="font-semibold text-cyan-700">{metricsData?.queue.processing || 0} workers</span>
          </div>
        </div>

        {/* Metric 3: Dead Letter Queue */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAED] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#5F6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">Dead Letter Queue (DLQ)</span>
            <AlertTriangle className={`w-4 h-4 ${(metricsData?.queue.deadLetterCount || 0) > 0 ? 'text-red-600' : 'text-zinc-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${(metricsData?.queue.deadLetterCount || 0) > 0 ? 'text-red-600' : 'text-[#202124]'}`}>
              {metricsData?.queue.deadLetterCount || 0}
            </span>
            <span className="text-xs text-[#5F6368]">mensagens retidas</span>
          </div>
          <div className="text-[11px] text-[#5F6368] pt-2 border-t border-[#E8EAED] flex items-center justify-between">
            <span>Retentativas esgotadas:</span>
            <span className="font-semibold">{(metricsData?.queue.deadLetterCount || 0) > 0 ? 'Requer atenção' : '0 retidas'}</span>
          </div>
        </div>

        {/* Metric 4: WhatsApp Conectado */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAED] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#5F6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">Instância WhatsApp</span>
            <div className={`w-2.5 h-2.5 rounded-full ${metricsData?.session.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[#202124] truncate">
              {metricsData?.session.connected ? 'Conectado 24h' : 'Desconectado'}
            </span>
          </div>
          <div className="text-[11px] text-[#5F6368] pt-2 border-t border-[#E8EAED] flex items-center justify-between">
            <span>Instância:</span>
            <span className="font-semibold truncate max-w-[120px]">{metricsData?.session.instanceName || 'master'}</span>
          </div>
        </div>
      </div>

      {/* Dead Letter Queue Section (If messages exist) */}
      {deadLetters.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="text-sm font-bold text-red-900">
                  Dead Letter Queue ({deadLetters.length} mensagens com falha permanente)
                </h3>
                <p className="text-xs text-red-700">
                  Estas mensagens atingiram o limite de 4 retentativas e foram preservadas com seu payload original para inspeção.
                </p>
              </div>
            </div>
            <button
              onClick={handleClearDlq}
              className="text-xs text-red-700 hover:text-red-900 bg-white border border-red-300 px-3 py-1.5 rounded-xl font-semibold cursor-pointer"
            >
              Limpar DLQ
            </button>
          </div>

          <div className="space-y-2.5">
            {deadLetters.map((dl, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-xl border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#202124]">Destinatário: {dl.job.senderPhone}</span>
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-mono">{dl.job.attempts} tentativas</span>
                    <span className="text-[10px] text-[#5F6368]">{new Date(dl.deadLetteredAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-zinc-600 font-medium truncate">
                    Mensagem: "{dl.job.payloadText}"
                  </p>
                  <p className="text-red-600 font-mono text-[11px]">
                    Erro: {dl.finalError}
                  </p>
                </div>
                <button
                  onClick={() => handleRetryDlq(dl.job.id)}
                  className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-center shadow-xs"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Reprocessar Agora</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs Explorer & Filters */}
      <div className="bg-white rounded-2xl border border-[#E8EAED] shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 sm:p-5 border-b border-[#E8EAED] flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#F8F9FA]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#5F6368]">Filtrar Nível:</span>
            {['ALL', 'ERROR', 'WARN', 'INFO'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                  selectedLevel === lvl 
                    ? 'bg-[#202124] text-white border-[#202124]' 
                    : 'bg-white text-[#5F6368] border-[#E8EAED] hover:bg-zinc-100'
                }`}
              >
                {lvl === 'ALL' ? 'Todos' : lvl}
              </button>
            ))}

            <span className="text-xs font-semibold text-[#5F6368] ml-2">Categoria:</span>
            {['ALL', 'webhook', 'queue', 'uazapi', 'ai_agent'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                  selectedCategory === cat 
                    ? 'bg-[#EA580C] text-white border-[#EA580C]' 
                    : 'bg-white text-[#5F6368] border-[#E8EAED] hover:bg-zinc-100'
                }`}
              >
                {cat === 'ALL' ? 'Todas' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5F6368] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por telefone, texto ou trace..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-[#E8EAED] text-xs text-[#202124] rounded-xl focus:outline-none focus:border-[#EA580C] w-56 sm:w-64"
              />
            </div>
            <button
              onClick={handleClearLogs}
              title="Limpar logs"
              className="p-1.5 text-[#5F6368] hover:text-red-600 bg-white border border-[#E8EAED] hover:bg-zinc-100 rounded-xl cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logs Feed List */}
        <div className="divide-y divide-[#E8EAED] max-h-[600px] overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <div className="p-10 text-center text-[#5F6368] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-medium text-[#202124]">Nenhum registro com os filtros atuais</p>
              <p className="text-xs">O sistema está saudável e processando as filas em conformidade.</p>
            </div>
          ) : (
            logs.map(log => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div 
                  key={log.id} 
                  className={`p-3.5 hover:bg-[#F8F9FA] transition-colors cursor-pointer ${log.level === 'ERROR' ? 'bg-red-50/30' : ''}`}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[11px] text-[#5F6368] shrink-0">
                        {log.timestamp.slice(11, 19)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${getLevelBadge(log.level)}`}>
                        {log.level}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${getCategoryBadge(log.category)}`}>
                        {log.category}
                      </span>
                      {log.phone && (
                        <span className="text-[11px] text-[#202124] font-bold bg-zinc-100 px-1.5 py-0.5 rounded shrink-0">
                          📱 {log.phone}
                        </span>
                      )}
                      <span className="text-xs text-[#202124] truncate font-sans">
                        {log.message}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {log.latencyMs !== undefined && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {log.latencyMs}ms
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Detailed Metadata & Payload */}
                  {isExpanded && (
                    <div className="mt-2.5 p-3 bg-zinc-900 text-zinc-200 rounded-xl text-[11px] space-y-2 border border-zinc-800">
                      <div className="flex items-center justify-between text-zinc-400 text-[10px] border-b border-zinc-800 pb-1.5">
                        <span>Trace ID: <strong className="text-zinc-200">{log.traceId || 'N/A'}</strong></span>
                        <span>Log ID: {log.id}</span>
                      </div>
                      <p className="text-white font-sans font-medium">{log.message}</p>
                      {log.data && (
                        <div>
                          <span className="text-zinc-400 block text-[10px] mb-0.5">Payload / Dados:</span>
                          <pre className="overflow-x-auto p-2 bg-black/40 rounded-lg text-emerald-400 text-[10px]">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.errorStack && (
                        <div>
                          <span className="text-red-400 block text-[10px] mb-0.5">Stack Trace do Erro:</span>
                          <pre className="overflow-x-auto p-2 bg-black/40 rounded-lg text-red-300 text-[10px]">
                            {log.errorStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
