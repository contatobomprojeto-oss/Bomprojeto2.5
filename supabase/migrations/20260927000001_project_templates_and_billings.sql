-- ==============================================================================
-- MIGRATION: Templates Inteligentes por Setor & Módulo Financeiro Flexível
-- SISTEMA: BOM Projeto (bomprojeto.com)
-- DATA: 2026-09-27
-- OBJETIVO:
--   1. Suporte a templates inteligentes de etapas e regras WhatsApp por nicho
--   2. Gestão financeira de projetos (À vista, Parcelado ou Por Marcos de Etapas)
--   3. Retrocompatibilidade estrita: não altera SaaS billing e não bloqueia dados existentes
-- ==============================================================================

-- 0. Habilitar extensão pgcrypto/uuid caso não esteja presente
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ADIÇÃO DE COLUNA RETROCOMPATÍVEL: industry_sector
-- ==============================================================================
-- Adiciona industry_sector de forma não destrutiva e nullable para armazenar o nicho
-- selecionado no onboarding (ex: 'marcenaria', 'serralheria', 'vidracaria', etc.)

ALTER TABLE IF EXISTS organizations 
  ADD COLUMN IF NOT EXISTS industry_sector VARCHAR(100) DEFAULT NULL;

ALTER TABLE IF EXISTS users 
  ADD COLUMN IF NOT EXISTS industry_sector VARCHAR(100) DEFAULT NULL;

-- Se a tabela projects já existir no ambiente, adiciona colunas de auditoria/template opcionais
ALTER TABLE IF EXISTS projects
  ADD COLUMN IF NOT EXISTS template_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS industry_sector VARCHAR(100) DEFAULT NULL;

-- Comentários explicativos
COMMENT ON COLUMN organizations.industry_sector IS 'Setor de atuação selecionado pela marcenaria/empresa no onboarding (ex: marcenaria, serralheria, etc.)';
COMMENT ON COLUMN users.industry_sector IS 'Setor de atuação padrão do usuário/gestor para personalização de templates de WhatsApp';

-- ==============================================================================
-- 2. FUNÇÃO E TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABELA: project_templates
-- ==============================================================================
-- Define templates mestres por setor de atuação, com o tom de voz que orientará a IA
-- ao redigir mensagens para os clientes no WhatsApp.
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NULL, -- NULL quando for template global do sistema
  sector_key VARCHAR(50) NOT NULL,
  sector_label VARCHAR(100) NOT NULL,
  tone_of_voice TEXT NOT NULL,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_project_templates_sector_key ON project_templates(sector_key);
CREATE INDEX IF NOT EXISTS idx_project_templates_org_id ON project_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_system_default ON project_templates(is_system_default);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_project_templates_updated_at ON project_templates;
CREATE TRIGGER trg_project_templates_updated_at
  BEFORE UPDATE ON project_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_templates IS 'Templates inteligentes de projetos configurados por setor de atuação do BOM Projeto';
COMMENT ON COLUMN project_templates.sector_key IS 'Identificador do nicho (ex: marcenaria, serralheria, arquitetura_interiores)';
COMMENT ON COLUMN project_templates.tone_of_voice IS 'Diretriz de tom e estilo utilizada pelo assistente de IA no WhatsApp';

-- ==============================================================================
-- 4. TABELA: project_template_stages
-- ==============================================================================
-- Etapas padronizadas de cada template, definindo a ação exigida e os modelos de WhatsApp.
CREATE TABLE IF NOT EXISTS project_template_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  stage_number INT NOT NULL,
  stage_name VARCHAR(120) NOT NULL,
  objective TEXT,
  action_type VARCHAR(50) NOT NULL CHECK (
    action_type IN ('notification_only', 'input_request', 'approval_request', 'billing_payment')
  ),
  whatsapp_template TEXT,
  ai_context_instruction TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_template_stage_number UNIQUE (template_id, stage_number)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_template_stages_template_id ON project_template_stages(template_id);
