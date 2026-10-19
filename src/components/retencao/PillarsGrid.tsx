import React from 'react';
import { 
  MessageSquareWarning, 
  Clock, 
  Sparkles, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { RetencaoPillar } from '../../types';

interface PillarsGridProps {
  pillars: {
    communicationFriction: RetencaoPillar;
    operationalReliability: RetencaoPillar;
    perceivedValue: RetencaoPillar;
    contractualRisk: RetencaoPillar;
  };
}

export const PillarsGrid: React.FC<PillarsGridProps> = ({ pillars }) => {
  const { communicationFriction, operationalReliability, perceivedValue, contractualRisk } = pillars;

  // Helper para calibrar se o score é positivo ou negativo no contexto do pilar
  // Para Atrito e Risco, menor score = melhor!
  // Para Confiabilidade e Valor, maior score = melhor!
  const getPillarStatus = (type: 'friction' | 'reliability' | 'value' | 'risk', score: number) => {
    if (type === 'friction' || type === 'risk') {
      if (score <= 20) {
        return {
          badge: 'Excelente (Baixo)',
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          barColor: 'bg-emerald-500',
          isGood: true
        };
      }
      if (score <= 45) {
        return {
          badge: 'Moderado',
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
          barColor: 'bg-amber-500',
          isGood: false
        };
      }
      return {
        badge: 'Alerta Alto',
        badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
        barColor: 'bg-rose-500',
        isGood: false
      };
    } else {
      if (score >= 75) {
        return {
          badge: 'Excelente',
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          barColor: 'bg-emerald-500',
          isGood: true
        };
      }
      if (score >= 50) {
        return {
          badge: 'Regular / Em Evolução',
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
          barColor: 'bg-amber-500',
          isGood: false
        };
      }
      return {
        badge: 'Crítico',
        badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
        barColor: 'bg-rose-500',
        isGood: false
      };
    }
  };

  const pilarCards = [
    {
      id: 'comm-friction',
      title: 'Atrito na Comunicação',
      pillar: communicationFriction,
      type: 'friction' as const,
      icon: MessageSquareWarning,
      iconColor: 'text-[#EA580C]',
      iconBg: 'bg-[#FFF7ED]',
      kicker: 'Velocidade & Harmonia no WhatsApp',
      benchmark: 'Meta ideal: < 25'
    },
    {
      id: 'operational-reliability',
      title: 'Confiabilidade Operacional & Prazos',
      pillar: operationalReliability,
      type: 'reliability' as const,
      icon: Clock,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      kicker: 'Pontualidade de Etapas & Oficinas',
      benchmark: 'Meta ideal: > 80'
    },
    {
      id: 'perceived-value',
      title: 'Percepção de Valor & Entregas',
      pillar: perceivedValue,
      type: 'value' as const,
      icon: Sparkles,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      kicker: 'Satisfação com Renders & Acabamento',
      benchmark: 'Meta ideal: > 85'
    },
    {
      id: 'contractual-risk',
      title: 'Risco Contratual',
      pillar: contractualRisk,
      type: 'risk' as const,
      icon: ShieldAlert,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      kicker: 'Adimplência, Termos & Escopo',
      benchmark: 'Meta ideal: < 20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {pilarCards.map((card) => {
        const Icon = card.icon;
        const status = getPillarStatus(card.type, card.pillar.score);

        return (
          <div 
            key={card.id}
            className="bg-white rounded-2xl border border-[#EAECEF] p-4.5 sm:p-5 flex flex-col justify-between shadow-xs hover:border-[#CBD5E1] transition-all group"
          >
            <div className="space-y-3">
              {/* Header do Card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#202124] leading-tight">
                      {card.title}
                    </h3>
                    <span className="text-[10px] text-[#80868B] block mt-0.5">
                      {card.kicker}
                    </span>
                  </div>
                </div>
              </div>

              {/* Score Grande e Badge */}
              <div className="flex items-baseline justify-between pt-1">
                <div className="flex items-baseline font-mono font-black text-2xl sm:text-3xl text-[#202124]">
                  <span>{card.pillar.score}</span>
                  <span className="text-xs font-semibold text-[#80868B] ml-1">/100</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.badgeColor}`}>
                  {status.badge}
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-[#F1F3F4] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${status.barColor}`}
                    style={{ width: `${Math.min(100, Math.max(5, card.pillar.score))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#80868B] font-mono">
                  <span>{card.benchmark}</span>
                  <span className="font-semibold">{card.pillar.score}%</span>
                </div>
              </div>

              {/* Descrição e Detalhe */}
              <div className="pt-2 border-t border-[#F1F3F4] space-y-1">
                <p className="text-xs font-semibold text-[#202124] line-clamp-1">
                  {card.pillar.description}
                </p>
                <p className="text-[11px] text-[#5F6368] leading-snug line-clamp-2">
                  {card.pillar.detail}
                </p>
              </div>
            </div>

            {/* Variação recente */}
            <div className="pt-3 mt-3 border-t border-[#F1F3F4] flex items-center justify-between text-[10px]">
              <span className="text-[#80868B]">Tendência Recente:</span>
              <span className="font-bold flex items-center gap-0.5">
                {card.pillar.delta > 0 ? (
                  <span className="text-emerald-700 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    +{card.pillar.delta}%
                  </span>
                ) : card.pillar.delta < 0 ? (
                  <span className="text-rose-700 flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                    {card.pillar.delta}%
                  </span>
                ) : (
                  <span className="text-[#80868B] flex items-center">
                    <Minus className="w-3 h-3 mr-0.5" />
                    Estável
                  </span>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
