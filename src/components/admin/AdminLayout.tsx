import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  Banknote,
  Bell,
  Building2,
  Car,
  CreditCard,
  FileText,
  Globe,
  History,
  Inbox,
  Layers,
  LayoutDashboard,
  Lock,
  Megaphone,
  Menu,
  Newspaper,
  PackageCheck,
  Palette,
  Plug,
  RefreshCw,
  Scale,
  Server,
  ShieldCheck,
  Sliders,
  Tags,
  Users,
  X,
} from 'lucide-react';
import type { AdminRole } from '../../models/types';
import { useEcosystem } from '../../services/EcosystemContext';
import {
  OfflineIndicator,
  PhoenixLogo,
  ThemeToggleButton,
} from '../ui/DesignSystem';
import { AdminCoreOps } from './views/AdminCoreOps';
import { AdminCatalogAndCompliance } from './views/AdminCatalogAndCompliance';
import { AdminContentAndSupport } from './views/AdminContentAndSupport';
import { AdminTechAndSecurity } from './views/AdminTechAndSecurity';

export const ADMIN_MENU: Array<{
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: '1. Overview', icon: LayoutDashboard },
  { id: 'utilizadores', label: '2. Utilizadores', icon: Users },
  { id: 'organizacoes', label: '3. Organizações', icon: Building2 },
  { id: 'planos', label: '4. Planos', icon: Tags },
  { id: 'assinaturas', label: '5. Assinaturas', icon: CreditCard },
  { id: 'pagamentos', label: '6. Pagamentos', icon: Banknote },
  { id: 'funcionalidades', label: '7. Funcionalidades', icon: Layers },
  { id: 'plataformas', label: '8. Plataformas', icon: Plug },
  { id: 'paises', label: '9. Países e mercados', icon: Globe },
  { id: 'veiculos-eleg', label: '10. Veículos e elegibilidade', icon: Car },
  { id: 'legislacao', label: '11. Legislação', icon: Scale },
  { id: 'notificacoes', label: '12. Notificações', icon: Bell },
  { id: 'comunicacao', label: '13. Comunicação', icon: Megaphone },
  { id: 'tickets', label: '14. Tickets', icon: Inbox },
  { id: 'publicacoes', label: '15. Publicações', icon: Newspaper },
  { id: 'gestao-visual', label: '16. Gestão visual', icon: Palette },
  { id: 'editor-paginas', label: '17. Editor de páginas', icon: FileText },
  { id: 'versoes', label: '18. Versões', icon: PackageCheck },
  { id: 'releases', label: '19. Releases', icon: Activity },
  { id: 'config-remotas', label: '20. Config. remotas', icon: Sliders },
  { id: 'integracoes', label: '21. Integrações', icon: Plug },
  { id: 'monitorizacao', label: '22. Monitorização técnica', icon: Server },
  { id: 'relatorios-admin', label: '23. Relatórios admin', icon: FileText },
  { id: 'seguranca', label: '24. Segurança & RBAC', icon: Lock },
  { id: 'auditoria', label: '25. Auditoria', icon: ShieldCheck },
  { id: 'recuperacao', label: '26. Histórico e recuperação', icon: History },
];

const ADMIN_ROLES: AdminRole[] = [
  'Superadministrador',
  'Administrador',
  'Comercial',
  'Conteúdo',
  'Suporte',
  'Técnico',
  'Auditor',
];

