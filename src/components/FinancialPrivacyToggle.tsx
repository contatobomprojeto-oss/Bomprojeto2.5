import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useFinancialPrivacy } from '../hooks/useFinancialPrivacy';

export interface FinancialPrivacyToggleProps {
  id?: string;
  size?: 'xs' | 'sm' | 'md' | 'icon';
  variant?: 'default' | 'amber' | 'ghost' | 'pill';
  showLabel?: boolean;
  className?: string;
  title?: string;
}

/**
 * Botão Oficial de Privacidade Financeira (Modo Borrão/Blur).
 * Exibe apenas o ícone do olho:
 * - Olho com traço (EyeOff) quando em modo privacidade (dados borrados).
 * - Olho sem traço (Eye) quando os valores estão visíveis.
 */
export const FinancialPrivacyToggle: React.FC<FinancialPrivacyToggleProps> = ({
  id,
  size = 'sm',
  variant = 'default',
  showLabel = false,
  className = '',
  title
}) => {
  const { hideFinancials, toggleHideFinancials } = useFinancialPrivacy();

  const computedTitle = title || (
    hideFinancials
      ? 'Modo Privacidade ativado (valores borrados). Clique para exibir os valores.'
      : 'Modo Privacidade desativado. Clique para borrar os dados financeiros.'
  );

  // Size configs: dimensões quadradas para ícone limpo
  const sizeClasses = {
    xs: 'w-7 h-7',
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    icon: 'w-8 h-8'
  }[size];

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    icon: 'w-4 h-4'
  }[size];

  // Variant themes
  let variantClasses = '';
  if (hideFinancials) {
    variantClasses = 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 hover:border-amber-400 shadow-2xs';
  } else if (variant === 'amber') {
    variantClasses = 'bg-[#FFF8F3] border-[#FFD9C2] text-[#C2410C] hover:bg-[#FFEDD5]';
  } else if (variant === 'ghost') {
    variantClasses = 'bg-transparent border-transparent text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124]';
  } else if (variant === 'pill') {
    variantClasses = 'bg-white border-[#E8EAED] text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] rounded-full shadow-2xs';
  } else {
    // default
    variantClasses = 'bg-white border-[#E8EAED] text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124] shadow-2xs';
  }

  const roundedClass = variant === 'pill' ? 'rounded-full' : 'rounded-lg';

  return (
    <button
      id={id || 'btn-financial-privacy-toggle'}
      type="button"
      onClick={toggleHideFinancials}
      title={computedTitle}
      aria-label={hideFinancials ? 'Mostrar dados financeiros' : 'Ocultar dados financeiros com efeito borrado'}
      className={`inline-flex items-center justify-center border transition-all cursor-pointer select-none shrink-0 ${sizeClasses} ${variantClasses} ${roundedClass} ${className}`}
    >
      {hideFinancials ? (
        <EyeOff className={`${iconSizes} text-amber-700 shrink-0`} />
      ) : (
        <Eye className={`${iconSizes} text-[#5F6368] shrink-0`} />
      )}
    </button>
  );
};

/**
 * Componente que envolve qualquer valor monetário ou dado sensível
 * aplicando o efeito de blur caso o Modo Privacidade esteja ativado.
 */
export const FinancialBlur: React.FC<{
  children: React.ReactNode;
  className?: string;
  allowClickToReveal?: boolean;
}> = ({ children, className = '', allowClickToReveal = true }) => {
  const { hideFinancials, toggleHideFinancials } = useFinancialPrivacy();

  if (!hideFinancials) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      onClick={allowClickToReveal ? toggleHideFinancials : undefined}
      title="Dado financeiro borrado para privacidade. Clique para revelar."
      className={`inline-block filter blur-[7px] select-none transition-all duration-200 hover:blur-[4px] cursor-pointer ${className}`}
    >
      {children}
    </span>
  );
};

/**
 * Banner removido conforme instrução do usuário (mantido apenas como null por compatibilidade).
 */
export const FinancialPrivacyBanner: React.FC<{
  className?: string;
  contextText?: string;
}> = () => {
  return null;
};
