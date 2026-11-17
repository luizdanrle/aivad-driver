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

export type UserRole = 'Motorista' | 'Operador' | AdminRole;

export type RuntimeEnvironmentMode = 'development' | 'test' | 'preview' | 'production';

export type CountryCatalogTier =
  | 'Mercado Oficialmente Ativo'
  | 'País Configurado'
  | 'País Suportado';

export type PlatformCountryOperationalStatus =
  | 'Operação efetiva validada'
  | 'Licenciada sem operação confirmada'
  | 'Disponibilidade regional limitada'
  | 'Suspensa'
  | 'Encerrada no país'
  | 'Em validação';

export interface PlatformCountryOperation {
  countryCode: string;
  operationalStatus: PlatformCountryOperationalStatus;
  regions?: string[];
  cities?: string[];
  preselectForDrivers: boolean;
  licensingNote?: string;
  validationSource: string;
  verifiedAt: string;
  nextReviewAt?: string;
  history: Array<{
    date: string;
    status: PlatformCountryOperationalStatus;
    note: string;
  }>;
}

export interface AuthSession {
  authenticated: boolean;
  sessionId?: string;
  userId: string;
  userName: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
  signedInAt: string;
  expiresAt?: string;
  isDemoSession?: boolean;
  authMethod?: 'server_credentials' | 'demo_sandbox';
}

export type SyncStatusState = 'sincronizado' | 'local' | 'pendente' | 'erro';
export type DataScopeFilter = 'real' | 'demo' | 'all';

export type PlatformId =
  | 'uber'
  | 'bolt'
  | 'pop'
  | 'vloz'
  | 'cabify'
  | 'freenow'
  | string;

export type PlatformStatus = 'Ativa' | 'Oculta' | 'Suspensa' | 'Encerrada';
export type IntegrationAvailability =
  | 'Disponível'
  | 'Indisponível'
  | 'Em análise'
  | 'Descontinuada';

export type PlatformDriverLifecycleState =
  | 'Ativa e operacional'
  | 'Desativada pelo motorista'
  | 'Não operacional no mercado'
  | 'Ainda não validada'
  | 'Verificação desatualizada'
  | 'Suspensa/Indisponível por administração'
  | 'Integração não configurada'
  | 'Integração com erro';

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
  lastErrorNote?: string;
  countryOperations?: PlatformCountryOperation[];
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

export type VehicleOwnership = 'Própria' | 'Financiada' | 'Alugada';

export type EnergyTariffProfile =
  | 'Doméstico'
  | 'Garagem'
  | 'Público AC'
  | 'Rápido DC'
  | 'Combustível';

export interface VehicleColorRule {
  permitted: string[];
  mandatory?: string[];
  forbidden?: string[];
  status: 'Regra confirmada' | 'Sem restrição conhecida' | 'Informação ainda não confirmada';
  source: string;
  verifiedAt: string;
  validUntil?: string;
}

export interface VehicleMarketEligibilityDetail {
  status:
    | 'Elegível'
    | 'Não elegível'
    | 'Elegibilidade condicionada'
    | 'Informação ainda não confirmada';
  maxAgeYears: number;
  expiresOnDate: string;
  source: string;
  verifiedAt: string;
  conditions: string[];
}

export interface VehicleResaleEstimate {
  minValueEur: number;
  midValueEur: number;
  maxValueEur: number;
  valuationType:
    | 'Estimativa algorítmica AIVAD'
    | 'Preço anunciado observado'
    | 'Transação real declarada';
  mileagePenaltyPer10kEur: number;
  caveats: string[];
  updatedAt: string;
}

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
  homologatedRangeKm?: number;
  realRangeKm?: number;
  rangeStandard?: 'WLTP' | 'EPA' | 'NEDC' | 'Estimado';
  rangeSource?: string;
  rangeUpdatedAt?: string;
  consumptionPer100Km: number;
  consumptionUnit: 'kWh' | 'L' | 'kg';
  fuelType: FuelType;
  ownership?: VehicleOwnership;
  energyTariffProfile?: EnergyTariffProfile;
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
  odometerKm?: number;
  countryCode: string;
  city: string;
  eligibilityValidUntil?: string;
  catalogSource?: string;
  catalogVerifiedAt?: string;
  colorRule?: VehicleColorRule;
  marketEligibilityDetail?: VehicleMarketEligibilityDetail;
  resaleEstimate?: VehicleResaleEstimate;
  isActiveDriverVehicle: boolean;
  organizationId?: string | null;
  ownerUserId?: string;
  isDemo: boolean;
}

