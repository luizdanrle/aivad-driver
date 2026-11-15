import type { ProposalAnalysis, ProposalInput, TripLifecyclePhase } from '../models/types';

export type VoiceOutputChannel = 'Visual + Voz' | 'Voz' | 'Visual';
export type VoiceReadingStyle = 'resumo' | 'completa';
export type VoicePriority = 'alta' | 'media' | 'baixa';
export type VoiceCategoryKey =
  | 'proposals'
  | 'strategy'
  | 'zones'
  | 'lifecycleTimers'
  | 'battery'
  | 'tvdeLimits';

export interface VoiceCopilotConfig {
  enabled: boolean;
  outputChannel: VoiceOutputChannel;
  language: 'pt-PT' | 'pt-BR' | 'en-GB' | 'es-ES' | 'fr-FR';
  rate: number; // 0.75 to 1.4
  volume: number; // 0.1 to 1.0
  readingStyle: VoiceReadingStyle;
  cooldownSeconds: number;
  categories: Record<VoiceCategoryKey, boolean>;
}

export interface VoiceAnnouncementItem {
  id: string;
  dedupHash: string;
  category: VoiceCategoryKey;
  priority: VoicePriority;
  shortText: string;
  fullText: string;
  spokenText: string;
  createdAtIso: string;
  deliveredAudio: boolean;
  deliveryChannel: 'WebSpeechAPI' | 'VisualOnly' | 'SuppressedCooldown' | 'NativeBridgeReady';
}

export const DEFAULT_VOICE_COPILOT_CONFIG: VoiceCopilotConfig = {
  enabled: true,
  outputChannel: 'Visual + Voz',
  language: 'pt-PT',
  rate: 1.05,
  volume: 0.9,
  readingStyle: 'resumo',
  cooldownSeconds: 20,
  categories: {
    proposals: true,
    strategy: true,
    zones: true,
    lifecycleTimers: true,
    battery: true,
    tvdeLimits: true,
  },
};

const PRIORITY_WEIGHT: Record<VoicePriority, number> = {
  alta: 3,
  media: 2,
  baixa: 1,
};

function simpleDedupHash(category: VoiceCategoryKey, text: string): string {
  return `${category}:${text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 96)}`;
}

export function buildProposalVoiceAnnouncement(
  input: ProposalInput,
  analysis: ProposalAnalysis,
  autoPilotActionLabel?: string
): Pick<VoiceAnnouncementItem, 'category' | 'priority' | 'shortText' | 'fullText' | 'dedupHash'> {
  const colorLabel =
    analysis.classification === 'verde'
      ? 'Sinal verde'
      : analysis.classification === 'amarelo'
        ? 'Sinal amarelo'
        : 'Sinal vermelho';

  const recLabel =
    autoPilotActionLabel ??
    (analysis.classification === 'verde'
      ? 'Recomendação: aceitar'
      : analysis.classification === 'amarelo'
        ? 'Recomendação: avaliar contexto'
        : 'Recomendação: recusar');

  const shortText = `${colorLabel}. ${input.platformId.toUpperCase()} ${input.grossValueEur.toFixed(2)} euros, ${analysis.eurPerKm.toFixed(2)} por quilómetro, ${analysis.eurPerHour.toFixed(0)} por hora. ${recLabel}.`;

  const fullText = `Nova proposta ${input.platformId.toUpperCase()} ${input.category}. Valor bruto ${input.grossValueEur.toFixed(2)} euros, líquido estimado ${analysis.estimatedNetEur.toFixed(2)} euros. Distância total ${analysis.totalDistanceKm.toFixed(1)} quilómetros em ${analysis.totalTimeMin} minutos, recolha a ${input.pickupDistanceKm.toFixed(1)} quilómetros. Rentabilidade ${analysis.eurPerKm.toFixed(2)} euros por quilómetro e ${analysis.eurPerHour.toFixed(2)} euros por hora. Classificação: ${colorLabel}. ${recLabel}.`;

  return {
    category: 'proposals',
    priority: analysis.classification === 'verde' ? 'alta' : 'media',
    shortText,
    fullText,
    dedupHash: simpleDedupHash('proposals', `${input.platformId}-${input.grossValueEur}-${analysis.totalDistanceKm}`),
  };
}

export function buildLifecycleVoiceAnnouncement(
  phase: TripLifecyclePhase,
  platformId: string,
  extraNote?: string
): Pick<VoiceAnnouncementItem, 'category' | 'priority' | 'shortText' | 'fullText' | 'dedupHash'> {
  const shortText = extraNote ? `${phase}. ${extraNote}` : `Estado da viagem ${platformId.toUpperCase()}: ${phase}.`;
  const fullText = extraNote
    ? `Atualização operacional na plataforma ${platformId.toUpperCase()}: ${phase}. ${extraNote}`
    : `Atualização operacional na plataforma ${platformId.toUpperCase()}: transição registada para ${phase}.`;

  return {
    category: 'lifecycleTimers',
    priority: phase === 'Em espera pelo passageiro' || phase === 'Cancelada' ? 'alta' : 'media',
    shortText,
    fullText,
    dedupHash: simpleDedupHash('lifecycleTimers', `${platformId}-${phase}-${extraNote ?? ''}`),
  };
}

