import React, { useState } from 'react';
import { 
  ThumbsUp, 
  AlertTriangle, 
  MessageSquare, 
  Sparkles, 
  Tag,
  Info,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { SemanticWord } from '../../types';

interface SemanticRadarCloudProps {
  positiveCloud: SemanticWord[];
  negativeCloud: SemanticWord[];
  clientName: string;
}

export const SemanticRadarCloud: React.FC<SemanticRadarCloudProps> = ({
  positiveCloud,
  negativeCloud,
  clientName
}) => {
  const [selectedWord, setSelectedWord] = useState<SemanticWord | null>(null);

  // Calcula escala de tamanho da fonte baseado na contagem de repetições
  const getWordSize = (count: number, maxCount: number) => {
    const ratio = count / (maxCount || 1);
    if (ratio > 0.7) return 'text-base sm:text-lg font-black';
    if (ratio > 0.4) return 'text-sm sm:text-base font-bold';
    return 'text-xs sm:text-sm font-semibold';
  };

  const maxPositive = Math.max(...positiveCloud.map(w => w.count), 1);
  const maxNegative = Math.max(...negativeCloud.map(w => w.count), 1);

  return (
    <div className="space-y-4">
      {/* Header da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAECEF] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#0F172A]">
              Radar Semântico & Nuvem de Sentimentos
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              IA NLP • WhatsApp & Portal
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Mapeamento em tempo real dos termos mais citados por <strong>{clientName}</strong> e pela equipe técnica.
          </p>
        </div>

        <span className="text-[11px] text-[#94A3B8] font-medium hidden sm:inline">
          Clique no termo para ler o trecho de mensagem correspondente
        </span>
      </div>

      {/* Grid de 2 Colunas (Positivo x Negativo) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* COLUNA 1: Nuvem Positiva (Verde / Azul) */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 space-y-4 shadow-2xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <ThumbsUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-950">
                  Nuvem Positiva • Encantamento
                </h4>
                <p className="text-[11px] text-emerald-700">
                  Validação de qualidade, elogios e satisfação com a entrega
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              {positiveCloud.reduce((acc, curr) => acc + curr.count, 0)} menções
            </span>
          </div>

          {/* Nuvem de Palavras Positivas */}
          <div className="flex flex-wrap items-center gap-2.5 min-h-[140px] p-2 bg-[#F8FCF9] rounded-xl border border-emerald-100/60 content-start">
            {positiveCloud.length === 0 ? (
              <p className="text-xs text-[#80868B] m-auto py-6">
                Nenhum termo positivo mapeado ainda.
              </p>
            ) : (
              positiveCloud.map((item, idx) => {
                const isSelected = selectedWord?.word === item.word;
                const sizeClass = getWordSize(item.count, maxPositive);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedWord(isSelected ? null : item)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400 scale-105'
                        : 'bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 hover:border-emerald-300 shadow-2xs hover:scale-102'
                    }`}
                  >
                    <span className={sizeClass}>
                      {item.word}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      +{item.count}x
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-emerald-800/80">
            <span>Destaque para acabamentos finos e pontualidade</span>
            <span className="font-semibold text-emerald-700">Sentimento predominante: Promotor</span>
          </div>
        </div>

        {/* COLUNA 2: Nuvem Negativa / Alertas (Vermelho / Laranja) */}
        <div className="bg-white rounded-2xl border border-rose-200/80 p-5 space-y-4 shadow-2xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-950">
                  Nuvem de Alertas • Fricção & Riscos
                </h4>
                <p className="text-[11px] text-rose-700">
                  Dúvidas pontuais, cobranças de prazo e ruídos a sanar
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
              {negativeCloud.reduce((acc, curr) => acc + curr.count, 0)} alertas
            </span>
          </div>

          {/* Nuvem de Palavras Negativas / Alertas */}
          <div className="flex flex-wrap items-center gap-2.5 min-h-[140px] p-2 bg-[#FFF8F8] rounded-xl border border-rose-100/60 content-start">
            {negativeCloud.length === 0 ? (
              <div className="text-center m-auto py-6 text-emerald-800 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-950">Zero Alertas Críticos</p>
                <p className="text-[11px] text-emerald-700">Nenhum termo de atrito registrado para este cliente.</p>
              </div>
            ) : (
              negativeCloud.map((item, idx) => {
                const isSelected = selectedWord?.word === item.word;
                const sizeClass = getWordSize(item.count, maxNegative);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedWord(isSelected ? null : item)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400 scale-105'
                        : 'bg-white hover:bg-rose-50 text-rose-900 border border-rose-200 hover:border-rose-300 shadow-2xs hover:scale-102'
                    }`}
                  >
                    <span className={sizeClass}>
                      {item.word}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.count}x
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-rose-800/80">
            <span>Prioridade de resposta: Menos de 30 minutos</span>
            <span className="font-semibold text-rose-700">Mapeamento contínuo de ruídos</span>
          </div>
        </div>

      </div>

      {/* Card Contextual ao Clicar em um Termo da Nuvem */}
      {selectedWord && (
        <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                selectedWord.sentiment === 'positive'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {selectedWord.sentiment === 'positive' ? 'Sentimento Positivo' : 'Ponto de Fricção'}
              </span>
              <strong className="text-xs sm:text-sm font-bold text-[#0F172A]">
                Termo: "{selectedWord.word}"
              </strong>
              <span className="text-[11px] font-mono text-[#64748B]">
                ({selectedWord.count} {selectedWord.count === 1 ? 'ocorrência' : 'ocorrências'})
              </span>
            </div>

            <p className="text-xs text-[#334155] italic">
              {selectedWord.sampleContext || `Cliente utilizou este termo em mensagens recentes no portal ou WhatsApp.`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedWord(null)}
            className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] underline cursor-pointer shrink-0 self-start sm:self-auto"
          >
            Fechar detalhes
          </button>
        </div>
      )}
    </div>
  );
};
