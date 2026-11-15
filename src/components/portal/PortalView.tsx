import React, { useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Check,
  Compass,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Gauge,
  Globe,
  Layers,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useEcosystem } from '../../services/EcosystemContext';
import { PLATFORM_ADAPTERS } from '../../adapters/platformAdapters';
import { PlatformBadge } from '../ui/ChartsAndVisuals';
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
  { id: 'sobre', label: 'Sobre' },
  { id: 'solucoes', label: 'Soluções' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'aivad-driver', label: 'AIVAD Driver' },
  { id: 'aivad-management', label: 'AIVAD Management' },
  { id: 'web', label: 'Web' },
  { id: 'android', label: 'Android' },
  { id: 'ios', label: 'iOS' },
  { id: 'mercados', label: 'Mercados' },
  { id: 'plataformas', label: 'Plataformas' },
  { id: 'planos', label: 'Planos' },
  { id: 'precos', label: 'Preços' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'atualizacoes', label: 'Atualizações' },
  { id: 'tutoriais', label: 'Tutoriais' },
  { id: 'ajuda', label: 'Ajuda' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'privacidade', label: 'Privacidade' },
  { id: 'contacto', label: 'Contacto' },
];

const FEATURED_CAPABILITIES = [
  {
    id: 'tacografo',
    icon: Gauge,
    title: 'Tacógrafo TVDE Auditável',
    desc: '10 estados com validação de odómetro, eliminação de duplicação multi-app, fila offline e QR verificável.',
  },
  {
    id: 'calculadora',
    icon: Calculator,
    title: 'Calculadora Inteligente',
    desc: 'Avalia €/km, €/h, retorno vazio e custos reais por motorização antes de aceitar qualquer viagem.',
  },
  {
    id: 'financeiro',
    icon: Wallet,
    title: 'Gestão Financeira Real',
    desc: 'Cruza bruto, gorjetas reconciliadas, comissões, energia e despesas com preservação da moeda original.',
  },
  {
    id: 'planeador',
    icon: Compass,
    title: 'Planeador de Metas',
    desc: 'Recalcula horas produtivas, metas líquidas e paragens de carregamento EV conforme ritmo histórico.',
  },
  {
    id: 'relatorios',
    icon: FileSpreadsheet,
    title: 'Relatórios Multiformato',
    desc: 'Drill-down de mês até à viagem individual com exportação real em CSV, XLSX, PDF e PNG.',
  },
  {
    id: 'plataformas',
    icon: Layers,
    title: 'Gestão Multi-Plataforma',
    desc: 'Uber, Bolt, POP, VLOZ, Frenalty, Cabify, FREE NOW e novos parceiros unificados sem misturar regras.',
  },
  {
    id: 'internacional',
    icon: Globe,
    title: 'Adaptação Internacional',
    desc: 'Geolocalização, moedas, idiomas e métricas adaptados sem sobrescrever país de residência nem histórico.',
  },
  {
    id: 'inteligencia',
    icon: Sparkles,
    title: 'Inteligência Operacional',
    desc: 'Captura idempotente, assistente fundamentado nos dados reais e alertas legais validados.',
  },
];

