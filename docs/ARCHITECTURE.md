# AIVAD — Arquitetura Técnica, Contratos Nativos & Preparação para Produção (Comando 6)

## 1. Visão Geral dos 10 Pilares Integrados
1. **AIVAD Driver** (`src/components/driver/`): Ecossistema operacional do motorista TVDE com AutoPilot unificado (3 modos), AIVAD Voice Copilot, Smart Capture (OCR/Notificação/CSV/JSON), Conectores Uber/Bolt independentes, Diagnóstico Operacional, Cartão Flutuante com Perfis de Captura, Ciclo de Vida de Viagens, Tacógrafo TVDE, 9 Relatórios e Base Técnica de Veículos.
2. **AIVAD Management** (`src/components/admin/`): Consola administrativa central com RBAC de 7 perfis, CMS persistido no servidor (com isolamento de Demo Sandbox), ecossistema multi-país e gestão de planos de 30 dias + cupões de indicação.
3. **AIVAD Web / PWA** (`vite.config.ts`, `server.ts`, `public/manifest.webmanifest`): Aplicação Web responsiva (Desktop/Mobile) servida por Express API + Vite em `PORT 3000`.
4. **AIVAD Android Bridge** (`src/adapters/nativeBridgeContracts.ts`, `src/adapters/platformAdapters.ts`): Contratos TypeScript prontos para implementação nativa Kotlin no Windsurf (`AivadAndroidOverlayBridge`, `AivadAndroidNotificationCaptureBridge`, `AivadNativeVoiceTtsBridge`).
5. **AIVAD iOS Ready** (`src/adapters/nativeBridgeContracts.ts`): Contratos Swift/ActivityKit para Live Activities, Dynamic Island, Atalhos Siri e OCR voluntário (`AivadIosLiveActivityBridge`).
6. **AIVAD Portal** (`src/components/portal/PortalView.tsx`): Portal institucional sincronizado com `/api/cms/public`, autenticação real (`/api/auth/login`, `/api/auth/register`) e Modo Demonstração sandbox isolado.
7. **AIVAD Intelligence Core** (`src/core/intelligence.ts`, `src/core/aiCore.ts`, `src/core/zones.ts`, `src/core/voiceCopilot.ts`): Motores puros e determinísticos de semáforo de propostas, probabilidade histórica de retorno com passageiro (`>= 3` viagens), AutoPilot e tendências horárias de zonas.
8. **AIVAD Smart Data Capture & Connectors** (`src/core/intelligence.ts`, `src/core/connectors.ts`): Parser multi-formato com pontuação de confiança (`0–100`), deduplicação, reconciliação de gorjetas, histórico de correções manuais e suite de verificação em 3 níveis (Simulador, Sandbox/Contrato Oficial, Dispositivo Real Autorizado).
9. **AIVAD Compliance & Tachograph** (`src/core/tachograph.ts`): Tacógrafo TVDE com 10 estados, união matemática de intervalos sem dupla contagem, relatórios estruturados Diário/Semanal/Mensal, QR de verificação e aviso explícito de não-homologação legal.
10. **AIVAD Security & Diagnostics** (`src/core/securityConfig.ts`, `server.ts`): Política fail-closed de segredos em produção (`AIVAD_SESSION_SECRET >= 32 chars`), proteção de mutações CMS contra sessões Demo, e área dedicada de Diagnóstico Operacional (`/api/health`, `/api/diagnostics/summary`).

---

## 2. Matriz Realista de Capacidades (Web vs PWA vs Android vs iOS — Comando 6 §17 & §18)

