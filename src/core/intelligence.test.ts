import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeProposal,
  answerDriverQuery,
  calculateSmartPlan,
  computeFinancialSummary,
  evaluateAutoPilot,
  evaluateVehicleEligibility,
  reconcileCapturedEvent,
} from './intelligence';
import type { AutoPilotConfig, CampaignRecord, TripRecord, VehicleRecord } from '../models/types';

const defaultThresholds = {
  minValueEur: 5,
  minEurPerKm: 0.9,
  minEurPerHour: 18,
  maxPickupKm: 4,
  maxTotalDistanceKm: 50,
  maxTotalTimeMin: 70,
  weightEurPerKm: 40,
  weightEurPerHour: 45,
  weightPickupEfficiency: 15,
};

test('analyzeProposal classifies profitable offer as verde', () => {
  const analysis = analyzeProposal(
    {
      platformId: 'uber',
      category: 'Uber Comfort',
      grossValueEur: 18.5,
      pickupDistanceKm: 1.5,
      pickupTimeMin: 4,
      tripDistanceKm: 11.5,
      tripTimeMin: 20,
      stops: 0,
      tollsEur: 0,
      bonusEur: 2,
      region: 'Lisboa Centro',
      vehicleCostPerKmEur: 0.14,
      mode: 'Equilibrado',
    },
    defaultThresholds
  );

  assert.equal(analysis.totalDistanceKm, 13);
  assert.equal(analysis.totalTimeMin, 24);
  assert.equal(analysis.effectiveRevenueEur, 20.5);
  assert.equal(analysis.classification, 'verde');
  assert.ok(analysis.eurPerKm > 1.5);
  assert.ok(analysis.eurPerHour > 45);
});

test('analyzeProposal classifies low-yield long pickup offer as vermelho', () => {
  const analysis = analyzeProposal(
    {
      platformId: 'bolt',
      category: 'Bolt',
      grossValueEur: 4.1,
      pickupDistanceKm: 5.5,
      pickupTimeMin: 12,
      tripDistanceKm: 4.0,
      tripTimeMin: 11,
      stops: 0,
      tollsEur: 0,
      bonusEur: 0,
      region: 'Periferia Norte',
      vehicleCostPerKmEur: 0.16,
      mode: 'Equilibrado',
    },
    defaultThresholds
  );

  assert.equal(analysis.classification, 'vermelho');
  assert.equal(analysis.emptyReturnRisk, 'Alto');
});

test('evaluateAutoPilot blocks automatic execution when official API is unauthorized', () => {
  const input = {
    platformId: 'uber',
    category: 'UberX',
    grossValueEur: 14,
    pickupDistanceKm: 1,
    pickupTimeMin: 3,
    tripDistanceKm: 9,
    tripTimeMin: 16,
    stops: 0,
    tollsEur: 0,
    bonusEur: 0,
    region: 'Lisboa',
    vehicleCostPerKmEur: 0.12,
    mode: 'Equilibrado' as const,
  };
  const analysis = analyzeProposal(input, defaultThresholds);
  const config: AutoPilotConfig = {
    mode: 'Automático',
    thresholds: {
      ...defaultThresholds,
      allowedPlatforms: ['uber', 'bolt'],
      allowedCategories: ['UberX', 'Uber Comfort'],
      allowedRegions: ['Lisboa'],
      activeScheduleWindow: '06:00-23:00',
    },
    prioritizeCampaigns: true,
    includeBonusInThreshold: true,
    exceptions: [],
    officialAutomationAuthorized: false,
  };
  const decision = evaluateAutoPilot('prop-1', input, analysis, config, []);
  assert.equal(decision.action, 'Decisão pronta (Ação assistida): Aceitar');
  assert.equal(decision.executedAutomatically, false);
  assert.equal(decision.platformConfirmed, false);
});

test('reconcileCapturedEvent associates tip to original trip without duplicating trip and detects duplicate events', () => {
  const existingTrips: TripRecord[] = [
    {
      id: 'trip-101',
      externalRef: 'UB-9921',
      platformId: 'uber',
      vehicleId: 'veh-1',
      date: '2026-11-14',
      time: '10:30',
      grossEur: 12.0,
      tipEur: 0,
      bonusEur: 0,
      tollsEur: 0,
      commissionEur: 3.0,
      operationalCostEur: 1.5,
      netEur: 7.5,
      pickupDistanceKm: 1.2,
      tripDistanceKm: 8.8,
      durationMin: 18,
      pickupZone: 'Marquês',
      destinationZone: 'Parque das Nações',
      category: 'UberX',
      status: 'Concluída',
      source: 'API Oficial',
      isDemo: true,
    },
  ];

  const first = reconcileCapturedEvent(
    {
      externalTxId: 'TIP-TX-55',
      source: 'Notificação Android Autorizada',
      dataType: 'Gorjeta',
      platformId: 'uber',
      amountEur: 3.5,
      relatedTripRef: 'UB-9921',
      rawSummary: 'Gorjeta recebida €3.50',
    },
    [],
    existingTrips
  );

  assert.equal(first.isDuplicate, false);
  assert.equal(first.updatedTrip?.tipEur, 3.5);
  assert.equal(first.updatedTrip?.netEur, 11);
  assert.equal(first.captureRecord.status, 'Associado');

  const duplicate = reconcileCapturedEvent(
    {
      externalTxId: 'TIP-TX-55',
      source: 'Notificação Android Autorizada',
      dataType: 'Gorjeta',
      platformId: 'uber',
      amountEur: 3.5,
      relatedTripRef: 'UB-9921',
      rawSummary: 'Gorjeta duplicada',
    },
    [first.captureRecord],
    existingTrips
  );

  assert.equal(duplicate.isDuplicate, true);
  assert.equal(duplicate.captureRecord.status, 'Rejeitado');
});

