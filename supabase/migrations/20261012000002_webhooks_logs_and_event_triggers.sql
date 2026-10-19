-- ==============================================================================
-- MIGRAÇÃO SUPABASE: WEBHOOKS_LOGS E TRIGGERS DE AUDITORIA DE EVENTOS
-- ==============================================================================
-- Descrição:
-- 1. Cria a tabela 'webhooks_logs' com indexação, status, payload JSONB e metadados.
-- 2. Habilita Row Level Security (RLS) para auditoria segura.
-- 3. Configura triggers automáticas que escutam mudanças nas tabelas:
--    - 'projects': criação, avanço de etapa (current_stage), status, alertas de atenção e ativação/desativação de cobrança.
--    - 'project_invoices': geração de faturas, alterações de status de pagamento (pending -> paid/overdue), valores e vencimento.
--    - 'project_billings': configuração de novos planos de faturamento ou alteração de status/método.
-- 4. Grava logs imediatos para alimentar a IA e serviços externos (WhatsApp, Gateways, Webhooks).
-- ==============================================================================

-- 1. TABELA DE AUDITORIA: webhooks_logs
CREATE TABLE IF NOT EXISTS public.webhooks_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,            -- ex: 'project.created', 'project.stage_changed', 'payment.received', 'invoice.overdue'
  source_table VARCHAR(60) NOT NULL,           -- ex: 'projects', 'project_invoices', 'project_billings'
  record_id UUID NOT NULL,                     -- ID do registro na tabela de origem
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status VARCHAR(40) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'processed', 'failed', 'ignored'
  destination_service VARCHAR(100) DEFAULT 'ai_notification_dispatch', -- Serviço de destino ou motor da IA
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,   -- Snapshot completo dos dados (novo e antigo)
  response_payload JSONB DEFAULT NULL,         -- Retorno de resposta do webhook/IA após processamento
  retry_count INT NOT NULL DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  processed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários da tabela e colunas para documentação no Supabase
COMMENT ON TABLE public.webhooks_logs IS 'Registro e auditoria em tempo real de eventos e disparos de notificações gerados por IA e webhooks externos.';
COMMENT ON COLUMN public.webhooks_logs.event_type IS 'Tipo semântico do evento (ex: project.stage_changed, payment.received).';
COMMENT ON COLUMN public.webhooks_logs.payload IS 'Snapshot com old_data, new_data e contexto para auditoria e payload da IA.';

-- 2. ÍNDICES DE PERFORMANCE E CONSULTAS FREQUENTES
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_project_id ON public.webhooks_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_workspace_id ON public.webhooks_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_event_type ON public.webhooks_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_status ON public.webhooks_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_created_at ON public.webhooks_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_record_id ON public.webhooks_logs(record_id);

-- 3. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.webhooks_logs ENABLE ROW LEVEL SECURITY;

-- Política de leitura: usuários autenticados podem ver os logs do seu workspace ou vinculados aos seus projetos
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

-- Política de escrita: permite que triggers com SECURITY DEFINER e service_role gravem os logs
DROP POLICY IF EXISTS "Inserção de logs pelo sistema" ON public.webhooks_logs;
CREATE POLICY "Inserção de logs pelo sistema"
  ON public.webhooks_logs
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Política de atualização: para atualizar status de envio e resposta da IA
DROP POLICY IF EXISTS "Atualização de logs pelo sistema" ON public.webhooks_logs;
CREATE POLICY "Atualização de logs pelo sistema"
  ON public.webhooks_logs
  FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- 4. TRIGGER FUNCTION: log_project_events()
