import { SubscriptionPlan, BillingScheduleConfig } from '../types';

export interface PlanFeatureDetails {
  id: SubscriptionPlan;
  name: string;
  badge: string;
  tagline: string;
  priceMonthly: number;
  priceAnnualMonthly: number;
  maxActiveProjects: number;
  maxWorkspaces: number;
  maxTeamMembers: number;
  hasTeamMode: boolean;
  hasAiAutoPilot: boolean;
  hasAutomatedPixBilling: boolean;
  hasCustomPixKey: boolean;
  hasPdfReports: boolean;
  supportLevel: string;
  features: string[];
  limitations?: string[];
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanFeatureDetails> = {
  free: {
    id: 'free',
    name: 'Grátis',
    badge: 'Piloto / Teste',
    tagline: 'Para testar e conhecer no primeiro cliente',
    priceMonthly: 0,
    priceAnnualMonthly: 0,
    maxActiveProjects: 1,
    maxWorkspaces: 1,
    maxTeamMembers: 1,
    hasTeamMode: false,
    hasAiAutoPilot: false,
    hasAutomatedPixBilling: false,
    hasCustomPixKey: false,
    hasPdfReports: true,
    supportLevel: 'Comunitário & FAQ',
    features: [
      '1 Projeto ativo simultâneo',
      '1 Workspace (Matriz)',
      '1 Usuário (Titular)',
      'Envio manual de link WhatsApp sem senha',
      'Linha do tempo de etapas do projeto',
      'Fotos reais do andamento da execução',
      'Parcelas e QR Code Pix'
    ],
    limitations: [
      'Apenas 1 projeto ativo por vez',
      'Modo Time bloqueado (convites a partir do Plano Start)',
      'Sem IA de atendimento com respostas 24h automáticas',
      'Sem cobrança programada autônoma via IA',
      'Sem criação de filiais ou múltiplos workspaces'
    ]
  },
  start: {
    id: 'start',
    name: 'Start',
    badge: 'Mais Escolhido',
    tagline: 'Para profissionais e equipes em expansão comercial',
    priceMonthly: 493.87,
    priceAnnualMonthly: 411.56,
    maxActiveProjects: 8,
    maxWorkspaces: 3,
    maxTeamMembers: 3,
    hasTeamMode: true,
    hasAiAutoPilot: true,
    hasAutomatedPixBilling: true,
    hasCustomPixKey: true,
    hasPdfReports: true,
    supportLevel: 'WhatsApp Comercial',
    features: [
      'Até 8 Projetos ativos simultâneos',
      'Retenção Pró — Até 8 Projetos monitorados',
      'Até 3 Workspaces (Matriz + 2 Filiais/Setores)',
      'Modo Time: Até 3 colaboradores com permissões (CEO, Adm, Parceiro)',
      'Cobrança inteligente via WhatsApp (D-3, D-0, D+3)',
      'Geração de Pix Copia e Cola automático',
      'Assistente com IA para responder dúvidas no WhatsApp',
      'Horários preferenciais de cobrança comercial',
      'Termos de garantia técnica e relatórios em PDF',
      'Baixa automática e registro de quitação'
    ]
  },
  escala: {
    id: 'escala',
    name: 'Scala',
    badge: 'Alta Produtividade',
    tagline: 'Para empresas consolidadas com múltiplos projetos e equipes',
    priceMonthly: 983.93,
    priceAnnualMonthly: 737.95,
    maxActiveProjects: 20,
    maxWorkspaces: 6,
    maxTeamMembers: 10,
    hasTeamMode: true,
    hasAiAutoPilot: true,
    hasAutomatedPixBilling: true,
    hasCustomPixKey: true,
    hasPdfReports: true,
    supportLevel: 'WhatsApp VIP Prioritário 24/7',
    features: [
      'Até 20 Projetos ativos simultâneos',
      'Retenção Pró — Até 20 Projetos monitorados',
      'Até 6 Workspaces (Unidades e marcas integradas)',
      'Modo Time Expandido: Até 10 colaboradores com controle de cargos',
      'IA BOMProjeto 24h no WhatsApp',
      'Cobrança inteligente com escalonamento por atraso',
      'Chave Pix própria com baixa bancária instantânea',
      'Gestão multi-atendentes e times de campo',
      'Exportação financeira e relatórios executivos',
      'Suporte prioritário VIP com atendimento direto'
    ]
  }
};

/**
 * Obtém os limites e configurações de um plano específico.
 */
export function getPlanLimits(plan: SubscriptionPlan = 'start'): PlanFeatureDetails {
  return PLAN_CONFIGS[plan] || PLAN_CONFIGS['start'];
}

export function isFounderEmail(userEmail?: string): boolean {
  return (userEmail || '').toLowerCase().trim() === 'henrique.ferrazms@gmail.com';
}

/**
 * Valida se o usuário pode enviar notificações massivas com IA ou disparos em lote no WhatsApp.
 * Bloqueado no Plano Free; liberado no Start e Scala.
 */
export function canSendMassAiNotifications(
  plan: SubscriptionPlan = 'free',
  userEmail?: string
): { allowed: boolean; minPlan?: SubscriptionPlan; message?: string } {
  if (isFounderEmail(userEmail)) {
    return { allowed: true };
  }

  if (plan === 'free') {
    return {
      allowed: false,
      minPlan: 'start',
      message: 'O envio massivo e automatizado de notificações com IA é exclusivo a partir do Plano Start. Faça upgrade para avisar seus clientes no WhatsApp sem limites!'
    };
  }

  return { allowed: true };
}

/**
 * Valida se o usuário pode gerenciar múltiplos workspaces e filiais.
 * No Plano Free é permitido apenas 1 workspace (Matriz).
 * No Plano Start até 3 unidades; no Plano Scala até 6 unidades.
 */
export function canManageMultipleWorkspaces(
  plan: SubscriptionPlan = 'free',
  currentCount: number = 1,
  userEmail?: string
): { allowed: boolean; maxAllowed: number; currentCount: number; minPlan?: SubscriptionPlan; message?: string } {
  if (isFounderEmail(userEmail)) {
    return {
      allowed: true,
      maxAllowed: 99999,
      currentCount
    };
  }

  const limits = getPlanLimits(plan);
  const maxAllowed = limits.maxWorkspaces;

  if (plan === 'free' && currentCount >= 1) {
    return {
      allowed: false,
      maxAllowed: 1,
      currentCount,
      minPlan: 'start',
      message: 'A gestão de múltiplos workspaces e filiais é exclusiva a partir do Plano Start (até 3 unidades) ou Scala (até 6 unidades). No Plano Grátis você tem 1 workspace.'
    };
  }

  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      maxAllowed,
      currentCount,
      minPlan: plan === 'start' ? 'escala' : undefined,
      message: `Você atingiu o limite de ${maxAllowed} workspace(s) do Plano ${limits.name}. Faça upgrade de plano para criar unidades e filiais adicionais!`
    };
  }

  return {
    allowed: true,
    maxAllowed,
    currentCount
  };
}

