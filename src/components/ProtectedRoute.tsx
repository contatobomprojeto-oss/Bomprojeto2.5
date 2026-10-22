/**
 * @file ProtectedRoute.tsx
 * @description Componente de Proteção de Rotas com base na máquina de estados de autenticação
 * e isolamento multi-tenant (Bloqueio de vazamentos e direcionamento para onboarding).
 */

import React from 'react';
import { useAuth, AuthRoutingState } from './AuthProvider';
import { BrandLogo } from './BrandLogo';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedStates?: AuthRoutingState[];
  onOpenLoginModal?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedStates = ['AUTHENTICATED', 'SUPERADMIN'],
  onOpenLoginModal
}) => {
  const { routingState, isLoading, signOut } = useAuth();

  if (isLoading || routingState === 'LOADING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-6 text-center space-y-4 select-none">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center border border-[#EAECEF] p-2 mb-2">
          <BrandLogo variant="mark" size="sm" />
        </div>
        <div className="w-8 h-8 border-3 border-[#0F172A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-[#64748B] font-medium">Verificando segurança e sessão ativa...</p>
      </div>
    );
  }

  // Caso 1: Usuário Não Autenticado
  if (routingState === 'UNAUTHENTICATED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-6 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg border border-[#E8EAED] space-y-6">
          <div className="flex justify-center">
            <BrandLogo variant="full" size="md" theme="light" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-[#0F172A]">Acesso Restrito</h2>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Sua sessão expirou ou você precisa estar autenticado para acessar esta área protegida do sistema.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={() => {
                if (onOpenLoginModal) onOpenLoginModal();
                else window.location.hash = '#landing';
              }}
              className="w-full py-3 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer shadow-xs"
            >
              Fazer Login com Google
            </button>
            <button
              onClick={() => {
                window.location.hash = '#landing';
              }}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-[#0F172A] text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Caso 2: Novo Cadastro sem Tenant (Needs Onboarding)
  if (routingState === 'NEEDS_ONBOARDING' && !allowedStates.includes('NEEDS_ONBOARDING')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-6 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg border border-[#E8EAED] space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto text-xl font-bold">
            🏢
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-[#0F172A]">Configuração de Organização Pendente</h2>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Detectamos que sua conta foi criada com sucesso, mas você ainda não configurou sua empresa ou workspace.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={() => {
                window.location.hash = '#onboarding';
                window.location.reload();
              }}
              className="w-full py-3 rounded-xl bg-[#F97316] text-white text-xs font-bold hover:bg-[#EA580C] transition-colors cursor-pointer shadow-xs"
            >
              Configurar Workspace Agora
            </button>
            <button
              onClick={signOut}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-[#0F172A] text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Validação de Permissão por Estado
  if (!allowedStates.includes(routingState)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-6 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg border border-[#E8EAED] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto font-bold text-xl">
            🔒
          </div>
          <h2 className="text-lg font-bold text-[#0F172A]">Acesso Não Autorizado</h2>
          <p className="text-xs text-[#64748B]">
            Você não possui privilégios suficientes para acessar este módulo.
          </p>
          <button
            onClick={() => { window.location.hash = '#dashboard'; }}
            className="px-5 py-2.5 bg-[#0F172A] text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Ir para Meu Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
