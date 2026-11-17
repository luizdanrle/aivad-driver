import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bot,
  Calculator,
  Car,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Eye,
  Gauge,
  HelpCircle,
  History,
  Layers,
  MapPin,
  Monitor,
  Navigation,
  Play,
  Radio,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { analyzeProposalWithAiCore, type ProposalAiDecisionPackage } from '../../../core/aiCore';
import {
  ALL_FLOATING_METRICS,
  createDefaultClassificationProfiles,
  evaluateFloatingMetricCell,
  FLOATING_METRIC_DEFINITIONS,
  PROPOSAL_GALLERY_EXAMPLES,
  resolveFloatingTierConfig,
  TIER_MEANING_DESCRIPTIONS,
  TIER_OPERATIONAL_MEANINGS,
} from '../../../core/floatingCard';
import { isCompletedTripStatus, round2 } from '../../../core/intelligence';
import { computeTripTimersSnapshot } from '../../../core/lifecycle';
import { formatDistance, formatDistanceRate, formatMoney, getTodayIso, translateUi } from '../../../core/localization';
import { normalizeFloatingCardPosition } from '../../../core/marketCatalog';
import { buildWazeNavigationLaunch } from '../../../core/tripAnalysis';
import { evaluateProposalZoneAlerts } from '../../../core/zones';
import type {
  AnalysisMode,
  AndroidOverlayConfig,
  ArrivalDetectionMethod,
  AutoPilotMode,
  CancellationBy,
  CaptureSource,
  FloatingCardPosition,
  FloatingCardProfileId,
  FloatingCardTierStyleConfig,
  FloatingDockConfig,
  FloatingMetricKey,
  ProposalClassification,
  ProposalGalleryExample,
  ProposalInput,
  ProposalLifecycleState,
  SmartCaptureRecord,
} from '../../../models/types';
import { SEED_FLOATING_DOCK_CONFIG, SEED_OVERLAY_CONFIG } from '../../../data/seedData';
import { useEcosystem } from '../../../services/EcosystemContext';
import {
  DynamicFloatingProposalCard,
  FLOATING_CAPTURE_PROFILE_PRESETS,
  FLOATING_METRIC_LABELS,
  GoalDonutChart,
  HorizontalBreakdownBars,
  isDarkHexColor,
  PlatformBadge,
  PlatformLogo,
  TACHO_STATE_COLOR,
} from '../../ui/ChartsAndVisuals';
import {
  Card,
  ContextualHelpBanner,
  EpistemicTagBadge,
  MetricCard,
  SegmentedFilter,
  StatusLabel,
} from '../../ui/DesignSystem';

function formatMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const DriverDashboardAndOps: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    activeVehicle,
    activeMarket,
    visibleDriverPlatforms,
    activeDriverTrips,
    tachographSummary,
    rolling24hCompliance,
    aiCoreBriefing,
    setDriverNav,
    createAndAnalyzeProposal,
    updateProposalLifecycle,
    acceptProposalForTrip,
    confirmActiveTripPlatform,
    markActiveTripArrived,
    startActiveTripWait,
    startActiveTripInProgress,
    recordActiveTripNavigation,
    completeActiveTripAction,
    cancelActiveTripAction,
    updateAutoPilotConfig,
    updateOverlayConfig,
    resetFloatingTierConfigs,
    updateFloatingDockConfig,
    markFloatingPreviewOpened,
    captureExternalEvent,
    confirmPendingCapture,
    parseAndImportSmartCaptures,
    correctSmartCaptureRecord,
    overrideProposalAutoPilotDecision,
    setFloatingCardQuickHidden,
  } = useEcosystem();

  const [batchRawInput, setBatchRawInput] = useState(
    'Uber Green • €14,60 (+€1,40 bónus) • Recolha 1,5 km (4 min) • Viagem 9,2 km (16 min) • Destino Aeroporto'
  );
  const [batchFormat, setBatchFormat] = useState<'ocr_or_notification' | 'csv' | 'json'>('ocr_or_notification');
  const [batchPlatformId, setBatchPlatformId] = useState<string>('uber');
  const [editingCaptureId, setEditingCaptureId] = useState<string | null>(null);
  const [correctionAmount, setCorrectionAmount] = useState<number>(0);
  const [correctionReason, setCorrectionReason] = useState<string>('Ajuste após conferência com recibo oficial');

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [arrivalMethod, setArrivalMethod] = useState<ArrivalDetectionMethod>('Botão manual no AIVAD');
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [cancelPanelOpen, setCancelPanelOpen] = useState(false);
  const [cancelActor, setCancelActor] = useState<CancellationBy>('Passageiro');
  const [cancelNoShow, setCancelNoShow] = useState(true);
  const [cancelReason, setCancelReason] = useState('Passageiro não compareceu no ponto dentro do prazo');
  const [cancelComp, setCancelComp] = useState(3.2);

  useEffect(() => {
    if (!state.activeTrip) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.activeTrip]);

  const activeTripTimers = useMemo(
    () => (state.activeTrip ? computeTripTimersSnapshot(state.activeTrip, nowMs) : null),
    [state.activeTrip, nowMs]
  );

  const todayIso = getTodayIso();

  // Sub-tab management when entering consolidated 'corridas' view
  const [opsSubTab, setOpsSubTab] = useState<'calculadora' | 'propostas-tempo-real' | 'smart-capture'>('calculadora');
  const resolvedTab = activeTab === 'corridas' ? opsSubTab : activeTab;

  // Dashboard filters
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredTrips = useMemo(() => {
    return activeDriverTrips.filter((t) => {
      if (!isCompletedTripStatus(t.status)) return false;
      if (platformFilter !== 'ALL' && t.platformId !== platformFilter) return false;
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      if (dateFilter === 'TODAY' && t.date !== todayIso) return false;
      return true;
    });
  }, [activeDriverTrips, platformFilter, categoryFilter, dateFilter, todayIso]);

  const metrics = useMemo(() => {
    const gross = filteredTrips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0);
    const comm = filteredTrips.reduce((s, t) => s + t.commissionEur, 0);
    const opCost = filteredTrips.reduce((s, t) => s + t.operationalCostEur, 0);
    const exp = state.expenses.reduce((s, e) => s + e.amountEur, 0);
    const net = gross - comm - opCost - exp;
    const totalKm = filteredTrips.reduce((s, t) => s + t.pickupDistanceKm + t.tripDistanceKm, 0);
    const passKm = filteredTrips.reduce((s, t) => s + t.tripDistanceKm, 0);
    const emptyKm = filteredTrips.reduce((s, t) => s + t.pickupDistanceKm, 0);
    const prodMin = filteredTrips.reduce((s, t) => s + t.durationMin, 0);
    const onlineMin = tachographSummary.consolidatedOnlineMinutes || prodMin + 45;
    const waitMin = tachographSummary.waitMinutes || Math.max(0, onlineMin - prodMin);
    const hours = Math.max(0.1, prodMin / 60);
    return {
      gross,
      net,
      expensesTotal: exp + opCost + comm,
      onlineHours: onlineMin / 60,
      prodHours: hours,
      waitHours: waitMin / 60,
      totalKm,
      passKm,
      emptyKm,
      avgPerHour: gross / hours,
      avgPerKm: totalKm > 0 ? gross / totalKm : 0,
    };
  }, [filteredTrips, state.expenses, tachographSummary]);

  const platformBars = useMemo(() => {
    const map = new Map<string, { gross: number; trips: number }>();
    for (const t of filteredTrips) {
      const prev = map.get(t.platformId) ?? { gross: 0, trips: 0 };
      prev.gross = round2(prev.gross + t.grossEur + t.tipEur + t.bonusEur);
      prev.trips += 1;
      map.set(t.platformId, prev);
    }
    return Array.from(map.entries()).map(([id, val]) => {
      const plat = state.platforms.find((p) => p.id === id);
      return {
        id,
        label: plat?.name ?? id.toUpperCase(),
        sublabel: `${val.trips} viagens`,
        value: val.gross,
        formattedValue: formatMoney(val.gross, activeMarket.currency),
        color: plat?.brandColor ?? '#1D4ED8',
      };
    });
  }, [filteredTrips, state.platforms, activeMarket.currency]);

  // Offer Calculator State
  const [calcInput, setCalcInput] = useState<ProposalInput>({
    platformId: visibleDriverPlatforms[0]?.id ?? 'uber',
    category: visibleDriverPlatforms[0]?.categories[0] ?? 'UberX',
    grossValueEur: 14.5,
    pickupDistanceKm: 2.1,
    pickupTimeMin: 6,
    tripDistanceKm: 10.4,
    tripTimeMin: 18,
    stops: 0,
    tollsEur: 0,
    bonusEur: 1.5,
    region: `${state.localization.currentLocation.city} Centro`,
    pickupAddress: '',
    destinationAddress: '',
    notes: '',
    vehicleCostPerKmEur:
      (activeVehicle.consumptionPer100Km / 100) * activeVehicle.energyCostPerUnitEur +
      activeVehicle.maintenancePerKmEur,
    commissionPct: visibleDriverPlatforms[0]?.commissionPct ?? 25,
    calculationBasis: 'total_distance',
    mode: 'Equilibrado',
  });
  const [calcError, setCalcError] = useState<string | null>(null);
  const [lastCreatedPropId, setLastCreatedPropId] = useState<string | null>(null);
  const [lastSavedAiPackage, setLastSavedAiPackage] = useState<ProposalAiDecisionPackage | null>(null);

  const liveAiPackage = useMemo(
    () =>
      analyzeProposalWithAiCore({
        input: calcInput,
        autoPilot: state.autoPilot,
        activeVehicle,
        tachograph: state.tachograph,
        zones: state.zones,
        savedPlaces: state.savedPlaces,
        routine: state.routinePreferences,
      }),
    [
      calcInput,
      state.autoPilot,
      activeVehicle,
      state.tachograph,
      state.zones,
      state.savedPlaces,
      state.routinePreferences,
    ]
  );
  const liveAnalysis = liveAiPackage.analysis;

  // Dynamic Floating Card Configurator State (3 Independent Classification Profiles + Contextual Showcase Stage)
  const [overlayDraft, setOverlayDraft] = useState<AndroidOverlayConfig>(state.overlayConfig);
  const [editingTier, setEditingTier] = useState<ProposalClassification>('verde');
  const [explainedMetricKey, setExplainedMetricKey] = useState<FloatingMetricKey | null>(null);
  const [galleryFilterPlatform, setGalleryFilterPlatform] = useState<'ALL' | 'uber' | 'bolt'>('ALL');
  const [galleryFilterQuality, setGalleryFilterQuality] = useState<'ALL' | 'Boa' | 'Razoável' | 'Má'>('ALL');
  const [activeGalleryExampleId, setActiveGalleryExampleId] = useState<string | null>(null);
  const [dockDraft, setDockDraft] = useState<FloatingDockConfig>(state.floatingDockConfig);
  const [overlaySavedBanner, setOverlaySavedBanner] = useState<string | null>(null);
  const [previewSurface, setPreviewSurface] = useState<'web' | 'inapp' | 'android' | 'ios'>('web');
  const [previewStageTheme, setPreviewStageTheme] = useState<'light' | 'dark'>(state.theme);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [sandboxPreset, setSandboxPreset] = useState<'verde' | 'amarelo' | 'vermelho'>('verde');
  const [sandboxActionFeedback, setSandboxActionFeedback] = useState<string | null>(null);
  const [sandboxCardClosed, setSandboxCardClosed] = useState(false);

  // Active Trip Navigation / Traffic / Completion Inputs
  const [navTrafficInput, setNavTrafficInput] = useState<string>('');
  const [obsPickupKmInput, setObsPickupKmInput] = useState<string>('');
  const [obsPickupMinInput, setObsPickupMinInput] = useState<string>('');
  const [obsTripKmInput, setObsTripKmInput] = useState<string>('');
  const [obsTripMinInput, setObsTripMinInput] = useState<string>('');
  const [completePanelOpen, setCompletePanelOpen] = useState(false);
  const [completeGrossInput, setCompleteGrossInput] = useState<string>('');
  const [completePendingAdjInput, setCompletePendingAdjInput] = useState<string>('0');
  const [completePendingAdjReason, setCompletePendingAdjReason] = useState<string>(
    'Suplemento por atraso em trânsito (aguarda confirmação da plataforma)'
  );

  useEffect(() => {
    setOverlayDraft(state.overlayConfig);
  }, [state.overlayConfig]);

  useEffect(() => {
    setDockDraft(state.floatingDockConfig);
  }, [state.floatingDockConfig]);

  useEffect(() => {
    setPreviewStageTheme(state.theme);
  }, [state.theme]);

  useEffect(() => {
    if (!state.activeTrip) {
      setCompletePanelOpen(false);
      return;
    }
    setCompleteGrossInput(String(state.activeTrip.grossEstimatedEur));
    setNavTrafficInput(
      state.activeTrip.navigationTrafficEstTotalMin != null
        ? String(state.activeTrip.navigationTrafficEstTotalMin)
        : ''
    );
    setObsPickupKmInput(
      state.activeTrip.observedPickupKm != null ? String(state.activeTrip.observedPickupKm) : ''
    );
    setObsPickupMinInput(
      state.activeTrip.observedPickupMin != null ? String(state.activeTrip.observedPickupMin) : ''
    );
    setObsTripKmInput(
      state.activeTrip.observedTripKm != null ? String(state.activeTrip.observedTripKm) : ''
    );
    setObsTripMinInput(
      state.activeTrip.observedTripMin != null ? String(state.activeTrip.observedTripMin) : ''
    );
  }, [state.activeTrip?.id]);

  const selectedGalleryExample: ProposalGalleryExample | null = useMemo(
    () =>
      activeGalleryExampleId
        ? PROPOSAL_GALLERY_EXAMPLES.find((g) => g.id === activeGalleryExampleId) ?? null
        : null,
    [activeGalleryExampleId]
  );

  const sandboxInput = useMemo<ProposalInput>(() => {
    if (selectedGalleryExample) {
      return selectedGalleryExample.input;
    }
    const basePlat = visibleDriverPlatforms[0]?.id ?? 'uber';
    const baseCat = visibleDriverPlatforms[0]?.categories[0] ?? 'UberX';
    const baseComm = visibleDriverPlatforms[0]?.commissionPct ?? 25;
    const th = state.autoPilot.thresholds;

    if (sandboxPreset === 'verde') {
      const pickupKm = Number(Math.min(1.2, Math.max(0.5, th.maxPickupKm * 0.4)).toFixed(1));
      const tripKm = 9.2;
      const totalKm = pickupKm + tripKm;
      const totalMin = 20;
      const minGross = Math.max(
        th.minValueEur + 6,
        totalKm * th.minEurPerKm * 1.85,
        (totalMin / 60) * th.minEurPerHour * 1.85,
        21.5
      );
      return {
        platformId: basePlat,
        category: baseCat,
        grossValueEur: Number(minGross.toFixed(2)),
        pickupDistanceKm: pickupKm,
        pickupTimeMin: 4,
        tripDistanceKm: tripKm,
        tripTimeMin: 16,
        stops: 0,
        tollsEur: 0,
        bonusEur: 0,
        region: `${
          state.localization.currentLocation.countryCode === activeMarket.code
            ? state.localization.currentLocation.city
            : activeMarket.regions[0]?.cities[0] ?? 'Lisboa'
        } → Aeroporto`,
        vehicleCostPerKmEur: 0.12,
        commissionPct: baseComm,
        calculationBasis: 'total_distance',
        mode: 'Equilibrado',
      };
    }

    if (sandboxPreset === 'amarelo') {
      const gross = Number(Math.max(th.minValueEur + 2.5, 11.4).toFixed(2));
      const pickupKm = Number(Math.min(1.6, Math.max(0.6, th.maxPickupKm * 0.55)).toFixed(1));
      const netApprox = gross * (1 - baseComm / 100) - 1.1;
      const targetTotalKm = Math.max(6, netApprox / Math.max(0.4, th.minEurPerKm * 0.9));
      const tripKm = Number(Math.max(2.5, targetTotalKm - pickupKm).toFixed(1));
      const targetTotalMin = Math.max(
        12,
        Math.min(th.maxTotalTimeMin - 5, Math.round((netApprox / Math.max(8, th.minEurPerHour * 1.15)) * 60))
      );
      const pickupMin = Math.max(3, Math.round(targetTotalMin * 0.28));
      const tripMin = Math.max(6, targetTotalMin - pickupMin);
      return {
        platformId: basePlat,
        category: baseCat,
        grossValueEur: gross,
        pickupDistanceKm: pickupKm,
        pickupTimeMin: pickupMin,
        tripDistanceKm: tripKm,
        tripTimeMin: tripMin,
        stops: 0,
        tollsEur: 0,
        bonusEur: 0,
        region: `${state.localization.currentLocation.city} · Zona Intermédia`,
        vehicleCostPerKmEur: 0.12,
        commissionPct: baseComm,
        calculationBasis: 'total_distance',
        mode: 'Equilibrado',
      };
    }

    const redPickupKm = Number((th.maxPickupKm + 1.5).toFixed(1));
    const redGross = Number(Math.max(3.8, th.minValueEur * 0.72).toFixed(2));
    return {
      platformId: basePlat,
      category: baseCat,
      grossValueEur: redGross,
      pickupDistanceKm: redPickupKm,
      pickupTimeMin: 12,
      tripDistanceKm: 6.5,
      tripTimeMin: 21,
      stops: 1,
      tollsEur: 1.2,
      bonusEur: 0,
      region: 'Periferia Distante (Risco Retorno Vazio)',
      vehicleCostPerKmEur: 0.12,
      commissionPct: baseComm,
      calculationBasis: 'total_distance',
      mode: 'Equilibrado',
    };
  }, [
    selectedGalleryExample,
    sandboxPreset,
    visibleDriverPlatforms,
    state.localization.currentLocation.city,
    state.localization.currentLocation.countryCode,
    activeMarket,
    state.autoPilot.thresholds,
  ]);

  const sandboxPackage = useMemo(
    () =>
      analyzeProposalWithAiCore({
        input: sandboxInput,
        autoPilot: state.autoPilot,
        activeVehicle,
        tachograph: state.tachograph,
        zones: state.zones,
        savedPlaces: state.savedPlaces,
        routine: state.routinePreferences,
      }),
    [
      sandboxInput,
      state.autoPilot,
      activeVehicle,
      state.tachograph,
      state.zones,
      state.savedPlaces,
      state.routinePreferences,
    ]
  );

  const calcZoneAlerts = useMemo(
    () =>
      evaluateProposalZoneAlerts({
        input: {
          pickupAddress: calcInput.pickupAddress,
          destinationAddress: calcInput.destinationAddress,
          region: calcInput.region,
        },
        zones: state.zones,
        observations: state.zoneObservations,
      }),
    [calcInput.pickupAddress, calcInput.destinationAddress, calcInput.region, state.zones, state.zoneObservations]
  );

  const sandboxZoneAlerts = useMemo(
    () =>
      evaluateProposalZoneAlerts({
        input: {
          pickupAddress: sandboxInput.pickupAddress,
          destinationAddress: sandboxInput.destinationAddress,
          region: sandboxInput.region,
        },
        zones: state.zones,
        observations: state.zoneObservations,
      }),
    [sandboxInput.pickupAddress, sandboxInput.destinationAddress, sandboxInput.region, state.zones, state.zoneObservations]
  );

  const renderActiveTripLifecyclePanel = () => {
    const sess = state.activeTrip;
    const snap = activeTripTimers;
    if (!sess || !snap) return null;

    return (
      <Card data-testid="active-trip-lifecycle-panel" className="p-5 border-2 border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/25 space-y-4 text-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-700 text-white font-bold uppercase text-[10px]">
                Viagem Ativa · {sess.phase}
              </span>
              <span className="font-mono-tabular font-bold">
                {sess.platformId.toUpperCase()} · {sess.category} ({sess.externalRef})
              </span>
              <StatusLabel
                tone={sess.platformConfirmed ? 'success' : 'warning'}
                text={sess.platformConfirmed ? 'Confirmada na Plataforma' : 'Aguarda Confirmação na Plataforma'}
              />
            </div>
            <p className="text-slate-700 dark:text-slate-200 font-medium">
              Recolha: <strong>{sess.pickupAddress || sess.pickupZone}</strong> → Destino:{' '}
              <strong>{sess.destinationAddress || sess.destinationZone || 'A confirmar'}</strong>
            </p>
          </div>

          {!sess.platformConfirmed && (
            <button
              type="button"
              onClick={() => confirmActiveTripPlatform()}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shrink-0"
            >
              Confirmar na Plataforma
            </button>
          )}
        </div>

        {/* Separated Timers: Deslocação vs Espera */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
              Deslocação até à recolha
            </span>
            <p data-testid="timer-travel-pickup" className="text-xl font-extrabold font-mono-tabular text-blue-700 dark:text-blue-400">
              {formatMmSs(snap.travelToPickupSeconds)}
            </p>
            <span className="text-[11px] text-slate-500">
              Estimado: {sess.pickupTimeEstMin} min ({sess.pickupDistanceKm} km)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
              Espera pelo passageiro
            </span>
            <p data-testid="timer-passenger-wait" className="text-xl font-extrabold font-mono-tabular text-amber-700 dark:text-amber-400">
              {formatMmSs(snap.waitAtPickupSeconds)}
            </p>
            <span className="text-[11px] text-slate-500">
              {sess.waitStartedAtIso
                ? `Espera gratuita restante: ${formatMmSs(snap.remainingFreeWaitSeconds)} · Prazo ref.: ${formatMmSs(snap.remainingToCancelDeadlineSeconds)}`
                : 'A 00:00 até assinalar chegada e espera'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
              Orientação de cancelamento (Nunca auto-cancela a 0)
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {snap.waitPhaseStatus}
            </p>
            <span className="text-[11px] text-slate-500 block">
              Fonte: {sess.ruleApplied.source} (verif. {sess.ruleApplied.verifiedAt})
            </span>
          </div>
        </div>

        {/* Actions per phase */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200/70 dark:border-blue-900">
          {sess.phase === 'Em deslocação para recolha' && (
            <>
              <select
                aria-label="Método de deteção de chegada"
                value={arrivalMethod}
                onChange={(e) => setArrivalMethod(e.target.value as ArrivalDetectionMethod)}
                className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Botão manual no AIVAD">Botão manual no AIVAD</option>
                <option value="Geolocalização no ponto (A validar)">Geolocalização no ponto (A validar)</option>
                <option value="Notificação app externa (A validar)">Notificação app externa (A validar)</option>
              </select>
              <button
                type="button"
                onClick={() => markActiveTripArrived(arrivalMethod, true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                <MapPin className="w-3.5 h-3.5" />
                Cheguei ao local (Iniciar Espera)
              </button>
            </>
          )}

          {sess.phase === 'Chegada ao local de recolha' && (
            <button
              type="button"
              onClick={() => startActiveTripWait()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              <Clock className="w-3.5 h-3.5" />
              Iniciar Cronómetro de Espera
            </button>
          )}

          {(sess.phase === 'Chegada ao local de recolha' || sess.phase === 'Em espera pelo passageiro') && (
            <button
              type="button"
              onClick={() => startActiveTripInProgress()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
            >
              <Play className="w-3.5 h-3.5" />
              Passageiro a Bordo (Iniciar Viagem)
            </button>
          )}

          <button
            type="button"
            onClick={() => setCompletePanelOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Concluir Viagem (€{sess.grossEstimatedEur.toFixed(2)})
          </button>

          <button
            type="button"
            onClick={() => setCancelPanelOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
          >
            Registar Cancelamento / No-Show
          </button>
        </div>

        {/* Navigation Launcher (Waze / Google Maps) + Observed Traffic & Post-Acceptance Actuals */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          {(() => {
            const targetAddress =
              sess.phase === 'Em deslocação para recolha'
                ? sess.pickupAddress || sess.pickupZone
                : sess.destinationAddress || sess.destinationZone || sess.pickupAddress || sess.pickupZone;
            const wazePlan = buildWazeNavigationLaunch(targetAddress, 'Waze');
            const gmapsPlan = buildWazeNavigationLaunch(targetAddress, 'Google Maps');
            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      Navegação (Waze / Maps) &amp; Percurso Efetivo com Trânsito
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Estimativa antes da aceitação: {(sess.pickupDistanceKm + sess.tripDistanceKm).toFixed(1)} km ·{' '}
                      {sess.pickupTimeEstMin + sess.tripTimeEstMin} min ({sess.pickupTimeEstMin}m recolha +{' '}
                      {sess.tripTimeEstMin}m viagem)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <a
                      href={wazePlan.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        recordActiveTripNavigation({
                          navigationAppUsed: 'Waze',
                          navigationStartedAtIso: new Date().toISOString(),
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" /> Abrir no Waze
                    </a>
                    <a
                      href={gmapsPlan.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        recordActiveTripNavigation({
                          navigationAppUsed: 'Google Maps',
                          navigationStartedAtIso: new Date().toISOString(),
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-blue-600 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" /> Google Maps
                    </a>
                  </div>
                </div>
                <p className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg px-2.5 py-1.5">
                  {wazePlan.honestyNote}
                </p>
              </>
            );
          })()}

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            <div>
              <label htmlFor="act-traffic-min" className="block text-[10px] text-slate-500 mb-0.5">
                ETA c/ trânsito (min)
              </label>
              <input
                id="act-traffic-min"
                type="number"
                min={1}
                placeholder="Ex: 32"
                value={navTrafficInput}
                onChange={(e) => setNavTrafficInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="act-obs-pkm" className="block text-[10px] text-slate-500 mb-0.5">
                Recolha real (km)
              </label>
              <input
                id="act-obs-pkm"
                type="number"
                step="0.1"
                min={0}
                placeholder={String(sess.pickupDistanceKm)}
                value={obsPickupKmInput}
                onChange={(e) => setObsPickupKmInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="act-obs-pmin" className="block text-[10px] text-slate-500 mb-0.5">
                Recolha real (min)
              </label>
              <input
                id="act-obs-pmin"
                type="number"
                min={0}
                placeholder={String(sess.pickupTimeEstMin)}
                value={obsPickupMinInput}
                onChange={(e) => setObsPickupMinInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="act-obs-tkm" className="block text-[10px] text-slate-500 mb-0.5">
                Viagem real (km)
              </label>
              <input
                id="act-obs-tkm"
                type="number"
                step="0.1"
                min={0}
                placeholder={String(sess.tripDistanceKm)}
                value={obsTripKmInput}
                onChange={(e) => setObsTripKmInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="act-obs-tmin" className="block text-[10px] text-slate-500 mb-0.5">
                Viagem real (min)
              </label>
              <input
                id="act-obs-tmin"
                type="number"
                min={0}
                placeholder={String(sess.tripTimeEstMin)}
                value={obsTripMinInput}
                onChange={(e) => setObsTripMinInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  recordActiveTripNavigation({
                    navigationTrafficEstTotalMin: navTrafficInput ? Number(navTrafficInput) : null,
                    observedPickupKm: obsPickupKmInput ? Number(obsPickupKmInput) : null,
                    observedPickupMin: obsPickupMinInput ? Number(obsPickupMinInput) : null,
                    observedTripKm: obsTripKmInput ? Number(obsTripKmInput) : null,
                    observedTripMin: obsTripMinInput ? Number(obsTripMinInput) : null,
                  })
                }
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-blue-700 text-white font-semibold cursor-pointer"
              >
                Guardar Trânsito / Real
              </button>
            </div>
          </div>
          {sess.navigationTrafficEstTotalMin && (
            <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
              ETA navegação registado: {sess.navigationTrafficEstTotalMin} min (vs{' '}
              {sess.pickupTimeEstMin + sess.tripTimeEstMin} min estimados antes da aceitação ·{' '}
              {activeMarket.currencySymbol}
              {((sess.netEstimatedEur / Math.max(1, sess.navigationTrafficEstTotalMin)) * 60).toFixed(2)}
              /h projetado sem assumir compensação automática).
            </p>
          )}
        </div>

        {completePanelOpen && (
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 space-y-3">
            <p className="font-bold text-slate-900 dark:text-white">
              Fechar Viagem: Valor Inicial vs Valor Confirmado &amp; Ajuste por Atraso
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label htmlFor="comp-gross" className="block text-[10px] text-slate-500 mb-0.5">
                  Valor confirmado pela plataforma ({activeMarket.currencySymbol})
                </label>
                <input
                  id="comp-gross"
                  type="number"
                  step="0.1"
                  value={completeGrossInput}
                  onChange={(e) => setCompleteGrossInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="comp-pend" className="block text-[10px] text-slate-500 mb-0.5">
                  Ajuste atraso pendente ({activeMarket.currencySymbol} — não entra nos ganhos reais)
                </label>
                <input
                  id="comp-pend"
                  type="number"
                  step="0.1"
                  value={completePendingAdjInput}
                  onChange={(e) => setCompletePendingAdjInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="comp-reason" className="block text-[10px] text-slate-500 mb-0.5">
                  Motivo do pedido de ajuste
                </label>
                <input
                  id="comp-reason"
                  type="text"
                  value={completePendingAdjReason}
                  onChange={(e) => setCompletePendingAdjReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const g = Number(completeGrossInput) || sess.grossEstimatedEur;
                  const pAdj = Number(completePendingAdjInput) || 0;
                  completeActiveTripAction(g, 0, 0, {
                    pendingAdjustmentEur: pAdj > 0 ? pAdj : undefined,
                    pendingAdjustmentReason: completePendingAdjReason,
                  });
                  setCompletePanelOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
              >
                Confirmar Conclusão e Reconciliar IA
              </button>
              <button
                type="button"
                onClick={() => setCompletePanelOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {cancelPanelOpen && (
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 space-y-3">
            <p className="font-bold text-red-700 dark:text-red-300">
              Registo Manual de Cancelamento (O AIVAD nunca cancela automaticamente na app externa)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                aria-label="Quem cancelou"
                value={cancelActor}
                onChange={(e) => setCancelActor(e.target.value as CancellationBy)}
                className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Passageiro">Passageiro</option>
                <option value="Motorista">Motorista</option>
                <option value="Plataforma">Plataforma</option>
                <option value="Desconhecido">Desconhecido</option>
              </select>
              <label className="inline-flex items-center gap-2 px-2">
                <input
                  type="checkbox"
                  checked={cancelNoShow}
                  onChange={(e) => setCancelNoShow(e.target.checked)}
                />
                <span>Passageiro não compareceu</span>
              </label>
              <input
                type="number"
                step="0.1"
                aria-label="Compensação recebida (€)"
                value={cancelComp}
                onChange={(e) => setCancelComp(Number(e.target.value))}
                placeholder="Compensação €"
                className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
              <input
                type="text"
                aria-label="Motivo do estado"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  cancelActiveTripAction(cancelActor, cancelNoShow, cancelReason, cancelComp);
                  setCancelPanelOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                Confirmar Registo de Cancelamento
              </button>
              <button
                type="button"
                onClick={() => setCancelPanelOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </Card>
    );
  };

  // Smart Data Capture Form
  const [capForm, setCapForm] = useState<{
    externalTxId: string;
    source: CaptureSource;
    dataType: SmartCaptureRecord['dataType'];
    platformId: string;
    amountEur: number;
    relatedTripRef: string;
    rawSummary: string;
  }>({
    externalTxId: 'UB-88439-TIP-NEW',
    source: 'Notificação Android Autorizada',
    dataType: 'Gorjeta',
    platformId: 'uber',
    amountEur: 3.5,
    relatedTripRef: 'UB-88439',
    rawSummary: 'Gorjeta pós-viagem €3.50 recebida na Uber',
  });
  const [capFeedback, setCapFeedback] = useState<{
    message: string;
    tone: 'success' | 'warning' | 'danger';
  } | null>(null);

  const [pendingMatchTripId, setPendingMatchTripId] = useState<string>(state.trips[0]?.id ?? '');

  // ==========================================================
  // DASHBOARD PRINCIPAL DO MOTORISTA
  // ==========================================================
  if (resolvedTab === 'dashboard') {
    const expiringDocs = state.documents.filter((d) => d.status !== 'Válido');
    const activeCampaigns = state.campaigns.filter((c) => c.status === 'Ativa');
    const activeTacho = state.tachograph.sessions.find(
      (s) => s.id === state.tachograph.activeSessionId && s.status === 'Em curso'
    );
    const totalKmRatio = Math.max(0.1, metrics.passKm + metrics.emptyKm);
    const passKmPct = Math.round((metrics.passKm / totalKmRatio) * 100);
    const weeklyNetGoal = 750;
    const isTachoCritical =
      rolling24hCompliance.alertLevel === 'Limite 10h Atingido' ||
      rolling24hCompliance.alertLevel === 'Crítico 9h (540 min)';

    return (
      <div className="space-y-6">
        {renderActiveTripLifecyclePanel()}
        {/* Live Commercial Cockpit Strip (Light & Dark Adaptive) */}
        <Card
          variant="tinted-blue"
          className="p-5 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        TACHO_STATE_COLOR[activeTacho?.currentState ?? 'Fora de serviço'],
                    }}
                  />
                  {activeTacho ? 'Turno & Tacógrafo Ativos' : 'Sem Turno Ativo'}
                </span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span
                  className={`font-mono-tabular font-bold ${
                    isTachoCritical
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  TVDE 10h/24h: {Math.floor(rolling24hCompliance.rolling24hWorkMinutes / 60)}h
                  {String(rolling24hCompliance.rolling24hWorkMinutes % 60).padStart(2, '0')}m (Restam{' '}
                  {rolling24hCompliance.remainingLegalMinutes}m)
                </span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="text-slate-600 dark:text-slate-300 font-mono-tabular">
                  {state.localization.currentLocation.city},{' '}
                  {state.localization.currentLocation.countryCode}
                  {state.localization.currentLocation.countryCode !== activeMarket.code
                    ? ` · Mercado ${activeMarket.code}`
                    : ''}{' '}
                  · {activeMarket.currency} ({activeMarket.unitSystem === 'imperial' ? 'mi' : 'km'})
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white">
                {activeTacho?.currentState ?? 'Fora de serviço'} ·{' '}
                <span className="text-blue-700 dark:text-blue-400">
                  {formatMoney(metrics.net, activeMarket.currency)} líquidos
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Condução tacógrafo: {tachographSummary.drivingMinutes} min · Trabalho s/ condução:{' '}
                {tachographSummary.workWithoutDrivingMinutes} min · Pausas/Refeições:{' '}
                {tachographSummary.breakMinutes + tachographSummary.mealMinutes} min
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDriverNav('ai-core')}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Abrir AI CORE</span>
              </button>
              <button
                type="button"
                onClick={() => setDriverNav('tacografo')}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Gauge className="w-4 h-4" />
                <span>{translateUi(state.localization.languageCode, 'nav_tacho')}</span>
              </button>
              <button
                type="button"
                onClick={() => setDriverNav('calculadora')}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#131F36] hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>Analisar Proposta</span>
              </button>
            </div>
          </div>
        </Card>

        {/* AI CORE Proactive Briefing Strip */}
        <Card className="p-5 space-y-3 border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              AIVAD AI CORE — Briefing Operacional Proativo ({aiCoreBriefing.length} análises ativas)
            </h2>
            <button
              type="button"
              onClick={() => setDriverNav('ai-core')}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Ver 8 Agentes &amp; Previsões <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {aiCoreBriefing.slice(0, 3).map((ins) => (
              <div
                key={ins.id}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="font-bold text-blue-700 dark:text-blue-400">
                    {ins.agentName}
                  </span>
                  <EpistemicTagBadge tag={ins.epistemicTag} />
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">{ins.title}</p>
                <p className="text-slate-600 dark:text-slate-300 line-clamp-2">{ins.recommendation}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Interactive Filters */}
        <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedFilter
              value={dateFilter}
              onChange={setDateFilter}
              options={[
                { id: 'ALL', label: 'Todo o período' },
                { id: 'TODAY', label: `Hoje (${todayIso})` },
              ]}
            />
            <div>
              <label htmlFor="dash-platform" className="sr-only">Filtrar por plataforma</label>
              <select
                id="dash-platform"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value="ALL">Todas ({visibleDriverPlatforms.length} ativas)</option>
                {visibleDriverPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dash-category" className="sr-only">Filtrar por categoria</label>
              <select
                id="dash-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value="ALL">Todas categorias</option>
                {Array.from(new Set(activeDriverTrips.map((t) => t.category))).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-xs text-slate-500">
            {filteredTrips.length} viagem(ns) concluída(s) · canceladas excluídas automaticamente
          </span>
        </Card>

        {/* Primary KPI Grid */}
        <div
          data-guide-target="driver-kpi-grid"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          <MetricCard
            label={translateUi(state.localization.languageCode, 'gross_earnings')}
            value={formatMoney(metrics.gross, activeMarket.currency)}
            subtext={`${filteredTrips.length} viagens · exclui canceladas`}
            explanation="Soma total das tarifas brutas, gorjetas reconciliadas e bónus das viagens concluídas."
            formula="Σ(tarifa bruta + gorjeta + bónus)"
            accent="blue"
            onDrillDown={() => setDriverNav('historico-viagens')}
            drillDownLabel="Ver histórico de viagens"
          />
          <MetricCard
            label={translateUi(state.localization.languageCode, 'net_estimated')}
            value={formatMoney(metrics.net, activeMarket.currency)}
            subtext={`Após comissões e ${formatMoney(metrics.expensesTotal, activeMarket.currency)} custos`}
            explanation="Estimativa real após comissões das plataformas, custo energético/manutenção e despesas lançadas."
            formula="Bruto - Comissões - Custo/km - Despesas"
            onDrillDown={() => setDriverNav('financeiro')}
            drillDownLabel="Abrir módulo financeiro"
          />
          <MetricCard
            label={`Eficiência (${activeMarket.currencySymbol.trim()}/h e Distância)`}
            value={`${formatMoney(metrics.avgPerHour, activeMarket.currency)}/h`}
            subtext={`${formatDistanceRate(metrics.avgPerKm, activeMarket.currency, activeMarket.unitSystem)} · ${formatDistance(metrics.totalKm, activeMarket.unitSystem)}`}
            explanation="Eficiência média de faturação por hora produtiva e por distância comprometida."
            formula="Receita Bruta ÷ Horas Produtivas | Receita ÷ Distância"
            onDrillDown={() => setDriverNav('relatorios')}
            drillDownLabel="Explorar relatórios"
          />
          <MetricCard
            label="Alertas Documentais & Legais"
            value={`${expiringDocs.length} Pendentes`}
            subtext={`${state.obligations.filter((o) => o.humanValidated).length} obrigações validadas (${activeMarket.code})`}
            explanation="Documentos próximos do vencimento ligados às obrigações locais do motorista."
            formula="Contagem de documentos em estado 'A expirar' ou 'Expirado'"
            accent={expiringDocs.length > 0 ? 'red' : 'neutral'}
            onDrillDown={() => setDriverNav('documentos')}
            drillDownLabel="Rever documentos"
          />
        </div>

        {/* Visual Charts Row: Weekly Goal Donut + Multi-Platform Earnings Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-5 p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Progresso da Meta Semanal
              </h2>
              <button
                type="button"
                onClick={() => setDriverNav('planeador')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Planeador <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <GoalDonutChart
              currentValue={Math.max(0, metrics.net)}
              targetValue={weeklyNetGoal}
              formattedCurrent={formatMoney(Math.max(0, metrics.net), activeMarket.currency)}
              formattedTarget={formatMoney(weeklyNetGoal, activeMarket.currency)}
              label="Resultado Líquido Acumulado"
            />

            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between font-medium">
                <span>Km Passageiro ({passKmPct}%) vs Vazio ({100 - passKmPct}%)</span>
                <span className="font-mono-tabular">
                  {formatDistance(metrics.passKm, activeMarket.unitSystem)} /{' '}
                  {formatDistance(metrics.emptyKm, activeMarket.unitSystem)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-red-200 dark:bg-red-950 overflow-hidden flex">
                <div
                  className="h-full bg-blue-700 transition-all duration-500"
                  style={{ width: `${passKmPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Online: {metrics.onlineHours.toFixed(1)}h · Produtivo: {metrics.prodHours.toFixed(1)}h</span>
                <span>Espera: {metrics.waitHours.toFixed(1)}h</span>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-7 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Resumo por Plataforma (Clique para filtrar)
              </h2>
              <button
                type="button"
                onClick={() => setDriverNav('consolidado-plataformas')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Consolidado Multi-App <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <HorizontalBreakdownBars
              items={platformBars}
              selectedId={platformFilter !== 'ALL' ? platformFilter : null}
              onSelect={(id) => setPlatformFilter(platformFilter === id ? 'ALL' : id)}
            />
          </Card>
        </div>

        {/* Campaigns, Active Vehicle & Platforms Quick Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Campanhas Ativas ({activeCampaigns.length})</h2>
              <button
                type="button"
                onClick={() => setDriverNav('campanhas')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Ver Todas
              </button>
            </div>
            <div className="space-y-3">
              {activeCampaigns.slice(0, 2).map((c) => {
                const pct = Math.min(100, Math.round((c.completedTrips / c.targetTrips) * 100));
                return (
                  <div key={c.id} className="space-y-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="truncate pr-2">{c.name}</span>
                      <span className="font-mono-tabular shrink-0">
                        {c.completedTrips}/{c.targetTrips} ({formatMoney(c.rewardEur, activeMarket.currency)})
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-blue-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Veículo Ativo
              </h2>
              <button
                type="button"
                onClick={() => setDriverNav('veiculos')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Gerir
              </button>
            </div>
            <div className="text-xs space-y-1.5">
              <p className="font-bold text-sm">
                {activeVehicle.brand} {activeVehicle.model} ({activeVehicle.year})
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {activeVehicle.fuelType} · Autonomia real{' '}
                {formatDistance(activeVehicle.realRangeKm ?? activeVehicle.rangeKm, activeMarket.unitSystem)} ·{' '}
                {activeVehicle.city}
              </p>
              <div className="pt-2 flex items-center justify-between">
                <StatusLabel tone="success" text={`Elegível (${activeMarket.code})`} />
                <button
                  type="button"
                  onClick={() => setDriverNav('legislacao')}
                  className="text-blue-700 dark:text-blue-400 font-medium hover:underline"
                >
                  Conformidade →
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Apps Ativas no Perfil ({visibleDriverPlatforms.length})</h2>
              <button
                type="button"
                onClick={() => setDriverNav('apps-integracoes')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Gerir Apps
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleDriverPlatforms.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() =>
                    setDriverNav(
                      pl.id === 'uber'
                        ? 'desempenho-uber'
                        : pl.id === 'bolt'
                        ? 'desempenho-bolt'
                        : 'consolidado-plataformas'
                    )
                  }
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-600 text-xs font-medium"
                >
                  <PlatformBadge
                    platformId={pl.id}
                    name={pl.name}
                    shortCode={pl.shortCode}
                    brandColor={pl.brandColor}
                    size="sm"
                  />
                  <span>{pl.name}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Ecosystem Event Bus Feed */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Últimos Eventos Sincronizados entre Módulos</h2>
            <span className="text-xs text-slate-500">Arquitetura orientada a eventos idempotentes</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {state.events.slice(0, 4).map((ev) => (
              <div key={ev.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400 mr-2">
                    {ev.type}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{ev.payloadSummary}</span>
                </div>
                <span className="text-slate-500 whitespace-nowrap">{ev.status}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Sub-navigation ribbon when entering via 'corridas'
  const renderCorridasRibbon = () =>
    activeTab === 'corridas' ? (
      <Card className="p-3 flex flex-wrap items-center justify-between gap-2">
        <SegmentedFilter
          value={opsSubTab}
          onChange={(v) => setOpsSubTab(v as typeof opsSubTab)}
          options={[
            { id: 'calculadora', label: 'Calculadora & AI CORE' },
            { id: 'propostas-tempo-real', label: 'Propostas & Ciclo de Vida' },
            { id: 'smart-capture', label: 'Smart Data Capture' },
          ]}
        />
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setDriverNav('cartoes-flutuantes')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 font-medium inline-flex items-center gap-1"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            Configurar Cartão Flutuante
          </button>
          <button
            type="button"
            onClick={() => setDriverNav('historico-viagens')}
            className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold inline-flex items-center gap-1"
          >
            <History className="w-3.5 h-3.5" />
            Histórico de Viagens
          </button>
        </div>
      </Card>
    ) : null;

  // ==========================================================
  // CONFIGURADOR & SIMULADOR ISOLADO DE CARTÕES FLUTUANTES
  // ==========================================================
  if (resolvedTab === 'cartoes-flutuantes') {
    const baseProfiles =
      overlayDraft.classificationProfiles ?? createDefaultClassificationProfiles();
    const activeTierDraft =
      baseProfiles[editingTier] ?? resolveFloatingTierConfig(overlayDraft, editingTier);

    const updateActiveTier = (
      updater: (cur: FloatingCardTierStyleConfig) => FloatingCardTierStyleConfig
    ) => {
      setOverlayDraft((d) => {
        const profiles = d.classificationProfiles ?? createDefaultClassificationProfiles();
        const cur = profiles[editingTier] ?? resolveFloatingTierConfig(d, editingTier);
        const updated = updater(cur);
        return {
          ...d,
          classificationProfiles: {
            ...profiles,
            [editingTier]: updated,
          },
          ...(editingTier === 'verde'
            ? {
                bgColor: updated.bgColor,
                textColor: updated.textColor,
                borderColor: updated.borderColor,
                borderWidthPx: updated.borderWidthPx,
                opacityPercent: updated.opacityPercent,
                brightnessAdjust: updated.brightnessAdjust,
                colorIntensityPct: updated.colorIntensityPct,
                fontFamily: updated.fontFamily,
                fontSizePx: updated.fontSizePx,
                widthPercent: updated.widthPercent,
                layoutMode: updated.layoutMode,
                position: updated.position,
                marginOffsetPx: updated.marginOffsetPx,
                visibleMetrics: [...updated.visibleMetrics],
              }
            : {}),
        };
      });
    };

    const visibleSet = new Set(activeTierDraft.visibleMetrics);
    const orderedMetrics: FloatingMetricKey[] = [
      ...activeTierDraft.visibleMetrics,
      ...ALL_FLOATING_METRICS.filter((k) => !visibleSet.has(k)),
    ];

    const ALL_POSITIONS: Array<{ id: FloatingCardPosition; label: string; hint: string }> = [
      { id: 'Topo esquerdo', label: 'Topo esquerdo', hint: 'Canto superior esquerdo seguro' },
      { id: 'Centro superior', label: 'Centro superior', hint: 'Abaixo da barra de estado' },
      { id: 'Topo direito', label: 'Topo direito', hint: 'Canto superior direito seguro' },
      { id: 'Lateral esquerda', label: 'Lateral esquerda', hint: 'Encostado à esquerda' },
      { id: 'Centro', label: 'Centro', hint: 'Destaque central em ecrã' },
      { id: 'Lateral direita', label: 'Lateral direita', hint: 'Encostado à direita' },
      { id: 'Inferior esquerdo', label: 'Inferior esquerdo', hint: 'Canto inferior esquerdo seguro' },
      { id: 'Centro inferior', label: 'Centro inferior', hint: 'Acima da barra de navegação' },
      { id: 'Inferior direito', label: 'Inferior direito', hint: 'Canto inferior direito seguro' },
    ];

    const normalizedTierPos = normalizeFloatingCardPosition(activeTierDraft.position);
    const safeTierMargin = Math.max(4, Math.min(36, activeTierDraft.marginOffsetPx ?? 12));

    const moveMetric = (key: FloatingMetricKey, dir: -1 | 1) => {
      const idx = activeTierDraft.visibleMetrics.indexOf(key);
      if (idx === -1) return;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= activeTierDraft.visibleMetrics.length) return;
      const copy = [...activeTierDraft.visibleMetrics];
      [copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]];
      updateActiveTier((cur) => ({ ...cur, visibleMetrics: copy }));
    };

    const toggleMetric = (key: FloatingMetricKey) => {
      const exists = activeTierDraft.visibleMetrics.includes(key);
      updateActiveTier((cur) => ({
        ...cur,
        visibleMetrics: exists
          ? cur.visibleMetrics.filter((k) => k !== key)
          : [...cur.visibleMetrics, key],
      }));
    };

    const getStageAlignmentClasses = (pos: FloatingCardPosition): string => {
      switch (pos) {
        case 'Topo esquerdo':
          return 'items-start justify-start';
        case 'Centro superior':
          return 'items-center justify-start';
        case 'Topo direito':
          return 'items-end justify-start';
        case 'Lateral esquerda':
          return 'items-start justify-center';
        case 'Centro':
          return 'items-center justify-center';
        case 'Lateral direita':
          return 'items-end justify-center';
        case 'Inferior esquerdo':
          return 'items-start justify-end';
        case 'Centro inferior':
          return 'items-center justify-end';
        case 'Inferior direito':
          return 'items-end justify-end';
        default:
          return 'items-center justify-start';
      }
    };

    const isMobileFrame = previewSurface === 'android' || previewSurface === 'ios';

    const stageClassification = sandboxPackage.analysis.classification;
    const stageActiveTier =
      baseProfiles[stageClassification] ?? resolveFloatingTierConfig(overlayDraft, stageClassification);
    const stageNormalizedPos = normalizeFloatingCardPosition(stageActiveTier.position);
    const stageSafeMargin = Math.max(4, Math.min(36, stageActiveTier.marginOffsetPx ?? 12));

    const filteredGallery = PROPOSAL_GALLERY_EXAMPLES.filter((ex) => {
      if (galleryFilterPlatform !== 'ALL' && ex.platformId !== galleryFilterPlatform) return false;
      if (galleryFilterQuality !== 'ALL' && ex.qualityTier !== galleryFilterQuality) return false;
      return true;
    });

    const renderDeviceStage = (inModal = false) => {
      const stageThemeIsDark = previewStageTheme === 'dark';
      const cardStageWidthStyle = isMobileFrame
        ? `${Math.max(55, Math.min(100, stageActiveTier.widthPercent))}%`
        : `${Math.max(250, Math.round((stageActiveTier.widthPercent / 100) * 430))}px`;

      return (
        <div
          className="space-y-3"
          data-guide-target={inModal ? undefined : 'fc-preview-stage'}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                {selectedGalleryExample
                  ? 'EXEMPLO ANONIMIZADO DE DEMONSTRAÇÃO'
                  : 'DADOS DE PRÉ-VISUALIZAÇÃO (SANDBOX)'}
              </span>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Perfil: <strong>{stageActiveTier.customLabel}</strong> ({stageActiveTier.operationalMeaning}) · Posição:{' '}
                <strong>{stageNormalizedPos}</strong> · Margem: <strong>{stageSafeMargin}px</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewStageTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold cursor-pointer"
              >
                Tema: {stageThemeIsDark ? 'Escuro' : 'Claro'}
              </button>
              <SegmentedFilter
                value={selectedGalleryExample ? '__gallery__' : sandboxPreset}
                onChange={(v) => {
                  setActiveGalleryExampleId(null);
                  setSandboxPreset(v as 'verde' | 'amarelo' | 'vermelho');
                  setEditingTier(v as ProposalClassification);
                  setSandboxCardClosed(false);
                  setSandboxActionFeedback(null);
                }}
                options={[
                  { id: 'verde', label: baseProfiles.verde.customLabel || 'Favorável' },
                  { id: 'amarelo', label: baseProfiles.amarelo.customLabel || 'Atenção' },
                  { id: 'vermelho', label: baseProfiles.vermelho.customLabel || 'Evitar' },
                ]}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <SegmentedFilter
              value={previewSurface}
              onChange={(v) => setPreviewSurface(v as typeof previewSurface)}
              options={[
                { id: 'web', label: 'Web Preview' },
                { id: 'inapp', label: 'Aplicação AIVAD' },
                { id: 'android', label: 'Android — simulação visual' },
                { id: 'ios', label: 'iPhone — simulação visual' },
              ]}
            />
            {selectedGalleryExample && (
              <button
                type="button"
                onClick={() => setActiveGalleryExampleId(null)}
                className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 underline cursor-pointer"
              >
                Sair do exemplo ({selectedGalleryExample.platformId.toUpperCase()})
              </button>
            )}
          </div>

          {inModal && (
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-500 mr-1">Mover Posição ao Vivo:</span>
                {ALL_POSITIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setEditingTier(stageClassification);
                      setOverlayDraft((d) => {
                        const profs = d.classificationProfiles ?? createDefaultClassificationProfiles();
                        const cur = profs[stageClassification] ?? resolveFloatingTierConfig(d, stageClassification);
                        return {
                          ...d,
                          classificationProfiles: {
                            ...profs,
                            [stageClassification]: { ...cur, position: p.id },
                          },
                        };
                      });
                    }}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold border cursor-pointer ${
                      stageNormalizedPos === p.id
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 hover:border-blue-500'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {previewSurface === 'android' && (
            <p className="text-[11px] px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              <strong>Android — simulação visual:</strong> o overlay real sobre apps externas (Uber/Bolt) requer permissão nativa{' '}
              <code>SYSTEM_ALERT_WINDOW</code> na build nativa Android. Este palco demonstra posicionamento e estilo contextual reais.
            </p>
          )}
          {previewSurface === 'ios' && (
            <p className="text-[11px] px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200">
              <strong>iPhone (iOS) — simulação visual intra-app:</strong> a Apple bloqueia janelas flutuantes sobre aplicações de terceiros no iOS. Em iPhone, o cartão opera dentro do AIVAD complementado pelo copiloto AIVAD Voice.
            </p>
          )}

          {/* Contextual Device Frame Stage (Simulated Driving Map / Ride App Backdrop) */}
          <div
            data-testid="floating-preview-device-stage"
            className={`mx-auto rounded-3xl border-2 overflow-hidden flex flex-col shadow-inner transition-colors ${
              isMobileFrame
                ? inModal
                  ? 'max-w-[390px] w-full min-h-[540px]'
                  : 'max-w-[390px] w-full min-h-[480px]'
                : inModal
                  ? 'w-full min-h-[520px]'
                  : 'w-full min-h-[420px]'
            } ${
              stageThemeIsDark
                ? 'bg-[#080E1C] border-slate-700 text-slate-100'
                : 'bg-slate-100 border-slate-300 text-slate-900'
            }`}
          >
            {/* Safe-Area Simulated Device Top Bar */}
            <div
              className={`px-4 py-2 border-b flex items-center justify-between gap-2 text-[11px] font-mono-tabular shrink-0 ${
                stageThemeIsDark
                  ? 'bg-[#0F182B] border-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <span className="truncate">
                {previewSurface === 'ios'
                  ? '09:41 · iPhone Safe-Area (Intra-App)'
                  : previewSurface === 'android'
                    ? '09:41 · Android TVDE (Simulação Visual)'
                    : `AIVAD ${previewSurface === 'inapp' ? 'App' : 'Web'} Viewport · ${sandboxInput.platformId.toUpperCase()}`}
              </span>
              <span className="whitespace-nowrap">{isMobileFrame ? 'Status Bar Protegida' : 'Mapa Operacional Simulado'}</span>
            </div>

            {/* Simulated Realistic Ride-App Map Backdrop + Positioned Floating Card */}
            <div
              data-testid="floating-stage-usable-area"
              className={`relative flex-1 flex flex-col ${getStageAlignmentClasses(stageNormalizedPos)} overflow-hidden`}
              style={{ padding: `${stageSafeMargin}px` }}
            >
              {/* Subtle simulated map backdrop behind card so opacity/transparency & position stand out cleanly */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none select-none overflow-hidden"
              >
                <svg className="w-full h-full opacity-35" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <pattern id="aivad-grid-bg" width="48" height="48" patternUnits="userSpaceOnUse">
                      <path
                        d="M 48 0 L 0 0 0 48"
                        fill="none"
                        stroke={stageThemeIsDark ? '#1E3A5F' : '#CBD5E1'}
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="800" height="500" fill="url(#aivad-grid-bg)" />
                  <path
                    d="M 60 420 Q 260 300 410 245 T 730 95"
                    fill="none"
                    stroke={sandboxInput.platformId === 'bolt' ? '#059669' : '#2563EB'}
                    strokeWidth="6"
                    strokeDasharray="10 6"
                    strokeLinecap="round"
                  />
                  <circle cx="410" cy="245" r="10" fill="#10B981" />
                  <circle cx="730" cy="95" r="10" fill="#E11D48" />
                </svg>
                <div className="absolute inset-x-4 bottom-3 flex items-center justify-between text-[10px] opacity-60 font-mono-tabular">
                  <span>Zona: {sandboxInput.region} (Fundo ilustrativo)</span>
                  <span>
                    {sandboxInput.pickupDistanceKm} km recolha + {sandboxInput.tripDistanceKm} km viagem
                  </span>
                </div>
              </div>

              {sandboxCardClosed ? (
                <div className="relative z-10 m-auto text-center py-8 px-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 space-y-2 shadow-md">
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Cartão simulado fechado.</p>
                  <button
                    type="button"
                    onClick={() => setSandboxCardClosed(false)}
                    className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold cursor-pointer"
                  >
                    Reabrir Simulação
                  </button>
                </div>
              ) : (
                <div
                  data-testid="floating-stage-positioned-wrapper"
                  className="relative z-10 max-w-full transition-all duration-200"
                  style={{ width: cardStageWidthStyle }}
                >
                  <DynamicFloatingProposalCard
                    overlayConfig={overlayDraft}
                    tierOverride={stageActiveTier}
                    proposalInput={sandboxInput}
                    analysis={sandboxPackage.analysis}
                    recommendedAction={sandboxPackage.recommendedAction}
                    confidencePct={sandboxPackage.confidencePct}
                    confidenceStatus={sandboxPackage.confidenceStatus}
                    zoneAlerts={sandboxZoneAlerts}
                    isPreviewSurface={false}
                    disableAutoCenter
                    currencySymbol={activeMarket.currencySymbol}
                    forceThemeMode={previewStageTheme}
                    onAccept={() =>
                      setSandboxActionFeedback(
                        `Demonstração: Ação "Aceitar" testada no perfil "${stageActiveTier.customLabel}" (${stageActiveTier.operationalMeaning}) — 0 alterações no histórico real.`
                      )
                    }
                    onReject={() =>
                      setSandboxActionFeedback(
                        `Demonstração: Ação "Recusar" testada no perfil "${stageActiveTier.customLabel}" — sem impacto nas previsões.`
                      )
                    }
                    onClose={() => setSandboxCardClosed(true)}
                  />
                </div>
              )}
            </div>

            {/* Safe-Area Simulated Device Bottom Bar */}
            <div
              className={`px-4 py-2 border-t flex items-center justify-between text-[10px] font-semibold shrink-0 ${
                stageThemeIsDark
                  ? 'bg-[#0F182B] border-slate-800 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <span>Barra de Navegação Protegida (Safe-Area Bottom)</span>
              <span>Margem {stageSafeMargin}px respeitada</span>
            </div>
          </div>
        </div>
      );
    };

    const TIER_TABS: Array<{ id: ProposalClassification; hint: string }> = [
      { id: 'verde', hint: 'Significado interno: Favorável' },
      { id: 'amarelo', hint: 'Significado interno: Atenção' },
      { id: 'vermelho', hint: 'Significado interno: Evitar' },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <Card className="p-4 space-y-1.5 border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/50 dark:bg-emerald-950/20">
            <StatusLabel tone="success" text="1. Cartão Intra-App Web / PWA · Operacional Agora" />
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
              Funciona imediatamente neste navegador e PWA com 3 perfis totalmente independentes, 16 métricas explicadas e transparência rigorosa de dados indisponíveis.
            </p>
          </Card>
          <Card className="p-4 space-y-1.5 border-blue-200 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/20">
            <StatusLabel tone="info" text="2. Android — Simulação Visual (Overlay Nativo Pendente)" />
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
              O overlay real sobre Uber/Bolt exige permissão <code className="font-mono">SYSTEM_ALERT_WINDOW</code> na build nativa Android. Este palco valida layout, luminosidade, opacidade e posição segura.
            </p>
          </Card>
          <Card className="p-4 space-y-1.5 border-amber-200 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20">
            <StatusLabel tone="warning" text="3. iPhone (iOS) — Restrição Oficial Apple" />
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
              O iOS não permite janelas flutuantes sobre apps de terceiros; em iPhone o motorista opera intra-app com suporte de voz AIVAD Voice.
            </p>
          </Card>
        </div>

        {overlaySavedBanner && <StatusLabel tone="success" text={overlaySavedBanner} />}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <Card className="lg:col-span-6 p-5 space-y-5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                3 Classificações Independentes do Cartão Flutuante
              </h2>
              <button
                type="button"
                onClick={() => {
                  const defaults = createDefaultClassificationProfiles();
                  const nextOv = { ...SEED_OVERLAY_CONFIG, classificationProfiles: defaults };
                  setOverlayDraft(nextOv);
                  resetFloatingTierConfigs();
                  setOverlaySavedBanner('Os 3 perfis independentes foram repostos para o padrão de fábrica.');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Repor Padrão
              </button>
            </div>

            {/* 3 Independent Classification Profile Selector */}
            <div className="space-y-2">
              <p className="font-bold text-slate-900 dark:text-white">
                Selecione a Classificação a Personalizar (cada perfil guarda cores, brilho, métricas e posição próprios)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TIER_TABS.map((t) => {
                  const prof = baseProfiles[t.id];
                  const isSel = editingTier === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      data-testid={`tier-tab-${t.id}`}
                      onClick={() => {
                        setEditingTier(t.id);
                        setActiveGalleryExampleId(null);
                        setSandboxPreset(t.id);
                        setSandboxCardClosed(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSel
                          ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-extrabold truncate text-slate-900 dark:text-white">
                          {prof.customLabel || prof.operationalMeaning}
                        </span>
                        <span
                          className="w-4 h-4 rounded-md border shrink-0"
                          style={{
                            backgroundColor: prof.bgColor,
                            borderColor: prof.borderColor,
                            borderWidth: '2px',
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Papel: {prof.operationalMeaning}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/70 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                <strong>{activeTierDraft.operationalMeaning}:</strong> {TIER_MEANING_DESCRIPTIONS[editingTier]}
              </p>
            </div>

            {/* Editable Custom Classification Name (Decoupled from Color) */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="tier-custom-label" className="block font-bold mb-1">
                  Nome Apresentado neste Nível (livre)
                </label>
                <input
                  id="tier-custom-label"
                  type="text"
                  maxLength={28}
                  placeholder="Ex: Azul Top, Moderada, Fraca..."
                  value={activeTierDraft.customLabel}
                  onChange={(e) => updateActiveTier((c) => ({ ...c, customLabel: e.target.value }))}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  A classificação interna continua <strong>{activeTierDraft.operationalMeaning}</strong> independentemente da cor ou nome.
                </span>
              </div>
              <div>
                <span className="block font-bold mb-1">Modo de Cartão neste Nível</span>
                <SegmentedFilter
                  value={activeTierDraft.layoutMode}
                  onChange={(mode) =>
                    updateActiveTier((c) => ({ ...c, layoutMode: mode as 'compacto' | 'expandido' }))
                  }
                  options={[
                    { id: 'compacto', label: 'Modo Compacto' },
                    { id: 'expandido', label: 'Modo Expandido' },
                  ]}
                />
              </div>
            </div>

            {/* Independent Colors, Brightness (Clarear/Escurecer), Saturation, Opacity, Typography, Dimensions */}
            <div
              data-guide-target="fc-colors"
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  Cores, Brilho, Intensidade, Transparência &amp; Dimensões ({activeTierDraft.customLabel || activeTierDraft.operationalMeaning})
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="fl-bg" className="block font-medium mb-1">
                    Cor de Fundo ({activeTierDraft.bgColor})
                  </label>
                  <input
                    id="fl-bg"
                    type="color"
                    value={activeTierDraft.bgColor}
                    onChange={(e) => {
                      const nextBg = e.target.value;
                      updateActiveTier((cur) => {
                        const upperPrev = cur.textColor.toUpperCase();
                        const bgIsDark = isDarkHexColor(nextBg);
                        let nextText = cur.textColor;
                        if (bgIsDark && (upperPrev === '#0F172A' || upperPrev === '#1E293B' || upperPrev === '#451A03' || upperPrev === '#4C0519')) {
                          nextText = '#FFFFFF';
                        } else if (!bgIsDark && (upperPrev === '#FFFFFF' || upperPrev === '#F8FAFC')) {
                          nextText = '#0F172A';
                        }
                        return { ...cur, bgColor: nextBg, textColor: nextText };
                      });
                    }}
                    className="w-full h-9 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="fl-txt" className="block font-medium mb-1">
                    Cor do Texto ({activeTierDraft.textColor})
                  </label>
                  <input
                    id="fl-txt"
                    type="color"
                    value={activeTierDraft.textColor}
                    onChange={(e) => updateActiveTier((c) => ({ ...c, textColor: e.target.value }))}
                    className="w-full h-9 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="fl-brd" className="block font-medium mb-1">
                    Cor da Borda ({activeTierDraft.borderColor})
                  </label>
                  <input
                    id="fl-brd"
                    type="color"
                    value={activeTierDraft.borderColor}
                    onChange={(e) => updateActiveTier((c) => ({ ...c, borderColor: e.target.value }))}
                    className="w-full h-9 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="fl-bright" className="font-medium">
                      Luminosidade: Escurecer ↔ Clarear ({activeTierDraft.brightnessAdjust > 0 ? `+${activeTierDraft.brightnessAdjust}` : activeTierDraft.brightnessAdjust}%)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateActiveTier((c) => ({
                            ...c,
                            brightnessAdjust: Math.max(-35, (c.brightnessAdjust ?? 0) - 8),
                          }))
                        }
                        className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-[10px] font-semibold cursor-pointer"
                      >
                        Escurecer
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveTier((c) => ({ ...c, brightnessAdjust: 0 }))}
                        className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-[10px] cursor-pointer"
                      >
                        0%
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateActiveTier((c) => ({
                            ...c,
                            brightnessAdjust: Math.min(35, (c.brightnessAdjust ?? 0) + 8),
                          }))
                        }
                        className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-[10px] font-semibold cursor-pointer"
                      >
                        Clarear
                      </button>
                    </div>
                  </div>
                  <input
                    id="fl-bright"
                    type="range"
                    min={-35}
                    max={35}
                    value={activeTierDraft.brightnessAdjust ?? 0}
                    onChange={(e) =>
                      updateActiveTier((c) => ({ ...c, brightnessAdjust: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="fl-sat" className="block font-medium mb-1">
                    Intensidade da Cor ({activeTierDraft.colorIntensityPct ?? 100}%)
                  </label>
                  <input
                    id="fl-sat"
                    type="range"
                    min={25}
                    max={175}
                    value={activeTierDraft.colorIntensityPct ?? 100}
                    onChange={(e) =>
                      updateActiveTier((c) => ({ ...c, colorIntensityPct: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="fl-opac" className="block font-medium mb-1">
                    Transparência / Opacidade ({activeTierDraft.opacityPercent}%)
                  </label>
                  <input
                    id="fl-opac"
                    type="range"
                    min={45}
                    max={100}
                    value={activeTierDraft.opacityPercent}
                    onChange={(e) =>
                      updateActiveTier((c) => ({ ...c, opacityPercent: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="fl-brd-w" className="block font-medium mb-1">
                    Espessura Borda ({activeTierDraft.borderWidthPx}px)
                  </label>
                  <input
                    id="fl-brd-w"
                    type="range"
                    min={1}
                    max={6}
                    value={activeTierDraft.borderWidthPx}
                    onChange={(e) =>
                      updateActiveTier((c) => ({ ...c, borderWidthPx: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="fl-font" className="block font-medium mb-1">Tipografia</label>
                  <select
                    id="fl-font"
                    value={activeTierDraft.fontFamily}
                    onChange={(e) =>
                      updateActiveTier((c) => ({
                        ...c,
                        fontFamily: e.target.value as 'Sans' | 'Display' | 'Mono',
                      }))
                    }
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Sans">Sans (Inter)</option>
                    <option value="Display">Display (Destaque)</option>
                    <option value="Mono">Mono Tabular</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="fl-width" className="block font-medium mb-1">
                    Largura ({activeTierDraft.widthPercent}%)
                  </label>
                  <input
                    id="fl-width"
                    type="range"
                    min={55}
                    max={100}
                    value={activeTierDraft.widthPercent}
                    onChange={(e) =>
                      updateActiveTier((c) => ({ ...c, widthPercent: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="fl-fsize" className="block font-medium mb-1">
                    Tam. Letra ({activeTierDraft.fontSizePx}px)
                  </label>
                  <input
                    id="fl-fsize"
                    type="range"
                    min={11}
                    max={20}
                    value={activeTierDraft.fontSizePx}
                    onChange={(e) =>
                      updateActiveTier((c) => ({ ...c, fontSizePx: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="fl-pad" className="block font-medium mb-1">
                    Dimensão / Espaço ({activeTierDraft.paddingPx}px)
                  </label>
                  <input
                    id="fl-pad"
                    type="range"
                    min={10}
                    max={24}
                    value={activeTierDraft.paddingPx}
                    onChange={(e) =>
                      updateActiveTier((c) => ({ ...c, paddingPx: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* 8 Peripheral Positions + Centro + Safe-Area Margin */}
            <div
              data-guide-target="fc-position"
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="fl-pos" className="font-bold text-slate-900 dark:text-white">
                  Posição &amp; Margens neste Nível ({activeTierDraft.customLabel || activeTierDraft.operationalMeaning})
                </label>
                <span className="font-mono-tabular text-[11px] font-bold text-blue-700 dark:text-blue-400">
                  {normalizedTierPos}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {ALL_POSITIONS.map((posOpt) => {
                  const isSel = normalizedTierPos === posOpt.id;
                  return (
                    <button
                      key={posOpt.id}
                      type="button"
                      title={posOpt.hint}
                      onClick={() => updateActiveTier((c) => ({ ...c, position: posOpt.id }))}
                      className={`px-2 py-2 rounded-lg border text-[11px] font-semibold text-center transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:border-blue-500'
                      }`}
                    >
                      {posOpt.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="fl-pos" className="block font-medium mb-1">Seletor Direto de Posição</label>
                  <select
                    id="fl-pos"
                    value={normalizedTierPos}
                    onChange={(e) =>
                      updateActiveTier((c) => ({ ...c, position: e.target.value as FloatingCardPosition }))
                    }
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {ALL_POSITIONS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="fl-margin" className="block font-medium mb-1">
                    Margem de Segurança ({safeTierMargin}px)
                  </label>
                  <input
                    id="fl-margin"
                    type="range"
                    min={4}
                    max={36}
                    value={safeTierMargin}
                    onChange={(e) =>
                      updateActiveTier((c) => ({ ...c, marginOffsetPx: Number(e.target.value) }))
                    }
                    className="w-full mt-2"
                  />
                </div>
              </div>
            </div>

            {/* 16 Metrics Selection & Explanations (?) */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">
                  Métricas Visíveis neste Nível ({activeTierDraft.visibleMetrics.length}/{ALL_FLOATING_METRICS.length})
                </p>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => updateActiveTier((c) => ({ ...c, visibleMetrics: [...ALL_FLOATING_METRICS] }))}
                    className="text-blue-700 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                  >
                    Selecionar todas
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveTier((c) => ({ ...c, visibleMetrics: [] }))}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pode ativar ou desativar qualquer métrica livremente (clique em <strong>?</strong> para ver fórmula e inputs).
              </p>

              <div className="max-h-[340px] overflow-y-auto space-y-1.5 pr-1">
                {orderedMetrics.map((mKey) => {
                  const isVisible = activeTierDraft.visibleMetrics.includes(mKey);
                  const idx = activeTierDraft.visibleMetrics.indexOf(mKey);
                  const def = FLOATING_METRIC_DEFINITIONS[mKey];
                  const isExplained = explainedMetricKey === mKey;
                  return (
                    <div
                      key={mKey}
                      className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-2 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer font-medium min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => toggleMetric(mKey)}
                          />
                          <span className="truncate">{def.label}</span>
                        </label>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label={`Explicação da métrica ${def.label}`}
                            onClick={() => setExplainedMetricKey((k) => (k === mKey ? null : mKey))}
                            className="p-1 rounded border border-slate-300 dark:border-slate-600 hover:border-blue-500 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            <HelpCircle className="w-3 h-3" />
                          </button>
                          {isVisible && (
                            <>
                              <button
                                type="button"
                                aria-label={`Subir ${def.label}`}
                                disabled={idx === 0}
                                onClick={() => moveMetric(mKey, -1)}
                                className="p-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40 cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Descer ${def.label}`}
                                disabled={idx === activeTierDraft.visibleMetrics.length - 1}
                                onClick={() => moveMetric(mKey, 1)}
                                className="p-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40 cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isExplained && (
                        <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] space-y-0.5">
                          <p className="text-slate-800 dark:text-slate-200">{def.shortExplanation}</p>
                          <p className="text-slate-500 dark:text-slate-400">
                            <strong>Fórmula:</strong> {def.formula}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Independent Atalhos AIVAD Dock Configuration */}
            <div
              data-guide-target="fc-dock-config"
              className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-800/60 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Botão Flutuante &ldquo;Atalhos AIVAD&rdquo; (Independente)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Este botão não altera nenhum dos 3 perfis do Cartão Flutuante de Propostas.
                  </p>
                </div>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={dockDraft.enabled !== false}
                    onChange={(e) => {
                      const next = { ...dockDraft, enabled: e.target.checked };
                      setDockDraft(next);
                      updateFloatingDockConfig({ enabled: e.target.checked });
                    }}
                  />
                  <span>Visível</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dock-pos" className="block font-medium mb-1">Posição do Botão Atalhos</label>
                  <select
                    id="dock-pos"
                    value={dockDraft.position}
                    onChange={(e) => {
                      const pos = e.target.value as FloatingDockConfig['position'];
                      setDockDraft((d) => ({ ...d, position: pos }));
                      updateFloatingDockConfig({ position: pos });
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Inferior direito">Inferior direito</option>
                    <option value="Inferior esquerdo">Inferior esquerdo</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dock-tone" className="block font-medium mb-1">Estilo do Botão Atalhos</label>
                  <select
                    id="dock-tone"
                    value={dockDraft.themeTone}
                    onChange={(e) => {
                      const tone = e.target.value as FloatingDockConfig['themeTone'];
                      setDockDraft((d) => ({ ...d, themeTone: tone }));
                      updateFloatingDockConfig({ themeTone: tone });
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="azul">Azul AIVAD</option>
                    <option value="vermelho">Vermelho AIVAD</option>
                    <option value="indigo">Índigo AI CORE</option>
                    <option value="esmeralda">Esmeralda Operacional</option>
                    <option value="personalizado">Cores Personalizadas</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overlayDraft.autoDismiss ?? true}
                  onChange={(e) => setOverlayDraft((d) => ({ ...d, autoDismiss: e.target.checked }))}
                />
                <span>Fechar automaticamente ({overlayDraft.durationSeconds}s)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overlayDraft.allowManualClose ?? true}
                  onChange={(e) => setOverlayDraft((d) => ({ ...d, allowManualClose: e.target.checked }))}
                />
                <span>Botão de fechar manual (X)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overlayDraft.allowMinimize ?? true}
                  onChange={(e) => setOverlayDraft((d) => ({ ...d, allowMinimize: e.target.checked }))}
                />
                <span>Permitir minimizar cartão</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(overlayDraft.largeTouchTargets)}
                  onChange={(e) => setOverlayDraft((d) => ({ ...d, largeTouchTargets: e.target.checked }))}
                />
                <span>Botões Grandes p/ Condução</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                data-guide-target="fc-preview-btn"
                onClick={() => {
                  setPreviewModalOpen(true);
                  markFloatingPreviewOpened();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Demonstrar (Palco Contextual)
              </button>
              <button
                type="button"
                data-guide-target="fc-save-btn"
                onClick={() => {
                  updateOverlayConfig(overlayDraft, { markSaved: true });
                  setOverlaySavedBanner(
                    `Os 3 perfis independentes foram guardados (${activeTierDraft.customLabel}: ${activeTierDraft.bgColor} · ${normalizedTierPos}).`
                  );
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Guardar Alterações
              </button>
              <button
                type="button"
                onClick={() => {
                  setOverlayDraft(state.overlayConfig);
                  setOverlaySavedBanner('Rascunho cancelado — revertido para a última configuração guardada.');
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-medium cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </Card>

          {/* Isolated Live Simulator Column */}
          <Card className="lg:col-span-6 p-5 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Monitor className="w-4 h-4 text-rose-600" />
                Pré-visualização &amp; Posição Real no Ecrã
              </h2>
              <button
                type="button"
                onClick={() => {
                  setPreviewModalOpen(true);
                  markFloatingPreviewOpened();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Demonstrar
              </button>
            </div>

            {renderDeviceStage(false)}

            {sandboxActionFeedback && <StatusLabel tone="info" text={sandboxActionFeedback} />}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
              <strong>Garantia de Isolamento:</strong> Testar cenários neste palco não adiciona propostas nem altera estatísticas reais. As 3 classificações guardam estilos, opacidade, luminosidade, posição e métricas totalmente independentes.
            </div>
          </Card>
        </div>

        {/* Anonymized Realistic Uber & Bolt Proposal Learning Gallery */}
        <Card className="p-5 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Galeria de Aprendizagem Uber &amp; Bolt (Boa · Razoável · Má)
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                  Reprodução visual de demonstração · Dados pessoais anonimizados
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Exemplos realistas estruturados para compreender como recolha, retorno vazio, comissão e tempo definem a classificação — nunca apenas o valor bruto.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedFilter
                value={galleryFilterPlatform}
                onChange={(v) => setGalleryFilterPlatform(v as typeof galleryFilterPlatform)}
                options={[
                  { id: 'ALL', label: 'Uber + Bolt' },
                  { id: 'uber', label: 'Uber' },
                  { id: 'bolt', label: 'Bolt' },
                ]}
              />
              <SegmentedFilter
                value={galleryFilterQuality}
                onChange={(v) => setGalleryFilterQuality(v as typeof galleryFilterQuality)}
                options={[
                  { id: 'ALL', label: 'Todas' },
                  { id: 'Boa', label: 'Boas' },
                  { id: 'Razoável', label: 'Razoáveis' },
                  { id: 'Má', label: 'Más' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredGallery.map((ex) => {
              const exPkg = analyzeProposalWithAiCore({
                input: ex.input,
                autoPilot: state.autoPilot,
                activeVehicle,
                tachograph: state.tachograph,
                zones: state.zones,
                savedPlaces: state.savedPlaces,
                routine: state.routinePreferences,
              });
              const exTier =
                baseProfiles[exPkg.analysis.classification] ??
                resolveFloatingTierConfig(overlayDraft, exPkg.analysis.classification);
              const badgeTone =
                ex.qualityTier === 'Boa'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : ex.qualityTier === 'Razoável'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';

              const metricKeys: FloatingMetricKey[] = [
                'eurPerKm',
                'eurPerHour',
                'eurPerMin',
                'pickupDistanceKm',
                'pickupTimeMin',
                'tripDistanceKm',
                'tripTimeMin',
                'totalDistanceKm',
                'totalTime',
                'grossValueEur',
                'commissionEur',
                'operatingCostEur',
                'estimatedNet',
                'emptyReturnRisk',
              ];

              return (
                <div
                  key={ex.id}
                  data-testid={`gallery-example-${ex.id}`}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <PlatformLogo platformId={ex.platformId} name={ex.platformId} size={28} />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{ex.title}</p>
                          <p className="text-[10px] text-slate-500">{ex.anonymizedPassengerAlias}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${badgeTone}`}>
                        {ex.qualityTier} · {exTier.customLabel}
                      </span>
                    </div>

                    <div className="text-[11px] bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-0.5">
                      <p className="truncate">
                        <strong>Recolha:</strong> {ex.anonymizedPickupLabel}
                      </p>
                      <p className="truncate">
                        <strong>Destino:</strong> {ex.anonymizedDestinationLabel}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {metricKeys.map((mk) => {
                        const cell = evaluateFloatingMetricCell(
                          mk,
                          ex.input,
                          exPkg.analysis,
                          activeMarket.currencySymbol
                        );
                        return (
                          <div
                            key={mk}
                            className="flex items-center justify-between gap-1 px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800"
                          >
                            <span className="text-slate-500 truncate">{cell.label}</span>
                            <span className="font-mono-tabular font-bold shrink-0">{cell.value}</span>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      {ex.decisionExplanation}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveGalleryExampleId(ex.id);
                        setEditingTier(exPkg.analysis.classification);
                        setSandboxPreset(exPkg.analysis.classification);
                        setPreviewModalOpen(true);
                        markFloatingPreviewOpened();
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Demonstrar no Cartão
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalcInput(ex.input);
                        setDriverNav('calculadora');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-blue-600 font-semibold cursor-pointer"
                    >
                      Carregar na Calculadora
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Dedicated Contextual "Demonstrar" Multi-Device Modal (PEGGA-style Full Stage) */}
        {previewModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Demonstrar Cartão Flutuante em Palco Contextual"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-5 overflow-y-auto"
          >
            <Card className="w-full max-w-6xl p-4 sm:p-6 space-y-4 text-xs shadow-2xl max-h-[95vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    Demonstração Contextual Multi-Dispositivo · Posicionamento &amp; Cores Independentes
                  </p>
                  <h3 className="text-base sm:text-lg font-display font-extrabold">
                    Demonstrar Cartão Flutuante ({stageActiveTier.customLabel} · {stageNormalizedPos})
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Fechar pré-visualização"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {renderDeviceStage(true)}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const defaults = createDefaultClassificationProfiles();
                    const nextOv = { ...SEED_OVERLAY_CONFIG, classificationProfiles: defaults };
                    setOverlayDraft(nextOv);
                    resetFloatingTierConfigs();
                    setOverlaySavedBanner('Padrão de fábrica reposto para os 3 perfis.');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Repor Padrão
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOverlayDraft(state.overlayConfig);
                      setPreviewModalOpen(false);
                      setOverlaySavedBanner('Alterações de rascunho canceladas.');
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    Cancelar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateOverlayConfig(overlayDraft, { markSaved: true });
                      setPreviewModalOpen(false);
                      setOverlaySavedBanner(
                        `Configuração guardada para os 3 perfis (${stageActiveTier.customLabel} em ${stageNormalizedPos})!`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> Guardar Alterações
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================
  // CALCULADORA & ANALISADOR AI CORE
  // ==========================================================
  if (resolvedTab === 'calculadora') {
    const tierProfiles =
      state.overlayConfig.classificationProfiles ?? createDefaultClassificationProfiles();
    const activeCalcTier = tierProfiles[liveAnalysis.classification];
    const classBadge =
      liveAnalysis.classification === 'verde'
        ? { tone: 'success' as const, label: `${activeCalcTier.customLabel} — Favorável` }
        : liveAnalysis.classification === 'amarelo'
        ? { tone: 'warning' as const, label: `${activeCalcTier.customLabel} — Atenção` }
        : { tone: 'danger' as const, label: `${activeCalcTier.customLabel} — Evitar` };

    const handleSaveProposal = (e: React.FormEvent) => {
      e.preventDefault();
      if (calcInput.grossValueEur <= 0 || calcInput.tripDistanceKm <= 0 || calcInput.tripTimeMin <= 0) {
        setCalcError('Introduza valores positivos para valor bruto, distância da viagem e duração.');
        return;
      }
      setCalcError(null);
      const created = createAndAnalyzeProposal(calcInput, 'Manual');
      setLastCreatedPropId(created.record.id);
      setLastSavedAiPackage(created.aiPackage);
    };

    const displayedPackage = lastSavedAiPackage ?? liveAiPackage;
    const isMissingPickupSim = Boolean(calcInput.unavailableFields?.includes('pickupDistanceKm'));

    return (
      <div className="space-y-6">
        {renderCorridasRibbon()}
        {renderActiveTripLifecyclePanel()}
        {lifecycleError && <StatusLabel tone="danger" text={lifecycleError} />}
        <ContextualHelpBanner
          title="AIVAD Real-Time Offer Analyzer & Decisão Contextual AI CORE"
          description="Avalie rentabilidade líquida em €/km, €/hora e €/minuto com comissão da plataforma, alertas de zona ativos e exemplos anonimizados Uber/Bolt."
        />

        {/* Quick Load from Anonymized Examples */}
        <Card className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              Carregar Exemplo (Demo Anonimizado):
            </span>
            {PROPOSAL_GALLERY_EXAMPLES.slice(0, 5).map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setCalcInput(ex.input)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 bg-white dark:bg-slate-900 font-medium cursor-pointer"
              >
                {ex.platformId.toUpperCase()} · {ex.qualityTier} ({activeMarket.currencySymbol}
                {ex.input.grossValueEur.toFixed(2)})
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 text-[11px] font-medium cursor-pointer text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isMissingPickupSim}
              onChange={(e) =>
                setCalcInput((p) => ({
                  ...p,
                  unavailableFields: e.target.checked ? ['pickupDistanceKm'] : [],
                }))
              }
            />
            <span>Simular distância recolha indisponível</span>
          </label>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card data-guide-target="proposal-calculator" className="lg:col-span-7 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Dados da Proposta ({activeMarket.currency})
              </h2>
              <SegmentedFilter
                value={calcInput.mode}
                onChange={(m) => setCalcInput((p) => ({ ...p, mode: m as AnalysisMode }))}
                options={[
                  { id: 'Equilibrado', label: 'Equilibrado' },
                  { id: 'Prioridade €/hora', label: '€/hora' },
                  { id: 'Prioridade €/km', label: '€/km' },
                  { id: 'Personalizado', label: 'Personalizado' },
                ]}
              />
            </div>

            {calcError && <StatusLabel tone="danger" text={calcError} />}

            <form onSubmit={handleSaveProposal} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label htmlFor="prop-plat" className="block font-medium mb-1">Plataforma</label>
                <select
                  id="prop-plat"
                  value={calcInput.platformId}
                  onChange={(e) => {
                    const pl = visibleDriverPlatforms.find((p) => p.id === e.target.value);
                    setCalcInput((prev) => ({
                      ...prev,
                      platformId: e.target.value,
                      category: pl?.categories[0] ?? 'Standard',
                      commissionPct: pl?.commissionPct ?? prev.commissionPct ?? 25,
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {visibleDriverPlatforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="prop-cat" className="block font-medium mb-1">Categoria</label>
                <input
                  id="prop-cat"
                  type="text"
                  value={calcInput.category}
                  onChange={(e) => setCalcInput((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="prop-val" className="block font-medium mb-1">
                  Valor Bruto ({activeMarket.currencySymbol})
                </label>
                <input
                  id="prop-val"
                  type="number"
                  step="0.1"
                  value={calcInput.grossValueEur}
                  onChange={(e) => setCalcInput((p) => ({ ...p, grossValueEur: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>

              <div>
                <label htmlFor="prop-pdist" className="block font-medium mb-1">Dist. Recolha (km)</label>
                <input
                  id="prop-pdist"
                  type="number"
                  step="0.1"
                  value={calcInput.pickupDistanceKm}
                  onChange={(e) => setCalcInput((p) => ({ ...p, pickupDistanceKm: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="prop-ptime" className="block font-medium mb-1">Tempo Recolha (min)</label>
                <input
                  id="prop-ptime"
                  type="number"
                  value={calcInput.pickupTimeMin}
                  onChange={(e) => setCalcInput((p) => ({ ...p, pickupTimeMin: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="prop-tdist" className="block font-medium mb-1">Dist. Destino (km)</label>
                <input
                  id="prop-tdist"
                  type="number"
                  step="0.1"
                  value={calcInput.tripDistanceKm}
                  onChange={(e) => setCalcInput((p) => ({ ...p, tripDistanceKm: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>

              <div>
                <label htmlFor="prop-ttime" className="block font-medium mb-1">Tempo Destino (min)</label>
                <input
                  id="prop-ttime"
                  type="number"
                  value={calcInput.tripTimeMin}
                  onChange={(e) => setCalcInput((p) => ({ ...p, tripTimeMin: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="prop-bonus" className="block font-medium mb-1">
                  Bónus ({activeMarket.currencySymbol})
                </label>
                <input
                  id="prop-bonus"
                  type="number"
                  step="0.1"
                  value={calcInput.bonusEur}
                  onChange={(e) => setCalcInput((p) => ({ ...p, bonusEur: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="prop-comm" className="block font-medium mb-1">
                  Comissão Plataforma (%)
                </label>
                <input
                  id="prop-comm"
                  type="number"
                  min={0}
                  max={60}
                  step="0.5"
                  value={calcInput.commissionPct ?? 25}
                  onChange={(e) => setCalcInput((p) => ({ ...p, commissionPct: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>

              <div>
                <label htmlFor="prop-pickup-addr" className="block font-medium mb-1">Morada Recolha (opcional)</label>
                <input
                  id="prop-pickup-addr"
                  type="text"
                  placeholder="Ex: Av. da Liberdade 180, Lisboa"
                  value={calcInput.pickupAddress ?? ''}
                  onChange={(e) => setCalcInput((p) => ({ ...p, pickupAddress: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="prop-dest-addr" className="block font-medium mb-1">Morada Destino (opcional)</label>
                <input
                  id="prop-dest-addr"
                  type="text"
                  placeholder="Ex: Aeroporto Terminal 1, Lisboa"
                  value={calcInput.destinationAddress ?? ''}
                  onChange={(e) => setCalcInput((p) => ({ ...p, destinationAddress: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="prop-basis" className="block font-medium mb-1">Base de Cálculo</label>
                <select
                  id="prop-basis"
                  value={calcInput.calculationBasis}
                  onChange={(e) =>
                    setCalcInput((p) => ({
                      ...p,
                      calculationBasis: e.target.value as ProposalInput['calculationBasis'],
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="total_distance">Distância Total (Recolha + Viagem)</option>
                  <option value="trip_distance_only">Apenas Distância Passageiro</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
                >
                  Registar &amp; Analisar com AI CORE
                </button>
                {lastCreatedPropId && (
                  <button
                    type="button"
                    onClick={() => updateProposalLifecycle(lastCreatedPropId, 'Concluída')}
                    className="px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Marcar Última como Concluída (Gerar Viagem + Reconciliar IA)
                  </button>
                )}
              </div>
            </form>

            {/* AI CORE Live Alternative Comparison */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                  <Sparkles className="w-4 h-4" />
                  Alternativas Comparadas pelo AI CORE (
                  {displayedPackage.confidencePct !== null
                    ? `${displayedPackage.confidencePct}% confiança`
                    : displayedPackage.confidenceStatus}
                  )
                </span>
                <EpistemicTagBadge tag={displayedPackage.epistemicTag} />
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                {displayedPackage.trafficHonestyNote}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {displayedPackage.alternatives.map((alt) => (
                  <div
                    key={alt.action}
                    className={`p-3 rounded-lg border ${
                      alt.action === displayedPackage.recommendedAction
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{alt.action}</span>
                      <span className="font-mono-tabular font-semibold">{alt.expectedScore}/100</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{alt.rationale}</p>
                    <div className="mt-1.5">
                      <EpistemicTagBadge tag={alt.epistemicTag} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Resultado Analítico</h2>
                <StatusLabel tone={classBadge.tone} text={classBadge.label} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                  <span className="text-[11px] text-slate-500">Por distância</span>
                  <p className="text-base font-bold font-mono-tabular">
                    {formatDistanceRate(liveAnalysis.eurPerKm, activeMarket.currency, activeMarket.unitSystem)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                  <span className="text-[11px] text-slate-500">Por hora</span>
                  <p className="text-base font-bold font-mono-tabular">
                    {formatMoney(liveAnalysis.eurPerHour, activeMarket.currency)}/h
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                  <span className="text-[11px] text-slate-500">Por minuto</span>
                  <p className="text-base font-bold font-mono-tabular">
                    {formatMoney(liveAnalysis.eurPerMin, activeMarket.currency)}/m
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Distância Total Comprometida</span>
                  <span className="font-mono-tabular font-semibold">
                    {formatDistance(liveAnalysis.totalDistanceKm, activeMarket.unitSystem)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tempo Total Comprometido</span>
                  <span className="font-mono-tabular font-semibold">{liveAnalysis.totalTimeMin} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Comissão Plataforma ({liveAnalysis.commissionPctApplied ?? calcInput.commissionPct ?? 25}%)
                  </span>
                  <span className="font-mono-tabular font-semibold">
                    {liveAnalysis.commissionEur !== undefined
                      ? formatMoney(liveAnalysis.commissionEur, activeMarket.currency)
                      : 'Indisponível'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Custo Operacional Estimado</span>
                  <span className="font-mono-tabular font-semibold">
                    {formatMoney(liveAnalysis.operatingCostEur, activeMarket.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Líquido Estimado (após comissão e custos)</span>
                  <span className="font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                    {formatMoney(liveAnalysis.estimatedNetEur, activeMarket.currency)}
                    {liveAnalysis.profitabilityPct !== undefined
                      ? ` (${liveAnalysis.profitabilityPct.toFixed(0)}%)`
                      : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Risco de Retorno Vazio</span>
                  <span className="font-semibold">{liveAnalysis.emptyReturnRisk}</span>
                </div>
              </div>

              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                {liveAnalysis.reasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </Card>

            {/* Live Dynamic Floating Card Preview */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <h3 className="font-bold">Cartão Flutuante Dinâmico (Ao Vivo)</h3>
                <button
                  type="button"
                  onClick={() => setDriverNav('cartoes-flutuantes')}
                  className="text-blue-700 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Personalizar →
                </button>
              </div>
              <DynamicFloatingProposalCard
                overlayConfig={state.overlayConfig}
                proposalInput={calcInput}
                analysis={liveAnalysis}
                recommendedAction={displayedPackage.recommendedAction}
                confidencePct={displayedPackage.confidencePct}
                confidenceStatus={displayedPackage.confidenceStatus}
                zoneAlerts={calcZoneAlerts}
                currencySymbol={activeMarket.currencySymbol}
                quickHidden={state.floatingCardQuickHidden}
                onToggleQuickHidden={setFloatingCardQuickHidden}
                onAccept={() => {
                  const created = createAndAnalyzeProposal(calcInput, 'Manual');
                  setLastCreatedPropId(created.record.id);
                  setLastSavedAiPackage(created.aiPackage);
                  const mappedAiRec =
                    created.aiPackage.recommendedAction === 'Aceitar corrida atual'
                      ? 'Aceitar'
                      : created.aiPackage.recommendedAction === 'Esperar próxima oferta'
                      ? 'Recusar'
                      : 'Aguardar';
                  const startRes = acceptProposalForTrip(created.record, mappedAiRec);
                  if (!startRes.ok) {
                    setLifecycleError(startRes.error ?? 'Não foi possível iniciar viagem ativa.');
                  } else {
                    setLifecycleError(null);
                  }
                }}
              />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PROPOSTAS EM TEMPO REAL
  // ==========================================================
  if (resolvedTab === 'propostas-tempo-real') {
    const states: ProposalLifecycleState[] = [
      'Capturada',
      'Analisada',
      'Apresentada',
      'Aceite pelo motorista',
      'Confirmada pela plataforma',
      'Iniciada',
      'Concluída',
      'Recusada',
      'Expirada',
      'Cancelada',
    ];

    return (
      <div className="space-y-6">
        {renderCorridasRibbon()}
        {renderActiveTripLifecyclePanel()}
        {lifecycleError && <StatusLabel tone="danger" text={lifecycleError} />}
        <ContextualHelpBanner
          title="Propostas em Tempo Real & Ciclo de Vida Separado"
          description="A recomendação da IA, a aceitação do motorista e a confirmação efetiva pela plataforma são estados distintos. Aceitar inicia o acompanhamento sem iniciar a espera antes da chegada."
          demoNotice="INTEGRAÇÃO A VALIDAR para captura automática"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              createAndAnalyzeProposal(
                {
                  platformId: visibleDriverPlatforms[0]?.id ?? 'uber',
                  category: visibleDriverPlatforms[0]?.categories[0] ?? 'Uber Comfort',
                  grossValueEur: 18.2,
                  pickupDistanceKm: 1.8,
                  pickupTimeMin: 5,
                  tripDistanceKm: 12.1,
                  tripTimeMin: 21,
                  stops: 0,
                  tollsEur: 0,
                  bonusEur: 2.0,
                  region: `${state.localization.currentLocation.city} → Aeroporto`,
                  vehicleCostPerKmEur: 0.12,
                  calculationBasis: 'total_distance',
                  mode: 'Equilibrado',
                },
                'Captura Simulada'
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Registar Nova Proposta Realista</span>
          </button>
        </div>

        <div className="space-y-4">
          {state.proposals.map((prop) => (
            <Card key={prop.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PlatformBadge
                    platformId={prop.input.platformId}
                    name={prop.input.platformId}
                    size="sm"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <span>{prop.input.platformId.toUpperCase()} · {prop.input.category}</span>
                      <span className="text-xs font-normal text-slate-500">({prop.source})</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {prop.input.region} · {formatDistance(prop.analysis.totalDistanceKm, activeMarket.unitSystem)} · {prop.analysis.totalTimeMin} min
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 font-mono-tabular text-xs">
                  <span>{formatMoney(prop.analysis.effectiveRevenueEur, activeMarket.currency)}</span>
                  <span>{formatDistanceRate(prop.analysis.eurPerKm, activeMarket.currency, activeMarket.unitSystem)}</span>
                  <span>{formatMoney(prop.analysis.eurPerHour, activeMarket.currency)}/h</span>
                  <StatusLabel
                    tone={
                      prop.analysis.classification === 'verde'
                        ? 'success'
                        : prop.analysis.classification === 'amarelo'
                        ? 'warning'
                        : 'danger'
                    }
                    text={prop.lifecycleState}
                  />
                </div>
              </div>

              {prop.autoPilotDecision && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>AutoPilot ({prop.autoPilotDecision.modeAtDecision}):</strong>{' '}
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {prop.autoPilotDecision.action}
                    </span>{' '}
                    — {prop.autoPilotDecision.reason}
                    {prop.autoPilotDecision.driverOverride && prop.autoPilotDecision.driverOverride !== 'Mantido' && (
                      <span className="block text-[11px] text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                        Override Manual do Motorista: {prop.autoPilotDecision.driverOverride} ({prop.autoPilotDecision.overrideReason})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        overrideProposalAutoPilotDecision(
                          prop.id,
                          'Aceite manualmente',
                          'Decisão soberana do motorista no terreno'
                        )
                      }
                      className="px-2 py-1 rounded border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      Override: Aceitar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        overrideProposalAutoPilotDecision(
                          prop.id,
                          'Recusado manualmente',
                          'Recusa manual prioritária do motorista'
                        )
                      }
                      className="px-2 py-1 rounded border border-red-300 dark:border-red-800 text-[11px] font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      Override: Recusar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 mr-1">Transição de estado:</span>
                  {states.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateProposalLifecycle(prop.id, st)}
                      className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                        prop.lifecycleState === st
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                {prop.lifecycleState === 'Apresentada' && (
                  <button
                    type="button"
                    onClick={() => {
                      const mappedRec =
                        prop.autoPilotDecision?.action.includes('Aceitar')
                          ? 'Aceitar'
                          : prop.autoPilotDecision?.action.includes('Recusar')
                          ? 'Recusar'
                          : 'Aguardar';
                      const res = acceptProposalForTrip(prop, mappedRec);
                      if (!res.ok) setLifecycleError(res.error ?? 'Erro ao aceitar proposta.');
                      else setLifecycleError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold shrink-0"
                  >
                    Aceitar e Acompanhar Viagem
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (resolvedTab === 'autopilot') {
    const ap = state.autoPilot;
    const normalizedMode = ap.mode === 'Assistido' ? 'Semiautomático' : ap.mode;
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="AIVAD AutoPilot — Arquitetura Unificada (Manual, Semiautomático, Automático)"
          description="Suporta execução automática imediata quando existe canal oficial ou bridge autorizado ativo, e decisão assistida transparente quando não existe."
        />

        <Card className="p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Modo de Operação AutoPilot
            </h2>
            <SegmentedFilter
              value={normalizedMode}
              onChange={(m) => updateAutoPilotConfig({ mode: m as AutoPilotMode, strategyMode: m as 'Manual' | 'Semiautomático' | 'Automático' })}
              options={[
                { id: 'Manual', label: '1. Manual' },
                { id: 'Semiautomático', label: '2. Semiautomático' },
                { id: 'Automático', label: '3. Automático' },
              ]}
            />
          </div>

          {normalizedMode === 'Automático' && !ap.officialAutomationAuthorized && (
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  Canal de Execução Externa Desativado — Modo de Decisão Assistida Ativo
                </p>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                  Sem canal oficial/bridge autorizado ativo, o modo Automático calcula a decisão final e prepara a ação assistida sem simular cliques ocultos.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label htmlFor="ap-min-val" className="block font-medium mb-1">
                Valor Mínimo ({activeMarket.currencySymbol})
              </label>
              <input
                id="ap-min-val"
                type="number"
                step="0.5"
                value={ap.thresholds.minValueEur}
                onChange={(e) =>
                  updateAutoPilotConfig({
                    thresholds: { ...ap.thresholds, minValueEur: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="ap-min-km" className="block font-medium mb-1">
                Mínimo ({activeMarket.currencySymbol}/km)
              </label>
              <input
                id="ap-min-km"
                type="number"
                step="0.05"
                value={ap.thresholds.minEurPerKm}
                onChange={(e) =>
                  updateAutoPilotConfig({
                    thresholds: { ...ap.thresholds, minEurPerKm: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="ap-min-hr" className="block font-medium mb-1">
                Mínimo ({activeMarket.currencySymbol}/hora)
              </label>
              <input
                id="ap-min-hr"
                type="number"
                step="1"
                value={ap.thresholds.minEurPerHour}
                onChange={(e) =>
                  updateAutoPilotConfig({
                    thresholds: { ...ap.thresholds, minEurPerHour: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ap.prioritizeCampaigns}
                onChange={(e) => updateAutoPilotConfig({ prioritizeCampaigns: e.target.checked })}
              />
              <span>Priorizar campanhas ativas na decisão</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ap.includeBonusInThreshold}
                onChange={(e) => updateAutoPilotConfig({ includeBonusInThreshold: e.target.checked })}
              />
              <span>Incluir bónus na avaliação de limiar</span>
            </label>
          </div>
        </Card>
      </div>
    );
  }

  // SMART DATA CAPTURE
  const pendingCaptures = state.captures.filter((c) => c.status === 'Pendente');

  return (
    <div className="space-y-6">
      {renderCorridasRibbon()}
      <ContextualHelpBanner
        title="AIVAD Smart Data Capture — Captura Idempotente & Reconciliação"
        description="Associa gorjetas tardias à viagem original sem duplicar, regista campanhas e bloqueia repetições com base na chave idempotente."
      />

      <Card className="p-5 space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          Capturar / Reconciliar Evento Externo
        </h2>

        {capFeedback && <StatusLabel tone={capFeedback.tone} text={capFeedback.message} />}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const res = captureExternalEvent(capForm);
            setCapFeedback({
              message: res.message,
              tone: res.isDuplicate ? 'danger' : res.status === 'Pendente' ? 'warning' : 'success',
            });
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
        >
          <div>
            <label htmlFor="cap-tx" className="block font-medium mb-1">ID Externo (Chave Dedup)</label>
            <input
              id="cap-tx"
              type="text"
              value={capForm.externalTxId}
              onChange={(e) => setCapForm((f) => ({ ...f, externalTxId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <div>
            <label htmlFor="cap-type" className="block font-medium mb-1">Tipo de Dado</label>
            <select
              id="cap-type"
              value={capForm.dataType}
              onChange={(e) =>
                setCapForm((f) => ({
                  ...f,
                  dataType: e.target.value as SmartCaptureRecord['dataType'],
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Gorjeta">Gorjeta</option>
              <option value="Campanha">Campanha</option>
              <option value="Viagem">Viagem</option>
              <option value="Ganho">Ganho</option>
              <option value="Bónus">Bónus</option>
              <option value="Pagamento">Pagamento</option>
            </select>
          </div>
          <div>
            <label htmlFor="cap-plat" className="block font-medium mb-1">Plataforma</label>
            <select
              id="cap-plat"
              value={capForm.platformId}
              onChange={(e) => setCapForm((f) => ({ ...f, platformId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {visibleDriverPlatforms.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cap-amt" className="block font-medium mb-1">
              Valor ({activeMarket.currencySymbol})
            </label>
            <input
              id="cap-amt"
              type="number"
              step="0.1"
              value={capForm.amountEur}
              onChange={(e) => setCapForm((f) => ({ ...f, amountEur: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <div>
            <label htmlFor="cap-ref" className="block font-medium mb-1">Ref. Viagem Associada</label>
            <input
              id="cap-ref"
              type="text"
              value={capForm.relatedTripRef}
              onChange={(e) => setCapForm((f) => ({ ...f, relatedTripRef: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <div>
            <label htmlFor="cap-src" className="block font-medium mb-1">Origem</label>
            <select
              id="cap-src"
              value={capForm.source}
              onChange={(e) => setCapForm((f) => ({ ...f, source: e.target.value as CaptureSource }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Notificação Android Autorizada">Notificação Android Autorizada</option>
              <option value="Extrato Importado">Extrato Importado</option>
              <option value="Relatório CSV/PDF">Relatório CSV/PDF</option>
              <option value="OCR">OCR</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
          <div className="sm:col-span-3 flex flex-wrap gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
            >
              Processar Evento no Smart Capture
            </button>
          </div>
        </form>
      </Card>

      {pendingCaptures.length > 0 && (
        <Card className="p-5 space-y-3 border-amber-300 dark:border-amber-800">
          <h3 className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Radio className="w-4 h-4" />
            Registos Pendentes de Confirmação Manual ({pendingCaptures.length})
          </h3>
          {pendingCaptures.map((pc) => (
            <div
              key={pc.id}
              className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <p className="font-semibold">{pc.rawSummary}</p>
                <p className="text-slate-500">
                  ID {pc.externalTxId} · {formatMoney(pc.amountEur, activeMarket.currency)} · {pc.platformId.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Escolher viagem para associar"
                  value={pendingMatchTripId}
                  onChange={(e) => setPendingMatchTripId(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {state.trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.externalRef} ({formatMoney(t.grossEur, t.currency ?? 'EUR')})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => confirmPendingCapture(pc.id, pendingMatchTripId)}
                  className="px-3 py-1.5 rounded bg-blue-700 text-white font-semibold whitespace-nowrap"
                >
                  Associar
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Parser Inteligente OCR / Notificação / CSV / JSON (Comando 6 §3) */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Importação &amp; Normalização Inteligente (Texto OCR / Notificação, CSV ou JSON)
            </h3>
            <p className="text-xs text-slate-500">
              Extrai plataforma, valor, distâncias, zonas, bónus e atribui nível de confiança (0–100%) com deduplicação idempotente.
            </p>
          </div>
          <SegmentedFilter
            value={batchFormat}
            onChange={(v) => {
              const fmt = v as 'ocr_or_notification' | 'csv' | 'json';
              setBatchFormat(fmt);
              if (fmt === 'csv') {
                setBatchRawInput(
                  'externalTxId,platform,type,amountEur,tripKm,durationMin,destinationZone\nCSV-UB-901,uber,Viagem,16.40,11.2,21,Parque das Nações'
                );
              } else if (fmt === 'json') {
                setBatchRawInput(
                  JSON.stringify(
                    [
                      {
                        id: 'JSON-BLT-402',
                        platformId: 'bolt',
                        dataType: 'Viagem',
                        grossEur: 12.8,
                        tripDistanceKm: 8.4,
                        durationMin: 17,
                        destinationZone: 'Baixa / Chiado',
                      },
                    ],
                    null,
                    2
                  )
                );
              } else {
                setBatchRawInput(
                  'Uber Green • €14,60 (+€1,40 bónus) • Recolha 1,5 km (4 min) • Viagem 9,2 km (16 min) • Destino Aeroporto'
                );
              }
            }}
            options={[
              { id: 'ocr_or_notification', label: 'OCR / Notificação' },
              { id: 'csv', label: 'Extrato CSV' },
              { id: 'json', label: 'JSON Oficial' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-3">
            <label htmlFor="batch-raw-input" className="block font-medium mb-1">
              Conteúdo a interpretar e normalizar
            </label>
            <textarea
              id="batch-raw-input"
              rows={3}
              value={batchRawInput}
              onChange={(e) => setBatchRawInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular text-xs"
            />
          </div>
          <div className="space-y-2 flex flex-col justify-between">
            <div>
              <label htmlFor="batch-plat" className="block font-medium mb-1">
                Plataforma predefinida
              </label>
              <select
                id="batch-plat"
                value={batchPlatformId}
                onChange={(e) => setBatchPlatformId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {visibleDriverPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                const res = parseAndImportSmartCaptures({
                  rawInput: batchRawInput,
                  format: batchFormat,
                  defaultPlatformId: batchPlatformId,
                  source:
                    batchFormat === 'ocr_or_notification'
                      ? 'OCR'
                      : batchFormat === 'csv'
                      ? 'Relatório CSV/PDF'
                      : 'Extrato Importado',
                });
                setCapFeedback({
                  message: res.message,
                  tone: res.importedCount > 0 ? 'success' : 'warning',
                });
              }}
              className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              Normalizar e Importar
            </button>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Histórico de Capturas, Confiança &amp; Correções Auditáveis ({state.captures.length})
          </h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">ID / Chave</th>
              <th className="p-3">Origem</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Confiança</th>
              <th className="p-3">Resumo / Correções</th>
              <th className="p-3">Estado &amp; Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {state.captures.map((cap) => (
              <tr key={cap.id}>
                <td className="p-3 font-mono-tabular">{cap.externalTxId}</td>
                <td className="p-3">
                  <span className="block">{cap.source}</span>
                  <span className="text-[10px] text-slate-400">
                    {cap.isDemo ? 'Dados simulados' : 'Dados importados/reais'}
                  </span>
                </td>
                <td className="p-3">{cap.dataType}</td>
                <td className="p-3 font-mono-tabular font-bold">
                  {formatMoney(cap.amountEur, activeMarket.currency)}
                </td>
                <td className="p-3 font-mono-tabular">
                  {cap.confidencePct !== undefined ? `${cap.confidencePct}%` : '95%'}
                </td>
                <td className="p-3 max-w-xs">
                  <p>{cap.rawSummary}</p>
                  {cap.corrections && cap.corrections.length > 0 && (
                    <p className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold mt-0.5">
                      Corrigido manualmente ({cap.corrections.length}x): último motivo &ldquo;
                      {cap.corrections[cap.corrections.length - 1].reason}&rdquo;
                    </p>
                  )}
                  {editingCaptureId === cap.id && (
                    <div className="mt-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          value={correctionAmount}
                          onChange={(e) => setCorrectionAmount(Number(e.target.value))}
                          aria-label="Novo valor corrigido"
                          className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                        />
                        <input
                          type="text"
                          value={correctionReason}
                          onChange={(e) => setCorrectionReason(e.target.value)}
                          aria-label="Motivo da correção manual"
                          placeholder="Motivo da correção"
                          className="flex-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const r = correctSmartCaptureRecord(
                              cap.id,
                              { amountEur: correctionAmount },
                              correctionReason
                            );
                            if (r.ok) {
                              setEditingCaptureId(null);
                              setCapFeedback({
                                message: `Registo ${cap.externalTxId} corrigido com histórico auditável.`,
                                tone: 'success',
                              });
                            } else {
                              setCapFeedback({ message: r.error ?? 'Erro na correção.', tone: 'danger' });
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-blue-700 text-white font-semibold text-[11px]"
                        >
                          Guardar Correção
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCaptureId(null)}
                          className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </td>
                <td className="p-3 space-y-1">
                  <StatusLabel
                    tone={
                      cap.status === 'Associado' || cap.status === 'Confirmado' || cap.status === 'Corrigido'
                        ? 'success'
                        : cap.status === 'Pendente'
                        ? 'warning'
                        : cap.status === 'Rejeitado'
                        ? 'danger'
                        : 'info'
                    }
                    text={cap.status}
                  />
                  {editingCaptureId !== cap.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCaptureId(cap.id);
                        setCorrectionAmount(cap.amountEur);
                      }}
                      className="block text-[11px] text-blue-700 dark:text-blue-400 hover:underline font-medium"
                    >
                      Corrigir valor
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
