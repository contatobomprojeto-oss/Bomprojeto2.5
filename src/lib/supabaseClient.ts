import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Sanitiza a URL do Supabase caso o usuário passe com sufixos como '/rest/v1/' ou barras finais.
 * A SDK do Supabase espera a URL base do projeto (ex: https://xxx.supabase.co).
 */
export function sanitizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  return rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  'https://qcdonlhdjxoxxfwwvoxj.supabase.co';

const rawKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
  'sb_publishable_08OVnUDyzigJnsSUJ6eBPA_L6fzlu1y';

export const SUPABASE_URL = sanitizeSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY = (rawKey || '').trim();

/**
 * Cliente Singleton do Supabase configurado com persistência de sessão e auto-refresh.
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
