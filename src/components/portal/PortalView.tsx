import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Check,
  Compass,
  Download,
  ExternalLink,
  Gauge,
  Globe,
  HelpCircle,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { canAccessMode, isAdminRole } from '../../core/rbac';
import { useEcosystem } from '../../services/EcosystemContext';
import { PLATFORM_ADAPTERS } from '../../adapters/platformAdapters';
import { PlatformLogo } from '../ui/ChartsAndVisuals';
import { LocationPillButton } from '../ui/LocalizationModal';
import {
  Card,
  PhoenixLogo,
  PWAInstallButton,
  StatusLabel,
  ThemeToggleButton,
} from '../ui/DesignSystem';

const PORTAL_PAGES = [
  { id: 'inicio', label: 'Início' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'mercados', label: 'Mercados' },
  { id: 'plataformas', label: 'Plataformas' },
  { id: 'planos', label: 'Planos & Preços' },
  { id: 'downloads', label: 'Plataformas Web/Mobile' },
  { id: 'tutoriais', label: 'Tutoriais & FAQ' },
  { id: 'seguranca', label: 'Segurança & RGPD' },
  { id: 'contacto', label: 'Contacto' },
];

const FEATURED_CAPABILITIES = [
  {
    id: 'ai-core',
    icon: Sparkles,
    title: 'AIVAD AI CORE Multi-Agente',
    desc: '8 agentes especializados que explicam entradas, passos, confiança (%) e calibragem isolada por motorista.',
  },
  {
    id: 'tacografo',
    icon: Gauge,
    title: 'Registo TVDE 10h / 24h',
    desc: 'Monitorização em janela deslizante de 24h multi-app, fila offline idempotente e QR verificável.',
  },
  {
    id: 'calculadora',
    icon: Calculator,
    title: 'Cartão Flutuante & Decisão',
    desc: 'Avalia €/km, €/h, retorno em vazio e alternativas operacionais antes de aceitar qualquer corrida.',
  },
  {
    id: 'financeiro',
    icon: Wallet,
    title: 'Transparência Financeira Real',
    desc: 'Exclui canceladas dos ganhos, separa propriedade/tarifa do veículo e explica cada KPI passo a passo.',
  },
  {
    id: 'planeador',
    icon: Compass,
    title: 'Estratégia 3 Modos & Rotina',
    desc: 'Manual, Semiautomático com limites e reversão auditável, e Automático com proteção oficial.',
  },
  {
    id: 'plataformas',
    icon: Layers,
    title: 'Independência Multi-App',
    desc: 'Uber, Bolt, Cabify, FREE NOW, POP e VLOZ com gestão individual sem perder histórico ao desativar.',
  },
];

