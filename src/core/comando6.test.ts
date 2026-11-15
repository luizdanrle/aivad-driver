import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeProposal,
  applyCaptureManualCorrection,
  evaluateAutoPilot,
  filterVehiclesCatalog,
  normalizeCanonicalStrategyMode,
  parseAndNormalizeCaptureInput,
  reconcileCapturedEvent,
} from './intelligence';
import {
  INITIAL_BOLT_CONNECTOR,
  INITIAL_UBER_CONNECTOR,
  computeExponentialBackoffSeconds,
  registerConnectorFailure,
  runConnectorVerificationSuite,
} from './connectors';
import {
  DEFAULT_VOICE_COPILOT_CONFIG,
  buildProposalVoiceAnnouncement,
  enqueueVoiceAnnouncement,
} from './voiceCopilot';
import {
  appendIdempotentLifecycleEvent,
  computeTripTimersSnapshot,
  createLifecycleAuditEvent,
  markTripArrivedAtPickup,
  startActiveTripFromProposal,
  startTripPassengerWait,
} from './lifecycle';
import { computeZoneDemandIntelligence, createZoneRelocationLog } from './zones';
import {
  buildTachographPeriodReport,
  startTachographShift,
  transitionTachographState,
} from './tachograph';
import { buildComprehensiveReports } from './reports';
import {
  evaluateCmsMutationAuthorization,
  validateRegistrationPayload,
  validateServerSecurityConfig,
} from './securityConfig';
import {
  SEED_AUTOPILOT,
  SEED_FINANCIAL_COST_CONFIG,
  SEED_PLATFORMS,
  SEED_PROPOSALS,
  SEED_ROUTINE_PREFS,
  SEED_TACHOGRAPH,
  SEED_TRIPS,
  SEED_VEHICLES,
  SEED_ZONES,
} from '../data/seedData';
import type { ProposalInput } from '../models/types';

const SAMPLE_PROPOSAL_INPUT: ProposalInput = {
  platformId: 'uber',
  category: 'Uber Green',
  grossValueEur: 16.5,
  pickupDistanceKm: 1.4,
  pickupTimeMin: 4,
  tripDistanceKm: 9.6,
  tripTimeMin: 16,
  stops: 0,
  tollsEur: 0,
  bonusEur: 1.5,
  region: 'Lisboa Centro',
  pickupAddress: 'Marquês de Pombal',
  destinationAddress: 'Aeroporto de Lisboa',
  vehicleCostPerKmEur: 0.14,
  calculationBasis: 'total_distance',
  mode: 'Equilibrado',
};

