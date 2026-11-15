export type EcosystemMode = 'portal' | 'driver' | 'admin';
export type ThemeMode = 'light' | 'dark';
export type CurrencyCode =
  | 'EUR'
  | 'GBP'
  | 'USD'
  | 'BRL'
  | 'CHF'
  | 'AOA'
  | 'CVE'
  | 'MXN'
  | 'CAD'
  | 'AUD'
  | string;

export type UnitSystem = 'metric' | 'imperial';

export type MarketStatus =
  | 'Não configurado'
  | 'Em estudo'
  | 'Em preparação'
  | 'Em validação'
  | 'Disponível'
  | 'Temporariamente indisponível'
  | 'Descontinuado';

export type AdminRole =
  | 'Superadministrador'
  | 'Administrador'
  | 'Comercial'
  | 'Conteúdo'
  | 'Suporte'
  | 'Técnico'
  | 'Auditor';

export type PlatformId =
  | 'uber'
  | 'bolt'
  | 'pop'
  | 'vloz'
  | 'frenalty'
  | 'cabify'
  | 'freenow'
  | string;

export type PlatformStatus = 'Ativa' | 'Oculta' | 'Suspensa' | 'Encerrada';
export type IntegrationAvailability =
  | 'Disponível'
  | 'Indisponível'
  | 'Em análise'
  | 'Descontinuada';

export interface PlatformRecord {
  id: PlatformId;
  name: string;
  shortCode?: string;
  brandColor?: string;
  countryScope: string[];
  regionsScope?: string[];
  citiesScope?: string[];
  categories: string[];
  requirements?: string[];
  docsRequired?: string[];
  benefits?: string[];
  commissionPct: number;
  status: PlatformStatus;
  integrationStatus: IntegrationAvailability;
  integrationLabel: string;
  isDemo: boolean;
}

export type FuelType =
  | 'Elétrico'
  | 'Híbrido'
  | 'Plug-in'
  | 'Gasolina'
  | 'Gasóleo'
  | 'GPL'
  | 'Bi-fuel';

export interface VehicleRecord {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  firstRegistration: string;
  powerKw: number;
  batteryKwh?: number;
  rangeKm: number;
  consumptionPer100Km: number;
  consumptionUnit: 'kWh' | 'L' | 'kg';
  fuelType: FuelType;
  seats: number;
  doors: number;
  trunkLiters: number;
  color: string;
  equipment: string[];
  monthlyLeaseOrFinanceEur: number;
  insuranceAnnualEur: number;
  maintenancePerKmEur: number;
  energyCostPerUnitEur: number;
  depreciationMonthlyEur: number;
  countryCode: string;
  city: string;
  isActiveDriverVehicle: boolean;
  isDemo: boolean;
}

export interface VehicleEligibilityResult {
  vehicleId: string;
  tvdeLegalEligible: boolean;
  tvdeReasons: string[];
  platformEligibility: Record<
    string,
    {
      eligible: boolean;
      categories: string[];
      reasons: string[];
    }
  >;
}

export type ProposalClassification = 'verde' | 'amarelo' | 'vermelho';
export type AnalysisMode =
  | 'Equilibrado'
  | 'Prioridade €/hora'
  | 'Prioridade €/km'
  | 'Personalizado';

export type ProposalLifecycleState =
  | 'Capturada'
  | 'Analisada'
  | 'Apresentada'
  | 'Aceite pelo motorista'
  | 'Confirmada pela plataforma'
  | 'Iniciada'
  | 'Concluída'
  | 'Recusada'
  | 'Expirada'
  | 'Cancelada';

export interface ProposalInput {
  id?: string;
  platformId: PlatformId;
  category: string;
  grossValueEur: number;
  pickupDistanceKm: number;
  pickupTimeMin: number;
  tripDistanceKm: number;
  tripTimeMin: number;
  stops: number;
  tollsEur: number;
  bonusEur: number;
  region: string;
  notes?: string;
  vehicleCostPerKmEur: number;
  calculationBasis?: 'total_distance' | 'trip_distance_only';
  mode: AnalysisMode;
}

export interface ProposalThresholds {
  minValueEur: number;
  minEurPerKm: number;
  minEurPerHour: number;
  maxPickupKm: number;
  maxTotalDistanceKm: number;
  maxTotalTimeMin: number;
  allowedPlatforms: PlatformId[];
  allowedCategories: string[];
  allowedRegions: string[];
  activeScheduleWindow: string;
  weightEurPerKm: number;
  weightEurPerHour: number;
  weightPickupEfficiency: number;
}

