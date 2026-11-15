import type { AndroidOverlayConfig, NormalizedCapturePayload } from '../models/types';

export type RuntimeEnvironmentTarget = 'Web Browser' | 'PWA Instalada' | 'Android Nativo (Kotlin/Capacitor)' | 'iOS Nativo (Swift/Capacitor)';
export type CapabilitySupportLevel = 'Operacional Agora' | 'Parcial (Com Limites do SO/Browser)' | 'Requer Compilação Nativa (Windsurf)' | 'Bloqueado pelo SO';

export interface PlatformCapabilityMatrixRow {
  id: string;
  capability: string;
  webBrowser: CapabilitySupportLevel;
  pwaInstalled: CapabilitySupportLevel;
  androidNative: CapabilitySupportLevel;
  iosNative: CapabilitySupportLevel;
  windsurfAcceptanceCriteria: string;
}

export const WEB_PWA_ANDROID_IOS_MATRIX: PlatformCapabilityMatrixRow[] = [
  {
    id: 'cap-core-calc',
    capability: 'Motor de rentabilidade, AutoPilot (regras), Relatórios, Frota e Tacógrafo TVDE',
    webBrowser: 'Operacional Agora',
    pwaInstalled: 'Operacional Agora',
    androidNative: 'Operacional Agora',
    iosNative: 'Operacional Agora',
    windsurfAcceptanceCriteria: 'Partilha 100% dos módulos puros em src/core/*.ts com testes unitários determinísticos.',
  },
  {
    id: 'cap-smart-import',
    capability: 'Smart Data Capture por CSV/JSON, texto OCR colado e entrada assistida',
    webBrowser: 'Operacional Agora',
    pwaInstalled: 'Operacional Agora',
    androidNative: 'Operacional Agora',
    iosNative: 'Operacional Agora',
    windsurfAcceptanceCriteria: 'Deduplicação idempotente, score de confiança 0–100 e histórico auditável de correções manuais.',
  },
  {
    id: 'cap-voice-tts',
    capability: 'AIVAD Voice Copiloto (leitura de propostas, zonas, bateria e limites TVDE)',
    webBrowser: 'Parcial (Com Limites do SO/Browser)',
    pwaInstalled: 'Parcial (Com Limites do SO/Browser)',
    androidNative: 'Requer Compilação Nativa (Windsurf)',
    iosNative: 'Requer Compilação Nativa (Windsurf)',
    windsurfAcceptanceCriteria:
      'Na Web usa Web Speech API com aba ativa; em Android/iOS ligar NativeVoiceTtsContract com AudioFocus Ducking sobre música/GPS em segundo plano.',
  },
  {
    id: 'cap-overlay-card',
    capability: 'Cartão flutuante sobreposto diretamente sobre apps Uber / Bolt',
    webBrowser: 'Bloqueado pelo SO',
    pwaInstalled: 'Bloqueado pelo SO',
    androidNative: 'Requer Compilação Nativa (Windsurf)',
    iosNative: 'Bloqueado pelo SO',
    windsurfAcceptanceCriteria:
      'Android: janela WindowManager TYPE_APPLICATION_OVERLAY com permissão SYSTEM_ALERT_WINDOW. iOS: substituir por Live Activities / Dynamic Island (ActivityKit).',
  },
  {
    id: 'cap-notif-capture',
    capability: 'Interceção automática de notificações de ofertas em segundo plano',
    webBrowser: 'Bloqueado pelo SO',
    pwaInstalled: 'Bloqueado pelo SO',
    androidNative: 'Requer Compilação Nativa (Windsurf)',
    iosNative: 'Bloqueado pelo SO',
    windsurfAcceptanceCriteria:
      'Android: NotificationListenerService autorizado pelo utilizador enviando payloads para parseAndNormalizeCaptureInput. iOS: Atalhos App Intents + captura voluntária de ecrã.',
  },
  {
    id: 'cap-auto-exec',
    capability: 'Execução automática de aceitar/recusar proposta em modo Automático',
    webBrowser: 'Parcial (Com Limites do SO/Browser)',
    pwaInstalled: 'Parcial (Com Limites do SO/Browser)',
    androidNative: 'Requer Compilação Nativa (Windsurf)',
    iosNative: 'Bloqueado pelo SO',
    windsurfAcceptanceCriteria:
      'Executado automaticamente sempre que exista API oficial de despacho ou canal nativo expressamente autorizado e conforme com termos legais; caso contrário, apresenta Decisão Assistida imediata.',
  },
  {
    id: 'cap-bg-sync',
    capability: 'Fila offline resiliente e sincronização idempotente com servidor',
    webBrowser: 'Operacional Agora',
    pwaInstalled: 'Operacional Agora',
    androidNative: 'Requer Compilação Nativa (Windsurf)',
    iosNative: 'Requer Compilação Nativa (Windsurf)',
    windsurfAcceptanceCriteria:
      'Na Web sincroniza via /api/sync/push com chave idempotente; em mobile nativo ligar WorkManager (Android) / BGTaskScheduler (iOS).',
  },
];

