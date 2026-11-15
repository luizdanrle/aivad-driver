import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Calculator,
  CalendarClock,
  Car,
  Compass,
  Database,
  FileCheck2,
  FileSpreadsheet,
  Gauge,
  GitCompare,
  Grid,
  HelpCircle,
  History,
  Home,
  Layers,
  LayoutDashboard,
  Lightbulb,
  MapPin,
  Menu,
  MessageSquare,
  Radio,
  Scale,
  Settings,
  ShieldAlert,
  Star,
  Target,
  User,
  Video,
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
import { DriverDashboardAndOps } from './views/DriverDashboardAndOps';
import { DriverTripsAndPlanning } from './views/DriverTripsAndPlanning';
import { DriverFinanceAndFleet } from './views/DriverFinanceAndFleet';
import { DriverFieldAndCompliance } from './views/DriverFieldAndCompliance';
import { DriverAccountAndSupport } from './views/DriverAccountAndSupport';
import { DriverTachographView } from './views/DriverTachographView';

export type DriverNavCategory =
  | 'Início & Operação'
  | 'Tacógrafo & Turnos'
  | 'Plataformas & Finanças'
  | 'Campo, Legal & Conta';

export const DRIVER_MENU: Array<{
  id: string;
  label: string;
  category: DriverNavCategory;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  { id: 'dashboard', label: '1. Dashboard', category: 'Início & Operação', icon: LayoutDashboard, description: 'Cockpit operacional com metas, tempos e gráficos' },
  { id: 'calculadora', label: '2. Calculadora de propostas', category: 'Início & Operação', icon: Calculator, description: 'Avaliação instantânea €/km, €/h e cartão Android' },
  { id: 'propostas-tempo-real', label: '3. Propostas em tempo real', category: 'Início & Operação', icon: Radio, description: 'Ciclo de vida separado e simulação de captura' },
  { id: 'autopilot', label: '4. AutoPilot', category: 'Início & Operação', icon: Bot, description: 'Regras Manual, Assistido e bloqueio seguro' },
  { id: 'smart-capture', label: '5. Smart Data Capture', category: 'Início & Operação', icon: Database, description: 'Captura idempotente e reconciliação de gorjetas' },
  { id: 'tacografo', label: '6. AIVAD TACÓGRAFO TVDE', category: 'Tacógrafo & Turnos', icon: Gauge, description: '10 estados auditáveis, fila offline e QR verificável' },
  { id: 'agenda-turnos', label: '7. Agenda e turnos', category: 'Tacógrafo & Turnos', icon: CalendarClock, description: 'Escalas, diário/semanal/mensal e notas' },
  { id: 'planeador', label: '8. Planeador inteligente', category: 'Tacógrafo & Turnos', icon: Compass, description: 'Metas líquidas, recálculo e paragens EV' },
  { id: 'consolidado-plataformas', label: '9. Consolidado Multi-App', category: 'Plataformas & Finanças', icon: Layers, description: 'Visão unificada independente de plataformas' },
  { id: 'historico-viagens', label: '10. Histórico de viagens', category: 'Plataformas & Finanças', icon: History, description: 'Registo preservado na moeda original' },
  { id: 'campanhas', label: '11. Campanhas e bónus', category: 'Plataformas & Finanças', icon: Target, description: 'Missões e rentabilidade líquida incremental' },
  { id: 'desempenho-uber', label: '12. Desempenho Uber', category: 'Plataformas & Finanças', icon: Activity, description: 'Módulo isolado Uber Pro e métricas' },
  { id: 'desempenho-bolt', label: '13. Desempenho Bolt', category: 'Plataformas & Finanças', icon: BarChart3, description: 'Módulo isolado Bolt Driver Score e categorias' },
  { id: 'relatorios', label: '14. Relatórios', category: 'Plataformas & Finanças', icon: FileSpreadsheet, description: 'Drill-down e exportação CSV, XLSX, PDF e PNG' },
  { id: 'financeiro', label: '15. Financeiro', category: 'Plataformas & Finanças', icon: Wallet, description: 'Receitas, despesas e simulador mensal' },
  { id: 'veiculos', label: '16. Veículos', category: 'Plataformas & Finanças', icon: Car, description: 'Base técnica multi-motorização' },
  { id: 'comparador-veiculos', label: '17. Comparador de veículos', category: 'Plataformas & Finanças', icon: GitCompare, description: 'TCO e elegibilidade TVDE vs comercial' },
  { id: 'mapas-zonas', label: '18. Mapas e zonas', category: 'Campo, Legal & Conta', icon: MapPin, description: 'Camadas históricas, bases e postos EV' },
  { id: 'legislacao', label: '19. Legislação e conformidade', category: 'Campo, Legal & Conta', icon: Scale, description: 'Regras locais e Lei n.º 59/2026 validada' },
  { id: 'avaliacao-rapida', label: '20. Avaliação rápida', category: 'Campo, Legal & Conta', icon: Star, description: 'Construtor factual de avaliação de passageiros' },
  { id: 'dashcam', label: '21. Dashcam e capturas', category: 'Campo, Legal & Conta', icon: Video, description: 'Clips protegidos e privacidade RGPD' },
  { id: 'assistente-ia', label: '22. Assistente inteligente', category: 'Campo, Legal & Conta', icon: HelpCircle, description: 'Consultas fundamentadas nos seus registos' },
  { id: 'documentos', label: '23. Documentos', category: 'Campo, Legal & Conta', icon: FileCheck2, description: 'Validades ligadas às obrigações legais' },
  { id: 'notificacoes', label: '24. Notificações', category: 'Campo, Legal & Conta', icon: Bell, description: 'Alertas operacionais e comunicados admin' },
  { id: 'suporte', label: '25. Comunicação e suporte', category: 'Campo, Legal & Conta', icon: MessageSquare, description: 'Tickets bidirecionais com equipa AIVAD' },
  { id: 'sugestoes', label: '26. Sugestões de melhorias', category: 'Campo, Legal & Conta', icon: Lightbulb, description: 'Votação e propostas de evolução' },
  { id: 'perfil', label: '27. Perfil e internacional', category: 'Campo, Legal & Conta', icon: Settings, description: 'Residência, mercados, unidades e privacidade' },
];

