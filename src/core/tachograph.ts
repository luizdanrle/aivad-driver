import type {
  PlatformId,
  TachographActivityRecord,
  TachographDiscrepancy,
  TachographOfflineQueueItem,
  TachographPlatformInterval,
  TachographShiftSession,
  TachographState,
  TachographStateStore,
} from '../models/types';

export const TACHOGRAPH_STATES: TachographState[] = [
  'Fora de serviço',
  'Início de turno',
  'Condução em serviço',
  'Trabalho sem condução',
  'Disponibilidade',
  'Espera',
  'Pausa',
  'Refeição',
  'Descanso',
  'Fim de turno',
];

export const TACHOGRAPH_STATE_REG_ALIASES: Record<TachographState, { portariaGroup: string; legalCountableAsWork: boolean }> = {
  'Fora de serviço': { portariaGroup: 'Repouso / Fora de atividade TVDE', legalCountableAsWork: false },
  'Início de turno': { portariaGroup: 'Abertura de jornada multiplataforma', legalCountableAsWork: true },
  'Condução em serviço': { portariaGroup: 'Condução efetiva TVDE', legalCountableAsWork: true },
  'Trabalho sem condução': { portariaGroup: 'Outros trabalhos / Preparação de viatura', legalCountableAsWork: true },
  'Disponibilidade': { portariaGroup: 'Tempo de disponibilidade conectado às apps', legalCountableAsWork: true },
  'Espera': { portariaGroup: 'Tempo de espera em serviço', legalCountableAsWork: true },
  'Pausa': { portariaGroup: 'Pausa / Interrupção obrigatória', legalCountableAsWork: false },
  'Refeição': { portariaGroup: 'Intervalo de refeição', legalCountableAsWork: false },
  'Descanso': { portariaGroup: 'Período de descanso / repouso', legalCountableAsWork: false },
  'Fim de turno': { portariaGroup: 'Encerramento de jornada', legalCountableAsWork: false },
};

export interface Rolling24hComplianceResult {
  rolling24hWorkMinutes: number;
  rolling24hBreakMinutes: number;
  legalDailyLimitMinutes: number;
  remainingLegalMinutes: number;
  utilizationPct: number;
  alertLevel: 'Normal' | 'Preventivo 8h (480 min)' | 'Crítico 9h (540 min)' | 'Limite 10h Atingido';
  alerts: string[];
  platformBreakdownNote: string;
}

