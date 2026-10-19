import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { execSync } from 'child_process';

const baseSvgPath = path.resolve('public/print-tela-bomprojeto.svg');
let baseSvg = fs.readFileSync(baseSvgPath, 'utf-8');

// The base SVG ends with </svg>
const baseSvgBody = baseSvg.replace(/<\/svg>\s*$/, '');

// Overlay for State 2: Profile Dropdown Menu
const profileMenuOverlay = `
  <!-- Overlay: Profile Dropdown Menu Open -->
  <g transform="translate(970, 88)" filter="url(#cardShadow)">
    <rect width="215" height="195" rx="10" fill="#FFFFFF" stroke="#E6E0D6" stroke-width="1" />
    
    <!-- User Header in Dropdown -->
    <rect width="215" height="52" rx="10" fill="#FAF8F5" />
    <rect y="42" width="215" height="10" fill="#FAF8F5" />
    <line x1="0" y1="52" x2="215" y2="52" stroke="#EAE5DC" stroke-width="1" />
    
    <circle cx="26" cy="26" r="14" fill="#1C1C1A" />
    <text x="26" y="30" font-size="10.5" font-weight="700" fill="#FFFFFF" text-anchor="middle">LF</text>
    <text x="48" y="22" font-size="11" font-weight="700" fill="#1C1C1A">Luís Ferraz</text>
    <text x="48" y="36" font-size="9" fill="#78716C">luisferraz@gmail.com</text>

    <!-- Menu Item 1: Workspaces -->
    <g transform="translate(14, 68)">
      <rect x="-6" y="-6" width="195" height="26" rx="6" fill="#F8F6F2" opacity="0.6" />
      <path d="M2 2h6v6H2zm8 0h6v6h-6zm-8 8h6v6H2zm8 0h6v6h-6z" stroke="#FF6515" stroke-width="1.2" fill="none" />
      <text x="24" y="11" font-size="10.5" font-weight="600" fill="#202124">Workspaces e Filiais</text>
    </g>

    <!-- Menu Item 2: Assinaturas & Cotas -->
    <g transform="translate(14, 98)">
      <path d="M7 2l-5 7h5l-1.5 6 6.5-8h-5z" fill="#F59E0B" />
      <text x="24" y="11" font-size="10.5" font-weight="600" fill="#202124">Assinaturas e Cotas</text>
    </g>

    <!-- Menu Item 3: Trocar de Conta / Google Auth -->
    <g transform="translate(14, 128)">
      <circle cx="6" cy="4" r="3" stroke="#64748B" stroke-width="1.2" fill="none" />
      <path d="M1 12c0-2.5 2.5-4 5-4s5 1.5 5 4" stroke="#64748B" stroke-width="1.2" fill="none" />
      <text x="24" y="11" font-size="10.5" font-weight="600" fill="#202124">Trocar de Conta / Google</text>
    </g>

    <line x1="10" y1="150" x2="205" y2="150" stroke="#EAE5DC" stroke-width="1" />

    <!-- Menu Item 4: Sair da Conta -->
    <g transform="translate(14, 168)">
      <path d="M7 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4m4-3l3-3-3-3m3 3H5" stroke="#DC2626" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <text x="24" y="10" font-size="10.5" font-weight="700" fill="#DC2626">Sair da Conta</text>
    </g>
  </g>
`;

// Overlay for State 3: Cursor Moving to + Novo Projeto
const buttonHoverOverlay = `
  <!-- Hover state for + Novo Projeto Button -->
  <g transform="translate(914, 46)">
    <rect x="2" y="0" width="114" height="32" rx="7" fill="#E0550D" filter="url(#btnShadow)" stroke="#FFFFFF" stroke-width="1.5" />
    <path d="M16 16h8M20 12v8" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" />
    <text x="32" y="20" font-size="11.5" font-weight="700" fill="#FFFFFF">Novo Projeto</text>
    <!-- Cursor Icon -->
    <g transform="translate(68, 22)">
      <polygon points="0,0 0,16 4,12 8,20 11,18 7,11 12,11" fill="#1C1C1A" stroke="#FFFFFF" stroke-width="1.2" />
    </g>
  </g>
`;