/**
 * Valida se o usuário pode cadastrar mais um projeto com base na sua cota de plano.
 */
export function canCreateProject(
  plan: SubscriptionPlan = 'start', 
  activeProjectsCount: number,
  userEmail?: string
): { allowed: boolean; maxAllowed: number; currentCount: number; message?: string } {
  // Fundador Henrique Ferraz tem acesso 100% irrestrito para testes e operação
  if (userEmail?.toLowerCase().trim() === 'henrique.ferrazms@gmail.com') {
    return {
      allowed: true,
      maxAllowed: 99999,
      currentCount: activeProjectsCount
    };
  }

  const limits = getPlanLimits(plan);
  const maxAllowed = limits.maxActiveProjects;

  if (activeProjectsCount >= maxAllowed) {
    return {
      allowed: false,
      maxAllowed,
      currentCount: activeProjectsCount,
      message: `Você atingiu o limite de ${maxAllowed} projeto(s) ativo(s) do Plano ${limits.name}. Faça upgrade de plano para cadastrar novos projetos!`
    };
  }

  return {
    allowed: true,
    maxAllowed,
    currentCount: activeProjectsCount
  };
}

/**
 * Valida se o usuário pode criar mais um workspace com base na sua cota de plano.
 */
export function canCreateWorkspace(
  plan: SubscriptionPlan = 'start',
  workspacesCount: number,
  userEmail?: string
): { allowed: boolean; maxAllowed: number; currentCount: number; message?: string } {
  // Fundador Henrique Ferraz tem acesso 100% irrestrito para criação de workspaces
  if (userEmail?.toLowerCase().trim() === 'henrique.ferrazms@gmail.com') {
    return {
      allowed: true,
      maxAllowed: 99999,
      currentCount: workspacesCount
    };
  }

  const limits = getPlanLimits(plan);
  const maxAllowed = limits.maxWorkspaces;

  if (workspacesCount >= maxAllowed) {
    return {
      allowed: false,
      maxAllowed,
      currentCount: workspacesCount,
      message: `O Plano ${limits.name} permite até ${maxAllowed} workspace(s). Faça upgrade de plano para criar unidades e filiais adicionais!`
    };
  }

  return {
    allowed: true,
    maxAllowed,
    currentCount: workspacesCount
  };
}

