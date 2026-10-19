import React, { useState } from 'react';
import { 
  Project, 
  ActiveView 
} from '../types';
import { buildClientPortalUrl } from '../utils/portalUrl';
import { 
  Send, 
  Sparkles, 
  Paperclip, 
  Camera, 
  Mic, 
  MoreVertical, 
  Phone, 
  Video, 
  ArrowLeft, 
  CheckCheck, 
  QrCode, 
  ExternalLink,
  Bot
} from 'lucide-react';

interface WhatsAppSimulatorModalProps {
  project: Project;
  onClose: () => void;
  onSelectView: (view: ActiveView) => void;
  initialDraft?: string;
}

interface ChatMessage {
  id: string;
  sender: 'client' | 'marcenaria';
  text: string;
  time: string;
  photoUrl?: string;
  isAi?: boolean;
}

export const WhatsAppSimulatorModal: React.FC<WhatsAppSimulatorModalProps> = ({
  project,
  onClose,
  onSelectView,
  initialDraft
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'marcenaria',
      text: `Olá ${project.clientName.split(' ')[0]}! Tudo bem? Aqui é da equipe de gestão do projeto ${project.code}. Você pode acompanhar cada atualização da execução pelo seu link seguro: ${buildClientPortalUrl(project.id)}`,
      time: 'Ontem 14:20',
      isAi: true
    },
    {
      id: 'm2',
      sender: 'marcenaria',
      text: `Boletim do Projeto: As etapas estruturais do seu projeto já avançaram para execução técnica e acabamento. Todos os testes de qualidade foram 100% aprovados!`,
      time: 'Hoje 11:16',
      photoUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
      isAi: true
    },
    {
      id: 'm3',
      sender: 'client',
      text: `Maravilha! Ficou excelente o andamento.`,
      time: 'Hoje 11:30'
    }
  ]);

  const [inputText, setInputText] = useState(initialDraft || '');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (customQuestion?: string) => {
    const questionText = customQuestion || inputText;
    if (!questionText.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'client',
      text: questionText,
      time: 'Agora'
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customQuestion) setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/chat-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          projectCode: project.id
        })
      });
      const data = await res.json();
      
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'marcenaria',
        text: data.reply || `Olá! O seu projeto está na etapa de ${project.currentStage} com entrega para ${project.deliveryDate}.`,
        time: 'Agora',
        isAi: true
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'marcenaria',
          text: `Olá! Seu projeto (${project.title}) está na etapa de "${project.currentStage}" e a entrega segue confirmada para ${project.deliveryDate}.`,
          time: 'Agora',
          isAi: true
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-4 sm:py-6 px-2 sm:px-4 flex flex-col items-center justify-center font-sans">
      
      {/* Simulator Frame with responsive height and width */}
      <div className="w-full max-w-full sm:max-w-[430px] bg-[#EFEAE2] rounded-2xl sm:rounded-[32px] overflow-hidden shadow-xl border border-[#E8EAED] sm:border-[5px] sm:border-[#202124] flex flex-col h-[calc(100vh-110px)] max-h-[760px] min-h-[520px]">
        
        {/* WhatsApp Top Header */}
        <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <button onClick={onClose} className="p-1 -ml-1 text-white hover:bg-white/10 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-orange-100 text-[#F97316] flex items-center justify-center font-bold text-sm">
                BP
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#075E54] absolute bottom-0 right-0"></span>
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight flex items-center gap-1">
                <span>Gestão de Projetos</span>
                <Bot className="w-3.5 h-3.5 text-emerald-300" />
              </h3>
              <p className="text-[10px] text-white/80">
                {isTyping ? 'Digitando resposta com IA...' : 'Online • IA Ativa no WhatsApp'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/90">
            <button onClick={() => onSelectView('client_portal')} title="Abrir Portal do Cliente" className="p-1 hover:bg-white/10 rounded-full">
              <ExternalLink className="w-4 h-4 text-orange-200" />
            </button>
            <MoreVertical className="w-4 h-4" />
          </div>
        </div>

        {/* Chat History Messages */}
        <div 
          className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#EFEAE2]"
          style={{
            backgroundImage: 'radial-gradient(#D3C8BB 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }}
        >
          {/* Security Banner */}
          <div className="bg-[#FFF3CD] border border-[#FFE69C] rounded-xl p-2 text-center text-[10px] text-[#664D03] shadow-2xs max-w-[280px] mx-auto">
            🔒 Mensagens protegidas. Respostas técnicas alimentadas pelo motor de IA do <strong>BOMProjeto</strong>.
          </div>

          {messages.map((msg) => {
            const isMe = msg.sender === 'client';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-2.5 text-xs shadow-xs space-y-1.5 ${
                    isMe
                      ? 'bg-[#E7FED6] text-[#202124] rounded-tr-none'
                      : 'bg-white text-[#202124] rounded-tl-none'
                  }`}
                >
                  {msg.photoUrl && (
                    <div className="rounded-xl overflow-hidden max-h-40 border border-[#E8EAED]">
                      <img src={msg.photoUrl} alt="Foto da produção" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  <div className="flex items-center justify-end gap-1 text-[9px] text-[#5F6368]">
                    {msg.isAi && (
                      <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 rounded font-medium">
                        IA BOMProjeto
                      </span>
                    )}
                    <span>{msg.time}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-blue-500" />}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl w-24 text-[10px] text-[#5F6368] shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F6368] animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F6368] animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5F6368] animate-bounce [animation-delay:0.4s]"></span>
            </div>
          )}
        </div>

        {/* Quick Question Prompts */}
        <div className="p-2 bg-[#F0F2F5] border-t border-[#D3C8BB] overflow-x-auto flex gap-1.5 text-[11px] whitespace-nowrap">
          <button
            onClick={() => handleSend('Quando vai ser a entrega do meu projeto?')}
            className="px-2.5 py-1 rounded-full bg-white border border-[#DADCE0] hover:bg-[#E7FED6] font-medium text-[#202124] transition-colors"
          >
            🗓️ Quando é a entrega?
          </button>
          <button
            onClick={() => handleSend('Qual a chave Pix da segunda parcela?')}
            className="px-2.5 py-1 rounded-full bg-white border border-[#DADCE0] hover:bg-[#E7FED6] font-medium text-[#202124] transition-colors"
          >
            💳 Chave Pix 2ª Parcela
          </button>
          <button
            onClick={() => handleSend('Tem fotos novas da execução do projeto?')}
            className="px-2.5 py-1 rounded-full bg-white border border-[#DADCE0] hover:bg-[#E7FED6] font-medium text-[#202124] transition-colors"
          >
            📸 Fotos da execução
          </button>
        </div>

        {/* Input Bar */}
        <div className="bg-[#F0F2F5] p-2 flex items-center gap-1.5 border-t border-[#E8EAED]">
          <input
            type="text"
            placeholder="Mensagem no WhatsApp..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 bg-white rounded-full px-3.5 py-2 text-xs text-[#202124] focus:outline-none shadow-xs border border-transparent focus:border-[#075E54]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-full bg-[#075E54] hover:bg-[#128C7E] text-white flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Simulator Explanatory Note */}
      <div className="mt-3 text-center text-xs text-[#5F6368] max-w-sm">
        💡 <strong>Simulação Ponta a Ponta:</strong> Faça perguntas reais como cliente. A Inteligência Artificial do BOMProjeto responde instantaneamente com os dados verídicos da OS!
      </div>

    </div>
  );
};
