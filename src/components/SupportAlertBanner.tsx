import React from 'react';
import { 
  AlertCircle, 
  MessageSquare, 
  X, 
  ExternalLink, 
  Phone, 
  Clock, 
  UserCheck,
  CheckCircle2,
  BellRing
} from 'lucide-react';
import { SupportAlert } from '../types';

interface SupportAlertBannerProps {
  alert: SupportAlert;
  onOpenWhatsApp: (alert: SupportAlert) => void;
  onOpenProject: (projectId: string) => void;
  onDismiss: (alertId: string) => void;
}

export const SupportAlertBanner: React.FC<SupportAlertBannerProps> = ({
  alert,
  onOpenWhatsApp,
  onOpenProject,
  onDismiss
}) => {
  return (
    <div 
      id="support-alert-visual-banner"
      className="bg-linear-to-r from-[#7a2307] via-[#9f3c16] to-[#b3471c] text-white px-4 py-3.5 sm:px-6 shadow-xl border-b-2 border-amber-300/40 relative z-40 animate-in slide-in-from-top duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Indicator & Message */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="relative shrink-0 mt-0.5 sm:mt-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/30 shadow-inner">
              <BellRing className="w-5 h-5 animate-bounce text-amber-200" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-[#9f3c16] shadow-2xs">
                🚨 Alerta do Sistema
              </span>
              <span className="text-xs font-semibold text-amber-200">
                {alert.timestamp} ({alert.date})
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2 pt-0.5">
              <h3 className="font-headline font-black text-sm sm:text-base text-white tracking-tight">
                {alert.message}
              </h3>
              <span className="text-xs text-amber-100 font-medium truncate">
                — {alert.clientName} (<strong className="font-mono text-white">{alert.projectCode}</strong>)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
          <button
            id="btn-alert-whatsapp"
            onClick={() => onOpenWhatsApp(alert)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Atender no WhatsApp</span>
          </button>

          <button
            id="btn-alert-open-os"
            onClick={() => onOpenProject(alert.projectId)}
            className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 border border-white/20 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver OS</span>
          </button>

          <button
            id="btn-alert-dismiss"
            onClick={() => onDismiss(alert.id)}
            className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Fechar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
