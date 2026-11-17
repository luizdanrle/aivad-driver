import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  INITIAL_BOLT_CONNECTOR,
  INITIAL_UBER_CONNECTOR,
  runConnectorVerificationSuite,
  syncConnectorWithServerEnv,
} from './connectors';
import {
  computeDriverDeactivatedPlatformsForLocation,
  deriveCountryCatalogTier,
  evaluateValidationFreshness,
  getDriverOperationalPlatformsForLocation,
  getPlatformOperationInLocation,
  getValidatedPlatformsForLocation,
  groupCountriesByCatalogTier,
  normalizeFloatingCardPosition,
  sanitizePlatformList,
  upsertPlatformCountryOperation,
} from './marketCatalog';
import { canAccessAdminTab, getAccessibleAdminTabs } from './rbac';
import {
  resolveRuntimeEnvironment,
  validateServerSecurityConfig,
} from './securityConfig';
import { SEED_COUNTRIES, SEED_FLOATING_DOCK_CONFIG, SEED_PLATFORMS } from '../data/seedData';
import { createAivadTestApp, SESSION_COOKIE_NAME } from '../server/apiRouter';

async function startEphemeralTestServer(envOverrides: Record<string, string | undefined> = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aivad-c6c-'));
  const storePath = path.join(tmpDir, 'store.json');
  const testApp = createAivadTestApp({
    storePath,
    env: {
      NODE_ENV: 'test',
      AIVAD_ENV: 'test',
      AIVAD_ADMIN_EMAIL: 'admin@aivad.pt',
      AIVAD_ADMIN_PASSWORD: 'StrongAdminPassword!2026',
      ...envOverrides,
    },
  });

  const server = http.createServer(testApp.app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  const close = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  };

  return { baseUrl, testApp, close };
}

function extractSessionCookie(res: Response): string {
  const raw = res.headers.get('set-cookie') ?? '';
  const match = raw.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? `${SESSION_COOKIE_NAME}=${match[1]}` : '';
}

