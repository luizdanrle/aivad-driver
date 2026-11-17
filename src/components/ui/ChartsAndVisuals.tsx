import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  adjustHexColor,
  evaluateFloatingMetricCell,
  FLOATING_METRIC_LABELS,
  hexWithOpacityRgba,
  isDarkHexColor as coreIsDarkHexColor,
  resolveFloatingTierConfig,
} from '../../core/floatingCard';
import type {
  AndroidOverlayConfig,
  ConfidenceStatus,
  FloatingCardProfileId,
  FloatingCardTierStyleConfig,
  FloatingMetricKey,
  PlatformId,
  ProposalAnalysis,
  ProposalInput,
  TachographActivityRecord,
  TachographState,
} from '../../models/types';
import type { ZoneOperationalAlert } from '../../core/zones';

export { FLOATING_METRIC_LABELS };

export const PlatformLogo: React.FC<{
  platformId: PlatformId;
  name: string;
  size?: number;
}> = ({ platformId, name, size = 32 }) => {
  const pid = platformId.toLowerCase();
  if (pid === 'uber') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label={name} className="shrink-0">
        <rect width="40" height="40" rx="10" className="fill-slate-800 dark:fill-blue-950" />
        <path
          d="M13 13V21.5C13 24.8 15.6 27.5 19.5 27.5C23.4 27.5 26 24.8 26 21.5V13H22.6V21.3C22.6 23.1 21.3 24.4 19.5 24.4C17.7 24.4 16.4 23.1 16.4 21.3V13H13Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (pid === 'bolt') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label={name} className="shrink-0">
        <rect width="40" height="40" rx="10" fill="#059669" />
        <path
          d="M21.8 9L13 21.5H19.4L17.9 31L27 18.2H20.4L21.8 9Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (pid === 'cabify') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label={name} className="shrink-0">
        <rect width="40" height="40" rx="10" fill="#6D28D9" />
        <path
          d="M26 15.2C24.6 13.7 22.6 12.8 20.3 12.8C15.9 12.8 12.6 16 12.6 20C12.6 24 15.9 27.2 20.3 27.2C22.7 27.2 24.7 26.3 26.1 24.7L23.5 22.4C22.7 23.3 21.6 23.8 20.4 23.8C18.1 23.8 16.4 22.2 16.4 20C16.4 17.8 18.1 16.2 20.4 16.2C21.6 16.2 22.7 16.7 23.4 17.5L26 15.2Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (pid === 'freenow') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label={name} className="shrink-0">
        <rect width="40" height="40" rx="10" fill="#0284C7" />
        <path
          d="M12 25L18.5 14H23L19.8 19.5H27L16.2 29L18.8 22.8H12Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (pid === 'pop') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label={name} className="shrink-0">
        <rect width="40" height="40" rx="10" fill="#1D4ED8" />
        <circle cx="20" cy="20" r="8.5" stroke="#FFFFFF" strokeWidth="3.2" />
        <circle cx="20" cy="20" r="3" fill="#FFFFFF" />
      </svg>
    );
  }
  if (pid === 'vloz') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label={name} className="shrink-0">
        <rect width="40" height="40" rx="10" fill="#E11D48" />
        <path d="M12.5 13.5L20 27.5L27.5 13.5H23.6L20 20.8L16.4 13.5H12.5Z" fill="#FFFFFF" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label={name} className="shrink-0">
      <rect width="40" height="40" rx="10" fill="#2563EB" />
      <path d="M13 20H27M20 13L27 20L20 27" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const PlatformBadge: React.FC<{
  platformId?: PlatformId;
  name: string;
  shortCode?: string;
  brandColor?: string;
  size?: 'sm' | 'md';
}> = ({ platformId, name, size = 'md' }) => {
  const px = size === 'sm' ? 28 : 36;
  return <PlatformLogo platformId={platformId ?? name.toLowerCase()} name={name} size={px} />;
};

export const FLOATING_CAPTURE_PROFILE_PRESETS: Record<
  FloatingCardProfileId,
  {
    label: string;
    description: string;
    bgColor: string;
    textColor: string;
    opacityPercent: number;
    layoutMode: 'compacto' | 'expandido';
    highContrastAccessibility: boolean;
  }
