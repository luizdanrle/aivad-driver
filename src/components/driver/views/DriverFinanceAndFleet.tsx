import React, { useMemo, useState } from 'react';
import {
  Car,
  ChevronRight,
  Download,
  FileSpreadsheet,
  GitCompare,
  HelpCircle,
  Search,
  Wallet,
} from 'lucide-react';
import {
  exportPrintablePdfReport,
  exportReportAsPng,
  exportToCsv,
  exportToXlsx,
} from '../../../core/exportUtils';
import {
  computeVehicleOwnershipTcoPerKm,
  evaluateVehicleEligibility,
  explainFinancialCalculation,
  getEnergyUnitPriceByTariff,
  isCompletedTripStatus,
  round2,
  type FinancialCalculationExplanation,
} from '../../../core/intelligence';
import {
  formatDistance,
  formatDistanceRate,
  formatHistoricalMoney,
  formatMoney,
  getCurrentMonthLabel,
  getTodayIso,
} from '../../../core/localization';
import type { ExpenseRecord, FuelType, VehicleRecord } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import { HorizontalBreakdownBars, PlatformBadge } from '../../ui/ChartsAndVisuals';
import {
  CalculationExplanationModal,
  Card,
  ContextualHelpBanner,
  MetricCard,
  SegmentedFilter,
  StatusLabel,
} from '../../ui/DesignSystem';

