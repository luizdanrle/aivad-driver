import type {
  AiCoreAgentId,
  AiCoreInsight,
  AiPredictionRecord,
  AutoPilotConfig,
  CampaignRecord,
  ComplianceObligation,
  DriverDocument,
  DriverRoutinePreferences,
  EpistemicTag,
  ExpenseRecord,
  MapZoneRecord,
  ProposalAnalysis,
  ProposalInput,
  SavedPlace,
  StrategyAdjustmentLogEntry,
  TachographStateStore,
  TripRecord,
  VehicleRecord,
} from '../models/types';
import { analyzeProposal, computeFinancialSummary, round2 } from './intelligence';
import { evaluateRolling24hCompliance } from './tachograph';

export interface AiCoreAgentDefinition {
  id: AiCoreAgentId;
  name: string;
  roleTitle: string;
  scope: string;
}

export const AI_CORE_AGENTS: AiCoreAgentDefinition[] = [
  {
    id: 'corridas',
    name: 'Agente de Corridas',
    roleTitle: 'Análise de Propostas & Alternativas',
    scope: 'Avalia lucro líquido, retorno em vazio, tempo real e compara com alternativas operacionais.',
  },
  {
    id: 'estrategia',
    name: 'Agente de Estratégia',
    roleTitle: 'Calibração Manual / Semiautomática / Automática',
    scope: 'Ajusta limites dentro das margens seguras definidas pelo motorista e regista cada alteração.',
  },
  {
    id: 'financeiro',
    name: 'Agente Financeiro',
    roleTitle: 'Rentabilidade & Custos Reais',
    scope: 'Calcula margem líquida após comissões, energia/combustível, propriedade e despesas.',
  },
  {
    id: 'trafego',
    name: 'Agente de Tráfego e Localização',
    roleTitle: 'Mobilidade, Zonas & Procura',
    scope: 'Analisa procura histórica e trânsito reportado, sinalizando explicitamente ausência de feed live.',
  },
  {
    id: 'veiculos',
    name: 'Agente de Veículos e Energia',
    roleTitle: 'Autonomia & Elegibilidade',
    scope: 'Cruza autonomia real, custo por perfil tarifário e elegibilidade TVDE/categorias.',
  },
  {
    id: 'rotina',
    name: 'Agente de Rotina e Agenda',
    roleTitle: 'Turnos, Pausas & Fecho de Garagem',
    scope: 'Respeita janelas preferidas de refeição, carregamento, base final e meta diária.',
  },
  {
    id: 'conformidade',
    name: 'Agente de Conformidade e Atividade',
    roleTitle: 'Registo TVDE 10h/24h & Documentos',
    scope: 'Monitoriza janela deslizante de 24h, pausas obrigatórias e validade documental.',
  },
  {
    id: 'administrativo',
    name: 'Agente Administrativo',
    roleTitle: 'Governança & Isolamento de Dados',
    scope: 'Audita telemetria agregada anónima sem expor dados privados entre motoristas.',
  },
];

export interface ProposalAlternativeComparison {
  action:
    | 'Aceitar corrida atual'
    | 'Esperar próxima oferta'
    | 'Reposicionar para zona de procura'
    | 'Carregar / Abastecer antes'
    | 'Fazer pausa / Refeição'
    | 'Regressar à base / Garagem';
  expectedScore: number;
  rationale: string;
  epistemicTag: EpistemicTag;
}

export interface ProposalAiDecisionPackage {
  analysis: ProposalAnalysis;
  recommendedAction: ProposalAlternativeComparison['action'];
  confidencePct: number;
  epistemicTag: EpistemicTag;
  trafficHonestyNote: string;
  alternatives: ProposalAlternativeComparison[];
  insight: AiCoreInsight;
}

