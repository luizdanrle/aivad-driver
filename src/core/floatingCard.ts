import type {
  AndroidOverlayConfig,
  FloatingCardOperationalMeaning,
  FloatingCardTierStyleConfig,
  FloatingMetricKey,
  ProposalAnalysis,
  ProposalClassification,
  ProposalGalleryExample,
  ProposalInput,
} from '../models/types';

export const ALL_FLOATING_METRICS: FloatingMetricKey[] = [
  'eurPerKm',
  'eurPerHour',
  'eurPerMin',
  'emptyReturnRisk',
  'pickupDistanceKm',
  'pickupTimeMin',
  'tripDistanceKm',
  'tripTimeMin',
  'totalDistanceKm',
  'totalTime',
  'grossValueEur',
  'estimatedNet',
  'commissionEur',
  'operatingCostEur',
  'score',
  'profitabilityPct',
];

export interface FloatingMetricDefinition {
  key: FloatingMetricKey;
  label: string;
  shortExplanation: string;
  formula: string;
}

export const FLOATING_METRIC_DEFINITIONS: Record<FloatingMetricKey, FloatingMetricDefinition> = {
  eurPerKm: {
    key: 'eurPerKm',
    label: '€/km',
    shortExplanation: 'Valor líquido estimado por quilómetro considerado na análise.',
    formula: 'Valor líquido estimado ÷ Distância total considerada',
  },
  eurPerHour: {
    key: 'eurPerHour',
    label: '€/hora',
    shortExplanation: 'Produtividade líquida horária estimada para a operação completa.',
    formula: '(Valor líquido estimado ÷ Tempo total em minutos) × 60',
  },
  eurPerMin: {
    key: 'eurPerMin',
    label: '€/minuto',
    shortExplanation: 'Rendimento líquido estimado por cada minuto comprometido.',
    formula: 'Valor líquido estimado ÷ Tempo total em minutos',
  },
  emptyReturnRisk: {
    key: 'emptyReturnRisk',
    label: 'Retorno vazio',
    shortExplanation: 'Risco estimado de regresso em vazio sem passageiro a partir da zona de destino.',
    formula: 'Avaliação da distância da viagem (>22 km Alto / >12 km Médio) e zona de periferia',
  },
  pickupDistanceKm: {
    key: 'pickupDistanceKm',
    label: 'Dist. recolha',
    shortExplanation: 'Distância em vazio percorrida até ao ponto de recolha do passageiro.',
    formula: 'Distância informada até à recolha (km)',
  },
  pickupTimeMin: {
    key: 'pickupTimeMin',
    label: 'Tempo recolha',
    shortExplanation: 'Tempo estimado de deslocação até recolher o passageiro.',
    formula: 'Minutos estimados até à chegada à recolha',
  },
  tripDistanceKm: {
    key: 'tripDistanceKm',
    label: 'Dist. viagem',
    shortExplanation: 'Distância estimada do percurso com o passageiro a bordo.',
    formula: 'Distância informada entre recolha e destino (km)',
  },
  tripTimeMin: {
    key: 'tripTimeMin',
    label: 'Tempo viagem',
    shortExplanation: 'Tempo estimado pela plataforma para o percurso com o passageiro.',
    formula: 'Minutos estimados entre recolha e destino',
  },
  totalDistanceKm: {
    key: 'totalDistanceKm',
    label: 'Distância total',
    shortExplanation: 'Soma da distância até ao passageiro e da distância estimada da viagem.',
    formula: 'Distância de recolha + Distância da viagem',
  },
  totalTime: {
    key: 'totalTime',
    label: 'Tempo total',
    shortExplanation: 'Soma do tempo estimado de recolha, tempo da viagem e paragens quando aplicável.',
    formula: 'Tempo de recolha + Tempo da viagem + (Paragens × 2 min)',
  },
  grossValueEur: {
    key: 'grossValueEur',
    label: 'Valor bruto',
    shortExplanation: 'Valor apresentado inicialmente pela plataforma (inclui bónus visível, antes de deduções).',
    formula: 'Tarifa apresentada + Bónus explícito na oferta',
  },
  estimatedNet: {
    key: 'estimatedNet',
    label: 'Líquido est.',
    shortExplanation: 'Valor após comissões e custos configurados. Não confundir com o valor final recebido.',
    formula: 'Valor bruto − Comissão da plataforma − Custo veículo/km − Portagens',
  },
  commissionEur: {
    key: 'commissionEur',
    label: 'Comissão',
    shortExplanation: 'Dedução estimada da comissão da plataforma TVDE sobre a tarifa bruta.',
    formula: 'Valor bruto × (% Comissão configurada ÷ 100)',
  },
  operatingCostEur: {
    key: 'operatingCostEur',
    label: 'Custos est.',
    shortExplanation: 'Desgaste energético/combustível, manutenção por km e portagens da operação.',
    formula: '(Distância total × Custo €/km do veículo) + Portagens',
  },
  score: {
    key: 'score',
    label: 'Score IA',
    shortExplanation: 'Avaliação calculada pelo motor AIVAD ponderando €/km, €/hora e eficiência da recolha.',
    formula: 'Média ponderada normalizada (0–100) segundo modo de análise',
  },
  profitabilityPct: {
    key: 'profitabilityPct',
    label: 'Rentabilidade',
    shortExplanation: 'Percentagem do valor bruto que permanece como margem líquida estimada.',
    formula: '(Líquido estimado ÷ Valor bruto) × 100',
  },
};

