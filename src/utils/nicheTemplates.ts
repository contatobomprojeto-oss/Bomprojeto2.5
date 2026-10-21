import { ProjectStage } from '../types';

export interface NicheTemplate {
  id: 'media_buyer' | 'ai_agency' | 'marketing_agency';
  name: string;
  badge: string;
  description: string;
  defaultStages: Array<{
    name: string;
    description: string;
    detail?: string;
    action_type?: 'billing_payment' | 'approval_request' | 'notification_only' | 'input_request';
    whatsapp_template?: string;
    ai_context_instruction?: string;
  }>;
}

export const NICHE_TEMPLATES: NicheTemplate[] = [
  {
    id: 'media_buyer',
    name: 'Gestor de Tráfego / Media Buyer',
    badge: 'Tráfego Pago & Performance',
    description: 'Fluxo para gestão de tráfego (Meta Ads, Google Ads), tracking GA4/GTM, criativos e escala de ROAS.',
    defaultStages: [
      {
        name: 'Onboarding e Acesso às Contas (BM, GA4, GTM, Tag Manager)',
        description: 'Liberação de acessos ao Business Manager, contas de anúncios, Google Analytics 4 e Pixel.',
        detail: 'Acessos e integrações validadas',
        action_type: 'billing_payment',
        whatsapp_template: '🎯 Olá, {{cliente}}! Seja muito bem-vindo(a) à {{empresa}}. O projeto de tráfego pago e escala *{{projeto}}* foi oficialmente iniciado! 🚀\n\nAcesse o link seguro para acompanhar o roadmap e confirmar a entrada via Pix:\n👉 {{link_pix}}'
      },
      {
        name: 'Planejamento Estratégico & Briefing de Criativos',
        description: 'Definição de públicos-alvo, personas, funil de vendas, metas de CPA/ROAS e roteiros de criativos.',
        detail: 'Estratégia de funil aprovada',
        action_type: 'approval_request',
        whatsapp_template: '📋 Olá, {{cliente}}! O planejamento de público e o briefing dos criativos do projeto *{{projeto}}* estão prontos para validação.\n\nAcesse e aprove com 1 clique:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Criação e Validação dos Anúncios / Copys',
        description: 'Produção das artes, carrosséis, vídeos em alta conversão e redação persuasiva (copywriting).',
        detail: 'Criativos em validação',
        action_type: 'approval_request',
        whatsapp_template: '🎨 {{cliente}}, os anúncios e copys de alta conversão do *{{projeto}}* estão prontos no portal!\n\nConfira as peças e valide para subida:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Subida de Campanhas & Teste de Tracking',
        description: 'Configuração das campanhas na Meta/Google Ads, teste de eventos de conversão e CAPI ativa.',
        detail: 'Campanhas em fase de aprendizado',
        action_type: 'notification_only',
        whatsapp_template: '⚡ Campanhas no ar, {{cliente}}! O projeto *{{projeto}}* está ativo nas plataformas e o tracking de métricas e conversões já está disparando perfeitamente.\n\nAcompanhe no portal:\n👉 {{link_portal}}'
      },
      {
        name: 'Otimização Contínua & Fechamento de Ciclo / Relatório Quinzenal',
        description: 'Otimização de lances, corte de criativos saturados, escala horizontal e envio do dashboard de ROAS.',
        detail: 'Dashboard de ROAS consolidado',
        action_type: 'billing_payment',
        whatsapp_template: '📊 Relatório quinzenal disponível, {{cliente}}! Seu ciclo de tráfego do *{{projeto}}* teve métricas consolidadas.\n\nAcesse seu relatório de ROAS e a fatura do novo ciclo no link seguro:\n👉 {{link_pix}}'
      }
    ]
  },
  {
    id: 'ai_agency',
    name: 'Agência / Consultoria de Automação & IA',
    badge: 'Automação & Agentes IA',
    description: 'Fluxo para agentes inteligentes, automações com Make/n8n, integração de webhooks e treinamento.',
    defaultStages: [
      {
        name: 'Mapeamento de Processos e Levantamento de Requisitos',
        description: 'Diagnóstico da arquitetura atual, mapeamento de gargalos manuais e definição de fluxos de automação.',
        detail: 'Arquitetura de dados aprovada',
        action_type: 'billing_payment',
        whatsapp_template: '🤖 Olá, {{cliente}}! Seja bem-vindo(a) à {{empresa}}. A implementação da sua solução de IA e automação *{{projeto}}* foi oficialmente iniciada!\n\nAcompanhe os fluxos e realize a entrada Pix no link seguro:\n👉 {{link_pix}}'
      },
      {
        name: 'Integração de APIs / Webhooks / Make / n8n',
        description: 'Conexão dos endpoints, webhooks de CRM, WhatsApp API oficial, banco de dados e gateways.',
        detail: 'Pipelines e webhooks conectados',
        action_type: 'notification_only',
        whatsapp_template: '🔌 {{cliente}}, os webhooks e integrações de API do projeto *{{projeto}}* foram estruturados e conectados com sucesso.\n\nVeja o status dos nós no portal:\n👉 {{link_portal}}'
      },
      {
        name: 'Configuração de Prompts / Base de Conhecimento / Agentes',
        description: 'Engenharia de prompts, embeddings na base de conhecimento, regras de negócio e tom de voz do agente.',
        detail: 'Base de conhecimento calibrada',
        action_type: 'approval_request',
        whatsapp_template: '🧠 {{cliente}}, os prompts e a base de conhecimento do agente IA do projeto *{{projeto}}* foram configurados!\n\nValide as respostas e o tom no link seguro:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Ambiente de Homologação / Testes Internos',
        description: 'Simulação de estresse, bateria de testes com cenários edge-case e validação de tempo de resposta.',
        detail: 'Testes de stress concluídos',
        action_type: 'approval_request',
        whatsapp_template: '🧪 {{cliente}}, sua solução de IA *{{projeto}}* está no ambiente de homologação para testes reais com sua equipe!\n\nAcesse o ambiente de sandbox e aprove o go-live:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Treinamento do Cliente & Go-Live (Produção)',
        description: 'Deploy definitivo em produção, treinamento prático da equipe interna e entrega da documentação técnica.',
        detail: 'Solução 100% operacional em produção',
        action_type: 'billing_payment',
        whatsapp_template: '🚀 Parabéns, {{cliente}}! O projeto de automação *{{projeto}}* está no ar em produção gerando eficiência real.\n\nTermo de entrega técnica, gravação do treinamento e quitação no link:\n👉 {{link_pix}}'
      }
    ]
  },
  {
    id: 'marketing_agency',
    name: 'Agência de Marketing / Publicidade',
    badge: 'Marketing Full-Service & Criativos',
    description: 'Fluxo para branding, copywriting, produção de criativos estáticos/vídeos e campanhas integradas.',
    defaultStages: [
      {
        name: 'Alinhamento de Branding & Tom de Voz',
        description: 'Imersão de marca, definição de arquétipo, manual de identidade visual e proposta de valor.',
        detail: 'Identidade e tom alinhados',
        action_type: 'billing_payment',
        whatsapp_template: '✨ Olá, {{cliente}}! Seja bem-vindo(a) à {{empresa}}. O projeto estratégico de marketing *{{projeto}}* foi iniciado!\n\nAcesse seu roadmap e realize a entrada no link seguro:\n👉 {{link_pix}}'
      },
      {
        name: 'Roteirização e Produção de Conteúdo',
        description: 'Pesquisa de tendências, roteiros de Reels/TikTok, copy persuasiva e calendário editorial.',
        detail: 'Calendário de conteúdo pronto',
        action_type: 'approval_request',
        whatsapp_template: '✍️ {{cliente}}, o calendário editorial e roteiros do *{{projeto}}* estão prontos para sua validação!\n\nAprove com 1 clique no portal:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Aprovação de Peças e Design',
        description: 'Diagramação de carrosséis, key visuals, banners promocionais e vídeos editados.',
        detail: 'Design e criativos finalizados',
        action_type: 'approval_request',
        whatsapp_template: '🎨 {{cliente}}, as artes e criativos finais do projeto *{{projeto}}* estão disponíveis para revisão.\n\nConfira as peças no portal:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Programação e Disparos',
        description: 'Agendamento em plataformas, automação de publicações e integração com canais de aquisição.',
        detail: 'Conteúdos agendados',
        action_type: 'notification_only',
        whatsapp_template: '📢 Tudo programado, {{cliente}}! As publicações e campanhas do projeto *{{projeto}}* foram agendadas e já começaram a rodar.\n\nAcompanhe no link:\n👉 {{link_portal}}'
      },
      {
        name: 'Relatório de Performance & ROAS',
        description: 'Consolidação de métricas de alcance, engajamento, leads capturados e faturamento gerado.',
        detail: 'Relatório de impacto entregue',
        action_type: 'billing_payment',
        whatsapp_template: '🏆 Ciclo concluído com sucesso, {{cliente}}! O relatório de métricas e conversões do *{{projeto}}* está pronto.\n\nAcesse o dashboard de resultados e a quitação no link seguro:\n👉 {{link_pix}}'
      }
    ]
  }
];

