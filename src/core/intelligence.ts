import type {
  AnalysisMode,
  AutoPilotConfig,
  AutoPilotDecisionRecord,
  CampaignRecord,
  CaptureSource,
  ExpenseRecord,
  ProposalAnalysis,
  ProposalClassification,
  ProposalInput,
  SmartCaptureRecord,
  TripRecord,
  VehicleEligibilityResult,
  VehicleRecord,
} from '../models/types';

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function analyzeProposal(
  input: ProposalInput,
  thresholds: {
    minValueEur: number;
    minEurPerKm: number;
    minEurPerHour: number;
    maxPickupKm: number;
    maxTotalDistanceKm: number;
    maxTotalTimeMin: number;
    weightEurPerKm: number;
    weightEurPerHour: number;
    weightPickupEfficiency: number;
  }
): ProposalAnalysis {
  const safePickupKm = Math.max(0, input.pickupDistanceKm);
  const safeTripKm = Math.max(0.1, input.tripDistanceKm);
  const safePickupMin = Math.max(0, input.pickupTimeMin);
  const safeTripMin = Math.max(1, input.tripTimeMin);

  const totalDistanceKm = round2(safePickupKm + safeTripKm);
  const totalTimeMin = Math.round(safePickupMin + safeTripMin + input.stops * 2);
  const basisDistance =
    input.calculationBasis === 'trip_distance_only' ? safeTripKm : totalDistanceKm;

  const effectiveRevenueEur = round2(
    Math.max(0, input.grossValueEur) + Math.max(0, input.bonusEur)
  );
  const operatingCostEur = round2(
    totalDistanceKm * Math.max(0, input.vehicleCostPerKmEur) + Math.max(0, input.tollsEur)
  );
  const estimatedNetEur = round2(effectiveRevenueEur - operatingCostEur);

  const eurPerKm = round2(effectiveRevenueEur / Math.max(0.1, basisDistance));
  const eurPerHour = round2((effectiveRevenueEur / Math.max(1, totalTimeMin)) * 60);
  const eurPerMin = round2(effectiveRevenueEur / Math.max(1, totalTimeMin));

  const pickupRatio = safePickupKm / Math.max(1, totalDistanceKm);
  const emptyReturnRisk: 'Baixo' | 'Médio' | 'Alto' =
    safeTripKm > 22 || input.region.toLowerCase().includes('periferia')
      ? 'Alto'
      : safeTripKm > 12 || pickupRatio > 0.35
      ? 'Médio'
      : 'Baixo';

  const kmScore = Math.min(100, (eurPerKm / Math.max(0.1, thresholds.minEurPerKm)) * 75);
  const hourScore = Math.min(100, (eurPerHour / Math.max(1, thresholds.minEurPerHour)) * 75);
  const pickupScore = Math.max(0, 100 - pickupRatio * 180);

  let score = 0;
  const mode: AnalysisMode = input.mode;
  if (mode === 'Prioridade €/hora') {
    score = hourScore * 0.65 + kmScore * 0.2 + pickupScore * 0.15;
  } else if (mode === 'Prioridade €/km') {
    score = kmScore * 0.65 + hourScore * 0.2 + pickupScore * 0.15;
  } else if (mode === 'Personalizado') {
    const wSum = Math.max(
      1,
      thresholds.weightEurPerKm + thresholds.weightEurPerHour + thresholds.weightPickupEfficiency
    );
    score =
      (kmScore * thresholds.weightEurPerKm +
        hourScore * thresholds.weightEurPerHour +
        pickupScore * thresholds.weightPickupEfficiency) /
      wSum;
  } else {
    score = kmScore * 0.4 + hourScore * 0.4 + pickupScore * 0.2;
  }
  score = Math.round(Math.max(0, Math.min(100, score)));

  const reasons: string[] = [];
  if (effectiveRevenueEur < thresholds.minValueEur) {
    reasons.push(`Valor total (€${effectiveRevenueEur.toFixed(2)}) abaixo do mínimo (€${thresholds.minValueEur.toFixed(2)}).`);
  }
  if (eurPerKm < thresholds.minEurPerKm) {
    reasons.push(`Rácio €${eurPerKm.toFixed(2)}/km inferior ao objetivo (€${thresholds.minEurPerKm.toFixed(2)}/km).`);
  }
  if (eurPerHour < thresholds.minEurPerHour) {
    reasons.push(`Rendimento horário €${eurPerHour.toFixed(2)}/h abaixo do mínimo (€${thresholds.minEurPerHour.toFixed(2)}/h).`);
  }
  if (safePickupKm > thresholds.maxPickupKm) {
    reasons.push(`Distância de recolha (${safePickupKm.toFixed(1)} km) excede o limite (${thresholds.maxPickupKm.toFixed(1)} km).`);
  }
  if (totalDistanceKm > thresholds.maxTotalDistanceKm) {
    reasons.push(`Distância total (${totalDistanceKm.toFixed(1)} km) acima do máximo definido.`);
  }
  if (totalTimeMin > thresholds.maxTotalTimeMin) {
    reasons.push(`Tempo comprometido (${totalTimeMin} min) acima do limite (${thresholds.maxTotalTimeMin} min).`);
  }

  let classification: ProposalClassification = 'verde';
  if (
    reasons.length >= 2 ||
    eurPerKm < thresholds.minEurPerKm * 0.8 ||
    eurPerHour < thresholds.minEurPerHour * 0.8 ||
    score < 52
  ) {
    classification = 'vermelho';
  } else if (reasons.length === 1 || score < 72) {
    classification = 'amarelo';
  }

  if (reasons.length === 0) {
    reasons.push('Todos os limiares mínimos de rentabilidade, recolha e tempo foram cumpridos.');
  }

  const basisDescription =
    input.calculationBasis === 'trip_distance_only'
      ? `Calculado apenas sobre ${safeTripKm.toFixed(1)} km com passageiro (recolha excluída do denominador €/km).`
      : `Calculado sobre a distância total comprometida (${totalDistanceKm.toFixed(1)} km = recolha + viagem) e tempo total (${totalTimeMin} min).`;

  return {
    totalDistanceKm,
    totalTimeMin,
    effectiveRevenueEur,
    eurPerKm,
    eurPerHour,
    eurPerMin,
    operatingCostEur,
    estimatedNetEur,
    emptyReturnRisk,
    score,
    classification,
    basisDescription,
    reasons,
  };
}