export const PortalView: React.FC<{ onOpenLocationModal?: () => void }> = ({
  onOpenLocationModal,
}) => {
  const {
    state,
    availableMarketsForPortal,
    setMode,
    loginWithServerCredentials,
    registerRealAccount,
    enterDemoSandbox,
    logoutSession,
    clearRbacDenied,
    setPortalPage,
    toggleTheme,
  } = useEcosystem();

  const page = state.activePortalPage;
  const cms = state.cms;
  const primaryColor = cms.primaryColor || '#1D4ED8';
  const accentColor = cms.accentColor || '#DC2626';
  const visibleSections = cms.visibleSections ?? {
    hero: true,
    modules: true,
    platforms: true,
    plans: true,
    markets: true,
    faq: true,
    updates: true,
  };
  const sectionOrder = cms.sectionOrder ?? [
    'hero',
    'modules',
    'platforms',
    'plans',
    'markets',
    'faq',
    'updates',
  ];

  const [authModalOpen, setAuthModalOpen] = useState<'driver' | 'admin' | null>(null);
  const [authTab, setAuthTab] = useState<'real' | 'demo'>('real');
  const [realMode, setRealMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState<'Motorista' | 'Operador'>('Motorista');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    profile: 'Motorista TVDE',
    message: '',
  });
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSent, setContactSent] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.includes('@') || contactForm.message.trim().length < 10) {
      setContactError('Preencha o nome, um email válido e uma mensagem com pelo menos 10 caracteres.');
      return;
    }
    setContactError(null);
    setContactSent(true);
  };

  const handleEnterDriver = () => {
    if (canAccessMode(state.session, 'driver')) {
      setMode('driver');
    } else {
      setAuthError(null);
      setAuthModalOpen('driver');
    }
  };

  const handleEnterAdmin = () => {
    if (canAccessMode(state.session, 'admin')) {
      setMode('admin');
    } else {
      setAuthError(null);
      setAuthModalOpen('admin');
    }
  };

  const pipelineMarkets = state.countries.filter((c) => c.marketStatus !== 'Disponível');
  const benefitsList = cms.benefits ?? [];
  const faqList = cms.faqs ?? [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setPortalPage('inicio')}
            className="flex items-center gap-2.5 text-lg font-display font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <PhoenixLogo size={30} />
            <span>{cms.brandTitle ?? 'AIVAD'}</span>
          </button>

          <nav
            aria-label="Navegação principal do portal"
            className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            {[
              ['funcionalidades', 'Funcionalidades'],
              ['mercados', 'Mercados'],
              ['plataformas', 'Plataformas'],
              ['planos', 'Planos'],
              ['downloads', 'Web/Mobile'],
              ['contacto', 'Contacto'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPortalPage(id)}
                className={`hover:text-blue-700 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 ${
                  page === id ? 'text-blue-700 dark:text-blue-400 font-bold underline underline-offset-4' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenLocationModal && (
              <div className="hidden md:block">
                <LocationPillButton onClick={onOpenLocationModal} />
              </div>
            )}
            <ThemeToggleButton theme={state.theme} onToggle={toggleTheme} />
            <button
              type="button"
              onClick={handleEnterDriver}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-lg hover:opacity-95 text-white text-xs font-semibold transition-opacity whitespace-nowrap shrink-0"
            >
              {cms.heroCtaDriverLabel || 'Entrar como Motorista'}
            </button>
          </div>
        </div>
      </header>

      {/* Portal Session & Access Strip */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              Sessão &amp; Perfis:
            </span>
            {state.session.authenticated ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{state.session.userName}</span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">{state.session.role}</span>
                {state.session.isDemoSession && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                    DEMO
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-500">Visitante não autenticado</span>
            )}
            <button
              type="button"
              onClick={() => {
                setAuthError(null);
                setAuthTab('real');
                setAuthModalOpen('driver');
              }}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-600 font-medium"
            >
              Acesso Motorista
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthError(null);
                setAuthTab('real');
                handleEnterAdmin();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-600 font-medium"
            >
              <Lock className="w-3 h-3 text-red-600" />
              <span>Acesso Administrativo</span>
            </button>
            {state.session.authenticated && (
              <button
                type="button"
                onClick={logoutSession}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-slate-500 hover:text-red-600"
              >
                <LogOut className="w-3 h-3" />
                <span>Terminar Sessão</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton />
          </div>
        </div>
      </div>

      {/* RBAC Guard Banner if redirected */}
      {state.rbacDeniedMessage && (
        <div className="bg-red-700 text-white px-4 py-3 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{state.rbacDeniedMessage}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  clearRbacDenied();
                  setAuthModalOpen('admin');
                }}
                className="px-3 py-1 rounded bg-white text-red-700 font-bold"
              >
                Autenticar Admin
              </button>
              <button
                type="button"
                onClick={clearRbacDenied}
                aria-label="Dispensar aviso RBAC"
                className="p-1 hover:bg-red-800 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live CMS Announcement Banner */}
      {cms.showAnnouncement && (
        <div style={{ backgroundColor: primaryColor }} className="text-white text-xs py-2 px-4 text-center">
          <span className="font-medium">{cms.announcementBanner}</span>
          <span className="mx-2 opacity-50">·</span>
          <button
            type="button"
            onClick={() => setPortalPage('downloads')}
            className="underline font-semibold hover:opacity-80"
          >
            Ver atualizações do ecossistema
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Portal Directory Strip */}
        <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-200 dark:border-slate-800">
          {PORTAL_PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPortalPage(p.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                page === p.id
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* PAGE: INÍCIO (100% Controlled by CMS sectionOrder & visibleSections) */}
        {page === 'inicio' && (
          <div className="space-y-12">
            {sectionOrder.map((secId) => {
              if (!visibleSections[secId]) return null;

              if (secId === 'hero') {
                return (
                  <section key="hero" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
                      <p style={{ color: accentColor }} className="text-xs font-bold tracking-wide uppercase">
                        {cms.brandTagline || 'O Cérebro Inteligente do Motorista'}
                      </p>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
                        {cms.heroTitle}
                      </h1>
                      <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                        {cms.heroSubtitle}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleEnterDriver}
                          style={{ backgroundColor: primaryColor }}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-95 shadow-sm"
                        >
                          <span>{cms.heroCtaDriverLabel || 'Entrar como Motorista'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPortalPage('planos')}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <span>{cms.heroCtaPlansLabel || 'Explorar Planos'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Ecossistema independente para motoristas e operadores · Cálculos auditáveis sem promessas irreais.
                      </p>
                    </div>

                    <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 min-h-[300px]">
                      <img
                        src="/src/assets/images/aivad_portal_hero_1794711880878.jpg"
                        alt="Viatura elétrica executiva em operação urbana AIVAD"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </section>
                );
              }

              if (secId === 'modules') {
                return (
                  <section key="modules" className="space-y-5">
                    {benefitsList.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {benefitsList.map((b) => (
                          <Card key={b.id} className="p-5 space-y-1.5 border-blue-200/70 dark:border-blue-900/50">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{b.title}</h2>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{b.description}</p>
                          </Card>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h2 className="text-2xl font-display font-bold">Pilares Operacionais AIVAD</h2>
                        <p className="text-xs text-slate-500">
                          Módulos partilhados em tempo real sob o mesmo motor central.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPortalPage('funcionalidades')}
                        className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        Ver funcionalidades completas →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {FEATURED_CAPABILITIES.map((cap) => {
                        const Icon = cap.icon;
                        return (
                          <Card key={cap.id} className="p-5 space-y-2.5">
                            <div className="w-9 h-9 rounded-lg bg-blue-700/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                              <Icon className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold">{cap.title}</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {cap.desc}
                            </p>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                );
              }

              if (secId === 'platforms') {
                return (
                  <section key="platforms" className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xl font-display font-bold">
                        Plataformas Catalogadas ({state.platforms.length})
                      </h2>
                      <button
                        type="button"
                        onClick={() => setPortalPage('plataformas')}
                        className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        Estado das integrações →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                      {state.platforms.map((pl) => (
                        <Card key={pl.id} className="p-3.5 flex flex-col items-center text-center gap-2">
                          <PlatformLogo platformId={pl.id} name={pl.name} size={36} />
                          <span className="text-xs font-bold">{pl.name}</span>
                          <span className="text-[10px] text-slate-500">Comissão {pl.commissionPct}%</span>
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              }

              if (secId === 'plans') {
                return (
                  <section key="plans" className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xl font-display font-bold">Planos AIVAD SaaS Core</h2>
                      <button
                        type="button"
                        onClick={() => setPortalPage('planos')}
                        className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        Comparar planos →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {state.plans.map((plan) => (
                        <Card key={plan.id} className="p-5 flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">{plan.audience}</p>
                            <h3 className="text-base font-bold">{plan.name}</h3>
                            <p className="text-2xl font-extrabold font-mono-tabular">
                              €{plan.monthlyPriceEur.toFixed(2)}
                              <span className="text-xs font-normal text-slate-500"> / mês</span>
                            </p>
                            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                              {plan.features.slice(0, 3).map((f) => (
                                <li key={f} className="flex items-start gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <button
                            type="button"
                            onClick={handleEnterDriver}
                            className="w-full py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
                          >
                            Aceder no Modo Motorista
                          </button>
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              }

              if (secId === 'markets') {
                return (
                  <section key="markets" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-5 space-y-1">
                      <span className="text-xs text-slate-500">Mercados Disponíveis</span>
                      <p className="text-xl font-bold font-mono-tabular">{availableMarketsForPortal.length} Países</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {availableMarketsForPortal.map((c) => c.name).join(', ')} (+{pipelineMarkets.length} em estudo).
                      </p>
                    </Card>
                    <Card className="p-5 space-y-1">
                      <span className="text-xs text-slate-500">Conformidade Jurídica</span>
                      <p className="text-xl font-bold font-mono-tabular text-red-600 dark:text-red-400">
                        {state.obligations.length} Normas Ativas
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Portaria n.º 7/2022, Lei TVDE e regras locais por país.
                      </p>
                    </Card>
                    <Card className="p-5 space-y-1">
                      <span className="text-xs text-slate-500">Sessões &amp; Atividade</span>
                      <p className="text-xl font-bold font-mono-tabular text-blue-700 dark:text-blue-400">
                        10h / 24h Janela
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Alertas preventivos às 8h e 9h com QR verificável.
                      </p>
                    </Card>
                    <Card className="p-5 space-y-1">
                      <span className="text-xs text-slate-500">Canal &amp; Suporte</span>
                      <p className="text-sm font-bold truncate">{cms.contactEmail || 'suporte@aivad-ecosystem.local'}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{cms.supportHours || 'Seg–Sex · 09:00–19:00'}</p>
                    </Card>
                  </section>
                );
              }

              if (secId === 'faq' && faqList.length > 0) {
                return (
                  <section key="faq" className="space-y-4">
                    <h2 className="text-xl font-display font-bold flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                      Perguntas Frequentes
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {faqList.map((f) => (
                        <Card key={f.id} className="p-5 space-y-1.5">
                          <h3 className="text-sm font-bold">{f.question}</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{f.answer}</p>
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              }

              if (secId === 'updates') {
                return (
                  <section key="updates" className="space-y-3">
                    <h2 className="text-xl font-display font-bold">Comunicados Publicados</h2>
                    <Card className="divide-y divide-slate-200 dark:divide-slate-800">
                      {cms.publications
                        .filter((p) => p.status === 'Publicado')
                        .map((pub) => (
                          <div key={pub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold">{pub.title}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-300">{pub.summary}</p>
                            </div>
                            <span className="text-xs text-slate-500 font-mono-tabular whitespace-nowrap">
                              {pub.category} · {pub.publishedAt}
                            </span>
                          </div>
                        ))}
                    </Card>
                  </section>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* PAGE: FUNCIONALIDADES */}
        {page === 'funcionalidades' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold">Funcionalidades do Ecossistema AIVAD</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURED_CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <Card key={cap.id} className="p-5 space-y-2">
                    <Icon className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                    <h3 className="text-sm font-bold">{cap.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{cap.desc}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* PAGE: MERCADOS */}
        {page === 'mercados' && (
          <div className="space-y-6">
            <Card className="overflow-x-auto">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                <div>
                  <h2 className="text-lg font-bold">Mercados Disponíveis ({availableMarketsForPortal.length})</h2>
                  <p className="text-xs text-slate-500">
                    Lista sincronizada em tempo real com a Administração Central.
                  </p>
                </div>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">País</th>
                    <th className="p-3">Cidades</th>
                    <th className="p-3">Idioma</th>
                    <th className="p-3">Moeda &amp; Unidades</th>
                    <th className="p-3">Licença Local</th>
                    <th className="p-3">Plataformas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {availableMarketsForPortal.map((c) => (
                    <tr key={c.code}>
                      <td className="p-3 font-semibold">{c.name} ({c.code})</td>
                      <td className="p-3">{c.regions.flatMap((r) => r.cities).join(', ')}</td>
                      <td className="p-3">{c.language}</td>
                      <td className="p-3 font-mono-tabular">
                        {c.currency} ({c.currencySymbol}) · {c.unitSystem === 'imperial' ? 'mi' : 'km'}
                      </td>
                      <td className="p-3">{c.driverLicenseRequired}</td>
                      <td className="p-3">{c.activePlatforms.join(', ').toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* PAGE: PLATAFORMAS */}
        {page === 'plataformas' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-display font-bold">
                Plataformas de Mobilidade ({state.platforms.length})
              </h2>
              <p className="text-xs text-slate-500">
                Catálogo multi-app transparente. O AIVAD não armazena senhas de terceiros nem automatiza cliques sem API oficial.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.platforms.map((pl) => (
                <Card key={pl.id} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <PlatformLogo platformId={pl.id} name={pl.name} size={36} />
                      <div>
                        <h3 className="text-base font-bold">{pl.name}</h3>
                        <p className="text-[11px] text-slate-500">
                          {pl.countryScope.join(', ')} · Comissão {pl.commissionPct}%
                        </p>
                      </div>
                    </div>
                    <StatusLabel tone="warning" text={pl.integrationLabel} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Categorias: {pl.categories.join(' · ')}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* PAGE: PLANOS */}
        {page === 'planos' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold">Planos AIVAD SaaS Core</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {state.plans.map((plan) => (
                <Card key={plan.id} className="p-6 flex flex-col justify-between gap-5">
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400">{plan.audience}</p>
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <div className="text-3xl font-extrabold font-mono-tabular">
                      €{plan.monthlyPriceEur.toFixed(2)}
                      <span className="text-xs font-normal text-slate-500"> / mês</span>
                    </div>
                    <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <Check className="w-3.5 h-3.5 text-blue-700 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnterDriver}
                    className="w-full py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
                  >
                    Entrar como Motorista
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* PAGE: DOWNLOADS / MULTIPLATAFORMA */}
        {page === 'downloads' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                Experiência Web, Android &amp; iOS Ready
              </h2>
              <p className="text-xs text-slate-500">
                Estado transparente de cada canal — sem botões falsos de lojas nem promessas de funcionalidades restritas pelo sistema operativo.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLATFORM_ADAPTERS.map((adapter, i) => (
                <Card key={i} className="p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                      {adapter.os}
                    </span>
                    <StatusLabel
                      tone={adapter.supportedNow ? 'success' : 'warning'}
                      text={adapter.integrationState}
                    />
                  </div>
                  <h3 className="text-sm font-bold">{adapter.capability}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{adapter.notes}</p>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.versions
                .filter((v) => v.status === 'Publicado' || v.status === 'Gradual')
                .map((ver) => (
                  <Card key={ver.id} className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">AIVAD {ver.channel} v{ver.version}</span>
                      <StatusLabel tone={ver.status === 'Publicado' ? 'success' : 'info'} text={`${ver.status} · ${ver.rolloutPct}%`} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{ver.notes}</p>
                    <p className="text-[11px] font-mono-tabular text-slate-500">
                      Build #{ver.buildNumber} · {ver.releaseDate}
                    </p>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* PAGE: TUTORIAIS & FAQ */}
        {page === 'tutoriais' && (
          <div className="space-y-6">
            <Card className="p-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                Guia Rápido do Motorista
              </h2>
              <p>1. Inicie turno no Registo de atividade TVDE e acompanhe a janela deslizante de 10h em 24h entre todas as apps.</p>
              <p>2. Configure o seu Cartão Flutuante e Estratégia (Manual / Semiautomático / Automático) antes de entrar na estrada.</p>
              <p>3. Consulte o AIVAD AI CORE para decisões contextualizadas e aprendizagem prevista vs real isolada da sua conta.</p>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqList.map((f) => (
                <Card key={f.id} className="p-5 space-y-1.5">
                  <h3 className="text-sm font-bold">{f.question}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{f.answer}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* PAGE: SEGURANÇA */}
        {page === 'seguranca' && (
          <Card className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <h2 className="text-2xl font-display font-bold">Segurança, Privacidade &amp; RBAC Estrito</h2>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3 max-w-3xl leading-relaxed">
              <p>
                O ambiente do motorista encontra-se completamente separado da consola administrativa: não existem botões nem atalhos administrativos dentro do AIVAD Driver, e acessos diretos via URL ao painel administrativo são bloqueados sem sessão autenticada com perfil autorizado.
              </p>
              <p>
                A aprendizagem do AIVAD AI CORE opera estritamente isolada por utilizador — nenhum rendimento financeiro ou histórico privado de um motorista é cruzado com outros utilizadores.
              </p>
            </div>
          </Card>
        )}

        {/* PAGE: CONTACTO */}
        {page === 'contacto' && (
          <Card className="p-6 sm:p-8 max-w-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <h2 className="text-2xl font-display font-bold">Contacto Comercial e Suporte</h2>
            </div>
            <p className="text-xs text-slate-500">
              Email CMS: <strong>{cms.contactEmail || 'suporte@aivad-ecosystem.local'}</strong> · Horário:{' '}
              <strong>{cms.supportHours || 'Seg–Sex · 09:00–19:00'}</strong>
            </p>
            {contactSent ? (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <StatusLabel tone="success" text="Pedido registado localmente (simulação)" />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Mensagem de {contactForm.name} validada. Para envio de email real, ligue o adaptador SMTP no backend Windsurf.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setContactSent(false);
                    setContactForm({ name: '', email: '', profile: 'Motorista TVDE', message: '' });
                  }}
                  className="text-xs font-semibold text-blue-700 dark:text-blue-400 underline"
                >
                  Enviar nova mensagem
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {contactError && <StatusLabel tone="danger" text={contactError} />}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="c-name" className="block text-xs font-medium mb-1">Nome completo</label>
                    <input
                      id="c-name"
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="c-email" className="block text-xs font-medium mb-1">Email</label>
                    <input
                      id="c-email"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="c-msg" className="block text-xs font-medium mb-1">Mensagem</label>
                  <textarea
                    id="c-msg"
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
                >
                  Enviar Pedido de Contacto
                </button>
              </form>
            )}
          </Card>
        )}
      </main>

      {/* Portal Authentication & Role Gateway Modal */}
      {authModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Autenticação de Acesso AIVAD"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4"
        >
          <Card className="w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl text-white ${authModalOpen === 'admin' ? 'bg-red-600' : 'bg-blue-700'}`}>
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Gateway de Autenticação RBAC
                  </p>
                  <h2 className="text-base font-bold">
                    {authModalOpen === 'admin' ? 'Entrar na Consola Administrativa' : 'Entrar no AIVAD Driver'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(null)}
                aria-label="Fechar janela de autenticação"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Auth Tabs: Conta Real vs Sandbox Demo */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('real');
                  setAuthError(null);
                }}
                className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
                  authTab === 'real'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Conta Real (Servidor)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('demo');
                  setAuthError(null);
                }}
                className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
                  authTab === 'demo'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Modo Demonstração
              </button>
            </div>

            {authError && <StatusLabel tone="danger" text={authError} />}

            {authTab === 'real' ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError(null);
                  setAuthBusy(true);
                  const res =
                    realMode === 'register' && authModalOpen === 'driver'
                      ? await registerRealAccount(authName, authEmail, authPassword, authRole)
                      : await loginWithServerCredentials(authEmail, authPassword);
                  setAuthBusy(false);
                  if (!res.ok) {
                    setAuthError(res.error ?? 'Falha de autenticação.');
                    return;
                  }
                  setAuthModalOpen(null);
                  setAuthPassword('');
                }}
                className="space-y-3 text-xs"
              >
                {authModalOpen === 'driver' && (
                  <div className="flex gap-3 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setRealMode('login')}
                      className={realMode === 'login' ? 'text-blue-700 underline' : 'text-slate-500'}
                    >
                      Entrar na minha conta
                    </button>
                    <button
                      type="button"
                      onClick={() => setRealMode('register')}
                      className={realMode === 'register' ? 'text-blue-700 underline' : 'text-slate-500'}
                    >
                      Criar conta real
                    </button>
                  </div>
                )}

                {realMode === 'register' && authModalOpen === 'driver' && (
                  <>
                    <div>
                      <label htmlFor="auth-real-name" className="block font-semibold mb-1">Nome completo</label>
                      <input
                        id="auth-real-name"
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Ex: João Ferreira"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-real-role" className="block font-semibold mb-1">Perfil de conta</label>
                      <select
                        id="auth-real-role"
                        value={authRole}
                        onChange={(e) => setAuthRole(e.target.value as 'Motorista' | 'Operador')}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        <option value="Motorista">Motorista TVDE</option>
                        <option value="Operador">Operador / Frota</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="auth-real-email" className="block font-semibold mb-1">Email</label>
                  <input
                    id="auth-real-email"
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="nome@dominio.pt"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label htmlFor="auth-real-pw" className="block font-semibold mb-1">Palavra-passe</label>
                  <input
                    id="auth-real-pw"
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                {authModalOpen === 'admin' && (
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 text-[11px] text-slate-600 dark:text-slate-300">
                    A consola administrativa valida credenciais no servidor Express (cookie HttpOnly + PBKDF2/scrypt + RBAC 401/403). Contas administrativas reais só podem ser provisionadas por variáveis de ambiente no servidor.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authBusy}
                  className={`w-full py-2.5 rounded-xl text-white font-semibold disabled:opacity-60 ${
                    authModalOpen === 'admin'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-700 hover:bg-blue-800'
                  }`}
                >
                  {authBusy
                    ? 'A autenticar no servidor...'
                    : realMode === 'register' && authModalOpen === 'driver'
                    ? 'Criar Conta Real e Entrar'
                    : authModalOpen === 'admin'
                    ? 'Entrar no AIVAD Management'
                    : 'Entrar no AIVAD Driver'}
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    O Modo Demonstração usa dados fictícios isolados no sandbox e nunca se mistura com contas reais ou estatísticas reais nos relatórios.
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={async () => {
                      setAuthBusy(true);
                      const res = await enterDemoSandbox('driver');
                      setAuthBusy(false);
                      if (!res.ok) setAuthError(res.error ?? 'Erro ao abrir sandbox.');
                      else setAuthModalOpen(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-left flex items-center justify-between"
                  >
                    <span>Explorar Sandbox · Motorista Demo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={async () => {
                      setAuthBusy(true);
                      const res = await enterDemoSandbox('admin');
                      setAuthBusy(false);
                      if (!res.ok) setAuthError(res.error ?? 'Erro ao abrir sandbox admin.');
                      else setAuthModalOpen(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-left flex items-center justify-between"
                  >
                    <span>Explorar Sandbox · Administração Demo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-8 px-4 sm:px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <PhoenixLogo size={20} />
            <span>{cms.brandTitle ?? 'AIVAD'} — Driver Intelligence &amp; Management Ecosystem · {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => setPortalPage('seguranca')} className="hover:text-slate-900 dark:hover:text-white">
              Segurança &amp; RGPD
            </button>
            <button type="button" onClick={() => setPortalPage('contacto')} className="hover:text-slate-900 dark:hover:text-white">
              Contacto
            </button>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Download className="w-3 h-3" /> Web PWA Ready
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