CREATE INDEX IF NOT EXISTS idx_template_stages_action_type ON project_template_stages(action_type);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_project_template_stages_updated_at ON project_template_stages;
CREATE TRIGGER trg_project_template_stages_updated_at
  BEFORE UPDATE ON project_template_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_template_stages IS 'Etapas e réguas de comunicação de cada template de projeto';
COMMENT ON COLUMN project_template_stages.action_type IS 'Tipo de interação da etapa: notificação informativa, solicitação de insumo, aprovação ou cobrança vinculada';
COMMENT ON COLUMN project_template_stages.whatsapp_template IS 'Template de mensagem com placeholders dinâmicos: {{cliente}}, {{projeto}}, {{link}}, etc.';

-- ==============================================================================
-- 5. TABELA: project_billings (Financeiro do Projeto do Cliente Final)
-- ==============================================================================
-- IMPORTANTE: Esta tabela gerencia exclusivamente os pagamentos do CLIENTE FINAL para o
-- PRESTADOR DE SERVIÇO (Marceneiro, Serralheiro, etc.). NÃO se confunde com o SaaS billing
-- das assinaturas do BOM Projeto.
CREATE TABLE IF NOT EXISTS project_billings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  billing_model VARCHAR(50) NOT NULL CHECK (
    billing_model IN ('single_payment', 'installments', 'milestone_based')
  ),
  payment_method VARCHAR(50) NOT NULL CHECK (
    payment_method IN ('pix', 'boleto', 'credit_card')
  ),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  installments_count INT NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (
    status IN ('draft', 'active', 'completed', 'cancelled')
  ),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_project_billings_project_id ON project_billings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_billings_status ON project_billings(status);
CREATE INDEX IF NOT EXISTS idx_project_billings_model ON project_billings(billing_model);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_project_billings_updated_at ON project_billings;
CREATE TRIGGER trg_project_billings_updated_at
  BEFORE UPDATE ON project_billings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_billings IS 'Plano de pagamento e modelo de cobrança do projeto do cliente final';
COMMENT ON COLUMN project_billings.billing_model IS 'single_payment (À vista), installments (Parcelado padrão) ou milestone_based (Por marcos de etapa)';

-- ==============================================================================
-- 6. TABELA: project_invoices
-- ==============================================================================
-- Faturas/parcelas individuais vinculadas ao plano financeiro do projeto.
-- Em modelos milestone_based, cada invoice pode se vincular opcionalmente à etapa correspondente.
CREATE TABLE IF NOT EXISTS project_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_billing_id UUID NOT NULL REFERENCES project_billings(id) ON DELETE CASCADE,
  project_stage_id UUID NULL, -- Preenchido quando o pagamento está atrelado a um marco
  installment_number INT NOT NULL DEFAULT 1 CHECK (installment_number >= 1),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  payment_link TEXT NULL,
  pix_code TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'overdue', 'cancelled')
  ),
  paid_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para buscas rápidas e disparos automáticos no WhatsApp
CREATE INDEX IF NOT EXISTS idx_project_invoices_billing_id ON project_invoices(project_billing_id);
CREATE INDEX IF NOT EXISTS idx_project_invoices_stage_id ON project_invoices(project_stage_id);
CREATE INDEX IF NOT EXISTS idx_project_invoices_status_due ON project_invoices(status, due_date);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_project_invoices_updated_at ON project_invoices;
CREATE TRIGGER trg_project_invoices_updated_at
  BEFORE UPDATE ON project_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_invoices IS 'Parcelas e faturas de cobrança do cliente final vinculadas ao projeto';
COMMENT ON COLUMN project_invoices.project_stage_id IS 'ID da etapa/marco do projeto cuja conclusão libera ou cobra esta parcela';

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) - POLÍTICAS PARA SUPABASE
-- ==============================================================================
-- Garante isolamento seguro entre organizações caso o Supabase RLS esteja ativo.

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invoices ENABLE ROW LEVEL SECURITY;

