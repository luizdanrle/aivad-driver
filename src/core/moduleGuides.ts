export type HonestOperationalStatus =
  | 'Operacional'
  | 'Operacional (Web/PWA)'
  | 'Demonstração / Sandbox'
  | 'Não configurado'
  | 'Preparação Nativa (Windsurf)';

export interface DriverModuleGuide {
  id: string;
  title: string;
  subtitle: string;
  categoryLabel: string;
  /** 1. O que é este módulo? */
  whatIsIt: string;
  /** 2. Para que serve? */
  whatFor: string;
  /** 3. Quando devo utilizar? */
  whenToUse: string;
  /** 4. Como funciona? */
  howItWorks: string;
  /** 5. O que preciso de configurar? */
  whatToConfigure: string;
  /** 6. Depende de alguma integração? */
  integrationDependency: string;
  /** 7. Está operacional, em demonstração ou ainda em preparação? */
  operationalStatus: HonestOperationalStatus;
  operationalDetail: string;
  practicalExample: string;
  quickSteps: string[];
  primaryAction?: {
    label: string;
    targetNav?: string;
  };
}

export interface OnboardingStepDefinition {
  id: string;
  stepNumber: number;
  title: string;
  shortGoal: string;
  explanation: string;
  actionLabel: string;
  targetNav: string;
  estimatedTime: string;
}

export interface ProgressiveOnboardingState {
  dismissed: boolean;
  currentStepIndex: number;
  completedStepIds: string[];
  lastUpdatedIso: string;
}

export const DRIVER_ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    id: 'step-cockpit',
    stepNumber: 1,
    title: 'Conhecer o Painel Principal e Metas',
    shortGoal: 'Ver líquido real, eficiência €/h e estado do turno num só ecrã.',
    explanation:
      'O Painel Principal reúne os seus ganhos líquidos (já sem canceladas e após custos do veículo), o progresso da meta semanal e o resumo de horas legais.',
    actionLabel: 'Ver Painel Principal',
    targetNav: 'dashboard',
    estimatedTime: '30 seg',
  },
  {
    id: 'step-tacografo',
    stepNumber: 2,
    title: 'Ativar o TACÓGRAFO 10h / 24h',
    shortGoal: 'Controlar o limite legal de 10h em janela deslizante de 24h entre todas as apps.',
    explanation:
      'Antes de conduzir, inicie turno com o odómetro atual. O AIVAD soma automaticamente o tempo de condução multi-app e emite avisos preventivos às 8h e 9h.',
    actionLabel: 'Abrir TACÓGRAFO',
    targetNav: 'tacografo',
    estimatedTime: '45 seg',
  },
  {
    id: 'step-propostas',
    stepNumber: 3,
    title: 'Testar Propostas & Cartão Flutuante',
    shortGoal: 'Avaliar corridas com semáforo Verde, Amarelo ou Vermelho antes de aceitar.',
    explanation:
      'Simule ou calcule uma proposta real com recolha, viagem e tarifa bruta. Veja como o Cartão Flutuante mostra €/km, €/hora, líquido estimado e risco de retorno vazio.',
    actionLabel: 'Testar Cartão Flutuante',
    targetNav: 'cartoes-flutuantes',
    estimatedTime: '1 min',
  },
  {
    id: 'step-estrategia',
    stepNumber: 4,
    title: 'Definir Estratégia & AutoPilot (3 Modos)',
    shortGoal: 'Configurar os seus mínimos de €/km, €/hora e distância máxima de recolha.',
    explanation:
      'Escolha entre modo Manual (apoio visual), Semiautomático (ajustes sugeridos com reversão) ou Automático (quando houver canal oficial autorizado).',
    actionLabel: 'Configurar Estratégia',
    targetNav: 'estrategia',
    estimatedTime: '1 min',
  },
  {
    id: 'step-aicore-voice',
    stepNumber: 5,
    title: 'Explorar AI CORE & Copiloto de Voz',
    shortGoal: 'Receber recomendações fundamentadas e leitura vocal mãos-livres gratuita.',
    explanation:
      'Consulte os 8 agentes especializados sobre os seus dados privados e ative o AIVAD Voice para ouvir avisos sem tirar os olhos da estrada.',
    actionLabel: 'Configurar AIVAD Voice',
    targetNav: 'voz-copiloto',
    estimatedTime: '45 seg',
  },
  {
    id: 'step-conectores',
    stepNumber: 6,
    title: 'Validar Conectores & Veículo Ativo',
    shortGoal: 'Confirmar consumo real do veículo e canais de importação Uber/Bolt.',
    explanation:
      'Verifique a autonomia real e tarifa energética da viatura ativa e conheça a diferença entre importação CSV/OCR operacional e conectores OAuth externos.',
    actionLabel: 'Rever Conectores',
    targetNav: 'conectores',
    estimatedTime: '45 seg',
  },
];

