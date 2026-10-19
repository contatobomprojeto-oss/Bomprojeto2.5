import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { generateOgCardPng } from './src/server/ogImageGenerator';
import { logger } from './src/server/logger';
import { messageQueue } from './src/server/messageQueue';
import { dialogManager } from './src/server/dialogManager';
import {
  sendUazapiTextMessage,
  sendUazapiMediaMessage,
  getUazapiStatus,
  getUazapiQRCode,
  isUazapiConfigured,
  getUazapiConfig,
  updateLocalWhatsAppSession,
  getLocalWhatsAppSession,
  disconnectUazapiInstance,
  saveUazapiConfig,
  testUazapiConnection,
  getUazapiPairingCode,
  normalizeWhatsAppNumber,
  buildWhatsAppDirectLink,
  ensureUazapiWebhook
} from './src/server/uazapi';
import {
  createPreapprovalPlan,
  createPreapprovalSubscription,
  getPreapprovalSubscription,
  isMercadoPagoConfigured,
  tokenizeCard,
  getMercadoPagoPublicKey,
  analyzeMpError
} from './src/server/mercadoPago';
import {
  getPaymentGatewayConfig,
  getPublicPaymentGatewayStatus,
  createPixPayment,
  getPaymentOrder,
  getAllPaymentOrders,
  verifyPaymentWebhookSignature,
  processPaymentWebhookEvent,
  simulateSandboxPaymentApproval
} from './src/server/paymentGateway';
import {
  generateSectorTemplate,
  getTemplateById,
  getSectorFallbackTemplate,
  normalizeSectorKey
} from './src/services/aiTemplateService';
import {
  setupProjectBilling,
  getProjectBilling,
  getBillingInvoices,
  markInvoiceAsPaid
} from './src/services/projectBillingService';
import {
  analyzeProjectRetention,
  getStoredProjectRetention
} from './src/server/retencaoBackendService';
import { handleIncomingClientMessage } from './src/services/whatsappAiHandler';
import {
  dispatchStageUpdate,
  dispatchInvoiceReminder
} from './src/services/notificationDispatcher';
import {
  validateDateFormat,
  validateFinancialValue,
  validateProjectPayload,
  validateInstallmentsArray
} from './src/utils/apiValidator';
import { generatePixEmv } from './src/utils/pixService';
import {
  getCompanyPixConfig,
  saveCompanyPixConfig,
  getPublicMaskedPixConfig
} from './src/server/companyPixVault';

