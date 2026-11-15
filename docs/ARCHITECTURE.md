# AIVAD — Arquitetura Técnica do Ecossistema (Comando 5)

## 1. Visão Geral dos 10 Pilares Integrados
1. **AIVAD Driver** (`src/components/driver/`): Aplicação operacional do motorista com proposta em tempo real, ciclo de vida de viagem, tacógrafo TVDE, 9 relatórios, zonas e base técnica de veículos.
2. **AIVAD Management** (`src/components/admin/`): Consola administrativa central com RBAC de 7 perfis e verificação server-side no Express.
3. **AIVAD Web** (`vite.config.ts`, `server.ts`): Aplicação Web responsiva (Desktop/Mobile) servida com Express API + Vite/dist em `PORT 3000`.
4. **AIVAD Android** (`src/adapters/platformAdapters.ts`): Contrato preparado para cartão flutuante (`SYSTEM_ALERT_WINDOW`), botão flutuante e `NotificationListenerService` (`INTEGRAÇÃO A VALIDAR` até build nativo Windsurf).
5. **AIVAD iOS Ready** (`src/adapters/platformAdapters.ts`): Arquitetura Apple preparada para Atalhos iOS, OCR voluntário, Live Activities e Dynamic Island, sem overlay universal.
6. **AIVAD Portal** (`src/components/portal/PortalView.tsx`): Site institucional integrado com autenticação real (`/api/auth/login`, `/api/auth/register`) e Modo Demonstração sandbox isolado.
7. **AIVAD Intelligence Core** (`src/core/aiCore.ts`, `src/core/intelligence.ts`, `src/core/reports.ts`, `src/core/lifecycle.ts`, `src/core/zones.ts`): Motores puros de decisão, relatórios, temporizadores, zonas e confiança calibrada (`number | null`).
8. **AIVAD Smart Data Capture**: Reconciliação idempotente de eventos (`reconcileCapturedEvent`) com deteção de duplicações e atualização de gorjetas na viagem original.
9. **AIVAD Compliance Intelligence**: Central regulatória TVDE (Lei TVDE + Lei n.º 59/2026) com validação humana e tacógrafo de janela móvel 24h (`evaluateRolling24hCompliance`).
10. **AIVAD SaaS Core**: Planos multi-país, assinaturas, permissões e isolamento estrito entre dados Reais e Demonstração.

---

## 2. Matriz Oficial de Capacidades (9 Estados — Comando 5 §15)

| Capacidade / Módulo | Estado Oficial | Ficheiro / Endpoint Principal | Observações Técnicas & Limitações Reais |
| :--- | :--- | :--- | :--- |
| Autenticação, Registo & RBAC | **Operacional no Servidor** | `server.ts` (`/api/auth/*`, `/api/admin/*`) | Sessão HMAC-SHA256 em cookie `HttpOnly`; bloqueia `401/403` no backend; nunca inicia autenticado por defeito. |
| Assistente IA Gemini (Proxy Seguro) | **Operacional c/ Fallback** | `server.ts` (`/api/ai/query`), `src/core/aiCore.ts` | `GEMINI_API_KEY` usada apenas no servidor; se ausente, responde via motor determinístico `answerAiCoreQuery`. |
| Isolamento Dados Reais vs Demo | **Operacional na Web** | `EcosystemContext.tsx`, `server.ts` (`/api/sync/state`) | Chaves separadas (`aivad_ecosystem_real_v2_*` vs `aivad_ecosystem_demo_v2`); `isDemo` propagado em todas as criações. |
| Central de 9 Relatórios + Drill-Down | **Operacional na Web** | `src/core/reports.ts`, `DriverFinanceAndFleet.tsx` | 9 presets de datas, comparação com período anterior equivalente, toggles de custos, Estimado vs Cobrado, CSV/XLSX/PDF/PNG. |
| Ciclo de Vida Ativo & Temporizadores | **Operacional na Web** | `src/core/lifecycle.ts`, `DriverDashboardAndOps.tsx` | Deslocação até recolha separada da espera; espera = `00:00` até chegada; nunca auto-cancela aos `0s`. |
| Tacógrafo TVDE & Janela Móvel 24h | **Operacional na Web** | `src/core/tachograph.ts`, `DriverTachographView.tsx` | União real de intervalos multi-app e atividades manuais; previne dupla contagem e suporta viragem de dia (00:00). |
| Inteligência de Zonas (Feiras Lisboa) | **Local com Sync Express** | `src/core/zones.ts`, `/api/zones/observations` | Feira do Relógio (Dom 07–14h) e Feira da Ladra (Ter/Sáb 08–15h, evento vs proibição), alternativas seguras, consentimento obrigatório. |
| Veículos (Filtros, Cor, Revenda) | **Operacional na Web** | `src/core/intelligence.ts`, `DriverFinanceAndFleet.tsx` | Filtros por país/plataforma/categoria/lugares/mala/autonomia/cor; validade versão+mercado; estimativa algorítmica vs anúncio/transação. |
| Captura Automática Android / iOS / APIs | **INTEGRAÇÃO A VALIDAR** | `src/adapters/platformAdapters.ts` | Requer permissões nativas OS (`NotificationListenerService`, `SYSTEM_ALERT_WINDOW`, ActivityKit) e APIs oficiais Uber/Bolt no Windsurf. |

---

## 3. Separação de Camadas e Contratos
- **Modelos e Contratos**: `src/models/types.ts`
- **Backend Express**: `server.ts` (Sessões HMAC, Password Hashing `scrypt`, `/api/sync/state`, `/api/zones/observations`, `/api/ai/query`, `/api/admin/audit-summary`)
- **Regras Puras (Testadas via `node:test`)**:
  - `src/core/tachograph.ts` (`src/core/tachograph.test.ts`)
  - `src/core/intelligence.ts`, `src/core/reports.ts`, `src/core/lifecycle.ts`, `src/core/zones.ts`, `src/core/aiCore.ts` (`src/core/comando5.test.ts`)
- **Exportações**: `src/core/exportUtils.ts` (CSV, XLSX via SheetJS, PDF imprimível, PNG via Canvas)
- **Design System**: `src/components/ui/DesignSystem.tsx`

---

## 4. Preparação para Windsurf (Produção)
1. Substituir persistência JSON em `.aivad-server-store.json` por PostgreSQL / Cloud SQL mantendo os mesmos endpoints REST e schema de `EcosystemState`.
2. Configurar `GEMINI_API_KEY` e `AIVAD_SESSION_SECRET` em variáveis de ambiente do servidor (nunca `VITE_*`).
3. Implementar o módulo nativo Android (`NotificationListenerService` + overlay `SYSTEM_ALERT_WINDOW`) enviando propostas ao mesmo contrato `ProposalInput` e `DynamicFloatingProposalCard`.
