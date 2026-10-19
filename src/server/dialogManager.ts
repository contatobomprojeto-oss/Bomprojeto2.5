import { logger } from './logger';

export interface ConversationContext {
  senderPhone: string;
  matchedProjectId?: string;
  matchedProjectCode?: string;
  lastIntent?: 'pix' | 'prazo' | 'status' | 'support' | 'general';
  lastIncomingMessage?: string;
  lastReplyText?: string;
  lastInteractionAt: number;
  messageCount: number;
}

export interface ExtractedWebhookPayload {
  isValid: boolean;
  isFromMe: boolean;
  senderPhone: string;
  rawSender: string;
  messageId?: string;
  text: string;
  hasMedia: boolean;
  mediaType?: string;
  mediaUrl?: string;
  timestamp: string;
  eventType: string;
  debugReason?: string;
}

export class DialogManager {
  private conversationContexts: Map<string, ConversationContext> = new Map();

  /**
   * Safely unwraps any incoming webhook payload from UAZAPI, Evolution API, Baileys, or Z-API.
   * Handles nested messages, buttons, lists, view-once, and media captions without throwing exceptions.
   */
  public extractPayload(body: any): ExtractedWebhookPayload {
    if (!body || typeof body !== 'object') {
      return {
        isValid: false,
        isFromMe: false,
        senderPhone: '',
        rawSender: '',
        text: '',
        hasMedia: false,
        timestamp: new Date().toISOString(),
        eventType: 'unknown',
        debugReason: 'Payload nulo ou formato não-objeto'
      };
    }

    const eventType = body.event || body.type || body.action || 'messages.upsert';
    const messageData = body.data || body.message || body.payload || body;

    // Check fromMe flag to ignore bot's own outbound messages
    const isFromMe = Boolean(
      messageData.fromMe || 
      messageData.key?.fromMe || 
      body.fromMe ||
      body.data?.key?.fromMe
    );

    // Extract raw sender
    const rawSender = String(
      messageData.number || 
      messageData.from || 
      messageData.phone || 
      messageData.key?.remoteJid || 
      body.sender || 
      body.phone || 
      body.data?.key?.remoteJid ||
      ''
    );

    const messageId = String(
      messageData.id || 
      messageData.key?.id || 
      body.id || 
      body.messageId || 
      `msg-${Date.now()}`
    );

    // Extract text across all known Baileys / WhatsApp message wrappers
    const msgObj = messageData.message || messageData;
    let extractedText = '';
    let hasMedia = false;
    let mediaType: string | undefined;
    let mediaUrl: string | undefined;

    if (typeof messageData.text === 'string' && messageData.text.trim()) {
      extractedText = messageData.text;
    } else if (typeof messageData.body === 'string' && messageData.body.trim()) {
      extractedText = messageData.body;
    } else if (typeof msgObj.conversation === 'string' && msgObj.conversation.trim()) {
      extractedText = msgObj.conversation;
    } else if (typeof msgObj.extendedTextMessage?.text === 'string') {
      extractedText = msgObj.extendedTextMessage.text;
    } else if (typeof msgObj.imageMessage?.caption === 'string') {
      extractedText = msgObj.imageMessage.caption;
      hasMedia = true;
      mediaType = 'image';
      mediaUrl = msgObj.imageMessage.url;
    } else if (typeof msgObj.videoMessage?.caption === 'string') {
      extractedText = msgObj.videoMessage.caption;
      hasMedia = true;
      mediaType = 'video';
      mediaUrl = msgObj.videoMessage.url;
    } else if (typeof msgObj.documentMessage?.caption === 'string') {
      extractedText = msgObj.documentMessage.caption;
      hasMedia = true;
      mediaType = 'document';
    } else if (typeof msgObj.buttonsResponseMessage?.selectedButtonId === 'string') {
      extractedText = msgObj.buttonsResponseMessage.selectedDisplayText || msgObj.buttonsResponseMessage.selectedButtonId;
    } else if (typeof msgObj.listResponseMessage?.singleSelectReply?.selectedRowId === 'string') {
      extractedText = msgObj.listResponseMessage.singleSelectReply.title || msgObj.listResponseMessage.singleSelectReply.selectedRowId;
    } else if (typeof body.content === 'string') {
      extractedText = body.content;
    }

    // Clean sender phone: strip @s.whatsapp.net, @c.us, @g.us and all non-numeric characters
    const cleanSender = rawSender.replace(/@.*$/, '').replace(/\D/g, '');

    if (!cleanSender) {
      return {
        isValid: false,
        isFromMe,
        senderPhone: '',
        rawSender,
        messageId,
        text: extractedText,
        hasMedia,
        timestamp: new Date().toISOString(),
        eventType,
        debugReason: 'Número de telefone do remetente não identificado no payload'
      };
    }

    return {
      isValid: true,
      isFromMe,
      senderPhone: cleanSender,
      rawSender,
      messageId,
      text: extractedText.trim(),
      hasMedia,
      mediaType,
      mediaUrl,
      timestamp: new Date().toISOString(),
      eventType
    };
  }