| Capacidade / Módulo | Web / PWA (Atual) | Android Nativo (Windsurf) | iOS Nativo (Windsurf) | Ficheiro / Contrato Principal |
| :--- | :--- | :--- | :--- | :--- |
| **AutoPilot (Manual, Semiautomático, Automático)** | **Operacional** (Executa se canal autorizado ativo; Ação Assistida caso contrário) | **Preparado** (Via API Oficial ou Bridge expressamente autorizado) | **Limitado pelo SO** (Decisão pronta + confirmação manual) | `src/core/intelligence.ts`, `evaluateAutoPilot` |
| **AIVAD Voice Copilot (TTS)** | **Operacional** (`window.speechSynthesis` em aba ativa) | **Preparado** (`TextToSpeech` + `AudioFocus` em segundo plano) | **Preparado** (`AVSpeechSynthesizer` background audio) | `src/core/voiceCopilot.ts`, `AivadNativeVoiceTtsBridge` |
| **Cartão Flutuante de Propostas** | **Operacional Intra-App** (Perfis Urbano/Aeroporto/Noturno/Alto Contraste) | **Preparado** (`SYSTEM_ALERT_WINDOW` sobre apps externas) | **Substituído por Live Activities** (Dynamic Island / Ecrã Bloqueado) | `ChartsAndVisuals.tsx`, `AivadAndroidOverlayBridge` |
| **Smart Capture (OCR / CSV / JSON / Notificação)** | **Operacional** (Importação de texto/CSV/JSON + deduplicação + correção auditável) | **Preparado** (`NotificationListenerService` + ML Kit OCR local) | **Preparado** (App Intents / Atalho Screenshot OCR) | `parseAndNormalizeCaptureInput`, `AivadAndroidNotificationCaptureBridge` |
| **Conectores Uber & Bolt (3 Superfícies API)** | **Arquitetura + Suite Nível 1/2/3** (Vault Server-Side + Backoff Exponencial) | **Mesmo Backend OAuth** | **Mesmo Backend OAuth** | `src/core/connectors.ts`, `/api/connectors/status` |
| **Tacógrafo TVDE (10 Estados + Relatórios D/S/M)** | **Operacional** (União de intervalos + fila offline + QR) | **Operacional + Foreground GPS opcional** | **Operacional + Background Location opcional** | `src/core/tachograph.ts`, `buildTachographPeriodReport` |
| **Segurança, Sessões HMAC & Isolamento Demo** | **Operacional no Servidor** (`fail-closed` em produção) | **Partilha API HTTPS** | **Partilha API HTTPS** | `src/core/securityConfig.ts`, `server.ts` |

---

## 3. Endpoints REST Modulares por Domínio (`server.ts` + `src/server/apiRouter.ts`)
- **Saúde, Diagnóstico & Conectores**:
  - `GET /api/health` — Saúde do servidor, ambiente resolvido (`development | test | preview | production`), estado de `AIVAD_ALLOW_DEMO_SANDBOX` e cofres OAuth (`Não configurado` quando ausentes, sem bloquear arranque em Dev/Preview).
  - `GET /api/diagnostics/summary` — Resumo operacional da persistência em 3 camadas, sessões ativas e estado de sincronização.
  - `GET /api/connectors/status` — Estado real de `UBER_CLIENT_ID`/`UBER_CLIENT_SECRET` e `BOLT_CLIENT_ID`/`BOLT_CLIENT_SECRET` no servidor (`Não configurado` vs `Configurado`).
- **Autenticação, Sessões Revogáveis & RBAC**:
  - `POST /api/auth/register` | `POST /api/auth/login` | `POST /api/auth/demo-session` | `POST /api/auth/logout` | `POST /api/auth/sessions/revoke` | `GET /api/auth/session` — `scrypt` + HMAC-SHA256 + `sessionId` revogável no servidor (`store.sessions`), zero `localStorage` auth.
- **Domínio Motorista (`/api/driver/*`) & Isolamento Multi-Tenant**:
  - `GET /api/driver/profile/:driverId` — Isolamento estrito por `driverId` ou `organizationId` (devolve `403` + registo em `securityAuditLogs` em acessos cruzados).
  - `GET /api/sync/state` | `POST /api/sync/state` | `POST /api/sync/offline-replay` — Sincronização versionada com deteção de conflitos (`409 Conflict` se `baseVersion < serverVersion`) e replay offline idempotente.
