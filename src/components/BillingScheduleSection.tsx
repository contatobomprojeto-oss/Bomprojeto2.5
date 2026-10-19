import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Sun, 
  Moon, 
  Calendar, 
  Coffee, 
  Briefcase, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Sparkles, 
  Info, 
  BellRing,
  RotateCcw,
  Check
} from 'lucide-react';
import { BillingScheduleConfig } from '../types';

interface BillingScheduleSectionProps {
  schedule: BillingScheduleConfig;
  onChangeSchedule: (newSchedule: BillingScheduleConfig) => void;
  mode?: 'billing' | 'service';
}

const DEFAULT_SCHEDULE: BillingScheduleConfig = {
  enabled: true,
  preset: 'commercial',
  startTime: '09:00',
  endTime: '18:00',
  allowedDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
  blockWeekends: true,
  blockHolidays: true,
  pauseDuringLunch: true,
  lunchStart: '12:00',
  lunchEnd: '13:30',
  queueOutOfWindow: true,
  timezone: 'America/Sao_Paulo'
};

const DAY_LABELS: { id: string; label: string; full: string }[] = [
  { id: 'seg', label: 'Seg', full: 'Segunda-feira' },
  { id: 'ter', label: 'Ter', full: 'Terça-feira' },
  { id: 'qua', label: 'Qua', full: 'Quarta-feira' },
  { id: 'qui', label: 'Qui', full: 'Quinta-feira' },
  { id: 'sex', label: 'Sex', full: 'Sexta-feira' },
  { id: 'sab', label: 'Sáb', full: 'Sábado' },
  { id: 'dom', label: 'Dom', full: 'Domingo' }
];

