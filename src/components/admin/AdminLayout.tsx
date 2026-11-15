import React, { useState } from 'react';
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
  const { state, availableMarketsForPortal, setAdminNav, setAdminRole, setMode, toggleTheme } =
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
            <span>AIVAD Admin</span>
          </button>
          <span className="text-[11px] font-mono-tabular font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
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
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  active
                    ? 'bg-red-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
          <label htmlFor="admin-role-sel" className="block text-[11px] text-slate-500">
            Perfil RBAC Ativo
          </label>
          <select
            id="admin-role-sel"
            value={state.activeAdminRole}
            onChange={(e) => setAdminRole(e.target.value as AdminRole)}
            className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium"
          >
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 z-10">
            <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-2">
                <PhoenixLogo size={22} />
                AIVAD Admin
              </span>
              <button
                type="button"
                aria-label="Fechar menu admin"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5"
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
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-left ${
                      active ? 'bg-red-600 text-white' : 'text-slate-700 dark:text-slate-300'
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

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegação administrativa"
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                AIVAD Management · Perfil: {state.activeAdminRole}
              </p>
              <h1 className="text-sm sm:text-base font-bold truncate">{currentItem.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
              onClick={() => setMode('driver')}
              className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold whitespace-nowrap"
            >
              Modo Motorista
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
