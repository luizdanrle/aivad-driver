import type {
  ActiveTripSession,
  ArrivalDetectionMethod,
  CancellationBy,
  PlatformCancellationRule,
  PlatformId,
  ProposalRecord,
  TripRecord,
} from '../models/types';

export const PLATFORM_CANCELLATION_RULES: PlatformCancellationRule[] = [
  {
    id: 'rule-uber-pt-std',
    platformId: 'uber',
    countryCode: 'PT',
    category: 'UberX / Green / Comfort',
    freeWaitMinutes: 2,
    paidWaitStartsAtMinutes: 2,
    cancellationDeadlineMinutes: 5,
    estimatedCompensationEur: 3.4,
    source: 'Referência operacional TVDE PT (sujeita a tabela dinâmica na app Uber Driver)',
    verifiedAt: '2026-10-15',
    validUntil: '2027-03-31',
    confirmationStatus: 'Referência operacional estimada',
    notes: 'Taxa de espera após 2 min pode variar por cidade/tarifa. Cancelamento elegível para taxa após prazo apresentado na app oficial.',
  },
  {
    id: 'rule-uber-pt-black',
    platformId: 'uber',
    countryCode: 'PT',
    category: 'Uber Black',
    freeWaitMinutes: 3,
    paidWaitStartsAtMinutes: 3,
    cancellationDeadlineMinutes: 5,
    estimatedCompensationEur: 5.5,
    source: 'Referência operacional categoria executiva PT',
    verifiedAt: '2026-10-15',
    confirmationStatus: 'Referência operacional estimada',
    notes: 'Confirmar sempre o temporizador oficial de espera na aplicação Uber Driver antes de cancelar.',
  },
  {
    id: 'rule-bolt-pt-std',
    platformId: 'bolt',
    countryCode: 'PT',
    category: 'Bolt / Green / Comfort',
    freeWaitMinutes: 3,
    paidWaitStartsAtMinutes: 3,
    cancellationDeadlineMinutes: 5,
    estimatedCompensationEur: 3.2,
    source: 'Referência operacional Bolt PT (sujeita a atualização da app Bolt Driver)',
    verifiedAt: '2026-10-18',
    validUntil: '2027-03-31',
    confirmationStatus: 'Referência operacional estimada',
    notes: 'Prazo total até isenção de penalização e elegibilidade de taxa pode variar consoante aeroporto/campanha.',
  },
  {
    id: 'rule-cabify-es',
    platformId: 'cabify',
    countryCode: 'ES',
    category: 'Cabify / Executive',
    freeWaitMinutes: 3,
    paidWaitStartsAtMinutes: 3,
    cancellationDeadlineMinutes: 6,
    estimatedCompensationEur: 4.0,
    source: 'Referência operacional VTC Cabify Espanha',
    verifiedAt: '2026-10-10',
    confirmationStatus: 'Referência operacional estimada',
    notes: 'Reservas programadas em Espanha/América Latina podem ter janela de espera superior na app oficial (operação em PT encerrada em nov/2019).',
  },
  {
    id: 'rule-freenow-eu',
    platformId: 'freenow',
    countryCode: 'ES',
    category: 'Ride / Eco Ride',
    freeWaitMinutes: 3,
    paidWaitStartsAtMinutes: 3,
    cancellationDeadlineMinutes: 5,
    estimatedCompensationEur: 3.5,
    source: 'Referência operacional FREE NOW Europa (ES/UK/DE/FR)',
    verifiedAt: '2026-10-08',
    confirmationStatus: 'Referência operacional estimada',
    notes: 'Aplicável em Espanha, Reino Unido, França e Alemanha (operação TVDE em Portugal encerrada em abr/2023).',
  },
];

