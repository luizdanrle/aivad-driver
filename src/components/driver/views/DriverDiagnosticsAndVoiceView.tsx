import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  History,
  Layers,
  Play,
  Plug,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import {
  WEB_PWA_ANDROID_IOS_MATRIX,
  detectRuntimeBrowserDiagnostics,
} from '../../../adapters/nativeBridgeContracts';
import {
  buildOperationalAlertVoiceAnnouncement,
  buildProposalVoiceAnnouncement,
  isBrowserSpeechSynthesisSupported,
  type VoiceCategoryKey,
  type VoiceOutputChannel,
  type VoiceReadingStyle,
} from '../../../core/voiceCopilot';
import type { LifecycleAuditEventType } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import { Badge, Card, SectionHeader } from '../../ui/DesignSystem';

interface ServerDiagnosticsPayload {
  ok: boolean;
  serverTime?: string;
  nodeEnv?: string;
  security?: {
    productionReadySecret: boolean;
    ephemeralDevSecretActive: boolean;
    demoSandboxAllowed: boolean;
  };
  persistence?: {
    engine: string;
    usersCount: number;
    sessionsCount: number;
    zoneObservationsCount: number;
    cmsPublishedUpdatedAt: string | null;
  };
  connectors?: {
    uberVaultConfigured: boolean;
    boltVaultConfigured: boolean;
  };
}

const VOICE_CATEGORY_LABELS: Record<VoiceCategoryKey, { title: string; desc: string }> = {
  proposals: {
    title: 'Propostas de Viagem & Semáforo',
    desc: 'Anuncia valor bruto, €/km, €/h, Verde/Amarelo/Vermelho e recomendação IA.',
  },
  strategy: {
    title: 'Ajustes de Estratégia & AutoPilot',
    desc: 'Informa calibrações semiautomáticas e decisões automáticas executadas.',
  },
  zones: {
    title: 'Alertas Operacionais de Zona',
    desc: 'Avisa restrições ativas, trânsito intenso e pontos seguros de recolha.',
  },
  lifecycleTimers: {
    title: 'Chegada, Espera & Cancelamentos',
    desc: 'Notifica início de espera paga, prazos de no-show e transições da viagem.',
  },
  battery: {
    title: 'Reserva de Bateria & Autonomia EV',
    desc: 'Alerta quando uma proposta compromete a reserva mínima configurada.',
  },
  tvdeLimits: {
    title: 'Limites Legais TVDE (10h / 24h)',
    desc: 'Avisos preventivos às 8h, críticos às 9h e bloqueio legal às 10h.',
  },
};

const ALL_LIFECYCLE_EVENT_TYPES: LifecycleAuditEventType[] = [
  'Proposta recebida',
  'Proposta analisada',
  'Aceitação / Rejeição',
  'Viagem iniciada',
  'Chegada à recolha',
  'Espera',
  'Viagem concluída',
  'Cancelamento',
  'Falha de captura',
  'Perda de ligação',
  'Correção manual',
];

