import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Sparkles, 
  CheckCircle2, 
  Smartphone, 
  ArrowRight, 
  Clock, 
  Film, 
  ShieldCheck,
  MessageCircle,
  Layers,
  DollarSign
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { DEMO_VIDEO_CONFIG, getEmbedVideoUrl } from '../config/videoConfig';

interface VideoExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignup?: () => void;
  videoUrl?: string;
}

export const VideoExplainerModal: React.FC<VideoExplainerModalProps> = ({
  isOpen,
  onClose,
  onOpenSignup,
  videoUrl = DEMO_VIDEO_CONFIG.videoUrl
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const embedUrl = getEmbedVideoUrl(videoUrl);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset playing state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartPlaying = () => {
    setIsPlaying(true);
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(DEMO_VIDEO_CONFIG.whatsappMessage);
    window.open(`https://wa.me/${DEMO_VIDEO_CONFIG.whatsappSupportNumber}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/75 backdrop-blur-md transition-all">
      <div 
        className="relative w-full max-w-4xl bg-[#1C1C1A] text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10 bg-[#242422]/90">
          <div className="flex items-center gap-3">
            <BrandLogo variant="horizontal" size="sm" theme="dark" />
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF6515]/20 border border-[#FF6515]/40 text-[#FF6515] text-[11px] font-bold tracking-wide uppercase">
              <Film className="w-3 h-3" />
              <span>Vídeo Explicativo</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar vídeo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 sm:p-7 space-y-6">
          
          {/* Title and Subtitle */}
          <div className="space-y-1.5 text-center max-w-2xl mx-auto">
            <h2 className="font-headline font-black text-xl sm:text-2xl text-white tracking-tight">
              {DEMO_VIDEO_CONFIG.title}
            </h2>
            <p className="font-caption text-xs sm:text-sm text-white/70 leading-relaxed">
              {DEMO_VIDEO_CONFIG.subtitle}
            </p>
          </div>

          {/* Video Container (16:9 Aspect Ratio) */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/90 border border-white/15 shadow-inner group">
            {embedUrl && isPlaying ? (
              // Embeded Video Player (YouTube / Vimeo / Loom or Direct Video)
              embedUrl.endsWith('.mp4') || embedUrl.endsWith('.webm') ? (
                <video 
                  src={embedUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-cover"
                />
              ) : (
                <iframe
                  src={embedUrl}
                  title="Demonstração BOMProjeto"
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                  allowFullScreen
                />
              )
            ) : (
              // Video Cover / Placeholder with Play Button
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-t from-black via-[#1C1C1A]/90 to-[#2A2A26] overflow-hidden">
                {/* Background Visual Texture */}
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                  <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#FF6515] rounded-full blur-3xl" />
                  <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
                </div>

                {/* Central Play Action */}
                <div className="relative z-10 space-y-4 max-w-md">
                  <button
                    onClick={handleStartPlaying}
                    className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FF6515] hover:bg-[#E0550D] text-white flex items-center justify-center shadow-lg shadow-[#FF6515]/40 hover:scale-110 active:scale-95 transition-all cursor-pointer group"
                    aria-label="Iniciar reprodução do vídeo"
                  >
                    <div className="absolute inset-0 rounded-full bg-[#FF6515] animate-ping opacity-30 group-hover:opacity-60" />
                    <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white ml-1 relative z-10" />
                  </button>

                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-xs border border-white/15">
                      <Clock className="w-3.5 h-3.5 text-[#FF6515]" />
                      <span>Duração aproximada: {DEMO_VIDEO_CONFIG.duration}</span>
                    </span>
                    <h3 className="font-bold text-base sm:text-lg text-white">
                      Clique para assistir à demonstração
                    </h3>
                    <p className="text-xs text-white/60">
                      Entenda como funciona o envio de fotos de etapas, a linha do tempo do cliente e as cobranças de parcelas.
                    </p>
                  </div>

                  {/* Informative notice for when the user is about to paste their link */}
                  {!embedUrl && (
                    <div className="pt-2">
                      <span className="inline-block text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                        ℹ️ Espaço reservado para o seu vídeo gravado (YouTube, Vimeo, Loom ou MP4).
                      </span>
                    </div>
                  )}
                </div>

                {/* Player Bottom Control Bar Fake UI */}
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-xs text-white/60">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleStartPlaying}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                    >
                      <Play className="w-4 h-4 fill-white" />
                    </button>
                    <span className="font-mono text-[11px]">00:00 / 03:30</span>
                  </div>
                  <div className="flex-1 mx-4 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="w-[15%] h-full bg-[#FF6515] rounded-full" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-white/80">
                    <span>1080p HD</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Key 3 Pillars Explained */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-[#FF6515] flex items-center justify-center font-bold">
                <Smartphone className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-white">1. Portal do Cliente</h4>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Linha do tempo sem necessidade de login complexo. Seu cliente acompanha fotos da bancada e cronograma.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-white">2. Notificações no WhatsApp</h4>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Mensagens prontas geradas para cada fase: início, corte, acabamento e aviso de entrega programada.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-white">3. Cobranças & Pix</h4>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Controle de parcelas e envio de chave Pix cadastrada direto para o WhatsApp do cliente antes da entrega.
              </p>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-white/60 text-center sm:text-left">
              Ficou com alguma dúvida ou deseja personalizar para sua agência/operação?
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleOpenWhatsApp}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tirar Dúvidas</span>
              </button>

              {onOpenSignup && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenSignup();
                  }}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#FF6515] hover:bg-[#E0550D] text-white text-xs font-bold shadow-md shadow-[#FF6515]/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Experimentar Agora</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
