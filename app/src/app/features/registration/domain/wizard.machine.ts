import type { FieldId, ValidationErrorCode } from '../../../core/contracts';

/** Percorso: Welcome → Nome → Email → Password → Riepilogo → Conferma finale. */
export type WizardStep = 'welcome' | FieldId | 'summary' | 'done';

export const WIZARD_STEPS: readonly WizardStep[] = ['welcome', 'name', 'email', 'password', 'summary', 'done'];

export const FIELD_STEPS: readonly FieldId[] = ['name', 'email', 'password'];

export function isFieldStep(step: WizardStep): step is FieldId {
  return (FIELD_STEPS as readonly WizardStep[]).includes(step);
}

/** Numero del passo per "Passo {n} di {totale}" (1-based); null fuori dai passi con campo. */
export function fieldStepNumber(step: WizardStep): number | null {
  return isFieldStep(step) ? FIELD_STEPS.indexOf(step) + 1 : null;
}

/** 'done' è terminale. */
export function nextStep(step: WizardStep): WizardStep {
  const i = WIZARD_STEPS.indexOf(step);
  return step === 'done' ? step : WIZARD_STEPS[i + 1];
}

/** 'welcome' è il primo passo e 'done' è terminale: in entrambi i casi si resta fermi. */
export function prevStep(step: WizardStep): WizardStep {
  const i = WIZARD_STEPS.indexOf(step);
  return step === 'welcome' || step === 'done' ? step : WIZARD_STEPS[i - 1];
}

/** `errors`: errori del campo del passo corrente o, nel riepilogo, di tutti i campi. */
export function canAdvance(step: WizardStep, errors: readonly ValidationErrorCode[]): boolean {
  return step !== 'done' && errors.length === 0;
}
