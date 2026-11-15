import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  analyzeProposal,
  computeFinancialSummary,
  evaluateAutoPilot,
  isCompletedTripStatus,
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
  confirmLocalMarketAdaptation,
  detectFallbackLocation,
  evaluateCountryChange,
  resolveLocationFromCoordinates,
} from '../core/localization';
import { canAccessMode, isAdminRole } from '../core/rbac';
import {
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
  SEED_LOCALIZATION,
  SEED_NOTIFICATIONS,
  SEED_OBLIGATIONS,
  SEED_ORGANIZATIONS,
  SEED_OVERLAY_CONFIG,
  SEED_PAYMENTS,
  SEED_PLANS,
  SEED_PLATFORMS,
  SEED_PROPOSALS,
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
  SEED_ZONES,
} from '../data/seedData';
import type {
  AdminRole,
  AiCoreInsight,
  AiPredictionRecord,
  AndroidOverlayConfig,
  AppVersionRecord,
  AuditLogRecord,
  AuthSession,
  AutoPilotConfig,
  CampaignRecord,
  CancellationBy,
  CaptureSource,
  CmsContentState,
  ComplianceObligation,
  CountryMarketConfig,
  DashcamClip,
  DriverDocument,
  DriverRoutinePreferences,
  EcosystemEvent,
  EcosystemMode,
  ExpenseRecord,
  FeatureSuggestion,
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
  ProposalInput,
  ProposalLifecycleState,
  ProposalRecord,
  RemoteConfigState,
  SavedPlace,
  ShiftRecord,
  SmartCaptureRecord,
  StrategyMode,
  SubscriptionRecord,
  TachographActivityRecord,
  TachographOfflineQueueItem,
  TachographState,
  TachographStateStore,
  ThemeMode,
  TicketRecord,
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
}

const STORAGE_KEY = 'aivad_ecosystem_state_v1';

function buildInitialState(): EcosystemState {
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
    platforms: SEED_PLATFORMS,
    vehicles: SEED_VEHICLES,
    trips: SEED_TRIPS,
    proposals: SEED_PROPOSALS,
    campaigns: SEED_CAMPAIGNS,
    expenses: SEED_EXPENSES,
    shifts: SEED_SHIFTS,
    tachograph: SEED_TACHOGRAPH,
    localization: SEED_LOCALIZATION,
    captures: SEED_CAPTURES,
    obligations: SEED_OBLIGATIONS,
    documents: SEED_DOCUMENTS,
    zones: SEED_ZONES,
    savedPlaces: SEED_SAVED_PLACES,
    routinePreferences: SEED_ROUTINE_PREFS,
    aiPredictions: SEED_AI_PREDICTIONS,
    plans: SEED_PLANS,
    users: SEED_USERS,
    organizations: SEED_ORGANIZATIONS,
    subscriptions: SEED_SUBSCRIPTIONS,
    payments: SEED_PAYMENTS,
    tickets: SEED_TICKETS,
    notifications: SEED_NOTIFICATIONS,
    versions: SEED_VERSIONS,
    countries: SEED_COUNTRIES,
    cms: SEED_CMS,
    autoPilot: SEED_AUTOPILOT,
    overlayConfig: SEED_OVERLAY_CONFIG,
    reviews: SEED_REVIEWS,
    dashcamClips: SEED_DASHCAM,
    suggestions: SEED_SUGGESTIONS,
    events: SEED_EVENTS,
    auditLogs: SEED_AUDIT_LOGS,
    remoteConfig: SEED_REMOTE_CONFIG,
  };
}