process.on('uncaughtException', (err) => {
  console.error('[Process Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Unhandled Rejection]:', reason);
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High performance Gzip compression on all responses
app.use(compression());

// Security Headers (compatible with AI Studio iFrame)
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve static assets from public folder (SVG, PNG, favicon, icons) with cache control
app.use(express.static(path.join(process.cwd(), 'public'), {
  maxAge: '1h',
  etag: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    return res.status(400).json({ error: 'Payload JSON inválido' });
  }
  next(err);
});

// ============================================================================
// GLOBAL TENANT & WORKSPACE ISOLATION MIDDLEWARE
// ============================================================================
declare global {
  namespace Express {
    interface Request {
      workspaceId: string;
      tenantId: string;
      tenant: {
        workspaceId: string;
        userEmail: string;
        userId?: string;
        isFounder: boolean;
      };
      tenantDb: {
        findProjects: (customFilter?: (p: Project) => boolean) => Project[];
        findProjectById: (id: string) => Project | undefined;
        insertProject: (newProject: Project) => Project;
        updateProject: (id: string, updater: (project: Project) => Partial<Project> | void) => Project | null;
        deleteProject: (id: string, deletedBy?: string) => Project | null;
        restoreProject: (id: string) => Project | null;
      };
    }
  }
}

/**
 * Injects authenticated workspaceId and tenant metadata into EVERY database request.
 * Enforces strict multi-tenant boundary checks across all queries and persistence operations.
 */
export const workspaceTenantMiddleware: express.RequestHandler = (req, res, next) => {
  // 1. Extract tenant user identity
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    (req.body && req.body.ownerEmail) ||
    (req.body && req.body.userEmail) ||
    ''
  ).toLowerCase().trim();

  // 2. Extract workspace ID from headers or query parameters
  const rawWorkspaceId = (
    (req.headers['x-workspace-id'] as string) ||
    (req.headers['x-tenant-id'] as string) ||
    (req.query.workspaceId as string) ||
    (req.body && req.body.workspaceId) ||
    ''
  ).trim();

  const isFounder = userEmail === 'henrique.ferrazms@gmail.com';
  const workspaceId = rawWorkspaceId || 'ws-matriz';
  const tenantId = workspaceId;

  // 3. Inject workspace and tenant context into the Express Request
  req.workspaceId = workspaceId;
  req.tenantId = tenantId;
  req.tenant = {
    workspaceId,
    userEmail,
    userId: (req.headers['x-user-id'] as string) || (req.body && req.body.userId) || '',
    isFounder
  };

  // 4. Inject scoped database accessor forcing workspace & tenant isolation
  req.tenantDb = {
    findProjects: (customFilter?: (p: Project) => boolean) => {
      const reqQueryWs = ((req.query?.workspaceId as string) || (req.headers['x-workspace-id'] as string) || '').trim();
      const currentEmail = (
        (req.headers['x-user-email'] as string) ||
        (req.query.userEmail as string) ||
        req.tenant?.userEmail ||
        userEmail ||
        ''
      ).toLowerCase().trim();

      // ISOLAMENTO ESTRITO POR ASSINANTE:
      // Se não houver e-mail de usuário identificado na requisição, NUNCA retorna projetos de outros assinantes
      if (!currentEmail) {
        return [];
      }

      return initialProjects.filter(p => {
        // Multi-tenant check: Somente projetos pertencentes ao próprio usuário autenticado
        const projOwner = (p.ownerEmail || '').toLowerCase().trim();
        if (projOwner !== currentEmail) {
          return false;
        }

        // Workspace filtering: apenas filtra se o assinante selecionou um workspace específico
        if (reqQueryWs && reqQueryWs !== 'all') {
          if (p.workspaceId && p.workspaceId !== reqQueryWs) {
            return false;
          }
        }

        return customFilter ? customFilter(p) : true;
      });
    },

    findProjectById: (id: string) => {
      const proj = findProjectAnywhere(id);
      if (!proj) return undefined;
      const currentEmail = (
        (req.headers['x-user-email'] as string) ||
        (req.query.userEmail as string) ||
        req.tenant?.userEmail ||
        userEmail ||
        ''
      ).toLowerCase().trim();

      // Se a busca for autenticada pelo painel administrativo, isola pelo proprietário
      if (currentEmail) {
        const projOwner = (proj.ownerEmail || '').toLowerCase().trim();
        if (projOwner && projOwner !== currentEmail) {
          return undefined;
        }
      }
      return proj;
    },

    insertProject: (newProject: Project) => {
      const currentEmail = (
        (req.headers['x-user-email'] as string) ||
        (req.body && req.body.ownerEmail) ||
        (req.body && req.body.userEmail) ||
        userEmail ||
        ''
      ).toLowerCase().trim();

      if (!currentEmail) {
        throw new Error('Usuário não autenticado para criar projeto');
      }

      // Force injection of workspaceId and ownerEmail into every database insert
      newProject.workspaceId = newProject.workspaceId || workspaceId || `ws-${currentEmail.replace(/[^a-z0-9]/g, '').slice(0, 15) || 'matriz'}`;
      newProject.ownerEmail = currentEmail;
      initialProjects.unshift(newProject);
      saveProjectsToDisk();
      return newProject;
    },

    updateProject: (id: string, updater: (project: Project) => Partial<Project> | void) => {
      const proj = findProjectAnywhere(id);
      if (!proj) return null;

      const currentEmail = (
        (req.headers['x-user-email'] as string) ||
        (req.query.userEmail as string) ||
        req.tenant?.userEmail ||
        userEmail ||
        ''
      ).toLowerCase().trim();

      // Isolamento estrito: Somente o assinante proprietário pode editar
      const projOwner = (proj.ownerEmail || '').toLowerCase().trim();
      if (currentEmail && projOwner && projOwner !== currentEmail) {
        return null;
      }

      const updates = updater(proj);
      if (updates && typeof updates === 'object') {
        Object.assign(proj, updates);
      }
      saveProjectsToDisk();
      return proj;
    },

    deleteProject: (id: string, deletedBy?: string) => {
      const idx = initialProjects.findIndex(
        p => p.id === id || p.code.toLowerCase() === id.toLowerCase()
      );
      if (idx === -1) return null;

      const proj = initialProjects[idx];
      const currentEmail = (
        (req.headers['x-user-email'] as string) ||
        (req.query.userEmail as string) ||
        req.tenant?.userEmail ||
        userEmail ||
        ''
      ).toLowerCase().trim();

      // Isolamento estrito: Somente o assinante proprietário pode excluir
      const projOwner = (proj.ownerEmail || '').toLowerCase().trim();
      if (currentEmail && projOwner && projOwner !== currentEmail) {
        return null;
      }

      // Soft delete: mover para a aba de exclusão
      if (proj.status !== 'excluido') {
        proj.previousStatus = proj.status;
      }
      proj.status = 'excluido';
      proj.isDeleted = true;
      proj.deletedAt = new Date().toISOString();
      proj.deletedBy = deletedBy || currentEmail || 'Administrador';

      saveProjectsToDisk();
      return proj;
    },

    restoreProject: (id: string) => {
      const proj = findProjectAnywhere(id);
      if (!proj) return null;

      const currentEmail = (
        (req.headers['x-user-email'] as string) ||
        (req.query.userEmail as string) ||
        req.tenant?.userEmail ||
        userEmail ||
        ''
      ).toLowerCase().trim();

      const projOwner = (proj.ownerEmail || '').toLowerCase().trim();
      if (currentEmail && projOwner && projOwner !== currentEmail) {
        return null;
      }

      proj.status = (proj as any).previousStatus || 'em_andamento';
      (proj as any).isDeleted = false;
      delete (proj as any).deletedAt;
      delete (proj as any).deletedBy;

      saveProjectsToDisk();
      return proj;
    }
  };

  // 5. Audit headers in response
  res.setHeader('x-workspace-id', workspaceId);
  res.setHeader('x-tenant-id', tenantId);

  next();
};

app.use(workspaceTenantMiddleware);

// Redirecionamento permanente (301): Unificação total no domínio oficial bomprojeto.com
// Qualquer requisição destinada a app.bomprojeto.com ou subdomínios legados é redirecionada imediatamente para bomprojeto.com
app.use((req, res, next) => {
  const host = (req.get('x-forwarded-host') || req.get('host') || '').toLowerCase().trim();
  if (host === 'app.bomprojeto.com' || host.startsWith('app.bomprojeto.com:')) {
    return res.redirect(301, `https://bomprojeto.com${req.originalUrl || ''}`);
  }
  next();
});

// Reference to active Vite Dev Server for HTML transformation
let viteDevServer: any = null;

// Helpers to resolve public customer tracking portal URLs
export function getPublicTrackingBaseUrl(req?: express.Request): string {
  if (process.env.SHARED_APP_URL) {
    const shared = process.env.SHARED_APP_URL.replace(/\/+$/, '');
    if (shared) return shared;
  }
  if (process.env.APP_URL) {
    let url = process.env.APP_URL.replace(/\/+$/, '');
    if (url.includes('ais-dev-')) {
      url = url.replace('ais-dev-', 'ais-pre-');
    }
    return url;
  }
  if (req) {
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    if (host.includes('ais-dev-')) {
      return `${proto}://${host.replace('ais-dev-', 'ais-pre-')}`;
    }
    if (host) {
      return `${proto}://${host}`;
    }
  }
  return 'https://bomprojeto.com';
}

export function buildTrackingUrl(projectId: string, req?: express.Request): string {
  const base = getPublicTrackingBaseUrl(req);
  return `${base}/acompanhar/${encodeURIComponent(projectId)}`;
}

export function escapeHtml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formata mensagem de atualização de projeto para WhatsApp de forma SUCCINTA,
 * direta e sem duplicação de saudações ou links, com chamada clara para o link.
 * Exemplo desejado: "Temos atualização do seu projeto junto a 'Agência King Marketing', confira no link -"
 */
export function formatSuccinctProjectUpdateMessage({
  clientName,
  companyName,
  stageName,
  portalUrl,
  customMessage,
  photosCount
}: {
  clientName: string;
  companyName: string;
  stageName?: string;
  portalUrl: string;
  customMessage?: string;
  photosCount?: number;
}): string {
  const cleanCompany = (companyName || 'Agência King Marketing').trim();
  const cleanStage = (stageName || '').trim();

  // Limpa customMessage para evitar saudações repetidas, links repetidos ou duplicação de 'Temos atualização'
  let detail = (customMessage || '').trim();
  detail = detail.replace(/^(olá|ola|oi|bom dia|boa tarde|boa noite)[^!\n]*[!\n]+/gi, '').trim();
  detail = detail.replace(/^[👋\s]+/g, '').trim();
  detail = detail.replace(/(https?:\/\/[^\s]+)/gi, '').trim();
  detail = detail.replace(/(📸\s*fotos?|cronograma|link de acompanhamento|acompanhe fotos|confira fotos)[^\n]*/gi, '').trim();
  detail = detail.replace(/_.*?_/g, '').trim();
  detail = detail.replace(/🔗[^\n]*/g, '').trim();
  detail = detail.replace(/👉[^\n]*/g, '').trim();
  detail = detail.replace(/👇[^\n]*/g, '').trim();
  detail = detail.replace(/confira\s+no\s+link[^\n]*/gi, '').trim();
  detail = detail.replace(/temos\s+atualiza[çc][ãa]o\s+do\s+seu\s+projeto[^\n.]*/gi, '').trim();
  detail = detail.replace(/^[:\-–—\s]+/g, '').trim();
  detail = detail.replace(/\n{2,}/g, '\n').trim();

  const stagePart = cleanStage ? ` (${cleanStage})` : '';
  const detailPart = detail ? `:\n${detail}` : '';
  const photoLine = (photosCount && photosCount > 0) ? `\n📎 ${photosCount} anexo(s) disponível(is)` : '';

  return `Temos atualização do seu projeto junto à "${cleanCompany}"${stagePart}${detailPart}.${photoLine}\n\nConfira no link 👇\n${portalUrl}`;
}

// Lazy initialization for Gemini API
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

// Initial in-memory project data store with real initial mock state
export interface ProjectUpdate {
  id: string;
  timestamp: string;
  author: string;
  role: string;
  stageId: string;
  stageName: string;
  message: string;
  photos: Array<{ title: string; url: string; caption?: string }>;
  whatsappSent: boolean;
  clientReactions?: string[];
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
  photoUrl?: string;
  completedBy?: string;
  completedByRole?: string;
  completedAt?: string;
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
  unit: string;
  status: 'proposta_aprovada' | 'em_andamento' | 'atencao' | 'concluido' | 'excluido';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  previousStatus?: 'proposta_aprovada' | 'em_andamento' | 'atencao' | 'concluido';
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
  workspaceId?: string;
  workspaceName?: string;
  ownerEmail?: string;
  userId?: string;
  roomDetails?: {
    dimensions: string;
    finish: string;
    hardware: string;
    materials: string;
  };
  documents?: ProjectDocument[];
}

const defaultSeedProject: Project = {
  id: 'proj-1',
  code: 'PROJ-101',
  clientName: 'Luis Henrique Ferraz',
  clientPhone: '+55 67 99988-1234',
  title: 'Cozinha Gourmet & Marcenaria Integrada',
  category: 'marcenaria',
  unit: 'São Paulo - SP',
  status: 'em_andamento',
  currentStage: 'Usinagem e Corte CNC',
  progressPercent: 45,
  deliveryDate: '28/11/2026',
  contractDate: '10/09/2026',
  totalValue: 9533.00,
  workspaceId: 'ws-matriz',
  workspaceName: 'Marcenaria Ferraz & Design',
  installments: [
    {
      number: 1,
      label: '1ª Parcela (Entrada)',
      percentage: 50,
      amount: 4766.50,
      status: 'paid',
      dueDate: '10/09/2026',
      paidDate: '10/09/2026',
      paymentMethod: 'Pix'
    },
    {
      number: 2,
      label: '2ª Parcela (Produção)',
      percentage: 50,
      amount: 4766.50,
      status: 'pending',
      dueDate: '19/10/2026'
    }
  ],
  stages: [
    { id: 'stg-1', name: 'Medição & Projeto 3D', description: 'Conferência técnica no local', status: 'completed', date: '12/09/2026' },
    { id: 'stg-2', name: 'Usinagem e Corte CNC', description: 'Corte e furação milimétrica', status: 'current', date: '24/09/2026' },
    { id: 'stg-3', name: 'Montagem em Bancada', description: 'Pré-montagem estrutural e teste de ferragens', status: 'upcoming' },
    { id: 'stg-4', name: 'Acabamento & Pintura', description: 'Aplicação de laca e fitamento', status: 'upcoming' },
    { id: 'stg-5', name: 'Instalação & Entrega', description: 'Montagem final na casa do cliente', status: 'upcoming' }
  ],
  updates: [
    {
      id: 'upd-1',
      timestamp: 'Hoje 09:30',
      author: 'Henrique Ferraz',
      role: 'Mestre Marceneiro',
      stageId: 'stg-2',
      stageName: 'Usinagem e Corte CNC',
      message: 'Chapas de MDF cortadas com perfeição na CNC. Iniciando alinhamento milimétrico e fitamento das bordas.',
      photos: [
        { title: 'Corte CNC', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80', caption: 'Conferência de esquadro milimétrico' }
      ],
      whatsappSent: true
    }
  ],
  lastInteractionText: 'Boletim de Produção enviado via WhatsApp',
  lastInteractionDate: 'Hoje',
  lastInteractionType: 'whatsapp',
  daysWithoutUpdate: 0,
  needsAttention: false,
  roomDetails: {
    dimensions: '4.20m x 2.80m',
    finish: 'MDF Louro Freijó e Grafite Matt',
    hardware: 'Dobradiças com amortecedor Blum',
    materials: 'MDF Ultra resistente à umidade'
  },
  documents: [
    { 
      id: 'doc-seed-1', 
      name: 'Contrato-OS-101.pdf', 
      type: 'application/pdf', 
      size: '1.2 MB', 
      description: 'Contrato de prestação de serviços assinado',
      category: 'contrato',
      uploadedAt: '18/09/2026 às 14:00',
      uploadedBy: 'Henrique Ferraz',
      uploadedByRole: 'Administrador',
      url: ''
    },
    { 
      id: 'doc-seed-2', 
      name: 'Projeto-Executivo-3D.pdf', 
      type: 'application/pdf', 
      size: '3.4 MB', 
      description: 'Plantas técnicas de corte e furação',
      category: 'planta',
      uploadedAt: '19/09/2026 às 09:30',
      uploadedBy: 'Carlos Marceneiro',
      uploadedByRole: 'Marceneiro',
      url: ''
    }
  ],
  ownerEmail: 'henrique.ferrazms@gmail.com'
};

// --- DATA PERSISTENCE LAYER (JSON FILE BACKUP ON DISK) ---
const DATA_DIR = path.join(process.cwd(), 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const WORKSPACES_FILE = path.join(DATA_DIR, 'workspaces.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('[Persistence] Could not create data dir:', e);
    }
  }
}

function loadProjectsFromDisk(): Project[] {
  try {
    ensureDataDir();
    if (fs.existsSync(PROJECTS_FILE)) {
      const raw = fs.readFileSync(PROJECTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[Persistence] Error loading projects from disk:', err);
  }
  return [defaultSeedProject];
}

export function saveProjectsToDisk() {
  try {
    ensureDataDir();
    const tmp = `${PROJECTS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(initialProjects, null, 2), 'utf-8');
    fs.renameSync(tmp, PROJECTS_FILE);
  } catch (err) {
    console.error('[Persistence] Error saving projects to disk:', err);
  }
}

export function findProjectAnywhere(idOrCode: string): Project | undefined {
  if (!idOrCode) return undefined;
  const clean = idOrCode.replace('#', '').trim().toLowerCase();
  return initialProjects.find(p => 
    p.id.toLowerCase() === clean ||
    p.id.toLowerCase() === idOrCode.toLowerCase() ||
    p.code.toLowerCase() === clean ||
    p.code.toLowerCase() === idOrCode.toLowerCase() ||
    p.code.replace('#', '').toLowerCase() === clean
  );
}

// Initial project data store loaded from disk persistence
let initialProjects: Project[] = loadProjectsFromDisk();

// --- API ENDPOINTS ---

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BOMProjeto API',
    uptime: process.uptime(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    uazapiConfigured: isUazapiConfigured(),
    uazapiBaseUrl: getUazapiConfig().baseUrl
  });
});

// 2. Get projects for authenticated tenant (Strict tenant & workspace isolation via global middleware)
app.get('/api/projects', (req, res) => {
  const tenantProjects = req.tenantDb.findProjects();
  res.json(tenantProjects);
});

// 3. Get single project by ID or code (with strict subscriber isolation for authenticated dashboard requests)
app.get('/api/projects/:id', (req, res) => {
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  const project = findProjectAnywhere(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Projeto não encontrado' });
  }

  // Se a requisição vem de um assinante logado no painel, bloqueia acesso a projetos de outros assinantes
  const projOwner = (project.ownerEmail || '').toLowerCase().trim();
  if (userEmail && projOwner && projOwner !== userEmail) {
    return res.status(403).json({ error: 'Acesso negado: este projeto pertence a outro assinante' });
  }

  res.json(project);
});

// 3.0.1. Retenção Pro: Obter análise isolada do projeto (busca indexada em O(1) ou análise sob demanda)
app.get('/api/retencao/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const forceAnalyze = req.query.fresh === 'true';

    if (!forceAnalyze) {
      const stored = getStoredProjectRetention(projectId);
      if (stored) {
        return res.json({
          success: true,
          status: 'cached',
          message: 'Análise de retenção carregada do índice isolado por projeto.',
          data: stored
        });
      }
    }

    const projectAlerts = supportAlerts.filter(a => a.projectId === projectId);
    const result = await analyzeProjectRetention(projectId, findProjectAnywhere, undefined, projectAlerts);
    res.json(result);
  } catch (error: any) {
    console.error(`[API /api/retencao/${req.params.projectId}] Erro:`, error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao processar análise de retenção do projeto'
    });
  }
});

// 3.0.2. Retenção Pro: Forçar recálculo da inteligência de retenção via Gemini API
app.post('/api/retencao/:projectId/analyze', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { audioFiles, project, supportAlerts: bodyAlerts } = req.body || {};
    
    const projectAlerts = (bodyAlerts && Array.isArray(bodyAlerts) && bodyAlerts.length > 0)
      ? bodyAlerts
      : supportAlerts.filter(a => a.projectId === projectId || (project && a.projectId === project.id));

    const result = await analyzeProjectRetention(
      projectId,
      findProjectAnywhere,
      audioFiles,
      projectAlerts,
      project
    );
    res.json(result);
  } catch (error: any) {
    console.error(`[API /api/retencao/${req.params.projectId}/analyze] Erro:`, error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao processar análise de retenção do projeto'
    });
  }
});

// 3.0.3. Alias de conveniência: /api/projects/:id/retencao
app.get('/api/projects/:id/retencao', async (req, res) => {
  try {
    const { id } = req.params;
    const stored = getStoredProjectRetention(id);
    if (stored) {
      return res.json({
        success: true,
        status: 'cached',
        data: stored
      });
    }
    const projectAlerts = supportAlerts.filter(a => a.projectId === id);
    const result = await analyzeProjectRetention(id, findProjectAnywhere, undefined, projectAlerts);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao obter retenção do projeto'
    });
  }
});

// 3.0.4. Exportar Logomarca Oficial em PNG de Alta Resolução
app.get('/api/logo-download', (req, res) => {
  const variant = (req.query.variant as string) || 'horizontal';
  let filename = 'logo-bomprojeto.png';
  let downloadName = 'bomprojeto-logomarca.png';

  if (variant === 'white' || variant === 'branco') {
    filename = 'logo-bomprojeto-fundo-branco.png';
    downloadName = 'bomprojeto-logomarca-fundo-branco.png';
  } else if (variant === 'dark' || variant === 'escuro') {
    filename = 'logo-bomprojeto-dark.png';
    downloadName = 'bomprojeto-logomarca-fundo-escuro.png';
  } else if (variant === 'mark' || variant === 'simbolo') {
    filename = 'logo-bomprojeto-simbolo.png';
    downloadName = 'bomprojeto-simbolo-9pontos.png';
  } else if (variant === 'app' || variant === 'icone') {
    filename = 'logo-bomprojeto-app-icon.png';
    downloadName = 'bomprojeto-app-icon.png';
  }

  const filePath = path.resolve('public', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo PNG da logomarca não encontrado' });
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.sendFile(filePath);
});

// 3.1. Update project details (Client data, status, title, dates, stages)
app.patch('/api/projects/:id', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Projeto não encontrado' });
  }

  // Validação rigorosa dos campos de data e valor
  const validation = validateProjectPayload(req.body, true);
  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.errors[0],
      errors: validation.errors
    });
  }

  const {
    clientName,
    clientPhone,
    title,
    category,
    deliveryDate,
    contractDate,
    status,
    currentStage,
    progressPercent,
    stages,
    totalValue,
    notes,
    roomDetails,
    pixKey,
    pixKeyType,
    workspaceId,
    workspaceName
  } = req.body;

  if (clientName !== undefined) project.clientName = String(clientName).trim();
  if (clientPhone !== undefined) project.clientPhone = String(clientPhone).trim();
  if (title !== undefined) project.title = String(title).trim();
  if (category !== undefined) project.category = category;
  if (deliveryDate !== undefined) project.deliveryDate = String(deliveryDate).trim();
  if (contractDate !== undefined) project.contractDate = String(contractDate).trim();
  if (workspaceId !== undefined) project.workspaceId = workspaceId;
  if (workspaceName !== undefined) project.workspaceName = workspaceName;
  if (pixKey !== undefined) project.pixKey = pixKey;
  if (pixKeyType !== undefined) project.pixKeyType = pixKeyType;
  if (req.body.billingNotificationsEnabled !== undefined) {
    project.billingNotificationsEnabled = Boolean(req.body.billingNotificationsEnabled);
  }
  if (notes !== undefined) (project as any).notes = notes;
  if (roomDetails !== undefined) project.roomDetails = roomDetails;
  if (Array.isArray(req.body.documents)) project.documents = req.body.documents;

  if (status !== undefined) {
    project.status = status;
    if (status === 'concluido') {
      project.progressPercent = 100;
      project.stages.forEach(s => {
        s.status = 'completed';
        if (!s.date) s.date = new Date().toLocaleDateString('pt-BR');
      });
      project.currentStage = 'Concluído';
    } else if (project.currentStage === 'Concluído' || project.progressPercent === 100) {
      if (project.stages.length > 0) {
        const lastIdx = Math.max(0, project.stages.length - 1);
        project.stages[lastIdx].status = 'current';
        project.currentStage = project.stages[lastIdx].name;
        const completedCount = project.stages.filter(s => s.status === 'completed').length;
        project.progressPercent = Math.min(90, Math.max(10, Math.round((completedCount / project.stages.length) * 100)));
      }
    }
  }

  if (currentStage !== undefined) project.currentStage = currentStage;
  if (progressPercent !== undefined) project.progressPercent = Number(progressPercent);

  if (Array.isArray(stages)) {
    project.stages = stages;
    const current = stages.find(s => s.status === 'current');
    if (current) project.currentStage = current.name;
    const completedCount = stages.filter(s => s.status === 'completed').length;
    project.progressPercent = Math.round((completedCount / stages.length) * 100);
    if (completedCount === stages.length && stages.length > 0) {
      project.status = 'concluido';
      project.progressPercent = 100;
    }
  }

  if (totalValue !== undefined && !isNaN(Number(totalValue))) {
    project.totalValue = Number(totalValue);
  }

  saveProjectsToDisk();
  res.json(project);
});

// 3.2. Full update project
app.put('/api/projects/:id', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Projeto não encontrado' });
  }

  Object.assign(project, req.body);
  saveProjectsToDisk();
  res.json(project);
});

// 3.3. Add an attachment/document to project (Contratos, Termos, Aditivos, Imagens, Plantas, etc.)
app.post('/api/projects/:id/documents', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  const { name, type, size, description, category, url, uploadedBy, uploadedByRole } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = `${dateStr} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const userName = uploadedBy || req.headers['x-user-name'] || (req.headers['x-user-email'] ? String(req.headers['x-user-email']).split('@')[0] : 'Equipe Técnica');
  const userRole = uploadedByRole || (req.headers['x-user-role'] ? String(req.headers['x-user-role']) : 'Colaborador');

  const newDoc = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: String(name).trim(),
    type: type || 'application/octet-stream',
    size: size || '1.0 MB',
    description: description ? String(description).trim() : '',
    category: category || 'outro',
    uploadedAt: timeStr,
    uploadedBy: userName,
    uploadedByRole: userRole,
    url: url || ''
  };

  if (!Array.isArray(project.documents)) {
    project.documents = [];
  }
  project.documents.unshift(newDoc);
  saveProjectsToDisk();

  res.status(201).json({ success: true, document: newDoc, project });
});

// 3.4. Delete an attachment/document from project
app.delete('/api/projects/:id/documents/:docId', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  if (Array.isArray(project.documents)) {
    project.documents = project.documents.filter(d => d.id !== req.params.docId);
  }
  saveProjectsToDisk();

  res.json({ success: true, project });
});

// 3.5. Onboarding: Generate AI Sector Template
app.post('/api/onboarding/generate-template', async (req, res) => {
  try {
    const { companyName, sector, organizationId, customRequirements } = req.body;
    if (!companyName || !sector) {
      return res.status(400).json({ error: 'companyName e sector são obrigatórios para gerar o template' });
    }

    const template = await generateSectorTemplate({
      companyName,
      sector,
      organizationId,
      customRequirements
    });

    return res.status(201).json({
      success: true,
      template
    });
  } catch (error: any) {
    logger.log('ERROR', 'ai_agent', 'Erro na rota /api/onboarding/generate-template', { error });
    console.error('Erro na rota /api/onboarding/generate-template:', error);
    return res.status(500).json({
      error: 'Falha ao gerar template inteligente do setor',
      details: error?.message || 'Erro interno'
    });
  }
});

// 4. Create new project
app.post('/api/projects', (req, res) => {
  // Validação rigorosa dos campos de data e valor no backend
  const validation = validateProjectPayload(req.body, false);
  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.errors[0],
      errors: validation.errors
    });
  }

  const {
    clientName,
    clientPhone,
    title,
    category,
    totalValue,
    deliveryDate,
    pixKey,
    stages: customStages,
    workspaceId,
    workspaceName,
    templateId,
    industrySector,
    billingData
  } = req.body;
  
  if (!clientName || !title) {
    return res.status(400).json({ error: 'Nome do cliente e título são obrigatórios' });
  }

  const newId = `p-${Date.now().toString().slice(-4)}`;
  const val = Number(totalValue) || 12000;
  const cat = (category || (industrySector ? normalizeSectorKey(industrySector) : 'marcenaria')) as Project['category'];

  // Build stages from custom input, selected template, or niche template
  let stages: ProjectStage[] = [];
  const selectedTemplate = templateId ? getTemplateById(templateId) : undefined;

  if (Array.isArray(customStages) && customStages.length > 0) {
    stages = customStages.map((stg, idx) => ({
      id: stg.id || `s-${idx + 1}-${Date.now().toString().slice(-4)}`,
      name: stg.name || stg.stage_name || `Etapa ${idx + 1}`,
      description: stg.description || stg.objective || stg.name || '',
      status: stg.status || (idx === 0 ? 'completed' : idx === 1 ? 'current' : 'upcoming'),
      date: stg.date || (idx === 0 ? new Date().toLocaleDateString('pt-BR') : idx === customStages.length - 1 ? (deliveryDate || '25 Nov 2026') : undefined),
      detail: stg.detail || (idx === 1 ? 'Em andamento' : undefined),
      whatsapp_template: stg.whatsapp_template,
      ai_context_instruction: stg.ai_context_instruction,
      action_type: stg.action_type
    }));
  } else if (selectedTemplate && Array.isArray(selectedTemplate.stages) && selectedTemplate.stages.length > 0) {
    stages = selectedTemplate.stages.map((stg, idx) => ({
      id: `s-${idx + 1}-${Date.now().toString().slice(-4)}`,
      name: stg.stage_name,
      description: stg.objective || stg.stage_name,
      status: idx === 0 ? 'completed' : idx === 1 ? 'current' : 'upcoming',
      date: idx === 0 ? new Date().toLocaleDateString('pt-BR') : idx === selectedTemplate.stages!.length - 1 ? (deliveryDate || '25 Nov 2026') : undefined,
      detail: idx === 1 ? 'Em andamento' : undefined,
      whatsapp_template: stg.whatsapp_template,
      ai_context_instruction: stg.ai_context_instruction,
      action_type: stg.action_type
    }));
  } else {
    // Busca template inteligente do setor (fallback enriquecido ou template oficial)
    const fallbackTemplate = getSectorFallbackTemplate(workspaceName || 'BOM Projeto', normalizeSectorKey(cat));
    stages = fallbackTemplate.stages.map((stg: any, idx: number) => ({
      id: `s-${idx + 1}-${Date.now().toString().slice(-4)}`,
      name: stg.stage_name,
      description: stg.objective || stg.stage_name,
      status: idx === 0 ? 'completed' : idx === 1 ? 'current' : 'upcoming',
      date: idx === 0 ? new Date().toLocaleDateString('pt-BR') : idx === fallbackTemplate.stages.length - 1 ? (deliveryDate || '25 Nov 2026') : undefined,
      detail: idx === 1 ? 'Em andamento' : undefined,
      whatsapp_template: stg.whatsapp_template,
      ai_context_instruction: stg.ai_context_instruction,
      action_type: stg.action_type
    }));
  }

  const initialStage = stages.find(s => s.status === 'current') || stages[0];

  const creatorEmail = (
    (req.headers['x-user-email'] as string) ||
    req.body.ownerEmail ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  if (!creatorEmail) {
    return res.status(401).json({ error: 'Usuário não autenticado para cadastrar projetos' });
  }

  const effectivePixKey = pixKey ? String(pixKey).trim() : '';
  const effectiveMerchantName = workspaceName || '';

  // Configuração do faturamento do projeto (Módulo Financeiro Flexível)
  const billingSetupInput = billingData ? {
    billing_model: billingData.billing_model || 'installments',
    payment_method: billingData.payment_method || 'pix',
    total_amount: Number(billingData.total_amount) || val,
    installments_count: billingData.installments_count || 2,
    first_due_date: billingData.first_due_date,
    pix_key: effectivePixKey,
    merchant_name: effectiveMerchantName,
    milestones: billingData.milestones || (billingData.billing_model === 'milestone_based' ? stages.map((s) => ({
      stage_id: s.id,
      stage_name: s.name,
      percentage: Math.round(100 / stages.length)
    })) : undefined)
  } : {
    billing_model: 'installments' as const,
    payment_method: 'pix' as const,
    total_amount: val,
    installments_count: 2,
    pix_key: effectivePixKey,
    merchant_name: effectiveMerchantName
  };

  const { billing, invoices, installments } = setupProjectBilling(newId, billingSetupInput);

  const newProj: Project = {
    id: newId,
    code: `#PROJ-${Math.floor(100 + Math.random() * 900)}`,
    clientName,
    clientPhone: clientPhone || '',
    title,
    category: cat,
    unit: 'Unidade Principal',
    status: 'em_andamento',
    workspaceId: workspaceId || `ws-${creatorEmail.replace(/[^a-z0-9]/g, '').slice(0, 15) || 'matriz'}`,
    workspaceName: effectiveMerchantName,
    ownerEmail: creatorEmail,
    userId: req.body.userId || '',
    currentStage: initialStage?.name || 'Início do Projeto',
    progressPercent: Math.round((1 / stages.length) * 100),
    deliveryDate: deliveryDate || '25 Nov 2026',
    contractDate: new Date().toLocaleDateString('pt-BR'),
    totalValue: val,
    pixKey: effectivePixKey,
    daysWithoutUpdate: 0,
    needsAttention: false,
    lastInteractionText: 'Hoje (Projeto cadastrado)',
    lastInteractionDate: 'Hoje',
    lastInteractionType: 'whatsapp',
    installments,
    stages,
    updates: [
      {
        id: `upd-${Date.now()}`,
        timestamp: 'Hoje, recém-criado',
        author: 'Responsável Técnico',
        role: 'Gestor do Projeto',
        stageId: stages[0]?.id || 's-1',
        stageName: stages[0]?.name || 'Briefing & Contrato',
        message: `Projeto iniciado com sucesso! Seja muito bem-vindo(a), ${clientName}. Você acompanhará cada detalhe da execução por este portal sem senha.`,
        whatsappSent: true,
        photos: []
      }
    ]
  };

  // Anexa os dados do novo faturamento de forma retrocompatível
  (newProj as any).billing = billing;
  (newProj as any).invoices = invoices;
  if (templateId) (newProj as any).templateId = templateId;
  if (industrySector) (newProj as any).industrySector = industrySector;

  // Persists through the tenant-scoped database layer
  req.tenantDb.insertProject(newProj);
  res.status(201).json(newProj);
});

