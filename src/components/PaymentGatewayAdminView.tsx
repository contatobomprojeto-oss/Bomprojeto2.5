import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  Zap, 
  Lock, 
  Clock, 
  Key, 
  Database,
  ArrowRight,
  Send
} from 'lucide-react';

interface GatewayStatus {
  env: 'sandbox' | 'production';
  isConfigured: boolean;
  publicKey: string;
  hasSecretKey: boolean;
  secretKeyPreview: string;
  hasWebhookSecret: boolean;
  webhookSecretPreview: string;
  webhookUrl: string;
}

interface PaymentOrder {
  id: string;
  paymentMethod: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  description: string;
  payerEmail: string;
  externalReference: string;
  planId?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  isSandbox: boolean;
  createdAt: string;
  approvedAt?: string;
}

export const PaymentGatewayAdminView: React.FC = () => {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Pix Test Generation
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [testPixResult, setTestPixResult] = useState<any | null>(null);
  const [isSimulatingApproval, setIsSimulatingApproval] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Homologation Checklist State (persisted in localStorage)
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('bomprojeto_homologation_checklist');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      pixGenerated: false,
      paymentApproved: false,
      statusChanged: false,
      notificationTriggered: false,
      productionKeysSet: false
    };
  });

  const updateChecklist = (key: string, value: boolean) => {
    const updated = { ...checklist, [key]: value };
    setChecklist(updated);
    try {
      localStorage.setItem('bomprojeto_homologation_checklist', JSON.stringify(updated));
    } catch {}
  };

  const fetchStatusAndOrders = async () => {
    try {
      setIsLoading(true);
      const [confRes, ordRes] = await Promise.all([
        fetch('/api/payment/config'),
        fetch('/api/payment/orders')
      ]);

      if (confRes.ok) {
        const confData = await confRes.json();
        setGatewayStatus(confData);
      }
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData.orders || []);
      }
    } catch (err) {
      console.error('Error fetching payment gateway data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndOrders();
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Gera Pix de teste em Sandbox (R$ 1,00)
  const handleGenerateTestPix = async () => {
    setIsGeneratingPix(true);
    setTestPixResult(null);
    try {
      const res = await fetch('/api/payment/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 1.00,
          description: 'Teste Simbólico de Homologação Sandbox (R$ 1,00)',
          payer: {
            email: 'homologacao@bomprojeto.com',
            name: 'Marcenaria Homologação Teste',
            cpfCnpj: '48.912.831/0001-90'
          },
          planId: 'start',
          expirationMinutes: 30
        })
      });

      const data = await res.json();
      if (res.ok) {
        setTestPixResult(data);
        updateChecklist('pixGenerated', true);
        setActionNotice('QR Code Pix de teste gerado com sucesso!');
        await fetchStatusAndOrders();
      } else {
        setActionNotice(`Erro: ${data.error || 'Falha ao gerar Pix'}`);
      }
    } catch (err: any) {
      setActionNotice(`Erro: ${err.message}`);
    } finally {
      setIsGeneratingPix(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  // 2. Simula aprovação imediata do pagamento (Simulador de Webhook)
  const handleSimulateApproval = async (paymentId: string) => {
    setIsSimulatingApproval(true);
    try {
      const res = await fetch(`/api/payment/${paymentId}/simulate-approval`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        updateChecklist('paymentApproved', true);
        updateChecklist('statusChanged', true);
        updateChecklist('notificationTriggered', true);
        setActionNotice(`Pagamento #${paymentId} APROVADO! Assinatura ativada no banco de dados.`);
        await fetchStatusAndOrders();
        if (testPixResult && testPixResult.paymentId === paymentId) {
          setTestPixResult({ ...testPixResult, status: 'approved' });
        }
      } else {
        setActionNotice(`Falha: ${data.message}`);
      }
    } catch (err: any) {
      setActionNotice(`Erro: ${err.message}`);
    } finally {
      setIsSimulatingApproval(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const completedChecksCount = Object.values(checklist).filter(Boolean).length;
  const fullWebhookUrl = `${window.location.origin}/api/webhooks/payment`;

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E8EAED] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💳</span>
            <h2 className="text-lg font-bold text-[#202124]">Gestão & Homologação de Gateway de Pagamento</h2>
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              gatewayStatus?.env === 'production' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {gatewayStatus?.env === 'production' ? 'PRODUÇÃO' : 'SANDBOX / TESTE'}
            </div>
          </div>
          <p className="text-xs text-[#5F6368] mt-1">
            Armazenamento seguro de credenciais via variáveis de ambiente, Pix em tempo real, validação de assinatura de webhooks e esteira de homologação.
          </p>
        </div>

        <button
          onClick={fetchStatusAndOrders}
          className="px-3.5 py-1.5 bg-white border border-[#E8EAED] hover:bg-zinc-50 text-xs font-semibold text-[#202124] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#5F6368] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Recarregar</span>
        </button>
      </div>

      {/* Grid: Credenciais Seguras & Webhook URL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Card 1: Armazenamento Seguro de Credenciais */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAED] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8EAED] pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-[#202124]">Credenciais do Servidor (.env)</h3>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Protegido no Backend
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Env */}
            <div className="flex items-center justify-between p-2.5 bg-[#F8F9FA] rounded-xl border border-[#E8EAED]">
              <span className="text-[#5F6368] font-mono">PAYMENT_GATEWAY_ENV</span>
              <span className="font-bold text-[#202124] uppercase font-mono">{gatewayStatus?.env || 'sandbox'}</span>
            </div>

            {/* Public Key */}
            <div className="flex items-center justify-between p-2.5 bg-[#F8F9FA] rounded-xl border border-[#E8EAED]">
              <div>
                <span className="text-[#5F6368] font-mono block">PAYMENT_PUBLIC_KEY (Front-end)</span>
                <span className="font-mono text-zinc-700 text-[11px]">{gatewayStatus?.publicKey || 'pk_test_... (Opcional)'}</span>
              </div>
              <span className="text-[10px] text-zinc-500 bg-white border border-[#E8EAED] px-2 py-0.5 rounded-md font-semibold">Pública</span>
            </div>

            {/* Secret Key */}
            <div className="flex items-center justify-between p-2.5 bg-[#F8F9FA] rounded-xl border border-[#E8EAED]">
              <div>
                <span className="text-[#5F6368] font-mono block">PAYMENT_SECRET_KEY (Back-end)</span>
                <span className="font-mono text-emerald-700 font-bold text-[11px]">{gatewayStatus?.secretKeyPreview}</span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">Exclusivo Servidor</span>
            </div>

            {/* Webhook Secret */}
            <div className="flex items-center justify-between p-2.5 bg-[#F8F9FA] rounded-xl border border-[#E8EAED]">
              <div>
                <span className="text-[#5F6368] font-mono block">PAYMENT_WEBHOOK_SECRET (HMAC-SHA256)</span>
                <span className="font-mono text-purple-700 font-bold text-[11px]">{gatewayStatus?.webhookSecretPreview}</span>
              </div>
              <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-semibold">Assinatura Segura</span>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] text-[#5F6368] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Regra de Ouro Implementada:</strong> Chaves secretas nunca são enviadas ao navegador. O frontend utiliza apenas tokens de sessão e requisições autenticadas pelo proxy do backend.
            </span>
          </div>
        </div>

        {/* Card 2: URL de Webhook para o Gateway */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAED] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8EAED] pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#EA580C]" />
              <h3 className="text-sm font-bold text-[#202124]">Configuração de Webhook no Gateway</h3>
            </div>
            <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">
              Ativação Automática
            </span>
          </div>

          <p className="text-xs text-[#5F6368] leading-relaxed">
            Cadastre esta URL no painel do seu gateway (Mercado Pago, Asaas, Efí) em <strong>Webhooks / Notificações</strong> para liberação instantânea de pedidos assim que o pagamento for aprovado:
          </p>

          <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E8EAED] space-y-2">
            <span className="text-[11px] font-semibold text-[#5F6368] block">URL Oficial de Webhook:</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullWebhookUrl}
                className="w-full px-3 py-1.5 bg-white border border-[#E8EAED] text-xs font-mono text-[#202124] rounded-lg select-all"
              />
              <button
                onClick={() => handleCopy(fullWebhookUrl, 'webhookUrl')}
                className="px-3 py-1.5 bg-[#202124] hover:bg-black text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedKey === 'webhookUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'webhookUrl' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-[#5F6368]">
            <span className="font-bold text-[#202124] block">Eventos Monitorados Pelo Servidor:</span>
            <ul className="space-y-1 text-[11px]">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span><code>payment.created</code> / <code>charge.pending</code> (Cobrança gerada com QR Code)</span>
              </li>
              <li className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span><code>payment.approved</code> / <code>charge.paid</code> (Libera o plano ou parcela na hora)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span><code>payment.failed</code> / <code>charge.refunded</code> (Atualiza para inadimplente)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Checklist de Homologação (Sandbox antes de Produção) */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8EAED] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8EAED] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-[#202124]">Checklist de Homologação (Sandbox antes de Produção)</h3>
            </div>
            <p className="text-xs text-[#5F6368] mt-0.5">
              Valide todas as etapas do fluxo de pagamento antes de virar a chave para produção real.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#5F6368]">Progresso:</span>
            <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-mono">
              {completedChecksCount} / 5 Concluídos ({Math.round((completedChecksCount / 5) * 100)}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Check 1 */}
          <label className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors cursor-pointer ${
            checklist.pixGenerated ? 'bg-emerald-50/50 border-emerald-300' : 'bg-zinc-50 border-[#E8EAED] hover:bg-zinc-100'
          }`}>
            <input
              type="checkbox"
              checked={checklist.pixGenerated}
              onChange={(e) => updateChecklist('pixGenerated', e.target.checked)}
              className="mt-0.5 rounded text-[#EA580C] focus:ring-[#EA580C] w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="font-bold text-[#202124] block">1. Testar geração de QR Code Pix com valor simbólico em sandbox</span>
              <span className="text-[11px] text-[#5F6368] mt-0.5 block">
                Valida a criação do payload EMV Copia e Cola e a renderização em Base64 na tela.
              </span>
            </div>
          </label>

          {/* Check 2 */}
          <label className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors cursor-pointer ${
            checklist.paymentApproved ? 'bg-emerald-50/50 border-emerald-300' : 'bg-zinc-50 border-[#E8EAED] hover:bg-zinc-100'
          }`}>
            <input
              type="checkbox"
              checked={checklist.paymentApproved}
              onChange={(e) => updateChecklist('paymentApproved', e.target.checked)}
              className="mt-0.5 rounded text-[#EA580C] focus:ring-[#EA580C] w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="font-bold text-[#202124] block">2. Simular pagamento aprovado no ambiente de testes</span>
              <span className="text-[11px] text-[#5F6368] mt-0.5 block">
                Testa a recepção do evento payment.approved e a validação criptográfica da assinatura.
              </span>
            </div>
          </label>

          {/* Check 3 */}
          <label className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors cursor-pointer ${
            checklist.statusChanged ? 'bg-emerald-50/50 border-emerald-300' : 'bg-zinc-50 border-[#E8EAED] hover:bg-zinc-100'
          }`}>
            <input
              type="checkbox"
              checked={checklist.statusChanged}
              onChange={(e) => updateChecklist('statusChanged', e.target.checked)}
              className="mt-0.5 rounded text-[#EA580C] focus:ring-[#EA580C] w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="font-bold text-[#202124] block">3. Confirmar se o status do pedido mudou no banco de dados para pago</span>
              <span className="text-[11px] text-[#5F6368] mt-0.5 block">
                Garante que a assinatura ou parcela teve seu status gravado como 'active' ou 'paid'.
              </span>
            </div>
          </label>

          {/* Check 4 */}
          <label className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors cursor-pointer ${
            checklist.notificationTriggered ? 'bg-emerald-50/50 border-emerald-300' : 'bg-zinc-50 border-[#E8EAED] hover:bg-zinc-100'
          }`}>
            <input
              type="checkbox"
              checked={checklist.notificationTriggered}
              onChange={(e) => updateChecklist('notificationTriggered', e.target.checked)}
              className="mt-0.5 rounded text-[#EA580C] focus:ring-[#EA580C] w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="font-bold text-[#202124] block">4. Verificar disparos de notificação automática após o webhook</span>
              <span className="text-[11px] text-[#5F6368] mt-0.5 block">
                Confirma se o comprovante ou boletim foi enfileirado na fila resiliente sem duplicação.
              </span>
            </div>
          </label>

          {/* Check 5 */}
          <label className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors cursor-pointer md:col-span-2 ${
            checklist.productionKeysSet ? 'bg-emerald-50/50 border-emerald-300' : 'bg-zinc-50 border-[#E8EAED] hover:bg-zinc-100'
          }`}>
            <input
              type="checkbox"
              checked={checklist.productionKeysSet}
              onChange={(e) => updateChecklist('productionKeysSet', e.target.checked)}
              className="mt-0.5 rounded text-[#EA580C] focus:ring-[#EA580C] w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="font-bold text-[#202124] block">5. Substituir as chaves de teste (pk_test_..., sk_test_...) pelas de produção (pk_live_..., sk_live_...)</span>
              <span className="text-[11px] text-[#5F6368] mt-0.5 block">
                Virada de chave no arquivo .env ou no painel de Cloud/Deploy após aprovação dos testes.
              </span>
            </div>
          </label>
        </div>

        {/* Botão de Ação Rápida de Teste */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8EAED]">
          <span className="text-xs text-[#5F6368]">
            Deseja rodar a homologação agora? Gere um Pix simbólico de R$ 1,00 para testar o fluxo ponta a ponta.
          </span>
          <button
            onClick={handleGenerateTestPix}
            disabled={isGeneratingPix}
            className="px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>{isGeneratingPix ? 'Gerando Pix...' : 'Gerar Pix Simbólico de Teste (R$ 1,00)'}</span>
          </button>
        </div>
      </div>

      {/* Visualizador do Pix Gerado no Teste (Se houver) */}
      {testPixResult && (
        <div className="bg-[#FAF8F5] border border-[#E8E2D5] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-sm font-bold text-[#111111]">Ordem Pix de Homologação Criada (#{testPixResult.paymentId})</h3>
            </div>
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
              testPixResult.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              Status: {testPixResult.status === 'approved' ? 'PAGO / APROVADO' : 'PENDENTE'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Imagem do QR Code */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-[#E8E2D5]">
              {testPixResult.qrCodeBase64 ? (
                <img 
                  src={testPixResult.qrCodeBase64} 
                  alt="QR Code Pix" 
                  className="w-48 h-48 rounded-lg shadow-xs" 
                />
              ) : (
                <div className="w-48 h-48 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400">
                  QR Code
                </div>
              )}
              <span className="text-[11px] text-[#7A7A75] mt-2 font-mono">Valor: R$ {testPixResult.amount.toFixed(2)}</span>
            </div>

            {/* Dados e Copia e Cola */}
            <div className="md:col-span-8 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Pix Copia e Cola (EMV Oficial):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={testPixResult.qrCode}
                    className="w-full px-3 py-2 bg-white border border-[#D5CFC5] text-xs font-mono text-[#111111] rounded-xl select-all"
                  />
                  <button
                    onClick={() => handleCopy(testPixResult.qrCode, 'pixCopiaCola')}
                    className="px-3.5 py-2 bg-[#111111] hover:bg-black text-white text-xs font-semibold rounded-xl shrink-0 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedKey === 'pixCopiaCola' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey === 'pixCopiaCola' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E8E2D5] text-xs space-y-1 text-[#52524e]">
                <div className="flex justify-between">
                  <span>ID do Pedido:</span>
                  <span className="font-mono font-bold text-[#111111]">{testPixResult.paymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Referência Externa:</span>
                  <span className="font-mono text-[#111111]">{testPixResult.externalReference}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expira em:</span>
                  <span className="text-[#111111]">{new Date(testPixResult.expiresAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {testPixResult.status !== 'approved' && (
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => handleSimulateApproval(testPixResult.paymentId)}
                    disabled={isSimulatingApproval}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSimulatingApproval ? 'Simulando Aprovação...' : 'Simular Pagamento Aprovado (Webhook)'}</span>
                  </button>
                  <span className="text-[11px] text-[#7A7A75]">
                    Simula o envio da notificação do gateway e libera o acesso imediatamente.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Histórico Recente de Pedidos de Pagamento */}
      <div className="bg-white rounded-2xl border border-[#E8EAED] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E8EAED] flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#5F6368]" />
            <h3 className="text-sm font-bold text-[#202124]">Ordens de Pagamento Recentes ({orders.length})</h3>
          </div>
          <span className="text-xs text-[#5F6368]">Atualizado em tempo real</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] text-[#5F6368] font-semibold border-b border-[#E8EAED]">
              <tr>
                <th className="px-4 py-3">ID / Ref</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Pagador</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data/Hora</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAED]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#5F6368]">
                    Nenhum pedido de pagamento registrado ainda. Gere um Pix de teste acima.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-[#202124] font-semibold">
                      {ord.id.slice(0, 18)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className="uppercase font-semibold text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded">
                        {ord.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#202124]">
                      R$ {ord.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-[#5F6368] truncate max-w-[160px]">
                      {ord.payerEmail}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ord.status === 'approved' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {ord.status === 'approved' ? 'Aprovado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5F6368] text-[11px]">
                      {new Date(ord.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ord.status !== 'approved' && (
                        <button
                          onClick={() => handleSimulateApproval(ord.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded-lg cursor-pointer transition-colors"
                        >
                          Aprovar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
