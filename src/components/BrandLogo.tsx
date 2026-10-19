import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'mark' | 'horizontal';
  theme?: 'dark' | 'light';
  showSubtitle?: boolean;
}

export const BrandMark: React.FC<{ className?: string; size?: number | string; inverted?: boolean }> = ({ 
  className = "w-8 h-8", 
  size,
  inverted = false 
}) => {
  // Cores fixas e blindadas tanto no mobile quanto no desktop:
  // Fundo claro (padrão): pontos escuros #0F172A com acento laranja #F97316
  // Fundo escuro (se explicitamente inverted): pontos brancos #FFFFFF com acento laranja #F97316
  const dotColor = inverted ? "#FFFFFF" : "#0F172A";
  const accentColor = "#F97316"; // Brand orange accent oficial BomProjeto

  return (
    <svg 
      viewBox="0 0 400 400" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        ...(size ? { width: size, height: size } : {}),
        display: 'inline-block'
      }}
      aria-label="BOMProjeto Ícone"
    >
      {/* Linha Superior - 3 pontos pequenos */}
      <circle cx="134" cy="92" r="17" fill={dotColor} style={{ fill: dotColor }} />
      <circle cx="200" cy="92" r="17" fill={dotColor} style={{ fill: dotColor }} />
      <circle cx="266" cy="92" r="17" fill={dotColor} style={{ fill: dotColor }} />

      {/* Linha Intermediária - 3 pontos médios laranja vibrante */}
      <circle cx="113" cy="176" r="29" fill={accentColor} style={{ fill: accentColor }} />
      <circle cx="200" cy="176" r="29" fill={accentColor} style={{ fill: accentColor }} />
      <circle cx="287" cy="176" r="29" fill={accentColor} style={{ fill: accentColor }} />

      {/* Linha Inferior - 3 pontos grandes */}
      <circle cx="80" cy="285" r="40" fill={dotColor} style={{ fill: dotColor }} />
      <circle cx="200" cy="285" r="40" fill={dotColor} style={{ fill: dotColor }} />
      <circle cx="320" cy="285" r="40" fill={dotColor} style={{ fill: dotColor }} />
    </svg>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  size = 'md',
  variant = 'full',
  theme = 'light',
  showSubtitle = false
}) => {
  const isDark = theme === 'dark';
  
  const sizeMap = {
    xs: { mark: 'w-5 h-5', text: 'text-base', sub: 'text-[8px]' },
    sm: { mark: 'w-6 h-6', text: 'text-lg', sub: 'text-[9px]' },
    md: { mark: 'w-7 h-7', text: 'text-xl', sub: 'text-[10px]' },
    lg: { mark: 'w-9 h-9', text: 'text-2xl', sub: 'text-xs' },
    xl: { mark: 'w-11 h-11', text: 'text-3xl', sub: 'text-sm' }
  };

  const { mark: markSize, text: textSize, sub: subSize } = sizeMap[size] || sizeMap.md;

  if (variant === 'mark') {
    return <BrandMark className={`${markSize} ${className}`} inverted={isDark} />;
  }

  // Cores idênticas e blindadas para mobile e desktop, sem depender de media queries de dark mode
  const mainTextColor = isDark ? "#FFFFFF" : "#0F172A";
  const subtitleColor = isDark ? "#94A3B8" : "#64748B";

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <BrandMark className={`${markSize} shrink-0`} inverted={isDark} />
      
      <div className="flex flex-col justify-center leading-none">
        <div className={`font-bold tracking-tight ${textSize} flex items-baseline font-sans`}>
          <span 
            className="font-extrabold tracking-tight"
            style={{ color: mainTextColor }}
          >
            Bom
          </span>
          <span 
            className="font-light ml-0.5 tracking-tight"
            style={{ color: mainTextColor, opacity: isDark ? 0.95 : 1 }}
          >
            Projeto
          </span>
          <span 
            className="w-1.5 h-1.5 rounded-full ml-1 mb-0.5 inline-block shrink-0" 
            style={{ backgroundColor: '#F97316' }}
          />
        </div>
        {showSubtitle && (
          <span 
            className={`text-[10px] tracking-wider uppercase font-medium mt-0.5`}
            style={{ color: subtitleColor }}
          >
            SaaS Platform
          </span>
        )}
      </div>
    </div>
  );
};