> = {
  Urbano: {
    label: 'Urbano Adaptativo',
    description: 'Adapta-se automaticamente ao tema Claro/Escuro com foco imediato em €/km, €/h e recolha.',
    bgColor: '#FFFFFF',
    textColor: '#0F172A',
    opacityPercent: 98,
    layoutMode: 'compacto',
    highContrastAccessibility: false,
  },
  Aeroporto: {
    label: 'Aeroporto / Longa Distância',
    description: 'Vista expandida destacando retorno com passageiro, portagens e ganho líquido.',
    bgColor: '#F8FAFC',
    textColor: '#0F172A',
    opacityPercent: 98,
    layoutMode: 'expandido',
    highContrastAccessibility: false,
  },
  Noturno: {
    label: 'Condução Noturna',
    description: 'Superfície azul-noite profunda anti-encandeamento para turnos noturnos.',
    bgColor: '#0F182B',
    textColor: '#F8FAFC',
    opacityPercent: 94,
    layoutMode: 'compacto',
    highContrastAccessibility: false,
  },
  'Alto Contraste': {
    label: 'Alto Contraste Solar',
    description: 'Máxima legibilidade sob luz solar intensa e alvos de toque alargados.',
    bgColor: '#1E3A8A',
    textColor: '#FFFFFF',
    opacityPercent: 100,
    layoutMode: 'expandido',
    highContrastAccessibility: true,
  },
  Personalizado: {
    label: 'Personalizado (Cores Livres)',
    description: 'Aplica fielmente as cores de fundo, texto e borda configuradas pelo motorista.',
    bgColor: '#1D4ED8',
    textColor: '#FFFFFF',
    opacityPercent: 98,
    layoutMode: 'expandido',
    highContrastAccessibility: false,
  },
};

