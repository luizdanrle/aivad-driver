import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Car,
  Check,
  ChevronDown,
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
  MapPin,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  UserCheck,
  Volume2,
  Wallet,
  X,
} from 'lucide-react';
import { PLATFORM_ADAPTERS } from '../../adapters/platformAdapters';
import { analyzeProposalWithAiCore } from '../../core/aiCore';
import {
  getPlatformOperationInLocation,
  getValidatedPlatformsForLocation,
  groupCountriesByCatalogTier,
} from '../../core/marketCatalog';
import { canAccessMode } from '../../core/rbac';
import type { ProposalInput } from '../../models/types';
import { useEcosystem } from '../../services/EcosystemContext';
import { DynamicFloatingProposalCard, PlatformLogo } from '../ui/ChartsAndVisuals';
import {
  Badge,
  Button,
  Card,
  PhoenixLogo,
  PWAInstallButton,
  SegmentedFilter,
  StatusLabel,
  ThemeToggleButton,
} from '../ui/DesignSystem';
import { LocationPillButton } from '../ui/LocalizationModal';

const PORTAL_PAGES = [
  { id: 'inicio', label: 'Início' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'mercados', label: 'Mercados' },
  { id: 'plataformas', label: 'Plataformas' },
  { id: 'planos', label: 'Planos & Preços' },
  { id: 'downloads', label: 'Web & Mobile' },
  { id: 'tutoriais', label: 'Tutoriais & FAQ' },
  { id: 'seguranca', label: 'Segurança & RGPD' },
  { id: 'contacto', label: 'Contacto' },
];

type ShowcaseModuleId =
  | 'propostas'
  | 'cartao'
  | 'autopilot'
  | 'zonas'
  | 'financeiro'
  | 'tacografo'
  | 'voz'
  | 'veiculos';

interface InteractiveShowcaseItem {
  id: ShowcaseModuleId;
  number: string;
  label: string;
  title: string;
  userGoal: string;
  howItWorks: string;
  measurableBenefit: string;
  statusText: string;
  icon: React.ComponentType<{ className?: string }>;
  previewMetrics: Array<{ label: string; value: string; accent?: string }>;
  liveHighlight: string;
}