function loadState(): EcosystemState {
  const initial = buildInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<EcosystemState>;
    const migratedCountries =
      parsed.countries && parsed.countries.length > 0 && 'marketStatus' in parsed.countries[0]
        ? parsed.countries
        : initial.countries;
    const mergedAutoPilot: AutoPilotConfig = {
      ...initial.autoPilot,
      ...(parsed.autoPilot ?? {}),
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
    };
    return {
      ...initial,
      ...parsed,
      session: parsed.session?.role ? parsed.session : initial.session,
      rbacDeniedMessage: null,
      driverDeactivatedPlatformIds: parsed.driverDeactivatedPlatformIds ?? initial.driverDeactivatedPlatformIds,
      savedPlaces: parsed.savedPlaces ?? initial.savedPlaces,
      routinePreferences: parsed.routinePreferences ?? initial.routinePreferences,
      aiPredictions: parsed.aiPredictions ?? initial.aiPredictions,
      autoPilot: mergedAutoPilot,
      cms: mergedCms,
      overlayConfig: {
        ...initial.overlayConfig,
        ...(parsed.overlayConfig ?? {}),
      },
      countries: migratedCountries,
      tachograph: parsed.tachograph?.sessions ? parsed.tachograph : initial.tachograph,
      localization: parsed.localization?.currentLocation ? parsed.localization : initial.localization,
      payments: parsed.payments ?? initial.payments,
    };
  } catch {
    return initial;
  }
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
  tachographSummary: ConsolidatedTachographSummary;
  rolling24hCompliance: Rolling24hComplianceResult;
  aiCoreBriefing: AiCoreInsight[];
  driverPredictions: AiPredictionRecord[];
  // Auth & RBAC
  setMode: (mode: EcosystemMode) => boolean;
  loginAsRole: (role: UserRole, userId?: string) => void;
  logoutSession: () => void;
  clearRbacDenied: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setDriverNav: (nav: string) => void;
  setAdminNav: (nav: string) => void;
  setPortalPage: (page: string) => void;
  setAdminRole: (role: AdminRole) => void;
  resetDemoData: () => void;
  // Localization & Geolocation Services
  requestBrowserGeolocation: () => void;
  simulateOrSelectLocation: (countryCode: string, city: string, region?: string) => void;
  confirmLocalMarket: (countryCode?: string) => void;
  dismissCountryChangePrompt: () => void;
  setProfessionalMarkets: (residenceCode: string, primaryMarketCode: string, additionalCodes: string[]) => void;
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
  updateOverlayConfig: (patch: Partial<AndroidOverlayConfig>) => void;
  // Trip & Finance Services
  completeTrip: (trip: Omit<TripRecord, 'id' | 'netEur' | 'commissionEur' | 'operationalCostEur'>) => TripRecord;
  updateTripStatus: (
    tripId: string,
    status: TripStatus,
    extra?: { cancellationBy?: CancellationBy; cancellationReason?: string }
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
  // Field & Compliance Services
  toggleZonePreference: (zoneId: string, pref: MapZoneRecord['preference']) => void;
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
  // Admin Platform, Countries, Payments, Subscription, Compliance, CMS & Config Services
  updatePlatformStatus: (platformId: PlatformId, status: PlatformStatus) => void;
  addPlatform: (platform: Omit<PlatformRecord, 'isDemo'>) => void;
  addCountryMarket: (country: CountryMarketConfig) => void;
  updateCountryMarketStatus: (countryCode: string, status: MarketStatus) => void;
  addRegionOrCityToCountry: (countryCode: string, regionName: string, cityName: string) => void;
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
}

const EcosystemContext = createContext<EcosystemContextValue | null>(null);