// ============================================================================
// CONTRATOS TYPESCRIPT PARA IMPLEMENTAÇÃO NATIVA NO WINDSURF (ANDROID / iOS)
// ============================================================================

export interface AuthorizedCaptureModuleContract {
  isSupportedOnDevice(): Promise<boolean>;
  hasReadCaptureConsent(): Promise<boolean>;
  requestReadCaptureConsent(): Promise<{ granted: boolean; timestampIso: string }>;
  onNormalizedOfferCaptured(callback: (payload: NormalizedCapturePayload) => void): () => void;
}

export interface NativeNotificationListenerContract {
  isNotificationAccessEnabled(): Promise<boolean>;
  openSystemNotificationAccessSettings(): Promise<void>;
  getMonitoredPackages(): Promise<string[]>; // ex.: ['com.ubercab.driver', 'ee.mtakso.driver']
}

export interface NativeOverlayWindowContract {
  canDrawOverlays(): Promise<boolean>;
  requestOverlayPermission(): Promise<boolean>;
  showProposalOverlay(config: AndroidOverlayConfig, payloadJson: string): Promise<void>;
  hideProposalOverlay(): Promise<void>;
}

export interface NativeVoiceTtsContract {
  isNativeTtsAvailable(): Promise<boolean>;
  speakWithAudioDucking(params: {
    text: string;
    locale: string;
    rate: number;
    volume: number;
    priority: 'alta' | 'media' | 'baixa';
  }): Promise<{ spoken: boolean }>;
  stopSpeaking(): Promise<void>;
}

export interface BackgroundSyncQueueContract {
  enqueueSyncPayload(idempotencyKey: string, endpoint: string, bodyJson: string): Promise<void>;
  getPendingQueueSize(): Promise<number>;
  triggerImmediateFlush(): Promise<{ flushed: number; failed: number }>;
}

export interface RuntimeBrowserDiagnostics {
  detectedPlatform: 'Web Desktop' | 'Web Mobile Android' | 'Web Mobile iOS' | 'Native Bridge';
  online: boolean;
  speechSynthesisSupported: boolean;
  geolocationSupported: boolean;
  notificationsSupported: boolean;
  notificationPermission: string;
  localStorageAvailable: boolean;
  serviceWorkerSupported: boolean;
  nativeBridgeInjected: boolean;
}

export function detectRuntimeBrowserDiagnostics(): RuntimeBrowserDiagnostics {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      detectedPlatform: 'Web Desktop',
      online: true,
      speechSynthesisSupported: false,
      geolocationSupported: false,
      notificationsSupported: false,
      notificationPermission: 'indisponivel',
      localStorageAvailable: false,
      serviceWorkerSupported: false,
      nativeBridgeInjected: false,
    };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const nativeBridgeInjected = Boolean((window as unknown as Record<string, unknown>).AivadNativeBridge);

  let localStorageAvailable = false;
  try {
    const testKey = '__aivad_diag_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    localStorageAvailable = true;
  } catch {
    localStorageAvailable = false;
  }

  const notificationsSupported = 'Notification' in window;
  const notificationPermission = notificationsSupported ? window.Notification.permission : 'nao_suportado';

  return {
    detectedPlatform: nativeBridgeInjected
      ? 'Native Bridge'
      : isAndroid
        ? 'Web Mobile Android'
        : isIos
          ? 'Web Mobile iOS'
          : 'Web Desktop',
    online: navigator.onLine,
    speechSynthesisSupported: 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined',
    geolocationSupported: 'geolocation' in navigator,
    notificationsSupported,
    notificationPermission,
    localStorageAvailable,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    nativeBridgeInjected,
  };
}
