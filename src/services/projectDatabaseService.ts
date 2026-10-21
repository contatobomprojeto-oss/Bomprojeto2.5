import { supabase } from '../lib/supabaseClient';
import { Project, ProjectUpdate, ProjectStage, SupportAlert } from '../types';

export interface DatabaseResult<T> {
  data: T | null;
  error: Error | null;
}

// ==============================================================================
// 1. LEITURA (SELECT & JOINS RELACIONAIS)
// ==============================================================================

/**
 * Busca projetos com joins de etapas e faturamento.
 */
export async function getProjects(filters?: {
  workspaceId?: string;
  userId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<DatabaseResult<Project[]>> {
  try {
    let query = supabase
      .from('projects')
      .select(`
        *,
        stages:project_stages(*),
        updates:project_updates(*),
        billing:project_billings(
          *,
          invoices:project_invoices(*)
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (filters?.workspaceId && filters.workspaceId !== 'all') {
      query = query.eq('workspace_id', filters.workspaceId);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.or(`client_name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
    }

    if (filters?.limit) {
      const from = filters.offset || 0;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) throw new Error(`[Supabase SELECT Projects]: ${error.message}`);

    return { data: (data as any) || [], error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Busca projeto único por ID ou código público (#PROJ-xxx).
 */
export async function getProjectById(identifier: string): Promise<DatabaseResult<Project>> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let query = supabase
      .from('projects')
      .select(`
        *,
        stages:project_stages(*),
        updates:project_updates(*),
        documents:project_documents(*),
        billing:project_billings(
          *,
          invoices:project_invoices(*)
        )
      `);

    if (isUuid) {
      query = query.eq('id', identifier);
    } else {
      query = query.ilike('code', identifier);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw new Error(`[Supabase SELECT Project]: ${error.message}`);
    if (!data) throw new Error('Projeto não encontrado.');

    return { data: (data as any), error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

// ==============================================================================
// 2. INSERÇÃO (INSERT)
// ==============================================================================

export async function createProject(
  payload: Partial<Project>,
  stagesList: Partial<ProjectStage>[] = []
): Promise<DatabaseResult<Project>> {
  try {
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .insert({
        workspace_id: payload.workspaceId,
        user_id: payload.userId,
        code: payload.code,
        client_name: payload.clientName,
        client_phone: payload.clientPhone,
        title: payload.title,
        category: payload.category || 'media_buyer',
        status: payload.status || 'em_andamento',
        current_stage: payload.currentStage || 'Briefing',
        progress_percent: payload.progressPercent || 0,
        delivery_date: payload.deliveryDate,
        contract_date: payload.contractDate,
        total_value: payload.totalValue || 0,
        pix_key: payload.pixKey,
        pix_key_type: payload.pixKeyType,
        billing_notifications_enabled: payload.billingNotificationsEnabled ?? true,
        room_details: payload.roomDetails || {},
      })
      .select()
      .single();

    if (projErr) throw new Error(`Erro ao cadastrar projeto: ${projErr.message}`);

    if (stagesList.length > 0) {
      const stagesToInsert = stagesList.map((stg, index) => ({
        project_id: project.id,
        stage_number: index + 1,
        name: stg.name,
        description: stg.description || '',
        status: stg.status || (index === 0 ? 'current' : 'upcoming'),
        action_type: stg.action_type || 'notification_only',
        whatsapp_template: stg.whatsapp_template,
        ai_context_instruction: stg.ai_context_instruction,
      }));

      await supabase.from('project_stages').insert(stagesToInsert);
    }

    return { data: project as any, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

// ==============================================================================
// 3. ATUALIZAÇÃO (UPDATE)
// ==============================================================================

export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<DatabaseResult<Project>> {
  try {
    const formattedUpdates: Record<string, any> = {};

    if (updates.status !== undefined) formattedUpdates.status = updates.status;
    if (updates.currentStage !== undefined) formattedUpdates.current_stage = updates.currentStage;
    if (updates.progressPercent !== undefined) formattedUpdates.progress_percent = updates.progressPercent;
    if (updates.deliveryDate !== undefined) formattedUpdates.delivery_date = updates.deliveryDate;
    if (updates.totalValue !== undefined) formattedUpdates.total_value = updates.totalValue;
    if (updates.billingNotificationsEnabled !== undefined) {
      formattedUpdates.billing_notifications_enabled = updates.billingNotificationsEnabled;
    }
    if (updates.lastInteractionText !== undefined) {
      formattedUpdates.last_interaction_text = updates.lastInteractionText;
      formattedUpdates.last_interaction_date = new Date().toISOString();
    }
    if (updates.roomDetails !== undefined) formattedUpdates.room_details = updates.roomDetails;

    const { data, error } = await supabase
      .from('projects')
      .update(formattedUpdates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw new Error(`[Supabase UPDATE]: ${error.message}`);

    return { data: data as any, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

// ==============================================================================
// 4. DELEÇÃO (SOFT DELETE)
// ==============================================================================

export async function deleteProject(
  projectId: string,
  deletedBy = 'Administrador'
): Promise<DatabaseResult<boolean>> {
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        is_deleted: true,
        status: 'excluido',
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', projectId);

    if (error) throw new Error(`[Supabase DELETE]: ${error.message}`);

    return { data: true, error: null };
  } catch (err: any) {
    return { data: false, error: err };
  }
}

// ==============================================================================
// 5. TIMELINE & FOTOS DA BANCADA (project_updates)
// ==============================================================================

export async function addProjectUpdate(
  projectId: string,
  update: Omit<ProjectUpdate, 'id'>
): Promise<DatabaseResult<ProjectUpdate>> {
  try {
    const { data, error } = await supabase
      .from('project_updates')
      .insert({
        project_id: projectId,
        stage_id: update.stageId,
        stage_name: update.stageName,
        author: update.author,
        role: update.role,
        message: update.message,
        photos: update.photos || [],
        whatsapp_sent: update.whatsappSent || false,
        client_reactions: update.clientReactions || [],
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as any, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

// ==============================================================================
// 6. REALTIME (SUBSTITUTO DO onSnapshot DO FIRESTORE)
// ==============================================================================

export function subscribeToProjectRealtime(
  projectId: string,
  onUpdate: (payload: { eventType: string; newRecord: any; oldRecord: any }) => void
): () => void {
  const channel = supabase
    .channel(`project-live-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${projectId}`,
      },
      (payload) => {
        onUpdate({
          eventType: payload.eventType,
          newRecord: payload.new,
          oldRecord: payload.old,
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'project_updates',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        onUpdate({
          eventType: 'NEW_TIMELINE_UPDATE',
          newRecord: payload.new,
          oldRecord: null,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToSupportAlerts(
  onNewAlert: (alert: SupportAlert) => void
): () => void {
  const channel = supabase
    .channel('support-alerts-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'support_alerts',
      },
      (payload) => {
        onNewAlert(payload.new as any);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
