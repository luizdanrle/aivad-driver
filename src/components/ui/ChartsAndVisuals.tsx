import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
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
import type {
  AndroidOverlayConfig,
  ConfidenceStatus,
  FloatingCardProfileId,
  FloatingMetricKey,
  PlatformId,
  ProposalAnalysis,
  ProposalInput,
  TachographActivityRecord,
  TachographState,
} from '../../models/types';
import type { ZoneOperationalAlert } from '../../core/zones';

export const PlatformLogo: React.FC<{
  platformId: PlatformId;
  name: string;
  size?: number;
}> = ({ platformId, name, size = 32 }) => {
  const pid = platformId.toLowerCase();
  if (pid === 'uber') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label={name} className="shrink-0">
        <rect width="40" height="40" rx="10" className="fill-slate-900 dark:fill-slate-100" />
        <path
          d="M13 13V21.5C13 24.8 15.6 27.5 19.5 27.5C23.4 27.5 26 24.8 26 21.5V13H22.6V21.3C22.6 23.1 21.3 24.4 19.5 24.4C17.7 24.4 16.4 23.1 16.4 21.3V13H13Z"
          className="fill-white dark:fill-slate-900"
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
        <rect width="40" height="40" rx="10" fill="#DC2626" />
        <path d="M12.5 13.5L20 27.5L27.5 13.5H23.6L20 20.8L16.4 13.5H12.5Z" fill="#FFFFFF" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label={name} className="shrink-0">
      <rect width="40" height="40" rx="10" fill="#475569" />
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

export const FLOATING_METRIC_LABELS: Record<FloatingMetricKey, string> = {
  eurPerKm: '€/km',
  eurPerHour: '€/hora',
  eurPerMin: '€/min',
  estimatedNet: 'Líquido est.',
  emptyReturnRisk: 'Retorno vazio',
  totalTime: 'Tempo total',
  score: 'Score IA',
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
    label: 'Urbano Rápido',
    description: 'Leitura imediata em tráfego citadino com foco em €/km, €/h e recolha curta.',
    bgColor: '#0F172A',
    textColor: '#F8FAFC',
    opacityPercent: 95,
    layoutMode: 'compacto',
    highContrastAccessibility: false,
  },
  Aeroporto: {
    label: 'Aeroporto / Longa Distância',
    description: 'Vista expandida destacando probabilidade de retorno com passageiro, portagens e líquido.',
    bgColor: '#0B192C',
    textColor: '#F8FAFC',
    opacityPercent: 96,
    layoutMode: 'expandido',
    highContrastAccessibility: false,
  },
  Noturno: {
    label: 'Condução Noturna',
    description: 'Brilho reduzido anti-encandeamento e contraste suave para turnos noturnos.',
    bgColor: '#090D16',
    textColor: '#E2E8F0',
    opacityPercent: 90,
    layoutMode: 'compacto',
    highContrastAccessibility: false,
  },
  'Alto Contraste': {
    label: 'Alto Contraste Solar',
    description: 'Máxima legibilidade sob luz solar direta e alvos de toque alargados.',
    bgColor: '#000000',
    textColor: '#FFFFFF',
    opacityPercent: 100,
    layoutMode: 'expandido',
    highContrastAccessibility: true,
  },
};

