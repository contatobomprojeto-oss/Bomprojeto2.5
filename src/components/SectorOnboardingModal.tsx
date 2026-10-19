import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Bot,
  Layers,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  DollarSign,
  Send,
  Loader2,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { ProjectTemplate } from '../schemas/projectPersistenceSchemas';

interface SectorOption {
  key: string;
  label: string;
  icon: string;
  description: string;
}

const SECTOR_OPTIONS: SectorOption[] = [
  { key: 'marcenaria', label: 'Marcenaria & Planejados', icon: '🪵', description: 'Móveis sob medida, corte e montagem' },
  { key: 'arquitetura_interiores', label: 'Arquitetura & Interiores', icon: '📐', description: 'Projetos 3D, especificações e acompanhamento' },
  { key: 'serralheria', label: 'Serralheria & Metal', icon: '🔩', description: 'Estruturas de aço, solda e esquadrias' },
  { key: 'vidracaria', label: 'Vidraçaria & Box', icon: '🪟', description: 'Vidros temperados, esquadrias e envidraçamento' },
  { key: 'reformas_construcao', label: 'Reformas & Construção', icon: '🏗️', description: 'Empreiteiras, pintura e acabamentos' },
  { key: 'agencia', label: 'Agência & Design', icon: '🎨', description: 'Branding, marketing, web design e campanhas' },
  { key: 'software', label: 'Software & Tecnologia', icon: '💻', description: 'Desenvolvimento, apps e implantações' },
  { key: 'contabilidade', label: 'Contabilidade & BPO', icon: '📊', description: 'Abertura, rotinas fiscais e folha' },
  { key: 'outro', label: 'Outro Setor Especializado', icon: '✨', description: 'Prestação de serviços técnicos em geral' }
];

interface SectorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelected?: (template: ProjectTemplate) => void;
  onApplyAndCreateProject?: (template: ProjectTemplate) => void;
  initialCompanyName?: string;
}

