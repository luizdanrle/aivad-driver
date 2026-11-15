import React, { useMemo, useState } from 'react';
import {
  Car,
  Download,
  FileSpreadsheet,
  GitCompare,
  HelpCircle,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  exportPrintablePdfReport,
  exportReportAsPng,
  exportToCsv,
  exportToXlsx,
} from '../../../core/exportUtils';
import {
  computeVehicleOwnershipTcoPerKm,
  estimateVehicleResaleValue,
  evaluateVehicleEligibility,
  explainFinancialCalculation,
  filterVehiclesCatalog,
  getEnergyUnitPriceByTariff,
  round2,
  type FinancialCalculationExplanation,
} from '../../../core/intelligence';
import {
  formatDistance,
  formatDistanceRate,
  formatHistoricalMoney,
  formatMoney,
  getTodayIso,
} from '../../../core/localization';
import type {
  DataScopeFilter,
  DateRangePreset,
  ExpenseRecord,
  FuelType,
  TripRecord,
  VehicleRecord,
} from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import { GoalDonutChart, HorizontalBreakdownBars, PlatformBadge } from '../../ui/ChartsAndVisuals';
import {
  CalculationExplanationModal,
  Card,
  ContextualHelpBanner,
  MetricCard,
  StatusLabel,
} from '../../ui/DesignSystem';

const DATE_PRESETS: Array<{ id: DateRangePreset; label: string }> = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: 'ultimos_7_dias', label: 'Últimos 7 dias' },
  { id: 'esta_semana', label: 'Esta semana' },
  { id: 'ultimos_30_dias', label: 'Últimos 30 dias' },
  { id: 'este_mes', label: 'Este mês' },
  { id: 'mes_anterior', label: 'Mês anterior' },
  { id: 'este_ano', label: 'Este ano' },
  { id: 'personalizado', label: 'Personalizado' },
];

type ReportSubTab =
  | 'geral'
  | 'plataforma'
  | 'cancelamentos'
  | 'financeiro_sub'
  | 'rentabilidade'
  | 'estrategia'
  | 'tvde'
  | 'veiculo_sub'
  | 'metas';

const REPORT_SUBTABS: Array<{ id: ReportSubTab; label: string }> = [
  { id: 'geral', label: '1. Geral' },
  { id: 'plataforma', label: '2. Por Plataforma' },
  { id: 'cancelamentos', label: '3. Estados & Cancelamentos' },
  { id: 'financeiro_sub', label: '4. Financeiro' },
  { id: 'rentabilidade', label: '5. Rentabilidade' },
  { id: 'estrategia', label: '6. Estratégia & IA' },
  { id: 'tvde', label: '7. Atividade TVDE' },
  { id: 'veiculo_sub', label: '8. Veículo & Energia' },
  { id: 'metas', label: '9. Metas & Projeção' },
];

