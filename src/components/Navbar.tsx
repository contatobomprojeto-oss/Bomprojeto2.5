import React, { useState } from 'react';
import { 
  Compass, 
  LayoutDashboard, 
  FileText, 
  ExternalLink, 
  ShieldCheck, 
  LogIn,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Plus,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ActiveView, UserProfile, isSaasOwner } from '../types';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  currentView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenNewProjectModal: () => void;
  onOpenLoginModal: () => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  activeProjectCode?: string;
  onOpenVideoModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  onOpenNewProjectModal,
  onOpenLoginModal,
  currentUser,
  onLogout,
  activeProjectCode = '#FER-204',
  onOpenVideoModal
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // O dono do projeto e do SaaS é estritamente o Henrique Ferraz (henrique.ferrazms@gmail.com)
  const isOwner = isSaasOwner(currentUser);

  const handleNavClick = (view: ActiveView) => {
    onSelectView(view);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const scrollToSection = (id: string) => {
    if (currentView !== 'landing') {
      onSelectView('landing');
      setTimeout(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  /* ========================================================
     MODO 1: PÁGINA DE VENDAS PÚBLICA (LANDING PAGE)
     Design minimalista, foco em conversão e sem controles
     internos da oficina visíveis para os visitantes.
  ======================================================== */
  if (currentView === 'landing') {
    return (
      <header className="sticky top-0 z-40 select-none">
        {/* BARRA DO ADMINISTRADOR (Visível quando Administrador está autenticado) */}
        {isOwner && (
          <div className="bg-[#111827] text-white px-3 sm:px-6 py-2 border-b border-white/10 text-xs shadow-md">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-amber-300">Modo Administrador • Acesso Total</span>
                <span className="text-white/40 text-[11px] hidden md:inline">
                  (Ambiente administrativo restrito)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('admin_dashboard')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-black" />
                  <span>Área de Admin</span>
                </button>
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Painel de Projetos</span>
                </button>
                <button
                  onClick={onLogout}
                  className="px-2 py-1 text-white/60 hover:text-white text-xs cursor-pointer"
                  title="Encerrar sessão"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER PRINCIPAL PÚBLICO - ESTILO FLEETLY MINIMALISTA */}
        <div className="bg-[#F8F9FA]/90 backdrop-blur-md border-b border-[#EAECEF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              
              {/* Logo Oficial */}
              <div 
                className="cursor-pointer"
                onClick={() => handleNavClick('landing')}
              >
                <BrandLogo variant="full" size="md" theme="light" />
              </div>

              {/* Links de Navegação da Página de Vendas (Desktop) */}
              <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#475569]">
                <button
                  onClick={() => scrollToSection('solucoes')}
                  className="hover:text-[#0F172A] transition-colors cursor-pointer"
                >
                  Soluções
                </button>
                <button
                  onClick={() => scrollToSection('recursos')}
                  className="hover:text-[#0F172A] transition-colors cursor-pointer"
                >
                  Recursos
                </button>
                <button
                  onClick={() => scrollToSection('depoimentos')}
                  className="hover:text-[#0F172A] transition-colors cursor-pointer"
                >
                  Depoimentos
                </button>
                <button
                  onClick={() => scrollToSection('planos')}
                  className="hover:text-[#0F172A] transition-colors cursor-pointer"
                >
                  Planos
                </button>
                <button
                  onClick={() => scrollToSection('faq')}
                  className="hover:text-[#0F172A] transition-colors cursor-pointer"
                >
                  Dúvidas
                </button>
              </nav>

              {/* Ações Públicas (Login no estilo Fleetly #111827) */}
              <div className="hidden sm:flex items-center gap-3">
                {currentUser ? (
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className="fleetly-btn-primary px-4 py-2 text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <span>Acessar Painel</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </button>
                ) : (
                  <button
                    onClick={onOpenLoginModal}
                    className="fleetly-btn-primary px-4 py-2 text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                    <span>Entrar no Sistema</span>
                  </button>
                )}
              </div>

              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-[#475569] hover:bg-black/5 md:hidden cursor-pointer"
                aria-label="Abrir menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-[#0F172A]" />}
              </button>

            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu for Landing Page */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#fcfaf7] border-b border-[#e8e4dc] px-4 py-5 space-y-3 shadow-xl">
            <button
              onClick={() => scrollToSection('solucoes')}
              className="w-full text-left py-2 text-sm font-medium text-[#1c1c1a]"
            >
              Soluções
            </button>
            <button
              onClick={() => scrollToSection('recursos')}
              className="w-full text-left py-2 text-sm font-medium text-[#1c1c1a]"
            >
              Recursos
            </button>
            <button
              onClick={() => scrollToSection('depoimentos')}
              className="w-full text-left py-2 text-sm font-medium text-[#1c1c1a]"
            >
              Depoimentos
            </button>
            <button
              onClick={() => scrollToSection('planos')}
              className="w-full text-left py-2 text-sm font-medium text-[#1c1c1a]"
            >
              Planos
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="w-full text-left py-2 text-sm font-medium text-[#1c1c1a]"
            >
              Dúvidas
            </button>
            <div className="pt-3 border-t border-[#e8e4dc] flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLoginModal();
                }}
                className="w-full py-2.5 rounded-xl bg-[#FF6515] text-white text-xs font-bold text-center"
              >
                Entrar no Sistema
              </button>
            </div>
          </div>
        )}
      </header>
    );
  }

  /* ========================================================
     MODO 2: NAVEGAÇÃO INTERNA / PORTAL DO CLIENTE
  ======================================================== */
  return (
    <header className="sticky top-0 z-40 bg-[#111111] text-white border-b border-white/10 shadow-lg select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Brand & Logo */}
          <div 
            id="nav-brand-logo"
            className="cursor-pointer"
            onClick={() => handleNavClick('landing')}
          >
            <BrandLogo variant="full" size="md" theme="dark" />
          </div>

          {/* Desktop Navigation Tabs for Workshop Users */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => handleNavClick('landing')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Página Inicial</span>
            </button>

            <button
              id="nav-dashboard-btn"
              onClick={() => handleNavClick('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'dashboard'
                  ? 'bg-[#FF6515] text-white shadow-xs font-bold'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Painel de Projetos</span>
            </button>

            {isOwner && (
              <button
                id="nav-admin-dashboard-btn"
                onClick={() => handleNavClick('admin_dashboard')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'admin_dashboard'
                    ? 'bg-amber-500 text-black shadow-xs font-bold'
                    : 'text-amber-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Área de Admin</span>
                <span className="text-[9px] bg-amber-400/20 text-amber-200 px-1 py-0.2 rounded font-bold uppercase">ADMIN</span>
              </button>
            )}

            <button
              id="nav-project-btn"
              onClick={() => handleNavClick('project_detail')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'project_detail'
                  ? 'bg-[#FF6515] text-white shadow-xs font-bold'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>OS {activeProjectCode}</span>
            </button>

            <button
              id="nav-portal-btn"
              onClick={() => handleNavClick('client_portal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'client_portal'
                  ? 'bg-[#FF6515] text-white shadow-xs font-bold'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Portal do Cliente</span>
            </button>
          </nav>

          {/* Right Area: Login Button & Action Controls */}
          <div className="flex items-center gap-2">
            
            {/* Quick New Project Button */}
            <button
              onClick={onOpenNewProjectModal}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white border border-white/10 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#FF6515]" />
              <span>Nova OS</span>
            </button>

            {/* Profile Dropdown */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#FF6515] text-white flex items-center justify-center font-bold text-[10px]">
                    {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="font-bold text-white text-xs leading-none">{currentUser.name}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold leading-tight mt-0.5">
                      {currentUser.role === 'admin' ? 'Administrador • Acesso Total' : 'Gestor'}
                    </div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-white/60" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#1c1c1a] border border-white/15 shadow-2xl p-2 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 border-b border-white/10 mb-1">
                      <p className="font-bold text-white">{currentUser.name}</p>
                      <p className="text-[11px] text-white/60 truncate">{currentUser.email}</p>
                      {currentUser.role === 'admin' && (
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                          Administrador • Acesso Total
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleNavClick('dashboard')}
                      className="w-full text-left p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#FF6515]" />
                      <span>Painel de Projetos</span>
                    </button>

                    {isOwner && (
                      <button
                        onClick={() => handleNavClick('admin_dashboard')}
                        className="w-full text-left p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 flex items-center gap-2 cursor-pointer font-semibold"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>Área de Admin (Acesso Total)</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-red-500/20 text-red-400 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="px-3.5 py-1.5 rounded-xl bg-[#FF6515] text-white text-xs font-bold hover:bg-[#e0550d] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
