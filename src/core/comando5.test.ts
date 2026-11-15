import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SEED_AUTOPILOT,
  SEED_DOCUMENTS,
  SEED_EXPENSES,
  SEED_FINANCIAL_COST_CONFIG,
  SEED_OBLIGATIONS,
  SEED_PLATFORMS,
  SEED_PROPOSALS,
  SEED_ROUTINE_PREFS,
  SEED_TACHOGRAPH,
  SEED_TRIPS,
  SEED_VEHICLES,
  SEED_ZONE_OBSERVATIONS,
  SEED_ZONES,
} from '../data/seedData.ts';
import { computeCalibratedConfidence, runAiCoreBriefing } from './aiCore.ts';
import {
  computeFinancialSummary,
  estimateVehicleResaleValue,
  evaluateVehicleEligibility,
  filterVehiclesCatalog,
} from './intelligence.ts';
import {
  buildCancelledTripFromActiveSession,
  computeTripTimersSnapshot,
  markTripArrivedAtPickup,
  resolveCancellationRule,
  startActiveTripFromProposal,
  startTripPassengerWait,
} from './lifecycle.ts';
import { buildComprehensiveReports, resolveDateRange } from './reports.ts';
import { createDriverZoneObservation, evaluateProposalZoneAlerts } from './zones.ts';

test('Reports engine resolves all 9 date presets and computes previous equivalent period', () => {
  const presets = [
    'hoje',
    'ontem',
    'ultimos_7_dias',
    'esta_semana',
    'ultimos_30_dias',
    'este_mes',
    'mes_anterior',
    'este_ano',
    'personalizado',
  ] as const;

  for (const preset of presets) {
    const resolved = resolveDateRange(preset, '2026-11-01', '2026-11-10', '2026-11-15');
    assert.ok(resolved.startDate <= resolved.endDate);
    assert.ok(resolved.prevEndDate < resolved.startDate);
    assert.ok(resolved.daysCount >= 1);
  }
});

test('Reports engine isolates Real vs Demo scope, excludes cancelled trips from net, and computes 9 sub-reports', () => {
  const realTrip = {
    ...SEED_TRIPS[0],
    id: 'real-trip-1',
    externalRef: 'REAL-001',
    date: '2026-11-15',
    grossEur: 40,
    netEur: 28,
    isDemo: false,
  };
  const bundleRealOnly = buildComprehensiveReports({
    trips: [...SEED_TRIPS, realTrip],
    expenses: SEED_EXPENSES,
    proposals: SEED_PROPOSALS,
    platforms: SEED_PLATFORMS,
    vehicles: SEED_VEHICLES,
    tachograph: SEED_TACHOGRAPH,
    routine: SEED_ROUTINE_PREFS,
    autoPilot: SEED_AUTOPILOT,
    costConfig: SEED_FINANCIAL_COST_CONFIG,
    filters: {
      preset: 'este_mes',
      dataScope: 'real',
      refDateIso: '2026-11-15',
    },
  });
  assert.equal(bundleRealOnly.completedTrips.length, 1);
  assert.equal(bundleRealOnly.completedTrips[0].id, 'real-trip-1');

  const bundleDemoOnly = buildComprehensiveReports({
    trips: [...SEED_TRIPS, realTrip],
    expenses: SEED_EXPENSES,
    proposals: SEED_PROPOSALS,
    platforms: SEED_PLATFORMS,
    vehicles: SEED_VEHICLES,
    tachograph: SEED_TACHOGRAPH,
    routine: SEED_ROUTINE_PREFS,
    autoPilot: SEED_AUTOPILOT,
    costConfig: SEED_FINANCIAL_COST_CONFIG,
    filters: {
      preset: 'este_mes',
      dataScope: 'demo',
      refDateIso: '2026-11-15',
    },
  });
  assert.ok(bundleDemoOnly.completedTrips.every((t) => t.isDemo));
  assert.ok(bundleDemoOnly.excludedTrips.every((t) => t.status !== 'Concluída' && t.status !== 'Ajustada'));
});

test('Trip lifecycle separates travel vs wait timers (wait=0 before arrival) and never auto-cancels at zero', () => {
  const proposal = SEED_PROPOSALS[0];
  const rule = resolveCancellationRule(proposal.input.platformId, 'PT', proposal.input.category);
  const startIso = '2026-11-15T10:00:00Z';

  let session = startActiveTripFromProposal({
    proposal,
    countryCode: 'PT',
    aiRecommendation: 'Aceitar',
    nowIso: startIso,
  });

  // 4 minutes into travel to pickup -> wait MUST still be 0 seconds!
  const beforeArrivalSnap = computeTripTimersSnapshot(session, Date.parse('2026-11-15T10:04:00Z'));
  assert.equal(beforeArrivalSnap.travelToPickupSeconds, 240);
  assert.equal(beforeArrivalSnap.waitAtPickupSeconds, 0);
  assert.ok(beforeArrivalSnap.waitPhaseStatus.startsWith('Em deslocação'));

  // Driver arrives at pickup and starts wait timer
  session = markTripArrivedAtPickup(session, 'Botão manual no AIVAD', true, '2026-11-15T10:05:00Z');
  session = startTripPassengerWait(session, '2026-11-15T10:05:00Z');

  // 10 minutes past wait start (exceeds cancellation deadline) -> remaining countdown clamps at 0 and NEVER auto-cancels
  const longWaitSnap = computeTripTimersSnapshot(session, Date.parse('2026-11-15T10:15:00Z'));
  assert.equal(longWaitSnap.waitAtPickupSeconds, 600);
  assert.equal(longWaitSnap.remainingToCancelDeadlineSeconds, 0);
  assert.equal(longWaitSnap.canCancelWithNoShowGuidance, true);
  assert.equal(session.phase, 'Em espera pelo passageiro');

  // Manual cancellation records attribution & wait seconds without inflating earnings
  const cancelledTrip = buildCancelledTripFromActiveSession({
    session,
    cancellationBy: 'Passageiro',
    isNoShow: true,
    reason: 'Passageiro não compareceu após espera.',
    compensationEur: rule.estimatedCompensationEur,
    commissionPct: 25,
    nowIso: '2026-11-15T10:15:00Z',
  });
  assert.equal(cancelledTrip.status, 'Passageiro não compareceu');
  assert.equal(cancelledTrip.waitAtPickupSeconds, 600);
  assert.equal(cancelledTrip.cancellationCompensationEur, rule.estimatedCompensationEur);
  const finSummary = computeFinancialSummary([cancelledTrip], []);
  assert.equal(finSummary.totalRevenue, 0);
  assert.equal(finSummary.cancelledOrLostCount, 1);
});

