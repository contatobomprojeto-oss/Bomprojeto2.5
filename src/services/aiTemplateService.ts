import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import {
  IndustrySector,
  INDUSTRY_SECTORS,
  StageActionType,
  ProjectTemplate,
  CreateProjectTemplate
} from '../schemas/projectPersistenceSchemas';

export interface GenerateSectorTemplateInput {
  companyName: string;
  sector: string;
  organizationId?: string;
  customRequirements?: string;
}

export interface GeneratedStageOutput {
  stage_number: number;
  stage_name: string;
  objective: string;
  action_type: StageActionType;
  whatsapp_template: string;
  ai_context_instruction: string;
}

export interface GeneratedTemplateOutput {
  sector_key: IndustrySector;
  sector_label: string;
  tone_of_voice: string;
  stages: GeneratedStageOutput[];
}

/**
 * Memória/Repositório de templates de projetos para execução em runtime
 */
const templateStore = new Map<string, ProjectTemplate>();

/**
 * Normaliza o identificador de nicho/setor para os padrões suportados
 */
export function normalizeSectorKey(sector: string): IndustrySector {
  const clean = (sector || '').toLowerCase().trim();
  if (
    clean.includes('trafeg') || 
    clean.includes('traffic') || 
    clean.includes('media_buyer') || 
    clean.includes('media') || 
    clean.includes('buyer') || 
    clean.includes('ads') || 
    clean.includes('performance')
  ) {
    return 'media_buyer';
  }

  if (
    clean.includes('ai') || 
    clean.includes('ia') || 
    clean.includes('auto') || 
    clean.includes('n8n') || 
    clean.includes('make') || 
    clean.includes('agent') || 
    clean.includes('bot')
  ) {
    return 'ai_agency';
  }

  return 'marketing_agency';
}

/**
 * Fallbacks de alta fidelidade para quando não houver API key ou ocorrer rate limit
 */
