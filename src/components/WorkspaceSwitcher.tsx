import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  Check, 
  Sparkles, 
  Layers, 
  Hammer,
  Shield,
  Settings,
  ArrowUpRight
} from 'lucide-react';
import { Workspace, SubscriptionPlan } from '../types';

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  onSelectWorkspace: (id: string) => void;
  onOpenWorkspaceModal: () => void;
  plan: SubscriptionPlan;
}

const getSegmentIcon = (segment: string) => {
  switch (segment) {
    case 'marketing_agency': return '🚀';
    case 'ai_agency': return '🤖';
    case 'media_buyer': return '🎯';
    case 'projetos': return '⚡';
    default: return '🚀';
  }
};

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onOpenWorkspaceModal,
  plan
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const maxWorkspaces = plan === 'escala' ? 6 : plan === 'start' ? 3 : 1;
  const isLimitReached = workspaces.length >= maxWorkspaces;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="workspace-switcher-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] hover:bg-[#F1F5F9] text-left transition-colors cursor-pointer"
        title="Alternar ambiente ou filial"
      >
        <div className="w-6 h-6 rounded-lg bg-white border border-[#EAECEF] flex items-center justify-center shrink-0 font-medium text-xs shadow-2xs">
          {getSegmentIcon(currentWorkspace?.segment || 'marketing_agency')}
        </div>

        <div className="flex flex-col min-w-0 pr-1 max-w-[140px] sm:max-w-[190px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0F172A]">
              {currentWorkspace?.type === 'matriz' ? 'Matriz' : currentWorkspace?.type === 'filial' ? 'Filial' : 'Segmento'}
            </span>
            <span className="text-[10px] text-[#94A3B8] hidden md:inline truncate">
              • {currentWorkspace?.city?.split('-')[0]?.trim() || 'SP'}
            </span>
          </div>
          <span className="font-semibold text-xs text-[#0F172A] truncate leading-tight">
            {currentWorkspace?.name || 'Nexus Performance & Automações'}
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform shrink-0 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-[#EAECEF] shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header with Plan Quota */}
          <div className="p-3.5 bg-[#F8F9FA] border-b border-[#EAECEF]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Ambientes & Filiais</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#0F172A] border border-[#EAECEF]">
                {plan === 'escala' ? 'Plano Escala' : 'Plano Start'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-2">
              <span>Capacidade do Plano:</span>
              <span className="font-semibold text-[#0F172A]">
                {workspaces.length} de {maxWorkspaces} Workspaces
              </span>
            </div>

            {/* Micro Quota Bar */}
            <div className="w-full h-1.5 rounded-full bg-[#EAECEF] overflow-hidden mt-1.5">
              <div 
                className={`h-full ${isLimitReached ? 'bg-amber-500' : 'bg-[#111827]'}`}
                style={{ width: `${Math.min(100, (workspaces.length / maxWorkspaces) * 100)}%` }}
              />
            </div>
          </div>

          {/* List of Workspaces */}
          <div className="p-1.5 max-h-64 overflow-y-auto space-y-1">
            {workspaces.map((ws) => {
              const isSelected = ws.id === currentWorkspace?.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    onSelectWorkspace(ws.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-[#F1F5F9] text-[#0F172A]' 
                      : 'hover:bg-[#F8F9FA] text-[#475569]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{getSegmentIcon(ws.segment)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#0F172A]' : 'text-[#334155]'}`}>
                          {ws.name}
                        </p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white border border-[#EAECEF] text-[#64748B] shrink-0 font-medium">
                          {ws.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] truncate">
                        {ws.segmentLabel} • {ws.city || 'SP'}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-[#0F172A] shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Actions Footer */}
          <div className="p-2.5 bg-[#F8F9FA] border-t border-[#EAECEF] flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenWorkspaceModal();
              }}
              className="fleetly-btn-primary w-full py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {isLimitReached 
                  ? 'Gerenciar / Upgrade Workspaces' 
                  : '+ Cadastrar Novo Workspace'}
              </span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