export const DRIVER_MODULE_GUIDES: Record<string, DriverModuleGuide> = {
  dashboard: {
    id: 'dashboard',
    title: 'Painel Principal Operacional',
    subtitle: 'Visão consolidada de rentabilidade líquida, metas semanais, eficiência €/h e conformidade legal.',
    categoryLabel: 'Visão Geral',
    whatIsIt:
      'É o centro de comando diário do motorista TVDE, reunindo indicadores financeiros reais, estado do turno, veículo ativo e briefing dos agentes IA.',
    whatFor:
      'Serve para saber num relance quanto já ganhou limpo de comissões e energia, quanto falta para a meta semanal e quantas horas legais 10h/24h ainda tem disponíveis.',
    whenToUse:
      'No início do dia para planear o turno, nas pausas para acompanhar a meta e no fecho do turno para conferir o líquido.',
    howItWorks:
      'Cruza automaticamente viagens concluídas (excluindo canceladas), despesas registadas, custo por km da viatura ativa e sessões do tacógrafo.',
    whatToConfigure:
      'Confirme a sua localização/mercado no topo, selecione o veículo ativo e defina a sua meta líquida semanal no Planeador.',
    integrationDependency:
      'Funciona 100% com viagens registadas ou importadas via CSV/OCR; sincroniza com o servidor Express quando autenticado.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Cálculos financeiros, filtros multi-plataforma, gráficos interativos e sincronização de estado estão totalmente operacionais.',
    practicalExample:
      'Clique numa barra do gráfico "Resumo por Plataforma" para filtrar instantaneamente todos os KPIs apenas para Uber ou Bolt.',
    quickSteps: [
      'Escolha o período ("Hoje" ou "Todo o período") e a plataforma pretendida.',
      'Clique no ícone "?" de qualquer cartão KPI para ver a fórmula exata aplicada.',
      'Use os atalhos rápidos para abrir o Tacógrafo, Analisar Proposta ou consultar o AI CORE.',
    ],
    primaryAction: { label: 'Analisar Nova Proposta', targetNav: 'calculadora' },
  },

  'ai-core': {
    id: 'ai-core',
    title: 'AIVAD AI CORE · Inteligência Multi-Agente',
    subtitle: 'Oito especialistas analíticos que avaliam rentabilidade, energia, risco legal e aprendizagem isolada.',
    categoryLabel: 'Visão Geral · IA',
    whatIsIt:
      'É o cérebro analítico do AIVAD composto por 8 agentes especializados (Rentabilidade, Estratégia, Zonas, Energia EV, Conformidade 10h/24h, Financeiro, Captura e Aprendizagem).',
    whatFor:
      'Serve para explicar de forma transparente o porquê de cada recomendação, comparar previsões pré-viagem com resultados reais e responder a perguntas sobre a sua operação.',
    whenToUse:
      'Quando quiser perceber onde está a perder margem, quanto tempo legal resta ou validar se a sua estratégia está bem calibrada.',
    howItWorks:
      'Analisa exclusivamente os dados da sua conta (nunca mistura dados entre motoristas), etiqueta cada conclusão (Confirmada, Histórica, Estimativa) e calibra a confiança apenas quando há amostra suficiente.',
    whatToConfigure:
      'Não exige configuração manual obrigatória; quantas mais viagens e despesas reais registar, mais precisa fica a calibragem.',
    integrationDependency:
      'Opera localmente com motor determinístico auditável e usa proxy seguro de servidor (/api/ai/query) quando configurado no backend.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Motor determinístico multi-agente, livro de aprendizagem Previsto vs Real e consulta interativa estão 100% operacionais.',
    practicalExample:
      'Clique num agente (ex.: "Agente Energia & Frota") para filtrar apenas os alertas de autonomia real WLTP vs urbana.',
    quickSteps: [
      'Selecione um dos 8 especialistas ou mantenha "Todos os Agentes" para ver o briefing completo.',
      'Consulte a secção "Aprendizagem Operacional Isolada" para ver o desvio entre lucro previsto e real.',
      'Faça uma pergunta rápida usando os botões sugeridos ou escreva a sua questão.',
    ],
    primaryAction: { label: 'Ajustar Estratégia AutoPilot', targetNav: 'estrategia' },
  },

  corridas: {
    id: 'corridas',
    title: 'Corridas, Propostas & Captura Inteligente',
    subtitle: 'Calculadora pré-aceitação, ciclo de vida da viagem em tempo real e importação estruturada.',
    categoryLabel: 'Operação',
    whatIsIt:
      'É o módulo operacional onde analisa propostas recebidas, acompanha todas as fases de uma viagem ativa (recolha, espera, cancelamento, conclusão) e importa dados.',
    whatFor:
      'Serve para evitar corridas com prejuízo oculto, controlar tempos de espera pagos/no-show na recolha e transformar extratos ou texto OCR em viagens estruturadas.',
    whenToUse:
      'Sempre que receber ou simular uma oferta duvidosa, durante uma viagem em curso ou ao importar extratos semanais CSV/JSON.',
    howItWorks:
      'Desconta comissão da plataforma, energia e manutenção por km total (recolha + viagem), cruza alertas da zona de destino e classifica a corrida em Verde, Amarelo ou Vermelho.',
    whatToConfigure:
      'Verifique o custo/km do veículo ativo e os limiares mínimos de €/km e €/hora na Estratégia das Aplicações.',
    integrationDependency:
      'Calculadora, ciclo de vida e importação CSV/JSON/texto funcionam autonomamente. Captura automática de ecrã de outras apps requer bridge nativo Android.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Calculadora IA, temporizadores de recolha/espera, registo de cancelamentos e importador CSV/JSON/OCR textual operacionais.',
    practicalExample:
      'Introduza uma corrida de €6,50 com 4 km de recolha + 8 km de viagem para ver porque o líquido real cai abaixo da meta horária.',
    quickSteps: [
      'Use o separador "Calculadora & AI CORE" para simular ou avaliar uma proposta.',
      'Clique em "Aceitar e Iniciar Acompanhamento" para abrir o painel de temporizadores da viagem ativa.',
      'Use "Smart Data Capture" para colar texto de oferta ou importar ficheiros CSV/JSON.',
    ],
    primaryAction: { label: 'Personalizar Cartão Flutuante', targetNav: 'cartoes-flutuantes' },
  },

  estrategia: {
    id: 'estrategia',
    title: 'Estratégia das Aplicações & AutoPilot',
    subtitle: 'Regras de decisão em 3 modos (Manual, Semiautomático e Automático) e comparação Uber vs Bolt.',
    categoryLabel: 'Operação · AutoPilot',
    whatIsIt:
      'É o painel onde define os seus critérios mínimos de rentabilidade (€/km, €/h, valor mínimo, recolha máxima) e o nível de autonomia do AutoPilot.',
    whatFor:
      'Serve para garantir disciplina operacional, evitando aceitar corridas longas mal pagas ou recolhas distantes por impulso.',
    whenToUse:
      'Antes de iniciar o turno (para escolher perfil Hora de Ponta, Urbano ou Noturno) ou ao rever o desempenho isolado de cada aplicação.',
    howItWorks:
      'No modo Manual mostra apenas recomendação; no Semiautomático propõe calibrações graduais com botão "Reverter"; no Automático só executa quando existe canal autorizado (caso contrário aplica fallback assistido transparente).',
    whatToConfigure:
      'Defina €/km mínimo, €/hora mínimo, distância máxima de recolha e reserva mínima de bateria EV (%).',
    integrationDependency:
      'Avaliação e calibração funcionam internamente. Aceitação externa automática depende de API oficial ou serviço nativo autorizado no Android.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Motor de 3 modos, presets guardáveis, calibragem semiautomática com reversão auditável e comparador multi-app operacionais.',
    practicalExample:
      'Ative o modo Semiautomático e clique em "Executar Calibração" para ver a sugestão fundamentada com opção de reversão imediata.',
    quickSteps: [
      'Escolha o modo: Manual, Semiautomático ou Automático.',
      'Ajuste os cursores de €/km, €/hora e distância máxima de recolha.',
      'Guarde um Preset (ex.: "Chuva / Ponta") para reutilizar num toque.',
    ],
    primaryAction: { label: 'Ver Conectores Uber & Bolt', targetNav: 'conectores' },
  },

  'agenda-turnos': {
    id: 'agenda-turnos',
    title: 'Agenda, Turnos & Campanhas',
    subtitle: 'Planeamento semanal inteligente de horas, escalas de descanso e objetivos de bónus.',
    categoryLabel: 'Operação · Planeamento',
    whatIsIt:
      'É o planeador de rotina e metas do motorista, combinando agenda de turnos, calculadora de esforço diário e acompanhamento de campanhas/quests.',
    whatFor:
      'Serve para distribuir as horas de condução pelos horários mais rentáveis sem ultrapassar o limite legal de 10h/24h nem desperdiçar bónus.',
    whenToUse:
      'Ao domingo ou início da semana para definir a meta líquida semanal e registar campanhas ativas das plataformas.',
    howItWorks:
      'Calcula quantas horas produtivas por dia precisa trabalhar com base na sua meta líquida, dias disponíveis e histórico real de €/hora.',
    whatToConfigure:
      'Defina a meta líquida semanal (€), os dias de trabalho planeados e as janelas horárias preferidas.',
    integrationDependency:
      'Independente de integrações externas; alimenta automaticamente o gráfico de meta no Painel Principal.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Planeador inteligente, criação de turnos, notas operacionais e gestão de campanhas 100% operacionais.',
    practicalExample:
      'Altere a meta semanal para €650 em 5 dias e veja imediatamente a meta diária líquida e horas recomendadas.',
    quickSteps: [
      'Defina a sua meta líquida semanal e dias de operação.',
      'Adicione turnos planeados com horário de início, fim e pausa de refeição.',
      'Registe campanhas/bónus em curso para acompanhar quantas viagens faltam.',
    ],
    primaryAction: { label: 'Abrir TACÓGRAFO 10h/24h', targetNav: 'tacografo' },
  },

  tacografo: {
    id: 'tacografo',
    title: 'TACÓGRAFO (10h / 24h)',
    subtitle: 'Controlo cronológico de condução, pausas, odómetro, fila offline e QR verificável de auditoria.',
    categoryLabel: 'Operação · Conformidade',
    whatIsIt:
      'É o instrumento digital de registo dos 10 estados de atividade do motorista TVDE (Portaria n.º 7/2022), com cálculo contínuo da janela deslizante de 24 horas.',
    whatFor:
      'Serve para prevenir contraordenações por excesso das 10h máximas de condução/trabalho em 24h entre múltiplas plataformas e gerar comprovativo QR auditável.',
    whenToUse:
      'No início e fim de cada turno, e sempre que mudar entre Condução, Espera, Pausa, Refeição ou Trabalho sem condução.',
    howItWorks:
      'Valida transições de estado e coerência de odómetro, guarda eventos em fila offline se perder rede e soma tempos consolidados Uber + Bolt + outras apps.',
    whatToConfigure:
      'Introduza o odómetro inicial real do painel da viatura e o nome do operador/frota TVDE antes de iniciar turno.',
    integrationDependency:
      'Funciona offline e online autonomamente. Nota legal transparente: registo operacional auxiliar não substituto de equipamento físico homologado quando exigido.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Máquina de 10 estados, janela deslizante 24h, linha temporal, fila offline idempotente e gerador QR verificável operacionais.',
    practicalExample:
      'Clique num dos 10 estados (ex.: "Pausa") para fechar o bloco anterior, atualizar o odómetro e redesenhar a linha temporal.',
    quickSteps: [
      'Confirme o odómetro inicial e clique em "Iniciar Turno no Tacógrafo".',
      'Registe mudanças para Pausa, Refeição ou Espera durante o dia.',
      'Valide ou descarregue o Código QR de auditoria no fundo da página.',
    ],
    primaryAction: { label: 'Consultar Legislação TVDE', targetNav: 'legislacao' },
  },

  financeiro: {
    id: 'financeiro',
    title: 'Gestão Financeira & Transparência de Custos',
    subtitle: 'Apuramento rigoroso de receita bruta, comissões, energia, TCO do veículo e despesas dedutíveis.',
    categoryLabel: 'Gestão Inteligente',
    whatIsIt:
      'É o livro financeiro do motorista onde cada euro ganho é confrontado com comissões das apps, desgaste/energia por km, renda/prestação do veículo e despesas diárias.',
    whatFor:
      'Serve para saber o lucro líquido verdadeiro no bolso, sem ilusões de faturação bruta e excluindo corridas canceladas sem compensação.',
    whenToUse:
      'Ao abastecer/carregar a viatura, pagar portagens, lavagens, seguros ou rever a margem líquida semanal/mensal.',
    howItWorks:
      'Aplica fórmulas auditáveis a cada KPI e disponibiliza o botão "Como foi calculado?" com todos os valores reais incluídos na conta.',
    whatToConfigure:
      'Configure o regime do veículo (Próprio, Aluguer semanal, Leasing ou Comissão) e registe as despesas fixas e variáveis.',
    integrationDependency:
      'Independente de terceiros; recebe automaticamente custos por km do módulo Veículos e viagens do módulo Corridas.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Lançamento de despesas, configuração de TCO, reconciliação líquida e modal de transparência de fórmulas operacionais.',
    practicalExample:
      'Clique em "Como foi calculado?" em qualquer indicador financeiro para inspecionar a fórmula exata e os dados utilizados.',
    quickSteps: [
      'Verifique o modelo de custo do seu veículo (próprio vs aluguer semanal).',
      'Registe despesas de carregamento EV, combustível, portagens ou manutenção.',
      'Abra os Relatórios para exportar o balanço em CSV, Excel (XLSX) ou PDF.',
    ],
    primaryAction: { label: 'Exportar em Relatórios', targetNav: 'relatorios' },
  },

  relatorios: {
    id: 'relatorios',
    title: 'Análises & 9 Sub-Relatórios Especializados',
    subtitle: 'Centro analítico completo com filtros temporais, separação Real vs Demo e exportação multiformato.',
    categoryLabel: 'Gestão Inteligente',
    whatIsIt:
      'É a central de inteligência histórica dividida em 9 sub-relatórios: Geral, Plataforma, Cancelamentos, Financeiro, Rentabilidade, Estratégia, TVDE, Veículo e Metas.',
    whatFor:
      'Serve para analisar tendências, preparar fechos contabilísticos com o operador/contabilista e exportar comprovativos limpos.',
    whenToUse:
      'Semanalmente ou no fecho do mês para comparar plataformas, taxas de cancelamento e evolução do €/km líquido.',
    howItWorks:
      'Filtra todos os registos por período (Hoje, 7 dias, Este mês, Personalizado) e isola dados reais de dados de demonstração para nunca contaminar relatórios oficiais.',
    whatToConfigure:
      'Escolha o intervalo de datas e o âmbito de dados ("Apenas Reais" para contabilidade ou "Todos" em testes).',
    integrationDependency:
      'Exportação CSV, XLSX, PDF imprimível e imagem PNG gerados diretamente na aplicação sem depender de serviços pagos.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Todos os 9 sub-relatórios, filtros globais e exportadores CSV, XLSX, PDF e PNG estão totalmente operacionais.',
    practicalExample:
      'Selecione o sub-relatório "3. Estados & Cancelamentos" para ver quantos minutos perdeu em no-shows e cancelamentos por plataforma.',
    quickSteps: [
      'Escolha o período temporal e a plataforma no topo.',
      'Navegue pelos 9 separadores temáticos conforme a análise pretendida.',
      'Clique em CSV, XLSX, PDF ou PNG para guardar o relatório no dispositivo.',
    ],
    primaryAction: { label: 'Gerir Despesas no Financeiro', targetNav: 'financeiro' },
  },

  veiculos: {
    id: 'veiculos',
    title: 'Veículos, Energia EV & Comparador TCO',
    subtitle: 'Gestão da viatura ativa, autonomia WLTP vs Real, tarifas elétricas e elegibilidade legal TVDE.',
    categoryLabel: 'Gestão Inteligente',
    whatIsIt:
      'É o módulo de gestão técnica e energética da sua viatura (elétrica, híbrida, combustão ou GPL) e catálogo comparativo de veículos TVDE.',
    whatFor:
      'Serve para calcular o custo real por quilómetro, evitar ficar sem bateria em viagens longas e comparar qual carro dá maior lucro líquido mensal.',
    whenToUse:
      'Ao trocar de viatura, alterar tarifa de carregamento (Casa bi-horária vs Rápido CEME/Mobi.E) ou avaliar a compra/aluguer de outro modelo.',
    howItWorks:
      'Separa autonomia homologada WLTP da autonomia real em serviço TVDE, valida idade máxima legal por país (ex.: ≤7 anos em PT) e alimenta a Calculadora de Propostas.',
    whatToConfigure:
      'Selecione a viatura ativa, indique o consumo real (kWh/100km ou L/100km) e escolha a tarifa energética habitual.',
    integrationDependency:
      'Independente de APIs externas; telemetria OBD/CAN automática fica preparada para fase nativa futura.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Seleção de viatura ativa, cálculo energético por tarifa, verificação de elegibilidade por país e comparador lado a lado operacionais.',
    practicalExample:
      'Compare um elétrico carregado em casa (€0,16/kWh) vs posto rápido público (€0,48/kWh) e veja o impacto imediato no custo/km.',
    quickSteps: [
      'Confirme qual é o veículo marcado como "Ativo" no seu turno.',
      'Ajuste a tarifa de energia (Casa, Mista ou Rápido Público).',
      'Use os filtros e o Comparador para avaliar até 3 viaturas lado a lado.',
    ],
    primaryAction: { label: 'Abrir Comparador de Veículos', targetNav: 'comparador-veiculos' },
  },

  'locais-rotas': {
    id: 'locais-rotas',
    title: 'Locais, Radar de Zonas & Pontos Seguros',
    subtitle: 'Inteligência de procura por zona, alertas de restrições de recolha e atalhos Waze / Google Maps.',
    categoryLabel: 'Gestão Inteligente · Terreno',
    whatIsIt:
      'É o mapa operacional de zonas quentes, pontos de recolha condicionada (aeroportos, eventos, faixas BUS) e locais favoritos do motorista (casa, carregadores, bases).',
    whatFor:
      'Serve para saber onde posicionar o carro entre corridas, evitar multas em locais proibidos de paragem e abrir navegação num toque.',
    whenToUse:
      'Quando ficar vazio numa zona desconhecida, antes de recolher em zonas críticas (ex.: Kiss & Fly, Baixa, Estádios) ou no regresso a casa.',
    howItWorks:
      'Combina histórico de rentabilidade por zona, horários conhecidos de restrição, observações registadas pelo motorista e alternativas seguras a pé para o passageiro.',
    whatToConfigure:
      'Guarde a morada de Casa/Base e os seus postos EV habituais, e marque zonas como "Favorita" ou "Evitar".',
    integrationDependency:
      'Atalhos diretos Google Maps e Waze operacionais. Trânsito em tempo real externo sem chave paga usa dados históricos + observações locais.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Radar de zonas, registo de observações de terreno, cálculo de deslocação vazia e links Waze/Google Maps operacionais.',
    practicalExample:
      'Registe uma observação de trânsito ou corte de via numa zona e veja o alerta aparecer automaticamente no Cartão Flutuante.',
    quickSteps: [
      'Marque as suas zonas preferidas e zonas a evitar.',
      'Consulte os pontos alternativos seguros de recolha em zonas condicionadas.',
      'Clique em "Waze" ou "Google Maps" em qualquer local guardado para navegar.',
    ],
    primaryAction: { label: 'Testar Alerta no Cartão Flutuante', targetNav: 'cartoes-flutuantes' },
  },

  'voz-copiloto': {
    id: 'voz-copiloto',
    title: 'AIVAD Voice · Copiloto Mãos-Livres',
    subtitle: 'Síntese vocal gratuita com fila de prioridade, anti-repetição e fallback visual seguro.',
    categoryLabel: 'Personalização · Voz',
    whatIsIt:
      'É o assistente vocal de condução que lê em voz alta a classificação das propostas (€/km, €/h, Verde/Amarelo/Vermelho), alertas de zona, bateria e limites TVDE.',
    whatFor:
      'Serve para tomar decisões rápidas em condução urbana sem precisar de fixar o ecrã nem pagar subscrições de voz externas.',
    whenToUse:
      'Ative no início do turno se conduzir com áudio Bluetooth no carro ou auricular autorizado.',
    howItWorks:
      'Utiliza a Web Speech API gratuita do navegador com fila por prioridade (Alta interrompe Baixa), janela de cooldown anti-repetição e banner visual simultâneo.',
    whatToConfigure:
      'Escolha o canal ("Visual + Voz", "Apenas Voz" ou "Silencioso"), velocidade de leitura, idioma (pt-PT, pt-BR, en-GB, es-ES) e categorias ativas.',
    integrationDependency:
      'Depende do suporte Web Speech API do navegador/dispositivo. Em ecrã bloqueado ou sobre outras apps em Android/iOS, requer o módulo nativo TTS (preparado para Windsurf).',
    operationalStatus: 'Operacional (Web/PWA)',
    operationalDetail:
      'Operacional gratuitamente no navegador ativo com fallback visual garantido; áudio em background sobre apps externas pendente de build nativo Android/iOS.',
    practicalExample:
      'Clique em "Testar Anúncio de Proposta" para ouvir imediatamente um resumo de condução e ver o aviso visual coordenado no topo.',
    quickSteps: [
      'Verifique no banner superior se o seu navegador atual suporta síntese de voz.',
      'Ajuste a velocidade (ex.: 1.05x) e o Cooldown anti-repetição (ex.: 20s).',
      'Use "Testar Anúncio de Proposta" para validar o volume antes de arrancar.',
    ],
    primaryAction: { label: 'Ir para Calculadora de Propostas', targetNav: 'calculadora' },
  },

  'cartoes-flutuantes': {
    id: 'cartoes-flutuantes',
    title: 'Cartões Flutuantes de Decisão',
    subtitle: 'Personalização visual do cartão semafórico, métricas visíveis, perfis de luz e simulador isolado.',
    categoryLabel: 'Personalização · Interface',
    whatIsIt:
      'É o estúdio de configuração e simulação do Cartão Flutuante AIVAD que resume em segundos se uma proposta compensa (Verde, Amarelo ou Vermelho).',
    whatFor:
      'Serve para escolher exatamente quais métricas quer ver primeiro (€/km, €/h, Líquido, Retorno vazio), ajustar tamanho de letra/contraste solar e testar cenários em segurança.',
    whenToUse:
      'Ao configurar a app pela primeira vez ou quando alternar entre condução diurna sob sol forte e condução noturna.',
    howItWorks:
      'Dentro da app Web/PWA funciona já ao vivo como cartão intra-app reativo. Para flutuar por cima das apps Uber/Bolt no telemóvel, exporta a configuração para a permissão nativa Android SYSTEM_ALERT_WINDOW.',
    whatToConfigure:
      'Selecione um Perfil Rápido (Urbano Diurno, Aeroporto, Noturno ou Alto Contraste), ordene as métricas e clique em "Guardar Configuração".',
    integrationDependency:
      'Intra-app Web/PWA: zero dependências externas. Overlay sobre outras apps: requer build nativo Android (Windsurf) — em iOS a Apple não permite overlays sobre apps de terceiros.',
    operationalStatus: 'Operacional (Web/PWA)',
    operationalDetail:
      'Cartão intra-app e simulador Verde/Amarelo/Vermelho 100% operacionais; sobreposição nativa Android sobre outras apps preparada por contrato para Windsurf.',
    practicalExample:
      'Alterne entre os cenários "Verde", "Amarelo" e "Vermelho" no simulador para ver a mudança animada de cor, recomendação IA e botões de toque.',
    quickSteps: [
      'Escolha um Perfil Rápido adaptado à luz ambiente (Diurno Claro, Urbano ou Noturno).',
      'Ative "Alvos de Toque Alargados" se usar suporte de tablier no automóvel.',
      'Teste os 3 cenários no simulador ao lado e clique em "Guardar no Perfil".',
    ],
    primaryAction: { label: 'Testar com Proposta Real', targetNav: 'calculadora' },
  },

  conectores: {
    id: 'conectores',
    title: 'Conectores Uber & Bolt (Suite 3 Níveis)',
    subtitle: 'Gestão transparente de permissões, superfícies reais de API e verificação técnica em 3 níveis.',
    categoryLabel: 'Personalização · Integrações',
    whatIsIt:
      'É o painel técnico e honesto que gere a ligação às plataformas Uber e Bolt, distinguindo claramente Simulador (Nível 1), Sandbox/OAuth (Nível 2) e Dispositivo Real (Nível 3).',
    whatFor:
      'Serve para controlar permissões de leitura vs execução externa e compreender o que cada API oficial permite na realidade (sem promessas falsas de aceitação por API pública).',
    whenToUse:
      'Quando quiser configurar credenciais OAuth de servidor, auditar estados de ligação ou testar reconexão automática com backoff.',
    howItWorks:
      'Mostra 4 estados explícitos: Não configurado (sem segredos no servidor, usando CSV/OCR), Configurado, Sandbox de testes e Integração real validada.',
    whatToConfigure:
      'Ative ou revogue individualmente a "Permissão de Leitura/Captura" e a "Permissão de Execução Externa" para cada plataforma.',
    integrationDependency:
      'Nível 1 e importação CSV/OCR funcionam sempre sem chaves. OAuth Nível 2 exige variáveis UBER_CLIENT_ID / BOLT_CLIENT_ID no servidor; Nível 3 requer bridge nativo Android.',
    operationalStatus: 'Demonstração / Sandbox',
    operationalDetail:
      'Suite de testes de 3 níveis, controlo de permissões e backoff operacionais; OAuth oficial aguarda credenciais de parceiro no cofre do servidor.',
    practicalExample:
      'Execute "Nível 1 · Simulador" e depois "Nível 2 · Sandbox / OAuth" para comparar os controlos validados em cada camada.',
    quickSteps: [
      'Revise os cartões de estado (Não configurado vs Sandbox vs Validado).',
      'Defina as permissões autorizadas para Uber e para Bolt.',
      'Clique nos botões Nível 1, Nível 2 e Nível 3 para inspecionar o relatório técnico.',
    ],
    primaryAction: { label: 'Importar Dados em Smart Capture', targetNav: 'smart-capture' },
  },

  'apps-integracoes': {
    id: 'apps-integracoes',
    title: 'Aplicações & Plataformas do Perfil',
    subtitle: 'Ativação individual das plataformas com operação efetiva validada na sua cidade e país.',
    categoryLabel: 'Personalização',
    whatIsIt:
      'É o gestor das aplicações de mobilidade visíveis nos seus menus de trabalho (ex.: Uber e Bolt em Portugal; Cabify e FREE NOW em Espanha).',
    whatFor:
      'Serve para manter a interface limpa apenas com as apps em que realmente conduz, sem nunca apagar o histórico financeiro de apps antigas.',
    whenToUse:
      'Quando começar a trabalhar numa nova plataforma, deixar de usar uma app ou mudar de cidade/país de operação.',
    howItWorks:
      'Cruza o catálogo internacional validado por país (separando licenciamento administrativo de operação real na rua) e pré-seleciona apenas plataformas efetivamente ativas.',
    whatToConfigure:
      'Ligue ou desligue o interruptor de cada plataforma disponível no seu mercado atual.',
    integrationDependency:
      'Não requer chaves externas; atualiza instantaneamente os filtros do Painel, Calculadora, Estratégia e Tacógrafo.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Ativação/desativação por perfil, preservação histórica a 100% e validação geográfica por país totalmente operacionais.',
    practicalExample:
      'Em Portugal verá apenas Uber e Bolt pré-selecionadas como operação validada; plataformas sem operação confirmada ficam devidamente sinalizadas.',
    quickSteps: [
      'Confirme o seu país e cidade atuais no seletor de localização.',
      'Ative apenas as aplicações onde tem conta de motorista ativa.',
      'Desative apps que não utiliza para simplificar os seletores diários.',
    ],
    primaryAction: { label: 'Configurar Conectores Técnicos', targetNav: 'conectores' },
  },

  perfil: {
    id: 'perfil',
    title: 'Configurações, Conta & Internacionalização',
    subtitle: 'Preferências regionais, moeda, unidades (km/mi), consentimentos RGPD e gestão de sessão.',
    categoryLabel: 'Personalização · Conta',
    whatIsIt:
      'É o centro de definições pessoais do motorista, separando país de residência fiscal, mercado profissional principal e localização atual.',
    whatFor:
      'Serve para ajustar tema Claro/Escuro, idioma, privacidade RGPD, documentos profissionais e repor dados de demonstração se estiver em sandbox.',
    whenToUse:
      'Na configuração inicial da conta ou quando alterar preferências de privacidade, idioma ou mercado.',
    howItWorks:
      'Guarda as suas preferências localmente e sincroniza com a conta autenticada no servidor Express sem misturar moedas de viagens históricas.',
    whatToConfigure:
      'Verifique o país de residência, mercado profissional, consentimentos de dados e validade dos documentos obrigatórios.',
    integrationDependency:
      'Geolocalização opcional via API nativa do navegador (apenas mediante clique explícito do utilizador).',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Gestão de perfil, internacionalização multi-moeda, controlos RGPD e reposição segura de sandbox totalmente operacionais.',
    practicalExample:
      'Altere entre tema Claro e Escuro ou teste outra cidade para ver a moeda e plataformas adaptarem-se sem perder o histórico em EUR.',
    quickSteps: [
      'Confirme o seu país de residência e mercado profissional principal.',
      'Reveja as permissões de privacidade e tratamento isolado de dados.',
      'Mantenha as datas de validade da Carta, Licença TVDE e Seguro atualizadas.',
    ],
    primaryAction: { label: 'Ver Estado Técnico em Diagnóstico', targetNav: 'diagnostico' },
  },

  diagnostico: {
    id: 'diagnostico',
    title: 'Diagnóstico Operacional & Matriz Multiplataforma',
    subtitle: 'Verificação ao vivo da API Express, persistência, auditoria de 11 eventos e prontidão Windsurf.',
    categoryLabel: 'Apoio · Transparência',
    whatIsIt:
      'É o painel de transparência técnica total que mostra o estado real do servidor, da sessão, das permissões do navegador e a classificação honesta de cada módulo.',
    whatFor:
      'Serve para comprovar o que está operacional agora na Web/PWA versus o que depende de compilação nativa Android/iOS na fase Windsurf, além de auditar todos os acontecimentos.',
    whenToUse:
      'Quando quiser verificar se os dados estão sincronizados com o servidor, inspecionar falhas de rede ou auditar o histórico cronológico de eventos.',
    howItWorks:
      'Consulta em tempo real /api/health e /api/diagnostics/summary, deteta capacidades do dispositivo atual e lista os 11 tipos de eventos do ciclo de vida.',
    whatToConfigure:
      'Não requer configuração; dispõe de botões diretos para forçar sincronização imediata ou revogar a sessão atual.',
    integrationDependency:
      'Liga-se diretamente ao servidor Express integrado na porta 3000 (com fallback offline automático se sem rede).',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Monitorização real da API, matriz Web/PWA/Android/iOS e livro de auditoria filtrável estão 100% operacionais.',
    practicalExample:
      'Filtre o Registo de Acontecimentos por "Cancelamento" ou "Proposta analisada" para auditar a origem e hora exata de cada ação.',
    quickSteps: [
      'Consulte os 4 cartões de topo (API Backend, Autenticação, Persistência e Runtime).',
      'Leia a tabela de Classificação Honesta por módulo.',
      'Pesquise qualquer evento operacional no registo unificado no fundo da página.',
    ],
    primaryAction: { label: 'Abrir Suporte & Ajuda', targetNav: 'suporte' },
  },

  suporte: {
    id: 'suporte',
    title: 'Ajuda, Conformidade Legal, Documentos & Suporte',
    subtitle: 'Tickets de assistência, obrigações legais TVDE, cofre documental, avaliação rápida e dashcam.',
    categoryLabel: 'Apoio ao Motorista',
    whatIsIt:
      'É o hub de apoio ao motorista na estrada, agregando suporte técnico, resumo de legislação local, validade de documentos, notas rápidas de passageiros e registo de incidentes.',
    whatFor:
      'Serve para resolver dúvidas operacionais, evitar coimas por documentos caducados e registar ocorrências relevantes durante o turno.',
    whenToUse:
      'Quando precisar de abrir um pedido de suporte, rever regras da Lei 45/2018 / Portaria 7/2022, registar um documento ou guardar nota de ocorrência.',
    howItWorks:
      'Organiza 7 ferramentas práticas em sub-separadores rápidos, ligando alertas de documentos diretamente ao Painel Principal.',
    whatToConfigure:
      'Adicione as datas de validade dos seus documentos (Licença TVDE, Inspeção, Seguro) para receber alertas preventivos.',
    integrationDependency:
      'Tickets, documentos, legislação e notas operacionais funcionam localmente e sincronizam com a consola AIVAD Management.',
    operationalStatus: 'Operacional',
    operationalDetail:
      'Sistema de tickets, catálogo legal validado, alertas documentais e notas rápidas operacionais (gravação vídeo dashcam real requer câmara nativa futura).',
    practicalExample:
      'Abra o separador "Documentos" para verificar que documentos têm alerta preventivo antes de uma fiscalização na via pública.',
    quickSteps: [
      'Use os separadores no topo para alternar entre Tickets, Legislação, Documentos e Utilitários.',
      'Abra um Ticket caso encontre qualquer dúvida operacional ou sugestão.',
      'Vote nas melhorias da comunidade no separador "Sugestões".',
    ],
    primaryAction: { label: 'Rever Obrigações Legais', targetNav: 'legislacao' },
  },
};

