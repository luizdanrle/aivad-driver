import type {
  AutoPilotConfig,
  CancellationBy,
  DataScopeFilter,
  DateRangePreset,
  DriverRoutinePreferences,
  ExpenseRecord,
  FinancialCostConfig,
  PlatformRecord,
  ProposalRecord,
  TachographStateStore,
  TripRecord,
  VehicleRecord,
} from '../models/types';
import {
  computeFinancialSummary,
  computeVehicleOwnershipTcoPerKm,
  isCompletedTripStatus,
  round2,
} from './intelligence';
import { consolidateMultiPlatformJornada, evaluateRolling24hCompliance } from './tachograph';

export interface ResolvedDatePeriod {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  prevStartDate: string;
  prevEndDate: string;
  daysCount: number;
  label: string;
  prevLabel: string;
}

function addDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function diffDaysInclusive(startIso: string, endIso: string): number {
  const s = Date.parse(`${startIso}T00:00:00Z`);
  const e = Date.parse(`${endIso}T00:00:00Z`);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return 1;
  return Math.floor((e - s) / 86400000) + 1;
}

export function resolveDateRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  refDateIso = new Date().toISOString().slice(0, 10)
): ResolvedDatePeriod {
  const today = refDateIso.slice(0, 10);
  const [y, m, d] = today.split('-').map(Number);
  const refUtc = new Date(Date.UTC(y, (m || 1) - 1, d || 1));

  let startDate = today;
  let endDate = today;
  let label = 'Hoje';

  switch (preset) {
    case 'hoje':
      startDate = today;
      endDate = today;
      label = 'Hoje';
      break;
    case 'ontem':
      startDate = addDays(today, -1);
      endDate = startDate;
      label = 'Ontem';
      break;
    case 'ultimos_7_dias':
      startDate = addDays(today, -6);
      endDate = today;
      label = 'Últimos 7 dias';
      break;
    case 'esta_semana': {
      const dow = refUtc.getUTCDay(); // 0=Sun..6=Sat
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      startDate = addDays(today, mondayOffset);
      endDate = today;
      label = 'Esta semana (Seg–Hoje)';
      break;
    }
    case 'ultimos_30_dias':
      startDate = addDays(today, -29);
      endDate = today;
      label = 'Últimos 30 dias';
      break;
    case 'este_mes':
      startDate = `${today.slice(0, 7)}-01`;
      endDate = today;
      label = 'Este mês';
      break;
    case 'mes_anterior': {
      const prevMonthEnd = new Date(Date.UTC(y, (m || 1) - 1, 0));
      const prevMonthStart = new Date(Date.UTC(prevMonthEnd.getUTCFullYear(), prevMonthEnd.getUTCMonth(), 1));
      startDate = prevMonthStart.toISOString().slice(0, 10);
      endDate = prevMonthEnd.toISOString().slice(0, 10);
      label = 'Mês anterior';
      break;
    }
    case 'este_ano':
      startDate = `${today.slice(0, 4)}-01-01`;
      endDate = today;
      label = 'Este ano';
      break;
    case 'personalizado': {
      const cStart = customStart && /^\d{4}-\d{2}-\d{2}$/.test(customStart) ? customStart : addDays(today, -6);
      const cEnd = customEnd && /^\d{4}-\d{2}-\d{2}$/.test(customEnd) ? customEnd : today;
      startDate = cStart <= cEnd ? cStart : cEnd;
      endDate = cStart <= cEnd ? cEnd : cStart;
      label = `${startDate} a ${endDate}`;
      break;
    }
  }

  const daysCount = diffDaysInclusive(startDate, endDate);
  const prevEndDate = addDays(startDate, -1);
  const prevStartDate = addDays(prevEndDate, -(daysCount - 1));

  return {
    preset,
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    daysCount,
    label,
    prevLabel: `${prevStartDate} a ${prevEndDate}`,
  };
}