- **Domínio AIVAD Management (`/api/management/*` & `/api/admin/*`)**:
  - `GET /api/management/organizations` | `POST /api/management/organizations` | `GET /api/management/organizations/:orgId/summary` — Suporte multi-organização (`Frota TVDE`, `Operador Independente`, `Cooperativa / Equipa`, `Empresa Corporativa`) sem forçar motoristas independentes (`organizationId: null`) numa frota; bloqueia `Motorista` com `403`.
  - `GET /api/catalog/public` | `POST /api/management/catalog/country` | `POST /api/management/catalog/platform-operation` — Catálogo internacional extensível em 3 níveis (`Mercados Oficialmente Ativos`, `Países Configurados`, `Países Suportados`) e matriz operacional por país/região/cidade.
  - `GET /api/admin/audit-summary` — Auditoria de segurança e tentativas de violação RBAC/tenant (`403` para não-administradores).
- **CMS Completo & Portal Público (`/api/cms/*`)**:
  - `GET /api/cms/public` | `POST /api/cms/draft` | `POST /api/cms/publish` | `POST /api/cms/rollback` — Fluxo explícito em 4 estágios (`1. Edição Local`, `2. Rascunho Servidor`, `3. Pré-visualização`, `4. Portal Público`), menus, páginas personalizadas, media, idiomas (`pt-PT`, `en-GB`, `es-ES`), histórico de revisões e isolamento total da Demo Sandbox.

---

## 4. Esquema Relacional PostgreSQL 16+ Preparado para Produção (Windsurf / Comando 8)

Na transição do protótipo persistente `.aivad-server-store.json` para PostgreSQL 16+ gerido em produção (Comando 8 / Windsurf), migrar para as tabelas canónicas abaixo (incluindo `organizations`, `sessions`, `country_catalog`, `platform_country_operations` e `security_audit_logs`):

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Frota TVDE', 'Operador Independente', 'Cooperativa / Equipa', 'Empresa Corporativa')),
  tax_id TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  city TEXT NOT NULL,
  owner_user_id UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  isolation_policy TEXT NOT NULL DEFAULT 'strict_tenant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL, -- NULL permitido para Motoristas Independentes
  country_code CHAR(2) NOT NULL DEFAULT 'PT',
  city TEXT NOT NULL DEFAULT 'Lisboa',
  state_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE country_catalog (
  code CHAR(2) PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL,
  symbol TEXT NOT NULL,
  language TEXT NOT NULL,
  timezone TEXT NOT NULL,
  catalog_tier TEXT NOT NULL CHECK (catalog_tier IN ('Mercado Oficialmente Ativo', 'País Configurado', 'País Suportado')),
  active_market BOOLEAN NOT NULL DEFAULT false,
  legal_max_daily_driving_hours INT NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platform_country_operations (
  platform_id TEXT NOT NULL,
  country_code CHAR(2) NOT NULL REFERENCES country_catalog(code) ON DELETE CASCADE,
  regions TEXT[] NOT NULL DEFAULT '{}',
  cities TEXT[] NOT NULL DEFAULT '{}',
  operational_status TEXT NOT NULL CHECK (operational_status IN (
    'Operação efetiva validada',
    'Disponibilidade regional limitada',
    'Licenciada sem operação confirmada',
    'Suspensa',
    'Encerrada no país',
    'Em verificação'
  )),
  licensed_in_country BOOLEAN NOT NULL DEFAULT false,
  validated_live_operation BOOLEAN NOT NULL DEFAULT false,
  validation_source TEXT NOT NULL,
  validated_at DATE NOT NULL,
  notes TEXT,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (platform_id, country_code)
);

CREATE TABLE security_audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  actor_organization_id TEXT,
  action TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  reason TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  version TEXT NOT NULL,
  year INT NOT NULL,
  fuel_type TEXT NOT NULL,
  battery_kwh NUMERIC(5,1),
  homologated_range_km INT NOT NULL,
  real_range_km INT NOT NULL,
  seats INT NOT NULL,
  doors INT NOT NULL,
  trunk_liters INT NOT NULL,
  color TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  city TEXT NOT NULL,
  tco_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE proposals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  platform_id TEXT NOT NULL,
  category TEXT NOT NULL,
  input_payload JSONB NOT NULL,
  analysis_payload JSONB NOT NULL,
  autopilot_decision JSONB,
  lifecycle_state TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  external_ref TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  status TEXT NOT NULL,
  trip_date DATE NOT NULL,
  trip_time TEXT NOT NULL,
  gross_eur NUMERIC(10,2) NOT NULL,
  tip_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_eur NUMERIC(10,2) NOT NULL,
  pickup_km NUMERIC(8,2) NOT NULL,
  trip_km NUMERIC(8,2) NOT NULL,
  duration_min INT NOT NULL,
  pickup_zone TEXT NOT NULL,
  destination_zone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE smart_captures (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dedup_key TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence_score INT NOT NULL,
  normalized_payload JSONB NOT NULL,
  corrections_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedup_key)
);