test('Comando 6 §2 — AutoPilot unificado nos 3 modos (Manual, Semiautomático, Automático c/ e s/ canal autorizado)', () => {
  assert.equal(normalizeCanonicalStrategyMode('Assistido', undefined), 'Semiautomático');
  assert.equal(normalizeCanonicalStrategyMode('Automático', 'Manual'), 'Automático');

  const analysis = analyzeProposal(SAMPLE_PROPOSAL_INPUT, SEED_AUTOPILOT.thresholds, {
    currentVehicleRangeKm: 280,
    minReserveRangeKm: 35,
    remainingLegalWorkMinutes: 180,
    destinationHistoricalTripsCount: 5,
  });
  assert.equal(analysis.classification, 'verde');
  assert.equal(analysis.returnProbabilityEpistemicTag, 'Informação histórica');
  assert.ok(typeof analysis.returnPassengerProbabilityPct === 'number' && analysis.returnPassengerProbabilityPct > 40);

  // 1. Modo Manual: nunca executa automaticamente
  const manualDecision = evaluateAutoPilot(
    'prop-c6-1',
    SAMPLE_PROPOSAL_INPUT,
    analysis,
    { ...SEED_AUTOPILOT, mode: 'Manual', strategyMode: 'Manual', officialAutomationAuthorized: false },
    []
  );
  assert.equal(manualDecision.action, 'Aguardar decisão manual');
  assert.equal(manualDecision.executedAutomatically, false);

  // 2. Modo Semiautomático: sugere aceitação dentro dos limites
  const semiDecision = evaluateAutoPilot(
    'prop-c6-2',
    SAMPLE_PROPOSAL_INPUT,
    analysis,
    { ...SEED_AUTOPILOT, mode: 'Semiautomático', strategyMode: 'Semiautomático', officialAutomationAuthorized: false },
    []
  );
  assert.equal(semiDecision.action, 'Aceitar sugerido');
  assert.equal(semiDecision.executedAutomatically, false);

  // 3a. Modo Automático SEM via autorizada: decisão pronta + ação assistida (sem fingir automação)
  const autoAssisted = evaluateAutoPilot(
    'prop-c6-3',
    SAMPLE_PROPOSAL_INPUT,
    analysis,
    {
      ...SEED_AUTOPILOT,
      mode: 'Automático',
      strategyMode: 'Automático',
      officialAutomationAuthorized: false,
      authorizedExecutionChannel: 'Nenhum',
    },
    []
  );
  assert.equal(autoAssisted.action, 'Decisão pronta (Ação assistida): Aceitar');
  assert.equal(autoAssisted.executedAutomatically, false);

  // 3b. Modo Automático COM canal autorizado: executa automaticamente
  const autoExecuted = evaluateAutoPilot(
    'prop-c6-4',
    SAMPLE_PROPOSAL_INPUT,
    analysis,
    {
      ...SEED_AUTOPILOT,
      mode: 'Automático',
      strategyMode: 'Automático',
      officialAutomationAuthorized: true,
      authorizedExecutionChannel: 'API Oficial Autorizada',
    },
    []
  );
  assert.equal(autoExecuted.action, 'Executado automaticamente: Aceitar');
  assert.equal(autoExecuted.executedAutomatically, true);
  assert.equal(autoExecuted.executionChannelUsed, 'API Oficial Autorizada');
});

test('Comando 6 §6 — Classificação semafórica considera reserva EV, limite TVDE 10h e amostra insuficiente de retorno', () => {
  const lowBatteryAnalysis = analyzeProposal(SAMPLE_PROPOSAL_INPUT, SEED_AUTOPILOT.thresholds, {
    currentVehicleRangeKm: 20, // insuficiente para 11 km + 35 km reserva
    minReserveRangeKm: 35,
    remainingLegalWorkMinutes: 15, // insuficiente para 20 min viagem
    destinationHistoricalTripsCount: 1, // < 3 viagens -> null
  });
  assert.equal(lowBatteryAnalysis.batteryAdequate, false);
  assert.equal(lowBatteryAnalysis.tvdeLimitCompliant, false);
  assert.equal(lowBatteryAnalysis.classification, 'vermelho');
  assert.equal(lowBatteryAnalysis.returnPassengerProbabilityPct, null);
  assert.equal(lowBatteryAnalysis.returnProbabilityEpistemicTag, 'Informação indisponível');
});

test('Comando 6 §3 — Smart Capture: normalização OCR/CSV/JSON, deduplicação, flag isDemo real e correção manual auditável', () => {
  const ocrParsed = parseAndNormalizeCaptureInput({
    rawInput: 'Uber Green • €14,60 (+€1,40 bónus) • Recolha 1,2 km (3 min) • Viagem 8,4 km (14 min) -> Parque das Nações',
    format: 'ocr_or_notification',
    source: 'OCR',
  });
  assert.equal(ocrParsed.length, 1);
  assert.equal(ocrParsed[0].platformId, 'uber');
  assert.equal(ocrParsed[0].offerOrGrossEur, 14.6);
  assert.equal(ocrParsed[0].bonusEur, 1.4);
  assert.equal(ocrParsed[0].pickupDistanceKm, 1.2);
  assert.equal(ocrParsed[0].tripDistanceKm, 8.4);
  assert.ok(ocrParsed[0].confidencePct >= 80);

  const csvParsed = parseAndNormalizeCaptureInput({
    rawInput: 'ref,plataforma,valor,km,min,destino,categoria\nBLT-901,bolt,12.40,7.5,16,Chiado,Bolt Comfort',
    format: 'csv',
  });
  assert.equal(csvParsed.length, 1);
  assert.equal(csvParsed[0].platformId, 'bolt');
  assert.equal(csvParsed[0].offerOrGrossEur, 12.4);

  const firstRec = reconcileCapturedEvent(
    {
      externalTxId: 'BLT-901',
      source: 'Relatório CSV/PDF',
      dataType: 'Viagem',
      platformId: 'bolt',
      amountEur: 12.4,
      rawSummary: 'Importado CSV Bolt',
      isDemo: false,
    },
    [],
    []
  );
  assert.equal(firstRec.isDuplicate, false);
  assert.equal(firstRec.captureRecord.isDemo, false);

  const dupRec = reconcileCapturedEvent(
    {
      externalTxId: 'BLT-901',
      source: 'Relatório CSV/PDF',
      dataType: 'Viagem',
      platformId: 'bolt',
      amountEur: 12.4,
      rawSummary: 'Importado CSV Bolt repetido',
      isDemo: false,
    },
    [firstRec.captureRecord],
    []
  );
  assert.equal(dupRec.isDuplicate, true);

  const corrected = applyCaptureManualCorrection(
    firstRec.captureRecord,
    { amountEur: 13.9, destinationZone: 'Baixa-Chiado' },
    'Motorista Teste',
    'Ajuste após portagem confirmada no recibo'
  );
  assert.equal(corrected.ok, true);
  assert.equal(corrected.updatedRecord?.amountEur, 13.9);
  assert.equal(corrected.updatedRecord?.status, 'Corrigido');
  assert.equal(corrected.updatedRecord?.corrections?.length, 2);
});

