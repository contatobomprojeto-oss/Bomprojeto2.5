import React, { useState } from 'react';
import { X, Receipt, Check, DollarSign, Plus, Trash2 } from 'lucide-react';
import { Project, Installment } from '../types';
import { validateFinancialValue, validateInstallmentsArray } from '../utils/apiValidator';

interface EditBudgetModalProps {
  project: Project;
  onClose: () => void;
  onSave: (totalValue: number, installments: Installment[]) => void;
}

export const EditBudgetModal: React.FC<EditBudgetModalProps> = ({
  project,
  onClose,
  onSave
}) => {
  const [totalValue, setTotalValue] = useState<number>(project.totalValue || 9533);
  const [error, setError] = useState<string | null>(null);
  const [installments, setInstallments] = useState<Installment[]>(
    project.installments && project.installments.length > 0
      ? JSON.parse(JSON.stringify(project.installments))
      : [
          {
            number: 1,
            label: '1ª Parcela (50% Entrada)',
            percentage: 50,
            amount: Number(((project.totalValue || 9533) / 2).toFixed(2)),
            status: 'paid',
            dueDate: '19/09/2026',
            paidDate: '19/09/2026'
          },
          {
            number: 2,
            label: '2ª Parcela (50% Conclusão)',
            percentage: 50,
            amount: Number(((project.totalValue || 9533) / 2).toFixed(2)),
            status: 'pending',
            dueDate: '19/10/2026'
          }
        ]
  );
  const [notes, setNotes] = useState('Reajuste de ferragens ou itens sob medida conforme caderno técnico.');

  const handleTotalChange = (newTotal: number) => {
    setError(null);
    setTotalValue(newTotal);
    // Recalculate amounts proportional to percentage
    setInstallments(prev =>
      prev.map(inst => ({
        ...inst,
        amount: Number(((newTotal * (inst.percentage || 50)) / 100).toFixed(2))
      }))
    );
  };

  const handleInstallmentAmountChange = (index: number, newAmount: number) => {
    setError(null);
    setInstallments(prev => {
      const updated = [...prev];
      updated[index].amount = newAmount;
      return updated;
    });
  };

  const handleInstallmentDueDateChange = (index: number, newDate: string) => {
    setError(null);
    setInstallments(prev => {
      const updated = [...prev];
      updated[index].dueDate = newDate;
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const valCheck = validateFinancialValue(totalValue, 'Valor Total do Orçamento', { min: 1, allowZero: false });
    if (!valCheck.isValid) {
      setError(valCheck.error || 'Valor total do orçamento inválido.');
      return;
    }

    const instCheck = validateInstallmentsArray(installments, valCheck.cleanValue!);
    if (!instCheck.isValid) {
      setError(instCheck.error || 'Erro nas parcelas do orçamento.');
      return;
    }

    onSave(valCheck.cleanValue!, installments);
    onClose();
  };

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
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#0F172A] tracking-tight">
                Editar Orçamento do Projeto
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64748B]">
                OS #{project.code} • {project.clientName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Total Value Input */}
          <div>
            <label className="block font-bold text-[#334155] mb-1">
              Valor Total Aprovado (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#64748B]">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                required
                value={totalValue}
                onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-white focus:outline-hidden focus:border-[#FF6515] focus:ring-1 focus:ring-[#FF6515] font-semibold text-base text-[#0F172A]"
              />
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">
              As parcelas são recalculadas proporcionalmente.
            </p>
          </div>

          {/* Installments Table */}
          <div className="space-y-2">
            <label className="block font-bold text-[#334155]">
              Cronograma de Parcelas
            </label>

            <div className="space-y-2.5">
              {installments.map((inst, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A]">
                      {inst.label}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      inst.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {inst.status === 'paid' ? 'Liquidada' : 'Pendente'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[#64748B] block mb-0.5 font-medium">Valor (R$)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={inst.amount}
                        onChange={(e) => handleInstallmentAmountChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] focus:outline-hidden focus:border-[#FF6515]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748B] block mb-0.5 font-medium">Vencimento</span>
                      <input
                        type="text"
                        value={inst.dueDate}
                        onChange={(e) => handleInstallmentDueDateChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] focus:outline-hidden focus:border-[#FF6515]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-[#334155] mb-1">
              Observações do Reajuste
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#E2E8F0] bg-white focus:outline-hidden focus:border-[#FF6515] focus:ring-1 focus:ring-[#FF6515] text-xs text-[#0F172A] resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <span className="font-bold text-red-800">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAECEF]">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] font-semibold text-[#475569] text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-[#0F172A] hover:bg-black text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Orçamento</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
