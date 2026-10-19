import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  CheckCircle2, 
  Archive, 
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { Project } from '../types';

interface DeleteProjectConfirmationModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onConfirmDelete: (projectId: string) => Promise<boolean | void> | void;
}

export const DeleteProjectConfirmationModal: React.FC<DeleteProjectConfirmationModalProps> = ({
  isOpen,
  project,
  onClose,
  onConfirmDelete
}) => {
  const [typedCode, setTypedCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedCode('');
      setErrorMessage('');
      setIsDeleting(false);
    }
  }, [isOpen, project?.id]);

  if (!isOpen || !project) return null;

  const targetCode = (project.code || '').trim();
  const isCodeMatching = typedCode.trim().toUpperCase() === targetCode.toUpperCase();

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCodeMatching || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage('');

    try {
      await onConfirmDelete(project.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao mover projeto para a aba de exclusão.');
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#EAECEF] space-y-5 animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#EAECEF] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-[#0F172A] tracking-tight">
                  Excluir Projeto
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Lixeira
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                O projeto será movido para a área de exclusão segura.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Context Summary Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-[#0F172A] bg-white px-2 py-0.5 rounded-md border border-slate-200">
              OS: {project.code}
            </span>
            <span className="text-[11px] font-medium text-[#64748B]">
              Etapa: <strong className="text-[#0F172A]">{project.currentStage}</strong>
            </span>
          </div>
          <h4 className="font-bold text-sm text-[#0F172A] truncate">
            {project.title}
          </h4>
          <p className="text-xs text-[#475569] truncate">
            Cliente: {project.clientName} {project.clientPhone ? `• ${project.clientPhone}` : ''}
          </p>
        </div>

        {/* Explanatory Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>O que acontece ao excluir este projeto?</span>
          </div>
          <ul className="text-[11px] text-amber-900/90 space-y-1 pl-5 list-disc leading-relaxed">
            <li>
              O projeto <strong>não será apagado de forma definitiva</strong> do sistema.
            </li>
            <li>
              Ele <strong>deixará de aparecer</strong> nas listagens de projetos <em>em andamento</em> ou <em>concluídos</em> e dos relatórios ativos.
            </li>
            <li>
              Ele será movido para a <strong>Aba de Exclusão (Lixeira)</strong>, onde perfis CEO e Administrador podem consultar o histórico ou restaurá-lo a qualquer momento.
            </li>
          </ul>
        </div>

        {/* Form with typed project code confirmation */}
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#0F172A]">
              Para confirmar, digite exatamente o código do projeto (<span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{targetCode}</span>):
            </label>
            
            <input
              type="text"
              autoFocus
              required
              disabled={isDeleting}
              value={typedCode}
              onChange={(e) => setTypedCode(e.target.value)}
              placeholder={`Digite ${targetCode}`}
              className="w-full p-3 rounded-xl border border-[#E2E8F0] bg-white focus:bg-white text-sm font-mono text-[#0F172A] focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all uppercase tracking-wider"
            />

            <div className="flex items-center justify-between text-xs pt-0.5">
              {isCodeMatching ? (
                <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Código conferido com sucesso. Exclusão autorizada.
                </span>
              ) : (
                <span className="text-[11px] text-[#64748B]">
                  Digite o código idêntico para habilitar o botão de exclusão.
                </span>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EAECEF]">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#475569] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!isCodeMatching || isDeleting}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
                isCodeMatching && !isDeleting
                  ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Movendo para Exclusão...' : 'Confirmar & Mover para Exclusão'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default DeleteProjectConfirmationModal;
