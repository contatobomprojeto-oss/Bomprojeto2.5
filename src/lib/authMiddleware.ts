/**
 * @file authMiddleware.ts
 * @description Middleware de autenticação e verificação de sessão do Supabase executado
 * antes de carregar o componente App. Valida se o usuário está autenticado e se possui
 * workspace/tenant ativo, redirecionando para /login ou /onboarding se necessário.
 */

import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { SAAS_OWNER_EMAIL } from '../types';

export interface AuthMiddlewareResult {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  hasWorkspace: boolean;
  isSuperAdmin: boolean;
  redirectRoute?: '/login' | '/onboarding' | '/dashboard' | '/admin';
}

/**
 * Verifica o estado atual da sessão e do tenant no Supabase antes da montagem da aplicação.
 */
export async function verifyAuthAndTenantSession(): Promise<AuthMiddlewareResult> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session || !session.user) {
      // Limpeza de cache local de usuário não autenticado
      try {
        localStorage.removeItem('bomprojeto_user');
        localStorage.removeItem('bomprojeto_user_email');
      } catch {}

      return {
        session: null,
        user: null,
        isAuthenticated: false,
        hasWorkspace: false,
        isSuperAdmin: false,
        redirectRoute: '/login'
      };
    }

    const user = session.user;
    const email = (user.email || '').trim().toLowerCase();
    const isSuperAdmin = email === SAAS_OWNER_EMAIL.toLowerCase();

    // Se for o superadmin titular, possui acesso total imediato
    if (isSuperAdmin) {
      return {
        session,
        user,
        isAuthenticated: true,
        hasWorkspace: true,
        isSuperAdmin: true,
        redirectRoute: '/admin'
      };
    }

    // Para usuários regulares, verifica se possui associação a um tenant na tabela tenant_memberships
    const { data: membership, error: membershipError } = await supabase
      .from('tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const hasWorkspace = !membershipError && Boolean(membership?.tenant_id);

    if (!hasWorkspace) {
      // Usuário autenticado mas sem workspace/tenant -> Redirecionar para onboarding
      return {
        session,
        user,
        isAuthenticated: true,
        hasWorkspace: false,
        isSuperAdmin: false,
        redirectRoute: '/onboarding'
      };
    }

    return {
      session,
      user,
      isAuthenticated: true,
      hasWorkspace: true,
      isSuperAdmin: false,
      redirectRoute: '/dashboard'
    };

  } catch (err) {
    console.error('[AuthMiddleware] Erro ao verificar sessão:', err);
    return {
      session: null,
      user: null,
      isAuthenticated: false,
      hasWorkspace: false,
      isSuperAdmin: false,
      redirectRoute: '/login'
    };
  }
}

/**
 * Função utilitária para navegação baseada no middleware ao iniciar o app
 */
export function applyAuthMiddlewareNavigation(result: AuthMiddlewareResult): void {
  if (typeof window === 'undefined') return;

  const currentHash = window.location.hash;

  if (!result.isAuthenticated || result.redirectRoute === '/login') {
    if (!currentHash.includes('login') && !currentHash.includes('landing') && !currentHash.includes('termos') && !currentHash.includes('privacidade')) {
      window.location.hash = '#landing';
    }
  } else if (result.redirectRoute === '/onboarding') {
    if (!currentHash.includes('onboarding')) {
      window.location.hash = '#onboarding';
    }
  } else if (result.isSuperAdmin && currentHash === '#landing') {
    window.location.hash = '#admin';
  }
}
