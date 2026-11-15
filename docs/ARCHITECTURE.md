# AIVAD — Arquitetura Técnica do Ecossistema

## 1. Visão Geral dos 10 Pilares Integrados
1. **AIVAD Driver** (`src/components/driver/`): Aplicação operacional com 25 módulos interligados.
2. **AIVAD Management** (`src/components/admin/`): Consola administrativa central com 25 módulos e RBAC de 7 perfis.
3. **AIVAD Web** (`vite.config.ts`, PWA): Aplicação responsiva Web/Desktop/Tablet/Mobile com suporte offline via `vite-plugin-pwa`.
4. **AIVAD Android** (`src/adapters/platformAdapters.ts`, configurador em `DriverDashboardAndOps`): Contrato para cartão flutuante, botão flutuante e `NotificationListenerService` (rotulado `INTEGRAÇÃO A VALIDAR` até implementação nativa).
5. **AIVAD iOS Ready** (`src/adapters/platformAdapters.ts`): Arquitetura Apple preparada para Atalhos iOS, OCR voluntário, Live Activities e Dynamic Island, sem promessa de overlay universal.
6. **AIVAD Portal** (`src/components/portal/PortalView.tsx`): Site institucional e comercial com 18 secções e CMS sincronizado com o Modo Administrador.
7. **AIVAD Intelligence Core** (`src/core/intelligence.ts`): Motor puro e independente de UI para análise de propostas, AutoPilot, planeamento inteligente, elegibilidade TVDE/comercial e assistente fundamentado.
8. **AIVAD Smart Data Capture**: Reconciliação idempotente de eventos (`reconcileCapturedEvent`) com deteção de duplicações e atualização de gorjetas na viagem original.
9. **AIVAD Compliance Intelligence**: Central regulatória TVDE Portugal (Lei TVDE + Lei n.º 59/2026) com validação jurídica humana obrigatória antes de comunicação definitiva.
10. **AIVAD SaaS Core**: Planos multi-país, assinaturas, limites de acesso e sincronização de permissões.

## 2. Separação de Camadas
- **Modelos e Contratos**: `src/models/types.ts`
- **Regras de Negócio Puras**: `src/core/intelligence.ts` (testadas em `src/core/intelligence.test.ts` via `node:test`)
- **Exportações**: `src/core/exportUtils.ts` (CSV, XLSX via SheetJS, PDF imprimível, PNG via Canvas)
- **Adaptadores Externos e OS**: `src/adapters/platformAdapters.ts`
- **Serviços Centrais e Event Bus**: `src/services/EcosystemContext.tsx`
- **Design System**: `src/components/ui/DesignSystem.tsx`

## 3. Fluxos Idempotentes de Integração Interna
- `TRIP_COMPLETED`: Atualiza histórico, resumo financeiro, progresso de campanhas e projeção do planeador.
- `TIP_RECONCILED`: Localiza a viagem original por referência externa, soma a gorjeta sem duplicar viagens e atualiza financeiro e relatórios.
- `PLATFORM_STATUS_CHANGED`: Ocultar/inativar uma plataforma no Admin remove-a dos seletores do Motorista mantendo o histórico de viagens intacto.
- `LEGISLATION_VALIDATED`: A validação humana no Admin altera o estado legal e gera notificações para os motoristas.
- `CMS_PUBLISHED`: Alterações editoriais e novas releases no Admin refletem-se imediatamente no Site Oficial AIVAD.

## 4. Guia de Evolução para Backend Real (Windsurf)
- Substituir a persistência `localStorage` em `EcosystemContext.tsx` por endpoints REST/GraphQL autenticados com verificação RBAC server-side.
- Manter chaves, segredos OAuth e chamadas a APIs oficiais Uber/Bolt/Faturação exclusivamente no servidor.
- Ligar adaptadores nativos Android (`SYSTEM_ALERT_WINDOW`, `NotificationListenerService`) e iOS (`WidgetKit` / `ActivityKit`) aos contratos definidos em `src/models/types.ts`.
