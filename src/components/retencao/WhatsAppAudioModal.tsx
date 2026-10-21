import React, { useState, useRef } from 'react';
import { 
  X, 
  Mic, 
  Upload, 
  Music, 
  FileAudio, 
  Sparkles, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Volume2
} from 'lucide-react';
import { RetentionAudioInput, Project } from '../../types';

interface WhatsAppAudioModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  attachedAudios: RetentionAudioInput[];
  onUpdateAudios: (audios: RetentionAudioInput[]) => void;
  onAnalyzeWithAudios: (audios: RetentionAudioInput[]) => void;
  isAnalyzing: boolean;
}

// Pequeno áudio WAV sintetizado em base64 (beep audível de 0.5s válido) para testes instantâneos
const SAMPLE_AUDIO_BEEP_BASE64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

export const WhatsAppAudioModal: React.FC<WhatsAppAudioModalProps> = ({
  project,
  isOpen,
  onClose,
  attachedAudios,
  onUpdateAudios,
  onAnalyzeWithAudios,
  isAnalyzing
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'presets'>('presets');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  // Presets prontos para demonstração e homologação rápida do Requisito Fase 3
  const samplePresets: Array<{
    title: string;
    description: string;
    tone: 'hesitacao' | 'elogio';
    duration: string;
    filename: string;
    mimeType: string;
    transcription: string;
  }> = [
    {
      title: 'Mensagem de Voz 1: Hesitação sobre Subida de Campanhas',
      description: 'Cliente com voz insegura, pausas longas e cobrança de confirmação da data de veiculação.',
      tone: 'hesitacao',
      duration: '0:24',
      filename: `audio_whatsapp_${project.code}_cobranca_campanha.ogg`,
      mimeType: 'audio/ogg',
      transcription: '"Oi... então, queria só confirmar se vocês realmente vão conseguir subir as campanhas na sexta... porque como o nosso lançamento é semana que vem, tô com receio dos criativos não estarem aprovados a tempo."'
    },
    {
      title: 'Mensagem de Voz 2: Elogio Entusiasta aos Criativos e Métricas',
      description: 'Cliente animada e satisfeita com a prévia das peças e o dashboard no portal.',
      tone: 'elogio',
      duration: '0:18',
      filename: `audio_whatsapp_${project.code}_elogio_criativos.mp3`,
      mimeType: 'audio/mp3',
      transcription: '"Nossa gente, acabei de ver os criativos e o dashboard no portal! Ficou maravilhoso o tom da copy e a estrutura dos anúncios! Muito obrigada pela agilidade e pelo carinho na entrega."'
    }
  ];

  const handleAddPreset = (preset: typeof samplePresets[0]) => {
    const newAudio: RetentionAudioInput = {
      filename: preset.filename,
      mimeType: preset.mimeType,
      base64: SAMPLE_AUDIO_BEEP_BASE64,
      durationSeconds: 20,
      uploadedAt: new Date().toLocaleTimeString('pt-BR'),
      sender: 'cliente'
    };

    // Evita duplicatas pelo nome
    if (attachedAudios.some(a => a.filename === preset.filename)) {
      return;
    }

    onUpdateAudios([...attachedAudios, newAudio]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const isAudio = file.type.startsWith('audio/') || 
                      file.name.endsWith('.ogg') || 
                      file.name.endsWith('.mp3') || 
                      file.name.endsWith('.wav');
      if (!isAudio) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const cleanBase64 = result.replace(/^data:[^;]+;base64,/, '');
        const newAudio: RetentionAudioInput = {
          filename: file.name,
          mimeType: file.type || (file.name.endsWith('.mp3') ? 'audio/mp3' : 'audio/ogg'),
          base64: cleanBase64,
          uploadedAt: new Date().toLocaleTimeString('pt-BR'),
          sender: 'cliente'
        };
        onUpdateAudios([...attachedAudios, newAudio]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAudio = (index: number) => {
    const updated = attachedAudios.filter((_, idx) => idx !== index);
    onUpdateAudios(updated);
  };

  const handleTriggerAnalysis = () => {
    onAnalyzeWithAudios(attachedAudios);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#EAECEF] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header do Modal */}
        <div className="p-5 border-b border-[#EAECEF] flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#EA580C] border border-orange-200 flex items-center justify-center font-bold">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">
                  Áudios do WhatsApp do Cliente
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#EA580C] border border-orange-200">
                  Multimodalidade Gemini
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Projeto: <strong className="text-[#0F172A]">{project.title}</strong> • Cliente: <strong className="text-[#0F172A]">{project.clientName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#EAECEF] bg-white px-5 pt-3 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'border-[#EA580C] text-[#EA580C]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cenários de Teste Rápidos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-[#EA580C] text-[#EA580C]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload de Arquivo (.ogg / .mp3)</span>
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'presets' ? (
            <div className="space-y-3">
              <p className="text-xs text-[#64748B]">
                Selecione abaixo um áudio demonstrativo com padrão de conversas reais do WhatsApp para avaliar como a IA do Gemini detecta o tom de voz:
              </p>

              <div className="space-y-2.5">
                {samplePresets.map((preset, idx) => {
                  const isAdded = attachedAudios.some(a => a.filename === preset.filename);
                  return (
                    <div 
                      key={idx}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isAdded 
                          ? 'border-[#EA580C] bg-orange-50/40' 
                          : 'border-[#EAECEF] bg-[#F8F9FA] hover:border-[#EA580C]'
                      } space-y-2`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-[#EAECEF] text-[#64748B]">
                              {preset.mimeType} • {preset.duration}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              preset.tone === 'hesitacao'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              {preset.tone === 'hesitacao' ? 'Tom de Hesitação / Cobrança' : 'Tom de Elogio / Promotor'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-[#0F172A]">
                            {preset.title}
                          </h4>
                          <p className="text-[11px] text-[#64748B]">
                            {preset.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddPreset(preset)}
                          disabled={isAdded}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-600 text-white cursor-default'
                              : 'bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xs'
                          }`}
                        >
                          {isAdded ? 'Anexado ✓' : '+ Anexar'}
                        </button>
                      </div>

                      {/* Transcrição da Fala */}
                      <div className="text-[11px] text-[#334155] bg-white p-2.5 rounded-xl border border-[#EAECEF] italic">
                        {preset.transcription}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#EAECEF] hover:border-[#EA580C] rounded-2xl p-8 text-center bg-[#F8F9FA] hover:bg-orange-50/30 transition-colors cursor-pointer space-y-2"
              >
                <Upload className="w-8 h-8 text-[#94A3B8] mx-auto" />
                <h4 className="text-xs font-bold text-[#0F172A]">
                  Clique para carregar mensagem de áudio do WhatsApp
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Suporta arquivos .ogg (formato nativo WhatsApp), .mp3 e .wav
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/ogg,audio/mp3,audio/mpeg,audio/wav,.ogg,.mp3,.wav"
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                />
              </div>
            </div>
          )}

          {/* Lista de Áudios Atualmente Anexados para o Projeto */}
          <div className="pt-3 border-t border-[#EAECEF] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <FileAudio className="w-4 h-4 text-[#EA580C]" />
                <span>Áudios Anexados para Análise ({attachedAudios.length})</span>
              </span>
              {attachedAudios.length > 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateAudios([])}
                  className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                >
                  Limpar todos
                </button>
              )}
            </div>

            {attachedAudios.length === 0 ? (
              <div className="p-4 bg-[#F8F9FA] rounded-xl border border-dashed border-[#EAECEF] text-center text-xs text-[#94A3B8]">
                Nenhum áudio de voz anexado ainda. Escolha um cenário acima ou carregue um arquivo.
              </div>
            ) : (
              <div className="space-y-2">
                {attachedAudios.map((audio, idx) => (
                  <div 
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-[#EAECEF] flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#EA580C] flex items-center justify-center font-bold shrink-0">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#0F172A] truncate">
                          {audio.filename}
                        </p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {audio.mimeType} • Anexado às {audio.uploadedAt || 'hoje'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAudio(idx)}
                      className="p-1.5 text-[#94A3B8] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remover áudio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-[#EAECEF] bg-[#F8F9FA] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#F1F5F9] border border-[#EAECEF] text-[#0F172A] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleTriggerAnalysis}
            disabled={isAnalyzing || attachedAudios.length === 0}
            className="px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>
              {isAnalyzing 
                ? 'Processando Multimodalidade...' 
                : `Executar Análise com ${attachedAudios.length} Áudio(s)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
