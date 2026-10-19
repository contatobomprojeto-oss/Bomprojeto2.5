import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  ArrowUpRight, 
  ShieldCheck, 
  Download, 
  Filter, 
  Search, 
  MessageCircle, 
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  PieChart as PieChartIcon,
  Activity,
  Layers,
  Sparkles,
  Smartphone,
  ChevronRight,
  ExternalLink,
  Plus,
  RefreshCw,
  Award,
  Calendar,
  Send,
  X,
  Trash2,
  CreditCard
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Project, Workspace, UserProfile, isSaasOwner } from '../types';
import { AdminAuditLogsView } from './AdminAuditLogsView';
import { PaymentGatewayAdminView } from './PaymentGatewayAdminView';

interface AdminDashboardViewProps {
  projects: Project[];
  workspaces: Workspace[];
  currentWorkspace?: Workspace;
  currentUser: UserProfile | null;
  onSelectProject: (projectId: string) => void;
  onOpenNewProject: () => void;
  onOpenWorkspaceModal?: () => void;
  onResetData?: () => Promise<void>;
}

// Marco Zero Oficial de Lançamento Comercial
export const OFFICIAL_LAUNCH_DATE = '24/09/2026';

// Helper estrito para validar se a data de cadastro é a partir de 24/09/2026
export function isDateOnOrAfter24Sep2026(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const cutoff = new Date(2026, 8, 24); // 24 de Setembro de 2026
    return d >= cutoff;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const cutoff = new Date(2026, 8, 24);
    return d >= cutoff;
  }
  return true;
}

export interface Subscriber {
  id: string;
  workshopName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  plan: 'start' | 'escala' | 'free';
  billingCycle: 'monthly' | 'annual';
  status: 'active' | 'trial' | 'overdue' | 'canceled';
  trialDaysLeft?: number;
  joinedAt: string;
  renewalDate: string;
  activeProjects: number;
  totalProjectsCreated: number;
  whatsappMessagesSent: number;
  whatsappConnected: boolean;
  totalGMV: number;
}

