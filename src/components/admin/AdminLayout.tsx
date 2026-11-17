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
  Sparkles,
  Tags,
  Users,
  X,
} from 'lucide-react';
import { canAccessAdminTab } from '../../core/rbac';
import type { AdminRole } from '../../models/types';
import { useEcosystem } from '../../services/EcosystemContext';
import {
  OfflineIndicator,
  PhoenixLogo,
  ThemeToggleButton,
} from '../ui/DesignSystem';
import { InteractiveAssistantOverlay } from '../ui/InteractiveAssistantOverlay';
import { AdminCoreOps } from './views/AdminCoreOps';
import { AdminCatalogAndCompliance } from './views/AdminCatalogAndCompliance';
import { AdminContentAndSupport } from './views/AdminContentAndSupport';
import { AdminTechAndSecurity } from './views/AdminTechAndSecurity';

export type AdminMenuCategory =
  | 'Dashboard administrativo'
  | 'Organizações'
  | 'Motoristas e equipas'
  | 'Veículos'
  | 'Mercados e países'
  | 'Plataformas'
  | 'Relatórios'
  | 'CMS e portal'
  | 'Configurações'
  | 'Segurança e auditoria';

export const ADMIN_MENU_CATEGORIES: AdminMenuCategory[] = [
  'Dashboard administrativo',
  'Organizações',
  'Motoristas e equipas',
  'Veículos',
  'Mercados e países',
  'Plataformas',
  'Relatórios',
  'CMS e portal',
  'Configurações',
  'Segurança e auditoria',
];

