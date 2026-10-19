-- ==============================================================================
-- SCHEMA COMPLETO E DEFINITIVO: BOMPROJETO.COM (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Execute este script no SQL Editor do painel do seu projeto Supabase:
-- URL: https://supabase.com/dashboard/project/qcdonlhdjxoxxfwwvoxj/sql/new
--
-- Inclui:
-- 1. Extensões e Triggers de Atualização Automática
-- 2. Tabelas Core: profiles, workspaces, workspace_members
-- 3. Motor Multi-nicho: project_templates e project_template_stages
-- 4. Projetos & Acompanhamento: projects, project_stages, project_updates, project_documents
-- 5. Módulo Financeiro Flexível: project_billings, project_invoices
-- 6. Suporte & Retenção: support_alerts, retencao_pro_analyses, system_settings
-- 7. Triggers de Criação Automática de Perfil para novos cadastros (auth.users)
-- 8. Row Level Security (RLS) e Políticas de Segurança
-- 9. Índices de Alta Performance
-- 10. Seeds Iniciais de Templates por Nicho (Marcenaria, Arquitetura, Energia Solar)
-- ==============================================================================

-- 0. HABILITAR EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- FUNÇÃO UTILITÁRIA PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 1. TABELA: profiles (Espelho do auth.users com dados da marcenaria/gestor)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'marcenaria', -- 'admin', 'marcenaria', 'parceiro', 'operador'
  team_role TEXT NOT NULL DEFAULT 'admin', -- 'ceo', 'admin', 'gestor', 'montador'
  phone TEXT,
  workshop_name TEXT NOT NULL DEFAULT 'Minha Marcenaria',
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  pix_key TEXT,
  pix_key_type TEXT, -- 'cpf', 'cnpj', 'email', 'phone', 'random'
  industry_sector VARCHAR(100) DEFAULT 'marcenaria',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. TABELA: workspaces (Multi-tenant para marcenarias e escritórios)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'marcenaria',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ==============================================================================
-- 3. TABELAS: project_templates & project_template_stages (Motor Multi-nicho)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sector_key VARCHAR(50) NOT NULL, -- 'marcenaria', 'arquitetura_interiores', 'energia_solar', etc.
  sector_label VARCHAR(100) NOT NULL,
  tone_of_voice TEXT NOT NULL,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_template_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  stage_number INT NOT NULL,
  stage_name VARCHAR(150) NOT NULL,
  objective TEXT,
  action_type VARCHAR(50) NOT NULL DEFAULT 'notification_only', -- 'notification_only', 'input_request', 'approval_request', 'billing_payment'
  billing_trigger VARCHAR(50) DEFAULT 'none',
  whatsapp_template TEXT,
  ai_context_instruction TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABELA: projects (Projetos em Execução)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.project_templates(id) ON DELETE SET NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'marcenaria',
  status TEXT NOT NULL DEFAULT 'em_andamento', -- 'em_andamento', 'concluido', 'atrasado', 'pausado', 'excluido'
  current_stage TEXT NOT NULL DEFAULT 'Medição & Contrato',
  progress_percent INT NOT NULL DEFAULT 0,
  delivery_date DATE,
  contract_date DATE,
  total_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  pix_key TEXT,
  pix_key_type TEXT,
  billing_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  last_interaction_text TEXT,
  last_interaction_date TIMESTAMPTZ,
  last_interaction_type TEXT DEFAULT 'whatsapp',
  whatsapp_delivery_status TEXT DEFAULT 'sent',
  days_without_update INT DEFAULT 0,
  needs_attention BOOLEAN DEFAULT false,
  room_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABELA: project_stages (Etapas ativas do projeto)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_number INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'upcoming', -- 'completed', 'current', 'upcoming'
  action_type VARCHAR(50) NOT NULL DEFAULT 'notification_only',
  whatsapp_template TEXT,
  ai_context_instruction TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. TABELA: project_updates (Timeline, fotos da bancada e reações do cliente)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id UUID,
  stage_name TEXT,
  author TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Marceneiro',
  message TEXT NOT NULL,
  photos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  client_reactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. TABELA: project_documents (Arquivos, Projetos 3D, PDFs de Contrato)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'pdf', 'image', 'dwg', 'render'
  url TEXT NOT NULL,
  size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. TABELAS: project_billings & project_invoices (Módulo Financeiro Flexível)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.project_billings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  billing_model VARCHAR(50) NOT NULL DEFAULT 'installments', -- 'single_payment', 'installments', 'milestone_based'
  payment_method VARCHAR(50) NOT NULL DEFAULT 'pix', -- 'pix', 'boleto', 'credit_card'
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  installments_count INT NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'draft', 'active', 'completed', 'cancelled'
  pix_key TEXT,
  merchant_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_billing_id UUID NOT NULL REFERENCES public.project_billings(id) ON DELETE CASCADE,
  project_stage_id UUID REFERENCES public.project_stages(id) ON DELETE SET NULL,
  installment_number INT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL,
  payment_link TEXT,
  pix_code TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
  paid_at TIMESTAMPTZ,
  payment_method VARCHAR(50) DEFAULT 'pix',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. TABELA: support_alerts (Alertas de Dúvidas / Churn no Portal e WhatsApp)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  project_code TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  urgency_level TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  sentiment_score INT NOT NULL DEFAULT 3, -- 1 a 5
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved'
  is_read BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 10. TABELA: retencao_pro_analyses (Análise de Sentimento & Churn pela IA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.retencao_pro_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sentiment_score INT NOT NULL, -- 1 a 5
  churn_risk VARCHAR(50) NOT NULL, -- 'baixo', 'medio', 'alto', 'critico'
  summary TEXT NOT NULL,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. TABELA: system_settings (Configurações Globais do SaaS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 12. TRIGGERS DE UPDATED_AT
-- ==============================================================================
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('profiles', 'workspaces', 'project_templates', 'project_template_stages', 'projects', 'project_stages', 'project_billings', 'project_invoices')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t, t);
  END LOOP;
END;
$$;

-- ==============================================================================
-- 13. TRIGGER AUTOMÁTICO: CRIAÇÃO DE PERFIL QUANDO OCORRE AUTH.USERS SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    email,
    role,
    workshop_name,
    avatar_url
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'Gestor de Projetos'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'marcenaria'),
    COALESCE(NEW.raw_user_meta_data->>'workshop_name', 'Minha Marcenaria'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retencao_pro_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: profiles
DROP POLICY IF EXISTS "Perfis podem ser lidos por autenticados" ON public.profiles;
CREATE POLICY "Perfis podem ser lidos por autenticados" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuário edita seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuário edita seu próprio perfil" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- POLÍTICAS: workspaces
DROP POLICY IF EXISTS "Usuário vê seus workspaces" ON public.workspaces;
CREATE POLICY "Usuário vê seus workspaces" ON public.workspaces
  FOR ALL TO authenticated USING (owner_id = auth.uid());

-- POLÍTICAS: project_templates & project_template_stages (Leitura Global e por Workspace)
DROP POLICY IF EXISTS "Leitura de templates do sistema e workspace" ON public.project_templates;
CREATE POLICY "Leitura de templates do sistema e workspace" ON public.project_templates
  FOR SELECT USING (is_system_default = true OR workspace_id IS NULL OR (
    auth.role() = 'authenticated' AND workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Gestão de templates personalizados" ON public.project_templates;
CREATE POLICY "Gestão de templates personalizados" ON public.project_templates
  FOR ALL TO authenticated USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Leitura de etapas de templates" ON public.project_template_stages;
CREATE POLICY "Leitura de etapas de templates" ON public.project_template_stages
  FOR SELECT USING (true);

-- POLÍTICAS: projects
DROP POLICY IF EXISTS "Gestores autenticados gerenciam seus projetos" ON public.projects;
CREATE POLICY "Gestores autenticados gerenciam seus projetos" ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Acesso anônimo (cliente final) apenas para leitura do seu próprio projeto via código
DROP POLICY IF EXISTS "Cliente final lê projeto por código" ON public.projects;
CREATE POLICY "Cliente final lê projeto por código" ON public.projects
  FOR SELECT TO anon USING (is_deleted = false);

-- POLÍTICAS: project_stages
DROP POLICY IF EXISTS "Acesso às etapas do projeto" ON public.project_stages;
CREATE POLICY "Acesso às etapas do projeto" ON public.project_stages
  FOR ALL USING (true);

-- POLÍTICAS: project_updates
DROP POLICY IF EXISTS "Acesso a atualizações do projeto" ON public.project_updates;
CREATE POLICY "Acesso a atualizações do projeto" ON public.project_updates
  FOR ALL USING (true);

-- POLÍTICAS: project_documents
DROP POLICY IF EXISTS "Acesso a documentos do projeto" ON public.project_documents;
CREATE POLICY "Acesso a documentos do projeto" ON public.project_documents
  FOR ALL USING (true);

-- POLÍTICAS: project_billings & invoices
DROP POLICY IF EXISTS "Acesso a faturamento" ON public.project_billings;
CREATE POLICY "Acesso a faturamento" ON public.project_billings
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso a faturas" ON public.project_invoices;
CREATE POLICY "Acesso a faturas" ON public.project_invoices
  FOR ALL USING (true);

-- POLÍTICAS: support_alerts
DROP POLICY IF EXISTS "Qualquer um pode criar alerta de suporte" ON public.support_alerts;
CREATE POLICY "Qualquer um pode criar alerta de suporte" ON public.support_alerts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Gestor lê e resolve alertas" ON public.support_alerts;
CREATE POLICY "Gestor lê e resolve alertas" ON public.support_alerts
  FOR ALL TO authenticated USING (true);

-- POLÍTICAS: retencao_pro_analyses
DROP POLICY IF EXISTS "Acesso a análises de retenção" ON public.retencao_pro_analyses;
CREATE POLICY "Acesso a análises de retenção" ON public.retencao_pro_analyses
  FOR ALL TO authenticated USING (true);

-- POLÍTICAS: system_settings
DROP POLICY IF EXISTS "Leitura de configurações" ON public.system_settings;
CREATE POLICY "Leitura de configurações" ON public.system_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestão de configurações" ON public.system_settings;
CREATE POLICY "Gestão de configurações" ON public.system_settings
  FOR ALL TO authenticated USING (true);

-- ==============================================================================
-- 15. ÍNDICES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_code ON public.projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_is_deleted ON public.projects(is_deleted);
CREATE INDEX IF NOT EXISTS idx_project_stages_project_id ON public.project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON public.project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_billings_project_id ON public.project_billings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invoices_billing_id ON public.project_invoices(project_billing_id);
CREATE INDEX IF NOT EXISTS idx_support_alerts_project_id ON public.support_alerts(project_id);

-- ==============================================================================
-- 16. SEED INICIAL: TEMPLATES MESTRES POR NICHO
-- ==============================================================================

-- NICHO 1: MARCENARIA DE ALTO PADRÃO
DO $$
DECLARE
  v_tpl_marcenaria UUID;
  v_tpl_arquitetura UUID;
  v_tpl_solar UUID;
BEGIN
  -- Template Marcenaria
  INSERT INTO public.project_templates (sector_key, sector_label, tone_of_voice, is_system_default)
  VALUES (
    'marcenaria',
    'Marcenaria de Alto Padrão / Movelaria Sob Medida',
    'Artesanal, sofisticado, técnico e tranquilizador. Valoriza a precisão milimétrica e a alta marcenaria.',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_tpl_marcenaria;

  IF v_tpl_marcenaria IS NOT NULL THEN
    INSERT INTO public.project_template_stages (template_id, stage_number, stage_name, objective, action_type, billing_trigger, whatsapp_template, ai_context_instruction)
    VALUES
      (v_tpl_marcenaria, 1, 'Medição Fina & Contrato', 'Validação das cotas milimétricas in loco e formalização contratual', 'billing_payment', 'entry_fee', 'Olá, {{client_name}}! Medição técnica concluída com sucesso. Seu projeto sob medida entrou em nosso cronograma!', 'Reforce que a precisão da medição garante o encaixe perfeito.'),
      (v_tpl_marcenaria, 2, 'Aprovação do Projeto Executivo 3D', 'Aprovação final de padrões de MDF, ferragens e desenho técnico', 'approval_request', 'none', '{{client_name}}, o projeto 3D e a escolha dos acabamentos estão prontos para sua validação!', 'Apresente os padrões escolhidos com entusiasmo.'),
      (v_tpl_marcenaria, 3, 'Produção & Corte em Fábrica', 'Corte, colagem de borda e pré-montagem na oficina', 'notification_only', 'none', 'Boas notícias! As peças do seu projeto já estão em usinagem na fábrica.', 'Envie fotos de máquinas em operação para reduzir ansiedade de espera.'),
      (v_tpl_marcenaria, 4, 'Faturamento de Fabricação', 'Liberação financeira pós-produção antes da logística', 'billing_payment', 'milestone', 'Seu mobiliário foi 100% fabricado e revisado no controle de qualidade. Segue o fechamento da etapa de produção.', 'Transmita confiança de entrega no prazo.'),
      (v_tpl_marcenaria, 5, 'Transporte & Montagem Residencial', 'Instalação cuidadosa com proteção de piso e equipe identificada', 'notification_only', 'none', 'Nossa equipe de montagem já está a caminho com seus móveis! Chegaremos no horário combinado com toda proteção de piso.', 'Destaque o zelo pela casa do cliente.'),
      (v_tpl_marcenaria, 6, 'Vistoria Final & Termo de Aceite', 'Check-list de regulagem de portas e entrega das chaves dos armários', 'approval_request', 'final_payment', 'Montagem finalizada! Vamos realizar o check-list de entrega e regulagem fina.', 'Celebre a conquista da nova casa.');
  END IF;

  -- Template Arquitetura
  INSERT INTO public.project_templates (sector_key, sector_label, tone_of_voice, is_system_default)
  VALUES (
    'arquitetura_interiores',
    'Arquitetura & Design de Interiores',
    'Elegante, conceitual, consultivo e focado em bem-estar e estética.',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_tpl_arquitetura;

  IF v_tpl_arquitetura IS NOT NULL THEN
    INSERT INTO public.project_template_stages (template_id, stage_number, stage_name, objective, action_type, billing_trigger, whatsapp_template, ai_context_instruction)
    VALUES
      (v_tpl_arquitetura, 1, 'Briefing & Levantamento Técnico', 'Alinhamento de expectativas e coleta das necessidades do espaço', 'billing_payment', 'entry_fee', 'Olá, {{client_name}}! Iniciamos o desenvolvimento do conceito arquitetônico do seu ambiente.', 'Estimule a co-criação.'),
      (v_tpl_arquitetura, 2, 'Estudo Preliminar & Moodboard', 'Apresentação de layouts e paleta de sensações', 'approval_request', 'none', 'Seu Estudo Preliminar e Moodboard estão prontos para avaliação!', 'Explique a intenção estética e funcional.'),
      (v_tpl_arquitetura, 3, 'Anteprojeto & Render 3D', 'Imagens realistas e definição de revestimentos', 'approval_request', 'none', 'Prepare-se para se apaixonar: os renders 3D do seu novo espaço estão liberados!', 'Lembre dos limites contratuais de revisões com elegância.'),
      (v_tpl_arquitetura, 4, 'Projeto Executivo Detalhado', 'Pranchas técnicas de elétrica, hidráulica, paginação e iluminação', 'billing_payment', 'milestone', 'O caderno técnico do Projeto Executivo está finalizado para guiar a obra.', 'Ressalte o detalhamento que evita desperdícios na obra.'),
      (v_tpl_arquitetura, 5, 'Acompanhamento & Vistoria Técnica', 'Visitas à obra e conferência de execução dos parceiros', 'notification_only', 'none', 'Visita técnica realizada hoje na obra. Tudo transcorrendo conforme o cronograma!', 'Demonstre presença e controle de qualidade.');
  END IF;

  -- Template Energia Solar
  INSERT INTO public.project_templates (sector_key, sector_label, tone_of_voice, is_system_default)
  VALUES (
    'energia_solar',
    'Energia Solar Fotovoltaica',
    'Técnico, seguro, sustentável e focado em economia e conformidade regulatória.',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_tpl_solar;

  IF v_tpl_solar IS NOT NULL THEN
    INSERT INTO public.project_template_stages (template_id, stage_number, stage_name, objective, action_type, billing_trigger, whatsapp_template, ai_context_instruction)
    VALUES
      (v_tpl_solar, 1, 'Visita Técnica & Dimensionamento', 'Avaliação do telhado, quadro geral e padrão de entrada', 'billing_payment', 'entry_fee', 'Olá, {{client_name}}! Dimensionamento solar concluído e projeto de engenharia iniciado.', 'Destaque a segurança estrutural e elétrica.'),
      (v_tpl_solar, 2, 'Protocolo de Acesso na Concessionária', 'Submissão do parecer de acesso aos órgãos reguladores', 'notification_only', 'none', 'Protocolo de solicitação de acesso submetido com sucesso junto à distribuidora de energia.', 'Mantenha o cliente ciente do prazo legal da concessionária.'),
      (v_tpl_solar, 3, 'Instalação dos Módulos & Inversor', 'Fixação da estrutura, cabeamento e fixação dos inversores', 'billing_payment', 'milestone', 'Equipe de eletricistas finalizou a instalação dos seus módulos solares no telhado!', 'Envie fotos dos painéis instalados.'),
      (v_tpl_solar, 4, 'Vistoria da Concessionária & Troca do Medidor', 'Conexão à rede elétrica e homologação do relógio bidirecional', 'notification_only', 'none', 'A concessionária agendou a vistoria para ativação do seu medidor bidirecional.', 'Explique o funcionamento da injeção de créditos.'),
      (v_tpl_solar, 5, 'Ativação & Monitoramento no App', 'Geração de energia ligada e monitoramento de economia ativo', 'approval_request', 'final_payment', 'Parabéns! Sua usina solar está gerando energia limpa e reduzindo sua conta em até 95%.', 'Comemore o início da economia na fatura.');
  END IF;
END;
$$;

-- ==============================================================================
-- 12. TABELA: webhooks_logs E TRIGGERS DE AUDITORIA DE IA E PAGAMENTOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.webhooks_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  source_table VARCHAR(60) NOT NULL,
  record_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  destination_service VARCHAR(100) DEFAULT 'ai_notification_dispatch',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB DEFAULT NULL,
  retry_count INT NOT NULL DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  processed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_logs_project_id ON public.webhooks_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_workspace_id ON public.webhooks_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_event_type ON public.webhooks_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_status ON public.webhooks_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_created_at ON public.webhooks_logs(created_at DESC);

ALTER TABLE public.webhooks_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de logs de auditoria por membros" ON public.webhooks_logs;
CREATE POLICY "Leitura de logs de auditoria por membros"
  ON public.webhooks_logs
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    OR project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Inserção de logs pelo sistema" ON public.webhooks_logs;
CREATE POLICY "Inserção de logs pelo sistema"
  ON public.webhooks_logs
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Atualização de logs pelo sistema" ON public.webhooks_logs;
CREATE POLICY "Atualização de logs pelo sistema"
  ON public.webhooks_logs
  FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Trigger Function para Projects
CREATE OR REPLACE FUNCTION public.fn_log_project_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type VARCHAR(100);
  v_payload JSONB;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_event_type := 'project.created';
    v_payload := jsonb_build_object(
      'action', 'INSERT',
      'project_code', NEW.code,
      'client_name', NEW.client_name,
      'client_phone', NEW.client_phone,
      'current_stage', NEW.current_stage,
      'status', NEW.status,
      'total_value', NEW.total_value,
      'billing_notifications_enabled', NEW.billing_notifications_enabled,
      'created_at', NEW.created_at,
      'data', to_jsonb(NEW)
    );

    INSERT INTO public.webhooks_logs (
      event_type, source_table, record_id, project_id, workspace_id, status, payload
    ) VALUES (
      v_event_type, 'projects', NEW.id, NEW.id, NEW.workspace_id, 'pending', v_payload
    );

    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.current_stage IS DISTINCT FROM NEW.current_stage) THEN
      v_event_type := 'project.stage_changed';
      v_payload := jsonb_build_object(
        'action', 'UPDATE',
        'event', 'stage_change',
        'project_code', NEW.code,
        'client_name', NEW.client_name,
        'client_phone', NEW.client_phone,
        'old_stage', OLD.current_stage,
        'new_stage', NEW.current_stage,
        'progress_percent', NEW.progress_percent,
        'billing_notifications_enabled', NEW.billing_notifications_enabled,
        'timestamp', NOW()
      );

      INSERT INTO public.webhooks_logs (
        event_type, source_table, record_id, project_id, workspace_id, status, payload
      ) VALUES (
        v_event_type, 'projects', NEW.id, NEW.id, NEW.workspace_id, 'pending', v_payload
      );
    END IF;

    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      v_event_type := 'project.status_changed';
      v_payload := jsonb_build_object(
        'action', 'UPDATE',
        'event', 'status_change',
        'project_code', NEW.code,
        'client_name', NEW.client_name,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'timestamp', NOW()
      );

      INSERT INTO public.webhooks_logs (
        event_type, source_table, record_id, project_id, workspace_id, status, payload
      ) VALUES (
        v_event_type, 'projects', NEW.id, NEW.id, NEW.workspace_id, 'pending', v_payload
      );
    END IF;

    IF (OLD.needs_attention IS DISTINCT FROM NEW.needs_attention AND NEW.needs_attention = true) THEN
      v_event_type := 'project.needs_attention';
      v_payload := jsonb_build_object(
        'action', 'UPDATE',
        'event', 'attention_required',
        'project_code', NEW.code,
        'client_name', NEW.client_name,
        'days_without_update', NEW.days_without_update,
        'timestamp', NOW()
      );

      INSERT INTO public.webhooks_logs (
        event_type, source_table, record_id, project_id, workspace_id, status, payload
      ) VALUES (
        v_event_type, 'projects', NEW.id, NEW.id, NEW.workspace_id, 'pending', v_payload
      );
    END IF;

    IF (OLD.billing_notifications_enabled IS DISTINCT FROM NEW.billing_notifications_enabled) THEN
      v_event_type := CASE 
        WHEN NEW.billing_notifications_enabled THEN 'project.billing_notifications_enabled'
        ELSE 'project.billing_notifications_disabled'
      END;
      v_payload := jsonb_build_object(
        'action', 'UPDATE',
        'event', 'billing_notification_preference_changed',
        'project_code', NEW.code,
        'client_name', NEW.client_name,
        'billing_notifications_enabled', NEW.billing_notifications_enabled,
        'timestamp', NOW()
      );

      INSERT INTO public.webhooks_logs (
        event_type, source_table, record_id, project_id, workspace_id, status, payload
      ) VALUES (
        v_event_type, 'projects', NEW.id, NEW.id, NEW.workspace_id, 'pending', v_payload
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_log_events ON public.projects;
CREATE TRIGGER trg_projects_log_events
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_project_events();

-- Trigger Function para Invoices (Pagamentos)
CREATE OR REPLACE FUNCTION public.fn_log_invoice_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_workspace_id UUID;
  v_project_code TEXT;
  v_client_name TEXT;
  v_client_phone TEXT;
  v_notifications_enabled BOOLEAN;
  v_event_type VARCHAR(100);
  v_payload JSONB;
BEGIN
  SELECT 
    p.id, p.workspace_id, p.code, p.client_name, p.client_phone, p.billing_notifications_enabled
  INTO 
    v_project_id, v_workspace_id, v_project_code, v_client_name, v_client_phone, v_notifications_enabled
  FROM public.project_billings pb
  JOIN public.projects p ON p.id = pb.project_id
  WHERE pb.id = COALESCE(NEW.project_billing_id, OLD.project_billing_id)
  LIMIT 1;

  IF (TG_OP = 'INSERT') THEN
    v_event_type := 'invoice.created';
    v_payload := jsonb_build_object(
      'action', 'INSERT',
      'invoice_id', NEW.id,
      'installment_number', NEW.installment_number,
      'description', NEW.description,
      'amount', NEW.amount,
      'due_date', NEW.due_date,
      'status', NEW.status,
      'payment_method', NEW.payment_method,
      'payment_link', NEW.payment_link,
      'project_code', v_project_code,
      'client_name', v_client_name,
      'client_phone', v_client_phone,
      'billing_notifications_enabled', COALESCE(v_notifications_enabled, true),
      'timestamp', NOW()
    );

    INSERT INTO public.webhooks_logs (
      event_type, source_table, record_id, project_id, workspace_id, status, payload
    ) VALUES (
      v_event_type, 'project_invoices', NEW.id, v_project_id, v_workspace_id, 'pending', v_payload
    );

    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid') THEN
      v_event_type := 'payment.received';
      v_payload := jsonb_build_object(
        'action', 'UPDATE',
        'event', 'payment_confirmed',
        'invoice_id', NEW.id,
        'installment_number', NEW.installment_number,
        'description', NEW.description,
        'amount', NEW.amount,
        'due_date', NEW.due_date,
        'paid_at', COALESCE(NEW.paid_at, NOW()),
        'payment_method', NEW.payment_method,
        'project_code', v_project_code,
        'client_name', v_client_name,
        'client_phone', v_client_phone,
        'billing_notifications_enabled', COALESCE(v_notifications_enabled, true),
        'timestamp', NOW()
      );

      INSERT INTO public.webhooks_logs (
        event_type, source_table, record_id, project_id, workspace_id, status, payload
      ) VALUES (
        v_event_type, 'project_invoices', NEW.id, v_project_id, v_workspace_id, 'pending', v_payload
      );

    ELSIF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'overdue') THEN
      v_event_type := 'invoice.overdue';
      v_payload := jsonb_build_object(
        'action', 'UPDATE',
        'event', 'payment_overdue',
        'invoice_id', NEW.id,
        'installment_number', NEW.installment_number,
        'amount', NEW.amount,
        'due_date', NEW.due_date,
        'project_code', v_project_code,
        'client_name', v_client_name,
        'client_phone', v_client_phone,
        'billing_notifications_enabled', COALESCE(v_notifications_enabled, true),
        'timestamp', NOW()
      );

      INSERT INTO public.webhooks_logs (
        event_type, source_table, record_id, project_id, workspace_id, status, payload
      ) VALUES (
        v_event_type, 'project_invoices', NEW.id, v_project_id, v_workspace_id, 'pending', v_payload
      );

    ELSIF (OLD.status IS DISTINCT FROM NEW.status) THEN
      v_event_type := 'invoice.status_changed';
      v_payload := jsonb_build_object(
        'action', 'UPDATE',
        'invoice_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'amount', NEW.amount,
        'project_code', v_project_code,
        'client_name', v_client_name,
        'timestamp', NOW()
      );

      INSERT INTO public.webhooks_logs (
        event_type, source_table, record_id, project_id, workspace_id, status, payload
      ) VALUES (
        v_event_type, 'project_invoices', NEW.id, v_project_id, v_workspace_id, 'pending', v_payload
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_log_events ON public.project_invoices;
CREATE TRIGGER trg_invoices_log_events
  AFTER INSERT OR UPDATE ON public.project_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_invoice_events();

-- Trigger Function para Billings
CREATE OR REPLACE FUNCTION public.fn_log_billing_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_project_code TEXT;
  v_client_name TEXT;
  v_event_type VARCHAR(100);
  v_payload JSONB;
BEGIN
  SELECT workspace_id, code, client_name 
  INTO v_workspace_id, v_project_code, v_client_name
  FROM public.projects
  WHERE id = COALESCE(NEW.project_id, OLD.project_id)
  LIMIT 1;

  IF (TG_OP = 'INSERT') THEN
    v_event_type := 'billing.configured';
    v_payload := jsonb_build_object(
      'action', 'INSERT',
      'billing_id', NEW.id,
      'project_id', NEW.project_id,
      'project_code', v_project_code,
      'client_name', v_client_name,
      'billing_model', NEW.billing_model,
      'payment_method', NEW.payment_method,
      'total_amount', NEW.total_amount,
      'installments_count', NEW.installments_count,
      'status', NEW.status,
      'timestamp', NOW()
    );

    INSERT INTO public.webhooks_logs (
      event_type, source_table, record_id, project_id, workspace_id, status, payload
    ) VALUES (
      v_event_type, 'project_billings', NEW.id, NEW.project_id, v_workspace_id, 'pending', v_payload
    );

    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.total_amount IS DISTINCT FROM NEW.total_amount)) THEN
    v_event_type := 'billing.updated';
    v_payload := jsonb_build_object(
      'action', 'UPDATE',
      'billing_id', NEW.id,
      'project_id', NEW.project_id,
      'project_code', v_project_code,
      'client_name', v_client_name,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_amount', OLD.total_amount,
      'new_amount', NEW.total_amount,
      'timestamp', NOW()
    );

    INSERT INTO public.webhooks_logs (
      event_type, source_table, record_id, project_id, workspace_id, status, payload
    ) VALUES (
      v_event_type, 'project_billings', NEW.id, NEW.project_id, v_workspace_id, 'pending', v_payload
    );

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_billings_log_events ON public.project_billings;
CREATE TRIGGER trg_billings_log_events
  AFTER INSERT OR UPDATE ON public.project_billings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_billing_events();

-- FIM DO SCRIPT
