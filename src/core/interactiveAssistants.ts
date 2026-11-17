import type {
  AndroidOverlayConfig,
  AutoPilotConfig,
  FloatingDockConfig,
  UserRole,
} from '../models/types';
import type { PlatformConnectorState } from './connectors';
import { canAccessAdminTab } from './rbac';

export type AssistantStepStatus =
  | 'Por iniciar'
  | 'Em andamento'
  | 'Concluído'
  | 'Falhou'
  | 'Pendente de permissão'
  | 'Pendente de integração'
  | 'Não suportado neste dispositivo';

export type AssistantScope = 'driver' | 'admin' | 'portal';

export interface AssistantStep {
  id: string;
  title: string;
  goal: string;
  instruction: string;
  expectedResult: string;
  targetNav?: string;
  targetSelector?: string;
  verificationType: 'auto_state' | 'auto_or_confirm' | 'user_confirm';
  optional?: boolean;
  validatorKey: string;
}

export interface AssistantDefinition {
  id: string;
  scope: AssistantScope;
  title: string;
  subtitle: string;
  category: string;
  estimatedMinutes: number;
  relatedNavIds: string[];
  requiredAdminTab?: string;
  steps: AssistantStep[];
}

export interface AssistantProgressRecord {
  assistantId: string;
  status: 'Não iniciado' | 'Em curso' | 'Pausado' | 'Concluído';
  currentStepIndex: number;
  stepStatuses: Record<string, AssistantStepStatus>;
  stepNotes: Record<string, string>;
  userConfirmedStepIds: string[];
  skippedStepIds: string[];
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface AssistantEvaluationContext {
  overlayConfig: AndroidOverlayConfig;
  floatingDockConfig: FloatingDockConfig;
  floatingPreviewOpened: boolean;
  floatingConfigSavedCount: number;
  voiceConfig: {
    enabled: boolean;
    deliveryMode: string;
    language: string;
    speechRate: number;
    categories: Record<string, boolean>;
  };
  voiceSupported: boolean;
  voiceTestCount: number;
  autoPilot: AutoPilotConfig;
  autoPilotSavedCount: number;
  connectors: {
    uber: PlatformConnectorState;
    bolt: PlatformConnectorState;
  };
  activeDriverNav: string;
  activeAdminNav: string;
  activePortalPage: string;
  selectedMarketCode: string;
  tachographActiveSession: boolean;
  proposalsCount: number;
  vehiclesCount: number;
  activeVehicleId: string;
  zoneObservationsCount: number;
  countriesCount: number;
  adminRevalidationCount: number;
  portalSimulatorTested: boolean;
  portalComparisonViewed: boolean;
}

export interface StepVerificationOutcome {
  status: AssistantStepStatus;
  detail: string;
  requiresUserConfirmation: boolean;
}

export const INTERACTIVE_ASSISTANTS: AssistantDefinition[] = [
  // =========================================================================
  // MOTORISTA (DRIVER)
  // =========================================================================
  {
    id: 'floating-card',
    scope: 'driver',
    title: 'Assistente do Cartão Flutuante & Pré-visualização',
    subtitle: 'Personalize layout, cores reais (ex.: fundo/borda vermelho), 8 posições seguras, atalhos e pré-visualize antes de guardar.',
    category: 'Personalização · Interface',
    estimatedMinutes: 2,
    relatedNavIds: ['cartoes-flutuantes'],
    steps: [
      {
        id: 'fc-step-layout',
        title: '1. Escolher modo Compacto ou Expandido',
        goal: 'Definir se o cartão abre resumido ou com todas as métricas e endereços.',
        instruction: 'Selecione o modo Compacto ou Expandido no bloco de Layout e Perfil Rápido.',
        expectedResult: 'O modo de layout fica selecionado e pronto a pré-visualizar.',
        targetNav: 'cartoes-flutuantes',
        targetSelector: '[data-guide-target="fc-layout-mode"]',
        verificationType: 'auto_or_confirm',
        validatorKey: 'fc_layout',
      },
      {
        id: 'fc-step-colors',
        title: '2. Personalizar cores, contorno e transparência',
        goal: 'Aplicar cor de fundo, texto, borda e espessura sem sobreposição azul automática.',
        instruction: 'Ajuste os seletores de Cor de Fundo, Cor da Borda (ex.: vermelho #E11D48) e Opacidade no painel de Aparência.',
        expectedResult: 'As cores escolhidas refletem-se fielmente no cartão de pré-visualização.',
        targetNav: 'cartoes-flutuantes',
        targetSelector: '[data-guide-target="fc-colors"]',
        verificationType: 'auto_or_confirm',
        validatorKey: 'fc_colors',
      },
      {
        id: 'fc-step-position',
        title: '3. Escolher posição segura (8 opções) e margem',
        goal: 'Posicionar o cartão sem cobrir o entalhe, barra de estado ou botões essenciais.',
        instruction: 'Escolha uma das 8 posições periféricas (+ Centro) e ajuste a margem de segurança em píxeis.',
        expectedResult: 'A posição e a margem ficam configuradas para desktop e telemóvel.',
        targetNav: 'cartoes-flutuantes',
        targetSelector: '[data-guide-target="fc-position"]',
        verificationType: 'auto_or_confirm',
        validatorKey: 'fc_position',
      },
      {
        id: 'fc-step-dock',
        title: '4. Personalizar Atalhos AIVAD de forma independente',
        goal: 'Garantir que o botão flutuante Atalhos AIVAD mantém estilo próprio separado do cartão de propostas.',
        instruction: 'Configure a cor ou posição do botão flutuante Atalhos AIVAD na secção dedicada.',
        expectedResult: 'O botão Atalhos AIVAD usa configuração independente sem afetar o cartão de propostas.',
        targetNav: 'cartoes-flutuantes',
        targetSelector: '[data-guide-target="fc-dock-config"]',
        verificationType: 'auto_or_confirm',
        optional: true,
        validatorKey: 'fc_dock',
      },
      {
        id: 'fc-step-preview',
        title: '5. Pré-visualizar em Web, App, Android e iOS',
        goal: 'Validar o aspeto real antes de persistir alterações.',
        instruction: 'Clique no botão "Pré-visualizar" para abrir o palco interativo com molduras Web, App AIVAD, Android e iPhone.',
        expectedResult: 'O ecrã de pré-visualização abre com dados fictícios claramente sinalizados e simulação honesta.',
        targetNav: 'cartoes-flutuantes',
        targetSelector: '[data-guide-target="fc-preview-btn"]',
        verificationType: 'auto_state',
        validatorKey: 'fc_preview_opened',
      },
      {
        id: 'fc-step-visual-confirm',
        title: '6. Confirmar resultado visual em Claro/Escuro',
        goal: 'Garantir contraste e legibilidade antes de fechar.',
        instruction: 'Teste os estados Verde, Amarelo e Vermelho na pré-visualização e confirme explicitamente abaixo que o resultado visual está legível.',
        expectedResult: 'Confirmação explícita registada pelo utilizador.',
        targetNav: 'cartoes-flutuantes',
        targetSelector: '[data-guide-target="fc-preview-stage"]',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
      {
        id: 'fc-step-save',
        title: '7. Guardar alterações no perfil',
        goal: 'Persistir a configuração validada na app.',
        instruction: 'Clique em "Guardar Alterações" para aplicar a configuração no estado persistido.',
        expectedResult: 'Configuração guardada no estado global e aplicada em futuras sessões.',
        targetNav: 'cartoes-flutuantes',
        targetSelector: '[data-guide-target="fc-save-btn"]',
        verificationType: 'auto_state',
        validatorKey: 'fc_saved',
      },
    ],
  },
  {
    id: 'voice',
    scope: 'driver',
    title: 'Assistente do AIVAD Voice · Copiloto Mãos-Livres',
    subtitle: 'Valide compatibilidade de voz do dispositivo, idioma, categorias de alerta e teste a leitura sonora.',
    category: 'Personalização · Voz',
    estimatedMinutes: 2,
    relatedNavIds: ['voz-copiloto'],
    steps: [
      {
        id: 'voice-step-support',
        title: '1. Verificar compatibilidade vocal do dispositivo',
        goal: 'Detetar honestamente se o navegador/dispositivo suporta síntese de voz (Web Speech API).',
        instruction: 'Verifique o indicador de suporte do motor de voz e escolha o modo de entrega ("Visual + Voz" ou "Apenas Voz").',
        expectedResult: 'Estado real detetado sem simulações falsas; fallback visual garantido se indisponível.',
        targetNav: 'voz-copiloto',
        targetSelector: '[data-guide-target="voice-delivery-mode"]',
        verificationType: 'auto_state',
        validatorKey: 'voice_device_check',
      },
      {
        id: 'voice-step-lang',
        title: '2. Configurar idioma e velocidade de leitura',
        goal: 'Ajustar pt-PT, pt-BR, es-ES ou en-GB e cadência confortável para condução.',
        instruction: 'Selecione o idioma e ajuste o cursor de velocidade no painel de voz.',
        expectedResult: 'Preferências linguísticas e de cadência guardadas.',
        targetNav: 'voz-copiloto',
        targetSelector: '[data-guide-target="voice-language"]',
        verificationType: 'auto_or_confirm',
        validatorKey: 'voice_lang_check',
      },
      {
        id: 'voice-step-categories',
        title: '3. Selecionar categorias de alertas prioritários',
        goal: 'Escolher exatamente o que ouvir (Propostas, Zonas, Bateria, Limite TVDE).',
        instruction: 'Ative pelo menos duas categorias de alerta no painel de categorias vocais.',
        expectedResult: 'Categorias ativas filtram apenas alertas úteis e evitam ruído.',
        targetNav: 'voz-copiloto',
        targetSelector: '[data-guide-target="voice-categories"]',
        verificationType: 'auto_state',
        validatorKey: 'voice_categories_check',
      },
      {
        id: 'voice-step-test',
        title: '4. Executar teste real de anúncio vocal',
        goal: 'Confirmar que o aviso visual e a fila sonora disparam corretamente.',
        instruction: 'Clique em "Testar Anúncio de Proposta" e confirme o funcionamento.',
        expectedResult: 'Teste disparado com registo na fila de áudio e banner visual.',
        targetNav: 'voz-copiloto',
        targetSelector: '[data-guide-target="voice-test-btn"]',
        verificationType: 'auto_state',
        validatorKey: 'voice_tested',
      },
    ],
  },
  {
    id: 'autopilot',
    scope: 'driver',
    title: 'Assistente do AutoPilot (3 Modos)',
    subtitle: 'Configure critérios mínimos, compare Manual vs Semiautomático vs Automático e valide limites técnicos reais.',
    category: 'Operação · AutoPilot',
    estimatedMinutes: 3,
    relatedNavIds: ['estrategia', 'autopilot'],
    steps: [
      {
        id: 'ap-step-mode',
        title: '1. Compreender e escolher entre os 3 modos',
        goal: 'Distinguir Manual, Semiautomático (ajustes revertíveis) e Automático.',
        instruction: 'Selecione o modo de AutoPilot pretendido no seletor dos 3 modos.',
        expectedResult: 'O modo selecionado fica ativo no motor de decisão.',
        targetNav: 'estrategia',
        targetSelector: '[data-guide-target="autopilot-modes"]',
        verificationType: 'auto_or_confirm',
        validatorKey: 'autopilot_mode',
      },
      {
        id: 'ap-step-thresholds',
        title: '2. Definir €/km, €/hora e recolha máxima',
        goal: 'Proteger a rentabilidade líquida antes de aceitar propostas.',
        instruction: 'Ajuste os limiares mínimos de €/km e €/hora no painel de regras do AutoPilot.',
        expectedResult: 'Limiares numéricos válidos ficam registados.',
        targetNav: 'estrategia',
        targetSelector: '[data-guide-target="autopilot-thresholds"]',
        verificationType: 'auto_state',
        validatorKey: 'autopilot_thresholds',
      },
      {
        id: 'ap-step-preset',
        title: '3. Guardar perfil/preset de regras',
        goal: 'Permitir alternar rapidamente entre perfis Urbano, Chuva ou Aeroporto.',
        instruction: 'Guarde ou aplique um Preset de estratégia.',
        expectedResult: 'Regras guardadas para reutilização rápida.',
        targetNav: 'estrategia',
        targetSelector: '[data-guide-target="autopilot-presets"]',
        verificationType: 'auto_or_confirm',
        optional: true,
        validatorKey: 'autopilot_preset',
      },
      {
        id: 'ap-step-api',
        title: '4. Validar permissão técnica de execução automática',
        goal: 'Reportar com transparência se há canal oficial autorizado ou apenas apoio visual.',
        instruction: 'Verifique se existe canal oficial/nativo autorizado nos Conectores ou confirme que entende o fallback assistido.',
        expectedResult: 'Nunca declara execução automática concluída sem autorização real do conector.',
        targetNav: 'estrategia',
        targetSelector: '[data-guide-target="autopilot-auth-badge"]',
        verificationType: 'auto_state',
        validatorKey: 'autopilot_automation_auth',
      },
    ],
  },
  {
    id: 'connectors',
    scope: 'driver',
    title: 'Assistente de Conectores Uber & Bolt',
    subtitle: 'Audite permissões de leitura/execução, execute testes por nível e valide ligação ao servidor.',
    category: 'Integrações · Transparência',
    estimatedMinutes: 2,
    relatedNavIds: ['conectores'],
    steps: [
      {
        id: 'conn-step-state',
        title: '1. Inspecionar estado real no servidor',
        goal: 'Verificar se existem credenciais OAuth no servidor ou se está em "Não configurado".',
        instruction: 'Consulte os cartões de estado dos conectores Uber e Bolt.',
        expectedResult: 'Estado real transparente exibido sem mascarar ausência de credenciais.',
        targetNav: 'conectores',
        targetSelector: '[data-guide-target="connectors-overview"]',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
      {
        id: 'conn-step-perms',
        title: '2. Configurar permissões de leitura e captura',
        goal: 'Ativar ou revogar consentimento granular por plataforma.',
        instruction: 'Reveja os interruptores de "Leitura / Captura" e "Execução Externa".',
        expectedResult: 'Permissões refletem a autorização explícita do motorista.',
        targetNav: 'conectores',
        targetSelector: '[data-guide-target="connectors-permissions"]',
        verificationType: 'auto_state',
        validatorKey: 'connectors_permissions',
      },
      {
        id: 'conn-step-test',
        title: '3. Executar suite de verificação técnica',
        goal: 'Testar Nível 1 (Simulador) e inspecionar Nível 2/3.',
        instruction: 'Clique num botão de verificação técnica (Nível 1, 2 ou 3) na plataforma Uber ou Bolt.',
        expectedResult: 'Último resultado técnico registado com data/hora.',
        targetNav: 'conectores',
        targetSelector: '[data-guide-target="connectors-tests"]',
        verificationType: 'auto_state',
        validatorKey: 'connectors_tested',
      },
      {
        id: 'conn-step-server-oauth',
        title: '4. Validação final de integração oficial em produção',
        goal: 'Confirmar ligação OAuth/Bridge real no ambiente atual.',
        instruction: 'Valida automaticamente se os conectores possuem integração real ativa no cofre do servidor.',
        expectedResult: 'Marca "Concluído" apenas com integração real validada; caso contrário mantém "Pendente de integração".',
        targetNav: 'conectores',
        targetSelector: '[data-guide-target="connectors-overview"]',
        verificationType: 'auto_state',
        validatorKey: 'connectors_real_oauth',
      },
    ],
  },
  {
    id: 'dashboard',
    scope: 'driver',
    title: 'Assistente do Painel Principal & KPIs',
    subtitle: 'Explore o lucro líquido real, transparência de fórmulas e atalhos operacionais.',
    category: 'Visão Geral',
    estimatedMinutes: 2,
    relatedNavIds: ['dashboard'],
    steps: [
      {
        id: 'dash-step-kpi',
        title: '1. Interpretar lucro líquido e filtros',
        goal: 'Ver receita líquida após comissões, veículo e despesas.',
        instruction: 'Consulte os cartões de KPI principais e use o ícone "?" para ver a fórmula exata.',
        expectedResult: 'Utilizador compreende a separação entre bruto, líquido e canceladas.',
        targetNav: 'dashboard',
        targetSelector: '[data-guide-target="driver-kpi-grid"]',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
      {
        id: 'dash-step-fc',
        title: '2. Abrir estúdio de personalização do Cartão Flutuante',
        goal: 'Saber aceder rapidamente ao ajuste de cores e posição.',
        instruction: 'Prossiga para o módulo Cartão Flutuante ou confirme o domínio dos atalhos.',
        expectedResult: 'Fluxo compreendido entre Painel Principal e Cartão Flutuante.',
        targetNav: 'dashboard',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },
  {
    id: 'tacografo',
    scope: 'driver',
    title: 'Assistente do TACÓGRAFO (10h / 24h)',
    subtitle: 'Inicie turno com odómetro real, alterne estados legais e valide o QR de auditoria.',
    category: 'Operação · Conformidade',
    estimatedMinutes: 2,
    relatedNavIds: ['tacografo'],
    steps: [
      {
        id: 'tac-step-shift',
        title: '1. Confirmar sessão ativa ou iniciar turno',
        goal: 'Garantir registo cronológico contínuo na janela deslizante de 24h.',
        instruction: 'Verifique se existe turno em curso ou inicie um novo turno indicando o odómetro.',
        expectedResult: 'Sessão de tacógrafo ativa com controlo 10h/24h.',
        targetNav: 'tacografo',
        targetSelector: '[data-guide-target="tachograph-controls"]',
        verificationType: 'auto_state',
        validatorKey: 'tachograph_active',
      },
      {
        id: 'tac-step-qr',
        title: '2. Validar QR de auditoria TVDE',
        goal: 'Emitir comprovativo verificável para fiscalização.',
        instruction: 'Desça até ao cartão QR verificável e valide a estrutura JSON.',
        expectedResult: 'QR validado pelo motorista.',
        targetNav: 'tacografo',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },
  {
    id: 'corridas',
    scope: 'driver',
    title: 'Assistente de Corridas, Propostas & Ciclo de Vida',
    subtitle: 'Avalie propostas na calculadora, acompanhe tempos de recolha/espera e registe resultados.',
    category: 'Operação',
    estimatedMinutes: 2,
    relatedNavIds: ['corridas', 'calculadora', 'propostas-tempo-real', 'smart-capture', 'historico-viagens'],
    steps: [
      {
        id: 'cor-step-calc',
        title: '1. Simular ou calcular uma proposta',
        goal: 'Calcular €/km, €/h, retorno vazio e alertas de zona antes de aceitar.',
        instruction: 'Use a Calculadora & AI CORE para analisar uma proposta de corrida.',
        expectedResult: 'Existe pelo menos uma proposta analisada no histórico.',
        targetNav: 'calculadora',
        targetSelector: '[data-guide-target="proposal-calculator"]',
        verificationType: 'auto_state',
        validatorKey: 'has_proposals',
      },
      {
        id: 'cor-step-lifecycle',
        title: '2. Compreender temporizadores de recolha vs espera',
        goal: 'Garantir que a espera só conta após chegada ao ponto de recolha.',
        instruction: 'Reveja o comportamento de recolha, espera e cancelamento sem fecho automático.',
        expectedResult: 'Regras de ciclo de vida compreendidas pelo motorista.',
        targetNav: 'corridas',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },
  {
    id: 'financeiro',
    scope: 'driver',
    title: 'Assistente Financeiro & Transparência TCO',
    subtitle: 'Ajuste custos fixos, registe despesas e inspecione fórmulas auditáveis.',
    category: 'Gestão Financeira',
    estimatedMinutes: 2,
    relatedNavIds: ['financeiro'],
    steps: [
      {
        id: 'fin-step-review',
        title: '1. Conferir modelo de custo e despesas',
        goal: 'Garantir que energia, comissões e aluguer/prestação estão corretos.',
        instruction: 'Revise os cartões financeiros e clique em "Como foi calculado?" para auditar.',
        expectedResult: 'Indicadores financeiros compreendidos.',
        targetNav: 'financeiro',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },
  {
    id: 'relatorios',
    scope: 'driver',
    title: 'Assistente dos 9 Sub-Relatórios & Exportação',
    subtitle: 'Isole dados Reais vs Demo e exporte relatórios limpos em CSV, XLSX ou PDF.',
    category: 'Análise & Exportação',
    estimatedMinutes: 2,
    relatedNavIds: ['relatorios'],
    steps: [
      {
        id: 'rel-step-scope',
        title: '1. Confirmar período e âmbito Real vs Demo',
        goal: 'Nunca misturar simulações com dados reais de contabilidade.',
        instruction: 'Selecione o período e o filtro "Apenas Reais" ou "Todos" no topo dos relatórios.',
        expectedResult: 'Filtros e sub-relatórios verificados.',
        targetNav: 'relatorios',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },
  {
    id: 'veiculos',
    scope: 'driver',
    title: 'Assistente de Veículos & Energia EV',
    subtitle: 'Selecione a viatura ativa, ajuste tarifas de energia e compare modelos.',
    category: 'Frota & Energia',
    estimatedMinutes: 2,
    relatedNavIds: ['veiculos', 'comparador-veiculos'],
    steps: [
      {
        id: 'veh-step-active',
        title: '1. Confirmar veículo ativo do turno',
        goal: 'Alimentar a calculadora com o custo/km e autonomia real da viatura certa.',
        instruction: 'Verifique a viatura marcada como Ativa e as tarifas energéticas aplicadas.',
        expectedResult: 'Veículo ativo identificado no sistema.',
        targetNav: 'veiculos',
        verificationType: 'auto_state',
        validatorKey: 'has_active_vehicle',
      },
    ],
  },
  {
    id: 'locais-rotas',
    scope: 'driver',
    title: 'Assistente de Zonas & Terreno',
    subtitle: 'Configure zonas favoritas/a evitar e registe observações reais com consentimento.',
    category: 'Terreno & Radar',
    estimatedMinutes: 2,
    relatedNavIds: ['locais-rotas', 'mapas-zonas'],
    steps: [
      {
        id: 'loc-step-obs',
        title: '1. Consultar radar e alertas de recolha segura',
        goal: 'Evitar multas em zonas restritas e usar pontos seguros alternativos.',
        instruction: 'Explore as zonas ativas, alternativas de recolha ou registe uma observação de terreno.',
        expectedResult: 'Observações e regras de zona consultadas.',
        targetNav: 'locais-rotas',
        verificationType: 'auto_or_confirm',
        validatorKey: 'has_zone_observations',
      },
    ],
  },
  {
    id: 'apps-integracoes',
    scope: 'driver',
    title: 'Assistente de Aplicações por País & Cidade',
    subtitle: 'Veja apenas apps com operação confirmada e ativa na sua cidade atual.',
    category: 'Personalização · Mercados',
    estimatedMinutes: 1,
    relatedNavIds: ['apps-integracoes'],
    steps: [
      {
        id: 'apps-step-market',
        title: '1. Confirmar mercado/cidade e apps operacionais',
        goal: 'Ocultar apps encerradas, suspensas ou sem operação local confirmada.',
        instruction: 'Confirme a localização atual (ex.: Lisboa/PT mostra Uber & Bolt; Madrid/ES inclui Cabify & FREE NOW) e ative apenas as que usa.',
        expectedResult: 'Seleção local alinhada com o catálogo operacional verificado.',
        targetNav: 'apps-integracoes',
        targetSelector: '[data-guide-target="driver-operational-platforms"]',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },
  {
    id: 'diagnostico',
    scope: 'driver',
    title: 'Assistente de Diagnóstico & Prontidão Multiplataforma',
    subtitle: 'Verifique API Express, capacidade do dispositivo e transparência entre Web/PWA e Nativo.',
    category: 'Apoio Técnico',
    estimatedMinutes: 1,
    relatedNavIds: ['diagnostico'],
    steps: [
      {
        id: 'diag-step-check',
        title: '1. Auditar estado real da API e matriz multiplataforma',
        goal: 'Distinguir o que corre hoje na Web/PWA do que é nativo Android/iOS.',
        instruction: 'Consulte os indicadores de servidor, persistência e os 11 eventos auditados.',
        expectedResult: 'Estado técnico auditado pelo utilizador.',
        targetNav: 'diagnostico',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },

  // =========================================================================
  // AIVAD MANAGEMENT (ADMIN) — FILTRADO POR RBAC
  // =========================================================================
  {
    id: 'admin-orgs',
    scope: 'admin',
    title: 'Gestão de Organizações & Frotas (Tenant Isolation)',
    subtitle: 'Crie frotas TVDE, associe membros e valide isolamento estrito entre organizações.',
    category: 'Gestão · Organizações',
    estimatedMinutes: 2,
    relatedNavIds: ['organizacoes'],
    requiredAdminTab: 'organizacoes',
    steps: [
      {
        id: 'adm-org-1',
        title: '1. Rever isolamento multi-tenant e criar/gerir frota',
        goal: 'Garantir que cada operador/frota vê apenas os seus membros e veículos.',
        instruction: 'Inspecione a lista de organizações e teste a associação de motoristas.',
        expectedResult: 'Regras de isolamento verificadas na consola.',
        targetNav: 'organizacoes',
        targetSelector: '[data-guide-target="admin-orgs-panel"]',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },
  {
    id: 'admin-drivers',
    scope: 'admin',
    title: 'Gestão de Utilizadores, Motoristas & Equipas',
    subtitle: 'Gira estados de conta, planos associados e consentimento RGPD para suporte.',
    category: 'Gestão · Utilizadores',
    estimatedMinutes: 2,
    relatedNavIds: ['utilizadores'],
    requiredAdminTab: 'utilizadores',
    steps: [
      {
        id: 'adm-drv-1',
        title: '1. Auditar contas e consentimento de privacidade',
        goal: 'Respeitar bloqueio de dados privados quando não há consentimento.',
        instruction: 'Verifique os estados dos motoristas, planos e flags de consentimento de suporte.',
        expectedResult: 'Políticas de acesso e privacidade verificadas.',
        targetNav: 'utilizadores',
        targetSelector: '[data-guide-target="admin-users-panel"]',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },
  {
    id: 'admin-vehicles',
    scope: 'admin',
    title: 'Gestão de Elegibilidade & Regras de Veículos',
    subtitle: 'Valide idades máximas, dísticos, emissões e compatibilidade por mercado.',
    category: 'Gestão · Veículos',
    estimatedMinutes: 2,
    relatedNavIds: ['veiculos-eleg'],
    requiredAdminTab: 'veiculos-eleg',
    steps: [
      {
        id: 'adm-veh-1',
        title: '1. Rever critérios legais de elegibilidade por país',
        goal: 'Manter a frota dentro das exigências locais TVDE.',
        instruction: 'Consulte a matriz de idade máxima e estado de elegibilidade das viaturas.',
        expectedResult: 'Regras de viaturas validadas.',
        targetNav: 'veiculos-eleg',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },
  {
    id: 'admin-markets',
    scope: 'admin',
    title: 'Assistente de Mercados Internacionais & Revalidação',
    subtitle: 'Gira escalões (Ativos vs Configurados vs Suportados) e atualize verificações antigas.',
    category: 'Gestão · Expansão',
    estimatedMinutes: 2,
    relatedNavIds: ['paises'],
    requiredAdminTab: 'paises',
    steps: [
      {
        id: 'adm-mkt-1',
        title: '1. Identificar mercados com verificação desatualizada (>365 dias)',
        goal: 'Sinalizar países de 2025 antes de promover operação real ao motorista.',
        instruction: 'Localize países com o selo "Verificação desatualizada" e clique em "Revalidar Agora" ou adicione uma cidade.',
        expectedResult: 'Controlo editorial de atualidade validado em Administração.',
        targetNav: 'paises',
        targetSelector: '[data-guide-target="admin-markets-panel"]',
        verificationType: 'auto_or_confirm',
        validatorKey: 'admin_revalidated',
      },
    ],
  },
  {
    id: 'admin-platforms',
    scope: 'admin',
    title: 'Matriz Global de Plataformas & Validação Geográfica',
    subtitle: 'Distinga encerramentos locais (ex.: Cabify/FREE NOW em PT) de mercados onde operam.',
    category: 'Gestão · Plataformas',
    estimatedMinutes: 2,
    relatedNavIds: ['plataformas'],
    requiredAdminTab: 'plataformas',
    steps: [
      {
        id: 'adm-plat-1',
        title: '1. Auditar catálogo completo e revalidar operação por país',
        goal: 'Manter o catálogo global completo no Management enquanto protege a interface do motorista.',
        instruction: 'Consulte as marcas encerradas/suspensas preservadas no Management e teste revalidar ou editar um país.',
        expectedResult: 'Separação entre catálogo global de gestão e lista limpa do motorista validada.',
        targetNav: 'plataformas',
        targetSelector: '[data-guide-target="admin-platforms-matrix"]',
        verificationType: 'auto_or_confirm',
        validatorKey: 'admin_revalidated',
      },
    ],
  },
  {
    id: 'admin-reports',
    scope: 'admin',
    title: 'Relatórios Executivos & KPIs Consolidados',
    subtitle: 'Analise receita SaaS, subscrições, frotas e métricas agregadas.',
    category: 'Gestão · Relatórios',
    estimatedMinutes: 1,
    relatedNavIds: ['relatorios-admin'],
    requiredAdminTab: 'relatorios-admin',
    steps: [
      {
        id: 'adm-rep-1',
        title: '1. Consultar indicadores executivos e exportação',
        goal: 'Acompanhar métricas SaaS e adoção por país.',
        instruction: 'Verifique os relatórios administrativos e filtros por mercado.',
        expectedResult: 'Métricas administrativas consultadas.',
        targetNav: 'relatorios-admin',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },
  {
    id: 'admin-cms',
    scope: 'admin',
    title: 'Gestão CMS do Portal Público (Rascunho -> Publicado)',
    subtitle: 'Edite textos em rascunho seguro, publique com versão e execute rollback.',
    category: 'Gestão · CMS',
    estimatedMinutes: 2,
    relatedNavIds: ['editor-paginas', 'gestao-visual'],
    requiredAdminTab: 'editor-paginas',
    steps: [
      {
        id: 'adm-cms-1',
        title: '1. Testar fluxo Rascunho vs Publicação oficial',
        goal: 'Garantir que sessões Demo nunca alteram o site público global.',
        instruction: 'Verifique os controlos de Rascunho, Publicação e Histórico de Revisões.',
        expectedResult: 'Fluxo CMS editorial validado.',
        targetNav: 'editor-paginas',
        targetSelector: '[data-guide-target="admin-cms-editor"]',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },
  {
    id: 'admin-audit',
    scope: 'admin',
    title: 'Segurança, RBAC & Auditoria de Eventos',
    subtitle: 'Verifique negações RBAC, revogação de sessões no servidor e logs imutáveis.',
    category: 'Gestão · Segurança',
    estimatedMinutes: 2,
    relatedNavIds: ['auditoria', 'seguranca'],
    requiredAdminTab: 'auditoria',
    steps: [
      {
        id: 'adm-aud-1',
        title: '1. Inspecionar registos RBAC e eventos críticos',
        goal: 'Assegurar rastreabilidade completa de acessos e alterações administrativas.',
        instruction: 'Consulte a tabela de auditoria cronológica e o painel de segurança.',
        expectedResult: 'Trilho de auditoria inspecionado.',
        targetNav: 'auditoria',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
    ],
  },

  // =========================================================================
  // SITE PÚBLICO (PORTAL)
  // =========================================================================
  {
    id: 'portal-tour',
    scope: 'portal',
    title: 'Visita Guiada ao Ecossistema AIVAD',
    subtitle: 'Descubra o simulador de rentabilidade, plataformas válidas por país e a diferença Driver vs Management.',
    category: 'Portal Público',
    estimatedMinutes: 2,
    relatedNavIds: ['inicio', 'plataformas', 'mercados', 'funcionalidades', 'planos'],
    steps: [
      {
        id: 'por-step-sim',
        title: '1. Testar Simulador Interativo de Viabilidade',
        goal: 'Ver em segundos como €/km e líquido real são calculados antes de aceitar.',
        instruction: 'Experimente ajustar um cenário no simulador do Portal para ver a recomendação Verde/Amarelo/Vermelho.',
        expectedResult: 'Simulação interativa executada pelo visitante.',
        targetNav: 'inicio',
        targetSelector: '[data-guide-target="portal-simulator"]',
        verificationType: 'auto_or_confirm',
        validatorKey: 'portal_simulator',
      },
      {
        id: 'por-step-platforms',
        title: '2. Explorar plataformas filtradas por país real',
        goal: 'Comprovar transparência entre mercados ativos e plataformas encerradas ou em validação.',
        instruction: 'Navegue até "Plataformas" e alterne entre Portugal, Espanha e Brasil.',
        expectedResult: 'Catálogo transparente consultado sem promessas irreais.',
        targetNav: 'plataformas',
        targetSelector: '[data-guide-target="portal-platforms"]',
        verificationType: 'user_confirm',
        validatorKey: 'user_confirm',
      },
      {
        id: 'por-step-compare',
        title: '3. Comparar AIVAD Driver vs AIVAD Management',
        goal: 'Compreender o ecossistema completo para motoristas independentes e frotas.',
        instruction: 'Consulte os perfis disponíveis e clique para testar a Demonstração ou criar conta real.',
        expectedResult: 'Visitante conhece ambos os módulos e opções de entrada.',
        targetNav: 'inicio',
        targetSelector: '[data-guide-target="portal-access-cards"]',
        verificationType: 'auto_or_confirm',
        validatorKey: 'portal_comparison',
      },
    ],
  },
];

export function getAssistantsForScope(
  scope: AssistantScope,
  adminRole?: UserRole | null
): AssistantDefinition[] {
  return INTERACTIVE_ASSISTANTS.filter((a) => {
    if (a.scope !== scope) return false;
    if (scope === 'admin' && a.requiredAdminTab) {
      return canAccessAdminTab(adminRole, a.requiredAdminTab);
    }
    return true;
  });
}

export function createInitialAssistantProgress(assistantId: string): AssistantProgressRecord {
  const def = INTERACTIVE_ASSISTANTS.find((a) => a.id === assistantId);
  const stepStatuses: Record<string, AssistantStepStatus> = {};
  if (def) {
    def.steps.forEach((st, idx) => {
      stepStatuses[st.id] = idx === 0 ? 'Em andamento' : 'Por iniciar';
    });
  }
  return {
    assistantId,
    status: 'Em curso',
    currentStepIndex: 0,
    stepStatuses,
    stepNotes: {},
    userConfirmedStepIds: [],
    skippedStepIds: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function evaluateAssistantStepVerification(
  step: AssistantStep,
  progress: AssistantProgressRecord,
  ctx: AssistantEvaluationContext
): StepVerificationOutcome {
  const isConfirmedByUser = progress.userConfirmedStepIds.includes(step.id);

  switch (step.validatorKey) {
    case 'fc_layout': {
      if (isConfirmedByUser || ctx.overlayConfig.layoutMode === 'compacto' || ctx.overlayConfig.layoutMode === 'expandido') {
        return {
          status: 'Concluído',
          detail: `Modo "${ctx.overlayConfig.layoutMode ?? 'compacto'}" definido no estúdio.`,
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Selecione Compacto ou Expandido.',
        requiresUserConfirmation: true,
      };
    }

    case 'fc_colors': {
      const hasCustom =
        Boolean(ctx.overlayConfig.useCustomColors) ||
        ctx.overlayConfig.bgColor.toUpperCase() !== '#FFFFFF' ||
        ctx.overlayConfig.borderColor.toUpperCase() !== '#1D4ED8';
      if (hasCustom || isConfirmedByUser) {
        return {
          status: 'Concluído',
          detail: `Fundo ${ctx.overlayConfig.bgColor} · Borda ${ctx.overlayConfig.borderColor} (${ctx.overlayConfig.borderWidthPx ?? 2}px) configurados.`,
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Ajuste as cores/contorno ou confirme se deseja manter o padrão atual.',
        requiresUserConfirmation: true,
      };
    }

    case 'fc_position': {
      if (ctx.overlayConfig.position || isConfirmedByUser) {
        return {
          status: 'Concluído',
          detail: `Posição "${ctx.overlayConfig.position}" com margem segura de ${ctx.overlayConfig.marginOffsetPx ?? 12}px.`,
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Falhou',
        detail: 'Nenhuma posição selecionada.',
        requiresUserConfirmation: false,
      };
    }

    case 'fc_dock': {
      if (
        isConfirmedByUser ||
        ctx.floatingDockConfig.themeTone === 'personalizado' ||
        ctx.floatingDockConfig.bgColor !== '#1D4ED8'
      ) {
        return {
          status: 'Concluído',
          detail: `Atalhos AIVAD configurados de forma independente (${ctx.floatingDockConfig.position}).`,
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Personalize o botão Atalhos AIVAD ou avance por ser opcional.',
        requiresUserConfirmation: true,
      };
    }

    case 'fc_preview_opened': {
      if (ctx.floatingPreviewOpened) {
        return {
          status: 'Concluído',
          detail: 'Pré-visualização interativa aberta com palco multi-dispositivo.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Clique no botão "Pré-visualizar" para validar o cartão antes de guardar.',
        requiresUserConfirmation: false,
      };
    }

    case 'fc_saved': {
      if (ctx.floatingConfigSavedCount > 0) {
        return {
          status: 'Concluído',
          detail: `Configuração guardada (${ctx.overlayConfig.bgColor} · borda ${ctx.overlayConfig.borderColor} · ${ctx.overlayConfig.position}).`,
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Falhou',
        detail: 'As alterações ainda não foram guardadas no perfil (clique em "Guardar Alterações").',
        requiresUserConfirmation: false,
      };
    }

    case 'voice_device_check': {
      if (!ctx.voiceSupported && ctx.voiceConfig.deliveryMode === 'Apenas Voz') {
        return {
          status: 'Não suportado neste dispositivo',
          detail: 'Este navegador/dispositivo não expõe síntese de voz (Web Speech API). Mude para "Visual + Voz" para usar o banner visual.',
          requiresUserConfirmation: false,
        };
      }
      if (!ctx.voiceSupported) {
        return {
          status: 'Não suportado neste dispositivo',
          detail: 'Áudio Web Speech indisponível neste ambiente; fallback visual ativo para segurança.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Concluído',
        detail: `Motor vocal suportado · Modo "${ctx.voiceConfig.deliveryMode}" ativo.`,
        requiresUserConfirmation: false,
      };
    }

    case 'voice_lang_check': {
      if (ctx.voiceConfig.language && ctx.voiceConfig.speechRate >= 0.7) {
        return {
          status: 'Concluído',
          detail: `Idioma ${ctx.voiceConfig.language} · Velocidade ${ctx.voiceConfig.speechRate}x.`,
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Falhou',
        detail: 'Defina idioma e velocidade válidos.',
        requiresUserConfirmation: false,
      };
    }

    case 'voice_categories_check': {
      const enabledCount = Object.values(ctx.voiceConfig.categories).filter(Boolean).length;
      if (enabledCount >= 2) {
        return {
          status: 'Concluído',
          detail: `${enabledCount} categorias de alerta ativas.`,
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Falhou',
        detail: 'Ative pelo menos 2 categorias de alerta vocal.',
        requiresUserConfirmation: false,
      };
    }

    case 'voice_tested': {
      if (ctx.voiceTestCount > 0) {
        return {
          status: 'Concluído',
          detail: 'Anúncio de teste disparado na fila vocal/visual.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Clique em "Testar Anúncio de Proposta" para concluir a verificação.',
        requiresUserConfirmation: false,
      };
    }

    case 'autopilot_mode': {
      return {
        status: 'Concluído',
        detail: `Modo ativo: ${ctx.autoPilot.mode}.`,
        requiresUserConfirmation: false,
      };
    }

    case 'autopilot_thresholds': {
      if (ctx.autoPilot.thresholds.minEurPerKm > 0 && ctx.autoPilot.thresholds.minEurPerHour > 0) {
        return {
          status: 'Concluído',
          detail: `Mínimos definidos: €${ctx.autoPilot.thresholds.minEurPerKm.toFixed(2)}/km e €${ctx.autoPilot.thresholds.minEurPerHour.toFixed(0)}/h.`,
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Falhou',
        detail: 'Defina valores positivos de €/km e €/hora.',
        requiresUserConfirmation: false,
      };
    }

    case 'autopilot_preset': {
      if (ctx.autoPilotSavedCount > 0 || (ctx.autoPilot.savedPresets?.length ?? 0) > 0 || isConfirmedByUser) {
        return {
          status: 'Concluído',
          detail: 'Regras/presets verificados.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Guarde um preset ou confirme as regras atuais.',
        requiresUserConfirmation: true,
      };
    }

    case 'autopilot_automation_auth': {
      const hasExecPerm =
        ctx.autoPilot.officialAutomationAuthorized ||
        ctx.connectors.uber.externalControlPermissionGranted ||
        ctx.connectors.bolt.externalControlPermissionGranted;
      if (hasExecPerm) {
        return {
          status: 'Concluído',
          detail: 'Canal de execução autorizado configurado.',
          requiresUserConfirmation: false,
        };
      }
      if (ctx.autoPilot.mode === 'Automático') {
        return {
          status: 'Pendente de integração',
          detail: 'Sem API/Bridge oficial autorizado: o modo Automático executa em fallback assistido (não aceita corridas sozinho).',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Pendente de integração',
        detail: 'Execução automática externa desativada (modo atual opera em apoio ao motorista).',
        requiresUserConfirmation: false,
      };
    }

    case 'connectors_permissions': {
      const anyRead =
        ctx.connectors.uber.readCapturePermissionGranted ||
        ctx.connectors.bolt.readCapturePermissionGranted;
      if (anyRead) {
        return {
          status: 'Concluído',
          detail: 'Permissão de leitura/captura autorizada em pelo menos um conector.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Pendente de permissão',
        detail: 'Nenhuma permissão de leitura/captura está ativada nos conectores.',
        requiresUserConfirmation: false,
      };
    }

    case 'connectors_tested': {
      if (ctx.connectors.uber.testResults.length > 0 || ctx.connectors.bolt.testResults.length > 0) {
        return {
          status: 'Concluído',
          detail: 'Suite de verificação técnica executada com registo.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Execute Nível 1, Nível 2 ou Nível 3 num dos conectores.',
        requiresUserConfirmation: false,
      };
    }

    case 'connectors_real_oauth': {
      const isAuthorizedState = (st: string) =>
        st === 'Autorizado (Leitura)' || st === 'Autorizado (Leitura + Execução)';
      const uberReal =
        isAuthorizedState(ctx.connectors.uber.connectionState) &&
        ctx.connectors.uber.serverVaultConfigured;
      const boltReal =
        isAuthorizedState(ctx.connectors.bolt.connectionState) &&
        ctx.connectors.bolt.serverVaultConfigured;
      if (uberReal || boltReal) {
        return {
          status: 'Concluído',
          detail: 'Pelo menos uma integração oficial com credenciais de servidor está validada.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Pendente de integração',
        detail: 'Conectores permanecem em "Não configurado" ou "Sandbox" — nunca marcados como concluídos sem credenciais reais.',
        requiresUserConfirmation: false,
      };
    }

    case 'tachograph_active': {
      if (ctx.tachographActiveSession) {
        return {
          status: 'Concluído',
          detail: 'Turno TVDE ativo e monitorizado na janela 24h.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Inicie um turno no módulo TACÓGRAFO com o odómetro inicial.',
        requiresUserConfirmation: false,
      };
    }

    case 'has_proposals': {
      if (ctx.proposalsCount > 0) {
        return {
          status: 'Concluído',
          detail: `${ctx.proposalsCount} proposta(s) registadas e analisadas.`,
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Calcule ou simule uma proposta na calculadora.',
        requiresUserConfirmation: false,
      };
    }

    case 'has_active_vehicle': {
      if (ctx.activeVehicleId && ctx.vehiclesCount > 0) {
        return {
          status: 'Concluído',
          detail: `Viatura ativa (${ctx.activeVehicleId}) associada aos cálculos.`,
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Falhou',
        detail: 'Selecione uma viatura ativa.',
        requiresUserConfirmation: false,
      };
    }

    case 'has_zone_observations': {
      if (ctx.zoneObservationsCount > 0 || isConfirmedByUser) {
        return {
          status: 'Concluído',
          detail: `${ctx.zoneObservationsCount} observação(ões) de terreno disponíveis.`,
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Consulte ou adicione uma observação de zona.',
        requiresUserConfirmation: true,
      };
    }

    case 'admin_revalidated': {
      if (ctx.adminRevalidationCount > 0 || isConfirmedByUser) {
        return {
          status: 'Concluído',
          detail: ctx.adminRevalidationCount > 0
            ? `${ctx.adminRevalidationCount} registo(s) revalidado(s) pela administração.`
            : 'Confirmado pelo administrador.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Execute uma revalidação com "Revalidar Agora" ou confirme após inspeção.',
        requiresUserConfirmation: true,
      };
    }

    case 'portal_simulator': {
      if (ctx.portalSimulatorTested || isConfirmedByUser) {
        return {
          status: 'Concluído',
          detail: 'Simulador de rentabilidade do Portal testado.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Altere o valor da corrida no simulador ou confirme a visualização.',
        requiresUserConfirmation: true,
      };
    }

    case 'portal_comparison': {
      if (ctx.portalComparisonViewed || isConfirmedByUser) {
        return {
          status: 'Concluído',
          detail: 'Comparação AIVAD Driver vs Management concluída.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Consulte os cartões de acesso Driver e Management e confirme.',
        requiresUserConfirmation: true,
      };
    }

    case 'user_confirm':
    default: {
      if (isConfirmedByUser) {
        return {
          status: 'Concluído',
          detail: 'Confirmado pelo utilizador.',
          requiresUserConfirmation: false,
        };
      }
      return {
        status: 'Em andamento',
        detail: 'Aguarda verificação explícita ("Confirmado pelo utilizador").',
        requiresUserConfirmation: true,
      };
    }
  }
}

export function applyStepConfirmationToProgress(
  progress: AssistantProgressRecord,
  step: AssistantStep,
  outcome: StepVerificationOutcome
): AssistantProgressRecord {
  const def = INTERACTIVE_ASSISTANTS.find((a) => a.id === progress.assistantId);
  const nextStatuses = { ...progress.stepStatuses, [step.id]: outcome.status };
  const nextNotes = { ...progress.stepNotes, [step.id]: outcome.detail };
  const totalSteps = def?.steps.length ?? 1;
  const allClosed = def
    ? def.steps.every((s) => {
        const st = nextStatuses[s.id];
        return (
          st === 'Concluído' ||
          progress.skippedStepIds.includes(s.id) ||
          st === 'Pendente de integração' ||
          st === 'Não suportado neste dispositivo'
        );
      })
    : false;
  const allStrictlyDone = def
    ? def.steps.every(
        (s) => nextStatuses[s.id] === 'Concluído' || progress.skippedStepIds.includes(s.id)
      )
    : false;

  const isTerminal =
    outcome.status === 'Concluído' ||
    outcome.status === 'Pendente de integração' ||
    outcome.status === 'Não suportado neste dispositivo';

  const nextIdx = isTerminal
    ? Math.min(totalSteps - 1, progress.currentStepIndex + 1)
    : progress.currentStepIndex;

  return {
    ...progress,
    currentStepIndex: nextIdx,
    stepStatuses: nextStatuses,
    stepNotes: nextNotes,
    status: allStrictlyDone || (allClosed && nextIdx === totalSteps - 1 && isTerminal) ? 'Concluído' : 'Em curso',
    updatedAt: new Date().toISOString(),
    completedAt: allStrictlyDone ? new Date().toISOString() : progress.completedAt,
  };
}

export function confirmAssistantStepByUser(
  progress: AssistantProgressRecord,
  stepId: string
): AssistantProgressRecord {
  const userConfirmedStepIds = progress.userConfirmedStepIds.includes(stepId)
    ? progress.userConfirmedStepIds
    : [...progress.userConfirmedStepIds, stepId];
  return {
    ...progress,
    userConfirmedStepIds,
    stepStatuses: {
      ...progress.stepStatuses,
      [stepId]: 'Concluído',
    },
    stepNotes: {
      ...progress.stepNotes,
      [stepId]: 'Confirmado pelo utilizador.',
    },
    updatedAt: new Date().toISOString(),
  };
}

export function skipOptionalAssistantStep(
  progress: AssistantProgressRecord,
  step: AssistantStep
): AssistantProgressRecord {
  if (!step.optional) return progress;
  const def = INTERACTIVE_ASSISTANTS.find((a) => a.id === progress.assistantId);
  const total = def?.steps.length ?? 1;
  const skippedStepIds = progress.skippedStepIds.includes(step.id)
    ? progress.skippedStepIds
    : [...progress.skippedStepIds, step.id];
  return {
    ...progress,
    skippedStepIds,
    currentStepIndex: Math.min(total - 1, progress.currentStepIndex + 1),
    stepNotes: {
      ...progress.stepNotes,
      [step.id]: 'Passo opcional ignorado pelo utilizador.',
    },
    updatedAt: new Date().toISOString(),
  };
}

export function pauseAssistantProgress(progress: AssistantProgressRecord): AssistantProgressRecord {
  return {
    ...progress,
    status: progress.status === 'Concluído' ? 'Concluído' : 'Pausado',
    updatedAt: new Date().toISOString(),
  };
}

export function resumeAssistantProgress(progress: AssistantProgressRecord): AssistantProgressRecord {
  return {
    ...progress,
    status: progress.status === 'Concluído' ? 'Concluído' : 'Em curso',
    updatedAt: new Date().toISOString(),
  };
}