export function filterRecordsByDateAndScope<T extends { date: string; isDemo?: boolean }>(
  records: T[],
  startDate: string,
  endDate: string,
  dataScope: DataScopeFilter
): T[] {
  return records.filter((r) => {
    if (r.date < startDate || r.date > endDate) return false;
    if (dataScope === 'real' && r.isDemo) return false;
    if (dataScope === 'demo' && !r.isDemo) return false;
    return true;
  });
}

export interface PeriodDeltaMetric {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number | null;
}

export function computePeriodDelta(current: number, previous: number): PeriodDeltaMetric {
  const delta = round2(current - previous);
  const deltaPct = previous > 0 ? round2(((current - previous) / previous) * 100) : null;
  return { current: round2(current), previous: round2(previous), delta, deltaPct };
}

export interface ReportFilterOptions {
  preset: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  dataScope: DataScopeFilter;
  platformId?: string;
  category?: string;
  tripStatusFilter?: string;
  refDateIso?: string;
}

export interface ComprehensiveReportsBundle {
  period: ResolvedDatePeriod;
  dataScope: DataScopeFilter;
  filteredTrips: TripRecord[];
  completedTrips: TripRecord[];
  excludedTrips: TripRecord[];
  filteredExpenses: ExpenseRecord[];
  // 1. General & Period Comparison
  summary: ReturnType<typeof computeFinancialSummary>;
  previousSummary: ReturnType<typeof computeFinancialSummary>;
  comparison: {
    totalRevenue: PeriodDeltaMetric;
    netEstimated: PeriodDeltaMetric;
    tripCount: PeriodDeltaMetric;
    avgPerHour: PeriodDeltaMetric;
    avgPerKm: PeriodDeltaMetric;
  };
  // 2. Por Plataforma
  byPlatform: Array<{
    platformId: string;
    platformName: string;
    color: string;
    tripsCount: number;
    cancelledCount: number;
    grossEur: number;
    tipsEur: number;
    bonusEur: number;
    commissionsEur: number;
    netEur: number;
    eurPerHour: number;
    eurPerKm: number;
    trips: TripRecord[];
  }>;
  // 3. Estados das Viagens + Cancelamentos
  byStatus: Array<{
    status: string;
    count: number;
    estimatedGrossLostEur: number;
    compensationEur: number;
    trips: TripRecord[];
  }>;
  cancellations: {
    totalCancelledOrLost: number;
    byActor: Record<CancellationBy, { count: number; estimatedLostGrossEur: number; compensationEur: number; trips: TripRecord[] }>;
    noShowCount: number;
    avgWaitBeforeCancelMin: number;
    totalCompensationEur: number;
    rejectedCount: number;
    expiredCount: number;
    officialImpactCaveat: string;
  };
  // 4. Financeiro Avançado (Estimado vs Cobrado & Config Custos)
  financialDetailed: {
    grossRevenueEur: number;
    estimatedTripsSumEur: number;
    chargedTripsSumEur: number;
    varianceChargedVsEstimatedEur: number;
    commissionsDeductedEur: number;
    estimatedVehicleCostDeductedEur: number;
    fixedOwnershipDeductedEur: number;
    tollsDeductedEur: number;
    loggedExpensesDeductedEur: number;
    taxReserveDeductedEur: number;
    configuredNetEur: number;
    costConfigApplied: FinancialCostConfig;
  };
  // 5. Rentabilidade por Horário, Zona, Categoria
  profitability: {
    byHourSlot: Array<{ slot: string; tripsCount: number; revenueEur: number; netEur: number; eurPerHour: number; trips: TripRecord[] }>;
    byZone: Array<{ zone: string; tripsCount: number; revenueEur: number; netEur: number; avgTicketEur: number; trips: TripRecord[] }>;
    byCategory: Array<{ category: string; tripsCount: number; revenueEur: number; netEur: number; eurPerKm: number; trips: TripRecord[] }>;
  };
  // 6. Estratégia & IA
  strategyAndAi: {
    strategyMode: string;
    totalProposalsEvaluated: number;
    acceptedProposals: number;
    rejectedProposals: number;
    adjustmentsCount: number;
    predictedVsActualTrips: Array<{
      tripId: string;
      externalRef: string;
      predictedNetEur: number;
      actualNetEur: number;
      deltaNetEur: number;
    }>;
    avgNetPredictionDeltaEur: number | null;
  };
  // 7. Atividade TVDE (Tacógrafo)
  tvdeActivity: {
    rolling24h: ReturnType<typeof evaluateRolling24hCompliance>;
    consolidated: ReturnType<typeof consolidateMultiPlatformJornada>;
  };
  // 8. Veículo & Energia
  vehicleAndEnergy: {
    activeVehicleName: string;
    homologatedRangeKm: number;
    realRangeKm: number;
    tcoPerKmEur: number;
    energyLoggedExpensesEur: number;
    totalKmInPeriod: number;
    emptyKmPct: number;
  };
  // 9. Metas & Projeção
  goalsAndProjection: {
    dailyTargetEur: number;
    weeklyTargetEur: number;
    monthlyTargetEur: number;
    currentDailyEquivalentNetEur: number;
    currentPeriodNetEur: number;
    progressPctOfPeriodTarget: number;
    conservativeProjectedMonthEur: number;
    baseProjectedMonthEur: number;
    optimizedProjectedMonthEur: number;
    isSampleThin: boolean;
    projectionCaveat: string;
  };
}

