import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  CalendarClock,
  Car,
  ChevronDown,
  ChevronRight,
  Compass,
  FileSpreadsheet,
  Gauge,
  Globe,
  HelpCircle,
  Home,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Menu,
  Cloud,
  Plug,
  RefreshCw,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Star,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { translateUi } from '../../core/localization';
import { useEcosystem } from '../../services/EcosystemContext';
import {
  OfflineIndicator,
  PhoenixLogo,
  PWAInstallButton,
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
    id: 'cartoes-flutuantes',
    label: 'Cartões flutuantes',
    group: 'PERSONALIZAÇÃO',
    icon: Smartphone,
    keywords: 'overlay dinamico verde amarelo vermelho preview simulador android',
  },
  {
    id: 'apps-integracoes',
    label: 'Aplicações e integrações',
    group: 'PERSONALIZAÇÃO',
    icon: Plug,
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

export const DriverLayout: React.FC = () => {
  const {
    state,
    activeDriver,
    activeDriverPlan,
    rolling24hCompliance,
    setDriverNav,
    setMode,
    toggleTheme,
    syncNowToServer,
  } = useEcosystem();

  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(['dashboard', 'ai-core', 'corridas', 'tacografo']);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const unreadNotifications = state.notifications.filter(
    (n) => !n.read && (n.targetUserId === 'ALL' || n.targetUserId === activeDriver.id)
  ).length;

  const lang = state.localization.languageCode;
  const activeNav = state.activeDriverNav;

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

  const renderView = () => {
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
      <div className="p-3 space-y-2 border-b border-slate-200 dark:border-slate-800">
        {/* Live 10h/24h Legal Bar */}
        <button
          type="button"
          onClick={() => handleSelectNav('tacografo')}
          className={`w-full p-3 rounded-xl border text-left transition-all space-y-1.5 ${
            activeNav === 'tacografo'
              ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
              : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 hover:border-blue-500'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              <span>ATIVIDADE TVDE 10h/24h</span>
            </span>
            <span className="font-mono-tabular">
              {Math.floor(rolling24hCompliance.rolling24hWorkMinutes / 60)}h
              {String(rolling24hCompliance.rolling24hWorkMinutes % 60).padStart(2, '0')}m
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-black/15 dark:bg-white/15 overflow-hidden">
            <div
              className={`h-full transition-all ${
                rolling24hCompliance.alertLevel === 'Limite 10h Atingido'
                  ? 'bg-red-500'
                  : rolling24hCompliance.alertLevel === 'Crítico 9h (540 min)' ||
                    rolling24hCompliance.alertLevel === 'Preventivo 8h (480 min)'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
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
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar módulos..."
            aria-label="Pesquisar módulos do motorista"
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      <nav aria-label={isMobile ? 'Menu Mobile do Motorista' : 'Menu do Motorista'} className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {/* Pinned Favorites Strip */}
        {!searchQuery && favorites.length > 0 && (
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" /> Favoritos
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
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                      active
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500'
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
                className="w-full px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
                      className={`group flex items-center rounded-lg transition-colors ${
                        active
                          ? 'bg-blue-700 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectNav(item.id)}
                        className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 text-xs font-medium text-left"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                      {item.id === 'suporte' && unreadNotifications > 0 && (
                        <span className="mr-1.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white font-mono-tabular text-[10px] font-bold">
                          {unreadNotifications}
                        </span>
                      )}
                      {item.id !== 'portal' && (
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(item.id, e)}
                          aria-label={isFav ? `Remover ${item.label} dos favoritos` : `Fixar ${item.label} nos favoritos`}
                          className={`p-1.5 mr-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Clean 5-Group Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMode('portal')}
            className="flex items-center gap-2 text-base font-display font-extrabold tracking-tight"
          >
            <PhoenixLogo size={28} />
            <span>AIVAD Driver</span>
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            {activeDriverPlan.name.replace('AIVAD ', '')}
          </span>
        </div>

        {renderSidebarBody(false)}

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-80 max-w-[88vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 z-10">
            <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-display font-bold text-sm flex items-center gap-2">
                <PhoenixLogo size={22} />
                AIVAD Driver
              </span>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area (ZERO ADMIN BUTTONS) */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 px-3 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu do motorista"
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                AIVAD · O Cérebro Inteligente do Motorista
              </p>
              <h1 className="text-sm sm:text-base font-display font-bold truncate">
                {NAV_LABELS[activeNav] ?? 'Painel principal'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`hidden md:inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                state.session.isDemoSession
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              }`}
            >
              {state.session.isDemoSession ? 'MODO DEMONSTRAÇÃO' : 'CONTA REAL'}
            </span>
            <button
              type="button"
              onClick={async () => {
                const res = await syncNowToServer();
                setSyncNotice(res.message);
                setTimeout(() => setSyncNotice(null), 4000);
              }}
              title={syncNotice ?? 'Sincronizar estado com servidor Express'}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium hover:border-blue-600"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${state.syncStatus === 'pendente' ? 'animate-spin text-blue-600' : 'text-emerald-600'}`} />
              <span className="hidden xl:inline capitalize">{state.syncStatus}</span>
            </button>
            <div className="hidden sm:block">
              <LocationPillButton onClick={() => setLocationModalOpen(true)} />
            </div>
            <button
              type="button"
              onClick={() => setDriverNav('notificacoes')}
              aria-label={`Notificações (${unreadNotifications} por ler)`}
              className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-600"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-mono-tabular font-bold">
                  {unreadNotifications}
                </span>
              )}
            </button>
            <PWAInstallButton />
            <ThemeToggleButton theme={state.theme} onToggle={toggleTheme} />
            <button
              type="button"
              onClick={() => setMode('portal')}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Site Oficial</span>
            </button>
          </div>
        </header>

        {state.session.isDemoSession && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 px-4 py-1.5 text-[11px] text-amber-800 dark:text-amber-300 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Modo Demonstração (Sandbox):</strong> dados fictícios de exemplo isolados da conta real.{' '}
              {syncNotice ? `· ${syncNotice}` : ''}
            </span>
            <button
              type="button"
              onClick={() => setMode('portal')}
              className="underline font-semibold hover:opacity-80"
            >
              Entrar com Conta Real no Portal
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="sm:hidden flex items-center justify-between gap-2">
            <LocationPillButton onClick={() => setLocationModalOpen(true)} />
            <button
              type="button"
              onClick={() => setDriverNav('ai-core')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-xs font-semibold text-blue-700 dark:text-blue-300"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI CORE</span>
            </button>
          </div>
          {renderView()}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <nav
        aria-label="Navegação inferior mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 px-1"
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
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
                tab.featured
                  ? active
                    ? 'text-white bg-blue-700 rounded-xl my-1 mx-0.5 shadow-sm'
                    : 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-xl my-1 mx-0.5'
                  : active
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
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