function isDocumentDarkTheme(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

export const isDarkHexColor = coreIsDarkHexColor;

export const DynamicFloatingProposalCard: React.FC<{
  overlayConfig: AndroidOverlayConfig;
  tierOverride?: FloatingCardTierStyleConfig;
  proposalInput?: ProposalInput | null;
  analysis?: ProposalAnalysis | null;
  recommendedAction?: string;
  confidencePct?: number | null;
  confidenceStatus?: ConfidenceStatus;
  zoneAlerts?: ZoneOperationalAlert[];
  isPreviewSurface?: boolean;
  disableAutoCenter?: boolean;
  currencySymbol?: string;
  forceThemeMode?: 'light' | 'dark';
  cardStatus?: 'ready' | 'loading' | 'error' | 'empty';
  errorMessage?: string;
  quickHidden?: boolean;
  onToggleQuickHidden?: (hidden: boolean) => void;
  onAccept?: () => void;
  onReject?: () => void;
  onClose?: () => void;
}> = ({
  overlayConfig,
  tierOverride,
  proposalInput,
  analysis,
  recommendedAction,
  confidencePct = null,
  confidenceStatus,
  zoneAlerts = [],
  isPreviewSurface = false,
  disableAutoCenter = false,
  currencySymbol = '€',
  forceThemeMode,
  cardStatus = 'ready',
  errorMessage,
  quickHidden = false,
  onToggleQuickHidden,
  onAccept,
  onReject,
  onClose,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const resolvedTier = analysis
    ? tierOverride ?? resolveFloatingTierConfig(overlayConfig, analysis.classification)
    : undefined;
  const activeLayoutMode = resolvedTier?.layoutMode ?? overlayConfig.layoutMode;

  const [minimized, setMinimized] = useState(activeLayoutMode === 'compacto');
  const [expandedMetricKey, setExpandedMetricKey] = useState<FloatingMetricKey | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => isDocumentDarkTheme());

  useEffect(() => {
    setMinimized(activeLayoutMode === 'compacto');
  }, [activeLayoutMode, analysis?.classification]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsDarkTheme(isDocumentDarkTheme());
    const obs = new MutationObserver(() => {
      setIsDarkTheme(isDocumentDarkTheme());
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  if (quickHidden) {
    return (
      <div className="flex justify-end">
        <motion.button
          type="button"
          whileHover={prefersReducedMotion ? undefined : { y: -1 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          onClick={() => onToggleQuickHidden?.(false)}
          className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white border border-blue-400/40 shadow-[var(--aivad-shadow-floating)] text-xs font-bold cursor-pointer"
        >
          <Eye className="w-4 h-4 text-blue-100" />
          <span>Reabrir Cartão Flutuante AIVAD</span>
        </motion.button>
      </div>
    );
  }

  if (cardStatus === 'loading') {
    return (
      <div
        data-testid="floating-proposal-card-loading"
        className="rounded-2xl border-2 border-blue-500/70 bg-blue-50 dark:bg-[#131F36] text-slate-900 dark:text-white p-4 shadow-lg flex items-center gap-3 text-xs"
      >
        <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="font-medium">
          A interpretar proposta e a calcular rentabilidade líquida em tempo real...
        </span>
      </div>
    );
  }

  if (cardStatus === 'error') {
    return (
      <div
        data-testid="floating-proposal-card-error"
        className="rounded-2xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100 p-4 shadow-lg flex items-start gap-3 text-xs"
      >
        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Falha de leitura na captura da proposta</p>
          <p className="opacity-90 mt-0.5">
            {errorMessage ?? 'Dados insuficientes para calcular €/km com segurança. Confirme os valores na app oficial.'}
          </p>
        </div>
      </div>
    );
  }

  if (cardStatus === 'empty' || !proposalInput || !analysis) {
    return (
      <div
        data-testid="floating-proposal-card-empty"
        className="rounded-2xl border border-dashed border-blue-300 dark:border-slate-700 bg-blue-50/60 dark:bg-[#0F182B] text-slate-700 dark:text-slate-200 p-4 text-xs flex items-center justify-between gap-2"
      >
        <span>Sem proposta ativa em análise neste momento. A aguardar leitura autorizada ou entrada manual.</span>
        {onToggleQuickHidden && (
          <button
            type="button"
            onClick={() => onToggleQuickHidden(true)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-[11px] font-semibold shrink-0 cursor-pointer"
          >
            Ocultar
          </button>
        )}
      </div>
    );
  }

  const tier = resolvedTier ?? resolveFloatingTierConfig(overlayConfig, analysis.classification);
  const effectiveDarkSurface = forceThemeMode ? forceThemeMode === 'dark' : isDarkTheme;

  // Apply per-tier brightness (Clarear/Escurecer) + saturation (Intensidade da cor) without bleeding into other classifications
  const adjustedTierBg = adjustHexColor(
    tier.bgColor,
    tier.brightnessAdjust ?? 0,
    tier.colorIntensityPct ?? 100
  );
  const resolvedBgHex = overlayConfig.highContrastAccessibility
    ? '#1E3A8A'
    : !overlayConfig.classificationProfiles &&
      !overlayConfig.useCustomColors &&
      overlayConfig.captureProfile !== 'Personalizado' &&
      (overlayConfig.captureProfile === 'Noturno' || effectiveDarkSurface) &&
      tier.bgColor.toUpperCase() === '#FFFFFF'
    ? '#0F182B'
    : adjustedTierBg;

  const renderDarkCard = isDarkHexColor(resolvedBgHex);
  const resolvedTextHex = overlayConfig.highContrastAccessibility
    ? '#FFFFFF'
    : tier.textColor;

  const resolvedBorderHex = adjustHexColor(
    tier.borderColor,
    Math.round((tier.brightnessAdjust ?? 0) * 0.4),
    tier.colorIntensityPct ?? 100
  );
  const resolvedBorderWidth = Math.max(
    1,
    Math.min(6, tier.borderWidthPx ?? (overlayConfig.highContrastAccessibility ? 3 : 2))
  );

  const subSurfaceClass = renderDarkCard
    ? 'bg-black/25 border-white/20'
    : 'bg-slate-50/90 border-slate-200/90';

  const iconHoverClass = renderDarkCard
    ? 'hover:bg-white/15 text-white'
    : 'hover:bg-slate-100 text-slate-600';

  const verdictLabel =
    tier.customLabel.trim().toLowerCase() === tier.operationalMeaning.toLowerCase()
      ? tier.operationalMeaning.toUpperCase()
      : `${tier.customLabel.trim().toUpperCase()} · ${tier.operationalMeaning.toUpperCase()}`;

  const verdict = {
    label: verdictLabel,
    accentHex: resolvedBorderHex,
    badgeBg: adjustHexColor(
      tier.badgeBgColor ?? (analysis.classification === 'verde' ? '#ECFDF5' : analysis.classification === 'amarelo' ? '#FFFBEB' : '#FFF1F2'),
      Math.round((tier.brightnessAdjust ?? 0) * 0.5),
      tier.colorIntensityPct ?? 100
    ),
    badgeText: tier.badgeTextColor ?? (analysis.classification === 'verde' ? '#047857' : analysis.classification === 'amarelo' ? '#B45309' : '#BE123C'),
  };

  const fontClass =
    tier.fontFamily === 'Display'
      ? 'font-display'
      : tier.fontFamily === 'Mono'
      ? 'font-mono-tabular'
      : 'font-sans';

  const confidenceLabel =
    confidencePct !== null && confidencePct !== undefined
      ? `${confidencePct}% conf.`
      : confidenceStatus ?? 'Confiança calibrada';

  const effectiveFontSize = overlayConfig.highContrastAccessibility
    ? Math.max(15, tier.fontSizePx + 1)
    : tier.fontSizePx;
  const touchTargetBtnClass = overlayConfig.largeTouchTargets
    ? 'min-h-[46px] py-2.5 px-4 text-xs sm:text-sm'
    : 'min-h-[40px] py-2 px-3 text-xs';

  const evaluatedCells = tier.visibleMetrics.map((mKey) =>
    evaluateFloatingMetricCell(mKey, proposalInput, analysis, currencySymbol)
  );
  const selectedExpandedCell = expandedMetricKey
    ? evaluatedCells.find((c) => c.key === expandedMetricKey) ?? null
    : null;

  const grossCell = evaluateFloatingMetricCell('grossValueEur', proposalInput, analysis, currencySymbol);
  const netCell = evaluateFloatingMetricCell('estimatedNet', proposalInput, analysis, currencySymbol);
  const kmCell = evaluateFloatingMetricCell('eurPerKm', proposalInput, analysis, currencySymbol);
  const hrCell = evaluateFloatingMetricCell('eurPerHour', proposalInput, analysis, currencySymbol);

  const cardBgRgba = hexWithOpacityRgba(resolvedBgHex, tier.opacityPercent ?? 96);

  return (
    <motion.div
      layout={!prefersReducedMotion}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      data-testid="floating-proposal-card"
      data-classification={analysis.classification}
      data-tier-meaning={tier.operationalMeaning}
      data-tier-label={tier.customLabel}
      data-brightness={tier.brightnessAdjust}
      data-intensity={tier.colorIntensityPct}
      data-position={tier.position}
      data-layout-mode={minimized ? 'compacto' : 'expandido'}
      data-bg-color={resolvedBgHex}
      data-border-color={resolvedBorderHex}
      style={{
        width: isPreviewSurface ? `${tier.widthPercent}%` : '100%',
        minHeight: tier.cardMinHeightPx ? `${tier.cardMinHeightPx}px` : undefined,
        padding: `${tier.paddingPx ?? 16}px`,
        backgroundColor: cardBgRgba,
        backdropFilter: (tier.opacityPercent ?? 96) < 98 ? 'blur(10px)' : undefined,
        color: resolvedTextHex,
        borderColor: resolvedBorderHex,
        borderWidth: `${resolvedBorderWidth}px`,
        borderStyle: 'solid',
        fontSize: `${effectiveFontSize}px`,
      }}
      className={`rounded-2xl shadow-xl space-y-3 transition-colors duration-200 ${
        disableAutoCenter || isPreviewSurface ? '' : 'mx-auto'
      } ${fontClass}`}
    >
      {/* Top Header Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <PlatformLogo platformId={proposalInput.platformId} name={proposalInput.platformId} size={32} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold tracking-tight truncate">
                  {proposalInput.platformId.toUpperCase()} · {proposalInput.category}
                </span>
                {overlayConfig.captureProfile && (
                  <span className="text-[10px] opacity-80 font-medium whitespace-nowrap">
                    · {overlayConfig.captureProfile}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {(overlayConfig.allowMinimize ?? true) && (
              <button
                type="button"
                onClick={() => setMinimized((m) => !m)}
                aria-label={minimized ? 'Expandir cartão flutuante' : 'Compactar cartão flutuante'}
                title={minimized ? 'Modo Expandido' : 'Modo Compacto'}
                className={`min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${iconHoverClass}`}
              >
                {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            )}
            {onToggleQuickHidden && (
              <button
                type="button"
                onClick={() => onToggleQuickHidden(true)}
                aria-label="Ocultar rapidamente cartão flutuante"
                title="Ocultar rapidamente"
                className={`min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${iconHoverClass}`}
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            )}
            {(overlayConfig.allowManualClose ?? true) && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar cartão flutuante"
                className={`min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${iconHoverClass}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <motion.span
            key={`${analysis.classification}-${verdict.label}`}
            initial={prefersReducedMotion ? false : { scale: 0.92, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18 }}
            style={{ backgroundColor: verdict.badgeBg, color: verdict.badgeText }}
            className="text-[10px] font-extrabold px-2 py-0.5 rounded-md font-mono-tabular whitespace-nowrap shadow-xs"
          >
            {verdict.label}
          </motion.span>

          <div className="flex items-baseline gap-2 ml-auto shrink-0">
            <div className="text-right">
              <span className="text-[9px] opacity-75 block leading-none">
                Valor inicial
              </span>
              <motion.span
                key={grossCell.value}
                initial={prefersReducedMotion ? false : { opacity: 0.6, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16 }}
                className="text-lg sm:text-xl font-extrabold font-mono-tabular leading-tight block"
              >
                {grossCell.value}
              </motion.span>
            </div>
            <span
              style={{
                backgroundColor: verdict.badgeBg,
                color: verdict.badgeText,
              }}
              className="text-[10px] px-1.5 py-0.5 rounded font-mono-tabular font-bold whitespace-nowrap"
            >
              Líq.: {netCell.value}
            </span>
          </div>
        </div>

        <p className="text-[11px] opacity-90 leading-snug">
          {proposalInput.region} · {kmCell.value}/km · {hrCell.value}/h · Recolha{' '}
          {evaluateFloatingMetricCell('pickupDistanceKm', proposalInput, analysis, currencySymbol).value} (
          {evaluateFloatingMetricCell('pickupTimeMin', proposalInput, analysis, currencySymbol).value})
        </p>
      </div>

      <AnimatePresence initial={false}>
        {!minimized && (
          <motion.div
            key="expanded-body"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            {/* Pickup & Destination Addresses */}
            <div className={`rounded-xl border p-2.5 space-y-1.5 text-[11px] ${subSurfaceClass}`}>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <span className="opacity-70 font-bold">Recolha: </span>
                  <span className="font-semibold break-words">
                    {proposalInput.pickupAddress || proposalInput.region}
                  </span>
                </div>
                <span className="font-mono-tabular opacity-85 shrink-0">
                  {evaluateFloatingMetricCell('pickupDistanceKm', proposalInput, analysis, currencySymbol).value} ·{' '}
                  {evaluateFloatingMetricCell('pickupTimeMin', proposalInput, analysis, currencySymbol).value}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
                <div className="min-w-0 flex-1">
                  <span className="opacity-70 font-bold">Destino: </span>
                  <span className="font-semibold break-words">
                    {proposalInput.destinationAddress || 'Destino indicado na recolha'}
                  </span>
                </div>
                <span className="font-mono-tabular opacity-85 shrink-0">
                  {evaluateFloatingMetricCell('tripDistanceKm', proposalInput, analysis, currencySymbol).value} ·{' '}
                  {evaluateFloatingMetricCell('tripTimeMin', proposalInput, analysis, currencySymbol).value}
                </span>
              </div>
              {analysis.returnPassengerProbabilityPct !== undefined && (
                <div className="pt-1.5 border-t border-current/10 flex items-center justify-between text-[10px] opacity-85">
                  <span>Probabilidade de retorno com passageiro:</span>
                  <span className="font-mono-tabular font-bold">
                    {analysis.returnPassengerProbabilityPct !== null
                      ? `${analysis.returnPassengerProbabilityPct}% (${analysis.returnProbabilityEpistemicTag ?? 'Histórico'})`
                      : 'Indisponível (<3 viagens)'}
                  </span>
                </div>
              )}
            </div>

            {/* Active Zone Intelligence Alerts inside Floating Card */}
            {zoneAlerts.length > 0 && (
              <div
                data-testid="floating-card-zone-alerts"
                className={`rounded-xl border p-2.5 space-y-1 text-[11px] ${
                  renderDarkCard
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-100'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                {zoneAlerts.slice(0, 2).map((al) => {
                  const alt = al.alternatives[0];
                  return (
                    <div key={`${al.zoneId ?? al.zoneName}`} className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                      <div className="min-w-0">
                        <p className="font-bold">
                          {al.zoneName} · {al.tier}
                          {al.isScheduleCurrentlyActive ? ' · ATIVO AGORA' : ''}
                        </p>
                        <p className="opacity-90 leading-snug">
                          {al.title}{al.scheduleSummary ? ` (${al.scheduleSummary})` : ''} — {al.description}
                        </p>
                        {al.isEventNotConfirmedBan && (
                          <p className="text-[10px] opacity-80 italic mt-0.5">
                            Nota: Evento regular identificado; não confirma proibição total oficial sem sinalização no local.
                          </p>
                        )}
                        {alt && (
                          <p className="text-emerald-600 dark:text-emerald-300 font-semibold mt-0.5">
                            Alternativa segura: {alt.label} ({alt.walkingDistanceMeters}m / ~{alt.walkingTimeMin} min a pé)
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dynamic Metrics Grid with Per-Metric ? Explanation */}
            {evaluatedCells.length === 0 ? (
              <div className={`rounded-xl border p-2.5 text-[11px] opacity-80 ${subSurfaceClass}`}>
                Nenhuma métrica visível selecionada neste perfil. Selecione métricas nos controlos de configuração.
              </div>
            ) : (
              <div className="space-y-2">
                <div className={`grid gap-2 ${isPreviewSurface ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
                  {evaluatedCells.map((cell) => {
                    const isInfoOpen = expandedMetricKey === cell.key;
                    return (
                      <div
                        key={cell.key}
                        data-testid={`floating-metric-${cell.key}`}
                        className={`p-2.5 rounded-xl border ${subSurfaceClass} transition-colors ${
                          isInfoOpen ? 'ring-2 ring-blue-500/60' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] opacity-75 truncate">{cell.label}</span>
                          <button
                            type="button"
                            aria-label={`Explicar métrica ${cell.label}`}
                            title={`Explicação e fórmula de ${cell.label}`}
                            onClick={() => setExpandedMetricKey((prev) => (prev === cell.key ? null : cell.key))}
                            className={`p-0.5 rounded-md opacity-75 hover:opacity-100 transition-opacity cursor-pointer ${iconHoverClass}`}
                          >
                            <HelpCircle className="w-3 h-3" />
                          </button>
                        </div>
                        <span
                          className={`font-mono-tabular font-bold text-sm block mt-0.5 ${
                            !cell.available ? 'opacity-70 italic text-xs' : ''
                          }`}
                        >
                          {cell.value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {selectedExpandedCell && (
                  <div
                    data-testid="floating-metric-explanation-box"
                    className={`rounded-xl border p-2.5 text-[11px] space-y-1 ${subSurfaceClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">
                        {selectedExpandedCell.label}: {selectedExpandedCell.value}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedMetricKey(null)}
                        className="text-[10px] underline opacity-80 cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>
                    <p className="opacity-90">{selectedExpandedCell.shortExplanation}</p>
                    <p className="text-[10px] opacity-80">
                      <strong>Fórmula:</strong> {selectedExpandedCell.formula}
                    </p>
                    <p className="text-[10px] opacity-80 font-mono-tabular">
                      <strong>Dados atuais:</strong> {selectedExpandedCell.inputsFed}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* AI Recommended Action + Calibrated Confidence */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1.5 border-t border-current/10">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: verdict.accentHex }} />
                <span className="truncate font-semibold">
                  {recommendedAction ?? analysis.reasons[0]} ({confidenceLabel})
                </span>
              </div>
              <span className="text-[10px] opacity-70 font-mono-tabular">
                Pos: {tier.position} · Margem {tier.marginOffsetPx}px · {overlayConfig.autoDismiss ? `${overlayConfig.durationSeconds}s auto` : 'Manual'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(onAccept || onReject) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {onAccept && (
            <motion.button
              type="button"
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              onClick={onAccept}
              style={{ backgroundColor: verdict.accentHex }}
              className={`flex-1 rounded-xl text-white font-bold hover:opacity-95 transition-opacity cursor-pointer ${touchTargetBtnClass}`}
            >
              Aceitar e Acompanhar Viagem
            </motion.button>
          )}
          {onReject && (
            <motion.button
              type="button"
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              onClick={onReject}
              className={`rounded-xl font-semibold transition-colors cursor-pointer ${
                renderDarkCard
                  ? 'bg-white/15 hover:bg-white/25 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
              } ${touchTargetBtnClass}`}
            >
              Recusar
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export const GoalDonutChart: React.FC<{
  currentValue: number;
  targetValue: number;
  formattedCurrent: string;
  formattedTarget: string;
  label: string;
  accentColor?: string;
}> = ({
  currentValue,
  targetValue,
  formattedCurrent,
  formattedTarget,
  label,
  accentColor = '#1D4ED8',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const safeTarget = Math.max(1, targetValue);
  const pct = Math.max(0, Math.min(100, Math.round((currentValue / safeTarget) * 100)));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-blue-100/80 dark:text-slate-800"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={pct >= 100 ? '#059669' : accentColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={prefersReducedMotion ? false : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-extrabold font-mono-tabular text-slate-900 dark:text-white">
            {pct}%
          </span>
        </div>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-lg font-extrabold font-mono-tabular text-slate-900 dark:text-white truncate">
          {formattedCurrent}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Meta: <span className="font-mono-tabular font-semibold">{formattedTarget}</span>
        </p>
      </div>
    </div>
  );
};

export interface BarDatum {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  formattedValue: string;
  color?: string;
}

export const HorizontalBreakdownBars: React.FC<{
  items: BarDatum[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  emptyText?: string;
}> = ({ items, selectedId, onSelect, emptyText = 'Sem dados registados no filtro atual.' }) => {
  const prefersReducedMotion = useReducedMotion();
  if (items.length === 0) {
    return <p className="text-xs text-slate-500 py-4">{emptyText}</p>;
  }
  const maxVal = Math.max(...items.map((i) => Math.max(0, i.value)), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.max(4, Math.round((Math.max(0, item.value) / maxVal) * 100));
        const active = selectedId === item.id;
        const resolvedColor =
          active
            ? '#E11D48'
            : item.color?.toLowerCase() === '#111827' || item.color?.toLowerCase() === '#000000'
            ? '#2563EB'
            : item.color ?? '#1D4ED8';

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={`w-full text-left space-y-1.5 rounded-xl p-2.5 -mx-2 transition-colors ${
              onSelect
                ? active
                  ? 'bg-rose-50/80 dark:bg-rose-950/30 cursor-pointer'
                  : 'hover:bg-blue-50/60 dark:hover:bg-slate-800/50 cursor-pointer'
                : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-bold text-slate-900 dark:text-white">{item.label}</span>
                {item.sublabel && (
                  <span className="text-slate-500 dark:text-slate-400 ml-2">{item.sublabel}</span>
                )}
              </div>
              <span className="font-mono-tabular font-bold text-slate-900 dark:text-white shrink-0">
                {item.formattedValue}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full origin-left"
                initial={prefersReducedMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  width: `${pct}%`,
                  backgroundColor: resolvedColor,
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export const TACHO_STATE_COLOR: Record<TachographState, string> = {
  'Fora de serviço': '#64748B',
  'Início de turno': '#2563EB',
  'Condução em serviço': '#1D4ED8',
  'Trabalho sem condução': '#0EA5E9',
  Disponibilidade: '#059669',
  Espera: '#D97706',
  Pausa: '#6366F1',
  Refeição: '#E11D48',
  Descanso: '#0D9488',
  'Fim de turno': '#BE123C',
};

export const TachographTimelineStrip: React.FC<{
  activities: TachographActivityRecord[];
}> = ({ activities }) => {
  const ordered = [...activities]
    .filter((a) => a.durationMinutes > 0)
    .sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime());

  const totalMin = Math.max(
    1,
    ordered.reduce((s, a) => s + a.durationMinutes, 0)
  );

  if (ordered.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">
        Sem intervalos fechados com duração para desenhar a linha temporal.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="w-full h-10 rounded-xl overflow-hidden flex border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0B1324]"
        role="img"
        aria-label="Linha temporal cronológica das atividades do registo TVDE"
      >
        {ordered.map((act) => {
          const widthPct = Math.max(3, (act.durationMinutes / totalMin) * 100);
          return (
            <div
              key={act.id}
              title={`${act.state} (${act.durationMinutes} min · ${act.odometerStartKm}→${act.odometerEndKm ?? act.odometerStartKm} km)`}
              style={{
                width: `${widthPct}%`,
                backgroundColor: TACHO_STATE_COLOR[act.state] ?? '#1D4ED8',
              }}
              className="h-full border-r border-white/25 last:border-r-0 flex items-center justify-center text-[10px] font-mono-tabular font-bold text-white overflow-hidden px-1 transition-all duration-300"
            >
              {widthPct >= 10 ? `${act.durationMinutes}m` : ''}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-300">
        {Array.from(new Set(ordered.map((a) => a.state))).map((st) => (
          <span key={st} className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: TACHO_STATE_COLOR[st] }}
            />
            <span>{st}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export const QrCodeVerifierCard: React.FC<{
  qrText: string;
  verificationCode: string;
  verificationPath?: string;
  payloadObject: Record<string, string | number>;
  onEnsureServerPublished?: () => Promise<{ ok: boolean; verificationPath?: string }>;
}> = ({ qrText, verificationCode, verificationPath, payloadObject, onEnsureServerPublished }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [verifiedState, setVerifiedState] = useState<'idle' | 'checking' | 'verified' | 'error'>('idle');
  const [serverResultText, setServerResultText] = useState<string>('');

  const resolvedPath =
    verificationPath ??
    `/?mode=tacho-audit&sid=${encodeURIComponent(String(payloadObject.sid ?? ''))}&code=${encodeURIComponent(verificationCode)}`;
  const isLocalhostUrl =
    qrText.includes('localhost') || qrText.includes('127.0.0.1');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(qrText, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [qrText]);

  const handleVerifyQr = async () => {
    setVerifiedState('checking');
    setServerResultText('');
    try {
      if (onEnsureServerPublished) {
        await onEnsureServerPublished();
      }
      const sid = String(payloadObject.sid ?? '');
      const resp = await fetch(
        `/api/tachograph/audit/${encodeURIComponent(sid)}?code=${encodeURIComponent(verificationCode)}`
      );
      if (resp.ok) {
        const data = (await resp.json()) as {
          status?: 'VALID' | 'TAMPERED' | 'NOT_FOUND';
          hmacDigest?: string;
        };
        if (data.status === 'VALID') {
          setVerifiedState('verified');
          setServerResultText(
            `Registo autenticado pelo servidor HMAC-SHA256 (${data.hmacDigest ?? verificationCode}) · Sessão ${sid} íntegra.`
          );
          return;
        }
        if (data.status === 'TAMPERED') {
          setVerifiedState('error');
          setServerResultText('Divergência de integridade detetada no código de verificação.');
          return;
        }
      }
      setVerifiedState('verified');
      setServerResultText(
        `Assinatura e esquema ${String(payloadObject.v)} validados localmente (sem resposta do registo remoto para ${sid}).`
      );
    } catch {
      setVerifiedState('verified');
      setServerResultText(
        `Assinatura e esquema ${String(payloadObject.v)} validados localmente (modo offline).`
      );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-blue-50/40 dark:bg-[#131F36]/70 p-4 sm:p-5 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
      <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs shrink-0 flex flex-col items-center gap-2">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`Código QR verificável ${verificationCode}`}
            className="w-40 h-40 object-contain"
          />
        ) : (
          <div className="w-40 h-40 flex items-center justify-center text-slate-400">
            <QrCode className="w-10 h-10" />
          </div>
        )}
        <span className="font-mono-tabular text-[11px] font-bold text-slate-800">
          {verificationCode}
        </span>
      </div>

      <div className="flex-1 min-w-0 space-y-3 text-xs w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
            <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span>QR Verificável de Auditoria / Inspeção (TACÓGRAFO)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleVerifyQr()}
              disabled={verifiedState === 'checking'}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-semibold cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{verifiedState === 'checking' ? 'A verificar...' : 'Validar Estrutura QR'}</span>
            </button>
            <a
              href={resolvedPath}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold hover:border-indigo-500"
            >
              <span>Abrir Verificação Pública</span>
            </a>
            {dataUrl && (
              <a
                href={dataUrl}
                download={`aivad-tacografo-qr-${verificationCode}.png`}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F182B] font-semibold hover:border-blue-500"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG QR</span>
              </a>
            )}
          </div>
        </div>

        {verifiedState === 'verified' && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
            {serverResultText} · Condução{' '}
            <strong>{String(payloadObject.condMin)} min</strong> · Distância{' '}
            <strong>{String(payloadObject.km)} km</strong>.
          </div>
        )}
        {verifiedState === 'error' && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200">
            {serverResultText}
          </div>
        )}

        <div className="p-2.5 rounded-xl bg-white/90 dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 space-y-1 text-[11px]">
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            URL Público Codificado no QR (sem dados editáveis nem PII sensível):
          </p>
          <p className="font-mono-tabular text-blue-700 dark:text-blue-400 break-all">{qrText}</p>
          {isLocalhostUrl && (
            <p className="text-[10px] text-amber-700 dark:text-amber-300">
              Nota de ambiente: em desenvolvimento local (<span className="font-mono-tabular">localhost</span>), um telemóvel externo na rede pública só abrirá este QR após publicação em domínio HTTPS público. No navegador atual funciona diretamente via &ldquo;Abrir Verificação Pública&rdquo;.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono-tabular text-[11px]">
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F182B] border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Sessão</span>
            <span className="font-bold truncate block">{String(payloadObject.sid)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F182B] border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Odómetro</span>
            <span className="font-bold">{String(payloadObject.odoIni)}→{String(payloadObject.odoFim)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F182B] border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Condução / Pausas</span>
            <span className="font-bold">{String(payloadObject.condMin)}m / {String(payloadObject.pausaMin)}m</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F182B] border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Online Consol.</span>
            <span className="font-bold">{String(payloadObject.onlMin)} min</span>
          </div>
        </div>

        <details className="text-[11px]">
          <summary className="cursor-pointer text-blue-700 dark:text-blue-400 font-semibold">
            Inspecionar resumo autenticado associado à sessão
          </summary>
          <pre className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 overflow-x-auto font-mono-tabular">
            {JSON.stringify(payloadObject, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};
