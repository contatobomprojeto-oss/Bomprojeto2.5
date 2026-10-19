import React, { useState } from 'react';
import { 
  Bot, 
  Copy, 
  Check, 
  Send, 
  ExternalLink, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { AiPlaybookAction, Project } from '../../types';

interface AiPrescriptivePlaybookProps {
  playbook: AiPlaybookAction[];
  project: Project;
  onApplyAction?: (actionId: string) => void;
}

export const AiPrescriptivePlaybook: React.FC<AiPrescriptivePlaybookProps> = ({
  playbook,
  project,
  onApplyAction
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});

  const handleCopyMessage = (action: AiPlaybookAction) => {
    if (!action.whatsappMessage) return;
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(action.whatsappMessage);
      }
    } catch (e) {
      console.warn('Erro ao copiar:', e);
    }
    setCopiedId(action.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleApply = (actionId: string) => {
    setAppliedActions(prev => {
      const nextState = !prev[actionId];
      if (onApplyAction && nextState) {
        onApplyAction(actionId);
      }
      return { ...prev, [actionId]: nextState };
    });
  };

  // Requisito Fase 3: Copiar o template de resposta e abrir diretamente o link wa.me do cliente
  const handleCopyAndOpenWhatsApp = (action: AiPlaybookAction) => {
    if (!action.whatsappMessage) return;

    // 1. Copia o template para a área de transferência
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(action.whatsappMessage);
      }
    } catch (e) {
      console.warn('Falha no clipboard:', e);
    }
    setCopiedId(action.id);

    // 2. Normaliza o telefone do cliente com DDI 55
    const rawPhone = (project.clientPhone || '').replace(/\D/g, '');
    let cleanPhone = '';
    if (rawPhone) {
      cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    }

    // 3. Monta o link wa.me oficial
    const textEncoded = encodeURIComponent(action.whatsappMessage);
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${textEncoded}`
      : `https://wa.me/?text=${textEncoded}`;

    // 4. Dispara abertura da janela do WhatsApp
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Marca também a ação como aplicada automaticamente
    setAppliedActions(prev => ({ ...prev, [action.id]: true }));
    if (onApplyAction) {
      onApplyAction(action.id);
    }

    setTimeout(() => setCopiedId(null), 3500);
  };

  const getUrgencyConfig = (urgency: AiPlaybookAction['urgency']) => {
    switch (urgency) {
      case 'critica':
        return {
          label: 'Ação Crítica Imediata',
          badge: 'bg-rose-100 text-rose-800 border-rose-200',
          border: 'border-rose-300 bg-rose-50/30',
          accent: 'text-rose-600',
          dot: 'bg-rose-500'
        };
      case 'preventiva':
        return {
          label: 'Ação Preventiva de Prazos',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          border: 'border-amber-300 bg-amber-50/30',
          accent: 'text-amber-600',
          dot: 'bg-amber-500'
        };
      default:
        return {
          label: 'Oportunidade de Encantamento',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          border: 'border-emerald-300 bg-emerald-50/30',
          accent: 'text-emerald-600',
          dot: 'bg-emerald-500'
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EAECEF] p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header do Playbook */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECEF] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#EA580C] border border-orange-200 flex items-center justify-center font-bold shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#0F172A]">
                Playbook Prescritivo da IA
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#EA580C] border border-orange-200">
                Ações Recomendadas
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Diagnósticos situacionais e mensagens prontas para antecipar objeções e blindar a relação com o cliente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <span className="font-semibold text-[#0F172A]">{playbook.length}</span> {playbook.length === 1 ? 'ação gerada' : 'ações geradas'}
        </div>
      </div>

      {/* Lista de Cards Prescritivos */}
      <div className="space-y-4">
        {playbook.length === 0 ? (
          <div className="p-8 text-center bg-[#F8F9FA] rounded-xl border border-dashed border-[#EAECEF] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-[#0F172A]">Tudo em Perfeita Harmonia</h4>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              Nenhuma ação prescritiva urgente necessária no momento para este cliente. O projeto segue com excelente indicador de retenção.
            </p>
          </div>
        ) : (
          playbook.map((action) => {
            const urgency = getUrgencyConfig(action.urgency);
            const isCopied = copiedId === action.id;
            const isApplied = appliedActions[action.id] || action.applied;

            return (
              <div
                key={action.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isApplied 
                    ? 'border-gray-200 bg-gray-50/70 opacity-80' 
                    : urgency.border
                } shadow-xs space-y-3.5`}
              >
                {/* Linha Superior: Urgência e Status */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${urgency.dot}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${urgency.badge}`}>
                      {urgency.label}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-[#0F172A]">
                      {action.title}
                    </h4>
                  </div>

                  {isApplied && (
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Ação Aplicada
                    </span>
                  )}
                </div>

                {/* Grid Diagnóstico x Ação Recomendada */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Diagnóstico */}
                  <div className="p-3 bg-white/90 rounded-xl border border-[#EAECEF] space-y-1">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                      Diagnóstico Situacional da IA
                    </span>
                    <p className="text-[#334155] leading-relaxed">
                      {action.diagnosis}
                    </p>
                  </div>

                  {/* Ação Recomendada */}
                  <div className="p-3 bg-white/90 rounded-xl border border-[#EAECEF] space-y-1">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                      Ação Recomendada pela IA
                    </span>
                    <p className="text-[#0F172A] font-medium leading-relaxed">
                      {action.recommendedAction}
                    </p>
                  </div>
                </div>

                {/* Caixa da Mensagem Formatada para WhatsApp */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#64748B] flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                      <span>Mensagem Prescritiva Pronta para Envio:</span>
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">
                      Destinatário: {project.clientName} ({project.clientPhone || 'WhatsApp'})
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#F8F9FA] border border-[#EAECEF] rounded-xl font-sans text-xs text-[#0F172A] leading-relaxed select-all relative">
                    <p className="whitespace-pre-line italic">
                      "{action.whatsappMessage}"
                    </p>
                  </div>
                </div>

                {/* Ações / Botões */}
                <div className="pt-2 border-t border-black/5 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    {/* Botão Principal: Copiar e Abrir no WhatsApp (wa.me) */}
                    <button
                      type="button"
                      id={`btn-open-wa-${action.id}`}
                      onClick={() => handleCopyAndOpenWhatsApp(action)}
                      className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1da850] text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
                      title="Copia a mensagem para a área de transferência e abre o chat no WhatsApp (wa.me)"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado & Abrindo wa.me... ✓</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Copiar e Abrir no WhatsApp (wa.me)</span>
                        </>
                      )}
                    </button>

                    {/* Botão Secundário: Apenas Copiar Texto */}
                    <button
                      type="button"
                      id={`btn-copy-action-${action.id}`}
                      onClick={() => handleCopyMessage(action)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-[#F1F5F9] border border-[#EAECEF] text-[#334155] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Apenas copiar o template de resposta para colar manualmente"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>Copiar Texto</span>
                    </button>
                  </div>

                  {/* Marcar como Aplicado */}
                  <button
                    type="button"
                    onClick={() => handleToggleApply(action.id)}
                    className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isApplied ? 'text-emerald-600' : 'text-[#94A3B8]'}`} />
                    <span>{isApplied ? 'Desmarcar aplicação' : 'Marcar como aplicado'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