export function getTemplateById(id: string): NicheTemplate {
  if (!id) return NICHE_TEMPLATES[0];
  const clean = id.toLowerCase().trim();

  // Direct match
  const direct = NICHE_TEMPLATES.find(t => t.id === clean);
  if (direct) return direct;

  // Gestor de Tráfego / Media Buyer
  if (
    clean.includes('trafeg') || 
    clean.includes('traffic') || 
    clean.includes('media_buyer') || 
    clean.includes('media') || 
    clean.includes('buyer') || 
    clean.includes('ads') || 
    clean.includes('performance')
  ) {
    return NICHE_TEMPLATES[0];
  }

  // Agência de IA / Automação
  if (
    clean.includes('ai') || 
    clean.includes('ia') || 
    clean.includes('auto') || 
    clean.includes('n8n') || 
    clean.includes('make') || 
    clean.includes('agent') || 
    clean.includes('bot') || 
    clean.includes('soft') || 
    clean.includes('tech')
  ) {
    return NICHE_TEMPLATES[1];
  }

  // Agência de Marketing Digital / Full-Service
  if (
    clean.includes('agenc') || 
    clean.includes('market') || 
    clean.includes('design') || 
    clean.includes('brand') || 
    clean.includes('criativ') || 
    clean.includes('content')
  ) {
    return NICHE_TEMPLATES[2];
  }

  // Fallback padrão: Gestor de Tráfego / Media Buyer
  return NICHE_TEMPLATES[0];
}

export function generateStagesFromTemplate(templateId: string, deliveryDate?: string): ProjectStage[] {
  const template = getTemplateById(templateId);
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  return template.defaultStages.map((stage, idx) => {
    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
    let date: string | undefined = undefined;

    if (idx === 0) {
      status = 'completed';
      date = dateStr;
    } else if (idx === 1) {
      status = 'current';
      date = 'Em andamento';
    } else if (idx === template.defaultStages.length - 1 && deliveryDate) {
      date = deliveryDate;
    }

    return {
      id: `stg-${idx + 1}-${Date.now().toString().slice(-4)}`,
      name: stage.name,
      description: stage.description,
      status,
      date,
      detail: stage.detail,
      whatsapp_template: stage.whatsapp_template,
      ai_context_instruction: stage.ai_context_instruction,
      action_type: stage.action_type
    };
  });
}
