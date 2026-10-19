import { useMemo, useCallback } from 'react';
import { SubscriptionPlan } from '../types';
import {
  getPlanLimits,
  PlanFeatureDetails,
  isFounderEmail,
  canSendMassAiNotifications,
  canManageMultipleWorkspaces,
  canCreateProject,
  canInviteTeamMember
} from '../utils/planRules';

export type GuardFeatureKey =
  | 'mass_ai_notifications'
  | 'multiple_workspaces'
  | 'ai_autopilot'
  | 'team_mode'
  | 'automated_pix_billing'
  | 'pdf_reports'
  | 'custom_pix_key'
  | 'unlimited_projects';

export interface GuardCheckResult {
  allowed: boolean;
  message?: string;
  minPlan?: SubscriptionPlan;
  maxAllowed?: number;
  currentCount?: number;
}

export interface UseSubscriptionGuardOptions {
  plan?: SubscriptionPlan;
  userEmail?: string;
  onOpenUpgradeModal?: () => void;
  onBlockedNotice?: (message: string, minPlan?: SubscriptionPlan) => void;
}

export interface UseSubscriptionGuardReturn {
  // Estado e dados do plano
  plan: SubscriptionPlan;
  isFree: boolean;
  isStart: boolean;
  isEscala: boolean;
  isPaid: boolean;
  isFounder: boolean;
  planDetails: PlanFeatureDetails;

  // Validações diretas para regras essenciais
  canSendMassAiNotifications: () => GuardCheckResult;
  canManageMultipleWorkspaces: (currentCount?: number) => GuardCheckResult;
  canCreateNewProject: (currentCount: number) => GuardCheckResult;
  canInviteTeamMembers: (currentCount: number) => GuardCheckResult;

  // Verificações genéricas por chave de feature
  canAccess: (feature: GuardFeatureKey) => boolean;
  checkAccess: (feature: GuardFeatureKey, currentCount?: number) => GuardCheckResult;

  // Executor com proteção automática (executa se liberado; exibe aviso/modal se bloqueado)
  guardAction: (
    feature: GuardFeatureKey,
    onAllowed: () => void,
    customBlockedMsg?: string
  ) => boolean;
}

/**
 * Hook de validação de acesso 'useSubscriptionGuard'
 * Verifica o plano do usuário (free vs start/escala) antes de liberar
 * funcionalidades como envio massivo de notificações IA ou gestão de múltiplos workspaces.
 */
