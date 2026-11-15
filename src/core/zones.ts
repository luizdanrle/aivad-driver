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
