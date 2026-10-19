import sharp from 'sharp';

export interface OgCardOptions {
  companyName: string;
  projectTitle: string;
  projectCode: string;
  clientName?: string;
  currentStage: string;
  progressPercent: number;
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(text: string, maxLen: number): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1).trim() + '…';
}

function formatTitleLines(title: string): { line1: string; line2?: string } {
  const clean = (title || 'Projeto Sob Medida').trim();
  if (clean.length <= 36) {
    return { line1: escapeXml(clean) };
  }
  const splitIdx = clean.lastIndexOf(' ', 36);
  if (splitIdx > 14) {
    const l1 = clean.slice(0, splitIdx).trim();
    const l2 = truncateText(clean.slice(splitIdx).trim(), 40);
    return { line1: escapeXml(l1), line2: escapeXml(l2) };
  }
  return {
    line1: escapeXml(truncateText(clean.slice(0, 36), 36)),
    line2: escapeXml(truncateText(clean.slice(36), 40))
  };
}

export async function generateOgCardPng(options: OgCardOptions): Promise<Buffer> {
  const rawCompany = options.companyName || 'Agência King Marketing';
  const companyName = escapeXml(truncateText(rawCompany.toUpperCase(), 34));
  const { line1: titleLine1, line2: titleLine2 } = formatTitleLines(options.projectTitle);
  const projectCode = escapeXml(truncateText(options.projectCode || 'OS-101', 14));
  const clientName = escapeXml(options.clientName ? truncateText(options.clientName.split(' ')[0], 20) : 'Cliente');
  const currentStage = escapeXml(truncateText(options.currentStage || 'Produção em Andamento', 32));
  const progress = Math.min(100, Math.max(0, options.progressPercent || 45));
  const progressWidth = Math.round((progress / 100) * 944);

  const hasTwoTitleLines = Boolean(titleLine2);

  const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>

    <radialGradient id="glow" cx="80%" cy="10%" r="65%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.35" />
      <stop offset="50%" stop-color="#ea580c" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#ea580c" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="cardBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.98" />
    </linearGradient>

    <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#glow)" />

  <!-- Subtle Blueprint Grid -->
  <g stroke="#334155" stroke-opacity="0.18" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105" />
    <line x1="0" y1="210" x2="1200" y2="210" />
    <line x1="0" y1="315" x2="1200" y2="315" />
    <line x1="0" y1="420" x2="1200" y2="420" />
    <line x1="0" y1="525" x2="1200" y2="525" />
    <line x1="200" y1="0" x2="200" y2="630" />
    <line x1="400" y1="0" x2="400" y2="630" />
    <line x1="600" y1="0" x2="600" y2="630" />
    <line x1="800" y1="0" x2="800" y2="630" />
    <line x1="1000" y1="0" x2="1000" y2="630" />
  </g>

  <!-- Top Header: Brand & Portal Tag -->
  <g transform="translate(80, 48)">
    <!-- 9-dot brand mark -->
    <g transform="scale(0.24)">
      <circle cx="134" cy="92" r="18" fill="#ffffff" />
      <circle cx="200" cy="92" r="17" fill="#ffffff" />
      <circle cx="266" cy="92" r="17" fill="#ffffff" />
      <circle cx="113" cy="176" r="30" fill="#f97316" />
      <circle cx="200" cy="176" r="30" fill="#f97316" />
      <circle cx="287" cy="176" r="30" fill="#f97316" />
      <circle cx="80" cy="285" r="42" fill="#ffffff" />
      <circle cx="200" cy="285" r="42" fill="#ffffff" />
      <circle cx="320" cy="285" r="42" fill="#ffffff" />
    </g>
    <!-- Logo Typography -->
    <text x="100" y="52" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-weight="900" font-size="44" letter-spacing="-1px">
      <tspan fill="#ffffff">BOM</tspan><tspan fill="#f97316">Projeto</tspan>
    </text>
    <text x="365" y="47" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-weight="600" font-size="15" fill="#94a3b8" letter-spacing="1.5px">
      | ACOMPANHAMENTO EM TEMPO REAL
    </text>
  </g>

  <!-- Right Pill Badge: Sem Senha -->
  <g transform="translate(860, 52)">
    <rect width="260" height="42" rx="21" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
    <circle cx="26" cy="21" r="5" fill="#22c55e" />
    <text x="42" y="26" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#f1f5f9" letter-spacing="0.5px">
      PORTAL SEGURO • SEM SENHA
    </text>
  </g>

  <!-- Main Centralized Card (Protected Container with Safe Margins) -->
  <g transform="translate(80, 126)">
    <rect width="1040" height="440" rx="24" fill="url(#cardBg)" stroke="#334155" stroke-width="1.5" />

    <!-- Company Header Pill -->
    <g transform="translate(48, 32)">
      <rect width="520" height="36" rx="18" fill="#f97316" fill-opacity="0.15" stroke="#f97316" stroke-opacity="0.4" stroke-width="1" />
      <circle cx="20" cy="18" r="6" fill="#f97316" />
      <text x="36" y="23" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="13" font-weight="800" fill="#fb923c" letter-spacing="0.8px">
        PROJETO: ${companyName}
      </text>
    </g>

    <!-- OS Code Tag (Top Right of Card) -->
    <g transform="translate(820, 32)">
      <rect width="172" height="36" rx="10" fill="#090d16" stroke="#475569" stroke-width="1" />
      <text x="86" y="23" text-anchor="middle" font-family="Courier, monospace" font-size="15" font-weight="700" fill="#38bdf8">
        OS #${projectCode}
      </text>
    </g>

    <!-- Project Title Line 1 -->
    <text x="48" y="${hasTwoTitleLines ? 112 : 124}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-weight="800" font-size="${hasTwoTitleLines ? 32 : 36}" fill="#ffffff" letter-spacing="-0.5px">
      ${titleLine1}
    </text>

    <!-- Project Title Line 2 (if present) -->
    ${hasTwoTitleLines ? `
    <text x="48" y="150" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-weight="700" font-size="28" fill="#cbd5e1" letter-spacing="-0.5px">
      ${titleLine2}
    </text>
    ` : ''}

    <!-- Client Greeting & Status Line -->
    <text x="48" y="${hasTwoTitleLines ? 186 : 166}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-weight="500" font-size="18" fill="#94a3b8">
      Olá, <tspan fill="#ffffff" font-weight="700">${clientName}</tspan>! Acompanhe cada etapa da execução, fotos e cronograma.
    </text>

    <!-- Current Stage Banner -->
    <g transform="translate(48, ${hasTwoTitleLines ? 208 : 194})">
      <rect width="944" height="60" rx="14" fill="#090d16" stroke="#334155" stroke-width="1" />
      <circle cx="30" cy="30" r="8" fill="#f97316" />
      <text x="50" y="36" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="#ffffff">
        Etapa Atual: <tspan fill="#fb923c">${currentStage}</tspan>
      </text>
      <text x="914" y="36" text-anchor="end" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="17" font-weight="800" fill="#22c55e">
        ${progress}% Concluído
      </text>
    </g>

    <!-- Progress Bar -->
    <g transform="translate(48, ${hasTwoTitleLines ? 282 : 268})">
      <rect width="944" height="10" rx="5" fill="#334155" />
      <rect width="${progressWidth}" height="10" rx="5" fill="url(#orangeGrad)" />
    </g>

    <!-- Feature Badges with crisp SVG Vector Icons instead of emoji tofu -->
    <g transform="translate(48, ${hasTwoTitleLines ? 310 : 296})">
      <!-- Feature 1: Fotos da Execução -->
      <g transform="translate(0, 0)">
        <rect width="295" height="52" rx="12" fill="#090d16" fill-opacity="0.7" stroke="#1e293b" stroke-width="1" />
        <g transform="translate(20, 16)" stroke="#f97316" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </g>
        <text x="56" y="32" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#ffffff">Anexos &amp; Fotos da Obra</text>
      </g>

      <!-- Feature 2: Notificações em Tempo Real -->
      <g transform="translate(325, 0)">
        <rect width="295" height="52" rx="12" fill="#090d16" fill-opacity="0.7" stroke="#1e293b" stroke-width="1" />
        <g transform="translate(20, 16)" stroke="#22c55e" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </g>
        <text x="56" y="32" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#ffffff">Notificações em Tempo Real</text>
      </g>

      <!-- Feature 3: Vistoria & Garantia -->
      <g transform="translate(649, 0)">
        <rect width="295" height="52" rx="12" fill="#090d16" fill-opacity="0.7" stroke="#1e293b" stroke-width="1" />
        <g transform="translate(20, 16)" stroke="#38bdf8" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 11 11 13 15 9"/>
        </g>
        <text x="56" y="32" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#ffffff">Vistoria &amp; Garantia</text>
      </g>
    </g>

    <!-- Bottom Signature inside Card -->
    <text x="48" y="${hasTwoTitleLines ? 398 : 388}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="12" font-weight="600" fill="#64748b" letter-spacing="0.5px">
      ACOMPANHAMENTO TRANSPARENTE E OFICIAL • CLIQUE NO LINK PARA ACESSAR DIRETAMENTE
    </text>
  </g>

  <!-- Bottom Global Signature -->
  <text x="600" y="596" text-anchor="middle" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="13" font-weight="500" fill="#64748b">
    Portal do Cliente • Plataforma BOMProjeto
  </text>
</svg>
`;

  return sharp(Buffer.from(svg))
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();
}