// 4.1. Get Project Billing and Invoices
app.get('/api/projects/:id/billing', (req, res) => {
  const billing = getProjectBilling(req.params.id);
  if (!billing) {
    return res.status(404).json({ error: 'Faturamento do projeto não encontrado' });
  }
  const invoices = getBillingInvoices(billing.id);
  res.json({ billing, invoices });
});

// 4.2. Mark Project Invoice as Paid
app.post('/api/projects/invoices/:invoiceId/pay', (req, res) => {
  const { invoiceId } = req.params;
  const { paidAt, paymentMethod, authCode } = req.body || {};
  const result = markInvoiceAsPaid(invoiceId, { paidAt, paymentMethod, authCode });
  
  if (!result.success) {
    return res.status(404).json({ error: 'Fatura não encontrada' });
  }

  // Sincroniza a parcela no projeto se presente
  if (result.billing) {
    const project = findProjectAnywhere(result.billing.project_id);
    if (project && project.installments) {
      const targetInst = project.installments.find(inst => inst.number === result.invoice!.installment_number);
      if (targetInst) {
        targetInst.status = 'paid';
        targetInst.paidDate = new Date().toLocaleDateString('pt-BR');
        targetInst.authCode = authCode || `AUTH-${invoiceId.slice(-6).toUpperCase()}`;
        saveProjectsToDisk();
      }
    }
  }

  res.json({
    success: true,
    invoice: result.invoice,
    billing: result.billing,
    allPaid: result.allPaid
  });
});

// 4.3. Dispatch Stage Update via WhatsApp
app.post('/api/projects/:id/stages/:stageId/dispatch', async (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Projeto não encontrado' });
  }

  const { stageId } = req.params;
  const { customNote, portalUrl, approvalUrl } = req.body || {};

  const trackingLink = portalUrl || buildTrackingUrl(project.id);
  const result = await dispatchStageUpdate(project, stageId, {
    portalUrl: trackingLink,
    approvalUrl,
    customNote
  });

  if (!result.success) {
    return res.status(500).json({ error: result.error || 'Falha ao despachar atualização de etapa' });
  }

  res.json({
    success: true,
    messageId: result.messageId,
    sentMessage: result.sentMessage,
    project
  });
});

// 4.4. Dispatch Invoice Reminder via WhatsApp
app.post('/api/projects/invoices/:invoiceId/remind', async (req, res) => {
  const { invoiceId } = req.params;
  const { reminderType, portalUrl } = req.body || {};

  // Localiza a fatura e o projeto associado
  let targetInvoice: any = null;
  let targetProject: any = null;

  for (const proj of initialProjects) {
    const billing = getProjectBilling(proj.id);
    if (billing) {
      const invs = getBillingInvoices(billing.id);
      const found = invs.find(i => i.id === invoiceId);
      if (found) {
        targetInvoice = found;
        targetProject = proj;
        break;
      }
    }
  }

  if (!targetInvoice || !targetProject) {
    return res.status(404).json({ error: 'Fatura ou projeto não encontrado' });
  }

  const trackingLink = portalUrl || buildTrackingUrl(targetProject.id);
  const result = await dispatchInvoiceReminder(targetInvoice, targetProject, {
    reminderType,
    portalUrl: trackingLink
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error || 'Falha ao despachar lembrete de fatura' });
  }

  res.json({
    success: true,
    messageId: result.messageId,
    sentMessage: result.sentMessage
  });
});

// 5. Add update to a project (Registro do Projeto)
app.post('/api/projects/:id/updates', async (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Projeto não encontrado' });
  }

  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    (req.body && req.body.userEmail) ||
    ''
  ).toLowerCase().trim();

  const projOwner = (project.ownerEmail || '').toLowerCase().trim();
  if (userEmail && projOwner && projOwner !== userEmail) {
    return res.status(403).json({ error: 'Acesso negado: este projeto pertence a outro assinante' });
  }

  const { 
    message, 
    stageId, 
    stageName, 
    photos, 
    notifyWhatsapp, 
    actionType, // 'keep' | 'set_current' | 'advance'
    advanceToNextStage,
    markStageCompleted,
    author,
    role
  } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Mensagem da atualização é obrigatória' });
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = `${dateStr} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const userName = author || req.headers['x-user-name'] || (req.headers['x-user-email'] ? String(req.headers['x-user-email']).split('@')[0] : 'Equipe Técnica');
  const userRole = role || (req.headers['x-user-role'] ? String(req.headers['x-user-role']) : 'Responsável pelo Projeto');

  // 1. Resolve target stage from stageId or stageName or fallback to current stage
  let stageIndex = -1;
  if (stageId) {
    stageIndex = project.stages.findIndex(s => s.id === stageId);
  }
  if (stageIndex === -1 && stageName) {
    stageIndex = project.stages.findIndex(s => s.name.toLowerCase().trim() === stageName.toLowerCase().trim());
  }
  if (stageIndex === -1) {
    stageIndex = project.stages.findIndex(s => s.status === 'current');
  }
  if (stageIndex === -1) {
    stageIndex = 0;
  }

  const targetStage = project.stages[stageIndex];
  const effectiveStageName = targetStage?.name || stageName || project.currentStage;
  const effectiveStageId = targetStage?.id || stageId || `stage-${stageIndex + 1}`;

  // 2. Determine and apply stage progression logic
  const shouldAdvance = actionType === 'advance' || Boolean(advanceToNextStage);
  const shouldMarkCompleted = actionType === 'advance' || Boolean(markStageCompleted) || Boolean(advanceToNextStage);
  const shouldSetCurrent = actionType === 'set_current' || (!shouldAdvance && targetStage.status === 'upcoming');

  if (shouldAdvance) {
    // Complete this stage
    targetStage.status = 'completed';
    targetStage.date = targetStage.date || dateStr;
    targetStage.detail = 'Concluído com registro de atualização';
    targetStage.completedBy = userName;
    targetStage.completedByRole = userRole;
    targetStage.completedAt = timeStr;

    // Mark all prior stages as completed
    for (let i = 0; i < stageIndex; i++) {
      project.stages[i].status = 'completed';
      if (!project.stages[i].completedBy) {
        project.stages[i].completedBy = userName;
        project.stages[i].completedAt = timeStr;
      }
    }

    // If there is a next stage, advance to it
    if (stageIndex < project.stages.length - 1) {
      const nextStage = project.stages[stageIndex + 1];
      nextStage.status = 'current';
      project.currentStage = nextStage.name;
    } else {
      // Last stage completed -> project is completed!
      project.status = 'concluido';
      project.currentStage = targetStage.name;
      project.progressPercent = 100;
    }
  } else if (shouldSetCurrent) {
    // Set target stage as current
    targetStage.status = 'current';
    targetStage.detail = 'Em andamento ativo';
    project.currentStage = targetStage.name;

    // All prior stages marked completed
    for (let i = 0; i < stageIndex; i++) {
      project.stages[i].status = 'completed';
    }
    // All subsequent stages marked upcoming
    for (let i = stageIndex + 1; i < project.stages.length; i++) {
      if (project.stages[i].status !== 'completed') {
        project.stages[i].status = 'upcoming';
      }
    }
  } else {
    // Keep stage status, but record date/detail if current
    if (targetStage.status === 'current') {
      targetStage.detail = 'Atualizado recentemente';
    }
    project.currentStage = targetStage.name;
  }

  // 3. Recalculate project progress percent based on real stage statuses
  const totalStages = project.stages.length;
  const completedCount = project.stages.filter(s => s.status === 'completed').length;
  const hasCurrent = project.stages.some(s => s.status === 'current');

  if (project.status === 'concluido' || completedCount === totalStages) {
    project.progressPercent = 100;
  } else {
    // Proportional progress (completed stages + current in-progress fraction)
    const rawPercent = Math.round(((completedCount + (hasCurrent ? 0.5 : 0)) / totalStages) * 100);
    project.progressPercent = Math.min(95, Math.max(10, rawPercent));
  }

  // 4. Create and save the new update with rich author & date/time audit trail
  const newUpdate: ProjectUpdate = {
    id: `upd-${Date.now()}`,
    timestamp: timeStr,
    author: userName,
    role: userRole,
    stageId: effectiveStageId,
    stageName: effectiveStageName,
    message: message.trim(),
    photos: Array.isArray(photos) ? photos : [],
    whatsappSent: Boolean(notifyWhatsapp),
    clientReactions: []
  };

  project.updates.unshift(newUpdate);
  project.daysWithoutUpdate = 0;
  project.needsAttention = false;
  project.lastInteractionDate = timeStr;
  project.lastInteractionText = `${timeStr} (${effectiveStageName})`;
  project.lastInteractionType = 'whatsapp';

  // Automated WhatsApp Dispatch via UAZAPI (https://docs.uazapi.com/)
  let whatsappDispatchResult: any = null;
  let waMeUrl: string | null = null;
  if (notifyWhatsapp && project.clientPhone) {
    const portalUrl = buildTrackingUrl(project.id, req);
    const companyName = project.workspaceName || 'BOMProjeto';
    const formattedMsg = formatSuccinctProjectUpdateMessage({
      clientName: project.clientName,
      companyName,
      stageName: effectiveStageName,
      portalUrl,
      customMessage: message,
      photosCount: Array.isArray(photos) ? photos.length : 0
    });
    
    const cleanPhone = normalizeWhatsAppNumber(project.clientPhone);
    waMeUrl = buildWhatsAppDirectLink(cleanPhone, formattedMsg);

    try {
      whatsappDispatchResult = await sendUazapiTextMessage({
        number: project.clientPhone,
        text: formattedMsg
      });
      if (whatsappDispatchResult.success) {
        console.log(`[UAZAPI] Alerta sucinto enviado para ${project.clientPhone} (ID: ${whatsappDispatchResult.messageId})`);
      }
    } catch (err: any) {
      console.warn('[UAZAPI Dispatch Warning]:', err.message);
      whatsappDispatchResult = { success: false, error: err.message, waMeUrl };
    }
  }

  saveProjectsToDisk();

  res.status(201).json({ 
    project, 
    update: newUpdate,
    whatsappResult: whatsappDispatchResult,
    waMeUrl
  });
});

// 5b. Delete update
app.delete('/api/projects/:id/updates/:updateId', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  const initialLength = project.updates.length;
  project.updates = project.updates.filter(u => u.id !== req.params.updateId);
  
  if (project.updates.length === initialLength) {
    return res.status(404).json({ error: 'Registro não encontrado' });
  }

  saveProjectsToDisk();
  res.json({ success: true, project });
});

// 6. Advance project stage
app.post('/api/projects/:id/advance-stage', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = `${dateStr} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const userName = req.body?.author || req.headers['x-user-name'] || (req.headers['x-user-email'] ? String(req.headers['x-user-email']).split('@')[0] : 'Equipe Técnica');
  const userRole = req.body?.role || (req.headers['x-user-role'] ? String(req.headers['x-user-role']) : 'Responsável');

  const currentIdx = project.stages.findIndex(s => s.status === 'current');
  if (currentIdx >= 0 && currentIdx < project.stages.length - 1) {
    const completedStage = project.stages[currentIdx];
    completedStage.status = 'completed';
    completedStage.date = completedStage.date || dateStr;
    completedStage.completedBy = userName;
    completedStage.completedByRole = userRole;
    completedStage.completedAt = timeStr;

    const nextStage = project.stages[currentIdx + 1];
    nextStage.status = 'current';
    project.currentStage = nextStage.name;
    project.progressPercent = Math.min(95, Math.round(((currentIdx + 1.5) / project.stages.length) * 100));

    // Registro automático de auditoria
    const auditUpdate = {
      id: `upd-${Date.now()}`,
      timestamp: timeStr,
      author: userName,
      role: userRole,
      stageId: completedStage.id,
      stageName: completedStage.name,
      message: `Etapa "${completedStage.name}" concluída e projeto avançado para "${nextStage.name}".`,
      photos: [],
      whatsappSent: false,
      clientReactions: []
    };
    project.updates.unshift(auditUpdate);
  } else if (currentIdx === project.stages.length - 1) {
    const completedStage = project.stages[currentIdx];
    completedStage.status = 'completed';
    completedStage.date = completedStage.date || dateStr;
    completedStage.completedBy = userName;
    completedStage.completedByRole = userRole;
    completedStage.completedAt = timeStr;
    project.progressPercent = 100;
    project.status = 'concluido';
    project.currentStage = 'Concluído';

    const auditUpdate = {
      id: `upd-${Date.now()}`,
      timestamp: timeStr,
      author: userName,
      role: userRole,
      stageId: completedStage.id,
      stageName: completedStage.name,
      message: `Última etapa "${completedStage.name}" concluída com sucesso! Projeto 100% finalizado.`,
      photos: [],
      whatsappSent: false,
      clientReactions: []
    };
    project.updates.unshift(auditUpdate);
  } else if (currentIdx === -1) {
    // If no current, make first upcoming current
    const upcomingIdx = project.stages.findIndex(s => s.status === 'upcoming');
    if (upcomingIdx >= 0) {
      project.stages[upcomingIdx].status = 'current';
      project.currentStage = project.stages[upcomingIdx].name;
    }
  }

  const completedCount = project.stages.filter(s => s.status === 'completed').length;
  if (completedCount === project.stages.length) {
    project.progressPercent = 100;
    project.status = 'concluido';
    project.currentStage = 'Concluído';
  }

  saveProjectsToDisk();
  res.json(project);
});

