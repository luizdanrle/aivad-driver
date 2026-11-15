import crypto from 'node:crypto';
import type { AuthSession, RuntimeEnvironmentMode } from '../models/types';

export interface ServerSecurityValidationResult {
  runtimeEnvironment: RuntimeEnvironmentMode;
  sessionSecret: string;
  isProduction: boolean;
  usedDevEphemeralFallback: boolean;
  allowDemoSandboxInProduction: boolean;
  warnings: string[];
}

const KNOWN_WEAK_SECRETS = new Set([
  '',
  'changeme',
  'secret',
  'aivad-secret',
  'my_session_secret',
  'default',
  'password',
  '12345678901234567890123456789012',
]);

/**
 * Classifica claramente os 4 ambientes operacionais exigidos na PARTE III:
 * - 'development': execução local / dev server
 * - 'test': execução automatizada de testes
 * - 'preview': ambiente partilhado de Preview (ex.: AI Studio ais-pre-* / ais-dev-* ou AIVAD_ENV=preview)
 * - 'production': produção real dedicada (fail-closed obrigatório para segredos críticos)
 */
export function resolveRuntimeEnvironment(
  env: Record<string, string | undefined>
): RuntimeEnvironmentMode {
  const explicit = (env.AIVAD_ENV ?? '').trim().toLowerCase();
  if (
    explicit === 'development' ||
    explicit === 'test' ||
    explicit === 'preview' ||
    explicit === 'production'
  ) {
    return explicit;
  }

  if (env.NODE_ENV === 'test') {
    return 'test';
  }

  if (env.NODE_ENV === 'production') {
    const appUrl = (env.APP_URL ?? '').trim();
    if (/^https:\/\/ais-(dev|pre)-/i.test(appUrl) || /\.run\.app\/?$/i.test(appUrl)) {
      return 'preview';
    }
    if ((env.K_SERVICE || env.K_REVISION || env.K_CONFIGURATION) && !env.DATABASE_URL) {
      return 'preview';
    }
    return 'production';
  }

  return 'development';
}

/**
 * Valida a configuração criptográfica do servidor Express na inicialização.
 * - Em 'production' dedicado, falha de forma segura (fail-closed) se AIVAD_SESSION_SECRET
 *   estiver ausente, for previsível ou tiver menos de 32 caracteres.
 * - Em 'development', 'test' e 'preview', arranca sem exigir credenciais Uber/Bolt nem
 *   AIVAD_ALLOW_DEMO_SANDBOX, gerando uma chave efémera criptográfica de 256 bits por processo
 *   caso AIVAD_SESSION_SECRET não esteja definido.
 */
export function validateServerSecurityConfig(
  env: Record<string, string | undefined>,
  _cwd?: string
): ServerSecurityValidationResult {
  const runtimeEnvironment = resolveRuntimeEnvironment(env);
  const isProduction = runtimeEnvironment === 'production';
  const rawSecret = (env.AIVAD_SESSION_SECRET ?? '').trim();
  const allowDemoSandboxInProduction = env.AIVAD_ALLOW_DEMO_SANDBOX === 'true';
  const warnings: string[] = [];

  const isWeakOrMissing =
    rawSecret.length < 32 || KNOWN_WEAK_SECRETS.has(rawSecret.toLowerCase());

  if (isProduction && isWeakOrMissing) {
    throw new Error(
      '[AIVAD Security Fail-Closed] Recusa de arranque em produção: AIVAD_SESSION_SECRET é obrigatório, não pode ser previsível e deve ter no mínimo 32 caracteres.'
    );
  }

  if (!isProduction && isWeakOrMissing) {
    warnings.push(
      `AIVAD_SESSION_SECRET ausente em ambiente "${runtimeEnvironment}": gerada chave efémera aleatória de 256 bits por processo (sessões expiram ao reiniciar o servidor).`
    );
    return {
      runtimeEnvironment,
      sessionSecret: crypto.randomBytes(32).toString('hex'),
      isProduction: false,
      usedDevEphemeralFallback: true,
      allowDemoSandboxInProduction,
      warnings,
    };
  }

  return {
    runtimeEnvironment,
    sessionSecret: rawSecret,
    isProduction,
    usedDevEphemeralFallback: false,
    allowDemoSandboxInProduction,
    warnings,
  };
}

export const ADMIN_ROLE_SET = new Set<string>([
  'Superadministrador',
  'Administrador',
  'Comercial',
  'Conteúdo',
  'Suporte',
  'Técnico',
  'Auditor',
]);

export const MANAGEMENT_ROLE_SET = new Set<string>([
  ...ADMIN_ROLE_SET,
  'Operador',
]);

export const CMS_PUBLISH_ROLES = new Set<string>([
  'Superadministrador',
  'Administrador',
  'Conteúdo',
]);

export interface CmsMutationAuthorization {
  allowed: boolean;
  targetScope: 'global_published' | 'demo_sandbox_isolated' | 'denied';
  reason: string;
}

/**
 * Impede escalada de privilégio através do Modo Demonstração:
 * - Sessão real autenticada com perfil administrativo autorizado -> altera o CMS público global do servidor.
 * - Sessão de demonstração (isDemoSession: true) -> isolada em sandbox de demonstração; nunca sobrescreve o CMS público real.
 * - Utilizador não autenticado ou sem perfil administrativo -> negado (401/403).
 */
