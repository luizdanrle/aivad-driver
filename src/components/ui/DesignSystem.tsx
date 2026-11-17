import React, { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  Download,
  HelpCircle,
  Info,
  Layers,
  Lightbulb,
  Moon,
  Sparkles,
  Sun,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import type {
  DriverModuleGuide,
  HonestOperationalStatus,
  OnboardingStepDefinition,
  ProgressiveOnboardingState,
} from '../../core/moduleGuides';
import type { EpistemicTag, FloatingDockConfig, ThemeMode } from '../../models/types';

export const PhoenixLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 128 128"
    fill="none"
    aria-hidden="true"
    className={`shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="aivadBadgeBg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1E3A8A" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>
      <linearGradient id="aivadWingBlue" x1="22" y1="18" x2="106" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient id="aivadFlameRed" x1="40" y1="26" x2="88" y2="78" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FB7185" />
        <stop offset="100%" stopColor="#E11D48" />
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#aivadBadgeBg)" />
    <path
      d="M64 18L73 34L86 24L80 46L106 36L88 64L102 74L78 82L84 104L64 90L44 104L50 82L26 74L40 64L22 36L48 46L42 24L55 34L64 18Z"
      fill="url(#aivadWingBlue)"
    />
    <path
      d="M64 26L71 42L88 46L74 62L84 78L64 72L44 78L54 62L40 46L57 42L64 26Z"
      fill="url(#aivadFlameRed)"
    />
    <path d="M64 38L69 52L64 66L59 52L64 38Z" fill="#FFFFFF" />
  </svg>
);

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'ai'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'floating';

export type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-700 hover:bg-blue-600 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white border border-blue-700/80 dark:border-blue-500/80 shadow-xs',
  secondary:
    'bg-white hover:bg-blue-50/70 active:bg-blue-100/60 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500',
  accent:
    'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white border border-rose-600/80 shadow-xs',
  ai:
    'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white border border-indigo-500/80 shadow-xs',
  success:
    'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-600/80 shadow-xs',
  warning:
    'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold border border-amber-500/80 shadow-xs',
  danger:
    'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white border border-red-600/80 shadow-xs',
  neutral:
    'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700',
  floating:
    'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white border border-blue-400/40 shadow-[var(--aivad-shadow-floating)]',
};

const BUTTON_SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'min-h-[42px] px-4 py-2 text-xs sm:text-sm rounded-xl gap-2',
  lg: 'min-h-[48px] px-5 py-2.5 text-sm rounded-2xl gap-2.5',
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: React.ReactNode;
    rightIcon?: React.ReactNode;
  }
> = ({
  variant = 'primary',
  size = 'md',
  icon,
  rightIcon,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={prefersReducedMotion || disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.12 }}
      className={`inline-flex items-center justify-center font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${BUTTON_VARIANT_STYLES[variant]} ${BUTTON_SIZE_STYLES[size]} ${className}`}
      {...(rest as Record<string, unknown>)}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
    </motion.button>
  );
};

export interface QuickActionItem {
  id: string;
  label: string;
  sublabel: string;
  variant: 'primary' | 'accent' | 'ai' | 'success';
  icon: React.ReactNode;
  onSelect: () => void;
}

export const FloatingActionButton: React.FC<{
  label: string;
  ariaLabel?: string;
  variant?: 'primary' | 'accent' | 'ai' | 'success' | 'warning' | 'danger' | 'neutral';
  icon: React.ReactNode;
  onClick?: () => void;
  badgeText?: string;
  actions?: QuickActionItem[];
  dockConfig?: FloatingDockConfig;
  className?: string;
}> = ({
  label,
  ariaLabel,
  variant = 'primary',
  icon,
  onClick,
  badgeText,
  actions,
  dockConfig,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  if (dockConfig && dockConfig.enabled === false) {
    return null;
  }

  const effectiveVariant: NonNullable<typeof variant> =
    dockConfig?.themeTone === 'vermelho'
      ? 'accent'
      : dockConfig?.themeTone === 'indigo'
      ? 'ai'
      : dockConfig?.themeTone === 'esmeralda'
      ? 'success'
      : dockConfig?.themeTone === 'azul'
      ? 'primary'
      : variant;

  const isCustomDock = dockConfig?.themeTone === 'personalizado';
  const dockLeft = dockConfig?.position === 'Inferior esquerdo';

  const fabTone: Record<NonNullable<typeof variant>, string> = {
    primary:
      'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 dark:from-blue-600 dark:to-indigo-600 text-white ring-2 ring-white/80 dark:ring-blue-400/30 shadow-[0_12px_30px_-6px_rgba(29,78,216,0.45)]',
    accent:
      'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white ring-2 ring-white/80 dark:ring-rose-400/30 shadow-[0_12px_30px_-6px_rgba(225,29,72,0.45)]',
    ai:
      'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white ring-2 ring-white/80 dark:ring-indigo-400/30 shadow-[0_12px_30px_-6px_rgba(79,70,229,0.45)]',
    success:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white ring-2 ring-white/80 dark:ring-emerald-400/30 shadow-[0_12px_30px_-6px_rgba(5,150,105,0.42)]',
    warning:
      'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-white/80 dark:ring-amber-300/40 shadow-[0_12px_28px_-6px_rgba(245,158,11,0.42)]',
    danger:
      'bg-red-600 hover:bg-red-500 text-white ring-2 ring-white/80 dark:ring-red-400/30 shadow-[0_12px_28px_-6px_rgba(220,38,38,0.45)]',
    neutral:
      'bg-white/95 hover:bg-blue-50 dark:bg-slate-800/95 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-lg',
  };

  const actionDotTone = {
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300',
    accent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300',
    ai: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300',
  };

  const handleMainClick = () => {
    if (actions && actions.length > 0) {
      setOpen((o) => !o);
    } else {
      onClick?.();
    }
  };

  return (
    <div
      data-testid="aivad-floating-action-dock"
      data-dock-position={dockConfig?.position ?? 'Inferior direito'}
      data-dock-theme={dockConfig?.themeTone ?? effectiveVariant}
      style={
        dockConfig
          ? {
              ...(dockLeft
                ? { left: `${Math.max(12, dockConfig.marginSidePx ?? 24)}px` }
                : { right: `${Math.max(12, dockConfig.marginSidePx ?? 24)}px` }),
            }
          : undefined
      }
      className={`fixed bottom-[66px] lg:bottom-6 ${
        dockLeft ? 'left-3 sm:left-6 items-start' : 'right-3 sm:right-6 items-end'
      } z-40 flex flex-col gap-2.5 no-print ${className}`}
    >
      <AnimatePresence>
        {open && actions && actions.length > 0 && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-72 rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/98 dark:bg-[#131F36]/98 backdrop-blur-md p-2.5 shadow-2xl space-y-1.5"
          >
            <div className="px-2.5 py-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Ações Rápidas Operacionais
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar ações rápidas"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {actions.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  act.onSelect();
                  setOpen(false);
                }}
                className="w-full min-h-[48px] p-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-blue-50/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${actionDotTone[act.variant]}`}
                >
                  {act.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                    {act.label}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {act.sublabel}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleMainClick}
        aria-label={ariaLabel ?? label}
        aria-expanded={actions && actions.length > 0 ? open : undefined}
        whileHover={prefersReducedMotion ? undefined : { y: -2 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
        transition={{ duration: 0.14 }}
        style={
          isCustomDock && dockConfig
            ? {
                backgroundColor: dockConfig.bgColor,
                color: dockConfig.textColor,
                borderColor: dockConfig.borderColor,
                borderWidth: '2px',
                borderStyle: 'solid',
              }
            : undefined
        }
        className={`min-h-[44px] sm:min-h-[48px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full inline-flex items-center gap-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-lg ${
          isCustomDock ? '' : fabTone[effectiveVariant]
        }`}
      >
        <span className="shrink-0 flex items-center">{open ? <X className="w-4 h-4" /> : icon}</span>
        <span className="whitespace-nowrap">{open ? 'Fechar Atalhos' : label}</span>
        {badgeText && !open && (
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono-tabular font-extrabold">
            {badgeText}
          </span>
        )}
      </motion.button>
    </div>
  );
};

export const Card: React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'elevated' | 'tinted-blue' | 'tinted-ai';
  }