export const FLOATING_METRIC_LABELS: Record<FloatingMetricKey, string> = {
  eurPerKm: FLOATING_METRIC_DEFINITIONS.eurPerKm.label,
  eurPerHour: FLOATING_METRIC_DEFINITIONS.eurPerHour.label,
  eurPerMin: FLOATING_METRIC_DEFINITIONS.eurPerMin.label,
  emptyReturnRisk: FLOATING_METRIC_DEFINITIONS.emptyReturnRisk.label,
  pickupDistanceKm: FLOATING_METRIC_DEFINITIONS.pickupDistanceKm.label,
  pickupTimeMin: FLOATING_METRIC_DEFINITIONS.pickupTimeMin.label,
  tripDistanceKm: FLOATING_METRIC_DEFINITIONS.tripDistanceKm.label,
  tripTimeMin: FLOATING_METRIC_DEFINITIONS.tripTimeMin.label,
  totalDistanceKm: FLOATING_METRIC_DEFINITIONS.totalDistanceKm.label,
  totalTime: FLOATING_METRIC_DEFINITIONS.totalTime.label,
  grossValueEur: FLOATING_METRIC_DEFINITIONS.grossValueEur.label,
  estimatedNet: FLOATING_METRIC_DEFINITIONS.estimatedNet.label,
  commissionEur: FLOATING_METRIC_DEFINITIONS.commissionEur.label,
  operatingCostEur: FLOATING_METRIC_DEFINITIONS.operatingCostEur.label,
  score: FLOATING_METRIC_DEFINITIONS.score.label,
  profitabilityPct: FLOATING_METRIC_DEFINITIONS.profitabilityPct.label,
};

export const TIER_OPERATIONAL_MEANINGS: Record<ProposalClassification, FloatingCardOperationalMeaning> = {
  verde: 'Favorável',
  amarelo: 'Atenção',
  vermelho: 'Evitar',
};

export const TIER_MEANING_DESCRIPTIONS: Record<ProposalClassification, string> = {
  verde: 'Proposta considerada boa pela inteligência do AIVAD face aos critérios configurados.',
  amarelo: 'Proposta razoável, com um ou mais fatores que exigem análise antes de aceitar.',
  vermelho: 'Proposta desfavorável segundo os limites mínimos configurados de rentabilidade, recolha ou conformidade.',
};

