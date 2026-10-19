export interface ProjectUpdate {
  id: string;
  timestamp: string;
  author: string;
  role: string;
  stageId: string;
  stageName: string;
  message: string;
  photos: Array<{ 
    title: string; 
    url: string; 
    caption?: string; 
    type?: 'image' | 'video' | 'document'; 
    fileType?: string; 
    fileSize?: string;
  }>;
  whatsappSent: boolean;
  clientReactions?: Array<string | { emoji: string; text?: string }>;
}

export interface Installment {
  number: number;
  label: string;
  percentage: number;
  amount: number;
  status: 'paid' | 'pending';
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  authCode?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
}

export interface ProjectStage {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  date?: string;
  detail?: string;
  notes?: string;
  photoUrl?: string;
  whatsapp_template?: string;
  ai_context_instruction?: string;
  action_type?: string;
  completedBy?: string;
  completedAt?: string;
  completedByRole?: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  description?: string;
  category: 'contrato' | 'termo' | 'aditivo' | 'planta' | 'foto' | 'outro';
  uploadedAt: string;
  uploadedBy: string;
  uploadedByRole?: string;
  url: string;
}

export interface Project {
  id: string;
  code: string;
  clientName: string;
  clientPhone: string;
  title: string;
  category: 'projetos' | 'marcenaria' | 'serralheria' | 'vidracaria' | 'interiores' | 'arquitetura' | 'marmoraria' | 'reformas' | 'geral';
  templateId?: string;
  industrySector?: string;
  unit: string;
  status: 'proposta_aprovada' | 'em_andamento' | 'atencao' | 'concluido' | 'excluido';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  previousStatus?: 'proposta_aprovada' | 'em_andamento' | 'atencao' | 'concluido';
  workspaceId?: string;
  workspaceName?: string;
  workshopName?: string;
  companyCnpj?: string;
  ownerEmail?: string;
  userId?: string;
  currentStage: string;
  progressPercent: number;
  deliveryDate: string;
  contractDate: string;
  totalValue: number;
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | 'custom';
  billingNotificationsEnabled?: boolean;
  installments: Installment[];
  stages: ProjectStage[];
  updates: ProjectUpdate[];
  lastInteractionText: string;
  lastInteractionDate: string;
  lastInteractionType: 'whatsapp' | 'balcao' | 'telefone';
  whatsappDeliveryStatus?: string;
  daysWithoutUpdate: number;
  needsAttention: boolean;
  roomDetails?: {
    dimensions: string;
    finish: string;
    hardware: string;
    materials: string;
  };
  documents?: ProjectDocument[];
}

export interface SupportAlert {
  id: string;
  projectId: string;
  projectCode: string;
  clientName: string;
  clientPhone: string;
  message: string;
  timestamp: string;
  date: string;
  isRead: boolean;
}

export type ActiveView = 
  | 'landing' 
  | 'dashboard' 
  | 'admin_dashboard' 
  | 'projects_finance' 
  | 'project_detail' 
  | 'client_portal' 
  | 'whatsapp_simulator' 
  | 'ai_settings'
  | 'terms'
  | 'privacy'
  | 'retencao_pro';

export interface RetencaoPillar {
  score: number; // 0 to 100
  label: string;
  level: 'excelente' | 'bom' | 'moderado' | 'atencao' | 'critico' | 'baixo';
  description: string;
  detail: string;
  trend: 'up' | 'down' | 'stable';
  delta: number;
}

export interface SemanticWord {
  word: string;
  count: number;
  sentiment: 'positive' | 'negative';
  category?: string;
  sampleContext?: string;
}

export interface AiPlaybookAction {
  id: string;
  title: string;
  diagnosis: string;
  urgency: 'critica' | 'preventiva' | 'encantamento';
  recommendedAction: string;
  whatsappMessage: string;
  applied?: boolean;
  appliedAt?: string;
}

export interface RetencaoProjectData {
  projectId: string;
  happinessScore: number; // 0 to 100
  happinessStatus: 'verde' | 'amarelo' | 'vermelho';
  happinessStatusLabel: string;
  happinessTrend: number;
  summary: string;
  pillars: {
    communicationFriction: RetencaoPillar;
    operationalReliability: RetencaoPillar;
    perceivedValue: RetencaoPillar;
    contractualRisk: RetencaoPillar;
  };
  semanticRadar: {
    positiveCloud: SemanticWord[];
    negativeCloud: SemanticWord[];
  };
  playbook: AiPlaybookAction[];
  vocalToneAnalysis?: VocalToneAnalysis;
}

export type ChurnRisk = 'BAIXO' | 'MEDIO' | 'CRITICO';

export interface RetencaoPillarItem {
  score: number; // 0 a 100
  justification: string;
  level?: 'excelente' | 'bom' | 'moderado' | 'atencao' | 'critico' | 'baixo';
  trend?: 'up' | 'down' | 'stable';
  delta?: number;
}

