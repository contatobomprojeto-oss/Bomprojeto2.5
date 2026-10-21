import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Building2,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Edit3,
  HelpCircle,
  Layers,
  Wand2
} from 'lucide-react';
import { getTemplateById } from '../utils/nicheTemplates';

export interface SectorOption {
  key: string;
  label: string;
  icon: string;
  description: string;
}

export const SECTOR_OPTIONS: SectorOption[] = [
  { 
    key: 'marketing_agency', 
    label: 'Agência de Marketing / Publicidade', 
    icon: '🚀', 
    description: 'Performance, branding, conteúdo, criativos e campanhas full-service' 
  },
  { 
    key: 'ai_agency', 
    label: 'Agência / Consultoria de Automação & IA', 
    icon: '🤖', 
    description: 'Agentes inteligentes, fluxos n8n/Make, webhooks e integrações de API' 
  },
  { 
    key: 'media_buyer', 
    label: 'Gestor de Tráfego / Media Buyer', 
    icon: '🎯', 
    description: 'Tráfego pago (Meta Ads, Google Ads), tracking GA4/GTM e escala de ROAS' 
  }
];

export interface EditableStage {
  id?: string;
  stage_number: number;
  stage_name: string;
  objective: string;
  action_type: 'notification_only' | 'input_request' | 'approval_request' | 'billing_payment';
  whatsapp_template: string;
  ai_context_instruction?: string;
}

export interface EditableTemplate {
  id?: string;
  company_name?: string;
  sector_key: string;
  sector_label: string;
  tone_of_voice: string;
  stages: EditableStage[];
}

interface SectorsAndAiSectionProps {
  initialCompanyName?: string;
  activeSectorTemplate?: any;
  onTemplateSelected?: (template: any) => void;
}

/**
 * Converte o template nativo do nicho em formato editável
 */
function buildTemplateFromNiche(sectorKey: string, company: string): EditableTemplate {
  const niche = getTemplateById(sectorKey);
  const stages: EditableStage[] = niche.defaultStages.map((stg, idx) => ({
    stage_number: idx + 1,
    stage_name: stg.name.replace(/^\d+[\.\-\)]\s*/, '').trim(),
    objective: stg.description,
    action_type: (stg.action_type as any) || (idx === 0 ? 'billing_payment' : 'notification_only'),
    whatsapp_template: (stg.whatsapp_template || '').replace(/\{\{empresa\}\}/g, company),
    ai_context_instruction: stg.ai_context_instruction || `Orientar o cliente com clareza na etapa de ${stg.name}.`
  }));

  return {
    sector_key: sectorKey,
    sector_label: niche.name,
    tone_of_voice: niche.description,
    stages
  };
}

