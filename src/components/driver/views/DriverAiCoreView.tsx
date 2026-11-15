import React, { useState } from 'react';
import {
  Activity,
  Bot,
  Brain,
  CheckCircle2,
  Cpu,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AI_CORE_AGENTS, answerAiCoreQuery } from '../../../core/aiCore';
import type { EpistemicTag } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import { Card, ContextualHelpBanner } from '../../ui/DesignSystem';

const EPISTEMIC_STYLE: Record<EpistemicTag, string> = {
  'Informação confirmada':
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  'Informação histórica':
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  Estimativa:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Previsão:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
  'Informação indisponível':
    'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  'Dados de demonstração':
    'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export const DriverAiCoreView: React.FC = () => {
  const {
    state,
    activeDriver,
    activeDriverTrips,
    aiCoreBriefing,
    driverPredictions,
  } = useEcosystem();

  const [selectedAgentId, setSelectedAgentId] = useState<string>('ALL');
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<
    Array<{
      q: string;
      agentName: string;
      answer: string;
      sources: string[];
      epistemicTag: EpistemicTag;
      confidencePct: number;
    }>
  >([]);

  const handleAsk = (qText: string) => {
    const clean = qText.trim();
    if (!clean) return;
    const res = answerAiCoreQuery(clean, {
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
    setChatHistory((prev) => [{ q: clean, ...res }, ...prev]);
    setQuestion('');
  };

  const visibleBriefings =
    selectedAgentId === 'ALL'
      ? aiCoreBriefing
      : aiCoreBriefing.filter((b) => b.agentId === selectedAgentId);

  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="AIVAD AI CORE — O Cérebro Inteligente do Motorista"
        description="Coordena 8 agentes especializados sobre os seus dados reais. Todas as recomendações indicam inputs considerados, justificação, confiança numérica (%) e etiqueta epistémica."
        demoNotice="Aprendizagem isolada por utilizador"
      />

      {/* 8 Specialized Agents Grid */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-display font-bold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Arquitetura Multi-Agente (8 Especialistas)
          </h2>
          <button
            type="button"
            onClick={() => setSelectedAgentId('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
              selectedAgentId === 'ALL'
                ? 'bg-blue-700 text-white border-blue-700'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Todos os Agentes
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {AI_CORE_AGENTS.map((agent) => {
            const active = selectedAgentId === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => setSelectedAgentId(active ? 'ALL' : agent.id)}
                className={`p-3.5 rounded-xl border text-left transition-all space-y-1.5 ${
                  active
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                    {agent.name}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </div>
                <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                  {agent.roleTitle}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {agent.scope}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Briefings with Epistemic Tags, Confidence & Explainability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleBriefings.map((item) => (
          <Card key={item.id} className="p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
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
                  {item.confidencePct}% conf.
                </span>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <strong>Recomendação:</strong> {item.recommendation}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <p className="font-semibold text-slate-500 mb-1">Entradas consideradas</p>
                <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                  {item.inputsConsidered.map((inp, idx) => (
                    <li key={idx}>• {inp}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-500 mb-1">Passos &amp; Justificação</p>
                <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                  {item.analysisSteps.map((st, idx) => (
                    <li key={idx}>• {st}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>{item.justification}</span>
              <span className="font-mono-tabular">{item.operationLog}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Isolated Driver Learning Ledger: Prediction vs Real */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-display font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Aprendizagem Operacional Isolada (Previsto vs Real)
            </h2>
            <p className="text-xs text-slate-500">
              Compara o líquido e duração previstos pré-decisão com o resultado real observado na conclusão.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <Lock className="w-3.5 h-3.5" />
            Isolado para {activeDriver.name} ({activeDriver.id})
          </span>
        </div>

        <div className="space-y-2.5">
          {driverPredictions.map((pr) => (
            <div
              key={pr.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
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
                </div>
                <p className="text-slate-600 dark:text-slate-300">{pr.learningNote}</p>
              </div>
              <div className="font-mono-tabular text-right shrink-0 space-y-0.5">
                <p>
                  Prev: €{pr.predictedNetEur.toFixed(2)} ({pr.predictedDurationMin}m)
                </p>
                {pr.actualNetEur !== undefined ? (
                  <p className="font-bold text-slate-900 dark:text-white">
                    Real: €{pr.actualNetEur.toFixed(2)} ({pr.actualDurationMin}m) · Desvio{' '}
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

      {/* Interactive Grounded AI CORE Consultation */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-display font-bold flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Consultar AIVAD AI CORE
          </h2>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Nunca inventa tráfego ao vivo ou dados ausentes
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
              onClick={() => handleAsk(preset)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-xs font-medium hover:border-blue-600 text-left"
            >
              {preset}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(question);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pergunte sobre metas, horas 10h/24h, veículos, tráfego ou estratégia..."
            aria-label="Pergunta ao AIVAD AI CORE"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Analisar</span>
          </button>
        </form>

        {chatHistory.length > 0 && (
          <div className="space-y-3 pt-2">
            {chatHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{item.q}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${EPISTEMIC_STYLE[item.epistemicTag]}`}>
                      {item.epistemicTag}
                    </span>
                    <span className="font-mono-tabular text-[11px] font-semibold">
                      {item.confidencePct}% conf.
                    </span>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{item.answer}</p>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{item.agentName} · Fontes: {item.sources.join(', ')}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