export function analyzeProposalWithAiCore(params: {
  input: ProposalInput;
  autoPilot: AutoPilotConfig;
  activeVehicle?: VehicleRecord;
  tachograph: TachographStateStore;
  zones: MapZoneRecord[];
  savedPlaces: SavedPlace[];
  routine: DriverRoutinePreferences;
  currentHour?: number;
}): ProposalAiDecisionPackage {
  const analysis = analyzeProposal(params.input, params.autoPilot.thresholds);
  const compliance24h = evaluateRolling24hCompliance(
    params.tachograph.activities,
    params.tachograph.platformIntervals
  );
  const remainingPlusTrip = compliance24h.remainingLegalMinutes - analysis.totalTimeMin;
  const targetZone = params.zones.find((z) =>
    params.input.region.toLowerCase().includes(z.name.split('/')[0].trim().toLowerCase())
  );
  const topHighDemandZone = params.zones.find((z) => z.historicalDemand === 'Alta' && z.preference === 'Favorita');
  const hourNow = params.currentHour ?? new Date().getHours();
  const [endH] = params.routine.preferredShiftEnd.split(':').map(Number);
  const nearShiftEnd = Number.isFinite(endH) && hourNow >= endH - 1;

  const alternatives: ProposalAlternativeComparison[] = [
    {
      action: 'Aceitar corrida atual',
      expectedScore: analysis.score,
      rationale: `Rendimento estimado €${analysis.estimatedNetEur.toFixed(2)} (€${analysis.eurPerHour.toFixed(2)}/h, risco retorno ${analysis.emptyReturnRisk}).`,
      epistemicTag: 'Estimativa',
    },
    {
      action: 'Esperar próxima oferta',
      expectedScore: analysis.classification === 'vermelho' ? 76 : analysis.classification === 'amarelo' ? 66 : 54,
      rationale:
        analysis.classification === 'vermelho'
          ? 'Recusar proposta fraca preserva margem horária para ofertas de maior valor.'
          : 'Aguardar implica custo de oportunidade (~5-8 min em zona ativa).',
      epistemicTag: 'Previsão',
    },
  ];

  if (topHighDemandZone && analysis.classification !== 'verde') {
    alternatives.push({
      action: 'Reposicionar para zona de procura',
      expectedScore: 74,
      rationale: `Zona "${topHighDemandZone.name}" apresenta procura histórica ${topHighDemandZone.historicalDemand} e ${topHighDemandZone.evChargersCount} carregadores.`,
      epistemicTag: 'Informação histórica',
    });
  }

  if (params.activeVehicle && params.activeVehicle.fuelType === 'Elétrico' && (params.activeVehicle.realRangeKm ?? params.activeVehicle.rangeKm) < 110) {
    alternatives.push({
      action: 'Carregar / Abastecer antes',
      expectedScore: 88,
      rationale: `Autonomia estimada reduzida face à reserva mínima configurada (${params.routine.minBatteryReservePct}%).`,
      epistemicTag: 'Estimativa',
    });
  }

  if (remainingPlusTrip < 30) {
    alternatives.push({
      action: 'Fazer pausa / Refeição',
      expectedScore: 92,
      rationale: `Janela legal TVDE restante (${compliance24h.remainingLegalMinutes} min) fica pressionada após esta viagem.`,
      epistemicTag: 'Informação confirmada',
    });
  }

  if (nearShiftEnd) {
    const endBase = params.savedPlaces.find((p) => p.id === params.routine.endBasePlaceId);
    alternatives.push({
      action: 'Regressar à base / Garagem',
      expectedScore: analysis.emptyReturnRisk === 'Alto' ? 84 : 68,
      rationale: endBase
        ? `Perto do fim de turno (${params.routine.preferredShiftEnd}) / fecho garagem (${params.routine.garageClosingTime}) em ${endBase.name}.`
        : `Hora atual próxima do fim de turno planeado (${params.routine.preferredShiftEnd}).`,
      epistemicTag: 'Informação confirmada',
    });
  }

  const bestAlt = [...alternatives].sort((a, b) => b.expectedScore - a.expectedScore)[0];
  const confidencePct =
    analysis.classification === 'verde' ? 86 : analysis.classification === 'amarelo' ? 71 : 82;

  const trafficHonestyNote = targetZone
    ? `Trânsito na zona baseado em perfil histórico (${targetZone.trafficLevel}). Sem feed de trânsito ou obras em tempo real nesta sessão (Informação indisponível ao vivo).`
    : 'Sem ligação a feed de trânsito/cortes de via em tempo real — cálculo usa tempo informado na proposta (Informação indisponível ao vivo).';

  const insight: AiCoreInsight = {
    id: `ai-prop-${Date.now()}`,
    agentId: 'corridas',
    agentName: 'Agente de Corridas + Tráfego + Conformidade',
    title: `Decisão recomendada: ${bestAlt.action}`,
    inputsConsidered: [
      `Plataforma ${params.input.platformId.toUpperCase()} (${params.input.category})`,
      `Distância total ${analysis.totalDistanceKm.toFixed(1)} km / ${analysis.totalTimeMin} min`,
      `Saldo legal TVDE 24h: ${compliance24h.remainingLegalMinutes} min restantes`,
      `Preferência fim de turno: ${params.routine.preferredShiftEnd}`,
    ],
    analysisSteps: [
      `Calculado €/km (${analysis.eurPerKm.toFixed(2)}) e €/h (${analysis.eurPerHour.toFixed(2)}) vs meta (${params.autoPilot.thresholds.minEurPerKm.toFixed(2)} / ${params.autoPilot.thresholds.minEurPerHour.toFixed(2)}).`,
      `Avaliado risco de retorno em vazio (${analysis.emptyReturnRisk}) e compatibilidade com teto TVDE 10h.`,
      `Comparadas ${alternatives.length} ações alternativas para maximizar líquido por hora segura.`,
    ],
    recommendation: bestAlt.action,
    justification: bestAlt.rationale,
    operationLog: `Snapshot pré-decisão guardado para calibração pós-viagem.`,
    confidencePct,
    epistemicTag: 'Estimativa',
    createdAt: new Date().toISOString(),
  };

  return {
    analysis,
    recommendedAction: bestAlt.action,
    confidencePct,
    epistemicTag: 'Estimativa',
    trafficHonestyNote,
    alternatives,
    insight,
  };
}