export const SectorsAndAiSection: React.FC<SectorsAndAiSectionProps> = ({
  initialCompanyName = 'Minha Empresa',
  activeSectorTemplate,
  onTemplateSelected
}) => {
  const [companyName, setCompanyName] = useState(
    activeSectorTemplate?.company_name || initialCompanyName || 'Minha Empresa'
  );
  const [selectedSector, setSelectedSector] = useState<string>(
    activeSectorTemplate?.sector_key || 'media_buyer'
  );
  const [customSectorText, setCustomSectorText] = useState('');
  const [aiCustomInstruction, setAiCustomInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeStageEditIndex, setActiveStageEditIndex] = useState(0);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTabMode, setActiveTabMode] = useState<'editor' | 'ai'>('editor');

  // Carrega template inicial para o nicho selecionado
  const [currentTemplate, setCurrentTemplate] = useState<EditableTemplate>(() => {
    if (activeSectorTemplate?.stages?.length) {
      return {
        ...activeSectorTemplate,
        stages: activeSectorTemplate.stages.map((stg: any, idx: number) => ({
          stage_number: idx + 1,
          stage_name: (stg.stage_name || stg.name || `Etapa ${idx + 1}`).replace(/^\d+[\.\-\)]\s*/, '').trim(),
          objective: stg.objective || stg.description || '',
          action_type: stg.action_type || 'notification_only',
          whatsapp_template: stg.whatsapp_template || '',
          ai_context_instruction: stg.ai_context_instruction || ''
        }))
      };
    }
    return buildTemplateFromNiche('media_buyer', initialCompanyName || 'Minha Empresa');
  });

  // Ao trocar de nicho, carrega imediatamente o fluxo próprio desse nicho
  const handleSelectSector = (secKey: string) => {
    setSelectedSector(secKey);
    setActiveStageEditIndex(0);

    // 1. Verifica se o assinante já tem uma customização salva desse nicho
    try {
      const savedCustom = localStorage.getItem(`bomprojeto_niche_custom_${secKey}`);
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (parsed?.stages?.length) {
          setCurrentTemplate(parsed);
          return;
        }
      }
    } catch {}

    // 2. Se for o nicho ativo atualmente
    if (activeSectorTemplate?.sector_key === secKey && activeSectorTemplate?.stages?.length) {
      setCurrentTemplate({
        ...activeSectorTemplate,
        stages: activeSectorTemplate.stages.map((stg: any, idx: number) => ({
          stage_number: idx + 1,
          stage_name: (stg.stage_name || stg.name || `Etapa ${idx + 1}`).replace(/^\d+[\.\-\)]\s*/, '').trim(),
          objective: stg.objective || stg.description || '',
          action_type: stg.action_type || 'notification_only',
          whatsapp_template: stg.whatsapp_template || '',
          ai_context_instruction: stg.ai_context_instruction || ''
        }))
      });
      return;
    }

    // 3. Carrega o template padrão rico daquele nicho específico
    const base = buildTemplateFromNiche(secKey, companyName);
    setCurrentTemplate(base);
  };

  // Restaura o padrão oficial do nicho selecionado
  const handleResetToDefault = () => {
    const fresh = buildTemplateFromNiche(selectedSector, companyName);
    setCurrentTemplate(fresh);
    setActiveStageEditIndex(0);
    try {
      localStorage.removeItem(`bomprojeto_niche_custom_${selectedSector}`);
    } catch {}
  };

  // Gerar ou refinar via IA
  const handleGenerateWithAi = async () => {
    setIsLoading(true);
    setSavedSuccess(false);
    try {
      const sectorPayload = selectedSector === 'outro' && customSectorText.trim()
        ? customSectorText.trim()
        : selectedSector;

      const res = await fetch('/api/onboarding/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim() || 'Minha Empresa',
          sector: sectorPayload,
          customRequirements: aiCustomInstruction.trim() || undefined
        })
      });

      if (!res.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await res.json();
      if (data.template && Array.isArray(data.template.stages)) {
        const sanitized: EditableTemplate = {
          ...data.template,
          sector_key: selectedSector,
          sector_label: selectedSector === 'outro' && customSectorText.trim() ? customSectorText.trim() : (data.template.sector_label || selectedSector),
          stages: data.template.stages.map((stg: any, idx: number) => ({
            stage_number: idx + 1,
            stage_name: (stg.stage_name || stg.name || `Etapa ${idx + 1}`).replace(/^\d+[\.\-\)]\s*/, '').trim(),
            objective: stg.objective || stg.description || '',
            action_type: stg.action_type || 'notification_only',
            whatsapp_template: stg.whatsapp_template || '',
            ai_context_instruction: stg.ai_context_instruction || ''
          }))
        };
        setCurrentTemplate(sanitized);
        setActiveStageEditIndex(0);
        setActiveTabMode('editor');
      }
    } catch (err) {
      console.error('Erro ao gerar template com IA:', err);
      // Fallback seguro caso de timeout
      const fallback = buildTemplateFromNiche(selectedSector, companyName);
      setCurrentTemplate(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar campo de uma etapa específica
  const handleUpdateStage = (field: keyof EditableStage, value: any) => {
    setCurrentTemplate(prev => {
      const newStages = [...prev.stages];
      newStages[activeStageEditIndex] = {
        ...newStages[activeStageEditIndex],
        [field]: value
      };
      return { ...prev, stages: newStages };
    });
  };

  // Adicionar nova etapa personalizada
  const handleAddStage = () => {
    setCurrentTemplate(prev => {
      const newNumber = prev.stages.length + 1;
      const newStage: EditableStage = {
        stage_number: newNumber,
        stage_name: `Nova Etapa Personalizada`,
        objective: 'Descreva aqui o objetivo e entregáveis desta etapa para o cliente.',
        action_type: 'notification_only',
        whatsapp_template: `👋 Olá, {{cliente}}! Informamos que o projeto *{{projeto}}* avançou para a etapa de Nova Etapa.\n\nAcompanhe no portal:\n👉 {{link_portal}}`,
        ai_context_instruction: 'Prestar suporte ao cliente referente ao andamento desta etapa.'
      };
      return { ...prev, stages: [...prev.stages, newStage] };
    });
    setActiveStageEditIndex(currentTemplate.stages.length);
  };

  // Excluir etapa (mantendo no mínimo 2)
  const handleDeleteStage = (index: number) => {
    if (currentTemplate.stages.length <= 2) {
      alert('O cronograma precisa de no mínimo 2 etapas para garantir o acompanhamento do cliente.');
      return;
    }
    setCurrentTemplate(prev => {
      const filtered = prev.stages.filter((_, idx) => idx !== index);
      const renumbered = filtered.map((stg, idx) => ({
        ...stg,
        stage_number: idx + 1
      }));
      return { ...prev, stages: renumbered };
    });
    setActiveStageEditIndex(Math.max(0, index - 1));
  };

  // Mover etapa para cima
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setCurrentTemplate(prev => {
      const newStages = [...prev.stages];
      const temp = newStages[index - 1];
      newStages[index - 1] = newStages[index];
      newStages[index] = temp;
      const renumbered = newStages.map((stg, idx) => ({ ...stg, stage_number: idx + 1 }));
      return { ...prev, stages: renumbered };
    });
    setActiveStageEditIndex(index - 1);
  };

  // Mover etapa para baixo
  const handleMoveDown = (index: number) => {
    if (index >= currentTemplate.stages.length - 1) return;
    setCurrentTemplate(prev => {
      const newStages = [...prev.stages];
      const temp = newStages[index + 1];
      newStages[index + 1] = newStages[index];
      newStages[index] = temp;
      const renumbered = newStages.map((stg, idx) => ({ ...stg, stage_number: idx + 1 }));
      return { ...prev, stages: renumbered };
    });
    setActiveStageEditIndex(index + 1);
  };

  // Inserir tag de template de WhatsApp
  const handleInsertTag = (tag: string) => {
    const currentMsg = currentTemplate.stages[activeStageEditIndex]?.whatsapp_template || '';
    handleUpdateStage('whatsapp_template', `${currentMsg} ${tag}`);
  };

  // Salvar e Ativar Nicho
  const handleSaveAndActivate = () => {
    const templateToSave = {
      ...currentTemplate,
      company_name: companyName.trim() || 'Minha Empresa',
      sector_key: selectedSector,
      sector_label: selectedSector === 'outro' && customSectorText.trim()
        ? customSectorText.trim()
        : (currentTemplate.sector_label || SECTOR_OPTIONS.find(s => s.key === selectedSector)?.label || selectedSector),
      stages: currentTemplate.stages.map((stg, idx) => ({
        ...stg,
        stage_number: idx + 1,
        stage_name: stg.stage_name.trim() || `Etapa ${idx + 1}`
      }))
    };

    // 1. Salva customização do nicho individual
    try {
      localStorage.setItem(`bomprojeto_niche_custom_${selectedSector}`, JSON.stringify(templateToSave));
      localStorage.setItem('bomprojeto_active_sector_template', JSON.stringify(templateToSave));
    } catch {}

    // 2. Notifica callback pai (App.tsx / CompanySettingsModal)
    if (onTemplateSelected) {
      onTemplateSelected(templateToSave);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const activeStage = currentTemplate.stages[activeStageEditIndex] || currentTemplate.stages[0];

  return (
    <div className="space-y-6 text-xs animate-in fade-in duration-150 font-sans">
      {/* Banner de Apresentação */}
      <div className="bg-[#F8F9FA] p-4.5 rounded-2xl border border-[#EAECEF] flex items-start justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#111827] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#0F172A]">Nichos Especializados &amp; Fluxos Customizáveis</h3>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]">
                Gemini 2.5 Flash
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
              Cada nicho possui seu próprio cronograma de etapas e réguas de WhatsApp, 100% customizáveis para a necessidade da sua empresa.
            </p>
          </div>
        </div>

        {activeSectorTemplate && (
          <div className="hidden sm:flex flex-col items-end shrink-0">
            <span className="text-[10px] uppercase font-semibold text-[#94A3B8]">Nicho Ativo</span>
            <span className="text-xs font-semibold text-[#15803D] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full">
              {activeSectorTemplate.sector_label || activeSectorTemplate.niche_name || activeSectorTemplate.sector_key}
            </span>
          </div>
        )}
      </div>

      {/* Identificação da Empresa */}
      <div className="space-y-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#EAECEF] shadow-xs">
        <div>
          <label className="block text-xs font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#0F172A]" />
            <span>Nome da Sua Empresa / Marca</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ex: Marcenaria Ferraz, Studio Arquitetura, Serralheria Pro"
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-[#0F172A] transition-colors"
          />
        </div>

        {/* Seleção do Nicho */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-[#0F172A]">
              Selecione o Nicho de Atuação
            </label>
            <span className="text-[11px] text-[#64748B]">
              Clique no nicho para carregar o fluxo próprio correspondente
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-2">
            {SECTOR_OPTIONS.map((sec) => {
              const isSelected = selectedSector === sec.key;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => handleSelectSector(sec.key)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#111827] bg-[#F1F5F9] ring-2 ring-[#111827] shadow-xs'
                      : 'border-[#EAECEF] bg-white hover:border-[#CBD5E1] hover:bg-[#F8F9FA]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{sec.icon}</span>
                    <span className="text-xs font-bold text-[#0F172A]">
                      {sec.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#64748B] leading-tight line-clamp-1">
                    {sec.description}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedSector === 'outro' && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="Descreva seu nicho específico (ex: Instalação de Painéis Solares, Marmoraria de Luxo...)"
                value={customSectorText}
                onChange={(e) => setCustomSectorText(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-[#0F172A]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Header do Fluxo Gerado e Botões de Ação */}
      <div className="bg-white border border-[#EAECEF] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAECEF]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#0F172A]">
                Fluxo Próprio: {currentTemplate.sector_label || SECTOR_OPTIONS.find(s => s.key === selectedSector)?.label}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-[#DCFCE7] text-[#15803D]">
                {currentTemplate.stages.length} Etapas Configuradas
              </span>
              {selectedSector === activeSectorTemplate?.sector_key && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Nicho em Uso
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Tom de voz: <span className="font-semibold text-[#0F172A]">{currentTemplate.tone_of_voice}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetToDefault}
              title="Restaurar etapas padrão originais deste nicho"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F8F9FA] hover:bg-[#EAECEF] text-[#475569] border border-[#EAECEF] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndActivate}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                savedSuccess
                  ? 'bg-[#15803D] text-white'
                  : 'bg-[#111827] hover:bg-black text-white'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Nicho Ativado com Sucesso!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Ativar &amp; Salvar Este Nicho</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Abas: Personalizar Etapas x Refinar com IA */}
        <div className="flex items-center gap-2 border-b border-[#EAECEF] pb-2">
          <button
            type="button"
            onClick={() => setActiveTabMode('editor')}
            className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTabMode === 'editor'
                ? 'bg-[#111827] text-white shadow-xs'
                : 'bg-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Personalizar Etapas &amp; Mensagens</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabMode('ai')}
            className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTabMode === 'ai'
                ? 'bg-[#111827] text-white shadow-xs'
                : 'bg-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Refinar com IA (Gemini)</span>
          </button>
        </div>

        {/* MODO 1: EDITOR VISUAL COMPLETO DAS ETAPAS */}
        {activeTabMode === 'editor' && (
          <div className="space-y-4">
            {/* Navegador horizontal das etapas + botão de adicionar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {currentTemplate.stages.map((stg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveStageEditIndex(idx)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer border flex items-center gap-1.5 ${
                    activeStageEditIndex === idx
                      ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                      : 'bg-[#F8F9FA] hover:bg-white text-[#64748B] border-[#EAECEF]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span>{stg.stage_name}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={handleAddStage}
                className="px-3 py-2 rounded-xl text-xs font-semibold shrink-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Adicionar nova etapa personalizada ao fluxo"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Etapa</span>
              </button>
            </div>

            {/* Painel de Edição da Etapa Selecionada */}
            {activeStage && (
              <div className="bg-[#F8F9FA] rounded-2xl p-4.5 border border-[#EAECEF] space-y-4 animate-in fade-in duration-100">
                {/* Cabeçalho da Etapa com Botões de Reordenação e Exclusão */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#EAECEF] flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#111827] text-white font-bold text-xs">
                      Etapa {activeStageEditIndex + 1} de {currentTemplate.stages.length}
                    </span>
                    <span className="text-xs font-semibold text-[#0F172A]">
                      Personalização Completa
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={activeStageEditIndex === 0}
                      onClick={() => handleMoveUp(activeStageEditIndex)}
                      className="p-1.5 rounded-lg bg-white border border-[#EAECEF] text-[#64748B] hover:text-[#0F172A] disabled:opacity-40 cursor-pointer"
                      title="Mover etapa para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={activeStageEditIndex >= currentTemplate.stages.length - 1}
                      onClick={() => handleMoveDown(activeStageEditIndex)}
                      className="p-1.5 rounded-lg bg-white border border-[#EAECEF] text-[#64748B] hover:text-[#0F172A] disabled:opacity-40 cursor-pointer"
                      title="Mover etapa para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteStage(activeStageEditIndex)}
                      className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Excluir esta etapa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Linha 1: Nome e Tipo de Ação */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-1">
                      Nome da Etapa *
                    </label>
                    <input
                      type="text"
                      value={activeStage.stage_name}
                      onChange={(e) => handleUpdateStage('stage_name', e.target.value)}
                      placeholder="Ex: Medição Técnica no Local"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EAECEF] bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-[#0F172A] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-1">
                      Ação Vinculada *
                    </label>
                    <select
                      value={activeStage.action_type}
                      onChange={(e) => handleUpdateStage('action_type', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAECEF] bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-[#0F172A] font-medium"
                    >
                      <option value="billing_payment">💳 Disparo de Cobrança Pix</option>
                      <option value="approval_request">✍️ Solicitação de Aprovação</option>
                      <option value="notification_only">🔔 Aviso de Andamento</option>
                      <option value="input_request">📥 Solicitação de Dados</option>
                    </select>
                  </div>
                </div>

                {/* Linha 2: Objetivo da Etapa */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-1">
                    Objetivo &amp; Entregáveis da Etapa
                  </label>
                  <input
                    type="text"
                    value={activeStage.objective}
                    onChange={(e) => handleUpdateStage('objective', e.target.value)}
                    placeholder="Ex: Conferência milimétrica dos vãos e validação dos pontos de elétrica."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EAECEF] bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-[#0F172A]"
                  />
                </div>

                {/* Linha 3: Template de Mensagem WhatsApp */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mensagem Modelo de WhatsApp (Disparo com 1 Clique)</span>
                    </label>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-[#94A3B8] mr-1">Inserir:</span>
                      {[
                        { label: '{{cliente}}', val: '{{cliente}}' },
                        { label: '{{projeto}}', val: '{{projeto}}' },
                        { label: '{{link_pix}}', val: '{{link_pix}}' },
                        { label: '{{link_aprovacao}}', val: '{{link_aprovacao}}' },
                        { label: '{{link_portal}}', val: '{{link_portal}}' }
                      ].map(tg => (
                        <button
                          key={tg.val}
                          type="button"
                          onClick={() => handleInsertTag(tg.val)}
                          className="px-1.5 py-0.5 rounded bg-white border border-[#EAECEF] hover:border-emerald-500 text-[10px] font-mono text-[#0F172A] transition-colors cursor-pointer"
                        >
                          {tg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={activeStage.whatsapp_template}
                    onChange={(e) => handleUpdateStage('whatsapp_template', e.target.value)}
                    placeholder="Digite a mensagem padrão que será enviada para o cliente..."
                    className="w-full p-3 rounded-xl border border-[#EAECEF] bg-white text-xs text-[#0F172A] whitespace-pre-line leading-relaxed font-sans shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Linha 4: Instrução Interna para a IA */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[#0F172A]" />
                    <span>Instrução de Resposta para a IA (WhatsApp do Cliente)</span>
                  </label>
                  <input
                    type="text"
                    value={activeStage.ai_context_instruction || ''}
                    onChange={(e) => handleUpdateStage('ai_context_instruction', e.target.value)}
                    placeholder="Ex: Esclarecer dúvidas sobre o prazo de secagem e reforçar que a medição foi aprovada."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EAECEF] bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-[#0F172A]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODO 2: REFINAMENTO COM IA */}
        {activeTabMode === 'ai' && (
          <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-[#EAECEF] space-y-4 animate-in fade-in duration-100">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Instruções Específicas para a IA Refinar o Fluxo</span>
              </label>
              <textarea
                rows={3}
                value={aiCustomInstruction}
                onChange={(e) => setAiCustomInstruction(e.target.value)}
                placeholder="Ex: Focamos em infoprodutores e e-commerce de moda. Adicione foco em aprovação rápida de carrosséis e relatórios semanais de ROAS."
                className="w-full p-3 text-xs rounded-xl border border-[#EAECEF] bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-[#0F172A]"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleGenerateWithAi}
                disabled={isLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#111827] hover:bg-black text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>A IA está refinando o fluxo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Gerar / Refinar Fluxo com IA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
