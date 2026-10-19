import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  MessageSquare, 
  Smartphone, 
  QrCode, 
  Zap,
  ChevronDown,
  ChevronsUpDown,
  Layers,
  Lock,
  Camera,
  Check,
  Star,
  MapPin,
  Quote,
  Search,
  Bell,
  Plus,
  AlertTriangle,
  Users,
  LayoutDashboard,
  ExternalLink,
  FileText,
  RefreshCw,
  Building2,
  FolderKanban,
  Settings,
  Share2,
  RotateCcw,
  Calendar,
  MessageCircle,
  Eye,
  ChevronRight,
  Maximize2,
  X,
  ListChecks,
  Send
} from 'lucide-react';
import { ActiveView } from '../types';
import { BrandLogo, BrandMark } from './BrandLogo';
import { LegalModal } from './LegalModal';
import { DEMO_VIDEO_CONFIG, getEmbedVideoUrl } from '../config/videoConfig';
import { RoiSavingsCalculator } from './RoiSavingsCalculator';

interface LandingPageProps {
  onSelectView: (view: ActiveView) => void;
  onOpenLoginModal?: () => void;
  onOpenVideoModal?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onSelectView, 
  onOpenLoginModal,
  onOpenVideoModal 
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('privacy');
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleStart = () => {
    // Operação 100% unificada no domínio oficial bomprojeto.com
    if (onOpenLoginModal) {
      onOpenLoginModal();
    } else {
      onSelectView('dashboard');
    }
  };

  // 8 Relatos de Prova Social com fotos, nomes e estados
  const testimonials = [
    {
      id: 1,
      name: 'Carlos Eduardo Mendes',
      workshop: 'Mendes Projetos & Execução',
      city: 'Campinas',
      state: 'SP',
      specialty: 'Projetos Residenciais',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      quote: 'O cliente parou totalmente de me ligar no domingo perguntando se o projeto ia atrasar. Eu tiro foto em cada etapa concluída, subo pelo celular e ele acompanha tudo com clareza. E a última parcela de 50% no Pix agora cai na hora!'
    },
    {
      id: 2,
      name: 'Roberto Silveira',
      workshop: 'Silveira Ambientes & Projetos',
      city: 'Joinville',
      state: 'SC',
      specialty: 'Projetos sob Demanda',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      quote: 'Antes eu tinha receio de cobrar a parcela final na entrega do projeto. Agora o BOMProjeto envia o WhatsApp com o Pix Copia e Cola pronto na data combinada. Recebemos mais de R$ 18.000 sem nenhum atrito ou atraso.'
    },
    {
      id: 3,
      name: 'Juliana Barros',
      workshop: 'Studio Barros Projetos',
      city: 'Belo Horizonte',
      state: 'MG',
      specialty: 'Interiores & Gestão',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      quote: 'Os parceiros que nos indicam ficaram impressionados com a postura profissional. O cliente abre o link sem senha, vê as fotos da produção do projeto e elogia a transparência. É a nossa melhor vitrine de novos contratos.'
    },
    {
      id: 4,
      name: 'André Luiz Fagundes',
      workshop: 'Fagundes Gestão de Projetos',
      city: 'Curitiba',
      state: 'PR',
      specialty: 'Projetos Especiais',
      photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      quote: 'O Termo de Garantia e Entrega em PDF com o checklist digital me livrou de duas dores de cabeça com cliente pedindo retrabalho de algo que já estava conferido e aprovado. Essa segurança não tem preço.'
    },
    {
      id: 5,
      name: 'Marcelo Dantas',
      workshop: 'Dantas Projetos & Execuções',
      city: 'Ribeirão Preto',
      state: 'SP',
      specialty: 'Planejamento e Execução',
      photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      quote: 'Comecei com o plano grátis em um primeiro projeto. O cliente achou tão diferenciado que me encomendou o restante e migrei pro plano Start no mesmo dia. Prático, limpo e sem frescura.'
    },
    {
      id: 6,
      name: 'Fernando Nogueira',
      workshop: 'Nogueira Gestão & Projetos',
      city: 'Porto Alegre',
      state: 'RS',
      specialty: 'Grandes Obras & Cronogramas',
      photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      quote: 'Temos 3 frentes de projetos simultâneas. O plano Scala nos dá a tranquilidade de organizar tudo por etapas e enviar as notificações de WhatsApp apenas no horário comercial, respeitando o descanso do cliente.'
    },
    {
      id: 7,
      name: 'Paulo Ricardo Bastos',
      workshop: 'Bastos Gestão de Projetos',
      city: 'Goiânia',
      state: 'GO',
      specialty: 'Projetos Corporativos',
      photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      quote: 'Eu perdia quase duas horas por dia no WhatsApp explicando o que estava sendo feito. Agora eu registro o avanço da etapa, a IA formata a nota técnica e o cliente recebe. Ganhei tempo de produção de volta.'
    },
    {
      id: 8,
      name: 'Thiago Alencar',
      workshop: 'Alencar Soluções em Projetos',
      city: 'Salvador',
      state: 'BA',
      specialty: 'Coordenação e Entrega',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      quote: 'O cliente não precisa baixar aplicativo nem lembrar senha, o link abre direto no celular com o Pix no botão. Desde que implementamos, nossa taxa de recebimento pontual foi para 100%.'
    }
  ];

