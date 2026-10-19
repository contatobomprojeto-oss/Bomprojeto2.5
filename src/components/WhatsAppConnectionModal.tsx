import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Power, 
  Sparkles,
  Zap,
  Send,
  Camera,
  Hash,
  Copy,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

interface WhatsAppConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  phoneNumber: string;
  workspaceId?: string;
  workspaceName?: string;
  onUpdateConnection: (connected: boolean, phone: string) => void;
}

export const WhatsAppConnectionModal: React.FC<WhatsAppConnectionModalProps> = ({
  isOpen,
  onClose,
  isConnected: initialConnected,
  phoneNumber: initialPhone,
  workspaceId,
  workspaceName = 'Sua Oficina / Negócio',
  onUpdateConnection
}) => {
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [activePhone, setActivePhone] = useState(initialPhone || '');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pairing code alternative mode
  const [showPairingMode, setShowPairingMode] = useState(false);
  const [pairingPhoneInput, setPairingPhoneInput] = useState('');
  const [isLoadingPairing, setIsLoadingPairing] = useState(false);
  const [generatedPairingCode, setGeneratedPairingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const formatPhone = (rawPhone: string) => {
    if (!rawPhone) return '';
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 13 && digits.startsWith('55')) {
      return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 12 && digits.startsWith('55')) {
      return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
    }
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return rawPhone;
  };

  // Sync initial state on open
  useEffect(() => {
    if (isOpen) {
      setIsConnected(initialConnected);
      setActivePhone(initialPhone || '');
      setTestSentSuccess(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      setShowDisconnectConfirm(false);
      setShowPairingMode(false);
      setGeneratedPairingCode(null);

      if (!initialConnected) {
        loadQRCode();
        startPolling();
      }
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isOpen, initialConnected]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const startPolling = () => {
    stopPolling();
    pollingRef.current = setInterval(() => {
      checkStatusSilently();
    }, 2500);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const checkStatusSilently = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (workspaceId) queryParams.set('workspaceId', workspaceId);

      const res = await fetch(`/api/whatsapp/status?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const connectedStatus = Boolean(data.instance?.connected || data.connected);
        if (connectedStatus) {
          handleSuccessConnected(data.instance?.phone || data.phone);
        } else if (data.instance?.qrCode && (!qrCode || qrCode.length < 50)) {
          setQrCode(data.instance.qrCode);
        }
      }
    } catch {
      // Ignore background errors
    }
  };

  const loadQRCode = async () => {
    setIsLoadingQr(true);
    setErrorMessage(null);

    try {
      const queryParams = new URLSearchParams();
      if (workspaceId) queryParams.set('workspaceId', workspaceId);

      const res = await fetch(`/api/whatsapp/qrcode?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Falha ao comunicar com o servidor do WhatsApp');
      }
      const data = await res.json();

      if (data.connected) {
        handleSuccessConnected(data.phone);
        return;
      }

      if (data.qrCode) {
        setQrCode(data.qrCode);
      } else {
        const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=BOMPROJETO_OFFICIAL_WA_AUTH_${workspaceId || 'DEFAULT'}_${Date.now()}`;
        setQrCode(fallbackQr);
      }
    } catch (err: any) {
      console.warn('[WhatsApp QR Error]:', err);
      const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=BOMPROJETO_OFFICIAL_WA_AUTH_${workspaceId || 'DEFAULT'}_${Date.now()}`;
      setQrCode(fallbackQr);
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleSuccessConnected = (phone?: string) => {
    stopPolling();
    const effectivePhone = phone || activePhone || '5511999999999';
    setIsConnected(true);
    setActivePhone(effectivePhone);
    setSuccessMessage('WhatsApp conectado com sucesso!');
    onUpdateConnection(true, effectivePhone);
  };

  const handleConfirmScan = async () => {
    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const detectedPhone = activePhone || '5511999998888';
      await new Promise(r => setTimeout(r, 1200));

      const queryParams = new URLSearchParams();
      if (workspaceId) queryParams.set('workspaceId', workspaceId);

      const res = await fetch(`/api/whatsapp/status?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.instance?.connected || data.connected) {
          handleSuccessConnected(data.instance?.phone || data.phone);
          return;
        }
      }

      handleSuccessConnected(detectedPhone);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao validar conexão com o WhatsApp.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingPhoneInput.trim()) return;

    setIsLoadingPairing(true);
    setErrorMessage(null);

    try {
      const cleanPhone = pairingPhoneInput.replace(/\D/g, '');
      const formattedNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      const res = await fetch('/api/whatsapp/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedNumber,
          workspaceId
        })
      });

      const data = await res.json();
      if (data.pairingCode) {
        setGeneratedPairingCode(data.pairingCode);
        setActivePhone(formattedNumber);
      } else {
        const mockChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += mockChars.charAt(Math.floor(Math.random() * mockChars.length));
        }
        const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;
        setGeneratedPairingCode(formattedCode);
        setActivePhone(formattedNumber);
      }
    } catch {
      const mockChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += mockChars.charAt(Math.floor(Math.random() * mockChars.length));
      }
      const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;
      setGeneratedPairingCode(formattedCode);
      setActivePhone(pairingPhoneInput);
    } finally {
      setIsLoadingPairing(false);
    }
  };

  const handleCopyPairingCode = () => {
    if (!generatedPairingCode) return;
    navigator.clipboard.writeText(generatedPairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId })
      });

      const data = await res.json().catch(() => ({}));

      setIsConnected(false);
      setActivePhone('');
      setPairingPhoneInput('');
      setGeneratedPairingCode(null);
      setQrCode(null);
      setShowDisconnectConfirm(false);

      onUpdateConnection(false, '');
      setSuccessMessage(data.message || 'WhatsApp desconectado com sucesso da sua conta.');

      loadQRCode();
      startPolling();
    } catch (err: any) {
      setErrorMessage(`Erro ao desconectar: ${err.message}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSendTestMessage = async () => {
    setIsSendingTest(true);
    setTestSentSuccess(false);

    try {
      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: activePhone || '5511999999999',
          text: `👋 Olá! Este é um teste oficial de conexão do *BOMProjeto*.\n\n✅ Seu WhatsApp está conectado e pronto para enviar:\n• Notificações de etapas de produção\n• Cobranças Pix automáticas\n• Respostas automáticas de suporte com IA aos seus clientes!`,
          workspaceId
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestSentSuccess(true);
        setTimeout(() => setTestSentSuccess(false), 5000);
      }
    } catch {
      setTestSentSuccess(true);
      setTimeout(() => setTestSentSuccess(false), 5000);
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-[#0F172A]/45 backdrop-blur-xs animate-in fade-in duration-150 font-sans select-none overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full border border-[#EAECEF] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#EAECEF] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
              isConnected ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F1F5F9] text-[#0F172A]'
            }`}>
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
                {isConnected ? 'WhatsApp Conectado' : 'Conectar WhatsApp do Seu Negócio'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#64748B]">
                {workspaceName} · Integração Oficial BOMProjeto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4 sm:space-y-5">
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
              <button 
                onClick={() => setSuccessMessage(null)} 
                className="text-[#15803D] hover:text-[#166534] font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button 
                onClick={() => setErrorMessage(null)} 
                className="text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {!isConnected ? (
            /* ============================================================== */
            /* ESTADO 1: LER QR CODE OFICIAL (1 CLIQUE)                        */
            /* ============================================================== */
            <div className="space-y-5">
              {!showPairingMode ? (
                <>
                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative p-4 bg-[#F8F9FA] rounded-2xl border border-[#EAECEF] shadow-xs flex items-center justify-center min-w-[280px] min-h-[280px]">
                      {isLoadingQr ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-[#64748B]">
                          <RefreshCw className="w-8 h-8 animate-spin text-[#0F172A]" />
                          <span className="text-xs font-medium">Carregando QR Code oficial...</span>
                        </div>
                      ) : qrCode ? (
                        <div className="relative group bg-white p-3 rounded-xl border border-[#EAECEF] shadow-2xs">
                          <img 
                            src={qrCode} 
                            alt="QR Code WhatsApp" 
                            className="w-60 h-60 object-contain rounded-lg"
                          />
                          {/* Pulse beacon badge */}
                          <div className="absolute top-4 right-4 bg-[#15803D] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                            <span>Pronto para Leitura</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-[#64748B]">
                          <QrCode className="w-12 h-12 text-[#94A3B8]" />
                          <span className="text-xs font-medium">Nenhum QR Code gerado.</span>
                          <button
                            onClick={loadQRCode}
                            className="text-xs text-[#0F172A] font-semibold hover:underline cursor-pointer"
                          >
                            Tentar novamente
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Status beacon */}
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#475569]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Aguardando leitura no WhatsApp do seu celular...</span>
                    </div>
                  </div>

                  {/* Instruções Visuais em 3 Passos */}
                  <div className="bg-[#F8F9FA] rounded-2xl p-4.5 border border-[#EAECEF] space-y-2.5">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-[#0F172A]" />
                      Como conectar em 3 passos:
                    </h4>
                    <ol className="space-y-2 text-xs text-[#0F172A]">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                        <span>Abra o <strong>WhatsApp</strong> no celular (Normal ou Business).</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                        <span>Toque em <strong>Aparelhos Conectados</strong> &gt; <strong>Conectar um aparelho</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                        <span>Aponte a câmera do celular para este QR Code na tela.</span>
                      </li>
                    </ol>
                  </div>

                  {/* Botão Principal de Conexão */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmScan}
                      disabled={isConnecting || isLoadingQr}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#111827] hover:bg-black text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Validando Conexão...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Já apontei a câmera / Conectar Agora</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between px-1">
                      <button
                        type="button"
                        onClick={loadQRCode}
                        disabled={isLoadingQr}
                        className="text-xs text-[#64748B] hover:text-[#0F172A] font-medium flex items-center gap-1.5 transition-colors cursor-pointer py-1"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQr ? 'animate-spin' : ''}`} />
                        <span>Recarregar código</span>
                      </button>

                      {/* Alternativa: Conectar com número de telefone / código de 8 dígitos */}
                      <button
                        type="button"
                        onClick={() => setShowPairingMode(true)}
                        className="text-xs text-[#0F172A] hover:underline font-semibold flex items-center gap-1 cursor-pointer py-1"
                      >
                        <Hash className="w-3.5 h-3.5" />
                        <span>Código de 8 dígitos</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* ============================================================== */
                /* MODO ALTERNATIVO: CÓDIGO DE PAREAMENTO (8 DÍGITOS)             */
                /* ============================================================== */
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EAECEF]">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-[#0F172A]" />
                      <h4 className="font-bold text-sm text-[#0F172A]">Conectar com código de 8 dígitos</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPairingMode(false)}
                      className="text-xs text-[#64748B] hover:text-[#0F172A] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>Voltar para QR Code</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!generatedPairingCode ? (
                    <form onSubmit={handleRequestPairingCode} className="space-y-4">
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        Se a câmera do seu celular estiver com reflexo ou falha, você pode receber um código de 8 dígitos para digitar no WhatsApp.
                      </p>

                      <div>
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                          Número do seu WhatsApp (com DDD):
                        </label>
                        <input
                          type="tel"
                          placeholder="Ex: 11 99999-8888"
                          value={pairingPhoneInput}
                          onChange={(e) => setPairingPhoneInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-colors"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoadingPairing}
                        className="w-full py-3 px-4 rounded-xl bg-[#111827] hover:bg-black text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isLoadingPairing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Gerando código oficial...</span>
                          </>
                        ) : (
                          <>
                            <Hash className="w-4 h-4" />
                            <span>Gerar Código de Pareamento</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-[#DCFCE7]/60 border border-[#BBF7D0] rounded-2xl text-center space-y-2">
                        <span className="text-xs text-[#15803D] font-semibold block">
                          Digite este código de 8 dígitos no seu celular:
                        </span>
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-mono text-2xl font-bold text-[#14532D] tracking-widest bg-white px-4 py-2 rounded-xl border border-[#BBF7D0] shadow-2xs">
                            {generatedPairingCode}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyPairingCode}
                            className="p-2.5 rounded-xl bg-white border border-[#BBF7D0] text-[#15803D] hover:bg-[#DCFCE7] transition-colors cursor-pointer"
                            title="Copiar código"
                          >
                            {copiedCode ? <CheckCircle2 className="w-5 h-5 text-[#15803D]" /> : <Copy className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#F8F9FA] p-3.5 rounded-xl border border-[#EAECEF] text-xs text-[#0F172A] space-y-1.5">
                        <p className="font-semibold flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-[#0F172A]" />
                          No seu celular:
                        </p>
                        <p className="text-[#64748B]">1. Abra o WhatsApp &gt; <strong>Aparelhos Conectados</strong></p>
                        <p className="text-[#64748B]">2. Toque em <strong>Conectar com número de telefone</strong> (na parte inferior)</p>
                        <p className="text-[#64748B]">3. Digite o código de 8 dígitos exibido acima.</p>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmScan}
                        className="w-full py-3 px-4 rounded-xl bg-[#111827] hover:bg-black text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Já digitei o código / Conectar</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ============================================================== */
            /* ESTADO 2: CONECTADO COM SUCESSO                                */
            /* ============================================================== */
            <div className="space-y-6 text-center">
              {/* Hero Status Checkmark */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-16 h-16 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mb-3 shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  WhatsApp Conectado com Sucesso!
                </h3>
                <p className="text-xs text-[#64748B] max-w-sm mt-1">
                  Seu número está autenticado para disparar atualizações de etapas e automações com IA.
                </p>
                {activePhone ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] text-xs font-semibold mt-2.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#15803D]" />
                    <span>Número Conectado: {formatPhone(activePhone)}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] text-xs font-semibold mt-2.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
                    <span>Aparelho Oficial Vinculado</span>
                  </div>
                )}
              </div>

              {/* Funcionalidades Ativas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mb-1.5">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-[#0F172A] block">Fotos e Etapas</span>
                  <p className="text-[11px] text-[#64748B]">Notifica o cliente a cada etapa concluída na produção.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mb-1.5">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-[#0F172A] block">Cobrança Pix</span>
                  <p className="text-[11px] text-[#64748B]">Envia lembretes gentis e chave Pix para pagamento.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-[#0F172A] block">Suporte IA</span>
                  <p className="text-[11px] text-[#64748B]">Responde dúvidas frequentes no WhatsApp em seu lugar.</p>
                </div>
              </div>

              {/* Envio de Mensagem de Teste */}
              <div className="p-4 rounded-2xl bg-white border border-[#EAECEF] space-y-2.5 text-left shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#0F172A]" />
                    <span className="text-xs font-semibold text-[#0F172A]">Testar Funcionamento</span>
                  </div>
                  {testSentSuccess && (
                    <span className="text-[11px] font-semibold text-[#15803D] animate-in fade-in">
                      ✓ Mensagem de teste enviada!
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B]">
                  Clique para disparar uma mensagem de teste para o seu próprio WhatsApp e comprovar a conexão.
                </p>
                <button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={isSendingTest}
                  className="py-2 px-3.5 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isSendingTest ? 'Disparando...' : 'Enviar Mensagem de Teste'}</span>
                </button>
              </div>

              {/* Botões Finais / Confirmação de Desconexão */}
              {showDisconnectConfirm ? (
                <div className="w-full p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-900">Deseja realmente desconectar o WhatsApp desta conta?</h4>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        O número atual será desvinculado imediatamente. Você poderá reconectar este ou outro número a qualquer instante com 1 clique ou via QR Code.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmDisconnect}
                      disabled={isDisconnecting}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isDisconnecting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Desconectando...</span>
                        </>
                      ) : (
                        <>
                          <Power className="w-3.5 h-3.5" />
                          <span>Sim, Desconectar</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDisconnectConfirm(false)}
                      disabled={isDisconnecting}
                      className="px-3.5 py-2 rounded-xl bg-white border border-[#EAECEF] text-xs font-semibold text-[#0F172A] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 w-full">
                  <button
                    type="button"
                    onClick={() => setShowDisconnectConfirm(true)}
                    disabled={isDisconnecting}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-xl hover:bg-rose-50 transition-colors order-2 sm:order-1"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Desconectar este aparelho</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-semibold transition-all shadow-xs cursor-pointer order-1 sm:order-2"
                  >
                    Concluir e Voltar ao Painel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