test('Comando 6 §4 — Conectores Uber e Bolt independentes: superfícies API, backoff exponencial e suite 3 níveis', () => {
  assert.equal(INITIAL_UBER_CONNECTOR.apiSurfaces.length, 3);
  assert.equal(INITIAL_BOLT_CONNECTOR.apiSurfaces.length, 3);
  assert.equal(INITIAL_UBER_CONNECTOR.apiSurfaces[0].exposesLiveDriverOffers, false);

  assert.equal(computeExponentialBackoffSeconds(1), 10);
  assert.equal(computeExponentialBackoffSeconds(2), 20);
  const failed = registerConnectorFailure(INITIAL_UBER_CONNECTOR, 'Timeout HTTP 504');
  assert.equal(failed.connectionState, 'Em Reconexão (Backoff)');
  assert.equal(failed.nextReconnectBackoffSec, 10);

  const l1 = runConnectorVerificationSuite(INITIAL_UBER_CONNECTOR, 1, {
    serverVaultConfigured: false,
    nativeBridgeDetected: false,
    isRealAuthenticatedSession: false,
  });
  assert.equal(l1.result.passed, true);
  assert.equal(l1.result.originTag, 'Dados simulados');

  const l2NoVault = runConnectorVerificationSuite(INITIAL_BOLT_CONNECTOR, 2, {
    serverVaultConfigured: false,
    nativeBridgeDetected: false,
    isRealAuthenticatedSession: true,
  });
  assert.equal(l2NoVault.result.passed, false);
  assert.equal(l2NoVault.result.statusBadge, 'Contrato Validado / Credenciais Pendentes');

  const l3Web = runConnectorVerificationSuite(INITIAL_UBER_CONNECTOR, 3, {
    serverVaultConfigured: true,
    nativeBridgeDetected: false,
    isRealAuthenticatedSession: true,
  });
  assert.equal(l3Web.result.passed, false);
  assert.equal(l3Web.result.statusBadge, 'Aguarda Bridge Nativo / OAuth Real');
});

test('Comando 6 §8 — AIVAD Voice Copilot: anúncios resumidos vs completos, prioridades e anti-repetição (cooldown)', () => {
  const analysis = analyzeProposal(SAMPLE_PROPOSAL_INPUT, SEED_AUTOPILOT.thresholds);
  const draft = buildProposalVoiceAnnouncement(SAMPLE_PROPOSAL_INPUT, analysis, 'Aceitar sugerido');
  assert.ok(draft.shortText.includes('Sinal verde'));

  const first = enqueueVoiceAnnouncement([], draft, DEFAULT_VOICE_COPILOT_CONFIG, '2026-05-12T10:00:00.000Z');
  assert.equal(first.accepted, true);
  assert.equal(first.shouldSpeakAudio, true);

  // Dentro dos 20s de cooldown -> suprimido
  const duplicateWithinCooldown = enqueueVoiceAnnouncement(
    first.updatedHistory,
    draft,
    DEFAULT_VOICE_COPILOT_CONFIG,
    '2026-05-12T10:00:08.000Z'
  );
  assert.equal(duplicateWithinCooldown.accepted, false);
  assert.equal(duplicateWithinCooldown.suppressedByCooldown, true);

  // Após cooldown -> aceite novamente
  const afterCooldown = enqueueVoiceAnnouncement(
    first.updatedHistory,
    draft,
    DEFAULT_VOICE_COPILOT_CONFIG,
    '2026-05-12T10:00:25.000Z'
  );
  assert.equal(afterCooldown.accepted, true);
});