test('Zone intelligence detects Feira do Relógio (Sun 07-14) and Feira da Ladra (Tue/Sat 08-15, event not ban) and enforces privacyConsent', () => {
  // Sunday 09:30 -> Feira do Relógio active
  const sundayMorning = new Date(2026, 10, 15, 9, 30); // Nov 15 2026 is Sunday
  const alertsRelogio = evaluateProposalZoneAlerts({
    input: {
      region: 'Lisboa',
      pickupAddress: 'Av. Santo Condestável, Marvila (Feira do Relógio)',
      destinationAddress: 'Aeroporto de Lisboa',
    },
    zones: SEED_ZONES,
    observations: SEED_ZONE_OBSERVATIONS,
    referenceDate: sundayMorning,
  });
  assert.ok(alertsRelogio.some((a) => a.zoneId === 'zn-feira-relogio' && a.isScheduleCurrentlyActive));
  assert.ok(alertsRelogio[0].alternatives.length > 0);

  // Tuesday 10:00 -> Feira da Ladra active & flagged as regular event (not confirmed total ban)
  const tuesdayMorning = new Date(2026, 10, 17, 10, 0); // Nov 17 2026 is Tuesday
  const alertsLadra = evaluateProposalZoneAlerts({
    input: {
      region: 'Lisboa',
      pickupAddress: 'Campo de Santa Clara, São Vicente',
      destinationAddress: 'Cais do Sodré',
    },
    zones: SEED_ZONES,
    observations: SEED_ZONE_OBSERVATIONS,
    referenceDate: tuesdayMorning,
  });
  const ladra = alertsLadra.find((a) => a.zoneId === 'zn-feira-ladra');
  assert.ok(ladra);
  assert.equal(ladra?.isScheduleCurrentlyActive, true);
  assert.equal(ladra?.isEventNotConfirmedBan, true);

  // Privacy consent validation
  const rejected = createDriverZoneObservation({
    zoneId: 'zn-feira-relogio',
    zoneName: 'Feira do Relógio',
    city: 'Lisboa',
    countryCode: 'PT',
    driverId: 'drv-1',
    privacyConsent: false,
    observationType: 'Corte / Feira / Mercado',
    description: 'Bancas ocupam acesso sul',
    existingObservations: [],
    isDemo: false,
  });
  assert.equal(rejected.ok, false);

  const accepted = createDriverZoneObservation({
    zoneId: 'zn-feira-relogio',
    zoneName: 'Feira do Relógio',
    city: 'Lisboa',
    countryCode: 'PT',
    driverId: 'drv-1',
    privacyConsent: true,
    observationType: 'Corte / Feira / Mercado',
    description: 'Bancas ocupam acesso sul; usar rotunda exterior.',
    existingObservations: [],
    isDemo: false,
  });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.observation?.driverAlias, 'Motorista Verificado (Anónimo)');
});

test('Vehicle filters, color rules, market expiry, and resale depreciation estimator work coherently', () => {
  const filtered = filterVehiclesCatalog(
    SEED_VEHICLES,
    { fuelType: 'Elétrico', minSeats: 4, onlyEligible: true },
    SEED_PLATFORMS
  );
  assert.ok(filtered.length >= 1);
  assert.ok(filtered.every((v) => v.fuelType === 'Elétrico'));

  const v = filtered[0];
  const elig = evaluateVehicleEligibility(v, 2026, SEED_PLATFORMS, 7);
  assert.ok(elig.expiresOnDate);

  const lowKm = estimateVehicleResaleValue(v, 30000, 2026);
  const highKm = estimateVehicleResaleValue(v, 140000, 2026);
  assert.ok(lowKm.midValueEur > highKm.midValueEur);
  assert.equal(lowKm.valuationType, 'Estimativa algorítmica AIVAD');
});

test('AI Core returns null confidence when sample is insufficient and never fabricates certainty', () => {
  const emptyConf = computeCalibratedConfidence({
    calibratedPredictionsCount: 0,
    completedTripsCount: 0,
  });
  assert.equal(emptyConf.confidencePct, null);
  assert.equal(emptyConf.confidenceStatus, 'Dados insuficientes');

  const briefing = runAiCoreBriefing({
    driverId: 'drv-new',
    trips: [],
    expenses: [],
    vehicles: SEED_VEHICLES,
    obligations: SEED_OBLIGATIONS,
    documents: SEED_DOCUMENTS,
    tachograph: {
      sessions: [],
      activities: [],
      platformIntervals: [],
      offlineQueue: [],
      discrepancies: [],
      activeSessionId: null,
    },
    routine: SEED_ROUTINE_PREFS,
    autoPilot: SEED_AUTOPILOT,
    predictions: [],
  });
  const financialCard = briefing.find((b) => b.agentId === 'financeiro');
  assert.equal(financialCard?.confidencePct, null);
});
