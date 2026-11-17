import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  auditI18nCoverage,
  isRtlLanguage,
  SUPPORTED_LANGUAGES,
  translateKey,
} from './i18n.ts';
import { confirmLocalMarketAdaptation, evaluateCountryChange } from './localization.ts';
import {
  computeLiveTachographClocks,
  startTachographShift,
  TACHOGRAPH_OPERATIONAL_CATEGORIES,
  transitionTachographState,
} from './tachograph.ts';
import {
  calculateCostsProfitability,
  createDefaultCostsCalculatorConfig,
  normalizeAmountToMonthly,
} from './costsCalculator.ts';
import { calculateSmartPlan } from './intelligence.ts';
import { createAivadTestApp } from '../server/apiRouter.ts';
import { SEED_COUNTRIES, SEED_VEHICLES } from '../data/seedData.ts';
import type { LocalizationProfile, TachographStateStore } from '../models/types.ts';

function createEmptyTachoStore(): TachographStateStore {
  return {
    sessions: [],
    activities: [],
    platformIntervals: [],
    offlineQueue: [],
    discrepancies: [],
    activeSessionId: null,
  };
}

test('26-language i18n dictionary provides complete key coverage, RTL detection for ar/ur, and language-country independence', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 26);

  const audit = auditI18nCoverage();
  assert.equal(audit.supportedCount, 26);
  assert.equal(audit.allLanguagesResolvable, true);
  assert.ok(audit.baseKeysCount >= 40);

  assert.equal(isRtlLanguage('ar'), true);
  assert.equal(isRtlLanguage('ur'), true);
  assert.equal(isRtlLanguage('pt-PT'), false);
  assert.equal(isRtlLanguage('en-GB'), false);

  assert.equal(translateKey('pt-PT', 'nav_tacho'), 'TACÓGRAFO');
  assert.equal(translateKey('en-GB', 'nav_tacho'), 'TACHOGRAPH');
  assert.ok(translateKey('ar', 'nav_tacho').length > 0);
  assert.ok(translateKey('ur', 'nav_dashboard').length > 0);

  // Independence: changing country market must NOT overwrite user-selected language
  const profile: LocalizationProfile = {
    currentLocation: {
      countryCode: 'PT',
      countryName: 'Portugal',
      region: 'Lisboa',
      city: 'Lisboa',
      approxAddress: 'Lisboa',
      timezone: 'Europe/Lisbon',
      detectedBy: 'Manual',
      detectedAt: '2026-11-16T08:00:00Z',
    },
    residenceCountryCode: 'PT',
    primaryProfessionalMarketCode: 'PT',
    additionalProfessionalMarketCodes: [],
    selectedMarketCode: 'PT',
    languageCode: 'ar',
    unitSystem: 'metric',
    permissionStatus: 'granted',
    firstOpenConfirmed: true,
    pendingCountryChangePrompt: null,
  };

  const change = evaluateCountryChange(profile, 'GB', 'London', 'Greater London', SEED_COUNTRIES);
  const adapted = confirmLocalMarketAdaptation(change.nextProfile, 'GB', SEED_COUNTRIES);
  assert.equal(adapted.selectedMarketCode, 'GB');
  assert.equal(adapted.languageCode, 'ar');
});

test('Dual independent tachograph clocks: Shift clock continues during Pausa/Refeição/Descanso while Effective Work clock freezes and resumes without losing accumulated time', () => {
  let store = createEmptyTachoStore();
  const startIso = '2026-11-16T08:00:00.000Z';
  const resStart = startTachographShift(store, {
    driverId: 'drv-1',
    vehicleId: 'veh-1',
    operatorName: 'Op Teste',
    odometerStartKm: 10000,
    countryCode: 'PT',
    city: 'Lisboa',
    timestampIso: startIso,
  });
  assert.equal(resStart.ok, true);
  store = resStart.store;

  // Drive for 45 minutes (08:00 -> 08:45 via Início de turno + Condução)
  const resDrive = transitionTachographState(store, {
    targetState: 'Condução em serviço',
    odometerKm: 10020,
    timestampIso: '2026-11-16T08:10:00.000Z',
    platformId: 'uber',
    movementKind: 'Com passageiro',
  });
  assert.equal(resDrive.ok, true);
  store = resDrive.store;

  // Enter Pausa at 09:00 (after 60 min of countable shift + driving)
  const resPause = transitionTachographState(store, {
    targetState: 'Pausa',
    odometerKm: 10045,
    timestampIso: '2026-11-16T09:00:00.000Z',
  });
  assert.equal(resPause.ok, true);
  store = resPause.store;

  // At 09:20 (20 min into Pausa):
  // Clock 1 (Shift total) = 1h20m = 4800s
  // Clock 2 (Effective work) = frozen at 1h00m = 3600s
  // Alert: RESUME_WORK_REMINDER (pause >= 15 min)
  const duringPause = computeLiveTachographClocks(
    store,
    new Date('2026-11-16T09:20:00.000Z').getTime()
  );
  assert.equal(duringPause.operationalStatus, 'Em Pausa');
  assert.equal(duringPause.shiftElapsedSeconds, 4800);
  assert.equal(duringPause.effectiveWorkSeconds, 3600);
  assert.equal(duringPause.currentPauseSeconds, 1200);
  assert.ok(duringPause.alerts.some((a) => a.code === 'RESUME_WORK_REMINDER'));

  // Resume Condução em serviço at 09:30 -> check at 10:00
  const resResume = transitionTachographState(store, {
    targetState: 'Condução em serviço',
    odometerKm: 10045,
    timestampIso: '2026-11-16T09:30:00.000Z',
    platformId: 'bolt',
  });
  assert.equal(resResume.ok, true);
  store = resResume.store;

  const afterResume = computeLiveTachographClocks(
    store,
    new Date('2026-11-16T10:00:00.000Z').getTime()
  );
  assert.equal(afterResume.operationalStatus, 'Em Turno');
  assert.equal(afterResume.shiftElapsedSeconds, 7200); // 2h00m total shift
  assert.equal(afterResume.effectiveWorkSeconds, 5400); // 1h00m + 30m = 1h30m effective work!
  assert.equal(TACHOGRAPH_OPERATIONAL_CATEGORIES.length, 6);
});

