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
    group: 'VISÃO GERAL',
    icon: LayoutDashboard,
    keywords: 'inicio dashboard cockpit metas resumo',
  },
  {
    id: 'ai-core',
    label: 'AIVAD AI CORE',
    group: 'VISÃO GERAL',
    icon: Sparkles,
    keywords: 'ia cerebro agentes recomendacoes aprendizagem assistente',
  },
  // OPERAÇÃO
  {
    id: 'corridas',
    label: 'Corridas',
    group: 'OPERAÇÃO',
    icon: Compass,
    keywords: 'propostas calculadora historico smart data capture viagens',
  },
  {
    id: 'estrategia',
    label: 'Estratégia das aplicações',
    group: 'OPERAÇÃO',
    icon: Layers,
    keywords: 'autopilot manual semiautomatico automatico consolidado uber bolt',
  },
  {
    id: 'agenda-turnos',
    label: 'Agenda e turnos',
    group: 'OPERAÇÃO',
    icon: CalendarClock,
    keywords: 'planeador escalas turnos pausas metas campanhas',
  },
  {
    id: 'tacografo',
    label: 'Registo de atividade TVDE',
    group: 'OPERAÇÃO',
    icon: Gauge,
    keywords: 'tacografo portaria 7 2022 10h 24h qr offline',
  },
  // GESTÃO INTELIGENTE
  {
    id: 'financeiro',
    label: 'Financeiro',
    group: 'GESTÃO INTELIGENTE',
    icon: Wallet,
    keywords: 'ganhos despesas liquido custos calculo transparencia',
  },
  {
    id: 'relatorios',
    label: 'Análises e relatórios',
    group: 'GESTÃO INTELIGENTE',
    icon: FileSpreadsheet,
    keywords: 'exportar csv xlsx pdf png graficos desempenho',
  },
  {
    id: 'veiculos',
    label: 'Veículos e energia',
    group: 'GESTÃO INTELIGENTE',
    icon: Car,
    keywords: 'eletrico autonomia real homologada carregamento tarifa comparador elegibilidade',
  },
  {
    id: 'locais-rotas',
    label: 'Locais e rotas',
    group: 'GESTÃO INTELIGENTE',
    icon: MapPin,
    keywords: 'casa garagem carregadores zonas mapas google maps waze favoritos',
  },
  // PERSONALIZAÇÃO
  {
    id: 'voz-copiloto',
    label: 'AIVAD Voice · Copiloto',
    group: 'PERSONALIZAÇÃO',
    icon: Volume2,
    keywords: 'voz copiloto sintese audio alerta propostas bateria maos livres',
  },
  {
    id: 'cartoes-flutuantes',
    label: 'Cartões flutuantes',
    group: 'PERSONALIZAÇÃO',
    icon: Smartphone,
    keywords: 'overlay dinamico verde amarelo vermelho preview simulador android perfis',
  },
  {
    id: 'conectores',
    label: 'Conectores Uber e Bolt',
    group: 'PERSONALIZAÇÃO',
    icon: Plug,
    keywords: 'uber bolt conectores nivel 1 2 3 sandbox api permissoes backoff',
  },
  {
    id: 'apps-integracoes',
    label: 'Aplicações e integrações',
    group: 'PERSONALIZAÇÃO',
    icon: Layers,
    keywords: 'uber bolt cabify freenow pop vloz ativar desativar plataforma',
  },
  {
    id: 'perfil',
    label: 'Configurações',
    group: 'PERSONALIZAÇÃO',
    icon: Settings,
    keywords: 'conta perfil internacional idioma moeda privacidade notificacoes',
  },
  // APOIO
  {
    id: 'diagnostico',
    label: 'Diagnóstico e estado',
    group: 'APOIO',
    icon: Activity,
    keywords: 'diagnostico auditoria transparencia windsurf matriz estado real api',
  },
  {
    id: 'suporte',
    label: 'Ajuda e suporte',
    group: 'APOIO',
    icon: LifeBuoy,
    keywords: 'tickets legislacao documentos avaliacao dashcam notificacoes sugestoes',
  },
  {
    id: 'portal',
    label: 'Aceder ao site',
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
  tacografo: 'Registo de atividade TVDE',
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
    rolling24hCompliance,
    setDriverNav,
    setMode,
    toggleTheme,
    syncNowToServer,
    updateVoiceCopilotConfig,
    dismissVisualVoiceBanner,
  } = useEcosystem();

  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
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

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return DRIVER_SIDEBAR_ITEMS;
    return DRIVER_SIDEBAR_ITEMS.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.keywords.toLowerCase().includes(q) ||
        it.group.toLowerCase().includes(q)
    );
  }, [searchQuery]);

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
        label: 'Cartão Flutuante Dinâmico',
        sublabel: 'Simulador Verde · Amarelo · Vermelho',
        variant: 'accent',
        icon: <Smartphone className="w-4 h-4" />,
        onSelect: () => handleSelectNav('cartoes-flutuantes'),
      },
      {
        id: 'qa-tacografo',
        label: 'Registo TVDE 10h / 24h',
        sublabel: `Restam ${rolling24hCompliance.remainingLegalMinutes} min legais`,
        variant: 'success',
        icon: <Gauge className="w-4 h-4" />,
        onSelect: () => handleSelectNav('tacografo'),
      },
      {
        id: 'qa-aicore',
        label: 'Consultar AI CORE & Voz',
        sublabel: '8 Agentes especialistas + síntese mãos-livres',
        variant: 'ai',
        icon: <Sparkles className="w-4 h-4" />,
        onSelect: () => handleSelectNav('ai-core'),
      },
    ],
    [rolling24hCompliance.remainingLegalMinutes]
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
    { id: 'corridas', label: 'Corridas', icon: Compass },
    { id: 'tacografo', label: 'Atividade', icon: Gauge, featured: true },
    { id: 'ai-core', label: 'AI CORE', icon: Sparkles },
    { id: 'perfil', label: translateUi(lang, 'nav_profile'), icon: User },
  ];

  const renderSidebarBody = (isMobile = false) => (
    <>
      <div className="p-3 space-y-2.5 border-b border-slate-200/90 dark:border-[#1E2D4A]">
        {/* Live 10h/24h Legal Bar */}
        <button
          type="button"
          onClick={() => handleSelectNav('tacografo')}
          className={`w-full p-3 rounded-xl border text-left transition-all space-y-1.5 cursor-pointer ${
            activeNav === 'tacografo'
              ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-blue-50/80 dark:bg-[#131F36] border-blue-200/80 dark:border-blue-800/60 hover:border-blue-500'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              <span>Atividade TVDE 10h/24h</span>
            </span>
            <span className="font-mono-tabular">
              {Math.floor(rolling24hCompliance.rolling24hWorkMinutes / 60)}h
              {String(rolling24hCompliance.rolling24hWorkMinutes % 60).padStart(2, '0')}m
            </span>
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
          <p className={`text-[11px] truncate ${activeNav === 'tacografo' ? 'text-blue-100' : 'text-slate-600 dark:text-slate-300'}`}>
            {activeTachoSession ? activeTachoSession.currentState : 'Fora de serviço'} · Restam{' '}
            {rolling24hCompliance.remainingLegalMinutes}m
          </p>
        </button>

        {/* Search Modules */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar módulos..."
            aria-label="Pesquisar módulos do motorista"
            className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1324] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      <nav aria-label={isMobile ? 'Menu Mobile do Motorista' : 'Menu do Motorista'} className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {/* Pinned Favorites Strip */}
        {!searchQuery && favorites.length > 0 && (
          <div className="space-y-1.5">
            <p className="px-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" /> Favoritos rápidos
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
                    {it.label}
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
          return (
            <div key={groupName} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(groupName)}
                className="w-full px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <span>{groupName}</span>
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {!isCollapsed &&
                groupItems.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(item.id);
                  const isFav = favorites.includes(item.id);
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
                        className="flex-1 min-w-0 min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-left cursor-pointer"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                      {item.id === 'suporte' && unreadNotifications > 0 && (
                        <span className="mr-1.5 px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-mono-tabular text-[10px] font-bold">
                          {unreadNotifications}
                        </span>
                      )}
                      {item.id !== 'portal' && (
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(item.id, e)}
                          aria-label={isFav ? `Remover ${item.label} dos favoritos` : `Fixar ${item.label} nos favoritos`}
                          className={`p-1.5 mr-1 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer ${
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
      <aside className="hidden lg:flex lg:w-72 lg:flex-col border-r border-slate-200/90 dark:border-[#1E2D4A] bg-white dark:bg-[#0F182B] shrink-0">
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

        <div className="p-3 border-t border-slate-200/90 dark:border-[#1E2D4A] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/src/assets/images/aivad_avatar_driver_1794711880211.jpg"
              alt={activeDriver.name}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <p className="font-semibold truncate">{activeDriver.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {activeDriver.city} · {activeDriver.osPlatform}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelectNav('perfil')}
            aria-label="Abrir configurações"
            className="p-2 rounded-lg text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-[#131F36] cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
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
              initial={prefersReducedMotion ? false : { x: -280, opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { x: -280, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-80 max-w-[88vw] bg-white dark:bg-[#0F182B] h-full flex flex-col border-r border-slate-200 dark:border-[#1E2D4A] z-10 shadow-2xl"
            >
              <div className="h-14 px-4 border-b border-slate-200 dark:border-[#1E2D4A] flex items-center justify-between">
                <span className="font-display font-bold text-sm flex items-center gap-2">
                  <PhoenixLogo size={22} />
                  AIVAD Driver
                </span>
                <button
                  type="button"
                  aria-label="Fechar menu"
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
                  AIVAD · O Cérebro Inteligente do Motorista
                </p>
                <h1 className="text-sm sm:text-base font-display font-extrabold truncate text-slate-900 dark:text-white">
                  {NAV_LABELS[activeNav] ?? 'Painel principal'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
                  Guia ({onboardingState.completedStepIds.length}/{DRIVER_ONBOARDING_STEPS.length})
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
                <span>Site Oficial</span>
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
                <strong>Modo Demonstração (Sandbox):</strong> dados de exemplo isolados da conta real.
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

      {/* Global Semantic Floating Action Dock (Zero Black Buttons in Light & Dark Modes) */}
      <FloatingActionButton
        label="Atalhos AIVAD"
        ariaLabel="Abrir atalhos rápidos operacionais AIVAD"
        variant="primary"
        icon={<Zap className="w-4 h-4" />}
        badgeText="4"
        actions={quickDockActions}
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
      <OfflineIndicator />
    </div>
  );
};