const SUB_TAB_GUIDE_ALIASES: Record<string, string> = {
  'assistente-ia': 'ai-core',
  calculadora: 'corridas',
  'propostas-tempo-real': 'corridas',
  'smart-capture': 'corridas',
  'historico-viagens': 'corridas',
  autopilot: 'estrategia',
  'consolidado-plataformas': 'estrategia',
  'desempenho-uber': 'estrategia',
  'desempenho-bolt': 'estrategia',
  planeador: 'agenda-turnos',
  campanhas: 'agenda-turnos',
  'comparador-veiculos': 'veiculos',
  'mapas-zonas': 'locais-rotas',
  legislacao: 'suporte',
  documentos: 'suporte',
  'avaliacao-rapida': 'suporte',
  dashcam: 'suporte',
  notificacoes: 'suporte',
  sugestoes: 'suporte',
};

export function getDriverModuleGuide(navId: string): DriverModuleGuide {
  const canonical = SUB_TAB_GUIDE_ALIASES[navId] ?? navId;
  return DRIVER_MODULE_GUIDES[canonical] ?? DRIVER_MODULE_GUIDES.dashboard;
}

export const INITIAL_ONBOARDING_STATE: ProgressiveOnboardingState = {
  dismissed: false,
  currentStepIndex: 0,
  completedStepIds: [],
  lastUpdatedIso: new Date(0).toISOString(),
};

