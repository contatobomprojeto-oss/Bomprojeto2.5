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
  if (clean.includes('marcen')) return 'marcenaria';
  if (clean.includes('serralh') || clean.includes('metal')) return 'serralheria';
  if (clean.includes('vidr') || clean.includes('esquadr')) return 'vidracaria';
  if (clean.includes('arquit') || clean.includes('inter')) return 'arquitetura_interiores';
  if (clean.includes('reform') || clean.includes('constr') || clean.includes('obra')) return 'reformas_construcao';
  if (clean.includes('marmor')) return 'marmoraria';
  if (clean.includes('solar') || clean.includes('energ')) return 'energia_solar';
  if (clean.includes('comunic') || clean.includes('visual') || clean.includes('lumin')) return 'comunicacao_visual';
  return 'geral';
}

/**
 * Fallbacks de alta fidelidade para quando não houver API key ou ocorrer rate limit
 */
export function getSectorFallbackTemplate(companyName: string, sectorKey: IndustrySector): GeneratedTemplateOutput {
  const company = companyName?.trim() || 'Nossa Empresa';

  switch (sectorKey) {
    case 'marcenaria':
      return {
        sector_key: 'marcenaria',
        sector_label: 'Marcenaria & Móveis Planejados',
        tone_of_voice: 'Profissional, acolhedor e técnico. Transmite zelo artesanal, precisão milimétrica e transparência no cumprimento de prazos.',
        stages: [
          {
            stage_number: 1,
            stage_name: '1. Briefing & Contrato',
            objective: 'Alinhar especificações técnicas, acabamentos e formalizar o início do projeto com a entrada.',
            action_type: 'billing_payment',
            whatsapp_template: `👋 Olá, {{cliente}}! Seja muito bem-vindo(a) à ${company}. Seu projeto *{{projeto}}* foi iniciado com sucesso! 🎉\n\n📄 Acesse seu contrato e realize o pagamento da entrada via Pix Copia e Cola no link seguro:\n👉 {{link_pix}}\n\nQualquer dúvida, nossa equipe está à disposição!`,
            ai_context_instruction: 'Confirme com cortesia o início dos trabalhos e reforce que as fotos da bancada serão disponibilizadas no link.'
          },
          {
            stage_number: 2,
            stage_name: '2. Medição Técnica no Local',
            objective: 'Validação milimétrica de vãos, prumos, desníveis e pontos de hidráulica e eletricidade.',
            action_type: 'approval_request',
            whatsapp_template: `📐 Olá, {{cliente}}! Nosso projetista técnico agendou a medição fina no local para seu projeto *{{projeto}}*.\n\nPor favor, confirme se o dia e horário estão adequados no link:\n👉 {{link_aprovacao}}`,
            ai_context_instruction: 'Explique a importância da conferência in loco antes do envio das peças para o corte computadorizado.'
          },
          {
            stage_number: 3,
            stage_name: '3. Desenhos 3D & Engenharia',
            objective: 'Apresentar a modelagem 3D, puxadores, divisórias e memorial descritivo para aprovação formal.',
            action_type: 'approval_request',
            whatsapp_template: `✨ {{cliente}}, temos ótimas notícias! O projeto 3D e renderizações do *{{projeto}}* ficaram prontos!\n\nVeja cada detalhe em alta definição e aprove com 1 clique:\n👉 {{link_portal}}`,
            ai_context_instruction: 'Oriente o cliente a revisar posições de tomadas, puxadores e divisórias internas com calma.'
          },
          {
            stage_number: 4,
            stage_name: '4. Corte & Produção na Fábrica',
            objective: 'Usinagem das chapas de MDF, colagem de bordas PUR e pré-montagem dos módulos estruturais.',
            action_type: 'notification_only',
            whatsapp_template: `🪵 Direto da fábrica, {{cliente}}! Seu projeto *{{projeto}}* está em fase de usinagem e estruturação na bancada.\n\n📸 Confira as fotos da produção em tempo real no seu portal:\n👉 {{link_portal}}`,
            ai_context_instruction: 'Envie as fotos anexadas gerando entusiasmo e demonstrando a solidez e o capricho do acabamento.'
          },
          {
            stage_number: 5,
            stage_name: '5. Transporte & Montagem no Imóvel',
            objective: 'Instalação dos móveis no imóvel do cliente com equipe própria e proteção das áreas.',
            action_type: 'billing_payment',
            whatsapp_template: `🚛 Olá, {{cliente}}! Nossos montadores chegaram ao local para a montagem do *{{projeto}}*.\n\n💳 Para sua comodidade, a 2ª parcela contratual já está disponível com Pix instantâneo:\n👉 {{link_pix}}\n\nSeguiremos cuidando de cada detalhe!`,
            ai_context_instruction: 'Cobrança elegante e transparente vinculada ao início da montagem no endereço do cliente.'
          },
          {
            stage_number: 6,
            stage_name: '6. Entrega Técnica & Termo de Aceite',
            objective: 'Regulagem fina das portas e gavetas, limpeza detalhada, entrega do certificado de garantia.',
            action_type: 'billing_payment',
            whatsapp_template: `🏆 Tudo pronto, {{cliente}}! O seu projeto *{{projeto}}* foi concluído com chave de ouro pela equipe ${company}.\n\n📄 Seu Termo de Garantia e a parcela final estão disponíveis no link:\n👉 {{link_pix}}\n\nMuito obrigado pela confiança! ❤️`,
            ai_context_instruction: 'Agradeça a parceria, entregue o documento de garantia e peça uma breve avaliação do atendimento.'
          }
        ]
      };

    case 'serralheria':
      return {
        sector_key: 'serralheria',
        sector_label: 'Serralheria & Estruturas Metálicas',
        tone_of_voice: 'Objetivo, robusto e pontual. Enfatiza segurança estrutural, qualidade das soldas e durabilidade do tratamento anticorrosivo.',
        stages: [
          {
            stage_number: 1,
            stage_name: '1. Projeto Técnico & Gabaritos',
            objective: 'Dimensionamento de perfis de aço, cálculo de cargas e formalização da ordem de serviço.',
            action_type: 'billing_payment',
            whatsapp_template: `⚙️ Olá, {{cliente}}! Ordem de serviço do projeto *{{projeto}}* aprovada na ${company}.\n\nPara liberar a compra do aço estrutural, segue a chave Pix da entrada:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Informe que o material está sendo reservado conforme as especificações de espessura e resistência.'
          },
          {
            stage_number: 2,
            stage_name: '2. Corte, Dobra & Soldagem MIG',
            objective: 'Fabricação estrutural e união das peças metálicas com conferência rigorosa de esquadro.',
            action_type: 'notification_only',
            whatsapp_template: `🔥 Fala, {{cliente}}! A estrutura do seu projeto *{{projeto}}* está na fase de solda MIG técnica e esquadro.\n\nVeja as fotos da produção:\n👉 {{link_portal}}`,
            ai_context_instruction: 'Compartilhe fotos do alinhamento e reforços de solda.'
          },
          {
            stage_number: 3,
            stage_name: '3. Pintura Eletrostática & Cura',
            objective: 'Aplicação de fundo fosfatizante anticorrosivo e acabamento em forno epóxi.',
            action_type: 'notification_only',
            whatsapp_template: `🎨 {{cliente}}, sua estrutura recebeu a pintura eletrostática a pó e está em processo de cura térmica.\n\nAcompanhe o status:\n👉 {{link_portal}}`,
            ai_context_instruction: 'Ressalte a resistência a intempéries e riscos garantida pela pintura a pó.'
          },
          {
            stage_number: 4,
            stage_name: '4. Chumbamento & Fixação na Obra',
            objective: 'Instalação no local com parabolts, nivelamento a laser e ancoragem de segurança.',
            action_type: 'billing_payment',
            whatsapp_template: `🔩 Olá, {{cliente}}! Equipe na obra iniciando a fixação técnica da estrutura *{{projeto}}*.\n\nSegue o link da parcela de instalação com Pix:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Oriente sobre o tempo de cura dos chumbadores antes da utilização com carga total.'
          },
          {
            stage_number: 5,
            stage_name: '5. Entrega Técnica & Laudo de Garantia',
            objective: 'Revisão final, regulagem de trincos/fechaduras e entrega do certificado de conformidade.',
            action_type: 'billing_payment',
            whatsapp_template: `🏁 Serviço concluído com sucesso, {{cliente}}! Seu projeto *{{projeto}}* está pronto e garantido.\n\nTermo de entrega e quitação disponíveis em:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Finalize formalmente e convide para futuros projetos industriais ou residenciais.'
          }
        ]
      };

    default:
      return {
        sector_key: sectorKey,
        sector_label: 'Serviços Técnicos Especializados',
        tone_of_voice: 'Claro, ágil e resolutivo. Focado em prazos, transparência operacional e comunicação humanizada.',
        stages: [
          {
            stage_number: 1,
            stage_name: '1. Início & Alinhamento de Escopo',
            objective: 'Confirmação das especificações técnicas e validação do cronograma inicial.',
            action_type: 'billing_payment',
            whatsapp_template: `👋 Olá, {{cliente}}! Seja bem-vindo(a) à ${company}. Seu projeto *{{projeto}}* foi iniciado com sucesso!\n\nAcesse o link de acompanhamento e realize o pagamento da entrada:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Dê as boas-vindas e forneça o link onde o cliente acompanhará todo o processo sem precisar de login.'
          },
          {
            stage_number: 2,
            stage_name: '2. Desenvolvimento & Fabricação',
            objective: 'Execução técnica dos serviços e produção com controle de qualidade.',
            action_type: 'notification_only',
            whatsapp_template: `🛠️ Novidade, {{cliente}}! A produção do seu projeto *{{projeto}}* está a todo vapor na ${company}.\n\nConfira as atualizações em tempo real:\n👉 {{link_portal}}`,
            ai_context_instruction: 'Atualize o cliente sobre o progresso e envie fotos dos bastidores.'
          },
          {
            stage_number: 3,
            stage_name: '3. Instalação & Revisão Final',
            objective: 'Implementação no endereço do cliente e checklist de conformidade.',
            action_type: 'billing_payment',
            whatsapp_template: `📍 Olá, {{cliente}}! Chegamos à etapa de instalação e acabamentos finais do *{{projeto}}*.\n\nSegue o link seguro para a parcela intermediária via Pix:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Cobrança alinhada ao marco de instalação.'
          },
          {
            stage_number: 4,
            stage_name: '4. Conclusão & Entrega com Garantia',
            objective: 'Vistoria de aceite final, entrega técnica e termo de garantia formal.',
            action_type: 'billing_payment',
            whatsapp_template: `🎉 Projeto *{{projeto}}* finalizado com sucesso! A ${company} agradece sua preferência.\n\nAcesse seu Termo de Garantia e a quitação final no link:\n👉 {{link_pix}}`,
            ai_context_instruction: 'Encerramento caloroso e solicitação de feedback sobre a experiência.'
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

    const systemPrompt = `Você é um Arquiteto de Processos e Especialista em Comunicação via WhatsApp para prestadores de serviços de alto padrão no Brasil (marcenarias, serralherias, vidraçarias, escritórios de arquitetura, empreiteiras de reforma, etc.).
Sua missão é criar o Cronograma e Régua de WhatsApp Comercial PERFEITA para a empresa "${company}", do setor "${sector}".

DIRETRIZES FUNDAMENTAIS:
1. Etapas (stages): Crie entre 4 a 6 etapas lógicas de execução, numeradas consecutivamente (1, 2, 3...).
2. Tipos de Ação (action_type): Use estritamente um dos seguintes:
   - 'notification_only': Apenas informa o avanço e envia fotos no WhatsApp.
   - 'input_request': Solicita dados ou fotos ao cliente.
   - 'approval_request': Pede aprovação formal de projeto 3D, gabarito ou memorial.
   - 'billing_payment': Etapa vinculada a pagamento (entrada, montagem ou quitação).
3. Mensagens de WhatsApp (whatsapp_template):
   - Devem soar naturais, calorosas, elegantes e profissionais.
   - Usar emojis relevantes sem poluição visual.
   - Usar placeholders dinâmicos padrão: {{cliente}}, {{projeto}}, {{empresa}}, {{link_portal}}, {{link_pix}}, {{link_aprovacao}}.
4. Instrução da IA (ai_context_instruction):
   - Orientação interna para o agente de IA saber como responder a dúvidas do cliente quando o projeto estiver nesta etapa específica.`;

    const userPrompt = `Gere o template de projeto completo para a empresa "${company}" atuando no nicho "${sector}".
${customRequirements ? `Requisitos e particularidades da empresa: ${customRequirements}` : ''}`;

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
              description: 'Chave normalizada do setor (ex: marcenaria, serralheria, vidracaria, arquitetura_interiores, reformas_construcao, geral)'
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
      setTimeout(() => reject(new Error('AI generation timed out')), 2500)
    );

    const response: any = await Promise.race([generatePromise, timeoutPromise]);

    const parsedJson = JSON.parse(response.text || '{}') as GeneratedTemplateOutput;

    // Validação de sanidade do JSON retornado pela IA
    if (!parsedJson || !Array.isArray(parsedJson.stages) || parsedJson.stages.length === 0) {
      throw new Error('Retorno da IA incompleto ou sem etapas');
    }

    // Normaliza sector_key de volta para os padrões seguros
    parsedJson.sector_key = normalizeSectorKey(parsedJson.sector_key || sectorKey);

    const result = persistTemplate(parsedJson, organizationId);
    sectorTemplateCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('[aiTemplateService] Falha ou indisponibilidade na API Gemini, acionando fallback estruturado:', error);
    const fallback = getSectorFallbackTemplate(company, sectorKey);
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
    stage_name: stg.stage_name,
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