export const EcosystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EcosystemState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  const visibleDriverPlatforms = useMemo(
    () =>
      state.platforms.filter(
        (p) => p.status === 'Ativa' && !state.driverDeactivatedPlatformIds.includes(p.id)
      ),
    [state.platforms, state.driverDeactivatedPlatformIds]
  );

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
    deactivatedIds: PlatformId[]
  ): PlatformDriverLifecycleState {
    const plat = platforms.find((p) => p.id === platformId);
    if (!plat) return 'Integração não configurada';
    if (deactivatedIds.includes(platformId)) return 'Desativada pelo motorista';
    if (plat.status !== 'Ativa') return 'Suspensa/Indisponível por administração';
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
              ? 'Acesso bloqueado (RBAC): o painel administrativo exige autenticação explícita com perfil Administrativo no Portal.'
              : 'Autenticação necessária para aceder ao AIVAD Driver.',
        }));
        return false;
      }
      setState((prev) => ({ ...prev, mode, rbacDeniedMessage: null }));
      return true;
    },

    loginAsRole: (role, userId) => {
      setState((prev) => {
        const matchedUser =
          (userId && prev.users.find((u) => u.id === userId)) ||
          prev.users.find((u) => u.role === role) ||
          prev.users[0];
        const nextSession: AuthSession = {
          authenticated: true,
          userId: matchedUser.id,
          userName: isAdminRole(role) ? `${matchedUser.name} (${role})` : matchedUser.name,
          email: matchedUser.email,
          role,
          signedInAt: new Date().toISOString(),
        };
        const targetMode: EcosystemMode = isAdminRole(role) ? 'admin' : 'driver';
        return {
          ...prev,
          session: nextSession,
          activeAdminRole: isAdminRole(role) ? role : prev.activeAdminRole,
          activeDriverUserId: !isAdminRole(role) ? matchedUser.id : prev.activeDriverUserId,
          mode: targetMode,
          rbacDeniedMessage: null,
          auditLogs: pushAudit(
            prev,
            'Autenticação de Sessão',
            nextSession.userId,
            `Sessão iniciada como ${role} -> ambiente ${targetMode}`,
            nextSession.userName
          ),
        };
      });
    },

    logoutSession: () =>
      setState((prev) => ({
        ...prev,
        mode: 'portal',
        rbacDeniedMessage: null,
        session: {
          ...prev.session,
          authenticated: false,
          role: 'Motorista',
        },
      })),

    clearRbacDenied: () => setState((prev) => ({ ...prev, rbacDeniedMessage: null })),
    setTheme: (theme) => setState((prev) => ({ ...prev, theme })),
    toggleTheme: () =>
      setState((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' })),
    setDriverNav: (activeDriverNav) => setState((prev) => ({ ...prev, activeDriverNav })),
    setAdminNav: (activeAdminNav) => setState((prev) => ({ ...prev, activeAdminNav })),
    setPortalPage: (activePortalPage) => setState((prev) => ({ ...prev, activePortalPage })),
    setAdminRole: (activeAdminRole) =>
      setState((prev) => ({
        ...prev,
        activeAdminRole,
        session: isAdminRole(prev.session.role)
          ? { ...prev.session, role: activeAdminRole }
          : prev.session,
      })),
    resetDemoData: () => {
      const fresh = buildInitialState();
      setState(fresh);
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
        return {
          ...prev,
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
            target: 'Localization Profile (History Preserved)',
            userId: prev.activeDriverUserId,
            payloadSummary: `Localização atual definida para ${city} (${country?.name ?? countryCode}). Moedas anteriores preservadas.`,
          }),
        };
      });
    },

    confirmLocalMarket: (countryCode) => {
      setState((prev) => {
        const candidate = countryCode ?? prev.localization.currentLocation.countryCode;
        const targetCode = candidate === 'UNSET' ? prev.localization.primaryProfessionalMarketCode : candidate;
        const nextLoc = confirmLocalMarketAdaptation(prev.localization, targetCode, prev.countries);
        return {
          ...prev,
          localization: nextLoc,
          events: pushEvent(prev, {
            idempotencyKey: `market_confirm:${targetCode}:${Date.now()}`,
            type: 'LOCATION_UPDATED',
            source: 'Localization Confirmation',
            target: 'UI Currency · Units · Compliance · Platforms',
            userId: prev.activeDriverUserId,
            payloadSummary: `Experiência local adaptada para ${targetCode} (${nextLoc.languageCode}, ${nextLoc.unitSystem}).`,
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

    startTachograph: (odometerStartKm, operatorName, notes) => {
      const res = startTachographShift(state.tachograph, {
        driverId: activeDriver.id,
        vehicleId: activeVehicle.id,
        operatorName: operatorName ?? 'Atlântico Mobilidade TVDE Lda',
        odometerStartKm,
        countryCode: activeMarket.code,
        city: state.localization.currentLocation.city,
        notes,
      });
      if (!res.ok) return { ok: false, error: res.error };

      setState((prev) => ({
        ...prev,
        tachograph: res.store,
        events: pushEvent(prev, {
          idempotencyKey: `tach_start:${res.session?.id}`,
          type: 'TACHOGRAPH_RECORDED',
          source: 'Registo TVDE',
          target: 'Dashboard · Relatórios · Linha Temporal',
          userId: prev.activeDriverUserId,
          payloadSummary: `Turno iniciado (${odometerStartKm} km) em ${state.localization.currentLocation.city}.`,
        }),
      }));
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
          source: 'Registo TVDE',
          target: 'Dashboard · Produtividade · Relatórios',
          userId: prev.activeDriverUserId,
          payloadSummary: `Estado atividade -> ${targetState} (${odometerKm} km).`,
        }),
      }));
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
          source: 'Registo TVDE',
          target: 'Auditoria · Relatórios Atividade',
          userId: prev.activeDriverUserId,
          payloadSummary: `Correção auditável em ${activityId} (${reason}). Histórico preservado.`,
        }),
        auditLogs: pushAudit(prev, 'Correção Atividade TVDE', activityId, reason, activeDriver.name),
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
          target: 'Registo TVDE · Auditoria',
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
      });
      const decision = evaluateAutoPilot(
        id,
        input,
        aiPackage.analysis,
        state.autoPilot,
        state.campaigns
      );
      const now = new Date().toISOString();
      const isSandbox = Boolean(options?.isSimulatedSandbox);
      const record: ProposalRecord = {
        id,
        createdAt: now,
        input: { ...input, id },
        analysis: aiPackage.analysis,
        lifecycleState: 'Apresentada',
        stateTimestamps: {
          Capturada: now,
          Analisada: now,
          Apresentada: now,
        },
        autoPilotDecision: decision,
        source,
        isSimulatedSandbox: isSandbox,
        isDemo: true,
      };
      if (!isSandbox) {
        const pred: AiPredictionRecord = {
          id: `pred-${Date.now()}`,
          driverId: activeDriver.id,
          proposalId: id,
          createdAt: now,
          agentId: 'corridas',
          predictedNetEur: aiPackage.analysis.estimatedNetEur,
          predictedDurationMin: aiPackage.analysis.totalTimeMin,
          predictedEurPerHour: aiPackage.analysis.eurPerHour,
          status: 'Pendente resultado',
          learningNote: `Recomendação: ${aiPackage.recommendedAction} (confiança ${aiPackage.confidencePct}%).`,
          epistemicTag: 'Previsão',
        };
        setState((prev) => ({
          ...prev,
          proposals: [record, ...prev.proposals],
          aiPredictions: [pred, ...prev.aiPredictions].slice(0, 60),
        }));
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
            isDemo: true,
          };
          updatedTrips = [newTrip, ...prev.trips];
          updatedCampaigns = prev.campaigns.map((c) =>
            c.platformId === target.input.platformId && c.status === 'Ativa'
              ? { ...c, completedTrips: Math.min(c.targetTrips, c.completedTrips + 1) }
              : c
          );

          updatedPredictions = prev.aiPredictions.map((pr) =>
            pr.proposalId === proposalId && pr.driverId === prev.activeDriverUserId
              ? reconcilePredictionOutcome(pr, newTrip)
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
                isDemo: true,
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
        const curStrategyMode: StrategyMode = prev.autoPilot.strategyMode ?? 'Semiautomático';
        const nextThresholds = patch.thresholds ?? prev.autoPilot.thresholds;
        const nextModeConfigs = {
          ...(prev.autoPilot.modeConfigs ?? {
            Manual: prev.autoPilot.thresholds,
            Semiautomático: prev.autoPilot.thresholds,
            Automático: prev.autoPilot.thresholds,
          }),
          [curStrategyMode]: nextThresholds,
        };
        return {
          ...prev,
          autoPilot: {
            ...prev.autoPilot,
            ...patch,
            thresholds: nextThresholds,
            modeConfigs: patch.modeConfigs ?? nextModeConfigs,
          },
          auditLogs: pushAudit(
            prev,
            'Configuração Estratégia',
            'Estratégia das Aplicações',
            `Modo: ${patch.strategyMode ?? curStrategyMode}`,
            prev.activeDriverUserId
          ),
        };
      }),

    setStrategyMode: (mode) =>
      setState((prev) => {
        const mappedAutoPilot =
          mode === 'Manual' ? 'Manual' : mode === 'Automático' ? 'Automático' : 'Assistido';
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
            mode: mappedAutoPilot,
            thresholds: { ...targetThresholds },
            modeConfigs,
          },
          auditLogs: pushAudit(
            prev,
            'Mudança Modo Estratégia',
            'Estratégia',
            `Alterado para ${mode}`,
            prev.activeDriverUserId
          ),
        };
      }),

    saveStrategyPreset: (name) =>
      setState((prev) => {
        const cleanName = name.trim();
        if (!cleanName) return prev;
        const curMode: StrategyMode = prev.autoPilot.strategyMode ?? 'Semiautomático';
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
        const mappedAutoPilot =
          preset.mode === 'Manual'
            ? 'Manual'
            : preset.mode === 'Automático'
            ? 'Automático'
            : 'Assistido';
        return {
          ...prev,
          autoPilot: {
            ...prev.autoPilot,
            strategyMode: preset.mode,
            mode: mappedAutoPilot,
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

    updateOverlayConfig: (patch) =>
      setState((prev) => ({
        ...prev,
        overlayConfig: { ...prev.overlayConfig, ...patch },
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
              isDemo: true,
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
            isDemo: true,
          },
          ...prev.expenses,
        ],
      })),

    toggleDriverPlatformActivation: (platformId) =>
      setState((prev) => {
        const exists = prev.driverDeactivatedPlatformIds.includes(platformId);
        const nextIds = exists
          ? prev.driverDeactivatedPlatformIds.filter((id) => id !== platformId)
          : [...prev.driverDeactivatedPlatformIds, platformId];
        const platName = prev.platforms.find((p) => p.id === platformId)?.name ?? platformId;
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

    getPlatformLifecycleState: (platformId) =>
      getPlatformLifecycleStateHelper(platformId, state.platforms, state.driverDeactivatedPlatformIds),

    captureExternalEvent: (payload) => {
      const outcome = reconcileCapturedEvent(payload, state.captures, state.trips);
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
            isDemo: true,
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
        campaigns: [{ ...campaign, id: `cmp-${Date.now()}`, isDemo: true }, ...prev.campaigns],
      })),

    addVehicle: (vehicle) =>
      setState((prev) => ({
        ...prev,
        vehicles: [{ ...vehicle, id: `veh-${Date.now()}`, isDemo: true }, ...prev.vehicles],
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

    addPassengerReview: (review) =>
      setState((prev) => ({
        ...prev,
        reviews: [
          {
            ...review,
            id: `rev-${Date.now()}`,
            createdAt: new Date().toISOString(),
            sentViaOfficialApi: false,
            isDemo: true,
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
            isDemo: true,
          },
          ...prev.dashcamClips,
        ],
      })),

    addDocument: (doc) =>
      setState((prev) => ({
        ...prev,
        documents: [{ ...doc, id: `doc-${Date.now()}`, isDemo: true }, ...prev.documents],
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

        return {
          ...prev,
          platforms: prev.platforms.map((p) => (p.id === platformId ? { ...p, status } : p)),
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
      setState((prev) => ({
        ...prev,
        platforms: [...prev.platforms, { ...platform, isDemo: true }],
        auditLogs: pushAudit(prev, 'Nova Plataforma', platform.name, `Adicionada ao catálogo (${platform.status})`),
      })),

    addCountryMarket: (country) =>
      setState((prev) => ({
        ...prev,
        countries: [country, ...prev.countries],
        events: pushEvent(prev, {
          idempotencyKey: `market_added:${country.code}:${Date.now()}`,
          type: 'MARKET_STATUS_CHANGED',
          source: 'Admin International Markets',
          target: 'Portal · Localization · Compliance',
          userId: 'ADMIN',
          payloadSummary: `País ${country.name} (${country.code}) adicionado com estado "${country.marketStatus}".`,
        }),
        auditLogs: pushAudit(prev, 'Novo Mercado Internacional', country.name, `Estado: ${country.marketStatus} (${country.currency})`),
      })),

    updateCountryMarketStatus: (countryCode, status) =>
      setState((prev) => ({
        ...prev,
        countries: prev.countries.map((c) => (c.code === countryCode ? { ...c, marketStatus: status } : c)),
        events: pushEvent(prev, {
          idempotencyKey: `market_status:${countryCode}:${status}:${Date.now()}`,
          type: 'MARKET_STATUS_CHANGED',
          source: 'Admin International Markets',
          target: 'Portal Mercados · Driver Localization',
          userId: 'ADMIN',
          payloadSummary: `Mercado ${countryCode} alterado para "${status}".`,
        }),
        auditLogs: pushAudit(prev, 'Estado de Mercado', countryCode, `Alterado para ${status}`),
      })),

    addRegionOrCityToCountry: (countryCode, regionName, cityName) =>
      setState((prev) => ({
        ...prev,
        countries: prev.countries.map((c) => {
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
        }),
        auditLogs: pushAudit(prev, 'Cidade/Região Adicionada', countryCode, `${cityName} (${regionName})`),
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

    saveCmsDraft: (patch) =>
      setState((prev) => ({
        ...prev,
        cms: {
          ...prev.cms,
          draftSnapshot: {
            ...(prev.cms.draftSnapshot ?? {}),
            ...patch,
          },
        },
        auditLogs: pushAudit(prev, 'Rascunho CMS', 'Site Oficial', 'Rascunho guardado sem publicar'),
      })),

    discardCmsDraft: () =>
      setState((prev) => ({
        ...prev,
        cms: {
          ...prev.cms,
          draftSnapshot: null,
        },
      })),

    updateCmsAndPublish: (patch, summary) =>
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
        return {
          ...prev,
          cms: {
            ...prev.cms,
            ...patch,
            draftSnapshot: null,
            revisionHistory: [revision, ...prev.cms.revisionHistory].slice(0, 15),
          },
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
      }),

    rollbackCms: (revisionId) =>
      setState((prev) => {
        const rev = prev.cms.revisionHistory.find((r) => r.id === revisionId);
        if (!rev) return prev;
        return {
          ...prev,
          cms: {
            ...prev.cms,
            ...rev.snapshot,
            draftSnapshot: null,
          },
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
  };

  return <EcosystemContext.Provider value={value}>{children}</EcosystemContext.Provider>;
};

export function useEcosystem() {
  const ctx = useContext(EcosystemContext);
  if (!ctx) throw new Error('useEcosystem must be used inside EcosystemProvider');
  return ctx;
}
