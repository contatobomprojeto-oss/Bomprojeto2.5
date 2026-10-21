import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Lock, CheckCircle2, Building, Scale } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy'
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-[#0F172A]/45 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-[#EAECEF] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#EAECEF] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6515]">
              {activeTab === 'terms' ? <Scale className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
                {activeTab === 'terms' ? 'Termos de Uso do Serviço' : 'Política de Privacidade & LGPD'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#64748B]">
                BOMProjeto Gestão Inteligente • Atualizado em 2026 • Domínio: bomprojeto.com
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#EAECEF] bg-white px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-[#FF6515] text-[#FF6515] bg-white'
                : 'border-transparent text-[#5F6368] hover:text-[#111111]'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Política de Privacidade</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'terms'
                ? 'border-[#FF6515] text-[#FF6515] bg-white'
                : 'border-transparent text-[#5F6368] hover:text-[#111111]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Termos de Uso</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 text-[#3C4043] text-sm leading-relaxed">
          {activeTab === 'privacy' ? (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold">1</span>
                  Compromisso com a Privacidade e LGPD
                </h3>
                <p>
                  A plataforma <strong>BOMProjeto</strong> (disponível em <code>bomprojeto.com</code>), mantida e operada pela equipe gestora, tem o firme compromisso de proteger os dados pessoais de seus usuários, gestores, media buyers, analistas e clientes finais, em total conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)</strong> e as diretrizes de segurança da informação do Google.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold">2</span>
                  Dados Coletados e Finalidades
                </h3>
                <p>Coletamos e processamos exclusivamente os dados necessários para a correta prestação do serviço de gestão de projetos:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                  <li><strong>Dados de Autenticação (Google OAuth):</strong> Nome completo, endereço de e-mail e foto de perfil, unicamente para identificação do gestor, login seguro e controle de acesso a projetos e filiais.</li>
                  <li><strong>Dados de Projetos e Clientes:</strong> Nome do cliente, telefone/WhatsApp para notificações de status, links de entregáveis, criativos e campanhas, e cronograma de produção/sprints.</li>
                  <li><strong>Dados Financeiros e Cobrança:</strong> Valores de orçamentos, datas de vencimento de parcelas e identificador de transação Pix. <em>Não armazenamos números de cartões de crédito ou senhas bancárias em nossos servidores.</em></li>
                  <li><strong>Dados de Comunicação via WhatsApp:</strong> Mensagens de atualização de produção, registro de envios e respostas automatizadas pelo assistente com inteligência artificial para esclarecimento de dúvidas sobre prazos e etapas.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold">3</span>
                  Uso das APIs do Google e Dados de Autenticação
                </h3>
                <p>
                  O aplicativo BOMProjeto utiliza a autenticação do Google Identity Services (OAuth 2.0). Em conformidade com a <strong>Google API Services User Data Policy</strong> e os requisitos de Uso Limitado (<em>Limited Use Requirements</em>):
                </p>
                <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED] text-xs space-y-1">
                  <p className="font-semibold text-[#202124]">Garantias de Não Compartilhamento:</p>
                  <p>• As informações obtidas via Google OAuth são utilizadas exclusivamente para autenticar a sua sessão no sistema.</p>
                  <p>• Nenhum dado de usuário é vendido, transferido ou cedido a terceiros para fins de publicidade ou marketing direcionado.</p>
                  <p>• Dados de contas Google não são utilizados para treinamento de modelos públicos de inteligência artificial.</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold">4</span>
                  Segurança, Armazenamento e Criptografia
                </h3>
                <p>
                  Todos os dados transmitidos entre seu navegador e a plataforma são protegidos por criptografia de ponta a ponta (TLS 1.3 / HTTPS). Os dados do banco de dados são hospedados em infraestrutura de nuvem segura de alta disponibilidade com isolamento estrito por workspace e tenant.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold">5</span>
                  Direitos do Titular dos Dados (LGPD)
                </h3>
                <p>
                  Conforme o Artigo 18 da LGPD, você possui o direito de, a qualquer momento:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-[#E8EAED] bg-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Confirmar a existência de tratamento de dados</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E8EAED] bg-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Acessar e retificar dados incompletos ou inexatos</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E8EAED] bg-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Solicitar a exclusão definitiva da sua conta</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E8EAED] bg-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Revogar consentimentos previamente concedidos</span>
                  </div>
                </div>
              </section>

              <section className="space-y-2 pt-2 border-t border-[#E8EAED]">
                <h3 className="text-base font-bold text-[#111111]">6. Contato com o Encarregado de Dados (DPO)</h3>
                <p className="text-xs">
                  Para exercer seus direitos de privacidade ou esclarecer dúvidas, entre em contato diretamente com o responsável pela privacidade através do e-mail: <strong className="text-[#FF6515]">henrique.ferrazms@gmail.com</strong> ou pelo canal de suporte em <code>bomprojeto.com</code>.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold">1</span>
                  Aceitação dos Termos
                </h3>
                <p>
                  Ao acessar ou utilizar a plataforma <strong>BOMProjeto</strong> (disponível através do domínio <code>bomprojeto.com</code>), você concorda integralmente em cumprir estes Termos de Uso. Caso não concorde com qualquer disposição aqui estabelecida, você não deverá utilizar a ferramenta.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold">2</span>
                  Descrição do Serviço
                </h3>
                <p>
                  O BOMProjeto é um software como serviço (SaaS) voltado para agências de marketing, consultorias de automação/IA e gestores de tráfego pago, oferecendo ferramentas para:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                  <li>Acompanhamento de etapas de entrega (Onboarding, Planejamento & Briefing, Criativos & Copy, Subida de Campanhas/Fluxos, Otimização Contínua);</li>
                  <li>Portal do cliente interativo com aprovação de peças, dashboards e relatórios;</li>
                  <li>Lembretes de cobrança e geração de Pix para quitação de parcelas programadas;</li>
                  <li>Assistente autônomo com IA para notificações e atendimento no WhatsApp;</li>
                  <li>Gestão multi-unidade e filiais corporativas (Workspaces).</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold">3</span>
                  Planos de Assinatura, Limites e Cancelamento
                </h3>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <p><strong>• Plano Grátis:</strong> Permite 1 projeto ativo para teste ilimitado sem compromisso, com geração manual de mensagens.</p>
                  <p><strong>• Plano Start:</strong> Até 8 projetos ativos simultâneos, Retenção Pró (até 8 projetos), IA 24h para WhatsApp, 3 workspaces/filiais e suporte comercial.</p>
                  <p><strong>• Plano Scala:</strong> Até 20 projetos ativos simultâneos, Retenção Pró (até 20 projetos), até 6 filiais, automações avançadas e suporte VIP.</p>
                  <p className="text-[#64748B]">O cancelamento ou troca de plano pode ser efetuado a qualquer momento no painel de Assinatura, mantendo o acesso ativo até o término do ciclo vigente.</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold">4</span>
                  Responsabilidades do Usuário e do Gestor
                </h3>
                <p>Ao utilizar o BOMProjeto, você se compromete a:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                  <li>Fornecer informações verdadeiras e atualizadas sobre prazos e orçamentos;</li>
                  <li>Obter o consentimento prévio de seus clientes para envio de notificações no WhatsApp;</li>
                  <li>Respeitar os horários de cobrança comercial estabelecidos pelas boas práticas e pelo código de defesa do consumidor;</li>
                  <li>Manter a confidencialidade de suas credenciais e chaves de acesso.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FFF5EE] text-[#FF6515] text-xs flex items-center justify-center font-bold">5</span>
                  Propriedade Intelectual e Foro
                </h3>
                <p>
                  Todos os direitos de propriedade intelectual da marca <strong>BOMProjeto</strong>, design, códigos-fonte e algoritmos são de titularidade exclusiva de seus desenvolvedores. Estes termos são regidos pelas leis da República Federativa do Brasil, elegendo-se o foro da comarca da sede da empresa para dirimir eventuais litígios.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-[#EAECEF] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-[#FF6515]" />
            <span>BOMProjeto • Plataforma Oficial: <strong>bomprojeto.com</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#0F172A] hover:bg-black text-white font-semibold text-xs transition-colors cursor-pointer text-center shadow-xs"
            >
              Compreendi e Concordo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
