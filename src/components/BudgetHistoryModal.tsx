import React from 'react';
import { X, History, CheckCircle2, Clock, ArrowDownLeft, ShieldCheck } from 'lucide-react';
import { Project } from '../types';
import { useFinancialPrivacy } from '../hooks/useFinancialPrivacy';
import { FinancialPrivacyToggle } from './FinancialPrivacyToggle';

interface BudgetHistoryModalProps {
  project: Project;
  onClose: () => void;
}

export const BudgetHistoryModal: React.FC<BudgetHistoryModalProps> = ({
  project,
  onClose
}) => {
  const { hideFinancials, blurClass } = useFinancialPrivacy();
  const halfVal = Number(((project.totalValue || 9533) / 2).toFixed(2));
  const paidInst = project.installments?.find(i => i.status === 'paid');
  const pendingInst = project.installments?.find(i => i.status === 'pending');

  const historyEntries = [
    {
      id: 'h-1',
      date: '19/09/2026 às 11:20:44',
      type: 'credit',
      title: 'Liquidação Pix Recebida (Entrada 50%)',
      description: `Autenticação ${paidInst?.authCode || 'PX-992384'}. Baixa bancária automática via Open Finance / Banco Inter.`,
      amount: paidInst?.amount || halfVal,
      status: 'confirmed'
    },
    {
      id: 'h-2',
      date: '19/09/2026 às 09:15:00',
      type: 'contract',
      title: 'Orçamento Aprovado & Contrato Assinado',
      description: `Orçamento comercial formalizado para ${project.clientName}. Total aprovado: R$ ${project.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      amount: project.totalValue,
      status: 'confirmed'
    },
    {
      id: 'h-3',
      date: pendingInst?.dueDate || '19/10/2026',
      type: 'scheduled',
      title: 'Previsão de Recebimento (2ª Parcela 50%)',
      description: 'Programada para liquidação via Pix dinâmico na entrega técnica do projeto.',
      amount: pendingInst?.amount || halfVal,
      status: 'pending'
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#EAECEF] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#EAECEF] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#F97316] border border-orange-100 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#0F172A] tracking-tight">
                Histórico & Auditoria Financeira
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64748B]">
                OS #{project.code} • {project.clientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FinancialPrivacyToggle size="xs" variant="amber" />
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-4 sm:p-6 space-y-3.5 max-h-[65vh] overflow-y-auto text-xs">
          
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#64748B] uppercase font-bold block">Status Contábil</span>
              <span className="font-bold text-[#0F172A]">50% Liquidado • 50% em Carteira</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#64748B] uppercase font-bold block">Total da OS</span>
              <span className={`font-headline font-black text-sm text-[#FF6515] ${blurClass}`}>
                R$ {project.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {historyEntries.map((item) => (
              <div key={item.id} className="p-3.5 rounded-2xl border border-[#EAECEF] bg-white space-y-1 relative shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.type === 'credit' ? (
                      <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-4 h-4" />
                      </div>
                    ) : item.type === 'scheduled' ? (
                      <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-[#0F172A]">{item.title}</h4>
                      <p className="text-[10px] text-[#64748B]">{item.date}</p>
                    </div>
                  </div>

                  <span className={`font-bold font-headline text-xs ${
                    item.type === 'credit' ? 'text-emerald-700' : 'text-[#0F172A]'
                  } ${blurClass}`}>
                    {item.type === 'credit' ? '+' : ''} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <p className="text-[11px] text-[#475569] pl-9">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-[#EAECEF] flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