export function evaluateSemiAutoAdjustment(params: {
  autoPilot: AutoPilotConfig;
  recentTrips: TripRecord[];
  activeCampaigns: CampaignRecord[];
}): {
  recommendedPatch?: Partial<AutoPilotConfig['thresholds']>;
  logEntry?: Omit<StrategyAdjustmentLogEntry, 'id' | 'timestamp' | 'reverted'>;
  rationale: string;
  epistemicTag: EpistemicTag;
} {
  const mode = params.autoPilot.strategyMode ?? 'Semiautomático';
  if (mode === 'Manual') {
    return {
      rationale: 'Modo Manual ativo: nenhuma adaptação automática permitida.',
      epistemicTag: 'Informação confirmada',
    };
  }

  const bounds = params.autoPilot.semiAutoBounds ?? {
    minEurPerKmFloor: 0.75,
    minEurPerKmCeil: 1.45,
    minEurPerHourFloor: 15,
    minEurPerHourCeil: 32,
    maxPickupKmFloor: 2,
    maxPickupKmCeil: 6,
  };

  const completed = params.recentTrips.filter((t) => t.status === 'Concluída' || t.status === 'Ajustada');
  const activeCamp = params.activeCampaigns.find((c) => c.status === 'Ativa' && c.completedTrips < c.targetTrips);
  const currentKm = params.autoPilot.thresholds.minEurPerKm;

  if (activeCamp && currentKm > bounds.minEurPerKmFloor + 0.05) {
    const nextVal = round2(Math.max(bounds.minEurPerKmFloor, currentKm - 0.08));
    return {
      recommendedPatch: { minEurPerKm: nextVal },
      logEntry: {
        mode,
        parameter: 'minEurPerKm',
        parameterLabel: 'Limiar mínimo €/km',
        previousValue: currentKm,
        newValue: nextVal,
        conditionTriggered: `Campanha "${activeCamp.name}" a ${activeCamp.completedTrips}/${activeCamp.targetTrips} viagens`,
        reason: `Flexibilização temporária dentro do limite seguro (${bounds.minEurPerKmFloor.toFixed(2)}–${bounds.minEurPerKmCeil.toFixed(2)}) para acelerar conclusão do bónus.`,
        observedOutcome: 'Pendente validação após próximas 3 viagens',
      },
      rationale: `Ajustado mínimo €/km de €${currentKm.toFixed(2)} para €${nextVal.toFixed(2)} dentro das margens seguras.`,
      epistemicTag: 'Estimativa',
    };
  }

  if (completed.length >= 3) {
    const avgNet = completed.slice(0, 5).reduce((a, t) => a + t.netEur, 0) / Math.min(5, completed.length);
    if (avgNet > 15 && currentKm < bounds.minEurPerKmCeil - 0.05) {
      const nextVal = round2(Math.min(bounds.minEurPerKmCeil, currentKm + 0.05));
      return {
        recommendedPatch: { minEurPerKm: nextVal },
        logEntry: {
          mode,
          parameter: 'minEurPerKm',
          parameterLabel: 'Limiar mínimo €/km',
          previousValue: currentKm,
          newValue: nextVal,
          conditionTriggered: `Média recente líquida elevada (€${avgNet.toFixed(2)}/viagem)`,
          reason: `Elevação gradual do crivo €/km dentro da margem segura (${bounds.minEurPerKmFloor.toFixed(2)}–${bounds.minEurPerKmCeil.toFixed(2)}) para capturar procura forte.`,
          observedOutcome: 'A monitorizar taxa de aceitação',
        },
        rationale: `Procura recente forte permite subir limiar para €${nextVal.toFixed(2)}/km sem ultrapassar o teto configurado.`,
        epistemicTag: 'Informação histórica',
      };
    }
  }

  return {
    rationale: 'Parâmetros atuais já alinhados com as margens seguras e procura recente.',
    epistemicTag: 'Informação confirmada',
  };
}