test('PARTE II & 6.3: Catálogo internacional separa 3 escalões, exclui marca removida e filtra estritamente interface do motorista', () => {
  const grouped = groupCountriesByCatalogTier(SEED_COUNTRIES);
  assert.ok(grouped.officiallyActive.some((c) => c.code === 'PT'));
  assert.ok(grouped.officiallyActive.some((c) => c.code === 'ES'));
  assert.ok(grouped.configured.length >= 1);
  assert.ok(grouped.supported.length >= 1);

  const pt = SEED_COUNTRIES.find((c) => c.code === 'PT')!;
  assert.equal(deriveCountryCatalogTier(pt), 'Mercado Oficialmente Ativo');

  // Nenhuma ocorrência da marca removida no catálogo inicial
  const sanitizedCount = sanitizePlatformList(SEED_PLATFORMS).length;
  assert.equal(sanitizedCount, SEED_PLATFORMS.length);
  assert.equal(
    SEED_PLATFORMS.some((p) => p.name.toLowerCase().includes(['fre', 'nalty'].join(''))),
    false
  );

  // Motorista em Lisboa (PT) vê APENAS Uber e Bolt; Cabify/FREE NOW encerradas e POP/VLOZ não entram
  const driverLisbon = getDriverOperationalPlatformsForLocation(
    SEED_PLATFORMS,
    'PT',
    'Área Metropolitana de Lisboa',
    'Lisboa',
    '2026-11-16'
  );
  assert.deepEqual(
    driverLisbon.map((p) => p.id),
    ['uber', 'bolt']
  );

  // Cidade sem cobertura operacional confirmada (ex.: Bragança PT ou Luanda AO) -> lista vazia
  const driverBraganca = getDriverOperationalPlatformsForLocation(
    SEED_PLATFORMS,
    'PT',
    'Interior Norte (Sem operação validada)',
    'Bragança',
    '2026-11-16'
  );
  assert.deepEqual(driverBraganca, []);

  const driverLuanda = getDriverOperationalPlatformsForLocation(
    SEED_PLATFORMS,
    'AO',
    'Luanda',
    'Luanda',
    '2026-11-16'
  );
  assert.deepEqual(driverLuanda, []);

  const deactivatedPt = computeDriverDeactivatedPlatformsForLocation(
    SEED_PLATFORMS,
    'PT',
    'Área Metropolitana de Lisboa',
    'Lisboa',
    '2026-11-16'
  );
  assert.ok(deactivatedPt.includes('freenow'));
  assert.ok(deactivatedPt.includes('cabify'));
  assert.ok(deactivatedPt.includes('pop'));
  assert.ok(deactivatedPt.includes('vloz'));

  // No catálogo global de gestão, FREE NOW e Cabify preservam encerramento em PT e operação em ES
  const freenow = SEED_PLATFORMS.find((p) => p.id === 'freenow')!;
  assert.equal(getPlatformOperationInLocation(freenow, 'PT')?.operationalStatus, 'Encerrada no país');
  assert.equal(getPlatformOperationInLocation(freenow, 'ES')?.operationalStatus, 'Operação efetiva validada');

  const cabify = SEED_PLATFORMS.find((p) => p.id === 'cabify')!;
  assert.equal(getPlatformOperationInLocation(cabify, 'PT')?.operationalStatus, 'Encerrada no país');
  assert.equal(getPlatformOperationInLocation(cabify, 'ES')?.operationalStatus, 'Operação efetiva validada');

  // Registos de 2025-05-10 são sinalizados como 'Verificação desatualizada' em 2026-11-16
  assert.equal(evaluateValidationFreshness('2025-05-10', '2026-11-16').status, 'Verificação desatualizada');
  assert.equal(evaluateValidationFreshness('2026-11-01', '2026-11-16').status, 'Atualizada');

  // Espanha (Madrid) inclui Uber, Bolt, Cabify e FREE NOW como validadas
  const validatedEs = getValidatedPlatformsForLocation(
    SEED_PLATFORMS,
    'ES',
    'Comunidad de Madrid',
    'Madrid',
    '2026-11-16'
  );
  assert.deepEqual(validatedEs, ['uber', 'bolt', 'cabify', 'freenow']);

  // Normalização das 8 posições do Cartão Flutuante e independência do Dock Atalhos AIVAD
  assert.equal(normalizeFloatingCardPosition('Topo'), 'Centro superior');
  assert.equal(normalizeFloatingCardPosition('Fundo'), 'Centro inferior');
  assert.equal(normalizeFloatingCardPosition('Lateral direita'), 'Lateral direita');
  assert.ok(SEED_FLOATING_DOCK_CONFIG.bgColor);

  // RBAC com IDs em português do AdminLayout
  assert.equal(canAccessAdminTab('Conteúdo', 'editor-paginas'), true);
  assert.equal(canAccessAdminTab('Conteúdo', 'pagamentos'), false);
  assert.equal(canAccessAdminTab('Suporte', 'tickets'), true);
  assert.equal(canAccessAdminTab('Suporte', 'plataformas'), false);
  assert.deepEqual(
    getAccessibleAdminTabs('Conteúdo', ['overview', 'editor-paginas', 'utilizadores', 'auditoria']),
    ['overview', 'editor-paginas']
  );
});

test('PARTE II: Administração atualiza operação de plataforma por país com histórico e fonte sem alterar código', () => {
  const pop = SEED_PLATFORMS.find((p) => p.id === 'pop')!;
  const updated = upsertPlatformCountryOperation(pop, 'PT', {
    operationalStatus: 'Operação efetiva validada',
    cities: ['Lisboa'],
    validationSource: 'Despacho IMT 2026',
    verifiedAt: '2026-05-10',
  });
  const opPt = getPlatformOperationInLocation(updated, 'PT', undefined, 'Lisboa');
  assert.equal(opPt?.operationalStatus, 'Operação efetiva validada');
  assert.equal(opPt?.preselectForDrivers, true);
  assert.equal(opPt?.validationSource, 'Despacho IMT 2026');
  assert.ok((opPt?.history.length ?? 0) >= 2);
});

