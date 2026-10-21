import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Printer,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  HelpCircle,
  PhoneCall,
  MessageSquare,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Eye,
  FileDown
} from 'lucide-react';
import { BrandLogo, BrandMark } from './BrandLogo';

interface SalesBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SalesBriefingModal: React.FC<SalesBriefingModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<string>('visao');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carrega e pré-gera o Blob do PDF para abertura e download sem falha de rede/iframe
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingPdf(true);
    setErrorMsg(null);

    fetch('/api/briefing-base64')
      .then(res => {
        if (!res.ok) throw new Error('Não foi possível obter o PDF do servidor');
        return res.json();
      })
      .then(data => {
        if (!isMounted) return;
        if (data.base64) {
          const byteCharacters = atob(data.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
        }
        setIsLoadingPdf(false);
      })
      .catch(err => {
        console.warn('Fallback para download direto do PDF:', err);
        if (isMounted) {
          setPdfBlobUrl('/public/dossie-comercial-bomprojeto.pdf');
          setIsLoadingPdf(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setErrorMsg(null);
    try {
      if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = pdfBlobUrl;
        link.download = 'Dossie-Comercial-Briefing-BomProjeto.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const res = await fetch('/api/briefing-download');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Dossie-Comercial-Briefing-BomProjeto.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 15000);
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (e: any) {
      console.error('Erro ao baixar PDF:', e);
      // Fallback via redirecionamento de link direto
      window.location.href = '/api/briefing-download';
    }
  };

  const handleOpenPdfInNewTab = () => {
    if (pdfBlobUrl) {
      const opened = window.open(pdfBlobUrl, '_blank');
      if (!opened) {
        // Bloqueador de popup do navegador ativo: força download
        handleDownloadPdf();
      }
    } else {
      window.open('/api/briefing-pdf', '_blank');
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const tabs = [
    { id: 'visao', label: '1. Visão do Produto', icon: Sparkles },
    { id: 'dores', label: '2. Dores do Cliente', icon: AlertCircle },
    { id: 'solucoes', label: '3. Soluções & Módulos', icon: ShieldCheck },
    { id: 'antes-depois', label: '4. Antes vs Depois & ROI', icon: TrendingUp },
    { id: 'planos', label: '5. Planos & Preços', icon: DollarSign },
    { id: 'objecoes', label: '6. Quebra de Objeções', icon: HelpCircle },
    { id: 'scripts', label: '7. Scripts de Vendas', icon: MessageSquare },
    { id: 'checklist', label: '8. Checklist do Vendedor', icon: CheckCircle2 },
    { id: 'viewer-pdf', label: 'Visualizador do PDF (9 págs)', icon: Eye, highlight: true }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* TOPO DO MODAL */}
        <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/30 text-orange-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Dossiê Comercial & Briefing de Vendas Oficial
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">
                  Edição 3.5 • PDF Oficial
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Material completo de treinamento para vendedor estudar e dominar o BomProjeto
              </p>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO RÁPIDA (DOWNLOAD, ABRIR, IMPRIMIR) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-sm active:scale-95"
              title="Baixar arquivo PDF completo (62 KB, 9 páginas)"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Baixado com Sucesso!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF Oficial</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenPdfInNewTab}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
              title="Abrir o PDF em nova guia do navegador"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir em Nova Aba</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
              title="Imprimir ou Salvar em PDF pelo navegador"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BARRA DE NAVEGAÇÃO DE ABAS */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-4 flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-sm'
                    : tab.highlight
                    ? 'bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 border border-orange-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CORPO DO CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-slate-900/60">

          {/* ABA 1: VISÃO DO PRODUTO */}
          {activeTab === 'visao' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Card de Capa */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-3 mb-4">
                  <BrandMark size={32} />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      BomProjeto SaaS
                    </h1>
                    <p className="text-xs text-orange-400 font-semibold tracking-wider uppercase">
                      Sistema de Acompanhamento Visual & Cobrança Pix
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-5">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">
                    A Proposta Única de Valor (A Promessa que Vende):
                  </p>
                  <p className="text-base sm:text-lg font-bold text-white italic">
                    "Nós atendemos, respondemos e cobramos o seu cliente no WhatsApp. Você só executa e recebe."
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-850 bg-slate-900/90 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Público-Alvo Primário:</span>
                    <strong className="text-slate-200">Marcenarias, Vidraçarias, Marmorarias, Serralherias e Reformas</strong>
                  </div>
                  <div className="p-3 bg-slate-850 bg-slate-900/90 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Modelo de Negócio:</span>
                    <strong className="text-slate-200">SaaS B2B Verticalizado (Assinatura Recorrente)</strong>
                  </div>
                  <div className="p-3 bg-slate-850 bg-slate-900/90 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Canais Oficiais:</span>
                    <strong className="text-slate-200">WhatsApp via QR Code + Pix Copia e Cola</strong>
                  </div>
                </div>
              </div>

              {/* O que é o BomProjeto */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  O Que É o BomProjeto (Visão Geral & Posicionamento)
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  O BomProjeto é um software desenvolvido especialmente para Agências de Marketing Digital, Consultorias de Automação/IA e Gestores de Tráfego autônomos. 
                  Diferente de gerenciadores genéricos de tarefas ou ERPs contábeis complexos que criam burocracia, 
                  o BomProjeto ataca o <strong>elo mais frágil e estressante de toda a operação digital</strong>: 
                  a retenção do cliente (combate direto ao churn), o alinhamento de expectativas em tempo real e a cobrança sem atrito das mensalidades e setups.
                </p>
              </div>

              {/* Os 4 Pilares */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">Os 4 Pilares da Solução BomProjeto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-400 rounded-md uppercase">Pilar 1</span>
                    <h4 className="text-sm font-bold text-white mt-2 mb-1">Portal do Cliente sem Senha</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Link exclusivo e criptografado estilo Apple/Fleetly. O cliente não precisa baixar aplicativo nem criar senha. Abre direto no WhatsApp com status das sprints, aprovação de peças e chave Pix.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-400 rounded-md uppercase">Pilar 2</span>
                    <h4 className="text-sm font-bold text-white mt-2 mb-1">Linha do Tempo Visual & Entregáveis</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      A agência sobe criativos, copys, fluxogramas de IA e links de dashboards. O cliente acompanha em tempo real, gerando encantamento imediato e percepção de entrega constante.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-400 rounded-md uppercase">Pilar 3</span>
                    <h4 className="text-sm font-bold text-white mt-2 mb-1">Cobrança Automática Pix Copia e Cola</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Lembretes amigáveis programados (D-3, vencimento e D+3) com QR Code oficial e botão que copia a chave Pix. O cliente clica, cola no banco e paga o fee mensal ou setup sem atritos.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-400 rounded-md uppercase">Pilar 4</span>
                    <h4 className="text-sm font-bold text-white mt-2 mb-1">IA de Retenção Pro & Tom de Voz</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Inteligência preditiva via Gemini AI que analisa prazos e áudios do WhatsApp para detectar clientes descontentes antes de cancelarem, sugerindo respostas prontas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: DORES DO CLIENTE */}
          {activeTab === 'dores' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Instrução para o Vendedor: Toque na Ferida Real da Agência / Gestor
                </h3>
                <p className="text-xs text-slate-300">
                  O dono de agência ou gestor de tráfego não compra "recursos de tecnologia". Ele compra o fim do churn acelerado, o fim das mensagens cobrando relatórios no domingo e o recebimento pontual do fee mensal.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    num: '1',
                    titulo: 'Paralisia por Interrupção no WhatsApp',
                    descricao: 'O gestor está focado no Ads Manager otimizando campanhas ou integrando webhooks no Make/n8n. O celular vibra a cada 10 minutos com clientes perguntando "Como estão meus anúncios?", "Já subiu as campanhas?". Cada interrupção quebra o raciocínio analítico. No fim do dia, as contas não escalaram e ele está exausto.',
                    solucao: 'O BomProjeto dá o link do portal sem senha. O cliente abre no WhatsApp e vê o andamento da sprint e entregáveis sozinho.'
                  },
                  {
                    num: '2',
                    titulo: 'O Cliente Ansioso que Acha que a Agência Não Trabalha',
                    descricao: 'No mercado digital, o cliente não enxerga o trabalho invisível de tracking, testes A/B e parametrização. Três dias sem novidades fazem o cliente achar que a agência sumiu, gerando risco imediato de cancelamento (churn).',
                    solucao: 'Entregáveis visuais, histórico de marcos e prévias de criativos no portal provam a entrega contínua e blindam o contrato.'
                  },
                  {
                    num: '3',
                    titulo: 'A "Vergonha de Cobrar" o Fee Mensal ou Setup',
                    descricao: 'O gestor entrega a sprint de automação ou fecha o mês de tráfego, fica sem jeito de cobrar, o cliente fala "semana que vem o financeiro roda" e demora semanas. A agência sofre para pagar sua equipe e ferramentas.',
                    solucao: 'O sistema cobra formalmente no WhatsApp com Pix Copia e Cola. O gestor não se desgasta porque é a plataforma executando o faturamento.'
                  },
                  {
                    num: '4',
                    titulo: 'O "Disse-Me-Disse" de Alterações de Criativos e Escopo',
                    descricao: 'Aprovações combinadas por áudios soltos ou prints no WhatsApp viram discussão infinita sobre refações de artes e textos. Sem validação formal, o cliente exige alterações além do contratado sem pagar a mais.',
                    solucao: 'Histórico de criativos validados, marcos carimbados e aceite digital registrado em PDF oficial.'
                  },
                  {
                    num: '5',
                    titulo: 'Falta de Governança ao Escalar Contas e Equipe',
                    descricao: 'Quando a agência contrata o segundo ou terceiro gestor de tráfego/designer, o dono perde a visibilidade de quais clientes estão com entregas atrasadas ou insatisfeitos.',
                    solucao: 'Painel multi-workspace e multi-equipe (Modo Time) com permissões blindadas por conta e filial.'
                  }
                ].map(dor => (
                  <div key={dor.num} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center">
                        {dor.num}
                      </span>
                      <h4 className="text-sm font-bold text-white">{dor.titulo}</h4>
                    </div>
                    <p className="text-xs text-slate-300 pl-8 leading-relaxed">
                      {dor.descricao}
                    </p>
                    <div className="mt-2 pl-8 pt-2 border-t border-slate-900 flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span><strong>Como o BomProjeto resolve:</strong> {dor.solucao}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3: SOLUÇÕES & MÓDULOS */}
          {activeTab === 'solucoes' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {[
                {
                  modulo: 'Módulo A: Portal do Cliente sem Senha',
                  destaque: 'Design Premium Fleetly (#0F172A e #F97316)',
                  tecnica: 'Link PWA responsivo com hash criptografado. Não exige login nem aplicativo da Play Store/App Store.',
                  comercial: 'O cliente sente que contratou uma agência de ponta nível unicórnio. Aumenta a percepção de valor dos serviços e o LTV em mais de 40%.'
                },
                {
                  modulo: 'Módulo B: Cobrança Programada com Pix Copia e Cola',
                  destaque: 'Padrão Oficial Banco Central do Brasil (EMVCo + CRC16)',
                  tecnica: 'Gera QR Code oficial e código alfanumérico para colar no app bancário. Disparos nos marcos de sprint e fee mensal.',
                  comercial: 'Fim do atraso de pagamento de mensalidades e setups. O cliente clica, copia e paga na hora no Nubank, Itaú ou Bradesco.'
                },
                {
                  modulo: 'Módulo C: Conexão WhatsApp Direta (Linha Própria)',
                  destaque: 'Pareamento em 60 segundos via QR Code',
                  tecnica: 'Conecta o número oficial da agência ou consultoria sem custos adicionais de intermediários caros.',
                  comercial: 'As mensagens saem com a foto e o nome oficial da agência, transmitindo 100% de autoridade e segurança.'
                },
                {
                  modulo: 'Módulo D: Retenção Pro & Análise de Tom de Voz',
                  destaque: 'Alimentado por Gemini AI Preditivo',
                  tecnica: 'Avalia cruzamento de atraso de cronograma, pagamentos e teor das mensagens para atribuir score de risco de churn (Verde, Amarelo, Vermelho).',
                  comercial: 'Alerta o gestor antes do cliente cancelar a conta, entregando respostas inteligentes com 1 clique.'
                },
                {
                  modulo: 'Módulo E: Termo de Entrega & Aceite de Sprints em PDF',
                  destaque: 'Documento de Validação com Aprovação Formal',
                  tecnica: 'Gera laudo final de entregáveis (Pixel, tracking, criativos, automações) com histórico e aceite do cliente.',
                  comercial: 'Blinda a agência contra discussões de escopo e pedidos infinitos de refação sem cobrança adicional.'
                }
              ].map((m, idx) => (
                <div key={idx} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white">{m.modulo}</h4>
                    <span className="text-[11px] font-semibold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
                      {m.destaque}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-850">
                      <span className="text-slate-400 block font-medium mb-1">Como Funciona:</span>
                      <p className="text-slate-300">{m.tecnica}</p>
                    </div>
                    <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-900/30">
                      <span className="text-emerald-400 block font-medium mb-1">Argumento de Venda:</span>
                      <p className="text-slate-200">{m.comercial}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ABA 4: ANTES VS DEPOIS & ROI */}
          {activeTab === 'antes-depois' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-4 bg-slate-900 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">
                    Tabela Comparativa de Transformação Operacional
                  </h3>
                  <p className="text-xs text-slate-400">
                    Use essa comparação direta para fazer o cliente enxergar a diferença na rotina dele
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3">Situação</th>
                        <th className="p-3 text-rose-400">Sem o BomProjeto (Caos)</th>
                        <th className="p-3 text-emerald-400">Com o BomProjeto (Paz & Lucro)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {[
                        ['Comunicação', 'Cliente manda 15 mensagens cobrando relatórios e criativos toda semana.', 'Cliente clica no link e vê sprints, criativos e métricas atualizadas.'],
                        ['Cobrança', 'Gestor com vergonha de cobrar; cliente atrasa semanas para pagar o fee.', 'Cobrança profissional automática de mensalidades com Pix Copia e Cola.'],
                        ['Prazos', 'Campanhas atrasando sem o cliente saber o motivo ou o trabalho de bastidor.', 'Linha do tempo transparente; respeito total ao cronograma e entregas.'],
                        ['Imagem da Marca', 'Sensação de freelancer desorganizado e amador.', 'Sensação de agência de alto padrão com tecnologia de ponta.'],
                        ['Tempo do Gestor', '3 a 4 horas por dia respondendo mensagens repetitivas.', 'Gestor focado em otimizar campanhas e fechar novos clientes.'],
                        ['Segurança de Escopo', 'Refações infinitas combinadas em áudios soltos.', 'Aprovações registradas com aceite digital e histórico formal.']
                      ].map(([sit, antes, depois], i) => (
                        <tr key={i} className="hover:bg-slate-900/40">
                          <td className="p-3 font-semibold text-slate-200">{sit}</td>
                          <td className="p-3 text-rose-300">{antes}</td>
                          <td className="p-3 text-emerald-300 font-medium">{depois}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cálculo do ROI */}
              <div className="p-5 bg-gradient-to-r from-emerald-950/40 to-slate-950 rounded-2xl border border-emerald-500/30 space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  O Retorno Sobre o Investimento (O Argumento Matador de ROI):
                </span>
                <p className="text-sm text-slate-200 leading-relaxed">
                  Um contrato médio de gestão de tráfego pago ou projeto de automação varia entre <strong>R$ 2.000 e R$ 15.000 por mês</strong>. 
                  O churn precoce de um único cliente de R$ 2.500 desregula todo o faturamento da agência.
                </p>
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 font-semibold">
                  O BomProjeto custa R$ 197,93 por mês (Plano Start) — isso dá menos de <strong>R$ 6,60 por dia</strong>. 
                  Reter um único cliente que cancelaria por falta de comunicação já paga mais de 1 ano inteiro do sistema!
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: PLANOS & PREÇOS */}
          {activeTab === 'planos' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* START */}
                <div className="bg-slate-950 p-6 rounded-2xl border-2 border-orange-500/80 relative space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded uppercase tracking-wider">
                        Mais Vendido
                      </span>
                      <span className="text-xs text-slate-400">Para Agências e Gestores em Expansão</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Plano Start</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white">R$ 197,93</span>
                      <span className="text-xs text-slate-400">/ mês</span>
                    </div>
                    <p className="text-xs text-emerald-400 font-medium mt-1">
                      Ou R$ 161,94/mês no plano anual (18% de economia)
                    </p>

                    <div className="mt-5 space-y-2.5 text-xs text-slate-300">
                      {[
                        'Até 8 Projetos Ativos simultâneos',
                        'Retenção Pró — Até 8 Projetos monitorados',
                        'Até 3 Workspaces / Filiais',
                        'Até 3 Membros de Equipe (Modo Time)',
                        'Conexão WhatsApp via QR Code',
                        'Cobrança Automática Pix (D-3, D-0, D+3)',
                        'Portal do Cliente sem senha',
                        'Fotos e linha do tempo ilimitadas',
                        'Termo de Garantia e Entrega em PDF',
                        'Suporte comercial via WhatsApp'
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                    Perfeito para agências e media buyers com até 8 contas/projetos simultâneos por mês.
                  </div>
                </div>

                {/* SCALA */}
                <div className="bg-gradient-to-b from-slate-950 to-slate-900 p-6 rounded-2xl border border-slate-700 relative space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 rounded uppercase tracking-wider border border-purple-500/30">
                        Até 20 Projetos
                      </span>
                      <span className="text-xs text-slate-400">Para Grandes Operações</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Plano Scala</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white">R$ 397,97</span>
                      <span className="text-xs text-slate-400">/ mês</span>
                    </div>
                    <p className="text-xs text-emerald-400 font-medium mt-1">
                      Ou R$ 325,65/mês no plano anual (18% de economia)
                    </p>

                    <div className="mt-5 space-y-2.5 text-xs text-slate-300">
                      {[
                        'Até 20 Projetos Ativos simultâneos',
                        'Retenção Pró — Até 20 Projetos monitorados',
                        'Até 6 Workspaces / Filiais',
                        'Até 10 Membros de Equipe',
                        'TUDO do Plano Start incluso',
                        'Módulo Retenção Pro Completo',
                        'Análise de Tom de Voz em Áudios (Gemini AI)',
                        'Radar Semântico de Palavras de Risco',
                        'Playbooks Prescritivos de IA no WhatsApp',
                        'Suporte Prioritário VIP 24/7'
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                    Ideal para fábricas com múltiplas equipes de montagem e alto volume.
                  </div>
                </div>
              </div>

              {/* Condições Comerciais */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2">
                  <strong className="text-white block mb-0.5">Sem Fidelidade</strong>
                  <span className="text-slate-400">Cancelamento a qualquer momento com 1 clique no painel.</span>
                </div>
                <div className="p-2">
                  <strong className="text-white block mb-0.5">Piloto Grátis</strong>
                  <span className="text-slate-400">Cadastre 1 projeto real agora sem pedir cartão de crédito.</span>
                </div>
                <div className="p-2">
                  <strong className="text-white block mb-0.5">Pagamento Flexível</strong>
                  <span className="text-slate-400">Cartão de crédito recorrente ou Pix com ativação imediata.</span>
                </div>
              </div>
            </div>
          )}

          {/* ABA 6: QUEBRA DE OBJEÇÕES */}
          {activeTab === 'objecoes' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <p className="text-xs text-slate-400">
                Respostas testadas e comprovadas para desarmar as dúvidas mais frequentes dos donos de empresa:
              </p>

              {[
                {
                  id: 'obj1',
                  obj: '1. "Já tenho WhatsApp e mando mensagem por lá mesmo."',
                  resp: '— "Excelente, e o BomProjeto se conecta exatamente no seu WhatsApp! A grande diferença é que hoje você gasta 3 horas por dia digitando a mesma coisa para 15 clientes, caçando fotos na sua galeria e tendo vergonha de cobrar a parcela. Com o BomProjeto, você tira 1 foto, o link atualiza sozinho e a cobrança Pix vai no automático sem você se queimar com o cliente."'
                },
                {
                  id: 'obj2',
                  obj: '2. "Meus clientes são pessoas mais velhas ou simples, não vão saber mexer."',
                  resp: '— "Foi exatamente por isso que criamos o sistema sem aplicativo e sem senha! Seu cliente não precisa baixar nada da Play Store nem criar conta. Ele só clica no link do WhatsApp e a tela já abre direto com as fotos e o botão de Pix Copia e Cola. Se ele sabe abrir o WhatsApp, ele sabe usar o BomProjeto."'
                },
                {
                  id: 'obj3',
                  obj: '3. "Não tenho tempo para alimentar outro sistema."',
                  resp: '— "O BomProjeto foi feito para quem vive no ritmo acelerado de agência e gestão de mídia. Cadastrar uma conta leva 40 segundos: cliente, WhatsApp, nicho e marcos de sprint. Anexar um criativo leva 5 segundos. O sistema não te toma tempo: ele te devolve mais de 10 horas semanais de mensagens repetitivas."'
                },
                {
                  id: 'obj4',
                  obj: '4. "Acho R$ 197 por mês caro para a minha realidade."',
                  resp: '— "Quanto custa um cliente de tráfego que dá churn de R$ 2.500/mês porque achou que você não estava trabalhando? O BomProjeto custa R$ 6,50 por dia — menos que um cafezinho. Reter um único cliente que ficaria inseguro já paga mais de 1 ano inteiro da ferramenta."'
                },
                {
                  id: 'obj5',
                  obj: '5. "Já uso Trello / Notion / Asana."',
                  resp: '— "Perfeito! O Trello ou Notion organizam seus cards internos de equipe. Mas nenhum cliente quer entrar no Trello nem recebe portal elegante sem senha com botão de Pix e aprovação de criativos no WhatsApp. O BomProjeto não substitui sua gestão interna: ele é a sua vitrine de alta percepção para o cliente final."'
                }
              ].map(item => (
                <div key={item.id} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-rose-400">{item.obj}</h4>
                    <button
                      type="button"
                      onClick={() => handleCopyText(item.resp, item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-800 transition-colors"
                    >
                      {copiedSection === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar Resposta</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                    {item.resp}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ABA 7: SCRIPTS DE VENDAS */}
          {activeTab === 'scripts' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              {/* Script WhatsApp */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">
                      Script 1: Abordagem WhatsApp (Outbound para Agências & Media Buyers)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        `Olá [Nome do Gestor/Dono], tudo bem? Vi o trabalho impecável da [Nome da Agência]. Parabéns pelos cases!\n\nUma pergunta rápida: quantos clientes seus hoje te mandam mensagem toda semana perguntando "já subiu as campanhas?", "cadê os criativos?" ou "tem atualização de métricas?"?\n\nNós criamos o BomProjeto: um portal sem senha no WhatsApp onde seu cliente acompanha as sprints, valida criativos e recebe o Pix Copia e Cola automático do fee mensal.\n\nVocê e seu time param de perder horas no WhatsApp e travam o churn na raiz.\n\nGravei um vídeo de 1 minuto mostrando como funciona para agências de tráfego e IA. Posso te mandar o link aqui?`,
                        'script-whatsapp'
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                  >
                    {copiedSection === 'script-whatsapp' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Mensagem Pronta</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
{`Olá [Nome do Gestor/Dono], tudo bem? Vi o trabalho impecável da [Nome da Agência]. Parabéns pelos cases!

Uma pergunta rápida: quantos clientes seus hoje te mandam mensagem toda semana perguntando "já subiu as campanhas?", "cadê os criativos?" ou "tem atualização de métricas?"?

Nós criamos o BomProjeto: um portal sem senha no WhatsApp onde seu cliente acompanha as sprints, valida criativos e recebe o Pix Copia e Cola automático do fee mensal.

Você e seu time param de perder horas no WhatsApp e travam o churn na raiz.

Gravei um vídeo de 1 minuto mostrando como funciona para agências de tráfego e IA. Posso te mandar o link aqui?`}
                </div>
              </div>

              {/* Cold Call */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-orange-400" />
                    <h4 className="text-sm font-bold text-white">
                      Script 2: Cold Call de 90 Segundos
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        `— "Alô, [Nome do Gestor]? Aqui é o [Seu Nome] do BomProjeto. Sei que você deve estar no meio da otimização de contas ou automações, então serei direto: você gasta muito tempo hoje no WhatsApp tendo que mandar prints e justificando entregas para clientes ansiosos?\n\n— [Gestor responde que sim]\n\n— Pois é, a maioria dos gestores perde mais de 2 horas por dia nisso e sofre com churn precoce. O BomProjeto coloca um portal sem senha no celular do seu cliente, com aprovação de criativos e lembretes de Pix automáticos. Quero te liberar um projeto de teste grátis agora para você rodar na sua próxima conta e ver o encantamento do cliente. Qual seu melhor e-mail para eu liberar o acesso?"`,
                        'script-call'
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                  >
                    {copiedSection === 'script-call' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Roteiro de Ligação</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
{`— "Alô, [Nome do Gestor]? Aqui é o [Seu Nome] do BomProjeto. Sei que você deve estar no meio da otimização de contas ou automações, então serei direto: você gasta muito tempo hoje no WhatsApp tendo que mandar prints e justificando entregas para clientes ansiosos?
— [Gestor responde que sim]
— Pois é, a maioria dos gestores perde mais de 2 horas por dia nisso e sofre com churn precoce. O BomProjeto coloca um portal sem senha no celular do seu cliente, com aprovação de criativos e lembretes de Pix automáticos. Quero te liberar um projeto de teste grátis agora para você rodar na sua próxima conta e ver o encantamento do cliente. Qual seu melhor e-mail para eu liberar o acesso?"`}
                </div>
              </div>

              {/* Roteiro Demo 3 Passos */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white">
                  Script 3: Demonstração Rápida em 3 Passos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-850">
                    <strong className="text-orange-400 block mb-1">Passo 1: Portal no Celular</strong>
                    <p className="text-slate-300">Abra o link da conta modelo. Mostre que é rápido, lindo, sem senha e com status das campanhas e aprovação de criativos.</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-850">
                    <strong className="text-emerald-400 block mb-1">Passo 2: O Botão Pix</strong>
                    <p className="text-slate-300">Clique em "Copiar Chave Pix" e mostre como o cliente paga o fee mensal ou setup sem atrito.</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-850">
                    <strong className="text-purple-400 block mb-1">Passo 3: Fechamento Start</strong>
                    <p className="text-slate-300">"Faz sentido colocar nas suas próximas contas para blindar seus clientes do churn por menos de R$ 7/dia?"</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 8: CHECKLIST DO VENDEDOR */}
          {activeTab === 'checklist' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Checklist Final do Vendedor de Alta Performance
                </h3>

                <div className="space-y-3">
                  {[
                    ['1. Domínio da Proposta', 'Nunca venda como "mais uma ferramenta de tarefas". Venda como "o portal que trava o churn no WhatsApp e garante o pagamento do seu fee".'],
                    ['2. Foco no Dono / Gestor', 'Fale sempre com o proprietário da agência ou media buyer autônomo. Eles sentem na pele a perda de clientes e atrasos de pagamento.'],
                    ['3. Fale a Linguagem Dele', 'Use termos do dia a dia: ROAS, BM, Business Manager, criativos, copy, tracking, automação n8n/Make, retainer mensal, sprint.'],
                    ['4. Apresente no Celular', '95% dos gestores e donos de agência resolvem tudo no WhatsApp. Mande o link de demonstração diretamente no WhatsApp dele.'],
                    ['5. Ancore o Preço no Valor da Retenção', 'R$ 197/mês não é nada comparado a uma mensalidade de R$ 2.500 que ele deixa de perder em churn.'],
                    ['6. Fechamento Rápido', 'Ofereça o teste imediato: "Vamos cadastrar sua próxima conta juntos agora? Leva menos de 2 minutos."']
                  ].map(([titulo, desc], idx) => (
                    <div key={idx} className="p-3.5 bg-slate-900 rounded-xl border border-slate-850 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div>
                        <strong className="text-sm text-white block mb-0.5">{titulo}</strong>
                        <p className="text-xs text-slate-300 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 9: VISUALIZADOR DE PDF NATIVO */}
          {activeTab === 'viewer-pdf' && (
            <div className="space-y-4 max-w-5xl mx-auto h-[70vh] flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  <FileText className="w-4 h-4 text-orange-400" />
                  <span className="text-slate-200 font-semibold">Visualizador do Arquivo PDF Oficial (62 KB)</span>
                  <span className="text-slate-400">• 9 Páginas Formatadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Arquivo PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenPdfInNewTab}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir em Guia Externa</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative">
                {isLoadingPdf ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Carregando visualizador do PDF...</span>
                  </div>
                ) : pdfBlobUrl ? (
                  <iframe
                    src={`${pdfBlobUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                    className="w-full h-full border-0"
                    title="Visualizador do PDF do Dossiê Comercial"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-3">
                    <FileDown className="w-10 h-10 text-orange-400" />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">
                        Visualização embutida indisponível neste navegador
                      </p>
                      <p className="text-xs text-slate-400 max-w-md">
                        Você pode navegar pelo briefing completo nas abas interativas acima ou baixar o arquivo PDF diretamente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar PDF Agora</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Documento Oficial de Treinamento Comercial • BomProjeto SaaS</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo PDF (.pdf)</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={onClose}
              className="hover:text-slate-200"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
