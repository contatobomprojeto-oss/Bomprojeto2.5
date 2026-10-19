import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  X, 
  Filter, 
  Clock, 
  ArrowRight,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { 
  DateRangeFilter, 
  DateFilterPreset, 
  DateFilterBasis,
  getDateRangeForPreset, 
  formatDateRangeLabel 
} from '../utils/dateFilter';

interface DateRangeFilterBarProps {
  filter: DateRangeFilter;
  onChange: (newFilter: DateRangeFilter) => void;
  totalItemsCount?: number;
  filteredItemsCount?: number;
  labelPlural?: string; // ex: "projetos", "clientes"
  compact?: boolean;
  showBasisSelector?: boolean;
  className?: string;
}

export const DateRangeFilterBar: React.FC<DateRangeFilterBarProps> = ({
  filter,
  onChange,
  totalItemsCount,
  filteredItemsCount,
  labelPlural = 'projetos',
  compact = false,
  showBasisSelector = true,
  className = ''
}) => {
  const [showCustomInputs, setShowCustomInputs] = useState<boolean>(filter.preset === 'custom');
  const [showBasisDropdown, setShowBasisDropdown] = useState<boolean>(false);

  const presets: Array<{ id: DateFilterPreset; label: string }> = [
    { id: 'all', label: 'Todo o Período' },
    { id: 'today', label: 'Hoje' },
    { id: 'last_7_days', label: '7 dias' },
    { id: 'last_30_days', label: '30 dias' },
    { id: 'this_month', label: 'Este Mês' },
    { id: 'last_month', label: 'Mês Anterior' },
    { id: 'this_year', label: 'Este Ano' },
    { id: 'custom', label: 'Personalizado' },
  ];

  const handleSelectPreset = (preset: DateFilterPreset) => {
    if (preset === 'custom') {
      setShowCustomInputs(true);
      onChange({
        ...filter,
        preset: 'custom'
      });
      return;
    }

    const { startDate, endDate } = getDateRangeForPreset(preset);
    setShowCustomInputs(false);
    onChange({
      ...filter,
      preset,
      startDate,
      endDate
    });
  };

  const handleStartDateChange = (val: string) => {
    onChange({
      ...filter,
      preset: 'custom',
      startDate: val
    });
  };

  const handleEndDateChange = (val: string) => {
    onChange({
      ...filter,
      preset: 'custom',
      endDate: val
    });
  };

  const handleBasisChange = (basis: DateFilterBasis) => {
    onChange({
      ...filter,
      basis
    });
    setShowBasisDropdown(false);
  };

  const handleClear = () => {
    setShowCustomInputs(false);
    onChange({
      preset: 'all',
      startDate: '',
      endDate: '',
      basis: filter.basis
    });
  };

  const isFiltering = filter.preset !== 'all' || Boolean(filter.startDate) || Boolean(filter.endDate);

  const basisLabels: Record<DateFilterBasis, string> = {
    contract: 'Data de Contrato / Fechamento',
    delivery: 'Data de Entrega / Prazo',
    both: 'Contrato ou Entrega'
  };

  return (
    <div className={`bg-white rounded-2xl border border-[#EAECEF] p-3 sm:p-3.5 shadow-xs space-y-3 ${className}`}>
      
      {/* Top Controls: Preset Chips + Basis selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        
        {/* Label & Presets Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#475569] pr-1.5 shrink-0 select-none">
            <CalendarIcon className="w-3.5 h-3.5 text-[#0F172A]" />
            <span className="hidden sm:inline">Período:</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {presets.map((p) => {
              const active = filter.preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`
                    px-2.5 py-1 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer select-none
                    ${active 
                      ? 'bg-[#111827] text-white shadow-xs font-semibold' 
                      : 'bg-[#F8F9FA] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] border border-[#EAECEF]'
                    }
                  `}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Action: Basis selector (Contract vs Delivery) & Clear */}
        <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
          
          {showBasisSelector && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBasisDropdown(!showBasisDropdown)}
                className="px-2.5 py-1 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Critério de data"
              >
                <SlidersHorizontal className="w-3 h-3 text-[#0F172A]" />
                <span className="font-medium text-[11px] truncate max-w-[130px] sm:max-w-none">
                  {basisLabels[filter.basis]}
                </span>
                <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
              </button>

              {showBasisDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowBasisDropdown(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-2xl shadow-xl border border-[#EAECEF] p-1.5 z-40 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                      Filtrar por qual data?
                    </div>
                    {(['contract', 'delivery', 'both'] as DateFilterBasis[]).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleBasisChange(b)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          filter.basis === b 
                            ? 'bg-[#F1F5F9] text-[#0F172A] font-semibold' 
                            : 'text-[#475569] hover:bg-[#F8F9FA]'
                        }`}
                      >
                        <span>{basisLabels[b]}</span>
                        {filter.basis === b && <Check className="w-3.5 h-3.5 text-[#0F172A]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {isFiltering && (
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 rounded-lg text-xs text-[#D93025] hover:bg-rose-50 flex items-center gap-1 transition-colors font-medium cursor-pointer"
              title="Limpar filtro de período"
            >
              <X className="w-3 h-3" />
              <span className="text-[11px]">Limpar</span>
            </button>
          )}

        </div>

      </div>

      {/* Custom Date Pickers (Shown if preset is custom or if toggled) */}
      {(showCustomInputs || filter.preset === 'custom') && (
        <div className="pt-2 border-t border-[#F1F3F4] flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <span className="text-[#5F6368] font-medium text-[11px]">Intervalo específico:</span>
          
          <div className="flex items-center gap-1.5 bg-[#F8F9FA] px-2.5 py-1 rounded-lg border border-[#E8EAED]">
            <span className="text-[10px] font-semibold text-[#80868B] uppercase">De</span>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="bg-transparent text-xs text-[#202124] focus:outline-hidden font-mono"
            />
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-[#80868B] hidden sm:inline" />

          <div className="flex items-center gap-1.5 bg-[#F8F9FA] px-2.5 py-1 rounded-lg border border-[#E8EAED]">
            <span className="text-[10px] font-semibold text-[#80868B] uppercase">Até</span>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="bg-transparent text-xs text-[#202124] focus:outline-hidden font-mono"
            />
          </div>

          {filter.startDate && filter.endDate && (
            <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Período ativo
            </span>
          )}
        </div>
      )}

      {/* Info Status Strip */}
      {isFiltering && (
        <div className="flex items-center justify-between text-xs text-[#5F6368] pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
            <span className="text-[11px]">
              Filtrando por: <strong>{formatDateRangeLabel(filter)}</strong>
            </span>
          </div>

          {typeof filteredItemsCount === 'number' && typeof totalItemsCount === 'number' && (
            <span className="text-[11px] font-medium text-[#202124] bg-[#F1F3F4] px-2 py-0.5 rounded-full">
              {filteredItemsCount} de {totalItemsCount} {labelPlural} no período
            </span>
          )}
        </div>
      )}

    </div>
  );
};
