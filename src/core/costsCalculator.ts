import type {
  CostFrequency,
  CostsCalculatorConfig,
  OperatorCostItem,
  VehicleRecord,
} from '../models/types';

function round2(val: number): number {
  return Math.round((Number.isFinite(val) ? val : 0) * 100) / 100;
}

export function normalizeAmountToMonthly(
  amount: number,
  frequency: CostFrequency,
  workDaysPerMonth: number
): number {
  const safeAmt = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const safeDays = Math.max(1, workDaysPerMonth);
  const weeksPerMonth = safeDays / 5.2;
  switch (frequency) {
    case 'diária':
      return safeAmt * safeDays;
    case 'semanal':
      return safeAmt * Math.max(4, weeksPerMonth);
    case 'mensal':
      return safeAmt;
    case 'anual':
      return safeAmt / 12;
    default:
      return safeAmt;
  }
}

export function createDefaultCostsCalculatorConfig(activeVehicle?: VehicleRecord): CostsCalculatorConfig {
  const isEv = activeVehicle?.fuelType === 'Elétrico';
  return {
    targetMonthlyNetIncome: 1850,
    workDaysPerMonth: 22,
    hoursPerDay: 9,
    avgKmPerDay: 185,
    averagePlatformCommissionPct: 22,
    taxRegime: 'ENI / Recibos Verdes',
    applyTaxes: true,
    vatPct: 6,
    ircOrIrsPct: 11,
    socialSecurityPct: 14.9,
    operatorCosts: [
      {
        id: 'op-slot-1',
        name: 'Comissão / Taxa Operador Frota (Slot)',
        amount: 60,
        costType: 'fixo',
        frequency: 'semanal',
        enabled: true,
        notes: 'Taxa semanal típica de parceiro operador TVDE',
      },
      {
        id: 'op-contab-1',
        name: 'Contabilidade & Gestão Fiscal',
        amount: 45,
        costType: 'fixo',
        frequency: 'mensal',
        enabled: true,
        notes: 'Avença mensal opcional',
      },
    ],
    vehicleEnergyMode: isEv ? 'electric' : activeVehicle?.fuelType === 'Híbrido' || activeVehicle?.fuelType === 'Plug-in' ? 'hybrid' : 'combustion',
    vehicleLeaseOrInstallmentMonthly: activeVehicle?.monthlyLeaseOrFinanceEur ?? 480,
    vehicleKwhPer100Km: activeVehicle?.consumptionUnit === 'kWh' ? activeVehicle.consumptionPer100Km : 16.5,
    vehicleEurPerKwh: activeVehicle?.consumptionUnit === 'kWh' ? activeVehicle.energyCostPerUnitEur : 0.22,
    vehicleLitersPer100Km: activeVehicle?.consumptionUnit === 'L' ? activeVehicle.consumptionPer100Km : 5.8,
    vehicleEurPerLiter: activeVehicle?.consumptionUnit === 'L' ? activeVehicle.energyCostPerUnitEur : 1.72,
    vehicleInsuranceAmount: activeVehicle?.insuranceAnnualEur ?? 1450,
    vehicleInsuranceFrequency: 'anual',
    vehicleMaintenanceMonthly: 95,
    vehicleTiresMonthly: 45,
    vehicleIucAnnual: isEv ? 0 : 160,
    vehicleOtherMonthly: 30,
    operationalParkingMonthly: 35,
    operationalTollsMonthly: 65,
    operationalOtherMonthly: 25,
    personalMealsDaily: 9.5,
    personalPhoneMonthly: 22,
    personalOtherMonthly: 0,
    includePersonalInTargetGross: false,
  };
}

export interface CostsScenarioResult {
  id: 'conservador' | 'normal' | 'otimista';
  label: string;
  assumptionsNote: string;
  monthlyKm: number;
  monthlyHours: number;
  requiredGrossMonthly: number;
  receivedAfterCommissionsMonthly: number;
  operatingCostsMonthly: number;
  estimatedTaxesMonthly: number;
  operatingProfitMonthly: number;
  personalExpensesMonthly: number;
  finalNetDisposableMonthly: number;
  minRequiredEurPerKm: number;
  minRequiredEurPerHour: number;
}