export function resolveCancellationRule(
  platformId: PlatformId,
  countryCode = 'PT',
  category = ''
): PlatformCancellationRule {
  const catLower = category.toLowerCase();
  const exact = PLATFORM_CANCELLATION_RULES.find(
    (r) =>
      r.platformId === platformId &&
      r.countryCode === countryCode &&
      (catLower.includes('black')
        ? r.category.toLowerCase().includes('black')
        : !r.category.toLowerCase().includes('black'))
  );
  if (exact) return exact;

  const samePlat = PLATFORM_CANCELLATION_RULES.find((r) => r.platformId === platformId);
  if (samePlat) return samePlat;

  return {
    id: `rule-unconfirmed-${platformId}-${countryCode}`,
    platformId,
    countryCode,
    category: category || 'Padrão',
    freeWaitMinutes: 2,
    paidWaitStartsAtMinutes: 2,
    cancellationDeadlineMinutes: 5,
    estimatedCompensationEur: 0,
    source: 'Sem regra oficial confirmada para esta plataforma/mercado',
    verifiedAt: new Date().toISOString().slice(0, 10),
    confirmationStatus: 'Regra não confirmada — consultar app oficial',
    notes: 'Estes tempos são apenas orientação indicativa. Consulte obrigatoriamente o cronómetro da aplicação da plataforma antes de cancelar.',
  };
}

export function startActiveTripFromProposal(params: {
  proposal: ProposalRecord;
  countryCode: string;
  aiRecommendation: ActiveTripSession['aiRecommendation'];
  nowIso?: string;
}): ActiveTripSession {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const rule = resolveCancellationRule(
    params.proposal.input.platformId,
    params.countryCode,
    params.proposal.input.category
  );

  return {
    id: `act-${Date.now()}`,
    proposalId: params.proposal.id,
    externalRef: `${params.proposal.input.platformId.toUpperCase().slice(0, 2)}-${String(Date.now()).slice(-5)}`,
    platformId: params.proposal.input.platformId,
    category: params.proposal.input.category,
    countryCode: params.countryCode,
    phase: 'Em deslocação para recolha',
    aiRecommendation: params.aiRecommendation,
    driverDecision: 'Aceite pelo motorista',
    platformConfirmed: false,
    confirmationMethod: 'Confirmação manual',
    acceptedAtIso: nowIso,
    pickupDistanceKm: params.proposal.input.pickupDistanceKm,
    tripDistanceKm: params.proposal.input.tripDistanceKm,
    pickupTimeEstMin: params.proposal.input.pickupTimeMin,
    tripTimeEstMin: params.proposal.input.tripTimeMin,
    pickupZone: params.proposal.input.region,
    pickupAddress: params.proposal.input.pickupAddress,
    destinationZone: params.proposal.input.destinationAddress || 'Destino proposto',
    destinationAddress: params.proposal.input.destinationAddress,
    grossEstimatedEur: params.proposal.input.grossValueEur,
    netEstimatedEur: params.proposal.analysis.estimatedNetEur,
    ruleApplied: rule,
    isDemo: params.proposal.isDemo,
  };
}

export function markTripArrivedAtPickup(
  session: ActiveTripSession,
  method: ArrivalDetectionMethod,
  startWaitImmediately = true,
  nowIso = new Date().toISOString()
): ActiveTripSession {
  return {
    ...session,
    phase: startWaitImmediately ? 'Em espera pelo passageiro' : 'Chegada ao local de recolha',
    arrivedAtIso: session.arrivedAtIso ?? nowIso,
    waitStartedAtIso: startWaitImmediately ? session.waitStartedAtIso ?? nowIso : session.waitStartedAtIso,
    arrivalMethod: method,
  };
}

export function startTripPassengerWait(
  session: ActiveTripSession,
  nowIso = new Date().toISOString()
): ActiveTripSession {
  return {
    ...session,
    phase: 'Em espera pelo passageiro',
    arrivedAtIso: session.arrivedAtIso ?? nowIso,
    waitStartedAtIso: session.waitStartedAtIso ?? nowIso,
    arrivalMethod: session.arrivalMethod ?? 'Botão manual no AIVAD',
  };
}

export function startTripInProgress(
  session: ActiveTripSession,
  nowIso = new Date().toISOString()
): ActiveTripSession {
  return {
    ...session,
    phase: 'Viagem em curso',
    platformConfirmed: true,
    confirmationMethod: 'Confirmação manual',
    tripStartedAtIso: session.tripStartedAtIso ?? nowIso,
  };
}

export interface TripTimersSnapshot {
  travelToPickupSeconds: number;
  waitAtPickupSeconds: number;
  waitPhaseStatus:
    | 'Em deslocação (espera ainda não iniciada)'
    | 'Chegou (aguarda início de contagem de espera)'
    | 'Espera gratuita'
    | 'Espera remunerada estimada'
    | 'Prazo de cancelamento atingido — decidir na app oficial';
  remainingFreeWaitSeconds: number;
  remainingToCancelDeadlineSeconds: number;
  canCancelWithNoShowGuidance: boolean;
  neverAutoCancelsNote: string;
}

