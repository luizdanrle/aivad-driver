import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  Bell,
  BookOpen,
  Calculator,
  CalendarClock,
  Car,
  ChevronDown,
  ChevronRight,
  Compass,
  FileSpreadsheet,
  Gauge,
  Globe,
  Home,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Menu,
  Plug,
  RefreshCw,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Star,
  User,
  Volume2,
  VolumeX,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { translateUi } from '../../core/localization';
import { isRtlLanguage } from '../../core/i18n';
import { computeLiveTachographClocks, formatDurationHms } from '../../core/tachograph';
import {
  DRIVER_ONBOARDING_STEPS,
  getDriverModuleGuide,
  goToOnboardingStep,
  INITIAL_ONBOARDING_STATE,
  markOnboardingStepCompleted,
  ProgressiveOnboardingState,
  setOnboardingDismissed,
} from '../../core/moduleGuides';
import { useEcosystem } from '../../services/EcosystemContext';
import {
  FloatingActionButton,
  ModuleGuideBanner,
  OfflineIndicator,
  PhoenixLogo,
  ProgressiveOnboardingBar,
  PWAInstallButton,
  QuickActionItem,
  ThemeToggleButton,
} from '../ui/DesignSystem';
import { InteractiveAssistantOverlay } from '../ui/InteractiveAssistantOverlay';
import { LocalizationPromptOverlay, LocationPillButton } from '../ui/LocalizationModal';
import { DriverAiCoreView } from './views/DriverAiCoreView';
import { DriverDashboardAndOps } from './views/DriverDashboardAndOps';
import { DriverTripsAndPlanning } from './views/DriverTripsAndPlanning';
import { DriverFinanceAndFleet } from './views/DriverFinanceAndFleet';
import { DriverFieldAndCompliance } from './views/DriverFieldAndCompliance';
import { DriverAccountAndSupport } from './views/DriverAccountAndSupport';
import { DriverTachographView } from './views/DriverTachographView';
import { DriverDiagnosticsAndVoiceView } from './views/DriverDiagnosticsAndVoiceView';

const ONBOARDING_STORAGE_KEY = 'aivad_driver_onboarding_v61';

export type DriverMenuGroup =
  | 'VISÃO GERAL'
  | 'OPERAÇÃO'
  | 'GESTÃO INTELIGENTE'
  | 'PERSONALIZAÇÃO'
  | 'APOIO';

export interface DriverMenuItem {
  id: string;
  label: string;
  subtitle: string;
  tier: 'primary' | 'secondary';
  group: DriverMenuGroup;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
}

export const DRIVER_SIDEBAR_GROUPS: DriverMenuGroup[] = [
  'VISÃO GERAL',
  'OPERAÇÃO',
  'GESTÃO INTELIGENTE',
  'PERSONALIZAÇÃO',
  'APOIO',
];

