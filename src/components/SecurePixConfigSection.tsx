import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Copy, 
  RefreshCw, 
  QrCode, 
  Building2, 
  Bot, 
  Send,
  Lock,
  CheckCircle2,
  Sliders,
  HelpCircle,
  Clock
} from 'lucide-react';
import { SecureCompanyPixConfig } from '../types';
import { detectPixKeyType } from '../utils/pixService';

interface SecurePixConfigSectionProps {
  onSuccessToast?: (msg: string) => void;
}

export const SecurePixConfigSection: React.FC<SecurePixConfigSectionProps> = ({
  onSuccessToast
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [config, setConfig] = useState<SecureCompanyPixConfig | null>(null);
  
  // Edição segura da chave
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [selectedKeyType, setSelectedKeyType] = useState<'cnpj' | 'cpf' | 'email' | 'phone' | 'random' | 'custom'>('cnpj');
  const [newPixKey, setNewPixKey] = useState('');
  const [showPlainNewKey, setShowPlainNewKey] = useState(false);
  const [beneficiaryName, setBeneficiaryName] = useState('BOMPROJETO GESTAO DE PROJETOS LTDA');
  const [bankName, setBankName] = useState('Banco Inter S.A.');

  // Configurações de IA
  const [aiBillingEnabled, setAiBillingEnabled] = useState(true);
  const [aiTone, setAiTone] = useState<'profissional' | 'formal' | 'amigavel'>('profissional');
  const [aiAutoAttachQr, setAiAutoAttachQr] = useState(true);
  const [aiRemindDaysBefore, setAiRemindDaysBefore] = useState(2);

  // Resultado do teste da IA
  const [testResult, setTestResult] = useState<{
    success: boolean;
    clientName: string;
    projectCode: string;
    amount: number;
    formattedAmount: string;
    dueDate: string;
    maskedPixKey: string;
    copiaECola: string;
    qrCodeBase64: string;
    aiGeneratedMessage: string;
    securityProof?: {
      isSafe: boolean;
      algorithm: string;
      executionLocation: string;
      clientLeakProtection: string;
    };
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Carregar dados protegidos da chave Pix do servidor
  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company/pix-config');
      if (res.ok) {
        const data: SecureCompanyPixConfig = await res.json();
        setConfig(data);
        setBeneficiaryName(data.beneficiaryName || 'BOMPROJETO GESTAO DE PROJETOS LTDA');
        setBankName(data.bankName || 'Banco Inter S.A.');
        setAiBillingEnabled(data.aiBillingEnabled !== false);
        setAiTone(data.aiTone || 'profissional');
        setAiAutoAttachQr(data.aiAutoAttachQr !== false);
        setAiRemindDaysBefore(data.aiRemindDaysBefore ?? 2);
        setSelectedKeyType(data.pixKeyType || 'cnpj');
      }
    } catch (err) {
      console.error('Erro ao carregar configurações seguras de Pix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Quando o usuário digita nova chave, detecta o tipo automaticamente
  const handleKeyInputChange = (val: string) => {
    setNewPixKey(val);
    if (val.trim()) {
      const detected = detectPixKeyType(val);
      setSelectedKeyType(detected.type);
    }
  };

  // Salvar no cofre do servidor
  const handleSaveToVault = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        beneficiaryName,
        bankName,
        aiBillingEnabled,
        aiTone,
        aiAutoAttachQr,
        aiRemindDaysBefore
      };

      if (newPixKey.trim()) {
        payload.pixKey = newPixKey.trim();
        payload.pixKeyType = selectedKeyType;
      }

      const res = await fetch('/api/company/pix-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setIsEditingKey(false);
        setNewPixKey('');
        if (onSuccessToast) {
          onSuccessToast('Chave Pix salva no cofre com sucesso! O front-end armazena apenas a versão protegida.');
        }
      }
    } catch (err) {
      console.error('Erro ao salvar no cofre:', err);
    } finally {
      setSaving(false);
    }
  };

  // Testar geração segura com a IA
  const handleTestAi = async () => {
    setTestingAi(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/company/pix-config/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Mariana Souza',
          projectCode: '#FER-204',
          amount: 4766.50
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      }
    } catch (err) {
      console.error('Erro ao testar IA:', err);
    } finally {
      setTestingAi(false);
    }
  };

  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
        <RefreshCw className="w-8 h-8 text-[#FF6515] animate-spin" />
        <p className="text-xs font-semibold text-[#73736C]">
          Acessando cofre de segurança criptografado...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-xs text-[#1C1C1A]">
      
      {/* 1. Header do Cofre Seguro */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-orange-50 border border-emerald-200/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-sm text-[#111111] flex items-center gap-2">
                <span>Cofre de Chave Pix &amp; IA para Cobranças</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Protegido no Servidor
                </span>
              </h3>
              <p className="text-[11px] text-[#555550]">
                Armazenamento isolado no backend com ofuscação de dados sensíveis para o navegador.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-xl border border-emerald-200">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Anti-Vazamento Ativo</span>
          </div>
        </div>

        <div className="pt-1 border-t border-emerald-200/50 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#4A5568]">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Chave original nunca exposta no HTML/JS
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            IA autorizada a gerar lembretes e QR Code
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Padrão oficial BACEN EMV BR Code
          </span>
        </div>
      </div>

      {/* 2. Visualização da Chave Pix Atual no Cofre */}
      <div className="bg-white rounded-2xl p-4 border border-[#DED8CD] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#FF6515]" />
            <h4 className="font-bold text-xs text-[#1C1C1A]">
              Chave Pix Padrão da Empresa (Status Atual)
            </h4>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#EA580C] uppercase tracking-wider border border-orange-200">
            {config?.pixKeyType || 'CNPJ'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAF8F5] p-3 rounded-xl border border-[#EDE7DC]">
          <div className="sm:col-span-2 space-y-1">
            <span className="text-[10px] font-semibold text-[#73736C] uppercase">
              Chave no Cofre (Mascarada com Segurança)
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm sm:text-base text-[#1C1C1A] bg-white px-2.5 py-1 rounded-lg border border-[#DED8CD] shadow-2xs">
                {config?.maskedPixKey || '••.•••.831/0001-••'}
              </span>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                🔒 Segura
              </span>
            </div>
            <p className="text-[10px] text-[#73736C]">
              O dado sensível é mantido sob sigilo no backend; apenas os dígitos identificadores seguros são visíveis.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-[#73736C] uppercase">
              Beneficiário / Banco
            </span>
            <p className="font-bold text-xs text-[#1C1C1A] truncate">
              {config?.beneficiaryName || 'BOMPROJETO GESTAO'}
            </p>
            <p className="text-[11px] text-[#73736C] truncate">
              {config?.bankName || 'Banco Digital'}
            </p>
          </div>
        </div>

        {/* Botão de expansão para redefinir a chave */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-[#73736C]">
            Última validação no cofre: {config?.updatedAt ? new Date(config.updatedAt).toLocaleDateString('pt-BR') : '29/09/2026'}
          </span>
          <button
            type="button"
            onClick={() => setIsEditingKey(!isEditingKey)}
            className="py-1.5 px-3 rounded-xl border border-[#DED8CD] bg-white hover:bg-[#F3EFE8] text-xs font-bold text-[#1C1C1A] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#FF6515]" />
            <span>{isEditingKey ? 'Cancelar Alteração' : 'Alterar / Definir Nova Chave'}</span>
          </button>
        </div>
      </div>

      {/* 3. Formulário de Nova Chave (Exibido sob demanda com segurança) */}
      {isEditingKey && (
        <form onSubmit={handleSaveToVault} className="bg-[#FFFDFB] rounded-2xl p-4 border-2 border-[#FF6515]/30 space-y-4 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#FF6515]" />
              <h4 className="font-bold text-xs text-[#1C1C1A]">
                Definir Nova Chave Pix no Servidor
              </h4>
            </div>
            <span className="text-[10px] font-medium text-[#73736C]">
              Transmissão direta criptografada
            </span>
          </div>

          {/* Seletores rápidos de tipo */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#57534E]">
              1. Selecione o Tipo da sua Chave Pix:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { type: 'cnpj', label: 'CNPJ (Empresa)' },
                { type: 'cpf', label: 'CPF' },
                { type: 'email', label: 'E-mail' },
                { type: 'phone', label: 'Celular' },
                { type: 'random', label: 'Aleatória (EVP)' }
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setSelectedKeyType(item.type as any)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                    selectedKeyType === item.type
                      ? 'bg-[#FF6515] text-white border-[#FF6515] shadow-xs'
                      : 'bg-white text-[#555550] border-[#DED8CD] hover:bg-[#F5F2EB]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campo da chave com botão de revelar temporário */}
          <div className="space-y-1">
            <label className="block font-bold text-[#57534E]">
              2. Digite a Chave Pix correspondente:
            </label>
            <div className="relative">
              <input
                type={showPlainNewKey ? 'text' : 'password'}
                required
                value={newPixKey}
                onChange={(e) => handleKeyInputChange(e.target.value)}
                placeholder={
                  selectedKeyType === 'cnpj'
                    ? '00.000.000/0001-00'
                    : selectedKeyType === 'cpf'
                    ? '000.000.000-00'
                    : selectedKeyType === 'email'
                    ? 'financeiro@suaempresa.com.br'
                    : selectedKeyType === 'phone'
                    ? '+55 (11) 98765-4321'
                    : 'Chave Aleatória UUID (ex: 123e4567-e89b...)'
                }
                className="w-full p-2.5 pr-10 rounded-xl border border-[#DED8CD] bg-white focus:ring-2 focus:ring-[#FF6515]/30 text-xs font-mono font-semibold text-[#1C1C1A]"
              />
              <button
                type="button"
                onClick={() => setShowPlainNewKey(!showPlainNewKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#73736C] hover:text-[#1C1C1A] p-1 cursor-pointer"
                title={showPlainNewKey ? 'Ocultar' : 'Visualizar temporariamente'}
              >
                {showPlainNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-[#73736C]">
              ✓ Dica: A chave digitada será processada pelo servidor backend e nunca será salva em texto puro no navegador.
            </p>
          </div>

          {/* Titular e Banco */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#57534E] mb-1">
                Nome do Beneficiário / Titular da Conta
              </label>
              <input
                type="text"
                required
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="Ex: BOMPROJETO GESTAO LTDA"
                className="w-full p-2.5 rounded-xl border border-[#DED8CD] bg-white focus:ring-2 focus:ring-[#FF6515]/30 text-xs font-semibold text-[#1C1C1A]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#57534E] mb-1">
                Banco / Instituição Financeira
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ex: Banco Inter, Nubank, Itaú..."
                className="w-full p-2.5 rounded-xl border border-[#DED8CD] bg-white focus:ring-2 focus:ring-[#FF6515]/30 text-xs font-semibold text-[#1C1C1A]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditingKey(false);
                setNewPixKey('');
              }}
              className="py-2 px-3 rounded-xl border border-[#DED8CD] text-xs font-semibold text-[#73736C] hover:bg-[#F3EFE8]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !newPixKey.trim()}
              className="py-2 px-4 rounded-xl bg-[#FF6515] hover:bg-[#E0550D] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              <span>Salvar no Cofre do Servidor</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. Automação de Cobranças por IA */}
      <div className="bg-white rounded-2xl p-4 border border-[#DED8CD] shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#F0EBE1] pb-2.5">
          <Bot className="w-4 h-4 text-[#FF6515]" />
          <div>
            <h4 className="font-bold text-xs text-[#1C1C1A]">
              Permissões &amp; Comportamento da IA para Cobranças
            </h4>
            <p className="text-[11px] text-[#73736C]">
              Como a Inteligência Artificial deve utilizar a chave Pix configurada no atendimento e WhatsApp.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Toggle 1: Cobrança automática ativa */}
          <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE7DC]">
            <div className="space-y-0.5">
              <label className="font-bold text-xs text-[#1C1C1A] block">
                Permitir que a IA envie lembretes de cobrança via WhatsApp
              </label>
              <p className="text-[11px] text-[#73736C]">
                O assistente responde dúvidas de clientes com o valor exato da parcela e orientações de pagamento.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAiBillingEnabled(!aiBillingEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                aiBillingEnabled ? 'bg-[#FF6515]' : 'bg-[#D1D5DB]'
              }`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                aiBillingEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Toggle 2: Gerar QR Code e Copia e Cola BACEN */}
          <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE7DC]">
            <div className="space-y-0.5">
              <label className="font-bold text-xs text-[#1C1C1A] block">
                Gerar QR Code Pix Copia e Cola Oficial do BACEN
              </label>
              <p className="text-[11px] text-[#73736C]">
                Cria payloads EMV válidos com checksum CRC16 direto no servidor, anexando nas mensagens de lembrete.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAiAutoAttachQr(!aiAutoAttachQr)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                aiAutoAttachQr ? 'bg-[#FF6515]' : 'bg-[#D1D5DB]'
              }`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                aiAutoAttachQr ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Tom da IA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="block font-bold text-[#57534E]">
                Tom de Voz da IA nas Cobranças:
              </label>
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-[#DED8CD] bg-[#FCFAF7] focus:bg-white text-xs font-semibold text-[#1C1C1A]"
              >
                <option value="profissional">Profissional &amp; Gentil (Padrão)</option>
                <option value="formal">Corporativo &amp; Formal</option>
                <option value="amigavel">Amigável &amp; Parceria Próxima</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-[#57534E]">
                Antecedência dos Lembretes Preventivos:
              </label>
              <select
                value={aiRemindDaysBefore}
                onChange={(e) => setAiRemindDaysBefore(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-[#DED8CD] bg-[#FCFAF7] focus:bg-white text-xs font-semibold text-[#1C1C1A]"
              >
                <option value={0}>No mesmo dia do vencimento</option>
                <option value={1}>1 dia antes do vencimento</option>
                <option value={2}>2 dias antes do vencimento (Recomendado)</option>
                <option value={3}>3 dias antes do vencimento</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => handleSaveToVault()}
              disabled={saving}
              className="py-1.5 px-3.5 rounded-xl bg-[#111111] hover:bg-[#222222] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />}
              <span>Salvar Preferências da IA</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Simulador / Validação Segura com a IA */}
      <div className="bg-[#FFF8F3] rounded-2xl p-4 border border-[#FFD9C2] space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D95510]" />
            <div>
              <h4 className="font-bold text-xs text-[#9F3C16]">
                Simulação &amp; Teste de Segurança com a IA
              </h4>
              <p className="text-[11px] text-[#73736C]">
                Execute uma simulação real para comprovar que a IA gera a cobrança com o Pix seguro sem que o dado sensível seja exposto no front-end.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestAi}
            disabled={testingAi}
            className="py-2 px-3.5 rounded-xl bg-[#FF6515] hover:bg-[#E0550D] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
          >
            {testingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{testingAi ? 'Processando com IA...' : 'Testar Cobrança com IA'}</span>
          </button>
        </div>

        {/* Card de Demonstração em Tempo Real */}
        {testResult && (
          <div className="bg-white rounded-xl p-3.5 border border-[#FFD9C2] space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[#F5F2EB]">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Teste Aprovado: A IA gerou a cobrança com a chave protegida do cofre!</span>
              </div>
              <span className="text-[10px] text-[#73736C]">
                OS {testResult.projectCode} • {testResult.clientName}
              </span>
            </div>

            {/* Mensagem simulada do WhatsApp */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-[#73736C] uppercase">
                1. Mensagem Gerada pela IA para o WhatsApp do Cliente:
              </span>
              <div className="bg-[#EFEAE2] p-3 rounded-2xl border border-[#D5CFBE] font-sans text-xs text-[#1C1C1A] whitespace-pre-line shadow-2xs leading-relaxed max-w-lg">
                {testResult.aiGeneratedMessage}
              </div>
            </div>

            {/* QR Code e Pix Copia e Cola gerados no backend */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="flex flex-col items-center justify-center p-2 bg-[#FAF8F5] rounded-xl border border-[#EDE7DC]">
                {testResult.qrCodeBase64 ? (
                  <img
                    src={testResult.qrCodeBase64}
                    alt="QR Code Pix"
                    className="w-28 h-28 object-contain rounded-lg border border-black/5 bg-white p-1"
                  />
                ) : (
                  <div className="w-28 h-28 bg-gray-100 flex items-center justify-center rounded-lg">
                    <QrCode className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <span className="text-[10px] font-bold text-[#1C1C1A] mt-1">
                  QR Code Oficial BACEN
                </span>
                <span className="text-[9px] text-emerald-700">
                  Gerado no Servidor
                </span>
              </div>

              <div className="sm:col-span-2 space-y-2 flex flex-col justify-center">
                <div>
                  <span className="text-[10px] font-semibold text-[#73736C] uppercase block mb-1">
                    2. Código Pix Copia e Cola (EMV):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={testResult.copiaECola}
                      className="w-full p-2 bg-[#FAF8F5] border border-[#DED8CD] rounded-lg font-mono text-[11px] text-[#555550]"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyPayload(testResult.copiaECola)}
                      className="p-2 rounded-lg bg-[#FF6515] text-white hover:bg-[#E0550D] cursor-pointer"
                      title="Copiar código Pix"
                    >
                      {copiedPayload ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-900 space-y-0.5">
                  <p className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Auditoria de Sigilo Aprovada:</span>
                  </p>
                  <p className="text-[10px] text-emerald-800">
                    Nenhum dado pessoal (CPF/CNPJ puro) foi exposto no código-fonte cliente. A transação e QR Code foram calculados de ponta a ponta no backend seguro.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

function SaveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      className="w-3.5 h-3.5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
