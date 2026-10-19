import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Sparkles, 
  FolderKanban, 
  ArrowLeft, 
  RefreshCw, 
  HelpCircle, 
  ShieldCheck, 
  ExternalLink,
  Layers,
  ChevronRight,
  Bot,
  CheckCircle2,
  AlertCircle,
  Mic
} from 'lucide-react';
import { Project, ActiveView, RetencaoProjectData, RetentionAudioInput } from '../types';
import { 
  getRetencaoDataForProject, 
  fetchProjectRetentionFromBackend, 
  convertBackendAnalysisToProjectData 
} from '../services/retencaoService';
import { ProjectSelectorDropdown } from './retencao/ProjectSelectorDropdown';
import { HappinessScoreCard } from './retencao/HappinessScoreCard';
import { PillarsGrid } from './retencao/PillarsGrid';
import { SemanticRadarCloud } from './retencao/SemanticRadarCloud';
import { AiPrescriptivePlaybook } from './retencao/AiPrescriptivePlaybook';
import { VocalToneAnalysisCard } from './retencao/VocalToneAnalysisCard';
import { WhatsAppAudioModal } from './retencao/WhatsAppAudioModal';

interface RetencaoProDashboardProps {
  projects: Project[];
  activeProjectId?: string;
  supportAlerts?: any[];
  onSelectProject?: (projectId: string) => void;
  onSelectView: (view: ActiveView) => void;
  onOpenProjectDetail?: (project: Project) => void;
}