// Overlay for State 4: Cadastrar Novo Projeto Modal
const modalDialogOverlay = `
  <!-- Dimmed Backdrop -->
  <rect width="1200" height="760" fill="#000000" fill-opacity="0.55" />

  <!-- Modal Dialog Container -->
  <g transform="translate(290, 52)" filter="url(#cardShadow)">
    <rect width="620" height="656" rx="16" fill="#FFFFFF" stroke="#E0D8CB" stroke-width="1.5" />

    <!-- Header do Modal -->
    <g transform="translate(24, 20)">
      <rect width="36" height="36" rx="10" fill="#FFF2EB" border="1" stroke="#FFD9C7" />
      <path d="M12 11h12M12 17h12M12 23h8M21 21v6M24 24h-6" stroke="#FF6515" stroke-width="1.8" stroke-linecap="round" fill="none" />
      
      <text x="46" y="18" font-size="15" font-weight="800" fill="#111111">Cadastrar Novo Projeto</text>
      <text x="46" y="32" font-size="10.5" fill="#78716C">Inicie o cronograma do projeto, tire fotos e envie WhatsApp e parcelas Pix.</text>

      <!-- Fechar Modal (X) -->
      <circle cx="560" cy="18" r="12" fill="#F4EFEA" />
      <path d="M556 14l8 8m0-8l-8 8" stroke="#78716C" stroke-width="1.5" stroke-linecap="round" />
    </g>

    <line x1="24" y1="72" x2="596" y2="72" stroke="#EAE5DC" stroke-width="1" />

    <!-- Campo 1: Nome do Projeto & WhatsApp -->
    <g transform="translate(24, 86)">
      <!-- Nome do Projeto -->
      <g>
        <text x="0" y="10" font-size="10.5" font-weight="700" fill="#374151">Nome do Projeto *</text>
        <rect y="16" width="330" height="34" rx="8" fill="#FFFFFF" stroke="#FF6515" stroke-width="1.5" />
        <text x="12" y="38" font-size="11.5" font-weight="600" fill="#111111">Cozinha Gourmet &amp; Marcenaria Integrada</text>
      </g>

      <!-- WhatsApp do Cliente -->
      <g transform="translate(346, 0)">
        <text x="0" y="10" font-size="10.5" font-weight="700" fill="#374151">WhatsApp do Cliente *</text>
        <rect y="16" width="226" height="34" rx="8" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1" />
        <text x="12" y="38" font-size="11.5" font-weight="600" fill="#111111">+55 11 98765-4321</text>
        <circle cx="204" cy="33" r="7" fill="#10B981" />
        <path d="M202 33l2 2 3-3" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" fill="none" />
      </g>
    </g>

    <!-- Campo 2: Nome do Cliente -->
    <g transform="translate(24, 150)">
      <text x="0" y="10" font-size="10.5" font-weight="700" fill="#374151">Nome do Cliente *</text>
      <rect y="16" width="572" height="34" rx="8" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1" />
      <text x="12" y="38" font-size="11.5" font-weight="600" fill="#111111">José Almeida</text>
    </g>

    <!-- Campo 3: Descrição da Obra / Escopo -->
    <g transform="translate(24, 214)">
      <text x="0" y="10" font-size="10.5" font-weight="700" fill="#374151">Descrição da Obra / Escopo Técnico</text>
      <rect y="16" width="572" height="42" rx="8" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1" />
      <text x="12" y="34" font-size="10.5" fill="#4B5563">Execução Completa e Entrega Técnica de Projeto Decorativo e Instalação de Móveis Planejados</text>
      <text x="12" y="48" font-size="10" fill="#9CA3AF">MDF naval cinza sagrado, puxadores cava e ferragens amortecidas Blum.</text>
    </g>

    <!-- Campo 4: Workshop / Ambiente de Destino -->
    <g transform="translate(24, 286)">
      <text x="0" y="10" font-size="10.5" font-weight="700" fill="#374151">Ambiente / Workshop de Destino</text>
      <rect y="16" width="572" height="34" rx="8" fill="#F9FAFB" stroke="#D1D5DB" stroke-width="1" />
      <text x="12" y="38" font-size="11" font-weight="600" fill="#111111">Matriz SP - Sala de Projetos (Ativo) • Matriz SP</text>
      <path d="M552 31l4 4 4-4" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" fill="none" />
    </g>

    <!-- Campo 5: Modelo de Cronograma de 6 Etapas -->
    <g transform="translate(24, 350)">
      <div style="display:flex;">
        <text x="0" y="10" font-size="10.5" font-weight="700" fill="#374151">Modelo de Cronograma do Projeto</text>
        <rect x="210" y="-1" width="138" height="16" rx="4" fill="#FFF7ED" stroke="#FFEDD5" />
        <text x="216" y="11" font-size="9" font-weight="700" fill="#C2410C">6 ETAPAS PADRONIZADAS</text>
      </div>

      <!-- Grid de 6 Etapas Preview -->
      <g transform="translate(0, 18)">
        <rect width="572" height="114" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
        
        <!-- Etapa 1 -->
        <g transform="translate(12, 10)">
          <circle cx="8" cy="8" r="6" fill="#FF6515" />
          <text x="8" y="11" font-size="7.5" font-weight="800" fill="#FFFFFF" text-anchor="middle">1</text>
          <text x="18" y="11" font-size="9.5" font-weight="700" fill="#0F172A">1. Briefing &amp; Contrato</text>
          <text x="18" y="21" font-size="8.5" fill="#64748B">10% concluído</text>
        </g>

        <!-- Etapa 2 -->
        <g transform="translate(200, 10)">
          <circle cx="8" cy="8" r="6" fill="#3B82F6" />
          <text x="8" y="11" font-size="7.5" font-weight="800" fill="#FFFFFF" text-anchor="middle">2</text>
          <text x="18" y="11" font-size="9.5" font-weight="700" fill="#0F172A">2. Medição Técnica</text>
          <text x="18" y="21" font-size="8.5" fill="#64748B">25% concluído</text>
        </g>

        <!-- Etapa 3 -->
        <g transform="translate(390, 10)">
          <circle cx="8" cy="8" r="6" fill="#8B5CF6" />
          <text x="8" y="11" font-size="7.5" font-weight="800" fill="#FFFFFF" text-anchor="middle">3</text>
          <text x="18" y="11" font-size="9.5" font-weight="700" fill="#0F172A">3. Desenhos 3D</text>
          <text x="18" y="21" font-size="8.5" fill="#64748B">40% concluído</text>
        </g>

        <!-- Etapa 4 -->
        <g transform="translate(12, 44)">
          <circle cx="8" cy="8" r="6" fill="#F59E0B" />
          <text x="8" y="11" font-size="7.5" font-weight="800" fill="#FFFFFF" text-anchor="middle">4</text>
          <text x="18" y="11" font-size="9.5" font-weight="700" fill="#0F172A">4. Pré-montagem</text>
          <text x="18" y="21" font-size="8.5" fill="#64748B">60% concluído</text>
        </g>

        <!-- Etapa 5 -->
        <g transform="translate(200, 44)">
          <circle cx="8" cy="8" r="6" fill="#10B981" />
          <text x="8" y="11" font-size="7.5" font-weight="800" fill="#FFFFFF" text-anchor="middle">5</text>
          <text x="18" y="11" font-size="9.5" font-weight="700" fill="#0F172A">5. Instalação Final</text>
          <text x="18" y="21" font-size="8.5" fill="#64748B">80% concluído</text>
        </g>

        <!-- Etapa 6 -->
        <g transform="translate(390, 44)">
          <circle cx="8" cy="8" r="6" fill="#059669" />
          <text x="8" y="11" font-size="7.5" font-weight="800" fill="#FFFFFF" text-anchor="middle">6</text>
          <text x="18" y="11" font-size="9.5" font-weight="700" fill="#0F172A">6. Termo de Aceite</text>
          <text x="18" y="21" font-size="8.5" fill="#64748B">100% concluído</text>
        </g>

        <rect x="12" y="78" width="548" height="24" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.8" />
        <path d="M22 90h6M25 87v6" stroke="#FF6515" stroke-width="1.5" stroke-linecap="round" />
        <text x="34" y="93.5" font-size="9" font-weight="600" fill="#475569">Fluxo automático: cada avanço avisa o cliente no WhatsApp com fotos e link seguro</text>
      </g>
    </g>

    <!-- Campo 6: Valor do Contrato & Previsão -->
    <g transform="translate(24, 500)">
      <!-- Valor do Contrato -->
      <g>
        <text x="0" y="10" font-size="10.5" font-weight="700" fill="#374151">Valor do Contrato (R$) *</text>
        <rect y="16" width="276" height="34" rx="8" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1" />
        <text x="12" y="38" font-size="12" font-weight="700" fill="#111111">R$ 14.500,00</text>
      </g>

      <!-- Previsão de Entrega -->
      <g transform="translate(296, 0)">
        <text x="0" y="10" font-size="10.5" font-weight="700" fill="#374151">Previsão de Entrega *</text>
        <rect y="16" width="276" height="34" rx="8" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1" />
        <text x="12" y="38" font-size="11.5" font-weight="600" fill="#111111">15 Nov 2026</text>
        <!-- Calendar icon -->
        <rect x="246" y="26" width="14" height="14" rx="2" fill="none" stroke="#6B7280" stroke-width="1.2" />
        <line x1="246" y1="30" x2="260" y2="30" stroke="#6B7280" stroke-width="1" />
      </g>
    </g>

    <!-- Rodapé de Ações do Modal -->
    <g transform="translate(24, 580)">
      <line x1="0" y1="0" x2="572" y2="0" stroke="#E5E7EB" stroke-width="1" />

      <g transform="translate(0, 16)">
        <!-- Botão Cancelar -->
        <rect x="290" y="0" width="96" height="38" rx="8" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1" />
        <text x="338" y="23" font-size="11.5" font-weight="600" fill="#4B5563" text-anchor="middle">Cancelar</text>

        <!-- Botão Cadastrar e Abrir Projeto -->
        <rect x="396" y="0" width="176" height="38" rx="8" fill="url(#primaryGrad)" filter="url(#btnShadow)" />
        <path d="M410 19h8M414 15v8" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" />
        <text x="424" y="23.5" font-size="11.5" font-weight="700" fill="#FFFFFF">+ Cadastrar e Abrir Projeto</text>
      </g>
    </g>
  </g>
`;

