import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Crown, 
  ShieldCheck, 
  Handshake, 
  Mail, 
  Phone, 
  Check, 
  Copy, 
  Trash2, 
  AlertCircle, 
  Zap, 
  Lock, 
  MessageSquare,
  Eye,
  X
} from 'lucide-react';
import { 
  TeamRole, 
  TeamMember, 
  SubscriptionPlan, 
  Workspace, 
  TEAM_ROLE_CONFIGS 
} from '../types';
import { getPlanLimits, canInviteTeamMember } from '../utils/planRules';

interface TeamManagementSectionProps {
  plan: SubscriptionPlan;
  teamMembers: TeamMember[];
  workspaces: Workspace[];
  currentRole: TeamRole;
  onRoleChange: (role: TeamRole) => void;
  onInviteMember: (data: {
    name: string;
    email: string;
    role: TeamRole;
    phone?: string;
    workspaceAccess: 'all' | string[];
  }) => Promise<{ inviteLink?: string; message?: string }>;
  onUpdateMemberRole: (memberId: string, role: TeamRole) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  onResendInvite: (memberId: string) => Promise<{ inviteLink?: string }>;
  onOpenSubscriptionModal: () => void;
}

export const TeamManagementSection: React.FC<TeamManagementSectionProps> = ({
  plan,
  teamMembers,
  workspaces,
  currentRole,
  onRoleChange,
  onInviteMember,
  onUpdateMemberRole,
  onRemoveMember,
  onResendInvite,
  onOpenSubscriptionModal
}) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<TeamRole>('admin');
  const [workspaceSelection, setWorkspaceSelection] = useState<'all' | string[]>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Invite link feedback dialog
  const [generatedInvite, setGeneratedInvite] = useState<{
    name: string;
    email: string;
    role: TeamRole;
    phone?: string;
    link: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit role modal state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const planLimits = getPlanLimits(plan);

  const handleOpenInvite = () => {
    if (!planLimits.hasTeamMode) {
      onOpenSubscriptionModal();
      return;
    }
    setErrorMessage(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('admin');
    setWorkspaceSelection('all');
    setIsInviteModalOpen(true);
  };

  const handleSendInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMessage('Por favor preencha o nome e o e-mail do colaborador.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await onInviteMember({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        phone: phone.trim() || undefined,
        workspaceAccess: workspaceSelection
      });

      setIsInviteModalOpen(false);

      if (res.inviteLink) {
        setGeneratedInvite({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          phone: phone.trim() || undefined,
          link: res.inviteLink
        });
      }
    } catch (err: any) {
      console.error('[Invite Error]:', err);
      setErrorMessage(err.message || 'Erro ao gerar convite para o colaborador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!generatedInvite?.link) return;
    navigator.clipboard.writeText(generatedInvite.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsAppInvite = () => {
    if (!generatedInvite) return;
    const cleanPhone = (generatedInvite.phone || '').replace(/\D/g, '');
    const roleLabel = TEAM_ROLE_CONFIGS[generatedInvite.role].label;
    const message = encodeURIComponent(
      `Olá ${generatedInvite.name}! Você foi convidado para gerenciar nossos projetos no BOMProjeto como *${roleLabel}*.\n\nAcesse o link para ativar sua conta e entrar na equipe:\n${generatedInvite.link}`
    );
    window.open(`https://wa.me/${cleanPhone ? (cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone) : ''}?text=${message}`, '_blank');
  };

  const handleSaveRoleEdit = async () => {
    if (!editingMember) return;
    try {
      await onUpdateMemberRole(editingMember.id, editingMember.role);
      setEditingMember(null);
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  return (
    <div className="space-y-6 font-sans">

      {/* Card de Cota de Equipe & Status do Plano */}
      <div className="bg-white border border-[#EAECEF] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-[#0F172A]">
                  Modo Time &amp; Gestão de Colaboradores
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                  Plano {planLimits.name}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {planLimits.hasTeamMode 
                  ? `Seu plano permite até ${planLimits.maxTeamMembers} pessoas na equipe gerenciando projetos com permissões.` 
                  : 'O cadastro de pessoas na equipe é autorizado a partir do Plano Start.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {planLimits.hasTeamMode ? (
              <button
                type="button"
                onClick={handleOpenInvite}
                disabled={teamMembers.length >= planLimits.maxTeamMembers}
                className="py-2.5 px-4 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>Convidar Membro</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenSubscriptionModal}
                className="py-2.5 px-4 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Desbloquear no Plano Start</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Quota */}
        {planLimits.hasTeamMode ? (
          <div className="space-y-1.5 pt-3 border-t border-[#EAECEF]">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>Membros Utilizados</span>
              <span className="font-semibold text-[#0F172A]">
                {teamMembers.length} de {planLimits.maxTeamMembers} colaboradores
              </span>
            </div>
            <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#111827] transition-all rounded-full"
                style={{ width: `${Math.min(100, (teamMembers.length / planLimits.maxTeamMembers) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Plano Grátis ativo (Acesso individual)</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Para convidar administradores ou parceiros com controle de permissões por cargo (CEO, Administrador e Parceiro), faça upgrade para o <strong>Plano Start</strong> (até 3 membros) ou <strong>Plano Scala</strong> (até 10 membros).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Role Testing / Perspective Switcher Box for the CEO */}
      <div className="p-4 sm:p-5 bg-white border border-[#EAECEF] rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#0F172A]" />
            <span className="text-xs font-bold text-[#0F172A]">
              Simular / Testar Visão por Cargo (Perspectiva Ativa)
            </span>
          </div>
          <span className="text-[11px] text-[#64748B]">
            Permite testar como o sistema é visto por cada perfil
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(['ceo', 'admin', 'parceiro'] as TeamRole[]).map((r) => {
            const conf = TEAM_ROLE_CONFIGS[r];
            const isSelected = currentRole === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onRoleChange(r)}
                className={`
                  p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between
                  ${isSelected 
                    ? 'border-[#111827] bg-[#F8F9FA] ring-1 ring-[#111827] shadow-xs' 
                    : 'border-[#EAECEF] bg-white hover:bg-[#F8F9FA] text-[#64748B]'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {r === 'ceo' && <Crown className="w-3.5 h-3.5 text-purple-600" />}
                    {r === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
                    {r === 'parceiro' && <Handshake className="w-3.5 h-3.5 text-amber-600" />}
                    <span className="font-bold text-xs text-[#0F172A]">{conf.label}</span>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[#111827]" />
                  )}
                </div>
                <span className="text-[11px] text-[#64748B] line-clamp-2 leading-tight">
                  {conf.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Membros da Equipe */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#94A3B8]">
            Colaboradores Cadastrados ({teamMembers.length})
          </h4>
          <span className="text-[11px] text-[#64748B]">
            Permissões ativas por workspace
          </span>
        </div>

        <div className="space-y-2.5">
          {teamMembers.map((member) => {
            const roleConf = TEAM_ROLE_CONFIGS[member.role];
            const isPrimaryOwner = member.email.toLowerCase() === 'henrique.ferrazms@gmail.com';

            return (
              <div
                key={member.id}
                className="bg-white border border-[#EAECEF] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#CBD5E1] transition-all shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#F1F5F9] text-[#0F172A] border border-[#EAECEF] flex items-center justify-center font-bold text-xs shrink-0">
                    {member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-[#0F172A]">
                        {member.name}
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleConf.badgeClass} flex items-center gap-1`}>
                        {member.role === 'ceo' && <Crown className="w-2.5 h-2.5" />}
                        {member.role === 'admin' && <ShieldCheck className="w-2.5 h-2.5" />}
                        {member.role === 'parceiro' && <Handshake className="w-2.5 h-2.5" />}
                        <span>{roleConf.label}</span>
                      </span>

                      {member.status === 'invited' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Convite Pendente
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-[#94A3B8]" />
                        <span>{member.email}</span>
                      </span>
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#94A3B8]" />
                          <span>{member.phone}</span>
                        </span>
                      )}
                      <span>·</span>
                      <span>
                        Acesso: {member.workspaceAccess === 'all' ? 'Todas as workspaces' : `${member.workspaceAccess.length} workspace(s)`}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#94A3B8] pt-0.5">
                      {roleConf.description}
                    </p>
                  </div>
                </div>

                {/* Ações do Membro */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {member.status === 'invited' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await onResendInvite(member.id);
                        if (res.inviteLink) {
                          setGeneratedInvite({
                            name: member.name,
                            email: member.email,
                            role: member.role,
                            phone: member.phone,
                            link: res.inviteLink
                          });
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#EAECEF] hover:bg-[#F8F9FA] text-[#0F172A] transition-colors cursor-pointer"
                      title="Reenviar convite"
                    >
                      Reenviar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setEditingMember(member)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#EAECEF] hover:bg-[#F8F9FA] text-[#0F172A] transition-colors cursor-pointer"
                    title={isPrimaryOwner ? "Alterar cargo para testes (CEO, Admin, Parceiro/Membro)" : "Alterar cargo do colaborador"}
                  >
                    Alterar Cargo
                  </button>

                  {!isPrimaryOwner && (
                    <button
                      type="button"
                      onClick={() => onRemoveMember(member.id)}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remover da equipe"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal / Formulário de Enviar Convite */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-md flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EAECEF] space-y-4 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#EAECEF] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">
                    Convidar Pessoa para o Time
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Defina quem é a pessoa, o e-mail e seu nível de acesso.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="p-2 text-[#94A3B8] hover:text-[#0F172A] rounded-xl hover:bg-[#F8F9FA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSendInviteSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5">
                  Nome Completo do Colaborador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Oliveira"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5">
                  E-mail Oficial (Login &amp; Convite) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="carlos@oficina.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5">
                  WhatsApp / Telefone (Opcional para envio de link)
                </label>
                <input
                  type="tel"
                  placeholder="+55 11 98765-4321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-[#0F172A]"
                />
              </div>

              {/* Seleção de Cargo com Detalhamento de Permissão */}
              <div className="space-y-2">
                <label className="block font-semibold text-[#0F172A]">
                  Nível de Permissão &amp; Cargo *
                </label>

                <div className="space-y-2">
                  {(['ceo', 'admin', 'parceiro'] as TeamRole[]).map((r) => {
                    const conf = TEAM_ROLE_CONFIGS[r];
                    const selected = role === r;
                    return (
                      <label
                        key={r}
                        onClick={() => setRole(r)}
                        className={`
                          block p-3.5 rounded-xl border transition-all cursor-pointer
                          ${selected 
                            ? 'border-[#111827] bg-[#F8F9FA] ring-1 ring-[#111827]' 
                            : 'border-[#EAECEF] bg-white hover:bg-[#F8F9FA]'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {r === 'ceo' && <Crown className="w-4 h-4 text-purple-600" />}
                            {r === 'admin' && <ShieldCheck className="w-4 h-4 text-blue-600" />}
                            {r === 'parceiro' && <Handshake className="w-4 h-4 text-amber-600" />}
                            <span className="font-bold text-xs text-[#0F172A]">{conf.label}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${conf.badgeClass}`}>
                              {conf.badge}
                            </span>
                          </div>
                          <input
                            type="radio"
                            name="roleSelection"
                            checked={selected}
                            onChange={() => setRole(r)}
                            className="text-[#111827] focus:ring-[#111827]"
                          />
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-1 pl-6">
                          {conf.description}
                        </p>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Workspaces de Acesso */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5">
                  Workspaces com Acesso Liberado
                </label>
                <select
                  value={workspaceSelection === 'all' ? 'all' : workspaceSelection[0]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWorkspaceSelection(val === 'all' ? 'all' : [val]);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EAECEF] bg-[#F8F9FA] focus:bg-white text-[#0F172A]"
                >
                  <option value="all">Todas as Workspaces da Empresa</option>
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name} ({ws.type === 'matriz' ? 'Matriz' : 'Filial'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#EAECEF] text-xs font-semibold text-[#64748B] hover:bg-[#F8F9FA]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Gerando Convite...' : 'Enviar Convite'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal de Convite Gerado com Sucesso */}
      {generatedInvite && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-md flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EAECEF] space-y-4">
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="font-bold text-base text-[#0F172A]">
                Convite Criado com Sucesso!
              </h3>
              <p className="text-xs text-[#64748B]">
                O convite para <strong>{generatedInvite.name}</strong> foi registrado como <strong>{TEAM_ROLE_CONFIGS[generatedInvite.role].label}</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-[#F8F9FA] rounded-xl border border-[#EAECEF] space-y-2">
              <span className="text-[11px] font-semibold text-[#64748B] block">
                Link de Acesso Direto do Colaborador:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedInvite.link}
                  className="w-full px-3 py-1.5 bg-white border border-[#EAECEF] rounded-lg text-xs font-mono text-[#0F172A]"
                />
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-black text-white text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleSendWhatsAppInvite}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Convite pelo WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setGeneratedInvite(null)}
                className="w-full py-2 px-4 rounded-xl border border-[#EAECEF] text-xs font-semibold text-[#64748B] hover:bg-[#F8F9FA] cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Alteração de Cargo */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-md flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EAECEF] space-y-4">
            
            <div className="flex items-center justify-between border-b border-[#EAECEF] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">
                  Alterar Cargo de {editingMember.name}
                </h3>
                <p className="text-xs text-[#64748B]">
                  Selecione o novo nível de permissão deste colaborador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-xl hover:bg-[#F8F9FA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {(['ceo', 'admin', 'parceiro'] as TeamRole[]).map((r) => {
                const conf = TEAM_ROLE_CONFIGS[r];
                const selected = editingMember.role === r;
                return (
                  <label
                    key={r}
                    onClick={() => setEditingMember({ ...editingMember, role: r })}
                    className={`
                      block p-3.5 rounded-xl border transition-all cursor-pointer
                      ${selected 
                        ? 'border-[#111827] bg-[#F8F9FA] ring-1 ring-[#111827]' 
                        : 'border-[#EAECEF] bg-white hover:bg-[#F8F9FA]'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {r === 'ceo' && <Crown className="w-4 h-4 text-purple-600" />}
                        {r === 'admin' && <ShieldCheck className="w-4 h-4 text-blue-600" />}
                        {r === 'parceiro' && <Handshake className="w-4 h-4 text-amber-600" />}
                        <span className="font-bold text-xs text-[#0F172A]">{conf.label}</span>
                      </div>
                      <input
                        type="radio"
                        name="editRoleSelection"
                        checked={selected}
                        onChange={() => setEditingMember({ ...editingMember, role: r })}
                      />
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1 pl-6">
                      {conf.description}
                    </p>
                  </label>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2.5 rounded-xl border border-[#EAECEF] text-xs font-semibold text-[#64748B] hover:bg-[#F8F9FA]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRoleEdit}
                className="px-5 py-2.5 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Salvar Cargo
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