export const RetencaoProDashboard: React.FC<RetencaoProDashboardProps> = ({
  projects,
  activeProjectId,
  supportAlerts = [],
  onSelectProject,
  onSelectView,
  onOpenProjectDetail
}) => {
  // Inicializa com o projeto ativo fornecido ou o primeiro projeto da lista
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (activeProjectId && projects.some(p => p.id === activeProjectId)) {
      return activeProjectId;
    }
    return projects[0]?.id || '';
  });

  const [backendAnalysis, setBackendAnalysis] = useState<RetencaoProjectData | null>(null);
  const [isAnalyzingWithAi, setIsAnalyzingWithAi] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [attachedAudios, setAttachedAudios] = useState<RetentionAudioInput[]>([]);

  // Sincroniza se activeProjectId mudar externamente
  useEffect(() => {
    if (activeProjectId && projects.some(p => p.id === activeProjectId)) {
      setSelectedProjectId(activeProjectId);
    } else if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [activeProjectId, projects]);

  // Projeto atualmente selecionado (Isolamento Multi-tenant estrito)
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Busca análise do backend ao selecionar um novo projeto enviando dados verdadeiros do projeto
  useEffect(() => {
    if (!currentProject) {
      setBackendAnalysis(null);
      setAttachedAudios([]);
      return;
    }

    let isCurrent = true;
    fetchProjectRetentionFromBackend(currentProject.id, false, undefined, currentProject, supportAlerts)
      .then(analysis => {
        if (isCurrent && analysis) {
          const converted = convertBackendAnalysisToProjectData(analysis, currentProject);
          setBackendAnalysis(converted);
          if (analysis.isContingency) {
            setAiNotice('Modo contingência ativo (análise heurística local baseada nos dados reais)');
          } else {
            setAiNotice('Análise gerada via Gemini 3.8 Flash com dados reais');
          }
        }
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [currentProject?.id]);

  // Dispara nova análise fresca forçada via backend com Gemini (suporta áudios multimodais do WhatsApp e dados reais)
  const handleRecalculateAi = async (overrideAudios?: RetentionAudioInput[]) => {
    if (!currentProject || isAnalyzingWithAi) return;
    setIsAnalyzingWithAi(true);
    const audiosToSend = overrideAudios !== undefined ? overrideAudios : attachedAudios;

    const hasAudios = audiosToSend && audiosToSend.length > 0;
    setAiNotice(hasAudios 
      ? `Processando ${audiosToSend.length} áudio(s) multimodais e dados do projeto com Gemini 3.8 Flash...`
      : 'Processando com Gemini API...');

    try {
      const liveData = await fetchProjectRetentionFromBackend(currentProject.id, true, audiosToSend, currentProject, supportAlerts);
      if (liveData) {
        const converted = convertBackendAnalysisToProjectData(liveData, currentProject);
        setBackendAnalysis(converted);
        if (liveData.isContingency) {
          setAiNotice('Modo contingência ativo (análise heurística local baseada nos dados reais)');
        } else {
          setAiNotice(hasAudios 
            ? 'Análise recalculada com sucesso via Gemini Multimodal (áudios + projeto)!' 
            : 'Análise recalculada com sucesso via Gemini 3.8 Flash!');
        }
      }
    } catch (err) {
      console.error('Erro ao recalcular com IA:', err);
    } finally {
      setIsAnalyzingWithAi(false);
      setTimeout(() => {
        setAiNotice(null);
      }, 5000);
    }
  };

  // Dados analíticos isolados especificamente para o projeto selecionado
  const retencaoData: RetencaoProjectData | null = useMemo(() => {
    if (!currentProject) return null;
    return backendAnalysis || getRetencaoDataForProject(currentProject, supportAlerts, attachedAudios);
  }, [currentProject, backendAnalysis, supportAlerts, attachedAudios]);

  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setBackendAnalysis(null);
    if (onSelectProject) {
      onSelectProject(project.id);
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      
      {/* 1. Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECEF] pb-4">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1.5">
            <button
              type="button"
              onClick={() => onSelectView('dashboard')}
              className="hover:text-[#0F172A] transition-colors cursor-pointer flex items-center gap-1 font-medium"
            >
              <span>Início</span>
            </button>
            <span>/</span>
            <span className="font-semibold text-[#0F172A]">Retenção Pro</span>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1">
              Fase 2 • Gemini AI
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center font-bold shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                Retenção Pro
              </h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                Inteligência preditiva para blindagem de clientes, prevenção de cancelamentos e maximização de indicações.
              </p>
            </div>
          </div>
        </div>

        {/* Ações de Topo */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Áudios WhatsApp (Multimodalidade Fase 3) */}
          {currentProject && (
            <button
              type="button"
              id="btn-open-retencao-audios"
              onClick={() => setIsAudioModalOpen(true)}
              className="fleetly-btn-secondary h-9 px-3.5 text-xs font-semibold cursor-pointer"
              title="Gerenciar e testar mensagens de voz (.ogg/.mp3) do WhatsApp do cliente"
            >
              <Mic className="w-3.5 h-3.5 text-emerald-600" />
              <span>Áudios de Voz</span>
              {attachedAudios.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#111827] text-white text-[10px] font-bold flex items-center justify-center">
                  {attachedAudios.length}
                </span>
              )}
            </button>
          )}

          {/* Botão Atualizar Análise com IA (Requisito Fase 3) */}
          {currentProject && (
            <button
              type="button"
              id="btn-recalculate-retencao-ai"
              onClick={() => handleRecalculateAi()}
              disabled={isAnalyzingWithAi}
              className="fleetly-btn-primary h-9 px-4 text-xs font-semibold cursor-pointer disabled:opacity-60"
              title="Solicitar nova análise de retenção ao Gemini"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingWithAi ? 'animate-spin' : ''}`} />
              <span>{isAnalyzingWithAi ? 'Analisando com IA...' : 'Atualizar com IA'}</span>
            </button>
          )}

          {currentProject && onOpenProjectDetail && (
            <button
              type="button"
              onClick={() => onOpenProjectDetail(currentProject)}
              className="fleetly-btn-secondary h-9 px-3.5 text-xs font-semibold cursor-pointer"
            >
              <FolderKanban className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Ver Detalhes da OS</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#F8F9FA] border border-[#EAECEF] rounded-xl text-xs font-semibold text-[#64748B]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dados 100% Isolados</span>
          </div>
        </div>
      </div>

      {/* Notificação temporária de IA */}
      {aiNotice && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-[#EA580C] font-medium flex items-center gap-2 animate-in fade-in">
          <Bot className="w-4 h-4 shrink-0" />
          <span>{aiNotice}</span>
        </div>
      )}

      {/* 2. Seletor de Projeto Obrigatório (Multi-tenant isolado) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#5F6368] uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>Selecione o Projeto para Análise Preditiva</span>
          </label>
          <span className="text-[11px] text-[#80868B]">
            Cada projeto possui seu próprio dashboard analítico independente
          </span>
        </div>

        <ProjectSelectorDropdown
          projects={projects}
          selectedProject={currentProject}
          onSelectProject={handleSelectProject}
        />
      </section>

      {/* Se não houver projetos cadastrados */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#DADCE0] p-12 text-center space-y-3">
          <Activity className="w-10 h-10 text-[#80868B] mx-auto animate-pulse" />
          <h3 className="text-base font-bold text-[#202124]">
            Nenhum projeto encontrado para análise
          </h3>
          <p className="text-xs text-[#5F6368] max-w-sm mx-auto">
            Cadastre ou selecione um projeto no sistema para gerar o score de felicidade, radar semântico e playbooks da IA.
          </p>
          <button
            type="button"
            onClick={() => onSelectView('dashboard')}
            className="px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Voltar ao Dashboard
          </button>
        </div>
      ) : !retencaoData || !currentProject ? (
        <div className="bg-white rounded-2xl border border-[#DADCE0] p-8 text-center text-xs text-[#80868B]">
          Carregando indicadores do projeto selecionado...
        </div>
      ) : (
        <>
          {/* 3. Topo: Score de Felicidade Geral + 4 Cards de Pilares */}
          <section className="space-y-4">
            {/* Card Principal: Score de Felicidade Geral (0 a 100) */}
            <HappinessScoreCard
              data={retencaoData}
              project={currentProject}
            />

            {/* 4 Cards menores com os Pilares Fundamentais */}
            <PillarsGrid
              pillars={retencaoData.pillars}
            />

            {/* Requisito Fase 3: Avaliação Multimodal de Voz (WhatsApp) */}
            <VocalToneAnalysisCard
              vocalTone={retencaoData.vocalToneAnalysis}
              clientName={currentProject.clientName}
              onOpenAudioModal={() => setIsAudioModalOpen(true)}
              attachedAudiosCount={attachedAudios.length}
            />
          </section>

          {/* 4. Centro: Radar Semântico (Nuvem de Palavras) em 2 Colunas */}
          <section className="pt-2">
            <SemanticRadarCloud
              positiveCloud={retencaoData.semanticRadar.positiveCloud}
              negativeCloud={retencaoData.semanticRadar.negativeCloud}
              clientName={currentProject.clientName}
            />
          </section>

          {/* 5. Base: Card de "Playbook Prescritivo da IA" */}
          <section className="pt-2">
            <AiPrescriptivePlaybook
              playbook={retencaoData.playbook}
              project={currentProject}
            />
          </section>
        </>
      )}

      {/* Modal de Gerenciamento e Escuta de Áudios do WhatsApp */}
      {currentProject && (
        <WhatsAppAudioModal
          project={currentProject}
          isOpen={isAudioModalOpen}
          onClose={() => setIsAudioModalOpen(false)}
          attachedAudios={attachedAudios}
          onUpdateAudios={setAttachedAudios}
          onAnalyzeWithAudios={(audios) => handleRecalculateAi(audios)}
          isAnalyzing={isAnalyzingWithAi}
        />
      )}

    </div>
  );
};
