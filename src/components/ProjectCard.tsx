import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ExternalLink, 
  ChevronRight, 
  ChevronLeft,
  Lock, 
  Hammer,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { Project } from '../types';
import { useFinancialPrivacy } from '../hooks/useFinancialPrivacy';

export interface ProjectCardProps {
  project: Project;
  onSelectProject: (id: string) => void;
  onSelectView?: (view: any) => void;
  onQuickAiAlert?: (project: Project) => void;
  canUseAi?: boolean;
  hasFinancialAccess?: boolean;
  onAdvanceStage?: (projectId: string) => void;
  onRegressStage?: (projectId: string) => void;
  onChargePixWhatsapp?: (project: Project, installment: any) => void;
  onDeleteProject?: (project: Project) => void;
  onRestoreProject?: (projectId: string) => void;
  canDelete?: boolean;
  className?: string;
  variant?: 'dashboard' | 'finance';
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelectProject,
  onSelectView,
  onQuickAiAlert,
  canUseAi = true,
  hasFinancialAccess = true,
  onAdvanceStage,
  onRegressStage,
  onChargePixWhatsapp,
  onDeleteProject,
  onRestoreProject,
  canDelete = false,
  className = '',
  variant = 'dashboard'
}) => {
  const { hideFinancials, blurClass } = useFinancialPrivacy();
  const isDeleted = project.status === 'excluido' || !!project.isDeleted;
  const isCompleted = project.status === 'concluido';
  const hasPendingAttention = !isDeleted && (project.needsAttention || project.daysWithoutUpdate > 5);

  // Determina paleta de cores e brilho (glow) de acordo com o status e etapa atual
  const stageLower = (project.currentStage || '').toLowerCase();

  let badgeTheme = {
    bgClass: 'bg-orange-50 text-[#FF6515] border-orange-200',
    glowColor: 'rgba(255, 101, 21, 0.55)',
    dotColor: 'bg-[#FF6515]',
    label: project.currentStage || 'Em Execução'
  };

  if (isDeleted) {
    badgeTheme = {
      bgClass: 'bg-red-50 text-red-700 border-red-300',
      glowColor: 'rgba(239, 68, 68, 0.65)',
      dotColor: 'bg-red-600',
      label: 'Excluído (Lixeira)'
    };
  } else if (isCompleted) {
    badgeTheme = {
      bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      glowColor: 'rgba(16, 185, 129, 0.65)',
      dotColor: 'bg-emerald-600',
      label: 'Concluído'
    };
  } else if (hasPendingAttention) {
    badgeTheme = {
      bgClass: 'bg-amber-50 text-amber-800 border-amber-300',
      glowColor: 'rgba(245, 158, 11, 0.7)',
      dotColor: 'bg-amber-600',
      label: project.currentStage || 'Atenção Necessária'
    };
  } else if (stageLower.includes('montagem') || stageLower.includes('instalação') || stageLower.includes('entrega')) {
    badgeTheme = {
      bgClass: 'bg-purple-50 text-purple-700 border-purple-300',
      glowColor: 'rgba(168, 85, 247, 0.6)',
      dotColor: 'bg-purple-600',
      label: project.currentStage
    };
  } else if (stageLower.includes('acabamento') || stageLower.includes('pintura')) {
    badgeTheme = {
      bgClass: 'bg-cyan-50 text-cyan-800 border-cyan-300',
      glowColor: 'rgba(6, 182, 212, 0.6)',
      dotColor: 'bg-cyan-600',
      label: project.currentStage
    };
  } else if (stageLower.includes('corte') || stageLower.includes('usinagem') || stageLower.includes('estrutura')) {
    badgeTheme = {
      bgClass: 'bg-blue-50 text-blue-700 border-blue-300',
      glowColor: 'rgba(37, 99, 235, 0.6)',
      dotColor: 'bg-blue-600',
      label: project.currentStage
    };
  } else if (stageLower.includes('projeto') || stageLower.includes('medição') || stageLower.includes('briefing')) {
    badgeTheme = {
      bgClass: 'bg-teal-50 text-teal-800 border-teal-300',
      glowColor: 'rgba(20, 184, 166, 0.6)',
      dotColor: 'bg-teal-600',
      label: project.currentStage
    };
  } else if (project.progressPercent >= 75) {
    badgeTheme = {
      bgClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      glowColor: 'rgba(99, 102, 241, 0.55)',
      dotColor: 'bg-indigo-600',
      label: project.currentStage
    };
  }

  // Encontra a etapa atual para saber se pode avançar ou retroceder
  const stages = project.stages || [];
  const currentStageIdx = stages.findIndex(s => s.name === project.currentStage || s.status === 'current');
  const canRegress = currentStageIdx > 0 || isCompleted;
  const canAdvance = currentStageIdx >= 0 && currentStageIdx < stages.length - 1 && !isCompleted;

  const paidAmount = (project.installments || [])
    .filter(inst => inst.status === 'paid')
    .reduce((sum, inst) => sum + (inst.amount || 0), 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -2, transition: { duration: 0.18, ease: 'easeOut' } }}
      className={`p-4 space-y-3 bg-white rounded-2xl border border-[#EAECEF] hover:border-[#CBD5E1] hover:shadow-xs transition-all select-none ${className}`}
    >
      {/* Header do Card */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 
              onClick={() => onSelectProject(project.id)}
              className="font-semibold text-sm text-[#202124] leading-tight truncate hover:text-[#FF6515] transition-colors cursor-pointer"
            >
              {project.title}
            </h3>
            {project.unit && (
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                {project.unit}
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-[#80868B] mt-0.5 truncate">
            {project.code} • {project.clientName}
          </div>
          <div className="text-[11px] text-[#5F6368] mt-0.5 truncate">
            {project.clientPhone}
          </div>
        </div>

        {/* Indicador de Status da Etapa com Animação de Transição Suave, Cor e Brilho (Framer Motion) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${project.id}-${project.currentStage}-${project.status}`}
            layout
            initial={{ 
              scale: 0.82, 
              opacity: 0.4,
              filter: 'brightness(1.9) saturate(1.4)',
              boxShadow: `0 0 28px ${badgeTheme.glowColor}`
            }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              filter: [
                'brightness(1.8) saturate(1.3)',
                'brightness(1.2) saturate(1.1)',
                'brightness(1) saturate(1)'
              ],
              boxShadow: [
                `0 0 0px ${badgeTheme.glowColor}`,
                `0 0 20px ${badgeTheme.glowColor}`,
                `0 0 4px ${badgeTheme.glowColor}`
              ]
            }}
            exit={{ 
              scale: 0.85, 
              opacity: 0, 
              filter: 'brightness(1.5)',
              transition: { duration: 0.22, ease: 'easeIn' }
            }}
            transition={{
              duration: 0.65,
              ease: [0.16, 1, 0.3, 1] // Suave spring-like ease
            }}
            className={`inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-xl border shrink-0 relative overflow-hidden transition-all shadow-sm ${badgeTheme.bgClass}`}
            title={`Etapa Atual: ${badgeTheme.label}`}
          >
            {/* Ponto de brilho/halo pulsante com Framer Motion */}
            <span className="relative flex h-2 w-2 shrink-0">
              <motion.span
                animate={{ 
                  scale: [1, 1.6, 1], 
                  opacity: [0.9, 0.2, 0.9] 
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badgeTheme.dotColor}`}
              />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${badgeTheme.dotColor}`} />
            </span>

            {/* Ícone contextual com suave micro-animação */}
            <motion.span
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="shrink-0 flex items-center justify-center"
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : hasPendingAttention ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <Hammer className="w-3.5 h-3.5" />
              )}
            </motion.span>

            {/* Texto da etapa */}
            <span className="truncate max-w-[130px] sm:max-w-[170px]">
              {badgeTheme.label}
            </span>

            {/* Efeito de varredura de feixe de luz/brilho (Shine sweep) na transição */}
            <motion.span
              key={`sweep-${project.currentStage}-${project.status}`}
              initial={{ x: '-100%', opacity: 1 }}
              animate={{ x: '240%', opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0 w-2/3 bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-12 pointer-events-none"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Barra de Progresso com Transição Animada */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-[#5F6368]">
          <span className="flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3 text-[#F97316]" />
            Progresso da Produção
          </span>
          <span className="font-bold text-[#202124]">{project.progressPercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#E8EAED] rounded-full overflow-hidden">
          <motion.div
            initial={false}
            animate={{ width: `${project.progressPercent}%` }}
            transition={{ duration: 0.65, ease: 'easeInOut' }}
            className={`h-full rounded-full ${isCompleted ? 'bg-[#188038]' : 'bg-[#F97316]'}`}
          />
        </div>
      </div>

      {/* Linha Financeira (se variante finance ou com acesso) */}
      {variant === 'finance' && hasFinancialAccess && (
        <div className="space-y-2 pt-2 border-t border-[#F1F3F4]">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-[#80868B] block">Valor Total</span>
              <span className={`font-semibold text-[#202124] ${blurClass}`}>
                R$ {project.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#188038] block">Liquidado</span>
              <span className={`font-semibold text-[#188038] ${blurClass}`}>
                R$ {paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Parcelas com botão de cobrança Pix */}
          {project.installments && project.installments.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-semibold text-[#5F6368] uppercase tracking-wide block">
                Parcelas:
              </span>
              <div className="space-y-1">
                {project.installments.slice(0, 3).map((inst) => (
                  <div
                    key={inst.number}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-[#F8F9FA] border border-[#E8EAED] text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${inst.status === 'paid' ? 'bg-[#188038]' : 'bg-[#B06000]'}`} />
                      <span className="font-medium text-[#202124]">Parcela {inst.number}:</span>
                      <span className={`text-[#5F6368] ${blurClass}`}>
                        R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {inst.status === 'paid' ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#137333]">
                        Pago
                      </span>
                    ) : onChargePixWhatsapp ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChargePixWhatsapp(project, inst);
                        }}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-white transition-colors cursor-pointer"
                      >
                        Cobrar Pix
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        Pendente
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rodapé com Informações de Entrega e Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-between pt-2 gap-2 border-t border-[#F1F3F4]">
        <div className="text-[11px] text-[#80868B]">
          Entrega: <strong className="text-[#202124]">{project.deliveryDate}</strong>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Controles de Movimentação de Etapa (Avançar / Retroceder) com animação instantânea */}
          {(onAdvanceStage || onRegressStage) && (
            <div className="inline-flex items-center rounded-lg border border-[#E8EAED] bg-[#F8F9FA] p-0.5">
              {onRegressStage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegressStage(project.id);
                  }}
                  disabled={!canRegress}
                  title={canRegress ? "Retroceder etapa" : "Primeira etapa"}
                  className="p-1 rounded text-[#5F6368] hover:text-[#202124] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              {onAdvanceStage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvanceStage(project.id);
                  }}
                  disabled={!canAdvance}
                  title={canAdvance ? "Avançar para próxima etapa" : "Projeto concluído"}
                  className="p-1 rounded text-[#5F6368] hover:text-[#FF6515] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {canUseAi && onQuickAiAlert && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAiAlert(project);
              }}
              title="Disparar Boletim WhatsApp IA"
              className="p-2 rounded-lg border border-[#E8EAED] bg-white text-[#F97316] hover:bg-[#FFF8F3] hover:border-[#FFD8BE] transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {onSelectView && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectProject(project.id);
                onSelectView('client_portal');
              }}
              title="Acessar Portal do Cliente"
              className="p-2 rounded-lg border border-[#E8EAED] bg-white text-[#5F6368] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          {isDeleted && onRestoreProject && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRestoreProject(project.id);
              }}
              title="Restaurar este projeto para os ativos"
              className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar</span>
            </button>
          )}

          {!isDeleted && canDelete && onDeleteProject && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteProject(project);
              }}
              title="Excluir projeto (Mover para Aba de Exclusão)"
              className="p-2 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectProject(project.id)}
            className="py-1.5 px-3 rounded-lg bg-[#202124] hover:bg-black text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
          >
            <span>Abrir OS</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