export const DRIVER_SIDEBAR_ITEMS: DriverMenuItem[] = [
  // VISÃO GERAL
  {
    id: 'dashboard',
    label: 'Painel principal',
    subtitle: 'Lucro líquido e metas do dia',
    tier: 'primary',
    group: 'VISÃO GERAL',
    icon: LayoutDashboard,
    keywords: 'inicio dashboard cockpit metas resumo',
  },
  {
    id: 'ai-core',
    label: 'AIVAD AI CORE',
    subtitle: '8 agentes e previsões privadas',
    tier: 'primary',
    group: 'VISÃO GERAL',
    icon: Sparkles,
    keywords: 'ia cerebro agentes recomendacoes aprendizagem assistente',
  },
  // OPERAÇÃO
  {
    id: 'corridas',
    label: 'Corridas',
    subtitle: 'Analisar propostas e recolha/espera',
    tier: 'primary',
    group: 'OPERAÇÃO',
    icon: Compass,
    keywords: 'propostas calculadora historico smart data capture viagens',
  },
  {
    id: 'estrategia',
    label: 'Estratégia das aplicações',
    subtitle: 'AutoPilot 3 modos e regras €/km',
    tier: 'primary',
    group: 'OPERAÇÃO',
    icon: Layers,
    keywords: 'autopilot manual semiautomatico automatico consolidado uber bolt',
  },
  {
    id: 'agenda-turnos',
    label: 'Agenda e turnos',
    subtitle: 'Planeamento de escalas e campanhas',
    tier: 'secondary',
    group: 'OPERAÇÃO',
    icon: CalendarClock,
    keywords: 'planeador escalas turnos pausas metas campanhas',
  },
  {
    id: 'tacografo',
    label: 'TACÓGRAFO',
    subtitle: 'Dois relógios reais, pausas e QR',
    tier: 'primary',
    group: 'OPERAÇÃO',
    icon: Gauge,
    keywords: 'tacografo portaria 7 2022 10h 24h qr offline relogio turno',
  },
  // GESTÃO INTELIGENTE
  {
    id: 'financeiro',
    label: 'Financeiro',
    subtitle: 'Comissões, despesas e fórmula real',
    tier: 'primary',
    group: 'GESTÃO INTELIGENTE',
    icon: Wallet,
    keywords: 'ganhos despesas liquido custos calculo transparencia',
  },
  {
    id: 'relatorios',
    label: 'Análises e relatórios',
    subtitle: '9 sub-relatórios e exportação',
    tier: 'secondary',
    group: 'GESTÃO INTELIGENTE',
    icon: FileSpreadsheet,
    keywords: 'exportar csv xlsx pdf png graficos desempenho',
  },
  {
    id: 'veiculos',
    label: 'Veículos e energia',
    subtitle: 'Autonomia real, EV e comparador',
    tier: 'secondary',
    group: 'GESTÃO INTELIGENTE',
    icon: Car,
    keywords: 'eletrico autonomia real homologada carregamento tarifa comparador elegibilidade',
  },
  {
    id: 'locais-rotas',
    label: 'Locais e rotas',
    subtitle: 'Zonas rentáveis e recolhas seguras',
    tier: 'secondary',
    group: 'GESTÃO INTELIGENTE',
    icon: MapPin,
    keywords: 'casa garagem carregadores zonas mapas google maps waze favoritos',
  },
  // PERSONALIZAÇÃO
  {
    id: 'voz-copiloto',
    label: 'AIVAD Voice · Copiloto',
    subtitle: 'Leitura mãos-livres de alertas',
    tier: 'secondary',
    group: 'PERSONALIZAÇÃO',
    icon: Volume2,
    keywords: 'voz copiloto sintese audio alerta propostas bateria maos livres',
  },
  {
    id: 'cartoes-flutuantes',
    label: 'Cartões flutuantes',
    subtitle: 'Cores, 8 posições e pré-visualizar',
    tier: 'primary',
    group: 'PERSONALIZAÇÃO',
    icon: Smartphone,
    keywords: 'overlay dinamico verde amarelo vermelho preview simulador android perfis',
  },
  {
    id: 'conectores',
    label: 'Conectores Uber e Bolt',
    subtitle: 'Permissões e testes em 3 níveis',
    tier: 'secondary',
    group: 'PERSONALIZAÇÃO',
    icon: Plug,
    keywords: 'uber bolt conectores nivel 1 2 3 sandbox api permissoes backoff',
  },
  {
    id: 'apps-integracoes',
    label: 'Aplicações e integrações',
    subtitle: 'Apps validadas na sua cidade',
    tier: 'secondary',
    group: 'PERSONALIZAÇÃO',
    icon: Layers,
    keywords: 'uber bolt cabify freenow pop vloz ativar desativar plataforma',
  },
  {
    id: 'perfil',
    label: 'Configurações',
    subtitle: 'Conta, idioma, mercado e privacidade',
    tier: 'secondary',
    group: 'PERSONALIZAÇÃO',
    icon: Settings,
    keywords: 'conta perfil internacional idioma moeda privacidade notificacoes',
  },
  // APOIO
  {
    id: 'diagnostico',
    label: 'Diagnóstico e estado',
    subtitle: 'Prontidão técnica e estado API',
    tier: 'secondary',
    group: 'APOIO',
    icon: Activity,
    keywords: 'diagnostico auditoria transparencia windsurf matriz estado real api',
  },
  {
    id: 'suporte',
    label: 'Ajuda e suporte',
    subtitle: 'Tickets, docs e legislação local',
    tier: 'secondary',
    group: 'APOIO',
    icon: LifeBuoy,
    keywords: 'tickets legislacao documentos avaliacao dashcam notificacoes sugestoes',
  },
  {
    id: 'portal',
    label: 'Aceder ao site',
    subtitle: 'Regressar ao portal público',
    tier: 'secondary',
    group: 'APOIO',
    icon: Globe,
    keywords: 'portal institucional site oficial sair',
  },
];

const NAV_LABELS: Record<string, string> = {
  dashboard: 'Painel principal',
  'ai-core': 'AIVAD AI CORE',
  corridas: 'Corridas',
  calculadora: 'Corridas · Calculadora',
  'propostas-tempo-real': 'Corridas · Propostas',
  'smart-capture': 'Corridas · Smart Data Capture',
  'historico-viagens': 'Corridas · Histórico',
  estrategia: 'Estratégia das aplicações',
  autopilot: 'Estratégia das aplicações',
  'consolidado-plataformas': 'Estratégia · Consolidado Multi-App',
  'desempenho-uber': 'Estratégia · Uber Isolado',
  'desempenho-bolt': 'Estratégia · Bolt Isolado',
  'agenda-turnos': 'Agenda e turnos',
  planeador: 'Agenda e turnos · Planeador',
  campanhas: 'Agenda e turnos · Campanhas',
  tacografo: 'TACÓGRAFO',
  financeiro: 'Financeiro',
  relatorios: 'Análises e relatórios',
  veiculos: 'Veículos e energia',
  'comparador-veiculos': 'Veículos e energia · Comparador',
  'locais-rotas': 'Locais e rotas',
  'mapas-zonas': 'Locais e rotas',
  'cartoes-flutuantes': 'Cartões flutuantes',
  'voz-copiloto': 'AIVAD Voice · Copiloto por Voz',
  conectores: 'Conectores Uber & Bolt (Suite 3 Níveis)',
  diagnostico: 'Diagnóstico Operacional & Auditoria',
  'apps-integracoes': 'Aplicações e integrações',
  perfil: 'Configurações',
  suporte: 'Ajuda e suporte',
  legislacao: 'Ajuda · Legislação e Conformidade',
  documentos: 'Ajuda · Documentos',
  'avaliacao-rapida': 'Ajuda · Avaliação Rápida',
  dashcam: 'Ajuda · Dashcam',
  'assistente-ia': 'AIVAD AI CORE',
  notificacoes: 'Notificações',
  sugestoes: 'Ajuda · Sugestões',
};