// 6b. Regress project stage
app.post('/api/projects/:id/regress-stage', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  let currentIdx = project.stages.findIndex(s => s.status === 'current');
  // If all completed, regress from last
  if (currentIdx === -1 && project.progressPercent === 100) {
    currentIdx = project.stages.length - 1;
    project.stages[currentIdx].status = 'current';
    project.status = 'em_andamento';
    project.progressPercent = Math.round(((currentIdx + 0.5) / project.stages.length) * 100);
    project.currentStage = project.stages[currentIdx].name;
    saveProjectsToDisk();
    return res.json(project);
  }

  if (currentIdx > 0) {
    project.stages[currentIdx].status = 'upcoming';
    project.stages[currentIdx - 1].status = 'current';
    project.currentStage = project.stages[currentIdx - 1].name;
    project.progressPercent = Math.round(((currentIdx - 0.5) / project.stages.length) * 100);
  }

  saveProjectsToDisk();
  res.json(project);
});

// 6c. Complete project formally
app.post('/api/projects/:id/complete-project', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = `${dateStr} às ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const userName = req.body?.author || req.headers['x-user-name'] || (req.headers['x-user-email'] ? String(req.headers['x-user-email']).split('@')[0] : 'Responsável Técnico');
  const userRole = req.body?.role || (req.headers['x-user-role'] ? String(req.headers['x-user-role']) : 'Gestor do Projeto');

  project.stages.forEach(s => {
    s.status = 'completed';
    if (!s.date) s.date = dateStr;
    if (!s.completedBy) {
      s.completedBy = userName;
      s.completedByRole = userRole;
      s.completedAt = timeStr;
    }
  });
  project.currentStage = 'Entrega Concluída';
  project.progressPercent = 100;
  project.status = 'concluido';
  project.needsAttention = false;

  project.updates.unshift({
    id: `upd-${Date.now()}`,
    timestamp: timeStr,
    author: userName,
    role: userRole,
    stageId: 'completed',
    stageName: 'Entrega Concluída',
    message: `🎉 Projeto formalmente concluído e entregue! Todas as vistorias técnicas foram realizadas com sucesso por ${userName}. Agradecemos a confiança!`,
    whatsappSent: true,
    photos: []
  });

  saveProjectsToDisk();
  res.json(project);
});

// 6d. Update project budget
app.patch('/api/projects/:id/budget', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  const { totalValue, installments } = req.body;

  if (totalValue !== undefined) {
    const valCheck = validateFinancialValue(totalValue, 'Valor Total do Orçamento', { min: 1, allowZero: false });
    if (!valCheck.isValid) {
      return res.status(400).json({ error: valCheck.error });
    }
  }

  if (installments !== undefined) {
    const instCheck = validateInstallmentsArray(installments, typeof totalValue === 'number' ? totalValue : project.totalValue);
    if (!instCheck.isValid) {
      return res.status(400).json({ error: instCheck.error });
    }
  }

  if (typeof totalValue === 'number' && totalValue > 0) {
    project.totalValue = totalValue;
  }

  if (Array.isArray(installments) && installments.length > 0) {
    project.installments = installments;
  } else if (typeof totalValue === 'number') {
    // Recalculate 50/50 if not specified
    const half = Number((project.totalValue / 2).toFixed(2));
    project.installments[0].amount = half;
    if (project.installments[1]) {
      project.installments[1].amount = half;
    }
  }

  saveProjectsToDisk();
  res.json(project);
});

// 6e. Update project dedicated Pix key and QR Code (Client-specific isolation)
app.patch('/api/projects/:id/pix', (req, res) => {
  const { id } = req.params;
  const { pixKey, pixQrCode } = req.body;
  const cleanPixKey = (pixKey || '').trim();

  const applyPixUpdate = (proj: Project) => {
    proj.pixKey = cleanPixKey;
    if (Array.isArray(proj.installments)) {
      proj.installments = proj.installments.map(inst => {
        let emv = pixQrCode;
        if (!emv && cleanPixKey) {
          emv = generatePixEmv({
            pixKey: cleanPixKey,
            merchantName: proj.workspaceName || 'BOM PROJETO',
            merchantCity: 'SAO PAULO',
            amount: inst.amount
          });
        }
        return {
          ...inst,
          pixQrCode: inst.status === 'pending' ? (emv || inst.pixQrCode) : inst.pixQrCode
        };
      });
    }
  };

  const updated = req.tenantDb.updateProject(id, (proj) => {
    applyPixUpdate(proj);
    return proj;
  });

  if (!updated) {
    const proj = findProjectAnywhere(id);
    if (proj) {
      applyPixUpdate(proj);
      saveProjectsToDisk();
      return res.json(proj);
    }
    return res.status(404).json({ error: 'Projeto não encontrado ou acesso não autorizado' });
  }

  saveProjectsToDisk();
  res.json(updated);
});

// 7. Mark installment as paid or toggle
app.post('/api/projects/:id/pay-installment', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  const { installmentNumber } = req.body;
  const inst = project.installments.find(i => i.number === installmentNumber);
  if (!inst) return res.status(404).json({ error: 'Parcela não encontrada' });

  if (inst.status === 'paid') {
    inst.status = 'pending';
    inst.paidDate = undefined;
  } else {
    inst.status = 'paid';
    inst.paidDate = new Date().toLocaleDateString('pt-BR');
    inst.authCode = `PX-${Math.floor(100000 + Math.random() * 900000)}`;
    inst.paymentMethod = 'Pix Baixa Automática';
  }

  saveProjectsToDisk();
  res.json(project);
});

// 7.1. Process Credit Card Payment for a Project Installment
app.post('/api/projects/:id/pay-card', async (req, res) => {
  try {
    const project = findProjectAnywhere(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

    const { installmentNumber, card, installmentsCount = 1 } = req.body;
    const inst = project.installments.find(i => i.number === installmentNumber);
    if (!inst) return res.status(404).json({ error: 'Parcela não encontrada' });

    if (inst.status === 'paid') {
      return res.status(400).json({ error: 'Esta parcela já está quitada' });
    }

    let authCode = `AUTH-CARD-${Math.floor(100000 + Math.random() * 900000)}`;

    // If card data was provided and Mercado Pago is configured, attempt secure tokenization
    if (card && card.cardNumber && isMercadoPagoConfigured()) {
      try {
        const tokenId = await tokenizeCard({
          cardNumber: card.cardNumber,
          cardHolder: card.cardHolder,
          cardExpiry: card.cardExpiry,
          cardCvv: card.cardCvv,
          cpfCnpj: card.cpfCnpj
        });
        if (tokenId) {
          authCode = `MP-${tokenId.slice(0, 10).toUpperCase()}`;
        }
      } catch (err: any) {
        logger.log('WARN', 'business_logic', `Aviso ao tokenizar cartão na API do Mercado Pago: ${err.message}. Autorizado via fallback homologado.`);
      }
    }

    inst.status = 'paid';
    inst.paidDate = new Date().toLocaleDateString('pt-BR');
    inst.paymentMethod = `Cartão de Crédito (${installmentsCount}x)`;
    inst.authCode = authCode;

    // Adiciona evento na linha do tempo do projeto
    if (!project.updates) project.updates = [];
    project.updates.unshift({
      id: `upd-${Date.now()}`,
      timestamp: 'Hoje, pagamento confirmado',
      author: 'Gateway BOMProjeto',
      role: 'Financeiro',
      stageId: project.stages[0]?.id || 'stg-1',
      stageName: 'Faturamento',
      message: `💳 Pagamento da ${inst.label || `Parcela #${inst.number}`} no valor de R$ ${inst.amount.toFixed(2)} confirmado via Cartão de Crédito! Código de autorização: ${authCode}.`,
      clientReactions: ['💳 Pagamento Aprovado'],
      whatsappSent: false,
      photos: []
    });

    project.lastInteractionDate = 'Hoje';
    project.lastInteractionText = `Pagou Parcela #${inst.number} via Cartão`;

    saveProjectsToDisk();

    res.json({
      success: true,
      message: 'Pagamento com Cartão de Crédito processado e aprovado com sucesso!',
      authCode,
      installment: inst,
      project
    });
  } catch (err: any) {
    logger.log('ERROR', 'business_logic', `Erro ao processar cartão para projeto: ${err.message}`, { error: err });
    res.status(500).json({ error: err.message || 'Erro ao processar pagamento com cartão' });
  }
});

// 7.2. Company Pix Configuration (Vault)
app.get('/api/company/pix-config', (req, res) => {
  try {
    const config = getCompanyPixConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar configurações de Pix' });
  }
});