export function createDefaultTierProfile(tier: ProposalClassification): FloatingCardTierStyleConfig {
  if (tier === 'verde') {
    return {
      tierKey: 'verde',
      operationalMeaning: 'Favorável',
      customLabel: 'Favorável',
      bgColor: '#FFFFFF',
      textColor: '#0F172A',
      borderColor: '#059669',
      badgeBgColor: '#ECFDF5',
      badgeTextColor: '#047857',
      borderWidthPx: 2,
      opacityPercent: 96,
      brightnessAdjust: 0,
      colorIntensityPct: 100,
      fontFamily: 'Sans',
      fontSizePx: 14,
      widthPercent: 88,
      cardMinHeightPx: 0,
      paddingPx: 16,
      layoutMode: 'expandido',
      position: 'Centro superior',
      marginOffsetPx: 12,
      visibleMetrics: ['eurPerKm', 'eurPerHour', 'estimatedNet', 'emptyReturnRisk'],
    };
  }
  if (tier === 'amarelo') {
    return {
      tierKey: 'amarelo',
      operationalMeaning: 'Atenção',
      customLabel: 'Atenção',
      bgColor: '#FFFBEB',
      textColor: '#451A03',
      borderColor: '#D97706',
      badgeBgColor: '#FEF3C7',
      badgeTextColor: '#B45309',
      borderWidthPx: 2,
      opacityPercent: 96,
      brightnessAdjust: 0,
      colorIntensityPct: 100,
      fontFamily: 'Sans',
      fontSizePx: 14,
      widthPercent: 90,
      cardMinHeightPx: 0,
      paddingPx: 16,
      layoutMode: 'expandido',
      position: 'Centro superior',
      marginOffsetPx: 12,
      visibleMetrics: ['eurPerKm', 'eurPerHour', 'pickupDistanceKm', 'totalTime', 'estimatedNet', 'emptyReturnRisk'],
    };
  }
  return {
    tierKey: 'vermelho',
    operationalMeaning: 'Evitar',
    customLabel: 'Evitar',
    bgColor: '#FFF1F2',
    textColor: '#4C0519',
    borderColor: '#E11D48',
    badgeBgColor: '#FFE4E6',
    badgeTextColor: '#BE123C',
    borderWidthPx: 3,
    opacityPercent: 98,
    brightnessAdjust: 0,
    colorIntensityPct: 100,
    fontFamily: 'Sans',
    fontSizePx: 14,
    widthPercent: 92,
    cardMinHeightPx: 0,
    paddingPx: 16,
    layoutMode: 'expandido',
    position: 'Centro superior',
    marginOffsetPx: 12,
    visibleMetrics: ['eurPerKm', 'eurPerHour', 'pickupDistanceKm', 'operatingCostEur', 'estimatedNet', 'emptyReturnRisk'],
  };
}

export function createDefaultClassificationProfiles(): Record<ProposalClassification, FloatingCardTierStyleConfig> {
  return {
    verde: createDefaultTierProfile('verde'),
    amarelo: createDefaultTierProfile('amarelo'),
    vermelho: createDefaultTierProfile('vermelho'),
  };
}

export function resolveFloatingTierConfig(
  overlayConfig: AndroidOverlayConfig,
  classification: ProposalClassification
): FloatingCardTierStyleConfig {
  const fallback = createDefaultTierProfile(classification);
  const existing = overlayConfig.classificationProfiles?.[classification];
  if (!existing) {
    return {
      ...fallback,
      bgColor: overlayConfig.useCustomColors ? overlayConfig.bgColor : fallback.bgColor,
      textColor: overlayConfig.useCustomColors ? overlayConfig.textColor : fallback.textColor,
      borderColor: overlayConfig.useCustomColors ? overlayConfig.borderColor : fallback.borderColor,
      borderWidthPx: overlayConfig.borderWidthPx ?? fallback.borderWidthPx,
      opacityPercent: overlayConfig.opacityPercent ?? fallback.opacityPercent,
      brightnessAdjust: overlayConfig.brightnessAdjust ?? 0,
      colorIntensityPct: overlayConfig.colorIntensityPct ?? 100,
      fontFamily: overlayConfig.fontFamily ?? fallback.fontFamily,
      fontSizePx: overlayConfig.fontSizePx ?? fallback.fontSizePx,
      widthPercent: overlayConfig.widthPercent ?? fallback.widthPercent,
      layoutMode: overlayConfig.layoutMode ?? fallback.layoutMode,
      position: overlayConfig.position ?? fallback.position,
      marginOffsetPx: overlayConfig.marginOffsetPx ?? fallback.marginOffsetPx,
      visibleMetrics:
        overlayConfig.visibleMetrics && overlayConfig.visibleMetrics.length > 0
          ? [...overlayConfig.visibleMetrics]
          : [...fallback.visibleMetrics],
    };
  }
  return {
    ...fallback,
    ...existing,
    tierKey: classification,
    operationalMeaning: TIER_OPERATIONAL_MEANINGS[classification],
    visibleMetrics: Array.isArray(existing.visibleMetrics)
      ? [...existing.visibleMetrics]
      : [...fallback.visibleMetrics],
  };
}