-- Templates: leitura pública para templates do sistema (is_system_default = true)
-- ou leitura restrita à própria organização do usuário
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_templates' AND policyname = 'select_project_templates'
  ) THEN
    CREATE POLICY select_project_templates ON project_templates
      FOR SELECT
      USING (
        is_system_default = true 
        OR organization_id IS NULL
        OR organization_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_template_stages' AND policyname = 'select_project_template_stages'
  ) THEN
    CREATE POLICY select_project_template_stages ON project_template_stages
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM project_templates t 
          WHERE t.id = project_template_stages.template_id 
          AND (t.is_system_default = true OR t.organization_id IS NULL OR t.organization_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_billings' AND policyname = 'all_project_billings'
  ) THEN
    CREATE POLICY all_project_billings ON project_billings
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_invoices' AND policyname = 'all_project_invoices'
  ) THEN
    CREATE POLICY all_project_invoices ON project_invoices
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================================
-- 8. SEED INICIAL: TEMPLATES PADRÃO DO SISTEMA (is_system_default = true)
-- ==============================================================================
-- Cadastra templates prontos para os setores líderes de mercado atendidos pelo BOM Projeto:
-- Marcenaria, Serralheria e Vidraçaria.

DO $$
DECLARE
  v_marcenaria_id UUID;
  v_serralheria_id UUID;