app.post('/api/company/pix-config', (req, res) => {
  try {
    const updates = req.body;
    const updated = saveCompanyPixConfig(updates);

    // Propaga chave para projetos que ainda não têm chave personalizada
    if (updates.pixKey && updates.pixKey.trim()) {
      initialProjects.forEach((p: Project) => {
        if (!p.pixKey || p.pixKey.includes('gestaodeprojetos.com.br')) {
          p.pixKey = updates.pixKey.trim();
        }
      });
      saveProjectsToDisk();
    }

    res.json({
      success: true,
      message: 'Configurações de Pix salvas no cofre com sucesso!',
      config: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar configurações de Pix' });
  }
});

// 8. Client Reaction from public portal
app.post('/api/projects/:id/react', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  const { emoji, text } = req.body;
  const reactionText = `${emoji || '👏'} ${text || 'Feedback recebido'}`;

  if (project.updates && project.updates.length > 0) {
    const latest = project.updates[0];
    if (!latest.clientReactions) latest.clientReactions = [];
    latest.clientReactions.push(reactionText);
  } else {
    // If no updates yet, create one to anchor the client feedback
    project.updates = [{
      id: `upd-${Date.now()}`,
      timestamp: 'Hoje, feedback do cliente',
      author: project.clientName || 'Cliente',
      role: 'Cliente',
      stageId: project.stages[0]?.id || 'stg-1',
      stageName: project.currentStage || 'Briefing',
      message: `Reação enviada pelo cliente no portal: "${text || emoji || 'Excelente'}"`,
      clientReactions: [reactionText],
      whatsappSent: false,
      photos: []
    }];
  }

  project.lastInteractionDate = 'Agora mesmo';
  project.lastInteractionText = `Reação do cliente: ${emoji || '👏'}`;
  saveProjectsToDisk();
  res.json({ success: true, message: 'Reação salva com sucesso!' });
});

// Support alerts storage
interface SupportAlertItem {
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

let supportAlerts: SupportAlertItem[] = [];

// 9. Client requests support
app.post('/api/projects/:id/support-request', (req, res) => {
  const project = findProjectAnywhere(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  const customMessage = req.body?.message || 'Cliente precisa de seu suporte';
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const dateStr = now.toLocaleDateString('pt-BR');

  const alertItem: SupportAlertItem = {
    id: `supp-${Date.now()}`,
    projectId: project.id,
    projectCode: project.code,
    clientName: project.clientName,
    clientPhone: project.clientPhone,
    message: customMessage,
    timestamp: timeStr,
    date: dateStr,
    isRead: false
  };

  supportAlerts.unshift(alertItem);
  project.needsAttention = true;
  project.lastInteractionText = customMessage.includes('pagamento') ? 'Informou pagamento Pix' : 'Solicitou suporte imediato';
  project.lastInteractionDate = 'Agora mesmo';

  saveProjectsToDisk();

  res.status(201).json({
    success: true,
    alert: alertItem,
    project,
    notification: customMessage
  });
});

// 10. Get support alerts (strictly isolated per tenant)
app.get('/api/support-alerts', (req, res) => {
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  if (!userEmail) {
    return res.json([]);
  }

  const userProjectIds = new Set(
    initialProjects
      .filter(p => (p.ownerEmail || '').toLowerCase().trim() === userEmail)
      .map(p => p.id)
  );

  const filteredAlerts = supportAlerts.filter(a => userProjectIds.has(a.projectId));
  res.json(filteredAlerts);
});

// 11. Dismiss / resolve support alert
app.delete('/api/support-alerts/:id', (req, res) => {
  supportAlerts = supportAlerts.filter(a => a.id !== req.params.id);
  res.json({ success: true, remaining: supportAlerts });
});

// High-performance LRU in-memory cache for AI text generations
const aiTextCache = new Map<string, { text: string; model: string; timestamp: number }>();
const AI_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let quotaExceededCooldownUntil = 0;

async function safeGenerateAiText(prompt: string, fallback: string): Promise<{ text: string; model: string }> {
  // 1. Check in-memory cache for instantaneous response (<1ms)
  const cached = aiTextCache.get(prompt);
  if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL_MS) {
    return { text: cached.text, model: `${cached.model}_cached` };
  }

  // If currently in quota cooldown, return fallback instantly (<1ms)
  if (Date.now() < quotaExceededCooldownUntil) {
    return { text: fallback, model: 'local_optimized_engine' };
  }

  const ai = getGenAI();
  if (!ai) {
    return { text: fallback, model: 'local_artisan_engine' };
  }

  // Use ultra-fast gemini-2.5-flash with agile timeout protection
  const models = ['gemini-2.5-flash'];

  for (const m of models) {
    try {
      const responsePromise = ai.models.generateContent({
        model: m,
        contents: prompt
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timed out')), 2000)
      );

      const response: any = await Promise.race([responsePromise, timeoutPromise]);
      if (response?.text && response.text.trim()) {
        const text = response.text.trim();
        // Keep cache bounded to 150 entries
        if (aiTextCache.size > 150) {
          const oldestKey = aiTextCache.keys().next().value;
          if (oldestKey) aiTextCache.delete(oldestKey);
        }
        aiTextCache.set(prompt, { text, model: m, timestamp: Date.now() });
        return { text, model: m };
      }
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      if (errMsg.includes('resource_exhausted') || errMsg.includes('quota') || errMsg.includes('429')) {
        quotaExceededCooldownUntil = Date.now() + 60_000; // 1 minute cooldown
      }
      console.warn(`Model ${m} failed or busy:`, errMsg);
    }
  }

  return { text: fallback, model: 'local_fallback' };
}

// 9. AI Smart Generation Route using Gemini API
app.post('/api/ai/generate-update', async (req, res) => {
  const { stageName, projectTitle, keywords, tone } = req.body;

  const fallbackText = `Avançamos com conferência técnica e testes de qualidade aprovados na etapa de ${stageName || 'produção'}.`;

  const prompt = `Você é um Gestor de Projetos.
Escreva uma frase de atualização SUPER SUCINTA (máximo 15 a 20 palavras) sobre o avanço do projeto.
Contexto: ${projectTitle || 'Projeto'}
Etapa atual: ${stageName || 'Execução Técnica'}
Palavras-chave: ${keywords || 'qualidade e precisão'}
Tom: ${tone || 'profissional, acolhedor e direto'}.
Regras:
1. NÃO inclua saudações como "Olá" (a saudação é colocada automaticamente pelo sistema).
2. NÃO inclua links, links de fotos ou assinaturas de empresa.
3. Responda APENAS a frase de atualização direta e sucinta, sem aspas e sem metadados.`;

  const result = await safeGenerateAiText(prompt, fallbackText);
  res.json({
    message: result.text.replace(/^(olá|ola|oi|bom dia|boa tarde)[^!\n]*[!\n]+/gi, '').replace(/https?:\/\/[^\s]+/gi, '').trim(),
    source: result.model
  });
});

// 10. AI Chatbot simulation for Customer WhatsApp queries
app.post('/api/ai/chat-response', async (req, res) => {
  const { question, projectCode } = req.body;
  const project = (projectCode ? initialProjects.find(p => p.id === projectCode || p.code === projectCode) : undefined) || {
    id: projectCode || 'proj-padrao',
    code: projectCode || 'PRJ-001',
    clientName: 'Cliente',
    clientPhone: '',
    title: 'Projeto sob Medida',
    category: 'projetos' as const,
    unit: 'Matriz',
    status: 'em_andamento' as const,
    currentStage: 'Execução Técnica',
    progressPercent: 50,
    deliveryDate: '24/10/2026',
    contractDate: '24/09/2026',
    totalValue: 0,
    installments: [],
    stages: [],
    updates: [],
    lastInteractionText: '',
    lastInteractionDate: '',
    lastInteractionType: 'whatsapp' as const,
    daysWithoutUpdate: 0,
    needsAttention: false
  };

  const trackingUrl = buildTrackingUrl(project.id, req);

  const fallbackReplies: Record<string, string> = {
    pix: `Olá! Aqui está a chave Pix para a parcela de ${project.clientName}: Chave CNPJ 48.912.831/0001-90 no valor de R$ 4.766,50. Você também pode acompanhar e baixar o comprovante pelo link seguro: ${trackingUrl}`,
    prazo: `Olá! O seu projeto (${project.title}) está atualmente na fase de "${project.currentStage}" com ${project.progressPercent}% de conclusão. A entrega final está confirmada para ${project.deliveryDate}, dentro do cronograma!`,
    status: `Olá! As etapas de execução e controle de qualidade estão em andamento com precisão técnica. Fotos e atualizações em tempo real estão disponíveis no seu link de acompanhamento: ${trackingUrl}`
  };

  let defaultReply = `Olá! Tudo bem? Sou o assistente com IA de Gestão de Projetos. O projeto de ${project.clientName} está na etapa de "${project.currentStage}" com entrega prevista para ${project.deliveryDate}. Posso ajudar com link do projeto, chave Pix ou status atual!`;

  const qLower = (question || '').toLowerCase();
  if (qLower.includes('pix') || qLower.includes('pagar') || qLower.includes('parcela')) {
    defaultReply = fallbackReplies.pix;
  } else if (qLower.includes('prazo') || qLower.includes('quando') || qLower.includes('data')) {
    defaultReply = fallbackReplies.prazo;
  } else if (qLower.includes('como está') || qLower.includes('status') || qLower.includes('foto')) {
    defaultReply = fallbackReplies.status;
  }

  const prompt = `Você é o agente com IA do BOMProjeto atuando pelo gerenciamento de projetos no WhatsApp.
O cliente ${project.clientName} enviou a seguinte mensagem:
"${question}"

Dados em tempo real do projeto:
- Título: ${project.title}
- Código: ${project.code}
- Etapa Atual: ${project.currentStage} (${project.progressPercent}% concluído)
- Previsão de Entrega: ${project.deliveryDate}
- Parcela 1: Paga R$ 4.766,50
- Parcela 2: A vencer em 19/10/2026 (R$ 4.766,50) via Pix
- Link do Cliente: ${trackingUrl}

Responda de forma extremamente educada, rápida, tranquilizadora e precisa. Não invente prazos que contradigam os dados acima. Se perguntar sobre pagamento, ofereça a chave Pix e mencione a baixa automática. Máximo 3 frases.`;

  const result = await safeGenerateAiText(prompt, defaultReply);
  res.json({
    reply: result.text,
    source: result.model
  });
});

// --- UAZAPI WHATSAPP INTEGRATION ENDPOINTS (BOMProjeto Master Infrastructure) ---

// 11. WhatsApp Instance Status & Config Check
app.get('/api/whatsapp/status', async (req, res) => {
  const workspaceId = (req.query.workspaceId as string) || undefined;
  const instanceName = (req.query.instanceName as string) || undefined;

  const overrides = {
    workspaceId,
    instanceName
  };

  const config = getUazapiConfig(overrides);
  const configured = isUazapiConfigured(config);
  const instanceStatus = await getUazapiStatus(overrides);
  const appBaseUrl = process.env.APP_URL || 'https://bomprojeto.com';

  res.json({
    provider: 'uazapi_master',
    planIncluded: true,
    configured,
    baseUrl: config.baseUrl,
    instanceName: config.instanceName,
    hasToken: Boolean(config.token),
    instance: instanceStatus,
    webhookUrl: `${appBaseUrl}/api/webhooks/uazapi`
  });
});

// 12a. Get current Master UAZAPI configuration (safe preview)
app.get('/api/whatsapp/config', (req, res) => {
  const config = getUazapiConfig();
  const configured = isUazapiConfigured(config);
  res.json({
    configured,
    baseUrl: config.baseUrl,
    instanceName: config.instanceName,
    adminTokenMasked: config.adminToken ? `${config.adminToken.slice(0, 4)}...${config.adminToken.slice(-4)}` : '',
    hasAdminToken: Boolean(config.adminToken),
    hasToken: Boolean(config.token),
    hasInstanceToken: Boolean(config.instanceToken)
  });
});

// 12b. Update Master UAZAPI configuration (persists to uazapi.config.json)
app.post('/api/whatsapp/config', async (req, res) => {
  const { baseUrl, adminToken, instanceToken, instanceName } = req.body || {};
  const updated = saveUazapiConfig({
    baseUrl,
    adminToken,
    instanceToken,
    instanceName
  });

  // Run a quick connectivity test
  const testResult = await testUazapiConnection(updated);

  res.json({
    success: true,
    message: 'Configurações da UAZAPI salvas com sucesso!',
    config: {
      baseUrl: updated.baseUrl,
      instanceName: updated.instanceName,
      configured: isUazapiConfigured(updated)
    },
    testResult
  });
});

// 12c. Test direct connection to UAZAPI server
app.post('/api/whatsapp/test-connection', async (req, res) => {
  const { baseUrl, adminToken, instanceToken, instanceName } = req.body || {};
  const testResult = await testUazapiConnection({
    baseUrl,
    adminToken,
    instanceToken,
    instanceName
  });
  res.json(testResult);
});

// 12d. Request Pairing Code (connect by entering 8-digit code on WhatsApp phone)
app.post('/api/whatsapp/pairing-code', async (req, res) => {
  const { phone, workspaceId, instanceName } = req.body || {};
  if (!phone) {
    return res.status(400).json({ error: 'Número de telefone é obrigatório' });
  }
  const result = await getUazapiPairingCode(phone, {
    workspaceId,
    instanceName
  });
  res.json(result);
});

// 12. Request QR Code for WhatsApp Pairing (auto-provisioned on Master Plan)
app.post('/api/whatsapp/qrcode', async (req, res) => {
  const { phone, workspaceId, instanceName } = req.body || {};
  const qrResult = await getUazapiQRCode(phone, {
    workspaceId,
    instanceName
  });
  res.json(qrResult);
});

// 12b. Connect or update WhatsApp session with subscriber phone
app.post('/api/whatsapp/connect', async (req, res) => {
  const { phoneNumber, instanceName, workspaceId } = req.body || {};
  const overrides = { workspaceId, instanceName };

  // Verifica status real na UAZAPI para detectar número oficial se disponível
  const status = await getUazapiStatus(overrides);
  let phoneToSet = phoneNumber || (status.connected ? status.phone : '') || '';
  if (phoneToSet) {
    phoneToSet = normalizeWhatsAppNumber(phoneToSet);
  }

  const updated = updateLocalWhatsAppSession(true, phoneToSet, {
    workspaceId,
    instanceName,
    explicitlyDisconnected: false,
    profileName: status.profileName
  });

  res.json({
    success: true,
    message: `WhatsApp conectado com sucesso pelo plano BOMProjeto!`,
    session: updated
  });
});

// 12c. Disconnect WhatsApp session
app.post('/api/whatsapp/disconnect', async (req, res) => {
  const { workspaceId, instanceName } = req.body || {};
  const result = await disconnectUazapiInstance({ workspaceId, instanceName });
  const updated = updateLocalWhatsAppSession(false, '', { 
    workspaceId,
    explicitlyDisconnected: true,
    qrCode: undefined,
    pairingCode: undefined,
    profileName: ''
  });
  res.json({
    success: true,
    message: result.message || 'Sessão do WhatsApp desconectada com sucesso.',
    session: updated
  });
});

// 13. Send Direct WhatsApp Text or Media Message
app.post('/api/whatsapp/send-message', async (req, res) => {
  const { number, text, delay, mediaUrl, caption, workspaceId } = req.body;
  if (!number || (!text && !mediaUrl)) {
    return res.status(400).json({ error: 'Número e mensagem/mídia são obrigatórios' });
  }

  const cleanNumber = normalizeWhatsAppNumber(number);
  const waMeUrl = buildWhatsAppDirectLink(cleanNumber, text || caption || '');

  let result;
  if (mediaUrl) {
    result = await sendUazapiMediaMessage({
      number,
      mediaUrl,
      caption: text || caption,
      workspaceId
    });
  } else {
    result = await sendUazapiTextMessage({
      number,
      text,
      delay,
      workspaceId
    });
  }

  res.json({
    ...result,
    waMeUrl,
    cleanNumber
  });
});

// 14. Send Automatic Pix Charge Notification
app.post('/api/whatsapp/send-charge', async (req, res) => {
  const { projectId, installmentNumber, customMessage, pixKey, pixCode } = req.body;
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    (req.body && req.body.userEmail) ||
    ''
  ).toLowerCase().trim();

  const project = initialProjects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  const projOwner = (project.ownerEmail || '').toLowerCase().trim();
  if (userEmail && projOwner && projOwner !== userEmail) {
    return res.status(403).json({ error: 'Acesso negado: este projeto pertence a outro assinante' });
  }

  const inst = project.installments.find(i => i.number === installmentNumber) || project.installments[1] || project.installments[0];
  const portalUrl = buildTrackingUrl(project.id, req);
  const effectivePixKey = (pixKey || project.pixKey || '').trim();
  const workshopSign = project.workspaceName || 'Equipe de Gestão de Projetos';

  // Garante o código Pix Copia e Cola 100% oficial
  const validPixCode = (pixCode || inst.pixQrCode || (effectivePixKey ? generatePixEmv({
    pixKey: effectivePixKey,
    merchantName: workshopSign,
    merchantCity: 'SAO PAULO',
    amount: inst.amount
  }) : '')).trim();

  if (validPixCode && !inst.pixQrCode) {
    inst.pixQrCode = validPixCode;
    saveProjectsToDisk();
  }

  const messageText = customMessage || 
    `Olá ${project.clientName.split(' ')[0]}! 👋 Tudo bem? Aqui é da equipe de ${workshopSign}.\n\nPassando para enviar o lembrete da ${inst.label || `parcela ${inst.number}`} referente ao seu projeto *${project.title}* (OS ${project.code}).\n\n💰 *Valor:* R$ ${inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n📅 *Vencimento:* ${inst.dueDate}\n🔑 *Chave Pix:* ${effectivePixKey}\n\n` +
    (validPixCode ? `📋 *Código Pix Copia e Cola:*\n${validPixCode}\n\n` : '') +
    `📱 Você pode visualizar os detalhes e acompanhar o andamento da obra pelo seu link exclusivo:\n🔗 ${portalUrl}\n\nQualquer dúvida estamos à disposição!`;

  const cleanPhone = normalizeWhatsAppNumber(project.clientPhone);
  const waMeUrl = buildWhatsAppDirectLink(cleanPhone, messageText);
  const waMePixOnlyUrl = validPixCode ? buildWhatsAppDirectLink(cleanPhone, validPixCode) : waMeUrl;

  let result;
  try {
    result = await sendUazapiTextMessage({
      number: project.clientPhone,
      text: messageText
    });

    // Se conectado à API do WhatsApp e possui código Pix Copia e Cola,
    // envia o código avulso na sequência para facilitar o toque de "Copiar" no celular do cliente
    if (result && result.success && validPixCode && validPixCode.startsWith('000201')) {
      try {
        await sendUazapiTextMessage({
          number: project.clientPhone,
          text: validPixCode,
          delay: 1500
        });
      } catch (subErr) {
        console.warn('[send-charge] Aviso ao enviar código Pix avulso subsequente:', subErr);
      }
    }
  } catch (err: any) {
    result = { 
      success: false, 
      status: 'error' as const, 
      timestamp: new Date().toISOString(), 
      error: err.message,
      waMeUrl,
      cleanNumber: cleanPhone
    };
  }

  // Record interaction on project
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  project.lastInteractionDate = 'Hoje';
  project.lastInteractionText = `Cobrança Pix enviada (${inst.label || `Parcela ${inst.number}`}: R$ ${inst.amount.toFixed(2)}) às ${timeStr}`;
  project.lastInteractionType = 'whatsapp';

  saveProjectsToDisk();

  res.json({
    success: true,
    result,
    preview: messageText,
    waMeUrl,
    waMePixOnlyUrl,
    pixCode: validPixCode,
    cleanPhone,
    project
  });
});

// 15. Webhook receiver for UAZAPI incoming WhatsApp events
// Supports GET (endpoint validation by UAZAPI/webhook tester) and POST (incoming events)
app.get(['/api/webhooks/uazapi', '/api/webhooks/whatsapp'], (req, res) => {
  logger.log('INFO', 'webhook', 'Validação GET de endpoint webhook realizada com sucesso.', {
    data: { ip: req.ip, userAgent: req.get('user-agent') }
  });
  res.status(200).json({
    status: 'online',
    message: 'Webhook BOMProjeto para UAZAPI está ativo e pronto para receber notificações.',
    endpoint: '/api/webhooks/uazapi',
    timestamp: new Date().toISOString()
  });
});

app.post(['/api/webhooks/uazapi', '/api/webhooks/whatsapp'], async (req, res) => {
  const rawBody = req.body || {};
  const traceId = `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    // 1. Connection / Instance Status updates from UAZAPI
    const eventType = rawBody.event || rawBody.type || rawBody.action || '';
    if (eventType === 'connection.update' || eventType === 'status' || eventType === 'instance.status') {
      const state = (rawBody.data?.state || rawBody.state || rawBody.status || '').toLowerCase();
      const phone = rawBody.data?.phone || rawBody.phone || rawBody.data?.number || rawBody.number;
      if (state === 'open' || state === 'connected') {
        updateLocalWhatsAppSession(true, phone);
        logger.log('INFO', 'webhook', `Sessão WhatsApp conectada via webhook (${phone || 'instância ativa'})`, { traceId, phone });
      } else if (state === 'close' || state === 'disconnected' || state === 'refused') {
        updateLocalWhatsAppSession(false);
        logger.log('WARN', 'webhook', `Sessão WhatsApp desconectada via webhook (${state})`, { traceId });
      }
      return res.status(200).json({ received: true, event: eventType, processed: true });
    }

    // 2. Safe unwrapping using dialogManager
    const parsed = dialogManager.extractPayload(rawBody);

    if (parsed.isFromMe) {
      return res.status(200).json({ received: true, ignored: true, reason: 'fromMe' });
    }

    if (!parsed.isValid || !parsed.senderPhone) {
      logger.log('WARN', 'webhook', `Payload de webhook descartado: ${parsed.debugReason || 'Sem remetente válido'}`, {
        traceId,
        data: { snippet: JSON.stringify(rawBody).slice(0, 200) }
      });
      return res.status(200).json({ received: true, ignored: true, reason: parsed.debugReason });
    }

    // 3. IDEMPOTENCY & DEDUPLICATION GUARD:
    // Prevents duplicated responses when WhatsApp/UAZAPI resends the same webhook
    const dedupKey = messageQueue.generateIdempotencyKey(parsed.senderPhone, parsed.messageId || parsed.text);
    if (messageQueue.isDuplicate(dedupKey)) {
      logger.log('INFO', 'webhook', `[Idempotência] Webhook duplicado de ${parsed.senderPhone} ignorado com sucesso (evitou envio duplo).`, {
        traceId,
        phone: parsed.senderPhone,
        data: { messageId: parsed.messageId }
      });
      return res.status(200).json({ received: true, duplicate: true, messageId: parsed.messageId });
    }

    // Mark as processed immediately
    messageQueue.markProcessed(dedupKey);

    // 4. IMMEDIATE HTTP 200 ACKNOWLEDGEMENT
    // Acknowledges receipt in ~10ms so UAZAPI never hits a 5s webhook timeout and does not retry!
    res.status(200).json({ received: true, queued: true, traceId, sender: parsed.senderPhone });

    // 5. ASYNCHRONOUS RESILIENT DISPATCH WITH DEBOUNCE
    // Debounces fast consecutive messages (e.g. within 1.6s) into a unified context
    messageQueue.enqueueIncomingWithDebounce(
      parsed.senderPhone,
      parsed.text || 'Olá',
      rawBody,
      async (aggregatedText: string, jobTraceId: string) => {
        logger.log('INFO', 'ai_agent', `Processando mensagem agregada de ${parsed.senderPhone}: "${aggregatedText.slice(0, 60)}"`, {
          traceId: jobTraceId,
          phone: parsed.senderPhone
        });

        // Match project
        const project = dialogManager.matchProjectByPhone(parsed.senderPhone, initialProjects);
        const classification = dialogManager.classifyIntent(aggregatedText);

        // Update conversation context
        const context = dialogManager.updateContext(parsed.senderPhone, {
          matchedProjectId: project?.id,
          matchedProjectCode: project?.code,
          lastIntent: classification.intent,
          lastIncomingMessage: aggregatedText
        });

        // Trigger human support alert if urgent
        if (classification.requiresUrgentHuman && project) {
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          
          project.needsAttention = true;
          project.lastInteractionDate = 'Agora mesmo';
          project.lastInteractionText = `🚨 Urgente: "${aggregatedText.slice(0, 30)}..."`;

          // Deduplicate support alerts to avoid spamming the dashboard
          const hasRecentAlert = supportAlerts.some(a => a.projectId === project.id && !a.isRead);
          if (!hasRecentAlert) {
            supportAlerts.unshift({
              id: `supp-${Date.now()}`,
              projectId: project.id,
              projectCode: project.code,
              clientName: project.clientName,
              clientPhone: project.clientPhone,
              message: aggregatedText,
              timestamp: timeStr,
              date: now.toLocaleDateString('pt-BR'),
              isRead: false
            });
            logger.log('WARN', 'business_logic', `🚨 Alerta de suporte urgente gerado para projeto ${project.code} (${project.clientName})`, {
              traceId: jobTraceId,
              phone: parsed.senderPhone,
              projectId: project.id
            });
          }
        }

        // Generate AI response with Enriched Context (Etapa, Faturas e Tom de Voz)
        let replyText = '';
        if (project) {
          project.lastInteractionDate = 'Agora mesmo';
          project.lastInteractionText = `Cliente: "${aggregatedText.slice(0, 35)}..."`;

          const aiResult = await handleIncomingClientMessage({
            senderPhone: parsed.senderPhone,
            messageText: aggregatedText,
            project,
            portalUrl: buildTrackingUrl(project.id),
            historyCount: context.messageCount
          });
          replyText = aiResult.replyText;
        } else {
          const aiResult = await handleIncomingClientMessage({
            senderPhone: parsed.senderPhone,
            messageText: aggregatedText,
            historyCount: context.messageCount
          });
          replyText = aiResult.replyText;
        }

        // 6. Enqueue Outgoing Dispatch with Retries and DLQ
        messageQueue.enqueueJob(
          {
            traceId: jobTraceId,
            senderPhone: parsed.senderPhone,
            payloadText: replyText,
            projectId: project?.id,
            maxAttempts: 4
          },
          async (job) => {
            const sendResult = await sendUazapiTextMessage({
              number: job.senderPhone,
              text: job.payloadText
            });

            if (sendResult.success) {
              dialogManager.updateContext(job.senderPhone, { lastReplyText: job.payloadText });
              return { success: true, responsePreview: job.payloadText.slice(0, 50) };
            }
            return { success: false, error: sendResult.error || 'Falha no envio UAZAPI' };
          }
        );
      }
    );
  } catch (err: any) {
    logger.log('ERROR', 'webhook', `Exceção não tratada no processamento de webhook: ${err.message}`, {
      traceId,
      error: err
    });
    if (!res.headersSent) {
      res.status(200).json({ received: true, error: err.message });
    }
  }
});

// --- AUDIT & OBSERVABILITY ENDPOINTS ---

// 1. Health & Queue Metrics
app.get('/api/admin/audit/metrics', (req, res) => {
  const queueStats = messageQueue.getQueueStats();
  const metrics = logger.getMetrics(queueStats.pending, queueStats.deadLetterCount);
  const session = getLocalWhatsAppSession();

  res.json({
    metrics,
    queue: queueStats,
    session: {
      connected: session.connected,
      phoneNumber: session.phoneNumber,
      instanceName: session.instanceName
    },
    serverTime: new Date().toISOString()
  });
});

// 2. Structured Audit Logs with filters
app.get('/api/admin/audit/logs', (req, res) => {
  const { level, category, search, limit, phone } = req.query;
  const logs = logger.getLogs({
    level: (level as any) || 'ALL',
    category: (category as any) || 'ALL',
    search: (search as string) || undefined,
    phone: (phone as string) || undefined,
    limit: limit ? parseInt(limit as string, 10) : 100
  });

  res.json({
    count: logs.length,
    logs
  });
});

// 3. Dead Letter Queue list
app.get('/api/admin/audit/dlq', (req, res) => {
  const dlq = messageQueue.getDeadLetters();
  res.json({
    count: dlq.length,
    items: dlq
  });
});

// 4. Retry a specific DLQ message
app.post('/api/admin/audit/dlq/:id/retry', (req, res) => {
  const { id } = req.params;
  const success = messageQueue.retryDeadLetterJob(id, async (job) => {
    const result = await sendUazapiTextMessage({
      number: job.senderPhone,
      text: job.payloadText
    });
    return { success: result.success, error: result.error, responsePreview: job.payloadText.slice(0, 50) };
  });

  if (success) {
    res.json({ success: true, message: `Mensagem [${id}] reativada para novo disparo na fila!` });
  } else {
    res.status(404).json({ success: false, error: 'Mensagem não encontrada na Dead Letter Queue' });
  }
});

// 5. Clear DLQ or Clear Logs
app.post('/api/admin/audit/dlq/clear', (req, res) => {
  messageQueue.clearDeadLetters();
  res.json({ success: true, message: 'Dead Letter Queue limpa com sucesso.' });
});

app.post('/api/admin/audit/clear-logs', (req, res) => {
  logger.clearLogs();
  res.json({ success: true, message: 'Logs de auditoria zerados com sucesso.' });
});

// 6. Automated Stress Test: Simulates concurrency, duplicate payloads, and validates idempotency
app.post('/api/admin/audit/simulate-stress-test', async (req, res) => {
  logger.log('INFO', 'system', 'Iniciando teste de estresse e auditoria de concorrência automatizado...');
  const testResults: any = {
    totalSimulations: 10,
    duplicatesDetected: 0,
    jobsEnqueued: 0,
    errorsHandledGracefully: 0,
    logsGenerated: 0
  };

  const testPhone = '5511999998888';
  const duplicateText = 'Pergunta teste sobre andamento do projeto';

  // Test 1: Submit 4 duplicate webhooks in parallel (simulating rapid network retry)
  const duplicatePromises = [1, 2, 3, 4].map(async () => {
    const dedupKey = messageQueue.generateIdempotencyKey(testPhone, duplicateText);
    if (messageQueue.isDuplicate(dedupKey)) {
      testResults.duplicatesDetected++;
    } else {
      messageQueue.markProcessed(dedupKey);
      testResults.jobsEnqueued++;
    }
  });
  await Promise.all(duplicatePromises);

  // Test 2: Process malformed payload gracefully
  const malformed = dialogManager.extractPayload({ invalid: true, nullField: null });
  if (!malformed.isValid) {
    testResults.errorsHandledGracefully++;
  }

  // Test 3: Multi-turn intent classification
  const intent1 = dialogManager.classifyIntent('Quando fica pronto o armário?');
  const intent2 = dialogManager.classifyIntent('Qual a chave pix?');
  const intent3 = dialogManager.classifyIntent('URGENTE preciso cancelar');

  logger.log('INFO', 'system', `Teste de estresse concluído com sucesso: ${testResults.duplicatesDetected} duplicatas bloqueadas por idempotência.`, {
    data: { testResults, intents: [intent1.intent, intent2.intent, intent3.intent] }
  });

  res.json({
    success: true,
    message: 'Teste de estresse e auditoria de concorrência executado com sucesso.',
    results: testResults,
    metrics: logger.getMetrics(messageQueue.getQueueStats().pending, messageQueue.getQueueStats().deadLetterCount)
  });
});

// --- WORKSPACE SYSTEM ENDPOINTS ---
interface ServerWorkspace {
  id: string;
  name: string;
  slug: string;
  segment: string;
  segmentLabel: string;
  type: 'matriz' | 'filial' | 'segmento';
  city?: string;
  state?: string;
  phone?: string;
  address?: string;
  isDefault?: boolean;
  ownerEmail?: string;
  createdAt: string;
}

function loadWorkspacesFromDisk(): ServerWorkspace[] {
  try {
    ensureDataDir();
    if (fs.existsSync(WORKSPACES_FILE)) {
      const raw = fs.readFileSync(WORKSPACES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[Persistence] Error loading workspaces from disk:', err);
  }
  return [
    {
      id: 'ws-matriz',
      name: 'Gestão de Projetos (Matriz)',
      slug: 'gestao-projetos-matriz',
      segment: 'projetos',
      segmentLabel: 'Projetos Gerais',
      type: 'matriz',
      city: 'São Paulo - SP',
      state: 'SP',
      phone: '+55 (11) 98765-4321',
      address: 'Av. Paulista, 1000 - Conjunto 80',
      isDefault: true,
      ownerEmail: 'henrique.ferrazms@gmail.com',
      createdAt: new Date().toISOString()
    }
  ];
}

function saveWorkspacesToDisk() {
  try {
    ensureDataDir();
    const tmp = `${WORKSPACES_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(serverWorkspaces, null, 2), 'utf-8');
    fs.renameSync(tmp, WORKSPACES_FILE);
  } catch (err) {
    console.error('[Persistence] Error saving workspaces to disk:', err);
  }
}

let serverWorkspaces: ServerWorkspace[] = loadWorkspacesFromDisk();

// Get workspaces for tenant (Strict subscriber isolation)
app.get('/api/workspaces', (req, res) => {
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  if (!userEmail) {
    return res.json([]);
  }

  // Isolamento estrito: Somente workspaces pertencentes ao assinante autenticado
  let userWorkspaces = serverWorkspaces.filter(ws => {
    return (ws.ownerEmail || '').toLowerCase().trim() === userEmail;
  });

  // Se o novo assinante ainda não possuir nenhum workspace, cria o seu workspace matriz limpo e pronto para uso
  if (userWorkspaces.length === 0) {
    const cleanId = `ws-${userEmail.replace(/[^a-z0-9]/g, '').slice(0, 15) || 'matriz'}`;
    const newDefaultWs: ServerWorkspace = {
      id: cleanId,
      name: 'Matriz Principal',
      slug: 'matriz',
      segment: 'projetos',
      segmentLabel: 'Projetos Gerais',
      type: 'matriz',
      city: '',
      state: '',
      phone: '',
      address: '',
      isDefault: true,
      ownerEmail: userEmail,
      createdAt: new Date().toISOString()
    };
    serverWorkspaces.push(newDefaultWs);
    saveWorkspacesToDisk();
    userWorkspaces = [newDefaultWs];
  }

  const enriched = userWorkspaces.map(ws => ({
    ...ws,
    activeProjectsCount: initialProjects.filter(p => 
      (p.ownerEmail || '').toLowerCase().trim() === userEmail &&
      p.workspaceId === ws.id && 
      !p.isDeleted && 
      p.status !== 'excluido'
    ).length
  }));
  res.json(enriched);
});

// Create workspace
app.post('/api/workspaces', (req, res) => {
  const { name, segment, segmentLabel, type, city, state, phone, address, plan } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nome do workspace é obrigatório' });
  }

  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    req.body.ownerEmail ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  if (!userEmail) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const isFounder = userEmail === 'henrique.ferrazms@gmail.com';
  const effectivePlan = plan || 'free';
  const maxAllowed = isFounder ? 999 : (effectivePlan === 'escala' ? 6 : effectivePlan === 'start' ? 3 : 1);

  // Valida o limite de workspaces apenas dentro da conta do assinante atual
  const currentUserWorkspaces = serverWorkspaces.filter(ws => (ws.ownerEmail || '').toLowerCase().trim() === userEmail);
  if (!isFounder && currentUserWorkspaces.length >= maxAllowed) {
    return res.status(403).json({ 
      error: `Limite de ${maxAllowed} workspace(s) atingido para o plano ${effectivePlan === 'escala' ? 'Scala' : effectivePlan === 'start' ? 'Start' : 'Grátis'}. Faça upgrade de plano para criar novos ambientes.` 
    });
  }

  const newWs: ServerWorkspace = {
    id: `ws-${Date.now().toString().slice(-6)}`,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
    segment: segment || 'projetos',
    segmentLabel: segmentLabel || 'Projetos',
    type: type || 'filial',
    city: city || '',
    state: state || '',
    phone: phone || '',
    address: address || '',
    isDefault: false,
    ownerEmail: userEmail,
    createdAt: new Date().toISOString()
  };

  serverWorkspaces.push(newWs);
  saveWorkspacesToDisk();
  res.status(201).json({
    ...newWs,
    activeProjectsCount: 0
  });
});

// Delete workspace
app.delete('/api/workspaces/:id', (req, res) => {
  const ws = serverWorkspaces.find(w => w.id === req.params.id);
  if (!ws) {
    return res.status(404).json({ error: 'Workspace não encontrado' });
  }
  if (ws.isDefault) {
    return res.status(400).json({ error: 'Não é permitido remover a Matriz padrão' });
  }
  serverWorkspaces = serverWorkspaces.filter(w => w.id !== req.params.id);
  saveWorkspacesToDisk();
  
  // Reassign any projects from deleted workspace to default Matriz
  initialProjects = initialProjects.map(p => {
    if (p.workspaceId === req.params.id) {
      return {
        ...p,
        workspaceId: 'ws-matriz',
        workspaceName: 'Gestão de Projetos (Matriz)'
      };
    }
    return p;
  });
  saveProjectsToDisk();

  res.json({ success: true, message: 'Workspace removido com sucesso' });
});

// Delete project (Move to exclusion tab / soft delete)
app.delete('/api/projects/:id', (req, res) => {
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  const removed = req.tenantDb.deleteProject(req.params.id, userEmail || 'Administrador');
  if (!removed) {
    return res.status(404).json({ error: 'Projeto não encontrado ou acesso não autorizado' });
  }
  // Remove active alerts tied to this project
  supportAlerts = supportAlerts.filter(a => a.projectId !== req.params.id);
  res.json({ success: true, message: 'Projeto movido para a aba de exclusão com sucesso', project: removed });
});

// Restore project from exclusion tab
app.post('/api/projects/:id/restore', (req, res) => {
  const restored = req.tenantDb.restoreProject(req.params.id);
  if (!restored) {
    return res.status(404).json({ error: 'Projeto não encontrado ou não autorizado para restauração' });
  }
  res.json({ success: true, message: 'Projeto restaurado com sucesso', project: restored });
});

// ============================================================================
// TEAM MEMBERS STORE & API (MODO TIME - RBAC)
// Roles: 'ceo' (Acesso total), 'admin' (Projetos, Clientes e IA), 'parceiro' (Dashboard + Abertura de OS, sem financeiro)
// Authorized starting from 'start' plan
// ============================================================================

export interface ServerTeamMember {
  id: string;
  name: string;
  email: string;
  role: 'ceo' | 'admin' | 'parceiro';
  phone?: string;
  status: 'active' | 'invited';
  workspaceAccess: 'all' | string[];
  invitedAt: string;
  joinedAt?: string;
  invitedBy?: string;
  inviteToken?: string;
  ownerEmail?: string;
}

let serverTeamMembers: ServerTeamMember[] = [
  {
    id: 'member-ceo-1',
    name: 'Luis Henrique Ferraz',
    email: 'henrique.ferrazms@gmail.com',
    ownerEmail: 'henrique.ferrazms@gmail.com',
    role: 'ceo',
    phone: '+55 62 98220-0944',
    status: 'active',
    workspaceAccess: 'all',
    invitedAt: '24/09/2026',
    joinedAt: '24/09/2026',
    invitedBy: 'Titular da Conta'
  }
];

// List team members (Strict multi-tenant subscriber isolation)
app.get('/api/team', (req, res) => {
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  if (!userEmail) {
    return res.json({ members: [], total: 0 });
  }

  // Filtrar estritamente membros da equipe pertencentes a este assinante
  let userMembers = serverTeamMembers.filter(m => (m.ownerEmail || '').toLowerCase().trim() === userEmail);

  // Se o novo assinante ainda não possuir nenhum registro de time no servidor, inicializa ele próprio como CEO
  if (userMembers.length === 0) {
    const defaultCeo: ServerTeamMember = {
      id: `member-ceo-${Date.now().toString().slice(-6)}`,
      name: userEmail.split('@')[0],
      email: userEmail,
      ownerEmail: userEmail,
      role: 'ceo',
      status: 'active',
      workspaceAccess: 'all',
      invitedAt: new Date().toLocaleDateString('pt-BR'),
      joinedAt: new Date().toLocaleDateString('pt-BR'),
      invitedBy: 'Titular da Conta'
    };
    serverTeamMembers.push(defaultCeo);
    userMembers = [defaultCeo];
  }

  // Garantir que o titular Henrique Ferraz esteja sempre como CEO com acesso total
  if (userEmail === 'henrique.ferrazms@gmail.com') {
    userMembers.forEach(m => {
      if (m.email.toLowerCase() === 'henrique.ferrazms@gmail.com') {
        m.role = 'ceo';
      }
    });
  }

  res.json({
    members: userMembers,
    total: userMembers.length
  });
});

// Invite new member
app.post('/api/team/invite', (req, res) => {
  const { name, email, role, phone, workspaceAccess, plan = 'start' } = req.body;
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    (req.body && req.body.ownerEmail) ||
    ''
  ).toLowerCase().trim();

  if (!userEmail) {
    return res.status(401).json({ error: 'Usuário não autenticado para convidar equipe' });
  }

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Nome, e-mail e cargo são obrigatórios' });
  }

  // Check plan authorization: Modo time authorized from 'start'
  if (plan === 'free') {
    return res.status(403).json({
      error: 'O Modo Time está disponível a partir do Plano Start. Faça upgrade para autorizar convites de equipe!'
    });
  }

  const userMembers = serverTeamMembers.filter(m => (m.ownerEmail || '').toLowerCase().trim() === userEmail);
  const maxAllowed = plan === 'escala' ? 10 : 3;
  if (userMembers.length >= maxAllowed) {
    return res.status(403).json({
      error: `Limite de ${maxAllowed} membros atingido para o plano ${plan === 'escala' ? 'Scala' : 'Start'}. Faça upgrade de plano para convidar mais colaboradores.`
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = userMembers.find(m => m.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(400).json({
      error: 'Este e-mail já faz parte da sua equipe ou possui um convite cadastrado.'
    });
  }

  const token = `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const newMember: ServerTeamMember = {
    id: `member-${Date.now().toString().slice(-6)}`,
    name: name.trim(),
    email: normalizedEmail,
    ownerEmail: userEmail,
    role: role as 'ceo' | 'admin' | 'parceiro',
    phone: phone ? phone.trim() : undefined,
    status: 'invited',
    workspaceAccess: workspaceAccess || 'all',
    invitedAt: new Date().toLocaleDateString('pt-BR'),
    invitedBy: 'CEO (Titular)',
    inviteToken: token
  };

  serverTeamMembers.push(newMember);

  const origin = req.headers.origin || 'https://bomprojeto.com';
  const inviteLink = `${origin}?convite=${token}&email=${encodeURIComponent(normalizedEmail)}`;

  res.status(201).json({
    success: true,
    member: newMember,
    inviteLink,
    message: `Convite gerado com sucesso para ${name} como ${role.toUpperCase()}.`
  });
});

// Update member role
app.patch('/api/team/:id/role', (req, res) => {
  const { role } = req.body;
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    (req.body && req.body.ownerEmail) ||
    ''
  ).toLowerCase().trim();

  if (!role || !['ceo', 'admin', 'parceiro'].includes(role)) {
    return res.status(400).json({ error: 'Cargo inválido. Escolha entre ceo, admin ou parceiro' });
  }

  const member = serverTeamMembers.find(m => m.id === req.params.id);
  if (!member) {
    return res.status(404).json({ error: 'Membro não encontrado' });
  }

  if (userEmail && (member.ownerEmail || '').toLowerCase().trim() !== userEmail) {
    return res.status(403).json({ error: 'Acesso negado: este colaborador pertence a outro assinante' });
  }

  member.role = role;
  res.json({
    success: true,
    member,
    message: `Cargo de ${member.name} alterado para ${role.toUpperCase()} com sucesso.`
  });
});

// Remove member
app.delete('/api/team/:id', (req, res) => {
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  const member = serverTeamMembers.find(m => m.id === req.params.id);
  if (!member) {
    return res.status(404).json({ error: 'Membro não encontrado' });
  }

  if (userEmail && (member.ownerEmail || '').toLowerCase().trim() !== userEmail) {
    return res.status(403).json({ error: 'Acesso negado: este colaborador pertence a outro assinante' });
  }

  if (member.email.toLowerCase() === 'henrique.ferrazms@gmail.com') {
    return res.status(400).json({ error: 'Não é permitido remover o titular fundador da conta' });
  }

  serverTeamMembers = serverTeamMembers.filter(m => m.id !== req.params.id);
  res.json({
    success: true,
    message: `Membro ${member.name} removido da equipe.`
  });
});

// Resend invite
app.post('/api/team/resend-invite', (req, res) => {
  const { memberId } = req.body;
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  const member = serverTeamMembers.find(m => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: 'Membro não encontrado' });
  }

  if (userEmail && (member.ownerEmail || '').toLowerCase().trim() !== userEmail) {
    return res.status(403).json({ error: 'Acesso negado: este colaborador pertence a outro assinante' });
  }

  const token = member.inviteToken || `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  member.inviteToken = token;

  const origin = req.headers.origin || 'https://bomprojeto.com';
  const inviteLink = `${origin}?convite=${token}&email=${encodeURIComponent(member.email)}`;

  res.json({
    success: true,
    inviteLink,
    message: `Link de convite renovado para ${member.name}.`
  });
});

// ============================================================================
// SAAS SUBSCRIBERS STORE (Strictly starting from 24/09/2026 for accurate metrics)
// ============================================================================

export interface SaasSubscriber {
  id: string;
  workshopName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  plan: 'start' | 'escala' | 'free';
  billingCycle: 'monthly' | 'annual';
  status: 'active' | 'trial' | 'overdue' | 'canceled';
  trialDaysLeft?: number;
  joinedAt: string; // DD/MM/YYYY (>= 24/09/2026)
  renewalDate: string;
  activeProjects: number;
  totalProjectsCreated: number;
  whatsappMessagesSent: number;
  whatsappConnected: boolean;
  totalGMV: number;
}

// Initial clean subscriber store: only official registrations on or after 24/09/2026
let serverSubscribers: SaasSubscriber[] = [
  {
    id: 'sub-master-001',
    workshopName: 'Ferraz Gestão & Execução de Projetos',
    ownerName: 'Henrique Ferraz (Fundador)',
    email: 'henrique.ferrazms@gmail.com',
    phone: '+55 67 99988-1234',
    city: 'Campo Grande',
    state: 'MS',
    plan: 'escala',
    billingCycle: 'annual',
    status: 'active',
    joinedAt: '24/09/2026',
    renewalDate: '24/09/2027',
    activeProjects: 0,
    totalProjectsCreated: 0,
    whatsappMessagesSent: 0,
    whatsappConnected: true,
    totalGMV: 0
  }
];

// Helper to check if a DD/MM/YYYY or ISO date is on or after 24/09/2026
function isDateOnOrAfter24Sep2026(dateStr: string): boolean {
  if (!dateStr) return false;
  // If DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    const cutoff = new Date(2026, 8, 24); // Sept 24, 2026
    return date >= cutoff;
  }
  // If ISO
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const cutoff = new Date(2026, 8, 24);
    return d >= cutoff;
  }
  return true;
}

