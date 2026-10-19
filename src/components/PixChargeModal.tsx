import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Check, 
  Copy, 
  ExternalLink, 
  DollarSign, 
  Calendar, 
  QrCode,
  ShieldCheck,
  CheckCheck,
  Key,
  Info,
  Smartphone,
  AlertTriangle,
  Download
} from 'lucide-react';
import { Project, Installment } from '../types';
import { buildClientPortalUrl } from '../utils/portalUrl';
import { 
  buildClientPixDetails, 
  PixDetails, 
  detectPixKeyType, 
  safeCopyToClipboard, 
  sanitizePixCopiaECola 
} from '../utils/pixService';

interface PixChargeModalProps {
  project: Project | null;
  installment: Installment | null;
  onClose: () => void;
  onChargeSuccess?: (project: Project, installmentNumber: number) => void;
  onUpdateProjectPixKey?: (projectId: string, pixKey: string, pixQrCode?: string) => void;
}

export const PixChargeModal: React.FC<PixChargeModalProps> = ({
  project,
  installment,
  onClose,
  onChargeSuccess,
  onUpdateProjectPixKey
}) => {
  if (!project || !installment) return null;

  // Carrega chave Pix salva no projeto, na configuração da empresa ou no e-mail do titular
  const [pixKey, setPixKey] = useState<string>(() => {
    const isPlaceholderKey = (k?: string) => !k || k.toLowerCase().includes('gestaodeprojetos.com.br');

    if (project.pixKey && !isPlaceholderKey(project.pixKey)) {
      return project.pixKey;
    }
    try {
      const saved = localStorage.getItem('bomprojeto_company_pix_key');
      if (saved && !isPlaceholderKey(saved)) return saved;
    } catch {}
    if (project.ownerEmail && project.ownerEmail.includes('@') && !isPlaceholderKey(project.ownerEmail)) {
      return project.ownerEmail;
    }
    return project.pixKey || '';
  });

  const [debouncedPixKey, setDebouncedPixKey] = useState(pixKey);
  const [pixDetails, setPixDetails] = useState<PixDetails | null>(null);
  const [tone, setTone] = useState<'acolhedor' | 'padrao' | 'firme'>('acolhedor');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCopiaECola, setCopiedCopiaECola] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCustomMessage, setIsCustomMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [sentResult, setSentResult] = useState<{
    success: boolean;
    messageId?: string;
    waMeUrl?: string;
  } | null>(null);

  const prevDetailsRef = useRef<PixDetails | null>(null);

  const formattedAmount = installment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const portalUrl = buildClientPortalUrl(project.id);
  const workshopName = project.workspaceName || 'Marcenaria & Projetos';

  // Debounce da digitação da chave Pix para evitar recálculos excessivos
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPixKey(pixKey);
    }, 250);
    return () => clearTimeout(timer);
  }, [pixKey]);

  // Gera o Pix Dinâmico exclusivo para esta parcela e cliente
  useEffect(() => {
    let isMounted = true;
    buildClientPixDetails(project, installment, debouncedPixKey, workshopName).then((details) => {
      if (isMounted) {
        const oldDetails = prevDetailsRef.current;
        prevDetailsRef.current = details;
        setPixDetails(details);
        
        const pixSnippet = details.copiaECola ? (
          `📋 *Código Pix Copia e Cola:*\n` +
          `${details.copiaECola}\n\n` +
          `_(Para pagar: copie o código acima, abra o app do seu banco, escolha Pix e selecione "Pix Copia e Cola")_\n\n`
        ) : '';

        // Se o usuário ainda não personalizou a mensagem, gera a padrão completa
        if (!isCustomMessage) {
          setMessage(
            `Olá ${project.clientName.split(' ')[0]}! 👋 Tudo bem? Aqui é da ${workshopName}.\n\n` +
            `Passando para enviar o lembrete da ${installment.label || `parcela ${installment.number}`} referente ao seu projeto *${project.title}* (OS ${project.code}).\n\n` +
            `💰 *Valor:* R$ ${formattedAmount}\n` +
            `📅 *Vencimento:* ${installment.dueDate}\n` +
            (details.cleanKey ? `🔑 *Chave Pix (${details.keyTypeLabel}):* ${details.cleanKey}\n\n` : '') +
            pixSnippet +
            `📱 Você também pode escanear o QR Code oficial ou acompanhar as etapas da obra no link exclusivo:\n🔗 ${portalUrl}\n\n` +
            `Qualquer dúvida estamos à disposição!`
          );
        } else if (oldDetails?.copiaECola && details.copiaECola && oldDetails.copiaECola !== details.copiaECola) {
          // Atualiza apenas o código Pix dentro da mensagem personalizada sem apagar o restante
          setMessage((prevMsg) => prevMsg.replace(oldDetails.copiaECola, details.copiaECola));
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [debouncedPixKey, project.id, installment.number, installment.amount, isCustomMessage]);

  const keyInfo = detectPixKeyType(pixKey);

  const safeOpenLink = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyKey = () => {
    const raw = pixDetails?.cleanKey || pixKey.trim();
    if (raw) {
      safeCopyToClipboard(raw);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyCopiaECola = () => {
    const code = sanitizePixCopiaECola(pixDetails?.copiaECola || '');
    if (code) {
      safeCopyToClipboard(code);
      setCopiedCopiaECola(true);
      setTimeout(() => setCopiedCopiaECola(false), 2000);
    }
  };

  const handleSendOnlyPixCodeWhatsApp = () => {
    const code = sanitizePixCopiaECola(pixDetails?.copiaECola || '');
    if (!code) return;
    const cleanPhone = (project.clientPhone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : '';
    const text = encodeURIComponent(code);
    const url = `https://wa.me/${phoneParam}?text=${text}`;
    safeOpenLink(url);
  };

  const handleDownloadQrCode = () => {
    if (!pixDetails?.qrCodeBase64) return;
    const a = document.createElement('a');
    a.href = pixDetails.qrCodeBase64;
    a.download = `Pix-OS${project.code}-Parcela${installment.number}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyMessage = () => {
    safeCopyToClipboard(message);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handlePixKeyBlur = () => {
    const trimmed = pixKey.trim();
    if (trimmed) {
      if (onUpdateProjectPixKey) {
        onUpdateProjectPixKey(project.id, trimmed, pixDetails?.copiaECola);
      }
      try {
        localStorage.setItem('bomprojeto_company_pix_key', trimmed);
        fetch('/api/company/pix-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pixKey: trimmed })
        }).catch(() => {});
      } catch {}
    }
  };

  const handleGenerateAiMessage = async (selectedTone: 'acolhedor' | 'padrao' | 'firme') => {
    setTone(selectedTone);
    setIsGenerating(true);
    try {
      const toneDesc = 
        selectedTone === 'acolhedor'
          ? 'muito acolhedor, valorizando a parceria e o progresso da obra'
          : selectedTone === 'padrao'
          ? 'profissional, claro, direto e organizado'
          : 'formal, assertivo sobre a data de vencimento da parcela';

      const res = await fetch('/api/ai/generate-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: project.clientName,
          stageName: project.currentStage,
          projectTitle: project.title,
          keywords: `Lembrete de cobrança Pix da ${installment.label || `parcela ${installment.number}`} no valor de R$ ${formattedAmount} com vencimento em ${installment.dueDate}. Chave Pix: ${pixKey}. Link: ${portalUrl}`,
          tone: toneDesc
        })
      });

      const data = await res.json();
      if (data.message) {
        const cleanCopiaECola = sanitizePixCopiaECola(pixDetails?.copiaECola || '');
        const copiaEColaSnippet = cleanCopiaECola 
          ? `\n\n📋 *Código Pix Copia e Cola:*\n${cleanCopiaECola}` 
          : '';

        setIsCustomMessage(true);
        setMessage(
          `Olá ${project.clientName.split(' ')[0]}! 👋\n\n${data.message}\n\n` +
          `💰 *Valor:* R$ ${formattedAmount}\n` +
          `📅 *Vencimento:* ${installment.dueDate}\n` +
          `🔑 *Chave Pix (${keyInfo.label}):* ${pixKey}` +
          copiaEColaSnippet +
          `\n\n🔗 Link de Acompanhamento: ${portalUrl}\n\n_${workshopName}_`
        );
      }
    } catch (err) {
      console.error('Error generating AI charge message:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendViaApi = async () => {
    setIsSending(true);
    setSentResult(null);

    const cleanCopiaECola = sanitizePixCopiaECola(pixDetails?.copiaECola || '');

    // Salva a chave Pix configurada para este projeto
    if (onUpdateProjectPixKey && pixKey.trim()) {
      onUpdateProjectPixKey(project.id, pixKey.trim(), cleanCopiaECola);
    }

    try {
      const res = await fetch('/api/whatsapp/send-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          installmentNumber: installment.number,
          customMessage: message,
          pixKey: pixKey.trim(),
          pixCode: cleanCopiaECola
        })
      });

      const data = await res.json();
      if (data.success) {
        setSentResult({
          success: true,
          messageId: data.result?.messageId || `charge-${Date.now()}`,
          waMeUrl: data.waMeUrl
        });

        if (onChargeSuccess) {
          onChargeSuccess(project, installment.number);
        }
      } else {
        setSentResult({
          success: false,
          waMeUrl: data.waMeUrl
        });
      }
    } catch (err) {
      console.error('Error sending charge via API:', err);
      const cleanPhone = project.clientPhone.replace(/\D/g, '');
      const directUrl = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`}&text=${encodeURIComponent(message)}`;
      setSentResult({
        success: false,
        waMeUrl: directUrl
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenDirectWhatsApp = () => {
    const cleanCopiaECola = sanitizePixCopiaECola(pixDetails?.copiaECola || '');
    if (onUpdateProjectPixKey && pixKey.trim()) {
      onUpdateProjectPixKey(project.id, pixKey.trim(), cleanCopiaECola);
    }
    const cleanPhone = project.clientPhone.replace(/\D/g, '');
    const directPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const directUrl = `https://api.whatsapp.com/send?phone=${directPhone}&text=${encodeURIComponent(message)}`;
    safeOpenLink(directUrl);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-[#EAECEF] my-8 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#EAECEF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-[#FF6515] flex items-center justify-center shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#0F172A] tracking-tight">
                  Cobrança Pix Inteligente
                </h3>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Isolamento Total
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                {project.clientName} • OS {project.code}
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

        {/* Notificação se a cobrança estiver pausada para este cliente */}
        {project.billingNotificationsEnabled === false && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2 text-xs text-amber-800 animate-in fade-in duration-150">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="leading-tight">
              <strong>Cobrança Pausada:</strong> Os lembretes automáticos para este cliente estão desativados. Este envio pelo WhatsApp é pontual e manual.
            </span>
          </div>
        )}

        {/* Installment Badge Details */}
        <div className="bg-[#fcf9f5] border border-[#e2ddd3] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#d95c2b] flex items-center justify-center font-bold">
              {installment.number}ª
            </div>
            <div>
              <span className="font-semibold text-[#1c1c1a] block">
                {installment.label || `Parcela ${installment.number}`}
              </span>
              <span className="text-[#73736c] text-[11px] flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Vencimento: {installment.dueDate}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-[#73736c] block">Valor da Parcela</span>
            <span className="font-bold text-base text-emerald-700 font-mono">
              R$ {formattedAmount}
            </span>
          </div>
        </div>

        {/* Configuração da Chave Pix (Editable & Dynamic) */}
        <div className="bg-[#FAF8F5] border border-[#E8EAED] rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#1C1C1A] flex items-center gap-1.5">
              <Key className="w-4 h-4 text-[#F97316]" />
              <span>Chave Pix de Recebimento</span>
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              keyInfo.isPlaceholder
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}>
              Tipo: {keyInfo.label}
            </span>
          </div>

          {/* Alerta se chave for vazia ou placeholder */}
          {(!pixKey.trim() || keyInfo.isPlaceholder) && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold block text-amber-950">Chave Pix de Teste/Demonstração</span>
                <span>
                  Para que o cliente consiga pagar no banco dele (Nubank, Itaú, Bradesco, etc.), digite a sua <strong>Chave Pix Real</strong> abaixo.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              onBlur={handlePixKeyBlur}
              placeholder="Digite sua chave real: CPF, CNPJ, Celular com DDD, E-mail ou Aleatória"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#DADCE0] bg-white font-mono text-[#202124] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
            />
            <button
              type="button"
              onClick={handleCopyKey}
              className="px-2.5 py-2 rounded-xl border border-[#DADCE0] bg-white text-xs font-semibold text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA] flex items-center gap-1 cursor-pointer shrink-0"
              title="Copiar chave Pix limpa"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{copiedKey ? 'Copiada!' : 'Copiar Chave'}</span>
            </button>
          </div>

          <p className="text-[11px] text-[#5F6368] flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
            <span>Chave validada no padrão oficial do Banco Central. O código é gerado exclusivamente para este cliente e parcela.</span>
          </p>
        </div>

        {/* Pix Copia e Cola & QR Code Gerado */}
        {pixDetails && pixDetails.copiaECola && (
          <div className="border border-[#E8EAED] rounded-2xl p-3.5 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-[#202124]">Código Pix Copia e Cola Oficial (BACEN)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQrPreview(!showQrPreview)}
                className="text-[11px] font-semibold text-[#EA580C] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{showQrPreview ? 'Ocultar QR Code' : 'Visualizar QR Code'}</span>
              </button>
            </div>

            {/* Código Copia e Cola box */}
            <div className="flex items-center gap-2 bg-[#F8F9FA] p-2 rounded-xl border border-[#E8EAED]">
              <input
                type="text"
                readOnly
                value={pixDetails.copiaECola}
                className="flex-1 bg-transparent text-[11px] font-mono text-[#5F6368] truncate focus:outline-none cursor-text select-all"
              />
              <button
                type="button"
                onClick={handleCopyCopiaECola}
                className="px-3 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
              >
                {copiedCopiaECola ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCopiaECola ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            {/* Ações rápidas de envio do código Pix para evitar erro de cópia no WhatsApp */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSendOnlyPixCodeWhatsApp}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Abre o WhatsApp enviando estritamente o código Copia e Cola. O cliente dá um toque para copiar no banco sem erros!"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                <span>Enviar Código Isolado no WhatsApp</span>
              </button>
            </div>

            {/* QR Code Expandível */}
            {showQrPreview && (
              <div className="pt-2 border-t border-[#F1F3F4] flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left animate-in fade-in duration-150">
                {pixDetails.qrCodeBase64 ? (
                  <img
                    src={pixDetails.qrCodeBase64}
                    alt="QR Code Pix Oficial"
                    className="w-36 h-36 border border-[#E8EAED] rounded-xl p-1.5 bg-white shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-36 h-36 bg-[#F8F9FA] rounded-xl flex items-center justify-center border border-[#E8EAED]">
                    <QrCode className="w-12 h-12 text-[#9AA0A6]" />
                  </div>
                )}
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-[#202124]">{pixDetails.merchantName}</div>
                  <div className="text-[11px] text-[#5F6368]">Cliente: <strong>{project.clientName}</strong></div>
                  <div className="text-[11px] text-[#5F6368]">Identificador único: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">{pixDetails.txId}</code></div>
                  <div className="text-sm font-bold text-emerald-700 font-mono mt-1">R$ {pixDetails.formattedAmount}</div>
                  {pixDetails.qrCodeBase64 && (
                    <button
                      type="button"
                      onClick={handleDownloadQrCode}
                      className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DADCE0] hover:bg-[#F1F3F4] text-[#3C4043] font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-[#5F6368]" />
                      <span>Baixar QR Code (PNG)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tone Selector & AI Prompt Button */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#52524e]">
              Tom do Lembrete com IA:
            </label>
            <span className="text-[11px] text-[#73736c]">
              Destinatário: <strong>{project.clientPhone}</strong>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'acolhedor', label: 'Acolhedor & Amigável' },
              { id: 'padrao', label: 'Padrão & Direto' },
              { id: 'firme', label: 'Firme & Vencimento' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleGenerateAiMessage(t.id as any)}
                disabled={isGenerating}
                className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  tone === t.id
                    ? 'bg-[#9f3c16] text-white border-[#9f3c16] shadow-xs'
                    : 'bg-[#fcf9f5] border-[#d3cdc3] text-[#52524e] hover:bg-[#f5efe6]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* WhatsApp Simulated Message Preview Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#52524e]">Mensagem a ser entregue:</span>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-[11px] font-medium text-[#52524e] hover:text-[#1c1c1a] flex items-center gap-1 cursor-pointer"
            >
              {copiedMessage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedMessage ? 'Mensagem copiada!' : 'Copiar Texto'}</span>
            </button>
          </div>

          <div className="bg-[#e7f7ed] border border-[#c4ebd1] rounded-2xl p-3.5 space-y-2 font-sans">
            <div className="flex items-center justify-between text-[11px] text-emerald-900 font-semibold border-b border-[#c4ebd1]/60 pb-1.5">
              <span>WhatsApp do Cliente: {project.clientPhone}</span>
              <span className="text-[10px] text-emerald-700 bg-white/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                Canal Conectado
              </span>
            </div>

            <textarea
              rows={6}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setIsCustomMessage(true);
              }}
              className="w-full bg-transparent text-xs text-emerald-950 font-sans leading-relaxed focus:outline-none resize-none font-mono"
              placeholder="Digite a mensagem de cobrança..."
            />

            <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-800 pt-1">
              <span>Entrega Imediata</span>
              <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Real-Time Result Feedback Banner */}
        {sentResult && (
          <div className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 animate-in fade-in ${
            sentResult.success 
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' 
              : 'bg-amber-50 border border-amber-300 text-amber-900'
          }`}>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {sentResult.success 
                  ? `Cobrança enviada com sucesso! (ID: ${sentResult.messageId})`
                  : 'Mensagem pronta para envio direto pelo WhatsApp!'}
              </span>
            </div>
            {sentResult.waMeUrl && (
              <a
                href={sentResult.waMeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline text-[#9f3c16] hover:text-[#7f2f11] shrink-0"
              >
                Abrir Chat
              </a>
            )}
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-[#f0ece4]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#d3cdc3] text-xs font-bold text-[#52524e] hover:bg-[#f5efe6] transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Direct Fallback WhatsApp Button (Guaranteed to reach client) */}
            <button
              type="button"
              onClick={handleOpenDirectWhatsApp}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-emerald-600/30 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Abre o WhatsApp Web / App diretamente com a mensagem preenchida"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              <span>Abrir WhatsApp Direto</span>
            </button>

            {/* Official API Send Button */}
            <button
              type="button"
              onClick={handleSendViaApi}
              disabled={isSending || isGenerating}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d95c2b] to-[#9f3c16] hover:brightness-110 text-white text-xs font-bold shadow-md shadow-[#9f3c16]/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSending ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-amber-200" />
                  <span>Disparando via API...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Disparar Cobrança Oficial</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