export function reconcilePredictionOutcome(
  prediction: AiPredictionRecord,
  actualTrip: TripRecord
): AiPredictionRecord {
  const deltaNetEur = round2(actualTrip.netEur - prediction.predictedNetEur);
  const deltaDurationMin = Math.round(actualTrip.durationMin - prediction.predictedDurationMin);
  const signNet = deltaNetEur >= 0 ? '+' : '';
  const signMin = deltaDurationMin >= 0 ? '+' : '';
  return {
    ...prediction,
    tripId: actualTrip.id,
    actualNetEur: actualTrip.netEur,
    actualDurationMin: actualTrip.durationMin,
    deltaNetEur,
    deltaDurationMin,
    status: 'Calibrado',
    learningNote: `Desvio observado: ${signNet}€${deltaNetEur.toFixed(2)} líquidos e ${signMin}${deltaDurationMin} min face ao previsto. Pesos locais do motorista atualizados sem mistura entre utilizadores.`,
    epistemicTag: 'Informação confirmada',
  };
}

export function runAiCoreBriefing(context: {
  driverId: string;
  trips: TripRecord[];
  expenses: ExpenseRecord[];
  vehicles: VehicleRecord[];
  obligations: ComplianceObligation[];
  documents: DriverDocument[];
  tachograph: TachographStateStore;
  routine: DriverRoutinePreferences;
  autoPilot: AutoPilotConfig;
  predictions: AiPredictionRecord[];
}): AiCoreInsight[] {
  const fin = computeFinancialSummary(context.trips, context.expenses);
  const activeVehicle = context.vehicles.find((v) => v.isActiveDriverVehicle) ?? context.vehicles[0];
  const rolling24h = evaluateRolling24hCompliance(
    context.tachograph.activities,
    context.tachograph.platformIntervals
  );
  const expiringDocs = context.documents.filter((d) => d.status === 'A expirar' || d.status === 'Expirado');
  const driverPredictions = context.predictions.filter((p) => p.driverId === context.driverId && p.status === 'Calibrado');
  const avgDeltaNet =
    driverPredictions.length > 0
      ? round2(driverPredictions.reduce((a, p) => a + (p.deltaNetEur ?? 0), 0) / driverPredictions.length)
      : 0;

  const nowIso = new Date().toISOString();

  return [
    {
      id: 'core-fin',
      agentId: 'financeiro',
      agentName: 'Agente Financeiro',
      title: `Progresso da meta diária: €${fin.netEstimated.toFixed(2)} / €${context.routine.dailyNetTargetEur.toFixed(2)}`,
      inputsConsidered: [
        `${fin.tripCount} viagens concluídas (excluídas ${fin.cancelledOrLostCount} canceladas/rejeitadas)`,
        `Média horária bruta €${fin.avgPerHour.toFixed(2)}/h · €${fin.avgPerKm.toFixed(2)}/km`,
      ],
      analysisSteps: [
        'Agregada receita apenas de viagens Concluídas/Ajustadas.',
        'Deduzidas comissões, custo/km do veículo ativo e despesas operacionais.',
      ],
      recommendation:
        fin.netEstimated >= context.routine.dailyNetTargetEur
          ? 'Meta líquida atingida — adotar critério seletivo para proteger descanso.'
          : `Faltam €${Math.max(0, context.routine.dailyNetTargetEur - fin.netEstimated).toFixed(2)} líquidos para atingir o objetivo definido.`,
      justification: `Cálculo transparente auditável pelo perfil do motorista (${context.driverId}).`,
      operationLog: `Sincronizado com ${context.expenses.length} despesas registadas.`,
      confidencePct: 92,
      epistemicTag: 'Informação confirmada',
      createdAt: nowIso,
    },
    {
      id: 'core-conf',
      agentId: 'conformidade',
      agentName: 'Agente de Conformidade e Atividade',
      title: `Janela 24h TVDE: ${Math.floor(rolling24h.rolling24hWorkMinutes / 60)}h ${rolling24h.rolling24hWorkMinutes % 60}m / 10h (${rolling24h.alertLevel})`,
      inputsConsidered: [
        `${context.tachograph.activities.length} blocos no tacógrafo + intervalos multi-app sem duplicação`,
        `${expiringDocs.length} documento(s) a expirar/expirados`,
      ],
      analysisSteps: [
        'Somado tempo online/condução/disponibilidade em janela deslizante de 24 horas.',
        'Verificada validade documental face às obrigações ativas.',
      ],
      recommendation:
        rolling24h.alerts[0] ??
        (expiringDocs.length > 0
          ? `Renovar documento prioritário: ${expiringDocs[0].title} (${expiringDocs[0].expiryDate}).`
          : 'Jornada legal e documentação dentro dos limites regulamentares.'),
      justification: 'Registo digital operacional para prevenção de infrações (sem promessa de certificação automática).',
      operationLog: `Restam ${rolling24h.remainingLegalMinutes} min de disponibilidade legal nas próximas 24h.`,
      confidencePct: 95,
      epistemicTag: 'Informação confirmada',
      createdAt: nowIso,
    },
    {
      id: 'core-veh',
      agentId: 'veiculos',
      agentName: 'Agente de Veículos e Energia',
      title: activeVehicle
        ? `${activeVehicle.brand} ${activeVehicle.model} — Custo energético (${activeVehicle.energyTariffProfile ?? 'Padrão'})`
        : 'Nenhum veículo ativo selecionado',
      inputsConsidered: activeVehicle
        ? [
            `Autonomia homologada: ${activeVehicle.homologatedRangeKm ?? activeVehicle.rangeKm} km (${activeVehicle.rangeStandard ?? 'WLTP'})`,
            `Autonomia real estimada: ${activeVehicle.realRangeKm ?? Math.round(activeVehicle.rangeKm * 0.82)} km`,
          ]
        : ['Sem viatura atribuída'],
      analysisSteps: [
        'Separada autonomia oficial de fábrica vs estimativa real urbana TVDE.',
        'Aplicado perfil tarifário de energia e regime de propriedade.',
      ],
      recommendation:
        activeVehicle && activeVehicle.fuelType === 'Elétrico'
          ? `Priorizar carregamento na janela preferida (${context.routine.preferredChargingWindow}) para manter custo abaixo de €0,25/kWh.`
          : 'Manter registo de abastecimentos alinhado ao consumo médio real.',
      justification: 'Evita surpresas de autonomia real em viagens longas para periferia ou aeroporto.',
      operationLog: activeVehicle?.rangeSource ?? 'Fonte técnica registada',
      confidencePct: 84,
      epistemicTag: 'Estimativa',
      createdAt: nowIso,
    },
    {
      id: 'core-strat',
      agentId: 'estrategia',
      agentName: 'Agente de Estratégia & Aprendizagem',
      title: `Modo ${context.autoPilot.strategyMode ?? 'Semiautomático'} · ${driverPredictions.length} previsões calibradas`,
      inputsConsidered: [
        `Meta €${context.autoPilot.thresholds.minEurPerKm.toFixed(2)}/km · €${context.autoPilot.thresholds.minEurPerHour.toFixed(2)}/h`,
        `Desvio médio de aprendizagem isolada do motorista: ${avgDeltaNet >= 0 ? '+' : ''}€${avgDeltaNet.toFixed(2)}/viagem`,
      ],
      analysisSteps: [
        'Comparado o valor líquido previsto pré-decisão vs resultado líquido real após conclusão.',
        'Mantido isolamento estrito do modelo de aprendizagem apenas para este motorista.',
      ],
      recommendation:
        context.autoPilot.officialAutomationAuthorized
          ? 'Monitorização ativa com regras configuradas.'
          : 'AutoPilot bloqueado por ausência de API oficial — manter decisões humanas assistidas pelo Cartão Flutuante.',
      justification: 'Nenhuma informação privada de outros motoristas é cruzada ou partilhada.',
      operationLog: `${context.autoPilot.adjustmentLogs?.length ?? 0} ajustes registados no histórico auditável.`,
      confidencePct: 88,
      epistemicTag: driverPredictions.length > 0 ? 'Informação histórica' : 'Dados de demonstração',
      createdAt: nowIso,
    },
  ];
}

