import { computed, inject, Injectable, signal } from '@angular/core';
import type { FieldDefinition, FieldId, ValidationErrorCode } from '../../../core/contracts';
import { getFieldDefinition } from '../data/registration-fields';
import { RegistrationGateway, RegistrationValues } from '../data/registration.gateway';
import { FIELD_VALIDATORS } from '../domain/validators';
import { canAdvance, FIELD_STEPS, isFieldStep, nextStep, prevStep, WizardStep } from '../domain/wizard.machine';

export type FieldErrors = Readonly<Record<FieldId, readonly ValidationErrorCode[]>>;

const EMPTY_VALUES: RegistrationValues = { name: '', email: '', password: '' };
const NO_ERRORS: FieldErrors = { name: [], email: [], password: [] };

/**
 * Stato del percorso guidato. La validazione avviene solo su `next()` / `submit()`,
 * mai durante la digitazione.
 *
 * Privacy: i valori restano in memoria; non vengono persistiti e la password viene
 * azzerata dopo l'invio.
 */
@Injectable({ providedIn: 'root' })
export class RegistrationStore {
  private readonly gateway = inject(RegistrationGateway);

  private readonly _values = signal<RegistrationValues>(EMPTY_VALUES);
  private readonly _errors = signal<FieldErrors>(NO_ERRORS);
  private readonly _currentStep = signal<WizardStep>('welcome');
  private readonly _submitted = signal(false);
  private readonly _submitting = signal(false);
  /** True se l'ultimo `submit()` è fallito nel gateway (rete, server). */
  private readonly _submitFailed = signal(false);
  /** True dopo "Modifica" dal riepilogo: il prossimo `next()` valido torna al riepilogo. */
  private readonly _editing = signal(false);

  readonly values = this._values.asReadonly();
  readonly errors = this._errors.asReadonly();
  readonly currentStep = this._currentStep.asReadonly();
  readonly submitted = this._submitted.asReadonly();
  readonly submitting = this._submitting.asReadonly();
  readonly submitFailed = this._submitFailed.asReadonly();
  readonly editing = this._editing.asReadonly();

  readonly currentField = computed<FieldDefinition | null>(() => {
    const step = this._currentStep();
    return isFieldStep(step) ? getFieldDefinition(step) : null;
  });

  readonly currentErrors = computed<readonly ValidationErrorCode[]>(() => {
    const step = this._currentStep();
    return isFieldStep(step) ? this._errors()[step] : [];
  });

  setValue(field: FieldId, value: string): void {
    this._values.update((values) => ({ ...values, [field]: value }));
  }

  /** Valida il campo del passo corrente e avanza solo se è valido. Dal riepilogo si avanza con `submit()`. */
  next(): boolean {
    const step = this._currentStep();
    if (step === 'summary' || step === 'done') {
      return false;
    }

    const errors = isFieldStep(step) ? this.validate(step) : [];
    if (!canAdvance(step, errors)) {
      return false;
    }

    if (this._editing() && isFieldStep(step)) {
      this._editing.set(false);
      this.goTo('summary');
    } else {
      this.goTo(nextStep(step));
    }
    return true;
  }

  /** Torna al passo precedente conservando i valori. Esce dalla modalità Modifica. */
  prev(): boolean {
    const step = this._currentStep();
    const previous = prevStep(step);
    this._editing.set(false);
    this.goTo(previous);
    return previous !== step;
  }

  /** "Modifica {campo}" dal riepilogo. */
  edit(field: FieldId): void {
    if (this._currentStep() !== 'summary') {
      return;
    }
    this._editing.set(true);
    this._submitFailed.set(false);
    this._currentStep.set(field);
  }

  /** Valida tutti i campi e invia. Se un campo non è valido, porta a quel passo in modalità Modifica. */
  async submit(): Promise<boolean> {
    if (this._currentStep() !== 'summary' || this._submitting()) {
      return false;
    }

    const allErrors = FIELD_STEPS.flatMap((field) => this.validate(field));
    if (!canAdvance('summary', allErrors)) {
      const firstInvalid = FIELD_STEPS.find((field) => this._errors()[field].length > 0)!;
      this.edit(firstInvalid);
      return false;
    }

    this._submitting.set(true);
    this._submitFailed.set(false);
    try {
      await this.gateway.register(this._values());
      this._values.update((values) => ({ ...values, password: '' }));
      this._submitted.set(true);
      this._currentStep.set(nextStep('summary'));
      return true;
    } catch {
      this._submitFailed.set(true);
      return false;
    } finally {
      this._submitting.set(false);
    }
  }

  reset(): void {
    this._values.set(EMPTY_VALUES);
    this._errors.set(NO_ERRORS);
    this._currentStep.set('welcome');
    this._submitted.set(false);
    this._submitting.set(false);
    this._submitFailed.set(false);
    this._editing.set(false);
  }

  /**
   * Navigazione con Avanti/Indietro: gli errori del campo di arrivo sono di una visita
   * precedente e non vanno più mostrati né annunciati. `edit()` invece li conserva, perché
   * dopo un invio non valido porta proprio al campo da correggere.
   */
  private goTo(step: WizardStep): void {
    if (isFieldStep(step)) {
      this._errors.update((current) => ({ ...current, [step]: [] }));
    }
    this._submitFailed.set(false);
    this._currentStep.set(step);
  }

  private validate(field: FieldId): readonly ValidationErrorCode[] {
    const { errors } = FIELD_VALIDATORS[field](this._values()[field]);
    this._errors.update((current) => ({ ...current, [field]: errors }));
    return errors;
  }
}
