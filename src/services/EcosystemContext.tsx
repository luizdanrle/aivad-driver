import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  analyzeProposal,
  computeFinancialSummary,
  evaluateAutoPilot,
  reconcileCapturedEvent,
  round2,
} from '../core/intelligence';
import {
  SEED_AUDIT_LOGS,
  SEED_AUTOPILOT,
  SEED_CAMPAIGNS,
  SEED_CAPTURES,
  SEED_CMS,
  SEED_COUNTRIES,
  SEED_DASHCAM,
  SEED_DOCUMENTS,
  SEED_EVENTS,
  SEED_EXPENSES,
  SEED_NOTIFICATIONS,
  SEED_OBLIGATIONS,
  SEED_ORGANIZATIONS,
  SEED_OVERLAY_CONFIG,
  SEED_PLANS,
  SEED_PLATFORMS,
  SEED_PROPOSALS,
  SEED_REMOTE_CONFIG,
  SEED_REVIEWS,
  SEED_SHIFTS,
  SEED_SUBSCRIPTIONS,
  SEED_SUGGESTIONS,
  SEED_TICKETS,
  SEED_TRIPS,
  SEED_USERS,
  SEED_VEHICLES,
  SEED_VERSIONS,
  SEED_ZONES,
} from '../data/seedData';
import type {
  AdminRole,
  AndroidOverlayConfig,
  AppVersionRecord,
  AuditLogRecord,
  AutoPilotConfig,
  CampaignRecord,
  CaptureSource,
  CmsContentState,
  ComplianceObligation,
  CountryMarketConfig,
  DashcamClip,
  DriverDocument,
  EcosystemEvent,
  EcosystemMode,
  ExpenseRecord,
  FeatureSuggestion,
  MapZoneRecord,
  NotificationRecord,
  OrganizationRecord,
  PassengerReviewRecord,
  PlanRecord,
  PlatformId,
  PlatformRecord,
  PlatformStatus,
  ProposalInput,
  ProposalLifecycleState,
  ProposalRecord,
  RemoteConfigState,
  ShiftRecord,
  SmartCaptureRecord,
  SubscriptionRecord,
  ThemeMode,
  TicketRecord,
  TripRecord,
  UserAccount,
  VehicleRecord,
} from '../models/types';

export interface EcosystemState {
  mode: EcosystemMode;
  theme: ThemeMode;
  activeDriverNav: string;
  activeAdminNav: string;
  activePortalPage: string;
  activeDriverUserId: string;
  activeAdminRole: AdminRole;
  platforms: PlatformRecord[];
  vehicles: VehicleRecord[];
  trips: TripRecord[];
  proposals: ProposalRecord[];
  campaigns: CampaignRecord[];
  expenses: ExpenseRecord[];
  shifts: ShiftRecord[];
  captures: SmartCaptureRecord[];
  obligations: ComplianceObligation[];
  documents: DriverDocument[];
  zones: MapZoneRecord[];
  plans: PlanRecord[];
  users: UserAccount[];
  organizations: OrganizationRecord[];
  subscriptions: SubscriptionRecord[];
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
    activeDriverNav: 'dashboard',
    activeAdminNav: 'overview',
    activePortalPage: 'inicio',
    activeDriverUserId: 'usr-driver-1',
    activeAdminRole: 'Superadministrador',
    platforms: SEED_PLATFORMS,
    vehicles: SEED_VEHICLES,
    trips: SEED_TRIPS,
    proposals: SEED_PROPOSALS,
    campaigns: SEED_CAMPAIGNS,
    expenses: SEED_EXPENSES,
    shifts: SEED_SHIFTS,
    captures: SEED_CAPTURES,
    obligations: SEED_OBLIGATIONS,
    documents: SEED_DOCUMENTS,
    zones: SEED_ZONES,
    plans: SEED_PLANS,
    users: SEED_USERS,
    organizations: SEED_ORGANIZATIONS,
    subscriptions: SEED_SUBSCRIPTIONS,
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildInitialState();
    const parsed = JSON.parse(raw) as Partial<EcosystemState>;
    return { ...buildInitialState(), ...parsed };
  } catch {
    return buildInitialState();
  }
}

