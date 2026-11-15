import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTachographQrPayload,
  canTransitionTachographState,
  consolidateMultiPlatformJornada,
  correctTachographRecord,
  enqueueOfflineTachographAction,
  mergeTimeIntervalsMinutes,
  startTachographShift,
  syncTachographOfflineQueue,
  TACHOGRAPH_LEGAL_DISCLAIMER,
  TACHOGRAPH_STATES,
  transitionTachographState,
} from './tachograph.ts';
import type { TachographStateStore } from '../models/types.ts';

function emptyStore(): TachographStateStore {
  return {
    sessions: [],
    activities: [],
    platformIntervals: [],
    offlineQueue: [],
    discrepancies: [],
    activeSessionId: null,
  };
}

test('Tachograph exposes all 10 mandatory operational states and blocks incoherent transitions', () => {
  assert.equal(TACHOGRAPH_STATES.length, 10);
  const bad1 = canTransitionTachographState('Fora de serviço', 'Pausa', false);
  assert.equal(bad1.allowed, false);

  const bad2 = canTransitionTachographState('Fora de serviço', 'Fim de turno', false);
  assert.equal(bad2.allowed, false);

  const goodStart = canTransitionTachographState('Fora de serviço', 'Início de turno', false);
  assert.equal(goodStart.allowed, true);
});

test('Start shift, pause/resume driving, reject lower odometer, and close shift', () => {
  let store = emptyStore();
  const sRes = startTachographShift(store, {
    driverId: 'drv-1',
    vehicleId: 'veh-1',
    operatorName: 'Operador Lisboa',
    odometerStartKm: 42100,
    countryCode: 'PT',
    city: 'Lisboa',
    timestampIso: '2026-11-14T08:00:00Z',
  });
  assert.equal(sRes.ok, true);
  store = sRes.store;
  assert.ok(store.activeSessionId);

  // Double start rejected
  const dupStart = startTachographShift(store, {
    driverId: 'drv-1',
    vehicleId: 'veh-1',
    operatorName: 'Operador Lisboa',
    odometerStartKm: 42100,
    countryCode: 'PT',
    city: 'Lisboa',
  });
  assert.equal(dupStart.ok, false);

  // Transition to Condução em serviço
  const t1 = transitionTachographState(store, {
    targetState: 'Condução em serviço',
    odometerKm: 42112,
    timestampIso: '2026-11-14T08:45:00Z',
    platformId: 'uber',
    movementKind: 'Com passageiro',
  });
  assert.equal(t1.ok, true);
  store = t1.store;

  // Reject odometer lower than current (42105 < 42112)
  const badOdo = transitionTachographState(store, {
    targetState: 'Pausa',
    odometerKm: 42105,
    timestampIso: '2026-11-14T09:00:00Z',
  });
  assert.equal(badOdo.ok, false);

  // Valid Pause & Resume
  const t2 = transitionTachographState(store, {
    targetState: 'Pausa',
    odometerKm: 42150,
    timestampIso: '2026-11-14T10:00:00Z',
  });
  assert.equal(t2.ok, true);
  store = t2.store;

  const t3 = transitionTachographState(store, {
    targetState: 'Fim de turno',
    odometerKm: 42150,
    timestampIso: '2026-11-14T10:20:00Z',
  });
  assert.equal(t3.ok, true);
  assert.equal(t3.store.activeSessionId, null);
  assert.equal(t3.store.sessions[0].status, 'Encerrado');
});

test('Multi-platform consolidation merges simultaneous Uber and Bolt intervals into one workday', () => {
  const { mergedMinutes, rawMinutes } = mergeTimeIntervalsMinutes([
    { startIso: '2026-11-14T08:00:00Z', endIso: '2026-11-14T12:00:00Z' }, // 240 min Uber
    { startIso: '2026-11-14T09:00:00Z', endIso: '2026-11-14T13:00:00Z' }, // 240 min Bolt overlapping 3h
  ]);
  assert.equal(rawMinutes, 480);
  assert.equal(mergedMinutes, 300); // 08:00 -> 13:00 = 5h, NOT 8h

  const summary = consolidateMultiPlatformJornada(
    [],
    [
      {
        id: 'i1',
        platformId: 'uber',
        date: '2026-11-14',
        startIso: '2026-11-14T08:00:00Z',
        endIso: '2026-11-14T12:00:00Z',
        kind: 'Online',
      },
      {
        id: 'i2',
        platformId: 'bolt',
        date: '2026-11-14',
        startIso: '2026-11-14T09:00:00Z',
        endIso: '2026-11-14T13:00:00Z',
        kind: 'Online',
      },
    ],
    []
  );
  assert.equal(summary.consolidatedOnlineMinutes, 300);
  assert.equal(summary.overlapEliminatedMinutes, 180);
});