export const PortalView: React.FC<{ onOpenLocationModal?: () => void }> = ({
  onOpenLocationModal,
}) => {
  const { state, availableMarketsForPortal, setMode, setPortalPage, toggleTheme } =
    useEcosystem();
  const page = state.activePortalPage;

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

  const pipelineMarkets = state.countries.filter((c) => c.marketStatus !== 'Disponível');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => setPortalPage('inicio')}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <PhoenixLogo size={28} />
            <span>AIVAD</span>
          </button>

          <nav aria-label="Navegação principal do portal" className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-300">
            {[
              ['funcionalidades', 'Funcionalidades'],
              ['mercados', 'Mercados'],
              ['plataformas', 'Plataformas'],
              ['planos', 'Planos'],
              ['downloads', 'Downloads'],
              ['contacto', 'Contacto'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPortalPage(id)}
                className={`hover:text-blue-700 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 ${
                  page === id ? 'text-blue-700 dark:text-blue-400 underline underline-offset-4' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenLocationModal && (
              <div className="hidden sm:block">
                <LocationPillButton onClick={onOpenLocationModal} />
              </div>
            )}
            <button
              type="button"
              onClick={() => setMode('driver')}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Abrir Modo Motorista
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Switcher */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
              Ambientes AIVAD:
            </span>
            <button
              type="button"
              onClick={() => setMode('portal')}
              className="px-2.5 py-1 rounded-md bg-blue-700 text-white text-xs font-medium whitespace-nowrap"
            >
              Site Oficial
            </button>
            <button
              type="button"
              onClick={() => setMode('driver')}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 whitespace-nowrap"
            >
              Modo Motorista
            </button>
            <button
              type="button"
              onClick={() => setMode('admin')}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-red-500 whitespace-nowrap"
            >
              Modo Administrador
            </button>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton />
            <ThemeToggleButton theme={state.theme} onToggle={toggleTheme} />
          </div>
        </div>
      </div>

      {/* Live CMS Announcement Banner */}
      {state.cms.showAnnouncement && (
        <div className="bg-blue-900 text-white text-xs py-2 px-4 text-center">
          <span className="font-medium">{state.cms.announcementBanner}</span>
          <span className="mx-2 opacity-50">·</span>
          <button
            type="button"
            onClick={() => setPortalPage('atualizacoes')}
            className="underline font-semibold hover:text-blue-200"
          >
            Ver notas de lançamento
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Clean 20-Page Portal Directory Strip */}
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

        {/* PAGE: INÍCIO */}
        {page === 'inicio' && (
          <div className="space-y-12">
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 tracking-wide">
                  AIVAD Driver Intelligence &amp; Management Ecosystem
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
                  {state.cms.heroTitle}
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {state.cms.heroSubtitle}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('driver')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors"
                  >
                    <span>Iniciar Modo Motorista</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('admin')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span>Consola Administrativa</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ecossistema internacional dinâmico e independente de plataformas de transporte · Sem promessa de ganhos garantidos.
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

            {/* Full-width 4-column summary strip reading LIVE state */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Tacógrafo &amp; Operação
                </span>
                <p className="text-xl font-bold font-mono-tabular text-blue-700 dark:text-blue-400">
                  10 Estados Auditáveis
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Jornada multi-app consolidada, fila offline e QR verificável.
                </p>
              </Card>
              <Card className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Mercados Disponíveis
                </span>
                <p className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white">
                  {availableMarketsForPortal.length} Países Disponíveis
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {availableMarketsForPortal.map((c) => c.name).join(', ')} (+{pipelineMarkets.length} em expansão).
                </p>
              </Card>
              <Card className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Plataformas Catalogadas
                </span>
                <p className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-white">
                  {state.platforms.length} Plataformas
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {state.platforms.map((p) => p.name).join(', ')}.
                </p>
              </Card>
              <Card className="p-5 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Conformidade Jurídica
                </span>
                <p className="text-xl font-bold font-mono-tabular text-red-600 dark:text-red-400">
                  {state.obligations.length} Normas Ativas
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Monitorização TVDE / VTC multi-país com validação jurídica humana.
                </p>
              </Card>
            </section>

            {/* Spotlight on 8 Key Ecosystem Capabilities */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-bold">8 Pilares Tecnológicos em Destaque</h2>
                  <p className="text-xs text-slate-500">
                    Todos interligados sob o mesmo motor central — sem módulos isolados nem dados duplicados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPortalPage('funcionalidades')}
                  className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Ver todas as funcionalidades →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>
        )}

        {/* PAGE: SOBRE */}
        {page === 'sobre' && (
          <Card className="p-6 sm:p-8 space-y-5">
            <h2 className="text-2xl font-bold">Sobre o Ecossistema AIVAD</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              O AIVAD foi desenhado como um ecossistema único e independente de plataformas de transporte: une aplicação diária de motorista, Tacógrafo TVDE auditável, painel administrativo central, conformidade regulatória e adaptadores nativos sob o mesmo motor de cálculo e eventos idempotentes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <p className="text-sm font-bold">Privacidade por Desenho</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Os administradores gerem planos, mercados e conformidade sem aceder automaticamente a dados financeiros privados dos motoristas sem consentimento explícito.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <p className="text-sm font-bold">Transparência de Integração</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Integrações externas sem API oficial exibem sempre a etiqueta INTEGRAÇÃO A VALIDAR — sem simulação de cliques nem armazenamento de senhas de terceiros.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <p className="text-sm font-bold">Internacionalização Real</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Suporta expansão mundial ilimitada de países, moedas, idiomas e regiões sem converter nem corromper transações históricas.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* PAGE: SOLUÇÕES & FUNCIONALIDADES */}
        {(page === 'solucoes' || page === 'funcionalidades') && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">
              {page === 'solucoes'
                ? 'Soluções AIVAD para Motoristas, Frotas & Operadores'
                : 'Funcionalidades Completas do Ecossistema'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* PAGE: AIVAD DRIVER & AIVAD MANAGEMENT */}
        {(page === 'aivad-driver' || page === 'aivad-management') && (
          <Card className="p-6 sm:p-8 space-y-5">
            <h2 className="text-2xl font-bold">
              {page === 'aivad-driver'
                ? 'AIVAD Driver — Aplicação Operacional Multi-Plataforma'
                : 'AIVAD Management — Consola Central de Gestão & Expansão'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              {page === 'aivad-driver'
                ? 'Inclui Dashboard com gráficos interativos, Tacógrafo TVDE independente com QR verificável, Calculadora de propostas, AutoPilot seguro, Smart Data Capture, Consolidado Multi-App, Financeiro, Planeador e Conformidade.'
                : 'Centraliza 26 módulos administrativos: Utilizadores, Frotas, Planos, Assinaturas, Pagamentos SaaS, Plataformas, Países e Mercados Dinâmicos, Legislação, CMS, Versões, Monitorização e Auditoria Imutável.'}
            </p>
            <button
              type="button"
              onClick={() => setMode(page === 'aivad-driver' ? 'driver' : 'admin')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
            >
              <span>
                {page === 'aivad-driver' ? 'Entrar no AIVAD Driver' : 'Abrir Consola Administrativa'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Card>
        )}

        {/* PAGES: ANDROID / IOS / WEB */}
        {(page === 'android' || page === 'ios' || page === 'web') && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-blue-700 dark:text-blue-400" />
              <h2 className="text-2xl font-bold">
                Arquitetura {page === 'android' ? 'AIVAD Android' : page === 'ios' ? 'AIVAD iOS Ready' : 'AIVAD Web & PWA'}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLATFORM_ADAPTERS.filter((a) =>
                page === 'android'
                  ? a.os === 'Android Native Bridge'
                  : page === 'ios'
                  ? a.os === 'iOS Apple Ready'
                  : a.os === 'Web / PWA'
              ).map((adapter, i) => (
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
          </div>
        )}

        {/* PAGE: MERCADOS (Lê EXCLUSIVAMENTE mercados com status Disponível) */}
        {page === 'mercados' && (
          <div className="space-y-6">
            <Card className="overflow-x-auto">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <div>
                    <h2 className="text-lg font-bold">
                      Mercados Disponíveis ({availableMarketsForPortal.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Lista sincronizada automaticamente com a Administração — apenas mercados marcados como &quot;Disponível&quot; constam como ativos ao público.
                    </p>
                  </div>
                </div>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">País</th>
                    <th className="p-3">Regiões / Cidades</th>
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

            {pipelineMarkets.length > 0 && (
              <Card className="p-5 space-y-3 text-xs">
                <h3 className="text-sm font-bold">
                  Mercados em Expansão / Validação ({pipelineMarkets.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {pipelineMarkets.map((c) => (
                    <div
                      key={c.code}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{c.name} ({c.code})</span>
                        <StatusLabel tone="warning" text={c.marketStatus} />
                      </div>
                      <p className="text-slate-500">
                        Moeda {c.currency} · {c.regions.flatMap((r) => r.cities).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* PAGE: PLATAFORMAS (Dinâmico do catálogo central) */}
        {page === 'plataformas' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">
                Plataformas de Mobilidade &amp; Estado das Integrações ({state.platforms.length})
              </h2>
              <p className="text-xs text-slate-500">
                Catálogo sincronizado dinamicamente com a administração. O AIVAD não armazena credenciais externas nem automatiza cliques sem API oficial autorizada.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.platforms.map((pl) => (
                <Card key={pl.id} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <PlatformBadge
                        name={pl.name}
                        shortCode={pl.shortCode}
                        brandColor={pl.brandColor}
                      />
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
                  {pl.requirements && pl.requirements.length > 0 && (
                    <p className="text-[11px] text-slate-500">
                      Requisitos: {pl.requirements[0]}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* PAGE: PLANOS & PREÇOS */}
        {(page === 'planos' || page === 'precos') && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">
                {page === 'precos' ? 'Preços Transparentes AIVAD SaaS Core' : 'Planos AIVAD SaaS Core'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sincronizados em tempo real com o painel administrativo.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {state.plans.map((plan) => (
                <Card key={plan.id} className="p-6 flex flex-col justify-between gap-5">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                        {plan.audience}
                      </p>
                      <h3 className="text-lg font-bold mt-1">{plan.name}</h3>
                    </div>
                    <div className="text-3xl font-extrabold font-mono-tabular">
                      €{plan.monthlyPriceEur.toFixed(2)}
                      <span className="text-xs font-normal text-slate-500"> / mês</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Anual: €{plan.annualPriceEur} · Até {plan.maxVehicles} veículo(s) · {plan.trialDays} dias teste
                    </p>
                    <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <Check className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('driver')}
                    className="w-full py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors"
                  >
                    Experimentar no Modo Motorista
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* PAGES: DOWNLOADS & ATUALIZAÇÕES */}
        {(page === 'downloads' || page === 'atualizacoes') && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">
              {page === 'downloads' ? 'Área Oficial de Downloads & Versões' : 'Publicações & Notas de Lançamento (CMS)'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.versions
                .filter((v) => v.status === 'Publicado' || v.status === 'Gradual')
                .map((ver) => (
                  <Card key={ver.id} className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">
                        AIVAD {ver.channel} v{ver.version}
                      </span>
                      <StatusLabel
                        tone={ver.status === 'Publicado' ? 'success' : 'info'}
                        text={`${ver.status} · ${ver.rolloutPct}%`}
                      />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{ver.notes}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      <span>Build #{ver.buildNumber} · {ver.releaseDate}</span>
                      <button
                        type="button"
                        onClick={() => setMode('driver')}
                        className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{ver.channel === 'Web' ? 'Abrir Web App' : 'Ver Requisitos'}</span>
                      </button>
                    </div>
                  </Card>
                ))}
            </div>

            <Card className="p-5 space-y-3">
              <h3 className="text-base font-bold">Comunicados Publicados pelo Administrador</h3>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {state.cms.publications
                  .filter((p) => p.status === 'Publicado')
                  .map((pub) => (
                    <div key={pub.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{pub.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{pub.summary}</p>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {pub.category} · {pub.publishedAt}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        )}

        {/* PAGES: TUTORIAIS, AJUDA, SEGURANÇA, PRIVACIDADE */}
        {(page === 'tutoriais' ||
          page === 'ajuda' ||
          page === 'seguranca' ||
          page === 'privacidade') && (
          <Card className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5">
              {page === 'seguranca' ? (
                <ShieldCheck className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              ) : page === 'privacidade' ? (
                <Lock className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              ) : (
                <ExternalLink className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              )}
              <h2 className="text-2xl font-bold capitalize">{page}</h2>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3 max-w-3xl leading-relaxed">
              {page === 'tutoriais' && (
                <>
                  <p>1. Inicie o turno no <strong>AIVAD TACÓGRAFO TVDE</strong> com odómetro válido e troque estados de condução, pausa e descanso sem duplicar tempo entre apps.</p>
                  <p>2. Configure o seu veículo e limiares na Calculadora de Propostas e consulte o Consolidado Multi-App.</p>
                  <p>3. Exporte relatórios com código QR verificável, XLSX verdadeiro, CSV ou PDF.</p>
                </>
              )}
              {page === 'ajuda' && (
                <p>
                  Cada indicador no AIVAD possui um botão de ajuda contextual (?) que explica o que mede e a fórmula exata aplicada. Para suporte técnico, aceda a Comunicação e Suporte no Modo Motorista.
                </p>
              )}
              {page === 'seguranca' && (
                <p>
                  O ecossistema aplica controlo de acesso baseado em funções (RBAC) com 7 perfis administrativos, auditoria imutável de ações críticas, separação estrita de ambientes e nenhuma chave privada armazenada no frontend.
                </p>
              )}
              {page === 'privacidade' && (
                <p>
                  Conformidade RGPD: dados financeiros e operacionais do motorista são privados por defeito. Administradores não visualizam detalhes financeiros individuais sem autorização explícita e fundamento operacional.
                </p>
              )}
            </div>
          </Card>
        )}

        {/* PAGE: CONTACTO */}
        {page === 'contacto' && (
          <Card className="p-6 sm:p-8 max-w-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <h2 className="text-2xl font-bold">Contacto Comercial e Institucional</h2>
            </div>
            {contactSent ? (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <StatusLabel tone="success" text="Pedido registado com sucesso (simulação local)" />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  A sua mensagem de {contactForm.name} ({contactForm.email}) foi validada. Para envio real de correio eletrónico, ligue o adaptador SMTP/CRM no backend.
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
                      placeholder="Ex: João Almeida"
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
                      placeholder="nome@empresa.pt"
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
                    placeholder="Descreva a sua necessidade comercial, frota ou integração..."
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

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-8 px-4 sm:px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <PhoenixLogo size={20} />
            <span>AIVAD — Driver Intelligence &amp; Management Ecosystem · 2026</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => setPortalPage('seguranca')} className="hover:text-slate-900 dark:hover:text-white">
              Segurança
            </button>
            <button type="button" onClick={() => setPortalPage('privacidade')} className="hover:text-slate-900 dark:hover:text-white">
              Privacidade &amp; RGPD
            </button>
            <button type="button" onClick={() => setPortalPage('ajuda')} className="hover:text-slate-900 dark:hover:text-white">
              Ajuda
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
