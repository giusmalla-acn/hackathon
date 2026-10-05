import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { FieldDefinition, FieldId } from '../../../../core/contracts';
import type { RegistrationValues } from '../../data/registration.gateway';
import { passwordLength, SUMMARY_TITLE } from '../registration-messages';

let nextId = 0;

/**
 * Riepilogo (spec §2.4). La password non compare mai: solo il numero di caratteri.
 * "Modifica" sono pulsanti nativi perché cambiano passo senza navigare (spec §1.3).
 */
@Component({
  selector: 'app-review-step',
  standalone: true,
  templateUrl: './review-step.component.html',
  styleUrl: './review-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewStepComponent {
  readonly fields = input.required<readonly FieldDefinition[]>();
  readonly values = input.required<RegistrationValues>();
  readonly submitting = input(false);
  /** Invio rifiutato dal gateway: messaggio visibile, collegato al pulsante di conferma. */
  readonly submitError = input<string | null>(null);

  readonly edit = output<FieldId>();
  readonly back = output<void>();
  readonly confirm = output<void>();

  protected readonly errorId = `review-error-${nextId++}`;
  protected readonly title = SUMMARY_TITLE;
  protected readonly passwordLength = passwordLength;
}