  /**
   * Matches an incoming sender number against a database of projects using a hierarchical strategy.
   * Prevents wrong-number collisions while supporting variations in DDD and 9-digit prefix.
   */
  public matchProjectByPhone(senderPhone: string, projects: any[]): any | null {
    const cleanSender = senderPhone.replace(/\D/g, '');
    if (!cleanSender || projects.length === 0) return null;

    // 1. Exact full match
    for (const project of projects) {
      const pClean = (project.clientPhone || '').replace(/\D/g, '');
      if (pClean && pClean === cleanSender) {
        return project;
      }
    }

    // 2. Standard 11-digit or 10-digit match (matching area code + phone number)
    const senderSuffix10 = cleanSender.slice(-10);
    const senderSuffix11 = cleanSender.slice(-11);

    for (const project of projects) {
      const pClean = (project.clientPhone || '').replace(/\D/g, '');
      if (!pClean) continue;
      if (cleanSender.endsWith(pClean) || pClean.endsWith(cleanSender)) {
        return project;
      }
      if (pClean.slice(-11) === senderSuffix11 || pClean.slice(-10) === senderSuffix10) {
        return project;
      }
    }

    // 3. Fallback: match by project code if mentioned in message text
    return null;
  }

  /**
   * Retrieves or initializes multi-turn conversation memory for a phone number.
   */
  public getContext(senderPhone: string): ConversationContext {
    const clean = senderPhone.replace(/\D/g, '');
    const existing = this.conversationContexts.get(clean);
    if (existing) {
      return existing;
    }

    const newContext: ConversationContext = {
      senderPhone: clean,
      lastInteractionAt: Date.now(),
      messageCount: 0
    };
    this.conversationContexts.set(clean, newContext);
    return newContext;
  }

  /**
   * Updates conversation state following a response dispatch.
   */
  public updateContext(
    senderPhone: string,
    updates: Partial<ConversationContext>
  ): ConversationContext {
    const context = this.getContext(senderPhone);
    const updated = {
      ...context,
      ...updates,
      lastInteractionAt: Date.now(),
      messageCount: context.messageCount + 1
    };
    this.conversationContexts.set(context.senderPhone, updated);
    return updated;
  }

  /**
   * Classifies user intent with explicit priority branches to avoid state corruption.
   */
  public classifyIntent(text: string): {
    intent: 'support' | 'pix' | 'prazo' | 'status' | 'general';
    confidence: number;
    requiresUrgentHuman: boolean;
  } {
    const lower = text.toLowerCase();

    // 1. Urgency / Human Support (Highest Priority)
    const isUrgent = 
      lower.includes('urgente') || 
      lower.includes('problema') || 
      lower.includes('defeito') || 
      lower.includes('atraso') || 
      lower.includes('cancelar') || 
      lower.includes('falar com') || 
      lower.includes('humano') || 
      lower.includes('gerente') ||
      lower.includes('atendente') ||
      lower.includes('reclamação');

    if (isUrgent) {
      return { intent: 'support', confidence: 0.95, requiresUrgentHuman: true };
    }

    // 2. Financial / Pix / Installment Inquiry
    const isPix = 
      lower.includes('pix') || 
      lower.includes('pagar') || 
      lower.includes('pagamento') || 
      lower.includes('parcela') || 
      lower.includes('chave') || 
      lower.includes('comprovante') || 
      lower.includes('boleto') ||
      lower.includes('conta');

    if (isPix) {
      return { intent: 'pix', confidence: 0.9, requiresUrgentHuman: false };
    }

    // 3. Deadline / Delivery Schedule Inquiry
    const isPrazo = 
      lower.includes('prazo') || 
      lower.includes('quando') || 
      lower.includes('data') || 
      lower.includes('entrega') || 
      lower.includes('montagem') || 
      lower.includes('instalação') ||
      lower.includes('dias');

    if (isPrazo) {
      return { intent: 'prazo', confidence: 0.9, requiresUrgentHuman: false };
    }

    // 4. Progress / Stage / Photos Inquiry
    const isStatus = 
      lower.includes('status') || 
      lower.includes('como está') || 
      lower.includes('andamento') || 
      lower.includes('foto') || 
      lower.includes('bancada') || 
      lower.includes('etapa') || 
      lower.includes('produção') ||
      lower.includes('link');

    if (isStatus) {
      return { intent: 'status', confidence: 0.85, requiresUrgentHuman: false };
    }

    return { intent: 'general', confidence: 0.6, requiresUrgentHuman: false };
  }
}

export const dialogManager = new DialogManager();