/**
 * Pure timer snapshot: strictly separates travel-to-pickup time from wait-at-pickup time.
 * Wait timer is ALWAYS 0 until arrival/wait is explicitly triggered, and NEVER auto-cancels a trip.
 */
export function computeTripTimersSnapshot(
  session: ActiveTripSession,
  nowMs = Date.now()
): TripTimersSnapshot {
  const acceptedMs = new Date(session.acceptedAtIso).getTime();
  const arrivedMs = session.arrivedAtIso ? new Date(session.arrivedAtIso).getTime() : null;
  const waitStartMs = session.waitStartedAtIso ? new Date(session.waitStartedAtIso).getTime() : null;
  const tripStartMs = session.tripStartedAtIso ? new Date(session.tripStartedAtIso).getTime() : null;
  const endedMs = session.endedAtIso ? new Date(session.endedAtIso).getTime() : null;

  const travelEndMs = arrivedMs ?? tripStartMs ?? endedMs ?? nowMs;
  const travelToPickupSeconds = Number.isFinite(acceptedMs)
    ? Math.max(0, Math.floor((travelEndMs - acceptedMs) / 1000))
    : 0;

  let waitAtPickupSeconds = 0;
  if (waitStartMs && Number.isFinite(waitStartMs)) {
    const waitEndMs = tripStartMs ?? endedMs ?? nowMs;
    waitAtPickupSeconds = Math.max(0, Math.floor((waitEndMs - waitStartMs) / 1000));
  }

  const freeWaitLimitSec = Math.max(0, session.ruleApplied.freeWaitMinutes * 60);
  const cancelDeadlineSec = Math.max(60, session.ruleApplied.cancellationDeadlineMinutes * 60);

  let waitPhaseStatus: TripTimersSnapshot['waitPhaseStatus'] = 'Em deslocação (espera ainda não iniciada)';
  if (!session.arrivedAtIso && session.phase === 'Em deslocação para recolha') {
    waitPhaseStatus = 'Em deslocação (espera ainda não iniciada)';
  } else if (!session.waitStartedAtIso) {
    waitPhaseStatus = 'Chegou (aguarda início de contagem de espera)';
  } else if (waitAtPickupSeconds < freeWaitLimitSec) {
    waitPhaseStatus = 'Espera gratuita';
  } else if (waitAtPickupSeconds < cancelDeadlineSec) {
    waitPhaseStatus = 'Espera remunerada estimada';
  } else {
    waitPhaseStatus = 'Prazo de cancelamento atingido — decidir na app oficial';
  }

  return {
    travelToPickupSeconds,
    waitAtPickupSeconds,
    waitPhaseStatus,
    remainingFreeWaitSeconds: Math.max(0, freeWaitLimitSec - waitAtPickupSeconds),
    remainingToCancelDeadlineSeconds: Math.max(0, cancelDeadlineSec - waitAtPickupSeconds),
    canCancelWithNoShowGuidance: waitAtPickupSeconds >= cancelDeadlineSec,
    neverAutoCancelsNote:
      'O AIVAD nunca cancela automaticamente a corrida quando o cronómetro chega a 0. Confirme o estado e decida na app oficial.',
  };
}

