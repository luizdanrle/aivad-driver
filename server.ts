import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const STORE_PATH = path.resolve(process.cwd(), '.aivad-server-store.json');
const SESSION_COOKIE_NAME = 'aivad_sid';
const SESSION_SECRET =
  process.env.AIVAD_SESSION_SECRET ||
  crypto.createHash('sha256').update(`${process.cwd()}:aivad-runtime-secret-v5`).digest('hex');

const ADMIN_ROLES = new Set([
  'Superadministrador',
  'Administrador',
  'Comercial',
  'Conteúdo',
  'Suporte',
  'Técnico',
  'Auditor',
]);

interface ServerUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}

interface ZoneObservationRecord {
  id: string;
  zoneId?: string;
  zoneName: string;
  city: string;
  countryCode: string;
  driverId: string;
  driverAlias: string;
  privacyConsent: boolean;
  observationType: string;
  description: string;
  dayOfWeek?: number;
  timeWindow?: string;
  createdAtIso: string;
  recurrenceCount: number;
  validationTier: string;
  isDemo: boolean;
}

interface PersistedServerStore {
  users: ServerUserRecord[];
  workspaceStates: Record<string, { state: unknown; updatedAt: string; version: number }>;
  processedIdempotencyKeys: string[];
  zoneObservations: ZoneObservationRecord[];
}

function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const computed = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

function loadStore(): PersistedServerStore {
  const fallback: PersistedServerStore = {
    users: [],
    workspaceStates: {},
    processedIdempotencyKeys: [],
    zoneObservations: [],
  };
  try {
    if (!fs.existsSync(STORE_PATH)) return fallback;
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedServerStore>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      workspaceStates: parsed.workspaceStates && typeof parsed.workspaceStates === 'object' ? parsed.workspaceStates : {},
      processedIdempotencyKeys: Array.isArray(parsed.processedIdempotencyKeys) ? parsed.processedIdempotencyKeys : [],
      zoneObservations: Array.isArray(parsed.zoneObservations) ? parsed.zoneObservations : [],
    };
  } catch {
    return fallback;
  }
}

function saveStore(store: PersistedServerStore): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // Non-fatal in read-only environments
  }
}

interface SessionTokenPayload {
  userId: string;
  userName: string;
  email: string;
  role: string;
  isDemoSession: boolean;
  authMethod: 'server_credentials' | 'demo_sandbox';
  signedInAt: string;
  exp: number;
}

function signSessionToken(payload: SessionTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string | undefined | null): SessionTokenPayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionTokenPayload;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
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

interface AuthedRequest extends Request {
  authSession?: SessionTokenPayload | null;
}

function attachSession(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const cookies = parseCookies(req.headers.cookie);
  const token = bearer || cookies[SESSION_COOKIE_NAME] || null;
  req.authSession = verifySessionToken(token);
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.authSession) {
    res.status(401).json({ ok: false, error: 'Autenticação obrigatória no servidor AIVAD.' });
    return;
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.authSession) {
    res.status(401).json({ ok: false, error: 'Autenticação obrigatória para acesso administrativo.' });
    return;
  }
  if (!ADMIN_ROLES.has(req.authSession.role)) {
    res.status(403).json({
      ok: false,
      error: `Acesso negado (403 RBAC): o perfil "${req.authSession.role}" não tem permissões administrativas.`,
    });
    return;
  }
  next();
}

function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 12,
    path: '/',
  });
}

