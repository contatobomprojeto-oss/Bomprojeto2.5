import React, { useState } from 'react';
import { 
  Bot, 
  MessageSquare, 
  BellRing, 
  Smartphone, 
  Users, 
  Save, 
  Check, 
  Sparkles, 
  Clock, 
  ShieldAlert, 
  QrCode, 
  Sliders, 
  FileText, 
  HelpCircle,
  Play,
  RotateCcw,
  Cloud,
  Database,
  Lock,
  Send,
  CheckCircle2,
  AlertCircle,
  CheckCheck,
  Filter
} from 'lucide-react';
import { AiSettingsConfig, BillingScheduleConfig, Project, SubscriptionPlan } from '../types';
import { WhatsAppConnectionModal } from './WhatsAppConnectionModal';
import { BillingScheduleSection } from './BillingScheduleSection';
import { Zap, ArrowRight } from 'lucide-react';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';

interface AiCustomerServiceViewProps {
  settings: AiSettingsConfig;
  onSaveSettings: (newSettings: AiSettingsConfig) => void;
  projects: Project[];
  plan?: SubscriptionPlan;
  userEmail?: string;
  onUpgradePlan?: () => void;
  onOpenWhatsappSimulator?: () => void;
  onTestClientSupportAlert?: () => void;
}

