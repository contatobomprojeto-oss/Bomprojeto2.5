import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Plus, 
  CheckCircle2, 
  Sparkles, 
  Trash2, 
  Hammer, 
  ShieldCheck, 
  Layers, 
  MapPin, 
  Phone, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Zap,
  Lock
} from 'lucide-react';
import { Workspace, WorkspaceSegment, SubscriptionPlan } from '../types';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  currentWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (data: {
    name: string;
    segment: WorkspaceSegment;
    segmentLabel: string;
    type: 'matriz' | 'filial' | 'segmento';
    city?: string;
    state?: string;
    phone?: string;
    address?: string;
    colorTheme?: string;
  }) => boolean | Promise<boolean>;
  onDeleteWorkspace: (id: string) => void | Promise<void>;
  plan: SubscriptionPlan;
  userEmail?: string;
  onChangePlan?: (plan: SubscriptionPlan) => void;
  onOpenSubscriptionModal?: () => void;
}

const SEGMENT_OPTIONS: { id: WorkspaceSegment; label: string; icon: string; desc: string }[] = [
  { id: 'marketing_agency', label: 'Agência de Marketing / Publicidade', icon: '🚀', desc: 'Campanhas, branding, conteúdo, criativos e performance' },
  { id: 'ai_agency', label: 'Agência / Consultoria de Automação & IA', icon: '🤖', desc: 'Agentes inteligentes, fluxos n8n/Make, webhooks e APIs' },
  { id: 'media_buyer', label: 'Gestor de Tráfego / Media Buyer', icon: '🎯', desc: 'Tráfego pago Meta/Google Ads, GA4, GTM e escala de ROAS' },
  { id: 'projetos', label: 'Projetos Digitais & Sprints', icon: '⚡', desc: 'Roadmaps, squad ágil e entregáveis por milestone' }
];

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  workspaces,
  currentWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  plan,
  userEmail,
  onChangePlan,
  onOpenSubscriptionModal
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  
  // New Workspace form state
  const [name, setName] = useState('');
  const [segment, setSegment] = useState<WorkspaceSegment>('marketing_agency');
  const [type, setType] = useState<'matriz' | 'filial' | 'segmento'>('segmento');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [phone, setPhone] = useState('+55 (11) 97100-2244');
  const [address, setAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const guard = useSubscriptionGuard({
    plan,
    userEmail,
    onOpenUpgradeModal: onOpenSubscriptionModal
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const workspaceAccess = guard.canManageMultipleWorkspaces(workspaces.length);
  const isLimitReached = !workspaceAccess.allowed;
  const maxWorkspaces = workspaceAccess.maxAllowed || (guard.isFounder ? 99 : (plan === 'escala' ? 6 : plan === 'start' ? 3 : 1));
  const quotaPercent = guard.isFounder 
    ? Math.min(100, (workspaces.length / 6) * 100) 
    : Math.min(100, (workspaces.length / maxWorkspaces) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Por favor informe o nome do ambiente.');
      return;
    }

    if (isLimitReached) {
      const msg = workspaceAccess.message || `Limite de ${maxWorkspaces} workspace(s) atingido para o seu plano atual.`;
      setErrorMsg(msg);
      if (onOpenSubscriptionModal) {
        onOpenSubscriptionModal();
      }
      return;
    }

    const selectedSeg = SEGMENT_OPTIONS.find(s => s.id === segment);
    const success = await onCreateWorkspace({
      name: name.trim(),
      segment,
      segmentLabel: selectedSeg?.label || 'Outro Segmento',
      type,
      city: `${city} - ${state}`.trim(),
      state,
      phone: phone.trim(),
      address: address.trim()
    });

    if (success) {
      setName('');
      setErrorMsg('');
      setActiveTab('list');
    } else {
      setErrorMsg(workspaceAccess.message || `Limite de ${maxWorkspaces} workspace(s) atingido.`);
      if (onOpenSubscriptionModal) {
        onOpenSubscriptionModal();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-[#EAECEF] max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#EAECEF] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-[#0F172A] tracking-tight">
                Gestão de Workspaces (Ambientes & Filiais)
              </h2>
              <p className="text-[11px] sm:text-xs text-[#64748B]">
                Separe suas ordens de serviço por filial ou segmento independente.
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

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4 sm:space-y-5">

        {/* Plan Quota Banner */}
        <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#111827] text-white">
                  Seu Plano: {plan === 'escala' ? 'Plano Scala' : plan === 'start' ? 'Plano Start' : 'Plano Grátis'}
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  {plan === 'escala' ? 'Até 6 Workspaces' : plan === 'start' ? 'Até 3 Workspaces' : '1 Workspace'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                <strong className="text-[#0F172A]">{workspaces.length} de {maxWorkspaces} Workspaces</strong> em uso no sistema.
              </p>
            </div>

            {/* Plan Indicator & Upgrade Action */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#EAECEF] text-xs">
                <span className="text-[11px] font-medium text-[#64748B]">Plano:</span>
                <span className="font-bold uppercase text-[#0F172A]">
                  {plan === 'free' ? 'Grátis' : plan === 'start' ? 'Start' : 'Scala'}
                </span>
              </div>
              {plan !== 'escala' && onOpenSubscriptionModal && (
                <button
                  type="button"
                  onClick={onOpenSubscriptionModal}
                  className="fleetly-btn-primary py-1.5 px-3 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Fazer Upgrade</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-2 rounded-full bg-[#EAECEF] overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  isLimitReached ? 'bg-amber-500' : 'bg-[#111827]'
                }`}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#94A3B8]">
              <span>Disponíveis: {Math.max(0, maxWorkspaces - workspaces.length)} vagas</span>
              <span>Capacidade máxima: {maxWorkspaces} ambientes</span>
            </div>
          </div>

          {isLimitReached && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {plan === 'free' 
                    ? 'Limite de 1 Workspace atingido no Plano Grátis. Assine o Plano Start para até 3 unidades.'
                    : 'Limite de 3 Workspaces atingido no Plano Start. Assine o Plano Scala para até 6 unidades.'}
                </span>
              </div>
              {onOpenSubscriptionModal && (
                <button
                  type="button"
                  onClick={onOpenSubscriptionModal}
                  className="px-3 py-1.5 bg-[#111827] hover:bg-black text-white font-bold rounded-lg shrink-0 transition-colors cursor-pointer text-xs"
                >
                  Adquirir Plano Pago
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation (Fleetly Pill Tabs) */}
        <div className="bg-[#F1F5F9] p-1 rounded-2xl flex items-center gap-1 max-w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-[#111827] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Ambiente</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-[#111827] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Ambientes Cadastrados ({workspaces.length})</span>
          </button>
        </div>

        {/* TAB 1: Cadastrar Novo Workspace */}
        {activeTab === 'create' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isLimitReached && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <h4 className="font-bold text-xs text-amber-900">
                    Limite de Workspaces Atingido ({workspaces.length} de {maxWorkspaces})
                  </h4>
                </div>
                <p className="text-xs text-amber-800">
                  {workspaceAccess.message || 'Faça upgrade do seu plano para liberar mais filiais e ambientes.'}
                </p>
                {onOpenSubscriptionModal && (
                  <button
                    type="button"
                    onClick={onOpenSubscriptionModal}
                    className="fleetly-btn-primary py-2 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer mt-1"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Liberar Múltiplos Workspaces</span>
                  </button>
                )}
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Nome do Ambiente / Filial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marcenaria Ferraz - Filial Pinheiros"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Tipo de Ambiente
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'filial', label: 'Filial' },
                    { id: 'segmento', label: 'Novo Segmento' },
                    { id: 'matriz', label: 'Matriz' },
                  ].map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setType(t.id as any)}
                      className={`h-11 px-1 text-center rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        type === t.id
                          ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                          : 'bg-[#F8F9FA] border-[#EAECEF] text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Segmento */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Segmento de Atuação
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SEGMENT_OPTIONS.map((seg) => (
                  <div
                    key={seg.id}
                    onClick={() => setSegment(seg.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                      segment === seg.id
                        ? 'border-[#0F172A] bg-[#F1F5F9] shadow-xs'
                        : 'border-[#EAECEF] bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <span className="text-xl">{seg.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0F172A] truncate">{seg.label}</p>
                      <p className="text-[10px] text-[#64748B] truncate">{seg.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Localização e Contato */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="SP"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white text-xs text-[#0F172A] uppercase font-mono placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  WhatsApp do Ambiente
                </label>
                <input
                  type="text"
                  placeholder="+55 (11) 98765-4321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Endereço / Bairro (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Galpão 3 - Av. Industrial, 1400"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAECEF]">
              <button
                type="button"
                onClick={onClose}
                className="fleetly-btn-secondary py-2.5 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isLimitReached}
                className="fleetly-btn-primary py-2.5 px-5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Salvar & Liberar Workspace</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Ambientes Cadastrados */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {workspaces.map((ws) => {
                const isActive = ws.id === currentWorkspaceId;
                const segInfo = SEGMENT_OPTIONS.find(s => s.id === ws.segment);

                return (
                  <div
                    key={ws.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isActive 
                        ? 'border-[#0F172A] bg-[#F8F9FA] shadow-xs' 
                        : 'border-[#EAECEF] bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{segInfo?.icon || '🏢'}</span>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-[#0F172A]">
                              {ws.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] capitalize">
                                {ws.type}
                              </span>
                              <span className="text-[10px] text-[#64748B]">{ws.city || 'São Paulo - SP'}</span>
                            </div>
                          </div>
                        </div>

                        {isActive && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            Ativo
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#64748B] mt-2 space-y-0.5">
                        <p>Segmento: <strong className="text-[#0F172A]">{ws.segmentLabel}</strong></p>
                        {ws.phone && <p>Contato: {ws.phone}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#EAECEF]">
                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectWorkspace(ws.id);
                            onClose();
                          }}
                          className="fleetly-btn-primary py-1.5 px-3 text-xs font-semibold cursor-pointer"
                        >
                          Entrar neste Workspace
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600">Ambiente em Uso</span>
                      )}

                      {workspaces.length > 1 && !ws.isDefault && (
                        <button
                          type="button"
                          onClick={() => onDeleteWorkspace(ws.id)}
                          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remover este workspace"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between">
              <span className="text-xs text-[#64748B]">
                {workspaces.length} de {maxWorkspaces} ambientes ocupados
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                disabled={isLimitReached}
                className="fleetly-btn-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar outro</span>
              </button>
            </div>
          </div>
        )}

        </div>

      </div>
    </div>
  );
};