export const DriverDiagnosticsAndVoiceView: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const prefersReducedMotion = useReducedMotion();
  const {
    state,
    setDriverNav,
    updateVoiceCopilotConfig,
    triggerVoiceAnnouncement,
    runConnectorTest,
    updateConnectorPermissions,
    simulateConnectorDisconnection,
    syncNowToServer,
    revokeCurrentServerSession,
  } = useEcosystem();

  const currentSection: 'voz' | 'conectores' | 'diagnostico' =
    activeTab === 'voz-copiloto'
      ? 'voz'
      : activeTab === 'conectores'
        ? 'conectores'
        : 'diagnostico';

  const [serverDiag, setServerDiag] = useState<ServerDiagnosticsPayload | null>(null);
  const [serverHealthOk, setServerHealthOk] = useState<boolean | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [connectorNotice, setConnectorNotice] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState<string>('ALL');

  const runtimeDiag = useMemo(() => detectRuntimeBrowserDiagnostics(), []);
  const speechSupported = useMemo(() => isBrowserSpeechSynthesisSupported(), []);

  const refreshDiagnostics = useCallback(async () => {
    setLoadingDiag(true);
    try {
      const [hRes, dRes] = await Promise.all([
        fetch('/api/health', { credentials: 'include' }),
        fetch('/api/diagnostics/summary', { credentials: 'include' }),
      ]);
      setServerHealthOk(hRes.ok);
      if (dRes.ok) {
        const json = (await dRes.json()) as ServerDiagnosticsPayload;
        setServerDiag(json);
      }
    } catch {
      setServerHealthOk(false);
    } finally {
      setLoadingDiag(false);
    }
  }, []);

  useEffect(() => {
    void refreshDiagnostics();
  }, [refreshDiagnostics]);

  const filteredLifecycleEvents = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return state.lifecycleAuditEvents.filter((ev) => {
      if (auditTypeFilter !== 'ALL' && ev.eventType !== auditTypeFilter) return false;
      if (!q) return true;
      return (
        ev.eventType.toLowerCase().includes(q) ||
        ev.originPlatform.toLowerCase().includes(q) ||
        ev.associatedPayloadSummary.toLowerCase().includes(q) ||
        ev.currentState.toLowerCase().includes(q) ||
        ev.changeOrigin.toLowerCase().includes(q)
      );
    });
  }, [state.lifecycleAuditEvents, auditSearch, auditTypeFilter]);

  const handleTestVoiceProposal = () => {
    const latest = state.proposals[0];
    const draft = latest
      ? buildProposalVoiceAnnouncement(
          latest.input,
          latest.analysis,
          latest.autoPilotDecision?.action ?? 'Recomendação: aceitar'
        )
      : buildOperationalAlertVoiceAnnouncement(
          'strategy',
          'Sinal verde. Uber Green 14,50 euros, 1,42 por quilómetro, 31 por hora. Recomendação: aceitar.',
          'Proposta de demonstração Uber Green: valor bruto 14,50 euros, rentabilidade 1,42 euros por quilómetro e 31 euros por hora. Sinal verde, recomendação aceitar.'
        );
    // Use unique hash for explicit interactive test button unless testing cooldown
    const res = triggerVoiceAnnouncement({
      ...draft,
      dedupHash: `manual-test-${Date.now()}`,
    });
    setVoiceFeedback(
      res.spoken
        ? 'Anúncio de proposta enviado para síntese Web Speech API / canal visual.'
        : 'Anúncio processado em modo Visual (ou categoria/voz desativada).'
    );
  };

  const handleTestVoiceCooldown = () => {
    const draft = buildOperationalAlertVoiceAnnouncement(
      'zones',
      'Alerta zona Aeroporto: condicionamento ativo no Kiss & Fly.',
      'Alerta operacional na zona Aeroporto de Lisboa: condicionamento Kiss & Fly ativo. Sugerida recolha alternativa no Parque P2.'
    );
    const res = triggerVoiceAnnouncement(draft);
    if (res.suppressedByCooldown) {
      setVoiceFeedback(
        `Anti-repetição validada: mensagem idêntica bloqueada pela janela de cooldown (${state.voiceConfig.cooldownSeconds}s).`
      );
    } else {
      setVoiceFeedback(
        'Primeira emissão registada. Clique novamente dentro da janela de cooldown para testar o bloqueio anti-repetição.'
      );
    }
  };

  const handleRunConnectorSuite = (connectorId: 'uber' | 'bolt', level: 1 | 2 | 3) => {
    const result = runConnectorTest(connectorId, level);
    setConnectorNotice(
      `[${connectorId.toUpperCase()} · Nível ${level}] ${result.statusBadge} — ${result.technicalConclusion}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Sub-Navigation Tabs with Animated Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="inline-flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#131F36] border border-slate-200/80 dark:border-slate-800" role="tablist" aria-label="Módulos de Voz, Conectores e Diagnóstico">
          {[
            { id: 'voz' as const, nav: 'voz-copiloto', label: 'AIVAD Voice · Copiloto', icon: Volume2 },
            { id: 'conectores' as const, nav: 'conectores', label: 'Conectores Uber & Bolt (3 Níveis)', icon: Plug },
            { id: 'diagnostico' as const, nav: 'diagnostico', label: 'Diagnóstico, Auditoria & Matriz Nativa', icon: Activity },
          ].map((tabItem) => {
            const TabIcon = tabItem.icon;
            const active = currentSection === tabItem.id;
            return (
              <button
                key={tabItem.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDriverNav(tabItem.nav)}
                className={`relative min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  active
                    ? 'text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={prefersReducedMotion ? undefined : 'diag-voice-active-tab'}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 rounded-xl bg-blue-700 shadow-xs"
                  />
                )}
                <TabIcon className="w-4 h-4 relative z-10 shrink-0" />
                <span className="relative z-10 whitespace-nowrap">{tabItem.label}</span>
              </button>
            );
          })}
        </div>

        <Badge tone={state.session.isDemoSession ? 'amber' : 'emerald'}>
          {state.session.isDemoSession ? 'Sessão: Modo Demonstração' : 'Sessão: Conta Real'}
        </Badge>
      </div>

      <AnimatePresence mode="wait">
        {currentSection === 'voz' && (
          <motion.div
            key="tab-voz"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-6"
          >
            <SectionHeader
              eyebrow="Copiloto de Condução Mãos-Livres (Gratuito)"
              title="AIVAD Voice — Síntese Inteligente com Fila de Prioridade"
              description="Leitura vocal imediata de propostas, classificação semafórica, alertas de zona, bateria EV e limites legais TVDE de 10h sem recorrer a APIs pagas."
              action={
                <button
                  type="button"
                  onClick={() => updateVoiceCopilotConfig({ enabled: !state.voiceConfig.enabled })}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    state.voiceConfig.enabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {state.voiceConfig.enabled ? (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>Voz Ativa</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Voz Desativada</span>
                    </>
                  )}
                </button>
              }
            />

            {/* Honest Technical Boundary Banner */}
            <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">
                  Motor ativo nesta fase: Browser Web Speech API ({speechSupported ? 'Suportado neste navegador' : 'Indisponível neste ambiente headless/browser'})
                </p>
                <p>
                  Na Web/PWA, a síntese funciona gratuitamente com o separador ativo. Em condução com ecrã bloqueado ou sobre apps externas em Android/iOS, o sistema operativo pode suspender o áudio do browser — o contrato nativo <code className="font-mono-tabular">NativeVoiceTtsContract</code> com <em>AudioFocus Ducking</em> está pronto para compilação em Windsurf.
                </p>
              </div>
            </div>

            {voiceFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                {voiceFeedback}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="lg:col-span-2 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Parâmetros de Leitura, Canal e Anti-Repetição
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <label className="space-y-1 block">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Modo de Saída</span>
                    <select
                      value={state.voiceConfig.outputChannel}
                      onChange={(e) =>
                        updateVoiceCopilotConfig({ outputChannel: e.target.value as VoiceOutputChannel })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="Visual + Voz">Visual + Voz</option>
                      <option value="Voz">Apenas Voz</option>
                      <option value="Visual">Apenas Visual (Silencioso)</option>
                    </select>
                  </label>

                  <label className="space-y-1 block">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Detalhe da Leitura</span>
                    <select
                      value={state.voiceConfig.readingStyle}
                      onChange={(e) =>
                        updateVoiceCopilotConfig({ readingStyle: e.target.value as VoiceReadingStyle })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="resumo">Resumo Rápido (Condução)</option>
                      <option value="completa">Leitura Completa Detalhada</option>
                    </select>
                  </label>

                  <label className="space-y-1 block">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Idioma / Sotaque</span>
                    <select
                      value={state.voiceConfig.language}
                      onChange={(e) =>
                        updateVoiceCopilotConfig({
                          language: e.target.value as typeof state.voiceConfig.language,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="pt-PT">Português (Portugal · pt-PT)</option>
                      <option value="pt-BR">Português (Brasil · pt-BR)</option>
                      <option value="en-GB">English (UK · en-GB)</option>
                      <option value="es-ES">Español (España · es-ES)</option>
                      <option value="fr-FR">Français (France · fr-FR)</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
                  <label className="space-y-1.5 block">
                    <div className="flex justify-between">
                      <span className="font-semibold">Velocidade</span>
                      <span className="font-mono-tabular font-bold">{state.voiceConfig.rate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.75}
                      max={1.4}
                      step={0.05}
                      value={state.voiceConfig.rate}
                      onChange={(e) => updateVoiceCopilotConfig({ rate: Number(e.target.value) })}
                      className="w-full accent-blue-700"
                    />
                  </label>

                  <label className="space-y-1.5 block">
                    <div className="flex justify-between">
                      <span className="font-semibold">Volume</span>
                      <span className="font-mono-tabular font-bold">{Math.round(state.voiceConfig.volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={state.voiceConfig.volume}
                      onChange={(e) => updateVoiceCopilotConfig({ volume: Number(e.target.value) })}
                      className="w-full accent-blue-700"
                    />
                  </label>

                  <label className="space-y-1.5 block">
                    <div className="flex justify-between">
                      <span className="font-semibold">Cooldown Anti-Repetição</span>
                      <span className="font-mono-tabular font-bold">{state.voiceConfig.cooldownSeconds}s</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={5}
                      value={state.voiceConfig.cooldownSeconds}
                      onChange={(e) =>
                        updateVoiceCopilotConfig({ cooldownSeconds: Number(e.target.value) })
                      }
                      className="w-full accent-blue-700"
                    />
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Categorias de Avisos Ativas
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(Object.keys(VOICE_CATEGORY_LABELS) as VoiceCategoryKey[]).map((catKey) => {
                      const meta = VOICE_CATEGORY_LABELS[catKey];
                      const checked = state.voiceConfig.categories[catKey];
                      return (
                        <label
                          key={catKey}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              updateVoiceCopilotConfig({
                                categories: {
                                  ...state.voiceConfig.categories,
                                  [catKey]: e.target.checked,
                                },
                              })
                            }
                            className="mt-0.5 rounded accent-blue-700"
                          />
                          <div>
                            <span className="font-bold block text-slate-900 dark:text-white">
                              {meta.title}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {meta.desc}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleTestVoiceProposal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Testar Anúncio de Proposta</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestVoiceCooldown}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Testar Anti-Repetição (Cooldown)</span>
                  </button>
                </div>
              </Card>

              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Fila & Histórico de Voz
                  </h3>
                  <Badge tone="blue">{state.voiceHistory.length} registos</Badge>
                </div>
                {state.voiceHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    Ainda sem anúncios emitidos nesta sessão. Analise uma proposta ou clique em &ldquo;Testar Anúncio de Proposta&rdquo;.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {state.voiceHistory.slice(0, 14).map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            tone={
                              item.priority === 'alta'
                                ? 'red'
                                : item.priority === 'media'
                                  ? 'amber'
                                  : 'slate'
                            }
                          >
                            Prioridade {item.priority} · {item.category}
                          </Badge>
                          <span className="text-[10px] font-mono-tabular text-slate-400">
                            {item.createdAtIso.slice(11, 19)}
                          </span>
                        </div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {item.spokenText}
                        </p>
                        <span className="text-[10px] text-slate-500 block">
                          Canal: {item.deliveryChannel} · Áudio sintetizado: {item.deliveredAudio ? 'Sim' : 'Fallback Visual'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </motion.div>
        )}

        {currentSection === 'conectores' && (
          <motion.div
            key="tab-conectores"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-6"
          >
            <SectionHeader
              eyebrow="Arquitetura Independente de Plataformas & Testes Verificáveis"
              title="Conectores Uber & Bolt — Separação Real de APIs e Suite de 3 Níveis"
              description="Distingue rigorosamente API de Passageiros, Fleet/Partner API e Despacho de Motorista, separando permissão de leitura/captura da permissão de controlo externo."
            />

            {/* 4 Explicit Connector States Legend (Comando 6.1 §6) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
              <Card className="p-3.5 space-y-1 border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-white">1. Não configurado</p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Sem chaves OAuth no cofre do servidor. A importação CSV/OCR e o Simulador Nível 1 continuam 100% operacionais.
                </p>
              </Card>
              <Card className="p-3.5 space-y-1 border-blue-200 dark:border-blue-800/70 bg-blue-50/40 dark:bg-blue-950/20">
                <p className="font-bold text-blue-700 dark:text-blue-300">2. Configurado</p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Segredos de parceiro (<code className="font-mono">CLIENT_ID</code>) presentes no servidor, prontos para autorização do motorista.
                </p>
              </Card>
              <Card className="p-3.5 space-y-1 border-amber-200 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-950/20">
                <p className="font-bold text-amber-800 dark:text-amber-300">3. Sandbox</p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Ambiente isolado de ensaio técnico (Nível 1 e Nível 2) para testar permissões e reconexão sem tocar em viagens reais.
                </p>
              </Card>
              <Card className="p-3.5 space-y-1 border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20">
                <p className="font-bold text-emerald-800 dark:text-emerald-300">4. Integração real validada</p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Token OAuth oficial de parceiro ou bridge nativo Android Nível 3 ativo e verificado com dados reais autorizados.
                </p>
              </Card>
            </div>

            {connectorNotice && (
              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 text-xs font-medium text-blue-900 dark:text-blue-200">
                {connectorNotice}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {(['uber', 'bolt'] as const).map((cid) => {
                const conn = state.connectors[cid];
                return (
                  <Card key={cid} className="p-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-display font-extrabold text-slate-900 dark:text-white">
                            {conn.displayName}
                          </h3>
                          <Badge
                            tone={
                              conn.dataOriginTag === 'Dados reais'
                                ? 'emerald'
                                : conn.dataOriginTag === 'Dados importados'
                                  ? 'blue'
                                  : 'amber'
                            }
                          >
                            {conn.dataOriginTag}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Estado: <strong className="text-slate-800 dark:text-slate-200">{conn.connectionState}</strong>
                          {' · '}Cofre Server-Side:{' '}
                          <strong>{conn.serverVaultConfigured ? 'Configurado' : 'Não configurado (opcional em Dev/Preview)'}</strong>
                        </p>
                        {!conn.serverVaultConfigured && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            Sem credenciais OAuth no servidor: apenas o conector OAuth externo fica desativado. Importação CSV/OCR e Simulador Nível 1 continuam operacionais.
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          simulateConnectorDisconnection(
                            cid,
                            `Timeout HTTP 503 simulado no endpoint ${cid.toUpperCase()}`
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      >
                        <WifiOff className="w-3.5 h-3.5" />
                        <span>Testar Reconexão / Backoff</span>
                      </button>
                    </div>

                    {conn.lastError && (
                      <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                        Última falha: <strong>{conn.lastError}</strong> · Próxima tentativa automática em{' '}
                        <span className="font-mono-tabular font-bold">{conn.nextReconnectBackoffSec}s</span> (tentativa #{conn.reconnectAttempt}).
                      </div>
                    )}

                    {/* Explicit Permission Separation: Read/Capture vs External Execution */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <label className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={conn.readCapturePermissionGranted}
                          onChange={(e) =>
                            updateConnectorPermissions(cid, {
                              readCapturePermissionGranted: e.target.checked,
                            })
                          }
                          className="mt-0.5 accent-blue-700"
                        />
                        <div>
                          <span className="font-bold block">Permissão de Leitura / Captura</span>
                          <span className="text-[11px] text-slate-500">
                            Autoriza ler extratos CSV/JSON, notificações e OCR desta plataforma.
                          </span>
                        </div>
                      </label>

                      <label className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={conn.externalControlPermissionGranted}
                          onChange={(e) =>
                            updateConnectorPermissions(cid, {
                              externalControlPermissionGranted: e.target.checked,
                            })
                          }
                          className="mt-0.5 accent-emerald-600"
                        />
                        <div>
                          <span className="font-bold block">Permissão de Execução Externa</span>
                          <span className="text-[11px] text-slate-500">
                            Autoriza o AutoPilot Automático a executar ações quando existir canal oficial/autorizado.
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* API Surfaces Separation Table */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Separação Técnica de Superfícies de API ({cid.toUpperCase()})
                      </p>
                      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                        {conn.apiSurfaces.map((surf) => (
                          <div key={surf.surface} className="p-2.5 bg-slate-50/50 dark:bg-slate-950/40 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">{surf.surface}</span>
                              <div className="flex gap-1.5">
                                <Badge tone={surf.publiclyDocumented ? 'blue' : 'slate'}>
                                  {surf.publiclyDocumented ? 'Doc. Pública' : 'Restrita / Privada'}
                                </Badge>
                                <Badge tone={surf.allowsOfferAcceptReject ? 'emerald' : 'amber'}>
                                  {surf.allowsOfferAcceptReject ? 'Aceita/Rejeita Ofertas' : 'Sem Despacho Público'}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              {surf.technicalRealityNote}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3-Level Verification Buttons */}
                    <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Executar Suite de Verificação em 3 Níveis
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleRunConnectorSuite(cid, 1)}
                          className="px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
                        >
                          Nível 1 · Simulador
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRunConnectorSuite(cid, 2)}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                        >
                          Nível 2 · Sandbox / OAuth
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRunConnectorSuite(cid, 3)}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                        >
                          Nível 3 · Dispositivo Real
                        </button>
                      </div>
                    </div>

                    {/* Test Results Output */}
                    {conn.testResults.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {conn.testResults.map((tr) => (
                          <div
                            key={tr.id}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold">{tr.levelName}</span>
                              <Badge tone={tr.passed ? 'emerald' : 'amber'}>{tr.statusBadge}</Badge>
                            </div>
                            <ul className="space-y-1">
                              {tr.checks.map((ck) => (
                                <li key={ck.label} className="flex items-start gap-1.5 text-[11px]">
                                  {ck.ok ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                  )}
                                  <span>
                                    <strong>{ck.label}:</strong> {ck.detail}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                              {tr.technicalConclusion}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {currentSection === 'diagnostico' && (
          <motion.div
            key="tab-diagnostico"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-6"
          >
            <SectionHeader
              eyebrow="TRANSPARÊNCIA TÉCNICA, AUDITORIA E COMPATIBILIDADE MULTIPLATAFORMA"
              title="Diagnóstico Operacional & Registo Unificado de Acontecimentos"
              description="Estado verificável em tempo real da API Express, sessão, persistência, permissões do dispositivo, matriz Web/PWA/Android/iOS e histórico auditável de 11 tipos de eventos."
              action={
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void refreshDiagnostics()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDiag ? 'animate-spin' : ''}`} />
                    <span>Atualizar Diagnóstico</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void syncNowToServer()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Sincronizar Agora</span>
                  </button>
                </div>
              }
            />

            {/* Top Live Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>API Backend Express</span>
                  <Cpu className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-base font-extrabold">
                  {serverHealthOk === null
                    ? 'A verificar...'
                    : serverHealthOk
                      ? 'Online (/api/health OK)'
                      : 'Modo Offline Local'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Ambiente: {serverDiag?.nodeEnv ?? 'development'} · Segredo:{' '}
                  {serverDiag?.security?.productionReadySecret
                    ? 'Forte Configurado'
                    : 'Efêmero Dev Seguro'}
                </p>
              </Card>

              <Card className="p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Autenticação & Isolamento</span>
                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-base font-extrabold">
                  {state.session.isDemoSession ? 'Sandbox Demonstração' : 'Conta Real Isolada'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Perfil: {state.session.role} · Zero auth em localStorage
                </p>
                {state.session.authenticated && (
                  <button
                    type="button"
                    onClick={() => void revokeCurrentServerSession()}
                    className="text-[11px] font-semibold text-red-600 dark:text-red-400 underline pt-0.5"
                  >
                    Revogar sessão no servidor
                  </button>
                )}
              </Card>

              <Card className="p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Persistência & Sincronização</span>
                  <Database className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-base font-extrabold capitalize">
                  {state.syncStatus} <span className="text-xs font-mono-tabular text-slate-500">v{state.serverSyncVersion}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Cache local + Express JSON Store (Protótipo) · Produção: PostgreSQL 16+
                </p>
                {state.syncConflictDetail && (
                  <button
                    type="button"
                    onClick={() => void syncNowToServer({ forceOverwrite: true })}
                    className="text-[11px] font-semibold text-amber-600 underline"
                  >
                    Conflito detetado: Forçar envio
                  </button>
                )}
              </Card>

              <Card className="p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Runtime & Permissões</span>
                  <Layers className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-base font-extrabold">{runtimeDiag.detectedPlatform}</p>
                <p className="text-[11px] text-slate-500">
                  Voz TTS: {runtimeDiag.speechSynthesisSupported ? 'Ativa' : 'N/D'} · GPS:{' '}
                  {runtimeDiag.geolocationSupported ? 'Disponível' : 'N/D'} · Bridge Nativo:{' '}
                  {runtimeDiag.nativeBridgeInjected ? 'Ativo' : 'Web'}
                </p>
              </Card>
            </div>

            {/* Honest Module Classification Table */}
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Classificação Honesta de Estado Real por Módulo (Comando 6 §18)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-2 pr-3 font-semibold">Módulo AIVAD</th>
                      <th className="py-2 px-3 font-semibold">Classificação Atual</th>
                      <th className="py-2 pl-3 font-semibold">Evidência Técnica & Limites</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    <tr>
                      <td className="py-2.5 pr-3 font-bold">AutoPilot (Manual, Semiautomático, Automático)</td>
                      <td className="py-2.5 px-3"><Badge tone="emerald">Operacional Real</Badge></td>
                      <td className="py-2.5 pl-3 text-slate-600 dark:text-slate-300">
                        Motor unificado: executa automaticamente quando canal autorizado está ativo e aplica fallback assistido honesto quando não existe API/bridge externo.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-bold">Smart Data Capture (OCR texto, CSV, JSON, Deduplicação)</td>
                      <td className="py-2.5 px-3"><Badge tone="blue">Dados Importados / Operacional</Badge></td>
                      <td className="py-2.5 pl-3 text-slate-600 dark:text-slate-300">
                        Parser determinístico com score de confiança (0–100%), reconciliação de viagens/gorjetas e histórico auditável de correções manuais.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-bold">Tacógrafo TVDE, Relatórios, Frota e Radar Histórico</td>
                      <td className="py-2.5 px-3"><Badge tone="emerald">Operacional Real</Badge></td>
                      <td className="py-2.5 pl-3 text-slate-600 dark:text-slate-300">
                        União de intervalos sem dupla contagem, QR verificável, relatórios diário/semanal/mensal e distinção explícita entre histórico real e modo demonstração.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-bold">Autenticação, Sessões HttpOnly e CMS Público Persistido</td>
                      <td className="py-2.5 px-3"><Badge tone="emerald">Operacional Real</Badge></td>
                      <td className="py-2.5 pl-3 text-slate-600 dark:text-slate-300">
                        Scrypt + HMAC fail-closed em produção; Demo Sandbox impedida de alterar o CMS público global do servidor Express.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-bold">Overlay sobre Uber/Bolt & Interceção Nativa de Notificações</td>
                      <td className="py-2.5 px-3"><Badge tone="amber">Pendente Windsurf / Nativo</Badge></td>
                      <td className="py-2.5 pl-3 text-slate-600 dark:text-slate-300">
                        Bloqueado por segurança nos browsers Web/PWA. Contratos TypeScript prontos em <code className="font-mono-tabular">nativeBridgeContracts.ts</code> para Android Kotlin / iOS Swift.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Web / PWA / Android / iOS Compatibility Matrix */}
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Matriz de Compatibilidade Web · PWA · Android Nativo · iOS Nativo
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-2 pr-3 font-semibold">Capacidade</th>
                      <th className="py-2 px-2 font-semibold">Web Browser</th>
                      <th className="py-2 px-2 font-semibold">PWA</th>
                      <th className="py-2 px-2 font-semibold">Android</th>
                      <th className="py-2 px-2 font-semibold">iOS</th>
                      <th className="py-2 pl-3 font-semibold">Critério de Aceitação Windsurf</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {WEB_PWA_ANDROID_IOS_MATRIX.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2.5 pr-3 font-semibold">{row.capability}</td>
                        <td className="py-2.5 px-2">{row.webBrowser}</td>
                        <td className="py-2.5 px-2">{row.pwaInstalled}</td>
                        <td className="py-2.5 px-2">{row.androidNative}</td>
                        <td className="py-2.5 px-2">{row.iosNative}</td>
                        <td className="py-2.5 pl-3 text-[11px] text-slate-600 dark:text-slate-300">
                          {row.windsurfAcceptanceCriteria}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Unified 11-Type Lifecycle Audit Event Log */}
            <Card className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Registo Auditável Unificado de Acontecimentos (11 Tipos · Idempotente)
                  </h3>
                </div>
                <Badge tone="blue">{filteredLifecycleEvents.length} eventos</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Pesquisar plataforma, estado, origem ou detalhe..."
                    aria-label="Pesquisar no histórico auditável de acontecimentos"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <select
                  value={auditTypeFilter}
                  onChange={(e) => setAuditTypeFilter(e.target.value)}
                  aria-label="Filtrar por tipo de acontecimento"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="ALL">Todos os 11 tipos de acontecimento</option>
                  {ALL_LIFECYCLE_EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {filteredLifecycleEvents.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Nenhum acontecimento encontrado para o filtro selecionado.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {filteredLifecycleEvents.slice(0, 35).map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="blue">{ev.eventType}</Badge>
                          <span className="font-bold uppercase text-[11px] text-slate-700 dark:text-slate-300">
                            {ev.originPlatform}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            · Origem: <strong>{ev.changeOrigin}</strong>
                          </span>
                        </div>
                        <span className="font-mono-tabular text-[11px] text-slate-400">
                          {ev.timestamp.replace('T', ' ').slice(0, 19)}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {ev.associatedPayloadSummary}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono-tabular">
                        Transição: {ev.previousState} → {ev.currentState} · Chave: {ev.idempotencyKey}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
