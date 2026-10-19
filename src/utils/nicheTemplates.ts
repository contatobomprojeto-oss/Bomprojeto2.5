import { ProjectStage } from '../types';

export interface NicheTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  defaultStages: Array<{
    name: string;
    description: string;
    detail?: string;
    action_type?: string;
    whatsapp_template?: string;
    ai_context_instruction?: string;
  }>;
}

export const NICHE_TEMPLATES: NicheTemplate[] = [
  {
    id: 'marcenaria',
    name: 'Marcenaria & Móveis Planejados',
    badge: 'Móveis & Atelier',
    description: 'Fluxo ideal para produção em oficina, corte CNC, fita de borda e montagem fina.',
    defaultStages: [
      {
        name: 'Briefing 3D & Contrato',
        description: 'Aprovação das especificações técnicas, padrões de MDF e ferragens.',
        detail: 'Projeto executivo validado',
        action_type: 'billing_payment',
        whatsapp_template: '👋 Olá, {{cliente}}! Seja bem-vindo(a) à {{empresa}}. Seu projeto *{{projeto}}* foi iniciado com sucesso! 🎉\n\n📄 Acesse o contrato e a entrada via Pix no link seguro:\n👉 {{link_pix}}'
      },
      {
        name: 'Medição Técnica no Local',
        description: 'Conferência a laser de prumos, desníveis e pontos de elétrica/hidráulica.',
        detail: 'Validação milimétrica do vão',
        action_type: 'approval_request',
        whatsapp_template: '📐 Olá, {{cliente}}! Agendamos a medição milimétrica no local do seu projeto *{{projeto}}*.\n\nConfirme a data e horário no link:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Oficina & Usinagem CNC',
        description: 'Corte de chapas, furação digital de dobradiças e aplicação de borda térmica.',
        detail: 'Produção ativa em maquinário',
        action_type: 'notification_only',
        whatsapp_template: '🪵 Direto da fábrica, {{cliente}}! Seu projeto *{{projeto}}* está em fase de usinagem e estruturação.\n\n📸 Fotos em tempo real no portal:\n👉 {{link_portal}}'
      },
      {
        name: 'Pré-montagem & Calibração',
        description: 'Montagem prévia em bancada para ajuste milimétrico de gavetas e portas.',
        detail: 'Controle de qualidade e embalagem',
        action_type: 'notification_only',
        whatsapp_template: '✨ {{cliente}}, os módulos do seu projeto *{{projeto}}* estão pré-montados e calibrados!\n\nConfira os bastidores:\n👉 {{link_portal}}'
      },
      {
        name: 'Instalação & Entrega Final',
        description: 'Fixação no local, limpeza técnica e termo de garantia de 5 anos.',
        detail: 'Entrega das chaves e vistoria',
        action_type: 'billing_payment',
        whatsapp_template: '🏆 Tudo pronto, {{cliente}}! O seu projeto *{{projeto}}* foi concluído com sucesso.\n\n📄 Seu Termo de Garantia e quitação estão no link:\n👉 {{link_pix}}'
      }
    ]
  },
  {
    id: 'serralheria',
    name: 'Serralheria & Estruturas Metálicas',
    badge: 'Aço & Esquadrias',
    description: 'Fluxo para dimensionamento de perfis de aço, solda MIG, pintura eletrostática e chumbamento.',
    defaultStages: [
      {
        name: 'Projeto Executivo & Gabaritos',
        description: 'Dimensionamento de perfis de aço, cálculo de cargas e liberação do aço.',
        detail: 'Especificação técnica aprovada',
        action_type: 'billing_payment',
        whatsapp_template: '⚙️ Olá, {{cliente}}! Ordem de serviço do projeto *{{projeto}}* aprovada na {{empresa}}.\n\nSeguimos para corte do aço. Acesse os detalhes e entrada:\n👉 {{link_pix}}'
      },
      {
        name: 'Corte, Dobra & Soldagem MIG',
        description: 'Fabricação estrutural e união das peças metálicas com conferência de esquadro.',
        detail: 'Solda técnica e alinhamento',
        action_type: 'notification_only',
        whatsapp_template: '🔥 Fala, {{cliente}}! A estrutura do seu projeto *{{projeto}}* está na fase de solda MIG técnica e esquadro.\n\nVeja as fotos da produção:\n👉 {{link_portal}}'
      },
      {
        name: 'Pintura Eletrostática & Cura',
        description: 'Aplicação de fundo fosfatizante anticorrosivo e cura em forno epóxi.',
        detail: 'Tratamento térmico anticorrosivo',
        action_type: 'notification_only',
        whatsapp_template: '🎨 {{cliente}}, sua estrutura recebeu a pintura eletrostática a pó e está em processo de cura térmica.\n\nAcompanhe o status:\n👉 {{link_portal}}'
      },
      {
        name: 'Chumbamento & Fixação na Obra',
        description: 'Instalação no local com parabolts, nivelamento a laser e ancoragem.',
        detail: 'Fixação estrutural pesada',
        action_type: 'billing_payment',
        whatsapp_template: '🔩 Olá, {{cliente}}! Equipe na obra iniciando a fixação técnica da estrutura *{{projeto}}*.\n\nSegue o link da parcela de instalação com Pix:\n👉 {{link_pix}}'
      },
      {
        name: 'Entrega Técnica & Laudo de Garantia',
        description: 'Revisão final, regulagem de trincos/fechaduras e certificado de conformidade.',
        detail: 'Estrutura testada e garantida',
        action_type: 'billing_payment',
        whatsapp_template: '🏁 Serviço concluído com sucesso, {{cliente}}! Seu projeto *{{projeto}}* está pronto e garantido.\n\nTermo de entrega e quitação disponíveis em:\n👉 {{link_pix}}'
      }
    ]
  },
  {
    id: 'vidracaria',
    name: 'Vidraçaria, Box & Esquadrias',
    badge: 'Vidros & Perfis',
    description: 'Fluxo para corte técnico, têmpera, usinagem de perfis fineline e instalação.',
    defaultStages: [
      {
        name: 'Medição a Laser & Folgas de Dilatação',
        description: 'Conferência de vãos e cálculo de folgas de vedação perimetral.',
        detail: 'Gabarito executivo gerado',
        action_type: 'billing_payment',
        whatsapp_template: '🪟 Olá, {{cliente}}! Medição de vãos confirmada para o projeto *{{projeto}}*.\n\nLiberamos o pedido das chapas temperadas. Link de acompanhamento:\n👉 {{link_pix}}'
      },
      {
        name: 'Caderno Técnico & Projeto 3D',
        description: 'Detalhamento de ancoragens químicas, pivôs e roldanas de alta carga.',
        detail: 'Aprovação com cliente/arquiteto',
        action_type: 'approval_request',
        whatsapp_template: '📐 {{cliente}}, confira o caderno técnico de vidros e perfis do seu projeto *{{projeto}}*.\n\nAprove com 1 clique:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Fabricação de Perfis & Forno de Têmpera',
        description: 'Corte de perfis em esquadria e têmpera/laminação dos vidros.',
        detail: 'Produção nos fornos e usinagem',
        action_type: 'notification_only',
        whatsapp_template: '🔥 {{cliente}}, os vidros do seu projeto *{{projeto}}* entraram no forno de têmpera e laminação.\n\nAcompanhe no portal:\n👉 {{link_portal}}'
      },
      {
        name: 'Pré-montagem & Teste de Vedação',
        description: 'Checagem de estanqueidade, amortecedores e calafetação.',
        detail: 'Controle de tolerância',
        action_type: 'notification_only',
        whatsapp_template: '🧪 Testes de vedação e roldanas executados com sucesso no seu projeto *{{projeto}}*.\n\nVeja as fotos da bancada:\n👉 {{link_portal}}'
      },
      {
        name: 'Içamento & Instalação no Local',
        description: 'Fixação estrutural, alinhamento dos vidros e entrega técnica.',
        detail: 'Vistoria e termo de garantia',
        action_type: 'billing_payment',
        whatsapp_template: '🏆 Instalação finalizada com alinhamento perfeito, {{cliente}}! Projeto *{{projeto}}* entregue.\n\nTermo de garantia e quitação:\n👉 {{link_pix}}'
      }
    ]
  },
  {
    id: 'arquitetura',
    name: 'Arquitetura & Interiores',
    badge: 'Projetos 3D & RDO',
    description: 'Fluxo focado em etapas de projeto, aprovações 3D, memoriais e acompanhamento de obra.',
    defaultStages: [
      {
        name: 'Briefing & Levantamento Cadastral',
        description: 'Reunião de alinhamento com cliente e levantamento fotográfico in loco.',
        detail: 'Diagnóstico de necessidades',
        action_type: 'billing_payment',
        whatsapp_template: '📐 Olá, {{cliente}}! Sejam muito bem-vindos ao Studio. Seu projeto *{{projeto}}* foi oficialmente iniciado!\n\nAcompanhe todas as etapas e fotos no link:\n👉 {{link_pix}}'
      },
      {
        name: 'Estudo Preliminar & Moodboard 3D',
        description: 'Definição de fluxos, layout espacial e conceitos de iluminação.',
        detail: 'Apresentação de volumetria 3D',
        action_type: 'approval_request',
        whatsapp_template: '✨ {{cliente}}, o estudo preliminar 3D do seu projeto *{{projeto}}* ficou pronto!\n\nVeja o tour virtual e aprove aqui:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Anteprojeto & Aprovação de Materiais',
        description: 'Refinamento do modelo tridimensional e escolha de revestimentos.',
        detail: 'Validação pelo cliente',
        action_type: 'approval_request',
        whatsapp_template: '🎨 {{cliente}}, definimos a paleta de materiais do seu projeto *{{projeto}}*.\n\nConfirme suas preferências no portal:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Projeto Executivo & Detalhamento',
        description: 'Plantas baixas, cortes, pontos elétricos/hidráulicos e memorial descritivo.',
        detail: 'Caderno técnico completo',
        action_type: 'notification_only',
        whatsapp_template: '📑 Caderno executivo e plantas técnicas prontas para a obra, {{cliente}}!\n\nAcesse o memorial completo:\n👉 {{link_portal}}'
      },
      {
        name: 'Acompanhamento & Entrega Técnica',
        description: 'Compatibilização de fornecedores, visitas e checklist de conformidade.',
        detail: 'Validação final do projeto',
        action_type: 'billing_payment',
        whatsapp_template: '🎉 Projeto executivo *{{projeto}}* formalmente entregue com todo o caderno técnico!\n\nQuitação e termo no link:\n👉 {{link_pix}}'
      }
    ]
  },
  {
    id: 'reformas',
    name: 'Reformas & Construção Civil',
    badge: 'Obras & Empreiteira',
    description: 'Fluxo focado em etapas civis, demolição, instalações, revestimentos e acabamento.',
    defaultStages: [
      {
        name: 'Planejamento, Proteção & Demolição',
        description: 'Isolamento de áreas comuns, descarte responsável e remoção de revestimentos.',
        detail: 'Área preparada com segurança',
        action_type: 'billing_payment',
        whatsapp_template: '🏗️ Olá, {{cliente}}! Obra do projeto *{{projeto}}* iniciada com proteção perimetral e demolição limpa.\n\nEntrada e acompanhamento no link:\n👉 {{link_pix}}'
      },
      {
        name: 'Infraestrutura Hidráulica & Elétrica',
        description: 'Novas tubulações tigre, conduítes e quadros de disjuntores balanceados.',
        detail: 'Teste de pressão e estanqueidade',
        action_type: 'notification_only',
        whatsapp_template: '⚡ {{cliente}}, tubulações hidráulicas e fiação do projeto *{{projeto}}* concluídas e testadas a laser!\n\nVeja as fotos da obra:\n👉 {{link_portal}}'
      },
      {
        name: 'Alvenaria, Gesso & Regularização',
        description: 'Chapisco, reboco nivelado, forros de drywall e cortineiros iluminados.',
        detail: 'Superfícies aprumadas',
        action_type: 'notification_only',
        whatsapp_template: '🧱 Paredes aprumadas e forro de gesso finalizados no seu projeto *{{projeto}}*.\n\nAcompanhe no link:\n👉 {{link_portal}}'
      },
      {
        name: 'Assentamento de Pisos & Revestimentos',
        description: 'Instalação de porcelanatos com niveladores e rejunte de precisão.',
        detail: 'Alinhamento e esquadro conferidos',
        action_type: 'billing_payment',
        whatsapp_template: '📐 {{cliente}}, porcelanatos assentados e rejuntados no seu projeto *{{projeto}}*!\n\nLiberada a 2ª parcela via Pix:\n👉 {{link_pix}}'
      },
      {
        name: 'Pintura, Louças, Metais & Vistoria Final',
        description: 'Massa corrida, pintura acrílica fosca, instalação de metais e checklist.',
        detail: 'Limpeza fina e entrega das chaves',
        action_type: 'billing_payment',
        whatsapp_template: '🔑 Obra concluída, {{cliente}}! Limpeza fina realizada e chaves prontas para entrega do *{{projeto}}*.\n\nTermo de entrega e quitação:\n👉 {{link_pix}}'
      }
    ]
  },
  {
    id: 'agencia',
    name: 'Agência, Marketing & Design',
    badge: 'Criativo & Digital',
    description: 'Fluxo para branding, campanhas publicitárias, identidade visual e websites.',
    defaultStages: [
      {
        name: 'Briefing Criativo & Diagnóstico',
        description: 'Alinhamento de objetivos comerciais, personas e cronograma de entregáveis.',
        detail: 'Escopo estratégico alinhado',
        action_type: 'billing_payment',
        whatsapp_template: '🚀 Olá, {{cliente}}! Projeto criativo *{{projeto}}* iniciado na {{empresa}}!\n\nAcompanhe os conceitos e a entrada no link:\n👉 {{link_pix}}'
      },
      {
        name: 'Direção de Arte & Conceito Visual',
        description: 'Criação de propostas conceituais, tipografia, paleta e mockups.',
        detail: 'Apresentação conceitual',
        action_type: 'approval_request',
        whatsapp_template: '🎨 {{cliente}}, a apresentação conceitual do projeto *{{projeto}}* está pronta para sua análise!\n\nAcesse e valide no portal:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Produção & Desdobramentos',
        description: 'Execução de todas as peças, redação publicitária e fechamento de arquivos.',
        detail: 'Peças em produção ativa',
        action_type: 'notification_only',
        whatsapp_template: '✍️ {{cliente}}, estamos finalizando os desdobramentos e arquivos finais do projeto *{{projeto}}*.\n\nAcompanhe as prévias:\n👉 {{link_portal}}'
      },
      {
        name: 'Entrega dos Arquivos Finais & Ativação',
        description: 'Envio dos pacotes vetoriais, manual da marca e ativação de campanhas.',
        detail: 'Arquivos em nuvem entregues',
        action_type: 'billing_payment',
        whatsapp_template: '🏆 Projeto *{{projeto}}* concluído com sucesso! Todos os arquivos finais estão disponíveis.\n\nQuitação final e certificado:\n👉 {{link_pix}}'
      }
    ]
  },
  {
    id: 'software',
    name: 'Software, Apps & Tecnologia',
    badge: 'Tech & Implantação',
    description: 'Fluxo para desenvolvimento ágil, prototipagem, sprints e implantação em produção.',
    defaultStages: [
      {
        name: 'Requisitos Técnicos & Arquitetura',
        description: 'Levantamento de regras de negócio, modelagem de banco e escopo da sprint.',
        detail: 'Arquitetura técnica definida',
        action_type: 'billing_payment',
        whatsapp_template: '💻 Olá, {{cliente}}! O desenvolvimento do projeto tech *{{projeto}}* foi iniciado!\n\nCronograma das sprints e entrada no link:\n👉 {{link_pix}}'
      },
      {
        name: 'Protótipo UI/UX & Fluxo do Usuário',
        description: 'Telas navegáveis de alta fidelidade e validação de usabilidade.',
        detail: 'Protótipo interativo validado',
        action_type: 'approval_request',
        whatsapp_template: '📱 {{cliente}}, o protótipo navegável do *{{projeto}}* está pronto para sua aprovação!\n\nTeste o fluxo e valide:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Desenvolvimento das Sprints & Integrações',
        description: 'Codificação de frontend, backend, APIs e regras de validação.',
        detail: 'Ambiente de staging atualizado',
        action_type: 'notification_only',
        whatsapp_template: '⚙️ {{cliente}}, nova versão do *{{projeto}}* compilada com sucesso no ambiente de testes!\n\nAcompanhe o changelog:\n👉 {{link_portal}}'
      },
      {
        name: 'Homologação, Testes QA & Deploy',
        description: 'Bateria de testes, deploy em produção e entrega de credenciais.',
        detail: 'Sistema publicado em produção',
        action_type: 'billing_payment',
        whatsapp_template: '🚀 Projeto *{{projeto}}* publicado em produção e 100% operacional!\n\nTermo de aceite técnico e quitação:\n👉 {{link_pix}}'
      }
    ]
  },
  {
    id: 'contabilidade',
    name: 'Contabilidade & BPO Especializado',
    badge: 'Fiscal & Financeiro',
    description: 'Fluxo para legalização, rotinas fiscais, conciliação e entrega de obrigações.',
    defaultStages: [
      {
        name: 'Coleta de Documentos & Diagnóstico',
        description: 'Conferência de certificados digitais, extratos e contratos sociais.',
        detail: 'Documentação validada',
        action_type: 'billing_payment',
        whatsapp_template: '📊 Olá, {{cliente}}! Processo contábil do projeto *{{projeto}}* iniciado na {{empresa}}.\n\nAcompanhamento seguro sem senha no link:\n👉 {{link_pix}}'
      },
      {
        name: 'Processamento & Conciliação',
        description: 'Lançamentos contábeis, conferência bancária e classificação fiscal.',
        detail: 'Processamento em andamento',
        action_type: 'notification_only',
        whatsapp_template: '📑 {{cliente}}, estamos finalizando a conciliação e apuração do projeto *{{projeto}}*.\n\nVeja o status em tempo real:\n👉 {{link_portal}}'
      },
      {
        name: 'Apuração Tributária & Protocolos',
        description: 'Cálculo de guias, declarações e transmissão de obrigações acessórias.',
        detail: 'Guias geradas com protocolo',
        action_type: 'approval_request',
        whatsapp_template: '🏛️ Guias e relatórios do projeto *{{projeto}}* calculados e prontos para conferência!\n\nAcesse no link seguro:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Fechamento & Entrega de Relatórios',
        description: 'Disponibilização de balancetes, DRE e termo de conformidade fiscal.',
        detail: 'Fechamento contábil concluído',
        action_type: 'billing_payment',
        whatsapp_template: '✅ Rotina do projeto *{{projeto}}* concluída com conformidade fiscal assegurada!\n\nRelatórios e quitação:\n👉 {{link_pix}}'
      }
    ]
  },
  {
    id: 'geral',
    name: 'Projeto Personalizado / Serviços Técnicos',
    badge: 'Flexível & Universal',
    description: 'Fluxo genérico e adaptável a qualquer nicho de serviços técnicos e industriais.',
    defaultStages: [
      {
        name: 'Briefing & Levantamento Inicial',
        description: 'Definição de escopo, requisitos e alinhamento de expectativas.',
        detail: 'Escopo formalizado',
        action_type: 'billing_payment',
        whatsapp_template: '👋 Olá, {{cliente}}! Seja bem-vindo(a) à {{empresa}}. Seu projeto *{{projeto}}* foi iniciado com sucesso!\n\nAcompanhe no link sem senha e realize a entrada:\n👉 {{link_pix}}'
      },
      {
        name: 'Desenvolvimento & Engenharia do Projeto',
        description: 'Elaboração técnica, cálculos, especificações e aprovação com cliente.',
        detail: 'Projeto técnico aprovado',
        action_type: 'approval_request',
        whatsapp_template: '📐 {{cliente}}, o detalhamento do projeto *{{projeto}}* está pronto para sua aprovação:\n👉 {{link_aprovacao}}'
      },
      {
        name: 'Produção / Execução em Andamento',
        description: 'Fabricação das peças ou execução prática do escopo contratado.',
        detail: 'Produção em andamento',
        action_type: 'notification_only',
        whatsapp_template: '🛠️ Direto da produção, {{cliente}}! Seu projeto *{{projeto}}* está em execução.\n\nConfira as atualizações:\n👉 {{link_portal}}'
      },
      {
        name: 'Controle de Qualidade & Revisão',
        description: 'Vistoria minuciosa, calibração e checagem de conformidade técnica.',
        detail: 'Ajustes finos finalizados',
        action_type: 'notification_only',
        whatsapp_template: '🔍 Calibração e controle de qualidade finalizados no projeto *{{projeto}}*.\n\nVeja as fotos no portal:\n👉 {{link_portal}}'
      },
      {
        name: 'Instalação, Entrega & Conclusão',
        description: 'Entrega no local, instrução de uso e termo formal de conclusão.',
        detail: 'Projeto 100% entregue',
        action_type: 'billing_payment',
        whatsapp_template: '🏆 Conclusão formal, {{cliente}}! Projeto *{{projeto}}* finalizado com sucesso.\n\nTermo de garantia e quitação:\n👉 {{link_pix}}'
      }
    ]
  }
];

export function getTemplateById(id: string): NicheTemplate {
  return NICHE_TEMPLATES.find(t => t.id === id) || NICHE_TEMPLATES[0];
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
      detail: stage.detail
    };
  });
}
