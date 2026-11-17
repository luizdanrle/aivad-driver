import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALL_FLOATING_METRICS,
  PROPOSAL_GALLERY_EXAMPLES,
  adjustHexColor,
  createDefaultClassificationProfiles,
  evaluateFloatingMetricCell,
  hexWithOpacityRgba,
  resolveFloatingTierConfig,
} from './floatingCard';
import {
  buildWazeNavigationLaunch,
  computeTripEstimateVsActualComparison,
  summarizeTripAdjustments,
} from './tripAnalysis';
import { analyzeProposal, computeFinancialSummary } from './intelligence';
import { computeAiCalibrationSummary, reconcilePredictionOutcome } from './aiCore';
import type {
  AiPredictionRecord,
  AndroidOverlayConfig,
  ProposalInput,
  ProposalThresholds,
  TripRecord,
} from '../models/types';

const DEFAULT_THRESHOLDS: ProposalThresholds = {
  minValueEur: 5.5,
  minEurPerKm: 0.9,
  minEurPerHour: 18,
  maxPickupKm: 4.5,
  maxTotalDistanceKm: 45,
  maxTotalTimeMin: 60,
  allowedPlatforms: ['uber', 'bolt'],
  allowedCategories: ['UberX', 'Uber Comfort', 'Bolt', 'Bolt Comfort'],
  allowedRegions: ['Lisboa', 'Centro', 'Aeroporto'],
  activeScheduleWindow: '00:00-23:59',
  weightEurPerKm: 40,
  weightEurPerHour: 45,
  weightPickupEfficiency: 15,
};

test('Floating card profiles for Favorável, Atenção, Evitar are independent and support custom naming', () => {
  const profiles = createDefaultClassificationProfiles();
  assert.equal(profiles.verde.operationalMeaning, 'Favorável');
  assert.equal(profiles.amarelo.operationalMeaning, 'Atenção');
  assert.equal(profiles.vermelho.operationalMeaning, 'Evitar');

  // Mutate verde profile freely (e.g. blue color, custom name 'Excelente', 1 metric only)
  profiles.verde.customLabel = 'Excelente Azul';
  profiles.verde.bgColor = '#0E4DA4';
  profiles.verde.visibleMetrics = ['eurPerHour'];

  assert.equal(profiles.amarelo.customLabel, 'Atenção');
  assert.notEqual(profiles.amarelo.bgColor, '#0E4DA4');
  assert.ok(profiles.amarelo.visibleMetrics.length > 1);
  assert.equal(profiles.vermelho.customLabel, 'Evitar');

  const overlay: AndroidOverlayConfig = {
    position: 'Centro superior',
    opacityPercent: 95,
    widthPercent: 90,
    marginOffsetPx: 12,
    useCustomColors: false,
    bgColor: '#FFFFFF',
    textColor: '#0F172A',
    borderColor: '#059669',
    borderWidthPx: 2,
    fontFamily: 'Sans',
    fontSizePx: 14,
    themePreset: 'AIVAD Adaptativo',
    durationSeconds: 10,
    autoDismiss: false,
    showHistoryFloatingButton: true,
    visibleMetrics: ['eurPerKm'],
    classificationProfiles: profiles,
  };

  const resolvedVerde = resolveFloatingTierConfig(overlay, 'verde');
  const resolvedAmarelo = resolveFloatingTierConfig(overlay, 'amarelo');
  assert.equal(resolvedVerde.customLabel, 'Excelente Azul');
  assert.equal(resolvedVerde.operationalMeaning, 'Favorável');
  assert.deepEqual(resolvedVerde.visibleMetrics, ['eurPerHour']);
  assert.equal(resolvedAmarelo.customLabel, 'Atenção');
});

test('Color lightness (Clarear/Escurecer), color intensity, and RGBA opacity transform cleanly', () => {
  const base = '#2563EB';
  const lighter = adjustHexColor(base, 20, 100);
  const darker = adjustHexColor(base, -20, 100);
  const muted = adjustHexColor(base, 0, 25);

  assert.notEqual(lighter, base);
  assert.notEqual(darker, base);
  assert.notEqual(muted, base);

  // Red/green/blue brightness averages increase when lightened and drop when darkened
  const sumHex = (h: string) =>
    parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
  assert.ok(sumHex(lighter) > sumHex(base));
  assert.ok(sumHex(darker) < sumHex(base));

  assert.equal(hexWithOpacityRgba('#FFFFFF', 50), 'rgba(255, 255, 255, 0.50)');
});

