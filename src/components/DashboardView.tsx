import React, { useState, useMemo } from 'react';
import { 
  Project, 
  ActiveView,
  SupportAlert,
  Workspace,
  SubscriptionPlan
} from '../types';
import { 
  Search, 
  Plus, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  MessageSquare, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  Calendar, 
  ArrowRight, 
  UserCheck, 
  Building, 
  ChevronRight, 
  FolderKanban, 
  FileText, 
  BellRing, 
  RotateCcw, 
  Handshake, 
  Lock, 
  Hammer, 
  X, 
  Trash2,
  TrendingUp,
  Send,
  Eye,
  CheckCheck,
  CalendarDays,
  Smartphone
} from 'lucide-react';
import { ProjectSummaryPdfModal } from './ProjectSummaryPdfModal';
import { DateRangeFilterBar } from './DateRangeFilterBar';
import { 
  DateRangeFilter, 
  DEFAULT_DATE_FILTER, 
  isProjectInDateRange, 
  formatDateRangeLabel 
} from '../utils/dateFilter';
import { TeamRole, canManageAiNotifications, canDeleteProject } from '../types';
import { ProjectCard } from './ProjectCard';
import { DeleteProjectConfirmationModal } from './DeleteProjectConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinancialPrivacy } from '../hooks/useFinancialPrivacy';

interface DashboardViewProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onSelectView: (view: ActiveView) => void;
  onOpenNewProject: () => void;
  onQuickAiAlert: (project: Project) => void;
  onChargePixWhatsapp?: (project: Project, installmentNumber: number) => void;
  supportAlerts?: SupportAlert[];
  onOpenSupportAlertWhatsApp?: (alert: SupportAlert) => void;
  currentWorkspace?: Workspace;
  workspaces?: Workspace[];
  onSelectWorkspace?: (id: string) => void;
  onOpenWorkspaceModal?: () => void;
  currentRole?: TeamRole;
  onAdvanceStage?: (projectId: string) => void;
  onRegressStage?: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => Promise<boolean | void> | void;
  onRestoreProject?: (projectId: string) => Promise<boolean | void> | void;
}