export const DriverFinanceAndFleet: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    activeMarket,
    activeDriverTrips,
    financialSummary,
    comprehensiveReports,
    updateReportFilters,
    updateFinancialCostConfig,
    addExpense,
    addVehicle,
    updateVehicle,
    setActiveVehicle,
  } = useEcosystem();

  const todayIso = getTodayIso();
  const currentYear = new Date().getFullYear();

  const currency = activeMarket.currency;
  const symbol = activeMarket.currencySymbol;
  const unitSystem = state.localization.unitSystem;

  // Calculation Explanation Modal state ("Como foi calculado?")
  const [activeExplanation, setActiveExplanation] =
    useState<FinancialCalculationExplanation | null>(null);

  // 9-Report Center state
  const [reportSubTab, setReportSubTab] = useState<ReportSubTab>('geral');
  const [drillModal, setDrillModal] = useState<{
    title: string;
    formula: string;
    trips: TripRecord[];
  } | null>(null);

  // Finance Expense Form + Cost Simulator
  const [expForm, setExpForm] = useState<{
    category: ExpenseRecord['category'];
    description: string;
    amountEur: number;
  }>({
    category: 'Energia',
    description: 'Carregamento rápido Hub AIVAD',
    amountEur: 12.5,
  });
  const [simKmMonth, setSimKmMonth] = useState(4200);
  const [simGrossPerKm, setSimGrossPerKm] = useState(1.18);

  // Vehicle Catalog Filters + Resale Estimator Odometers + Add Form
  const [vehFilters, setVehFilters] = useState({
    searchQuery: '',
    countryCode: 'ALL',
    platformId: 'ALL',
    category: 'ALL',
    fuelType: 'ALL',
    minSeats: 4,
    minTrunkLiters: 0,
    minRangeKm: 0,
    colorQuery: '',
    onlyEligible: false,
  });
  const [resaleOdometers, setResaleOdometers] = useState<Record<string, number>>({});
  const [vehForm, setVehForm] = useState({
    brand: 'Kia',
    model: 'Niro EV',
    version: 'Drive 64.8 kWh',
    year: currentYear - 1,
    powerKw: 150,
    rangeKm: 460,
    realRangeKm: 375,
    consumptionPer100Km: 16.2,
    fuelType: 'Elétrico' as FuelType,
    seats: 5,
    doors: 5,
    trunkLiters: 475,
    monthlyLeaseOrFinanceEur: 490,
    insuranceAnnualEur: 1350,
    city: state.localization.currentLocation.city || 'Lisboa',
  });

  // Vehicle Comparator selection
  const [compareIds, setCompareIds] = useState<string[]>(
    state.vehicles.slice(0, 3).map((v) => v.id)
  );

  // ==========================================================
  // CENTRAL DE RELATÓRIOS (9 Sub-relatórios, 9 Presets, Drill-Down, Config Custos)
  // ==========================================================
  if (activeTab === 'relatorios') {
    const r = comprehensiveReports;
    const rf = state.reportFilters;
    const cc = state.financialCostConfig;

    const exportTrips = r.completedTrips;
    const headers = [
      'Ref',
      'Data',
      'Hora',
      'Plataforma',
      'Categoria',
      'Moeda Orig.',
      'Bruto',
      'Gorjeta',
      'Bónus',
      'Comissão',
      'Líquido',
    ];
    const rows = exportTrips.map((t) => [
      t.externalRef,
      t.date,
      t.time,
      t.platformId.toUpperCase(),
      t.category,
      t.currency ?? currency,
      (t.originalGrossAmount ?? t.grossEur).toFixed(2),
      t.tipEur.toFixed(2),
      t.bonusEur.toFixed(2),
      t.commissionEur.toFixed(2),
      (t.originalNetAmount ?? t.netEur).toFixed(2),
    ]);

    const formatDelta = (deltaPct: number | null, deltaVal: number, isCurrency = true) => {
      const sign = deltaVal >= 0 ? '+' : '';
      const valStr = isCurrency ? `${sign}${formatMoney(deltaVal, currency)}` : `${sign}${deltaVal}`;
      const pctStr = deltaPct !== null ? ` (${deltaPct >= 0 ? '+' : ''}${deltaPct}%)` : '';
      return `${valStr}${pctStr} vs período ant.`;
    };

    const allCats = Array.from(new Set(activeDriverTrips.map((t) => t.category)));

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Central Analítica — 9 Relatórios Operacionais & Drill-Down Auditável"
          description="Filtre por 9 janelas temporais com comparação automática ao período anterior equivalente, separe dados Reais vs Demo, ajuste custos incluídos no líquido e clique em qualquer indicador ou linha para auditar as viagens de origem."
        />

        {/* Filters & Export Bar */}
        <Card className="p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtros temporais">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => updateReportFilters({ preset: p.id })}
                  className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                    rf.preset === p.id
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportToCsv('aivad-relatorio-viagens.csv', headers, rows)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                type="button"
                onClick={() => exportToXlsx('aivad-relatorio-viagens.xlsx', 'Viagens AIVAD', headers, rows)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> XLSX Real
              </button>
              <button
                type="button"
                onClick={() =>
                  exportPrintablePdfReport(
                    'Relatório Operacional AIVAD',
                    `${r.period.label} (${r.period.startDate} a ${r.period.endDate}) · ${exportTrips.length} viagens concluídas · Âmbito: ${rf.dataScope}`,
                    headers,
                    rows
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                PDF / Imprimir
              </button>
              <button
                type="button"
                onClick={() =>
                  exportReportAsPng(
                    `aivad-resumo-${todayIso}.png`,
                    'AIVAD — Resumo Operacional',
                    `${r.period.label} (${r.period.startDate}–${r.period.endDate})`,
                    [
                      { label: 'Receita Bruta', value: formatMoney(r.summary.totalRevenue, currency) },
                      { label: 'Líquido Config.', value: formatMoney(r.financialDetailed.configuredNetEur, currency) },
                      { label: 'Média / Hora', value: `${formatMoney(r.summary.avgPerHour, currency)}/h` },
                      { label: 'Média / Dist.', value: formatDistanceRate(r.summary.avgPerKm, currency, unitSystem) },
                    ],
                    r.byPlatform.map((p) => ({
                      label: `${p.platformName} (${p.tripsCount} viagens)`,
                      value: `${formatMoney(p.netEur, currency)} líq.`,
                    }))
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                PNG
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 items-end">
            {rf.preset === 'personalizado' && (
              <>
                <div>
                  <label htmlFor="rep-cstart" className="block mb-1 font-medium">Data Início</label>
                  <input
                    id="rep-cstart"
                    type="date"
                    value={rf.customStart}
                    onChange={(e) => updateReportFilters({ customStart: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="rep-cend" className="block mb-1 font-medium">Data Fim</label>
                  <input
                    id="rep-cend"
                    type="date"
                    value={rf.customEnd}
                    onChange={(e) => updateReportFilters({ customEnd: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="rep-scope" className="block mb-1 font-medium">Âmbito de Dados</label>
              <select
                id="rep-scope"
                value={rf.dataScope}
                onChange={(e) => updateReportFilters({ dataScope: e.target.value as DataScopeFilter })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="all">Todos (Reais + Demo)</option>
                <option value="real">Apenas Reais</option>
                <option value="demo">Apenas Demonstração</option>
              </select>
            </div>

            <div>
              <label htmlFor="rep-plat" className="block mb-1 font-medium">Plataforma</label>
              <select
                id="rep-plat"
                value={rf.platformId}
                onChange={(e) => updateReportFilters({ platformId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="ALL">Todas plataformas</option>
                {state.platforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rep-cat" className="block mb-1 font-medium">Categoria</label>
              <select
                id="rep-cat"
                value={rf.category}
                onChange={(e) => updateReportFilters({ category: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="ALL">Todas categorias</option>
                {allCats.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rep-st" className="block mb-1 font-medium">Estado</label>
              <select
                id="rep-st"
                value={rf.tripStatusFilter}
                onChange={(e) => updateReportFilters({ tripStatusFilter: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="ALL">Todos os estados</option>
                <option value="COMPLETED">Apenas Concluídas/Ajustadas</option>
                <option value="CANCELLED">Apenas Canceladas/Perdidas</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-2 lg:col-span-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Período: {r.period.startDate} → {r.period.endDate}
              </span>
              <span>(vs {r.period.prevStartDate} → {r.period.prevEndDate})</span>
            </div>
          </div>
        </Card>

        {/* 9 Sub-Report Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sub-relatórios AIVAD">
          {REPORT_SUBTABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={reportSubTab === tab.id}
              onClick={() => setReportSubTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                reportSubTab === tab.id
                  ? 'bg-slate-900 dark:bg-blue-700 text-white border-slate-900 dark:border-blue-700'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. GERAL */}
        {reportSubTab === 'geral' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                {
                  title: 'Receita Total Bruta',
                  value: formatMoney(r.summary.totalRevenue, currency),
                  delta: r.comparison.totalRevenue,
                  formula: 'Soma(Tarifa + Gorjetas + Bónus) apenas de viagens Concluídas/Ajustadas',
                  trips: r.completedTrips,
                  isCurrency: true,
                },
                {
                  title: 'Líquido Operacional',
                  value: formatMoney(r.financialDetailed.configuredNetEur, currency),
                  delta: r.comparison.netEstimated,
                  formula: 'Receita Total - Custos selecionados em Configuração Financeira',
                  trips: r.completedTrips,
                  isCurrency: true,
                },
                {
                  title: 'Viagens Concluídas',
                  value: `${r.summary.tripCount}`,
                  delta: r.comparison.tripCount,
                  formula: `Contagem de viagens concluídas/ajustadas (${r.excludedTrips.length} canceladas/rejeitadas excluídas)`,
                  trips: r.completedTrips,
                  isCurrency: false,
                },
                {
                  title: 'Média Horária Bruta',
                  value: `${formatMoney(r.summary.avgPerHour, currency)}/h`,
                  delta: r.comparison.avgPerHour,
                  formula: 'Receita Total ÷ Horas produtivas em viagem concluída',
                  trips: r.completedTrips,
                  isCurrency: true,
                },
                {
                  title: 'Rácio por Distância',
                  value: formatDistanceRate(r.summary.avgPerKm, currency, unitSystem),
                  delta: r.comparison.avgPerKm,
                  formula: 'Receita Total ÷ (Km Recolha + Km Passageiro)',
                  trips: r.completedTrips,
                  isCurrency: true,
                },
              ].map((kpi) => (
                <button
                  key={kpi.title}
                  type="button"
                  onClick={() =>
                    setDrillModal({
                      title: kpi.title,
                      formula: kpi.formula,
                      trips: kpi.trips,
                    })
                  }
                  className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-colors space-y-1.5"
                >
                  <span className="text-[11px] font-semibold text-slate-500 block">{kpi.title}</span>
                  <span className="text-xl font-extrabold font-mono-tabular block text-slate-900 dark:text-white">
                    {kpi.value}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-mono-tabular font-semibold ${
                      kpi.delta.delta >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {kpi.delta.delta >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {formatDelta(kpi.delta.deltaPct, kpi.delta.delta, kpi.isCurrency)}
                  </span>
                  <span className="text-[10px] text-blue-700 dark:text-blue-400 block">
                    Clique para auditar ({kpi.trips.length} viagens) →
                  </span>
                </button>
              ))}
            </div>

            <Card className="p-5 space-y-2 text-xs">
              <h3 className="text-sm font-bold">Resumo do Período ({r.period.label})</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Total de <strong>{r.filteredTrips.length}</strong> registos no filtro ({r.completedTrips.length} concluídas e{' '}
                <strong>{r.excludedTrips.length}</strong> não concluídas excluídas dos ganhos).
                Âmbito ativo: <strong>{rf.dataScope === 'all' ? 'Todos' : rf.dataScope === 'real' ? 'Apenas Reais' : 'Apenas Demo'}</strong>.
              </p>
            </Card>
          </div>
        )}

        {/* 2. POR PLATAFORMA */}
        {reportSubTab === 'plataforma' && (
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold">Comparativo por Plataforma (Clique para Drill-Down)</h3>
              <HorizontalBreakdownBars
                items={r.byPlatform.map((p) => ({
                  id: p.platformId,
                  label: `${p.platformName} (${p.tripsCount} concl. · ${p.cancelledCount} canc.)`,
                  sublabel: `Gorjetas ${formatMoney(p.tipsEur, currency)} · Líq. ${formatMoney(p.netEur, currency)}`,
                  value: p.grossEur + p.tipsEur + p.bonusEur,
                  formattedValue: formatMoney(p.grossEur + p.tipsEur + p.bonusEur, currency),
                  color: p.color,
                }))}
                onSelect={(pid) => {
                  const found = r.byPlatform.find((x) => x.platformId === pid);
                  if (found) {
                    setDrillModal({
                      title: `Viagens em ${found.platformName}`,
                      formula: `Receita Líquida = Bruto + Gorjetas + Bónus - Comissões - Custo Operacional`,
                      trips: found.trips,
                    });
                  }
                }}
              />
            </Card>

            <Card className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Plataforma</th>
                    <th className="p-3">Concluídas / Canc.</th>
                    <th className="p-3">Bruto</th>
                    <th className="p-3">Gorjetas + Bónus</th>
                    <th className="p-3">Comissões</th>
                    <th className="p-3">Líquido</th>
                    <th className="p-3">€/h · €/km</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {r.byPlatform.map((p) => (
                    <tr
                      key={p.platformId}
                      onClick={() =>
                        setDrillModal({
                          title: `Viagens em ${p.platformName}`,
                          formula: 'Agregação de viagens concluídas e canceladas da plataforma no período.',
                          trips: p.trips,
                        })
                      }
                      className="cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                    >
                      <td className="p-3 font-bold">{p.platformName}</td>
                      <td className="p-3 font-mono-tabular">{p.tripsCount} / {p.cancelledCount}</td>
                      <td className="p-3 font-mono-tabular">{formatMoney(p.grossEur, currency)}</td>
                      <td className="p-3 font-mono-tabular">{formatMoney(p.tipsEur + p.bonusEur, currency)}</td>
                      <td className="p-3 font-mono-tabular text-red-700 dark:text-red-400">-{formatMoney(p.commissionsEur, currency)}</td>
                      <td className="p-3 font-mono-tabular font-bold text-blue-700 dark:text-blue-400">{formatMoney(p.netEur, currency)}</td>
                      <td className="p-3 font-mono-tabular">{formatMoney(p.eurPerHour, currency)}/h · {formatDistanceRate(p.eurPerKm, currency, unitSystem)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* 3. ESTADOS & CANCELAMENTOS */}
        {reportSubTab === 'cancelamentos' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                label="Não Concluídas (Excluídas)"
                value={`${r.cancellations.totalCancelledOrLost}`}
                subtext="Excluídas dos ganhos líquidos"
                accent="red"
                explanation="Viagens canceladas, expiradas, rejeitadas ou sem comparência nunca entram nos ganhos faturados."
                formula="Contagem de registos com estado diferente de Concluída/Ajustada no período."
              />
              <MetricCard
                label="No-Show Passageiro"
                value={`${r.cancellations.noShowCount}`}
                subtext={`Espera média: ${r.cancellations.avgWaitBeforeCancelMin} min`}
                explanation="Registos em que o motorista confirmou chegada e aguardou sem comparência do passageiro."
                formula="Total de registos marcados como Passageiro não compareceu + média de espera no local."
              />
              <MetricCard
                label="Rejeitadas / Expiradas"
                value={`${r.cancellations.rejectedCount} / ${r.cancellations.expiredCount}`}
                subtext="Decisões pré-viagem"
                explanation="Propostas recusadas pelo motorista ou que expiraram antes de aceitação."
                formula="Contagem separada por estado Rejeitada e Expirada no período selecionado."
              />
              <MetricCard
                label="Compensações Registadas"
                value={formatMoney(r.cancellations.totalCompensationEur, currency)}
                subtext="Taxas declaradas pelo motorista/extrato"
                accent="blue"
                explanation="Compensações de cancelamento declaradas manualmente pelo motorista ou extrato."
                formula="Soma das taxas de compensação registadas nos cancelamentos do período."
              />
            </div>

            <StatusLabel tone="warning" text={r.cancellations.officialImpactCaveat} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              <Card className="p-5 space-y-3">
                <h3 className="text-sm font-bold">Cancelamentos por Atribuição (Clique para auditar)</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(r.cancellations.byActor).map(([actor, info]) => (
                    <button
                      key={actor}
                      type="button"
                      onClick={() =>
                        setDrillModal({
                          title: `Cancelamentos — Atribuição: ${actor}`,
                          formula: 'Registos cancelados/rejeitados/no-show agrupados por ator responsável.',
                          trips: info.trips,
                        })
                      }
                      className="w-full text-left py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded"
                    >
                      <span className="font-semibold">{actor} ({info.count})</span>
                      <span className="font-mono-tabular">
                        Bruto perdido est.: {formatMoney(info.estimatedLostGrossEur, currency)} · Comp.: {formatMoney(info.compensationEur, currency)}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-5 space-y-3">
                <h3 className="text-sm font-bold">Distribuição por Estado da Viagem</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {r.byStatus.map((st) => (
                    <button
                      key={st.status}
                      type="button"
                      onClick={() =>
                        setDrillModal({
                          title: `Estado: ${st.status}`,
                          formula: 'Agrupamento direto pelo estado registado em cada viagem.',
                          trips: st.trips,
                        })
                      }
                      className="w-full text-left py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded"
                    >
                      <span className="font-semibold">{st.status} ({st.count})</span>
                      <span className="font-mono-tabular">
                        Bruto ref.: {formatMoney(st.estimatedGrossLostEur, currency)}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* 4. FINANCEIRO AVANÇADO (Estimado vs Cobrado + Cost Toggles) */}
        {reportSubTab === 'financeiro_sub' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
            <Card className="lg:col-span-5 p-5 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Configuração de Custos no Cálculo Líquido
              </h3>
              <p className="text-slate-500">Ative ou desative parcelas de custo em tempo real para avaliar margem real.</p>
              <div className="space-y-2">
                {(
                  [
                    ['includeCommissions', 'Deduzir comissões de plataformas'],
                    ['includeEstimatedVehicleCost', 'Deduzir custo operacional estimado por km'],
                    ['includeFixedOwnership', 'Deduzir custo fixo propriedade/aluguer/seguro'],
                    ['includeTolls', 'Deduzir portagens'],
                    ['includeLoggedExpenses', 'Deduzir despesas lançadas manualmente'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={cc[key]}
                      onChange={(e) => updateFinancialCostConfig({ [key]: e.target.checked })}
                    />
                  </label>
                ))}
                <div>
                  <label htmlFor="fin-tax-res" className="block font-medium mb-1">
                    Reserva Fiscal / Impostos (% sobre pré-imposto): {cc.includeTaxesReservePct}%
                  </label>
                  <input
                    id="fin-tax-res"
                    type="range"
                    min={0}
                    max={35}
                    step={1}
                    value={cc.includeTaxesReservePct}
                    onChange={(e) => updateFinancialCostConfig({ includeTaxesReservePct: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-7 p-5 space-y-4">
              <h3 className="text-sm font-bold">Decomposição Financeira + Estimado vs Cobrado</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500 block">Estimado (Propostas)</span>
                  <span className="text-base font-bold font-mono-tabular">{formatMoney(r.financialDetailed.estimatedTripsSumEur, currency)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500 block">Cobrado Real</span>
                  <span className="text-base font-bold font-mono-tabular">{formatMoney(r.financialDetailed.chargedTripsSumEur, currency)}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40">
                  <span className="text-slate-500 block">Desvio Cobrado vs Est.</span>
                  <span className="text-base font-bold font-mono-tabular text-blue-700 dark:text-blue-400">
                    {r.financialDetailed.varianceChargedVsEstimatedEur >= 0 ? '+' : ''}
                    {formatMoney(r.financialDetailed.varianceChargedVsEstimatedEur, currency)}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="py-2 flex justify-between"><span>Receita Bruta Integrada</span><span className="font-mono-tabular font-bold">{formatMoney(r.financialDetailed.grossRevenueEur, currency)}</span></div>
                <div className="py-2 flex justify-between"><span>(-) Comissões</span><span className="font-mono-tabular">-{formatMoney(r.financialDetailed.commissionsDeductedEur, currency)}</span></div>
                <div className="py-2 flex justify-between"><span>(-) Energia &amp; Desgaste/km</span><span className="font-mono-tabular">-{formatMoney(r.financialDetailed.estimatedVehicleCostDeductedEur, currency)}</span></div>
                <div className="py-2 flex justify-between"><span>(-) Propriedade Fixa</span><span className="font-mono-tabular">-{formatMoney(r.financialDetailed.fixedOwnershipDeductedEur, currency)}</span></div>
                <div className="py-2 flex justify-between"><span>(-) Portagens</span><span className="font-mono-tabular">-{formatMoney(r.financialDetailed.tollsDeductedEur, currency)}</span></div>
                <div className="py-2 flex justify-between"><span>(-) Despesas Lançadas</span><span className="font-mono-tabular">-{formatMoney(r.financialDetailed.loggedExpensesDeductedEur, currency)}</span></div>
                <div className="py-2 flex justify-between"><span>(-) Reserva Fiscal ({cc.includeTaxesReservePct}%)</span><span className="font-mono-tabular">-{formatMoney(r.financialDetailed.taxReserveDeductedEur, currency)}</span></div>
                <div className="py-2.5 flex justify-between text-base font-extrabold text-blue-700 dark:text-blue-400">
                  <span>Líquido Configurado</span>
                  <span className="font-mono-tabular">{formatMoney(r.financialDetailed.configuredNetEur, currency)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 5. RENTABILIDADE */}
        {reportSubTab === 'rentabilidade' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold">Por Faixa Horária</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {r.profitability.byHourSlot.map((sl) => (
                  <button
                    key={sl.slot}
                    type="button"
                    onClick={() =>
                      setDrillModal({
                        title: `Faixa Horária: ${sl.slot}`,
                        formula: 'Receita ÷ Horas produtivas nesta janela horária.',
                        trips: sl.trips,
                      })
                    }
                    className="w-full text-left py-2 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-1 rounded"
                  >
                    <span>{sl.slot} ({sl.tripsCount})</span>
                    <span className="font-mono-tabular font-bold">{formatMoney(sl.eurPerHour, currency)}/h</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold">Por Zona de Recolha</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {r.profitability.byZone.map((z) => (
                  <button
                    key={z.zone}
                    type="button"
                    onClick={() =>
                      setDrillModal({
                        title: `Zona: ${z.zone}`,
                        formula: 'Soma líquida de viagens concluídas iniciadas na zona.',
                        trips: z.trips,
                      })
                    }
                    className="w-full text-left py-2 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-1 rounded"
                  >
                    <span>{z.zone} ({z.tripsCount})</span>
                    <span className="font-mono-tabular font-bold">{formatMoney(z.netEur, currency)}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold">Por Categoria</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {r.profitability.byCategory.map((c) => (
                  <button
                    key={c.category}
                    type="button"
                    onClick={() =>
                      setDrillModal({
                        title: `Categoria: ${c.category}`,
                        formula: 'Receita líquida e €/km por categoria comercial.',
                        trips: c.trips,
                      })
                    }
                    className="w-full text-left py-2 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-1 rounded"
                  >
                    <span>{c.category} ({c.tripsCount})</span>
                    <span className="font-mono-tabular font-bold">{formatDistanceRate(c.eurPerKm, currency, unitSystem)}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* 6. ESTRATÉGIA & IA */}
        {reportSubTab === 'estrategia' && (
          <Card className="p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold">Estratégia Ativa &amp; Desvio Previsto vs Real (AI CORE)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                label="Modo Estratégia"
                value={r.strategyAndAi.strategyMode}
                subtext={`${r.strategyAndAi.adjustmentsCount} ajustes registados`}
                explanation="Modo operacional de assistência configurado pelo motorista no ecossistema."
                formula="Configuração ativa + contagem de registos no histórico de calibração."
              />
              <MetricCard
                label="Propostas Analisadas"
                value={`${r.strategyAndAi.totalProposalsEvaluated}`}
                subtext={`Aceites: ${r.strategyAndAi.acceptedProposals} · Recusadas: ${r.strategyAndAi.rejectedProposals}`}
                explanation="Volume de propostas avaliadas pelo motor de rentabilidade e retorno em vazio."
                formula="Total de propostas capturadas com decomposição Aceites vs Recusadas."
              />
              <MetricCard
                label="Desvio Médio Previsão"
                value={r.strategyAndAi.avgNetPredictionDeltaEur !== null ? formatMoney(r.strategyAndAi.avgNetPredictionDeltaEur, currency) : 'Sem amostra'}
                subtext="Real vs Previsto líquido"
                explanation="Diferença média entre o valor líquido previsto pré-decisão e o resultado real após conclusão."
                formula="Média de (Líquido Real − Líquido Previsto) nas viagens com registo pré-decisão."
              />
              <MetricCard
                label="Viagens Calibradas"
                value={`${r.strategyAndAi.predictedVsActualTrips.length}`}
                subtext="Com snapshot pré-decisão"
                explanation="Amostra real usada para calibrar o modelo exclusivo deste motorista."
                formula="Contagem de viagens concluídas ligadas a uma previsão pré-aceitação."
              />
            </div>
            {r.strategyAndAi.predictedVsActualTrips.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {r.strategyAndAi.predictedVsActualTrips.map((row) => (
                  <div key={row.tripId} className="py-2 flex justify-between font-mono-tabular">
                    <span>{row.externalRef}</span>
                    <span>
                      Prev.: {formatMoney(row.predictedNetEur, currency)} → Real: {formatMoney(row.actualNetEur, currency)} ({row.deltaNetEur >= 0 ? '+' : ''}{formatMoney(row.deltaNetEur, currency)})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 7. ATIVIDADE TVDE */}
        {reportSubTab === 'tvde' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Janela Móvel 24h"
              value={`${r.tvdeActivity.rolling24h.rolling24hWorkMinutes} min`}
              subtext={r.tvdeActivity.rolling24h.alertLevel}
              accent={r.tvdeActivity.rolling24h.alertLevel !== 'Limite 10h Atingido' ? 'blue' : 'red'}
              explanation="Tempo de condução e disponibilidade consolidado sem duplicar sessões simultâneas entre apps."
              formula="União cronológica de intervalos ativos nas últimas 24 horas (teto legal: 600 min)."
            />
            <MetricCard
              label="Margem Legal Restante"
              value={`${r.tvdeActivity.rolling24h.remainingLegalMinutes} min`}
              subtext="Limite 10h / 24h (Art. 13.º)"
              explanation="Disponibilidade operacional restante antes de atingir o limite regulamentar TVDE de 10 horas."
              formula="max(0, 600 − minutos consolidados na janela deslizante de 24 horas)."
            />
            <MetricCard
              label="Jornada Consolidada"
              value={`${r.tvdeActivity.consolidated.consolidatedOnlineMinutes} min`}
              subtext={`Sobreposição eliminada: ${r.tvdeActivity.consolidated.overlapEliminatedMinutes} min`}
              explanation="Tempo real total online entre plataformas, removendo minutos contados em duplicado."
              formula="Soma bruta multi-app − minutos de sobreposição temporal."
            />
            <MetricCard
              label="Pausas & Descanso"
              value={`${r.tvdeActivity.consolidated.breakMinutes + r.tvdeActivity.consolidated.mealMinutes} min`}
              subtext={`Trabalho s/ condução: ${r.tvdeActivity.consolidated.workWithoutDrivingMinutes} min`}
              explanation="Soma de pausas operacionais e refeições registadas durante o turno."
              formula="Minutos em Pausa + Refeição; trabalho sem condução separado das viagens."
            />
          </div>
        )}

        {/* 8. VEÍCULO & ENERGIA */}
        {reportSubTab === 'veiculo_sub' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Viatura Ativa"
              value={r.vehicleAndEnergy.activeVehicleName}
              subtext={`TCO est.: ${formatDistanceRate(r.vehicleAndEnergy.tcoPerKmEur, currency, unitSystem)}`}
              explanation="Custo total estimado por quilómetro do veículo ativo considerando energia, desgaste e propriedade."
              formula="(Custo energia/km + desgaste) + (mensalidade e seguro divididos pelos km mensais)."
            />
            <MetricCard
              label="Autonomia Real vs WLTP"
              value={formatDistance(r.vehicleAndEnergy.realRangeKm, unitSystem)}
              subtext={`WLTP: ${formatDistance(r.vehicleAndEnergy.homologatedRangeKm, unitSystem)}`}
              accent="blue"
              explanation="Autonomia urbana real prevista face ao valor oficial de homologação WLTP."
              formula="Autonomia real configurada/ajustada separada da ficha técnica oficial."
            />
            <MetricCard
              label="Km no Período (% Vazio)"
              value={formatDistance(r.vehicleAndEnergy.totalKmInPeriod, unitSystem)}
              subtext={`${r.vehicleAndEnergy.emptyKmPct}% em deslocação sem passageiro`}
              explanation="Quilometragem total registada com separação da percentagem de recolha/retorno sem passageiro."
              formula="(Km de recolha + retorno em vazio) ÷ km totais × 100."
            />
            <MetricCard
              label="Despesa Energia/Combustível"
              value={formatMoney(r.vehicleAndEnergy.energyLoggedExpensesEur, currency)}
              subtext="Registos lançados no período"
              explanation="Total de carregamentos elétricos ou abastecimentos efetivamente lançados nas despesas."
              formula="Soma das despesas da categoria Energia e Combustível no intervalo selecionado."
            />
          </div>
        )}

        {/* 9. METAS & PROJEÇÃO */}
        {reportSubTab === 'metas' && (
          <Card className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5">
                <GoalDonutChart
                  currentValue={r.goalsAndProjection.currentPeriodNetEur}
                  targetValue={r.goalsAndProjection.monthlyTargetEur}
                  formattedCurrent={formatMoney(r.goalsAndProjection.currentPeriodNetEur, currency)}
                  formattedTarget={formatMoney(r.goalsAndProjection.monthlyTargetEur, currency)}
                  label="Progresso vs Meta Mensal"
                />
              </div>
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500 block">Cenário Conservador (-15%)</span>
                  <span className="text-base font-bold font-mono-tabular">{formatMoney(r.goalsAndProjection.conservativeProjectedMonthEur, currency)}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40">
                  <span className="text-slate-500 block">Cenário Base (22d úteis)</span>
                  <span className="text-base font-bold font-mono-tabular text-blue-700 dark:text-blue-400">{formatMoney(r.goalsAndProjection.baseProjectedMonthEur, currency)}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                  <span className="text-slate-500 block">Cenário Otimizado (+15%)</span>
                  <span className="text-base font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400">{formatMoney(r.goalsAndProjection.optimizedProjectedMonthEur, currency)}</span>
                </div>
              </div>
            </div>
            <StatusLabel
              tone={r.goalsAndProjection.isSampleThin ? 'warning' : 'info'}
              text={r.goalsAndProjection.projectionCaveat}
            />
          </Card>
        )}

        {/* Drill-Down Modal */}
        {drillModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={drillModal.title}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold">{drillModal.title}</h3>
                  <p className="text-[11px] text-slate-500">Fórmula: {drillModal.formula}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrillModal(null)}
                  aria-label="Fechar detalhe"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-auto p-4 text-xs">
                {drillModal.trips.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">Nenhuma viagem associada no filtro atual.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2">Ref</th>
                        <th className="p-2">Data/Hora</th>
                        <th className="p-2">Plataforma</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Bruto</th>
                        <th className="p-2">Líquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {drillModal.trips.map((t) => (
                        <tr key={t.id}>
                          <td className="p-2 font-mono-tabular font-semibold">{t.externalRef}</td>
                          <td className="p-2 font-mono-tabular">{t.date} {t.time}</td>
                          <td className="p-2">{t.platformId.toUpperCase()} · {t.category}</td>
                          <td className="p-2">{t.status}</td>
                          <td className="p-2 font-mono-tabular">{formatMoney(t.grossEur, t.currency ?? currency)}</td>
                          <td className="p-2 font-mono-tabular font-bold">{formatMoney(t.netEur, t.currency ?? currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================
  // FINANCEIRO INTEGRADO + TRANSPARÊNCIA "COMO FOI CALCULADO?"
  // ==========================================================
  if (activeTab === 'financeiro') {
    const activeVeh = state.vehicles.find((v) => v.isActiveDriverVehicle) ?? state.vehicles[0];
    const tco = computeVehicleOwnershipTcoPerKm(activeVeh);
    const simEnergyCost = round2(simKmMonth * tco.energyCostPerKmEur);
    const simMaintCost = round2(simKmMonth * tco.maintenancePerKmEur);
    const simFixedCost = round2(activeVeh.monthlyLeaseOrFinanceEur + activeVeh.insuranceAnnualEur / 12);
    const simGross = round2(simKmMonth * simGrossPerKm);
    const simCommission = round2(simGross * 0.22);
    const simNet = round2(simGross - simCommission - simEnergyCost - simMaintCost - simFixedCost);

    const expenseByCat = state.expenses.reduce<Record<string, number>>((acc, ex) => {
      acc[ex.category] = round2((acc[ex.category] ?? 0) + ex.amountEur);
      return acc;
    }, {});

    const openExplain = (kpiKey: 'totalRevenue' | 'netEstimated' | 'avgPerHour' | 'avgPerKm') => {
      setActiveExplanation(
        explainFinancialCalculation(kpiKey, activeDriverTrips, state.expenses, activeMarket.code)
      );
    };

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Gestão Financeira Integrada & Transparência Auditável"
          description="Clique em 'Como foi calculado?' em qualquer indicador para auditar fórmulas, pressupostos, moeda e exclusão automática de viagens canceladas."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <MetricCard
              label="Receita Total Integrada"
              value={formatMoney(financialSummary.totalRevenue, currency)}
              subtext={`${financialSummary.tripCount} concluídas (${financialSummary.cancelledOrLostCount} excl.)`}
              explanation="Soma de tarifas, gorjetas reconciliadas e bónus."
              formula="Bruto + Gorjetas + Bónus"
              accent="blue"
            />
            <button
              type="button"
              onClick={() => openExplain('totalRevenue')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline px-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Como foi calculado?
            </button>
          </div>

          <div className="space-y-1.5">
            <MetricCard
              label="Resultado Líquido Estimado"
              value={formatMoney(financialSummary.netEstimated, currency)}
              subtext={`Despesas: ${formatMoney(financialSummary.loggedExpenses, currency)}`}
              explanation="Lucro operacional estimado após comissões, energia e despesas."
              formula="Receita - Comissões - Custo/Km - Despesas"
            />
            <button
              type="button"
              onClick={() => openExplain('netEstimated')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline px-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Como foi calculado?
            </button>
          </div>

          <div className="space-y-1.5">
            <MetricCard
              label="Média Horária Bruta"
              value={`${formatMoney(financialSummary.avgPerHour, currency)}/h`}
              subtext={`${financialSummary.totalHours.toFixed(1)}h em viagem`}
              explanation="Receita bruta total por hora produtiva."
              formula="Receita ÷ Horas Produtivas"
            />
            <button
              type="button"
              onClick={() => openExplain('avgPerHour')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline px-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Como foi calculado?
            </button>
          </div>

          <div className="space-y-1.5">
            <MetricCard
              label="Rácio por Distância"
              value={formatDistanceRate(financialSummary.avgPerKm, currency, unitSystem)}
              subtext={`${formatDistance(financialSummary.totalKm, unitSystem)} totais`}
              explanation="Receita média por distância total comprometida."
              formula="Receita ÷ (Recolha + Passageiro)"
            />
            <button
              type="button"
              onClick={() => openExplain('avgPerKm')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline px-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Como foi calculado?
            </button>
          </div>
        </div>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold">Estrutura Visual de Custos por Categoria</h3>
          <HorizontalBreakdownBars
            items={Object.entries(expenseByCat).map(([cat, total]) => ({
              id: cat,
              label: cat,
              value: total,
              formattedValue: formatMoney(total, currency),
              color: '#DC2626',
            }))}
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-6 p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Registar Nova Despesa ({currency})
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!expForm.description.trim() || expForm.amountEur <= 0) return;
                addExpense({
                  date: todayIso,
                  category: expForm.category,
                  description: expForm.description,
                  amountEur: expForm.amountEur,
                  currency,
                  originalAmount: expForm.amountEur,
                  vehicleId: activeVeh.id,
                  deductible: true,
                });
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
            >
              <div>
                <label htmlFor="exp-cat" className="block mb-1 font-medium">Categoria</label>
                <select
                  id="exp-cat"
                  value={expForm.category}
                  onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value as ExpenseRecord['category'] }))}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {[
                    'Aluguer',
                    'Financiamento',
                    'Energia',
                    'Combustível',
                    'Portagens',
                    'Estacionamento',
                    'Seguro',
                    'Manutenção',
                    'Pneus',
                    'Limpeza',
                    'Contabilidade',
                    'Impostos',
                    'Outras despesas',
                  ].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="exp-desc" className="block mb-1 font-medium">Descrição</label>
                <input
                  id="exp-desc"
                  type="text"
                  value={expForm.description}
                  onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="exp-amt" className="block mb-1 font-medium">Valor ({symbol})</label>
                <input
                  id="exp-amt"
                  type="number"
                  step="0.1"
                  value={expForm.amountEur}
                  onChange={(e) => setExpForm((f) => ({ ...f, amountEur: Number(e.target.value) }))}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
                >
                  Adicionar Despesa
                </button>
              </div>
            </form>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs pt-2">
              {state.expenses.map((ex) => (
                <div key={ex.id} className="py-2 flex justify-between gap-2">
                  <div>
                    <span className="font-semibold">{ex.category}</span> · {ex.description}
                    <span className="text-slate-400 ml-2">{ex.date}</span>
                  </div>
                  <span className="font-mono-tabular font-semibold">
                    {formatHistoricalMoney(
                      ex.amountEur,
                      ex.originalAmount ?? ex.amountEur,
                      ex.currency ?? 'EUR',
                      currency
                    )}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-6 p-5 space-y-4">
            <h3 className="text-sm font-bold">
              Simulador Mensal de Cenários ({activeVeh.brand} {activeVeh.model} · {tco.ownershipLabel})
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="sim-km" className="block mb-1 font-medium">
                  Distância mensal ({formatDistance(simKmMonth, unitSystem)})
                </label>
                <input
                  id="sim-km"
                  type="range"
                  min={1500}
                  max={9000}
                  step={100}
                  value={simKmMonth}
                  onChange={(e) => setSimKmMonth(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="sim-rate" className="block mb-1 font-medium">
                  Faturação Bruta ({symbol}/km)
                </label>
                <input
                  id="sim-rate"
                  type="number"
                  step="0.05"
                  value={simGrossPerKm}
                  onChange={(e) => setSimGrossPerKm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </div>
            </div>
            <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span>Faturação Bruta Simulada</span>
                <span className="font-mono-tabular font-semibold">{formatMoney(simGross, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Comissão Média (22%)</span>
                <span className="font-mono-tabular">-{formatMoney(simCommission, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  Energia / Combustível ({activeVeh.energyTariffProfile ?? 'Padrão'}:{' '}
                  {formatDistanceRate(tco.energyCostPerKmEur, currency, unitSystem)})
                </span>
                <span className="font-mono-tabular">-{formatMoney(simEnergyCost, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Manutenção Estimada</span>
                <span className="font-mono-tabular">-{formatMoney(simMaintCost, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Renda/Financiamento + Seguro Mensal</span>
                <span className="font-mono-tabular">-{formatMoney(simFixedCost, currency)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-bold text-blue-700 dark:text-blue-400">
                <span>Líquido Mensal Projetado</span>
                <span className="font-mono-tabular">{formatMoney(simNet, currency)}</span>
              </div>
            </div>
          </Card>
        </div>

        <CalculationExplanationModal
          explanation={activeExplanation}
          onClose={() => setActiveExplanation(null)}
        />
      </div>
    );
  }

  // ==========================================================
  // VEÍCULOS (Filtros Avançados, Cor, Validade Mercado, Revenda, Autonomia & TCO)
  // ==========================================================
  if (activeTab === 'veiculos') {
    const filteredVehicles = filterVehiclesCatalog(state.vehicles, vehFilters, state.platforms);
    const availableCats = Array.from(
      new Set(state.platforms.filter((p) => p.status === 'Ativa').flatMap((p) => p.categories))
    );

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Base Técnica de Veículos — Elegibilidade, Cor, Autonomia Real & Estimador de Revenda"
          description="Filtra por país, plataforma, categoria comercial, lugares, bagageira, autonomia real e cor. Distingue estimativa algorítmica de revenda de preço anunciado ou transação real."
        />

        <Card className="p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Pesquisar veículos"
                placeholder="Pesquisar marca, modelo, versão, equipamento..."
                value={vehFilters.searchQuery}
                onChange={(e) => setVehFilters((f) => ({ ...f, searchQuery: e.target.value }))}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={vehFilters.onlyEligible}
                onChange={(e) => setVehFilters((f) => ({ ...f, onlyEligible: e.target.checked }))}
              />
              <span>Apenas elegíveis TVDE</span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <select
              aria-label="Filtrar por país"
              value={vehFilters.countryCode}
              onChange={(e) => setVehFilters((f) => ({ ...f, countryCode: e.target.value }))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Todos países</option>
              {state.countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>

            <select
              aria-label="Filtrar por plataforma"
              value={vehFilters.platformId}
              onChange={(e) => setVehFilters((f) => ({ ...f, platformId: e.target.value }))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Todas plataformas</option>
              {state.platforms.filter((p) => p.status === 'Ativa').map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              aria-label="Filtrar por categoria comercial"
              value={vehFilters.category}
              onChange={(e) => setVehFilters((f) => ({ ...f, category: e.target.value }))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Todas categorias</option>
              {availableCats.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              aria-label="Filtrar por motorização"
              value={vehFilters.fuelType}
              onChange={(e) => setVehFilters((f) => ({ ...f, fuelType: e.target.value }))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Todas motorizações</option>
              {['Elétrico', 'Híbrido', 'Plug-in', 'Gasolina', 'Gasóleo', 'GPL', 'Bi-fuel'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <input
              type="number"
              aria-label="Lugares mínimos"
              min={4}
              max={9}
              placeholder="Lugares mín."
              value={vehFilters.minSeats}
              onChange={(e) => setVehFilters((f) => ({ ...f, minSeats: Number(e.target.value) }))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />

            <input
              type="number"
              aria-label="Autonomia real mínima (km)"
              min={0}
              step={50}
              placeholder="Autonomia mín. km"
              value={vehFilters.minRangeKm || ''}
              onChange={(e) => setVehFilters((f) => ({ ...f, minRangeKm: Number(e.target.value) || 0 }))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />

            <input
              type="text"
              aria-label="Filtrar por cor"
              placeholder="Cor (ex: Branco, Preto)"
              value={vehFilters.colorQuery}
              onChange={(e) => setVehFilters((f) => ({ ...f, colorQuery: e.target.value }))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVehicles.map((v) => {
            const marketCfg = state.countries.find((c) => c.code === v.countryCode);
            const elig = evaluateVehicleEligibility(
              v,
              currentYear,
              state.platforms,
              marketCfg?.vehicleMaxAgeYears
            );
            const tco = computeVehicleOwnershipTcoPerKm(v);
            const odoKm = resaleOdometers[v.id] ?? v.odometerKm ?? 55000;
            const resale = estimateVehicleResaleValue(v, odoKm, currentYear);

            return (
              <Card key={v.id} className="p-5 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold">{v.brand} {v.model}</h3>
                    <p className="text-slate-500">
                      {v.version} · {v.year} · {v.fuelType} · Cor: <strong>{v.color}</strong> · {v.seats}L / {v.trunkLiters}L mala · {v.city}/{v.countryCode}
                    </p>
                  </div>
                  {v.isActiveDriverVehicle ? (
                    <StatusLabel tone="success" text="Veículo Ativo" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveVehicle(v.id)}
                      className="px-2.5 py-1 rounded bg-blue-700 text-white font-medium"
                    >
                      Ativar
                    </button>
                  )}
                </div>

                {/* Homologated vs Real Range Box */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Homologada (WLTP)</span>
                    <span className="font-mono-tabular font-bold">
                      {formatDistance(v.homologatedRangeKm ?? v.rangeKm, unitSystem)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Autonomia Real TVDE</span>
                    <span className="font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                      {formatDistance(v.realRangeKm ?? v.rangeKm, unitSystem)}
                    </span>
                  </div>
                  <p className="col-span-2 text-[11px] text-slate-500">
                    Fonte: {v.rangeSource ?? 'Estimativa AIVAD'} · TCO Real:{' '}
                    <strong className="font-mono-tabular">
                      {formatDistanceRate(tco.totalEstimatedCostPerKmEur, currency, unitSystem)}
                    </strong>
                  </p>
                </div>

                {/* Color Rule & Version+Market Expiry */}
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusLabel
                      tone={
                        elig.eligibilityStatus === 'Elegível'
                          ? 'success'
                          : elig.eligibilityStatus === 'Não elegível'
                          ? 'danger'
                          : 'warning'
                      }
                      text={`${elig.eligibilityStatus} (${v.countryCode})`}
                    />
                    {elig.expiresOnDate && (
                      <span className="font-mono-tabular text-[11px] text-slate-600 dark:text-slate-300">
                        Válido até: <strong>{elig.expiresOnDate}</strong>
                      </span>
                    )}
                  </div>
                  {v.colorRule && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      <strong>Regra de Cor ({v.colorRule.status}):</strong> Permitidas {v.colorRule.permitted.join(', ')}
                      {v.colorRule.mandatory?.length ? ` · Obrigatória: ${v.colorRule.mandatory.join(', ')}` : ''} ({v.colorRule.source})
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">{elig.tvdeReasons[0]}</p>
                </div>

                {/* Live Resale & Depreciation Estimator */}
                <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-blue-900 dark:text-blue-200">
                      Estimador de Revenda &amp; Depreciação
                    </span>
                    <StatusLabel tone="info" text={resale.valuationType} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`odo-${v.id}`} className="text-[11px] font-medium whitespace-nowrap">
                      Odómetro (km):
                    </label>
                    <input
                      id={`odo-${v.id}`}
                      type="number"
                      step={5000}
                      min={0}
                      value={odoKm}
                      onChange={(e) =>
                        setResaleOdometers((prev) => ({ ...prev, [v.id]: Number(e.target.value) || 0 }))
                      }
                      className="w-28 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                    />
                    <span className="text-[11px] text-slate-500">
                      Deprec. ~{resale.annualDepreciationRatePct}%/ano
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono-tabular text-center">
                    <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 block">Mínimo</span>
                      <span className="font-bold">{formatMoney(resale.minValueEur, currency)}</span>
                    </div>
                    <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700">
                      <span className="text-[10px] text-blue-700 dark:text-blue-400 block">Médio Est.</span>
                      <span className="font-bold text-blue-700 dark:text-blue-400">{formatMoney(resale.midValueEur, currency)}</span>
                    </div>
                    <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 block">Máximo</span>
                      <span className="font-bold">{formatMoney(resale.maxValueEur, currency)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">{resale.caveats[0]}</p>
                </div>

                {/* Ownership & Tariff Profile Live Controls */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`own-${v.id}`} className="block text-[11px] font-medium mb-1">
                      Regime de Propriedade
                    </label>
                    <select
                      id={`own-${v.id}`}
                      value={v.ownership ?? 'Financiada'}
                      onChange={(e) =>
                        updateVehicle(v.id, { ownership: e.target.value as VehicleRecord['ownership'] })
                      }
                      className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="Própria">Própria</option>
                      <option value="Financiada">Financiada</option>
                      <option value="Alugada">Alugada</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`tar-${v.id}`} className="block text-[11px] font-medium mb-1">
                      Perfil Tarifário Energia
                    </label>
                    <select
                      id={`tar-${v.id}`}
                      value={v.energyTariffProfile ?? 'Garagem'}
                      onChange={(e) => {
                        const nextProfile = e.target.value as VehicleRecord['energyTariffProfile'];
                        updateVehicle(v.id, {
                          energyTariffProfile: nextProfile,
                          energyCostPerUnitEur: getEnergyUnitPriceByTariff(nextProfile, v.energyCostPerUnitEur),
                        });
                      }}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="Doméstico">Doméstico (€0.17/kWh)</option>
                      <option value="Garagem">Garagem (€0.21/kWh)</option>
                      <option value="Público AC">Público AC (€0.34/kWh)</option>
                      <option value="Rápido DC">Rápido DC (€0.56/kWh)</option>
                      <option value="Combustível">Combustível (€1.72/L)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(elig.platformEligibility).map(([platId, res]) => {
                      const plat = state.platforms.find((p) => p.id === platId);
                      return (
                        <span
                          key={platId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]"
                        >
                          <PlatformBadge
                            platformId={platId}
                            name={plat?.name ?? platId}
                            shortCode={plat?.shortCode}
                            brandColor={plat?.brandColor}
                            size="sm"
                          />
                          <span>
                            <strong>{plat?.name ?? platId.toUpperCase()}:</strong>{' '}
                            {res.eligible ? res.categories.join(', ') : 'Inelegível'}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Car className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Adicionar Veículo à Base Técnica ({activeMarket.code})
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addVehicle({
                ...vehForm,
                firstRegistration: `${vehForm.year}-01-15`,
                consumptionUnit: vehForm.fuelType === 'Elétrico' ? 'kWh' : 'L',
                color: 'Branco',
                equipment: ['AC Automático', 'Sensores'],
                maintenancePerKmEur: vehForm.fuelType === 'Elétrico' ? 0.04 : 0.06,
                energyCostPerUnitEur: vehForm.fuelType === 'Elétrico' ? 0.21 : 1.72,
                depreciationMonthlyEur: 220,
                ownership: 'Financiada',
                energyTariffProfile: vehForm.fuelType === 'Elétrico' ? 'Garagem' : 'Combustível',
                homologatedRangeKm: vehForm.rangeKm,
                rangeSource: 'Registo manual do motorista',
                rangeUpdatedAt: todayIso,
                countryCode: activeMarket.code,
                isActiveDriverVehicle: false,
              });
            }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs"
          >
            <div>
              <label htmlFor="v-brand" className="block mb-1 font-medium">Marca</label>
              <input
                id="v-brand"
                type="text"
                value={vehForm.brand}
                onChange={(e) => setVehForm((f) => ({ ...f, brand: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="v-model" className="block mb-1 font-medium">Modelo</label>
              <input
                id="v-model"
                type="text"
                value={vehForm.model}
                onChange={(e) => setVehForm((f) => ({ ...f, model: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="v-fuel" className="block mb-1 font-medium">Motorização</label>
              <select
                id="v-fuel"
                value={vehForm.fuelType}
                onChange={(e) => setVehForm((f) => ({ ...f, fuelType: e.target.value as FuelType }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {['Elétrico', 'Híbrido', 'Plug-in', 'Gasolina', 'Gasóleo', 'GPL', 'Bi-fuel'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="v-year" className="block mb-1 font-medium">Ano</label>
              <input
                id="v-year"
                type="number"
                value={vehForm.year}
                onChange={(e) => setVehForm((f) => ({ ...f, year: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div className="col-span-2 sm:col-span-4">
              <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold">
                Adicionar Veículo
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ==========================================================
  // COMPARADOR DE VEÍCULOS (Mobile Cards + Desktop Table)
  // ==========================================================
  const selectedVehicles = state.vehicles.filter((v) => compareIds.includes(v.id));
  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="Comparador de Veículos — TCO Real, Autonomia & Elegibilidade Multi-Plataforma"
        description="Compara custo por distância completo (energia + manutenção + propriedade), autonomia real vs homologada e elegibilidade comercial."
      />

      <Card className="p-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold flex items-center gap-1.5">
          <GitCompare className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          Selecionar veículos a comparar:
        </span>
        {state.vehicles.map((v) => {
          const checked = compareIds.includes(v.id);
          return (
            <label key={v.id} className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  setCompareIds((prev) =>
                    checked ? prev.filter((id) => id !== v.id) : [...prev, v.id]
                  )
                }
              />
              <span>{v.brand} {v.model} ({v.year})</span>
            </label>
          );
        })}
      </Card>

      {/* Mobile Cards (< md) */}
      <div className="md:hidden space-y-3">
        {selectedVehicles.map((v) => {
          const tco = computeVehicleOwnershipTcoPerKm(v);
          const mkt = state.countries.find((c) => c.code === v.countryCode);
          const el = evaluateVehicleEligibility(v, currentYear, state.platforms, mkt?.vehicleMaxAgeYears);
          return (
            <Card key={v.id} className="p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-sm">{v.brand} {v.model} ({v.year})</h3>
                <StatusLabel tone={el.tvdeLegalEligible ? 'success' : 'danger'} text={el.tvdeLegalEligible ? 'Elegível' : 'Inelegível'} />
              </div>
              <p className="text-slate-500">
                {v.fuelType} · Real: {formatDistance(v.realRangeKm ?? v.rangeKm, unitSystem)} (WLTP {formatDistance(v.homologatedRangeKm ?? v.rangeKm, unitSystem)})
              </p>
              <p className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                TCO Total: {formatDistanceRate(tco.totalEstimatedCostPerKmEur, currency, unitSystem)} ({tco.ownershipLabel})
              </p>
            </Card>
          );
        })}
      </div>

      {/* Desktop Comparison Table (>= md) */}
      <Card className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Critério</th>
              {selectedVehicles.map((v) => (
                <th key={v.id} className="p-3 font-bold">
                  {v.brand} {v.model} ({v.year})
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            <tr>
              <td className="p-3 font-medium">Autonomia Real vs Homologada</td>
              {selectedVehicles.map((v) => (
                <td key={v.id} className="p-3 font-mono-tabular">
                  {v.fuelType} · Real {formatDistance(v.realRangeKm ?? v.rangeKm, unitSystem)} / WLTP{' '}
                  {formatDistance(v.homologatedRangeKm ?? v.rangeKm, unitSystem)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-3 font-medium">Custo Energia + Manutenção + Propriedade (TCO)</td>
              {selectedVehicles.map((v) => {
                const tco = computeVehicleOwnershipTcoPerKm(v);
                return (
                  <td key={v.id} className="p-3 font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                    {formatDistanceRate(tco.totalEstimatedCostPerKmEur, currency, unitSystem)} ({tco.ownershipLabel})
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="p-3 font-medium">Aluguer / Financiamento + Seguro</td>
              {selectedVehicles.map((v) => (
                <td key={v.id} className="p-3 font-mono-tabular">
                  {formatMoney(v.monthlyLeaseOrFinanceEur, currency)}/mês + {formatMoney(v.insuranceAnnualEur, currency)}/ano
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-3 font-medium">Elegibilidade Legal</td>
              {selectedVehicles.map((v) => {
                const mkt = state.countries.find((c) => c.code === v.countryCode);
                const el = evaluateVehicleEligibility(v, currentYear, state.platforms, mkt?.vehicleMaxAgeYears);
                return (
                  <td key={v.id} className="p-3">
                    <StatusLabel
                      tone={el.tvdeLegalEligible ? 'success' : 'danger'}
                      text={el.tvdeLegalEligible ? 'Elegível' : 'Não elegível'}
                    />
                  </td>
                );
              })}
            </tr>
            {state.platforms
              .filter((p) => p.status === 'Ativa')
              .slice(0, 5)
              .map((plat) => (
                <tr key={plat.id}>
                  <td className="p-3 font-medium">Elegibilidade Comercial {plat.name}</td>
                  {selectedVehicles.map((v) => {
                    const mkt = state.countries.find((c) => c.code === v.countryCode);
                    const el = evaluateVehicleEligibility(v, currentYear, state.platforms, mkt?.vehicleMaxAgeYears);
                    const pEl = el.platformEligibility[plat.id];
                    return (
                      <td key={v.id} className="p-3">
                        {pEl?.eligible ? pEl.categories.join(', ') : pEl?.reasons[0] ?? 'N/D'}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