> = ({ children, className = '', variant = 'default', ...rest }) => {
  const variantStyles = {
    default:
      'border border-slate-200/90 dark:border-[#1E2D4A] bg-white dark:bg-[#0F182B] shadow-[var(--aivad-shadow-soft)]',
    elevated:
      'border border-slate-200 dark:border-[#2B3F66] bg-white dark:bg-[#131F36] shadow-md',
    'tinted-blue':
      'border border-blue-200/90 dark:border-blue-800/70 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/50 dark:from-blue-950/45 dark:via-[#0F182B] dark:to-indigo-950/30',
    'tinted-ai':
      'border border-indigo-200/90 dark:border-indigo-800/70 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 dark:from-indigo-950/40 dark:via-[#0F182B] dark:to-blue-950/30',
  }[variant];

  return (
    <div {...rest} className={`rounded-2xl ${variantStyles} ${className}`}>
      {children}
    </div>
  );
};

export const Badge: React.FC<{
  tone?: 'emerald' | 'amber' | 'blue' | 'red' | 'indigo' | 'slate';
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'slate', children, className = '' }) => {
  const toneClasses: Record<NonNullable<typeof tone>, string> = {
    emerald:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/55 dark:text-emerald-300 dark:border-emerald-800/80',
    amber:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/55 dark:text-amber-300 dark:border-amber-800/80',
    blue:
      'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/55 dark:text-blue-300 dark:border-blue-800/80',
    red:
      'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/55 dark:text-rose-300 dark:border-rose-800/80',
    indigo:
      'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/55 dark:text-indigo-300 dark:border-indigo-800/80',
    slate:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-700',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

export const Tooltip: React.FC<{
  label: string;
  explanation: string;
}> = ({ label, explanation }) => {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`Ajuda contextual: ${label}`}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={tipId}
            role="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#172540] text-[11px] font-normal leading-relaxed text-slate-700 dark:text-slate-200 shadow-xl pointer-events-none"
          >
            <strong className="block font-bold text-slate-900 dark:text-white mb-0.5">{label}</strong>
            {explanation}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

export const InputField: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    hint?: string;
    tooltip?: string;
  }
> = ({ label, hint, tooltip, id, className = '', ...rest }) => {
  const autoId = useId();
  const resolvedId = id ?? autoId;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-1">
        <label htmlFor={resolvedId} className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
          <span>{label}</span>
          {tooltip && <Tooltip label={label} explanation={tooltip} />}
        </label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      <input
        id={resolvedId}
        className={`w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324] text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 transition-colors ${className}`}
        {...rest}
      />
    </div>
  );
};

