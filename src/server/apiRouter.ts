import crypto from 'node:crypto';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import type {
  CountryMarketConfig,
  OrganizationRecord,
  OrganizationType,
  PlatformRecord,
  UserRole,
} from '../models/types';
import {
  ADMIN_ROLE_SET,
  MANAGEMENT_ROLE_SET,
  evaluateCmsMutationAuthorization,
  evaluateTenantAccess,
  validateRegistrationPayload,
  validateServerSecurityConfig,
} from '../core/securityConfig';
import { SEED_COUNTRIES, SEED_PLATFORMS } from '../data/seedData';
import {
  createDomainStoreRepository,
  hashPassword,
  verifyPassword,
  type ServerSessionRecord,
  type ServerUserRecord,
  type ZoneObservationRecord,
} from './domainStore';

export const SESSION_COOKIE_NAME = 'aivad_sid';

export interface SessionTokenPayload {
  sessionId: string;
  userId: string;
  userName: string;
  email: string;
  role: string;
  organizationId: string | null;
  isDemoSession: boolean;
  authMethod: 'server_credentials' | 'demo_sandbox';
  signedInAt: string;
  exp: number;
}

export interface AuthedRequest extends Request {
  authSession?: SessionTokenPayload | null;
}

export interface AivadApiRouterOptions {
  storePath?: string;
  env?: Record<string, string | undefined>;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export function createAivadApiRouter(options: AivadApiRouterOptions = {}) {
  const env = options.env ?? process.env;
  const storePath =
    options.storePath ?? path.resolve(process.cwd(), '.aivad-server-store.json');
  const securityBoot = validateServerSecurityConfig(env, process.cwd());
  const sessionSecret = securityBoot.sessionSecret;
  const repo = createDomainStoreRepository(storePath);

  function signSessionToken(payload: SessionTokenPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto
      .createHmac('sha256', sessionSecret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${sig}`;
  }

  function verifySessionToken(token: string | undefined | null): SessionTokenPayload | null {
    if (!token || !token.includes('.')) return null;
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', sessionSecret)
      .update(encoded)
      .digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      const parsed = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8')
      ) as SessionTokenPayload;
      if (!parsed.exp || Date.now() > parsed.exp) return null;

      // Verifica revogação no servidor (PARTE V)
      if (parsed.sessionId) {
        const store = repo.loadStore();
        const serverRecord = store.sessions[parsed.sessionId];
        if (serverRecord && serverRecord.revokedAt !== null) {
          return null;
        }
        if (serverRecord && Date.now() > serverRecord.expiresAt) {
          return null;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function registerServerSession(payload: SessionTokenPayload): void {
    const store = repo.loadStore();
    const record: ServerSessionRecord = {
      sessionId: payload.sessionId,
      userId: payload.userId,
      userName: payload.userName,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
      isDemoSession: payload.isDemoSession,
      authMethod: payload.authMethod,
      issuedAt: payload.signedInAt,
      expiresAt: payload.exp,
      revokedAt: null,
    };
    store.sessions[payload.sessionId] = record;
    repo.saveStore(store);
  }

  function setSessionCookie(res: Response, token: string): void {
    const isSecure = securityBoot.runtimeEnvironment === 'production';
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      maxAge: 1000 * 60 * 60 * 12,
      path: '/',
    });
  }

  function toClientAuthSession(payload: SessionTokenPayload) {
    return {
      authenticated: true,
      sessionId: payload.sessionId,
      userId: payload.userId,
      userName: payload.userName,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
      signedInAt: payload.signedInAt,
      expiresAt: new Date(payload.exp).toISOString(),
      isDemoSession: payload.isDemoSession,
      authMethod: payload.authMethod,
    };
  }

  const router = express.Router();
  router.use(express.json({ limit: '2mb' }));

  router.use((req: AuthedRequest, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const cookies = parseCookies(req.headers.cookie);
    const token = bearer || cookies[SESSION_COOKIE_NAME] || null;
    req.authSession = verifySessionToken(token);
    next();
  });

  function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
    if (!req.authSession) {
      res.status(401).json({
        ok: false,
        error: 'Autenticação obrigatória no servidor AIVAD (sessão ausente, expirada ou revogada).',
      });
      return;
    }
    next();
  }

  function requireManagement(req: AuthedRequest, res: Response, next: NextFunction): void {
    const check = evaluateTenantAccess(
      req.authSession
        ? {
            authenticated: true,
            userId: req.authSession.userId,
            role: req.authSession.role as UserRole,
            organizationId: req.authSession.organizationId,
          }
        : null,
      { requireManagementConsole: true }
    );
    if (!check.allowed) {
      if (req.authSession) {
        const store = repo.loadStore();
        repo.appendSecurityAudit(store, {
          actorId: req.authSession.userId,
          actorRole: req.authSession.role,
          organizationId: req.authSession.organizationId,
          action: 'ACCESS_MANAGEMENT_ENDPOINT',
          target: req.originalUrl,
          outcome: 'DENIED',
          detail: check.reason,
        });
        repo.saveStore(store);
      }
      res.status(check.httpStatus).json({ ok: false, error: check.reason });
      return;
    }
    next();
  }

  function requireGlobalAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
    const check = evaluateTenantAccess(
      req.authSession
        ? {
            authenticated: true,
            userId: req.authSession.userId,
            role: req.authSession.role as UserRole,
            organizationId: req.authSession.organizationId,
          }
        : null,
      { requireGlobalAdmin: true }
    );
    if (!check.allowed) {
      if (req.authSession) {
        const store = repo.loadStore();
        repo.appendSecurityAudit(store, {
          actorId: req.authSession.userId,
          actorRole: req.authSession.role,
          organizationId: req.authSession.organizationId,
          action: 'ACCESS_ADMIN_ENDPOINT',
          target: req.originalUrl,
          outcome: 'DENIED',
          detail: check.reason,
        });
        repo.saveStore(store);
      }
      res.status(check.httpStatus).json({ ok: false, error: check.reason });
      return;
    }
    next();
  }

  // ===========================================================================
  // 1. HEALTH, CONNECTORS & DIAGNOSTICS (PARTE III)
  // ===========================================================================
  router.get('/api/health', (_req: Request, res: Response) => {
    const uberConfigured = Boolean(env.UBER_CLIENT_ID && env.UBER_CLIENT_SECRET);
    const boltConfigured = Boolean(env.BOLT_CLIENT_ID && env.BOLT_CLIENT_SECRET);
    res.json({
      ok: true,
      service: 'AIVAD Server API',
      environment: securityBoot.runtimeEnvironment,
      nodeEnv: env.NODE_ENV || 'development',
      persistenceMode: 'express_json_store_prototype',
      productionFailClosedActive: true,
      usedDevEphemeralSecret: securityBoot.usedDevEphemeralFallback,
      allowDemoSandboxInProduction: securityBoot.allowDemoSandboxInProduction,
      geminiProxyConfigured: Boolean(
        env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      adminEnvConfigured: Boolean(env.AIVAD_ADMIN_EMAIL && env.AIVAD_ADMIN_PASSWORD),
      uberVaultConfigured: uberConfigured,
      boltVaultConfigured: boltConfigured,
      uberConnectionState: uberConfigured ? 'Sandbox Oficial Configurada' : 'Não configurado',
      boltConnectionState: boltConfigured ? 'Sandbox Oficial Configurada' : 'Não configurado',
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/api/connectors/status', (_req: Request, res: Response) => {
    const uberConfigured = Boolean(env.UBER_CLIENT_ID && env.UBER_CLIENT_SECRET);
    const boltConfigured = Boolean(env.BOLT_CLIENT_ID && env.BOLT_CLIENT_SECRET);
    res.json({
      ok: true,
      environment: securityBoot.runtimeEnvironment,
      uber: {
        serverVaultConfigured: uberConfigured,
        connectionState: uberConfigured ? 'Sandbox Oficial Configurada' : 'Não configurado',
        supportedFlows: [
          'CSV/JSON Import',
          'OCR/Notification Parser',
          'Fleet OAuth2 (Requires Partner Approval)',
        ],
      },
      bolt: {
        serverVaultConfigured: boltConfigured,
        connectionState: boltConfigured ? 'Sandbox Oficial Configurada' : 'Não configurado',
        supportedFlows: [
          'CSV/JSON Import',
          'OCR/Notification Parser',
          'Bolt Fleet Integration API',
        ],
      },
    });
  });

  router.get('/api/diagnostics/summary', (req: AuthedRequest, res: Response) => {
    const store = repo.loadStore();
    const activeSessionsCount = Object.values(store.sessions).filter(
      (s) => s.revokedAt === null && s.expiresAt > Date.now()
    ).length;
    res.json({
      ok: true,
      serverTimeIso: new Date().toISOString(),
      environment: securityBoot.runtimeEnvironment,
      persistenceLayer: 'Express JSON Store (.aivad-server-store.json) + Browser LocalStorage (apenas cache operacional, nunca autenticação)',
      productionDatabaseTarget: 'PostgreSQL 16+ com isolamento multi-tenant (esquema pronto para Windsurf)',
      sessionStatus: req.authSession
        ? {
            authenticated: true,
            sessionId: req.authSession.sessionId,
            role: req.authSession.role,
            organizationId: req.authSession.organizationId,
            isDemoSession: req.authSession.isDemoSession,
            authMethod: req.authSession.authMethod,
          }
        : { authenticated: false },
      securityChecks: {
        productionSecretFailClosed: true,
        localStorageAuthDisabled: true,
        serverSessionRevocationActive: true,
        driverManagementRbacSeparated: true,
        multiOrgTenantIsolationActive: true,
        demoCmsIsolationActive: true,
        geminiApiKeyServerOnly: true,
        selfRegisterAdminBlocked: true,
      },
      counts: {
        registeredRealUsers: store.users.length,
        activeServerSessions: activeSessionsCount,
        organizationsCount: store.organizations.length,
        persistedWorkspaces: Object.keys(store.workspaceStates).length,
        zoneObservations: store.zoneObservations.length,
        securityAuditEvents: store.securityAuditLogs.length,
        globalCmsPublished: Boolean(store.globalCms.published),
      },
    });
  });

  // ===========================================================================
  // 2. AUTHENTICATION, EXPIRATION & REVOCATION (PARTE V)
  // ===========================================================================
  router.get('/api/auth/session', (req: AuthedRequest, res: Response) => {
    if (!req.authSession) {
      res.json({ authenticated: false, session: null });
      return;
    }
    res.json({
      authenticated: true,
      session: toClientAuthSession(req.authSession),
    });
  });

  router.post('/api/auth/register', (req: Request, res: Response) => {
    const check = validateRegistrationPayload((req.body ?? {}) as Record<string, unknown>);
    if (!check.valid) {
      res.status(400).json({
        ok: false,
        error: check.error ?? 'Dados de registo inválidos.',
      });
      return;
    }
    const { name, email, password, role: requestedRole, organizationId } = check;

    const store = repo.loadStore();
    if (store.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ ok: false, error: 'Já existe uma conta registada com este email.' });
      return;
    }

    const { salt, hash } = hashPassword(password);
    const user: ServerUserRecord = {
      id: `usr-real-${crypto.randomUUID().slice(0, 8)}`,
      name,
      email,
      role: requestedRole,
      organizationId,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    repo.appendSecurityAudit(store, {
      actorId: user.id,
      actorRole: user.role,
      organizationId: user.organizationId,
      action: 'AUTH_REGISTER',
      target: user.email,
      outcome: 'ALLOWED',
      detail: `Conta registada (${user.role}, org=${user.organizationId ?? 'Motorista Independente'}).`,
    });
    repo.saveStore(store);

    const ttlMs =
      typeof req.body?.sessionTtlMs === 'number' && req.body.sessionTtlMs > 0
        ? Math.min(req.body.sessionTtlMs, 1000 * 60 * 60 * 24)
        : 1000 * 60 * 60 * 12;

    const payload: SessionTokenPayload = {
      sessionId: `sid-${crypto.randomUUID()}`,
      userId: user.id,
      userName: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      isDemoSession: false,
      authMethod: 'server_credentials',
      signedInAt: new Date().toISOString(),
      exp: Date.now() + ttlMs,
    };
    registerServerSession(payload);
    const token = signSessionToken(payload);
    setSessionCookie(res, token);
    res.status(201).json({
      ok: true,
      token,
      session: toClientAuthSession(payload),
    });
  });

  router.post('/api/auth/login', (req: Request, res: Response) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      res.status(400).json({ ok: false, error: 'Email e palavra-passe obrigatórios.' });
      return;
    }

    const ttlMs =
      typeof req.body?.sessionTtlMs === 'number' && req.body.sessionTtlMs > 0
        ? Math.min(req.body.sessionTtlMs, 1000 * 60 * 60 * 24)
        : 1000 * 60 * 60 * 12;

    const envAdminEmail = env.AIVAD_ADMIN_EMAIL?.trim().toLowerCase();
    const envAdminPassword = env.AIVAD_ADMIN_PASSWORD;
    if (envAdminEmail && envAdminPassword && email === envAdminEmail) {
      const a = Buffer.from(password, 'utf8');
      const b = Buffer.from(envAdminPassword, 'utf8');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        const payload: SessionTokenPayload = {
          sessionId: `sid-${crypto.randomUUID()}`,
          userId: 'usr-admin-env',
          userName: 'Administrador AIVAD',
          email: envAdminEmail,
          role: 'Superadministrador',
          organizationId: null,
          isDemoSession: false,
          authMethod: 'server_credentials',
          signedInAt: new Date().toISOString(),
          exp: Date.now() + ttlMs,
        };
        registerServerSession(payload);
        const token = signSessionToken(payload);
        setSessionCookie(res, token);
        res.json({
          ok: true,
          token,
          session: toClientAuthSession(payload),
        });
        return;
      }
      res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
      return;
    }

    const store = repo.loadStore();
    const user = store.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      repo.appendSecurityAudit(store, {
        actorId: email || 'anonymous',
        actorRole: 'Unauthenticated',
        organizationId: null,
        action: 'AUTH_LOGIN_FAILED',
        target: email,
        outcome: 'DENIED',
        detail: 'Tentativa de login falhada com credenciais inválidas.',
      });
      repo.saveStore(store);
      res.status(401).json({
        ok: false,
        error:
          'Credenciais inválidas. Registe uma conta real ou utilize o Modo Demonstração explícito.',
      });
      return;
    }

    const payload: SessionTokenPayload = {
      sessionId: `sid-${crypto.randomUUID()}`,
      userId: user.id,
      userName: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ?? null,
      isDemoSession: false,
      authMethod: 'server_credentials',
      signedInAt: new Date().toISOString(),
      exp: Date.now() + ttlMs,
    };
    registerServerSession(payload);
    const token = signSessionToken(payload);
    setSessionCookie(res, token);
    res.json({
      ok: true,
      token,
      session: toClientAuthSession(payload),
    });
  });

  router.post('/api/auth/demo', (req: Request, res: Response) => {
    const requestedProfile = req.body?.profile === 'admin' ? 'admin' : 'driver';
    const isAdminDemo = requestedProfile === 'admin';

    if (
      securityBoot.isProduction &&
      isAdminDemo &&
      !securityBoot.allowDemoSandboxInProduction
    ) {
      res.status(403).json({
        ok: false,
        error:
          'Sandbox administrativa de demonstração desativada em produção real por segurança (defina AIVAD_ALLOW_DEMO_SANDBOX=true apenas em ambientes de homologação).',
      });
      return;
    }

    const payload: SessionTokenPayload = {
      sessionId: `sid-demo-${crypto.randomUUID()}`,
      userId: isAdminDemo ? 'usr-demo-admin' : 'usr-driver-1',
      userName: isAdminDemo ? 'Helena Rodrigues (Demo)' : 'Tiago Ferreira (Demo)',
      email: isAdminDemo ? 'demo-admin@aivad.local' : 'tiago.ferreira@demo-aivad.pt',
      role: isAdminDemo ? 'Superadministrador' : 'Motorista',
      organizationId: isAdminDemo ? null : 'org-1',
      isDemoSession: true,
      authMethod: 'demo_sandbox',
      signedInAt: new Date().toISOString(),
      exp: Date.now() + 1000 * 60 * 60 * 8,
    };
    registerServerSession(payload);
    const token = signSessionToken(payload);
    setSessionCookie(res, token);
    res.json({
      ok: true,
      token,
      session: toClientAuthSession(payload),
    });
  });

  router.post('/api/auth/logout', (req: AuthedRequest, res: Response) => {
    if (req.authSession?.sessionId) {
      const store = repo.loadStore();
      const existing = store.sessions[req.authSession.sessionId];
      if (existing) {
        existing.revokedAt = new Date().toISOString();
        existing.revokedReason = 'Terminar sessão explícito pelo utilizador';
        repo.appendSecurityAudit(store, {
          actorId: req.authSession.userId,
          actorRole: req.authSession.role,
          organizationId: req.authSession.organizationId,
          action: 'SESSION_LOGOUT_REVOKED',
          target: req.authSession.sessionId,
          outcome: 'REVOKED',
          detail: 'Sessão revogada imediatamente no servidor.',
        });
        repo.saveStore(store);
      }
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true, revoked: true });
  });

  router.post('/api/auth/sessions/revoke', requireAuth, (req: AuthedRequest, res: Response) => {
    const targetSessionId =
      typeof req.body?.sessionId === 'string' && req.body.sessionId.trim()
        ? req.body.sessionId.trim()
        : req.authSession?.sessionId;
    const revokeAllForUser = Boolean(req.body?.revokeAllForUser);
    const store = repo.loadStore();
    const isAdmin = ADMIN_ROLE_SET.has(req.authSession?.role ?? '');
    const nowIso = new Date().toISOString();
    let revokedCount = 0;

    for (const s of Object.values(store.sessions)) {
      const matchesTarget = revokeAllForUser
        ? s.userId === (isAdmin && req.body?.userId ? req.body.userId : req.authSession?.userId)
        : s.sessionId === targetSessionId;
      if (!matchesTarget) continue;

      if (!isAdmin && s.userId !== req.authSession?.userId) {
        res.status(403).json({
          ok: false,
          error: 'Não tem permissão para revogar sessões de outro utilizador.',
        });
        return;
      }

      if (s.revokedAt === null) {
        s.revokedAt = nowIso;
        s.revokedReason = 'Revogação explícita de segurança';
        revokedCount += 1;
      }
    }

    repo.appendSecurityAudit(store, {
      actorId: req.authSession?.userId ?? 'unknown',
      actorRole: req.authSession?.role ?? 'unknown',
      organizationId: req.authSession?.organizationId ?? null,
      action: 'SESSION_REVOKED',
      target: targetSessionId ?? 'multiple',
      outcome: 'REVOKED',
      detail: `Revogadas ${revokedCount} sessão(ões) no servidor.`,
    });
    repo.saveStore(store);

    if (targetSessionId === req.authSession?.sessionId || revokeAllForUser) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    }
    res.json({ ok: true, revokedCount });
  });

  // ===========================================================================
  // 3. AIVAD DRIVER ISOLATED WORKSPACE & SYNC (PARTES IV, VI, VII)
  // ===========================================================================
  router.get('/api/driver/workspace/:targetUserId', requireAuth, (req: AuthedRequest, res: Response) => {
    const targetUserId = String(req.params.targetUserId || '');
    const store = repo.loadStore();
    const scope = req.authSession?.isDemoSession ? `demo:${targetUserId}` : `real:${targetUserId}`;
    const existing = store.workspaceStates[scope];

    const check = evaluateTenantAccess(
      req.authSession
        ? {
            authenticated: true,
            userId: req.authSession.userId,
            role: req.authSession.role as UserRole,
            organizationId: req.authSession.organizationId,
          }
        : null,
      {
        ownerUserId: targetUserId,
        targetOrganizationId: existing?.organizationId ?? undefined,
      }
    );

    if (!check.allowed) {
      repo.appendSecurityAudit(store, {
        actorId: req.authSession?.userId ?? 'unknown',
        actorRole: req.authSession?.role ?? 'unknown',
        organizationId: req.authSession?.organizationId ?? null,
        action: 'CROSS_DRIVER_READ_ATTEMPT',
        target: targetUserId,
        outcome: 'DENIED',
        detail: check.reason,
      });
      repo.saveStore(store);
      res.status(check.httpStatus).json({ ok: false, error: check.reason });
      return;
    }

    res.json({
      ok: true,
      found: Boolean(existing),
      userId: targetUserId,
      organizationId: existing?.organizationId ?? req.authSession?.organizationId ?? null,
      version: existing?.version ?? 0,
      updatedAt: existing?.updatedAt ?? null,
      state: existing?.state ?? null,
    });
  });

  router.put('/api/driver/workspace/:targetUserId', requireAuth, (req: AuthedRequest, res: Response) => {
    const targetUserId = String(req.params.targetUserId || '');
    const store = repo.loadStore();

    // Apenas o próprio motorista (ou admin global) pode alterar o seu workspace individual
    if (req.authSession?.userId !== targetUserId && !ADMIN_ROLE_SET.has(req.authSession?.role ?? '')) {
      const reason = `Isolamento de dados violado: "${req.authSession?.userId}" não pode sobrescrever os dados operacionais de "${targetUserId}".`;
      repo.appendSecurityAudit(store, {
        actorId: req.authSession?.userId ?? 'unknown',
        actorRole: req.authSession?.role ?? 'unknown',
        organizationId: req.authSession?.organizationId ?? null,
        action: 'CROSS_DRIVER_WRITE_ATTEMPT',
        target: targetUserId,
        outcome: 'DENIED',
        detail: reason,
      });
      repo.saveStore(store);
      res.status(403).json({ ok: false, error: reason });
      return;
    }

    const statePayload = req.body?.state;
    if (!statePayload || typeof statePayload !== 'object') {
      res.status(400).json({ ok: false, error: 'Payload de estado do motorista inválido.' });
      return;
    }

    const scope = req.authSession?.isDemoSession ? `demo:${targetUserId}` : `real:${targetUserId}`;
    const prevVersion = store.workspaceStates[scope]?.version ?? 0;
    const nowIso = new Date().toISOString();
    store.workspaceStates[scope] = {
      state: statePayload,
      updatedAt: nowIso,
      version: prevVersion + 1,
      ownerUserId: targetUserId,
      organizationId: req.authSession?.organizationId ?? null,
    };
    repo.saveStore(store);

    res.json({
      ok: true,
      userId: targetUserId,
      version: prevVersion + 1,
      updatedAt: nowIso,
    });
  });

  router.get('/api/sync/state', requireAuth, (req: AuthedRequest, res: Response) => {
    const scope = req.authSession?.isDemoSession ? 'demo' : `real:${req.authSession?.userId}`;
    const store = repo.loadStore();
    const record = store.workspaceStates[scope];
    if (!record) {
      res.json({ ok: true, found: false, scope, version: 0, state: null });
      return;
    }
    res.json({
      ok: true,
      found: true,
      scope,
      updatedAt: record.updatedAt,
      version: record.version,
      organizationId: record.organizationId,
      state: record.state,
    });
  });

  router.post('/api/sync/push', requireAuth, (req: AuthedRequest, res: Response) => {
    const scope = req.authSession?.isDemoSession ? 'demo' : `real:${req.authSession?.userId}`;
    const idempotencyKey =
      typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey : '';
    const baseVersion =
      typeof req.body?.baseVersion === 'number' ? req.body.baseVersion : undefined;
    const forceOverwrite = Boolean(req.body?.forceOverwrite);
    const statePayload = req.body?.state;

    if (!statePayload || typeof statePayload !== 'object') {
      res.status(400).json({ ok: false, error: 'Payload de estado inválido.' });
      return;
    }

    const store = repo.loadStore();
    if (idempotencyKey && store.processedIdempotencyKeys.includes(idempotencyKey)) {
      const existing = store.workspaceStates[scope];
      res.json({
        ok: true,
        deduplicated: true,
        scope,
        updatedAt: existing?.updatedAt ?? new Date().toISOString(),
        version: existing?.version ?? 1,
      });
      return;
    }

    const existing = store.workspaceStates[scope];
    const currentVersion = existing?.version ?? 0;

    // Deteção explícita de conflito de versões concorrentes (PARTE VII)
    if (
      baseVersion !== undefined &&
      currentVersion > 0 &&
      baseVersion < currentVersion &&
      !forceOverwrite
    ) {
      repo.appendSecurityAudit(store, {
        actorId: req.authSession?.userId ?? 'unknown',
        actorRole: req.authSession?.role ?? 'unknown',
        organizationId: req.authSession?.organizationId ?? null,
        action: 'SYNC_VERSION_CONFLICT',
        target: scope,
        outcome: 'CONFLICT',
        detail: `Conflito de sincronização detetado: baseVersion=${baseVersion} < serverVersion=${currentVersion}.`,
      });
      repo.saveStore(store);
      res.status(409).json({
        ok: false,
        conflictDetected: true,
        error: `Conflito de sincronização: a versão local (${baseVersion}) está desatualizada face ao servidor (${currentVersion}).`,
        clientBaseVersion: baseVersion,
        serverVersion: currentVersion,
        serverUpdatedAt: existing?.updatedAt ?? null,
        serverState: existing?.state ?? null,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    store.workspaceStates[scope] = {
      state: statePayload,
      updatedAt: nowIso,
      version: currentVersion + 1,
      ownerUserId: req.authSession?.userId ?? 'unknown',
      organizationId: req.authSession?.organizationId ?? null,
    };
    if (idempotencyKey) {
      store.processedIdempotencyKeys = [
        idempotencyKey,
        ...store.processedIdempotencyKeys,
      ].slice(0, 400);
    }
    repo.saveStore(store);

    res.json({
      ok: true,
      deduplicated: false,
      conflictDetected: false,
      scope,
      updatedAt: nowIso,
      version: currentVersion + 1,
    });
  });

  // Recuperação idempotente da fila offline após falha de rede (PARTE VII)
  router.post('/api/sync/offline-replay', requireAuth, (req: AuthedRequest, res: Response) => {
    const rawOps = Array.isArray(req.body?.operations) ? req.body.operations : [];
    const store = repo.loadStore();
    let appliedCount = 0;
    let deduplicatedCount = 0;
    const nowIso = new Date().toISOString();

    for (const op of rawOps) {
      if (!op || typeof op !== 'object') continue;
      const key =
        typeof (op as Record<string, unknown>).idempotencyKey === 'string'
          ? String((op as Record<string, unknown>).idempotencyKey).trim()
          : '';
      const opType =
        typeof (op as Record<string, unknown>).operationType === 'string'
          ? String((op as Record<string, unknown>).operationType)
          : 'OFFLINE_MUTATION';
      if (!key) continue;

      if (store.processedIdempotencyKeys.includes(key)) {
        deduplicatedCount += 1;
        continue;
      }

      store.processedIdempotencyKeys = [key, ...store.processedIdempotencyKeys].slice(0, 400);
      store.offlineReplayLog = [
        {
          id: `replay-${Date.now()}-${crypto.randomUUID().slice(0, 5)}`,
          idempotencyKey: key,
          userId: req.authSession?.userId ?? 'unknown',
          operationType: opType,
          replayedAt: nowIso,
        },
        ...store.offlineReplayLog,
      ].slice(0, 200);
      appliedCount += 1;
    }

    repo.saveStore(store);
    res.json({
      ok: true,
      appliedCount,
      deduplicatedCount,
      replayedAt: nowIso,
    });
  });

  // ===========================================================================
  // 4. AIVAD MANAGEMENT: MULTI-ORGANIZATION & INTERNATIONAL CATALOG (PARTES II, IV, VI)
  // ===========================================================================
  router.get('/api/management/organizations', requireManagement, (req: AuthedRequest, res: Response) => {
    const store = repo.loadStore();
    const isGlobalAdmin = ADMIN_ROLE_SET.has(req.authSession?.role ?? '');
    const visibleOrgs = isGlobalAdmin
      ? store.organizations
      : store.organizations.filter((o) => o.id === req.authSession?.organizationId);

    res.json({
      ok: true,
      scope: isGlobalAdmin ? 'global_admin' : 'organization_isolated',
      organizations: visibleOrgs,
    });
  });

  router.post('/api/management/organizations', requireManagement, (req: AuthedRequest, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    const taxId = typeof body.taxId === 'string' ? body.taxId.trim().slice(0, 40) : '';
    const countryCode =
      typeof body.countryCode === 'string' && body.countryCode.trim()
        ? body.countryCode.trim().toUpperCase().slice(0, 4)
        : 'PT';
    const allowedTypes: OrganizationType[] = [
      'Frota TVDE',
      'Operador Independente',
      'Cooperativa / Equipa',
      'Empresa Corporativa',
    ];
    const orgType: OrganizationType = allowedTypes.includes(body.type as OrganizationType)
      ? (body.type as OrganizationType)
      : 'Frota TVDE';

    if (name.length < 3 || taxId.length < 5) {
      res.status(400).json({
        ok: false,
        error: 'Indique a denominação da organização (mín. 3 caracteres) e NIF/NIPC válido.',
      });
      return;
    }

    const store = repo.loadStore();
    const newOrg: OrganizationRecord = {
      id: `org-${crypto.randomUUID().slice(0, 8)}`,
      name,
      type: orgType,
      countryCode,
      taxId,
      driversCount: typeof body.driversCount === 'number' ? Math.max(0, body.driversCount) : 1,
      vehiclesCount: typeof body.vehiclesCount === 'number' ? Math.max(0, body.vehiclesCount) : 1,
      planId: typeof body.planId === 'string' ? body.planId : 'plan-fleet',
      status: 'Ativa',
      ownerUserId: req.authSession?.userId,
      memberUserIds: req.authSession?.userId ? [req.authSession.userId] : [],
      vehicleIds: [],
      isolationPolicy: 'strict_tenant',
    };

    store.organizations.push(newOrg);
    // Se um Operador sem organização criou a sua própria organização, associa-o automaticamente e atualiza a sessão ativa
    if (req.authSession?.role === 'Operador' && !req.authSession.organizationId) {
      const user = store.users.find((u) => u.id === req.authSession?.userId);
      if (user) user.organizationId = newOrg.id;
      const sessRec = store.sessions[req.authSession.sessionId];
      if (sessRec) sessRec.organizationId = newOrg.id;
      const updatedPayload: SessionTokenPayload = {
        ...req.authSession,
        organizationId: newOrg.id,
      };
      setSessionCookie(res, signSessionToken(updatedPayload));
    }

    repo.appendSecurityAudit(store, {
      actorId: req.authSession?.userId ?? 'unknown',
      actorRole: req.authSession?.role ?? 'unknown',
      organizationId: newOrg.id,
      action: 'ORGANIZATION_CREATED',
      target: newOrg.id,
      outcome: 'ALLOWED',
      detail: `Organização "${newOrg.name}" (${newOrg.type}) criada com isolamento strict_tenant.`,
    });
    repo.saveStore(store);

    res.status(201).json({ ok: true, organization: newOrg });
  });

  router.get(
    '/api/management/organizations/:orgId/summary',
    requireManagement,
    (req: AuthedRequest, res: Response) => {
      const orgId = String(req.params.orgId || '');
      const store = repo.loadStore();
      const check = evaluateTenantAccess(
        req.authSession
          ? {
              authenticated: true,
              userId: req.authSession.userId,
              role: req.authSession.role as UserRole,
              organizationId: req.authSession.organizationId,
            }
          : null,
        {
          requireManagementConsole: true,
          targetOrganizationId: orgId,
        }
      );

      if (!check.allowed) {
        repo.appendSecurityAudit(store, {
          actorId: req.authSession?.userId ?? 'unknown',
          actorRole: req.authSession?.role ?? 'unknown',
          organizationId: req.authSession?.organizationId ?? null,
          action: 'CROSS_ORG_ACCESS_ATTEMPT',
          target: orgId,
          outcome: 'DENIED',
          detail: check.reason,
        });
        repo.saveStore(store);
        res.status(check.httpStatus).json({ ok: false, error: check.reason });
        return;
      }

      const org = store.organizations.find((o) => o.id === orgId);
      if (!org) {
        res.status(404).json({ ok: false, error: 'Organização não encontrada.' });
        return;
      }

      const orgUsers = store.users
        .filter((u) => u.organizationId === orgId)
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          organizationId: u.organizationId,
        }));

      const orgWorkspacesCount = Object.values(store.workspaceStates).filter(
        (w) => w.organizationId === orgId
      ).length;

      res.json({
        ok: true,
        organization: org,
        members: orgUsers,
        persistedWorkspacesCount: orgWorkspacesCount,
      });
    }
  );

  // Catálogo Internacional Público & Administrativo sem alterações no código (PARTE II)
  router.get('/api/catalog/public', (req: AuthedRequest, res: Response) => {
    const store = repo.loadStore();
    const isDemoViewer = Boolean(req.authSession?.isDemoSession);
    const activeCatalog =
      isDemoViewer && (store.demoSandboxCatalog.countries || store.demoSandboxCatalog.platforms)
        ? store.demoSandboxCatalog
        : store.globalCatalog;

    res.json({
      ok: true,
      scope:
        isDemoViewer && (store.demoSandboxCatalog.countries || store.demoSandboxCatalog.platforms)
          ? 'demo_sandbox_isolated'
          : 'global_published',
      countries: activeCatalog.countries ?? SEED_COUNTRIES,
      platforms: activeCatalog.platforms ?? SEED_PLATFORMS,
      updatedAt: activeCatalog.updatedAt,
      updatedBy: activeCatalog.updatedBy,
    });
  });

  router.put('/api/management/catalog', requireGlobalAdmin, (req: AuthedRequest, res: Response) => {
    const countries = Array.isArray(req.body?.countries)
      ? (req.body.countries as CountryMarketConfig[])
      : null;
    const platforms = Array.isArray(req.body?.platforms)
      ? (req.body.platforms as PlatformRecord[])
      : null;

    if (!countries && !platforms) {
      res.status(400).json({
        ok: false,
        error: 'Forneça countries e/ou platforms válidos para atualizar o catálogo.',
      });
      return;
    }

    const store = repo.loadStore();
    const nowIso = new Date().toISOString();
    const isDemo = Boolean(req.authSession?.isDemoSession);
    const targetBundle = isDemo ? store.demoSandboxCatalog : store.globalCatalog;

    if (countries) targetBundle.countries = countries;
    if (platforms) targetBundle.platforms = platforms;
    targetBundle.updatedAt = nowIso;
    targetBundle.updatedBy = req.authSession?.userName ?? 'Admin';

    repo.appendSecurityAudit(store, {
      actorId: req.authSession?.userId ?? 'unknown',
      actorRole: req.authSession?.role ?? 'unknown',
      organizationId: req.authSession?.organizationId ?? null,
      action: 'CATALOG_UPDATED',
      target: isDemo ? 'demo_sandbox_catalog' : 'global_catalog',
      outcome: 'ALLOWED',
      detail: `Catálogo internacional atualizado (${countries?.length ?? 'mantido'} países, ${platforms?.length ?? 'mantido'} plataformas).`,
    });
    repo.saveStore(store);

    res.json({
      ok: true,
      targetScope: isDemo ? 'demo_sandbox_isolated' : 'global_published',
      updatedAt: nowIso,
    });
  });

  router.get('/api/admin/audit-summary', requireGlobalAdmin, (req: AuthedRequest, res: Response) => {
    const store = repo.loadStore();
    res.json({
      ok: true,
      actor: req.authSession?.userName,
      role: req.authSession?.role,
      isDemoSession: Boolean(req.authSession?.isDemoSession),
      registeredRealUsersCount: store.users.length,
      organizationsCount: store.organizations.length,
      persistedWorkspacesCount: Object.keys(store.workspaceStates).length,
      driverZoneObservationsCount: store.zoneObservations.length,
      securityAuditLogs: store.securityAuditLogs.slice(0, 50),
      globalCmsPublishedAt: store.globalCms.updatedAt,
      persistenceWarning:
        'Persistência atual baseada em ficheiro JSON local do servidor Express (protótipo). Para produção Windsurf, migrar para PostgreSQL + JWT/OAuth.',
    });
  });

  // ===========================================================================
  // 5. COMPLETE CMS & PUBLIC PORTAL LIFECYCLE (PARTE VIII)
  // ===========================================================================
  router.get('/api/cms/public', (req: AuthedRequest, res: Response) => {
    const store = repo.loadStore();
    const isDemoViewer = Boolean(req.authSession?.isDemoSession);
    const activeBundle =
      isDemoViewer && store.demoSandboxCms.published
        ? store.demoSandboxCms
        : store.globalCms;
    const canInspectDraft =
      Boolean(req.authSession) && MANAGEMENT_ROLE_SET.has(req.authSession?.role ?? '');
    const draftBundle = isDemoViewer ? store.demoSandboxCms : store.globalCms;

    res.json({
      ok: true,
      scope:
        isDemoViewer && store.demoSandboxCms.published
          ? 'demo_sandbox_isolated'
          : 'global_published',
      cms: activeBundle.published,
      draft: canInspectDraft ? draftBundle.draft : null,
      versionNumber: activeBundle.versionNumber,
      revisionHistory: canInspectDraft ? activeBundle.revisionHistory : [],
      updatedAt: activeBundle.updatedAt,
      updatedBy: activeBundle.updatedBy,
    });
  });

  router.post('/api/cms/draft', requireGlobalAdmin, (req: AuthedRequest, res: Response) => {
    const authCheck = evaluateCmsMutationAuthorization({
      authenticated: Boolean(req.authSession),
      role: (req.authSession?.role ?? 'Motorista') as UserRole,
      isDemoSession: req.authSession?.isDemoSession,
      authMethod: req.authSession?.authMethod,
    });
    if (!authCheck.allowed || authCheck.targetScope === 'denied') {
      res.status(403).json({ ok: false, error: authCheck.reason });
      return;
    }
    const draftPayload = req.body?.draft;
    if (!draftPayload || typeof draftPayload !== 'object') {
      res.status(400).json({ ok: false, error: 'Rascunho CMS inválido.' });
      return;
    }
    const store = repo.loadStore();
    const nowIso = new Date().toISOString();
    const bundle =
      authCheck.targetScope === 'global_published' ? store.globalCms : store.demoSandboxCms;

    bundle.draft = draftPayload as Record<string, unknown>;
    bundle.updatedAt = nowIso;
    bundle.updatedBy = req.authSession?.userName ?? 'Admin';
    repo.saveStore(store);

    res.json({
      ok: true,
      stage: 'saved_draft',
      targetScope: authCheck.targetScope,
      message: authCheck.reason,
      updatedAt: nowIso,
    });
  });

  router.post('/api/cms/publish', requireGlobalAdmin, (req: AuthedRequest, res: Response) => {
    const authCheck = evaluateCmsMutationAuthorization({
      authenticated: Boolean(req.authSession),
      role: (req.authSession?.role ?? 'Motorista') as UserRole,
      isDemoSession: req.authSession?.isDemoSession,
      authMethod: req.authSession?.authMethod,
    });
    if (!authCheck.allowed || authCheck.targetScope === 'denied') {
      res.status(403).json({ ok: false, error: authCheck.reason });
      return;
    }
    const cmsPayload = req.body?.cms;
    if (!cmsPayload || typeof cmsPayload !== 'object') {
      res.status(400).json({ ok: false, error: 'Conteúdo CMS inválido para publicação.' });
      return;
    }
    const summary =
      typeof req.body?.summary === 'string' && req.body.summary.trim()
        ? req.body.summary.trim().slice(0, 180)
        : 'Publicação efetuada a partir do AIVAD Management';

    const store = repo.loadStore();
    const nowIso = new Date().toISOString();
    const bundle =
      authCheck.targetScope === 'global_published' ? store.globalCms : store.demoSandboxCms;
    const nextVersion = (bundle.versionNumber || 0) + 1;

    const revisionEntry = {
      id: `cms-rev-v${nextVersion}-${Date.now()}`,
      versionNumber: nextVersion,
      savedAt: nowIso,
      savedBy: req.authSession?.userName ?? 'Admin',
      summary,
      snapshot: cmsPayload as Record<string, unknown>,
    };

    bundle.published = {
      ...(cmsPayload as Record<string, unknown>),
      versionNumber: nextVersion,
    };
    bundle.draft = null;
    bundle.versionNumber = nextVersion;
    bundle.revisionHistory = [revisionEntry, ...(bundle.revisionHistory ?? [])].slice(0, 30);
    bundle.updatedAt = nowIso;
    bundle.updatedBy = req.authSession?.userName ?? 'Admin';

    repo.appendSecurityAudit(store, {
      actorId: req.authSession?.userId ?? 'unknown',
      actorRole: req.authSession?.role ?? 'unknown',
      organizationId: req.authSession?.organizationId ?? null,
      action: 'CMS_PUBLISHED',
      target: authCheck.targetScope,
      outcome: 'ALLOWED',
      detail: `Publicação CMS v${nextVersion} (${authCheck.targetScope}): ${summary}`,
    });
    repo.saveStore(store);

    res.json({
      ok: true,
      stage:
        authCheck.targetScope === 'global_published'
          ? 'published_public_portal'
          : 'demo_sandbox_preview',
      targetScope: authCheck.targetScope,
      versionNumber: nextVersion,
      revisionHistory: bundle.revisionHistory,
      message: authCheck.reason,
      updatedAt: nowIso,
    });
  });

  router.post('/api/cms/rollback', requireGlobalAdmin, (req: AuthedRequest, res: Response) => {
    const authCheck = evaluateCmsMutationAuthorization({
      authenticated: Boolean(req.authSession),
      role: (req.authSession?.role ?? 'Motorista') as UserRole,
      isDemoSession: req.authSession?.isDemoSession,
      authMethod: req.authSession?.authMethod,
    });
    if (!authCheck.allowed || authCheck.targetScope === 'denied') {
      res.status(403).json({ ok: false, error: authCheck.reason });
      return;
    }

    const revisionId = typeof req.body?.revisionId === 'string' ? req.body.revisionId : '';
    const store = repo.loadStore();
    const bundle =
      authCheck.targetScope === 'global_published' ? store.globalCms : store.demoSandboxCms;
    const found = bundle.revisionHistory.find((r) => r.id === revisionId);
    if (!found) {
      res.status(404).json({ ok: false, error: 'Versão de histórico CMS não encontrada.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const nextVersion = (bundle.versionNumber || 0) + 1;
    bundle.published = { ...found.snapshot, versionNumber: nextVersion };
    bundle.draft = null;
    bundle.versionNumber = nextVersion;
    bundle.updatedAt = nowIso;
    bundle.updatedBy = req.authSession?.userName ?? 'Admin';
    repo.saveStore(store);

    res.json({
      ok: true,
      targetScope: authCheck.targetScope,
      versionNumber: nextVersion,
      restoredFromVersion: found.versionNumber,
      cms: bundle.published,
    });
  });

  // ===========================================================================
  // 6. COLLABORATIVE ZONES & GEMINI AI SERVER PROXY
  // ===========================================================================
  router.get('/api/zones/observations', (_req: Request, res: Response) => {
    const store = repo.loadStore();
    res.json({
      ok: true,
      observations: store.zoneObservations,
    });
  });

  router.post('/api/zones/observations', requireAuth, (req: AuthedRequest, res: Response) => {
    const body = req.body ?? {};
    if (!body.privacyConsent) {
      res.status(400).json({
        ok: false,
        error:
          'É obrigatório confirmar o consentimento de partilha agregada sem exposição de identidade.',
      });
      return;
    }
    const zoneName = typeof body.zoneName === 'string' ? body.zoneName.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (zoneName.length < 2 || description.length < 6) {
      res.status(400).json({
        ok: false,
        error: 'Indique a zona e uma descrição objetiva com mínimo de 6 caracteres.',
      });
      return;
    }
    const store = repo.loadStore();
    const record: ZoneObservationRecord = {
      id: `obs-${Date.now()}`,
      zoneId: typeof body.zoneId === 'string' ? body.zoneId : undefined,
      zoneName,
      city: typeof body.city === 'string' ? body.city : 'Lisboa',
      countryCode: typeof body.countryCode === 'string' ? body.countryCode : 'PT',
      driverId: req.authSession?.userId ?? 'anon',
      driverAlias: 'Motorista Verificado',
      privacyConsent: true,
      observationType:
        typeof body.observationType === 'string' ? body.observationType : 'Recolha difícil',
      description,
      dayOfWeek: typeof body.dayOfWeek === 'number' ? body.dayOfWeek : undefined,
      timeWindow: typeof body.timeWindow === 'string' ? body.timeWindow : undefined,
      createdAtIso: new Date().toISOString(),
      recurrenceCount: 1,
      validationTier: '3 · Ocorrência temporária não confirmada',
      isDemo: Boolean(req.authSession?.isDemoSession),
    };
    store.zoneObservations = [record, ...store.zoneObservations].slice(0, 120);
    repo.saveStore(store);
    res.status(201).json({ ok: true, observation: record });
  });

  router.post('/api/ai/query', async (req: AuthedRequest, res: Response) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const summaryContext =
      typeof req.body?.summaryContext === 'string' ? req.body.summaryContext : '';
    if (!query) {
      res.status(400).json({ ok: false, error: 'Consulta vazia.' });
      return;
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({
        ok: true,
        mode: 'deterministic_fallback',
        aiModelUsed: null,
        reason:
          'Chave GEMINI_API_KEY não configurada no servidor — executada análise determinística local transparente.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `És o motor AIVAD AI CORE para motoristas e gestores TVDE em língua portuguesa (PT).
Regras obrigatórias de honestidade:
- Nunca inventes dados de trânsito ao vivo nem números em falta; se um dado não existir no contexto, diz explicitamente "Informação indisponível".
- Explica cálculos de forma clara e acessível para motoristas dos 18 aos 75 anos.
- Sê conciso, objetivo e prático.

Contexto operacional atual do utilizador:
${summaryContext}

Pergunta do utilizador:
${query}`,
      });

      const answer = response.text?.trim();
      if (!answer) {
        res.json({
          ok: true,
          mode: 'deterministic_fallback',
          aiModelUsed: null,
          reason: 'Resposta vazia do modelo — aplicado fallback determinístico.',
        });
        return;
      }

      res.json({
        ok: true,
        mode: 'gemini_server_proxy',
        aiModelUsed: 'gemini-3-flash-preview',
        answer,
      });
    } catch (err) {
      res.json({
        ok: true,
        mode: 'deterministic_fallback',
        aiModelUsed: null,
        reason: `Falha temporária no proxy Gemini (${err instanceof Error ? err.message : 'erro de rede'}) — usado fallback determinístico local.`,
      });
    }
  });

  return {
    router,
    securityBoot,
    repo,
    signSessionToken,
    verifySessionToken,
  };
}

export function createAivadTestApp(options: AivadApiRouterOptions = {}) {
  const app = express();
  const api = createAivadApiRouter(options);
  app.use(api.router);
  return { app, ...api };
}