export function buildComprehensiveReports(params: {
  trips: TripRecord[];
  expenses: ExpenseRecord[];
  proposals: ProposalRecord[];
  platforms: PlatformRecord[];
  vehicles: VehicleRecord[];
  tachograph: TachographStateStore;
  routine: DriverRoutinePreferences;
  autoPilot: AutoPilotConfig;
  costConfig: FinancialCostConfig;
  filters: ReportFilterOptions;
}): ComprehensiveReportsBundle {
  const period = resolveDateRange(
    params.filters.preset,
    params.filters.customStart,
    params.filters.customEnd,
    params.filters.refDateIso
  );

  const scopeFilter = <T extends { date: string; isDemo?: boolean }>(items: T[], s: string, e: string) =>
    filterRecordsByDateAndScope(items, s, e, params.filters.dataScope);

  const matchDimension = (t: TripRecord) => {
    if (params.filters.platformId && params.filters.platformId !== 'ALL' && t.platformId !== params.filters.platformId) {
      return false;
    }
    if (params.filters.category && params.filters.category !== 'ALL' && t.category !== params.filters.category) {
      return false;
    }
    if (params.filters.tripStatusFilter && params.filters.tripStatusFilter !== 'ALL') {
      if (params.filters.tripStatusFilter === 'COMPLETED' && !isCompletedTripStatus(t.status)) return false;
      if (params.filters.tripStatusFilter === 'CANCELLED' && isCompletedTripStatus(t.status)) return false;
      if (
        params.filters.tripStatusFilter !== 'COMPLETED' &&
        params.filters.tripStatusFilter !== 'CANCELLED' &&
        t.status !== params.filters.tripStatusFilter
      ) {
        return false;
      }
    }
    return true;
  };

  const filteredTrips = scopeFilter(params.trips, period.startDate, period.endDate).filter(matchDimension);
  const prevTrips = scopeFilter(params.trips, period.prevStartDate, period.prevEndDate).filter(matchDimension);

  const filteredExpenses = scopeFilter(params.expenses, period.startDate, period.endDate);
  const prevExpenses = scopeFilter(params.expenses, period.prevStartDate, period.prevEndDate);

  const completedTrips = filteredTrips.filter((t) => isCompletedTripStatus(t.status));
  const excludedTrips = filteredTrips.filter((t) => !isCompletedTripStatus(t.status));

  const summary = computeFinancialSummary(filteredTrips, filteredExpenses);
  const previousSummary = computeFinancialSummary(prevTrips, prevExpenses);

  const comparison = {
    totalRevenue: computePeriodDelta(summary.totalRevenue, previousSummary.totalRevenue),
    netEstimated: computePeriodDelta(summary.netEstimated, previousSummary.netEstimated),
    tripCount: computePeriodDelta(summary.tripCount, previousSummary.tripCount),
    avgPerHour: computePeriodDelta(summary.avgPerHour, previousSummary.avgPerHour),
    avgPerKm: computePeriodDelta(summary.avgPerKm, previousSummary.avgPerKm),
  };

  // 2. Por Plataforma
  const platIds = Array.from(new Set(filteredTrips.map((t) => t.platformId)));
  const byPlatform = platIds
    .map((pid) => {
      const pMeta = params.platforms.find((p) => p.id === pid);
      const pTrips = filteredTrips.filter((t) => t.platformId === pid);
      const pComp = pTrips.filter((t) => isCompletedTripStatus(t.status));
      const pCanc = pTrips.filter((t) => !isCompletedTripStatus(t.status));
      const grossEur = round2(pComp.reduce((s, t) => s + t.grossEur, 0));
      const tipsEur = round2(pComp.reduce((s, t) => s + t.tipEur, 0));
      const bonusEur = round2(pComp.reduce((s, t) => s + t.bonusEur, 0));
      const commissionsEur = round2(pComp.reduce((s, t) => s + t.commissionEur, 0));
      const netEur = round2(pComp.reduce((s, t) => s + t.netEur, 0));
      const hours = pComp.reduce((s, t) => s + t.durationMin, 0) / 60;
      const kms = pComp.reduce((s, t) => s + t.pickupDistanceKm + t.tripDistanceKm, 0);
      return {
        platformId: pid,
        platformName: pMeta?.name ?? pid.toUpperCase(),
        color: pMeta?.brandColor ?? '#1D4ED8',
        tripsCount: pComp.length,
        cancelledCount: pCanc.length,
        grossEur,
        tipsEur,
        bonusEur,
        commissionsEur,
        netEur,
        eurPerHour: hours > 0 ? round2((grossEur + tipsEur + bonusEur) / hours) : 0,
        eurPerKm: kms > 0 ? round2((grossEur + tipsEur + bonusEur) / kms) : 0,
        trips: pTrips,
      };
    })
    .sort((a, b) => b.netEur - a.netEur);

  // 3. Estados & Cancelamentos
  const statusMap = new Map<string, TripRecord[]>();
  for (const t of filteredTrips) {
    const arr = statusMap.get(t.status) ?? [];
    arr.push(t);
    statusMap.set(t.status, arr);
  }
  const byStatus = Array.from(statusMap.entries()).map(([status, trips]) => ({
    status,
    count: trips.length,
    estimatedGrossLostEur: round2(trips.reduce((s, t) => s + t.grossEur, 0)),
    compensationEur: round2(trips.reduce((s, t) => s + (t.cancellationCompensationEur ?? 0), 0)),
    trips,
  }));

  const byActor: Record<
    CancellationBy,
    { count: number; estimatedLostGrossEur: number; compensationEur: number; trips: TripRecord[] }
  > = {
    Passageiro: { count: 0, estimatedLostGrossEur: 0, compensationEur: 0, trips: [] },
    Motorista: { count: 0, estimatedLostGrossEur: 0, compensationEur: 0, trips: [] },
    Plataforma: { count: 0, estimatedLostGrossEur: 0, compensationEur: 0, trips: [] },
    Desconhecida: { count: 0, estimatedLostGrossEur: 0, compensationEur: 0, trips: [] },
  };
  let noShowCount = 0;
  let rejectedCount = 0;
  let expiredCount = 0;
  let waitSumSec = 0;
  let waitCount = 0;
  let totalCompensationEur = 0;

  for (const t of excludedTrips) {
    if (t.status === 'Passageiro não compareceu' || t.driverNoShowConfirmed) noShowCount++;
    if (t.status === 'Rejeitada') rejectedCount++;
    if (t.status === 'Ignorada ou expirada') expiredCount++;
    const actor: CancellationBy =
      t.cancellationBy ??
      (t.status === 'Cancelada pelo passageiro' || t.status === 'Passageiro não compareceu'
        ? 'Passageiro'
        : t.status === 'Cancelada pelo motorista' || t.status === 'Rejeitada'
        ? 'Motorista'
        : 'Desconhecida');
    byActor[actor].count++;
    byActor[actor].estimatedLostGrossEur = round2(byActor[actor].estimatedLostGrossEur + t.grossEur);
    byActor[actor].compensationEur = round2(byActor[actor].compensationEur + (t.cancellationCompensationEur ?? 0));
    byActor[actor].trips.push(t);
    totalCompensationEur = round2(totalCompensationEur + (t.cancellationCompensationEur ?? 0));
    if (t.waitAtPickupSeconds && t.waitAtPickupSeconds > 0) {
      waitSumSec += t.waitAtPickupSeconds;
      waitCount++;
    }
  }

  // 4. Financeiro Detalhado com Cost Config
  const activeVehicle = params.vehicles.find((v) => v.isActiveDriverVehicle) ?? params.vehicles[0];
  const tco = activeVehicle
    ? computeVehicleOwnershipTcoPerKm(activeVehicle, params.costConfig.monthlyKmEstimate)
    : { energyCostPerKmEur: 0.04, maintenancePerKmEur: 0.04, fixedOwnershipPerKmEur: 0.14, totalEstimatedCostPerKmEur: 0.22, ownershipLabel: 'Padrão' };

  const estimatedTripsSumEur = round2(
    completedTrips.reduce((s, t) => s + (t.estimatedGrossEur ?? t.grossEur), 0)
  );
  const chargedTripsSumEur = round2(
    completedTrips.reduce((s, t) => s + (t.chargedTotalEur ?? t.grossEur + t.tipEur + t.bonusEur), 0)
  );
  const commissionsDeductedEur = params.costConfig.includeCommissions ? summary.commissionsTotal : 0;
  const estimatedVehicleCostDeductedEur = params.costConfig.includeEstimatedVehicleCost ? summary.tripOpCost : 0;
  const fixedOwnershipDeductedEur = params.costConfig.includeFixedOwnership
    ? round2(summary.totalKm * tco.fixedOwnershipPerKmEur)
    : 0;
  const tollsDeductedEur = params.costConfig.includeTolls ? summary.tollsTotal : 0;
  const loggedExpensesDeductedEur = params.costConfig.includeLoggedExpenses ? summary.loggedExpenses : 0;
  const preTaxNet =
    summary.totalRevenue -
    commissionsDeductedEur -
    estimatedVehicleCostDeductedEur -
    fixedOwnershipDeductedEur -
    tollsDeductedEur -
    loggedExpensesDeductedEur;
  const taxReserveDeductedEur =
    params.costConfig.includeTaxesReservePct > 0 && preTaxNet > 0
      ? round2(preTaxNet * (params.costConfig.includeTaxesReservePct / 100))
      : 0;
  const configuredNetEur = round2(preTaxNet - taxReserveDeductedEur);

  // 5. Rentabilidade por horário, zona e categoria
  const slotDefs = [
    { label: '00:00 – 06:59 (Madrugada)', check: (h: number) => h < 7 },
    { label: '07:00 – 11:59 (Pico Manhã)', check: (h: number) => h >= 7 && h < 12 },
    { label: '12:00 – 16:59 (Tarde)', check: (h: number) => h >= 12 && h < 17 },
    { label: '17:00 – 21:59 (Pico Fim Tarde)', check: (h: number) => h >= 17 && h < 22 },
    { label: '22:00 – 23:59 (Noite)', check: (h: number) => h >= 22 },
  ];
  const byHourSlot = slotDefs.map((sl) => {
    const slotTrips = completedTrips.filter((t) => {
      const hh = Number(t.time.split(':')[0] ?? 12);
      return sl.check(Number.isFinite(hh) ? hh : 12);
    });
    const rev = round2(slotTrips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0));
    const net = round2(slotTrips.reduce((s, t) => s + t.netEur, 0));
    const hrs = slotTrips.reduce((s, t) => s + t.durationMin, 0) / 60;
    return {
      slot: sl.label,
      tripsCount: slotTrips.length,
      revenueEur: rev,
      netEur: net,
      eurPerHour: hrs > 0 ? round2(rev / hrs) : 0,
      trips: slotTrips,
    };
  });

  const zoneGroups = new Map<string, TripRecord[]>();
  const catGroups = new Map<string, TripRecord[]>();
  for (const t of completedTrips) {
    const zArr = zoneGroups.get(t.pickupZone) ?? [];
    zArr.push(t);
    zoneGroups.set(t.pickupZone, zArr);

    const cArr = catGroups.get(t.category) ?? [];
    cArr.push(t);
    catGroups.set(t.category, cArr);
  }
  const byZone = Array.from(zoneGroups.entries())
    .map(([zone, trips]) => {
      const revenueEur = round2(trips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0));
      const netEur = round2(trips.reduce((s, t) => s + t.netEur, 0));
      return {
        zone,
        tripsCount: trips.length,
        revenueEur,
        netEur,
        avgTicketEur: trips.length > 0 ? round2(revenueEur / trips.length) : 0,
        trips,
      };
    })
    .sort((a, b) => b.netEur - a.netEur);

  const byCategory = Array.from(catGroups.entries())
    .map(([category, trips]) => {
      const revenueEur = round2(trips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0));
      const netEur = round2(trips.reduce((s, t) => s + t.netEur, 0));
      const kms = trips.reduce((s, t) => s + t.pickupDistanceKm + t.tripDistanceKm, 0);
      return {
        category,
        tripsCount: trips.length,
        revenueEur,
        netEur,
        eurPerKm: kms > 0 ? round2(revenueEur / kms) : 0,
        trips,
      };
    })
    .sort((a, b) => b.netEur - a.netEur);

  // 6. Estratégia & IA
  const filteredProposals = params.proposals.filter((p) => {
    const d = p.createdAt.slice(0, 10);
    if (d < period.startDate || d > period.endDate) return false;
    if (params.filters.dataScope === 'real' && p.isDemo) return false;
    if (params.filters.dataScope === 'demo' && !p.isDemo) return false;
    return true;
  });
  const predictedVsActualTrips = completedTrips
    .filter((t) => t.preDecisionSnapshot)
    .map((t) => ({
      tripId: t.id,
      externalRef: t.externalRef,
      predictedNetEur: t.preDecisionSnapshot!.predictedNetEur,
      actualNetEur: t.netEur,
      deltaNetEur: round2(t.netEur - t.preDecisionSnapshot!.predictedNetEur),
    }));
  const avgNetPredictionDeltaEur =
    predictedVsActualTrips.length > 0
      ? round2(
          predictedVsActualTrips.reduce((s, x) => s + x.deltaNetEur, 0) / predictedVsActualTrips.length
        )
      : null;

  // 7. Atividade TVDE (filter activities/sessions by period + scope)
  const scopedActs = filterRecordsByDateAndScope(
    params.tachograph.activities,
    period.startDate,
    period.endDate,
    params.filters.dataScope
  );
  const scopedSessions = filterRecordsByDateAndScope(
    params.tachograph.sessions,
    period.startDate,
    period.endDate,
    params.filters.dataScope
  );
  const scopedIntervals = params.tachograph.platformIntervals.filter(
    (i) => i.date >= period.startDate && i.date <= period.endDate
  );

  // 8. Veículo & Energia
  const energyLoggedExpensesEur = round2(
    filteredExpenses
      .filter((e) => e.category === 'Energia' || e.category === 'Combustível')
      .reduce((s, e) => s + e.amountEur, 0)
  );
  const emptyKmPct = summary.totalKm > 0 ? Math.round((summary.emptyKm / summary.totalKm) * 100) : 0;

  // 9. Metas & Projeção
  const dailyTargetEur = params.routine.dailyNetTargetEur;
  const weeklyTargetEur = round2(dailyTargetEur * 5);
  const monthlyTargetEur = round2(dailyTargetEur * 22);
  const periodTargetEur = round2(dailyTargetEur * Math.max(1, Math.min(22, period.daysCount)));
  const currentDailyEquivalentNetEur = round2(configuredNetEur / Math.max(1, period.daysCount));
  const progressPctOfPeriodTarget =
    periodTargetEur > 0 ? Math.max(0, Math.round((configuredNetEur / periodTargetEur) * 100)) : 0;

  const baseMonthly = round2(currentDailyEquivalentNetEur * 22);
  const isSampleThin = completedTrips.length < 3;

  return {
    period,
    dataScope: params.filters.dataScope,
    filteredTrips,
    completedTrips,
    excludedTrips,
    filteredExpenses,
    summary,
    previousSummary,
    comparison,
    byPlatform,
    byStatus,
    cancellations: {
      totalCancelledOrLost: excludedTrips.length,
      byActor,
      noShowCount,
      avgWaitBeforeCancelMin: waitCount > 0 ? round2(waitSumSec / waitCount / 60) : 0,
      totalCompensationEur,
      rejectedCount,
      expiredCount,
      officialImpactCaveat:
        'Apenas a aplicação oficial de cada plataforma confirma taxas finais de cancelamento ou penalização de score.',
    },
    financialDetailed: {
      grossRevenueEur: summary.totalRevenue,
      estimatedTripsSumEur,
      chargedTripsSumEur,
      varianceChargedVsEstimatedEur: round2(chargedTripsSumEur - estimatedTripsSumEur),
      commissionsDeductedEur,
      estimatedVehicleCostDeductedEur,
      fixedOwnershipDeductedEur,
      tollsDeductedEur,
      loggedExpensesDeductedEur,
      taxReserveDeductedEur,
      configuredNetEur,
      costConfigApplied: params.costConfig,
    },
    profitability: {
      byHourSlot,
      byZone,
      byCategory,
    },
    strategyAndAi: {
      strategyMode: params.autoPilot.strategyMode ?? 'Semiautomático',
      totalProposalsEvaluated: filteredProposals.length,
      acceptedProposals: filteredProposals.filter(
        (p) =>
          p.lifecycleState === 'Aceite pelo motorista' ||
          p.lifecycleState === 'Confirmada pela plataforma' ||
          p.lifecycleState === 'Concluída'
      ).length,
      rejectedProposals: filteredProposals.filter((p) => p.lifecycleState === 'Recusada').length,
      adjustmentsCount: params.autoPilot.adjustmentLogs?.length ?? 0,
      predictedVsActualTrips,
      avgNetPredictionDeltaEur,
    },
    tvdeActivity: {
      rolling24h: evaluateRolling24hCompliance(scopedActs, scopedIntervals),
      consolidated: consolidateMultiPlatformJornada(scopedActs, scopedIntervals, scopedSessions),
    },
    vehicleAndEnergy: {
      activeVehicleName: activeVehicle ? `${activeVehicle.brand} ${activeVehicle.model}` : 'Sem veículo ativo',
      homologatedRangeKm: activeVehicle?.homologatedRangeKm ?? activeVehicle?.rangeKm ?? 0,
      realRangeKm: activeVehicle?.realRangeKm ?? activeVehicle?.rangeKm ?? 0,
      tcoPerKmEur: tco.totalEstimatedCostPerKmEur,
      energyLoggedExpensesEur,
      totalKmInPeriod: summary.totalKm,
      emptyKmPct,
    },
    goalsAndProjection: {
      dailyTargetEur,
      weeklyTargetEur,
      monthlyTargetEur,
      currentDailyEquivalentNetEur,
      currentPeriodNetEur: configuredNetEur,
      progressPctOfPeriodTarget,
      conservativeProjectedMonthEur: round2(baseMonthly * 0.85),
      baseProjectedMonthEur: baseMonthly,
      optimizedProjectedMonthEur: round2(baseMonthly * 1.15),
      isSampleThin,
      projectionCaveat: isSampleThin
        ? 'Amostra reduzida (< 3 viagens concluídas no período): projeção mensal meramente indicativa.'
        : 'Projeção linear a 22 dias úteis ajustada pelos cenários conservador (-15%) e otimizado (+15%). Não constitui garantia.',
    },
  };
}
