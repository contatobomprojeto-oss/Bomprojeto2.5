import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  CreditCard, 
  Clock, 
  Building2, 
  Layers, 
  Bot,
  Zap,
  Check,
  Lock,
  ExternalLink,
  ChevronLeft,
  Calendar,
  DollarSign,
  HelpCircle,
  Shield,
  QrCode,
  Copy,
  RefreshCw,
  AlertTriangle,
  Smartphone,
  Crown
} from 'lucide-react';
import { SubscriptionPlan, Workspace, Project } from '../types';
import { PLAN_CONFIGS, getPlanLimits } from '../utils/planRules';
import { trackPurchaseConversion } from '../utils/gtmAnalytics';

export interface SubscriptionRejectionDetails {
  title: string;
  message: string;
  reasonCode: string;
  actionPrompt: string;
  suggestPix?: boolean;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: SubscriptionPlan;
  onChangePlan: (plan: SubscriptionPlan) => void;
  activeProjectsCount: number;
  workspacesCount: number;
  userEmail?: string;
  defaultTargetPlan?: SubscriptionPlan;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  onChangePlan,
  activeProjectsCount,
  workspacesCount,
  userEmail = 'contato@suaoficina.com.br',
  defaultTargetPlan
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(currentPlan);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Checkout states
  const [checkoutPlanId, setCheckoutPlanId] = useState<SubscriptionPlan | null>(defaultTargetPlan || null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [rejectionData, setRejectionData] = useState<SubscriptionRejectionDetails | null>(null);
  const [subscriptionSuccessData, setSubscriptionSuccessData] = useState<{
    subscriptionId: string;
    planName: string;
    amount: number;
    billingCycle: string;
    payerEmail: string;
    paymentMethod: 'credit_card' | 'pix';
    initPoint?: string;
  } | null>(null);

  // Card form state
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    cardExpiry: '',
    cardCvv: '',
    payerEmail: userEmail !== 'henrique.ferrazms@gmail.com' ? (userEmail || '') : '',
    cpfCnpj: ''
  });

  // Pix state
  const [pixData, setPixData] = useState<{
    paymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    amount: number;
    expiresAt: string;
  } | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isSimulatingPix, setIsSimulatingPix] = useState(false);
  const pixPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (defaultTargetPlan && defaultTargetPlan !== 'free') {
      setCheckoutPlanId(defaultTargetPlan);
    }
  }, [defaultTargetPlan]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pixPollRef.current) {
        clearInterval(pixPollRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentConfig = getPlanLimits(currentPlan);
  const maxProjects = currentConfig.maxActiveProjects;
  const maxWs = currentConfig.maxWorkspaces;

  // Calcula valores oficiais
  const getPlanPrice = (planId: SubscriptionPlan, cycle: 'monthly' | 'annual') => {
    if (planId === 'free') return 0;
    if (planId === 'start') {
      // Start: R$ 493,87/mês | Anual (projeção com 2 meses grátis = 10 meses): R$ 4.938,70
      return cycle === 'annual' ? 4938.70 : 493.87;
    }
    // escala (Scala): R$ 983,93/mês | Anual com 3 meses de desconto (pague 9 meses): 9 * 983,93 = R$ 8.855,37
    return cycle === 'annual' ? 8855.37 : 983.93;
  };

  const getMonthlyFraction = (planId: SubscriptionPlan, cycle: 'monthly' | 'annual') => {
    if (planId === 'free') return 0;
    if (planId === 'start') {
      // R$ 4.938,70 / 12 = R$ 411,56/mês
      return cycle === 'annual' ? 411.56 : 493.87;
    }
    // R$ 8.855,37 / 12 = R$ 737,95/mês
    return cycle === 'annual' ? 737.95 : 983.93;
  };

  const isFounder = (userEmail || '').toLowerCase().trim() === 'henrique.ferrazms@gmail.com';

  const handleFounderChangePlan = async (planId: SubscriptionPlan) => {
    try {
      await fetch('/api/subscriptions/founder-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'henrique.ferrazms@gmail.com', plan: planId })
      });
    } catch (e) {
      console.warn('Erro ao atualizar plano do fundador:', e);
    }

    onChangePlan(planId);
    setSelectedPlan(planId);
    setCheckoutPlanId(null);
    setSuccessMessage(`Plano alterado para ${planId === 'escala' ? 'Scala' : planId === 'start' ? 'Start' : 'Grátis'} com sucesso no Modo Criador!`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleStartCheckout = (planId: SubscriptionPlan) => {
    if (planId === 'free' || isFounder) {
      handleFounderChangePlan(planId);
      return;
    }

    setCheckoutPlanId(planId);
    setCheckoutError(null);
    setRejectionData(null);
    setSubscriptionSuccessData(null);
    setPixData(null);

    // E-mail do pagador: se for o e-mail master do recebedor, deixa limpo para o cliente preencher o dele
    if (!cardData.payerEmail) {
      const initialEmail = userEmail && userEmail !== 'henrique.ferrazms@gmail.com' ? userEmail : '';
      setCardData(prev => ({ ...prev, payerEmail: initialEmail }));
    }
  };

  // Submete a assinatura com Cartão de Crédito via API oficial do Mercado Pago (/preapproval)
  const handleSubmitSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlanId || checkoutPlanId === 'free') return;

    const emailTrim = (cardData.payerEmail || '').trim();
    if (!emailTrim || !emailTrim.includes('@')) {
      setCheckoutError('Por favor informe um e-mail válido para a cobrança da assinatura.');
      return;
    }

    // Regra do Mercado Pago: o pagador não pode ser o dono da credencial do gateway
    if (emailTrim.toLowerCase() === 'henrique.ferrazms@gmail.com') {
      setRejectionData({
        title: 'E-mail Conflitante com a Conta Recebedora',
        message: 'O e-mail informado pertence à conta administradora do Mercado Pago (henrique.ferrazms@gmail.com).',
        reasonCode: 'same_user',
        actionPrompt: 'Informe o e-mail real da sua oficina ou negócio para que o Mercado Pago processe o pagamento.',
        suggestPix: false
      });
      setCheckoutError('O e-mail do pagador não pode ser o mesmo da conta recebedora do Mercado Pago.');
      return;
    }

    const cleanCard = cardData.cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 13) {
      setCheckoutError('Por favor preencha o número completo do cartão de crédito (16 dígitos).');
      return;
    }

    const cleanCpf = (cardData.cpfCnpj || '').replace(/\D/g, '');
    if (cleanCpf.length < 11) {
      setCheckoutError('Por favor informe o CPF ou CNPJ completo do titular do cartão.');
      return;
    }

    setIsProcessing(true);
    setCheckoutError(null);
    setRejectionData(null);

    const targetConfig = PLAN_CONFIGS[checkoutPlanId];
    const amount = getPlanPrice(checkoutPlanId, billingCycle);

    try {
      const response = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: checkoutPlanId,
          billingCycle,
          payerEmail: emailTrim,
          card: {
            cardNumber: cardData.cardNumber,
            cardHolder: cardData.cardHolder,
            cardExpiry: cardData.cardExpiry,
            cardCvv: cardData.cardCvv,
            cpfCnpj: cardData.cpfCnpj
          },
          workspaceId: 'matriz'
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.rejection) {
          setRejectionData(data.rejection);
          setCheckoutError(data.rejection.message);
        } else {
          setCheckoutError(data.error || 'Erro ao processar assinatura no Mercado Pago.');
        }
        return;
      }

      // Sucesso confirmado internamente! Atualiza o plano na aplicação
      onChangePlan(checkoutPlanId);
      setSelectedPlan(checkoutPlanId);

      const subId = data.subscription?.id || `sub_mp_${Date.now().toString(36)}`;
      setSubscriptionSuccessData({
        subscriptionId: subId,
        planName: targetConfig.name,
        amount,
        billingCycle: billingCycle === 'annual' ? (checkoutPlanId === 'escala' ? 'Anual com 3 Meses Grátis' : 'Anual com 2 Meses Grátis') : 'Mensal Recorrente',
        payerEmail: emailTrim,
        paymentMethod: 'credit_card',
        initPoint: data.subscription?.init_point || data.plan?.init_point
      });

      // Dispara conversão de venda para GTM (evento 'purchase') e Google Ads
      trackPurchaseConversion({
        transactionId: subId,
        value: amount,
        planName: targetConfig.name,
        billingCycle
      });
    } catch (err: any) {
      console.error('[Subscription Card Error]:', err);
      setCheckoutError(err.message || 'Falha na comunicação com o Mercado Pago. Tente novamente ou use a opção Pix.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Gera cobrança Pix para o Plano
  const handleGeneratePix = async () => {
    if (!checkoutPlanId || checkoutPlanId === 'free') return;

    const emailTrim = (cardData.payerEmail || userEmail || '').trim();
    if (!emailTrim || !emailTrim.includes('@')) {
      setCheckoutError('Por favor informe seu e-mail para registrar a cobrança Pix.');
      return;
    }

    setIsGeneratingPix(true);
    setCheckoutError(null);
    setRejectionData(null);

    const amount = getPlanPrice(checkoutPlanId, billingCycle);
    const planName = PLAN_CONFIGS[checkoutPlanId].name;
    const cycleLabel = billingCycle === 'annual' ? 'Anual com 10% OFF à vista' : 'Mensal';

    try {
      const res = await fetch('/api/payment/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: `Assinatura BOMProjeto - ${planName} (${cycleLabel})`,
          payer: {
            email: emailTrim,
            name: cardData.cardHolder || emailTrim.split('@')[0],
            cpfCnpj: cardData.cpfCnpj || undefined
          },
          planId: checkoutPlanId,
          metadata: {
            billingCycle
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao gerar Pix');
      }

      const orderData = await res.json();
      setPixData({
        paymentId: orderData.paymentId,
        qrCode: orderData.qrCode,
        qrCodeBase64: orderData.qrCodeBase64,
        amount: orderData.amount,
        expiresAt: orderData.expiresAt
      });

      // Inicia polling de verificação do Pix a cada 2.5s
      startPixPolling(orderData.paymentId);
    } catch (err: any) {
      setCheckoutError(`Erro ao gerar Pix: ${err.message}`);
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const startPixPolling = (paymentId: string) => {
    if (pixPollRef.current) clearInterval(pixPollRef.current);

    pixPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/${paymentId}/status`);
        if (res.ok) {
          const order = await res.json();
          if (order.status === 'approved') {
            clearInterval(pixPollRef.current!);
            pixPollRef.current = null;

            // Pagamento confirmado internamente! Libera o plano
            if (checkoutPlanId) {
              onChangePlan(checkoutPlanId);
              setSelectedPlan(checkoutPlanId);
              setSubscriptionSuccessData({
                subscriptionId: paymentId,
                planName: PLAN_CONFIGS[checkoutPlanId].name,
                amount: order.amount,
                billingCycle: billingCycle === 'annual' ? 'Anual com 10% OFF' : 'Mensal',
                payerEmail: order.payerEmail,
                paymentMethod: 'pix'
              });
            }
          }
        }
      } catch (e) {
        // Ignora erros de polling momentâneos
      }
    }, 2500);
  };

  const handleCopyPix = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  // Simulação instantânea de pagamento Pix para teste/homologação
  const handleSimulatePixApproval = async () => {
    if (!pixData?.paymentId) return;
    setIsSimulatingPix(true);
    try {
      const res = await fetch(`/api/payment/${pixData.paymentId}/simulate-approval`, {
        method: 'POST'
      });
      if (res.ok) {
        if (pixPollRef.current) clearInterval(pixPollRef.current);
        if (checkoutPlanId) {
          onChangePlan(checkoutPlanId);
          setSelectedPlan(checkoutPlanId);
          setSubscriptionSuccessData({
            subscriptionId: pixData.paymentId,
            planName: PLAN_CONFIGS[checkoutPlanId].name,
            amount: pixData.amount,
            billingCycle: billingCycle === 'annual' ? 'Anual com 10% OFF' : 'Mensal',
            payerEmail: cardData.payerEmail || userEmail,
            paymentMethod: 'pix'
          });
        }
      }
    } catch (e: any) {
      setCheckoutError('Erro ao simular aprovação');
    } finally {
      setIsSimulatingPix(false);
    }
  };

  const handleOpenExternalCheckout = async () => {
    if (!checkoutPlanId || checkoutPlanId === 'free') return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/subscriptions/create-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: checkoutPlanId,
          billingCycle
        })
      });
      const data = await res.json();
      if (data.plan?.init_point) {
        window.open(data.plan.init_point, '_blank');
      } else {
        window.open('https://www.mercadopago.com.br/subscriptions', '_blank');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden font-sans select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full shadow-2xl border border-[#EAECEF] max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header do Modal */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#EAECEF] flex items-center justify-between shrink-0 bg-white">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-orange-50 text-[#F97316] border border-orange-100 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="font-bold text-sm sm:text-base text-[#0F172A] tracking-tight">
                {checkoutPlanId 
                  ? `Assinatura Mercado Pago — ${PLAN_CONFIGS[checkoutPlanId].name}` 
                  : 'Planos & Assinatura BOMProjeto'}
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-[#64748B]">
              {checkoutPlanId 
                ? 'Cobrança segura com confirmação interna e liberação imediata dos recursos.'
                : 'Inicie no plano gratuito. Assine um plano pago para liberar múltiplos workspaces, IA e automações.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-5 sm:space-y-6">

        {/* FEEDBACK DE SUCESSO GERAL */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FLUXO DE CHECKOUT DO PLANO SELECIONADO */}
        {checkoutPlanId && checkoutPlanId !== 'free' ? (
          <div className="space-y-6">
            
            {/* TELA DE SUCESSO DA ASSINATURA / CONFIRMAÇÃO DE PAGAMENTO */}
            {subscriptionSuccessData ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <Check className="w-9 h-9 stroke-[3]" />
                </div>
                <div className="space-y-1">
                  <span className="px-3 py-1 bg-emerald-200 text-emerald-900 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                    {subscriptionSuccessData.paymentMethod === 'pix' ? 'Pix Confirmado' : 'Cartão Aprovado'}
                  </span>
                  <h3 className="text-2xl font-black text-[#111111] font-headline mt-2">
                    Pagamento Confirmado! Plano {subscriptionSuccessData.planName} Liberado!
                  </h3>
                  <p className="text-xs sm:text-sm text-[#52524e] max-w-md mx-auto">
                    Seu acesso foi liberado com sucesso. Todos os benefícios de projetos, workspaces e IA já estão disponíveis.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 max-w-md mx-auto text-left text-xs space-y-2.5 shadow-xs">
                  <div className="flex justify-between border-b border-[#f0ece4] pb-2">
                    <span className="text-[#7A7A75]">ID da Transação:</span>
                    <span className="font-mono font-bold text-[#111111]">{subscriptionSuccessData.subscriptionId}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f0ece4] pb-2">
                    <span className="text-[#7A7A75]">Valor Pago:</span>
                    <span className="font-black text-emerald-700 text-sm">
                      R$ {subscriptionSuccessData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#f0ece4] pb-2">
                    <span className="text-[#7A7A75]">Modalidade:</span>
                    <span className="font-semibold text-[#111111]">{subscriptionSuccessData.billingCycle}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f0ece4] pb-2">
                    <span className="text-[#7A7A75]">Forma de Pagamento:</span>
                    <span className="font-semibold text-emerald-800">
                      {subscriptionSuccessData.paymentMethod === 'pix' ? 'Pix Oficial (Compensado)' : 'Cartão de Crédito (Mercado Pago)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7A7A75]">E-mail de Cobrança:</span>
                    <span className="text-[#111111] font-medium">{subscriptionSuccessData.payerEmail}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setCheckoutPlanId(null);
                      setSubscriptionSuccessData(null);
                      onClose();
                    }}
                    className="px-8 py-3 rounded-2xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Acessar Meus Recursos Liberados
                  </button>
                </div>
              </div>
            ) : (
              /* FORMULÁRIO DE PAGAMENTO (CARTÃO OU PIX) */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Coluna Esquerda: Resumo do Plano Selecionado */}
                <div className="md:col-span-5 bg-[#FAF8F5] p-5 rounded-3xl border border-[#E8E2D5] space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutPlanId(null);
                      setCheckoutError(null);
                      setRejectionData(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-[#7A7A75] hover:text-[#111111] transition-colors cursor-pointer font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Voltar aos planos</span>
                  </button>

                  <div className="border-b border-[#E8E2D5] pb-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6515]">
                      Plano Escolhido
                    </span>
                    <h3 className="font-headline font-black text-2xl text-[#111111]">
                      {PLAN_CONFIGS[checkoutPlanId].name}
                    </h3>
                    <p className="text-xs text-[#7A7A75]">
                      {PLAN_CONFIGS[checkoutPlanId].tagline}
                    </p>
                  </div>

                  {/* Detalhes do Ciclo & Preço */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-[#52524e]">Ciclo Escolhido:</span>
                      <span className="text-xs font-bold text-[#111111] uppercase">
                        {billingCycle === 'annual' ? 'Anual (10% OFF)' : 'Mensal'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-[#E8E2D5] pt-2">
                      <span className="text-sm font-semibold text-[#111111]">
                        {billingCycle === 'annual' ? 'Valor à Vista:' : 'Mensalidade:'}
                      </span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-[#111111]">
                          R$ {getPlanPrice(checkoutPlanId, billingCycle).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-[#7A7A75] block">
                          {billingCycle === 'annual' 
                            ? `(Equivalente a R$ ${getMonthlyFraction(checkoutPlanId, 'annual').toFixed(2)} / mês)` 
                            : '/mês recorrente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-[#E8E2D5] text-xs space-y-1.5 text-[#555550]">
                    <div className="flex items-center gap-2 font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ativação Imediata &amp; Sem Burocracia</span>
                    </div>
                    <p className="text-[11px] text-[#7A7A75] leading-relaxed">
                      Ao concluir o pagamento no Cartão ou Pix, a confirmação interna libera instantaneamente sua cota de workspaces, projetos e IA de atendimento.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E8E2D5] space-y-2 text-[11px] text-[#7A7A75]">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Processamento Seguro Mercado Pago</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#FF6515] shrink-0" />
                      <span>Liberação Automática Confirmada</span>
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Métodos de Pagamento e Formulários */}
                <div className="md:col-span-7 space-y-4">
                  
                  {/* Seletor de Método de Pagamento (Cartão vs Pix) */}
                  <div className="flex items-center gap-2 p-1 bg-[#F0ECE4] rounded-2xl border border-[#DDD6CB]">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('credit_card');
                        setCheckoutError(null);
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        paymentMethod === 'credit_card' 
                          ? 'bg-white text-[#111111] shadow-xs' 
                          : 'text-[#7A7A75] hover:text-[#111111]'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-[#FF6515]" />
                      <span>Cartão de Crédito</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('pix');
                        setCheckoutError(null);
                        if (!pixData) handleGeneratePix();
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        paymentMethod === 'pix' 
                          ? 'bg-white text-emerald-800 shadow-xs' 
                          : 'text-[#7A7A75] hover:text-[#111111]'
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      <span>Pix Instantâneo</span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] rounded-full font-black">À Vista</span>
                    </button>
                  </div>

                  {/* CARD DE ERRO ESPECÍFICO / NÃO APROVAÇÃO DO CARTÃO */}
                  {rejectionData && (
                    <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-left space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-extrabold text-[10px] uppercase tracking-wider">
                            Pagamento Não Aprovado
                          </span>
                          <h4 className="font-bold text-sm text-rose-950 leading-tight">
                            {rejectionData.title}
                          </h4>
                          <p className="text-xs text-rose-800 leading-relaxed">
                            {rejectionData.message}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white/80 p-3 rounded-xl border border-rose-200 text-xs text-[#52524e] space-y-2">
                        <p className="font-medium text-rose-900">
                          <strong>O que fazer:</strong> {rejectionData.actionPrompt}
                        </p>

                        {/* Botão de Alternar para Pix quando houver saldo insuficiente ou bloqueio */}
                        {rejectionData.suggestPix && (
                          <div className="pt-1 border-t border-rose-200 flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentMethod('pix');
                                setRejectionData(null);
                                setCheckoutError(null);
                                if (!pixData) handleGeneratePix();
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Pagar via Pix (Liberação Imediata)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MENSAGEM DE ERRO GENÉRICA */}
                  {checkoutError && !rejectionData && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  {/* ABA 1: CARTÃO DE CRÉDITO */}
                  {paymentMethod === 'credit_card' && (
                    <form onSubmit={handleSubmitSubscription} className="space-y-3">
                      
                      {/* E-mail do Pagador */}
                      <div>
                        <label className="block text-xs font-semibold text-[#111111] mb-1">
                          E-mail do Assinante para Faturamento & Recibo
                        </label>
                        <input
                          type="email"
                          required
                          value={cardData.payerEmail}
                          onChange={(e) => setCardData({ ...cardData, payerEmail: e.target.value })}
                          placeholder="seu-email@suaoficina.com.br"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D5CFC5] focus:outline-hidden focus:border-[#FF6515] bg-white"
                        />
                        <p className="text-[10px] text-[#7A7A75] mt-0.5">
                          Deve ser o e-mail da sua empresa ou titular (diferente da conta recebedora do Mercado Pago).
                        </p>
                      </div>

                      {/* Número do Cartão */}
                      <div>
                        <label className="block text-xs font-semibold text-[#111111] mb-1 flex items-center justify-between">
                          <span>Número do Cartão de Crédito</span>
                          <CreditCard className="w-4 h-4 text-[#7A7A75]" />
                        </label>
                        <input
                          type="text"
                          required
                          value={cardData.cardNumber}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                            const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
                            setCardData({ ...cardData, cardNumber: formatted });
                          }}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D5CFC5] focus:outline-hidden focus:border-[#FF6515] bg-white font-mono tracking-wider"
                        />
                      </div>

                      {/* Nome do Titular */}
                      <div>
                        <label className="block text-xs font-semibold text-[#111111] mb-1">
                          Nome Impresso no Cartão
                        </label>
                        <input
                          type="text"
                          required
                          value={cardData.cardHolder}
                          onChange={(e) => setCardData({ ...cardData, cardHolder: e.target.value.toUpperCase() })}
                          placeholder="NOME COMPLETO COMO NO CARTÃO"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D5CFC5] focus:outline-hidden focus:border-[#FF6515] bg-white uppercase"
                        />
                      </div>

                      {/* Validade + CVV + CPF */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-[#111111] mb-1">
                            Validade
                          </label>
                          <input
                            type="text"
                            required
                            value={cardData.cardExpiry}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                              const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                              setCardData({ ...cardData, cardExpiry: formatted });
                            }}
                            placeholder="MM/AA"
                            maxLength={5}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5CFC5] focus:outline-hidden focus:border-[#FF6515] bg-white text-center font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#111111] mb-1">
                            CVV
                          </label>
                          <input
                            type="text"
                            required
                            value={cardData.cardCvv}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setCardData({ ...cardData, cardCvv: digits });
                            }}
                            placeholder="123"
                            maxLength={4}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5CFC5] focus:outline-hidden focus:border-[#FF6515] bg-white text-center font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#111111] mb-1">
                            CPF / CNPJ
                          </label>
                          <input
                            type="text"
                            required
                            value={cardData.cpfCnpj}
                            onChange={(e) => setCardData({ ...cardData, cpfCnpj: e.target.value })}
                            placeholder="000.000.000-00"
                            maxLength={18}
                            className="w-full px-2 py-2 text-xs rounded-xl border border-[#D5CFC5] focus:outline-hidden focus:border-[#FF6515] bg-white text-center text-[11px]"
                          />
                        </div>
                      </div>

                      {/* Botão de Autorizar */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {isProcessing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Processando com Mercado Pago...</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              <span>
                                {billingCycle === 'annual'
                                  ? `Pagar Plano Anual (R$ ${getPlanPrice(checkoutPlanId, 'annual').toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
                                  : `Autorizar Assinatura Recorrente (R$ ${getPlanPrice(checkoutPlanId, 'monthly').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês)`}
                              </span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Opção alternativa de Checkout Externo */}
                      <div className="pt-1 text-center">
                        <button
                          type="button"
                          onClick={handleOpenExternalCheckout}
                          className="text-[11px] text-[#7A7A75] hover:text-[#111111] inline-flex items-center gap-1 underline underline-offset-2 transition-colors cursor-pointer"
                        >
                          <span>Prefere assinar na página oficial do Mercado Pago?</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                    </form>
                  )}

                  {/* ABA 2: PIX OFICIAL MERCADO PAGO */}
                  {paymentMethod === 'pix' && (
                    <div className="space-y-4">
                      {!pixData ? (
                        <div className="p-5 bg-[#FAF8F5] border border-[#E8E2D5] rounded-2xl space-y-4 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                            <QrCode className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-[#111111]">
                              Pagamento Instantâneo via Pix
                            </h4>
                            <p className="text-xs text-[#7A7A75] mt-1 max-w-sm mx-auto">
                              Gere o QR Code e chave Copia e Cola para pagar pelo aplicativo do seu banco. A liberação do plano é imediata assim que o Pix for compensado.
                            </p>
                          </div>

                          <div className="max-w-xs mx-auto text-left space-y-2">
                            <label className="block text-xs font-semibold text-[#111111]">
                              E-mail para confirmação do Pix:
                            </label>
                            <input
                              type="email"
                              required
                              value={cardData.payerEmail}
                              onChange={(e) => setCardData({ ...cardData, payerEmail: e.target.value })}
                              placeholder="seu-email@suaoficina.com.br"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5CFC5] bg-white focus:outline-hidden focus:border-[#FF6515]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleGeneratePix}
                            disabled={isGeneratingPix}
                            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isGeneratingPix ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Gerando Pix Oficial Mercado Pago...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                <span>Gerar QR Code Pix (R$ {getPlanPrice(checkoutPlanId, billingCycle).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-4 text-center animate-in fade-in duration-200">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-3 bg-white rounded-2xl border-2 border-emerald-600 shadow-md">
                              {pixData.qrCodeBase64 ? (
                                <img 
                                  src={pixData.qrCodeBase64} 
                                  alt="QR Code Pix" 
                                  className="w-52 h-52 object-contain rounded-lg"
                                />
                              ) : (
                                <div className="w-52 h-52 flex items-center justify-center bg-gray-50 text-xs text-[#7A7A75]">
                                  QR Code Gerado
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-emerald-800 mt-2 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              Aguardando pagamento no banco...
                            </span>
                          </div>

                          {/* Chave Copia e Cola */}
                          <div className="space-y-1.5 text-left">
                            <label className="block text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                              Pix Copia e Cola:
                            </label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                readOnly
                                value={pixData.qrCode}
                                className="w-full px-3 py-2 text-xs font-mono bg-white border border-emerald-300 rounded-xl select-all"
                              />
                              <button
                                type="button"
                                onClick={handleCopyPix}
                                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                              >
                                {copiedPix ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                                <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Simulação em Ambiente Sandbox */}
                          <div className="pt-2 border-t border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-left">
                            <span className="text-[11px] text-[#7A7A75]">
                              A baixa interna ocorre automaticamente após a confirmação.
                            </span>
                            <button
                              type="button"
                              onClick={handleSimulatePixApproval}
                              disabled={isSimulatingPix}
                              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer py-1"
                            >
                              {isSimulatingPix ? 'Verificando...' : 'Confirmar Pagamento (Teste Rápido)'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>
            )}

          </div>
        ) : (
          /* TABELA COMPARATIVA DE PLANOS */
          <>
            {/* Status de Consumo Atual */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#FBF9F5] rounded-2xl border border-[#EAE4D9]">
              
              {/* Plano Atual */}
              <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-[#EAE4D9] pb-3 sm:pb-0 sm:pr-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A75]">
                  Seu Plano Atual
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg text-[#111111] font-headline">
                    {currentConfig.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    currentPlan === 'free' ? 'bg-[#52524e] text-white' : 'bg-[#FF6515] text-white'
                  }`}>
                    {currentConfig.badge}
                  </span>
                </div>
                <p className="text-xs text-[#555550] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#FF6515]" />
                  <span>
                    {currentPlan === 'free' 
                      ? 'Plano Grátis (Inicial)' 
                      : 'Assinatura Ativa & Regular'}
                  </span>
                </p>
              </div>

              {/* Consumo de Projetos */}
              <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-[#EAE4D9] pb-3 sm:pb-0 sm:pr-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A75] flex items-center justify-between">
                  <span>Projetos Ativos</span>
                  <span className="font-bold text-[#111111]">
                    {activeProjectsCount} / {maxProjects}
                  </span>
                </span>
                <div className="w-full bg-[#E5E0D6] h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      activeProjectsCount >= maxProjects
                        ? 'bg-rose-500' 
                        : 'bg-[#FF6515]'
                    }`}
                    style={{
                      width: `${Math.min(100, (activeProjectsCount / maxProjects) * 100)}%`
                    }}
                  />
                </div>
                <p className="text-[11px] text-[#7A7A75]">
                  {activeProjectsCount >= maxProjects
                    ? '⚠️ Limite atingido. Faça upgrade para expandir sua cota.'
                    : `${maxProjects - activeProjectsCount} vaga(s) restante(s)`}
                </p>
              </div>

              {/* Consumo de Workspaces */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A75] flex items-center justify-between">
                  <span>Workspaces</span>
                  <span className="font-bold text-[#111111]">
                    {workspacesCount} / {maxWs}
                  </span>
                </span>
                <div className="w-full bg-[#E5E0D6] h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      workspacesCount >= maxWs ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (workspacesCount / maxWs) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#7A7A75]">
                  {workspacesCount >= maxWs 
                    ? 'Cota de unidades preenchida' 
                    : `${maxWs - workspacesCount} unidade(s) disponível(is)`}
                </p>
              </div>

            </div>

            {/* Painel de Administrador: Testes de Cota e Planos */}
            {isFounder && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-700" />
                    <span className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                      Ambiente do Administrador — Acesso Total &amp; Teste de Planos
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                    Acesso 100% Liberado
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  Como administrador do sistema, você pode alternar o plano da sua conta para simular cotas e limites (Grátis, Start ou Scala) instantaneamente:
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-amber-950">Mudar plano ativo agora:</span>
                  {(['free', 'start', 'escala'] as SubscriptionPlan[]).map((pId) => {
                    const isTargetActive = currentPlan === pId;
                    return (
                      <button
                        key={pId}
                        type="button"
                        onClick={() => handleFounderChangePlan(pId)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                          isTargetActive
                            ? 'bg-[#1c1c1a] text-white ring-2 ring-amber-500'
                            : 'bg-white hover:bg-amber-100 text-amber-950 border border-amber-300'
                        }`}
                      >
                        {isTargetActive && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        <span>
                          {pId === 'free' ? 'Plano Grátis' : pId === 'start' ? 'Plano Start' : 'Plano Scala'}
                          {isTargetActive ? ' (Ativo)' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ciclo de Pagamento */}
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-[#111111]">
                Escolha o Plano Ideal para seu Negócio
              </h3>

              <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#F0ECE4] border border-[#DDD6CB]">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    billingCycle === 'monthly' ? 'bg-[#111111] text-white shadow-2xs' : 'text-[#7A7A75]'
                  }`}
                >
                  Mensal Recorrente
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                    billingCycle === 'annual' ? 'bg-[#FF6515] text-white shadow-2xs' : 'text-[#7A7A75]'
                  }`}
                >
                  <span>Anual à Vista</span>
                  <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded-full font-bold">Até 3 Meses OFF</span>
                </button>
              </div>
            </div>

            {/* Tabela de Planos Lado a Lado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              
              {(['free', 'start', 'escala'] as SubscriptionPlan[]).map((planId) => {
                const plan = PLAN_CONFIGS[planId];
                const isCurrent = currentPlan === planId;
                const price = getPlanPrice(planId, billingCycle);
                const monthlyFraction = getMonthlyFraction(planId, billingCycle);

                return (
                  <div 
                    key={planId}
                    className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 transition-all relative ${
                      isCurrent 
                        ? 'border-2 border-[#FF6515] bg-[#FFFBF8] shadow-md' 
                        : 'border border-[#E0D9CD] bg-white hover:border-[#C5BDAF]'
                    }`}
                  >
                    {isCurrent ? (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#FF6515] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-2xs flex items-center gap-1 z-10 whitespace-nowrap">
                        <Check className="w-3 h-3" />
                        <span>Seu Plano Atual</span>
                      </div>
                    ) : planId === 'escala' ? (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#FF6515] to-[#E0550D] text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 whitespace-nowrap z-10 border border-white/30">
                        <span className="text-amber-200">🎉</span>
                        <span>{billingCycle === 'annual' ? '3 Meses Grátis • Economize R$ 2.951,79' : 'Mais Completo • Até 20 Projetos'}</span>
                      </div>
                    ) : planId === 'start' ? (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#0F172A] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-2xs flex items-center gap-1 whitespace-nowrap z-10">
                        <span>Mais Escolhido • Até 8 Projetos</span>
                      </div>
                    ) : null}

                    <div className="space-y-3 pt-1">
                      <div>
                        <span className="font-subtitle font-montserrat text-[10px] font-bold uppercase tracking-wider text-[#7A7A75]">
                          {plan.badge}
                        </span>
                        <h4 className="font-title font-bebas text-2xl text-[#111111] tracking-wide uppercase">
                          {plan.name}
                        </h4>
                        <p className="font-subtitle font-montserrat font-medium text-[11px] text-[#7A7A75] leading-tight">
                          {plan.tagline}
                        </p>
                      </div>

                      {/* Exibição Clara de Preços */}
                      <div className="py-2 border-y border-[#F0ECE4]">
                        {planId === 'free' ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-[#111111]">Grátis</span>
                            <span className="text-xs text-[#7A7A75]">/para sempre</span>
                          </div>
                        ) : billingCycle === 'annual' ? (
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-[#111111]">
                                R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-xs text-[#7A7A75]">/ano à vista</span>
                            </div>
                            <div className="mt-1 space-y-0.5">
                              <span className="text-[11px] font-bold text-emerald-700 block">
                                Equivalente a R$ {monthlyFraction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês (12x)
                              </span>
                              {planId === 'escala' ? (
                                <span className="text-[10px] font-extrabold text-[#EA580C] bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md inline-block">
                                  🎉 3 Meses Grátis (Economia de R$ 2.951,79 no ano)
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md inline-block">
                                  ✨ 2 Meses Grátis (Economia de R$ 987,74 no ano)
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-[#111111]">
                                R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-xs text-[#7A7A75]">/mês recorrente</span>
                            </div>
                            {planId === 'escala' && (
                              <span className="text-[10px] font-semibold text-[#EA580C] mt-0.5 block">
                                💡 No plano anual você ganha 3 meses de desconto!
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <ul className="space-y-2 text-xs text-[#555550]">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-1.5 leading-tight">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6515] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      {plan.limitations && (
                        <div className="pt-2 border-t border-[#F0ECE4] space-y-1">
                          <span className="text-[10px] font-bold text-amber-800 uppercase block">
                            Limitações do Grátis:
                          </span>
                          {plan.limitations.map((lim, idx) => (
                            <p key={idx} className="text-[11px] text-[#8C887B] flex items-center gap-1 leading-tight">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{lim}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-3 rounded-2xl bg-[#F0ECE4] text-[#7A7A75] font-bold text-xs cursor-default"
                        >
                          Plano Ativo
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartCheckout(planId)}
                          className={`w-full py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg ${
                            planId === 'escala'
                              ? 'bg-[#111111] hover:bg-black text-white'
                              : planId === 'start'
                              ? 'bg-[#FF6515] hover:bg-[#E0550D] text-white'
                              : 'bg-white border border-[#D5CFC5] text-[#111111] hover:bg-[#F3EFE8]'
                          }`}
                        >
                          <span>{isFounder ? `Ativar ${plan.name} (Modo Criador)` : (planId === 'free' ? 'Voltar para Grátis' : `Adquirir ${plan.name}`)}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}

            </div>

            {/* Rodapé Informativo */}
            <div className="pt-3 border-t border-[#F0ECE4] flex flex-col sm:flex-row items-center justify-between text-xs text-[#7A7A75] gap-2">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cobrança segura oficial Mercado Pago com liberação interna imediata. Cancelamento sem fidelidade.</span>
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#F0ECE4] hover:bg-[#E5E0D6] text-[#111111] font-semibold transition-colors cursor-pointer text-xs"
              >
                Concluir &amp; Fechar
              </button>
            </div>
          </>
        )}

        </div>

      </div>
    </div>
  );
};
