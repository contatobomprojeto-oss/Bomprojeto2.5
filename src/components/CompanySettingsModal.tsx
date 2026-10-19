import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Users, 
  Phone, 
  Save, 
  Check, 
  Trash2, 
  AlertTriangle,
  Crown,
  Sparkles
} from 'lucide-react';
import { UserProfile, isSaasOwner, TeamRole, TeamMember, SubscriptionPlan, Workspace } from '../types';
import { TeamManagementSection } from './TeamManagementSection';
import { SectorsAndAiSection } from './SectorsAndAiSection';
import { ProjectTemplate } from '../schemas/projectPersistenceSchemas';
import { detectPixKeyType } from '../utils/pixService';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSaveSettings: (settings: {
    workshopName: string;
    cnpj: string;
    phone: string;
    pixKey: string;
  }) => void;
  onResetData?: () => Promise<void>;
  initialTab?: 'general' | 'team' | 'nichos';
  plan?: SubscriptionPlan;
  workspaces?: Workspace[];
  teamMembers?: TeamMember[];
  currentRole?: TeamRole;
  onRoleChange?: (role: TeamRole) => void;
  onInviteMember?: (data: {
    name: string;
    email: string;
    role: TeamRole;
    phone?: string;
    workspaceAccess: 'all' | string[];
  }) => Promise<{ inviteLink?: string; message?: string }>;
  onUpdateMemberRole?: (memberId: string, role: TeamRole) => Promise<void>;
  onRemoveMember?: (memberId: string) => Promise<void>;
  onResendInvite?: (memberId: string) => Promise<{ inviteLink?: string }>;
  onOpenSubscriptionModal?: () => void;
  activeSectorTemplate?: ProjectTemplate | null;
  onTemplateSelected?: (template: ProjectTemplate) => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveSettings,
  onResetData,
  initialTab = 'general',
  plan = 'start',
  workspaces = [],
  teamMembers = [],
  currentRole = 'ceo',
  onRoleChange = () => {},
  onInviteMember = async () => ({}),
  onUpdateMemberRole = async () => {},
  onRemoveMember = async () => {},
  onResendInvite = async () => ({}),
  onOpenSubscriptionModal = () => {},
  activeSectorTemplate,
  onTemplateSelected
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'nichos'>(initialTab);
  const userEmail = currentUser?.email?.toLowerCase().trim() || '';
  const [workshopName, setWorkshopName] = useState(() => currentUser?.workshopName || '');
  const [cnpj, setCnpj] = useState(() => {
    try {
      if (!userEmail) return '';
      return localStorage.getItem(`bomprojeto_company_cnpj_${userEmail}`) || '';
    } catch {
      return '';
    }
  });
  const [phone, setPhone] = useState(() => {
    try {
      if (!userEmail) return '';
      return localStorage.getItem(`bomprojeto_company_phone_${userEmail}`) || currentUser?.phone || '';
    } catch {
      return '';
    }
  });
  const [pixKey, setPixKey] = useState(() => {
    if (currentUser?.pixKey) return currentUser.pixKey;
    try {
      if (!userEmail) return '';
      return localStorage.getItem(`bomprojeto_company_pix_key_${userEmail}`) || '';
    } catch {
      return '';
    }
  });
  const [saved, setSaved] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (currentUser?.workshopName) {
        setWorkshopName(currentUser.workshopName);
      }
      try {
        if (userEmail) {
          setCnpj(localStorage.getItem(`bomprojeto_company_cnpj_${userEmail}`) || '');
          setPhone(localStorage.getItem(`bomprojeto_company_phone_${userEmail}`) || currentUser?.phone || '');
          setPixKey(currentUser?.pixKey || localStorage.getItem(`bomprojeto_company_pix_key_${userEmail}`) || '');
        } else {
          setCnpj('');
          setPhone('');
          setPixKey('');
        }
      } catch {}
    }
  }, [isOpen, initialTab, currentUser, userEmail]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('bomprojeto_company_pix_key', pixKey.trim());
      if (userEmail) {
        localStorage.setItem(`bomprojeto_company_cnpj_${userEmail}`, cnpj);
        localStorage.setItem(`bomprojeto_company_phone_${userEmail}`, phone);
        localStorage.setItem(`bomprojeto_company_pix_key_${userEmail}`, pixKey.trim());
      }
      fetch('/api/company/pix-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixKey: pixKey.trim(),
          beneficiaryName: workshopName.trim()
        })
      }).catch(() => {});
    } catch {}
    onSaveSettings({
      workshopName,
      cnpj,
      phone,
      pixKey
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const handleExecuteReset = async () => {
    if (!onResetData) return;
    setIsResetting(true);
    try {
      await onResetData();
      setShowConfirmReset(false);
      onClose();
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`bg-white rounded-2xl sm:rounded-3xl w-full shadow-2xl border border-[#EAECEF] flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-150 ${
        activeTab === 'team' || activeTab === 'nichos' ? 'max-w-3xl' : 'max-w-xl'
      }`}>
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#EAECEF] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
              {activeTab === 'team' ? (
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : activeTab === 'nichos' ? (
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-[#0F172A] tracking-tight">
                Configurações do Sistema
              </h2>
              <p className="text-[11px] sm:text-xs text-[#64748B]">
                {activeTab === 'team'
                  ? 'Modo Time: Defina pessoas, e-mails e permissões de acesso'
                  : activeTab === 'nichos'
                  ? 'Nichos & IA: Selecione seu segmento e gere réguas automáticas com IA'
                  : 'Identidade da empresa, dados fiscais e integração Pix'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-[#F8F9FA] text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Subheader Sticky) */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-[#EAECEF] bg-[#F8F9FA]/60 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl sm:rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`
                py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap
                ${activeTab === 'general' 
                  ? 'bg-[#111827] text-white shadow-xs' 
                  : 'text-[#64748B] hover:text-[#0F172A]'
                }
              `}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Dados da Empresa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('nichos')}
              className={`
                py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap
                ${activeTab === 'nichos' 
                  ? 'bg-[#111827] text-white shadow-xs' 
                  : 'text-[#64748B] hover:text-[#0F172A]'
                }
              `}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nichos &amp; IA</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`
                py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer relative whitespace-nowrap
                ${activeTab === 'team' 
                  ? 'bg-[#111827] text-white shadow-xs' 
                  : 'text-[#64748B] hover:text-[#0F172A]'
                }
              `}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Modo Time</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#334155] text-white">
                {teamMembers.length}
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">

        {/* Tab 1: General Company Settings */}
        {activeTab === 'general' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1.5">
                Nome da Empresa / Gestão de Projetos
              </label>
              <input
                type="text"
                required
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                placeholder="Ex: Minha Empresa de Projetos & Execução"
                className="w-full h-11 px-3.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:ring-2 focus:ring-slate-900/10 text-xs font-semibold text-[#0F172A] focus:outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:ring-2 focus:ring-slate-900/10 text-xs font-mono text-[#0F172A] focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5">
                  WhatsApp de Disparo Automático
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55 (11) 99999-9999"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:ring-2 focus:ring-slate-900/10 text-xs text-[#0F172A] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-[#0F172A]">
                  Chave Pix Padrão (Recebimento dos Clientes)
                </label>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {detectPixKeyType(pixKey).label}
                </span>
              </div>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Ex: seu-email@empresa.com, CNPJ, CPF, celular ou chave aleatória"
                className="w-full h-11 px-3.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:ring-2 focus:ring-slate-900/10 text-xs font-mono text-[#0F172A] focus:outline-none transition-all"
              />
              <p className="text-[11px] text-[#64748B] mt-1.5">
                Essa chave será utilizada para gerar automaticamente o QR Code oficial e o código Pix Copia e Cola para cada um dos seus clientes.
              </p>
            </div>

            {/* Ações */}
            <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between">
              {onResetData && (
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(true)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Restaurar Padrões de Fábrica</span>
                </button>
              )}

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="fleetly-btn-secondary py-2.5 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="fleetly-btn-primary py-2.5 px-5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Salvo com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Configurações</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Nichos & IA */}
        {activeTab === 'nichos' && (
          <SectorsAndAiSection 
            initialCompanyName={workshopName}
            activeSectorTemplate={activeSectorTemplate}
            onTemplateSelected={onTemplateSelected}
          />
        )}

        {/* Tab 3: Modo Time */}
        {activeTab === 'team' && (
          <TeamManagementSection
            plan={plan}
            teamMembers={teamMembers}
            workspaces={workspaces}
            currentRole={currentRole}
            onRoleChange={onRoleChange}
            onInviteMember={onInviteMember}
            onUpdateMemberRole={onUpdateMemberRole}
            onRemoveMember={onRemoveMember}
            onResendInvite={onResendInvite}
            onOpenSubscriptionModal={onOpenSubscriptionModal}
          />
        )}
        </div>

        {/* Confirmação de Reset Modal */}
        {showConfirmReset && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-rose-200">
              <div className="flex items-center gap-2.5 text-rose-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="font-bold text-sm">Zerar Dados e Restaurar?</h4>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Essa ação irá limpar os projetos de teste locais e reiniciar os dados para a versão padrão de demonstração. Tem certeza?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAECEF]">
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="fleetly-btn-secondary py-1.5 px-3 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReset}
                  disabled={isResetting}
                  className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  {isResetting ? 'Restaurando...' : 'Sim, Restaurar'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