export function useSubscriptionGuard(
  options: UseSubscriptionGuardOptions = {}
): UseSubscriptionGuardReturn {
  // Resolução do plano: prop explícita ou fallback via localStorage
  const resolvedPlan: SubscriptionPlan = useMemo(() => {
    if (options.plan) return options.plan;
    try {
      const stored = localStorage.getItem('bomprojeto_plan');
      if (stored === 'free' || stored === 'start' || stored === 'escala') {
        return stored;
      }
    } catch {}
    return 'free';
  }, [options.plan]);

  // Resolução do email para verificação do fundador Henrique Ferraz
  const resolvedEmail: string = useMemo(() => {
    if (options.userEmail) return options.userEmail;
    try {
      return localStorage.getItem('bomprojeto_user_email') || '';
    } catch {}
    return '';
  }, [options.userEmail]);

  const isFounder = useMemo(() => isFounderEmail(resolvedEmail), [resolvedEmail]);
  const isFree = useMemo(() => resolvedPlan === 'free' && !isFounder, [resolvedPlan, isFounder]);
  const isStart = useMemo(() => resolvedPlan === 'start' || isFounder, [resolvedPlan, isFounder]);
  const isEscala = useMemo(() => resolvedPlan === 'escala' || isFounder, [resolvedPlan, isFounder]);
  const isPaid = useMemo(() => resolvedPlan !== 'free' || isFounder, [resolvedPlan, isFounder]);

  const planDetails = useMemo(() => getPlanLimits(resolvedPlan), [resolvedPlan]);

  // Validação: Envio massivo de notificações com IA
  const checkMassAiNotifications = useCallback((): GuardCheckResult => {
    return canSendMassAiNotifications(resolvedPlan, resolvedEmail);
  }, [resolvedPlan, resolvedEmail]);

  // Validação: Gestão de múltiplos workspaces
  const checkMultipleWorkspaces = useCallback((currentCount: number = 1): GuardCheckResult => {
    return canManageMultipleWorkspaces(resolvedPlan, currentCount, resolvedEmail);
  }, [resolvedPlan, resolvedEmail]);

  // Validação: Criação de novo projeto
  const checkCreateNewProject = useCallback((currentCount: number): GuardCheckResult => {
    return canCreateProject(resolvedPlan, currentCount, resolvedEmail);
  }, [resolvedPlan, resolvedEmail]);

  // Validação: Convite de membros para a equipe
  const checkInviteTeamMembers = useCallback((currentCount: number): GuardCheckResult => {
    return canInviteTeamMember(resolvedPlan, currentCount, resolvedEmail);
  }, [resolvedPlan, resolvedEmail]);

  // Checagem genérica detalhada por feature
  const checkAccess = useCallback((feature: GuardFeatureKey, currentCount: number = 0): GuardCheckResult => {
    if (isFounder) {
      return { allowed: true };
    }

    switch (feature) {
      case 'mass_ai_notifications':
        return checkMassAiNotifications();

      case 'multiple_workspaces':
        return checkMultipleWorkspaces(currentCount || 1);

      case 'ai_autopilot':
        if (!planDetails.hasAiAutoPilot) {
          return {
            allowed: false,
            minPlan: 'start',
            message: 'O Piloto Automático de mensagens IA exige o Plano Start ou Scala.'
          };
        }
        return { allowed: true };

      case 'team_mode':
        if (!planDetails.hasTeamMode) {
          return {
            allowed: false,
            minPlan: 'start',
            message: 'O Modo Time e gestão de múltiplos usuários está disponível a partir do Plano Start.'
          };
        }
        return { allowed: true };

      case 'automated_pix_billing':
        if (!planDetails.hasAutomatedPixBilling) {
          return {
            allowed: false,
            minPlan: 'start',
            message: 'A cobrança automatizada Pix no WhatsApp está disponível nos Planos Start e Scala.'
          };
        }
        return { allowed: true };

      case 'custom_pix_key':
        if (!planDetails.hasCustomPixKey) {
          return {
            allowed: false,
            minPlan: 'start',
            message: 'O uso de chave Pix customizada exige o Plano Start ou Scala.'
          };
        }
        return { allowed: true };

      case 'unlimited_projects':
        if (resolvedPlan !== 'escala') {
          return {
            allowed: false,
            minPlan: 'escala',
            message: 'Projetos simultâneos ilimitados são exclusivos do Plano Scala.'
          };
        }
        return { allowed: true };

      case 'pdf_reports':
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }, [isFounder, checkMassAiNotifications, checkMultipleWorkspaces, planDetails, resolvedPlan]);

  // Verificação booleana rápida
  const canAccess = useCallback((feature: GuardFeatureKey): boolean => {
    return checkAccess(feature).allowed;
  }, [checkAccess]);

  // Executor com proteção automática (guard action)
  const guardAction = useCallback((
    feature: GuardFeatureKey,
    onAllowed: () => void,
    customBlockedMsg?: string
  ): boolean => {
    const result = checkAccess(feature);
    if (result.allowed) {
      onAllowed();
      return true;
    }

    const message = customBlockedMsg || result.message || 'Funcionalidade indisponível no seu plano atual.';

    if (options.onBlockedNotice) {
      options.onBlockedNotice(message, result.minPlan);
    }

    if (options.onOpenUpgradeModal) {
      options.onOpenUpgradeModal();
    }

    return false;
  }, [checkAccess, options]);

  return {
    plan: resolvedPlan,
    isFree,
    isStart,
    isEscala,
    isPaid,
    isFounder,
    planDetails,
    canSendMassAiNotifications: checkMassAiNotifications,
    canManageMultipleWorkspaces: checkMultipleWorkspaces,
    canCreateNewProject: checkCreateNewProject,
    canInviteTeamMembers: checkInviteTeamMembers,
    canAccess,
    checkAccess,
    guardAction
  };
}

export default useSubscriptionGuard;
