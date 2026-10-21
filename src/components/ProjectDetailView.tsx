import React, { useState, useRef, useEffect } from 'react';
import { 
  Project, 
  ActiveView, 
  Installment, 
  ProjectUpdate, 
  ProjectStage,
  ProjectDocument,
  TeamRole,
  UserProfile,
  canAccessFinancials,
  canDeleteProject
} from '../types';
import { DeleteProjectConfirmationModal } from './DeleteProjectConfirmationModal';
import { 
  ArrowLeft, 
  RotateCcw, 
  Play, 
  Check, 
  Copy, 
  MessageSquare, 
  Eye, 
  EyeOff,
  Bell,
  BellOff,
  Receipt, 
  History, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Sparkles, 
  Camera, 
  Image as ImageIcon, 
  Send, 
  Paperclip,
  Video,
  File, 
  ChevronDown, 
  Download, 
  AlertCircle,
  Calendar,
  Layers,
  X,
  Plus,
  Trash2,
  ShieldCheck,
  Maximize2,
  ExternalLink,
  ChevronRight,
  ListOrdered,
  Building,
  Lock,
  Save,
  QrCode,
  Key,
  Hammer,
  AlertTriangle,
  Upload,
  UserCheck,
  User,
  Tag,
  FolderUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProofPaymentModal } from './ProofPaymentModal';
import { EditBudgetModal } from './EditBudgetModal';
import { ContractViewerModal } from './ContractViewerModal';
import { BudgetHistoryModal } from './BudgetHistoryModal';
import { ProjectSummaryPdfModal } from './ProjectSummaryPdfModal';
import { buildClientPortalUrl } from '../utils/portalUrl';
import { validateDateFormat } from '../utils/apiValidator';
import { uploadProjectPhoto } from '../lib/supabaseStorage';
import { buildClientPixDetails, PixDetails, detectPixKeyType } from '../utils/pixService';
import { useFinancialPrivacy } from '../hooks/useFinancialPrivacy';
import { FinancialPrivacyToggle } from './FinancialPrivacyToggle';