  // 7 Perguntas Frequentes Essenciais
  const faqs = [
    {
      q: '1. Meu cliente precisa instalar algum aplicativo ou criar senha para ver o projeto?',
      a: 'Não. O cliente não precisa baixar nada nem memorizar nenhuma senha. Ele recebe uma mensagem elegante no WhatsApp com um link direto e seguro do projeto dele. Basta clicar no celular e visualizar as fotos reais do andamento, as etapas e o comprovante Pix na hora.'
    },
    {
      q: '2. Como funciona a cobrança de parcelas com Pix Copia e Cola?',
      a: 'Você cadastra o valor total e as parcelas combinadas em contrato (ex: 50% de entrada e 50% na entrega). Quando a data ou a etapa combinada chega, o sistema envia automaticamente um aviso amigável no WhatsApp com a Chave Pix Copia e Cola e o QR Code pronto para pagamento, eliminando atrasos.'
    },
    {
      q: '3. Quais as limitações e diferenças entre o plano Grátis, Start e Scala?',
      a: 'O Plano Grátis permite testar na prática com a limitação estrita de 1 Projeto, 1 Workspace e envio de atualização via link WhatsApp (apenas). O Plano Start (R$ 493,87/mês) libera até 8 projetos simultâneos (Retenção Pró: até 8 projetos), até 3 workspaces, termos de garantia em PDF e cobrança automática Pix. Já o Plano Scala (R$ 983,93/mês) inclui até 20 projetos simultâneos (Retenção Pró: até 20 projetos), até 6 workspaces, Inteligência Artificial BOMProjeto para atendimento 24h e suporte VIP. No plano anual, você ganha 3 meses de desconto no Scala e 2 meses no Start.'
    },
    {
      q: '4. Consigo conectar o número de WhatsApp oficial da minha empresa?',
      a: 'Sim! Nos planos Start e Scala você conecta sua própria linha de WhatsApp em menos de 1 minuto escaneando o QR Code na tela. As mensagens, fotos e avisos de Pix chegam ao cliente com o nome, foto e telefone oficial da sua empresa.'
    },
    {
      q: '5. O que acontece se o cliente responder à mensagem no WhatsApp?',
      a: 'No plano Scala, com o atendimento por IA ativado, o sistema pode responder dúvidas frequentes sobre prazos, andamento e cuidados pós-entrega com total cordialidade. Nos planos Grátis e Start, você conversa diretamente com o cliente na mesma conversa de WhatsApp como de costume.'
    },
    {
      q: '6. Como o Termo de Garantia e Entrega em PDF protege o meu projeto?',
      a: 'Ao finalizar o projeto, o sistema compila todas as etapas concluídas, especificações e fotos finais em um documento PDF oficial de Termo de Entrega & Garantia. O cliente pode registrar o aceite formal no link, protegendo você contra solicitações indevidas de retrabalho ou desgastes contratuais.'
    },
    {
      q: '7. Posso cancelar, pausar ou trocar de plano a qualquer momento?',
      a: 'Sim, com total liberdade e transparência. Não há contrato de fidelidade, carência nem multas de cancelamento. Você pode fazer upgrade do Grátis para o Start ou Scala a qualquer momento, ou cancelar diretamente pelo painel quando desejar.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-[#111111] font-sans antialiased selection:bg-[#FFE5D3] selection:text-[#FF6515]">
      
      {/* ========================================================
          HERO SECTION - MINIMALISTA, DIRETO E DE ALTO IMPACTO
      ======================================================== */}
      <section className="relative py-12 sm:py-16 lg:py-20 border-b border-[#EAE6DF] overflow-hidden">
        {/* Fundo sutil geométrico limpo */}
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-30 bg-[radial-gradient(#E8E2D8_1px,transparent_1px)] [background-size:24px_24px]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
            
            {/* Coluna Esquerda: Headline + Subtitle + Botões (Minimalista e Elegante) */}
            <div className="lg:col-span-5 text-left space-y-5 lg:pr-2">
              
              {/* Tag de Destaque */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E0DAD0] shadow-2xs text-[11px] font-semibold text-[#1C1C1A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6515] animate-pulse"></span>
                <span>Acompanhamento Visual & Cobrança Automática</span>
              </div>

              {/* Título Principal (Tamanho equilibrado, minimalista e legível) */}
              <h1 className="font-headline font-bold text-2xl sm:text-3xl md:text-4xl lg:text-[32px] xl:text-[38px] text-[#141412] tracking-tight leading-[1.24]">
                Nós atendemos, respondemos e cobramos o seu cliente.{' '}
                <span className="text-[#FF6515] font-extrabold block sm:inline">
                  Você só executa e recebe.
                </span>
              </h1>

              {/* Subtítulo Objetivo */}
              <p className="font-subtitle font-normal text-sm sm:text-[15px] text-[#555550] leading-relaxed max-w-lg">
                Nossa ferramenta notifica cada etapa com IA, cobra as parcelas vencidas e responde no WhatsApp no seu lugar. Você volta a produzir, vender e receber.
              </p>

              {/* CTAs Principais (Estilo Fleetly #111827) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                <button
                  onClick={handleStart}
                  className="fleetly-btn-primary px-7 py-3.5 rounded-xl text-sm font-semibold shadow-xs hover:shadow-md cursor-pointer"
                >
                  <span>Experimentar Grátis</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>

              {/* Garantias & Benefícios */}
              <p className="font-caption font-light text-xs text-[#7A7A75] pt-0.5">
                ✓ Sem fidelidade • Ativação imediata • Integração direta no WhatsApp
              </p>

              {/* Prova Social Rápida */}
              <div className="pt-2.5 flex items-center gap-3 text-xs text-[#6B7280] border-t border-[#E8E4DB]">
                <div className="flex -space-x-1.5">
                  <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80" alt="Gestor" />
                  <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=80" alt="Marceneiro" />
                  <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop&q=80" alt="Empresário" />
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-[#1C1C1A] text-xs">Mais de 100 Empresas e Marcenarias</span>
                  <span className="text-[11px] text-[#78716C] block">acompanhando projetos e recebendo via Pix</span>
                </div>
              </div>

            </div>

            {/* Coluna Direita: GIF Animado da Tela com Formato Horizontal Completo (Sem cortes) */}
            <div className="lg:col-span-7 flex justify-center lg:justify-end w-full">
              <div className="w-full max-w-2xl xl:max-w-3xl">
                <div 
                  onClick={() => setIsImageZoomOpen(true)}
                  className="group relative rounded-xl sm:rounded-2xl overflow-hidden border border-[#DCD6CB] shadow-xl shadow-black/[0.05] bg-white transition-all hover:shadow-2xl hover:border-[#CDC5B6] cursor-pointer"
                  title="Clique para ver o GIF em tamanho expandido"
                >
                  <img
                    src="/bomprojeto-demo.gif"
                    alt="Demonstração em GIF do sistema BOMProjeto - Painel e Cadastro de Projetos"
                    className="w-full h-auto block object-contain select-none transition-transform duration-300 group-hover:scale-[1.01]"
                    loading="eager"
                    decoding="async"
                  />
                  {/* Overlay sutil de dica de clique */}
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[11px] font-medium flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3 h-3 text-[#FF6515]" />
                    <span>Clique para ver ampliado</span>
                  </div>
                </div>

                {/* Legenda sutil e minimalista abaixo da imagem */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#78716C] px-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Demonstração do sistema: Painel, menu e fluxo de cadastro de projetos
                  </span>
                  <span className="font-semibold text-[#FF6515] hidden sm:inline">
                    Ao Vivo • 6 Etapas &amp; Pix
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          SOLUÇÕES - O QUE FAZEMOS NO BOMPROJETO
      ======================================================== */}
      <section id="solucoes" className="py-16 sm:py-24 border-b border-[#EAE6DF] scroll-mt-20 relative bg-[#FAF8F5]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E0DAD0] shadow-2xs text-[11px] font-semibold text-[#FF6515]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>O que fazemos • Recursos Completos</span>
            </div>
            <h2 className="font-headline font-black text-2xl sm:text-4xl lg:text-4xl text-[#111111] tracking-tight">
              Soluções
            </h2>
            <p className="text-sm sm:text-base text-[#555550] leading-relaxed">
              Conheça como a plataforma BOMProjeto resolve cada etapa do seu fluxo de trabalho — da estruturação inicial de contratos e rotina de tarefas até a notificação ativa no WhatsApp, portal do cliente e cobrança pontual.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7 items-stretch">
            
            {/* Box 1: Gestão e Estruturação de Projetos */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0D9CD] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 text-[#FF6515] flex items-center justify-center font-bold">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-black tracking-wider text-[#FF6515] bg-orange-50/80 px-2.5 py-1 rounded-full border border-orange-200/60">
                    01 • ESTRUTURAÇÃO
                  </span>
                </div>

                <div>
                  <h3 className="font-headline font-bold text-lg sm:text-xl text-[#111111]">
                    1. Gestão e Estruturação de Projetos
                  </h3>
                  <p className="text-xs text-[#7A7A75] mt-1">
                    Padronização e clareza de escopo desde o primeiro dia de contrato.
                  </p>
                </div>

                <div className="space-y-3.5 pt-3 border-t border-[#F0ECE4]">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#FF6515] shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Marcos de Entrega (Milestones)</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Divisão de projetos em etapas e entregáveis claros para evitar escopos abertos.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#FF6515] shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Templates Reutilizáveis</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Clonagem de estruturas de projetos padronizados para onboarding rápido de novos contratos.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#FF6515] shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Linha do Tempo e Progresso</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Visão macro do avanço percentual e prazos de cada projeto ativo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Operação e Gestão de Tarefas */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0D9CD] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-black tracking-wider text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-full border border-blue-200/60">
                    02 • OPERAÇÃO
                  </span>
                </div>

                <div>
                  <h3 className="font-headline font-bold text-lg sm:text-xl text-[#111111]">
                    2. Operação e Gestão de Tarefas
                  </h3>
                  <p className="text-xs text-[#7A7A75] mt-1">
                    Acompanhamento diário sem ruído, gargalos ou atrasos operacionais.
                  </p>
                </div>

                <div className="space-y-3.5 pt-3 border-t border-[#F0ECE4]">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Fluxo Visual de Trabalho</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Quadros de tarefas para acompanhamento diário da equipe.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Atribuição de Responsáveis e Prazos</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Definição clara de quem executa cada demanda e limite de data.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Checklists de Execução</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Validação de subetapas para controle de qualidade antes da entrega.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 3: Automação de Avisos via WhatsApp */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0D9CD] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-black tracking-wider text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-full border border-emerald-200/60">
                    03 • WHATSAPP
                  </span>
                </div>

                <div>
                  <h3 className="font-headline font-bold text-lg sm:text-xl text-[#111111]">
                    3. Automação de Avisos via WhatsApp
                  </h3>
                  <p className="text-xs text-[#7A7A75] mt-1">
                    Comunicação proativa e automática que elimina a ansiedade do cliente.
                  </p>
                </div>

                <div className="space-y-3.5 pt-3 border-t border-[#F0ECE4]">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Notificações Automáticas de Status</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Alertas disparados para o WhatsApp do cliente quando uma etapa avança.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Avisos de Pendência e Aprovação</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Notificação direta ao cliente quando um entregável necessita de validação.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Comunicação Ativa de Andamento</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Redução de mensagens manuais cobrando atualizações da agência.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 4: Portal e Visão do Cliente */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0D9CD] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center font-bold">
                    <Eye className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-black tracking-wider text-purple-700 bg-purple-50/80 px-2.5 py-1 rounded-full border border-purple-200/60">
                    04 • PORTAL DO CLIENTE
                  </span>
                </div>

                <div>
                  <h3 className="font-headline font-bold text-lg sm:text-xl text-[#111111]">
                    4. Portal e Visão do Cliente
                  </h3>
                  <p className="text-xs text-[#7A7A75] mt-1">
                    Transparência de ponta a ponta sem senhas ou apps para instalar.
                  </p>
                </div>

                <div className="space-y-3.5 pt-3 border-t border-[#F0ECE4]">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Painel de Acompanhamento do Cliente</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Espaço dedicado para o contratante visualizar o andamento das entregas em tempo real.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Central de Entregáveis e Anexos</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Repositório organizado de links e arquivos vinculados ao projeto.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Histórico de Entregas</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Registro das etapas concluídas para conferência e segurança de escopo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 5: Cobrança e Financeiro Integrado */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0D9CD] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-black tracking-wider text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-full border border-amber-200/60">
                    05 • FINANCEIRO INTEGRADO
                  </span>
                </div>

                <div>
                  <h3 className="font-headline font-bold text-lg sm:text-xl text-[#111111]">
                    5. Cobrança e Financeiro Integrado
                  </h3>
                  <p className="text-xs text-[#7A7A75] mt-1">
                    Faturamento vinculado a etapas e avisos amigáveis para zerar inadimplência.
                  </p>
                </div>

                <div className="space-y-3.5 pt-3 border-t border-[#F0ECE4]">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Controle de Faturamento por Projeto</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Associação de valores e contratos a cada cliente/demanda.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Disparo de Cobranças e Links de Pagamento</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Automação de avisos financeiros para reduzir a inadimplência.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <h4 className="text-xs font-bold text-[#1C1C1A]">Status Financeiro em Tempo Real</h4>
                    </div>
                    <p className="text-xs text-[#555550] pl-6 leading-relaxed">
                      Monitoramento de pagamentos pendentes, quitados ou em atraso.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 6: CTA Card Integrador para harmonizar o grid perfeitamente */}
            <div className="bg-linear-to-br from-[#1F1F1D] to-[#111111] text-white rounded-2xl p-6 sm:p-7 border border-[#333330] shadow-md flex flex-col justify-between space-y-6">
              <div className="space-y-3.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-[#FF8540]">
                  <Zap className="w-3.5 h-3.5 fill-[#FF8540]" />
                  <span>Comece em 2 Minutos</span>
                </div>
                
                <h3 className="font-headline font-bold text-xl sm:text-2xl text-white">
                  Pronto para estruturar seus projetos?
                </h3>
                
                <p className="text-xs text-white/70 leading-relaxed">
                  Junte-se a mais de 100 empresas que já profissionalizaram suas entregas, automatizaram o WhatsApp e recebem com pontualidade via Pix.
                </p>

                <ul className="space-y-2 text-xs text-white/80 pt-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#FF6515] shrink-0" />
                    <span>Plano Grátis disponível imediatamente</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#FF6515] shrink-0" />
                    <span>Sem necessidade de cartão de crédito</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#FF6515] shrink-0" />
                    <span>Seus clientes não precisam de login ou app</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleStart}
                className="w-full py-3 rounded-xl bg-[#FF6515] hover:bg-[#E0550D] text-white font-bold text-xs shadow-md shadow-[#FF6515]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Experimentar Grátis Agora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          COMO FUNCIONA NA PRÁTICA (4 PASSOS DIRETOS)
      ======================================================== */}
      <section id="recursos" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#EAE6DF] scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF6515]">Fluxo Simples</span>
          <h2 className="font-headline font-black text-2xl sm:text-4xl text-[#111111]">
            Como funciona no dia a dia dos projetos
          </h2>
          <p className="text-sm sm:text-base text-[#555550]">
            Não exige curso, manual nem treinamento de equipe. É direto ao ponto.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="bg-white rounded-2xl p-6 border border-[#E0D9CD] space-y-3">
            <span className="font-headline font-black text-2xl text-[#FF6515]">01</span>
            <h4 className="font-headline font-bold text-base text-[#111111]">Cadastre o Projeto</h4>
            <p className="text-xs text-[#555550] leading-relaxed">
              Informe o nome do cliente, o valor acordado, as datas de parcelas e previsão de entrega.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E0D9CD] space-y-3">
            <span className="font-headline font-black text-2xl text-[#FF6515]">02</span>
            <h4 className="font-headline font-bold text-base text-[#111111]">Envie o Link</h4>
            <p className="text-xs text-[#555550] leading-relaxed">
              O cliente recebe o link pelo WhatsApp e salva no navegador sem precisar criar login nem senha.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E0D9CD] space-y-3">
            <span className="font-headline font-black text-2xl text-[#FF6515]">03</span>
            <h4 className="font-headline font-bold text-base text-[#111111]">Registre as Fotos</h4>
            <p className="text-xs text-[#555550] leading-relaxed">
              Fotografe a evolução do projeto. A IA redige o resumo técnico e avisa o cliente no WhatsApp.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E0D9CD] space-y-3">
            <span className="font-headline font-black text-2xl text-[#FF6515]">04</span>
            <h4 className="font-headline font-bold text-base text-[#111111]">Receba no Prazo</h4>
            <p className="text-xs text-[#555550] leading-relaxed">
              O sistema envia a chave Pix na entrega e o cliente quita com confiança e transparência.
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================
          PROVAS SOCIAIS - 8 RELATOS COM FOTOS, NOMES E ESTADOS
      ======================================================== */}
      <section id="depoimentos" className="py-16 sm:py-24 bg-[#F8F6F1] border-b border-[#EAE6DF] scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E0DAD0] text-xs font-semibold text-[#FF6515]">
              <Star className="w-3.5 h-3.5 fill-[#FF6515] text-[#FF6515]" />
              <span>Avaliação 4.9 de 5 por gestores de projetos em todo o Brasil</span>
            </div>
            <h2 className="font-headline font-black text-2xl sm:text-4xl text-[#111111]">
              Quem executa já não perde tempo no WhatsApp
            </h2>
            <p className="text-sm sm:text-base text-[#555550]">
              Veja como profissionais em diversos estados do país eliminaram a ansiedade do cliente e recebem o Pix final na pontualidade da entrega.
            </p>
          </div>

          {/* Grid com os 8 Relatos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {testimonials.map((item) => (
              <div 
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-[#E2DCD0] shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  {/* Estrelas */}
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    ))}
                  </div>

                  {/* Citação do Relato */}
                  <p className="text-xs text-[#333330] leading-relaxed italic">
                    "{item.quote}"
                  </p>
                </div>

                {/* Perfil do Marceneiro */}
                <div className="pt-3 border-t border-[#F0ECE4] flex items-center gap-3">
                  <img 
                    src={item.photo} 
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-[#E0DAD0] shrink-0" 
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-[#111111] truncate">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-[#7A7A75] truncate">
                      {item.workshop}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-[#FF6515] mt-0.5">
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      <span>{item.city} - {item.state}</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <span className="text-xs font-medium text-[#7A7A75] inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Relatos e empresas verificadas ativas na plataforma BOMProjeto</span>
            </span>
          </div>

        </div>
      </section>

      {/* ========================================================
          SIMULADOR DINÂMICO DE ECONOMIA & ROI (RETENÇÃO & CUSTO EVITADO)
      ======================================================== */}
      <RoiSavingsCalculator 
        onScrollToPlans={() => {
          const el = document.getElementById('planos');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* ========================================================
          TABELA DE PLANOS CLARA E TRANSPARENTE
      ======================================================== */}
      <section id="planos" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#EAE6DF] scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF6515]">Planos & Valores</span>
          <h2 className="font-headline font-black text-2xl sm:text-4xl text-[#111111]">
            Investimento que se paga no primeiro Pix recebido
          </h2>
          <p className="text-sm sm:text-base text-[#555550]">
            Escolha o plano ideal para a quantidade de projetos da sua empresa.
          </p>

          {/* Seletor Mensal / Anual */}
          <div className="pt-4 inline-flex items-center gap-2 p-1 rounded-xl bg-white border border-[#D5CFC5]">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-[#111111] text-white' : 'text-[#7A7A75] hover:text-[#111111]'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                billingCycle === 'annual' ? 'bg-[#FF6515] text-white shadow-2xs' : 'text-[#7A7A75] hover:text-[#111111]'
              }`}
            >
              <span>Anual</span>
              <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full font-bold">Até 3 Meses OFF</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* 1. PLANO GRÁTIS */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0D9CD] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="font-subtitle font-montserrat text-[10px] font-bold uppercase tracking-wider text-[#7A7A75]">
                  Piloto para Testar
                </span>
                <h3 className="font-title font-bebas text-3xl sm:text-4xl text-[#111111] uppercase tracking-wide mt-0.5">Grátis</h3>
                <p className="font-subtitle font-montserrat font-medium text-xs text-[#7A7A75]">Para conhecer na prática no seu primeiro cliente</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#111111]">
                  R$ 0
                </span>
                <span className="text-xs text-[#7A7A75]">/mês</span>
              </div>

              <div className="p-3 bg-[#FCFAF7] rounded-xl border border-[#EDE7DD] text-xs space-y-2">
                <span className="font-bold text-[#111111] block">Limitação do Plano Grátis:</span>
                <ul className="space-y-2 text-[#555550]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>1 Projeto</strong> ativo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>1 Workspace</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Envio de atualização via link WhatsApp</strong></span>
                  </li>
                  <li className="text-[11px] font-semibold text-[#8C887B] pt-1 border-t border-[#E8E2D8]">
                    Apenas estes recursos essenciais inclusos.
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-3 rounded-xl bg-white border border-[#C8C2B6] hover:bg-[#F5EFE6] text-[#111111] font-bold text-xs transition-colors cursor-pointer"
            >
              Começar Grátis Agora
            </button>
          </div>

          {/* 2. PLANO START (R$ 493,87) */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-[#FF6515] shadow-lg relative flex flex-col justify-between space-y-6">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#FF6515] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
              Mais Escolhido
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <span className="font-subtitle font-montserrat text-[10px] font-bold uppercase tracking-wider text-[#FF6515]">
                  Empresa em Crescimento
                </span>
                <h3 className="font-title font-bebas text-3xl sm:text-4xl text-[#111111] uppercase tracking-wide mt-0.5">Start</h3>
                <p className="font-subtitle font-montserrat font-medium text-xs text-[#7A7A75]">Para profissionais e equipes em expansão</p>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#111111]">
                    R$ {billingCycle === 'annual' ? '411,56' : '493,87'}
                  </span>
                  <span className="text-xs text-[#7A7A75]">/mês</span>
                </div>
                {billingCycle === 'annual' && (
                  <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">
                    R$ 4.938,70/ano (10 meses pagos, 2 meses grátis)
                  </span>
                )}
              </div>

              <ul className="space-y-2.5 text-xs text-[#555550] pt-2">
                <li className="flex items-center gap-2 font-medium text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6515] shrink-0" />
                  <span><strong>Até 8 projetos simultâneos</strong></span>
                </li>
                <li className="flex items-center gap-2 font-medium text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6515] shrink-0" />
                  <span><strong>Retenção Pró — Até 8 Projetos</strong></span>
                </li>
                <li className="flex items-center gap-2 font-medium text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6515] shrink-0" />
                  <span><strong>Até 3 Workspaces</strong> (unidades/setores)</span>
                </li>
                <li className="flex items-center gap-2 font-medium text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6515] shrink-0" />
                  <span><strong>Cobrança de parcelas com Pix Copia e Cola</strong></span>
                </li>
                <li className="flex items-center gap-2 font-medium text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6515] shrink-0" />
                  <span>Termos de Garantia e Entrega em PDF</span>
                </li>
                <li className="flex items-center gap-2 font-medium text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6515] shrink-0" />
                  <span>Horários preferenciais de cobrança no WhatsApp</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-3 rounded-xl bg-[#FF6515] hover:bg-[#E0550D] text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              Assinar Plano Start
            </button>
          </div>

          {/* 3. PLANO SCALA (R$ 983,93) */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0D9CD] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="font-subtitle font-montserrat text-[10px] font-bold uppercase tracking-wider text-[#7A7A75]">
                  Alta Produtividade & Escala
                </span>
                <h3 className="font-title font-bebas text-3xl sm:text-4xl text-[#111111] uppercase tracking-wide mt-0.5">Scala</h3>
                <p className="font-subtitle font-montserrat font-medium text-xs text-[#7A7A75]">Para empresas consolidadas com múltiplos projetos</p>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#111111]">
                    R$ {billingCycle === 'annual' ? '737,95' : '983,93'}
                  </span>
                  <span className="text-xs text-[#7A7A75]">/mês</span>
                </div>
                {billingCycle === 'annual' && (
                  <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">
                    R$ 8.855,37/ano (Pague 9 meses e leve 12 — Economize R$ 2.951,79!)
                  </span>
                )}
              </div>

              <ul className="space-y-2.5 text-xs text-[#555550] pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Até 20 Projetos simultâneos</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Retenção Pró — Até 20 Projetos</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Até 6 Workspaces</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>IA BOMProjeto 24h</strong> no WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Multi-equipes e gestores</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Chave Pix CNPJ customizada</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Suporte prioritário VIP via WhatsApp</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-3 rounded-xl bg-[#111111] hover:bg-[#222222] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Escolher Plano Scala
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================
          PERGUNTAS FREQUENTES (FAQ) - 7 PERGUNTAS ESSENCIAIS
      ======================================================== */}
      <section id="faq" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#EAE6DF] scroll-mt-20">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF6515]">Tire suas dúvidas</span>
          <h2 className="font-headline font-black text-2xl sm:text-4xl text-[#111111]">
            Perguntas Frequentes (FAQ)
          </h2>
          <p className="text-sm text-[#555550]">
            Respostas diretas sobre como o BOMProjeto funciona no seu dia a dia.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl border border-[#E0D9CD] overflow-hidden"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-[#111111] hover:bg-[#FBF9F6] transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#7A7A75] transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === index && (
                <div className="px-4 pb-4 pt-1 text-xs text-[#555550] leading-relaxed border-t border-[#F0ECE4]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          RODAPÉ ELEGANTE E MINIMALISTA COM ACESSO RESTRITO
      ======================================================== */}
      <footer className="py-12 bg-white border-t border-[#EAE6DF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          
          <div className="flex flex-col items-center sm:items-start gap-2">
            <BrandLogo variant="full" size="md" theme="light" showSubtitle />
            <p className="text-xs text-[#7A7A75] text-center sm:text-left pt-1">
              Plataforma para gestão, acompanhamento visual e cobranças de projetos.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#555550]">
            <a href="#planos" className="hover:text-[#111111]">
              Planos
            </a>
            
            <a
              href="/privacidade"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/privacidade');
                onSelectView('privacy');
              }}
              className="hover:text-[#111111] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Privacidade & LGPD</span>
            </a>

            <a
              href="/termos"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/termos');
                onSelectView('terms');
              }}
              className="hover:text-[#111111] transition-colors cursor-pointer"
            >
              Termos de Uso
            </a>
          </div>

        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-[#F0ECE4] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#A09C94] gap-2">
          <span>© 2026 BOMProjeto (bomprojeto.com). Todos os direitos reservados.</span>
          <span>Desenvolvido para Gestão de Projetos</span>
        </div>
      </footer>

      {/* Modal com Termos de Uso e Política de Privacidade & LGPD */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalTab}
      />

      {/* Modal de Zoom da Imagem em Alta Resolução */}
      {isImageZoomOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsImageZoomOpen(false)}
        >
          <div 
            className="relative max-w-6xl w-full bg-[#FAF9F5] rounded-2xl overflow-hidden shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#DDD7CD] bg-white">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1C1C1A]">Demonstração do Sistema: Gestão &amp; Cadastro de Projetos</span>
                <span className="text-[11px] text-[#FF6515] font-semibold hidden sm:inline">• GIF Animado em Alta Resolução</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsImageZoomOpen(false)}
                className="w-7 h-7 rounded-full bg-[#FAF9F5] hover:bg-[#EAE6DF] flex items-center justify-center text-[#555550] hover:text-[#111111] transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 sm:p-4 max-h-[85vh] overflow-auto flex items-center justify-center bg-[#F6F3ED]">
              <img
                src="/bomprojeto-demo.gif"
                alt="Demonstração do sistema em resolução completa"
                className="w-full h-auto rounded-lg shadow-md border border-[#DDD7CD]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