export interface RetencaoPillarsAnalysis {
  communicationFriction: RetencaoPillarItem;
  operationalReliability: RetencaoPillarItem;
  perceivedValue: RetencaoPillarItem;
  contractualRisk: RetencaoPillarItem;
}

export interface RetencaoSemanticWordItem {
  text: string;
  count: number;
  sentimentWeight: number; // peso 0.0 a 1.0 ou intensidade
  category?: string;
  sampleContext?: string;
}

export interface RetencaoPrescriptiveActionItem {
  priority: 'ALTA' | 'MEDIA' | 'BAIXA' | 'CRITICA';
  diagnosis: string;
  action: string;
  whatsappTemplate: string;
}

export interface VocalToneAnalysis {
  audiosAnalyzed: number;
  toneSummary: string; // e.g. "Hesitação e dúvida sobre cronograma", "Tom caloroso e satisfeito"
  hesitationLevel?: 'nenhuma' | 'leve' | 'moderada' | 'alta';
  irritationLevel?: 'nenhuma' | 'leve' | 'moderada' | 'alta';
  satisfactionLevel?: 'baixa' | 'regular' | 'alta' | 'excelente';
  audioNotes?: string;
}

export interface RetentionAudioInput {
  filename: string;
  mimeType: string; // 'audio/ogg' | 'audio/mp3' | 'audio/mpeg' | 'audio/wav'
  base64: string;
  durationSeconds?: number;
  uploadedAt?: string;
  sender?: 'cliente' | 'equipe';
}

/**
 * Schema oficial da tabela RetencaoProAnalysis
 * O campo 'project_id' é chave obrigatória e indexada para isolamento estrito.
 */
export interface RetencaoProAnalysis {
  id: string;
  project_id: string; // Chave obrigatória e indexada
  workspace_id?: string;
  happinessScore: number; // 0 a 100
  churnRisk: ChurnRisk; // 'BAIXO' | 'MEDIO' | 'CRITICO'
  pillars: RetencaoPillarsAnalysis;
  positiveWords: RetencaoSemanticWordItem[];
  negativeWords: RetencaoSemanticWordItem[];
  prescriptiveActions: RetencaoPrescriptiveActionItem[];
  vocalToneAnalysis?: VocalToneAnalysis;
  aiModel?: string;
  analyzedAt: string;
  isContingency?: boolean;
  contingencyReason?: string;
}

export interface BillingScheduleConfig {
  enabled: boolean;
  preset: 'commercial' | 'morning' | 'afternoon' | 'custom';
  startTime: string; // ex: "09:00"
  endTime: string;   // ex: "18:00"
  allowedDays: string[]; // ['seg', 'ter', 'qua', 'qui', 'sex']
  blockWeekends: boolean;
  blockHolidays: boolean;
  pauseDuringLunch: boolean;
  lunchStart: string; // ex: "12:00"
  lunchEnd: string;   // ex: "13:30"
  queueOutOfWindow: boolean;
  timezone: string;
}

export interface AiSettingsConfig {
  autoCommunicationEnabled: boolean;
  notifyEveryUpdate: boolean;
  requireReviewForDelicate: boolean;
  tone: 'formal' | 'professional' | 'friendly' | 'informal';
  quietHoursStart: number;
  quietHoursEnd: number;
  maxPerDay: number;
  maxPerProject: number;
  responseDelayMinutes: 2 | 5 | 10 | 30;
  customPrompt: string;
  contextData: string;
  whatsappConnected: boolean;
  whatsappPhone: string;
  whatsappInstanceName: string;
  // Subscriber UAZAPI Instance Configuration
  uazapiBaseUrl?: string;
  uazapiToken?: string;
  uazapiInstanceName?: string;
  billingType: 'friendly' | 'due_date' | 'firm_notice';
  customBillingPrompt: string;
  billingTone: 'amigavel' | 'padrao' | 'firme';
  autoBillingOverdueDays: number;
  billingSchedule?: BillingScheduleConfig;
  serviceSchedule?: BillingScheduleConfig;
  // Regras de Experiência do Cliente & Alertas Visuais
  clientSupportButtonEnabled?: boolean;
  visualAlertBannerEnabled?: boolean;
  visualAlertSoundEnabled?: boolean;
  allowPortalReactions?: boolean;
  showWarrantyCertificate?: boolean;
  showWorkshopFooterSignature?: boolean;
}

export type SubscriptionPlan = 'start' | 'escala' | 'free';

export type WorkspaceSegment = 
  | 'projetos'
  | 'marcenaria' 
  | 'serralheria' 
  | 'vidracaria' 
  | 'marmoraria' 
  | 'arquitetura' 
  | 'outro';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  segment: WorkspaceSegment;
  segmentLabel: string;
  type: 'matriz' | 'filial' | 'segmento';
  city?: string;
  state?: string;
  phone?: string;
  address?: string;
  colorTheme?: string;
  isDefault?: boolean;
  activeProjectsCount?: number;
  createdAt: string;
}