const INTERACTIVE_SHOWCASE_ITEMS: InteractiveShowcaseItem[] = [
  {
    id: 'propostas',
    number: '01',
    label: 'Análise de Propostas',
    title: 'Avaliação instantânea de lucro líquido real antes de aceitar',
    userGoal: 'Saber em menos de 2 segundos se uma oferta paga os custos reais de recolha, energia e tempo.',
    howItWorks:
      'Calcula €/km total (recolha + viagem), €/hora produtivo, comissão da app, desgaste da viatura ativa e probabilidade histórica de retorno com passageiro.',
    measurableBenefit: 'Elimina viagens deficitárias ocultas por tarifas brutas aparentes.',
    statusText: 'Operacional Real',
    icon: Calculator,
    previewMetrics: [
      { label: 'Tarifa Bruta', value: '€16,80' },
      { label: 'Rentabilidade', value: '€1,46/km · €32/h', accent: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Líquido Real', value: '€11,94', accent: 'text-blue-700 dark:text-blue-400' },
      { label: 'Retorno c/ Passageiro', value: '78% (Histórico)' },
    ],
    liveHighlight: 'Inclui recolha em vazio (1,4 km) + energia EV/combustível + manutenção por km.',
  },
  {
    id: 'cartao',
    number: '02',
    label: 'Cartão de Decisão',
    title: 'Semáforo Verde, Amarelo e Vermelho adaptável à condução diurna ou noturna',
    userGoal: 'Ler apenas os indicadores essenciais com contraste limpo sob sol direto ou turno noturno.',
    howItWorks:
      'Permite ordenar métricas (€/km, €/h, Líquido, Score IA), alternar entre modo Compacto e Expandido e simular perfis antes de aplicar.',
    measurableBenefit: 'Leitura visual clara com alvos de toque >= 46px preparados para suporte de tablier.',
    statusText: 'Intra-App Operacional · Overlay Android preparado',
    icon: Smartphone,
    previewMetrics: [
      { label: 'Classificação', value: 'VERDE · FAVORÁVEL', accent: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Perfis Visuais', value: 'Urbano · Aeroporto · Noturno' },
      { label: 'Alvos de Toque', value: '46px Ergonomia Auto' },
      { label: 'Modo Compacto', value: '1 Toque para Expandir' },
    ],
    liveHighlight: 'Adapta-se automaticamente ao modo Claro e Escuro sem cartões pretos ilegíveis.',
  },
  {
    id: 'autopilot',
    number: '03',
    label: 'AutoPilot (3 Modos)',
    title: 'Manual, Semiautomático com reversão e Automático sob canal autorizado',
    userGoal: 'Manter disciplina rigorosa sobre mínimos de €/km, €/hora e distância máxima de recolha.',
    howItWorks:
      'Avalia cada proposta contra os seus limiares pessoais, sugere calibrações graduais auditáveis e nunca executa ações ilegais sem permissão oficial.',
    measurableBenefit: 'Consistência de margem em horas de ponta e turnos de menor procura.',
    statusText: 'Motor 3 Modos Operacional',
    icon: Sliders,
    previewMetrics: [
      { label: 'Mínimo €/km', value: '€0,95 / km', accent: 'text-blue-700 dark:text-blue-400' },
      { label: 'Mínimo €/hora', value: '€22,00 / h', accent: 'text-blue-700 dark:text-blue-400' },
      { label: 'Recolha Máx.', value: '3,5 km' },
      { label: 'Reserva EV', value: '18% Bateria Mín.' },
    ],
    liveHighlight: 'Inclui botão "Reverter Ajuste" para desfazer qualquer calibração semiautomática.',
  },
  {
    id: 'zonas',
    number: '04',
    label: 'Inteligência de Zonas',
    title: 'Radar de procura, restrições horárias e pontos seguros de recolha',
    userGoal: 'Evitar coimas em zonas condicionadas (Kiss & Fly, faixas BUS, eventos) e reduzir km vazios.',
    howItWorks:
      'Cruza histórico de rentabilidade por zona com alertas de paragem condicionada e sugere pontos alternativos a poucos metros a pé.',
    measurableBenefit: 'Recolhas mais rápidas e seguras com abertura direta no Waze ou Google Maps.',
    statusText: 'Operacional com Observações de Terreno',
    icon: MapPin,
    previewMetrics: [
      { label: 'Zona Ativa', value: 'Aeroporto · Kiss & Fly' },
      { label: 'Alerta Local', value: 'Limite 10 min ativo', accent: 'text-amber-600 dark:text-amber-400' },
      { label: 'Alternativa Segura', value: 'Parque P2 (140m · 2 min)', accent: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Navegação', value: '1-Click Waze / Maps' },
    ],
    liveHighlight: 'Os alertas de zona aparecem automaticamente dentro do Cartão Flutuante antes de aceitar.',
  },
  {
    id: 'financeiro',
    number: '05',
    label: 'Gestão Financeira',
    title: 'Lucro líquido verdadeiro com fórmulas abertas e 9 sub-relatórios exportáveis',
    userGoal: 'Distinguir faturação bruta do dinheiro real que fica após comissões, energia, aluguer e despesas.',
    howItWorks:
      'Exclui viagens canceladas sem compensação, deduz TCO/energia e explica cada valor através do modal "Como foi calculado?".',
    measurableBenefit: 'Exportação limpa em CSV, Excel (XLSX), PDF e PNG isolando dados reais de simulações.',
    statusText: 'Operacional + Exportação Multiformato',
    icon: Wallet,
    previewMetrics: [
      { label: 'Receita Bruta', value: '€1.180,00' },
      { label: 'Comissões & Energia', value: '-€342,50', accent: 'text-rose-600 dark:text-rose-400' },
      { label: 'Líquido Apurado', value: '€837,50', accent: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Exportação', value: 'CSV · XLSX · PDF · PNG' },
    ],
    liveHighlight: 'Todos os indicadores apresentam a fórmula matemática e as entradas reais consideradas.',
  },
  {
    id: 'tacografo',
    number: '06',
    label: 'Tacógrafo TVDE',
    title: 'Controlo legal de 10h em janela deslizante de 24h entre múltiplas plataformas',
    userGoal: 'Cumprir a Portaria n.º 7/2022 e Lei 45/2018 somando condução e trabalho entre Uber, Bolt e outras apps.',
    howItWorks:
      'Regista os 10 estados oficiais com validação de odómetro, guarda eventos em fila offline sem rede e gera Código QR verificável.',
    measurableBenefit: 'Avisos preventivos às 8h (480m) e 9h (540m) antes de atingir o limite legal de 10h.',
    statusText: 'Operacional Online/Offline + QR',
    icon: Gauge,
    previewMetrics: [
      { label: 'Janela 24h', value: '06h 40m / 10h 00m', accent: 'text-blue-700 dark:text-blue-400' },
      { label: 'Margem Legal', value: 'Restam 3h 20m', accent: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Estados Oficiais', value: '10 Estados Validados' },
      { label: 'Auditoria', value: 'QR Verificável PNG' },
    ],
    liveHighlight: 'Inclui nota regulamentar transparente sobre equipamentos homologados.',
  },
  {
    id: 'voz',
    number: '07',
    label: 'Copiloto por Voz',
    title: 'Leitura vocal mãos-livres gratuita com fila de prioridade e anti-repetição',
    userGoal: 'Ouvir o resumo da proposta e alertas críticos sem desviar o olhar do trânsito.',
    howItWorks:
      'Usa síntese nativa Web Speech API sem custos de subscrição, priorizando alertas urgentes e bloqueando avisos repetidos.',
    measurableBenefit: 'Condução mais segura com coordenação automática entre áudio e aviso visual.',
    statusText: 'Operacional Web/PWA (Gratuito)',
    icon: Volume2,
    previewMetrics: [
      { label: 'Custo de API', value: '€0,00 (Web Speech)', accent: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Anti-Repetição', value: 'Cooldown Configurável' },
      { label: 'Idiomas', value: 'PT-PT · PT-BR · EN · ES' },
      { label: 'Fallback', value: 'Banner Visual Ativo' },
    ],
    liveHighlight: '"Sinal verde. UberX 18,50 euros, 1,78 por km, 42 por hora. Recomendação: aceitar."',
  },
  {
    id: 'veiculos',
    number: '08',
    label: 'Gestão de Veículos',
    title: 'Autonomia WLTP vs Real, tarifas de carregamento EV e comparador TCO',
    userGoal: 'Calcular o verdadeiro custo energético por km e comparar viaturas elétricas, híbridas ou GPL.',
    howItWorks:
      'Cruza consumo real com tarifa Casa, Mista ou Rápido Público, valida elegibilidade legal por país e alimenta a Calculadora.',
    measurableBenefit: 'Protege a reserva mínima de bateria e revela qual veículo gera maior lucro mensal.',
    statusText: 'Operacional com Comparador',
    icon: Car,
    previewMetrics: [
      { label: 'Autonomia WLTP / Real', value: '420 km / 345 km' },
      { label: 'Custo Energia Casa', value: '€0,026 / km', accent: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Custo Rápido Público', value: '€0,078 / km', accent: 'text-amber-600 dark:text-amber-400' },
      { label: 'Elegibilidade PT', value: 'Conforme (≤ 7 anos)' },
    ],
    liveHighlight: 'Mudar a tarifa de carregamento atualiza instantaneamente a margem líquida das propostas.',
  },
];

export const PortalView: React.FC<{ onOpenLocationModal?: () => void }> = ({
  onOpenLocationModal,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const {
    state,
    activeMarket,
    activeVehicle,
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
  const accentColor = cms.accentColor || '#E11D48';

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

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [portalLang, setPortalLang] = useState<string>('pt-PT');
  const [heroScenario, setHeroScenario] = useState<'verde' | 'amarelo' | 'vermelho'>('verde');
  const [activeShowcaseId, setActiveShowcaseId] = useState<ShowcaseModuleId>('propostas');
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const [platformCountryFilter, setPlatformCountryFilter] = useState<string>(
    state.localization.selectedMarketCode || 'PT'
  );
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

  // Live Interactive Hero Proposal Calculation using real AI Core engine
  const heroProposalInput = useMemo<ProposalInput>(() => {
    const city =
      state.localization.currentLocation.countryCode === activeMarket.code &&
      state.localization.currentLocation.city
        ? state.localization.currentLocation.city
        : activeMarket.regions[0]?.cities[0] ?? 'Lisboa';
    if (heroScenario === 'verde') {
      return {
        platformId: 'uber',
        category: 'Uber Comfort',
        grossValueEur: 18.4,
        pickupDistanceKm: 1.1,
        pickupTimeMin: 4,
        tripDistanceKm: 9.3,
        tripTimeMin: 16,
        stops: 0,
        tollsEur: 0,
        bonusEur: 0,
        region: `${city} Centro → Aeroporto`,
        pickupAddress: `Av. da Liberdade, ${city}`,
        destinationAddress: `Aeroporto Internacional (${city})`,
        vehicleCostPerKmEur: 0.11,
        calculationBasis: 'total_distance',
        mode: 'Equilibrado',
      };
    }
    if (heroScenario === 'amarelo') {
      return {
        platformId: 'bolt',
        category: 'Bolt Standard',
        grossValueEur: 9.4,
        pickupDistanceKm: 2.2,
        pickupTimeMin: 6,
        tripDistanceKm: 8.6,
        tripTimeMin: 18,
        stops: 0,
        tollsEur: 0,
        bonusEur: 0,
        region: `${city} · Zona Intermédia`,
        pickupAddress: ` Marquês de Pombal, ${city}`,
        destinationAddress: `Alfragide Zona Comercial`,
        vehicleCostPerKmEur: 0.11,
        calculationBasis: 'total_distance',
        mode: 'Equilibrado',
      };
    }
    return {
      platformId: 'uber',
      category: 'UberX',
      grossValueEur: 4.3,
      pickupDistanceKm: 4.8,
      pickupTimeMin: 12,
      tripDistanceKm: 5.4,
      tripTimeMin: 17,
      stops: 1,
      tollsEur: 0,
      bonusEur: 0,
      region: 'Periferia Distante (Risco Retorno Vazio)',
      pickupAddress: 'Zona Industrial Periférica',
      destinationAddress: 'Subúrbio Residencial s/ Procura',
      vehicleCostPerKmEur: 0.11,
      calculationBasis: 'total_distance',
      mode: 'Equilibrado',
    };
  }, [heroScenario, state.localization.currentLocation.city]);

  const heroAiDecision = useMemo(
    () =>
      analyzeProposalWithAiCore({
        input: heroProposalInput,
        autoPilot: state.autoPilot,
        activeVehicle,
        tachograph: state.tachograph,
        zones: state.zones,
        savedPlaces: state.savedPlaces,
        routine: state.routinePreferences,
      }),
    [
      heroProposalInput,
      state.autoPilot,
      activeVehicle,
      state.tachograph,
      state.zones,
      state.savedPlaces,
      state.routinePreferences,
    ]
  );

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !contactForm.name.trim() ||
      !contactForm.email.includes('@') ||
      contactForm.message.trim().length < 10
    ) {
      setContactError(
        'Preencha o nome, um email válido e uma mensagem com pelo menos 10 caracteres.'
      );
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

  const handleQuickDemoDriver = async () => {
    if (canAccessMode(state.session, 'driver')) {
      setMode('driver');
      return;
    }
    setAuthBusy(true);
    const res = await enterDemoSandbox('driver');
    setAuthBusy(false);
    if (!res.ok) {
      setAuthError(res.error ?? 'Não foi possível iniciar demonstração.');
      setAuthTab('demo');
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
  const tieredMarkets = groupCountriesByCatalogTier(state.countries);
  const benefitsList = cms.benefits ?? [];
  const faqList = cms.faqs ?? [];
  const localized = cms.localizedContent?.[portalLang];
  const effectiveHeroTitle = localized?.heroTitle || cms.heroTitle;
  const effectiveHeroSubtitle = localized?.heroSubtitle || cms.heroSubtitle;
  const effectiveBrandTagline =
    localized?.brandTagline || cms.brandTagline || 'Inteligência Operacional para Mobilidade TVDE';
  const effectiveAnnouncement = localized?.announcementBanner || cms.announcementBanner;
  const activeNavMenus =
    cms.navigationMenus && cms.navigationMenus.length > 0
      ? [...cms.navigationMenus].filter((m) => m.visible).sort((a, b) => a.order - b.order)
      : [
          { id: 'mn-func', label: 'Funcionalidades', pageId: 'funcionalidades', visible: true, order: 1 },
          { id: 'mn-merc', label: 'Mercados', pageId: 'mercados', visible: true, order: 2 },
          { id: 'mn-plat', label: 'Plataformas', pageId: 'plataformas', visible: true, order: 3 },
          { id: 'mn-plan', label: 'Planos', pageId: 'planos', visible: true, order: 4 },
          { id: 'mn-cont', label: 'Contacto', pageId: 'contacto', visible: true, order: 5 },
        ];
  const customPageBlock = cms.pagesContent?.[page];
  const activeShowcase =
    INTERACTIVE_SHOWCASE_ITEMS.find((i) => i.id === activeShowcaseId) ??
    INTERACTIVE_SHOWCASE_ITEMS[0];

  return (
    <div className="min-h-screen aivad-canvas-bg text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-[#1E2D4A] bg-white/92 dark:bg-[#080E1C]/92 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single Brand Wordmark */}
          <button
            type="button"
            onClick={() => setPortalPage('inicio')}
            className="flex items-center gap-2.5 text-lg font-display font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PhoenixLogo size={30} />
            <span>{cms.brandTitle ?? 'AIVAD'}</span>
          </button>

          {/* Zone 2: 5 Concise Single-Line Navigation Links */}
          <nav
            aria-label="Navegação principal do portal"
            className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            {activeNavMenus.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPortalPage(item.pageId)}
                className={`py-1 hover:text-blue-700 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  page === item.pageId
                    ? 'text-blue-700 dark:text-blue-400 underline decoration-2 underline-offset-8'
                    : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary Action (+ Mobile Menu Button on <lg) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleEnterDriver}
              style={{ backgroundColor: primaryColor }}
              className="min-h-[40px] px-4 py-2 rounded-xl hover:opacity-95 text-white text-xs sm:text-sm font-bold transition-opacity whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
            >
              {cms.heroCtaDriverLabel || 'Entrar como Motorista'}
            </button>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Abrir menu do portal"
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36]"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 lg:hidden flex justify-end bg-slate-950/60 backdrop-blur-xs"
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-80 max-w-[88vw] h-full bg-white dark:bg-[#0F182B] border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-6 overflow-y-auto"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="font-display font-extrabold text-base flex items-center gap-2">
                    <PhoenixLogo size={24} />
                    <span>{cms.brandTitle ?? 'AIVAD'}</span>
                  </span>
                  <button
                    type="button"
                    aria-label="Fechar menu do portal"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  {PORTAL_PAGES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPortalPage(p.id);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-left text-sm font-semibold transition-colors ${
                        page === p.id
                          ? 'bg-blue-700 text-white'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <ThemeToggleButton theme={state.theme} onToggle={toggleTheme} />
                  {onOpenLocationModal && <LocationPillButton onClick={onOpenLocationModal} />}
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    handleEnterDriver();
                  }}
                >
                  Aceder ao AIVAD Driver
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    handleEnterAdmin();
                  }}
                  icon={<Lock className="w-3.5 h-3.5 text-rose-600" />}
                >
                  AIVAD Management
                </Button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secondary Workspace Utility Bar (Session, Theme, Market & Language) */}
      <div className="border-b border-slate-200/80 dark:border-[#1E2D4A] bg-white/65 dark:bg-[#0F182B]/75 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {state.session.authenticated ? (
              <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{state.session.userName}</span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="font-bold text-blue-700 dark:text-blue-400">{state.session.role}</span>
                {state.session.isDemoSession && (
                  <span className="text-amber-700 dark:text-amber-300 font-semibold">· Sandbox Demo</span>
                )}
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                Ecossistema Operacional Independente · Web, PWA, Android &amp; iOS Ready
              </span>
            )}
            <span aria-hidden="true" className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={() => {
                setAuthError(null);
                setAuthTab('real');
                setAuthModalOpen('driver');
              }}
              className="font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Acesso Motorista
            </button>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <button
              type="button"
              onClick={() => {
                setAuthError(null);
                setAuthTab('real');
                handleEnterAdmin();
              }}
              className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
            >
              <Lock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>Acesso Administrativo</span>
            </button>
            {state.session.authenticated && (
              <button
                type="button"
                onClick={logoutSession}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 cursor-pointer ml-1"
              >
                <LogOut className="w-3 h-3" />
                <span>Sair</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenLocationModal && (
              <div className="hidden sm:block">
                <LocationPillButton onClick={onOpenLocationModal} />
              </div>
            )}
            <select
              aria-label="Idioma do portal público"
              value={portalLang}
              onChange={(e) => setPortalLang(e.target.value)}
              className="min-h-[34px] px-2.5 py-1 rounded-xl bg-white dark:bg-[#131F36] border border-slate-200 dark:border-slate-700 text-xs font-mono-tabular font-semibold cursor-pointer"
            >
              {(cms.supportedLanguages ?? ['pt-PT', 'en-GB', 'es-ES']).map((lng) => (
                <option key={lng} value={lng}>
                  {lng.toUpperCase()}
                </option>
              ))}
            </select>
            <ThemeToggleButton theme={state.theme} onToggle={toggleTheme} />
            <PWAInstallButton />
          </div>
        </div>
      </div>

      {/* RBAC Guard Banner if redirected */}
      {state.rbacDeniedMessage && (
        <div className="bg-rose-600 text-white px-4 py-3 text-xs">
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
                className="px-3 py-1 rounded-lg bg-white text-rose-700 font-bold cursor-pointer"
              >
                Autenticar Admin
              </button>
              <button
                type="button"
                onClick={clearRbacDenied}
                aria-label="Dispensar aviso RBAC"
                className="p-1 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live CMS Announcement Banner */}
      {cms.showAnnouncement && (
        <div
          style={{ backgroundColor: primaryColor }}
          className="text-white text-xs py-2 px-4 text-center"
        >
          <span className="font-medium">{effectiveAnnouncement}</span>
          <span className="mx-2 opacity-60">·</span>
          <button
            type="button"
            onClick={() => setPortalPage('downloads')}
            className="underline font-bold hover:opacity-85 cursor-pointer"
          >
            Ver estado multiplataforma
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-12">
        {/* Sub-page Directory Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200/80 dark:border-[#1E2D4A]">
          {PORTAL_PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPortalPage(p.id)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                page === p.id
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#131F36]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {customPageBlock && page !== 'inicio' && (
          <Card variant="tinted-blue" className="p-5 space-y-1.5">
            <h1 className="text-xl font-display font-extrabold">{customPageBlock.title}</h1>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              {customPageBlock.subtitle}
            </p>
            {customPageBlock.body && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                {customPageBlock.body}
              </p>
            )}
          </Card>
        )}

        <AnimatePresence mode="wait">
          {/* PAGE: INÍCIO */}
          {page === 'inicio' && (
            <motion.div
              key="portal-inicio"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-16"
            >
              {sectionOrder.map((secId) => {
                if (!visibleSections[secId]) return null;

                if (secId === 'hero') {
                  return (
                    <div key="hero" className="space-y-14">
                      {/* 1. IMPACTFUL INTERACTIVE HERO */}
                      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <span style={{ color: accentColor }} className="font-bold">
                              {effectiveBrandTagline}
                            </span>
                            <span aria-hidden="true" className="text-slate-400">·</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {activeMarket.name} ({activeMarket.currency})
                            </span>
                          </div>

                          <h1 className="text-3xl sm:text-4xl lg:text-[2.9rem] font-display font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12] [text-wrap:balance]">
                            {effectiveHeroTitle}
                          </h1>

                          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                            {effectiveHeroSubtitle}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <Button
                              variant="primary"
                              size="lg"
                              onClick={handleEnterDriver}
                              style={{ backgroundColor: primaryColor }}
                              rightIcon={<ArrowRight className="w-4 h-4" />}
                            >
                              {cms.heroCtaDriverLabel || 'Entrar no AIVAD Driver'}
                            </Button>

                            <Button
                              variant="secondary"
                              size="lg"
                              disabled={authBusy}
                              onClick={() => void handleQuickDemoDriver()}
                              icon={<Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                            >
                              {authBusy ? 'A abrir Sandbox...' : 'Explorar Demonstração Ao Vivo'}
                            </Button>
                          </div>

                          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <p className="text-lg sm:text-xl font-display font-extrabold font-mono-tabular text-blue-700 dark:text-blue-400">
                                8 Agentes IA
                              </p>
                              <p className="text-slate-500 dark:text-slate-400">
                                Aprendizagem isolada por motorista
                              </p>
                            </div>
                            <div>
                              <p className="text-lg sm:text-xl font-display font-extrabold font-mono-tabular text-emerald-600 dark:text-emerald-400">
                                10h / 24h
                              </p>
                              <p className="text-slate-500 dark:text-slate-400">
                                Janela legal multi-app + QR
                              </p>
                            </div>
                            <div>
                              <p className="text-lg sm:text-xl font-display font-extrabold font-mono-tabular text-rose-600 dark:text-rose-400">
                                {tieredMarkets.officiallyActive.length} Mercados
                              </p>
                              <p className="text-slate-500 dark:text-slate-400">
                                Plataformas validadas por país
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Live Interactive Product Preview Card */}
                        <div className="lg:col-span-6 flex">
                          <Card
                            variant="elevated"
                            className="w-full p-4 sm:p-6 flex flex-col justify-between gap-4 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/70 dark:from-[#0F182B] dark:via-[#131F36] dark:to-[#172540]"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                                  Simulador Interativo em Tempo Real
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Clique num cenário abaixo para ver o AIVAD calcular a decisão:
                                </p>
                              </div>
                              <SegmentedFilter
                                value={heroScenario}
                                onChange={(v) => setHeroScenario(v as 'verde' | 'amarelo' | 'vermelho')}
                                options={[
                                  { id: 'verde', label: 'Verde · €18,40' },
                                  { id: 'amarelo', label: 'Amarelo · €9,40' },
                                  { id: 'vermelho', label: 'Vermelho · €4,30' },
                                ]}
                              />
                            </div>

                            <DynamicFloatingProposalCard
                              overlayConfig={{
                                ...state.overlayConfig,
                                layoutMode: 'expandido',
                                widthPercent: 100,
                              }}
                              proposalInput={heroProposalInput}
                              analysis={heroAiDecision.analysis}
                              recommendedAction={heroAiDecision.recommendedAction}
                              confidencePct={heroAiDecision.confidencePct}
                              confidenceStatus={heroAiDecision.confidenceStatus}
                              onAccept={handleEnterDriver}
                            />

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                              <span>
                                Motor ativo: <strong>AIVAD AI CORE</strong> · Custo viatura incluído (€0,11/km)
                              </span>
                              <button
                                type="button"
                                onClick={() => setPortalPage('funcionalidades')}
                                className="font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                Ver os 8 módulos em detalhe →
                              </button>
                            </div>
                          </Card>
                        </div>
                      </section>

                      {/* 2. INTERACTIVE 8-MODULE VISUAL SHOWCASE (COMANDO 6.1 §3) */}
                      <section className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                              Como o AIVAD funciona na prática
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white">
                              Oito motores integrados para cada minuto do seu turno
                            </h2>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
                            Selecione qualquer área para ver o objetivo, o mecanismo em tempo real e o ganho concreto na operação.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                          {INTERACTIVE_SHOWCASE_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const active = item.id === activeShowcaseId;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setActiveShowcaseId(item.id)}
                                className={`min-h-[68px] p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                                  active
                                    ? 'bg-blue-700 text-white border-blue-700 shadow-md'
                                    : 'bg-white dark:bg-[#0F182B] border-slate-200 dark:border-[#1E2D4A] text-slate-700 dark:text-slate-200 hover:border-blue-400'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-[10px] font-mono-tabular font-bold ${active ? 'text-blue-200' : 'text-slate-400'}`}>
                                    {item.number}.
                                  </span>
                                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-blue-700 dark:text-blue-400'}`} />
                                </div>
                                <span className="text-xs font-bold leading-tight">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeShowcase.id}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <Card className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                              <div className="lg:col-span-7 space-y-4">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                                    {activeShowcase.number}. {activeShowcase.label}
                                  </span>
                                  <span aria-hidden="true" className="text-slate-400">·</span>
                                  <StatusLabel tone="success" text={activeShowcase.statusText} />
                                </div>

                                <h3 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-white">
                                  {activeShowcase.title}
                                </h3>

                                <div className="space-y-2.5 text-xs sm:text-sm">
                                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                                    <strong className="text-slate-900 dark:text-white">Quando utilizar: </strong>
                                    {activeShowcase.userGoal}
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                    <strong className="text-slate-900 dark:text-white">Como funciona: </strong>
                                    {activeShowcase.howItWorks}
                                  </p>
                                  <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                    Resultado prático: {activeShowcase.measurableBenefit}
                                  </p>
                                </div>

                                <div className="pt-2 flex flex-wrap gap-3">
                                  <Button
                                    variant="primary"
                                    size="md"
                                    onClick={() => void handleQuickDemoDriver()}
                                    rightIcon={<ArrowRight className="w-4 h-4" />}
                                  >
                                    Testar {activeShowcase.label} na App
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="md"
                                    onClick={() => setPortalPage('tutoriais')}
                                  >
                                    Ver Guia Passo a Passo
                                  </Button>
                                </div>
                              </div>

                              <div className="lg:col-span-5 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/60 dark:bg-[#131F36] p-5 space-y-4">
                                <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                                  Vista de Indicadores em Tempo Real
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                  {activeShowcase.previewMetrics.map((m) => (
                                    <div
                                      key={m.label}
                                      className="p-3.5 rounded-xl bg-white dark:bg-[#0F182B] border border-slate-200/80 dark:border-slate-800 space-y-1"
                                    >
                                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                                        {m.label}
                                      </span>
                                      <span
                                        className={`text-sm font-extrabold font-mono-tabular block ${
                                          m.accent ?? 'text-slate-900 dark:text-white'
                                        }`}
                                      >
                                        {m.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-[#0F182B]/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                                  {activeShowcase.liveHighlight}
                                </p>
                              </div>
                            </Card>
                          </motion.div>
                        </AnimatePresence>
                      </section>

                      {/* 3. AIVAD DRIVER vs AIVAD MANAGEMENT ARCHITECTURE SPLIT */}
                      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card variant="tinted-blue" className="p-6 sm:p-7 flex flex-col justify-between gap-5">
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                              01. Aplicação Operacional do Motorista
                            </span>
                            <h3 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white">
                              AIVAD Driver
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                              Desenhado para utilização rápida no veículo: 17 módulos focados em decisão de propostas, registo legal 10h/24h, copiloto por voz, radar de zonas e lucro líquido real.
                            </p>
                            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-200 pt-1">
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                                <span>Guias explicativos integrados e onboarding progressivo passo a passo</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                                <span>Aprendizagem de IA 100% isolada na conta privada do motorista</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                                <span>Zero botões administrativos ou complexidade desnecessária em condução</span>
                              </li>
                            </ul>
                          </div>
                          <div>
                            <Button
                              variant="primary"
                              onClick={handleEnterDriver}
                              rightIcon={<ArrowRight className="w-4 h-4" />}
                            >
                              Abrir AIVAD Driver
                            </Button>
                          </div>
                        </Card>

                        <Card className="p-6 sm:p-7 flex flex-col justify-between gap-5">
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                              02. Consola Analítica, Catálogo Internacional &amp; Governança
                            </span>
                            <h3 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white">
                              AIVAD Management
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                              Ambiente administrativo protegido por RBAC no servidor (7 perfis), dedicado à gestão de frotas/operadores, catálogo internacional de países e plataformas, regras fiscais, CMS e auditoria técnica.
                            </p>
                            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-200 pt-1">
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                <span>Validação independente de operação real vs licenciamento por país</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                <span>Controlo de planos, elegibilidade de viaturas, legislação e suporte</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                <span>Autenticação HttpOnly + histórico imutável de auditoria</span>
                              </li>
                            </ul>
                          </div>
                          <div>
                            <Button
                              variant="accent"
                              onClick={handleEnterAdmin}
                              icon={<Lock className="w-4 h-4" />}
                            >
                              Aceder ao AIVAD Management
                            </Button>
                          </div>
                        </Card>
                      </section>
                    </div>
                  );
                }

                if (secId === 'modules') {
                  if (benefitsList.length === 0) return null;
                  return (
                    <section key="modules" className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {benefitsList.map((b, idx) => (
                        <Card key={b.id} className="p-6 space-y-2">
                          <span className="text-xs font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                            0{idx + 1}. Benefício Operacional
                          </span>
                          <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
                            {b.title}
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {b.description}
                          </p>
                        </Card>
                      ))}
                    </section>
                  );
                }

                if (secId === 'platforms') {
                  return (
                    <section key="platforms" className="space-y-4">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <div className="space-y-1">
                          <h2 className="text-xl sm:text-2xl font-display font-extrabold">
                            Catálogo Internacional de Plataformas ({state.platforms.length})
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Estado operacional verificado em <strong>{activeMarket.name} ({activeMarket.code})</strong>, separado da presença global.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPortalPage('plataformas')}
                          className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Filtrar por país &amp; ver fontes →
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {state.platforms.map((pl) => {
                          const op = getPlatformOperationInLocation(pl, activeMarket.code);
                          const isValidated = Boolean(
                            op &&
                              op.operationalStatus === 'Operação efetiva validada' &&
                              op.preselectForDrivers
                          );
                          const shortStatus = !op
                            ? `Sem op. em ${activeMarket.code}`
                            : op.operationalStatus === 'Operação efetiva validada'
                            ? `Ativa em ${activeMarket.code}`
                            : op.operationalStatus === 'Encerrada no país'
                            ? `Encerrada em ${activeMarket.code}`
                            : op.operationalStatus === 'Suspensa'
                            ? `Suspensa em ${activeMarket.code}`
                            : op.operationalStatus === 'Licenciada sem operação confirmada'
                            ? 'Licenciada s/ op.'
                            : op.operationalStatus === 'Disponibilidade regional limitada'
                            ? 'Regional'
                            : `Sem op. em ${activeMarket.code}`;
                          return (
                            <Card
                              key={pl.id}
                              className={`p-4 flex flex-col items-center text-center gap-2 transition-opacity ${
                                isValidated ? 'border-emerald-300/80 dark:border-emerald-800/70' : 'opacity-75'
                              }`}
                            >
                              <PlatformLogo platformId={pl.id} name={pl.name} size={38} />
                              <span className="text-xs font-bold">{pl.name}</span>
                              <span
                                className={`text-[10px] font-bold ${
                                  isValidated
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : op?.operationalStatus === 'Licenciada sem operação confirmada'
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {shortStatus}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono-tabular">
                                Ref. {pl.commissionPct}%
                              </span>
                            </Card>
                          );
                        })}
                      </div>
                    </section>
                  );
                }

                if (secId === 'plans') {
                  return (
                    <section key="plans" className="space-y-5">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <div className="space-y-1">
                          <h2 className="text-xl sm:text-2xl font-display font-extrabold">
                            Planos Transparentes AIVAD
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Estruturados para motoristas individuais, profissionais multi-app e frotas TVDE.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPortalPage('planos')}
                          className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Comparar todas as funcionalidades →
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {state.plans.map((plan, idx) => (
                          <Card
                            key={plan.id}
                            variant={idx === 1 ? 'tinted-blue' : 'default'}
                            className="p-6 flex flex-col justify-between gap-5"
                          >
                            <div className="space-y-2.5">
                              <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                                {plan.audience}
                              </p>
                              <h3 className="text-lg font-display font-extrabold">{plan.name}</h3>
                              <p className="text-3xl font-extrabold font-mono-tabular">
                                €{plan.monthlyPriceEur.toFixed(2)}
                                <span className="text-xs font-normal text-slate-500"> / mês</span>
                              </p>
                              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-200/70 dark:border-slate-800">
                                {plan.features.slice(0, 4).map((f) => (
                                  <li key={f} className="flex items-start gap-2">
                                    <Check className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <Button
                              variant={idx === 1 ? 'primary' : 'secondary'}
                              className="w-full"
                              onClick={handleEnterDriver}
                            >
                              Começar com {plan.name}
                            </Button>
                          </Card>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (secId === 'markets') {
                  return (
                    <section key="markets" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="p-5 space-y-1.5">
                        <span className="text-xs font-semibold text-slate-500">Mercados Oficialmente Ativos</span>
                        <p className="text-2xl font-extrabold font-mono-tabular text-blue-700 dark:text-blue-400">
                          {availableMarketsForPortal.length} Países
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {availableMarketsForPortal.map((c) => c.name).join(', ')} (+{pipelineMarkets.length} configurados/suportados).
                        </p>
                      </Card>
                      <Card className="p-5 space-y-1.5">
                        <span className="text-xs font-semibold text-slate-500">Conformidade Jurídica</span>
                        <p className="text-2xl font-extrabold font-mono-tabular text-rose-600 dark:text-rose-400">
                          {state.obligations.length} Normas Ativas
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Portaria n.º 7/2022, Lei TVDE 45/2018 e enquadramento regional.
                        </p>
                      </Card>
                      <Card className="p-5 space-y-1.5">
                        <span className="text-xs font-semibold text-slate-500">Controlo de Jornada</span>
                        <p className="text-2xl font-extrabold font-mono-tabular text-emerald-600 dark:text-emerald-400">
                          10h / 24h
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Alertas preventivos às 8h e 9h com Código QR verificável.
                        </p>
                      </Card>
                      <Card className="p-5 space-y-1.5">
                        <span className="text-xs font-semibold text-slate-500">Suporte &amp; Contacto</span>
                        <p className="text-sm font-bold truncate text-slate-900 dark:text-white">
                          {cms.contactEmail || 'suporte@aivad-ecosystem.local'}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {cms.supportHours || 'Seg–Sex · 09:00–19:00'}
                        </p>
                      </Card>
                    </section>
                  );
                }

                if (secId === 'faq' && faqList.length > 0) {
                  return (
                    <section key="faq" className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-xl sm:text-2xl font-display font-extrabold flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                          <span>Perguntas Frequentes</span>
                        </h2>
                        <button
                          type="button"
                          onClick={() => setPortalPage('tutoriais')}
                          className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Abrir Tutoriais &amp; FAQ completos →
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {faqList.map((f) => {
                          const isOpen = openFaqId === f.id;
                          return (
                            <Card key={f.id} className="p-4">
                              <button
                                type="button"
                                onClick={() => setOpenFaqId(isOpen ? null : f.id)}
                                aria-expanded={isOpen}
                                className="w-full flex items-center justify-between gap-3 text-left text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
                              >
                                <span>{f.question}</span>
                                <ChevronDown
                                  className={`w-4 h-4 shrink-0 text-blue-700 dark:text-blue-400 transition-transform duration-200 ${
                                    isOpen ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>
                              <AnimatePresence initial={false}>
                                {isOpen && (
                                  <motion.p
                                    initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                                    transition={{ duration: 0.16 }}
                                    className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                                  >
                                    {f.answer}
                                  </motion.p>
                                )}
                              </AnimatePresence>
                            </Card>
                          );
                        })}
                      </div>
                    </section>
                  );
                }

                if (secId === 'updates') {
                  return (
                    <section key="updates" className="space-y-3">
                      <h2 className="text-xl font-display font-extrabold">Comunicados &amp; Evolução do Produto</h2>
                      <Card className="divide-y divide-slate-200/80 dark:divide-slate-800">
                        {cms.publications
                          .filter((p) => p.status === 'Publicado')
                          .map((pub) => (
                            <div
                              key={pub.id}
                              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="space-y-0.5">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{pub.title}</p>
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
            </motion.div>
          )}

          {/* PAGE: FUNCIONALIDADES */}
          {page === 'funcionalidades' && (
            <motion.div
              key="portal-funcionalidades"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold">
                  Funcionalidades Operacionais em Detalhe
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Cada módulo indica claramente o objetivo, funcionamento e estado técnico real.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {INTERACTIVE_SHOWCASE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.id} className="p-6 space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-mono-tabular font-bold text-blue-700 dark:text-blue-400 block">
                              Módulo {item.number}
                            </span>
                            <h3 className="text-base font-display font-bold">{item.label}</h3>
                          </div>
                        </div>
                        <StatusLabel tone="success" text={item.statusText} />
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.howItWorks}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {item.previewMetrics.slice(0, 2).map((pm) => (
                          <div
                            key={pm.label}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131F36] border border-slate-200/70 dark:border-slate-800 text-xs"
                          >
                            <span className="text-[10px] text-slate-500 block">{pm.label}</span>
                            <span className="font-mono-tabular font-bold">{pm.value}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* PAGE: MERCADOS */}
          {page === 'mercados' && (
            <motion.div
              key="portal-mercados"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5 space-y-1">
                  <span className="text-xs font-semibold text-slate-500">1. Mercados Oficialmente Ativos</span>
                  <p className="text-2xl font-extrabold font-mono-tabular text-emerald-700 dark:text-emerald-400">
                    {tieredMarkets.officiallyActive.length}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Operação validada, regras fiscais/TVDE e plataformas pré-selecionadas verificadas.
                  </p>
                </Card>
                <Card className="p-5 space-y-1">
                  <span className="text-xs font-semibold text-slate-500">2. Países Configurados</span>
                  <p className="text-2xl font-extrabold font-mono-tabular text-blue-700 dark:text-blue-400">
                    {tieredMarkets.configured.length}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Moeda, fuso horário, regiões e cidades parametrizados em validação operacional.
                  </p>
                </Card>
                <Card className="p-5 space-y-1">
                  <span className="text-xs font-semibold text-slate-500">3. Países Suportados</span>
                  <p className="text-2xl font-extrabold font-mono-tabular text-slate-800 dark:text-slate-200">
                    {tieredMarkets.supported.length} (Extensível)
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Arquitetura aberta a qualquer país ISO adicionado pela Administração sem alterar código.
                  </p>
                </Card>
              </div>

              <Card className="overflow-x-auto">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <div>
                    <h2 className="text-lg font-display font-bold">
                      Mercados Oficialmente Ativos ({tieredMarkets.officiallyActive.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Apenas plataformas com operação efetiva validada são pré-selecionadas ao escolher cada localização.
                    </p>
                  </div>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#131F36] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 font-bold">País</th>
                      <th className="p-3.5 font-bold">Regiões &amp; Cidades</th>
                      <th className="p-3.5 font-bold">Idioma</th>
                      <th className="p-3.5 font-bold">Moeda &amp; Unidades</th>
                      <th className="p-3.5 font-bold">Licença Local</th>
                      <th className="p-3.5 font-bold">Plataformas com Operação Validada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {tieredMarkets.officiallyActive.map((c) => {
                      const validatedIds = getValidatedPlatformsForLocation(state.platforms, c.code);
                      return (
                        <tr key={c.code} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40">
                          <td className="p-3.5 font-bold">{c.name} ({c.code})</td>
                          <td className="p-3.5">{c.regions.flatMap((r) => r.cities).join(', ')}</td>
                          <td className="p-3.5">{c.language}</td>
                          <td className="p-3.5 font-mono-tabular">
                            {c.currency} ({c.currencySymbol}) · {c.unitSystem === 'imperial' ? 'mi' : 'km'}
                          </td>
                          <td className="p-3.5">{c.driverLicenseRequired}</td>
                          <td className="p-3.5 font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                            {validatedIds.length > 0
                              ? validatedIds.join(', ').toUpperCase()
                              : c.activePlatforms.join(', ').toUpperCase()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>

              {(tieredMarkets.configured.length > 0 || tieredMarkets.supported.length > 0) && (
                <Card className="overflow-x-auto">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-base font-display font-bold">
                      Países Configurados &amp; Suportados ({tieredMarkets.configured.length + tieredMarkets.supported.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Mercados já parametrizados ou em estudo técnico, separados dos mercados oficialmente ativos.
                    </p>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#131F36] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3.5 font-bold">País</th>
                        <th className="p-3.5 font-bold">Escalão do Catálogo</th>
                        <th className="p-3.5 font-bold">Estado Administrativo</th>
                        <th className="p-3.5 font-bold">Moeda &amp; Unidades</th>
                        <th className="p-3.5 font-bold">Cidades Configuradas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {[...tieredMarkets.configured, ...tieredMarkets.supported].map((c) => {
                        const isConfigured = tieredMarkets.configured.some((x) => x.code === c.code);
                        return (
                          <tr key={c.code}>
                            <td className="p-3.5 font-semibold">{c.name} ({c.code})</td>
                            <td className="p-3.5">{isConfigured ? 'País Configurado' : 'País Suportado'}</td>
                            <td className="p-3.5">{c.marketStatus}</td>
                            <td className="p-3.5 font-mono-tabular">
                              {c.currency} ({c.currencySymbol}) · {c.unitSystem === 'imperial' ? 'mi' : 'km'}
                            </td>
                            <td className="p-3.5">{c.regions.flatMap((r) => r.cities).join(', ')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              )}
            </motion.div>
          )}

          {/* PAGE: PLATAFORMAS */}
          {page === 'plataformas' && (
            <motion.div
              key="portal-plataformas"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-display font-extrabold">
                    Catálogo Internacional de Plataformas ({state.platforms.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Separa rigorosamente licenciamento administrativo de operação efetiva validada por país e cidade.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <label htmlFor="portal-plat-country" className="font-semibold text-slate-600 dark:text-slate-300">
                    Filtrar operação no país:
                  </label>
                  <select
                    id="portal-plat-country"
                    value={platformCountryFilter}
                    onChange={(e) => setPlatformCountryFilter(e.target.value)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36] font-bold"
                  >
                    {state.countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.platforms.map((pl) => {
                  const op = getPlatformOperationInLocation(pl, platformCountryFilter);
                  const statusText = op?.operationalStatus ?? 'Sem operação registada neste país';
                  const statusTone =
                    op?.operationalStatus === 'Operação efetiva validada'
                      ? 'success'
                      : op?.operationalStatus === 'Encerrada no país' || op?.operationalStatus === 'Suspensa'
                      ? 'danger'
                      : 'warning';
                  return (
                    <Card key={pl.id} className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <PlatformLogo platformId={pl.id} name={pl.name} size={36} />
                          <div>
                            <h3 className="text-base font-display font-bold">{pl.name}</h3>
                            <p className="text-[11px] text-slate-500">
                              Presença global: {pl.countryScope.join(', ')} · Comissão ref. {pl.commissionPct}%
                            </p>
                          </div>
                        </div>
                        <StatusLabel tone={statusTone} text={statusText} />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Categorias: {pl.categories.join(' · ')}
                      </p>
                      {op && (
                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                          <p>
                            <strong>Pré-seleção motorista ({platformCountryFilter}):</strong>{' '}
                            {op.operationalStatus === 'Operação efetiva validada' && op.preselectForDrivers
                              ? 'Ativa por omissão'
                              : 'Não pré-selecionada'}
                          </p>
                          {op.licensingNote && <p>{op.licensingNote}</p>}
                          <p className="font-mono-tabular">
                            Fonte: {op.validationSource} · Validado: {op.verifiedAt}
                          </p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* PAGE: PLANOS */}
          {page === 'planos' && (
            <motion.div
              key="portal-planos"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-display font-extrabold">Planos AIVAD SaaS Core</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {state.plans.map((plan, idx) => (
                  <Card
                    key={plan.id}
                    variant={idx === 1 ? 'tinted-blue' : 'default'}
                    className="p-6 flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-400">{plan.audience}</p>
                      <h3 className="text-lg font-display font-bold">{plan.name}</h3>
                      <div className="text-3xl font-extrabold font-mono-tabular">
                        €{plan.monthlyPriceEur.toFixed(2)}
                        <span className="text-xs font-normal text-slate-500"> / mês</span>
                      </div>
                      <ul className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <Check className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button variant={idx === 1 ? 'primary' : 'secondary'} className="w-full" onClick={handleEnterDriver}>
                      Entrar como Motorista
                    </Button>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* PAGE: DOWNLOADS / MULTIPLATAFORMA */}
          {page === 'downloads' && (
            <motion.div
              key="portal-downloads"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-display font-extrabold flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <span>Experiência Web, PWA, Android &amp; iOS Ready</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Estado transparente de cada canal — distinguindo o que funciona agora na Web/PWA do que requer build nativo Windsurf.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLATFORM_ADAPTERS.map((adapter, i) => (
                  <Card key={i} className="p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
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
                        <StatusLabel
                          tone={ver.status === 'Publicado' ? 'success' : 'info'}
                          text={`${ver.status} · ${ver.rolloutPct}%`}
                        />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{ver.notes}</p>
                      <p className="text-[11px] font-mono-tabular text-slate-500">
                        Build #{ver.buildNumber} · {ver.releaseDate}
                      </p>
                    </Card>
                  ))}
              </div>
            </motion.div>
          )}

          {/* PAGE: TUTORIAIS & FAQ */}
          {page === 'tutoriais' && (
            <motion.div
              key="portal-tutoriais"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <Card variant="tinted-blue" className="p-6 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <span>Guia Rápido de Arranque em 4 Passos</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F182B] border border-slate-200/80 dark:border-slate-800">
                    <strong className="block text-blue-700 dark:text-blue-400 mb-1">1. Confirmar Mercado &amp; Veículo</strong>
                    Selecione a sua cidade e viatura ativa para que tarifas elétricas/combustível e apps validadas fiquem calibradas.
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F182B] border border-slate-200/80 dark:border-slate-800">
                    <strong className="block text-blue-700 dark:text-blue-400 mb-1">2. Iniciar Registo TVDE 10h/24h</strong>
                    Introduza o odómetro inicial no Tacógrafo e acompanhe a margem legal entre todas as aplicações.
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F182B] border border-slate-200/80 dark:border-slate-800">
                    <strong className="block text-blue-700 dark:text-blue-400 mb-1">3. Personalizar Cartão &amp; AutoPilot</strong>
                    Escolha os seus mínimos de €/km e €/hora e ative o Copiloto por Voz mãos-livres se desejar.
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F182B] border border-slate-200/80 dark:border-slate-800">
                    <strong className="block text-blue-700 dark:text-blue-400 mb-1">4. Consultar Guias em Cada Módulo</strong>
                    Dentro da app, clique sempre em &ldquo;Como funciona este módulo?&rdquo; para ver as 7 respostas rápidas.
                  </div>
                </div>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {faqList.map((f) => (
                  <Card key={f.id} className="p-5 space-y-1.5">
                    <h3 className="text-sm font-bold">{f.question}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{f.answer}</p>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* PAGE: SEGURANÇA */}
          {page === 'seguranca' && (
            <motion.div
              key="portal-seguranca"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-blue-700 dark:text-blue-400" />
                  <h2 className="text-2xl font-display font-extrabold">
                    Segurança, Privacidade RGPD &amp; RBAC Estrito
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#131F36] border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <strong className="text-sm block text-slate-900 dark:text-white">Isolamento por Utilizador</strong>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      A aprendizagem do AIVAD AI CORE, relatórios e histórico financeiro são estritamente isolados por conta — zero partilha entre motoristas.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#131F36] border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <strong className="text-sm block text-slate-900 dark:text-white">Sessões HttpOnly no Servidor</strong>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Autenticação validada no servidor Express com cookies HttpOnly, hashing criptográfico e bloqueio RBAC 401/403 para rotas administrativas.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#131F36] border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <strong className="text-sm block text-slate-900 dark:text-white">Separação Real vs Sandbox</strong>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Dados de demonstração são etiquetados na origem e excluídos por omissão dos relatórios fiscais e operacionais reais.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* PAGE: CONTACTO */}
          {page === 'contacto' && (
            <motion.div
              key="portal-contacto"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6 sm:p-8 max-w-2xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <h2 className="text-2xl font-display font-extrabold">Contacto Comercial e Suporte</h2>
                </div>
                <p className="text-xs text-slate-500">
                  Canal direto: <strong>{cms.contactEmail || 'suporte@aivad-ecosystem.local'}</strong> · Horário:{' '}
                  <strong>{cms.supportHours || 'Seg–Sex · 09:00–19:00'}</strong>
                </p>
                {contactSent ? (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <StatusLabel tone="success" text="Pedido validado e registado localmente" />
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Mensagem de <strong>{contactForm.name}</strong> guardada. O envio transacional SMTP externo fica pronto para ligação na fase Windsurf.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setContactSent(false);
                        setContactForm({ name: '', email: '', profile: 'Motorista TVDE', message: '' });
                      }}
                      className="text-xs font-bold text-blue-700 dark:text-blue-400 underline cursor-pointer"
                    >
                      Enviar nova mensagem
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    {contactError && <StatusLabel tone="danger" text={contactError} />}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="c-name" className="block text-xs font-semibold mb-1">
                          Nome completo
                        </label>
                        <input
                          id="c-name"
                          type="text"
                          value={contactForm.name}
                          onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324] text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="c-email" className="block text-xs font-semibold mb-1">
                          Email
                        </label>
                        <input
                          id="c-email"
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                          className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324] text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="c-msg" className="block text-xs font-semibold mb-1">
                        Mensagem
                      </label>
                      <textarea
                        id="c-msg"
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324] text-sm"
                      />
                    </div>
                    <Button type="submit" variant="primary">
                      Enviar Pedido de Contacto
                    </Button>
                  </form>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Portal Authentication & Role Gateway Modal */}
      <AnimatePresence>
        {authModalOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Autenticação de Acesso AIVAD"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
          >
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full sm:max-w-md"
            >
              <Card className="rounded-t-3xl sm:rounded-2xl p-6 space-y-5 shadow-2xl">
                <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2.5 rounded-2xl text-white ${
                        authModalOpen === 'admin' ? 'bg-rose-600' : 'bg-blue-700'
                      }`}
                    >
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Gateway de Autenticação RBAC
                      </p>
                      <h2 className="text-base font-display font-bold">
                        {authModalOpen === 'admin'
                          ? 'Entrar no AIVAD Management'
                          : 'Entrar no AIVAD Driver'}
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(null)}
                    aria-label="Fechar janela de autenticação"
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Auth Tabs */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#131F36] text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('real');
                      setAuthError(null);
                    }}
                    className={`min-h-[38px] py-2 px-3 rounded-lg font-bold transition-colors cursor-pointer ${
                      authTab === 'real'
                        ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
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
                    className={`min-h-[38px] py-2 px-3 rounded-lg font-bold transition-colors cursor-pointer ${
                      authTab === 'demo'
                        ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
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
                      <div className="flex gap-4 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setRealMode('login')}
                          className={
                            realMode === 'login'
                              ? 'text-blue-700 dark:text-blue-400 underline cursor-pointer'
                              : 'text-slate-500 cursor-pointer'
                          }
                        >
                          Entrar na minha conta
                        </button>
                        <button
                          type="button"
                          onClick={() => setRealMode('register')}
                          className={
                            realMode === 'register'
                              ? 'text-blue-700 dark:text-blue-400 underline cursor-pointer'
                              : 'text-slate-500 cursor-pointer'
                          }
                        >
                          Criar conta real
                        </button>
                      </div>
                    )}

                    {realMode === 'register' && authModalOpen === 'driver' && (
                      <>
                        <div>
                          <label htmlFor="auth-real-name" className="block font-semibold mb-1">
                            Nome completo
                          </label>
                          <input
                            id="auth-real-name"
                            type="text"
                            required
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            placeholder="Ex: João Ferreira"
                            className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324]"
                          />
                        </div>
                        <div>
                          <label htmlFor="auth-real-role" className="block font-semibold mb-1">
                            Perfil de conta
                          </label>
                          <select
                            id="auth-real-role"
                            value={authRole}
                            onChange={(e) => setAuthRole(e.target.value as 'Motorista' | 'Operador')}
                            className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324]"
                          >
                            <option value="Motorista">Motorista TVDE</option>
                            <option value="Operador">Operador / Frota</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div>
                      <label htmlFor="auth-real-email" className="block font-semibold mb-1">
                        Email
                      </label>
                      <input
                        id="auth-real-email"
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="nome@dominio.pt"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324]"
                      />
                    </div>

                    <div>
                      <label htmlFor="auth-real-pw" className="block font-semibold mb-1">
                        Palavra-passe
                      </label>
                      <input
                        id="auth-real-pw"
                        type="password"
                        required
                        minLength={realMode === 'register' ? 8 : 6}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder={
                          realMode === 'register' ? 'Mínimo 8 caracteres' : 'Introduza a palavra-passe'
                        }
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324]"
                      />
                    </div>

                    {authModalOpen === 'admin' && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#131F36] text-[11px] text-slate-600 dark:text-slate-300">
                        A consola administrativa valida credenciais no servidor Express (cookie HttpOnly + scrypt + RBAC 401/403).
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={authBusy}
                      variant={authModalOpen === 'admin' ? 'accent' : 'primary'}
                      className="w-full"
                    >
                      {authBusy
                        ? 'A autenticar no servidor...'
                        : realMode === 'register' && authModalOpen === 'driver'
                        ? 'Criar Conta Real e Entrar'
                        : authModalOpen === 'admin'
                        ? 'Entrar no AIVAD Management'
                        : 'Entrar no AIVAD Driver'}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4 text-xs">
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        O Modo Demonstração usa dados fictícios isolados no sandbox e nunca se mistura com contas reais.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      <Button
                        variant="primary"
                        disabled={authBusy}
                        onClick={async () => {
                          setAuthBusy(true);
                          const res = await enterDemoSandbox('driver');
                          setAuthBusy(false);
                          if (!res.ok) setAuthError(res.error ?? 'Erro ao abrir sandbox.');
                          else setAuthModalOpen(null);
                        }}
                        className="w-full justify-between"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                      >
                        Explorar Sandbox · Motorista Demo
                      </Button>

                      <Button
                        variant="accent"
                        disabled={authBusy}
                        onClick={async () => {
                          setAuthBusy(true);
                          const res = await enterDemoSandbox('admin');
                          setAuthBusy(false);
                          if (!res.ok) setAuthError(res.error ?? 'Erro ao abrir sandbox admin.');
                          else setAuthModalOpen(null);
                        }}
                        className="w-full justify-between"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                      >
                        Explorar Sandbox · Administração Demo
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-slate-200/80 dark:border-[#1E2D4A] bg-white dark:bg-[#080E1C] py-10 px-4 sm:px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-display font-bold text-sm">
              <PhoenixLogo size={22} />
              <span>{cms.brandTitle ?? 'AIVAD'} — Driver Intelligence &amp; Management Ecosystem</span>
            </div>
            <p>
              Plataforma independente de apoio à decisão, conformidade TVDE 10h/24h e gestão operacional · {new Date().getFullYear()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-medium">
            <button
              type="button"
              onClick={() => setPortalPage('funcionalidades')}
              className="hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
            >
              Funcionalidades
            </button>
            <button
              type="button"
              onClick={() => setPortalPage('mercados')}
              className="hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
            >
              Mercados
            </button>
            <button
              type="button"
              onClick={() => setPortalPage('seguranca')}
              className="hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
            >
              Segurança &amp; RGPD
            </button>
            <button
              type="button"
              onClick={() => setPortalPage('contacto')}
              className="hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
            >
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