export interface ProposalAnalysis {
  totalDistanceKm: number;
  totalTimeMin: number;
  effectiveRevenueEur: number;
  eurPerKm: number;
  eurPerHour: number;
  eurPerMin: number;
  operatingCostEur: number;
  estimatedNetEur: number;
  emptyReturnRisk: 'Baixo' | 'Médio' | 'Alto';
  score: number;
  classification: ProposalClassification;
  basisDescription: string;
  reasons: string[];
}

export interface ProposalRecord {
  id: string;
  createdAt: string;
  input: ProposalInput;
  analysis: ProposalAnalysis;
  lifecycleState: ProposalLifecycleState;
  stateTimestamps: Partial<Record<ProposalLifecycleState, string>>;
  autoPilotDecision?: AutoPilotDecisionRecord;
  source: 'Manual' | 'Captura Simulada' | 'API Oficial (Pendente)';
  isDemo: boolean;
}

export type AutoPilotMode = 'Manual' | 'Assistido' | 'Automático';

export interface AutoPilotConfig {
  mode: AutoPilotMode;
  thresholds: ProposalThresholds;
  prioritizeCampaigns: boolean;
  includeBonusInThreshold: boolean;
  exceptions: string[];
  officialAutomationAuthorized: boolean;
}

export interface AutoPilotDecisionRecord {
  id: string;
  proposalId: string;
  timestamp: string;
  platformId: PlatformId;
  modeAtDecision: AutoPilotMode;
  action: 'Aceitar sugerido' | 'Recusar sugerido' | 'Aguardar decisão manual' | 'Bloqueado por ausência de API oficial';
  rulesMatched: string[];
  platformConfirmed: boolean;
  reason: string;
}

export interface AndroidOverlayConfig {
  position: 'Topo' | 'Centro' | 'Fundo';
  widthPercent: number;
  opacityPercent: number;
  fontSizePx: number;
  bgColor: string;
  textColor: string;
  borderColor: string;
  themePreset: 'AIVAD Azul Noite' | 'Alto Contraste Dia' | 'Minimalista Escuro';
  visibleMetrics: Array<'eurPerKm' | 'eurPerHour' | 'eurPerMin' | 'estimatedNet' | 'emptyReturnRisk'>;
  durationSeconds: number;
  autoDismiss: boolean;
  showHistoryFloatingButton: boolean;
}

export type CaptureSource =
  | 'Notificação Android Autorizada'
  | 'API Oficial'
  | 'Extrato Importado'
  | 'Relatório CSV/PDF'
  | 'Captura Voluntária'
  | 'OCR'
  | 'Manual';

export type CaptureDataType =
  | 'Viagem'
  | 'Ganho'
  | 'Gorjeta'
  | 'Campanha'
  | 'Bónus'
  | 'Avaliação'
  | 'Pontos'
  | 'Nível'
  | 'Pagamento'
  | 'Comissão'
  | 'Ajuste'
  | 'Comunicado';

export type CaptureStatus =
  | 'Capturado'
  | 'Interpretado'
  | 'Pendente'
  | 'Confirmado'
  | 'Associado'
  | 'Rejeitado'
  | 'Corrigido';

export interface SmartCaptureRecord {
  id: string;
  externalTxId: string;
  dedupKey: string;
  source: CaptureSource;
  dataType: CaptureDataType;
  platformId: PlatformId;
  capturedAt: string;
  amountEur: number;
  relatedTripRef?: string;
  matchedTripId?: string;
  status: CaptureStatus;
  rawSummary: string;
  duplicateOfId?: string;
  isDemo: boolean;
}

export type TripStatus = 'Concluída' | 'Cancelada' | 'Em curso' | 'Ajustada';

export interface TripRecord {
  id: string;
  externalRef: string;
  platformId: PlatformId;
  vehicleId: string;
  date: string;
  time: string;
  grossEur: number;
  tipEur: number;
  bonusEur: number;
  tollsEur: number;
  commissionEur: number;
  operationalCostEur: number;
  netEur: number;
  currency?: CurrencyCode;
  originalGrossAmount?: number;
  originalNetAmount?: number;
  fxRateToBase?: number;
  countryCode?: string;
  pickupDistanceKm: number;
  tripDistanceKm: number;
  durationMin: number;
  pickupZone: string;
  destinationZone?: string;
  category: string;
  status: TripStatus;
  source: CaptureSource;
  proposalId?: string;
  isDemo: boolean;
}