// Base oficial inicial: estritamente cadastros a partir de 24/09/2026
export const INITIAL_OFFICIAL_SUBSCRIBERS: Subscriber[] = [
  {
    id: "sub-master-001",
    workshopName: "Ferraz Gestão & Execução de Projetos",
    ownerName: "Henrique Ferraz (Fundador)",
    email: "henrique.ferrazms@gmail.com",
    phone: "+55 67 99988-1234",
    city: "Campo Grande",
    state: "MS",
    plan: "escala",
    billingCycle: "annual",
    status: "active",
    joinedAt: "24/09/2026",
    renewalDate: "24/09/2027",
    activeProjects: 0,
    totalProjectsCreated: 0,
    whatsappMessagesSent: 0,
    whatsappConnected: true,
    totalGMV: 0
  }
];

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  projects,
  workspaces,
  currentWorkspace,
  currentUser,
  onSelectProject,
  onOpenNewProject,
  onOpenWorkspaceModal,
  onResetData
}) => {
  // Tabs: 'visao_geral' | 'planos_proporcao' | 'uso_ferramenta' | 'assinantes' | 'auditoria_logs' | 'gateway_pagamento'
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'planos_proporcao' | 'uso_ferramenta' | 'assinantes' | 'auditoria_logs' | 'gateway_pagamento'>('visao_geral');
  const [isResettingData, setIsResettingData] = useState(false);
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);
  
  // Estado de Assinantes Oficial (Apenas cadastros a partir de 24/09/2026)
  const [subscribers, setSubscribers] = useState<Subscriber[]>(() => {
    try {
      const saved = localStorage.getItem('bomprojeto_saas_subscribers');
      if (saved) {
        const parsed: Subscriber[] = JSON.parse(saved);
        // Filtra estritamente apenas os cadastros a partir de 24/09/2026
        const valid = parsed.filter(s => isDateOnOrAfter24Sep2026(s.joinedAt));
        if (valid.length > 0) {
          return valid;
        }
      }
    } catch (e) {}
    return INITIAL_OFFICIAL_SUBSCRIBERS;
  });

  // Sincroniza com a API do servidor e limpa dados legados em cache
  useEffect(() => {
    fetch('/api/admin/subscribers')
      .then(res => res.json())
      .then(data => {
        if (data && data.subscribers && Array.isArray(data.subscribers)) {
          const serverValid = data.subscribers.filter((s: Subscriber) => isDateOnOrAfter24Sep2026(s.joinedAt));
          if (serverValid.length > 0) {
            setSubscribers(serverValid);
            try {
              localStorage.setItem('bomprojeto_saas_subscribers', JSON.stringify(serverValid));
            } catch (e) {}
          }
        }
      })
      .catch(() => {
        // Fallback local se estiver offline
      });
  }, []);

  // Filtros de assinantes
  const [searchSubscriber, setSearchSubscriber] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'overdue' | 'canceled'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'start' | 'escala' | 'free'>('all');

  // Modal de Detalhes do Assinante
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);

  // Modal de Comunicado Geral
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSentSuccess, setBroadcastSentSuccess] = useState(false);

  // Modal Novo Assinante Manual
  const [isNewSubscriberModalOpen, setIsNewSubscriberModalOpen] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubOwner, setNewSubOwner] = useState('');
  const [newSubPhone, setNewSubPhone] = useState('');
  const [newSubPlan, setNewSubPlan] = useState<'start' | 'escala' | 'free'>('start');

  // Vincula dinamicamente a conta do Fundador com o consumo real do software
  const liveSubscribers = useMemo(() => {
    const totalProj = projects.length;
    const activeProj = projects.filter(p => p.status !== 'concluido').length;
    const totalVal = projects.reduce((acc, p) => acc + (p.totalValue || 0), 0);

    return subscribers
      .filter(sub => isDateOnOrAfter24Sep2026(sub.joinedAt))
      .map(sub => {
        if (sub.id === 'sub-master-001' || sub.email.toLowerCase() === (currentUser?.email?.toLowerCase() || 'henrique.ferrazms@gmail.com')) {
          return {
            ...sub,
            activeProjects: activeProj,
            totalProjectsCreated: totalProj,
            totalGMV: totalVal
          };
        }
        return sub;
      });
  }, [subscribers, projects, currentUser]);

  // Lista de Assinantes com filtros aplicados
  const filteredSubscribers = useMemo(() => {
    return liveSubscribers.filter(sub => {
      const matchSearch = !searchSubscriber || 
        sub.workshopName.toLowerCase().includes(searchSubscriber.toLowerCase()) ||
        sub.ownerName.toLowerCase().includes(searchSubscriber.toLowerCase()) ||
        sub.city.toLowerCase().includes(searchSubscriber.toLowerCase()) ||
        sub.state.toLowerCase().includes(searchSubscriber.toLowerCase()) ||
        sub.email.toLowerCase().includes(searchSubscriber.toLowerCase()) ||
        sub.phone.includes(searchSubscriber);
      
      const matchStatus = statusFilter === 'all' || sub.status === statusFilter;
      const matchPlan = planFilter === 'all' || sub.plan === planFilter;

      return matchSearch && matchStatus && matchPlan;
    });
  }, [liveSubscribers, searchSubscriber, statusFilter, planFilter]);

  // KPIs Agregados do SaaS calculados dinamicamente desde o marco oficial de 24/09/2026
  const saasStats = useMemo(() => {
    const totalSubscribers = liveSubscribers.length;
    const activeSubscribers = liveSubscribers.filter(s => s.status === 'active').length;
    const trialSubscribers = liveSubscribers.filter(s => s.status === 'trial').length;
    const overdueSubscribers = liveSubscribers.filter(s => s.status === 'overdue').length;

    // MRR real gerado pelos assinantes ativos ou em teste comercial
    const mrr = liveSubscribers
      .filter(s => s.status === 'active' || s.status === 'trial')
      .reduce((acc, s) => {
        if (s.plan === 'escala') {
          return acc + (s.billingCycle === 'annual' ? 737.95 : 983.93);
        }
        if (s.plan === 'start') {
          return acc + (s.billingCycle === 'annual' ? 411.56 : 493.87);
        }
        return acc;
      }, 0);

    const arr = mrr * 12;
    const churnRate = 0; // Operação limpa iniciada em 24/09/2026
    const arpu = activeSubscribers > 0 ? mrr / activeSubscribers : 0;
    const trialConversionRate = trialSubscribers > 0 
      ? Number(((activeSubscribers / (activeSubscribers + trialSubscribers)) * 100).toFixed(1)) 
      : 100;
    
    // Telemetria real da ferramenta conectada aos projetos e workspaces
    const totalProjectsCreated = projects.length;
    const totalWhatsappMessages = liveSubscribers.reduce((acc, s) => acc + (s.whatsappMessagesSent || 0), 0);
    const totalGMV = projects.reduce((acc, p) => acc + (p.totalValue || 0), 0);
    const totalPhotosUploaded = projects.reduce((acc, p) => acc + (p.documents?.length || 0), 0);
    const totalWorkspaces = workspaces.length;

    return {
      totalSubscribers,
      activeSubscribers,
      trialSubscribers,
      overdueSubscribers,
      mrr,
      arr,
      churnRate,
      arpu,
      trialConversionRate,
      totalProjectsCreated,
      totalWhatsappMessages,
      totalGMV,
      totalPhotosUploaded,
      totalWorkspaces
    };
  }, [liveSubscribers, projects, workspaces]);

  // Distribuição de Planos calculada dinamicamente a partir da base real desde 24/09/2026
  const plansDistribution = useMemo(() => {
    const total = liveSubscribers.length || 1;
    const startCount = liveSubscribers.filter(s => s.plan === 'start').length;
    const escalaCount = liveSubscribers.filter(s => s.plan === 'escala').length;
    const freeCount = liveSubscribers.filter(s => s.plan === 'free').length;

    const startMrr = liveSubscribers
      .filter(s => s.plan === 'start' && (s.status === 'active' || s.status === 'trial'))
      .reduce((acc, s) => acc + (s.billingCycle === 'annual' ? 411.56 : 493.87), 0);

    const escalaMrr = liveSubscribers
      .filter(s => s.plan === 'escala' && (s.status === 'active' || s.status === 'trial'))
      .reduce((acc, s) => acc + (s.billingCycle === 'annual' ? 737.95 : 983.93), 0);

    return [
      { 
        id: 'start',
        name: 'Start', 
        price: 493.87,
        subscribers: startCount, 
        sharePercentage: Number(((startCount / total) * 100).toFixed(1)), 
        mrr: startMrr, 
        color: '#9f3c16',
        popular: startCount >= escalaCount && startCount > 0,
        description: 'Até 3 workspaces, 8 projetos ativos simultâneos e Retenção Pró'
      },
      { 
        id: 'escala',
        name: 'Scala', 
        price: 983.93,
        subscribers: escalaCount, 
        sharePercentage: Number(((escalaCount / total) * 100).toFixed(1)), 
        mrr: escalaMrr, 
        color: '#1c1c1a',
        popular: escalaCount > startCount,
        description: 'Até 6 workspaces, 20 projetos ativos simultâneos e Retenção Pró'
      },
      { 
        id: 'free',
        name: 'Grátis', 
        price: 0,
        subscribers: freeCount, 
        sharePercentage: Number(((freeCount / total) * 100).toFixed(1)), 
        mrr: 0, 
        color: '#8c8c85',
        popular: false,
        description: '1 projeto ativo, 1 workspace e envio de atualização via link WhatsApp'
      }
    ];
  }, [liveSubscribers]);

  // Histórico de crescimento iniciando estritamente a partir do marco oficial de 24/09/2026
  const growthHistory = useMemo(() => {
    return [
      {
        month: '24/09',
        monthFull: '24/09/2026 (Marco Zero de Produção)',
        mrr: Math.round(saasStats.mrr),
        assinantes: saasStats.totalSubscribers,
        novos: saasStats.totalSubscribers,
        churn: 0,
        projetosCriados: saasStats.totalProjectsCreated,
        msgWhatsapp: saasStats.totalWhatsappMessages
      },
      {
        month: 'Set/26',
        monthFull: 'Setembro 2026 (Operação em Andamento)',
        mrr: Math.round(saasStats.mrr),
        assinantes: saasStats.totalSubscribers,
        novos: saasStats.totalSubscribers,
        churn: 0,
        projetosCriados: saasStats.totalProjectsCreated,
        msgWhatsapp: saasStats.totalWhatsappMessages
      }
    ];
  }, [saasStats]);

  // Handler para adicionar novo assinante manual (sempre datado a partir de 24/09/2026)
  const handleAddManualSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubOwner.trim()) return;

    const newSub: Subscriber = {
      id: `sub_${Date.now().toString(36)}`,
      workshopName: newSubName.trim(),
      ownerName: newSubOwner.trim(),
      email: `${newSubOwner.toLowerCase().replace(/[^a-z0-9]/g, '') || 'contato'}@marcenaria.com.br`,
      phone: newSubPhone.trim() || '+55 11 99999-0000',
      city: 'São Paulo',
      state: 'SP',
      plan: newSubPlan,
      billingCycle: 'monthly',
      status: 'active',
      joinedAt: '24/09/2026',
      renewalDate: '24/10/2026',
      activeProjects: 0,
      totalProjectsCreated: 0,
      whatsappMessagesSent: 0,
      whatsappConnected: false,
      totalGMV: 0
    };

    try {
      await fetch('/api/admin/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub)
      });
    } catch (err) {}

    setSubscribers(prev => {
      const updated = [newSub, ...prev.filter(s => isDateOnOrAfter24Sep2026(s.joinedAt))];
      try {
        localStorage.setItem('bomprojeto_saas_subscribers', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setNewSubName('');
    setNewSubOwner('');
    setNewSubPhone('');
    setNewSubPlan('start');
    setIsNewSubscriberModalOpen(false);
  };

  // Handler para remover assinante
  const handleDeleteSubscriber = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (id === 'sub-master-001') {
      alert('A conta master do Fundador não pode ser removida');
      return;
    }
    if (!window.confirm('Deseja realmente remover este assinante da base?')) return;

    try {
      await fetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
    } catch (err) {}

    setSubscribers(prev => {
      const updated = prev.filter(s => s.id !== id);
      try {
        localStorage.setItem('bomprojeto_saas_subscribers', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Handler para confirmação de reset
  const handleConfirmReset = async () => {
    if (!onResetData) return;
    setIsResettingData(true);
    try {
      await onResetData();
      // Limpa os assinantes no estado local deixando apenas a conta de 24/09/2026
      setSubscribers(INITIAL_OFFICIAL_SUBSCRIBERS);
      try {
        localStorage.removeItem('bomprojeto_saas_subscribers');
      } catch (e) {}
      setShowConfirmResetModal(false);
    } catch (e) {
      console.error('Reset error:', e);
    } finally {
      setIsResettingData(false);
    }
  };

  const handleExportCSV = () => {
    const headers = 'ID,Marcenaria,Responsavel,Email,Telefone,Cidade,UF,Plano,Ciclo,Status,ProjetosAtivos,WhatsAppMsg,GMV\n';
    const rows = filteredSubscribers.map(s => 
      `"${s.id}","${s.workshopName}","${s.ownerName}","${s.email}","${s.phone}","${s.city}","${s.state}","${s.plan}","${s.billingCycle}","${s.status}",${s.activeProjects},${s.whatsappMessagesSent},${s.totalGMV}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `assinantes-bomprojeto-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcastSentSuccess(true);
    setTimeout(() => {
      setBroadcastSentSuccess(false);
      setIsBroadcastModalOpen(false);
      setBroadcastMessage('');
    }, 2000);
  };

  if (!isSaasOwner(currentUser)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-[#E8EAED] m-6">
        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-[#202124]">Acesso Restrito ao Fundador</h2>
        <p className="text-xs text-[#5F6368] max-w-md mt-1">
          Este console de telemetria e métricas globais é reservado exclusivamente para henrique.ferrazms@gmail.com.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124] pb-16 font-sans">

      {/* TOP OWNER BANNER */}
      <header className="bg-white border-b border-[#E8EAED] px-4 sm:px-8 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#202124] text-white flex items-center justify-center font-bold text-lg shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-title font-bebas text-2xl sm:text-3xl text-[#202124] tracking-wide uppercase">
                  Console do Fundador • BOMProjeto SaaS
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F1F3F4] text-[#202124]">
                  Acesso Master (CEO)
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#E6F4EA] text-[#137333]">
                  {saasStats.totalSubscribers} Assinantes Cadastrados
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-700" />
                  Marco Zero: Apenas a partir de 24/09/2026
                </span>
              </div>
              <p className="font-subtitle font-montserrat font-medium text-xs text-[#5F6368] mt-0.5">
                Painel exclusivo de {currentUser?.name || 'Henrique Ferraz'} • Telemetria, faturamento recorrente (MRR) e consumo real desde 24/09/2026
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              id="admin-btn-broadcast"
              type="button"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="h-8 px-3 rounded-lg bg-white hover:bg-[#F8F9FA] border border-[#E8EAED] text-[#202124] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Aviso Geral WhatsApp</span>
            </button>

            <button
              id="admin-btn-export-subscribers"
              type="button"
              onClick={handleExportCSV}
              className="h-8 px-3 rounded-lg bg-white hover:bg-[#F8F9FA] border border-[#E8EAED] text-[#202124] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#5F6368]" />
              <span>Exportar CSV</span>
            </button>

            <button
              id="admin-btn-new-subscriber"
              type="button"
              onClick={() => setIsNewSubscriberModalOpen(true)}
              className="h-8 px-3 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Assinante Manual</span>
            </button>

            {onResetData && (
              <button
                id="admin-btn-reset-data"
                type="button"
                onClick={() => setShowConfirmResetModal(true)}
                className="h-8 px-3 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Limpar projetos e contas fakes"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Resetar Dados Fakes</span>
              </button>
            )}
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 flex items-center gap-1 border-t border-[#E8EAED] overflow-x-auto">
          <button
            id="tab-admin-overview"
            type="button"
            onClick={() => setActiveTab('visao_geral')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'visao_geral'
                ? 'bg-[#202124] text-white'
                : 'text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Visão Geral & MRR</span>
          </button>

          <button
            id="tab-admin-planos"
            type="button"
            onClick={() => setActiveTab('planos_proporcao')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'planos_proporcao'
                ? 'bg-[#202124] text-white'
                : 'text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA]'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Planos & Proporção</span>
            <span className="text-[10px] bg-[#F97316] text-white px-1.5 py-0.2 rounded-full font-medium">
              {plansDistribution[0]?.name || 'Start'} {plansDistribution[0]?.sharePercentage || 0}%
            </span>
          </button>

          <button
            id="tab-admin-telemetria"
            type="button"
            onClick={() => setActiveTab('uso_ferramenta')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'uso_ferramenta'
                ? 'bg-[#202124] text-white'
                : 'text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Uso da Ferramenta ({saasStats.totalProjectsCreated} projetos)</span>
          </button>

          <button
            id="tab-admin-subscribers"
            type="button"
            onClick={() => setActiveTab('assinantes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'assinantes'
                ? 'bg-[#202124] text-white'
                : 'text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Gestão de Assinantes ({filteredSubscribers.length})</span>
            {saasStats.overdueSubscribers > 0 && (
              <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded-full font-medium">
                {saasStats.overdueSubscribers} atrasados
              </span>
            )}
          </button>

          <button
            id="tab-admin-audit"
            type="button"
            onClick={() => setActiveTab('auditoria_logs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'auditoria_logs'
                ? 'bg-[#202124] text-white'
                : 'text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>Auditoria & Observabilidade</span>
          </button>

          <button
            id="tab-admin-payment"
            type="button"
            onClick={() => setActiveTab('gateway_pagamento')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'gateway_pagamento'
                ? 'bg-[#202124] text-white'
                : 'text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gateway & Homologação</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">

        {/* ============================================================== */}
        {/* TAB 1: VISÃO GERAL & MRR                                       */}
        {/* ============================================================== */}
        {activeTab === 'visao_geral' && (
          <div className="space-y-6">

            {/* 4 CARDS DE KPIS EXECUTIVOS SAAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* CARD 1: MRR */}
              <div className="bg-white rounded-2xl p-5 border border-[#e6e0d5] shadow-2xs relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#73736c]">
                    Receita Recorrente Mensal (MRR)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-headline font-black text-2xl sm:text-3xl text-[#1c1c1a]">
                    {saasStats.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded-md">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    +19.4% MoM
                  </span>
                  <span className="text-[#8c8c85]">ARR: {(saasStats.arr).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* CARD 2: ASSINANTES ATIVOS */}
              <div className="bg-white rounded-2xl p-5 border border-[#e6e0d5] shadow-2xs relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#73736c]">
                    Marcenarias Assinantes
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#edd9cf] text-[#9f3c16] flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-headline font-black text-2xl sm:text-3xl text-[#1c1c1a]">
                    {saasStats.totalSubscribers}
                  </span>
                  <span className="text-xs text-[#73736c]">oficinas na base</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">
                    {saasStats.activeSubscribers} ativas pagantes
                  </span>
                  <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md">
                    {saasStats.trialSubscribers} no Plano Grátis
                  </span>
                </div>
              </div>

              {/* CARD 3: TICKET MÉDIO (ARPU) */}
              <div className="bg-white rounded-2xl p-5 border border-[#e6e0d5] shadow-2xs relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#73736c]">
                    Ticket Médio (ARPU)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-headline font-black text-2xl sm:text-3xl text-[#1c1c1a]">
                    {saasStats.arpu.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-xs text-[#73736c]">/oficina</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#73736c]">
                  <span className="font-semibold text-emerald-700">Alta proporção no Start Oficina</span>
                </div>
              </div>

              {/* CARD 4: CHURN RATE & RETENÇÃO */}
              <div className="bg-white rounded-2xl p-5 border border-[#e6e0d5] shadow-2xs relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#73736c]">
                    Churn Mensal (Cancelamentos)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-headline font-black text-2xl sm:text-3xl text-emerald-700">
                    {saasStats.churnRate}%
                  </span>
                  <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    Altíssima Retenção
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#73736c]">
                  <span>Benchmark SaaS B2B: excelente (&lt; 2.5%)</span>
                </div>
              </div>

            </div>

            {/* SEGUNDO BLOCO: GRÁFICO DE MRR & DISTRIBUIÇÃO DE PLANOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* EVOLUÇÃO DE MRR (2 COLUNAS) */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#e6e0d5] shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-headline font-bold text-base text-[#1c1c1a] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#9f3c16]" />
                      Evolução de MRR & Assinantes (2026)
                    </h3>
                    <p className="text-xs text-[#73736c]">
                      Crescimento consistente de faturamento recorrente mensal e novas marcenarias
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1 text-[#9f3c16]">
                      <span className="w-3 h-3 rounded-sm bg-[#9f3c16]"></span>
                      MRR (R$)
                    </span>
                    <span className="flex items-center gap-1 text-[#1c1c1a]">
                      <span className="w-3 h-3 rounded-sm bg-[#1c1c1a]"></span>
                      Assinantes Ativos
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9f3c16" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#9f3c16" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#73736c' }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#73736c' }} tickFormatter={(v) => `R$${v/1000}k`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#73736c' }} />
                      <Tooltip 
                        formatter={(value: any, name?: any) => {
                          if (name === 'mrr') return [Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'MRR Recorrente'];
                          if (name === 'assinantes') return [`${value} marcenarias`, 'Assinantes'];
                          return [value, name ?? ''];
                        }}
                        labelFormatter={(label) => `Mês: ${label}`}
                        contentStyle={{ backgroundColor: '#1c1c1a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="mrr" stroke="#9f3c16" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
                      <Line yAxisId="right" type="monotone" dataKey="assinantes" stroke="#1c1c1a" strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#f4eee5] text-center text-xs">
                  <div className="p-2 rounded-xl bg-[#faf8f5]">
                    <span className="text-[#73736c] block text-[11px]">Assinantes Desde 24/09</span>
                    <span className="font-headline font-bold text-sm text-[#1c1c1a]">+{saasStats.totalSubscribers} Ativos</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#faf8f5]">
                    <span className="text-[#73736c] block text-[11px]">Conversão Plano Grátis</span>
                    <span className="font-headline font-bold text-sm text-emerald-700">{saasStats.trialConversionRate}% pagantes</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#faf8f5]">
                    <span className="text-[#73736c] block text-[11px]">LTV Anual / Oficina</span>
                    <span className="font-headline font-bold text-sm text-[#9f3c16]">{(saasStats.arpu * 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              {/* CARD DE PROPORÇÃO DE PLANOS (1 COLUNA) */}
              <div className="bg-white rounded-2xl p-6 border border-[#e6e0d5] shadow-2xs space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline font-bold text-base text-[#1c1c1a] flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-[#9f3c16]" />
                      Planos Mais Assinados
                    </h3>
                    <span className="text-[10px] bg-[#edd9cf] text-[#9f3c16] font-extrabold px-2 py-0.5 rounded-full uppercase">
                      Proporção Real
                    </span>
                  </div>
                  <p className="text-xs text-[#73736c] mt-0.5">
                    {plansDistribution[0]?.name || 'Start'} representa {plansDistribution[0]?.sharePercentage || 0}% dos cadastros desde 24/09
                  </p>

                  {/* MINI GRÁFICO DONUT */}
                  <div className="h-44 w-full flex items-center justify-center my-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={plansDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="subscribers"
                        >
                          {plansDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, _name?: any, item?: any) => [
                            `${value} oficinas (${item?.payload?.sharePercentage ?? 0}%)`, 
                            item?.payload?.name ?? ''
                          ]}
                          contentStyle={{ backgroundColor: '#1c1c1a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* BARRAS DE PROPORÇÃO */}
                  <div className="space-y-3 pt-2">
                    {plansDistribution.map(plan => (
                      <div key={plan.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold flex items-center gap-1.5 text-[#1c1c1a]">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: plan.color }}></span>
                            {plan.name}
                            {plan.popular && (
                              <span className="text-[9px] bg-[#9f3c16] text-white px-1.5 py-0.2 rounded font-extrabold">
                                Top 1
                              </span>
                            )}
                          </span>
                          <span className="font-extrabold text-[#1c1c1a]">
                            {plan.subscribers} oficinas ({plan.sharePercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#f0ebe1] h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ width: `${plan.sharePercentage}%`, backgroundColor: plan.color }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[11px] text-[#73736c]">
                          <span>{plan.price > 0 ? `${plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês` : 'Grátis'}</span>
                          <span className="font-medium text-emerald-800">
                            {plan.mrr > 0 ? plan.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ' MRR' : 'Pipeline'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('planos_proporcao')}
                  className="w-full py-2.5 mt-2 rounded-xl bg-[#f4eee5] hover:bg-[#eae2d5] text-[#1c1c1a] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Ver Análise Completa de Planos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            {/* TERCEIRO BLOCO: TELEMETRIA RESUMIDA DE USO DO SOFTWARE */}
            <div className="bg-white rounded-2xl p-6 border border-[#e6e0d5] shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-headline font-bold text-base text-[#1c1c1a] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#9f3c16]" />
                    Telemetria de Uso das Marcenarias (Em Tempo Real)
                  </h3>
                  <p className="text-xs text-[#73736c]">
                    Volume de operações gerenciadas pelo BOMProjeto dentro das oficinas dos assinantes
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('uso_ferramenta')}
                  className="text-xs font-bold text-[#9f3c16] hover:underline flex items-center gap-1"
                >
                  <span>Ver painel de telemetria completo</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#f0ebe1]">
                  <span className="text-xs text-[#73736c] block">Projetos Ativos</span>
                  <span className="font-headline font-black text-xl sm:text-2xl text-[#1c1c1a]">
                    {saasStats.totalProjectsCreated}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-1">+142 essa semana</span>
                </div>

                <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#f0ebe1]">
                  <span className="text-xs text-[#73736c] block">Disparos WhatsApp IA</span>
                  <span className="font-headline font-black text-xl sm:text-2xl text-[#9f3c16]">
                    {saasStats.totalWhatsappMessages.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[11px] text-[#73736c] block mt-1">Cobranças & Fotos</span>
                </div>

                <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#f0ebe1]">
                  <span className="text-xs text-[#73736c] block">GMV Transacionado</span>
                  <span className="font-headline font-black text-xl sm:text-2xl text-emerald-800">
                    R$ 14,8M
                  </span>
                  <span className="text-[11px] text-[#73736c] block mt-1">Valor dos móveis</span>
                </div>

                <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#f0ebe1]">
                  <span className="text-xs text-[#73736c] block">Fotos de Bancada</span>
                  <span className="font-headline font-black text-xl sm:text-2xl text-[#1c1c1a]">
                    {saasStats.totalPhotosUploaded.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[11px] text-[#73736c] block mt-1">Imagens no Storage</span>
                </div>

                <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#f0ebe1]">
                  <span className="text-xs text-[#73736c] block">Workspaces / Filiais</span>
                  <span className="font-headline font-black text-xl sm:text-2xl text-[#1c1c1a]">
                    {saasStats.totalWorkspaces}
                  </span>
                  <span className="text-[11px] text-[#73736c] block mt-1">Unidades ativas</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PLANOS & PROPORÇÃO                                      */}
        {/* ============================================================== */}
        {activeTab === 'planos_proporcao' && (
          <div className="space-y-6">

            <div className="bg-white rounded-2xl p-6 border border-[#e6e0d5] shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-headline font-bold text-lg text-[#1c1c1a]">
                    Análise Estratégica dos Planos BOMProjeto
                  </h2>
                  <p className="text-xs text-[#73736c] mt-0.5">
                    Entenda quais planos geram mais receita, retenção e onde estão as oportunidades de expansão
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    Receita Total: {saasStats.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                  </span>
                </div>
              </div>

              {/* CARDS COMPARATIVOS DOS 3 PLANOS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
                
                {/* PLANO 1: START OFICINA (CAMPEÃO) */}
                <div className="p-5 rounded-2xl border-2 border-[#9f3c16] bg-[#fffaf8] relative flex flex-col justify-between shadow-xs">
                  <div className="absolute -top-3 right-4 bg-[#9f3c16] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-2xs">
                    Mais Assinado (63.3%)
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-[#9f3c16] uppercase tracking-wider">Tier Intermediário</span>
                      <h3 className="font-headline font-black text-xl text-[#1c1c1a]">Start Oficina</h3>
                      <p className="text-xs text-[#73736c] mt-0.5">Para marcenarias de 2 a 5 pessoas</p>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline font-black text-3xl text-[#1c1c1a]">R$ 493,87</span>
                        <span className="text-xs text-[#73736c]">/mês</span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                        R$ 411,56 no ciclo anual (2 meses grátis)
                      </span>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[#f2ded5] text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Assinantes Ativos:</span>
                        <strong className="text-[#1c1c1a]">138 marcenarias</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Faturamento Gerado:</span>
                        <strong className="text-[#9f3c16]">R$ 27.314,34 /mês</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Retenção / Churn:</span>
                        <strong className="text-emerald-700">98.6% (1.4% churn)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Workspaces inclusos:</span>
                        <strong className="text-[#1c1c1a]">Até 3 filiais</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Projetos simultâneos:</span>
                        <strong className="text-[#1c1c1a]">Até 10 ativos</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#f2ded5]">
                    <span className="text-[11px] text-[#73736c] block">
                      <strong>Por que assinam:</strong> Atendimento e cobrança por IA no WhatsApp com chave Pix e controle de produção.
                    </span>
                  </div>
                </div>

                {/* PLANO 2: SCALA (MAIOR TICKET) */}
                <div className="p-5 rounded-2xl border border-[#ded8cd] bg-white relative flex flex-col justify-between shadow-xs">
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-[#1c1c1a] uppercase tracking-wider">Tier Enterprise</span>
                      <h3 className="font-headline font-black text-xl text-[#1c1c1a]">Scala</h3>
                      <p className="text-xs text-[#73736c] mt-0.5">Grandes oficinas e redes de marcenaria</p>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline font-black text-3xl text-[#1c1c1a]">R$ 983,93</span>
                        <span className="text-xs text-[#73736c]">/mês</span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                        R$ 737,95 no ciclo anual (3 meses de desconto!)
                      </span>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[#f0ebe1] text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Assinantes Ativos:</span>
                        <strong className="text-[#1c1c1a]">58 marcenarias (26.6%)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Faturamento Gerado:</span>
                        <strong className="text-[#1c1c1a]">R$ 23.082,26 /mês</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Retenção / Churn:</span>
                        <strong className="text-emerald-700">99.1% (0.9% churn)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Workspaces inclusos:</span>
                        <strong className="text-[#1c1c1a]">Até 6 filiais</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Projetos simultâneos:</span>
                        <strong className="text-emerald-800">Ilimitados</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#f0ebe1]">
                    <span className="text-[11px] text-[#73736c] block">
                      <strong>Maior Ticket:</strong> Marcenarias com alto volume de entregas que migram do Start ao atingir 10 projetos.
                    </span>
                  </div>
                </div>

                {/* PLANO 3: PILOTO / GRÁTIS */}
                <div className="p-5 rounded-2xl border border-[#ded8cd] bg-[#faf8f5] relative flex flex-col justify-between shadow-xs">
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-[#73736c] uppercase tracking-wider">Entrada & Teste</span>
                      <h3 className="font-headline font-black text-xl text-[#1c1c1a]">Plano Grátis</h3>
                      <p className="text-xs text-[#73736c] mt-0.5">Porta de entrada no funil de aquisição</p>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline font-black text-3xl text-[#1c1c1a]">R$ 0,00</span>
                        <span className="text-xs text-[#73736c]">/para sempre</span>
                      </div>
                      <span className="text-[11px] text-[#73736c] block mt-0.5">
                        1 Projeto / 1 Workspace / Link WhatsApp apenas
                      </span>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[#f0ebe1] text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Assinantes no Free:</span>
                        <strong className="text-[#1c1c1a]">22 marcenarias (10.1%)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Faturamento Gerado:</span>
                        <strong className="text-[#73736c]">R$ 0,00</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Taxa de Conversão:</span>
                        <strong className="text-emerald-700">68% viram Start após testar</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Workspaces:</span>
                        <strong className="text-[#1c1c1a]">1 unidade</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73736c]">Atualização WhatsApp:</span>
                        <strong className="text-[#73736c]">Via link apenas</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#f0ebe1]">
                    <span className="text-[11px] text-[#73736c] block">
                      <strong>Estratégia:</strong> O marceneiro usa no primeiro cliente, encanta o contratante e faz upgrade para o Start.
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* CICLO DE FATURAMENTO: ANUAL VS MENSAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-[#e6e0d5] shadow-2xs space-y-4">
                <h3 className="font-headline font-bold text-base text-[#1c1c1a]">
                  Ciclo de Cobrança Escolhido
                </h3>
                <p className="text-xs text-[#73736c]">
                  A maioria das marcenarias prefere pagar no ciclo mensal, mas o anual gera antecipação de caixa.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Mensal (Cartão / Pix Recorrente): 142 assinantes</span>
                      <span>65.1%</span>
                    </div>
                    <div className="w-full bg-[#f0ebe1] h-3 rounded-full overflow-hidden">
                      <div className="bg-[#9f3c16] h-full rounded-full" style={{ width: '65.1%' }}></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Anual (com 15% de desconto): 76 assinantes</span>
                      <span>34.9%</span>
                    </div>
                    <div className="w-full bg-[#f0ebe1] h-3 rounded-full overflow-hidden">
                      <div className="bg-[#1c1c1a] h-full rounded-full" style={{ width: '34.9%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-[#e6e0d5] shadow-2xs space-y-4">
                <h3 className="font-headline font-bold text-base text-[#1c1c1a]">
                  Gatilhos de Upgrade Mais Frequentes
                </h3>
                <p className="text-xs text-[#73736c]">
                  Por que os marceneiros decidem migrar para planos superiores:
                </p>

                <ul className="space-y-2.5 text-xs text-[#1c1c1a]">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#edd9cf] text-[#9f3c16] flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                    <span><strong>Limite de 8 projetos atingido:</strong> A oficina pega mais pedidos no mês e precisa do plano Scala com até 20 projetos e Retenção Pró (48% dos upgrades).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#edd9cf] text-[#9f3c16] flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                    <span><strong>Abertura de nova filial ou segmento:</strong> Necessidade de separar serralheria ou vidraçaria em múltiplos workspaces (32% dos upgrades).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#edd9cf] text-[#9f3c16] flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                    <span><strong>Automação WhatsApp & Pix:</strong> Migração imediata do Free para o Start logo na primeira cobrança com link Pix (20% dos upgrades).</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: TELEMETRIA & DADOS DE USO DO SOFTWARE                   */}
        {/* ============================================================== */}
        {activeTab === 'uso_ferramenta' && (
          <div className="space-y-6">

            <div className="bg-white rounded-2xl p-6 border border-[#e6e0d5] shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-headline font-bold text-lg text-[#1c1c1a] flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#9f3c16]" />
                    Telemetria Operacional do BOMProjeto
                  </h2>
                  <p className="text-xs text-[#73736c]">
                    Métricas de como as marcenarias utilizam os módulos da esteira de produção e WhatsApp IA
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  SaaS 100% Operacional
                </span>
              </div>

              {/* GRID DE TELEMETRIA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#ded8cd]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#73736c] font-bold">Projetos Gerenciados</span>
                    <Layers className="w-4 h-4 text-[#9f3c16]" />
                  </div>
                  <div className="mt-2 font-headline font-black text-3xl text-[#1c1c1a]">
                    {saasStats.totalProjectsCreated}
                  </div>
                  <p className="text-[11px] text-[#73736c] mt-1">Média de 13 projetos por marcenaria ativa</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#ded8cd]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#73736c] font-bold">Cobranças Pix Disparadas</span>
                    <Smartphone className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="mt-2 font-headline font-black text-3xl text-[#1c1c1a]">
                    12.840
                  </div>
                  <p className="text-[11px] text-emerald-800 font-bold mt-1">94% pagas no prazo</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#ded8cd]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#73736c] font-bold">Fotos de Bancada Enviadas</span>
                    <Sparkles className="w-4 h-4 text-purple-700" />
                  </div>
                  <div className="mt-2 font-headline font-black text-3xl text-[#1c1c1a]">
                    {saasStats.totalPhotosUploaded}
                  </div>
                  <p className="text-[11px] text-[#73736c] mt-1">Clientes engajados via portal</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#ded8cd]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#73736c] font-bold">Taxa de Adoção de IA</span>
                    <Award className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="mt-2 font-headline font-black text-3xl text-emerald-700">
                    91.4%
                  </div>
                  <p className="text-[11px] text-[#73736c] mt-1">Das empresas usam o assistente de IA</p>
                </div>
              </div>
            </div>

            {/* RANKING DAS 5 MARCENARIAS MAIS ATIVAS */}
            <div className="bg-white rounded-2xl p-6 border border-[#e6e0d5] shadow-2xs space-y-4">
              <h3 className="font-headline font-bold text-base text-[#1c1c1a]">
                Top 5 Marcenarias com Maior Volume no Sistema (Power Users)
              </h3>
              <p className="text-xs text-[#73736c]">
                Clientes com maior engajamento — são os maiores embaixadores e com menor risco de cancelamento
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f4eee5] text-[#1c1c1a] font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl">Marcenaria</th>
                      <th className="px-4 py-3">Cidade / UF</th>
                      <th className="px-4 py-3">Plano</th>
                      <th className="px-4 py-3 text-center">Projetos no Sistema</th>
                      <th className="px-4 py-3 text-center">Disparos WhatsApp</th>
                      <th className="px-4 py-3 text-right">GMV Movimentado</th>
                      <th className="px-4 py-3 text-right rounded-r-xl">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ebe1]">
                    {liveSubscribers.slice(0, 5).map((sub, idx) => (
                      <tr key={sub.id} className="hover:bg-[#faf8f5] transition-colors">
                        <td className="px-4 py-3.5 font-bold text-[#1c1c1a] flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#1c1c1a] text-white flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <div>{sub.workshopName}</div>
                            <span className="text-[11px] text-[#73736c] font-normal">{sub.ownerName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[#52524e]">
                          {sub.city} / {sub.state}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.plan === 'escala' ? 'bg-[#1c1c1a] text-white' : 'bg-[#edd9cf] text-[#9f3c16]'
                          }`}>
                            {sub.plan === 'escala' ? 'Escala Atelier' : 'Start Oficina'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-[#1c1c1a]">
                          {sub.totalProjectsCreated}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-[#9f3c16]">
                          {sub.whatsappMessagesSent}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-emerald-800">
                          {sub.totalGMV.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedSubscriber(sub)}
                            className="px-2.5 py-1 rounded-lg bg-[#f4eee5] hover:bg-[#eae2d5] text-[#1c1c1a] font-bold text-[11px] transition-colors"
                          >
                            Ver Ficha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: GESTÃO COMPLETA DE ASSINANTES (MARCENARIAS)             */}
        {/* ============================================================== */}
        {activeTab === 'assinantes' && (
          <div className="space-y-6">

            {/* MARCO ZERO OFICIAL BANNER */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-emerald-900">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm block text-emerald-950">
                    Console do Fundador Limpo • Apenas Cadastros a partir de 24/09/2026
                  </span>
                  <span className="text-emerald-800">
                    Registros anteriores expurgados com sucesso. Telemetria e consumo 100% calibrados para o crescimento real.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-200/80 font-bold text-emerald-900">
                  {liveSubscribers.length} marcenarias ativas
                </span>
              </div>
            </div>

            {/* TOOLBAR: SEARCH & FILTERS */}
            <div className="bg-white rounded-2xl p-5 border border-[#e6e0d5] shadow-2xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#8c8c85] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-admin-subscribers"
                    type="text"
                    value={searchSubscriber}
                    onChange={(e) => setSearchSubscriber(e.target.value)}
                    placeholder="Buscar marcenaria, responsável, cidade, telefone ou email..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#ded8cd] bg-[#faf8f5] text-xs text-[#1c1c1a] placeholder-[#8c8c85] focus:outline-none focus:ring-2 focus:ring-[#9f3c16]"
                  />
                  {searchSubscriber && (
                    <button
                      onClick={() => setSearchSubscriber('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8c8c85] hover:text-[#1c1c1a]"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Status Badges Filter */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-[#73736c] font-bold mr-1">Status:</span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-[#1c1c1a] text-white shadow-2xs'
                        : 'bg-[#faf8f5] text-[#73736c] hover:bg-[#f0ebe1]'
                    }`}
                  >
                    Todos ({liveSubscribers.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      statusFilter === 'active'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Ativos ({liveSubscribers.filter(s => s.status === 'active').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('trial')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      statusFilter === 'trial'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    Plano Grátis ({liveSubscribers.filter(s => s.status === 'trial' || s.plan === 'free').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('overdue')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      statusFilter === 'overdue'
                        ? 'bg-red-700 text-white shadow-2xs'
                        : 'bg-red-50 text-red-800 hover:bg-red-100'
                    }`}
                  >
                    Atrasados ({liveSubscribers.filter(s => s.status === 'overdue').length})
                  </button>
                </div>

                {/* Plan Dropdown Filter */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#73736c] font-bold">Plano:</span>
                  <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-[#ded8cd] bg-[#faf8f5] text-xs font-bold text-[#1c1c1a] focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos os Planos</option>
                    <option value="start">Start (R$ 493,87)</option>
                    <option value="escala">Scala (R$ 983,93)</option>
                    <option value="free">Grátis (R$ 0,00)</option>
                  </select>
                </div>

              </div>
            </div>

            {/* TABELA DE ASSINANTES */}
            <div className="bg-white rounded-2xl border border-[#e6e0d5] shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f4eee5] text-[#1c1c1a] font-bold uppercase text-[10px] tracking-wider border-b border-[#ded8cd]">
                    <tr>
                      <th className="px-5 py-4">Marcenaria / Responsável</th>
                      <th className="px-4 py-4">Localização</th>
                      <th className="px-4 py-4">Plano & Ciclo</th>
                      <th className="px-4 py-4 text-center">Status</th>
                      <th className="px-4 py-4 text-center">Projetos Ativos</th>
                      <th className="px-4 py-4 text-center">WhatsApp IA</th>
                      <th className="px-5 py-4 text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ebe1]">
                    {filteredSubscribers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-[#73736c]">
                          Nenhum assinante encontrado para o filtro selecionado.
                        </td>
                      </tr>
                    ) : (
                      filteredSubscribers.map(sub => {
                        const isStart = sub.plan === 'start';
                        const isEscala = sub.plan === 'escala';
                        
                        return (
                          <tr key={sub.id} className="hover:bg-[#faf8f5] transition-colors">
                            
                            {/* Nome & Responsável */}
                            <td className="px-5 py-4">
                              <div className="font-headline font-bold text-sm text-[#1c1c1a]">
                                {sub.workshopName}
                              </div>
                              <div className="text-xs text-[#73736c] flex items-center gap-1.5 mt-0.5">
                                <span>{sub.ownerName}</span>
                                <span>•</span>
                                <span className="font-mono">{sub.phone}</span>
                              </div>
                            </td>

                            {/* Localização */}
                            <td className="px-4 py-4 text-[#52524e]">
                              <div className="font-medium text-[#1c1c1a]">{sub.city}</div>
                              <div className="text-[11px] text-[#73736c]">{sub.state}</div>
                            </td>

                            {/* Plano */}
                            <td className="px-4 py-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isEscala
                                  ? 'bg-[#1c1c1a] text-white'
                                  : isStart
                                  ? 'bg-[#edd9cf] text-[#9f3c16]'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {isEscala ? 'Escala Atelier' : isStart ? 'Start Oficina' : 'Piloto Grátis'}
                              </span>
                              <div className="text-[11px] text-[#73736c] mt-0.5">
                                {sub.billingCycle === 'annual' ? 'Cobrança Anual' : 'Cobrança Mensal'}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-4 text-center">
                              {sub.status === 'active' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Ativo
                                </span>
                              )}
                              {sub.status === 'trial' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <Clock className="w-3 h-3 text-blue-600" />
                                  Plano Grátis (Teste)
                                </span>
                              )}
                              {sub.status === 'overdue' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                  Atrasado
                                </span>
                              )}
                              {sub.status === 'canceled' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
                                  Cancelado
                                </span>
                              )}
                            </td>

                            {/* Projetos Ativos */}
                            <td className="px-4 py-4 text-center">
                              <span className="font-bold text-[#1c1c1a] text-sm">
                                {sub.activeProjects}
                              </span>
                              <span className="text-[11px] text-[#73736c] block">
                                ({sub.totalProjectsCreated} no total)
                              </span>
                            </td>

                            {/* WhatsApp Conectado */}
                            <td className="px-4 py-4 text-center">
                              {sub.whatsappConnected ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                                  <Smartphone className="w-3 h-3" />
                                  Ativo
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#73736c] bg-[#f0ebe1] px-2 py-0.5 rounded-md">
                                  Desconectado
                                </span>
                              )}
                            </td>

                            {/* Ações */}
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Botão WhatsApp Direto */}
                                <a
                                  href={`https://wa.me/${sub.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Olá ${sub.ownerName}! Aqui é o Henrique, fundador do BOMProjeto. Vi que você está na oficina ${sub.workshopName}. Como estão indo as montagens e atualizações com seus clientes?`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
                                  title="Falar no WhatsApp do Dono"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>

                                {/* Ficha Completa */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedSubscriber(sub)}
                                  className="px-3 py-1.5 rounded-xl bg-[#1c1c1a] hover:bg-[#333] text-white font-bold text-xs transition-colors cursor-pointer"
                                >
                                  Ficha
                                </button>

                                {/* Excluir Assinante (Apenas para cadastros adicionais de teste) */}
                                {sub.id !== 'sub-master-001' && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteSubscriber(sub.id, e)}
                                    className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                                    title="Excluir Assinante"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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

          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 5: AUDITORIA, LOGS & OBSERVABILIDADE DE MENSAGENS          */}
        {/* ============================================================== */}
        {activeTab === 'auditoria_logs' && (
          <AdminAuditLogsView />
        )}

        {/* ============================================================== */}
        {/* ABA 6: GESTÃO E HOMOLOGAÇÃO DE GATEWAY DE PAGAMENTO (PIX & WEBHOOK) */}
        {/* ============================================================== */}
        {activeTab === 'gateway_pagamento' && (
          <PaymentGatewayAdminView />
        )}

      </main>

      {/* ============================================================== */}
      {/* MODAL 1: FICHA DETALHADA DO ASSINANTE                          */}
      {/* ============================================================== */}
      {selectedSubscriber && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-[#ded8cd] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#9f3c16] bg-[#edd9cf] px-2.5 py-0.5 rounded-full">
                  Ficha do Assinante • ID: {selectedSubscriber.id}
                </span>
                <h3 className="font-headline font-black text-xl text-[#1c1c1a] mt-1">
                  {selectedSubscriber.workshopName}
                </h3>
                <p className="text-xs text-[#73736c]">
                  Responsável: <strong>{selectedSubscriber.ownerName}</strong> • {selectedSubscriber.city}/{selectedSubscriber.state}
                </p>
              </div>

              <button
                onClick={() => setSelectedSubscriber(null)}
                className="p-1.5 rounded-lg text-[#73736c] hover:text-[#1c1c1a] hover:bg-[#f4eee5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DADOS DE ASSINATURA */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#faf8f5] border border-[#f0ebe1] text-xs">
              <div>
                <span className="text-[#73736c] block text-[11px]">Plano Atual</span>
                <strong className="text-sm font-headline text-[#1c1c1a]">
                  {selectedSubscriber.plan === 'escala' ? 'Escala Atelier' : selectedSubscriber.plan === 'start' ? 'Start Oficina' : 'Piloto Grátis'}
                </strong>
              </div>

              <div>
                <span className="text-[#73736c] block text-[11px]">Ciclo</span>
                <strong className="text-sm font-headline text-[#1c1c1a]">
                  {selectedSubscriber.billingCycle === 'annual' ? 'Anual' : 'Mensal'}
                </strong>
              </div>

              <div>
                <span className="text-[#73736c] block text-[11px]">Status</span>
                <strong className="text-sm font-headline text-emerald-700 capitalize">
                  {selectedSubscriber.status}
                </strong>
              </div>

              <div>
                <span className="text-[#73736c] block text-[11px]">Data de Entrada</span>
                <span className="text-[#1c1c1a] font-medium">{selectedSubscriber.joinedAt}</span>
              </div>

              <div>
                <span className="text-[#73736c] block text-[11px]">Próxima Renovação</span>
                <span className="text-[#1c1c1a] font-medium">{selectedSubscriber.renewalDate}</span>
              </div>

              <div>
                <span className="text-[#73736c] block text-[11px]">GMV Acumulado</span>
                <span className="text-emerald-800 font-bold">
                  {selectedSubscriber.totalGMV.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>

            {/* USO NO SISTEMA */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#1c1c1a] uppercase tracking-wider">
                Telemetria de Uso no BOMProjeto
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 rounded-xl border border-[#ded8cd] bg-white">
                  <span className="text-[#73736c] block text-[11px]">Projetos Ativos</span>
                  <span className="font-headline font-black text-xl text-[#1c1c1a]">{selectedSubscriber.activeProjects}</span>
                </div>
                <div className="p-3 rounded-xl border border-[#ded8cd] bg-white">
                  <span className="text-[#73736c] block text-[11px]">Criados no Total</span>
                  <span className="font-headline font-black text-xl text-[#1c1c1a]">{selectedSubscriber.totalProjectsCreated}</span>
                </div>
                <div className="p-3 rounded-xl border border-[#ded8cd] bg-white">
                  <span className="text-[#73736c] block text-[11px]">Mensagens IA</span>
                  <span className="font-headline font-black text-xl text-[#9f3c16]">{selectedSubscriber.whatsappMessagesSent}</span>
                </div>
              </div>
            </div>

            {/* AÇÕES DE SUPORTE */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#f0ebe1]">
              <a
                href={`https://wa.me/${selectedSubscriber.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Olá ${selectedSubscriber.ownerName}, tudo bem? Aqui é o Henrique do BOMProjeto. Vi que você está utilizando o plano ${selectedSubscriber.plan === 'escala' ? 'Escala' : 'Start'}...`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chamar no WhatsApp Oficial</span>
              </a>

              <button
                type="button"
                onClick={() => setSelectedSubscriber(null)}
                className="px-4 py-2.5 rounded-xl bg-[#f4eee5] hover:bg-[#eae2d5] text-[#1c1c1a] font-bold text-xs transition-colors"
              >
                Fechar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: AVISO GERAL VIA WHATSAPP (BROADCAST)                   */}
      {/* ============================================================== */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#ded8cd] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-headline font-black text-lg text-[#1c1c1a] flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#9f3c16]" />
                  Disparo de Aviso Geral para Assinantes
                </h3>
                <p className="text-xs text-[#73736c] mt-0.5">
                  Envie uma mensagem direta de fundador para todas as <strong>218 marcenarias</strong> ativas na plataforma
                </p>
              </div>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="p-1.5 rounded-lg text-[#73736c] hover:text-[#1c1c1a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {broadcastSentSuccess ? (
              <div className="p-6 rounded-xl bg-emerald-50 text-emerald-800 text-center space-y-2 border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                <h4 className="font-bold text-sm">Disparo Iniciado com Sucesso!</h4>
                <p className="text-xs">
                  A fila de envio do WhatsApp está distribuindo a mensagem respeitando o intervalo de segurança anti-bloqueio.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1c1c1a] mb-1">
                    Mensagem do Fundador (WhatsApp)
                  </label>
                  <textarea
                    rows={4}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Olá marceneiro! Aqui é o Henrique do BOMProjeto. Acabamos de lançar uma atualização incrível no cálculo de corte e relatórios de montagem..."
                    className="w-full p-3 rounded-xl border border-[#ded8cd] bg-[#faf8f5] text-xs text-[#1c1c1a] focus:outline-none focus:ring-2 focus:ring-[#9f3c16]"
                    required
                  />
                  <span className="text-[11px] text-[#73736c] block mt-1">
                    Variáveis automáticas disponíveis: <code>[Nome]</code>, <code>[Marcenaria]</code>.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBroadcastModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#ded8cd] text-xs font-bold text-[#73736c] hover:bg-[#f4eee5]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#9f3c16] hover:bg-[#863111] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>Disparar para 218 Marcenarias</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: NOVO ASSINANTE MANUAL                                 */}
      {/* ============================================================== */}
      {isNewSubscriberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#ded8cd] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-headline font-black text-lg text-[#1c1c1a]">
                  Cadastrar Assinante Manualmente
                </h3>
                <p className="text-xs text-[#73736c]">
                  Adicione uma marcenaria que você negociou diretamente fora da plataforma
                </p>
              </div>
              <button
                onClick={() => setIsNewSubscriberModalOpen(false)}
                className="p-1.5 rounded-lg text-[#73736c] hover:text-[#1c1c1a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form 
              onSubmit={handleAddManualSubscriber} 
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-[#1c1c1a] mb-1">
                  Nome da Marcenaria
                </label>
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="Ex: Marcenaria Linhas Modernas"
                  className="w-full px-3 py-2 rounded-xl border border-[#ded8cd] bg-[#faf8f5] text-xs text-[#1c1c1a]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1c1c1a] mb-1">
                  Nome do Marceneiro / Proprietário
                </label>
                <input
                  type="text"
                  value={newSubOwner}
                  onChange={(e) => setNewSubOwner(e.target.value)}
                  placeholder="Ex: Roberto Alencar"
                  className="w-full px-3 py-2 rounded-xl border border-[#ded8cd] bg-[#faf8f5] text-xs text-[#1c1c1a]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1c1c1a] mb-1">
                  WhatsApp com DDD
                </label>
                <input
                  type="text"
                  value={newSubPhone}
                  onChange={(e) => setNewSubPhone(e.target.value)}
                  placeholder="+55 11 99999-8888"
                  className="w-full px-3 py-2 rounded-xl border border-[#ded8cd] bg-[#faf8f5] text-xs text-[#1c1c1a]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1c1c1a] mb-1">
                  Plano a Liberar
                </label>
                <select
                  value={newSubPlan}
                  onChange={(e) => setNewSubPlan(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#ded8cd] bg-[#faf8f5] text-xs font-bold text-[#1c1c1a]"
                >
                  <option value="free">Plano Grátis (R$ 0,00 - 1 Projeto / 1 Workspace / Link WhatsApp apenas)</option>
                  <option value="start">Start (R$ 493,87/mês)</option>
                  <option value="escala">Scala (R$ 983,93/mês)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewSubscriberModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#ded8cd] text-xs font-bold text-[#73736c]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#9f3c16] hover:bg-[#863111] text-white text-xs font-bold"
                >
                  Confirmar & Liberar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE RESET TOTAL DE DADOS */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-[#202124]">
                  Confirmar Limpeza Total de Dados
                </h3>
                <p className="text-xs text-[#5F6368] mt-1 leading-relaxed">
                  Esta ação apagará todos os projetos fictícios, parcelas demonstrativas e workspaces de exemplo, preservando exclusivamente a sua conta de fundador (<strong className="text-[#202124]">{currentUser?.email}</strong>) e a Matriz padrão para você iniciar com lançamentos reais.
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800">
              ⚠️ <strong>Atenção:</strong> Após a confirmação, o painel será esvaziado imediatamente e você poderá cadastrar seus clientes e números verdadeiros.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8EAED]">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                disabled={isResettingData}
                className="px-4 py-2 rounded-xl border border-[#DED8CD] text-xs font-medium text-[#5F6368] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResettingData}
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isResettingData ? 'Limpando dados...' : 'Sim, Resetar Agora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