export interface VehicleEligibilityResult {
  vehicleId: string;
  tvdeLegalEligible: boolean;
  eligibilityStatus:
    | 'Elegível'
    | 'Não elegível'
    | 'Elegibilidade condicionada'
    | 'Informação ainda não confirmada';
  expiresOnDate?: string;
  tvdeReasons: string[];
  platformEligibility: Record<
    string,
    {
      eligible: boolean;
      statusLabel?: 'Elegível' | 'Não elegível' | 'Elegibilidade condicionada';
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
  pickupAddress?: string;
  destinationAddress?: string;
  notes?: string;
  vehicleCostPerKmEur: number;
  commissionPct?: number;
  calculationBasis?: 'total_distance' | 'trip_distance_only';
  mode: AnalysisMode;
  unavailableFields?: Array<
    | 'pickupDistanceKm'
    | 'pickupTimeMin'
    | 'tripDistanceKm'
    | 'tripTimeMin'
    | 'commissionPct'
    | 'vehicleCostPerKmEur'
  >;
}

export interface ProposalThresholds {
  minValueEur: number;
  maxValueEur?: number;
  minEurPerKm: number;
  minEurPerHour: number;
  maxPickupKm: number;
  maxPickupTimeMin?: number;
  maxTotalDistanceKm: number;
  maxTotalTimeMin: number;
  allowedPlatforms: PlatformId[];
  allowedCategories: string[];
  allowedRegions: string[];
  destinationZonesPreferred?: string[];
  allowedDaysOfWeek?: number[]; // 0=Dom .. 6=Sáb
  activeScheduleWindow: string;
  avoidEmptyReturnRisk?: boolean;
  dailyGoalEur?: number;
  weeklyGoalEur?: number;
  monthlyGoalEur?: number;
  maxContinuousDrivingMin?: number;
  minBreakMinutes?: number;
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
  commissionPctApplied?: number;
  commissionEur?: number;
  operatingCostEur: number;
  estimatedNetEur: number;
  profitabilityPct?: number;
  emptyReturnRisk: 'Baixo' | 'Médio' | 'Alto';
  returnPassengerProbabilityPct?: number | null;
  returnProbabilityEpistemicTag?: EpistemicTag;
  batteryAdequate?: boolean;
  tvdeLimitCompliant?: boolean;
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
  source: 'Manual' | 'Captura Simulada' | 'API Oficial (Pendente)' | 'Notificação/OCR' | 'Conector Autorizado';
  isSimulatedSandbox?: boolean;
  isDemo: boolean;
}

export type AutoPilotMode = 'Manual' | 'Semiautomático' | 'Assistido' | 'Automático';
export type StrategyMode = 'Manual' | 'Semiautomático' | 'Automático';

export interface StrategyPreset {
  id: string;
  name: string;
  mode: StrategyMode;
  thresholds: ProposalThresholds;
  semiAutoBounds?: {
    minEurPerKmFloor: number;
    minEurPerKmCeil: number;
    minEurPerHourFloor: number;
    minEurPerHourCeil: number;
    maxPickupKmFloor: number;
    maxPickupKmCeil: number;
  };
  updatedAt: string;
}

export interface StrategyAdjustmentLogEntry {
  id: string;
  timestamp: string;
  mode: StrategyMode;
  parameter: 'minEurPerKm' | 'minEurPerHour' | 'maxPickupKm' | 'minValueEur';
  parameterLabel: string;
  previousValue: number;
  newValue: number;
  conditionTriggered: string;
  reason: string;
  requiresConfirmation?: boolean;
  confirmedByDriver?: boolean;
  observedOutcome?: string;
  reverted: boolean;
}

export interface AutoPilotConfig {
  mode: AutoPilotMode;
  strategyMode?: StrategyMode;
  thresholds: ProposalThresholds;
  modeConfigs?: Record<StrategyMode, ProposalThresholds>;
  semiAutoBounds?: {
    minEurPerKmFloor: number;
    minEurPerKmCeil: number;
    minEurPerHourFloor: number;
    minEurPerHourCeil: number;
    maxPickupKmFloor: number;
    maxPickupKmCeil: number;
  };
  savedPresets?: StrategyPreset[];
  adjustmentLogs?: StrategyAdjustmentLogEntry[];
  prioritizeCampaigns: boolean;
  includeBonusInThreshold: boolean;
  exceptions: string[];
  officialAutomationAuthorized: boolean;
  authorizedExecutionChannel?: 'Nenhum' | 'API Oficial Autorizada' | 'Bridge Nativo Autorizado';
}

export type AutoPilotDecisionAction =
  | 'Executado automaticamente: Aceitar'
  | 'Executado automaticamente: Recusar'
  | 'Decisão pronta (Ação assistida): Aceitar'
  | 'Decisão pronta (Ação assistida): Recusar'
  | 'Aceitar sugerido'
  | 'Recusar sugerido'
  | 'Aguardar decisão manual'
  | 'Bloqueado por ausência de API oficial';

export interface AutoPilotDecisionRecord {
  id: string;
  proposalId: string;
  timestamp: string;
  platformId: PlatformId;
  modeAtDecision: AutoPilotMode;
  action: AutoPilotDecisionAction;
  rulesMatched: string[];
  executedAutomatically?: boolean;
  executionChannelUsed?: string;
  platformConfirmed: boolean;
  driverOverride?: 'Aceite manualmente' | 'Recusado manualmente' | 'Mantido';
  overrideReason?: string;
  reason: string;
}

export type FloatingMetricKey =
  | 'eurPerKm'
  | 'eurPerHour'
  | 'eurPerMin'
  | 'emptyReturnRisk'
  | 'pickupDistanceKm'
  | 'pickupTimeMin'
  | 'tripDistanceKm'
  | 'tripTimeMin'
  | 'totalDistanceKm'
  | 'totalTime'
  | 'grossValueEur'
  | 'estimatedNet'
  | 'commissionEur'
  | 'operatingCostEur'
  | 'score'
  | 'profitabilityPct';

export type FloatingCardProfileId = 'Urbano' | 'Aeroporto' | 'Noturno' | 'Alto Contraste' | 'Personalizado';

export type FloatingCardOperationalMeaning = 'Favorável' | 'Atenção' | 'Evitar';

export type FloatingCardPosition =
  | 'Centro superior'
  | 'Centro inferior'
  | 'Lateral esquerda'
  | 'Lateral direita'
  | 'Topo esquerdo'
  | 'Topo direito'
  | 'Inferior esquerdo'
  | 'Inferior direito'
  | 'Centro'
  | 'Topo'
  | 'Fundo';

export interface FloatingCardTierStyleConfig {
  tierKey: ProposalClassification;
  operationalMeaning: FloatingCardOperationalMeaning;
  customLabel: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  badgeBgColor: string;
  badgeTextColor: string;
  borderWidthPx: number;
  opacityPercent: number;
  brightnessAdjust: number; // -40 (escurecer) .. +40 (clarear)
  colorIntensityPct: number; // 20 .. 180
  fontFamily: 'Sans' | 'Display' | 'Mono';
  fontSizePx: number;
  widthPercent: number;
  cardMinHeightPx?: number;
  paddingPx?: number;
  layoutMode: 'compacto' | 'expandido';
  position: FloatingCardPosition;
  marginOffsetPx: number;
  visibleMetrics: FloatingMetricKey[];
}

export interface FloatingDockConfig {
  enabled: boolean;
  position: 'Inferior direito' | 'Inferior esquerdo';
  themeTone: 'azul' | 'vermelho' | 'indigo' | 'esmeralda' | 'personalizado';
  bgColor: string;
  textColor: string;
  borderColor: string;
  marginBottomPx?: number;
  marginSidePx?: number;
}

export interface AndroidOverlayConfig {
  position: FloatingCardPosition;
  marginOffsetPx?: number;
  layoutMode?: 'compacto' | 'expandido';
  captureProfile?: FloatingCardProfileId;
  widthPercent: number;
  opacityPercent: number;
  brightnessAdjust?: number;
  colorIntensityPct?: number;
  fontSizePx: number;
  fontFamily?: 'Sans' | 'Display' | 'Mono';
  bgColor: string;
  textColor: string;
  borderColor: string;
  borderWidthPx?: number;
  useCustomColors?: boolean;
  themePreset: 'AIVAD Adaptativo' | 'AIVAD Azul Noite' | 'Alto Contraste Dia' | 'Minimalista Escuro';
  visibleMetrics: FloatingMetricKey[];
  classificationProfiles?: Record<ProposalClassification, FloatingCardTierStyleConfig>;
  durationSeconds: number;
  autoDismiss: boolean;
  allowManualClose?: boolean;
  allowMinimize?: boolean;
  highContrastAccessibility?: boolean;
  largeTouchTargets?: boolean;
  showHistoryFloatingButton: boolean;
}

export interface ProposalGalleryExample {
  id: string;
  qualityTier: 'Boa' | 'Razoável' | 'Má';
  expectedClassification: ProposalClassification;
  platformId: 'uber' | 'bolt';
  title: string;
  sourceNotice: string;
  anonymizedPassengerAlias: string;
  anonymizedPickupLabel: string;
  anonymizedDestinationLabel: string;
  commissionPctAssumption: number;
  input: ProposalInput;
  decisionExplanation: string;
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
  | 'Proposta'
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

export interface CaptureCorrectionEntry {
  correctedAt: string;
  correctedBy: string;
  field: string;
  previousValue: string | number;
  newValue: string | number;
  reason: string;
}

export interface NormalizedCapturePayload {
  platformId: PlatformId;
  dataType: CaptureDataType;
  offerOrGrossEur: number;
  pickupDistanceKm?: number;
  tripDistanceKm?: number;
  estimatedDurationMin?: number;
  pickupZone?: string;
  destinationZone?: string;
  category?: string;
  bonusEur?: number;
  tipEur?: number;
  actualNetEur?: number;
  outcomeStatus?: TripStatus;
  source: CaptureSource;
  capturedAtIso: string;
  confidencePct: number;
  externalTxId: string;
  rawText: string;
}

export interface SmartCaptureRecord {
  id: string;
  externalTxId: string;
  dedupKey: string;
  source: CaptureSource;
  dataType: CaptureDataType;
  platformId: PlatformId;
  capturedAt: string;
  amountEur: number;
  pickupDistanceKm?: number;
  tripDistanceKm?: number;
  estimatedDurationMin?: number;
  destinationZone?: string;
  category?: string;
  bonusEur?: number;
  tipEur?: number;
  outcomeStatus?: string;
  confidencePct?: number;
  corrections?: CaptureCorrectionEntry[];
  relatedTripRef?: string;
  matchedTripId?: string;
  status: CaptureStatus;
  rawSummary: string;
  duplicateOfId?: string;
  isDemo: boolean;
}

export type TripStatus =
  | 'Recebida'
  | 'Aceite'
  | 'Rejeitada'
  | 'Ignorada ou expirada'
  | 'Cancelada pelo passageiro'
  | 'Cancelada pelo motorista'
  | 'Passageiro não compareceu'
  | 'Concluída'
  | 'Ajustada'
  | 'Em curso'
  | 'Cancelada';

export type CancellationBy = 'Motorista' | 'Passageiro' | 'Plataforma' | 'Desconhecida';

export type TripLifecyclePhase =
  | 'Proposta analisada'
  | 'Aceite pelo motorista'
  | 'Confirmada pela plataforma'
  | 'Em deslocação para recolha'
  | 'Chegada ao local de recolha'
  | 'Em espera pelo passageiro'
  | 'Viagem em curso'
  | 'Concluída'
  | 'Cancelada';

export type ArrivalDetectionMethod =
  | 'Botão manual no AIVAD'
  | 'Geolocalização no ponto (A validar)'
  | 'Notificação app externa (A validar)'
  | 'Entrada manual';

export interface PlatformCancellationRule {
  id: string;
  platformId: PlatformId;
  countryCode: string;
  category: string;
  freeWaitMinutes: number;
  paidWaitStartsAtMinutes: number;
  cancellationDeadlineMinutes: number;
  estimatedCompensationEur: number;
  source: string;
  verifiedAt: string;
  validUntil?: string;
  confirmationStatus:
    | 'Confirmado por fonte oficial'
    | 'Referência operacional estimada'
    | 'Regra não confirmada — consultar app oficial';
  notes: string;
}

export interface TripPreAcceptanceEstimate {
  pickupDistanceKm: number;
  pickupTimeMin: number;
  tripDistanceKm: number;
  tripTimeMin: number;
  totalDistanceKm: number;
  totalTimeMin: number;
  grossEur: number;
  estimatedNetEur: number;
  eurPerKm: number;
  eurPerHour: number;
}

export interface TripPostAcceptanceActual {
  hasObservedActuals: boolean;
  pickupTimeMin?: number | null;
  pickupDistanceKm?: number | null;
  tripTimeMin?: number | null;
  tripDistanceKm?: number | null;
  totalTimeMin?: number | null;
  totalDistanceKm?: number | null;
  navigationTrafficTimeMin?: number | null;
  navigationAppUsed?: 'Waze' | 'Google Maps' | 'Outro' | 'Nenhum';
  navigationStartedAtIso?: string;
  observationSource:
    | 'Sem dados reais observados'
    | 'Registo manual do motorista'
    | 'Cronómetro AIVAD + motorista'
    | 'Conector navegação autorizado';
}

export interface TripFareAdjustmentRecord {
  id: string;
  amountEur: number; // positivo ou negativo
  reason: string;
  status: 'Pendente de confirmação' | 'Confirmado pela plataforma' | 'Rejeitado';
  recordedAtIso: string;
  confirmedAtIso?: string;
  evidenceNote?: string;
}

export interface ActiveTripSession {
  id: string;
  proposalId?: string;
  externalRef: string;
  platformId: PlatformId;
  category: string;
  countryCode: string;
  phase: TripLifecyclePhase;
  aiRecommendation: 'Aceitar' | 'Recusar' | 'Aguardar';
  driverDecision: 'Aceite pelo motorista' | 'Recusado pelo motorista' | 'Não registado';
  platformConfirmed: boolean;
  confirmationMethod: 'Confirmação manual' | 'App oficial (A validar)' | 'Não confirmado';
  acceptedAtIso: string;
  arrivedAtIso?: string;
  waitStartedAtIso?: string;
  tripStartedAtIso?: string;
  endedAtIso?: string;
  arrivalMethod?: ArrivalDetectionMethod;
  pickupDistanceKm: number;
  tripDistanceKm: number;
  pickupTimeEstMin: number;
  tripTimeEstMin: number;
  pickupZone: string;
  pickupAddress?: string;
  destinationZone?: string;
  destinationAddress?: string;
  grossEstimatedEur: number;
  netEstimatedEur: number;
  predictedClassification?: ProposalClassification;
  navigationAppUsed?: 'Waze' | 'Google Maps' | 'Outro' | 'Nenhum';
  navigationStartedAtIso?: string;
  navigationTrafficEstTotalMin?: number | null;
  observedPickupKm?: number | null;
  observedPickupMin?: number | null;
  observedTripKm?: number | null;
  observedTripMin?: number | null;
  ruleApplied: PlatformCancellationRule;
  cancellationBy?: CancellationBy;
  cancellationReason?: string;
  cancellationCompensationEur?: number;
  isDemo: boolean;
}

export type DateRangePreset =
  | 'hoje'
  | 'ontem'
  | 'ultimos_7_dias'
  | 'esta_semana'
  | 'ultimos_30_dias'
  | 'este_mes'
  | 'mes_anterior'
  | 'este_ano'
  | 'personalizado';

export interface FinancialCostConfig {
  includeCommissions: boolean;
  includeEstimatedVehicleCost: boolean;
  includeFixedOwnership: boolean;
  includeTolls: boolean;
  includeLoggedExpenses: boolean;
  includeTaxesReservePct: number;
  monthlyKmEstimate: number;
  defaultCommissionPct: number;
}

export interface TripRecord {
  id: string;
  externalRef: string;
  platformId: PlatformId;
  vehicleId: string;
  date: string;
  time: string;
  grossEur: number;
  estimatedGrossEur?: number;
  chargedTotalEur?: number;
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
  travelToPickupSeconds?: number;
  waitAtPickupSeconds?: number;
  pickupZone: string;
  pickupAddress?: string;
  pickupCoords?: { lat: number; lng: number };
  destinationZone?: string;
  destinationAddress?: string;
  destinationCoords?: { lat: number; lng: number };
  category: string;
  status: TripStatus;
  cancellationBy?: CancellationBy;
  cancellationReason?: string;
  cancellationCompensationEur?: number;
  driverNoShowConfirmed?: boolean;
  officialImpactNote?: string;
  aiRecommendedAction?: string;
  driverExecutionConfirmed?: boolean;
  platformExecutionConfirmed?: boolean;
  lifecycleEventKey?: string;
  isEstimatedBreakdown?: boolean;
  preDecisionSnapshot?: {
    predictedNetEur: number;
    predictedDurationMin: number;
    predictedDistanceKm?: number;
    predictedClassification: ProposalClassification;
    recommendedAction: string;
  };
  initialPresentedGrossEur?: number;
  confirmedFinalGrossEur?: number | null;
  preAcceptanceEstimate?: TripPreAcceptanceEstimate;
  postAcceptanceActual?: TripPostAcceptanceActual;
  fareAdjustments?: TripFareAdjustmentRecord[];
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

export type SavedPlaceType =
  | 'Casa'
  | 'Garagem'
  | 'Carregamento EV'
  | 'Combustível'
  | 'Refeição'
  | 'Descanso'
  | 'Oficina';

export interface SavedPlace {
  id: string;
  name: string;
  type: SavedPlaceType;
  address: string;
  zone: string;
  isFavorite: boolean;
  notes?: string;
  coordinates?: { lat: number; lng: number };
}

export interface DriverRoutinePreferences {
  preferredShiftStart: string;
  preferredShiftEnd: string;
  preferredMealWindow: string;
  preferredChargingWindow: string;
  garageClosingTime: string;
  startBasePlaceId?: string;
  endBasePlaceId?: string;
  dailyNetTargetEur: number;
  maxDailyLegalMinutes: number;
  minBatteryReservePct: number;
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
// AIVAD AI CORE — MULTI-AGENT OPERATIONAL BRAIN
// ============================================================
export type AiCoreAgentId =
  | 'corridas'
  | 'estrategia'
  | 'financeiro'
  | 'trafego'
  | 'veiculos'
  | 'rotina'
  | 'conformidade'
  | 'administrativo';

export type EpistemicTag =
  | 'Informação confirmada'
  | 'Informação histórica'
  | 'Estimativa'
  | 'Previsão'
  | 'Informação indisponível'
  | 'Dados de demonstração';

export type ConfidenceStatus =
  | 'Calibrada por histórico'
  | 'Estimativa preliminar'
  | 'Dados insuficientes'
  | 'Não aplicável';

export interface AiCoreInsight {
  id: string;
  agentId: AiCoreAgentId;
  agentName: string;
  title: string;
  inputsConsidered: string[];
  analysisSteps: string[];
  recommendation: string;
  justification: string;
  operationLog: string;
  observedOutcome?: string;
  confidencePct: number | null;
  confidenceStatus?: ConfidenceStatus;
  epistemicTag: EpistemicTag;
  createdAt: string;
}

export interface AiPredictionRecord {
  id: string;
  driverId: string;
  tripId?: string;
  proposalId?: string;
  createdAt: string;
  agentId: AiCoreAgentId;
  predictedNetEur: number;
  predictedDurationMin: number;
  predictedDistanceKm?: number;
  predictedEurPerHour: number;
  predictedClassification?: ProposalClassification;
  actualNetEur?: number;
  actualDurationMin?: number;
  actualDistanceKm?: number;
  observedClassification?: ProposalClassification;
  classificationMatched?: boolean;
  deltaNetEur?: number;
  deltaDurationMin?: number;
  deltaDistanceKm?: number;
  status: 'Pendente resultado' | 'Calibrado';
  learningNote: string;
  epistemicTag: EpistemicTag;
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

export type ZoneConfidenceTier =
  | '1 · Restrição oficial confirmada'
  | '2 · Dificuldade recorrente (motoristas)'
  | '3 · Ocorrência temporária não confirmada';

export interface ZoneScheduleRule {
  daysOfWeek: number[]; // 0=Dom .. 6=Sáb
  startHour: string; // HH:mm
  endHour: string; // HH:mm
  summary: string;
}

export interface ZoneAlternativePickup {
  id: string;
  label: string;
  streetOrLandmark: string;
  walkingDistanceMeters: number;
  walkingTimeMin: number;
  safetyNote: string;
  verifiedByDriverCount: number;
}

export interface DriverZoneObservation {
  id: string;
  zoneId?: string;
  zoneName: string;
  city: string;
  countryCode: string;
  driverId: string;
  driverAlias: string;
  privacyConsent: boolean;
  observationType:
    | 'Trânsito intenso'
    | 'Corte / Feira / Mercado'
    | 'Obras / Desvio'
    | 'Recolha difícil'
    | 'Ponto seguro alternativo';
  description: string;
  dayOfWeek?: number;
  timeWindow?: string;
  createdAtIso: string;
  recurrenceCount: number;
  validationTier: ZoneConfidenceTier;
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
  tier?: ZoneConfidenceTier;
  schedules?: ZoneScheduleRule[];
  restrictionSource?: string;
  verifiedAt?: string;
  validUntil?: string;
  riskSummary?: string;
  isEventNotConfirmedBan?: boolean;
  alternativePickups?: ZoneAlternativePickup[];
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
  role: UserRole;
  countryCode: string;
  city: string;
  status: 'Ativo' | 'Suspenso' | 'Inativo';
  planId: string;
  osPlatform: 'Android' | 'iOS' | 'Web';
  appVersion: string;
  privacyConsentForSupport: boolean;
  createdAt: string;
  organizationId?: string | null;
  isDemo: boolean;
}

export type OrganizationType =
  | 'Frota TVDE'
  | 'Operador Independente'
  | 'Cooperativa / Equipa'
  | 'Empresa Corporativa';

export interface OrganizationRecord {
  id: string;
  name: string;
  type?: OrganizationType;
  countryCode: string;
  taxId: string;
  driversCount: number;
  vehiclesCount: number;
  planId: string;
  status: 'Ativa' | 'Em validação' | 'Suspensa';
  ownerUserId?: string;
  memberUserIds?: string[];
  vehicleIds?: string[];
  isolationPolicy?: 'strict_tenant';
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

export type PortalSectionId = 'hero' | 'modules' | 'plans' | 'platforms' | 'markets' | 'faq' | 'updates';

export interface CmsContentState {
  brandTitle?: string;
  brandTagline?: string;
  primaryColor?: string;
  accentColor?: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaDriverLabel?: string;
  heroCtaPlansLabel?: string;
  announcementBanner: string;
  showAnnouncement: boolean;
  featuredCountriesCount: number;
  seoTitle?: string;
  seoDescription?: string;
  contactEmail?: string;
  supportHours?: string;
  sectionOrder?: PortalSectionId[];
  visibleSections?: Record<PortalSectionId, boolean>;
  benefits?: Array<{ id: string; title: string; description: string }>;
  faqs?: Array<{ id: string; question: string; answer: string }>;
  navigationMenus?: Array<{
    id: string;
    label: string;
    pageId: string;
    visible: boolean;
    order: number;
  }>;
  pagesContent?: Record<
    string,
    {
      title: string;
      subtitle: string;
      body: string;
      updatedAt: string;
    }
  >;
  mediaAssets?: Array<{
    id: string;
    slot: 'hero' | 'card' | 'logo';
    label: string;
    url: string;
    alt: string;
  }>;
  supportedLanguages?: string[];
  localizedContent?: Record<
    string,
    {
      heroTitle: string;
      heroSubtitle: string;
      brandTagline: string;
      announcementBanner: string;
    }
  >;
  versionNumber?: number;
  draftSnapshot?: Partial<Omit<CmsContentState, 'revisionHistory' | 'draftSnapshot'>> | null;
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
    versionNumber?: number;
    snapshot: {
      heroTitle: string;
      heroSubtitle: string;
      announcementBanner: string;
      showAnnouncement: boolean;
      brandTitle?: string;
      brandTagline?: string;
      primaryColor?: string;
      accentColor?: string;
      heroCtaDriverLabel?: string;
      seoTitle?: string;
      seoDescription?: string;
      contactEmail?: string;
      visibleSections?: Record<PortalSectionId, boolean>;
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
  catalogTier?: CountryCatalogTier;
  validationSource?: string;
  verifiedAt?: string;
  nextReviewAt?: string;
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
    detectedBy: 'Geolocation API' | 'Browser Locale Fallback' | 'Seleção Manual' | 'Indisponível';
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
    | 'LOCATION_UPDATED'
    | 'STRATEGY_ADJUSTED'
    | 'AI_PREDICTION_CALIBRATED';
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

export type LifecycleAuditEventType =
  | 'Proposta recebida'
  | 'Proposta analisada'
  | 'Aceitação / Rejeição'
  | 'Viagem iniciada'
  | 'Chegada à recolha'
  | 'Espera'
  | 'Viagem concluída'
  | 'Cancelamento'
  | 'Falha de captura'
  | 'Perda de ligação'
  | 'Correção manual';

export interface LifecycleAuditEvent {
  id: string;
  idempotencyKey: string;
  eventType: LifecycleAuditEventType;
  originPlatform: PlatformId | 'aivad_system';
  timestamp: string;
  previousState: string;
  currentState: string;
  changeOrigin: 'Motorista' | 'AutoPilot Automático' | 'AutoPilot Semiautomático' | 'Smart Capture' | 'Conector' | 'Sistema';
  associatedEntityId?: string;
  associatedPayloadSummary: string;
  auditTrail: string[];
  isDemo: boolean;
}

export interface ZoneRelocationLog {
  id: string;
  zoneId?: string;
  fromZone: string;
  targetZone: string;
  suggestedReason: string;
  epistemicBasis: EpistemicTag;
  startedAtIso: string;
  completedAtIso?: string;
  outcome: 'Em deslocação' | 'Corrida obtida na zona' | 'Sem corrida (reposicionado)' | 'Cancelado';
  resultingTripId?: string;
  waitMinutesUntilRide?: number;
  destinationNotes?: string;
  isDemo: boolean;
}

export interface ReferralCouponRecord {
  id: string;
  code: string;
  referrerUserId?: string;
  referrerName: string;
  countryScope: string[]; // ['ALL'] ou códigos ISO
  trialDaysGranted: number; // ex.: 30 dias
  discountPctAfterTrial: number;
  maxRedemptions: number;
  currentRedemptions: number;
  validUntil: string;
  active: boolean;
  billingExecutionState: 'Preparado (Sem cobrança real ativa)';
}

export type VehicleSortOption = 'relevance' | 'costAsc' | 'rangeDesc' | 'yearDesc' | 'trunkDesc';

export interface PersistedVehicleCatalogFilters {
  searchQuery: string;
  countryCode: string;
  city: string;
  platformId: string;
  category: string;
  brand: string;
  model: string;
  version: string;
  yearMin: number;
  yearMax: number;
  fuelType: string;
  minSeats: number;
  minDoors: number;
  minBatteryKwh: number;
  minRangeKm: number;
  minTrunkLiters: number;
  colorQuery: string;
  onlyEligible: boolean;
  maxCostPerKmEur: number;
  sortBy: VehicleSortOption;
}

export type CostFrequency = 'diária' | 'semanal' | 'mensal' | 'anual';
export type CostBehaviorType = 'fixo' | 'variável';
export type TaxRegimeType =
  | 'ENI / Recibos Verdes'
  | 'Unipessoal / Empresa'
  | 'Parceiro Frota / Cooperativa'
  | 'Isento / Outro';

export interface OperatorCostItem {
  id: string;
  name: string;
  amount: number;
  costType: CostBehaviorType;
  frequency: CostFrequency;
  enabled: boolean;
  notes?: string;
}

export interface CostsCalculatorConfig {
  targetMonthlyNetIncome: number;
  workDaysPerMonth: number;
  hoursPerDay: number;
  avgKmPerDay: number;
  averagePlatformCommissionPct: number;
  taxRegime: TaxRegimeType;
  applyTaxes: boolean;
  vatPct: number;
  ircOrIrsPct: number;
  socialSecurityPct: number;
  operatorCosts: OperatorCostItem[];
  vehicleEnergyMode: 'electric' | 'combustion' | 'hybrid';
  vehicleLeaseOrInstallmentMonthly: number;
  vehicleKwhPer100Km: number;
  vehicleEurPerKwh: number;
  vehicleLitersPer100Km: number;
  vehicleEurPerLiter: number;
  vehicleInsuranceAmount: number;
  vehicleInsuranceFrequency: 'mensal' | 'anual';
  vehicleMaintenanceMonthly: number;
  vehicleTiresMonthly: number;
  vehicleIucAnnual: number;
  vehicleOtherMonthly: number;
  operationalParkingMonthly: number;
  operationalTollsMonthly: number;
  operationalOtherMonthly: number;
  personalMealsDaily: number;
  personalPhoneMonthly: number;
  personalOtherMonthly: number;
  includePersonalInTargetGross: boolean;
}

export interface PersistedTachographAuditRecord {
  sessionId: string;
  verificationCode: string;
  hmacSignature: string;
  driverAlias: string;
  vehicleLabel: string;
  operatorName: string;
  date: string;
  startIso: string;
  endIso?: string | null;
  odometerStartKm: number;
  odometerEndKm: number;
  distanceKm: number;
  drivingMinutes: number;
  effectiveWorkMinutes: number;
  breakMinutes: number;
  currentState: string;
  status: string;
  countryCode: string;
  city: string;
  updatedAtIso: string;
}