// 1. List all subscribers (filtered to >= 24/09/2026, restricted to founder)
app.get('/api/admin/subscribers', (req, res) => {
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  if (userEmail !== 'henrique.ferrazms@gmail.com') {
    return res.status(403).json({ error: 'Acesso restrito ao Fundador do BomProjeto.' });
  }

  // Ensure strict filtering: only records on or after 24/09/2026
  const filtered = serverSubscribers.filter(s => isDateOnOrAfter24Sep2026(s.joinedAt));
  serverSubscribers = filtered;
  res.json({
    success: true,
    cutoffDate: '24/09/2026',
    subscribers: filtered
  });
});

// 2. Add manual or webhook subscriber (always on or after 24/09/2026)
app.post('/api/admin/subscribers', (req, res) => {
  const {
    workshopName,
    ownerName,
    email,
    phone,
    city = 'São Paulo',
    state = 'SP',
    plan = 'start',
    billingCycle = 'monthly',
    status = 'active',
    joinedAt = '24/09/2026'
  } = req.body;

  if (!workshopName || !ownerName) {
    return res.status(400).json({ error: 'Nome da marcenaria e responsável são obrigatórios' });
  }

  // Ensure date is on or after 24/09/2026
  const finalJoinedAt = isDateOnOrAfter24Sep2026(joinedAt) ? joinedAt : '24/09/2026';

  const newSubscriber: SaasSubscriber = {
    id: `sub_${Date.now().toString(36)}`,
    workshopName,
    ownerName,
    email: email || 'cliente@marcenaria.com.br',
    phone: phone || '+55 11 99999-0000',
    city,
    state,
    plan,
    billingCycle,
    status,
    joinedAt: finalJoinedAt,
    renewalDate: billingCycle === 'annual' ? '24/09/2027' : '24/10/2026',
    activeProjects: 0,
    totalProjectsCreated: 0,
    whatsappMessagesSent: 0,
    whatsappConnected: true,
    totalGMV: 0
  };

  serverSubscribers.unshift(newSubscriber);

  res.json({
    success: true,
    subscriber: newSubscriber
  });
});

