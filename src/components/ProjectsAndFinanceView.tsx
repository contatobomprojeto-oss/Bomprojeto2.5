import React, { useState, useMemo } from 'react';
import { 
  Project, 
  ActiveView 
} from '../types';
import { 
  FolderKanban, 
  Receipt, 
  Plus, 
  Search, 
  ExternalLink, 
  MessageSquare, 
  ChevronRight, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Edit3, 
  FileText,
  Download,
  LayoutList,
  LayoutGrid,
  RotateCcw,
  Lock,
  Handshake,
  ShieldAlert,
  Hammer,
  X,
  Trash2,
  Archive,
  Eye,
  EyeOff,
  Kanban as KanbanIcon,
  CalendarRange,
  CreditCard,
  Send,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  QrCode
} from 'lucide-react';
import { useFinancialPrivacy } from '../hooks/useFinancialPrivacy';
import { FinancialPrivacyToggle } from './FinancialPrivacyToggle';
import { ProjectSummaryPdfModal } from './ProjectSummaryPdfModal';
import { DateRangeFilterBar } from './DateRangeFilterBar';
import { 
  DateRangeFilter, 
  DEFAULT_DATE_FILTER, 
  isProjectInDateRange, 
  formatDateRangeLabel 
} from '../utils/dateFilter';
import { TeamRole, canAccessFinancials, canDeleteProject } from '../types';
import { ProjectCard } from './ProjectCard';
import { DeleteProjectConfirmationModal } from './DeleteProjectConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';

interface ProjectsAndFinanceViewProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onSelectView: (view: ActiveView) => void;
  onOpenNewProject: () => void;
  onQuickAiAlert: (project: Project) => void;
  onChargePixWhatsapp: (project: Project, installment: any) => void;
  onOpenBudgetModal?: (project: Project) => void;
  onOpenReceiptModal?: (project: Project) => void;
  currentRole?: TeamRole;
  onAdvanceStage?: (projectId: string) => void;
  onRegressStage?: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => Promise<boolean | void> | void;
  onRestoreProject?: (projectId: string) => Promise<boolean | void> | void;
}

