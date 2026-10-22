/**
 * @file tenant_provisioning_schema.sql
 * @description Script SQL completo para provisionamento multi-tenant seguro no Supabase (PostgreSQL).
 * Inclui as tabelas profiles, tenants, tenant_memberships e a trigger handle_new_user()
 * que atribui status inicial pending_onboarding e impede escalação de privilégios.
 */

-- 1. Tabela de Perfis de Usuário (vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_onboarding', -- 'pending_onboarding', 'active', 'suspended'
    is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Tenants (Organizações / Workspaces dos Clientes)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    segment TEXT DEFAULT 'projetos',
    plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'start', 'escala'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Vínculo Tenant Memberships (Relação Usuário <-> Tenant com RBAC)
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'ceo', -- 'admin', 'ceo', 'parceiro'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_tenant UNIQUE (user_id, tenant_id)
);

-- 4. Habilitar Row Level Security (RLS) em todas as tabelas sensíveis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

-- Forçar RLS inclusive para o owner das tabelas (Hardening Zero Trust)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships FORCE ROW LEVEL SECURITY;

-- 5. Políticas RLS para Profiles
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id OR (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 6. Políticas RLS para Tenants e Memberships baseadas em associação
CREATE POLICY "Users can view tenants they belong to" 
    ON public.tenants FOR SELECT 
    USING (
        id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid())
        OR (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()) = TRUE
    );

CREATE POLICY "Users can view memberships in their tenants" 
    ON public.tenant_memberships FOR SELECT 
    USING (
        user_id = auth.uid() 
        OR tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'ceo'))
        OR (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()) = TRUE
    );

-- 7. Função e Trigger para Provisionamento Automático de Novos Usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_superadmin BOOLEAN := FALSE;
    v_email TEXT;
BEGIN
    v_email := LOWER(TRIM(NEW.email));
    
    -- Verifica se é o superadmin oficial do SaaS
    IF v_email = 'henrique.ferrazms@gmail.com' THEN
        v_is_superadmin := TRUE;
    END IF;

    -- Insere o perfil base com status 'pending_onboarding' (nunca dá acesso automático a tenants sem onboarding)
    INSERT INTO public.profiles (id, email, full_name, avatar_url, status, is_superadmin)
    VALUES (
        NEW.id,
        v_email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
        NEW.raw_user_meta_data->>'avatar_url',
        CASE WHEN v_is_superadmin THEN 'active' ELSE 'pending_onboarding' END,
        v_is_superadmin
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        is_superadmin = EXCLUDED.is_superadmin;

    RETURN NEW;
END;
$$;

-- Remove trigger anterior se existir e recria
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