export interface CampaignRecord {
  id: string;
  platformId: PlatformId;
  name: string;
  rewardEur: number;
  targetTrips: number;
  completedTrips: number;
  periodStart: string;
  periodEnd: string;
  scheduleWindow: string;
  zone: string;
  requirements: string;
  estimatedExtraCostEur: number;
  status: 'Ativa' | 'Concluída' | 'Expirada' | 'Rascunho';
  source: CaptureSource;
  isDemo: boolean;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category:
    | 'Aluguer'
    | 'Financiamento'
    | 'Energia'
    | 'Combustível'
    | 'Portagens'
    | 'Estacionamento'
    | 'Seguro'
    | 'Manutenção'
    | 'Pneus'
    | 'Limpeza'
    | 'Contabilidade'
    | 'Impostos'
    | 'Outras despesas';
  description: string;
  amountEur: number;
  currency?: CurrencyCode;
  originalAmount?: number;
  vehicleId?: string;
  deductible: boolean;
  isDemo: boolean;
}

export interface ShiftRecord {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  mealMinutes: number;
  restMinutes: number;
  onlineMinutes: number;
  productiveMinutes: number;
  waitMinutes: number;
  totalKm: number;
  passengerKm: number;
  emptyKm: number;
  vehicleId: string;
  notes: string;
  auditHistory: Array<{ at: string; change: string }>;
  isDemo: boolean;
}

// ============================================================
// AIVAD TACÓGRAFO TVDE (Independent Audited Tachograph Engine)
// ============================================================
export type TachographState =
  | 'Fora de serviço'
  | 'Início de turno'
  | 'Condução em serviço'
  | 'Trabalho sem condução'
  | 'Disponibilidade'
  | 'Espera'
  | 'Pausa'
  | 'Refeição'
  | 'Descanso'
  | 'Fim de turno';

export interface TachographRevision {
  revisedAt: string;
  revisedBy: string;
  reason: string;
  previousState: TachographState;
  previousStartIso: string;
  previousEndIso?: string;
  previousOdometerKm: number;
  previousNotes: string;
}

export interface TachographActivityRecord {
  id: string;
  shiftSessionId: string;
  driverId: string;
  vehicleId: string;
  operatorName: string;
  date: string;
  state: TachographState;
  startIso: string;
  endIso?: string;
  durationMinutes: number;
  odometerStartKm: number;
  odometerEndKm?: number;
  platformId?: PlatformId;
  movementKind?: 'Com passageiro' | 'Deslocação em vazio' | 'Estacionado / Sem movimento';
  source: 'Manual' | 'Sincronizado Viagem' | 'Offline Queue';
  notes: string;
  status: 'Ativo' | 'Fechado' | 'Corrigido';
  syncStatus: 'Sincronizado' | 'Pendente Offline' | 'Conflito Resolvido';
  idempotencyKey: string;
  revisions: TachographRevision[];
  isDemo: boolean;
}

export interface TachographShiftSession {
  id: string;
  driverId: string;
  vehicleId: string;
  operatorName: string;
  date: string;
  startIso: string;
  endIso?: string;
  odometerStartKm: number;
  odometerCurrentKm: number;
  odometerEndKm?: number;
  currentState: TachographState;
  status: 'Em curso' | 'Encerrado';
  countryCode: string;
  city: string;
  qrVerificationHash: string;
  isDemo: boolean;
}

export interface TachographPlatformInterval {
  id: string;
  platformId: PlatformId;
  date: string;
  startIso: string;
  endIso: string;
  kind: 'Online' | 'Viagem Passageiro' | 'Recolha Vazio';
}

export interface TachographOfflineQueueItem {
  id: string;
  idempotencyKey: string;
  createdAtIso: string;
  actionType: 'START_SHIFT' | 'TRANSITION' | 'CLOSE_SHIFT' | 'TRIP_SYNC';
  targetState?: TachographState;
  odometerKm: number;
  notes: string;
  syncState: 'Na fila offline' | 'Sincronizado' | 'Duplicado ignorado' | 'Conflito resolvido';
  conflictReason?: string;
}

export interface TachographDiscrepancy {
  id: string;
  timestamp: string;
  severity: 'Aviso' | 'Erro' | 'Conflito';
  message: string;
  resolved: boolean;
}

export interface TachographStateStore {
  sessions: TachographShiftSession[];
  activities: TachographActivityRecord[];
  platformIntervals: TachographPlatformInterval[];
  offlineQueue: TachographOfflineQueueItem[];
  discrepancies: TachographDiscrepancy[];
  activeSessionId: string | null;
}

