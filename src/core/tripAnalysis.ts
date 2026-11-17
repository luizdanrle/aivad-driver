import type {
  TripFareAdjustmentRecord,
  TripPostAcceptanceActual,
  TripPreAcceptanceEstimate,
  TripRecord,
} from '../models/types';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface WazeNavigationLaunchPlan {
  provider: 'Waze' | 'Google Maps';
  url: string;
  capabilityStatus: 'Abertura externa autorizada (sem leitura automática de telemetria interna)';
  honestyNote: string;
}

export function buildWazeNavigationLaunch(
  address: string,
  provider: 'Waze' | 'Google Maps' = 'Waze'
): WazeNavigationLaunchPlan {
  const clean = address.trim() || 'Lisboa';
  const url =
    provider === 'Waze'
      ? `https://waze.com/ul?q=${encodeURIComponent(clean)}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clean)}`;

  return {
    provider,
    url,
    capabilityStatus: 'Abertura externa autorizada (sem leitura automática de telemetria interna)',
    honestyNote:
      'Abrir a navegação envia o destino de forma autorizada. Sem bridge nativo autorizado, o AIVAD não lê automaticamente o tempo interno do Waze/Maps — registe o ETA com trânsito e os tempos efetivos para comparar com a estimativa.',
  };
}

export interface TripAdjustmentSummary {
  initialPresentedGrossEur: number;
  confirmedAdjustmentsTotalEur: number;
  pendingAdjustmentsTotalEur: number;
  rejectedAdjustmentsTotalEur: number;
  confirmedPositiveEur: number;
  confirmedNegativeEur: number;
  confirmedFinalGrossEur: number;
  hasConfirmedAdjustment: boolean;
  hasPendingAdjustment: boolean;
}

export function summarizeTripAdjustments(trip: Pick<
  TripRecord,
  'grossEur' | 'estimatedGrossEur' | 'initialPresentedGrossEur' | 'confirmedFinalGrossEur' | 'fareAdjustments'
>): TripAdjustmentSummary {
  const initialPresentedGrossEur = round2(
    trip.initialPresentedGrossEur ?? trip.estimatedGrossEur ?? trip.grossEur
  );
  const adjustments: TripFareAdjustmentRecord[] = trip.fareAdjustments ?? [];

  const confirmedList = adjustments.filter((a) => a.status === 'Confirmado pela plataforma');
  const pendingList = adjustments.filter((a) => a.status === 'Pendente de confirmação');
  const rejectedList = adjustments.filter((a) => a.status === 'Rejeitado');

  const confirmedAdjustmentsTotalEur = round2(
    confirmedList.reduce((acc, a) => acc + a.amountEur, 0)
  );
  const pendingAdjustmentsTotalEur = round2(
    pendingList.reduce((acc, a) => acc + a.amountEur, 0)
  );
  const rejectedAdjustmentsTotalEur = round2(
    rejectedList.reduce((acc, a) => acc + a.amountEur, 0)
  );

  const confirmedPositiveEur = round2(
    confirmedList.filter((a) => a.amountEur > 0).reduce((acc, a) => acc + a.amountEur, 0)
  );
  const confirmedNegativeEur = round2(
    confirmedList.filter((a) => a.amountEur < 0).reduce((acc, a) => acc + a.amountEur, 0)
  );

  const confirmedFinalGrossEur =
    trip.confirmedFinalGrossEur !== undefined && trip.confirmedFinalGrossEur !== null
      ? round2(trip.confirmedFinalGrossEur)
      : round2(trip.grossEur + confirmedAdjustmentsTotalEur);

  return {
    initialPresentedGrossEur,
    confirmedAdjustmentsTotalEur,
    pendingAdjustmentsTotalEur,
    rejectedAdjustmentsTotalEur,
    confirmedPositiveEur,
    confirmedNegativeEur,
    confirmedFinalGrossEur,
    hasConfirmedAdjustment: confirmedList.length > 0,
    hasPendingAdjustment: pendingList.length > 0,
  };
}

