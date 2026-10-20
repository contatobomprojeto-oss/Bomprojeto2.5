import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { UserProfile, SAAS_OWNER_EMAIL } from '../types';

/**
 * Converte o usuário do Supabase Auth e dados da tabela profiles
 * para o formato padrão UserProfile do BomProjeto.
 */
export function mapSupabaseUserToProfile(
  sbUser: User,
  extraProfileData?: Partial<UserProfile>
): UserProfile {
  const email = (sbUser.email || '').trim().toLowerCase();
  const isOwner = email === SAAS_OWNER_EMAIL.toLowerCase();

  const userMeta = sbUser.user_metadata || {};
  let pendingRole: string | null = null;
  try {
    if (typeof window !== 'undefined') {
      pendingRole = localStorage.getItem('bomprojeto_pending_role');
      if (pendingRole) {
        localStorage.removeItem('bomprojeto_pending_role');
      }
    }
  } catch {}

  const assignedRole = isOwner
    ? 'admin'
    : (extraProfileData?.role || pendingRole || userMeta.role || 'marcenaria');

  return {
    id: sbUser.id,
    name:
      extraProfileData?.name ||
      userMeta.name ||
      userMeta.full_name ||
      (isOwner ? 'Henrique Ferraz' : 'Gestor de Projetos'),
    email: email,
    role: assignedRole,
    teamRole: extraProfileData?.teamRole || (isOwner ? 'admin' : (assignedRole === 'admin' ? 'admin' : 'ceo')),
    phone: extraProfileData?.phone || userMeta.phone,
    workshopName:
      extraProfileData?.workshopName ||
      userMeta.workshop_name ||
      (isOwner ? 'Gestão de Projetos Integrada' : 'Minha Marcenaria'),
    avatarUrl:
      extraProfileData?.avatarUrl ||
      userMeta.avatar_url ||
      userMeta.picture,
    plan: extraProfileData?.plan || 'free',
    pixKey: extraProfileData?.pixKey,
    pixKeyType: extraProfileData?.pixKeyType,
  };
}

/**
 * 1. Cadastro com E-mail e Senha
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { name?: string; workshopName?: string; role?: string }
): Promise<{ user: UserProfile | null; session: Session | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metadata?.name,
        workshop_name: metadata?.workshopName,
        role: metadata?.role || 'marcenaria',
      },
    },
  });

  if (error) throw error;
  if (!data.user) return { user: null, session: null };

  const profile = mapSupabaseUserToProfile(data.user);
  return { user: profile, session: data.session };
}

/**
 * 2. Login com E-mail e Senha
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: UserProfile; session: Session }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error('Falha ao autenticar usuário no Supabase.');
  }

  // Tenta sincronizar com o perfil salvo na tabela public.profiles se já existir
  try {
    const { data: dbProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    const profile = mapSupabaseUserToProfile(data.user, dbProfile || undefined);
    return { user: profile, session: data.session };
  } catch {
    const profile = mapSupabaseUserToProfile(data.user);
    return { user: profile, session: data.session };
  }
}

/**
 * 3. Login com Google (OAuth)
 */
export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bomprojeto.com';
  const defaultTarget = `${origin}/#dashboard`;
  const targetRedirect = redirectTo || defaultTarget;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: targetRedirect,
      queryParams: {
        prompt: 'select_account',
        access_type: 'offline',
      },
    },
  });

  if (error) {
    console.warn('[Supabase OAuth Error]:', error.message);
    throw error;
  }
}

/**
 * 4. Logout (SignOut)
 */
export async function signOutSupabase(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * 5. Observer de Estado da Sessão (onAuthStateChange)
 */
export function subscribeToAuthState(
  callback: (user: UserProfile | null, session: Session | null) => void
): () => void {
  // Verificação inicial rápida da sessão em cache
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      callback(mapSupabaseUserToProfile(session.user), session);
    } else {
      callback(null, null);
    }
  }).catch(() => {
    callback(null, null);
  });

  // Listener em tempo real
  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        try {
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          const profile = mapSupabaseUserToProfile(session.user, dbProfile || undefined);
          callback(profile, session);
        } catch {
          const profile = mapSupabaseUserToProfile(session.user);
          callback(profile, session);
        }
      } else {
        callback(null, null);
      }
    }
  );

  return () => {
    authListener.subscription.unsubscribe();
  };
}