// ============================================================
// COMPLIANCE & DOCUMENTS
// ============================================================
export interface ComplianceObligation {
  id: string;
  countryCode: string;
  title: string;
  category:
    | 'Lei TVDE'
    | 'Lei n.º 59/2026'
    | 'Dístico Inamovível'
    | 'Inspeções'
    | 'Equipamentos e Extintores'
    | 'Seguro'
    | 'Formação'
    | 'Certificados'
    | 'Licenças'
    | 'Requisitos de Veículos'
    | 'Obrigações Fiscais';
  officialSource: string;
  articleRef: string;
  publishedDate: string;
  effectiveDate: string;
  adaptationDeadline: string;
  status:
    | 'Publicado'
    | 'Em vigor'
    | 'A aguardar regulamentação'
    | 'Em transição'
    | 'Revogado'
    | 'Em análise';
  affectedProfile: 'Todos TVDE' | 'Motoristas' | 'Operadores' | 'Veículos Elétricos' | 'Frotas';
  summary: string;
  humanValidated: boolean;
  validatedBy?: string;
  validatedAt?: string;
  isDemo: boolean;
}

export interface DriverDocument {
  id: string;
  title: string;
  category: 'Motorista' | 'Veículo' | 'Fiscal' | 'Seguro';
  linkedObligationId?: string;
  expiryDate: string;
  status: 'Válido' | 'A expirar' | 'Expirado' | 'Pendente';
  referenceCode: string;
  isDemo: boolean;
}

export interface PassengerReviewRecord {
  id: string;
  createdAt: string;
  tripId?: string;
  platformId: PlatformId;
  stars: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  notes: string;
  generatedText: string;
  copiedCount: number;
  sentViaOfficialApi: false;
  isDemo: boolean;
}

export interface DashcamClip {
  id: string;
  recordedAt: string;
  tripId?: string;
  durationSec: number;
  sizeMb: number;
  resolution: '1080p' | '1440p' | '4K';
  protectedLock: boolean;
  retentionDays: number;
  privacyZoneMasked: boolean;
  status: 'Armazenado Localmente' | 'Exportado' | 'Agendado para Eliminação';
  isDemo: boolean;
}

export interface MapZoneRecord {
  id: string;
  name: string;
  city: string;
  countryCode?: string;
  x: number;
  y: number;
  radius: number;
  historicalDemand: 'Alta' | 'Média' | 'Baixa';
  trafficLevel: 'Fluido' | 'Moderado' | 'Intenso';
  tollsNearby: boolean;
  evChargersCount: number;
  parkingSpots: number;
  isBase: boolean;
  preference: 'Favorita' | 'Neutra' | 'Evitar';
  activeEvent?: string;
}

export interface PlanRecord {
  id: string;
  name: string;
  audience: string;
  monthlyPriceEur: number;
  annualPriceEur: number;
  currency: CurrencyCode;
  countries: string[];
  maxVehicles: number;
  features: string[];
  autoPilotAllowed: boolean;
  advancedReportsAllowed: boolean;
  billingChannels: Array<'Web Stripe (A Validar)' | 'Google Play Billing' | 'Apple App Store'>;
  trialDays: number;
  active: boolean;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  status: 'Ativa' | 'Em teste' | 'Cancelada' | 'Suspensa';
  billingCycle: 'Mensal' | 'Anual';
  channel: 'Web' | 'Google Play' | 'Apple';
  renewsAt: string;
  priceEur: number;
}

export interface PaymentTransactionRecord {
  id: string;
  subscriptionId: string;
  userId: string;
  userName: string;
  countryCode: string;
  currency: CurrencyCode;
  amount: number;
  channel: 'Web Stripe (A Validar)' | 'Google Play Billing' | 'Apple App Store';
  status: 'Liquidado (Demo)' | 'Pendente' | 'Reembolsado' | 'Falhado';
  createdAt: string;
  invoiceRef: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'Motorista' | 'Operador' | AdminRole;
  countryCode: string;
  city: string;
  status: 'Ativo' | 'Suspenso' | 'Inativo';
  planId: string;
  osPlatform: 'Android' | 'iOS' | 'Web';
  appVersion: string;
  privacyConsentForSupport: boolean;
  createdAt: string;
  isDemo: boolean;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  countryCode: string;
  taxId: string;
  driversCount: number;
  vehiclesCount: number;
  planId: string;
  status: 'Ativa' | 'Em validação' | 'Suspensa';
}

export interface TicketRecord {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  category: 'Técnico' | 'Financeiro' | 'Conformidade' | 'Plataformas' | 'Assinatura';
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  status: 'Aberto' | 'Em análise' | 'Aguardar utilizador' | 'Resolvido';
  assignee: string;
  slaHours: number;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    sender: 'Motorista' | 'Suporte';
    senderName: string;
    text: string;
    internalNote?: boolean;
    at: string;
  }>;
}

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  category: 'Legislação' | 'Campanha' | 'Sistema' | 'Suporte' | 'Administração';
  targetUserId: string | 'ALL';
  createdAt: string;
  expiresAt?: string;
  delivered: boolean;
  read: boolean;
  sourceModule: string;
}

