import crypto from 'node:crypto';
import fs from 'node:fs';
import type {
  CountryMarketConfig,
  OrganizationRecord,
  PlatformRecord,
} from '../models/types';
import { SEED_ORGANIZATIONS } from '../data/seedData';

export interface ServerUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string | null;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}

export interface ServerSessionRecord {
  sessionId: string;
  userId: string;
  userName: string;
  email: string;
  role: string;
  organizationId: string | null;
  isDemoSession: boolean;
  authMethod: 'server_credentials' | 'demo_sandbox';
  issuedAt: string;
  expiresAt: number;
  revokedAt: string | null;
  revokedReason?: string;
}

export interface ZoneObservationRecord {
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

export interface PersistedCmsRevision {
  id: string;
  versionNumber: number;
  savedAt: string;
  savedBy: string;
  summary: string;
  snapshot: Record<string, unknown>;
}

export interface PersistedCmsBundle {
  published: Record<string, unknown> | null;
  draft: Record<string, unknown> | null;
  versionNumber: number;
  revisionHistory: PersistedCmsRevision[];
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PersistedCatalogBundle {
  countries: CountryMarketConfig[] | null;
  platforms: PlatformRecord[] | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: string;
  organizationId: string | null;
  action: string;
  target: string;
  outcome: 'ALLOWED' | 'DENIED' | 'REVOKED' | 'CONFLICT';
  detail: string;
}

export interface WorkspaceStateEnvelope {
  state: unknown;
  updatedAt: string;
  version: number;
  ownerUserId: string;
  organizationId: string | null;
}

export interface OfflineReplayLogEntry {
  id: string;
  idempotencyKey: string;
  userId: string;
  operationType: string;
  replayedAt: string;
}

export interface PersistedServerStore {
  users: ServerUserRecord[];
  sessions: Record<string, ServerSessionRecord>;
  organizations: OrganizationRecord[];
  workspaceStates: Record<string, WorkspaceStateEnvelope>;
  processedIdempotencyKeys: string[];
  offlineReplayLog: OfflineReplayLogEntry[];
  zoneObservations: ZoneObservationRecord[];
  globalCatalog: PersistedCatalogBundle;
  demoSandboxCatalog: PersistedCatalogBundle;
  globalCms: PersistedCmsBundle;
  demoSandboxCms: PersistedCmsBundle;
  securityAuditLogs: SecurityAuditEntry[];
}

export function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const computed = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

function createEmptyCmsBundle(): PersistedCmsBundle {
  return {
    published: null,
    draft: null,
    versionNumber: 1,
    revisionHistory: [],
    updatedAt: null,
    updatedBy: null,
  };
}

function createEmptyCatalogBundle(): PersistedCatalogBundle {
  return {
    countries: null,
    platforms: null,
    updatedAt: null,
    updatedBy: null,
  };
}

export function createDomainStoreRepository(storePath: string) {
  function loadStore(): PersistedServerStore {
    const fallback: PersistedServerStore = {
      users: [],
      sessions: {},
      organizations: SEED_ORGANIZATIONS.map((o) => ({ ...o })),
      workspaceStates: {},
      processedIdempotencyKeys: [],
      offlineReplayLog: [],
      zoneObservations: [],
      globalCatalog: createEmptyCatalogBundle(),
      demoSandboxCatalog: createEmptyCatalogBundle(),
      globalCms: createEmptyCmsBundle(),
      demoSandboxCms: createEmptyCmsBundle(),
      securityAuditLogs: [],
    };

    try {
      if (!fs.existsSync(storePath)) return fallback;
      const raw = fs.readFileSync(storePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedServerStore>;
      return {
        users: Array.isArray(parsed.users)
          ? parsed.users.map((u) => ({ ...u, organizationId: u.organizationId ?? null }))
          : [],
        sessions:
          parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
        organizations:
          Array.isArray(parsed.organizations) && parsed.organizations.length > 0
            ? parsed.organizations
            : SEED_ORGANIZATIONS.map((o) => ({ ...o })),
        workspaceStates:
          parsed.workspaceStates && typeof parsed.workspaceStates === 'object'
            ? parsed.workspaceStates
            : {},
        processedIdempotencyKeys: Array.isArray(parsed.processedIdempotencyKeys)
          ? parsed.processedIdempotencyKeys
          : [],
        offlineReplayLog: Array.isArray(parsed.offlineReplayLog)
          ? parsed.offlineReplayLog
          : [],
        zoneObservations: Array.isArray(parsed.zoneObservations)
          ? parsed.zoneObservations
          : [],
        globalCatalog:
          parsed.globalCatalog && typeof parsed.globalCatalog === 'object'
            ? { ...createEmptyCatalogBundle(), ...parsed.globalCatalog }
            : createEmptyCatalogBundle(),
        demoSandboxCatalog:
          parsed.demoSandboxCatalog && typeof parsed.demoSandboxCatalog === 'object'
            ? { ...createEmptyCatalogBundle(), ...parsed.demoSandboxCatalog }
            : createEmptyCatalogBundle(),
        globalCms:
          parsed.globalCms && typeof parsed.globalCms === 'object'
            ? { ...createEmptyCmsBundle(), ...parsed.globalCms }
            : createEmptyCmsBundle(),
        demoSandboxCms:
          parsed.demoSandboxCms && typeof parsed.demoSandboxCms === 'object'
            ? { ...createEmptyCmsBundle(), ...parsed.demoSandboxCms }
            : createEmptyCmsBundle(),
        securityAuditLogs: Array.isArray(parsed.securityAuditLogs)
          ? parsed.securityAuditLogs
          : [],
      };
    } catch {
      return fallback;
    }
  }

  function saveStore(store: PersistedServerStore): void {
    try {
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
    } catch {
      // Non-fatal in read-only filesystems
    }
  }

  function appendSecurityAudit(
    store: PersistedServerStore,
    entry: Omit<SecurityAuditEntry, 'id' | 'timestamp'>
  ): SecurityAuditEntry {
    const record: SecurityAuditEntry = {
      id: `sec-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    store.securityAuditLogs = [record, ...store.securityAuditLogs].slice(0, 250);
    return record;
  }

  return {
    storePath,
    loadStore,
    saveStore,
    appendSecurityAudit,
  };
}