export function buildCancelledTripFromActiveSession(params: {
  session: ActiveTripSession;
  cancellationBy: CancellationBy;
  isNoShow: boolean;
  reason: string;
  compensationEur: number;
  commissionPct: number;
  nowIso?: string;
}): TripRecord {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const timers = computeTripTimersSnapshot(params.session, new Date(nowIso).getTime());
  const comp = Math.max(0, params.compensationEur);
  const commEur = comp > 0 ? Math.round((comp * (params.commissionPct / 100) + Number.EPSILON) * 100) / 100 : 0;
  const netEur = Math.max(0, Math.round((comp - commEur + Number.EPSILON) * 100) / 100);

  const status: TripRecord['status'] = params.isNoShow
    ? 'Passageiro não compareceu'
    : params.cancellationBy === 'Passageiro'
    ? 'Cancelada pelo passageiro'
    : params.cancellationBy === 'Motorista'
    ? 'Cancelada pelo motorista'
    : 'Cancelada';

  return {
    id: `trip-canc-${Date.now()}`,
    externalRef: params.session.externalRef,
    platformId: params.session.platformId,
    vehicleId: 'veh-active',
    date: nowIso.slice(0, 10),
    time: nowIso.slice(11, 16),
    grossEur: comp,
    estimatedGrossEur: params.session.grossEstimatedEur,
    chargedTotalEur: comp,
    tipEur: 0,
    bonusEur: 0,
    tollsEur: 0,
    commissionEur: commEur,
    operationalCostEur: 0.25,
    netEur,
    countryCode: params.session.countryCode,
    pickupDistanceKm: params.session.pickupDistanceKm,
    tripDistanceKm: params.session.tripDistanceKm,
    durationMin: Math.max(1, Math.round((timers.travelToPickupSeconds + timers.waitAtPickupSeconds) / 60)),
    travelToPickupSeconds: timers.travelToPickupSeconds,
    waitAtPickupSeconds: timers.waitAtPickupSeconds,
    pickupZone: params.session.pickupZone,
    pickupAddress: params.session.pickupAddress,
    destinationZone: params.session.destinationZone,
    destinationAddress: params.session.destinationAddress,
    category: params.session.category,
    status,
    cancellationBy: params.cancellationBy,
    cancellationReason: params.reason,
    cancellationCompensationEur: comp,
    driverNoShowConfirmed: params.isNoShow,
    officialImpactNote: 'Verificar eventual impacto ou taxa final diretamente na app da plataforma.',
    aiRecommendedAction: params.session.aiRecommendation,
    driverExecutionConfirmed: true,
    platformExecutionConfirmed: params.session.platformConfirmed,
    lifecycleEventKey: `lifecycle:${params.session.id}`,
    isEstimatedBreakdown: true,
    source: 'Manual',
    proposalId: params.session.proposalId,
    isDemo: params.session.isDemo,
  };
}

export function hasExistingLifecycleTrip(trips: TripRecord[], proposalId?: string, externalRef?: string): boolean {
  return trips.some(
    (t) =>
      (proposalId && t.proposalId === proposalId) ||
      (externalRef && t.externalRef === externalRef)
  );
}

export function createLifecycleAuditEvent(params: {
  eventType: import('../models/types').LifecycleAuditEventType;
  originPlatform: PlatformId | 'aivad_system';
  previousState: string;
  currentState: string;
  changeOrigin: import('../models/types').LifecycleAuditEvent['changeOrigin'];
  associatedEntityId?: string;
  associatedPayloadSummary: string;
  auditNotes?: string[];
  idempotencyKey?: string;
  timestampIso?: string;
  isDemo?: boolean;
}): import('../models/types').LifecycleAuditEvent {
  const ts = params.timestampIso ?? new Date().toISOString();
  const idempotencyKey =
    params.idempotencyKey ??
    `lce:${params.eventType}:${params.originPlatform}:${params.associatedEntityId ?? 'global'}:${params.currentState}:${ts.slice(0, 19)}`;

  return {
    id: `lce-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    idempotencyKey,
    eventType: params.eventType,
    originPlatform: params.originPlatform,
    timestamp: ts,
    previousState: params.previousState,
    currentState: params.currentState,
    changeOrigin: params.changeOrigin,
    associatedEntityId: params.associatedEntityId,
    associatedPayloadSummary: params.associatedPayloadSummary,
    auditTrail: [
      `[${ts}] ${params.eventType}: "${params.previousState}" -> "${params.currentState}" (${params.changeOrigin})`,
      ...(params.auditNotes ?? []),
    ],
    isDemo: Boolean(params.isDemo),
  };
}

export function appendIdempotentLifecycleEvent(
  existing: import('../models/types').LifecycleAuditEvent[],
  incoming: import('../models/types').LifecycleAuditEvent,
  maxEvents = 250
): { updated: import('../models/types').LifecycleAuditEvent[]; deduplicated: boolean } {
  if (existing.some((e) => e.idempotencyKey === incoming.idempotencyKey)) {
    return { updated: existing, deduplicated: true };
  }
  return {
    updated: [incoming, ...existing].slice(0, maxEvents),
    deduplicated: false,
  };
}