export interface TripEstimateVsActualComparison {
  estimate: TripPreAcceptanceEstimate;
  actual: TripPostAcceptanceActual;
  hasActualDistance: boolean;
  hasActualTime: boolean;
  trafficEstTimeMin: number | null;
  timeDeltaMin: number | null;
  timeDeltaPct: number | null;
  trafficTimeDeltaMin: number | null;
  distanceDeltaKm: number | null;
  actualNetEur: number;
  actualEurPerHour: number | null;
  actualEurPerKm: number | null;
  eurPerHourDelta: number | null;
  eurPerKmDelta: number | null;
  delayImpactSummary: string;
}

export function computeTripEstimateVsActualComparison(trip: TripRecord): TripEstimateVsActualComparison {
  const estPickupKm = trip.preAcceptanceEstimate?.pickupDistanceKm ?? trip.pickupDistanceKm;
  const estTripKm = trip.preAcceptanceEstimate?.tripDistanceKm ?? trip.tripDistanceKm;
  const estTotalKm = round2(trip.preAcceptanceEstimate?.totalDistanceKm ?? estPickupKm + estTripKm);

  const estPickupMin =
    trip.preAcceptanceEstimate?.pickupTimeMin ?? Math.max(1, Math.round(trip.durationMin * 0.22));
  const estTripMin =
    trip.preAcceptanceEstimate?.tripTimeMin ?? Math.max(1, trip.durationMin - estPickupMin);
  const estTotalMin =
    trip.preAcceptanceEstimate?.totalTimeMin ??
    trip.preDecisionSnapshot?.predictedDurationMin ??
    trip.durationMin;

  const estGross = round2(
    trip.preAcceptanceEstimate?.grossEur ?? trip.estimatedGrossEur ?? trip.initialPresentedGrossEur ?? trip.grossEur
  );
  const estNet = round2(
    trip.preAcceptanceEstimate?.estimatedNetEur ??
      trip.preDecisionSnapshot?.predictedNetEur ??
      trip.netEur
  );
  const estEurPerKm = estTotalKm > 0 ? round2(estNet / estTotalKm) : 0;
  const estEurPerHour = estTotalMin > 0 ? round2((estNet / estTotalMin) * 60) : 0;

  const estimate: TripPreAcceptanceEstimate = {
    pickupDistanceKm: estPickupKm,
    pickupTimeMin: estPickupMin,
    tripDistanceKm: estTripKm,
    tripTimeMin: estTripMin,
    totalDistanceKm: estTotalKm,
    totalTimeMin: estTotalMin,
    grossEur: estGross,
    estimatedNetEur: estNet,
    eurPerKm: estEurPerKm,
    eurPerHour: estEurPerHour,
  };

  // Only expose actuals when genuinely observed (never pass estimates off as actuals)
  const rawActual = trip.postAcceptanceActual;
  const hasExplicitActuals = Boolean(rawActual?.hasObservedActuals);

  const actPickupKm = hasExplicitActuals ? rawActual?.pickupDistanceKm ?? null : null;
  const actTripKm = hasExplicitActuals ? rawActual?.tripDistanceKm ?? null : null;
  const actTotalKm = hasExplicitActuals
    ? rawActual?.totalDistanceKm ??
      (actPickupKm !== null && actTripKm !== null ? round2(actPickupKm + actTripKm) : null)
    : null;

  const actPickupMin = hasExplicitActuals ? rawActual?.pickupTimeMin ?? null : null;
  const actTripMin = hasExplicitActuals ? rawActual?.tripTimeMin ?? null : null;
  const actTotalMin = hasExplicitActuals
    ? rawActual?.totalTimeMin ??
      (actPickupMin !== null && actTripMin !== null ? Math.round(actPickupMin + actTripMin) : null)
    : null;

  const trafficEstTimeMin = rawActual?.navigationTrafficTimeMin ?? null;

  const actual: TripPostAcceptanceActual = {
    hasObservedActuals: hasExplicitActuals,
    pickupDistanceKm: actPickupKm,
    tripDistanceKm: actTripKm,
    totalDistanceKm: actTotalKm,
    pickupTimeMin: actPickupMin,
    tripTimeMin: actTripMin,
    totalTimeMin: actTotalMin,
    navigationTrafficTimeMin: trafficEstTimeMin,
    navigationAppUsed: rawActual?.navigationAppUsed ?? 'Nenhum',
    navigationStartedAtIso: rawActual?.navigationStartedAtIso,
    observationSource: rawActual?.observationSource ?? 'Sem dados reais observados',
  };

  const adjSummary = summarizeTripAdjustments(trip);
  // Confirmed net includes only confirmed base/adjustments — never pending delay expectations
  const confirmedExtra = adjSummary.confirmedAdjustmentsTotalEur;
  const actualNetEur = round2(trip.netEur + confirmedExtra);

  const hasActualTime = hasExplicitActuals && actTotalMin !== null && actTotalMin > 0;
  const hasActualDistance = hasExplicitActuals && actTotalKm !== null && actTotalKm > 0;

  const timeDeltaMin = hasActualTime ? Math.round(actTotalMin! - estTotalMin) : null;
  const timeDeltaPct =
    hasActualTime && estTotalMin > 0
      ? Math.round(((actTotalMin! - estTotalMin) / estTotalMin) * 100)
      : null;

  const trafficTimeDeltaMin =
    trafficEstTimeMin !== null ? Math.round(trafficEstTimeMin - estTotalMin) : null;

  const distanceDeltaKm = hasActualDistance ? round2(actTotalKm! - estTotalKm) : null;

  const actualEurPerHour = hasActualTime ? round2((actualNetEur / actTotalMin!) * 60) : null;
  const actualEurPerKm = hasActualDistance ? round2(actualNetEur / actTotalKm!) : null;

  const eurPerHourDelta =
    actualEurPerHour !== null ? round2(actualEurPerHour - estEurPerHour) : null;
  const eurPerKmDelta =
    actualEurPerKm !== null ? round2(actualEurPerKm - estEurPerKm) : null;

  let delayImpactSummary =
    'Sem percurso efetivo observado registado — comparação aguarda dados reais da viagem ou navegação.';
  if (hasActualTime && timeDeltaMin !== null && actualEurPerHour !== null) {
    if (timeDeltaMin > 0) {
      delayImpactSummary = `Atraso de +${timeDeltaMin} min face à estimativa (${estTotalMin}m -> ${actTotalMin}m): rendimento horário efetivo baixou para €${actualEurPerHour.toFixed(2)}/h (${eurPerHourDelta! >= 0 ? '+' : ''}€${eurPerHourDelta!.toFixed(2)}/h). O AIVAD não presume compensação automática pelo atraso.`;
    } else if (timeDeltaMin < 0) {
      delayImpactSummary = `Percurso ${Math.abs(timeDeltaMin)} min mais rápido do que o estimado (${estTotalMin}m -> ${actTotalMin}m): rendimento horário efetivo subiu para €${actualEurPerHour.toFixed(2)}/h.`;
    } else {
      delayImpactSummary = `Duração efetiva coincidiu exatamente com a estimativa inicial (${actTotalMin} min).`;
    }
  } else if (trafficEstTimeMin !== null && trafficTimeDeltaMin !== null) {
    const trafficPerHour = round2((estNet / Math.max(1, trafficEstTimeMin)) * 60);
    delayImpactSummary = `ETA com trânsito na navegação (${trafficEstTimeMin} min vs ${estTotalMin} min da plataforma) projeta €${trafficPerHour.toFixed(2)}/h sem assumir ajuste tarifário.`;
  }

  return {
    estimate,
    actual,
    hasActualDistance,
    hasActualTime,
    trafficEstTimeMin,
    timeDeltaMin,
    timeDeltaPct,
    trafficTimeDeltaMin,
    distanceDeltaKm,
    actualNetEur,
    actualEurPerHour,
    actualEurPerKm,
    eurPerHourDelta,
    eurPerKmDelta,
    delayImpactSummary,
  };
}
