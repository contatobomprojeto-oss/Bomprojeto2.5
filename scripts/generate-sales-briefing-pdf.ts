import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

async function generateDossierPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;
  let currentPage = 1;

  // Helpers
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      drawFooter();
      doc.addPage();
      currentPage++;
      y = margin + 5;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('BOMPROJETO — DOSSIÊ COMERCIAL & BRIEFING DE PRODUTO', margin, 12);
    doc.text('USO INTERNO / TREINAMENTO DE VENDAS', pageWidth - margin, 12, { align: 'right' });
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, 14, pageWidth - margin, 14);
  };

  const drawFooter = () => {
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('BomProjeto SaaS • bomprojeto.com • Confidencial Comercial', margin, pageHeight - 8);
    doc.text(`Página ${currentPage}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  const printHeading1 = (title: string) => {
    checkPageBreak(25);
    y += 4;
    doc.setFillColor(15, 23, 42); // #0F172A
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), margin + 4, y + 6.8);
    y += 15;
  };

  const printHeading2 = (title: string) => {
    checkPageBreak(16);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(249, 115, 22); // #F97316 Brand Orange
    doc.text(title, margin, y);
    y += 1.5;
    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 40, y);
    y += 5;
  };

  const printHeading3 = (title: string) => {
    checkPageBreak(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 5;
  };

  const printParagraph = (text: string, spaceAfter = 4) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // Slate 700
    const lines = doc.splitTextToSize(text, contentWidth);
    const blockHeight = lines.length * 4.2;
    checkPageBreak(blockHeight);
    doc.text(lines, margin, y);
    y += blockHeight + spaceAfter;
  };

  const printBullet = (label: string, text: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const bulletPrefix = '• ';
    const prefixWidth = doc.getTextWidth(bulletPrefix);
    const labelWidth = doc.getTextWidth(label + ': ');

    checkPageBreak(8);
    doc.text(bulletPrefix, margin, y);
    doc.text(label + ': ', margin + prefixWidth, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const remainIndent = margin + prefixWidth + labelWidth;
    const remainWidth = contentWidth - (prefixWidth + labelWidth);

    const lines = doc.splitTextToSize(text, contentWidth - 6);
    if (remainWidth > 30 && lines.length === 1) {
      doc.text(text, remainIndent, y);
      y += 4.5;
    } else {
      y += 4;
      const fullLines = doc.splitTextToSize(text, contentWidth - 6);
      checkPageBreak(fullLines.length * 4.2);
      doc.text(fullLines, margin + 6, y);
      y += (fullLines.length * 4.2) + 2;
    }
  };

  const printCallout = (title: string, text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(text, contentWidth - 10);
    const boxHeight = (lines.length * 4.2) + 12;
    checkPageBreak(boxHeight + 4);

    doc.setFillColor(254, 243, 199); // Amber 100
    doc.setDrawColor(245, 158, 11); // Amber 500
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9); // Amber 700
    doc.text(title, margin + 5, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(69, 26, 3);
    doc.text(lines, margin + 5, y + 10.5);

    y += boxHeight + 5;
  };

  // =========================================================================
  // CAPA / COVER PAGE
  // =========================================================================
  // Background Header Banner
  doc.setFillColor(15, 23, 42); // Dark Slate #0F172A
  doc.rect(0, 0, pageWidth, 90, 'F');

  // Orange brand accent line
  doc.setFillColor(249, 115, 22); // Orange #F97316
  doc.rect(0, 88, pageWidth, 4, 'F');

  // Cover Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('Bom', margin, 40);
  doc.setFont('helvetica', 'normal');
  doc.text('Projeto', margin + 30, 40);
  doc.setFillColor(249, 115, 22);
  doc.circle(margin + 68, 38.5, 2.5, 'F');

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Plataforma SaaS de Gestão de Ordens de Serviço, Notificações WhatsApp & Cobrança Pix', margin, 52);

  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('Nós atendemos, respondemos e cobramos o seu cliente. Você só executa e recebe.', margin, 62);

  // Cover Document Title
  y = 110;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('DOSSIÊ TÉCNICO & BRIEFING COMERCIAL', margin, y);
  y += 7;
  doc.setFontSize(13);
  doc.setTextColor(249, 115, 22);
  doc.text('Manual Completo de Capacitação e Playbook de Vendas', margin, y);

  y += 16;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 75, 3, 3, 'FD');

  let cy = y + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('INFORMAÇÕES DESTA EDIÇÃO:', margin + 6, cy);
  cy += 7;

  const coverMeta = [
    ['Produto', 'BomProjeto SaaS — Sistema de Acompanhamento Visual & Cobrança'],
    ['Público Alvo', 'Marcenarias, Vidraçarias, Marmorarias, Serralherias e Empresas Sob Medida'],
    ['Versão do Documento', '3.5 — Edição de Treinamento Comercial & Expansão'],
    ['Finalidade', 'Capacitação imediata de consultores comerciais e vendedores externos/internos'],
    ['Autor / Empresa', 'BomProjeto Tecnologia Ltda. • Fundador: Henrique Ferraz'],
    ['Modelos de Contratação', 'Plano Start (R$ 197,93/mês) • Plano Scala (R$ 397,97/mês) • Piloto Grátis'],
    ['Canais Integrados', 'WhatsApp Business Oficial (QR Code), Banco Central Pix, Gemini AI']
  ];

  coverMeta.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${lbl}:`, margin + 6, cy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(val, margin + 48, cy);
    cy += 7.5;
  });

  y = 220;
  printCallout(
    'MENSAGEM AO CONSULTOR DE VENDAS',
    'Este documento foi estruturado para que você domine profundamente o produto, entenda a dor real da cabeça do dono de fábrica/oficina e consiga fechar contratos na primeira conversa. O BomProjeto não é "mais um gerenciador de tarefas": ele resolve a ansiedade do cliente, automatiza o recebimento do dinheiro via Pix e devolve a paz ao empresário.'
  );

  drawFooter();

  // =========================================================================
  // PÁGINA 2: O QUE É O BOMPROJETO & PROPOSTA ÚNICA DE VALOR
  // =========================================================================
  doc.addPage();
  currentPage++;
  drawHeader();
  y = margin + 5;

  printHeading1('1. O Que É o BomProjeto (Visão Geral & Posicionamento)');
  printParagraph(
    'O BomProjeto é um software como serviço (SaaS B2B verticalizado) desenvolvido sob medida para empresas que vendem produtos e serviços sob encomenda — com foco primário em marcenarias, vidraçarias, marmorarias, serralherias, construtoras de reformas, estofarias e ateliês artesanais.'
  );
  printParagraph(
    'Enquanto ERPs tradicionais (como ContaAzul, Bling ou Promob) focam na emissão fiscal, corte de chapa ou contabilidade complexa, o BomProjeto foca no elo mais frágil e estressante de todo o negócio: A RELAÇÃO DIÁRIA COM O CLIENTE FINAL DURANTE A PRODUÇÃO E A COBRANÇA DAS PARCELAS.'
  );

  printHeading2('A Proposta Única de Valor (A Promessa que Vende)');
  printParagraph(
    '"Nós atendemos, respondemos e cobramos o seu cliente no WhatsApp. Você só executa e recebe."'
  );
  printParagraph(
    'O empresário sob medida passa mais de 40% do seu dia interrompendo a produção para responder mensagens como "Cadê meu móvel?", "Já está pronto?", "Tem foto da bancada?", "Quando vocês vêm instalar?". Além disso, sofre calotes ou atrasos porque tem vergonha de cobrar a parcela combinada.'
  );
  printParagraph(
    'O BomProjeto assume essa linha de frente com elegância, inteligência artificial e processos automatizados no canal onde todo brasileiro está: o WhatsApp.'
  );

  printHeading2('Os 4 Pilares da Solução BomProjeto');
  printBullet(
    'Pilar 1: Portal do Cliente sem Senha',
    'O cliente recebe um link exclusivo, criptografado e elegante (estilo Apple/Fleetly). Não precisa baixar aplicativo nem lembrar login. Abre no navegador do celular com 1 clique e exibe status, fotos da bancada, data de entrega e chave Pix.'
  );
  printBullet(
    'Pilar 2: Linha do Tempo Visual & Fotos da Bancada',
    'O marceneiro ou líder de equipe tira uma foto da peça sendo cortada ou montada e envia no sistema. O cliente visualiza a evolução em tempo real, gerando encantamento imediato e eliminando a insegurança.'
  );
  printBullet(
    'Pilar 3: Cobrança Programada com Pix Copia e Cola',
    'O sistema programa os lembretes (D-3, D-0 do vencimento, D+3). Na hora exata, envia a mensagem cordial com o QR Code oficial e o botão de Pix Copia e Cola. O cliente clica, cola no app do banco e paga sem atrito.'
  );
  printBullet(
    'Pilar 4: IA de Retenção Pro & Atendimento Humanizado',
    'Uma inteligência preditiva que analisa o tom de voz dos áudios do cliente, cruza prazos de entrega e parcelas pendentes para calcular o risco de atrito (churn) e já sugere respostas prontas para o dono.'
  );

  // =========================================================================
  // PÁGINA 3: O GRANDE PROBLEMA DO CLIENTE (DORES PROFUNDAS)
  // =========================================================================
  checkPageBreak(80);
  printHeading1('2. O Diagnóstico das Dores do Dono de Oficina');
  printParagraph(
    'Para vender com facilidade, você precisa falar a língua da dor dele. O dono de marcenaria ou vidraçaria acorda e dorme com 5 problemas gravíssimos que o BomProjeto resolve:'
  );

  printHeading3('Dor 1: A "Paralisia por Interrupção no WhatsApp"');
  printParagraph(
    'O profissional está com a serra ligada ou ajustando um detalhe milimétrico. O telefone toca com 7 clientes perguntando a mesma coisa: "Como está meu projeto?". Cada interrupção custa 20 minutos de foco. O dia passa, a produção atrasa e ele termina o dia exausto sem ter produzido o que precisava.'
  );

  printHeading3('Dor 2: O Cliente Desconfiado e Ansioso');
  printParagraph(
    'Como o mercado sob medida é manchado por profissionais amadores que pegam o sinal e somem, o cliente final fica aterrorizado. Qualquer silêncio de 3 dias faz o cliente achar que tomou golpe. Quando a empresa não manda fotos, o cliente liga furioso.'
  );

  printHeading3('Dor 3: A "Vergonha de Cobrar" e a Inadimplência na Entrega');
  printParagraph(
    'O prestador de serviços combina 50% de entrada e 50% na montagem. Chega o dia da instalação, ele instala tudo, e na hora de pedir o restante fica sem jeito. O cliente diz "semana que vem eu transfiro" e não transfere. Sem um sistema formal, a empresa vira banco do cliente.'
  );

  printHeading3('Dor 4: O "Disse-Me-Disse" de Alterações de Projeto');
  printParagraph(
    'O cliente pede alterações por áudio de WhatsApp. Três semanas depois, reclama que a gaveta veio sem corrediça invisível. Não há registro oficial de etapas, nem termo de aceite ou entrega assinado.'
  );

  printHeading3('Dor 5: Falta de Controle de Filiais e Equipes de Campo');
  printParagraph(
    'Quando a oficina começa a crescer (2 ou 3 equipes na rua), o dono não sabe quem está onde, se a montagem foi feita com capricho ou se o cliente assinou o termo de garantia e entrega.'
  );

  // =========================================================================
  // PÁGINA 4: DEMONSTRAÇÃO PRÁTICA DAS SOLUÇÕES PROPOSTAS
  // =========================================================================
  doc.addPage();
  currentPage++;
  drawHeader();
  y = margin + 5;

  printHeading1('3. Soluções Propostas & Módulos da Plataforma');
  printParagraph(
    'Aqui estão os recursos técnicos explicados com o benefício comercial correspondente que o vendedor deve destacar:'
  );

  printHeading2('Módulo A: Portal de Acompanhamento em Tempo Real');
  printBullet('Tecnologia', 'Link PWA responsivo com design estilo Fleetly (#0F172A e #F97316), sem exigência de senha.');
  printBullet('Benefício Comercial', 'O cliente sente que contratou uma multinacional, não uma portinha de fundo de quintal. O valor percebido do projeto sobe imediatamente em 30% a 50%.');
  printBullet('Garantia Técnica', 'O cliente visualiza o nome da empresa, o contrato, o status de montagem e as fotos reais da produção na bancada.');

  printHeading2('Módulo B: Cobrança Inteligente via Pix Copia e Cola');
  printBullet('Tecnologia', 'Integração com padrão Pix oficial do Banco Central (EMVCo QR Code Payload estático e dinâmico com checksum CRC16).');
  printBullet('Benefício Comercial', 'Elimina qualquer atrito financeiro. Quando a parcela vence ou a etapa de entrega é batida, o WhatsApp do cliente recebe a mensagem cordial com o código Pix. Um toque na tela copia a chave e o cliente paga no banco.');
  printBullet('Privacidade Financeira', 'O sistema conta com o Modo Blur (Ocultar Valores) no topo da tela, permitindo que a equipe use o sistema na bancada sem ver os valores sigilosos do contrato.');

  printHeading2('Módulo C: Conexão WhatsApp Direta (Linha Própria)');
  printBullet('Tecnologia', 'Conexão via QR Code em 60 segundos com UazAPI / Multi-Device. Não precisa de números caros de terceiros.');
  printBullet('Benefício Comercial', 'A mensagem sai do número oficial da oficina (com foto do dono ou logo), transmitindo total legitimidade.');

  printHeading2('Módulo D: Retenção Pro & Análise de Tom de Voz');
  printBullet('Tecnologia', 'Algoritmo multicritério alimentado por IA Gemini que avalia 4 pilares: risco contratual, confiabilidade de prazos, percepção de valor e tom de voz.');
  printBullet('Benefício Comercial', 'O dono da oficina sabe antes do cliente explodir que ele está incomodado. O sistema acende alertas amarelos e vermelhos na tela e fornece um playbook de resposta pronta com 1 clique para acalmar o cliente.');

  printHeading2('Módulo E: Termo de Entrega & Garantia em PDF');
  printBullet('Tecnologia', 'Geração de PDF legal com fotos finais do móvel/obra, número da ordem de serviço e botão de aceite digital.');
  printBullet('Benefício Comercial', 'Protege a empresa contra reclamações infundadas de arranhões ou avarias após a equipe sair da casa do cliente.');

  // =========================================================================
  // PÁGINA 5: O QUE MUDA NA ROTINA (ANTES VS DEPOIS & ROI)
  // =========================================================================
  checkPageBreak(80);
  printHeading1('4. O Que Muda no Dia a Dia da Empresa (Antes vs Depois)');

  printHeading3('Tabela Comparativa de Transformação Operacional:');
  
  const comparisons = [
    ['Situação', 'Sem o BomProjeto (Caos Diário)', 'Com o BomProjeto (Profissionalismo Total)'],
    ['Comunicação', 'Cliente mandando 15 áudios por dia perguntando sobre o prazo.', 'Cliente clica no link e vê a foto da peça na máquina. Zero ansiedade.'],
    ['Cobrança', 'Dono com vergonha de cobrar; cliente enrola semanas para pagar.', 'Cobrança automática profissional com botão de Pix Copia e Cola.'],
    ['Prazos', 'Projetos atrasando sem o cliente saber o motivo.', 'Linha do tempo transparente; cliente vê o avanço e respeita a equipe.'],
    ['Imagem da Marca', 'Sensação de marceneiro amador que não dá retorno.', 'Sensação de empresa de alto padrão (SaaS de acompanhamento).'],
    ['Tempo do Dono', '3 a 4 horas por dia respondendo WhatsApp e justificando atrasos.', 'Dono focado em vender novos projetos e coordenar a fabricação.'],
    ['Segurança Jurídica', 'Combinações em conversas perdidas no chat.', 'Histórico com fotos, etapas carimbadas e termo de entrega em PDF.']
  ];

  comparisons.forEach(([item, antes, depois], idx) => {
    checkPageBreak(16);
    if (idx === 0) {
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(item, margin + 2, y + 4.8);
      doc.text(antes, margin + 35, y + 4.8);
      doc.text(depois, margin + 105, y + 4.8);
      y += 8;
    } else {
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
      doc.rect(margin, y, contentWidth, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(item, margin + 2, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 38, 38);
      const antesLines = doc.splitTextToSize(antes, 65);
      doc.text(antesLines, margin + 35, y + 4.5);
      doc.setTextColor(22, 101, 52);
      const depoisLines = doc.splitTextToSize(depois, 65);
      doc.text(depoisLines, margin + 105, y + 4.5);
      y += 13;
    }
  });

  printHeading3('O Retorno Sobre o Investimento (ROI Explicado ao Dono):');
  printParagraph(
    'Se um projeto de marcenaria médio custa entre R$ 8.000 e R$ 45.000, um atraso de recebimento de apenas 1 parcela de R$ 5.000 já desregula o fluxo de caixa da oficina (compra de MDF, pagamento de montador). O BomProjeto custa R$ 197,93 por mês no plano Start. OU SEJA: O SISTEMA SE PAGA COM A RECUPERAÇÃO DE APENAS 1 DIA DE ATRASO DE PAGAMENTO.'
  );

  // =========================================================================
  // PÁGINA 6: TABELA COMPLETA DE PLANOS E VALORES
  // =========================================================================
  doc.addPage();
  currentPage++;
  drawHeader();
  y = margin + 5;

  printHeading1('5. Tabela Oficial de Planos, Preços e Limites');

  // PLANO START CARD
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, (contentWidth / 2) - 3, 105, 3, 3, 'FD');

  let cardY = y + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('PLANO START', margin + 5, cardY);
  cardY += 5;
  doc.setFontSize(8);
  doc.setTextColor(249, 115, 22);
  doc.text('MAIS ESCOLHIDO • PARA EXPANSÃO', margin + 5, cardY);
  cardY += 7;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('R$ 197,93', margin + 5, cardY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('/ mês (mensal)', margin + 44, cardY);
  cardY += 5;
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text('Ou R$ 161,94/mês no plano anual (18% OFF)', margin + 5, cardY);
  cardY += 6;

  const startFeats = [
    'Até 10 Projetos Ativos simultâneos',
    'Até 3 Workspaces / Filiais',
    'Até 3 Membros no Modo Time (CEO, Adm, Membro)',
    'Conexão Direta WhatsApp via QR Code',
    'Cobrança Automática Pix (D-3, D-0, D+3)',
    'Link do Cliente sem senha para acompanhamento',
    'Upload de fotos ilimitadas da produção',
    'Termo de Garantia e Entrega em PDF',
    'Suporte direto via WhatsApp comercial'
  ];

  startFeats.forEach(f => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`✓ ${f}`, margin + 5, cardY);
    cardY += 5.2;
  });

  // PLANO SCALA CARD
  const escalaX = margin + (contentWidth / 2) + 3;
  const escalaWidth = (contentWidth / 2) - 3;
  doc.setFillColor(15, 23, 42); // Black background
  doc.roundedRect(escalaX, y, escalaWidth, 105, 3, 3, 'F');

  cardY = y + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('PLANO SCALA', escalaX + 5, cardY);
  cardY += 5;
  doc.setFontSize(8);
  doc.setTextColor(249, 115, 22);
  doc.text('ALTA PRODUTIVIDADE • PROJETOS ILIMITADOS', escalaX + 5, cardY);
  cardY += 7;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('R$ 397,97', escalaX + 5, cardY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('/ mês (mensal)', escalaX + 44, cardY);
  cardY += 5;
  doc.setFontSize(8);
  doc.setTextColor(134, 239, 172);
  doc.text('Ou R$ 325,65/mês no plano anual (18% OFF)', escalaX + 5, cardY);
  cardY += 6;

  const escalaFeats = [
    'Projetos Ativos ILIMITADOS (∞)',
    'Até 6 Workspaces / Filiais',
    'Até 10 Membros no Modo Time',
    'TUDO do Plano Start incluso',
    'Módulo Retenção Pro Completo',
    'Análise de Tom de Voz em Áudios (Gemini AI)',
    'Radar Semântico de Palavras de Risco',
    'Playbooks Prescritivos de IA no WhatsApp',
    'Suporte VIP Prioritário 24/7 com equipe'
  ];

  escalaFeats.forEach(f => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(241, 245, 249);
    doc.text(`★ ${f}`, escalaX + 5, cardY);
    cardY += 5.2;
  });

  y += 112;

  printHeading2('Condições Comerciais & Garantias');
  printBullet('Sem Fidelidade', 'O cliente pode cancelar quando quiser no painel sem multas contratuais.');
  printBullet('Período de Piloto / Teste', 'O plano Grátis permite cadastrar 1 projeto real imediatamente sem colocar cartão de crédito para ver funcionando.');
  printBullet('Formas de Pagamento Aceitas', 'Cartão de crédito recorrente ou Pix (com liberação imediata da conta).');

  // =========================================================================
  // PÁGINA 7: MATRIZ DE QUEBRA DE OBJEÇÕES PARA O VENDEDOR
  // =========================================================================
  doc.addPage();
  currentPage++;
  drawHeader();
  y = margin + 5;

  printHeading1('6. Matriz de Quebra de Objeções (Armas do Vendedor)');
  printParagraph(
    'Quando o vendedor entrar em contato, o dono da fábrica vai levantar objeções comuns. Aqui está a resposta exata para desarmar cada uma delas:'
  );

  const objecoes = [
    {
      obj: '1. "Já tenho WhatsApp e mando mensagem por lá mesmo."',
      resp: 'Resposta do Vendedor: "Excelente, e o BomProjeto se conecta exatamente no seu WhatsApp! A grande diferença é que hoje você gasta 3 horas por dia digitando a mesma coisa para 15 clientes, caçando fotos na sua galeria e tendo vergonha de cobrar a parcela. Com o BomProjeto, você tira 1 foto, o link atualiza sozinho e a cobrança Pix vai no automático sem você se queimar com o cliente."'
    },
    {
      obj: '2. "Meus clientes são pessoas mais velhas ou simples, não vão saber mexer."',
      resp: 'Resposta do Vendedor: "Foi exatamente por isso que criamos o sistema sem aplicativo e sem senha! Seu cliente não precisa baixar nada da Play Store nem criar conta. Ele só clica no link do WhatsApp e a tela já abre direto com as fotos e o botão de Pix Copia e Cola. Se ele sabe abrir o WhatsApp, ele sabe usar o BomProjeto."'
    },
    {
      obj: '3. "Não tenho tempo para alimentar outro sistema."',
      resp: 'Resposta do Vendedor: "O BomProjeto foi feito para quem trabalha de botina e uniforme de fábrica. Cadastrar um projeto leva 40 segundos: nome, telefone, prazo e parcelas. Tirar uma foto da bancada leva 5 segundos. O sistema não te toma tempo: ele te devolve 15 horas semanais de interrupções inúteis."'
    },
    {
      obj: '4. "Acho R$ 197 por mês caro para a minha realidade."',
      resp: 'Resposta do Vendedor: "Seu José, quanto custa uma parcela de um armário ou de um box que o cliente atrasa 20 dias para te pagar? Geralmente R$ 2.000 ou R$ 5.000. O BomProjeto custa R$ 6,50 por dia — menos que um cafezinho com pão de queijo na padaria. Uma única parcela que você recebe no dia certo já paga mais de 1 ano inteiro do sistema."'
    },
    {
      obj: '5. "Já uso Promob / Corte Cloud / Bling."',
      resp: 'Resposta do Vendedor: "Perfeito! O Promob faz o projeto 3D e o Corte Cloud faz o plano de corte. Nenhum deles conversa com seu cliente final nem envia fotos da montagem com Pix no WhatsApp. O BomProjeto não substitui seu software de desenho: ele é o seu braço direito comercial e de atendimento."'
    }
  ];

  objecoes.forEach(item => {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(220, 38, 38); // Vermelho da objeção
    doc.text(item.obj, margin, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const respLines = doc.splitTextToSize(item.resp, contentWidth - 4);
    doc.text(respLines, margin + 2, y);
    y += (respLines.length * 4) + 4;
  });

  // =========================================================================
  // PÁGINA 8: SCRIPTS DE VENDAS (COLD CALL, WHATSAPP & DEMO)
  // =========================================================================
  doc.addPage();
  currentPage++;
  drawHeader();
  y = margin + 5;

  printHeading1('7. Scripts Prontos de Venda para o Vendedor');

  printHeading2('Script 1: Abordagem pelo WhatsApp (Outbound Direto)');
  printParagraph(
    'Copie e envie para donos de marcenarias, serralherias e marmorarias encontradas no Google Maps ou Instagram:'
  );

  const scriptWhats = `Olá [Nome do Dono], tudo bem? Vi os projetos impecáveis da [Nome da Oficina]. Parabéns pelo trabalho!

Uma pergunta rápida: quantos clientes seus hoje te mandam mensagem toda semana perguntando "como está o meu projeto?" ou "tem foto da bancada?"?

Nós criamos uma ferramenta chamada BomProjeto que envia um link elegante no WhatsApp para o seu cliente acompanhar as etapas e fotos da produção em tempo real — e ainda envia o Pix Copia e Cola automático quando a parcela vence.

Você não precisa ficar parando de serrar ou cortar para responder clientes. 

Gravei um vídeo de 1 minuto mostrando como funciona em marcenarias como a sua. Posso te mandar o link aqui?`;

  printCallout('SCRIPT WHATSAPP OUTBOUND (ALTA CONVERSÃO)', scriptWhats);

  printHeading2('Script 2: Ligação Rápida de Apresentação (Cold Call)');
  const scriptCall = `— "Alô, [Nome do Dono]? Aqui é o [Seu Nome] do BomProjeto. Sei que você deve estar no meio da produção, então serei direto: você gasta muito tempo hoje no WhatsApp tendo que mandar fotos e justificando prazos para clientes ansiosos?
— [Dono responde que sim]
— Pois é, a maioria dos donos de oficina perde mais de 2 horas por dia nisso. O BomProjeto coloca um portal sem senha no celular do seu cliente, com fotos da bancada e lembretes de Pix automáticos. Quero te liberar um projeto de teste grátis agora para você colocar no seu próximo cliente e ver como ele fica encantado. Qual seu melhor e-mail para eu liberar o acesso?"`;

  printCallout('SCRIPT COLD CALL DE 90 SEGUNDOS', scriptCall);

  printHeading2('Script 3: Roteiro de Demonstração em 3 Passos');
  printBullet('Passo 1: Mostrar o Portal do Cliente no Celular', 'Abra o link do cliente de demonstração. Mostre como é lindo, rápido e sem senha. Destaque as fotos reais e a linha do tempo.');
  printBullet('Passo 2: Mostrar a Cobrança Pix', 'Mostre a parcela pendente, clique no botão "Copiar Chave Pix" e mostre como o cliente paga sem desculpas.');
  printBullet('Passo 3: Fechar no Plano Start', 'Pergunte: "Faz sentido você colocar isso nos seus próximos projetos para parar de ser interrompido e receber suas parcelas em dia por menos de R$ 7 por dia?"');

  // =========================================================================
  // PÁGINA 9: RESUMO EXECUTIVO & CHECKLIST DO VENDEDOR
  // =========================================================================
  checkPageBreak(70);
  printHeading1('8. Checklist Final do Vendedor de Alta Performance');
  
  const checklist = [
    ['1. Domínio da Proposta', 'Nunca venda como "software de computador". Venda como "o fim do cliente chato no seu WhatsApp e recebimento garantido no Pix".'],
    ['2. Foco no Dono', 'Fale sempre com o proprietário ou sócio gestor. Funcionários não têm a dor de receber o dinheiro ou pagar contas.'],
    ['3. Fale a Linguagem Dele', 'Use termos do dia a dia: bancada, MDF, instalação, serralheria, medição, sinal de entrada, parcela de entrega.'],
    ['4. Apresente no Celular', '95% dos donos de oficina usam o smartphone para tudo. Mande o link de demonstração diretamente no WhatsApp dele.'],
    ['5. Ancore o Preço no Valor da Parcela', 'R$ 197/mês não é nada comparado a uma parcela de R$ 6.000 que ele deixa de tomar calote.'],
    ['6. Fechamento Rápido', 'Ofereça o teste imediato: "Vamos cadastrar seu cliente de amanhã juntos agora? Leva 2 minutos."']
  ];

  checklist.forEach(([title, desc]) => {
    printBullet(title, desc);
  });

  drawFooter();

  // Escreve os arquivos PDF
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const file1 = path.join(publicDir, 'dossie-comercial-bomprojeto.pdf');
  const file2 = path.join(publicDir, 'briefing-vendas-bomprojeto.pdf');

  fs.writeFileSync(file1, pdfBuffer);
  fs.writeFileSync(file2, pdfBuffer);

  console.log(`✓ Dossie PDF gerado com sucesso em: ${file1} (${pdfBuffer.length} bytes, ${currentPage} páginas)`);
  console.log(`✓ Cópia gerada em: ${file2}`);
}

generateDossierPdf().catch(err => {
  console.error('Erro ao gerar PDF:', err);
  process.exit(1);
});