export function markOnboardingStepCompleted(
  prev: ProgressiveOnboardingState,
  stepId: string,
  nowIso = new Date().toISOString()
): ProgressiveOnboardingState {
  const exists = prev.completedStepIds.includes(stepId);
  const completedStepIds = exists ? prev.completedStepIds : [...prev.completedStepIds, stepId];
  const nextIncompleteIdx = DRIVER_ONBOARDING_STEPS.findIndex(
    (s) => !completedStepIds.includes(s.id)
  );
  return {
    ...prev,
    completedStepIds,
    currentStepIndex:
      nextIncompleteIdx >= 0
        ? nextIncompleteIdx
        : Math.min(prev.currentStepIndex, DRIVER_ONBOARDING_STEPS.length - 1),
    lastUpdatedIso: nowIso,
  };
}

export function goToOnboardingStep(
  prev: ProgressiveOnboardingState,
  index: number,
  nowIso = new Date().toISOString()
): ProgressiveOnboardingState {
  const clamped = Math.max(0, Math.min(DRIVER_ONBOARDING_STEPS.length - 1, index));
  return {
    ...prev,
    dismissed: false,
    currentStepIndex: clamped,
    lastUpdatedIso: nowIso,
  };
}

export function setOnboardingDismissed(
  prev: ProgressiveOnboardingState,
  dismissed: boolean,
  nowIso = new Date().toISOString()
): ProgressiveOnboardingState {
  return {
    ...prev,
    dismissed,
    lastUpdatedIso: nowIso,
  };
}
