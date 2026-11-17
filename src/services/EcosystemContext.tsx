import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyCaptureManualCorrection,
  computeFinancialSummary,
  evaluateAutoPilot,
  isCompletedTripStatus,
  normalizeCanonicalStrategyMode,
  parseAndNormalizeCaptureInput,
  reconcileCapturedEvent,
  round2,
} from '../core/intelligence';
import {
  analyzeProposalWithAiCore,
  evaluateSemiAutoAdjustment,
  reconcilePredictionOutcome,
  runAiCoreBriefing,
  type ProposalAiDecisionPackage,
} from '../core/aiCore';
import {
  createDefaultClassificationProfiles,
  resolveFloatingTierConfig,
} from '../core/floatingCard';
import {
  INITIAL_BOLT_CONNECTOR,
  INITIAL_UBER_CONNECTOR,
  registerConnectorFailure,
  runConnectorVerificationSuite,
  syncConnectorWithServerEnv,
  type ConnectorTestResult,
  type PlatformConnectorState,
} from '../core/connectors';
import {
  computeNextReviewDate,
  evaluateValidationFreshness,
  getDriverOperationalPlatformsForLocation,
  getPlatformOperationInLocation,
  getValidatedPlatformsForLocation,
  isPlatformOperationalInLocation,
  normalizeFloatingCardPosition,
  sanitizePlatformIdList,
  sanitizePlatformList,
  upsertPlatformCountryOperation,
} from '../core/marketCatalog';
import {
  applyStepConfirmationToProgress,
  confirmAssistantStepByUser,
  createInitialAssistantProgress,
  evaluateAssistantStepVerification,
  INTERACTIVE_ASSISTANTS,
  pauseAssistantProgress,
  resumeAssistantProgress,
  skipOptionalAssistantStep,
  type AssistantEvaluationContext,
  type AssistantProgressRecord,
  type AssistantStepStatus,
} from '../core/interactiveAssistants';
import {
  appendIdempotentLifecycleEvent,
  buildCancelledTripFromActiveSession,
  createLifecycleAuditEvent,
  hasExistingLifecycleTrip,
  markTripArrivedAtPickup,
  startActiveTripFromProposal,
  startTripInProgress,
  startTripPassengerWait,
} from '../core/lifecycle';
import {
  confirmLocalMarketAdaptation,
  detectFallbackLocation,
  evaluateCountryChange,
  isSupportedLanguageCode,
  resolveLocationFromCoordinates,
} from '../core/localization';
import { createDefaultCostsCalculatorConfig } from '../core/costsCalculator';
import { canAccessMode, isAdminRole } from '../core/rbac';
import { buildComprehensiveReports, type ComprehensiveReportsBundle } from '../core/reports';
import {
  buildTachographQrPayload,
  computeLiveTachographClocks,
  consolidateMultiPlatformJornada,
  correctTachographRecord,
  enqueueOfflineTachographAction,
  evaluateRolling24hCompliance,
  startTachographShift,
  syncTachographOfflineQueue,
  transitionTachographState,
  type ConsolidatedTachographSummary,
  type Rolling24hComplianceResult,
} from '../core/tachograph';
import {
  DEFAULT_VOICE_COPILOT_CONFIG,
  buildLifecycleVoiceAnnouncement,
  buildOperationalAlertVoiceAnnouncement,
  buildProposalVoiceAnnouncement,
  enqueueVoiceAnnouncement,
  speakWithWebSpeech,
  type VoiceAnnouncementItem,
  type VoiceCopilotConfig,
} from '../core/voiceCopilot';
import { createDriverZoneObservation, createZoneRelocationLog } from '../core/zones';
import {
  DEFAULT_PERSISTED_VEHICLE_FILTERS,
  SEED_AI_PREDICTIONS,
  SEED_AUDIT_LOGS,
  SEED_AUTH_SESSION,
  SEED_AUTOPILOT,
  SEED_CAMPAIGNS,
  SEED_CAPTURES,
  SEED_CMS,
  SEED_COUNTRIES,
  SEED_DASHCAM,
  SEED_DOCUMENTS,
  SEED_EVENTS,
  SEED_EXPENSES,
  SEED_FINANCIAL_COST_CONFIG,
  SEED_FLOATING_DOCK_CONFIG,
  SEED_LIFECYCLE_AUDIT_EVENTS,
  SEED_LOCALIZATION,
  SEED_NOTIFICATIONS,
  SEED_OBLIGATIONS,
  SEED_ORGANIZATIONS,
  SEED_OVERLAY_CONFIG,
  SEED_PAYMENTS,
  SEED_PLANS,
  SEED_PLATFORMS,
  SEED_PROPOSALS,
  SEED_REFERRAL_COUPONS,
  SEED_REMOTE_CONFIG,
  SEED_REVIEWS,
  SEED_ROUTINE_PREFS,
  SEED_SAVED_PLACES,
  SEED_SHIFTS,
  SEED_SUBSCRIPTIONS,
  SEED_SUGGESTIONS,
  SEED_TACHOGRAPH,
  SEED_TICKETS,
  SEED_TRIPS,
  SEED_USERS,
  SEED_VEHICLES,
  SEED_VERSIONS,
  SEED_ZONE_OBSERVATIONS,
  SEED_ZONE_RELOCATIONS,
  SEED_ZONES,
} from '../data/seedData';
import type {
  ActiveTripSession,
  AdminRole,
  AiCoreInsight,
  AiPredictionRecord,
  AndroidOverlayConfig,
  AppVersionRecord,
  ArrivalDetectionMethod,
  AuditLogRecord,
  AuthSession,
  AutoPilotConfig,
  CampaignRecord,
  CancellationBy,
  CaptureSource,
  CmsContentState,
  ComplianceObligation,
  CostsCalculatorConfig,
  CountryMarketConfig,
  DashcamClip,
  DataScopeFilter,
  DateRangePreset,
  DriverDocument,
  DriverRoutinePreferences,
  DriverZoneObservation,
  EcosystemEvent,
  EcosystemMode,
  ExpenseRecord,
  FeatureSuggestion,
  FinancialCostConfig,
  FloatingCardTierStyleConfig,
  FloatingDockConfig,
  LocalizationProfile,
  MapZoneRecord,
  MarketStatus,
  NotificationRecord,
  OrganizationRecord,
  PassengerReviewRecord,
  PaymentTransactionRecord,
  PlanRecord,
  PlatformDriverLifecycleState,
  PlatformId,
  PlatformRecord,
  PlatformStatus,
  ProposalClassification,
  ProposalInput,
  ProposalLifecycleState,
  ProposalRecord,
  RemoteConfigState,
  SavedPlace,
  ShiftRecord,
  SmartCaptureRecord,
  StrategyMode,
  SubscriptionRecord,
  SyncStatusState,
  TachographActivityRecord,
  TachographOfflineQueueItem,
  TachographState,
  TachographStateStore,
  ThemeMode,
  TicketRecord,
  TripFareAdjustmentRecord,
  TripPostAcceptanceActual,
  TripRecord,
  TripStatus,
  UserAccount,
  UserRole,
  VehicleRecord,
} from '../models/types';

export interface EcosystemState {
  mode: EcosystemMode;
  theme: ThemeMode;
  session: AuthSession;
  rbacDeniedMessage: string | null;
  activeDriverNav: string;
  activeAdminNav: string;
  activePortalPage: string;
  activeDriverUserId: string;
  activeAdminRole: AdminRole;
  driverDeactivatedPlatformIds: PlatformId[];
  platforms: PlatformRecord[];
  vehicles: VehicleRecord[];
  trips: TripRecord[];
  proposals: ProposalRecord[];
  campaigns: CampaignRecord[];
  expenses: ExpenseRecord[];
  shifts: ShiftRecord[];
  tachograph: TachographStateStore;
  localization: LocalizationProfile;
  captures: SmartCaptureRecord[];
  obligations: ComplianceObligation[];
  documents: DriverDocument[];
  zones: MapZoneRecord[];
  savedPlaces: SavedPlace[];
  routinePreferences: DriverRoutinePreferences;
  aiPredictions: AiPredictionRecord[];
  plans: PlanRecord[];
  users: UserAccount[];
  organizations: OrganizationRecord[];
  subscriptions: SubscriptionRecord[];
  payments: PaymentTransactionRecord[];
  tickets: TicketRecord[];
  notifications: NotificationRecord[];
  versions: AppVersionRecord[];
  countries: CountryMarketConfig[];
  cms: CmsContentState;
  autoPilot: AutoPilotConfig;
  overlayConfig: AndroidOverlayConfig;
  reviews: PassengerReviewRecord[];
  dashcamClips: DashcamClip[];
  suggestions: FeatureSuggestion[];
  events: EcosystemEvent[];
  auditLogs: AuditLogRecord[];
  remoteConfig: RemoteConfigState;
  // Comando 5 extensions
  syncStatus: SyncStatusState;
  lastSyncedAt: string | null;
  activeTrip: ActiveTripSession | null;
  zoneObservations: DriverZoneObservation[];
  financialCostConfig: FinancialCostConfig;
  costsCalculator: CostsCalculatorConfig;
    reportFilters: {
      preset: DateRangePreset;
      customStart: string;
      customEnd: string;
      dataScope: DataScopeFilter;
      platformId: string;
      vehicleId: string;
      zone: string;
      category: string;
      tripStatusFilter: string;
    };
    // Comando 6 extensions
    voiceConfig: VoiceCopilotConfig;
    voiceHistory: VoiceAnnouncementItem[];
    latestVisualVoiceBanner: VoiceAnnouncementItem | null;
    connectors: {
      uber: PlatformConnectorState;
      bolt: PlatformConnectorState;
    };
    lifecycleAuditEvents: import('../models/types').LifecycleAuditEvent[];
    zoneRelocationLogs: import('../models/types').ZoneRelocationLog[];
    referralCoupons: import('../models/types').ReferralCouponRecord[];
    vehicleCatalogFilters: import('../models/types').PersistedVehicleCatalogFilters;
    floatingCardQuickHidden: boolean;
    floatingDockConfig: FloatingDockConfig;
    activeAssistantId: string | null;
    assistantHubOpen: boolean;
    assistantProgress: Record<string, AssistantProgressRecord>;
    floatingPreviewOpened: boolean;
    floatingConfigSavedCount: number;
    voiceTestCount: number;
    autoPilotSavedCount: number;
    adminRevalidationCount: number;
    portalSimulatorTested: boolean;
    portalComparisonViewed: boolean;
    cmsPersistenceInfo: {
      lastServerScope: 'global_published' | 'demo_sandbox_isolated' | 'local_only';
      lastUpdatedAt: string | null;
    };
    serverSyncVersion: number;
    syncConflictDetail: string | null;
  }

const STORAGE_KEY_DEMO = 'aivad_ecosystem_demo_v2';
const STORAGE_KEY_REAL = 'aivad_ecosystem_real_v2';
const UI_LANGUAGE_STORAGE_KEY = 'aivad_ui_lang_v1';

function loadPersistedUiLanguage(): string | null {
  try {
    const raw = localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
    if (raw && isSupportedLanguageCode(raw)) return raw;
  } catch {
    // ignore
  }
  return null;
}

const EMPTY_TACHOGRAPH: TachographStateStore = {
  sessions: [],
  activities: [],
  platformIntervals: [],
  offlineQueue: [],
  discrepancies: [],
  activeSessionId: null,
};

function buildInitialState(workspaceKind: 'demo' | 'real' = 'demo'): EcosystemState {
  const isReal = workspaceKind === 'real';
  const persistedLang = loadPersistedUiLanguage();
  const seedActiveVeh = SEED_VEHICLES.find((v) => v.isActiveDriverVehicle) ?? SEED_VEHICLES[0];
  return {
    mode: 'portal',
    theme: 'light',
    session: SEED_AUTH_SESSION,
    rbacDeniedMessage: null,
    activeDriverNav: 'dashboard',
    activeAdminNav: 'overview',
    activePortalPage: 'inicio',
    activeDriverUserId: 'usr-driver-1',
    activeAdminRole: 'Superadministrador',
    driverDeactivatedPlatformIds: [],
    platforms: sanitizePlatformList(SEED_PLATFORMS),
    vehicles: SEED_VEHICLES,
    trips: isReal ? [] : SEED_TRIPS,
    proposals: isReal ? [] : SEED_PROPOSALS,
    campaigns: isReal ? [] : SEED_CAMPAIGNS,
    expenses: isReal ? [] : SEED_EXPENSES,
    shifts: isReal ? [] : SEED_SHIFTS,
    tachograph: isReal ? EMPTY_TACHOGRAPH : SEED_TACHOGRAPH,
    localization: persistedLang
      ? { ...SEED_LOCALIZATION, languageCode: persistedLang }
      : SEED_LOCALIZATION,
    captures: isReal ? [] : SEED_CAPTURES,
    obligations: SEED_OBLIGATIONS,
    documents: isReal ? [] : SEED_DOCUMENTS,
    zones: SEED_ZONES,
    savedPlaces: isReal ? [] : SEED_SAVED_PLACES,
    routinePreferences: SEED_ROUTINE_PREFS,
    aiPredictions: isReal ? [] : SEED_AI_PREDICTIONS,
    plans: SEED_PLANS,
    users: SEED_USERS,
    organizations: SEED_ORGANIZATIONS,
    subscriptions: SEED_SUBSCRIPTIONS,
    payments: isReal ? [] : SEED_PAYMENTS,
    tickets: isReal ? [] : SEED_TICKETS,
    notifications: isReal ? [] : SEED_NOTIFICATIONS,
    versions: SEED_VERSIONS,
    countries: SEED_COUNTRIES,
    cms: SEED_CMS,
    autoPilot: SEED_AUTOPILOT,
    overlayConfig: SEED_OVERLAY_CONFIG,
    reviews: isReal ? [] : SEED_REVIEWS,
    dashcamClips: isReal ? [] : SEED_DASHCAM,
    suggestions: SEED_SUGGESTIONS,
    events: isReal ? [] : SEED_EVENTS,
    auditLogs: isReal ? [] : SEED_AUDIT_LOGS,
    remoteConfig: SEED_REMOTE_CONFIG,
    syncStatus: 'local',
    lastSyncedAt: null,
    activeTrip: null,
    zoneObservations: SEED_ZONE_OBSERVATIONS,
    financialCostConfig: SEED_FINANCIAL_COST_CONFIG,
    costsCalculator: createDefaultCostsCalculatorConfig(seedActiveVeh),
    reportFilters: {
      preset: 'ultimos_7_dias',
      customStart: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
      customEnd: new Date().toISOString().slice(0, 10),
      dataScope: isReal ? 'real' : 'all',
      platformId: 'ALL',
      vehicleId: 'ALL',
      zone: 'ALL',
      category: 'ALL',
      tripStatusFilter: 'ALL',
    },
    voiceConfig: DEFAULT_VOICE_COPILOT_CONFIG,
    voiceHistory: [],
    latestVisualVoiceBanner: null,
    connectors: {
      uber: {
        ...INITIAL_UBER_CONNECTOR,
        dataOriginTag: isReal ? 'Dados importados' : 'Dados simulados',
      },
      bolt: {
        ...INITIAL_BOLT_CONNECTOR,
        dataOriginTag: isReal ? 'Dados importados' : 'Dados simulados',
      },
    },
    lifecycleAuditEvents: isReal ? [] : SEED_LIFECYCLE_AUDIT_EVENTS,
    zoneRelocationLogs: isReal ? [] : SEED_ZONE_RELOCATIONS,
    referralCoupons: SEED_REFERRAL_COUPONS,
    vehicleCatalogFilters: { ...DEFAULT_PERSISTED_VEHICLE_FILTERS },
    floatingCardQuickHidden: false,
    floatingDockConfig: SEED_FLOATING_DOCK_CONFIG,
    activeAssistantId: null,
    assistantHubOpen: false,
    assistantProgress: {},
    floatingPreviewOpened: false,
    floatingConfigSavedCount: 0,
    voiceTestCount: 0,
    autoPilotSavedCount: 0,
    adminRevalidationCount: 0,
    portalSimulatorTested: false,
    portalComparisonViewed: false,
    cmsPersistenceInfo: {
      lastServerScope: 'local_only',
      lastUpdatedAt: null,
    },
    serverSyncVersion: 0,
    syncConflictDetail: null,
  };
}

function hydrateState(parsed: Partial<EcosystemState>, workspaceKind: 'demo' | 'real'): EcosystemState {
  const initial = buildInitialState(workspaceKind);
  const migratedCountries = (
    parsed.countries && parsed.countries.length > 0 && 'marketStatus' in parsed.countries[0]
      ? parsed.countries
      : initial.countries
  ).map((c) => ({
    ...c,
    activePlatforms: sanitizePlatformIdList(c.activePlatforms ?? []),
  }));
  const canonicalMode = normalizeCanonicalStrategyMode(parsed.autoPilot?.mode, parsed.autoPilot?.strategyMode);
  const hydratedPlatforms = sanitizePlatformList(
    parsed.platforms && parsed.platforms.length > 0 && parsed.platforms[0]?.countryOperations
      ? parsed.platforms
      : initial.platforms
  );
  const currentLoc = parsed.localization?.currentLocation ? parsed.localization : initial.localization;
  const operationalInLocIds = new Set(
    getValidatedPlatformsForLocation(
      hydratedPlatforms,
      currentLoc.selectedMarketCode,
      currentLoc.currentLocation.region,
      currentLoc.currentLocation.city
    )
  );
  const sanitizedDeactivated = sanitizePlatformIdList(parsed.driverDeactivatedPlatformIds ?? []).filter((id) =>
    operationalInLocIds.has(id)
  );
  const mergedAutoPilot: AutoPilotConfig = {
    ...initial.autoPilot,
    ...(parsed.autoPilot ?? {}),
    mode: canonicalMode,
    strategyMode: canonicalMode,
    thresholds: {
      ...initial.autoPilot.thresholds,
      ...(parsed.autoPilot?.thresholds ?? {}),
      allowedPlatforms: sanitizePlatformIdList(
        parsed.autoPilot?.thresholds?.allowedPlatforms ?? initial.autoPilot.thresholds.allowedPlatforms
      ),
    },
    modeConfigs: parsed.autoPilot?.modeConfigs ?? initial.autoPilot.modeConfigs,
    semiAutoBounds: parsed.autoPilot?.semiAutoBounds ?? initial.autoPilot.semiAutoBounds,
    savedPresets: parsed.autoPilot?.savedPresets ?? initial.autoPilot.savedPresets,
    adjustmentLogs: parsed.autoPilot?.adjustmentLogs ?? initial.autoPilot.adjustmentLogs,
  };
  const mergedCms: CmsContentState = {
    ...initial.cms,
    ...(parsed.cms ?? {}),
    sectionOrder: parsed.cms?.sectionOrder ?? initial.cms.sectionOrder,
    visibleSections: parsed.cms?.visibleSections ?? initial.cms.visibleSections,
    benefits: parsed.cms?.benefits ?? initial.cms.benefits,
    faqs: parsed.cms?.faqs ?? initial.cms.faqs,
    navigationMenus: parsed.cms?.navigationMenus ?? initial.cms.navigationMenus,
    pagesContent: parsed.cms?.pagesContent ?? initial.cms.pagesContent,
    mediaAssets: parsed.cms?.mediaAssets ?? initial.cms.mediaAssets,
    supportedLanguages: parsed.cms?.supportedLanguages ?? initial.cms.supportedLanguages,
    localizedContent: parsed.cms?.localizedContent ?? initial.cms.localizedContent,
  };
  return {
    ...initial,
    ...parsed,
    // Segurança PARTE V: localStorage NUNCA é usado como mecanismo de autenticação ou autorização
    session: SEED_AUTH_SESSION,
    platforms: hydratedPlatforms,
    rbacDeniedMessage: null,
    driverDeactivatedPlatformIds: sanitizedDeactivated,
    savedPlaces: parsed.savedPlaces ?? initial.savedPlaces,
    routinePreferences: parsed.routinePreferences ?? initial.routinePreferences,
    aiPredictions: parsed.aiPredictions ?? initial.aiPredictions,
    autoPilot: mergedAutoPilot,
    cms: mergedCms,
    overlayConfig: (() => {
      const defaults = createDefaultClassificationProfiles();
      const rawOv = parsed.overlayConfig;
      const hydratedProfiles = {
        verde: {
          ...defaults.verde,
          ...(rawOv?.classificationProfiles?.verde ?? {}),
          tierKey: 'verde' as const,
          operationalMeaning: 'Favorável' as const,
          visibleMetrics: Array.isArray(rawOv?.classificationProfiles?.verde?.visibleMetrics)
            ? [...rawOv!.classificationProfiles!.verde!.visibleMetrics]
            : [...defaults.verde.visibleMetrics],
        },
        amarelo: {
          ...defaults.amarelo,
          ...(rawOv?.classificationProfiles?.amarelo ?? {}),
          tierKey: 'amarelo' as const,
          operationalMeaning: 'Atenção' as const,
          visibleMetrics: Array.isArray(rawOv?.classificationProfiles?.amarelo?.visibleMetrics)
            ? [...rawOv!.classificationProfiles!.amarelo!.visibleMetrics]
            : [...defaults.amarelo.visibleMetrics],
        },
        vermelho: {
          ...defaults.vermelho,
          ...(rawOv?.classificationProfiles?.vermelho ?? {}),
          tierKey: 'vermelho' as const,
          operationalMeaning: 'Evitar' as const,
          visibleMetrics: Array.isArray(rawOv?.classificationProfiles?.vermelho?.visibleMetrics)
            ? [...rawOv!.classificationProfiles!.vermelho!.visibleMetrics]
            : [...defaults.vermelho.visibleMetrics],
        },
      };
      return {
        ...initial.overlayConfig,
        ...(rawOv ?? {}),
        position: normalizeFloatingCardPosition(rawOv?.position ?? initial.overlayConfig.position),
        classificationProfiles: hydratedProfiles,
      };
    })(),
    floatingDockConfig: {
      ...initial.floatingDockConfig,
      ...(parsed.floatingDockConfig ?? {}),
    },
    activeAssistantId: null,
    assistantHubOpen: false,
    assistantProgress: parsed.assistantProgress ?? {},
    countries: migratedCountries,
    tachograph: parsed.tachograph?.sessions ? parsed.tachograph : initial.tachograph,
    localization: (() => {
      const persistedLang = loadPersistedUiLanguage();
      return persistedLang && isSupportedLanguageCode(persistedLang)
        ? { ...currentLoc, languageCode: persistedLang }
        : currentLoc;
    })(),
    payments: parsed.payments ?? initial.payments,
    zoneObservations: parsed.zoneObservations ?? initial.zoneObservations,
    financialCostConfig: {
      ...initial.financialCostConfig,
      ...(parsed.financialCostConfig ?? {}),
    },
    costsCalculator: {
      ...initial.costsCalculator,
      ...(parsed.costsCalculator ?? {}),
      operatorCosts: Array.isArray(parsed.costsCalculator?.operatorCosts)
        ? parsed.costsCalculator!.operatorCosts
        : initial.costsCalculator.operatorCosts,
    },
    reportFilters: {
      ...initial.reportFilters,
      ...(parsed.reportFilters ?? {}),
    },
    voiceConfig: {
      ...initial.voiceConfig,
      ...(parsed.voiceConfig ?? {}),
      categories: {
        ...initial.voiceConfig.categories,
        ...(parsed.voiceConfig?.categories ?? {}),
      },
    },
    voiceHistory: parsed.voiceHistory ?? initial.voiceHistory,
    latestVisualVoiceBanner: null,
    connectors: {
      uber: { ...initial.connectors.uber, ...(parsed.connectors?.uber ?? {}) },
      bolt: { ...initial.connectors.bolt, ...(parsed.connectors?.bolt ?? {}) },
    },
    lifecycleAuditEvents: parsed.lifecycleAuditEvents ?? initial.lifecycleAuditEvents,
    zoneRelocationLogs: parsed.zoneRelocationLogs ?? initial.zoneRelocationLogs,
    referralCoupons: parsed.referralCoupons ?? initial.referralCoupons,
    vehicleCatalogFilters: {
      ...initial.vehicleCatalogFilters,
      ...(parsed.vehicleCatalogFilters ?? {}),
    },
    floatingCardQuickHidden: Boolean(parsed.floatingCardQuickHidden),
    cmsPersistenceInfo: parsed.cmsPersistenceInfo ?? initial.cmsPersistenceInfo,
  };
}

