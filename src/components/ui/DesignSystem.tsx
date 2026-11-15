import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  HelpCircle,
  Info,
  Moon,
  Sun,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import type { EpistemicTag, ThemeMode } from '../../models/types';

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
    <rect width="128" height="128" rx="26" fill="#0B1120" />
    <path
      d="M64 18L73 34L86 24L80 46L106 36L88 64L102 74L78 82L84 104L64 90L44 104L50 82L26 74L40 64L22 36L48 46L42 24L55 34L64 18Z"
      fill="#1D4ED8"
    />
    <path
      d="M64 26L71 42L88 46L74 62L84 78L64 72L44 78L54 62L40 46L57 42L64 26Z"
      fill="#DC2626"
    />
    <path d="M64 38L69 52L64 66L59 52L64 38Z" fill="#FFFFFF" />
  </svg>
);

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${className}`}
  >
    {children}
  </div>
);

export const Badge: React.FC<{
  tone?: 'emerald' | 'amber' | 'blue' | 'red' | 'slate';
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'slate', children, className = '' }) => {
  const toneClasses: Record<NonNullable<typeof tone>, string> = {
    emerald:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    amber:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    blue:
      'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    red:
      'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
    slate:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

export const SectionHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
    <div className="space-y-1">
      {eyebrow && (
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
          {eyebrow}
        </p>
      )}
      <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl">{description}</p>
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
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${styles}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{text}</span>
    </span>
  );
};

export const EpistemicTagBadge: React.FC<{ tag: EpistemicTag }> = ({ tag }) => {
  const badgeStyle: Record<EpistemicTag, string> = {
    'Informação confirmada':
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    'Informação histórica':
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    Estimativa:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    Previsão:
      'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
    'Informação indisponível':
      'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    'Dados de demonstração':
      'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold whitespace-nowrap ${badgeStyle[tag]}`}>
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
  accent?: 'blue' | 'red' | 'neutral';
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
  const [showInfo, setShowInfo] = useState(false);

  const valueTone =
    accent === 'blue'
      ? 'text-blue-700 dark:text-blue-400'
      : accent === 'red'
      ? 'text-red-600 dark:text-red-400'
      : 'text-slate-900 dark:text-white';

  return (
    <Card className="p-4 flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug">
          {label}
        </span>
        <button
          type="button"
          onClick={() => setShowInfo((s) => !s)}
          aria-label={`Explicação do indicador ${label}`}
          title="O que representa e como é calculado"
          className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      <div>
        <div className={`text-2xl font-bold font-mono-tabular tracking-tight ${valueTone}`}>
          {value}
        </div>
        {subtext && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
        )}
      </div>

      {showInfo && (
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
          <p className="text-slate-700 dark:text-slate-200">
            <strong>O que representa:</strong> {explanation}
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            <strong>Cálculo:</strong> {formula}
          </p>
        </div>
      )}

      {onDrillDown && (
        <button
          type="button"
          onClick={onDrillDown}
          className="inline-flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          <span>{drillDownLabel}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </Card>
  );
};

export const ContextualHelpBanner: React.FC<{
  title: string;
  description: string;
  demoNotice?: string;
}> = ({ title, description, demoNotice }) => (
  <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
    <div className="flex items-start gap-2.5">
      <Info className="w-4 h-4 text-blue-700 dark:text-blue-400 mt-0.5 shrink-0" />
      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
        <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
        <p>{description}</p>
      </div>
    </div>
    {demoNotice && (
      <span className="text-[11px] font-medium text-blue-800 dark:text-blue-300 whitespace-nowrap shrink-0">
        {demoNotice}
      </span>
    )}
  </div>
);

export const SegmentedFilter: React.FC<{
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
    {options.map((opt) => (
      <button
        key={opt.id}
        type="button"
        onClick={() => onChange(opt.id)}
        className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 ${
          value === opt.id
            ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-bold ring-1 ring-blue-200 dark:ring-blue-800 shadow-sm'
            : 'font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <Card className="p-8 text-center space-y-3">
    <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors"
      >
        {actionLabel}
      </button>
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
}) => {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar janela de confirmação"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-medium text-white ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </Card>
    </div>
  );
};

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
}> = ({ explanation, onClose }) => {
  if (!explanation) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Como foi calculado: ${explanation.kpiTitle}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <Card className="w-full max-w-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Transparência Financeira AIVAD
            </p>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              Como foi calculado? — {explanation.kpiTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar transparência de cálculo"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
          <span className="font-semibold text-slate-500 block">Fórmula aplicada</span>
          <p className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
            {explanation.formula}
          </p>
        </div>

        <div className="space-y-1.5 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300 block">Dados reais incluídos</span>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
            {explanation.inputsUsed.map((inp) => (
              <div key={inp.label} className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300">{inp.label}</span>
                <span className="font-mono-tabular font-bold">{inp.value}</span>
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
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
          >
            Entendido
          </button>
        </div>
      </Card>
    </div>
  );
};

export const ThemeToggleButton: React.FC<{
  theme: ThemeMode;
  onToggle: () => void;
}> = ({ theme, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
  >
    {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
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
      <button
        type="button"
        onClick={async () => {
          await deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') setIsInstalled(true);
          setDeferredPrompt(null);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App PWA</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar no iPhone</span>
        </button>
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
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-lg bg-blue-700 text-white text-xs font-medium"
              >
                Fechar
              </button>
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
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo Offline — Dados em cache local ativos</span>
    </div>
  );
};