async function createAppServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(attachSession);

  // Health & runtime capability inspection (never returns secrets)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'AIVAD Server API',
      persistenceMode: 'express_json_store_prototype',
      geminiProxyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      adminEnvConfigured: Boolean(process.env.AIVAD_ADMIN_EMAIL && process.env.AIVAD_ADMIN_PASSWORD),
      timestamp: new Date().toISOString(),
    });
  });

  // Current server session
  app.get('/api/auth/session', (req: AuthedRequest, res: Response) => {
    if (!req.authSession) {
      res.json({ authenticated: false, session: null });
      return;
    }
    res.json({
      authenticated: true,
      session: {
        authenticated: true,
        userId: req.authSession.userId,
        userName: req.authSession.userName,
        email: req.authSession.email,
        role: req.authSession.role,
        signedInAt: req.authSession.signedInAt,
        isDemoSession: req.authSession.isDemoSession,
        authMethod: req.authSession.authMethod,
      },
    });
  });

  // Real Driver/Operator Registration (never allows self-registering as Admin)
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const requestedRole = req.body?.role === 'Operador' ? 'Operador' : 'Motorista';

    if (name.length < 2 || !email.includes('@') || password.length < 6) {
      res.status(400).json({
        ok: false,
        error: 'Indique nome válido, email válido e palavra-passe com mínimo de 6 caracteres.',
      });
      return;
    }

    const store = loadStore();
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
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    saveStore(store);

    const payload: SessionTokenPayload = {
      userId: user.id,
      userName: user.name,
      email: user.email,
      role: user.role,
      isDemoSession: false,
      authMethod: 'server_credentials',
      signedInAt: new Date().toISOString(),
      exp: Date.now() + 1000 * 60 * 60 * 12,
    };
    const token = signSessionToken(payload);
    setSessionCookie(res, token);
    res.status(201).json({
      ok: true,
      token,
      session: {
        authenticated: true,
        userId: payload.userId,
        userName: payload.userName,
        email: payload.email,
        role: payload.role,
        signedInAt: payload.signedInAt,
        isDemoSession: false,
        authMethod: 'server_credentials',
      },
    });
  });

  // Real Credential Login (uses store users or env-configured admin credentials; zero hardcoded PINs)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      res.status(400).json({ ok: false, error: 'Email e palavra-passe obrigatórios.' });
      return;
    }

    const envAdminEmail = process.env.AIVAD_ADMIN_EMAIL?.trim().toLowerCase();
    const envAdminPassword = process.env.AIVAD_ADMIN_PASSWORD;
    if (envAdminEmail && envAdminPassword && email === envAdminEmail) {
      const a = Buffer.from(password, 'utf8');
      const b = Buffer.from(envAdminPassword, 'utf8');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        const payload: SessionTokenPayload = {
          userId: 'usr-admin-env',
          userName: 'Administrador AIVAD',
          email: envAdminEmail,
          role: 'Superadministrador',
          isDemoSession: false,
          authMethod: 'server_credentials',
          signedInAt: new Date().toISOString(),
          exp: Date.now() + 1000 * 60 * 60 * 12,
        };
        const token = signSessionToken(payload);
        setSessionCookie(res, token);
        res.json({
          ok: true,
          token,
          session: {
            authenticated: true,
            userId: payload.userId,
            userName: payload.userName,
            email: payload.email,
            role: payload.role,
            signedInAt: payload.signedInAt,
            isDemoSession: false,
            authMethod: 'server_credentials',
          },
        });
        return;
      }
      res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
      return;
    }

    const store = loadStore();
    const user = store.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      res.status(401).json({
        ok: false,
        error: 'Credenciais inválidas. Registe uma conta real ou utilize o Modo Demonstração explícito.',
      });
      return;
    }

    const payload: SessionTokenPayload = {
      userId: user.id,
      userName: user.name,
      email: user.email,
      role: user.role,
      isDemoSession: false,
      authMethod: 'server_credentials',
      signedInAt: new Date().toISOString(),
      exp: Date.now() + 1000 * 60 * 60 * 12,
    };
    const token = signSessionToken(payload);
    setSessionCookie(res, token);
    res.json({
      ok: true,
      token,
      session: {
        authenticated: true,
        userId: payload.userId,
        userName: payload.userName,
        email: payload.email,
        role: payload.role,
        signedInAt: payload.signedInAt,
        isDemoSession: false,
        authMethod: 'server_credentials',
      },
    });
  });

  // Explicit Demo Sandbox Session (strictly isolated and marked isDemoSession=true)
  app.post('/api/auth/demo', (req: Request, res: Response) => {
    const requestedProfile = req.body?.profile === 'admin' ? 'admin' : 'driver';
    const isAdminDemo = requestedProfile === 'admin';
    const payload: SessionTokenPayload = {
      userId: isAdminDemo ? 'usr-demo-admin' : 'usr-driver-1',
      userName: isAdminDemo ? 'Helena Rodrigues (Demo)' : 'Tiago Ferreira (Demo)',
      email: isAdminDemo ? 'demo-admin@aivad.local' : 'tiago.ferreira@demo-aivad.pt',
      role: isAdminDemo ? 'Superadministrador' : 'Motorista',
      isDemoSession: true,
      authMethod: 'demo_sandbox',
      signedInAt: new Date().toISOString(),
      exp: Date.now() + 1000 * 60 * 60 * 8,
    };
    const token = signSessionToken(payload);
    setSessionCookie(res, token);
    res.json({
      ok: true,
      token,
      session: {
        authenticated: true,
        userId: payload.userId,
        userName: payload.userName,
        email: payload.email,
        role: payload.role,
        signedInAt: payload.signedInAt,
        isDemoSession: true,
        authMethod: 'demo_sandbox',
      },
    });
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  });

  // Protected Admin RBAC verification endpoint
  app.get('/api/admin/audit-summary', requireAdmin, (req: AuthedRequest, res: Response) => {
    const store = loadStore();
    res.json({
      ok: true,
      actor: req.authSession?.userName,
      role: req.authSession?.role,
      isDemoSession: Boolean(req.authSession?.isDemoSession),
      registeredRealUsersCount: store.users.length,
      persistedWorkspacesCount: Object.keys(store.workspaceStates).length,
      driverZoneObservationsCount: store.zoneObservations.length,
      persistenceWarning:
        'Persistência atual baseada em ficheiro JSON local do servidor Express (protótipo). Para produção Windsurf, migrar para PostgreSQL + JWT/OAuth.',
    });
  });

  // Sync Endpoints (Idempotent workspace state persistence on Express JSON store)
  app.get('/api/sync/state', requireAuth, (req: AuthedRequest, res: Response) => {
    const scope = req.authSession?.isDemoSession ? 'demo' : `real:${req.authSession?.userId}`;
    const store = loadStore();
    const record = store.workspaceStates[scope];
    if (!record) {
      res.json({ ok: true, found: false, scope, state: null });
      return;
    }
    res.json({
      ok: true,
      found: true,
      scope,
      updatedAt: record.updatedAt,
      version: record.version,
      state: record.state,
    });
  });

  app.post('/api/sync/push', requireAuth, (req: AuthedRequest, res: Response) => {
    const scope = req.authSession?.isDemoSession ? 'demo' : `real:${req.authSession?.userId}`;
    const idempotencyKey = typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey : '';
    const statePayload = req.body?.state;
    if (!statePayload || typeof statePayload !== 'object') {
      res.status(400).json({ ok: false, error: 'Payload de estado inválido.' });
      return;
    }
    const store = loadStore();
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

    const prevVersion = store.workspaceStates[scope]?.version ?? 0;
    const nowIso = new Date().toISOString();
    store.workspaceStates[scope] = {
      state: statePayload,
      updatedAt: nowIso,
      version: prevVersion + 1,
    };
    if (idempotencyKey) {
      store.processedIdempotencyKeys = [idempotencyKey, ...store.processedIdempotencyKeys].slice(0, 200);
    }
    saveStore(store);

    res.json({
      ok: true,
      deduplicated: false,
      scope,
      updatedAt: nowIso,
      version: prevVersion + 1,
    });
  });

  // Collaborative Driver Zone Observations (with privacy consent enforcement)
  app.get('/api/zones/observations', (_req: Request, res: Response) => {
    const store = loadStore();
    res.json({
      ok: true,
      observations: store.zoneObservations,
    });
  });

  app.post('/api/zones/observations', requireAuth, (req: AuthedRequest, res: Response) => {
    const body = req.body ?? {};
    if (!body.privacyConsent) {
      res.status(400).json({
        ok: false,
        error: 'É obrigatório confirmar o consentimento de partilha agregada sem exposição de identidade.',
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
    const store = loadStore();
    const record: ZoneObservationRecord = {
      id: `obs-${Date.now()}`,
      zoneId: typeof body.zoneId === 'string' ? body.zoneId : undefined,
      zoneName,
      city: typeof body.city === 'string' ? body.city : 'Lisboa',
      countryCode: typeof body.countryCode === 'string' ? body.countryCode : 'PT',
      driverId: req.authSession?.userId ?? 'anon',
      driverAlias: 'Motorista Verificado',
      privacyConsent: true,
      observationType: typeof body.observationType === 'string' ? body.observationType : 'Recolha difícil',
      description,
      dayOfWeek: typeof body.dayOfWeek === 'number' ? body.dayOfWeek : undefined,
      timeWindow: typeof body.timeWindow === 'string' ? body.timeWindow : undefined,
      createdAtIso: new Date().toISOString(),
      recurrenceCount: 1,
      validationTier: '3 · Ocorrência temporária não confirmada',
      isDemo: Boolean(req.authSession?.isDemoSession),
    };
    store.zoneObservations = [record, ...store.zoneObservations].slice(0, 120);
    saveStore(store);
    res.status(201).json({ ok: true, observation: record });
  });

  // Server-Side Gemini AI Proxy (GEMINI_API_KEY strictly on server; deterministic fallback if unavailable)
  app.post('/api/ai/query', async (req: AuthedRequest, res: Response) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const summaryContext = typeof req.body?.summaryContext === 'string' ? req.body.summaryContext : '';
    if (!query) {
      res.status(400).json({ ok: false, error: 'Consulta vazia.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({
        ok: true,
        mode: 'deterministic_fallback',
        aiModelUsed: null,
        reason: 'Chave GEMINI_API_KEY não configurada no servidor — executada análise determinística local transparente.',
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
        model: 'gemini-4-hydrogen',
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
        aiModelUsed: 'gemini-4-hydrogen',
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

  // Mount Vite in dev or serve static dist in production
  if (process.env.NODE_ENV !== 'production') {
    app.use('/@vite-plugin-pwa', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send(`function cleanupStaleDevSw() {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then((unregistered) => {
        const hadSw = Array.isArray(unregistered) && unregistered.some(Boolean);
        const clearCaches =
          typeof caches !== 'undefined'
            ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            : Promise.resolve([]);
        return clearCaches.then(() => {
          if (hadSw && typeof window !== 'undefined' && !window.sessionStorage.getItem('aivad_sw_purged')) {
            window.sessionStorage.setItem('aivad_sw_purged', '1');
            window.location.reload();
          }
        });
      })
      .catch(() => {});
  }
}
cleanupStaleDevSw();
export function registerDevSW() {
  cleanupStaleDevSw();
}
export function registerSW() {
  cleanupStaleDevSw();
  return async () => {};
}
export default registerDevSW;
`);
    });

    app.get(['/dev-sw.js', '/sw.js', '/registerSW.js'], (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send(`self.addEventListener('install', () => {
  if (typeof self.skipWaiting === 'function') self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (self.registration && typeof self.registration.unregister === 'function') {
        await self.registration.unregister();
      }
    })()
  );
});
`);
    });

    app.get('/workbox-*.js', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send('// stale workbox dev stub\n');
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[AIVAD Server] Running on http://${HOST}:${PORT} (mode=${process.env.NODE_ENV || 'development'})`);
  });
}

createAppServer().catch((err) => {
  console.error('[AIVAD Server] Fatal boot error:', err);
  process.exit(1);
});