test('Immutable record correction preserves prior history and requires reason', () => {
  let store = emptyStore();
  store = startTachographShift(store, {
    driverId: 'drv-1',
    vehicleId: 'veh-1',
    operatorName: 'Op',
    odometerStartKm: 1000,
    countryCode: 'PT',
    city: 'Lisboa',
    timestampIso: '2026-11-14T08:00:00Z',
  }).store;

  const target = store.activities[0];
  const noReason = correctTachographRecord(target, { notes: 'Edit' }, '', 'Tiago');
  assert.equal(noReason.ok, false);

  const corrected = correctTachographRecord(
    target,
    { odometerStartKm: 1005, notes: 'Correção de leitura inicial no painel' },
    'Engano de dígito ao iniciar turno',
    'Tiago Ferreira'
  );
  assert.equal(corrected.ok, true);
  assert.equal(corrected.record?.status, 'Corrigido');
  assert.equal(corrected.record?.revisions.length, 1);
  assert.equal(corrected.record?.revisions[0].previousOdometerKm, 1000);
});

test('Offline queue deduplicates repeated keys, resolves conflicts, and builds verifiable QR payload with legal disclaimer', () => {
  let store = emptyStore();
  store = enqueueOfflineTachographAction(store, {
    idempotencyKey: 'off-start-1',
    actionType: 'START_SHIFT',
    odometerKm: 5000,
    notes: 'Início offline',
  });
  store = enqueueOfflineTachographAction(store, {
    idempotencyKey: 'off-start-1',
    actionType: 'START_SHIFT',
    odometerKm: 5000,
    notes: 'Início offline duplicado',
  });
  store = enqueueOfflineTachographAction(store, {
    idempotencyKey: 'off-bad-odo',
    actionType: 'TRANSITION',
    targetState: 'Condução em serviço',
    odometerKm: 4990, // conflict! lower than 5000
    notes: 'Conflito odómetro offline',
  });

  const synced = syncTachographOfflineQueue(store, {
    driverId: 'drv-1',
    vehicleId: 'veh-1',
    operatorName: 'Op',
    countryCode: 'PT',
    city: 'Lisboa',
  });

  assert.equal(synced.syncedCount, 1);
  assert.equal(synced.duplicatesSkipped, 1);
  assert.equal(synced.conflictsResolved, 1);
  assert.equal(synced.store.discrepancies.length, 1);

  const summary = consolidateMultiPlatformJornada(
    synced.store.activities,
    synced.store.platformIntervals,
    synced.store.sessions
  );
  const qr = buildTachographQrPayload(synced.store.sessions[0], summary, 'Tiago Ferreira', 'Tesla Model 3');
  assert.ok(qr.qrText.includes('AIVAD-TAC-1.0'));
  assert.ok(qr.verificationCode.startsWith('AIVAD-'));
  assert.ok(TACHOGRAPH_LEGAL_DISCLAIMER.includes('homologado'));
});

test('Rolling 24h TVDE compliance triggers preventive 8h/9h/10h alerts without duplicating overlapping apps', async () => {
  const { evaluateRolling24hCompliance, PORTARIA_7_2022_CHECKLIST } = await import('./tachograph.ts');
  const now = new Date('2026-11-15T18:00:00Z');
  const tenHoursAgo = new Date(now.getTime() - 9 * 60 * 60 * 1000).toISOString();
  const halfHourAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const res = evaluateRolling24hCompliance(
    [],
    [
      {
        id: 'p1',
        platformId: 'uber',
        date: '2026-11-15',
        startIso: tenHoursAgo,
        endIso: now.toISOString(),
        kind: 'Online',
      },
      {
        id: 'p2',
        platformId: 'bolt',
        date: '2026-11-15',
        startIso: tenHoursAgo,
        endIso: halfHourAgo,
        kind: 'Online',
      },
    ],
    now.toISOString(),
    600
  );
  assert.equal(res.rolling24hWorkMinutes, 540);
  assert.equal(res.remainingLegalMinutes, 60);
  assert.equal(res.alertLevel, 'Crítico 9h (540 min)');
  assert.ok(PORTARIA_7_2022_CHECKLIST.length >= 4);
});

