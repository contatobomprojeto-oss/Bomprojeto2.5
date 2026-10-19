/**
 * Configuração do Vídeo Demonstrativo / Explicativo da Plataforma
 * 
 * Para atualizar o vídeo:
 * Basta colar o link do seu vídeo gravado (YouTube, Vimeo, Loom ou URL direta de MP4)
 * na propriedade `videoUrl` abaixo.
 */
export const DEMO_VIDEO_CONFIG = {
  title: 'Como Funciona o BOMProjeto na Prática',
  subtitle: 'Acompanhamento em tempo real, etapas com fotos da bancada e notificações automáticas no WhatsApp para o seu cliente.',
  duration: '1 a 3 min',
  // Link oficial do vídeo Vimeo:
  videoUrl: 'https://vimeo.com/1230500473?share=copy&fl=sv&fe=ci', 
  whatsappSupportNumber: '5511976543210',
  whatsappMessage: 'Olá! Assisti a apresentação do BOMProjeto e gostaria de tirar algumas dúvidas.'
};

/**
 * Converte URLs convencionais de vídeo (YouTube, Vimeo, Loom) para o formato embed adequado
 */
export function getEmbedVideoUrl(url?: string, autoplay: boolean = true): string | null {
  if (!url || !url.trim()) return null;
  const clean = url.trim();

  // YouTube (watch, youtu.be, shorts, embed)
  if (clean.includes('youtube.com/watch')) {
    const videoId = new URL(clean).searchParams.get('v');
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0` : clean;
  }
  if (clean.includes('youtu.be/')) {
    const videoId = clean.split('youtu.be/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0` : clean;
  }
  if (clean.includes('youtube.com/shorts/')) {
    const videoId = clean.split('youtube.com/shorts/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0` : clean;
  }
  if (clean.includes('youtube.com/embed/')) {
    return clean.includes('autoplay') ? clean : `${clean}?autoplay=${autoplay ? 1 : 0}&rel=0`;
  }

  // Vimeo
  if (clean.includes('vimeo.com')) {
    const vimeoMatch = clean.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    const vimeoId = vimeoMatch ? vimeoMatch[1] : clean.split('vimeo.com/')[1]?.split('?')[0]?.replace(/\//g, '');
    if (vimeoId) {
      return `https://player.vimeo.com/video/${vimeoId}?autoplay=${autoplay ? 1 : 0}&title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`;
    }
  }

  // Loom
  if (clean.includes('loom.com/share/')) {
    const loomId = clean.split('loom.com/share/')[1]?.split('?')[0];
    return loomId ? `https://www.loom.com/embed/${loomId}?autoplay=${autoplay ? 1 : 0}` : clean;
  }

  return clean;
}