const GROUP_I18N_KEY: Record<DriverMenuGroup, string> = {
  'VISÃO GERAL': 'group_overview',
  'OPERAÇÃO': 'group_ops',
  'GESTÃO INTELIGENTE': 'group_smart',
  'PERSONALIZAÇÃO': 'group_custom',
  'APOIO': 'group_support',
};

const ITEM_I18N_KEYS: Record<string, { labelKey: string; subtitleKey: string }> = {
  dashboard: { labelKey: 'nav_dashboard', subtitleKey: 'nav_dashboard_sub' },
  'ai-core': { labelKey: 'nav_aicore', subtitleKey: 'nav_aicore_sub' },
  corridas: { labelKey: 'nav_rides', subtitleKey: 'nav_rides_sub' },
  estrategia: { labelKey: 'nav_strategy', subtitleKey: 'nav_strategy_sub' },
  'agenda-turnos': { labelKey: 'nav_shifts', subtitleKey: 'nav_shifts_sub' },
  tacografo: { labelKey: 'nav_tacho', subtitleKey: 'nav_tacho_sub' },
  financeiro: { labelKey: 'nav_finance', subtitleKey: 'nav_finance_sub' },
  relatorios: { labelKey: 'nav_reports', subtitleKey: 'nav_reports_sub' },
  veiculos: { labelKey: 'nav_vehicles', subtitleKey: 'nav_vehicles_sub' },
  'locais-rotas': { labelKey: 'nav_places', subtitleKey: 'nav_places_sub' },
  'voz-copiloto': { labelKey: 'nav_voice', subtitleKey: 'nav_voice_sub' },
  'cartoes-flutuantes': { labelKey: 'nav_cards', subtitleKey: 'nav_cards_sub' },
  conectores: { labelKey: 'nav_connectors', subtitleKey: 'nav_connectors_sub' },
  'apps-integracoes': { labelKey: 'nav_apps', subtitleKey: 'nav_apps_sub' },
  perfil: { labelKey: 'nav_settings', subtitleKey: 'nav_settings_sub' },
  diagnostico: { labelKey: 'nav_diag', subtitleKey: 'nav_diag_sub' },
  suporte: { labelKey: 'nav_support', subtitleKey: 'nav_support_sub' },
  portal: { labelKey: 'nav_portal', subtitleKey: 'nav_portal_sub' },
};

function loadInitialOnboardingState(): ProgressiveOnboardingState {
  if (typeof window === 'undefined') return INITIAL_ONBOARDING_STATE;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return INITIAL_ONBOARDING_STATE;
    const parsed = JSON.parse(raw) as Partial<ProgressiveOnboardingState>;
    return {
      dismissed: Boolean(parsed.dismissed),
      currentStepIndex:
        typeof parsed.currentStepIndex === 'number'
          ? Math.max(0, Math.min(DRIVER_ONBOARDING_STEPS.length - 1, parsed.currentStepIndex))
          : 0,
      completedStepIds: Array.isArray(parsed.completedStepIds) ? parsed.completedStepIds : [],
      lastUpdatedIso: parsed.lastUpdatedIso ?? INITIAL_ONBOARDING_STATE.lastUpdatedIso,
    };
  } catch {
    return INITIAL_ONBOARDING_STATE;
  }
}