function loadInitialUnauthenticatedState(): EcosystemState {
  // Always boot unauthenticated on Portal unless server /api/auth/session restores an explicit session
  const base = buildInitialState('demo');
  try {
    const rawDemo = localStorage.getItem(STORAGE_KEY_DEMO);
    if (rawDemo) {
      const parsed = JSON.parse(rawDemo) as Partial<EcosystemState>;
      const hydrated = hydrateState(parsed, 'demo');
      return {
        ...hydrated,
        mode: 'portal',
        session: SEED_AUTH_SESSION,
      };
    }
  } catch {
    // ignore
  }
  return base;
}

interface EcosystemContextValue {
  state: EcosystemState;
  activeDriver: UserAccount;
  activeDriverPlan: PlanRecord;
  activeVehicle: VehicleRecord;
  activeMarket: CountryMarketConfig;
  availableMarketsForPortal: CountryMarketConfig[];
  visibleDriverPlatforms: PlatformRecord[];
  activeDriverTrips: TripRecord[];
  financialSummary: ReturnType<typeof computeFinancialSummary>;
  comprehensiveReports: ComprehensiveReportsBundle;
  tachographSummary: ConsolidatedTachographSummary;
  rolling24hCompliance: Rolling24hComplianceResult;
  aiCoreBriefing: AiCoreInsight[];
  driverPredictions: AiPredictionRecord[];
  // Auth & RBAC (Real Server Auth + Explicit Demo Sandbox)
  setMode: (mode: EcosystemMode) => boolean;
  loginWithServerCredentials: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerRealAccount: (
    name: string,
    email: string,
    password: string,
    role?: 'Motorista' | 'Operador'
  ) => Promise<{ ok: boolean; error?: string }>;
  enterDemoSandbox: (profile: 'driver' | 'admin') => Promise<{ ok: boolean; error?: string }>;
  loginAsRole: (role: UserRole, userId?: string) => void;
  logoutSession: () => void;
  revokeCurrentServerSession: () => Promise<{ ok: boolean; revokedCount: number }>;
  clearRbacDenied: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setDriverNav: (nav: string) => void;
  setAdminNav: (nav: string) => void;
  setPortalPage: (page: string) => void;
  setAdminRole: (role: AdminRole) => void;
  resetDemoData: () => void;
  syncNowToServer: (options?: { forceOverwrite?: boolean }) => Promise<{ ok: boolean; message: string; conflictDetected?: boolean }>;
  // Reports & Cost Config
  updateFinancialCostConfig: (patch: Partial<FinancialCostConfig>) => void;
  updateCostsCalculator: (patch: Partial<CostsCalculatorConfig>) => void;
  resetCostsCalculator: () => void;
  updateReportFilters: (patch: Partial<EcosystemState['reportFilters']>) => void;
  // Active Trip Lifecycle & Timers
  acceptProposalForTrip: (proposal: ProposalRecord, aiRec: ActiveTripSession['aiRecommendation']) => { ok: boolean; error?: string };
  confirmActiveTripPlatform: () => void;
  markActiveTripArrived: (method: ArrivalDetectionMethod, startWaitImmediately?: boolean) => void;
  startActiveTripWait: () => void;
  startActiveTripInProgress: () => void;
  recordActiveTripNavigation: (patch: {
    navigationAppUsed?: 'Waze' | 'Google Maps' | 'Outro' | 'Nenhum';
    navigationStartedAtIso?: string;
    navigationTrafficEstTotalMin?: number | null;
    observedPickupKm?: number | null;
    observedPickupMin?: number | null;
    observedTripKm?: number | null;
    observedTripMin?: number | null;
  }) => void;
  completeActiveTripAction: (
    actualGrossEur?: number,
    tipEur?: number,
    tollsEur?: number,
    options?: {
      pendingAdjustmentEur?: number;
      pendingAdjustmentReason?: string;
      confirmedAdjustmentEur?: number;
      confirmedAdjustmentReason?: string;
    }
  ) => TripRecord | null;
  cancelActiveTripAction: (
    cancellationBy: CancellationBy,
    isNoShow: boolean,
    reason: string,
    compensationEur: number
  ) => TripRecord | null;
  // Localization & Geolocation Services
  requestBrowserGeolocation: () => void;
  simulateOrSelectLocation: (countryCode: string, city: string, region?: string) => void;
  confirmLocalMarket: (countryCode?: string) => void;
  dismissCountryChangePrompt: () => void;
  setProfessionalMarkets: (residenceCode: string, primaryMarketCode: string, additionalCodes: string[]) => void;
  setLanguageCode: (languageCode: string) => void;
  // Tachograph TVDE Services
  startTachograph: (odometerStartKm: number, operatorName?: string, notes?: string) => { ok: boolean; error?: string };
  transitionTachograph: (
    targetState: TachographState,
    odometerKm: number,
    options?: { platformId?: PlatformId; movementKind?: TachographActivityRecord['movementKind']; notes?: string }
  ) => { ok: boolean; error?: string };
  correctTachographActivity: (
    activityId: string,
    patch: { state?: TachographState; durationMinutes?: number; odometerStartKm?: number; odometerEndKm?: number; notes?: string },
    reason: string
  ) => { ok: boolean; error?: string };
  enqueueOfflineTachograph: (item: Omit<TachographOfflineQueueItem, 'id' | 'syncState' | 'createdAtIso'>) => void;
  syncOfflineTachograph: () => { syncedCount: number; duplicatesSkipped: number; conflictsResolved: number };
  publishTachographAuditSnapshot: (sessionId?: string) => Promise<{ ok: boolean; verificationPath?: string }>;
  // Proposal, Strategy & AI CORE Services
  createAndAnalyzeProposal: (
    input: ProposalInput,
    source?: ProposalRecord['source'],
    options?: { isSimulatedSandbox?: boolean }
  ) => { record: ProposalRecord; aiPackage: ProposalAiDecisionPackage };
  updateProposalLifecycle: (proposalId: string, nextState: ProposalLifecycleState) => void;
  updateAutoPilotConfig: (patch: Partial<AutoPilotConfig>) => void;
  setStrategyMode: (mode: StrategyMode) => void;
  saveStrategyPreset: (name: string) => void;
  applyStrategyPreset: (presetId: string) => void;
  deleteStrategyPreset: (presetId: string) => void;
  runSemiAutoCalibration: () => { applied: boolean; rationale: string };
  undoStrategyAdjustment: (adjustmentId: string) => void;
  updateOverlayConfig: (patch: Partial<AndroidOverlayConfig>, options?: { markSaved?: boolean }) => void;
  updateFloatingTierConfig: (
    tier: ProposalClassification,
    patch: Partial<FloatingCardTierStyleConfig>,
    options?: { markSaved?: boolean }
  ) => void;
  resetFloatingTierConfigs: () => void;
  updateFloatingDockConfig: (patch: Partial<FloatingDockConfig>) => void;
  // Trip & Finance Services
  completeTrip: (trip: Omit<TripRecord, 'id' | 'netEur' | 'commissionEur' | 'operationalCostEur'>) => TripRecord;
  updateTripStatus: (
    tripId: string,
    status: TripStatus,
    extra?: { cancellationBy?: CancellationBy; cancellationReason?: string }
  ) => void;
  updateTripPostAcceptanceActual: (tripId: string, actualPatch: Partial<TripPostAcceptanceActual>) => void;
  addTripFareAdjustment: (
    tripId: string,
    adj: {
      amountEur: number;
      reason: string;
      status: TripFareAdjustmentRecord['status'];
      evidenceNote?: string;
    }
  ) => void;
  resolveTripFareAdjustmentStatus: (
    tripId: string,
    adjustmentId: string,
    status: TripFareAdjustmentRecord['status']
  ) => void;
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'isDemo'>) => void;
  // Platform Driver Lifecycle
  toggleDriverPlatformActivation: (platformId: PlatformId) => void;
  getPlatformLifecycleState: (platformId: PlatformId) => PlatformDriverLifecycleState;
  // Smart Data Capture Service
  captureExternalEvent: (payload: {
    externalTxId: string;
    source: CaptureSource;
    dataType: SmartCaptureRecord['dataType'];
    platformId: PlatformId;
    amountEur: number;
    relatedTripRef?: string;
    rawSummary: string;
  }) => { message: string; isDuplicate: boolean; status: SmartCaptureRecord['status'] };
  confirmPendingCapture: (captureId: string, targetTripId: string) => void;
  // Shift & Planner Service
  addShift: (shift: Omit<ShiftRecord, 'id' | 'auditHistory' | 'isDemo'>) => void;
  updateShiftNotes: (shiftId: string, notes: string) => void;
  // Saved Places & Routine Preferences
  addSavedPlace: (place: Omit<SavedPlace, 'id'>) => void;
  updateSavedPlace: (id: string, patch: Partial<SavedPlace>) => void;
  deleteSavedPlace: (id: string) => void;
  togglePlaceFavorite: (id: string) => void;
  updateRoutinePreferences: (patch: Partial<DriverRoutinePreferences>) => void;
  // Campaign Service
  addCampaign: (campaign: Omit<CampaignRecord, 'id' | 'isDemo'>) => void;
  // Vehicle Service
  addVehicle: (vehicle: Omit<VehicleRecord, 'id' | 'isDemo'>) => void;
  updateVehicle: (vehicleId: string, patch: Partial<VehicleRecord>) => void;
  setActiveVehicle: (vehicleId: string) => void;
  // Field & Compliance Services + Zone Intelligence
  toggleZonePreference: (zoneId: string, pref: MapZoneRecord['preference']) => void;
  addZoneObservation: (input: {
    zoneId?: string;
    zoneName: string;
    city: string;
    observationType: DriverZoneObservation['observationType'];
    description: string;
    privacyConsent: boolean;
    dayOfWeek?: number;
    timeWindow?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  addPassengerReview: (review: Omit<PassengerReviewRecord, 'id' | 'createdAt' | 'sentViaOfficialApi' | 'isDemo'>) => void;
  incrementReviewCopy: (reviewId: string) => void;
  toggleDashcamProtection: (clipId: string) => void;
  addDashcamCapture: (tripId?: string) => void;
  addDocument: (doc: Omit<DriverDocument, 'id' | 'isDemo'>) => void;
  markNotificationRead: (id: string) => void;
  addSuggestion: (s: Omit<FeatureSuggestion, 'id' | 'votes' | 'status' | 'createdAt'>) => void;
  voteSuggestion: (id: string) => void;
  // Support Service (Shared Driver <-> Admin)
  createTicket: (ticket: { subject: string; category: TicketRecord['category']; priority: TicketRecord['priority']; message: string }) => void;
  replyToTicket: (ticketId: string, sender: 'Motorista' | 'Suporte', text: string, internalNote?: boolean) => void;
  updateTicketStatus: (ticketId: string, status: TicketRecord['status'], assignee?: string) => void;
  // Admin Platform, Countries, Organizations, Payments, Subscription, Compliance, CMS & Config Services
  updatePlatformStatus: (platformId: PlatformId, status: PlatformStatus) => void;
  addPlatform: (platform: Omit<PlatformRecord, 'isDemo'>) => void;
  updatePlatformCountryOperation: (
    platformId: PlatformId,
    countryCode: string,
    patch: {
      operationalStatus: import('../models/types').PlatformCountryOperationalStatus;
      preselectForDrivers?: boolean;
      regions?: string[];
      cities?: string[];
      licensingNote?: string;
      validationSource: string;
      changeNote?: string;
    }
  ) => void;
  revalidatePlatformCountryOperation: (platformId: PlatformId, countryCode: string, validationSource?: string) => void;
  revalidateCountryMarket: (countryCode: string, validationSource?: string) => void;
  addCountryMarket: (country: CountryMarketConfig) => void;
  updateCountryMarketStatus: (countryCode: string, status: MarketStatus) => void;
  addRegionOrCityToCountry: (countryCode: string, regionName: string, cityName: string) => void;
  createOrganization: (input: {
    name: string;
    type: import('../models/types').OrganizationType;
    countryCode: string;
    taxId: string;
    driversCount?: number;
    vehiclesCount?: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  assignUserOrganization: (userId: string, organizationId: string | null) => void;
  addPaymentTransaction: (payment: Omit<PaymentTransactionRecord, 'id' | 'createdAt'>) => void;
  validateLegislation: (obligationId: string, newStatus: ComplianceObligation['status']) => void;
  addLegislation: (obligation: Omit<ComplianceObligation, 'id' | 'isDemo'>) => void;
  updateUserStatus: (userId: string, status: UserAccount['status']) => void;
  changeUserSubscriptionPlan: (userId: string, planId: string) => void;
  saveCmsDraft: (patch: Partial<Omit<CmsContentState, 'revisionHistory' | 'draftSnapshot'>>) => void;
  discardCmsDraft: () => void;
  updateCmsAndPublish: (patch: Partial<CmsContentState>, summary: string) => void;
  rollbackCms: (revisionId: string) => void;
  addVersionRelease: (version: Omit<AppVersionRecord, 'id'>) => void;
  broadcastNotification: (title: string, body: string, targetUserId: string | 'ALL', category: NotificationRecord['category']) => void;
  toggleRemoteFlag: (flag: string) => void;
  updateDriverPrivacyConsent: (consent: boolean) => void;
  // Comando 6 Actions
  updateVoiceCopilotConfig: (patch: Partial<VoiceCopilotConfig>) => void;
  triggerVoiceAnnouncement: (
    draft: Pick<VoiceAnnouncementItem, 'category' | 'priority' | 'shortText' | 'fullText' | 'dedupHash'>
  ) => { spoken: boolean; suppressedByCooldown: boolean };
  dismissVisualVoiceBanner: () => void;
  runConnectorTest: (connectorId: 'uber' | 'bolt', level: 1 | 2 | 3) => ConnectorTestResult;
  updateConnectorPermissions: (
    connectorId: 'uber' | 'bolt',
    patch: { readCapturePermissionGranted?: boolean; externalControlPermissionGranted?: boolean }
  ) => void;
  simulateConnectorDisconnection: (connectorId: 'uber' | 'bolt', reason: string) => void;
  parseAndImportSmartCaptures: (params: {
    rawInput: string;
    format: 'ocr_or_notification' | 'csv' | 'json';
    defaultPlatformId?: PlatformId;
    source?: CaptureSource;
  }) => { importedCount: number; duplicatesCount: number; message: string };
  correctSmartCaptureRecord: (
    captureId: string,
    patch: { amountEur?: number; platformId?: PlatformId; destinationZone?: string; category?: string },
    reason: string
  ) => { ok: boolean; error?: string };
  overrideProposalAutoPilotDecision: (
    proposalId: string,
    overrideChoice: 'Aceite manualmente' | 'Recusado manualmente',
    overrideReason: string
  ) => void;
  logZoneRelocation: (params: {
    zoneId?: string;
    fromZone: string;
    targetZone: string;
    suggestedReason: string;
    destinationNotes?: string;
  }) => void;
  completeZoneRelocationOutcome: (
    relocationId: string,
    outcome: 'Corrida obtida na zona' | 'Sem corrida (reposicionado)' | 'Cancelado',
    waitMinutesUntilRide?: number
  ) => void;
  updateVehicleCatalogFilters: (patch: Partial<import('../models/types').PersistedVehicleCatalogFilters>) => void;
  resetVehicleCatalogFilters: () => void;
  setFloatingCardQuickHidden: (hidden: boolean) => void;
  addReferralCoupon: (coupon: Omit<import('../models/types').ReferralCouponRecord, 'id' | 'currentRedemptions' | 'billingExecutionState'>) => void;
  toggleReferralCouponActive: (couponId: string) => void;
  // Interactive Assistants & Preview Signals (Comando 6.3)
  openAssistantHub: () => void;
  closeAssistantHub: () => void;
  startInteractiveAssistant: (assistantId: string) => void;
  pauseInteractiveAssistant: () => void;
  resumeInteractiveAssistant: (assistantId?: string) => void;
  resetInteractiveAssistant: (assistantId: string) => void;
  goToAssistantStep: (stepIndex: number) => void;
  verifyCurrentAssistantStep: () => { status: AssistantStepStatus; detail: string };
  confirmCurrentAssistantStepByUser: () => void;
  skipOptionalCurrentAssistantStep: () => void;
  closeInteractiveAssistant: () => void;
  markFloatingPreviewOpened: () => void;
  markPortalSimulatorTested: () => void;
  markPortalComparisonViewed: () => void;
}

const EcosystemContext = createContext<EcosystemContextValue | null>(null);

export const EcosystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EcosystemState>(loadInitialUnauthenticatedState);

  // Restore server cookie session, shared zone observations & server-published CMS on boot
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.authenticated || !data?.session) return;
        const srvSession = data.session as AuthSession;
        const isDemo = Boolean(srvSession.isDemoSession);
        const key = isDemo ? STORAGE_KEY_DEMO : `${STORAGE_KEY_REAL}_${srvSession.userId}`;
        setState((prev) => {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw) as Partial<EcosystemState>;
              const hydrated = hydrateState(parsed, isDemo ? 'demo' : 'real');
              const urlParams = new URLSearchParams(window.location.search);
              if (urlParams.get('autostart') === '1') {
                const reqMode = urlParams.get('mode') === 'admin' ? 'admin' : 'driver';
                if ((reqMode === 'admin' && !isAdminRole(srvSession.role)) || (reqMode === 'driver' && isAdminRole(srvSession.role))) {
                  return prev;
                }
              }
              const forcedPortal = urlParams.get('mode') === 'portal';
              return {
                ...hydrated,
                session: srvSession,
                mode: forcedPortal ? 'portal' : isAdminRole(srvSession.role) ? 'admin' : 'driver',
              };
            }
          } catch {
            // ignore
          }
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('autostart') === '1') {
            const reqMode = urlParams.get('mode') === 'admin' ? 'admin' : 'driver';
            if ((reqMode === 'admin' && !isAdminRole(srvSession.role)) || (reqMode === 'driver' && isAdminRole(srvSession.role))) {
              return prev;
            }
          }
          const forcedPortal = urlParams.get('mode') === 'portal';
          const base = buildInitialState(isDemo ? 'demo' : 'real');
          return {
            ...base,
            session: srvSession,
            mode: forcedPortal ? 'portal' : isAdminRole(srvSession.role) ? 'admin' : 'driver',
          };
        });
      })
      .catch(() => {
        // Offline / Vite-only fallback
      });

    fetch('/api/cms/public', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok || !data?.cms || typeof data.cms !== 'object') return;
        setState((prev) => ({
          ...prev,
          cms: {
            ...prev.cms,
            ...(data.cms as Partial<CmsContentState>),
            draftSnapshot: data.draft ? (data.draft as CmsContentState['draftSnapshot']) : prev.cms.draftSnapshot,
          },
          cmsPersistenceInfo: {
            lastServerScope: data.scope === 'demo_sandbox_isolated' ? 'demo_sandbox_isolated' : 'global_published',
            lastUpdatedAt: data.updatedAt ?? null,
          },
        }));
      })
      .catch(() => {
        // ignore
      });

    fetch('/api/catalog/public', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setState((prev) => {
          const nextCountries = Array.isArray(data.countries)
            ? data.countries.map((c: CountryMarketConfig) => ({
                ...c,
                activePlatforms: sanitizePlatformIdList(c.activePlatforms ?? []),
              }))
            : prev.countries;
          const nextPlatforms = Array.isArray(data.platforms)
            ? sanitizePlatformList(data.platforms)
            : prev.platforms;
          return {
            ...prev,
            countries: nextCountries,
            platforms: nextPlatforms,
          };
        });
      })
      .catch(() => {
        // ignore
      });

    fetch('/api/connectors/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setState((prev) => ({
          ...prev,
          connectors: {
            uber: syncConnectorWithServerEnv(prev.connectors.uber, Boolean(data.uber?.serverVaultConfigured)),
            bolt: syncConnectorWithServerEnv(prev.connectors.bolt, Boolean(data.bolt?.serverVaultConfigured)),
          },
        }));
      })
      .catch(() => {
        // ignore
      });

    fetch('/api/zones/observations')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.observations) || data.observations.length === 0) return;
        setState((prev) => {
          const existingIds = new Set(prev.zoneObservations.map((o) => o.id));
          const merged = [
            ...data.observations.filter((o: DriverZoneObservation) => !existingIds.has(o.id)),
            ...prev.zoneObservations,
          ];
          return { ...prev, zoneObservations: merged };
        });
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist Demo vs Real operational cache in strictly separated storage keys (NEVER storing authenticated session)
  useEffect(() => {
    try {
      const sanitizedForCache = { ...state, session: SEED_AUTH_SESSION };
      if (!state.session.authenticated) {
        localStorage.setItem(STORAGE_KEY_DEMO, JSON.stringify(sanitizedForCache));
        return;
      }
      const key = state.session.isDemoSession
        ? STORAGE_KEY_DEMO
        : `${STORAGE_KEY_REAL}_${state.session.userId}`;
      localStorage.setItem(key, JSON.stringify(sanitizedForCache));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.theme]);

  useEffect(() => {
    if (state.localization.firstOpenConfirmed) return;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon';
      const lang = navigator.language || 'pt-PT';
      const fallback = detectFallbackLocation(lang, tz);
      setState((prev) => {
        if (prev.localization.firstOpenConfirmed) return prev;
        return {
          ...prev,
          localization: {
            ...prev.localization,
            currentLocation: {
              ...prev.localization.currentLocation,
              countryCode: fallback.countryCode,
              countryName: fallback.countryName,
              region: fallback.region,
              city: fallback.city,
              approxAddress: fallback.approxAddress,
              timezone: fallback.timezone,
              detectedBy: fallback.countryCode === 'UNSET' ? 'Indisponível' : 'Browser Locale Fallback',
              detectedAt: new Date().toISOString(),
            },
          },
        };
      });
    } catch {
      // Ignore environments without Intl
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDriver = useMemo(
    () => state.users.find((u) => u.id === state.activeDriverUserId) ?? state.users[0],
    [state.users, state.activeDriverUserId]
  );

  const activeDriverPlan = useMemo(
    () => state.plans.find((p) => p.id === activeDriver.planId) ?? state.plans[1],
    [state.plans, activeDriver.planId]
  );

  const activeVehicle = useMemo(
    () => state.vehicles.find((v) => v.isActiveDriverVehicle) ?? state.vehicles[0],
    [state.vehicles]
  );

  const activeMarket = useMemo(
    () =>
      state.countries.find((c) => c.code === state.localization.selectedMarketCode) ??
      state.countries.find((c) => c.code === state.localization.primaryProfessionalMarketCode) ??
      state.countries[0],
    [state.countries, state.localization.selectedMarketCode, state.localization.primaryProfessionalMarketCode]
  );

  const availableMarketsForPortal = useMemo(
    () => state.countries.filter((c) => c.marketStatus === 'Disponível'),
    [state.countries]
  );

  const visibleDriverPlatforms = useMemo(() => {
    const sameCountry =
      state.localization.currentLocation.countryCode.toUpperCase() ===
      state.localization.selectedMarketCode.toUpperCase();
    const operational = getDriverOperationalPlatformsForLocation(
      state.platforms,
      state.localization.selectedMarketCode,
      sameCountry ? state.localization.currentLocation.region : undefined,
      sameCountry ? state.localization.currentLocation.city : undefined
    );
    return operational.filter((p) => !state.driverDeactivatedPlatformIds.includes(p.id));
  }, [
    state.platforms,
    state.localization.selectedMarketCode,
    state.localization.currentLocation.countryCode,
    state.localization.currentLocation.region,
    state.localization.currentLocation.city,
    state.driverDeactivatedPlatformIds,
  ]);

  const activeDriverTrips = useMemo(
    () =>
      state.trips.filter(
        (t) => !state.driverDeactivatedPlatformIds.includes(t.platformId)
      ),
    [state.trips, state.driverDeactivatedPlatformIds]
  );

  const financialSummary = useMemo(
    () => computeFinancialSummary(activeDriverTrips, state.expenses),
    [activeDriverTrips, state.expenses]
  );

  const comprehensiveReports = useMemo(
    () =>
      buildComprehensiveReports({
        trips: activeDriverTrips,
        expenses: state.expenses,
        proposals: state.proposals,
        platforms: state.platforms,
        vehicles: state.vehicles,
        tachograph: state.tachograph,
        routine: state.routinePreferences,
        autoPilot: state.autoPilot,
        costConfig: state.financialCostConfig,
        filters: state.reportFilters,
      }),
    [
      activeDriverTrips,
      state.expenses,
      state.proposals,
      state.platforms,
      state.vehicles,
      state.tachograph,
      state.routinePreferences,
      state.autoPilot,
      state.financialCostConfig,
      state.reportFilters,
    ]
  );

  const tachographSummary = useMemo(
    () =>
      consolidateMultiPlatformJornada(
        state.tachograph.activities,
        state.tachograph.platformIntervals,
        state.tachograph.sessions
      ),
    [state.tachograph]
  );

  const rolling24hCompliance = useMemo(
    () =>
      evaluateRolling24hCompliance(
        state.tachograph.activities,
        state.tachograph.platformIntervals
      ),
    [state.tachograph.activities, state.tachograph.platformIntervals]
  );

  const driverPredictions = useMemo(
    () => state.aiPredictions.filter((p) => p.driverId === activeDriver.id),
    [state.aiPredictions, activeDriver.id]
  );

  const aiCoreBriefing = useMemo(
    () =>
      runAiCoreBriefing({
        driverId: activeDriver.id,
        trips: activeDriverTrips,
        expenses: state.expenses,
        vehicles: state.vehicles,
        obligations: state.obligations,
        documents: state.documents,
        tachograph: state.tachograph,
        routine: state.routinePreferences,
        autoPilot: state.autoPilot,
        predictions: driverPredictions,
      }),
    [
      activeDriver.id,
      activeDriverTrips,
      state.expenses,
      state.vehicles,
      state.obligations,
      state.documents,
      state.tachograph,
      state.routinePreferences,
      state.autoPilot,
      driverPredictions,
    ]
  );

  function pushEvent(
    prev: EcosystemState,
    event: Omit<EcosystemEvent, 'id' | 'timestamp' | 'status'>
  ): EcosystemEvent[] {
    const exists = prev.events.some((e) => e.idempotencyKey === event.idempotencyKey);
    const record: EcosystemEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toISOString(),
      status: exists ? 'Ignorado (Idempotente)' : 'Processado',
    };
    return [record, ...prev.events].slice(0, 60);
  }

  function pushAudit(
    prev: EcosystemState,
    action: string,
    entity: string,
    details: string,
    actor: string = prev.activeAdminRole
  ): AuditLogRecord[] {
    const log: AuditLogRecord = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toISOString(),
      actor,
      actorRole: prev.mode === 'admin' ? prev.activeAdminRole : 'Motorista',
      environment: prev.mode,
      action,
      entity,
      details,
    };
    return [log, ...prev.auditLogs].slice(0, 80);
  }

  function getPlatformLifecycleStateHelper(
    platformId: PlatformId,
    platforms: PlatformRecord[],
    deactivatedIds: PlatformId[],
    countryCode: string,
    region?: string,
    city?: string
  ): PlatformDriverLifecycleState {
    const plat = platforms.find((p) => p.id === platformId);
    if (!plat) return 'Integração não configurada';
    if (plat.status !== 'Ativa') return 'Suspensa/Indisponível por administração';
    const op = getPlatformOperationInLocation(plat, countryCode, region, city);
    if (!op) return 'Não operacional no mercado';
    if (op.operationalStatus === 'Em validação') return 'Ainda não validada';
    if (
      op.operationalStatus === 'Encerrada no país' ||
      op.operationalStatus === 'Suspensa' ||
      op.operationalStatus === 'Licenciada sem operação confirmada' ||
      op.operationalStatus === 'Disponibilidade regional limitada'
    ) {
      return 'Não operacional no mercado';
    }
    const freshness = evaluateValidationFreshness(op.verifiedAt);
    if (freshness.isStale) return 'Verificação desatualizada';
    if (deactivatedIds.includes(platformId)) return 'Desativada pelo motorista';
    if (plat.lastErrorNote) return 'Integração com erro';
    if (plat.integrationStatus === 'Indisponível' || plat.integrationStatus === 'Descontinuada') {
      return 'Integração não configurada';
    }
    return 'Ativa e operacional';
  }

  const value: EcosystemContextValue = {
    state,
    activeDriver,
    activeDriverPlan,
    activeVehicle,
    activeMarket,
    availableMarketsForPortal,
    visibleDriverPlatforms,
    activeDriverTrips,
    financialSummary,
    comprehensiveReports,
    tachographSummary,
    rolling24hCompliance,
    aiCoreBriefing,
    driverPredictions,

    setMode: (mode) => {
      if (!canAccessMode(state.session, mode)) {
        setState((prev) => ({
          ...prev,
          mode: 'portal',
          rbacDeniedMessage:
            mode === 'admin'
              ? 'Acesso bloqueado (RBAC): o painel administrativo exige sessão administrativa autenticada.'
              : 'Autenticação necessária no Portal para aceder ao AIVAD Driver.',
        }));
        return false;
      }
      setState((prev) => ({ ...prev, mode, rbacDeniedMessage: null }));
      return true;
    },

    loginWithServerCredentials: async (email, password) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok || !data?.session) {
          return { ok: false, error: data?.error || 'Credenciais inválidas.' };
        }
        const srvSession = data.session as AuthSession;
        const targetMode: EcosystemMode = isAdminRole(srvSession.role) ? 'admin' : 'driver';
        const storageKey = `${STORAGE_KEY_REAL}_${srvSession.userId}`;
        setState((prev) => {
          let nextBase = buildInitialState('real');
          try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
              nextBase = hydrateState(JSON.parse(raw) as Partial<EcosystemState>, 'real');
            }
          } catch {
            // ignore
          }
          const realUser: UserAccount = {
            id: srvSession.userId,
            name: srvSession.userName,
            email: srvSession.email,
            role: srvSession.role,
            countryCode: prev.localization.selectedMarketCode || 'PT',
            city: prev.localization.currentLocation.city || 'Lisboa',
            status: 'Ativo',
            planId: 'plan-pro',
            osPlatform: 'Web',
            appVersion: '3.0.0',
            privacyConsentForSupport: false,
            createdAt: srvSession.signedInAt.slice(0, 10),
            isDemo: false,
          };
          const hasUser = nextBase.users.some((u) => u.id === realUser.id);
          return {
            ...nextBase,
            theme: prev.theme,
            localization: prev.localization,
            session: srvSession,
            mode: targetMode,
            activeDriverUserId: realUser.id,
            activeAdminRole: isAdminRole(srvSession.role) ? srvSession.role : prev.activeAdminRole,
            users: hasUser ? nextBase.users : [realUser, ...nextBase.users],
            rbacDeniedMessage: null,
            syncStatus: 'sincronizado',
            lastSyncedAt: new Date().toISOString(),
          };
        });
        return { ok: true };
      } catch {
        return { ok: false, error: 'Erro de comunicação com o servidor de autenticação.' };
      }
    },

    registerRealAccount: async (name, email, password, role = 'Motorista') => {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, email, password, role }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok || !data?.session) {
          return { ok: false, error: data?.error || 'Não foi possível criar a conta.' };
        }
        const srvSession = data.session as AuthSession;
        const base = buildInitialState('real');
        const realUser: UserAccount = {
          id: srvSession.userId,
          name: srvSession.userName,
          email: srvSession.email,
          role: srvSession.role,
          countryCode: base.localization.selectedMarketCode || 'PT',
          city: base.localization.currentLocation.city || 'Lisboa',
          status: 'Ativo',
          planId: 'plan-pro',
          osPlatform: 'Web',
          appVersion: '3.0.0',
          privacyConsentForSupport: false,
          createdAt: srvSession.signedInAt.slice(0, 10),
          isDemo: false,
        };
        setState((prev) => ({
          ...base,
          theme: prev.theme,
          localization: prev.localization,
          session: srvSession,
          mode: 'driver',
          activeDriverUserId: realUser.id,
          users: [realUser, ...base.users],
          rbacDeniedMessage: null,
          syncStatus: 'sincronizado',
          lastSyncedAt: new Date().toISOString(),
        }));
        return { ok: true };
      } catch {
        return { ok: false, error: 'Erro de ligação ao servidor.' };
      }
    },

    enterDemoSandbox: async (profile) => {
      try {
        const res = await fetch('/api/auth/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ profile }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok || !data?.session) {
          return { ok: false, error: data?.error || 'Falha ao iniciar Modo Demonstração.' };
        }
        const srvSession = data.session as AuthSession;
        setState((prev) => {
          let demoBase = buildInitialState('demo');
          try {
            const raw = localStorage.getItem(STORAGE_KEY_DEMO);
            if (raw) {
              demoBase = hydrateState(JSON.parse(raw) as Partial<EcosystemState>, 'demo');
            }
          } catch {
            // ignore
          }
          return {
            ...demoBase,
            theme: prev.theme,
            localization: prev.localization,
            session: srvSession,
            mode: profile === 'admin' ? 'admin' : 'driver',
            activeDriverUserId: profile === 'admin' ? demoBase.activeDriverUserId : 'usr-driver-1',
            activeAdminRole: profile === 'admin' ? 'Superadministrador' : demoBase.activeAdminRole,
            rbacDeniedMessage: null,
            syncStatus: 'sincronizado',
            lastSyncedAt: new Date().toISOString(),
          };
        });
        return { ok: true };
      } catch {
        return { ok: false, error: 'Servidor indisponível para iniciar sandbox.' };
      }
    },

    loginAsRole: (role) => {
      // Explicit sandbox routing without fake password bypass
      const profile = isAdminRole(role) ? 'admin' : 'driver';
      void fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profile }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok && data?.session) {
            setState((prev) => ({
              ...prev,
              session: data.session as AuthSession,
              activeAdminRole: isAdminRole(role) ? role : prev.activeAdminRole,
              mode: isAdminRole(role) ? 'admin' : 'driver',
              rbacDeniedMessage: null,
            }));
          }
        })
        .catch(() => {
          // ignore
        });
    },

    logoutSession: () => {
      void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
      setState((prev) => ({
        ...prev,
        mode: 'portal',
        rbacDeniedMessage: null,
        session: SEED_AUTH_SESSION,
        activeTrip: null,
      }));
    },

    revokeCurrentServerSession: async () => {
      try {
        const res = await fetch('/api/auth/sessions/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ revokeAllForUser: true }),
        });
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          mode: 'portal',
          rbacDeniedMessage: null,
          session: SEED_AUTH_SESSION,
          activeTrip: null,
        }));
        return { ok: Boolean(res.ok && data?.ok), revokedCount: Number(data?.revokedCount ?? 0) };
      } catch {
        return { ok: false, revokedCount: 0 };
      }
    },

    clearRbacDenied: () => setState((prev) => ({ ...prev, rbacDeniedMessage: null })),
    setTheme: (theme) => setState((prev) => ({ ...prev, theme })),
    toggleTheme: () =>
      setState((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' })),
    setDriverNav: (activeDriverNav) => setState((prev) => ({ ...prev, activeDriverNav })),
    setAdminNav: (activeAdminNav) => setState((prev) => ({ ...prev, activeAdminNav })),
    setPortalPage: (activePortalPage) => setState((prev) => ({ ...prev, activePortalPage })),
    setAdminRole: (activeAdminRole) =>
      setState((prev) => {
        if (!prev.session.isDemoSession) return prev;
        return {
          ...prev,
          activeAdminRole,
          session: isAdminRole(prev.session.role)
            ? { ...prev.session, role: activeAdminRole }
            : prev.session,
        };
      }),
    resetDemoData: () => {
      const fresh = buildInitialState(state.session.isDemoSession ? 'demo' : 'real');
      setState((prev) => ({
        ...fresh,
        session: prev.session,
        mode: prev.mode,
        theme: prev.theme,
      }));
    },

    syncNowToServer: async (options) => {
      if (!state.session.authenticated) {
        return { ok: false, message: 'Inicie sessão para sincronizar com o servidor.' };
      }
      setState((prev) => ({ ...prev, syncStatus: 'pendente', syncConflictDetail: null }));
      try {
        if (state.tachograph.offlineQueue.length > 0) {
          await fetch('/api/sync/offline-replay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              operations: state.tachograph.offlineQueue.map((item) => ({
                idempotencyKey: item.idempotencyKey,
                operationType: `TACHOGRAPH_${item.actionType}`,
                payload: item,
              })),
            }),
          }).catch(() => undefined);
        }

        const key = `sync:${state.session.userId}:${Date.now()}`;
        const res = await fetch('/api/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            idempotencyKey: key,
            baseVersion: state.serverSyncVersion > 0 ? state.serverSyncVersion : undefined,
            forceOverwrite: Boolean(options?.forceOverwrite),
            state: {
              tripsCount: state.trips.length,
              expensesCount: state.expenses.length,
              tachographSessions: state.tachograph.sessions.length,
              updatedAt: new Date().toISOString(),
            },
          }),
        });
        const data = await res.json();
        if (res.status === 409 && data?.conflictDetected) {
          const conflictMsg =
            data.error ||
            `Conflito de versão detetado: servidor em v${data.serverVersion}. Resolva ou force sincronização.`;
          setState((prev) => ({
            ...prev,
            syncStatus: 'erro',
            syncConflictDetail: conflictMsg,
          }));
          return { ok: false, message: conflictMsg, conflictDetected: true };
        }
        if (!res.ok || !data?.ok) {
          setState((prev) => ({ ...prev, syncStatus: 'erro' }));
          return { ok: false, message: data?.error || 'Falha de sincronização no servidor.' };
        }
        setState((prev) => ({
          ...prev,
          syncStatus: 'sincronizado',
          lastSyncedAt: data.updatedAt,
          serverSyncVersion: Number(data.version ?? prev.serverSyncVersion + 1),
          syncConflictDetail: null,
        }));
        return { ok: true, message: `Sincronizado com servidor (v${data.version}).` };
      } catch {
        setState((prev) => ({ ...prev, syncStatus: 'erro' }));
        return { ok: false, message: 'Sem ligação ao servidor Express.' };
      }
    },

    updateFinancialCostConfig: (patch) =>
      setState((prev) => ({
        ...prev,
        financialCostConfig: { ...prev.financialCostConfig, ...patch },
      })),

    updateReportFilters: (patch) =>
      setState((prev) => ({
        ...prev,
        reportFilters: { ...prev.reportFilters, ...patch },
      })),

    acceptProposalForTrip: (proposal, aiRec) => {
      if (state.activeTrip) {
        return { ok: false, error: 'Já existe uma viagem ativa em acompanhamento. Conclua-a ou cancele-a antes de iniciar outra.' };
      }
      if (hasExistingLifecycleTrip(state.trips, proposal.id)) {
        return { ok: false, error: 'Esta proposta já gerou um registo no histórico de viagens (bloqueio antiduplicação).' };
      }
      const sessionTrip = startActiveTripFromProposal({
        proposal,
        countryCode: activeMarket.code,
        aiRecommendation: aiRec,
      });
      const now = new Date().toISOString();
      const lceStart = createLifecycleAuditEvent({
        eventType: 'Viagem iniciada',
        originPlatform: proposal.input.platformId,
        previousState: proposal.lifecycleState,
        currentState: 'Em deslocação para recolha',
        changeOrigin: 'Motorista',
        associatedEntityId: proposal.id,
        associatedPayloadSummary: `Aceite proposta ${proposal.input.platformId.toUpperCase()} (€${proposal.input.grossValueEur.toFixed(2)}) — cronómetro de espera a 0s.`,
        isDemo: Boolean(state.session.isDemoSession),
      });
      setState((prev) => {
        const nextLce = appendIdempotentLifecycleEvent(prev.lifecycleAuditEvents, lceStart).updated;
        return {
          ...prev,
          activeTrip: sessionTrip,
          lifecycleAuditEvents: nextLce,
          proposals: prev.proposals.map((p) =>
            p.id === proposal.id
              ? {
                  ...p,
                  lifecycleState: 'Aceite pelo motorista',
                  stateTimestamps: { ...p.stateTimestamps, 'Aceite pelo motorista': now },
                }
              : p
          ),
          auditLogs: pushAudit(
            prev,
            'Aceitação de Proposta',
            proposal.id,
            `Iniciada deslocação para recolha (${proposal.input.platformId.toUpperCase()}). Espera ainda a 0s.`,
            prev.activeDriverUserId
          ),
        };
      });
      return { ok: true };
    },

    confirmActiveTripPlatform: () =>
      setState((prev) => {
        if (!prev.activeTrip) return prev;
        return {
          ...prev,
          activeTrip: {
            ...prev.activeTrip,
            platformConfirmed: true,
            confirmationMethod: 'Confirmação manual',
          },
        };
      }),

    markActiveTripArrived: (method, startWaitImmediately = true) =>
      setState((prev) => {
        if (!prev.activeTrip) return prev;
        const updated = markTripArrivedAtPickup(prev.activeTrip, method, startWaitImmediately);
        const lce = createLifecycleAuditEvent({
          eventType: 'Chegada à recolha',
          originPlatform: prev.activeTrip.platformId,
          previousState: prev.activeTrip.phase,
          currentState: updated.phase,
          changeOrigin: 'Motorista',
          associatedEntityId: prev.activeTrip.id,
          associatedPayloadSummary: `Chegada registada via ${method} (${startWaitImmediately ? 'espera iniciada' : 'aguarda início manual de espera'}).`,
          isDemo: Boolean(prev.session.isDemoSession),
        });
        const vDraft = buildLifecycleVoiceAnnouncement(
          updated.phase,
          prev.activeTrip.platformId,
          `Espera gratuita até ${prev.activeTrip.ruleApplied.freeWaitMinutes} minutos.`
        );
        const vRes = enqueueVoiceAnnouncement(prev.voiceHistory, vDraft, prev.voiceConfig);
        if (vRes.accepted && vRes.shouldSpeakAudio && vRes.item) {
          speakWithWebSpeech(vRes.item.spokenText, prev.voiceConfig);
        }
        return {
          ...prev,
          activeTrip: updated,
          lifecycleAuditEvents: appendIdempotentLifecycleEvent(prev.lifecycleAuditEvents, lce).updated,
          voiceHistory: vRes.updatedHistory,
          latestVisualVoiceBanner: vRes.accepted && vRes.shouldShowVisual ? vRes.item : prev.latestVisualVoiceBanner,
        };
      }),

    startActiveTripWait: () =>
      setState((prev) => {
        if (!prev.activeTrip) return prev;
        const updated = startTripPassengerWait(prev.activeTrip);
        const lce = createLifecycleAuditEvent({
          eventType: 'Espera',
          originPlatform: prev.activeTrip.platformId,
          previousState: prev.activeTrip.phase,
          currentState: updated.phase,
          changeOrigin: 'Motorista',
          associatedEntityId: prev.activeTrip.id,
          associatedPayloadSummary: 'Cronómetro de espera no local de recolha iniciado sem sobreposição com deslocação.',
          isDemo: Boolean(prev.session.isDemoSession),
        });
        return {
          ...prev,
          activeTrip: updated,
          lifecycleAuditEvents: appendIdempotentLifecycleEvent(prev.lifecycleAuditEvents, lce).updated,
        };
      }),

    startActiveTripInProgress: () =>
      setState((prev) => {
        if (!prev.activeTrip) return prev;
        const updated = startTripInProgress(prev.activeTrip);
        const lce = createLifecycleAuditEvent({
          eventType: 'Viagem iniciada',
          originPlatform: prev.activeTrip.platformId,
          previousState: prev.activeTrip.phase,
          currentState: updated.phase,
          changeOrigin: 'Motorista',
          associatedEntityId: prev.activeTrip.id,
          associatedPayloadSummary: 'Passageiro a bordo — viagem em curso.',
          isDemo: Boolean(prev.session.isDemoSession),
        });
        return {
          ...prev,
          activeTrip: updated,
          lifecycleAuditEvents: appendIdempotentLifecycleEvent(prev.lifecycleAuditEvents, lce).updated,
        };
      }),

    recordActiveTripNavigation: (patch) =>
      setState((prev) => {
        if (!prev.activeTrip) return prev;
        return {
          ...prev,
          activeTrip: {
            ...prev.activeTrip,
            ...patch,
          },
        };
      }),

    completeActiveTripAction: (actualGrossEur, tipEur = 0, tollsEur = 0, options) => {
      if (!state.activeTrip) return null;
      if (hasExistingLifecycleTrip(state.trips, state.activeTrip.proposalId, state.activeTrip.externalRef)) {
        setState((prev) => ({ ...prev, activeTrip: null }));
        return null;
      }
      const sess = state.activeTrip;
      const nowIso = new Date().toISOString();
      const plat = state.platforms.find((p) => p.id === sess.platformId);
      const commPct = plat?.commissionPct ?? 25;
      const gross = actualGrossEur ?? sess.grossEstimatedEur;

      const fareAdjustments: TripFareAdjustmentRecord[] = [];
      if (options?.confirmedAdjustmentEur && options.confirmedAdjustmentEur !== 0) {
        fareAdjustments.push({
          id: `adj-conf-${Date.now()}`,
          recordedAtIso: nowIso,
          amountEur: round2(options.confirmedAdjustmentEur),
          reason: options.confirmedAdjustmentReason?.trim() || 'Ajuste confirmado na plataforma',
          status: 'Confirmado pela plataforma',
          evidenceNote: 'Registado na conclusão da viagem.',
        });
      }
      if (options?.pendingAdjustmentEur && options.pendingAdjustmentEur !== 0) {
        fareAdjustments.push({
          id: `adj-pend-${Date.now() + 1}`,
          recordedAtIso: nowIso,
          amountEur: round2(options.pendingAdjustmentEur),
          reason: options.pendingAdjustmentReason?.trim() || 'Atraso/tempo adicional aguardando confirmação',
          status: 'Pendente de confirmação',
          evidenceNote: 'Pendente: não entra nos ganhos reais até confirmação.',
        });
      }

      const confirmedAdjTotal = fareAdjustments
        .filter((a) => a.status === 'Confirmado pela plataforma')
        .reduce((s, a) => s + a.amountEur, 0);

      const obsPickupKm = sess.observedPickupKm ?? null;
      const obsTripKm = sess.observedTripKm ?? null;
      const obsPickupMin = sess.observedPickupMin ?? null;
      const obsTripMin = sess.observedTripMin ?? null;
      const hasObservedActuals =
        obsPickupKm !== null || obsTripKm !== null || obsPickupMin !== null || obsTripMin !== null;

      const finalPickupKm = obsPickupKm ?? sess.pickupDistanceKm;
      const finalTripKm = obsTripKm ?? sess.tripDistanceKm;
      const totalEstimatedMin = Math.max(1, sess.pickupTimeEstMin + sess.tripTimeEstMin);
      const finalDurationMin =
        obsPickupMin !== null && obsTripMin !== null
          ? Math.max(1, obsPickupMin + obsTripMin)
          : obsTripMin !== null
            ? Math.max(1, sess.pickupTimeEstMin + obsTripMin)
            : totalEstimatedMin;

      const commissionEur = round2(gross * (commPct / 100));
      const operationalCostEur = round2((finalPickupKm + finalTripKm) * 0.12 + tollsEur);
      const netEur = round2(gross + tipEur - commissionEur - operationalCostEur);
      const travelSec = sess.arrivedAtIso
        ? Math.max(0, Math.floor((new Date(sess.arrivedAtIso).getTime() - new Date(sess.acceptedAtIso).getTime()) / 1000))
        : Math.max(0, Math.floor((Date.now() - new Date(sess.acceptedAtIso).getTime()) / 1000));
      const waitSec =
        sess.waitStartedAtIso && sess.tripStartedAtIso
          ? Math.max(0, Math.floor((new Date(sess.tripStartedAtIso).getTime() - new Date(sess.waitStartedAtIso).getTime()) / 1000))
          : 0;

      const matchedProposal = sess.proposalId
        ? state.proposals.find((p) => p.id === sess.proposalId)
        : undefined;

      const trip: TripRecord = {
        id: `trip-${Date.now()}`,
        externalRef: sess.externalRef,
        platformId: sess.platformId,
        vehicleId: activeVehicle.id,
        date: nowIso.slice(0, 10),
        time: nowIso.slice(11, 16),
        grossEur: gross,
        estimatedGrossEur: sess.grossEstimatedEur,
        initialPresentedGrossEur: sess.grossEstimatedEur,
        confirmedFinalGrossEur: round2(gross + confirmedAdjTotal),
        chargedTotalEur: round2(gross + tipEur),
        tipEur,
        bonusEur: 0,
        tollsEur,
        commissionEur,
        operationalCostEur,
        netEur,
        currency: activeMarket.currency,
        countryCode: sess.countryCode,
        pickupDistanceKm: finalPickupKm,
        tripDistanceKm: finalTripKm,
        durationMin: finalDurationMin,
        travelToPickupSeconds: travelSec,
        waitAtPickupSeconds: waitSec,
        pickupZone: sess.pickupZone,
        pickupAddress: sess.pickupAddress,
        destinationZone: sess.destinationZone,
        destinationAddress: sess.destinationAddress,
        category: sess.category,
        status: 'Concluída',
        aiRecommendedAction: sess.aiRecommendation,
        driverExecutionConfirmed: true,
        platformExecutionConfirmed: sess.platformConfirmed,
        lifecycleEventKey: `lifecycle:${sess.id}`,
        isEstimatedBreakdown: actualGrossEur === undefined,
        preDecisionSnapshot: {
          predictedNetEur: sess.netEstimatedEur,
          predictedDurationMin: totalEstimatedMin,
          predictedClassification: matchedProposal?.analysis.classification ?? 'verde',
          recommendedAction: sess.aiRecommendation,
        },
        preAcceptanceEstimate: {
          pickupDistanceKm: sess.pickupDistanceKm,
          pickupTimeMin: sess.pickupTimeEstMin,
          tripDistanceKm: sess.tripDistanceKm,
          tripTimeMin: sess.tripTimeEstMin,
          totalDistanceKm: round2(sess.pickupDistanceKm + sess.tripDistanceKm),
          totalTimeMin: totalEstimatedMin,
          grossEur: sess.grossEstimatedEur,
          estimatedNetEur: sess.netEstimatedEur,
          eurPerKm:
            sess.pickupDistanceKm + sess.tripDistanceKm > 0
              ? round2(sess.netEstimatedEur / (sess.pickupDistanceKm + sess.tripDistanceKm))
              : 0,
          eurPerHour: totalEstimatedMin > 0 ? round2((sess.netEstimatedEur / totalEstimatedMin) * 60) : 0,
        },
        postAcceptanceActual: {
          hasObservedActuals,
          pickupDistanceKm: obsPickupKm,
          tripDistanceKm: obsTripKm,
          totalDistanceKm:
            obsPickupKm !== null && obsTripKm !== null ? round2(obsPickupKm + obsTripKm) : null,
          pickupTimeMin: obsPickupMin,
          tripTimeMin: obsTripMin,
          totalTimeMin:
            obsPickupMin !== null && obsTripMin !== null ? Math.round(obsPickupMin + obsTripMin) : null,
          navigationTrafficTimeMin: sess.navigationTrafficEstTotalMin ?? null,
          navigationAppUsed: sess.navigationAppUsed ?? 'Nenhum',
          navigationStartedAtIso: sess.navigationStartedAtIso,
          observationSource: hasObservedActuals
            ? 'Cronómetro AIVAD + motorista'
            : sess.navigationTrafficEstTotalMin
              ? 'Registo manual do motorista'
              : 'Sem dados reais observados',
        },
        fareAdjustments: fareAdjustments.length > 0 ? fareAdjustments : undefined,
        source: 'Manual',
        proposalId: sess.proposalId,
        isDemo: Boolean(state.session.isDemoSession),
      };

      const lceDone = createLifecycleAuditEvent({
        eventType: 'Viagem concluída',
        originPlatform: sess.platformId,
        previousState: sess.phase,
        currentState: 'Concluída',
        changeOrigin: 'Motorista',
        associatedEntityId: trip.id,
        associatedPayloadSummary: `Viagem ${trip.externalRef} concluída (€${trip.grossEur.toFixed(2)} bruto · €${trip.netEur.toFixed(2)} líquido).`,
        idempotencyKey: `lce:done:${sess.id}`,
        isDemo: Boolean(state.session.isDemoSession),
      });

      setState((prev) => ({
        ...prev,
        activeTrip: null,
        trips: [trip, ...prev.trips],
        lifecycleAuditEvents: appendIdempotentLifecycleEvent(prev.lifecycleAuditEvents, lceDone).updated,
        proposals: sess.proposalId
          ? prev.proposals.map((p) =>
              p.id === sess.proposalId
                ? {
                    ...p,
                    lifecycleState: 'Concluída',
                    stateTimestamps: { ...p.stateTimestamps, Concluída: nowIso },
                  }
                : p
            )
          : prev.proposals,
        aiPredictions: sess.proposalId
          ? prev.aiPredictions.map((pr) =>
              pr.proposalId === sess.proposalId && pr.driverId === prev.activeDriverUserId
                ? reconcilePredictionOutcome(pr, trip, prev.autoPilot.thresholds)
                : pr
            )
          : prev.aiPredictions,
        campaigns: prev.campaigns.map((c) =>
          c.platformId === trip.platformId && c.status === 'Ativa'
            ? { ...c, completedTrips: Math.min(c.targetTrips, c.completedTrips + 1) }
            : c
        ),
        events: pushEvent(prev, {
          idempotencyKey: `trip_completed:${trip.lifecycleEventKey}`,
          type: 'TRIP_COMPLETED',
          source: 'Active Trip Lifecycle',
          target: 'Finance · Reports · Campaigns · AI CORE',
          userId: prev.activeDriverUserId,
          payloadSummary: `Viagem ${trip.externalRef} concluída (€${trip.grossEur.toFixed(2)}).`,
        }),
      }));
      return trip;
    },

    cancelActiveTripAction: (cancellationBy, isNoShow, reason, compensationEur) => {
      if (!state.activeTrip) return null;
      const plat = state.platforms.find((p) => p.id === state.activeTrip!.platformId);
      const cancelledTrip = buildCancelledTripFromActiveSession({
        session: {
          ...state.activeTrip,
          isDemo: Boolean(state.session.isDemoSession),
        },
        cancellationBy,
        isNoShow,
        reason,
        compensationEur,
        commissionPct: plat?.commissionPct ?? 25,
      });
      const nowIso = new Date().toISOString();
      const lceCanc = createLifecycleAuditEvent({
        eventType: 'Cancelamento',
        originPlatform: cancelledTrip.platformId,
        previousState: state.activeTrip.phase,
        currentState: cancelledTrip.status,
        changeOrigin: 'Motorista',
        associatedEntityId: cancelledTrip.id,
        associatedPayloadSummary: `${cancelledTrip.status} (${cancellationBy}): ${reason} · Taxa €${compensationEur.toFixed(2)}`,
        idempotencyKey: `lce:canc:${state.activeTrip.id}`,
        isDemo: Boolean(state.session.isDemoSession),
      });
      setState((prev) => ({
        ...prev,
        activeTrip: null,
        trips: [cancelledTrip, ...prev.trips],
        lifecycleAuditEvents: appendIdempotentLifecycleEvent(prev.lifecycleAuditEvents, lceCanc).updated,
        proposals: prev.activeTrip?.proposalId
          ? prev.proposals.map((p) =>
              p.id === prev.activeTrip!.proposalId
                ? {
                    ...p,
                    lifecycleState: 'Cancelada',
                    stateTimestamps: { ...p.stateTimestamps, Cancelada: nowIso },
                  }
                : p
            )
          : prev.proposals,
        auditLogs: pushAudit(
          prev,
          'Cancelamento Registado',
          cancelledTrip.externalRef,
          `${cancelledTrip.status} (${cancellationBy}): ${reason}`,
          prev.activeDriverUserId
        ),
      }));
      return cancelledTrip;
    },

    requestBrowserGeolocation: () => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const fb = detectFallbackLocation(
          typeof navigator !== 'undefined' ? navigator.language : 'pt-PT',
          Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon'
        );
        setState((prev) => ({
          ...prev,
          localization: {
            ...prev.localization,
            permissionStatus: 'unavailable',
            currentLocation: {
              ...fb,
              detectedBy: fb.countryCode === 'UNSET' ? 'Indisponível' : 'Browser Locale Fallback',
              detectedAt: new Date().toISOString(),
            },
          },
        }));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const resolved = resolveLocationFromCoordinates(pos.coords.latitude, pos.coords.longitude);
          setState((prev) => {
            if (resolved.countryCode === 'UNSET') {
              return {
                ...prev,
                localization: {
                  ...prev.localization,
                  permissionStatus: 'granted',
                  currentLocation: {
                    ...resolved,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    detectedBy: 'Indisponível',
                    detectedAt: new Date().toISOString(),
                  },
                },
              };
            }
            const evalRes = evaluateCountryChange(
              prev.localization,
              resolved.countryCode,
              resolved.city,
              resolved.region,
              prev.countries
            );
            return {
              ...prev,
              localization: {
                ...evalRes.nextProfile,
                permissionStatus: 'granted',
                currentLocation: {
                  ...resolved,
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  detectedBy: 'Geolocation API',
                  detectedAt: new Date().toISOString(),
                },
              },
              events: pushEvent(prev, {
                idempotencyKey: `geo:${resolved.countryCode}:${resolved.city}:${Date.now()}`,
                type: 'LOCATION_UPDATED',
                source: 'Geolocation Engine',
                target: 'Localization · Compliance · Platforms',
                userId: prev.activeDriverUserId,
                payloadSummary: `Localização detetada por GPS/Navegador: ${resolved.city}, ${resolved.countryName}.`,
              }),
            };
          });
        },
        () => {
          const fb = detectFallbackLocation(
            navigator.language || 'pt-PT',
            Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon'
          );
          setState((prev) => ({
            ...prev,
            localization: {
              ...prev.localization,
              permissionStatus: 'denied',
              currentLocation: {
                ...fb,
                detectedBy: fb.countryCode === 'UNSET' ? 'Indisponível' : 'Browser Locale Fallback',
                detectedAt: new Date().toISOString(),
              },
            },
          }));
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      );
    },

    simulateOrSelectLocation: (countryCode, city, region) => {
      if (countryCode === 'UNSET') return;
      setState((prev) => {
        const country = prev.countries.find((c) => c.code === countryCode);
        const resolvedRegion = region ?? country?.regions[0]?.name ?? country?.name ?? countryCode;
        const evalRes = evaluateCountryChange(
          prev.localization,
          countryCode,
          city,
          resolvedRegion,
          prev.countries
        );
        const validatedPlatforms = getValidatedPlatformsForLocation(
          prev.platforms,
          countryCode,
          resolvedRegion,
          city
        );
        return {
          ...prev,
          driverDeactivatedPlatformIds: [],
          autoPilot: {
            ...prev.autoPilot,
            thresholds: {
              ...prev.autoPilot.thresholds,
              allowedPlatforms: validatedPlatforms,
            },
          },
          localization: {
            ...evalRes.nextProfile,
            currentLocation: {
              ...evalRes.nextProfile.currentLocation,
              approxAddress: `${city}, ${resolvedRegion}, ${country?.name ?? countryCode}`,
              detectedBy: 'Seleção Manual',
            },
          },
          events: pushEvent(prev, {
            idempotencyKey: `loc_manual:${countryCode}:${city}:${Date.now()}`,
            type: 'LOCATION_UPDATED',
            source: 'Localization Selector',
            target: 'Localization Profile (Validated Platforms Preselected)',
            userId: prev.activeDriverUserId,
            payloadSummary: `Localização definida para ${city} (${country?.name ?? countryCode}). Operacionais na localização: ${validatedPlatforms.join(', ') || 'nenhuma'}.`,
          }),
        };
      });
    },

    confirmLocalMarket: (countryCode) => {
      setState((prev) => {
        const candidate = countryCode ?? prev.localization.currentLocation.countryCode;
        const targetCode = candidate === 'UNSET' ? prev.localization.primaryProfessionalMarketCode : candidate;
        const nextLoc = confirmLocalMarketAdaptation(prev.localization, targetCode, prev.countries);
        const validatedPlatforms = getValidatedPlatformsForLocation(
          prev.platforms,
          targetCode,
          nextLoc.currentLocation.region,
          nextLoc.currentLocation.city
        );
        return {
          ...prev,
          driverDeactivatedPlatformIds: [],
          autoPilot: {
            ...prev.autoPilot,
            thresholds: {
              ...prev.autoPilot.thresholds,
              allowedPlatforms: validatedPlatforms,
            },
          },
          localization: nextLoc,
          events: pushEvent(prev, {
            idempotencyKey: `market_confirm:${targetCode}:${Date.now()}`,
            type: 'LOCATION_UPDATED',
            source: 'Localization Confirmation',
            target: 'UI Currency · Units · Compliance · Validated Platforms',
            userId: prev.activeDriverUserId,
            payloadSummary: `Experiência local adaptada para ${targetCode} (${nextLoc.languageCode}, ${nextLoc.unitSystem}). Plataformas ativas validadas: ${validatedPlatforms.join(', ') || 'nenhuma'}.`,
          }),
        };
      });
    },

    dismissCountryChangePrompt: () =>
      setState((prev) => ({
        ...prev,
        localization: {
          ...prev.localization,
          firstOpenConfirmed: true,
          pendingCountryChangePrompt: null,
        },
      })),

    setProfessionalMarkets: (residenceCode, primaryMarketCode, additionalCodes) =>
      setState((prev) => ({
        ...prev,
        localization: {
          ...prev.localization,
          residenceCountryCode: residenceCode,
          primaryProfessionalMarketCode: primaryMarketCode,
          additionalProfessionalMarketCodes: additionalCodes,
        },
        auditLogs: pushAudit(
          prev,
          'Perfil Profissional Internacional',
          prev.activeDriverUserId,
          `Residência: ${residenceCode} · Principal: ${primaryMarketCode}`,
          prev.activeDriverUserId
        ),
      })),

    setLanguageCode: (languageCode) => {
      if (!isSupportedLanguageCode(languageCode)) return;
      try {
        localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, languageCode);
      } catch {
        // ignore
      }
      setState((prev) => ({
        ...prev,
        localization: {
          ...prev.localization,
          // Idioma altera exclusivamente o texto/direção da UI (nunca país, moeda, fuso ou impostos)
          languageCode,
        },
      }));
    },

    updateCostsCalculator: (patch) =>
      setState((prev) => ({
        ...prev,
        costsCalculator: {
          ...prev.costsCalculator,
          ...patch,
        },
      })),

    resetCostsCalculator: () =>
      setState((prev) => ({
        ...prev,
        costsCalculator: createDefaultCostsCalculatorConfig(
          prev.vehicles.find((v) => v.isActiveDriverVehicle) ?? prev.vehicles[0]
        ),
      })),

    publishTachographAuditSnapshot: async (targetSessionId) => {
      const store = state.tachograph;
      const targetSession =
        store.sessions.find((s) => s.id === (targetSessionId ?? store.activeSessionId)) ??
        store.sessions[0];
      const summary = consolidateMultiPlatformJornada(
        store.activities,
        store.platformIntervals,
        store.sessions
      );
      const clocks = computeLiveTachographClocks(store);
      const qr = buildTachographQrPayload(
        targetSession,
        summary,
        activeDriver.name,
        `${activeVehicle.brand} ${activeVehicle.model}`
      );
      const sid = targetSession?.id ?? 'RESUMO-PERIODO';
      try {
        const res = await fetch('/api/tachograph/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sessionId: sid,
            verificationCode: qr.verificationCode,
            driverAlias: activeDriver.name,
            vehicleLabel: `${activeVehicle.brand} ${activeVehicle.model} (${activeVehicle.year})`,
            operatorName: targetSession?.operatorName ?? 'Operador Independente',
            date: targetSession?.date ?? new Date().toISOString().slice(0, 10),
            startIso: targetSession?.startIso ?? new Date().toISOString(),
            endIso: targetSession?.endIso ?? null,
            odometerStartKm: targetSession?.odometerStartKm ?? 0,
            odometerEndKm: targetSession?.odometerEndKm ?? targetSession?.odometerCurrentKm ?? 0,
            distanceKm: summary.totalKmDriven,
            drivingMinutes: summary.drivingMinutes,
            effectiveWorkMinutes: Math.round(clocks.effectiveWorkSeconds / 60) || summary.totalWorkdayMinutes,
            breakMinutes: summary.breakMinutes + summary.mealMinutes,
            currentState: targetSession?.currentState ?? 'Consolidado',
            status: targetSession?.status ?? 'Resumo',
            countryCode: activeMarket.code,
            city: state.localization.currentLocation.city,
          }),
        });
        const data = await res.json();
        return { ok: Boolean(data?.ok), verificationPath: data?.verificationPath };
      } catch {
        return { ok: false };
      }
    },

    startTachograph: (odometerStartKm, operatorName, notes) => {
      const res = startTachographShift(state.tachograph, {
        driverId: activeDriver.id,
        vehicleId: activeVehicle.id,
        operatorName: operatorName ?? 'Atlântico Mobilidade TVDE Lda',
        odometerStartKm,
        countryCode: activeMarket.code,
        city: state.localization.currentLocation.city,
        notes,
        isDemo: Boolean(state.session.isDemoSession),
      });
      if (!res.ok) return { ok: false, error: res.error };

      setState((prev) => ({
        ...prev,
        tachograph: res.store,
        events: pushEvent(prev, {
          idempotencyKey: `tach_start:${res.session?.id}`,
          type: 'TACHOGRAPH_RECORDED',
          source: 'TACÓGRAFO',
          target: 'Dashboard · Relatórios · Linha Temporal',
          userId: prev.activeDriverUserId,
          payloadSummary: `Turno iniciado (${odometerStartKm} km) em ${state.localization.currentLocation.city}.`,
        }),
      }));

      if (res.session) {
        const sum = consolidateMultiPlatformJornada(
          res.store.activities,
          res.store.platformIntervals,
          res.store.sessions
        );
        const qr = buildTachographQrPayload(
          res.session,
          sum,
          activeDriver.name,
          `${activeVehicle.brand} ${activeVehicle.model}`
        );
        void fetch('/api/tachograph/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sessionId: res.session.id,
            verificationCode: qr.verificationCode,
            driverAlias: activeDriver.name,
            vehicleLabel: `${activeVehicle.brand} ${activeVehicle.model} (${activeVehicle.year})`,
            operatorName: res.session.operatorName,
            date: res.session.date,
            startIso: res.session.startIso,
            endIso: res.session.endIso ?? null,
            odometerStartKm: res.session.odometerStartKm,
            odometerEndKm: res.session.odometerCurrentKm,
            distanceKm: 0,
            drivingMinutes: sum.drivingMinutes,
            effectiveWorkMinutes: 0,
            breakMinutes: sum.breakMinutes + sum.mealMinutes,
            currentState: res.session.currentState,
            status: res.session.status,
            countryCode: activeMarket.code,
            city: state.localization.currentLocation.city,
          }),
        }).catch(() => {});
      }
      return { ok: true };
    },

    transitionTachograph: (targetState, odometerKm, options) => {
      const res = transitionTachographState(state.tachograph, {
        targetState,
        odometerKm,
        platformId: options?.platformId,
        movementKind: options?.movementKind,
        notes: options?.notes,
      });
      if (!res.ok) return { ok: false, error: res.error };

      setState((prev) => ({
        ...prev,
        tachograph: res.store,
        events: pushEvent(prev, {
          idempotencyKey: `tach_trans:${res.createdActivity?.id}`,
          type: 'TACHOGRAPH_RECORDED',
          source: 'TACÓGRAFO',
          target: 'Dashboard · Produtividade · Relatórios',
          userId: prev.activeDriverUserId,
          payloadSummary: `Estado atividade -> ${targetState} (${odometerKm} km).`,
        }),
      }));

      if (res.session) {
        const sum = consolidateMultiPlatformJornada(
          res.store.activities,
          res.store.platformIntervals,
          res.store.sessions
        );
        const clocks = computeLiveTachographClocks(res.store);
        const qr = buildTachographQrPayload(
          res.session,
          sum,
          activeDriver.name,
          `${activeVehicle.brand} ${activeVehicle.model}`
        );
        void fetch('/api/tachograph/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sessionId: res.session.id,
            verificationCode: qr.verificationCode,
            driverAlias: activeDriver.name,
            vehicleLabel: `${activeVehicle.brand} ${activeVehicle.model} (${activeVehicle.year})`,
            operatorName: res.session.operatorName,
            date: res.session.date,
            startIso: res.session.startIso,
            endIso: res.session.endIso ?? null,
            odometerStartKm: res.session.odometerStartKm,
            odometerEndKm: res.session.odometerEndKm ?? res.session.odometerCurrentKm,
            distanceKm: Math.max(0, (res.session.odometerEndKm ?? res.session.odometerCurrentKm) - res.session.odometerStartKm),
            drivingMinutes: sum.drivingMinutes,
            effectiveWorkMinutes: Math.round(clocks.effectiveWorkSeconds / 60),
            breakMinutes: sum.breakMinutes + sum.mealMinutes,
            currentState: res.session.currentState,
            status: res.session.status,
            countryCode: activeMarket.code,
            city: state.localization.currentLocation.city,
          }),
        }).catch(() => {});
      }
      return { ok: true };
    },

    correctTachographActivity: (activityId, patch, reason) => {
      const target = state.tachograph.activities.find((a) => a.id === activityId);
      if (!target) return { ok: false, error: 'Registo não encontrado.' };
      const res = correctTachographRecord(target, patch, reason, activeDriver.name);
      if (!res.ok || !res.record) return { ok: false, error: res.error };

      setState((prev) => ({
        ...prev,
        tachograph: {
          ...prev.tachograph,
          activities: prev.tachograph.activities.map((a) => (a.id === activityId ? res.record! : a)),
        },
        events: pushEvent(prev, {
          idempotencyKey: `tach_corr:${activityId}:${res.record!.revisions.length}`,
          type: 'TACHOGRAPH_CORRECTED',
          source: 'TACÓGRAFO',
          target: 'Auditoria · Relatórios Atividade',
          userId: prev.activeDriverUserId,
          payloadSummary: `Correção auditável em ${activityId} (${reason}). Histórico preservado.`,
        }),
        auditLogs: pushAudit(prev, 'Correção Atividade TACÓGRAFO', activityId, reason, activeDriver.name),
      }));
      return { ok: true };
    },

    enqueueOfflineTachograph: (item) =>
      setState((prev) => ({
        ...prev,
        tachograph: enqueueOfflineTachographAction(prev.tachograph, item),
      })),

    syncOfflineTachograph: () => {
      const outcome = syncTachographOfflineQueue(state.tachograph, {
        driverId: activeDriver.id,
        vehicleId: activeVehicle.id,
        operatorName: 'Atlântico Mobilidade TVDE Lda',
        countryCode: activeMarket.code,
        city: state.localization.currentLocation.city,
      });
      setState((prev) => ({
        ...prev,
        tachograph: outcome.store,
        events: pushEvent(prev, {
          idempotencyKey: `tach_sync:${Date.now()}`,
          type: 'TACHOGRAPH_RECORDED',
          source: 'Offline Queue Sync',
          target: 'TACÓGRAFO · Auditoria',
          userId: prev.activeDriverUserId,
          payloadSummary: `Sincronização offline: ${outcome.syncedCount} aplicados, ${outcome.duplicatesSkipped} duplicados, ${outcome.conflictsResolved} conflitos resolvidos.`,
        }),
      }));
      return {
        syncedCount: outcome.syncedCount,
        duplicatesSkipped: outcome.duplicatesSkipped,
        conflictsResolved: outcome.conflictsResolved,
      };
    },

    createAndAnalyzeProposal: (input, source = 'Manual', options) => {
      const id = input.id ?? `prop-${Date.now()}`;
      const aiPackage = analyzeProposalWithAiCore({
        input: { ...input, id },
        autoPilot: state.autoPilot,
        activeVehicle,
        tachograph: state.tachograph,
        zones: state.zones,
        savedPlaces: state.savedPlaces,
        routine: state.routinePreferences,
        calibratedPredictions: driverPredictions,
        completedTripsCount: activeDriverTrips.filter((t) => isCompletedTripStatus(t.status)).length,
      });
      const connectorPerm =
        input.platformId === 'uber'
          ? state.connectors.uber.externalControlPermissionGranted
          : input.platformId === 'bolt'
            ? state.connectors.bolt.externalControlPermissionGranted
            : false;
      const effectiveAutoPilot: AutoPilotConfig = {
        ...state.autoPilot,
        officialAutomationAuthorized: state.autoPilot.officialAutomationAuthorized || connectorPerm,
        authorizedExecutionChannel: connectorPerm
          ? 'Bridge Nativo Autorizado'
          : state.autoPilot.officialAutomationAuthorized
            ? 'API Oficial Autorizada'
            : state.autoPilot.authorizedExecutionChannel ?? 'Nenhum',
      };
      const decision = evaluateAutoPilot(
        id,
        input,
        aiPackage.analysis,
        effectiveAutoPilot,
        state.campaigns
      );
      const now = new Date().toISOString();
      const isSandbox = Boolean(options?.isSimulatedSandbox);
      const isDemoRecord = Boolean(state.session.isDemoSession);

      // Se o modo Automático executou automaticamente a decisão via canal autorizado:
      const autoAccepted = Boolean(decision.executedAutomatically && decision.action === 'Executado automaticamente: Aceitar');
      const autoRejected = Boolean(decision.executedAutomatically && decision.action === 'Executado automaticamente: Recusar');
      const initialLifecycleState: ProposalLifecycleState = autoAccepted
        ? 'Aceite pelo motorista'
        : autoRejected
          ? 'Recusada'
          : 'Apresentada';

      const record: ProposalRecord = {
        id,
        createdAt: now,
        input: { ...input, id },
        analysis: aiPackage.analysis,
        lifecycleState: initialLifecycleState,
        stateTimestamps: {
          Capturada: now,
          Analisada: now,
          Apresentada: now,
          ...(autoAccepted ? { 'Aceite pelo motorista': now } : {}),
          ...(autoRejected ? { Recusada: now } : {}),
        },
        autoPilotDecision: decision,
        source,
        isSimulatedSandbox: isSandbox,
        isDemo: isDemoRecord,
      };
      if (!isSandbox) {
        const confTxt =
          aiPackage.confidencePct !== null
            ? `${aiPackage.confidencePct}%`
            : aiPackage.confidenceStatus;
        const pred: AiPredictionRecord = {
          id: `pred-${Date.now()}`,
          driverId: activeDriver.id,
          proposalId: id,
          createdAt: now,
          agentId: 'corridas',
          predictedNetEur: aiPackage.analysis.estimatedNetEur,
          predictedDurationMin: aiPackage.analysis.totalTimeMin,
          predictedDistanceKm: aiPackage.analysis.totalDistanceKm,
          predictedClassification: aiPackage.analysis.classification,
          predictedEurPerHour: aiPackage.analysis.eurPerHour,
          status: 'Pendente resultado',
          learningNote: `Recomendação: ${aiPackage.recommendedAction} (confiança: ${confTxt}).`,
          epistemicTag: 'Previsão',
        };

        const lceRecv = createLifecycleAuditEvent({
          eventType: 'Proposta recebida',
          originPlatform: input.platformId,
          previousState: 'Nenhuma',
          currentState: 'Capturada',
          changeOrigin: source === 'Manual' ? 'Motorista' : 'Smart Capture',
          associatedEntityId: id,
          associatedPayloadSummary: `${input.platformId.toUpperCase()} ${input.category} · €${input.grossValueEur.toFixed(2)}`,
          idempotencyKey: `lce:recv:${id}`,
          isDemo: isDemoRecord,
        });
        const lceAnlz = createLifecycleAuditEvent({
          eventType: 'Proposta analisada',
          originPlatform: input.platformId,
          previousState: 'Capturada',
          currentState: `Sinal ${aiPackage.analysis.classification.toUpperCase()} (${decision.action})`,
          changeOrigin:
            decision.modeAtDecision === 'Automático'
              ? 'AutoPilot Automático'
              : decision.modeAtDecision === 'Semiautomático'
                ? 'AutoPilot Semiautomático'
                : 'Sistema',
          associatedEntityId: id,
          associatedPayloadSummary: `€${aiPackage.analysis.eurPerKm.toFixed(2)}/km · €${aiPackage.analysis.eurPerHour.toFixed(2)}/h · Score ${aiPackage.analysis.score}`,
          idempotencyKey: `lce:anlz:${id}`,
          isDemo: isDemoRecord,
        });

        setState((prev) => {
          let nextActiveTrip = prev.activeTrip;
          let lceList = appendIdempotentLifecycleEvent(prev.lifecycleAuditEvents, lceRecv).updated;
          lceList = appendIdempotentLifecycleEvent(lceList, lceAnlz).updated;

          if (autoAccepted && !prev.activeTrip) {
            nextActiveTrip = startActiveTripFromProposal({
              proposal: record,
              countryCode: activeMarket.code,
              aiRecommendation: 'Aceitar',
              nowIso: now,
            });
            const lceAutoExec = createLifecycleAuditEvent({
              eventType: 'Aceitação / Rejeição',
              originPlatform: input.platformId,
              previousState: 'Apresentada',
              currentState: 'Aceite automaticamente',
              changeOrigin: 'AutoPilot Automático',
              associatedEntityId: id,
              associatedPayloadSummary: `Executado automaticamente via ${decision.executionChannelUsed}.`,
              idempotencyKey: `lce:autoacc:${id}`,
              isDemo: isDemoRecord,
            });
            lceList = appendIdempotentLifecycleEvent(lceList, lceAutoExec).updated;
          } else if (autoRejected) {
            const lceAutoRej = createLifecycleAuditEvent({
              eventType: 'Aceitação / Rejeição',
              originPlatform: input.platformId,
              previousState: 'Apresentada',
              currentState: 'Recusada automaticamente',
              changeOrigin: 'AutoPilot Automático',
              associatedEntityId: id,
              associatedPayloadSummary: `Recusada automaticamente via ${decision.executionChannelUsed}.`,
              idempotencyKey: `lce:autorej:${id}`,
              isDemo: isDemoRecord,
            });
            lceList = appendIdempotentLifecycleEvent(lceList, lceAutoRej).updated;
          }

          const voiceDraft = buildProposalVoiceAnnouncement(input, aiPackage.analysis, decision.action);
          const vRes = enqueueVoiceAnnouncement(prev.voiceHistory, voiceDraft, prev.voiceConfig, now);
          if (vRes.accepted && vRes.shouldSpeakAudio && vRes.item) {
            speakWithWebSpeech(vRes.item.spokenText, prev.voiceConfig);
          }

          return {
            ...prev,
            activeTrip: nextActiveTrip,
            proposals: [record, ...prev.proposals],
            aiPredictions: [pred, ...prev.aiPredictions].slice(0, 60),
            lifecycleAuditEvents: lceList,
            voiceHistory: vRes.updatedHistory,
            latestVisualVoiceBanner: vRes.accepted && vRes.shouldShowVisual ? vRes.item : prev.latestVisualVoiceBanner,
          };
        });
      }
      return { record, aiPackage };
    },

    updateProposalLifecycle: (proposalId, nextState) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const target = prev.proposals.find((p) => p.id === proposalId);
        if (!target || target.isSimulatedSandbox) return prev;
        const updatedProposals = prev.proposals.map((p) =>
          p.id === proposalId
            ? {
                ...p,
                lifecycleState: nextState,
                stateTimestamps: { ...p.stateTimestamps, [nextState]: now },
              }
            : p
        );

        let updatedTrips = prev.trips;
        let updatedCampaigns = prev.campaigns;
        let updatedEvents = prev.events;
        let updatedTachograph = prev.tachograph;
        let updatedPredictions = prev.aiPredictions;

        if (nextState === 'Concluída' && !prev.trips.some((t) => t.proposalId === proposalId)) {
          const platform = prev.platforms.find((pl) => pl.id === target.input.platformId);
          const commPct = platform?.commissionPct ?? 25;
          const commissionEur = round2(target.input.grossValueEur * (commPct / 100));
          const opCost = target.analysis.operatingCostEur;
          const netEur = round2(
            target.input.grossValueEur +
              target.input.bonusEur -
              commissionEur -
              opCost
          );
          const curMarket =
            prev.countries.find((c) => c.code === prev.localization.selectedMarketCode) ??
            prev.countries[0];

          const newTrip: TripRecord = {
            id: `trip-${Date.now()}`,
            externalRef: `${target.input.platformId.toUpperCase().slice(0, 2)}-${String(Date.now()).slice(-5)}`,
            platformId: target.input.platformId,
            vehicleId: prev.vehicles.find((v) => v.isActiveDriverVehicle)?.id ?? prev.vehicles[0].id,
            date: now.slice(0, 10),
            time: now.slice(11, 16),
            grossEur: target.input.grossValueEur,
            tipEur: 0,
            bonusEur: target.input.bonusEur,
            tollsEur: target.input.tollsEur,
            commissionEur,
            operationalCostEur: opCost,
            netEur,
            currency: curMarket?.currency ?? 'EUR',
            originalGrossAmount: target.input.grossValueEur,
            originalNetAmount: netEur,
            countryCode: curMarket?.code ?? 'PT',
            pickupDistanceKm: target.input.pickupDistanceKm,
            tripDistanceKm: target.input.tripDistanceKm,
            durationMin: target.analysis.totalTimeMin,
            pickupZone: target.input.region,
            pickupAddress: target.input.pickupAddress,
            destinationZone: target.input.destinationAddress ? target.input.destinationAddress : 'Destino concluído',
            destinationAddress: target.input.destinationAddress,
            category: target.input.category,
            status: 'Concluída',
            preDecisionSnapshot: {
              predictedNetEur: target.analysis.estimatedNetEur,
              predictedDurationMin: target.analysis.totalTimeMin,
              predictedClassification: target.analysis.classification,
              recommendedAction: target.autoPilotDecision?.action ?? 'Decisão manual',
            },
            source: 'Manual',
            proposalId,
            isDemo: Boolean(prev.session.isDemoSession),
          };
          updatedTrips = [newTrip, ...prev.trips];
          updatedCampaigns = prev.campaigns.map((c) =>
            c.platformId === target.input.platformId && c.status === 'Ativa'
              ? { ...c, completedTrips: Math.min(c.targetTrips, c.completedTrips + 1) }
              : c
          );

          updatedPredictions = prev.aiPredictions.map((pr) =>
            pr.proposalId === proposalId && pr.driverId === prev.activeDriverUserId
              ? reconcilePredictionOutcome(pr, newTrip, prev.autoPilot.thresholds)
              : pr
          );

          if (prev.tachograph.activeSessionId) {
            const activeSess = prev.tachograph.sessions.find((s) => s.id === prev.tachograph.activeSessionId);
            if (activeSess) {
              const nextOdo = Math.round(activeSess.odometerCurrentKm + target.analysis.totalDistanceKm);
              const tStart = new Date(Date.now() - target.analysis.totalTimeMin * 60000).toISOString();
              const syncedAct: TachographActivityRecord = {
                id: `tac-trip-${Date.now()}`,
                shiftSessionId: activeSess.id,
                driverId: prev.activeDriverUserId,
                vehicleId: newTrip.vehicleId,
                operatorName: activeSess.operatorName,
                date: now.slice(0, 10),
                state: 'Condução em serviço',
                startIso: tStart,
                endIso: now,
                durationMinutes: target.analysis.totalTimeMin,
                odometerStartKm: activeSess.odometerCurrentKm,
                odometerEndKm: nextOdo,
                platformId: target.input.platformId,
                movementKind: 'Com passageiro',
                source: 'Sincronizado Viagem',
                notes: `Viagem ${newTrip.externalRef} concluída (${target.input.platformId.toUpperCase()}).`,
                status: 'Fechado',
                syncStatus: 'Sincronizado',
                idempotencyKey: `tach:trip:${newTrip.id}`,
                revisions: [],
                isDemo: Boolean(prev.session.isDemoSession),
              };
              updatedTachograph = {
                ...prev.tachograph,
                sessions: prev.tachograph.sessions.map((s) =>
                  s.id === activeSess.id ? { ...s, odometerCurrentKm: nextOdo } : s
                ),
                activities: [syncedAct, ...prev.tachograph.activities],
                platformIntervals: [
                  ...prev.tachograph.platformIntervals,
                  {
                    id: `pi-trip-${Date.now()}`,
                    platformId: target.input.platformId,
                    date: now.slice(0, 10),
                    startIso: tStart,
                    endIso: now,
                    kind: 'Viagem Passageiro',
                  },
                ],
              };
            }
          }

          updatedEvents = pushEvent(prev, {
            idempotencyKey: `trip_completed:prop:${proposalId}`,
            type: 'TRIP_COMPLETED',
            source: 'Proposal Service',
            target: 'Trip · Finance · AI CORE · Tachograph · Campaigns · Reports',
            userId: prev.activeDriverUserId,
            payloadSummary: `Proposta ${proposalId} concluída -> viagem ${newTrip.externalRef} (€${newTrip.grossEur.toFixed(2)}) sincronizada e aprendizagem calibrada.`,
          });
        }

        return {
          ...prev,
          proposals: updatedProposals,
          trips: updatedTrips,
          campaigns: updatedCampaigns,
          tachograph: updatedTachograph,
          aiPredictions: updatedPredictions,
          events: updatedEvents,
        };
      });
    },

    updateAutoPilotConfig: (patch) =>
      setState((prev) => {
        const nextCanonical = normalizeCanonicalStrategyMode(
          patch.mode ?? prev.autoPilot.mode,
          patch.strategyMode ?? prev.autoPilot.strategyMode
        );
        const nextThresholds = patch.thresholds ?? prev.autoPilot.thresholds;
        const nextModeConfigs = {
          ...(prev.autoPilot.modeConfigs ?? {
            Manual: prev.autoPilot.thresholds,
            Semiautomático: prev.autoPilot.thresholds,
            Automático: prev.autoPilot.thresholds,
          }),
          [nextCanonical]: nextThresholds,
        };
        return {
          ...prev,
          autoPilot: {
            ...prev.autoPilot,
            ...patch,
            mode: nextCanonical,
            strategyMode: nextCanonical,
            thresholds: nextThresholds,
            modeConfigs: patch.modeConfigs ?? nextModeConfigs,
          },
          auditLogs: pushAudit(
            prev,
            'Configuração Estratégia',
            'AutoPilot Unificado',
            `Modo: ${nextCanonical}`,
            prev.activeDriverUserId
          ),
        };
      }),

    setStrategyMode: (mode) =>
      setState((prev) => {
        const modeConfigs = prev.autoPilot.modeConfigs ?? {
          Manual: prev.autoPilot.thresholds,
          Semiautomático: prev.autoPilot.thresholds,
          Automático: prev.autoPilot.thresholds,
        };
        const targetThresholds = modeConfigs[mode] ?? prev.autoPilot.thresholds;
        return {
          ...prev,
          autoPilot: {
            ...prev.autoPilot,
            strategyMode: mode,
            mode,
            thresholds: { ...targetThresholds },
            modeConfigs,
          },
          auditLogs: pushAudit(
            prev,
            'Mudança Modo Estratégia',
            'AutoPilot Unificado',
            `Alterado para ${mode}`,
            prev.activeDriverUserId
          ),
        };
      }),

    saveStrategyPreset: (name) =>
      setState((prev) => {
        const cleanName = name.trim();
        if (!cleanName) return prev;
        const curMode: StrategyMode = normalizeCanonicalStrategyMode(prev.autoPilot.mode, prev.autoPilot.strategyMode);
        const newPreset = {
          id: `preset-${Date.now()}`,
          name: cleanName,
          mode: curMode,
          thresholds: { ...prev.autoPilot.thresholds },
          semiAutoBounds: prev.autoPilot.semiAutoBounds,
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        return {
          ...prev,
          autoPilotSavedCount: prev.autoPilotSavedCount + 1,
          autoPilot: {
            ...prev.autoPilot,
            savedPresets: [newPreset, ...(prev.autoPilot.savedPresets ?? [])],
          },
        };
      }),

    applyStrategyPreset: (presetId) =>
      setState((prev) => {
        const preset = (prev.autoPilot.savedPresets ?? []).find((p) => p.id === presetId);
        if (!preset) return prev;
        return {
          ...prev,
          autoPilot: {
            ...prev.autoPilot,
            strategyMode: preset.mode,
            mode: preset.mode,
            thresholds: { ...preset.thresholds },
            semiAutoBounds: preset.semiAutoBounds ?? prev.autoPilot.semiAutoBounds,
            modeConfigs: {
              ...(prev.autoPilot.modeConfigs ?? {
                Manual: prev.autoPilot.thresholds,
                Semiautomático: prev.autoPilot.thresholds,
                Automático: prev.autoPilot.thresholds,
              }),
              [preset.mode]: { ...preset.thresholds },
            },
          },
        };
      }),

    deleteStrategyPreset: (presetId) =>
      setState((prev) => ({
        ...prev,
        autoPilot: {
          ...prev.autoPilot,
          savedPresets: (prev.autoPilot.savedPresets ?? []).filter((p) => p.id !== presetId),
        },
      })),

    runSemiAutoCalibration: () => {
      const outcome = evaluateSemiAutoAdjustment({
        autoPilot: state.autoPilot,
        recentTrips: activeDriverTrips,
        activeCampaigns: state.campaigns,
      });
      if (!outcome.recommendedPatch || !outcome.logEntry) {
        return { applied: false, rationale: outcome.rationale };
      }
      setState((prev) => {
        const nextThresholds = { ...prev.autoPilot.thresholds, ...outcome.recommendedPatch };
        const entry = {
          ...outcome.logEntry!,
          id: `adj-${Date.now()}`,
          timestamp: new Date().toISOString(),
          reverted: false,
        };
        const curMode = prev.autoPilot.strategyMode ?? 'Semiautomático';
        return {
          ...prev,
          autoPilot: {
            ...prev.autoPilot,
            thresholds: nextThresholds,
            modeConfigs: {
              ...(prev.autoPilot.modeConfigs ?? {
                Manual: prev.autoPilot.thresholds,
                Semiautomático: prev.autoPilot.thresholds,
                Automático: prev.autoPilot.thresholds,
              }),
              [curMode]: nextThresholds,
            },
            adjustmentLogs: [entry, ...(prev.autoPilot.adjustmentLogs ?? [])].slice(0, 30),
          },
          events: pushEvent(prev, {
            idempotencyKey: `strategy_adj:${entry.id}`,
            type: 'STRATEGY_ADJUSTED',
            source: 'AIVAD AI CORE Strategy',
            target: 'Estratégia das Aplicações · Calculadora',
            userId: prev.activeDriverUserId,
            payloadSummary: `${entry.parameterLabel}: ${entry.previousValue} -> ${entry.newValue} (${entry.conditionTriggered})`,
          }),
          auditLogs: pushAudit(
            prev,
            'Ajuste Estratégia Semiautomática',
            entry.parameterLabel,
            `${entry.previousValue} -> ${entry.newValue}: ${entry.reason}`,
            prev.activeDriverUserId
          ),
        };
      });
      return { applied: true, rationale: outcome.rationale };
    },

    undoStrategyAdjustment: (adjustmentId) =>
      setState((prev) => {
        const log = (prev.autoPilot.adjustmentLogs ?? []).find((a) => a.id === adjustmentId);
        if (!log || log.reverted) return prev;
        const nextThresholds = {
          ...prev.autoPilot.thresholds,
          [log.parameter]: log.previousValue,
        };
        const curMode = prev.autoPilot.strategyMode ?? 'Semiautomático';
        return {
          ...prev,
          autoPilot: {
            ...prev.autoPilot,
            thresholds: nextThresholds,
            modeConfigs: {
              ...(prev.autoPilot.modeConfigs ?? {
                Manual: prev.autoPilot.thresholds,
                Semiautomático: prev.autoPilot.thresholds,
                Automático: prev.autoPilot.thresholds,
              }),
              [curMode]: nextThresholds,
            },
            adjustmentLogs: (prev.autoPilot.adjustmentLogs ?? []).map((a) =>
              a.id === adjustmentId ? { ...a, reverted: true, observedOutcome: 'Revertido manualmente pelo motorista' } : a
            ),
          },
          events: pushEvent(prev, {
            idempotencyKey: `strategy_undo:${adjustmentId}`,
            type: 'STRATEGY_ADJUSTED',
            source: 'Driver Strategy Undo',
            target: 'Estratégia das Aplicações · Auditoria',
            userId: prev.activeDriverUserId,
            payloadSummary: `Ajuste ${log.parameterLabel} revertido de ${log.newValue} para ${log.previousValue}.`,
          }),
          auditLogs: pushAudit(
            prev,
            'Reversão Ajuste Estratégia',
            log.parameterLabel,
            `Revertido para ${log.previousValue}`,
            prev.activeDriverUserId
          ),
        };
      }),

    updateOverlayConfig: (patch, options) =>
      setState((prev) => ({
        ...prev,
        floatingConfigSavedCount: options?.markSaved
          ? prev.floatingConfigSavedCount + 1
          : prev.floatingConfigSavedCount,
        overlayConfig: {
          ...prev.overlayConfig,
          ...patch,
          position: normalizeFloatingCardPosition(patch.position ?? prev.overlayConfig.position),
          classificationProfiles: patch.classificationProfiles ?? prev.overlayConfig.classificationProfiles,
        },
      })),

    updateFloatingTierConfig: (tier, patch, options) =>
      setState((prev) => {
        const currentTier = resolveFloatingTierConfig(prev.overlayConfig, tier);
        const existingProfiles =
          prev.overlayConfig.classificationProfiles ?? createDefaultClassificationProfiles();
        const updatedTier: FloatingCardTierStyleConfig = {
          ...currentTier,
          ...patch,
          tierKey: tier,
          operationalMeaning: currentTier.operationalMeaning,
          position: normalizeFloatingCardPosition(patch.position ?? currentTier.position),
          visibleMetrics: Array.isArray(patch.visibleMetrics)
            ? [...patch.visibleMetrics]
            : [...currentTier.visibleMetrics],
        };
        return {
          ...prev,
          floatingConfigSavedCount: options?.markSaved
            ? prev.floatingConfigSavedCount + 1
            : prev.floatingConfigSavedCount,
          overlayConfig: {
            ...prev.overlayConfig,
            classificationProfiles: {
              ...existingProfiles,
              [tier]: updatedTier,
            },
          },
        };
      }),

    resetFloatingTierConfigs: () =>
      setState((prev) => ({
        ...prev,
        overlayConfig: {
          ...SEED_OVERLAY_CONFIG,
          classificationProfiles: createDefaultClassificationProfiles(),
        },
      })),

    updateFloatingDockConfig: (patch) =>
      setState((prev) => ({
        ...prev,
        floatingDockConfig: {
          ...prev.floatingDockConfig,
          ...patch,
        },
      })),

    updateTripPostAcceptanceActual: (tripId, actualPatch) =>
      setState((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => {
          if (t.id !== tripId) return t;
          const prevActual: TripPostAcceptanceActual = t.postAcceptanceActual ?? {
            hasObservedActuals: false,
            navigationAppUsed: 'Nenhum',
            observationSource: 'Sem dados reais observados',
          };
          const merged: TripPostAcceptanceActual = {
            ...prevActual,
            ...actualPatch,
          };
          const hasKm =
            merged.pickupDistanceKm !== undefined &&
            merged.pickupDistanceKm !== null &&
            merged.tripDistanceKm !== undefined &&
            merged.tripDistanceKm !== null;
          const hasMin =
            merged.pickupTimeMin !== undefined &&
            merged.pickupTimeMin !== null &&
            merged.tripTimeMin !== undefined &&
            merged.tripTimeMin !== null;
          if (merged.totalDistanceKm === undefined || merged.totalDistanceKm === null) {
            if (hasKm) {
              merged.totalDistanceKm = round2((merged.pickupDistanceKm ?? 0) + (merged.tripDistanceKm ?? 0));
            }
          }
          if (merged.totalTimeMin === undefined || merged.totalTimeMin === null) {
            if (hasMin) {
              merged.totalTimeMin = Math.round((merged.pickupTimeMin ?? 0) + (merged.tripTimeMin ?? 0));
            }
          }
          const anyActual =
            Boolean(merged.hasObservedActuals) ||
            merged.pickupDistanceKm != null ||
            merged.tripDistanceKm != null ||
            merged.pickupTimeMin != null ||
            merged.tripTimeMin != null ||
            merged.totalTimeMin != null ||
            merged.totalDistanceKm != null;
          merged.hasObservedActuals = anyActual;
          if (anyActual && (!merged.observationSource || merged.observationSource === 'Sem dados reais observados')) {
            merged.observationSource = 'Registo manual do motorista';
          }
          return {
            ...t,
            postAcceptanceActual: merged,
          };
        }),
      })),

    addTripFareAdjustment: (tripId, adj) =>
      setState((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => {
          if (t.id !== tripId) return t;
          const entry: TripFareAdjustmentRecord = {
            id: `adj-${Date.now()}`,
            recordedAtIso: new Date().toISOString(),
            amountEur: round2(adj.amountEur),
            reason: adj.reason.trim() || 'Ajuste por atraso / tempo adicional',
            status: adj.status,
            evidenceNote: adj.evidenceNote,
          };
          const list = [...(t.fareAdjustments ?? []), entry];
          const confirmedExtra = list
            .filter((a) => a.status === 'Confirmado pela plataforma')
            .reduce((s, a) => s + a.amountEur, 0);
          return {
            ...t,
            initialPresentedGrossEur: t.initialPresentedGrossEur ?? t.estimatedGrossEur ?? t.grossEur,
            fareAdjustments: list,
            confirmedFinalGrossEur: round2(t.grossEur + confirmedExtra),
          };
        }),
      })),

    resolveTripFareAdjustmentStatus: (tripId, adjustmentId, status) =>
      setState((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => {
          if (t.id !== tripId) return t;
          const list = (t.fareAdjustments ?? []).map((a) =>
            a.id === adjustmentId ? { ...a, status } : a
          );
          const confirmedExtra = list
            .filter((a) => a.status === 'Confirmado pela plataforma')
            .reduce((s, a) => s + a.amountEur, 0);
          return {
            ...t,
            fareAdjustments: list,
            confirmedFinalGrossEur: round2(t.grossEur + confirmedExtra),
          };
        }),
      })),

    completeTrip: (trip) => {
      const platform = state.platforms.find((p) => p.id === trip.platformId);
      const commPct = platform?.commissionPct ?? 25;
      const isCompleted = isCompletedTripStatus(trip.status);
      const commissionEur = isCompleted ? round2(trip.grossEur * (commPct / 100)) : 0;
      const operationalCostEur = isCompleted
        ? round2((trip.pickupDistanceKm + trip.tripDistanceKm) * 0.12 + trip.tollsEur)
        : 0;
      const netEur = isCompleted
        ? round2(trip.grossEur + trip.tipEur + trip.bonusEur - commissionEur - operationalCostEur)
        : 0;
      const record: TripRecord = {
        ...trip,
        id: `trip-${Date.now()}`,
        currency: trip.currency ?? activeMarket.currency,
        originalGrossAmount: trip.originalGrossAmount ?? trip.grossEur,
        originalNetAmount: trip.originalNetAmount ?? netEur,
        countryCode: trip.countryCode ?? activeMarket.code,
        commissionEur,
        operationalCostEur,
        netEur,
        isDemo: trip.isDemo ?? Boolean(state.session.isDemoSession),
      };
      setState((prev) => {
        let updatedTachograph = prev.tachograph;
        if (isCompleted && prev.tachograph.activeSessionId) {
          const activeSess = prev.tachograph.sessions.find((s) => s.id === prev.tachograph.activeSessionId);
          if (activeSess) {
            const addedKm = Math.round(record.pickupDistanceKm + record.tripDistanceKm);
            const nextOdo = activeSess.odometerCurrentKm + addedKm;
            const nowIso = new Date().toISOString();
            const startIso = new Date(Date.now() - record.durationMin * 60000).toISOString();
            const tAct: TachographActivityRecord = {
              id: `tac-trip-${Date.now()}`,
              shiftSessionId: activeSess.id,
              driverId: prev.activeDriverUserId,
              vehicleId: record.vehicleId,
              operatorName: activeSess.operatorName,
              date: record.date,
              state: 'Condução em serviço',
              startIso,
              endIso: nowIso,
              durationMinutes: record.durationMin,
              odometerStartKm: activeSess.odometerCurrentKm,
              odometerEndKm: nextOdo,
              platformId: record.platformId,
              movementKind: 'Com passageiro',
              source: 'Sincronizado Viagem',
              notes: `Viagem ${record.externalRef} (${record.platformId.toUpperCase()}).`,
              status: 'Fechado',
              syncStatus: 'Sincronizado',
              idempotencyKey: `tach:trip:${record.id}`,
              revisions: [],
              isDemo: Boolean(prev.session.isDemoSession),
            };
            updatedTachograph = {
              ...prev.tachograph,
              sessions: prev.tachograph.sessions.map((s) =>
                s.id === activeSess.id ? { ...s, odometerCurrentKm: nextOdo } : s
              ),
              activities: [tAct, ...prev.tachograph.activities],
              platformIntervals: [
                ...prev.tachograph.platformIntervals,
                {
                  id: `pi-${record.id}`,
                  platformId: record.platformId,
                  date: record.date,
                  startIso,
                  endIso: nowIso,
                  kind: 'Viagem Passageiro',
                },
              ],
            };
          }
        }

        const newPred: AiPredictionRecord[] =
          isCompleted && record.preDecisionSnapshot
            ? [
                reconcilePredictionOutcome(
                  {
                    id: `pred-${Date.now()}`,
                    driverId: prev.activeDriverUserId,
                    tripId: record.id,
                    createdAt: new Date().toISOString(),
                    agentId: 'corridas',
                    predictedNetEur: record.preDecisionSnapshot.predictedNetEur,
                    predictedDurationMin: record.preDecisionSnapshot.predictedDurationMin,
                    predictedEurPerHour: round2(
                      (record.preDecisionSnapshot.predictedNetEur /
                        Math.max(1, record.preDecisionSnapshot.predictedDurationMin)) *
                        60
                    ),
                    status: 'Pendente resultado',
                    learningNote: '',
                    epistemicTag: 'Previsão',
                  },
                  record
                ),
                ...prev.aiPredictions,
              ].slice(0, 60)
            : prev.aiPredictions;

        return {
          ...prev,
          trips: [record, ...prev.trips],
          campaigns: isCompleted
            ? prev.campaigns.map((c) =>
                c.platformId === trip.platformId && c.status === 'Ativa'
                  ? { ...c, completedTrips: Math.min(c.targetTrips, c.completedTrips + 1) }
                  : c
              )
            : prev.campaigns,
          tachograph: updatedTachograph,
          aiPredictions: newPred,
          events: pushEvent(prev, {
            idempotencyKey: `trip_completed:${record.externalRef}`,
            type: 'TRIP_COMPLETED',
            source: 'Trip Service',
            target: 'Finance · AI CORE · Tachograph · Reports',
            userId: prev.activeDriverUserId,
            payloadSummary: `Viagem ${record.externalRef} (${record.status}, ${record.grossEur.toFixed(2)} ${record.currency}) registada.`,
          }),
        };
      });
      return record;
    },

    updateTripStatus: (tripId, status, extra) =>
      setState((prev) => ({
        ...prev,
        trips: prev.trips.map((t) =>
          t.id === tripId
            ? {
                ...t,
                status,
                cancellationBy: extra?.cancellationBy ?? t.cancellationBy,
                cancellationReason: extra?.cancellationReason ?? t.cancellationReason,
              }
            : t
        ),
        auditLogs: pushAudit(
          prev,
          'Estado da Corrida',
          tripId,
          `Estado atualizado para "${status}"${extra?.cancellationBy ? ` (${extra.cancellationBy})` : ''}`,
          prev.activeDriverUserId
        ),
      })),

    addExpense: (expense) =>
      setState((prev) => ({
        ...prev,
        expenses: [
          {
            ...expense,
            currency: expense.currency ?? activeMarket.currency,
            originalAmount: expense.originalAmount ?? expense.amountEur,
            id: `exp-${Date.now()}`,
            isDemo: Boolean(prev.session.isDemoSession),
          },
          ...prev.expenses,
        ],
      })),

    toggleDriverPlatformActivation: (platformId) =>
      setState((prev) => {
        const targetPlat = prev.platforms.find((p) => p.id === platformId);
        const sameCountry =
          prev.localization.currentLocation.countryCode.toUpperCase() ===
          prev.localization.selectedMarketCode.toUpperCase();
        if (
          !targetPlat ||
          !isPlatformOperationalInLocation(
            targetPlat,
            prev.localization.selectedMarketCode,
            sameCountry ? prev.localization.currentLocation.region : undefined,
            sameCountry ? prev.localization.currentLocation.city : undefined
          )
        ) {
          return prev;
        }
        const exists = prev.driverDeactivatedPlatformIds.includes(platformId);
        const nextIds = exists
          ? prev.driverDeactivatedPlatformIds.filter((id) => id !== platformId)
          : [...prev.driverDeactivatedPlatformIds, platformId];
        const platName = targetPlat.name ?? platformId;
        const notif: NotificationRecord = {
          id: `ntf-drv-plat-${Date.now()}`,
          title: exists ? `Plataforma ${platName} reativada` : `Plataforma ${platName} desativada por si`,
          body: exists
            ? 'Voltou a estar ativa nos seletores de operação, propostas e cálculo.'
            : 'Ocultada das operações ativas, seletores e notificações. Todo o histórico de viagens e relatórios foi preservado.',
          category: 'Sistema',
          targetUserId: prev.activeDriverUserId,
          createdAt: new Date().toISOString(),
          delivered: true,
          read: false,
          sourceModule: 'Aplicações e Integrações',
        };
        return {
          ...prev,
          driverDeactivatedPlatformIds: nextIds,
          notifications: [notif, ...prev.notifications],
          events: pushEvent(prev, {
            idempotencyKey: `drv_plat_toggle:${platformId}:${!exists}:${Date.now()}`,
            type: 'PLATFORM_STATUS_CHANGED',
            source: 'Driver Apps Settings',
            target: 'Selectors · KPIs · History (Preserved)',
            userId: prev.activeDriverUserId,
            payloadSummary: `${platName} ${exists ? 'reativada' : 'desativada'} pelo motorista sem apagar histórico.`,
          }),
        };
      }),

    getPlatformLifecycleState: (platformId) => {
      const sameCountry =
        state.localization.currentLocation.countryCode.toUpperCase() ===
        state.localization.selectedMarketCode.toUpperCase();
      return getPlatformLifecycleStateHelper(
        platformId,
        state.platforms,
        state.driverDeactivatedPlatformIds,
        state.localization.selectedMarketCode,
        sameCountry ? state.localization.currentLocation.region : undefined,
        sameCountry ? state.localization.currentLocation.city : undefined
      );
    },

    captureExternalEvent: (payload) => {
      const outcome = reconcileCapturedEvent(
        {
          ...payload,
          isDemo: Boolean(state.session.isDemoSession),
        },
        state.captures,
        state.trips
      );
      setState((prev) => {
        const nextTrips = outcome.updatedTrip
          ? prev.trips.map((t) => (t.id === outcome.updatedTrip!.id ? outcome.updatedTrip! : t))
          : prev.trips;
        const nextCampaigns = outcome.createdCampaign
          ? [outcome.createdCampaign, ...prev.campaigns]
          : prev.campaigns;
        const nextEvents = outcome.updatedTrip
          ? pushEvent(prev, {
              idempotencyKey: `tip_reconciled:${outcome.captureRecord.dedupKey}`,
              type: 'TIP_RECONCILED',
              source: 'Smart Data Capture',
              target: 'Trip Service · Finance · Reports',
              userId: prev.activeDriverUserId,
              payloadSummary: `Gorjeta €${payload.amountEur.toFixed(2)} reconciliada na viagem ${outcome.updatedTrip.externalRef}.`,
            })
          : outcome.createdCampaign
          ? pushEvent(prev, {
              idempotencyKey: `campaign_identified:${outcome.captureRecord.dedupKey}`,
              type: 'CAMPAIGN_IDENTIFIED',
              source: 'Smart Data Capture',
              target: 'Campaigns · Planner · Notifications',
              userId: prev.activeDriverUserId,
              payloadSummary: `Campanha ${outcome.createdCampaign.name} adicionada automaticamente.`,
            })
          : prev.events;

        return {
          ...prev,
          captures: [outcome.captureRecord, ...prev.captures],
          trips: nextTrips,
          campaigns: nextCampaigns,
          events: nextEvents,
        };
      });

      return {
        isDuplicate: outcome.isDuplicate,
        status: outcome.captureRecord.status,
        message: outcome.isDuplicate
          ? 'Duplicação detetada pelo motor idempotente — registo ignorado com segurança.'
          : outcome.updatedTrip
          ? `Gorjeta associada à viagem ${outcome.updatedTrip.externalRef} sem duplicar viagem.`
          : outcome.createdCampaign
          ? 'Campanha registada na Central de Campanhas e Planeador.'
          : outcome.needsManualConfirmation
          ? 'Sem viagem correspondente encontrada — guardado como Pendente de confirmação.'
          : 'Evento interpretado e catalogado no Smart Data Capture.',
      };
    },

    confirmPendingCapture: (captureId, targetTripId) =>
      setState((prev) => {
        const cap = prev.captures.find((c) => c.id === captureId);
        const trip = prev.trips.find((t) => t.id === targetTripId);
        if (!cap || !trip) return prev;
        return {
          ...prev,
          captures: prev.captures.map((c) =>
            c.id === captureId ? { ...c, status: 'Associado', matchedTripId: trip.id } : c
          ),
          trips: prev.trips.map((t) =>
            t.id === trip.id
              ? {
                  ...t,
                  tipEur: round2(t.tipEur + cap.amountEur),
                  netEur: round2(t.netEur + cap.amountEur),
                  status: 'Ajustada',
                }
              : t
          ),
          events: pushEvent(prev, {
            idempotencyKey: `tip_manual_confirm:${captureId}:${trip.id}`,
            type: 'TIP_RECONCILED',
            source: 'Smart Data Capture',
            target: 'Trip · Finance · Reports',
            userId: prev.activeDriverUserId,
            payloadSummary: `Pendente ${cap.id} associado manualmente à viagem ${trip.externalRef}.`,
          }),
        };
      }),

    addShift: (shift) =>
      setState((prev) => ({
        ...prev,
        shifts: [
          {
            ...shift,
            id: `shf-${Date.now()}`,
            auditHistory: [{ at: new Date().toISOString(), change: 'Turno registado pelo motorista.' }],
            isDemo: Boolean(prev.session.isDemoSession),
          },
          ...prev.shifts,
        ],
      })),

    updateShiftNotes: (shiftId, notes) =>
      setState((prev) => ({
        ...prev,
        shifts: prev.shifts.map((s) =>
          s.id === shiftId
            ? {
                ...s,
                notes,
                auditHistory: [
                  ...s.auditHistory,
                  { at: new Date().toISOString(), change: `Notas atualizadas: "${notes}"` },
                ],
              }
            : s
        ),
      })),

    addSavedPlace: (place) =>
      setState((prev) => ({
        ...prev,
        savedPlaces: [{ ...place, id: `plc-${Date.now()}` }, ...prev.savedPlaces],
      })),

    updateSavedPlace: (id, patch) =>
      setState((prev) => ({
        ...prev,
        savedPlaces: prev.savedPlaces.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      })),

    deleteSavedPlace: (id) =>
      setState((prev) => ({
        ...prev,
        savedPlaces: prev.savedPlaces.filter((p) => p.id !== id),
      })),

    togglePlaceFavorite: (id) =>
      setState((prev) => ({
        ...prev,
        savedPlaces: prev.savedPlaces.map((p) =>
          p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
        ),
      })),

    updateRoutinePreferences: (patch) =>
      setState((prev) => ({
        ...prev,
        routinePreferences: { ...prev.routinePreferences, ...patch },
      })),

    addCampaign: (campaign) =>
      setState((prev) => ({
        ...prev,
        campaigns: [{ ...campaign, id: `cmp-${Date.now()}`, isDemo: Boolean(prev.session.isDemoSession) }, ...prev.campaigns],
      })),

    addVehicle: (vehicle) =>
      setState((prev) => ({
        ...prev,
        vehicles: [{ ...vehicle, id: `veh-${Date.now()}`, isDemo: Boolean(prev.session.isDemoSession) }, ...prev.vehicles],
      })),

    updateVehicle: (vehicleId, patch) =>
      setState((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) => (v.id === vehicleId ? { ...v, ...patch } : v)),
      })),

    setActiveVehicle: (vehicleId) =>
      setState((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) => ({
          ...v,
          isActiveDriverVehicle: v.id === vehicleId,
        })),
      })),

    toggleZonePreference: (zoneId, pref) =>
      setState((prev) => ({
        ...prev,
        zones: prev.zones.map((z) => (z.id === zoneId ? { ...z, preference: pref } : z)),
      })),

    addZoneObservation: async (input) => {
      const outcome = createDriverZoneObservation({
        ...input,
        countryCode: activeMarket.code,
        driverId: activeDriver.id,
        existingObservations: state.zoneObservations,
        isDemo: Boolean(state.session.isDemoSession),
      });
      if (!outcome.ok || !outcome.observation) {
        return { ok: false, error: outcome.error };
      }
      let savedObs = outcome.observation;
      try {
        const res = await fetch('/api/zones/observations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            zoneId: input.zoneId,
            zoneName: input.zoneName,
            city: input.city,
            countryCode: activeMarket.code,
            privacyConsent: input.privacyConsent,
            observationType: input.observationType,
            description: input.description,
            dayOfWeek: input.dayOfWeek,
            timeWindow: input.timeWindow,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.observation) savedObs = data.observation as DriverZoneObservation;
        }
      } catch {
        // Keep local observation even if offline
      }
      setState((prev) => ({
        ...prev,
        zoneObservations: [savedObs, ...prev.zoneObservations],
      }));
      return { ok: true };
    },

    addPassengerReview: (review) =>
      setState((prev) => ({
        ...prev,
        reviews: [
          {
            ...review,
            id: `rev-${Date.now()}`,
            createdAt: new Date().toISOString(),
            sentViaOfficialApi: false,
            isDemo: Boolean(prev.session.isDemoSession),
          },
          ...prev.reviews,
        ],
      })),

    incrementReviewCopy: (reviewId) =>
      setState((prev) => ({
        ...prev,
        reviews: prev.reviews.map((r) =>
          r.id === reviewId ? { ...r, copiedCount: r.copiedCount + 1 } : r
        ),
      })),

    toggleDashcamProtection: (clipId) =>
      setState((prev) => ({
        ...prev,
        dashcamClips: prev.dashcamClips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                protectedLock: !c.protectedLock,
                status: !c.protectedLock ? 'Armazenado Localmente' : 'Agendado para Eliminação',
              }
            : c
        ),
      })),

    addDashcamCapture: (tripId) =>
      setState((prev) => ({
        ...prev,
        dashcamClips: [
          {
            id: `dcam-${Date.now()}`,
            recordedAt: new Date().toISOString(),
            tripId,
            durationSec: 120,
            sizeMb: 148,
            resolution: '1440p',
            protectedLock: true,
            retentionDays: 30,
            privacyZoneMasked: true,
            status: 'Armazenado Localmente',
            isDemo: Boolean(prev.session.isDemoSession),
          },
          ...prev.dashcamClips,
        ],
      })),

    addDocument: (doc) =>
      setState((prev) => ({
        ...prev,
        documents: [{ ...doc, id: `doc-${Date.now()}`, isDemo: Boolean(prev.session.isDemoSession) }, ...prev.documents],
      })),

    markNotificationRead: (id) =>
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      })),

    addSuggestion: (s) =>
      setState((prev) => ({
        ...prev,
        suggestions: [
          {
            ...s,
            id: `sug-${Date.now()}`,
            votes: 1,
            status: 'Recebida',
            createdAt: new Date().toISOString().slice(0, 10),
          },
          ...prev.suggestions,
        ],
      })),

    voteSuggestion: (id) =>
      setState((prev) => ({
        ...prev,
        suggestions: prev.suggestions.map((s) =>
          s.id === id ? { ...s, votes: s.votes + 1 } : s
        ),
      })),

    createTicket: ({ subject, category, priority, message }) =>
      setState((prev) => {
        const driver = prev.users.find((u) => u.id === prev.activeDriverUserId) ?? prev.users[0];
        const newTicket: TicketRecord = {
          id: `TKT-${String(Date.now()).slice(-4)}`,
          userId: driver.id,
          userName: driver.name,
          subject,
          category,
          priority,
          status: 'Aberto',
          assignee: 'Triagem Suporte',
          slaHours: priority === 'Crítica' ? 2 : priority === 'Alta' ? 6 : 24,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: `msg-${Date.now()}`,
              sender: 'Motorista',
              senderName: driver.name,
              text: message,
              at: new Date().toISOString(),
            },
          ],
        };
        return {
          ...prev,
          tickets: [newTicket, ...prev.tickets],
        };
      }),

    replyToTicket: (ticketId, sender, text, internalNote = false) =>
      setState((prev) => {
        const driver = prev.users.find((u) => u.id === prev.activeDriverUserId) ?? prev.users[0];
        return {
          ...prev,
          tickets: prev.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  updatedAt: new Date().toISOString(),
                  messages: [
                    ...t.messages,
                    {
                      id: `msg-${Date.now()}`,
                      sender,
                      senderName: sender === 'Motorista' ? driver.name : `Equipa ${prev.activeAdminRole}`,
                      text,
                      internalNote,
                      at: new Date().toISOString(),
                    },
                  ],
                }
              : t
          ),
        };
      }),

    updateTicketStatus: (ticketId, status, assignee) =>
      setState((prev) => ({
        ...prev,
        tickets: prev.tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status,
                assignee: assignee ?? t.assignee,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
        auditLogs: pushAudit(prev, 'Atualização Ticket', ticketId, `Estado -> ${status}`),
      })),

    updatePlatformStatus: (platformId, status) =>
      setState((prev) => {
        const targetPlat = prev.platforms.find((p) => p.id === platformId);
        const shouldNotify = status === 'Suspensa' || status === 'Encerrada';
        const notif: NotificationRecord | null = shouldNotify
          ? {
              id: `ntf-plat-${Date.now()}`,
              title: `Plataforma ${targetPlat?.name ?? platformId} alterada para ${status}`,
              body: 'Novas operações nesta plataforma foram ocultadas. Todo o seu histórico de viagens e relatórios financeiros foi preservado integralmente.',
              category: 'Sistema',
              targetUserId: 'ALL',
              createdAt: new Date().toISOString(),
              delivered: true,
              read: false,
              sourceModule: 'Administração de Plataformas',
            }
          : null;

        const nextPlatforms = prev.platforms.map((p) => (p.id === platformId ? { ...p, status } : p));
        void fetch('/api/management/catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ countries: prev.countries, platforms: nextPlatforms }),
        }).catch(() => undefined);

        return {
          ...prev,
          platforms: nextPlatforms,
          notifications: notif ? [notif, ...prev.notifications] : prev.notifications,
          events: pushEvent(prev, {
            idempotencyKey: `platform_status:${platformId}:${status}:${Date.now()}`,
            type: 'PLATFORM_STATUS_CHANGED',
            source: 'Admin Platform Service',
            target: 'Driver Menus · Calculator · Reports · Notifications (History Preserved)',
            userId: 'ADMIN',
            payloadSummary: `Plataforma ${platformId} alterada para ${status}. Histórico preservado e utilizadores notificados.`,
          }),
          auditLogs: pushAudit(prev, 'Estado de Plataforma', platformId, `Alterado para ${status}`),
        };
      }),

    addPlatform: (platform) =>
      setState((prev) => {
        const nextPlatforms = [...prev.platforms, { ...platform, isDemo: true }];
        void fetch('/api/management/catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ countries: prev.countries, platforms: nextPlatforms }),
        }).catch(() => undefined);
        return {
          ...prev,
          platforms: nextPlatforms,
          auditLogs: pushAudit(prev, 'Nova Plataforma', platform.name, `Adicionada ao catálogo (${platform.status})`),
        };
      }),

    updatePlatformCountryOperation: (platformId, countryCode, patch) =>
      setState((prev) => {
        const nextPlatforms = prev.platforms.map((p) =>
          p.id === platformId ? upsertPlatformCountryOperation(p, countryCode, patch) : p
        );
        const validatedForCountry = getValidatedPlatformsForLocation(nextPlatforms, countryCode);
        const nextCountries = prev.countries.map((c) =>
          c.code.toUpperCase() === countryCode.toUpperCase()
            ? { ...c, activePlatforms: validatedForCountry }
            : c
        );
        void fetch('/api/management/catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ countries: nextCountries, platforms: nextPlatforms }),
        }).catch(() => undefined);

        const isCurrentDriverCountry =
          prev.localization.selectedMarketCode.toUpperCase() === countryCode.toUpperCase();
        const sameCountry =
          prev.localization.currentLocation.countryCode.toUpperCase() ===
          prev.localization.selectedMarketCode.toUpperCase();
        const operationalSet = new Set(
          getValidatedPlatformsForLocation(
            nextPlatforms,
            prev.localization.selectedMarketCode,
            sameCountry ? prev.localization.currentLocation.region : undefined,
            sameCountry ? prev.localization.currentLocation.city : undefined
          )
        );
        const nextDeactivated = isCurrentDriverCountry
          ? prev.driverDeactivatedPlatformIds.filter((id) => operationalSet.has(id))
          : prev.driverDeactivatedPlatformIds;

        return {
          ...prev,
          platforms: nextPlatforms,
          countries: nextCountries,
          driverDeactivatedPlatformIds: nextDeactivated,
          adminRevalidationCount: prev.adminRevalidationCount + 1,
          auditLogs: pushAudit(
            prev,
            'Operação Plataforma por País',
            `${platformId.toUpperCase()} (${countryCode.toUpperCase()})`,
            `Estado local -> ${patch.operationalStatus} | Fonte: ${patch.validationSource}`
          ),
        };
      }),

    revalidatePlatformCountryOperation: (platformId, countryCode, validationSource) =>
      setState((prev) => {
        const target = prev.platforms.find((p) => p.id === platformId);
        const existingOp = target?.countryOperations?.find(
          (o) => o.countryCode.toUpperCase() === countryCode.toUpperCase()
        );
        if (!target || !existingOp) return prev;
        const today = new Date().toISOString().slice(0, 10);
        const nextPlatforms = prev.platforms.map((p) =>
          p.id === platformId
            ? upsertPlatformCountryOperation(p, countryCode, {
                operationalStatus: existingOp.operationalStatus,
                preselectForDrivers: existingOp.preselectForDrivers,
                regions: existingOp.regions,
                cities: existingOp.cities,
                licensingNote: existingOp.licensingNote,
                validationSource: validationSource || existingOp.validationSource,
                verifiedAt: today,
                nextReviewAt: computeNextReviewDate(today),
                changeNote: `Revalidação administrativa executada em ${today} (${existingOp.operationalStatus}).`,
              })
            : p
        );
        const validatedForCountry = getValidatedPlatformsForLocation(nextPlatforms, countryCode);
        const nextCountries = prev.countries.map((c) =>
          c.code.toUpperCase() === countryCode.toUpperCase()
            ? { ...c, activePlatforms: validatedForCountry }
            : c
        );
        void fetch('/api/management/catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ countries: nextCountries, platforms: nextPlatforms }),
        }).catch(() => undefined);
        return {
          ...prev,
          platforms: nextPlatforms,
          countries: nextCountries,
          adminRevalidationCount: prev.adminRevalidationCount + 1,
          auditLogs: pushAudit(
            prev,
            'Revalidação de Operação por País',
            `${platformId.toUpperCase()} (${countryCode.toUpperCase()})`,
            `Verificação renovada em ${today} · Próx. revisão ${computeNextReviewDate(today)}`
          ),
        };
      }),

    revalidateCountryMarket: (countryCode, validationSource) =>
      setState((prev) => {
        const today = new Date().toISOString().slice(0, 10);
        const nextReview = computeNextReviewDate(today);
        const nextCountries = prev.countries.map((c) =>
          c.code.toUpperCase() === countryCode.toUpperCase()
            ? {
                ...c,
                verifiedAt: today,
                nextReviewAt: nextReview,
                validationSource: validationSource || c.validationSource || 'Revisão Administrativa AIVAD',
              }
            : c
        );
        void fetch('/api/management/catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ countries: nextCountries, platforms: prev.platforms }),
        }).catch(() => undefined);
        return {
          ...prev,
          countries: nextCountries,
          adminRevalidationCount: prev.adminRevalidationCount + 1,
          auditLogs: pushAudit(
            prev,
            'Revalidação de Mercado Internacional',
            countryCode.toUpperCase(),
            `Verificação renovada em ${today} · Próx. revisão ${nextReview}`
          ),
        };
      }),

    addCountryMarket: (country) =>
      setState((prev) => {
        const nextCountries = [country, ...prev.countries];
        void fetch('/api/management/catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ countries: nextCountries, platforms: prev.platforms }),
        }).catch(() => undefined);
        return {
          ...prev,
          countries: nextCountries,
          events: pushEvent(prev, {
            idempotencyKey: `market_added:${country.code}:${Date.now()}`,
            type: 'MARKET_STATUS_CHANGED',
            source: 'Admin International Markets',
            target: 'Portal · Localization · Compliance',
            userId: 'ADMIN',
            payloadSummary: `País ${country.name} (${country.code}) adicionado com estado "${country.marketStatus}".`,
          }),
          auditLogs: pushAudit(prev, 'Novo Mercado Internacional', country.name, `Estado: ${country.marketStatus} (${country.currency})`),
        };
      }),

    updateCountryMarketStatus: (countryCode, status) =>
      setState((prev) => {
        const nextCountries = prev.countries.map((c) =>
          c.code === countryCode ? { ...c, marketStatus: status } : c
        );
        void fetch('/api/management/catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ countries: nextCountries, platforms: prev.platforms }),
        }).catch(() => undefined);
        return {
          ...prev,
          countries: nextCountries,
          events: pushEvent(prev, {
            idempotencyKey: `market_status:${countryCode}:${status}:${Date.now()}`,
            type: 'MARKET_STATUS_CHANGED',
            source: 'Admin International Markets',
            target: 'Portal Mercados · Driver Localization',
            userId: 'ADMIN',
            payloadSummary: `Mercado ${countryCode} alterado para "${status}".`,
          }),
          auditLogs: pushAudit(prev, 'Estado de Mercado', countryCode, `Alterado para ${status}`),
        };
      }),

    addRegionOrCityToCountry: (countryCode, regionName, cityName) =>
      setState((prev) => {
        const nextCountries = prev.countries.map((c) => {
          if (c.code !== countryCode) return c;
          const existingRegion = c.regions.find((r) => r.name.toLowerCase() === regionName.toLowerCase());
          const updatedRegions = existingRegion
            ? c.regions.map((r) =>
                r.name.toLowerCase() === regionName.toLowerCase() && !r.cities.includes(cityName)
                  ? { ...r, cities: [...r.cities, cityName] }
                  : r
              )
            : [...c.regions, { name: regionName, cities: [cityName] }];
          return { ...c, regions: updatedRegions };
        });
        void fetch('/api/management/catalog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ countries: nextCountries, platforms: prev.platforms }),
        }).catch(() => undefined);
        return {
          ...prev,
          countries: nextCountries,
          auditLogs: pushAudit(prev, 'Cidade/Região Adicionada', countryCode, `${cityName} (${regionName})`),
        };
      }),

    createOrganization: async (input) => {
      try {
        const res = await fetch('/api/management/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (res.ok && data?.ok && data?.organization) {
          const org = data.organization as OrganizationRecord;
          setState((prev) => ({
            ...prev,
            organizations: [org, ...prev.organizations],
            auditLogs: pushAudit(prev, 'Organização Criada', org.name, `${org.type} (${org.countryCode})`),
          }));
          return { ok: true };
        }
        return { ok: false, error: data?.error || 'Não foi possível criar a organização.' };
      } catch {
        // Fallback local em modo offline
        const fallbackOrg: OrganizationRecord = {
          id: `org-local-${Date.now()}`,
          name: input.name,
          type: input.type,
          countryCode: input.countryCode,
          taxId: input.taxId,
          driversCount: input.driversCount ?? 1,
          vehiclesCount: input.vehiclesCount ?? 1,
          planId: 'plan-fleet',
          status: 'Ativa',
          isolationPolicy: 'strict_tenant',
        };
        setState((prev) => ({
          ...prev,
          organizations: [fallbackOrg, ...prev.organizations],
        }));
        return { ok: true };
      }
    },

    assignUserOrganization: (userId, organizationId) =>
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, organizationId } : u)),
        organizations: prev.organizations.map((org) => {
          const curMembers = new Set(org.memberUserIds ?? []);
          if (org.id === organizationId) curMembers.add(userId);
          else curMembers.delete(userId);
          return {
            ...org,
            memberUserIds: Array.from(curMembers),
          };
        }),
        auditLogs: pushAudit(
          prev,
          'Associação Organização',
          userId,
          organizationId ? `Associado a ${organizationId}` : 'Definido como Motorista Independente (sem frota)'
        ),
      })),

    addPaymentTransaction: (payment) =>
      setState((prev) => ({
        ...prev,
        payments: [{ ...payment, id: `pay-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev.payments],
        auditLogs: pushAudit(prev, 'Movimento Financeiro SaaS', payment.invoiceRef, `${payment.amount} ${payment.currency} (${payment.status})`),
      })),

    validateLegislation: (obligationId, newStatus) =>
      setState((prev) => {
        const target = prev.obligations.find((o) => o.id === obligationId);
        if (!target) return prev;
        const notif: NotificationRecord = {
          id: `ntf-${Date.now()}`,
          title: `Obrigação legal validada: ${target.title}`,
          body: `Estado regulamentar atualizado para "${newStatus}" (${target.officialSource}).`,
          category: 'Legislação',
          targetUserId: 'ALL',
          createdAt: new Date().toISOString(),
          delivered: true,
          read: false,
          sourceModule: 'AIVAD Compliance Intelligence',
        };
        return {
          ...prev,
          obligations: prev.obligations.map((o) =>
            o.id === obligationId
              ? {
                  ...o,
                  status: newStatus,
                  humanValidated: true,
                  validatedBy: prev.activeAdminRole,
                  validatedAt: new Date().toISOString().slice(0, 10),
                }
              : o
          ),
          notifications: [notif, ...prev.notifications],
          events: pushEvent(prev, {
            idempotencyKey: `leg_validated:${obligationId}:${newStatus}:${Date.now()}`,
            type: 'LEGISLATION_VALIDATED',
            source: 'Compliance Admin',
            target: 'Driver Compliance · Documents · Notifications',
            userId: 'ALL',
            payloadSummary: `Obrigação ${target.title} validada e comunicada aos motoristas afetados.`,
          }),
          auditLogs: pushAudit(prev, 'Validação Legal', target.title, `Estado -> ${newStatus}`),
        };
      }),

    addLegislation: (obligation) =>
      setState((prev) => ({
        ...prev,
        obligations: [{ ...obligation, id: `leg-${Date.now()}`, isDemo: true }, ...prev.obligations],
        auditLogs: pushAudit(prev, 'Registo Legal', obligation.title, 'Criado em conformidade'),
      })),

    updateUserStatus: (userId, status) =>
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, status } : u)),
        auditLogs: pushAudit(prev, 'Estado Utilizador', userId, `Alterado para ${status}`),
      })),

    changeUserSubscriptionPlan: (userId, planId) =>
      setState((prev) => {
        const plan = prev.plans.find((p) => p.id === planId);
        return {
          ...prev,
          users: prev.users.map((u) => (u.id === userId ? { ...u, planId } : u)),
          subscriptions: prev.subscriptions.map((s) =>
            s.userId === userId
              ? { ...s, planId, priceEur: plan?.monthlyPriceEur ?? s.priceEur }
              : s
          ),
          events: pushEvent(prev, {
            idempotencyKey: `sub_changed:${userId}:${planId}:${Date.now()}`,
            type: 'SUBSCRIPTION_CHANGED',
            source: 'Subscription Service',
            target: 'Driver Access · Feature Limits · Web/Android/iOS',
            userId,
            payloadSummary: `Plano atualizado para ${plan?.name ?? planId}. Permissões sincronizadas.`,
          }),
          auditLogs: pushAudit(prev, 'Alteração de Plano', userId, `Novo plano: ${plan?.name ?? planId}`),
        };
      }),

    saveCmsDraft: (patch) => {
      setState((prev) => {
        const nextDraft = {
          ...(prev.cms.draftSnapshot ?? {}),
          ...patch,
        };
        void fetch('/api/cms/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ draft: nextDraft }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data?.ok) return;
            setState((cur) => ({
              ...cur,
              cmsPersistenceInfo: {
                lastServerScope: data.targetScope,
                lastUpdatedAt: data.updatedAt ?? new Date().toISOString(),
              },
            }));
          })
          .catch(() => undefined);

        return {
          ...prev,
          cms: {
            ...prev.cms,
            draftSnapshot: nextDraft,
          },
          auditLogs: pushAudit(prev, 'Rascunho CMS', 'Site Oficial', 'Rascunho guardado sem publicar'),
        };
      });
    },

    discardCmsDraft: () =>
      setState((prev) => ({
        ...prev,
        cms: {
          ...prev.cms,
          draftSnapshot: null,
        },
      })),

    updateCmsAndPublish: (patch, summary) => {
      setState((prev) => {
        const revision = {
          id: `rev-${Date.now()}`,
          savedAt: new Date().toISOString(),
          savedBy: prev.activeAdminRole,
          summary,
          snapshot: {
            heroTitle: prev.cms.heroTitle,
            heroSubtitle: prev.cms.heroSubtitle,
            announcementBanner: prev.cms.announcementBanner,
            showAnnouncement: prev.cms.showAnnouncement,
            brandTitle: prev.cms.brandTitle,
            brandTagline: prev.cms.brandTagline,
            primaryColor: prev.cms.primaryColor,
            accentColor: prev.cms.accentColor,
            heroCtaDriverLabel: prev.cms.heroCtaDriverLabel,
            seoTitle: prev.cms.seoTitle,
            seoDescription: prev.cms.seoDescription,
            contactEmail: prev.cms.contactEmail,
            visibleSections: prev.cms.visibleSections,
          },
        };
        const nextCms: CmsContentState = {
          ...prev.cms,
          ...patch,
          draftSnapshot: null,
          revisionHistory: [revision, ...prev.cms.revisionHistory].slice(0, 15),
        };

        void fetch('/api/cms/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cms: nextCms }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data?.ok) return;
            setState((cur) => ({
              ...cur,
              cmsPersistenceInfo: {
                lastServerScope: data.targetScope,
                lastUpdatedAt: data.updatedAt ?? new Date().toISOString(),
              },
            }));
          })
          .catch(() => undefined);

        return {
          ...prev,
          cms: nextCms,
          events: pushEvent(prev, {
            idempotencyKey: `cms_published:${Date.now()}`,
            type: 'CMS_PUBLISHED',
            source: 'Admin CMS',
            target: 'AIVAD Official Portal',
            userId: 'ADMIN',
            payloadSummary: `Portal oficial atualizado: ${summary}`,
          }),
          auditLogs: pushAudit(prev, 'Publicação CMS', 'Site Oficial', summary),
        };
      });
    },

    rollbackCms: (revisionId) =>
      setState((prev) => {
        const rev = prev.cms.revisionHistory.find((r) => r.id === revisionId);
        if (!rev) return prev;
        const rolledCms: CmsContentState = {
          ...prev.cms,
          ...rev.snapshot,
          draftSnapshot: null,
        };
        void fetch('/api/cms/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cms: rolledCms }),
        }).catch(() => undefined);
        return {
          ...prev,
          cms: rolledCms,
          auditLogs: pushAudit(prev, 'Rollback CMS', 'Site Oficial', `Revertido para revisão ${revisionId}`),
        };
      }),

    addVersionRelease: (version) =>
      setState((prev) => ({
        ...prev,
        versions: [{ ...version, id: `ver-${Date.now()}` }, ...prev.versions],
        auditLogs: pushAudit(prev, 'Publicação de Versão', `${version.channel} ${version.version}`, version.notes),
      })),

    broadcastNotification: (title, body, targetUserId, category) =>
      setState((prev) => ({
        ...prev,
        notifications: [
          {
            id: `ntf-${Date.now()}`,
            title,
            body,
            category,
            targetUserId,
            createdAt: new Date().toISOString(),
            delivered: true,
            read: false,
            sourceModule: 'Administração Central',
          },
          ...prev.notifications,
        ],
        auditLogs: pushAudit(prev, 'Notificação Emitida', title, `Destino: ${targetUserId}`),
      })),

    toggleRemoteFlag: (flag) =>
      setState((prev) => ({
        ...prev,
        remoteConfig: {
          ...prev.remoteConfig,
          featureFlags: {
            ...prev.remoteConfig.featureFlags,
            [flag]: !prev.remoteConfig.featureFlags[flag],
          },
        },
        auditLogs: pushAudit(prev, 'Configuração Remota', flag, `Alternada para ${!prev.remoteConfig.featureFlags[flag]}`),
      })),

    updateDriverPrivacyConsent: (consent) =>
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === prev.activeDriverUserId ? { ...u, privacyConsentForSupport: consent } : u
        ),
        auditLogs: pushAudit(prev, 'Consentimento Privacidade', prev.activeDriverUserId, `Acesso de suporte: ${consent ? 'Autorizado' : 'Bloqueado'}`),
      })),

    // =======================================================================
    // COMANDO 6 HANDLERS (Voice Copilot, Connectors, Smart Capture, Zones, Fleet)
    // =======================================================================
    updateVoiceCopilotConfig: (patch) =>
      setState((prev) => ({
        ...prev,
        voiceConfig: {
          ...prev.voiceConfig,
          ...patch,
          categories: {
            ...prev.voiceConfig.categories,
            ...(patch.categories ?? {}),
          },
        },
      })),

    triggerVoiceAnnouncement: (draft) => {
      const res = enqueueVoiceAnnouncement(state.voiceHistory, draft, state.voiceConfig);
      let spoken = false;
      if (res.accepted && res.shouldSpeakAudio && res.item) {
        spoken = speakWithWebSpeech(res.item.spokenText, state.voiceConfig);
      }
      if (res.accepted) {
        setState((prev) => ({
          ...prev,
          voiceTestCount: draft.dedupHash.startsWith('test:') ? prev.voiceTestCount + 1 : prev.voiceTestCount,
          voiceHistory: res.updatedHistory.map((it) =>
            it.id === res.item?.id ? { ...it, deliveredAudio: spoken } : it
          ),
          latestVisualVoiceBanner: res.shouldShowVisual ? res.item : prev.latestVisualVoiceBanner,
        }));
      }
      return { spoken, suppressedByCooldown: res.suppressedByCooldown };
    },

    dismissVisualVoiceBanner: () =>
      setState((prev) => ({ ...prev, latestVisualVoiceBanner: null })),

    runConnectorTest: (connectorId, level) => {
      const target = state.connectors[connectorId];
      const nativeBridgeDetected =
        typeof window !== 'undefined' && Boolean((window as unknown as Record<string, unknown>).AivadNativeBridge);
      const isRealAuthenticatedSession = state.session.authenticated && !state.session.isDemoSession;
      const { updatedConnector, result } = runConnectorVerificationSuite(target, level, {
        serverVaultConfigured: target.serverVaultConfigured,
        nativeBridgeDetected,
        isRealAuthenticatedSession,
      });
      setState((prev) => ({
        ...prev,
        connectors: {
          ...prev.connectors,
          [connectorId]: updatedConnector,
        },
      }));
      return result;
    },

    updateConnectorPermissions: (connectorId, patch) =>
      setState((prev) => {
        const cur = prev.connectors[connectorId];
        const nextRead = patch.readCapturePermissionGranted ?? cur.readCapturePermissionGranted;
        const nextExec = patch.externalControlPermissionGranted ?? cur.externalControlPermissionGranted;
        return {
          ...prev,
          connectors: {
            ...prev.connectors,
            [connectorId]: {
              ...cur,
              readCapturePermissionGranted: nextRead,
              externalControlPermissionGranted: nextExec,
              connectionState: nextExec
                ? 'Autorizado (Leitura + Execução)'
                : nextRead
                  ? 'Simulador Interno Ativo'
                  : 'Desligado',
            },
          },
          auditLogs: pushAudit(
            prev,
            'Permissões Conector',
            connectorId.toUpperCase(),
            `Leitura=${nextRead ? 'Sim' : 'Não'} | Controlo Externo=${nextExec ? 'Autorizado' : 'Bloqueado'}`,
            prev.activeDriverUserId
          ),
        };
      }),

    simulateConnectorDisconnection: (connectorId, reason) =>
      setState((prev) => {
        const updated = registerConnectorFailure(prev.connectors[connectorId], reason);
        const lce = createLifecycleAuditEvent({
          eventType: 'Perda de ligação',
          originPlatform: connectorId,
          previousState: prev.connectors[connectorId].connectionState,
          currentState: updated.connectionState,
          changeOrigin: 'Conector',
          associatedEntityId: connectorId,
          associatedPayloadSummary: `${reason} — Backoff exponencial: ${updated.nextReconnectBackoffSec}s.`,
          isDemo: Boolean(prev.session.isDemoSession),
        });
        return {
          ...prev,
          connectors: {
            ...prev.connectors,
            [connectorId]: updated,
          },
          lifecycleAuditEvents: appendIdempotentLifecycleEvent(prev.lifecycleAuditEvents, lce).updated,
        };
      }),

    parseAndImportSmartCaptures: (params) => {
      const normalizedList = parseAndNormalizeCaptureInput(params);
      if (normalizedList.length === 0) {
        const failLce = createLifecycleAuditEvent({
          eventType: 'Falha de captura',
          originPlatform: params.defaultPlatformId ?? 'aivad_system',
          previousState: 'Entrada bruta',
          currentState: 'Falha de extração',
          changeOrigin: 'Smart Capture',
          associatedPayloadSummary: `Não foi possível extrair dados válidos do formato ${params.format}.`,
          isDemo: Boolean(state.session.isDemoSession),
        });
        setState((prev) => ({
          ...prev,
          lifecycleAuditEvents: appendIdempotentLifecycleEvent(prev.lifecycleAuditEvents, failLce).updated,
        }));
        return {
          importedCount: 0,
          duplicatesCount: 0,
          message: 'Nenhum registo válido encontrado. Verifique o formato do texto OCR, CSV ou JSON.',
        };
      }

      let importedCount = 0;
      let duplicatesCount = 0;
      const isDemoFlag = Boolean(state.session.isDemoSession);

      setState((prev) => {
        let curCaptures = [...prev.captures];
        let curTrips = [...prev.trips];
        let curCampaigns = [...prev.campaigns];
        const curVehId = prev.vehicles.find((v) => v.isActiveDriverVehicle)?.id ?? prev.vehicles[0]?.id ?? 'veh-default';

        for (const norm of normalizedList) {
          const outcome = reconcileCapturedEvent(
            {
              externalTxId: norm.externalTxId,
              source: norm.source,
              dataType: norm.dataType,
              platformId: norm.platformId,
              amountEur: norm.offerOrGrossEur,
              pickupDistanceKm: norm.pickupDistanceKm,
              tripDistanceKm: norm.tripDistanceKm,
              estimatedDurationMin: norm.estimatedDurationMin,
              destinationZone: norm.destinationZone,
              category: norm.category,
              bonusEur: norm.bonusEur,
              tipEur: norm.tipEur,
              confidencePct: norm.confidencePct,
              rawSummary: norm.rawText,
              isDemo: isDemoFlag,
            },
            curCaptures,
            curTrips
          );

          curCaptures = [outcome.captureRecord, ...curCaptures];
          if (outcome.isDuplicate) {
            duplicatesCount++;
            continue;
          }
          importedCount++;

          if (outcome.updatedTrip) {
            curTrips = curTrips.map((t) => (t.id === outcome.updatedTrip!.id ? outcome.updatedTrip! : t));
          }
          if (outcome.createdCampaign) {
            curCampaigns = [outcome.createdCampaign, ...curCampaigns];
          }
          // Se for Viagem importada por CSV/JSON com valor > 0 e não existir no histórico, reconcilia em TripRecord
          if (
            norm.dataType === 'Viagem' &&
            norm.offerOrGrossEur > 0 &&
            !curTrips.some((t) => t.externalRef.toLowerCase() === norm.externalTxId.toLowerCase())
          ) {
            const plat = prev.platforms.find((p) => p.id === norm.platformId);
            const commPct = plat?.commissionPct ?? 25;
            const commEur = round2(norm.offerOrGrossEur * (commPct / 100));
            const kmTot = (norm.pickupDistanceKm ?? 1.2) + (norm.tripDistanceKm ?? 6.5);
            const opCost = round2(kmTot * 0.12);
            const netEur = round2(norm.offerOrGrossEur + (norm.tipEur ?? 0) + (norm.bonusEur ?? 0) - commEur - opCost);
            const newTrip: TripRecord = {
              id: `trip-imp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              externalRef: norm.externalTxId,
              platformId: norm.platformId,
              vehicleId: curVehId,
              date: norm.capturedAtIso.slice(0, 10),
              time: norm.capturedAtIso.slice(11, 16) || '12:00',
              grossEur: norm.offerOrGrossEur,
              tipEur: norm.tipEur ?? 0,
              bonusEur: norm.bonusEur ?? 0,
              tollsEur: 0,
              commissionEur: commEur,
              operationalCostEur: opCost,
              netEur,
              pickupDistanceKm: norm.pickupDistanceKm ?? 1.2,
              tripDistanceKm: norm.tripDistanceKm ?? 6.5,
              durationMin: norm.estimatedDurationMin ?? 16,
              pickupZone: norm.pickupZone || 'Zona Importada',
              destinationZone: norm.destinationZone || 'Destino Importado',
              category: norm.category || 'Standard',
              status: 'Concluída',
              source: norm.source,
              isDemo: isDemoFlag,
            };
            curTrips = [newTrip, ...curTrips];
          }
        }

        return {
          ...prev,
          captures: curCaptures,
          trips: curTrips,
          campaigns: curCampaigns,
          connectors: {
            ...prev.connectors,
            uber:
              normalizedList.some((n) => n.platformId === 'uber') && !isDemoFlag
                ? { ...prev.connectors.uber, dataOriginTag: 'Dados importados' }
                : prev.connectors.uber,
            bolt:
              normalizedList.some((n) => n.platformId === 'bolt') && !isDemoFlag
                ? { ...prev.connectors.bolt, dataOriginTag: 'Dados importados' }
                : prev.connectors.bolt,
          },
        };
      });

      return {
        importedCount,
        duplicatesCount,
        message: `${importedCount} registo(s) normalizado(s) com sucesso (${duplicatesCount} duplicado(s) bloqueado(s)).`,
      };
    },

    correctSmartCaptureRecord: (captureId, patch, reason) => {
      const target = state.captures.find((c) => c.id === captureId);
      if (!target) return { ok: false, error: 'Captura não encontrada.' };
      const res = applyCaptureManualCorrection(target, patch, activeDriver.name, reason);
      if (!res.ok || !res.updatedRecord) return { ok: false, error: res.error };

      const lce = createLifecycleAuditEvent({
        eventType: 'Correção manual',
        originPlatform: res.updatedRecord.platformId,
        previousState: `${target.status} (€${target.amountEur.toFixed(2)})`,
        currentState: `Corrigido (€${res.updatedRecord.amountEur.toFixed(2)})`,
        changeOrigin: 'Motorista',
        associatedEntityId: captureId,
        associatedPayloadSummary: `Correção manual por ${activeDriver.name}: ${reason}`,
        isDemo: Boolean(state.session.isDemoSession),
      });

      setState((prev) => ({
        ...prev,
        captures: prev.captures.map((c) => (c.id === captureId ? res.updatedRecord! : c)),
        lifecycleAuditEvents: appendIdempotentLifecycleEvent(prev.lifecycleAuditEvents, lce).updated,
      }));
      return { ok: true };
    },

    overrideProposalAutoPilotDecision: (proposalId, overrideChoice, overrideReason) =>
      setState((prev) => {
        const target = prev.proposals.find((p) => p.id === proposalId);
        if (!target || !target.autoPilotDecision) return prev;
        const nextLifecycle: ProposalLifecycleState =
          overrideChoice === 'Aceite manualmente' ? 'Aceite pelo motorista' : 'Recusada';
        const lce = createLifecycleAuditEvent({
          eventType: 'Aceitação / Rejeição',
          originPlatform: target.input.platformId,
          previousState: target.autoPilotDecision.action,
          currentState: overrideChoice,
          changeOrigin: 'Motorista',
          associatedEntityId: proposalId,
          associatedPayloadSummary: `Revisão/override do motorista: ${overrideChoice} (${overrideReason || 'decisão soberana do condutor'})`,
          isDemo: Boolean(prev.session.isDemoSession),
        });
        return {
          ...prev,
          proposals: prev.proposals.map((p) =>
            p.id === proposalId && p.autoPilotDecision
              ? {
                  ...p,
                  lifecycleState: nextLifecycle,
                  autoPilotDecision: {
                    ...p.autoPilotDecision,
                    driverOverride: overrideChoice,
                    overrideReason: overrideReason || 'Decisão manual soberana do motorista',
                  },
                }
              : p
          ),
          lifecycleAuditEvents: appendIdempotentLifecycleEvent(prev.lifecycleAuditEvents, lce).updated,
        };
      }),

    logZoneRelocation: (params) =>
      setState((prev) => {
        const entry = createZoneRelocationLog({
          ...params,
          epistemicBasis: prev.session.isDemoSession ? 'Dados de demonstração' : 'Informação histórica',
          isDemo: Boolean(prev.session.isDemoSession),
        });
        const vDraft = buildOperationalAlertVoiceAnnouncement(
          'zones',
          `Reposicionamento iniciado para ${params.targetZone}.`,
          `Reposicionamento registado de ${params.fromZone} para ${params.targetZone}. ${params.suggestedReason}`,
          'media'
        );
        const vRes = enqueueVoiceAnnouncement(prev.voiceHistory, vDraft, prev.voiceConfig);
        if (vRes.accepted && vRes.shouldSpeakAudio && vRes.item) {
          speakWithWebSpeech(vRes.item.spokenText, prev.voiceConfig);
        }
        return {
          ...prev,
          zoneRelocationLogs: [entry, ...prev.zoneRelocationLogs].slice(0, 40),
          voiceHistory: vRes.updatedHistory,
          latestVisualVoiceBanner: vRes.accepted && vRes.shouldShowVisual ? vRes.item : prev.latestVisualVoiceBanner,
        };
      }),

    completeZoneRelocationOutcome: (relocationId, outcome, waitMinutesUntilRide) =>
      setState((prev) => ({
        ...prev,
        zoneRelocationLogs: prev.zoneRelocationLogs.map((r) =>
          r.id === relocationId
            ? {
                ...r,
                outcome,
                waitMinutesUntilRide,
                completedAtIso: new Date().toISOString(),
              }
            : r
        ),
      })),

    updateVehicleCatalogFilters: (patch) =>
      setState((prev) => ({
        ...prev,
        vehicleCatalogFilters: { ...prev.vehicleCatalogFilters, ...patch },
      })),

    resetVehicleCatalogFilters: () =>
      setState((prev) => ({
        ...prev,
        vehicleCatalogFilters: { ...DEFAULT_PERSISTED_VEHICLE_FILTERS },
      })),

    setFloatingCardQuickHidden: (hidden) =>
      setState((prev) => ({ ...prev, floatingCardQuickHidden: hidden })),

    addReferralCoupon: (coupon) =>
      setState((prev) => ({
        ...prev,
        referralCoupons: [
          {
            ...coupon,
            id: `cpn-${Date.now()}`,
            currentRedemptions: 0,
            billingExecutionState: 'Preparado (Sem cobrança real ativa)',
          },
          ...prev.referralCoupons,
        ],
        auditLogs: pushAudit(prev, 'Cupão Indicação Criado', coupon.code, `${coupon.trialDaysGranted} dias grátis`),
      })),

    toggleReferralCouponActive: (couponId) =>
      setState((prev) => ({
        ...prev,
        referralCoupons: prev.referralCoupons.map((c) =>
          c.id === couponId ? { ...c, active: !c.active } : c
        ),
      })),

    openAssistantHub: () => setState((prev) => ({ ...prev, assistantHubOpen: true })),
    closeAssistantHub: () => setState((prev) => ({ ...prev, assistantHubOpen: false })),

    startInteractiveAssistant: (assistantId) =>
      setState((prev) => {
        const def = INTERACTIVE_ASSISTANTS.find((a) => a.id === assistantId);
        if (!def) return prev;
        const existing = prev.assistantProgress[assistantId];
        const nextProg =
          existing && existing.status !== 'Concluído'
            ? resumeAssistantProgress(existing)
            : createInitialAssistantProgress(assistantId);
        const targetStep = def.steps[nextProg.currentStepIndex] ?? def.steps[0];
        return {
          ...prev,
          assistantHubOpen: false,
          activeAssistantId: assistantId,
          activeDriverNav:
            def.scope === 'driver' && targetStep?.targetNav ? targetStep.targetNav : prev.activeDriverNav,
          activeAdminNav:
            def.scope === 'admin' && targetStep?.targetNav ? targetStep.targetNav : prev.activeAdminNav,
          activePortalPage:
            def.scope === 'portal' && targetStep?.targetNav ? targetStep.targetNav : prev.activePortalPage,
          assistantProgress: {
            ...prev.assistantProgress,
            [assistantId]: nextProg,
          },
        };
      }),

    pauseInteractiveAssistant: () =>
      setState((prev) => {
        if (!prev.activeAssistantId) return prev;
        const cur = prev.assistantProgress[prev.activeAssistantId];
        if (!cur) return { ...prev, activeAssistantId: null };
        return {
          ...prev,
          activeAssistantId: null,
          assistantProgress: {
            ...prev.assistantProgress,
            [prev.activeAssistantId]: pauseAssistantProgress(cur),
          },
        };
      }),

    resumeInteractiveAssistant: (assistantId) =>
      setState((prev) => {
        const targetId = assistantId ?? prev.activeAssistantId;
        if (!targetId) return prev;
        const def = INTERACTIVE_ASSISTANTS.find((a) => a.id === targetId);
        if (!def) return prev;
        const cur = prev.assistantProgress[targetId] ?? createInitialAssistantProgress(targetId);
        const resumed = resumeAssistantProgress(cur);
        const step = def.steps[resumed.currentStepIndex] ?? def.steps[0];
        return {
          ...prev,
          assistantHubOpen: false,
          activeAssistantId: targetId,
          activeDriverNav:
            def.scope === 'driver' && step?.targetNav ? step.targetNav : prev.activeDriverNav,
          activeAdminNav:
            def.scope === 'admin' && step?.targetNav ? step.targetNav : prev.activeAdminNav,
          activePortalPage:
            def.scope === 'portal' && step?.targetNav ? step.targetNav : prev.activePortalPage,
          assistantProgress: {
            ...prev.assistantProgress,
            [targetId]: resumed,
          },
        };
      }),

    resetInteractiveAssistant: (assistantId) =>
      setState((prev) => {
        const def = INTERACTIVE_ASSISTANTS.find((a) => a.id === assistantId);
        if (!def) return prev;
        const fresh = createInitialAssistantProgress(assistantId);
        const firstStep = def.steps[0];
        return {
          ...prev,
          assistantHubOpen: false,
          activeAssistantId: assistantId,
          activeDriverNav:
            def.scope === 'driver' && firstStep?.targetNav ? firstStep.targetNav : prev.activeDriverNav,
          activeAdminNav:
            def.scope === 'admin' && firstStep?.targetNav ? firstStep.targetNav : prev.activeAdminNav,
          activePortalPage:
            def.scope === 'portal' && firstStep?.targetNav ? firstStep.targetNav : prev.activePortalPage,
          assistantProgress: {
            ...prev.assistantProgress,
            [assistantId]: fresh,
          },
        };
      }),

    goToAssistantStep: (stepIndex) =>
      setState((prev) => {
        if (!prev.activeAssistantId) return prev;
        const def = INTERACTIVE_ASSISTANTS.find((a) => a.id === prev.activeAssistantId);
        if (!def) return prev;
        const clamped = Math.max(0, Math.min(def.steps.length - 1, stepIndex));
        const cur = prev.assistantProgress[def.id] ?? createInitialAssistantProgress(def.id);
        const step = def.steps[clamped];
        return {
          ...prev,
          activeDriverNav:
            def.scope === 'driver' && step?.targetNav ? step.targetNav : prev.activeDriverNav,
          activeAdminNav:
            def.scope === 'admin' && step?.targetNav ? step.targetNav : prev.activeAdminNav,
          activePortalPage:
            def.scope === 'portal' && step?.targetNav ? step.targetNav : prev.activePortalPage,
          assistantProgress: {
            ...prev.assistantProgress,
            [def.id]: {
              ...cur,
              currentStepIndex: clamped,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      }),

    verifyCurrentAssistantStep: () => {
      if (!state.activeAssistantId) {
        return { status: 'Falhou', detail: 'Nenhum assistente ativo.' };
      }
      const def = INTERACTIVE_ASSISTANTS.find((a) => a.id === state.activeAssistantId);
      if (!def) return { status: 'Falhou', detail: 'Assistente não encontrado.' };
      const curProg = state.assistantProgress[def.id] ?? createInitialAssistantProgress(def.id);
      const step = def.steps[curProg.currentStepIndex] ?? def.steps[0];
      const voiceSupported =
        typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

      const evalCtx: AssistantEvaluationContext = {
        overlayConfig: state.overlayConfig,
        floatingDockConfig: state.floatingDockConfig,
        floatingPreviewOpened: state.floatingPreviewOpened,
        floatingConfigSavedCount: state.floatingConfigSavedCount,
        voiceConfig: {
          enabled: state.voiceConfig.enabled,
          deliveryMode: state.voiceConfig.outputChannel,
          language: state.voiceConfig.language,
          speechRate: state.voiceConfig.rate,
          categories: state.voiceConfig.categories,
        },
        voiceSupported,
        voiceTestCount: state.voiceTestCount,
        autoPilot: state.autoPilot,
        autoPilotSavedCount: state.autoPilotSavedCount,
        connectors: state.connectors,
        activeDriverNav: state.activeDriverNav,
        activeAdminNav: state.activeAdminNav,
        activePortalPage: state.activePortalPage,
        selectedMarketCode: state.localization.selectedMarketCode,
        tachographActiveSession: Boolean(state.tachograph.activeSessionId),
        proposalsCount: state.proposals.length,
        vehiclesCount: state.vehicles.length,
        activeVehicleId: activeVehicle.id,
        zoneObservationsCount: state.zoneObservations.length,
        countriesCount: state.countries.length,
        adminRevalidationCount: state.adminRevalidationCount,
        portalSimulatorTested: state.portalSimulatorTested,
        portalComparisonViewed: state.portalComparisonViewed,
      };

      const outcome = evaluateAssistantStepVerification(step, curProg, evalCtx);
      const nextProg = applyStepConfirmationToProgress(curProg, step, outcome);
      const nextStep = def.steps[nextProg.currentStepIndex] ?? step;
      setState((prev) => ({
        ...prev,
        activeDriverNav:
          def.scope === 'driver' && nextStep?.targetNav ? nextStep.targetNav : prev.activeDriverNav,
        activeAdminNav:
          def.scope === 'admin' && nextStep?.targetNav ? nextStep.targetNav : prev.activeAdminNav,
        activePortalPage:
          def.scope === 'portal' && nextStep?.targetNav ? nextStep.targetNav : prev.activePortalPage,
        assistantProgress: {
          ...prev.assistantProgress,
          [def.id]: nextProg,
        },
      }));
      return { status: outcome.status, detail: outcome.detail };
    },

    confirmCurrentAssistantStepByUser: () =>
      setState((prev) => {
        if (!prev.activeAssistantId) return prev;
        const def = INTERACTIVE_ASSISTANTS.find((a) => a.id === prev.activeAssistantId);
        if (!def) return prev;
        const curProg = prev.assistantProgress[def.id] ?? createInitialAssistantProgress(def.id);
        const step = def.steps[curProg.currentStepIndex] ?? def.steps[0];
        const confirmed = confirmAssistantStepByUser(curProg, step.id);
        const nextProg = applyStepConfirmationToProgress(confirmed, step, {
          status: 'Concluído',
          detail: 'Confirmado pelo utilizador.',
          requiresUserConfirmation: false,
        });
        const nextStep = def.steps[nextProg.currentStepIndex] ?? step;
        return {
          ...prev,
          activeDriverNav:
            def.scope === 'driver' && nextStep?.targetNav ? nextStep.targetNav : prev.activeDriverNav,
          activeAdminNav:
            def.scope === 'admin' && nextStep?.targetNav ? nextStep.targetNav : prev.activeAdminNav,
          activePortalPage:
            def.scope === 'portal' && nextStep?.targetNav ? nextStep.targetNav : prev.activePortalPage,
          assistantProgress: {
            ...prev.assistantProgress,
            [def.id]: nextProg,
          },
        };
      }),

    skipOptionalCurrentAssistantStep: () =>
      setState((prev) => {
        if (!prev.activeAssistantId) return prev;
        const def = INTERACTIVE_ASSISTANTS.find((a) => a.id === prev.activeAssistantId);
        if (!def) return prev;
        const curProg = prev.assistantProgress[def.id] ?? createInitialAssistantProgress(def.id);
        const step = def.steps[curProg.currentStepIndex] ?? def.steps[0];
        const skipped = skipOptionalAssistantStep(curProg, step);
        const nextStep = def.steps[skipped.currentStepIndex] ?? step;
        return {
          ...prev,
          activeDriverNav:
            def.scope === 'driver' && nextStep?.targetNav ? nextStep.targetNav : prev.activeDriverNav,
          activeAdminNav:
            def.scope === 'admin' && nextStep?.targetNav ? nextStep.targetNav : prev.activeAdminNav,
          activePortalPage:
            def.scope === 'portal' && nextStep?.targetNav ? nextStep.targetNav : prev.activePortalPage,
          assistantProgress: {
            ...prev.assistantProgress,
            [def.id]: skipped,
          },
        };
      }),

    closeInteractiveAssistant: () =>
      setState((prev) => ({ ...prev, activeAssistantId: null })),

    markFloatingPreviewOpened: () =>
      setState((prev) => ({ ...prev, floatingPreviewOpened: true })),

    markPortalSimulatorTested: () =>
      setState((prev) => ({ ...prev, portalSimulatorTested: true })),

    markPortalComparisonViewed: () =>
      setState((prev) => ({ ...prev, portalComparisonViewed: true })),
  };

  return <EcosystemContext.Provider value={value}>{children}</EcosystemContext.Provider>;
};

export function useEcosystem() {
  const ctx = useContext(EcosystemContext);
  if (!ctx) throw new Error('useEcosystem must be used inside EcosystemProvider');
  return ctx;
}
