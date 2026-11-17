import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Layers,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import {
  getAssistantsForScope,
  INTERACTIVE_ASSISTANTS,
  type AssistantScope,
  type AssistantStepStatus,
} from '../../core/interactiveAssistants';
import { useEcosystem } from '../../services/EcosystemContext';
import { Button, Card, StatusLabel } from './DesignSystem';

const STEP_STATUS_META: Record<
  AssistantStepStatus,
  { tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon: React.ComponentType<{ className?: string }> }
> = {
  'Por iniciar': { tone: 'neutral', icon: Compass },
  'Em andamento': { tone: 'info', icon: Sparkles },
  Concluído: { tone: 'success', icon: CheckCircle2 },
  Falhou: { tone: 'danger', icon: XCircle },
  'Pendente de permissão': { tone: 'warning', icon: AlertTriangle },
  'Pendente de integração': { tone: 'warning', icon: AlertTriangle },
  'Não suportado neste dispositivo': { tone: 'warning', icon: AlertTriangle },
};

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const InteractiveAssistantOverlay: React.FC<{ scope: AssistantScope }> = ({ scope }) => {
  const prefersReducedMotion = useReducedMotion();
  const {
    state,
    openAssistantHub,
    closeAssistantHub,
    startInteractiveAssistant,
    pauseInteractiveAssistant,
    resumeInteractiveAssistant,
    resetInteractiveAssistant,
    goToAssistantStep,
    verifyCurrentAssistantStep,
    confirmCurrentAssistantStepByUser,
    skipOptionalCurrentAssistantStep,
    closeInteractiveAssistant,
  } = useEcosystem();

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [lastOutcomeNote, setLastOutcomeNote] = useState<string | null>(null);

  const scopedAssistants = getAssistantsForScope(
    scope,
    scope === 'admin' ? state.activeAdminRole : null
  );

  const activeDef = state.activeAssistantId
    ? INTERACTIVE_ASSISTANTS.find((a) => a.id === state.activeAssistantId && a.scope === scope) ?? null
    : null;
  const activeProgress = activeDef ? state.assistantProgress[activeDef.id] : undefined;
  const currentStep =
    activeDef && activeProgress
      ? activeDef.steps[activeProgress.currentStepIndex] ?? activeDef.steps[0]
      : null;

  // Measure target element for spotlight highlight
  useEffect(() => {
    setLastOutcomeNote(null);
    if (!currentStep?.targetSelector || activeProgress?.status === 'Pausado') {
      setSpotlightRect(null);
      return;
    }

    const measure = (shouldScroll: boolean) => {
      const el = document.querySelector(currentStep.targetSelector!);
      if (!el) {
        setSpotlightRect(null);
        return;
      }
      if (shouldScroll && typeof (el as HTMLElement).scrollIntoView === 'function') {
        try {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
          // ignore
        }
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        setSpotlightRect(null);
        return;
      }
      setSpotlightRect({
        top: Math.max(4, rect.top - 6),
        left: Math.max(4, rect.left - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });
    };

    const timer = window.setTimeout(() => measure(true), 120);
    const onViewportChange = () => measure(false);
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [currentStep?.id, currentStep?.targetSelector, activeProgress?.status, state.activeDriverNav, state.activeAdminNav, state.activePortalPage]);

  const currentStatus: AssistantStepStatus =
    currentStep && activeProgress
      ? activeProgress.stepStatuses[currentStep.id] ?? 'Por iniciar'
      : 'Por iniciar';
  const currentDetail =
    (currentStep && activeProgress?.stepNotes[currentStep.id]) || lastOutcomeNote || null;

  return (
    <>
      {/* Non-blocking Spotlight Frame around the target element */}
      <AnimatePresence>
        {spotlightRect && activeDef && activeProgress?.status !== 'Pausado' && (
          <motion.div
            key={`spotlight-${currentStep?.id}`}
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-testid="interactive-assistant-spotlight"
            style={{
              top: `${spotlightRect.top}px`,
              left: `${spotlightRect.left}px`,
              width: `${spotlightRect.width}px`,
              height: `${spotlightRect.height}px`,
            }}
            className="pointer-events-none fixed z-[45] rounded-2xl border-2 border-blue-600 dark:border-blue-400 ring-4 ring-blue-500/25 shadow-[0_0_24px_rgba(37,99,235,0.28)]"
          >
            <span className="absolute -top-6 left-2 px-2 py-0.5 rounded-md bg-blue-700 text-white text-[10px] font-bold shadow-xs whitespace-nowrap">
              Alvo da etapa atual
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Floating Companion Panel */}
      <AnimatePresence>
        {activeDef && activeProgress && currentStep && (
          <motion.aside
            key={activeDef.id}
            role="region"
            aria-label={`Assistente Interativo: ${activeDef.title}`}
            data-testid="interactive-assistant-panel"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-16 lg:bottom-5 left-3 sm:left-5 z-[48] w-[min(430px,calc(100vw-24px))] rounded-2xl border-2 border-blue-500/80 dark:border-blue-500/70 bg-white/98 dark:bg-[#0F182B]/98 backdrop-blur-md shadow-2xl p-4 space-y-3 text-xs"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-400">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{activeDef.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                  Etapa {activeProgress.currentStepIndex + 1} de {activeDef.steps.length} · Estado geral:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{activeProgress.status}</strong>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={openAssistantHub}
                  title="Todos os Assistentes"
                  aria-label="Abrir Centro de Guias e Assistentes"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={closeInteractiveAssistant}
                  aria-label="Fechar assistente interativo"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Step Progress Dots */}
            <div className="flex items-center gap-1">
              {activeDef.steps.map((st, idx) => {
                const stStatus = activeProgress.stepStatuses[st.id] ?? 'Por iniciar';
                const isCurr = idx === activeProgress.currentStepIndex;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => goToAssistantStep(idx)}
                    title={`${st.title} (${stStatus})`}
                    className={`h-2 flex-1 rounded-full transition-all cursor-pointer ${
                      stStatus === 'Concluído'
                        ? 'bg-emerald-500'
                        : stStatus === 'Falhou'
                        ? 'bg-rose-500'
                        : stStatus.startsWith('Pendente') || stStatus.startsWith('Não suportado')
                        ? 'bg-amber-500'
                        : isCurr
                        ? 'bg-blue-600'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {activeProgress.status === 'Pausado' ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800 space-y-2">
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  Assistente em pausa — progresso guardado
                </p>
                <p className="text-amber-800 dark:text-amber-300">
                  Pode continuar a usar a aplicação livremente e retomar exatamente na etapa {activeProgress.currentStepIndex + 1}.
                </p>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => resumeInteractiveAssistant()} icon={<Play className="w-3.5 h-3.5" />}>
                    Retomar Agora
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => resetInteractiveAssistant(activeDef.id)} icon={<RotateCcw className="w-3.5 h-3.5" />}>
                    Reiniciar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Current Step Details */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#131F36] border border-slate-200/80 dark:border-slate-700 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {currentStep.title}
                    </h3>
                    <StatusLabel tone={STEP_STATUS_META[currentStatus].tone} text={currentStatus} />
                  </div>

                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                    <strong>Instrução:</strong> {currentStep.instruction}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <strong>Objetivo:</strong> {currentStep.goal} · <strong>Esperado:</strong> {currentStep.expectedResult}
                  </p>

                  {currentDetail && (
                    <div
                      data-testid="assistant-verification-feedback"
                      className="p-2 rounded-lg bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200"
                    >
                      {currentDetail}
                    </div>
                  )}
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const res = verifyCurrentAssistantStep();
                        if (res) setLastOutcomeNote(`${res.status}: ${res.detail}`);
                      }}
                      icon={<ShieldCheck className="w-3.5 h-3.5" />}
                    >
                      Verificar Etapa
                    </Button>

                    {(currentStep.verificationType === 'user_confirm' ||
                      currentStep.verificationType === 'auto_or_confirm') &&
                      currentStatus !== 'Concluído' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            confirmCurrentAssistantStepByUser();
                            setLastOutcomeNote('Confirmado pelo utilizador.');
                          }}
                          icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        >
                          Confirmar Resultado
                        </Button>
                      )}

                    {currentStep.optional && currentStatus !== 'Concluído' && (
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={skipOptionalCurrentAssistantStep}
                        icon={<SkipForward className="w-3.5 h-3.5" />}
                      >
                        Saltar (Opcional)
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={activeProgress.currentStepIndex === 0}
                      onClick={() => goToAssistantStep(activeProgress.currentStepIndex - 1)}
                      aria-label="Etapa anterior"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={activeProgress.currentStepIndex >= activeDef.steps.length - 1}
                      onClick={() => goToAssistantStep(activeProgress.currentStepIndex + 1)}
                      aria-label="Próxima etapa"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={pauseInteractiveAssistant}
                      aria-label="Pausar assistente"
                      title="Pausar e guardar progresso"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => resetInteractiveAssistant(activeDef.id)}
                      aria-label="Reiniciar assistente"
                      title="Reiniciar do passo 1"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Centro de Guias & Assistentes Hub Modal */}
      <AnimatePresence>
        {state.assistantHubOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Centro de Guias e Assistentes Interativos"
            data-testid="assistant-hub-modal"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
          >
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full sm:max-w-3xl max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F182B] shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    Centro de Guias &amp; Assistentes Interativos ({scopedAssistants.length} disponíveis)
                  </p>
                  <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white">
                    Guias passo a passo com validação real no sistema
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cada assistente navega até ao módulo certo, destaca o controlo alvo e valida se a etapa foi realmente concluída ou se depende de permissão/integração.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAssistantHub}
                  aria-label="Fechar centro de assistentes"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {scopedAssistants.map((asst) => {
                  const prog = state.assistantProgress[asst.id];
                  const doneCount = prog
                    ? Object.values(prog.stepStatuses).filter((s) => s === 'Concluído').length
                    : 0;
                  const total = asst.steps.length;
                  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
                  return (
                    <Card key={asst.id} className="p-4 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
                            {asst.category}
                          </span>
                          <StatusLabel
                            tone={
                              prog?.status === 'Concluído'
                                ? 'success'
                                : prog?.status === 'Em curso'
                                ? 'info'
                                : prog?.status === 'Pausado'
                                ? 'warning'
                                : 'neutral'
                            }
                            text={prog?.status ?? 'Não iniciado'}
                          />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {asst.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {asst.subtitle}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{total} passos · ~{asst.estimatedMinutes} min</span>
                          <span className="font-mono-tabular font-bold">
                            {doneCount}/{total} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            onClick={() => startInteractiveAssistant(asst.id)}
                            icon={<Play className="w-3.5 h-3.5" />}
                          >
                            {prog && prog.status !== 'Não iniciado' ? 'Retomar Assistente' : 'Iniciar Assistente'}
                          </Button>
                          {prog && prog.status !== 'Não iniciado' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => resetInteractiveAssistant(asst.id)}
                              aria-label={`Reiniciar ${asst.title}`}
                              icon={<RotateCcw className="w-3.5 h-3.5" />}
                            >
                              Reiniciar
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
