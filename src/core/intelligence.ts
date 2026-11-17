import type {
  AnalysisMode,
  AutoPilotConfig,
  AutoPilotDecisionRecord,
  CampaignRecord,
  CaptureCorrectionEntry,
  CaptureDataType,
  CaptureSource,
  ExpenseRecord,
  NormalizedCapturePayload,
  PlatformId,
  ProposalAnalysis,
  ProposalClassification,
  ProposalInput,
  ProposalThresholds,
  SmartCaptureRecord,
  StrategyMode,
  TripRecord,
  VehicleEligibilityResult,
  VehicleRecord,
  VehicleSortOption,
} from '../models/types';

export function normalizeCanonicalStrategyMode(
  mode?: AutoPilotConfig['mode'],
  strategyMode?: StrategyMode
): StrategyMode {
  if (strategyMode === 'Manual' || strategyMode === 'Semiautomático' || strategyMode === 'Automático') {
    if (mode === 'Manual') return 'Manual';
    if (mode === 'Automático') return 'Automático';
    if (mode === 'Semiautomático' || mode === 'Assistido') return 'Semiautomático';
    return strategyMode;
  }
  if (mode === 'Manual') return 'Manual';
  if (mode === 'Automático') return 'Automático';
  return 'Semiautomático';
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface ProposalOperationalContext {
  currentVehicleRangeKm?: number;
  minReserveRangeKm?: number;
  remainingLegalWorkMinutes?: number;
  destinationHistoricalTripsCount?: number;
  referenceDate?: Date;
}

export function analyzeProposal(
  input: ProposalInput,
  thresholds: Pick<
    ProposalThresholds,
    | 'minValueEur'
    | 'maxValueEur'
    | 'minEurPerKm'
    | 'minEurPerHour'
    | 'maxPickupKm'
    | 'maxPickupTimeMin'
    | 'maxTotalDistanceKm'
    | 'maxTotalTimeMin'
    | 'avoidEmptyReturnRisk'
    | 'allowedDaysOfWeek'
    | 'weightEurPerKm'
    | 'weightEurPerHour'
    | 'weightPickupEfficiency'
  >,
  operationalCtx?: ProposalOperationalContext
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
  const commissionPctApplied =
    input.commissionPct !== undefined &&
    Number.isFinite(input.commissionPct) &&
    !input.unavailableFields?.includes('commissionPct')
      ? Math.max(0, input.commissionPct)
      : undefined;
  const commissionEur =
    commissionPctApplied !== undefined
      ? round2(effectiveRevenueEur * (commissionPctApplied / 100))
      : undefined;
  const operatingCostEur = round2(
    totalDistanceKm * Math.max(0, input.vehicleCostPerKmEur) + Math.max(0, input.tollsEur)
  );
  const estimatedNetEur = round2(
    effectiveRevenueEur - (commissionEur ?? 0) - operatingCostEur
  );
  const profitabilityPct =
    effectiveRevenueEur > 0 ? round2((estimatedNetEur / effectiveRevenueEur) * 100) : undefined;

  const netBasisForRates = commissionEur !== undefined ? estimatedNetEur : effectiveRevenueEur;
  const eurPerKm = round2(netBasisForRates / Math.max(0.1, basisDistance));
  const eurPerHour = round2((netBasisForRates / Math.max(1, totalTimeMin)) * 60);
  const eurPerMin = round2(netBasisForRates / Math.max(1, totalTimeMin));

  const pickupRatio = safePickupKm / Math.max(1, totalDistanceKm);
  const emptyReturnRisk: 'Baixo' | 'Médio' | 'Alto' =
    safeTripKm > 22 || input.region.toLowerCase().includes('periferia')
      ? 'Alto'
      : safeTripKm > 12 || pickupRatio > 0.35
      ? 'Médio'
      : 'Baixo';

  // Probabilidade de retorno com passageiro: calculada apenas quando há amostra histórica suficiente (>= 3 viagens)
  const destCount = operationalCtx?.destinationHistoricalTripsCount ?? 0;
  const returnPassengerProbabilityPct =
    destCount >= 3
      ? Math.min(92, Math.max(25, Math.round(45 + Math.min(destCount, 12) * 3.5 - (emptyReturnRisk === 'Alto' ? 25 : 0))))
      : null;
  const returnProbabilityEpistemicTag =
    destCount >= 3 ? ('Informação histórica' as const) : ('Informação indisponível' as const);

  const batteryAdequate =
    operationalCtx?.currentVehicleRangeKm !== undefined
      ? operationalCtx.currentVehicleRangeKm - totalDistanceKm >= (operationalCtx.minReserveRangeKm ?? 35)
      : true;

  const tvdeLimitCompliant =
    operationalCtx?.remainingLegalWorkMinutes !== undefined
      ? totalTimeMin <= operationalCtx.remainingLegalWorkMinutes
      : true;

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
  if (thresholds.maxValueEur !== undefined && thresholds.maxValueEur > 0 && effectiveRevenueEur > thresholds.maxValueEur) {
    reasons.push(`Valor total (€${effectiveRevenueEur.toFixed(2)}) excede o teto máximo configurado (€${thresholds.maxValueEur.toFixed(2)}).`);
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
  if (thresholds.maxPickupTimeMin !== undefined && thresholds.maxPickupTimeMin > 0 && safePickupMin > thresholds.maxPickupTimeMin) {
    reasons.push(`Tempo até à recolha (${safePickupMin} min) excede o máximo (${thresholds.maxPickupTimeMin} min).`);
  }
  if (totalDistanceKm > thresholds.maxTotalDistanceKm) {
    reasons.push(`Distância total (${totalDistanceKm.toFixed(1)} km) acima do máximo definido.`);
  }
  if (totalTimeMin > thresholds.maxTotalTimeMin) {
    reasons.push(`Tempo comprometido (${totalTimeMin} min) acima do limite (${thresholds.maxTotalTimeMin} min).`);
  }
  if (thresholds.avoidEmptyReturnRisk && emptyReturnRisk === 'Alto') {
    reasons.push('Risco elevado de retorno sem passageiro — bloqueado pela preferência de retorno.');
  }
  if (thresholds.allowedDaysOfWeek && thresholds.allowedDaysOfWeek.length > 0 && operationalCtx?.referenceDate) {
    const dow = operationalCtx.referenceDate.getDay();
    if (!thresholds.allowedDaysOfWeek.includes(dow)) {
      reasons.push('Dia da semana fora da janela operacional configurada pelo motorista.');
    }
  }
  if (!batteryAdequate) {
    reasons.push('Autonomia/bateria insuficiente para concluir a viagem preservando a reserva mínima de segurança.');
  }
  if (!tvdeLimitCompliant) {
    reasons.push('Duração estimada ultrapassa o tempo restante do limite legal TVDE de 10h em 24h.');
  }

  let classification: ProposalClassification = 'verde';
  if (
    !batteryAdequate ||
    !tvdeLimitCompliant ||
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
    reasons.push('Todos os limiares mínimos de rentabilidade, recolha, autonomia e limites TVDE foram cumpridos.');
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
    commissionPctApplied,
    commissionEur,
    operatingCostEur,
    estimatedNetEur,
    profitabilityPct,
    emptyReturnRisk,
    returnPassengerProbabilityPct,
    returnProbabilityEpistemicTag,
    batteryAdequate,
    tvdeLimitCompliant,
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
  const canonicalMode = normalizeCanonicalStrategyMode(config.mode, config.strategyMode);
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

  const regionAllowed =
    t.allowedRegions.length === 0 ||
    t.allowedRegions.some((r) => input.region.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(input.region.toLowerCase()));
  if (!regionAllowed) {
    rulesMatched.push(`Zona/Região "${input.region}" fora das zonas autorizadas.`);
  }

  const pickupTimeOk =
    t.maxPickupTimeMin === undefined || t.maxPickupTimeMin <= 0 || input.pickupTimeMin <= t.maxPickupTimeMin;
  if (!pickupTimeOk) {
    rulesMatched.push(`Tempo de recolha (${input.pickupTimeMin} min) acima do máximo (${t.maxPickupTimeMin} min).`);
  }

  const maxValOk =
    t.maxValueEur === undefined || t.maxValueEur <= 0 || analysis.effectiveRevenueEur <= t.maxValueEur;
  if (!maxValOk) {
    rulesMatched.push(`Valor (€${analysis.effectiveRevenueEur.toFixed(2)}) acima do máximo configurado (€${t.maxValueEur?.toFixed(2)}).`);
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
    regionAllowed &&
    pickupTimeOk &&
    maxValOk &&
    input.pickupDistanceKm <= t.maxPickupKm &&
    analysis.batteryAdequate !== false &&
    analysis.tvdeLimitCompliant !== false;

  const shouldAccept =
    passesThresholds ||
    (analysis.classification === 'amarelo' &&
      matchesCampaign &&
      platformAllowed &&
      categoryAllowed &&
      regionAllowed &&
      analysis.batteryAdequate !== false &&
      analysis.tvdeLimitCompliant !== false);

  if (passesThresholds) {
    rulesMatched.push('Proposta cumpre integralmente as regras configuradas pelo motorista.');
  } else if (shouldAccept) {
    rulesMatched.push('Proposta intermédia compensada por campanha ativa dentro dos limites de segurança.');
  } else {
    rulesMatched.push(...analysis.reasons);
  }

  let action: AutoPilotDecisionRecord['action'] = 'Aguardar decisão manual';
  let executedAutomatically = false;
  let executionChannelUsed = 'Nenhum';
  let reason = '';

  const hasAuthorizedChannel =
    config.officialAutomationAuthorized ||
    (config.authorizedExecutionChannel !== undefined && config.authorizedExecutionChannel !== 'Nenhum');

  if (canonicalMode === 'Manual') {
    action = 'Aguardar decisão manual';
    const manualRec = shouldAccept ? 'Recomendação AIVAD: Aceitar' : 'Recomendação AIVAD: Recusar';
    reason = `Modo Manual: parâmetros fixos do motorista. ${manualRec} (€${analysis.eurPerKm.toFixed(2)}/km · €${analysis.eurPerHour.toFixed(2)}/h). Nenhuma decisão executada automaticamente.`;
  } else if (canonicalMode === 'Semiautomático') {
    action = shouldAccept ? 'Aceitar sugerido' : 'Recusar sugerido';
    reason = shouldAccept
      ? 'Modo Semiautomático: proposta aprovada pela estratégia adaptativa dentro dos limites autorizados; aguarda confirmação rápida do motorista.'
      : 'Modo Semiautomático: proposta abaixo da meta dinâmica do turno; sugerida recusa.';
  } else {
    // Modo Automático
    if (hasAuthorizedChannel) {
      executedAutomatically = true;
      executionChannelUsed = config.authorizedExecutionChannel && config.authorizedExecutionChannel !== 'Nenhum'
        ? config.authorizedExecutionChannel
        : 'Canal Oficial Autorizado';
      action = shouldAccept
        ? 'Executado automaticamente: Aceitar'
        : 'Executado automaticamente: Recusar';
      reason = shouldAccept
        ? `Modo Automático: proposta aceite automaticamente via ${executionChannelUsed} (regras cumpridas).`
        : `Modo Automático: proposta rejeitada automaticamente via ${executionChannelUsed} (fora das regras configuradas).`;
    } else {
      executedAutomatically = false;
      executionChannelUsed = 'Ação Assistida (Sem canal externo autorizado)';
      action = shouldAccept
        ? 'Decisão pronta (Ação assistida): Aceitar'
        : 'Decisão pronta (Ação assistida): Recusar';
      reason =
        'Modo Automático: decisão calculada, mas não existe API oficial ou bridge nativo autorizado ativo para executar na app externa. Apresentada ação assistida transparente sem fingir execução automática.';
    }
  }

  return {
    id: `apd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    proposalId,
    timestamp: now,
    platformId: input.platformId,
    modeAtDecision: canonicalMode,
    action,
    rulesMatched,
    executedAutomatically,
    executionChannelUsed,
    platformConfirmed: executedAutomatically,
    reason,
  };
}

export function parseAndNormalizeCaptureInput(params: {
  rawInput: string;
  format: 'ocr_or_notification' | 'csv' | 'json';
  defaultPlatformId?: PlatformId;
  source?: CaptureSource;
  nowIso?: string;
}): NormalizedCapturePayload[] {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const text = params.rawInput.trim();
  if (!text) return [];

  if (params.format === 'json') {
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr
        .filter((item) => item && typeof item === 'object')
        .map((item, idx) => {
          const obj = item as Record<string, unknown>;
          const platformId = String(obj.platformId ?? obj.platform ?? params.defaultPlatformId ?? 'uber').toLowerCase();
          const offerOrGrossEur = Number(obj.grossEur ?? obj.amountEur ?? obj.value ?? obj.fare ?? 0);
          const pickupDistanceKm = obj.pickupDistanceKm !== undefined ? Number(obj.pickupDistanceKm) : undefined;
          const tripDistanceKm = obj.tripDistanceKm !== undefined ? Number(obj.tripDistanceKm) : obj.distanceKm !== undefined ? Number(obj.distanceKm) : undefined;
          const estimatedDurationMin = obj.durationMin !== undefined ? Number(obj.durationMin) : undefined;
          const tipEur = obj.tipEur !== undefined ? Number(obj.tipEur) : undefined;
          const bonusEur = obj.bonusEur !== undefined ? Number(obj.bonusEur) : undefined;
          const dataType: CaptureDataType =
            (obj.dataType as CaptureDataType) ?? (tipEur && !offerOrGrossEur ? 'Gorjeta' : 'Viagem');
          const externalTxId = String(obj.externalTxId ?? obj.externalRef ?? obj.id ?? `JSON-${idx + 1}-${round2(offerOrGrossEur)}`);
          return {
            platformId,
            dataType,
            offerOrGrossEur: round2(Number.isFinite(offerOrGrossEur) ? offerOrGrossEur : 0),
            pickupDistanceKm: pickupDistanceKm !== undefined && Number.isFinite(pickupDistanceKm) ? round2(pickupDistanceKm) : undefined,
            tripDistanceKm: tripDistanceKm !== undefined && Number.isFinite(tripDistanceKm) ? round2(tripDistanceKm) : undefined,
            estimatedDurationMin: estimatedDurationMin !== undefined && Number.isFinite(estimatedDurationMin) ? Math.round(estimatedDurationMin) : undefined,
            pickupZone: typeof obj.pickupZone === 'string' ? obj.pickupZone : undefined,
            destinationZone: typeof obj.destinationZone === 'string' ? obj.destinationZone : undefined,
            category: typeof obj.category === 'string' ? obj.category : undefined,
            bonusEur: bonusEur !== undefined && Number.isFinite(bonusEur) ? round2(bonusEur) : undefined,
            tipEur: tipEur !== undefined && Number.isFinite(tipEur) ? round2(tipEur) : undefined,
            source: params.source ?? 'Extrato Importado',
            capturedAtIso: typeof obj.date === 'string' ? obj.date : nowIso,
            confidencePct: offerOrGrossEur > 0 ? 96 : 62,
            externalTxId,
            rawText: JSON.stringify(obj).slice(0, 180),
          };
        });
    } catch {
      return [];
    }
  }

  if (params.format === 'csv') {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];
    const hasHeader = /valor|fare|gross|amount|plataforma|platform|dist/i.test(lines[0]);
    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map((line, idx) => {
      const cols = line.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ''));
      // Suporta formato: ref, plataforma, tipo, valor, km_viagem, min, destino, categoria
      const ref = cols[0] || `CSV-${idx + 1}`;
      const platRaw = (cols[1] || params.defaultPlatformId || 'uber').toLowerCase();
      const platformId = ['uber', 'bolt', 'cabify', 'freenow'].includes(platRaw)
        ? platRaw
        : params.defaultPlatformId ?? 'uber';
      const valNum = Number((cols[2] ?? '0').replace(',', '.').replace(/[^0-9.-]/g, ''));
      const kmNum = cols[3] ? Number(cols[3].replace(',', '.').replace(/[^0-9.-]/g, '')) : undefined;
      const minNum = cols[4] ? Number(cols[4].replace(',', '.').replace(/[^0-9.-]/g, '')) : undefined;
      const dest = cols[5] || undefined;
      const cat = cols[6] || undefined;

      return {
        platformId,
        dataType: 'Viagem',
        offerOrGrossEur: round2(Number.isFinite(valNum) ? valNum : 0),
        tripDistanceKm: kmNum !== undefined && Number.isFinite(kmNum) ? round2(kmNum) : undefined,
        estimatedDurationMin: minNum !== undefined && Number.isFinite(minNum) ? Math.round(minNum) : undefined,
        destinationZone: dest,
        category: cat,
        source: params.source ?? 'Relatório CSV/PDF',
        capturedAtIso: nowIso,
        confidencePct: Number.isFinite(valNum) && valNum > 0 ? 94 : 55,
        externalTxId: ref,
        rawText: line.slice(0, 180),
      };
    });
  }

  // Formato 'ocr_or_notification': extrai plataforma, valor €, km recolha/viagem, minutos, destino, bónus e categoria
  const lower = text.toLowerCase();
  const platformId: PlatformId = lower.includes('bolt')
    ? 'bolt'
    : lower.includes('cabify')
      ? 'cabify'
      : lower.includes('free now') || lower.includes('freenow')
        ? 'freenow'
        : lower.includes('uber')
          ? 'uber'
          : params.defaultPlatformId ?? 'uber';

  const euroMatches = Array.from(text.matchAll(/(?:€\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*€)/gi));
  const amounts = euroMatches
    .map((m) => Number((m[1] ?? m[2] ?? '0').replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0);
  const offerOrGrossEur = amounts[0] ? round2(amounts[0]) : 0;
  const bonusEur = lower.includes('bónus') || lower.includes('bonus') || lower.includes('campanha')
    ? amounts[1] ? round2(amounts[1]) : undefined
    : undefined;

  const kmMatches = Array.from(text.matchAll(/(\d+(?:[.,]\d{1,2})?)\s*km/gi))
    .map((m) => Number(m[1].replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n >= 0);

  const pickupDistanceKm = kmMatches.length >= 2 ? round2(kmMatches[0]) : undefined;
  const tripDistanceKm = kmMatches.length >= 2 ? round2(kmMatches[1]) : kmMatches[0] !== undefined ? round2(kmMatches[0]) : undefined;

  const minMatches = Array.from(text.matchAll(/(\d+)\s*min/gi))
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0);
  const estimatedDurationMin =
    minMatches.length >= 2 ? minMatches[0] + minMatches[1] : minMatches[0] ?? undefined;

  const destMatch = text.match(/(?:destino|para|->|→)\s*:?\s*([^\n•|;]+)/i);
  const destinationZone = destMatch ? destMatch[1].trim().slice(0, 60) : undefined;

  const catMatch = text.match(/\b(UberX|Uber Green|Uber Comfort|Uber Black|UberXL|Bolt Green|Bolt Comfort|Bolt XL|Bolt)\b/i);
  const category = catMatch ? catMatch[1] : undefined;

  const dataType: CaptureDataType = lower.includes('gorjeta')
    ? 'Gorjeta'
    : lower.includes('campanha') && !tripDistanceKm
      ? 'Campanha'
      : lower.includes('recolha') || lower.includes('aceitar') || lower.includes('proposta')
        ? 'Proposta'
        : 'Viagem';

  let fieldsFound = 0;
  if (offerOrGrossEur > 0) fieldsFound += 2;
  if (tripDistanceKm !== undefined) fieldsFound += 1;
  if (estimatedDurationMin !== undefined) fieldsFound += 1;
  if (destinationZone) fieldsFound += 1;
  if (category) fieldsFound += 1;
  const confidencePct = Math.min(97, Math.max(35, fieldsFound * 16));

  const deterministicHash = `${platformId}-${offerOrGrossEur}-${tripDistanceKm ?? 0}-${estimatedDurationMin ?? 0}-${text.length}`;

  return [
    {
      platformId,
      dataType,
      offerOrGrossEur,
      pickupDistanceKm,
      tripDistanceKm,
      estimatedDurationMin,
      destinationZone,
      category,
      bonusEur,
      source: params.source ?? 'OCR',
      capturedAtIso: nowIso,
      confidencePct,
      externalTxId: `OCR-${deterministicHash}`,
      rawText: text.slice(0, 220),
    },
  ];
}

export function applyCaptureManualCorrection(
  record: SmartCaptureRecord,
  patch: {
    amountEur?: number;
    platformId?: PlatformId;
    destinationZone?: string;
    category?: string;
    status?: SmartCaptureRecord['status'];
  },
  correctedBy: string,
  reason: string,
  nowIso = new Date().toISOString()
): { ok: boolean; error?: string; updatedRecord?: SmartCaptureRecord } {
  if (!reason || reason.trim().length < 4) {
    return {
      ok: false,
      error: 'Indique um motivo objetivo para a correção manual (mínimo 4 caracteres).',
    };
  }
  const newEntries: CaptureCorrectionEntry[] = [];
  if (patch.amountEur !== undefined && patch.amountEur !== record.amountEur) {
    newEntries.push({
      correctedAt: nowIso,
      correctedBy,
      field: 'amountEur',
      previousValue: record.amountEur,
      newValue: patch.amountEur,
      reason: reason.trim(),
    });
  }
  if (patch.platformId !== undefined && patch.platformId !== record.platformId) {
    newEntries.push({
      correctedAt: nowIso,
      correctedBy,
      field: 'platformId',
      previousValue: record.platformId,
      newValue: patch.platformId,
      reason: reason.trim(),
    });
  }
  if (patch.destinationZone !== undefined && patch.destinationZone !== (record.destinationZone ?? '')) {
    newEntries.push({
      correctedAt: nowIso,
      correctedBy,
      field: 'destinationZone',
      previousValue: record.destinationZone ?? '',
      newValue: patch.destinationZone,
      reason: reason.trim(),
    });
  }

  return {
    ok: true,
    updatedRecord: {
      ...record,
      amountEur: patch.amountEur ?? record.amountEur,
      platformId: patch.platformId ?? record.platformId,
      destinationZone: patch.destinationZone ?? record.destinationZone,
      category: patch.category ?? record.category,
      status: patch.status ?? 'Corrigido',
      confidencePct: 100,
      corrections: [...(record.corrections ?? []), ...newEntries],
    },
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
    pickupDistanceKm?: number;
    tripDistanceKm?: number;
    estimatedDurationMin?: number;
    destinationZone?: string;
    category?: string;
    bonusEur?: number;
    tipEur?: number;
    confidencePct?: number;
    relatedTripRef?: string;
    rawSummary: string;
    isDemo?: boolean;
  },
  existingCaptures: SmartCaptureRecord[],
  existingTrips: TripRecord[]
): CaptureReconciliationOutcome {
  const isDemoFlag = Boolean(payload.isDemo);
  const dedupKey = `${payload.platformId}:${payload.dataType}:${payload.externalTxId.trim().toLowerCase()}`;
  const existingDuplicate = existingCaptures.find((c) => c.dedupKey === dedupKey);

  if (existingDuplicate) {
    const captureRecord: SmartCaptureRecord = {
      id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      externalTxId: payload.externalTxId,
      dedupKey,
      source: payload.source,
      dataType: payload.dataType,
      platformId: payload.platformId,
      capturedAt: new Date().toISOString(),
      amountEur: payload.amountEur,
      pickupDistanceKm: payload.pickupDistanceKm,
      tripDistanceKm: payload.tripDistanceKm,
      estimatedDurationMin: payload.estimatedDurationMin,
      destinationZone: payload.destinationZone,
      category: payload.category,
      confidencePct: payload.confidencePct ?? 90,
      relatedTripRef: payload.relatedTripRef,
      status: 'Rejeitado',
      rawSummary: `${payload.rawSummary} (Duplicação detetada: ${existingDuplicate.id})`,
      duplicateOfId: existingDuplicate.id,
      isDemo: isDemoFlag,
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
        id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        externalTxId: payload.externalTxId,
        dedupKey,
        source: payload.source,
        dataType: 'Gorjeta',
        platformId: payload.platformId,
        capturedAt: new Date().toISOString(),
        amountEur: payload.amountEur,
        confidencePct: payload.confidencePct ?? 95,
        relatedTripRef: payload.relatedTripRef,
        matchedTripId: targetTrip.id,
        status: 'Associado',
        rawSummary: payload.rawSummary,
        isDemo: isDemoFlag,
      };
      return {
        captureRecord,
        isDuplicate: false,
        updatedTrip,
        needsManualConfirmation: false,
      };
    }

    const pendingRecord: SmartCaptureRecord = {
      id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      externalTxId: payload.externalTxId,
      dedupKey,
      source: payload.source,
      dataType: 'Gorjeta',
      platformId: payload.platformId,
      capturedAt: new Date().toISOString(),
      amountEur: payload.amountEur,
      confidencePct: payload.confidencePct ?? 72,
      relatedTripRef: payload.relatedTripRef,
      status: 'Pendente',
      rawSummary: `${payload.rawSummary} (Sem viagem correspondente — pendente de confirmação)`,
      isDemo: isDemoFlag,
    };
    return {
      captureRecord: pendingRecord,
      isDuplicate: false,
      needsManualConfirmation: true,
    };
  }

  if (payload.dataType === 'Campanha') {
    const createdCampaign: CampaignRecord = {
      id: `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      platformId: payload.platformId,
      name: payload.rawSummary.slice(0, 48) || `Campanha ${payload.platformId}`,
      rewardEur: payload.amountEur,
      targetTrips: 15,
      completedTrips: 0,
      periodStart: new Date().toISOString().slice(0, 10),
      periodEnd: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      scheduleWindow: 'Todo o dia',
      zone: payload.destinationZone || 'Área Metropolitana',
      requirements: 'Identificada via Smart Data Capture — validar termos na plataforma.',
      estimatedExtraCostEur: 8,
      status: 'Ativa',
      source: payload.source,
      isDemo: isDemoFlag,
    };
    const captureRecord: SmartCaptureRecord = {
      id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      externalTxId: payload.externalTxId,
      dedupKey,
      source: payload.source,
      dataType: 'Campanha',
      platformId: payload.platformId,
      capturedAt: new Date().toISOString(),
      amountEur: payload.amountEur,
      confidencePct: payload.confidencePct ?? 88,
      status: 'Confirmado',
      rawSummary: payload.rawSummary,
      isDemo: isDemoFlag,
    };
    return {
      captureRecord,
      isDuplicate: false,
      createdCampaign,
      needsManualConfirmation: false,
    };
  }

  const lowConfidence = payload.confidencePct !== undefined && payload.confidencePct < 65;
  const captureRecord: SmartCaptureRecord = {
    id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    externalTxId: payload.externalTxId,
    dedupKey,
    source: payload.source,
    dataType: payload.dataType,
    platformId: payload.platformId,
    capturedAt: new Date().toISOString(),
    amountEur: payload.amountEur,
    pickupDistanceKm: payload.pickupDistanceKm,
    tripDistanceKm: payload.tripDistanceKm,
    estimatedDurationMin: payload.estimatedDurationMin,
    destinationZone: payload.destinationZone,
    category: payload.category,
    bonusEur: payload.bonusEur,
    tipEur: payload.tipEur,
    confidencePct: payload.confidencePct ?? 90,
    relatedTripRef: payload.relatedTripRef,
    status: lowConfidence ? 'Pendente' : 'Interpretado',
    rawSummary: payload.rawSummary,
    isDemo: isDemoFlag,
  };
  return {
    captureRecord,
    isDuplicate: false,
    needsManualConfirmation: lowConfidence,
  };
}

export interface SmartPlanInput {
  targetNetEur: number;
  targetGrossEur?: number;
  availableDays: number;
  hoursPerDay: number;
  breakMinutesPerDay: number;
  startTime?: string;
  endTime?: string;
  flexibleDuration?: boolean;
  selectedPlatformIds?: PlatformId[];
  avgCommissionPct?: number;
  avgGrossPerTripEur?: number;
  vehicle: VehicleRecord;
  historicalAvgGrossPerHour: number;
  currentEarnedNetEur: number;
  needsChargingStops: boolean;
}

export interface SmartPlanResult {
  remainingNetEur: number;
  effectiveHoursPerDay: number;
  totalProductiveHours: number;
  requiredGrossTotalEur: number;
  requiredGrossPerHour: number;
  estimatedRidesNeeded: number;
  estimatedKmNeeded: number;
  estimatedEnergyOrFuelCostEur: number;
  estimatedCostsTotalEur: number;
  batteryOrRangeRequiredKm: number;
  vehicleRealRangeKm: number;
  chargingStopsRecommended: number;
  chargingMinutesTotal: number;
  feasibilityStatus: 'Realista' | 'Exigente' | 'Irrealista';
  feasibilityWarnings: string[];
  scenarios: Array<{
    name: string;
    grossPerHour: number;
    projectedNetEur: number;
    feasible: boolean;
  }>;
  disclaimer: string;
}

function computeHoursBetweenTimeStrings(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (!Number.isFinite(sh) || !Number.isFinite(sm) || !Number.isFinite(eh) || !Number.isFinite(em)) {
    return null;
  }
  let diffMins = eh * 60 + em - (sh * 60 + sm);
  if (diffMins <= 0) diffMins += 24 * 60;
  return Math.max(0.5, diffMins / 60);
}

export function calculateSmartPlan(input: SmartPlanInput): SmartPlanResult {
  const timeWindowHours = computeHoursBetweenTimeStrings(input.startTime, input.endTime);
  const rawShiftHours =
    input.flexibleDuration === false && timeWindowHours !== null ? timeWindowHours : input.hoursPerDay;
  const effectiveHoursPerDay = round2(Math.max(0.5, rawShiftHours - input.breakMinutesPerDay / 60));
  const safeDays = Math.max(1, input.availableDays);
  const totalProductiveHours = round2(safeDays * effectiveHoursPerDay);
  const estimatedKmPerDay = Math.round(effectiveHoursPerDay * 24);
  const estimatedKmNeeded = Math.round(totalProductiveHours * 24);

  const unitPrice = getEnergyUnitPriceByTariff(
    input.vehicle.energyTariffProfile,
    input.vehicle.energyCostPerUnitEur
  );
  const costPerKm =
    (input.vehicle.consumptionPer100Km / 100) * unitPrice + input.vehicle.maintenancePerKmEur;
  const estimatedEnergyOrFuelCostEur = round2(estimatedKmNeeded * costPerKm);

  const commRate = Math.min(0.45, Math.max(0, (input.avgCommissionPct ?? 0) / 100));
  const remainingNetEur = round2(Math.max(0, input.targetNetEur - input.currentEarnedNetEur));
  const computedGrossFromNet = (remainingNetEur + estimatedEnergyOrFuelCostEur) / Math.max(0.35, 1 - commRate);
  const requiredGrossTotalEur = round2(
    input.targetGrossEur !== undefined && input.targetGrossEur > 0
      ? Math.max(input.targetGrossEur, computedGrossFromNet)
      : remainingNetEur + estimatedEnergyOrFuelCostEur
  );
  const requiredGrossPerHour = round2(requiredGrossTotalEur / Math.max(1, totalProductiveHours));

  const avgGrossTrip = Math.max(6, input.avgGrossPerTripEur ?? 9.5);
  const estimatedRidesNeeded = Math.max(1, Math.ceil(requiredGrossTotalEur / avgGrossTrip));
  const estimatedCostsTotalEur = round2(
    estimatedEnergyOrFuelCostEur + requiredGrossTotalEur * commRate
  );

  const vehicleRealRangeKm = Math.round(input.vehicle.realRangeKm ?? input.vehicle.rangeKm * 0.85);
  const batteryOrRangeRequiredKm = estimatedKmPerDay;
  const safeUsableRangeKm = Math.max(100, vehicleRealRangeKm * 0.82);

  const chargingStopsRecommended =
    input.vehicle.fuelType === 'Elétrico' && (input.needsChargingStops || batteryOrRangeRequiredKm > safeUsableRangeKm)
      ? Math.max(
          batteryOrRangeRequiredKm > safeUsableRangeKm ? safeDays : 0,
          Math.floor(estimatedKmNeeded / Math.max(120, input.vehicle.rangeKm * 0.75))
        )
      : 0;
  const chargingMinutesTotal = chargingStopsRecommended * 28;

  const baseRate = Math.max(10, input.historicalAvgGrossPerHour);
  const scenarios = [
    {
      name: 'Conservador (-15% procura)',
      grossPerHour: round2(baseRate * 0.85),
      projectedNetEur: round2(
        baseRate * 0.85 * totalProductiveHours * (1 - commRate) -
          estimatedEnergyOrFuelCostEur +
          input.currentEarnedNetEur
      ),
      feasible: false,
    },
    {
      name: 'Base Histórica do Motorista',
      grossPerHour: round2(baseRate),
      projectedNetEur: round2(
        baseRate * totalProductiveHours * (1 - commRate) -
          estimatedEnergyOrFuelCostEur +
          input.currentEarnedNetEur
      ),
      feasible: false,
    },
    {
      name: 'Otimizado (Picos + Campanhas)',
      grossPerHour: round2(baseRate * 1.18),
      projectedNetEur: round2(
        baseRate * 1.18 * totalProductiveHours * (1 - commRate) -
          estimatedEnergyOrFuelCostEur +
          input.currentEarnedNetEur
      ),
      feasible: false,
    },
  ].map((s) => ({
    ...s,
    feasible: s.projectedNetEur >= input.targetNetEur,
  }));

  const feasibilityWarnings: string[] = [];
  if (rawShiftHours > 10) {
    feasibilityWarnings.push(
      `Duração diária (${rawShiftHours.toFixed(1)}h) excede o limite operacional de 10h no tacógrafo.`
    );
  }
  if (requiredGrossPerHour > baseRate * 1.45) {
    feasibilityWarnings.push(
      `Meta horária exigida (€${requiredGrossPerHour.toFixed(2)}/h) supera em +45% a sua média histórica (€${baseRate.toFixed(2)}/h): objetivo altamente irrealista sem campanhas extraordinárias.`
    );
  } else if (requiredGrossPerHour > baseRate * 1.15) {
    feasibilityWarnings.push(
      `Meta horária exigida (€${requiredGrossPerHour.toFixed(2)}/h) exige operar nos picos de procura acima da média (€${baseRate.toFixed(2)}/h).`
    );
  }
  if (batteryOrRangeRequiredKm > vehicleRealRangeKm) {
    feasibilityWarnings.push(
      `Autonomia diária necessária (~${batteryOrRangeRequiredKm} km/dia) excede a autonomia real do veículo (${vehicleRealRangeKm} km): inclua carregamento/abastecimento intermédio.`
    );
  }
  if (input.selectedPlatformIds && input.selectedPlatformIds.length === 0) {
    feasibilityWarnings.push('Nenhuma plataforma selecionada para o plano.');
  }

  let feasibilityStatus: SmartPlanResult['feasibilityStatus'] = 'Realista';
  if (rawShiftHours > 10 || requiredGrossPerHour > baseRate * 1.45 || (!scenarios[2].feasible && remainingNetEur > 0)) {
    feasibilityStatus = 'Irrealista';
  } else if (!scenarios[1].feasible || batteryOrRangeRequiredKm > safeUsableRangeKm || feasibilityWarnings.length > 0) {
    feasibilityStatus = 'Exigente';
  }

  return {
    remainingNetEur,
    effectiveHoursPerDay,
    totalProductiveHours,
    requiredGrossTotalEur,
    requiredGrossPerHour,
    estimatedRidesNeeded,
    estimatedKmNeeded,
    estimatedEnergyOrFuelCostEur,
    estimatedCostsTotalEur,
    batteryOrRangeRequiredKm,
    vehicleRealRangeKm,
    chargingStopsRecommended,
    chargingMinutesTotal,
    feasibilityStatus,
    feasibilityWarnings,
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
  let hasCondition = false;
  const legalAgeLimit =
    vehicle.marketEligibilityDetail?.maxAgeYears ??
    maxLegalAgeYears ??
    (vehicle.countryCode === 'PT' ? 7 : vehicle.countryCode === 'ES' ? 10 : 8);
  const expiresOnDate =
    vehicle.marketEligibilityDetail?.expiresOnDate ??
    vehicle.eligibilityValidUntil ??
    `${vehicle.year + legalAgeLimit}-${(vehicle.firstRegistration || `${vehicle.year}-12-31`).slice(5, 10)}`;

  if (age > legalAgeLimit) {
    tvdeLegalEligible = false;
    tvdeReasons.push(
      `Idade do veículo (${age} anos) excede o limite legal máximo de ${legalAgeLimit} anos em ${vehicle.countryCode}.`
    );
  } else {
    tvdeReasons.push(
      `Cumpre idade máxima para ${vehicle.countryCode} (${age} / ${legalAgeLimit} anos desde ${vehicle.firstRegistration}; elegível até ${expiresOnDate}).`
    );
  }

  if (vehicle.doors < 4 || vehicle.seats < 4) {
    tvdeLegalEligible = false;
    tvdeReasons.push('Exige mínimo de 4 portas e 4 lugares totais para passageiros.');
  }

  if (vehicle.colorRule) {
    const colorLower = vehicle.color.toLowerCase();
    const isForbidden = vehicle.colorRule.forbidden?.some((c) => colorLower.includes(c.toLowerCase()));
    if (isForbidden) {
      tvdeLegalEligible = false;
      tvdeReasons.push(`Cor "${vehicle.color}" restrita pela regra local (${vehicle.colorRule.source}).`);
    } else if (
      vehicle.colorRule.mandatory &&
      vehicle.colorRule.mandatory.length > 0 &&
      !vehicle.colorRule.mandatory.some((c) => colorLower.includes(c.toLowerCase()))
    ) {
      hasCondition = true;
      tvdeReasons.push(
        `Atenção à cor "${vehicle.color}": mercado pode exigir ${vehicle.colorRule.mandatory.join(', ')}.`
      );
    } else if (vehicle.colorRule.status === 'Informação ainda não confirmada') {
      hasCondition = true;
      tvdeReasons.push('Regra oficial de cor para este mercado/categoria ainda não confirmada.');
    }
  }

  let eligibilityStatus: VehicleEligibilityResult['eligibilityStatus'] = 'Elegível';
  if (!tvdeLegalEligible) {
    eligibilityStatus = 'Não elegível';
  } else if (vehicle.marketEligibilityDetail?.status === 'Informação ainda não confirmada') {
    eligibilityStatus = 'Informação ainda não confirmada';
  } else if (hasCondition || vehicle.marketEligibilityDetail?.status === 'Elegibilidade condicionada' || age >= legalAgeLimit) {
    eligibilityStatus = 'Elegibilidade condicionada';
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
          if (vehicle.fuelType === 'Elétrico' || vehicle.fuelType === 'Híbrido' || vehicle.fuelType === 'Plug-in') {
            cats.push(cat);
          }
        } else if (lower.includes('comfort') || lower.includes('executivo') || lower.includes('executive') || lower.includes('black')) {
          if (vehicle.trunkLiters >= 420 && age <= 5 && vehicle.powerKw >= 95) {
            cats.push(cat);
          }
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
      statusLabel: cats.length === 0 ? 'Não elegível' : hasCondition ? 'Elegibilidade condicionada' : 'Elegível',
      categories: cats,
      reasons,
    };
  }

  return {
    vehicleId: vehicle.id,
    tvdeLegalEligible,
    eligibilityStatus,
    expiresOnDate,
    tvdeReasons,
    platformEligibility,
  };
}

export interface VehicleCatalogFilters {
  searchQuery?: string;
  countryCode?: string;
  city?: string;
  platformId?: string;
  category?: string;
  brand?: string;
  model?: string;
  version?: string;
  yearMin?: number;
  yearMax?: number;
  fuelType?: string;
  minSeats?: number;
  minDoors?: number;
  minBatteryKwh?: number;
  minTrunkLiters?: number;
  minRangeKm?: number;
  onlyEligible?: boolean;
  colorQuery?: string;
  maxCostPerKmEur?: number;
  sortBy?: VehicleSortOption;
}

export function filterVehiclesCatalog(
  vehicles: VehicleRecord[],
  filters: VehicleCatalogFilters,
  platforms?: Array<{ id: string; name: string; categories: string[]; countryScope: string[]; status: string }>
): VehicleRecord[] {
  const filtered = vehicles.filter((v) => {
    if (filters.countryCode && filters.countryCode !== 'ALL' && v.countryCode !== filters.countryCode) {
      return false;
    }
    if (filters.city && filters.city !== 'ALL' && v.city.toLowerCase() !== filters.city.toLowerCase()) {
      return false;
    }
    if (filters.brand && filters.brand !== 'ALL' && v.brand.toLowerCase() !== filters.brand.toLowerCase()) {
      return false;
    }
    if (filters.model && filters.model !== 'ALL' && !v.model.toLowerCase().includes(filters.model.toLowerCase())) {
      return false;
    }
    if (filters.version && filters.version.trim() && !v.version.toLowerCase().includes(filters.version.trim().toLowerCase())) {
      return false;
    }
    if (filters.yearMin && filters.yearMin > 0 && v.year < filters.yearMin) {
      return false;
    }
    if (filters.yearMax && filters.yearMax > 0 && v.year > filters.yearMax) {
      return false;
    }
    if (filters.fuelType && filters.fuelType !== 'ALL' && v.fuelType !== filters.fuelType) {
      return false;
    }
    if (filters.minSeats && v.seats < filters.minSeats) {
      return false;
    }
    if (filters.minDoors && v.doors < filters.minDoors) {
      return false;
    }
    if (filters.minBatteryKwh && filters.minBatteryKwh > 0 && (v.batteryKwh ?? 0) < filters.minBatteryKwh) {
      return false;
    }
    if (filters.minTrunkLiters && v.trunkLiters < filters.minTrunkLiters) {
      return false;
    }
    if (filters.minRangeKm && (v.realRangeKm ?? v.rangeKm) < filters.minRangeKm) {
      return false;
    }
    if (filters.colorQuery && !v.color.toLowerCase().includes(filters.colorQuery.toLowerCase())) {
      return false;
    }
    if (filters.maxCostPerKmEur && filters.maxCostPerKmEur > 0) {
      const tco = computeVehicleOwnershipTcoPerKm(v);
      if (tco.totalEstimatedCostPerKmEur > filters.maxCostPerKmEur) {
        return false;
      }
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const text = `${v.brand} ${v.model} ${v.version} ${v.year} ${v.color} ${v.city} ${v.equipment.join(' ')}`.toLowerCase();
      if (!text.includes(q)) return false;
    }

    const elig = evaluateVehicleEligibility(v, new Date().getFullYear(), platforms);
    if (filters.onlyEligible && !elig.tvdeLegalEligible) {
      return false;
    }
    if (filters.platformId && filters.platformId !== 'ALL') {
      const pElig = elig.platformEligibility[filters.platformId];
      if (!pElig || !pElig.eligible) return false;
      if (filters.category && filters.category !== 'ALL' && !pElig.categories.includes(filters.category)) {
        return false;
      }
    } else if (filters.category && filters.category !== 'ALL') {
      const anyMatch = Object.values(elig.platformEligibility).some((pe) =>
        pe.categories.includes(filters.category!)
      );
      if (!anyMatch) return false;
    }
    return true;
  });

  if (!filters.sortBy || filters.sortBy === 'relevance') {
    return filtered;
  }

  return [...filtered].sort((a, b) => {
    if (filters.sortBy === 'costAsc') {
      return (
        computeVehicleOwnershipTcoPerKm(a).totalEstimatedCostPerKmEur -
        computeVehicleOwnershipTcoPerKm(b).totalEstimatedCostPerKmEur
      );
    }
    if (filters.sortBy === 'rangeDesc') {
      return (b.realRangeKm ?? b.rangeKm) - (a.realRangeKm ?? a.rangeKm);
    }
    if (filters.sortBy === 'yearDesc') {
      return b.year - a.year;
    }
    if (filters.sortBy === 'trunkDesc') {
      return b.trunkLiters - a.trunkLiters;
    }
    return 0;
  });
}

export function estimateVehicleResaleValue(
  vehicle: VehicleRecord,
  odometerKm = vehicle.odometerKm ?? 55000,
  referenceYear = new Date().getFullYear()
): {
  minValueEur: number;
  midValueEur: number;
  maxValueEur: number;
  valuationType: 'Estimativa algorítmica AIVAD' | 'Preço anunciado observado' | 'Transação real declarada';
  annualDepreciationRatePct: number;
  caveats: string[];
} {
  if (vehicle.resaleEstimate) {
    const delta10k = (odometerKm - (vehicle.odometerKm ?? 55000)) / 10000;
    const adj = Math.round(delta10k * vehicle.resaleEstimate.mileagePenaltyPer10kEur);
    return {
      minValueEur: Math.max(2500, vehicle.resaleEstimate.minValueEur - adj),
      midValueEur: Math.max(3000, vehicle.resaleEstimate.midValueEur - adj),
      maxValueEur: Math.max(3500, vehicle.resaleEstimate.maxValueEur - adj),
      valuationType: vehicle.resaleEstimate.valuationType,
      annualDepreciationRatePct: vehicle.fuelType === 'Elétrico' ? 11.5 : 9.8,
      caveats: vehicle.resaleEstimate.caveats,
    };
  }

  const baseNewPrice = vehicle.fuelType === 'Elétrico' ? 39500 : vehicle.fuelType === 'Híbrido' ? 32000 : 25500;
  const ageYears = Math.max(0, referenceYear - vehicle.year);
  const annualRate = vehicle.fuelType === 'Elétrico' ? 0.115 : 0.098;
  const ageFactor = Math.pow(1 - annualRate, ageYears);
  const kmPenalty = Math.max(0, (odometerKm - ageYears * 18000) / 10000) * 650;
  const mid = Math.max(3500, Math.round(baseNewPrice * ageFactor - kmPenalty));
  return {
    minValueEur: Math.round(mid * 0.91),
    midValueEur: mid,
    maxValueEur: Math.round(mid * 1.09),
    valuationType: 'Estimativa algorítmica AIVAD',
    annualDepreciationRatePct: round2(annualRate * 100),
    caveats: [
      'Estimativa algorítmica indicativa por idade, motorização e quilometragem informada.',
      'Não representa preço anunciado em portais nem valor garantido de transação real.',
    ],
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

export function getConfirmedAdjustmentsEur(trip: TripRecord): number {
  if (!trip.fareAdjustments || trip.fareAdjustments.length === 0) return 0;
  return round2(
    trip.fareAdjustments
      .filter((a) => a.status === 'Confirmado pela plataforma')
      .reduce((acc, a) => acc + a.amountEur, 0)
  );
}

export function computeFinancialSummary(trips: TripRecord[], expenses: ExpenseRecord[]) {
  const completed = trips.filter((t) => isCompletedTripStatus(t.status));
  const cancelledOrLostCount = trips.filter((t) => !isCompletedTripStatus(t.status)).length;
  // Apenas ajustes confirmados pela plataforma entram na receita real; ajustes pendentes ficam fora dos ganhos reais
  const grossTotal = round2(
    completed.reduce((acc, t) => acc + t.grossEur + getConfirmedAdjustmentsEur(t), 0)
  );
  const tipsTotal = round2(completed.reduce((acc, t) => acc + t.tipEur, 0));
  const bonusTotal = round2(completed.reduce((acc, t) => acc + t.bonusEur, 0));
  const tollsTotal = round2(completed.reduce((acc, t) => acc + t.tollsEur, 0));
  const commissionsTotal = round2(completed.reduce((acc, t) => acc + t.commissionEur, 0));
  const tripOpCost = round2(completed.reduce((acc, t) => acc + t.operationalCostEur, 0));
  const loggedExpenses = round2(expenses.reduce((acc, e) => acc + e.amountEur, 0));
  const totalRevenue = round2(grossTotal + tipsTotal + bonusTotal);
  const netEstimated = round2(totalRevenue - commissionsTotal - tripOpCost - loggedExpenses);

  const totalKm = round2(
    completed.reduce(
      (acc, t) =>
        acc +
        (t.postAcceptanceActual?.hasObservedActuals && t.postAcceptanceActual.totalDistanceKm
          ? t.postAcceptanceActual.totalDistanceKm
          : t.pickupDistanceKm + t.tripDistanceKm),
      0
    )
  );
  const passengerKm = round2(
    completed.reduce(
      (acc, t) =>
        acc +
        (t.postAcceptanceActual?.hasObservedActuals && t.postAcceptanceActual.tripDistanceKm
          ? t.postAcceptanceActual.tripDistanceKm
          : t.tripDistanceKm),
      0
    )
  );
  const emptyKm = round2(
    completed.reduce(
      (acc, t) =>
        acc +
        (t.postAcceptanceActual?.hasObservedActuals && t.postAcceptanceActual.pickupDistanceKm
          ? t.postAcceptanceActual.pickupDistanceKm
          : t.pickupDistanceKm),
      0
    )
  );
  const totalHours = round2(
    completed.reduce(
      (acc, t) =>
        acc +
        (t.postAcceptanceActual?.hasObservedActuals && t.postAcceptanceActual.totalTimeMin
          ? t.postAcceptanceActual.totalTimeMin
          : t.durationMin),
      0
    ) / 60
  );

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
