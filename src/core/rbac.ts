import type { AdminRole, AuthSession, EcosystemMode, UserRole } from '../models/types';

export const ADMIN_ROLES: AdminRole[] = [
  'Superadministrador',
  'Administrador',
  'Comercial',
  'Conteúdo',
  'Suporte',
  'Técnico',
  'Auditor',
];

export function isAdminRole(role?: UserRole | string | null): role is AdminRole {
  return Boolean(role && ADMIN_ROLES.includes(role as AdminRole));
}

export function canAccessMode(session: AuthSession | null | undefined, targetMode: EcosystemMode): boolean {
  if (targetMode === 'portal') return true;
  if (!session || !session.authenticated) return false;
  if (targetMode === 'driver') {
    return session.role === 'Motorista' || session.role === 'Operador' || isAdminRole(session.role);
  }
  if (targetMode === 'admin') {
    return isAdminRole(session.role);
  }
  return false;
}

const ADMIN_TAB_RBAC: Record<string, AdminRole[]> = {
  // Dashboard administrativo
  overview: ['Superadministrador', 'Administrador', 'Comercial', 'Conteúdo', 'Suporte', 'Técnico', 'Auditor'],

  // Motoristas, utilizadores e equipas
  utilizadores: ['Superadministrador', 'Administrador', 'Suporte', 'Auditor'],
  users: ['Superadministrador', 'Administrador', 'Suporte'],

  // Organizações e frotas
  organizacoes: ['Superadministrador', 'Administrador', 'Comercial', 'Suporte'],
  fleets: ['Superadministrador', 'Administrador', 'Comercial', 'Suporte'],

  // Planos, assinaturas e faturação
  planos: ['Superadministrador', 'Administrador', 'Comercial'],
  plans: ['Superadministrador', 'Administrador', 'Comercial'],
  assinaturas: ['Superadministrador', 'Administrador', 'Comercial', 'Auditor'],
  pagamentos: ['Superadministrador', 'Administrador', 'Comercial', 'Auditor'],
  payments: ['Superadministrador', 'Administrador', 'Comercial', 'Auditor'],
  funcionalidades: ['Superadministrador', 'Administrador', 'Comercial', 'Técnico'],
  campaigns: ['Superadministrador', 'Administrador', 'Comercial'],

  // Veículos, Plataformas, Mercados & Legislação
  'veiculos-eleg': ['Superadministrador', 'Administrador', 'Técnico', 'Auditor'],
  vehicles: ['Superadministrador', 'Administrador', 'Técnico'],
  plataformas: ['Superadministrador', 'Administrador', 'Técnico', 'Auditor'],
  platforms: ['Superadministrador', 'Administrador', 'Técnico'],
  paises: ['Superadministrador', 'Administrador', 'Comercial', 'Auditor'],
  countries: ['Superadministrador', 'Administrador', 'Comercial'],
  legislacao: ['Superadministrador', 'Administrador', 'Auditor', 'Conteúdo'],
  compliance: ['Superadministrador', 'Administrador', 'Auditor', 'Conteúdo'],

  // CMS, Portal & Suporte
  'editor-paginas': ['Superadministrador', 'Administrador', 'Conteúdo'],
  'gestao-visual': ['Superadministrador', 'Administrador', 'Conteúdo'],
  publicacoes: ['Superadministrador', 'Administrador', 'Conteúdo', 'Comercial'],
  cms: ['Superadministrador', 'Administrador', 'Conteúdo'],
  notificacoes: ['Superadministrador', 'Administrador', 'Comercial', 'Conteúdo', 'Suporte'],
  notifications: ['Superadministrador', 'Administrador', 'Comercial', 'Conteúdo', 'Suporte'],
  comunicacao: ['Superadministrador', 'Administrador', 'Comercial', 'Conteúdo', 'Suporte'],
  tickets: ['Superadministrador', 'Administrador', 'Suporte'],
  suggestions: ['Superadministrador', 'Administrador', 'Comercial', 'Conteúdo'],

  // Configurações, Releases, Relatórios & Segurança
  'config-remotas': ['Superadministrador', 'Administrador', 'Técnico'],
  integracoes: ['Superadministrador', 'Administrador', 'Técnico'],
  versoes: ['Superadministrador', 'Administrador', 'Técnico'],
  versions: ['Superadministrador', 'Administrador', 'Técnico'],
  releases: ['Superadministrador', 'Administrador', 'Técnico'],
  monitorizacao: ['Superadministrador', 'Administrador', 'Técnico', 'Auditor'],
  'relatorios-admin': ['Superadministrador', 'Administrador', 'Comercial', 'Auditor'],
  seguranca: ['Superadministrador', 'Administrador', 'Técnico', 'Auditor'],
  security: ['Superadministrador', 'Administrador', 'Técnico', 'Auditor'],
  auditoria: ['Superadministrador', 'Administrador', 'Auditor'],
  audits: ['Superadministrador', 'Administrador', 'Auditor'],
  events: ['Superadministrador', 'Administrador', 'Técnico', 'Auditor'],
  recuperacao: ['Superadministrador', 'Administrador', 'Técnico', 'Auditor'],
};

export function canAccessAdminTab(role: UserRole | undefined | null, tabId: string): boolean {
  if (!isAdminRole(role)) return false;
  if (role === 'Superadministrador' || role === 'Administrador') return true;
  const allowed = ADMIN_TAB_RBAC[tabId];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function getAccessibleAdminTabs(role: UserRole | undefined | null, tabIds: string[]): string[] {
  return tabIds.filter((id) => canAccessAdminTab(role, id));
}

export function hasDriverSupportAccess(privacyConsentForSupport: boolean): boolean {
  return Boolean(privacyConsentForSupport);
}
