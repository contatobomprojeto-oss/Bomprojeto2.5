import React from 'react';
import { 
  Mic, 
  Volume2, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  Radio,
  FileAudio
} from 'lucide-react';
import { VocalToneAnalysis, RetentionAudioInput } from '../../types';

interface VocalToneAnalysisCardProps {
  vocalTone?: VocalToneAnalysis;
  clientName?: string;
  onOpenAudioModal?: () => void;
  attachedAudiosCount?: number;
}

export const VocalToneAnalysisCard: React.FC<VocalToneAnalysisCardProps> = ({
  vocalTone,
  clientName = 'Cliente',
  onOpenAudioModal,
  attachedAudiosCount = 0
}) => {
  if (!vocalTone && attachedAudiosCount === 0) {
    return (
      <div className="bg-[#F8F9FA] border border-dashed border-[#EAECEF] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#EA580C] border border-orange-200 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#0F172A]">
                Análise Multimodal de Voz (WhatsApp)
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#EA580C] border border-orange-200">
                Fase 3 • Gemini Multimodal
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Anexe áudios (.ogg, .mp3) de conversas do WhatsApp para avaliar o tom de voz do cliente (hesitação, irritação, satisfação) e calibrar o atrito em tempo real.
            </p>
          </div>
        </div>

        {onOpenAudioModal && (
          <button
            type="button"
            onClick={onOpenAudioModal}
            className="px-4 py-2 bg-white hover:bg-[#F1F5F9] border border-[#EAECEF] text-[#0F172A] text-xs font-semibold rounded-xl transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Mic className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>Anexar Áudio de Voz</span>
          </button>
        )}
      </div>
    );
  }

  const getHesitationBadge = (level?: string) => {
    switch (level) {
      case 'alta':
        return { label: 'Hesitação Alta', color: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'moderada':
        return { label: 'Hesitação Moderada', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'leve':
        return { label: 'Hesitação Leve', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' };
      default:
        return { label: 'Sem Hesitação', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
  };

  const getIrritationBadge = (level?: string) => {
    switch (level) {
      case 'alta':
        return { label: 'Irritação Alta', color: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'moderada':
        return { label: 'Irritação Moderada', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'leve':
        return { label: 'Insegurança/Cobrança', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { label: 'Sem Irritação', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
  };

  const getSatisfactionBadge = (level?: string) => {
    switch (level) {
      case 'excelente':
        return { label: 'Satisfação Excelente', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'alta':
        return { label: 'Satisfação Alta', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'regular':
        return { label: 'Satisfação Regular', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { label: 'Satisfação Baixa', color: 'bg-rose-50 text-rose-800 border-rose-200' };
    }
  };

  const hesitation = getHesitationBadge(vocalTone?.hesitationLevel);
  const irritation = getIrritationBadge(vocalTone?.irritationLevel);
  const satisfaction = getSatisfactionBadge(vocalTone?.satisfactionLevel);

  return (
    <div className="bg-white rounded-2xl border border-[#EAECEF] p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECEF] pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#EA580C] border border-orange-200 flex items-center justify-center font-bold shrink-0">
            <Radio className="w-5 h-5 text-[#EA580C] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[#0F172A]">
                Diagnóstico Vocal do WhatsApp (Multimodal Gemini)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>{vocalTone?.audiosAnalyzed || attachedAudiosCount} áudio(s) processado(s)</span>
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Tom de voz, cadência e micro-expressões avaliados diretamente pelo Gemini para calibrar atrito e palavras-chave.
            </p>
          </div>
        </div>

        {onOpenAudioModal && (
          <button
            type="button"
            onClick={onOpenAudioModal}
            className="px-3.5 py-1.5 bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#EAECEF] text-[#0F172A] text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Mic className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>Gerenciar Áudios ({attachedAudiosCount})</span>
          </button>
        )}
      </div>

      {/* Conteúdo: Resumo do Tom + Indicadores de Sentimento Vocal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Resumo do Tom */}
        <div className="md:col-span-2 p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E8EAED] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#80868B] uppercase tracking-wider flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>Resumo do Tom Vocal do Cliente</span>
            </span>
            <span className="text-[10px] text-[#5F6368]">
              {clientName}
            </span>
          </div>
          <p className="text-xs text-[#202124] leading-relaxed font-medium">
            {vocalTone?.toneSummary || 'Análise de voz multimodal processada e integrada aos pilares de retenção.'}
          </p>
          {vocalTone?.audioNotes && (
            <p className="text-[11px] text-[#5F6368] italic border-t border-[#E8EAED]/60 pt-1">
              {vocalTone.audioNotes}
            </p>
          )}
        </div>

        {/* Níveis de Hesitação, Irritação e Satisfação */}
        <div className="p-3.5 bg-white rounded-xl border border-[#E8EAED] flex flex-col justify-between gap-2 text-xs">
          <span className="text-[10px] font-bold text-[#80868B] uppercase tracking-wider">
            Métricas de Entonação
          </span>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#5F6368]">Hesitação:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hesitation.color}`}>
                {hesitation.label}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#5F6368]">Irritação:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${irritation.color}`}>
                {irritation.label}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#5F6368]">Satisfação:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${satisfaction.color}`}>
                {satisfaction.label}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-[#80868B] pt-1 border-t border-[#E8EAED] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Calibrado no Pilar de Atrito</span>
          </div>
        </div>
      </div>
    </div>
  );
};
