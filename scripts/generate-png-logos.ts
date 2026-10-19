import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function main() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // =========================================================================
  // 1. LOGO HORIZONTAL OFICIAL (Fundo Transparente, 2000 x 560 px)
  // =========================================================================
  const svgHorizontal = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 280" width="2000" height="560">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;700;800&amp;display=swap');
      .font-brand-bold {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 800;
      }
      .font-brand-light {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 300;
      }
      .font-brand-sub {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 600;
        letter-spacing: 3px;
      }
    </style>
  </defs>

  <!-- Símbolo dos 9 Pontos -->
  <g transform="translate(40, 20) scale(0.6)">
    <!-- Linha Superior - 3 pontos pequenos -->
    <circle cx="134" cy="92" r="17" fill="#0F172A" />
    <circle cx="200" cy="92" r="17" fill="#0F172A" />
    <circle cx="266" cy="92" r="17" fill="#0F172A" />

    <!-- Linha Intermediária - 3 pontos médios laranja vibrante -->
    <circle cx="113" cy="176" r="29" fill="#F97316" />
    <circle cx="200" cy="176" r="29" fill="#F97316" />
    <circle cx="287" cy="176" r="29" fill="#F97316" />

    <!-- Linha Inferior - 3 pontos grandes -->
    <circle cx="80" cy="285" r="40" fill="#0F172A" />
    <circle cx="200" cy="285" r="40" fill="#0F172A" />
    <circle cx="320" cy="285" r="40" fill="#0F172A" />
  </g>

  <!-- Tipografia Oficial "BomProjeto" + Ponto Laranja -->
  <text x="310" y="165" class="font-brand-bold" font-size="118" letter-spacing="-3px">
    <tspan fill="#0F172A">Bom</tspan><tspan fill="#0F172A" class="font-brand-light" font-weight="300">Projeto</tspan>
  </text>
  <circle cx="952" cy="153" r="11" fill="#F97316" />

  <!-- Subtítulo / Tagline da Plataforma -->
  <text x="316" y="212" class="font-brand-sub" font-size="17" fill="#64748B">
    GESTÃO INTELIGENTE DE PROJETOS &amp; O.S.
  </text>
</svg>
`;

  // =========================================================================
  // 2. LOGO HORIZONTAL COM FUNDO BRANCO (Alta Resolução 2000 x 650 px)
  // =========================================================================
  const svgHorizontalWhiteBg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 320" width="2000" height="640">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;700;800&amp;display=swap');
      .font-brand-bold {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 800;
      }
      .font-brand-light {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 300;
      }
      .font-brand-sub {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 600;
        letter-spacing: 3px;
      }
    </style>
  </defs>

  <!-- Fundo Branco -->
  <rect width="1000" height="320" fill="#FFFFFF" rx="20" />

  <!-- Símbolo dos 9 Pontos -->
  <g transform="translate(60, 40) scale(0.6)">
    <!-- Linha Superior -->
    <circle cx="134" cy="92" r="17" fill="#0F172A" />
    <circle cx="200" cy="92" r="17" fill="#0F172A" />
    <circle cx="266" cy="92" r="17" fill="#0F172A" />

    <!-- Linha Intermediária Laranja -->
    <circle cx="113" cy="176" r="29" fill="#F97316" />
    <circle cx="200" cy="176" r="29" fill="#F97316" />
    <circle cx="287" cy="176" r="29" fill="#F97316" />

    <!-- Linha Inferior -->
    <circle cx="80" cy="285" r="40" fill="#0F172A" />
    <circle cx="200" cy="285" r="40" fill="#0F172A" />
    <circle cx="320" cy="285" r="40" fill="#0F172A" />
  </g>

  <!-- Tipografia -->
  <text x="330" y="185" class="font-brand-bold" font-size="118" letter-spacing="-3px">
    <tspan fill="#0F172A">Bom</tspan><tspan fill="#0F172A" class="font-brand-light" font-weight="300">Projeto</tspan>
  </text>
  <circle cx="972" cy="173" r="11" fill="#F97316" />

  <text x="336" y="232" class="font-brand-sub" font-size="17" fill="#64748B">
    GESTÃO INTELIGENTE DE PROJETOS &amp; O.S.
  </text>
</svg>
`;

  // =========================================================================
  // 3. LOGO PARA FUNDOS ESCUROS (Fundo Transparente, 2000 x 560 px)
  // =========================================================================
  const svgHorizontalDark = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 280" width="2000" height="560">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;700;800&amp;display=swap');
      .font-brand-bold {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 800;
      }
      .font-brand-light {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 300;
      }
      .font-brand-sub {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 600;
        letter-spacing: 3px;
      }
    </style>
  </defs>

  <!-- Símbolo dos 9 Pontos (Branco + Laranja) -->
  <g transform="translate(40, 20) scale(0.6)">
    <circle cx="134" cy="92" r="17" fill="#FFFFFF" />
    <circle cx="200" cy="92" r="17" fill="#FFFFFF" />
    <circle cx="266" cy="92" r="17" fill="#FFFFFF" />

    <circle cx="113" cy="176" r="29" fill="#F97316" />
    <circle cx="200" cy="176" r="29" fill="#F97316" />
    <circle cx="287" cy="176" r="29" fill="#F97316" />

    <circle cx="80" cy="285" r="40" fill="#FFFFFF" />
    <circle cx="200" cy="285" r="40" fill="#FFFFFF" />
    <circle cx="320" cy="285" r="40" fill="#FFFFFF" />
  </g>

  <text x="310" y="165" class="font-brand-bold" font-size="118" letter-spacing="-3px">
    <tspan fill="#FFFFFF">Bom</tspan><tspan fill="#FFFFFF" class="font-brand-light" font-weight="300" opacity="0.95">Projeto</tspan>
  </text>
  <circle cx="952" cy="153" r="11" fill="#F97316" />

  <text x="316" y="212" class="font-brand-sub" font-size="17" fill="#94A3B8">
    GESTÃO INTELIGENTE DE PROJETOS &amp; O.S.
  </text>