export const AdminLayout: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const { state, availableMarketsForPortal, setAdminNav, setAdminRole, setMode, toggleTheme, syncNowToServer } =
    useEcosystem();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentItem =
    ADMIN_MENU.find((m) => m.id === state.activeAdminNav) ?? ADMIN_MENU[0];

  const renderView = () => {
    const nav = state.activeAdminNav;
    if (
      [
        'overview',
        'utilizadores',
        'organizacoes',
        'planos',
        'assinaturas',
        'pagamentos',
        'funcionalidades',
      ].includes(nav)
    ) {
      return <AdminCoreOps activeTab={nav} />;
    }
    if (
      [
        'plataformas',
        'paises',
        'veiculos-eleg',
        'legislacao',
        'notificacoes',
        'comunicacao',
      ].includes(nav)
    ) {
      return <AdminCatalogAndCompliance activeTab={nav} />;
    }
    if (
      ['tickets', 'publicacoes', 'gestao-visual', 'editor-paginas', 'versoes', 'releases'].includes(
        nav
      )
    ) {
      return <AdminContentAndSupport activeTab={nav} />;
    }
    return <AdminTechAndSecurity activeTab={nav} />;
  };

  return (
    <div className="min-h-screen aivad-canvas-bg text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Structured Governance Sidebar */}
      <aside className="hidden lg:flex lg:w-68 lg:flex-col border-r border-slate-200/90 dark:border-[#1E2D4A] bg-white dark:bg-[#0F182B] shrink-0">
        <div className="h-16 px-4 border-b border-slate-200/90 dark:border-[#1E2D4A] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMode('portal')}
            className="flex items-center gap-2 text-base font-display font-extrabold tracking-tight cursor-pointer"
          >
            <PhoenixLogo size={26} />
            <span>AIVAD Management</span>
          </button>
          <span className="text-[11px] font-mono-tabular font-semibold text-rose-700 dark:text-rose-400">
            {availableMarketsForPortal.length}/{state.countries.length} Merc.
          </span>
        </div>

        <nav aria-label="Menu Administrativo" className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
          {ADMIN_MENU.map((item) => {
            const Icon = item.icon;
            const active = state.activeAdminNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAdminNav(item.id)}
                className={`w-full min-h-[38px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#131F36]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200/90 dark:border-[#1E2D4A] space-y-1.5 text-xs">
          <label htmlFor="admin-role-sel" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {state.session.isDemoSession ? 'Perfil Sandbox (Demo)' : 'Perfil RBAC Autenticado'}
          </label>
          {state.session.isDemoSession ? (
            <select
              id="admin-role-sel"
              value={state.activeAdminRole}
              onChange={(e) => setAdminRole(e.target.value as AdminRole)}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324] text-xs font-semibold"
            >
              {ADMIN_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          ) : (
            <div className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1324] text-xs font-semibold">
              {state.activeAdminRole} (Servidor)
            </div>
          )}
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
              initial={prefersReducedMotion ? false : { x: -270, opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { x: -270, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0F182B] h-full flex flex-col border-r border-slate-200 dark:border-[#1E2D4A] z-10 shadow-2xl"
            >
              <div className="h-14 px-4 border-b border-slate-200 dark:border-[#1E2D4A] flex items-center justify-between">
                <span className="font-display font-bold text-sm flex items-center gap-2">
                  <PhoenixLogo size={22} />
                  AIVAD Management
                </span>
                <button
                  type="button"
                  aria-label="Fechar menu admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {ADMIN_MENU.map((item) => {
                  const Icon = item.icon;
                  const active = state.activeAdminNav === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setAdminNav(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left ${
                        active ? 'bg-rose-600 text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 lg:h-16 px-4 sm:px-6 border-b border-slate-200/90 dark:border-[#1E2D4A] bg-white/95 dark:bg-[#0F182B]/95 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegação administrativa"
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                AIVAD Management · Governança &amp; Operações ({state.activeAdminRole})
              </p>
              <h1 className="text-sm sm:text-base font-display font-extrabold truncate">{currentItem.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`hidden md:inline-flex items-center text-[11px] font-bold ${
                state.session.isDemoSession
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {state.session.isDemoSession ? 'Sandbox Demo' : 'Conta Real'}
            </span>
            <button
              type="button"
              onClick={() => void syncNowToServer()}
              className="min-h-[38px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36] text-[11px] font-semibold hover:border-blue-600 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline capitalize">{state.syncStatus}</span>
            </button>
            <ThemeToggleButton theme={state.theme} onToggle={toggleTheme} />
            <button
              type="button"
              onClick={() => setMode('portal')}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36] text-xs font-semibold hover:border-blue-600 whitespace-nowrap cursor-pointer"
            >
              Site Oficial
            </button>
            <button
              type="button"
              onClick={() => setMode('driver')}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              Modo Motorista
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.activeAdminNav}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <OfflineIndicator />
    </div>
  );
};
