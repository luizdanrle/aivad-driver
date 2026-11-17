import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyStepConfirmationToProgress,
  confirmAssistantStepByUser,
  createInitialAssistantProgress,
  evaluateAssistantStepVerification,
  getAssistantsForScope,
  INTERACTIVE_ASSISTANTS,
  pauseAssistantProgress,
  resumeAssistantProgress,
  skipOptionalAssistantStep,
  type AssistantEvaluationContext,
} from './interactiveAssistants';
import { INITIAL_BOLT_CONNECTOR, INITIAL_UBER_CONNECTOR } from './connectors';
import { SEED_AUTOPILOT, SEED_FLOATING_DOCK_CONFIG, SEED_OVERLAY_CONFIG } from '../data/seedData';
import { DEFAULT_VOICE_COPILOT_CONFIG } from './voiceCopilot';

function makeBaseCtx(overrides: Partial<AssistantEvaluationContext> = {}): AssistantEvaluationContext {
  return {
    overlayConfig: SEED_OVERLAY_CONFIG,
    floatingDockConfig: SEED_FLOATING_DOCK_CONFIG,
    floatingPreviewOpened: false,
    floatingConfigSavedCount: 0,
    voiceConfig: {
      enabled: DEFAULT_VOICE_COPILOT_CONFIG.enabled,
      deliveryMode: DEFAULT_VOICE_COPILOT_CONFIG.outputChannel,
      language: DEFAULT_VOICE_COPILOT_CONFIG.language,
      speechRate: DEFAULT_VOICE_COPILOT_CONFIG.rate,
      categories: DEFAULT_VOICE_COPILOT_CONFIG.categories,
    },
    voiceSupported: true,
    voiceTestCount: 0,
    autoPilot: SEED_AUTOPILOT,
    autoPilotSavedCount: 0,
    connectors: {
      uber: INITIAL_UBER_CONNECTOR,
      bolt: INITIAL_BOLT_CONNECTOR,
    },
    activeDriverNav: 'cartoes-flutuantes',
    activeAdminNav: 'overview',
    activePortalPage: 'inicio',
    selectedMarketCode: 'PT',
    tachographActiveSession: false,
    proposalsCount: 0,
    vehiclesCount: 1,
    activeVehicleId: 'veh-1',
    zoneObservationsCount: 0,
    countriesCount: 8,
    adminRevalidationCount: 0,
    portalSimulatorTested: false,
    portalComparisonViewed: false,
    ...overrides,
  };
}

test('Assistente do Cartão Flutuante valida cor/pré-visualização/confirmação/gravação e reprova se não guardado', () => {
  const fcDef = INTERACTIVE_ASSISTANTS.find((a) => a.id === 'floating-card')!;
  let prog = createInitialAssistantProgress('floating-card');

  const previewStep = fcDef.steps.find((s) => s.id === 'fc-step-preview')!;
  const beforePreview = evaluateAssistantStepVerification(previewStep, prog, makeBaseCtx({ floatingPreviewOpened: false }));
  assert.equal(beforePreview.status, 'Em andamento');

  const afterPreview = evaluateAssistantStepVerification(previewStep, prog, makeBaseCtx({ floatingPreviewOpened: true }));
  assert.equal(afterPreview.status, 'Concluído');

  const confirmStep = fcDef.steps.find((s) => s.id === 'fc-step-visual-confirm')!;
  const beforeConfirm = evaluateAssistantStepVerification(confirmStep, prog, makeBaseCtx());
  assert.equal(beforeConfirm.status, 'Em andamento');
  assert.equal(beforeConfirm.requiresUserConfirmation, true);

  prog = confirmAssistantStepByUser(prog, confirmStep.id);
  const afterConfirm = evaluateAssistantStepVerification(confirmStep, prog, makeBaseCtx());
  assert.equal(afterConfirm.status, 'Concluído');

  const saveStep = fcDef.steps.find((s) => s.id === 'fc-step-save')!;
  const unsavedOutcome = evaluateAssistantStepVerification(saveStep, prog, makeBaseCtx({ floatingConfigSavedCount: 0 }));
  assert.equal(unsavedOutcome.status, 'Falhou');

  const savedOutcome = evaluateAssistantStepVerification(
    saveStep,
    prog,
    makeBaseCtx({
      floatingConfigSavedCount: 1,
      overlayConfig: { ...SEED_OVERLAY_CONFIG, bgColor: '#E11D48', borderColor: '#B91C1C', useCustomColors: true },
    })
  );
  assert.equal(savedOutcome.status, 'Concluído');
  assert.ok(savedOutcome.detail.includes('#E11D48'));
});

