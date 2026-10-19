import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  MessageSquare, 
  Send, 
  CheckCheck, 
  Check, 
  ExternalLink,
  Copy,
  ShieldCheck
} from 'lucide-react';
import { Project } from '../types';
import { buildClientPortalUrl } from '../utils/portalUrl';

interface AiNotificationDrawerProps {
  project: Project | null;
  onClose: () => void;
  onSendWhatsapp: (projectId: string, message: string) => Promise<void>;
}

export const AiNotificationDrawer: React.FC<AiNotificationDrawerProps> = ({
  project,
  onClose,
  onSendWhatsapp
}) => {
  if (!project) return null;

  const workshopName = project.workspaceName || 'Marcenaria Ferraz';
  const portalUrl = buildClientPortalUrl(project.id);
  const clientFirstName = project.clientName ? project.clientName.split(' ')[0] : 'Cliente';

  const [tone, setTone] = useState<'acolhedor' | 'tecnico' | 'formal'>('acolhedor');
  const [draftMessage, setDraftMessage] = useState(
    `Temos atualização do seu projeto junto à "${workshopName}".\n\nConfira no link 👇\n${portalUrl}`
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const cleanPhone = project.clientPhone.replace(/\D/g, '');
  const directPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const directWaUrl = `https://api.whatsapp.com/send?phone=${directPhone}&text=${encodeURIComponent(draftMessage)}`;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: project.clientName,
          stageName: project.currentStage,
          projectTitle: project.title,
          keywords: 'execução técnica, conferência de medidas, checagem milimétrica, controle de qualidade',
          tone: tone === 'acolhedor' ? 'muito acolhedor e tranquilizador' : tone === 'tecnico' ? 'técnico e detalhado' : 'formal executivo'
        })
      });
      const data = await res.json();
      if (data.message) {
        let cleanDetail = data.message.trim();
        cleanDetail = cleanDetail.replace(/^(olá|ola|oi|bom dia|boa tarde|boa noite)[^!\n]*[!\n]+/gi, '').trim();
        cleanDetail = cleanDetail.replace(/^[👋\s]+/g, '').trim();
        cleanDetail = cleanDetail.replace(/(https?:\/\/[^\s]+)/gi, '').trim();
        const detailPart = cleanDetail ? `: ${cleanDetail}` : '';
        setDraftMessage(
          `Temos atualização do seu projeto junto à "${workshopName}" (${project.currentStage})${detailPart}.\n\nConfira no link 👇\n${portalUrl}`
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSendWhatsapp(project.id, draftMessage);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 2000);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenDirect = () => {
    window.open(directWaUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-[#EAECEF] my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#EAECEF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#0F172A] tracking-tight">
                  Boletim de Produção com IA
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Conectado
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                {project.clientName} • OS {project.code} • Etapa: {project.currentStage}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl hover:bg-[#F8F9FA] text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tone Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#0F172A]">
            Selecione o Tom da Comunicação:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'acolhedor', label: 'Acolhedor' },
              { id: 'tecnico', label: 'Técnico' },
              { id: 'formal', label: 'Formal' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id as any)}
                className={`py-2 px-1 text-center rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  tone === t.id
                    ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                    : 'bg-[#F8F9FA] border-[#EAECEF] text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Action Trigger */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-semibold text-[#0F172A]">Prévia da Mensagem:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="fleetly-btn-secondary py-1 px-2.5 text-xs font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="fleetly-btn-secondary py-1 px-3 text-xs font-semibold cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 text-emerald-600 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Aprimorando...' : 'Reescrever com IA'}</span>
            </button>
          </div>
        </div>

        {/* Simulated WhatsApp Bubble */}
        <div className="bg-[#F8F9FA] border border-[#EAECEF] rounded-2xl p-4 space-y-2 font-sans">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium border-b border-[#EAECEF] pb-2">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              Destinatário: <strong className="text-[#0F172A]">{project.clientPhone}</strong>
            </span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-semibold">
              WhatsApp Conectado
            </span>
          </div>

          <textarea
            rows={5}
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            className="w-full bg-white p-3 rounded-xl border border-[#EAECEF] text-xs text-[#0F172A] font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none transition-all"
          />

          <div className="flex items-center justify-end gap-1 text-[10px] text-[#94A3B8] pt-1 font-mono">
            <span>Hoje 11:20</span>
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-[#EAECEF]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto fleetly-btn-secondary py-2.5 px-4 text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Direct Fallback WhatsApp Button */}
            <button
              type="button"
              onClick={handleOpenDirect}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Abre o WhatsApp com a mensagem pronta"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              <span>Abrir WhatsApp Direto</span>
            </button>

            {/* Official API Send Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || sentSuccess}
              className="w-full sm:w-auto fleetly-btn-primary py-2.5 px-5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {sentSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Boletim Disparado com Sucesso!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isSending ? 'Disparando...' : 'Disparar via WhatsApp'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