export function getSectorFallbackTemplate(
  companyName: string,
  sectorKey: IndustrySector,
  customSectorLabel?: string
): GeneratedTemplateOutput {
  const company = companyName?.trim() || 'Nossa Agência';

  switch (sectorKey) {
    case 'media_buyer':
      return {
        sector_key: 'media_buyer',
        sector_label: 'Gestor de Tráfego / Media Buyer',
        tone_of_voice: 'Analítico, focado em métricas, CPA, ROAS e transparência de escala.',
        stages: [
          {
            stage_number: 1,
            stage_name: 'Onboarding e Acesso às Contas (BM, GA4, GTM, Tag Manager)',
            objective: 'Concessão de acessos aos ativos, contas de anúncios, Google Analytics 4, Tag Manager e pixel.',
            action_type: 'billing_payment',
            whatsapp_template: `🎯 Olá, {{cliente}}! Seja muito bem-vindo(a) à ${company}. O projeto de tráfego pago e escala *{{projeto}}* foi oficialmente iniciado! 🚀\n\nAcesse o link seguro para acompanhar o roadmap e confirmar a entrada via Pix:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Orientar o cliente com clareza sobre permissões de administrador no Meta BM e GA4.'
          },
          {
            stage_number: 2,
            stage_name: 'Planejamento Estratégico & Briefing de Criativos',
            objective: 'Definição de públicos-alvo, personas, funil de vendas, metas de CPA/ROAS e roteiros de criativos.',
            action_type: 'approval_request',
            whatsapp_template: `📋 Olá, {{cliente}}! O planejamento estratégico e o briefing dos criativos do projeto *{{projeto}}* estão prontos para validação.\n\nAcesse e valide com 1 clique:\n👉 {{link_aprovacao}}`,
            ai_context_instruction: 'Explicar a tese de validação de públicos frios e remarketing.'
          },
          {
            stage_number: 3,
            stage_name: 'Criação e Validação dos Anúncios / Copys',
            objective: 'Produção das artes, carrosséis, vídeos de alta conversão e redação persuasiva.',
            action_type: 'approval_request',
            whatsapp_template: `🎨 {{cliente}}, os anúncios e copys de alta conversão do *{{projeto}}* estão prontos no portal!\n\nConfira as peças e aprove para subida:\n👉 {{link_aprovacao}}`,
            ai_context_instruction: 'Apresentar variações de ganchos e headlines para teste A/B.'
          },
          {
            stage_number: 4,
            stage_name: 'Subida de Campanhas & Teste de Tracking',
            objective: 'Configuração técnica das campanhas, teste de eventos de conversão e tracking de métricas.',
            action_type: 'notification_only',
            whatsapp_template: `⚡ Campanhas no ar, {{cliente}}! O projeto *{{projeto}}* está ativo nas plataformas e o tracking de métricas e conversões já está disparando perfeitamente.\n\nAcompanhe no portal:\n👉 {{link_portal}}`,
            ai_context_instruction: 'Informar que as campanhas estão na fase de aprendizado do algoritmo.'
          },
          {
            stage_number: 5,
            stage_name: 'Otimização Contínua & Fechamento de Ciclo / Relatório Quinzenal',
            objective: 'Otimização de lances, corte de criativos saturados, escala horizontal e envio do dashboard de ROAS.',
            action_type: 'billing_payment',
            whatsapp_template: `📊 Relatório quinzenal disponível, {{cliente}}! Seu ciclo de tráfego do *{{projeto}}* teve métricas consolidadas.\n\nAcesse seu relatório de ROAS e a fatura do novo ciclo no link seguro:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Apresentar os dados consolidados de ROAS, custo por lead e retorno financeiro.'
          }
        ]
      };

    case 'ai_agency':
      return {
        sector_key: 'ai_agency',
        sector_label: 'Agência / Consultoria de Automação & IA',
        tone_of_voice: 'Tecnológico, ágil, metodológico e orientado à eliminação de processos manuais.',
        stages: [
          {
            stage_number: 1,
            stage_name: 'Mapeamento de Processos e Levantamento de Requisitos',
            objective: 'Diagnóstico da arquitetura atual, mapeamento de gargalos e definição do fluxo de automação.',
            action_type: 'billing_payment',
            whatsapp_template: `🤖 Olá, {{cliente}}! Seja bem-vindo(a) à ${company}. A implementação da sua solução de IA e automação *{{projeto}}* foi oficialmente iniciada!\n\nAcompanhe os fluxos e realize a entrada Pix no link seguro:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Confirmar os requisitos técnicos e ferramentas integradas (Make, n8n, CRM).'
          },
          {
            stage_number: 2,
            stage_name: 'Integração de APIs / Webhooks / Make / n8n',
            objective: 'Conexão dos endpoints, webhooks de CRM, WhatsApp API oficial, banco de dados e gateways.',
            action_type: 'notification_only',
            whatsapp_template: `🔌 {{cliente}}, os webhooks e integrações de API do projeto *{{projeto}}* foram estruturados e conectados com sucesso.\n\nVeja o status dos nós no portal:\n👉 {{link_portal}}`,
            ai_context_instruction: 'Explicar a segurança dos webhooks e criptografia dos dados transmitidos.'
          },
          {
            stage_number: 3,
            stage_name: 'Configuração de Prompts / Base de Conhecimento / Agentes',
            objective: 'Engenharia de prompts, embeddings na base de conhecimento, regras de negócio e tom de voz.',
            action_type: 'approval_request',
            whatsapp_template: `🧠 {{cliente}}, os prompts e a base de conhecimento do agente IA do projeto *{{projeto}}* foram configurados!\n\nValide as respostas e o tom no link seguro:\n👉 {{link_aprovacao}}`,
            ai_context_instruction: 'Pedir que o cliente teste perguntas comuns do seu atendimento comercial.'
          },
          {
            stage_number: 4,
            stage_name: 'Ambiente de Homologação / Testes Internos',
            objective: 'Simulação de estresse, bateria de testes com cenários edge-case e validação de tempo de resposta.',
            action_type: 'approval_request',
            whatsapp_template: `🧪 {{cliente}}, sua solução de IA *{{projeto}}* está no ambiente de homologação para testes reais com sua equipe!\n\nAcesse o ambiente de sandbox e aprove o go-live:\n👉 {{link_aprovacao}}`,
            ai_context_instruction: 'Orientar o cliente a simular conversas reais no ambiente de sandbox.'
          },
          {
            stage_number: 5,
            stage_name: 'Treinamento do Cliente & Go-Live (Produção)',
            objective: 'Deploy definitivo em produção, treinamento da equipe interna e documentação técnica.',
            action_type: 'billing_payment',
            whatsapp_template: `🚀 Parabéns, {{cliente}}! O projeto de automação *{{projeto}}* está no ar em produção gerando eficiência real.\n\nTermo de entrega técnica, gravação do treinamento e quitação no link:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Entregar o manual de operação e reforçar o suporte técnico do go-live.'
          }
        ]
      };

    case 'marketing_agency':
    default:
      return {
        sector_key: 'marketing_agency',
        sector_label: customSectorLabel || 'Agência de Marketing / Publicidade',
        tone_of_voice: 'Estratégico, criativo e colaborativo. Focado em autoridade de marca, conversão e retenção.',
        stages: [
          {
            stage_number: 1,
            stage_name: 'Alinhamento de Branding & Tom de Voz',
            objective: 'Imersão de marca, definição de arquétipo, manual de identidade visual e proposta de valor.',
            action_type: 'billing_payment',
            whatsapp_template: `✨ Olá, {{cliente}}! Seja bem-vindo(a) à ${company}. O projeto estratégico de marketing *{{projeto}}* foi iniciado!\n\nAcesse seu roadmap e realize a entrada no link seguro:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Alinhar as diretrizes de marca e cronograma das primeiras entregas criativas.'
          },
          {
            stage_number: 2,
            stage_name: 'Roteirização e Produção de Conteúdo',
            objective: 'Pesquisa de tendências, roteiros de Reels/TikTok, copy persuasiva e calendário editorial.',
            action_type: 'approval_request',
            whatsapp_template: `✍️ {{cliente}}, o calendário editorial e roteiros do *{{projeto}}* estão prontos para sua validação!\n\nAprove com 1 clique no portal:\n👉 {{link_aprovacao}}`,
            ai_context_instruction: 'Explicar a estratégia por trás dos formatos sugeridos para engajamento.'
          },
          {
            stage_number: 3,
            stage_name: 'Aprovação de Peças e Design',
            objective: 'Diagramação de carrosséis, key visuals, banners promocionais e vídeos editados.',
            action_type: 'approval_request',
            whatsapp_template: `🎨 {{cliente}}, as artes e criativos finais do projeto *{{projeto}}* estão disponíveis para revisão.\n\nConfira as peças no portal:\n👉 {{link_aprovacao}}`,
            ai_context_instruction: 'Apresentar os mockups aplicados nos canais digitais do cliente.'
          },
          {
            stage_number: 4,
            stage_name: 'Programação e Disparos',
            objective: 'Agendamento em plataformas, automação de publicações e integração com canais de aquisição.',
            action_type: 'notification_only',
            whatsapp_template: `📢 Tudo programado, {{cliente}}! As publicações e campanhas do projeto *{{projeto}}* foram agendadas e já começaram a rodar.\n\nAcompanhe no link:\n👉 {{link_portal}}`,
            ai_context_instruction: 'Informar que o cronograma está rodando conforme planejado.'
          },
          {
            stage_number: 5,
            stage_name: 'Relatório de Performance & ROAS',
            objective: 'Consolidação de métricas de alcance, engajamento, leads capturados e faturamento gerado.',
            action_type: 'billing_payment',
            whatsapp_template: `🏆 Ciclo concluído com sucesso, {{cliente}}! O relatório de métricas e conversões do *{{projeto}}* está pronto.\n\nAcesse o dashboard de resultados e a quitação no link seguro:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Apresentar os resultados e propor o plano para o próximo ciclo mensal.'
          }
        ]
      };
  }
}