CREATE TABLE lifecycle_audit_events (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  origin_platform TEXT NOT NULL,
  previous_state TEXT NOT NULL,
  current_state TEXT NOT NULL,
  change_origin TEXT NOT NULL,
  payload_summary TEXT NOT NULL,
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE tachograph_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  verification_code TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE tachograph_activities (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES tachograph_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  corrections JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE platform_connectors (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL CHECK (connector_id IN ('uber', 'bolt')),
  encrypted_refresh_token TEXT,
  granted_scopes TEXT[] NOT NULL DEFAULT '{}',
  connection_state TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, connector_id)
);

CREATE TABLE cms_revisions (
  id TEXT PRIMARY KEY,
  author_user_id UUID REFERENCES users(id),
  summary TEXT NOT NULL,
  published_snapshot JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. Contrato de Variáveis de Ambiente & Handoff para Windsurf / Comando 8
1. **Desbloqueio de Desenvolvimento & Preview (`development`, `test`, `preview`)**:
   - O projeto arranca sem exigir `UBER_CLIENT_ID`, `UBER_CLIENT_SECRET`, `BOLT_CLIENT_ID`, `BOLT_CLIENT_SECRET` nem `AIVAD_ALLOW_DEMO_SANDBOX`.
   - Quando as credenciais Uber/Bolt estão ausentes, apenas o respetivo conector OAuth externo fica em estado **`Não configurado`**, mantendo ativos o Simulador Nível 1, importação CSV/JSON e OCR local.
   - `AIVAD_ALLOW_DEMO_SANDBOX` controla se o endpoint `/api/auth/demo-session` aceita sessões sandbox: ativo por omissão em `development`, `test` e `preview` (exceto se `AIVAD_ALLOW_DEMO_SANDBOX=false`), e **desativado por omissão (`fail-closed`)** em `production` dedicado (`AIVAD_ENV=production`).
2. **Produção Dedicada (`AIVAD_ENV=production`)**:
   - Definir obrigatoriamente `AIVAD_ENV=production`, `AIVAD_SESSION_SECRET` (mínimo 32 caracteres aleatórios) e `DATABASE_URL` (PostgreSQL 16+ com Row-Level Security / `strict_tenant`).
3. **Android / iOS Nativo no Windsurf**:
   - Implementar os módulos Kotlin/Swift definidos em `src/adapters/nativeBridgeContracts.ts` mantendo intactos os contratos `ProposalInput`, `NormalizedCapturePayload` e `VoiceAnnouncementItem`.