export interface CostsCalculationResult {
  monthlyWorkDays: number;
  monthlyHours: number;
  monthlyKm: number;
  operatorCostsMonthly: number;
  vehicleEnergyMonthly: number;
  vehicleFixedMonthly: number;
  vehicleMaintenanceAndWearMonthly: number;
  vehicleTotalMonthly: number;
  operationalExtrasMonthly: number;
  totalOperatingCostsMonthly: number;
  personalExpensesMonthly: number;
  costPerDay: number;
  costPerWeek: number;
  costPerMonth: number;
  costPerKm: number;
  costPerHour: number;
  requiredGrossMonthly: number;
  requiredGrossDaily: number;
  receivedAfterCommissionsMonthly: number;
  estimatedTaxesMonthly: number;
  operatingProfitMonthly: number;
  finalNetDisposableMonthly: number;
  minRequiredEurPerKm: number;
  minRequiredEurPerHour: number;
  effectiveCombinedTaxPct: number;
  scenarios: CostsScenarioResult[];
  validationWarnings: string[];
}

function solveProfitabilityForFactor(
  cfg: CostsCalculatorConfig,
  params: {
    id: 'conservador' | 'normal' | 'otimista';
    label: string;
    assumptionsNote: string;
    kmMultiplier: number;
    targetYieldMultiplier: number;
    extraCostMultiplier: number;
  }
): CostsScenarioResult {
  const workDays = Math.max(1, cfg.workDaysPerMonth);
  const hoursPerDay = Math.max(1, cfg.hoursPerDay);
  const kmPerDay = Math.max(1, cfg.avgKmPerDay);

  const monthlyHours = round2(workDays * hoursPerDay);
  const monthlyKm = round2(workDays * kmPerDay * params.kmMultiplier);

  const operatorCostsMonthly = cfg.operatorCosts.reduce((sum, item) => {
    if (!item.enabled) return sum;
    return sum + normalizeAmountToMonthly(item.amount, item.frequency, workDays);
  }, 0);

  const evEnergyCostPer100 = cfg.vehicleKwhPer100Km * cfg.vehicleEurPerKwh;
  const fuelCostPer100 = cfg.vehicleLitersPer100Km * cfg.vehicleEurPerLiter;
  const energyPer100 =
    cfg.vehicleEnergyMode === 'electric'
      ? evEnergyCostPer100
      : cfg.vehicleEnergyMode === 'combustion'
        ? fuelCostPer100
        : evEnergyCostPer100 * 0.55 + fuelCostPer100 * 0.45;
  const vehicleEnergyMonthly = (monthlyKm / 100) * energyPer100;

  const insuranceMonthly =
    cfg.vehicleInsuranceFrequency === 'anual'
      ? cfg.vehicleInsuranceAmount / 12
      : cfg.vehicleInsuranceAmount;

  const vehicleFixedMonthly =
    Math.max(0, cfg.vehicleLeaseOrInstallmentMonthly) +
    Math.max(0, insuranceMonthly) +
    Math.max(0, cfg.vehicleIucAnnual) / 12 +
    Math.max(0, cfg.vehicleOtherMonthly);

  const vehicleMaintenanceMonthly =
    (Math.max(0, cfg.vehicleMaintenanceMonthly) + Math.max(0, cfg.vehicleTiresMonthly)) *
    params.extraCostMultiplier;

  const operationalExtrasMonthly =
    (Math.max(0, cfg.operationalParkingMonthly) +
      Math.max(0, cfg.operationalTollsMonthly) +
      Math.max(0, cfg.operationalOtherMonthly)) *
    params.extraCostMultiplier;

  const operatingCostsMonthly = round2(
    operatorCostsMonthly + vehicleEnergyMonthly + vehicleFixedMonthly + vehicleMaintenanceMonthly + operationalExtrasMonthly
  );

  const personalExpensesMonthly = round2(
    Math.max(0, cfg.personalMealsDaily) * workDays +
      Math.max(0, cfg.personalPhoneMonthly) +
      Math.max(0, cfg.personalOtherMonthly)
  );

  const commRate = Math.min(0.65, Math.max(0, cfg.averagePlatformCommissionPct / 100));
  const combinedTaxRate = cfg.applyTaxes
    ? Math.min(0.65, Math.max(0, (cfg.vatPct + cfg.ircOrIrsPct + cfg.socialSecurityPct) / 100))
    : 0;

  const baseTargetNet =
    Math.max(0, cfg.targetMonthlyNetIncome) * params.targetYieldMultiplier +
    (cfg.includePersonalInTargetGross ? personalExpensesMonthly : 0);

  // Gross * (1 - commRate) - operatingCosts - max(0, Gross*(1-commRate) - operatingCosts)*taxRate = targetPrePersonal
  // => (Gross*(1-commRate) - operatingCosts) * (1 - taxRate) = baseTargetNet
  const preTaxOperatingTarget = baseTargetNet / Math.max(0.2, 1 - combinedTaxRate);
  const receivedAfterCommissionsMonthly = round2(preTaxOperatingTarget + operatingCostsMonthly);
  const requiredGrossMonthly = round2(receivedAfterCommissionsMonthly / Math.max(0.2, 1 - commRate));
  const preTaxProfit = Math.max(0, receivedAfterCommissionsMonthly - operatingCostsMonthly);
  const estimatedTaxesMonthly = round2(preTaxProfit * combinedTaxRate);
  const operatingProfitMonthly = round2(receivedAfterCommissionsMonthly - operatingCostsMonthly - estimatedTaxesMonthly);
  const finalNetDisposableMonthly = round2(operatingProfitMonthly - personalExpensesMonthly);

  return {
    id: params.id,
    label: params.label,
    assumptionsNote: params.assumptionsNote,
    monthlyKm,
    monthlyHours,
    requiredGrossMonthly,
    receivedAfterCommissionsMonthly,
    operatingCostsMonthly,
    estimatedTaxesMonthly,
    operatingProfitMonthly,
    personalExpensesMonthly,
    finalNetDisposableMonthly,
    minRequiredEurPerKm: monthlyKm > 0 ? round2(requiredGrossMonthly / monthlyKm) : 0,
    minRequiredEurPerHour: monthlyHours > 0 ? round2(requiredGrossMonthly / monthlyHours) : 0,
  };
}