/**
 * Geração dinâmica de templates via IA com Structured Outputs (gemini-2.5-flash)
 */
// In-memory cache for ultra-fast template retrieval
const sectorTemplateCache = new Map<string, ProjectTemplate>();

export async function generateSectorTemplate(
  input: GenerateSectorTemplateInput
): Promise<ProjectTemplate> {
  const { companyName, sector, organizationId, customRequirements } = input;
  const sectorKey = normalizeSectorKey(sector);
  const company = companyName?.trim() || 'BOM Projeto';
  const cacheKey = `${company.toLowerCase()}_${sector.toLowerCase()}_${(customRequirements || '').trim().toLowerCase()}`;

  // 1. Instant Cache Hit
  const cached = sectorTemplateCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // Se não houver chave de API configurada, utiliza os fallbacks enriquecidos
  if (!apiKey) {
    const fallback = getSectorFallbackTemplate(company, sectorKey);
    const persisted = persistTemplate(fallback, organizationId);
    sectorTemplateCache.set(cacheKey, persisted);
    return persisted;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Você é um Arquiteto de Processos e Especialista em Comunicação via WhatsApp para o ecossistema digital de alta performance (Agências de Marketing Digital, Agências/Consultorias de Automação & IA, e Gestores de Tráfego Pago / Media Buyers).
Sua missão é criar o Cronograma e Régua de WhatsApp Comercial PERFEITA para a agência/empresa "${company}", do segmento digital "${sector}".

DIRETRIZES FUNDAMENTAIS:
1. Etapas (stages): Crie entre 4 a 5 etapas lógicas de execução/sprint, numeradas consecutivamente (1, 2, 3...).
2. Tipos de Ação (action_type): Use estritamente um dos seguintes:
   - 'notification_only': Apenas informa o avanço das sprints, subida de campanhas ou deploy de nós.
   - 'input_request': Solicita acessos (BM, GA4, GTM), tokens de API ou briefings ao cliente.
   - 'approval_request': Pede aprovação formal de criativos, copys, fluxos de automação ou relatórios.
   - 'billing_payment': Etapa vinculada a pagamento (setup, entrada, mensalidade ou fechamento de ciclo).
3. Mensagens de WhatsApp (whatsapp_template):
   - Devem soar naturais, ágeis, estratégicas e profissionais (linguagem moderna do mercado digital).
   - Usar emojis relevantes sem poluição visual.
   - Usar placeholders dinâmicos padrão: {{cliente}}, {{projeto}}, {{empresa}}, {{link_portal}}, {{link_pix}}, {{link_aprovacao}}.
4. Instrução da IA (ai_context_instruction):
   - Orientação interna para o agente de IA saber como responder a dúvidas do cliente sobre métricas, prazos de entrega de criativos ou status de integrações nesta etapa específica.`;

    const userPrompt = `Gere o template de projeto completo para a agência/empresa digital "${company}" atuando no nicho "${sector}".
${customRequirements ? `Requisitos e particularidades da operação: ${customRequirements}` : ''}`;

    const generatePromise = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sector_key: {
              type: Type.STRING,
              description: 'Chave normalizada do setor (marketing_agency, ai_agency, media_buyer)'
            },
            sector_label: {
              type: Type.STRING,
              description: 'Nome legível e profissional do setor no mercado'
            },
            tone_of_voice: {
              type: Type.STRING,
              description: 'Descrição detalhada do tom de voz e vocabulário'
            },
            stages: {
              type: Type.ARRAY,
              description: 'Lista de 4 a 6 etapas cronológicas do serviço',
              items: {
                type: Type.OBJECT,
                properties: {
                  stage_number: { type: Type.INTEGER },
                  stage_name: { type: Type.STRING },
                  objective: { type: Type.STRING },
                  action_type: {
                    type: Type.STRING,
                    enum: ['notification_only', 'input_request', 'approval_request', 'billing_payment']
                  },
                  whatsapp_template: { type: Type.STRING },
                  ai_context_instruction: { type: Type.STRING }
                },
                required: [
                  'stage_number',
                  'stage_name',
                  'objective',
                  'action_type',
                  'whatsapp_template',
                  'ai_context_instruction'
                ]
              }
            }
          },
          required: ['sector_key', 'sector_label', 'tone_of_voice', 'stages']
        }
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timed out')), 15000)
    );

    const response: any = await Promise.race([generatePromise, timeoutPromise]);

    const parsedJson = JSON.parse(response.text || '{}') as GeneratedTemplateOutput;

    // Validação de sanidade do JSON retornado pela IA
    if (!parsedJson || !Array.isArray(parsedJson.stages) || parsedJson.stages.length === 0) {
      throw new Error('Retorno da IA incompleto ou sem etapas');
    }

    // Normaliza sector_key de volta para os padrões seguros e limpa numeração repetida
    parsedJson.sector_key = normalizeSectorKey(parsedJson.sector_key || sectorKey);
    parsedJson.stages = parsedJson.stages.map((stg, idx) => ({
      ...stg,
      stage_number: idx + 1,
      stage_name: (stg.stage_name || '').replace(/^\d+[\.\-\)]\s*/, '').trim() || `Etapa ${idx + 1}`
    }));

    const result = persistTemplate(parsedJson, organizationId);
    sectorTemplateCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('[aiTemplateService] Falha ou indisponibilidade na API Gemini, acionando fallback estruturado:', error);
    const fallback = getSectorFallbackTemplate(company, sectorKey, sector);
    const result = persistTemplate(fallback, organizationId);
    sectorTemplateCache.set(cacheKey, result);
    return result;
  }
}

/**
 * Persiste o template em memória e retorna a entidade completa
 */
function persistTemplate(output: GeneratedTemplateOutput, organizationId?: string): ProjectTemplate {
  const templateId = crypto.randomUUID();
  const now = new Date().toISOString();

  const stagesWithIds = output.stages.map((stg, idx) => ({
    id: crypto.randomUUID(),
    template_id: templateId,
    stage_number: stg.stage_number || idx + 1,
    stage_name: (stg.stage_name || '').replace(/^\d+[\.\-\)]\s*/, '').trim() || `Etapa ${idx + 1}`,
    objective: stg.objective,
    action_type: stg.action_type,
    whatsapp_template: stg.whatsapp_template,
    ai_context_instruction: stg.ai_context_instruction,
    created_at: now,
    updated_at: now
  }));

  const template: ProjectTemplate = {
    id: templateId,
    organization_id: organizationId || null,
    sector_key: output.sector_key,
    sector_label: output.sector_label,
    tone_of_voice: output.tone_of_voice,
    is_system_default: !organizationId,
    stages: stagesWithIds,
    created_at: now,
    updated_at: now
  };

  templateStore.set(templateId, template);
  return template;
}

export function getTemplateById(templateId: string): ProjectTemplate | undefined {
  return templateStore.get(templateId);
}

export function getAllTemplates(): ProjectTemplate[] {
  return Array.from(templateStore.values());
}
