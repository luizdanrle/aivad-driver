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
  GitCompare,
  HelpCircle,
  History,
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
  Video,
  Wallet,
  X,
} from 'lucide-react';
import { useEcosystem } from '../../services/EcosystemContext';
import {
  OfflineIndicator,
  PhoenixLogo,
  PWAInstallButton,
  ThemeToggleButton,
} from '../ui/DesignSystem';
import { DriverDashboardAndOps } from './views/DriverDashboardAndOps';
import { DriverTripsAndPlanning } from './views/DriverTripsAndPlanning';
import { DriverFinanceAndFleet } from './views/DriverFinanceAndFleet';
import { DriverFieldAndCompliance } from './views/DriverFieldAndCompliance';
import { DriverAccountAndSupport } from './views/DriverAccountAndSupport';

export const DRIVER_MENU: Array<{
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
  { id: 'calculadora', label: '2. Calculadora de propostas', icon: Calculator },
  { id: 'propostas-tempo-real', label: '3. Propostas em tempo real', icon: Radio },
  { id: 'autopilot', label: '4. AutoPilot', icon: Bot },
  { id: 'smart-capture', label: '5. Smart Data Capture', icon: Database },
  { id: 'historico-viagens', label: '6. Histórico de viagens', icon: History },
  { id: 'campanhas', label: '7. Campanhas e bónus', icon: Target },
  { id: 'desempenho-uber', label: '8. Desempenho Uber', icon: Activity },
  { id: 'desempenho-bolt', label: '9. Desempenho Bolt', icon: BarChart3 },
  { id: 'agenda-turnos', label: '10. Agenda e turnos', icon: CalendarClock },
  { id: 'planeador', label: '11. Planeador inteligente', icon: Compass },
  { id: 'relatorios', label: '12. Relatórios', icon: FileSpreadsheet },
  { id: 'financeiro', label: '13. Financeiro', icon: Wallet },
  { id: 'veiculos', label: '14. Veículos', icon: Car },
  { id: 'comparador-veiculos', label: '15. Comparador de veículos', icon: GitCompare },
  { id: 'mapas-zonas', label: '16. Mapas e zonas', icon: MapPin },
  { id: 'legislacao', label: '17. Legislação e conformidade', icon: Scale },
  { id: 'avaliacao-rapida', label: '18. Avaliação rápida', icon: Star },
  { id: 'dashcam', label: '19. Dashcam e capturas', icon: Video },
  { id: 'assistente-ia', label: '20. Assistente inteligente', icon: HelpCircle },
  { id: 'documentos', label: '21. Documentos', icon: FileCheck2 },
  { id: 'notificacoes', label: '22. Notificações', icon: Bell },
  { id: 'suporte', label: '23. Comunicação e suporte', icon: MessageSquare },
  { id: 'sugestoes', label: '24. Sugestões de melhorias', icon: Lightbulb },
  { id: 'perfil', label: '25. Perfil e configurações', icon: Settings },
];

export const DriverLayout: React.FC = () => {
  const { state, activeDriver, activeDriverPlan, setDriverNav, setMode, toggleTheme } =
    useEcosystem();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadNotifications = state.notifications.filter(
    (n) => !n.read && (n.targetUserId === 'ALL' || n.targetUserId === activeDriver.id)
  ).length;

  const currentItem =
    DRIVER_MENU.find((m) => m.id === state.activeDriverNav) ?? DRIVER_MENU[0];

  const renderView = () => {
    const nav = state.activeDriverNav;
    if (
      ['dashboard', 'calculadora', 'propostas-tempo-real', 'autopilot', 'smart-capture'].includes(
        nav
      )
    ) {
      return <DriverDashboardAndOps activeTab={nav} />;
    }
    if (
      [
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
    if (['mapas-zonas', 'legislacao', 'avaliacao-rapida', 'dashcam', 'assistente-ia'].includes(nav)) {
      return <DriverFieldAndCompliance activeTab={nav} />;
    }
    return <DriverAccountAndSupport activeTab={nav} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMode('portal')}
            className="flex items-center gap-2 text-base font-bold tracking-tight"
          >
            <PhoenixLogo size={26} />
            <span>AIVAD Driver</span>
          </button>
        </div>

        <nav aria-label="Menu do Motorista" className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
          {DRIVER_MENU.map((item) => {
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

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 z-10">
            <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-2">
                <PhoenixLogo size={22} />
                AIVAD Driver
              </span>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {DRIVER_MENU.map((item) => {
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
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegação do motorista"
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Modo Motorista · Dados demonstrativos editáveis
              </p>
              <h1 className="text-sm sm:text-base font-bold truncate">
                {currentItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <ThemeToggleButton theme={state.theme} onToggle={toggleTheme} />
            <button
              type="button"
              onClick={() => setMode('portal')}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Site Oficial
            </button>
            <button
              type="button"
              onClick={() => setMode('admin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {renderView()}
        </main>
      </div>

      <OfflineIndicator />
    </div>
  );
};