export function answerAiCoreQuery(
  query: string,
  context: {
    driverId: string;
    trips: TripRecord[];
    expenses: ExpenseRecord[];
    campaigns: CampaignRecord[];
    vehicles: VehicleRecord[];
    obligations: ComplianceObligation[];
    documents: DriverDocument[];
    tachograph: TachographStateStore;
    routine: DriverRoutinePreferences;
    autoPilot: AutoPilotConfig;
    predictions: AiPredictionRecord[];
  }
): {
  agentName: string;
  answer: string;
  sources: string[];
  epistemicTag: EpistemicTag;
  confidencePct: number;
} {
  const q = query.toLowerCase();
  const fin = computeFinancialSummary(context.trips, context.expenses);
  const activeVehicle = context.vehicles.find((v) => v.isActiveDriverVehicle) ?? context.vehicles[0];
  const rolling24h = evaluateRolling24hCompliance(
    context.tachograph.activities,
    context.tachograph.platformIntervals
  );

  if (q.includes('hora') || q.includes('tac') || q.includes('10h') || q.includes('pausa') || q.includes('legal')) {
    return {
      agentName: 'Agente de Conformidade e Atividade',
      answer: `Nas últimas 24 horas registou ${Math.floor(rolling24h.rolling24hWorkMinutes / 60)}h ${rolling24h.rolling24hWorkMinutes % 60}m de atividade consolidada multi-plataforma (teto legal: 10h / 600 min). Restam ${rolling24h.remainingLegalMinutes} min disponíveis e acumulou ${rolling24h.rolling24hBreakMinutes} min de pausa/refeição. Estado: ${rolling24h.alertLevel}.`,
      sources: ['Registo de atividade TVDE (Portaria n.º 7/2022)', 'Intervalos multi-plataforma'],
      epistemicTag: 'Informação confirmada',
      confidencePct: 95,
    };
  }

  if (q.includes('trânsito') || q.includes('transito') || q.includes('obra') || q.includes('corte')) {
    return {
      agentName: 'Agente de Tráfego e Localização',
      answer: 'Sem ligação a feed de trânsito ou cortes rodoviários em tempo real nesta sessão web (Informação indisponível ao vivo). As zonas do planeador refletem apenas procura histórica e perfis médios guardados.',
      sources: ['Locais e rotas', 'Perfis históricos de zona'],
      epistemicTag: 'Informação indisponível',
      confidencePct: 100,
    };
  }

  if (q.includes('estrat') || q.includes('modo') || q.includes('semiautom') || q.includes('autopilot')) {
    const sm = context.autoPilot.strategyMode ?? 'Semiautomático';
    return {
      agentName: 'Agente de Estratégia',
      answer: `Está no modo ${sm} (mínimo €${context.autoPilot.thresholds.minEurPerKm.toFixed(2)}/km, €${context.autoPilot.thresholds.minEurPerHour.toFixed(2)}/h, recolha máxima ${context.autoPilot.thresholds.maxPickupKm} km). Pode ajustar ou reverter qualquer alteração automática no registo auditável de Estratégia.`,
      sources: ['Estratégia das aplicações', 'Registo de Ajustes'],
      epistemicTag: 'Informação confirmada',
      confidencePct: 91,
    };
  }

  if (q.includes('autonomia') || q.includes('carro') || q.includes('veículo') || q.includes('veiculo') || q.includes('bateria')) {
    if (!activeVehicle) {
      return {
        agentName: 'Agente de Veículos e Energia',
        answer: 'Não existe veículo ativo associado à sua conta.',
        sources: ['Veículos e energia'],
        epistemicTag: 'Informação indisponível',
        confidencePct: 100,
      };
    }
    return {
      agentName: 'Agente de Veículos e Energia',
      answer: `${activeVehicle.brand} ${activeVehicle.model} (${activeVehicle.year}): autonomia homologada de fábrica ${activeVehicle.homologatedRangeKm ?? activeVehicle.rangeKm} km (${activeVehicle.rangeStandard ?? 'WLTP'}) vs autonomia real estimada de ${activeVehicle.realRangeKm ?? Math.round(activeVehicle.rangeKm * 0.82)} km. Tarifa de energia ativa: ${activeVehicle.energyTariffProfile ?? 'Padrão'}.`,
      sources: ['Veículos e energia', 'Perfil tarifário'],
      epistemicTag: 'Estimativa',
      confidencePct: 86,
    };
  }

  return {
    agentName: 'AIVAD AI CORE (Coordenação Multi-Agente)',
    answer: `Resumo operacional atual: ${fin.tripCount} viagens concluídas (€${fin.totalRevenue.toFixed(2)} brutos, €${fin.netEstimated.toFixed(2)} líquidos estimados), ${fin.cancelledOrLostCount} não concluídas excluídas dos ganhos, e ${rolling24h.remainingLegalMinutes} min restantes no teto diário TVDE de 10h.`,
    sources: ['Financeiro', 'Corridas', 'Registo TVDE'],
    epistemicTag: 'Estimativa',
    confidencePct: 89,
  };
}