/**
 * Valida se o usuário pode convidar membros para a equipe (Modo Time).
 * Autorizado a partir do Plano Start.
 */
export function canInviteTeamMember(
  plan: SubscriptionPlan = 'start',
  currentMembersCount: number,
  userEmail?: string
): { allowed: boolean; maxAllowed: number; currentCount: number; message?: string } {
  // Fundador Henrique Ferraz tem acesso 100% irrestrito para convidar membros
  if (userEmail?.toLowerCase().trim() === 'henrique.ferrazms@gmail.com') {
    return {
      allowed: true,
      maxAllowed: 99999,
      currentCount: currentMembersCount
    };
  }

  const limits = getPlanLimits(plan);
  const maxAllowed = limits.maxTeamMembers;

  if (!limits.hasTeamMode) {
    return {
      allowed: false,
      maxAllowed,
      currentCount: currentMembersCount,
      message: 'O Modo Time e o convite de colaboradores estão autorizados a partir do Plano Start. Faça upgrade para montar seu time!'
    };
  }

  if (currentMembersCount >= maxAllowed) {
    return {
      allowed: false,
      maxAllowed,
      currentCount: currentMembersCount,
      message: `Você atingiu o limite de ${maxAllowed} membros do Plano ${limits.name}. Faça upgrade para o Plano Scala para convidar mais colaboradores!`
    };
  }

  return {
    allowed: true,
    maxAllowed,
    currentCount: currentMembersCount
  };
}

/**
 * Valida se o horário atual está dentro da janela comercial configurada para envio de cobranças.
 */
export function isWithinBillingHours(
  schedule?: BillingScheduleConfig,
  currentDate: Date = new Date()
): { isWithin: boolean; reason?: string } {
  if (!schedule || !schedule.enabled) {
    return { isWithin: true };
  }

  // Checagem de fim de semana
  const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 6 = Sábado
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (schedule.blockWeekends && isWeekend) {
    return {
      isWithin: false,
      reason: 'Envios de cobrança bloqueados aos finais de semana. A mensagem será enfileirada para segunda-feira às ' + schedule.startTime + '.'
    };
  }

  // Checagem de dias permitidos
  const dayNames = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const currentDayCode = dayNames[dayOfWeek];
  if (schedule.allowedDays && schedule.allowedDays.length > 0 && !schedule.allowedDays.includes(currentDayCode)) {
    return {
      isWithin: false,
      reason: `Envios de cobrança não permitidos em ${currentDayCode.toUpperCase()}. Aguardando próximo dia comercial.`
    };
  }

  // Checagem de hora
  const currentHours = currentDate.getHours();
  const currentMinutes = currentDate.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  const [startH, startM] = (schedule.startTime || '09:00').split(':').map(Number);
  const startTotalMinutes = startH * 60 + (startM || 0);

  const [endH, endM] = (schedule.endTime || '18:00').split(':').map(Number);
  const endTotalMinutes = endH * 60 + (endM || 0);

  if (currentTotalMinutes < startTotalMinutes || currentTotalMinutes > endTotalMinutes) {
    return {
      isWithin: false,
      reason: `Fora da janela comercial de cobrança (${schedule.startTime} às ${schedule.endTime}). A cobrança será programada para a próxima janela comercial.`
    };
  }

  // Checagem de pausa no almoço
  if (schedule.pauseDuringLunch && schedule.lunchStart && schedule.lunchEnd) {
    const [lStartH, lStartM] = schedule.lunchStart.split(':').map(Number);
    const [lEndH, lEndM] = schedule.lunchEnd.split(':').map(Number);
    const lunchStartMinutes = lStartH * 60 + (lStartM || 0);
    const lunchEndMinutes = lEndH * 60 + (lEndM || 0);

    if (currentTotalMinutes >= lunchStartMinutes && currentTotalMinutes <= lunchEndMinutes) {
      return {
        isWithin: false,
        reason: `Pausa de almoço (${schedule.lunchStart} às ${schedule.lunchEnd}). Disparos pausados para cordialidade.`
      };
    }
  }

  return { isWithin: true };
}