test('evaluateVehicleEligibility separates TVDE legal check from commercial platform eligibility', () => {
  const oldVehicle: VehicleRecord = {
    id: 'veh-old',
    brand: 'Renault',
    model: 'Mégane',
    version: '1.5 dCi',
    year: 2017,
    firstRegistration: '2017-03-10',
    powerKw: 81,
    rangeKm: 850,
    consumptionPer100Km: 5.1,
    consumptionUnit: 'L',
    fuelType: 'Gasóleo',
    seats: 5,
    doors: 5,
    trunkLiters: 434,
    color: 'Branco',
    equipment: ['AC'],
    monthlyLeaseOrFinanceEur: 320,
    insuranceAnnualEur: 1200,
    maintenancePerKmEur: 0.08,
    energyCostPerUnitEur: 1.65,
    depreciationMonthlyEur: 180,
    countryCode: 'PT',
    city: 'Lisboa',
    isActiveDriverVehicle: false,
    isDemo: true,
  };

  const result = evaluateVehicleEligibility(oldVehicle, 2026);
  assert.equal(result.tvdeLegalEligible, false);
  assert.equal(result.platformEligibility.uber.eligible, false);
  assert.equal(result.platformEligibility.bolt.eligible, false);
});

test('calculateSmartPlan and answerDriverQuery produce grounded consistent summaries', () => {
  const ev: VehicleRecord = {
    id: 'veh-ev',
    brand: 'Tesla',
    model: 'Model 3',
    version: 'RWD Highland',
    year: 2024,
    firstRegistration: '2024-05-01',
    powerKw: 208,
    batteryKwh: 60,
    rangeKm: 490,
    consumptionPer100Km: 14.5,
    consumptionUnit: 'kWh',
    fuelType: 'Elétrico',
    seats: 5,
    doors: 4,
    trunkLiters: 594,
    color: 'Azul',
    equipment: ['Câmara 360', 'Bomba de calor'],
    monthlyLeaseOrFinanceEur: 540,
    insuranceAnnualEur: 1450,
    maintenancePerKmEur: 0.04,
    energyCostPerUnitEur: 0.22,
    depreciationMonthlyEur: 280,
    countryCode: 'PT',
    city: 'Lisboa',
    isActiveDriverVehicle: true,
    isDemo: true,
  };

  const plan = calculateSmartPlan({
    targetNetEur: 600,
    availableDays: 4,
    hoursPerDay: 8,
    breakMinutesPerDay: 30,
    vehicle: ev,
    historicalAvgGrossPerHour: 24,
    currentEarnedNetEur: 120,
    needsChargingStops: true,
  });

  assert.equal(plan.totalProductiveHours, 30);
  assert.equal(plan.remainingNetEur, 480);
  assert.equal(plan.scenarios.length, 3);

  const summary = computeFinancialSummary([], []);
  assert.equal(summary.tripCount, 0);

  const campaigns: CampaignRecord[] = [];
  const answer = answerDriverQuery('Qual o meu veículo elegível?', {
    trips: [],
    expenses: [],
    campaigns,
    vehicles: [ev],
    obligationsCount: 5,
  });
  assert.ok(answer.answer.includes('Tesla Model 3'));
  assert.ok(answer.sources.length > 0);
});

test('computeFinancialSummary excludes cancelled, rejected, expired and unconfirmed rides from revenue', () => {
  const sampleTrips: TripRecord[] = [
    {
      id: 't-ok',
      externalRef: 'UB-1',
      platformId: 'uber',
      vehicleId: 'veh-1',
      date: '2026-11-14',
      time: '09:00',
      grossEur: 20,
      tipEur: 2,
      bonusEur: 0,
      tollsEur: 0,
      commissionEur: 5,
      operationalCostEur: 2,
      netEur: 15,
      pickupDistanceKm: 1,
      tripDistanceKm: 10,
      durationMin: 20,
      pickupZone: 'Saldanha',
      category: 'UberX',
      status: 'Concluída',
      source: 'Manual',
      isDemo: true,
    },
    {
      id: 't-cancel-pax',
      externalRef: 'UB-2',
      platformId: 'uber',
      vehicleId: 'veh-1',
      date: '2026-11-14',
      time: '09:30',
      grossEur: 35,
      tipEur: 0,
      bonusEur: 0,
      tollsEur: 0,
      commissionEur: 0,
      operationalCostEur: 0,
      netEur: 0,
      pickupDistanceKm: 1,
      tripDistanceKm: 15,
      durationMin: 25,
      pickupZone: 'Chiado',
      category: 'UberX',
      status: 'Cancelada pelo passageiro',
      cancellationBy: 'Passageiro',
      source: 'Manual',
      isDemo: true,
    },
    {
      id: 't-rejected',
      externalRef: 'BL-3',
      platformId: 'bolt',
      vehicleId: 'veh-1',
      date: '2026-11-14',
      time: '10:00',
      grossEur: 12,
      tipEur: 0,
      bonusEur: 0,
      tollsEur: 0,
      commissionEur: 0,
      operationalCostEur: 0,
      netEur: 0,
      pickupDistanceKm: 3,
      tripDistanceKm: 6,
      durationMin: 15,
      pickupZone: 'Lumiar',
      category: 'Bolt',
      status: 'Rejeitada',
      source: 'Manual',
      isDemo: true,
    },
  ];
  const fin = computeFinancialSummary(sampleTrips, []);
  assert.equal(fin.tripCount, 1);
  assert.equal(fin.cancelledOrLostCount, 2);
  assert.equal(fin.totalRevenue, 22);
});