test('Conectores e AutoPilot NUNCA marcam Concluído quando em "Não configurado" e AIVAD Voice reporta "Não suportado"', () => {
  const connDef = INTERACTIVE_ASSISTANTS.find((a) => a.id === 'connectors')!;
  const connProg = createInitialAssistantProgress('connectors');
  const oauthStep = connDef.steps.find((s) => s.id === 'conn-step-server-oauth')!;
  const oauthOutcome = evaluateAssistantStepVerification(oauthStep, connProg, makeBaseCtx());
  assert.equal(oauthOutcome.status, 'Pendente de integração');

  const apDef = INTERACTIVE_ASSISTANTS.find((a) => a.id === 'autopilot')!;
  const apProg = createInitialAssistantProgress('autopilot');
  const apAuthStep = apDef.steps.find((s) => s.id === 'ap-step-api')!;
  const apOutcome = evaluateAssistantStepVerification(
    apAuthStep,
    apProg,
    makeBaseCtx({ autoPilot: { ...SEED_AUTOPILOT, mode: 'Automático', officialAutomationAuthorized: false } })
  );
  assert.equal(apOutcome.status, 'Pendente de integração');

  const voiceDef = INTERACTIVE_ASSISTANTS.find((a) => a.id === 'voice')!;
  const voiceProg = createInitialAssistantProgress('voice');
  const voiceDevStep = voiceDef.steps.find((s) => s.id === 'voice-step-support')!;
  const voiceUnsupported = evaluateAssistantStepVerification(
    voiceDevStep,
    voiceProg,
    makeBaseCtx({ voiceSupported: false })
  );
  assert.equal(voiceUnsupported.status, 'Não suportado neste dispositivo');
});

test('Assistentes suportam pausa/retoma, salto opcional e filtragem RBAC real em Management', () => {
  const fcDef = INTERACTIVE_ASSISTANTS.find((a) => a.id === 'floating-card')!;
  let prog = createInitialAssistantProgress('floating-card');

  prog = pauseAssistantProgress(prog);
  assert.equal(prog.status, 'Pausado');
  prog = resumeAssistantProgress(prog);
  assert.equal(prog.status, 'Em curso');

  const optionalDock = fcDef.steps.find((s) => s.id === 'fc-step-dock')!;
  const prevIdx = prog.currentStepIndex;
  prog = skipOptionalAssistantStep(prog, optionalDock);
  assert.ok(prog.skippedStepIds.includes(optionalDock.id));
  assert.equal(prog.currentStepIndex, prevIdx + 1);

  const superAdminGuides = getAssistantsForScope('admin', 'Superadministrador');
  const contentGuides = getAssistantsForScope('admin', 'Conteúdo');
  assert.ok(superAdminGuides.some((g) => g.id === 'admin-platforms'));
  assert.equal(contentGuides.some((g) => g.id === 'admin-platforms'), false);
  assert.equal(contentGuides.some((g) => g.id === 'admin-cms'), true);

  const portalGuides = getAssistantsForScope('portal');
  assert.ok(portalGuides.some((g) => g.id === 'portal-tour'));

  const step0 = fcDef.steps[0];
  const out0 = evaluateAssistantStepVerification(step0, prog, makeBaseCtx());
  const advanced = applyStepConfirmationToProgress(prog, step0, out0);
  assert.equal(advanced.stepStatuses[step0.id], 'Concluído');
});