export const DynamicFloatingProposalCard: React.FC<{
  overlayConfig: AndroidOverlayConfig;
  proposalInput?: ProposalInput | null;
  analysis?: ProposalAnalysis | null;
  recommendedAction?: string;
  confidencePct?: number | null;
  confidenceStatus?: ConfidenceStatus;
  zoneAlerts?: ZoneOperationalAlert[];
  isPreviewSurface?: boolean;
  cardStatus?: 'ready' | 'loading' | 'error' | 'empty';
  errorMessage?: string;
  quickHidden?: boolean;
  onToggleQuickHidden?: (hidden: boolean) => void;
  onAccept?: () => void;
  onReject?: () => void;
  onClose?: () => void;
}> = ({
  overlayConfig,
  proposalInput,
  analysis,
  recommendedAction,
  confidencePct = null,
  confidenceStatus,
  zoneAlerts = [],
  isPreviewSurface = false,
  cardStatus = 'ready',
  errorMessage,
  quickHidden = false,
  onToggleQuickHidden,
  onAccept,
  onReject,
  onClose,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [minimized, setMinimized] = useState(overlayConfig.layoutMode === 'compacto');

  useEffect(() => {
    setMinimized(overlayConfig.layoutMode === 'compacto');
  }, [overlayConfig.layoutMode]);

  if (quickHidden) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onToggleQuickHidden?.(false)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 text-white border border-blue-500 shadow-lg text-xs font-bold hover:bg-slate-800"
        >
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span>Reabrir Cartão Flutuante AIVAD</span>
        </button>
      </div>
    );
  }

  if (cardStatus === 'loading') {
    return (
      <div
        data-testid="floating-proposal-card-loading"
        className="rounded-2xl border-2 border-blue-500/60 bg-slate-900 text-white p-4 shadow-xl flex items-center gap-3 text-xs"
      >
        <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
        <span>A interpretar proposta e a calcular rentabilidade líquida em tempo real...</span>
      </div>
    );
  }

  if (cardStatus === 'error') {
    return (
      <div
        data-testid="floating-proposal-card-error"
        className="rounded-2xl border-2 border-red-500 bg-slate-950 text-red-100 p-4 shadow-xl flex items-start gap-3 text-xs"
      >
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Falha de leitura na captura da proposta</p>
          <p className="opacity-85 mt-0.5">
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
        className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/90 text-slate-200 p-4 text-xs flex items-center justify-between gap-2"
      >
        <span>Sem proposta ativa em análise neste momento. A aguardar leitura autorizada ou entrada manual.</span>
        {onToggleQuickHidden && (
          <button
            type="button"
            onClick={() => onToggleQuickHidden(true)}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold shrink-0"
          >
            Ocultar
          </button>
        )}
      </div>
    );
  }

  const verdict =
    analysis.classification === 'verde'
      ? {
          label: 'VERDE · FAVORÁVEL',
          accentHex: '#10B981',
          badgeBg: 'rgba(16, 185, 129, 0.22)',
          badgeText: '#34D399',
        }
      : analysis.classification === 'amarelo'
      ? {
          label: 'AMARELO · ATENÇÃO',
          accentHex: '#F59E0B',
          badgeBg: 'rgba(245, 158, 11, 0.22)',
          badgeText: '#FBBF24',
        }
      : {
          label: 'VERMELHO · REJEITAR',
          accentHex: '#EF4444',
          badgeBg: 'rgba(239, 68, 68, 0.26)',
          badgeText: '#FCA5A5',
        };

  const fontClass =
    overlayConfig.fontFamily === 'Display'
      ? 'font-display'
      : overlayConfig.fontFamily === 'Mono'
      ? 'font-mono-tabular'
      : 'font-sans';

  const getMetricValue = (key: FloatingMetricKey): { label: string; value: string } => {
    switch (key) {
      case 'eurPerKm':
        return { label: '€/km', value: `€${analysis.eurPerKm.toFixed(2)}` };
      case 'eurPerHour':
        return { label: '€/hora', value: `€${analysis.eurPerHour.toFixed(2)}` };
      case 'eurPerMin':
        return { label: '€/min', value: `€${analysis.eurPerMin.toFixed(2)}` };
      case 'estimatedNet':
        return { label: 'Líquido est.', value: `€${analysis.estimatedNetEur.toFixed(2)}` };
      case 'emptyReturnRisk':
        return { label: 'Retorno vazio', value: analysis.emptyReturnRisk };
      case 'totalTime':
        return { label: 'Tempo total', value: `${analysis.totalTimeMin} min` };
      case 'score':
        return { label: 'Score IA', value: `${analysis.score}/100` };
    }
  };

  const confidenceLabel =
    confidencePct !== null && confidencePct !== undefined
      ? `${confidencePct}% conf.`
      : confidenceStatus ?? 'Confiança calibrada';

  const effectiveFontSize = overlayConfig.highContrastAccessibility
    ? Math.max(15, overlayConfig.fontSizePx + 1)
    : overlayConfig.fontSizePx;
  const touchTargetBtnClass = overlayConfig.largeTouchTargets ? 'min-h-[46px] py-2.5 px-4 text-sm' : 'py-2 px-3 text-xs';

  return (
    <motion.div
      layout={!prefersReducedMotion}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: overlayConfig.opacityPercent / 100, scale: 1 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      data-testid="floating-proposal-card"
      data-classification={analysis.classification}
      data-layout-mode={minimized ? 'compacto' : 'expandido'}
      style={{
        width: isPreviewSurface ? `${overlayConfig.widthPercent}%` : '100%',
        backgroundColor: overlayConfig.highContrastAccessibility ? '#000000' : overlayConfig.bgColor,
        color: overlayConfig.highContrastAccessibility ? '#FFFFFF' : overlayConfig.textColor,
        borderColor: verdict.accentHex,
        fontSize: `${effectiveFontSize}px`,
      }}
      className={`rounded-2xl ${overlayConfig.highContrastAccessibility ? 'border-[3px]' : 'border-2'} p-4 shadow-xl space-y-3 mx-auto ${fontClass}`}
    >
      {/* Top Status & Gross Strip */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <PlatformLogo platformId={proposalInput.platformId} name={proposalInput.platformId} size={32} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold uppercase tracking-tight">
                {proposalInput.platformId.toUpperCase()} · {proposalInput.category}
              </span>
              <span
                style={{ backgroundColor: verdict.badgeBg, color: verdict.badgeText }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md font-mono-tabular whitespace-nowrap"
              >
                {verdict.label}
              </span>
              {overlayConfig.captureProfile && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-semibold">
                  Perfil: {overlayConfig.captureProfile}
                </span>
              )}
            </div>
            <p className="text-[11px] opacity-85 truncate">
              {proposalInput.region} · €{analysis.eurPerKm.toFixed(2)}/km · €{analysis.eurPerHour.toFixed(0)}/h · Recolha {proposalInput.pickupDistanceKm} km ({proposalInput.pickupTimeMin}m)
            </p>
          </div>
        </div>

        <div className="flex items-start gap-1 shrink-0">
          <div className="text-right mr-1">
            <span className="text-[10px] uppercase tracking-wider opacity-70 block leading-none">
              Valor bruto
            </span>
            <span className="text-xl font-extrabold font-mono-tabular leading-tight block">
              €{proposalInput.grossValueEur.toFixed(2)}
            </span>
            <span className="text-[11px] font-mono-tabular opacity-85 block">
              Líq.: €{analysis.estimatedNetEur.toFixed(2)}
            </span>
          </div>
          {(overlayConfig.allowMinimize ?? true) && (
            <button
              type="button"
              onClick={() => setMinimized((m) => !m)}
              aria-label={minimized ? 'Expandir cartão flutuante' : 'Compactar cartão flutuante'}
              title={minimized ? 'Modo Expandido' : 'Modo Compacto'}
              className="p-1.5 rounded-md hover:bg-white/15"
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
              className="p-1.5 rounded-md hover:bg-white/15"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          )}
          {(overlayConfig.allowManualClose ?? true) && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar cartão flutuante"
              className="p-1.5 rounded-md hover:bg-white/15"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!minimized && (
          <motion.div
            key="expanded-body"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="space-y-3"
          >
            {/* Pickup & Destination Addresses */}
            <div className="rounded-xl bg-white/10 border border-white/10 p-2.5 space-y-1.5 text-[11px]">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <span className="opacity-70 uppercase text-[10px] font-bold">Recolha: </span>
                  <span className="font-semibold break-words">
                    {proposalInput.pickupAddress || proposalInput.region}
                  </span>
                </div>
                <span className="font-mono-tabular opacity-85 shrink-0">
                  {proposalInput.pickupDistanceKm} km · {proposalInput.pickupTimeMin}m
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
                <div className="min-w-0 flex-1">
                  <span className="opacity-70 uppercase text-[10px] font-bold">Destino: </span>
                  <span className="font-semibold break-words">
                    {proposalInput.destinationAddress || 'Destino não indicado pela plataforma'}
                  </span>
                </div>
                <span className="font-mono-tabular opacity-85 shrink-0">
                  {proposalInput.tripDistanceKm} km · {proposalInput.tripTimeMin}m
                </span>
              </div>
              {analysis.returnPassengerProbabilityPct !== undefined && (
                <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[10px] opacity-85">
                  <span>Probabilidade de retorno com passageiro:</span>
                  <span className="font-mono-tabular font-bold">
                    {analysis.returnPassengerProbabilityPct !== null
                      ? `${analysis.returnPassengerProbabilityPct}% (${analysis.returnProbabilityEpistemicTag ?? 'Histórico'})`
                      : 'Informação indisponível (<3 viagens)'}
                  </span>
                </div>
              )}
            </div>

            {/* Active Zone Intelligence Alerts inside Floating Card */}
            {zoneAlerts.length > 0 && (
              <div
                data-testid="floating-card-zone-alerts"
                className="rounded-xl bg-amber-500/20 border border-amber-400/50 p-2.5 space-y-1 text-[11px]"
              >
                {zoneAlerts.slice(0, 2).map((al) => {
                  const alt = al.alternatives[0];
                  return (
                    <div key={`${al.zoneId ?? al.zoneName}`} className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-300" />
                      <div className="min-w-0">
                        <p className="font-bold text-amber-200">
                          {al.zoneName} · {al.tier}
                          {al.isScheduleCurrentlyActive ? ' · ATIVO AGORA' : ''}
                        </p>
                        <p className="opacity-90 leading-snug">
                          {al.title}{al.scheduleSummary ? ` (${al.scheduleSummary})` : ''} — {al.description}
                        </p>
                        {al.isEventNotConfirmedBan && (
                          <p className="text-[10px] text-amber-100/90 italic mt-0.5">
                            Nota: Evento regular identificado; não confirma proibição total oficial sem sinalização no local.
                          </p>
                        )}
                        {alt && (
                          <p className="text-emerald-200 font-semibold mt-0.5">
                            Alternativa segura: {alt.label} ({alt.walkingDistanceMeters}m / ~{alt.walkingTimeMin} min a pé)
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dynamic Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {overlayConfig.visibleMetrics.map((key) => {
                const item = getMetricValue(key);
                return (
                  <div
                    key={key}
                    className="p-2 rounded-xl bg-white/10 border border-white/10"
                  >
                    <span className="text-[10px] uppercase tracking-wider opacity-70 block">
                      {item.label}
                    </span>
                    <span className="font-mono-tabular font-bold text-sm">{item.value}</span>
                  </div>
                );
              })}
            </div>

            {/* AI Recommended Action + Calibrated Confidence */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1 border-t border-white/10">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: verdict.accentHex }} />
                <span className="truncate font-semibold">
                  {recommendedAction ?? analysis.reasons[0]} ({confidenceLabel})
                </span>
              </div>
              <span className="text-[10px] opacity-70 font-mono-tabular">
                Pos: {overlayConfig.position} · {overlayConfig.autoDismiss ? `${overlayConfig.durationSeconds}s auto` : 'Manual'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(onAccept || onReject) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {onAccept && (
            <button
              type="button"
              onClick={onAccept}
              style={{ backgroundColor: verdict.accentHex }}
              className={`flex-1 rounded-xl text-white font-bold hover:opacity-90 transition-opacity ${touchTargetBtnClass}`}
            >
              Aceitar e Acompanhar Viagem
            </button>
          )}
          {onReject && (
            <button
              type="button"
              onClick={onReject}
              className={`rounded-xl bg-white/15 hover:bg-white/25 font-semibold transition-colors ${touchTargetBtnClass}`}
            >
              Recusar
            </button>
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
            className="text-slate-100 dark:text-slate-800"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={pct >= 100 ? '#059669' : accentColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-extrabold font-mono-tabular">{pct}%</span>
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
  if (items.length === 0) {
    return <p className="text-xs text-slate-500 py-4">{emptyText}</p>;
  }
  const maxVal = Math.max(...items.map((i) => Math.max(0, i.value)), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.max(4, Math.round((Math.max(0, item.value) / maxVal) * 100));
        const active = selectedId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={`w-full text-left space-y-1.5 rounded-lg p-2 -mx-2 transition-colors ${
              onSelect
                ? active
                  ? 'bg-blue-50/90 dark:bg-blue-950/40'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-semibold text-slate-900 dark:text-white">{item.label}</span>
                {item.sublabel && (
                  <span className="text-slate-500 dark:text-slate-400 ml-2">{item.sublabel}</span>
                )}
              </div>
              <span className="font-mono-tabular font-bold text-slate-900 dark:text-white shrink-0">
                {item.formattedValue}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              {(() => {
                const isCharcoal = !active && item.color?.toLowerCase() === '#111827';
                return (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCharcoal ? 'bg-slate-900 dark:bg-slate-300' : ''
                    }`}
                    style={
                      isCharcoal
                        ? { width: `${pct}%` }
                        : {
                            width: `${pct}%`,
                            backgroundColor: active ? '#DC2626' : item.color ?? '#1D4ED8',
                          }
                    }
                  />
                );
              })()}
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
  Pausa: '#7C3AED',
  Refeição: '#DB2777',
  Descanso: '#0F766E',
  'Fim de turno': '#DC2626',
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
        className="w-full h-9 rounded-xl overflow-hidden flex border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950"
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
              className="h-full border-r border-white/25 last:border-r-0 flex items-center justify-center text-[10px] font-mono-tabular font-bold text-white overflow-hidden px-1"
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
  payloadObject: Record<string, string | number>;
}> = ({ qrText, verificationCode, payloadObject }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [verifiedState, setVerifiedState] = useState<'idle' | 'verified'>('idle');

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

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm shrink-0 flex flex-col items-center gap-2">
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
            <span>QR Verificável de Auditoria / Relatório</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVerifiedState('verified')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Validar Estrutura QR</span>
            </button>
            {dataUrl && (
              <a
                href={dataUrl}
                download={`aivad-registo-tvde-qr-${verificationCode}.png`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium hover:bg-white dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG QR</span>
              </a>
            )}
          </div>
        </div>

        {verifiedState === 'verified' && (
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
            Assinatura e esquema <strong>{String(payloadObject.v)}</strong> verificados · Condutor{' '}
            <strong>{String(payloadObject.drv)}</strong> · Condução{' '}
            <strong>{String(payloadObject.condMin)} min</strong> · Km{' '}
            <strong>{String(payloadObject.km)} km</strong>.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 font-mono-tabular text-[11px]">
          <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Sessão</span>
            <span className="font-bold truncate block">{String(payloadObject.sid)}</span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Odómetro</span>
            <span className="font-bold">{String(payloadObject.odoIni)}→{String(payloadObject.odoFim)}</span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Condução / Pausas</span>
            <span className="font-bold">{String(payloadObject.condMin)}m / {String(payloadObject.pausaMin)}m</span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Online Consol.</span>
            <span className="font-bold">{String(payloadObject.onlMin)} min</span>
          </div>
        </div>

        <details className="text-[11px]">
          <summary className="cursor-pointer text-blue-700 dark:text-blue-400 font-medium">
            Inspecionar payload JSON codificado no QR
          </summary>
          <pre className="mt-2 p-2.5 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto font-mono-tabular">
            {qrText}
          </pre>
        </details>
      </div>
    </div>
  );
};
