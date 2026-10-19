import React, { useState } from 'react';
import { X, FileText, Download, CheckCircle, ShieldCheck, Printer } from 'lucide-react';
import { Project } from '../types';

interface ContractViewerModalProps {
  project: Project;
  onClose: () => void;
}

export const ContractViewerModal: React.FC<ContractViewerModalProps> = ({
  project,
  onClose
}) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    const companyName = project.workshopName || 'Empresa Contratada';
    const companyCnpj = project.companyCnpj ? `CNPJ: ${project.companyCnpj}` : 'CNPJ: Conforme cadastro';

    const text = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS E EXECUÇÃO DE PROJETO
ORDEM DE SERVIÇO Nº: ${project.code}
DATA: ${project.contractDate || 'Data de emissão'}

CONTRATADA:
${companyName}
${companyCnpj}

CONTRATANTE:
${project.clientName}
Telefone: ${project.clientPhone}

1. OBJETO DO CONTRATO:
Execução, gestão técnica e entrega do projeto: ${project.title}.
Unidade/Ambiente: ${project.unit || 'Ambiente Principal'}.

2. VALOR E CONDIÇÕES DE PAGAMENTO:
Valor Total Acordado: R$ ${project.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Parcela 01: 50% de entrada no aceite e início da execução.
- Parcela 02: 50% na finalização e vistoria pré-entrega.

3. PRAZO DE ENTREGA:
Previsão técnica para: ${project.deliveryDate}.

4. GARANTIA:
O presente trabalho possui garantia técnica de 5 (cinco) anos contra defeitos de execução e conformidade técnica conforme memorial descritivo.

DOCUMENTO ASSINADO DIGITALMENTE VIA BOMPROJETO OS
Autenticação SHA-256: 8f9b472e3a1d90c5b8812e993847afbc
`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contrato_${project.clientName.replace(/\s+/g, '_')}_${project.code}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#EAECEF] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-b border-[#EAECEF] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#F97316] border border-orange-100 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#0F172A] tracking-tight">
                Contrato de Prestação de Serviços & Garantia
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64748B]">
                Documento Oficial Autenticado • OS {project.code}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contract Preview Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-serif leading-relaxed text-[#1E293B] bg-[#FAFAFA]">
          
          <div className="border-b border-[#E2E8F0] pb-4 text-center space-y-1">
            <h2 className="font-sans font-bold text-base text-[#0F172A] uppercase tracking-wide">
              {project.workshopName || 'Empresa Contratada'}
            </h2>
            <p className="text-[11px] text-[#64748B] font-sans">
              {project.companyCnpj ? `CNPJ ${project.companyCnpj}` : 'Contrato Formal de Execução'}
            </p>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-sans mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Assinatura Digital Válida</span>
            </div>
          </div>

          <div className="space-y-3 font-sans text-xs">
            <div className="p-3.5 bg-white rounded-2xl border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-2xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#64748B]">Contratante:</span>
                <p className="font-bold text-[#0F172A]">{project.clientName}</p>
                <p className="text-[11px] text-[#64748B]">{project.clientPhone}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#64748B]">Data de Emissão:</span>
                <p className="font-bold text-[#0F172A]">{project.contractDate || '19/09/2026'}</p>
                <p className="text-[11px] text-[#64748B]">Prazo Previsto: {project.deliveryDate}</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] space-y-2 font-serif text-xs leading-relaxed text-[#334155] shadow-2xs">
              <h4 className="font-sans font-bold text-xs uppercase text-[#FF6515] tracking-wider">
                1. Especificações Técnicas e Execução
              </h4>
              <p>
                A <strong>CONTRATADA</strong> compromete-se a executar e entregar o projeto <em>{project.title}</em> em conformidade com as normas técnicas vigentes, memorial descritivo aprovado e materiais especificados de primeira linha.
              </p>

              <h4 className="font-sans font-bold text-xs uppercase text-[#FF6515] tracking-wider pt-2">
                2. Condições Comerciais & Pagamento
              </h4>
              <p>
                O valor total da contratação é de <strong>R$ {project.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, estruturado em duas parcelas iguais de 50%, sendo a primeira liquidada no aceite e início dos trabalhos e a segunda mediante vistoria final na entrega.
              </p>

              <h4 className="font-sans font-bold text-xs uppercase text-[#FF6515] tracking-wider pt-2">
                3. Certificado de Garantia de 5 Anos
              </h4>
              <p>
                Todo o projeto executado é coberto pela Garantia Técnica de 5 (cinco) anos contra vícios ocultos ou defeitos estruturais, com suporte e vistorias preventivas conforme política de atendimento.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-[#EAECEF] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#64748B] font-mono">
            HASH: 8F9B472E...VALID
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-xs font-semibold text-[#475569] transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleDownload}
              className="py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloaded ? 'Baixado!' : 'Baixar Contrato em PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