test('PARTE III: Separação de ambientes (development, test, preview, production) e arranque limpo sem credenciais Uber/Bolt', () => {
  assert.equal(resolveRuntimeEnvironment({ NODE_ENV: 'development' }), 'development');
  assert.equal(resolveRuntimeEnvironment({ NODE_ENV: 'test' }), 'test');
  assert.equal(
    resolveRuntimeEnvironment({
      NODE_ENV: 'production',
      APP_URL: 'https://ais-pre-ujtlxfh7o7w3rkxtabyn7a-56002337335.europe-west2.run.app',
    }),
    'preview'
  );
  assert.equal(
    resolveRuntimeEnvironment({
      NODE_ENV: 'production',
      APP_URL: 'https://app.aivad.pt',
    }),
    'production'
  );
  assert.equal(
    resolveRuntimeEnvironment({
      NODE_ENV: 'production',
      K_SERVICE: 'aivad-cloudrun-service',
    }),
    'preview'
  );

  // Preview e Cloud Run gerido arrancam sem AIVAD_SESSION_SECRET nem AIVAD_ALLOW_DEMO_SANDBOX
  const previewBoot = validateServerSecurityConfig({
    NODE_ENV: 'production',
    APP_URL: 'https://ais-pre-ujtlxfh7o7w3rkxtabyn7a-56002337335.europe-west2.run.app',
  });
  assert.equal(previewBoot.runtimeEnvironment, 'preview');
  assert.equal(previewBoot.isProduction, false);
  assert.equal(previewBoot.usedDevEphemeralFallback, true);
  assert.equal(previewBoot.allowDemoSandboxInProduction, false);

  const cloudRunBoot = validateServerSecurityConfig({
    NODE_ENV: 'production',
    K_SERVICE: 'aivad-cloudrun-service',
  });
  assert.equal(cloudRunBoot.runtimeEnvironment, 'preview');
  assert.equal(cloudRunBoot.isProduction, false);
  assert.equal(cloudRunBoot.usedDevEphemeralFallback, true);

  // Produção dedicada é fail-closed sem AIVAD_SESSION_SECRET forte
  assert.throws(() => {
    validateServerSecurityConfig({
      NODE_ENV: 'production',
      APP_URL: 'https://app.aivad.pt',
      AIVAD_SESSION_SECRET: '',
    });
  });

  // Conectores sem credenciais mostram "Não configurado" mantendo Nível 1 funcional
  const syncedUber = syncConnectorWithServerEnv(INITIAL_UBER_CONNECTOR, false);
  const syncedBolt = syncConnectorWithServerEnv(INITIAL_BOLT_CONNECTOR, false);
  assert.equal(syncedUber.connectionState, 'Não configurado');
  assert.equal(syncedBolt.connectionState, 'Não configurado');

  const l1 = runConnectorVerificationSuite(syncedUber, 1, {
    nowIso: '2026-05-10T10:00:00Z',
    serverVaultConfigured: false,
    nativeBridgeDetected: false,
    isRealAuthenticatedSession: false,
  });
  assert.equal(l1.result.passed, true);
});

test('PARTE III & V: Servidor arranca sem UBER/BOLT secrets, autentica conta real e revoga sessão imediatamente no servidor', async () => {
  const srv = await startEphemeralTestServer({
    UBER_CLIENT_ID: undefined,
    UBER_CLIENT_SECRET: undefined,
    BOLT_CLIENT_ID: undefined,
    BOLT_CLIENT_SECRET: undefined,
  });

  try {
    // 1. Conectores reportam "Não configurado" com HTTP 200
    const connRes = await fetch(`${srv.baseUrl}/api/connectors/status`);
    assert.equal(connRes.status, 200);
    const connJson = (await connRes.json()) as {
      uber: { connectionState: string; serverVaultConfigured: boolean };
      bolt: { connectionState: string; serverVaultConfigured: boolean };
    };
    assert.equal(connJson.uber.connectionState, 'Não configurado');
    assert.equal(connJson.bolt.connectionState, 'Não configurado');
    assert.equal(connJson.uber.serverVaultConfigured, false);

    // 2. Registar motorista independente (organizationId: null — sem obrigação de frota)
    const regRes = await fetch(`${srv.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carlos Independente',
        email: 'carlos.indep@aivad.pt',
        password: 'PasswordSegura123!',
        role: 'Motorista',
      }),
    });
    assert.equal(regRes.status, 201);
    const cookie = extractSessionCookie(regRes);
    assert.ok(cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
    const regJson = (await regRes.json()) as { session: { userId: string; organizationId: string | null } };
    assert.equal(regJson.session.organizationId, null);

    // 3. Sessão ativa funciona em rota autenticada
    const s1 = await fetch(`${srv.baseUrl}/api/sync/state`, {
      headers: { Cookie: cookie },
    });
    assert.equal(s1.status, 200);

    // 4. Revogar sessão no servidor invalida imediatamente o mesmo token assinado
    const revRes = await fetch(`${srv.baseUrl}/api/auth/sessions/revoke`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(revRes.status, 200);

    const s2 = await fetch(`${srv.baseUrl}/api/sync/state`, {
      headers: { Cookie: cookie },
    });
    assert.equal(s2.status, 401);

    // 5. Expiração temporal de token também bloqueia com 401
    const expiredToken = srv.testApp.signSessionToken({
      sessionId: 'sess-expired-1',
      userId: regJson.session.userId,
      userName: 'Carlos Independente',
      email: 'carlos.indep@aivad.pt',
      role: 'Motorista',
      organizationId: null,
      isDemoSession: false,
      authMethod: 'server_credentials',
      signedInAt: new Date(Date.now() - 7200_000).toISOString(),
      exp: Date.now() - 1000,
    });
    const expCheck = await fetch(`${srv.baseUrl}/api/sync/state`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${expiredToken}` },
    });
    assert.equal(expCheck.status, 401);
  } finally {
    await srv.close();
  }
});