export const SectorOnboardingModal: React.FC<SectorOnboardingModalProps> = ({
  isOpen,
  onClose,
  onTemplateSelected,
  onApplyAndCreateProject,
  initialCompanyName = ''
}) => {
  const [companyName, setCompanyName] = useState(initialCompanyName || 'Minha Empresa');
  const [selectedSector, setSelectedSector] = useState('marcenaria');
  const [customSectorText, setCustomSectorText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<ProjectTemplate | null>(null);
  const [activeStagePreviewIndex, setActiveStagePreviewIndex] = useState(0);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const sectorPayload = selectedSector === 'outro' && customSectorText.trim()
        ? customSectorText.trim()
        : selectedSector;

      const res = await fetch('/api/onboarding/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim() || 'Minha Empresa',
          sector: sectorPayload
        })
      });

      if (!res.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await res.json();
      if (data.template) {
        setGeneratedTemplate(data.template);
        setActiveStagePreviewIndex(0);
      }
    } catch (err) {
      console.error('Erro ao gerar template com IA:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedTemplate && onTemplateSelected) {
      onTemplateSelected(generatedTemplate);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 font-sans select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full shadow-2xl border border-[#EAECEF] max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Modal */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#EAECEF] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-[#FF6515] flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-[#0F172A] tracking-tight">Onboarding Inteligente por Setor</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[#FF6515]">
                  <Sparkles className="w-3 h-3 fill-current" />
                  IA Ativa
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#64748B]">
                Personalize o tom de voz e as réguas automáticas de WhatsApp para o seu nicho
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Pergunta e Razão Social */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-[#1C1C1A] mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#FF6515]" />
                  <span>Nome da Sua Empresa / Marca *</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Marcenaria Ferraz, Studio Arquitetura, Serralheria Pro"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DADCE0] focus:outline-none focus:border-[#FF6515] focus:ring-1 focus:ring-[#FF6515] text-[#202124]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1A] mb-1.5">
                Qual o setor de atuação da sua empresa? *
              </label>
              <p className="text-xs text-[#5F6368] mb-3">
                A IA vai gerar um cronograma com as etapas ideais, mensagens humanizadas de WhatsApp e ganchos de cobrança Pix adequados ao seu mercado.
              </p>

              {/* Grid de Setores */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SECTOR_OPTIONS.map((sec) => {
                  const isSelected = selectedSector === sec.key;
                  return (
                    <button
                      key={sec.key}
                      type="button"
                      onClick={() => setSelectedSector(sec.key)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#FF6515] bg-[#FFF8F4] ring-2 ring-[#FF6515]/20 shadow-xs'
                          : 'border-[#E8EAED] bg-white hover:border-[#DCD6CB] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{sec.icon}</span>
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#C2410C]' : 'text-[#202124]'}`}>
                          {sec.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#78716C] leading-tight line-clamp-2">
                        {sec.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedSector === 'outro' && (
                <div className="mt-3 animate-in fade-in duration-150">
                  <input
                    type="text"
                    placeholder="Descreva seu nicho específico (ex: Instalação de Painéis Solares, Marmoraria de Luxo...)"
                    value={customSectorText}
                    onChange={(e) => setCustomSectorText(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DADCE0] focus:outline-none focus:border-[#FF6515] text-[#202124]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Botão de Geração */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-[#78716C] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Geração com Structured Outputs &amp; Tipagem Estrita</span>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || !companyName.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#FF6515] hover:bg-[#E0550D] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>A IA está desenhando seu cronograma...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>{generatedTemplate ? 'Regerar Template com IA' : 'Gerar Cronograma & Réguas WhatsApp'}</span>
                </>
              )}
            </button>
          </div>

          {/* Preview Interativo do Template Gerado */}
          {generatedTemplate && (
            <div className="space-y-4 pt-4 border-t border-[#E8EAED] animate-in fade-in zoom-in-95 duration-200">
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#1C1C1A] flex items-center gap-2">
                    <span>Template Gerado:</span>
                    <span className="text-[#FF6515]">{generatedTemplate.sector_label}</span>
                  </h4>
                  <p className="text-xs text-[#5F6368] mt-0.5">
                    {generatedTemplate.stages?.length || 0} etapas lógicas prontas para disparo automático.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                  Pronto para Uso
                </span>
              </div>

              {/* Tom de Voz */}
              <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E0D6] space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
                  Tom de Voz Configurado para a IA
                </span>
                <p className="text-xs text-[#202124] italic leading-relaxed">
                  "{generatedTemplate.tone_of_voice}"
                </p>
              </div>

              {/* Seletor de Etapas para Preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#1C1C1A]">Etapas do Cronograma:</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {generatedTemplate.stages?.map((stg, idx) => (
                    <button
                      key={stg.id || idx}
                      type="button"
                      onClick={() => setActiveStagePreviewIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                        activeStagePreviewIndex === idx
                          ? 'bg-[#1C1C1A] text-white border-[#1C1C1A]'
                          : 'bg-white text-[#5F6368] border-[#DADCE0] hover:bg-[#F8F9FA]'
                      }`}
                    >
                      {idx + 1}. {stg.stage_name.split('.')[1] || stg.stage_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Balão do WhatsApp Interativo */}
              {generatedTemplate.stages && generatedTemplate.stages[activeStagePreviewIndex] && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#5F6368]">
                      Objetivo da Etapa: <strong className="text-[#202124]">{generatedTemplate.stages[activeStagePreviewIndex].objective}</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      generatedTemplate.stages[activeStagePreviewIndex].action_type === 'billing_payment'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : generatedTemplate.stages[activeStagePreviewIndex].action_type === 'approval_request'
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}>
                      {generatedTemplate.stages[activeStagePreviewIndex].action_type === 'billing_payment' ? 'Cobrança Vinculada' : generatedTemplate.stages[activeStagePreviewIndex].action_type === 'approval_request' ? 'Aprovação Formal' : 'Notificação de Fotos'}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#D1D5DB] bg-[#EFEAE2] p-4 shadow-inner relative overflow-hidden">
                    <div className="max-w-md bg-white rounded-2xl rounded-tl-none p-3.5 shadow-sm space-y-2 border border-black/5 text-xs text-[#111827]">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Mensagem Automática via WhatsApp</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-[12px] text-[#1F2937]">
                        {generatedTemplate.stages[activeStagePreviewIndex].whatsapp_template}
                      </p>
                      <div className="text-[10px] text-right text-gray-400">
                        Hoje às 10:15 ✓✓
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#F8F9FA] border-t border-[#E8EAED] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#DADCE0] text-xs font-semibold text-[#5F6368] hover:bg-white transition-colors cursor-pointer"
          >
            Fechar
          </button>

          {generatedTemplate ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-50 text-[#1C1C1A] border border-[#DADCE0] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Salvar Template</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onApplyAndCreateProject) {
                    onApplyAndCreateProject(generatedTemplate);
                  } else {
                    handleApply();
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[#FF6515] hover:bg-[#E0550D] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ativar e Cadastrar Novo Projeto</span>
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-[#78716C]">
              Selecione o setor e clique em Gerar para visualizar.
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