export function evaluateAutoPilot(
  proposalId: string,
  input: ProposalInput,
  analysis: ProposalAnalysis,
  config: AutoPilotConfig,
  activeCampaigns: CampaignRecord[]
): AutoPilotDecisionRecord {
  const now = new Date().toISOString();
  const t = config.thresholds;
  const rulesMatched: string[] = [];

  const platformAllowed =
    t.allowedPlatforms.length === 0 || t.allowedPlatforms.includes(input.platformId);
  if (!platformAllowed) {
    rulesMatched.push(`Plataforma ${input.platformId} fora da lista permitida.`);
  }

  const categoryAllowed =
    t.allowedCategories.length === 0 || t.allowedCategories.includes(input.category);
  if (!categoryAllowed) {
    rulesMatched.push(`Categoria ${input.category} não selecionada para AutoPilot.`);
  }

  const matchesCampaign =
    config.prioritizeCampaigns &&
    activeCampaigns.some((c) => c.platformId === input.platformId && c.status === 'Ativa');
  if (matchesCampaign) {
    rulesMatched.push('Campanha ativa aplicável na plataforma — prioridade aumentada.');
  }

  const passesThresholds =
    analysis.classification === 'verde' &&
    platformAllowed &&
    categoryAllowed &&
    input.pickupDistanceKm <= t.maxPickupKm;

  if (passesThresholds) {
    rulesMatched.push('Proposta cumpre regras AutoPilot (€/km, €/h, recolha e plataforma).');
  } else if (analysis.classification === 'amarelo' && matchesCampaign) {
    rulesMatched.push('Proposta intermédia compensada por campanha ativa.');
  } else {
    rulesMatched.push(...analysis.reasons);
  }

  let action: AutoPilotDecisionRecord['action'] = 'Aguardar decisão manual';
  let reason = '';

  if (config.mode === 'Manual') {
    action = 'Aguardar decisão manual';
    reason = 'Modo Manual ativo: AIVAD apenas calcula e apresenta métricas sem sugerir ação automática.';
  } else if (config.mode === 'Assistido') {
    action =
      passesThresholds || (analysis.classification === 'amarelo' && matchesCampaign)
        ? 'Aceitar sugerido'
        : 'Recusar sugerido';
    reason =
      action === 'Aceitar sugerido'
        ? 'Modo Assistido: recomendação positiva para confirmação humana do motorista.'
        : 'Modo Assistido: recomendação de recusa por rentabilidade ou limites abaixo da meta.';
  } else {
    if (!config.officialAutomationAuthorized) {
      action = 'Bloqueado por ausência de API oficial';
      reason =
        'EXECUÇÃO AUTOMÁTICA BLOQUEADA: Sem integração oficial autorizada pela plataforma (AIVAD não simula cliques nem contorna proteções).';
    } else {
      action = passesThresholds ? 'Aceitar sugerido' : 'Recusar sugerido';
      reason = 'Modo Automático autorizado via adaptador oficial.';
    }
  }

  return {
    id: `apd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    proposalId,
    timestamp: now,
    platformId: input.platformId,
    modeAtDecision: config.mode,
    action,
    rulesMatched,
    platformConfirmed: false,
    reason,
  };
}

export interface CaptureReconciliationOutcome {
  captureRecord: SmartCaptureRecord;
  isDuplicate: boolean;
  updatedTrip?: TripRecord;
  createdCampaign?: CampaignRecord;
  needsManualConfirmation: boolean;
}

export function reconcileCapturedEvent(
  payload: {
    externalTxId: string;
    source: CaptureSource;
    dataType: SmartCaptureRecord['dataType'];
    platformId: SmartCaptureRecord['platformId'];
    amountEur: number;
    relatedTripRef?: string;
    rawSummary: string;
  },
  existingCaptures: SmartCaptureRecord[],
  existingTrips: TripRecord[]
): CaptureReconciliationOutcome {
  const dedupKey = `${payload.platformId}:${payload.dataType}:${payload.externalTxId.trim().toLowerCase()}`;
  const existingDuplicate = existingCaptures.find((c) => c.dedupKey === dedupKey);

  if (existingDuplicate) {
    const captureRecord: SmartCaptureRecord = {
      id: `cap-${Date.now()}`,
      externalTxId: payload.externalTxId,
      dedupKey,
      source: payload.source,
      dataType: payload.dataType,
      platformId: payload.platformId,
      capturedAt: new Date().toISOString(),
      amountEur: payload.amountEur,
      relatedTripRef: payload.relatedTripRef,
      status: 'Rejeitado',
      rawSummary: `${payload.rawSummary} (Duplicação detetada: ${existingDuplicate.id})`,
      duplicateOfId: existingDuplicate.id,
      isDemo: true,
    };
    return {
      captureRecord,
      isDuplicate: true,
      needsManualConfirmation: false,
    };
  }

  if (payload.dataType === 'Gorjeta') {
    const targetTrip = existingTrips.find(
      (t) =>
        t.platformId === payload.platformId &&
        (t.externalRef === payload.relatedTripRef || t.id === payload.relatedTripRef)
    );
    if (targetTrip) {
      const updatedTrip: TripRecord = {
        ...targetTrip,
        tipEur: round2(targetTrip.tipEur + payload.amountEur),
        netEur: round2(targetTrip.netEur + payload.amountEur),
        status: 'Ajustada',
      };
      const captureRecord: SmartCaptureRecord = {
        id: `cap-${Date.now()}`,
        externalTxId: payload.externalTxId,
        dedupKey,
        source: payload.source,
        dataType: 'Gorjeta',
        platformId: payload.platformId,
        capturedAt: new Date().toISOString(),
        amountEur: payload.amountEur,
        relatedTripRef: payload.relatedTripRef,
        matchedTripId: targetTrip.id,
        status: 'Associado',
        rawSummary: payload.rawSummary,
        isDemo: true,
      };
      return {
        captureRecord,
        isDuplicate: false,
        updatedTrip,
        needsManualConfirmation: false,
      };
    }

    const pendingRecord: SmartCaptureRecord = {
      id: `cap-${Date.now()}`,
      externalTxId: payload.externalTxId,
      dedupKey,
      source: payload.source,
      dataType: 'Gorjeta',
      platformId: payload.platformId,
      capturedAt: new Date().toISOString(),
      amountEur: payload.amountEur,
      relatedTripRef: payload.relatedTripRef,
      status: 'Pendente',
      rawSummary: `${payload.rawSummary} (Sem viagem correspondente — pendente de confirmação)`,
      isDemo: true,
    };
    return {
      captureRecord: pendingRecord,
      isDuplicate: false,
      needsManualConfirmation: true,
    };
  }

  if (payload.dataType === 'Campanha') {
    const createdCampaign: CampaignRecord = {
      id: `cmp-${Date.now()}`,
      platformId: payload.platformId,
      name: payload.rawSummary.slice(0, 48) || `Campanha ${payload.platformId}`,
      rewardEur: payload.amountEur,
      targetTrips: 15,
      completedTrips: 0,
      periodStart: new Date().toISOString().slice(0, 10),
      periodEnd: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      scheduleWindow: 'Todo o dia',
      zone: 'Área Metropolitana',
      requirements: 'Identificada via Smart Data Capture — validar termos na plataforma.',
      estimatedExtraCostEur: 8,
      status: 'Ativa',
      source: payload.source,
      isDemo: true,
    };
    const captureRecord: SmartCaptureRecord = {
      id: `cap-${Date.now()}`,
      externalTxId: payload.externalTxId,
      dedupKey,
      source: payload.source,
      dataType: 'Campanha',
      platformId: payload.platformId,
      capturedAt: new Date().toISOString(),
      amountEur: payload.amountEur,
      status: 'Confirmado',
      rawSummary: payload.rawSummary,
      isDemo: true,
    };
    return {
      captureRecord,
      isDuplicate: false,
      createdCampaign,
      needsManualConfirmation: false,
    };
  }

  const captureRecord: SmartCaptureRecord = {
    id: `cap-${Date.now()}`,
    externalTxId: payload.externalTxId,
    dedupKey,
    source: payload.source,
    dataType: payload.dataType,
    platformId: payload.platformId,
    capturedAt: new Date().toISOString(),
    amountEur: payload.amountEur,
    relatedTripRef: payload.relatedTripRef,
    status: 'Interpretado',
    rawSummary: payload.rawSummary,
    isDemo: true,
  };
  return {
    captureRecord,
    isDuplicate: false,
    needsManualConfirmation: false,
  };
}

export interface SmartPlanInput {
  targetNetEur: number;
  availableDays: number;
  hoursPerDay: number;
  breakMinutesPerDay: number;
  vehicle: VehicleRecord;
  historicalAvgGrossPerHour: number;
  currentEarnedNetEur: number;
  needsChargingStops: boolean;
}

export interface SmartPlanResult {
  remainingNetEur: number;
  totalProductiveHours: number;
  requiredGrossPerHour: number;
  estimatedEnergyOrFuelCostEur: number;
  chargingStopsRecommended: number;
  chargingMinutesTotal: number;
  scenarios: Array<{
    name: string;
    grossPerHour: number;
    projectedNetEur: number;
    feasible: boolean;
  }>;
  disclaimer: string;
}

export function calculateSmartPlan(input: SmartPlanInput): SmartPlanResult {
  const effectiveHoursPerDay = Math.max(0.5, input.hoursPerDay - input.breakMinutesPerDay / 60);
  const totalProductiveHours = round2(Math.max(1, input.availableDays) * effectiveHoursPerDay);
  const estimatedKm = totalProductiveHours * 24;
  const costPerKm =
    (input.vehicle.consumptionPer100Km / 100) * input.vehicle.energyCostPerUnitEur +
    input.vehicle.maintenancePerKmEur;
  const estimatedEnergyOrFuelCostEur = round2(estimatedKm * costPerKm);
  const remainingNetEur = round2(Math.max(0, input.targetNetEur - input.currentEarnedNetEur));
  const requiredGrossTotal = remainingNetEur + estimatedEnergyOrFuelCostEur;
  const requiredGrossPerHour = round2(requiredGrossTotal / Math.max(1, totalProductiveHours));

  const chargingStopsRecommended =
    input.vehicle.fuelType === 'Elétrico' && input.needsChargingStops
      ? Math.max(0, Math.floor(estimatedKm / Math.max(120, input.vehicle.rangeKm * 0.75)))
      : 0;
  const chargingMinutesTotal = chargingStopsRecommended * 28;

  const baseRate = Math.max(10, input.historicalAvgGrossPerHour);
  const scenarios = [
    {
      name: 'Conservador (-15% procura)',
      grossPerHour: round2(baseRate * 0.85),
      projectedNetEur: round2(
        baseRate * 0.85 * totalProductiveHours - estimatedEnergyOrFuelCostEur + input.currentEarnedNetEur
      ),
      feasible: false,
    },
    {
      name: 'Base Histórica do Motorista',
      grossPerHour: round2(baseRate),
      projectedNetEur: round2(
        baseRate * totalProductiveHours - estimatedEnergyOrFuelCostEur + input.currentEarnedNetEur
      ),
      feasible: false,
    },
    {
      name: 'Otimizado (Picos + Campanhas)',
      grossPerHour: round2(baseRate * 1.18),
      projectedNetEur: round2(
        baseRate * 1.18 * totalProductiveHours - estimatedEnergyOrFuelCostEur + input.currentEarnedNetEur
      ),
      feasible: false,
    },
  ].map((s) => ({
    ...s,
    feasible: s.projectedNetEur >= input.targetNetEur,
  }));

  return {
    remainingNetEur,
    totalProductiveHours,
    requiredGrossPerHour,
    estimatedEnergyOrFuelCostEur,
    chargingStopsRecommended,
    chargingMinutesTotal,
    scenarios,
    disclaimer:
      'Projeção indicativa baseada no histórico registado e custos técnicos do veículo. Não constitui garantia de ganhos.',
  };
}

export function evaluateVehicleEligibility(
  vehicle: VehicleRecord,
  currentYear = 2026,
  platforms?: Array<{ id: string; name: string; categories: string[]; countryScope: string[]; status: string }>,
  maxLegalAgeYears?: number
): VehicleEligibilityResult {
  const age = currentYear - vehicle.year;
  const tvdeReasons: string[] = [];
  let tvdeLegalEligible = true;
  const legalAgeLimit = maxLegalAgeYears ?? (vehicle.countryCode === 'PT' ? 7 : vehicle.countryCode === 'ES' ? 10 : 8);

  if (vehicle.countryCode === 'PT') {
    if (age > legalAgeLimit) {
      tvdeLegalEligible = false;
      tvdeReasons.push(`Idade do veículo (${age} anos) excede o limite legal TVDE de ${legalAgeLimit} anos em Portugal.`);
    } else {
      tvdeReasons.push(`Cumpre idade máxima TVDE (${age} / ${legalAgeLimit} anos desde a primeira matrícula).`);
    }
    if (vehicle.doors < 4 || vehicle.seats < 4) {
      tvdeLegalEligible = false;
      tvdeReasons.push('Exige mínimo de 4 portas e 4 lugares para passageiros.');
    }
  } else {
    if (age > legalAgeLimit) {
      tvdeLegalEligible = false;
      tvdeReasons.push(`Idade (${age} anos) excede o limite local de ${legalAgeLimit} anos para ${vehicle.countryCode}.`);
    } else {
      tvdeReasons.push(`Regras locais para ${vehicle.countryCode}: verificação válida até ${vehicle.year + legalAgeLimit}.`);
    }
  }

  const platformEligibility: VehicleEligibilityResult['platformEligibility'] = {};

  const targetPlatforms =
    platforms && platforms.length > 0
      ? platforms.filter((p) => p.status === 'Ativa' && (p.countryScope.length === 0 || p.countryScope.includes(vehicle.countryCode)))
      : [
          { id: 'uber', name: 'Uber', categories: ['UberX', 'Uber Green', 'Uber Comfort', 'UberXL'] },
          { id: 'bolt', name: 'Bolt', categories: ['Bolt', 'Bolt Green', 'Bolt Comfort', 'Bolt XL'] },
        ];

  for (const plat of targetPlatforms) {
    const cats: string[] = [];
    const reasons: string[] = [];
    if (!tvdeLegalEligible) {
      reasons.push('Bloqueado por não cumprir elegibilidade legal do mercado.');
    } else {
      for (const cat of plat.categories) {
        const lower = cat.toLowerCase();
        if (lower.includes('green') || lower.includes('eco')) {
          if (vehicle.fuelType === 'Elétrico' || vehicle.fuelType === 'Híbrido') cats.push(cat);
        } else if (lower.includes('comfort') || lower.includes('executivo') || lower.includes('executive') || lower.includes('black')) {
          if (vehicle.trunkLiters >= 420 && age <= 5 && vehicle.powerKw >= 95) cats.push(cat);
        } else if (lower.includes('xl')) {
          if (vehicle.seats >= 6) cats.push(cat);
        } else {
          cats.push(cat);
        }
      }
      if (cats.length > 0) {
        reasons.push(`Elegível conforme critérios comerciais para ${plat.name} (${vehicle.city || vehicle.countryCode}).`);
      } else {
        reasons.push(`Sem categorias compatíveis em ${plat.name} para os parâmetros atuais.`);
      }
    }
    platformEligibility[plat.id] = {
      eligible: cats.length > 0,
      categories: cats,
      reasons,
    };
  }

  return {
    vehicleId: vehicle.id,
    tvdeLegalEligible,
    tvdeReasons,
    platformEligibility,
  };
}

export function isCompletedTripStatus(status: TripRecord['status']): boolean {
  return status === 'Concluída' || status === 'Ajustada';
}

export interface FinancialCalculationExplanation {
  kpiTitle: string;
  formula: string;
  inputsUsed: Array<{ label: string; value: string }>;
  countryCode: string;
  referenceDate: string;
  assumptions: string[];
  confidenceLabel: 'Informação confirmada' | 'Estimativa' | 'Misto (Confirmado + Estimado)';
}

export function getEnergyUnitPriceByTariff(
  profile: VehicleRecord['energyTariffProfile'],
  fallbackUnitCostEur: number
): number {
  switch (profile) {
    case 'Doméstico':
      return 0.17;
    case 'Garagem':
      return 0.21;
    case 'Público AC':
      return 0.34;
    case 'Rápido DC':
      return 0.56;
    case 'Combustível':
      return fallbackUnitCostEur > 0 ? fallbackUnitCostEur : 1.72;
    default:
      return fallbackUnitCostEur;
  }
}

export function computeVehicleOwnershipTcoPerKm(
  vehicle: VehicleRecord,
  monthlyKmAssumption = 4800
): {
  energyCostPerKmEur: number;
  maintenancePerKmEur: number;
  fixedOwnershipPerKmEur: number;
  totalEstimatedCostPerKmEur: number;
  ownershipLabel: string;
} {
  const unitPrice = getEnergyUnitPriceByTariff(vehicle.energyTariffProfile, vehicle.energyCostPerUnitEur);
  const energyCostPerKmEur = round2((vehicle.consumptionPer100Km / 100) * unitPrice);
  const maintenancePerKmEur = round2(vehicle.maintenancePerKmEur);
  const monthlyDepreciation =
    vehicle.ownership === 'Alugada' ? 0 : vehicle.depreciationMonthlyEur;
  const fixedMonthlyEur =
    vehicle.monthlyLeaseOrFinanceEur + vehicle.insuranceAnnualEur / 12 + monthlyDepreciation;
  const fixedOwnershipPerKmEur = round2(fixedMonthlyEur / Math.max(500, monthlyKmAssumption));
  return {
    energyCostPerKmEur,
    maintenancePerKmEur,
    fixedOwnershipPerKmEur,
    totalEstimatedCostPerKmEur: round2(energyCostPerKmEur + maintenancePerKmEur + fixedOwnershipPerKmEur),
    ownershipLabel: vehicle.ownership ?? 'Financiada',
  };
}

export function computeFinancialSummary(trips: TripRecord[], expenses: ExpenseRecord[]) {
  const completed = trips.filter((t) => isCompletedTripStatus(t.status));
  const cancelledOrLostCount = trips.filter((t) => !isCompletedTripStatus(t.status)).length;
  const grossTotal = round2(completed.reduce((acc, t) => acc + t.grossEur, 0));
  const tipsTotal = round2(completed.reduce((acc, t) => acc + t.tipEur, 0));
  const bonusTotal = round2(completed.reduce((acc, t) => acc + t.bonusEur, 0));
  const tollsTotal = round2(completed.reduce((acc, t) => acc + t.tollsEur, 0));
  const commissionsTotal = round2(completed.reduce((acc, t) => acc + t.commissionEur, 0));
  const tripOpCost = round2(completed.reduce((acc, t) => acc + t.operationalCostEur, 0));
  const loggedExpenses = round2(expenses.reduce((acc, e) => acc + e.amountEur, 0));
  const totalRevenue = round2(grossTotal + tipsTotal + bonusTotal);
  const netEstimated = round2(totalRevenue - commissionsTotal - tripOpCost - loggedExpenses);

  const totalKm = round2(
    completed.reduce((acc, t) => acc + t.pickupDistanceKm + t.tripDistanceKm, 0)
  );
  const passengerKm = round2(completed.reduce((acc, t) => acc + t.tripDistanceKm, 0));
  const emptyKm = round2(completed.reduce((acc, t) => acc + t.pickupDistanceKm, 0));
  const totalHours = round2(completed.reduce((acc, t) => acc + t.durationMin, 0) / 60);

  return {
    tripCount: completed.length,
    cancelledOrLostCount,
    grossTotal,
    tipsTotal,
    bonusTotal,
    tollsTotal,
    commissionsTotal,
    tripOpCost,
    loggedExpenses,
    totalRevenue,
    netEstimated,
    totalKm,
    passengerKm,
    emptyKm,
    totalHours,
    avgPerHour: totalHours > 0 ? round2(totalRevenue / totalHours) : 0,
    avgPerKm: totalKm > 0 ? round2(totalRevenue / totalKm) : 0,
  };
}

export function explainFinancialCalculation(
  kpiKey: 'totalRevenue' | 'netEstimated' | 'avgPerHour' | 'avgPerKm',
  trips: TripRecord[],
  expenses: ExpenseRecord[],
  countryCode = 'PT'
): FinancialCalculationExplanation {
  const s = computeFinancialSummary(trips, expenses);
  const today = new Date().toISOString().slice(0, 10);
  if (kpiKey === 'totalRevenue') {
    return {
      kpiTitle: 'Receita Bruta Total (Viagens Concluídas/Ajustadas)',
      formula: 'Receita Total = Soma(Tarifa Base) + Soma(Gorjetas) + Soma(Bónus) [exclui canceladas/rejeitadas/expiradas]',
      inputsUsed: [
        { label: 'Viagens concluídas/ajustadas', value: `${s.tripCount} (excluídas ${s.cancelledOrLostCount} não concluídas)` },
        { label: 'Tarifas brutas', value: `€${s.grossTotal.toFixed(2)}` },
        { label: 'Gorjetas', value: `€${s.tipsTotal.toFixed(2)}` },
        { label: 'Bónus / campanhas', value: `€${s.bonusTotal.toFixed(2)}` },
      ],
      countryCode,
      referenceDate: today,
      assumptions: [
        'Corridas canceladas, rejeitadas, expiradas ou no-show sem taxa líquida liquidada são excluídas automaticamente.',
      ],
      confidenceLabel: 'Informação confirmada',
    };
  }
  if (kpiKey === 'netEstimated') {
    return {
      kpiTitle: 'Líquido Operacional Estimado',
      formula: 'Líquido = Receita Total - Comissões Plataforma - Custo Operacional/km - Despesas Lançadas',
      inputsUsed: [
        { label: 'Receita Total', value: `€${s.totalRevenue.toFixed(2)}` },
        { label: 'Comissões Plataforma', value: `-€${s.commissionsTotal.toFixed(2)}` },
        { label: 'Custo Operacional Veículo (km)', value: `-€${s.tripOpCost.toFixed(2)}` },
        { label: 'Despesas registadas', value: `-€${s.loggedExpenses.toFixed(2)}` },
      ],
      countryCode,
      referenceDate: today,
      assumptions: [
        'O custo operacional por viagem estima energia/combustível + desgaste por km total.',
        'Impostos anuais/IRC/IRS não estão retidos salvo lançamento explícito em Despesas.',
      ],
      confidenceLabel: 'Misto (Confirmado + Estimado)',
    };
  }
  if (kpiKey === 'avgPerHour') {
    return {
      kpiTitle: 'Média Horária Bruta (€/hora)',
      formula: '€/hora = Receita Total / (Soma(Duração em minutos de viagens concluídas) / 60)',
      inputsUsed: [
        { label: 'Receita Total', value: `€${s.totalRevenue.toFixed(2)}` },
        { label: 'Horas produtivas em viagem', value: `${s.totalHours.toFixed(2)} h` },
      ],
      countryCode,
      referenceDate: today,
      assumptions: [
        'Considera duração total registada das viagens concluídas; tempo morto sem plataforma pode ser consultado no Tacógrafo TVDE.',
      ],
      confidenceLabel: 'Estimativa',
    };
  }
  return {
    kpiTitle: 'Rácio por Distância (€/km)',
    formula: '€/km = Receita Total / (Km em Recolha + Km com Passageiro)',
    inputsUsed: [
      { label: 'Receita Total', value: `€${s.totalRevenue.toFixed(2)}` },
      { label: 'Km com Passageiro', value: `${s.passengerKm.toFixed(1)} km` },
      { label: 'Km em Recolha (Vazio)', value: `${s.emptyKm.toFixed(1)} km` },
      { label: 'Km Totais', value: `${s.totalKm.toFixed(1)} km` },
    ],
    countryCode,
    referenceDate: today,
    assumptions: [
      'Inclui distância de deslocação em vazio até à recolha para refletir desgaste real.',
    ],
    confidenceLabel: 'Misto (Confirmado + Estimado)',
  };
}

export function answerDriverQuery(
  query: string,
  context: {
    trips: TripRecord[];
    expenses: ExpenseRecord[];
    campaigns: CampaignRecord[];
    vehicles: VehicleRecord[];
    obligationsCount: number;
  }
): { answer: string; sources: string[]; dataNature: 'Dados Reais Registados' | 'Estimativa Calculada' | 'Misto (Reais + Estimativa)' } {
  const q = query.toLowerCase();
  const summary = computeFinancialSummary(context.trips, context.expenses);
  const activeVehicle = context.vehicles.find((v) => v.isActiveDriverVehicle) ?? context.vehicles[0];

  if (q.includes('ganho') || q.includes('receita') || q.includes('líquido') || q.includes('fatura')) {
    return {
      answer: `Com base nas ${summary.tripCount} viagens registadas, a receita bruta acumulada é de €${summary.totalRevenue.toFixed(2)} (incluindo €${summary.tipsTotal.toFixed(2)} em gorjetas e €${summary.bonusTotal.toFixed(2)} em bónus). Deduzindo comissões (€${summary.commissionsTotal.toFixed(2)}), custos operacionais estimados por km (€${summary.tripOpCost.toFixed(2)}) e despesas lançadas (€${summary.loggedExpenses.toFixed(2)}), o líquido estimado atual é de €${summary.netEstimated.toFixed(2)}.`,
      sources: ['Histórico de Viagens', 'Módulo Financeiro', 'Registo de Despesas'],
      dataNature: 'Misto (Reais + Estimativa)',
    };
  }

  if (q.includes('custo') || q.includes('despesa') || q.includes('km') || q.includes('hora')) {
    return {
      answer: `Percorreu ${summary.totalKm.toFixed(1)} km totais (${summary.passengerKm.toFixed(1)} km com passageiro e ${summary.emptyKm.toFixed(1)} km em vazio/recolha), totalizando ${summary.totalHours.toFixed(1)} horas produtivas. A média atual é de €${summary.avgPerHour.toFixed(2)}/hora e €${summary.avgPerKm.toFixed(2)}/km.`,
      sources: ['Histórico de Viagens', 'Motor de Cálculo AIVAD'],
      dataNature: 'Dados Reais Registados',
    };
  }

  if (q.includes('campanha') || q.includes('bónus') || q.includes('bonus')) {
    const active = context.campaigns.filter((c) => c.status === 'Ativa');
    if (active.length === 0) {
      return {
        answer: 'Não existem campanhas ativas registadas neste momento no seu perfil.',
        sources: ['Central de Campanhas'],
        dataNature: 'Dados Reais Registados',
      };
    }
    const list = active
      .map((c) => `${c.name} (${c.platformId.toUpperCase()}: ${c.completedTrips}/${c.targetTrips} viagens para €${c.rewardEur.toFixed(2)})`)
      .join('; ');
    return {
      answer: `Tem ${active.length} campanha(s) ativa(s): ${list}. O valor incremental estimado já está ligado ao Planeador Inteligente.`,
      sources: ['Central de Campanhas', 'Planeador Inteligente'],
      dataNature: 'Dados Reais Registados',
    };
  }

  if (q.includes('veículo') || q.includes('veiculo') || q.includes('carro') || q.includes('elegib')) {
    if (!activeVehicle) {
      return {
        answer: 'Nenhum veículo ativo encontrado na frota do motorista.',
        sources: ['Base de Veículos'],
        dataNature: 'Dados Reais Registados',
      };
    }
    const elig = evaluateVehicleEligibility(activeVehicle);
    return {
      answer: `O seu veículo ativo é o ${activeVehicle.brand} ${activeVehicle.model} (${activeVehicle.year}, ${activeVehicle.fuelType}). Estado TVDE legal: ${elig.tvdeLegalEligible ? 'Elegível' : 'Não elegível'}. Categorias Uber estimadas: ${elig.platformEligibility.uber.categories.join(', ') || 'Nenhuma'}. Categorias Bolt estimadas: ${elig.platformEligibility.bolt.categories.join(', ') || 'Nenhuma'}.`,
      sources: ['Base Técnica de Veículos', 'Motor de Elegibilidade TVDE'],
      dataNature: 'Misto (Reais + Estimativa)',
    };
  }

  if (q.includes('lei') || q.includes('tvde') || q.includes('59/2026') || q.includes('legal') || q.includes('document')) {
    return {
      answer: `Existem ${context.obligationsCount} obrigações regulatórias monitorizadas na Central de Legislação (incluindo Lei TVDE e Lei n.º 59/2026 para Portugal). Consulte o separador Legislação e Conformidade para verificar o estado de validação humana e os prazos de adaptação aplicáveis aos seus documentos.`,
      sources: ['AIVAD Compliance Intelligence', 'Documentos do Motorista'],
      dataNature: 'Dados Reais Registados',
    };
  }

  return {
    answer: `Resumo operacional atual: ${summary.tripCount} viagens concluídas, receita total de €${summary.totalRevenue.toFixed(2)}, líquido estimado de €${summary.netEstimated.toFixed(2)}, média de €${summary.avgPerHour.toFixed(2)}/h e €${summary.avgPerKm.toFixed(2)}/km. Pode perguntar especificamente sobre ganhos, despesas, campanhas, veículo ou legislação TVDE.`,
    sources: ['AIVAD Intelligence Core', 'Dados do Utilizador'],
    dataNature: 'Misto (Reais + Estimativa)',
  };
}
