import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Printer, 
  Check, 
  Copy, 
  MessageSquare, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  Receipt, 
  Building2, 
  ShieldCheck, 
  ExternalLink,
  Clock
} from 'lucide-react';
import { Project, ProjectStage } from '../types';
import { generateProjectSummaryPdf } from '../utils/generateProjectPdf';
import { buildClientPortalUrl } from '../utils/portalUrl';
import { useFinancialPrivacy } from '../hooks/useFinancialPrivacy';
import { FinancialPrivacyToggle } from './FinancialPrivacyToggle';

interface ProjectSummaryPdfModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  workshopName?: string;
  workshopPhone?: string;
  workshopCity?: string;
}

export const ProjectSummaryPdfModal: React.FC<ProjectSummaryPdfModalProps> = ({
  project,
  isOpen,
  onClose,
  workshopName = 'Gestão de Projetos',
  workshopPhone = '+55 (11) 98765-4321',
  workshopCity = 'São Paulo - SP'
}) => {
  const { hideFinancials, blurClass } = useFinancialPrivacy();
  const [copiedWhatsAppText, setCopiedWhatsAppText] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const totalValue = project.totalValue || 9533;
  const paidInstallments = (project.installments || []).filter(i => i.status === 'paid');
  const paidTotal = paidInstallments.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingTotal = Math.max(0, totalValue - paidTotal);
  const paidPercent = totalValue > 0 ? Math.round((paidTotal / totalValue) * 100) : 0;
  const isCompleted = project.status === 'concluido' || project.progressPercent === 100;

  const stagesList: ProjectStage[] = project.stages && project.stages.length > 0
    ? project.stages
    : [
        { id: '1', name: 'Projeto Executivo & Aprovação', description: 'Aprovação', status: 'completed' as const, date: '18 Set', notes: 'Aprovado digitalmente', completedBy: 'Henrique Ferraz', completedByRole: 'Administrador', completedAt: '18/09/2026 às 14:00' },
        { id: '2', name: 'Medição Fina no Local', description: 'Medição', status: 'completed' as const, date: '19 Set', notes: 'Prumos validados a laser', completedBy: 'Carlos Marceneiro', completedByRole: 'Marceneiro', completedAt: '19/09/2026 às 10:30' },
        { id: '3', name: 'Corte CNC & Furação', description: 'Usinagem', status: 'current' as const, date: '25 Set', notes: 'Em usinagem' },
        { id: '4', name: 'Montagem em Bancada & Ajustes', description: 'Montagem', status: 'upcoming' as const, date: '05 Out', notes: 'Ferragens Blum' },
        { id: '5', name: 'Instalação no Local & Entrega', description: 'Instalação', status: 'upcoming' as const, date: project.deliveryDate, notes: 'Montagem final' }
      ];

  const handleDownloadPdf = () => {
    try {
      setIsGenerating(true);
      const doc = generateProjectSummaryPdf(project, workshopName, workshopPhone, workshopCity);
      const cleanName = project.clientName.replace(/\s+/g, '_');
      const cleanCode = project.code.replace('#', '');
      doc.save(`Resumo_OS_${cleanCode}_${cleanName}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getWhatsAppSummaryText = () => {
    const portalUrl = buildClientPortalUrl(project.id);
    const recentUpdates = (project.updates || []).slice(0, 3);
    const updatesSummaryText = recentUpdates.length > 0
      ? `\n👥 *TRATAMENTO DE DEMANDAS / ATUALIZAÇÕES:*\n` + recentUpdates.map(u => `• *${u.timestamp}* - ${u.author} (${u.role}): ${u.message}`).join('\n')
      : '';

    return `📋 *RESUMO FORMAL DA ORDEM DE SERVIÇO* • ${workshopName}
📌 *OS #${project.code.replace('#', '')}* | *Cliente:* ${project.clientName}
📁 *Projeto:* ${project.title}
📍 *Local:* ${project.unit || 'Ambiente / Local'}

───────────────
📊 *EVOLUÇÃO DO PROJETO (${project.progressPercent}% Concluído)*
• *Etapa Atual:* ${project.currentStage}
• *Previsão de Entrega:* ${project.deliveryDate}

💰 *STATUS FINANCEIRO*
• *Valor Total Contratado:* R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• *Valor Quitado:* R$ ${paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${paidPercent}%)
• *Saldo Restante:* R$ ${pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
${updatesSummaryText}

📄 O documento formal completo em PDF foi gerado pela equipe de projetos com histórico auditável de quem realizou cada etapa. Acompanhe também fotos e comprovantes pelo link:
🔗 ${portalUrl}

Qualquer dúvida estamos à disposição!
_${workshopName} • ${workshopPhone}_`;
  };

  const handleCopyWhatsAppText = () => {
    navigator.clipboard?.writeText(getWhatsAppSummaryText());
    setCopiedWhatsAppText(true);
    setTimeout(() => setCopiedWhatsAppText(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(getWhatsAppSummaryText());
    const rawPhone = (project.clientPhone || '').replace(/\D/g, '');
    const phoneParam = rawPhone ? `phone=${rawPhone.startsWith('55') ? rawPhone : '55' + rawPhone}&` : '';
    const link = document.createElement('a');
    link.href = `https://api.whatsapp.com/send?${phoneParam}text=${text}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-[#0F172A]/45 backdrop-blur-xs overflow-y-auto select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="project-summary-pdf-modal"
        className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAECEF] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-[#0F172A] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#EAECEF] bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#F97316] border border-orange-100 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-[#0F172A] tracking-tight">
                Resumo Formal do Projeto (PDF)
              </h2>
              <p className="text-[11px] sm:text-xs text-[#64748B]">
                Documento técnico com cronograma de etapas e extrato financeiro para o cliente
              </p>
            </div>
          </div>

          {/* Actions & Close */}
          <div className="flex items-center gap-2">
            <button
              id="btn-download-pdf"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="py-2 px-3.5 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Gerando PDF...' : 'Baixar PDF'}</span>
            </button>

            <button
              id="btn-send-wa-summary"
              onClick={handleOpenWhatsApp}
              className="py-2 px-3 rounded-xl bg-[#25d366]/15 hover:bg-[#25d366]/25 text-[#075e54] border border-[#25d366]/30 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Abrir WhatsApp com texto e link formal"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#075e54]" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

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

        {/* Action Highlights Banner */}
        <div className="px-5 py-2.5 bg-[#f5efe6] border-b border-[#ebdcb3] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#78541a]">
            <CheckCircle2 className="w-4 h-4 text-[#9f3c16] shrink-0" />
            <span>
              <strong>Documento pronto para envio:</strong> O cliente recebe o extrato financeiro autenticado e o progresso das etapas.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-wa-message"
              onClick={handleCopyWhatsAppText}
              className="py-1 px-2.5 rounded-lg border border-[#d3cdc3] bg-white hover:bg-[#faf7f2] text-xs font-semibold text-[#52524e] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            >
              {copiedWhatsAppText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-[#73736c]" />}
              <span>{copiedWhatsAppText ? 'Copiado para WhatsApp!' : 'Copiar Texto para WhatsApp'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-1 px-2.5 rounded-lg border border-[#d3cdc3] bg-white hover:bg-[#faf7f2] text-xs font-semibold text-[#52524e] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs hidden sm:flex"
            >
              <Printer className="w-3 h-3 text-[#73736c]" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Document Visual Preview (Emulated A4 sheet) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-[#f0ece4] flex justify-center">
          <div className="bg-white rounded-lg border border-[#d3cdc3] shadow-md w-full max-w-2xl p-6 sm:p-8 space-y-6 text-[#1c1c1a]">
            
            {/* Header: Dark atelier banner */}
            <div className="bg-[#1e1d1b] text-white p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-[#f5efe6]/70 uppercase tracking-widest block">
                  Documento Oficial do Atelier
                </span>
                <h1 className="font-headline font-black text-xl sm:text-2xl tracking-wide uppercase text-white">
                  {workshopName}
                </h1>
                <p className="text-xs text-[#d7d2c8] mt-0.5">
                  Relatório Técnico & Extrato da Ordem de Serviço • {workshopCity}
                </p>
              </div>

              <div className="bg-[#9f3c16] text-white px-3 py-2 rounded-lg text-center sm:text-right self-start sm:self-auto shrink-0 shadow-xs">
                <span className="text-[10px] font-bold block uppercase tracking-wider text-white/90">
                  Ordem de Serviço
                </span>
                <span className="text-base font-mono font-black">
                  OS #{project.code.replace('#', '')}
                </span>
              </div>
            </div>

            {/* Client & Project Specs Card */}
            <div className="bg-[#fcfaf7] border border-[#ede8df] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#8c887f] uppercase tracking-wider block">
                  Cliente Titular
                </span>
                <div className="font-bold text-sm text-[#1c1c1a] mt-0.5">
                  {project.clientName}
                </div>
                <div className="text-[#73736c] text-[11px] mt-0.5">
                  {project.clientPhone || '+55 (11) 98123-4567'}
                </div>
                <div className="text-[#73736c] text-[11px]">
                  {project.unit || 'Apto 142 - Torre Araucária'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#8c887f] uppercase tracking-wider block">
                  Projeto & Categoria
                </span>
                <div className="font-bold text-sm text-[#1c1c1a] mt-0.5">
                  {project.title}
                </div>
                <div className="text-[#73736c] text-[11px] mt-0.5 capitalize">
                  Segmento: {project.category || 'Marcenaria sob medida'}
                </div>
                <div className="text-[#73736c] text-[11px]">
                  Contrato: {project.contractDate || '18 Set 2026'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#8c887f] uppercase tracking-wider block">
                  Status & Prazo
                </span>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-[#ffded3] text-[#9f3c16]'
                  }`}>
                    {project.progressPercent}% Concluído
                  </span>
                </div>
                <div className="text-[#73736c] text-[11px] mt-1">
                  Entrega: <strong>{project.deliveryDate}</strong>
                </div>
                <div className="text-[#8c887f] text-[10px]">
                  Emitido em: {new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>

            {/* Section 1: Financial Demonstrative */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#e6e1d8] pb-1.5">
                <Receipt className="w-4 h-4 text-[#9f3c16]" />
                <h3 className="font-headline font-bold text-sm text-[#1c1c1a] uppercase tracking-wider">
                  1. Demonstrativo Financeiro & Condições de Pagamento
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-lg border border-[#ede8df] bg-[#faf8f5]">
                  <span className="text-[10px] font-bold text-[#8c887f] uppercase tracking-wide block">
                    Valor Total Aprovado
                  </span>
                  <div className={`text-lg font-headline font-bold text-[#1c1c1a] mt-0.5 ${blurClass}`}>
                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide block">
                    Total Recebido ({paidPercent}%)
                  </span>
                  <div className={`text-lg font-headline font-bold text-emerald-700 mt-0.5 ${blurClass}`}>
                    R$ {paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-[#ede8df] bg-[#faf8f5]">
                  <span className="text-[10px] font-bold text-[#8c887f] uppercase tracking-wide block">
                    Saldo Restante
                  </span>
                  <div className={`text-lg font-headline font-bold text-[#9f3c16] mt-0.5 ${blurClass}`}>
                    R$ {pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Installments Table */}
              <div className="border border-[#ede8df] rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#f5efe6] text-[10px] uppercase font-bold text-[#73736c] border-b border-[#ede8df]">
                    <tr>
                      <th className="py-2 px-3">Parcela</th>
                      <th className="py-2 px-3">Valor</th>
                      <th className="py-2 px-3">Vencimento</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Autenticação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede8df] text-[#52524e]">
                    {(project.installments && project.installments.length > 0 ? project.installments : [
                      { number: 1, amount: totalValue * 0.5, dueDate: '18 Set 2026', status: 'paid' as const, paidDate: '18 Set 2026', authCode: 'PX-8831' },
                      { number: 2, amount: totalValue * 0.5, dueDate: project.deliveryDate, status: 'pending' as const }
                    ]).map((inst) => (
                      <tr key={inst.number} className="hover:bg-[#fcfaf7]">
                        <td className="py-2 px-3 font-semibold text-[#1c1c1a]">
                          Parcela {inst.number}
                        </td>
                        <td className={`py-2 px-3 font-bold text-[#1c1c1a] ${blurClass}`}>
                          R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3">
                          {inst.dueDate}
                        </td>
                        <td className="py-2 px-3">
                          {inst.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              <Check className="w-2.5 h-2.5" /> Quitado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              <Clock className="w-2.5 h-2.5" /> Na Entrega
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[11px] text-[#73736c]">
                          {inst.status === 'paid' ? `Pix Inter #${inst.authCode || 'PX-992384'}` : 'Chave Pix'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Stages & Timeline */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#e6e1d8] pb-1.5">
                <Calendar className="w-4 h-4 text-[#9f3c16]" />
                <h3 className="font-headline font-bold text-sm text-[#1c1c1a] uppercase tracking-wider">
                  2. Cronograma de Execução & Etapas da Oficina
                </h3>
              </div>

              <div className="border border-[#ede8df] rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#f5efe6] text-[10px] uppercase font-bold text-[#73736c] border-b border-[#ede8df]">
                    <tr>
                      <th className="py-2 px-3">Fase / Etapa</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Data / Conclusão</th>
                      <th className="py-2 px-3 text-right">Avançado por / Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede8df] text-[#52524e]">
                    {stagesList.map((stage, idx) => {
                      const isCompletedStage = stage.status === 'completed';
                      return (
                        <tr key={stage.id} className="hover:bg-[#fcfaf7]">
                          <td className="py-2 px-3 font-semibold text-[#1c1c1a]">
                            {idx + 1}. {stage.name}
                          </td>
                          <td className="py-2 px-3">
                            {stage.status === 'completed' && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Concluída ✓
                              </span>
                            )}
                            {stage.status === 'current' && (
                              <span className="text-[10px] font-bold text-[#9f3c16] bg-[#ffded3] px-2 py-0.5 rounded border border-[#edd9cf]">
                                Em Produção ⚙
                              </span>
                            )}
                            {(stage.status === 'upcoming' || (stage.status as any) === 'pending') && (
                              <span className="text-[10px] font-medium text-[#73736c] bg-[#f5efe6] px-2 py-0.5 rounded">
                                Programada
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-[#52524e]">
                            {stage.completedAt || stage.date || `Etapa ${idx + 1}`}
                          </td>
                          <td className="py-2 px-3 text-right text-[11px]">
                            {isCompletedStage ? (
                              <span className="font-semibold text-emerald-950">
                                {stage.completedBy || 'Equipe Técnica'}
                                {stage.completedByRole ? ` (${stage.completedByRole})` : ''}
                              </span>
                            ) : (
                              <span className="text-[#73736c]">{stage.notes || 'Equipe Especializada'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Treatment History & Team Updates */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#e6e1d8] pb-1.5">
                <MessageSquare className="w-4 h-4 text-[#9f3c16]" />
                <h3 className="font-headline font-bold text-sm text-[#1c1c1a] uppercase tracking-wider">
                  3. Registro de Tratamento de Demandas & Atualizações da Equipe
                </h3>
              </div>

              {(project.updates && project.updates.length > 0) ? (
                <div className="border border-[#ede8df] rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#f5efe6] text-[10px] uppercase font-bold text-[#73736c] border-b border-[#ede8df]">
                      <tr>
                        <th className="py-2 px-3">Data / Hora</th>
                        <th className="py-2 px-3">Tratado por (Responsável)</th>
                        <th className="py-2 px-3">Cargo / Função</th>
                        <th className="py-2 px-3">Etapa</th>
                        <th className="py-2 px-3">Tratamento / Mensagem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ede8df] text-[#52524e]">
                      {project.updates.map((upd, idx) => (
                        <tr key={upd.id || idx} className="hover:bg-[#fcfaf7]">
                          <td className="py-2 px-3 font-mono text-[10px] text-[#73736c] whitespace-nowrap">
                            {upd.timestamp}
                          </td>
                          <td className="py-2 px-3 font-semibold text-[#1c1c1a]">
                            {upd.author || 'Equipe Técnica'}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f0ece4] text-[#52524e]">
                              {upd.role || 'Oficina'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#1967D2] font-medium text-[11px]">
                            {upd.stageName}
                          </td>
                          <td className="py-2 px-3 text-[#52524e] leading-snug">
                            {upd.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#ede8df] text-xs text-[#73736c] text-center">
                  Nenhum registro de atualização cadastrado ainda neste projeto.
                </div>
              )}
            </div>

            {/* Section 4: Warranty & Formal Verification */}
            <div className="bg-[#faf8f5] border border-[#ede8df] rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[#1c1c1a]">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>4. Termo de Garantia & Procedência do Atelier</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[#57534e] text-[11px] leading-relaxed">
                <li><strong>Garantia Estrutural:</strong> 5 anos contra empenamento, descolamento térmico de fita de borda e alinhamento de caixarias.</li>
                <li><strong>Auditoria de Atendimento:</strong> Registro formal com responsável, cargo, data e hora de cada etapa e atualização técnica.</li>
                <li><strong>Acompanhamento em Tempo Real:</strong> Fotos das etapas são arquivadas com segurança no histórico do cliente.</li>
              </ul>
            </div>

            {/* Signature Block */}
            <div className="pt-4 grid grid-cols-2 gap-6 text-center text-xs">
              <div className="border-t border-[#c5bfb4] pt-2">
                <div className="font-bold text-[#1c1c1a]">{workshopName}</div>
                <div className="text-[11px] text-[#73736c]">Responsável Técnico & Marcenaria</div>
              </div>
              <div className="border-t border-[#c5bfb4] pt-2">
                <div className="font-bold text-[#1c1c1a]">{project.clientName}</div>
                <div className="text-[11px] text-[#73736c]">Aceite Formal do Cliente</div>
              </div>
            </div>

            {/* Document Hash & Footer */}
            <div className="pt-2 text-center text-[10px] text-[#8c887f] font-mono border-t border-[#f0ece4]">
              Hash de autenticidade: OS-{project.code.replace('#', '')}-{Date.now().toString().slice(-6)} • Emitido pelo Sistema Marceneiro Pro
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#eeeae1] bg-[#faf8f5] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#73736c] text-center sm:text-left">
            O arquivo PDF segue o padrão formal A4 com layout vetorizado em alta resolução.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-[#ded8cd] bg-white hover:bg-[#f7f4ee] text-xs font-bold text-[#57534e] transition-colors cursor-pointer"
            >
              Fechar
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="py-2 px-4 rounded-xl bg-[#9f3c16] hover:bg-[#853010] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Processando...' : 'Baixar PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
