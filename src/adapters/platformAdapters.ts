export interface PlatformAdapterStatus {
  os: 'Web / PWA' | 'Android Native Bridge' | 'iOS Apple Ready';
  capability: string;
  supportedNow: boolean;
  requiresNativeModule: boolean;
  integrationState: 'Operacional na Web' | 'INTEGRAÇÃO A VALIDAR' | 'Em Investigação / Prototipagem';
  notes: string;
}

export const PLATFORM_ADAPTERS: PlatformAdapterStatus[] = [
  {
    os: 'Web / PWA',
    capability: 'Motor central AIVAD, Calculadora, Relatórios, Financeiro, Planeador & Offline Cache',
    supportedNow: true,
    requiresNativeModule: false,
    integrationState: 'Operacional na Web',
    notes: 'Compatível com Chrome Android, Safari iPhone e navegadores desktop. Não promete overlay sobre outras apps via navegador.',
  },
  {
    os: 'Android Native Bridge',
    capability: 'Cartão flutuante (SYSTEM_ALERT_WINDOW) & Botão flutuante de histórico',
    supportedNow: false,
    requiresNativeModule: true,
    integrationState: 'INTEGRAÇÃO A VALIDAR',
    notes: 'Contrato de configuração visível na Web; renderização de janela sobreposta reservada ao módulo nativo Android.',
  },
  {
    os: 'Android Native Bridge',
    capability: 'Notificações autorizadas (NotificationListenerService) & Smart Data Capture em segundo plano',
    supportedNow: false,
    requiresNativeModule: true,
    integrationState: 'INTEGRAÇÃO A VALIDAR',
    notes: 'Depende de consentimento explícito do utilizador e conformidade com políticas Google Play.',
  },
  {
    os: 'iOS Apple Ready',
    capability: 'Atalhos iOS, Captura OCR voluntária, Live Activities & Dynamic Island',
    supportedNow: false,
    requiresNativeModule: true,
    integrationState: 'Em Investigação / Prototipagem',
    notes: 'Não promete janela flutuante universal sobre Uber/Bolt no iOS. Análise comercial iOS aguarda testes reais em dispositivo Apple.',
  },
];

export interface ExternalIntegrationContract {
  id: string;
  name: string;
  category: 'Mobilidade' | 'Pagamentos' | 'Mapas & Carregamento' | 'Legislação' | 'IA';
  mode: 'Simulado para Testes' | 'API Oficial Pendente';
  statusLabel: 'INTEGRAÇÃO A VALIDAR' | 'Simulação Local Ativa';
  description: string;
}

export const EXTERNAL_INTEGRATIONS: ExternalIntegrationContract[] = [
  {
    id: 'ext-uber-api',
    name: 'Uber Driver / Fleet API',
    category: 'Mobilidade',
    mode: 'API Oficial Pendente',
    statusLabel: 'INTEGRAÇÃO A VALIDAR',
    description: 'Receção de viagens, ganhos, gorjetas e nível Uber Pro sujeita a parceria e OAuth oficial.',
  },
  {
    id: 'ext-bolt-api',
    name: 'Bolt Partner / Driver API',
    category: 'Mobilidade',
    mode: 'API Oficial Pendente',
    statusLabel: 'INTEGRAÇÃO A VALIDAR',
    description: 'Sincronização de campanhas, viagens agendadas e métricas Bolt via adaptador autorizado.',
  },
  {
    id: 'ext-billing',
    name: 'Faturação Web, Google Play & Apple IAP',
    category: 'Pagamentos',
    mode: 'API Oficial Pendente',
    statusLabel: 'INTEGRAÇÃO A VALIDAR',
    description: 'Adaptadores preparados por mercado e moeda para subscrições SaaS recorrentes.',
  },
  {
    id: 'ext-imtt-diario',
    name: 'Diário da República & IMT TVDE',
    category: 'Legislação',
    mode: 'Simulado para Testes',
    statusLabel: 'INTEGRAÇÃO A VALIDAR',
    description: 'Monitorização de diplomas TVDE com validação humana obrigatória antes de publicação.',
  },
  {
    id: 'ext-ev-chargers',
    name: 'Rede MOBI.E / Postos de Carregamento',
    category: 'Mapas & Carregamento',
    mode: 'Simulado para Testes',
    statusLabel: 'INTEGRAÇÃO A VALIDAR',
    description: 'Camada de mapa com dados demonstrativos até ligação de feed em tempo real.',
  },
];
