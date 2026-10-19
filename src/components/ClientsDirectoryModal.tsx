import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Phone, 
  MessageSquare, 
  ExternalLink, 
  Calendar, 
  CheckCircle2, 
  Search,
  RotateCcw,
  DollarSign,
  FolderKanban,
  Building2
} from 'lucide-react';
import { Project } from '../types';
import { DateRangeFilterBar } from './DateRangeFilterBar';
import { 
  DateRangeFilter, 
  DEFAULT_DATE_FILTER, 
  isProjectInDateRange, 
  formatDateRangeLabel 
} from '../utils/dateFilter';
import { useFinancialPrivacy } from '../hooks/useFinancialPrivacy';
import { FinancialPrivacyToggle } from './FinancialPrivacyToggle';

interface ClientsDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onSelectView: (view: any) => void;
}

const formatCurrencyBRL = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const ClientsDirectoryModal: React.FC<ClientsDirectoryModalProps> = ({
  isOpen,
  onClose,
  projects,
  onSelectProject,
  onSelectView
}) => {
  const { hideFinancials, blurClass } = useFinancialPrivacy();
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>(DEFAULT_DATE_FILTER);
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1. Filtrar projetos pelo período de data
  const dateFilteredProjects = projects.filter(p => isProjectInDateRange(p, dateFilter));

  // 2. Extrair clientes únicos no período
  const clientMap = new Map<string, {
    name: string;
    phone: string;
    projectsCount: number;
    totalSpent: number;
    lastProject: Project;
    allProjectsCount: number;
  }>();

  const totalCountPerClient = new Map<string, number>();
  projects.forEach(p => {
    totalCountPerClient.set(p.clientName, (totalCountPerClient.get(p.clientName) || 0) + 1);
  });

  dateFilteredProjects.forEach((p) => {
    const existing = clientMap.get(p.clientName);
    if (existing) {
      existing.projectsCount += 1;
      existing.totalSpent += p.totalValue;
      existing.lastProject = p;
    } else {
      clientMap.set(p.clientName, {
        name: p.clientName,
        phone: p.clientPhone,
        projectsCount: 1,
        totalSpent: p.totalValue,
        lastProject: p,
        allProjectsCount: totalCountPerClient.get(p.clientName) || 1
      });
    }
  });

  const allClientsInPeriod = Array.from(clientMap.values());

  const filteredClients = allClientsInPeriod.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.lastProject.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lastProject.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPeriodRevenue = allClientsInPeriod.reduce((sum, c) => sum + c.totalSpent, 0);

  const handleResetDateFilter = () => {
    setDateFilter(DEFAULT_DATE_FILTER);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Floating Modal Card (Estilo Fleetly) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full shadow-2xl border border-[#EAECEF] max-h-[92vh] sm:max-h-[88vh] flex flex-col font-sans overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#EAECEF] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
                Diretório de Clientes
              </h2>
              <p className="text-[11px] sm:text-xs text-[#64748B] mt-0.5">
                {allClientsInPeriod.length} cliente(s) no período · Volume Total:{' '}
                <span className={`font-semibold text-[#0F172A] ${blurClass}`}>
                  {formatCurrencyBRL(totalPeriodRevenue)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FinancialPrivacyToggle size="xs" variant="default" />
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-[#F8F9FA] text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4">

        {/* Date Filter Bar */}
        <div className="shrink-0">
          <DateRangeFilterBar
            filter={dateFilter}
            onChange={setDateFilter}
            totalItemsCount={projects.length}
            filteredItemsCount={dateFilteredProjects.length}
            labelPlural="projetos"
            compact={true}
          />
        </div>

        {/* Search Bar Fleetly */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Buscar cliente por nome, telefone ou projeto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-all"
          />
        </div>

        {/* Client List (Scrollable) */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-[220px]">
          {filteredClients.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="max-w-xs mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] text-[#64748B] mx-auto flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-[#0F172A]">
                    Nenhum cliente encontrado
                  </h4>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {dateFilter.preset !== 'all' 
                      ? `Não foram localizados clientes para o período "${formatDateRangeLabel(dateFilter)}".`
                      : 'Nenhum cliente cadastrado no momento.'}
                  </p>
                </div>
                {dateFilter.preset !== 'all' && (
                  <button
                    onClick={handleResetDateFilter}
                    className="fleetly-btn-secondary py-1.5 px-3.5 text-xs font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    <span>Ver Todo o Período</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredClients.map((client) => {
              const initials = client.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(n => n[0])
                .join('')
                .toUpperCase() || 'CL';

              return (
                <div
                  key={client.name}
                  className="fleetly-card p-4 hover:border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#0F172A] border border-[#EAECEF] flex items-center justify-center font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#0F172A]">
                          {client.name}
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                          {client.projectsCount} {client.projectsCount === 1 ? 'projeto ativo' : 'projetos ativos'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] pt-1">
                      <span>{client.phone}</span>
                      <span>·</span>
                      <span>Último: <strong className="text-[#0F172A]">{client.lastProject.title}</strong></span>
                      <span>·</span>
                      <span className="font-semibold text-[#0F172A]">
                        Volume: <span className={blurClass}>{formatCurrencyBRL(client.totalSpent)}</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-[#94A3B8]">
                      OS {client.lastProject.code} · Contrato: <span className="font-medium text-[#475569]">{client.lastProject.contractDate || 'Data recente'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => {
                        onSelectProject(client.lastProject.id);
                        onSelectView('whatsapp_simulator');
                        onClose();
                      }}
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                      title="Abrir WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        onSelectProject(client.lastProject.id);
                        onSelectView('project_detail');
                        onClose();
                      }}
                      className="fleetly-btn-primary py-2 px-3 text-xs font-semibold cursor-pointer"
                    >
                      Ver OS {client.lastProject.code}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>

        {/* Sticky Modal Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-[#EAECEF] bg-[#F8F9FA] flex items-center justify-between shrink-0">
          <span className="text-xs text-[#94A3B8]">
            Exibindo {filteredClients.length} de {allClientsInPeriod.length} clientes
          </span>

          <button
            onClick={onClose}
            className="fleetly-btn-secondary py-2 px-4 text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
