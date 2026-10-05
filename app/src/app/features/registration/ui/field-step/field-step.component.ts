import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  linkedSignal,
  output,
  untracked,
  viewChild,
} from '@angular/core';

import type { FieldDefinition, ValidationErrorCode } from '../../../../core/contracts';
import { errorCountText, errorMessages, stepTitle } from '../registration-messages';

let nextId = 0;

/**
 * Un passo del percorso: titolo, campo, istruzione, regole ed errore.
 * Non valida: mostra solo gli `errors` ricevuti, calcolati dallo store alla pressione di Avanti.
 * Il pannello di assistenza si proietta con `<ng-content>`.
 */
@Component({
  selector: 'app-field-step',
  standalone: true,
  templateUrl: './field-step.component.html',
  styleUrl: './field-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldStepComponent {
  readonly field = input.required<FieldDefinition>();
  readonly value = input.required<string>();
  readonly errors = input<readonly ValidationErrorCode[]>([]);
  readonly step = input.required<number>();
  readonly totalSteps = input.required<number>();

  readonly valueChange = output<string>();

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('control');

  private readonly id = `field-step-${nextId++}`;
  protected readonly ids = {
    title: `${this.id}-title`,
    input: `${this.id}-input`,
    hint: `${this.id}-hint`,
    rules: `${this.id}-rules`,
    error: `${this.id}-error`,
  } as const;

  /** Torna nascosta a ogni cambio di campo. */
  protected readonly passwordVisible = linkedSignal<FieldDefinition, boolean>({
    source: this.field,
    computation: () => false,
  });

  protected readonly title = computed(() => stepTitle(this.step(), this.totalSteps(), this.field()));
  protected readonly isPassword = computed(() => this.field().inputType === 'password');
  protected readonly inputType = computed(() =>
    this.isPassword() && this.passwordVisible() ? 'text' : this.field().inputType,
  );
  /**
   * Valore al momento della validazione: gli errori cambiano solo con Avanti, quindi il
   * messaggio (es. "hai scritto 3 caratteri") non segue la digitazione (spec §1.2).
   */
  private readonly validatedValue = linkedSignal<readonly ValidationErrorCode[], string>({
    source: this.errors,
    computation: () => untracked(this.value),
  });
  protected readonly errorList = computed(() =>
    errorMessages(this.field(), this.errors(), this.validatedValue()),
  );
  protected readonly errorSummary = computed(
    () => `${errorCountText(this.errorList().length)} nel campo ${this.field().label}:`,
  );
  protected readonly invalid = computed(() => this.errorList().length > 0);
  protected readonly describedBy = computed(() =>
    [this.invalid() ? this.ids.error : null, this.ids.hint, this.ids.rules].filter(Boolean).join(' '),
  );
  protected readonly toggleLabel = computed(() =>
    this.passwordVisible() ? 'Nascondi password' : 'Mostra password',
  );

  /** Usato dal wizard dopo un errore (spec §1.7): l'annuncio assertive lo fa il wizard, dentro il gesto. */
  focusInput(): void {
    this.inputRef().nativeElement.focus();
  }

  protected onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }
}
