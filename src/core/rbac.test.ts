import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessAdminTab, canAccessMode, isAdminRole } from './rbac';
import type { AuthSession } from '../models/types';

test('RBAC blocks unauthenticated or Driver sessions from accessing admin mode', () => {
  assert.equal(canAccessMode(null, 'portal'), true);
  assert.equal(canAccessMode(null, 'driver'), false);
  assert.equal(canAccessMode(null, 'admin'), false);

  const driverSession: AuthSession = {
    authenticated: true,
    userId: 'usr-driver-1',
    userName: 'Tiago Ferreira',
    email: 'tiago@demo.pt',
    role: 'Motorista',
    signedInAt: new Date().toISOString(),
  };

  assert.equal(isAdminRole(driverSession.role), false);
  assert.equal(canAccessMode(driverSession, 'driver'), true);
  assert.equal(canAccessMode(driverSession, 'admin'), false);
  assert.equal(canAccessAdminTab(driverSession.role, 'overview'), false);
});

test('RBAC allows authorized Admin roles and scopes sub-roles appropriately', () => {
  const adminSession: AuthSession = {
    authenticated: true,
    userId: 'usr-admin-1',
    userName: 'Helena Rodrigues',
    email: 'helena@aivad.io',
    role: 'Superadministrador',
    signedInAt: new Date().toISOString(),
  };
  assert.equal(isAdminRole(adminSession.role), true);
  assert.equal(canAccessMode(adminSession, 'admin'), true);
  assert.equal(canAccessAdminTab('Superadministrador', 'security'), true);
  assert.equal(canAccessAdminTab('Conteúdo', 'cms'), true);
  assert.equal(canAccessAdminTab('Conteúdo', 'security'), false);
});