interface ProjectDetailViewProps {
  project: Project;
  onBackToDashboard: () => void;
  onSelectView: (view: ActiveView) => void;
  onAdvanceStage: (projectId: string) => void;
  onRegressStage: (projectId: string) => void;
  onCompleteProject: (projectId: string) => void;
  onUpdateBudget: (projectId: string, totalValue: number, installments?: Installment[]) => void;
  onChargePixWhatsapp: (project: Project, installment: any) => void;
  onToggleInstallment: (projectId: string, installmentNumber: number) => void;
  onOpenAiNotificationDrawer?: (project: Project) => void;
  onAddUpdate: (
    projectId: string, 
    data: { 
      message: string; 
      stageId: string; 
      stageName: string; 
      photos: Array<{ title: string; url: string; caption?: string }>;
      notifyWhatsapp: boolean;
      actionType?: 'keep' | 'set_current' | 'advance';
      author?: string;
      role?: string;
    }
  ) => Promise<void>;
  onDeleteUpdate?: (projectId: string, updateId: string) => Promise<void>;
  currentRole?: TeamRole;
  currentUser?: UserProfile | null;
  onUpdateProjectPixKey?: (projectId: string, pixKey: string, pixQrCode?: string) => void;
  onUpdateProject?: (projectId: string, data: Partial<Project>) => Promise<void> | void;
  onDeleteProject?: (projectId: string) => Promise<boolean | void> | void;
  onRestoreProject?: (projectId: string) => Promise<boolean | void> | void;
  showToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  onBackToDashboard,
  onSelectView,
  onAdvanceStage,
  onRegressStage,
  onCompleteProject,
  onUpdateBudget,
  onChargePixWhatsapp,
  onToggleInstallment,
  onOpenAiNotificationDrawer,
  onAddUpdate,
  onDeleteUpdate,
  onUpdateProjectPixKey,
  onUpdateProject,
  onDeleteProject,
  onRestoreProject,
  currentRole = 'ceo',
  currentUser,
  showToast
}) => {
  const hasFinancialAccess = canAccessFinancials(currentRole);
  const { hideFinancials, toggleHideFinancials, blurClass } = useFinancialPrivacy();

  // Controle de Notificações de Cobrança Individual por Projeto/Cliente
  const isBillingEnabled = project.billingNotificationsEnabled !== false;
  const [isTogglingBilling, setIsTogglingBilling] = useState(false);

  const handleToggleBillingNotifications = async () => {
    if (isTogglingBilling) return;
    setIsTogglingBilling(true);
    const nextState = !isBillingEnabled;
    try {
      if (onUpdateProject) {
        await onUpdateProject(project.id, { billingNotificationsEnabled: nextState });
      }
      if (showToast) {
        if (nextState) {
          showToast('Notificações de cobrança ativadas para este cliente.', 'success');
        } else {
          showToast('Notificações de cobrança pausadas para este cliente.', 'info');
        }
      }
    } catch (err) {
      console.error('Error toggling billing notifications:', err);
    } finally {
      setIsTogglingBilling(false);
    }
  };

  // Delete Project Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit Project Details Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editClientName, setEditClientName] = useState(project.clientName);
  const [editClientPhone, setEditClientPhone] = useState(project.clientPhone);
  const [editTitle, setEditTitle] = useState(project.title);
  const [editCategory, setEditCategory] = useState(project.category);
  const [editDeliveryDate, setEditDeliveryDate] = useState(project.deliveryDate);
  const [editStatus, setEditStatus] = useState<Project['status']>(project.status);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    setEditClientName(project.clientName);
    setEditClientPhone(project.clientPhone);
    setEditTitle(project.title);
    setEditCategory(project.category);
    setEditDeliveryDate(project.deliveryDate);
    setEditStatus(project.status);
    setEditError(null);
  }, [project.id, project.clientName, project.clientPhone, project.title, project.category, project.deliveryDate, project.status]);

  const handleSaveProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editClientName.trim()) {
      setEditError('O Nome do Cliente é obrigatório e não pode ficar em branco.');
      return;
    }
    if (!editTitle.trim()) {
      setEditError('O Título do Projeto é obrigatório e não pode ficar em branco.');
      return;
    }

    const dateVal = validateDateFormat(editDeliveryDate, 'Prazo Previsto de Entrega', true);
    if (!dateVal.isValid) {
      setEditError(dateVal.error || 'Data de entrega inválida.');
      return;
    }

    setIsSavingEdit(true);
    try {
      if (onUpdateProject) {
        await onUpdateProject(project.id, {
          clientName: editClientName.trim(),
          clientPhone: editClientPhone.trim(),
          title: editTitle.trim(),
          category: editCategory,
          deliveryDate: dateVal.cleanValue || editDeliveryDate.trim(),
          status: editStatus
        });
      }
      setIsEditModalOpen(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Top internal tabs: 'overview' | 'stages_photos' | 'finance' | 'messages' | 'files'
  const [activeTab, setActiveTab] = useState<'overview' | 'stages_photos' | 'finance' | 'messages' | 'files'>('overview');

  // Timeline view tab inside stages: 'stages' (Cronograma do Projeto) or 'updates' (Diário de Registros)
  const [timelineTab, setTimelineTab] = useState<'stages' | 'updates'>('stages');

  // Form states for Quick Update
  const [updateMessage, setUpdateMessage] = useState('');
  const [selectedStageName, setSelectedStageName] = useState<string>(project.currentStage || '');
  const [actionType, setActionType] = useState<'keep' | 'set_current' | 'advance'>('keep');
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Attachments (Photos, Videos, Documents) attached in registration
  const [selectedPhotos, setSelectedPhotos] = useState<Array<{ title: string; url: string; caption?: string; type?: 'image' | 'video' | 'document'; fileType?: string; fileSize?: string }>>([]);
  const [activePhotoZoom, setActivePhotoZoom] = useState<{ url: string; title: string; caption?: string; type?: 'image' | 'video' | 'document'; fileType?: string; fileSize?: string } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Modals state
  const [showProofModal, setShowProofModal] = useState(false);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showConfirmFinishModal, setShowConfirmFinishModal] = useState(false);
  const [showSummaryPdfModal, setShowSummaryPdfModal] = useState(false);

  // Document attachments state
  const [projectDocs, setProjectDocs] = useState<ProjectDocument[]>(() => {
    return project.documents || [];
  });

  useEffect(() => {
    setProjectDocs(project.documents || []);
  }, [project.id, project.documents]);

  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('all');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [newDocCategory, setNewDocCategory] = useState<'contrato' | 'termo' | 'aditivo' | 'planta' | 'foto' | 'outro'>('contrato');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [newDocFile, setNewDocFile] = useState<{ file: File; name: string; size: string; type: string; base64: string } | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeFormatted = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    if (!newDocTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setNewDocTitle(cleanName);
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewDocFile({
        file,
        name: file.name,
        size: sizeFormatted,
        type: file.type || 'application/octet-stream',
        base64: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocFile || !newDocTitle.trim()) return;

    setIsUploadingDoc(true);
    try {
      const authorName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Equipe Técnica';
      const authorRole = currentUser?.teamRole || (currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'media_buyer' ? 'Media Buyer' : 'Gestor');

      const res = await fetch(`/api/projects/${project.id}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': authorName,
          'x-user-role': authorRole
        },
        body: JSON.stringify({
          name: newDocTitle.trim(),
          type: newDocFile.type,
          size: newDocFile.size,
          description: newDocDescription.trim(),
          category: newDocCategory,
          url: newDocFile.base64,
          uploadedBy: authorName,
          uploadedByRole: authorRole
        })
      });

      if (res.ok) {
        const data = await res.json();
        const savedDoc: ProjectDocument = data.document;
        const updatedList = [savedDoc, ...projectDocs];
        setProjectDocs(updatedList);
        if (onUpdateProject) {
          onUpdateProject(project.id, {
            documents: updatedList
          });
        }
        setShowUploadDocModal(false);
        setNewDocTitle('');
        setNewDocDescription('');
        setNewDocFile(null);
      }
    } catch (err) {
      console.error('Error uploading document:', err);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await fetch(`/api/projects/${project.id}/documents/${docId}`, {
        method: 'DELETE'
      });
      const updatedList = projectDocs.filter(d => d.id !== docId);
      setProjectDocs(updatedList);
      if (onUpdateProject) {
        onUpdateProject(project.id, {
          documents: updatedList
        });
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  // File upload ref for photos
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize stage selection when project changes
  useEffect(() => {
    if (project.currentStage) {
      setSelectedStageName(project.currentStage);
    } else if (project.stages && project.stages.length > 0) {
      const cur = project.stages.find(s => s.status === 'current') || project.stages[0];
      setSelectedStageName(cur.name);
    }
  }, [project.id, project.currentStage]);

  const handleCopyLink = () => {
    const url = buildClientPortalUrl(project.id);
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Calculations
  const totalApproved = project.totalValue || 9533;
  const projectInstallments = project.installments || [];
  const paidInstallment = projectInstallments.find(i => i.status === 'paid');
  const pendingInstallment = projectInstallments.find(i => i.status === 'pending');
  const paidValue = projectInstallments
    .filter(i => i.status === 'paid')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const pendingValue = totalApproved - paidValue;
  const paidPercent = totalApproved > 0 ? Math.round((paidValue / totalApproved) * 100) : 50;

  // Dedicated Pix State & Dynamic QR Code Generation for this client
  const [clientPixKey, setClientPixKey] = useState<string>(() => {
    return project.pixKey || localStorage.getItem('bomprojeto_company_pix_key') || '';
  });
  const [clientPixDetails, setClientPixDetails] = useState<PixDetails | null>(null);
  const [copiedPixCopiaECola, setCopiedPixCopiaECola] = useState(false);
  const [copiedRawKey, setCopiedRawKey] = useState(false);
  const [savedPixSuccess, setSavedPixSuccess] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    setClientPixKey(project.pixKey || localStorage.getItem('bomprojeto_company_pix_key') || '');
  }, [project.id, project.pixKey]);

  useEffect(() => {
    let isMounted = true;
    const targetInstallment = pendingInstallment || projectInstallments[0] || {
      number: 1,
      label: 'Valor Total',
      amount: totalApproved,
      dueDate: project.deliveryDate,
      status: 'pending' as const
    };
    buildClientPixDetails(project, targetInstallment, clientPixKey, project.workspaceName).then((details) => {
      if (isMounted) {
        setClientPixDetails(details);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [clientPixKey, project.id, pendingInstallment?.number, pendingInstallment?.amount, totalApproved]);

  const handleSaveClientPixKey = () => {
    const trimmed = clientPixKey.trim();
    if (trimmed) {
      try {
        localStorage.setItem('bomprojeto_company_pix_key', trimmed);
      } catch {}
      if (onUpdateProjectPixKey) {
        onUpdateProjectPixKey(project.id, trimmed, clientPixDetails?.copiaECola);
      }
      setSavedPixSuccess(true);
      setTimeout(() => setSavedPixSuccess(false), 3000);
    }
  };

  const handleCopyClientPixCode = () => {
    if (clientPixDetails?.copiaECola) {
      navigator.clipboard?.writeText(clientPixDetails.copiaECola.trim());
      setCopiedPixCopiaECola(true);
      setTimeout(() => setCopiedPixCopiaECola(false), 2500);
    }
  };

  const handleCopyClientRawKey = () => {
    const raw = clientPixDetails?.cleanKey || clientPixKey.trim();
    if (raw) {
      navigator.clipboard?.writeText(raw);
      setCopiedRawKey(true);
      setTimeout(() => setCopiedRawKey(false), 2500);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);
    const fileCategory: 'image' | 'video' | 'document' = isImage ? 'image' : isVideo ? 'video' : 'document';
    const fallbackTitle = isVideo ? 'Vídeo da Produção' : isImage ? 'Foto da Produção' : 'Documento Anexo';
    const title = file.name.replace(/\.[^/.]+$/, '').slice(0, 40) || fallbackTitle;
    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const fileSizeStr = file.size > 1024 * 1024 ? `${fileSizeMb} MB` : `${Math.round(file.size / 1024)} KB`;

    setIsUploadingPhoto(true);
    setUploadProgress(10);

    try {
      const result = await uploadProjectPhoto(project.id, file, (progress) => {
        setUploadProgress(progress);
      });

      setSelectedPhotos(prev => [
        ...prev,
        {
          title,
          caption: `${isImage ? 'Foto' : isVideo ? 'Vídeo' : 'Documento'} • ${new Date().toLocaleDateString('pt-BR')}`,
          url: result.url,
          type: fileCategory,
          fileType: file.type || file.name.split('.').pop(),
          fileSize: fileSizeStr
        }
      ]);
    } catch (err) {
      console.warn('Fallback para leitor de arquivo local:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedPhotos(prev => [
            ...prev,
            {
              title,
              caption: `${isImage ? 'Foto' : isVideo ? 'Vídeo' : 'Documento'} • ${new Date().toLocaleDateString('pt-BR')}`,
              url: reader.result as string,
              type: fileCategory,
              fileType: file.type || file.name.split('.').pop(),
              fileSize: fileSizeStr
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (idxToRemove: number) => {
    setSelectedPhotos(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleAddPresetPhoto = (title: string, url: string, caption: string) => {
    setSelectedPhotos(prev => [
      ...prev,
      { title, url, caption }
    ]);
  };

  const handleGenerateAiMessage = async () => {
    setIsGeneratingAi(true);
    try {
      const response = await fetch('/api/ai/generate-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: project.clientName,
          stageName: selectedStageName || project.currentStage,
          projectTitle: project.title,
          category: project.category,
          tone: 'profissional, educado, transparente e tranquilizador'
        })
      });
      const data = await response.json();
      if (data.message) {
        setUpdateMessage(data.message);
      }
    } catch (err) {
      setUpdateMessage(
        `Avançamos com conferência técnica e testes de qualidade aprovados na etapa de "${selectedStageName || project.currentStage}".`
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateMessage.trim()) return;

    setIsSubmittingUpdate(true);
    try {
      const matchedStage = project.stages.find(s => s.name.toLowerCase() === selectedStageName.toLowerCase()) ||
        project.stages.find(s => s.status === 'current') ||
        project.stages[0];

      const authorName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Equipe Técnica';
      const authorRole = currentUser?.teamRole || (currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'media_buyer' ? 'Media Buyer' : 'Gestor de Projetos');

      await onAddUpdate(project.id, {
        message: updateMessage.trim(),
        stageId: matchedStage?.id || 's-current',
        stageName: matchedStage?.name || selectedStageName,
        photos: selectedPhotos,
        notifyWhatsapp,
        actionType,
        author: authorName,
        role: authorRole
      });

      setUpdateMessage('');
      setSelectedPhotos([]);
      setTimelineTab('updates');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const stages = project.stages || [];
  const currentStageIdx = stages.findIndex(s => s.status === 'current');
  const isFinished = project.status === 'concluido' || project.progressPercent === 100;
  const canRegress = currentStageIdx > 0 || isFinished;
  const nextStage = stages[currentStageIdx + 1];
  const completedStagesCount = stages.filter(s => s.status === 'completed').length;
  const allUpdates = project.updates || [];

  return (
    <div className="space-y-6 pb-20 font-sans">
      
      {/* 1. Breadcrumb / Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#5F6368]">
          <button
            id="btn-back-to-projects"
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 hover:text-[#202124] transition-colors cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar aos projetos</span>
          </button>
          <span>/</span>
          <span className="font-mono text-[#5F6368]">{project.code}</span>
          {project.workspaceName && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F8F9FA] text-[#5F6368] border border-[#E8EAED]">
              {project.workspaceName}
            </span>
          )}
        </div>

        {/* Stage advancement controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-stage-back"
            onClick={() => onRegressStage(project.id)}
            disabled={!canRegress}
            title={canRegress ? 'Retroceder para a etapa anterior' : 'Primeira etapa'}
            className="h-10 sm:h-8 flex-1 sm:flex-none px-3 sm:px-2.5 rounded-lg border border-[#E8EAED] bg-white hover:bg-[#F8F9FA] text-xs font-medium text-[#5F6368] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Voltar etapa</span>
          </button>

          <button
            id="btn-stage-advance"
            onClick={() => onAdvanceStage(project.id)}
            disabled={isFinished}
            title={nextStage ? `Avançar para: ${nextStage.name}` : 'Avançar etapa'}
            className="h-10 sm:h-8 flex-1 sm:flex-none px-3.5 sm:px-3 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{nextStage ? `Avançar: ${nextStage.name.split(' ')[0]}` : 'Avançar Etapa'}</span>
          </button>

          <button
            id="btn-stage-finish"
            onClick={() => setShowConfirmFinishModal(true)}
            disabled={isFinished}
            className={`h-10 sm:h-8 px-3.5 sm:px-3 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              isFinished 
                ? 'bg-[#E6F4EA] border-[#E6F4EA] text-[#137333]' 
                : 'border-[#E8EAED] bg-white hover:bg-[#F8F9FA] text-[#5F6368]'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isFinished ? 'Concluído' : 'Concluir'}</span>
          </button>
        </div>
      </div>

      {/* Banner Informativo se o Projeto estiver na Aba de Exclusão (Lixeira) */}
      {(project.status === 'excluido' || project.isDeleted) && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 border border-amber-300 font-bold">
              <Trash2 className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <span className="font-bold text-sm text-amber-900 block">
                Projeto na Aba de Exclusão (Lixeira)
              </span>
              <span className="text-[11px] text-amber-800">
                Este projeto foi arquivado e não aparece nos relatórios e listagens de projetos em andamento ou concluídos.
                {project.deletedAt && ` Excluído em: ${new Date(project.deletedAt).toLocaleString('pt-BR')}`}.
              </span>
            </div>
          </div>

          {canDeleteProject(currentRole) && onRestoreProject && (
            <button
              type="button"
              onClick={async () => {
                await onRestoreProject(project.id);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-center cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Projeto</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Project Header (Fleetly SaaS B2B Card) */}
      <div className="bg-white rounded-2xl border border-[#EAECEF] p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                {project.clientName}
              </h1>
              <span className="text-xs font-mono text-[#64748B] px-2 py-0.5 rounded-md bg-[#F8F9FA] border border-[#EAECEF]">
                {project.code}
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={`${project.id}-${project.currentStage}-${isFinished}`}
                  initial={{ scale: 0.9, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    isFinished 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isFinished ? 'bg-emerald-600' : 'bg-sky-600'}`} />
                  {isFinished ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Concluído
                    </>
                  ) : (
                    <>
                      <Hammer className="w-3.5 h-3.5" />
                      {project.currentStage}
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
            </div>

            <p className="text-xs sm:text-sm text-[#64748B] mt-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-[#0F172A]">{project.title}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                Prazo: {project.deliveryDate}
              </span>
              <span>•</span>
              <span className="font-semibold text-emerald-600">
                {project.progressPercent}% Concluído
              </span>
            </p>
          </div>

          {/* Top Actions */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-copy-client-link"
              onClick={handleCopyLink}
              className="fleetly-btn-secondary h-9 px-3 text-xs font-semibold cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
              <span>{copiedLink ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            <button
              id="btn-send-whatsapp"
              onClick={() => onOpenAiNotificationDrawer ? onOpenAiNotificationDrawer(project) : onSelectView('whatsapp_simulator')}
              className="fleetly-btn-secondary h-9 px-3 text-xs font-semibold cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            <button
              id="btn-open-client-portal"
              onClick={() => onSelectView('client_portal')}
              className="fleetly-btn-secondary h-9 px-3 text-xs font-semibold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Ver Portal</span>
            </button>

            <button
              id="btn-edit-project-details"
              onClick={() => setIsEditModalOpen(true)}
              className="fleetly-btn-secondary h-9 px-3 text-xs font-semibold cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#0F172A]" />
              <span>Editar Dados</span>
            </button>

            <button
              id="btn-open-summary-pdf"
              onClick={() => setShowSummaryPdfModal(true)}
              className="fleetly-btn-primary h-9 px-3.5 text-xs font-semibold cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Resumo PDF</span>
            </button>

            {/* Ação de Exclusão / Restauração para CEO e Administrador */}
            {canDeleteProject(currentRole) && (
              (project.status === 'excluido' || project.isDeleted) ? (
                <button
                  id="btn-restore-project"
                  type="button"
                  onClick={async () => {
                    if (onRestoreProject) {
                      await onRestoreProject(project.id);
                    }
                  }}
                  className="h-9 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  title="Restaurar este projeto de volta para os projetos ativos"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Restaurar</span>
                </button>
              ) : (
                <button
                  id="btn-delete-project"
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="h-9 px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  title="Mover projeto para a aba de exclusão (Lixeira)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Excluir</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Clean Timeline Progress Indicator */}
        <div className="mt-5 pt-4 border-t border-[#EAECEF] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#64748B]">
              Progresso do Cronograma: <strong className="text-[#0F172A]">{completedStagesCount} de {stages.length} etapas concluídas</strong>
            </span>
            <span className="font-bold text-[#0F172A]">{project.progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#111827] rounded-full transition-all duration-300"
              style={{ width: `${project.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Internal Tabs (Fleetly Pill Tabs) */}
      <div className="bg-[#F1F5F9] p-1 rounded-xl sm:rounded-2xl flex items-center gap-1 overflow-x-auto max-w-full sm:max-w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-[#111827] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Visão Geral
        </button>

        <button
          onClick={() => setActiveTab('stages_photos')}
          className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'stages_photos'
              ? 'bg-[#111827] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Etapas & Anexos ({stages.length})
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'finance'
              ? 'bg-[#111827] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Financeiro (Pix)
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'messages'
              ? 'bg-[#111827] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Mensagens & Atualizações ({allUpdates.length})
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'files'
              ? 'bg-[#111827] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Arquivos
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB: VISÃO GERAL */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Quick Metrics Grid */}
          {hasFinancialAccess ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5F6368] uppercase tracking-wide">
                  Indicadores Financeiros da OS
                </span>
                <FinancialPrivacyToggle size="xs" variant="ghost" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-[#EAECEF] p-5 shadow-xs">
                  <span className="text-xs text-[#64748B] font-medium block">Valor Total</span>
                  <div className={`text-xl font-bold text-[#0F172A] mt-1 tracking-tight ${blurClass}`}>
                    R$ {totalApproved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Proposta assinada em {project.contractDate || '18/09'}
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-[#EAECEF] p-5 shadow-xs">
                  <span className="text-xs text-[#64748B] font-medium block">Valor Recebido ({paidPercent}%)</span>
                  <div className={`text-xl font-bold text-emerald-600 mt-1 tracking-tight ${blurClass}`}>
                    R$ {paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">
                    Liquidado via Pix
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-[#EAECEF] p-5 shadow-xs">
                  <span className="text-xs text-[#64748B] font-medium block">Saldo a Receber</span>
                  <div className={`text-xl font-bold text-amber-600 mt-1 tracking-tight ${blurClass}`}>
                    R$ {pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Vencimento em {pendingInstallment?.dueDate || '19 Out 2026'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-[#EAECEF] p-5 shadow-xs">
                <span className="text-xs text-[#64748B] font-medium block">Etapa Atual</span>
                <div className="text-xl font-bold text-[#0F172A] mt-1 tracking-tight truncate">
                  {project.currentStage}
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Execução Técnica / Produção Digital
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#EAECEF] p-5 shadow-xs">
                <span className="text-xs text-[#64748B] font-medium block">Progresso Operacional</span>
                <div className="text-xl font-bold text-emerald-600 mt-1 tracking-tight">
                  {project.progressPercent}% Concluído
                </div>
                <p className="text-xs text-emerald-700 mt-1">
                  {completedStagesCount} de {stages.length} etapas finalizadas
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#EAECEF] p-5 shadow-xs">
                <span className="text-xs text-[#64748B] font-medium block">Previsão de Entrega</span>
                <div className="text-xl font-bold text-[#0F172A] mt-1 tracking-tight">
                  {project.deliveryDate}
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Acompanhamento técnico diário
                </p>
              </div>
            </div>
          )}

          {/* Current Stage Highlight & Next Step */}
          <div className="bg-white rounded-xl border border-[#E8EAED] p-5">
            <h2 className="text-sm font-semibold text-[#202124] mb-3">
              Status Atual da Execução
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#F8F9FA] border border-[#E8EAED]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#202124]">
                    Etapa Atual: {project.currentStage}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#E8F0FE] text-[#1967D2]">
                    Em execução
                  </span>
                </div>
                <p className="text-xs text-[#5F6368]">
                  {stages.find(s => s.status === 'current')?.description || 'Acompanhamento contínuo em bancada e montagem.'}
                </p>
              </div>

              <button
                onClick={() => setActiveTab('stages_photos')}
                className="h-8 px-3 rounded-lg border border-[#E8EAED] bg-white hover:bg-[#F8F9FA] text-xs font-medium text-[#202124] transition-colors flex items-center gap-1 cursor-pointer self-start sm:self-auto shrink-0"
              >
                <span>Ver Todas as Etapas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recent Updates Snapshot */}
          <div className="bg-white rounded-xl border border-[#E8EAED] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#202124]">
                Últimas Atualizações Registradas
              </h2>
              <button
                onClick={() => setActiveTab('messages')}
                className="text-xs font-medium text-[#F97316] hover:underline cursor-pointer"
              >
                Ver todas ({allUpdates.length}) →
              </button>
            </div>

            {allUpdates.length === 0 ? (
              <p className="text-xs text-[#5F6368]">Nenhum registro ainda neste projeto.</p>
            ) : (
              <div className="space-y-3">
                {allUpdates.slice(0, 3).map((upd, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#F8F9FA] border border-[#E8EAED] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#202124]">{upd.stageName}</span>
                      <span className="text-[11px] text-[#80868B]">{upd.timestamp}</span>
                    </div>
                    <p className="text-xs text-[#5F6368]">{upd.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB: ETAPAS & FOTOS */}
      {activeTab === 'stages_photos' && (
        <div className="bg-white rounded-xl border border-[#E8EAED] p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8EAED] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[#202124]">
                Cronograma de Etapas do Projeto
              </h2>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Acompanhe o avanço por cada fase de produção e montagem
              </p>
            </div>
            <span className="text-xs font-medium text-[#5F6368]">
              {completedStagesCount} de {stages.length} concluídas
            </span>
          </div>

          {/* Connected timeline list */}
          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const isCurrent = stage.status === 'current';
              const isCompleted = stage.status === 'completed';
              const stageUpdates = allUpdates.filter(u => 
                u.stageId === stage.id || 
                u.stageName?.toLowerCase() === stage.name.toLowerCase()
              );

              return (
                <div
                  key={stage.id || idx}
                  className={`p-4 rounded-xl border transition-colors ${
                    isCurrent 
                      ? 'border-[#F97316] bg-[#FFFBF7]' 
                      : isCompleted 
                      ? 'border-[#E8EAED] bg-[#F8F9FA]' 
                      : 'border-[#E8EAED] bg-white opacity-80'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isCompleted
                          ? 'bg-[#E6F4EA] text-[#137333]'
                          : isCurrent
                          ? 'bg-[#F97316] text-white'
                          : 'bg-[#F1F3F4] text-[#5F6368]'
                      }`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>

                      <span className="text-xs font-semibold text-[#202124]">
                        {stage.name}
                      </span>

                      {isCompleted ? (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#137333]">
                          Concluída
                        </span>
                      ) : isCurrent ? (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#E8F0FE] text-[#1967D2]">
                          Em andamento
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F1F3F4] text-[#5F6368]">
                          Pendente
                        </span>
                      )}
                    </div>

                    {stage.date && (
                      <span className="text-[11px] text-[#80868B]">
                        {stage.date}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#5F6368] mt-2 ml-8.5">
                    {stage.description}
                  </p>

                  {/* Informação visual de quem avançou o projeto para este status */}
                  {isCompleted && (
                    <div className="mt-3 ml-8.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/90 text-emerald-900 text-xs border border-emerald-200 shadow-2xs">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        <UserCheck className="w-3 h-3" />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-emerald-700 font-medium">Status avançado por:</span>
                        <strong className="font-bold text-emerald-950">{stage.completedBy || 'Equipe Técnica'}</strong>
                        {stage.completedByRole && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-200/70 text-emerald-800 text-[10px] font-semibold border border-emerald-300/50">
                            {stage.completedByRole}
                          </span>
                        )}
                        <span className="text-emerald-700 text-[11px] flex items-center gap-1 ml-1 font-mono">
                          <Clock className="w-3 h-3 text-emerald-600 inline" />
                          {stage.completedAt || (stage.date ? `${stage.date}` : 'Fase Concluída')}
                        </span>
                      </div>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="mt-3 ml-8.5 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onAdvanceStage(project.id)}
                        className="px-3.5 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Avançar para Próxima Etapa</span>
                      </button>
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-900">
                        <User className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>
                          Responsável pelo avanço: <strong className="font-bold text-orange-950">{currentUser?.name || currentUser?.email?.split('@')[0] || 'Equipe Técnica'}</strong> ({currentUser?.teamRole || (currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'media_buyer' ? 'Media Buyer' : 'Gestor')})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stage registered attachments (Photos, Videos, Documents) */}
                  {stageUpdates.length > 0 && stageUpdates.some(u => u.photos && u.photos.length > 0) && (
                    <div className="mt-3 ml-8.5 flex flex-wrap gap-2">
                      {stageUpdates.flatMap(u => u.photos || []).map((att, pIdx) => {
                        const isVid = att.type === 'video' || /\.(mp4|mov|webm|mkv)$/i.test(att.url);
                        const isDoc = att.type === 'document' || /\.(pdf|doc|docx|xls|xlsx|txt)$/i.test(att.url);

                        return (
                          <div
                            key={pIdx}
                            onClick={() => setActivePhotoZoom(att)}
                            className="w-16 h-14 rounded-lg overflow-hidden border border-[#E8EAED] bg-white cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center p-1 text-center relative group"
                            title={att.title}
                          >
                            {isVid ? (
                              <div className="relative w-full h-full bg-black flex items-center justify-center rounded overflow-hidden">
                                <video src={att.url} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              </div>
                            ) : isDoc ? (
                              <div className="flex flex-col items-center justify-center w-full h-full">
                                <FileText className="w-4 h-4 text-[#F97316]" />
                                <span className="text-[8px] text-[#5F6368] truncate w-full mt-0.5">{att.title || 'Doc'}</span>
                              </div>
                            ) : (
                              <img src={att.url} alt={att.title} className="w-full h-full object-cover" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: FINANCEIRO (PIX) */}
      {activeTab === 'finance' && (
        !hasFinancialAccess ? (
          <div className="bg-white rounded-xl border border-[#FFD9C2] p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF8F3] text-[#D95510] flex items-center justify-center mx-auto border border-[#FFD9C2]">
              <Lock className="w-6 h-6 text-[#D95510]" />
            </div>
            <h3 className="font-semibold text-base text-[#1C1C1A]">
              Acesso Financeiro Confidencial
            </h3>
            <p className="text-xs text-[#73736C] max-w-md mx-auto leading-relaxed">
              O cargo <strong>Parceiro</strong> tem permissão operacional de acompanhamento das etapas, andamento das sprints, relatórios e criativos. Os valores em R$, orçamentos e parcelas Pix são restritos ao <strong>CEO</strong> e <strong>Administrador</strong>.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E8EAED] p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EAED] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-[#202124]">
                    Orçamento & Pagamentos Pix
                  </h2>
                  {!isBillingEnabled && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                      Cobrança Pausada
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  Conciliação das parcelas e envio de cobranças
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Botão simples e discreto de Ativar / Desativar Cobrança Individual */}
                <button
                  type="button"
                  id="btn-toggle-project-billing"
                  onClick={handleToggleBillingNotifications}
                  disabled={isTogglingBilling}
                  title={
                    isBillingEnabled
                      ? 'Cobrança Ativa: o cliente pode receber lembretes e notificações Pix. Clique para pausar.'
                      : 'Cobrança Pausada: notificações desativadas para este cliente. Clique para reativar.'
                  }
                  className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs group ${
                    isBillingEnabled
                      ? 'border-[#E8EAED] hover:border-emerald-300 bg-white hover:bg-emerald-50/50 text-[#202124]'
                      : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-[#5F6368]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                      isBillingEnabled ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-gray-400'
                    }`}
                  />
                  {isBillingEnabled ? (
                    <Bell className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-105 transition-transform shrink-0" />
                  ) : (
                    <BellOff className="w-3.5 h-3.5 text-gray-400 group-hover:scale-105 transition-transform shrink-0" />
                  )}
                  <span className="hidden sm:inline">
                    {isBillingEnabled ? 'Cobrança Ativa' : 'Cobrança Pausada'}
                  </span>
                  <span className="sm:hidden">
                    {isBillingEnabled ? 'Ativa' : 'Pausada'}
                  </span>
                </button>

                <FinancialPrivacyToggle 
                  id="btn-toggle-financial-privacy-detail" 
                  size="sm" 
                  variant="default"
                />

                <button
                  onClick={() => setShowEditBudgetModal(true)}
                  className="h-8 px-3 rounded-lg border border-[#E8EAED] bg-white hover:bg-[#F8F9FA] text-xs font-medium text-[#202124] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Orçamento</span>
                </button>

                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="p-2 rounded-lg border border-[#E8EAED] bg-white hover:bg-[#F8F9FA] text-[#5F6368] transition-colors cursor-pointer"
                  title="Histórico"
                >
                  <History className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          {/* Financial summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-[#E8EAED]">
              <span className="text-[11px] text-[#5F6368] font-medium block">Total Contratado</span>
              <span className={`text-lg font-semibold text-[#202124] mt-1 block ${blurClass}`}>
                R$ {totalApproved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-[#E8EAED]">
              <span className="text-[11px] text-[#188038] font-medium block">Total Liquidado</span>
              <span className={`text-lg font-semibold text-[#188038] mt-1 block ${blurClass}`}>
                R$ {paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-[#E8EAED]">
              <span className="text-[11px] text-[#B06000] font-medium block">A Receber</span>
              <span className={`text-lg font-semibold text-[#B06000] mt-1 block ${blurClass}`}>
                R$ {pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Installments Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#202124]">
              Parcelas Cadastradas
            </h3>

            {/* Parcela 1 */}
            <div className="p-4 rounded-lg bg-[#F8F9FA] border border-[#E8EAED] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  paidInstallment?.status === 'paid' ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#FEF7E0] text-[#B06000]'
                }`}>
                  {paidInstallment?.status === 'paid' ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#202124]">
                      Parcela 1 • <span className={blurClass}>R$ {(paidInstallment?.amount || (totalApproved / 2)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-[#E6F4EA] text-[#137333]">
                      {paidInstallment?.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5F6368]">
                    {paidInstallment?.paidDate ? `Liquidado em ${paidInstallment.paidDate}` : 'Entrada'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-proof-p1"
                  onClick={() => setShowProofModal(true)}
                  className="h-7 px-2.5 rounded-md border border-[#E8EAED] bg-white hover:bg-[#F8F9FA] text-xs font-medium text-[#5F6368] transition-colors cursor-pointer"
                >
                  Comprovante
                </button>
                <button
                  id="btn-undo-p1"
                  onClick={() => onToggleInstallment(project.id, 1)}
                  className="text-xs text-[#5F6368] hover:text-[#202124] px-2 py-1 transition-colors cursor-pointer"
                >
                  {paidInstallment?.status === 'paid' ? 'Desmarcar' : 'Marcar'}
                </button>
              </div>
            </div>

            {/* Parcela 2 */}
            <div className="p-4 rounded-lg bg-[#F8F9FA] border border-[#E8EAED] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  pendingInstallment?.status === 'paid' ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#FEF7E0] text-[#B06000]'
                }`}>
                  {pendingInstallment?.status === 'paid' ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#202124]">
                      Parcela 2 • <span className={blurClass}>R$ {(pendingInstallment?.amount || (totalApproved / 2)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                      pendingInstallment?.status === 'paid' ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#FEF7E0] text-[#B06000]'
                    }`}>
                      {pendingInstallment?.status === 'paid' ? 'Pago' : 'A Receber'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5F6368]">
                    Vencimento: {pendingInstallment?.dueDate || project.deliveryDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pendingInstallment?.status !== 'paid' && (
                  <button
                    id="btn-cobrar-pix-p2"
                    onClick={() => onChargePixWhatsapp(project, pendingInstallment)}
                    className="h-7 px-2.5 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cobrar Pix
                  </button>
                )}
                
                <button
                  id="btn-pay-p2"
                  onClick={() => onToggleInstallment(project.id, 2)}
                  className="h-7 px-2.5 rounded-md border border-[#E8EAED] bg-white hover:bg-[#F8F9FA] text-xs font-medium text-[#5F6368] transition-colors cursor-pointer"
                >
                  {pendingInstallment?.status === 'paid' ? 'Desmarcar' : 'Marcar Pago'}
                </button>
              </div>
            </div>
          </div>

          {/* Seção Exclusiva: Pagamento e Cobrança Pix deste Cliente */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#FAF8F5] border border-[#E8EAED] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8EAED] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#202124] flex items-center gap-1.5 flex-wrap">
                    <span>Chave Pix & QR Code Exclusivo do Cliente</span>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      OS {project.code}
                    </span>
                    {!isBillingEnabled && (
                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Cobrança Automática Pausada
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-[#5F6368]">
                    Cada cliente tem seu QR code e código únicos. Sem misturar dados ou deixar vulnerável.
                  </p>
                </div>
              </div>

              {/* Botão de Cobrança direta no WhatsApp */}
              {pendingInstallment && (
                <button
                  type="button"
                  onClick={() => onChargePixWhatsapp(project, pendingInstallment)}
                  className="px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Cobrar no WhatsApp</span>
                </button>
              )}
            </div>

            {/* Input da Chave Pix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#202124] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chave Pix para recebimento deste cliente:</span>
                </label>
                {clientPixKey.trim() && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    clientPixDetails?.isPlaceholder
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    {detectPixKeyType(clientPixKey).label}
                  </span>
                )}
              </div>

              {/* Alerta de Chave de Exemplo ou Não Configurada */}
              {(!clientPixKey.trim() || clientPixDetails?.isPlaceholder) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block text-amber-950">
                      Atenção: Configure a sua Chave Pix Real
                    </span>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Para que os aplicativos dos bancos dos seus clientes (Nubank, Itaú, Bradesco, Banco do Brasil, Inter, etc.) abram a tela de pagamento sem erros, informe a sua <strong>Chave Pix Real</strong> (CPF, CNPJ, Telefone Celular ou E-mail da sua conta bancária) e clique em <strong>Salvar Chave Pix</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={clientPixKey}
                  onChange={(e) => setClientPixKey(e.target.value)}
                  placeholder="Informe sua chave Pix real (CPF, CNPJ, Celular com DDD, E-mail ou Aleatória)"
                  className="flex-1 h-9 px-3 rounded-lg border border-[#DADCE0] bg-white text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveClientPixKey}
                  className={`px-4 h-9 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    savedPixSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#202124] hover:bg-black text-white'
                  }`}
                >
                  {savedPixSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savedPixSuccess ? 'Chave Salva e Validada ✓' : 'Salvar Chave Pix'}</span>
                </button>
              </div>
            </div>

            {/* Visualizador do QR Code e Código Copia e Cola gerados na hora */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white p-4 rounded-xl border border-[#E8EAED]">
              <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-[#F8F9FA] rounded-xl border border-[#E8EAED]">
                <div 
                  onClick={() => clientPixDetails?.qrCodeBase64 && setIsQrModalOpen(true)}
                  className="w-44 h-44 bg-white p-2.5 rounded-xl border border-[#DADCE0] flex items-center justify-center shadow-xs cursor-pointer group relative"
                  title="Clique para ampliar o QR Code em tela cheia"
                >
                  {clientPixDetails?.qrCodeBase64 ? (
                    <>
                      <img
                        src={clientPixDetails.qrCodeBase64}
                        alt="QR Code Pix do Cliente"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-2xs">
                        <Maximize2 className="w-4 h-4" />
                        <span>Ampliar</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <QrCode className="w-10 h-10 text-[#9AA0A6] animate-pulse mx-auto" />
                      <span className="text-[10px] text-[#5F6368] mt-1 block">Insira a chave para gerar...</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <span className="text-[11px] font-semibold text-[#202124] block">
                    Padrão Oficial Banco Central (BR Code)
                  </span>
                  <span className="text-[10px] text-[#5F6368]">
                    Compatível com 100% dos bancos
                  </span>
                </div>
              </div>

              <div className="md:col-span-8 space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#5F6368] block uppercase tracking-wider">
                      Código Pix Copia e Cola (Oficial Banco Central)
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Validação EMV Ativa
                    </span>
                  </div>
                  <div className="mt-1 bg-[#FAF8F5] p-2.5 rounded-lg border border-[#DADCE0]">
                    <p className="text-[10px] font-mono text-[#3C4043] break-all select-all leading-relaxed">
                      {clientPixDetails?.copiaECola || 'Aguardando chave Pix válida...'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyClientPixCode}
                    disabled={!clientPixDetails?.copiaECola}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedPixCopiaECola ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPixCopiaECola ? 'Código Copiado com Sucesso!' : 'Copiar Código Copia e Cola'}</span>
                  </button>

                  {clientPixDetails?.cleanKey && (
                    <button
                      type="button"
                      onClick={handleCopyClientRawKey}
                      className="px-3 py-2 rounded-lg bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] text-xs font-semibold text-[#202124] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Copia diretamente a Chave Pix limpa para transferência manual"
                    >
                      {copiedRawKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Key className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{copiedRawKey ? 'Chave Copiada!' : `Copiar Chave (${clientPixDetails.keyTypeLabel})`}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1 text-[11px] text-[#5F6368] bg-[#F1F3F4] px-2.5 py-1.5 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Vinculado à OS #{project.code} • {project.clientName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal de QR Code Ampliado para Leitura em Monitor ou Impressão */}
            {isQrModalOpen && clientPixDetails?.qrCodeBase64 && (
              <div 
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                onClick={() => setIsQrModalOpen(false)}
              >
                <div 
                  className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-[#DADCE0]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-[#F1F3F4] pb-3">
                    <div className="text-left">
                      <h3 className="font-bold text-sm text-[#202124]">QR Code Pix Oficial</h3>
                      <p className="text-[11px] text-[#5F6368]">{project.clientName} • OS #{project.code}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(false)}
                      className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="bg-white p-4 rounded-xl border-2 border-emerald-500 shadow-md inline-block mx-auto">
                    <img
                      src={clientPixDetails.qrCodeBase64}
                      alt="QR Code Pix em Alta Resolução"
                      className="w-64 h-64 object-contain"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-[#5F6368] block">Valor a pagar:</span>
                    <span className="text-xl font-bold font-mono text-emerald-700 block">
                      R$ {clientPixDetails.formattedAmount}
                    </span>
                    <span className="text-[11px] text-[#5F6368] block">
                      Chave ({clientPixDetails.keyTypeLabel}): <strong>{clientPixDetails.cleanKey}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyClientPixCode}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedPixCopiaECola ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPixCopiaECola ? 'Código Pix Copiado!' : 'Copiar Código Copia e Cola'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )
      )}

      {/* TAB: MENSAGENS & ATUALIZAÇÕES */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Feed of updates */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#E8EAED] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#202124] border-b border-[#E8EAED] pb-3">
              Histórico de Mensagens & Atualizações
            </h2>

            {allUpdates.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#5F6368]">
                Nenhum registro ainda neste projeto.
              </div>
            ) : (
              <div className="space-y-3">
                {allUpdates.map((update, uIdx) => (
                  <div key={update.id || uIdx} className="p-4 rounded-xl bg-white border border-[#E8EAED] shadow-2xs space-y-3 hover:border-[#dadce0] transition-colors">
                    {/* Header com destaque visual claro de quem deu tratamento à demanda do cliente */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F3F4] pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-[#F97316] font-bold text-xs flex items-center justify-center shrink-0 border border-orange-200">
                          {(update.author || 'T')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-[#5F6368] font-medium">Tratamento por:</span>
                            <strong className="text-xs font-bold text-[#202124]">
                              {update.author || 'Equipe Técnica'}
                            </strong>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                              {update.role || 'Responsável'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#E8F0FE] text-[#1967D2]">
                          {update.stageName}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-[#5F6368] bg-[#F8F9FA] px-2 py-0.5 rounded-md border border-[#E8EAED] font-mono">
                          <Clock className="w-3 h-3 text-[#9AA0A6]" />
                          <span>{update.timestamp}</span>
                        </div>
                        {onDeleteUpdate && (
                          <button
                            type="button"
                            onClick={() => onDeleteUpdate(project.id, update.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Excluir atualização"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[#3C4043] leading-relaxed whitespace-pre-line">
                      {update.message}
                    </p>

                    {update.whatsappSent && (
                      <div className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Notificação enviada ao cliente via WhatsApp</span>
                      </div>
                    )}

                    {update.photos && update.photos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {update.photos.map((att, pIdx) => {
                          const isVid = att.type === 'video' || /\.(mp4|mov|webm|mkv)$/i.test(att.url);
                          const isDoc = att.type === 'document' || /\.(pdf|doc|docx|xls|xlsx|txt)$/i.test(att.url);

                          if (isVid) {
                            return (
                              <div
                                key={pIdx}
                                onClick={() => setActivePhotoZoom(att)}
                                className="relative rounded-lg overflow-hidden border border-[#E8EAED] bg-black cursor-pointer h-24 flex items-center justify-center group"
                              >
                                <video src={att.url} className="w-full h-full object-cover opacity-75" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-8 h-8 rounded-full bg-white/90 text-[#F97316] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                  </div>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[10px] text-white truncate px-2">
                                  {att.title || 'Vídeo da Obra'}
                                </div>
                              </div>
                            );
                          }

                          if (isDoc) {
                            return (
                              <a
                                key={pIdx}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2.5 rounded-lg border border-[#E8EAED] bg-white hover:border-[#F97316] transition-colors flex flex-col justify-between h-24 text-left group"
                              >
                                <div className="flex items-center gap-1.5 text-[#F97316]">
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6368]">
                                    {att.fileType || 'Documento'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-[#202124] line-clamp-1 group-hover:text-[#F97316]">
                                    {att.title}
                                  </p>
                                  {att.fileSize && (
                                    <span className="text-[10px] text-[#80868B]">{att.fileSize}</span>
                                  )}
                                </div>
                              </a>
                            );
                          }

                          return (
                            <div
                              key={pIdx}
                              onClick={() => setActivePhotoZoom(att)}
                              className="rounded-lg overflow-hidden border border-[#E8EAED] bg-white cursor-pointer h-24 group relative"
                            >
                              <img src={att.url} alt={att.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[10px] text-white truncate px-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {att.title}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New update form */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-[#E8EAED] p-5 space-y-4">
            <div className="border-b border-[#E8EAED] pb-3">
              <h2 className="text-sm font-semibold text-[#202124]">
                Registrar Nova Atualização
              </h2>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Registre o atendimento e tratamento da demanda do cliente
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FFFBF7] border border-orange-200/90 flex items-center gap-2.5 text-xs text-orange-950">
              <div className="w-7 h-7 rounded-full bg-[#F97316] text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-[11px] leading-tight">
                <div>Tratando demanda como: <strong className="font-bold text-[#202124]">{currentUser?.name || currentUser?.email?.split('@')[0] || 'Equipe Técnica'}</strong> ({currentUser?.teamRole || (currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'media_buyer' ? 'Media Buyer' : 'Gestor')})</div>
                <div className="text-[10px] text-[#80868B] mt-0.5">Data, hora e responsável ficarão gravados para auditoria da equipe.</div>
              </div>
            </div>

            <form onSubmit={handleSubmitUpdate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#5F6368] mb-1">
                  Etapa
                </label>
                <select
                  value={selectedStageName}
                  onChange={(e) => setSelectedStageName(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-[#E8EAED] bg-[#F8F9FA] text-xs text-[#202124] focus:outline-none focus:border-[#F97316]"
                >
                  {stages.map((stage, idx) => (
                    <option key={stage.id || idx} value={stage.name}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#5F6368]">
                    Mensagem
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiMessage}
                    disabled={isGeneratingAi}
                    className="text-[11px] font-medium text-[#F97316] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isGeneratingAi ? 'Gerando...' : 'Gerar com IA'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  placeholder="Escreva a mensagem de atualização..."
                  className="w-full p-2.5 rounded-lg border border-[#E8EAED] bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-[#F97316] text-xs text-[#202124] resize-none"
                />
              </div>

              {/* Attachments (Photos, Videos, Documents) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-[#5F6368] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>Anexos ({selectedPhotos.length})</span>
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="text-[11px] font-medium text-[#F97316] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Anexo</span>
                  </button>
                </div>

                {selectedPhotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPhotos.map((att, idx) => {
                      const isVid = att.type === 'video' || /\.(mp4|mov|webm|mkv)$/i.test(att.url);
                      const isDoc = att.type === 'document' || /\.(pdf|doc|docx|xls|xlsx|txt)$/i.test(att.url);

                      return (
                        <div key={idx} className="relative rounded-lg overflow-hidden border border-[#E8EAED] bg-[#F8F9FA] p-1.5">
                          {isVid ? (
                            <div className="h-16 rounded bg-black flex items-center justify-center relative overflow-hidden">
                              <video src={att.url} className="w-full h-full object-cover opacity-70" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="w-5 h-5 text-white fill-white" />
                              </div>
                              <span className="absolute bottom-1 left-1 text-[9px] bg-black/70 text-white px-1 rounded">Vídeo</span>
                            </div>
                          ) : isDoc ? (
                            <div className="h-16 rounded bg-white border border-[#E8EAED] flex flex-col justify-center items-center text-center p-1">
                              <FileText className="w-5 h-5 text-[#F97316]" />
                              <span className="text-[10px] text-[#202124] font-medium truncate w-full mt-0.5">{att.title}</span>
                              {att.fileSize && <span className="text-[8px] text-[#80868B]">{att.fileSize}</span>}
                            </div>
                          ) : (
                            <div className="h-16 rounded overflow-hidden">
                              <img src={att.url} alt={att.title} className="w-full h-full object-cover" />
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-[#5F6368] cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyWhatsapp}
                  onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                  className="rounded text-[#F97316] focus:ring-[#F97316]"
                />
                <span>Enviar notificação no WhatsApp</span>
              </label>

              <button
                type="submit"
                disabled={isSubmittingUpdate || !updateMessage.trim()}
                className="w-full h-9 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingUpdate ? 'Publicando...' : 'Publicar Atualização'}</span>
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB: ARQUIVOS */}
      {activeTab === 'files' && (() => {
        const totalUploaded = projectDocs.length;
        const contratosCount = projectDocs.filter(d => d.category === 'contrato').length + 1; // +1 contrato formal
        const termosCount = projectDocs.filter(d => d.category === 'termo').length;
        const aditivosCount = projectDocs.filter(d => d.category === 'aditivo').length;
        const plantasCount = projectDocs.filter(d => d.category === 'planta').length;
        const fotosCount = projectDocs.filter(d => d.category === 'foto').length;
        const outrosCount = projectDocs.filter(d => d.category === 'outro').length + 1; // +1 resumo pdf

        const filteredDocs = docCategoryFilter === 'all'
          ? projectDocs
          : projectDocs.filter(d => d.category === docCategoryFilter);

        const categoryPills: Array<{ id: string; label: string; count: number }> = [
          { id: 'all', label: 'Todos', count: totalUploaded + 2 },
          { id: 'contrato', label: 'Contratos', count: contratosCount },
          { id: 'termo', label: 'Termos & Garantias', count: termosCount },
          { id: 'aditivo', label: 'Aditivos', count: aditivosCount },
          { id: 'planta', label: 'Plantas & Projetos', count: plantasCount },
          { id: 'foto', label: 'Fotos & Imagens', count: fotosCount },
          { id: 'outro', label: 'Outros Anexos', count: outrosCount }
        ];

        const getCategoryBadge = (cat: string) => {
          switch (cat) {
            case 'contrato':
              return { label: 'Contrato', bg: 'bg-amber-50 text-amber-900 border-amber-200' };
            case 'termo':
              return { label: 'Termo / Garantia', bg: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
            case 'aditivo':
              return { label: 'Aditivo Contratual', bg: 'bg-purple-50 text-purple-900 border-purple-200' };
            case 'planta':
              return { label: 'Planta / Projeto', bg: 'bg-blue-50 text-blue-900 border-blue-200' };
            case 'foto':
              return { label: 'Foto / Imagem', bg: 'bg-rose-50 text-rose-900 border-rose-200' };
            default:
              return { label: 'Anexo', bg: 'bg-gray-100 text-gray-800 border-gray-200' };
          }
        };

        const getFileIcon = (docItem: ProjectDocument) => {
          if (docItem.category === 'foto' || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(docItem.name) || docItem.type.startsWith('image/')) {
            return <ImageIcon className="w-5 h-5 text-rose-600" />;
          }
          if (docItem.category === 'termo') {
            return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
          }
          if (docItem.category === 'planta') {
            return <Layers className="w-5 h-5 text-blue-600" />;
          }
          if (docItem.category === 'aditivo') {
            return <FileText className="w-5 h-5 text-purple-600" />;
          }
          return <FileText className="w-5 h-5 text-[#F97316]" />;
        };

        return (
          <div className="bg-white rounded-xl border border-[#E8EAED] p-5 space-y-5">
            {/* Header com botão de UPLOAD DE ANEXO em destaque */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EAED] pb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#202124]">
                  Documentos & Arquivos do Projeto
                </h2>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  Repositório seguro de contratos, termos, aditivos, plantas técnicas, memoriais e imagens importantes
                </p>
              </div>

              <button
                type="button"
                id="btn-open-upload-doc-modal"
                onClick={() => setShowUploadDocModal(true)}
                className="px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
              >
                <Upload className="w-4 h-4" />
                <span>Upload de Anexo</span>
              </button>
            </div>

            {/* Filtros de Categoria */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {categoryPills.map(pill => {
                const isActive = docCategoryFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setDocCategoryFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-[#202124] text-white shadow-2xs' 
                        : 'bg-[#F8F9FA] text-[#5F6368] hover:bg-[#F1F3F4] border border-[#E8EAED]'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#E8EAED] text-[#3C4043]'
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Documentos do Sistema (Contrato Digital & Resumo PDF) */}
            {(docCategoryFilter === 'all' || docCategoryFilter === 'contrato' || docCategoryFilter === 'outro') && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider block">
                  Documentos Oficiais do Sistema
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {(docCategoryFilter === 'all' || docCategoryFilter === 'contrato') && (
                    <div
                      onClick={() => setShowContractModal(true)}
                      className="p-4 rounded-xl bg-[#FFFBF7] border border-orange-200/80 hover:border-[#F97316] hover:shadow-2xs transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#F97316] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#202124] block group-hover:text-[#F97316] transition-colors">
                              Contrato do Projeto
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                              Contrato
                            </span>
                          </div>
                          <span className="text-[11px] text-[#5F6368] block mt-0.5">
                            Assinado digitalmente • Validação jurídica
                          </span>
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg text-[#80868B] group-hover:text-[#F97316] group-hover:bg-white transition-colors">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  )}

                  {(docCategoryFilter === 'all' || docCategoryFilter === 'outro') && (
                    <div
                      onClick={() => setShowSummaryPdfModal(true)}
                      className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E8EAED] hover:border-[#1967D2] hover:shadow-2xs transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#1967D2] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#202124] block group-hover:text-[#1967D2] transition-colors">
                              Resumo do Projeto (PDF Oficial)
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                              Relatório
                            </span>
                          </div>
                          <span className="text-[11px] text-[#5F6368] block mt-0.5">
                            Cronograma, financeiro e histórico auditável da equipe
                          </span>
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg text-[#80868B] group-hover:text-[#1967D2] group-hover:bg-white transition-colors">
                        <Download className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seção de Anexos Adicionados (Contratos, Termos, Aditivos, Fotos, Plantas) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider block">
                  Anexos e Documentos Vinculados ({filteredDocs.length})
                </span>
                <span className="text-xs text-[#80868B]">
                  Controle auditável por usuário
                </span>
              </div>

              {filteredDocs.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-[#DADCE0] bg-[#FAF8F5] text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-[#F97316] flex items-center justify-center mx-auto">
                    <FolderUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#202124]">
                      Nenhum anexo nesta categoria
                    </h4>
                    <p className="text-[11px] text-[#5F6368] max-w-sm mx-auto mt-0.5">
                      Adicione contratos assinados, termos de garantia, aditivos, relatórios de métricas, prints de criativos ou fluxogramas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUploadDocModal(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] text-xs font-semibold text-[#202124] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>Adicionar Primeiro Anexo</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredDocs.map((docItem) => {
                    const badge = getCategoryBadge(docItem.category);
                    const isImage = docItem.category === 'foto' || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(docItem.name) || docItem.type.startsWith('image/');

                    const handleView = () => {
                      if (docItem.url) {
                        setActivePhotoZoom({
                          url: docItem.url,
                          title: docItem.name,
                          caption: `${badge.label} • Enviado por ${docItem.uploadedBy || 'Equipe'} (${docItem.uploadedByRole || 'Oficina'}) em ${docItem.uploadedAt}`,
                          type: isImage ? 'image' : 'document',
                          fileType: docItem.type,
                          fileSize: docItem.size
                        });
                      }
                    };

                    const handleDownload = () => {
                      if (docItem.url) {
                        const link = document.createElement('a');
                        link.href = docItem.url;
                        link.download = docItem.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    };

                    return (
                      <div
                        key={docItem.id}
                        className="p-4 rounded-xl border border-[#E8EAED] bg-white hover:border-[#dadce0] shadow-2xs hover:shadow-xs transition-all space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 rounded-lg bg-[#F8F9FA] border border-[#E8EAED] shrink-0 mt-0.5">
                                {getFileIcon(docItem)}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[#202124] line-clamp-1" title={docItem.name}>
                                  {docItem.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${badge.bg}`}>
                                    {badge.label}
                                  </span>
                                  {docItem.size && (
                                    <span className="text-[10px] text-[#80868B] font-mono">
                                      {docItem.size}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={handleView}
                                className="p-1.5 rounded-lg text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
                                title="Visualizar documento"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleDownload}
                                className="p-1.5 rounded-lg text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
                                title="Baixar arquivo"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Deseja realmente excluir o documento "${docItem.name}"?`)) {
                                    handleDeleteDocument(docItem.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-[#80868B] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Excluir anexo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {docItem.description && (
                            <p className="text-[11px] text-[#5F6368] leading-relaxed line-clamp-2">
                              {docItem.description}
                            </p>
                          )}
                        </div>

                        {/* Registro Auditável: Quem fez o upload e quando */}
                        <div className="pt-2 border-t border-[#F1F3F4] flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-[#5F6368]">
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-[#80868B] shrink-0" />
                            <span>
                              Enviado por: <strong className="font-semibold text-[#202124]">{docItem.uploadedBy || 'Equipe Técnica'}</strong>
                              {docItem.uploadedByRole ? ` (${docItem.uploadedByRole})` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[#80868B] font-mono">
                            <Clock className="w-3 h-3 text-[#9AA0A6]" />
                            <span>{docItem.uploadedAt}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        );
      })()}

      {/* Confirmation Modal: Concluir Projeto */}
      {showConfirmFinishModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 border border-[#E8EAED] shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E6F4EA] text-[#137333] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#202124]">
                  Concluir Projeto
                </h3>
                <p className="text-[11px] text-[#5F6368]">
                  OS {project.code} • {project.clientName}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#5F6368] leading-relaxed">
              Deseja marcar todas as etapas como 100% concluídas e ativar o Certificado de Garantia no portal do cliente?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowConfirmFinishModal(false)}
                className="h-8 px-3 rounded-lg border border-[#E8EAED] bg-white hover:bg-[#F8F9FA] text-xs font-medium text-[#5F6368] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowConfirmFinishModal(false);
                  onCompleteProject(project.id);
                }}
                className="h-8 px-3.5 rounded-lg bg-[#188038] hover:bg-[#137333] text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Sim, Concluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal (Photo, Video, Document) */}
      {activePhotoZoom && (() => {
        const isVid = activePhotoZoom.type === 'video' || /\.(mp4|mov|webm|mkv)$/i.test(activePhotoZoom.url);
        const isDoc = activePhotoZoom.type === 'document' || /\.(pdf|doc|docx|xls|xlsx|txt)$/i.test(activePhotoZoom.url);

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setActivePhotoZoom(null)}
          >
            <div className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden p-5 space-y-3.5 shadow-2xl border border-[#ded8cd]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-2 border-b border-[#E8EAED]">
                <div className="flex items-center gap-2">
                  {isVid ? (
                    <Play className="w-4 h-4 text-[#F97316]" />
                  ) : isDoc ? (
                    <FileText className="w-4 h-4 text-[#F97316]" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-[#F97316]" />
                  )}
                  <span className="text-xs font-bold text-[#202124] truncate max-w-sm sm:max-w-md">{activePhotoZoom.title}</span>
                </div>
                <button onClick={() => setActivePhotoZoom(null)} className="p-1 rounded-md hover:bg-[#F8F9FA] text-[#5F6368] cursor-pointer" aria-label="Fechar">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isVid ? (
                <div className="bg-black rounded-xl overflow-hidden max-h-[70vh] flex items-center justify-center">
                  <video src={activePhotoZoom.url} controls autoPlay className="w-full max-h-[65vh] object-contain rounded-lg" />
                </div>
              ) : isDoc ? (
                <div className="p-8 text-center space-y-3 bg-[#F8F9FA] rounded-xl border border-[#E8EAED]">
                  <FileText className="w-12 h-12 text-[#F97316] mx-auto" />
                  <h4 className="text-sm font-bold text-[#202124]">{activePhotoZoom.title}</h4>
                  {activePhotoZoom.fileSize && (
                    <span className="text-xs text-[#80868B] block">{activePhotoZoom.fileSize}</span>
                  )}
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <a
                      href={activePhotoZoom.url}
                      target="_blank"
                      rel="noreferrer"
                      download={activePhotoZoom.title}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Abrir / Baixar Documento</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden bg-black/5 flex items-center justify-center">
                  <img src={activePhotoZoom.url} alt={activePhotoZoom.title} className="w-full max-h-[70vh] object-contain rounded-lg" />
                </div>
              )}

              {activePhotoZoom.caption && (
                <p className="text-xs text-[#5F6368]">{activePhotoZoom.caption}</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modals */}
      {showProofModal && paidInstallment && (
        <ProofPaymentModal
          project={project}
          installment={paidInstallment}
          onClose={() => setShowProofModal(false)}
        />
      )}

      {showEditBudgetModal && (
        <EditBudgetModal
          project={project}
          onClose={() => setShowEditBudgetModal(false)}
          onSave={(newTotal, newInstallments) => onUpdateBudget(project.id, newTotal, newInstallments)}
        />
      )}

      {showContractModal && (
        <ContractViewerModal
          project={project}
          onClose={() => setShowContractModal(false)}
        />
      )}

      {showHistoryModal && (
        <BudgetHistoryModal
          project={project}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {showSummaryPdfModal && (
        <ProjectSummaryPdfModal
          project={project}
          isOpen={showSummaryPdfModal}
          onClose={() => setShowSummaryPdfModal(false)}
        />
      )}

      {/* Modal: Editar Dados do Projeto & Status */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#ded8cd] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#f0ebe1] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#F97316] flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1c1c1a]">Editar Dados & Status do Projeto</h3>
                  <p className="text-xs text-[#73736c]">{project.code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-[#73736c] hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#57534e] mb-1">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  required
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white focus:ring-2 focus:ring-[#F97316]/30 text-xs font-semibold text-[#1c1c1a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#57534e] mb-1">
                  Telefone / WhatsApp do Cliente
                </label>
                <input
                  type="text"
                  value={editClientPhone}
                  onChange={(e) => setEditClientPhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                  className="w-full p-2.5 rounded-xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white focus:ring-2 focus:ring-[#F97316]/30 text-xs font-semibold text-[#1c1c1a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#57534e] mb-1">
                  Título do Projeto
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white focus:ring-2 focus:ring-[#F97316]/30 text-xs font-semibold text-[#1c1c1a]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#57534e] mb-1">
                    Prazo Previsto de Entrega
                  </label>
                  <input
                    type="text"
                    value={editDeliveryDate}
                    onChange={(e) => setEditDeliveryDate(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full p-2.5 rounded-xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white focus:ring-2 focus:ring-[#F97316]/30 text-xs font-semibold text-[#1c1c1a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#57534e] mb-1">
                    Status do Projeto
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white focus:ring-2 focus:ring-[#F97316]/30 text-xs font-semibold text-[#1c1c1a]"
                  >
                    <option value="em_andamento">Em Andamento</option>
                    <option value="proposta_aprovada">Proposta Aprovada</option>
                    <option value="atencao">Requer Atenção</option>
                    <option value="concluido">Concluído (100%)</option>
                  </select>
                </div>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <span className="font-bold text-red-800">⚠️</span>
                  <span>{editError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#f0ebe1] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#ded8cd] text-xs font-bold text-[#57534e] hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão com digitação do código do projeto */}
      <DeleteProjectConfirmationModal
        isOpen={isDeleteModalOpen}
        project={project}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={async (id) => {
          if (onDeleteProject) {
            await onDeleteProject(id);
          }
        }}
      />

      {/* Modal: Upload de Anexo (Contratos, Termos, Aditivos, Imagens, Plantas) */}
      {showUploadDocModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#ded8cd] space-y-4 animate-in zoom-in-95 duration-150 text-[#1c1c1a]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#f0ebe1] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#F97316] flex items-center justify-center font-bold">
                  <FolderUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1c1c1a]">Upload de Anexo do Projeto</h3>
                  <p className="text-xs text-[#73736c]">OS {project.code} • {project.clientName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadDocModal(false);
                  setNewDocFile(null);
                  setNewDocTitle('');
                  setNewDocDescription('');
                }}
                className="p-1 rounded-lg text-[#73736c] hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner de auditoria de quem está fazendo o upload */}
            <div className="p-3 rounded-xl bg-[#FFFBF7] border border-orange-200/90 flex items-center gap-2.5 text-xs text-orange-950">
              <div className="w-8 h-8 rounded-full bg-[#F97316] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                <User className="w-4 h-4" />
              </div>
              <div className="text-[11px] leading-tight">
                <div>Enviando anexo como: <strong className="font-bold text-[#202124]">{currentUser?.name || currentUser?.email?.split('@')[0] || 'Equipe Técnica'}</strong> ({currentUser?.teamRole || (currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'media_buyer' ? 'Media Buyer' : 'Gestor')})</div>
                <div className="text-[10px] text-[#80868B] mt-0.5">Seu nome, cargo, data e hora ficarão registrados no documento para controle do time.</div>
              </div>
            </div>

            <form onSubmit={handleConfirmDocUpload} className="space-y-3.5">
              {/* Categoria do Anexo */}
              <div>
                <label className="block text-xs font-bold text-[#57534e] mb-1">
                  Categoria do Anexo *
                </label>
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white focus:ring-2 focus:ring-[#F97316]/30 text-xs font-semibold text-[#1c1c1a]"
                >
                  <option value="contrato">Contrato Principal / Minuta</option>
                  <option value="termo">Termo de Garantia / Aceite Técnico</option>
                  <option value="aditivo">Aditivo Contratual / Acréscimo</option>
                  <option value="planta">Planta Baixa / Projeto Técnico 3D</option>
                  <option value="foto">Foto / Imagem da Obra</option>
                  <option value="outro">Outro Documento</option>
                </select>
              </div>

              {/* Seletor de Arquivo */}
              <div>
                <label className="block text-xs font-bold text-[#57534e] mb-1">
                  Arquivo para Anexo *
                </label>
                <input
                  type="file"
                  ref={docFileInputRef}
                  onChange={handleSelectDocFile}
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.txt,.zip,.rar"
                  className="hidden"
                />

                {newDocFile ? (
                  <div className="p-3 rounded-xl border-2 border-emerald-500/50 bg-emerald-50/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-[#202124] block truncate">
                          {newDocFile.name}
                        </span>
                        <span className="text-[10px] text-emerald-800 font-mono">
                          {newDocFile.size} • Pronto para upload
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => docFileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#5F6368] hover:text-[#202124] bg-white border border-[#DADCE0] rounded-lg cursor-pointer shrink-0"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => docFileInputRef.current?.click()}
                    className="p-5 rounded-xl border-2 border-dashed border-[#DADCE0] hover:border-[#F97316] bg-[#FAF8F5] hover:bg-orange-50/20 transition-all text-center cursor-pointer space-y-1.5"
                  >
                    <Upload className="w-6 h-6 text-[#F97316] mx-auto" />
                    <div className="text-xs font-bold text-[#202124]">
                      Clique para escolher o arquivo
                    </div>
                    <p className="text-[10px] text-[#80868B]">
                      PDF, Word, Excel, Imagens (JPG, PNG), Plantas ou arquivos compactados
                    </p>
                  </div>
                )}
              </div>

              {/* Título / Nome do Documento */}
              <div>
                <label className="block text-xs font-bold text-[#57534e] mb-1">
                  Título / Nome do Documento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Contrato Assinado - Marcenaria Completa"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white focus:ring-2 focus:ring-[#F97316]/30 text-xs font-semibold text-[#1c1c1a]"
                />
              </div>

              {/* Descrição / Observações */}
              <div>
                <label className="block text-xs font-bold text-[#57534e] mb-1">
                  Observações / Detalhes (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva detalhes relevantes deste anexo..."
                  value={newDocDescription}
                  onChange={(e) => setNewDocDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#ded8cd] bg-[#fcfaf7] focus:bg-white focus:ring-2 focus:ring-[#F97316]/30 text-xs text-[#1c1c1a] resize-none"
                />
              </div>

              {/* Ações */}
              <div className="pt-3 border-t border-[#f0ebe1] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadDocModal(false);
                    setNewDocFile(null);
                    setNewDocTitle('');
                    setNewDocDescription('');
                  }}
                  className="px-4 py-2 rounded-xl border border-[#ded8cd] text-xs font-bold text-[#57534e] hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploadingDoc || !newDocFile || !newDocTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUploadingDoc ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando Anexo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Confirmar Upload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