test('All 16 floating metrics evaluate formulas and return Indisponível instead of fake 0 when missing', () => {
  assert.equal(ALL_FLOATING_METRICS.length, 16);

  const partialInput: ProposalInput = {
    platformId: 'uber',
    category: 'UberX',
    grossValueEur: 14.2,
    pickupDistanceKm: 0,
    pickupTimeMin: 0,
    tripDistanceKm: 8.5,
    tripTimeMin: 18,
    stops: 0,
    tollsEur: 0,
    bonusEur: 0,
    region: 'Lisboa',
    vehicleCostPerKmEur: 0.12,
    commissionPct: undefined,
    unavailableFields: ['pickupDistanceKm', 'pickupTimeMin', 'commissionPct'],
    calculationBasis: 'total_distance',
    mode: 'Equilibrado',
  };

  const analysis = analyzeProposal(partialInput, DEFAULT_THRESHOLDS);
  const pickupCell = evaluateFloatingMetricCell('pickupDistanceKm', partialInput, analysis, '€');
  const commissionCell = evaluateFloatingMetricCell('commissionEur', partialInput, analysis, '€');
  const totalTimeCell = evaluateFloatingMetricCell('totalTime', partialInput, analysis, '€');
  const tripDistCell = evaluateFloatingMetricCell('tripDistanceKm', partialInput, analysis, '€');

  assert.equal(pickupCell.available, false);
  assert.equal(pickupCell.value, 'Indisponível');
  assert.equal(commissionCell.available, false);
  assert.equal(commissionCell.value, 'Indisponível');
  assert.equal(totalTimeCell.available, false);
  assert.equal(totalTimeCell.value, 'Indisponível');
  assert.equal(tripDistCell.available, true);
  assert.equal(tripDistCell.value, '8.5 km');
});

test('Anonymized Uber & Bolt gallery covers Boa, Razoável, and Má including high-gross trap counter-example', () => {
  const tiers = new Set(PROPOSAL_GALLERY_EXAMPLES.map((g) => g.qualityTier));
  const platforms = new Set(PROPOSAL_GALLERY_EXAMPLES.map((g) => g.platformId));
  assert.ok(tiers.has('Boa') && tiers.has('Razoável') && tiers.has('Má'));
  assert.ok(platforms.has('uber') && platforms.has('bolt'));

  const highGrossTrap = PROPOSAL_GALLERY_EXAMPLES.find((g) => g.id === 'ex-uber-ma-05');
  assert.ok(highGrossTrap);
  assert.equal(highGrossTrap.input.grossValueEur, 23.5);
  const analysis = analyzeProposal(highGrossTrap.input, DEFAULT_THRESHOLDS);
  assert.equal(analysis.classification, 'vermelho');
  assert.ok(analysis.eurPerHour < DEFAULT_THRESHOLDS.minEurPerHour);
  assert.ok(highGrossTrap.sourceNotice.includes('demonstração'));
});

test('Pre-acceptance estimate vs post-acceptance actuals, Waze launch, and 4 time layers never assume phantom delay pay', () => {
  const navLaunch = buildWazeNavigationLaunch('Aeroporto de Lisboa', 'Waze');
  assert.ok(navLaunch.url.includes('waze.com/ul'));
  assert.ok(navLaunch.honestyNote.includes('não lê automaticamente'));

  const delayedTrip: TripRecord = {
    id: 't-delay',
    externalRef: 'UB-D1',
    platformId: 'uber',
    vehicleId: 'veh-1',
    date: '2026-03-01',
    time: '18:00',
    grossEur: 12,
    initialPresentedGrossEur: 12,
    tipEur: 0,
    bonusEur: 0,
    tollsEur: 0,
    commissionEur: 3,
    operationalCostEur: 1.2,
    netEur: 7.8,
    pickupDistanceKm: 1.5,
    tripDistanceKm: 8.5,
    durationMin: 20,
    pickupZone: 'Saldanha',
    category: 'UberX',
    status: 'Concluída',
    source: 'Manual',
    isDemo: true,
    preAcceptanceEstimate: {
      pickupDistanceKm: 1.5,
      pickupTimeMin: 5,
      tripDistanceKm: 8.5,
      tripTimeMin: 15,
      totalDistanceKm: 10,
      totalTimeMin: 20,
      grossEur: 12,
      estimatedNetEur: 7.8,
      eurPerKm: 0.78,
      eurPerHour: 23.4,
    },
    postAcceptanceActual: {
      hasObservedActuals: true,
      pickupDistanceKm: 1.8,
      tripDistanceKm: 9.2,
      totalDistanceKm: 11,
      pickupTimeMin: 8,
      tripTimeMin: 24,
      totalTimeMin: 32,
      navigationTrafficTimeMin: 29,
      navigationAppUsed: 'Waze',
      observationSource: 'Registo manual do motorista',
    },
  };

  const cmp = computeTripEstimateVsActualComparison(delayedTrip);
  assert.equal(cmp.estimate.totalTimeMin, 20);
  assert.equal(cmp.trafficEstTimeMin, 29);
  assert.equal(cmp.actual.pickupTimeMin, 8);
  assert.equal(cmp.actual.tripTimeMin, 24);
  assert.equal(cmp.timeDeltaMin, 12);
  // Real €/h drops when 20m becomes 32m with same confirmed earnings
  assert.ok(cmp.actualEurPerHour !== null && cmp.actualEurPerHour < cmp.estimate.eurPerHour);
  assert.ok(cmp.delayImpactSummary.includes('não presume compensação automática'));

  const missingActualTrip: TripRecord = { ...delayedTrip, id: 't-no-obs', postAcceptanceActual: undefined };
  const cmpMissing = computeTripEstimateVsActualComparison(missingActualTrip);
  assert.equal(cmpMissing.hasActualTime, false);
  assert.equal(cmpMissing.actual.pickupTimeMin, null);
  assert.equal(cmpMissing.actualEurPerHour, null);
});