export const BillingScheduleSection: React.FC<BillingScheduleSectionProps> = ({
  schedule = DEFAULT_SCHEDULE,
  onChangeSchedule,
  mode = 'billing'
}) => {
  const isService = mode === 'service';
  const currentSchedule: BillingScheduleConfig = {
    ...DEFAULT_SCHEDULE,
    ...schedule
  };

  // Real-time current time tracker
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDayId, setCurrentDayId] = useState<string>('');
  const [isCurrentlyAllowed, setIsCurrentlyAllowed] = useState<boolean>(false);
  const [windowReason, setWindowReason] = useState<string>('');

  useEffect(() => {
    const updateTimeState = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      setCurrentTime(timeString);

      // Day mapping (0 = Dom, 1 = Seg...)
      const dayIndex = now.getDay();
      const dayMap: Record<number, string> = {
        0: 'dom',
        1: 'seg',
        2: 'ter',
        3: 'qua',
        4: 'qui',
        5: 'sex',
        6: 'sab'
      };
      const todayId = dayMap[dayIndex] || 'seg';
      setCurrentDayId(todayId);

      // Check if within window
      if (!currentSchedule.enabled) {
        setIsCurrentlyAllowed(true);
        setWindowReason(isService ? 'Restrições de atendimento desativadas (respostas 24h ativas)' : 'Restrições de horário desativadas (envios a qualquer hora)');
        return;
      }

      // Check day
      const isDayAllowed = currentSchedule.allowedDays.includes(todayId);
      if (!isDayAllowed) {
        setIsCurrentlyAllowed(false);
        setWindowReason(`Hoje (${DAY_LABELS.find(d => d.id === todayId)?.full}) está fora dos dias permitidos para ${isService ? 'atendimento' : 'cobrança'}.`);
        return;
      }

      // Check hours
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = currentSchedule.startTime.split(':').map(Number);
      const [endH, endM] = currentSchedule.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + (startM || 0);
      const endMinutes = endH * 60 + (endM || 0);

      if (currentMinutes < startMinutes) {
        setIsCurrentlyAllowed(false);
        setWindowReason(`Envios suspensos até às ${currentSchedule.startTime} (horário matutino protegido).`);
        return;
      }

      if (currentMinutes > endMinutes) {
        setIsCurrentlyAllowed(false);
        setWindowReason(`Envios suspensos após as ${currentSchedule.endTime} (silêncio noturno para descanso do cliente).`);
        return;
      }

      // Check lunch pause
      if (currentSchedule.pauseDuringLunch && currentSchedule.lunchStart && currentSchedule.lunchEnd) {
        const [lStartH, lStartM] = currentSchedule.lunchStart.split(':').map(Number);
        const [lEndH, lEndM] = currentSchedule.lunchEnd.split(':').map(Number);
        const lunchStartMin = lStartH * 60 + (lStartM || 0);
        const lunchEndMin = lEndH * 60 + (lEndM || 0);

        if (currentMinutes >= lunchStartMin && currentMinutes <= lunchEndMin) {
          setIsCurrentlyAllowed(false);
          setWindowReason(`Pausa para almoço ativa (${currentSchedule.lunchStart} às ${currentSchedule.lunchEnd}).`);
          return;
        }
      }

      setIsCurrentlyAllowed(true);
      setWindowReason(`Janela ativa (${currentSchedule.startTime} às ${currentSchedule.endTime}) — Envios autorizados.`);
    };

    updateTimeState();
    const interval = setInterval(updateTimeState, 15000);
    return () => clearInterval(interval);
  }, [currentSchedule]);

  const handleToggleEnabled = () => {
    onChangeSchedule({
      ...currentSchedule,
      enabled: !currentSchedule.enabled
    });
  };

  const handleApplyPreset = (preset: 'commercial' | 'morning' | 'afternoon' | 'custom') => {
    if (preset === 'commercial') {
      onChangeSchedule({
        ...currentSchedule,
        preset: 'commercial',
        startTime: '09:00',
        endTime: '18:00',
        pauseDuringLunch: true,
        lunchStart: '12:00',
        lunchEnd: '13:30',
        allowedDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
        blockWeekends: true
      });
    } else if (preset === 'morning') {
      onChangeSchedule({
        ...currentSchedule,
        preset: 'morning',
        startTime: '10:00',
        endTime: '12:00',
        pauseDuringLunch: false,
        allowedDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
        blockWeekends: true
      });
    } else if (preset === 'afternoon') {
      onChangeSchedule({
        ...currentSchedule,
        preset: 'afternoon',
        startTime: '14:00',
        endTime: '17:30',
        pauseDuringLunch: false,
        allowedDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
        blockWeekends: true
      });
    } else {
      onChangeSchedule({
        ...currentSchedule,
        preset: 'custom'
      });
    }
  };

  const handleToggleDay = (dayId: string) => {
    const exists = currentSchedule.allowedDays.includes(dayId);
    let updated: string[];
    if (exists) {
      if (currentSchedule.allowedDays.length <= 1) return; // Não permitir lista vazia
      updated = currentSchedule.allowedDays.filter(d => d !== dayId);
    } else {
      updated = [...currentSchedule.allowedDays, dayId];
    }
    onChangeSchedule({
      ...currentSchedule,
      preset: 'custom',
      allowedDays: updated,
      blockWeekends: !updated.includes('sab') && !updated.includes('dom')
    });
  };

  const handleSelectWeekdaysOnly = () => {
    onChangeSchedule({
      ...currentSchedule,
      preset: 'custom',
      allowedDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
      blockWeekends: true
    });
  };

  const handleSelectWeekdaysAndSaturday = () => {
    onChangeSchedule({
      ...currentSchedule,
      preset: 'custom',
      allowedDays: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
      blockWeekends: false
    });
  };

  // Warning for inconvenient late hours (> 20:00 or < 08:00)
  const isLateHour = () => {
    const [h] = (currentSchedule.endTime || '18:00').split(':').map(Number);
    return h >= 20;
  };
  const isTooEarly = () => {
    const [h] = (currentSchedule.startTime || '09:00').split(':').map(Number);
    return h < 8;
  };

  return (
    <div className="bg-white border border-[#E8EAED] rounded-xl p-5 sm:p-6 space-y-5 shadow-xs font-sans">
      
      {/* 1. Header with Active Switch and Real-Time Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8EAED] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isService ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-[#F97316]'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#202124]">
                {isService 
                  ? 'Horário Preferencial de Atendimento & Proteção ao Cliente' 
                  : 'Horário Preferencial de Cobrança & Proteção ao Cliente'}
              </h3>
              <p className="text-xs text-[#5F6368] mt-0.5">
                {isService
                  ? 'Restringe as respostas e interações da IA via WhatsApp a horários convenientes de expediente, evitando incômodos.'
                  : 'Restringe os avisos automáticos de parcelas e Pix via WhatsApp a horários convenientes, evitando incômodos.'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Pill & Master Toggle */}
        <div className="flex items-center gap-3 self-start md:self-center">
          <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border ${
            isCurrentlyAllowed 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isCurrentlyAllowed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`} />
            <span>{isCurrentlyAllowed ? 'Janela Aberta Agora' : 'Janela Fechada Agora'}</span>
            <span className="text-[10px] opacity-75 font-mono">({currentTime || '11:53'})</span>
          </div>

          <button
            id="toggle-billing-schedule-protection"
            type="button"
            onClick={handleToggleEnabled}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              currentSchedule.enabled ? 'bg-[#F97316]' : 'bg-[#DADCE0]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                currentSchedule.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Real-time Status Banner Details */}
      <div className={`p-3 rounded-lg border text-xs flex items-start sm:items-center justify-between gap-3 ${
        isCurrentlyAllowed
          ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900'
          : 'bg-amber-50/70 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-center gap-2">
          {isCurrentlyAllowed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 text-amber-700 shrink-0" />
          )}
          <span className="font-normal">
            <strong className="font-medium">Status de envio no WhatsApp:</strong> {windowReason}
          </span>
        </div>

        {currentSchedule.enabled && (
          <span className="text-[11px] font-medium text-[#5F6368] bg-white px-2 py-0.5 rounded shrink-0 border border-[#E8EAED]">
            Fuso: Horário de Brasília (GMT-3)
          </span>
        )}
      </div>

      {currentSchedule.enabled ? (
        <div className="space-y-5">
          
          {/* 2. Quick Presets Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#202124] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Modelos de Horário Preferencial (Presets Rápidos)</span>
              </label>
              <span className="text-[10px] text-[#5F6368]">
                Selecione um perfil ou personalize os horários
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Preset 1: Comercial Padrão */}
              <button
                type="button"
                id="preset-commercial"
                onClick={() => handleApplyPreset('commercial')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  currentSchedule.preset === 'commercial'
                    ? 'border-[#F97316] bg-white shadow-xs ring-1 ring-[#F97316]'
                    : 'border-[#E8EAED] bg-[#F8F9FA] hover:bg-white hover:border-[#DADCE0]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 rounded-lg bg-orange-50 text-[#F97316]">
                      <Briefcase className="w-4 h-4" />
                    </span>
                    {currentSchedule.preset === 'commercial' && (
                      <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                    )}
                  </div>
                  <h4 className="font-medium text-xs text-[#202124]">Comercial Padrão</h4>
                  <p className="text-[11px] text-[#5F6368] font-medium mt-0.5">09:00 às 18:00</p>
                  <p className="text-[10px] text-[#5F6368] mt-1.5 leading-snug">
                    Ideal para projetos de marcenaria e arquitetura residencial. Pausa almoço ativa.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#E8EAED] flex items-center justify-between text-[10px] text-[#5F6368] font-medium">
                  <span>Segunda a Sexta</span>
                  <span className="text-emerald-700 font-semibold">Mais Seguro</span>
                </div>
              </button>

              {/* Preset 2: Meio da Manhã */}
              <button
                type="button"
                id="preset-morning"
                onClick={() => handleApplyPreset('morning')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  currentSchedule.preset === 'morning'
                    ? 'border-[#F97316] bg-white shadow-xs ring-1 ring-[#F97316]'
                    : 'border-[#E8EAED] bg-[#F8F9FA] hover:bg-white hover:border-[#DADCE0]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 rounded-lg bg-amber-50 text-amber-800">
                      <Sun className="w-4 h-4" />
                    </span>
                    {currentSchedule.preset === 'morning' && (
                      <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                    )}
                  </div>
                  <h4 className="font-medium text-xs text-[#202124]">Meio da Manhã</h4>
                  <p className="text-[11px] text-[#5F6368] font-medium mt-0.5">10:00 às 12:00</p>
                  <p className="text-[10px] text-[#5F6368] mt-1.5 leading-snug">
                    Pico de atenção matinal do cliente no celular antes do intervalo de almoço.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#E8EAED] flex items-center justify-between text-[10px] text-[#5F6368] font-medium">
                  <span>Segunda a Sexta</span>
                  <span className="text-amber-800 font-semibold">Alta Abertura</span>
                </div>
              </button>

              {/* Preset 3: Tarde Produtiva */}
              <button
                type="button"
                id="preset-afternoon"
                onClick={() => handleApplyPreset('afternoon')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  currentSchedule.preset === 'afternoon'
                    ? 'border-[#F97316] bg-white shadow-xs ring-1 ring-[#F97316]'
                    : 'border-[#E8EAED] bg-[#F8F9FA] hover:bg-white hover:border-[#DADCE0]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800">
                      <Coffee className="w-4 h-4" />
                    </span>
                    {currentSchedule.preset === 'afternoon' && (
                      <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                    )}
                  </div>
                  <h4 className="font-medium text-xs text-[#202124]">Tarde Produtiva</h4>
                  <p className="text-[11px] text-[#5F6368] font-medium mt-0.5">14:00 às 17:30</p>
                  <p className="text-[10px] text-[#5F6368] mt-1.5 leading-snug">
                    Depois do almoço e dentro do expediente de conciliação bancária do cliente.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#E8EAED] flex items-center justify-between text-[10px] text-[#5F6368] font-medium">
                  <span>Segunda a Sexta</span>
                  <span className="text-blue-700 font-semibold">Expediente Pix</span>
                </div>
              </button>

              {/* Preset 4: Personalizado */}
              <button
                type="button"
                id="preset-custom"
                onClick={() => handleApplyPreset('custom')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  currentSchedule.preset === 'custom'
                    ? 'border-[#F97316] bg-white shadow-xs ring-1 ring-[#F97316]'
                    : 'border-[#E8EAED] bg-[#F8F9FA] hover:bg-white hover:border-[#DADCE0]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 rounded-lg bg-slate-100 text-[#5F6368]">
                      <Sliders className="w-4 h-4" />
                    </span>
                    {currentSchedule.preset === 'custom' && (
                      <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                    )}
                  </div>
                  <h4 className="font-medium text-xs text-[#202124]">Personalizado</h4>
                  <p className="text-[11px] text-[#5F6368] font-medium mt-0.5">
                    {currentSchedule.startTime} às {currentSchedule.endTime}
                  </p>
                  <p className="text-[10px] text-[#5F6368] mt-1.5 leading-snug">
                    Ajuste manualmente início, término e intervalo de almoço conforme a sua oficina.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#E8EAED] flex items-center justify-between text-[10px] text-[#5F6368] font-medium">
                  <span>Manual</span>
                  <span className="text-[#F97316] font-semibold">Sob Medida</span>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Horários de Envio & Almoço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Bloco Janela Principal */}
            <div className="bg-[#F8F9FA] p-4 sm:p-5 rounded-xl border border-[#E8EAED] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#202124] flex items-center gap-1.5">
                  <Sun className={`w-4 h-4 ${isService ? 'text-emerald-600' : 'text-[#F97316]'}`} />
                  <span>{isService ? 'Janela Diária de Atendimento' : 'Janela Diária de Cobrança'}</span>
                </span>
                <span className="text-[10px] font-medium text-[#5F6368]">Horário Oficial</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-[#5F6368] mb-1">
                    Não enviar antes das
                  </label>
                  <input
                    id="billing-start-time"
                    type="time"
                    value={currentSchedule.startTime}
                    onChange={(e) => {
                      onChangeSchedule({
                        ...currentSchedule,
                        preset: 'custom',
                        startTime: e.target.value
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] bg-white focus:outline-none focus:border-[#F97316] text-xs font-mono font-medium text-[#202124]"
                  />
                  <span className="text-[10px] text-[#5F6368] mt-0.5 block">Ex: 09:00</span>
                </div>

                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-[#5F6368] mb-1">
                    Não enviar após as
                  </label>
                  <input
                    id="billing-end-time"
                    type="time"
                    value={currentSchedule.endTime}
                    onChange={(e) => {
                      onChangeSchedule({
                        ...currentSchedule,
                        preset: 'custom',
                        endTime: e.target.value
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] bg-white focus:outline-none focus:border-[#F97316] text-xs font-mono font-medium text-[#202124]"
                  />
                  <span className="text-[10px] text-[#5F6368] mt-0.5 block">Ex: 18:00</span>
                </div>
              </div>

              {/* Warning for inconvenient hours */}
              {(isLateHour() || isTooEarly()) && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Atenção:</strong> Envios antes das 08h ou após as 20h são considerados inconvenientes para a rotina do cliente residencial e podem gerar atrito no relacionamento.
                  </span>
                </div>
              )}
            </div>

            {/* Bloco Pausa no Almoço */}
            <div className="bg-[#F8F9FA] p-4 sm:p-5 rounded-xl border border-[#E8EAED] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#202124] flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-700" />
                  <span>Pausa no Horário de Almoço</span>
                </span>
                <button
                  type="button"
                  id="toggle-lunch-pause"
                  onClick={() => {
                    onChangeSchedule({
                      ...currentSchedule,
                      preset: 'custom',
                      pauseDuringLunch: !currentSchedule.pauseDuringLunch
                    });
                  }}
                  className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                    currentSchedule.pauseDuringLunch
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[#E8EAED] text-[#5F6368]'
                  }`}
                >
                  {currentSchedule.pauseDuringLunch ? 'Pausa Ativa' : 'Desativado'}
                </button>
              </div>

              <p className="text-[11px] text-[#5F6368]">
                Silencia avisos durante a refeição e repouso do cliente para preservar a boa relação.
              </p>

              {currentSchedule.pauseDuringLunch && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wider text-[#5F6368] mb-1">
                      Início da Pausa
                    </label>
                    <input
                      type="time"
                      value={currentSchedule.lunchStart || '12:00'}
                      onChange={(e) => {
                        onChangeSchedule({
                          ...currentSchedule,
                          preset: 'custom',
                          lunchStart: e.target.value
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] bg-white focus:outline-none focus:border-[#F97316] text-xs font-mono font-medium text-[#202124]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wider text-[#5F6368] mb-1">
                      Fim da Pausa
                    </label>
                    <input
                      type="time"
                      value={currentSchedule.lunchEnd || '13:30'}
                      onChange={(e) => {
                        onChangeSchedule({
                          ...currentSchedule,
                          preset: 'custom',
                          lunchEnd: e.target.value
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] bg-white focus:outline-none focus:border-[#F97316] text-xs font-mono font-medium text-[#202124]"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* 4. Dias da Semana Permitidos */}
          <div className="bg-[#F8F9FA] p-4 sm:p-5 rounded-xl border border-[#E8EAED] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#202124] flex items-center gap-1.5">
                <Calendar className={`w-4 h-4 ${isService ? 'text-emerald-600' : 'text-[#F97316]'}`} />
                <span>{isService ? 'Dias Permitidos para Atendimento via WhatsApp' : 'Dias Permitidos para Envio de Cobrança'}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectWeekdaysOnly}
                  className={`text-[10px] font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                    isService ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'bg-orange-50 hover:bg-orange-100 text-[#F97316]'
                  }`}
                >
                  Somente Dias Úteis (Seg - Sex)
                </button>
                <button
                  type="button"
                  onClick={handleSelectWeekdaysAndSaturday}
                  className="text-[10px] font-medium px-2 py-1 rounded-lg bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] text-[#5F6368] transition-colors cursor-pointer"
                >
                  Incluir Sábado
                </button>
              </div>
            </div>

            {/* Day Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {DAY_LABELS.map((day) => {
                const isSelected = currentSchedule.allowedDays.includes(day.id);
                const isWeekend = day.id === 'sab' || day.id === 'dom';
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => handleToggleDay(day.id)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? isWeekend 
                          ? 'bg-amber-600 text-white shadow-xs' 
                          : 'bg-[#202124] text-white shadow-xs'
                        : 'bg-white text-[#5F6368] hover:bg-[#F8F9FA] border border-[#DADCE0]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{day.label}</span>
                    {day.id === currentDayId && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Hoje" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-2 text-[11px] text-[#5F6368]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentSchedule.blockHolidays}
                  onChange={(e) => {
                    onChangeSchedule({
                      ...currentSchedule,
                      blockHolidays: e.target.checked
                    });
                  }}
                  className="rounded text-[#F97316] focus:ring-[#F97316]"
                />
                <span>Bloquear automaticamente feriados nacionais brasileiros</span>
              </label>
            </div>
          </div>

          {/* 5. Comportamento Inteligente Fora da Janela (Fila Silenciosa) */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED] space-y-3">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0 border border-orange-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-[#202124]">
                    Fila Silenciosa de Agendamento Automático
                  </h4>
                  <p className="text-[11px] text-[#5F6368]">
                    O que ocorre quando uma parcela vence à noite, de madrugada ou em um domingo?
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Proteção Ativa
                </span>
              </div>
            </div>

            {/* Visual Workflow Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
              <div className="p-3 rounded-lg bg-white border border-[#E8EAED]">
                <span className="text-[10px] font-semibold text-[#F97316] block mb-0.5">PASSO 1</span>
                <span className="font-medium text-[#202124] block text-xs">Parcela vence fora do horário</span>
                <span className="text-[10px] text-[#5F6368] block mt-0.5">Ex: Domingo às 21h15</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-[#E8EAED]">
                <span className="text-[10px] font-semibold text-amber-700 block mb-0.5">PASSO 2</span>
                <span className="font-medium text-[#202124] block text-xs">Fila Silenciosa Retém o Envio</span>
                <span className="text-[10px] text-[#5F6368] block mt-0.5">Nenhuma notificação perturba o cliente</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-[#E8EAED]">
                <span className="text-[10px] font-semibold text-emerald-700 block mb-0.5">PASSO 3</span>
                <span className="font-medium text-[#202124] block text-xs">Disparo no Horário Elegante</span>
                <span className="text-[10px] text-[#5F6368] block mt-0.5">Segunda-feira às {currentSchedule.startTime}</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Disabled Message State */
        <div className="p-6 rounded-xl bg-white border border-[#E8EAED] text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
          <h4 className="font-semibold text-sm text-[#202124]">
            {isService ? 'Restrição de Horário de Atendimento Desativada' : 'Restrição de Horário Desativada'}
          </h4>
          <p className="text-xs text-[#5F6368] max-w-md mx-auto">
            {isService
              ? 'Mensagens e respostas no WhatsApp poderão ser enviadas pela IA a qualquer momento fora do expediente comercial. Recomendamos ativar para preservar horários convenientes de atendimento.'
              : 'Mensagens de cobrança poderão ser disparadas a qualquer momento em que uma etapa for concluída ou parcela vencer. Recomendamos ativar para preservar a satisfação dos clientes.'}
          </p>
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`mt-2 py-2 px-4 rounded-lg text-white text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              isService ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#F97316] hover:bg-[#EA580C]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isService ? 'Ativar Horário de Atendimento Agora' : 'Ativar Proteção de Horários Agora'}</span>
          </button>
        </div>
      )}

    </div>
  );
};
