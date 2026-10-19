import React from 'react';
import { 
  HeartHandshake, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Sparkles, 
  Info,
  Smile,
  Meh,
  Frown
} from 'lucide-react';
import { RetencaoProjectData, Project } from '../../types';

interface HappinessScoreCardProps {
  data: RetencaoProjectData;
  project: Project;
}

export const HappinessScoreCard: React.FC<HappinessScoreCardProps> = ({
  data,
  project
}) => {
  const { happinessScore, happinessStatus, happinessStatusLabel, happinessTrend, summary } = data;

  // Cores dinâmicas de acordo com o status Verde / Amarelo / Vermelho
  const statusConfig = {
    verde: {
      themeColor: '#16A34A',
      bgColor: 'bg-emerald-500',
      lightBg: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-900',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: Smile,
      label: 'Promotor • Alta Retenção',
      riskLevel: 'Risco de Churn: Mínimo (3%)',
      npsEstimate: 'NPS Preditivo: +85'
    },
    amarelo: {
      themeColor: '#D97706',
      bgColor: 'bg-amber-500',
      lightBg: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-900',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: Meh,
      label: 'Neutro • Atenção Operacional',
      riskLevel: 'Risco de Churn: Moderado (38%)',
      npsEstimate: 'NPS Preditivo: +20'
    },
    vermelho: {
      themeColor: '#DC2626',
      bgColor: 'bg-rose-500',
      lightBg: 'bg-rose-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-900',
      badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
      icon: Frown,
      label: 'Detrator • Risco Crítico',
      riskLevel: 'Risco de Churn: Alto (76%)',
      npsEstimate: 'NPS Preditivo: -45'
    }
  }[happinessStatus];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white rounded-2xl border border-[#EAECEF] p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all">
      {/* Barra superior de acento com cor do indicador */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: statusConfig.themeColor }}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Lado Esquerdo: Score Numérico com Gauge e Indicador */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 shrink-0">
          
          {/* Círculo do Score */}
          <div className="relative flex items-center justify-center shrink-0">
            <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-3xl ${statusConfig.lightBg} border-2 ${statusConfig.borderColor} flex flex-col items-center justify-center p-3 shadow-inner`}>
              <div className="flex items-center gap-1">
                <StatusIcon className="w-4 h-4" style={{ color: statusConfig.themeColor }} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6368]">
                  Score
                </span>
              </div>
              
              <div className="flex items-baseline font-mono font-black text-3xl sm:text-4xl tracking-tight text-[#202124] mt-0.5">
                <span style={{ color: statusConfig.themeColor }}>{happinessScore}</span>
                <span className="text-xs font-semibold text-[#80868B] ml-1">/100</span>
              </div>

              {/* Indicador de Tendência */}
              <div className="flex items-center gap-1 mt-1 text-[11px] font-bold">
                {happinessTrend > 0 ? (
                  <span className="text-emerald-700 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5 inline" />
                    +{happinessTrend} pts
                  </span>
                ) : happinessTrend < 0 ? (
                  <span className="text-rose-700 flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                    {happinessTrend} pts
                  </span>
                ) : (
                  <span className="text-[#80868B] flex items-center">
                    <Minus className="w-3 h-3 mr-0.5 inline" />
                    Estável
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Textos Principais do Score */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#80868B] uppercase tracking-wider">
                Score de Felicidade Geral
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusConfig.badgeBg}`}>
                {statusConfig.label}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-[#202124] leading-tight">
              {happinessStatusLabel}
            </h2>

            {/* Barra Visual de 3 Zonas (Vermelho / Amarelo / Verde) */}
            <div className="space-y-1.5 max-w-xs sm:max-w-sm pt-1">
              <div className="h-2.5 w-full bg-[#F1F3F4] rounded-full overflow-hidden flex">
                <div className="w-1/2 h-full bg-rose-200" title="Zona Vermelha: 0 a 49" />
                <div className="w-1/4 h-full bg-amber-200" title="Zona Amarela: 50 a 74" />
                <div className="w-1/4 h-full bg-emerald-200" title="Zona Verde: 75 a 100" />
              </div>
              
              {/* Barra de Progresso Real do Score */}
              <div className="relative h-2 w-full bg-[#E8EAED] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${happinessScore}%`,
                    backgroundColor: statusConfig.themeColor 
                  }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-[#80868B] font-mono px-0.5">
                <span>0 Crítico</span>
                <span>50 Atenção</span>
                <span>75+ Promotor</span>
                <span>100</span>
              </div>
            </div>
          </div>

        </div>

        {/* Lado Direito: Diagnóstico Executivo da IA & Métricas Preditoras */}
        <div className="flex-1 lg:max-w-xl bg-[#FAF8F5] border border-[#E8EAED] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#202124]">
              <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>Diagnóstico Executivo da IA</span>
            </div>
            <span className="text-[10px] font-mono font-semibold text-[#80868B] bg-white px-2 py-0.5 rounded-md border border-[#E8EAED]">
              Atualizado em tempo real
            </span>
          </div>

          <p className="text-xs text-[#3C4043] leading-relaxed">
            {summary}
          </p>

          <div className="pt-2 border-t border-[#E8EAED] flex flex-wrap items-center gap-2 sm:gap-4 text-[11px]">
            <div className="flex items-center gap-1.5 font-medium text-[#202124]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig.themeColor }} />
              <span>{statusConfig.riskLevel}</span>
            </div>
            <span className="text-[#DADCE0] hidden sm:inline">•</span>
            <div className="text-[#5F6368] font-medium">
              {statusConfig.npsEstimate}
            </div>
            <span className="text-[#DADCE0] hidden sm:inline">•</span>
            <div className="text-[#5F6368]">
              OS: <strong className="font-mono text-[#202124]">{project.code}</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