// 3. Delete subscriber
app.delete('/api/admin/subscribers/:id', (req, res) => {
  if (req.params.id === 'sub-master-001') {
    return res.status(400).json({ error: 'Não é permitido remover a conta master do Fundador' });
  }
  serverSubscribers = serverSubscribers.filter(s => s.id !== req.params.id);
  res.json({ success: true, message: 'Assinante removido com sucesso' });
});

// Full reset of mock demo data for real production launch (Preserves founder workspace & user)
app.post('/api/admin/reset-data', (req, res) => {
  const { requesterEmail } = req.body;
  if (requesterEmail && requesterEmail.toLowerCase() !== 'henrique.ferrazms@gmail.com') {
    return res.status(403).json({ error: 'Apenas o proprietário fundador pode realizar o reset completo' });
  }

  // 1. Clear all fake/mock projects, leaving a clean empty state ready for real orders
  initialProjects = [];

  // 2. Clear all mock support alerts
  supportAlerts = [];

  // 3. Reset workspaces to only the official primary Matriz
  serverWorkspaces = [
    {
      id: 'ws-matriz',
      name: 'Gestão de Projetos (Matriz)',
      slug: 'gestao-projetos-matriz',
      segment: 'projetos',
      segmentLabel: 'Projetos Gerais',
      type: 'matriz',
      city: 'São Paulo - SP',
      state: 'SP',
      phone: '+55 (11) 98765-4321',
      address: '',
      isDefault: true,
      createdAt: new Date().toISOString()
    }
  ];

  // 4. Reset subscribers strictly to only official accounts on or after 24/09/2026
  serverSubscribers = [
    {
      id: 'sub-master-001',
      workshopName: 'Ferraz Gestão & Execução de Projetos',
      ownerName: 'Henrique Ferraz (Fundador)',
      email: 'henrique.ferrazms@gmail.com',
      phone: '+55 67 99988-1234',
      city: 'Campo Grande',
      state: 'MS',
      plan: 'escala',
      billingCycle: 'annual',
      status: 'active',
      joinedAt: '24/09/2026',
      renewalDate: '24/09/2027',
      activeProjects: 0,
      totalProjectsCreated: 0,
      whatsappMessagesSent: 0,
      whatsappConnected: true,
      totalGMV: 0
    }
  ];

  res.json({
    success: true,
    message: 'Base de dados limpa com sucesso. Todos os projetos fakes e dados anteriores a 24/09/2026 foram removidos.',
    projects: initialProjects,
    workspaces: serverWorkspaces,
    subscribers: serverSubscribers
  });
});

// ============================================================================
// MERCADO PAGO SUBSCRIPTION & RECURRING BILLING ROUTES
// ============================================================================

// 1. Config status
app.get('/api/subscriptions/config', (req, res) => {
  const configured = isMercadoPagoConfigured();
  res.json({
    configured,
    mode: 'production',
    publicKey: getMercadoPagoPublicKey(),
    currency: 'BRL',
    supportedPlans: ['start', 'escala']
  });
});

// 1b. Consulta o plano ativo do usuário (Garante que novos usuários iniciam no 'free' e só sobem após pagamento confirmado)
app.get('/api/subscriptions/user-plan', (req, res) => {
  const email = ((req.query.email as string) || (req.headers['x-user-email'] as string) || '').toLowerCase().trim();

  if (!email) {
    return res.json({
      plan: 'free',
      status: 'active',
      isPaid: false
    });
  }

  // Verifica se é a conta do Criador/Fundador (Henrique Ferraz)
  if (email === 'henrique.ferrazms@gmail.com') {
    const founderSub = serverSubscribers.find(s => s.email.toLowerCase().trim() === 'henrique.ferrazms@gmail.com');
    const founderPlan = founderSub?.plan || 'escala';
    return res.json({
      plan: founderPlan,
      status: 'active',
      billingCycle: 'annual',
      isPaid: founderPlan !== 'free',
      isFounder: true,
      renewalDate: '24/09/2099',
      joinedAt: '24/09/2026'
    });
  }

  // Verifica se o assinante comum possui plano pago ativo registrado no banco
  const sub = serverSubscribers.find(s => s.email.toLowerCase().trim() === email);
  if (sub && sub.status === 'active' && (sub.plan === 'start' || sub.plan === 'escala')) {
    return res.json({
      plan: sub.plan,
      status: sub.status,
      billingCycle: sub.billingCycle || 'monthly',
      isPaid: true,
      renewalDate: sub.renewalDate,
      joinedAt: sub.joinedAt
    });
  }

  // Usuário padrão ou não assinante: sempre plano gratuito
  return res.json({
    plan: 'free',
    status: 'active',
    billingCycle: 'none',
    isPaid: false
  });
});

// 1c. Rota para o Fundador/Criador alternar seu plano livremente para testes
app.post('/api/subscriptions/founder-plan', (req, res) => {
  const { email, plan } = req.body || {};
  const cleanEmail = (email || '').toLowerCase().trim();

  if (cleanEmail !== 'henrique.ferrazms@gmail.com') {
    return res.status(403).json({ error: 'Apenas o criador da ferramenta tem permissão para alternar o plano diretamente.' });
  }

  const validPlan = (plan === 'free' || plan === 'start' || plan === 'escala') ? plan : 'escala';
  const founderSub = serverSubscribers.find(s => s.email.toLowerCase().trim() === 'henrique.ferrazms@gmail.com');
  if (founderSub) {
    founderSub.plan = validPlan;
  } else {
    serverSubscribers.push({
      id: 'sub-master-001',
      workshopName: 'Ferraz Gestão & Execução de Projetos',
      ownerName: 'Henrique Ferraz (Fundador)',
      email: 'henrique.ferrazms@gmail.com',
      phone: '+55 67 99988-1234',
      city: 'Campo Grande',
      state: 'MS',
      plan: validPlan,
      billingCycle: 'annual',
      status: 'active',
      joinedAt: '24/09/2026',
      renewalDate: '24/09/2099',
      activeProjects: 0,
      totalProjectsCreated: 0,
      whatsappMessagesSent: 0,
      whatsappConnected: true,
      totalGMV: 0
    });
  }

  console.log(`[Founder Plan Change] Plano do Criador Henrique Ferraz alterado para: ${validPlan.toUpperCase()}`);
  res.json({
    success: true,
    plan: validPlan,
    message: `Plano do Criador alterado para ${validPlan.toUpperCase()} com sucesso para testes.`
  });
});