const formatCurrencyBRL = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const ProjectsAndFinanceView: React.FC<ProjectsAndFinanceViewProps> = ({
  projects,
  onSelectProject,
  onSelectView,
  onOpenNewProject,
  onQuickAiAlert,
  onChargePixWhatsapp,
  onOpenBudgetModal,
  onOpenReceiptModal,
  currentRole = 'ceo',
  onAdvanceStage,
  onRegressStage,
  onDeleteProject,
  onRestoreProject
}) => {
  // Tabs em formato de pill estilo Fleetly: Lista / Kanban / Timeline / Cobranças
  const [activeTabMode, setActiveTabMode] = useState<'lista' | 'kanban' | 'timeline' | 'cobrancas'>('lista');
  const [filterTab, setFilterTab] = useState<'all' | 'in_production' | 'pending_payment' | 'completed' | 'deleted'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [pdfProject, setPdfProject] = useState<Project | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>(DEFAULT_DATE_FILTER);

  const hasFinancialAccess = canAccessFinancials(currentRole);
  const { hideFinancials, blurClass } = useFinancialPrivacy();

  // 1. Filtrar projetos por Intervalo de Data (Memoized)
  const dateFilteredProjects = useMemo(() => {
    return projects.filter(p => isProjectInDateRange(p, dateFilter));
  }, [projects, dateFilter]);

  // Separação estrita: projetos ativos vs projetos na Aba de Exclusão (Lixeira)
  const activeProjects = useMemo(() => {
    return dateFilteredProjects.filter(p => !p.isDeleted && p.status !== 'excluido');
  }, [dateFilteredProjects]);

  const deletedProjects = useMemo(() => {
    return dateFilteredProjects.filter(p => p.isDeleted || p.status === 'excluido');
  }, [dateFilteredProjects]);

  // Cálculos financeiros e de contagem
  const { totalApproved, totalPaid, totalPending, inProductionCount, completedCount, deletedCount } = useMemo(() => {
    const approved = activeProjects.reduce((acc, p) => acc + p.totalValue, 0);
    const paid = activeProjects.reduce((acc, p) => {
      return acc + p.installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
    }, 0);
    const pending = approved - paid;
    const inProd = activeProjects.filter(p => p.status === 'em_andamento').length;
    const comp = activeProjects.filter(p => p.status === 'concluido').length;
    return {
      totalApproved: approved,
      totalPaid: paid,
      totalPending: pending,
      inProductionCount: inProd,
      completedCount: comp,
      deletedCount: deletedProjects.length
    };
  }, [activeProjects, deletedProjects]);

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (filterTab === 'deleted') {
      return deletedProjects.filter((proj) => {
        if (!term) return true;
        return (
          proj.clientName.toLowerCase().includes(term) ||
          proj.code.toLowerCase().includes(term) ||
          proj.title.toLowerCase().includes(term)
        );
      });
    }

    return activeProjects.filter((proj) => {
      if (term) {
        const matchSearch = 
          proj.clientName.toLowerCase().includes(term) ||
          proj.code.toLowerCase().includes(term) ||
          proj.title.toLowerCase().includes(term);
        if (!matchSearch) return false;
      }

      if (filterTab === 'in_production') return proj.status === 'em_andamento';
      if (filterTab === 'pending_payment') {
        return proj.installments.some(i => i.status === 'pending');
      }
      if (filterTab === 'completed') return proj.status === 'concluido';
      return true;
    });
  }, [activeProjects, deletedProjects, searchTerm, filterTab]);

  // Colunas do Pipeline Kanban (5 fases essenciais de projeto)
  const kanbanColumns = useMemo(() => {
    return [
      { id: 'Medição / Briefing', label: '1. Medição & Briefing', color: 'border-blue-200 bg-blue-50/30' },
      { id: 'Projeto 3D / Aprovação', label: '2. Projeto 3D / Aprovação', color: 'border-purple-200 bg-purple-50/30' },
      { id: 'Corte / Fabricação', label: '3. Fabricação & Bancada', color: 'border-amber-200 bg-amber-50/30' },
      { id: 'Montagem / Acabamento', label: '4. Entrega & Montagem', color: 'border-emerald-200 bg-emerald-50/30' },
      { id: 'Concluído', label: '5. Concluído & Entregue', color: 'border-slate-200 bg-slate-50/30' }
    ];
  }, []);

  // Todas as parcelas/faturas para a aba Cobranças & Financeiro
  const allInvoices = useMemo(() => {
    const list: Array<{
      project: Project;
      installmentNumber: number;
      label: string;
      dueDate: string;
      amount: number;
      status: 'paid' | 'pending' | 'overdue';
      paymentLink?: string;
    }> = [];

    activeProjects.forEach(proj => {
      proj.installments.forEach(inst => {
        // Se a data de vencimento passou e não está paga, marca como atrasada
        const isPastDue = inst.status === 'pending' && new Date(inst.dueDate.split('/').reverse().join('-')) < new Date();
        const effectiveStatus = inst.status === 'paid' ? 'paid' : isPastDue ? 'overdue' : 'pending';

        list.push({
          project: proj,
          installmentNumber: inst.number,
          label: inst.label || `Parcela ${inst.number}`,
          dueDate: inst.dueDate,
          amount: inst.amount,
          status: effectiveStatus,
          paymentLink: inst.pixQrCode || inst.pixQrCodeBase64 || proj.pixKey
        });
      });
    });

    return list;
  }, [activeProjects]);

  const handleResetDateFilter = () => {
    setDateFilter(DEFAULT_DATE_FILTER);
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      
      {/* View Header (Estilo Fleetly) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Gestão de Projetos &amp; Financeiro
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            Pipeline de produção, entregas e fluxo de cobranças em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {hasFinancialAccess && (
            <FinancialPrivacyToggle
              id="btn-toggle-financial-privacy"
              size="md"
            />
          )}

          <button
            id="btn-new-os-finance"
            onClick={onOpenNewProject}
            className="fleetly-btn-primary h-10 px-4 text-xs font-semibold cursor-pointer shadow-xs"
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
        filteredItemsCount={dateFilteredProjects.length}
        labelPlural="projetos"
      />

      {/* Summary KPI Cards (Estilo Fleetly) */}
      {hasFinancialAccess ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Contratado */}
          <div className="fleetly-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                Total Contratado
              </span>
              <div className="w-9 h-9 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className={`text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight tabular-nums ${blurClass}`}>
                {formatCurrencyBRL(totalApproved)}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9] text-[#64748B]">
              <span>{activeProjects.length} projetos ativos</span>
              <span className="font-medium text-[#0F172A]">Volume Total</span>
            </div>
          </div>

          {/* Card 2: Recebido via Pix */}
          <div className="fleetly-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                Recebido via Pix
              </span>
              <div className="w-9 h-9 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className={`text-xl sm:text-2xl font-bold text-[#15803D] tracking-tight tabular-nums ${blurClass}`}>
                {formatCurrencyBRL(totalPaid)}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9]">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                Liquidado
              </span>
              <span className="text-[11px] text-[#64748B]">Baixa automática</span>
            </div>
          </div>

          {/* Card 3: Saldo a Receber */}
          <div className="fleetly-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                Saldo a Receber
              </span>
              <div className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className={`text-xl sm:text-2xl font-bold text-[#B45309] tracking-tight tabular-nums ${blurClass}`}>
                {formatCurrencyBRL(totalPending)}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9]">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                Em aberto
              </span>
              <span className="text-[11px] text-[#64748B]">Vinculado a etapas</span>
            </div>
          </div>

          {/* Card 4: Em Produção / Pipeline */}
          <div className="fleetly-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                No Pipeline
              </span>
              <div className="w-9 h-9 rounded-full bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight tabular-nums">
                {inProductionCount} Ativos
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9] text-[#64748B]">
              <span>{completedCount} concluídos</span>
              <span className="font-semibold text-[#15803D]">98% no prazo</span>
            </div>
          </div>

        </div>
      ) : (
        <div className="fleetly-card p-5 flex items-center justify-between bg-amber-50/50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">Visão Operacional (Membro / Parceiro)</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Você pode gerenciar as etapas do pipeline e criar ordens de serviço. Os dados financeiros são restritos aos gestores.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            {inProductionCount} Ativos
          </span>
        </div>
      )}

      {/* =========================================================
          BARRA DE CONTROLE: TABS EM FORMATO DE PILL (ESTILO FLEETLY)
          [Lista] [Kanban] [Timeline] [Cobranças & Financeiro]
      ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        
        {/* Alternância limpa de visualização (Tabs em formato de pill) */}
        <div className="fleetly-tabs-container self-start">
          <button
            id="tab-view-lista"
            type="button"
            onClick={() => setActiveTabMode('lista')}
            className={`fleetly-tab-btn flex items-center gap-1.5 ${
              activeTabMode === 'lista' ? 'fleetly-tab-btn-active' : 'fleetly-tab-btn-inactive'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Lista</span>
          </button>

          <button
            id="tab-view-kanban"
            type="button"
            onClick={() => setActiveTabMode('kanban')}
            className={`fleetly-tab-btn flex items-center gap-1.5 ${
              activeTabMode === 'kanban' ? 'fleetly-tab-btn-active' : 'fleetly-tab-btn-inactive'
            }`}
          >
            <KanbanIcon className="w-3.5 h-3.5" />
            <span>Kanban</span>
          </button>

          <button
            id="tab-view-timeline"
            type="button"
            onClick={() => setActiveTabMode('timeline')}
            className={`fleetly-tab-btn flex items-center gap-1.5 ${
              activeTabMode === 'timeline' ? 'fleetly-tab-btn-active' : 'fleetly-tab-btn-inactive'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>

          {hasFinancialAccess && (
            <button
              id="tab-view-cobrancas"
              type="button"
              onClick={() => setActiveTabMode('cobrancas')}
              className={`fleetly-tab-btn flex items-center gap-1.5 ${
                activeTabMode === 'cobrancas' ? 'fleetly-tab-btn-active' : 'fleetly-tab-btn-inactive'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cobranças &amp; Financeiro</span>
            </button>
          )}
        </div>

        {/* Busca Rápida de Projetos */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Buscar por cliente, OS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-7 py-2 rounded-xl border border-[#EAECEF] bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-all shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

      </div>

      {/* =========================================================
          MODO 1: VISUALIZAÇÃO EM LISTA (TABELA FLEETLY)
      ========================================================= */}
      {activeTabMode === 'lista' && (
        <div className="fleetly-card overflow-hidden">
          
          {/* Sub-filtros por status */}
          <div className="p-4 border-b border-[#EAECEF] flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === 'all'
                    ? 'bg-[#111827] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                Todos ({activeProjects.length})
              </button>

              <button
                onClick={() => setFilterTab('in_production')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === 'in_production'
                    ? 'bg-[#111827] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                Em andamento ({inProductionCount})
              </button>

              {hasFinancialAccess && (
                <button
                  onClick={() => setFilterTab('pending_payment')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    filterTab === 'pending_payment'
                      ? 'bg-[#111827] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                  }`}
                >
                  Parcelas em aberto
                </button>
              )}

              <button
                onClick={() => setFilterTab('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === 'completed'
                    ? 'bg-[#111827] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                Concluídos ({completedCount})
              </button>

              {canDeleteProject(currentRole) && (
                <button
                  onClick={() => setFilterTab('deleted')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    filterTab === 'deleted'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Lixeira ({deletedCount})</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EAECEF] text-[#94A3B8] font-semibold text-[11px] uppercase tracking-wider bg-[#F8F9FA]/50">
                  <th className="py-3 px-5">Projeto</th>
                  <th className="py-3 px-5">Cliente</th>
                  <th className="py-3 px-5">Status / Etapa</th>
                  <th className="py-3 px-5">Prazo</th>
                  <th className="py-3 px-5">{hasFinancialAccess ? 'Financeiro' : 'Acesso'}</th>
                  <th className="py-3 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECEF]">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="text-sm font-semibold text-[#0F172A]">Nenhum projeto encontrado</p>
                        <p className="text-xs text-[#94A3B8]">Ajuste os filtros para visualizar os projetos.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => {
                    const isDeleted = project.isDeleted || project.status === 'excluido';
                    const isCompleted = project.status === 'concluido';
                    const paidAmount = project.installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);

                    const initials = project.clientName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map(n => n[0])
                      .join('')
                      .toUpperCase() || 'CL';

                    return (
                      <tr 
                        key={project.id} 
                        className="hover:bg-[#F8F9FA]/80 transition-colors group cursor-pointer"
                        onClick={() => onSelectProject(project.id)}
                      >
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-[#0F172A] group-hover:text-black">
                            {project.title}
                          </div>
                          <div className="text-[11px] font-mono text-[#94A3B8] mt-0.5">
                            {project.code} · {project.category}
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#F1F5F9] text-[#0F172A] border border-[#EAECEF] flex items-center justify-center font-bold text-[10px] shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-[#0F172A] truncate">
                                {project.clientName}
                              </div>
                              <div className="text-[11px] text-[#94A3B8] truncate">
                                {project.clientPhone}
                              </div>
                            </div>
                          </div>
                        </td>

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
                          ) : (
                            <span className="badge-in-progress">
                              <Hammer className="w-3 h-3" />
                              {project.currentStage}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-xs text-[#475569] tabular-nums whitespace-nowrap">
                          {project.deliveryDate}
                        </td>

                        <td className="py-3.5 px-5 text-xs whitespace-nowrap">
                          {hasFinancialAccess ? (
                            <div className={blurClass}>
                              <div className="font-semibold text-[#0F172A] tabular-nums">
                                {formatCurrencyBRL(project.totalValue)}
                              </div>
                              <div className="text-[11px] text-[#15803D] font-medium tabular-nums">
                                {formatCurrencyBRL(paidAmount)} pago
                              </div>
                            </div>
                          ) : (
                            <span className="badge-neutral text-[10px]">Restrito</span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                onSelectProject(project.id);
                                onSelectView('project_detail');
                              }}
                              className="fleetly-btn-primary py-1 px-3 text-[11px] font-semibold cursor-pointer"
                            >
                              Ver OS
                            </button>

                            <button
                              onClick={() => onQuickAiAlert(project)}
                              title="Boletim IA WhatsApp"
                              className="p-1.5 rounded-lg border border-[#EAECEF] bg-white hover:bg-[#F8F9FA] text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                onSelectProject(project.id);
                                onSelectView('client_portal');
                              }}
                              title="Portal do Cliente"
                              className="p-1.5 rounded-lg border border-[#EAECEF] bg-white hover:bg-[#F8F9FA] text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setPdfProject(project)}
                              title="Resumo formal em PDF"
                              className="p-1.5 rounded-lg border border-[#EAECEF] bg-white hover:bg-[#F8F9FA] text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {canDeleteProject(currentRole) && (
                              isDeleted ? (
                                onRestoreProject && (
                                  <button
                                    type="button"
                                    onClick={() => onRestoreProject(project.id)}
                                    title="Restaurar este projeto"
                                    className="p-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )
                              ) : (
                                onDeleteProject && (
                                  <button
                                    type="button"
                                    onClick={() => setProjectToDelete(project)}
                                    title="Excluir projeto"
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
      )}

      {/* =========================================================
          MODO 2: PIPELINE KANBAN (CARDS MINIMALISTAS ESTILO FLEETLY)
          Título claro, cliente associado, indicador de prazo, avatares empilhados
      ========================================================= */}
      {activeTabMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const columnProjects = activeProjects.filter(p => {
              if (col.id === 'Concluído') return p.status === 'concluido';
              return p.currentStage?.toLowerCase().includes(col.id.toLowerCase().split('/')[0].trim());
            });

            return (
              <div 
                key={col.id}
                className="bg-[#F8F9FA] rounded-2xl p-3 border border-[#EAECEF] flex flex-col space-y-3 min-w-[240px]"
              >
                {/* Header da Coluna */}
                <div className="flex items-center justify-between px-1 py-0.5">
                  <h3 className="text-xs font-bold text-[#0F172A] truncate">
                    {col.label}
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#EAECEF] text-[#475569]">
                    {columnProjects.length}
                  </span>
                </div>

                {/* Lista de Cards Minimalistas de Kanban */}
                <div className="space-y-3 flex-1">
                  {columnProjects.length === 0 ? (
                    <div className="h-28 rounded-xl border border-dashed border-[#CBD5E1] flex items-center justify-center text-center p-3">
                      <span className="text-[11px] text-[#94A3B8]">Nenhum projeto nesta fase</span>
                    </div>
                  ) : (
                    columnProjects.map((p) => {
                      const initials = p.clientName
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(n => n[0])
                        .join('')
                        .toUpperCase() || 'CL';

                      return (
                        <div
                          key={p.id}
                          className="fleetly-card p-3.5 space-y-2.5 transition-all hover:border-[#CBD5E1] cursor-pointer group shadow-2xs hover:shadow-xs"
                          onClick={() => onSelectProject(p.id)}
                        >
                          {/* Top: Código + Indicador de Prazo */}
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-[#94A3B8] font-semibold">
                              {p.code}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-semibold text-[10px]">
                              <Clock className="w-2.5 h-2.5" />
                              {p.deliveryDate}
                            </span>
                          </div>

                          {/* Título Claro */}
                          <h4 className="text-xs font-bold text-[#0F172A] group-hover:text-black leading-snug">
                            {p.title}
                          </h4>

                          {/* Cliente Associado & Categoria */}
                          <p className="text-[11px] text-[#64748B]">
                            Cliente: <strong>{p.clientName}</strong>
                          </p>

                          {/* Barra de Progresso Fina */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[10px] text-[#94A3B8]">
                              <span>Progresso</span>
                              <span className="font-semibold text-[#0F172A]">{p.progressPercent}%</span>
                            </div>
                            <div className="w-full h-1 bg-[#EAECEF] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#111827] rounded-full"
                                style={{ width: `${p.progressPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Bottom: Avatares Empilhados + Ações de Avanço */}
                          <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9]">
                            {/* Avatares Empilhados */}
                            <div className="flex items-center -space-x-1.5 overflow-hidden">
                              <div 
                                className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#0F172A] text-white flex items-center justify-center text-[9px] font-bold"
                                title={`Cliente: ${p.clientName}`}
                              >
                                {initials}
                              </div>
                              <div 
                                className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold"
                                title="Equipe Técnica"
                              >
                                EQ
                              </div>
                            </div>

                            {/* Controles de Estágio Rápidos */}
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {onRegressStage && (
                                <button
                                  type="button"
                                  onClick={() => onRegressStage(p.id)}
                                  title="Voltar etapa anterior"
                                  className="p-1 rounded-md text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onAdvanceStage && (
                                <button
                                  type="button"
                                  onClick={() => onAdvanceStage(p.id)}
                                  title="Avançar para próxima etapa"
                                  className="p-1 rounded-md text-[#0F172A] hover:bg-slate-100 font-semibold transition-colors"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
          MODO 3: TIMELINE / CRONOGRAMA CRONOLÓGICO
      ========================================================= */}
      {activeTabMode === 'timeline' && (
        <div className="fleetly-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAECEF]">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Linha do Tempo de Entregas &amp; Marcos
              </h3>
              <p className="text-xs text-[#64748B]">
                Acompanhe o cronograma planejado de cada ordem de serviço ativa.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#0F172A] bg-[#F1F5F9] px-2.5 py-1 rounded-lg">
              {activeProjects.length} cronogramas
            </span>
          </div>

          <div className="space-y-4">
            {activeProjects.map((p, idx) => (
              <div 
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className="p-4 rounded-xl border border-[#EAECEF] hover:border-[#CBD5E1] transition-all bg-white cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A] group-hover:text-black">
                      {p.title} · <span className="font-mono text-[#94A3B8]">{p.code}</span>
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Cliente: <strong>{p.clientName}</strong> · Fase: <span className="font-semibold text-[#0F172A]">{p.currentStage}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]">
                      <Calendar className="w-3 h-3" />
                      Prazo: {p.deliveryDate}
                    </span>
                    <span className="text-xs font-bold text-[#0F172A] tabular-nums">
                      {p.progressPercent}%
                    </span>
                  </div>
                </div>

                {/* Barra Cronológica de Fases */}
                <div className="relative pt-2">
                  <div className="w-full h-2 rounded-full bg-[#EAECEF] overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        p.status === 'concluido' ? 'bg-[#15803D]' : 'bg-[#111827]'
                      }`}
                      style={{ width: `${p.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1.5 font-medium">
                    <span>Briefing &amp; 3D</span>
                    <span>Corte &amp; Fabricação</span>
                    <span>Montagem Final</span>
                    <span>Entrega Técnica</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          MODO 4: COBRANÇAS & FINANCEIRO (ESTILO FLEETLY)
          Tabela com formatação monetária destacada, links rápidos para Pix/fatura e status direto
      ========================================================= */}
      {activeTabMode === 'cobrancas' && hasFinancialAccess && (
        <div className="fleetly-card overflow-hidden space-y-0">
          
          <div className="p-4 sm:p-5 border-b border-[#EAECEF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Gestão de Cobranças &amp; Faturas Pix
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Status direto de cada parcela, links rápidos de pagamento e disparo WhatsApp.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D]">
                {allInvoices.filter(i => i.status === 'paid').length} Pagas
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#B45309]">
                {allInvoices.filter(i => i.status === 'pending').length} Aguardando
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EAECEF] text-[#94A3B8] font-semibold text-[11px] uppercase tracking-wider bg-[#F8F9FA]/50">
                  <th className="py-3 px-5">Parcela / Fatura</th>
                  <th className="py-3 px-5">Projeto &amp; Cliente</th>
                  <th className="py-3 px-5">Vencimento</th>
                  <th className="py-3 px-5">Valor</th>
                  <th className="py-3 px-5">Status Direto</th>
                  <th className="py-3 px-5 text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECEF]">
                {allInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-[#94A3B8]">
                      Nenhuma fatura encontrada.
                    </td>
                  </tr>
                ) : (
                  allInvoices.map((inv, idx) => (
                    <tr key={`${inv.project.id}-${inv.installmentNumber}-${idx}`} className="hover:bg-[#F8F9FA]/80 transition-colors">
                      
                      {/* Parcela / Fatura */}
                      <td className="py-3.5 px-5 font-semibold text-[#0F172A]">
                        {inv.label}
                      </td>

                      {/* Projeto & Cliente */}
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-[#0F172A]">
                          {inv.project.clientName}
                        </div>
                        <div className="text-[11px] text-[#94A3B8]">
                          OS {inv.project.code} · {inv.project.title}
                        </div>
                      </td>

                      {/* Vencimento */}
                      <td className="py-3.5 px-5 text-[#475569] tabular-nums font-medium">
                        {inv.dueDate}
                      </td>

                      {/* Valor Formatado com Destaque */}
                      <td className="py-3.5 px-5">
                        <span className={`font-bold text-sm text-[#0F172A] tabular-nums ${blurClass}`}>
                          {formatCurrencyBRL(inv.amount)}
                        </span>
                      </td>

                      {/* Status Direto em Chips Suaves Fleetly */}
                      <td className="py-3.5 px-5">
                        {inv.status === 'paid' ? (
                          <span className="badge-paid">
                            <CheckCircle2 className="w-3 h-3" />
                            Pago
                          </span>
                        ) : inv.status === 'overdue' ? (
                          <span className="badge-critical">
                            <AlertCircle className="w-3 h-3" />
                            Em atraso
                          </span>
                        ) : (
                          <span className="badge-pending">
                            <Clock className="w-3 h-3" />
                            Aguardando
                          </span>
                        )}
                      </td>

                      {/* Ações Rápidas: Cobrar no WhatsApp / Link de Pagamento */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status !== 'paid' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const matchingInst = inv.project.installments.find(i => i.number === inv.installmentNumber);
                                if (matchingInst) {
                                  onChargePixWhatsapp(inv.project, matchingInst);
                                }
                              }}
                              className="fleetly-btn-primary py-1 px-3 text-[11px] font-semibold cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              <span>Cobrar no WhatsApp</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectProject(inv.project.id);
                                onSelectView('client_portal');
                              }}
                              className="fleetly-btn-secondary py-1 px-3 text-[11px] font-semibold cursor-pointer"
                            >
                              <span>Ver Recibo</span>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

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