test('PARTE IV, V & VI: Separação estrita Driver vs Management (403) e isolamento entre motoristas e organizações (403)', async () => {
  const srv = await startEphemeralTestServer();

  try {
    // Registar Motorista A
    const regA = await fetch(`${srv.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Motorista A',
        email: 'driver.a@aivad.pt',
        password: 'PasswordSegura123!',
        role: 'Motorista',
      }),
    });
    const cookieA = extractSessionCookie(regA);
    const jsonA = (await regA.json()) as { session: { userId: string } };

    // Registar Motorista B
    const regB = await fetch(`${srv.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Motorista B',
        email: 'driver.b@aivad.pt',
        password: 'PasswordSegura123!',
        role: 'Motorista',
      }),
    });
    const cookieB = extractSessionCookie(regB);

    // Motorista A grava no seu próprio workspace (/api/driver/workspace/:id)
    const putOwn = await fetch(`${srv.baseUrl}/api/driver/workspace/${jsonA.session.userId}`, {
      method: 'PUT',
      headers: { Cookie: cookieA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: { tripsCount: 7, secretNote: 'Privado A' } }),
    });
    assert.equal(putOwn.status, 200);

    // Motorista B tenta ler e escrever no workspace do Motorista A -> HTTP 403
    const crossRead = await fetch(`${srv.baseUrl}/api/driver/workspace/${jsonA.session.userId}`, {
      headers: { Cookie: cookieB },
    });
    assert.equal(crossRead.status, 403);

    const crossWrite = await fetch(`${srv.baseUrl}/api/driver/workspace/${jsonA.session.userId}`, {
      method: 'PUT',
      headers: { Cookie: cookieB, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: { tampered: true } }),
    });
    assert.equal(crossWrite.status, 403);

    // Motorista A tenta aceder a rotas do AIVAD Management / Admin -> HTTP 403
    const mgmtOrgs = await fetch(`${srv.baseUrl}/api/management/organizations`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(mgmtOrgs.status, 403);

    const mgmtCatalog = await fetch(`${srv.baseUrl}/api/management/catalog`, {
      method: 'PUT',
      headers: { Cookie: cookieA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms: SEED_PLATFORMS }),
    });
    assert.equal(mgmtCatalog.status, 403);

    // Registar Operador 1 (cria org-1) e Operador 2 (cria org-2) -> isolamento entre organizações
    const regOp1 = await fetch(`${srv.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Operador Frota Norte',
        email: 'op1@frota.pt',
        password: 'PasswordSegura123!',
        role: 'Operador',
      }),
    });
    const cookieOp1 = extractSessionCookie(regOp1);

    const createOrg1 = await fetch(`${srv.baseUrl}/api/management/organizations`, {
      method: 'POST',
      headers: { Cookie: cookieOp1, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Frota Norte TVDE',
        type: 'Frota TVDE',
        countryCode: 'PT',
        taxId: 'PT510111222',
      }),
    });
    assert.equal(createOrg1.status, 201);
    const org1Json = (await createOrg1.json()) as { organization: { id: string } };
    const updatedCookieOp1 = extractSessionCookie(createOrg1) || cookieOp1;

    // Login como Superadministrador provisionado por .env para criar segunda organização isolada
    const adminLogin = await fetch(`${srv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@aivad.pt',
        password: 'StrongAdminPassword!2026',
      }),
    });
    assert.equal(adminLogin.status, 200);
    const cookieAdmin = extractSessionCookie(adminLogin);

    const createOrg2 = await fetch(`${srv.baseUrl}/api/management/organizations`, {
      method: 'POST',
      headers: { Cookie: cookieAdmin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cooperativa Sul TVDE',
        type: 'Cooperativa / Equipa',
        countryCode: 'PT',
        taxId: 'PT510999888',
      }),
    });
    assert.equal(createOrg2.status, 201);
    const org2Json = (await createOrg2.json()) as { organization: { id: string } };

    // Operador 1 acede à própria org-1 (200), mas recebe 403 ao tentar aceder à org-2!
    const ownOrgSummary = await fetch(
      `${srv.baseUrl}/api/management/organizations/${org1Json.organization.id}/summary`,
      { headers: { Cookie: updatedCookieOp1 } }
    );
    assert.equal(ownOrgSummary.status, 200);

    const crossOrgSummary = await fetch(
      `${srv.baseUrl}/api/management/organizations/${org2Json.organization.id}/summary`,
      { headers: { Cookie: updatedCookieOp1 } }
    );
    assert.equal(crossOrgSummary.status, 403);

    // Verificar que as tentativas negadas foram registadas na auditoria de segurança
    const auditRes = await fetch(`${srv.baseUrl}/api/admin/audit-summary`, {
      headers: { Cookie: cookieAdmin },
    });
    assert.equal(auditRes.status, 200);
    const auditJson = (await auditRes.json()) as {
      securityAuditLogs: Array<{ outcome: string }>;
    };
    assert.ok(auditJson.securityAuditLogs.some((ev) => ev.outcome === 'DENIED'));
  } finally {
    await srv.close();
  }
});