export type TeamRole = 'ceo' | 'admin' | 'parceiro';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  phone?: string;
  status: 'active' | 'invited';
  workspaceAccess: 'all' | string[]; // 'all' or workspace IDs
  invitedAt: string;
  joinedAt?: string;
  invitedBy?: string;
  avatarUrl?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'marcenaria' | 'gestor' | 'client';
  teamRole?: TeamRole;
  phone?: string;
  workshopName?: string;
  projectCode?: string;
  avatarUrl?: string;
  plan?: SubscriptionPlan;
  pixKey?: string;
  pixKeyType?: string;
}

export const SAAS_OWNER_EMAIL = 'henrique.ferrazms@gmail.com';

/**
 * Funções de controle de acesso e permissões (RBAC) do Modo Time:
 * - CEO: Acesso irrestrito a todas as suas workspaces, faturamento, equipe e configurações.
 * - Administrador: Gerencia cadastro de projeto, Clientes e Notificação IA.
 * - Parceiro: Acesso somente a dados de dashboard, abertura de OS, SEM acesso a dados financeiros.
 */
export function canAccessFinancials(role: TeamRole = 'ceo'): boolean {
  return role === 'ceo' || role === 'admin';
}

export function canManageProjects(role: TeamRole = 'ceo'): boolean {
  return role === 'ceo' || role === 'admin' || role === 'parceiro';
}

export function canDeleteProject(role: TeamRole = 'ceo'): boolean {
  return role === 'ceo' || role === 'admin';
}

export function canManageAiNotifications(role: TeamRole = 'ceo'): boolean {
  return role === 'ceo' || role === 'admin';
}

export function canManageTeam(role: TeamRole = 'ceo'): boolean {
  return role === 'ceo';
}

export function canManageCompanySettings(role: TeamRole = 'ceo'): boolean {
  return role === 'ceo';
}

/**
 * Retorna as especificações de cada cargo para a UI
 */
export const TEAM_ROLE_CONFIGS: Record<TeamRole, {
  label: string;
  badge: string;
  badgeClass: string;
  description: string;
  permissionsList: string[];
}> = {
  ceo: {
    label: 'CEO',
    badge: 'Acesso Total',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Tem livre acesso a tudo de suas workspaces (gestão operacional, financeira, equipe e configurações).',
    permissionsList: [
      'Acesso irrestrito a todas as workspaces',
      'Gestão financeira completa (faturamento, parcelas, Pix)',
      'Gestão de equipe (convidar membros e alterar cargos)',
      'Configurações gerais e fiscais da empresa',
      'Cadastro de projetos e Notificações IA'
    ]
  },
  admin: {
    label: 'Administrador',
    badge: 'Projetos, Clientes & IA',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Gerencia cadastro de projeto, clientes e notificações com IA.',
    permissionsList: [
      'Cadastro e edição de projetos e etapas',
      'Diretório de clientes e contatos',
      'Configuração e disparos de Notificações com IA',
      'Acesso aos dados financeiros dos projetos',
      'Sem permissão para alterar faturamento da conta do CEO'
    ]
  },
  parceiro: {
    label: 'Parceiro',
    badge: 'Operacional (Sem Financeiro)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Acesso somente a dados de dashboard, abertura de OS, sem acesso a dados financeiros.',
    permissionsList: [
      'Acesso ao dashboard operacional de prazos e etapas',
      'Abertura de OS (cadastro de novos projetos)',
      'Visualização do status de execução em tempo real',
      'Sem acesso a faturamento, valores em R$ ou parcelas Pix',
      'Sem acesso a notificações IA e configurações fiscais'
    ]
  }
};

/**
 * Verifica estritamente se o usuário logado é o proprietário e fundador do SaaS (Henrique Ferraz).
 * Ninguém mais tem acesso ao Console do Fundador / Gestão de Dados SaaS.
 */
export function isSaasOwner(user: UserProfile | null | undefined): boolean {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === SAAS_OWNER_EMAIL.toLowerCase();
}

// Re-exportação dos tipos e schemas de persistência (Templates por Setor & Módulo Financeiro Flexível)
export * from './schemas/projectPersistenceSchemas';

export interface SecureCompanyPixConfig {
  configured: boolean;
  maskedPixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | 'custom';
  beneficiaryName: string;
  bankName: string;
  aiBillingEnabled: boolean;
  aiTone: 'profissional' | 'formal' | 'amigavel';
  aiAutoAttachQr: boolean;
  aiRemindDaysBefore: number;
  updatedAt: string;
  securityLevel?: string;
  aiCapabilities?: string[];
}
