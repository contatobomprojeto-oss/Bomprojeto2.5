import React, { useState } from 'react';
import { X, CheckCircle2, Copy, Download, ShieldCheck, Building2, User, Check } from 'lucide-react';
import { Project, Installment } from '../types';
import { useFinancialPrivacy } from '../hooks/useFinancialPrivacy';
import { FinancialPrivacyToggle } from './FinancialPrivacyToggle';

interface ProofPaymentModalProps {
  project: Project;
  installment: Installment;
  onClose: () => void;
}

export const ProofPaymentModal: React.FC<ProofPaymentModalProps> = ({
  project,
  installment,
  onClose
}) => {
  const { hideFinancials, blurClass } = useFinancialPrivacy();
  const [copied, setCopied] = useState(false);

  const authCode = installment.authCode || 'PX-992384-BR';
  const e2eId = `E0041696820260919${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  const handleCopy = () => {
    const companyName = project.workshopName || 'Empresa Contratada';
    const companyCnpj = project.companyCnpj ? ` (CNPJ ${project.companyCnpj})` : '';

    const text = `COMPROVANTE DE LIQUIDAÇÃO PIX
Projeto: ${project.title} (${project.code})
Cliente: ${project.clientName}
Valor: R$ ${installment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Data: ${installment.paidDate || 'Hoje'}
Autenticação: ${authCode}
ID Transação: ${e2eId}
Beneficiário: ${companyName}${companyCnpj}`;

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const companyName = project.workshopName || 'Empresa Contratada';
    const companyCnpj = project.companyCnpj || 'Conforme contrato';
    const activePixKey = project.pixKey || 'Chave Pix Registrada';

    const element = document.createElement('a');
    const file = new Blob([
      `============================================================\n` +
      `       COMPROVANTE OFICIAL DE TRANSAÇÃO PIX - BACEN          \n` +
      `============================================================\n\n` +
      `Ordem de Serviço: ${project.code}\n` +
      `Descrição: ${project.title}\n` +
      `Parcela: ${installment.label}\n` +
      `Valor Liquidado: R$ ${installment.amount.toFixed(2)}\n` +
      `Data/Hora: ${installment.paidDate || 'Hoje'} às 11:20:44 BRT\n\n` +
      `DADOS DO PAGADOR:\n` +
      `Nome: ${project.clientName}\n` +
      `Instituição: Banco Inter S.A.\n\n` +
      `DADOS DO BENEFICIÁRIO:\n` +
      `Razão Social: ${companyName}\n` +
      `CNPJ: ${companyCnpj}\n` +
      `Chave Pix: ${activePixKey}\n\n` +
      `DADOS DE SEGURANÇA:\n` +
      `Código de Autenticação: ${authCode}\n` +
      `Identificador E2E: ${e2eId}\n` +
      `Situação: LIQUIDADO COM SUCESSO\n` +
      `============================================================\n`
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Comprovante_Pix_${project.code}_${installment.number}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#EAECEF] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-b border-[#EAECEF] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#0F172A] tracking-tight">
                Comprovante de Liquidação Pix
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64748B]">
                Autenticado via Sistema Financeiro Nacional
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FinancialPrivacyToggle size="xs" variant="amber" />
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs font-sans">
          
          {/* Main Amount Callout */}
          <div className="text-center bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Valor Recebido
            </span>
            <div className={`font-headline font-black text-2xl text-emerald-700 ${blurClass}`}>
              R$ {installment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Transação Autenticada</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-2 bg-white border border-[#EAECEF] rounded-2xl p-4 shadow-2xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-[#64748B]">Ordem de Serviço</span>
              <span className="font-bold text-[#0F172A] font-mono">{project.code}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-[#64748B]">Parcela</span>
              <span className="font-semibold text-[#0F172A]">{installment.label}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-[#64748B]">Data da Baixa</span>
              <span className="font-semibold text-[#0F172A]">{installment.paidDate || '19/09/2026 às 11:20'}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-[#64748B]">Pagador</span>
              <span className="font-semibold text-[#0F172A]">{project.clientName}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-[#64748B]">Beneficiário</span>
              <span className="font-semibold text-[#0F172A]">Gestão de Projetos Integrada Ltda</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-[#64748B]">Autenticação Pix</span>
              <span className="font-mono text-[11px] font-bold text-[#FF6515]">{authCode}</span>
            </div>
          </div>

          {/* E2E ID Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[10px] text-[#64748B] space-y-0.5">
            <span className="font-bold block text-[#334155]">ID de Transação Fim-a-Fim (E2E):</span>
            <p className="font-mono break-all text-[#64748B]">{e2eId}</p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-[#EAECEF] flex items-center justify-end gap-2">
          <button
            onClick={handleCopy}
            className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-xs font-semibold text-[#475569] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
            <span>{copied ? 'Copiado!' : 'Copiar Dados'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Comprovante</span>
          </button>
        </div>

      </div>
    </div>
  );
};
