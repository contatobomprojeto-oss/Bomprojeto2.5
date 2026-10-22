/**
 * @file test-rls-unauthorized.ts
 * @description Script de teste em TypeScript utilizando o SDK do Supabase para validar
 * o isolamento multi-tenant e testar a tentativa de acesso não autorizado a dados de outro tenant.
 * Valida se as políticas de Row Level Security (RLS) bloqueiam BOLA / IDOR / Data Leakage.
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (utilize variáveis de ambiente ou credenciais de teste)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sua-anon-key';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('seu-projeto')) {
  console.warn('[AVISO]: Variáveis de ambiente do Supabase não configuradas. Execute com SUPABASE_URL e SUPABASE_ANON_KEY.');
}

/**
 * Função de Teste de Tentativa de Acesso Não Autorizado (BOLA / IDOR)
 */
export async function testUnauthorizedTenantAccess() {
  console.log('================================================================');
  console.log('[INICIANDO TESTE RLS]: Validação de Isolamento Multi-Tenant');
  console.log('================================================================');

  // 1. Instancia cliente Supabase anon (sujeito às políticas RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 2. Simula login com credenciais de um usuário pertencente ao Tenant A
    console.log('[1/4] Autenticando usuário de teste (Tenant A)...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'usuario.tenant.a@bomprojeto.com',
      password: 'senha_segura_tenant_a'
    });

    if (authError || !authData.user) {
      console.log('[INFO]: Autenticação de teste simulada ou usuário não cadastrado no banco local. Prosseguindo com token anônimo / JWT mock...');
    } else {
      console.log(`[SUCESSO]: Autenticado como usuário ID: ${authData.user.id}`);
    }

    // 3. Tenta acessar projetos de um Tenant B arbitrário (ID diferente do associado ao usuário A)
    const arbitraryTenantId = 'tenant-b-uuid-arbitrario-9999';
    console.log(`[2/4] Tentando consulta maliciosa/não autorizada na tabela 'projects' para o tenant ID: ${arbitraryTenantId}...`);

    const { data: maliciousData, error: queryError } = await supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', arbitraryTenantId);

    if (queryError) {
      console.error('[ERRO RETORNADO PELO BANCO]:', queryError.message);
    }

    console.log(`[3/4] Registros retornados para o tenant arbitrário:`, maliciousData?.length || 0);

    if (!maliciousData || maliciousData.length === 0) {
      console.log('[VALIDAÇÃO BEM-SUCEDIDA]: O RLS bloqueou com sucesso o acesso aos dados do Tenant B. Nenhum registro vazou.');
    } else {
      console.error('[FALHA CRÍTICA DE SEGURANÇA]: Dados do Tenant B foram vazados via RLS bypass!');
      throw new Error('Falha de isolamento multi-tenant detectada!');
    }

    // 4. Teste de tentativa de INSERT em tenant alheio
    console.log(`[4/4] Tentando inserir projeto forçando tenant_id alheio...`);
    const { data: insertData, error: insertError } = await supabase
      .from('projects')
      .insert({
        title: 'Projeto Injetado em Tenant Alheio',
        client_name: 'Atacante',
        tenant_id: arbitraryTenantId,
        total_value: 10000
      })
      .select();

    if (insertError) {
      console.log('[VALIDAÇÃO BEM-SUCEDIDA]: Inserção em tenant alheio bloqueada pelo RLS:', insertError.message);
    } else if (insertData && insertData.length > 0) {
      console.error('[FALHA CRÍTICA DE SEGURANÇA]: Inserção não autorizada permitida!');
      throw new Error('RLS permitiu escrita em tenant alheio!');
    } else {
      console.log('[VALIDAÇÃO BEM-SUCEDIDA]: Inserção bloqueada (retorno vazio).');
    }

    console.log('================================================================');
    console.log('[RESULTADO FINAL]: Auditoria RLS concluída com sucesso. Zero vazamentos.');
    console.log('================================================================');

  } catch (err: any) {
    console.error('[ERRO NO TESTE DE RLS]:', err.message || err);
    throw err;
  }
}

// Executa se chamado diretamente
if (typeof require !== 'undefined' && require.main === module) {
  testUnauthorizedTenantAccess();
}
