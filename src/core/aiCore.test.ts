import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AI_CORE_AGENTS,
  analyzeProposalWithAiCore,
  evaluateSemiAutoAdjustment,
  reconcilePredictionOutcome,
  runAiCoreBriefing,
} from './aiCore';
import type {
  AiPredictionRecord,
  AutoPilotConfig,
  DriverRoutinePreferences,
  TachographStateStore,
  TripRecord,
} from '../models/types';

const baseRoutine: DriverRoutinePreferences = {
  preferredShiftStart: '07:30',
  preferredShiftEnd: '19:30',
  preferredMealWindow: '13:00 - 14:00',
  preferredChargingWindow: '22:00 - 06:00',
  garageClosingTime: '23:00',
  dailyNetTargetEur: 120,
  maxDailyLegalMinutes: 600,
  minBatteryReservePct: 20,
};

const baseAutoPilot: AutoPilotConfig = {
  mode: 'Assistido',
  strategyMode: 'Semiautomático',
  thresholds: {
    minValueEur: 6,
    minEurPerKm: 0.95,
    minEurPerHour: 20,
    maxPickupKm: 4,
    maxTotalDistanceKm: 45,
    maxTotalTimeMin: 60,
    allowedPlatforms: ['uber', 'bolt'],
    allowedCategories: ['UberX', 'Bolt'],
    allowedRegions: ['Lisboa'],
    activeScheduleWindow: '07:00-23:00',
    weightEurPerKm: 40,
    weightEurPerHour: 45,
    weightPickupEfficiency: 15,
  },
  semiAutoBounds: {
    minEurPerKmFloor: 0.8,
    minEurPerKmCeil: 1.35,
    minEurPerHourFloor: 16,
    minEurPerHourCeil: 30,
    maxPickupKmFloor: 2,
    maxPickupKmCeil: 6,
  },
  prioritizeCampaigns: true,
  includeBonusInThreshold: true,
  exceptions: [],
  officialAutomationAuthorized: false,
};

const emptyTacho: TachographStateStore = {
  sessions: [],
  activities: [],
  platformIntervals: [],
  offlineQueue: [],
  discrepancies: [],
  activeSessionId: null,
};

test('AI CORE exposes 8 agents, honest traffic status, and compares alternatives', () => {
  assert.equal(AI_CORE_AGENTS.length, 8);

  const pkg = analyzeProposalWithAiCore({
    input: {
      platformId: 'uber',
      category: 'UberX',
      grossValueEur: 16,
      pickupDistanceKm: 1.2,
      pickupTimeMin: 4,
      tripDistanceKm: 10,
      tripTimeMin: 18,
      stops: 0,
      tollsEur: 0,
      bonusEur: 1,
      region: 'Saldanha',
      vehicleCostPerKmEur: 0.12,
      mode: 'Equilibrado',
    },
    autoPilot: baseAutoPilot,
    tachograph: emptyTacho,
    zones: [],
    savedPlaces: [],
    routine: baseRoutine,
    currentHour: 11,
  });

  assert.ok(pkg.alternatives.length >= 2);
  assert.ok(pkg.trafficHonestyNote.includes('Informação indisponível ao vivo'));
  assert.equal(pkg.insight.inputsConsidered.length >= 3, true);
});

test('Semi-automatic strategy stays within driver bounds and prediction reconciles per driver', () => {
  const adj = evaluateSemiAutoAdjustment({
    autoPilot: baseAutoPilot,
    recentTrips: [],
    activeCampaigns: [
      {
        id: 'c1',
        platformId: 'uber',
        name: 'Missão Fim de Semana',
        rewardEur: 40,
        targetTrips: 20,
        completedTrips: 12,
        periodStart: '2026-01-01',
        periodEnd: '2026-01-05',
        scheduleWindow: '07:00-23:00',
        zone: 'Lisboa',
        requirements: '',
        estimatedExtraCostEur: 5,
        status: 'Ativa',
        source: 'Manual',
        isDemo: true,
      },
    ],
  });
  assert.ok(adj.recommendedPatch?.minEurPerKm);
  assert.ok(
    adj.recommendedPatch!.minEurPerKm! >= baseAutoPilot.semiAutoBounds!.minEurPerKmFloor &&
      adj.recommendedPatch!.minEurPerKm! <= baseAutoPilot.semiAutoBounds!.minEurPerKmCeil
  );

  const pred: AiPredictionRecord = {
    id: 'pred-1',
    driverId: 'usr-driver-1',
    createdAt: new Date().toISOString(),
    agentId: 'corridas',
    predictedNetEur: 14,
    predictedDurationMin: 22,
    predictedEurPerHour: 38,
    status: 'Pendente resultado',
    learningNote: 'Previsão inicial',
    epistemicTag: 'Previsão',
  };
  const actual: TripRecord = {
    id: 'trip-x',
    externalRef: 'UB-X',
    platformId: 'uber',
    vehicleId: 'veh-1',
    date: '2026-01-01',
    time: '12:00',
    grossEur: 18,
    tipEur: 2,
    bonusEur: 0,
    tollsEur: 0,
    commissionEur: 4,
    operationalCostEur: 1,
    netEur: 15,
    pickupDistanceKm: 1,
    tripDistanceKm: 9,
    durationMin: 25,
    pickupZone: 'Saldanha',
    category: 'UberX',
    status: 'Concluída',
    source: 'Manual',
    isDemo: true,
  };
  const calibrated = reconcilePredictionOutcome(pred, actual);
  assert.equal(calibrated.status, 'Calibrado');
  assert.equal(calibrated.deltaNetEur, 1);
  assert.equal(calibrated.deltaDurationMin, 3);

  const briefing = runAiCoreBriefing({
    driverId: 'usr-driver-1',
    trips: [actual],
    expenses: [],
    vehicles: [],
    obligations: [],
    documents: [],
    tachograph: emptyTacho,
    routine: baseRoutine,
    autoPilot: baseAutoPilot,
    predictions: [calibrated],
  });
  assert.equal(briefing.length, 4);
});
