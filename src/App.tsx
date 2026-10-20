/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Project, 
  ActiveView, 
  UserProfile, 
  AiSettingsConfig, 
  SupportAlert,
  Workspace, 
  WorkspaceSegment, 
  SubscriptionPlan,
  isSaasOwner,
  SAAS_OWNER_EMAIL,
  Installment,
  TeamRole,
  TeamMember,
  canAccessFinancials,
  canManageProjects,
  canManageAiNotifications,
  canManageTeam,
  canManageCompanySettings,
  TEAM_ROLE_CONFIGS
} from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { ClientPortalView } from './components/ClientPortalView';
import { WhatsAppSimulatorModal } from './components/WhatsAppSimulatorModal';
import { PixChargeModal } from './components/PixChargeModal';
import { NewProjectModal } from './components/NewProjectModal';
import { AiNotificationDrawer } from './components/AiNotificationDrawer';
import { LoginModal } from './components/LoginModal';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { useSubscriptionGuard } from './hooks/useSubscriptionGuard';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { ClientsDirectoryModal } from './components/ClientsDirectoryModal';
import { ProjectsAndFinanceView } from './components/ProjectsAndFinanceView';
import { AiCustomerServiceView } from './components/AiCustomerServiceView';
import { SupportAlertBanner } from './components/SupportAlertBanner';
import { WorkspaceModal } from './components/WorkspaceModal';
import { AdminDashboardView } from './components/AdminDashboardView';
import { LegalPageView } from './components/LegalPageView';
import { WhatsAppConnectionModal } from './components/WhatsAppConnectionModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { VideoExplainerModal } from './components/VideoExplainerModal';
import { RetencaoProDashboard } from './components/RetencaoProDashboard';
import { CheckCircle2, Info, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { subscribeToAuthState, signOutSupabase } from './lib/supabaseAuth';
import { onFrontendValidationBlocked } from './utils/fetchMiddleware';
import { validateDateFormat, validateFinancialValue, validateInstallmentsArray } from './utils/apiValidator';

// Helper to determine initial project ID from URL path, query params, or SSR injection
const getInitialProjectIdFromUrl = (): string => {
  try {
    if (typeof window !== 'undefined') {
      if ((window as any).__INITIAL_PROJECT_ID__) {
        return (window as any).__INITIAL_PROJECT_ID__;
      }
      const path = window.location.pathname;
      const match = path.match(/\/(?:acompanhar|portal|acompanhamento)\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        return match[1];
      }
      const search = new URLSearchParams(window.location.search);
      const q = search.get('id') || search.get('project') || search.get('os') || search.get('p');
      if (q) return q;
    }
  } catch (e) {
    console.error('Error resolving project from URL:', e);
  }
  return '';
};

// Helper to determine initial view from URL path, hash, or query params
const parseCurrentUrlView = (): ActiveView => {
  try {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    const viewParam = search.get('view')?.toLowerCase();

    // 1. Legal terms and privacy
    if (
      path.startsWith('/termos') || 
      path.startsWith('/terms') || 
      hash === '#termos' || 
      hash === '#terms' || 
      viewParam === 'termos' || 
      viewParam === 'terms'
    ) {
      return 'terms';
    }
    if (
      path.startsWith('/privacidade') || 
      path.startsWith('/privacy') || 
      path.startsWith('/politica') || 
      hash === '#privacidade' || 
      hash === '#privacy' || 
      viewParam === 'privacidade' || 
      viewParam === 'privacy'
    ) {
      return 'privacy';
    }

    // 2. Client tracking portal
    if (
      path.startsWith('/acompanhar') || 
      path.startsWith('/portal') || 
      path.startsWith('/acompanhamento') || 
      path.includes('/acompanhar') || 
      path.includes('/portal') || 
      hash === '#portal' || 
      viewParam === 'portal'
    ) {
      return 'client_portal';
    }

    // 3. Retenção Pro
    if (
      path.startsWith('/retencao-pro') || 
      path.startsWith('/retencaopro') || 
      path.startsWith('/retencao_pro') || 
      hash === '#retencao-pro' || 
      hash === '#retencao_pro' || 
      hash === '#retencao' || 
      viewParam === 'retencao_pro' || 
      viewParam === 'retencao-pro' || 
      viewParam === 'retencao'
    ) {
      return 'retencao_pro';
    }

    // 4. Admin dashboard
    if (hash === '#admin' || hash === '#admin_dashboard') {
      return 'admin_dashboard';
    }

    // 5. Auth callbacks, tokens or explicit dashboard routes
    // Supabase redirects include access_token or code or token_hash
    const isAuthCallback = 
      hash.includes('access_token') || 
      hash.includes('refresh_token') || 
      hash.includes('type=recovery') || 
      hash.includes('type=signup') || 
      search.has('code') || 
      search.has('token_hash') || 
      search.has('access_token');

    if (
      isAuthCallback ||
      hash.includes('painel') || 
      hash.includes('dashboard') || 
      viewParam === 'dashboard' || 
      viewParam === 'painel' || 
      viewParam === 'app' || 
      viewParam === 'saas' || 
      path.startsWith('/painel') || 
      path.startsWith('/dashboard')
    ) {
      return 'dashboard';
    }

    // 6. If user already has an active session in storage, redirect directly to admin_dashboard or dashboard
    try {
      const savedUser = localStorage.getItem('bomprojeto_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && (parsed.email || parsed.id)) {
          const userEmail = (parsed.email || '').trim().toLowerCase();
          if (userEmail === SAAS_OWNER_EMAIL.toLowerCase()) {
            return 'admin_dashboard';
          }
          return 'dashboard';
        }
      }
    } catch {}
  } catch {
    // fallback
  }
  return 'landing';
};

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const userStr = localStorage.getItem('bomprojeto_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u && u.email) {
          const email = u.email.toLowerCase().trim();
          const cached = localStorage.getItem(`bomprojeto_cached_projects_${email}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              return parsed;
            }
          }
        }
      }
    } catch (e) {}
    return [];
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string>(getInitialProjectIdFromUrl);
  const [activeView, setActiveView] = useState<ActiveView>(parseCurrentUrlView);
  const [isLoading, setIsLoading] = useState(true);

  // User Authentication State - Initialized from localStorage or null (guest/visitor)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('bomprojeto_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        const emailClean = (parsed.email || '').trim().toLowerCase();
        // O perfil oficial henrique.ferrazms@gmail.com é estritamente Administrador com Acesso Total
        if (emailClean === SAAS_OWNER_EMAIL.toLowerCase()) {
          parsed.role = 'admin';
          parsed.teamRole = 'admin';
          parsed.plan = 'escala';
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error reading user from localStorage', e);
    }
    return null;
  });

  // Sync projects to localStorage cache isolated per authenticated user
  useEffect(() => {
    const email = currentUser?.email?.toLowerCase().trim();
    if (email) {
      const timer = setTimeout(() => {
        try {
          localStorage.setItem(`bomprojeto_cached_projects_${email}`, JSON.stringify(projects));
        } catch (e) {}
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [projects, currentUser?.email]);

  // Modals state
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [activeSectorTemplate, setActiveSectorTemplate] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('bomprojeto_active_sector_template');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [aiAlertProject, setAiAlertProject] = useState<Project | null>(null);
  const [chargingData, setChargingData] = useState<{ project: Project; installment: Installment } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeSidebarTab, setActiveSidebarTab] = useState('projetos');
  const [whatsappDraft, setWhatsappDraft] = useState('');

  // Sidebar Collapse / Expand State (persisted in localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bomprojeto_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('bomprojeto_sidebar_collapsed', JSON.stringify(next));
      } catch (e) {
        console.error('Error saving sidebar collapsed state', e);
      }
      return next;
    });
  };

  // AI Customer Service Settings State (Clean for every user, without hardcoded CNPJ or fake foundation dates)
  const [aiSettings, setAiSettings] = useState<AiSettingsConfig>(() => {
    try {
      const saved = localStorage.getItem('bomprojeto_ai_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Sanitiza dados legados que continham CNPJ ou telefone fictício
        if (parsed.whatsappPhone === '+55 (11) 98765-4321' || parsed.whatsappPhone === '5511987654321') {
          parsed.whatsappPhone = '';
          parsed.whatsappConnected = false;
        }
        if (parsed.contextData && parsed.contextData.includes('48.912.831/0001-90')) {
          parsed.contextData = '';
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error reading ai settings', e);
    }
    return {
      autoCommunicationEnabled: true,
      notifyEveryUpdate: true,
      requireReviewForDelicate: true,
      tone: 'professional',
      quietHoursStart: 19,
      quietHoursEnd: 8,
      maxPerDay: 10,
      maxPerProject: 7,
      responseDelayMinutes: 5,
      customPrompt: 'Você é o Gestor Técnico responsável pela execução dos projetos. Enfatize sempre o rigor técnico, cumprimento das especificações, controle de qualidade e a transparência em cada etapa.',
      contextData: '', // Limpo: Cada assinante cadastra os dados e regras da sua própria empresa
      whatsappConnected: false,
      whatsappPhone: '',
      whatsappInstanceName: '',
      billingType: 'friendly',
      customBillingPrompt: 'Lembre o cliente com cordialidade e elegância sobre a parcela correspondente à etapa atual de execução do projeto. Informe a chave Pix cadastrada e confirme a baixa no sistema.',
      billingTone: 'padrao',
      autoBillingOverdueDays: 3,
      billingSchedule: {
        enabled: true,
        preset: 'commercial',
        startTime: '09:00',
        endTime: '18:00',
        allowedDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
        blockWeekends: true,
        blockHolidays: true,
        pauseDuringLunch: true,
        lunchStart: '12:00',
        lunchEnd: '13:30',
        queueOutOfWindow: true,
        timezone: 'America/Sao_Paulo'
      },
      serviceSchedule: {
        enabled: true,
        preset: 'commercial',
        startTime: '08:00',
        endTime: '18:00',
        allowedDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
        blockWeekends: true,
        blockHolidays: true,
        pauseDuringLunch: true,
        lunchStart: '12:00',
        lunchEnd: '13:30',
        queueOutOfWindow: true,
        timezone: 'America/Sao_Paulo'
      },
      clientSupportButtonEnabled: true,
      visualAlertBannerEnabled: true,
      visualAlertSoundEnabled: true,
      allowPortalReactions: true,
      showWarrantyCertificate: true,
      showWorkshopFooterSignature: true
    };
  });

  const handleSaveAiSettings = (newSettings: AiSettingsConfig) => {
    setAiSettings(newSettings);
    try {
      localStorage.setItem('bomprojeto_ai_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Error saving ai settings', e);
    }
    showToast('Configurações da IA salvas com sucesso!', 'success');
  };

  // Team Management State: Inicializa dinamicamente para o assinante autenticado
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    try {
      const savedUser = localStorage.getItem('bomprojeto_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u && u.email) {
          return [
            {
              id: `tm-${u.id || 'owner'}`,
              name: u.name || 'Gestor Principal',
              email: u.email,
              role: 'ceo',
              phone: u.phone || '',
              status: 'active',
              workspaceAccess: 'all',
              invitedAt: new Date().toISOString().split('T')[0]
            }
          ];
        }
      }
    } catch {}
    return [];
  });

  const [currentTeamRole, setCurrentTeamRole] = useState<TeamRole>(() => {
    try {
      const saved = localStorage.getItem('bomprojeto_current_team_role');
      // Se estava salvo como parceiro, restaura/promove automaticamente para CEO liberando acesso total
      if (saved === 'parceiro') {
        localStorage.setItem('bomprojeto_current_team_role', 'ceo');
        return 'ceo';
      }
      if (saved === 'ceo' || saved === 'admin') {
        return saved as TeamRole;
      }
      localStorage.setItem('bomprojeto_current_team_role', 'ceo');
    } catch {}
    return 'ceo';
  });

  const [settingsModalTab, setSettingsModalTab] = useState<'general' | 'team' | 'nichos'>('general');

  const handleOpenLogin = () => {
    if (currentUser) {
      setActiveView('dashboard');
      try {
        window.history.pushState(null, '', '/#painel');
      } catch {}
      showToast(`Bem-vindo ao Dashboard, ${currentUser.name}!`, 'info');
      return;
    }
    try {
      const saved = localStorage.getItem('bomprojeto_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.email || parsed.id)) {
          setCurrentUser(parsed);
          setActiveView('dashboard');
          try {
            window.history.pushState(null, '', '/#painel');
          } catch {}
          showToast(`Bem-vindo ao Dashboard, ${parsed.name || 'Gestor'}!`, 'info');
          return;
        }
      }
    } catch {}
    setIsLoginModalOpen(true);
  };

  const handleRoleChange = (role: TeamRole) => {
    setCurrentTeamRole(role);
    try {
      localStorage.setItem('bomprojeto_current_team_role', role);
    } catch {}
    const roleLabels = {
      ceo: 'CEO (Acesso Total)',
      admin: 'Administrador (Projetos, Clientes & Notificação IA)',
      parceiro: 'Parceiro (Dashboard & Abertura de OS - Sem Financeiro)'
    };
    showToast(`Perspectiva alterada para: ${roleLabels[role]}`, 'info');
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.members) && data.members.length > 0) {
          const sanitized = data.members.map((m: TeamMember) => 
            m.email?.toLowerCase() === 'henrique.ferrazms@gmail.com' ? { ...m, role: 'ceo' as TeamRole } : m
          );
          setTeamMembers(sanitized);
        }
      }
    } catch (e) {
      console.error('Error fetching team members:', e);
    }
  };

  const handleInviteTeamMember = async (data: {
    name: string;
    email: string;
    role: TeamRole;
    phone?: string;
    workspaceAccess: 'all' | string[];
  }): Promise<{ inviteLink?: string; message?: string }> => {
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, plan: subscriptionPlan })
      });
      if (res.ok) {
        const result = await res.json();
        await fetchTeamMembers();
        showToast(`Convite gerado para ${data.name} (${data.role.toUpperCase()})!`, 'success');
        return { inviteLink: result.inviteLink, message: result.message };
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao convidar membro', 'info');
        throw new Error(err.error || 'Erro ao gerar convite');
      }
    } catch (err: any) {
      throw err;
    }
  };

  const handleUpdateMemberRole = async (memberId: string, role: TeamRole) => {
    try {
      const res = await fetch(`/api/team/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        await fetchTeamMembers();
        showToast('Cargo do colaborador atualizado com sucesso!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao alterar cargo', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de conexão ao alterar cargo', 'info');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchTeamMembers();
        showToast('Colaborador removido da equipe com sucesso.', 'info');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao remover colaborador', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover colaborador', 'info');
    }
  };

  const handleResendInvite = async (memberId: string): Promise<{ inviteLink?: string }> => {
    try {
      const res = await fetch('/api/team/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });
      if (res.ok) {
        const data = await res.json();
        showToast('Link de convite atualizado e copiado!', 'success');
        return { inviteLink: data.inviteLink };
      }
    } catch (err) {
      console.error(err);
    }
    return {};
  };

  const handleSidebarItemClick = (item: string) => {
    setActiveSidebarTab(item);
    if (item === 'admin') {
      if (isSaasOwner(currentUser)) {
        setActiveView('admin_dashboard');
      } else {
        showToast(`Ambiente restrito exclusivamente ao fundador (${SAAS_OWNER_EMAIL})`, 'info');
        setActiveView('dashboard');
      }
    } else if (item === 'painel') {
      setActiveView('dashboard');
    } else if (item === 'projetos_finance') {
      setActiveView('projects_finance');
    } else if (item === 'ia') {
      if (!canManageAiNotifications(currentTeamRole)) {
        showToast('Notificações e IA estão restritas a Administradores e CEO. O perfil Parceiro tem acesso ao Dashboard e abertura de OS.', 'info');
        return;
      }
      setActiveView('ai_settings');
    } else if (item === 'retencao_pro') {
      navigateToView('retencao_pro');
    } else if (item === 'config') {
      if (!canManageCompanySettings(currentTeamRole)) {
        showToast('Configurações da empresa restritas ao CEO.', 'info');
        return;
      }
      setSettingsModalTab('general');
      setIsSettingsModalOpen(true);
    } else if (item === 'team' || item === 'modo_time') {
      if (!canManageTeam(currentTeamRole)) {
        showToast('Modo Time e gestão de equipe restritos ao CEO.', 'info');
        return;
      }
      setSettingsModalTab('team');
      setIsSettingsModalOpen(true);
    } else if (item === 'clientes') {
      setIsClientsModalOpen(true);
    } else if (item === 'nichos' || item === 'setores_ia') {
      setSettingsModalTab('nichos');
      setIsSettingsModalOpen(true);
    } else if (item === 'workspaces') {
      setIsWorkspaceModalOpen(true);
    }
  };

  // Workspaces Management State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    {
      id: 'ws-matriz',
      name: 'Gestão de Projetos (Matriz)',
      slug: 'gestao-projetos-matriz',
      segment: 'projetos',
      segmentLabel: 'Projetos Gerais',
      type: 'matriz',
      city: 'São Paulo - SP',
      activeProjectsCount: 0,
      createdAt: '2026-01-10'
    }
  ]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('bomprojeto_current_workspace_id');
      if (saved) return saved;
    } catch (e) {
      console.error(e);
    }
    return 'ws-matriz';
  });
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  // Todos os usuários iniciam no plano gratuito (free) até efetuarem e confirmarem o pagamento
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>(() => {
    try {
      const saved = localStorage.getItem('bomprojeto_plan');
      if (saved && (saved === 'start' || saved === 'escala')) {
        return saved as SubscriptionPlan;
      }
    } catch (e) {
      console.error(e);
    }
    return 'free';
  });

  // Hook central de validação de acesso às regras e limites de plano
  const subGuard = useSubscriptionGuard({
    plan: subscriptionPlan,
    userEmail: currentUser?.email,
    onOpenUpgradeModal: () => setIsSubscriptionModalOpen(true),
    onBlockedNotice: (msg) => showToast(msg, 'info')
  });

  // Sincroniza plano do usuário com o servidor (libera plano pago apenas se confirmado no banco)
  useEffect(() => {
    const syncUserPlan = async () => {
      const email = currentUser?.email;
      if (!email) return;

      try {
        const res = await fetch(`/api/subscriptions/user-plan?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          if (email.toLowerCase() === SAAS_OWNER_EMAIL.toLowerCase()) {
            // Conta master do criador: respeita o plano selecionado para testes (free, start ou escala)
            const targetPlan = (data.plan === 'free' || data.plan === 'start' || data.plan === 'escala') ? data.plan : 'escala';
            setSubscriptionPlan(targetPlan);
            try {
              localStorage.setItem('bomprojeto_plan', targetPlan);
            } catch {}
          } else if (data.isPaid && (data.plan === 'start' || data.plan === 'escala')) {
            setSubscriptionPlan(data.plan);
            try {
              localStorage.setItem('bomprojeto_plan', data.plan);
            } catch {}
          } else {
            // Não pagou ou plano inativo: garante plano gratuito
            setSubscriptionPlan('free');
            try {
              localStorage.setItem('bomprojeto_plan', 'free');
            } catch {}
          }
        }
      } catch (err) {
        console.warn('[Sync Plan Error]:', err);
      }
    };

    syncUserPlan();
  }, [currentUser?.email]);

  // Sincroniza status real da conexão do WhatsApp com o backend para manter a interface e cliente seguros
  useEffect(() => {
    let isMounted = true;
    const syncWhatsAppStatus = async () => {
      try {
        const query = currentWorkspaceId ? `?workspaceId=${encodeURIComponent(currentWorkspaceId)}` : '';
        const res = await fetch(`/api/whatsapp/status${query}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const isConnected = Boolean(data.instance?.connected || data.connected);
          const serverPhone = isConnected ? (data.instance?.phone || data.phone || '') : '';

          setAiSettings(prev => {
            const hasPhoneMismatch = isConnected && serverPhone && prev.whatsappPhone !== serverPhone;
            const hasStatusMismatch = prev.whatsappConnected !== isConnected;
            const hasFakePhone = prev.whatsappPhone === '+55 (11) 98765-4321';

            if (hasStatusMismatch || hasPhoneMismatch || hasFakePhone) {
              const updated = {
                ...prev,
                whatsappConnected: isConnected,
                whatsappPhone: isConnected ? (serverPhone || (hasFakePhone ? '' : prev.whatsappPhone)) : ''
              };
              try {
                localStorage.setItem('bomprojeto_ai_settings', JSON.stringify(updated));
              } catch {}
              return updated;
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('[Sync WhatsApp Error]:', err);
      }
    };

    syncWhatsAppStatus();
    return () => { isMounted = false; };
  }, [currentWorkspaceId]);

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0];

  const fetchWorkspaces = async (overrideEmail?: string) => {
    try {
      const email = (overrideEmail || currentUser?.email || '').toLowerCase().trim();
      const wsId = currentWorkspaceId || 'ws-matriz';
      const queryParam = email ? `?userEmail=${encodeURIComponent(email)}&workspaceId=${encodeURIComponent(wsId)}` : `?workspaceId=${encodeURIComponent(wsId)}`;
      const res = await fetch(`/api/workspaces${queryParam}`, {
        headers: { 
          'x-user-email': email,
          'x-workspace-id': wsId
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setWorkspaces(data);
          if (!data.some(w => w.id === currentWorkspaceId)) {
            const fallbackId = data[0].id;
            setCurrentWorkspaceId(fallbackId);
            try {
              localStorage.setItem('bomprojeto_current_workspace_id', fallbackId);
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching workspaces', e);
    }
  };

  const handleSelectWorkspace = (id: string) => {
    setCurrentWorkspaceId(id);
    try {
      localStorage.setItem('bomprojeto_current_workspace_id', id);
    } catch (e) {
      console.error(e);
    }
    const ws = workspaces.find(w => w.id === id);
    if (ws) {
      showToast(`Ambiente alterado para: ${ws.name}`, 'info');
    }
  };

  const handleCreateWorkspace = async (data: {
    name: string;
    segment: WorkspaceSegment;
    segmentLabel: string;
    type: 'matriz' | 'filial' | 'segmento';
    city?: string;
    state?: string;
    phone?: string;
    address?: string;
    colorTheme?: string;
  }): Promise<boolean> => {
    // Validação de acesso pelo hook useSubscriptionGuard
    const wsAccess = subGuard.canManageMultipleWorkspaces(workspaces.length);
    if (!wsAccess.allowed) {
      showToast(wsAccess.message || 'Upgrade de plano necessário para criar múltiplos workspaces.', 'info');
      setIsSubscriptionModalOpen(true);
      return false;
    }

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || '',
          'x-workspace-id': currentWorkspaceId || 'ws-matriz'
        },
        body: JSON.stringify({ ...data, plan: subscriptionPlan })
      });
      if (res.ok) {
        const newWs = await res.json();
        setWorkspaces(prev => [...prev, newWs]);
        setCurrentWorkspaceId(newWs.id);
        try {
          localStorage.setItem('bomprojeto_current_workspace_id', newWs.id);
        } catch (e) {}
        showToast(`Workspace "${newWs.name}" criado com sucesso!`, 'success');
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao criar workspace', 'info');
        return false;
      }
    } catch (e) {
      console.error('Error creating workspace:', e);
      showToast('Erro de conexão ao criar workspace', 'info');
      return false;
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string): Promise<void> => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
        if (currentWorkspaceId === workspaceId) {
          const fallback = 'ws-matriz';
          setCurrentWorkspaceId(fallback);
          try {
            localStorage.setItem('bomprojeto_current_workspace_id', fallback);
          } catch (e) {}
        }
        await fetchProjects();
        await fetchWorkspaces();
        showToast('Workspace removido e projetos preservados na Matriz.', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao excluir workspace', 'info');
      }
    } catch (e) {
      console.error('Error deleting workspace:', e);
      showToast('Erro ao excluir workspace', 'info');
    }
  };

  const handleChangePlan = async (plan: SubscriptionPlan) => {
    setSubscriptionPlan(plan);
    try {
      localStorage.setItem('bomprojeto_plan', plan);
    } catch (e) {
      console.error(e);
    }

    if (currentUser?.email?.toLowerCase() === SAAS_OWNER_EMAIL.toLowerCase()) {
      try {
        await fetch('/api/subscriptions/founder-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentUser.email, plan })
        });
      } catch (err) {
        console.warn('Sync founder plan error:', err);
      }
    }

    showToast(`Plano alterado para: ${plan.toUpperCase()}`, 'success');
  };

  const handleSaveCompanySettings = (settings: {
    workshopName: string;
    cnpj: string;
    phone: string;
    pixKey: string;
  }) => {
    try {
      localStorage.setItem('bomprojeto_company_pix_key', settings.pixKey);
      localStorage.setItem('bomprojeto_company_cnpj', settings.cnpj);
    } catch {}

    if (currentUser) {
      const updatedUser = { 
        ...currentUser, 
        workshopName: settings.workshopName,
        phone: settings.phone,
        pixKey: settings.pixKey 
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('bomprojeto_user', JSON.stringify(updatedUser));
    }
    showToast(`Configurações e Chave Pix salvas com sucesso!`, 'success');
  };

  // Reset Geral de Dados (Exclusivo henrique.ferrazms@gmail.com)
  const handleResetData = async () => {
    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterEmail: currentUser?.email || 'henrique.ferrazms@gmail.com' })
      });

      if (res.ok) {
        setProjects([]);
        setSupportAlerts([]);
        setSelectedProjectId('');
        const defaultMatriz: Workspace[] = [
          {
            id: 'ws-matriz',
            name: 'Gestão de Projetos (Matriz)',
            slug: 'gestao-projetos-matriz',
            segment: 'projetos',
            segmentLabel: 'Projetos Gerais',
            type: 'matriz',
            city: 'São Paulo - SP',
            activeProjectsCount: 0,
            createdAt: new Date().toISOString()
          }
        ];
        setWorkspaces(defaultMatriz);
        setCurrentWorkspaceId('ws-matriz');
        try {
          localStorage.setItem('bomprojeto_current_workspace_id', 'ws-matriz');
        } catch (e) {}
        showToast('Reset concluído: contas e projetos fakes removidos!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao realizar reset de dados', 'info');
      }
    } catch (e) {
      console.error('Error during data reset:', e);
      showToast('Erro ao comunicar com o servidor para reset', 'info');
    }
  };

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<{ id: string; type: 'success' | 'info' | 'error' | 'warning'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    const id = String(Date.now());
    setToastMessage({ id, type, text });
    setTimeout(() => {
      setToastMessage((current) => (current?.id === id ? null : current));
    }, 4500);
  };

  // Support Alerts State (Alerta Visual na Tela do Bom Projeto)
  const [supportAlerts, setSupportAlerts] = useState<SupportAlert[]>([]);

  // Navigation handler that synchronizes browser URL history
  const navigateToView = (view: ActiveView) => {
    setActiveView(view);
    try {
      if (view === 'terms') {
        window.history.pushState(null, '', '/termos');
      } else if (view === 'privacy') {
        window.history.pushState(null, '', '/privacidade');
      } else if (view === 'landing') {
        window.history.pushState(null, '', '/');
      } else if (view === 'dashboard') {
        window.history.pushState(null, '', '/#painel');
      } else if (view === 'admin_dashboard') {
        window.history.pushState(null, '', '/#admin');
      } else if (view === 'client_portal') {
        window.history.pushState(null, '', '/#portal');
      } else if (view === 'retencao_pro') {
        window.history.pushState(null, '', '/retencao-pro');
      }
    } catch (e) {
      console.warn('history.pushState notice:', e);
    }
  };

  // Initial fetch from backend API
  useEffect(() => {
    fetchProjects();
    fetchSupportAlerts();
    fetchWorkspaces();
    fetchTeamMembers();

    // Check URL on mount
    const initialView = parseCurrentUrlView();
    setActiveView(prev => {
      // Se a URL ou o usuário já for autenticado, prioriza a visão adequada (admin_dashboard para Administrador)
      if (initialView === 'landing' && (currentUser?.email || localStorage.getItem('bomprojeto_user'))) {
        const isOwner = (currentUser?.email || localStorage.getItem('bomprojeto_user_email') || '').toLowerCase().trim() === SAAS_OWNER_EMAIL.toLowerCase();
        return isOwner ? 'admin_dashboard' : 'dashboard';
      }
      return initialView;
    });

    // Captura e notifica erros de redirecionamento OAuth na URL
    try {
      const hash = window.location.hash;
      const search = new URLSearchParams(window.location.search);
      const errorMsg = search.get('error_description') || search.get('error') || (hash.includes('error_description=') ? decodeURIComponent(hash.split('error_description=')[1].split('&')[0]) : '');
      if (errorMsg) {
        showToast(`Aviso de login: ${errorMsg.replace(/\+/g, ' ')}`, 'warning');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {}

    // Check for Mercado Pago subscription redirect params
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const subPlan = searchParams.get('plan') as SubscriptionPlan;
      if (searchParams.get('subscription_success') === '1' || searchParams.get('subscription_return') === '1') {
        if (subPlan && (subPlan === 'start' || subPlan === 'escala')) {
          setSubscriptionPlan(subPlan);
          try {
            localStorage.setItem('bomprojeto_plan', subPlan);
          } catch (e) {}
          showToast(`Assinatura do Plano ${subPlan.toUpperCase()} confirmada com sucesso!`, 'success');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) {}

    // Listen to browser Back/Forward navigation
    const handlePopState = () => {
      const nextView = parseCurrentUrlView();
      setActiveView(nextView);
      const targetProjId = getInitialProjectIdFromUrl();
      if (targetProjId) {
        setSelectedProjectId(targetProjId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const fetchSupportAlerts = async (overrideEmail?: string) => {
    try {
      const email = (overrideEmail || currentUser?.email || '').toLowerCase().trim();
      const wsId = currentWorkspaceId || 'ws-matriz';
      const queryParam = email ? `?userEmail=${encodeURIComponent(email)}&workspaceId=${encodeURIComponent(wsId)}` : `?workspaceId=${encodeURIComponent(wsId)}`;
      const res = await fetch(`/api/support-alerts${queryParam}`, {
        headers: { 
          'x-user-email': email,
          'x-workspace-id': wsId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSupportAlerts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Error fetching support alerts:', e);
    }
  };

  const playSupportAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, ctx.currentTime); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.15); // C6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const handleClientRequestSupport = async (project: Project, customMsg?: string) => {
    const alertMsg = customMsg || 'Cliente precisa de seu suporte';
    const now = new Date();
    const timeStr = `Hoje, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newAlert: SupportAlert = {
      id: `supp-${Date.now()}`,
      projectId: project.id,
      projectCode: project.code,
      clientName: project.clientName,
      clientPhone: project.clientPhone,
      message: alertMsg,
      timestamp: timeStr,
      date: now.toLocaleDateString('pt-BR'),
      isRead: false
    };

    setSupportAlerts(prev => [newAlert, ...prev]);

    // Play visual alert sound if enabled
    if (aiSettings.visualAlertSoundEnabled !== false) {
      playSupportAlertSound();
    }

    // Highlight project in OS matrix
    setProjects(prev => prev.map(p => 
      p.id === project.id 
        ? { ...p, needsAttention: true, lastInteractionText: 'Cliente precisa de seu suporte' }
        : p
    ));

    showToast(`🚨 Alerta no Bom Projeto: "${alertMsg}" de ${project.clientName}!`, 'info');

    try {
      await fetch(`/api/projects/${project.id}/support-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: alertMsg })
      });
    } catch (e) {
      console.error('Error sending support request API', e);
    }
  };

  const handleDismissSupportAlert = async (alertId: string) => {
    setSupportAlerts(prev => prev.filter(a => a.id !== alertId));
    showToast('Alerta de suporte resolvido com sucesso.', 'success');
    try {
      await fetch(`/api/support-alerts/${alertId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Error dismissing support alert', e);
    }
  };

  const handleOpenSupportAlertWhatsApp = (alert: SupportAlert) => {
    setSelectedProjectId(alert.projectId);
    const draft = `Olá ${alert.clientName.split(' ')[0]}! Aqui é da Marcenaria Ferraz. Recebi sua notificação no sistema BOM Projeto: "${alert.message}". Como posso te ajudar agora a respeito da sua OS ${alert.projectCode}?`;
    setWhatsappDraft(draft);
    setActiveView('whatsapp_simulator');
  };

  const handleTestSupportAlert = () => {
    const proj = currentProject || projects[0] || {
      id: 'proj-demo-1',
      code: 'OS-1042',
      clientName: 'Mariana Silva',
      clientPhone: '+55 11 98765-4321',
      title: 'Cozinha Planejada e Área Gourmet',
      status: 'production',
      progress: 65,
      currentStage: 'Acabamento e Montagem',
      deadline: '2026-10-15',
      budget: 24500,
      paidAmount: 16000,
      installments: [],
      updates: []
    } as unknown as Project;

    handleClientRequestSupport(proj, 'Cliente precisa de seu suporte');
  };

  const isFetchingProjectsRef = useRef(false);
  const hasInitialMountedRef = useRef(false);

  const fetchProjects = async (overrideEmail?: string) => {
    if (isFetchingProjectsRef.current) return;
    isFetchingProjectsRef.current = true;

    try {
      const email = (overrideEmail || currentUser?.email || '').toLowerCase().trim();
      if (!email) {
        setProjects([]);
        setSelectedProjectId('');
        setIsLoading(false);
        isFetchingProjectsRef.current = false;
        return;
      }

      // Passa workspaceId=all para carregar todos os projetos da empresa e permitir alternância de filtros
      const queryParam = `?userEmail=${encodeURIComponent(email)}&workspaceId=all`;
      const res = await fetch(`/api/projects${queryParam}`, {
        headers: { 
          'x-user-email': email,
          'x-workspace-id': 'all'
        }
      });
      if (res.ok) {
        const data: Project[] = await res.json();
        if (Array.isArray(data)) {
          setProjects(data);
          try {
            if (data.length > 0) {
              localStorage.setItem(`bomprojeto_cached_projects_${email}`, JSON.stringify(data));
            } else {
              localStorage.removeItem(`bomprojeto_cached_projects_${email}`);
              localStorage.removeItem('bomprojeto_cached_projects');
            }
          } catch {}

          const targetId = getInitialProjectIdFromUrl();
          const found = data.find(p => p.id === targetId || p.code.toLowerCase() === targetId.toLowerCase());
          if (found) {
            setSelectedProjectId(found.id);
          } else if (data.length > 0) {
            if (!data.some(p => p.id === selectedProjectId)) {
              setSelectedProjectId(data[0].id);
            }
          } else {
            setSelectedProjectId('');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
      isFetchingProjectsRef.current = false;
    }
  };

  // Synchronize Supabase Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((sbUser) => {
      if (sbUser && sbUser.email) {
        const userEmail = sbUser.email.trim().toLowerCase();
        const isOwner = userEmail === SAAS_OWNER_EMAIL.toLowerCase();

        setCurrentUser(prev => {
          // Se a conta for diferente do usuário anterior, descarta qualquer estado ou role anterior
          const isSameUser = prev?.email?.toLowerCase().trim() === userEmail;
          const assignedRole = isOwner ? 'admin' : (isSameUser && prev?.role && prev.role !== 'admin' ? prev.role : (sbUser.role || 'marcenaria'));

          const updated: UserProfile = {
            id: sbUser.id,
            name: sbUser.name || (isSameUser ? prev?.name : (isOwner ? 'Henrique Ferraz' : 'Usuário')) || 'Usuário',
            email: userEmail,
            role: assignedRole,
            teamRole: isOwner ? 'admin' : (sbUser.teamRole || 'ceo'),
            workshopName: (isSameUser && prev?.workshopName ? prev.workshopName : (sbUser.workshopName || (isOwner ? 'Gestão de Projetos Integrada' : ''))),
            projectCode: isSameUser ? prev?.projectCode : undefined,
            avatarUrl: sbUser.avatarUrl || (isSameUser ? prev?.avatarUrl : undefined),
            plan: isOwner ? 'escala' : (sbUser.plan || prev?.plan || 'free'),
            pixKey: sbUser.pixKey || (isSameUser ? prev?.pixKey : '') || '',
            pixKeyType: sbUser.pixKeyType || prev?.pixKeyType
          };
          try {
            localStorage.setItem('bomprojeto_user', JSON.stringify(updated));
            localStorage.setItem('bomprojeto_user_email', userEmail);
          } catch (e) {}

          if (isOwner) {
            setCurrentTeamRole('admin');
            try {
              localStorage.setItem('bomprojeto_current_team_role', 'admin');
            } catch {}
          }

          // Mantém a lista de membros do time pertencente exclusivamente ao usuário logado
          setTeamMembers([
            {
              id: `tm-${sbUser.id}`,
              name: updated.name,
              email: userEmail,
              role: isOwner ? 'admin' : 'ceo',
              phone: '',
              status: 'active',
              workspaceAccess: 'all',
              invitedAt: new Date().toISOString().split('T')[0]
            }
          ]);

          return updated;
        });

        // Quando o login for validado com sucesso, fecha o modal e direciona para a área correspondente
        setIsLoginModalOpen(false);
        setActiveView(prevView => {
          if (isOwner) {
            return 'admin_dashboard';
          }
          if (prevView === 'landing' || prevView === 'client_portal') {
            return 'dashboard';
          }
          return prevView;
        });

        if (isOwner) {
          showToast('Bem-vindo, Henrique Ferraz! Autenticado com sucesso como Administrador com Acesso Total.', 'success');
        }

        try {
          if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
            window.history.replaceState(null, '', isOwner ? '/#admin' : '/#painel');
          }
        } catch {}

        // Sincroniza dados do tenant imediatamente para o usuário logado
        fetchProjects(userEmail);
        fetchWorkspaces(userEmail);
        fetchSupportAlerts(userEmail);
      }
    });
    return () => unsubscribe();
  }, []);

  // Synchronize and isolate tenant data whenever user email or active workspace changes
  useEffect(() => {
    if (currentUser?.email) {
      fetchProjects(currentUser.email);
      fetchWorkspaces(currentUser.email);
      fetchSupportAlerts(currentUser.email);
    }
  }, [currentUser?.email, currentWorkspaceId]);

  // Listener para capturar bloqueios disparados pelo middleware de fetch no frontend
  useEffect(() => {
    const unsubscribe = onFrontendValidationBlocked((detail) => {
      showToast(`⚠️ Salvamento Bloqueado: ${detail.primaryError}`, 'error');
    });
    return () => unsubscribe();
  }, []);

  const currentProject = projects.find(p => p.id === selectedProjectId || p.code.toLowerCase() === selectedProjectId?.toLowerCase()) || (projects.length > 0 ? projects[0] : null);

  // Auth Handlers: Direciona para a área correspondente ao validar o login
  const handleLoginSuccess = (user: UserProfile, _redirectView?: ActiveView) => {
    const isOwner = (user.email || '').trim().toLowerCase() === SAAS_OWNER_EMAIL.toLowerCase();
    const effectiveUser: UserProfile = isOwner ? {
      ...user,
      role: 'admin',
      teamRole: 'admin',
      plan: 'escala',
      workshopName: user.workshopName || 'Gestão de Projetos Integrada'
    } : user;

    if (isOwner || effectiveUser.role === 'admin') {
      setCurrentTeamRole('admin');
      try {
        localStorage.setItem('bomprojeto_current_team_role', 'admin');
      } catch {}
    }

    setCurrentUser(effectiveUser);
    try {
      localStorage.setItem('bomprojeto_user', JSON.stringify(effectiveUser));
      localStorage.setItem('bomprojeto_user_email', effectiveUser.email);
      window.history.pushState(null, '', isOwner ? '/#admin' : '/#painel');
    } catch (e) {
      console.error(e);
    }
    // Redireciona imediatamente para Área de Admin (se Administrador) ou Dashboard
    setActiveView(isOwner ? 'admin_dashboard' : 'dashboard');
    setIsLoginModalOpen(false);
    showToast(isOwner 
      ? `Bem-vindo, ${effectiveUser.name}! Autenticado com sucesso na sua Área de Administrador.`
      : `Bem-vindo ao Dashboard, ${effectiveUser.name}!`, 'success');

    if (effectiveUser.email) {
      fetchProjects(effectiveUser.email);
      fetchWorkspaces(effectiveUser.email);
      fetchSupportAlerts(effectiveUser.email);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutSupabase();
    } catch (e) {
      console.warn('Supabase logout notice:', e);
    }
    setCurrentUser(null);
    setProjects([]);
    setSupportAlerts([]);
    setSelectedProjectId('');
    try {
      const email = currentUser?.email?.toLowerCase().trim();
      localStorage.removeItem('bomprojeto_user');
      localStorage.removeItem('bomprojeto_user_email');
      localStorage.removeItem('bomprojeto_cached_projects');
      if (email) {
        localStorage.removeItem(`bomprojeto_cached_projects_${email}`);
      }
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    showToast('Você saiu da sua conta com segurança.', 'info');
    setActiveView('landing');
  };

  // Handler: Select a project and switch to detail view
  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveView('project_detail');
  };

  // Handler: Create new project
  const handleCreateProject = async (data: {
    clientName: string;
    clientPhone: string;
    title: string;
    category: Project['category'];
    totalValue: number;
    deliveryDate: string;
    workspaceId?: string;
    workspaceName?: string;
    billingData?: any;
    templateId?: string;
    industrySector?: string;
    stages?: any[];
  }) => {
    try {
      const userEmail = (currentUser?.email || '').toLowerCase().trim();
      if (!userEmail) {
        showToast('É necessário estar autenticado para criar um projeto.', 'error');
        return;
      }

      const payload = {
        ...data,
        ownerEmail: userEmail,
        userId: currentUser?.id || '',
        templateId: data.templateId || activeSectorTemplate?.id,
        industrySector: data.industrySector || activeSectorTemplate?.sector_key,
        stages: data.stages || (activeSectorTemplate?.stages?.map((stg: any, idx: number) => ({
          id: `s-${idx + 1}-${Date.now().toString().slice(-4)}`,
          name: stg.stage_name || stg.name,
          description: stg.objective || stg.description || '',
          status: idx === 0 ? 'completed' : idx === 1 ? 'current' : 'upcoming',
          date: idx === 0 ? new Date().toLocaleDateString('pt-BR') : undefined,
          detail: idx === 1 ? 'Em andamento' : undefined,
          whatsapp_template: stg.whatsapp_template,
          ai_context_instruction: stg.ai_context_instruction,
          action_type: stg.action_type
        })))
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
          'x-workspace-id': data.workspaceId || currentWorkspaceId || 'ws-matriz'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newProj = await res.json();
        setProjects(prev => {
          const next = [newProj, ...prev.filter(p => p.id !== newProj.id)];
          try {
            localStorage.setItem(`bomprojeto_cached_projects_${userEmail}`, JSON.stringify(next));
          } catch {}
          return next;
        });
        setSelectedProjectId(newProj.id);
        setIsNewProjectOpen(false);
        setActiveView('project_detail');
        showToast(`Ordem de Serviço ${newProj.code} criada com sucesso!`, 'success');
        fetchWorkspaces();
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || 'Erro ao criar projeto no servidor.';
        showToast(`⚠️ ${msg}`, 'error');
        throw new Error(msg);
      }
    } catch (err: any) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  // Handler: Advance stage
  const handleAdvanceStage = async (projectId: string) => {
    try {
      const authorName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Equipe Técnica';
      const authorRole = currentUser?.teamRole || (currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'marcenaria' ? 'Marceneiro / Oficina' : 'Gestor de Projetos');

      const res = await fetch(`/api/projects/${projectId}/advance-stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': authorName,
          'x-user-role': authorRole,
          'x-user-email': currentUser?.email || ''
        },
        body: JSON.stringify({
          author: authorName,
          role: authorRole
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
        showToast(`Etapa avançada por ${authorName}: ${updated.currentStage}`, 'success');
      }
    } catch (err) {
      console.error('Error advancing stage:', err);
    }
  };

  // Handler: Regress stage (Rollback)
  const handleRegressStage = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/regress-stage`, {
        method: 'POST'
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
        showToast(`Etapa retrocedida para: ${updated.currentStage}`, 'info');
      }
    } catch (err) {
      console.error('Error regressing stage:', err);
    }
  };

  // Handler: Complete project formally
  const handleCompleteProject = async (projectId: string) => {
    try {
      const authorName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Responsável Técnico';
      const authorRole = currentUser?.teamRole || (currentUser?.role === 'admin' ? 'Administrador' : 'Gestor do Projeto');

      const res = await fetch(`/api/projects/${projectId}/complete-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': authorName,
          'x-user-role': authorRole,
          'x-user-email': currentUser?.email || ''
        },
        body: JSON.stringify({
          author: authorName,
          role: authorRole
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
        showToast(`🎉 Projeto ${updated.code} formalmente concluído por ${authorName} com termo de garantia ativado!`, 'success');
      }
    } catch (err) {
      console.error('Error completing project:', err);
    }
  };

  // Handler: Move project to exclusion tab (Soft Delete for CEO and Admin)
  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': currentUser?.email || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.project || {
          id: projectId,
          status: 'excluido',
          isDeleted: true
        };
        setProjects(prev => prev.map(p => p.id === projectId ? {
          ...p,
          ...updated,
          status: 'excluido',
          isDeleted: true,
          deletedAt: updated.deletedAt || new Date().toISOString(),
          deletedBy: currentUser?.email || 'Administrador'
        } : p));
        showToast('Projeto movido para a Aba de Exclusão com sucesso!', 'success');
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao excluir projeto', 'info');
        return false;
      }
    } catch (e) {
      console.error('Error deleting project:', e);
      showToast('Erro de conexão ao excluir projeto', 'info');
      return false;
    }
  };

  // Handler: Restore project from exclusion tab
  const handleRestoreProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/restore`, {
        method: 'POST',
        headers: {
          'x-user-email': currentUser?.email || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        const restored = data.project;
        setProjects(prev => prev.map(p => p.id === projectId ? (restored ? { ...p, ...restored, isDeleted: false } : {
          ...p,
          status: p.previousStatus || 'em_andamento',
          isDeleted: false
        }) : p));
        showToast('Projeto restaurado com sucesso!', 'success');
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao restaurar projeto', 'info');
        return false;
      }
    } catch (e) {
      console.error('Error restoring project:', e);
      showToast('Erro de conexão ao restaurar projeto', 'info');
      return false;
    }
  };

  // Handler: Update project budget
  const handleUpdateBudget = async (projectId: string, totalValue: number, installments?: any[]) => {
    const valCheck = validateFinancialValue(totalValue, 'Valor Total do Orçamento', { min: 1, allowZero: false });
    if (!valCheck.isValid) {
      showToast(`⚠️ Salvamento Bloqueado: ${valCheck.error}`, 'error');
      return;
    }
    if (installments && Array.isArray(installments)) {
      const instCheck = validateInstallmentsArray(installments, valCheck.cleanValue!);
      if (!instCheck.isValid) {
        showToast(`⚠️ Salvamento Bloqueado: ${instCheck.error}`, 'error');
        return;
      }
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalValue: valCheck.cleanValue!, installments })
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
        showToast('Orçamento e cronograma de parcelas atualizados com sucesso!', 'success');
      } else {
        const err = await res.json();
        showToast(`⚠️ ${err.error || 'Erro ao atualizar orçamento'}`, 'info');
      }
    } catch (err) {
      console.error('Error updating budget:', err);
      showToast('Erro de conexão ao atualizar orçamento', 'info');
    }
  };

  // Handler: Open tailored Pix charge modal
  const handleChargePixWhatsapp = (project: Project, installmentOrNum: any) => {
    let inst: Installment | null = typeof installmentOrNum === 'object' && installmentOrNum !== null ? installmentOrNum : null;
    if (!inst && typeof installmentOrNum === 'number') {
      inst = project.installments.find(i => i.number === installmentOrNum) || project.installments[1] || project.installments[0];
    }
    if (!inst) {
      inst = project.installments[1] || project.installments[0];
    }
    setSelectedProjectId(project.id);
    setChargingData({ project, installment: inst });
  };

  // Handler: Toggle Installment
  const handleToggleInstallment = async (projectId: string, installmentNumber: number) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/pay-installment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentNumber })
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
        showToast(`Parcela #${installmentNumber} atualizada com sucesso!`, 'success');
      }
    } catch (err) {
      console.error('Error toggling installment:', err);
    }
  };

  // Handler: Update Client-specific Pix Key & QR Code
  const handleUpdateProjectPixKey = async (projectId: string, pixKey: string, pixQrCode?: string) => {
    try {
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            pixKey,
            installments: p.installments.map(i => ({
              ...i,
              pixQrCode: pixQrCode || i.pixQrCode
            }))
          };
        }
        return p;
      }));

      const res = await fetch(`/api/projects/${projectId}/pix`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || '',
          'x-workspace-id': currentWorkspaceId || 'ws-matriz'
        },
        body: JSON.stringify({ pixKey, pixQrCode })
      });

      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
        showToast('Chave Pix deste cliente salva com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Error updating project pix key:', err);
    }
  };

  // Handler: Update Project Data & Status
  const handleUpdateProject = async (projectId: string, data: Partial<Project>) => {
    // Validação estrita no frontend antes do envio de fetch
    if (data.deliveryDate !== undefined) {
      const dateCheck = validateDateFormat(data.deliveryDate, 'Prazo Previsto de Entrega', true);
      if (!dateCheck.isValid) {
        showToast(`⚠️ Salvamento Bloqueado: ${dateCheck.error}`, 'error');
        return;
      }
      data.deliveryDate = dateCheck.cleanValue;
    }

    if (data.totalValue !== undefined) {
      const valCheck = validateFinancialValue(data.totalValue, 'Valor Total do Projeto', { min: 1, allowZero: false });
      if (!valCheck.isValid) {
        showToast(`⚠️ Salvamento Bloqueado: ${valCheck.error}`, 'error');
        return;
      }
      data.totalValue = valCheck.cleanValue;
    }

    if (data.installments && Array.isArray(data.installments)) {
      const expTotal = typeof data.totalValue === 'number' ? data.totalValue : undefined;
      const instCheck = validateInstallmentsArray(data.installments, expTotal);
      if (!instCheck.isValid) {
        showToast(`⚠️ Salvamento Bloqueado: ${instCheck.error}`, 'error');
        return;
      }
    }

    try {
      // Optimistic update in frontend state immediately
      setProjects(prev => prev.map(p => {
        if (p.id === projectId || p.code === projectId) {
          return { ...p, ...data };
        }
        return p;
      }));

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || '',
          'x-workspace-id': currentWorkspaceId || 'ws-matriz'
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => (p.id === projectId || p.code === projectId) ? updated : p));
        showToast('Dados e status do projeto atualizados com sucesso!', 'success');
      } else {
        const err = await res.json();
        showToast(`⚠️ ${err.error || 'Erro ao salvar alterações no servidor'}`, 'info');
        fetchProjects(); // Reverte optimistic update
      }
    } catch (err) {
      console.error('Error updating project:', err);
      showToast('Erro de conexão ao salvar projeto', 'info');
      fetchProjects();
    }
  };

  // Handler: Add Workshop Update
  const handleAddUpdate = async (
    projectId: string,
    data: {
      message: string;
      stageId: string;
      stageName: string;
      photos: Array<{ title: string; url: string; caption?: string }>;
      notifyWhatsapp: boolean;
      actionType?: 'keep' | 'set_current' | 'advance';
      author?: string;
      role?: string;
    }
  ) => {
    try {
      const authorName = data.author || currentUser?.name || currentUser?.email?.split('@')[0] || 'Equipe Técnica';
      const authorRole = data.role || currentUser?.teamRole || (currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'marcenaria' ? 'Marceneiro / Oficina' : 'Gestor de Projetos');

      const res = await fetch(`/api/projects/${projectId}/updates`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-name': authorName,
          'x-user-role': authorRole,
          'x-user-email': currentUser?.email || ''
        },
        body: JSON.stringify({
          ...data,
          author: authorName,
          role: authorRole
        })
      });
      if (res.ok) {
        const { project: updatedProj } = await res.json();
        setProjects(prev => prev.map(p => p.id === projectId ? updatedProj : p));
        showToast(`Registro de atualização publicado por ${authorName}!`, 'success');
      }
    } catch (err) {
      console.error('Error adding update:', err);
    }
  };

  // Handler: Delete Workshop Update
  const handleDeleteUpdate = async (projectId: string, updateId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/updates/${updateId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const { project: updatedProj } = await res.json();
        setProjects(prev => prev.map(p => p.id === projectId ? updatedProj : p));
        showToast('Registro de atualização removido com sucesso!', 'info');
      }
    } catch (err) {
      console.error('Error deleting update:', err);
    }
  };

  // Handler: Send reaction from client portal
  const handleSendReaction = async (emoji: string, text: string) => {
    if (!currentProject) return;
    try {
      await fetch(`/api/projects/${currentProject.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, text })
      });
      fetchProjects();
      showToast(`Reação "${emoji}" enviada para a oficina!`, 'success');
    } catch (err) {
      console.error('Error sending reaction:', err);
    }
  };

  // Handler: Send AI alert message via WhatsApp
  const handleSendAiAlert = async (projectId: string, message: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          stageName: 'Produção em Andamento',
          notifyWhatsapp: true,
          photos: []
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          setProjects(prev => prev.map(p => p.id === projectId ? data.project : p));
        } else {
          fetchProjects();
        }
        showToast('Boletim inteligente disparado para o WhatsApp do cliente!', 'success');
      } else {
        showToast('Boletim registrado no sistema.', 'info');
      }
    } catch (err) {
      console.error('Error sending AI alert:', err);
      showToast('Erro ao disparar boletim. Tente via link direto.', 'info');
    }
  };

  const isTraditionalDashboard = activeView === 'dashboard' || activeView === 'admin_dashboard' || activeView === 'projects_finance' || activeView === 'ai_settings' || activeView === 'project_detail' || activeView === 'whatsapp_simulator' || activeView === 'retencao_pro';
  const isFounder = isSaasOwner(currentUser);

  return (
    <div className="min-h-screen bg-[#fcf9f5] text-[#1c1c1a] antialiased">
      
      {/* Floating Feedback Toast Notification */}
      {toastMessage && (
        <div 
          id="app-toast-feedback"
          className={`fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-sm border ${
            toastMessage.type === 'error'
              ? 'bg-[#7f1d1d] border-rose-500/40'
              : toastMessage.type === 'warning'
              ? 'bg-[#78350f] border-amber-500/40'
              : toastMessage.type === 'info'
              ? 'bg-[#1e293b] border-blue-500/30'
              : 'bg-[#1c1c1a] border-emerald-500/30'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
          ) : toastMessage.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
          ) : toastMessage.type === 'info' ? (
            <Info className="w-5 h-5 text-blue-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <p className="text-xs font-medium text-white/95 leading-tight">{toastMessage.text}</p>
          <button
            id="toast-close-btn"
            onClick={() => setToastMessage(null)}
            className="group p-1.5 rounded-lg bg-white/0 hover:bg-white/10 active:bg-white/20 transition-all duration-200 cursor-pointer shrink-0"
            title="Fechar notificação"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4 text-white/50 group-hover:text-white opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" />
          </button>
        </div>
      )}

      {/* Dedicated Legal Pages with own link */}
      {activeView === 'terms' || activeView === 'privacy' ? (
        <LegalPageView
          pageType={activeView}
          onSelectView={navigateToView}
          onOpenLoginModal={handleOpenLogin}
        />
      ) : isTraditionalDashboard ? (
        <div className="min-h-screen flex bg-[#F8F9FA]">
          
          {/* Desktop Sidebar */}
          <Sidebar
            currentView={activeView}
            onSelectView={(v) => {
              navigateToView(v);
              setIsMobileSidebarOpen(false);
            }}
            currentUser={currentUser}
            selectedProjectCode={currentProject?.code}
            onOpenNewProject={() => setIsNewProjectOpen(true)}
            onOpenLoginModal={handleOpenLogin}
            activeSidebarItem={activeSidebarTab}
            onSelectSidebarItem={handleSidebarItemClick}
            currentWorkspace={currentWorkspace}
            workspaces={workspaces}
            onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
            plan={subscriptionPlan}
            onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
            onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
            whatsappConnected={aiSettings.whatsappConnected}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebarCollapse}
            currentRole={currentTeamRole}
            onOpenTeamSettings={() => {
              if (!canManageTeam(currentTeamRole, currentUser?.email)) {
                showToast('Modo Time e gestão de equipe restritos ao Administrador e CEO.', 'info');
                return;
              }
              setSettingsModalTab('team');
              setIsSettingsModalOpen(true);
            }}
            teamMembersCount={teamMembers.length}
            onOpenSectorOnboarding={() => {
              setSettingsModalTab('nichos');
              setIsSettingsModalOpen(true);
            }}
          />

          {/* Mobile Sidebar Backdrop & Drawer */}
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-xs"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              <div className="relative z-10 w-72 h-full bg-[#f6f3ed] shadow-2xl">
                <Sidebar
                  currentView={activeView}
                  onSelectView={(v) => {
                    navigateToView(v);
                    setIsMobileSidebarOpen(false);
                  }}
                  currentUser={currentUser}
                  selectedProjectCode={currentProject?.code}
                  onOpenNewProject={() => {
                    setIsNewProjectOpen(true);
                    setIsMobileSidebarOpen(false);
                  }}
                  onOpenLoginModal={() => {
                    handleOpenLogin();
                    setIsMobileSidebarOpen(false);
                  }}
                  activeSidebarItem={activeSidebarTab}
                  onSelectSidebarItem={(item) => {
                    handleSidebarItemClick(item);
                    setIsMobileSidebarOpen(false);
                  }}
                  currentWorkspace={currentWorkspace}
                  workspaces={workspaces}
                  onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
                  plan={subscriptionPlan}
                  onOpenSubscriptionModal={() => {
                    setIsSubscriptionModalOpen(true);
                    setIsMobileSidebarOpen(false);
                  }}
                  onOpenWhatsAppModal={() => {
                    setIsWhatsAppModalOpen(true);
                    setIsMobileSidebarOpen(false);
                  }}
                  whatsappConnected={aiSettings.whatsappConnected}
                  isMobile={true}
                  onCloseMobile={() => setIsMobileSidebarOpen(false)}
                  currentRole={currentTeamRole}
                  onOpenTeamSettings={() => {
                    setIsMobileSidebarOpen(false);
                    if (!canManageTeam(currentTeamRole, currentUser?.email)) {
                      showToast('Modo Time e gestão de equipe restritos ao Administrador e CEO.', 'info');
                      return;
                    }
                    setSettingsModalTab('team');
                    setIsSettingsModalOpen(true);
                  }}
                  teamMembersCount={teamMembers.length}
                  onOpenSectorOnboarding={() => {
                    setIsMobileSidebarOpen(false);
                    setSettingsModalTab('nichos');
                    setIsSettingsModalOpen(true);
                  }}
                />
              </div>
            </div>
          )}

          {/* Main Area: TopHeader + Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Urgent Support Alert Banner (Alerta Visual na Tela do Bom Projeto) */}
            {aiSettings.visualAlertBannerEnabled !== false && supportAlerts.length > 0 && (
              <SupportAlertBanner
                alert={supportAlerts[0]}
                onOpenWhatsApp={handleOpenSupportAlertWhatsApp}
                onOpenProject={(projId) => {
                  handleSelectProject(projId);
                  setActiveView('project_detail');
                }}
                onDismiss={handleDismissSupportAlert}
              />
            )}

            <TopHeader
              onOpenNewProject={() => setIsNewProjectOpen(true)}
              onOpenLoginModal={handleOpenLogin}
              currentUser={currentUser}
              onLogout={handleLogout}
              searchQuery={globalSearch}
              onSearchChange={setGlobalSearch}
              onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebarCollapse={handleToggleSidebarCollapse}
              supportAlerts={supportAlerts}
              onOpenSupportAlertWhatsApp={handleOpenSupportAlertWhatsApp}
              onOpenSupportAlertProject={(projId) => {
                handleSelectProject(projId);
                setActiveView('project_detail');
              }}
              whatsappConnected={aiSettings.whatsappConnected}
              onOpenAiSettings={() => setActiveView('ai_settings')}
              onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
              workspaces={workspaces}
              currentWorkspace={currentWorkspace}
              onSelectWorkspace={handleSelectWorkspace}
              onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
              plan={subscriptionPlan}
              onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
              onOpenAdminDashboard={isFounder ? () => setActiveView('admin_dashboard') : undefined}
              currentRole={currentTeamRole}
              onRoleChange={handleRoleChange}
              onOpenSectorOnboarding={() => {
                setSettingsModalTab('nichos');
                setIsSettingsModalOpen(true);
              }}
              onOpenTeamSettings={() => {
                if (!canManageTeam(currentTeamRole)) {
                  showToast('Modo Time e gestão de equipe restritos ao CEO.', 'info');
                  return;
                }
                setSettingsModalTab('team');
                setIsSettingsModalOpen(true);
              }}
            />

            <main className="flex-1 p-3.5 sm:p-5 lg:p-7 max-w-7xl w-full mx-auto pb-24 md:pb-10 min-w-0">
              {activeView === 'admin_dashboard' && (
                isFounder ? (
                  <AdminDashboardView
                    projects={projects.filter(p => 
                      !globalSearch || 
                      p.clientName.toLowerCase().includes(globalSearch.toLowerCase()) || 
                      p.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
                      p.code.toLowerCase().includes(globalSearch.toLowerCase())
                    )}
                    workspaces={workspaces}
                    currentWorkspace={currentWorkspace}
                    currentUser={currentUser}
                    onSelectProject={handleSelectProject}
                    onOpenNewProject={() => setIsNewProjectOpen(true)}
                    onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
                    onResetData={handleResetData}
                  />
                ) : (
                  <div className="bg-white rounded-3xl border border-[#e8e4dc] p-8 max-w-lg mx-auto my-12 text-center space-y-4 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="font-headline font-bold text-lg text-[#111111]">
                      Ambiente Restrito do Fundador
                    </h3>
                    <p className="text-xs text-[#52524e] leading-relaxed">
                      Este ambiente de gerenciamento de dados do SaaS é exclusivo para <strong>{SAAS_OWNER_EMAIL}</strong>.
                    </p>
                    <button
                      onClick={() => setActiveView('dashboard')}
                      className="px-5 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-[#222222] transition-colors cursor-pointer"
                    >
                      Voltar ao Painel da Oficina
                    </button>
                  </div>
                )
              )}

              {activeView === 'dashboard' && (
                <DashboardView
                  projects={projects.filter(p => 
                    !globalSearch || 
                    p.clientName.toLowerCase().includes(globalSearch.toLowerCase()) || 
                    p.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
                    p.code.toLowerCase().includes(globalSearch.toLowerCase())
                  )}
                  onSelectProject={handleSelectProject}
                  onSelectView={setActiveView}
                  onOpenNewProject={() => setIsNewProjectOpen(true)}
                  onQuickAiAlert={(proj) => setAiAlertProject(proj)}
                  onChargePixWhatsapp={handleChargePixWhatsapp}
                  supportAlerts={supportAlerts}
                  onOpenSupportAlertWhatsApp={handleOpenSupportAlertWhatsApp}
                  currentWorkspace={currentWorkspace}
                  workspaces={workspaces}
                  onSelectWorkspace={handleSelectWorkspace}
                  onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
                  currentRole={currentTeamRole}
                  onAdvanceStage={handleAdvanceStage}
                  onRegressStage={handleRegressStage}
                  onDeleteProject={handleDeleteProject}
                  onRestoreProject={handleRestoreProject}
                />
              )}

              {activeView === 'projects_finance' && (
                <ProjectsAndFinanceView
                  projects={projects.filter(p => 
                    !globalSearch || 
                    p.clientName.toLowerCase().includes(globalSearch.toLowerCase()) || 
                    p.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
                    p.code.toLowerCase().includes(globalSearch.toLowerCase())
                  )}
                  onSelectProject={handleSelectProject}
                  onSelectView={setActiveView}
                  onOpenNewProject={() => setIsNewProjectOpen(true)}
                  onQuickAiAlert={(proj) => setAiAlertProject(proj)}
                  onChargePixWhatsapp={handleChargePixWhatsapp}
                  onOpenBudgetModal={(proj) => {
                    handleSelectProject(proj.id);
                    setActiveView('project_detail');
                  }}
                  onOpenReceiptModal={(proj) => {
                    handleSelectProject(proj.id);
                    setActiveView('client_portal');
                  }}
                  currentRole={currentTeamRole}
                  onAdvanceStage={handleAdvanceStage}
                  onRegressStage={handleRegressStage}
                  onDeleteProject={handleDeleteProject}
                  onRestoreProject={handleRestoreProject}
                />
              )}

              {activeView === 'ai_settings' && (
                <AiCustomerServiceView
                  settings={aiSettings}
                  onSaveSettings={handleSaveAiSettings}
                  projects={projects}
                  plan={subscriptionPlan}
                  userEmail={currentUser?.email}
                  onUpgradePlan={() => setIsSubscriptionModalOpen(true)}
                  onOpenWhatsappSimulator={() => {
                    if (currentProject) {
                      setWhatsappDraft(`Olá ${currentProject.clientName.split(' ')[0]}! Aqui é da Marcenaria Ferraz. Como posso te ajudar hoje com a sua OS ${currentProject.code}?`);
                      setActiveView('whatsapp_simulator');
                    }
                  }}
                  onTestClientSupportAlert={handleTestSupportAlert}
                />
              )}

              {activeView === 'project_detail' && currentProject && (
                <ProjectDetailView
                  project={currentProject}
                  onBackToDashboard={() => setActiveView('dashboard')}
                  onSelectView={setActiveView}
                  onAdvanceStage={handleAdvanceStage}
                  onRegressStage={handleRegressStage}
                  onCompleteProject={handleCompleteProject}
                  onUpdateBudget={handleUpdateBudget}
                  onChargePixWhatsapp={handleChargePixWhatsapp}
                  onToggleInstallment={handleToggleInstallment}
                  onOpenAiNotificationDrawer={(p) => setAiAlertProject(p)}
                  onAddUpdate={handleAddUpdate}
                  onDeleteUpdate={handleDeleteUpdate}
                  onUpdateProjectPixKey={handleUpdateProjectPixKey}
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
                  onRestoreProject={handleRestoreProject}
                  currentRole={currentTeamRole}
                  currentUser={currentUser}
                  showToast={showToast}
                />
              )}

              {activeView === 'whatsapp_simulator' && currentProject && (
                <WhatsAppSimulatorModal
                  project={currentProject}
                  initialDraft={whatsappDraft}
                  onClose={() => {
                    setWhatsappDraft('');
                    setActiveView('project_detail');
                  }}
                  onSelectView={setActiveView}
                />
              )}

              {activeView === 'retencao_pro' && (
                <RetencaoProDashboard
                  projects={projects}
                  activeProjectId={selectedProjectId || projects[0]?.id}
                  supportAlerts={supportAlerts}
                  onSelectProject={(projId) => {
                    setSelectedProjectId(projId);
                  }}
                  onSelectView={navigateToView}
                  onOpenProjectDetail={(p) => {
                    setSelectedProjectId(p.id);
                    setActiveView('project_detail');
                  }}
                />
              )}
            </main>

            {/* Mobile Bottom Navigation Bar for Dashboard / Management */}
            <MobileBottomNav
              currentView={activeView}
              onSelectView={setActiveView}
              onOpenNewProject={() => setIsNewProjectOpen(true)}
              onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
              supportAlerts={supportAlerts}
              whatsappConnected={aiSettings.whatsappConnected}
            />
          </div>

        </div>
      ) : (
        /* Non-dashboard views (Landing Page / Client Portal) */
        <div className="min-h-screen flex flex-col">
          <Navbar
            currentView={activeView}
            onSelectView={navigateToView}
            onOpenNewProjectModal={() => setIsNewProjectOpen(true)}
            onOpenLoginModal={handleOpenLogin}
            currentUser={currentUser}
            onLogout={handleLogout}
            activeProjectCode={currentProject?.code || '#FER-204'}
            onOpenVideoModal={() => setIsVideoModalOpen(true)}
          />

          <main className="flex-1">
            {activeView === 'landing' && (
              <LandingPage 
                onSelectView={navigateToView} 
                onOpenLoginModal={handleOpenLogin}
                onOpenVideoModal={() => setIsVideoModalOpen(true)}
              />
            )}

            {activeView === 'client_portal' && (
              currentProject ? (
                <ClientPortalView
                  project={currentProject}
                  onSelectView={navigateToView}
                  onSendReaction={handleSendReaction}
                  onRequestSupport={handleClientRequestSupport}
                  clientSupportButtonEnabled={aiSettings.clientSupportButtonEnabled !== false}
                  allowPortalReactions={aiSettings.allowPortalReactions !== false}
                  showWarrantyCertificate={aiSettings.showWarrantyCertificate !== false}
                  showWorkshopFooterSignature={subscriptionPlan === 'free' ? true : (aiSettings.showWorkshopFooterSignature !== false)}
                />
              ) : isLoading ? (
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="w-10 h-10 border-3 border-[#EA580C] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-[#5F6368] font-medium">Carregando portal de acompanhamento...</p>
                </div>
              ) : (
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#EA580C] flex items-center justify-center mx-auto text-2xl font-bold">
                    📋
                  </div>
                  <h2 className="text-xl font-bold text-[#202124]">Projeto não localizado</h2>
                  <p className="text-sm text-[#5F6368]">
                    O link de acompanhamento pode ter expirado ou a ordem de serviço foi atualizada pela empresa responsável.
                  </p>
                  <button
                    onClick={() => navigateToView('landing')}
                    className="px-5 py-2.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
                  >
                    Voltar ao Início
                  </button>
                </div>
              )
            )}
          </main>
        </div>
      )}

      {/* Login / Authentication Modal */}
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          onSelectView={navigateToView}
          onOpenVideoModal={() => {
            setIsLoginModalOpen(false);
            setIsVideoModalOpen(true);
          }}
        />
      )}

      {/* Video Explainer / Demonstrative Modal */}
      {isVideoModalOpen && (
        <VideoExplainerModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          onOpenSignup={() => {
            setIsVideoModalOpen(false);
            handleOpenLogin();
          }}
        />
      )}

      {/* New Project Modal */}
      {isNewProjectOpen && (
        <NewProjectModal
          isOpen={isNewProjectOpen}
          onClose={() => setIsNewProjectOpen(false)}
          onCreateProject={handleCreateProject}
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          plan={subscriptionPlan}
          onUpgradePlan={() => setIsSubscriptionModalOpen(true)}
          currentRole={currentTeamRole}
          activeSectorTemplate={activeSectorTemplate}
        />
      )}

      {/* AI Alert & WhatsApp Drawer Modal */}
      {aiAlertProject && (
        <AiNotificationDrawer
          project={aiAlertProject}
          onClose={() => setAiAlertProject(null)}
          onSendWhatsapp={handleSendAiAlert}
        />
      )}

      {/* Pix Charge WhatsApp Modal */}
      {chargingData && (
        <PixChargeModal
          project={chargingData.project}
          installment={chargingData.installment}
          onClose={() => setChargingData(null)}
          onChargeSuccess={(p, instNum) => {
            fetchProjects();
            showToast(`Lembrete de cobrança da parcela #${instNum} enviado com sucesso!`, 'success');
          }}
          onUpdateProjectPixKey={handleUpdateProjectPixKey}
        />
      )}

      {/* Company Settings Modal */}
      {isSettingsModalOpen && (
        <CompanySettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentUser={currentUser}
          onSaveSettings={handleSaveCompanySettings}
          onResetData={handleResetData}
          initialTab={settingsModalTab}
          plan={subscriptionPlan}
          workspaces={workspaces}
          teamMembers={teamMembers}
          currentRole={currentTeamRole}
          onRoleChange={handleRoleChange}
          onInviteMember={handleInviteTeamMember}
          onUpdateMemberRole={handleUpdateMemberRole}
          onRemoveMember={handleRemoveMember}
          onResendInvite={handleResendInvite}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
          activeSectorTemplate={activeSectorTemplate}
          onTemplateSelected={(tmpl: any) => {
            setActiveSectorTemplate(tmpl);
            try {
              localStorage.setItem('bomprojeto_active_sector_template', JSON.stringify(tmpl));
            } catch {}
            const label = tmpl.sector_label || tmpl.niche_name || tmpl.company_name || tmpl.sector_key || 'Personalizado';
            showToast(`Nicho "${label}" ativado com sucesso!`, 'success');
          }}
        />
      )}

      {/* Clients Directory Modal */}
      {isClientsModalOpen && (
        <ClientsDirectoryModal
          isOpen={isClientsModalOpen}
          onClose={() => setIsClientsModalOpen(false)}
          projects={projects}
          onSelectProject={handleSelectProject}
          onSelectView={setActiveView}
        />
      )}

      {/* Workspace Management Modal */}
      {isWorkspaceModalOpen && (
        <WorkspaceModal
          isOpen={isWorkspaceModalOpen}
          onClose={() => setIsWorkspaceModalOpen(false)}
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onSelectWorkspace={handleSelectWorkspace}
          onCreateWorkspace={handleCreateWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
          plan={subscriptionPlan}
          userEmail={currentUser?.email}
          onChangePlan={handleChangePlan}
          onOpenSubscriptionModal={() => {
            setIsWorkspaceModalOpen(false);
            setIsSubscriptionModalOpen(true);
          }}
        />
      )}

      {/* WhatsApp Connection Modal */}
      {isWhatsAppModalOpen && (
        <WhatsAppConnectionModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          isConnected={aiSettings.whatsappConnected}
          phoneNumber={aiSettings.whatsappPhone}
          workspaceId={currentWorkspaceId}
          workspaceName={currentWorkspace?.name}
          onUpdateConnection={(connected, phone) => {
            const updated = {
              ...aiSettings,
              whatsappConnected: connected,
              whatsappPhone: connected ? phone : ''
            };
            setAiSettings(updated);
            handleSaveAiSettings(updated);
          }}
        />
      )}

      {/* Subscription Plan Modal */}
      {isSubscriptionModalOpen && (
        <SubscriptionModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
          currentPlan={subscriptionPlan}
          onChangePlan={handleChangePlan}
          activeProjectsCount={projects.filter(p => p.status !== 'concluido').length}
          workspacesCount={workspaces.length}
          userEmail={currentUser?.email}
        />
      )}

    </div>
  );
}