export function calculateCostsProfitability(cfg: CostsCalculatorConfig): CostsCalculationResult {
  const workDays = Math.max(1, cfg.workDaysPerMonth);
  const hoursPerDay = Math.max(1, cfg.hoursPerDay);
  const monthlyHours = round2(workDays * hoursPerDay);
  const monthlyKm = round2(workDays * Math.max(1, cfg.avgKmPerDay));

  const operatorCostsMonthly = round2(
    cfg.operatorCosts.reduce((sum, item: OperatorCostItem) => {
      if (!item.enabled) return sum;
      return sum + normalizeAmountToMonthly(item.amount, item.frequency, workDays);
    }, 0)
  );

  const evEnergyCostPer100 = cfg.vehicleKwhPer100Km * cfg.vehicleEurPerKwh;
  const fuelCostPer100 = cfg.vehicleLitersPer100Km * cfg.vehicleEurPerLiter;
  const energyPer100 =
    cfg.vehicleEnergyMode === 'electric'
      ? evEnergyCostPer100
      : cfg.vehicleEnergyMode === 'combustion'
        ? fuelCostPer100
        : evEnergyCostPer100 * 0.55 + fuelCostPer100 * 0.45;
  const vehicleEnergyMonthly = round2((monthlyKm / 100) * energyPer100);

  const insuranceMonthly =
    cfg.vehicleInsuranceFrequency === 'anual'
      ? cfg.vehicleInsuranceAmount / 12
      : cfg.vehicleInsuranceAmount;

  const vehicleFixedMonthly = round2(
    Math.max(0, cfg.vehicleLeaseOrInstallmentMonthly) +
      Math.max(0, insuranceMonthly) +
      Math.max(0, cfg.vehicleIucAnnual) / 12 +
      Math.max(0, cfg.vehicleOtherMonthly)
  );
  const vehicleMaintenanceAndWearMonthly = round2(
    Math.max(0, cfg.vehicleMaintenanceMonthly) + Math.max(0, cfg.vehicleTiresMonthly)
  );
  const vehicleTotalMonthly = round2(
    vehicleEnergyMonthly + vehicleFixedMonthly + vehicleMaintenanceAndWearMonthly
  );
  const operationalExtrasMonthly = round2(
    Math.max(0, cfg.operationalParkingMonthly) +
      Math.max(0, cfg.operationalTollsMonthly) +
      Math.max(0, cfg.operationalOtherMonthly)
  );

  const base = solveProfitabilityForFactor(cfg, {
    id: 'normal',
    label: 'Cenário Normal (Os seus números exatos)',
    assumptionsNote: 'Calculado exatamente com os dias, horas, km, despesas e impostos configurados.',
    kmMultiplier: 1,
    targetYieldMultiplier: 1,
    extraCostMultiplier: 1,
  });

  const conservative = solveProfitabilityForFactor(cfg, {
    id: 'conservador',
    label: 'Cenário Conservador (+12% km em vazio · +10% desgaste)',
    assumptionsNote: 'Mais deslocações sem passageiro (+12% km) para atingir a mesma meta, mantendo custos fixos.',
    kmMultiplier: 1.12,
    targetYieldMultiplier: 1,
    extraCostMultiplier: 1.1,
  });

  const optimistic = solveProfitabilityForFactor(cfg, {
    id: 'otimista',
    label: 'Cenário Otimista (-8% km em vazio · +10% margem alvo)',
    assumptionsNote: 'Menos tempo/km em vazio e +10% de objetivo de rendimento líquido acima da base.',
    kmMultiplier: 0.92,
    targetYieldMultiplier: 1.1,
    extraCostMultiplier: 0.95,
  });

  const validationWarnings: string[] = [];
  if (hoursPerDay > 10) {
    validationWarnings.push(
      `Jornada configurada (${hoursPerDay}h/dia) excede o teto típico de 10h em janelas TVDE.`
    );
  }
  if (cfg.averagePlatformCommissionPct > 40) {
    validationWarnings.push('Comissão média das plataformas acima de 40% reduz fortemente o lucro líquido.');
  }
  if (!cfg.applyTaxes) {
    validationWarnings.push(
      'Cálculo de impostos desativado manualmente: o lucro operacional apresentado não deduz IVA/IRS/IRC/SS.'
    );
  }

  return {
    monthlyWorkDays: workDays,
    monthlyHours,
    monthlyKm,
    operatorCostsMonthly,
    vehicleEnergyMonthly,
    vehicleFixedMonthly,
    vehicleMaintenanceAndWearMonthly,
    vehicleTotalMonthly,
    operationalExtrasMonthly,
    totalOperatingCostsMonthly: base.operatingCostsMonthly,
    personalExpensesMonthly: base.personalExpensesMonthly,
    costPerDay: round2(base.operatingCostsMonthly / workDays),
    costPerWeek: round2(base.operatingCostsMonthly / Math.max(4, workDays / 5.2)),
    costPerMonth: base.operatingCostsMonthly,
    costPerKm: monthlyKm > 0 ? round2(base.operatingCostsMonthly / monthlyKm) : 0,
    costPerHour: monthlyHours > 0 ? round2(base.operatingCostsMonthly / monthlyHours) : 0,
    requiredGrossMonthly: base.requiredGrossMonthly,
    requiredGrossDaily: round2(base.requiredGrossMonthly / workDays),
    receivedAfterCommissionsMonthly: base.receivedAfterCommissionsMonthly,
    estimatedTaxesMonthly: base.estimatedTaxesMonthly,
    operatingProfitMonthly: base.operatingProfitMonthly,
    finalNetDisposableMonthly: base.finalNetDisposableMonthly,
    minRequiredEurPerKm: base.minRequiredEurPerKm,
    minRequiredEurPerHour: base.minRequiredEurPerHour,
    effectiveCombinedTaxPct: cfg.applyTaxes
      ? round2(cfg.vatPct + cfg.ircOrIrsPct + cfg.socialSecurityPct)
      : 0,
    scenarios: [conservative, base, optimistic],
    validationWarnings,
  };
}