const CATEGORIES: DriverNavCategory[] = [
  'Início & Operação',
  'Tacógrafo & Turnos',
  'Plataformas & Finanças',
  'Campo, Legal & Conta',
];

export const DriverLayout: React.FC = () => {
  const { state, activeDriver, activeDriverPlan, setDriverNav, setMode, toggleTheme } =
    useEcosystem();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const unreadNotifications = state.notifications.filter(
    (n) => !n.read && (n.targetUserId === 'ALL' || n.targetUserId === activeDriver.id)
  ).length;

  const lang = state.localization.languageCode;
  const currentItem =
    DRIVER_MENU.find((m) => m.id === state.activeDriverNav) ??
    (state.activeDriverNav === 'modulos'
      ? { id: 'modulos', label: 'Todos os Módulos AIVAD', icon: Grid }
      : DRIVER_MENU[0]);

  const activeTachoSession = state.tachograph.sessions.find(
    (s) => s.id === state.tachograph.activeSessionId && s.status === 'Em curso'
  );

  const renderModulesHub = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 p-4 text-xs text-slate-700 dark:text-slate-200">
        <p className="font-bold text-sm text-slate-900 dark:text-white">
          Central Estruturada de Módulos AIVAD Driver ({DRIVER_MENU.length} módulos integrados)
        </p>
        <p className="mt-0.5">
          Todos os módulos partilham o mesmo motor financeiro, tacógrafo, plataformas ativas e perfil internacional.
        </p>
      </div>

      {CATEGORIES.map((cat) => (
        <div key={cat} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {cat}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {DRIVER_MENU.filter((m) => m.category === cat).map((item) => {
              const Icon = item.icon;
              const active = state.activeDriverNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDriverNav(item.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 min-h-[72px] ${
                    active
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-blue-700/10 text-blue-700 dark:text-blue-400 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderView = () => {
    const nav = state.activeDriverNav;
    if (nav === 'modulos') return renderModulesHub();
    if (nav === 'tacografo') return <DriverTachographView />;
    if (
      ['dashboard', 'calculadora', 'propostas-tempo-real', 'autopilot', 'smart-capture'].includes(
        nav
      )
    ) {
      return <DriverDashboardAndOps activeTab={nav} />;
    }
    if (
      [
        'consolidado-plataformas',
        'historico-viagens',
        'campanhas',
        'desempenho-uber',
        'desempenho-bolt',
        'agenda-turnos',
        'planeador',
      ].includes(nav)
    ) {
      return <DriverTripsAndPlanning activeTab={nav} />;
    }
    if (['relatorios', 'financeiro', 'veiculos', 'comparador-veiculos'].includes(nav)) {
      return <DriverFinanceAndFleet activeTab={nav} />;
    }
    if (
      ['mapas-zonas', 'legislacao', 'avaliacao-rapida', 'dashcam', 'assistente-ia'].includes(nav)
    ) {
      return <DriverFieldAndCompliance activeTab={nav} />;
    }
    return <DriverAccountAndSupport activeTab={nav} />;
  };

  const bottomTabs = [
    { id: 'dashboard', label: translateUi(lang, 'nav_home'), icon: Home },
    { id: 'calculadora', label: translateUi(lang, 'nav_ops'), icon: Calculator },
    { id: 'tacografo', label: translateUi(lang, 'nav_tacho'), icon: Gauge, featured: true },
    { id: 'relatorios', label: translateUi(lang, 'nav_reports'), icon: FileSpreadsheet },
    { id: 'perfil', label: translateUi(lang, 'nav_profile'), icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Categorized Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMode('portal')}
            className="flex items-center gap-2 text-base font-bold tracking-tight"
          >
            <PhoenixLogo size={26} />
            <span>AIVAD Driver</span>
          </button>
          <button
            type="button"
            onClick={() => setDriverNav('modulos')}
            className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:text-blue-700"
          >
            Módulos
          </button>
        </div>

        {/* Highlighted Tachograph Quick Tile in Sidebar */}
        <div className="p-3 pb-1">
          <button
            type="button"
            onClick={() => setDriverNav('tacografo')}
            className={`w-full p-3 rounded-xl border text-left transition-all space-y-1 ${
              state.activeDriverNav === 'tacografo'
                ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 hover:border-blue-500'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4" />
                <span>TACÓGRAFO TVDE</span>
              </span>
              <span className="font-mono-tabular text-[10px]">
                {activeTachoSession ? 'ATIVO' : 'PARADO'}
              </span>
            </div>
            <p
              className={`text-[11px] truncate ${
                state.activeDriverNav === 'tacografo'
                  ? 'text-blue-100'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {activeTachoSession?.currentState ?? 'Fora de serviço'}
            </p>
          </button>
        </div>

        <nav aria-label="Menu do Motorista" className="flex-1 overflow-y-auto p-2.5 space-y-3">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="space-y-0.5">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {cat}
              </p>
              {DRIVER_MENU.filter((m) => m.category === cat).map((item) => {
                const Icon = item.icon;
                const active = state.activeDriverNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDriverNav(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                      active
                        ? 'bg-blue-700 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'notificacoes' && unreadNotifications > 0 && (
                      <span className="font-mono-tabular text-[11px] font-bold">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2.5">
            <img
              src="/src/assets/images/aivad_avatar_driver_1794711880211.jpg"
              alt={activeDriver.name}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            <div className="min-w-0">
              <p className="font-semibold truncate">{activeDriver.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {activeDriverPlan.name}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Full Modules Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-80 max-w-[88vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 z-10">
            <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-2">
                <PhoenixLogo size={22} />
                Módulos AIVAD Driver
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
            <nav className="flex-1 overflow-y-auto p-2.5 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setDriverNav('modulos');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
              >
                <Grid className="w-4 h-4" />
                <span>Ver Área Completa de Módulos</span>
              </button>
              {CATEGORIES.map((cat) => (
                <div key={cat} className="space-y-0.5">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {cat}
                  </p>
                  {DRIVER_MENU.filter((m) => m.category === cat).map((item) => {
                    const Icon = item.icon;
                    const active = state.activeDriverNav === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setDriverNav(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-left ${
                          active
                            ? 'bg-blue-700 text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 px-3 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir módulos do motorista"
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                AIVAD Driver · {activeDriverPlan.name}
              </p>
              <h1 className="text-sm sm:text-base font-bold truncate">
                {currentItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <LocationPillButton onClick={() => setLocationModalOpen(true)} />
            </div>
            <PWAInstallButton />
            <ThemeToggleButton theme={state.theme} onToggle={toggleTheme} />
            <button
              type="button"
              onClick={() => setMode('portal')}
              className="hidden md:inline-flex px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Site Oficial
            </button>
            <button
              type="button"
              onClick={() => setMode('admin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="sm:hidden flex items-center justify-between gap-2">
            <LocationPillButton onClick={() => setLocationModalOpen(true)} />
            <button
              type="button"
              onClick={() => setDriverNav('modulos')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
            >
              <Grid className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Módulos</span>
            </button>
          </div>
          {renderView()}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation (Início, Operação, Tacógrafo, Relatórios, Perfil) */}
      <nav
        aria-label="Navegação inferior mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 px-1"
      >
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const active = state.activeDriverNav === tab.id;
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