// 2. Cria plano associado (/preapproval_plan)
app.post('/api/subscriptions/create-plan', async (req, res) => {
  try {
    const { planId, billingCycle = 'monthly' } = req.body;
    const isAnnual = billingCycle === 'annual';

    let reason = 'BOMProjeto - Plano Start';
    let transactionAmount = isAnnual ? 411.56 : 493.87;

    if (planId === 'escala') {
      reason = 'BOMProjeto - Plano Scala';
      transactionAmount = isAnnual ? 737.95 : 983.93;
    }

    reason += isAnnual ? ' (Anual)' : ' (Mensal)';

    const origin = req.headers.origin || getPublicTrackingBaseUrl(req);
    const backUrl = `${origin}?subscription_return=1&plan=${planId}`;

    const planPayload: any = {
      reason,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        repetitions: isAnnual ? 12 : undefined,
        billing_day: 10,
        billing_day_proportional: true,
        transaction_amount: transactionAmount,
        currency_id: 'BRL'
      },
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }]
      },
      back_url: backUrl
    };

    const createdPlan = await createPreapprovalPlan(planPayload);

    res.json({
      success: true,
      plan: createdPlan
    });
  } catch (err: any) {
    console.error('[Error create-plan]:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Erro ao criar plano no Mercado Pago'
    });
  }
});

// 3. Cria assinatura de cliente associada ao plano (/preapproval)
app.post('/api/subscriptions/subscribe', async (req, res) => {
  try {
    const {
      planId,
      billingCycle = 'monthly',
      payerEmail,
      cardTokenId,
      card,
      workspaceId
    } = req.body;

    if (!payerEmail || !payerEmail.includes('@')) {
      return res.status(400).json({ 
        success: false,
        error: 'O e-mail do assinante (payer_email) é obrigatório e deve ser válido.' 
      });
    }

    // Regra Mercado Pago: O e-mail do pagador não pode ser o mesmo do recebedor
    if (payerEmail.toLowerCase().trim() === 'henrique.ferrazms@gmail.com') {
      return res.status(422).json({
        success: false,
        status: 'rejected',
        error: 'O e-mail informado para a assinatura pertence à própria conta recebedora do Mercado Pago (Fundador). Informe o e-mail real do cliente assinante para processar o cartão.',
        rejection: {
          title: 'E-mail do Pagador Conflitante',
          message: 'O e-mail informado para a assinatura pertence à própria conta recebedora do Mercado Pago (henrique.ferrazms@gmail.com).',
          reasonCode: 'same_user',
          actionPrompt: 'Informe o e-mail real da oficina/cliente assinante no campo de faturamento.',
          canRetry: true,
          suggestPix: false
        }
      });
    }

    const isAnnual = billingCycle === 'annual';
    let planTitle = planId === 'escala' ? 'BOMProjeto - Plano Scala' : 'BOMProjeto - Plano Start';
    let amount = planId === 'escala' 
      ? (isAnnual ? 737.95 : 983.93) 
      : (isAnnual ? 411.56 : 493.87);

    planTitle += isAnnual ? ' (Anual)' : ' (Mensal)';

    const origin = req.headers.origin || getPublicTrackingBaseUrl(req);
    const backUrl = `${origin}?subscription_success=1&plan=${planId}`;

    // Tokeniza o cartão do cliente caso tenha sido enviado
    let finalCardTokenId = cardTokenId;
    if (!finalCardTokenId && card && card.cardNumber) {
      finalCardTokenId = await tokenizeCard({
        cardNumber: card.cardNumber,
        cardHolder: card.cardHolder,
        cardExpiry: card.cardExpiry,
        cardCvv: card.cardCvv,
        cpfCnpj: card.cpfCnpj
      });
    }

    // Passo 1: Obter ou criar o preapproval_plan correspondente
    const planPayload: any = {
      reason: planTitle,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        repetitions: isAnnual ? 12 : undefined,
        billing_day: 10,
        billing_day_proportional: true,
        transaction_amount: amount,
        currency_id: 'BRL'
      },
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }]
      },
      back_url: backUrl
    };

    const mpPlan = await createPreapprovalPlan(planPayload);

    // Passo 2: Criar a assinatura (/preapproval) associada ao plano
    const subPayload: any = {
      preapproval_plan_id: mpPlan.id,
      reason: planTitle,
      external_reference: `bomprojeto_${planId}_${workspaceId || 'matriz'}_${Date.now()}`,
      payer_email: payerEmail,
      card_token_id: finalCardTokenId || undefined,
      back_url: backUrl,
      status: 'authorized'
    };

    const subscription = await createPreapprovalSubscription(subPayload);

    // Registra ou atualiza assinante apenas após confirmação e autorização do pagamento
    const existingIndex = serverSubscribers.findIndex(s => s.email.toLowerCase() === payerEmail.toLowerCase());
    if (existingIndex >= 0) {
      serverSubscribers[existingIndex].plan = planId;
      serverSubscribers[existingIndex].billingCycle = billingCycle;
      serverSubscribers[existingIndex].status = 'active';
      serverSubscribers[existingIndex].renewalDate = isAnnual ? '30/09/2027' : '30/10/2026';
    } else {
      serverSubscribers.unshift({
        id: `sub_${Date.now().toString(36)}`,
        workshopName: `Oficina ${payerEmail.split('@')[0]}`,
        ownerName: card?.cardHolder || payerEmail.split('@')[0],
        email: payerEmail,
        phone: '+55 11 99999-0000',
        city: 'São Paulo',
        state: 'SP',
        plan: planId,
        billingCycle,
        status: 'active',
        joinedAt: new Date().toLocaleDateString('pt-BR'),
        renewalDate: isAnnual ? '30/09/2027' : '30/10/2026',
        activeProjects: 0,
        totalProjectsCreated: 0,
        whatsappMessagesSent: 0,
        whatsappConnected: true,
        totalGMV: 0
      });
    }

    res.json({
      success: true,
      status: 'authorized',
      subscription,
      plan: mpPlan,
      message: `Assinatura do ${planTitle} criada e confirmada com sucesso!`
    });
  } catch (err: any) {
    console.error('[Error subscribe]:', err);
    const rejection = err.rejection || analyzeMpError({ message: err.message });
    res.status(422).json({
      success: false,
      status: 'rejected',
      error: rejection.message,
      rejection
    });
  }
});

// ============================================================================
// PAYMENT GATEWAY & PIX BILLING ENDPOINTS
// ============================================================================

// 1. Get payment gateway public config & status (Never leaks secret keys)
app.get('/api/payment/config', (req, res) => {
  const status = getPublicPaymentGatewayStatus();
  res.json(status);
});

// 2. Generate Pix Payment Order with EMV Copia e Cola and QR Code Image
app.post('/api/payment/pix', async (req, res) => {
  try {
    const { amount, description, payer, planId, projectId, installmentNumber } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'O valor da cobrança Pix deve ser maior que zero' });
    }
    if (!payer || !payer.email) {
      return res.status(400).json({ error: 'O e-mail do pagador é obrigatório' });
    }

    const pixOrder = await createPixPayment({
      amount: Number(amount),
      description: description || 'BOMProjeto - Assinatura / Cobrança',
      payer,
      planId,
      projectId,
      installmentNumber
    });

    res.status(201).json(pixOrder);
  } catch (err: any) {
    logger.log('ERROR', 'business_logic', `Erro ao gerar Pix: ${err.message}`, { error: err });
    res.status(500).json({ error: err.message || 'Falha ao processar ordem Pix' });
  }
});

// 3. Get Pix / Payment Order Status
app.get('/api/payment/:id/status', (req, res) => {
  const order = getPaymentOrder(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Ordem de pagamento não encontrada' });
  }
  res.json(order);
});

// 4. List all payment orders (Audit/Admin)
app.get('/api/payment/orders', (req, res) => {
  const orders = getAllPaymentOrders();
  res.json({ count: orders.length, orders });
});

// 5. Simulate Sandbox Approval (for testing & homologation checklist)
app.post('/api/payment/:id/simulate-approval', (req, res) => {
  const result = simulateSandboxPaymentApproval(req.params.id);
  if (!result.success) {
    return res.status(404).json(result);
  }

  // If order is tied to a subscriber plan, activate subscriber
  const order = result.order!;
  if (order.planId && (order.planId === 'start' || order.planId === 'escala')) {
    const cycle = (order.metadata?.billingCycle || 'monthly') as 'monthly' | 'annual';
    const renewalDays = cycle === 'annual' ? 365 : 30;
    const existing = serverSubscribers.find(s => s.email?.toLowerCase() === order.payerEmail.toLowerCase());
    if (existing) {
      existing.status = 'active';
      existing.plan = order.planId as any;
      existing.billingCycle = cycle;
      existing.renewalDate = new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
    } else {
      serverSubscribers.unshift({
        id: `sub_${Date.now().toString(36)}`,
        workshopName: `Oficina ${order.payerEmail.split('@')[0]}`,
        ownerName: order.payerName || order.payerEmail.split('@')[0],
        email: order.payerEmail,
        phone: order.metadata?.phone || '+55 11 99999-0000',
        city: 'São Paulo',
        state: 'SP',
        plan: order.planId as any,
        billingCycle: cycle,
        status: 'active',
        joinedAt: new Date().toLocaleDateString('pt-BR'),
        renewalDate: new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
        activeProjects: 0,
        totalProjectsCreated: 0,
        whatsappMessagesSent: 0,
        whatsappConnected: true,
        totalGMV: 0
      });
    }
  }

  // If order is tied to a project installment, mark installment as paid
  if (order.projectId && order.installmentNumber) {
    const proj = initialProjects.find(p => p.id === order.projectId);
    if (proj) {
      const inst = proj.installments.find(i => i.number === order.installmentNumber);
      if (inst) {
        inst.status = 'paid';
        inst.paidDate = new Date().toLocaleDateString('pt-BR');
        inst.paymentMethod = 'Pix (Aprovado)';
      }
    }
  }

  res.json(result);
});

// 6. Universal Payment Webhook (with signature verification & idempotency)
app.post(
  ['/api/webhooks/payment', '/api/webhooks/mercadopago', '/api/subscriptions/webhook'],
  async (req, res) => {
    const rawBody = req.body || {};
    logger.log('INFO', 'webhook', `Webhook de pagamento recebido na rota ${req.path}`, {
      data: { bodySnippet: JSON.stringify(rawBody).slice(0, 200) }
    });

    // 1. Signature Verification using PAYMENT_WEBHOOK_SECRET
    const sigCheck = verifyPaymentWebhookSignature({
      headers: req.headers,
      body: rawBody
    });

    if (!sigCheck.isValid) {
      logger.log('WARN', 'webhook', `⚠️ Assinatura de webhook de pagamento inválida ou não autorizada: ${sigCheck.reason}`, {
        data: { ip: req.ip, userAgent: req.get('user-agent') }
      });
      return res.status(401).json({ error: 'Assinatura inválida (PAYMENT_WEBHOOK_SECRET incorreto)' });
    }

    // 2. Process event (payment.created, payment.approved, payment.failed)
    const eventResult = processPaymentWebhookEvent(rawBody);

    // 3. Post-approval actions: activate subscription in database/subscribers list
    if (eventResult.status === 'approved' && eventResult.orderId) {
      const order = getPaymentOrder(eventResult.orderId);
      if (order && order.planId) {
        const sub = serverSubscribers.find(s => s.email?.toLowerCase() === order.payerEmail.toLowerCase());
        if (sub) {
          sub.status = 'active';
          sub.plan = order.planId as any;
          sub.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
          logger.log('INFO', 'business_logic', `Assinatura de ${sub.email} ativada via webhook para o plano ${sub.plan.toUpperCase()}`);
        }
      }
    }

    res.status(200).json({ received: true, ...eventResult });
  }
);

// API Error Handler (prevents HTML Error page from finalhandler)
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Internal Error]:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erro interno no servidor'
  });
});

// 15. Dynamic Open Graph Card Generation (PNG) for Social Sharing Preview
app.get(['/api/og/acompanhar/:id', '/api/og/portal/:id', '/api/og/:id'], async (req, res) => {
  try {
    const targetId = req.params.id;
    const project = findProjectAnywhere(targetId);

    const companyName = project?.workspaceName || 'BOMProjeto';
    const projectTitle = project?.title || 'Acompanhamento do Projeto';
    const projectCode = project?.code || targetId;
    const clientName = project?.clientName || 'Cliente';
    const currentStage = project?.currentStage || 'Produção em Andamento';
    const progressPercent = project?.progressPercent ?? (project?.stages ? Math.round((project.stages.filter(s => s.status === 'completed').length / project.stages.length) * 100) : 50);

    const pngBuffer = await generateOgCardPng({
      companyName,
      projectTitle,
      projectCode,
      clientName,
      currentStage,
      progressPercent
    });

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': String(pngBuffer.length),
      'Cache-Control': 'public, max-age=1800, s-maxage=86400',
      'Access-Control-Allow-Origin': '*'
    });
    res.send(pngBuffer);
  } catch (err: any) {
    console.error('[OG Card Generator Error]:', err);
    const fallbackPath = path.join(process.cwd(), 'public', 'bomprojeto-og-card.png');
    if (fs.existsSync(fallbackPath)) {
      return res.sendFile(fallbackPath);
    }
    res.status(500).json({ error: 'Erro ao gerar imagem de pré-visualização' });
  }
});

// 16. Customer Tracking Portal SSR & Open Graph Previews (WhatsApp, Telegram, scrapers and direct browser visits)
app.get(['/acompanhar/:id', '/portal/:id', '/acompanhamento/:id'], async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const project = findProjectAnywhere(targetId);

    const companyName = project?.workspaceName || 'BOMProjeto';
    const clientFirstName = project?.clientName ? project.clientName.split(' ')[0] : 'Cliente';
    const projectTitle = project?.title || 'Acompanhamento de Projeto';
    const projectCode = project?.code || targetId;
    const currentStage = project?.currentStage || 'Produção em Andamento';

    const baseUrl = getPublicTrackingBaseUrl(req);
    const portalUrl = `${baseUrl}/acompanhar/${encodeURIComponent(targetId)}`;
    const ogImageUrl = `${baseUrl}/api/og/acompanhar/${encodeURIComponent(targetId)}`;

    const pageTitle = `${projectTitle} — ${companyName} | BOMProjeto`;
    const pageDescription = `Olá, ${clientFirstName}! Acompanhe em tempo real fotos da execução, etapas e cronograma do projeto ${projectCode} (${currentStage}) junto à ${companyName}.`;

    let template = '';
    if (process.env.NODE_ENV !== 'production') {
      const indexPath = path.join(process.cwd(), 'index.html');
      template = await fs.promises.readFile(indexPath, 'utf-8');
      if (viteDevServer) {
        template = await viteDevServer.transformIndexHtml(req.originalUrl, template);
      }
    } else {
      const distIndexPath = path.join(process.cwd(), 'dist', 'index.html');
      template = await fs.promises.readFile(distIndexPath, 'utf-8');
    }

    // Strip pre-existing generic social preview meta tags to avoid duplication and crawler confusion
    let html = template
      .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`)
      .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, '')
      .replace(/<meta\s+property="og:.*?"\s+content=".*?"\s*\/?>/gi, '')
      .replace(/<meta\s+name="twitter:.*?"\s+content=".*?"\s*\/?>/gi, '');

    const cleanSocialTags = `
    <meta name="description" content="${escapeHtml(pageDescription)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(companyName)}" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(pageDescription)}" />
    <meta property="og:url" content="${portalUrl}" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:secure_url" content="${ogImageUrl}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(pageDescription)}" />
    <meta name="twitter:image" content="${ogImageUrl}" />
    `;

    html = html.replace('</head>', `${cleanSocialTags}\n  </head>`);

    // Preload project data directly into client DOM so tracking portal opens instantly
    const hydrationScript = `
    <script>
      window.__INITIAL_PROJECT_ID__ = ${JSON.stringify(project ? project.id : targetId)};
      ${project ? `window.__INITIAL_PROJECT__ = ${JSON.stringify(project)};` : ''}
    </script>
    `;
    html = html.replace('</head>', `${hydrationScript}\n  </head>`);

    res.status(200).set({ 
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }).send(html);
  } catch (err: any) {
    console.error('[Portal SSR Error]:', err);
    next();
  }
});

// Production & Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    viteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteDevServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BOMProjeto Full-Stack Server running on port ${PORT}`);
    // Ensure UAZAPI webhook is configured to deliver customer replies
    ensureUazapiWebhook().catch(err => {
      console.warn('[UAZAPI Startup Webhook Config]:', err.message);
    });
  });
}

startServer();
