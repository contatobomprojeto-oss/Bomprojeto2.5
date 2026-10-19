import React, { useState, useId } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  Users, 
  Clock, 
  ShieldCheck, 
  ArrowDown, 
  Sparkles, 
  CheckCircle2, 
  DollarSign, 
  Building2, 
  Briefcase, 
  Hammer,
  HelpCircle,
  Zap
} from 'lucide-react';

interface RoiSavingsCalculatorProps {
  onScrollToPlans?: () => void;
}

type SegmentType = 'agencia' | 'construcao' | 'marcenaria';

export const RoiSavingsCalculator: React.FC<RoiSavingsCalculatorProps> = ({ onScrollToPlans }) => {
  const [segment, setSegment] = useState<SegmentType>('agencia');
  const [projectsCount, setProjectsCount] = useState<number>(15);
  const [ticketAverage, setTicketAverage] = useState<number>(2500);
  const [hoursLostWeekly, setHoursLostWeekly] = useState<number>(10);

  const projectsSliderId = useId();
  const ticketSliderId = useId();
  const hoursSliderId = useId();

  // Presets rápidos ao alternar segmento
  const handleSegmentChange = (newSegment: SegmentType) => {
    setSegment(newSegment);
    if (newSegment === 'agencia') {
      setProjectsCount(15);
      setTicketAverage(2500);
      setHoursLostWeekly(10);
    } else if (newSegment === 'construcao') {
      setProjectsCount(12);
      setTicketAverage(4500);
      setHoursLostWeekly(14);
    } else if (newSegment === 'marcenaria') {
      setProjectsCount(10);
      setTicketAverage(3500);
      setHoursLostWeekly(12);
    }
  };

  // 1. Custo das Horas Perdidas (base R$ 50/hora, 4.33 semanas no mês)
  const costHoursPerMonth = Math.round(hoursLostWeekly * 4.33 * 50);
  const hoursPerMonthTotal = Math.round(hoursLostWeekly * 4.33);

  // 2. Custo Evitado de CS/PMO (se projetos >= 10, precisaria de pelo menos 1 pessoa dedicada de R$ 4.500 c/ encargos; se < 10, proporcional)
  const avoidedHiringCost = projectsCount >= 10 ? 4500 : Math.round((projectsCount / 10) * 4500);

  // 3. Prejuízo de Churn Evitado (estimando redução de 1 cancelamento no ano diluído por mês, preservação de 15% do LTV)
  const churnLossAvoidedMonthly = Math.round((ticketAverage * 12 * 0.15) / 12);

  // Economia Total Mensal Projetada
  const totalMonthlySavings = costHoursPerMonth + avoidedHiringCost + churnLossAvoidedMonthly;
  const totalAnnualSavings = totalMonthlySavings * 12;

  // Custo base de entrada do BomProjeto (Plano Start = R$ 149/mês)
  const bomProjetoBaseCost = 149;
  const roiMultiplier = Math.max(1, Math.round(totalMonthlySavings / bomProjetoBaseCost));

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleSmoothScroll = () => {
    if (onScrollToPlans) {
      onScrollToPlans();
      return;
    }
    const element = document.getElementById('planos');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section 
      aria-label="Simulador de Economia e ROI"
      className="py-14 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#EAE6DF]"
    >
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-[#111827] via-[#0F172A] to-[#0B0F19] text-white shadow-2xl border border-slate-800 p-6 sm:p-10 lg:p-12">
        {/* Glow de fundo sutil */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />

        {/* ========================================================
            CABEÇALHO
        ======================================================== */}
        <div className="relative text-center max-w-3xl mx-auto space-y-3.5 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wider uppercase">
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>SIMULADOR DE ECONOMIA REAL</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Quanto a falta de alinhamento e o churn custam para o seu negócio todo mês?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Descubra quanto você economiza ao automatizar a comunicação de entregas e blindar seus contratos sem precisar inflar sua folha de pagamento.
          </p>
        </div>

        {/* ========================================================
            GRID PRINCIPAL: CONTROLES (ESQ) & RESULTADOS (DIR)
        ======================================================== */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          
          {/* COLUNA ESQUERDA: CONTROLES INTERATIVOS (7 COLUNAS EM DESKTOP) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-7 bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-800">
            
            {/* 1. SELETOR DE SEGMENTO */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#FF6515]" />
                Segmento de Atuação
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSegmentChange('agencia')}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    segment === 'agencia'
                      ? 'bg-[#FF6515] text-white border-[#FF6515] shadow-lg shadow-[#FF6515]/20'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Agência / Assessoria</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSegmentChange('construcao')}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    segment === 'construcao'
                      ? 'bg-[#FF6515] text-white border-[#FF6515] shadow-lg shadow-[#FF6515]/20'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Construção / Engenharia</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSegmentChange('marcenaria')}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    segment === 'marcenaria'
                      ? 'bg-[#FF6515] text-white border-[#FF6515] shadow-lg shadow-[#FF6515]/20'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <Hammer className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Marcenaria / Planejados</span>
                </button>
              </div>
            </div>

            {/* SLIDER 1: PROJETOS ATIVOS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label htmlFor={projectsSliderId} className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Clientes / Projetos Ativos Simultâneos
                </label>
                <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-sm sm:text-base">
                  {projectsCount} {projectsCount === 1 ? 'projeto' : 'projetos'}
                </span>
              </div>

              <input
                id={projectsSliderId}
                type="range"
                min={5}
                max={100}
                step={1}
                value={projectsCount}
                onChange={(e) => setProjectsCount(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FF6515]"
              />

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>5 projetos</span>
                <span>50 projetos</span>
                <span>100 projetos</span>
              </div>
            </div>

            {/* SLIDER 2: TICKET MÉDIO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor={ticketSliderId} className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  Ticket Médio Mensal por Cliente
                </label>
                <span className="px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold text-sm sm:text-base">
                  {formatBRL(ticketAverage)} <span className="text-xs font-normal text-amber-300">/mês</span>
                </span>
              </div>

              <input
                id={ticketSliderId}
                type="range"
                min={500}
                max={15000}
                step={250}
                value={ticketAverage}
                onChange={(e) => setTicketAverage(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>R$ 500</span>
                <span>R$ 7.500</span>
                <span>R$ 15.000</span>
              </div>
            </div>

            {/* SLIDER 3: HORAS PERDIDAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor={hoursSliderId} className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  Horas/semana perdidas com alinhamento & WhatsApp
                </label>
                <span className="px-3 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 font-extrabold text-sm sm:text-base">
                  {hoursLostWeekly}h <span className="text-xs font-normal text-sky-300">/semana</span>
                </span>
              </div>

              <input
                id={hoursSliderId}
                type="range"
                min={2}
                max={40}
                step={1}
                value={hoursLostWeekly}
                onChange={(e) => setHoursLostWeekly(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>2h/sem (~9h/mês)</span>
                <span>20h/sem</span>
                <span>40h/sem (~173h/mês)</span>
              </div>
            </div>

            {/* DICA DE PRODUTIVIDADE */}
            <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Calculado com base em <strong>R$ 50/hora técnica</strong> e CLT proporcional para analista de suporte/PMO.
              </span>
            </div>

          </div>

          {/* COLUNA DIREITA: PAINEL DINÂMICO DE ECONOMIA & ROI (5 COLUNAS EM DESKTOP) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            
            {/* CARD DE DESTAQUE: ECONOMIA MENSAL ESTIMADA */}
            <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-950/80 via-emerald-900/60 to-slate-900 border-2 border-emerald-500/40 p-6 sm:p-7 shadow-xl shadow-emerald-950/40">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Economia Mensal Estimada
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  ROI ~{roiMultiplier}x
                </span>
              </div>

              <div className="flex items-baseline gap-2 my-2">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                  {formatBRL(totalMonthlySavings)}
                </span>
                <span className="text-sm font-medium text-emerald-200">/mês</span>
              </div>

              <p className="text-xs font-medium text-emerald-300/90 flex items-center gap-1.5 pt-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Equivale a <strong>{formatBRL(totalAnnualSavings)}/ano</strong> preservados no seu caixa.</span>
              </p>
            </div>

            {/* DETALHAMENTO DO CUSTO EVITADO */}
            <div className="bg-slate-900/70 rounded-2xl p-5 border border-slate-800 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Detalhamento dos Custos Evitados:
              </h4>

              {/* 1. Contratação Evitada */}
              <div className="flex items-center justify-between text-xs sm:text-sm py-1 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>Contratação evitada (PMO/CS CLT):</span>
                </div>
                <span className="font-bold text-emerald-400">{formatBRL(avoidedHiringCost)}/mês</span>
              </div>

              {/* 2. Tempo Recuperado */}
              <div className="flex items-center justify-between text-xs sm:text-sm py-1 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span>Tempo recuperado da equipe ({hoursPerMonthTotal}h/mês):</span>
                </div>
                <span className="font-bold text-sky-400">{formatBRL(costHoursPerMonth)}/mês</span>
              </div>

              {/* 3. Churn Evitado */}
              <div className="flex items-center justify-between text-xs sm:text-sm py-1">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span>Receita blindada contra Churn (LTV):</span>
                </div>
                <span className="font-bold text-amber-400">{formatBRL(churnLossAvoidedMonthly)}/mês</span>
              </div>
            </div>

            {/* COMPARATIVO DIRETO */}
            <div className="bg-slate-900/50 rounded-xl p-3.5 border border-slate-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <div className="text-slate-400">
                Custo com atrito/equipe: <strong className="text-red-400 line-through">{formatBRL(totalMonthlySavings)}+/mês</strong>
              </div>
              <div className="text-emerald-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Com BomProjeto: <strong>a partir de R$ 149/mês</strong></span>
              </div>
            </div>

            {/* CTA DINÂMICO */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSmoothScroll}
                className="w-full py-4 px-6 rounded-xl bg-linear-to-r from-[#FF6515] to-[#FF7A2F] hover:from-[#E0540F] hover:to-[#FF6515] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-[#FF6515]/30 hover:shadow-[#FF6515]/40 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Escolher o plano ideal para minha operação</span>
                <ArrowDown className="w-4 h-4 animate-bounce" />
              </button>

              <p className="text-[11px] text-center text-slate-400">
                * Retorno do investimento garantido já no primeiro cliente retido.
              </p>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
