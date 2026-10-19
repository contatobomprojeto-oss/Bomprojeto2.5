import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  CheckCircle2, 
  Building, 
  Scale, 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight,
  Mail,
  LogIn
} from 'lucide-react';
import { ActiveView } from '../types';
import { BrandLogo } from './BrandLogo';

interface LegalPageViewProps {
  pageType: 'terms' | 'privacy';
  onSelectView: (view: ActiveView) => void;
  onOpenLoginModal?: () => void;
}

export const LegalPageView: React.FC<LegalPageViewProps> = ({
  pageType,
  onSelectView,
  onOpenLoginModal
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(pageType);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setActiveTab(pageType);
  }, [pageType]);

  useEffect(() => {
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update document title for SEO & clarity
    if (activeTab === 'terms') {
      document.title = 'Termos de Uso do Serviço — BOMProjeto';
    } else {
      document.title = 'Política de Privacidade & LGPD — BOMProjeto';
    }
  }, [activeTab]);

  const switchTab = (tab: 'terms' | 'privacy') => {
    setActiveTab(tab);
    const newPath = tab === 'terms' ? '/termos' : '/privacidade';
    window.history.pushState(null, '', newPath);
  };

  const handleCopyLink = () => {
    const currentPath = activeTab === 'terms' ? '/termos' : '/privacidade';
    const fullUrl = `${window.location.origin}${currentPath}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }).catch(() => {
        // Fallback
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124] flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8EAED]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.history.pushState(null, '', '/');
                onSelectView('landing');
              }}
              className="p-2 rounded-xl text-[#5F6368] hover:text-[#111111] hover:bg-[#F1F3F4] transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Voltar para a página inicial"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Início</span>
            </button>

            <div className="h-5 w-px bg-[#E8EAED]" />

            <div 
              onClick={() => {
                window.history.pushState(null, '', '/');
                onSelectView('landing');
              }}
              className="cursor-pointer"
            >
              <BrandLogo variant="full" size="sm" showSubtitle={false} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="py-1.5 px-3 rounded-xl border border-[#DADCE0] hover:bg-[#F8F9FA] text-xs font-medium text-[#3C4043] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Copiar link próprio desta página"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#5F6368]" />
                  <span className="hidden sm:inline">Copiar Link</span>
                  <span className="sm:hidden">Link</span>
                </>
              )}
            </button>

            {onOpenLoginModal && (
              <button
                onClick={onOpenLoginModal}
                className="py-1.5 px-4 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Breadcrumb & Hero Banner */}
      <div className="bg-[#FFFFFF] border-b border-[#E8EAED] py-8 sm:py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          {/* Breadcrumb navigation */}
          <nav className="flex items-center gap-2 text-xs text-[#70757A] mb-4">
            <button 
              onClick={() => {
                window.history.pushState(null, '', '/');
                onSelectView('landing');
              }}
              className="hover:text-[#111111] hover:underline cursor-pointer"
            >
              bomprojeto.com
            </button>
            <ChevronRight className="w-3 h-3 text-[#DADCE0]" />
            <span className="text-[#3C4043] font-medium">
              {activeTab === 'terms' ? 'Termos de Uso' : 'Política de Privacidade & LGPD'}
            </span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF5EE] border border-[#FFD9C2] flex items-center justify-center text-[#FF6515] shrink-0 shadow-xs">
                {activeTab === 'terms' ? <Scale className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                  {activeTab === 'terms' ? 'Termos de Uso do Serviço' : 'Política de Privacidade & LGPD'}
                </h1>
                <p className="text-xs sm:text-sm text-[#70757A] mt-1">
                  BOMProjeto Gestão Inteligente • Vigência: 2026 • Domínio Oficial: <strong className="text-[#202124]">bomprojeto.com</strong>
                </p>
              </div>
            </div>

            {/* Direct URL Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F1F3F4] text-xs font-mono text-[#3C4043] border border-[#E8EAED] self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Link Próprio: bomprojeto.com{activeTab === 'terms' ? '/termos' : '/privacidade'}</span>
            </div>
          </div>

          {/* Sub-Tabs switcher */}
          <div className="flex gap-2 mt-8 border-b border-[#E8EAED]">
            <button
              onClick={() => switchTab('privacy')}
              className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'border-[#FF6515] text-[#FF6515]'
                  : 'border-transparent text-[#70757A] hover:text-[#202124]'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Política de Privacidade (LGPD)</span>
            </button>

            <button
              onClick={() => switchTab('terms')}
              className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'terms'
                  ? 'border-[#FF6515] text-[#FF6515]'
                  : 'border-transparent text-[#70757A] hover:text-[#202124]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Termos de Uso</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-white rounded-3xl border border-[#E8EAED] p-6 sm:p-10 shadow-sm space-y-8 text-[#3C4043] text-sm leading-relaxed">
          
          {activeTab === 'privacy' ? (
            /* ========================================================================= */
            /* POLÍTICA DE PRIVACIDADE & LGPD                                           */
            /* ========================================================================= */
            <div className="space-y-8 animate-in fade-in duration-200">
              
              <div className="p-4 rounded-2xl bg-[#FFF9F5] border border-[#FFE0D0] text-xs sm:text-sm text-[#872D00]">
                <strong>Transparência e Conformidade Legal:</strong> Esta Política de Privacidade descreve como a plataforma <strong>BOMProjeto</strong> (<code>bomprojeto.com</code>) coleta, armazena, processa e protege os dados pessoais em estrita conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)</strong> e as normas de segurança do <strong>Google Identity Services</strong>.
              </div>

              {/* Seção 1 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">1</span>
                  Compromisso com a Privacidade e Princípios da LGPD
                </h2>
                <p>
                  A plataforma <strong>BOMProjeto</strong>, operada sob o domínio <code>bomprojeto.com</code>, valoriza a confiança de seus assinantes e clientes. Todas as operações de tratamento de dados são orientadas pelos princípios da finalidade, adequação, necessidade, livre acesso, qualidade dos dados, transparência, segurança, prevenção, não discriminação e responsabilização.
                </p>
              </section>

              {/* Seção 2 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">2</span>
                  Dados Pessoais Coletados e Suas Finalidades
                </h2>
                <p>Coletamos e tratamos apenas os dados estritamente necessários para a prestação dos serviços de gestão de projetos:</p>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED]">
                    <h3 className="font-bold text-[#202124] text-xs sm:text-sm">a) Dados de Autenticação Segura (Google OAuth 2.0)</h3>
                    <p className="text-xs text-[#5F6368] mt-1">
                      Nome completo, endereço de e-mail e fotografia de perfil fornecidos mediante consentimento do usuário pela autenticação Google. <em>Finalidade:</em> identificação inequívoca do assinante, prevenção a acessos não autorizados e concessão de níveis de acesso por workspace.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED]">
                    <h3 className="font-bold text-[#202124] text-xs sm:text-sm">b) Dados dos Clientes Finais dos Projetos</h3>
                    <p className="text-xs text-[#5F6368] mt-1">
                      Nome, número de WhatsApp para notificações, endereço de entrega e histórico de aprovação de ordens de serviço. <em>Finalidade:</em> disponibilização do portal de acompanhamento de status da produção e envio de avisos de evolução técnica.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED]">
                    <h3 className="font-bold text-[#202124] text-xs sm:text-sm">c) Dados Financeiros e de Cobrança Pix</h3>
                    <p className="text-xs text-[#5F6368] mt-1">
                      Valores de parcelas contratuais, datas de vencimento e identificadores de transação Pix. <strong>Aviso Importante:</strong> Não armazenamos nem processamos números de cartões de crédito, senhas bancárias ou tokens confidenciais do cliente.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED]">
                    <h3 className="font-bold text-[#202124] text-xs sm:text-sm">d) Comunicação Automatizada via WhatsApp</h3>
                    <p className="text-xs text-[#5F6368] mt-1">
                      Histórico de notificações de status e registros de atendimento por inteligência artificial para esclarecer dúvidas sobre prazos e etapas dos móveis contratados.
                    </p>
                  </div>
                </div>
              </section>

              {/* Seção 3 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">3</span>
                  Uso das APIs do Google e Diretrizes de Uso Limitado
                </h2>
                <p>
                  O aplicativo BOMProjeto utiliza a autenticação oficial do Google Identity Services (OAuth 2.0). Em conformidade estrita com a <strong>Google API Services User Data Policy</strong> e os requisitos de Uso Limitado (<em>Limited Use Requirements</em>):
                </p>
                <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#DADCE0] space-y-2 text-xs sm:text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Os dados obtidos via Google OAuth são utilizados exclusivamente para autenticar a sua sessão no sistema.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Nenhum dado de usuário é vendido, alugado, transferido ou cedido a terceiros para fins de publicidade ou marketing direcionado.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Dados de contas Google não são utilizados para treinamento de modelos públicos de inteligência artificial sem autorização expressa.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>O acesso humano a dados de usuários é proibido, ressalvadas solicitações expressas de suporte técnico feitas pelo próprio assinante.</span>
                  </div>
                </div>
              </section>

              {/* Seção 4 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">4</span>
                  Segurança da Informação e Criptografia
                </h2>
                <p>
                  Todos os dados trafegados entre o navegador do usuário e o sistema são protegidos por criptografia de ponta a ponta (TLS 1.3 / HTTPS com certificado SSL 256-bit). Os bancos de dados contam com isolamento lógico estrito por workspace (multi-tenant), backups regulares e políticas de acesso restrito apenas aos gestores autorizados da respectiva marcenaria.
                </p>
              </section>

              {/* Seção 5 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">5</span>
                  Direitos do Titular dos Dados (Artigo 18 da LGPD)
                </h2>
                <p>O assinante e seus clientes têm o direito de, a qualquer momento e mediante requisição facilitada:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl border border-[#E8EAED] bg-[#F8F9FA] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Confirmar a existência de tratamento de dados</span>
                  </div>
                  <div className="p-3 rounded-xl border border-[#E8EAED] bg-[#F8F9FA] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Acessar e retificar dados incompletos ou inexatos</span>
                  </div>
                  <div className="p-3 rounded-xl border border-[#E8EAED] bg-[#F8F9FA] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Solicitar a exclusão definitiva ou anonimização</span>
                  </div>
                  <div className="p-3 rounded-xl border border-[#E8EAED] bg-[#F8F9FA] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Revogar o consentimento previamente concedido</span>
                  </div>
                </div>
              </section>

              {/* Seção 6 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">6</span>
                  Cookies e Sessão do Navegador
                </h2>
                <p>
                  Utilizamos exclusivamente cookies técnicos essenciais e armazenamento local de sessão (LocalStorage) para preservar seu estado de login autenticado e preferências visuais. Não utilizamos cookies de rastreamento invasivo entre sites (cross-site tracking).
                </p>
              </section>

              {/* Seção 7 */}
              <section className="space-y-3 pt-4 border-t border-[#E8EAED]">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#FF6515]" />
                  <span>Contato com o Encarregado de Proteção de Dados (DPO)</span>
                </h2>
                <p className="text-xs sm:text-sm">
                  Para exercer quaisquer de seus direitos de privacidade, revogar autorizações ou solicitar esclarecimentos adicionais, entre em contato diretamente com o nosso Encarregado pelo canal oficial:
                </p>
                <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E8EAED] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-[#202124]">Encarregado de Dados (DPO): Henrique Ferraz</p>
                    <p className="text-[#5F6368]">E-mail direto: <strong className="text-[#FF6515]">henrique.ferrazms@gmail.com</strong></p>
                    <p className="text-[#5F6368]">Plataforma: bomprojeto.com</p>
                  </div>
                  <a
                    href="mailto:henrique.ferrazms@gmail.com?subject=Solicitação%20LGPD%20BOMProjeto"
                    className="py-2 px-4 rounded-xl bg-[#111111] text-white font-bold text-xs hover:bg-black transition-colors self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Enviar Mensagem ao DPO</span>
                  </a>
                </div>
              </section>

            </div>
          ) : (
            /* ========================================================================= */
            /* TERMOS DE USO DO SERVIÇO                                                 */
            /* ========================================================================= */
            <div className="space-y-8 animate-in fade-in duration-200">
              
              <div className="p-4 rounded-2xl bg-[#FFF9F5] border border-[#FFE0D0] text-xs sm:text-sm text-[#872D00]">
                <strong>Contrato de Adesão ao Serviço:</strong> Bem-vindo ao <strong>BOMProjeto</strong> (<code>bomprojeto.com</code>). Ao criar uma conta ou utilizar quaisquer de nossos serviços, você celebra um contrato vinculativo com as diretrizes e regras aqui estipuladas.
              </div>

              {/* Seção 1 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">1</span>
                  Aceitação dos Termos e Condições
                </h2>
                <p>
                  Ao acessar ou utilizar a plataforma BOMProjeto (disponível no domínio <code>bomprojeto.com</code>), você declara ter capacidade civil plena e concorda expressamente com a totalidade destes Termos de Uso. Caso discorde de quaisquer termos, solicitamos que não prossiga com a utilização da plataforma.
                </p>
              </section>

              {/* Seção 2 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">2</span>
                  Descrição da Solução SaaS
                </h2>
                <p>
                  O <strong>BOMProjeto</strong> é uma plataforma SaaS (Software as a Service) desenvolvida especialmente para marcenarias e gestores de projetos sob medida. Entre as principais funcionalidades fornecidas estão:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                  <li>Painel Kanban e acompanhamento das etapas de produção (Corte, Usinagem, Pré-Montagem, Acabamento, Montagem Final);</li>
                  <li>Portal do cliente interativo com upload de fotos de execução em tempo real e linha do tempo de produção;</li>
                  <li>Módulo financeiro com geração de Pix Copia e Cola e controle de parcelas pagas e a vencer;</li>
                  <li>Assistente autônomo com Inteligência Artificial para notificações de status e atendimento oficial no WhatsApp;</li>
                  <li>Gestão multi-unidade e filiais corporativas (Workspaces independentes).</li>
                </ul>
              </section>

              {/* Seção 3 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">3</span>
                  Acesso Exclusivo via Google Auth
                </h2>
                <p>
                  Para maior comodidade, integridade e proteção contra senhas fracas ou vazamentos, o acesso ao BOMProjeto é realizado exclusivamente através do <strong>Google Identity Services (Google Auth)</strong>. O assinante é o único responsável pela guarda e segurança da sua Conta Google vinculada.
                </p>
              </section>

              {/* Seção 4 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">4</span>
                  Planos de Assinatura, Cobrança e Cancelamento
                </h2>
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111111]">Plano Grátis</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#E8EAED] text-[#5F6368] font-bold text-[10px]">Sem Custo</span>
                    </div>
                    <p className="text-[#5F6368] mt-1">1 projeto ativo simultâneo para testes e validação das funcionalidades sem necessidade de cartão de crédito.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FFF9F5] border border-[#FFD9C2]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#FF6515]">Plano Start</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFEADC] text-[#FF6515] font-bold text-[10px]">Mais Popular</span>
                    </div>
                    <p className="text-[#7A7A75] mt-1">Até 8 projetos ativos simultâneos, Retenção Pró (até 8 projetos), assistente inteligente no WhatsApp, 3 filiais/workspaces e suporte comercial.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111111]">Plano Scala</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Alta Produção</span>
                    </div>
                    <p className="text-[#5F6368] mt-1">Até 20 projetos ativos simultâneos, Retenção Pró (até 20 projetos), até 6 filiais simultâneas, automações avançadas e suporte VIP.</p>
                  </div>
                </div>
                <p className="text-xs text-[#70757A]">
                  O cancelamento pode ser efetuado a qualquer momento pelo assinante na aba de configurações de assinatura, permanecendo o serviço ativo até o término do ciclo mensal previamente contratado.
                </p>
              </section>

              {/* Seção 5 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">5</span>
                  Boas Práticas de Cobrança e Conduta do Assinante
                </h2>
                <p>Ao utilizar as ferramentas de notificação e cobrança automática, o assinante compromete-se a:</p>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Configurar os horários de cobrança comercial respeitando a legislação aplicável e a civilidade (ex: horário comercial de 08h às 19h).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Obter anuência de seus clientes para o envio de mensagens de atualização via WhatsApp.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Manter dados de orçamentos e prazos fidedignos às ordens de serviço acordadas.</span>
                  </div>
                </div>
              </section>

              {/* Seção 6 */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold shrink-0">6</span>
                  Propriedade Intelectual e Foro Competente
                </h2>
                <p>
                  A marca BOMProjeto, o domínio <code>bomprojeto.com</code>, código-fonte, layout visual e marcas associadas são de titularidade exclusiva de seus mantenedores. Estes termos são regidos pelas leis da República Federativa do Brasil, elegendo-se o foro da comarca da sede da empresa para dirimir eventuais controvérsias judiciais decorrentes deste contrato.
                </p>
              </section>

            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E8EAED] py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#70757A]">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-[#FF6515]" />
            <span>© 2026 <strong>BOMProjeto</strong> (bomprojeto.com) • Todos os direitos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => switchTab('privacy')}
              className={`hover:text-[#111111] transition-colors cursor-pointer ${activeTab === 'privacy' ? 'font-bold text-[#FF6515]' : ''}`}
            >
              Política de Privacidade
            </button>
            <button
              onClick={() => switchTab('terms')}
              className={`hover:text-[#111111] transition-colors cursor-pointer ${activeTab === 'terms' ? 'font-bold text-[#FF6515]' : ''}`}
            >
              Termos de Uso
            </button>
            <button
              onClick={() => {
                window.history.pushState(null, '', '/');
                onSelectView('landing');
              }}
              className="hover:text-[#111111] transition-colors cursor-pointer"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};