test('Tachograph alerts fire accurately for BREAK_UPCOMING_30M, PROLONGED_DRIVING, and SHIFT_LIMIT_NEAR', () => {
  let store = createEmptyTachoStore();
  store = startTachographShift(store, {
    driverId: 'drv-1',
    vehicleId: 'veh-1',
    operatorName: 'Op Teste',
    odometerStartKm: 1000,
    countryCode: 'PT',
    city: 'Lisboa',
    timestampIso: '2026-11-16T06:00:00.000Z',
  }).store;
  store = transitionTachographState(store, {
    targetState: 'Condução em serviço',
    odometerKm: 1010,
    timestampIso: '2026-11-16T06:05:00.000Z',
  }).store;

  // At 06:00 + 4h10m = 10:10 -> 250m continuous (< 270m, >= 240m) -> BREAK_UPCOMING_30M
  const upcoming = computeLiveTachographClocks(
    store,
    new Date('2026-11-16T10:10:00.000Z').getTime()
  );
  assert.ok(upcoming.alerts.some((a) => a.code === 'BREAK_UPCOMING_30M'));

  // At 06:00 + 4h40m = 10:40 -> 280m (>= 270m) -> PROLONGED_DRIVING
  const prolonged = computeLiveTachographClocks(
    store,
    new Date('2026-11-16T10:40:00.000Z').getTime()
  );
  assert.ok(prolonged.alerts.some((a) => a.code === 'PROLONGED_DRIVING'));

  // At 06:00 + 9h15m = 15:15 -> 45m remaining to 10h -> SHIFT_LIMIT_NEAR
  const nearLimit = computeLiveTachographClocks(
    store,
    new Date('2026-11-16T15:15:00.000Z').getTime()
  );
  assert.ok(nearLimit.alerts.some((a) => a.code === 'SHIFT_LIMIT_NEAR'));
});

