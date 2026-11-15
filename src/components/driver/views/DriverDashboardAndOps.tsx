import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calculator,
  Car,
  CheckCircle2,
  Database,
  Gauge,
  Layers,
  Play,
  Radio,
  ShieldCheck,
  Smartphone,
  Target,
} from 'lucide-react';
import { analyzeProposal, round2 } from '../../../core/intelligence';
import { formatDistance, formatDistanceRate, formatMoney } from '../../../core/localization';
import type {
  AnalysisMode,
  AutoPilotMode,
  CaptureSource,
  ProposalInput,
  ProposalLifecycleState,
  SmartCaptureRecord,
} from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import {
  GoalDonutChart,
  HorizontalBreakdownBars,
  PlatformBadge,
  TACHO_STATE_COLOR,
} from '../../ui/ChartsAndVisuals';
import {
  Card,
  ContextualHelpBanner,
  MetricCard,
  SegmentedFilter,
  StatusLabel,
} from '../../ui/DesignSystem';

export const DriverDashboardAndOps: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    activeVehicle,
    activeMarket,
    visibleDriverPlatforms,
    tachographSummary,
    setDriverNav,
    createAndAnalyzeProposal,
    updateProposalLifecycle,
    updateAutoPilotConfig,
    updateOverlayConfig,
    captureExternalEvent,
    confirmPendingCapture,
  } = useEcosystem();

  // Dashboard filters
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredTrips = useMemo(() => {
    return state.trips.filter((t) => {
      if (platformFilter !== 'ALL' && t.platformId !== platformFilter) return false;
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      if (dateFilter === 'TODAY' && t.date !== '2026-11-14') return false;
      return true;
    });
  }, [state.trips, platformFilter, categoryFilter, dateFilter]);

  const metrics = useMemo(() => {
    const gross = filteredTrips.reduce((s, t) => s + t.grossEur + t.tipEur + t.bonusEur, 0);
    const comm = filteredTrips.reduce((s, t) => s + t.commissionEur, 0);
    const opCost = filteredTrips.reduce((s, t) => s + t.operationalCostEur, 0);
    const exp = state.expenses.reduce((s, e) => s + e.amountEur, 0);
    const net = gross - comm - opCost - exp;
    const totalKm = filteredTrips.reduce((s, t) => s + t.pickupDistanceKm + t.tripDistanceKm, 0);
    const passKm = filteredTrips.reduce((s, t) => s + t.tripDistanceKm, 0);
    const emptyKm = filteredTrips.reduce((s, t) => s + t.pickupDistanceKm, 0);
    const prodMin = filteredTrips.reduce((s, t) => s + t.durationMin, 0);
    const onlineMin = tachographSummary.consolidatedOnlineMinutes || prodMin + 45;
    const waitMin = tachographSummary.waitMinutes || Math.max(0, onlineMin - prodMin);
    const hours = Math.max(0.1, prodMin / 60);
    return {
      gross,
      net,
      expensesTotal: exp + opCost + comm,
      onlineHours: onlineMin / 60,
      prodHours: hours,
      waitHours: waitMin / 60,
      totalKm,
      passKm,
      emptyKm,
      avgPerHour: gross / hours,
      avgPerKm: totalKm > 0 ? gross / totalKm : 0,
    };
  }, [filteredTrips, state.expenses, tachographSummary]);

  const platformBars = useMemo(() => {
    const map = new Map<string, { gross: number; trips: number }>();
    for (const t of filteredTrips) {
      const prev = map.get(t.platformId) ?? { gross: 0, trips: 0 };
      prev.gross = round2(prev.gross + t.grossEur + t.tipEur + t.bonusEur);
      prev.trips += 1;
      map.set(t.platformId, prev);
    }
    return Array.from(map.entries()).map(([id, val]) => {
      const plat = state.platforms.find((p) => p.id === id);
      return {
        id,
        label: plat?.name ?? id.toUpperCase(),
        sublabel: `${val.trips} viagens`,
        value: val.gross,
        formattedValue: formatMoney(val.gross, activeMarket.currency),
        color: plat?.brandColor ?? '#1D4ED8',
      };
    });
  }, [filteredTrips, state.platforms, activeMarket.currency]);

  // Offer Calculator State
  const [calcInput, setCalcInput] = useState<ProposalInput>({
    platformId: visibleDriverPlatforms[0]?.id ?? 'uber',
    category: visibleDriverPlatforms[0]?.categories[0] ?? 'UberX',
    grossValueEur: 14.5,
    pickupDistanceKm: 2.1,
    pickupTimeMin: 6,
    tripDistanceKm: 10.4,
    tripTimeMin: 18,
    stops: 0,
    tollsEur: 0,
    bonusEur: 1.5,
    region: `${state.localization.currentLocation.city} Centro`,
    notes: '',
    vehicleCostPerKmEur:
      (activeVehicle.consumptionPer100Km / 100) * activeVehicle.energyCostPerUnitEur +
      activeVehicle.maintenancePerKmEur,
    calculationBasis: 'total_distance',
    mode: 'Equilibrado',
  });
  const [calcError, setCalcError] = useState<string | null>(null);
  const [lastCreatedPropId, setLastCreatedPropId] = useState<string | null>(null);

  const liveAnalysis = useMemo(
    () => analyzeProposal(calcInput, state.autoPilot.thresholds),
    [calcInput, state.autoPilot.thresholds]
  );

  // Smart Data Capture Form
  const [capForm, setCapForm] = useState<{
    externalTxId: string;
    source: CaptureSource;
    dataType: SmartCaptureRecord['dataType'];
    platformId: string;
    amountEur: number;
    relatedTripRef: string;
    rawSummary: string;
  }>({
    externalTxId: 'UB-88439-TIP-NEW',
    source: 'Notificação Android Autorizada',
    dataType: 'Gorjeta',
    platformId: 'uber',
    amountEur: 3.5,
    relatedTripRef: 'UB-88439',
    rawSummary: 'Gorjeta pós-viagem €3.50 recebida na Uber',
  });
  const [capFeedback, setCapFeedback] = useState<{
    message: string;
    tone: 'success' | 'warning' | 'danger';
  } | null>(null);

  const [pendingMatchTripId, setPendingMatchTripId] = useState<string>(state.trips[0]?.id ?? '');

  if (activeTab === 'dashboard') {
    const expiringDocs = state.documents.filter((d) => d.status !== 'Válido');
    const activeCampaigns = state.campaigns.filter((c) => c.status === 'Ativa');
    const activeTacho = state.tachograph.sessions.find(
      (s) => s.id === state.tachograph.activeSessionId && s.status === 'Em curso'
    );
    const totalKmRatio = Math.max(0.1, metrics.passKm + metrics.emptyKm);
    const passKmPct = Math.round((metrics.passKm / totalKmRatio) * 100);
    const weeklyNetGoal = 750;

    return (
      <div className="space-y-6">
        {/* Live Commercial Cockpit Strip */}
        <Card className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-blue-900">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-600/30 border border-blue-400/40 font-semibold">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        TACHO_STATE_COLOR[activeTacho?.currentState ?? 'Fora de serviço'],
                    }}
                  />
                  {activeTacho ? 'Turno & Tacógrafo Ativos' : 'Sem Turno Ativo'}
                </span>
                <span className="text-slate-300 font-mono-tabular">
                  {state.localization.currentLocation.city},{' '}
                  {state.localization.currentLocation.countryCode}
                  {state.localization.currentLocation.countryCode !== activeMarket.code
                    ? ` · Mercado ${activeMarket.code}`
                    : ''}{' '}
                  · {activeMarket.currency} ({activeMarket.unitSystem === 'imperial' ? 'mi' : 'km'})
                </span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">
                {activeTacho?.currentState ?? 'Fora de serviço'} ·{' '}
                {formatMoney(metrics.net, activeMarket.currency)} líquidos
              </h2>
              <p className="text-xs text-slate-300">
                Condução tacógrafo: {tachographSummary.drivingMinutes} min · Trabalho s/ condução:{' '}
                {tachographSummary.workWithoutDrivingMinutes} min · Pausas/Refeições:{' '}
                {tachographSummary.breakMinutes + tachographSummary.mealMinutes} min
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDriverNav('tacografo')}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
              >
                <Gauge className="w-4 h-4" />
                <span>Abrir Tacógrafo</span>
              </button>
              <button
                type="button"
                onClick={() => setDriverNav('calculadora')}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors"
              >
                <Calculator className="w-4 h-4" />
                <span>Analisar Proposta</span>
              </button>
              <button
                type="button"
                onClick={() => setDriverNav('consolidado-plataformas')}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors"
              >
                <Layers className="w-4 h-4" />
                <span>Consolidado Multi-App</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Interactive Filters */}
        <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedFilter
              value={dateFilter}
              onChange={setDateFilter}
              options={[
                { id: 'ALL', label: 'Todo o período' },
                { id: 'TODAY', label: 'Hoje (14 Nov)' },
              ]}
            />
            <div>
              <label htmlFor="dash-platform" className="sr-only">Filtrar por plataforma</label>
              <select
                id="dash-platform"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value="ALL">Todas ({visibleDriverPlatforms.length} ativas)</option>
                {visibleDriverPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dash-category" className="sr-only">Filtrar por categoria</label>
              <select
                id="dash-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value="ALL">Todas categorias</option>
                {Array.from(new Set(state.trips.map((t) => t.category))).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-xs text-slate-500">
            {filteredTrips.length} viagem(ns) · clique nos gráficos para abrir detalhes
          </span>
        </Card>

        {/* Primary KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Ganhos Brutos (Período)"
            value={formatMoney(metrics.gross, activeMarket.currency)}
            subtext={`${filteredTrips.length} viagens · inclui gorjetas e bónus`}
            explanation="Soma total das tarifas brutas, gorjetas reconciliadas e bónus das viagens concluídas."
            formula="Σ(tarifa bruta + gorjeta + bónus)"
            accent="blue"
            onDrillDown={() => setDriverNav('historico-viagens')}
            drillDownLabel="Ver histórico de viagens"
          />
          <MetricCard
            label="Líquido Estimado"
            value={formatMoney(metrics.net, activeMarket.currency)}
            subtext={`Após comissões e ${formatMoney(metrics.expensesTotal, activeMarket.currency)} custos`}
            explanation="Estimativa real após comissões das plataformas, custo energético/manutenção e despesas lançadas."
            formula="Bruto - Comissões - Custo/km - Despesas"
            onDrillDown={() => setDriverNav('financeiro')}
            drillDownLabel="Abrir módulo financeiro"
          />
          <MetricCard
            label={`Eficiência (${activeMarket.currencySymbol.trim()}/h e Distância)`}
            value={`${formatMoney(metrics.avgPerHour, activeMarket.currency)}/h`}
            subtext={`${formatDistanceRate(metrics.avgPerKm, activeMarket.currency, activeMarket.unitSystem)} · ${formatDistance(metrics.totalKm, activeMarket.unitSystem)}`}
            explanation="Eficiência média de faturação por hora produtiva e por distância comprometida."
            formula="Receita Bruta ÷ Horas Produtivas | Receita ÷ Distância"
            onDrillDown={() => setDriverNav('relatorios')}
            drillDownLabel="Explorar relatórios"
          />
          <MetricCard
            label="Alertas Documentais & Legais"
            value={`${expiringDocs.length} Pendentes`}
            subtext={`${state.obligations.filter((o) => o.humanValidated).length} obrigações validadas (${activeMarket.code})`}
            explanation="Documentos próximos do vencimento ligados às obrigações locais do motorista."
            formula="Contagem de documentos em estado 'A expirar' ou 'Expirado'"
            accent={expiringDocs.length > 0 ? 'red' : 'neutral'}
            onDrillDown={() => setDriverNav('documentos')}
            drillDownLabel="Rever documentos"
          />
        </div>

        {/* Visual Charts Row: Weekly Goal Donut + Multi-Platform Earnings Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-5 p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Progresso da Meta Semanal
              </h2>
              <button
                type="button"
                onClick={() => setDriverNav('planeador')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Planeador <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <GoalDonutChart
              currentValue={Math.max(0, metrics.net)}
              targetValue={weeklyNetGoal}
              formattedCurrent={formatMoney(Math.max(0, metrics.net), activeMarket.currency)}
              formattedTarget={formatMoney(weeklyNetGoal, activeMarket.currency)}
              label="Resultado Líquido Acumulado"
            />

            {/* Passenger vs Empty Km Visual Split Bar */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between font-medium">
                <span>Km Passageiro ({passKmPct}%) vs Vazio ({100 - passKmPct}%)</span>
                <span className="font-mono-tabular">
                  {formatDistance(metrics.passKm, activeMarket.unitSystem)} /{' '}
                  {formatDistance(metrics.emptyKm, activeMarket.unitSystem)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-red-200 dark:bg-red-950 overflow-hidden flex">
                <div
                  className="h-full bg-blue-700 transition-all duration-500"
                  style={{ width: `${passKmPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Online: {metrics.onlineHours.toFixed(1)}h · Produtivo: {metrics.prodHours.toFixed(1)}h</span>
                <span>Espera: {metrics.waitHours.toFixed(1)}h</span>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-7 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Resumo por Plataforma (Clique para comparar)
              </h2>
              <button
                type="button"
                onClick={() => setDriverNav('consolidado-plataformas')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Consolidado Multi-App <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <HorizontalBreakdownBars
              items={platformBars}
              selectedId={platformFilter !== 'ALL' ? platformFilter : null}
              onSelect={(id) => setPlatformFilter(platformFilter === id ? 'ALL' : id)}
            />
          </Card>
        </div>

        {/* Campaigns, Active Vehicle & Platforms Quick Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Campanhas Ativas ({activeCampaigns.length})</h2>
              <button
                type="button"
                onClick={() => setDriverNav('campanhas')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Ver Todas
              </button>
            </div>
            <div className="space-y-3">
              {activeCampaigns.slice(0, 2).map((c) => {
                const pct = Math.min(100, Math.round((c.completedTrips / c.targetTrips) * 100));
                return (
                  <div key={c.id} className="space-y-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="truncate pr-2">{c.name}</span>
                      <span className="font-mono-tabular shrink-0">
                        {c.completedTrips}/{c.targetTrips} ({formatMoney(c.rewardEur, activeMarket.currency)})
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-blue-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Veículo Ativo
              </h2>
              <button
                type="button"
                onClick={() => setDriverNav('veiculos')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Gerir
              </button>
            </div>
            <div className="text-xs space-y-1.5">
              <p className="font-bold text-sm">
                {activeVehicle.brand} {activeVehicle.model} ({activeVehicle.year})
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {activeVehicle.fuelType} · Autonomia {formatDistance(activeVehicle.rangeKm, activeMarket.unitSystem)} · {activeVehicle.city}
              </p>
              <div className="pt-2 flex items-center justify-between">
                <StatusLabel tone="success" text={`Elegível (${activeMarket.code})`} />
                <button
                  type="button"
                  onClick={() => setDriverNav('legislacao')}
                  className="text-blue-700 dark:text-blue-400 font-medium hover:underline"
                >
                  Conformidade →
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Plataformas Ativas ({visibleDriverPlatforms.length})</h2>
              <button
                type="button"
                onClick={() => setDriverNav('consolidado-plataformas')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Detalhes
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleDriverPlatforms.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() =>
                    setDriverNav(
                      pl.id === 'uber'
                        ? 'desempenho-uber'
                        : pl.id === 'bolt'
                        ? 'desempenho-bolt'
                        : 'consolidado-plataformas'
                    )
                  }
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-600 text-xs font-medium"
                >
                  <PlatformBadge
                    name={pl.name}
                    shortCode={pl.shortCode}
                    brandColor={pl.brandColor}
                    size="sm"
                  />
                  <span>{pl.name}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Ecosystem Event Bus Feed */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Últimos Eventos Sincronizados entre Módulos</h2>
            <span className="text-xs text-slate-500">Arquitetura orientada a eventos idempotentes</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {state.events.slice(0, 4).map((ev) => (
              <div key={ev.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400 mr-2">
                    {ev.type}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{ev.payloadSummary}</span>
                </div>
                <span className="text-slate-500 whitespace-nowrap">{ev.status}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (activeTab === 'calculadora') {
    const classBadge =
      liveAnalysis.classification === 'verde'
        ? { tone: 'success' as const, label: 'Verde — Proposta Favorável' }
        : liveAnalysis.classification === 'amarelo'
        ? { tone: 'warning' as const, label: 'Amarelo — Proposta Intermédia' }
        : { tone: 'danger' as const, label: 'Vermelho — Proposta Desfavorável' };

    const handleSaveProposal = (e: React.FormEvent) => {
      e.preventDefault();
      if (calcInput.grossValueEur <= 0 || calcInput.tripDistanceKm <= 0 || calcInput.tripTimeMin <= 0) {
        setCalcError('Introduza valores positivos para valor bruto, distância da viagem e duração.');
        return;
      }
      setCalcError(null);
      const created = createAndAnalyzeProposal(calcInput, 'Manual');
      setLastCreatedPropId(created.id);
    };

    const currentOverlay = state.overlayConfig;

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="AIVAD Real-Time Offer Analyzer & Cartão Flutuante Android"
          description="Avalie rentabilidade em €/km, €/hora e €/minuto antes de aceitar. Ao concluir uma proposta registada, ela propaga automaticamente para Viagens, Tacógrafo, Financeiro e Campanhas."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-7 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Dados da Proposta ({activeMarket.currency})
              </h2>
              <SegmentedFilter
                value={calcInput.mode}
                onChange={(m) => setCalcInput((p) => ({ ...p, mode: m as AnalysisMode }))}
                options={[
                  { id: 'Equilibrado', label: 'Equilibrado' },
                  { id: 'Prioridade €/hora', label: '€/hora' },
                  { id: 'Prioridade €/km', label: '€/km' },
                  { id: 'Personalizado', label: 'Personalizado' },
                ]}
              />
            </div>

            {calcError && <StatusLabel tone="danger" text={calcError} />}

            <form onSubmit={handleSaveProposal} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label htmlFor="prop-plat" className="block font-medium mb-1">Plataforma</label>
                <select
                  id="prop-plat"
                  value={calcInput.platformId}
                  onChange={(e) => {
                    const pl = visibleDriverPlatforms.find((p) => p.id === e.target.value);
                    setCalcInput((prev) => ({
                      ...prev,
                      platformId: e.target.value,
                      category: pl?.categories[0] ?? 'Standard',
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {visibleDriverPlatforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="prop-cat" className="block font-medium mb-1">Categoria</label>
                <input
                  id="prop-cat"
                  type="text"
                  value={calcInput.category}
                  onChange={(e) => setCalcInput((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="prop-val" className="block font-medium mb-1">
                  Valor Bruto ({activeMarket.currencySymbol})
                </label>
                <input
                  id="prop-val"
                  type="number"
                  step="0.1"
                  value={calcInput.grossValueEur}
                  onChange={(e) => setCalcInput((p) => ({ ...p, grossValueEur: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>

              <div>
                <label htmlFor="prop-pdist" className="block font-medium mb-1">Dist. Recolha (km)</label>
                <input
                  id="prop-pdist"
                  type="number"
                  step="0.1"
                  value={calcInput.pickupDistanceKm}
                  onChange={(e) => setCalcInput((p) => ({ ...p, pickupDistanceKm: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="prop-ptime" className="block font-medium mb-1">Tempo Recolha (min)</label>
                <input
                  id="prop-ptime"
                  type="number"
                  value={calcInput.pickupTimeMin}
                  onChange={(e) => setCalcInput((p) => ({ ...p, pickupTimeMin: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="prop-tdist" className="block font-medium mb-1">Dist. Destino (km)</label>
                <input
                  id="prop-tdist"
                  type="number"
                  step="0.1"
                  value={calcInput.tripDistanceKm}
                  onChange={(e) => setCalcInput((p) => ({ ...p, tripDistanceKm: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>

              <div>
                <label htmlFor="prop-ttime" className="block font-medium mb-1">Tempo Destino (min)</label>
                <input
                  id="prop-ttime"
                  type="number"
                  value={calcInput.tripTimeMin}
                  onChange={(e) => setCalcInput((p) => ({ ...p, tripTimeMin: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="prop-bonus" className="block font-medium mb-1">
                  Bónus ({activeMarket.currencySymbol})
                </label>
                <input
                  id="prop-bonus"
                  type="number"
                  step="0.1"
                  value={calcInput.bonusEur}
                  onChange={(e) => setCalcInput((p) => ({ ...p, bonusEur: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="prop-tolls" className="block font-medium mb-1">
                  Portagens ({activeMarket.currencySymbol})
                </label>
                <input
                  id="prop-tolls"
                  type="number"
                  step="0.1"
                  value={calcInput.tollsEur}
                  onChange={(e) => setCalcInput((p) => ({ ...p, tollsEur: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>

              <div>
                <label htmlFor="prop-stops" className="block font-medium mb-1">Paragens</label>
                <input
                  id="prop-stops"
                  type="number"
                  min={0}
                  value={calcInput.stops}
                  onChange={(e) => setCalcInput((p) => ({ ...p, stops: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="prop-region" className="block font-medium mb-1">Zona / Região</label>
                <input
                  id="prop-region"
                  type="text"
                  value={calcInput.region}
                  onChange={(e) => setCalcInput((p) => ({ ...p, region: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="prop-basis" className="block font-medium mb-1">Base de Cálculo</label>
                <select
                  id="prop-basis"
                  value={calcInput.calculationBasis}
                  onChange={(e) =>
                    setCalcInput((p) => ({
                      ...p,
                      calculationBasis: e.target.value as ProposalInput['calculationBasis'],
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="total_distance">Distância Total (Recolha + Viagem)</option>
                  <option value="trip_distance_only">Apenas Distância Passageiro</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
                >
                  Registar Proposta no Histórico
                </button>
                {lastCreatedPropId && (
                  <button
                    type="button"
                    onClick={() => updateProposalLifecycle(lastCreatedPropId, 'Concluída')}
                    className="px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                  >
                    Marcar Última como Concluída (Gerar Viagem + Tacógrafo)
                  </button>
                )}
              </div>
            </form>
          </Card>

          <Card className="lg:col-span-5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Resultado Analítico</h2>
              <StatusLabel tone={classBadge.tone} text={classBadge.label} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                <span className="text-[11px] text-slate-500">Por distância</span>
                <p className="text-base font-bold font-mono-tabular">
                  {formatDistanceRate(liveAnalysis.eurPerKm, activeMarket.currency, activeMarket.unitSystem)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                <span className="text-[11px] text-slate-500">Por hora</span>
                <p className="text-base font-bold font-mono-tabular">
                  {formatMoney(liveAnalysis.eurPerHour, activeMarket.currency)}/h
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                <span className="text-[11px] text-slate-500">Por minuto</span>
                <p className="text-base font-bold font-mono-tabular">
                  {formatMoney(liveAnalysis.eurPerMin, activeMarket.currency)}/m
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Distância Total Comprometida</span>
                <span className="font-mono-tabular font-semibold">
                  {formatDistance(liveAnalysis.totalDistanceKm, activeMarket.unitSystem)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tempo Total Comprometido</span>
                <span className="font-mono-tabular font-semibold">{liveAnalysis.totalTimeMin} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Custo Operacional Estimado</span>
                <span className="font-mono-tabular font-semibold">
                  {formatMoney(liveAnalysis.operatingCostEur, activeMarket.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rentabilidade Líquida Antes de Comissão</span>
                <span className="font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                  {formatMoney(liveAnalysis.estimatedNetEur, activeMarket.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Risco de Retorno Vazio</span>
                <span className="font-semibold">{liveAnalysis.emptyReturnRisk}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              {liveAnalysis.basisDescription}
            </p>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {liveAnalysis.reasons.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Android Floating Card Designer */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Configurador do Cartão Flutuante Android
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                As cores personalizadas do cartão são independentes da classificação (Verde/Amarelo/Vermelho). Renderização real exclusiva do módulo nativo Android.
              </p>
            </div>
            <StatusLabel tone="warning" text="Overlay Nativo Android: INTEGRAÇÃO A VALIDAR" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label htmlFor="ov-pos" className="block font-medium mb-1">Posição</label>
                <select
                  id="ov-pos"
                  value={currentOverlay.position}
                  onChange={(e) => updateOverlayConfig({ position: e.target.value as 'Topo' | 'Centro' | 'Fundo' })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Topo">Topo</option>
                  <option value="Centro">Centro</option>
                  <option value="Fundo">Fundo</option>
                </select>
              </div>
              <div>
                <label htmlFor="ov-opac" className="block font-medium mb-1">Transparência ({currentOverlay.opacityPercent}%)</label>
                <input
                  id="ov-opac"
                  type="range"
                  min={50}
                  max={100}
                  value={currentOverlay.opacityPercent}
                  onChange={(e) => updateOverlayConfig({ opacityPercent: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="ov-dur" className="block font-medium mb-1">Duração (s)</label>
                <input
                  id="ov-dur"
                  type="number"
                  min={3}
                  max={45}
                  value={currentOverlay.durationSeconds}
                  onChange={(e) => updateOverlayConfig({ durationSeconds: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="ov-bg" className="block font-medium mb-1">Cor Fundo Cartão</label>
                <input
                  id="ov-bg"
                  type="color"
                  value={currentOverlay.bgColor}
                  onChange={(e) => updateOverlayConfig({ bgColor: e.target.value })}
                  className="w-full h-9 rounded border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label htmlFor="ov-txt" className="block font-medium mb-1">Cor Texto</label>
                <input
                  id="ov-txt"
                  type="color"
                  value={currentOverlay.textColor}
                  onChange={(e) => updateOverlayConfig({ textColor: e.target.value })}
                  className="w-full h-9 rounded border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label htmlFor="ov-brd" className="block font-medium mb-1">Cor Borda</label>
                <input
                  id="ov-brd"
                  type="color"
                  value={currentOverlay.borderColor}
                  onChange={(e) => updateOverlayConfig({ borderColor: e.target.value })}
                  className="w-full h-9 rounded border border-slate-300 dark:border-slate-700"
                />
              </div>
              <label className="col-span-2 sm:col-span-3 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={currentOverlay.showHistoryFloatingButton}
                  onChange={(e) => updateOverlayConfig({ showHistoryFloatingButton: e.target.checked })}
                />
                <span>Mostrar botão flutuante rápido de histórico de propostas</span>
              </label>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div
                style={{
                  backgroundColor: currentOverlay.bgColor,
                  color: currentOverlay.textColor,
                  borderColor: currentOverlay.borderColor,
                  opacity: currentOverlay.opacityPercent / 100,
                  width: `${currentOverlay.widthPercent}%`,
                  fontSize: `${currentOverlay.fontSizePx}px`,
                }}
                className="rounded-xl border-2 p-3.5 shadow-md space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">AIVAD · {calcInput.platformId.toUpperCase()}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-white text-[11px] ${
                      liveAnalysis.classification === 'verde'
                        ? 'bg-emerald-600'
                        : liveAnalysis.classification === 'amarelo'
                        ? 'bg-amber-600'
                        : 'bg-red-600'
                    }`}
                  >
                    {liveAnalysis.classification.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono-tabular font-bold">
                  <div>{formatDistanceRate(liveAnalysis.eurPerKm, activeMarket.currency, activeMarket.unitSystem)}</div>
                  <div>{formatMoney(liveAnalysis.eurPerHour, activeMarket.currency)}/h</div>
                  <div>{formatMoney(liveAnalysis.estimatedNetEur, activeMarket.currency)} líq.</div>
                </div>
              </div>
              {currentOverlay.showHistoryFloatingButton && (
                <span className="mt-3 text-[11px] text-slate-500">
                  + Botão flutuante de histórico ativo ({currentOverlay.position}, fecha em {currentOverlay.durationSeconds}s)
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (activeTab === 'propostas-tempo-real') {
    const states: ProposalLifecycleState[] = [
      'Capturada',
      'Analisada',
      'Apresentada',
      'Aceite pelo motorista',
      'Confirmada pela plataforma',
      'Iniciada',
      'Concluída',
      'Recusada',
      'Expirada',
      'Cancelada',
    ];

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Propostas em Tempo Real & Ciclo de Vida Separado"
          description="O clique de aceitação do motorista nunca é confundido com a confirmação efetiva pela plataforma. Teste uma proposta simulada ou avance estados manualmente."
          demoNotice="INTEGRAÇÃO A VALIDAR para captura automática"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              createAndAnalyzeProposal(
                {
                  platformId: visibleDriverPlatforms[0]?.id ?? 'uber',
                  category: visibleDriverPlatforms[0]?.categories[0] ?? 'Uber Comfort',
                  grossValueEur: 18.2,
                  pickupDistanceKm: 1.8,
                  pickupTimeMin: 5,
                  tripDistanceKm: 12.1,
                  tripTimeMin: 21,
                  stops: 0,
                  tollsEur: 0,
                  bonusEur: 2.0,
                  region: `${state.localization.currentLocation.city} → Aeroporto`,
                  vehicleCostPerKmEur: 0.12,
                  calculationBasis: 'total_distance',
                  mode: 'Equilibrado',
                },
                'Captura Simulada'
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simular Nova Proposta Recebida</span>
          </button>
        </div>

        <div className="space-y-4">
          {state.proposals.map((prop) => (
            <Card key={prop.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <span>{prop.input.platformId.toUpperCase()} · {prop.input.category}</span>
                    <span className="text-xs font-normal text-slate-500">({prop.source})</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {prop.input.region} · {formatDistance(prop.analysis.totalDistanceKm, activeMarket.unitSystem)} · {prop.analysis.totalTimeMin} min
                  </p>
                </div>

                <div className="flex items-center gap-4 font-mono-tabular text-xs">
                  <span>{formatMoney(prop.analysis.effectiveRevenueEur, activeMarket.currency)}</span>
                  <span>{formatDistanceRate(prop.analysis.eurPerKm, activeMarket.currency, activeMarket.unitSystem)}</span>
                  <span>{formatMoney(prop.analysis.eurPerHour, activeMarket.currency)}/h</span>
                  <StatusLabel
                    tone={
                      prop.analysis.classification === 'verde'
                        ? 'success'
                        : prop.analysis.classification === 'amarelo'
                        ? 'warning'
                        : 'danger'
                    }
                    text={prop.lifecycleState}
                  />
                </div>
              </div>

              {prop.autoPilotDecision && (
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <strong>AutoPilot ({prop.autoPilotDecision.modeAtDecision}):</strong>{' '}
                  {prop.autoPilotDecision.action} — {prop.autoPilotDecision.reason}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 mr-1">Transição de estado:</span>
                {states.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateProposalLifecycle(prop.id, st)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      prop.lifecycleState === st
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'autopilot') {
    const ap = state.autoPilot;
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="AIVAD AutoPilot — Motor de Decisão Responsável"
          description="Suporta modos Manual, Assistido e Automático. Não implementa simulação de cliques, manipulação de GPS ou contorno de proteções. O modo Automático só executa mediante integração oficial autorizada."
        />

        <Card className="p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Modo de Operação AutoPilot
            </h2>
            <SegmentedFilter
              value={ap.mode}
              onChange={(m) => updateAutoPilotConfig({ mode: m as AutoPilotMode })}
              options={[
                { id: 'Manual', label: '1. Manual' },
                { id: 'Assistido', label: '2. Assistido' },
                { id: 'Automático', label: '3. Automático (Requer API Oficial)' },
              ]}
            />
          </div>

          {ap.mode === 'Automático' && !ap.officialAutomationAuthorized && (
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  INTEGRAÇÃO A VALIDAR — Bloqueio de Segurança Ativo
                </p>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                  Nenhuma plataforma possui autorização oficial de aceitação automática ativa neste ambiente. As decisões ficam registadas como bloqueadas sem simulação de toques.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label htmlFor="ap-min-val" className="block font-medium mb-1">
                Valor Mínimo ({activeMarket.currencySymbol})
              </label>
              <input
                id="ap-min-val"
                type="number"
                step="0.5"
                value={ap.thresholds.minValueEur}
                onChange={(e) =>
                  updateAutoPilotConfig({
                    thresholds: { ...ap.thresholds, minValueEur: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="ap-min-km" className="block font-medium mb-1">
                Mínimo ({activeMarket.currencySymbol}/km)
              </label>
              <input
                id="ap-min-km"
                type="number"
                step="0.05"
                value={ap.thresholds.minEurPerKm}
                onChange={(e) =>
                  updateAutoPilotConfig({
                    thresholds: { ...ap.thresholds, minEurPerKm: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="ap-min-hr" className="block font-medium mb-1">
                Mínimo ({activeMarket.currencySymbol}/hora)
              </label>
              <input
                id="ap-min-hr"
                type="number"
                step="1"
                value={ap.thresholds.minEurPerHour}
                onChange={(e) =>
                  updateAutoPilotConfig({
                    thresholds: { ...ap.thresholds, minEurPerHour: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ap.prioritizeCampaigns}
                onChange={(e) => updateAutoPilotConfig({ prioritizeCampaigns: e.target.checked })}
              />
              <span>Priorizar campanhas ativas na decisão</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ap.includeBonusInThreshold}
                onChange={(e) => updateAutoPilotConfig({ includeBonusInThreshold: e.target.checked })}
              />
              <span>Incluir bónus na avaliação de limiar</span>
            </label>
          </div>
        </Card>
      </div>
    );
  }

  // SMART DATA CAPTURE
  const pendingCaptures = state.captures.filter((c) => c.status === 'Pendente');

  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="AIVAD Smart Data Capture — Captura Idempotente & Reconciliação"
        description="Associa gorjetas tardias à viagem original sem duplicar, regista campanhas e bloqueia repetições com base na chave idempotente."
      />

      <Card className="p-5 space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          Capturar / Reconciliar Evento Externo
        </h2>

        {capFeedback && (
          <StatusLabel tone={capFeedback.tone} text={capFeedback.message} />
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const res = captureExternalEvent(capForm);
            setCapFeedback({
              message: res.message,
              tone: res.isDuplicate ? 'danger' : res.status === 'Pendente' ? 'warning' : 'success',
            });
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
        >
          <div>
            <label htmlFor="cap-tx" className="block font-medium mb-1">ID Externo (Chave Dedup)</label>
            <input
              id="cap-tx"
              type="text"
              value={capForm.externalTxId}
              onChange={(e) => setCapForm((f) => ({ ...f, externalTxId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <div>
            <label htmlFor="cap-type" className="block font-medium mb-1">Tipo de Dado</label>
            <select
              id="cap-type"
              value={capForm.dataType}
              onChange={(e) =>
                setCapForm((f) => ({
                  ...f,
                  dataType: e.target.value as SmartCaptureRecord['dataType'],
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Gorjeta">Gorjeta</option>
              <option value="Campanha">Campanha</option>
              <option value="Viagem">Viagem</option>
              <option value="Ganho">Ganho</option>
              <option value="Bónus">Bónus</option>
              <option value="Pagamento">Pagamento</option>
            </select>
          </div>
          <div>
            <label htmlFor="cap-plat" className="block font-medium mb-1">Plataforma</label>
            <select
              id="cap-plat"
              value={capForm.platformId}
              onChange={(e) => setCapForm((f) => ({ ...f, platformId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {visibleDriverPlatforms.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cap-amt" className="block font-medium mb-1">
              Valor ({activeMarket.currencySymbol})
            </label>
            <input
              id="cap-amt"
              type="number"
              step="0.1"
              value={capForm.amountEur}
              onChange={(e) => setCapForm((f) => ({ ...f, amountEur: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <div>
            <label htmlFor="cap-ref" className="block font-medium mb-1">Ref. Viagem Associada</label>
            <input
              id="cap-ref"
              type="text"
              value={capForm.relatedTripRef}
              onChange={(e) => setCapForm((f) => ({ ...f, relatedTripRef: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <div>
            <label htmlFor="cap-src" className="block font-medium mb-1">Origem</label>
            <select
              id="cap-src"
              value={capForm.source}
              onChange={(e) => setCapForm((f) => ({ ...f, source: e.target.value as CaptureSource }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Notificação Android Autorizada">Notificação Android Autorizada</option>
              <option value="Extrato Importado">Extrato Importado</option>
              <option value="Relatório CSV/PDF">Relatório CSV/PDF</option>
              <option value="OCR">OCR</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
          <div className="sm:col-span-3 flex flex-wrap gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
            >
              Processar Evento no Smart Capture
            </button>
          </div>
        </form>
      </Card>

      {pendingCaptures.length > 0 && (
        <Card className="p-5 space-y-3 border-amber-300 dark:border-amber-800">
          <h3 className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Radio className="w-4 h-4" />
            Registos Pendentes de Confirmação Manual ({pendingCaptures.length})
          </h3>
          {pendingCaptures.map((pc) => (
            <div
              key={pc.id}
              className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <p className="font-semibold">{pc.rawSummary}</p>
                <p className="text-slate-500">
                  ID {pc.externalTxId} · {formatMoney(pc.amountEur, activeMarket.currency)} · {pc.platformId.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Escolher viagem para associar"
                  value={pendingMatchTripId}
                  onChange={(e) => setPendingMatchTripId(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {state.trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.externalRef} ({formatMoney(t.grossEur, t.currency ?? 'EUR')})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => confirmPendingCapture(pc.id, pendingMatchTripId)}
                  className="px-3 py-1.5 rounded bg-blue-700 text-white font-semibold whitespace-nowrap"
                >
                  Associar
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card className="overflow-x-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Histórico de Capturas &amp; Deduplicação ({state.captures.length})
          </h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">ID / Chave</th>
              <th className="p-3">Origem</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Resumo</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {state.captures.map((cap) => (
              <tr key={cap.id}>
                <td className="p-3 font-mono-tabular">{cap.externalTxId}</td>
                <td className="p-3">{cap.source}</td>
                <td className="p-3">{cap.dataType}</td>
                <td className="p-3 font-mono-tabular">{formatMoney(cap.amountEur, activeMarket.currency)}</td>
                <td className="p-3">{cap.rawSummary}</td>
                <td className="p-3">
                  <StatusLabel
                    tone={
                      cap.status === 'Associado' || cap.status === 'Confirmado'
                        ? 'success'
                        : cap.status === 'Pendente'
                        ? 'warning'
                        : cap.status === 'Rejeitado'
                        ? 'danger'
                        : 'info'
                    }
                    text={cap.status}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