</svg>
`;

  // =========================================================================
  // 4. ÍCONE / SÍMBOLO DOS 9 PONTOS (1024 x 1024 px, Fundo Transparente)
  // =========================================================================
  const svgMark = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="1024" height="1024">
  <!-- Linha Superior - 3 pontos pequenos -->
  <circle cx="134" cy="92" r="17" fill="#0F172A" />
  <circle cx="200" cy="92" r="17" fill="#0F172A" />
  <circle cx="266" cy="92" r="17" fill="#0F172A" />

  <!-- Linha Intermediária - 3 pontos médios laranja vibrante -->
  <circle cx="113" cy="176" r="29" fill="#F97316" />
  <circle cx="200" cy="176" r="29" fill="#F97316" />
  <circle cx="287" cy="176" r="29" fill="#F97316" />

  <!-- Linha Inferior - 3 pontos grandes -->
  <circle cx="80" cy="285" r="40" fill="#0F172A" />
  <circle cx="200" cy="285" r="40" fill="#0F172A" />
  <circle cx="320" cy="285" r="40" fill="#0F172A" />
</svg>
`;

  // =========================================================================
  // 5. ÍCONE DE APP (1024 x 1024 px com fundo card escuro moderno)
  // =========================================================================
  const svgAppIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
  <defs>
    <linearGradient id="appBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F97316" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#F97316" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Fundo do App Icon com cantos arredondados Squircle -->
  <rect width="512" height="512" rx="112" fill="url(#appBg)" />
  <rect width="512" height="512" rx="112" fill="url(#glowGrad)" />
  <rect width="508" height="508" x="2" y="2" rx="110" fill="none" stroke="#334155" stroke-width="4" stroke-opacity="0.4" />

  <!-- Símbolo Centralizado -->
  <g transform="translate(56, 56) scale(1.0)">
    <circle cx="134" cy="92" r="17" fill="#FFFFFF" />
    <circle cx="200" cy="92" r="17" fill="#FFFFFF" />
    <circle cx="266" cy="92" r="17" fill="#FFFFFF" />

    <circle cx="113" cy="176" r="29" fill="#F97316" />
    <circle cx="200" cy="176" r="29" fill="#F97316" />
    <circle cx="287" cy="176" r="29" fill="#F97316" />

    <circle cx="80" cy="285" r="40" fill="#FFFFFF" />
    <circle cx="200" cy="285" r="40" fill="#FFFFFF" />
    <circle cx="320" cy="285" r="40" fill="#FFFFFF" />
  </g>
</svg>
`;

  console.log('Gerando arquivos PNG de alta resolução com sharp...');

  await sharp(Buffer.from(svgHorizontal))
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(path.join(publicDir, 'logo-bomprojeto.png'));
  console.log('✓ public/logo-bomprojeto.png gerado');

  await sharp(Buffer.from(svgHorizontalWhiteBg))
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(path.join(publicDir, 'logo-bomprojeto-fundo-branco.png'));
  console.log('✓ public/logo-bomprojeto-fundo-branco.png gerado');

  await sharp(Buffer.from(svgHorizontalDark))
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(path.join(publicDir, 'logo-bomprojeto-dark.png'));
  console.log('✓ public/logo-bomprojeto-dark.png gerado');

  await sharp(Buffer.from(svgMark))
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(path.join(publicDir, 'logo-bomprojeto-simbolo.png'));
  console.log('✓ public/logo-bomprojeto-simbolo.png gerado');

  await sharp(Buffer.from(svgAppIcon))
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(path.join(publicDir, 'logo-bomprojeto-app-icon.png'));
  console.log('✓ public/logo-bomprojeto-app-icon.png gerado');

  // Cria também atalho padrão logo.png
  await sharp(Buffer.from(svgHorizontal))
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(path.join(publicDir, 'logo.png'));
  console.log('✓ public/logo.png gerado');

  console.log('Todos os PNGs da logomarca foram gerados com sucesso!');
}

main().catch(err => {
  console.error('Erro ao gerar PNGs:', err);
  process.exit(1);
});