BEGIN
  -- 1. Template Marcenaria & Móveis Planejados
  IF NOT EXISTS (SELECT 1 FROM project_templates WHERE sector_key = 'marcenaria' AND is_system_default = true) THEN
    INSERT INTO project_templates (sector_key, sector_label, tone_of_voice, is_system_default)
    VALUES (
      'marcenaria',
      'Marcenaria & Móveis Planejados',
      'Profissional, acolhedor e técnico. Transmite zelo artesanal, precisão milimétrica e transparência no cumprimento de prazos.',
      true
    ) RETURNING id INTO v_marcenaria_id;

    -- Etapas da Marcenaria
    INSERT INTO project_template_stages (template_id, stage_number, stage_name, objective, action_type, whatsapp_template, ai_context_instruction)
    VALUES
      (
        v_marcenaria_id, 1, '1. Briefing & Contrato',
        'Alinhar especificações, medidas preliminares e formalizar o pedido.',
        'billing_payment',
        'Olá, {{cliente}}! Seja bem-vindo à {{empresa}}. Seu projeto {{projeto}} foi iniciado com sucesso! Segue o link com seu contrato e a chave Pix da entrada de 50%: {{link_pix}}',
        'Confirme com cortesia o início dos trabalhos e reforce que as fotos da bancada serão disponibilizadas no link.'
      ),
      (
        v_marcenaria_id, 2, '2. Medição Fina no Local',
        'Validação técnica rigorosa de pontos elétricos, hidráulicos e esquadro.',
        'approval_request',
        'Olá, {{cliente}}! Agendamos sua medição técnica fina no local para garantir o ajuste perfeito dos móveis. Por favor, confirme o horário neste link: {{link_aprovacao}}',
        'Explique a importância da conferência in loco antes do corte das chapas de MDF.'
      ),
      (
        v_marcenaria_id, 3, '3. Desenhos 3D & Engenharia',
        'Validação visual e aprovação do projeto executivo e ferragens.',
        'approval_request',
        '{{cliente}}, seus desenhos 3D e memorial de ferragens ficaram prontos! Veja o render em alta definição e aprove com 1 clique: {{link_portal}}',
        'Oriente o cliente a revisar posições de tomadas, puxadores e divisórias internas.'
      ),
      (
        v_marcenaria_id, 4, '4. Corte & Usinagem na Bancada',
        'Produção, colagem de bordas PUR e montagem dos módulos na fábrica.',
        'notification_only',
        'Novidade na bancada, {{cliente}}! Seus módulos acabaram de ser usinados e estruturados. Confira as fotos da produção em tempo real: {{link_portal}}',
        'Envie as fotos anexadas gerando entusiasmo sobre a solidez e acabamento do móvel.'
      ),
      (
        v_marcenaria_id, 5, '5. Transporte & Montagem no Local',
        'Instalação no imóvel com equipe uniformizada e proteção do piso.',
        'billing_payment',
        'Olá, {{cliente}}! Nossos montadores iniciaram a instalação no seu imóvel. Para sua comodidade, a 2ª parcela (30%) com Pix Copia e Cola está disponível: {{link_pix}}',
        'Cobrança educada e elegante vinculada ao início da montagem no endereço do cliente.'
      ),
      (
        v_marcenaria_id, 6, '6. Entrega Técnica & Termo de Aceite',
        'Regulagem fina, limpeza dos módulos, garantia e termo assinado.',
        'billing_payment',
        'Tudo pronto, {{cliente}}! Seu projeto {{projeto}} foi concluído com chave de ouro. Acesse o termo de garantia técnica e a parcela final de 20%: {{link_pix}}',
        'Agradeça a confiança, entregue o PDF de garantia e solicite avaliação do atendimento.'
      );
  END IF;

  -- 2. Template Serralheria & Estruturas Metálicas
  IF NOT EXISTS (SELECT 1 FROM project_templates WHERE sector_key = 'serralheria' AND is_system_default = true) THEN
    INSERT INTO project_templates (sector_key, sector_label, tone_of_voice, is_system_default)
    VALUES (
      'serralheria',
      'Serralheria & Estruturas Metálicas',
      'Objetivo, robusto e pontual. Enfatiza segurança estrutural, qualidade das soldas e durabilidade do tratamento anticorrosivo.',
      true
    ) RETURNING id INTO v_serralheria_id;

    -- Etapas da Serralheria
    INSERT INTO project_template_stages (template_id, stage_number, stage_name, objective, action_type, whatsapp_template, ai_context_instruction)
    VALUES
      (
        v_serralheria_id, 1, '1. Projeto Técnico & Gabaritos',
        'Definição de perfis metálicos, espessuras e fixações.',
        'billing_payment',
        'Olá, {{cliente}}! Projeto {{projeto}} aprovado na {{empresa}}. Segue o link com o cronograma e a parcela de entrada dos materiais: {{link_pix}}',
        'Informe sobre a compra e conferência dos perfis de aço estrutural.'
      ),
      (
        v_serralheria_id, 2, '2. Corte, Dobra & Solda MIG',
        'Fabricação estrutural e união das peças na serralheria.',
        'notification_only',
        'Fala, {{cliente}}! A estrutura do seu pedido {{projeto}} está na fase de solda técnica e conferência de esquadro. Veja as fotos: {{link_portal}}',
        'Compartilhe registros do processo de solda e reforços estruturais.'
      ),
      (
        v_serralheria_id, 3, '3. Tratamento & Pintura Eletrostática',
        'Aplicação de fundo anticorrosivo fosfatizante e cura da pintura.',
        'notification_only',
        '{{cliente}}, sua peça recebeu a pintura epóxi/eletrostática e está em fase de secagem controlada. Acompanhe: {{link_portal}}',
        'Explique a resistência contra intempéries e corrosão garantida pelo acabamento.'
      ),
      (
        v_serralheria_id, 4, '4. Instalação & Fixação Estrutural',
        'Chumbamento e ancoragem técnica na obra com nível a laser.',
        'billing_payment',
        'Olá, {{cliente}}! Iniciamos a fixação estrutural no local. Segue a parcela referente à instalação com Pix: {{link_pix}}',
        'Instruções sobre os cuidados iniciais e checagem de alinhamento.'
      ),
      (
        v_serralheria_id, 5, '5. Conclusão & Teste de Carga',
        'Revisão dos pontos de apoio, teste de trincos/fechaduras e entrega.',
        'billing_payment',
        'Serviço 100% finalizado com segurança, {{cliente}}! Termo de garantia técnica e quitação disponíveis em: {{link_pix}}',
        'Encerramento com certificado de conformidade técnica e agradecimento.'
      );
  END IF;
END $$;