interface EcosystemContextValue {
  state: EcosystemState;
  activeDriver: UserAccount;
  activeDriverPlan: PlanRecord;
  activeVehicle: VehicleRecord;
  visibleDriverPlatforms: PlatformRecord[];
  financialSummary: ReturnType<typeof computeFinancialSummary>;
  setMode: (mode: EcosystemMode) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setDriverNav: (nav: string) => void;
  setAdminNav: (nav: string) => void;
  setPortalPage: (page: string) => void;
  setAdminRole: (role: AdminRole) => void;
  resetDemoData: () => void;
  // Proposal & AutoPilot Services
  createAndAnalyzeProposal: (
    input: ProposalInput,
    source?: ProposalRecord['source']
  ) => ProposalRecord;
  updateProposalLifecycle: (proposalId: string, nextState: ProposalLifecycleState) => void;
  updateAutoPilotConfig: (patch: Partial<AutoPilotConfig>) => void;
  updateOverlayConfig: (patch: Partial<AndroidOverlayConfig>) => void;
  // Trip & Finance Services
  completeTrip: (trip: Omit<TripRecord, 'id' | 'netEur' | 'commissionEur' | 'operationalCostEur'>) => TripRecord;
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'isDemo'>) => void;
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
  // Campaign Service
  addCampaign: (campaign: Omit<CampaignRecord, 'id' | 'isDemo'>) => void;
  // Vehicle Service
  addVehicle: (vehicle: Omit<VehicleRecord, 'id' | 'isDemo'>) => void;
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
  // Admin Platform, Subscription, Compliance, CMS & Config Services
  updatePlatformStatus: (platformId: PlatformId, status: PlatformStatus) => void;
  addPlatform: (platform: Omit<PlatformRecord, 'isDemo'>) => void;
  validateLegislation: (obligationId: string, newStatus: ComplianceObligation['status']) => void;
  addLegislation: (obligation: Omit<ComplianceObligation, 'id' | 'isDemo'>) => void;
  updateUserStatus: (userId: string, status: UserAccount['status']) => void;
  changeUserSubscriptionPlan: (userId: string, planId: string) => void;
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
      // Ignore storage quota errors in sandboxed frames
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

  const visibleDriverPlatforms = useMemo(
    () => state.platforms.filter((p) => p.status === 'Ativa'),
    [state.platforms]
  );

  const financialSummary = useMemo(
    () => computeFinancialSummary(state.trips, state.expenses),
    [state.trips, state.expenses]
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

  const value: EcosystemContextValue = {
    state,
    activeDriver,
    activeDriverPlan,
    activeVehicle,
    visibleDriverPlatforms,
    financialSummary,
    setMode: (mode) => setState((prev) => ({ ...prev, mode })),
    setTheme: (theme) => setState((prev) => ({ ...prev, theme })),
    toggleTheme: () =>
      setState((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' })),
    setDriverNav: (activeDriverNav) => setState((prev) => ({ ...prev, activeDriverNav })),
    setAdminNav: (activeAdminNav) => setState((prev) => ({ ...prev, activeAdminNav })),
    setPortalPage: (activePortalPage) => setState((prev) => ({ ...prev, activePortalPage })),
    setAdminRole: (activeAdminRole) => setState((prev) => ({ ...prev, activeAdminRole })),
    resetDemoData: () => {
      const fresh = buildInitialState();
      setState(fresh);
    },

    createAndAnalyzeProposal: (input, source = 'Manual') => {
      const id = input.id ?? `prop-${Date.now()}`;
      const analysis = analyzeProposal(input, state.autoPilot.thresholds);
      const decision = evaluateAutoPilot(
        id,
        input,
        analysis,
        state.autoPilot,
        state.campaigns
      );
      const now = new Date().toISOString();
      const record: ProposalRecord = {
        id,
        createdAt: now,
        input: { ...input, id },
        analysis,
        lifecycleState: 'Apresentada',
        stateTimestamps: {
          Capturada: now,
          Analisada: now,
          Apresentada: now,
        },
        autoPilotDecision: decision,
        source,
        isDemo: true,
      };
      setState((prev) => ({
        ...prev,
        proposals: [record, ...prev.proposals],
      }));
      return record;
    },

    updateProposalLifecycle: (proposalId, nextState) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const target = prev.proposals.find((p) => p.id === proposalId);
        if (!target) return prev;
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
            pickupDistanceKm: target.input.pickupDistanceKm,
            tripDistanceKm: target.input.tripDistanceKm,
            durationMin: target.analysis.totalTimeMin,
            pickupZone: target.input.region,
            destinationZone: 'Destino concluído',
            category: target.input.category,
            status: 'Concluída',
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
          updatedEvents = pushEvent(prev, {
            idempotencyKey: `trip_completed:prop:${proposalId}`,
            type: 'TRIP_COMPLETED',
            source: 'Proposal Service',
            target: 'Trip · Finance · Campaigns · Reports',
            userId: prev.activeDriverUserId,
            payloadSummary: `Proposta ${proposalId} concluída -> viagem ${newTrip.externalRef} (€${newTrip.grossEur.toFixed(2)}) registada.`,
          });
        }

        return {
          ...prev,
          proposals: updatedProposals,
          trips: updatedTrips,
          campaigns: updatedCampaigns,
          events: updatedEvents,
        };
      });
    },

    updateAutoPilotConfig: (patch) =>
      setState((prev) => ({
        ...prev,
        autoPilot: { ...prev.autoPilot, ...patch },
        auditLogs: pushAudit(prev, 'Configuração AutoPilot', 'AutoPilot', `Modo: ${patch.mode ?? prev.autoPilot.mode}`, prev.activeDriverUserId),
      })),

    updateOverlayConfig: (patch) =>
      setState((prev) => ({
        ...prev,
        overlayConfig: { ...prev.overlayConfig, ...patch },
      })),

    completeTrip: (trip) => {
      const platform = state.platforms.find((p) => p.id === trip.platformId);
      const commPct = platform?.commissionPct ?? 25;
      const commissionEur = round2(trip.grossEur * (commPct / 100));
      const operationalCostEur = round2(
        (trip.pickupDistanceKm + trip.tripDistanceKm) * 0.12 + trip.tollsEur
      );
      const netEur = round2(
        trip.grossEur + trip.tipEur + trip.bonusEur - commissionEur - operationalCostEur
      );
      const record: TripRecord = {
        ...trip,
        id: `trip-${Date.now()}`,
        commissionEur,
        operationalCostEur,
        netEur,
      };
      setState((prev) => ({
        ...prev,
        trips: [record, ...prev.trips],
        campaigns: prev.campaigns.map((c) =>
          c.platformId === trip.platformId && c.status === 'Ativa'
            ? { ...c, completedTrips: Math.min(c.targetTrips, c.completedTrips + 1) }
            : c
        ),
        events: pushEvent(prev, {
          idempotencyKey: `trip_completed:${record.externalRef}`,
          type: 'TRIP_COMPLETED',
          source: 'Trip Service',
          target: 'Finance · Reports · Campaigns · Planner',
          userId: prev.activeDriverUserId,
          payloadSummary: `Viagem ${record.externalRef} (€${record.grossEur.toFixed(2)}) integrada em todo o ecossistema.`,
        }),
      }));
      return record;
    },

    addExpense: (expense) =>
      setState((prev) => ({
        ...prev,
        expenses: [{ ...expense, id: `exp-${Date.now()}`, isDemo: true }, ...prev.expenses],
      })),

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
      setState((prev) => ({
        ...prev,
        platforms: prev.platforms.map((p) => (p.id === platformId ? { ...p, status } : p)),
        events: pushEvent(prev, {
          idempotencyKey: `platform_status:${platformId}:${status}:${Date.now()}`,
          type: 'PLATFORM_STATUS_CHANGED',
          source: 'Admin Platform Service',
          target: 'Driver Menus · Calculator · Reports (History Preserved)',
          userId: 'ADMIN',
          payloadSummary: `Plataforma ${platformId} alterada para ${status}. Histórico de viagens preservado.`,
        }),
        auditLogs: pushAudit(prev, 'Estado de Plataforma', platformId, `Alterado para ${status}`),
      })),

    addPlatform: (platform) =>
      setState((prev) => ({
        ...prev,
        platforms: [...prev.platforms, { ...platform, isDemo: true }],
        auditLogs: pushAudit(prev, 'Nova Plataforma', platform.name, `Adicionada ao catálogo (${platform.status})`),
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
          },
        };
        return {
          ...prev,
          cms: {
            ...prev.cms,
            ...patch,
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