export const DriverLayout: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const {
    state,
    activeDriver,
    activeDriverPlan,
    activeVehicle,
    activeMarket,
    rolling24hCompliance,
    setDriverNav,
    setMode,
    toggleTheme,
    syncNowToServer,
    updateVoiceCopilotConfig,
    dismissVisualVoiceBanner,
    openAssistantHub,
    startInteractiveAssistant,
  } = useEcosystem();

  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [tachoNowMs, setTachoNowMs] = useState<number>(() => Date.now());
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(['dashboard', 'ai-core', 'corridas', 'tacografo']);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [onboardingState, setOnboardingState] = useState<ProgressiveOnboardingState>(() =>
    loadInitialOnboardingState()
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboardingState));
    } catch {
      // Ignore private browsing quota errors
    }
  }, [onboardingState]);

  const unreadNotifications = state.notifications.filter(
    (n) => !n.read && (n.targetUserId === 'ALL' || n.targetUserId === activeDriver.id)
  ).length;

  const lang = state.localization.languageCode;
  const isRtl = isRtlLanguage(lang);
  const activeNav = state.activeDriverNav;
  const activeModuleGuide = useMemo(() => getDriverModuleGuide(activeNav), [activeNav]);

  const toggleGroup = (g: DriverMenuGroup) => {
    setCollapsedGroups((prev) => ({ ...prev, [g]: !prev[g] }));
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getLocalizedItemLabel = (item: DriverMenuItem) => {
    const keys = ITEM_I18N_KEYS[item.id];
    return keys ? translateUi(lang, keys.labelKey) : item.label;
  };
  const getLocalizedItemSubtitle = (item: DriverMenuItem) => {
    const keys = ITEM_I18N_KEYS[item.id];
    return keys ? translateUi(lang, keys.subtitleKey) : item.subtitle;
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return DRIVER_SIDEBAR_ITEMS;
    return DRIVER_SIDEBAR_ITEMS.filter((it) => {
      const lbl = getLocalizedItemLabel(it).toLowerCase();
      return (
        lbl.includes(q) ||
        it.label.toLowerCase().includes(q) ||
        it.keywords.toLowerCase().includes(q) ||
        it.group.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, lang]);

  const handleSelectNav = (id: string) => {
    if (id === 'portal') {
      setMode('portal');
      return;
    }
    setDriverNav(id);
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  };

  const activeTachoSession = state.tachograph.sessions.find(
    (s) => s.id === state.tachograph.activeSessionId && s.status === 'Em curso'
  );

  useEffect(() => {
    setTachoNowMs(Date.now());
    if (!activeTachoSession) return;
    const id = window.setInterval(() => {
      setTachoNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeTachoSession?.id, activeTachoSession?.currentState]);

  const liveTachoClocks = useMemo(
    () =>
      computeLiveTachographClocks(state.tachograph, tachoNowMs, {
        countryCode: activeMarket.code,
      }),
    [state.tachograph, tachoNowMs, activeMarket.code]
  );

  const operationalStatusMeta = activeTachoSession
    ? liveTachoClocks.operationalStatus === 'Em Pausa'
      ? {
          label: translateUi(lang, 'tacho_on_break'),
          cls: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        }
      : {
          label: translateUi(lang, 'tacho_active_shift'),
          cls: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        }
    : {
        label: translateUi(lang, 'tacho_offline'),
        cls: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      };

  const resolveAssistantIdForNav = (navId: string): string => {
    if (navId === 'cartoes-flutuantes') return 'floating-card';
    if (navId === 'voz-copiloto') return 'voice';
    if (navId === 'estrategia' || navId === 'autopilot') return 'autopilot';
    if (navId === 'conectores') return 'connectors';
    if (navId === 'tacografo') return 'tacografo';
    if (['corridas', 'calculadora', 'propostas-tempo-real', 'smart-capture', 'historico-viagens'].includes(navId)) return 'corridas';
    if (navId === 'financeiro') return 'financeiro';
    if (navId === 'relatorios') return 'relatorios';
    if (navId === 'veiculos' || navId === 'comparador-veiculos') return 'veiculos';
    if (navId === 'locais-rotas' || navId === 'mapas-zonas') return 'locais-rotas';
    if (navId === 'apps-integracoes') return 'apps-integracoes';
    if (navId === 'diagnostico') return 'diagnostico';
    return 'dashboard';
  };

  const isNavActive = (itemId: string): boolean => {
    if (activeNav === itemId) return true;
    if (itemId === 'corridas' && ['calculadora', 'propostas-tempo-real', 'smart-capture', 'historico-viagens'].includes(activeNav)) return true;
    if (itemId === 'estrategia' && ['autopilot', 'consolidado-plataformas', 'desempenho-uber', 'desempenho-bolt'].includes(activeNav)) return true;
    if (itemId === 'agenda-turnos' && ['planeador', 'campanhas'].includes(activeNav)) return true;
    if (itemId === 'veiculos' && activeNav === 'comparador-veiculos') return true;
    if (itemId === 'locais-rotas' && activeNav === 'mapas-zonas') return true;
    if (itemId === 'ai-core' && activeNav === 'assistente-ia') return true;
    if (itemId === 'suporte' && ['legislacao', 'documentos', 'avaliacao-rapida', 'dashcam', 'notificacoes', 'sugestoes'].includes(activeNav)) return true;
    return false;
  };

  const quickDockActions: QuickActionItem[] = useMemo(
    () => [
      {
        id: 'qa-proposta',
        label: 'Analisar Proposta Agora',
        sublabel: 'Calculadora €/km · €/h · Retorno vazio',
        variant: 'primary',
        icon: <Calculator className="w-4 h-4" />,
        onSelect: () => handleSelectNav('calculadora'),
      },
      {
        id: 'qa-flutuante',
        label: translateUi(lang, 'nav_cards'),
        sublabel: 'Simulador Verde · Amarelo · Vermelho',
        variant: 'accent',
        icon: <Smartphone className="w-4 h-4" />,
        onSelect: () => handleSelectNav('cartoes-flutuantes'),
      },
      {
        id: 'qa-tacografo',
        label: translateUi(lang, 'nav_tacho'),
        sublabel: `${translateUi(lang, 'tacho_remaining')}: ${rolling24hCompliance.remainingLegalMinutes} min`,
        variant: 'success',
        icon: <Gauge className="w-4 h-4" />,
        onSelect: () => handleSelectNav('tacografo'),
      },
      {
        id: 'qa-aicore',
        label: translateUi(lang, 'nav_aicore'),
        sublabel: translateUi(lang, 'nav_aicore_sub'),
        variant: 'ai',
        icon: <Sparkles className="w-4 h-4" />,
        onSelect: () => handleSelectNav('ai-core'),
      },
    ],
    [rolling24hCompliance.remainingLegalMinutes, lang]
  );

  const renderView = () => {
    if (['voz-copiloto', 'conectores', 'diagnostico'].includes(activeNav)) {
      return <DriverDiagnosticsAndVoiceView activeTab={activeNav} />;
    }
    if (activeNav === 'ai-core' || activeNav === 'assistente-ia') {
      return <DriverAiCoreView />;
    }
    if (activeNav === 'tacografo') {
      return <DriverTachographView />;
    }
    if (
      [
        'dashboard',
        'corridas',
        'calculadora',
        'propostas-tempo-real',
        'smart-capture',
        'cartoes-flutuantes',
      ].includes(activeNav)
    ) {
      return <DriverDashboardAndOps activeTab={activeNav} />;
    }
    if (
      [
        'estrategia',
        'autopilot',
        'consolidado-plataformas',
        'historico-viagens',
        'campanhas',
        'desempenho-uber',
        'desempenho-bolt',
        'agenda-turnos',
        'planeador',
        'locais-rotas',
        'mapas-zonas',
      ].includes(activeNav)
    ) {
      return <DriverTripsAndPlanning activeTab={activeNav} />;
    }
    if (['relatorios', 'financeiro', 'veiculos', 'comparador-veiculos'].includes(activeNav)) {
      return <DriverFinanceAndFleet activeTab={activeNav} />;
    }
    if (['legislacao', 'avaliacao-rapida', 'dashcam'].includes(activeNav)) {
      return <DriverFieldAndCompliance activeTab={activeNav} />;
    }
    return <DriverAccountAndSupport activeTab={activeNav} />;
  };

  const bottomTabs = [
    { id: 'dashboard', label: translateUi(lang, 'nav_home'), icon: Home },
    { id: 'corridas', label: translateUi(lang, 'nav_rides'), icon: Compass },
    { id: 'tacografo', label: translateUi(lang, 'nav_tacho'), icon: Gauge, featured: true },
    { id: 'ai-core', label: translateUi(lang, 'nav_aicore'), icon: Sparkles },
    { id: 'perfil', label: translateUi(lang, 'nav_profile'), icon: User },
  ];

  const renderSidebarBody = (isMobile = false) => (
    <>
      <div className="p-3 space-y-2.5 border-b border-slate-200/90 dark:border-[#1E2D4A]">
        {/* Live Compact Dual-Clock TACÓGRAFO Widget */}
        <button
          type="button"
          data-testid={isMobile ? 'sidebar-tacho-clocks-mobile' : 'sidebar-tacho-clocks'}
          onClick={() => handleSelectNav('tacografo')}
          className={`w-full p-3 rounded-xl border text-start transition-all space-y-2 cursor-pointer ${
            activeNav === 'tacografo'
              ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-blue-50/80 dark:bg-[#131F36] border-blue-200/80 dark:border-blue-800/60 hover:border-blue-500'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold gap-1">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 shrink-0" />
              <span>{translateUi(lang, 'nav_tacho')}</span>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                activeNav === 'tacografo'
                  ? 'bg-white/20 text-white'
                  : liveTachoClocks.operationalStatus === 'Em Turno'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : liveTachoClocks.operationalStatus === 'Em Pausa'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {operationalStatusMeta.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div
              className={`px-2 py-1.5 rounded-lg border ${
                activeNav === 'tacografo'
                  ? 'bg-white/10 border-white/20'
                  : 'bg-white/90 dark:bg-[#0B1324] border-slate-200/80 dark:border-slate-700'
              }`}
            >
              <span className={`block truncate ${activeNav === 'tacografo' ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {translateUi(lang, 'tacho_status_shift')}
              </span>
              <span className="font-mono-tabular font-extrabold text-xs block">
                {formatDurationHms(liveTachoClocks.shiftElapsedSeconds)}
              </span>
            </div>
            <div
              className={`px-2 py-1.5 rounded-lg border ${
                activeNav === 'tacografo'
                  ? 'bg-white/10 border-white/20'
                  : 'bg-white/90 dark:bg-[#0B1324] border-slate-200/80 dark:border-slate-700'
              }`}
            >
              <span className={`block truncate ${activeNav === 'tacografo' ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {translateUi(lang, 'tacho_status_effective')}
              </span>
              <span className="font-mono-tabular font-extrabold text-xs block">
                {formatDurationHms(liveTachoClocks.effectiveWorkSeconds)}
              </span>
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/15 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                rolling24hCompliance.alertLevel === 'Limite 10h Atingido'
                  ? 'bg-red-500'
                  : rolling24hCompliance.alertLevel === 'Crítico 9h (540 min)' ||
                    rolling24hCompliance.alertLevel === 'Preventivo 8h (480 min)'
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{
                width: `${Math.min(100, Math.round((rolling24hCompliance.rolling24hWorkMinutes / 600) * 100))}%`,
              }}
            />
          </div>
          <p className={`text-[10px] truncate ${activeNav === 'tacografo' ? 'text-blue-100' : 'text-slate-600 dark:text-slate-300'}`}>
            {activeTachoSession ? activeTachoSession.currentState : translateUi(lang, 'tacho_offline')} · {translateUi(lang, 'tacho_remaining')}:{' '}
            {rolling24hCompliance.remainingLegalMinutes}m
          </p>
        </button>

        {/* Search Modules */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={translateUi(lang, 'search_modules')}
            aria-label={translateUi(lang, 'search_modules')}
            className="w-full ps-8 pe-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1324] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      <nav aria-label={isMobile ? 'Menu Mobile do Motorista' : 'Menu do Motorista'} className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {/* Pinned Favorites Strip */}
        {!searchQuery && favorites.length > 0 && (
          <div className="space-y-1.5">
            <p className="px-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" /> {translateUi(lang, 'favorites_quick')}
            </p>
            <div className="flex flex-wrap gap-1 px-1">
              {favorites.map((favId) => {
                const it = DRIVER_SIDEBAR_ITEMS.find((x) => x.id === favId);
                if (!it) return null;
                const active = isNavActive(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => handleSelectNav(it.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-slate-50 dark:bg-[#131F36] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500'
                    }`}
                  >
                    {getLocalizedItemLabel(it)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5 Clean Collapsible Groups */}
        {DRIVER_SIDEBAR_GROUPS.map((groupName) => {
          const groupItems = filteredItems.filter((m) => m.group === groupName);
          if (groupItems.length === 0) return null;
          const isCollapsed = !searchQuery && Boolean(collapsedGroups[groupName]);
          const translatedGroup = translateUi(lang, GROUP_I18N_KEY[groupName]);
          return (
            <div key={groupName} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(groupName)}
                className="w-full px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <span>{translatedGroup}</span>
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3 rtl-flip" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {!isCollapsed &&
                groupItems.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(item.id);
                  const isFav = favorites.includes(item.id);
                  const itemLabel = getLocalizedItemLabel(item);
                  const itemSubtitle = getLocalizedItemSubtitle(item);
                  return (
                    <div
                      key={item.id}
                      className={`group flex items-center rounded-xl transition-colors ${
                        active
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50/70 dark:hover:bg-[#131F36]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectNav(item.id)}
                        className="flex-1 min-w-0 min-h-[44px] flex items-center gap-2.5 px-3 py-1.5 text-start cursor-pointer"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="min-w-0 block">
                          <span className={`block truncate ${item.tier === 'primary' ? 'text-xs font-bold' : 'text-xs font-semibold'}`}>
                            {itemLabel}
                          </span>
                          <span
                            className={`block truncate text-[10px] leading-tight ${
                              active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {itemSubtitle}
                          </span>
                        </span>
                      </button>
                      {item.id === 'suporte' && unreadNotifications > 0 && (
                        <span className="me-1.5 px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-mono-tabular text-[10px] font-bold">
                          {unreadNotifications}
                        </span>
                      )}
                      {item.id !== 'portal' && (
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(item.id, e)}
                          aria-label={isFav ? `Remover ${itemLabel} dos favoritos` : `Fixar ${itemLabel} nos favoritos`}
                          className={`p-1.5 me-1 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer ${
                            isFav ? 'opacity-100 text-amber-400' : 'text-slate-400 hover:text-amber-500'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen aivad-canvas-bg text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Clean 5-Group Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col border-e border-slate-200/90 dark:border-[#1E2D4A] bg-white dark:bg-[#0F182B] shrink-0">
        <div className="h-16 px-4 border-b border-slate-200/90 dark:border-[#1E2D4A] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMode('portal')}
            className="flex items-center gap-2 text-base font-display font-extrabold tracking-tight cursor-pointer"
          >
            <PhoenixLogo size={28} />
            <span>AIVAD Driver</span>
          </button>
          <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
            {activeDriverPlan.name.replace('AIVAD ', '')}
          </span>
        </div>

        {renderSidebarBody(false)}

        <div className="p-3 border-t border-slate-200/90 dark:border-[#1E2D4A] space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${operationalStatusMeta.cls}`}>
              ● {operationalStatusMeta.label}
            </span>
            <button
              type="button"
              onClick={openAssistantHub}
              className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" /> {translateUi(lang, 'assistants_btn')}
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/src/assets/images/aivad_avatar_driver_1794711880211.jpg"
                alt={activeDriver.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {activeDriver.name} <span className="text-[10px] font-mono-tabular text-slate-400">#{activeDriver.id.slice(-4)}</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {activeVehicle.brand} {activeVehicle.model} · {activeDriver.city}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSelectNav('perfil')}
              aria-label={translateUi(lang, 'nav_settings')}
              className="p-2 rounded-lg text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-[#131F36] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Animated Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={prefersReducedMotion ? false : { x: isRtl ? 280 : -280, opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { x: isRtl ? 280 : -280, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-80 max-w-[88vw] bg-white dark:bg-[#0F182B] h-full flex flex-col border-e border-slate-200 dark:border-[#1E2D4A] z-10 shadow-2xl"
            >
              <div className="h-14 px-4 border-b border-slate-200 dark:border-[#1E2D4A] flex items-center justify-between">
                <span className="font-display font-bold text-sm flex items-center gap-2">
                  <PhoenixLogo size={22} />
                  AIVAD Driver
                </span>
                <button
                  type="button"
                  aria-label={translateUi(lang, 'close_btn')}
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {renderSidebarBody(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area (ZERO ADMIN BUTTONS) */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="sticky top-0 z-30">
          <header className="h-14 lg:h-16 px-3 sm:px-6 border-b border-slate-200/90 dark:border-[#1E2D4A] bg-white/95 dark:bg-[#0F182B]/95 backdrop-blur-md flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Abrir menu do motorista"
                className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36]"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {translateUi(lang, 'app_brand_tagline')}
                </p>
                <h1 className="text-sm sm:text-base font-display font-extrabold truncate text-slate-900 dark:text-white">
                  {ITEM_I18N_KEYS[activeNav]
                    ? translateUi(lang, ITEM_I18N_KEYS[activeNav].labelKey)
                    : activeNav === 'tacografo'
                    ? translateUi(lang, 'nav_tacho')
                    : NAV_LABELS[activeNav] ?? translateUi(lang, 'nav_dashboard')}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={openAssistantHub}
                title="Abrir Centro de Guias e Assistentes Interativos passo a passo"
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{translateUi(lang, 'assistants_btn')}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setOnboardingState((prev) => setOnboardingDismissed(prev, !prev.dismissed))
                }
                title="Consultar novamente ou retomar o Guia Progressivo de Boas-Vindas"
                className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  !onboardingState.dismissed
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-[#131F36] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {translateUi(lang, 'guide_btn')} ({onboardingState.completedStepIds.length}/{DRIVER_ONBOARDING_STEPS.length})
                </span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const res = await syncNowToServer();
                  setSyncNotice(res.message);
                  setTimeout(() => setSyncNotice(null), 4000);
                }}
                title={syncNotice ?? 'Sincronizar estado com servidor Express'}
                aria-label="Sincronizar estado"
                className="min-h-[38px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36] text-[11px] font-semibold hover:border-blue-600 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${state.syncStatus === 'pendente' ? 'animate-spin text-blue-600' : 'text-emerald-600'}`} />
                <span className="hidden xl:inline capitalize">{state.syncStatus}</span>
              </button>

              <div className="hidden sm:block">
                <LocationPillButton onClick={() => setLocationModalOpen(true)} />
              </div>

              <button
                type="button"
                onClick={() => updateVoiceCopilotConfig({ enabled: !state.voiceConfig.enabled })}
                aria-label={state.voiceConfig.enabled ? 'Silenciar Copiloto de Voz' : 'Ativar Copiloto de Voz'}
                title={state.voiceConfig.enabled ? 'Copiloto de Voz Ativo (clicar para silenciar)' : 'Copiloto de Voz Silenciado'}
                className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border text-xs transition-colors cursor-pointer ${
                  state.voiceConfig.enabled
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36] text-slate-400'
                }`}
              >
                {state.voiceConfig.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setDriverNav('notificacoes')}
                aria-label={`Notificações (${unreadNotifications} por ler)`}
                className="relative min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36] hover:border-blue-600 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono-tabular font-bold">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              <PWAInstallButton />
              <ThemeToggleButton theme={state.theme} onToggle={toggleTheme} />

              <button
                type="button"
                onClick={() => setMode('portal')}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36] text-xs font-semibold hover:border-blue-600 whitespace-nowrap cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>{translateUi(lang, 'site_official')}</span>
              </button>
            </div>
          </header>

          <AnimatePresence>
            {state.latestVisualVoiceBanner && (
              <motion.div
                key={state.latestVisualVoiceBanner.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="bg-indigo-50 dark:bg-indigo-950/90 text-slate-900 dark:text-white border-b border-indigo-200 dark:border-indigo-800 px-4 py-2 text-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Volume2 className="w-4 h-4 text-indigo-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold truncate">{state.latestVisualVoiceBanner.spokenText}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDriverNav('voz-copiloto')}
                    className="text-[11px] text-blue-700 dark:text-blue-300 hover:underline font-semibold"
                  >
                    Configurar Voz
                  </button>
                  <button
                    type="button"
                    onClick={dismissVisualVoiceBanner}
                    aria-label="Fechar aviso de voz"
                    className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-white/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <main className="flex-1 p-4 sm:p-6 pb-28 lg:pb-16 max-w-7xl w-full mx-auto space-y-5">
          {/* Non-sticky Demo Sandbox Notice (preserves mobile 15% sticky budget) */}
          {state.session.isDemoSession && (
            <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/45 border border-amber-200 dark:border-amber-800/80 px-3.5 py-2 text-[11px] text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{translateUi(lang, 'demo_sandbox_notice')}</strong>
                {syncNotice ? ` · ${syncNotice}` : ''}
              </span>
              <div className="flex items-center gap-3">
                {onboardingState.dismissed && (
                  <button
                    type="button"
                    onClick={() => setOnboardingState((prev) => setOnboardingDismissed(prev, false))}
                    className="underline font-semibold text-indigo-700 dark:text-indigo-300 hover:opacity-80 cursor-pointer"
                  >
                    Retomar Guia Inicial ({onboardingState.completedStepIds.length}/{DRIVER_ONBOARDING_STEPS.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMode('portal')}
                  className="underline font-semibold hover:opacity-80 cursor-pointer"
                >
                  Entrar com Conta Real no Portal
                </button>
              </div>
            </div>
          )}

          {/* Mobile Quick Strip (Zero Horizontal Overflow on 390px) */}
          <div className="sm:hidden flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 max-w-[56%] flex-1">
              <LocationPillButton onClick={() => setLocationModalOpen(true)} />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setOnboardingState((prev) => setOnboardingDismissed(prev, !prev.dismissed))
                }
                className="min-h-[40px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Guia</span>
              </button>
              <button
                type="button"
                onClick={() => setDriverNav('ai-core')}
                className="min-h-[40px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-xs font-semibold text-blue-700 dark:text-blue-300"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>AI CORE</span>
              </button>
            </div>
          </div>

          {/* Progressive First-Use Onboarding */}
          <AnimatePresence initial={false}>
            {!onboardingState.dismissed && (
              <ProgressiveOnboardingBar
                steps={DRIVER_ONBOARDING_STEPS}
                onboardingState={onboardingState}
                onSelectStep={(idx) => setOnboardingState((prev) => goToOnboardingStep(prev, idx))}
                onMarkStepCompleted={(stepId) =>
                  setOnboardingState((prev) => markOnboardingStepCompleted(prev, stepId))
                }
                onNavigateToStep={(targetNav) => handleSelectNav(targetNav)}
                onDismiss={() => setOnboardingState((prev) => setOnboardingDismissed(prev, true))}
              />
            )}
          </AnimatePresence>

          {/* Unified Module Header + 7-Question Contextual Knowledge Guide */}
          <ModuleGuideBanner
            key={activeModuleGuide.id}
            guide={activeModuleGuide}
            onNavigate={handleSelectNav}
            onStartInteractiveGuide={() => startInteractiveAssistant(resolveAssistantIdForNav(activeNav))}
            onOpenGuideHub={openAssistantHub}
          />

          {/* Smooth Animated Module Viewport */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNav}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Semantic Floating Action Dock (Independent Config from Proposal Cards) */}
      <FloatingActionButton
        label="Atalhos AIVAD"
        ariaLabel="Abrir atalhos rápidos operacionais AIVAD"
        variant="primary"
        icon={<Zap className="w-4 h-4" />}
        badgeText="4"
        actions={quickDockActions}
        dockConfig={state.floatingDockConfig}
      />

      {/* Mobile Fixed Bottom Navigation (56px height -> fits strictly inside <=15% sticky viewport budget) */}
      <nav
        aria-label="Navegação inferior mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white/95 dark:bg-[#0F182B]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#1E2D4A] grid grid-cols-5 px-1"
      >
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isNavActive(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDriverNav(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative min-h-[44px] my-auto flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
                tab.featured
                  ? active
                    ? 'text-white bg-gradient-to-r from-blue-700 to-blue-600 rounded-xl mx-0.5 shadow-sm'
                    : 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 rounded-xl mx-0.5'
                  : active
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {!tab.featured && active && (
                <motion.span
                  layoutId={prefersReducedMotion ? undefined : 'driver-mobile-nav-pill'}
                  transition={{ duration: 0.18 }}
                  className="absolute top-0.5 w-6 h-1 rounded-full bg-blue-600 dark:bg-blue-400"
                />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-full px-1">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <LocalizationPromptOverlay
        manualOpen={locationModalOpen}
        onCloseManual={() => setLocationModalOpen(false)}
      />
      <InteractiveAssistantOverlay scope="driver" />
      <OfflineIndicator />
    </div>
  );
};
