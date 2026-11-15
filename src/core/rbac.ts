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
  overview: ['Superadministrador', 'Administrador', 'Comercial', 'Conteúdo', 'Suporte', 'Técnico', 'Auditor'],
  users: ['Superadministrador', 'Administrador', 'Suporte'],
  fleets: ['Superadministrador', 'Administrador', 'Comercial', 'Suporte'],
  platforms: ['Superadministrador', 'Administrador', 'Técnico'],
  countries: ['Superadministrador', 'Administrador', 'Comercial'],
  plans: ['Superadministrador', 'Administrador', 'Comercial'],
  payments: ['Superadministrador', 'Administrador', 'Comercial', 'Auditor'],
  compliance: ['Superadministrador', 'Administrador', 'Auditor', 'Conteúdo'],
  vehicles: ['Superadministrador', 'Administrador', 'Técnico'],
  campaigns: ['Superadministrador', 'Administrador', 'Comercial'],
  cms: ['Superadministrador', 'Administrador', 'Conteúdo'],
  versions: ['Superadministrador', 'Administrador', 'Técnico'],
  tickets: ['Superadministrador', 'Administrador', 'Suporte'],
  notifications: ['Superadministrador', 'Administrador', 'Comercial', 'Conteúdo', 'Suporte'],
  suggestions: ['Superadministrador', 'Administrador', 'Comercial', 'Conteúdo'],
  events: ['Superadministrador', 'Administrador', 'Técnico', 'Auditor'],
  audits: ['Superadministrador', 'Administrador', 'Auditor'],
  security: ['Superadministrador', 'Administrador', 'Técnico', 'Auditor'],
};

export function canAccessAdminTab(role: UserRole | undefined | null, tabId: string): boolean {
  if (!isAdminRole(role)) return false;
  if (role === 'Superadministrador' || role === 'Administrador') return true;
  const allowed = ADMIN_TAB_RBAC[tabId];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function hasDriverSupportAccess(privacyConsentForSupport: boolean): boolean {
  return Boolean(privacyConsentForSupport);
}
