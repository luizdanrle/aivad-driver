import type {
  AiCoreInsight,
  AiPredictionRecord,
  AuthSession,
  PlatformDriverLifecycleState,
  PlatformId,
  SavedPlace,
  StrategyAdjustmentLogEntry,
  TachographStateStore,
  TripRecord,
  UserRole,
} from '../models/types';

/**
 * Contratos oficiais de backend e sincronização para futura migração
 * do ecossistema AIVAD em Windsurf / Cloud Run / Postgres / Firestore.
 * Nesta versão SPA Web, os adaptadores locais aplicam exatamente estes contratos.
 */

export interface AuthServiceContract {
  getCurrentSession(): Promise<AuthSession | null>;
  signInWithDemoRole(role: UserRole, userId?: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  verifyAdminPermission(session: AuthSession | null, resource: string): boolean;
}

export interface SyncServiceContract {
  pushOfflineTachographQueue(store: TachographStateStore): Promise<{ syncedCount: number; conflicts: number }>;
  syncTripLifecycle(trip: TripRecord): Promise<{ ok: boolean; syncedAt: string }>;
  syncSavedPlaces(driverId: string, places: SavedPlace[]): Promise<{ count: number; updatedAt: string }>;
  syncStrategyAdjustment(entry: StrategyAdjustmentLogEntry): Promise<{ idempotencyKey: string; accepted: boolean }>;
}

export interface PlatformBridgeContract {
  platformId: PlatformId;
  checkIntegrationState(): Promise<{
    state: PlatformDriverLifecycleState;
    officialApiAvailable: boolean;
    message: string;
  }>;
  requestDriverToggle(driverId: string, active: boolean): Promise<{ active: boolean }>;
}

export interface AiProxyContract {
  generateOperationalBriefing(driverId: string): Promise<AiCoreInsight[]>;
  recordPredictionForLearning(record: AiPredictionRecord): Promise<void>;
  reconcilePredictionWithActual(
    predictionId: string,
    actualNetEur: number,
    actualDurationMin: number
  ): Promise<AiPredictionRecord | null>;
}

export interface AndroidNativeOverlayBridge {
  isOverlayPermissionGranted(): Promise<boolean>;
  isNotificationListenerEnabled(): Promise<boolean>;
  updateFloatingCardConfig(serializedConfigJson: string): Promise<void>;
}

export interface OfflineIndexedDbAdapterSpec {
  dbName: 'aivad_offline_cache_v3';
  stores: Array<'trips' | 'tachograph_queue' | 'places' | 'ai_predictions'>;
  idempotencyHeader: 'X-AIVAD-Idempotency-Key';
}
