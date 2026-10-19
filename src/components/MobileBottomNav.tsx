import React from 'react';
import { 
  FolderKanban, 
  Layers, 
  Plus, 
  MessageSquare, 
  Menu,
  BellRing
} from 'lucide-react';
import { ActiveView, SupportAlert } from '../types';

interface MobileBottomNavProps {
  currentView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenNewProject: () => void;
  onToggleMobileMenu: () => void;
  supportAlerts?: SupportAlert[];
  whatsappConnected?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onSelectView,
  onOpenNewProject,
  onToggleMobileMenu,
  supportAlerts = [],
  whatsappConnected = false
}) => {
  const unreadAlerts = supportAlerts.filter(a => !a.isRead).length;

  return (
    <nav 
      id="mobile-bottom-navigation"
      aria-label="Navegação móvel"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8EAED] md:hidden select-none pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="grid grid-cols-5 h-16 items-center px-1 max-w-md mx-auto">
        
        {/* Item 1: Início / Dashboard */}
        <button
          type="button"
          onClick={() => onSelectView('dashboard')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
            currentView === 'dashboard'
              ? 'text-[#F97316] font-semibold'
              : 'text-[#5F6368] hover:text-[#202124]'
          }`}
        >
          <div className="relative">
            <FolderKanban className="w-5 h-5" />
            {currentView === 'dashboard' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#F97316]" />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-tight tracking-tight">Início</span>
        </button>

        {/* Item 2: Projetos & Finanças */}
        <button
          type="button"
          onClick={() => onSelectView('projects_finance')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
            currentView === 'projects_finance' || currentView === 'project_detail'
              ? 'text-[#F97316] font-semibold'
              : 'text-[#5F6368] hover:text-[#202124]'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            {(currentView === 'projects_finance' || currentView === 'project_detail') && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#F97316]" />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-tight tracking-tight">Projetos</span>
        </button>

        {/* Item 3: + Novo Projeto (Central Action Button) */}
        <div className="flex items-center justify-center -mt-4">
          <button
            type="button"
            onClick={onOpenNewProject}
            id="mobile-nav-btn-new-project"
            aria-label="Cadastrar novo projeto"
            className="w-12 h-12 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white shadow-lg shadow-orange-500/30 flex items-center justify-center transition-transform active:scale-90 border-2 border-white cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Item 4: WhatsApp & IA */}
        <button
          type="button"
          onClick={() => onSelectView('ai_settings')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
            currentView === 'ai_settings' || currentView === 'whatsapp_simulator'
              ? 'text-[#F97316] font-semibold'
              : 'text-[#5F6368] hover:text-[#202124]'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {whatsappConnected && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#188038] ring-2 ring-white" />
            )}
            {(currentView === 'ai_settings' || currentView === 'whatsapp_simulator') && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#F97316]" />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-tight tracking-tight">WhatsApp</span>
        </button>

        {/* Item 5: Menu Lateral Completo */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl text-[#5F6368] hover:text-[#202124] transition-all active:scale-95 cursor-pointer"
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            {unreadAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#D93025] ring-2 ring-white animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-tight tracking-tight">Menu</span>
        </button>

      </div>
    </nav>
  );
};
