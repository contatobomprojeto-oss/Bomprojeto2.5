import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Bell, 
  Building2, 
  ChevronRight, 
  User, 
  LogIn, 
  LogOut, 
  ChevronDown,
  Menu,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Layers,
  ShieldCheck,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  Crown,
  Handshake,
  Users,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { UserProfile, SupportAlert, Workspace, SubscriptionPlan, isSaasOwner, TeamRole, TEAM_ROLE_CONFIGS } from '../types';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useFinancialPrivacy } from '../hooks/useFinancialPrivacy';
import { FinancialPrivacyToggle } from './FinancialPrivacyToggle';
import { BrandLogo } from './BrandLogo';

interface TopHeaderProps {
  onOpenNewProject: () => void;
  onOpenLoginModal: () => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onToggleMobileMenu?: () => void;
  supportAlerts?: SupportAlert[];
  onOpenSupportAlertWhatsApp?: (alert: SupportAlert) => void;
  onOpenSupportAlertProject?: (projectId: string) => void;
  whatsappConnected?: boolean;
  onOpenAiSettings?: () => void;
  onOpenWhatsAppModal?: () => void;
  workspaces?: Workspace[];
  currentWorkspace?: Workspace;
  onSelectWorkspace?: (id: string) => void;
  onOpenWorkspaceModal?: () => void;
  plan?: SubscriptionPlan;
  activeProjectsCount?: number;
  onOpenSubscriptionModal?: () => void;
  onOpenAdminDashboard?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  currentRole?: TeamRole;
  onRoleChange?: (role: TeamRole) => void;
  onOpenTeamSettings?: () => void;
  onOpenSectorOnboarding?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenNewProject,
  onOpenLoginModal,
  currentUser,
  onLogout,
  searchQuery,
  onSearchChange,
  onToggleMobileMenu,
  supportAlerts = [],
  onOpenSupportAlertWhatsApp,
  onOpenSupportAlertProject,
  whatsappConnected = false,
  onOpenAiSettings,
  onOpenWhatsAppModal,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onOpenWorkspaceModal,
  plan = 'start',
  activeProjectsCount,
  onOpenSubscriptionModal,
  onOpenAdminDashboard,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  currentRole = 'ceo',
  onRoleChange,
  onOpenTeamSettings,
  onOpenSectorOnboarding
}) => {
  const { hideFinancials, toggleHideFinancials } = useFinancialPrivacy();
  const searchRef = useRef<HTMLInputElement>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(Boolean(searchQuery));
  const unreadAlertsCount = supportAlerts.filter(a => !a.isRead).length;
  const [unreadCount, setUnreadCount] = useState(0);
  const totalUnread = unreadCount + unreadAlertsCount;
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    desc: string;
    time: string;
    unread: boolean;
    tag: string;
  }>>([]);

  // Global Keyboard Shortcut: Cmd + K / Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    setUnreadCount(0);
  };

  const isFounder = isSaasOwner(currentUser) || currentRole === 'admin' || currentUser?.role === 'admin';
  const userName = currentUser?.name || (currentUser ? 'Gestor' : 'Henrique Ferraz (Admin)');
  const roleLabel = currentRole === 'ceo' 
    ? 'CEO (Acesso Total)' 
    : currentRole === 'admin' 
    ? 'Administrador' 
    : 'Parceiro (Restrito)';
  const userRole = currentUser?.role === 'client' 
    ? 'Cliente' 
    : (isFounder ? 'Administrador • Acesso Total' : (currentUser ? roleLabel : 'Administrador'));

  return (
    <header className="h-16 bg-white border-b border-[#EAECEF] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30 select-none shadow-2xs">
      
      {/* Mobile Search Active View */}
      {isMobileSearchOpen ? (
        <div className="flex-1 flex items-center gap-2 sm:hidden py-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#0F172A]" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar projetos, clientes, OS..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#EAECEF] bg-white text-base text-[#0F172A] placeholder:text-[#94A3B8] shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-[#94A3B8] hover:text-[#0F172A] hover:bg-neutral-100 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                title="Limpar pesquisa"
                aria-label="Limpar pesquisa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(false)}
            className="px-3 py-2 text-xs font-semibold text-[#475569] hover:text-[#0F172A] min-h-[44px] flex items-center justify-center cursor-pointer shrink-0 rounded-xl hover:bg-neutral-50"
          >
            Fechar
          </button>
        </div>
      ) : (
        <>
          {/* Left: Mobile Toggle & Workspace Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              onClick={onToggleMobileMenu}
              className="p-2 rounded-xl text-[#475569] hover:bg-[#F8F9FA] md:hidden cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logomarca oficial visível no Mobile com as mesmas cores do Desktop */}
            <div className="flex md:hidden items-center shrink-0 pr-1">
              <BrandLogo variant="full" size="sm" theme="light" showSubtitle={false} />
            </div>

            {/* Desktop Sidebar Toggle */}
            {onToggleSidebarCollapse && (
              <button
                type="button"
                onClick={onToggleSidebarCollapse}
                className="hidden md:flex p-2 rounded-xl text-[#64748B] hover:bg-[#F8F9FA] hover:text-[#0F172A] transition-colors cursor-pointer border border-transparent hover:border-[#EAECEF]"
                title={isSidebarCollapsed ? "Expandir menu lateral (Alt+M)" : "Recolher menu lateral (Alt+M)"}
                aria-label={isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-[#64748B]" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-[#64748B]" />
                )}
              </button>
            )}

            {workspaces && currentWorkspace && onSelectWorkspace && onOpenWorkspaceModal ? (
              <WorkspaceSwitcher
                workspaces={workspaces}
                currentWorkspace={currentWorkspace}
                onSelectWorkspace={onSelectWorkspace}
                onOpenWorkspaceModal={onOpenWorkspaceModal}
                plan={plan}
              />
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#475569] min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#F8F9FA] border border-[#EAECEF] text-[#475569] flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-[#0F172A] truncate">
                  {currentUser?.workshopName || 'Minha Empresa'}
                </span>
              </div>
            )}
          </div>

          {/* Middle: Global Search Input with Cmd + K (Fleetly Style) */}
          <div className="hidden sm:block flex-1 max-w-md mx-2 sm:mx-4">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] transition-colors group-focus-within:text-[#0F172A]" />
              <input
                ref={searchRef}
                id="global-search-input"
                type="text"
                placeholder="Buscar projetos, clientes, etapas..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-12 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-[#0F172A] text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-all shadow-2xs"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#94A3B8] hover:text-[#0F172A] hover:bg-neutral-200/60 cursor-pointer"
                  title="Limpar pesquisa"
                  aria-label="Limpar pesquisa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-[#94A3B8] bg-white border border-[#EAECEF] rounded-md shadow-2xs font-mono">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          {/* Right: Actions, Notifications & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* Quick Primary Action Button: + Novo Projeto (Fleetly Style #111827) */}
            <button
              type="button"
              id="top-header-btn-new-project"
              onClick={onOpenNewProject}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer select-none active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Novo Projeto</span>
            </button>
            
            {/* Mobile Search Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              className={`sm:hidden p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer relative ${
                searchQuery 
                  ? 'bg-orange-50 text-[#F97316] border border-orange-200' 
                  : 'text-[#5F6368] hover:bg-[#F8F9FA]'
              }`}
              title="Buscar projetos e clientes"
              aria-label="Abrir pesquisa"
            >
              <Search className="w-5 h-5" />
              {searchQuery && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F97316]" />
              )}
            </button>

            {/* Botão de Acesso Direto à Área de Admin no TopHeader */}
            {onOpenAdminDashboard && (
              <button
                type="button"
                id="top-header-admin-btn"
                onClick={onOpenAdminDashboard}
                title="Área de Administrador • Telemetria, MRR e Acesso Total"
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Área de Admin</span>
                <span className="text-[10px] bg-white/25 text-white px-1.5 py-0.2 rounded font-extrabold uppercase">
                  Admin
                </span>
              </button>
            )}

            {/* WhatsApp Connection Status Indicator */}
            <button
              type="button"
              id="top-header-whatsapp-status"
              onClick={onOpenWhatsAppModal || onOpenAiSettings}
              title={whatsappConnected ? "WhatsApp Conectado e Ativo • Clique para Gerenciar" : "Conectar WhatsApp Business • Clique para Ler QR Code"}
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 ${
                whatsappConnected
                  ? 'bg-[#E6F4EA] hover:bg-[#D7EEDF] text-[#137333] border-[#CEEAD6]'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
              }`}
            >
              {whatsappConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#188038]"></span>
                  <MessageSquare className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#188038] shrink-0" />
                  <span className="whitespace-nowrap hidden md:inline">WhatsApp Ativo</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <MessageSquare className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-700 shrink-0" />
                  <span className="whitespace-nowrap hidden sm:inline">Conectar WhatsApp</span>
                </>
              )}
            </button>

            {/* Financial Privacy Toggle (Ocultar dados financeiros / Modo Blur) */}
            <FinancialPrivacyToggle
              id="top-header-financial-privacy"
              size="sm"
              variant="default"
              showLabel={false}
              className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
            />

            {/* Notifications Icon with Fleetly Badge Indicator */}
            <div className="relative">
              <button 
                id="top-btn-notifications"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  if (isUserMenuOpen) setIsUserMenuOpen(false);
                }}
                className={`relative p-2 rounded-xl transition-all cursor-pointer border min-h-[40px] min-w-[40px] flex items-center justify-center ${
                  unreadAlertsCount > 0 
                    ? 'text-red-700 bg-red-50 border-red-200' 
                    : isNotificationsOpen
                    ? 'text-[#0F172A] bg-slate-100 border-[#EAECEF]'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8F9FA] border-transparent hover:border-[#EAECEF]'
                }`}
                aria-label="Notificações"
              >
                <Bell className="w-4 h-4 text-[#64748B]" />
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#111827] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    {totalUnread}
                  </span>
                )}
              </button>

              {/* Notifications Popover */}
              {isNotificationsOpen && (
            <div 
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#EAECEF] p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#EAECEF]">
                <div>
                  <h4 className="font-semibold text-xs text-[#0F172A]">
                    Notificações
                  </h4>
                  <p className="text-[11px] text-[#64748B]">
                    Atualizações em tempo real dos seus projetos
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-slate-700 hover:text-black cursor-pointer hover:underline"
                  >
                    Marcar como lidas
                  </button>
                )}
              </div>

              <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
                {/* Urgent Support Alerts */}
                {supportAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg border border-[#FAD2CF] bg-[#FCE8E6]/60 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-[#C5221F] text-[11px] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#D93025]"></span>
                        Suporte Solicitado pelo Cliente
                      </span>
                      <span className="text-[10px] text-[#80868B]">
                        {alert.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-[#202124] leading-snug">
                      <strong>{alert.clientName}</strong> ({alert.projectCode}) solicitou suporte no portal.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      {onOpenSupportAlertWhatsApp && (
                        <button
                          onClick={() => {
                            onOpenSupportAlertWhatsApp(alert);
                            setIsNotificationsOpen(false);
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#188038] hover:bg-[#137333] text-white font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          Atender no WhatsApp
                        </button>
                      )}
                      {onOpenSupportAlertProject && (
                        <button
                          onClick={() => {
                            onOpenSupportAlertProject(alert.projectId);
                            setIsNotificationsOpen(false);
                          }}
                          className="px-2.5 py-1 rounded-md bg-white border border-[#E8EAED] hover:bg-[#F8F9FA] text-[#202124] font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          Ver Projeto
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {supportAlerts.length === 0 && notifications.length === 0 && (
                  <div className="py-8 px-4 text-center">
                    <Bell className="w-7 h-7 text-[#94A3B8] mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-semibold text-[#0F172A]">Nenhuma notificação no momento</p>
                    <p className="text-[11px] text-[#64748B] mt-1 max-w-[200px] mx-auto leading-relaxed">
                      As atualizações em tempo real dos seus projetos e baixas Pix aparecerão aqui.
                    </p>
                  </div>
                )}

                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-2.5 rounded-lg border text-xs transition-colors ${
                      notif.unread
                        ? 'bg-[#F8F9FA] border-[#E8EAED]'
                        : 'bg-white border-[#E8EAED] opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-medium text-[#202124] text-xs truncate">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-[#80868B] shrink-0">
                        {notif.time}
                      </span>
                    </div>
                    <p className="text-xs text-[#5F6368] leading-snug">
                      {notif.desc}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#F1F3F4] text-[#5F6368]">
                        {notif.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            id="top-user-profile-btn"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#F8F9FA] transition-colors text-left cursor-pointer border border-transparent hover:border-[#E8EAED]"
          >
            <div className="w-8 h-8 rounded-full bg-[#202124] text-white flex items-center justify-center font-medium text-xs overflow-hidden shrink-0">
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>

            <div className="hidden lg:block min-w-0 pr-1">
              <p className="text-xs font-medium text-[#202124] leading-tight truncate">
                {userName}
              </p>
              <p className="text-[11px] text-[#5F6368] leading-tight truncate">
                {userRole}
              </p>
            </div>
            
            <ChevronDown className="w-3.5 h-3.5 text-[#80868B] hidden sm:block" />
          </button>

          {/* User Popover / Dropdown */}
          {isUserMenuOpen && (
            <div 
              className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-[#E8EAED] p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              onClick={() => setIsUserMenuOpen(false)}
            >
              <div className="p-3 border-b border-[#E8EAED] bg-[#F8F9FA] rounded-lg mb-1">
                <p className="text-xs font-semibold text-[#202124]">{userName}</p>
                <p className="text-[11px] text-[#5F6368] truncate">{currentUser?.email || 'Usuário Conectado'}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    currentRole === 'ceo' 
                      ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                      : currentRole === 'admin'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {currentRole === 'ceo' && <Crown className="w-2.5 h-2.5 text-purple-700" />}
                    {userRole}
                  </span>
                  <span className="text-[10px] text-[#80868B] font-semibold">
                    Plano {plan === 'escala' ? 'Scala' : plan === 'start' ? 'Start' : 'Grátis'}
                  </span>
                </div>
              </div>

              {/* Modo Time: Alternar Cargo / Perspectiva */}
              {onRoleChange && (
                <div className="p-2 border-b border-[#E8EAED] mb-1 bg-neutral-50/70 rounded-lg">
                  <p className="text-[10px] font-bold text-[#80868B] uppercase tracking-wider mb-1.5 px-0.5">
                    Perspectiva (Modo Time)
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => onRoleChange('ceo')}
                      className={`py-1.5 px-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        currentRole === 'ceo' 
                          ? 'bg-purple-100 text-purple-800 shadow-2xs' 
                          : 'bg-white hover:bg-neutral-100 text-[#5F6368] border border-[#E8EAED]'
                      }`}
                      title="Perspectiva CEO: Acesso total"
                    >
                      <Crown className="w-3 h-3 text-purple-600" />
                      <span>CEO</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRoleChange('admin')}
                      className={`py-1.5 px-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        currentRole === 'admin' 
                          ? 'bg-blue-100 text-blue-800 shadow-2xs' 
                          : 'bg-white hover:bg-neutral-100 text-[#5F6368] border border-[#E8EAED]'
                      }`}
                      title="Perspectiva Administrador: Gestão de projetos e IA"
                    >
                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                      <span>Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRoleChange('parceiro')}
                      className={`py-1.5 px-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        currentRole === 'parceiro' 
                          ? 'bg-amber-100 text-amber-800 shadow-2xs' 
                          : 'bg-white hover:bg-neutral-100 text-[#5F6368] border border-[#E8EAED]'
                      }`}
                      title="Perspectiva Membro / Parceiro: Visão de campo para testes"
                    >
                      <Handshake className="w-3 h-3 text-amber-600" />
                      <span>Membro</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-0.5">
                {onOpenAdminDashboard && (
                  <button
                    onClick={onOpenAdminDashboard}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left cursor-pointer border border-indigo-200"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-700" />
                      <span>Área de Admin (Acesso Total)</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-600 text-white">
                      ADMIN
                    </span>
                  </button>
                )}

                {onOpenWorkspaceModal && (
                  <button
                    onClick={onOpenWorkspaceModal}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#80868B]" />
                      <span>Workspaces & Filiais</span>
                    </div>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#F1F3F4] text-[#5F6368]">
                      {workspaces?.length || 1}/{plan === 'escala' ? 6 : plan === 'start' ? 3 : 1}
                    </span>
                  </button>
                )}

                {onOpenSectorOnboarding && (
                  <button
                    onClick={onOpenSectorOnboarding}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#FF6515]" />
                      <span>Templates &amp; Setor (IA)</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-[#C2410C]">
                      Gemini
                    </span>
                  </button>
                )}

                {onOpenSubscriptionModal && (
                  <button
                    onClick={onOpenSubscriptionModal}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#FF6515]" />
                      <span>Assinatura & Cotas</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FFF7ED] text-[#EA580C]">
                      {plan === 'escala' ? 'Scala' : plan === 'start' ? 'Start' : 'Grátis'}
                    </span>
                  </button>
                )}

                {onOpenTeamSettings && (
                  <button
                    onClick={onOpenTeamSettings}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#80868B]" />
                      <span>Gerenciar Equipe</span>
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#FFF7ED] text-[#EA580C]">
                      Membros
                    </span>
                  </button>
                )}

                {/* Opção de Ocultar Dados Financeiros (Modo Blur) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHideFinancials();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {hideFinancials ? <EyeOff className="w-4 h-4 text-amber-700" /> : <Eye className="w-4 h-4 text-[#80868B]" />}
                    <span>Ocultar Dados Financeiros</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    hideFinancials 
                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                      : 'bg-[#F1F3F4] text-[#5F6368]'
                  }`}>
                    {hideFinancials ? 'Borrados' : 'Visíveis'}
                  </span>
                </button>

                <button
                  onClick={onOpenLoginModal}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] transition-colors text-left cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-[#80868B]" />
                  <span>Trocar de Conta / Google Auth</span>
                </button>

                {currentUser && (
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#D93025] hover:bg-[#FCE8E6] transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-[#D93025]" />
                    <span>Sair da Conta</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

          </div>
        </>
      )}

    </header>
  );
};