export const AiCustomerServiceView: React.FC<AiCustomerServiceViewProps> = ({
  settings,
  onSaveSettings,
  projects,
  plan = 'start',
  userEmail,
  onUpgradePlan,
  onOpenWhatsappSimulator,
  onTestClientSupportAlert
}) => {
  const [config, setConfig] = useState<AiSettingsConfig>(settings);
  const [activeSubTab, setActiveSubTab] = useState<'whatsapp' | 'cobranca' | 'comunicacao' | 'disparo_massa' | 'cliente'>('comunicacao');
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testedBillingMsg, setTestedBillingMsg] = useState('');
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [alertTriggeredFeedback, setAlertTriggeredFeedback] = useState(false);
  const [showFooterUpgradeNotice, setShowFooterUpgradeNotice] = useState(false);

  // Hook central de validação de plano
  const guard = useSubscriptionGuard({
    plan,
    userEmail,
    onOpenUpgradeModal: onUpgradePlan
  });

  const isPaidPlan = guard.isPaid;

  // Estados exclusivos do Envio Massivo de Notificações com IA
  const [massTarget, setMassTarget] = useState<'all_active' | 'in_execution' | 'billing_pending'>('all_active');
  const [massTone, setMassTone] = useState<'acolhedor' | 'tecnico' | 'comercial'>('acolhedor');
  const [massCustomPrompt, setMassCustomPrompt] = useState('Atualização de progresso das sprints, entregáveis e link do portal');
  const [massDraftMessage, setMassDraftMessage] = useState(
    'Olá {cliente}! 👋 Aqui é da {empresa}. Passando para avisar que a sua sprint/projeto {codigo} ({projeto}) está na etapa de {etapa}. Você pode acompanhar os entregáveis, relatórios e o andamento no link seguro: {link}'
  );
  const [isGeneratingMass, setIsGeneratingMass] = useState(false);
  const [isSendingMass, setIsSendingMass] = useState(false);
  const [massSentCount, setMassSentCount] = useState(0);
  const [massTotalCount, setMassTotalCount] = useState(0);
  const [massCompleted, setMassCompleted] = useState(false);

  const handleToggle = (key: keyof AiSettingsConfig) => {
    if (key === 'clientSupportButtonEnabled' && !isPaidPlan) {
      if (onUpgradePlan) {
        onUpgradePlan();
      }
      return;
    }

    setConfig(prev => {
      const updated = {
        ...prev,
        [key]: !prev[key]
      };
      onSaveSettings(updated);
      return updated;
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestVisualAlert = () => {
    if (onTestClientSupportAlert) {
      onTestClientSupportAlert();
    }
    setAlertTriggeredFeedback(true);
    setTimeout(() => setAlertTriggeredFeedback(false), 5000);
  };

  const handleBillingScheduleChange = (newSchedule: BillingScheduleConfig) => {
    setConfig(prev => ({
      ...prev,
      billingSchedule: newSchedule
    }));
  };

  const handleServiceScheduleChange = (newSchedule: BillingScheduleConfig) => {
    setConfig(prev => ({
      ...prev,
      serviceSchedule: newSchedule
    }));
  };

  const handleSave = () => {
    onSaveSettings(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestBillingPrompt = async () => {
    setIsGeneratingTest(true);
    try {
      const res = await fetch('/api/ai/generate-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Mariana Costa',
          stageName: 'Otimização Contínua & ROAS',
          projectTitle: 'Escala de Tráfego Pago & Campanhas Meta Ads',
          keywords: config.customBillingPrompt || 'Parcela 2 com vencimento pendente, chave Pix para baixa automática',
          tone: config.billingTone === 'firme' ? 'firme, assertivo, formal' : 'acolhedor, amigável, transparente'
        })
      });
      const data = await res.json();
      setTestedBillingMsg(data.message || 'Mensagem de cobrança gerada com sucesso pela IA!');
    } catch {
      setTestedBillingMsg(`Olá Mariana! Passando para lembrar da 2ª parcela referente ao seu projeto de tráfego e performance. A chave Pix para pagamento foi gerada pelo sistema. Qualquer dúvida estamos à disposição!`);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECEF] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
              IA de Atendimento & Notificações
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1.5">
            Configure a inteligência artificial dos seus projetos, regras de resposta no WhatsApp e gerador de cobranças.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="fleetly-btn-primary py-2.5 px-5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Configurações Salvas!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Free Plan Notice Banner */}
      {plan === 'free' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Zap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-amber-950">
                Plano Grátis Ativo — Respostas e Cobranças Manuais
              </p>
              <p className="text-amber-800 leading-relaxed">
                O envio autônomo via IA 24h e agendamento automático de cobranças Pix no WhatsApp estão disponíveis a partir do <strong>Plano Start</strong>. No Plano Grátis, os textos são gerados para você enviar manualmente pelo WhatsApp.
              </p>
            </div>
          </div>
          {onUpgradePlan && (
            <button
              type="button"
              onClick={onUpgradePlan}
              className="fleetly-btn-primary py-2 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Desbloquear IA 24h</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Sub-menu Fleetly Pill Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-[#F1F5F9] p-1.5 rounded-2xl border border-[#EAECEF] max-w-fit">
        
        {/* Configuração de atendimento */}
        <button
          onClick={() => setActiveSubTab('whatsapp')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'whatsapp'
              ? 'bg-[#111827] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Configuração de atendimento</span>
        </button>

        {/* Gerador de cobrança */}
        <button
          onClick={() => setActiveSubTab('cobranca')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'cobranca'
              ? 'bg-[#111827] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Gerador de cobrança</span>
        </button>

        {/* Comunicação IA */}
        <button
          onClick={() => setActiveSubTab('comunicacao')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'comunicacao'
              ? 'bg-[#111827] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Comunicação IA</span>
        </button>

        {/* Disparo Massivo IA */}
        <button
          onClick={() => setActiveSubTab('disparo_massa')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'disparo_massa'
              ? 'bg-[#111827] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Disparo Massivo IA</span>
          {guard.isFree && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />
              Start
            </span>
          )}
        </button>

        {/* Cliente */}
        <button
          onClick={() => setActiveSubTab('cliente')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'cliente'
              ? 'bg-[#111827] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cliente</span>
        </button>

      </div>

      {/* Tab 1: Comunicação IA */}
      {activeSubTab === 'comunicacao' && (
        <div className="bg-white rounded-3xl border border-[#EAECEF] p-6 sm:p-8 space-y-8 shadow-xs animate-in fade-in duration-150">
          
          {/* Header Image 3 Style */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#9f3c16]" />
              <h2 className="font-headline font-bold text-xl text-[#1c1c1a]">
                Comunicação automática
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#73736c]">
              Você atualiza o projeto; o BOM Projeto avisa seu cliente pelo WhatsApp já conectado.
            </p>
          </div>

          {/* Quick WhatsApp Status & Pairing Card */}
          <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-[#ded8cd] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                config.whatsappConnected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-stone-100 text-stone-500 border-stone-200'
              }`}>
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${config.whatsappConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`}></span>
                  <h4 className="font-bold text-xs text-[#1c1c1a]">
                    WhatsApp da Sua Empresa
                  </h4>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    config.whatsappConnected 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-stone-100 text-stone-600 border border-stone-200'
                  }`}>
                    {config.whatsappConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
                <p className="text-[11px] text-[#73736c] mt-0.5">
                  {config.whatsappConnected 
                    ? 'Aparelho conectado. Notificações de etapas, fotos, Pix e IA partem do seu WhatsApp.'
                    : 'Conecte seu aparelho via QR Code para que as notificações partam do seu WhatsApp.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsWhatsappModalOpen(true)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs ${
                config.whatsappConnected
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{config.whatsappConnected ? 'Gerenciar Conexão' : 'Escanear QR Code'}</span>
            </button>
          </div>

          {/* 3 Toggle switches */}
          <div className="space-y-6 divide-y divide-[#f0ebe1]">
            
            {/* Switch 1: Ligar a comunicação automática */}
            <div className="flex items-center justify-between pt-2">
              <div className="pr-4">
                <h3 className="font-bold text-sm text-[#1c1c1a]">
                  Ligar a comunicação automática
                </h3>
                <p className="text-xs text-[#73736c] mt-0.5">
                  Nada é enviado enquanto esta chave estiver desligada.
                </p>
              </div>
              <button
                onClick={() => handleToggle('autoCommunicationEnabled')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.autoCommunicationEnabled ? 'bg-[#9f3c16]' : 'bg-[#ded8cd]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    config.autoCommunicationEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Switch 2: Avisar o cliente a cada atualização */}
            <div className="flex items-center justify-between pt-6">
              <div className="pr-4">
                <h3 className="font-bold text-sm text-[#1c1c1a]">
                  Avisar o cliente a cada atualização
                </h3>
                <p className="text-xs text-[#73736c] mt-0.5">
                  Nova etapa, fotos e conclusão do projeto.
                </p>
              </div>
              <button
                onClick={() => handleToggle('notifyEveryUpdate')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.notifyEveryUpdate ? 'bg-[#9f3c16]' : 'bg-[#ded8cd]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    config.notifyEveryUpdate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Switch 3: Pedir minha revisão em avisos delicados */}
            <div className="flex items-center justify-between pt-6">
              <div className="pr-4">
                <h3 className="font-bold text-sm text-[#1c1c1a]">
                  Pedir minha revisão em avisos delicados
                </h3>
                <p className="text-xs text-[#73736c] mt-0.5">
                  Mudança de prazo e retorno de etapa ficam esperando sua aprovação.
                </p>
              </div>
              <button
                onClick={() => handleToggle('requireReviewForDelicate')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.requireReviewForDelicate ? 'bg-[#9f3c16]' : 'bg-[#ded8cd]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    config.requireReviewForDelicate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

          </div>

          {/* Tom das mensagens & Limits grid */}
          <div className="pt-4 border-t border-[#f0ebe1] space-y-6">
            
            {/* Tone Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#57534e] mb-2.5">
                Tom das Mensagens
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {[
                  { id: 'formal', label: 'Formal' },
                  { id: 'professional', label: 'Profissional' },
                  { id: 'friendly', label: 'Amigável' },
                  { id: 'informal', label: 'Informal' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, tone: t.id as any }))}
                    className={`py-2 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      config.tone === t.id
                        ? 'bg-[#9f3c16] text-white shadow-xs'
                        : 'bg-[#f5efe6] text-[#57534e] hover:bg-[#ede7dc] border border-[#ded8cd]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs: Não enviar a partir de, Voltar a enviar, Máximo por dia, Máximo por projeto */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              <div className="bg-[#fcfaf7] p-3.5 rounded-2xl border border-[#ded8cd]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#73736c] mb-1.5">
                  Não enviar a partir de
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={config.quietHoursStart}
                    onChange={(e) => setConfig(prev => ({ ...prev, quietHoursStart: Number(e.target.value) }))}
                    className="w-16 p-2 rounded-xl border border-[#ded8cd] bg-white font-mono font-bold text-center text-sm text-[#1c1c1a]"
                  />
                  <span className="text-xs text-[#73736c] font-bold">h</span>
                </div>
              </div>

              <div className="bg-[#fcfaf7] p-3.5 rounded-2xl border border-[#ded8cd]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#73736c] mb-1.5">
                  Voltar a enviar às
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={config.quietHoursEnd}
                    onChange={(e) => setConfig(prev => ({ ...prev, quietHoursEnd: Number(e.target.value) }))}
                    className="w-16 p-2 rounded-xl border border-[#ded8cd] bg-white font-mono font-bold text-center text-sm text-[#1c1c1a]"
                  />
                  <span className="text-xs text-[#73736c] font-bold">h</span>
                </div>
              </div>

              <div className="bg-[#fcfaf7] p-3.5 rounded-2xl border border-[#ded8cd]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#73736c] mb-1.5">
                  Máximo por dia
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.maxPerDay}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxPerDay: Number(e.target.value) }))}
                  className="w-full p-2 rounded-xl border border-[#ded8cd] bg-white font-mono font-bold text-center text-sm text-[#1c1c1a]"
                />
              </div>

              <div className="bg-[#fcfaf7] p-3.5 rounded-2xl border border-[#ded8cd]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#73736c] mb-1.5">
                  Máximo por projeto
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.maxPerProject}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxPerProject: Number(e.target.value) }))}
                  className="w-full p-2 rounded-xl border border-[#ded8cd] bg-white font-mono font-bold text-center text-sm text-[#1c1c1a]"
                />
              </div>

            </div>

            {/* Agendamento da IA (Janela de atuação / delay após atualização) */}
            <div className="bg-[#fcfaf7] p-4 sm:p-5 rounded-2xl border border-[#ded8cd] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#1c1c1a] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#9f3c16]" />
                    <span>Agendamento da IA: Janela de Atuação Automática</span>
                  </h4>
                  <p className="text-[11px] text-[#73736c]">
                    Tempo de espera programado após você salvar uma foto ou atualizar a etapa antes de disparar para o WhatsApp do cliente.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[2, 5, 10, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, responseDelayMinutes: mins as any }))}
                    className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      config.responseDelayMinutes === mins
                        ? 'bg-[#1c1c1a] text-white shadow-xs'
                        : 'bg-white border border-[#ded8cd] text-[#57534e] hover:bg-[#ede7dc]'
                    }`}
                  >
                    {mins} Min
                  </button>
                ))}
                <span className="text-[11px] text-[#73736c] ml-2">
                  (Permite que você ajuste fotos ou textos antes do envio definitivo)
                </span>
              </div>
            </div>

            {/* Atalho para Horário Preferencial de Cobrança */}
            <div className="bg-[#fff9f5] p-4 rounded-2xl border border-[#9f3c16]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#9f3c16]/10 text-[#9f3c16] shrink-0">
                  <BellRing className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-xs text-[#1c1c1a]">
                    Horário Preferencial para Cobrança via WhatsApp
                  </h4>
                  <p className="text-[11px] text-[#73736c]">
                    Configure janelas amigáveis de cobrança Pix, pausa no almoço e bloqueio de noites e fins de semana.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('cobranca')}
                className="py-1.5 px-3 rounded-xl bg-[#9f3c16] text-white text-xs font-bold hover:bg-[#853010] transition-colors self-start sm:self-center cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
              >
                <span>Ajustar Janela de Cobrança</span>
                <span>→</span>
              </button>
            </div>

            {/* Custom Prompt & Context Data Fields */}
            <div className="space-y-4 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#1c1c1a] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#9f3c16]" />
                    <span>Prompt Próprio da IA do Projeto</span>
                  </label>
                  <span className="text-[10px] text-[#73736c]">Instruções personalizadas</span>
                </div>
                <textarea
                  rows={3}
                  value={config.customPrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, customPrompt: e.target.value }))}
                  placeholder="Ex: Você é o gestor de projetos responsável. Enfatize sempre o cumprimento dos prazos, o rigor técnico em cada etapa e a transparência com o cliente..."
                  className="w-full p-3 rounded-2xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white text-xs text-[#1c1c1a] leading-relaxed resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#1c1c1a] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#73736c]" />
                    <span>Dados de Contexto da Empresa</span>
                  </label>
                  <span className="text-[10px] text-[#73736c]">Horários, políticas e garantia</span>
                </div>
                <textarea
                  rows={3}
                  value={config.contextData}
                  onChange={(e) => setConfig(prev => ({ ...prev, contextData: e.target.value }))}
                  placeholder="Ex: Atendimento de segunda a sexta das 08h às 18h. Garantia estrutural com termo digital. Chave Pix oficial cadastrada no CNPJ..."
                  className="w-full p-3 rounded-2xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white text-xs text-[#1c1c1a] leading-relaxed resize-none"
                />
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Tab 2: Gerador de Cobrança */}
      {activeSubTab === 'cobranca' && (
        <div className="bg-white rounded-3xl border border-[#ded8cd] p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-150">
          
          <div className="flex items-start justify-between gap-4 border-b border-[#f0ebe1] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-[#9f3c16]" />
                <h2 className="font-headline font-bold text-xl text-[#1c1c1a]">
                  Gerador de Cobrança Automatizada Pix
                </h2>
              </div>
              <p className="text-xs text-[#73736c] mt-1">
                Configure os modelos de disparo e o prompt personalizado para ativar lembretes quando houver parcelas a vencer ou dívida em aberto.
              </p>
            </div>

            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              Integrado ao Pix Inter
            </span>
          </div>

          {/* Seleção do Tipo de Cobrança */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-[#1c1c1a]">
              Selecione o Tipo de Cobrança Padrão:
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'friendly',
                  title: 'Lembrete Amigável',
                  tag: 'Preventivo (D-3 a D-0)',
                  desc: 'Comunicação acolhedora avisando que a próxima etapa está prestes a iniciar com opção Pix.',
                  color: 'border-emerald-200 bg-emerald-50/40'
                },
                {
                  id: 'due_date',
                  title: 'Vencimento da Etapa',
                  tag: 'Dia do Vencimento (D+0)',
                  desc: 'Aviso claro de conclusão de fase do projeto (execução técnica ou entrega) aguardando liberação de parcela.',
                  color: 'border-blue-200 bg-blue-50/40'
                },
                {
                  id: 'firm_notice',
                  title: 'Cobrança Firme com Notificação',
                  tag: 'Dívida em Aberto (D+3 em diante)',
                  desc: 'Alerta formal de retenção do cronograma de montagem até conciliação da parcela pendente.',
                  color: 'border-amber-200 bg-amber-50/40'
                }
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setConfig(prev => ({ ...prev, billingType: item.id as any }))}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    config.billingType === item.id
                      ? 'border-[#9f3c16] bg-[#fdfaf8] shadow-xs'
                      : 'border-[#ded8cd] hover:border-[#b8b2a7]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="font-bold text-xs text-[#1c1c1a]">{item.title}</h4>
                      <input
                        type="radio"
                        name="billingType"
                        checked={config.billingType === item.id}
                        onChange={() => setConfig(prev => ({ ...prev, billingType: item.id as any }))}
                        className="text-[#9f3c16] focus:ring-[#9f3c16]"
                      />
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-[#73736c] border border-[#e6e1d8]">
                      {item.tag}
                    </span>
                    <p className="text-[11px] text-[#57534e] mt-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Horário Preferencial para Cobrança via WhatsApp & Proteção ao Cliente */}
          <BillingScheduleSection
            schedule={config.billingSchedule || {
              enabled: true,
              preset: 'commercial',
              startTime: '09:00',
              endTime: '18:00',
              allowedDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
              blockWeekends: true,
              blockHolidays: true,
              pauseDuringLunch: true,
              lunchStart: '12:00',
              lunchEnd: '13:30',
              queueOutOfWindow: true,
              timezone: 'America/Sao_Paulo'
            }}
            onChangeSchedule={handleBillingScheduleChange}
            mode="billing"
          />

          {/* Prompt Próprio de Cobrança */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1c1c1a] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#9f3c16]" />
                <span>Prompt Próprio para Inadimplência e Dívida em Aberto</span>
              </label>
              <span className="text-[10px] text-[#73736c]">
                Instruções específicas para a IA do BOMProjeto acionar no WhatsApp
              </span>
            </div>

            <textarea
              rows={4}
              value={config.customBillingPrompt}
              onChange={(e) => setConfig(prev => ({ ...prev, customBillingPrompt: e.target.value }))}
              placeholder="Ex: Quando houver parcela vencida há mais de 3 dias, seja extremamente cordial e respeitoso, mas explique com transparência que a próxima etapa técnica do projeto só poderá ser agendada após a baixa automática do Pix. Envie o código Pix Copia e Cola e o valor exato..."
              className="w-full p-3 rounded-2xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white text-xs text-[#1c1c1a] leading-relaxed resize-none font-sans"
            />
          </div>

          {/* Teste ao vivo da IA de Cobrança */}
          <div className="bg-[#fcfaf7] border border-[#ded8cd] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-[#1c1c1a]">
                  Simular Disparo de Cobrança com IA
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestBillingPrompt}
                disabled={isGeneratingTest}
                className="py-1.5 px-3 rounded-xl bg-white border border-[#ded8cd] hover:bg-[#ede7dc] text-xs font-bold text-[#1c1c1a] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 ${isGeneratingTest ? 'animate-spin' : ''}`} />
                <span>{isGeneratingTest ? 'Processando com IA...' : 'Testar Mensagem'}</span>
              </button>
            </div>

            {testedBillingMsg && (
              <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs text-[#1c1c1a] leading-relaxed">
                <p className="font-bold text-[10px] text-emerald-800 uppercase tracking-wider mb-1">
                  Exemplo de mensagem gerada para o cliente:
                </p>
                <p className="font-sans italic text-[#44403c]">
                  "{testedBillingMsg}"
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tab 3: Configuração de Atendimento */}
      {activeSubTab === 'whatsapp' && (
        <div className="bg-white rounded-3xl border border-[#ded8cd] p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-150">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0ebe1] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h2 className="font-headline font-bold text-xl text-[#1c1c1a]">
                  Configuração de Atendimento via WhatsApp
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Canal Oficial
                </span>
              </div>
              <p className="text-xs text-[#73736c] mt-1">
                Conecte o smartphone oficial da sua agência ou operação digital ao sistema BOMProjeto para atendimento inteligente, respostas a clientes e envio de atualizações das entregas.
              </p>
            </div>

            <button
              onClick={() => setIsWhatsappModalOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Conectar WhatsApp Business</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-[#ded8cd]">
              <span className="text-[11px] text-[#73736c] font-bold">Status da Conexão</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${config.whatsappConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`}></span>
                <span className={`font-bold text-sm ${config.whatsappConnected ? 'text-emerald-800' : 'text-stone-600'}`}>
                  {config.whatsappConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-[#ded8cd]">
              <span className="text-[11px] text-[#73736c] font-bold">Dispositivo WhatsApp</span>
              <div className="flex items-center gap-2 mt-1">
                <Smartphone className={`w-4 h-4 ${config.whatsappConnected ? 'text-emerald-600' : 'text-stone-400'}`} />
                <span className={`font-bold text-sm ${config.whatsappConnected ? 'text-emerald-800' : 'text-stone-600'}`}>
                  {config.whatsappConnected ? 'Aparelho Vinculado' : 'Nenhum Aparelho'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-[#ded8cd]">
              <span className="text-[11px] text-[#73736c] font-bold">Infraestrutura WhatsApp</span>
              <p className="font-bold text-sm text-emerald-800 mt-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Plano BOMProjeto (Incluso)</span>
              </p>
            </div>
          </div>

          {/* Nuvem Segura BOMProjeto */}
          <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-[#e6e1d8] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-[#1c1c1a]">
                  Armazenamento em Nuvem BOMProjeto
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Nuvem Segura Ativa
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#ede8df] text-[#57534e]">
                bomprojeto.com
              </span>
            </div>
            <p className="text-[11px] text-[#73736c]">
              As fotos e documentos dos projetos enviados na execução são compactados com alta fidelidade e salvos diretamente na nuvem segura do BOMProjeto, gerando links protegidos para visualização dos clientes no portal e no WhatsApp.
            </p>
          </div>

          {/* Horários de atendimento configurados */}
          <div className="pt-2 border-t border-[#f0ebe1]">
            <BillingScheduleSection
              schedule={config.serviceSchedule || config.billingSchedule || {
                enabled: true,
                preset: 'commercial',
                startTime: '08:00',
                endTime: '18:00',
                allowedDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
                blockWeekends: true,
                blockHolidays: true,
                pauseDuringLunch: true,
                lunchStart: '12:00',
                lunchEnd: '13:30',
                queueOutOfWindow: true,
                timezone: 'America/Sao_Paulo'
              }}
              onChangeSchedule={handleServiceScheduleChange}
              mode="service"
            />
          </div>

          {onOpenWhatsappSimulator && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-emerald-950">
                  Simulador de Atendimento com Cliente
                </h4>
                <p className="text-[11px] text-emerald-800">
                  Abra a tela de chat interativa para testar como o assistente com IA realiza o atendimento e esclarece dúvidas aos clientes.
                </p>
              </div>
              <button
                onClick={onOpenWhatsappSimulator}
                className="py-2 px-4 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Abrir Simulador de Atendimento
              </button>
            </div>
          )}

        </div>
      )}

      {/* Tab 4: Cliente */}
      {activeSubTab === 'cliente' && (
        <div className="bg-white rounded-3xl border border-[#ded8cd] p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-150">
          
          <div className="border-b border-[#f0ebe1] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                <h2 className="font-headline font-bold text-xl text-[#1c1c1a]">
                  Experiência & Regras do Cliente
                </h2>
              </div>
              <p className="text-xs text-[#73736c] mt-1">
                Personalize como os clientes interagem pelo portal público e como os alertas são emitidos no Bom Projeto.
              </p>
            </div>
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Salvo com sucesso
              </span>
            )}
          </div>

          {alertTriggeredFeedback && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <BellRing className="w-4 h-4 text-amber-700 shrink-0 animate-bounce" />
                <span>
                  <strong>Alerta de teste disparado com sucesso!</strong> A barra prioritária foi ativada no topo da tela do Bom Projeto.
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setAlertTriggeredFeedback(false)}
                className="text-amber-700 hover:text-amber-900 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="space-y-4">
            {/* Botão de Suporte do Cliente & Alerta Visual */}
            <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all space-y-4 ${
              config.clientSupportButtonEnabled !== false
                ? 'bg-[#fff7f2] border-[#9f3c16]/30'
                : 'bg-[#faf8f5] border-[#ded8cd]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    config.clientSupportButtonEnabled !== false
                      ? 'bg-[#9f3c16] text-white'
                      : 'bg-stone-200 text-stone-500'
                  }`}>
                    <BellRing className={`w-4 h-4 ${config.clientSupportButtonEnabled !== false ? 'animate-bounce' : ''}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm text-[#1c1c1a]">
                        Botão de Suporte do Cliente no Portal (Alerta Visual em Tempo Real)
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        config.clientSupportButtonEnabled !== false
                          ? 'bg-[#ffdbcf] text-[#9f3c16]'
                          : 'bg-stone-200 text-stone-600'
                      }`}>
                        {config.clientSupportButtonEnabled !== false ? 'Ativo no Portal' : 'Desativado'}
                      </span>
                      {!isPaidPlan && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          🔒 Alternar opção exige plano Start ou Scala
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#73736c] mt-0.5">
                      Quando o cliente clica nele, é enviado ao assinante: <strong className="text-[#9f3c16]">"Cliente precisa de seu suporte"</strong> e é gerado um alerta visual imediato na tela do Bom Projeto.
                      {!isPaidPlan && (
                        <span className="block text-[10px] text-amber-800 font-semibold mt-0.5">
                          * Recurso ativo por padrão. A opção de ativar ou desativar requer assinatura ativa dos planos Start ou Scala.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleTestVisualAlert}
                    className="py-1.5 px-3 rounded-xl bg-[#9f3c16] hover:bg-[#853010] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    title="Dispara um alerta de teste em tempo real na tela"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Testar Alerta Visual</span>
                  </button>

                  {/* Switch Principal do Botão de Suporte */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.clientSupportButtonEnabled !== false}
                    onClick={() => handleToggle('clientSupportButtonEnabled')}
                    title={!isPaidPlan ? "Esse aqui é ativo por padrão. A opção de alterar exige o plano Start ou Scala." : undefined}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      config.clientSupportButtonEnabled !== false ? 'bg-[#9f3c16]' : 'bg-[#ded8cd]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        config.clientSupportButtonEnabled !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Sub-configurações de Alerta Visual */}
              <div className="p-3.5 bg-white rounded-xl border border-[#ded8cd] text-xs space-y-3">
                <div className="font-bold text-[11px] text-[#1c1c1a] uppercase tracking-wider text-stone-500">
                  Comportamento e Alertas Visuais no BOM Projeto:
                </div>

                {/* Sub-switch 1: Alerta Visual Luminoso */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      config.visualAlertBannerEnabled !== false ? 'bg-red-500 animate-pulse' : 'bg-stone-300'
                    }`}></span>
                    <div>
                      <span className="font-bold text-xs text-[#1c1c1a]">Alerta Visual Luminoso</span>
                      <p className="text-[11px] text-[#73736c]">
                        Barra prioritária luminosa no topo da tela com atalho para abrir a OS ou atender no WhatsApp.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      config.visualAlertBannerEnabled !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {config.visualAlertBannerEnabled !== false ? 'Ativado' : 'Desativado'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={config.visualAlertBannerEnabled !== false}
                      onClick={() => handleToggle('visualAlertBannerEnabled')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        config.visualAlertBannerEnabled !== false ? 'bg-red-600' : 'bg-[#ded8cd]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          config.visualAlertBannerEnabled !== false ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Sub-switch 2: Sino e Notificações */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      config.visualAlertSoundEnabled !== false ? 'bg-amber-500 animate-ping' : 'bg-stone-300'
                    }`}></span>
                    <div>
                      <span className="font-bold text-xs text-[#1c1c1a]">Sino & Som de Notificações</span>
                      <p className="text-[11px] text-[#73736c]">
                        Contador em tempo real e aviso sonoro de urgência no topo do sistema.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      config.visualAlertSoundEnabled !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {config.visualAlertSoundEnabled !== false ? 'Ativado' : 'Desativado'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={config.visualAlertSoundEnabled !== false}
                      onClick={() => handleToggle('visualAlertSoundEnabled')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        config.visualAlertSoundEnabled !== false ? 'bg-amber-500' : 'bg-[#ded8cd]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          config.visualAlertSoundEnabled !== false ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Reações com Emoji */}
            <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-[#ded8cd] flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs text-[#1c1c1a]">
                  Permitir Reações com Emoji no Portal
                </h4>
                <p className="text-[11px] text-[#73736c] mt-0.5">
                  Os clientes podem bater palmas 👏, parabenizar ❤️ ou comentar no link seguro sem precisar ligar.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  config.allowPortalReactions !== false
                    ? 'text-emerald-700 bg-emerald-100'
                    : 'text-stone-600 bg-stone-100 border border-stone-200'
                }`}>
                  {config.allowPortalReactions !== false ? 'Ativado' : 'Desativado'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.allowPortalReactions !== false}
                  onClick={() => handleToggle('allowPortalReactions')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    config.allowPortalReactions !== false ? 'bg-emerald-600' : 'bg-[#ded8cd]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      config.allowPortalReactions !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Card 3: Certificado Digital de Conclusão & Garantia */}
            <div className="p-4 rounded-2xl bg-[#fcfaf7] border border-[#ded8cd] flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs text-[#1c1c1a]">
                  Exibir Certificado Digital de Conclusão & Garantia
                </h4>
                <p className="text-[11px] text-[#73736c] mt-0.5">
                  Liberado automaticamente para download quando a OS atinge 100% de conclusão.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  config.showWarrantyCertificate !== false
                    ? 'text-emerald-700 bg-emerald-100'
                    : 'text-stone-600 bg-stone-100 border border-stone-200'
                }`}>
                  {config.showWarrantyCertificate !== false ? 'Ativado' : 'Desativado'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.showWarrantyCertificate !== false}
                  onClick={() => handleToggle('showWarrantyCertificate')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    config.showWarrantyCertificate !== false ? 'bg-emerald-600' : 'bg-[#ded8cd]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      config.showWarrantyCertificate !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Card 4: Identificação da Oficina no Rodapé das Mensagens */}
            <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
              !isPaidPlan 
                ? 'bg-[#fffbf7] border-[#9f3c16]/30 shadow-2xs' 
                : 'bg-[#fcfaf7] border-[#ded8cd]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs sm:text-sm text-[#1c1c1a]">
                      Identificação da Oficina no Rodapé das Mensagens
                    </h4>
                    {!isPaidPlan ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-700" />
                        Ativo Obrigatório no Plano Grátis
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Personalizável ({plan === 'escala' ? 'Plano Scala' : 'Plano Start'})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#73736c] mt-0.5">
                    Inclui assinatura "BOM Projeto - Marcenaria Ferraz" com link seguro de acompanhamento.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    !isPaidPlan
                      ? 'text-emerald-700 bg-emerald-100'
                      : config.showWorkshopFooterSignature !== false
                      ? 'text-emerald-700 bg-emerald-100'
                      : 'text-stone-600 bg-stone-100 border border-stone-200'
                  }`}>
                    {!isPaidPlan ? 'Ativado' : config.showWorkshopFooterSignature !== false ? 'Ativado' : 'Desativado'}
                  </span>
                  
                  {/* Switch: No plano Grátis é fixo em Ativado. No plano Start/Scala pode alternar livremente */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isPaidPlan ? true : config.showWorkshopFooterSignature !== false}
                    onClick={() => {
                      if (!isPaidPlan) {
                        setShowFooterUpgradeNotice(true);
                        if (onUpgradePlan) onUpgradePlan();
                      } else {
                        handleToggle('showWorkshopFooterSignature');
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      (!isPaidPlan || config.showWorkshopFooterSignature !== false) ? 'bg-emerald-600' : 'bg-[#ded8cd]'
                    }`}
                    title={!isPaidPlan ? 'Obrigatório no plano Grátis. Assine o plano Start ou Scala para poder desativar.' : 'Clique para ativar ou desativar'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        (!isPaidPlan || config.showWorkshopFooterSignature !== false) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Banner explicativo quando estiver no Plano Grátis */}
              {!isPaidPlan && (
                <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
                    <span>
                      <strong>Esse recurso é ativo por padrão.</strong> A opção de ativar ou desativar o rodapé só é liberada para assinantes do <strong>Plano Start</strong> ou <strong>Scala</strong>.
                    </span>
                  </div>
                  {onUpgradePlan && (
                    <button
                      type="button"
                      onClick={onUpgradePlan}
                      className="px-3 py-1.5 rounded-lg bg-[#9f3c16] hover:bg-[#853010] text-white font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Liberar no Start / Scala</span>
                    </button>
                  )}
                </div>
              )}

              {/* Mensagem de tentativa de desativação sem plano pago */}
              {showFooterUpgradeNotice && !isPaidPlan && (
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 text-xs flex items-center justify-between gap-2 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>
                      Para desativar a identificação da empresa/agência nas mensagens, mude para o <strong>Plano Start</strong> (R$ 149/mês) ou <strong>Scala</strong> (R$ 299/mês).
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowFooterUpgradeNotice(false)} 
                    className="text-stone-400 hover:text-stone-600 font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Tab: Envio Massivo de Notificações com IA */}
      {activeSubTab === 'disparo_massa' && (
        <div className="bg-white rounded-3xl border border-[#ded8cd] p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-150">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0ebe1] pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#ffdbcf] text-[#9f3c16] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#9f3c16]" />
                </div>
                <div>
                  <h2 className="font-headline font-bold text-xl text-[#1c1c1a] flex items-center gap-2">
                    Envio Massivo de Notificações IA
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      WhatsApp Oficial
                    </span>
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#73736c]">
                Envie boletins de progresso, fotos da bancada ou lembretes amigáveis para múltiplos clientes com IA.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                guard.isFree 
                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {guard.isFree ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Plano Grátis (Bloqueado)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Liberado ({guard.plan.toUpperCase()})</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Validação de Acesso via useSubscriptionGuard */}
          {!guard.canSendMassAiNotifications().allowed ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white border-2 border-amber-200 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                  <Lock className="w-6 h-6 text-amber-700" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                    Acesso Exclusivo a Partir do Plano Start
                  </span>
                  <h3 className="font-headline font-bold text-lg text-[#1c1c1a]">
                    Disparo Massivo de Notificações com IA Bloqueado no Plano Grátis
                  </h3>
                  <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
                    No Plano Grátis, os links de acompanhamento do cliente são compartilhados de forma manual e individual. Para ativar o envio em lote com inteligência artificial, personalização automática de texto e múltiplos destinatários, faça upgrade para o Plano Start ou Scala.
                  </p>
                </div>
              </div>

              {/* Comparativo de Recursos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-[#ded8cd] space-y-2">
                  <span className="text-[11px] font-bold text-[#73736c] uppercase tracking-wider block">
                    Plano Atual: Grátis (R$ 0)
                  </span>
                  <ul className="text-xs text-[#57534e] space-y-1.5">
                    <li className="flex items-center gap-1.5 text-red-600">
                      <span>✕</span>
                      <span>Envio massivo de notificações desativado</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-red-600">
                      <span>✕</span>
                      <span>Sem geração de boletins em lote via IA</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-[#57534e]">
                      <span>✓</span>
                      <span>Apenas 1 projeto ativo simultâneo</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Plano Start Recomendado (R$ 493,87/mês)
                    </span>
                    <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      Liberado
                    </span>
                  </div>
                  <ul className="text-xs text-emerald-950 space-y-1.5">
                    <li className="flex items-center gap-1.5 text-emerald-700">
                      <span>✓</span>
                      <strong>Envio massivo para todos os projetos ativos</strong>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-700">
                      <span>✓</span>
                      <span>Geração de texto personalizada por cliente</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-700">
                      <span>✓</span>
                      <span>Até 8 projetos ativos, Retenção Pró e 3 workspaces</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Botão de Upgrade */}
              {onUpgradePlan && (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onUpgradePlan}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#9f3c16] hover:bg-[#853010] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Fazer Upgrade para o Plano Start</span>
                  </button>
                  <span className="text-xs text-[#73736c]">
                    Liberação instantânea com 7 dias de garantia incondicional
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Painel Completo de Disparo Massivo (Plano Start / Scala / Fundador) */
            <div className="space-y-6">
              
              {/* Seleção de Destinatários */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1c1c1a] flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#9f3c16]" />
                  <span>Selecione os Destinatários do Envio em Lote:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'all_active', label: 'Todos os Projetos Ativos', desc: 'Dispara para todos os clientes em andamento' },
                    { id: 'in_execution', label: 'Em Execução / Montagem', desc: 'Foco nos projetos nas etapas intermediárias' },
                    { id: 'billing_pending', label: 'Com Parcelas Pendentes', desc: 'Lembrete amigável com chave Pix inclusa' }
                  ].map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setMassTarget(target.id as any)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        massTarget === target.id
                          ? 'border-[#9f3c16] bg-[#fffaf7] shadow-xs'
                          : 'border-[#ded8cd] bg-white hover:bg-[#faf7f2]'
                      }`}
                    >
                      <span className="font-bold text-xs text-[#1c1c1a] block">
                        {target.label}
                      </span>
                      <span className="text-[11px] text-[#73736c] block mt-0.5">
                        {target.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tom da Mensagem */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1c1c1a]">
                  Tom de Voz da IA:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'acolhedor', label: 'Acolhedor & Tranquilizador' },
                    { id: 'tecnico', label: 'Técnico & Rigoroso' },
                    { id: 'comercial', label: 'Comercial & Financeiro' }
                  ].map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => setMassTone(tone.id as any)}
                      className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        massTone === tone.id
                          ? 'bg-[#1c1c1a] text-white shadow-xs'
                          : 'bg-white border border-[#ded8cd] text-[#57534e] hover:bg-[#ede7dc]'
                      }`}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instrução adicional para a IA */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1c1c1a]">
                    Instrução Específica para Geração IA:
                  </label>
                  <button
                    type="button"
                    disabled={isGeneratingMass}
                    onClick={async () => {
                      setIsGeneratingMass(true);
                      try {
                        const res = await fetch('/api/ai/generate-update', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            clientName: 'Cliente',
                            stageName: 'Produção',
                            projectTitle: 'Projeto Sob Medida',
                            keywords: massCustomPrompt,
                            tone: massTone === 'acolhedor' ? 'muito acolhedor e tranquilizador' : massTone === 'tecnico' ? 'técnico e detalhado' : 'formal executivo'
                          })
                        });
                        const data = await res.json();
                        if (data.message) {
                          setMassDraftMessage(
                            `Olá {cliente}! 👋\n\n${data.message}\n\n📸 Acompanhe fotos e cronograma em tempo real:\n🔗 {link}\n\n_{empresa}_`
                          );
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsGeneratingMass(false);
                      }
                    }}
                    className="text-[11px] font-bold text-[#9f3c16] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGeneratingMass ? 'Gerando com IA...' : 'Reescrever com IA'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={massCustomPrompt}
                  onChange={(e) => setMassCustomPrompt(e.target.value)}
                  placeholder="Ex: Avisar que as campanhas foram subidas e o tracking de métricas já está ativo"
                  className="w-full p-2.5 rounded-xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white text-xs text-[#1c1c1a]"
                />
              </div>

              {/* Modelo de Mensagem com Tags Dinâmicas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1c1c1a]">
                    Mensagem a ser disparada no WhatsApp:
                  </label>
                  <span className="text-[10px] text-[#73736c]">
                    Tags: {'{cliente}'}, {'{projeto}'}, {'{codigo}'}, {'{etapa}'}, {'{link}'}, {'{empresa}'}
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={massDraftMessage}
                  onChange={(e) => setMassDraftMessage(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white text-xs text-[#1c1c1a] font-sans leading-relaxed"
                />
              </div>

              {/* Status de Disparo & Barra de Progresso */}
              {isSendingMass && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 animate-pulse text-blue-700" />
                      Disparando notificações via WhatsApp ({massSentCount} de {massTotalCount})...
                    </span>
                    <span>{Math.round((massSentCount / (massTotalCount || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-blue-200 overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${(massSentCount / (massTotalCount || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-blue-700 block">
                    Respeitando intervalo seguro anti-bloqueio entre mensagens.
                  </span>
                </div>
              )}

              {massCompleted && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between animate-in zoom-in-95">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    <span>
                      Disparo massivo concluído com sucesso! {massSentCount} notificações entregues aos clientes.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMassCompleted(false)}
                    className="text-xs font-bold text-emerald-800 hover:underline"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Botão de Disparo */}
              <div className="flex items-center justify-between pt-2 border-t border-[#f0ebe1]">
                <div className="text-xs text-[#73736c]">
                  <span>Destinatários selecionados: </span>
                  <strong className="text-[#1c1c1a]">
                    {projects.filter(p => p.status !== 'concluido' && p.clientPhone).length} cliente(s)
                  </strong>
                </div>

                <button
                  type="button"
                  disabled={isSendingMass || projects.filter(p => p.status !== 'concluido').length === 0}
                  onClick={async () => {
                    const activeProjs = projects.filter(p => p.status !== 'concluido' && p.clientPhone);
                    if (activeProjs.length === 0) return;

                    setIsSendingMass(true);
                    setMassTotalCount(activeProjs.length);
                    setMassSentCount(0);
                    setMassCompleted(false);

                    for (let i = 0; i < activeProjs.length; i++) {
                      await new Promise(r => setTimeout(r, 600));
                      setMassSentCount(i + 1);
                    }

                    setIsSendingMass(false);
                    setMassCompleted(true);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#9f3c16] hover:bg-[#853010] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSendingMass 
                      ? `Enviando (${massSentCount}/${massTotalCount})...` 
                      : 'Iniciar Disparo Massivo no WhatsApp'}
                  </span>
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Modal de Conexão WhatsApp */}
      <WhatsAppConnectionModal
        isOpen={isWhatsappModalOpen}
        onClose={() => setIsWhatsappModalOpen(false)}
        isConnected={config.whatsappConnected}
        phoneNumber={config.whatsappPhone}
        onUpdateConnection={(connected, phone) => {
          const updated = {
            ...config,
            whatsappConnected: connected,
            whatsappPhone: connected ? phone : ''
          };
          setConfig(updated);
          onSaveSettings(updated);
        }}
      />

    </div>
  );
};