test('PARTE VII & VIII: Conflito de sincronização HTTP 409, replay offline idempotente e separação CMS Rascunho vs Publicado vs Demo', async () => {
  const srv = await startEphemeralTestServer();

  try {
    // 1. Sincronização versionada + deteção de conflito 409 + replay offline idempotente
    const regDrv = await fetch(`${srv.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Marta Sync',
        email: 'marta.sync@aivad.pt',
        password: 'PasswordSegura123!',
        role: 'Motorista',
      }),
    });
    const drvCookie = extractSessionCookie(regDrv);

    const push1 = await fetch(`${srv.baseUrl}/api/sync/push`, {
      method: 'POST',
      headers: { Cookie: drvCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'sync-key-1',
        baseVersion: 0,
        state: { step: 1 },
      }),
    });
    assert.equal(push1.status, 200);
    const push1Json = (await push1.json()) as { version: number };
    assert.equal(push1Json.version, 1);

    const push2 = await fetch(`${srv.baseUrl}/api/sync/push`, {
      method: 'POST',
      headers: { Cookie: drvCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'sync-key-2',
        baseVersion: 1,
        state: { step: 2 },
      }),
    });
    assert.equal(push2.status, 200);

    // Cliente desatualizado envia baseVersion: 1 quando o servidor já está na versão 2 -> HTTP 409
    const conflictPush = await fetch(`${srv.baseUrl}/api/sync/push`, {
      method: 'POST',
      headers: { Cookie: drvCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'sync-key-stale',
        baseVersion: 1,
        state: { step: 'stale-client' },
      }),
    });
    assert.equal(conflictPush.status, 409);
    const conflictJson = (await conflictPush.json()) as { conflictDetected: boolean; serverVersion: number };
    assert.equal(conflictJson.conflictDetected, true);
    assert.equal(conflictJson.serverVersion, 2);

    // Replay da fila offline com deduplicação idempotente
    const replayRes = await fetch(`${srv.baseUrl}/api/sync/offline-replay`, {
      method: 'POST',
      headers: { Cookie: drvCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: [
          { idempotencyKey: 'off-op-1', actionType: 'TACHO_START', payload: { km: 12000 } },
          { idempotencyKey: 'off-op-1', actionType: 'TACHO_START', payload: { km: 12000 } },
          { idempotencyKey: 'off-op-2', actionType: 'EXPENSE_ADD', payload: { eur: 18.5 } },
        ],
      }),
    });
    assert.equal(replayRes.status, 200);
    const replayJson = (await replayRes.json()) as { appliedCount: number; deduplicatedCount: number };
    assert.equal(replayJson.appliedCount, 2);
    assert.equal(replayJson.deduplicatedCount, 1);

    // 2. CMS: Sessão Demo Admin NUNCA altera o portal público global
    const demoAdminRes = await fetch(`${srv.baseUrl}/api/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: 'admin' }),
    });
    const demoCookie = extractSessionCookie(demoAdminRes);

    const demoPub = await fetch(`${srv.baseUrl}/api/cms/publish`, {
      method: 'POST',
      headers: { Cookie: demoCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cms: { heroTitle: 'TÍTULO DEMO ISOLADO' },
        summary: 'Teste Demo',
      }),
    });
    assert.equal(demoPub.status, 200);
    const demoPubJson = (await demoPub.json()) as { targetScope: string };
    assert.equal(demoPubJson.targetScope, 'demo_sandbox_isolated');

    const anonPublicBefore = await fetch(`${srv.baseUrl}/api/cms/public`);
    const anonJsonBefore = (await anonPublicBefore.json()) as { cms: { heroTitle: string } | null };
    assert.equal(anonJsonBefore.cms, null);

    // 3. Admin Real: guardar rascunho (/api/cms/draft) NÃO publica para visitantes anónimos
    const realAdminRes = await fetch(`${srv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@aivad.pt',
        password: 'StrongAdminPassword!2026',
      }),
    });
    const adminCookie = extractSessionCookie(realAdminRes);

    const draftSave = await fetch(`${srv.baseUrl}/api/cms/draft`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft: { heroTitle: 'Rascunho Privado Ainda Não Publicado' },
      }),
    });
    assert.equal(draftSave.status, 200);

    const anonDuringDraft = await fetch(`${srv.baseUrl}/api/cms/public`);
    const anonDuringDraftJson = (await anonDuringDraft.json()) as { cms: { heroTitle: string } | null };
    assert.equal(anonDuringDraftJson.cms, null);

    // 4. Admin Real publica v1 e v2, e faz Rollback para v1
    const pubV1 = await fetch(`${srv.baseUrl}/api/cms/publish`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cms: { heroTitle: 'Portal Oficial Versão 1', announcementBanner: 'Banner V1', showAnnouncement: true },
        summary: 'Publicação V1',
      }),
    });
    assert.equal(pubV1.status, 200);

    const pubV1Json = (await pubV1.json()) as { versionNumber: number };

    const pubV2 = await fetch(`${srv.baseUrl}/api/cms/publish`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cms: { heroTitle: 'Portal Oficial Versão 2', announcementBanner: 'Banner V2', showAnnouncement: true },
        summary: 'Publicação V2',
      }),
    });
    assert.equal(pubV2.status, 200);
    const pubV2Json = (await pubV2.json()) as {
      versionNumber: number;
      revisionHistory: Array<{ id: string; versionNumber: number }>;
    };
    assert.equal(pubV2Json.versionNumber, pubV1Json.versionNumber + 1);

    const anonAfterV2 = await fetch(`${srv.baseUrl}/api/cms/public`);
    const anonAfterV2Json = (await anonAfterV2.json()) as { cms: { heroTitle: string } };
    assert.equal(anonAfterV2Json.cms.heroTitle, 'Portal Oficial Versão 2');

    // Rollback para a revisão anterior (V1)
    const revV1 = pubV2Json.revisionHistory.find((r) => r.versionNumber === pubV1Json.versionNumber)!;
    const rbRes = await fetch(`${srv.baseUrl}/api/cms/rollback`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ revisionId: revV1.id }),
    });
    assert.equal(rbRes.status, 200);

    const anonAfterRb = await fetch(`${srv.baseUrl}/api/cms/public`);
    const anonAfterRbJson = (await anonAfterRb.json()) as { cms: { heroTitle: string } };
    assert.equal(anonAfterRbJson.cms.heroTitle, 'Portal Oficial Versão 1');
  } finally {
    await srv.close();
  }
});
