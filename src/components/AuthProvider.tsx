/**
 * @file AuthProvider.tsx
 * @description Provedor de Autenticação com Máquina de Estados Determinística (Post-Login / Sign Up),
 * isolamento estrito de tenants, prevenção de vazamento de dados e verificação de superadmin.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { UserProfile, SAAS_OWNER_EMAIL } from '../types';

export type AuthRoutingState = 
  | 'LOADING' 
  | 'UNAUTHENTICATED' 
  | 'NEEDS_ONBOARDING' 
  | 'AUTHENTICATED' 
  | 'SUPERADMIN';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  tenant: TenantInfo | null;
  routingState: AuthRoutingState;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshTenantContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [routingState, setRoutingState] = useState<AuthRoutingState>('LOADING');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Função robusta para buscar perfil e tenant associado no Supabase de forma segura
  const resolveUserTenantAndState = useCallback(async (activeUser: User) => {
    try {
      const email = (activeUser.email || '').trim().toLowerCase();
      const isOwner = email === SAAS_OWNER_EMAIL.toLowerCase();

      // 1. Busca perfil na tabela profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUser.id)
        .maybeSingle();

      if (profileError) {
        console.warn('[AuthProvider] Erro ao buscar profile:', profileError.message);
      }

      // Se for superadmin oficial (henrique.ferrazms@gmail.com)
      if (isOwner || profileData?.is_superadmin) {
        const adminProfile: UserProfile = {
          id: activeUser.id,
          name: profileData?.full_name || activeUser.user_metadata?.name || 'Henrique Ferraz',
          email: email,
          role: 'admin',
          teamRole: 'admin',
          plan: 'escala',
          workshopName: 'Gestão de Projetos Integrada',
          avatarUrl: profileData?.avatar_url || activeUser.user_metadata?.avatar_url
        };
        setUserProfile(adminProfile);
        setTenant({
          id: 'tenant-superadmin-matriz',
          name: 'Matriz Superadmin',
          slug: 'matriz-superadmin',
          role: 'admin'
        });
        setRoutingState('SUPERADMIN');
        setIsLoading(false);
        return;
      }

      // 2. Busca associação de tenant (tenant_memberships)
      const { data: membershipData, error: membershipError } = await supabase
        .from('tenant_memberships')
        .select('tenant_id, role, tenants(id, name, slug, plan)')
        .eq('user_id', activeUser.id)
        .maybeSingle();

      if (membershipError || !membershipData || !membershipData.tenants) {
        // Caso 2: Novo Cadastro (Sign Up confirmado, mas SEM Tenant associado) -> NEEDS_ONBOARDING
        setUserProfile({
          id: activeUser.id,
          name: profileData?.full_name || activeUser.user_metadata?.name || 'Novo Usuário',
          email: email,
          role: 'media_buyer',
          teamRole: 'ceo',
          plan: 'free',
          workshopName: ''
        });
        setTenant(null);
        setRoutingState('NEEDS_ONBOARDING');
        setIsLoading(false);
        return;
      }

      // Caso 3: Usuário Cadastrado com Tenant Ativo (Cliente Regular)
      const tenantRecord: any = membershipData.tenants;
      const regularProfile: UserProfile = {
        id: activeUser.id,
        name: profileData?.full_name || activeUser.user_metadata?.name || 'Gestor',
        email: email,
        role: membershipData.role === 'admin' ? 'admin' : 'media_buyer',
        teamRole: membershipData.role as any || 'ceo',
        plan: tenantRecord.plan || 'start',
        workshopName: tenantRecord.name
      };

      setUserProfile(regularProfile);
      setTenant({
        id: tenantRecord.id,
        name: tenantRecord.name,
        slug: tenantRecord.slug,
        role: membershipData.role
      });
      setRoutingState('AUTHENTICATED');
      setIsLoading(false);

    } catch (err) {
      console.error('[AuthProvider] Falha na resolução de estado do usuário:', err);
      setRoutingState('UNAUTHENTICATED');
      setIsLoading(false);
    }
  }, []);

  const refreshTenantContext = async () => {
    if (user) {
      await resolveUserTenantAndState(user);
    }
  };

  // Inicialização e Monitoramento de Sessão com Supabase Auth
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        setIsLoading(true);
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (!isMounted) return;

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          await resolveUserTenantAndState(currentSession.user);
        } else {
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setTenant(null);
          setRoutingState('UNAUTHENTICATED');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[AuthProvider] Erro ao carregar sessão inicial:', err);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setTenant(null);
          setRoutingState('UNAUTHENTICATED');
          setIsLoading(false);
        }
      }
    }

    initSession();

    // Listener para mudanças de estado de autenticação (onAuthStateChange)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);
        if (newSession?.user) {
          setUser(newSession.user);
          await resolveUserTenantAndState(newSession.user);
        } else {
          setUser(null);
          setUserProfile(null);
          setTenant(null);
          setRoutingState('UNAUTHENTICATED');
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [resolveUserTenantAndState]);

  // Ações de Autenticação
  const signInWithGoogle = async () => {
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/#dashboard`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          }
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('[Google OAuth Error]:', err);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      // 1. Limpeza total de variáveis locais, caches e storage antes de chamar logout do Supabase
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}

      await supabase.auth.signOut();
      
      setSession(null);
      setUser(null);
      setUserProfile(null);
      setTenant(null);
      setRoutingState('UNAUTHENTICATED');
      setIsLoading(false);

      // Redireciona para login / raiz
      window.location.hash = '#landing';
    } catch (err) {
      console.error('[SignOut Error]:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userProfile,
        tenant,
        routingState,
        isLoading,
        signInWithGoogle,
        signOut,
        refreshTenantContext
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