test('Pending and rejected fare adjustments never enter confirmed financial earnings', () => {
  const trip: TripRecord = {
    id: 't-adj',
    externalRef: 'BT-ADJ',
    platformId: 'bolt',
    vehicleId: 'veh-1',
    date: '2026-03-01',
    time: '19:00',
    grossEur: 10,
    initialPresentedGrossEur: 10,
    tipEur: 0,
    bonusEur: 0,
    tollsEur: 0,
    commissionEur: 2,
    operationalCostEur: 1,
    netEur: 7,
    pickupDistanceKm: 1,
    tripDistanceKm: 6,
    durationMin: 18,
    pickupZone: 'Chiado',
    category: 'Bolt',
    status: 'Concluída',
    source: 'Manual',
    isDemo: true,
    fareAdjustments: [
      {
        id: 'a1',
        recordedAtIso: '2026-03-01T19:20:00Z',
        amountEur: 1.5,
        reason: 'Confirmado pela Bolt',
        status: 'Confirmado pela plataforma',
      },
      {
        id: 'a2',
        recordedAtIso: '2026-03-01T19:22:00Z',
        amountEur: 3.0,
        reason: 'Reclamação atraso trânsito',
        status: 'Pendente de confirmação',
      },
      {
        id: 'a3',
        recordedAtIso: '2026-03-01T19:24:00Z',
        amountEur: 2.0,
        reason: 'Recusado',
        status: 'Rejeitado',
      },
    ],
  };

  const adj = summarizeTripAdjustments(trip);
  assert.equal(adj.initialPresentedGrossEur, 10);
  assert.equal(adj.confirmedAdjustmentsTotalEur, 1.5);
  assert.equal(adj.pendingAdjustmentsTotalEur, 3.0);
  assert.equal(adj.rejectedAdjustmentsTotalEur, 2.0);
  assert.equal(adj.confirmedFinalGrossEur, 11.5);

  const fin = computeFinancialSummary([trip], []);
  assert.equal(fin.grossTotal, 11.5);
  assert.equal(fin.netEstimated, 8.5); // 7 + 1.5 confirmed ONLY (not 3.0 pending or 2.0 rejected)
});

test('AI CORE 4D calibration flags preliminary assessment below 3 calibrated trips', () => {
  const basePred: AiPredictionRecord = {
    id: 'p1',
    driverId: 'drv-1',
    createdAt: '2026-03-01T10:00:00Z',
    agentId: 'corridas',
    predictedNetEur: 12,
    predictedDurationMin: 20,
    predictedDistanceKm: 10,
    predictedEurPerHour: 36,
    predictedClassification: 'verde',
    status: 'Pendente resultado',
    learningNote: 'Previsão inicial',
    epistemicTag: 'Previsão',
  };

  const actualTrip: TripRecord = {
    id: 'trip-1',
    externalRef: 'UB-1',
    platformId: 'uber',
    vehicleId: 'v1',
    date: '2026-03-01',
    time: '10:30',
    grossEur: 15,
    tipEur: 0,
    bonusEur: 0,
    tollsEur: 0,
    commissionEur: 3.75,
    operationalCostEur: 1.25,
    netEur: 10,
    pickupDistanceKm: 2,
    tripDistanceKm: 9.5,
    durationMin: 26,
    pickupZone: 'Saldanha',
    category: 'UberX',
    status: 'Concluída',
    source: 'Manual',
    isDemo: true,
    postAcceptanceActual: {
      hasObservedActuals: true,
      pickupDistanceKm: 2,
      tripDistanceKm: 9.5,
      totalDistanceKm: 11.5,
      pickupTimeMin: 6,
      tripTimeMin: 20,
      totalTimeMin: 26,
      observationSource: 'Registo manual do motorista',
    },
  };

  const rec1 = reconcilePredictionOutcome(basePred, actualTrip);
  assert.equal(rec1.status, 'Calibrado');
  assert.equal(rec1.deltaNetEur, -2);
  assert.equal(rec1.deltaDurationMin, 6);
  assert.equal(rec1.deltaDistanceKm, 1.5);
  assert.equal(rec1.observedClassification, 'amarelo');
  assert.equal(rec1.classificationMatched, false);

  const summaryTwo = computeAiCalibrationSummary([rec1, { ...rec1, id: 'p2' }], 'drv-1');
  assert.equal(summaryTwo.isPreliminary, true);
  assert.ok(summaryTwo.preliminaryNotice.includes('Avaliação preliminar'));

  const summaryThree = computeAiCalibrationSummary(
    [rec1, { ...rec1, id: 'p2' }, { ...rec1, id: 'p3' }],
    'drv-1'
  );
  assert.equal(summaryThree.isPreliminary, false);
});