export const SelectField: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label: string;
    tooltip?: string;
  }
> = ({ label, tooltip, id, className = '', children, ...rest }) => {
  const autoId = useId();
  const resolvedId = id ?? autoId;
  return (
    <div className="space-y-1">
      <label htmlFor={resolvedId} className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
        <span>{label}</span>
        {tooltip && <Tooltip label={label} explanation={tooltip} />}
      </label>
      <select
        id={resolvedId}
        className={`w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324] text-xs sm:text-sm text-slate-900 dark:text-white focus:border-blue-600 transition-colors ${className}`}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
};

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = 'h-16 w-full' }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70 ${className}`}
  />
);

export const SectionHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
    <div className="space-y-1">
      {eyebrow && (
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
          {eyebrow}
        </p>
      )}
      <h2 className="text-lg sm:text-xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h2>
      {description && (
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const StatusLabel: React.FC<{
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  text: string;
}> = ({ tone, text }) => {
  const styles = {
    success: 'text-emerald-700 dark:text-emerald-400',
    warning: 'text-amber-700 dark:text-amber-400',
    danger: 'text-red-700 dark:text-red-400',
    info: 'text-blue-700 dark:text-blue-400',
    neutral: 'text-slate-600 dark:text-slate-400',
  }[tone];

  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning'
      ? AlertTriangle
      : tone === 'danger'
      ? XCircle
      : Info;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${styles}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{text}</span>
    </span>
  );
};

export const EpistemicTagBadge: React.FC<{ tag: EpistemicTag }> = ({ tag }) => {
  const badgeStyle: Record<EpistemicTag, string> = {
    'Informação confirmada':
      'text-emerald-700 dark:text-emerald-300',
    'Informação histórica':
      'text-blue-700 dark:text-blue-300',
    Estimativa:
      'text-amber-700 dark:text-amber-300',
    Previsão:
      'text-indigo-700 dark:text-indigo-300',
    'Informação indisponível':
      'text-slate-500 dark:text-slate-400',
    'Dados de demonstração':
      'text-slate-500 dark:text-slate-400',
  };
  return (
    <span className={`text-[11px] font-semibold whitespace-nowrap ${badgeStyle[tag]}`}>
      {tag}
    </span>
  );
};

export const MetricCard: React.FC<{
  label: string;
  value: string;
  subtext?: string;
  explanation: string;
  formula: string;
  onDrillDown?: () => void;
  drillDownLabel?: string;
  accent?: 'blue' | 'red' | 'emerald' | 'neutral';
}> = ({
  label,
  value,
  subtext,
  explanation,
  formula,
  onDrillDown,
  drillDownLabel = 'Abrir análise',
  accent = 'neutral',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [showInfo, setShowInfo] = useState(false);

  const valueTone =
    accent === 'blue'
      ? 'text-blue-700 dark:text-blue-400'
      : accent === 'red'
      ? 'text-rose-600 dark:text-rose-400'
      : accent === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-slate-900 dark:text-white';

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Card className="p-4 sm:p-5 h-full flex flex-col justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-snug">
            {label}
          </span>
          <button
            type="button"
            onClick={() => setShowInfo((s) => !s)}
            aria-label={`Explicação do indicador ${label}`}
            title="O que representa e como é calculado"
            className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        <div>
          <div className={`text-2xl font-extrabold font-mono-tabular tracking-tight ${valueTone}`}>
            {value}
          </div>
          {subtext && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
          )}
        </div>

        <AnimatePresence initial={false}>
          {showInfo && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-3 rounded-xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200/70 dark:border-slate-700 text-xs space-y-1.5"
            >
              <p className="text-slate-700 dark:text-slate-200">
                <strong>O que representa:</strong> {explanation}
              </p>
              <p className="text-slate-500 dark:text-slate-400 font-mono-tabular text-[11px]">
                <strong>Fórmula:</strong> {formula}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {onDrillDown && (
          <button
            type="button"
            onClick={onDrillDown}
            className="inline-flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer"
          >
            <span>{drillDownLabel}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </Card>
    </motion.div>
  );
};

export const ContextualHelpBanner: React.FC<{
  title: string;
  description: string;
  demoNotice?: string;
}> = ({ title, description, demoNotice }) => (
  <div className="rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-gradient-to-r from-blue-50/85 via-white to-indigo-50/60 dark:from-blue-950/35 dark:via-[#0F182B] dark:to-indigo-950/25 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
        <Info className="w-4 h-4" />
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
        <p className="font-bold text-sm text-slate-900 dark:text-white">{title}</p>
        <p className="leading-relaxed">{description}</p>
      </div>
    </div>
    {demoNotice && (
      <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap shrink-0">
        {demoNotice}
      </span>
    )}
  </div>
);

const OPERATIONAL_STATUS_TONE: Record<
  HonestOperationalStatus,
  { tone: 'success' | 'info' | 'warning' | 'neutral'; icon: React.ComponentType<{ className?: string }> }
> = {
  Operacional: { tone: 'success', icon: CheckCircle2 },
  'Operacional (Web/PWA)': { tone: 'info', icon: Sparkles },
  'Demonstração / Sandbox': { tone: 'warning', icon: Layers },
  'Não configurado': { tone: 'neutral', icon: Info },
  'Preparação Nativa (Windsurf)': { tone: 'warning', icon: Compass },
};

export const ModuleGuideBanner: React.FC<{
  guide: DriverModuleGuide;
  onNavigate?: (targetNav: string) => void;
  onStartInteractiveGuide?: () => void;
  onOpenGuideHub?: () => void;
}> = ({ guide, onNavigate, onStartInteractiveGuide, onOpenGuideHub }) => {
  const prefersReducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const statusCfg = OPERATIONAL_STATUS_TONE[guide.operationalStatus];

  return (
    <Card
      variant="tinted-blue"
      className="p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-blue-700 dark:text-blue-400">{guide.categoryLabel}</span>
            <span aria-hidden="true">·</span>
            <StatusLabel tone={statusCfg.tone} text={`Estado: ${guide.operationalStatus}`} />
          </div>
          <h2 className="text-lg sm:text-xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white">
            {guide.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            {guide.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onStartInteractiveGuide && (
            <Button
              variant="ai"
              size="sm"
              onClick={onStartInteractiveGuide}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Assistente passo a passo
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            icon={<BookOpen className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />}
            rightIcon={
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              />
            }
          >
            {expanded ? 'Ocultar Guia do Módulo' : 'Como funciona?'}
          </Button>

          {onOpenGuideHub && (
            <Button
              variant="neutral"
              size="sm"
              onClick={onOpenGuideHub}
              icon={<Compass className="w-3.5 h-3.5" />}
            >
              Todos os Guias
            </Button>
          )}

          {guide.primaryAction?.targetNav && onNavigate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate(guide.primaryAction!.targetNav!)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {guide.primaryAction.label}
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key={`guide-body-${guide.id}`}
            initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            data-testid="module-knowledge-guide-panel"
            className="pt-4 border-t border-blue-200/70 dark:border-blue-800/50 space-y-4 text-xs"
          >
            {/* 7 Mandatory Questions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#0F182B]/90 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <p className="font-bold text-blue-700 dark:text-blue-400">1. O que é este módulo?</p>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{guide.whatIsIt}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#0F182B]/90 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <p className="font-bold text-blue-700 dark:text-blue-400">2. Para que serve?</p>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{guide.whatFor}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#0F182B]/90 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <p className="font-bold text-blue-700 dark:text-blue-400">3. Quando devo utilizar?</p>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{guide.whenToUse}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#0F182B]/90 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <p className="font-bold text-indigo-700 dark:text-indigo-400">4. Como funciona?</p>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{guide.howItWorks}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#0F182B]/90 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <p className="font-bold text-indigo-700 dark:text-indigo-400">5. O que preciso de configurar?</p>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{guide.whatToConfigure}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#0F182B]/90 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <p className="font-bold text-indigo-700 dark:text-indigo-400">6. Depende de alguma integração?</p>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{guide.integrationDependency}</p>
              </div>
            </div>

            {/* Question 7 + Practical Example + Step-by-Step */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-5 p-3.5 rounded-xl bg-white/90 dark:bg-[#0F182B]/90 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <p className="font-bold text-emerald-700 dark:text-emerald-400">
                  7. Estado Operacional Real ({guide.operationalStatus})
                </p>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                  {guide.operationalDetail}
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong>Exemplo prático:</strong> {guide.practicalExample}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7 p-3.5 rounded-xl bg-white/90 dark:bg-[#0F182B]/90 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <p className="font-bold text-slate-900 dark:text-white">
                  Passo a passo rápido (3 passos)
                </p>
                <ol className="space-y-1.5">
                  {guide.quickSteps.map((st, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono-tabular font-bold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{st}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export const ProgressiveOnboardingBar: React.FC<{
  steps: OnboardingStepDefinition[];
  onboardingState: ProgressiveOnboardingState;
  onSelectStep: (idx: number) => void;
  onMarkStepCompleted: (stepId: string) => void;
  onNavigateToStep: (targetNav: string) => void;
  onDismiss: () => void;
}> = ({
  steps,
  onboardingState,
  onSelectStep,
  onMarkStepCompleted,
  onNavigateToStep,
  onDismiss,
}) => {
  const prefersReducedMotion = useReducedMotion();
  if (onboardingState.dismissed) return null;

  const activeStep = steps[onboardingState.currentStepIndex] ?? steps[0];
  const isStepDone = onboardingState.completedStepIds.includes(activeStep.id);
  const completedCount = onboardingState.completedStepIds.length;
  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      data-testid="progressive-onboarding-card"
    >
      <Card
        variant="tinted-ai"
        className="p-4 sm:p-5 space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-4 h-4" />
              <span>Guia Progressivo do Motorista</span>
            </span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="font-mono-tabular font-semibold text-slate-600 dark:text-slate-300">
              {completedCount}/{steps.length} concluídos ({pct}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Ignorar por agora
            </button>
          </div>
        </div>

        {/* Progress Bar + Interactive Step Selector */}
        <div className="space-y-2">
          <div className="h-1.5 rounded-full bg-indigo-100 dark:bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
              initial={false}
              animate={{ width: `${Math.max(8, pct)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {steps.map((st, idx) => {
              const done = onboardingState.completedStepIds.includes(st.id);
              const current = idx === onboardingState.currentStepIndex;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onSelectStep(idx)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    current
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                      : done
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-white/90 dark:bg-[#0F182B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                  }`}
                >
                  {done ? (
                    <Check className="w-3 h-3 shrink-0" />
                  ) : (
                    <span className="font-mono-tabular">{st.stepNumber}.</span>
                  )}
                  <span>{st.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Single Active Step Content */}
        <div className="p-3.5 rounded-xl bg-white/95 dark:bg-[#0F182B]/95 border border-indigo-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-bold text-blue-700 dark:text-blue-400">
                Passo {activeStep.stepNumber} de {steps.length}
              </span>
              <span aria-hidden="true">·</span>
              <span>Tempo estimado: {activeStep.estimatedTime}</span>
              {isStepDone && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Concluído</span>
                </>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {activeStep.title} — <span className="font-medium text-slate-600 dark:text-slate-300">{activeStep.shortGoal}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeStep.explanation}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateToStep(activeStep.targetNav)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {activeStep.actionLabel}
            </Button>
            {!isStepDone && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onMarkStepCompleted(activeStep.id)}
                icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              >
                Marcar como concluído
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export const SegmentedFilter: React.FC<{
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}> = ({ options, value, onChange }) => {
  const layoutGroupId = useId();
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#131F36] border border-slate-200/80 dark:border-slate-800">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`relative min-h-[34px] px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              active
                ? 'text-blue-700 dark:text-white font-bold'
                : 'font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {active && (
              <motion.span
                layoutId={prefersReducedMotion ? undefined : `seg-pill-${layoutGroupId}`}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 rounded-lg bg-white dark:bg-blue-600 ring-1 ring-blue-200 dark:ring-blue-500 shadow-xs"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <Card className="p-8 text-center space-y-3">
    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center mx-auto">
      <Compass className="w-5 h-5" />
    </div>
    <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
      {description}
    </p>
    {actionLabel && onAction && (
      <div className="pt-1">
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    )}
  </Card>
);

export const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
  onCancel,
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F182B] p-6 space-y-4 shadow-2xl"
        >
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">{title}</h3>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Fechar janela de confirmação"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const CalculationExplanationModal: React.FC<{
  explanation: {
    kpiTitle: string;
    formula: string;
    inputsUsed: Array<{ label: string; value: string }>;
    countryCode: string;
    referenceDate: string;
    assumptions: string[];
    confidenceLabel: string;
  } | null;
  onClose: () => void;
}> = ({ explanation, onClose }) => (
  <AnimatePresence>
    {explanation && (
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Como foi calculado: ${explanation.kpiTitle}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F182B] p-6 space-y-4 shadow-2xl"
        >
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                Transparência Financeira AIVAD
              </p>
              <h3 className="text-base font-display font-bold text-slate-900 dark:text-white mt-0.5">
                Como foi calculado? — {explanation.kpiTitle}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar transparência de cálculo"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-slate-800/70 border border-blue-200/70 dark:border-slate-700 text-xs space-y-1">
            <span className="font-semibold text-slate-500 dark:text-slate-400 block">Fórmula aplicada</span>
            <p className="font-mono-tabular font-bold text-slate-900 dark:text-white">
              {explanation.formula}
            </p>
          </div>

          <div className="space-y-1.5 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-300 block">Dados reais incluídos</span>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
              {explanation.inputsUsed.map((inp) => (
                <div key={inp.label} className="px-3.5 py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-300">{inp.label}</span>
                  <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">{inp.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <p>
              <strong>Pressupostos:</strong> {explanation.assumptions.join(' ')}
            </p>
            <p>
              Mercado: <strong>{explanation.countryCode}</strong> · Data ref.:{' '}
              <strong className="font-mono-tabular">{explanation.referenceDate}</strong> · Natureza:{' '}
              <strong>{explanation.confidenceLabel}</strong>
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="primary" size="sm" onClick={onClose}>
              Entendido
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const ThemeToggleButton: React.FC<{
  theme: ThemeMode;
  onToggle: () => void;
}> = ({ theme, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
    className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500 dark:hover:border-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
  >
    {theme === 'light' ? (
      <Moon className="w-3.5 h-3.5 text-indigo-600" />
    ) : (
      <Sun className="w-3.5 h-3.5 text-amber-400" />
    )}
    <span>{theme === 'light' ? 'Escuro' : 'Claro'}</span>
  </button>
);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (isInstalled) return null;

  if (deferredPrompt) {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={async () => {
          await deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') setIsInstalled(true);
          setDeferredPrompt(null);
        }}
        icon={<Download className="w-3.5 h-3.5" />}
      >
        Instalar App PWA
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowIOSGuide(true)}
          icon={<Download className="w-3.5 h-3.5" />}
        >
          Instalar no iPhone
        </Button>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <Card className="w-full max-w-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Instalar AIVAD Web no iPhone / iPad
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                1. Toque no botão <strong>Partilhar</strong> na barra inferior do Safari.<br />
                2. Deslize e escolha <strong>Adicionar ao Ecrã Principal</strong>.
              </p>
              <Button variant="primary" size="sm" className="w-full" onClick={() => setShowIOSGuide(false)}>
                Fechar
              </Button>
            </Card>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 text-slate-950 border border-amber-400 px-3.5 py-2 text-xs font-bold shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo Offline — Dados em cache local ativos</span>
    </div>
  );
};
