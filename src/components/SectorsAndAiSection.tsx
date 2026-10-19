import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Building2,
  CheckCircle2,
  Send,
  Loader2,
  MessageSquare,
  Check
} from 'lucide-react';

interface SectorOption {
  key: string;
  label: string;
  icon: string;
  description: string;
}

export const SECTOR_OPTIONS: SectorOption[] = [
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

interface SectorsAndAiSectionProps {
  initialCompanyName?: string;
  activeSectorTemplate?: any;
  onTemplateSelected?: (template: any) => void;
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
    activeSectorTemplate?.sector_key || 'marcenaria'
  );
  const [customSectorText, setCustomSectorText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<any>(
    activeSectorTemplate || null
  );
  const [activeStagePreviewIndex, setActiveStagePreviewIndex] = useState(0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleGenerate = async () => {
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
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

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
              <h3 className="font-bold text-sm text-[#0F172A]">Nichos &amp; Inteligência Artificial</h3>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]">
                Gemini 2.5 Flash
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
              Personalize o fluxo de etapas, réguas de comunicação e mensagens automáticas de WhatsApp específicas para o seu nicho.
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

      {/* Formulário de Configuração */}
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

        <div>
          <label className="block text-xs font-semibold text-[#0F172A] mb-1">
            Escolha o Setor Principal
          </label>
          <p className="text-xs text-[#64748B] mb-3">
            Selecione o segmento para calibrar o cronograma padrão e o tom das mensagens.
          </p>

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
                      ? 'border-[#111827] bg-[#F8F9FA] ring-1 ring-[#111827] shadow-xs'
                      : 'border-[#EAECEF] bg-white hover:border-[#CBD5E1] hover:bg-[#F8F9FA]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{sec.icon}</span>
                    <span className={`text-xs font-semibold ${isSelected ? 'text-[#0F172A]' : 'text-[#0F172A]'}`}>
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

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !companyName.trim()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#111827] hover:bg-black text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Desenhando fluxo com IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Gerar Fluxo de Etapas com IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pré-visualização do Template Gerado */}
      {generatedTemplate && (
        <div className="space-y-4 border border-[#EAECEF] rounded-2xl p-5 bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAECEF]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#0F172A]">
                  Fluxo Gerado: {generatedTemplate.sector_label || generatedTemplate.niche_name || 'Nicho Especializado'}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-[#DCFCE7] text-[#15803D]">
                  {generatedTemplate.stages?.length || 0} Etapas Estruturadas
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Tom de voz: <span className="font-semibold text-[#0F172A]">{generatedTemplate.tone_of_voice || 'Profissional e acolhedor'}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleApply}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                savedSuccess
                  ? 'bg-[#15803D] text-white'
                  : 'bg-[#111827] hover:bg-black text-white'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Nicho Ativado!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Ativar Este Nicho</span>
                </>
              )}
            </button>
          </div>

          {/* Navegação entre Etapas */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {generatedTemplate.stages?.map((stg: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStagePreviewIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer border ${
                  activeStagePreviewIndex === idx
                    ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                    : 'bg-[#F8F9FA] hover:bg-white text-[#64748B] border-[#EAECEF]'
                }`}
              >
                {idx + 1}. {stg.stage_name || stg.name}
              </button>
            ))}
          </div>

          {/* Detalhe da Etapa Selecionada */}
          {generatedTemplate.stages?.[activeStagePreviewIndex] && (
            <div className="bg-[#F8F9FA] rounded-2xl p-4.5 border border-[#EAECEF] space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-xs text-[#0F172A]">
                    {generatedTemplate.stages[activeStagePreviewIndex].stage_name || generatedTemplate.stages[activeStagePreviewIndex].name}
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {generatedTemplate.stages[activeStagePreviewIndex].objective || generatedTemplate.stages[activeStagePreviewIndex].description}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                  generatedTemplate.stages[activeStagePreviewIndex].action_type === 'billing_payment'
                    ? 'bg-[#DCFCE7] text-[#15803D]'
                    : generatedTemplate.stages[activeStagePreviewIndex].action_type === 'approval_request'
                    ? 'bg-[#FEF3C7] text-[#B45309]'
                    : 'bg-[#E0F2FE] text-[#0369A1]'
                }`}>
                  {generatedTemplate.stages[activeStagePreviewIndex].action_type === 'billing_payment'
                    ? '💳 Disparo de Cobrança Pix'
                    : generatedTemplate.stages[activeStagePreviewIndex].action_type === 'approval_request'
                    ? '✍️ Solicitação de Aprovação'
                    : '🔔 Aviso de Andamento'}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#0F172A]" />
                  <span>Mensagem Modelo de WhatsApp (Disparo com 1 Clique)</span>
                </label>
                <div className="bg-white p-3.5 rounded-xl border border-[#EAECEF] text-xs text-[#0F172A] whitespace-pre-line leading-relaxed font-sans shadow-xs">
                  {generatedTemplate.stages[activeStagePreviewIndex].whatsapp_template}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