async function main() {
  const tmpDir = path.resolve('/tmp/gif-frames');
  fs.mkdirSync(tmpDir, { recursive: true });

  const states = [
    { name: '01_dashboard', overlay: '', count: 6 }, // 1.8s
    { name: '02_menu', overlay: profileMenuOverlay, count: 5 }, // 1.5s
    { name: '03_hover', overlay: buttonHoverOverlay, count: 3 }, // 0.9s
    { name: '04_modal', overlay: modalDialogOverlay, count: 8 }, // 2.4s
  ];

  console.log('Rendering frames with sharp...');
  let frameIndex = 0;

  for (const state of states) {
    const fullSvg = `${baseSvgBody}\n${state.overlay}\n</svg>`;
    const svgBuffer = Buffer.from(fullSvg);
    const pngBuffer = await sharp(svgBuffer, { density: 144 })
      .resize(960)
      .png({ quality: 90 })
      .toBuffer();

    for (let c = 0; c < state.count; c++) {
      const filename = path.join(tmpDir, `frame_${String(frameIndex).padStart(4, '0')}.png`);
      fs.writeFileSync(filename, pngBuffer);
      frameIndex++;
    }
  }

  console.log(`Rendered ${frameIndex} frames. Building animated GIF with ffmpeg...`);
  const outputGif = path.resolve('public/bomprojeto-demo.gif');
  
  // Use ffmpeg palettegen and paletteuse for crystal clear 256-color GIF
  const palettePng = path.join(tmpDir, 'palette.png');
  execSync(`ffmpeg -y -framerate 4 -i "${tmpDir}/frame_%04d.png" -vf "palettegen=max_colors=256:stats_mode=diff" "${palettePng}"`);
  execSync(`ffmpeg -y -framerate 4 -i "${tmpDir}/frame_%04d.png" -i "${palettePng}" -lavfi "paletteuse=dither=bayer:bayer_scale=3" "${outputGif}"`);

  console.log(`Generated GIF successfully: ${outputGif}`);
  const stats = fs.statSync(outputGif);
  console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
