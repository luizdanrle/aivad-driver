import React, { useMemo, useState } from 'react';
import { Car, ChevronRight, Download, FileSpreadsheet, GitCompare, Wallet } from 'lucide-react';
import {
  exportPrintablePdfReport,
  exportReportAsPng,
  exportToCsv,
  exportToXlsx,
} from '../../../core/exportUtils';
import { evaluateVehicleEligibility, round2 } from '../../../core/intelligence';
import type { ExpenseRecord, FuelType } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import {
  Card,
  ContextualHelpBanner,
  MetricCard,
  SegmentedFilter,
  StatusLabel,
} from '../../ui/DesignSystem';

export const DriverFinanceAndFleet: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const { state, financialSummary, addExpense, addVehicle, setActiveVehicle } = useEcosystem();

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

  // Vehicle Add Form
  const [vehForm, setVehForm] = useState({
    brand: 'Kia',
    model: 'Niro EV',
    version: 'Drive 64.8 kWh',
    year: 2024,
    powerKw: 150,
    rangeKm: 460,
    consumptionPer100Km: 16.2,
    fuelType: 'Elétrico' as FuelType,
    seats: 5,
    doors: 5,
    trunkLiters: 475,
    monthlyLeaseOrFinanceEur: 490,
    insuranceAnnualEur: 1350,
    city: 'Lisboa',
  });

  // Vehicle Comparator selection
  const [compareIds, setCompareIds] = useState<string[]>(
    state.vehicles.slice(0, 3).map((v) => v.id)
  );

  const platformBreakdown = useMemo(() => {
    const map = new Map<string, { platform: string; trips: number; gross: number; tips: number; net: number }>();
    for (const t of state.trips) {
      const cur = map.get(t.platformId) ?? {
        platform: t.platformId.toUpperCase(),
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
  }, [state.trips]);

  if (activeTab === 'relatorios') {
    const drillTrips = state.trips.filter((t) => {
      if (drillPlatform && t.platformId !== drillPlatform) return false;
      if (drillDate && t.date !== drillDate) return false;
      return true;
    });

    const headers = ['Ref', 'Data', 'Hora', 'Plataforma', 'Categoria', 'Bruto (€)', 'Gorjeta (€)', 'Bónus (€)', 'Comissão (€)', 'Líquido (€)'];
    const rows = drillTrips.map((t) => [
      t.externalRef,
      t.date,
      t.time,
      t.platformId.toUpperCase(),
      t.category,
      t.grossEur.toFixed(2),
      t.tipEur.toFixed(2),
      t.bonusEur.toFixed(2),
      t.commissionEur.toFixed(2),
      t.netEur.toFixed(2),
    ]);

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Relatórios Hierárquicos & Exportações Profissionais"
          description="Navegue de Mês → Plataforma → Dia → Viagem individual. Exporte em CSV, XLSX verdadeiro, PDF/Impressão ou imagem PNG."
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
                  `Novembro 2026 · ${drillTrips.length} viagens`,
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
                  'aivad-resumo-nov-2026.png',
                  'AIVAD — Resumo Operacional',
                  `Período: Novembro 2026 · ${drillTrips.length} viagens`,
                  [
                    { label: 'Receita Total', value: `€${financialSummary.totalRevenue.toFixed(2)}` },
                    { label: 'Líquido Est.', value: `€${financialSummary.netEstimated.toFixed(2)}` },
                    { label: 'Média / Hora', value: `€${financialSummary.avgPerHour.toFixed(2)}` },
                    { label: 'Média / Km', value: `€${financialSummary.avgPerKm.toFixed(2)}` },
                  ],
                  platformBreakdown.map((p) => ({
                    label: `${p.platform} (${p.trips} viagens)`,
                    value: `€${p.net.toFixed(2)} líq.`,
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
            Novembro 2026
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
            Desagregação por Plataforma (Clique numa barra para filtrar até às viagens)
          </h3>
          <div className="space-y-3">
            {platformBreakdown.map((p) => {
              const max = Math.max(...platformBreakdown.map((x) => x.gross), 1);
              const w = Math.round((p.gross / max) * 100);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDrillPlatform(drillPlatform === p.id ? null : p.id)}
                  className="w-full text-left space-y-1 group"
                >
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-400">
                      {p.platform} ({p.trips} viagens)
                    </span>
                    <span className="font-mono-tabular">
                      Bruto €{p.gross.toFixed(2)} · Gorjetas €{p.tips.toFixed(2)} · Líquido €{p.net.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-3 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        drillPlatform === p.id ? 'bg-red-600' : 'bg-blue-700'
                      }`}
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
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
                  <td className="p-3 font-mono-tabular">€{t.grossEur.toFixed(2)}</td>
                  <td className="p-3 font-mono-tabular">€{t.tipEur.toFixed(2)}</td>
                  <td className="p-3 font-mono-tabular">€{t.bonusEur.toFixed(2)}</td>
                  <td className="p-3 font-mono-tabular">€{t.commissionEur.toFixed(2)}</td>
                  <td className="p-3 font-mono-tabular font-bold">€{t.netEur.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  if (activeTab === 'financeiro') {
    const activeVeh = state.vehicles.find((v) => v.isActiveDriverVehicle) ?? state.vehicles[0];
    const simEnergyCost = round2((simKmMonth / 100) * activeVeh.consumptionPer100Km * activeVeh.energyCostPerUnitEur);
    const simMaintCost = round2(simKmMonth * activeVeh.maintenancePerKmEur);
    const simFixedCost = round2(activeVeh.monthlyLeaseOrFinanceEur + activeVeh.insuranceAnnualEur / 12);
    const simGross = round2(simKmMonth * simGrossPerKm);
    const simCommission = round2(simGross * 0.22);
    const simNet = round2(simGross - simCommission - simEnergyCost - simMaintCost - simFixedCost);

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Gestão Financeira Integrada & Simulador de Rentabilidade"
          description="Receitas provenientes de viagens, gorjetas e campanhas cruzadas com todas as categorias de despesas TVDE."
        />

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Receita Total Integrada"
            value={`€${financialSummary.totalRevenue.toFixed(2)}`}
            subtext={`Gorjetas: €${financialSummary.tipsTotal.toFixed(2)} · Bónus: €${financialSummary.bonusTotal.toFixed(2)}`}
            explanation="Soma de tarifas, gorjetas reconciliadas e bónus."
            formula="Bruto + Gorjetas + Bónus"
            accent="blue"
          />
          <MetricCard
            label="Comissões Plataformas"
            value={`€${financialSummary.commissionsTotal.toFixed(2)}`}
            subtext="Calculado conforme taxa de cada plataforma"
            explanation="Total retido pelas plataformas intermediárias."
            formula="Σ (Bruto × % Comissão)"
          />
          <MetricCard
            label="Despesas Registadas"
            value={`€${financialSummary.loggedExpenses.toFixed(2)}`}
            subtext={`${state.expenses.length} lançamentos`}
            explanation="Despesas operacionais e fixas lançadas pelo motorista."
            formula="Σ Despesas"
          />
          <MetricCard
            label="Resultado Líquido Estimado"
            value={`€${financialSummary.netEstimated.toFixed(2)}`}
            subtext="Após comissões, energia e despesas"
            explanation="Lucro operacional estimado no período atual."
            formula="Receita - Comissões - Custo/Km - Despesas"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-6 p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Registar Nova Despesa
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!expForm.description.trim() || expForm.amountEur <= 0) return;
                addExpense({
                  date: '2026-11-14',
                  category: expForm.category,
                  description: expForm.description,
                  amountEur: expForm.amountEur,
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
                <label htmlFor="exp-amt" className="block mb-1 font-medium">Valor (€)</label>
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
                  <span className="font-mono-tabular font-semibold">€{ex.amountEur.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-6 p-5 space-y-4">
            <h3 className="text-sm font-bold">Simulador Mensal de Cenários ({activeVeh.brand} {activeVeh.model})</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="sim-km" className="block mb-1 font-medium">Km mensais ({simKmMonth} km)</label>
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
                <label htmlFor="sim-rate" className="block mb-1 font-medium">Faturação Bruta (€/km)</label>
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
                <span className="font-mono-tabular font-semibold">€{simGross.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Comissão Média (22%)</span>
                <span className="font-mono-tabular">-€{simCommission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Energia / Combustível ({activeVeh.consumptionPer100Km} {activeVeh.consumptionUnit}/100km)</span>
                <span className="font-mono-tabular">-€{simEnergyCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Manutenção Estimada</span>
                <span className="font-mono-tabular">-€{simMaintCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Renda/Financiamento + Seguro Mensal</span>
                <span className="font-mono-tabular">-€{simFixedCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-bold text-blue-700 dark:text-blue-400">
                <span>Líquido Mensal Projetado</span>
                <span className="font-mono-tabular">€{simNet.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === 'veiculos') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Base de Dados Técnica de Veículos"
          description="Suporta Elétricos, Híbridos, Plug-in, Gasolina, Gasóleo, GPL e Bi-fuel. Defina o veículo ativo para alimentar a Calculadora e o Planeador."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.vehicles.map((v) => {
            const elig = evaluateVehicleEligibility(v);
            return (
              <Card key={v.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold">{v.brand} {v.model}</h3>
                    <p className="text-xs text-slate-500">
                      {v.version} · {v.year} · {v.fuelType} · {v.city}/{v.countryCode}
                    </p>
                  </div>
                  {v.isActiveDriverVehicle ? (
                    <StatusLabel tone="success" text="Veículo Ativo" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveVehicle(v.id)}
                      className="px-2.5 py-1 rounded bg-blue-700 text-white text-xs font-medium"
                    >
                      Ativar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono-tabular">
                  <div><span className="text-slate-500 block">Potência</span>{v.powerKw} kW</div>
                  <div><span className="text-slate-500 block">Autonomia</span>{v.rangeKm} km</div>
                  <div><span className="text-slate-500 block">Consumo</span>{v.consumptionPer100Km} {v.consumptionUnit}/100</div>
                  <div><span className="text-slate-500 block">Lotação/Portas</span>{v.seats}L / {v.doors}P</div>
                  <div><span className="text-slate-500 block">Bagageira</span>{v.trunkLiters} L</div>
                  <div><span className="text-slate-500 block">Renda/Mês</span>€{v.monthlyLeaseOrFinanceEur}</div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <StatusLabel
                    tone={elig.tvdeLegalEligible ? 'success' : 'danger'}
                    text={elig.tvdeLegalEligible ? 'Elegível Legal TVDE' : 'Fora do limite legal TVDE'}
                  />
                  <p className="text-slate-500">
                    Uber: {elig.platformEligibility.uber.categories.join(', ') || 'Nenhuma'} · Bolt: {elig.platformEligibility.bolt.categories.join(', ') || 'Nenhuma'}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Car className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Adicionar Veículo à Base Técnica
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
                countryCode: 'PT',
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

  // COMPARADOR DE VEÍCULOS
  const selectedVehicles = state.vehicles.filter((v) => compareIds.includes(v.id));
  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="Comparador de Veículos — TCO, Elegibilidade Legal TVDE & Categorias Comerciais"
        description="Separa rigorosamente a elegibilidade legal TVDE da elegibilidade comercial das plataformas Uber e Bolt por cidade e ano."
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

      <Card className="overflow-x-auto">
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
              <td className="p-3 font-medium">Motorização &amp; Autonomia</td>
              {selectedVehicles.map((v) => (
                <td key={v.id} className="p-3">{v.fuelType} · {v.rangeKm} km</td>
              ))}
            </tr>
            <tr>
              <td className="p-3 font-medium">Custo Energia + Manutenção / km</td>
              {selectedVehicles.map((v) => {
                const cpk = (v.consumptionPer100Km / 100) * v.energyCostPerUnitEur + v.maintenancePerKmEur;
                return <td key={v.id} className="p-3 font-mono-tabular">€{cpk.toFixed(3)}/km</td>;
              })}
            </tr>
            <tr>
              <td className="p-3 font-medium">Aluguer / Financiamento + Depreciação</td>
              {selectedVehicles.map((v) => (
                <td key={v.id} className="p-3 font-mono-tabular">
                  €{v.monthlyLeaseOrFinanceEur}/mês (+ €{v.depreciationMonthlyEur} depr.)
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-3 font-medium">Seguro Anual Estimado</td>
              {selectedVehicles.map((v) => (
                <td key={v.id} className="p-3 font-mono-tabular">€{v.insuranceAnnualEur}/ano</td>
              ))}
            </tr>
            <tr>
              <td className="p-3 font-medium">Elegibilidade Legal TVDE</td>
              {selectedVehicles.map((v) => {
                const el = evaluateVehicleEligibility(v);
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
            <tr>
              <td className="p-3 font-medium">Elegibilidade Comercial Uber</td>
              {selectedVehicles.map((v) => {
                const el = evaluateVehicleEligibility(v);
                return <td key={v.id} className="p-3">{el.platformEligibility.uber.categories.join(', ')}</td>;
              })}
            </tr>
            <tr>
              <td className="p-3 font-medium">Elegibilidade Comercial Bolt</td>
              {selectedVehicles.map((v) => {
                const el = evaluateVehicleEligibility(v);
                return <td key={v.id} className="p-3">{el.platformEligibility.bolt.categories.join(', ')}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
};
