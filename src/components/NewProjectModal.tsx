import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Layers, 
  Plus, 
  DollarSign, 
  Calendar, 
  User, 
  Phone, 
  FileText,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
  Lock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  QrCode,
  Receipt,
  Sparkles,
  Bot,
  MessageSquare,
  HelpCircle,
  Check,
  Key,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Edit3
} from 'lucide-react';
import { Project, Workspace, SubscriptionPlan, TeamRole } from '../types';
import { NICHE_TEMPLATES, getTemplateById } from '../utils/nicheTemplates';
import { canCreateProject, getPlanLimits } from '../utils/planRules';
import { validateDateFormat, validateFinancialValue } from '../utils/apiValidator';
import { BillingModel, ProjectPaymentMethod } from '../schemas/projectPersistenceSchemas';
import { detectPixKeyType } from '../utils/pixService';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces?: Workspace[];
  currentWorkspaceId?: string;
  plan?: SubscriptionPlan;
  activeProjectsCount?: number;
  onUpgradePlan?: () => void;
  currentRole?: TeamRole;
  userEmail?: string;
  activeSectorTemplate?: any;
  onCreateProject: (data: {
    clientName: string;
    clientPhone: string;
    title: string;
    category: Project['category'];
    totalValue: number;
    deliveryDate: string;
    workspaceId?: string;
    workspaceName?: string;
    templateId?: string;
    industrySector?: string;
    pixKey?: string;
    stages?: any[];
    billingData?: {
      billing_model: BillingModel;
      payment_method: ProjectPaymentMethod;
      total_amount: number;
      installments_count?: number;
      milestones?: Array<{ stage_id: string; stage_name?: string; percentage?: number; amount?: number }>;
    };
  }) => Promise<void>;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  workspaces = [],
  currentWorkspaceId,
  plan = 'start',
  activeProjectsCount = 0,
  onUpgradePlan,
  currentRole = 'ceo',
  userEmail,
  activeSectorTemplate,
  onCreateProject
}) => {
  const [clientName, setClientName] = useState(() => {
    try {
      return sessionStorage.getItem('bomprojeto_draft_clientName') || '';
    } catch {
      return '';
    }
  });
  const [clientPhone, setClientPhone] = useState(() => {
    try {
      return sessionStorage.getItem('bomprojeto_draft_clientPhone') || '+55 11 9';
    } catch {
      return '+55 11 9';
    }
  });
  const [title, setTitle] = useState(() => {
    try {
      return sessionStorage.getItem('bomprojeto_draft_title') || '';
    } catch {
      return '';
    }
  });
  const [category, setCategory] = useState<Project['category']>(() => {
    if (activeSectorTemplate?.sector_key) {
      return activeSectorTemplate.sector_key as Project['category'];
    }
    return 'media_buyer';
  });
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(currentWorkspaceId || (workspaces[0]?.id || 'ws-matriz'));
  const [totalValue, setTotalValue] = useState(() => {
    try {
      return sessionStorage.getItem('bomprojeto_draft_totalValue') || '14500';
    } catch {
      return '14500';
    }
  });

  // Salva rascunho automaticamente para proteção contra perda acidental
  useEffect(() => {
    try {
      if (clientName) sessionStorage.setItem('bomprojeto_draft_clientName', clientName);
      if (clientPhone) sessionStorage.setItem('bomprojeto_draft_clientPhone', clientPhone);
      if (title) sessionStorage.setItem('bomprojeto_draft_title', title);
      if (totalValue) sessionStorage.setItem('bomprojeto_draft_totalValue', totalValue);
    } catch {}
  }, [clientName, clientPhone, title, totalValue]);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem('bomprojeto_draft_clientName');
      sessionStorage.removeItem('bomprojeto_draft_clientPhone');
      sessionStorage.removeItem('bomprojeto_draft_title');
      sessionStorage.removeItem('bomprojeto_draft_totalValue');
    } catch {}
  };

  const handleCancel = () => {
    clearDraft();
    setClientName('');
    setClientPhone('+55 11 9');
    setTitle('');
    onClose();
  };

  // Helpers para o seletor de calendário e padrão brasileiro (DD/MM/AAAA)
  const formatToYmd = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatYmdToBr = (ymd: string): string => {
    if (!ymd) return '';
    const parts = ymd.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return ymd;
  };

  const todayYmd = useMemo(() => formatToYmd(new Date()), []);

  // Previsão padrão: 30 dias a partir da data atual
  const [deliveryDateYmd, setDeliveryDateYmd] = useState<string>(() => {
    const target = new Date();
    target.setDate(target.getDate() + 30);
    return formatToYmd(target);
  });

  const [deliveryDateFormatted, setDeliveryDateFormatted] = useState<string>(() => {
    return formatYmdToBr(deliveryDateYmd);
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setDeliveryDateFormatted(formatYmdToBr(deliveryDateYmd));
    setFormError(null);
  }, [deliveryDateYmd]);

  // Bloqueio intencional de Escape: o modal só fecha ao clicar nos botões explícitos
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useAiTemplate, setUseAiTemplate] = useState<boolean>(Boolean(activeSectorTemplate));
  const [previewExpandedStageIdx, setPreviewExpandedStageIdx] = useState<number | null>(null);

  // Sincroniza se activeSectorTemplate for atualizado
  useEffect(() => {
    if (activeSectorTemplate) {
      setUseAiTemplate(true);
      if (activeSectorTemplate.sector_key) {
        setCategory(activeSectorTemplate.sector_key as Project['category']);
      }
    }
  }, [activeSectorTemplate]);

  // Estados do Módulo Financeiro Flexível
  const [isFinancialAccordionOpen, setIsFinancialAccordionOpen] = useState(true);
  const [billingModel, setBillingModel] = useState<BillingModel>('installments');
  const [paymentMethod, setPaymentMethod] = useState<ProjectPaymentMethod>('pix');
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [pixKey, setPixKey] = useState<string>(() => {
    try {
      return localStorage.getItem('bomprojeto_company_pix_key') || '';
    } catch {
      return '';
    }
  });

  if (!isOpen) return null;

  const quotaCheck = canCreateProject(plan, activeProjectsCount, userEmail);
  const planDetails = getPlanLimits(plan);
  const selectedTemplate = getTemplateById(category);
  const numericTotal = Number(totalValue) || 10000;

  // Resolve as etapas específicas do nicho selecionado (com suporte a customização salva pelo assinante)
  const resolveStagesForCategory = (cat: string) => {
    // 1. Verifica se o assinante tem customização salva deste nicho específico no navegador
    try {
      const saved = localStorage.getItem(`bomprojeto_niche_custom_${cat}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.stages?.length) {
          return parsed.stages.map((stg: any, idx: number) => ({
            id: `stg-${idx + 1}-${Date.now().toString().slice(-4)}`,
            name: (stg.stage_name || stg.name || `Etapa ${idx + 1}`).replace(/^\d+[\.\-\)]\s*/, '').trim(),
            description: stg.objective || stg.description || '',
            action_type: stg.action_type || (idx === 0 ? 'billing_payment' : 'notification_only'),
            whatsapp_template: stg.whatsapp_template || '',
            ai_context_instruction: stg.ai_context_instruction || '',
            detail: idx === 0 ? 'Projeto aprovado' : idx === 1 ? 'Em andamento' : undefined
          }));
        }
      }
    } catch {}

    // 2. Se houver template ativo global no workspace para este nicho
    if (activeSectorTemplate && (activeSectorTemplate.sector_key === cat || activeSectorTemplate.category === cat) && activeSectorTemplate.stages?.length) {
      return activeSectorTemplate.stages.map((stg: any, idx: number) => ({
        id: stg.id || `stg-ai-${idx + 1}`,
        name: (stg.stage_name || stg.name || `Etapa ${idx + 1}`).replace(/^\d+[\.\-\)]\s*/, '').trim(),
        description: stg.objective || stg.description || '',
        action_type: stg.action_type || (idx === 0 ? 'billing_payment' : 'notification_only'),
        whatsapp_template: stg.whatsapp_template || '',
        ai_context_instruction: stg.ai_context_instruction || '',
        detail: idx === 0 ? 'Projeto aprovado' : idx === 1 ? 'Em andamento' : undefined
      }));
    }

    // 3. Fallback para template nativo enriquecido do nicho selecionado
    const tmpl = getTemplateById(cat);
    return tmpl.defaultStages.map((stg: any, idx: number) => ({
      id: `stg-niche-${idx + 1}`,
      name: stg.name.replace(/^\d+[\.\-\)]\s*/, '').trim(),
      description: stg.description,
      action_type: stg.action_type || (idx === 0 ? 'billing_payment' : idx === tmpl.defaultStages.length - 1 ? 'billing_payment' : 'notification_only'),
      whatsapp_template: stg.whatsapp_template || '',
      ai_context_instruction: stg.ai_context_instruction || '',
      detail: stg.detail
    }));
  };

  const [projectStages, setProjectStages] = useState<any[]>(() => resolveStagesForCategory(category));
  const [isCustomizingStages, setIsCustomizingStages] = useState(false);

  // Sincroniza etapas sempre que o nicho mudar
  useEffect(() => {
    setProjectStages(resolveStagesForCategory(category));
  }, [category, activeSectorTemplate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!quotaCheck.allowed) {
      if (onUpgradePlan) onUpgradePlan();
      return;
    }

    if (!clientName.trim()) {
      setFormError('O Nome do Cliente é obrigatório e não pode ficar em branco.');
      return;
    }
    if (!title.trim()) {
      setFormError('O Título do Projeto é obrigatório e não pode ficar em branco.');
      return;
    }

    const valCheck = validateFinancialValue(totalValue, 'Valor Total do Projeto', { min: 1, allowZero: false });
    if (!valCheck.isValid) {
      setFormError(valCheck.error || 'Valor financeiro do projeto inválido.');
      return;
    }

    const dateCheck = validateDateFormat(deliveryDateFormatted, 'Prazo Previsto de Entrega', true);
    if (!dateCheck.isValid) {
      setFormError(dateCheck.error || 'Data prevista de entrega inválida.');
      return;
    }

    const effectiveTotal = valCheck.cleanValue!;
    const effectiveDeliveryDate = dateCheck.cleanValue!;

    const chosenWs = workspaces.find(w => w.id === selectedWorkspaceId);

    setIsSubmitting(true);
    try {
      await onCreateProject({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        title: title.trim(),
        category: category,
        totalValue: effectiveTotal,
        deliveryDate: effectiveDeliveryDate,
        workspaceId: selectedWorkspaceId,
        workspaceName: chosenWs?.name,
        templateId: selectedTemplate.id,
        industrySector: category,
        pixKey: pixKey.trim() || undefined,
        stages: projectStages.map((stg: any, idx: number) => ({
          id: `s-${idx + 1}-${Date.now().toString().slice(-4)}`,
          name: stg.name,
          description: stg.description,
          status: idx === 0 ? 'completed' : idx === 1 ? 'current' : 'upcoming',
          date: idx === 0 ? new Date().toLocaleDateString('pt-BR') : idx === projectStages.length - 1 ? effectiveDeliveryDate : undefined,
          detail: idx === 1 ? 'Em andamento' : undefined,
          whatsapp_template: stg.whatsapp_template,
          ai_context_instruction: stg.ai_context_instruction,
          action_type: stg.action_type
        })),
        billingData: {
          billing_model: billingModel,
          payment_method: paymentMethod,
          total_amount: effectiveTotal,
          installments_count: billingModel === 'single_payment' ? 1 : installmentsCount,
          milestones: billingModel === 'milestone_based' ? projectStages.map((stg: any, i: number) => ({
            stage_id: `stage-${i + 1}`,
            stage_name: stg.name,
            percentage: Math.round(100 / projectStages.length)
          })) : undefined
        }
      });
      clearDraft();
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Falha ao salvar projeto. Verifique os dados e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden font-sans select-none animate-in fade-in duration-150"
      onClick={(e) => {
        // Bloqueio intencional: NÃO fecha ao clicar fora da tela.
        // O modal só pode fechar ao clicar no botão de cadastro (Criar Projeto) ou em Cancelar.
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-[#EAECEF] max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Sticky Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#EAECEF] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#0F172A] tracking-tight">Cadastrar Novo Projeto</h3>
              <p className="text-[11px] sm:text-xs text-[#64748B]">Inicia cronograma do projeto, link sem senha e parcelas Pix</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleCancel} 
            className="p-1.5 sm:p-2 rounded-xl hover:bg-[#F8F9FA] text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer"
            aria-label="Fechar"
            title="Cancelar cadastro"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4">
            {/* Quota limit warning or status banner */}
            {!quotaCheck.allowed ? (
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-rose-950">
                      Limite de Projetos Atingido ({activeProjectsCount}/{quotaCheck.maxAllowed})
                    </p>
                    <p className="text-rose-800 leading-relaxed text-[11px] sm:text-xs">
                      O seu <strong className="font-semibold">{planDetails.name}</strong> permite até {quotaCheck.maxAllowed} projeto(s) ativo(s) simultâneo(s). Para cadastrar mais projetos e liberar automações adicionais, faça o upgrade de plano.
                    </p>
                  </div>
                </div>

                {onUpgradePlan && (
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onUpgradePlan();
                      }}
                      className="fleetly-btn-primary py-2 px-3.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Fazer Upgrade de Plano</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs text-[#64748B]">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Plano {planDetails.name}: <strong className="text-[#0F172A]">{activeProjectsCount}</strong> de <strong className="text-[#0F172A]">{quotaCheck.maxAllowed === 9999 ? 'Ilimitados' : quotaCheck.maxAllowed}</strong> projetos ativos</span>
                </span>
                <span className="text-[#94A3B8] font-medium hidden sm:inline">
                  {quotaCheck.maxAllowed === 9999 ? 'Sem limite' : `${quotaCheck.maxAllowed - activeProjectsCount} vaga(s) restante(s)`}
                </span>
              </div>
            )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Nome do Cliente *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Dra. Mariana Costa"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-[#0F172A] text-[#0F172A] placeholder:text-[#94A3B8] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">WhatsApp do Cliente *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                <input
                  type="text"
                  required
                  placeholder="+55 11 99999-8888"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-[#0F172A] text-[#0F172A] placeholder:text-[#94A3B8] transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Descrição / Título do Projeto *</label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3.5 top-3.5 text-[#94A3B8]" />
              <textarea
                rows={2}
                required
                placeholder="Ex: Gestão de Tráfego Pago Meta/Google - Escala Q3 ou Sprint Automação n8n/Make"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-[#0F172A] text-[#0F172A] placeholder:text-[#94A3B8] transition-all"
              />
            </div>
          </div>

          {workspaces.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Ambiente / Workspace de Destino
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0F172A]" />
                <select
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 text-xs font-medium rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-[#0F172A] transition-all"
                >
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.segmentLabel} • {w.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Niche & Template Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Nicho &amp; Cronograma do Projeto *
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Fluxo Próprio do Nicho
              </span>
            </div>
            <select
              value={category}
              onChange={(e) => {
                const newCat = e.target.value as Project['category'];
                setCategory(newCat);
              }}
              className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-[#0F172A] transition-all"
            >
              {NICHE_TEMPLATES.map(tmpl => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name} ({tmpl.badge})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#64748B] mt-1.5">
              {selectedTemplate.description}
            </p>
          </div>

          {/* Workflow Stages: Customizável pelo Assinante */}
          <div className="bg-[#F8F9FA] border border-[#EAECEF] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#0F172A]" />
                <span>
                  Etapas do Cronograma ({projectStages.length} etapas)
                </span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomizingStages(!isCustomizingStages)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                    isCustomizingStages
                      ? 'bg-[#111827] text-white border-[#111827]'
                      : 'bg-white text-[#475569] border-[#EAECEF] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isCustomizingStages ? 'Concluir Edição' : 'Personalizar Etapas'}</span>
                </button>
              </div>
            </div>

            {/* Modo de Edição Ativo */}
            {isCustomizingStages ? (
              <div className="space-y-2.5">
                {projectStages.map((stg: any, sIdx: number) => (
                  <div key={sIdx} className="bg-white p-3 rounded-xl border border-[#EAECEF] shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0F172A]">Etapa {sIdx + 1}</span>
                      <div className="flex items-center gap-1">
                        {projectStages.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setProjectStages(prev => prev.filter((_, idx) => idx !== sIdx));
                            }}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50"
                            title="Remover etapa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5">Nome da Etapa</label>
                        <input
                          type="text"
                          value={stg.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProjectStages(prev => {
                              const updated = [...prev];
                              updated[sIdx] = { ...updated[sIdx], name: val };
                              return updated;
                            });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white text-[#0F172A] font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5">Ação Vinculada</label>
                        <select
                          value={stg.action_type || 'notification_only'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProjectStages(prev => {
                              const updated = [...prev];
                              updated[sIdx] = { ...updated[sIdx], action_type: val };
                              return updated;
                            });
                          }}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white text-[#0F172A]"
                        >
                          <option value="billing_payment">💳 Cobrança Pix</option>
                          <option value="approval_request">✍️ Aprovação 3D</option>
                          <option value="notification_only">🔔 Notificação</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5">Objetivo / Descrição</label>
                      <input
                        type="text"
                        value={stg.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProjectStages(prev => {
                            const updated = [...prev];
                            updated[sIdx] = { ...updated[sIdx], description: val };
                            return updated;
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white text-[#0F172A]"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProjectStages(prev => [
                        ...prev,
                        {
                          id: `stg-custom-${Date.now()}`,
                          name: `Nova Etapa`,
                          description: 'Descrição da etapa',
                          action_type: 'notification_only',
                          whatsapp_template: '👋 Olá, {{cliente}}! Seu projeto *{{projeto}}* avançou de etapa.\n👉 {{link_portal}}'
                        }
                      ]);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Etapa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProjectStages(resolveStagesForCategory(category));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] text-[#475569] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Padrão do Nicho</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Modo de Visualização do Fluxo */
              <div className="space-y-2 text-xs">
                {projectStages.map((stg: any, sIdx: number) => {
                  const isExpanded = previewExpandedStageIdx === sIdx;
                  const hasMessage = Boolean(stg.whatsapp_template);
                  return (
                    <div key={sIdx} className="bg-white p-3 rounded-xl border border-[#EAECEF] shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-1.5 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          <div>
                            <strong className="text-[#0F172A] text-xs block">{sIdx + 1}. {stg.name}</strong>
                            <span className="text-[11px] text-[#64748B] block mt-0.5">{stg.description}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {stg.action_type === 'billing_payment' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Cobrança Pix
                            </span>
                          )}
                          {stg.action_type === 'approval_request' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                              Aprovação 3D
                            </span>
                          )}
                          {hasMessage && (
                            <button
                              type="button"
                              onClick={() => setPreviewExpandedStageIdx(isExpanded ? null : sIdx)}
                              className="p-1.5 rounded-lg hover:bg-[#F8F9FA] text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
                              title="Ver mensagem WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expansão da mensagem WhatsApp */}
                      {isExpanded && hasMessage && (
                        <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-950 font-mono whitespace-pre-line leading-relaxed">
                          <div className="flex items-center justify-between pb-1 mb-1 border-b border-emerald-200/60 font-sans font-bold text-[10px] text-emerald-800 uppercase tracking-wider">
                            <span>Notificação WhatsApp Automática</span>
                            <span className="text-[9px] font-normal lowercase">disparo ao avançar etapa</span>
                          </div>
                          {stg.whatsapp_template}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                {currentRole === 'parceiro' ? 'Valor do Contrato (Restrito)' : 'Valor do Contrato (R$)'}
              </label>
              {currentRole === 'parceiro' ? (
                <div className="h-11 px-3.5 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-[#64748B] flex items-center gap-2 font-medium">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Definido pelo Administrador/CEO</span>
                </div>
              ) : (
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    type="number"
                    value={totalValue}
                    onChange={(e) => setTotalValue(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-[#0F172A] transition-all"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Previsão de Entrega
              </label>
              <input
                type="date"
                value={deliveryDateYmd}
                min={todayYmd}
                onChange={(e) => setDeliveryDateYmd(e.target.value)}
                className="w-full h-11 px-3.5 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-[#0F172A] cursor-pointer transition-all"
              />
            </div>
          </div>

          {/* Aba Retrátil: Condições Financeiras (À vista / Parcelado / Por Etapa) */}
          <div className="border border-[#EAECEF] rounded-2xl overflow-hidden bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setIsFinancialAccordionOpen(!isFinancialAccordionOpen)}
              className="w-full px-4 py-3 bg-[#F8F9FA] hover:bg-[#F1F5F9] flex items-center justify-between text-left transition-colors cursor-pointer border-b border-[#EAECEF]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[#0F172A] block">Condições Financeiras do Projeto</span>
                  <span className="text-[11px] text-[#64748B]">
                    {billingModel === 'single_payment'
                      ? 'À vista (100% integral)'
                      : billingModel === 'installments'
                      ? `Parcelado em ${installmentsCount}x mensais`
                      : `Por Marcos (${selectedTemplate.defaultStages.length} etapas)`}
                    {' • '}
                    {paymentMethod === 'pix' ? 'Pix Dinâmico' : paymentMethod === 'boleto' ? 'Boleto Bancário' : 'Cartão de Crédito'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hidden sm:inline">
                  Personalizável
                </span>
                {isFinancialAccordionOpen ? (
                  <ChevronUp className="w-4 h-4 text-[#64748B]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#64748B]" />
                )}
              </div>
            </button>

            {isFinancialAccordionOpen && (
              <div className="p-4 space-y-4 bg-white animate-in fade-in duration-150">
                
                {/* 1. Seleção do Modelo de Faturamento */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                    Modelo de Pagamento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBillingModel('single_payment')}
                      className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        billingModel === 'single_payment'
                          ? 'border-[#0F172A] bg-[#0F172A] text-white font-bold shadow-xs'
                          : 'border-[#EAECEF] bg-[#F8F9FA] text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <span className="block text-xs">À vista</span>
                      <span className="text-[10px] opacity-75">1 parcela única</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBillingModel('installments')}
                      className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        billingModel === 'installments'
                          ? 'border-[#0F172A] bg-[#0F172A] text-white font-bold shadow-xs'
                          : 'border-[#EAECEF] bg-[#F8F9FA] text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <span className="block text-xs">Parcelado</span>
                      <span className="text-[10px] opacity-75">Mensal recorrente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBillingModel('milestone_based')}
                      className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        billingModel === 'milestone_based'
                          ? 'border-[#0F172A] bg-[#0F172A] text-white font-bold shadow-xs'
                          : 'border-[#EAECEF] bg-[#F8F9FA] text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <span className="block text-xs">Por Etapas</span>
                      <span className="text-[10px] opacity-75">Marcos do Projeto / Sprints</span>
                    </button>
                  </div>
                </div>

                {/* 2. Forma de Pagamento */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                    Método de Pagamento Principal
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        paymentMethod === 'pix'
                          ? 'border-[#0F172A] bg-[#0F172A] text-white font-bold shadow-xs'
                          : 'border-[#EAECEF] bg-[#F8F9FA] text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5 shrink-0" />
                      <span>Pix Copia e Cola</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('boleto')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        paymentMethod === 'boleto'
                          ? 'border-[#0F172A] bg-[#0F172A] text-white font-bold shadow-xs'
                          : 'border-[#EAECEF] bg-[#F8F9FA] text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5 shrink-0" />
                      <span>Boleto Bancário</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credit_card')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        paymentMethod === 'credit_card'
                          ? 'border-[#0F172A] bg-[#0F172A] text-white font-bold shadow-xs'
                          : 'border-[#EAECEF] bg-[#F8F9FA] text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                      <span>Cartão de Crédito</span>
                    </button>
                  </div>

                  {paymentMethod === 'pix' && (
                    <div className="mt-3 bg-[#F8F9FA] p-3.5 rounded-2xl border border-[#EAECEF] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Chave Pix deste Cliente</span>
                        </label>
                        {pixKey.trim() && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {detectPixKeyType(pixKey).label}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder="Digite a Chave Pix (CPF, CNPJ, Celular, E-mail ou EVP)"
                        className="w-full h-10 px-3.5 rounded-xl border border-[#EAECEF] bg-white text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-[#0F172A] transition-all"
                      />
                      <p className="text-[11px] text-[#64748B]">
                        Basta colocar a chave Pix. O sistema gera automaticamente o QR Code e o código Copia e Cola exclusivo deste cliente, sem misturar dados.
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Seletor de Parcelas (Quando Parcelado) */}
                {billingModel === 'installments' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#0F172A]">
                        Quantidade de Parcelas Mensais:
                      </label>
                      <span className="text-xs font-bold text-emerald-600">
                        {installmentsCount}x de R$ {(numericTotal / installmentsCount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setInstallmentsCount(cnt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer border ${
                            installmentsCount === cnt
                              ? 'bg-[#0F172A] text-white border-[#0F172A]'
                              : 'bg-white text-[#64748B] border-[#EAECEF] hover:bg-[#F8F9FA]'
                          }`}
                        >
                          {cnt}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Resumo das Parcelas Geradas */}
                <div className="p-3.5 bg-[#F8F9FA] rounded-2xl border border-[#EAECEF] space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                    Prévia das Faturas que serão criadas:
                  </span>
                  
                  {billingModel === 'single_payment' && (
                    <div className="flex items-center justify-between font-semibold text-[#0F172A]">
                      <span>Parcela Única (100% Entrada)</span>
                      <span>R$ {numericTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {billingModel === 'installments' && (
                    <div className="space-y-1.5">
                      {Array.from({ length: Math.min(installmentsCount, 4) }).map((_, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[#64748B]">
                          <span>{idx + 1}ª Parcela ({idx === 0 ? 'Entrada' : `Mês +${idx}`})</span>
                          <span className="font-semibold text-[#0F172A]">
                            R$ {(numericTotal / installmentsCount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      {installmentsCount > 4 && (
                        <div className="text-[10px] text-[#94A3B8] italic">
                          + {installmentsCount - 4} parcela(s) mensais consecutivas
                        </div>
                      )}
                    </div>
                  )}

                  {billingModel === 'milestone_based' && (
                    <div className="space-y-1.5">
                      {selectedTemplate.defaultStages.map((stg, idx) => {
                        const pct = Math.round(100 / selectedTemplate.defaultStages.length);
                        const val = (numericTotal * pct) / 100;
                        return (
                          <div key={idx} className="flex items-center justify-between text-[#64748B]">
                            <span className="truncate pr-2">{idx + 1}. {stg.name} ({pct}%)</span>
                            <span className="font-semibold text-[#0F172A] shrink-0">
                              R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-[#EAECEF] bg-[#F8F9FA] flex items-center justify-between gap-3 shrink-0">
            {formError ? (
              <p className="text-xs text-rose-600 font-medium truncate flex-1">
                ⚠️ {formError}
              </p>
            ) : (
              <span className="text-[11px] text-[#64748B] hidden sm:inline">
                * Campos obrigatórios para abertura da OS
              </span>
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={handleCancel}
                className="fleetly-btn-secondary py-2 px-3.5 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>

              {!quotaCheck.allowed ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onUpgradePlan) onUpgradePlan();
                  }}
                  className="fleetly-btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Upgrade</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="fleetly-btn-primary py-2 px-4.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Cadastrando...' : 'Criar Projeto'}</span>
                </button>
              )}
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