test('Comando 6 §10 — Trilha idempotente LifecycleAuditEvent e separação rigorosa deslocação vs espera', () => {
  const ev1 = createLifecycleAuditEvent({
    eventType: 'Proposta recebida',
    originPlatform: 'uber',
    previousState: 'N/A',
    currentState: 'Capturada',
    changeOrigin: 'Smart Capture',
    associatedEntityId: 'prop-100',
    associatedPayloadSummary: '€15.00 Lisboa',
    idempotencyKey: 'lce:test:prop-100',
  });
  const step1 = appendIdempotentLifecycleEvent([], ev1);
  assert.equal(step1.deduplicated, false);
  assert.equal(step1.updated.length, 1);

  const step2 = appendIdempotentLifecycleEvent(step1.updated, ev1);
  assert.equal(step2.deduplicated, true);
  assert.equal(step2.updated.length, 1);

  const active = startActiveTripFromProposal({
    proposal: SEED_PROPOSALS[0],
    countryCode: 'PT',
    aiRecommendation: 'Aceitar',
    nowIso: '2026-05-12T10:00:00.000Z',
  });
  const timersBeforeArrival = computeTripTimersSnapshot(active, new Date('2026-05-12T10:03:00.000Z').getTime());
  assert.equal(timersBeforeArrival.travelToPickupSeconds, 180);
  assert.equal(timersBeforeArrival.waitAtPickupSeconds, 0);

  const arrived = startTripPassengerWait(
    markTripArrivedAtPickup(active, 'Botão manual no AIVAD', true, '2026-05-12T10:04:00.000Z'),
    '2026-05-12T10:04:00.000Z'
  );
  const timersDuringWait = computeTripTimersSnapshot(arrived, new Date('2026-05-12T10:06:30.000Z').getTime());
  assert.equal(timersDuringWait.travelToPickupSeconds, 240);
  assert.equal(timersDuringWait.waitAtPickupSeconds, 150);
});

test('Comando 6 §7 & §11 — Inteligência de Zonas sem falso tempo real e Filtros/Ordenação de Veículos', () => {
  const trends = computeZoneDemandIntelligence({
    zones: SEED_ZONES,
    trips: SEED_TRIPS,
    isDemoScope: false,
  });
  assert.ok(trends.length >= SEED_ZONES.length);
  for (const t of trends) {
    assert.ok(['Informação histórica', 'Estimativa'].includes(t.epistemicTag));
  }

  const reloc = createZoneRelocationLog({
    fromZone: 'Baixa',
    targetZone: 'Aeroporto',
    suggestedReason: 'Pico histórico matinal',
    epistemicBasis: 'Informação histórica',
    destinationNotes: 'Aguardar junto ao Kiss & Fly',
    isDemo: false,
  });
  assert.equal(reloc.outcome, 'Em deslocação');
  assert.equal(reloc.isDemo, false);

  const sortedByRange = filterVehiclesCatalog(
    SEED_VEHICLES,
    { fuelType: 'Elétrico', minDoors: 4, sortBy: 'rangeDesc' },
    SEED_PLATFORMS
  );
  assert.ok(sortedByRange.length >= 1);
  if (sortedByRange.length >= 2) {
    assert.ok(
      (sortedByRange[0].realRangeKm ?? sortedByRange[0].rangeKm) >=
        (sortedByRange[1].realRangeKm ?? sortedByRange[1].rangeKm)
    );
  }
});

