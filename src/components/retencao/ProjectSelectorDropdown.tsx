import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  ChevronDown, 
  Check, 
  FolderKanban, 
  User, 
  Building2, 
  X,
  Sparkles,
  Phone
} from 'lucide-react';
import { Project } from '../../types';

interface ProjectSelectorDropdownProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
}

export const ProjectSelectorDropdown: React.FC<ProjectSelectorDropdownProps> = ({
  projects,
  selectedProject,
  onSelectProject
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Foco no input ao abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredProjects = projects.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.clientName?.toLowerCase().includes(term) ||
      p.code?.toLowerCase().includes(term) ||
      p.title?.toLowerCase().includes(term) ||
      p.unit?.toLowerCase().includes(term) ||
      p.clientPhone?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'concluido':
        return { label: 'Concluído', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'atencao':
        return { label: 'Atenção', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'proposta_aprovada':
        return { label: 'Aprovado', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      default:
        return { label: 'Em Andamento', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Botão Gatilho do Dropdown */}
      <button
        type="button"
        id="btn-retencao-select-project"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full bg-[#F8F9FA] hover:bg-white border border-[#EAECEF] hover:border-[#CBD5E1] rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-150 flex items-center justify-between gap-3 shadow-xs group cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar com Código do Projeto */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#F1F5F9] text-[#0F172A] border border-[#EAECEF] flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <FolderKanban className="w-5 h-5 text-[#0F172A]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Projeto / Cliente Ativo
              </span>
              {selectedProject && (
                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${getStatusBadge(selectedProject.status).color}`}>
                  {getStatusBadge(selectedProject.status).label}
                </span>
              )}
            </div>

            {selectedProject ? (
              <div className="flex items-baseline gap-2 truncate mt-0.5">
                <h3 className="text-sm sm:text-base font-bold text-[#0F172A] truncate">
                  {selectedProject.clientName}
                </h3>
                <span className="text-xs font-mono font-semibold text-[#64748B] shrink-0">
                  {selectedProject.code}
                </span>
                <span className="text-xs text-[#94A3B8] hidden md:inline truncate">
                  • {selectedProject.title}
                </span>
              </div>
            ) : (
              <p className="text-sm font-medium text-[#64748B] mt-0.5">
                Selecione um projeto para carregar a análise preditiva...
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[11px] text-[#94A3B8]">Isolamento Multi-tenant</span>
            <span className="text-xs font-semibold text-[#0F172A]">
              {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-white group-hover:bg-[#F1F5F9] text-[#64748B] group-hover:text-[#0F172A] flex items-center justify-center transition-colors border border-[#EAECEF]">
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Menu Suspenso Pesquisável */}
      {isOpen && (
        <div 
          className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white rounded-2xl border border-[#EAECEF] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="listbox"
        >
          {/* Campo de Busca */}
          <div className="p-3 border-b border-[#E8EAED] bg-[#FAF8F5]">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#80868B] absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Pesquisar por cliente, código (#PROJ), ambiente ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-white rounded-xl border border-[#DADCE0] focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 text-xs sm:text-sm text-[#202124] placeholder-[#80868B]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 p-1 rounded-md text-[#80868B] hover:text-[#202124] hover:bg-[#F1F3F4] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#80868B] mt-1.5 px-1">
              <span>Selecione para carregar métricas independentes</span>
              <span>{filteredProjects.length} encontrados</span>
            </div>
          </div>

          {/* Lista de Projetos com Rolagem */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[#F1F3F4] p-1.5">
            {filteredProjects.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#80868B] space-y-1">
                <Search className="w-6 h-6 text-[#DADCE0] mx-auto mb-1" />
                <p className="font-semibold text-[#202124]">Nenhum projeto encontrado</p>
                <p>Tente buscar por outro termo ou nome de cliente.</p>
              </div>
            ) : (
              filteredProjects.map((proj) => {
                const isSelected = selectedProject?.id === proj.id;
                const statusInfo = getStatusBadge(proj.status);

                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      onSelectProject(proj);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#FFD9C2]'
                        : 'hover:bg-[#FAF8F5] text-[#202124]'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isSelected 
                          ? 'bg-[#EA580C] text-white' 
                          : 'bg-[#F1F3F4] text-[#5F6368]'
                      }`}>
                        {proj.clientName ? proj.clientName.slice(0, 2).toUpperCase() : 'PR'}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-[#202124] truncate">
                            {proj.clientName}
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-[#5F6368]">
                            {proj.code}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[#5F6368] mt-0.5 truncate">
                          <span className="truncate">{proj.title}</span>
                          {proj.unit && (
                            <span className="hidden sm:inline text-[#80868B] truncate">
                              • {proj.unit}
                            </span>
                          )}
                          {proj.totalValue > 0 && (
                            <span className="font-semibold text-emerald-800 shrink-0">
                              • R$ {proj.totalValue.toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#80868B] hover:text-[#EA580C] font-medium hidden sm:inline">
                          Selecionar
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