export const DriverFinanceAndFleet: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    activeMarket,
    activeDriverTrips,
    financialSummary,
    addExpense,
    addVehicle,
    updateVehicle,
    setActiveVehicle,
  } = useEcosystem();

  const todayIso = getTodayIso();
  const currentMonthLabel = getCurrentMonthLabel();
  const currentYear = new Date().getFullYear();

  const currency = activeMarket.currency;
  const symbol = activeMarket.currencySymbol;
  const unitSystem = state.localization.unitSystem;

  // Calculation Explanation Modal state ("Como foi calculado?")
  const [activeExplanation, setActiveExplanation] =
    useState<FinancialCalculationExplanation | null>(null);

  // Reports Hierarchy Drill-down: Mês -> Plataforma -> Dia -> Viagem
  const [reportScope, setReportScope] = useState<'mensal' | 'plataforma' | 'categoria' | 'campanhas'>('mensal');
  const [drillPlatform, setDrillPlatform] = useState<string | null>(null);
  const [drillDate, setDrillDate] = useState<string | null>(null);

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

  // Vehicle Catalog Search & Fuel Filter + Add Form
  const [vehSearch, setVehSearch] = useState('');
  const [vehFuelFilter, setVehFuelFilter] = useState<string>('ALL');
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

  const completedTrips = useMemo(
    () => activeDriverTrips.filter((t) => isCompletedTripStatus(t.status)),
    [activeDriverTrips]
  );

  const platformBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { platform: string; color?: string; trips: number; gross: number; tips: number; net: number }
    >();
    for (const t of completedTrips) {
      const plat = state.platforms.find((p) => p.id === t.platformId);
      const cur = map.get(t.platformId) ?? {
        platform: plat?.name ?? t.platformId.toUpperCase(),
        color: plat?.brandColor,
        trips: 0,
        gross: 0,
        tips: 0,
        net: 0,
      };
      cur.trips += 1;
      cur.gross = round2(cur.gross + t.grossEur + t.bonusEur);
      cur.tips = round2(cur.tips + t.tipEur);
      cur.net = round2(cur.net + t.netEur);
      map.set(t.platformId, cur);
    }
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }));
  }, [completedTrips, state.platforms]);

  // ==========================================================
  // RELATÓRIOS & EXPORTAÇÕES
  // ==========================================================
  if (activeTab === 'relatorios') {
    const drillTrips = completedTrips.filter((t) => {
      if (drillPlatform && t.platformId !== drillPlatform) return false;
      if (drillDate && t.date !== drillDate) return false;
      return true;
    });

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
    const rows = drillTrips.map((t) => [
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

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Relatórios Hierárquicos & Exportações Profissionais"
          description="Navegue de Mês → Plataforma → Dia → Viagem individual. Exclui viagens canceladas dos totais e exporta em CSV, XLSX real, PDF/Impressão ou PNG na moeda original."
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedFilter
            value={reportScope}
            onChange={(v) => setReportScope(v as typeof reportScope)}
            options={[
              { id: 'mensal', label: 'Mensal / Diário' },
              { id: 'plataforma', label: 'Por Plataforma' },
              { id: 'categoria', label: 'Por Categoria' },
              { id: 'campanhas', label: 'Campanhas' },
            ]}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportToCsv('aivad-relatorio-viagens.csv', headers, rows)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={() => exportToXlsx('aivad-relatorio-viagens.xlsx', 'Viagens AIVAD', headers, rows)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> XLSX Real
            </button>
            <button
              type="button"
              onClick={() =>
                exportPrintablePdfReport(
                  'Relatório Operacional AIVAD',
                  `${currentMonthLabel} · ${drillTrips.length} viagens concluídas · Mercado ${activeMarket.name}`,
                  headers,
                  rows
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              PDF / Imprimir
            </button>
            <button
              type="button"
              onClick={() =>
                exportReportAsPng(
                  `aivad-resumo-${todayIso.slice(0, 7)}.png`,
                  'AIVAD — Resumo Operacional',
                  `Período: ${currentMonthLabel} · ${drillTrips.length} viagens`,
                  [
                    { label: 'Receita Total', value: formatMoney(financialSummary.totalRevenue, currency) },
                    { label: 'Líquido Est.', value: formatMoney(financialSummary.netEstimated, currency) },
                    { label: 'Média / Hora', value: `${formatMoney(financialSummary.avgPerHour, currency)}/h` },
                    { label: 'Média / Dist.', value: formatDistanceRate(financialSummary.avgPerKm, currency, unitSystem) },
                  ],
                  platformBreakdown.map((p) => ({
                    label: `${p.platform} (${p.trips} viagens)`,
                    value: `${formatMoney(p.net, currency)} líq.`,
                  }))
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              PNG
            </button>
          </div>
        </div>

        {/* Drill-down Breadcrumb */}
        <Card className="p-4 flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setDrillPlatform(null);
              setDrillDate(null);
            }}
            className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
          >
            {currentMonthLabel}
          </button>
          {drillPlatform && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                type="button"
                onClick={() => setDrillDate(null)}
                className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
              >
                {drillPlatform.toUpperCase()}
              </button>
            </>
          )}
          {drillDate && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">{drillDate}</span>
            </>
          )}
        </Card>

        {/* Interactive Bar Chart per Platform */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold">
            Desagregação por Plataforma (Clique numa barra para filtrar)
          </h3>
          <HorizontalBreakdownBars
            items={platformBreakdown.map((p) => ({
              id: p.id,
              label: `${p.platform} (${p.trips} viagens)`,
              sublabel: `Gorjetas ${formatMoney(p.tips, currency)} · Líquido ${formatMoney(p.net, currency)}`,
              value: p.gross,
              formattedValue: formatMoney(p.gross, currency),
              color: p.color,
            }))}
            selectedId={drillPlatform}
            onSelect={(id) => setDrillPlatform(drillPlatform === id ? null : id)}
          />
        </Card>

        {/* Underlying Records Table */}
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="p-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {drillTrips.map((t) => (
                <tr key={t.id}>
                  <td className="p-3 font-mono-tabular font-semibold">{t.externalRef}</td>
                  <td className="p-3 font-mono-tabular">
                    <button
                      type="button"
                      onClick={() => setDrillDate(drillDate === t.date ? null : t.date)}
                      className="text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      {t.date}
                    </button>
                  </td>
                  <td className="p-3 font-mono-tabular">{t.time}</td>
                  <td className="p-3">{t.platformId.toUpperCase()}</td>
                  <td className="p-3">{t.category}</td>
                  <td className="p-3 font-mono-tabular">{t.currency ?? 'EUR'}</td>
                  <td className="p-3 font-mono-tabular">
                    {formatHistoricalMoney(
                      t.grossEur,
                      t.originalGrossAmount ?? t.grossEur,
                      t.currency ?? 'EUR',
                      currency
                    )}
                  </td>
                  <td className="p-3 font-mono-tabular">{formatMoney(t.tipEur, t.currency ?? 'EUR')}</td>
                  <td className="p-3 font-mono-tabular">{formatMoney(t.bonusEur, t.currency ?? 'EUR')}</td>
                  <td className="p-3 font-mono-tabular">{formatMoney(t.commissionEur, t.currency ?? 'EUR')}</td>
                  <td className="p-3 font-mono-tabular font-bold">
                    {formatHistoricalMoney(
                      t.netEur,
                      t.originalNetAmount ?? t.netEur,
                      t.currency ?? 'EUR',
                      currency
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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
  // VEÍCULOS (Autonomia Real vs Homologada, Propriedade, Perfil Energia, TCO)
  // ==========================================================
  if (activeTab === 'veiculos') {
    const filteredVehicles = state.vehicles.filter((v) => {
      const q = vehSearch.trim().toLowerCase();
      if (q && !`${v.brand} ${v.model} ${v.version} ${v.city}`.toLowerCase().includes(q)) return false;
      if (vehFuelFilter !== 'ALL' && v.fuelType !== vehFuelFilter) return false;
      return true;
    });

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Base Técnica de Veículos — Autonomia Real vs Homologada & Custo TCO/km"
          description="Separa autonomia homologada (WLTP) da autonomia real observada, adapta custo por perfil de carregamento/combustível e distingue viatura Própria, Financiada ou Alugada."
        />

        <Card className="p-4 flex flex-wrap items-center gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Pesquisar veículos"
              placeholder="Pesquisar marca, modelo ou cidade..."
              value={vehSearch}
              onChange={(e) => setVehSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <select
            aria-label="Filtrar por motorização"
            value={vehFuelFilter}
            onChange={(e) => setVehFuelFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="ALL">Todas motorizações</option>
            {['Elétrico', 'Híbrido', 'Plug-in', 'Gasolina', 'Gasóleo', 'GPL', 'Bi-fuel'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
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
            return (
              <Card key={v.id} className="p-5 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold">{v.brand} {v.model}</h3>
                    <p className="text-slate-500">
                      {v.version} · {v.year} · {v.fuelType} · {v.city}/{v.countryCode}
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
                  <StatusLabel
                    tone={elig.tvdeLegalEligible ? 'success' : 'danger'}
                    text={elig.tvdeLegalEligible ? `Elegível Legal (${v.countryCode})` : `Fora do limite legal (${v.countryCode})`}
                  />
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
