import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRIVER_MODULE_GUIDES,
  DRIVER_ONBOARDING_STEPS,
  INITIAL_ONBOARDING_STATE,
  getDriverModuleGuide,
  goToOnboardingStep,
  markOnboardingStepCompleted,
  setOnboardingDismissed,
} from './moduleGuides';

const MANDATORY_DRIVER_MODULES = [
  'dashboard',
  'ai-core',
  'corridas',
  'estrategia',
  'agenda-turnos',
  'tacografo',
  'financeiro',
  'relatorios',
  'veiculos',
  'locais-rotas',
  'voz-copiloto',
  'cartoes-flutuantes',
  'conectores',
  'apps-integracoes',
  'perfil',
  'diagnostico',
  'suporte',
];

test('all 17 Driver modules have complete 7-question guides and honest status', () => {
  for (const modId of MANDATORY_DRIVER_MODULES) {
    const guide = DRIVER_MODULE_GUIDES[modId];
    assert.ok(guide, `Missing guide for ${modId}`);
    assert.ok(guide.whatIsIt.length > 20);
    assert.ok(guide.whatFor.length > 20);
    assert.ok(guide.whenToUse.length > 15);
    assert.ok(guide.howItWorks.length > 20);
    assert.ok(guide.whatToConfigure.length > 15);
    assert.ok(guide.integrationDependency.length > 15);
    assert.ok(guide.operationalStatus.length > 3);
    assert.ok(guide.operationalDetail.length > 15);
    assert.ok(guide.quickSteps.length >= 3);
  }
});

test('sub-tab aliases resolve to canonical Driver module guides', () => {
  assert.equal(getDriverModuleGuide('calculadora').id, 'corridas');
  assert.equal(getDriverModuleGuide('comparador-veiculos').id, 'veiculos');
  assert.equal(getDriverModuleGuide('legislacao').id, 'suporte');
});

test('progressive onboarding supports ignore, resume, step jump, and completion', () => {
  let state = INITIAL_ONBOARDING_STATE;
  assert.equal(state.dismissed, false);
  assert.equal(state.currentStepIndex, 0);

  // Mark step 1 completed -> advances automatically to step 2 (index 1)
  state = markOnboardingStepCompleted(state, DRIVER_ONBOARDING_STEPS[0].id);
  assert.equal(state.completedStepIds.length, 1);
  assert.equal(state.currentStepIndex, 1);

  // Dismiss ("Ignorar") preserves progress ("Continuar de onde parou")
  state = setOnboardingDismissed(state, true);
  assert.equal(state.dismissed, true);
  assert.equal(state.currentStepIndex, 1);

  // Reopen ("Consultar novamente") resumes where user stopped
  state = setOnboardingDismissed(state, false);
  assert.equal(state.dismissed, false);
  assert.equal(state.currentStepIndex, 1);

  // Jump to step
  state = goToOnboardingStep(state, 4);
  assert.equal(state.currentStepIndex, 4);
});
