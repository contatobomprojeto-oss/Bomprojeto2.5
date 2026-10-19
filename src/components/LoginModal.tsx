import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone, 
  FileText,
  Building,
  User,
  ArrowRight,
  Lock
} from 'lucide-react';
import { UserProfile, ActiveView, SAAS_OWNER_EMAIL } from '../types';
import { signInWithGoogle } from '../lib/supabaseAuth';
import { BrandLogo } from './BrandLogo';
import { trackLeadConversion } from '../utils/gtmAnalytics';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile, redirectView: ActiveView) => void;
  onSelectView?: (view: ActiveView) => void;
  onOpenVideoModal?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onSelectView,
  onOpenVideoModal
}) => {
  const [activeTab, setActiveTab] = useState<'marcenaria' | 'client'>('marcenaria');
  const [osCode, setOsCode] = useState('#PRJ-204');
  const [clientPhone, setClientPhone] = useState('(11) 98841-2099');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMarcenariaDemoLogin = () => {
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsLoading(false);
      const user: UserProfile = {
        id: 'usr-henrique-owner',
        name: 'Henrique Ferraz',
        email: SAAS_OWNER_EMAIL,
        role: 'admin',
        workshopName: 'Gestão de Projetos Integrada',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
      };
      onLoginSuccess(user, 'dashboard');
      trackLeadConversion('login_marcenaria_demo', user.email);
      onClose();
    }, 300);
  };

  const handleClientLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsLoading(false);
      const user: UserProfile = {
        id: 'usr-rafael',
        name: 'Rafael Souza',
        email: 'rafael.souza@email.com',
        phone: clientPhone || '(11) 98841-2099',
        role: 'client',
        projectCode: osCode.toUpperCase() || '#PRJ-204',
        workshopName: 'Gestão de Projetos'
      };
      // Direciona imediatamente para a página do dashboard principal
      onLoginSuccess(user, 'dashboard');
      onClose();
    }, 350);
  };

  const handleGoogleLogin = async (role: 'marcenaria' | 'client') => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      try {
        localStorage.setItem('bomprojeto_pending_role', role);
      } catch (e) {
        console.warn('LocalStorage notice:', e);
      }

      trackLeadConversion(role === 'marcenaria' ? 'cadastro_google_gestor' : 'acesso_google_cliente');
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bomprojeto.com';
      await signInWithGoogle(`${origin}/#dashboard`);
    } catch (err: any) {
      console.warn('[Supabase Google Auth Notice]:', err?.message || err);
      let userFriendlyMsg = 'Falha ao conectar com o Google no Supabase. Verifique sua conexão e tente novamente.';
      if (err?.message) {
        userFriendlyMsg = err.message;
      }
      setErrorMsg(userFriendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      id="login-modal-overlay"
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Card Flutuante Centralizado com Bordas Delicadas (Estilo Fleetly) */}
      <div 
        id="login-modal-content"
        className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-[#EAECEF] overflow-hidden max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Top Header com Botão Fechar e Brand */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-[#EAECEF] relative bg-gradient-to-b from-[#F8F9FA] to-white shrink-0">
          <button
            id="login-modal-close-btn"
            onClick={onClose}
            className="absolute top-4 sm:top-5 right-4 sm:right-5 p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar modal de login"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-2">
            <BrandLogo variant="full" size="sm" theme="light" showSubtitle={false} />
          </div>

          <h2 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
            Acesse seu espaço
          </h2>
          <p className="text-[11px] sm:text-xs text-[#475569] mt-0.5 font-normal">
            Autenticação rápida e segura via Google. Sem senhas manuais.
          </p>

          {/* Alternador em Pill Segmentada (Tabs Estilo Fleetly) */}
          <div className="fleetly-tabs-container w-full mt-3 sm:mt-4 grid grid-cols-2">
            <button
              id="login-tab-marcenaria"
              type="button"
              onClick={() => {
                setActiveTab('marcenaria');
                setErrorMsg('');
              }}
              className={`fleetly-tab-btn flex items-center justify-center gap-1.5 py-2 ${
                activeTab === 'marcenaria' ? 'fleetly-tab-btn-active' : 'fleetly-tab-btn-inactive'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Painel Gestão</span>
            </button>

            <button
              id="login-tab-client"
              type="button"
              onClick={() => {
                setActiveTab('client');
                setErrorMsg('');
              }}
              className={`fleetly-tab-btn flex items-center justify-center gap-1.5 py-2 ${
                activeTab === 'client' ? 'fleetly-tab-btn-active' : 'fleetly-tab-btn-inactive'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Área do Cliente</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* TAB 1: PAINEL DE GESTÃO (EXCLUSIVO GOOGLE AUTH) */}
          {activeTab === 'marcenaria' && (
            <div className="space-y-4">
              
              {/* Botão Oficial Google Sign-In Estilo Fleetly */}
              <div className="space-y-2.5">
                <button
                  id="btn-google-login-marcenaria"
                  type="button"
                  onClick={() => handleGoogleLogin('marcenaria')}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl border border-[#EAECEF] bg-white hover:bg-slate-50 text-[#0F172A] font-semibold text-sm transition-all flex items-center justify-center gap-3 shadow-2xs hover:shadow-xs cursor-pointer group active:scale-[0.99]"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>{isLoading ? 'Conectando ao Google...' : 'Continuar com o Google'}</span>
                </button>

                <p className="text-[11px] text-center text-[#94A3B8]">
                  Acesso seguro via <strong>Google Auth</strong>. Seus projetos e relatórios sincronizados.
                </p>

                {/* Divisor e Atalho para Demonstração */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-[#EAECEF]"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">ou teste rápido</span>
                  <div className="flex-grow border-t border-[#EAECEF]"></div>
                </div>

                <button
                  id="btn-demo-login-marcenaria"
                  type="button"
                  onClick={handleMarcenariaDemoLogin}
                  disabled={isLoading}
                  className="w-full h-10 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100 text-[#475569] hover:text-[#0F172A] font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Acessar Ambiente de Demonstração (1-Clique)</span>
                </button>
              </div>

              {/* Informações de Proteção Google */}
              <div className="bg-[#F8F9FA] border border-[#EAECEF] rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Segurança Corporativa para seu Negócio</span>
                </div>
                <div className="space-y-1.5 text-xs text-[#475569]">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Autenticação criptografada oficial Google OAuth 2.0.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Sem risco de vazamento de senhas da sua empresa.</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ÁREA DO CLIENTE */}
          {activeTab === 'client' && (
            <div className="space-y-4">
              
              {/* Botão Oficial Google Sign-In para o Cliente */}
              <div className="space-y-2.5">
                <button
                  id="btn-google-login-client"
                  type="button"
                  onClick={() => handleGoogleLogin('client')}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl border border-[#EAECEF] bg-white hover:bg-slate-50 text-[#0F172A] font-semibold text-sm transition-all flex items-center justify-center gap-3 shadow-2xs hover:shadow-xs cursor-pointer group active:scale-[0.99]"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>{isLoading ? 'Conectando ao Google...' : 'Entrar com o Google'}</span>
                </button>

                <p className="text-[11px] text-center text-[#94A3B8]">
                  Acompanhe seus projetos, etapas e comprovantes sem precisar cadastrar senha.
                </p>
              </div>

              {/* Formulário de Consulta por OS com Inputs de Altura Confortável (44px) e Botão Submit w-full */}
              <form onSubmit={handleClientLogin} className="space-y-3 pt-3 border-t border-[#EAECEF]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Ou consulte pela Ordem de Serviço
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">Acesso direto</span>
                </div>

                <div className="space-y-2.5">
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      id="login-client-os-code"
                      type="text"
                      required
                      placeholder="Código da OS (ex: #PRJ-204)"
                      value={osCode}
                      onChange={(e) => setOsCode(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#EAECEF] bg-white text-xs text-[#0F172A] placeholder:text-[#94A3B8] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-[#0F172A] transition-all"
                    />
                  </div>

                  <div className="relative">
                    <Smartphone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                    <input
                      id="login-client-phone"
                      type="text"
                      required
                      placeholder="WhatsApp do Cliente (com DDD)"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#EAECEF] bg-white text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-[#0F172A] transition-all"
                    />
                  </div>
                </div>

                {/* Botão de submit em largura total w-full preto grafite sólido (#111827) */}
                <button
                  id="btn-submit-client-login"
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-[#111827] hover:bg-black text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-md active:scale-[0.99]"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{isLoading ? 'Localizando OS...' : 'Consultar Ordem de Serviço'}</span>
                </button>
              </form>

            </div>
          )}

          {/* Termos e Privacidade */}
          <div className="pt-2 border-t border-[#EAECEF]">
            <p className="text-[10px] text-center text-[#94A3B8] leading-relaxed">
              Ao continuar, você concorda com nossos{' '}
              <a
                href="/termos"
                onClick={(e) => {
                  e.preventDefault();
                  if (onSelectView) onSelectView('terms');
                  onClose();
                }}
                className="underline hover:text-[#0F172A] font-medium text-[#475569]"
              >
                Termos de Uso
              </a>{' '}
              e{' '}
              <a
                href="/privacidade"
                onClick={(e) => {
                  e.preventDefault();
                  if (onSelectView) onSelectView('privacy');
                  onClose();
                }}
                className="underline hover:text-[#0F172A] font-medium text-[#475569]"
              >
                Política de Privacidade
              </a>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