export const ADMIN_MENU: Array<{
  id: string;
  label: string;
  subtitle: string;
  category: AdminMenuCategory;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview Executivo', subtitle: 'Estado global & KPIs', category: 'Dashboard administrativo', icon: LayoutDashboard },
  { id: 'organizacoes', label: 'Organizações & Frotas', subtitle: 'Operadores & strict_tenant', category: 'Organizações', icon: Building2 },
  { id: 'utilizadores', label: 'Motoristas & Equipas', subtitle: 'Contas, perfis & RGPD', category: 'Motoristas e equipas', icon: Users },
  { id: 'veiculos-eleg', label: 'Veículos & Elegibilidade', subtitle: 'Regras TVDE & catálogo', category: 'Veículos', icon: Car },
  { id: 'paises', label: 'Mercados & Países', subtitle: 'Cidades, moedas & estados', category: 'Mercados e países', icon: Globe },
  { id: 'plataformas', label: 'Plataformas & Matriz', subtitle: 'Operação real por país', category: 'Plataformas', icon: Plug },
  { id: 'relatorios-admin', label: 'Relatórios Admin', subtitle: 'Operação & auditoria global', category: 'Relatórios', icon: FileText },
  { id: 'planos', label: 'Planos SaaS', subtitle: 'Tarifário & limites', category: 'Relatórios', icon: Tags },
  { id: 'assinaturas', label: 'Assinaturas', subtitle: 'Renovações & estados', category: 'Relatórios', icon: CreditCard },
  { id: 'pagamentos', label: 'Pagamentos', subtitle: 'Cobranças & conciliação', category: 'Relatórios', icon: Banknote },
  { id: 'funcionalidades', label: 'Funcionalidades', subtitle: 'Matriz por plano', category: 'Relatórios', icon: Layers },
  { id: 'gestao-visual', label: 'Gestão Visual & CMS', subtitle: 'Cores, hero & portal', category: 'CMS e portal', icon: Palette },
  { id: 'editor-paginas', label: 'Editor de Páginas', subtitle: 'Textos & traduções', category: 'CMS e portal', icon: FileText },
  { id: 'publicacoes', label: 'Publicações', subtitle: 'FAQ & avisos públicos', category: 'CMS e portal', icon: Newspaper },
  { id: 'notificacoes', label: 'Notificações', subtitle: 'Alertas segmentados', category: 'CMS e portal', icon: Bell },
  { id: 'comunicacao', label: 'Comunicação', subtitle: 'Mensagens & campanhas', category: 'CMS e portal', icon: Megaphone },
  { id: 'tickets', label: 'Tickets de Suporte', subtitle: 'Triagem & respostas', category: 'CMS e portal', icon: Inbox },
  { id: 'config-remotas', label: 'Configurações Remotas', subtitle: 'Parâmetros & feature flags', category: 'Configurações', icon: Sliders },
  { id: 'integracoes', label: 'Integrações & APIs', subtitle: 'Cofre OAuth & bridges', category: 'Configurações', icon: Plug },
  { id: 'versoes', label: 'Versões', subtitle: 'Web, PWA, Android & iOS', category: 'Configurações', icon: PackageCheck },
  { id: 'releases', label: 'Releases', subtitle: 'Notas & rollout gradual', category: 'Configurações', icon: Activity },
  { id: 'legislacao', label: 'Legislação TVDE', subtitle: 'Normas & conformidade', category: 'Segurança e auditoria', icon: Scale },
  { id: 'monitorizacao', label: 'Monitorização Técnica', subtitle: 'Latência & saúde do servidor', category: 'Segurança e auditoria', icon: Server },
  { id: 'seguranca', label: 'Segurança & RBAC', subtitle: 'Permissões & sessões', category: 'Segurança e auditoria', icon: Lock },
  { id: 'auditoria', label: 'Auditoria Imutável', subtitle: 'Registo de alterações', category: 'Segurança e auditoria', icon: ShieldCheck },
  { id: 'recuperacao', label: 'Histórico & Recuperação', subtitle: 'Snapshots & reposição', category: 'Segurança e auditoria', icon: History },
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
  const {
    state,
    availableMarketsForPortal,
    setAdminNav,
    setAdminRole,
    setMode,
    toggleTheme,
    syncNowToServer,
    openAssistantHub,
  } = useEcosystem();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const accessibleMenu = ADMIN_MENU.filter((m) =>
    canAccessAdminTab(state.activeAdminRole, m.id)
  );
  const currentItem =
    ADMIN_MENU.find((m) => m.id === state.activeAdminNav) ?? accessibleMenu[0] ?? ADMIN_MENU[0];
  const hasCurrentTabAccess = canAccessAdminTab(state.activeAdminRole, state.activeAdminNav);

  const renderGroupedMenu = (isMobile: boolean) =>
    ADMIN_MENU_CATEGORIES.map((category) => {
      const items = accessibleMenu.filter((item) => item.category === category);
      if (items.length === 0) return null;
      return (
        <div key={category} className="space-y-0.5 pt-2 first:pt-0">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {category}
          </p>
          {items.map((item) => {
            const Icon = item.icon;
            const active = state.activeAdminNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setAdminNav(item.id);
                  if (isMobile) setMobileMenuOpen(false);
                }}
                className={`w-full min-h-[40px] flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#131F36]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold leading-tight">
                    {item.label}
                  </span>
                  <span
                    className={`block truncate text-[10px] leading-tight ${
                      active ? 'text-rose-100' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {item.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      );
    });

  const renderView = () => {
    const nav = state.activeAdminNav;
    if (!hasCurrentTabAccess) {
      return (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800/70 bg-white dark:bg-[#0F182B] p-6 space-y-3 max-w-xl">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <Lock className="w-5 h-5" />
            <h2 className="text-base font-display font-bold">Acesso Restrito por RBAC</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            O perfil ativo <strong>{state.activeAdminRole}</strong> não tem permissão para aceder ao módulo{' '}
            <strong>{currentItem.label}</strong>. Esta proteção é aplicada na consola e na API do servidor.
          </p>
          <button
            type="button"
            onClick={() => setAdminNav('overview')}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
          >
            Voltar ao Overview Executivo
          </button>
        </div>
      );
    }
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
      <aside className="hidden lg:flex lg:w-72 lg:flex-col border-r border-slate-200/90 dark:border-[#1E2D4A] bg-white dark:bg-[#0F182B] shrink-0">
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

        <nav aria-label="Menu Administrativo" className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {renderGroupedMenu(false)}
        </nav>

        <div className="p-3 border-t border-slate-200/90 dark:border-[#1E2D4A] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <label htmlFor="admin-role-sel" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {state.session.isDemoSession ? 'Perfil Sandbox (Demo)' : 'Perfil RBAC Autenticado'}
            </label>
            <span className="text-[10px] font-mono-tabular text-slate-400">
              {accessibleMenu.length}/{ADMIN_MENU.length} módulos
            </span>
          </div>
          {state.session.isDemoSession ? (
            <select
              id="admin-role-sel"
              value={state.activeAdminRole}
              onChange={(e) => {
                const nextRole = e.target.value as AdminRole;
                setAdminRole(nextRole);
                if (!canAccessAdminTab(nextRole, state.activeAdminNav)) {
                  setAdminNav('overview');
                }
              }}
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
              <nav className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {renderGroupedMenu(true)}
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
            <button
              type="button"
              onClick={openAssistantHub}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:border-indigo-500 whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Assistentes</span>
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

      <InteractiveAssistantOverlay scope="admin" />
      <OfflineIndicator />
    </div>
  );
};
