import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Calculator,
  CheckCircle2,
  Database,
  Play,
  Radio,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { analyzeProposal } from '../../../core/intelligence';
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
    visibleDriverPlatforms,
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
    const onlineMin = state.shifts.reduce((s, sh) => s + sh.onlineMinutes, 0) || prodMin + 45;
    const waitMin = Math.max(0, onlineMin - prodMin);
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
  }, [filteredTrips, state.expenses, state.shifts]);

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
    region: 'Lisboa Centro',
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

  // Selected trip for pending capture association
  const [pendingMatchTripId, setPendingMatchTripId] = useState<string>(state.trips[0]?.id ?? '');

  if (activeTab === 'dashboard') {
    const expiringDocs = state.documents.filter((d) => d.status !== 'Válido');
    const activeCampaigns = state.campaigns.filter((c) => c.status === 'Ativa');
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Painel Operacional Integrado"
          description="Clique no ícone (?) de qualquer cartão para ver o significado e a fórmula de cálculo. Clique em 'Abrir análise' para navegar diretamente ao módulo detalhado."
          demoNotice="Modo Demonstração Coerente"
        />

        {/* Filters */}
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
                <option value="ALL">Todas as plataformas ({visibleDriverPlatforms.length} ativas)</option>
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
                <option value="ALL">Todas as categorias</option>
                {Array.from(new Set(state.trips.map((t) => t.category))).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDriverNav('calculadora')}
            className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
          >
            Analisar Nova Proposta
          </button>
        </Card>

        {/* Primary KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Ganhos Brutos (Período)"
            value={`€${metrics.gross.toFixed(2)}`}
            subtext={`${filteredTrips.length} viagens filtradas · inclui gorjetas e bónus`}
            explanation="Soma total das tarifas brutas, gorjetas reconciliadas e bónus das viagens concluídas."
            formula="Σ(tarifa bruta + gorjeta + bónus)"
            accent="blue"
            onDrillDown={() => setDriverNav('historico-viagens')}
            drillDownLabel="Ver histórico de viagens"
          />
          <MetricCard
            label="Líquido Estimado"
            value={`€${metrics.net.toFixed(2)}`}
            subtext={`Após comissões e €${metrics.expensesTotal.toFixed(2)} custos/despesas`}
            explanation="Estimativa real do resultado após comissões das plataformas, custo energético/manutenção e despesas lançadas."
            formula="Bruto - Comissões - Custo/km - Despesas"
            onDrillDown={() => setDriverNav('financeiro')}
            drillDownLabel="Abrir módulo financeiro"
          />
          <MetricCard
            label="Média por Hora / por Km"
            value={`€${metrics.avgPerHour.toFixed(2)}/h`}
            subtext={`€${metrics.avgPerKm.toFixed(2)}/km · ${metrics.totalKm.toFixed(1)} km totais`}
            explanation="Eficiência média de faturação por hora produtiva e por quilómetro total comprometido."
            formula="Receita Bruta ÷ Horas Produtivas | Receita ÷ Km Totais"
            onDrillDown={() => setDriverNav('relatorios')}
            drillDownLabel="Explorar relatórios"
          />
          <MetricCard
            label="Alertas Documentais & Legais"
            value={`${expiringDocs.length} Pendentes`}
            subtext={`${state.obligations.filter((o) => o.humanValidated).length} obrigações validadas`}
            explanation="Documentos com validade próxima do vencimento ligados às obrigações TVDE."
            formula="Contagem de documentos em estado 'A expirar' ou 'Expirado'"
            accent={expiringDocs.length > 0 ? 'red' : 'neutral'}
            onDrillDown={() => setDriverNav('documentos')}
            drillDownLabel="Rever documentos"
          />
        </div>

        {/* Operational Breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Tempos &amp; Quilometragem</h2>
              <button
                type="button"
                onClick={() => setDriverNav('agenda-turnos')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Abrir Turnos
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Horas Online / Produtivas / Espera</span>
                <span className="font-mono-tabular font-semibold">
                  {metrics.onlineHours.toFixed(1)}h / {metrics.prodHours.toFixed(1)}h / {metrics.waitHours.toFixed(1)}h
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Km com Passageiro</span>
                <span className="font-mono-tabular font-semibold">{metrics.passKm.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Km em Recolha / Vazio</span>
                <span className="font-mono-tabular font-semibold">{metrics.emptyKm.toFixed(1)} km</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Campanhas Ativas ({activeCampaigns.length})</h2>
              <button
                type="button"
                onClick={() => setDriverNav('campanhas')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Ver Campanhas
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
                        {c.completedTrips}/{c.targetTrips} (€{c.rewardEur})
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
              <h2 className="text-sm font-bold">Veículo Ativo &amp; Obrigações</h2>
              <button
                type="button"
                onClick={() => setDriverNav('veiculos')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Gerir Veículo
              </button>
            </div>
            <div className="text-xs space-y-1.5">
              <p className="font-semibold text-sm">
                {activeVehicle.brand} {activeVehicle.model} ({activeVehicle.year})
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {activeVehicle.fuelType} · Autonomia {activeVehicle.rangeKm} km · {activeVehicle.city}
              </p>
              <div className="pt-2 flex items-center justify-between">
                <StatusLabel tone="success" text="Elegível TVDE PT" />
                <button
                  type="button"
                  onClick={() => setDriverNav('legislacao')}
                  className="text-blue-700 dark:text-blue-400 font-medium hover:underline"
                >
                  Lei n.º 59/2026 →
                </button>
              </div>
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
          description="Avalie rentabilidade em €/km, €/hora e €/minuto antes de aceitar. Ao concluir uma proposta registada, ela propaga automaticamente para Viagens, Financeiro, Campanhas e Relatórios."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Form */}
          <Card className="lg:col-span-7 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Dados da Proposta
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
                <label htmlFor="prop-val" className="block font-medium mb-1">Valor Bruto (€)</label>
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
                <label htmlFor="prop-bonus" className="block font-medium mb-1">Bónus (€)</label>
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
                <label htmlFor="prop-tolls" className="block font-medium mb-1">Portagens (€)</label>
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
                    Marcar Última como Concluída (Gerar Viagem)
                  </button>
                )}
              </div>
            </form>
          </Card>

          {/* Live Output */}
          <Card className="lg:col-span-5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Resultado Analítico</h2>
              <StatusLabel tone={classBadge.tone} text={classBadge.label} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                <span className="text-[11px] text-slate-500">€/km</span>
                <p className="text-lg font-bold font-mono-tabular">€{liveAnalysis.eurPerKm.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                <span className="text-[11px] text-slate-500">€/hora</span>
                <p className="text-lg font-bold font-mono-tabular">€{liveAnalysis.eurPerHour.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                <span className="text-[11px] text-slate-500">€/minuto</span>
                <p className="text-lg font-bold font-mono-tabular">€{liveAnalysis.eurPerMin.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Distância Total Comprometida</span>
                <span className="font-mono-tabular font-semibold">{liveAnalysis.totalDistanceKm.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tempo Total Comprometido</span>
                <span className="font-mono-tabular font-semibold">{liveAnalysis.totalTimeMin} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Custo Operacional Estimado</span>
                <span className="font-mono-tabular font-semibold">€{liveAnalysis.operatingCostEur.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rentabilidade Líquida Antes de Comissão</span>
                <span className="font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                  €{liveAnalysis.estimatedNetEur.toFixed(2)}
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

        {/* Android Floating Card Designer (Configuração de interface nativa) */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Configurador do Cartão Flutuante Android
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                As cores personalizadas do cartão são independentes das cores semânticas de classificação (Verde/Amarelo/Vermelho). Renderização real reservada ao módulo nativo Android.
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

            {/* Live Overlay Preview */}
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
                  <div>€{liveAnalysis.eurPerKm.toFixed(2)}/km</div>
                  <div>€{liveAnalysis.eurPerHour.toFixed(2)}/h</div>
                  <div>€{liveAnalysis.estimatedNetEur.toFixed(2)} líq.</div>
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
                  category: 'Uber Comfort',
                  grossValueEur: 18.2,
                  pickupDistanceKm: 1.8,
                  pickupTimeMin: 5,
                  tripDistanceKm: 12.1,
                  tripTimeMin: 21,
                  stops: 0,
                  tollsEur: 0,
                  bonusEur: 2.0,
                  region: 'Saldanha → Aeroporto',
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
                    {prop.input.region} · {prop.analysis.totalDistanceKm} km · {prop.analysis.totalTimeMin} min
                  </p>
                </div>

                <div className="flex items-center gap-4 font-mono-tabular text-xs">
                  <span>€{prop.analysis.effectiveRevenueEur.toFixed(2)}</span>
                  <span>€{prop.analysis.eurPerKm.toFixed(2)}/km</span>
                  <span>€{prop.analysis.eurPerHour.toFixed(2)}/h</span>
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
              <label htmlFor="ap-min-val" className="block font-medium mb-1">Valor Mínimo (€)</label>
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
              <label htmlFor="ap-min-km" className="block font-medium mb-1">€/km Mínimo</label>
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
              <label htmlFor="ap-min-h" className="block font-medium mb-1">€/hora Mínimo</label>
              <input
                id="ap-min-h"
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
            <div>
              <label htmlFor="ap-max-pick" className="block font-medium mb-1">Recolha Máxima (km)</label>
              <input
                id="ap-max-pick"
                type="number"
                step="0.5"
                value={ap.thresholds.maxPickupKm}
                onChange={(e) =>
                  updateAutoPilotConfig({
                    thresholds: { ...ap.thresholds, maxPickupKm: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="ap-max-dist" className="block font-medium mb-1">Distância Máxima (km)</label>
              <input
                id="ap-max-dist"
                type="number"
                value={ap.thresholds.maxTotalDistanceKm}
                onChange={(e) =>
                  updateAutoPilotConfig({
                    thresholds: { ...ap.thresholds, maxTotalDistanceKm: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="ap-sched" className="block font-medium mb-1">Horário Ativo</label>
              <input
                id="ap-sched"
                type="text"
                value={ap.thresholds.activeScheduleWindow}
                onChange={(e) =>
                  updateAutoPilotConfig({
                    thresholds: { ...ap.thresholds, activeScheduleWindow: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs pt-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ap.prioritizeCampaigns}
                onChange={(e) => updateAutoPilotConfig({ prioritizeCampaigns: e.target.checked })}
              />
              <span>Priorizar propostas que contribuam para campanhas ativas</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ap.includeBonusInThreshold}
                onChange={(e) => updateAutoPilotConfig({ includeBonusInThreshold: e.target.checked })}
              />
              <span>Incluir bónus no cálculo dos limiares</span>
            </label>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Registo Auditável de Decisões AutoPilot
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {state.proposals
              .filter((p) => p.autoPilotDecision)
              .map((p) => (
                <div key={p.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {p.input.platformId.toUpperCase()} · €{p.analysis.effectiveRevenueEur.toFixed(2)} ({p.autoPilotDecision!.modeAtDecision})
                    </p>
                    <p className="text-slate-500">{p.autoPilotDecision!.reason}</p>
                  </div>
                  <StatusLabel
                    tone={p.autoPilotDecision!.action.includes('Aceitar') ? 'success' : 'warning'}
                    text={p.autoPilotDecision!.action}
                  />
                </div>
              ))}
          </div>
        </Card>
      </div>
    );
  }

  // SMART DATA CAPTURE
  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="AIVAD Smart Data Capture & Reconciliação Idempotente"
        description="Recebe eventos de notificações Android autorizadas, extratos, OCR ou entrada manual. Gorjetas tardias atualizam a viagem original sem criar duplicados; eventos sem correspondência ficam pendentes."
      />

      <Card className="p-5 space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          Simular / Importar Evento de Captura
        </h2>
        {capFeedback && <StatusLabel tone={capFeedback.tone} text={capFeedback.message} />}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!capForm.externalTxId.trim() || capForm.amountEur <= 0) {
              setCapFeedback({
                tone: 'danger',
                message: 'Preencha o ID de transação e um valor positivo.',
              });
              return;
            }
            const res = captureExternalEvent(capForm);
            setCapFeedback({
              tone: res.isDuplicate ? 'warning' : 'success',
              message: res.message,
            });
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
        >
          <div>
            <label htmlFor="cap-tx" className="block font-medium mb-1">ID Transação (Idempotência)</label>
            <input
              id="cap-tx"
              type="text"
              value={capForm.externalTxId}
              onChange={(e) => setCapForm((p) => ({ ...p, externalTxId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <div>
            <label htmlFor="cap-type" className="block font-medium mb-1">Tipo de Dado</label>
            <select
              id="cap-type"
              value={capForm.dataType}
              onChange={(e) =>
                setCapForm((p) => ({ ...p, dataType: e.target.value as SmartCaptureRecord['dataType'] }))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Gorjeta">Gorjeta (Reconcilia viagem original)</option>
              <option value="Campanha">Campanha (Alimenta central de campanhas)</option>
              <option value="Ganho">Ganho</option>
              <option value="Ajuste">Ajuste</option>
            </select>
          </div>
          <div>
            <label htmlFor="cap-src" className="block font-medium mb-1">Origem da Recolha</label>
            <select
              id="cap-src"
              value={capForm.source}
              onChange={(e) => setCapForm((p) => ({ ...p, source: e.target.value as CaptureSource }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Notificação Android Autorizada">Notificação Android Autorizada</option>
              <option value="Extrato Importado">Extrato Importado</option>
              <option value="OCR">OCR</option>
              <option value="Captura Voluntária">Captura Voluntária</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
          <div>
            <label htmlFor="cap-plat" className="block font-medium mb-1">Plataforma</label>
            <select
              id="cap-plat"
              value={capForm.platformId}
              onChange={(e) => setCapForm((p) => ({ ...p, platformId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {visibleDriverPlatforms.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cap-amt" className="block font-medium mb-1">Valor (€)</label>
            <input
              id="cap-amt"
              type="number"
              step="0.1"
              value={capForm.amountEur}
              onChange={(e) => setCapForm((p) => ({ ...p, amountEur: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <div>
            <label htmlFor="cap-ref" className="block font-medium mb-1">Ref. Viagem Original (ex: UB-88439)</label>
            <input
              id="cap-ref"
              type="text"
              value={capForm.relatedTripRef}
              onChange={(e) => setCapForm((p) => ({ ...p, relatedTripRef: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
            >
              Processar Captura com Deteção de Duplicação
            </button>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold">Registos Capturados ({state.captures.length})</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Associar pendentes à viagem:</span>
            <select
              value={pendingMatchTripId}
              onChange={(e) => setPendingMatchTripId(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {state.trips.map((t) => (
                <option key={t.id} value={t.id}>{t.externalRef} (€{t.grossEur})</option>
              ))}
            </select>
          </div>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Tipo</th>
              <th className="p-3">Origem</th>
              <th className="p-3">Plataforma</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Resumo</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {state.captures.map((cap) => (
              <tr key={cap.id}>
                <td className="p-3 font-semibold">{cap.dataType}</td>
                <td className="p-3">{cap.source}</td>
                <td className="p-3">{cap.platformId.toUpperCase()}</td>
                <td className="p-3 font-mono-tabular">€{cap.amountEur.toFixed(2)}</td>
                <td className="p-3 max-w-xs">{cap.rawSummary}</td>
                <td className="p-3">
                  <StatusLabel
                    tone={
                      cap.status === 'Associado' || cap.status === 'Confirmado'
                        ? 'success'
                        : cap.status === 'Rejeitado'
                        ? 'danger'
                        : 'warning'
                    }
                    text={cap.status}
                  />
                </td>
                <td className="p-3">
                  {cap.status === 'Pendente' ? (
                    <button
                      type="button"
                      onClick={() => confirmPendingCapture(cap.id, pendingMatchTripId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-700 text-white font-medium"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Associar
                    </button>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
