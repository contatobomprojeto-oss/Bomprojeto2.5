import React, { useEffect } from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  Users, 
  Settings, 
  ChevronsUpDown, 
  ShieldCheck, 
  Building2, 
  FolderKanban, 
  Layers,
  Zap,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Crown,
  Handshake,
  UserCheck,
  Sparkles,
  Plus,
  Activity
} from 'lucide-react';
import { 
  ActiveView, 
  UserProfile, 
  Workspace, 
  SubscriptionPlan, 
  isSaasOwner,
  TeamRole,
  canManageAiNotifications,
  canManageTeam,
  canManageCompanySettings,
  TEAM_ROLE_CONFIGS
} from '../types';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  currentView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  currentUser: UserProfile | null;
  selectedProjectCode?: string;
  onOpenNewProject: () => void;
  onOpenLoginModal: () => void;
  activeSidebarItem?: string;
  onSelectSidebarItem?: (item: string) => void;
  currentWorkspace?: Workspace;
  workspaces?: Workspace[];
  plan?: SubscriptionPlan;
  activeProjectsCount?: number;
  onOpenSubscriptionModal?: () => void;
  onOpenWorkspaceModal?: () => void;
  onOpenWhatsAppModal?: () => void;
  whatsappConnected?: boolean;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  currentRole?: TeamRole;
  onOpenTeamSettings?: () => void;
  teamMembersCount?: number;
  onOpenSectorOnboarding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  currentUser,
  selectedProjectCode = '#2026-084',
  onOpenNewProject,
  onOpenLoginModal,
  activeSidebarItem = 'projetos',
  onSelectSidebarItem,
  currentWorkspace,
  workspaces = [],
  plan = 'start',
  activeProjectsCount,
  onOpenSubscriptionModal,
  onOpenWorkspaceModal,
  onOpenWhatsAppModal,
  whatsappConnected = false,
  isMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  currentRole = 'ceo',
  onOpenTeamSettings,
  teamMembersCount = 1,
  onOpenSectorOnboarding
}) => {
  const currentItem = activeSidebarItem || (
    currentView === 'admin_dashboard' ? 'admin' :
    currentView === 'dashboard' ? 'painel' : 
    currentView === 'projects_finance' ? 'projetos_finance' : 
    currentView === 'ai_settings' ? 'ia' : 
    currentView === 'retencao_pro' ? 'retencao_pro' :
    'projetos_finance'
  );
  const maxWorkspaces = plan === 'escala' ? 6 : plan === 'start' ? 3 : 1;
  const isFounder = isSaasOwner(currentUser);

  // Keyboard shortcut: Alt+M to toggle sidebar collapse
  useEffect(() => {
    if (isMobile || !onToggleCollapse) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        onToggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, onToggleCollapse]);

  const handleItemClick = (item: string) => {
    if (onSelectSidebarItem) onSelectSidebarItem(item);
    if (item === 'admin') {
      if (isFounder) {
        onSelectView('admin_dashboard');
      } else {
        onSelectView('dashboard');
      }
    } else if (item === 'painel') {
      onSelectView('dashboard');
    } else if (item === 'projetos_finance') {
      onSelectView('projects_finance');
    } else if (item === 'ia') {
      onSelectView('ai_settings');
    } else if (item === 'retencao_pro') {
      onSelectView('retencao_pro');
    } else if (item === 'clientes') {
      // triggers modal in App.tsx
    } else if (item === 'config') {
      // triggers modal in App.tsx
    } else if (item === 'nichos' || item === 'setores_ia') {
      if (onOpenSectorOnboarding) {
        onOpenSectorOnboarding();
      }
    }
  };

  // Nav item helper when expanded (Fleetly SaaS Style)
  const navItemClassExpanded = (isActive: boolean) => `
    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all text-left cursor-pointer relative font-medium group
    ${isActive 
      ? 'bg-[#0F172A] text-white font-semibold shadow-xs' 
      : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
    }
  `;

  // Nav item helper when collapsed (Fleetly SaaS Style)
  const navItemClassCollapsed = (isActive: boolean) => `
    w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all cursor-pointer relative group
    ${isActive 
      ? 'bg-[#0F172A] text-white shadow-xs' 
      : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
    }
  `;

  const isNavActive = (itemKey: string) => {
    if (itemKey === 'painel') return currentItem === 'painel' && currentView === 'dashboard';
    if (itemKey === 'projetos_finance') return currentItem === 'projetos_finance' || currentView === 'projects_finance' || currentView === 'project_detail';
    if (itemKey === 'clientes') return currentItem === 'clientes';
    if (itemKey === 'ia') return currentItem === 'ia' || currentView === 'ai_settings';
    if (itemKey === 'retencao_pro') return currentItem === 'retencao_pro' || currentView === 'retencao_pro';
    if (itemKey === 'config') return currentItem === 'config';
    if (itemKey === 'nichos') return currentItem === 'nichos';
    if (itemKey === 'admin') return currentItem === 'admin' || currentView === 'admin_dashboard';
    return false;
  };

  const effectiveCollapsed = isMobile ? false : isCollapsed;

  return (
    <aside 
      className={`
        bg-white border-r border-[#E8EAED] flex flex-col justify-between h-full md:h-screen sticky top-0 shrink-0 select-none z-20
        transition-all duration-300 ease-in-out
        ${isMobile 
          ? 'w-full flex' 
          : effectiveCollapsed 
            ? 'w-[72px] hidden md:flex' 
            : 'w-56 lg:w-64 hidden md:flex'
        }
      `}
    >
      
      {/* Top Header & Main Navigation */}
      <div className={`flex flex-col flex-1 ${effectiveCollapsed ? 'p-2 overflow-visible' : 'p-3.5 space-y-4 overflow-y-auto'}`}>
        
        {/* Brand Header */}
        {effectiveCollapsed ? (
          <div className="flex flex-col items-center pt-1 pb-2 border-b border-[#E8EAED]">
            <button 
              type="button"
              onClick={() => onSelectView('landing')} 
              className="p-1.5 rounded-lg hover:bg-[#F8F9FA] transition-transform hover:scale-105 cursor-pointer relative group"
              title="BOMProjeto - Ir para início"
            >
              <BrandLogo variant="mark" size="sm" />
              {/* Tooltip */}
              <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#202124] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                BOMProjeto
              </div>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div 
                onClick={() => onSelectView('landing')} 
                className="flex items-center cursor-pointer hover:opacity-85 transition-opacity"
                title="Ir para página inicial"
              >
                <BrandLogo variant="full" size="sm" theme="light" showSubtitle={false} />
              </div>
            </div>
            {isMobile && onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] transition-colors cursor-pointer"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Workspace Switcher Trigger */}
        {effectiveCollapsed ? (
          <div className="my-2 flex justify-center">
            <button
              type="button"
              onClick={onOpenWorkspaceModal}
              className="w-10 h-10 rounded-xl bg-[#F8F9FA] hover:bg-[#F1F3F4] border border-[#E8EAED] text-[#5F6368] hover:text-[#202124] flex items-center justify-center transition-colors cursor-pointer relative group"
              aria-label="Alternar workspace"
            >
              <Building2 className="w-4 h-4 text-[#5F6368]" />
              {/* Tooltip */}
              <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#202124] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap flex flex-col gap-0.5">
                <span className="font-semibold text-white">
                  {currentWorkspace?.name || currentUser?.workshopName || 'Gestão de Projetos'}
                </span>
                <span className="text-[10px] text-white/70">
                  {currentWorkspace?.segmentLabel || 'Workspace'} • Clique para alternar
                </span>
              </div>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenWorkspaceModal}
            className="w-full bg-[#F8F9FA] hover:bg-[#F1F3F4] transition-colors rounded-xl p-2.5 border border-[#E8EAED] flex items-center justify-between cursor-pointer text-left shadow-2xs"
            title="Clique para gerenciar workspaces e filiais"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#E8EAED] text-[#5F6368] flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#202124] truncate leading-tight">
                  {currentWorkspace?.name || currentUser?.workshopName || 'Gestão de Projetos'}
                </p>
                <p className="text-[11px] text-[#80868B] truncate leading-tight mt-0.5 font-medium">
                  {currentWorkspace?.segmentLabel || 'Projetos'}
                </p>
              </div>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-[#80868B] shrink-0 ml-1" />
          </button>
        )}

        {/* Quick Action: Novo Projeto (Fleetly Style #111827) */}
        {effectiveCollapsed ? (
          <div className="my-1.5 flex justify-center">
            <button
              type="button"
              id="sidebar-btn-new-project-collapsed"
              onClick={onOpenNewProject}
              className="w-10 h-10 rounded-xl bg-[#111827] hover:bg-black text-white flex items-center justify-center transition-all shadow-xs cursor-pointer relative group"
              aria-label="Novo Projeto"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                Novo Projeto
              </div>
            </button>
          </div>
        ) : (
          <div className="pt-1">
            <button
              type="button"
              id="sidebar-btn-new-project-expanded"
              onClick={onOpenNewProject}
              className="w-full bg-[#111827] hover:bg-black text-white transition-all rounded-xl py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs hover:shadow-md cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Novo Projeto</span>
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <div className={effectiveCollapsed ? 'space-y-1 mt-1' : 'space-y-4'}>
          
          {/* SECTION: INÍCIO */}
          <div>
            {!effectiveCollapsed && (
              <p className="font-subtitle font-montserrat px-3 text-[10px] font-bold text-[#80868B] uppercase tracking-wider mb-1.5">
                Início
              </p>
            )}
            <nav className={effectiveCollapsed ? 'space-y-1 flex flex-col items-center' : 'space-y-0.5'}>
              {effectiveCollapsed ? (
                <button
                  id="sidebar-nav-painel"
                  onClick={() => handleItemClick('painel')}
                  className={navItemClassCollapsed(isNavActive('painel'))}
                  aria-label="Dashboard"
                >
                  <LayoutDashboard className={`w-[19px] h-[19px] ${isNavActive('painel') ? 'text-white' : 'text-[#64748B]'}`} />
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    Dashboard
                  </div>
                </button>
              ) : (
                <button
                  id="sidebar-nav-painel"
                  onClick={() => handleItemClick('painel')}
                  className={navItemClassExpanded(isNavActive('painel'))}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className={`w-[18px] h-[18px] ${isNavActive('painel') ? 'text-white' : 'text-[#64748B]'}`} />
                    <span>Dashboard</span>
                  </div>
                </button>
              )}
            </nav>
          </div>

          {effectiveCollapsed && <div className="w-8 h-px bg-[#E8EAED] mx-auto my-2"></div>}

          {/* SECTION: GESTÃO */}
          <div>
            {!effectiveCollapsed && (
              <p className="font-subtitle font-montserrat px-3 text-[10px] font-bold text-[#80868B] uppercase tracking-wider mb-1.5">
                Gestão
              </p>
            )}
            <nav className={effectiveCollapsed ? 'space-y-1 flex flex-col items-center' : 'space-y-0.5'}>
              
              {/* Projetos */}
              {effectiveCollapsed ? (
                <button
                  id="sidebar-nav-projetos-finance"
                  onClick={() => handleItemClick('projetos_finance')}
                  className={navItemClassCollapsed(isNavActive('projetos_finance'))}
                  aria-label="Projetos"
                >
                  <FolderKanban className={`w-[19px] h-[19px] ${isNavActive('projetos_finance') ? 'text-white' : 'text-[#64748B]'}`} />
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    Projetos & Financeiro
                  </div>
                </button>
              ) : (
                <button
                  id="sidebar-nav-projetos-finance"
                  onClick={() => handleItemClick('projetos_finance')}
                  className={navItemClassExpanded(isNavActive('projetos_finance'))}
                >
                  <div className="flex items-center gap-2.5">
                    <FolderKanban className={`w-[18px] h-[18px] ${isNavActive('projetos_finance') ? 'text-white' : 'text-[#64748B]'}`} />
                    <span>Projetos</span>
                  </div>
                </button>
              )}

              {/* Clientes */}
              {effectiveCollapsed ? (
                <button
                  id="sidebar-nav-clientes"
                  onClick={() => handleItemClick('clientes')}
                  className={navItemClassCollapsed(isNavActive('clientes'))}
                  aria-label="Clientes"
                >
                  <Users className={`w-[19px] h-[19px] ${isNavActive('clientes') ? 'text-white' : 'text-[#64748B]'}`} />
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    Clientes & Contatos
                  </div>
                </button>
              ) : (
                <button
                  id="sidebar-nav-clientes"
                  onClick={() => handleItemClick('clientes')}
                  className={navItemClassExpanded(isNavActive('clientes'))}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className={`w-[18px] h-[18px] ${isNavActive('clientes') ? 'text-white' : 'text-[#64748B]'}`} />
                    <span>Clientes</span>
                  </div>
                </button>
              )}

              {/* Retenção Pro (Exatamente abaixo de Clientes) */}
              {effectiveCollapsed ? (
                <button
                  id="sidebar-nav-retencao-pro"
                  onClick={() => handleItemClick('retencao_pro')}
                  className={navItemClassCollapsed(isNavActive('retencao_pro'))}
                  aria-label="Retenção Pro"
                >
                  <Activity className={`w-[19px] h-[19px] ${isNavActive('retencao_pro') ? 'text-white' : 'text-[#64748B]'}`} />
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap flex items-center gap-1.5">
                    <span>Retenção Pro</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#0F172A] text-white font-bold">PRO</span>
                  </div>
                </button>
              ) : (
                <button
                  id="sidebar-nav-retencao-pro"
                  onClick={() => handleItemClick('retencao_pro')}
                  className={navItemClassExpanded(isNavActive('retencao_pro'))}
                >
                  <div className="flex items-center gap-2.5">
                    <Activity className={`w-[18px] h-[18px] ${isNavActive('retencao_pro') ? 'text-white' : 'text-[#64748B]'}`} />
                    <span>Retenção Pro</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                    isNavActive('retencao_pro')
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  }`}>
                    PRO
                  </span>
                </button>
              )}

              {/* Workspaces & Filiais */}
              {effectiveCollapsed ? (
                <button
                  id="sidebar-nav-workspaces"
                  onClick={onOpenWorkspaceModal}
                  className={navItemClassCollapsed(false)}
                  aria-label="Workspaces"
                >
                  <Layers className="w-[19px] h-[19px] text-[#5F6368]" />
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#202124] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap flex items-center gap-1.5">
                    <span>Workspaces</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-semibold">
                      {workspaces.length}/{maxWorkspaces}
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  id="sidebar-nav-workspaces"
                  onClick={onOpenWorkspaceModal}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-[18px] h-[18px] text-[#5F6368]" />
                    <span>Workspaces</span>
                  </div>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F1F3F4] text-[#5F6368]">
                    {workspaces.length}/{maxWorkspaces}
                  </span>
                </button>
              )}
            </nav>
          </div>

          {effectiveCollapsed && <div className="w-8 h-px bg-[#E8EAED] mx-auto my-2"></div>}

          {/* SECTION: COMUNICAÇÃO */}
          <div>
            {!effectiveCollapsed && (
              <p className="font-subtitle font-montserrat px-3 text-[10px] font-bold text-[#80868B] uppercase tracking-wider mb-1.5">
                Comunicação
              </p>
            )}
            <nav className={effectiveCollapsed ? 'space-y-1 flex flex-col items-center' : 'space-y-0.5'}>
              {/* IA de Atendimento / Notificações */}
              {effectiveCollapsed ? (
                <button
                  id="sidebar-nav-ia"
                  onClick={() => handleItemClick('ia')}
                  className={navItemClassCollapsed(isNavActive('ia'))}
                  aria-label="Notificações & IA"
                >
                  <Bot className={`w-[19px] h-[19px] ${isNavActive('ia') ? 'text-white' : 'text-[#64748B]'}`} />
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    Notificações & IA WhatsApp
                  </div>
                </button>
              ) : (
                <button
                  id="sidebar-nav-ia"
                  onClick={() => handleItemClick('ia')}
                  className={navItemClassExpanded(isNavActive('ia'))}
                >
                  <div className="flex items-center gap-2.5">
                    <Bot className={`w-[18px] h-[18px] ${isNavActive('ia') ? 'text-white' : 'text-[#64748B]'}`} />
                    <span>Notificações & IA</span>
                  </div>
                </button>
              )}
            </nav>
          </div>

          {effectiveCollapsed && <div className="w-8 h-px bg-[#E2E8F0] mx-auto my-2"></div>}

          {/* SECTION: CONFIGURAÇÕES */}
          <div>
            {!effectiveCollapsed && (
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2 px-3">
                Configurações
              </p>
            )}
            <nav className={effectiveCollapsed ? 'space-y-1 flex flex-col items-center' : 'space-y-0.5'}>
              {/* Configurações */}
              {effectiveCollapsed ? (
                <button
                  id="sidebar-nav-config"
                  onClick={() => handleItemClick('config')}
                  className={navItemClassCollapsed(isNavActive('config'))}
                  aria-label="Configurações"
                >
                  <Settings className={`w-[19px] h-[19px] ${isNavActive('config') ? 'text-white' : 'text-[#64748B]'}`} />
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    Configurações do Sistema
                  </div>
                </button>
              ) : (
                <button
                  id="sidebar-nav-config"
                  onClick={() => handleItemClick('config')}
                  className={navItemClassExpanded(isNavActive('config'))}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className={`w-[18px] h-[18px] ${isNavActive('config') ? 'text-white' : 'text-[#64748B]'}`} />
                    <span>Configurações</span>
                  </div>
                </button>
              )}

              {/* Modo Time & Equipe */}
              {effectiveCollapsed ? (
                <button
                  id="sidebar-nav-team"
                  onClick={() => onOpenTeamSettings ? onOpenTeamSettings() : handleItemClick('team')}
                  className={navItemClassCollapsed(currentItem === 'team')}
                  aria-label="Modo Time"
                >
                  <Users className={`w-[19px] h-[19px] ${currentItem === 'team' ? 'text-white' : 'text-[#64748B]'}`} />
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap flex items-center gap-1.5">
                    <span>Modo Time (Equipe)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-white font-semibold">
                      {teamMembersCount}
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  id="sidebar-nav-team"
                  onClick={() => onOpenTeamSettings ? onOpenTeamSettings() : handleItemClick('team')}
                  className={navItemClassExpanded(currentItem === 'team')}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className={`w-[18px] h-[18px] ${currentItem === 'team' ? 'text-white' : 'text-[#64748B]'}`} />
                    <span>Modo Time</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    currentItem === 'team' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {teamMembersCount}
                  </span>
                </button>
              )}

              {/* Área de Admin (Exclusivo henrique.ferrazms@gmail.com / Administrador) */}
              {isFounder && (
                effectiveCollapsed ? (
                  <button
                    id="sidebar-nav-admin"
                    onClick={() => handleItemClick('admin')}
                    className={navItemClassCollapsed(isNavActive('admin'))}
                    aria-label="Área de Admin"
                  >
                    <ShieldCheck className={`w-[19px] h-[19px] ${isNavActive('admin') ? 'text-white' : 'text-[#64748B]'}`} />
                    <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap flex items-center gap-1.5">
                      <span>Área de Admin</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-600 text-white">
                        Admin
                      </span>
                    </div>
                  </button>
                ) : (
                  <button
                    id="sidebar-nav-admin"
                    onClick={() => handleItemClick('admin')}
                    className={navItemClassExpanded(isNavActive('admin'))}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className={`w-[18px] h-[18px] ${isNavActive('admin') ? 'text-white' : 'text-[#64748B]'}`} />
                      <span>Área de Admin</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                      isNavActive('admin') ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-900'
                    }`}>
                      Admin
                    </span>
                  </button>
                )
              )}
            </nav>
          </div>

        </div>

      </div>

      {/* Subscription Plan Card (Fleetly Minimal Style) */}
      {effectiveCollapsed ? (
        <div className="p-2 flex justify-center">
          <button
            type="button"
            onClick={onOpenSubscriptionModal}
            className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer relative group"
            aria-label="Plano de assinatura"
          >
            <Zap className="w-4 h-4 text-slate-900" />
            <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap flex flex-col gap-0.5">
              <span className="font-bold text-white">
                Plano {plan === 'escala' ? 'Scala' : plan === 'start' ? 'Start' : 'Grátis'}
              </span>
              <span className="text-[10px] text-slate-300">
                {activeProjectsCount !== undefined 
                  ? `${activeProjectsCount}/${plan === 'escala' ? '∞' : plan === 'start' ? '10' : '1'} projetos ativos`
                  : 'Gerenciar plano'}
              </span>
            </div>
          </button>
        </div>
      ) : (
        <div className="mx-3 my-2 p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-900" />
              <span>Plano {plan === 'escala' ? 'Scala' : plan === 'start' ? 'Start' : 'Grátis'}</span>
            </span>
            {onOpenSubscriptionModal && (
              <button 
                type="button"
                onClick={onOpenSubscriptionModal}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
              >
                Mudar
              </button>
            )}
          </div>
          {activeProjectsCount !== undefined && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Projetos ativos:</span>
                <span className="font-semibold text-slate-900 font-mono tabular-nums">
                  {activeProjectsCount}/{plan === 'escala' ? '∞' : plan === 'start' ? '10' : '1'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div 
                  className="h-full bg-slate-900 rounded-full transition-all"
                  style={{
                    width: `${plan === 'escala' ? 25 : Math.min(100, (activeProjectsCount / (plan === 'start' ? 10 : 1)) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Footer & WhatsApp Status & User Mini Profile */}
      <div className={`border-t border-[#EAECEF] ${effectiveCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3 space-y-2'}`}>
        {effectiveCollapsed ? (
          <>
            <button
              type="button"
              onClick={onOpenWhatsAppModal}
              title={whatsappConnected ? "WhatsApp Conectado • Clique para gerenciar" : "WhatsApp Desconectado • Clique para parear"}
              className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer relative group"
            >
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-slate-700" />
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${whatsappConnected ? 'bg-emerald-500 ring-2 ring-white animate-pulse' : 'bg-amber-500'}`}></span>
              </div>
              <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                {whatsappConnected ? 'WhatsApp Ativo' : 'Conectar WhatsApp'}
              </div>
            </button>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer relative group"
                title="Expandir menu lateral"
                aria-label="Expandir menu lateral"
              >
                <PanelLeftOpen className="w-4 h-4" />
                <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  Expandir menu (Alt+M)
                </div>
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onOpenWhatsAppModal}
              title={whatsappConnected ? "WhatsApp Conectado • Clique para ver detalhes ou trocar número" : "WhatsApp Desconectado • Clique para parear via QR Code"}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition-colors cursor-pointer border border-slate-200/80"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${whatsappConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <span className="text-[12px] font-medium text-slate-800">
                  {whatsappConnected ? 'WhatsApp Ativo' : 'Conectar WhatsApp'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold hover:text-slate-900">
                {whatsappConnected ? 'Gerenciar' : 'Parear'}
              </span>
            </button>

            {currentUser && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 px-0.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden shadow-2xs">
                    {currentUser.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{currentUser.name ? currentUser.name.charAt(0) : 'U'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-indigo-600 font-semibold truncate leading-tight mt-0.5">
                      {currentUser.role === 'admin' ? 'Administrador • Acesso Total' : 'Gestor'}
                    </p>
                  </div>
                </div>

                {!isMobile && onToggleCollapse && (
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Recolher menu lateral (Alt+M)"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </aside>
  );
};

