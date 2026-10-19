import React, { useState, useEffect } from 'react';
import { 
  Project, 
  ActiveView 
} from '../types';
import { BrandLogo } from './BrandLogo';
import { buildClientPixDetails, PixDetails, safeCopyToClipboard, sanitizePixCopiaECola, getBankAppLinks, BankAppLink } from '../utils/pixService';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  QrCode, 
  Copy, 
  Check, 
  Phone, 
  FileText, 
  Download, 
  ChevronRight, 
  ExternalLink, 
  Layers, 
  X,
  Maximize2,
  Heart,
  ThumbsUp,
  Sparkles,
  Smartphone,
  Monitor,
  BellRing,
  MessageSquare,
  Building2,
  Play,
  Paperclip,
  Key,
  CreditCard,
  Lock,
  Shield,
  Zap
} from 'lucide-react';

interface ClientPortalViewProps {
  project: Project;
  onSelectView: (view: ActiveView) => void;
  onSendReaction: (emoji: string, text: string) => Promise<void>;
  onRequestSupport?: (project: Project, message?: string) => Promise<void>;
  clientSupportButtonEnabled?: boolean;
  allowPortalReactions?: boolean;
  showWarrantyCertificate?: boolean;
  showWorkshopFooterSignature?: boolean;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  project,
  onSelectView,
  onSendReaction,
  onRequestSupport,
  clientSupportButtonEnabled = true,
  allowPortalReactions = true,
  showWarrantyCertificate = true,
  showWorkshopFooterSignature = true
}) => {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile');
  const [activePhotoZoom, setActivePhotoZoom] = useState<{ url: string; title: string; caption?: string } | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [bankOpeningNotice, setBankOpeningNotice] = useState<string | null>(null);
  const [sentReaction, setSentReaction] = useState<string | null>(null);
  const [customFeedback, setCustomFeedback] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [downloadedDoc, setDownloadedDoc] = useState<string | null>(null);
  const [supportRequested, setSupportRequested] = useState(false);
  const [isRequestingSupport, setIsRequestingSupport] = useState(false);
  const [paidNotified, setPaidNotified] = useState(false);
  const [isNotifyingPayment, setIsNotifyingPayment] = useState(false);

  // Card Payment States
  const [cardInstallmentsCount, setCardInstallmentsCount] = useState<number>(1);
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    cardHolder: project?.clientName ? project.clientName.toUpperCase() : '',
    cardExpiry: '',
    cardCvv: '',
    cpfCnpj: ''
  });
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSuccessResult, setCardSuccessResult] = useState<{
    authCode: string;
    amount: number;
    installmentsCount: number;
  } | null>(null);

  if (!project) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg border border-[#E8EAED] space-y-4">
          <div className="flex justify-center">
            <BrandLogo variant="full" size="md" theme="light" />
          </div>
          <h2 className="text-lg font-bold text-[#202124]">Carregando acompanhamento...</h2>
          <p className="text-sm text-[#5F6368]">
            Buscando dados em tempo real da sua ordem de serviço.
          </p>
          <div className="w-8 h-8 border-3 border-[#EA580C] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  const installments = project.installments || [];
  const pendingInstallment = installments.find(i => i.status === 'pending');
  const paidInstallment = installments.find(i => i.status === 'paid');

  const [pixDetails, setPixDetails] = useState<PixDetails | null>(null);

  // Gera dados Pix e QR Code isolados estritamente para este cliente e parcela
  useEffect(() => {
    let isMounted = true;
    const targetInstallment = pendingInstallment || installments[0];
    if (project && targetInstallment) {
      buildClientPixDetails(project, targetInstallment, project.pixKey, project.workspaceName).then((details) => {
        if (isMounted) {
          setPixDetails(details);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [project.id, project.pixKey, project.workspaceName, pendingInstallment?.number, pendingInstallment?.amount]);

  const handleTriggerSupport = async () => {
    setIsRequestingSupport(true);
    try {
      if (onRequestSupport) {
        await onRequestSupport(project, 'Cliente precisa de seu suporte');
      } else {
        await fetch(`/api/projects/${project.id}/support-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Cliente precisa de seu suporte' })
        });
      }
      setSupportRequested(true);
    } catch (err) {
      console.error('Error requesting support:', err);
    } finally {
      setIsRequestingSupport(false);
    }
  };

  const handleNotifyPaymentDone = async () => {
    setIsNotifyingPayment(true);
    try {
      const label = pendingInstallment?.label || 'Parcela';
      const amountStr = pendingInstallment ? `R$ ${pendingInstallment.amount.toFixed(2)}` : '';
      const msg = `O cliente ${project.clientName} informou que efetuou o pagamento Pix da ${label} (${amountStr}) da OS ${project.code}. Favor verificar o comprovante e confirmar a baixa.`;
      
      if (onRequestSupport) {
        await onRequestSupport(project, msg);
      } else {
        await fetch(`/api/projects/${project.id}/support-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg })
        });
      }
      setPaidNotified(true);
    } catch (err) {
      console.error('Error notifying payment:', err);
    } finally {
      setIsNotifyingPayment(false);
    }
  };

  const handleReactionClick = async (emoji: string, text: string) => {
    setSentReaction(emoji);
    await onSendReaction(emoji, text);
    setTimeout(() => setSentReaction(null), 3500);
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFeedback.trim()) return;
    await onSendReaction('💬', customFeedback.trim());
    setSentReaction('💬');
    setCustomFeedback('');
    setShowFeedbackInput(false);
    setTimeout(() => setSentReaction(null), 3500);
  };

  const handleDownloadDocument = (docName: string) => {
    const content = `========================================================
             DOCUMENTO OFICIAL DO PROJETO     
========================================================
Documento: ${docName}
Ordem de Serviço: ${project.code}
Projeto: ${project.title}
Cliente: ${project.clientName}
Data: ${project.contractDate || '19/09/2026'}
Prazo Previsto: ${project.deliveryDate}
Status: Autenticado digitalmente pelo sistema BOMProjeto OS
========================================================`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadedDoc(docName);
    setTimeout(() => setDownloadedDoc(null), 3000);
  };

  const [copiedRawKey, setCopiedRawKey] = useState(false);

  const handleCopyPix = () => {
    const rawPixCode = pixDetails?.copiaECola || pendingInstallment?.pixQrCode || '';
    const cleanPixCode = sanitizePixCopiaECola(rawPixCode);
    if (cleanPixCode) {
      safeCopyToClipboard(cleanPixCode);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const handleCopyRawKey = () => {
    const key = pixDetails?.cleanKey || pixDetails?.rawKey || project.pixKey || '';
    if (key) {
      safeCopyToClipboard(key.trim());
      setCopiedRawKey(true);
      setTimeout(() => setCopiedRawKey(false), 2500);
    }
  };

  const handleDownloadPortalQrCode = () => {
    if (!pixDetails?.qrCodeBase64) return;
    const a = document.createElement('a');
    a.href = pixDetails.qrCodeBase64;
    a.download = `Pix-OS${project.code}-Parcela${pendingInstallment?.number || 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenBankApp = (bank: BankAppLink) => {
    const rawPixCode = pixDetails?.copiaECola || pendingInstallment?.pixQrCode || '';
    const cleanPixCode = sanitizePixCopiaECola(rawPixCode);
    if (cleanPixCode) {
      safeCopyToClipboard(cleanPixCode);
      setCopiedPix(true);
    }
    setBankOpeningNotice(`Código Pix copiado! Abrindo ${bank.shortName}...`);
    setTimeout(() => setBankOpeningNotice(null), 3500);

    try {
      window.location.href = bank.deepLink;
      setTimeout(() => {
        // Fallback to bank web portal if deep link wasn't caught
      }, 1500);
    } catch {}
  };

  const handlePayWithCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingInstallment) return;

    const cleanCard = cardForm.cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 13) {
      setCardError('Por favor informe o número completo do cartão (16 dígitos).');
      return;
    }
    if (!cardForm.cardHolder.trim()) {
      setCardError('Informe o nome do titular como impresso no cartão.');
      return;
    }
    if (!cardForm.cardExpiry.trim() || !cardForm.cardExpiry.includes('/')) {
      setCardError('Informe a validade do cartão (formato MM/AA).');
      return;
    }
    const cleanCvv = cardForm.cardCvv.replace(/\D/g, '');
    if (cleanCvv.length < 3) {
      setCardError('Informe o código de segurança CVV (3 ou 4 dígitos).');
      return;
    }

    setIsProcessingCard(true);
    setCardError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/pay-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installmentNumber: pendingInstallment.number,
          installmentsCount: cardInstallmentsCount,
          card: {
            cardNumber: cleanCard,
            cardHolder: cardForm.cardHolder.trim().toUpperCase(),
            cardExpiry: cardForm.cardExpiry.trim(),
            cardCvv: cleanCvv,
            cpfCnpj: cardForm.cpfCnpj.trim() || undefined
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível processar a transação com o cartão.');
      }

      setCardSuccessResult({
        authCode: data.authCode || 'AUTH-CARD-OK',
        amount: pendingInstallment.amount,
        installmentsCount: cardInstallmentsCount
      });

      // Atualiza localmente a parcela
      pendingInstallment.status = 'paid';
      pendingInstallment.paidDate = new Date().toLocaleDateString('pt-BR');
      pendingInstallment.authCode = data.authCode;
      pendingInstallment.paymentMethod = `Cartão de Crédito (${cardInstallmentsCount}x)`;
    } catch (err: any) {
      setCardError(err.message || 'Erro ao processar transação com cartão.');
    } finally {
      setIsProcessingCard(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124] py-6 px-3 sm:px-6 flex flex-col items-center font-sans">
      
      {/* Top Device Mode Switcher for Demo Experience */}
      <div className="w-full max-w-md md:max-w-2xl mb-4 flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-[#E8EAED] shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-[#202124]">Portal do Cliente em Tempo Real</span>
          <span className="text-[#5F6368] hidden sm:inline">• Sem senha necessária</span>
        </div>

        <div className="flex items-center gap-1 bg-[#F1F3F4] p-1 rounded-lg">
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-colors ${
              deviceMode === 'mobile' ? 'bg-[#F97316] text-white' : 'text-[#5F6368] hover:text-[#202124]'
            }`}
            title="Ver no formato celular"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Celular</span>
          </button>
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-colors ${
              deviceMode === 'desktop' ? 'bg-[#F97316] text-white' : 'text-[#5F6368] hover:text-[#202124]'
            }`}
            title="Ver no formato expandido"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Expandido</span>
          </button>
        </div>
      </div>

      {/* Main Public Portal Frame */}
      <div className={`w-full transition-all duration-300 ${
        deviceMode === 'mobile' 
          ? 'max-w-full sm:max-w-[440px] sm:rounded-[32px] sm:border-[5px] sm:border-[#202124] rounded-xl border border-[#E8EAED] shadow-lg bg-white overflow-hidden pb-8' 
          : 'max-w-3xl rounded-2xl border border-[#E8EAED] shadow-md bg-white p-4 sm:p-8'
      }`}>
        
        {/* Mobile Status Notch only on larger screens when simulating phone */}
        {deviceMode === 'mobile' && (
          <div className="hidden sm:flex bg-[#202124] text-white px-6 py-2 items-center justify-between text-[11px] font-mono select-none">
            <span>09:41</span>
            <div className="w-20 h-3 bg-black/60 rounded-full mx-auto"></div>
            <span>5G 100%</span>
          </div>
        )}

        {/* Brand Header */}
        <div className="bg-[#202124] text-white p-5 sm:p-6 rounded-b-xl sm:rounded-xl space-y-3.5">
          {/* Top Bar with BOMProjeto Official Logo & Verified Status */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <BrandLogo variant="full" size="sm" theme="dark" showSubtitle={false} />
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Link Seguro Sem Senha</span>
            </div>
          </div>

          {/* Subscriber Company Highlight Banner */}
          <div className="flex items-center justify-between gap-2 bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                {project.workspaceName ? project.workspaceName.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-white/60 uppercase tracking-wider block font-semibold">Empresa Responsável</span>
                <span className="text-xs sm:text-sm font-bold text-white truncate block">
                  {project.workspaceName || 'Marcenaria Ferraz & Design'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] bg-orange-500/20 text-[#FB923C] border border-[#FB923C]/30 font-semibold px-2 py-0.5 rounded-full shrink-0">
              <Building2 className="w-3 h-3" />
              <span>Homologada</span>
            </div>
          </div>

          <div className="pt-1">
            <span className="text-xs text-white/70">Olá, <strong className="text-white">{project.clientName.split(' ')[0]}</strong>!</span>
            <h1 className="font-title font-bebas text-2xl sm:text-3xl text-white mt-1 tracking-wide uppercase">
              {project.title}
            </h1>
            <div className="flex items-center justify-between text-xs text-white/60 pt-2 border-t border-white/10 mt-2 font-caption font-light">
              <span>Ordem de Serviço: <strong className="text-white font-mono font-normal">{project.code}</strong></span>
              <span>Entrega estimada: <strong className="text-white font-normal">{project.deliveryDate}</strong></span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6">

          {/* Latest Workshop Update Card */}
          {project.updates.length > 0 && (
            <div className="bg-[#F8F9FA] rounded-xl border border-[#E8EAED] p-4 sm:p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-[#F97316] flex items-center justify-center font-bold text-xs">
                    GP
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-[#202124]">
                      {project.updates[0].author}
                    </h3>
                    <p className="text-[10px] text-[#5F6368]">{project.updates[0].role}</p>
                  </div>
                </div>
                <span className="text-[10px] text-[#5F6368] font-medium">
                  {project.updates[0].timestamp}
                </span>
              </div>

              {/* Stage Tag */}
              <div className="inline-block text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-[#F97316] text-white">
                {project.updates[0].stageName}
              </div>

              {/* Message */}
              <p className="text-xs text-[#3C4043] leading-relaxed font-sans">
                {project.updates[0].message}
              </p>

              {/* Attachments Gallery (Photos, Videos, Documents) */}
              {project.updates[0].photos && project.updates[0].photos.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-medium text-[#5F6368] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>Anexos da execução:</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {project.updates[0].photos.map((att, pIdx) => {
                      const isVid = att.type === 'video' || /\.(mp4|mov|webm|mkv)$/i.test(att.url);
                      const isDoc = att.type === 'document' || /\.(pdf|doc|docx|xls|xlsx|txt)$/i.test(att.url);

                      if (isVid) {
                        return (
                          <div
                            key={pIdx}
                            onClick={() => setActivePhotoZoom(att)}
                            className="cursor-pointer group relative rounded-xl overflow-hidden border border-[#E8EAED] aspect-square bg-black shadow-2xs flex items-center justify-center"
                          >
                            <video src={att.url} className="w-full h-full object-cover opacity-75" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-9 h-9 rounded-full bg-white/90 text-[#F97316] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-center text-[9px] text-white font-medium truncate">
                              {att.title || 'Vídeo da Obra'}
                            </div>
                          </div>
                        );
                      }

                      if (isDoc) {
                        return (
                          <a
                            key={pIdx}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative rounded-xl border border-[#E8EAED] bg-white p-3 aspect-square shadow-2xs flex flex-col justify-between hover:border-[#F97316] transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-[#202124] line-clamp-2 leading-tight group-hover:text-[#F97316]">
                                {att.title}
                              </p>
                              <span className="text-[9px] text-[#80868B] block mt-0.5">
                                {att.fileSize || 'Documento PDF'}
                              </span>
                            </div>
                          </a>
                        );
                      }

                      return (
                        <div
                          key={pIdx}
                          onClick={() => setActivePhotoZoom(att)}
                          className="cursor-pointer group relative rounded-xl overflow-hidden border border-[#E8EAED] aspect-square shadow-2xs"
                        >
                          <img 
                            src={att.url} 
                            alt={att.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 className="w-4 h-4" />
                          </div>
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-center text-[9px] text-white font-medium truncate">
                            {att.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reaction Buttons */}
              {allowPortalReactions && (
                <div className="pt-2 border-t border-[#E8EAED] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#5F6368]">Diga o que achou:</span>
                    {sentReaction && (
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-bounce">
                        {sentReaction} Mensagem enviada à equipe!
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleReactionClick('👏', 'Ficando ótimo! Parabéns pelo capricho.')}
                      className="px-2.5 py-1 rounded-full bg-white hover:bg-[#F8F9FA] border border-[#E8EAED] text-xs font-medium text-[#202124] transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span>👏</span>
                      <span>Ficando ótimo!</span>
                    </button>

                    <button
                      onClick={() => handleReactionClick('⭐', 'Excelente andamento e acabamento.')}
                      className="px-2.5 py-1 rounded-full bg-white hover:bg-[#F8F9FA] border border-[#E8EAED] text-xs font-medium text-[#202124] transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span>⭐</span>
                      <span>Excelente</span>
                    </button>

                    <button
                      onClick={() => handleReactionClick('❤️', 'Sensacional, equipe nota 10!')}
                      className="px-2.5 py-1 rounded-full bg-white hover:bg-[#F8F9FA] border border-[#E8EAED] text-xs font-medium text-[#202124] transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span>❤️</span>
                      <span>Sensacional</span>
                    </button>

                    <button
                      onClick={() => setShowFeedbackInput(!showFeedbackInput)}
                      className="px-2.5 py-1 rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] border border-[#E8EAED] text-xs font-medium text-[#5F6368] transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span>💬</span>
                      <span>Escrever recado</span>
                    </button>
                  </div>

                  {showFeedbackInput && (
                    <form onSubmit={handleSendFeedback} className="pt-2 flex gap-2">
                      <input
                        type="text"
                        value={customFeedback}
                        onChange={(e) => setCustomFeedback(e.target.value)}
                        placeholder="Escreva sua dúvida ou mensagem para a equipe..."
                        className="flex-1 px-3 py-1.5 rounded-lg border border-[#E8EAED] bg-white text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                      />
                      <button
                        type="submit"
                        disabled={!customFeedback.trim()}
                        className="px-3 py-1.5 rounded-lg bg-[#F97316] text-white text-xs font-medium hover:bg-[#EA580C] transition-colors disabled:opacity-40"
                      >
                        Enviar
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Production Timeline Progress */}
          <div className="bg-white rounded-xl border border-[#E8EAED] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[#202124] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#F97316]" />
                <span>Cronograma da Produção</span>
              </h3>
              <span className="text-xs font-semibold text-[#F97316]">
                {project.progressPercent}% concluído
              </span>
            </div>

            <div className="w-full h-2 bg-[#F1F3F4] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#F97316] rounded-full transition-all duration-500"
                style={{ width: `${project.progressPercent}%` }}
              ></div>
            </div>

            {/* Stage List */}
            <div className="space-y-3 pt-2">
              {project.stages.map((st, idx) => {
                const isCompleted = st.status === 'completed';
                const isCurrent = st.status === 'current';

                return (
                  <div key={st.id} className="flex items-start gap-3 text-xs">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isCompleted 
                        ? 'bg-emerald-600 text-white' 
                        : isCurrent 
                        ? 'bg-[#F97316] text-white ring-2 ring-orange-200' 
                        : 'bg-[#F1F3F4] text-[#5F6368]'
                    }`}>
                      {isCompleted ? <Check className="w-3 h-3" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isCurrent ? 'text-[#F97316] font-semibold' : 'text-[#202124]'}`}>
                          {st.name}
                        </span>
                        {st.date && <span className="text-[11px] text-[#5F6368]">{st.date}</span>}
                      </div>
                      <p className="text-[11px] text-[#5F6368]">{st.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Breakdown & Pix */}
          <div className="bg-white rounded-xl border border-[#E8EAED] p-4 sm:p-5 space-y-3">
            <h3 className="font-semibold text-sm text-[#202124]">
              Resumo Financeiro do Projeto
            </h3>

            <div className="space-y-2">
              {paidInstallment && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-emerald-950">{paidInstallment.label}</div>
                    <div className="text-[11px] text-emerald-800">Liquidado via Pix • {paidInstallment.authCode}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-emerald-950">
                      R$ {paidInstallment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-200/80 px-2 py-0.2 rounded-full">
                      PAGO ✓
                    </span>
                  </div>
                </div>
              )}

              {pendingInstallment && (
                <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-amber-300 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#202124]">{pendingInstallment.label}</div>
                      <div className="text-[11px] text-[#5F6368]">Vencimento previsto: {pendingInstallment.dueDate}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-[#202124]">
                        R$ {pendingInstallment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] font-semibold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded">
                        A VENCER
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setShowPixModal(true)}
                      className="py-2.5 px-3 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pagar com Pix</span>
                    </button>

                    <button
                      onClick={() => {
                        setCardError(null);
                        setCardSuccessResult(null);
                        setShowCardModal(true);
                      }}
                      className="py-2.5 px-3 rounded-lg bg-[#202124] hover:bg-black text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pagar com Cartão</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={handleCopyPix}
                      className="w-full py-1.5 px-3 rounded-lg bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] text-[#3C4043] font-medium text-[11px] transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#5F6368]" />}
                      <span>{copiedPix ? 'Código Pix Copiado!' : 'Copiar Código Pix Copia e Cola'}</span>
                    </button>
                  </div>

                  {/* Botão de confirmação direta do cliente */}
                  <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#5F6368]">Já realizou a transferência?</span>
                    <button
                      type="button"
                      onClick={handleNotifyPaymentDone}
                      disabled={paidNotified || isNotifyingPayment}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        paidNotified 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-white border border-[#E8EAED] hover:bg-[#F8F9FA] text-[#202124]'
                      }`}
                    >
                      {isNotifyingPayment ? (
                        <>
                          <div className="w-3 h-3 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
                          <span>Avisando...</span>
                        </>
                      ) : paidNotified ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Oficina Notificada ✓</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Já realizei o pagamento Pix</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attached Files & Project Documents */}
          <div className="bg-white rounded-xl border border-[#E8EAED] p-4 sm:p-5 space-y-2.5">
            <h3 className="font-semibold text-sm text-[#202124] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#F97316]" />
              <span>Documentos e Arquivos do Projeto</span>
            </h3>

            <div className="space-y-2 text-xs">
              {showWarrantyCertificate && (
                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-emerald-900 flex items-center gap-1.5">
                      <span>Certificado Digital de Conclusão & Garantia</span>
                      <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">Oficial</span>
                    </div>
                    <div className="text-[10px] text-emerald-700">Garantia técnica e conformidade autenticada pelo BOM Projeto</div>
                  </div>
                  <button 
                    onClick={() => handleDownloadDocument('Certificado-Conclusao-Garantia.pdf')}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                      downloadedDoc === 'Certificado-Conclusao-Garantia.pdf' 
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-800' 
                        : 'bg-white border-emerald-300 hover:bg-emerald-100 text-emerald-700'
                    }`}
                    title="Baixar Certificado Oficial"
                  >
                    {downloadedDoc === 'Certificado-Conclusao-Garantia.pdf' ? (
                      <span className="text-[10px] font-bold">Baixado ✓</span>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Baixar</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {project.documents?.map((doc, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-[#F8F9FA] border border-[#E8EAED] flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#202124]">{doc.name}</div>
                    <div className="text-[10px] text-[#5F6368]">{doc.description}</div>
                  </div>
                  <button 
                    onClick={() => handleDownloadDocument(doc.name)}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                      downloadedDoc === doc.name 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                        : 'bg-white border-[#E8EAED] hover:bg-[#F8F9FA] text-[#F97316]'
                    }`}
                    title="Baixar arquivo autenticado"
                  >
                    {downloadedDoc === doc.name ? (
                      <span className="text-[10px] font-bold">Baixado ✓</span>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Baixar</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Service & WhatsApp Direct Channel */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-[#e7f7ed] border border-emerald-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Atendimento Direto no WhatsApp</span>
              </div>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-semibold px-2 py-0.5 rounded-full">
                Online
              </span>
            </div>
            <p className="text-[11px] text-emerald-900/80 leading-relaxed">
              Dúvidas sobre o projeto, ajustes de cronograma ou envio de comprovante? Fale diretamente com a equipe de gestão.
            </p>
            <a
              href={`https://api.whatsapp.com/send?phone=5567999881234&text=${encodeURIComponent(`Olá! Sou ${project.clientName}, cliente da OS ${project.code} (${project.title}). Gostaria de tirar uma dúvida sobre a produção!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Abrir WhatsApp do Atendimento</span>
            </a>
          </div>

          {/* Footer note */}
          <div className="flex flex-col items-center justify-center gap-1.5 text-[11px] text-[#5F6368] pt-4 border-t border-[#E8EAED]">
            {showWorkshopFooterSignature && (
              <span className="text-xs font-bold text-[#202124]">
                {project.workspaceName || 'Marcenaria Ferraz & Design'}
              </span>
            )}
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#9AA0A6]">
              Acompanhamento oficial desenvolvido com a tecnologia
            </span>
            <BrandLogo variant="full" size="sm" theme="light" showSubtitle={false} />
          </div>

        </div>

      </div>

      {/* Lightbox Zoom Photo Modal */}
      {activePhotoZoom && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1c1c1a] text-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-headline font-bold text-sm text-white">{activePhotoZoom.title}</h4>
              <button 
                onClick={() => setActivePhotoZoom(null)} 
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden max-h-[70vh] bg-black">
              <img src={activePhotoZoom.url} alt={activePhotoZoom.title} className="w-full h-full object-contain" />
            </div>
            {activePhotoZoom.caption && (
              <p className="text-xs text-white/70 text-center pb-1">{activePhotoZoom.caption}</p>
            )}
          </div>
        </div>
      )}

      {/* QR Code Pix Modal */}
      {showPixModal && pendingInstallment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-[#E8EAED]">
            <div className="flex items-center justify-between border-b border-[#F1F3F4] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF6515] flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#202124]">QR Code Pix Oficial</h4>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Autenticado pelo Banco Central
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowPixModal(false)} 
                className="p-1 rounded-lg hover:bg-[#F8F9FA] text-[#5F6368] cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-[#F8F9FA] border border-[#E8EAED] rounded-xl flex flex-col items-center justify-center space-y-3">
              <div className="w-48 h-48 bg-white p-2 rounded-xl border border-[#DADCE0] flex items-center justify-center shadow-xs">
                {pixDetails?.qrCodeBase64 ? (
                  <img
                    src={pixDetails.qrCodeBase64}
                    alt="QR Code Pix Oficial"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <QrCode className="w-16 h-16 text-[#9AA0A6] animate-pulse" />
                    <span className="text-[10px] text-[#5F6368] mt-1">Gerando QR Code...</span>
                  </div>
                )}
              </div>

              <div className="text-center space-y-0.5 w-full">
                <div className="text-xs font-bold text-[#202124]">
                  {project.workspaceName || pixDetails?.merchantName || 'BOM PROJETO GESTÃO'}
                </div>
                <div className="text-[11px] text-[#5F6368]">
                  Cliente: <strong>{project.clientName}</strong> • {pendingInstallment.label || `Parcela #${pendingInstallment.number}`}
                </div>
                <div className="text-[10px] text-[#80868B] font-mono">
                  Identificador: {pixDetails?.txId || `OS${project.code}`}
                </div>
                <div className="font-bold text-lg text-emerald-700 font-mono pt-1">
                  R$ {pendingInstallment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Chave Pix e Código Copia e Cola */}
            {pixDetails && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-[#5F6368]">
                  <span>Chave Pix ({pixDetails.keyTypeLabel}):</span>
                  <span className="font-mono font-bold text-[#202124]">{pixDetails.cleanKey || pixDetails.rawKey}</span>
                </div>
                
                {pixDetails.copiaECola && (
                  <div className="bg-[#FAF8F5] p-2 rounded-lg border border-[#E8EAED]">
                    <div className="text-[10px] text-[#5F6368] font-semibold mb-1">Código Pix Copia e Cola Oficial:</div>
                    <input
                      type="text"
                      readOnly
                      value={pixDetails.copiaECola}
                      className="w-full bg-white p-1.5 rounded border border-[#DADCE0] text-[10px] font-mono text-[#3C4043] truncate focus:outline-none select-all"
                    />
                  </div>
                )}

                {/* Passo a passo rápido para o cliente não errar no banco */}
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-950 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-emerald-800">
                    <Check className="w-3.5 h-3.5" />
                    Como pagar no aplicativo do seu banco:
                  </span>
                  <ol className="list-decimal list-inside text-[10px] text-emerald-900 space-y-0.5 pl-0.5">
                    <li>Toque no botão laranja abaixo para <strong>copiar o código</strong>.</li>
                    <li>Abra o aplicativo do seu banco (Nubank, Itaú, Bradesco, BB, Inter, etc.).</li>
                    <li>Acesse a área Pix e escolha <strong>Pix Copia e Cola</strong>.</li>
                    <li>Cole o código e confirme o pagamento com segurança.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Notificação de abertura do banco */}
            {bankOpeningNotice && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
                <span className="font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  {bankOpeningNotice}
                </span>
                <span className="text-[10px] text-emerald-600">Cole no app</span>
              </div>
            )}

            {/* Atalhos Diretos para Aplicativos de Bancos */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#3C4043] flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-[#F97316]" />
                Abrir direto no App do seu Banco:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {getBankAppLinks().map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleOpenBankApp(b)}
                    className="p-1.5 rounded-lg border border-[#E8EAED] hover:border-[#F97316] bg-white hover:bg-orange-50/40 text-[#202124] text-[10px] font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-2xs group"
                    title={`Copiar e abrir ${b.name}`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full mb-0.5 group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="truncate w-full text-center">{b.shortName}</span>
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-[#80868B] text-center">
                Ao tocar no seu banco, o código Pix é copiado e o app é aberto para colar.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleCopyPix}
                disabled={!pixDetails?.copiaECola}
                className="w-full py-2.5 rounded-xl bg-[#F97316] text-white font-bold text-xs hover:bg-[#EA580C] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPix ? 'Código Copiado com Sucesso!' : 'Copiar Código Pix Copia e Cola'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPixModal(false);
                  setCardError(null);
                  setCardSuccessResult(null);
                  setShowCardModal(true);
                }}
                className="w-full py-2 rounded-xl bg-[#202124] hover:bg-black text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Prefere pagar com Cartão de Crédito?</span>
              </button>

              {pixDetails?.cleanKey && (
                <button
                  type="button"
                  onClick={handleCopyRawKey}
                  className="w-full py-2 rounded-xl bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] text-[#202124] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedRawKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Key className="w-4 h-4 text-emerald-600" />}
                  <span>{copiedRawKey ? 'Chave Copiada!' : `Copiar Apenas a Chave (${pixDetails.keyTypeLabel})`}</span>
                </button>
              )}

              {pixDetails?.qrCodeBase64 && (
                <button
                  type="button"
                  onClick={handleDownloadPortalQrCode}
                  className="w-full py-2 rounded-xl bg-[#F8F9FA] border border-[#E8EAED] hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#5F6368]" />
                  <span>Salvar Imagem do QR Code (PNG)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGAMENTO COM CARTÃO DE CRÉDITO */}
      {showCardModal && pendingInstallment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-[#E8EAED] max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F1F3F4] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#202124]">Pagamento com Cartão</h4>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Criptografia SSL de Ponta a Ponta
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowCardModal(false)} 
                className="p-1 rounded-lg hover:bg-[#F8F9FA] text-[#5F6368] cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tela de Sucesso */}
            {cardSuccessResult ? (
              <div className="p-5 text-center space-y-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <Check className="w-6 h-6 stroke-3" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-emerald-950">Pagamento Aprovado!</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    A parcela foi liquidada com sucesso no sistema.
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-200 text-left text-xs space-y-1">
                  <div className="flex justify-between text-[#5F6368]">
                    <span>Ordem de Serviço:</span>
                    <strong className="text-[#202124]">{project.code}</strong>
                  </div>
                  <div className="flex justify-between text-[#5F6368]">
                    <span>Parcela:</span>
                    <strong className="text-[#202124]">{pendingInstallment.label || `#${pendingInstallment.number}`}</strong>
                  </div>
                  <div className="flex justify-between text-[#5F6368]">
                    <span>Valor Pago:</span>
                    <strong className="text-emerald-700 font-bold">R$ {cardSuccessResult.amount.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-[#5F6368]">
                    <span>Parcelamento:</span>
                    <strong className="text-[#202124]">{cardSuccessResult.installmentsCount}x no Cartão</strong>
                  </div>
                  <div className="flex justify-between text-[#5F6368]">
                    <span>Autenticação:</span>
                    <strong className="font-mono text-[#202124] text-[11px]">{cardSuccessResult.authCode}</strong>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCardModal(false);
                    setCardSuccessResult(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Concluir e Voltar ao Acompanhamento
                </button>
              </div>
            ) : (
              /* Formulário de Cartão */
              <form onSubmit={handlePayWithCard} className="space-y-3.5 text-xs">
                {/* Resumo do Valor */}
                <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E8EAED] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#5F6368] block uppercase tracking-wider font-semibold">Total da Parcela</span>
                    <strong className="text-sm text-[#202124]">{pendingInstallment.label || `Parcela #${pendingInstallment.number}`}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-700 font-mono">
                      R$ {pendingInstallment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Opções de Parcelamento */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#3C4043] block">
                    Opção de Parcelamento no Cartão:
                  </label>
                  <select
                    value={cardInstallmentsCount}
                    onChange={(e) => setCardInstallmentsCount(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-white border border-[#DADCE0] rounded-xl text-xs font-medium text-[#202124] focus:outline-none focus:border-[#F97316]"
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map(n => {
                      const valPerMonth = (pendingInstallment.amount / n).toFixed(2);
                      return (
                        <option key={n} value={n}>
                          {n === 1 ? `1x de R$ ${valPerMonth} à vista (sem juros)` : `${n}x de R$ ${valPerMonth} sem juros`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Número do Cartão */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#3C4043] block">
                    Número do Cartão de Crédito:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="0000 0000 0000 0000"
                      value={cardForm.cardNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                        setCardForm(prev => ({ ...prev, cardNumber: val }));
                      }}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#DADCE0] rounded-xl text-xs font-mono text-[#202124] focus:outline-none focus:border-[#F97316]"
                    />
                    <CreditCard className="w-4 h-4 text-[#80868B] absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Nome do Titular */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#3C4043] block">
                    Nome Impresso no Cartão:
                  </label>
                  <input
                    type="text"
                    placeholder="NOME COMO NO CARTAO"
                    value={cardForm.cardHolder}
                    onChange={(e) => setCardForm(prev => ({ ...prev, cardHolder: e.target.value.toUpperCase() }))}
                    required
                    className="w-full px-3 py-2 bg-white border border-[#DADCE0] rounded-xl text-xs text-[#202124] uppercase focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                {/* Validade e CVV */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#3C4043] block">Validade (MM/AA):</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="MM/AA"
                      value={cardForm.cardExpiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length >= 2) val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                        setCardForm(prev => ({ ...prev, cardExpiry: val }));
                      }}
                      required
                      className="w-full px-3 py-2 bg-white border border-[#DADCE0] rounded-xl text-xs font-mono text-[#202124] text-center focus:outline-none focus:border-[#F97316]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#3C4043] block">CVV (3 dígitos):</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="123"
                      value={cardForm.cardCvv}
                      onChange={(e) => setCardForm(prev => ({ ...prev, cardCvv: e.target.value.replace(/\D/g, '') }))}
                      required
                      className="w-full px-3 py-2 bg-white border border-[#DADCE0] rounded-xl text-xs font-mono text-[#202124] text-center focus:outline-none focus:border-[#F97316]"
                    />
                  </div>
                </div>

                {/* CPF ou CNPJ do Titular */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#3C4043] block">
                    CPF ou CNPJ do Titular do Cartão:
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cardForm.cpfCnpj}
                    onChange={(e) => setCardForm(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[#DADCE0] rounded-xl text-xs text-[#202124] font-mono focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                {cardError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <span className="font-semibold">Erro:</span>
                    <span>{cardError}</span>
                  </div>
                )}

                {/* Selo de Segurança */}
                <div className="p-2 rounded-lg bg-[#F8F9FA] border border-[#E8EAED] flex items-center justify-between text-[10px] text-[#5F6368]">
                  <span className="flex items-center gap-1 font-semibold text-[#202124]">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    Transação Protegida
                  </span>
                  <span>Ambiente homologado Mercado Pago</span>
                </div>

                {/* Botão de Envio */}
                <div className="pt-1 space-y-2">
                  <button
                    type="submit"
                    disabled={isProcessingCard}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isProcessingCard ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processando transação segura...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Confirmar Pagamento de R$ {pendingInstallment.amount.toFixed(2)}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCardModal(false)}
                    className="w-full py-2 rounded-xl bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] text-[#5F6368] font-medium text-xs transition-colors cursor-pointer"
                  >
                    Cancelar e Voltar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