export function buildOperationalAlertVoiceAnnouncement(
  category: Extract<VoiceCategoryKey, 'strategy' | 'zones' | 'battery' | 'tvdeLimits'>,
  shortText: string,
  fullText: string,
  priority: VoicePriority = 'alta'
): Pick<VoiceAnnouncementItem, 'category' | 'priority' | 'shortText' | 'fullText' | 'dedupHash'> {
  return {
    category,
    priority,
    shortText,
    fullText,
    dedupHash: simpleDedupHash(category, shortText),
  };
}

/**
 * Enfileira uma mensagem no Copiloto por Voz respeitando:
 * - Ativação global e por categoria
 * - Estilo de leitura (resumo vs completa)
 * - Anti-repetição por janela temporal (cooldownSeconds)
 * - Ordenação por prioridade (alta > media > baixa)
 */
export function enqueueVoiceAnnouncement(
  existingHistory: VoiceAnnouncementItem[],
  draft: Pick<VoiceAnnouncementItem, 'category' | 'priority' | 'shortText' | 'fullText' | 'dedupHash'>,
  config: VoiceCopilotConfig,
  nowIso = new Date().toISOString()
): {
  accepted: boolean;
  suppressedByCooldown: boolean;
  shouldSpeakAudio: boolean;
  shouldShowVisual: boolean;
  item: VoiceAnnouncementItem | null;
  updatedHistory: VoiceAnnouncementItem[];
} {
  if (!config.enabled || !config.categories[draft.category]) {
    return {
      accepted: false,
      suppressedByCooldown: false,
      shouldSpeakAudio: false,
      shouldShowVisual: false,
      item: null,
      updatedHistory: existingHistory,
    };
  }

  const nowMs = new Date(nowIso).getTime();
  const cooldownMs = Math.max(0, config.cooldownSeconds) * 1000;
  const recentDuplicate = existingHistory.find((prev) => {
    if (prev.dedupHash !== draft.dedupHash) return false;
    const prevMs = new Date(prev.createdAtIso).getTime();
    return Number.isFinite(prevMs) && nowMs - prevMs < cooldownMs;
  });

  const spokenText = config.readingStyle === 'completa' ? draft.fullText : draft.shortText;

  if (recentDuplicate) {
    return {
      accepted: false,
      suppressedByCooldown: true,
      shouldSpeakAudio: false,
      shouldShowVisual: false,
      item: null,
      updatedHistory: existingHistory,
    };
  }

  const shouldSpeakAudio = config.outputChannel === 'Voz' || config.outputChannel === 'Visual + Voz';
  const shouldShowVisual = config.outputChannel === 'Visual' || config.outputChannel === 'Visual + Voz';

  const item: VoiceAnnouncementItem = {
    id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dedupHash: draft.dedupHash,
    category: draft.category,
    priority: draft.priority,
    shortText: draft.shortText,
    fullText: draft.fullText,
    spokenText,
    createdAtIso: nowIso,
    deliveredAudio: false,
    deliveryChannel: shouldSpeakAudio ? 'WebSpeechAPI' : 'VisualOnly',
  };

  const combined = [item, ...existingHistory].slice(0, 40);
  // Mantém os itens recentes ordenados por prioridade quando no mesmo segundo
  combined.sort((a, b) => {
    const dt = new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime();
    if (Math.abs(dt) <= 1500) {
      return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    }
    return dt;
  });

  return {
    accepted: true,
    suppressedByCooldown: false,
    shouldSpeakAudio,
    shouldShowVisual,
    item,
    updatedHistory: combined,
  };
}

export function isBrowserSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

/**
 * Executa síntese de voz gratuita no browser via Web Speech API.
 * Nota técnica honesta: no browser móvel em segundo plano ou ecrã bloqueado,
 * a Web Speech API pode ser suspensa pelo sistema operativo — o contrato nativo
 * Android TextToSpeech / iOS AVSpeechSynthesizer em nativeBridgeContracts.ts cobre condução nativa.
 */
export function speakWithWebSpeech(text: string, config: VoiceCopilotConfig): boolean {
  if (!isBrowserSpeechSynthesisSupported()) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = config.language;
    utterance.rate = Math.min(1.5, Math.max(0.7, config.rate));
    utterance.volume = Math.min(1, Math.max(0.1, config.volume));
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