export interface FeatureSuggestion {
  id: string;
  title: string;
  module: string;
  impact: 'Rentabilidade' | 'Segurança' | 'Conformidade' | 'Usabilidade';
  description: string;
  status: 'Recebida' | 'Em avaliação' | 'Planeada' | 'Implementada';
  votes: number;
  createdAt: string;
}

export interface AppVersionRecord {
  id: string;
  channel: 'Android' | 'iOS' | 'Web' | 'Backend';
  version: string;
  buildNumber: number;
  minSupportedVersion: string;
  mandatoryUpdate: boolean;
  rolloutPct: number;
  status: 'Publicado' | 'Gradual' | 'Rascunho' | 'Arquivado';
  releaseDate: string;
  notes: string;
}

export interface CmsContentState {
  heroTitle: string;
  heroSubtitle: string;
  announcementBanner: string;
  showAnnouncement: boolean;
  featuredCountriesCount: number;
  publications: Array<{
    id: string;
    title: string;
    category: 'Funcionalidade' | 'Versão' | 'Comunicado' | 'Conformidade';
    summary: string;
    publishedAt: string;
    status: 'Publicado' | 'Rascunho';
  }>;
  revisionHistory: Array<{
    id: string;
    savedAt: string;
    savedBy: string;
    summary: string;
    snapshot: {
      heroTitle: string;
      heroSubtitle: string;
      announcementBanner: string;
      showAnnouncement: boolean;
    };
  }>;
}

export interface CountryRegionConfig {
  name: string;
  cities: string[];
  localRulesNote?: string;
}

export interface CountryMarketConfig {
  code: string;
  name: string;
  nativeName: string;
  language: string;
  languageCode: string;
  currency: CurrencyCode;
  currencySymbol: string;
  decimalSeparator: ',' | '.';
  timezone: string;
  unitSystem: UnitSystem;
  vatPct: number;
  activePlatforms: PlatformId[];
  tvdeRegulated: boolean;
  driverLicenseRequired: string;
  vehicleMaxAgeYears: number;
  taxCategories: string[];
  regions: CountryRegionConfig[];
  marketStatus: MarketStatus;
  notes?: string;
}

export interface LocalizationProfile {
  currentLocation: {
    countryCode: string;
    countryName: string;
    region: string;
    city: string;
    approxAddress: string;
    timezone: string;
    latitude?: number;
    longitude?: number;
    detectedBy: 'Geolocation API' | 'Browser Locale Fallback' | 'Seleção Manual';
    detectedAt: string;
  };
  residenceCountryCode: string;
  primaryProfessionalMarketCode: string;
  additionalProfessionalMarketCodes: string[];
  selectedMarketCode: string;
  languageCode: string;
  unitSystem: UnitSystem;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unavailable';
  firstOpenConfirmed: boolean;
  pendingCountryChangePrompt?: {
    newCountryCode: string;
    newCity: string;
    newRegion: string;
    reason: string;
  } | null;
}

export interface EcosystemEvent {
  id: string;
  idempotencyKey: string;
  type:
    | 'TRIP_COMPLETED'
    | 'TIP_RECONCILED'
    | 'CAMPAIGN_IDENTIFIED'
    | 'LEGISLATION_VALIDATED'
    | 'VEHICLE_ELIGIBILITY_UPDATED'
    | 'PLATFORM_STATUS_CHANGED'
    | 'SUBSCRIPTION_CHANGED'
    | 'CMS_PUBLISHED'
    | 'TICKET_UPDATED'
    | 'TACHOGRAPH_RECORDED'
    | 'TACHOGRAPH_CORRECTED'
    | 'MARKET_STATUS_CHANGED'
    | 'LOCATION_UPDATED';
  source: string;
  target: string;
  userId: string;
  timestamp: string;
  payloadSummary: string;
  status: 'Processado' | 'Ignorado (Idempotente)' | 'Pendente';
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  environment: EcosystemMode;
  action: string;
  entity: string;
  details: string;
}

export interface RemoteConfigState {
  environment: 'development' | 'staging' | 'production';
  offlineSyncEnabled: boolean;
  gdprStrictMode: boolean;
  defaultTargetEurPerKm: number;
  defaultTargetEurPerHour: number;
  enableAiAssistantServerProxy: boolean;
  featureFlags: Record<string, boolean>;
}