export function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

export function isDarkHexColor(hex: string): boolean {
  const rgb = parseHexRgb(hex);
  if (!rgb) return false;
  const luminance = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  return luminance < 148;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;

  if (sn === 0) {
    const v = Math.round(ln * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  ];
}

function toHexByte(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
}

/**
 * Pure color transform applying brightnessAdjust (-40..+40: escurecer vs clarear)
 * and colorIntensityPct (20..180: saturation scaling).
 */
export function adjustHexColor(
  hex: string,
  brightnessAdjust = 0,
  colorIntensityPct = 100
): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  if (brightnessAdjust === 0 && colorIntensityPct === 100) {
    return `#${toHexByte(rgb[0])}${toHexByte(rgb[1])}${toHexByte(rgb[2])}`;
  }
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const nextL = Math.max(4, Math.min(98, l + brightnessAdjust));
  const nextS = Math.max(0, Math.min(100, s * (Math.max(10, colorIntensityPct) / 100)));
  const [nr, ng, nb] = hslToRgb(h, nextS, nextL);
  return `#${toHexByte(nr)}${toHexByte(ng)}${toHexByte(nb)}`;
}

export function hexWithOpacityRgba(hex: string, opacityPercent: number): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const alpha = Math.max(0.1, Math.min(1, opacityPercent / 100));
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(2)})`;
}

export interface EvaluatedFloatingMetricCell {
  key: FloatingMetricKey;
  label: string;
  value: string;
  available: boolean;
  shortExplanation: string;
  formula: string;
  inputsFed: string;
}

export function evaluateFloatingMetricCell(
  key: FloatingMetricKey,
  input: ProposalInput,
  analysis: ProposalAnalysis,
  currencySymbol = '€'
): EvaluatedFloatingMetricCell {
  const def = FLOATING_METRIC_DEFINITIONS[key];
  const unavail = new Set(input.unavailableFields ?? []);
  const sym = currencySymbol.trim();
  const hasValidRevenue = Number.isFinite(analysis.effectiveRevenueEur) && analysis.effectiveRevenueEur > 0;
  const hasPickupDist = !unavail.has('pickupDistanceKm') && Number.isFinite(input.pickupDistanceKm);
  const hasPickupTime = !unavail.has('pickupTimeMin') && Number.isFinite(input.pickupTimeMin);
  const hasTripDist = !unavail.has('tripDistanceKm') && Number.isFinite(input.tripDistanceKm) && input.tripDistanceKm > 0;
  const hasTripTime = !unavail.has('tripTimeMin') && Number.isFinite(input.tripTimeMin) && input.tripTimeMin > 0;
  const hasCommission = !unavail.has('commissionPct') && analysis.commissionEur !== undefined && analysis.commissionPctApplied !== undefined;
  const hasVehicleCost = !unavail.has('vehicleCostPerKmEur') && Number.isFinite(input.vehicleCostPerKmEur);
  const hasTotalDist = hasPickupDist && hasTripDist && analysis.totalDistanceKm > 0;
  const hasTotalTime = hasPickupTime && hasTripTime && analysis.totalTimeMin > 0;

  switch (key) {
    case 'eurPerKm': {
      const ok = hasValidRevenue && hasTripDist && (input.calculationBasis === 'trip_distance_only' || hasPickupDist);
      const denom = input.calculationBasis === 'trip_distance_only' ? input.tripDistanceKm : analysis.totalDistanceKm;
      return {
        ...def,
        available: ok,
        value: ok ? `${sym}${analysis.eurPerKm.toFixed(2)}` : 'Indisponível',
        inputsFed: ok
          ? `Líquido est. ${sym}${analysis.estimatedNetEur.toFixed(2)} ÷ ${denom.toFixed(1)} km`
          : 'Distância ou líquido insuficiente na captura',
      };
    }
    case 'eurPerHour': {
      const ok = hasValidRevenue && hasTotalTime;
      return {
        ...def,
        available: ok,
        value: ok ? `${sym}${analysis.eurPerHour.toFixed(2)}` : 'Indisponível',
        inputsFed: ok
          ? `Líquido est. ${sym}${analysis.estimatedNetEur.toFixed(2)} ÷ ${analysis.totalTimeMin} min × 60`
          : 'Duração total indisponível para calcular €/hora',
      };
    }
    case 'eurPerMin': {
      const ok = hasValidRevenue && hasTotalTime;
      return {
        ...def,
        available: ok,
        value: ok ? `${sym}${analysis.eurPerMin.toFixed(2)}` : 'Indisponível',
        inputsFed: ok
          ? `Líquido est. ${sym}${analysis.estimatedNetEur.toFixed(2)} ÷ ${analysis.totalTimeMin} min`
          : 'Duração total indisponível para calcular €/minuto',
      };
    }
    case 'emptyReturnRisk': {
      const ok = hasTripDist;
      return {
        ...def,
        available: ok,
        value: ok ? analysis.emptyReturnRisk : 'Indisponível',
        inputsFed: ok
          ? `Viagem ${input.tripDistanceKm.toFixed(1)} km · Zona "${input.region}"`
          : 'Distância/zona de destino em falta',
      };
    }
    case 'pickupDistanceKm':
      return {
        ...def,
        available: hasPickupDist,
        value: hasPickupDist ? `${input.pickupDistanceKm.toFixed(1)} km` : 'Indisponível',
        inputsFed: hasPickupDist
          ? `Distância informada até recolha: ${input.pickupDistanceKm.toFixed(1)} km`
          : 'Distância de recolha não fornecida pela fonte',
      };
    case 'pickupTimeMin':
      return {
        ...def,
        available: hasPickupTime,
        value: hasPickupTime ? `${Math.round(input.pickupTimeMin)} min` : 'Indisponível',
        inputsFed: hasPickupTime
          ? `Tempo estimado até recolha: ${Math.round(input.pickupTimeMin)} min`
          : 'Tempo de recolha não fornecido pela fonte',
      };
    case 'tripDistanceKm':
      return {
        ...def,
        available: hasTripDist,
        value: hasTripDist ? `${input.tripDistanceKm.toFixed(1)} km` : 'Indisponível',
        inputsFed: hasTripDist
          ? `Percurso com passageiro: ${input.tripDistanceKm.toFixed(1)} km`
          : 'Distância da viagem não disponível',
      };
    case 'tripTimeMin':
      return {
        ...def,
        available: hasTripTime,
        value: hasTripTime ? `${Math.round(input.tripTimeMin)} min` : 'Indisponível',
        inputsFed: hasTripTime
          ? `Duração estimada com passageiro: ${Math.round(input.tripTimeMin)} min`
          : 'Duração da viagem não disponível',
      };
    case 'totalDistanceKm':
      return {
        ...def,
        available: hasTotalDist,
        value: hasTotalDist ? `${analysis.totalDistanceKm.toFixed(1)} km` : 'Indisponível',
        inputsFed: hasTotalDist
          ? `${input.pickupDistanceKm.toFixed(1)} km recolha + ${input.tripDistanceKm.toFixed(1)} km viagem`
          : 'Requer recolha e viagem válidas',
      };
    case 'totalTime':
      return {
        ...def,
        available: hasTotalTime,
        value: hasTotalTime ? `${analysis.totalTimeMin} min` : 'Indisponível',
        inputsFed: hasTotalTime
          ? `${input.pickupTimeMin}m recolha + ${input.tripTimeMin}m viagem${input.stops > 0 ? ` + ${input.stops * 2}m paragens` : ''}`
          : 'Requer tempos de recolha e viagem válidos',
      };
    case 'grossValueEur':
      return {
        ...def,
        available: hasValidRevenue,
        value: hasValidRevenue ? `${sym}${analysis.effectiveRevenueEur.toFixed(2)}` : 'Indisponível',
        inputsFed: hasValidRevenue
          ? `${sym}${input.grossValueEur.toFixed(2)} tarifa${input.bonusEur > 0 ? ` + ${sym}${input.bonusEur.toFixed(2)} bónus` : ''}`
          : 'Valor bruto ausente na proposta',
      };
    case 'estimatedNet': {
      const ok = hasValidRevenue && hasVehicleCost && hasTotalDist;
      const commText = hasCommission ? ` − ${sym}${analysis.commissionEur!.toFixed(2)} com.` : '';
      return {
        ...def,
        available: ok,
        value: ok ? `${sym}${analysis.estimatedNetEur.toFixed(2)}` : 'Indisponível',
        inputsFed: ok
          ? `Bruto ${sym}${analysis.effectiveRevenueEur.toFixed(2)}${commText} − ${sym}${analysis.operatingCostEur.toFixed(2)} custos`
          : 'Faltam custos/distância para estimar líquido',
      };
    }
    case 'commissionEur':
      return {
        ...def,
        available: hasValidRevenue && hasCommission,
        value:
          hasValidRevenue && hasCommission
            ? `${sym}${analysis.commissionEur!.toFixed(2)} (${analysis.commissionPctApplied}%)`
            : 'Indisponível',
        inputsFed:
          hasValidRevenue && hasCommission
            ? `Bruto ${sym}${analysis.effectiveRevenueEur.toFixed(2)} × ${analysis.commissionPctApplied}%`
            : 'Percentagem de comissão da plataforma indisponível',
      };
    case 'operatingCostEur': {
      const ok = hasVehicleCost && hasTotalDist;
      return {
        ...def,
        available: ok,
        value: ok ? `${sym}${analysis.operatingCostEur.toFixed(2)}` : 'Indisponível',
        inputsFed: ok
          ? `${analysis.totalDistanceKm.toFixed(1)} km × ${sym}${input.vehicleCostPerKmEur.toFixed(2)}/km${input.tollsEur > 0 ? ` + ${sym}${input.tollsEur.toFixed(2)} portagens` : ''}`
          : 'Custo/km ou distância em falta',
      };
    }
    case 'score': {
      const ok = hasValidRevenue && hasTotalDist && hasTotalTime;
      return {
        ...def,
        available: ok,
        value: ok ? `${analysis.score}/100` : 'Indisponível',
        inputsFed: ok
          ? `Modo ${input.mode}: €/km ${sym}${analysis.eurPerKm.toFixed(2)}, €/h ${sym}${analysis.eurPerHour.toFixed(2)}`
          : 'Dados insuficientes para Score IA fiável',
      };
    }
    case 'profitabilityPct': {
      const ok = hasValidRevenue && hasTotalDist && analysis.profitabilityPct !== undefined;
      return {
        ...def,
        available: ok,
        value: ok ? `${analysis.profitabilityPct!.toFixed(0)}%` : 'Indisponível',
        inputsFed: ok
          ? `Líquido ${sym}${analysis.estimatedNetEur.toFixed(2)} ÷ Bruto ${sym}${analysis.effectiveRevenueEur.toFixed(2)}`
          : 'Margem percentual indisponível',
      };
    }
  }
}

/**
 * Anonymized Uber & Bolt realistic learning gallery examples.
 * All names and exact private addresses are masked; explicitly tagged as visual demo reproductions.
 */
export const PROPOSAL_GALLERY_EXAMPLES: ProposalGalleryExample[] = [
  {
    id: 'ex-uber-boa-01',
    qualityTier: 'Boa',
    expectedClassification: 'verde',
    platformId: 'uber',
    title: 'Uber Comfort · Centro → Aeroporto (Alta Eficiência)',
    sourceNotice: 'Reprodução visual de demonstração (cenário Uber típico PT · dados pessoais anonimizados)',
    anonymizedPassengerAlias: 'Passageiro M*** A*** (4.92 ★)',
    anonymizedPickupLabel: 'Av. da República (Zona Central anónima)',
    anonymizedDestinationLabel: 'Terminal Partidas Aeroporto (Zona de elevada procura)',
    commissionPctAssumption: 25,
    input: {
      platformId: 'uber',
      category: 'Uber Comfort',
      grossValueEur: 18.8,
      pickupDistanceKm: 1.1,
      pickupTimeMin: 4,
      tripDistanceKm: 9.4,
      tripTimeMin: 16,
      stops: 0,
      tollsEur: 0,
      bonusEur: 1.5,
      region: 'Lisboa Centro → Aeroporto',
      pickupAddress: 'Av. da República (Ponto anónimo)',
      destinationAddress: 'Aeroporto T1 (Zona anónima)',
      vehicleCostPerKmEur: 0.12,
      commissionPct: 25,
      calculationBasis: 'total_distance',
      mode: 'Equilibrado',
    },
    decisionExplanation:
      'Classificada como Boa porque combina recolha curta (1,1 km / 4 min), retorno provável no aeroporto e rácio líquido sólido acima da meta horária e quilométrica, mesmo após 25% de comissão.',
  },
  {
    id: 'ex-bolt-boa-02',
    qualityTier: 'Boa',
    expectedClassification: 'verde',
    platformId: 'bolt',
    title: 'Bolt Comfort · Correio/Estação → Parque das Nações',
    sourceNotice: 'Reprodução visual de demonstração (cenário Bolt típico PT · dados pessoais anonimizados)',
    anonymizedPassengerAlias: 'Passageiro R*** T*** (4.88 ★)',
    anonymizedPickupLabel: 'Alameda / Rotunda Central (Zona anónima)',
    anonymizedDestinationLabel: 'Estação Oriente / Parque das Nações',
    commissionPctAssumption: 20,
    input: {
      platformId: 'bolt',
      category: 'Bolt Comfort',
      grossValueEur: 14.9,
      pickupDistanceKm: 0.9,
      pickupTimeMin: 3,
      tripDistanceKm: 7.8,
      tripTimeMin: 14,
      stops: 0,
      tollsEur: 0,
      bonusEur: 0,
      region: 'Lisboa Centro → Oriente',
      pickupAddress: 'Alameda Central (Ponto anónimo)',
      destinationAddress: 'Gare do Oriente (Zona anónima)',
      vehicleCostPerKmEur: 0.12,
      commissionPct: 20,
      calculationBasis: 'total_distance',
      mode: 'Equilibrado',
    },
    decisionExplanation:
      'Apesar do valor bruto moderado (€14,90), a comissão Bolt mais baixa (20%), tempo total reduzido (17 min) e destino de alta liquidez geram excelente €/hora líquido.',
  },
  {
    id: 'ex-uber-razoavel-03',
    qualityTier: 'Razoável',
    expectedClassification: 'amarelo',
    platformId: 'uber',
    title: 'UberX · Valor Bruto Médio com Recolha Intermédia',
    sourceNotice: 'Reprodução visual de demonstração (cenário Uber típico PT · dados pessoais anonimizados)',
    anonymizedPassengerAlias: 'Passageiro J*** L*** (4.79 ★)',
    anonymizedPickupLabel: 'Benfica / Estrada Principal (Zona anónima)',
    anonymizedDestinationLabel: 'Amadora / Zona Residencial (Periferia próxima)',
    commissionPctAssumption: 25,
    input: {
      platformId: 'uber',
      category: 'UberX',
      grossValueEur: 11.4,
      pickupDistanceKm: 2.9,
      pickupTimeMin: 8,
      tripDistanceKm: 7.9,
      tripTimeMin: 16,
      stops: 0,
      tollsEur: 0,
      bonusEur: 0,
      region: 'Benfica → Zona Intermédia',
      pickupAddress: 'Zona Benfica (Ponto anónimo)',
      destinationAddress: 'Zona Residencial Oeste (Ponto anónimo)',
      vehicleCostPerKmEur: 0.12,
      commissionPct: 25,
      calculationBasis: 'total_distance',
      mode: 'Equilibrado',
    },
    decisionExplanation:
      'Classificada como Atenção/Razoável: a recolha de 2,9 km (8 min) comprime o líquido por km após comissão de 25%. Aceitável apenas se ajudar a fechar campanha ativa ou reposicionar turno.',
  },
  {
    id: 'ex-bolt-razoavel-04',
    qualityTier: 'Razoável',
    expectedClassification: 'amarelo',
    platformId: 'bolt',
    title: 'Bolt · Tarifa Aparente Elevada mas Destino Médio-Longo',
    sourceNotice: 'Reprodução visual de demonstração (cenário Bolt típico PT · dados pessoais anonimizados)',
    anonymizedPassengerAlias: 'Passageiro S*** P*** (4.85 ★)',
    anonymizedPickupLabel: 'Sete Rios (Ponto anónimo)',
    anonymizedDestinationLabel: 'Oeiras Parque / Taguspark (Periferia empresarial)',
    commissionPctAssumption: 20,
    input: {
      platformId: 'bolt',
      category: 'Bolt',
      grossValueEur: 17.6,
      pickupDistanceKm: 1.8,
      pickupTimeMin: 6,
      tripDistanceKm: 16.4,
      tripTimeMin: 24,
      stops: 0,
      tollsEur: 0,
      bonusEur: 0,
      region: 'Lisboa → Periferia Empresarial',
      pickupAddress: 'Sete Rios (Ponto anónimo)',
      destinationAddress: 'Parque Empresarial Oeste (Ponto anónimo)',
      vehicleCostPerKmEur: 0.12,
      commissionPct: 20,
      calculationBasis: 'total_distance',
      mode: 'Equilibrado',
    },
    decisionExplanation:
      'Demonstra porque não basta olhar para o bruto (€17,60): 18,2 km totais + risco médio-alto de regresso sem passageiro em hora calma colocam esta proposta em Atenção.',
  },
  {
    id: 'ex-uber-ma-05',
    qualityTier: 'Má',
    expectedClassification: 'vermelho',
    platformId: 'uber',
    title: 'UberX · Valor Bruto Alto (€23,50) Enganador com Retorno Vazio',
    sourceNotice: 'Reprodução visual de demonstração (cenário Uber típico PT · dados pessoais anonimizados)',
    anonymizedPassengerAlias: 'Passageiro D*** F*** (4.68 ★)',
    anonymizedPickupLabel: 'Loures Sul (Ponto anónimo)',
    anonymizedDestinationLabel: 'Zona Rural Isolada (Periferia distante)',
    commissionPctAssumption: 25,
    input: {
      platformId: 'uber',
      category: 'UberX',
      grossValueEur: 23.5,
      pickupDistanceKm: 4.8,
      pickupTimeMin: 11,
      tripDistanceKm: 28.6,
      tripTimeMin: 39,
      stops: 1,
      tollsEur: 1.85,
      bonusEur: 0,
      region: 'Periferia Distante (Risco Retorno Vazio)',
      pickupAddress: 'Loures Sul (Ponto anónimo)',
      destinationAddress: 'Periferia Distante Norte (Ponto anónimo)',
      vehicleCostPerKmEur: 0.12,
      commissionPct: 25,
      calculationBasis: 'total_distance',
      mode: 'Equilibrado',
    },
    decisionExplanation:
      'Exemplo crítico contra ilusão do valor bruto: €23,50 parece atrativo, mas descontando 25% de comissão (€5,88), portagem (€1,85), 33,4 km comprometidos + retorno em vazio resulta em rentabilidade horária fraca.',
  },
  {
    id: 'ex-bolt-ma-06',
    qualityTier: 'Má',
    expectedClassification: 'vermelho',
    platformId: 'bolt',
    title: 'Bolt · Recolha Longa em Trânsito Urbano para Viagem Curta',
    sourceNotice: 'Reprodução visual de demonstração (cenário Bolt típico PT · dados pessoais anonimizados)',
    anonymizedPassengerAlias: 'Passageiro A*** N*** (4.72 ★)',
    anonymizedPickupLabel: 'Zona Baixa Congestionada (Ponto anónimo)',
    anonymizedDestinationLabel: 'Bairro Adjacente (Ponto anónimo)',
    commissionPctAssumption: 20,
    input: {
      platformId: 'bolt',
      category: 'Bolt',
      grossValueEur: 4.8,
      pickupDistanceKm: 4.3,
      pickupTimeMin: 13,
      tripDistanceKm: 3.1,
      tripTimeMin: 11,
      stops: 0,
      tollsEur: 0,
      bonusEur: 0,
      region: 'Centro Congestionado (Curta)',
      pickupAddress: 'Baixa (Ponto anónimo)',
      destinationAddress: 'Zona Adjacente (Ponto anónimo)',
      vehicleCostPerKmEur: 0.12,
      commissionPct: 20,
      calculationBasis: 'total_distance',
      mode: 'Equilibrado',
    },
    decisionExplanation:
      'Evitar: recolha mais longa do que a própria viagem com passageiro (4,3 km em vazio para 3,1 km pagos) consome 24 minutos para um líquido estimado inferior a €3,00.',
  },
];