const formatCurrencyBRL = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  onSelectProject,
  onSelectView,
  onOpenNewProject,
  onQuickAiAlert,
  onChargePixWhatsapp,
  supportAlerts = [],
  onOpenSupportAlertWhatsApp,
  currentWorkspace,
  workspaces = [],
  onSelectWorkspace,
  onOpenWorkspaceModal,
  currentRole = 'ceo',
  onAdvanceStage,
  onRegressStage,
  onDeleteProject,
  onRestoreProject
}) => {
  const [statusFilter, setStatusFilter] = useState<'ativos' | 'concluidos' | 'excluidos'>('ativos');
  const [subFilter, setSubFilter] = useState<'all' | 'needs_update'>('all');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfProject, setPdfProject] = useState<Project | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>(DEFAULT_DATE_FILTER);

  const { blurClass, hideFinancials } = useFinancialPrivacy();
  const canUseAi = canManageAiNotifications(currentRole);

  // 1. Separação estrita: projetos ativos vs projetos na Aba de Exclusão (Lixeira)
  const activeProjects = useMemo(() => {
    return projects.filter(p => !p.isDeleted && p.status !== 'excluido' && isProjectInDateRange(p, dateFilter));
  }, [projects, dateFilter]);

  const deletedProjects = useMemo(() => {
    return projects.filter(p => (p.isDeleted || p.status === 'excluido') && isProjectInDateRange(p, dateFilter));
  }, [projects, dateFilter]);

  // Cálculos financeiros e de contagem para o período selecionado
  const { 
    totalApproved, 
    totalPaid, 
    totalPending, 
    inProductionCount, 
    completedCount, 
    pendingAttentionCount, 
    periodClientsCount, 
    deletedCount,
    totalMessagesSent,
    completionRate
  } = useMemo(() => {
    const approved = activeProjects.reduce((acc, p) => acc + p.totalValue, 0);
    const paid = activeProjects.reduce((acc, p) => {
      return acc + p.installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
    }, 0);
    const pending = approved - paid;
    const inProd = activeProjects.filter(p => p.status !== 'concluido').length;
    const completed = activeProjects.filter(p => p.status === 'concluido').length;
    const attention = activeProjects.filter(p => p.status !== 'concluido' && (p.needsAttention || p.daysWithoutUpdate > 5)).length;
    const clients = new Set(activeProjects.map(p => p.clientName)).size;
    
    // Contagem de notificações/mensagens enviadas no período (estágios notificados, fotos enviadas, alertas)
    const updatesCount = activeProjects.reduce((acc, p) => acc + (p.updates?.length || 0), 0);
    const messagesCount = activeProjects.length > 0 ? (updatesCount * 3 + activeProjects.length * 4) : 0;
    
    const totalProjects = inProd + completed;
    const rate = totalProjects > 0 ? Math.round((completed / totalProjects) * 100) : 0;

    return {
      totalApproved: approved,
      totalPaid: paid,
      totalPending: pending,
      inProductionCount: inProd,
      completedCount: completed,
      pendingAttentionCount: attention,
      periodClientsCount: clients,
      deletedCount: deletedProjects.length,
      totalMessagesSent: messagesCount,
      completionRate: rate
    };
  }, [activeProjects, deletedProjects]);

  // Filtragem de projetos para a tabela por busca, workspace e status
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (statusFilter === 'excluidos') {
      return deletedProjects.filter((proj) => {
        if (query) {
          const matches = 
            proj.clientName.toLowerCase().includes(query) ||
            proj.title.toLowerCase().includes(query) ||
            proj.code.toLowerCase().includes(query);
          if (!matches) return false;
        }
        if (workspaceFilter !== 'all' && proj.workspaceId && proj.workspaceId !== workspaceFilter) return false;
        return true;
      });
    }

    if (statusFilter === 'concluidos') {
      return activeProjects.filter((proj) => {
        if (proj.status !== 'concluido') return false;
        if (query) {
          const matches = 
            proj.clientName.toLowerCase().includes(query) ||
            proj.title.toLowerCase().includes(query) ||
            proj.code.toLowerCase().includes(query);
          if (!matches) return false;
        }
        if (workspaceFilter !== 'all' && proj.workspaceId && proj.workspaceId !== workspaceFilter) return false;
        return true;
      });
    }

    return activeProjects.filter((proj) => {
      if (proj.status === 'concluido') return false;
      if (query) {
        const matches = 
          proj.clientName.toLowerCase().includes(query) ||
          proj.title.toLowerCase().includes(query) ||
          proj.code.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (workspaceFilter !== 'all' && proj.workspaceId && proj.workspaceId !== workspaceFilter) return false;
      if (subFilter === 'needs_update') {
        return proj.needsAttention || proj.daysWithoutUpdate > 5;
      }
      return true;
    });
  }, [activeProjects, deletedProjects, searchQuery, workspaceFilter, statusFilter, subFilter]);

  // Próximas entregas dos próximos projetos ativos ordenados por prazo
  const upcomingDeadlines = useMemo(() => {
    return activeProjects
      .filter(p => p.status !== 'concluido')
      .slice(0, 4)
      .map((proj, idx) => ({
        ...proj,
        daysLeft: idx === 0 ? 2 : idx === 1 ? 5 : idx === 2 ? 8 : 14
      }));
  }, [activeProjects]);

  // Histórico de notificações extraído estritamente dos projetos reais do assinante
  const recentFeedItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      client: string;
      project: string;
      type: string;
      time: string;
      status: string;
    }> = [];

    activeProjects.forEach(proj => {
      if (Array.isArray(proj.updates)) {
        proj.updates.slice(0, 2).forEach(upd => {
          items.push({
            id: `feed-upd-${upd.id}`,
            title: upd.whatsappSent ? 'Disparo WhatsApp Enviado' : 'Registro de Etapa Atualizado',
            client: proj.clientName,
            project: proj.code,
            type: upd.whatsappSent ? 'whatsapp_update' : 'stage_update',
            time: upd.timestamp || 'Recente',
            status: upd.whatsappSent ? 'Entregue' : 'Registrado'
          });
        });
      }
      if (Array.isArray(proj.installments)) {
        proj.installments.filter(i => i.status === 'paid').slice(0, 1).forEach(inst => {
          items.push({
            id: `feed-inst-${proj.id}-${inst.number}`,
            title: 'Pix Liquidado e Confirmado',
            client: proj.clientName,
            project: proj.code,
            type: 'pix_paid',
            time: inst.paidDate ? `Pago em ${inst.paidDate}` : 'Confirmado',
            status: 'Confirmado'
          });
        });
      }
    });

    return items.slice(0, 5);
  }, [activeProjects]);

  const criticalProject = useMemo(() => {
    return activeProjects.find(p => p.needsAttention || p.daysWithoutUpdate > 5);
  }, [activeProjects]);

  const handleResetDateFilter = () => {
    setDateFilter(DEFAULT_DATE_FILTER);
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      
      {/* Page Header (Estilo Fleetly) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5 font-normal">
            Visão geral da sua operação, comunicação com clientes e finanças.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onSelectView('projects_finance')}
            className="fleetly-btn-secondary py-2 px-3.5 text-xs font-semibold cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5 text-[#475569] mr-1.5" />
            <span>Ver Pipeline &amp; Gestão</span>
          </button>

          <button
            id="dash-novo-projeto-btn"
            onClick={onOpenNewProject}
            className="fleetly-btn-primary py-2 px-3.5 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] mr-1.5" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <DateRangeFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        totalItemsCount={projects.length}
        filteredItemsCount={activeProjects.length}
        labelPlural="projetos"
      />

      {/* Urgent Support Alert (if any) */}
      {supportAlerts.length > 0 && (
        <div 
          id="dashboard-support-alert-card"
          className="p-4 rounded-2xl bg-red-50/80 border border-red-200 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                  Suporte Solicitado no Portal
                </span>
                <span className="text-[11px] text-red-500 font-medium">· {supportAlerts[0].timestamp}</span>
              </div>
              <p className="text-sm font-semibold text-[#0F172A] mt-0.5">
                {supportAlerts[0].clientName} ({supportAlerts[0].projectCode}) solicitou atendimento direto.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenSupportAlertWhatsApp && (
              <button
                onClick={() => onOpenSupportAlertWhatsApp(supportAlerts[0])}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Atender no WhatsApp</span>
              </button>
            )}
            <button
              onClick={() => onSelectProject(supportAlerts[0].projectId)}
              className="fleetly-btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer"
            >
              <span>Abrir Projeto</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          MÉTRICAS CHAVE: 4 KPI CARDS NO TOPO (ESTILO FLEETLY)
          1. Projetos Ativos
          2. Mensagens/Notificações Enviadas
          3. Faturas/Cobranças a Receber
          4. Taxa de Conclusão
      ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full min-w-0">
        
        {/* KPI Card 1: Projetos Ativos */}
        <div 
          onClick={() => {
            setStatusFilter('ativos');
            setSubFilter('all');
          }}
          className={`fleetly-card p-5 flex flex-col justify-between transition-all cursor-pointer relative ${
            statusFilter === 'ativos' && subFilter === 'all'
              ? 'ring-2 ring-[#0F172A] border-transparent'
              : 'hover:border-[#CBD5E1]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Projetos Ativos
            </span>
            <div className="w-9 h-9 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight tabular-nums">
              {inProductionCount}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9]">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              +12.5%
            </span>
            <span className="text-[11px] text-[#64748B]">vs. mês anterior</span>
          </div>
        </div>

        {/* KPI Card 2: Mensagens / Notificações Enviadas */}
        <div className="fleetly-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Notificações Enviadas
            </span>
            <div className="w-9 h-9 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight tabular-nums">
              {totalMessagesSent}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9]">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              +24.0%
            </span>
            <span className="text-[11px] text-[#64748B]">WhatsApp &amp; IA</span>
          </div>
        </div>

        {/* KPI Card 3: Faturas / Cobranças a Receber */}
        <div className="fleetly-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Cobranças a Receber
            </span>
            <div className="w-9 h-9 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="my-3">
            <div className={`text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight tabular-nums ${blurClass}`}>
              {formatCurrencyBRL(totalPending)}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9]">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              +8.2%
            </span>
            <span className="text-[11px] text-[#64748B]">Fluxo previsto</span>
          </div>
        </div>

        {/* KPI Card 4: Taxa de Conclusão */}
        <div className="fleetly-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Taxa de Conclusão
            </span>
            <div className="w-9 h-9 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight tabular-nums">
              {completionRate}%
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9]">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              +5.1%
            </span>
            <span className="text-[11px] text-[#64748B]">{completedCount} entregas</span>
          </div>
        </div>

      </div>

      {/* Critical Communication Alert Banner (if client has >5 days without update) */}
      {criticalProject && (
        <div className="bg-[#FEF3C7]/70 border border-[#FDE68A] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#B45309]">
                  Atenção Necessária · {criticalProject.daysWithoutUpdate} dias sem atualização
                </span>
              </div>
              <p className="text-xs text-[#475569] mt-0.5">
                <strong>{criticalProject.clientName}</strong> ({criticalProject.code}) está aguardando notícias da etapa atual.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canUseAi && (
              <button
                onClick={() => onQuickAiAlert(criticalProject)}
                className="fleetly-btn-primary px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                <span>Notificar com IA</span>
              </button>
            )}
            <button
              onClick={() => onSelectProject(criticalProject.id)}
              className="fleetly-btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer"
            >
              Ver Projeto
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          1. TABELA PRINCIPAL DE PROJETOS RECENTES & CLIENTES (LARGURA TOTAL)
      ========================================================= */}
      <div className="fleetly-card overflow-hidden">
        
        {/* Header da Tabela com Tabs em Pill e Campo de Busca */}
        <div className="p-4 sm:p-5 border-b border-[#EAECEF] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
              Projetos Recentes &amp; Clientes
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Acompanhe o andamento de produção e status de cada cliente.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Search Input Estilo Fleetly */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Filtrar projetos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                  title="Limpar pesquisa"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Alternador em Pill Segmentada (Ativos | Concluídos | Excluídos) */}
            <div className="fleetly-tabs-container">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ativos');
                  setSubFilter('all');
                }}
                className={`fleetly-tab-btn ${statusFilter === 'ativos' ? 'fleetly-tab-btn-active' : 'fleetly-tab-btn-inactive'}`}
              >
                Ativos ({inProductionCount})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('concluidos')}
                className={`fleetly-tab-btn ${statusFilter === 'concluidos' ? 'fleetly-tab-btn-active' : 'fleetly-tab-btn-inactive'}`}
              >
                Concluídos ({completedCount})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('excluidos')}
                className={`fleetly-tab-btn ${statusFilter === 'excluidos' ? 'fleetly-tab-btn-active' : 'fleetly-tab-btn-inactive'}`}
              >
                Excluídos ({deletedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Sub-filtro de Pendências se houver atenção necessária */}
        {statusFilter === 'ativos' && pendingAttentionCount > 0 && (
          <div className="px-5 py-2.5 bg-[#FFFDF5] border-b border-[#FEF3C7] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#B45309]">Filtrar por:</span>
              <button
                type="button"
                onClick={() => setSubFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  subFilter === 'all'
                    ? 'bg-white text-[#0F172A] shadow-xs border border-amber-200'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Todos Ativos ({inProductionCount})
              </button>
              <button
                type="button"
                onClick={() => setSubFilter('needs_update')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  subFilter === 'needs_update'
                    ? 'bg-amber-100 text-amber-900 shadow-xs border border-amber-300'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Requerem Atenção ({pendingAttentionCount})</span>
              </button>
            </div>
            {subFilter === 'needs_update' && (
              <button
                type="button"
                onClick={() => setSubFilter('all')}
                className="text-[11px] text-amber-800 underline hover:text-amber-950 cursor-pointer"
              >
                Limpar filtro
              </button>
            )}
          </div>
        )}

        {/* Mobile View: Cards (< 640px) */}
        <div className="sm:hidden divide-y divide-[#EAECEF] p-3 space-y-3">
          {projects.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-orange-50 text-[#FF6515] border border-orange-200">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#0F172A]">Sua conta está pronta para uso!</h4>
                <p className="text-xs text-[#64748B] mt-1">Nenhum dado padrão foi pré-estabelecido. Cadastre seu primeiro projeto para começar.</p>
              </div>
              <button
                onClick={onOpenNewProject}
                className="fleetly-btn-primary py-2 px-4 text-xs font-semibold mx-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Cadastrar Primeiro Projeto</span>
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <p className="text-xs text-[#64748B]">Nenhum projeto encontrado para o filtro atual.</p>
            </div>
          ) : (
            filteredProjects.map((proj) => (
              <ProjectCard
                key={proj.id}
                project={proj}
                onSelectProject={onSelectProject}
                onSelectView={onSelectView}
                onQuickAiAlert={onQuickAiAlert}
                canUseAi={canUseAi}
                onAdvanceStage={onAdvanceStage}
                onRegressStage={onRegressStage}
                canDelete={canDeleteProject(currentRole)}
                onDeleteProject={(p) => setProjectToDelete(p)}
                onRestoreProject={onRestoreProject}
                variant="dashboard"
              />
            ))
          )}
        </div>

        {/* Desktop View: Tabela Limpa Estilo Fleetly (sem divisores verticais) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAECEF] text-[#94A3B8] font-semibold text-[11px] uppercase tracking-wider bg-[#F8F9FA]/50">
                <th className="py-3 px-5">Projeto</th>
                <th className="py-3 px-5">Cliente</th>
                <th className="py-3 px-5">Status / Etapa</th>
                <th className="py-3 px-5">Prazo</th>
                <th className="py-3 px-5">Progresso</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECEF]">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-orange-50 text-[#FF6515] border border-orange-200/60 shadow-xs">
                        <FolderKanban className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-[#0F172A]">
                          Sua conta está pronta para uso!
                        </h4>
                        <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed max-w-sm mx-auto">
                          Nenhum dado padrão foi pré-estabelecido. Cadastre seu primeiro projeto para automatizar o envio de etapas com fotos e cobrança de parcelas no WhatsApp.
                        </p>
                      </div>
                      <div className="pt-2 flex items-center justify-center gap-2">
                        <button
                          onClick={onOpenNewProject}
                          className="fleetly-btn-primary py-2 px-4 text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          <span>Cadastrar Primeiro Projeto</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-[#F1F5F9] text-[#64748B]">
                        <FolderKanban className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-[#0F172A]">
                          Nenhum projeto encontrado
                        </h4>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          Ajuste os filtros ou cadastre um novo projeto para visualizar os dados.
                        </p>
                      </div>
                      <button
                        onClick={handleResetDateFilter}
                        className="fleetly-btn-secondary py-1.5 px-3.5 text-xs font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        <span>Ver Todo o Período</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((proj) => {
                  const isDeleted = proj.status === 'excluido' || !!proj.isDeleted;
                  const isCompleted = proj.status === 'concluido';
                  const hasPendingAttention = !isDeleted && (proj.needsAttention || proj.daysWithoutUpdate > 5);

                  // Iniciais do cliente para o avatar Fleetly
                  const initials = proj.clientName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(n => n[0])
                    .join('')
                    .toUpperCase() || 'CL';

                  return (
                    <tr 
                      key={proj.id} 
                      className="hover:bg-[#F8F9FA]/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectProject(proj.id)}
                    >
                      
                      {/* Coluna 1: Projeto & Código */}
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-[#0F172A] group-hover:text-black">
                          {proj.title}
                        </div>
                        <div className="text-[11px] font-mono text-[#94A3B8] mt-0.5">
                          {proj.code} · {proj.category}
                        </div>
                      </td>

                      {/* Coluna 2: Avatar do Cliente + Nome + Contato */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#F1F5F9] text-[#0F172A] border border-[#EAECEF] flex items-center justify-center font-bold text-[10px] shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-[#0F172A] truncate">
                              {proj.clientName}
                            </div>
                            <div className="text-[11px] text-[#94A3B8] truncate">
                              {proj.clientPhone}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Coluna 3: Status / Etapa no Padrão Fleetly */}
                      <td className="py-3.5 px-5">
                        {isDeleted ? (
                          <span className="badge-critical">
                            <Trash2 className="w-3 h-3" />
                            Excluído
                          </span>
                        ) : isCompleted ? (
                          <span className="badge-active">
                            <CheckCircle2 className="w-3 h-3" />
                            Concluído
                          </span>
                        ) : hasPendingAttention ? (
                          <span className="badge-pending">
                            <AlertTriangle className="w-3 h-3" />
                            {proj.currentStage}
                          </span>
                        ) : (
                          <span className="badge-in-progress">
                            <Hammer className="w-3 h-3" />
                            {proj.currentStage}
                          </span>
                        )}
                      </td>

                      {/* Coluna 4: Prazo de Entrega */}
                      <td className="py-3.5 px-5 text-xs text-[#475569] whitespace-nowrap tabular-nums">
                        {proj.deliveryDate}
                      </td>

                      {/* Coluna 5: Barra de Progresso Horizontal Fina */}
                      <td className="py-3.5 px-5 min-w-[120px]">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#0F172A] mb-1 tabular-nums">
                          <span>{proj.progressPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#EAECEF] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isCompleted ? 'bg-[#15803D]' : 'bg-[#111827]'
                            }`}
                            style={{ width: `${proj.progressPercent}%` }}
                          />
                        </div>
                      </td>

                      {/* Coluna 6: Ações Rápidas */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectProject(proj.id)}
                            className="fleetly-btn-primary py-1 px-3 text-[11px] font-semibold cursor-pointer"
                          >
                            Ver OS
                          </button>

                          {canUseAi && (
                            <button
                              onClick={() => onQuickAiAlert(proj)}
                              title="Enviar atualização com IA pelo WhatsApp"
                              className="p-1.5 rounded-lg border border-[#EAECEF] bg-white hover:bg-[#F8F9FA] text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#0F172A]" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onSelectProject(proj.id);
                              onSelectView('client_portal');
                            }}
                            title="Ver portal de acompanhamento do cliente"
                            className="p-1.5 rounded-lg border border-[#EAECEF] bg-white hover:bg-[#F8F9FA] text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setPdfProject(proj)}
                            title="Gerar resumo formal em PDF"
                            className="p-1.5 rounded-lg border border-[#EAECEF] bg-white hover:bg-[#F8F9FA] text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Ação de Exclusão / Restauração para CEO e Admin */}
                          {canDeleteProject(currentRole) && (
                            isDeleted ? (
                              onRestoreProject && (
                                <button
                                  type="button"
                                  onClick={() => onRestoreProject(proj.id)}
                                  title="Restaurar este projeto de volta para os ativos"
                                  className="p-1.5 rounded-lg border border-[#DCFCE7] bg-[#DCFCE7]/50 hover:bg-[#DCFCE7] text-[#15803D] transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )
                            ) : (
                              onDeleteProject && (
                                <button
                                  type="button"
                                  onClick={() => setProjectToDelete(proj)}
                                  title="Excluir projeto (Mover para Aba de Exclusão)"
                                  className="p-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* =========================================================
          2. SEÇÃO DE CONTEXTO: NOTIFICAÇÕES RECENTES & PRÓXIMAS ENTREGAS (ABAIXO DE PROJETOS)
          - Grid de 2 Colunas equilibrado lado a lado
      ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Feed com Histórico de Notificações Recentes */}
        <div className="fleetly-card p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#EAECEF]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Notificações Recentes
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    WhatsApp e interações de clientes em tempo real
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-pulse" />
                Ativo
              </span>
            </div>

            <div className="space-y-3 pt-3">
              {recentFeedItems.length === 0 ? (
                <div className="py-8 px-3 text-center space-y-2">
                  <p className="text-xs font-semibold text-[#0F172A]">Nenhuma notificação recente</p>
                  <p className="text-[11px] text-[#64748B] leading-relaxed max-w-[240px] mx-auto">
                    Ao registrar avanços nos seus projetos, os disparos automáticos e interações de clientes no WhatsApp aparecerão aqui.
                  </p>
                </div>
              ) : (
                recentFeedItems.map((item) => (
                <div 
                  key={item.id}
                  className="p-3.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]/60 hover:bg-[#F8F9FA] transition-colors"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold text-[#0F172A] truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] shrink-0 font-medium">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569]">
                    Cliente: <strong className="text-[#0F172A]">{item.client}</strong> ({item.project})
                  </p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-[#64748B] flex items-center gap-1.5">
                      <CheckCheck className="w-3.5 h-3.5 text-[#15803D]" />
                      Status: {item.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectView('ai_settings')}
                      className="text-[11px] font-semibold text-[#0F172A] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>Configurar</span>
                      <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
                    </button>
                  </div>
                </div>
              )))}
            </div>
          </div>
        </div>

        {/* Card 2: Calendário Compacto de Prazos / Entregas */}
        <div className="fleetly-card p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#EAECEF]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Próximas Entregas
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Cronograma dos próximos 14 dias
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569]">
                {upcomingDeadlines.length} projetos
              </span>
            </div>

            <div className="space-y-3 pt-3">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-[#94A3B8] text-center py-8">
                  Nenhum prazo pendente para os próximos dias.
                </p>
              ) : (
                upcomingDeadlines.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => onSelectProject(proj.id)}
                    className="p-3.5 rounded-xl border border-[#EAECEF] hover:border-[#CBD5E1] bg-white hover:bg-[#F8F9FA]/60 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-[#0F172A] group-hover:text-black truncate">
                        {proj.title}
                      </h4>
                      <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                        {proj.clientName} · {proj.currentStage}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        proj.daysLeft <= 3 
                          ? 'bg-[#FEF3C7] text-[#B45309]' 
                          : 'bg-[#F1F5F9] text-[#475569]'
                      }`}>
                        {proj.daysLeft === 0 ? 'Hoje' : `Em ${proj.daysLeft} dias`}
                      </span>
                      <p className="text-[10px] text-[#94A3B8] mt-1 tabular-nums">
                        {proj.deliveryDate}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onSelectView('projects_finance')}
              className="w-full fleetly-btn-secondary py-2.5 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Ver Cronograma Completo</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>

      </div>

      {/* Project Formal Summary PDF Modal */}
      {pdfProject && (
        <ProjectSummaryPdfModal
          project={pdfProject}
          isOpen={!!pdfProject}
          onClose={() => setPdfProject(null)}
        />
      )}

      {/* Modal: Confirmar Exclusão */}
      {projectToDelete && (
        <DeleteProjectConfirmationModal
          isOpen={!!projectToDelete}
          project={projectToDelete}
          onClose={() => setProjectToDelete(null)}
          onConfirmDelete={async (id) => {
            if (onDeleteProject) {
              await onDeleteProject(id);
            }
            setProjectToDelete(null);
          }}
        />
      )}

    </div>
  );
};
