import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CalendarClock,
  CheckCircle2,
  Compass,
  Copy,
  ExternalLink,
  History,
  Layers,
  MapPin,
  Navigation,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sparkles,
  Star,
  Target,
  Trash2,
} from 'lucide-react';
import { calculateSmartPlan, isCompletedTripStatus, round2 } from '../../../core/intelligence';
import {
  daysFromNowIso,
  formatDistance,
  formatHistoricalMoney,
  formatMoney,
  getTodayIso,
} from '../../../core/localization';
import type {
  CancellationBy,
  CaptureSource,
  MapZoneRecord,
  SavedPlace,
  StrategyMode,
  TripRecord,
  TripStatus,
} from '../../../models/types';
import { computeZoneDemandIntelligence } from '../../../core/zones';
import { useEcosystem } from '../../../services/EcosystemContext';
import { HorizontalBreakdownBars, PlatformBadge } from '../../ui/ChartsAndVisuals';
import {
  Card,
  ContextualHelpBanner,
  MetricCard,
  SegmentedFilter,
  StatusLabel,
} from '../../ui/DesignSystem';

const ALL_TRIP_STATUSES: TripStatus[] = [
  'Concluída',
  'Ajustada',
  'Cancelada',
  'Rejeitada',
  'Ignorada ou expirada',
  'Passageiro não compareceu',
];

function buildGoogleMapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function buildWazeHref(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}`;
}

export const DriverTripsAndPlanning: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    activeVehicle,
    activeMarket,
    visibleDriverPlatforms,
    activeDriverTrips,
    completeTrip,
    updateTripStatus,
    addCampaign,
    addShift,
    updateShiftNotes,
    setStrategyMode,
    updateAutoPilotConfig,
    saveStrategyPreset,
    applyStrategyPreset,
    deleteStrategyPreset,
    runSemiAutoCalibration,
    undoStrategyAdjustment,
    addSavedPlace,
    deleteSavedPlace,
    togglePlaceFavorite,
    updateRoutinePreferences,
    toggleZonePreference,
    addZoneObservation,
    logZoneRelocation,
    completeZoneRelocationOutcome,
    getPlatformLifecycleState,
    setDriverNav,
  } = useEcosystem();

  const todayIso = getTodayIso();
  const nextWeekIso = daysFromNowIso(7);
  const unitSystem = state.localization.unitSystem;
  const currency = activeMarket.currency;
  const symbol = activeMarket.currencySymbol;

  // Histórico filters
  const [tripFilterPlatform, setTripFilterPlatform] = useState('ALL');
  const [tripFilterStatus, setTripFilterStatus] = useState<string>('ALL');
  const [selectedTripId, setSelectedTripId] = useState<string>(state.trips[0]?.id ?? '');
  const [copiedAddrKey, setCopiedAddrKey] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('Cancelamento registado pelo motorista');
  const [cancelByInput, setCancelByInput] = useState<CancellationBy>('Motorista');

  const selectedTrip = useMemo(
    () => state.trips.find((t) => t.id === selectedTripId) ?? state.trips[0] ?? null,
    [state.trips, selectedTripId]
  );

  const [selectedConsolidatedPlatId, setSelectedConsolidatedPlatId] = useState<string | null>(null);

  // Strategy & Calibration state
  const [presetNameInput, setPresetNameInput] = useState('');
  const [calibrationFeedback, setCalibrationFeedback] = useState<string | null>(null);

  // Saved Place & Zone Map state
  const [placesSubTab, setPlacesSubTab] = useState<'places' | 'zones'>(
    activeTab === 'mapas-zonas' ? 'zones' : 'places'
  );
  const [newPlace, setNewPlace] = useState<{
    name: string;
    type: SavedPlace['type'];
    address: string;
    zone: string;
    notes: string;
  }>({
    name: '',
    type: 'Carregamento EV',
    address: '',
    zone: state.localization.currentLocation.city || 'Lisboa',
    notes: '',
  });
  const [routineSavedMsg, setRoutineSavedMsg] = useState(false);

  const [mapLayers, setMapLayers] = useState({
    demand: true,
    events: true,
    traffic: true,
    tolls: true,
    chargers: true,
    parking: true,
    bases: true,
    favorites: true,
  });
  const [selectedZoneId, setSelectedZoneId] = useState(state.zones[0]?.id ?? '');
  const [zoneObsForm, setZoneObsForm] = useState({
    observationType: 'Corte / Feira / Mercado' as import('../../../models/types').DriverZoneObservation['observationType'],
    description: '',
    timeWindow: '',
    privacyConsent: false,
  });
  const [zoneObsFeedback, setZoneObsFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [relocDestinationNotes, setRelocDestinationNotes] = useState('');

  const zoneDemandTrends = useMemo(
    () =>
      computeZoneDemandIntelligence({
        zones: state.zones,
        trips: activeDriverTrips,
        isDemoScope: Boolean(state.session.isDemoSession),
      }),
    [state.zones, activeDriverTrips, state.session.isDemoSession]
  );

  useEffect(() => {
    if (activeTab === 'mapas-zonas') setPlacesSubTab('zones');
    else if (activeTab === 'locais-rotas') setPlacesSubTab('places');
  }, [activeTab]);

  // Quick Trip Form
  const [newTripForm, setNewTripForm] = useState({
    externalRef: `UB-${String(Date.now()).slice(-5)}`,
    platformId: visibleDriverPlatforms[0]?.id ?? 'uber',
    grossEur: 15.5,
    tipEur: 1.0,
    bonusEur: 0,
    tollsEur: 0,
    pickupDistanceKm: 1.5,
    tripDistanceKm: 10.5,
    durationMin: 22,
    pickupZone: state.localization.currentLocation.city || 'Centro',
    destinationZone: 'Aeroporto / Zona Central',
    pickupAddress: '',
    destinationAddress: '',
    category: 'Standard',
  });

  // Shift Calendar & Form
  const [calendarView, setCalendarView] = useState<'diario' | 'semanal' | 'mensal'>('semanal');
  const [shiftForm, setShiftForm] = useState({
    date: todayIso,
    startTime: '14:00',
    endTime: '20:00',
    breakMinutes: 20,
    mealMinutes: 30,
    restMinutes: 10,
    onlineMinutes: 300,
    productiveMinutes: 220,
    waitMinutes: 80,
    totalKm: 128,
    passengerKm: 104,
    notes: 'Turno tarde operação local',
  });
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');

  // Smart Planner State
  const [plannerInput, setPlannerInput] = useState({
    targetNetEur: state.routinePreferences.dailyNetTargetEur * 5 || 750,
    availableDays: 5,
    hoursPerDay: 8.5,
    breakMinutesPerDay: 45,
    needsChargingStops: activeVehicle.fuelType === 'Elétrico',
  });

  const completedActiveTrips = useMemo(
    () => activeDriverTrips.filter((t) => isCompletedTripStatus(t.status)),
    [activeDriverTrips]
  );

  const earnedSoFar = useMemo(
    () => completedActiveTrips.reduce((s, t) => s + t.netEur, 0),
    [completedActiveTrips]
  );

  const historicalAvgRate = useMemo(() => {
    const totalRev = completedActiveTrips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0);
    const totalHours = Math.max(1, completedActiveTrips.reduce((s, t) => s + t.durationMin, 0) / 60);
    return totalRev / totalHours;
  }, [completedActiveTrips]);

  const planResult = useMemo(
    () =>
      calculateSmartPlan({
        ...plannerInput,
        vehicle: activeVehicle,
        historicalAvgGrossPerHour: historicalAvgRate,
        currentEarnedNetEur: earnedSoFar,
      }),
    [plannerInput, activeVehicle, historicalAvgRate, earnedSoFar]
  );

  // Campaign Add Form
  const [campForm, setCampForm] = useState({
    platformId: visibleDriverPlatforms[0]?.id ?? 'uber',
    name: 'Campanha Fim de Semana Extra',
    rewardEur: 35,
    targetTrips: 20,
    zone: state.localization.currentLocation.city || 'Área Metropolitana',
    scheduleWindow: '18:00 - 23:00',
    requirements: 'Taxa de aceitação >= 75%',
    estimatedExtraCostEur: 7.5,
  });

  // Consolidado respects active platforms + completed trips (keeps history badge separate)
  const multiPlatformSummary = useMemo(() => {
    return state.platforms.map((plat) => {
      const platTrips = state.trips.filter(
        (t) => t.platformId === plat.id && isCompletedTripStatus(t.status)
      );
      const gross = round2(platTrips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0));
      const commissions = round2(platTrips.reduce((s, t) => s + t.commissionEur, 0));
      const net = round2(platTrips.reduce((s, t) => s + t.netEur, 0));
      const km = round2(platTrips.reduce((s, t) => s + t.pickupDistanceKm + t.tripDistanceKm, 0));
      const minutes = platTrips.reduce((s, t) => s + t.durationMin, 0);
      return {
        platform: plat,
        lifecycleState: getPlatformLifecycleState(plat.id),
        tripsCount: platTrips.length,
        gross,
        commissions,
        net,
        km,
        hours: round2(minutes / 60),
      };
    });
  }, [state.platforms, state.trips, getPlatformLifecycleState]);

  const copyAddress = (key: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedAddrKey(key);
    setTimeout(() => setCopiedAddrKey((prev) => (prev === key ? null : prev)), 2000);
  };

  // ==========================================================
  // ESTRATÉGIA & AUTOPILOT (3 MODOS INDEPENDENTES, PRESETS, UNDO)
  // ==========================================================
  if (activeTab === 'estrategia' || activeTab === 'autopilot') {
    const ap = state.autoPilot;
    const activeStratMode: StrategyMode = ap.strategyMode ?? 'Manual';
    const currentThresholds = ap.modeConfigs?.[activeStratMode] ?? ap.thresholds;
    const bounds = ap.semiAutoBounds ?? {
      minEurPerKmFloor: 0.75,
      minEurPerKmCeil: 1.45,
      minEurPerHourFloor: 15,
      minEurPerHourCeil: 32,
      maxPickupKmFloor: 1.5,
      maxPickupKmCeil: 5.5,
    };

    const updateModeThresholds = (patch: Partial<typeof currentThresholds>) => {
      const nextThresholds = { ...currentThresholds, ...patch };
      updateAutoPilotConfig({
        thresholds: nextThresholds,
        modeConfigs: {
          Manual: ap.modeConfigs?.Manual ?? nextThresholds,
          Semiautomático: ap.modeConfigs?.Semiautomático ?? nextThresholds,
          Automático: ap.modeConfigs?.Automático ?? nextThresholds,
          [activeStratMode]: nextThresholds,
        },
      });
    };

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Estratégia & AutoPilot — 3 Modos Independentes, Presets & Trilha de Ajustes"
          description="Cada modo (Manual, Semiautomático, Automático) guarda os seus próprios parâmetros sem sobrescrever os outros. Calibrações semiautomáticas respeitam limites seguros e permitem Undo imediato."
        />

        {/* Quick link ribbon to Consolidated Platforms & Isolated Uber/Bolt */}
        <Card className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            Módulos de Plataformas relacionados:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDriverNav('consolidado-plataformas')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 font-medium"
            >
              Consolidado Multi-App
            </button>
            <button
              type="button"
              onClick={() => setDriverNav('desempenho-uber')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 font-medium"
            >
              Módulo Uber Pro
            </button>
            <button
              type="button"
              onClick={() => setDriverNav('desempenho-bolt')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 font-medium"
            >
              Módulo Bolt Score
            </button>
          </div>
        </Card>

        <Card className="p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Modo de Estratégia Ativo: {activeStratMode}
            </h2>
            <SegmentedFilter
              value={activeStratMode}
              onChange={(m) => setStrategyMode(m as StrategyMode)}
              options={[
                { id: 'Manual', label: '1. Manual' },
                { id: 'Semiautomático', label: '2. Semiautomático' },
                { id: 'Automático', label: '3. Automático' },
              ]}
            />
          </div>

          {/* Authorized Execution Channel vs Assisted Action */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold block text-slate-800 dark:text-slate-100">
                  Via de Execução do Modo Automático
                </span>
                <span className="text-[11px] text-slate-500">
                  Quando existe canal oficial ou bridge expressamente autorizado, o Modo Automático executa a decisão; sem via autorizada, calcula a decisão pronta e disponibiliza ação assistida sem fingir automação externa.
                </span>
              </div>
              <select
                aria-label="Canal autorizado de execução automática"
                value={ap.authorizedExecutionChannel ?? (ap.officialAutomationAuthorized ? 'API Oficial Autorizada' : 'Nenhum')}
                onChange={(e) => {
                  const ch = e.target.value as NonNullable<typeof ap.authorizedExecutionChannel>;
                  updateAutoPilotConfig({
                    authorizedExecutionChannel: ch,
                    officialAutomationAuthorized: ch !== 'Nenhum',
                  });
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold"
              >
                <option value="Nenhum">Nenhum canal externo autorizado (Ação Assistida)</option>
                <option value="API Oficial Autorizada">Simular Canal API Oficial Autorizada (Teste Nível 2/3)</option>
                <option value="Bridge Nativo Autorizado">Simular Bridge Nativo Autorizado (Android Windsurf)</option>
              </select>
            </div>
            {activeStratMode === 'Automático' && !ap.officialAutomationAuthorized && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-amber-800 dark:text-amber-300">
                  <strong>Sem via externa autorizada ativa:</strong> O AIVAD avalia todas as regras e apresenta <em>Decisão pronta (Ação assistida)</em> para confirmação rápida do motorista, sem simular toques ilegais.
                </p>
              </div>
            )}
          </div>

          {/* Primary & Extended Configurable Rules (§2) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <label htmlFor="st-min-val" className="block font-medium mb-1">
                Valor Mín. ({symbol})
              </label>
              <input
                id="st-min-val"
                type="number"
                step="0.5"
                value={currentThresholds.minValueEur}
                onChange={(e) => updateModeThresholds({ minValueEur: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="st-max-val" className="block font-medium mb-1">
                Valor Máx. ({symbol})
              </label>
              <input
                id="st-max-val"
                type="number"
                step="1"
                placeholder="Sem teto"
                value={currentThresholds.maxValueEur ?? ''}
                onChange={(e) =>
                  updateModeThresholds({
                    maxValueEur: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="st-min-km" className="block font-medium mb-1">
                Mínimo ({symbol}/km)
              </label>
              <input
                id="st-min-km"
                type="number"
                step="0.05"
                value={currentThresholds.minEurPerKm}
                onChange={(e) => updateModeThresholds({ minEurPerKm: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="st-min-hr" className="block font-medium mb-1">
                Mínimo ({symbol}/hora)
              </label>
              <input
                id="st-min-hr"
                type="number"
                step="1"
                value={currentThresholds.minEurPerHour}
                onChange={(e) => updateModeThresholds({ minEurPerHour: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="st-max-pick" className="block font-medium mb-1">
                Máx. Recolha (km)
              </label>
              <input
                id="st-max-pick"
                type="number"
                step="0.5"
                value={currentThresholds.maxPickupKm}
                onChange={(e) => updateModeThresholds({ maxPickupKm: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="st-max-pick-min" className="block font-medium mb-1">
                Máx. Recolha (min)
              </label>
              <input
                id="st-max-pick-min"
                type="number"
                step="1"
                value={currentThresholds.maxPickupTimeMin ?? 12}
                onChange={(e) => updateModeThresholds({ maxPickupTimeMin: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="st-max-tot-km" className="block font-medium mb-1">
                Dist. Total Máx (km)
              </label>
              <input
                id="st-max-tot-km"
                type="number"
                step="2"
                value={currentThresholds.maxTotalDistanceKm}
                onChange={(e) => updateModeThresholds({ maxTotalDistanceKm: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="st-max-tot-min" className="block font-medium mb-1">
                Tempo Total Máx (min)
              </label>
              <input
                id="st-max-tot-min"
                type="number"
                step="5"
                value={currentThresholds.maxTotalTimeMin}
                onChange={(e) => updateModeThresholds({ maxTotalTimeMin: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="st-sched" className="block font-medium mb-1">
                Janela Horária
              </label>
              <input
                id="st-sched"
                type="text"
                value={currentThresholds.activeScheduleWindow}
                onChange={(e) => updateModeThresholds({ activeScheduleWindow: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="st-goal-d" className="block font-medium mb-1">
                Meta Diária ({symbol})
              </label>
              <input
                id="st-goal-d"
                type="number"
                step="5"
                value={currentThresholds.dailyGoalEur ?? state.routinePreferences.dailyNetTargetEur}
                onChange={(e) => updateModeThresholds({ dailyGoalEur: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="st-goal-m" className="block font-medium mb-1">
                Meta Mensal ({symbol})
              </label>
              <input
                id="st-goal-m"
                type="number"
                step="50"
                value={currentThresholds.monthlyGoalEur ?? Math.round(state.routinePreferences.dailyNetTargetEur * 22)}
                onChange={(e) => updateModeThresholds({ monthlyGoalEur: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="st-cont-drv" className="block font-medium mb-1">
                Limite Contínuo (min)
              </label>
              <input
                id="st-cont-drv"
                type="number"
                step="15"
                value={currentThresholds.maxContinuousDrivingMin ?? 270}
                onChange={(e) => updateModeThresholds({ maxContinuousDrivingMin: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
          </div>

          {/* Days of Week + Return / Bonus Preferences */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Dias de Trabalho Ativos:</span>
              {[
                { d: 1, l: 'Seg' },
                { d: 2, l: 'Ter' },
                { d: 3, l: 'Qua' },
                { d: 4, l: 'Qui' },
                { d: 5, l: 'Sex' },
                { d: 6, l: 'Sáb' },
                { d: 0, l: 'Dom' },
              ].map(({ d, l }) => {
                const days = currentThresholds.allowedDaysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];
                const active = days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      const next = active ? days.filter((x) => x !== d) : [...days, d];
                      updateModeThresholds({ allowedDaysOfWeek: next });
                    }}
                    className={`px-2.5 py-1 rounded-lg border font-medium ${
                      active
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'border-slate-300 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {l}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ap.prioritizeCampaigns}
                  onChange={(e) => updateAutoPilotConfig({ prioritizeCampaigns: e.target.checked })}
                />
                <span>Priorizar campanhas e incentivos ativos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ap.includeBonusInThreshold}
                  onChange={(e) => updateAutoPilotConfig({ includeBonusInThreshold: e.target.checked })}
                />
                <span>Incluir bónus na avaliação de limiar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(currentThresholds.avoidEmptyReturnRisk)}
                  onChange={(e) => updateModeThresholds({ avoidEmptyReturnRisk: e.target.checked })}
                />
                <span>Penalizar deslocações com alto risco de retorno sem passageiro</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Semi-Auto Bounds & Calibration Engine */}
        <Card className="p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Calibração Semiautomática Controlada (Limites Seguros + Undo)
              </h3>
              <p className="text-slate-500">
                A IA nunca ultrapassa os pisos e tetos definidos pelo motorista.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const res = runSemiAutoCalibration();
                setCalibrationFeedback(res.rationale);
              }}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
            >
              Calibrar Agora (AI CORE)
            </button>
          </div>

          {calibrationFeedback && <StatusLabel tone="info" text={calibrationFeedback} />}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-2">
              <span className="font-bold block">Faixa {symbol}/km</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.05"
                  aria-label="Piso €/km"
                  value={bounds.minEurPerKmFloor}
                  onChange={(e) =>
                    updateAutoPilotConfig({
                      semiAutoBounds: { ...bounds, minEurPerKmFloor: Number(e.target.value) },
                    })
                  }
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
                <input
                  type="number"
                  step="0.05"
                  aria-label="Teto €/km"
                  value={bounds.minEurPerKmCeil}
                  onChange={(e) =>
                    updateAutoPilotConfig({
                      semiAutoBounds: { ...bounds, minEurPerKmCeil: Number(e.target.value) },
                    })
                  }
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-2">
              <span className="font-bold block">Faixa {symbol}/hora</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  aria-label="Piso €/hora"
                  value={bounds.minEurPerHourFloor}
                  onChange={(e) =>
                    updateAutoPilotConfig({
                      semiAutoBounds: { ...bounds, minEurPerHourFloor: Number(e.target.value) },
                    })
                  }
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
                <input
                  type="number"
                  aria-label="Teto €/hora"
                  value={bounds.minEurPerHourCeil}
                  onChange={(e) =>
                    updateAutoPilotConfig({
                      semiAutoBounds: { ...bounds, minEurPerHourCeil: Number(e.target.value) },
                    })
                  }
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-2 col-span-2 sm:col-span-1">
              <span className="font-bold block">Faixa Máx. Recolha (km)</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.5"
                  aria-label="Piso recolha km"
                  value={bounds.maxPickupKmFloor}
                  onChange={(e) =>
                    updateAutoPilotConfig({
                      semiAutoBounds: { ...bounds, maxPickupKmFloor: Number(e.target.value) },
                    })
                  }
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
                <input
                  type="number"
                  step="0.5"
                  aria-label="Teto recolha km"
                  value={bounds.maxPickupKmCeil}
                  onChange={(e) =>
                    updateAutoPilotConfig({
                      semiAutoBounds: { ...bounds, maxPickupKmCeil: Number(e.target.value) },
                    })
                  }
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Presets + Adjustment Audit History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold">Presets Guardados ({ap.savedPresets?.length ?? 0})</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!presetNameInput.trim()) return;
                saveStrategyPreset(presetNameInput.trim());
                setPresetNameInput('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                aria-label="Nome do novo preset"
                placeholder="Ex: Aeroporto Fim de Semana"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <button type="submit" className="px-3 py-2 rounded-lg bg-blue-700 text-white font-semibold">
                Guardar Preset
              </button>
            </form>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(ap.savedPresets ?? []).map((pr) => (
                <div key={pr.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">{pr.name}</p>
                    <p className="text-slate-500 font-mono-tabular">
                      {pr.mode} · {symbol}
                      {pr.thresholds.minEurPerKm.toFixed(2)}/km · {symbol}
                      {pr.thresholds.minEurPerHour.toFixed(0)}/h · Recolha ≤ {pr.thresholds.maxPickupKm}km
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyStrategyPreset(pr.id)}
                      className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold transition-colors cursor-pointer"
                    >
                      Aplicar
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar preset ${pr.name}`}
                      onClick={() => deleteStrategyPreset(pr.id)}
                      className="p-1.5 rounded border border-red-200 dark:border-red-900 text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold">
              Registo Auditável de Ajustes &amp; Reversão ({ap.adjustmentLogs?.length ?? 0})
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {(ap.adjustmentLogs ?? []).length === 0 ? (
                <p className="text-slate-500 py-4">Ainda sem calibrações semiautomáticas registadas.</p>
              ) : (
                (ap.adjustmentLogs ?? []).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="font-bold">
                        {log.parameterLabel}:{' '}
                        <span className="font-mono-tabular">
                          {log.previousValue} → {log.newValue}
                        </span>
                      </p>
                      <p className="text-slate-500">{log.reason}</p>
                      <p className="text-[11px] text-slate-400">
                        Condição: {log.conditionTriggered} · {log.mode}
                      </p>
                    </div>
                    {log.reverted ? (
                      <StatusLabel tone="neutral" text="Revertido" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => undoStrategyAdjustment(log.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:border-blue-600 font-medium shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" /> Desfazer
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================================
  // CONSOLIDADO MULTI-APP (Plataformas Independentes)
  // ==========================================================
  if (activeTab === 'consolidado-plataformas') {
    const activeEntries = multiPlatformSummary.filter(
      (x) => x.lifecycleState === 'Ativa e operacional'
    );
    const totalMultiGross = round2(multiPlatformSummary.reduce((s, x) => s + x.gross, 0));
    const totalMultiNet = round2(multiPlatformSummary.reduce((s, x) => s + x.net, 0));
    const totalMultiComm = round2(multiPlatformSummary.reduce((s, x) => s + x.commissions, 0));
    const totalMultiTrips = multiPlatformSummary.reduce((s, x) => s + x.tripsCount, 0);

    const barItems = multiPlatformSummary
      .filter((x) => x.tripsCount > 0 || x.lifecycleState === 'Ativa e operacional')
      .map((x) => ({
        id: x.platform.id,
        label: x.platform.name,
        sublabel: `${x.tripsCount} viagens concluídas · ${x.platform.commissionPct}% comissão`,
        value: x.net > 0 ? x.net : 0.1,
        formattedValue: formatMoney(x.net, currency),
        color: x.platform.brandColor ?? '#1D4ED8',
      }));

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Consolidado Multi-Plataforma Independente"
          description="Reúne ganhos concluídos, comissões, tempos e elegibilidade de todas as apps. Viagens canceladas são excluídas dos ganhos e plataformas desativadas mantêm o histórico auditável."
          demoNotice="Estado de ligações automáticas às apps externas: INTEGRAÇÃO A VALIDAR"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Receita Consolidada Multi-App"
            value={formatMoney(totalMultiGross, currency)}
            subtext={`${totalMultiTrips} viagens concluídas`}
            explanation="Soma bruta de todas as plataformas registadas (exclui canceladas)."
            formula="Σ (Bruto + Gorjetas + Bónus)"
            accent="blue"
          />
          <MetricCard
            label="Comissões Retidas"
            value={formatMoney(totalMultiComm, currency)}
            subtext="Conforme taxa real de cada plataforma"
            explanation="Total deduzido pelas diferentes plataformas."
            formula="Σ (Bruto × % Comissão)"
            accent="red"
          />
          <MetricCard
            label="Líquido Operacional Agregado"
            value={formatMoney(totalMultiNet, currency)}
            subtext="Após comissões e custo/km do veículo"
            explanation="Rendimento líquido operacional consolidado."
            formula="Receita - Comissões - Custo/Km"
          />
          <MetricCard
            label="Plataformas Ativas no Perfil"
            value={`${activeEntries.length} / ${state.platforms.length}`}
            subtext={`Mercado: ${activeMarket.name} (${activeMarket.code})`}
            explanation="Plataformas ativas no catálogo e no perfil do motorista."
            formula="Contagem ativa"
            onDrillDown={() => setDriverNav('apps-integracoes')}
            drillDownLabel="Gerir Apps & Desativações"
          />
        </div>

        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Comparação de Rendimento Líquido por Plataforma
              </h2>
              <p className="text-xs text-slate-500">
                Clique numa barra para destacar os requisitos e detalhes operacionais.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDriverNav('desempenho-uber')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 font-medium"
              >
                <span>Módulo Uber Pro</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setDriverNav('desempenho-bolt')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 font-medium"
              >
                <span>Módulo Bolt Score</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          <HorizontalBreakdownBars
            items={barItems}
            selectedId={selectedConsolidatedPlatId}
            onSelect={(id) =>
              setSelectedConsolidatedPlatId((prev) => (prev === id ? null : id))
            }
          />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {multiPlatformSummary.map(({ platform, lifecycleState, tripsCount, gross, net, km, hours }) => {
            const highlighted = selectedConsolidatedPlatId === platform.id;
            const availableInMarket = platform.countryScope.includes(activeMarket.code);
            return (
              <Card
                key={platform.id}
                className={`p-5 space-y-3 transition-all ${highlighted ? 'ring-2 ring-blue-600' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlatformBadge
                      platformId={platform.id}
                      name={platform.name}
                      shortCode={platform.shortCode}
                      brandColor={platform.brandColor}
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate">{platform.name}</h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        Comissão {platform.commissionPct}% · {platform.countryScope.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusLabel
                      tone={lifecycleState === 'Ativa e operacional' ? 'success' : 'neutral'}
                      text={lifecycleState}
                    />
                    <span className="text-[10px] font-mono-tabular text-amber-700 dark:text-amber-400">
                      {platform.integrationLabel}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs font-mono-tabular">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Viagens</span>
                    <span className="font-bold">{tripsCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Bruto</span>
                    <span className="font-bold">{formatMoney(gross, currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Líquido</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">
                      {formatMoney(net, currency)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <p>
                    <strong>Categorias:</strong> {platform.categories.join(' · ')}
                  </p>
                  {platform.requirements && platform.requirements.length > 0 && (
                    <p>
                      <strong>Requisitos:</strong> {platform.requirements[0]}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    {availableInMarket ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ativa em {activeMarket.code}</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>Fora de {activeMarket.code} ({formatDistance(km, unitSystem)} / {hours}h)</span>
                      </>
                    )}
                  </span>
                  {(platform.id === 'uber' || platform.id === 'bolt') && (
                    <button
                      type="button"
                      onClick={() =>
                        setDriverNav(
                          platform.id === 'uber' ? 'desempenho-uber' : 'desempenho-bolt'
                        )
                      }
                      className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      Ver Regras Isoladas →
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================================
  // HISTÓRICO DE VIAGENS (Preserva moeda, moradas, Google Maps/Waze & Cancelamentos)
  // ==========================================================
  if (activeTab === 'historico-viagens') {
    const filtered = state.trips.filter((t) => {
      if (tripFilterPlatform !== 'ALL' && t.platformId !== tripFilterPlatform) return false;
      if (tripFilterStatus !== 'ALL' && t.status !== tripFilterStatus) return false;
      return true;
    });

    const pickupDisplay = selectedTrip?.pickupAddress?.trim() || null;
    const destDisplay = selectedTrip?.destinationAddress?.trim() || null;

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Histórico Completo de Viagens (Moeda Original, Moradas, Navegação & Cancelamentos)"
          description="Preserva todo o histórico mesmo quando desativa uma plataforma. Viagens canceladas/rejeitadas/expiradas permanecem visíveis aqui sem distorcer os ganhos concluídos."
        />

        {/* Quick Register Trip */}
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Registar Viagem Concluída em {activeMarket.name} ({currency})
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const created = completeTrip({
                ...newTripForm,
                pickupAddress: newTripForm.pickupAddress.trim() || undefined,
                destinationAddress: newTripForm.destinationAddress.trim() || undefined,
                vehicleId: activeVehicle.id,
                date: todayIso,
                time: new Date().toTimeString().slice(0, 5),
                currency,
                originalGrossAmount: newTripForm.grossEur,
                countryCode: activeMarket.code,
                status: 'Concluída',
                source: 'Manual' as CaptureSource,
                isDemo: Boolean(state.session.isDemoSession),
              });
              setSelectedTripId(created.id);
              setNewTripForm((f) => ({
                ...f,
                externalRef: `${f.platformId.toUpperCase().slice(0, 2)}-${String(Date.now()).slice(-5)}`,
              }));
            }}
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs"
          >
            <div>
              <label htmlFor="nt-plat" className="block mb-1 font-medium">Plataforma</label>
              <select
                id="nt-plat"
                value={newTripForm.platformId}
                onChange={(e) => setNewTripForm((f) => ({ ...f, platformId: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {visibleDriverPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nt-gross" className="block mb-1 font-medium">Bruto ({symbol})</label>
              <input
                id="nt-gross"
                type="number"
                step="0.1"
                value={newTripForm.grossEur}
                onChange={(e) => setNewTripForm((f) => ({ ...f, grossEur: Number(e.target.value) }))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="nt-km" className="block mb-1 font-medium">Viagem (km)</label>
              <input
                id="nt-km"
                type="number"
                step="0.1"
                value={newTripForm.tripDistanceKm}
                onChange={(e) => setNewTripForm((f) => ({ ...f, tripDistanceKm: Number(e.target.value) }))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="nt-min" className="block mb-1 font-medium">Duração (min)</label>
              <input
                id="nt-min"
                type="number"
                value={newTripForm.durationMin}
                onChange={(e) => setNewTripForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="nt-paddr" className="block mb-1 font-medium">Morada Recolha</label>
              <input
                id="nt-paddr"
                type="text"
                placeholder="Opcional"
                value={newTripForm.pickupAddress}
                onChange={(e) => setNewTripForm((f) => ({ ...f, pickupAddress: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="nt-daddr" className="block mb-1 font-medium">Morada Destino</label>
              <input
                id="nt-daddr"
                type="text"
                placeholder="Opcional"
                value={newTripForm.destinationAddress}
                onChange={(e) => setNewTripForm((f) => ({ ...f, destinationAddress: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 px-3 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                Concluir Viagem
              </button>
            </div>
          </form>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-7 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Viagens ({filtered.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Filtrar viagens por plataforma"
                  value={tripFilterPlatform}
                  onChange={(e) => setTripFilterPlatform(e.target.value)}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="ALL">Todas apps (inclui desativadas)</option>
                  {state.platforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select
                  aria-label="Filtrar viagens por estado"
                  value={tripFilterStatus}
                  onChange={(e) => setTripFilterStatus(e.target.value)}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="ALL">Todos estados</option>
                  {ALL_TRIP_STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Cards (< md) */}
            <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((t) => {
                const platObj = state.platforms.find((p) => p.id === t.platformId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTripId(t.id)}
                    className={`w-full text-left p-4 space-y-2 text-xs ${
                      selectedTrip?.id === t.id ? 'bg-blue-50 dark:bg-blue-950/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 font-bold">
                        <PlatformBadge
                          platformId={t.platformId}
                          name={platObj?.name ?? t.platformId}
                          size="sm"
                        />
                        <span>{t.externalRef} · {t.date} {t.time}</span>
                      </span>
                      <StatusLabel
                        tone={isCompletedTripStatus(t.status) ? 'success' : 'danger'}
                        text={t.status}
                      />
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      {t.pickupZone} → {t.destinationZone ?? 'Destino não informado'}
                    </p>
                    <div className="flex items-center justify-between font-mono-tabular font-semibold">
                      <span>Bruto: {formatHistoricalMoney(t.grossEur, t.originalGrossAmount ?? t.grossEur, t.currency ?? 'EUR', currency)}</span>
                      <span className="text-blue-700 dark:text-blue-400">
                        Líq.: {formatHistoricalMoney(t.netEur, t.originalNetAmount ?? t.netEur, t.currency ?? 'EUR', currency)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Ref</th>
                    <th className="p-3">Data/Hora</th>
                    <th className="p-3">Plataforma</th>
                    <th className="p-3">Bruto</th>
                    <th className="p-3">Líquido</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filtered.map((t) => {
                    const platObj = state.platforms.find((p) => p.id === t.platformId);
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTripId(t.id)}
                        className={`cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 ${
                          selectedTrip?.id === t.id ? 'bg-blue-50 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        <td className="p-3 font-mono-tabular font-semibold">{t.externalRef}</td>
                        <td className="p-3 font-mono-tabular">{t.date} {t.time}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5">
                            <PlatformBadge
                              platformId={t.platformId}
                              name={platObj?.name ?? t.platformId}
                              shortCode={platObj?.shortCode}
                              brandColor={platObj?.brandColor}
                              size="sm"
                            />
                            <span>{platObj?.name ?? t.platformId.toUpperCase()} · {t.category}</span>
                          </span>
                        </td>
                        <td className="p-3 font-mono-tabular">
                          {formatHistoricalMoney(
                            t.grossEur,
                            t.originalGrossAmount ?? t.grossEur,
                            t.currency ?? 'EUR',
                            currency
                          )}
                        </td>
                        <td className="p-3 font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                          {formatHistoricalMoney(
                            t.netEur,
                            t.originalNetAmount ?? t.netEur,
                            t.currency ?? 'EUR',
                            currency
                          )}
                        </td>
                        <td className="p-3">
                          <StatusLabel
                            tone={isCompletedTripStatus(t.status) ? 'success' : 'danger'}
                            text={t.status}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Individual Trip Detail Drawer/Card */}
          <Card className="lg:col-span-5 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Detalhe Individual da Viagem</h3>
              {selectedTrip && (
                <StatusLabel
                  tone={selectedTrip.isEstimatedBreakdown ? 'warning' : 'success'}
                  text={selectedTrip.isEstimatedBreakdown ? 'Decomposição Estimada' : 'Confirmado'}
                />
              )}
            </div>

            {selectedTrip ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Identificador &amp; Estado</span>
                  <span className="font-mono-tabular font-semibold">
                    {selectedTrip.externalRef} · {selectedTrip.status}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Mercado / Moeda Original</span>
                  <span className="font-mono-tabular">
                    {selectedTrip.countryCode ?? 'PT'} · {selectedTrip.currency ?? 'EUR'}
                  </span>
                </div>

                {/* Pickup Address + Google Maps / Waze / Copy */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    Morada de Recolha ({selectedTrip.pickupZone})
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {pickupDisplay ?? 'Não informado / Indisponível'}
                  </p>
                  {pickupDisplay && (
                    <div className="flex flex-wrap gap-1.5">
                      <a
                        href={buildGoogleMapsHref(pickupDisplay)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-700 text-white font-semibold"
                      >
                        <Navigation className="w-3 h-3" /> Google Maps
                      </a>
                      <a
                        href={buildWazeHref(pickupDisplay)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" /> Waze
                      </a>
                      <button
                        type="button"
                        onClick={() => copyAddress('pickup', pickupDisplay)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 font-medium"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedAddrKey === 'pickup' ? 'Copiado!' : 'Copiar endereço'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Destination Address + Google Maps / Waze / Copy */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    Morada de Destino ({selectedTrip.destinationZone ?? 'Não informado'})
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {destDisplay ?? 'Não informado / Indisponível'}
                  </p>
                  {destDisplay && (
                    <div className="flex flex-wrap gap-1.5">
                      <a
                        href={buildGoogleMapsHref(destDisplay)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-700 text-white font-semibold"
                      >
                        <Navigation className="w-3 h-3" /> Google Maps
                      </a>
                      <a
                        href={buildWazeHref(destDisplay)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" /> Waze
                      </a>
                      <button
                        type="button"
                        onClick={() => copyAddress('dest', destDisplay)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 font-medium"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedAddrKey === 'dest' ? 'Copiado!' : 'Copiar endereço'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Distância &amp; Duração</span>
                  <span className="font-mono-tabular">
                    {formatDistance(selectedTrip.pickupDistanceKm, unitSystem)} +{' '}
                    {formatDistance(selectedTrip.tripDistanceKm, unitSystem)} · {selectedTrip.durationMin} min
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Bruto / Gorjeta / Bónus</span>
                  <span className="font-mono-tabular">
                    {formatMoney(selectedTrip.grossEur, selectedTrip.currency ?? 'EUR')} /{' '}
                    {formatMoney(selectedTrip.tipEur, selectedTrip.currency ?? 'EUR')} /{' '}
                    {formatMoney(selectedTrip.bonusEur, selectedTrip.currency ?? 'EUR')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Comissão / Custos / Portagens</span>
                  <span className="font-mono-tabular">
                    {formatMoney(selectedTrip.commissionEur, selectedTrip.currency ?? 'EUR')} /{' '}
                    {formatMoney(selectedTrip.operationalCostEur, selectedTrip.currency ?? 'EUR')} /{' '}
                    {formatMoney(selectedTrip.tollsEur, selectedTrip.currency ?? 'EUR')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-sm font-bold text-blue-700 dark:text-blue-400">
                  <span>Líquido (Moeda Original)</span>
                  <span className="font-mono-tabular">
                    {formatHistoricalMoney(
                      selectedTrip.netEur,
                      selectedTrip.originalNetAmount ?? selectedTrip.netEur,
                      selectedTrip.currency ?? 'EUR',
                      currency
                    )}
                  </span>
                </div>

                {(selectedTrip.travelToPickupSeconds !== undefined || selectedTrip.waitAtPickupSeconds !== undefined) && (
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Tempos (Deslocação / Espera Recolha)</span>
                    <span className="font-mono-tabular">
                      {Math.floor((selectedTrip.travelToPickupSeconds ?? 0) / 60)}m {(selectedTrip.travelToPickupSeconds ?? 0) % 60}s /{' '}
                      {Math.floor((selectedTrip.waitAtPickupSeconds ?? 0) / 60)}m {(selectedTrip.waitAtPickupSeconds ?? 0) % 60}s
                    </span>
                  </div>
                )}

                {(selectedTrip.cancellationReason || selectedTrip.cancellationBy || !isCompletedTripStatus(selectedTrip.status)) && (
                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 space-y-1">
                    <p>
                      <strong>Atribuição ({selectedTrip.cancellationBy ?? 'Sistema'}):</strong>{' '}
                      {selectedTrip.cancellationReason || 'Viagem não concluída — impacto financeiro excluído dos ganhos.'}
                    </p>
                    {selectedTrip.cancellationCompensationEur !== undefined && selectedTrip.cancellationCompensationEur > 0 && (
                      <p className="font-mono-tabular">
                        Taxa de compensação registada: {formatMoney(selectedTrip.cancellationCompensationEur, selectedTrip.currency ?? 'EUR')}
                      </p>
                    )}
                    <p className="text-[10px] opacity-80">
                      Nota: Taxas finais e impacto em métricas de conta são confirmados apenas na app oficial da plataforma.
                    </p>
                  </div>
                )}

                {/* Change Trip Status / Mark Cancelled */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="font-bold block">Atualizar Estado / Cancelamento:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      aria-label="Atribuição de cancelamento"
                      value={cancelByInput}
                      onChange={(e) => setCancelByInput(e.target.value as CancellationBy)}
                      className="px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="Motorista">Por Motorista</option>
                      <option value="Passageiro">Por Passageiro</option>
                      <option value="Plataforma">Por Plataforma</option>
                    </select>
                    <input
                      type="text"
                      aria-label="Motivo do estado"
                      value={cancelReasonInput}
                      onChange={(e) => setCancelReasonInput(e.target.value)}
                      className="px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_TRIP_STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          updateTripStatus(
                            selectedTrip.id,
                            st,
                            st === 'Concluída' || st === 'Ajustada'
                              ? undefined
                              : {
                                  cancellationBy: cancelByInput,
                                  cancellationReason: cancelReasonInput,
                                }
                          )
                        }
                        className={`px-2 py-1 rounded border text-[11px] font-medium ${
                          selectedTrip.status === st
                            ? 'bg-blue-700 text-white border-blue-700'
                            : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Selecione uma viagem para ver detalhes.</p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================================
  // LOCAIS, ROTAS, ROTINA & MAPA DE ZONAS
  // ==========================================================
  if (activeTab === 'locais-rotas' || activeTab === 'mapas-zonas') {
    const routine = state.routinePreferences;
    const selectedZone = state.zones.find((z) => z.id === selectedZoneId) ?? state.zones[0];

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Locais Guardados, Rotina do Motorista & Mapa Operacional de Zonas"
          description="Casa, garagem, carregamento EV, combustível e descanso alimentam diretamente o AI CORE e o Planeador. Trânsito e obras ao vivo exibem transparência explícita quando indisponíveis."
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <SegmentedFilter
            value={placesSubTab}
            onChange={(v) => setPlacesSubTab(v as 'places' | 'zones')}
            options={[
              { id: 'places', label: `Locais & Rotina (${state.savedPlaces.length})` },
              { id: 'zones', label: `Mapa de Zonas (${state.zones.length})` },
            ]}
          />
          <StatusLabel tone="warning" text="Trânsito/Obras ao vivo: Informação indisponível ao vivo" />
        </div>

        {placesSubTab === 'zones' ? (
          <div className="space-y-4">
            <Card className="p-4 flex flex-wrap gap-3 text-xs">
              {(
                [
                  ['demand', 'Procura histórica'],
                  ['events', 'Eventos & Feiras'],
                  ['traffic', 'Perfil trânsito histórico'],
                  ['tolls', 'Portagens'],
                  ['chargers', 'Carregamento EV'],
                  ['parking', 'Estacionamento'],
                  ['bases', 'Bases'],
                  ['favorites', 'Favoritas / Evitar'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mapLayers[key]}
                    onChange={() => setMapLayers((l) => ({ ...l, [key]: !l[key] }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-7 p-4 space-y-3">
                <div className="relative w-full h-80 sm:h-96 rounded-2xl bg-gradient-to-b from-blue-50/90 to-indigo-50/60 dark:from-[#0B1324] dark:to-[#0F182B] overflow-hidden border border-blue-200/80 dark:border-slate-700">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path
                      d="M0 25 H100 M0 50 H100 M0 75 H100 M25 0 V100 M50 0 V100 M75 0 V100"
                      className="stroke-blue-200/90 dark:stroke-slate-800"
                      strokeWidth="0.4"
                    />
                    <path d="M0 84 Q45 78 100 88 L100 100 L0 100 Z" className="fill-blue-200/75 dark:fill-[#0F2942]" />
                    {state.zones.map((z) => {
                      const fill =
                        mapLayers.favorites && z.preference === 'Favorita'
                          ? '#1D4ED8'
                          : mapLayers.favorites && z.preference === 'Evitar'
                          ? '#E11D48'
                          : z.activeEvent
                          ? '#D97706'
                          : '#4F46E5';
                      return (
                        <g
                          key={z.id}
                          onClick={() => setSelectedZoneId(z.id)}
                          className="cursor-pointer"
                        >
                          {mapLayers.demand && (
                            <circle
                              cx={z.x}
                              cy={z.y}
                              r={z.historicalDemand === 'Alta' ? 11 : 7}
                              fill={fill}
                              fillOpacity={0.22}
                              stroke={selectedZone?.id === z.id ? '#1D4ED8' : fill}
                              strokeWidth={selectedZone?.id === z.id ? 0.9 : 0.45}
                            />
                          )}
                          <circle cx={z.x} cy={z.y} r={2.2} fill={fill} stroke="#FFFFFF" strokeWidth="0.5" />
                          <text
                            x={z.x}
                            y={z.y - 4}
                            textAnchor="middle"
                            className="fill-slate-800 dark:fill-slate-100"
                            fontSize="3.0"
                            fontWeight="bold"
                          >
                            {z.name.split('/')[0].trim()}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Quick selector chips for zones */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {state.zones.map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setSelectedZoneId(z.id)}
                      className={`px-2.5 py-1 rounded-lg border font-medium ${
                        selectedZone?.id === z.id
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {z.name.split('/')[0].trim()}
                      {z.schedules && z.schedules.length > 0 ? ' ⚠' : ''}
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="lg:col-span-5 p-5 space-y-4 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    {selectedZone.name} ({selectedZone.city})
                  </h3>
                  {selectedZone.tier && (
                    <StatusLabel
                      tone={
                        selectedZone.tier.startsWith('1')
                          ? 'danger'
                          : selectedZone.tier.startsWith('2')
                          ? 'warning'
                          : 'info'
                      }
                      text={selectedZone.tier}
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <p><strong>Procura histórica:</strong> {selectedZone.historicalDemand}</p>
                  {mapLayers.traffic && <p><strong>Trânsito (perfil histórico):</strong> {selectedZone.trafficLevel}</p>}
                  {mapLayers.chargers && <p><strong>Postos EV na zona:</strong> {selectedZone.evChargersCount}</p>}
                  {mapLayers.parking && <p><strong>Lugares estacionamento:</strong> {selectedZone.parkingSpots}</p>}
                  {mapLayers.tolls && <p><strong>Portagens próximas:</strong> {selectedZone.tollsNearby ? 'Sim' : 'Não'}</p>}
                  {mapLayers.bases && <p><strong>Base Operacional:</strong> {selectedZone.isBase ? 'Sim' : 'Não'}</p>}
                </div>

                {/* Schedules & Event vs Ban Distinction */}
                {(selectedZone.activeEvent || selectedZone.riskSummary || (selectedZone.schedules && selectedZone.schedules.length > 0)) && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1.5">
                    {selectedZone.activeEvent && (
                      <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {selectedZone.activeEvent}
                      </p>
                    )}
                    {selectedZone.schedules && selectedZone.schedules.length > 0 && (
                      <ul className="space-y-0.5 text-amber-800 dark:text-amber-300 font-medium">
                        {selectedZone.schedules.map((sc, i) => (
                          <li key={i}>• Horário crítico: {sc.summary} ({sc.startHour}–{sc.endHour})</li>
                        ))}
                      </ul>
                    )}
                    {selectedZone.riskSummary && (
                      <p className="text-slate-700 dark:text-slate-200">{selectedZone.riskSummary}</p>
                    )}
                    {selectedZone.isEventNotConfirmedBan && (
                      <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded">
                        Distinção operacional: Evento/feira regular conhecido; não constitui proibição legal total confirmada salvo corte policial no local.
                      </p>
                    )}
                    {selectedZone.restrictionSource && (
                      <p className="text-[10px] text-slate-500">
                        Fonte: {selectedZone.restrictionSource}
                        {selectedZone.verifiedAt ? ` · Verificado em ${selectedZone.verifiedAt}` : ''}
                      </p>
                    )}
                  </div>
                )}

                {/* Safe Alternative Pickups (Informational Only) */}
                {selectedZone.alternativePickups && selectedZone.alternativePickups.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold block text-emerald-700 dark:text-emerald-400">
                      Pontos Alternativos Seguros de Recolha (Sugestão Informativa):
                    </span>
                    <div className="space-y-2">
                      {selectedZone.alternativePickups.map((alt) => (
                        <div
                          key={alt.id}
                          className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 font-semibold">
                            <span>{alt.label}</span>
                            <span className="font-mono-tabular text-[11px] text-emerald-700 dark:text-emerald-300">
                              {alt.walkingDistanceMeters}m · ~{alt.walkingTimeMin} min a pé
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">{alt.streetOrLandmark}</p>
                          <p className="text-[10px] text-slate-500">{alt.safetyNote} · {alt.verifiedByDriverCount} validações</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="font-semibold block">Classificação pelo Motorista:</span>
                  <div className="flex gap-1.5">
                    {(['Favorita', 'Neutra', 'Evitar'] as MapZoneRecord['preference'][]).map((pref) => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => toggleZonePreference(selectedZone.id, pref)}
                        className={`px-2.5 py-1 rounded border text-xs font-medium ${
                          selectedZone.preference === pref
                            ? 'bg-blue-700 text-white border-blue-700'
                            : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Collaborative Zone Observations + Privacy-Consent Submission */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
              <Card className="lg:col-span-6 p-5 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  Reportar Observação de Zona ({selectedZone.name})
                </h3>
                <p className="text-slate-500">
                  Partilhe ocorrências operacionais (feiras, obras, cortes, pontos seguros). Requer consentimento explícito e é partilhado de forma anónima.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await addZoneObservation({
                      zoneId: selectedZone.id,
                      zoneName: selectedZone.name,
                      city: selectedZone.city,
                      observationType: zoneObsForm.observationType,
                      description: zoneObsForm.description,
                      timeWindow: zoneObsForm.timeWindow || undefined,
                      privacyConsent: zoneObsForm.privacyConsent,
                    });
                    if (res.ok) {
                      setZoneObsFeedback({ ok: true, text: 'Observação registada e partilhada de forma anónima no ecossistema.' });
                      setZoneObsForm((f) => ({ ...f, description: '', timeWindow: '' }));
                    } else {
                      setZoneObsFeedback({ ok: false, text: res.error ?? 'Verifique os campos obrigatórios.' });
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="zobs-type" className="block font-medium mb-1">Tipo de Ocorrência</label>
                      <select
                        id="zobs-type"
                        value={zoneObsForm.observationType}
                        onChange={(e) =>
                          setZoneObsForm((f) => ({
                            ...f,
                            observationType: e.target.value as import('../../../models/types').DriverZoneObservation['observationType'],
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        <option value="Corte / Feira / Mercado">Corte / Feira / Mercado</option>
                        <option value="Trânsito intenso">Trânsito intenso</option>
                        <option value="Obras / Desvio">Obras / Desvio</option>
                        <option value="Recolha difícil">Recolha difícil</option>
                        <option value="Ponto seguro alternativo">Ponto seguro alternativo</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="zobs-win" className="block font-medium mb-1">Janela Horária (Opcional)</label>
                      <input
                        id="zobs-win"
                        type="text"
                        placeholder="Ex: Dom 07:00–14:00"
                        value={zoneObsForm.timeWindow}
                        onChange={(e) => setZoneObsForm((f) => ({ ...f, timeWindow: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="zobs-desc" className="block font-medium mb-1">Descrição Operacional</label>
                    <textarea
                      id="zobs-desc"
                      rows={2}
                      placeholder="Ex: Acesso à praça condicionado por bancas; recolha recomendada junto à paragem lateral."
                      value={zoneObsForm.description}
                      onChange={(e) => setZoneObsForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={zoneObsForm.privacyConsent}
                      onChange={(e) => setZoneObsForm((f) => ({ ...f, privacyConsent: e.target.checked }))}
                      className="mt-0.5"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">
                      Concordo com a partilha agregada e anónima desta observação de zona, sem exposição do meu nome ou dados pessoais.
                    </span>
                  </label>
                  {zoneObsFeedback && (
                    <StatusLabel
                      tone={zoneObsFeedback.ok ? 'success' : 'danger'}
                      text={zoneObsFeedback.text}
                    />
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
                  >
                    Submeter Observação de Zona
                  </button>
                </form>
              </Card>

              <Card className="lg:col-span-6 p-5 space-y-3">
                <h3 className="text-sm font-bold">
                  Observações Colaborativas da Rede ({state.zoneObservations.length})
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {state.zoneObservations.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold">
                          {obs.zoneName} · {obs.observationType}
                        </span>
                        <StatusLabel
                          tone={obs.validationTier.startsWith('2') ? 'warning' : 'info'}
                          text={obs.validationTier}
                        />
                      </div>
                      <p className="text-slate-700 dark:text-slate-200">{obs.description}</p>
                      <p className="text-[10px] text-slate-500">
                        {obs.driverAlias} · Recorrência: {obs.recurrenceCount}x
                        {obs.timeWindow ? ` · ${obs.timeWindow}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Comando 6 §7: Radar de Tendências Históricas Horárias & Registo de Reposicionamento Real */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
              <Card className="lg:col-span-7 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Compass className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      Tendências Históricas por Zona, Horário &amp; Dia da Semana
                    </h3>
                    <p className="text-slate-500">
                      Calculado sobre viagens registadas. Nunca simula procura externa em tempo real quando não há feed oficial ativo.
                    </p>
                  </div>
                  <StatusLabel
                    tone={state.session.isDemoSession ? 'warning' : 'info'}
                    text={state.session.isDemoSession ? 'Dados de demonstração' : 'Histórico do motorista'}
                  />
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {zoneDemandTrends.map((zt) => (
                    <div
                      key={zt.zoneId}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {zt.zoneName} ({zt.city})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <StatusLabel
                            tone={
                              zt.epistemicTag === 'Informação histórica'
                                ? 'success'
                                : zt.epistemicTag === 'Dados de demonstração'
                                ? 'warning'
                                : 'info'
                            }
                            text={zt.epistemicTag}
                          />
                          <span className="px-2 py-0.5 rounded bg-blue-700 text-white font-mono-tabular font-bold">
                            Score {zt.positioningScore}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Viagens: <strong className="font-mono-tabular">{zt.completedTripsCount}</strong> · Média/h:{' '}
                        <strong className="font-mono-tabular">{formatMoney(zt.avgEurPerHour, currency)}/h</strong> · Janela pico:{' '}
                        <strong>{zt.peakHourWindow}</strong> · Dia pico: <strong>{zt.peakDayOfWeekLabel}</strong>
                      </p>
                      <p className="text-[11px] text-slate-500">{zt.positioningRecommendation}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <a
                          href={buildGoogleMapsHref(`${zt.zoneName}, ${zt.city}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:border-blue-600 font-medium"
                        >
                          <Navigation className="w-3 h-3" /> Google Maps
                        </a>
                        <a
                          href={buildWazeHref(`${zt.zoneName}, ${zt.city}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:border-blue-600 font-medium"
                        >
                          <ExternalLink className="w-3 h-3" /> Waze
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            logZoneRelocation({
                              zoneId: zt.zoneId,
                              fromZone: state.localization.currentLocation.city || 'Posição Atual',
                              targetZone: zt.zoneName,
                              suggestedReason: zt.positioningRecommendation,
                              destinationNotes: relocDestinationNotes || undefined,
                            })
                          }
                          className="px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold"
                        >
                          Registar Deslocação para Zona
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="lg:col-span-5 p-5 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  Deslocações &amp; Resultados Obtidos ({state.zoneRelocationLogs.length})
                </h3>
                <div>
                  <label htmlFor="reloc-notes" className="block font-medium mb-1">
                    Nota operacional de destino (aplicada ao próximo reposicionamento)
                  </label>
                  <input
                    id="reloc-notes"
                    type="text"
                    placeholder="Ex: Posicionar junto à saída Metro Oriente"
                    value={relocDestinationNotes}
                    onChange={(e) => setRelocDestinationNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {state.zoneRelocationLogs.length === 0 ? (
                    <p className="text-slate-500 py-3">Nenhuma deslocação estratégica registada ainda.</p>
                  ) : (
                    state.zoneRelocationLogs.map((rl) => (
                      <div
                        key={rl.id}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">
                            {rl.fromZone} → {rl.targetZone}
                          </span>
                          <StatusLabel
                            tone={
                              rl.outcome === 'Corrida obtida na zona'
                                ? 'success'
                                : rl.outcome === 'Em deslocação'
                                ? 'info'
                                : 'warning'
                            }
                            text={rl.outcome}
                          />
                        </div>
                        {rl.destinationNotes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">Nota: {rl.destinationNotes}</p>
                        )}
                        <p className="text-[10px] text-slate-500">
                          Base: {rl.epistemicBasis}
                          {rl.waitMinutesUntilRide !== undefined ? ` · Espera até corrida: ${rl.waitMinutesUntilRide} min` : ''}
                        </p>
                        {rl.outcome === 'Em deslocação' && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => completeZoneRelocationOutcome(rl.id, 'Corrida obtida na zona', 8)}
                              className="px-2 py-1 rounded bg-emerald-700 text-white font-semibold text-[11px]"
                            >
                              Corrida Obtida (~8 min)
                            </button>
                            <button
                              type="button"
                              onClick={() => completeZoneRelocationOutcome(rl.id, 'Sem corrida (reposicionado)')}
                              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px]"
                            >
                              Sem Corrida
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
            {/* Saved Places CRUD */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="p-5 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  Adicionar Local Estratégico
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newPlace.name.trim() || !newPlace.address.trim()) return;
                    addSavedPlace({
                      name: newPlace.name.trim(),
                      type: newPlace.type,
                      address: newPlace.address.trim(),
                      zone: newPlace.zone.trim() || state.localization.currentLocation.city,
                      isFavorite: false,
                      notes: newPlace.notes.trim() || undefined,
                    });
                    setNewPlace((p) => ({ ...p, name: '', address: '', notes: '' }));
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <input
                    type="text"
                    aria-label="Nome do local"
                    placeholder="Ex: Supercharger Parque das Nações"
                    value={newPlace.name}
                    onChange={(e) => setNewPlace((p) => ({ ...p, name: e.target.value }))}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <select
                    aria-label="Categoria do local"
                    value={newPlace.type}
                    onChange={(e) =>
                      setNewPlace((p) => ({ ...p, type: e.target.value as SavedPlace['type'] }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {['Casa', 'Garagem', 'Carregamento EV', 'Combustível', 'Refeição', 'Descanso', 'Oficina'].map(
                      (cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      )
                    )}
                  </select>
                  <input
                    type="text"
                    aria-label="Morada do local"
                    placeholder="Morada completa"
                    value={newPlace.address}
                    onChange={(e) => setNewPlace((p) => ({ ...p, address: e.target.value }))}
                    className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-2 py-2 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
                  >
                    Guardar Local no Ecossistema
                  </button>
                </form>
              </Card>

              <div className="space-y-3">
                {state.savedPlaces.map((pl) => (
                  <Card key={pl.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                            {pl.type}
                          </span>
                          <h4 className="text-sm font-bold">{pl.name}</h4>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                          {pl.address} ({pl.zone})
                        </p>
                        {pl.notes && <p className="text-slate-500 mt-0.5">{pl.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Favoritar ${pl.name}`}
                          onClick={() => togglePlaceFavorite(pl.id)}
                          className={`p-1.5 rounded-lg border ${
                            pl.isFavorite
                              ? 'border-amber-400 text-amber-500 bg-amber-50 dark:bg-amber-950/30'
                              : 'border-slate-200 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${pl.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remover ${pl.name}`}
                          onClick={() => deleteSavedPlace(pl.id)}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <a
                        href={buildGoogleMapsHref(pl.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-700 text-white font-semibold"
                      >
                        <Navigation className="w-3 h-3" /> Google Maps
                      </a>
                      <a
                        href={buildWazeHref(pl.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" /> Waze
                      </a>
                      <button
                        type="button"
                        onClick={() => copyAddress(pl.id, pl.address)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 font-medium"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedAddrKey === pl.id ? 'Copiado!' : 'Copiar endereço'}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Routine Preferences Wired to AI CORE */}
            <Card className="lg:col-span-5 p-5 space-y-4 h-fit">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  Preferências de Rotina (Ligadas ao AI CORE)
                </h3>
                {routineSavedMsg && <StatusLabel tone="success" text="Guardado" />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rt-start" className="block font-medium mb-1">Início Preferido</label>
                  <input
                    id="rt-start"
                    type="time"
                    value={routine.preferredShiftStart}
                    onChange={(e) => {
                      updateRoutinePreferences({ preferredShiftStart: e.target.value });
                      setRoutineSavedMsg(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="rt-end" className="block font-medium mb-1">Fim de Turno</label>
                  <input
                    id="rt-end"
                    type="time"
                    value={routine.preferredShiftEnd}
                    onChange={(e) => {
                      updateRoutinePreferences({ preferredShiftEnd: e.target.value });
                      setRoutineSavedMsg(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="rt-gar" className="block font-medium mb-1">Fecho Garagem</label>
                  <input
                    id="rt-gar"
                    type="time"
                    value={routine.garageClosingTime}
                    onChange={(e) => {
                      updateRoutinePreferences({ garageClosingTime: e.target.value });
                      setRoutineSavedMsg(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="rt-goal" className="block font-medium mb-1">Meta Líq. Diária ({symbol})</label>
                  <input
                    id="rt-goal"
                    type="number"
                    value={routine.dailyNetTargetEur}
                    onChange={(e) => {
                      updateRoutinePreferences({ dailyNetTargetEur: Number(e.target.value) });
                      setRoutineSavedMsg(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="rt-meal" className="block font-medium mb-1">Janela Refeição</label>
                  <input
                    id="rt-meal"
                    type="text"
                    value={routine.preferredMealWindow}
                    onChange={(e) => {
                      updateRoutinePreferences({ preferredMealWindow: e.target.value });
                      setRoutineSavedMsg(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="rt-bat" className="block font-medium mb-1">Reserva Mín. (%)</label>
                  <input
                    id="rt-bat"
                    type="number"
                    min={5}
                    max={50}
                    value={routine.minBatteryReservePct}
                    onChange={(e) => {
                      updateRoutinePreferences({ minBatteryReservePct: Number(e.target.value) });
                      setRoutineSavedMsg(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="rt-endbase" className="block font-medium mb-1">Base / Garagem de Regresso</label>
                <select
                  id="rt-endbase"
                  value={routine.endBasePlaceId ?? ''}
                  onChange={(e) => {
                    updateRoutinePreferences({ endBasePlaceId: e.target.value });
                    setRoutineSavedMsg(true);
                  }}
                  className="w-full px-2.5 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {state.savedPlaces.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} ({pl.type})
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================
  // CAMPANHAS
  // ==========================================================
  if (activeTab === 'campanhas') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Central de Campanhas & Rentabilidade Incremental"
          description="Calcula o custo adicional estimado e o ganho líquido incremental de cada missão antes de se comprometer. Ligado ao Planeador e Financeiro."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.campaigns.map((c) => {
            const pct = Math.min(100, Math.round((c.completedTrips / c.targetTrips) * 100));
            const remainingTrips = Math.max(0, c.targetTrips - c.completedTrips);
            const incrementalNet = c.rewardEur - c.estimatedExtraCostEur;
            const plat = state.platforms.find((p) => p.id === c.platformId);
            return (
              <Card key={c.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <PlatformBadge
                      platformId={c.platformId}
                      name={plat?.name ?? c.platformId}
                      shortCode={plat?.shortCode}
                      brandColor={plat?.brandColor}
                      size="sm"
                    />
                    <div>
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                        {plat?.name ?? c.platformId.toUpperCase()} · {c.zone}
                      </span>
                      <h3 className="text-base font-bold">{c.name}</h3>
                    </div>
                  </div>
                  <StatusLabel tone={c.status === 'Ativa' ? 'success' : 'neutral'} text={c.status} />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{c.requirements}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-mono-tabular">
                    <span>Progresso: {c.completedTrips}/{c.targetTrips} viagens ({remainingTrips} em falta)</span>
                    <span className="font-bold">Recompensa: {formatMoney(c.rewardEur, currency)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block">Custo Adicional Est.</span>
                    <span className="font-mono-tabular font-semibold">{formatMoney(c.estimatedExtraCostEur, currency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Líquido Incremental</span>
                    <span className="font-mono-tabular font-bold text-emerald-700 dark:text-emerald-400">
                      {formatMoney(incrementalNet, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fonte</span>
                    <span>{c.source}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Adicionar Nova Campanha Manualmente
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!campForm.name.trim()) return;
              addCampaign({
                ...campForm,
                completedTrips: 0,
                periodStart: todayIso,
                periodEnd: nextWeekIso,
                status: 'Ativa',
                source: 'Manual',
              });
            }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
          >
            <div>
              <label htmlFor="cmp-plat" className="block mb-1 font-medium">Plataforma</label>
              <select
                id="cmp-plat"
                value={campForm.platformId}
                onChange={(e) => setCampForm((f) => ({ ...f, platformId: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {visibleDriverPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cmp-name" className="block mb-1 font-medium">Nome</label>
              <input
                id="cmp-name"
                type="text"
                value={campForm.name}
                onChange={(e) => setCampForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="cmp-rew" className="block mb-1 font-medium">Prémio ({symbol})</label>
              <input
                id="cmp-rew"
                type="number"
                value={campForm.rewardEur}
                onChange={(e) => setCampForm((f) => ({ ...f, rewardEur: Number(e.target.value) }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                Registar Campanha
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ==========================================================
  // UBER PRO & BOLT SCORE (ISOLADOS)
  // ==========================================================
  if (activeTab === 'desempenho-uber') {
    const uberTrips = state.trips.filter(
      (t) => t.platformId === 'uber' && isCompletedTripStatus(t.status)
    );
    const uberGross = uberTrips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0);
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Desempenho Uber & Uber Pro (Regras Independentes)"
          description="Módulo dedicado exclusivamente à estrutura Uber Pro (níveis, pontos, classificação, elogios e cancelamentos), sem misturar regras da Bolt ou de outras apps."
          demoNotice="Sincronização direta Uber: INTEGRAÇÃO A VALIDAR"
        />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Nível Uber Pro (Demo)"
            value="Platina"
            subtext="842 / 1.000 pts para Diamante"
            explanation="Progressão baseada em viagens realizadas e horários de pico conforme critérios Uber Pro."
            formula="Pontos registados ÷ Limiar do nível"
            accent="blue"
          />
          <MetricCard
            label="Classificação Média"
            value="4.94 ★"
            subtext="142 elogios · 0 ocorrências"
            explanation="Média móvel das últimas 500 viagens avaliadas."
            formula="Σ avaliações ÷ total de viagens avaliadas"
          />
          <MetricCard
            label="Taxa de Cancelamento"
            value="2.1%"
            subtext="Dentro do limite Uber Pro (≤ 4%)"
            explanation="Percentagem de viagens canceladas pelo motorista após aceitação."
            formula="Cancelamentos ÷ Viagens aceites"
          />
          <MetricCard
            label="Faturação Uber Registada"
            value={formatMoney(uberGross, currency)}
            subtext={`${uberTrips.length} viagens concluídas no histórico`}
            explanation="Receita total apurada nas viagens Uber concluídas."
            formula="Σ (Bruto + Gorjetas + Bónus Uber)"
          />
        </div>
        <Card className="p-5 space-y-2 text-xs">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Benefícios e Recomendações Uber Pro
          </h3>
          <p className="text-slate-600 dark:text-slate-300">
            • Mantenha cancelamentos abaixo de 4% para preservar a visualização prévia de direção e duração.
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            • Faltam 158 pontos até ao nível Diamante. Os horários entre 17h e 21h atribuem pontuação multiplicada.
          </p>
        </Card>
      </div>
    );
  }

  if (activeTab === 'desempenho-bolt') {
    const boltTrips = state.trips.filter(
      (t) => t.platformId === 'bolt' && isCompletedTripStatus(t.status)
    );
    const boltGross = boltTrips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0);
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Desempenho Bolt (Módulo Isolado)"
          description="Monitoriza pontuação de atividade, viagens agendadas, categorias Comfort/Green e campanhas Bolt de forma independente."
          demoNotice="Sincronização direta Bolt: INTEGRAÇÃO A VALIDAR"
        />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Driver Score Bolt (Demo)"
            value="93%"
            subtext="Elegível para viagens agendadas"
            explanation="Pontuação composta Bolt baseada em aceitação, conclusão e avaliações."
            formula="Índice interno conforme regras Bolt"
            accent="blue"
          />
          <MetricCard
            label="Viagens Bolt Concluídas"
            value={`${boltTrips.length}`}
            subtext={`${formatMoney(boltGross, currency)} acumulados`}
            explanation="Total de viagens Bolt concluídas no período registado."
            formula="Contagem de viagens Bolt concluídas"
          />
          <MetricCard
            label="Cancelamentos Bolt"
            value="1.4%"
            subtext="Abaixo do limiar de alerta (5%)"
            explanation="Proporção de cancelamentos atribuídos ao motorista."
            formula="Cancelamentos Bolt ÷ Aceites Bolt"
          />
          <MetricCard
            label="Categorias Ativas"
            value="3"
            subtext="Bolt, Bolt Green, Bolt Comfort"
            explanation="Categorias habilitadas para o veículo ativo."
            formula="Elegibilidade comercial Bolt"
          />
        </div>
      </div>
    );
  }

  // ==========================================================
  // AGENDA & TURNOS
  // ==========================================================
  if (activeTab === 'agenda-turnos') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Agenda, Turnos & Linha Temporal Auditável"
          description="Registe início, fim, pausas, refeições, descanso, tempo online, produtivo e espera. Todas as alterações mantêm trilha auditável (complementa o Tacógrafo TVDE)."
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedFilter
            value={calendarView}
            onChange={(v) => setCalendarView(v as 'diario' | 'semanal' | 'mensal')}
            options={[
              { id: 'diario', label: 'Vista Diária' },
              { id: 'semanal', label: 'Vista Semanal' },
              { id: 'mensal', label: 'Vista Mensal' },
            ]}
          />
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDriverNav('planeador')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 font-medium"
            >
              Planeador de Metas
            </button>
            <button
              type="button"
              onClick={() => setDriverNav('locais-rotas')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 font-medium"
            >
              Locais &amp; Rotina
            </button>
          </div>
        </div>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Registar Turno na Linha Temporal
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addShift({
                ...shiftForm,
                emptyKm: Math.max(0, shiftForm.totalKm - shiftForm.passengerKm),
                vehicleId: activeVehicle.id,
              });
            }}
            className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs"
          >
            <div>
              <label htmlFor="sh-date" className="block mb-1 font-medium">Data</label>
              <input
                id="sh-date"
                type="date"
                value={shiftForm.date}
                onChange={(e) => setShiftForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="sh-start" className="block mb-1 font-medium">Início</label>
              <input
                id="sh-start"
                type="time"
                value={shiftForm.startTime}
                onChange={(e) => setShiftForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="sh-end" className="block mb-1 font-medium">Fim</label>
              <input
                id="sh-end"
                type="time"
                value={shiftForm.endTime}
                onChange={(e) => setShiftForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="sh-km" className="block mb-1 font-medium">Km Totais</label>
              <input
                id="sh-km"
                type="number"
                value={shiftForm.totalKm}
                onChange={(e) => setShiftForm((f) => ({ ...f, totalKm: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                Guardar Turno
              </button>
            </div>
          </form>
        </Card>

        <div className="space-y-3">
          {state.shifts.map((s) => (
            <Card key={s.id} className="p-4 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold font-mono-tabular">
                  {s.date} · {s.startTime} – {s.endTime} ({calendarView})
                </span>
                <span className="font-mono-tabular text-slate-600 dark:text-slate-300">
                  Online: {s.onlineMinutes}m · Produtivo: {s.productiveMinutes}m · Espera: {s.waitMinutes}m · Pausas/Refeições: {s.breakMinutes + s.mealMinutes}m
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                <span>
                  Totais: {formatDistance(s.totalKm, unitSystem)} (Passageiro:{' '}
                  {formatDistance(s.passengerKm, unitSystem)} · Vazio:{' '}
                  {formatDistance(s.emptyKm, unitSystem)})
                </span>
                {editingShiftId === s.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        updateShiftNotes(s.id, editingNotes);
                        setEditingShiftId(null);
                      }}
                      className="px-2.5 py-1 rounded bg-blue-700 text-white font-medium"
                    >
                      Gravar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingShiftId(s.id);
                      setEditingNotes(s.notes);
                    }}
                    className="text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    Editar nota ({s.notes})
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Auditoria: {s.auditHistory[s.auditHistory.length - 1]?.change}
              </p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // PLANEADOR INTELIGENTE
  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="Planeador Inteligente com Recálculo Dinâmico"
        description="Ajuste meta líquida, dias, horas, pausas e necessidades de carregamento. O plano recalcula automaticamente com base no histórico concluído real."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5 p-5 space-y-4 text-xs">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Parâmetros do Objetivo ({currency})
          </h2>
          <div>
            <label htmlFor="pl-target" className="block font-medium mb-1">Meta Líquida ({symbol})</label>
            <input
              id="pl-target"
              type="number"
              value={plannerInput.targetNetEur}
              onChange={(e) => setPlannerInput((p) => ({ ...p, targetNetEur: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pl-days" className="block font-medium mb-1">Dias disponíveis</label>
              <input
                id="pl-days"
                type="number"
                min={1}
                max={31}
                value={plannerInput.availableDays}
                onChange={(e) => setPlannerInput((p) => ({ ...p, availableDays: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="pl-hrs" className="block font-medium mb-1">Horas por dia</label>
              <input
                id="pl-hrs"
                type="number"
                step="0.5"
                min={1}
                max={14}
                value={plannerInput.hoursPerDay}
                onChange={(e) => setPlannerInput((p) => ({ ...p, hoursPerDay: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
          </div>
          <div>
            <label htmlFor="pl-brk" className="block font-medium mb-1">Pausas por dia (min)</label>
            <input
              id="pl-brk"
              type="number"
              value={plannerInput.breakMinutesPerDay}
              onChange={(e) => setPlannerInput((p) => ({ ...p, breakMinutesPerDay: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <label className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={plannerInput.needsChargingStops}
              onChange={(e) => setPlannerInput((p) => ({ ...p, needsChargingStops: e.target.checked }))}
            />
            <span>Incluir paragens de carregamento ({activeVehicle.brand} {activeVehicle.model})</span>
          </label>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            {planResult.disclaimer}
          </p>
        </Card>

        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Em Falta para Meta"
              value={formatMoney(planResult.remainingNetEur, currency)}
              subtext={`Já acumulado: ${formatMoney(earnedSoFar, currency)}`}
              explanation="Diferença entre a meta líquida pretendida e o valor líquido concluído."
              formula="Meta Líquida - Líquido Acumulado"
              accent="blue"
            />
            <MetricCard
              label="Média Bruta Exigida"
              value={`${formatMoney(planResult.requiredGrossPerHour, currency)}/h`}
              subtext={`Em ${planResult.totalProductiveHours}h produtivas`}
              explanation="Faturação horária bruta média necessária para cobrir custos e atingir a meta."
              formula="(Meta Restante + Custos Est.) ÷ Horas Produtivas"
            />
            <MetricCard
              label="Carregamentos & Custos"
              value={`${planResult.chargingStopsRecommended} paragens`}
              subtext={`${formatMoney(planResult.estimatedEnergyOrFuelCostEur, currency)} energia/manutenção`}
              explanation="Paragens recomendadas consoante autonomia real e consumo do veículo ativo."
              formula="Distância Estimada ÷ (75% Autonomia)"
            />
          </div>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold">
              Cenários de Previsão (Base Histórica: {formatMoney(historicalAvgRate, currency)}/h)
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {planResult.scenarios.map((sc) => (
                <div key={sc.name} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{sc.name}</p>
                    <p className="text-slate-500 font-mono-tabular">
                      Média assumida: {formatMoney(sc.grossPerHour, currency)}/h
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono-tabular font-bold">
                      {formatMoney(sc.projectedNetEur, currency)}
                    </p>
                    <StatusLabel
                      tone={sc.feasible ? 'success' : 'warning'}
                      text={sc.feasible ? 'Atinge meta' : 'Abaixo da meta'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