test('Comando 6 §12 & §13 — Tacógrafo (isDemo real + relatórios D/S/M) e Relatórios filtrados por viatura/zona', () => {
  const realStart = startTachographShift(
    { sessions: [], activities: [], platformIntervals: [], offlineQueue: [], discrepancies: [], activeSessionId: null },
    {
      driverId: 'usr-real-1',
      vehicleId: 'veh-1',
      operatorName: 'Operador Real Lda',
      odometerStartKm: 42000,
      countryCode: 'PT',
      city: 'Lisboa',
      isDemo: false,
    }
  );
  assert.equal(realStart.ok, true);
  assert.equal(realStart.session?.isDemo, false);

  const tr = transitionTachographState(realStart.store, {
    targetState: 'Condução em serviço',
    odometerKm: 42015,
    platformId: 'uber',
  });
  assert.equal(tr.ok, true);
  assert.equal(tr.createdActivity?.isDemo, false);

  const weeklyTac = buildTachographPeriodReport(SEED_TACHOGRAPH, 'semanal', SEED_TACHOGRAPH.sessions[0]?.date);
  assert.equal(weeklyTac.periodKind, 'semanal');
  assert.ok(weeklyTac.legalDisclaimer.toLowerCase().includes('homologado'));

  const targetVehicleId = SEED_TRIPS[0].vehicleId;
  const repByVeh = buildComprehensiveReports({
    trips: SEED_TRIPS,
    expenses: [],
    proposals: SEED_PROPOSALS,
    platforms: SEED_PLATFORMS,
    vehicles: SEED_VEHICLES,
    tachograph: SEED_TACHOGRAPH,
    routine: SEED_ROUTINE_PREFS,
    autoPilot: SEED_AUTOPILOT,
    costConfig: SEED_FINANCIAL_COST_CONFIG,
    filters: {
      preset: 'este_ano',
      customStart: '2025-01-01',
      customEnd: '2026-12-31',
      dataScope: 'all',
      platformId: 'ALL',
      vehicleId: targetVehicleId,
      zone: 'ALL',
      category: 'ALL',
      tripStatusFilter: 'ALL',
    },
  });
  assert.ok(repByVeh.completedTrips.every((t) => t.vehicleId === targetVehicleId));
  assert.ok(repByVeh.vehicleAndEnergy.byVehicle.length >= 1);
});

test('Comando 6 §14 — Segurança fail-closed em produção, isolamento CMS Demo Sandbox e validação de registo', () => {
  assert.throws(() => {
    validateServerSecurityConfig({ NODE_ENV: 'production', AIVAD_SESSION_SECRET: '' });
  });
  assert.throws(() => {
    validateServerSecurityConfig({ NODE_ENV: 'production', AIVAD_SESSION_SECRET: 'short-secret' });
  });

  const prodValid = validateServerSecurityConfig({
    NODE_ENV: 'production',
    AIVAD_SESSION_SECRET: 'a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6',
  });
  assert.equal(prodValid.isProduction, true);
  assert.equal(prodValid.usedDevEphemeralFallback, false);

  const demoCms = evaluateCmsMutationAuthorization({
    authenticated: true,
    role: 'Superadministrador',
    isDemoSession: true,
    authMethod: 'demo_sandbox',
  });
  assert.equal(demoCms.allowed, true);
  assert.equal(demoCms.targetScope, 'demo_sandbox_isolated');

  const realAdminCms = evaluateCmsMutationAuthorization({
    authenticated: true,
    role: 'Superadministrador',
    isDemoSession: false,
    authMethod: 'server_credentials',
  });
  assert.equal(realAdminCms.allowed, true);
  assert.equal(realAdminCms.targetScope, 'global_published');

  const shortPass = validateRegistrationPayload({
    name: 'João Motorista',
    email: 'joao@aivad.pt',
    password: '123456',
    role: 'Superadministrador',
  });
  assert.equal(shortPass.valid, false);

  const validReg = validateRegistrationPayload({
    name: 'João Motorista',
    email: 'JOAO@AIVAD.PT ',
    password: 'PasswordSegura2026',
    role: 'Superadministrador',
  });
  assert.equal(validReg.valid, true);
  assert.equal(validReg.email, 'joao@aivad.pt');
  assert.equal(validReg.role, 'Motorista'); // impede escalada para admin no registo público
});
