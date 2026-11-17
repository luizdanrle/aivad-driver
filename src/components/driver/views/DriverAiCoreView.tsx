import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  Bot,
  Brain,
  CheckCircle2,
  Cpu,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AI_CORE_AGENTS, answerAiCoreQuery, computeAiCalibrationSummary } from '../../../core/aiCore';
import { TIER_OPERATIONAL_MEANINGS } from '../../../core/floatingCard';
import type { EpistemicTag } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import { Button, Card } from '../../ui/DesignSystem';

const EPISTEMIC_STYLE: Record<EpistemicTag, string> = {
  'Informação confirmada':
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  'Informação histórica':
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  Estimativa:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Previsão:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  'Informação indisponível':
    'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  'Dados de demonstração':
    'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export const DriverAiCoreView: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const {
    state,
    activeDriver,
    activeVehicle,
    activeDriverTrips,
    rolling24hCompliance,
    aiCoreBriefing,
    driverPredictions,
  } = useEcosystem();

  const [selectedAgentId, setSelectedAgentId] = useState<string>('ALL');
  const [question, setQuestion] = useState('');
  const [askingBusy, setAskingBusy] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{
      q: string;
      agentName: string;
      answer: string;
      sources: string[];
      epistemicTag: EpistemicTag;
      confidencePct: number | null;
      confidenceStatus: string;
      engineMode: 'gemini' | 'deterministico';
    }>
  >([]);

  const handleAsk = async (qText: string) => {
    const clean = qText.trim();
    if (!clean || askingBusy) return;
    setAskingBusy(true);
    setQuestion('');

    const deterministic = answerAiCoreQuery(clean, {
      driverId: activeDriver.id,
      trips: activeDriverTrips,
      expenses: state.expenses,
      campaigns: state.campaigns,
      vehicles: state.vehicles,
      obligations: state.obligations,
      documents: state.documents,
      tachograph: state.tachograph,
      routine: state.routinePreferences,
      autoPilot: state.autoPilot,
      predictions: driverPredictions,
    });

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: clean,
          contextSummary: {
            driverName: activeDriver.name,
            city: state.localization.currentLocation.city,
            country: state.localization.selectedMarketCode,
            rolling24hWorkMinutes: rolling24hCompliance.rolling24hWorkMinutes,
            remainingLegalMinutes: rolling24hCompliance.remainingLegalMinutes,
            activeVehicle: `${activeVehicle.brand} ${activeVehicle.model} (WLTP ${activeVehicle.homologatedRangeKm ?? activeVehicle.rangeKm}km / Real ${activeVehicle.realRangeKm ?? activeVehicle.rangeKm}km)`,
            tripsCount: activeDriverTrips.length,
            strategyMode: state.autoPilot.strategyMode ?? 'Manual',
            deterministicBaseline: deterministic.answer,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok && !data?.fallback && typeof data?.text === 'string') {
        setChatHistory((prev) => [
          {
            q: clean,
            agentName: `AIVAD AI CORE · ${deterministic.agentName} (Gemini Server)`,
            answer: data.text,
            sources: [...deterministic.sources, 'Gemini Proxy (/api/ai/query)'],
            epistemicTag: deterministic.epistemicTag,
            confidencePct: deterministic.confidencePct,
            confidenceStatus: deterministic.confidenceStatus,
            engineMode: 'gemini',
          },
          ...prev,
        ]);
        setAskingBusy(false);
        return;
      }
    } catch {
      // Fallback safely to deterministic response
    }

    setChatHistory((prev) => [
      {
        q: clean,
        ...deterministic,
        engineMode: 'deterministico',
      },
      ...prev,
    ]);
    setAskingBusy(false);
  };

  const visibleBriefings =
    selectedAgentId === 'ALL'
      ? aiCoreBriefing
      : aiCoreBriefing.filter((b) => b.agentId === selectedAgentId);

  return (
    <div className="space-y-6">
      {/* 8 Specialized Agents Grid */}
      <Card variant="tinted-ai" className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h2 className="text-base font-display font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
              <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Arquitetura Multi-Agente (8 Especialistas Operacionais)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Selecione qualquer especialista abaixo para filtrar os alertas e recomendações sobre a sua operação.
            </p>
          </div>
          <Button
            variant={selectedAgentId === 'ALL' ? 'ai' : 'secondary'}
            size="sm"
            onClick={() => setSelectedAgentId('ALL')}
          >
            Todos os Agentes ({AI_CORE_AGENTS.length})
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {AI_CORE_AGENTS.map((agent) => {
            const active = selectedAgentId === agent.id;
            return (
              <motion.button
                key={agent.id}
                type="button"
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                onClick={() => setSelectedAgentId(active ? 'ALL' : agent.id)}
                className={`p-3.5 rounded-xl border text-left transition-colors space-y-1.5 cursor-pointer ${
                  active
                    ? 'border-indigo-600 dark:border-indigo-400 bg-white dark:bg-[#172540] ring-2 ring-indigo-500/20 shadow-sm'
                    : 'bg-white/90 dark:bg-[#0F182B]/90 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    {agent.name}
                  </span>
                  {active && (
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                      Selecionado
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                  {agent.roleTitle}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {agent.scope}
                </p>
              </motion.button>
            );
          })}
        </div>
      </Card>

      {/* Briefings with Epistemic Tags, Null-Safe Calibrated Confidence & Explainability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {visibleBriefings.map((item, idx) => (
            <motion.div
              key={item.id}
              layout={!prefersReducedMotion}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.15) }}
            >
              <Card className="p-5 h-full space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {item.agentName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${EPISTEMIC_STYLE[item.epistemicTag]}`}
                      >
                        {item.epistemicTag}
                      </span>
                      <span className="font-mono-tabular text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {item.confidencePct !== null ? `${item.confidencePct}% conf.` : item.confidenceStatus}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-blue-50/60 dark:bg-[#131F36] p-3 rounded-xl border border-blue-100 dark:border-slate-700">
                    <strong>Recomendação:</strong> {item.recommendation}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <p className="font-semibold text-slate-500 dark:text-slate-400 mb-1">Entradas consideradas</p>
                      <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                        {item.inputsConsidered.map((inp, i) => (
                          <li key={i}>• {inp}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-500 dark:text-slate-400 mb-1">Passos &amp; Justificação</p>
                      <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                        {item.analysisSteps.map((st, i) => (
                          <li key={i}>• {st}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>{item.justification}</span>
                  <span className="font-mono-tabular">{item.operationLog}</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Interactive Grounded AI CORE Consultation */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-display font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
            <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Consultar AIVAD AI CORE
          </h2>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Proxy servidor seguro + motor determinístico local
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            'Quantas horas legais 10h/24h me restam?',
            'Qual a autonomia real vs homologada do veículo ativo?',
            'Há trânsito ou obras ao vivo na minha zona?',
            'Como está a minha estratégia semiautomática?',
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => void handleAsk(preset)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#131F36] text-xs font-medium hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors text-left cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleAsk(question);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pergunte sobre metas, horas 10h/24h, veículos, tráfego ou estratégia..."
            aria-label="Pergunta ao AIVAD AI CORE"
            className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324] text-xs sm:text-sm text-slate-900 dark:text-white focus:border-indigo-500"
          />
          <Button
            type="submit"
            variant="ai"
            disabled={askingBusy}
            icon={askingBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          >
            {askingBusy ? 'A analisar dados...' : 'Analisar'}
          </Button>
        </form>

        <AnimatePresence>
          {askingBusy && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 flex items-center gap-3 text-xs text-indigo-800 dark:text-indigo-200"
            >
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>
                <strong>AI CORE em análise:</strong> a cruzar histórico de viagens, veículo ativo e janela legal TVDE 10h/24h...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {chatHistory.length > 0 && (
          <div className="space-y-3 pt-2">
            <AnimatePresence initial={false}>
              {chatHistory.map((item, idx) => (
                <motion.div
                  key={`${item.q}-${idx}`}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131F36] border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{item.q}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${EPISTEMIC_STYLE[item.epistemicTag]}`}>
                        {item.epistemicTag}
                      </span>
                      <span className="font-mono-tabular text-[11px] font-semibold">
                        {item.confidencePct !== null ? `${item.confidencePct}% conf.` : item.confidenceStatus}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">{item.answer}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      {item.agentName} ({item.engineMode === 'gemini' ? 'Gemini Servidor' : 'Determinístico'}) · Fontes:{' '}
                      {item.sources.join(', ')}
                    </span>
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Isolated Driver Learning Ledger: Prediction vs Real (4 Dimensions + Preliminary Honesty) */}
      {(() => {
        const calibration = computeAiCalibrationSummary(state.aiPredictions, activeDriver.id);
        return (
          <Card className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-display font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Activity className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  Aprendizagem Operacional 4 Dimensões (Previsto vs Real)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compara tempo, distância, líquido confirmado e classificação inicial vs observada após conclusão.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {calibration.isPreliminary && (
                  <span className="px-2.5 py-0.5 rounded-md border text-[11px] font-bold bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700">
                    Avaliação preliminar
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <Lock className="w-3.5 h-3.5" />
                  Isolado para {activeDriver.name} ({activeDriver.id})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131F36]/70">
                <span className="text-[11px] text-slate-500 block">Amostras calibradas</span>
                <strong className="font-mono-tabular text-sm text-slate-900 dark:text-white">
                  {calibration.calibratedCount} ({calibration.pendingCount} pend.)
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131F36]/70">
                <span className="text-[11px] text-slate-500 block">MAE Tempo</span>
                <strong className="font-mono-tabular text-sm text-slate-900 dark:text-white">
                  {calibration.maeDurationMin !== null ? `±${calibration.maeDurationMin.toFixed(1)} min` : 'Indisponível'}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131F36]/70">
                <span className="text-[11px] text-slate-500 block">MAE Distância</span>
                <strong className="font-mono-tabular text-sm text-slate-900 dark:text-white">
                  {calibration.maeDistanceKm !== null ? `±${calibration.maeDistanceKm.toFixed(1)} km` : 'Indisponível'}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131F36]/70">
                <span className="text-[11px] text-slate-500 block">MAE Líquido</span>
                <strong className="font-mono-tabular text-sm text-slate-900 dark:text-white">
                  {calibration.maeNetEur !== null ? `±€${calibration.maeNetEur.toFixed(2)}` : 'Indisponível'}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131F36]/70">
                <span className="text-[11px] text-slate-500 block">Acerto Classif.</span>
                <strong className="font-mono-tabular text-sm text-slate-900 dark:text-white">
                  {calibration.classificationMatchRatePct !== null ? `${calibration.classificationMatchRatePct}%` : 'Indisponível'}
                </strong>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs ${
                calibration.isPreliminary
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              {calibration.preliminaryNotice}
            </div>

            <div className="space-y-2.5">
              {driverPredictions.map((pr) => (
                <div
                  key={pr.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131F36]/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular font-bold">{pr.tripId ?? pr.proposalId ?? pr.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold ${EPISTEMIC_STYLE[pr.epistemicTag]}`}
                      >
                        {pr.epistemicTag}
                      </span>
                      <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                        {pr.status}
                      </span>
                      {pr.classificationMatched !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            pr.classificationMatched
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                          }`}
                        >
                          Classificação {pr.classificationMatched ? 'Coincidente' : 'Divergente'}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{pr.learningNote}</p>
                    <p className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                      Classificação:{' '}
                      {pr.predictedClassification ? TIER_OPERATIONAL_MEANINGS[pr.predictedClassification] : 'Indisponível'}{' '}
                      → Observada:{' '}
                      {pr.observedClassification ? TIER_OPERATIONAL_MEANINGS[pr.observedClassification] : 'Aguarda viagem'}
                    </p>
                  </div>
                  <div className="font-mono-tabular text-left lg:text-right shrink-0 space-y-0.5">
                    <p>
                      Prev: €{pr.predictedNetEur.toFixed(2)} · {pr.predictedDurationMin}m
                      {pr.predictedDistanceKm !== undefined ? ` · ${pr.predictedDistanceKm.toFixed(1)} km` : ''}
                    </p>
                    {pr.actualNetEur !== undefined ? (
                      <p className="font-bold text-slate-900 dark:text-white">
                        Real: €{pr.actualNetEur.toFixed(2)} · {pr.actualDurationMin}m
                        {pr.actualDistanceKm !== undefined ? ` · ${pr.actualDistanceKm.toFixed(1)} km` : ''} · Δ{' '}
                        {(pr.deltaNetEur ?? 0) >= 0 ? '+' : ''}€{(pr.deltaNetEur ?? 0).toFixed(2)}
                      </p>
                    ) : (
                      <p className="text-slate-400">Aguarda conclusão da viagem</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}
    </div>
  );
};