test('Server Tachograph QR audit API verifies authentic HMAC records, rejects tampered records/codes, and handles NOT_FOUND', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aivad-tacho-audit-'));
  const storePath = path.join(tmpDir, 'store.json');
  const { app, repo } = createAivadTestApp({
    storePath,
    env: { NODE_ENV: 'test', AIVAD_SESSION_SECRET: 'test-hmac-secret-123456' },
  });

  const server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Publish snapshot
    const postRes = await fetch(`${baseUrl}/api/tachograph/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'tac-test-1',
        verificationCode: 'AIVAD-DEADBE',
        driverAlias: 'T. Ferreira',
        vehicleLabel: 'Tesla Model 3',
        operatorName: 'Operador Teste',
        date: '2026-11-16',
        startIso: '2026-11-16T08:00:00Z',
        endIso: null,
        odometerStartKm: 40000,
        odometerEndKm: 40120,
        distanceKm: 120,
        drivingMinutes: 180,
        effectiveWorkMinutes: 210,
        breakMinutes: 30,
        currentState: 'Em curso',
        status: 'Em curso',
        countryCode: 'PT',
        city: 'Lisboa',
      }),
    });
    assert.equal(postRes.status, 200);
    const postJson = (await postRes.json()) as { ok: boolean; verificationPath: string };
    assert.equal(postJson.ok, true);
    assert.ok(postJson.verificationPath.includes('sid=tac-test-1'));

    // 2. Verify authentic snapshot
    const validRes = await fetch(`${baseUrl}/api/tachograph/audit/tac-test-1?code=AIVAD-DEADBE`);
    assert.equal(validRes.status, 200);
    const validJson = (await validRes.json()) as {
      ok: boolean;
      integrityStatus: string;
      summary: { distanceKm: number; verificationCode: string };
    };
    assert.equal(validJson.ok, true);
    assert.equal(validJson.integrityStatus, 'VALID');
    assert.equal(validJson.summary.distanceKm, 120);

    // 3. Verify wrong verification code -> TAMPERED
    const badCodeRes = await fetch(`${baseUrl}/api/tachograph/audit/tac-test-1?code=AIVAD-WRONG`);
    const badCodeJson = (await badCodeRes.json()) as { ok: boolean; integrityStatus: string };
    assert.equal(badCodeJson.ok, false);
    assert.equal(badCodeJson.integrityStatus, 'TAMPERED');

    // 4. Missing session -> 404 NOT_FOUND
    const missingRes = await fetch(`${baseUrl}/api/tachograph/audit/non-existent?code=AIVAD-1`);
    assert.equal(missingRes.status, 404);
    const missingJson = (await missingRes.json()) as { integrityStatus: string };
    assert.equal(missingJson.integrityStatus, 'NOT_FOUND');

    // 5. Mutate stored metrics on disk -> HMAC mismatch -> TAMPERED
    const stored = repo.loadStore();
    stored.tachographAudits['tac-test-1'].distanceKm = 999;
    repo.saveStore(stored);

    const tamperedRes = await fetch(`${baseUrl}/api/tachograph/audit/tac-test-1?code=AIVAD-DEADBE`);
    const tamperedJson = (await tamperedRes.json()) as { ok: boolean; integrityStatus: string };
    assert.equal(tamperedJson.ok, false);
    assert.equal(tamperedJson.integrityStatus, 'TAMPERED');
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Meus Custos financial calculator normalizes frequencies, toggles conditional taxes, separates personal costs, and builds 3 scenarios', () => {
  assert.equal(normalizeAmountToMonthly(10, 'diária', 22), 220);
  assert.equal(Math.round(normalizeAmountToMonthly(1200, 'anual', 22)), 100);

  const baseCfg = createDefaultCostsCalculatorConfig(SEED_VEHICLES[0]);
  const withTaxes = calculateCostsProfitability({ ...baseCfg, applyTaxes: true });
  const withoutTaxes = calculateCostsProfitability({ ...baseCfg, applyTaxes: false });

  assert.ok(withTaxes.estimatedTaxesMonthly > 0);
  assert.equal(withoutTaxes.estimatedTaxesMonthly, 0);
  assert.ok(withTaxes.requiredGrossMonthly > withoutTaxes.requiredGrossMonthly);
  assert.ok(withTaxes.minRequiredEurPerKm > 0);
  assert.ok(withTaxes.minRequiredEurPerHour > 0);

  // Personal expenses separated cleanly
  assert.ok(withTaxes.personalExpensesMonthly > 0);
  assert.ok(withTaxes.operatingProfitMonthly > withTaxes.finalNetDisposableMonthly);

  // 3 scenarios: Conservador, Normal, Otimista
  assert.equal(withTaxes.scenarios.length, 3);
  const [cons, norm, opt] = withTaxes.scenarios;
  assert.equal(cons.id, 'conservador');
  assert.equal(norm.id, 'normal');
  assert.equal(opt.id, 'otimista');
  // Higher km in conservative yields lower min EUR/km than normal
  assert.ok(cons.operatingCostsMonthly > norm.operatingCostsMonthly);
  assert.ok(opt.finalNetDisposableMonthly > norm.finalNetDisposableMonthly);
});

test('Shift & Goal Planner flags unrealistic goals and range shortfalls against active vehicle realRangeKm', () => {
  const ev = SEED_VEHICLES[0]; // Tesla Model 3 ~415 realRangeKm
  const realistic = calculateSmartPlan({
    targetNetEur: 400,
    availableDays: 5,
    hoursPerDay: 8,
    breakMinutesPerDay: 30,
    startTime: '08:00',
    endTime: '16:30',
    flexibleDuration: true,
    selectedPlatformIds: ['uber', 'bolt'],
    avgCommissionPct: 22.5,
    vehicle: ev,
    historicalAvgGrossPerHour: 22,
    currentEarnedNetEur: 0,
    needsChargingStops: true,
  });
  assert.equal(realistic.feasibilityStatus, 'Realista');
  assert.ok(realistic.estimatedRidesNeeded > 0);
  assert.ok(realistic.estimatedKmNeeded > 0);

  const unrealistic = calculateSmartPlan({
    targetNetEur: 2800,
    availableDays: 4,
    hoursPerDay: 12,
    breakMinutesPerDay: 15,
    flexibleDuration: true,
    selectedPlatformIds: ['uber'],
    avgCommissionPct: 25,
    vehicle: { ...ev, realRangeKm: 200 },
    historicalAvgGrossPerHour: 18,
    currentEarnedNetEur: 0,
    needsChargingStops: true,
  });
  assert.equal(unrealistic.feasibilityStatus, 'Irrealista');
  assert.ok(unrealistic.feasibilityWarnings.length >= 2);
  assert.ok(unrealistic.chargingStopsRecommended > 0);
});