export function evaluateRolling24hCompliance(
  activities: TachographActivityRecord[],
  platformIntervals: TachographPlatformInterval[],
  referenceNowIso = new Date().toISOString(),
  legalDailyLimitMinutes = 600
): Rolling24hComplianceResult {
  const parsedRef = new Date(referenceNowIso).getTime();
  const refMs = Number.isFinite(parsedRef) ? parsedRef : Date.now();
  const cutoffMs = refMs - 24 * 60 * 60 * 1000;

  const countableWorkIntervals: Array<{ startIso: string; endIso: string }> = [];
  const countableBreakIntervals: Array<{ startIso: string; endIso: string }> = [];

  for (const act of activities) {
    const startMs = new Date(act.startIso).getTime();
    if (!Number.isFinite(startMs)) continue;

    let endMs: number;
    if (act.endIso) {
      const parsedEnd = new Date(act.endIso).getTime();
      if (!Number.isFinite(parsedEnd) || parsedEnd <= startMs) continue;
      endMs = parsedEnd;
    } else if (act.status === 'Ativo') {
      // Active open block uses explicit duration if positive or elapsed time up to refMs
      const elapsedMs = Math.max(0, refMs - startMs);
      const fallbackMs = Math.max(0, act.durationMinutes) * 60000;
      endMs = startMs + Math.max(elapsedMs, fallbackMs);
    } else if (act.durationMinutes > 0) {
      endMs = startMs + act.durationMinutes * 60000;
    } else {
      continue;
    }

    const clampedStart = Math.max(startMs, cutoffMs);
    const clampedEnd = Math.min(endMs, refMs);
    if (clampedEnd <= clampedStart) continue;

    const span = {
      startIso: new Date(clampedStart).toISOString(),
      endIso: new Date(clampedEnd).toISOString(),
    };

    if (TACHOGRAPH_STATE_REG_ALIASES[act.state]?.legalCountableAsWork) {
      countableWorkIntervals.push(span);
    } else if (act.state === 'Pausa' || act.state === 'Refeição' || act.state === 'Descanso') {
      countableBreakIntervals.push(span);
    }
  }

  for (const pi of platformIntervals) {
    const startMs = new Date(pi.startIso).getTime();
    const endMs = new Date(pi.endIso).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;
    const clampedStart = Math.max(startMs, cutoffMs);
    const clampedEnd = Math.min(endMs, refMs);
    if (clampedEnd <= clampedStart) continue;
    countableWorkIntervals.push({
      startIso: new Date(clampedStart).toISOString(),
      endIso: new Date(clampedEnd).toISOString(),
    });
  }

  const { mergedMinutes: rolling24hWorkMinutes } = mergeTimeIntervalsMinutes(countableWorkIntervals);
  const { mergedMinutes: rolling24hBreakMinutes } = mergeTimeIntervalsMinutes(countableBreakIntervals);
  const remainingLegalMinutes = Math.max(0, legalDailyLimitMinutes - rolling24hWorkMinutes);
  const utilizationPct = Math.min(100, Math.round((rolling24hWorkMinutes / Math.max(1, legalDailyLimitMinutes)) * 100));

  const alerts: string[] = [];
  let alertLevel: Rolling24hComplianceResult['alertLevel'] = 'Normal';

  if (rolling24hWorkMinutes >= legalDailyLimitMinutes) {
    alertLevel = 'Limite 10h Atingido';
    alerts.push('Limite legal de 10h (600 min) em janela deslizante de 24h atingido. Deve iniciar descanso imediato.');
  } else if (rolling24hWorkMinutes >= 540) {
    alertLevel = 'Crítico 9h (540 min)';
    alerts.push(`Alerta preventivo 9h: restam apenas ${remainingLegalMinutes} min do limite diário de 10h nas últimas 24h.`);
  } else if (rolling24hWorkMinutes >= 480) {
    alertLevel = 'Preventivo 8h (480 min)';
    alerts.push(`Alerta preventivo 8h: planeie o regresso à base/garagem (restam ${remainingLegalMinutes} min).`);
  }

  if (rolling24hWorkMinutes > 270 && rolling24hBreakMinutes < 45) {
    alerts.push('Condução/atividade > 4h30 sem 45 min acumulados de pausa/refeição.');
  }

  return {
    rolling24hWorkMinutes,
    rolling24hBreakMinutes,
    legalDailyLimitMinutes,
    remainingLegalMinutes,
    utilizationPct,
    alertLevel,
    alerts,
    platformBreakdownNote:
      'União cronológica única de blocos do tacógrafo e intervalos multi-plataforma nas últimas 24h (soma períodos distintos e funde sobreposições sem dupla contagem).',
  };
}

export const PORTARIA_7_2022_CHECKLIST = [
  {
    id: 'chk-1',
    requirement: 'Identificação única do motorista (CMTVDE / NIF / ID interno)',
    status: 'Implementado no modelo de sessão',
    portariaRef: 'Portaria n.º 7/2022 · Registo de tempos de trabalho TVDE',
  },
  {
    id: 'chk-2',
    requirement: 'Separação entre condução, outros trabalhos, disponibilidade e pausas/descanso',
    status: 'Implementado nos 10 estados auditáveis',
    portariaRef: 'Art. 25.º Lei n.º 45/2018 & Portaria n.º 7/2022',
  },
  {
    id: 'chk-3',
    requirement: 'Consolidação multi-plataforma em janela de 24h com teto máximo de 10h',
    status: 'Cálculo ativo (sem dupla contagem)',
    portariaRef: 'Art. 10.º n.º 5 Lei n.º 45/2018',
  },
  {
    id: 'chk-4',
    requirement: 'Trilha de alterações imutável com motivo e código QR de verificação',
    status: 'Ativo localmente (Exportável PDF/CSV/QR)',
    portariaRef: 'Boa prática de auditoria — homologação oficial sujeita a validação ACT/IMT',
  },
] as const;

export const TACHOGRAPH_LEGAL_DISCLAIMER =
  'Registo digital operacional AIVAD TACÓGRAFO TVDE com trilha auditável e código QR verificável. Não substitui equipamento ou tacógrafo oficialmente homologado sem validação legal e técnica expressa das autoridades competentes.';

