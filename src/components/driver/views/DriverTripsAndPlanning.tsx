import React, { useMemo, useState } from 'react';
import {
  Award,
  CalendarClock,
  CheckCircle2,
  Compass,
  ExternalLink,
  History,
  Layers,
  Plus,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { calculateSmartPlan, round2 } from '../../../core/intelligence';
import {
  formatDistance,
  formatHistoricalMoney,
  formatMoney,
} from '../../../core/localization';
import type { CaptureSource, TripRecord } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import { HorizontalBreakdownBars, PlatformBadge } from '../../ui/ChartsAndVisuals';
import {
  Card,
  ContextualHelpBanner,
  MetricCard,
  SegmentedFilter,
  StatusLabel,
} from '../../ui/DesignSystem';

export const DriverTripsAndPlanning: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    activeVehicle,
    activeMarket,
    visibleDriverPlatforms,
    completeTrip,
    addCampaign,
    addShift,
    updateShiftNotes,
    setDriverNav,
  } = useEcosystem();

  const unitSystem = state.localization.unitSystem;
  const currency = activeMarket.currency;
  const symbol = activeMarket.currencySymbol;

  const [tripFilterPlatform, setTripFilterPlatform] = useState('ALL');
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(state.trips[0] ?? null);
  const [selectedConsolidatedPlatId, setSelectedConsolidatedPlatId] = useState<string | null>(null);

  const [newTripForm, setNewTripForm] = useState({
    externalRef: `UB-${String(Date.now()).slice(-5)}`,
    platformId: visibleDriverPlatforms[0]?.id ?? 'uber',
    grossEur: 15.5,
    tipEur: 1.0,
    bonusEur: 0,
    tollsEur: 0,
    pickupDistanceKm: 1.5,
    tripDistanceKm: 10.5,
    durationMin: 22,
    pickupZone: state.localization.currentLocation.city || 'Centro',
    destinationZone: 'Aeroporto / Zona Central',
    category: 'Standard',
  });

  // Shift Calendar & Form
  const [calendarView, setCalendarView] = useState<'diario' | 'semanal' | 'mensal'>('semanal');
  const [shiftForm, setShiftForm] = useState({
    date: '2026-11-14',
    startTime: '14:00',
    endTime: '20:00',
    breakMinutes: 20,
    mealMinutes: 30,
    restMinutes: 10,
    onlineMinutes: 300,
    productiveMinutes: 220,
    waitMinutes: 80,
    totalKm: 128,
    passengerKm: 104,
    notes: 'Turno tarde operação local',
  });
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');

  // Smart Planner State
  const [plannerInput, setPlannerInput] = useState({
    targetNetEur: 750,
    availableDays: 5,
    hoursPerDay: 8.5,
    breakMinutesPerDay: 45,
    needsChargingStops: activeVehicle.fuelType === 'Elétrico',
  });

  const earnedSoFar = useMemo(
    () => state.trips.reduce((s, t) => s + t.netEur, 0),
    [state.trips]
  );

  const historicalAvgRate = useMemo(() => {
    const totalRev = state.trips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0);
    const totalHours = Math.max(1, state.trips.reduce((s, t) => s + t.durationMin, 0) / 60);
    return totalRev / totalHours;
  }, [state.trips]);

  const planResult = useMemo(
    () =>
      calculateSmartPlan({
        ...plannerInput,
        vehicle: activeVehicle,
        historicalAvgGrossPerHour: historicalAvgRate,
        currentEarnedNetEur: earnedSoFar,
      }),
    [plannerInput, activeVehicle, historicalAvgRate, earnedSoFar]
  );

  // Campaign Add Form
  const [campForm, setCampForm] = useState({
    platformId: visibleDriverPlatforms[0]?.id ?? 'uber',
    name: 'Campanha Fim de Semana Extra',
    rewardEur: 35,
    targetTrips: 20,
    zone: state.localization.currentLocation.city || 'Área Metropolitana',
    scheduleWindow: '18:00 - 23:00',
    requirements: 'Taxa de aceitação >= 75%',
    estimatedExtraCostEur: 7.5,
  });

  const multiPlatformSummary = useMemo(() => {
    return state.platforms.map((plat) => {
      const platTrips = state.trips.filter((t) => t.platformId === plat.id);
      const gross = round2(platTrips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0));
      const commissions = round2(platTrips.reduce((s, t) => s + t.commissionEur, 0));
      const net = round2(platTrips.reduce((s, t) => s + t.netEur, 0));
      const km = round2(platTrips.reduce((s, t) => s + t.pickupDistanceKm + t.tripDistanceKm, 0));
      const minutes = platTrips.reduce((s, t) => s + t.durationMin, 0);
      return {
        platform: plat,
        tripsCount: platTrips.length,
        gross,
        commissions,
        net,
        km,
        hours: round2(minutes / 60),
      };
    });
  }, [state.platforms, state.trips]);

  // ==========================================================
  // CONSOLIDADO MULTI-APP (Plataformas Independentes)
  // ==========================================================
  if (activeTab === 'consolidado-plataformas') {
    const activeEntries = multiPlatformSummary.filter((x) => x.platform.status === 'Ativa');
    const totalMultiGross = round2(multiPlatformSummary.reduce((s, x) => s + x.gross, 0));
    const totalMultiNet = round2(multiPlatformSummary.reduce((s, x) => s + x.net, 0));
    const totalMultiComm = round2(multiPlatformSummary.reduce((s, x) => s + x.commissions, 0));
    const totalMultiTrips = multiPlatformSummary.reduce((s, x) => s + x.tripsCount, 0);

    const barItems = multiPlatformSummary
      .filter((x) => x.tripsCount > 0 || x.platform.status === 'Ativa')
      .map((x) => ({
        id: x.platform.id,
        label: x.platform.name,
        sublabel: `${x.tripsCount} viagens · ${x.platform.commissionPct}% comissão`,
        value: x.net > 0 ? x.net : 0.1,
        formattedValue: formatMoney(x.net, currency),
        color: x.platform.brandColor ?? '#1D4ED8',
      }));

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Consolidado Multi-Plataforma Independente"
          description="Reúne ganhos, comissões, tempos e elegibilidade de Uber, Bolt, POP, VLOZ, Frenalty, Cabify, FREE NOW e parceiros adicionados pela administração — sem misturar regras exclusivas como Uber Pro ou Bolt Score."
          demoNotice="Estado de ligações automáticas às apps externas: INTEGRAÇÃO A VALIDAR (sem armazenamento de credenciais externas)."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Receita Consolidada Multi-App"
            value={formatMoney(totalMultiGross, currency)}
            subtext={`${totalMultiTrips} viagens agregadas`}
            explanation="Soma bruta de todas as plataformas registadas no ecossistema."
            formula="Σ (Bruto + Gorjetas + Bónus)"
            accent="blue"
          />
          <MetricCard
            label="Comissões Retidas"
            value={formatMoney(totalMultiComm, currency)}
            subtext="Conforme taxa real de cada plataforma"
            explanation="Total deduzido pelas diferentes plataformas."
            formula="Σ (Bruto × % Comissão)"
            accent="red"
          />
          <MetricCard
            label="Líquido Operacional Agregado"
            value={formatMoney(totalMultiNet, currency)}
            subtext="Após comissões e custo/km do veículo"
            explanation="Rendimento líquido operacional consolidado."
            formula="Receita - Comissões - Custo/Km"
          />
          <MetricCard
            label="Plataformas Ativas no Mercado"
            value={`${activeEntries.length} / ${state.platforms.length}`}
            subtext={`Mercado: ${activeMarket.name} (${activeMarket.code})`}
            explanation="Total de plataformas ativas configuradas para operação atual."
            formula="Contagem com estado = Ativa"
          />
        </div>

        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Comparação de Rendimento Líquido por Plataforma
              </h2>
              <p className="text-xs text-slate-500">
                Clique numa barra para destacar os requisitos e detalhes operacionais da plataforma.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDriverNav('desempenho-uber')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 font-medium"
              >
                <span>Módulo Uber Pro</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setDriverNav('desempenho-bolt')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 font-medium"
              >
                <span>Módulo Bolt Score</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          <HorizontalBreakdownBars
            items={barItems}
            selectedId={selectedConsolidatedPlatId}
            onSelect={(id) =>
              setSelectedConsolidatedPlatId((prev) => (prev === id ? null : id))
            }
          />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {multiPlatformSummary.map(({ platform, tripsCount, gross, net, km, hours }) => {
            const highlighted = selectedConsolidatedPlatId === platform.id;
            const availableInMarket = platform.countryScope.includes(activeMarket.code);
            return (
              <Card
                key={platform.id}
                className={`p-5 space-y-3 transition-all ${
                  highlighted ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlatformBadge
                      name={platform.name}
                      shortCode={platform.shortCode}
                      brandColor={platform.brandColor}
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate">{platform.name}</h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        Comissão {platform.commissionPct}% · {platform.countryScope.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusLabel
                      tone={platform.status === 'Ativa' ? 'success' : 'neutral'}
                      text={platform.status}
                    />
                    <span className="text-[10px] font-mono-tabular text-amber-700 dark:text-amber-400">
                      {platform.integrationLabel}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs font-mono-tabular">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Viagens</span>
                    <span className="font-bold">{tripsCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Bruto</span>
                    <span className="font-bold">{formatMoney(gross, currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Líquido</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">
                      {formatMoney(net, currency)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                  <p>
                    <strong>Categorias:</strong> {platform.categories.join(' · ')}
                  </p>
                  {platform.citiesScope && platform.citiesScope.length > 0 && (
                    <p>
                      <strong>Cidades configuradas:</strong> {platform.citiesScope.join(', ')}
                    </p>
                  )}
                  {platform.requirements && platform.requirements.length > 0 && (
                    <p>
                      <strong>Requisitos:</strong> {platform.requirements.join(' · ')}
                    </p>
                  )}
                  {platform.benefits && platform.benefits.length > 0 && (
                    <p>
                      <strong>Benefícios:</strong> {platform.benefits.join(' · ')}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    {availableInMarket ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ativa em {activeMarket.code}</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>Fora de {activeMarket.code} ({formatDistance(km, unitSystem)} / {hours}h)</span>
                      </>
                    )}
                  </span>
                  {(platform.id === 'uber' || platform.id === 'bolt') && (
                    <button
                      type="button"
                      onClick={() =>
                        setDriverNav(
                          platform.id === 'uber' ? 'desempenho-uber' : 'desempenho-bolt'
                        )
                      }
                      className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      Ver Regras Isoladas →
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================================
  // HISTÓRICO DE VIAGENS (Preserva moeda original!)
  // ==========================================================
  if (activeTab === 'historico-viagens') {
    const filtered = state.trips.filter(
      (t) => tripFilterPlatform === 'ALL' || t.platformId === tripFilterPlatform
    );

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Histórico Completo de Viagens (Com Preservação de Moeda Original)"
          description="Preserva todo o histórico na moeda em que cada viagem foi registada (ex: viagens em EUR não mudam para BRL se viajar para o Brasil) e mesmo se uma plataforma for desativada."
        />

        {/* Quick Register Trip */}
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Registar Viagem Concluída em {activeMarket.name} ({currency})
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const created = completeTrip({
                ...newTripForm,
                vehicleId: activeVehicle.id,
                date: '2026-11-14',
                time: new Date().toTimeString().slice(0, 5),
                currency,
                originalGrossAmount: newTripForm.grossEur,
                countryCode: activeMarket.code,
                status: 'Concluída',
                source: 'Manual' as CaptureSource,
                isDemo: true,
              });
              setSelectedTrip(created);
              setNewTripForm((f) => ({
                ...f,
                externalRef: `${f.platformId.toUpperCase().slice(0, 2)}-${String(Date.now()).slice(-5)}`,
              }));
            }}
            className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs"
          >
            <div>
              <label htmlFor="nt-plat" className="block mb-1 font-medium">Plataforma</label>
              <select
                id="nt-plat"
                value={newTripForm.platformId}
                onChange={(e) => setNewTripForm((f) => ({ ...f, platformId: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {visibleDriverPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nt-gross" className="block mb-1 font-medium">Bruto ({symbol})</label>
              <input
                id="nt-gross"
                type="number"
                step="0.1"
                value={newTripForm.grossEur}
                onChange={(e) => setNewTripForm((f) => ({ ...f, grossEur: Number(e.target.value) }))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="nt-km" className="block mb-1 font-medium">Viagem (km)</label>
              <input
                id="nt-km"
                type="number"
                step="0.1"
                value={newTripForm.tripDistanceKm}
                onChange={(e) => setNewTripForm((f) => ({ ...f, tripDistanceKm: Number(e.target.value) }))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="nt-min" className="block mb-1 font-medium">Duração (min)</label>
              <input
                id="nt-min"
                type="number"
                value={newTripForm.durationMin}
                onChange={(e) => setNewTripForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="nt-zone" className="block mb-1 font-medium">Recolha</label>
              <input
                id="nt-zone"
                type="text"
                value={newTripForm.pickupZone}
                onChange={(e) => setNewTripForm((f) => ({ ...f, pickupZone: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 px-3 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                Concluir Viagem
              </button>
            </div>
          </form>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 overflow-x-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Viagens ({filtered.length})
              </h3>
              <select
                aria-label="Filtrar viagens por plataforma"
                value={tripFilterPlatform}
                onChange={(e) => setTripFilterPlatform(e.target.value)}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              >
                <option value="ALL">Todas (inclui histórico)</option>
                {state.platforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Ref</th>
                  <th className="p-3">Data/Hora</th>
                  <th className="p-3">Plataforma</th>
                  <th className="p-3">Bruto</th>
                  <th className="p-3">Gorjeta</th>
                  <th className="p-3">Líquido</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map((t) => {
                  const platObj = state.platforms.find((p) => p.id === t.platformId);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrip(t)}
                      className={`cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 ${
                        selectedTrip?.id === t.id ? 'bg-blue-50 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      <td className="p-3 font-mono-tabular font-semibold">{t.externalRef}</td>
                      <td className="p-3 font-mono-tabular">{t.date} {t.time}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5">
                          <PlatformBadge
                            name={platObj?.name ?? t.platformId}
                            shortCode={platObj?.shortCode}
                            brandColor={platObj?.brandColor}
                            size="sm"
                          />
                          <span>{platObj?.name ?? t.platformId.toUpperCase()} · {t.category}</span>
                        </span>
                      </td>
                      <td className="p-3 font-mono-tabular">
                        {formatHistoricalMoney(
                          t.grossEur,
                          t.originalGrossAmount ?? t.grossEur,
                          t.currency ?? 'EUR',
                          currency
                        )}
                      </td>
                      <td className="p-3 font-mono-tabular">
                        {formatMoney(t.tipEur, t.currency ?? 'EUR')}
                      </td>
                      <td className="p-3 font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                        {formatHistoricalMoney(
                          t.netEur,
                          t.originalNetAmount ?? t.netEur,
                          t.currency ?? 'EUR',
                          currency
                        )}
                      </td>
                      <td className="p-3">
                        <StatusLabel tone={t.status === 'Cancelada' ? 'danger' : 'success'} text={t.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card className="lg:col-span-4 p-5 space-y-3">
            <h3 className="text-sm font-bold">Detalhe Individual da Viagem</h3>
            {selectedTrip ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Identificador</span>
                  <span className="font-mono-tabular font-semibold">{selectedTrip.externalRef}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Mercado / Moeda Original</span>
                  <span className="font-mono-tabular">
                    {selectedTrip.countryCode ?? 'PT'} · {selectedTrip.currency ?? 'EUR'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Origem → Destino</span>
                  <span className="text-right">{selectedTrip.pickupZone} → {selectedTrip.destinationZone ?? 'N/D'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Distância (Recolha + Viagem)</span>
                  <span className="font-mono-tabular">
                    {formatDistance(selectedTrip.pickupDistanceKm, unitSystem)} + {formatDistance(selectedTrip.tripDistanceKm, unitSystem)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Duração</span>
                  <span className="font-mono-tabular">{selectedTrip.durationMin} min</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Bruto / Gorjeta / Bónus</span>
                  <span className="font-mono-tabular">
                    {formatMoney(selectedTrip.grossEur, selectedTrip.currency ?? 'EUR')} /{' '}
                    {formatMoney(selectedTrip.tipEur, selectedTrip.currency ?? 'EUR')} /{' '}
                    {formatMoney(selectedTrip.bonusEur, selectedTrip.currency ?? 'EUR')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Comissão / Custos / Portagens</span>
                  <span className="font-mono-tabular">
                    {formatMoney(selectedTrip.commissionEur, selectedTrip.currency ?? 'EUR')} /{' '}
                    {formatMoney(selectedTrip.operationalCostEur, selectedTrip.currency ?? 'EUR')} /{' '}
                    {formatMoney(selectedTrip.tollsEur, selectedTrip.currency ?? 'EUR')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Fonte dos Dados</span>
                  <span>{selectedTrip.source}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-bold text-blue-700 dark:text-blue-400">
                  <span>Líquido Estimado (Moeda Original)</span>
                  <span className="font-mono-tabular">
                    {formatHistoricalMoney(
                      selectedTrip.netEur,
                      selectedTrip.originalNetAmount ?? selectedTrip.netEur,
                      selectedTrip.currency ?? 'EUR',
                      currency
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Selecione uma viagem na tabela.</p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === 'campanhas') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Central de Campanhas & Rentabilidade Incremental"
          description="Calcula o custo adicional estimado e o ganho líquido incremental de cada missão antes de se comprometer. Ligado ao Planeador e Financeiro."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.campaigns.map((c) => {
            const pct = Math.min(100, Math.round((c.completedTrips / c.targetTrips) * 100));
            const remainingTrips = Math.max(0, c.targetTrips - c.completedTrips);
            const incrementalNet = c.rewardEur - c.estimatedExtraCostEur;
            const plat = state.platforms.find((p) => p.id === c.platformId);
            return (
              <Card key={c.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <PlatformBadge
                      name={plat?.name ?? c.platformId}
                      shortCode={plat?.shortCode}
                      brandColor={plat?.brandColor}
                      size="sm"
                    />
                    <div>
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                        {plat?.name ?? c.platformId.toUpperCase()} · {c.zone}
                      </span>
                      <h3 className="text-base font-bold">{c.name}</h3>
                    </div>
                  </div>
                  <StatusLabel tone={c.status === 'Ativa' ? 'success' : 'neutral'} text={c.status} />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{c.requirements}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-mono-tabular">
                    <span>Progresso: {c.completedTrips}/{c.targetTrips} viagens ({remainingTrips} em falta)</span>
                    <span className="font-bold">Recompensa: {formatMoney(c.rewardEur, currency)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block">Custo Adicional Est.</span>
                    <span className="font-mono-tabular font-semibold">{formatMoney(c.estimatedExtraCostEur, currency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Líquido Incremental</span>
                    <span className="font-mono-tabular font-bold text-emerald-700 dark:text-emerald-400">
                      {formatMoney(incrementalNet, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fonte</span>
                    <span>{c.source}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Adicionar Nova Campanha Manualmente
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!campForm.name.trim()) return;
              addCampaign({
                ...campForm,
                completedTrips: 0,
                periodStart: '2026-11-14',
                periodEnd: '2026-11-21',
                status: 'Ativa',
                source: 'Manual',
              });
            }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
          >
            <div>
              <label htmlFor="cmp-plat" className="block mb-1 font-medium">Plataforma</label>
              <select
                id="cmp-plat"
                value={campForm.platformId}
                onChange={(e) => setCampForm((f) => ({ ...f, platformId: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {visibleDriverPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cmp-name" className="block mb-1 font-medium">Nome</label>
              <input
                id="cmp-name"
                type="text"
                value={campForm.name}
                onChange={(e) => setCampForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="cmp-rew" className="block mb-1 font-medium">Prémio ({symbol})</label>
              <input
                id="cmp-rew"
                type="number"
                value={campForm.rewardEur}
                onChange={(e) => setCampForm((f) => ({ ...f, rewardEur: Number(e.target.value) }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                Registar Campanha
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  if (activeTab === 'desempenho-uber') {
    const uberTrips = state.trips.filter((t) => t.platformId === 'uber');
    const uberGross = uberTrips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0);
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Desempenho Uber & Uber Pro (Regras Independentes)"
          description="Módulo dedicado exclusivamente à estrutura Uber Pro (níveis, pontos, classificação, elogios e cancelamentos), sem misturar regras da Bolt ou de outras apps."
          demoNotice="Sincronização direta Uber: INTEGRAÇÃO A VALIDAR"
        />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Nível Uber Pro (Demo)"
            value="Platina"
            subtext="842 / 1.000 pts para Diamante"
            explanation="Progressão baseada em viagens realizadas e horários de pico conforme critérios Uber Pro."
            formula="Pontos registados ÷ Limiar do nível"
            accent="blue"
          />
          <MetricCard
            label="Classificação Média"
            value="4.94 ★"
            subtext="142 elogios · 0 ocorrências"
            explanation="Média móvel das últimas 500 viagens avaliadas."
            formula="Σ avaliações ÷ total de viagens avaliadas"
          />
          <MetricCard
            label="Taxa de Cancelamento"
            value="2.1%"
            subtext="Dentro do limite Uber Pro (≤ 4%)"
            explanation="Percentagem de viagens canceladas pelo motorista após aceitação."
            formula="Cancelamentos ÷ Viagens aceites"
          />
          <MetricCard
            label="Faturação Uber Registada"
            value={formatMoney(uberGross, currency)}
            subtext={`${uberTrips.length} viagens concluídas no histórico`}
            explanation="Receita total apurada nas viagens Uber do seu histórico."
            formula="Σ (Bruto + Gorjetas + Bónus Uber)"
          />
        </div>
        <Card className="p-5 space-y-2 text-xs">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Benefícios e Recomendações Uber Pro
          </h3>
          <p className="text-slate-600 dark:text-slate-300">
            • Mantenha cancelamentos abaixo de 4% para preservar a visualização prévia de direção e duração (quando disponível na região).
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            • Faltam 158 pontos até ao nível Diamante. Os horários entre 17h e 21h atribuem pontuação multiplicada conforme regras oficiais Uber.
          </p>
        </Card>
      </div>
    );
  }

  if (activeTab === 'desempenho-bolt') {
    const boltTrips = state.trips.filter((t) => t.platformId === 'bolt');
    const boltGross = boltTrips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0);
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Desempenho Bolt (Módulo Isolado)"
          description="Monitoriza pontuação de atividade, viagens agendadas, categorias Comfort/Green e campanhas Bolt de forma independente."
          demoNotice="Sincronização direta Bolt: INTEGRAÇÃO A VALIDAR"
        />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Driver Score Bolt (Demo)"
            value="93%"
            subtext="Elegível para viagens agendadas"
            explanation="Pontuação composta Bolt baseada em aceitação, conclusão e avaliações."
            formula="Índice interno conforme regras Bolt"
            accent="blue"
          />
          <MetricCard
            label="Viagens Bolt Concluídas"
            value={`${boltTrips.length}`}
            subtext={`${formatMoney(boltGross, currency)} acumulados`}
            explanation="Total de viagens Bolt concluídas no período registado."
            formula="Contagem de viagens Bolt concluídas"
          />
          <MetricCard
            label="Cancelamentos Bolt"
            value="1.4%"
            subtext="Abaixo do limiar de alerta (5%)"
            explanation="Proporção de cancelamentos atribuídos ao motorista."
            formula="Cancelamentos Bolt ÷ Aceites Bolt"
          />
          <MetricCard
            label="Categorias Ativas"
            value="3"
            subtext="Bolt, Bolt Green, Bolt Comfort"
            explanation="Categorias habilitadas para o veículo ativo."
            formula="Elegibilidade comercial Bolt"
          />
        </div>
      </div>
    );
  }

  if (activeTab === 'agenda-turnos') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Agenda, Turnos & Linha Temporal Auditável"
          description="Registe início, fim, pausas, refeições, descanso, tempo online, produtivo e espera. Todas as alterações mantêm trilha auditável (complementa o Tacógrafo TVDE)."
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedFilter
            value={calendarView}
            onChange={(v) => setCalendarView(v as 'diario' | 'semanal' | 'mensal')}
            options={[
              { id: 'diario', label: 'Vista Diária' },
              { id: 'semanal', label: 'Vista Semanal' },
              { id: 'mensal', label: 'Vista Mensal' },
            ]}
          />
        </div>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Registar Turno na Linha Temporal
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addShift({
                ...shiftForm,
                emptyKm: Math.max(0, shiftForm.totalKm - shiftForm.passengerKm),
                vehicleId: activeVehicle.id,
              });
            }}
            className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs"
          >
            <div>
              <label htmlFor="sh-date" className="block mb-1 font-medium">Data</label>
              <input
                id="sh-date"
                type="date"
                value={shiftForm.date}
                onChange={(e) => setShiftForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="sh-start" className="block mb-1 font-medium">Início</label>
              <input
                id="sh-start"
                type="time"
                value={shiftForm.startTime}
                onChange={(e) => setShiftForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="sh-end" className="block mb-1 font-medium">Fim</label>
              <input
                id="sh-end"
                type="time"
                value={shiftForm.endTime}
                onChange={(e) => setShiftForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="sh-km" className="block mb-1 font-medium">Km Totais</label>
              <input
                id="sh-km"
                type="number"
                value={shiftForm.totalKm}
                onChange={(e) => setShiftForm((f) => ({ ...f, totalKm: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                Guardar Turno
              </button>
            </div>
          </form>
        </Card>

        <div className="space-y-3">
          {state.shifts.map((s) => (
            <Card key={s.id} className="p-4 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold font-mono-tabular">
                  {s.date} · {s.startTime} – {s.endTime} ({calendarView})
                </span>
                <span className="font-mono-tabular text-slate-600 dark:text-slate-300">
                  Online: {s.onlineMinutes}m · Produtivo: {s.productiveMinutes}m · Espera: {s.waitMinutes}m · Pausas/Refeições: {s.breakMinutes + s.mealMinutes}m
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                <span>
                  Totais: {formatDistance(s.totalKm, unitSystem)} (Passageiro:{' '}
                  {formatDistance(s.passengerKm, unitSystem)} · Vazio:{' '}
                  {formatDistance(s.emptyKm, unitSystem)})
                </span>
                {editingShiftId === s.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        updateShiftNotes(s.id, editingNotes);
                        setEditingShiftId(null);
                      }}
                      className="px-2.5 py-1 rounded bg-blue-700 text-white font-medium"
                    >
                      Gravar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingShiftId(s.id);
                      setEditingNotes(s.notes);
                    }}
                    className="text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    Editar nota ({s.notes})
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Auditoria: {s.auditHistory[s.auditHistory.length - 1]?.change}
              </p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // PLANEADOR INTELIGENTE
  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="Planeador Inteligente com Recálculo Dinâmico"
        description="Ajuste meta líquida, dias, horas, pausas e necessidades de carregamento. O plano recalcula automaticamente com base no histórico real acumulado."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5 p-5 space-y-4 text-xs">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Parâmetros do Objetivo ({currency})
          </h2>
          <div>
            <label htmlFor="pl-target" className="block font-medium mb-1">Meta Líquida ({symbol})</label>
            <input
              id="pl-target"
              type="number"
              value={plannerInput.targetNetEur}
              onChange={(e) => setPlannerInput((p) => ({ ...p, targetNetEur: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pl-days" className="block font-medium mb-1">Dias disponíveis</label>
              <input
                id="pl-days"
                type="number"
                min={1}
                max={31}
                value={plannerInput.availableDays}
                onChange={(e) => setPlannerInput((p) => ({ ...p, availableDays: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="pl-hrs" className="block font-medium mb-1">Horas por dia</label>
              <input
                id="pl-hrs"
                type="number"
                step="0.5"
                min={1}
                max={14}
                value={plannerInput.hoursPerDay}
                onChange={(e) => setPlannerInput((p) => ({ ...p, hoursPerDay: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
          </div>
          <div>
            <label htmlFor="pl-brk" className="block font-medium mb-1">Pausas por dia (min)</label>
            <input
              id="pl-brk"
              type="number"
              value={plannerInput.breakMinutesPerDay}
              onChange={(e) => setPlannerInput((p) => ({ ...p, breakMinutesPerDay: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <label className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={plannerInput.needsChargingStops}
              onChange={(e) => setPlannerInput((p) => ({ ...p, needsChargingStops: e.target.checked }))}
            />
            <span>Incluir paragens de carregamento ({activeVehicle.brand} {activeVehicle.model})</span>
          </label>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            {planResult.disclaimer}
          </p>
        </Card>

        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Em Falta para Meta"
              value={formatMoney(planResult.remainingNetEur, currency)}
              subtext={`Já acumulado: ${formatMoney(earnedSoFar, currency)}`}
              explanation="Diferença entre a meta líquida pretendida e o valor líquido já realizado no turno/semana."
              formula="Meta Líquida - Líquido Acumulado"
              accent="blue"
            />
            <MetricCard
              label="Média Bruta Exigida"
              value={`${formatMoney(planResult.requiredGrossPerHour, currency)}/h`}
              subtext={`Em ${planResult.totalProductiveHours}h produtivas`}
              explanation="Faturação horária bruta média necessária para cobrir energia/manutenção e atingir a meta."
              formula="(Meta Restante + Custos Est.) ÷ Horas Produtivas"
            />
            <MetricCard
              label="Carregamentos & Custos"
              value={`${planResult.chargingStopsRecommended} paragens`}
              subtext={`${formatMoney(planResult.estimatedEnergyOrFuelCostEur, currency)} energia/manutenção`}
              explanation="Paragens recomendadas consoante autonomia real e consumo do veículo ativo."
              formula="Distância Estimada ÷ (75% Autonomia)"
            />
          </div>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold">
              Cenários de Previsão (Base Histórica: {formatMoney(historicalAvgRate, currency)}/h)
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {planResult.scenarios.map((sc) => (
                <div key={sc.name} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{sc.name}</p>
                    <p className="text-slate-500 font-mono-tabular">
                      Média assumida: {formatMoney(sc.grossPerHour, currency)}/h
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono-tabular font-bold">
                      {formatMoney(sc.projectedNetEur, currency)}
                    </p>
                    <StatusLabel
                      tone={sc.feasible ? 'success' : 'warning'}
                      text={sc.feasible ? 'Atinge meta' : 'Abaixo da meta'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