export function evaluateCmsMutationAuthorization(
  session: Pick<AuthSession, 'authenticated' | 'role' | 'isDemoSession' | 'authMethod'> | null | undefined
): CmsMutationAuthorization {
  if (!session || !session.authenticated) {
    return {
      allowed: false,
      targetScope: 'denied',
      reason: 'Autenticação obrigatória no servidor para editar ou publicar conteúdos CMS.',
    };
  }

  if (!CMS_PUBLISH_ROLES.has(session.role)) {
    return {
      allowed: false,
      targetScope: 'denied',
      reason: `O perfil "${session.role}" não possui permissão para publicar alterações no CMS público.`,
    };
  }

  if (session.isDemoSession || session.authMethod === 'demo_sandbox') {
    return {
      allowed: true,
      targetScope: 'demo_sandbox_isolated',
      reason:
        'Sessão em Modo Demonstração: alterações guardadas apenas no ambiente isolado de demonstração sem modificar o portal público real.',
    };
  }

  return {
    allowed: true,
    targetScope: 'global_published',
    reason: 'Sessão administrativa real verificada: publicação autorizada no CMS público do servidor.',
  };
}

export interface TenantResourceCheckInput {
  ownerUserId?: string;
  targetOrganizationId?: string | null;
  requireManagementConsole?: boolean;
  requireGlobalAdmin?: boolean;
}

export interface TenantAccessDecision {
  allowed: boolean;
  httpStatus: 200 | 401 | 403;
  reason: string;
}

/**
 * Avalia autorização RBAC e isolamento multi-organização / por motorista no servidor (PARTES IV, V e VI):
 * - Bloqueia acesso não autenticado (401).
 * - Separa estritamente AIVAD Driver ('Motorista') de AIVAD Management (403).
 * - Impede que um motorista aceda aos dados de outro motorista (403).
 * - Impede que um Operador de uma organização aceda aos dados de outra organização (403).
 * - Permite motoristas independentes sem frota (organizationId: null) acederem aos seus próprios dados.
 */
export function evaluateTenantAccess(
  session:
    | Pick<AuthSession, 'authenticated' | 'userId' | 'role' | 'organizationId'>
    | null
    | undefined,
  resource: TenantResourceCheckInput
): TenantAccessDecision {
  if (!session || !session.authenticated) {
    return {
      allowed: false,
      httpStatus: 401,
      reason: 'Sessão não autenticada no servidor.',
    };
  }

  const isGlobalAdmin = ADMIN_ROLE_SET.has(session.role);
  const isManagementRole = MANAGEMENT_ROLE_SET.has(session.role);

  if (resource.requireGlobalAdmin && !isGlobalAdmin) {
    return {
      allowed: false,
      httpStatus: 403,
      reason: `Acesso negado (403 RBAC): o perfil "${session.role}" não tem permissões de administração global AIVAD Management.`,
    };
  }

  if (resource.requireManagementConsole && !isManagementRole) {
    return {
      allowed: false,
      httpStatus: 403,
      reason: `Separação AIVAD Driver / AIVAD Management: o perfil "${session.role}" não pode aceder a recursos de gestão.`,
    };
  }

  // Isolamento por organização
  if (resource.targetOrganizationId !== undefined && resource.targetOrganizationId !== null) {
    if (isGlobalAdmin) {
      return { allowed: true, httpStatus: 200, reason: 'Acesso global administrativo autorizado.' };
    }
    if (!session.organizationId || session.organizationId !== resource.targetOrganizationId) {
      return {
        allowed: false,
        httpStatus: 403,
        reason: `Violação de isolamento multi-organização bloqueada: sessão pertence a "${session.organizationId ?? 'Motorista Independente'}" e tentou aceder a "${resource.targetOrganizationId}".`,
      };
    }
  }

  // Isolamento individual por motorista / utilizador
  if (resource.ownerUserId !== undefined) {
    if (session.userId === resource.ownerUserId) {
      return { allowed: true, httpStatus: 200, reason: 'Proprietário do recurso validado.' };
    }
    if (isGlobalAdmin) {
      return { allowed: true, httpStatus: 200, reason: 'Auditoria administrativa autorizada.' };
    }
    if (
      session.role === 'Operador' &&
      session.organizationId &&
      resource.targetOrganizationId &&
      session.organizationId === resource.targetOrganizationId
    ) {
      return {
        allowed: true,
        httpStatus: 200,
        reason: 'Operador autorizado dentro da mesma organização.',
      };
    }
    return {
      allowed: false,
      httpStatus: 403,
      reason: `Acesso cruzado entre utilizadores bloqueado: "${session.userId}" não tem permissão sobre "${resource.ownerUserId}".`,
    };
  }

  return { allowed: true, httpStatus: 200, reason: 'Acesso autorizado.' };
}

export function sanitizeEmailInput(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().slice(0, 180);
}

export function validateRegistrationPayload(body: Record<string, unknown>): {
  valid: boolean;
  name: string;
  email: string;
  password: string;
  role: 'Motorista' | 'Operador';
  organizationId: string | null;
  error?: string;
} {
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const email = sanitizeEmailInput(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  // Nunca permite auto-registo com perfil administrativo
  const role: 'Motorista' | 'Operador' = body.role === 'Operador' ? 'Operador' : 'Motorista';
  const organizationId =
    typeof body.organizationId === 'string' && body.organizationId.trim().length > 0
      ? body.organizationId.trim().slice(0, 64)
      : null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (name.length < 2) {
    return {
      valid: false,
      name,
      email,
      password: '',
      role,
      organizationId,
      error: 'Nome inválido (mínimo 2 caracteres).',
    };
  }
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      name,
      email,
      password: '',
      role,
      organizationId,
      error: 'Formato de email inválido.',
    };
  }
  if (password.length < 8) {
    return {
      valid: false,
      name,
      email,
      password: '',
      role,
      organizationId,
      error: 'A palavra-passe deve ter no mínimo 8 caracteres.',
    };
  }

  return { valid: true, name, email, password, role, organizationId };
}