export interface TachographTransitionResult {
  ok: boolean;
  error?: string;
  store: TachographStateStore;
  createdActivity?: TachographActivityRecord;
  session?: TachographShiftSession;
}

export function computeIntegrityDigest(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `AIVAD-${p1}-${p2}`;
}

export function canTransitionTachographState(
  from: TachographState,
  to: TachographState,
  hasActiveShift: boolean
): { allowed: boolean; reason?: string } {
  if (from === to) {
    return { allowed: false, reason: `O tacógrafo já se encontra no estado "${to}".` };
  }

  if (!hasActiveShift || from === 'Fora de serviço' || from === 'Fim de turno') {
    if (to === 'Início de turno') {
      return { allowed: true };
    }
    if (from === 'Fim de turno' && to === 'Fora de serviço') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Transição inválida de "${from}" para "${to}" sem turno ativo. Inicie primeiro um turno.`,
    };
  }

  // Active shift exists (from is one of Início de turno .. Descanso)
  if (to === 'Início de turno') {
    return {
      allowed: false,
      reason: 'Já existe um turno em curso. Encerre o turno atual com "Fim de turno" antes de iniciar outro.',
    };
  }

  if (to === 'Fora de serviço') {
    return {
      allowed: false,
      reason: 'Registe primeiro "Fim de turno" para encerrar o odómetro e fechar o turno ativo antes de passar a Fora de serviço.',
    };
  }

  return { allowed: true };
}

function diffMinutes(startIso: string, endIso: string): number {
  const ms = Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
  return Math.max(1, Math.round(ms / 60000));
}

export function startTachographShift(
  store: TachographStateStore,
  params: {
    driverId: string;
    vehicleId: string;
    operatorName: string;
    odometerStartKm: number;
    countryCode: string;
    city: string;
    timestampIso?: string;
    notes?: string;
    source?: TachographActivityRecord['source'];
    idempotencyKey?: string;
    isDemo?: boolean;
  }
): TachographTransitionResult {
  const activeSession = store.sessions.find((s) => s.id === store.activeSessionId && s.status === 'Em curso');
  if (activeSession) {
    return {
      ok: false,
      error: `Já existe um turno ativo (${activeSession.id}). Encerre-o antes de iniciar novo turno.`,
      store,
    };
  }

  if (!Number.isFinite(params.odometerStartKm) || params.odometerStartKm < 0) {
    return {
      ok: false,
      error: 'Odómetro inicial inválido. Introduza um valor numérico não negativo.',
      store,
    };
  }

  const nowIso = params.timestampIso ?? new Date().toISOString();
  const idKey = params.idempotencyKey ?? `tach:start:${params.driverId}:${nowIso}`;
  if (store.activities.some((a) => a.idempotencyKey === idKey)) {
    return {
      ok: false,
      error: 'Ação duplicada detetada pelo motor idempotente do tacógrafo.',
      store,
    };
  }

  const sessionId = `tsh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const hash = computeIntegrityDigest(`${sessionId}:${params.driverId}:${params.odometerStartKm}:${nowIso}`);
  const isDemoFlag = Boolean(params.isDemo);

  const session: TachographShiftSession = {
    id: sessionId,
    driverId: params.driverId,
    vehicleId: params.vehicleId,
    operatorName: params.operatorName,
    date: nowIso.slice(0, 10),
    startIso: nowIso,
    odometerStartKm: params.odometerStartKm,
    odometerCurrentKm: params.odometerStartKm,
    currentState: 'Início de turno',
    status: 'Em curso',
    countryCode: params.countryCode,
    city: params.city,
    qrVerificationHash: hash,
    isDemo: isDemoFlag,
  };

  const activity: TachographActivityRecord = {
    id: `tac-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    shiftSessionId: sessionId,
    driverId: params.driverId,
    vehicleId: params.vehicleId,
    operatorName: params.operatorName,
    date: nowIso.slice(0, 10),
    state: 'Início de turno',
    startIso: nowIso,
    durationMinutes: 1,
    odometerStartKm: params.odometerStartKm,
    movementKind: 'Estacionado / Sem movimento',
    source: params.source ?? 'Manual',
    notes: params.notes ?? 'Início oficial do turno no tacógrafo TVDE.',
    status: 'Ativo',
    syncStatus: 'Sincronizado',
    idempotencyKey: idKey,
    revisions: [],
    isDemo: isDemoFlag,
  };

  return {
    ok: true,
    session,
    createdActivity: activity,
    store: {
      ...store,
      sessions: [session, ...store.sessions],
      activities: [activity, ...store.activities],
      activeSessionId: sessionId,
    },
  };
}

export function transitionTachographState(
  store: TachographStateStore,
  params: {
    targetState: TachographState;
    odometerKm: number;
    timestampIso?: string;
    platformId?: PlatformId;
    movementKind?: TachographActivityRecord['movementKind'];
    notes?: string;
    source?: TachographActivityRecord['source'];
    idempotencyKey?: string;
  }
): TachographTransitionResult {
  const activeSession = store.sessions.find((s) => s.id === store.activeSessionId && s.status === 'Em curso');
  const fromState: TachographState = activeSession?.currentState ?? 'Fora de serviço';

  const guard = canTransitionTachographState(fromState, params.targetState, Boolean(activeSession));
  if (!guard.allowed || !activeSession) {
    return {
      ok: false,
      error: guard.reason ?? 'Não existe turno ativo no tacógrafo.',
      store,
    };
  }

  if (!Number.isFinite(params.odometerKm) || params.odometerKm < activeSession.odometerCurrentKm) {
    return {
      ok: false,
      error: `Odómetro inválido (${params.odometerKm} km): não pode ser inferior ao odómetro atual (${activeSession.odometerCurrentKm} km).`,
      store,
    };
  }

  const nowIso = params.timestampIso ?? new Date().toISOString();
  const idKey = params.idempotencyKey ?? `tach:trans:${activeSession.id}:${params.targetState}:${nowIso}`;
  if (store.activities.some((a) => a.idempotencyKey === idKey)) {
    return {
      ok: false,
      error: 'Registo já processado (idempotente).',
      store,
    };
  }

  // Close currently active activity in this shift
  const updatedActivities = store.activities.map((a) => {
    if (a.shiftSessionId === activeSession.id && a.status === 'Ativo') {
      return {
        ...a,
        endIso: nowIso,
        durationMinutes: diffMinutes(a.startIso, nowIso),
        odometerEndKm: params.odometerKm,
        status: 'Fechado' as const,
      };
    }
    return a;
  });

  const isClosing = params.targetState === 'Fim de turno';
  const newActivity: TachographActivityRecord = {
    id: `tac-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    shiftSessionId: activeSession.id,
    driverId: activeSession.driverId,
    vehicleId: activeSession.vehicleId,
    operatorName: activeSession.operatorName,
    date: nowIso.slice(0, 10),
    state: params.targetState,
    startIso: nowIso,
    endIso: isClosing ? nowIso : undefined,
    durationMinutes: isClosing ? 1 : 0,
    odometerStartKm: params.odometerKm,
    odometerEndKm: isClosing ? params.odometerKm : undefined,
    platformId: params.platformId,
    movementKind:
      params.movementKind ??
      (params.targetState === 'Condução em serviço' ? 'Com passageiro' : 'Estacionado / Sem movimento'),
    source: params.source ?? 'Manual',
    notes: params.notes ?? `Transição para ${params.targetState}`,
    status: isClosing ? 'Fechado' : 'Ativo',
    syncStatus: 'Sincronizado',
    idempotencyKey: idKey,
    revisions: [],
    isDemo: activeSession.isDemo,
  };

  const nextHash = computeIntegrityDigest(
    `${activeSession.id}:${params.targetState}:${params.odometerKm}:${nowIso}`
  );

  const updatedSession: TachographShiftSession = {
    ...activeSession,
    odometerCurrentKm: params.odometerKm,
    currentState: isClosing ? 'Fim de turno' : params.targetState,
    status: isClosing ? 'Encerrado' : 'Em curso',
    endIso: isClosing ? nowIso : activeSession.endIso,
    odometerEndKm: isClosing ? params.odometerKm : activeSession.odometerEndKm,
    qrVerificationHash: nextHash,
  };

  return {
    ok: true,
    session: updatedSession,
    createdActivity: newActivity,
    store: {
      ...store,
      sessions: store.sessions.map((s) => (s.id === activeSession.id ? updatedSession : s)),
      activities: [newActivity, ...updatedActivities],
      activeSessionId: isClosing ? null : activeSession.id,
    },
  };
}

export function correctTachographRecord(
  record: TachographActivityRecord,
  patch: {
    state?: TachographState;
    durationMinutes?: number;
    odometerStartKm?: number;
    odometerEndKm?: number;
    notes?: string;
  },
  reason: string,
  revisedBy: string
): { ok: boolean; error?: string; record?: TachographActivityRecord } {
  if (!reason || reason.trim().length < 5) {
    return {
      ok: false,
      error: 'A correção de um registo de tacógrafo exige motivo justificativo auditável (mínimo 5 caracteres).',
    };
  }
  if (
    patch.odometerStartKm !== undefined &&
    patch.odometerEndKm !== undefined &&
    patch.odometerEndKm < patch.odometerStartKm
  ) {
    return {
      ok: false,
      error: 'Odómetro final da atividade não pode ser inferior ao inicial.',
    };
  }

  const revision = {
    revisedAt: new Date().toISOString(),
    revisedBy,
    reason: reason.trim(),
    previousState: record.state,
    previousStartIso: record.startIso,
    previousEndIso: record.endIso,
    previousOdometerKm: record.odometerStartKm,
    previousNotes: record.notes,
  };

  return {
    ok: true,
    record: {
      ...record,
      state: patch.state ?? record.state,
      durationMinutes: patch.durationMinutes ?? record.durationMinutes,
      odometerStartKm: patch.odometerStartKm ?? record.odometerStartKm,
      odometerEndKm: patch.odometerEndKm ?? record.odometerEndKm,
      notes: patch.notes ?? record.notes,
      status: 'Corrigido',
      revisions: [...record.revisions, revision],
    },
  };
}

export interface ConsolidatedTachographSummary {
  consolidatedOnlineMinutes: number;
  rawPlatformOnlineMinutes: number;
  overlapEliminatedMinutes: number;
  drivingMinutes: number;
  passengerTripMinutes: number;
  emptyMovementMinutes: number;
  workWithoutDrivingMinutes: number;
  availabilityMinutes: number;
  waitMinutes: number;
  breakMinutes: number;
  mealMinutes: number;
  restMinutes: number;
  totalWorkdayMinutes: number;
  totalKmDriven: number;
  complianceAlerts: string[];
}

/**
 * Merges overlapping intervals across platforms so being online on Uber and Bolt simultaneously
 * produces ONE unified chronological workday (never double-counted).
 */
export function mergeTimeIntervalsMinutes(
  intervals: Array<{ startIso: string; endIso: string }>
): { mergedMinutes: number; rawMinutes: number } {
  const valid = intervals
    .map((i) => ({
      start: new Date(i.startIso).getTime(),
      end: new Date(i.endIso).getTime(),
    }))
    .filter((i) => Number.isFinite(i.start) && Number.isFinite(i.end) && i.end > i.start)
    .sort((a, b) => a.start - b.start);

  const rawMinutes = Math.round(
    valid.reduce((acc, i) => acc + (i.end - i.start) / 60000, 0)
  );
  if (valid.length === 0) return { mergedMinutes: 0, rawMinutes: 0 };

  const merged: Array<{ start: number; end: number }> = [valid[0]];
  for (let idx = 1; idx < valid.length; idx++) {
    const prev = merged[merged.length - 1];
    const cur = valid[idx];
    if (cur.start <= prev.end) {
      prev.end = Math.max(prev.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }

  const mergedMinutes = Math.round(
    merged.reduce((acc, i) => acc + (i.end - i.start) / 60000, 0)
  );
  return { mergedMinutes, rawMinutes };
}

export function consolidateMultiPlatformJornada(
  activities: TachographActivityRecord[],
  platformIntervals: TachographPlatformInterval[],
  sessions: TachographShiftSession[]
): ConsolidatedTachographSummary {
  const { mergedMinutes, rawMinutes } = mergeTimeIntervalsMinutes(platformIntervals);

  let drivingMinutes = 0;
  let passengerTripMinutes = 0;
  let emptyMovementMinutes = 0;
  let workWithoutDrivingMinutes = 0;
  let availabilityMinutes = 0;
  let waitMinutes = 0;
  let breakMinutes = 0;
  let mealMinutes = 0;
  let restMinutes = 0;

  for (const act of activities) {
    const mins = Math.max(0, act.durationMinutes);
    switch (act.state) {
      case 'Condução em serviço':
        drivingMinutes += mins;
        if (act.movementKind === 'Deslocação em vazio') {
          emptyMovementMinutes += mins;
        } else {
          passengerTripMinutes += mins;
        }
        break;
      case 'Trabalho sem condução':
        workWithoutDrivingMinutes += mins;
        break;
      case 'Disponibilidade':
        availabilityMinutes += mins;
        break;
      case 'Espera':
        waitMinutes += mins;
        break;
      case 'Pausa':
        breakMinutes += mins;
        break;
      case 'Refeição':
        mealMinutes += mins;
        break;
      case 'Descanso':
        restMinutes += mins;
        break;
      default:
        break;
    }
  }

  const totalWorkdayMinutes =
    drivingMinutes + workWithoutDrivingMinutes + availabilityMinutes + waitMinutes;

  const totalKmDriven = sessions.reduce(
    (sum, s) => sum + Math.max(0, (s.odometerEndKm ?? s.odometerCurrentKm) - s.odometerStartKm),
    0
  );

  const complianceAlerts: string[] = [];
  if (drivingMinutes > 270 && breakMinutes + mealMinutes < 45) {
    complianceAlerts.push(
      'Alerta operacional: mais de 4h30 de condução registadas com menos de 45 min de pausa/refeição.'
    );
  }
  if (totalWorkdayMinutes > 600) {
    complianceAlerts.push(
      'Alerta jornada: tempo consolidado de trabalho/disponibilidade acima de 10h no período selecionado.'
    );
  }

  return {
    consolidatedOnlineMinutes: mergedMinutes || totalWorkdayMinutes,
    rawPlatformOnlineMinutes: rawMinutes || totalWorkdayMinutes,
    overlapEliminatedMinutes: Math.max(0, rawMinutes - mergedMinutes),
    drivingMinutes,
    passengerTripMinutes,
    emptyMovementMinutes,
    workWithoutDrivingMinutes,
    availabilityMinutes,
    waitMinutes,
    breakMinutes,
    mealMinutes,
    restMinutes,
    totalWorkdayMinutes,
    totalKmDriven,
    complianceAlerts,
  };
}

export function enqueueOfflineTachographAction(
  store: TachographStateStore,
  item: Omit<TachographOfflineQueueItem, 'id' | 'syncState' | 'createdAtIso'>
): TachographStateStore {
  const queued: TachographOfflineQueueItem = {
    ...item,
    id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    createdAtIso: new Date().toISOString(),
    syncState: 'Na fila offline',
  };
  return {
    ...store,
    offlineQueue: [queued, ...store.offlineQueue],
  };
}

export function syncTachographOfflineQueue(
  store: TachographStateStore,
  driverContext: {
    driverId: string;
    vehicleId: string;
    operatorName: string;
    countryCode: string;
    city: string;
  }
): { store: TachographStateStore; syncedCount: number; duplicatesSkipped: number; conflictsResolved: number } {
  let currentStore = { ...store };
  let syncedCount = 0;
  let duplicatesSkipped = 0;
  let conflictsResolved = 0;

  const pending = [...currentStore.offlineQueue]
    .filter((i) => i.syncState === 'Na fila offline')
    .reverse();

  const newDiscrepancies: TachographDiscrepancy[] = [];
  const updatedQueueMap = new Map<string, TachographOfflineQueueItem>();

  for (const item of pending) {
    const alreadyExists = currentStore.activities.some(
      (a) => a.idempotencyKey === item.idempotencyKey
    );
    if (alreadyExists) {
      duplicatesSkipped++;
      updatedQueueMap.set(item.id, {
        ...item,
        syncState: 'Duplicado ignorado',
        conflictReason: 'Chave idempotente já existente no histórico.',
      });
      continue;
    }

    if (item.actionType === 'START_SHIFT') {
      const res = startTachographShift(currentStore, {
        ...driverContext,
        odometerStartKm: item.odometerKm,
        timestampIso: item.createdAtIso,
        notes: item.notes,
        source: 'Offline Queue',
        idempotencyKey: item.idempotencyKey,
      });
      if (res.ok) {
        currentStore = res.store;
        syncedCount++;
        updatedQueueMap.set(item.id, { ...item, syncState: 'Sincronizado' });
      } else {
        conflictsResolved++;
        updatedQueueMap.set(item.id, {
          ...item,
          syncState: 'Conflito resolvido',
          conflictReason: res.error,
        });
        newDiscrepancies.push({
          id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          timestamp: new Date().toISOString(),
          severity: 'Conflito',
          message: `Sincronização offline ${item.id}: ${res.error}`,
          resolved: true,
        });
      }
    } else if (item.targetState) {
      const res = transitionTachographState(currentStore, {
        targetState: item.targetState,
        odometerKm: item.odometerKm,
        timestampIso: item.createdAtIso,
        notes: item.notes,
        source: 'Offline Queue',
        idempotencyKey: item.idempotencyKey,
      });
      if (res.ok) {
        currentStore = res.store;
        syncedCount++;
        updatedQueueMap.set(item.id, { ...item, syncState: 'Sincronizado' });
      } else {
        conflictsResolved++;
        updatedQueueMap.set(item.id, {
          ...item,
          syncState: 'Conflito resolvido',
          conflictReason: res.error,
        });
        newDiscrepancies.push({
          id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          timestamp: new Date().toISOString(),
          severity: 'Conflito',
          message: `Conflito offline (${item.targetState}): ${res.error}`,
          resolved: true,
        });
      }
    }
  }

  return {
    syncedCount,
    duplicatesSkipped,
    conflictsResolved,
    store: {
      ...currentStore,
      offlineQueue: currentStore.offlineQueue.map((q) => updatedQueueMap.get(q.id) ?? q),
      discrepancies: [...newDiscrepancies, ...currentStore.discrepancies].slice(0, 40),
    },
  };
}

export function buildTachographQrPayload(
  session: TachographShiftSession | undefined,
  summary: ConsolidatedTachographSummary,
  driverName: string,
  vehiclePlateOrModel: string
): { qrText: string; verificationCode: string; payloadObject: Record<string, string | number> } {
  const basePayload = {
    v: 'AIVAD-TAC-1.0',
    sid: session?.id ?? 'RESUMO-PERIODO',
    drv: driverName,
    veh: vehiclePlateOrModel,
    op: session?.operatorName ?? 'Operador Independ.',
    dt: session?.date ?? new Date().toISOString().slice(0, 10),
    st: session?.currentState ?? 'Consolidado',
    odoIni: session?.odometerStartKm ?? 0,
    odoFim: session?.odometerEndKm ?? session?.odometerCurrentKm ?? 0,
    km: summary.totalKmDriven,
    condMin: summary.drivingMinutes,
    trabMin: summary.workWithoutDrivingMinutes,
    pausaMin: summary.breakMinutes + summary.mealMinutes,
    descMin: summary.restMinutes,
    onlMin: summary.consolidatedOnlineMinutes,
    sig: session?.qrVerificationHash ?? computeIntegrityDigest(`${driverName}:${summary.totalKmDriven}:${summary.drivingMinutes}`),
  };

  const qrText = JSON.stringify(basePayload);
  return {
    qrText,
    verificationCode: basePayload.sig,
    payloadObject: basePayload,
  };
}

export interface TachographPeriodReport {
  periodKind: 'diario' | 'semanal' | 'mensal';
  startDate: string;
  endDate: string;
  sessionsCount: number;
  activitiesCount: number;
  revisionsCount: number;
  summary: ConsolidatedTachographSummary;
  legalDisclaimer: string;
}

export function buildTachographPeriodReport(
  store: TachographStateStore,
  periodKind: 'diario' | 'semanal' | 'mensal',
  referenceDateIso = new Date().toISOString().slice(0, 10)
): TachographPeriodReport {
  const endDate = referenceDateIso.slice(0, 10);
  const [y, m, d] = endDate.split('-').map(Number);
  const deltaDays = periodKind === 'diario' ? 0 : periodKind === 'semanal' ? 6 : 29;
  const startDate = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) - deltaDays)).toISOString().slice(0, 10);

  const activities = store.activities.filter((a) => a.date >= startDate && a.date <= endDate);
  const sessions = store.sessions.filter((s) => s.date >= startDate && s.date <= endDate);
  const intervals = store.platformIntervals.filter((p) => p.date >= startDate && p.date <= endDate);
  const revisionsCount = activities.reduce((sum, a) => sum + a.revisions.length, 0);

  return {
    periodKind,
    startDate,
    endDate,
    sessionsCount: sessions.length,
    activitiesCount: activities.length,
    revisionsCount,
    summary: consolidateMultiPlatformJornada(activities, intervals, sessions),
    legalDisclaimer: TACHOGRAPH_LEGAL_DISCLAIMER,
  };
}