-- Escuta inserções e atualizações em public.projects
-- ==============================================================================
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
  -- Se for INSERT de novo projeto
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
      event_type,
      source_table,
      record_id,
      project_id,
      workspace_id,
      status,
      payload
    ) VALUES (
      v_event_type,
      'projects',
      NEW.id,
      NEW.id,
      NEW.workspace_id,
      'pending',
      v_payload
    );

    RETURN NEW;
  END IF;

  -- Se for UPDATE em projeto existente
  IF (TG_OP = 'UPDATE') THEN
    -- 1. Mudança de etapa do projeto
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
        event_type,
        source_table,
        record_id,
        project_id,
        workspace_id,
        status,
        payload
      ) VALUES (
        v_event_type,
        'projects',
        NEW.id,
        NEW.id,
        NEW.workspace_id,
        'pending',
        v_payload
      );
    END IF;

    -- 2. Mudança no status geral do projeto (ex: concluído, atrasado, cancelado)
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
        event_type,
        source_table,
        record_id,
        project_id,
        workspace_id,
        status,
        payload
      ) VALUES (
        v_event_type,
        'projects',
        NEW.id,
        NEW.id,
        NEW.workspace_id,
        'pending',
        v_payload
      );
    END IF;

    -- 3. Alerta de projeto necessitando de atenção (IA ou Marceneiro acionou)
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
        event_type,
        source_table,
        record_id,
        project_id,
        workspace_id,
        status,
        payload
      ) VALUES (
        v_event_type,
        'projects',
        NEW.id,
        NEW.id,
        NEW.workspace_id,
        'pending',
        v_payload
      );
    END IF;

    -- 4. Alteração de preferência de envio de cobranças pelo assinante
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
        event_type,
        source_table,
        record_id,
        project_id,
        workspace_id,
        status,
        payload
      ) VALUES (
        v_event_type,
        'projects',
        NEW.id,
        NEW.id,
        NEW.workspace_id,
        'pending',
        v_payload
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Criar a trigger na tabela 'projects'
DROP TRIGGER IF EXISTS trg_projects_log_events ON public.projects;
CREATE TRIGGER trg_projects_log_events
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_project_events();

-- ==============================================================================
-- 5. TRIGGER FUNCTION: log_invoice_events()
-- Escuta inserções e mudanças de status/pagamento em public.project_invoices
-- ==============================================================================
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
  -- Buscar contexto do projeto associado através de project_billings
  SELECT 
    p.id, p.workspace_id, p.code, p.client_name, p.client_phone, p.billing_notifications_enabled
  INTO 
    v_project_id, v_workspace_id, v_project_code, v_client_name, v_client_phone, v_notifications_enabled
  FROM public.project_billings pb
  JOIN public.projects p ON p.id = pb.project_id
  WHERE pb.id = COALESCE(NEW.project_billing_id, OLD.project_billing_id)
  LIMIT 1;

  -- 1. Nova Fatura Gerada (INSERT)
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
      event_type,
      source_table,
      record_id,
      project_id,
      workspace_id,
      status,
      payload
    ) VALUES (
      v_event_type,
      'project_invoices',
      NEW.id,
      v_project_id,
      v_workspace_id,
      'pending',
      v_payload
    );

    RETURN NEW;
  END IF;

  -- 2. Atualização de Fatura (UPDATE)
  IF (TG_OP = 'UPDATE') THEN
    -- Pagamento Confirmado (status mudou para 'paid')
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
        event_type,
        source_table,
        record_id,
        project_id,
        workspace_id,
        status,
        payload
      ) VALUES (
        v_event_type,
        'project_invoices',
        NEW.id,
        v_project_id,
        v_workspace_id,
        'pending',
        v_payload
      );

    -- Fatura Atrasada / Vencida (status mudou para 'overdue')
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
        event_type,
        source_table,
        record_id,
        project_id,
        workspace_id,
        status,
        payload
      ) VALUES (
        v_event_type,
        'project_invoices',
        NEW.id,
        v_project_id,
        v_workspace_id,
        'pending',
        v_payload
      );

    -- Cancelamento ou outra mudança de status
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
        event_type,
        source_table,
        record_id,
        project_id,
        workspace_id,
        status,
        payload
      ) VALUES (
        v_event_type,
        'project_invoices',
        NEW.id,
        v_project_id,
        v_workspace_id,
        'pending',
        v_payload
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Criar a trigger na tabela 'project_invoices'
DROP TRIGGER IF EXISTS trg_invoices_log_events ON public.project_invoices;
CREATE TRIGGER trg_invoices_log_events
  AFTER INSERT OR UPDATE ON public.project_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_invoice_events();

-- ==============================================================================
-- 6. TRIGGER FUNCTION: log_billing_events()
-- Escuta criação e alterações de plano financeiro em public.project_billings
-- ==============================================================================
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
  -- Buscar workspace_id e dados do projeto
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
      event_type,
      source_table,
      record_id,
      project_id,
      workspace_id,
      status,
      payload
    ) VALUES (
      v_event_type,
      'project_billings',
      NEW.id,
      NEW.project_id,
      v_workspace_id,
      'pending',
      v_payload
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
      event_type,
      source_table,
      record_id,
      project_id,
      workspace_id,
      status,
      payload
    ) VALUES (
      v_event_type,
      'project_billings',
      NEW.id,
      NEW.project_id,
      v_workspace_id,
      'pending',
      v_payload
    );

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Criar a trigger na tabela 'project_billings'
DROP TRIGGER IF EXISTS trg_billings_log_events ON public.project_billings;
CREATE TRIGGER trg_billings_log_events
  AFTER INSERT OR UPDATE ON public.project_billings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_billing_events();

-- ==============================================================================
-- 7. REPLICA IDENTITY FULL (Opcional, recomendado para Realtime e CDC completo)
-- ==============================================================================
ALTER TABLE public.webhooks_logs REPLICA IDENTITY FULL;
