import type {
  DriverZoneObservation,
  MapZoneRecord,
  ProposalInput,
  ZoneAlternativePickup,
  ZoneConfidenceTier,
} from '../models/types';

export interface ZoneOperationalAlert {
  zoneId?: string;
  zoneName: string;
  tier: ZoneConfidenceTier;
  title: string;
  description: string;
  scheduleSummary?: string;
  isScheduleCurrentlyActive: boolean;
  isEventNotConfirmedBan: boolean;
  alternatives: ZoneAlternativePickup[];
  observationsCount: number;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function isScheduleActiveAt(
  daysOfWeek: number[],
  startHour: string,
  endHour: string,
  refDate: Date
): boolean {
  const day = refDate.getDay();
  if (!daysOfWeek.includes(day)) return false;
  const nowMin = refDate.getHours() * 60 + refDate.getMinutes();
  const sMin = hhmmToMinutes(startHour);
  const eMin = hhmmToMinutes(endHour);
  return nowMin >= sMin && nowMin <= eMin;
}

function matchesLocationText(haystack: string, needleKeywords: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needleKeywords.some((kw) => kw.length >= 3 && lower.includes(kw.toLowerCase()));
}

export function evaluateProposalZoneAlerts(params: {
  input: Pick<ProposalInput, 'region' | 'pickupAddress' | 'destinationAddress'>;
  zones: MapZoneRecord[];
  observations: DriverZoneObservation[];
  referenceDate?: Date;
}): ZoneOperationalAlert[] {
  const refDate = params.referenceDate ?? new Date();
  const searchSpace = [
    params.input.region || '',
    params.input.pickupAddress || '',
    params.input.destinationAddress || '',
  ]
    .join(' ')
    .trim();

  if (!searchSpace) return [];

  const alerts: ZoneOperationalAlert[] = [];

  for (const zone of params.zones) {
    const tokens = zone.name
      .split(/[/(),-]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 4);

    if (zone.id === 'zn-feira-relogio') {
      tokens.push('santo condestável', 'marvila', 'feira do relógio', 'chelas');
    }
    if (zone.id === 'zn-feira-ladra') {
      tokens.push('santa clara', 'são vicente', 'feira da ladra', 'alfama');
    }

    if (!matchesLocationText(searchSpace, tokens)) continue;

    const matchingObs = params.observations.filter(
      (o) => o.zoneId === zone.id || o.zoneName.toLowerCase().includes(zone.name.split('/')[0].trim().toLowerCase())
    );

    const hasIssue =
      zone.preference === 'Evitar' ||
      Boolean(zone.activeEvent) ||
      Boolean(zone.riskSummary) ||
      (zone.schedules && zone.schedules.length > 0) ||
      matchingObs.length > 0;

    if (!hasIssue) continue;

    const activeSched = zone.schedules?.find((sc) =>
      isScheduleActiveAt(sc.daysOfWeek, sc.startHour, sc.endHour, refDate)
    );
    const anySched = zone.schedules?.[0];

    alerts.push({
      zoneId: zone.id,
      zoneName: zone.name,
      tier: zone.tier ?? '2 · Dificuldade recorrente (motoristas)',
      title: zone.activeEvent ?? zone.riskSummary ?? `Atenção operacional em ${zone.name}`,
      description:
        zone.riskSummary ??
        zone.activeEvent ??
        'Zona com dificuldade de acesso/recolha reportada pelos motoristas.',
      scheduleSummary: (activeSched ?? anySched)?.summary,
      isScheduleCurrentlyActive: Boolean(activeSched),
      isEventNotConfirmedBan: Boolean(zone.isEventNotConfirmedBan),
      alternatives: zone.alternativePickups ?? [],
      observationsCount: matchingObs.length,
    });
  }

  return alerts;
}

export function createDriverZoneObservation(params: {
  zoneId?: string;
  zoneName: string;
  city: string;
  countryCode: string;
  driverId: string;
  privacyConsent: boolean;
  observationType: DriverZoneObservation['observationType'];
  description: string;
  dayOfWeek?: number;
  timeWindow?: string;
  existingObservations: DriverZoneObservation[];
  isDemo: boolean;
}): { ok: boolean; error?: string; observation?: DriverZoneObservation } {
  if (!params.privacyConsent) {
    return {
      ok: false,
      error: 'É necessário aceitar a partilha agregada sem dados pessoais identificáveis do motorista.',
    };
  }
  if (params.zoneName.trim().length < 2 || params.description.trim().length < 6) {
    return {
      ok: false,
      error: 'Indique a zona e uma observação operacional clara (mínimo 6 caracteres).',
    };
  }

  const sameZoneCount = params.existingObservations.filter(
    (o) => o.zoneName.trim().toLowerCase() === params.zoneName.trim().toLowerCase()
  ).length;

  const tier: ZoneConfidenceTier =
    sameZoneCount >= 2
      ? '2 · Dificuldade recorrente (motoristas)'
      : '3 · Ocorrência temporária não confirmada';

  return {
    ok: true,
    observation: {
      id: `obs-${Date.now()}`,
      zoneId: params.zoneId,
      zoneName: params.zoneName.trim(),
      city: params.city,
      countryCode: params.countryCode,
      driverId: params.driverId,
      driverAlias: 'Motorista Verificado (Anónimo)',
      privacyConsent: true,
      observationType: params.observationType,
      description: params.description.trim(),
      dayOfWeek: params.dayOfWeek,
      timeWindow: params.timeWindow,
      createdAtIso: new Date().toISOString(),
      recurrenceCount: sameZoneCount + 1,
      validationTier: tier,
      isDemo: params.isDemo,
    },
  };
}

export interface ZoneDemandTrendSummary {
  zoneId: string;
  zoneName: string;
  city: string;
  completedTripsCount: number;
  avgNetEur: number;
  avgEurPerHour: number;
  peakHourWindow: string;
  peakDayOfWeekLabel: string;
  positioningScore: number;
  positioningRecommendation: string;
  epistemicTag: import('../models/types').EpistemicTag;
  hasSufficientHistory: boolean;
}

const DOW_LABELS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

/**
 * Calcula inteligência de procura por zona, horário e dia da semana a partir das viagens registadas.
 * Regra obrigatória (§7): separa rigorosamente histórico/demonstração de tempo real, nunca afirmando
 * procura em tempo real quando não existe feed externo ativo.
 */
export function computeZoneDemandIntelligence(params: {
  zones: MapZoneRecord[];
  trips: import('../models/types').TripRecord[];
  isDemoScope: boolean;
}): ZoneDemandTrendSummary[] {
  const completed = params.trips.filter((t) => t.status === 'Concluída' || t.status === 'Ajustada');

  return params.zones
    .map((zone) => {
      const zoneKeyword = zone.name.split('/')[0].trim().toLowerCase();
      const matchingTrips = completed.filter(
        (t) =>
          t.pickupZone.toLowerCase().includes(zoneKeyword) ||
          zone.name.toLowerCase().includes(t.pickupZone.toLowerCase())
      );

      const count = matchingTrips.length;
      const totalNet = matchingTrips.reduce((s, t) => s + t.netEur, 0);
      const totalRev = matchingTrips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0);
      const totalHours = matchingTrips.reduce((s, t) => s + t.durationMin, 0) / 60;
      const avgNetEur = count > 0 ? Math.round((totalNet / count) * 100) / 100 : 0;
      const avgEurPerHour = totalHours > 0 ? Math.round((totalRev / totalHours) * 100) / 100 : 0;

      const hourBuckets = new Map<number, number>();
      const dowBuckets = new Map<number, number>();
      for (const t of matchingTrips) {
        const hh = Number(t.time.split(':')[0] ?? 12);
        if (Number.isFinite(hh)) hourBuckets.set(hh, (hourBuckets.get(hh) ?? 0) + 1);
        const dt = new Date(`${t.date}T12:00:00Z`);
        if (Number.isFinite(dt.getTime())) {
          const dow = dt.getUTCDay();
          dowBuckets.set(dow, (dowBuckets.get(dow) ?? 0) + 1);
        }
      }

      let bestHour = -1;
      let bestHourCount = 0;
      for (const [hh, c] of hourBuckets.entries()) {
        if (c > bestHourCount) {
          bestHour = hh;
          bestHourCount = c;
        }
      }

      let bestDow = -1;
      let bestDowCount = 0;
      for (const [d, c] of dowBuckets.entries()) {
        if (c > bestDowCount) {
          bestDow = d;
          bestDowCount = c;
        }
      }

      const peakHourWindow =
        bestHour >= 0
          ? `${String(bestHour).padStart(2, '0')}:00–${String((bestHour + 2) % 24).padStart(2, '0')}:00`
          : 'Amostra insuficiente';
      const peakDayOfWeekLabel = bestDow >= 0 ? DOW_LABELS[bestDow] : 'Sem padrão confirmado';

      const baseDemandBonus =
        zone.historicalDemand === 'Alta' ? 28 : zone.historicalDemand === 'Média' ? 16 : 6;
      const prefMod = zone.preference === 'Favorita' ? 12 : zone.preference === 'Evitar' ? -30 : 0;
      const positioningScore = Math.max(
        5,
        Math.min(98, Math.round(baseDemandBonus + Math.min(45, avgEurPerHour * 1.6) + Math.min(18, count * 4) + prefMod))
      );

      const epistemicTag: import('../models/types').EpistemicTag = params.isDemoScope
        ? 'Dados de demonstração'
        : count >= 2
          ? 'Informação histórica'
          : 'Estimativa';

      const positioningRecommendation =
        zone.preference === 'Evitar'
          ? 'Evitar posicionamento preventivo (zona marcada a evitar ou com restrições recorrentes).'
          : count >= 2
            ? `Padrão histórico registado (${count} viagens · €${avgEurPerHour.toFixed(2)}/h · pico ${peakHourWindow}). Sem feed de procura em tempo real.`
            : `Referência estrutural (${zone.historicalDemand.toLowerCase()}) — registe mais viagens para calibrar tendência horária real.`;

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        city: zone.city,
        completedTripsCount: count,
        avgNetEur,
        avgEurPerHour,
        peakHourWindow,
        peakDayOfWeekLabel,
        positioningScore,
        positioningRecommendation,
        epistemicTag,
        hasSufficientHistory: count >= 2,
      };
    })
    .sort((a, b) => b.positioningScore - a.positioningScore);
}

export function createZoneRelocationLog(params: {
  zoneId?: string;
  fromZone: string;
  targetZone: string;
  suggestedReason: string;
  epistemicBasis: import('../models/types').EpistemicTag;
  destinationNotes?: string;
  isDemo: boolean;
  nowIso?: string;
}): import('../models/types').ZoneRelocationLog {
  return {
    id: `reloc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    zoneId: params.zoneId,
    fromZone: params.fromZone,
    targetZone: params.targetZone,
    suggestedReason: params.suggestedReason,
    epistemicBasis: params.epistemicBasis,
    startedAtIso: params.nowIso ?? new Date().toISOString(),
    outcome: 'Em deslocação',
    destinationNotes: params.destinationNotes?.trim() || undefined,
    isDemo: params.isDemo,
  };
}

